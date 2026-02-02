/**
 * LIX Gateway API - Intent Broadcast Endpoint
 * L.I.X. v0.2 FULLY COMPLIANT (P0+P1)
 * 
 * POST /api/lix/broadcast
 * 
 * P0-1: Server-side PoI verification (signature + hash)
 * P0-2: Redis nonce cache (replay protection)
 * P1-1: trace_id generation and propagation
 * P1-2: Structured event emission
 * P1-3: Prometheus metrics recording
 */

import { lixMarketService } from '../services/marketService';
import { verifyIntentProof, extractIntentInput } from '../services/verifyIntentProof';
import { validateAndRecordNonce } from '../services/redisNonceCache';
import type { IntentCategory } from '../services/lixTypes';

// P1 Observability imports
import { createTrace, createSpan, endSpan, endSpanWithError, setCurrentTrace, clearCurrentTrace, addTraceToHeaders } from '../services/traceContext';
import { emitIntentCreated, emitIntentBroadcast, emitSecurityEvent, eventBus } from '../services/eventBus';
import { recordIntentToOfferLatency, recordIntent, recordSecurityEvent } from '../services/metricsCollector';


export default async function handler(request: Request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders,
        });
    }

    // ================================================================
    // P1-1: Generate trace_id at gateway edge
    // ================================================================
    const trace = createTrace('lix.broadcast', { endpoint: '/api/lix/broadcast' });
    setCurrentTrace(trace);

    try {
        const body = await request.json();
        const { category, item, budget, specs, intent_proof, user_pseudonym, canonical_sku, location_code } = body;

        // ================================================================
        // P0-1: Validate intent_proof EXISTS
        // ================================================================
        if (!intent_proof) {
            // P1-2: Emit security event
            emitSecurityEvent('security.proof_expired', trace.trace_id, {
                category,
                error: 'missing_proof'
            });
            // P1-3: Record metric
            recordSecurityEvent('missing_proof');

            endSpanWithError(trace.trace_id, trace.span_id, 'Missing intent_proof');
            clearCurrentTrace();

            return new Response(JSON.stringify({
                error: 'Missing intent_proof - all intents must be cryptographically signed',
                code: 'PROOF_REQUIRED',
                trace_id: trace.trace_id,  // P1-1: Include trace_id in response
                docs: 'https://lix.lumi.ai/docs/proof-of-intent'
            }), { status: 400, headers: corsHeaders });
        }

        // ================================================================
        // P0-1: Extract intent input for hash verification
        // ================================================================
        const intentInput = extractIntentInput({
            category,
            canonical_sku: canonical_sku || item,
            budget_max: budget,
            location_code,
            intent_proof
        });

        // ================================================================
        // P0-1: Verify Intent Proof (Signature + Hash)
        // ================================================================
        const verifySpan = createSpan(trace.trace_id, 'verify_proof', trace.span_id);
        const pseudonym = user_pseudonym || intent_proof.device_fingerprint || 'anonymous';
        const verifyResult = await verifyIntentProof(intent_proof, intentInput, pseudonym);

        if (!verifyResult.valid) {
            endSpanWithError(trace.trace_id, verifySpan.span_id, verifyResult.error || 'Verification failed');

            // P1-2: Emit security event
            if (verifyResult.code === 'INVALID_SIGNATURE') {
                emitSecurityEvent('security.invalid_signature', trace.trace_id, {
                    user_pseudonym: pseudonym
                });
                recordSecurityEvent('invalid_signature');
            } else if (verifyResult.code === 'EXPIRED') {
                emitSecurityEvent('security.proof_expired', trace.trace_id, {
                    age_seconds: verifyResult.details?.age_seconds,
                    validity_window_sec: verifyResult.details?.validity_window_sec
                });
                recordSecurityEvent('proof_expired');
            }

            // Map verification error codes to HTTP status codes
            const statusMap: Record<string, number> = {
                'MISSING_PROOF': 400,
                'INVALID_PROOF': 400,
                'EXPIRED': 400,
                'MISSING_PUBLIC_KEY': 400,
                'INVALID_SIGNATURE': 401,
                'HASH_MISMATCH': 401
            };

            endSpanWithError(trace.trace_id, trace.span_id, verifyResult.error || 'Verification failed');
            clearCurrentTrace();

            return new Response(JSON.stringify({
                error: verifyResult.error,
                code: verifyResult.code,
                trace_id: trace.trace_id,  // P1-1
                details: verifyResult.details
            }), {
                status: statusMap[verifyResult.code || ''] || 400,
                headers: corsHeaders
            });
        }
        endSpan(trace.trace_id, verifySpan.span_id);

        // ================================================================
        // P0-2: Validate nonce via Redis (replay protection)
        // ================================================================
        const nonceSpan = createSpan(trace.trace_id, 'validate_nonce', trace.span_id);
        const validityWindowSec = intent_proof.validity_window_sec || 1800;
        const nonceResult = await validateAndRecordNonce(
            pseudonym,
            intent_proof.nonce,
            validityWindowSec
        );

        if (!nonceResult.valid) {
            endSpanWithError(trace.trace_id, nonceSpan.span_id, 'Nonce replay');

            // P1-2: Emit security event
            emitSecurityEvent('security.nonce_replay', trace.trace_id, {
                nonce_prefix: intent_proof.nonce.substring(0, 8),
                user_pseudonym: pseudonym
            });
            // P1-3: Record metric
            recordSecurityEvent('nonce_replay');

            endSpanWithError(trace.trace_id, trace.span_id, 'Nonce replay');
            clearCurrentTrace();

            return new Response(JSON.stringify({
                error: nonceResult.error,
                code: nonceResult.code || 'NONCE_REPLAY',
                trace_id: trace.trace_id  // P1-1
            }), { status: 409, headers: corsHeaders });
        }
        endSpan(trace.trace_id, nonceSpan.span_id);

        // ================================================================
        // Standard validation
        // ================================================================
        if (!category || !item) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Missing required fields');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                error: 'Missing required fields: category and item',
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        // Validate category
        const validCategories = ['purchase', 'job', 'collaboration'];
        if (!validCategories.includes(category)) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Invalid category');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                error: `Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`,
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        // ================================================================
        // Broadcast to market
        // ================================================================
        const broadcastSpan = createSpan(trace.trace_id, 'market_broadcast', trace.span_id);
        const startTime = Date.now();

        const response = await lixMarketService.broadcast({
            category: category as IntentCategory,
            payload: item,
            budget: budget ? Number(budget) : undefined,
            specs,
            trace_id: trace.trace_id  // P1-1: Propagate trace_id to market service
        });

        const latencyMs = Date.now() - startTime;
        endSpan(trace.trace_id, broadcastSpan.span_id, { offers_count: response.ranked_offers.length });

        // ================================================================
        // P1-2: Emit intent.created and intent.broadcast events
        // ================================================================
        emitIntentCreated(trace.trace_id, response.intent_id, category, pseudonym);
        emitIntentBroadcast(
            trace.trace_id,
            response.intent_id,
            category,
            response.ranked_offers.length,
            latencyMs
        );

        // ================================================================
        // P1-3: Record metrics
        // ================================================================
        recordIntentToOfferLatency(latencyMs / 1000, category);  // Convert to seconds
        recordIntent(category, 'success');

        // End root span
        endSpan(trace.trace_id, trace.span_id, {
            intent_id: response.intent_id,
            offers_count: response.ranked_offers.length
        });
        clearCurrentTrace();

        // ================================================================
        // Return response with trace_id
        // ================================================================
        const responseHeaders = new Headers(corsHeaders);
        addTraceToHeaders(responseHeaders, trace);

        return new Response(JSON.stringify({
            success: true,
            intent_id: response.intent_id,
            trace_id: trace.trace_id,  // P1-1: Include trace_id in response
            status: response.status,
            proof_verified: true,  // P0-1 compliance marker
            nonce_recorded: true,   // P0-2 compliance marker
            ranked_offers: response.ranked_offers.map(ro => ({
                offer_id: ro.offer.offer_id,
                provider: {
                    id: ro.offer.provider.id,
                    name: ro.offer.provider.name,
                    type: ro.offer.provider.type,
                    reputation: ro.offer.provider.reputation_score,
                    verified: ro.offer.provider.verified
                },
                price: ro.offer.price.amount,
                currency: ro.offer.price.currency,
                delivery_eta: ro.offer.fulfillment?.delivery_eta,
                inventory: ro.offer.inventory_signal,
                rank: ro.rank,
                score: Math.round(ro.total_score * 100) / 100,
                score_breakdown: ro.score_breakdown,
                explanation: ro.explanation,
                eligible: ro.eligible,
                warnings: ro.score_breakdown.validation_penalty > 0 ?
                    '⚠️ 存在轻微警告' : undefined
            })),
            total_offers: response.total_offers_received,
            broadcast_reach: response.broadcast_reach,
            latency_ms: latencyMs
        }), { status: 200, headers: Object.fromEntries(responseHeaders.entries()) });

    } catch (error) {
        // P1-3: Record failure metric
        recordIntent('unknown', 'failed');

        endSpanWithError(trace.trace_id, trace.span_id, error instanceof Error ? error.message : 'Unknown error');
        clearCurrentTrace();

        console.error('[LIX Gateway] Broadcast error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            trace_id: trace.trace_id,  // P1-1
            message: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: corsHeaders });
    }
}

/**
 * LIX Gateway API - Accept Offer Endpoint
 * L.I.X. v0.2 FULLY COMPLIANT (P0+P1)
 * 
 * POST /api/lix/offer/accept
 * 
 * P1-1: trace_id propagation
 * P1-2: Structured event emission
 * P1-3: Prometheus metrics recording
 */

import { lixStore } from '../services/lixStore';
import { generateId } from '../services/lixTypes';

// P1 Observability imports
import { createTrace, endSpan, endSpanWithError, setCurrentTrace, clearCurrentTrace, addTraceToHeaders } from '../services/traceContext';
import { eventBus } from '../services/eventBus';
import { incCounter } from '../services/metricsCollector';


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
    const trace = createTrace('lix.accept', { endpoint: '/api/lix/offer/accept' });
    setCurrentTrace(trace);

    try {
        const body = await request.json();
        const { intent_id, offer_id } = body;

        if (!intent_id || !offer_id) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Missing required fields');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                error: 'Missing required fields: intent_id and offer_id',
                trace_id: trace.trace_id
            }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        console.log(`[LIX Gateway] Accepting offer: ${offer_id} for intent: ${intent_id} (trace=${trace.trace_id})`);

        const acceptToken = await lixStore.acceptOffer(intent_id, offer_id);

        // ================================================================
        // P1-2: Emit offer.accepted event
        // ================================================================
        eventBus.emit({
            event_type: 'offer.accepted',
            trace_id: trace.trace_id,
            intent_id,
            offer_id,
            token_id: acceptToken.token_id,
            timestamp: Date.now(),
            offer_amount: acceptToken.offer_amount,
            currency: acceptToken.currency
        });

        // ================================================================
        // P1-3: Record metrics
        // ================================================================
        incCounter('lix_offers_accepted_total', { provider_id: acceptToken.provider_id || 'unknown' });

        // End span
        endSpan(trace.trace_id, trace.span_id, {
            token_id: acceptToken.token_id,
            offer_amount: acceptToken.offer_amount
        });
        clearCurrentTrace();

        // Add trace headers to response
        const responseHeaders = new Headers(corsHeaders);
        addTraceToHeaders(responseHeaders, trace);

        return new Response(JSON.stringify({
            success: true,
            trace_id: trace.trace_id,  // P1-1
            accept_token: acceptToken
        }), {
            status: 200,
            headers: Object.fromEntries(responseHeaders.entries()),
        });

    } catch (error) {
        // P1-3: Record failure metric
        incCounter('lix_offers_accepted_total', { status: 'failed' });

        endSpanWithError(trace.trace_id, trace.span_id, error instanceof Error ? error.message : 'Unknown error');
        clearCurrentTrace();

        console.error('[LIX Gateway] Accept error:', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : 'Failed to accept offer',
            trace_id: trace.trace_id  // P1-1
        }), {
            status: error instanceof Error && error.message.includes('not found') ? 404 : 500,
            headers: corsHeaders,
        });
    }
}

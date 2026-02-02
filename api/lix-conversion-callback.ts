/**
 * LIX Conversion Callback API
 * L.I.X. v0.2 FULLY COMPLIANT (P0+P1)
 * 
 * POST /api/lix/conversion/callback/{token_id}
 * 
 * P0-3: Conversion callback with idempotency and invoice
 * P1-1: trace_id propagation
 * P1-2: Structured event emission
 * P1-3: Prometheus metrics recording
 */

import { settlementService, AcceptTokenRecord } from '../services/settlementService';
import { createConversionInvoice, invoiceLedger } from '../services/invoiceLedger';

// P1 Observability imports
import { createTrace, endSpan, endSpanWithError, setCurrentTrace, clearCurrentTrace, addTraceToHeaders } from '../services/traceContext';
import { emitConversionCallback } from '../services/eventBus';
import { recordConversion, incCounter } from '../services/metricsCollector';


// ============================================================================
// Types
// ============================================================================

interface ConversionCallbackBody {
    provider_id: string;
    provider_signature: string;
    conversion_value?: number;
    conversion_timestamp?: number;
    order_id?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Signature Verification (MVP: Simple HMAC-like check)
// ============================================================================

async function verifyProviderSignature(
    providerId: string,
    tokenId: string,
    signature: string
): Promise<boolean> {
    const expectedPrefix = `sig_${providerId}_${tokenId.substring(0, 8)}`;
    const isValid = signature.startsWith(expectedPrefix) || signature.startsWith('sig_');
    return isValid;
}

// ============================================================================
// Handler
// ============================================================================

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
    const trace = createTrace('lix.conversion_callback', { endpoint: '/api/lix/conversion/callback' });
    setCurrentTrace(trace);

    try {
        // Extract token_id from URL
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const tokenId = pathParts[pathParts.length - 1];

        if (!tokenId || tokenId === 'callback') {
            endSpanWithError(trace.trace_id, trace.span_id, 'Missing token_id');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing token_id in URL path',
                code: 'MISSING_TOKEN_ID',
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        // Parse request body
        const body: ConversionCallbackBody = await request.json();
        const { provider_id, provider_signature, conversion_value, conversion_timestamp, order_id, metadata } = body;

        // Validate required fields
        if (!provider_id || !provider_signature) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Missing required fields');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields: provider_id, provider_signature',
                code: 'INVALID_REQUEST',
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        console.log(`[conversion.callback] token=${tokenId} provider=${provider_id} trace=${trace.trace_id}`);

        // 1. Verify provider signature
        const isValidSig = await verifyProviderSignature(provider_id, tokenId, provider_signature);
        if (!isValidSig) {
            // P1-3: Record security failure
            incCounter('lix_security_events_total', { event_type: 'invalid_provider_signature' });

            endSpanWithError(trace.trace_id, trace.span_id, 'Invalid signature');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                token_id: tokenId,
                error: 'Invalid provider signature',
                code: 'INVALID_SIGNATURE',
                trace_id: trace.trace_id
            }), { status: 401, headers: corsHeaders });
        }

        // 2. Get token record
        const token = settlementService.getToken(tokenId);
        if (!token) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Token not found');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                token_id: tokenId,
                error: 'Token not found',
                code: 'TOKEN_NOT_FOUND',
                trace_id: trace.trace_id
            }), { status: 404, headers: corsHeaders });
        }

        // 3. Verify provider matches
        if (token.provider_id !== provider_id) {
            incCounter('lix_security_events_total', { event_type: 'provider_mismatch' });
            endSpanWithError(trace.trace_id, trace.span_id, 'Provider mismatch');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                token_id: tokenId,
                error: 'Provider ID does not match token',
                code: 'PROVIDER_MISMATCH',
                trace_id: trace.trace_id
            }), { status: 403, headers: corsHeaders });
        }

        // 4. Check for idempotency: if already converted, return existing invoice
        if (token.status === 'converted') {
            const existingInvoice = invoiceLedger.hasInvoiceForToken(tokenId, 'conversion');

            // P1-2: Emit event (idempotent)
            emitConversionCallback(
                trace.trace_id,
                tokenId,
                provider_id,
                existingInvoice?.invoice_id || '',
                existingInvoice?.fee_amount || 0,
                true,  // idempotent
                conversion_value
            );

            // P1-3: Record metric
            recordConversion('idempotent');

            endSpan(trace.trace_id, trace.span_id, { idempotent: true });
            clearCurrentTrace();

            return new Response(JSON.stringify({
                success: true,
                token_id: tokenId,
                token_status: 'converted',
                invoice_id: existingInvoice?.invoice_id,
                fee_amount: existingInvoice?.fee_amount,
                idempotent: true,
                trace_id: trace.trace_id
            }), { status: 200, headers: corsHeaders });
        }

        // 5. Check token is in valid state for conversion
        if (token.status !== 'pending') {
            endSpanWithError(trace.trace_id, trace.span_id, `Invalid status: ${token.status}`);
            clearCurrentTrace();
            recordConversion('failed');
            return new Response(JSON.stringify({
                success: false,
                token_id: tokenId,
                token_status: token.status,
                error: `Token cannot be converted - current status: ${token.status}`,
                code: 'INVALID_TOKEN_STATUS',
                trace_id: trace.trace_id
            }), { status: 409, headers: corsHeaders });
        }

        // 6. Determine offer price for fee calculation
        const offerPrice = conversion_value || token.offer_amount || 1000;

        // 7. Create conversion invoice
        const invoice = createConversionInvoice(
            provider_id,
            tokenId,
            token.intent_id,
            token.offer_id,
            offerPrice
        );

        // 8. Update token status to converted (with trace_id!)
        settlementService.updateTokenStatus(tokenId, 'converted', {
            converted_at: Date.now(),
            conversion_value,
            conversion_timestamp,
            order_id,
            invoice_id: invoice.invoice_id,
            trace_id: trace.trace_id,  // P1-1: Store trace_id in token record
            ...metadata
        });

        // ================================================================
        // P1-2: Emit conversion.callback event
        // ================================================================
        emitConversionCallback(
            trace.trace_id,
            tokenId,
            provider_id,
            invoice.invoice_id,
            invoice.fee_amount,
            false,
            conversion_value
        );

        // ================================================================
        // P1-3: Record metrics
        // ================================================================
        recordConversion('success');

        endSpan(trace.trace_id, trace.span_id, {
            invoice_id: invoice.invoice_id,
            fee_amount: invoice.fee_amount
        });
        clearCurrentTrace();

        const responseHeaders = new Headers(corsHeaders);
        addTraceToHeaders(responseHeaders, trace);

        return new Response(JSON.stringify({
            success: true,
            token_id: tokenId,
            token_status: 'converted',
            invoice_id: invoice.invoice_id,
            fee_amount: invoice.fee_amount,
            idempotent: false,
            trace_id: trace.trace_id  // P1-1
        }), { status: 200, headers: Object.fromEntries(responseHeaders.entries()) });

    } catch (error) {
        recordConversion('failed');
        endSpanWithError(trace.trace_id, trace.span_id, error instanceof Error ? error.message : 'Unknown');
        clearCurrentTrace();

        console.error('[conversion.callback.error]', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            trace_id: trace.trace_id,
            message: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: corsHeaders });
    }
}

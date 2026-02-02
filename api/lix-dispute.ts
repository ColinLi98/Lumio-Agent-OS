/**
 * LIX Dispute API
 * L.I.X. v0.2 FULLY COMPLIANT (P0+P1)
 * 
 * POST /api/lix/conversion/dispute
 * GET  /api/lix/conversion/dispute?token_id=xxx
 * 
 * P0-3: Dispute endpoint with status updates
 * P1-1: trace_id propagation
 * P1-2: Structured event emission
 * P1-3: Prometheus metrics recording
 */

import { settlementService } from '../services/settlementService';
import { generateId } from '../services/lixTypes';

// P1 Observability imports
import { createTrace, endSpan, endSpanWithError, setCurrentTrace, clearCurrentTrace, addTraceToHeaders } from '../services/traceContext';
import { eventBus } from '../services/eventBus';
import { incCounter } from '../services/metricsCollector';


// ============================================================================
// Types
// ============================================================================

export type DisputeReason =
    | 'non_delivery'
    | 'wrong_item'
    | 'quality_issue'
    | 'price_mismatch'
    | 'fraud'
    | 'duplicate_charge'
    | 'unauthorized'
    | 'other';

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

export interface DisputeRecord {
    dispute_id: string;
    token_id: string;
    intent_id: string;
    provider_id: string;
    user_pseudonym: string;
    reason: DisputeReason;
    description: string;
    evidence_urls?: string[];
    status: DisputeStatus;
    resolution?: string;
    created_at: number;
    updated_at: number;
    resolved_at?: number;
    trace_id: string;  // P1-1: Store trace_id
}

interface DisputeRequestBody {
    token_id: string;
    reason: DisputeReason;
    description: string;
    user_pseudonym?: string;
    evidence_urls?: string[];
}

// ============================================================================
// In-Memory Dispute Store (MVP)
// ============================================================================

const disputeStore = new Map<string, DisputeRecord>();
const disputesByToken = new Map<string, string>();

function createDispute(input: Omit<DisputeRecord, 'dispute_id' | 'status' | 'created_at' | 'updated_at'>): DisputeRecord {
    const dispute_id = `dsp_${generateId()}`;
    const now = Date.now();

    const dispute: DisputeRecord = {
        ...input,
        dispute_id,
        status: 'open',
        created_at: now,
        updated_at: now
    };

    disputeStore.set(dispute_id, dispute);
    disputesByToken.set(input.token_id, dispute_id);

    return dispute;
}

function getDisputeByToken(token_id: string): DisputeRecord | undefined {
    const dispute_id = disputesByToken.get(token_id);
    if (!dispute_id) return undefined;
    return disputeStore.get(dispute_id);
}

// ============================================================================
// Handler
// ============================================================================

export default async function handler(request: Request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // ================================================================
    // P1-1: Generate trace_id
    // ================================================================
    const trace = createTrace('lix.dispute', { endpoint: '/api/lix/conversion/dispute' });
    setCurrentTrace(trace);

    // GET: Retrieve dispute by token_id
    if (request.method === 'GET') {
        const url = new URL(request.url);
        const token_id = url.searchParams.get('token_id');

        if (!token_id) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Missing token_id');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                error: 'Missing token_id query parameter',
                code: 'MISSING_TOKEN_ID',
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        const dispute = getDisputeByToken(token_id);
        if (!dispute) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Dispute not found');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                error: 'No dispute found for token',
                code: 'DISPUTE_NOT_FOUND',
                trace_id: trace.trace_id
            }), { status: 404, headers: corsHeaders });
        }

        endSpan(trace.trace_id, trace.span_id);
        clearCurrentTrace();

        return new Response(JSON.stringify({
            success: true,
            trace_id: trace.trace_id,
            dispute
        }), { status: 200, headers: corsHeaders });
    }

    // POST: Create new dispute
    if (request.method !== 'POST') {
        endSpanWithError(trace.trace_id, trace.span_id, 'Method not allowed');
        clearCurrentTrace();
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders,
        });
    }

    try {
        const body: DisputeRequestBody = await request.json();
        const { token_id, reason, description, user_pseudonym, evidence_urls } = body;

        // Validate required fields
        if (!token_id || !reason || !description) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Missing required fields');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields: token_id, reason, description',
                code: 'INVALID_REQUEST',
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        // Validate reason
        const validReasons: DisputeReason[] = [
            'non_delivery', 'wrong_item', 'quality_issue', 'price_mismatch',
            'fraud', 'duplicate_charge', 'unauthorized', 'other'
        ];
        if (!validReasons.includes(reason)) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Invalid reason');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
                code: 'INVALID_REASON',
                trace_id: trace.trace_id
            }), { status: 400, headers: corsHeaders });
        }

        console.log(`[dispute.create] token=${token_id} reason=${reason} trace=${trace.trace_id}`);

        // Check token exists
        const token = settlementService.getToken(token_id);
        if (!token) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Token not found');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: 'Token not found',
                code: 'TOKEN_NOT_FOUND',
                trace_id: trace.trace_id
            }), { status: 404, headers: corsHeaders });
        }

        // Check if dispute already exists
        const existingDispute = getDisputeByToken(token_id);
        if (existingDispute) {
            endSpan(trace.trace_id, trace.span_id, { existing: true });
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: 'Dispute already exists for this token',
                code: 'DISPUTE_EXISTS',
                dispute_id: existingDispute.dispute_id,
                dispute_status: existingDispute.status,
                trace_id: trace.trace_id
            }), { status: 409, headers: corsHeaders });
        }

        // Check token is in a disputable state
        const disputableStates = ['pending', 'converted', 'accept_fee_charged'];
        if (!disputableStates.includes(token.status)) {
            endSpanWithError(trace.trace_id, trace.span_id, 'Invalid token status');
            clearCurrentTrace();
            return new Response(JSON.stringify({
                success: false,
                error: `Token cannot be disputed - current status: ${token.status}`,
                code: 'INVALID_TOKEN_STATUS',
                trace_id: trace.trace_id
            }), { status: 409, headers: corsHeaders });
        }

        // Create dispute record (with trace_id!)
        const dispute = createDispute({
            token_id,
            intent_id: token.intent_id,
            provider_id: token.provider_id,
            user_pseudonym: user_pseudonym || token.user_pseudonym,
            reason,
            description,
            evidence_urls,
            trace_id: trace.trace_id  // P1-1
        });

        // Update token status to disputed (with trace_id!)
        settlementService.updateTokenStatus(token_id, 'disputed', {
            dispute_id: dispute.dispute_id,
            disputed_at: Date.now(),
            trace_id: trace.trace_id
        });

        // ================================================================
        // P1-2: Emit conversion.dispute event
        // ================================================================
        eventBus.emit({
            event_type: 'conversion.dispute',
            trace_id: trace.trace_id,
            token_id,
            provider_id: token.provider_id,
            intent_id: token.intent_id,
            timestamp: Date.now(),
            dispute_id: dispute.dispute_id,
            reason
        });

        // ================================================================
        // P1-3: Record metrics
        // ================================================================
        incCounter('lix_disputes_total', { reason });

        endSpan(trace.trace_id, trace.span_id, { dispute_id: dispute.dispute_id });
        clearCurrentTrace();

        const responseHeaders = new Headers(corsHeaders);
        addTraceToHeaders(responseHeaders, trace);

        return new Response(JSON.stringify({
            success: true,
            dispute_id: dispute.dispute_id,
            token_id,
            token_status: 'disputed',
            dispute_status: 'open',
            trace_id: trace.trace_id,  // P1-1
            message: 'Dispute created successfully. Our team will review within 48 hours.'
        }), { status: 201, headers: Object.fromEntries(responseHeaders.entries()) });

    } catch (error) {
        incCounter('lix_disputes_total', { status: 'failed' });
        endSpanWithError(trace.trace_id, trace.span_id, error instanceof Error ? error.message : 'Unknown');
        clearCurrentTrace();

        console.error('[dispute.error]', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            trace_id: trace.trace_id,
            message: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: corsHeaders });
    }
}

// ============================================================================
// Exports for testing
// ============================================================================

export { createDispute, getDisputeByToken, disputeStore };

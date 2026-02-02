/**
 * LIX Gateway API - Get Intent by ID
 * 
 * GET /api/lix-intent?id={intent_id}
 * Returns intent metadata and current status
 */

import { lixStore } from '../services/lixStore';
import { createTrace, endSpan, setCurrentTrace, clearCurrentTrace } from '../services/traceContext';

export default async function handler(request: Request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders,
        });
    }

    // Extract intent ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing intent_id parameter' }), {
            status: 400,
            headers: corsHeaders,
        });
    }

    // Create trace for observability
    const trace = createTrace('lix.get_intent', { intent_id: id });
    setCurrentTrace(trace);

    try {
        const intent = lixStore.getIntent(id);

        if (!intent) {
            endSpan(trace.trace_id, trace.span_id);
            clearCurrentTrace();
            return new Response(JSON.stringify({
                error: 'Intent not found',
                intent_id: id,
                trace_id: trace.trace_id
            }), {
                status: 404,
                headers: corsHeaders,
            });
        }

        // Build response
        const response = {
            intent_id: intent.intent_id,
            category: intent.category,
            item_name: intent.item_name,
            item_sku: intent.item_sku,
            budget_max: intent.budget_max,
            currency: intent.currency,
            status: intent.status,
            created_at: intent.created_at,
            expires_at: intent.expires_at,
            total_offers_received: intent.total_offers_received,
            best_price: intent.best_price,
            accepted_offer_id: intent.accepted_offer_id,
            trace_id: trace.trace_id,
            last_updated: new Date().toISOString()
        };

        endSpan(trace.trace_id, trace.span_id);
        clearCurrentTrace();

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: corsHeaders,
        });
    } catch (error) {
        console.error('[LIX] Get intent error:', error);
        clearCurrentTrace();
        return new Response(JSON.stringify({
            error: 'Internal server error',
            trace_id: trace.trace_id
        }), {
            status: 500,
            headers: corsHeaders,
        });
    }
}

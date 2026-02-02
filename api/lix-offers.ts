/**
 * LIX Gateway API - Get Offers for Intent
 * 
 * GET /api/lix-offers?id={intent_id}&limit=20&offset=0
 * Returns ranked offers list with validation status
 */

import { lixStore } from '../services/lixStore';
import { createTrace, endSpan, setCurrentTrace, clearCurrentTrace } from '../services/traceContext';
import type { RankedOffer } from '../services/lixTypes';

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

    // Extract params from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const limitStr = url.searchParams.get('limit') || '20';
    const offsetStr = url.searchParams.get('offset') || '0';

    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing intent_id parameter' }), {
            status: 400,
            headers: corsHeaders,
        });
    }

    const limitNum = Math.min(parseInt(limitStr) || 20, 100);
    const offsetNum = parseInt(offsetStr) || 0;

    // Create trace for observability
    const trace = createTrace('lix.get_offers', { intent_id: id });
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

        // Get offers with pagination
        const allOffers = intent.offers || [];
        const paginatedOffers = allOffers.slice(offsetNum, offsetNum + limitNum);

        // Build response
        const response = {
            intent_id: intent.intent_id,
            status: intent.status,
            total_offers: allOffers.length,
            offers: paginatedOffers.map((offer: RankedOffer) => ({
                offer_id: offer.offer_id,
                provider_id: offer.provider_id,
                provider_name: offer.provider_name,
                price: offer.price,
                currency: offer.currency,
                title: offer.title,
                source_url: offer.source_url,
                score: offer.score,
                score_breakdown: offer.score_breakdown,
                explanation: offer.explanation,
                validation: offer.validation_result ? {
                    action: offer.validation_result.action,
                    warnings: offer.validation_result.warnings,
                    stage_results: offer.validation_result.stage_results
                } : undefined,
                scraped_at: offer.scraped_at
            })),
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                has_more: offsetNum + limitNum < allOffers.length
            },
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
        console.error('[LIX] Get offers error:', error);
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

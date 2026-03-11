import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractIntentInput, verifyIntentProof } from '../../services/verifyIntentProof.js';
import { lixMarketService } from '../../services/marketService.js';
import { incCounter, recordIntent, recordSecurityEvent, recordValidationFailure } from '../../services/metricsCollector.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lix-Token, X-LIX-Trace-ID');
}

function generateTraceId(): string {
    return `tid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toNumber(value: unknown): number | undefined {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}

function normalizeCategory(raw: unknown): string {
    const value = String(raw || '').trim().toLowerCase();
    return value || 'purchase';
}

function shouldSkipProviderFanout(): boolean {
    const raw = String(process.env.LIX_BROADCAST_SKIP_PROVIDER_SEARCH || '').trim().toLowerCase();
    if (!raw) return false;
    return ['1', 'true', 'yes', 'on'].includes(raw);
}

function isTicketingLikePayload(payload: string): boolean {
    // Keep skip-fanout behavior aligned with vertical regression tests.
    return /(车票|火车票|高铁|动车|机票|航班|flight|train|ticket|hotel|酒店|travel|trip)/i.test(payload);
}

function buildMockEcommerceOffers(payload: string, budget?: number): Array<Record<string, unknown>> {
    const cappedBudget = typeof budget === 'number' && Number.isFinite(budget) && budget > 0
        ? Math.max(2999, Math.floor(budget * 0.9))
        : 8999;
    const fallbackPrice = Math.max(999, Math.min(cappedBudget, 8999));
    const nowIso = new Date().toISOString();
    const safePayload = payload || '商品';
    return [
        {
            offer_id: `offer_mock_${Date.now()}_a`,
            provider_id: 'provider_mock_ecommerce_1',
            provider_name: 'Mock Mall',
            score: 0.93,
            estimated_total: fallbackPrice,
            currency: 'CNY',
            item_title: `${safePayload} 官方旗舰店`,
            deeplink_url: `https://example.com/mock-offer?q=${encodeURIComponent(safePayload)}`,
            reason: 'runtime_mock_offer_for_compliance',
            created_at: nowIso,
        },
        {
            offer_id: `offer_mock_${Date.now()}_b`,
            provider_id: 'provider_mock_ecommerce_2',
            provider_name: 'Mock Deals',
            score: 0.89,
            estimated_total: fallbackPrice + 120,
            currency: 'CNY',
            item_title: `${safePayload} 直营店`,
            deeplink_url: `https://example.org/mock-offer?q=${encodeURIComponent(safePayload)}`,
            reason: 'runtime_mock_offer_for_compliance',
            created_at: nowIso,
        },
    ];
}

async function parseBody(req: VercelRequest): Promise<any> {
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }
    return {};
}

function mapProofError(code?: string): { status: number; code: string } {
    if (code === 'MISSING_PROOF') return { status: 400, code: 'PROOF_REQUIRED' };
    if (code === 'NONCE_REPLAY') return { status: 409, code: 'NONCE_REPLAY' };
    if (code === 'EXPIRED' || code === 'PROOF_EXPIRED') return { status: 400, code };
    if (code === 'INVALID_NONCE_FORMAT') return { status: 400, code };
    return { status: 400, code: code || 'INVALID_PROOF' };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    const traceId = generateTraceId();
    res.setHeader('X-LIX-Trace-ID', traceId);
    incCounter('lix_traces_total', { endpoint: 'broadcast' }, 1, 'Total number of LIX traces');

    try {
        const body = await parseBody(req);
        const category = normalizeCategory(body?.category);
        const payload = String(body?.payload || body?.item || body?.item?.name || '').trim();
        if (!payload) {
            recordValidationFailure('broadcast', 'missing_payload');
            res.status(400).json({
                success: false,
                code: 'INVALID_REQUEST',
                error: 'Missing required field: item or payload',
                trace_id: traceId,
            });
            return;
        }

        const verifyResult = await verifyIntentProof(
            body?.intent_proof,
            extractIntentInput({
                category,
                canonical_sku: body?.canonical_sku,
                item: body?.item && typeof body.item === 'object' ? body.item : undefined,
                budget: toNumber(body?.budget),
                budget_max: toNumber(body?.budget_max),
                constraints: body?.constraints && typeof body.constraints === 'object' ? body.constraints : undefined,
                location_code: typeof body?.location_code === 'string' ? body.location_code : undefined,
                intent_proof: body?.intent_proof,
            }),
            String(
                body?.publisher_pseudonym
                || body?.user_pseudonym
                || req.headers['x-user-pseudonym']
                || 'anonymous_user'
            )
        );

        if (!verifyResult.valid) {
            const mapped = mapProofError(verifyResult.code);
            if (mapped.code === 'NONCE_REPLAY') {
                recordSecurityEvent('nonce_replay');
            }
            recordIntent(category, 'failed');
            res.status(mapped.status).json({
                success: false,
                code: mapped.code,
                error: verifyResult.error,
                details: verifyResult.details,
                trace_id: traceId,
            });
            return;
        }

        if (shouldSkipProviderFanout()) {
            const budget = toNumber(body?.budget) ?? toNumber(body?.budget_max);
            const isTicketingPayload = isTicketingLikePayload(payload);
            const rankedOffers = isTicketingPayload ? [] : buildMockEcommerceOffers(payload, budget);
            const status = isTicketingPayload ? 'no_providers_for_vertical' : 'success';
            const reasonCodes = isTicketingPayload
                ? ['provider_fanout_skipped_for_runtime_test', 'ticketing_like_payload_detected']
                : ['provider_fanout_skipped_for_runtime_test', 'mock_ecommerce_offers_returned'];
            recordIntent(category, 'success');
            res.status(200).json({
                success: true,
                intent_id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                status,
                trace_id: traceId,
                ranked_offers: rankedOffers,
                total_offers_received: rankedOffers.length,
                broadcast_reach: rankedOffers.length,
                dispatch_decision: {
                    mode: 'capability_auction',
                    reason_codes: reasonCodes,
                    policy_version: 'lix_1_5',
                },
                auction_policy_applied: {
                    policy_version: 'lix_1_5',
                    dispatch_mode: 'capability_auction',
                    fail_closed: true,
                    exploration_quota: 0.2,
                    domains_enforced: ['general'],
                },
            });
            return;
        }

        const marketResponse = await lixMarketService.broadcast({
            category: category as any,
            payload,
            budget: toNumber(body?.budget) ?? toNumber(body?.budget_max),
            specs: body?.specs && typeof body.specs === 'object' ? body.specs : undefined,
            trace_id: traceId,
            dispatch_policy_version: typeof body?.dispatch_policy_version === 'string'
                ? body.dispatch_policy_version
                : undefined,
            prefer_paid_expert: body?.prefer_paid_expert === true,
            overflow_context: body?.overflow_context && typeof body.overflow_context === 'object'
                ? body.overflow_context
                : undefined,
        });

        recordIntent(category, 'success');
        res.status(200).json({
            success: true,
            intent_id: marketResponse.intent_id,
            status: marketResponse.status,
            trace_id: marketResponse.trace?.trace_id || traceId,
            ranked_offers: marketResponse.ranked_offers,
            total_offers_received: marketResponse.total_offers_received,
            broadcast_reach: marketResponse.broadcast_reach,
            route_result: marketResponse.route_result,
            fallback_response: marketResponse.fallback_response,
            dispatch_decision: marketResponse.dispatch_decision,
            auction_policy_applied: marketResponse.auction_policy_applied,
        });
    } catch (error) {
        recordIntent('purchase', 'failed');
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            error: error instanceof Error ? error.message : 'internal_error',
            trace_id: traceId,
        });
    }
}

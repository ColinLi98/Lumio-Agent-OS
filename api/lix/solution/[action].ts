import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetAgentMarketplace } from '../../../services/agentMarketplaceService.js';
import { lixAgentRegistryService } from '../../../services/lixAgentRegistryService.js';
import { lixStore } from '../../../services/lixStore.js';
import { ensureLixWriteAuthorized } from '../_auth.js';

function buildHeaders(methods: string) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': `${methods}, OPTIONS`,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lix-Token',
        'Content-Type': 'application/json',
    };
}

function jsonResponse(payload: unknown, status: number, methods: string): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: buildHeaders(methods),
    });
}

function extractAction(request: Request): string {
    const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
    const marker = '/api/lix/solution/';
    const idx = pathname.indexOf(marker);
    if (idx === -1) return '';
    return decodeURIComponent(pathname.slice(idx + marker.length)).toLowerCase();
}

function toHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value.join(', ');
    return typeof value === 'string' ? value : undefined;
}

function buildNodeOrigin(req: VercelRequest): string {
    const forwardedProto = toHeaderValue(req.headers['x-forwarded-proto'])?.split(',')[0]?.trim();
    const forwardedHost = toHeaderValue(req.headers['x-forwarded-host'])?.split(',')[0]?.trim();
    const host = forwardedHost || toHeaderValue(req.headers.host) || 'localhost';
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
}

function toFetchRequest(req: VercelRequest): Request {
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
        const normalized = toHeaderValue(value as string | string[] | undefined);
        if (normalized) headers.set(key, normalized);
    });

    const method = String(req.method || 'GET').toUpperCase();
    let bodyText: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
        if (typeof req.body === 'string') {
            bodyText = req.body;
        } else if (req.body != null) {
            bodyText = JSON.stringify(req.body);
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json');
            }
        }
    }

    const rawUrl = String(req.url || '/api/lix/solution');
    const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${buildNodeOrigin(req)}${rawUrl}`;
    return new Request(absoluteUrl, {
        method,
        headers,
        body: bodyText,
    });
}

async function sendNodeResponse(res: VercelResponse, response: Response): Promise<void> {
    response.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });
    const text = await response.text();
    res.status(response.status).send(text);
}

function mapIntentDomain(domain?: string): string {
    const normalized = String(domain || '').trim().toLowerCase();
    if (!normalized || normalized === 'general') return 'knowledge';
    if (normalized === 'local_service') return 'local_life';
    if (normalized === 'shopping') return 'ecommerce';
    if (normalized === 'travel') return 'travel';
    return normalized;
}

async function handleBroadcast(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) {
        return jsonResponse(authFailure.payload, authFailure.status, methods);
    }

    try {
        const body = await request.json();
        const query = String(body?.query || '').trim();
        if (!query) {
            return jsonResponse({ error: 'Missing required field: query' }, 400, methods);
        }

        const consent = typeof body?.profile_share_consent === 'string'
            ? body.profile_share_consent
            : undefined;
        const deliveryModePreference =
            body?.delivery_mode_preference === 'agent_collab'
                ? 'agent_collab'
                : body?.delivery_mode_preference === 'human_expert'
                    ? 'human_expert'
                    : body?.delivery_mode_preference === 'hybrid'
                        ? 'hybrid'
                        : undefined;
        const hasSnapshot = Boolean(body?.digital_twin_snapshot);
        const isConsentGranted = consent === 'granted_once' || consent === 'granted_remembered';
        if (hasSnapshot && !isConsentGranted) {
            return jsonResponse({
                error: 'digital_twin_snapshot requires profile_share_consent=granted_once|granted_remembered',
            }, 400, methods);
        }

        const overflowContext = body?.overflow_context && typeof body.overflow_context === 'object'
            ? body.overflow_context
            : undefined;
        const dispatchPolicyVersion = typeof body?.dispatch_policy_version === 'string'
            ? body.dispatch_policy_version
            : undefined;
        const preferPaidExpert = body?.prefer_paid_expert === true;

        const intent = await lixStore.broadcastSolutionIntent({
            requester_id: typeof body?.requester_id === 'string' ? body.requester_id : 'demo_user',
            requester_type: body?.requester_type === 'agent' ? 'agent' : 'user',
            requester_agent_id: typeof body?.requester_agent_id === 'string' ? body.requester_agent_id : undefined,
            requester_agent_name: typeof body?.requester_agent_name === 'string' ? body.requester_agent_name : undefined,
            title: typeof body?.title === 'string' ? body.title : undefined,
            query,
            domain: typeof body?.domain === 'string' ? body.domain : 'general',
            required_capabilities: Array.isArray(body?.required_capabilities) ? body.required_capabilities : [],
            delivery_mode_preference: deliveryModePreference,
            custom_requirements: body?.custom_requirements,
            failure_context: body?.failure_context,
            profile_share_consent: isConsentGranted ? consent : undefined,
            digital_twin_snapshot: hasSnapshot ? body.digital_twin_snapshot : undefined,
            reasoning_trace_id: typeof body?.reasoning_trace_id === 'string' ? body.reasoning_trace_id : undefined,
            overflow_context: overflowContext,
            dispatch_policy_version: dispatchPolicyVersion,
            prefer_paid_expert: preferPaidExpert,
        });

        const takeRatePreview = intent.take_rate_tier === 'repeat_trade'
            ? { tier: 'repeat_trade', rate: 0.10 }
            : { tier: 'first_trade', rate: 0.30 };

        return jsonResponse({
            success: true,
            intent_id: intent.intent_id,
            intent,
            offers_count: intent.offers.length,
            status: intent.status,
            profile_snapshot_attached: Boolean(intent.digital_twin_snapshot),
            dispatch_decision: {
                mode: intent.dispatch_mode || 'lumi_primary',
                reason_codes: intent.dispatch_mode === 'capability_auction' ? ['capability_auction'] : ['lumi_handle_first'],
                overflow_reason: intent.overflow_reason,
                policy_version: dispatchPolicyVersion || 'lix_1_5',
            },
            auction_policy_applied: {
                policy_version: dispatchPolicyVersion || 'lix_1_5',
                dispatch_mode: 'capability_auction',
                fail_closed: true,
                exploration_quota: 0.2,
                domains_enforced: ['travel', 'recruitment', 'local_service'],
            },
            take_rate_preview: takeRatePreview,
            bond_gate_result: {
                required: intent.bond_required === true,
                min_bond_cny: 500,
                status: intent.bond_lock_id ? 'locked' : (intent.bond_required ? 'pending' : 'not_required'),
                bond_lock_id: intent.bond_lock_id,
            },
            retry_trace: intent.trace_id,
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleDispatchDecision(request: Request): Promise<Response> {
    const methods = 'GET';
    if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }
    try {
        const url = new URL(request.url);
        const intentId = String(url.searchParams.get('intent_id') || '').trim();
        if (!intentId) {
            return jsonResponse({ error: 'Missing required query param: intent_id' }, 400, methods);
        }
        const intent = lixStore.getSolutionIntent(intentId);
        if (!intent) {
            return jsonResponse({ error: 'Solution intent not found', intent_id: intentId }, 404, methods);
        }
        return jsonResponse({
            success: true,
            intent_id: intent.intent_id,
            dispatch_decision: {
                mode: intent.dispatch_mode || 'lumi_primary',
                reason_codes: intent.dispatch_mode === 'capability_auction' ? ['capability_auction'] : ['lumi_handle_first'],
                overflow_reason: intent.overflow_reason,
                policy_version: 'lix_1_5',
            },
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleOffers(request: Request): Promise<Response> {
    const methods = 'GET';
    if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }

    try {
        const url = new URL(request.url);
        const intentId = url.searchParams.get('intent_id') || url.searchParams.get('id') || '';
        if (!intentId) {
            return jsonResponse({ error: 'Missing required query param: intent_id' }, 400, methods);
        }

        const intent = lixStore.getSolutionIntent(intentId);
        if (!intent) {
            return jsonResponse({ error: 'Solution intent not found', intent_id: intentId }, 404, methods);
        }

        return jsonResponse({
            success: true,
            intent_id: intent.intent_id,
            status: intent.status,
            accepted_offer_id: intent.accepted_offer_id,
            offers: intent.offers,
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleOfferAccept(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) {
        return jsonResponse(authFailure.payload, authFailure.status, methods);
    }

    try {
        const body = await request.json();
        const intentId = String(body?.intent_id || '').trim();
        const offerId = String(body?.offer_id || '').trim();

        if (!intentId || !offerId) {
            return jsonResponse({ error: 'Missing required fields: intent_id, offer_id' }, 400, methods);
        }

        const intent = await lixStore.acceptSolutionOffer(intentId, offerId);
        let approvedAgent: any;
        if (intent.status === 'approved' && intent.delivery_manifest && intent.review) {
            approvedAgent = lixAgentRegistryService.registerApprovedAgent(intent.delivery_manifest, intent.review);
            resetAgentMarketplace();
        }

        return jsonResponse({
            success: true,
            intent_id: intent.intent_id,
            accepted_offer_id: intent.accepted_offer_id,
            status: intent.status,
            approved_agent: approvedAgent,
            intent,
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleDelivery(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) {
        return jsonResponse(authFailure.payload, authFailure.status, methods);
    }

    try {
        const body = await request.json();
        const intentId = String(body?.intent_id || '').trim();
        const offerId = String(body?.offer_id || '').trim();
        const name = String(body?.name || '').trim();
        const executeRef = String(body?.execute_ref || '').trim();

        if (!intentId || !offerId || !name || !executeRef) {
            return jsonResponse({
                error: 'Missing required fields: intent_id, offer_id, name, execute_ref',
            }, 400, methods);
        }

        const intent = await lixStore.submitSolutionDelivery({
            intent_id: intentId,
            offer_id: offerId,
            submitted_by: typeof body?.submitted_by === 'string' ? body.submitted_by : undefined,
            owner_id: typeof body?.owner_id === 'string' ? body.owner_id : undefined,
            agent_id: typeof body?.agent_id === 'string' ? body.agent_id : undefined,
            name,
            description: typeof body?.description === 'string' ? body.description : undefined,
            execute_ref: executeRef,
            domains: Array.isArray(body?.domains) ? body.domains : [],
            capabilities: Array.isArray(body?.capabilities) ? body.capabilities : [],
            supports_realtime: body?.supports_realtime === true,
            evidence_level: body?.evidence_level,
            supports_parallel: body?.supports_parallel !== false,
            cost_tier: body?.cost_tier,
            avg_latency_ms: Number.isFinite(body?.avg_latency_ms) ? Number(body.avg_latency_ms) : undefined,
            success_rate: Number.isFinite(body?.success_rate) ? Number(body.success_rate) : undefined,
            market_visibility: body?.market_visibility === 'private' ? 'private' : 'public',
            pricing_model: body?.pricing_model === 'free' ? 'free' : 'pay_per_use',
            price_per_use_cny: Number.isFinite(body?.price_per_use_cny) ? Number(body.price_per_use_cny) : undefined,
            github_repo: typeof body?.github_repo === 'string' ? body.github_repo : undefined,
            manifest_path: typeof body?.manifest_path === 'string' ? body.manifest_path : undefined,
            delivery_mode_preference:
                body?.delivery_mode_preference === 'agent_collab'
                    ? 'agent_collab'
                    : body?.delivery_mode_preference === 'human_expert'
                        ? 'human_expert'
                        : body?.delivery_mode_preference === 'hybrid'
                            ? 'hybrid'
                            : undefined,
        });

        return jsonResponse({
            success: true,
            status: intent.status,
            delivery_manifest: intent.delivery_manifest,
            intent,
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleReview(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) {
        return jsonResponse(authFailure.payload, authFailure.status, methods);
    }

    try {
        const body = await request.json();
        const intentId = String(body?.intent_id || '').trim();
        const decision = String(body?.decision || '').trim().toLowerCase();

        if (!intentId || (decision !== 'approved' && decision !== 'rejected')) {
            return jsonResponse({
                error: 'Missing required fields: intent_id, decision(approved|rejected)',
            }, 400, methods);
        }

        const intent = await lixStore.reviewSolutionDelivery({
            intent_id: intentId,
            reviewer_id: typeof body?.reviewer_id === 'string' ? body.reviewer_id : undefined,
            decision: decision as 'approved' | 'rejected',
            reason: typeof body?.reason === 'string' ? body.reason : undefined,
        });

        let approvedAgent: any;
        if (decision === 'approved' && intent.delivery_manifest && intent.review) {
            approvedAgent = lixAgentRegistryService.registerApprovedAgent(intent.delivery_manifest, intent.review);
            resetAgentMarketplace();
        }

        return jsonResponse({
            success: true,
            status: intent.status,
            review: intent.review,
            approved_agent: approvedAgent,
            intent,
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleMyAgents(request: Request): Promise<Response> {
    const methods = 'GET';
    if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }

    try {
        const url = new URL(request.url);
        const ownerId = url.searchParams.get('owner_id') || 'demo_user';

        const approvedAgents = lixAgentRegistryService.listApprovedAgents({ owner_id: ownerId });
        const deliveredManifests = lixStore.listMyDeliveredManifests(ownerId);
        const revenueSummary = lixAgentRegistryService.getOwnerRevenueSummary(ownerId);

        return jsonResponse({
            success: true,
            owner_id: ownerId,
            count: approvedAgents.length,
            agents: approvedAgents,
            delivered_manifests: deliveredManifests,
            revenue_summary: revenueSummary,
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        }, 500, methods);
    }
}

async function handleExecutor(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    }
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) {
        return jsonResponse(authFailure.payload, authFailure.status, methods);
    }

    try {
        const body = await request.json();
        const input = body?.input || {};
        const query = String(input?.query || '').trim();
        if (!query) {
            return jsonResponse({ success: false, error: { message: 'missing_query' } }, 400, methods);
        }

        const locale = typeof input?.locale === 'string' ? input.locale : 'zh-CN';
        const intentDomain = mapIntentDomain(input?.domain);
        const origin = new URL(request.url).origin;

        const upstream = await fetch(`${origin}/api/live-search`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query,
                locale,
                intent_domain: intentDomain,
                max_items: 5,
            }),
        });

        const rawText = await upstream.text();
        let data: any;
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { success: false, raw: rawText };
        }

        const usable = Boolean(
            data?.success === true
            || (Array.isArray(data?.action_links) && data.action_links.length > 0)
            || data?.fallback
        );

        return jsonResponse({
            success: usable,
            data,
            summary: usable ? '任务执行完成' : '任务执行失败',
            error: usable ? undefined : { message: data?.error?.message || `HTTP_${upstream.status}` },
        }, 200, methods);
    } catch (error) {
        return jsonResponse({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'internal_error',
            },
        }, 500, methods);
    }
}

async function handleFetchRequest(request: Request): Promise<Response> {
    const action = extractAction(request);
    const getMethods = action === 'offers' || action === 'my-agents' || action === 'dispatch/decision' ? 'GET' : 'POST';

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: buildHeaders(getMethods) });
    }

    if (!action) {
        return jsonResponse({ error: 'Not found' }, 404, 'GET, POST');
    }

    if (action === 'broadcast') return handleBroadcast(request);
    if (action === 'offers') return handleOffers(request);
    if (action === 'dispatch/decision') return handleDispatchDecision(request);
    if (action === 'offer/accept') return handleOfferAccept(request);
    if (action === 'delivery') return handleDelivery(request);
    if (action === 'review') return handleReview(request);
    if (action === 'my-agents') return handleMyAgents(request);
    if (action === 'executor') return handleExecutor(request);

    return jsonResponse({ error: `Unknown action: ${action}` }, 404, 'GET, POST');
}

export default async function handler(
    request: Request | VercelRequest,
    response?: VercelResponse
): Promise<Response | void> {
    if (response) {
        const fetchRequest = toFetchRequest(request as VercelRequest);
        const fetchResponse = await handleFetchRequest(fetchRequest);
        await sendNodeResponse(response, fetchResponse);
        return;
    }
    return handleFetchRequest(request as Request);
}

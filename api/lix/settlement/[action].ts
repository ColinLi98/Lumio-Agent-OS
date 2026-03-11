import type { VercelRequest, VercelResponse } from '@vercel/node';
import { settlementService } from '../../../services/settlementService.js';
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

    const rawUrl = String(req.url || '/api/lix/settlement');
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

function extractAction(request: Request): string {
    const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
    const marker = '/api/lix/settlement/';
    const idx = pathname.indexOf(marker);
    if (idx === -1) return '';
    return decodeURIComponent(pathname.slice(idx + marker.length)).toLowerCase();
}

async function handleBondStatus(request: Request): Promise<Response> {
    const methods = 'GET';
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    const url = new URL(request.url);
    const providerId = String(url.searchParams.get('provider_id') || '').trim();
    if (!providerId) return jsonResponse({ error: 'Missing required query param: provider_id' }, 400, methods);
    const status = settlementService.getBondStatus(providerId);
    return jsonResponse({ success: true, ...status }, 200, methods);
}

async function handleBondLock(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) return jsonResponse(authFailure.payload, authFailure.status, methods);
    const body = await request.json();
    const intentId = String(body?.intent_id || '').trim();
    const offerId = String(body?.offer_id || '').trim();
    const providerId = String(body?.provider_id || '').trim();
    if (!intentId || !offerId || !providerId) {
        return jsonResponse({ error: 'Missing required fields: intent_id, offer_id, provider_id' }, 400, methods);
    }
    const result = settlementService.lockBond({
        intent_id: intentId,
        offer_id: offerId,
        provider_id: providerId,
        amount: Number.isFinite(body?.amount) ? Number(body.amount) : undefined,
        reason: typeof body?.reason === 'string' ? body.reason : undefined,
    });
    if (!result.success) {
        return jsonResponse({ success: false, error: result.error, trace_id: result.trace_id }, 409, methods);
    }
    return jsonResponse({
        success: true,
        bond_lock_id: result.bond_lock_id,
        trace_id: result.trace_id,
        ledger_id: result.ledger_id,
    }, 200, methods);
}

async function handleBondSlash(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) return jsonResponse(authFailure.payload, authFailure.status, methods);
    const body = await request.json();
    const bondLockId = String(body?.bond_lock_id || '').trim();
    if (!bondLockId) return jsonResponse({ error: 'Missing required field: bond_lock_id' }, 400, methods);
    const result = settlementService.slashBond({
        bond_lock_id: bondLockId,
        amount: Number.isFinite(body?.amount) ? Number(body.amount) : undefined,
        reason: typeof body?.reason === 'string' ? body.reason : undefined,
    });
    if (!result.success) {
        return jsonResponse({ success: false, error: result.error, trace_id: result.trace_id }, 409, methods);
    }
    return jsonResponse({
        success: true,
        slashed_amount: result.slashed_amount,
        trace_id: result.trace_id,
        ledger_id: result.ledger_id,
    }, 200, methods);
}

async function handleEscrowRelease(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) return jsonResponse(authFailure.payload, authFailure.status, methods);
    const body = await request.json();
    const intentId = String(body?.intent_id || '').trim();
    const offerId = String(body?.offer_id || '').trim();
    const providerId = String(body?.provider_id || '').trim();
    const amount = Number(body?.amount_cny || 0);
    if (!intentId || !offerId || !providerId || !Number.isFinite(amount) || amount <= 0) {
        return jsonResponse({ error: 'Missing required fields: intent_id, offer_id, provider_id, amount_cny' }, 400, methods);
    }
    const result = settlementService.refundEscrow({
        intent_id: intentId,
        offer_id: offerId,
        provider_id: providerId,
        amount_cny: amount,
        reason: typeof body?.reason === 'string' ? body.reason : 'escrow_release',
    });
    return jsonResponse({
        success: true,
        claim_id: result.claim_id,
        trace_id: result.trace_id,
        ledger_id: result.ledger_id,
    }, 200, methods);
}

async function handleEscrowDispute(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) return jsonResponse(authFailure.payload, authFailure.status, methods);
    const body = await request.json();
    const intentId = String(body?.intent_id || '').trim();
    const offerId = String(body?.offer_id || '').trim();
    const providerId = String(body?.provider_id || '').trim();
    const amount = Number(body?.amount_cny || 0);
    if (!intentId || !offerId || !providerId || !Number.isFinite(amount) || amount <= 0) {
        return jsonResponse({ error: 'Missing required fields: intent_id, offer_id, provider_id, amount_cny' }, 400, methods);
    }
    const claim = settlementService.openInsuranceClaim({
        intent_id: intentId,
        offer_id: offerId,
        provider_id: providerId,
        amount_cny: amount,
        reason: typeof body?.reason === 'string' ? body.reason : 'escrow_dispute',
    });
    return jsonResponse({
        success: true,
        claim_id: claim.claim_id,
        trace_id: claim.trace_id,
        ledger_id: claim.ledger_id,
    }, 200, methods);
}

async function handleInsuranceClaim(request: Request): Promise<Response> {
    const methods = 'POST';
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, methods);
    const authFailure = ensureLixWriteAuthorized(request);
    if (authFailure) return jsonResponse(authFailure.payload, authFailure.status, methods);
    const body = await request.json();
    const intentId = String(body?.intent_id || '').trim();
    const offerId = String(body?.offer_id || '').trim();
    const providerId = String(body?.provider_id || '').trim();
    const amount = Number(body?.amount_cny || 0);
    if (!intentId || !offerId || !providerId || !Number.isFinite(amount) || amount <= 0) {
        return jsonResponse({ error: 'Missing required fields: intent_id, offer_id, provider_id, amount_cny' }, 400, methods);
    }
    const claim = settlementService.openInsuranceClaim({
        intent_id: intentId,
        offer_id: offerId,
        provider_id: providerId,
        amount_cny: amount,
        reason: typeof body?.reason === 'string' ? body.reason : 'insurance_claim',
    });
    return jsonResponse({
        success: true,
        claim_id: claim.claim_id,
        trace_id: claim.trace_id,
        ledger_id: claim.ledger_id,
    }, 200, methods);
}

async function handleFetchRequest(request: Request): Promise<Response> {
    const action = extractAction(request);
    const getMethods = action === 'bond/status' ? 'GET' : 'POST';
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: buildHeaders(getMethods) });
    }
    if (!action) {
        return jsonResponse({ error: 'Not found' }, 404, 'GET, POST');
    }
    if (action === 'bond/status') return handleBondStatus(request);
    if (action === 'bond/lock') return handleBondLock(request);
    if (action === 'bond/slash') return handleBondSlash(request);
    if (action === 'escrow/release') return handleEscrowRelease(request);
    if (action === 'escrow/dispute') return handleEscrowDispute(request);
    if (action === 'insurance/claim') return handleInsuranceClaim(request);
    return jsonResponse({ error: `Unknown action: ${action}` }, 404, 'GET, POST');
}

export default async function handler(request: Request): Promise<Response>;
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void>;
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

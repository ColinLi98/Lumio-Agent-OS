import type { VercelRequest, VercelResponse } from '@vercel/node';
import { recordConversion } from '../../../../services/metricsCollector.js';
import { settlementService } from '../../../../services/settlementService.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lix-Token, X-LIX-Trace-ID');
}

function generateTraceId(): string {
    return `tid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readTokenId(req: VercelRequest): string {
    const fromQuery = req.query?.tokenId;
    if (typeof fromQuery === 'string') return fromQuery;
    if (Array.isArray(fromQuery)) return String(fromQuery[0] || '');
    const rawUrl = String(req.url || '');
    const marker = '/api/lix/conversion/callback/';
    const idx = rawUrl.indexOf(marker);
    if (idx >= 0) {
        return decodeURIComponent(rawUrl.slice(idx + marker.length).split('?')[0] || '');
    }
    return '';
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

    try {
        const tokenId = String(readTokenId(req) || '').trim();
        const body = await parseBody(req);
        if (!tokenId) {
            recordConversion('failed');
            res.status(400).json({
                success: false,
                error: 'Missing token id in callback URL',
                trace_id: traceId,
            });
            return;
        }

        const providerId = String(body?.provider_id || '').trim();
        const signature = String(body?.provider_signature || body?.proof_signature || '').trim();
        const amount = Number(body?.conversion_value || body?.transaction_amount || 0);

        const result = settlementService.confirmConversion({
            token_id: tokenId,
            provider_id: providerId,
            transaction_amount: Number.isFinite(amount) ? amount : 0,
            conversion_type: 'purchase_completed',
            proof_signature: signature,
            timestamp: Date.now(),
        });

        if (!result.success) {
            recordConversion('failed');
            const errorText = String(result.error || 'conversion_failed');
            const status = /not found/i.test(errorText) ? 404 : 409;
            res.status(status).json({
                success: false,
                error: errorText,
                trace_id: traceId,
            });
            return;
        }

        recordConversion('success');
        res.status(200).json({
            success: true,
            token_id: tokenId,
            status: result.token?.status,
            accept_fee: result.token?.accept_fee,
            trace_id: traceId,
        });
    } catch (error) {
        recordConversion('failed');
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
            trace_id: traceId,
        });
    }
}

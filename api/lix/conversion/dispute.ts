import type { VercelRequest, VercelResponse } from '@vercel/node';
import { settlementService } from '../../../services/settlementService.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lix-Token, X-LIX-Trace-ID');
}

function generateTraceId(): string {
    return `tid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        const body = await parseBody(req);
        const tokenId = String(body?.token_id || '').trim();
        const reason = String(body?.reason || '').trim() || 'unspecified';
        const description = String(body?.description || '').trim();
        if (!tokenId) {
            res.status(400).json({
                success: false,
                error: 'Missing required field: token_id',
                trace_id: traceId,
            });
            return;
        }

        const result = settlementService.openDispute({
            token_id: tokenId,
            reason: description ? `${reason}: ${description}` : reason,
            evidence_urls: Array.isArray(body?.evidence_urls) ? body.evidence_urls : undefined,
            user_statement: description || reason,
        });

        if (!result.success) {
            const errorText = String(result.error || 'dispute_failed');
            const status = /not found/i.test(errorText)
                ? 404
                : /already opened|cannot dispute/i.test(errorText)
                    ? 409
                    : 400;
            res.status(status).json({
                success: false,
                error: errorText,
                trace_id: traceId,
            });
            return;
        }

        res.status(201).json({
            success: true,
            token_id: tokenId,
            status: result.token?.status,
            dispute_reason: result.token?.dispute_reason,
            trace_id: traceId,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
            trace_id: traceId,
        });
    }
}

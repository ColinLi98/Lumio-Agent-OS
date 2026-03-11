import type { VercelRequest, VercelResponse } from '@vercel/node';
import { settlementService } from '../../services/settlementService.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lix-Token, X-LIX-Trace-ID');
}

function generateTraceId(): string {
    return `tid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        const result = settlementService.processExpiredTokens();
        res.status(200).json({
            success: true,
            processed: result.processed,
            tokens: result.tokens,
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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCapsuleApprovalStore } from '../../services/policy-engine/capsuleApprovalStore.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function resolveToken(req: VercelRequest): string {
    const bodyToken = String(req.body?.token || req.body?.capsule_approval_token || '').trim();
    if (bodyToken) return bodyToken;
    const queryToken = String((req.query as Record<string, unknown> | undefined)?.token || '').trim();
    return queryToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const store = getCapsuleApprovalStore();

    if (req.method === 'GET') {
        const token = resolveToken(req);
        if (!token) {
            res.status(400).json({ success: false, error: 'Missing token' });
            return;
        }
        const record = store.get(token);
        if (!record) {
            res.status(404).json({ success: false, error: 'capsule_approval_token_not_found' });
            return;
        }
        res.status(200).json({
            success: true,
            token: record.token,
            status: record.status,
            reason: record.reason,
            policy_decision_id: record.policy_decision_id,
            expires_at: record.expires_at,
            updated_at: record.updated_at,
        });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    const token = resolveToken(req);
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    if (!token || !decision) {
        res.status(400).json({
            success: false,
            error: 'Missing required fields: token, decision',
        });
        return;
    }

    try {
        const record = store.decide({
            token,
            decision: decision as 'approve' | 'reject',
        });
        res.status(200).json({
            success: true,
            token: record.token,
            status: record.status,
            reason: record.reason,
            policy_decision_id: record.policy_decision_id,
            expires_at: record.expires_at,
            updated_at: record.updated_at,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'capsule_approval_update_failed',
        });
    }
}

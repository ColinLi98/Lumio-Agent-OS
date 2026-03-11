import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPolicyEngineMetadata } from '../../services/policy-engine/evaluator.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    const metadata = getPolicyEngineMetadata();
    res.status(200).json({
        success: true,
        policy_version: metadata.version,
        policy_fingerprint: metadata.fingerprint,
    });
}


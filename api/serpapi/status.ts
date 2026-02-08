import type { VercelRequest, VercelResponse } from '@vercel/node';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function resolveServerKeySource(): 'SERPAPI_API_KEY' | 'SERPAPI_KEY' | 'none' {
    if (typeof process !== 'undefined' && process.env?.SERPAPI_API_KEY) return 'SERPAPI_API_KEY';
    if (typeof process !== 'undefined' && process.env?.SERPAPI_KEY) return 'SERPAPI_KEY';
    return 'none';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    const source = resolveServerKeySource();
    res.status(200).json({
        success: true,
        configured: source !== 'none',
        source,
    });
}

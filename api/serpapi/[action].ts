import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeSerpApiWithKey, getServerSerpApiKey } from '../../services/serpApiClient';
import type { SerpApiExecuteRequest, SerpApiEngine } from '../../services/serpApiTypes';

const ALLOWED_ENGINES: SerpApiEngine[] = [
    'google_maps',
    'google_local',
    'google_maps_reviews',
    'google_shopping',
    'google_flights',
    'google_hotels',
];

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isAllowedEngine(engine: string): engine is SerpApiEngine {
    return ALLOWED_ENGINES.includes(engine as SerpApiEngine);
}

function sanitizeRequest(body: any): SerpApiExecuteRequest | null {
    if (!body || typeof body !== 'object') return null;
    const engine = String(body.engine || '').trim();
    if (!engine || !isAllowedEngine(engine)) return null;

    const rawParams = body.params && typeof body.params === 'object' ? body.params : {};
    const params: Record<string, string | number | boolean> = {};
    Object.entries(rawParams).forEach(([key, value]) => {
        if (!key) return;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            params[key] = value;
        }
    });

    return {
        engine,
        params,
        locale: typeof body.locale === 'string' ? body.locale : undefined,
        domain: body.domain,
        freshness_policy: body.freshness_policy === 'force_live' ? 'force_live' : 'cache_ok',
    };
}

function resolveServerKeySource(): 'SERPAPI_API_KEY' | 'SERPAPI_KEY' | 'default' | 'none' {
    if (typeof process !== 'undefined' && process.env?.SERPAPI_API_KEY) return 'SERPAPI_API_KEY';
    if (typeof process !== 'undefined' && process.env?.SERPAPI_KEY) return 'SERPAPI_KEY';
    return 'default';
}

function firstQueryParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return String(value[0] || '');
    return String(value || '');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const action = firstQueryParam(req.query?.action).trim();

    if (action === 'status') {
        return handleStatus(req, res);
    }
    if (action === 'execute') {
        return handleExecute(req, res);
    }
    res.status(404).json({ success: false, error: `Unknown serpapi action: ${action}` });
}

async function handleStatus(_req: VercelRequest, res: VercelResponse): Promise<void> {
    const source = resolveServerKeySource();
    res.status(200).json({
        success: true,
        configured: source !== 'none',
        source,
    });
}

async function handleExecute(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: { code: 'invalid_request', message: 'Method not allowed', retryable: false } });
        return;
    }

    const request = sanitizeRequest(req.body);
    if (!request) {
        res.status(400).json({
            success: false,
            error: { code: 'invalid_request', message: 'Invalid request body. engine and params are required.', retryable: false },
        });
        return;
    }

    const key = getServerSerpApiKey();
    const result = await executeSerpApiWithKey(request, key);

    if (result.success) { res.status(200).json(result); return; }
    const code = result.error?.code || 'internal_error';
    if (code === 'invalid_request') { res.status(400).json(result); return; }
    if (code === 'auth') { res.status(401).json(result); return; }
    if (code === 'quota') { res.status(429).json(result); return; }
    if (code === 'no_results') { res.status(200).json(result); return; }
    res.status(502).json(result);
}

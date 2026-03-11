import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAgentTrendPoints, type TrendWindow } from '../../services/agentHotnessService.js';
import { marketAnalyticsStore } from '../../services/marketAnalyticsStore.js';
import type { AgentDomain } from '../../services/agentMarketplaceTypes.js';

const VALID_WINDOWS: TrendWindow[] = ['7d', '30d', '90d'];
const VALID_DOMAINS: AgentDomain[] = [
    'recruitment',
    'travel',
    'finance',
    'health',
    'legal',
    'education',
    'shopping',
    'productivity',
    'local_service',
    'general',
];

function firstQueryParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return String(value[0] || '');
    return String(value || '');
}

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function trendsHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const agentId = firstQueryParam(req.query?.agent_id).trim();
        if (!agentId) {
            res.status(400).json({ success: false, error: 'Missing required query param: agent_id' });
            return;
        }
        const windowRaw = firstQueryParam(req.query?.window).trim() as TrendWindow;
        const domainRaw = firstQueryParam(req.query?.domain).trim() as AgentDomain;
        const window = VALID_WINDOWS.includes(windowRaw) ? windowRaw : '30d';
        const domain = VALID_DOMAINS.includes(domainRaw) ? domainRaw : undefined;
        const points = await getAgentTrendPoints(agentId, window, domain);
        const status = marketAnalyticsStore.getStatus();
        res.status(200).json({
            success: true,
            agent_id: agentId,
            window,
            domain: domain || 'all',
            daily_points: points,
            storage_mode: status.storage_mode,
            storage_backend: status.backend,
            storage_error: status.error,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
            storage_mode: marketAnalyticsStore.getStatus().storage_mode,
        });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildLeaderboard, type LeaderboardSort, type LeaderboardWindow } from '../../services/agentHotnessService.js';
import { marketAnalyticsStore } from '../../services/marketAnalyticsStore.js';
import type { AgentDomain } from '../../services/agentMarketplaceTypes.js';

const VALID_WINDOWS: LeaderboardWindow[] = ['7d', '30d'];
const VALID_SORTS: LeaderboardSort[] = ['commercial', 'quality', 'growth'];
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

export default async function leaderboardHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
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
        const windowRaw = firstQueryParam(req.query?.window).trim() as LeaderboardWindow;
        const sortRaw = firstQueryParam(req.query?.sort).trim() as LeaderboardSort;
        const domainRaw = firstQueryParam(req.query?.domain).trim() as AgentDomain;
        const limitRaw = Number(firstQueryParam(req.query?.limit));
        const window = VALID_WINDOWS.includes(windowRaw) ? windowRaw : '7d';
        const sort = VALID_SORTS.includes(sortRaw) ? sortRaw : 'commercial';
        const domain = VALID_DOMAINS.includes(domainRaw) ? domainRaw : undefined;
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.floor(limitRaw)) : 20;
        const leaderboard = await buildLeaderboard({ window, sort, domain, limit });
        const status = marketAnalyticsStore.getStatus();
        res.status(200).json({
            success: true,
            window,
            sort,
            domain: domain || 'all',
            rankings: leaderboard.rankings,
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

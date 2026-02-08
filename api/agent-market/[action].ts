/**
 * Agent Marketplace dynamic API route
 *
 * POST /api/agent-market/discover
 * POST /api/agent-market/execute
 * POST /api/agent-market/manual-execute
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, randomUUID } from 'crypto';
import { ensureMarketplaceCatalogReady, detectDomain, resetAgentMarketplace } from '../../services/agentMarketplaceService';
import { getToolRegistry } from '../../services/toolRegistry';
import { getSkillRegistry } from '../../services/skillRegistry';
import { executeSpecializedAgent } from '../../services/specializedAgents';
import { buildFlightActionLinks, parseFlightConstraints } from '../../services/flightConstraintParser';
import { lixAgentRegistryService } from '../../services/lixAgentRegistryService';
import { marketAnalyticsStore } from '../../services/marketAnalyticsStore';
import { buildLeaderboard, getAgentTrendPoints, type LeaderboardSort, type LeaderboardWindow, type TrendWindow } from '../../services/agentHotnessService';
import type { SpecializedAgentType } from '../../types';
import type { AgentDescriptor, AgentDomain, DigitalTwinContext, DiscoveryQuery, DiscoveryResponse } from '../../services/agentMarketplaceTypes';

const IS_DEBUG = process.env.NODE_ENV !== 'production';

function sanitizeForProduction(response: DiscoveryResponse) {
    return {
        trace_id: response.trace_id,
        candidates: response.candidates.map((c) => ({
            agent_id: c.agent.id,
            agent_name: c.agent.name,
            source: c.agent.source,
            metrics_source: c.agent.metrics_source || 'unknown',
            metrics_sample_size: c.agent.metrics_sample_size,
            fit_score: c.fit_score,
            reliability_score: c.reliability_score,
            reliability_known: c.reliability_known,
            freshness_score: c.freshness_score,
            latency_score: c.latency_score,
            latency_known: c.latency_known,
            cost_score: c.cost_score,
            twin_boost: c.twin_boost ?? 0,
            total_score: c.total_score,
        })),
        rejected: response.rejected.map((r) => ({
            agent_id: r.agent.id,
            agent_name: r.agent.name,
            source: r.agent.source,
            metrics_source: r.agent.metrics_source || 'unknown',
            metrics_sample_size: r.agent.metrics_sample_size,
            reject_reason: r.reject_reason,
            total_score: r.total_score,
        })),
        score_breakdown: response.score_breakdown,
    };
}

interface ProxyRequestBody {
    target_url: string;
    payload?: any;
    method?: 'POST';
    headers?: Record<string, string>;
    timeout_ms?: number;
    retries?: number;
}

interface ManualExecuteBody {
    query: string;
    selected_agent_ids: string[];
    domain_hint?: AgentDomain;
    digital_twin_context?: DigitalTwinContext;
    locale?: string;
    max_parallel?: number;
}

interface ManualExecutionRow {
    agent_id: string;
    agent_name: string;
    source: AgentDescriptor['source'];
    success: boolean;
    latency_ms: number;
    summary: string;
    error?: string;
    evidence_count?: number;
    data?: any;
}

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 1;
const MAX_RETRIES = 3;
const DEFAULT_MANUAL_AGENT_TIMEOUT_MS = 10_000;

function parseIntWithDefault(input: unknown, fallback: number): number {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.floor(parsed);
}

function getTimeoutMs(bodyTimeout: unknown): number {
    const envTimeout = parseIntWithDefault(process.env.AGENT_MARKET_PROXY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
    const requested = parseIntWithDefault(bodyTimeout, envTimeout);
    return Math.max(500, Math.min(60_000, requested));
}

function getRetryCount(bodyRetries: unknown): number {
    const envRetries = parseIntWithDefault(process.env.AGENT_MARKET_PROXY_RETRIES, DEFAULT_RETRIES);
    const requested = parseIntWithDefault(bodyRetries, envRetries);
    return Math.max(0, Math.min(MAX_RETRIES, requested));
}

function getManualAgentTimeoutMs(): number {
    const configured = parseIntWithDefault(process.env.AGENT_MARKET_MANUAL_AGENT_TIMEOUT_MS, DEFAULT_MANUAL_AGENT_TIMEOUT_MS);
    return Math.max(1_000, Math.min(120_000, configured));
}

function getAllowlistHosts(): string[] {
    const raw = (process.env.AGENT_MARKET_PROXY_ALLOWLIST || '').trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean);
}

function isHostAllowed(targetUrl: string): boolean {
    const allowlist = getAllowlistHosts();
    if (allowlist.length === 0) return true;

    let host = '';
    try {
        host = new URL(targetUrl).hostname.toLowerCase();
    } catch {
        return false;
    }

    return allowlist.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

function checkProxyToken(req: VercelRequest): boolean {
    const expected = (process.env.AGENT_MARKET_PROXY_TOKEN || '').trim();
    if (!expected) return true;
    const incoming = String(req.headers['x-agent-market-token'] || '').trim();
    return incoming === expected;
}

function buildUpstreamHeaders(
    body: ProxyRequestBody,
    rawPayload: string
): Record<string, string> {
    const headers: Record<string, string> = {
        'content-type': 'application/json',
        'x-agent-market-proxy': '1',
    };

    if (body.headers && typeof body.headers === 'object') {
        for (const [k, v] of Object.entries(body.headers)) {
            if (!k || typeof v !== 'string') continue;
            const lower = k.toLowerCase();
            if (lower === 'host' || lower === 'content-length') continue;
            headers[k] = v;
        }
    }

    const signingSecret = (process.env.AGENT_MARKET_PROXY_SIGNING_SECRET || '').trim();
    if (signingSecret) {
        const ts = Date.now().toString();
        const nonce = randomUUID();
        const digest = createHmac('sha256', signingSecret)
            .update(`${ts}.${nonce}.${rawPayload}`)
            .digest('hex');
        headers['x-agent-market-ts'] = ts;
        headers['x-agent-market-nonce'] = nonce;
        headers['x-agent-market-signature'] = digest;
    }

    return headers;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function canRetryStatus(status: number): boolean {
    return status === 408 || status === 425 || status === 429 || status >= 500;
}

function normalizeParallelCount(input: unknown): number {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return 3;
    return Math.max(1, Math.min(6, Math.floor(parsed)));
}

function sanitizeTwinContext(input: unknown): DigitalTwinContext | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const raw = input as any;
    const userId = String(raw.user_id || '').trim();
    if (!userId) return undefined;

    const preferredDomains = Array.isArray(raw?.preferences?.preferred_domains)
        ? raw.preferences.preferred_domains.map((v: unknown) => String(v || '').trim()).filter(Boolean)
        : [];
    const preferredTools = Array.isArray(raw?.preferences?.preferred_tools)
        ? raw.preferences.preferred_tools.map((v: unknown) => String(v || '').trim()).filter(Boolean)
        : [];

    return {
        user_id: userId,
        profile_completeness: Number.isFinite(raw.profile_completeness) ? Number(raw.profile_completeness) : 0,
        privacy_mode: raw.privacy_mode === true,
        preferences: {
            price_vs_quality: Number.isFinite(raw?.preferences?.price_vs_quality) ? Number(raw.preferences.price_vs_quality) : 0,
            risk_tolerance: Number.isFinite(raw?.preferences?.risk_tolerance) ? Number(raw.preferences.risk_tolerance) : 50,
            preferred_evidence_level: ['none', 'weak', 'strong', 'adaptive'].includes(String(raw?.preferences?.preferred_evidence_level))
                ? raw.preferences.preferred_evidence_level
                : 'adaptive',
            preferred_latency: ['fast', 'balanced', 'quality'].includes(String(raw?.preferences?.preferred_latency))
                ? raw.preferences.preferred_latency
                : 'balanced',
            preferred_domains: preferredDomains as AgentDomain[],
            preferred_tools: preferredTools,
        },
    };
}

function resolveExternalAgentEndpoint(executeRef: string): string | null {
    if (!executeRef || typeof executeRef !== 'string') return null;
    const trimmed = executeRef.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const base = (process.env.AGENT_MARKET_EXECUTOR_BASE || '').trim();
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
}

function summarizeExecutionData(data: any): string {
    if (!data) return '无返回数据';
    if (typeof data === 'string') return data.slice(0, 180);
    if (typeof data.personalizedNote === 'string' && data.personalizedNote.trim()) return data.personalizedNote.slice(0, 180);
    if (typeof data.answer === 'string' && data.answer.trim()) return data.answer.slice(0, 180);
    if (Array.isArray(data?.data?.flights)) return `返回 ${data.data.flights.length} 个航班结果`;
    if (Array.isArray(data?.flights)) return `返回 ${data.flights.length} 个航班结果`;
    if (Array.isArray(data?.data?.hotels)) return `返回 ${data.data.hotels.length} 家酒店`;
    if (Array.isArray(data?.data?.forecast)) return `返回 ${data.data.forecast.length} 天天气预报`;
    if (Array.isArray(data?.local_results)) return `返回 ${data.local_results.length} 条本地服务结果`;
    if (Array.isArray(data?.shopping_results)) return `返回 ${data.shopping_results.length} 条商品报价`;
    if (Array.isArray(data?.data?.recommendations)) return `返回 ${data.data.recommendations.length} 条推荐`;
    if (Array.isArray(data?.recommendations)) return `返回 ${data.recommendations.length} 条推荐`;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message.slice(0, 180);
    return '任务执行完成';
}

function estimateEvidenceCount(data: any): number {
    if (Array.isArray(data?.evidence?.items)) return data.evidence.items.length;
    if (Array.isArray(data?.evidence)) return data.evidence.length;
    if (Array.isArray(data?.sources)) return data.sources.length;
    if (Array.isArray(data?.local_results)) return data.local_results.length;
    if (Array.isArray(data?.shopping_results)) return data.shopping_results.length;
    return 0;
}

function isUsableManualData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data?.evidence?.items) && data.evidence.items.length > 0) return true;
    if (Array.isArray(data?.sources) && data.sources.length > 0) return true;
    if (Array.isArray(data?.results) && data.results.length > 0) return true;
    if (Array.isArray(data?.action_links) && data.action_links.length > 0) return true;
    if (Array.isArray(data?.quote_cards) && data.quote_cards.length > 0) return true;
    if (Array.isArray(data?.normalized_quotes) && data.normalized_quotes.length > 0) return true;
    if (Array.isArray(data?.local_results) && data.local_results.length > 0) return true;
    if (Array.isArray(data?.shopping_results) && data.shopping_results.length > 0) return true;
    if (Array.isArray(data?.fallback?.cta_buttons) && data.fallback.cta_buttons.length > 0) return true;
    if (Array.isArray(data?.steps) && data.steps.length > 0) return true;
    if (Array.isArray(data?.data?.comparisonLinks) && data.data.comparisonLinks.length > 0) return true;
    if (data?.data?.comparisonLinks && typeof data.data.comparisonLinks === 'object' && Object.keys(data.data.comparisonLinks).length > 0) return true;
    if (typeof data?.answer === 'string' && data.answer.trim()) return true;
    if (typeof data?.summary === 'string' && data.summary.trim()) return true;
    if (typeof data?.instruction === 'string' && data.instruction.trim()) return true;
    return false;
}

function isSafePublicUrl(url?: string): boolean {
    if (!url || !/^https?:\/\//i.test(url)) return false;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (host.includes('serpapi.com')) return false;
        if (path.includes('/search.json')) return false;
        if (parsed.searchParams.has('api_key')) return false;
        return true;
    } catch {
        return false;
    }
}

function dedupeActionLinks(
    links: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }>
): Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }> {
    const map = new Map<string, { title: string; url: string; provider: string; supports_time_filter: boolean }>();
    for (const link of links) {
        if (!isSafePublicUrl(link.url)) continue;
        if (!map.has(link.url)) map.set(link.url, link);
    }
    return Array.from(map.values()).slice(0, 8);
}

function normalizeAnyLinks(rawLinks: any[]): Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }> {
    return rawLinks
        .map((raw) => {
            const url = String(raw?.url || raw?.href || '').trim();
            if (!url) return null;
            return {
                title: String(raw?.title || raw?.name || raw?.provider || '查看详情'),
                url,
                provider: String(raw?.provider || 'external'),
                supports_time_filter: raw?.supports_time_filter === true,
            };
        })
        .filter((item): item is { title: string; url: string; provider: string; supports_time_filter: boolean } => Boolean(item));
}

function buildFallbackActionLinks(
    agent: AgentDescriptor,
    query: string,
    domain: AgentDomain,
    data: any
): Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }> {
    const links: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }> = [];
    const encodedQuery = encodeURIComponent(query);

    if (agent.id.includes('flight_booking') || agent.capabilities.includes('flight_search')) {
        const parsed = parseFlightConstraints(query);
        const flightLinks = buildFlightActionLinks(parsed);
        flightLinks.forEach((link) => {
            links.push({
                title: link.title || '航班比价入口',
                url: String(link.url || ''),
                provider: 'flight_compare',
                supports_time_filter: true,
            });
        });
    }

    if (agent.id.includes('hotel_booking') || agent.capabilities.includes('hotel_search')) {
        links.push({
            title: '酒店查询',
            url: `https://www.google.com/travel/hotels?q=${encodedQuery}`,
            provider: 'google_hotels',
            supports_time_filter: false,
        });
    }

    if (agent.id.includes('weather') || agent.capabilities.includes('weather_query')) {
        const location = String(data?.data?.locationCN || data?.data?.location || '').trim();
        const weatherQuery = location ? `${location} 天气` : query;
        links.push({
            title: '天气详情',
            url: `https://www.google.com/search?q=${encodeURIComponent(weatherQuery)}`,
            provider: 'google_weather',
            supports_time_filter: false,
        });
    }

    if (domain === 'local_service' || agent.capabilities.includes('local_search')) {
        links.push({
            title: '地图搜索',
            url: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
            provider: 'google_maps',
            supports_time_filter: false,
        });
    }

    if (domain === 'shopping' || agent.capabilities.includes('shopping_search') || agent.capabilities.includes('price_compare')) {
        links.push({
            title: '商品检索',
            url: `https://www.google.com/search?q=${encodedQuery}`,
            provider: 'google_shopping',
            supports_time_filter: false,
        });
    }

    if (links.length === 0) {
        links.push({
            title: '查看来源',
            url: `https://www.google.com/search?q=${encodedQuery}`,
            provider: 'google_search',
            supports_time_filter: false,
        });
    }

    return links;
}

function ensureClickableActionLinks(
    agent: AgentDescriptor,
    query: string,
    domain: AgentDomain,
    data: any
): any {
    if (!data || typeof data !== 'object') return data;

    const rootLinks = Array.isArray(data.action_links) ? data.action_links : [];
    const nestedLinks = Array.isArray(data?.data?.action_links) ? data.data.action_links : [];
    const comparisonLinks = Array.isArray(data?.data?.comparisonLinks)
        ? data.data.comparisonLinks
        : (data?.data?.comparisonLinks && typeof data.data.comparisonLinks === 'object'
            ? Object.values(data.data.comparisonLinks)
            : []);
    const rawLinks = [...rootLinks, ...nestedLinks, ...comparisonLinks];
    const normalized = dedupeActionLinks(normalizeAnyLinks(rawLinks));
    const ensuredLinks = normalized.length > 0
        ? normalized
        : dedupeActionLinks(buildFallbackActionLinks(agent, query, domain, data));

    const nextData = { ...data, action_links: ensuredLinks };
    if (nextData.data && typeof nextData.data === 'object' && !Array.isArray(nextData.data)) {
        nextData.data = { ...nextData.data, action_links: ensuredLinks };
    }
    return normalizeLocalResultsForMarketplace(nextData, query);
}

function normalizeSpecializedLocationToken(value?: string): string | undefined {
    if (!value) return undefined;
    const cleaned = String(value)
        .replace(/^(搜索|查询|查下|查一下|帮我找|帮我查|帮我|请|我要|想要)\s*/g, '')
        .replace(/的(?:接送机|交通(?:方案)?|天气|行程(?:安排)?|景点|餐厅|咖啡店|酒店|住宿).*$/g, '')
        .replace(/(?:机票|航班|飞机票|酒店|住宿|接送机|交通(?:方案)?|天气|行程(?:安排)?|景点|餐厅|咖啡店|攻略|推荐)$/g, '')
        .trim();
    return cleaned || undefined;
}

function inferRouteFromQuery(query: string): { origin?: string; destination?: string } {
    const routeMatch = query.match(/(?:从)?\s*([^，。,.\s]+)\s*(?:到|->|→)\s*([^，。,.\s]+)/);
    if (!routeMatch) return {};
    const origin = normalizeSpecializedLocationToken(String(routeMatch[1] || ''));
    const destination = normalizeSpecializedLocationToken(String(routeMatch[2] || ''));
    if (!origin || !destination || origin === destination) return {};
    return { origin, destination };
}

const DESTINATION_CITY_HINTS = [
    '上海', '北京', '广州', '深圳', '杭州', '成都', '重庆', '南京', '苏州',
    '武汉', '西安', '天津', '厦门', '长沙', '郑州', '青岛', '宁波', '无锡'
];
const DESTINATION_AREA_HINTS = [
    '外滩', '陆家嘴', '静安寺', '徐家汇', '人民广场', '淮海路', '虹桥', '浦东',
    '中山路', '观前街', '太古里', '天河', '春熙路'
];

function inferDestinationFromQuery(query: string): string | undefined {
    const trimmed = String(query || '').trim();
    if (!trimmed) return undefined;

    const inferredRoute = inferRouteFromQuery(trimmed);
    if (inferredRoute.destination) return inferredRoute.destination;

    for (const city of DESTINATION_CITY_HINTS) {
        if (!trimmed.includes(city)) continue;
        const area = DESTINATION_AREA_HINTS.find((candidate) => trimmed.includes(candidate));
        if (area) return normalizeSpecializedLocationToken(`${city}${area}`);
        return normalizeSpecializedLocationToken(city);
    }

    const areaOnly = DESTINATION_AREA_HINTS.find((candidate) => trimmed.includes(candidate));
    if (areaOnly) return normalizeSpecializedLocationToken(areaOnly);

    const looseMatch = trimmed.match(/(?:在|去|到|找|查|搜)\s*([^，。,.\s]{2,20})(?:附近|周边|一带)?/);
    if (looseMatch?.[1]) {
        return normalizeSpecializedLocationToken(looseMatch[1]);
    }
    return undefined;
}

const CITY_ALIAS_MAP: Record<string, string[]> = {
    上海: ['上海', 'shanghai'],
    北京: ['北京', 'beijing'],
    广州: ['广州', 'guangzhou'],
    深圳: ['深圳', 'shenzhen'],
    杭州: ['杭州', 'hangzhou'],
    成都: ['成都', 'chengdu'],
    重庆: ['重庆', 'chongqing'],
    南京: ['南京', 'nanjing'],
    苏州: ['苏州', 'suzhou'],
    武汉: ['武汉', 'wuhan'],
    西安: ['西安', 'xian', "xi'an"],
    天津: ['天津', 'tianjin'],
    厦门: ['厦门', 'xiamen'],
    青岛: ['青岛', 'qingdao'],
};

const OVERSEAS_GEO_TOKENS = [
    'indonesia', 'jakarta', 'japan', 'tokyo', 'singapore', 'thailand', 'bangkok',
    'malaysia', 'kuala lumpur', 'united kingdom', 'london', 'usa', 'new york', 'seoul', 'jaksel',
];

function inferPrimaryCityFromQuery(query: string): string | undefined {
    const normalized = String(query || '').toLowerCase();
    for (const [city, aliases] of Object.entries(CITY_ALIAS_MAP)) {
        if (aliases.some((token) => normalized.includes(token.toLowerCase()))) {
            return city;
        }
    }
    return undefined;
}

function buildLocalizedLocalMapUrl(item: any, query: string): string {
    const locationHint = inferDestinationFromQuery(query);
    const queryText = [item?.name, item?.address, locationHint]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ');
    const fallbackQuery = queryText || String(query || '').trim() || '附近服务';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
}

function isGeoConsistentLocalResult(item: any, query: string): boolean {
    const itemText = `${String(item?.name || '')} ${String(item?.address || '')}`.toLowerCase();
    const primaryCity = inferPrimaryCityFromQuery(query);
    if (!primaryCity) return true;

    const primaryAliases = CITY_ALIAS_MAP[primaryCity] || [primaryCity];
    if (primaryAliases.some((alias) => itemText.includes(alias.toLowerCase()))) return true;

    const hasOtherCity = Object.entries(CITY_ALIAS_MAP)
        .filter(([city]) => city !== primaryCity)
        .some(([, aliases]) => aliases.some((alias) => itemText.includes(alias.toLowerCase())));
    if (hasOtherCity) return false;

    if (OVERSEAS_GEO_TOKENS.some((token) => itemText.includes(token))) return false;
    return true;
}

function normalizeLocalResultsForMarketplace(data: any, query: string): any {
    if (!data || typeof data !== 'object') return data;

    const rootLocal = Array.isArray(data?.local_results) ? data.local_results : [];
    const normalizedLocal = Array.isArray(data?.normalized?.local_results) ? data.normalized.local_results : [];
    if (rootLocal.length === 0 && normalizedLocal.length === 0) return data;

    const normalizeList = (items: any[]) => {
        const hasCityHint = Boolean(inferPrimaryCityFromQuery(query));
        const filtered = items
            .filter((item) => item && typeof item === 'object')
            .filter((item) => isGeoConsistentLocalResult(item, query))
            .map((item) => {
                const safeMapUrl = isSafePublicUrl(String(item?.map_url || ''))
                    ? String(item.map_url)
                    : undefined;
                const safeWebsite = isSafePublicUrl(String(item?.website || ''))
                    ? String(item.website)
                    : undefined;
                const localizedMapUrl = buildLocalizedLocalMapUrl(item, query);
                return {
                    ...item,
                    map_url: hasCityHint ? localizedMapUrl : (safeMapUrl || localizedMapUrl),
                    website: safeWebsite,
                };
            });

        const deduped = new Map<string, any>();
        for (const item of filtered) {
            const key = `${String(item?.name || '')}::${String(item?.address || '')}`;
            if (!deduped.has(key)) deduped.set(key, item);
        }
        return Array.from(deduped.values()).slice(0, 12);
    };

    const merged = normalizeList([...rootLocal, ...normalizedLocal]);
    const localLinks = merged
        .map((item) => ({
            title: `${String(item?.name || '商家')} 导航`,
            url: String(item?.map_url || ''),
            provider: 'google_maps',
            supports_time_filter: false,
        }))
        .filter((item) => isSafePublicUrl(item.url))
        .slice(0, 8);

    const nextData = { ...data };
    nextData.local_results = merged;
    nextData.action_links = dedupeActionLinks([
        ...normalizeAnyLinks(Array.isArray(nextData.action_links) ? nextData.action_links : []),
        ...localLinks,
    ]);

    if (nextData.normalized && typeof nextData.normalized === 'object') {
        nextData.normalized = {
            ...nextData.normalized,
            local_results: merged,
            links: dedupeActionLinks([
                ...normalizeAnyLinks(Array.isArray(nextData.normalized?.links) ? nextData.normalized.links : []),
                ...localLinks,
            ]),
        };
    }

    return nextData;
}

function buildSpecializedTaskParams(
    agentType: SpecializedAgentType,
    query: string,
    digitalTwinContext?: DigitalTwinContext
): Record<string, any> {
    const parsed = parseFlightConstraints(query);
    const inferredRoute = inferRouteFromQuery(query);
    const parsedOrigin = normalizeSpecializedLocationToken(parsed.origin);
    const parsedDestination = normalizeSpecializedLocationToken(parsed.destination);
    const inferredOrigin = normalizeSpecializedLocationToken(inferredRoute.origin);
    const inferredDestination = normalizeSpecializedLocationToken(inferredRoute.destination) || inferDestinationFromQuery(query);
    const twinHints = digitalTwinContext
        ? {
            user_id: digitalTwinContext.user_id,
            twin_preferences: {
                price_vs_quality: digitalTwinContext.preferences.price_vs_quality,
                risk_tolerance: digitalTwinContext.preferences.risk_tolerance,
                preferred_latency: digitalTwinContext.preferences.preferred_latency,
                preferred_evidence_level: digitalTwinContext.preferences.preferred_evidence_level,
            },
        }
        : {};

    if (agentType === 'flight_booking') {
        return {
            query,
            origin: parsedOrigin || inferredOrigin,
            destination: parsedDestination || inferredDestination,
            departureDate: parsed.departureDate,
            class: parsed.travelClass,
            departureTimePreference: parsed.departureTimePreference,
            timePriorityMode: parsed.timePriorityMode,
            passengers: parsed.passengers,
            ...twinHints,
        };
    }

    if (agentType === 'hotel_booking') {
        return {
            query,
            destination: parsedDestination || inferredDestination,
            checkInDate: parsed.departureDate,
            ...twinHints,
        };
    }

    if (
        agentType === 'restaurant'
        || agentType === 'attraction'
        || agentType === 'weather'
        || agentType === 'itinerary'
    ) {
        return {
            query,
            destination: parsedDestination || inferredDestination,
            ...twinHints,
        };
    }

    if (agentType === 'transportation') {
        return {
            query,
            origin: parsedOrigin || inferredOrigin,
            destination: parsedDestination || inferredDestination,
            ...twinHints,
        };
    }

    return { query, ...twinHints };
}

async function callExternalAgent(
    targetUrl: string,
    payload: any,
    timeoutMs: number,
    retries: number
): Promise<any> {
    if (!isHostAllowed(targetUrl)) {
        throw new Error('target_url host is not allowed by proxy policy');
    }

    const rawPayload = JSON.stringify(payload ?? {});
    const headers = buildUpstreamHeaders({ target_url: targetUrl }, rawPayload);
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const upstream = await fetch(targetUrl, {
                method: 'POST',
                headers,
                body: rawPayload,
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const text = await upstream.text();
            const parsed = text ? (() => {
                try {
                    return JSON.parse(text);
                } catch {
                    return { raw: text };
                }
            })() : {};

            if (upstream.ok || attempt === retries || !canRetryStatus(upstream.status)) {
                if (!upstream.ok) {
                    throw new Error(`external_agent_http_${upstream.status}`);
                }
                return parsed;
            }

            lastError = `upstream_status_${upstream.status}`;
            await sleep(250 * Math.pow(2, attempt));
        } catch (error) {
            clearTimeout(timeout);
            lastError = error instanceof Error ? error.message : String(error);
            if (attempt === retries) break;
            await sleep(250 * Math.pow(2, attempt));
        }
    }

    throw new Error(lastError || 'upstream_request_failed');
}

function extractAction(req: VercelRequest): string {
    const queryAction = req.query?.action;
    if (typeof queryAction === 'string' && queryAction.trim()) {
        return queryAction.trim().toLowerCase();
    }
    if (Array.isArray(queryAction) && queryAction.length > 0 && String(queryAction[0] || '').trim()) {
        return String(queryAction[0]).trim().toLowerCase();
    }

    const rawUrl = String(req.url || '');
    if (!rawUrl) return '';

    try {
        const pathname = new URL(rawUrl, 'http://localhost').pathname;
        return String(pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    } catch {
        return '';
    }
}

export async function handleAgentMarketDiscover(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body as Partial<DiscoveryQuery>;
        if (!body.query) {
            return res.status(400).json({ error: 'Missing required field: query' });
        }

        const query: DiscoveryQuery = {
            query: body.query,
            locale: body.locale,
            domain_hint: body.domain_hint,
            required_capabilities: body.required_capabilities ?? [],
            digital_twin_context: sanitizeTwinContext((body as any).digital_twin_context),
            require_realtime: body.require_realtime,
            require_evidence: body.require_evidence,
            max_candidates: body.max_candidates,
        };

        const marketplace = await ensureMarketplaceCatalogReady(true);
        const response: DiscoveryResponse = marketplace.discoverAgents(query);

        return res.status(200).json(IS_DEBUG ? response : sanitizeForProduction(response));
    } catch (error) {
        console.error('[AgentMarketDiscoverAPI] Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function handleAgentMarketExecute(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkProxyToken(req)) {
        return res.status(401).json({ error: 'Unauthorized proxy token' });
    }

    const body = (req.body || {}) as Partial<ProxyRequestBody>;
    const targetUrl = typeof body.target_url === 'string' ? body.target_url.trim() : '';
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        return res.status(400).json({ error: 'target_url must be an absolute http(s) URL' });
    }

    if (!isHostAllowed(targetUrl)) {
        return res.status(403).json({ error: 'target_url host is not allowed by proxy policy' });
    }

    const timeoutMs = getTimeoutMs(body.timeout_ms);
    const retries = getRetryCount(body.retries);
    const method = 'POST';
    const rawPayload = JSON.stringify(body.payload ?? {});
    const headers = buildUpstreamHeaders(body as ProxyRequestBody, rawPayload);

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const upstream = await fetch(targetUrl, {
                method,
                headers,
                body: rawPayload,
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const text = await upstream.text();
            const contentType = upstream.headers.get('content-type') || '';

            if (upstream.ok || attempt === retries || !canRetryStatus(upstream.status)) {
                res.status(upstream.status);
                res.setHeader('x-agent-market-proxy-attempt', String(attempt + 1));
                if (contentType.toLowerCase().includes('application/json')) {
                    try {
                        return res.json(text ? JSON.parse(text) : {});
                    } catch {
                        return res.json({ success: false, raw: text });
                    }
                }
                return res.send(text);
            }

            lastError = `upstream_status_${upstream.status}`;
            await sleep(250 * Math.pow(2, attempt));
        } catch (error) {
            clearTimeout(timeout);
            lastError = error instanceof Error ? error.message : String(error);
            if (attempt === retries) break;
            await sleep(250 * Math.pow(2, attempt));
        }
    }

    return res.status(502).json({
        error: 'upstream_request_failed',
        detail: lastError || 'unknown_error',
    });
}

async function executeManualAgent(
    agent: AgentDescriptor,
    query: string,
    domain: AgentDomain,
    traceId: string,
    locale: string,
    digitalTwinContext?: DigitalTwinContext
): Promise<ManualExecutionRow> {
    const startedAt = Date.now();
    try {
        if (agent.source === 'tool_registry') {
            const toolRegistry = getToolRegistry();
            const tool = toolRegistry.getTool(agent.execute_ref);
            if (!tool) throw new Error(`tool_not_found:${agent.execute_ref}`);

            const args: Record<string, any> = { query };
            if (
                agent.capabilities.includes('live_search')
                || agent.capabilities.includes('flight_search')
                || agent.capabilities.includes('hotel_search')
                || agent.capabilities.includes('local_transport')
            ) {
                const mappedDomain =
                    domain === 'travel'
                        ? 'travel.flight'
                        : domain === 'shopping'
                            ? 'ecommerce'
                            : domain === 'local_service'
                                ? 'local_life'
                                : domain;
                args.intent_domain = mappedDomain;
                args.locale = locale;
            }
            if (agent.execute_ref === 'web_exec') {
                const parsed = parseFlightConstraints(query);
                const links = buildFlightActionLinks(parsed);
                args.task_description = query;
                args.target_url = links[0]?.url || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                args.step_budget = 8;
            }

            const rawData = await tool.execute(args);
            const data = ensureClickableActionLinks(agent, query, domain, rawData);
            const success = data?.success !== false || isUsableManualData(data);
            const summary = data?.success === false && success
                ? (typeof data?.instruction === 'string' && data.instruction.trim()
                    ? data.instruction.slice(0, 180)
                    : '已返回可用的降级信息')
                : summarizeExecutionData(data);
            return {
                agent_id: agent.id,
                agent_name: agent.name,
                source: agent.source,
                success,
                latency_ms: Date.now() - startedAt,
                summary,
                error: success ? undefined : String(data?.error?.message || data?.error || 'tool_execution_failed'),
                evidence_count: estimateEvidenceCount(data),
                data,
            };
        }

        if (agent.source === 'skill_registry') {
            const skillRegistry = getSkillRegistry();
            const skill = skillRegistry.getSkill(agent.execute_ref);
            if (!skill) throw new Error(`skill_not_found:${agent.execute_ref}`);

            const firstParam = skill.parameters.find(p => p.required)?.name || skill.parameters[0]?.name || 'query';
            const input: Record<string, any> = {
                [firstParam]: query,
                query,
            };
            const rawData = await skill.execute(input, {});
            const data = ensureClickableActionLinks(agent, query, domain, rawData);
            const success = data?.success !== false;
            return {
                agent_id: agent.id,
                agent_name: agent.name,
                source: agent.source,
                success,
                latency_ms: Date.now() - startedAt,
                summary: summarizeExecutionData(data),
                error: success ? undefined : String(data?.error || 'skill_execution_failed'),
                evidence_count: estimateEvidenceCount(data),
                data,
            };
        }

        if (agent.source === 'specialized') {
            const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
            const task = {
                id: `manual_${traceId}_${agent.id}`,
                agentType: agent.execute_ref as SpecializedAgentType,
                description: query,
                params: buildSpecializedTaskParams(agent.execute_ref as SpecializedAgentType, query, digitalTwinContext),
                appliedPreferences: [],
                status: 'pending' as const,
                priority: 1,
                canRunParallel: true,
            };
            const rawData = await executeSpecializedAgent(task as any, apiKey);
            const data = ensureClickableActionLinks(agent, query, domain, rawData);
            const specializedError = (data as any)?.error;
            const success = data?.success !== false || isUsableManualData(data);
            const summary = data?.success === false && success
                ? '已返回可用的降级信息'
                : summarizeExecutionData(data);
            return {
                agent_id: agent.id,
                agent_name: agent.name,
                source: agent.source,
                success,
                latency_ms: Date.now() - startedAt,
                summary,
                error: success ? undefined : String(specializedError || 'specialized_execution_failed'),
                evidence_count: estimateEvidenceCount(data),
                data,
            };
        }

        const endpoint = resolveExternalAgentEndpoint(agent.execute_ref);
        if (!endpoint) throw new Error(`external_endpoint_unresolved:${agent.execute_ref}`);

        const timeoutMs = getTimeoutMs(undefined);
        const retries = getRetryCount(undefined);
        const payload = {
            trace_id: traceId,
            agent_id: agent.id,
            execute_ref: agent.execute_ref,
            input: {
                query,
                domain,
                locale,
            },
        };
        const upstream = await callExternalAgent(endpoint, payload, timeoutMs, retries);
        const data = ensureClickableActionLinks(agent, query, domain, upstream?.data ?? upstream ?? {});
        const success = upstream?.success !== false;
        return {
            agent_id: agent.id,
            agent_name: agent.name,
            source: agent.source,
            success,
            latency_ms: Date.now() - startedAt,
            summary: summarizeExecutionData(data),
            error: success ? undefined : String(upstream?.error?.message || upstream?.error || 'external_execution_failed'),
            evidence_count: estimateEvidenceCount(data),
            data,
        };
    } catch (error) {
        return {
            agent_id: agent.id,
            agent_name: agent.name,
            source: agent.source,
            success: false,
            latency_ms: Date.now() - startedAt,
            summary: '执行失败',
            error: error instanceof Error ? error.message : String(error),
            evidence_count: 0,
        };
    }
}

async function executeManualAgentWithTimeout(
    agent: AgentDescriptor,
    query: string,
    domain: AgentDomain,
    traceId: string,
    locale: string,
    digitalTwinContext?: DigitalTwinContext
): Promise<ManualExecutionRow> {
    const timeoutMs = getManualAgentTimeoutMs();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            executeManualAgent(agent, query, domain, traceId, locale, digitalTwinContext),
            new Promise<ManualExecutionRow>((resolve) => {
                timer = setTimeout(() => {
                    resolve({
                        agent_id: agent.id,
                        agent_name: agent.name,
                        source: agent.source,
                        success: false,
                        latency_ms: Date.now() - startedAt,
                        summary: '执行超时',
                        error: `manual_agent_timeout_${timeoutMs}ms`,
                        evidence_count: 0,
                    });
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function handleAgentMarketManualExecute(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = (req.body || {}) as Partial<ManualExecuteBody>;
        const query = typeof body.query === 'string' ? body.query.trim() : '';
        const selectedAgentIds = Array.isArray(body.selected_agent_ids)
            ? body.selected_agent_ids.map(v => String(v).trim()).filter(Boolean)
            : [];

        if (!query) {
            return res.status(400).json({ error: 'Missing required field: query' });
        }
        if (selectedAgentIds.length === 0) {
            return res.status(400).json({ error: 'Missing required field: selected_agent_ids' });
        }

        const locale = typeof body.locale === 'string' && body.locale.trim() ? body.locale.trim() : 'zh-CN';
        const maxParallel = normalizeParallelCount(body.max_parallel);
        const digitalTwinContext = sanitizeTwinContext(body.digital_twin_context);
        const traceId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const marketplace = await ensureMarketplaceCatalogReady(true);
        const registeredAgents = marketplace.getRegisteredAgents();
        const domain = body.domain_hint || detectDomain(query);
        const selectedAgents = selectedAgentIds
            .map(id => registeredAgents.find(agent => agent.id === id))
            .filter((agent): agent is AgentDescriptor => Boolean(agent));

        if (selectedAgents.length === 0) {
            return res.status(404).json({ error: 'No selected agents were found in catalog' });
        }

        const deduped = Array.from(new Map(selectedAgents.map(agent => [agent.id, agent])).values());
        const results: ManualExecutionRow[] = [];

        for (let i = 0; i < deduped.length; i += maxParallel) {
            const batch = deduped.slice(i, i + maxParallel);
            const batchRows = await Promise.all(
                batch.map(agent => executeManualAgentWithTimeout(agent, query, domain, traceId, locale, digitalTwinContext))
            );
            results.push(...batchRows);
        }

        const usageEvents = results
            .map((row) => lixAgentRegistryService.recordAgentUsage(row.agent_id, {
                consumer_id: digitalTwinContext?.user_id,
                success: row.success,
            }))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

        const selectedById = new Map(deduped.map((agent) => [agent.id, agent]));
        const analyticsWrites = await Promise.all(
            results.map(async (row) => {
                const descriptor = selectedById.get(row.agent_id);
                const manifest = lixAgentRegistryService.getApprovedManifest(row.agent_id);
                if (descriptor) {
                    await marketAnalyticsStore.upsertAgentProfile({
                        agent_id: descriptor.id,
                        agent_name: descriptor.name,
                        owner_id: manifest?.owner_id || descriptor.owner_id,
                        domains: descriptor.domains,
                        market_visibility: manifest?.market_visibility || descriptor.market_visibility,
                        pricing_model: manifest?.pricing_model || descriptor.pricing_model,
                        price_per_use_cny: manifest?.price_per_use_cny || descriptor.price_per_use_cny,
                        source: descriptor.source,
                    });
                }
                return marketAnalyticsStore.recordUsageEvent({
                    agent_id: row.agent_id,
                    agent_name: row.agent_name,
                    owner_id: manifest?.owner_id || descriptor?.owner_id,
                    consumer_id: digitalTwinContext?.user_id,
                    domain,
                    success: row.success,
                    revenue_delta_cny: usageEvents.find((item) => item.agent_id === row.agent_id)?.revenue_delta_cny || 0,
                    source: 'manual_execute',
                });
            })
        );
        const analyticsAccepted = analyticsWrites.filter((item) => item.accepted).length;
        const analyticsRateLimited = analyticsWrites.filter((item) => item.rate_limited).length;
        const analyticsStatus = marketAnalyticsStore.getStatus();
        const usageSummary = {
            matched_agents: usageEvents.length,
            total_revenue_cny: usageEvents.reduce((acc, item) => acc + (item.revenue_delta_cny || 0), 0),
            total_usage_count: usageEvents.reduce((acc, item) => acc + item.usage_count, 0),
        };
        if (usageEvents.length > 0) {
            resetAgentMarketplace();
        }

        return res.status(200).json({
            trace_id: traceId,
            query,
            domain,
            selected_count: deduped.length,
            success_count: results.filter(r => r.success).length,
            failed_count: results.filter(r => !r.success).length,
            results,
            usage_summary: usageSummary,
            usage_events: usageEvents,
            analytics_summary: {
                accepted_events: analyticsAccepted,
                rate_limited_events: analyticsRateLimited,
            },
            storage_mode: analyticsStatus.storage_mode,
            storage_backend: analyticsStatus.backend,
            storage_error: analyticsStatus.error,
        });
    } catch (error) {
        console.error('[AgentMarketManualExecuteAPI] Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

export const __agentMarketTestables = {
    inferRouteFromQuery,
    inferDestinationFromQuery,
    buildSpecializedTaskParams,
};

// ── Leaderboard handler ──────────────────────────────────────────────────────

const VALID_LB_WINDOWS: LeaderboardWindow[] = ['7d', '30d'];
const VALID_LB_SORTS: LeaderboardSort[] = ['commercial', 'quality', 'growth'];
const VALID_LB_DOMAINS: AgentDomain[] = [
    'recruitment', 'travel', 'finance', 'health', 'legal',
    'education', 'shopping', 'productivity', 'local_service', 'general',
];

function firstQueryParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return String(value[0] || '');
    return String(value || '');
}

async function handleLeaderboard(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    try {
        const windowRaw = firstQueryParam(req.query?.window).trim() as LeaderboardWindow;
        const sortRaw = firstQueryParam(req.query?.sort).trim() as LeaderboardSort;
        const domainRaw = firstQueryParam(req.query?.domain).trim() as AgentDomain;
        const limitRaw = Number(firstQueryParam(req.query?.limit));
        const window = VALID_LB_WINDOWS.includes(windowRaw) ? windowRaw : '7d';
        const sort = VALID_LB_SORTS.includes(sortRaw) ? sortRaw : 'commercial';
        const domain = VALID_LB_DOMAINS.includes(domainRaw) ? domainRaw : undefined;
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.floor(limitRaw)) : 20;
        const leaderboard = await buildLeaderboard({ window, sort, domain, limit });
        const status = marketAnalyticsStore.getStatus();
        return res.status(200).json({ success: true, window, sort, domain: domain || 'all', rankings: leaderboard.rankings, storage_mode: status.storage_mode, storage_backend: status.backend, storage_error: status.error });
    } catch (error) {
        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'internal_error', storage_mode: marketAnalyticsStore.getStatus().storage_mode });
    }
}

// ── Trends handler ───────────────────────────────────────────────────────────

const VALID_TREND_WINDOWS: TrendWindow[] = ['7d', '30d', '90d'];

async function handleTrends(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    try {
        const agentId = firstQueryParam(req.query?.agent_id).trim();
        if (!agentId) {
            return res.status(400).json({ success: false, error: 'Missing required query param: agent_id' });
        }
        const windowRaw = firstQueryParam(req.query?.window).trim() as TrendWindow;
        const domainRaw = firstQueryParam(req.query?.domain).trim() as AgentDomain;
        const window = VALID_TREND_WINDOWS.includes(windowRaw) ? windowRaw : '30d';
        const domain = VALID_LB_DOMAINS.includes(domainRaw) ? domainRaw : undefined;
        const points = await getAgentTrendPoints(agentId, window, domain);
        const status = marketAnalyticsStore.getStatus();
        return res.status(200).json({ success: true, agent_id: agentId, window, domain: domain || 'all', daily_points: points, storage_mode: status.storage_mode, storage_backend: status.backend, storage_error: status.error });
    } catch (error) {
        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'internal_error', storage_mode: marketAnalyticsStore.getStatus().storage_mode });
    }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = extractAction(req);
    if (action === 'discover') {
        return handleAgentMarketDiscover(req, res);
    }
    if (action === 'execute') {
        return handleAgentMarketExecute(req, res);
    }
    if (action === 'manual-execute') {
        return handleAgentMarketManualExecute(req, res);
    }
    if (action === 'leaderboard') {
        return handleLeaderboard(req, res);
    }
    if (action === 'trends') {
        return handleTrends(req, res);
    }
    return res.status(404).json({ error: 'Unknown agent-market action' });
}

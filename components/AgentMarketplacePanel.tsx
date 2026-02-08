import React, { useMemo, useState } from 'react';
import { Bot, Search, Loader2, ShieldAlert, Sparkles, ExternalLink, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { buildApiUrl } from '../services/apiBaseUrl';
import {
    techColors, TechKeyframesInjector, HexGridBackground, GlowCard, NeonBadge,
    TechProgressBar, TechButton, TechInput, TechSelect, TechSectionHeader,
    RadialGauge, PulseRing, ScanLine, GradientHeading, RankBadge,
} from './TechStyles';
import { lixStore } from '../services/lixStore';
import { recordInteraction } from '../services/localStorageService';
import { applyPassiveLearningEvent } from '../services/digitalSoulService';
import {
    buildLixTwinSnapshot,
    buildMarketplaceTwinContext,
    getCurrentUserId,
    getProfileShareConsent,
    setProfileShareConsent,
    summarizeTwinContext,
    type ProfileShareConsentState,
} from '../services/digitalTwinMarketplaceBridge';
import { syncMarketplaceAgentIdsToDigitalTwin } from '../services/digitalTwinLixSyncService';
import {
    MarketplaceHeader,
    AgentTabBar,
    HotelResultCard,
    FlightResultCard,
    LocalResultCard,
    ShoppingResultCard,
    WeatherResultCard,
    GenericAgentResultCard,
    SmartActionBar,
    ChatPreviewCard,
    getAgentMeta,
    mktColors,
    type AgentTab,
} from './MarketplaceResultCards';
import { MiniLineChart } from './TrendCharts';
import type { TrendData } from '../types';
import type { SolutionCustomRequirements } from '../services/lixTypes';

type AgentDomain =
    | 'recruitment'
    | 'travel'
    | 'finance'
    | 'health'
    | 'legal'
    | 'education'
    | 'shopping'
    | 'productivity'
    | 'local_service'
    | 'general';

interface CandidateRow {
    id: string;
    name: string;
    source: string;
    fit: number;
    reliability: number;
    reliabilityKnown: boolean;
    freshness: number;
    latency: number;
    latencyKnown: boolean;
    cost: number;
    twinBoost?: number;
    total: number;
    rejectReason?: string;
    metricsSource?: string;
    metricsSampleSize?: number;
    domains?: string[];
    capabilities?: string[];
    complianceTags?: string[];
}

interface DiscoverViewModel {
    traceId: string;
    candidates: CandidateRow[];
    rejected: CandidateRow[];
}

interface ExecutionRow {
    agentId: string;
    agentName: string;
    source: string;
    success: boolean;
    latencyMs: number;
    summary: string;
    error?: string;
    evidenceCount?: number;
    data?: any;
}

interface ExecuteViewModel {
    traceId: string;
    query: string;
    domain: string;
    selectedCount: number;
    successCount: number;
    failedCount: number;
    results: ExecutionRow[];
}

interface LeaderboardRow {
    rank: number;
    agent_id: string;
    agent_name: string;
    hotness_score: number;
    sparkline: number[];
}

interface CustomRequirementDraft {
    title: string;
    objective: string;
    mustHave: string;
    exclusions: string;
    budgetMaxCny: string;
    expectedDeliveryHours: string;
    successCriteria: string;
    notes: string;
}

const EMPTY_CUSTOM_REQUIREMENT_DRAFT: CustomRequirementDraft = {
    title: '',
    objective: '',
    mustHave: '',
    exclusions: '',
    budgetMaxCny: '',
    expectedDeliveryHours: '',
    successCriteria: '',
    notes: '',
};

const colors = {
    primary: techColors.cyan,
    primaryMuted: techColors.cyanMuted,
    positive: techColors.green,
    warning: techColors.gold,
    danger: techColors.red,
    bg1: techColors.bg1,
    bg2: techColors.bgCard,
    bg3: 'rgba(30, 41, 59, 0.6)',
    text1: techColors.text1,
    text2: techColors.text2,
    text3: techColors.text3,
    border: techColors.border,
};

const MANUAL_EXECUTE_TIMEOUT_MS = 30000;

function parseCapabilities(value: string): string[] {
    return value
        .split(/[,，\n]/)
        .map(v => v.trim())
        .filter(Boolean);
}

function parseListInput(value: string): string[] {
    return value
        .split(/[,，\n]/)
        .map((v) => v.trim())
        .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
    const out: string[] = [];
    values.forEach((value) => {
        if (!value) return;
        if (!out.includes(value)) out.push(value);
    });
    return out;
}

function toPositiveNumber(value: string): number | undefined {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
}

function buildCustomRequirementsPayload(draft: CustomRequirementDraft): SolutionCustomRequirements | undefined {
    const objective = draft.objective.trim();
    const mustHave = parseListInput(draft.mustHave);
    const exclusions = parseListInput(draft.exclusions);
    const successCriteria = parseListInput(draft.successCriteria);
    const notes = draft.notes.trim();
    const budgetMax = toPositiveNumber(draft.budgetMaxCny);
    const expectedDeliveryHours = toPositiveNumber(draft.expectedDeliveryHours);

    const payload: SolutionCustomRequirements = {};
    if (objective) payload.objective = objective;
    if (mustHave.length > 0) payload.must_have_capabilities = mustHave;
    if (exclusions.length > 0) payload.exclusions = exclusions;
    if (typeof budgetMax === 'number') payload.budget_max_cny = budgetMax;
    if (typeof expectedDeliveryHours === 'number') payload.expected_delivery_hours = expectedDeliveryHours;
    if (successCriteria.length > 0) payload.success_criteria = successCriteria;
    if (notes) payload.notes = notes;

    return Object.keys(payload).length > 0 ? payload : undefined;
}

function hasCustomRequirement(draft: CustomRequirementDraft): boolean {
    return Boolean(
        draft.title.trim()
        || draft.objective.trim()
        || draft.mustHave.trim()
        || draft.exclusions.trim()
        || draft.budgetMaxCny.trim()
        || draft.expectedDeliveryHours.trim()
        || draft.successCriteria.trim()
        || draft.notes.trim()
    );
}

function normalizeCandidate(raw: any): CandidateRow {
    const agent = raw?.agent || {};
    const inferredReliabilityKnown =
        typeof raw.reliability_known === 'boolean'
            ? raw.reliability_known
            : Number.isFinite(agent.success_rate);
    const inferredLatencyKnown =
        typeof raw.latency_known === 'boolean'
            ? raw.latency_known
            : Number.isFinite(agent.avg_latency_ms);
    return {
        id: String(agent.id || raw.agent_id || 'unknown'),
        name: String(agent.name || raw.agent_name || raw.agent_id || 'unknown'),
        source: String(agent.source || raw.source || 'unknown'),
        fit: Number(raw.fit_score || 0),
        reliability: Number(raw.reliability_score || 0),
        reliabilityKnown: inferredReliabilityKnown,
        freshness: Number(raw.freshness_score || 0),
        latency: Number(raw.latency_score || 0),
        latencyKnown: inferredLatencyKnown,
        cost: Number(raw.cost_score || 0),
        twinBoost: Number.isFinite(raw.twin_boost) ? Number(raw.twin_boost) : undefined,
        total: Number(raw.total_score || 0),
        rejectReason: raw.reject_reason ? String(raw.reject_reason) : undefined,
        metricsSource: typeof agent.metrics_source === 'string' ? agent.metrics_source : undefined,
        metricsSampleSize: Number.isFinite(agent.metrics_sample_size) ? Number(agent.metrics_sample_size) : undefined,
        domains: Array.isArray(agent.domains) ? agent.domains : undefined,
        capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : undefined,
        complianceTags: Array.isArray(agent.compliance_tags) ? agent.compliance_tags.map((tag: any) => String(tag)) : undefined,
    };
}

function readComplianceTagValue(tags: string[] | undefined, prefix: string): string | undefined {
    if (!Array.isArray(tags)) return undefined;
    const matched = tags.find((tag) => tag.startsWith(prefix));
    if (!matched) return undefined;
    return matched.slice(prefix.length);
}

function getAgentMonetizationSummary(candidate: CandidateRow): { pricePerUseCny?: number; revenueTotalCny?: number; usageCount?: number } {
    const tags = candidate.complianceTags;
    const price = Number(readComplianceTagValue(tags, 'price_per_use_cny:'));
    const revenue = Number(readComplianceTagValue(tags, 'revenue_total_cny:'));
    const usage = Number(readComplianceTagValue(tags, 'usage_count:'));
    return {
        pricePerUseCny: Number.isFinite(price) ? price : undefined,
        revenueTotalCny: Number.isFinite(revenue) ? revenue : undefined,
        usageCount: Number.isFinite(usage) ? usage : undefined,
    };
}

function isMyDeliveredAgent(candidate: CandidateRow, ownerId: string): boolean {
    if (candidate.id.startsWith('ext:lix:')) return true;
    if (candidate.source !== 'external_market') return false;
    const tags = candidate.complianceTags || [];
    return tags.includes('lix_delivered') && tags.includes('reviewed') && tags.includes(`owner:${ownerId}`);
}

export function shouldEscalateToLix(
    query: string,
    data: DiscoverViewModel | null,
    executionData: ExecuteViewModel | null,
    error: string | null
): boolean {
    if (!query.trim()) return false;
    const noCandidates = Boolean(data && data.candidates.length === 0);
    const partialFailure = Boolean(executionData && executionData.selectedCount > 0 && executionData.successCount < executionData.selectedCount);
    return Boolean(error) || noCandidates || partialFailure;
}

function normalizeDiscoverResponse(payload: any): DiscoverViewModel {
    const candidatesRaw = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const rejectedRaw = Array.isArray(payload?.rejected) ? payload.rejected : [];
    return {
        traceId: String(payload?.trace_id || ''),
        candidates: candidatesRaw.map(normalizeCandidate),
        rejected: rejectedRaw.map(normalizeCandidate),
    };
}

function normalizeExecuteResponse(payload: any): ExecuteViewModel {
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    return {
        traceId: String(payload?.trace_id || ''),
        query: String(payload?.query || ''),
        domain: String(payload?.domain || ''),
        selectedCount: Number(payload?.selected_count || rows.length || 0),
        successCount: Number(payload?.success_count || 0),
        failedCount: Number(payload?.failed_count || 0),
        results: rows.map((row: any) => ({
            agentId: String(row?.agent_id || ''),
            agentName: String(row?.agent_name || row?.agent_id || 'unknown'),
            source: String(row?.source || 'unknown'),
            success: Boolean(row?.success),
            latencyMs: Number(row?.latency_ms || 0),
            summary: String(row?.summary || (row?.success ? '执行完成' : '执行失败')),
            error: row?.error ? String(row.error) : undefined,
            evidenceCount: Number.isFinite(row?.evidence_count) ? Number(row.evidence_count) : undefined,
            data: row?.data,
        })),
    };
}

interface ResultLink {
    title: string;
    url: string;
    caption?: string;
}

interface UserResultView {
    highlights: string[];
    links: ResultLink[];
}

interface AssistantPreview {
    lines: string[];
    links: ResultLink[];
}

function formatDateYYYYMMDD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDefaultTravelDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateYYYYMMDD(tomorrow);
}

export function recordOutboundLinkTelemetry(payload: { agentType: string; title: string; url: string }) {
    recordInteraction('card_click', {
        source: 'agent_marketplace',
        agentType: payload.agentType,
        title: payload.title,
        url: payload.url,
    }, 'agent_market');
    applyPassiveLearningEvent({ type: 'card_click', scoreHint: 1 });
}

function isSafeExternalUrl(url?: string): boolean {
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

function buildWeatherQueryUrl(location?: string): string | undefined {
    const loc = String(location || '').trim();
    if (!loc) return undefined;
    return `https://www.google.com/search?q=${encodeURIComponent(`${loc} 天气`)}`;
}

function buildWeatherRadarUrl(lat?: number, lon?: number): string | undefined {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    return `https://www.windy.com/${lat!.toFixed(4)}/${lon!.toFixed(4)}?${lat!.toFixed(4)},${lon!.toFixed(4)},7`;
}

function buildUserResultView(row: ExecutionRow): UserResultView {
    const data = row.data || {};
    const highlights: string[] = [];
    const links: ResultLink[] = [];

    if (typeof row.summary === 'string' && row.summary.trim()) {
        highlights.push(row.summary.trim());
    }

    const searchResults = Array.isArray(data?.results) ? data.results : [];
    searchResults.slice(0, 2).forEach((item: any) => {
        if (typeof item?.title === 'string' && item.title.trim()) {
            highlights.push(item.title.trim());
        }
        if (typeof item?.url === 'string' && item.url.trim()) {
            if (!isSafeExternalUrl(item.url)) return;
            links.push({
                title: item?.title || '查看搜索结果',
                url: item.url,
                caption: item?.source,
            });
        }
    });

    const evidenceItems = Array.isArray(data?.evidence?.items) ? data.evidence.items : [];
    evidenceItems.slice(0, 2).forEach((item: any) => {
        if (typeof item?.title === 'string' && item.title.trim()) {
            highlights.push(item.title.trim());
        }
        if (typeof item?.url === 'string' && item.url.trim()) {
            if (!isSafeExternalUrl(item.url)) return;
            links.push({
                title: item?.title || '查看证据',
                url: item.url,
                caption: item?.source_name,
            });
        }
    });

    const actionLinks = [
        ...(Array.isArray(data?.action_links) ? data.action_links : []),
        ...(Array.isArray(data?.data?.action_links) ? data.data.action_links : []),
    ];
    actionLinks.slice(0, 3).forEach((item: any) => {
        if (typeof item?.url === 'string' && item.url.trim()) {
            if (!isSafeExternalUrl(item.url)) return;
            links.push({
                title: item?.title || '前往预订',
                url: item.url,
                caption: item?.provider,
            });
        }
    });

    const flights = Array.isArray(data?.data?.flights) ? data.data.flights : [];
    if (flights.length > 0) {
        const best = flights[0];
        const airline = typeof best?.airline === 'string' ? best.airline : '航司';
        const price = Number.isFinite(best?.price) ? `¥${best.price}` : '';
        const route = [data?.data?.origin, data?.data?.destination].filter(Boolean).join(' → ');
        highlights.push(`航班推荐：${airline}${price ? ` · ${price}` : ''}${route ? ` · ${route}` : ''}`);
        if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim() && isSafeExternalUrl(best.bookingUrl)) {
            links.push({ title: `${airline} 预订入口`, url: best.bookingUrl });
        }
    }

    const hotels = Array.isArray(data?.data?.hotels) ? data.data.hotels : [];
    if (hotels.length > 0) {
        const best = hotels[0];
        const hotelName = typeof best?.name === 'string' ? best.name : '酒店';
        const price = Number.isFinite(best?.pricePerNight) ? `¥${best.pricePerNight}/晚` : '';
        highlights.push(`酒店推荐：${hotelName}${price ? ` · ${price}` : ''}`);
        if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim() && isSafeExternalUrl(best.bookingUrl)) {
            links.push({ title: `${hotelName} 预订入口`, url: best.bookingUrl });
        }
    }

    const comparisonLinks = data?.data?.comparisonLinks;
    if (comparisonLinks && typeof comparisonLinks === 'object') {
        Object.values(comparisonLinks).slice(0, 3).forEach((item: any) => {
            if (typeof item?.url === 'string' && item.url.trim()) {
                if (!isSafeExternalUrl(item.url)) return;
                links.push({
                    title: item?.name || '比价入口',
                    url: item.url,
                    caption: '比价',
                });
            }
        });
    }

    const localResults = Array.isArray(data?.local_results)
        ? data.local_results
        : Array.isArray(data?.normalized?.local_results)
            ? data.normalized.local_results
            : [];
    if (localResults.length > 0) {
        const top = localResults[0];
        highlights.push(`本地推荐：${top?.name || '商家'}${top?.rating ? ` · ${top.rating}⭐` : ''}`);
        const localLink = top?.map_url || top?.website;
        if (typeof localLink === 'string' && localLink.trim() && isSafeExternalUrl(localLink)) {
            links.push({ title: `${top?.name || '商家'} 导航`, url: localLink });
        }
    }

    const shoppingResults = Array.isArray(data?.shopping_results)
        ? data.shopping_results
        : Array.isArray(data?.normalized?.shopping_results)
            ? data.normalized.shopping_results
            : [];
    if (shoppingResults.length > 0) {
        const top = shoppingResults[0];
        const priceText = top?.price_text || (Number.isFinite(top?.price) ? `¥${top.price}` : '');
        highlights.push(`商品比价：${top?.title || '商品'}${priceText ? ` · ${priceText}` : ''}`);
        if (typeof top?.url === 'string' && top.url.trim() && isSafeExternalUrl(top.url)) {
            links.push({ title: `${top?.title || '商品'} 链接`, url: top.url });
        }
    }

    const weatherData = data?.data || {};
    const forecast = Array.isArray(weatherData?.forecast) ? weatherData.forecast : [];
    if (forecast.length > 0) {
        const today = forecast[0];
        const location = String(weatherData?.locationCN || weatherData?.location || '').trim() || '目的地';
        const tempText = today?.temp || (
            Number.isFinite(today?.tempMin) && Number.isFinite(today?.tempMax)
                ? `${today.tempMin}-${today.tempMax}°C`
                : ''
        );
        highlights.push(`天气：${location} · ${today?.condition || '待确认'}${tempText ? ` · ${tempText}` : ''}`);
        if (Array.isArray(weatherData?.tips) && weatherData.tips[0]) {
            highlights.push(String(weatherData.tips[0]));
        }

        const coords = weatherData?.coordinates || {};
        const lat = Number(coords?.lat);
        const lon = Number(coords?.lon);
        const weatherLinks = [
            buildWeatherQueryUrl(location),
            buildWeatherRadarUrl(lat, lon),
        ];
        weatherLinks.forEach((url) => {
            if (!url || !isSafeExternalUrl(url)) return;
            links.push({
                title: url.includes('windy.com') ? '天气雷达' : `${location} 天气`,
                url,
            });
        });
    }

    const dedupedLinks = Array.from(
        new Map(
            links
                .filter(link => typeof link.url === 'string' && link.url.trim() && isSafeExternalUrl(link.url))
                .map(link => [link.url, link])
        ).values()
    );

    const dedupedHighlights = Array.from(
        new Set(
            highlights
                .map(line => String(line || '').trim())
                .filter(Boolean)
        )
    );

    return {
        highlights: dedupedHighlights.slice(0, 4),
        links: dedupedLinks.slice(0, 5),
    };
}

function buildAssistantPreview(rows: ExecutionRow[]): AssistantPreview {
    const lines: string[] = [];
    const links: ResultLink[] = [];

    rows.forEach((row) => {
        const view = buildUserResultView(row);
        if (view.highlights.length > 0) {
            lines.push(view.highlights[0]);
        }
        view.links.forEach(link => links.push(link));
    });

    const dedupedLines = Array.from(new Set(lines.map(line => line.trim()).filter(Boolean))).slice(0, 5);
    const dedupedLinks = Array.from(
        new Map(
            links
                .filter(link => typeof link.url === 'string' && link.url.trim() && isSafeExternalUrl(link.url))
                .map(link => [link.url, link])
        ).values()
    ).slice(0, 5);

    return {
        lines: dedupedLines,
        links: dedupedLinks,
    };
}

function toSparklineTrendData(values: number[]): TrendData[] {
    const now = new Date();
    const rows = Array.isArray(values) && values.length > 0 ? values : [0];
    return rows.map((value, idx) => {
        const date = new Date(now.getTime() - (rows.length - idx - 1) * 24 * 3600 * 1000);
        return {
            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            value: Number.isFinite(value) ? Number(value) : 0,
        };
    });
}

function deriveMissingConstraints(rows: ExecutionRow[]): string[] {
    const constraints: string[] = [];
    rows.forEach((row) => {
        const data = row.data || {};
        const fromFallback = Array.isArray(data?.fallback?.missing_constraints)
            ? data.fallback.missing_constraints
            : [];
        const fromRouteDecision = Array.isArray(data?.route_decision?.missing_constraints)
            ? data.route_decision.missing_constraints
            : [];
        [...fromFallback, ...fromRouteDecision].forEach((item: any) => {
            const value = String(item || '').trim();
            if (value) constraints.push(value);
        });
    });
    return Array.from(new Set(constraints)).slice(0, 6);
}

function applyQueryAction(baseQuery: string, action: 'continue_filter' | 'direct_only' | 'budget_800' | 'add_date' | 'add_budget' | 'add_passengers'): string {
    const normalized = baseQuery.trim();
    if (!normalized) return baseQuery;
    const date = getDefaultTravelDate();
    switch (action) {
        case 'continue_filter':
            return /继续筛选/.test(normalized) ? normalized : `${normalized}，继续筛选更合适的方案`;
        case 'direct_only':
            return /直飞/.test(normalized) ? normalized : `${normalized}，只看直飞`;
        case 'budget_800':
            return /(预算|¥|￥)\s*800|800\s*元/.test(normalized) ? normalized : `${normalized}，预算800元以内`;
        case 'add_date':
            return /\d{4}-\d{2}-\d{2}|今天|明天|后天/.test(normalized) ? normalized : `${normalized}，出发日期${date}`;
        case 'add_budget':
            return /(预算|¥|￥)\s*\d+|\d+\s*元/.test(normalized) ? normalized : `${normalized}，预算1500元以内`;
        case 'add_passengers':
            return /\d+\s*(人|位)/.test(normalized) ? normalized : `${normalized}，1人出行`;
        default:
            return normalized;
    }
}

export function buildConciergeQuery(baseQuery: string, context: {
    goal?: string;
    budget?: string;
    deadline?: string;
    industry?: string;
}): string {
    const normalized = String(baseQuery || '').trim();
    if (!normalized) return '';
    const parts: string[] = [];
    const goal = String(context.goal || '').trim();
    const budget = String(context.budget || '').trim();
    const deadline = String(context.deadline || '').trim();
    const industry = String(context.industry || '').trim();
    if (goal) parts.push(`业务目标：${goal}`);
    if (budget) parts.push(`预算：${budget}`);
    if (deadline) parts.push(`时限：${deadline}`);
    if (industry && industry !== '通用商业') parts.push(`行业：${industry}`);
    if (parts.length === 0) return normalized;
    return `${normalized}（${parts.join('；')}）`;
}

interface AgentMarketplacePanelProps {
    onOpenLixMarket?: (intentId: string) => void;
}

export const AgentMarketplacePanel: React.FC<AgentMarketplacePanelProps> = ({ onOpenLixMarket }) => {
    const userId = useMemo(() => getCurrentUserId(), []);
    const [query, setQuery] = useState('搜索北京到上海的机票');
    const [businessGoal, setBusinessGoal] = useState('');
    const [budgetConstraint, setBudgetConstraint] = useState('');
    const [deadlineConstraint, setDeadlineConstraint] = useState('');
    const [industryScenario, setIndustryScenario] = useState('通用商业');
    const [deliveryModePreference, setDeliveryModePreference] = useState<'agent_collab' | 'human_expert' | 'hybrid'>('agent_collab');
    const [domainHint, setDomainHint] = useState<'auto' | AgentDomain>('auto');
    const [capInput, setCapInput] = useState('flight_search, live_search, web_search');
    const [requireRealtime, setRequireRealtime] = useState(true);
    const [requireEvidence, setRequireEvidence] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DiscoverViewModel | null>(null);
    const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
    const [executionData, setExecutionData] = useState<ExecuteViewModel | null>(null);
    const [executionNotice, setExecutionNotice] = useState<string | null>(null);
    const [activeResultTab, setActiveResultTab] = useState<string>('');
    const [showCandidates, setShowCandidates] = useState(false);
    const [publishingDemand, setPublishingDemand] = useState(false);
    const [solutionIntentId, setSolutionIntentId] = useState<string>('');
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [showCustomRequirementModal, setShowCustomRequirementModal] = useState(false);
    const [rememberConsent, setRememberConsent] = useState(true);
    const [consentState, setConsentState] = useState<ProfileShareConsentState>(() => getProfileShareConsent());
    const [customRequirementDraft, setCustomRequirementDraft] = useState<CustomRequirementDraft>(EMPTY_CUSTOM_REQUIREMENT_DRAFT);
    const [standaloneRequirementNote, setStandaloneRequirementNote] = useState<string>('');
    const [pendingPublishDraft, setPendingPublishDraft] = useState<CustomRequirementDraft | null>(null);
    const [pendingRequesterAgentId, setPendingRequesterAgentId] = useState<string | null>(null);
    const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);

    const twinContext = useMemo(() => buildMarketplaceTwinContext(), []);
    const twinSummary = useMemo(() => summarizeTwinContext(twinContext), [twinContext]);

    const capabilityList = useMemo(() => parseCapabilities(capInput), [capInput]);
    const recommendedAgentIds = useMemo(
        () => (data ? data.candidates.slice(0, 3).map(c => c.id) : []),
        [data]
    );
    const successfulExecutionRows = useMemo(
        () => (executionData ? executionData.results.filter(row => row.success) : []),
        [executionData]
    );
    const failedExecutionRows = useMemo(
        () => (executionData ? executionData.results.filter(row => !row.success) : []),
        [executionData]
    );
    const assistantPreview = useMemo(
        () => buildAssistantPreview(successfulExecutionRows),
        [successfulExecutionRows]
    );
    const missingConstraints = useMemo(
        () => deriveMissingConstraints(failedExecutionRows),
        [failedExecutionRows]
    );
    const groupedCandidates = useMemo(() => {
        if (!data) {
            return {
                myAgents: [] as CandidateRow[],
                marketAgents: [] as CandidateRow[],
            };
        }
        const myAgents = data.candidates.filter((candidate) => isMyDeliveredAgent(candidate, userId));
        const marketAgents = data.candidates.filter((candidate) => !isMyDeliveredAgent(candidate, userId));
        return { myAgents, marketAgents };
    }, [data, userId]);
    const shouldShowEscalation = useMemo(
        () => shouldEscalateToLix(query, data, executionData, error),
        [query, data, executionData, error]
    );

    React.useEffect(() => {
        if (!data || groupedCandidates.myAgents.length === 0) return;
        const ids = groupedCandidates.myAgents.map((candidate) => candidate.id);
        syncMarketplaceAgentIdsToDigitalTwin(ids);
    }, [data, groupedCandidates.myAgents]);

    React.useEffect(() => {
        const loadLeaderboard = async () => {
            try {
                const response = await fetch(buildApiUrl('/api/agent-market/leaderboard?window=7d&sort=commercial&limit=3'));
                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload?.success || !Array.isArray(payload?.rankings)) {
                    setLeaderboardRows([]);
                    return;
                }
                setLeaderboardRows(
                    payload.rankings
                        .map((row: any) => ({
                            rank: Number(row?.rank || 0),
                            agent_id: String(row?.agent_id || ''),
                            agent_name: String(row?.agent_name || row?.agent_id || ''),
                            hotness_score: Number(row?.hotness_score || 0),
                            sparkline: Array.isArray(row?.sparkline)
                                ? row.sparkline.map((v: any) => Number(v || 0))
                                : [],
                        }))
                        .filter((row: LeaderboardRow) => Boolean(row.agent_id))
                );
            } catch {
                setLeaderboardRows([]);
            }
        };
        loadLeaderboard();
    }, [executionData?.traceId]);

    const resolveAgentNameById = (agentId?: string | null): string | undefined => {
        const normalized = String(agentId || '').trim();
        if (!normalized) return undefined;
        const fromCandidates = data?.candidates.find((candidate) => candidate.id === normalized)?.name;
        if (fromCandidates) return fromCandidates;
        const fromResults = executionData?.results.find((row) => row.agentId === normalized)?.agentName;
        if (fromResults) return fromResults;
        return normalized;
    };

    const publishAgentRequirement = async (
        shareConsent: ProfileShareConsentState,
        customDraftOverride?: CustomRequirementDraft | null,
        requesterAgentIdOverride?: string | null
    ) => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) return;
        const effectiveQuery = buildConciergeQuery(normalizedQuery, {
            goal: businessGoal,
            budget: budgetConstraint,
            deadline: deadlineConstraint,
            industry: industryScenario,
        });
        setPublishingDemand(true);
        try {
            const failedRows = (executionData?.results || []).filter((row) => !row.success);
            const latestTwinContext = buildMarketplaceTwinContext();
            const twinSnapshot = buildLixTwinSnapshot();
            const effectiveCustomDraft = customDraftOverride || customRequirementDraft;
            const customRequirements = buildCustomRequirementsPayload(effectiveCustomDraft);
            const mergedCapabilities = uniqueStrings([
                ...capabilityList,
                ...(customRequirements?.must_have_capabilities || []),
            ]);
            const customTitle = effectiveCustomDraft.title.trim();
            const requesterAgentId = String(requesterAgentIdOverride || '').trim();
            const requesterType = requesterAgentId ? 'agent' : 'user';
            const requesterAgentName = resolveAgentNameById(requesterAgentId);
            if (latestTwinContext.privacy_mode && shareConsent === 'revoked') {
                throw new Error('当前已开启隐私模式，需授权后才能附带数字分身画像发布到 LIX');
            }
            const response = await fetch(buildApiUrl('/api/lix/solution/broadcast'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    requester_id: userId,
                    requester_type: requesterType,
                    requester_agent_id: requesterAgentId || undefined,
                    requester_agent_name: requesterAgentName || undefined,
                    title: customTitle || undefined,
                    query: effectiveQuery,
                    domain: domainHint === 'auto' ? 'general' : domainHint,
                    required_capabilities: mergedCapabilities,
                    delivery_mode_preference: deliveryModePreference,
                    custom_requirements: customRequirements,
                    profile_share_consent: shareConsent,
                    digital_twin_snapshot: twinSnapshot,
                    digital_twin_context: latestTwinContext,
                    failure_context: {
                        candidate_count: data?.candidates.length || 0,
                        failed_agent_ids: failedRows.map((row) => row.agentId),
                        failed_count: failedRows.length,
                        error_codes: failedRows.map((row) => row.error || '').filter(Boolean),
                    },
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || `HTTP ${response.status}: solution broadcast failed`);
            }
            const createdIntentId = String(payload.intent_id || '');
            setSolutionIntentId(createdIntentId);
            if (payload.intent) {
                lixStore.ingestSolutionIntent(payload.intent);
            }
            setExecutionNotice(`已发布专家需求到 LIX（intent: ${createdIntentId || 'created'}）`);
            recordInteraction('tool_used', {
                toolName: 'broadcast_agent_requirement',
                intentId: createdIntentId || undefined,
                requesterType,
                requesterAgentId: requesterAgentId || undefined,
                requesterAgentName: requesterAgentName || undefined,
                requiredCapabilities: mergedCapabilities,
                deliveryModePreference: deliveryModePreference,
            }, 'agent_market');
            applyPassiveLearningEvent({ type: 'card_click', scoreHint: 1 });
            setShowCustomRequirementModal(false);
            setStandaloneRequirementNote('');
            setPendingPublishDraft(null);
            setPendingRequesterAgentId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setPublishingDemand(false);
        }
    };

    const startPublishFlow = async (
        customDraftOverride?: CustomRequirementDraft | null,
        requesterAgentIdOverride?: string | null
    ) => {
        const latestConsent = getProfileShareConsent();
        setConsentState(latestConsent);
        setPendingPublishDraft(customDraftOverride || null);
        setPendingRequesterAgentId(String(requesterAgentIdOverride || '').trim() || null);
        if (latestConsent === 'granted_remembered') {
            await publishAgentRequirement('granted_remembered', customDraftOverride || null, requesterAgentIdOverride || null);
            return;
        }
        setShowConsentModal(true);
    };

    const confirmPublishWithConsent = async () => {
        const nextConsent: ProfileShareConsentState = rememberConsent ? 'granted_remembered' : 'granted_once';
        setProfileShareConsent(nextConsent);
        setConsentState(nextConsent);
        setShowConsentModal(false);
        await publishAgentRequirement(nextConsent, pendingPublishDraft, pendingRequesterAgentId);
    };

    const rejectProfileShare = () => {
        setProfileShareConsent('revoked');
        setConsentState('revoked');
        setShowConsentModal(false);
        setPendingPublishDraft(null);
        setPendingRequesterAgentId(null);
        setError('已取消发布：你拒绝了数字分身授权。');
    };

    const updateCustomRequirementDraft = (patch: Partial<CustomRequirementDraft>) => {
        setCustomRequirementDraft((prev) => ({ ...prev, ...patch }));
    };

    const resetCustomRequirementDraft = () => {
        setCustomRequirementDraft(EMPTY_CUSTOM_REQUIREMENT_DRAFT);
    };

    const startCustomRequirementPublishFlow = async () => {
        if (!query.trim()) {
            setError('请先填写用户需求，再设置定制化需求。');
            return;
        }
        setShowCustomRequirementModal(true);
    };

    const confirmCustomRequirementAndPublish = async () => {
        setShowCustomRequirementModal(false);
        await startPublishFlow(customRequirementDraft, pendingRequesterAgentId);
    };

    const buildStandalonePublishDraft = (): CustomRequirementDraft => {
        const note = standaloneRequirementNote.trim();
        if (!note) return customRequirementDraft;
        const currentNotes = customRequirementDraft.notes.trim();
        if (currentNotes.includes(note)) return customRequirementDraft;
        const merged = currentNotes
            ? `${currentNotes}\n候选未满足点：${note}`
            : `候选未满足点：${note}`;
        return {
            ...customRequirementDraft,
            notes: merged,
        };
    };

    const quickPublishStandaloneRequirement = async () => {
        if (!query.trim()) {
            setError('请先填写用户需求，再发布单独需求。');
            return;
        }
        const standaloneDraft = buildStandalonePublishDraft();
        setCustomRequirementDraft(standaloneDraft);
        await startPublishFlow(standaloneDraft);
    };

    const publishRequirementBySelectedAgent = async () => {
        if (!query.trim()) {
            setError('请先填写用户需求，再发布单独需求。');
            return;
        }
        if (selectedAgentIds.length === 0) {
            setError('请先至少选择 1 个候选 Agent，再发起 Agent 协作需求。');
            return;
        }
        const requesterAgentId = selectedAgentIds[0];
        const standaloneDraft = buildStandalonePublishDraft();
        setCustomRequirementDraft(standaloneDraft);
        await startPublishFlow(standaloneDraft, requesterAgentId);
    };

    const openStandaloneCustomRequirement = () => {
        if (!query.trim()) {
            setError('请先填写用户需求，再设置定制化需求。');
            return;
        }
        const standaloneDraft = buildStandalonePublishDraft();
        setCustomRequirementDraft(standaloneDraft);
        setPendingRequesterAgentId(null);
        setShowCustomRequirementModal(true);
    };

    const handleOutboundLinkClick = (payload: { agentType: string; title: string; url: string }) => {
        recordOutboundLinkTelemetry(payload);
    };

    const runSmartQueryAction = async (
        action: 'continue_filter' | 'direct_only' | 'budget_800' | 'add_date' | 'add_budget' | 'add_passengers',
        autoRun: 'discover' | 'execute_recommended'
    ) => {
        const nextQuery = applyQueryAction(query, action);
        setQuery(nextQuery);
        if (autoRun === 'discover') {
            await onDiscover(nextQuery);
            return;
        }
        await onExecuteRecommended(nextQuery);
    };

    const onDiscover = async (queryOverride?: string) => {
        const normalizedQuery = (queryOverride ?? query).trim();
        if (!normalizedQuery) return;
        const effectiveQuery = buildConciergeQuery(normalizedQuery, {
            goal: businessGoal,
            budget: budgetConstraint,
            deadline: deadlineConstraint,
            industry: industryScenario,
        });

        setDiscovering(true);
        setError(null);
        setExecutionData(null);
        setExecutionNotice(null);
        setSolutionIntentId('');

        try {
            const body: Record<string, any> = {
                query: effectiveQuery,
                required_capabilities: capabilityList,
                digital_twin_context: buildMarketplaceTwinContext(),
                require_realtime: requireRealtime,
                require_evidence: requireEvidence,
                max_candidates: 10,
            };
            if (domainHint !== 'auto') body.domain_hint = domainHint;

            const resp = await fetch(buildApiUrl('/api/agent-market/discover'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${text || 'discover failed'}`);
            }

            const payload = await resp.json();
            const normalized = normalizeDiscoverResponse(payload);
            setData(normalized);
            setSelectedAgentIds(normalized.candidates.slice(0, 2).map(c => c.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setDiscovering(false);
        }
    };

    const toggleSelected = (candidateId: string) => {
        setSelectedAgentIds((prev) => (
            prev.includes(candidateId)
                ? prev.filter(id => id !== candidateId)
                : [...prev, candidateId]
        ));
    };

    const selectAllCandidates = () => {
        if (!data) return;
        setSelectedAgentIds(data.candidates.map(c => c.id));
    };

    const clearSelectedCandidates = () => {
        setSelectedAgentIds([]);
    };

    const runManualExecute = async (agentIds: string[], queryOverride?: string) => {
        const normalizedQuery = (queryOverride ?? query).trim();
        if (!normalizedQuery || agentIds.length === 0) return;
        const effectiveQuery = buildConciergeQuery(normalizedQuery, {
            goal: businessGoal,
            budget: budgetConstraint,
            deadline: deadlineConstraint,
            industry: industryScenario,
        });

        setExecuting(true);
        setError(null);
        setExecutionNotice(`正在执行 ${agentIds.length} 个 agent，请稍候...`);

        try {
            const body: Record<string, any> = {
                query: effectiveQuery,
                selected_agent_ids: agentIds,
                digital_twin_context: buildMarketplaceTwinContext(),
                locale: 'zh-CN',
                max_parallel: Math.min(6, Math.max(1, agentIds.length)),
            };
            if (domainHint !== 'auto') body.domain_hint = domainHint;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), MANUAL_EXECUTE_TIMEOUT_MS);
            let resp: Response;
            try {
                resp = await fetch(buildApiUrl('/api/agent-market/manual-execute'), {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timer);
            }

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${text || 'manual-execute failed'}`);
            }

            const payload = await resp.json();
            const normalized = normalizeExecuteResponse(payload);
            setExecutionData(normalized);
            const usageSummary = payload?.usage_summary;
            const matchedAgents = Number(usageSummary?.matched_agents || 0);
            const revenueDelta = Number(usageSummary?.total_revenue_cny || 0);
            const usageNotice = matchedAgents > 0
                ? ` · 市场使用 ${matchedAgents} 次${revenueDelta > 0 ? `，新增收益 ¥${revenueDelta.toFixed(0)}` : ''}`
                : '';
            setExecutionNotice(`执行完成：成功 ${normalized.successCount} / ${normalized.selectedCount}${usageNotice}`);
            if (matchedAgents > 0) {
                recordInteraction('tool_used', {
                    toolName: 'market_agent_execution',
                    matchedAgents,
                    revenueDeltaCny: revenueDelta,
                    traceId: normalized.traceId,
                }, 'agent_market');
                applyPassiveLearningEvent({ type: 'query_refine' });
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                setError(`执行超时（>${MANUAL_EXECUTE_TIMEOUT_MS / 1000}s），请减少勾选数量后重试`);
                setExecutionNotice('执行超时，请减少勾选数量后重试');
            } else {
                setError(err instanceof Error ? err.message : String(err));
                setExecutionNotice('执行失败，请查看错误信息后重试');
            }
        } finally {
            setExecuting(false);
        }
    };

    const onExecuteSelected = async (queryOverride?: string) => {
        await runManualExecute(selectedAgentIds, queryOverride);
    };

    const onExecuteRecommended = async (queryOverride?: string) => {
        if (recommendedAgentIds.length === 0) return;
        setSelectedAgentIds(recommendedAgentIds);
        await runManualExecute(recommendedAgentIds, queryOverride);
    };

    // Build agent tabs from execution results
    const agentTabs: AgentTab[] = useMemo(() => {
        if (!executionData) return [];
        return executionData.results.map((row) => {
            const meta = getAgentMeta(row.agentId);
            return {
                id: row.agentId,
                agentType: row.agentId,
                label: meta.label || row.agentName,
                icon: meta.icon,
                hasData: row.success,
            };
        });
    }, [executionData]);

    // Auto-select first successful tab
    React.useEffect(() => {
        if (agentTabs.length > 0 && !activeResultTab) {
            const firstSuccess = agentTabs.find(t => t.hasData) || agentTabs[0];
            setActiveResultTab(firstSuccess.id);
        }
    }, [agentTabs, activeResultTab]);

    const activeRow = useMemo(
        () => executionData?.results.find(r => r.agentId === activeResultTab),
        [executionData, activeResultTab]
    );

    return (
        <HexGridBackground style={{ padding: 0 }}>
            <TechKeyframesInjector />
            <div className="space-y-4">
                <GlowCard glowColor={techColors.cyan} style={{ padding: 20 }}>

                    <div className="space-y-3">
                        <div
                            className="rounded-xl p-3"
                            style={{
                                backgroundColor: 'rgba(6,10,20,0.6)',
                                border: `1px solid ${techColors.border}`,
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Top accent line */}
                            <div style={{
                                position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
                                background: `linear-gradient(90deg, transparent, ${techColors.cyan}, transparent)`,
                            }} />
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} style={{ color: techColors.cyan, filter: `drop-shadow(0 0 4px ${techColors.cyan})` }} />
                                <span className="text-xs font-medium" style={{ color: techColors.text1, letterSpacing: '0.04em' }}>
                                    快速启动
                                </span>
                            </div>
                            <div className="text-xs leading-5" style={{ color: techColors.text2, fontFamily: 'monospace', fontSize: 11 }}>
                                1. 输入需求 → 2. 查找 Agent → 3. 执行推荐/已选
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                    onClick={() => {
                                        setQuery('搜索北京到上海的机票');
                                        setDomainHint('travel');
                                        setCapInput('flight_search, live_search, web_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded-full"
                                    style={{
                                        backgroundColor: techColors.cyanMuted,
                                        color: techColors.cyan,
                                        border: `1px solid ${techColors.cyan}30`,
                                        fontFamily: 'monospace',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                    }}
                                >
                                    机票查询示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('帮我做招聘：找岗位、优化简历、对比薪资');
                                        setDomainHint('recruitment');
                                        setCapInput('job_sourcing, resume_optimization, salary_benchmark');
                                        setRequireRealtime(false);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded-full"
                                    style={{ backgroundColor: techColors.cyanMuted, color: techColors.cyan, border: `1px solid ${techColors.cyan}30`, fontFamily: 'monospace', transition: 'all 0.2s', cursor: 'pointer' }}
                                >
                                    招聘示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('帮我找上海周末两晚酒店');
                                        setDomainHint('travel');
                                        setCapInput('hotel_search, live_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    酒店示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('帮我找上海外滩附近评分高的咖啡店');
                                        setDomainHint('local_service');
                                        setCapInput('local_search, live_search, web_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    本地生活示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('帮我找上海外滩附近评价高的餐厅');
                                        setDomainHint('local_service');
                                        setCapInput('restaurant_search, local_search');
                                        setRequireRealtime(false);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    餐厅示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('帮我找上海周末适合打卡的景点');
                                        setDomainHint('travel');
                                        setCapInput('attraction_search, local_search');
                                        setRequireRealtime(false);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    景点示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('帮我查上海明天的天气');
                                        setDomainHint('travel');
                                        setCapInput('weather_query');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    天气示例
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('对比 iPhone 15 128G 的价格');
                                        setDomainHint('shopping');
                                        setCapInput('shopping_search, price_compare, live_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    购物比价示例
                                </button>
                            </div>
                        </div>

                        <div
                            className="rounded-xl p-3 flex items-center justify-between gap-3"
                            style={{
                                backgroundColor: 'rgba(6,10,20,0.5)',
                                border: `1px solid ${techColors.purple}40`,
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{ position: 'absolute', top: '15%', bottom: '15%', left: 0, width: 3, background: techColors.purple, borderRadius: '0 4px 4px 0' }} />
                            <div className="flex items-center gap-2 text-xs" style={{ color: colors.text2, paddingLeft: 10 }}>
                                <PulseRing color={techColors.green} size={10} />
                                <span style={{ color: techColors.text1, fontWeight: 600, letterSpacing: '0.03em' }}>数字分身已参与决策</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{twinSummary}</span>
                            </div>
                            <span
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: techColors.purpleMuted, color: techColors.purple, fontFamily: 'monospace', border: `1px solid ${techColors.purple}30` }}
                            >
                                user: {userId.slice(0, 10)}
                            </span>
                        </div>

                        {leaderboardRows.length > 0 && (
                            <div
                                className="rounded-xl p-3"
                                style={{ backgroundColor: colors.bg1, border: `1px solid ${colors.border}` }}
                            >
                                <div className="text-xs font-medium mb-2" style={{ color: techColors.cyan, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                    ▸ 市场热度榜（7天）
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {leaderboardRows.map((row) => (
                                        <div
                                            key={row.agent_id}
                                            className="rounded-lg p-2"
                                            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                                        >
                                            <div className="text-[11px] font-medium" style={{ color: colors.text1 }}>
                                                #{row.rank} {row.agent_name}
                                            </div>
                                            <div className="text-[10px]" style={{ color: colors.warning }}>
                                                热度 {row.hotness_score.toFixed(2)}
                                            </div>
                                            <MiniLineChart
                                                data={toSparklineTrendData(row.sparkline)}
                                                width={120}
                                                height={42}
                                                showDots={false}
                                                showArea
                                                color="#22C55E"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <div
                                className="rounded-lg p-3 mb-2"
                                style={{ backgroundColor: 'rgba(6,10,20,0.5)', border: `1px solid ${techColors.border}` }}
                            >
                                <div className="text-xs font-medium mb-2" style={{ color: techColors.cyan, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                    ▸ 顾问模式
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>业务目标</label>
                                        <input
                                            value={businessGoal}
                                            onChange={(e) => setBusinessGoal(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                            placeholder="例如：提升门店转化率"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>预算范围</label>
                                        <input
                                            value={budgetConstraint}
                                            onChange={(e) => setBudgetConstraint(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                            placeholder="例如：¥2000/月"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>完成时限</label>
                                        <input
                                            value={deadlineConstraint}
                                            onChange={(e) => setDeadlineConstraint(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                            placeholder="例如：72 小时内"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>行业场景</label>
                                        <select
                                            value={industryScenario}
                                            onChange={(e) => setIndustryScenario(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                        >
                                            <option value="通用商业">通用商业</option>
                                            <option value="本地生活">本地生活</option>
                                            <option value="招聘与人力">招聘与人力</option>
                                            <option value="跨境与贸易">跨境与贸易</option>
                                            <option value="旅游出行">旅游出行</option>
                                            <option value="内容增长">内容增长</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>LIX 交付偏好</label>
                                        <select
                                            value={deliveryModePreference}
                                            onChange={(e) => setDeliveryModePreference(e.target.value as 'agent_collab' | 'human_expert' | 'hybrid')}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                        >
                                            <option value="agent_collab">Agent 协作优先</option>
                                            <option value="human_expert">人工专家优先</option>
                                            <option value="hybrid">混合优先</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <label className="text-xs font-medium" style={{ color: techColors.cyan, fontFamily: 'monospace', letterSpacing: '0.05em' }}>▸ 用户需求</label>
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                rows={2}
                                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                                style={{
                                    backgroundColor: 'rgba(6,10,20,0.6)',
                                    color: techColors.text1,
                                    border: `1px solid ${techColors.cyan}30`,
                                    fontFamily: 'monospace',
                                    boxShadow: `0 0 15px ${techColors.cyan}08 inset`,
                                    transition: 'border-color 0.3s, box-shadow 0.3s',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = `${techColors.cyan}80`;
                                    e.target.style.boxShadow = `0 0 20px ${techColors.cyan}15 inset, 0 0 20px ${techColors.cyan}10`;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = `${techColors.cyan}30`;
                                    e.target.style.boxShadow = `0 0 15px ${techColors.cyan}08 inset`;
                                }}
                            />
                            <p className="text-[11px] mt-1.5" style={{ color: techColors.text3, fontFamily: 'monospace' }}>
                                示例：北京到上海明天机票 / 帮我找适合的前端岗位 / 订上海外滩附近酒店
                            </p>
                        </div>

                        <details
                            className="rounded-lg p-2"
                            style={{ backgroundColor: colors.bg1, border: `1px solid ${colors.border}` }}
                        >
                            <summary className="text-xs cursor-pointer select-none" style={{ color: colors.text2 }}>
                                高级筛选（技术模式，可选）
                            </summary>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="text-xs font-medium" style={{ color: colors.text3 }}>领域</label>
                                    <select
                                        value={domainHint}
                                        onChange={(e) => setDomainHint(e.target.value as 'auto' | AgentDomain)}
                                        className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                                        style={{
                                            backgroundColor: colors.bg3,
                                            color: colors.text1,
                                            border: `1px solid ${colors.border}`,
                                        }}
                                    >
                                        <option value="auto">auto</option>
                                        <option value="travel">travel</option>
                                        <option value="recruitment">recruitment</option>
                                        <option value="finance">finance</option>
                                        <option value="health">health</option>
                                        <option value="legal">legal</option>
                                        <option value="education">education</option>
                                        <option value="shopping">shopping</option>
                                        <option value="productivity">productivity</option>
                                        <option value="local_service">local_service</option>
                                        <option value="general">general</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium" style={{ color: colors.text3 }}>能力标签</label>
                                    <input
                                        value={capInput}
                                        onChange={(e) => setCapInput(e.target.value)}
                                        className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                                        style={{
                                            backgroundColor: colors.bg3,
                                            color: colors.text1,
                                            border: `1px solid ${colors.border}`,
                                        }}
                                        placeholder="comma separated"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-2">
                                <label className="flex items-center gap-2 text-xs" style={{ color: colors.text2 }}>
                                    <input
                                        type="checkbox"
                                        checked={requireRealtime}
                                        onChange={(e) => setRequireRealtime(e.target.checked)}
                                    />
                                    需要实时信息
                                </label>
                                <label className="flex items-center gap-2 text-xs" style={{ color: colors.text2 }}>
                                    <input
                                        type="checkbox"
                                        checked={requireEvidence}
                                        onChange={(e) => setRequireEvidence(e.target.checked)}
                                    />
                                    需要证据链接
                                </label>
                            </div>
                        </details>

                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => onDiscover()}
                                disabled={discovering || executing}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                                style={{
                                    background: `linear-gradient(135deg, ${techColors.cyan}, ${techColors.cyan}cc)`,
                                    color: '#fff',
                                    boxShadow: `0 0 20px ${techColors.cyan}30`,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                }}
                            >
                                {discovering ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                1. 查找 Agent
                            </button>
                            <button
                                onClick={() => onExecuteRecommended()}
                                disabled={discovering || executing || !data || recommendedAgentIds.length === 0}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                                style={{
                                    background: `linear-gradient(135deg, ${techColors.purple}, ${techColors.purple}cc)`,
                                    color: '#fff',
                                    boxShadow: `0 0 20px ${techColors.purple}30`,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                }}
                            >
                                {executing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                2. 执行推荐 ({recommendedAgentIds.length})
                            </button>
                            <button
                                onClick={() => onExecuteSelected()}
                                disabled={discovering || executing || !data || selectedAgentIds.length === 0}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                                style={{
                                    background: `linear-gradient(135deg, ${techColors.green}, ${techColors.green}cc)`,
                                    color: '#fff',
                                    boxShadow: `0 0 20px ${techColors.green}30`,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                }}
                            >
                                {executing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                                执行已选 ({selectedAgentIds.length})
                            </button>
                        </div>
                    </div>
                </GlowCard>

                {error && (
                    <div
                        className="rounded-xl p-3 text-xs"
                        style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
                    >
                        {error}
                    </div>
                )}

                {executionNotice && (
                    <div
                        className="rounded-xl p-3 text-xs"
                        style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, color: colors.text2 }}
                    >
                        {executionNotice}
                    </div>
                )}

                {shouldShowEscalation && (
                    <div
                        className="rounded-xl p-3"
                        style={{ backgroundColor: colors.bg2, border: `1px solid ${mktColors.warningMuted}` }}
                    >
                        <div className="text-sm font-medium mb-1" style={{ color: colors.text1 }}>
                            市场 Agent 覆盖不足，发布专家需求
                        </div>
                        <div className="text-xs mb-3" style={{ color: colors.text2 }}>
                            当候选不足或执行失败时，可发布到 LIX，由专家交付新 Agent 并审核上架。
                        </div>
                        {hasCustomRequirement(customRequirementDraft) && (
                            <div className="text-[11px] mb-3" style={{ color: colors.text3 }}>
                                已配置定制需求，将随发布请求一并提交。
                            </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={startPublishFlow}
                                disabled={publishingDemand}
                                className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 disabled:opacity-60"
                                style={{ backgroundColor: colors.warning, color: '#0F172A' }}
                            >
                                {publishingDemand ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                发布到 LIX
                            </button>
                            <button
                                onClick={startCustomRequirementPublishFlow}
                                disabled={publishingDemand}
                                className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                                style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                            >
                                定制化需求
                            </button>
                            {solutionIntentId && onOpenLixMarket && (
                                <button
                                    onClick={() => onOpenLixMarket(solutionIntentId)}
                                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                                    style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                                >
                                    查看需求详情
                                    <ExternalLink size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* Execution Results — Premium Redesign */}
                {/* ============================================================ */}
                {executionData && (
                    <div className="space-y-3">
                        {/* Header with success badge */}
                        <MarketplaceHeader
                            traceId={executionData.traceId}
                            successCount={executionData.successCount}
                            totalCount={executionData.selectedCount}
                        />

                        {/* Agent Type Tabs */}
                        {agentTabs.length > 1 && (
                            <AgentTabBar
                                tabs={agentTabs}
                                activeTab={activeResultTab}
                                onTabChange={setActiveResultTab}
                            />
                        )}

                        {/* Active Agent Result Card */}
                        {activeRow && activeRow.success && (() => {
                            const id = activeRow.agentId;
                            const rowData = activeRow.data || {};
                            const enrichedData = { ...rowData, latencyMs: activeRow.latencyMs };
                            const localResults = Array.isArray(rowData?.local_results)
                                ? rowData.local_results
                                : Array.isArray(rowData?.normalized?.local_results)
                                    ? rowData.normalized.local_results
                                    : [];
                            const shoppingResults = Array.isArray(rowData?.shopping_results)
                                ? rowData.shopping_results
                                : Array.isArray(rowData?.normalized?.shopping_results)
                                    ? rowData.normalized.shopping_results
                                    : [];
                            const routeDomain = String(rowData?.route_decision?.intent_domain || '');
                            const weatherLike = id.includes('weather')
                                || /weather|天气/i.test(activeRow.agentName || '')
                                || /weather|天气/i.test(activeRow.summary || '')
                                || Array.isArray(rowData?.data?.forecast)
                                || Array.isArray(rowData?.forecast);

                            if (id.includes('hotel_booking')) {
                                return <HotelResultCard data={enrichedData} onOutboundLinkClick={handleOutboundLinkClick} />;
                            }
                            if (id.includes('flight_booking')) {
                                return <FlightResultCard data={enrichedData} onOutboundLinkClick={handleOutboundLinkClick} />;
                            }
                            if (localResults.length > 0 || routeDomain === 'local_life') {
                                return <LocalResultCard data={enrichedData} onOutboundLinkClick={handleOutboundLinkClick} />;
                            }
                            if (shoppingResults.length > 0 || routeDomain === 'ecommerce') {
                                return <ShoppingResultCard data={enrichedData} onOutboundLinkClick={handleOutboundLinkClick} />;
                            }
                            if (weatherLike) {
                                return <WeatherResultCard data={enrichedData} onOutboundLinkClick={handleOutboundLinkClick} />;
                            }
                            return (
                                <GenericAgentResultCard
                                    agentName={activeRow.agentName}
                                    agentType={id}
                                    data={enrichedData}
                                    latencyMs={activeRow.latencyMs}
                                    onOutboundLinkClick={handleOutboundLinkClick}
                                />
                            );
                        })()}

                        {activeRow && !activeRow.success && (
                            <div
                                className="rounded-xl p-3 text-xs"
                                style={{ backgroundColor: colors.bg2, border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
                            >
                                ❌ {activeRow.agentName} 执行失败：{activeRow.error || activeRow.summary}
                            </div>
                        )}

                        {/* Chat Preview (polished) */}
                        <ChatPreviewCard
                            userMessage={executionData.query || query}
                            assistantLines={assistantPreview.lines}
                            assistantLinks={assistantPreview.links}
                        />

                        {/* Smart Action Bar */}
                        <SmartActionBar
                            actions={[
                                {
                                    id: 'continue_filter',
                                    label: '继续筛选',
                                    icon: '🔍',
                                    onClick: () => runSmartQueryAction('continue_filter', 'discover'),
                                    disabled: discovering || executing,
                                },
                                {
                                    id: 'direct_only',
                                    label: '只看直飞',
                                    icon: '✈️',
                                    onClick: () => runSmartQueryAction('direct_only', 'execute_recommended'),
                                    disabled: discovering || executing,
                                },
                                {
                                    id: 'budget_800',
                                    label: '预算≤800',
                                    icon: '💰',
                                    onClick: () => runSmartQueryAction('budget_800', 'execute_recommended'),
                                    disabled: discovering || executing,
                                },
                            ]}
                        />

                        {/* Missing constraints */}
                        {missingConstraints.length > 0 && (
                            <div
                                className="rounded-xl p-3"
                                style={{ backgroundColor: colors.bg2, border: `1px solid ${mktColors.warningMuted}` }}
                            >
                                <div className="text-xs mb-2" style={{ color: mktColors.warning }}>
                                    ⚠️ 检测到缺少约束：{missingConstraints.join('、')}
                                </div>
                                <SmartActionBar
                                    actions={[
                                        {
                                            id: 'add_date',
                                            label: `填日期（${getDefaultTravelDate()}）`,
                                            icon: '📅',
                                            onClick: () => runSmartQueryAction('add_date', 'discover'),
                                            disabled: discovering || executing,
                                        },
                                        {
                                            id: 'add_budget',
                                            label: '填预算',
                                            icon: '💰',
                                            onClick: () => runSmartQueryAction('add_budget', 'discover'),
                                            disabled: discovering || executing,
                                        },
                                        {
                                            id: 'add_passengers',
                                            label: '填人数',
                                            icon: '👤',
                                            onClick: () => runSmartQueryAction('add_passengers', 'discover'),
                                            disabled: discovering || executing,
                                        },
                                    ]}
                                    style={{ padding: 0 }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* Candidate Discovery & Manual Execution — Collapsible */}
                {/* ============================================================ */}
                {data && (
                    <>
                        <button
                            onClick={() => setShowCandidates(!showCandidates)}
                            className="w-full flex items-center justify-between rounded-xl p-3 text-xs"
                            style={{
                                backgroundColor: colors.bg2,
                                border: `1px solid ${colors.border}`,
                                color: colors.text2,
                                cursor: 'pointer',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Bot size={14} style={{ color: colors.primary }} />
                                <span style={{ color: colors.text1, fontWeight: 500 }}>
                                    候选 Agent ({data.candidates.length})
                                </span>
                                {data.traceId && (
                                    <span style={{ color: colors.text3, fontFamily: 'monospace', fontSize: 10 }}>
                                        trace: {data.traceId.slice(0, 8)}
                                    </span>
                                )}
                            </div>
                            {showCandidates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showCandidates && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-end gap-2 px-1">
                                    <button
                                        onClick={selectAllCandidates}
                                        className="text-[11px] px-2 py-1 rounded"
                                        style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                    >
                                        全选
                                    </button>
                                    <button
                                        onClick={clearSelectedCandidates}
                                        className="text-[11px] px-2 py-1 rounded"
                                        style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                    >
                                        清空
                                    </button>
                                </div>
                                {data.candidates.length === 0 && (
                                    <div
                                        className="rounded-xl p-3 text-xs"
                                        style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, color: colors.text3 }}
                                    >
                                        无可用候选
                                    </div>
                                )}
                                {groupedCandidates.myAgents.length > 0 && (
                                    <div className="text-[11px] px-1" style={{ color: colors.text3 }}>
                                        我的 Agent
                                    </div>
                                )}
                                {groupedCandidates.myAgents.map((c) => {
                                    const isSelected = selectedAgentIds.includes(c.id);
                                    const meta = getAgentMeta(c.id);
                                    const monetization = getAgentMonetizationSummary(c);
                                    const scoreBarStyle = (value: number, color: string) => ({
                                        height: 3,
                                        borderRadius: 2,
                                        backgroundColor: `${color}20`,
                                        flex: 1,
                                        overflow: 'hidden' as const,
                                    });
                                    const scoreBarFill = (value: number, color: string) => ({
                                        height: '100%',
                                        width: `${Math.min(value * 100, 100)}%`,
                                        borderRadius: 2,
                                        backgroundColor: color,
                                        boxShadow: `0 0 6px ${color}60`,
                                        transition: 'width 0.5s ease',
                                    });
                                    return (
                                        <div
                                            key={`my_${c.id}`}
                                            onClick={() => toggleSelected(c.id)}
                                            className="rounded-xl p-3"
                                            style={{
                                                backgroundColor: isSelected ? `${techColors.cyan}08` : 'rgba(6,10,20,0.4)',
                                                border: `1px solid ${isSelected ? techColors.cyan : techColors.border}`,
                                                boxShadow: isSelected ? `0 0 15px ${techColors.cyan}20, inset 0 0 20px ${techColors.cyan}05` : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                backdropFilter: 'blur(8px)',
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2 gap-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span style={{ fontSize: 16 }}>{meta.icon}</span>
                                                    <div className="text-sm font-medium" style={{ color: techColors.text1, fontFamily: 'monospace' }}>{c.name}</div>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${techColors.green}20`, color: techColors.green, border: `1px solid ${techColors.green}30` }}>
                                                        已交付
                                                    </span>
                                                </div>
                                                <div className="text-xs font-mono font-bold" style={{ color: techColors.cyan, textShadow: `0 0 8px ${techColors.cyan}40` }}>
                                                    {c.total.toFixed(2)}
                                                </div>
                                            </div>
                                            {/* Score visualization bars */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                                {[
                                                    { label: 'FIT', value: c.fit, color: techColors.cyan },
                                                    { label: 'REL', value: c.reliabilityKnown ? c.reliability : 0, color: techColors.purple },
                                                    { label: 'FRESH', value: c.freshness, color: techColors.green },
                                                    { label: 'LAT', value: c.latencyKnown ? c.latency : 0, color: techColors.gold },
                                                    { label: 'TWIN', value: Number.isFinite(c.twinBoost) ? c.twinBoost! : 0, color: techColors.purple },
                                                ].map((s) => (
                                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 9, color: techColors.text3, fontFamily: 'monospace', width: 36, textAlign: 'right' }}>{s.label}</span>
                                                        <div style={scoreBarStyle(s.value, s.color)}>
                                                            <div style={scoreBarFill(s.value, s.color)} />
                                                        </div>
                                                        <span style={{ fontSize: 10, color: s.color, fontFamily: 'monospace', width: 30, textAlign: 'right' }}>
                                                            {s.value > 0 ? s.value.toFixed(2) : '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {(typeof monetization.pricePerUseCny === 'number' || typeof monetization.revenueTotalCny === 'number') && (
                                                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: techColors.text3, marginTop: 8, fontFamily: 'monospace' }}>
                                                    {typeof monetization.pricePerUseCny === 'number' && (
                                                        <span>单次 ¥{monetization.pricePerUseCny}</span>
                                                    )}
                                                    {typeof monetization.revenueTotalCny === 'number' && (
                                                        <span style={{ color: techColors.gold }}>累计收益 ¥{monetization.revenueTotalCny.toFixed(0)}</span>
                                                    )}
                                                    {typeof monetization.usageCount === 'number' && (
                                                        <span>使用 {monetization.usageCount}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {groupedCandidates.marketAgents.length > 0 && (
                                    <div className="text-[11px] px-1 pt-1" style={{ color: colors.text3 }}>
                                        市场 Agent
                                    </div>
                                )}
                                {groupedCandidates.marketAgents.map((c) => {
                                    const isSelected = selectedAgentIds.includes(c.id);
                                    const meta = getAgentMeta(c.id);
                                    const scoreBarStyle = (value: number, color: string) => ({
                                        height: 3,
                                        borderRadius: 2,
                                        backgroundColor: `${color}20`,
                                        flex: 1,
                                        overflow: 'hidden' as const,
                                    });
                                    const scoreBarFill = (value: number, color: string) => ({
                                        height: '100%',
                                        width: `${Math.min(value * 100, 100)}%`,
                                        borderRadius: 2,
                                        backgroundColor: color,
                                        boxShadow: `0 0 6px ${color}60`,
                                        transition: 'width 0.5s ease',
                                    });
                                    return (
                                        <div
                                            key={`mkt_${c.id}`}
                                            onClick={() => toggleSelected(c.id)}
                                            className="rounded-xl p-3"
                                            style={{
                                                backgroundColor: isSelected ? `${techColors.cyan}08` : 'rgba(6,10,20,0.4)',
                                                border: `1px solid ${isSelected ? techColors.cyan : techColors.border}`,
                                                boxShadow: isSelected ? `0 0 15px ${techColors.cyan}20, inset 0 0 20px ${techColors.cyan}05` : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                backdropFilter: 'blur(8px)',
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2 gap-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span style={{ fontSize: 16 }}>{meta.icon}</span>
                                                    <div className="text-sm font-medium" style={{ color: techColors.text1, fontFamily: 'monospace' }}>{c.name}</div>
                                                    <span
                                                        className="text-[10px] px-1.5 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: isSelected ? `${techColors.cyan}20` : `${techColors.purple}15`,
                                                            color: isSelected ? techColors.cyan : techColors.text3,
                                                            border: `1px solid ${isSelected ? `${techColors.cyan}40` : 'transparent'}`,
                                                        }}
                                                    >
                                                        {isSelected ? '已选' : c.source}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-mono font-bold" style={{ color: techColors.cyan, textShadow: `0 0 8px ${techColors.cyan}40` }}>
                                                    {c.total.toFixed(2)}
                                                </div>
                                            </div>
                                            {/* Score visualization bars */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                                {[
                                                    { label: 'FIT', value: c.fit, color: techColors.cyan },
                                                    { label: 'REL', value: c.reliabilityKnown ? c.reliability : 0, color: techColors.purple },
                                                    { label: 'FRESH', value: c.freshness, color: techColors.green },
                                                    { label: 'LAT', value: c.latencyKnown ? c.latency : 0, color: techColors.gold },
                                                    { label: 'TWIN', value: Number.isFinite(c.twinBoost) ? c.twinBoost! : 0, color: techColors.purple },
                                                ].map((s) => (
                                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 9, color: techColors.text3, fontFamily: 'monospace', width: 36, textAlign: 'right' }}>{s.label}</span>
                                                        <div style={scoreBarStyle(s.value, s.color)}>
                                                            <div style={scoreBarFill(s.value, s.color)} />
                                                        </div>
                                                        <span style={{ fontSize: 10, color: s.color, fontFamily: 'monospace', width: 30, textAlign: 'right' }}>
                                                            {s.value > 0 ? s.value.toFixed(2) : '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Manual execution results */}
                                {(executionData || executing) && (
                                    <div className="space-y-2">
                                        {executing && (
                                            <div
                                                className="rounded-xl p-3 text-xs flex items-center gap-2"
                                                style={{ backgroundColor: colors.bg2, border: `1px solid ${mktColors.primaryMuted}`, color: colors.text2 }}
                                            >
                                                <Loader2 size={14} className="animate-spin" style={{ color: mktColors.primary }} />
                                                正在执行已选 agent，请稍候...
                                            </div>
                                        )}
                                        {executionData?.results.map((row) => (
                                            <div
                                                key={`exec_${row.agentId}`}
                                                className="rounded-xl p-3"
                                                style={{
                                                    backgroundColor: colors.bg2,
                                                    border: `1px solid ${row.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span style={{ fontSize: 14 }}>{getAgentMeta(row.agentId).icon}</span>
                                                        <div className="text-sm font-medium" style={{ color: colors.text1 }}>
                                                            {row.agentName}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px]" style={{ color: colors.text3 }}>{row.latencyMs}ms</span>
                                                        <span
                                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                                            style={{
                                                                backgroundColor: row.success ? mktColors.positiveMuted : 'rgba(239,68,68,0.15)',
                                                                color: row.success ? mktColors.positive : mktColors.danger,
                                                            }}
                                                        >
                                                            {row.success ? '✓ 成功' : '✗ 失败'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs" style={{ color: colors.text2 }}>
                                                    {row.summary}
                                                </div>
                                                {row.error && (
                                                    <div className="text-xs mt-1" style={{ color: colors.danger }}>
                                                        {row.error}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {data.rejected.length > 0 && showCandidates && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-medium uppercase tracking-wider px-1" style={{ color: 'rgba(239,68,68,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                    ⚠ REJECTED ({data.rejected.length})
                                </h4>
                                {data.rejected.slice(0, 5).map((r) => (
                                    <div
                                        key={`r_${r.id}`}
                                        className="rounded-xl p-2"
                                        style={{
                                            backgroundColor: 'rgba(239,68,68,0.05)',
                                            border: '1px solid rgba(239,68,68,0.15)',
                                            backdropFilter: 'blur(4px)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 text-xs" style={{ color: techColors.text1 }}>
                                            <ShieldAlert size={12} style={{ color: 'rgba(239,68,68,0.6)' }} />
                                            <span style={{ fontFamily: 'monospace' }}>{r.name}</span>
                                            <span style={{ color: 'rgba(239,68,68,0.7)', marginLeft: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
                                                {r.rejectReason || 'rejected'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div
                            className="rounded-xl p-3 space-y-2"
                            style={{ backgroundColor: colors.bg2, border: `1px solid ${mktColors.warningMuted}` }}
                        >
                            <div className="text-sm font-medium" style={{ color: colors.text1 }}>
                                候选不满足？发布单独需求到 LIX
                            </div>
                            <div className="text-xs" style={{ color: colors.text2 }}>
                                即使候选 Agent 存在，你也可以单独发布更精细的需求，由专家或 Agent 协同网络定向交付。
                            </div>
                            <label className="space-y-1 block">
                                <div className="text-[11px]" style={{ color: colors.text3 }}>
                                    未满足点（可选）
                                </div>
                                <textarea
                                    value={standaloneRequirementNote}
                                    onChange={(event) => setStandaloneRequirementNote(event.target.value)}
                                    className="w-full rounded-lg px-3 py-2 text-xs"
                                    style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 62 }}
                                    placeholder="例如：需要可执行步骤、预算控制、必须支持实时数据和证据链接"
                                />
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={quickPublishStandaloneRequirement}
                                    disabled={publishingDemand}
                                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 disabled:opacity-60"
                                    style={{ backgroundColor: colors.warning, color: '#0F172A' }}
                                >
                                    {publishingDemand ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                    发布单独需求
                                </button>
                                <button
                                    onClick={publishRequirementBySelectedAgent}
                                    disabled={publishingDemand || selectedAgentIds.length === 0}
                                    className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                                    style={{ backgroundColor: colors.primaryMuted, color: colors.primary, border: `1px solid ${colors.primary}` }}
                                >
                                    由已选Agent发布
                                </button>
                                <button
                                    onClick={openStandaloneCustomRequirement}
                                    disabled={publishingDemand}
                                    className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                                    style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                                >
                                    定制后发布
                                </button>
                                {solutionIntentId && onOpenLixMarket && (
                                    <button
                                        onClick={() => onOpenLixMarket(solutionIntentId)}
                                        className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                                        style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                                    >
                                        查看已发布需求
                                        <ExternalLink size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {showCustomRequirementModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ backgroundColor: 'rgba(2, 6, 15, 0.85)', backdropFilter: 'blur(12px)' }}
                    >
                        <div
                            className="w-full max-w-2xl rounded-xl p-4 space-y-3"
                            style={{
                                backgroundColor: 'rgba(10, 18, 35, 0.95)',
                                border: `1px solid ${techColors.cyan}25`,
                                boxShadow: `0 0 40px ${techColors.cyan}10, 0 20px 60px rgba(0,0,0,0.5)`,
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="text-sm font-semibold" style={{ color: colors.text1 }}>
                                定制化需求发布到 LIX
                            </div>
                            <div className="text-xs leading-5" style={{ color: colors.text2 }}>
                                你可以补充预算、交付时效、必须能力和验收标准，帮助专家或 Agent 协同网络更快给出可执行方案。
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>需求标题（可选）</div>
                                    <input
                                        value={customRequirementDraft.title}
                                        onChange={(event) => updateCustomRequirementDraft({ title: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1 }}
                                        placeholder="例如：上海本地生活智能助手"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>预算上限（CNY）</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={customRequirementDraft.budgetMaxCny}
                                        onChange={(event) => updateCustomRequirementDraft({ budgetMaxCny: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1 }}
                                        placeholder="例如：1200"
                                    />
                                </label>
                                <label className="space-y-1 md:col-span-2">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>业务目标（可选）</div>
                                    <textarea
                                        value={customRequirementDraft.objective}
                                        onChange={(event) => updateCustomRequirementDraft({ objective: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 74 }}
                                        placeholder="例如：需要同时提供门店筛选、地图导航、价格对比，并输出可执行步骤"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>必须能力（逗号/换行分隔）</div>
                                    <textarea
                                        value={customRequirementDraft.mustHave}
                                        onChange={(event) => updateCustomRequirementDraft({ mustHave: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 74 }}
                                        placeholder="local_search, live_search, weather_query"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>排除条件（逗号/换行分隔）</div>
                                    <textarea
                                        value={customRequirementDraft.exclusions}
                                        onChange={(event) => updateCustomRequirementDraft({ exclusions: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 74 }}
                                        placeholder="例如：不使用需要登录的平台，不返回广告结果"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>期望交付时效（小时）</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={customRequirementDraft.expectedDeliveryHours}
                                        onChange={(event) => updateCustomRequirementDraft({ expectedDeliveryHours: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1 }}
                                        placeholder="例如：6"
                                    />
                                </label>
                                <label className="space-y-1 md:col-span-2">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>验收标准（逗号/换行分隔）</div>
                                    <textarea
                                        value={customRequirementDraft.successCriteria}
                                        onChange={(event) => updateCustomRequirementDraft({ successCriteria: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 68 }}
                                        placeholder="例如：返回至少 5 个候选、每个候选含可点击链接、输出推荐理由"
                                    />
                                </label>
                                <label className="space-y-1 md:col-span-2">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>补充备注（可选）</div>
                                    <textarea
                                        value={customRequirementDraft.notes}
                                        onChange={(event) => updateCustomRequirementDraft({ notes: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 56 }}
                                        placeholder="例如：优先中文输出，支持移动端展示"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setShowCustomRequirementModal(false)}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={resetCustomRequirementDraft}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: 'rgba(14,165,233,0.1)', color: colors.primary, border: `1px solid ${colors.primaryMuted}` }}
                                >
                                    清空定制项
                                </button>
                                <button
                                    onClick={confirmCustomRequirementAndPublish}
                                    className="px-3 py-2 rounded text-xs font-medium"
                                    style={{ backgroundColor: colors.warning, color: '#0F172A' }}
                                >
                                    保存并发布
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showConsentModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ backgroundColor: 'rgba(2, 6, 15, 0.85)', backdropFilter: 'blur(12px)' }}
                    >
                        <div
                            className="w-full max-w-md rounded-xl p-4 space-y-3"
                            style={{
                                backgroundColor: 'rgba(10, 18, 35, 0.95)',
                                border: `1px solid ${techColors.purple}25`,
                                boxShadow: `0 0 40px ${techColors.purple}10, 0 20px 60px rgba(0,0,0,0.5)`,
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="text-sm font-semibold" style={{ color: colors.text1 }}>
                                发布到 LIX 前确认数字分身授权
                            </div>
                            <div className="text-xs leading-5" style={{ color: colors.text2 }}>
                                将附带你的数字分身画像（全量 Enhanced Avatar）用于专家方案匹配。仅发送到本项目服务端，不直连第三方。
                            </div>
                            <div className="text-[11px]" style={{ color: colors.text3 }}>
                                当前授权状态：{consentState}
                            </div>
                            {pendingRequesterAgentId && (
                                <div className="text-[11px]" style={{ color: colors.text3 }}>
                                    发布主体：Agent（{resolveAgentNameById(pendingRequesterAgentId) || pendingRequesterAgentId}）
                                </div>
                            )}
                            <label className="flex items-center gap-2 text-xs" style={{ color: colors.text2 }}>
                                <input
                                    type="checkbox"
                                    checked={rememberConsent}
                                    onChange={(event) => setRememberConsent(event.target.checked)}
                                />
                                同意并记住（后续自动发布）
                            </label>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => {
                                        setShowConsentModal(false);
                                        setPendingPublishDraft(null);
                                        setPendingRequesterAgentId(null);
                                    }}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={rejectProfileShare}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: colors.danger, border: `1px solid rgba(239,68,68,0.3)` }}
                                >
                                    拒绝授权
                                </button>
                                <button
                                    onClick={confirmPublishWithConsent}
                                    className="px-3 py-2 rounded text-xs font-medium"
                                    style={{ backgroundColor: colors.warning, color: '#0F172A' }}
                                >
                                    同意并发布
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </HexGridBackground >
    );
};

export default AgentMarketplacePanel;

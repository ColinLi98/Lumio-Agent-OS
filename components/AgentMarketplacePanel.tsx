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
            summary: String(row?.summary || (row?.success ? 'Execution completed' : 'Execution failed')),
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
    return `https://www.google.com/search?q=${encodeURIComponent(`${loc} weather`)}`;
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
                title: item?.title || 'View search result',
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
                title: item?.title || 'View evidence',
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
                title: item?.title || 'Open booking',
                url: item.url,
                caption: item?.provider,
            });
        }
    });

    const flights = Array.isArray(data?.data?.flights) ? data.data.flights : [];
    if (flights.length > 0) {
        const best = flights[0];
        const airline = typeof best?.airline === 'string' ? best.airline : 'Airline';
        const price = Number.isFinite(best?.price) ? `¥${best.price}` : '';
        const route = [data?.data?.origin, data?.data?.destination].filter(Boolean).join(' → ');
        highlights.push(`Flight recommendation: ${airline}${price ? ` · ${price}` : ''}${route ? ` · ${route}` : ''}`);
        if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim() && isSafeExternalUrl(best.bookingUrl)) {
            links.push({ title: `${airline} booking link`, url: best.bookingUrl });
        }
    }

    const hotels = Array.isArray(data?.data?.hotels) ? data.data.hotels : [];
    if (hotels.length > 0) {
        const best = hotels[0];
        const hotelName = typeof best?.name === 'string' ? best.name : 'Hotel';
        const price = Number.isFinite(best?.pricePerNight) ? `¥${best.pricePerNight}/night` : '';
        highlights.push(`Hotel recommendation: ${hotelName}${price ? ` · ${price}` : ''}`);
        if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim() && isSafeExternalUrl(best.bookingUrl)) {
            links.push({ title: `${hotelName} booking link`, url: best.bookingUrl });
        }
    }

    const comparisonLinks = data?.data?.comparisonLinks;
    if (comparisonLinks && typeof comparisonLinks === 'object') {
        Object.values(comparisonLinks).slice(0, 3).forEach((item: any) => {
            if (typeof item?.url === 'string' && item.url.trim()) {
                if (!isSafeExternalUrl(item.url)) return;
                links.push({
                    title: item?.name || 'Price comparison',
                    url: item.url,
                    caption: 'Price compare',
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
        highlights.push(`Local recommendation: ${top?.name || 'Place'}${top?.rating ? ` · ${top.rating}⭐` : ''}`);
        const localLink = top?.map_url || top?.website;
        if (typeof localLink === 'string' && localLink.trim() && isSafeExternalUrl(localLink)) {
            links.push({ title: `${top?.name || 'Place'} directions`, url: localLink });
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
        highlights.push(`Product comparison: ${top?.title || 'Product'}${priceText ? ` · ${priceText}` : ''}`);
        if (typeof top?.url === 'string' && top.url.trim() && isSafeExternalUrl(top.url)) {
            links.push({ title: `${top?.title || 'Product'} link`, url: top.url });
        }
    }

    const weatherData = data?.data || {};
    const forecast = Array.isArray(weatherData?.forecast) ? weatherData.forecast : [];
    if (forecast.length > 0) {
        const today = forecast[0];
        const location = String(weatherData?.locationCN || weatherData?.location || '').trim() || 'Destination';
        const tempText = today?.temp || (
            Number.isFinite(today?.tempMin) && Number.isFinite(today?.tempMax)
                ? `${today.tempMin}-${today.tempMax}°C`
                : ''
        );
        highlights.push(`Weather: ${location} · ${today?.condition || 'Pending'}${tempText ? ` · ${tempText}` : ''}`);
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
                title: url.includes('windy.com') ? 'Weather radar' : `${location} weather`,
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
            return /(continue filtering)/i.test(normalized) ? normalized : `${normalized}, continue filtering for better options`;
        case 'direct_only':
            return /(direct|nonstop)/i.test(normalized) ? normalized : `${normalized}, direct flights only`;
        case 'budget_800':
            return /(budget|¥|￥)\s*800|800\s*(cny|yuan)/i.test(normalized) ? normalized : `${normalized}, budget within CNY 800`;
        case 'add_date':
            return /\d{4}-\d{2}-\d{2}|today|tomorrow|day after tomorrow/i.test(normalized) ? normalized : `${normalized}, departure date ${date}`;
        case 'add_budget':
            return /(budget|¥|￥)\s*\d+|\d+\s*(cny|yuan)/i.test(normalized) ? normalized : `${normalized}, budget within CNY 1500`;
        case 'add_passengers':
            return /\d+\s*(passenger|people|person)/i.test(normalized) ? normalized : `${normalized}, 1 passenger`;
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
    const genericIndustries = new Set(['General Business', '通用商业']);
    if (goal) parts.push(`Business goal: ${goal}`);
    if (budget) parts.push(`Budget: ${budget}`);
    if (deadline) parts.push(`Deadline: ${deadline}`);
    if (industry && !genericIndustries.has(industry)) parts.push(`Industry: ${industry}`);
    if (parts.length === 0) return normalized;
    return `${normalized} (${parts.join('; ')})`;
}

interface AgentMarketplacePanelProps {
    onOpenLixMarket?: (intentId: string) => void;
}

export const AgentMarketplacePanel: React.FC<AgentMarketplacePanelProps> = ({ onOpenLixMarket }) => {
    const userId = useMemo(() => getCurrentUserId(), []);
    const [query, setQuery] = useState('Search flights from Beijing to Shanghai');
    const [businessGoal, setBusinessGoal] = useState('');
    const [budgetConstraint, setBudgetConstraint] = useState('');
    const [deadlineConstraint, setDeadlineConstraint] = useState('');
    const [industryScenario, setIndustryScenario] = useState('General Business');
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
                throw new Error('Privacy mode is on. Consent is required before publishing with the digital twin profile to LIX.');
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
            setExecutionNotice(`Expert request published to LIX (intent: ${createdIntentId || 'created'})`);
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
        setError('Publish canceled: you declined digital twin authorization.');
    };

    const updateCustomRequirementDraft = (patch: Partial<CustomRequirementDraft>) => {
        setCustomRequirementDraft((prev) => ({ ...prev, ...patch }));
    };

    const resetCustomRequirementDraft = () => {
        setCustomRequirementDraft(EMPTY_CUSTOM_REQUIREMENT_DRAFT);
    };

    const startCustomRequirementPublishFlow = async () => {
        if (!query.trim()) {
            setError('Please enter a user request before configuring custom requirements.');
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
            ? `${currentNotes}\nCandidate gaps: ${note}`
            : `Candidate gaps: ${note}`;
        return {
            ...customRequirementDraft,
            notes: merged,
        };
    };

    const quickPublishStandaloneRequirement = async () => {
        if (!query.trim()) {
            setError('Please enter a user request before publishing a standalone requirement.');
            return;
        }
        const standaloneDraft = buildStandalonePublishDraft();
        setCustomRequirementDraft(standaloneDraft);
        await startPublishFlow(standaloneDraft);
    };

    const publishRequirementBySelectedAgent = async () => {
        if (!query.trim()) {
            setError('Please enter a user request before publishing a standalone requirement.');
            return;
        }
        if (selectedAgentIds.length === 0) {
            setError('Please select at least 1 candidate agent before initiating a collaborative requirement.');
            return;
        }
        const requesterAgentId = selectedAgentIds[0];
        const standaloneDraft = buildStandalonePublishDraft();
        setCustomRequirementDraft(standaloneDraft);
        await startPublishFlow(standaloneDraft, requesterAgentId);
    };

    const openStandaloneCustomRequirement = () => {
        if (!query.trim()) {
            setError('Please enter a user request before configuring custom requirements.');
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
        setExecutionNotice(`Running ${agentIds.length} agents. Please wait...`);

        try {
            const body: Record<string, any> = {
                query: effectiveQuery,
                selected_agent_ids: agentIds,
                digital_twin_context: buildMarketplaceTwinContext(),
                locale: 'en-US',
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
                ? ` · Market usage ${matchedAgents}${revenueDelta > 0 ? `, revenue +¥${revenueDelta.toFixed(0)}` : ''}`
                : '';
            setExecutionNotice(`Execution completed: success ${normalized.successCount} / ${normalized.selectedCount}${usageNotice}`);
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
                setError(`Execution timed out (>${MANUAL_EXECUTE_TIMEOUT_MS / 1000}s). Reduce selected agents and retry.`);
                setExecutionNotice('Execution timed out. Reduce selected agents and retry.');
            } else {
                setError(err instanceof Error ? err.message : String(err));
                setExecutionNotice('Execution failed. Check the error and retry.');
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
                                    Quick Start
                                </span>
                            </div>
                            <div className="text-xs leading-5" style={{ color: techColors.text2, fontFamily: 'monospace', fontSize: 11 }}>
                                1. Enter request → 2. Find agents → 3. Run recommended/selected
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                    onClick={() => {
                                        setQuery('Search flights from Beijing to Shanghai');
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
                                    Flight example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Help with recruiting: source roles, optimize resume, benchmark salary');
                                        setDomainHint('recruitment');
                                        setCapInput('job_sourcing, resume_optimization, salary_benchmark');
                                        setRequireRealtime(false);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded-full"
                                    style={{ backgroundColor: techColors.cyanMuted, color: techColors.cyan, border: `1px solid ${techColors.cyan}30`, fontFamily: 'monospace', transition: 'all 0.2s', cursor: 'pointer' }}
                                >
                                    Recruiting example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Find a two-night hotel in Shanghai this weekend');
                                        setDomainHint('travel');
                                        setCapInput('hotel_search, live_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Hotel example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Find highly rated coffee shops near the Bund in Shanghai');
                                        setDomainHint('local_service');
                                        setCapInput('local_search, live_search, web_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Local life example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Find highly rated restaurants near the Bund in Shanghai');
                                        setDomainHint('local_service');
                                        setCapInput('restaurant_search, local_search');
                                        setRequireRealtime(false);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Restaurant example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Find scenic places to visit in Shanghai this weekend');
                                        setDomainHint('travel');
                                        setCapInput('attraction_search, local_search');
                                        setRequireRealtime(false);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Attractions example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Check tomorrow weather in Shanghai');
                                        setDomainHint('travel');
                                        setCapInput('weather_query');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Weather example
                                </button>
                                <button
                                    onClick={() => {
                                        setQuery('Compare prices for iPhone 15 128G');
                                        setDomainHint('shopping');
                                        setCapInput('shopping_search, price_compare, live_search');
                                        setRequireRealtime(true);
                                        setRequireEvidence(false);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Shopping comparison example
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
                                <span style={{ color: techColors.text1, fontWeight: 600, letterSpacing: '0.03em' }}>Digital twin context is included</span>
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
                                    ▸ Market Hotness (7d)
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
                                                Hotness {row.hotness_score.toFixed(2)}
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
                                    ▸ Consultant Mode
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>Business Goal</label>
                                        <input
                                            value={businessGoal}
                                            onChange={(e) => setBusinessGoal(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                            placeholder="e.g. Improve store conversion"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>Budget Range</label>
                                        <input
                                            value={budgetConstraint}
                                            onChange={(e) => setBudgetConstraint(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                            placeholder="e.g. ¥2000/month"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>Deadline</label>
                                        <input
                                            value={deadlineConstraint}
                                            onChange={(e) => setDeadlineConstraint(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                            placeholder="e.g. within 72 hours"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>Industry Scenario</label>
                                        <select
                                            value={industryScenario}
                                            onChange={(e) => setIndustryScenario(e.target.value)}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                        >
                                            <option value="General Business">General Business</option>
                                            <option value="Local Services">Local Services</option>
                                            <option value="Recruiting & HR">Recruiting & HR</option>
                                            <option value="Cross-border Trade">Cross-border Trade</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Content Growth">Content Growth</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[11px]" style={{ color: techColors.text3, fontFamily: 'monospace' }}>LIX Delivery Preference</label>
                                        <select
                                            value={deliveryModePreference}
                                            onChange={(e) => setDeliveryModePreference(e.target.value as 'agent_collab' | 'human_expert' | 'hybrid')}
                                            className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs focus:outline-none"
                                            style={{ backgroundColor: 'rgba(6,10,20,0.6)', color: techColors.text1, border: `1px solid ${techColors.cyan}20`, fontFamily: 'monospace' }}
                                        >
                                            <option value="agent_collab">Agent collaboration first</option>
                                            <option value="human_expert">Human expert first</option>
                                            <option value="hybrid">Hybrid first</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <label className="text-xs font-medium" style={{ color: techColors.cyan, fontFamily: 'monospace', letterSpacing: '0.05em' }}>▸ User Request</label>
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(event) => {
                                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !discovering && !executing) {
                                        event.preventDefault();
                                        void onDiscover();
                                    }
                                }}
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
                                Example: flight Beijing → Shanghai tomorrow / find frontend roles / book hotel near Shanghai Bund
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: techColors.text3, fontFamily: 'monospace' }}>
                                Shortcut: Ctrl/Cmd + Enter to discover agents
                            </p>
                        </div>

                        <details
                            className="rounded-lg p-2"
                            style={{ backgroundColor: colors.bg1, border: `1px solid ${colors.border}` }}
                        >
                            <summary className="text-xs cursor-pointer select-none" style={{ color: colors.text2 }}>
                                Advanced Filters (technical mode, optional)
                            </summary>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="text-xs font-medium" style={{ color: colors.text3 }}>Domain</label>
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
                                    <label className="text-xs font-medium" style={{ color: colors.text3 }}>Capability Tags</label>
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
                                    Need real-time data
                                </label>
                                <label className="flex items-center gap-2 text-xs" style={{ color: colors.text2 }}>
                                    <input
                                        type="checkbox"
                                        checked={requireEvidence}
                                        onChange={(e) => setRequireEvidence(e.target.checked)}
                                    />
                                    Need evidence links
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
                                1. Discover Agents
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
                                2. Run Recommended ({recommendedAgentIds.length})
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
                                Run Selected ({selectedAgentIds.length})
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
                            Insufficient market coverage, publish an expert request
                        </div>
                        <div className="text-xs mb-3" style={{ color: colors.text2 }}>
                            If candidates are insufficient or execution fails, publish to LIX for expert delivery and review.
                        </div>
                        {hasCustomRequirement(customRequirementDraft) && (
                            <div className="text-[11px] mb-3" style={{ color: colors.text3 }}>
                                Custom requirements configured and will be included.
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
                                Publish to LIX
                            </button>
                            <button
                                onClick={startCustomRequirementPublishFlow}
                                disabled={publishingDemand}
                                className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                                style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                            >
                                Custom Requirements
                            </button>
                            {solutionIntentId && onOpenLixMarket && (
                                <button
                                    onClick={() => onOpenLixMarket(solutionIntentId)}
                                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                                    style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                                >
                                    View requirement details
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
                                || /weather/i.test(activeRow.agentName || '')
                                || /weather/i.test(activeRow.summary || '')
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
                                ❌ {activeRow.agentName} failed: {activeRow.error || activeRow.summary}
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
                                    label: 'Continue filtering',
                                    icon: '🔍',
                                    onClick: () => runSmartQueryAction('continue_filter', 'discover'),
                                    disabled: discovering || executing,
                                },
                                {
                                    id: 'direct_only',
                                    label: 'Direct only',
                                    icon: '✈️',
                                    onClick: () => runSmartQueryAction('direct_only', 'execute_recommended'),
                                    disabled: discovering || executing,
                                },
                                {
                                    id: 'budget_800',
                                    label: 'Budget <= 800',
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
                                    ⚠️ Missing constraints detected: {missingConstraints.join(', ')}
                                </div>
                                <SmartActionBar
                                    actions={[
                                        {
                                            id: 'add_date',
                                            label: `Add date (${getDefaultTravelDate()})`,
                                            icon: '📅',
                                            onClick: () => runSmartQueryAction('add_date', 'discover'),
                                            disabled: discovering || executing,
                                        },
                                        {
                                            id: 'add_budget',
                                            label: 'Add budget',
                                            icon: '💰',
                                            onClick: () => runSmartQueryAction('add_budget', 'discover'),
                                            disabled: discovering || executing,
                                        },
                                        {
                                            id: 'add_passengers',
                                            label: 'Add passengers',
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
                                    Candidate Agents ({data.candidates.length})
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
                                        Select all
                                    </button>
                                    <button
                                        onClick={clearSelectedCandidates}
                                        className="text-[11px] px-2 py-1 rounded"
                                        style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                    >
                                        Clear
                                    </button>
                                </div>
                                {data.candidates.length === 0 && (
                                    <div
                                        className="rounded-xl p-3 text-xs"
                                        style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, color: colors.text3 }}
                                    >
                                        No available candidates
                                    </div>
                                )}
                                {groupedCandidates.myAgents.length > 0 && (
                                    <div className="text-[11px] px-1" style={{ color: colors.text3 }}>
                                        My Agents
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
                                                        Delivered
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
                                                        <span>Per use ¥{monetization.pricePerUseCny}</span>
                                                    )}
                                                    {typeof monetization.revenueTotalCny === 'number' && (
                                                        <span style={{ color: techColors.gold }}>Total revenue ¥{monetization.revenueTotalCny.toFixed(0)}</span>
                                                    )}
                                                    {typeof monetization.usageCount === 'number' && (
                                                        <span>Usage {monetization.usageCount}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {groupedCandidates.marketAgents.length > 0 && (
                                    <div className="text-[11px] px-1 pt-1" style={{ color: colors.text3 }}>
                                        Market Agents
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
                                                        {isSelected ? 'Selected' : c.source}
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
                                                Running selected agents, please wait...
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
                                                            {row.success ? '✓ Success' : '✗ Failed'}
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
                                Candidates not enough? Publish a standalone requirement to LIX
                            </div>
                            <div className="text-xs" style={{ color: colors.text2 }}>
                                Even with candidates, you can publish a more specific requirement for targeted expert or agent-network delivery.
                            </div>
                            <label className="space-y-1 block">
                                <div className="text-[11px]" style={{ color: colors.text3 }}>
                                    Gaps not covered (optional)
                                </div>
                                <textarea
                                    value={standaloneRequirementNote}
                                    onChange={(event) => setStandaloneRequirementNote(event.target.value)}
                                    className="w-full rounded-lg px-3 py-2 text-xs"
                                    style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 62 }}
                                    placeholder="e.g. Need executable steps, budget control, real-time data and evidence links"
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
                                    Publish standalone requirement
                                </button>
                                <button
                                    onClick={publishRequirementBySelectedAgent}
                                    disabled={publishingDemand || selectedAgentIds.length === 0}
                                    className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                                    style={{ backgroundColor: colors.primaryMuted, color: colors.primary, border: `1px solid ${colors.primary}` }}
                                >
                                    Publish by selected agent
                                </button>
                                <button
                                    onClick={openStandaloneCustomRequirement}
                                    disabled={publishingDemand}
                                    className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                                    style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                                >
                                    Customize then publish
                                </button>
                                {solutionIntentId && onOpenLixMarket && (
                                    <button
                                        onClick={() => onOpenLixMarket(solutionIntentId)}
                                        className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                                        style={{ backgroundColor: colors.bg3, color: colors.text1, border: `1px solid ${colors.border}` }}
                                    >
                                        View published requirement
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
                                Publish custom requirements to LIX
                            </div>
                            <div className="text-xs leading-5" style={{ color: colors.text2 }}>
                                Add budget, delivery time, must-have capabilities, and acceptance criteria to get executable plans faster.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Requirement title (optional)</div>
                                    <input
                                        value={customRequirementDraft.title}
                                        onChange={(event) => updateCustomRequirementDraft({ title: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1 }}
                                        placeholder="e.g. Shanghai local-life intelligent assistant"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Budget ceiling (CNY)</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={customRequirementDraft.budgetMaxCny}
                                        onChange={(event) => updateCustomRequirementDraft({ budgetMaxCny: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1 }}
                                        placeholder="e.g. 1200"
                                    />
                                </label>
                                <label className="space-y-1 md:col-span-2">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Business goal (optional)</div>
                                    <textarea
                                        value={customRequirementDraft.objective}
                                        onChange={(event) => updateCustomRequirementDraft({ objective: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 74 }}
                                        placeholder="e.g. Provide store filtering, map directions, price comparison, and executable steps"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Must-have capabilities (comma/newline)</div>
                                    <textarea
                                        value={customRequirementDraft.mustHave}
                                        onChange={(event) => updateCustomRequirementDraft({ mustHave: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 74 }}
                                        placeholder="local_search, live_search, weather_query"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Exclusions (comma/newline)</div>
                                    <textarea
                                        value={customRequirementDraft.exclusions}
                                        onChange={(event) => updateCustomRequirementDraft({ exclusions: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 74 }}
                                        placeholder="e.g. No login-required platforms, no ad results"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Expected delivery time (hours)</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={customRequirementDraft.expectedDeliveryHours}
                                        onChange={(event) => updateCustomRequirementDraft({ expectedDeliveryHours: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1 }}
                                        placeholder="e.g. 6"
                                    />
                                </label>
                                <label className="space-y-1 md:col-span-2">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Acceptance criteria (comma/newline)</div>
                                    <textarea
                                        value={customRequirementDraft.successCriteria}
                                        onChange={(event) => updateCustomRequirementDraft({ successCriteria: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 68 }}
                                        placeholder="e.g. Return at least 5 options, each with clickable links and rationale"
                                    />
                                </label>
                                <label className="space-y-1 md:col-span-2">
                                    <div className="text-[11px]" style={{ color: colors.text3 }}>Additional notes (optional)</div>
                                    <textarea
                                        value={customRequirementDraft.notes}
                                        onChange={(event) => updateCustomRequirementDraft({ notes: event.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                        style={{ backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: colors.text1, minHeight: 56 }}
                                        placeholder="e.g. Prefer English output, optimized for mobile display"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setShowCustomRequirementModal(false)}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2, border: `1px solid ${colors.border}` }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={resetCustomRequirementDraft}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: 'rgba(14,165,233,0.1)', color: colors.primary, border: `1px solid ${colors.primaryMuted}` }}
                                >
                                    Clear custom fields
                                </button>
                                <button
                                    onClick={confirmCustomRequirementAndPublish}
                                    className="px-3 py-2 rounded text-xs font-medium"
                                    style={{ backgroundColor: colors.warning, color: '#0F172A' }}
                                >
                                    Save and publish
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
                                Confirm digital twin authorization before publishing to LIX
                            </div>
                            <div className="text-xs leading-5" style={{ color: colors.text2 }}>
                                Your digital twin profile (full Enhanced Avatar) will be included for expert matching. Data is sent only to this project's backend.
                            </div>
                            <div className="text-[11px]" style={{ color: colors.text3 }}>
                                Current consent status: {consentState}
                            </div>
                            {pendingRequesterAgentId && (
                                <div className="text-[11px]" style={{ color: colors.text3 }}>
                                    Publisher: Agent ({resolveAgentNameById(pendingRequesterAgentId) || pendingRequesterAgentId})
                                </div>
                            )}
                            <label className="flex items-center gap-2 text-xs" style={{ color: colors.text2 }}>
                                <input
                                    type="checkbox"
                                    checked={rememberConsent}
                                    onChange={(event) => setRememberConsent(event.target.checked)}
                                />
                                Agree and remember (auto-publish next time)
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
                                    Cancel
                                </button>
                                <button
                                    onClick={rejectProfileShare}
                                    className="px-3 py-2 rounded text-xs"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: colors.danger, border: `1px solid rgba(239,68,68,0.3)` }}
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={confirmPublishWithConsent}
                                    className="px-3 py-2 rounded text-xs font-medium"
                                    style={{ backgroundColor: colors.warning, color: '#0F172A' }}
                                >
                                    Agree and publish
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

/**
 * Super Agent Service - 超级代理 (V5.1 - Gemini)
 * 
 * General-Purpose Autonomous Agent using Gemini Function Calling.
 * Implements a ReAct (Reasoning + Acting) loop for multi-turn tool execution.
 */

// Note: @google/generative-ai is imported dynamically in getGeminiClient()
import { getToolRegistry, setToolRegistryApiKey, GeminiFunctionDeclaration } from './toolRegistry.js';
import { runShadowProfiling, setProfilingApiKey, ProfilingResult, onProfileUpdate } from './profilingService.js';
import { getMemR3Router } from './memr3Service.js';
import { SkillResult, getSkillRegistry } from './skillRegistry.js';
import { getPlanGenerator } from './planGenerator.js';
import { ThreeStagePlan } from './planTypes.js';
import { track } from './telemetryService.js';
import { classifyFreshness, createStructuredFallback, type StructuredFallback, type IntentDomain } from './freshnessClassifier.js';
import { buildFlightActionLinks, parseFlightConstraints, type FlightConstraints } from './flightConstraintParser.js';
import { ensureMarketplaceCatalogReady, detectDomain, detectCapabilities } from './agentMarketplaceService.js';
import type { MarketplaceTask, AgentExecutionResult } from './agentMarketplaceTypes.js';
import { executeSpecializedAgent } from './specializedAgents.js';
import type { SpecializedAgentType } from '../types.js';
import { buildApiUrl } from './apiBaseUrl.js';
import {
    getSkillsDiscoveryAdapter,
    type SkillDiscoveryCandidate,
    type ExternalSearchMode,
} from './skillsDiscoveryAdapter.js';
import { executeToolViaCli } from './cliToolExecutor.js';
import type {
    ClarificationQuestionPayload,
    EvidenceClaimPayload,
    ProblemFramePayload,
    RiskBoundaryPayload,
    SkillSelectionDecision,
} from './agentContracts.js';

// ============================================================================
// Travel Context Extraction (for multi-agent param sharing)
// ============================================================================

interface TravelContext {
    destination?: string;
    origin?: string;
    checkInDate?: string;
    checkOutDate?: string;
    departureDate?: string;
    nights?: number;
    adults?: number;
    budget?: number;
    currency?: string;
}

const DESTINATION_STOPWORDS = /^(我|你|他|她|想|要|需要|帮|搜索|查找|推荐|最|预算|下周|本周|今天|明天|后天|一周|两周|休假|度假|trip|travel|vacation|holiday|week|next|from|to|plan|budget)$/i;
const NUMBER_WORD_MAP: Record<string, number> = {
    '一': 1,
    '二': 2,
    '两': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9,
    '十': 10,
};
const TRAVEL_LOCATION_ALIASES: Record<string, string> = {
    'japan': 'Tokyo',
    '日本': 'Tokyo',
    'uk': 'London',
    'united kingdom': 'London',
    'england': 'London',
    'korea': 'Seoul',
    'south korea': 'Seoul',
};

function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function parseNumericToken(raw?: string): number | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (trimmed.length === 1 && NUMBER_WORD_MAP[trimmed] !== undefined) {
        return NUMBER_WORD_MAP[trimmed];
    }
    if (trimmed === '十一') return 11;
    if (trimmed === '十二') return 12;
    return null;
}

function normalizeTravelLocation(raw?: string): string | undefined {
    if (!raw) return undefined;
    const cleaned = raw
        .replace(/[，。！？,.!?]/g, '')
        .replace(/^(请)?帮我(安排|搜索|查找|推荐)?/, '')
        .replace(/^(安排|搜索|查找|推荐|查询)/, '')
        .replace(/^(去|到|飞往|飞去|前往)/, '')
        .replace(/^(from|to|visit|in)\s+/i, '')
        .replace(/(?:旅行|旅游|度假|休假|出差|玩|一周|两周)+$/g, '')
        .replace(/预算.*$/g, '')
        .replace(/\b(next\s+week|this\s+week|one[-\s]?week|for\s+a\s+week|budget.*)$/i, '')
        .trim();
    if (!cleaned || DESTINATION_STOPWORDS.test(cleaned)) return undefined;
    const lower = cleaned.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const [key, mapped] of Object.entries(TRAVEL_LOCATION_ALIASES)) {
        if (lower === key || lower.includes(key)) return mapped;
    }
    return cleaned;
}

function inferTravelCurrency(query: string, destination?: string): string {
    if (/(英镑|GBP|£)/i.test(query)) return 'GBP';
    if (/(美元|USD|\$)/i.test(query)) return 'USD';
    if (/(欧元|EUR|€)/i.test(query)) return 'EUR';
    if (/(日元|JPY)/i.test(query)) return 'JPY';
    if (/(人民币|CNY|元)/i.test(query)) return 'CNY';
    if (/东京|日本|tokyo|japan/i.test(destination || '')) return 'JPY';
    if (/伦敦|英国|london|uk/i.test(destination || '')) return 'GBP';
    if (/巴黎|欧洲|paris|europe/i.test(destination || '')) return 'EUR';
    if (/[\u4e00-\u9fa5]/.test(destination || '')) return 'CNY';
    return 'USD';
}

function parseTravelContext(query: string): TravelContext {
    const ctx: TravelContext = {};
    const now = new Date();

    // Origin & Destination: "从X到Y" / "从X去Y" / "X飞Y"
    const originMatch = query.match(/从\s*([\u4e00-\u9fa5a-zA-Z]{2,16})\s*(?:到|去|出发|飞)/);
    if (originMatch) {
        ctx.origin = normalizeTravelLocation(originMatch[1]);
        const routeMatch = query.match(/从\s*[\u4e00-\u9fa5a-zA-Z]{2,16}\s*(?:到|去|飞)\s*([\u4e00-\u9fa5a-zA-Z]{2,16})/);
        if (routeMatch) ctx.destination = normalizeTravelLocation(routeMatch[1]);
    }

    // Origin & Destination (English): "from X to Y"
    if (!ctx.origin || !ctx.destination) {
        const enRouteMatch = query.match(/\bfrom\s+([a-zA-Z][a-zA-Z\s]{1,24})\s+to\s+([a-zA-Z][a-zA-Z\s]{1,24})\b/i);
        if (enRouteMatch) {
            if (!ctx.origin) {
                ctx.origin = normalizeTravelLocation(enRouteMatch[1]);
            }
            if (!ctx.destination) {
                ctx.destination = normalizeTravelLocation(enRouteMatch[2]);
            }
        }
    }

    // Destination fallback: "去X" / "到X" / "X旅行"
    if (!ctx.destination) {
        const destMatch = query.match(/(?:去|到|飞往|前往)\s*([\u4e00-\u9fa5a-zA-Z]{2,16})/)
            || query.match(/([\u4e00-\u9fa5a-zA-Z]{2,16})(?:的)?(?:酒店|住宿|旅[行游]|机票|航班|度假|休假)/);
        if (destMatch) {
            ctx.destination = normalizeTravelLocation(destMatch[1]);
        }
    }

    // Destination fallback (English): "to Tokyo", "visit Japan"
    if (!ctx.destination) {
        const enDestMatch = query.match(/\b(?:to|visit|in)\s+([a-zA-Z][a-zA-Z\s]{1,24})\b/i);
        if (enDestMatch) {
            ctx.destination = normalizeTravelLocation(enDestMatch[1]);
        }
    }

    // Origin fallback (English): "from London"
    if (!ctx.origin) {
        const enOriginMatch = query.match(/\bfrom\s+([a-zA-Z][a-zA-Z\s]{1,24})\b/i);
        if (enOriginMatch) {
            ctx.origin = normalizeTravelLocation(enOriginMatch[1]);
        }
    }

    // Dates: YYYY-MM-DD / M月D日 / 明天 / 后天
    const fullDateMatch = query.match(/(\d{4})[\-\/年](\d{1,2})[\-\/月](\d{1,2})/);
    if (fullDateMatch) {
        const y = parseInt(fullDateMatch[1]);
        const m = String(parseInt(fullDateMatch[2])).padStart(2, '0');
        const d = String(parseInt(fullDateMatch[3])).padStart(2, '0');
        ctx.departureDate = `${y}-${m}-${d}`;
        ctx.checkInDate = ctx.departureDate;
    } else {
        if (/下周|next week/i.test(query)) {
            const t = new Date(now);
            t.setDate(t.getDate() + 7);
            ctx.departureDate = toIsoDate(t);
            ctx.checkInDate = ctx.departureDate;
        }
        const mdMatch = query.match(/(\d{1,2})[月\/\-](\d{1,2})[日号]?/);
        if (!ctx.departureDate && mdMatch) {
            let year = now.getFullYear();
            const m = parseInt(mdMatch[1]);
            const d = parseInt(mdMatch[2]);
            const candidate = new Date(year, m - 1, d);
            if (candidate < now) year++;
            ctx.departureDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            ctx.checkInDate = ctx.departureDate;
        } else if (!ctx.departureDate && /明天/.test(query)) {
            const t = new Date(now); t.setDate(t.getDate() + 1);
            ctx.departureDate = toIsoDate(t);
            ctx.checkInDate = ctx.departureDate;
        } else if (!ctx.departureDate && /后天/.test(query)) {
            const t = new Date(now); t.setDate(t.getDate() + 2);
            ctx.departureDate = toIsoDate(t);
            ctx.checkInDate = ctx.departureDate;
        }
    }

    // Nights: "住X晚"/"X天"/"一周"
    const nightsMatch = query.match(/([一二两三四五六七八九十\d]+)\s*(?:晚|夜)/)
        || query.match(/住\s*([一二两三四五六七八九十\d]+)\s*天/);
    if (nightsMatch) {
        const nights = parseNumericToken(nightsMatch[1]);
        if (nights) ctx.nights = nights;
    } else {
        const daysMatch = query.match(/([一二两三四五六七八九十\d]+)\s*天/);
        if (daysMatch) {
            const days = parseNumericToken(daysMatch[1]);
            if (days) ctx.nights = Math.max(1, days - 1);
        }
    }
    if (!ctx.nights) {
        const weekMatch = query.match(/([一二两三四五六七八九十\d]+)\s*周/);
        if (weekMatch) {
            const weeks = parseNumericToken(weekMatch[1]);
            if (weeks) ctx.nights = Math.max(1, weeks * 7 - 1);
        } else if (/一周|week/i.test(query)) {
            ctx.nights = 6;
        } else if (/周末|weekend/i.test(query)) {
            ctx.nights = 2;
        }
    }

    // Check-out from check-in + nights (only when user provided nights/date)
    if (ctx.checkInDate && ctx.nights) {
        const co = new Date(ctx.checkInDate);
        co.setDate(co.getDate() + ctx.nights);
        ctx.checkOutDate = toIsoDate(co);
    }

    // Adults: "2人" / "两人"
    const adultsMatch = query.match(/([一二两三四五六七八九十\d]+)\s*(?:人|位|个人)/);
    if (adultsMatch) {
        const adults = parseNumericToken(adultsMatch[1]);
        if (adults) ctx.adults = adults;
    }

    // Budget
    const budgetMatch = query.match(/预算\s*(?:约|大约|大概|around|about)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (budgetMatch) {
        ctx.budget = Math.round(parseFloat(budgetMatch[1]));
    }

    // Currency
    ctx.currency = inferTravelCurrency(query, ctx.destination);

    return ctx;
}

// ============================================================================
// Types
// ============================================================================

export interface UserContext {
    userId?: string;
    preferences?: Record<string, any>;
    recentQueries?: string[];
    currentApp?: string;
    locale?: string;
    conversationHistory?: { role: string; content: string }[];  // Simple chat format
}

export type ReasoningModeInput = 'auto' | 'lite' | 'full';
export type ReasoningResolvedMode = 'lite' | 'full';

export interface ReasoningProtocolPayload {
    version: string;
    mode: ReasoningResolvedMode;
    methods_applied: string[];
    root_problem: string;
    recommended_strategy: string;
    confidence: number;
    artifacts: {
        first_principles?: {
            assumptions: string[];
            base_facts: string[];
            key_levers: string[];
        };
        stakeholders?: Array<{
            role: string;
            motivation: string;
            constraints: string[];
            conflict_level: 'low' | 'medium' | 'high';
        }>;
        five_whys?: string[];
        premortem?: Array<{
            reason: string;
            likelihood: number;
            impact: number;
            early_signal: string;
            mitigation: string;
        }>;
        second_order?: {
            immediate: string[];
            mid_term: string[];
            long_term: string[];
        };
        analogies?: Array<{
            source_domain: string;
            mapping: string;
            boundary: string;
        }>;
    };
}

export interface AgentResponse {
    answer: string;
    toolsUsed: string[];
    toolResults: ToolExecutionResult[];
    confidence: number;
    executionTimeMs: number;
    turns: number;
    profilingResult?: ProfilingResult;
    /** Three-Stage Plan (Phase 2 Week 2) */
    plan?: ThreeStagePlan;
    /** Marketplace trace info (when marketplace was used) */
    marketplace_trace_id?: string;
    marketplace_selected_agents?: Array<{ task_id: string; agent_id: string }>;
    marketplace_fallback_used?: boolean;
    /** Unified orchestration contract */
    trace_id?: string;
    routing_decision?: {
        mode: 'single_agent' | 'multi_agent';
        reason_codes: string[];
        scores: {
            complexity: number;
            risk: number;
            dependency: number;
        };
    };
    task_graph?: {
        tasks: Array<{
            id: string;
            title: string;
            required_capabilities: string[];
        }>;
        edges: Array<{
            from: string;
            to: string;
        }>;
        critical_path: string[];
        parallel_groups: string[][];
    };
    skill_invocations?: Array<{
        skill_id: string;
        source: 'local' | 'github' | 'trusted_catalog' | 'local_template';
        status: 'processing' | 'running' | 'waiting_user' | 'success' | 'partial' | 'cancelled' | 'error';
        latency_ms: number;
        evidence_count: number;
        sandbox_level: 'none' | 'sandbox' | 'approved' | 'quarantine';
    }>;
    skill_selection_trace?: SkillSelectionDecision[];
    evidence?: Array<{ source: string; url: string; fetched_at?: string }>;
    reasoning_protocol?: ReasoningProtocolPayload;
    lix_dispatch?: {
        mode: 'lumi_handled' | 'lix_dispatched';
        reason_codes: string[];
        intent_id?: string;
        status?: string;
        offers_count?: number;
    };
    problem_frame?: ProblemFramePayload;
    clarification_questions?: ClarificationQuestionPayload[];
    evidence_claims?: EvidenceClaimPayload[];
    risk_boundary?: RiskBoundaryPayload;
    status?: 'processing' | 'running' | 'waiting_user' | 'success' | 'partial' | 'cancelled' | 'error';
    summary?: string;
    next_action?: string;
    owner_agent?: string;
    gate_decisions?: Array<{
        gate: string;
        decision: 'passed' | 'blocked' | 'waiting_user';
        reason: string;
        next_action?: string;
        owner_agent: string;
    }>;
    runtime_task_id?: string;
    runtime_status?: 'RUNNING' | 'WAITING_USER' | 'DONE' | 'FAILED' | 'CANCELLED';
    current_wait?: {
        node_id: string;
        type: 'approval' | 'ask_user';
        expires_at?: number;
    };
    policy_decision_ids?: string[];
    policy_sync?: {
        status: 'matched' | 'missing_client' | 'version_mismatch' | 'fingerprint_mismatch';
        strict_enforced: boolean;
        server_policy_version: string;
        server_policy_fingerprint: string;
        client_policy_version?: string;
        client_policy_fingerprint?: string;
    };
    agent_kernel_rollout?: {
        enabled: boolean;
        reason: 'forced_on' | 'forced_off' | 'full_enabled' | 'percentage_rollout' | 'disabled';
        rollout_percent: number;
        bucket: number;
    };
}

const REASONING_PROTOCOL_VERSION = 'v1.1';
const REASONING_METHODS_FULL = [
    'first_principles',
    'stakeholders',
    'five_whys',
    'premortem',
    'second_order',
    'analogies',
] as const;
const REASONING_METHODS_LITE = [
    'first_principles',
    'five_whys',
    'second_order',
] as const;
const REASONING_MODE_KEYWORDS = [
    '分析',
    '拆解',
    '复盘',
    '对比',
    '策略',
    '为什么',
    '根因',
    '推理',
    'diagnose',
    'strategy',
    'compare',
    'analysis',
    'root cause',
];

function normalizeReasoningModeInput(raw: unknown): ReasoningModeInput {
    if (raw === 'lite' || raw === 'full' || raw === 'auto') return raw;
    return 'auto';
}

function isReasoningProtocolEnabled(): boolean {
    const envValue = (typeof process !== 'undefined'
        ? process.env?.REASONING_PROTOCOL_ENABLED
            || process.env?.VITE_REASONING_PROTOCOL_ENABLED
        : undefined)?.trim()
        .toLowerCase();
    if (!envValue) return true;
    return !['0', 'false', 'off', 'no'].includes(envValue);
}

function resolveRuntimeGeminiApiKey(): string {
    const candidates = typeof process !== 'undefined'
        ? [
            process.env?.GEMINI_API_KEY,
            process.env?.LUMI_GEMINI_API_KEY,
            process.env?.GOOGLE_API_KEY,
            process.env?.GOOGLE_GENERATIVE_AI_API_KEY,
            process.env?.VITE_GEMINI_API_KEY,
            process.env?.NEXT_PUBLIC_GEMINI_API_KEY,
        ]
        : [];
    for (const candidate of candidates) {
        const key = String(candidate || '').trim();
        if (key) return key;
    }
    return '';
}

function configuredDefaultReasoningMode(): ReasoningModeInput {
    const envValue = (typeof process !== 'undefined'
        ? process.env?.REASONING_PROTOCOL_DEFAULT_MODE
            || process.env?.VITE_REASONING_PROTOCOL_DEFAULT_MODE
        : undefined)?.trim()
        .toLowerCase();
    return normalizeReasoningModeInput(envValue);
}

function clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function normalizeString(value: unknown, maxLength = 200): string {
    if (typeof value !== 'string') return '';
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function normalizeStringArray(value: unknown, maxItems = 6, maxItemLength = 100): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeString(item, maxItemLength))
        .filter(Boolean)
        .slice(0, maxItems);
}

export function resolveReasoningMode(
    modeInput: ReasoningModeInput,
    query: string,
    routingDecision: NonNullable<AgentResponse['routing_decision']>
): ReasoningResolvedMode {
    if (modeInput === 'lite' || modeInput === 'full') {
        return modeInput;
    }
    const normalizedQuery = String(query || '').toLowerCase();
    const hasKeyword = REASONING_MODE_KEYWORDS.some((keyword) =>
        normalizedQuery.includes(keyword.toLowerCase())
    );
    if (
        routingDecision.mode === 'multi_agent' ||
        routingDecision.scores.risk >= 0.55 ||
        hasKeyword
    ) {
        return 'full';
    }
    return 'lite';
}

function normalizedMethodList(
    mode: ReasoningResolvedMode,
    requested: unknown
): string[] {
    const defaultMethods = mode === 'full'
        ? [...REASONING_METHODS_FULL]
        : [...REASONING_METHODS_LITE];
    const allowSet = new Set(mode === 'full' ? REASONING_METHODS_FULL : REASONING_METHODS_LITE);
    const incoming = normalizeStringArray(requested, 8, 64)
        .map((item) => item.replace(/\s+/g, '_').toLowerCase())
        .filter((item) => allowSet.has(item as any));
    return incoming.length > 0 ? Array.from(new Set(incoming)) : defaultMethods;
}

export function normalizeReasoningProtocol(
    raw: any,
    mode: ReasoningResolvedMode
): ReasoningProtocolPayload | null {
    if (!raw || typeof raw !== 'object') return null;

    const rootProblem = normalizeString(raw.root_problem, 240);
    const recommendedStrategy = normalizeString(raw.recommended_strategy, 260);
    if (!rootProblem || !recommendedStrategy) return null;

    const firstPrinciplesRaw = raw?.artifacts?.first_principles;
    const stakeholdersRaw = Array.isArray(raw?.artifacts?.stakeholders)
        ? raw.artifacts.stakeholders
        : [];
    const fiveWhysRaw = raw?.artifacts?.five_whys;
    const premortemRaw = Array.isArray(raw?.artifacts?.premortem)
        ? raw.artifacts.premortem
        : [];
    const secondOrderRaw = raw?.artifacts?.second_order;
    const analogiesRaw = Array.isArray(raw?.artifacts?.analogies)
        ? raw.artifacts.analogies
        : [];

    const firstPrinciples = firstPrinciplesRaw && typeof firstPrinciplesRaw === 'object'
        ? {
            assumptions: normalizeStringArray(firstPrinciplesRaw.assumptions, 6, 120),
            base_facts: normalizeStringArray(firstPrinciplesRaw.base_facts, 6, 120),
            key_levers: normalizeStringArray(firstPrinciplesRaw.key_levers, 6, 120),
        }
        : undefined;

    const stakeholders = stakeholdersRaw
        .map((entry: any) => {
            const role = normalizeString(entry?.role, 80);
            const motivation = normalizeString(entry?.motivation, 160);
            if (!role || !motivation) return null;
            const conflictRaw = normalizeString(entry?.conflict_level, 20).toLowerCase();
            const conflictLevel = conflictRaw === 'high'
                ? 'high'
                : conflictRaw === 'low'
                    ? 'low'
                    : 'medium';
            return {
                role,
                motivation,
                constraints: normalizeStringArray(entry?.constraints, 5, 120),
                conflict_level: conflictLevel as 'low' | 'medium' | 'high',
            };
        })
        .filter(Boolean) as Array<{
            role: string;
            motivation: string;
            constraints: string[];
            conflict_level: 'low' | 'medium' | 'high';
        }>;

    const fiveWhys = normalizeStringArray(fiveWhysRaw, 6, 140);

    const premortem = premortemRaw
        .map((entry: any) => {
            const reason = normalizeString(entry?.reason, 160);
            if (!reason) return null;
            const likelihood = clamp01(Number(entry?.likelihood));
            const impact = clamp01(Number(entry?.impact));
            return {
                reason,
                likelihood,
                impact,
                early_signal: normalizeString(entry?.early_signal, 120),
                mitigation: normalizeString(entry?.mitigation, 140),
            };
        })
        .filter(Boolean) as Array<{
            reason: string;
            likelihood: number;
            impact: number;
            early_signal: string;
            mitigation: string;
        }>;

    const secondOrder = secondOrderRaw && typeof secondOrderRaw === 'object'
        ? {
            immediate: normalizeStringArray(secondOrderRaw.immediate, 6, 100),
            mid_term: normalizeStringArray(secondOrderRaw.mid_term, 6, 100),
            long_term: normalizeStringArray(secondOrderRaw.long_term, 6, 100),
        }
        : undefined;

    const analogies = analogiesRaw
        .map((entry: any) => {
            const sourceDomain = normalizeString(entry?.source_domain, 80);
            const mapping = normalizeString(entry?.mapping, 160);
            if (!sourceDomain || !mapping) return null;
            return {
                source_domain: sourceDomain,
                mapping,
                boundary: normalizeString(entry?.boundary, 140),
            };
        })
        .filter(Boolean) as Array<{
            source_domain: string;
            mapping: string;
            boundary: string;
        }>;

    const confidence = clamp01(Number(raw.confidence));
    const fallbackConfidence = mode === 'full' ? 0.72 : 0.66;
    return {
        version: normalizeString(raw.version, 16) || REASONING_PROTOCOL_VERSION,
        mode,
        methods_applied: normalizedMethodList(mode, raw.methods_applied),
        root_problem: rootProblem,
        recommended_strategy: recommendedStrategy,
        confidence: confidence > 0 ? confidence : fallbackConfidence,
        artifacts: {
            first_principles: firstPrinciples,
            stakeholders,
            five_whys: fiveWhys,
            premortem,
            second_order: secondOrder,
            analogies,
        },
    };
}

function enrichRoutingWithReasoning(
    routingDecision: NonNullable<AgentResponse['routing_decision']>,
    reasoningProtocol: ReasoningProtocolPayload | null
): NonNullable<AgentResponse['routing_decision']> {
    if (!reasoningProtocol) return routingDecision;

    const reasonCodes = new Set(routingDecision.reason_codes);
    reasonCodes.add(
        reasoningProtocol.mode === 'full'
            ? 'reasoning_protocol_full'
            : 'reasoning_protocol_lite'
    );
    const premortem = reasoningProtocol.artifacts.premortem || [];
    const elevatedRisks = premortem.filter((item) => item.likelihood * item.impact >= 0.45).length;
    const riskBoost = Math.min(0.18, elevatedRisks * 0.04);
    const risk = clamp01(routingDecision.scores.risk + riskBoost);
    let mode = routingDecision.mode;
    if (mode === 'single_agent' && reasoningProtocol.mode === 'full' && risk >= 0.75) {
        mode = 'multi_agent';
        reasonCodes.add('reasoning_protocol_risk_escalation');
    }

    return {
        mode,
        reason_codes: Array.from(reasonCodes),
        scores: {
            complexity: Math.round(clamp01(
                routingDecision.scores.complexity + (reasoningProtocol.mode === 'full' ? 0.05 : 0.02)
            ) * 100) / 100,
            risk: Math.round(risk * 100) / 100,
            dependency: Math.round(clamp01(
                Math.max(
                    routingDecision.scores.dependency,
                    (reasoningProtocol.artifacts.five_whys?.length || 0) >= 3 ? 0.6 : routingDecision.scores.dependency
                )
            ) * 100) / 100,
        },
    };
}

function enrichTaskGraphWithReasoning(
    taskGraph: NonNullable<AgentResponse['task_graph']>,
    reasoningProtocol: ReasoningProtocolPayload | null
): NonNullable<AgentResponse['task_graph']> {
    if (!reasoningProtocol) return taskGraph;
    const tasks = taskGraph.tasks.map((task) => ({ ...task }));
    const edges = taskGraph.edges.map((edge) => ({ ...edge }));
    const criticalPath = [...taskGraph.critical_path];
    const parallelGroups = taskGraph.parallel_groups.map((group) => [...group]);

    if (tasks.length > 0 && reasoningProtocol.root_problem) {
        tasks[0] = {
            ...tasks[0],
            title: `Core issue clarification: ${normalizeString(reasoningProtocol.root_problem, 38)}`,
        };
    }

    const whyChain = reasoningProtocol.artifacts.five_whys || [];
    if (whyChain.length > 0 && tasks.length > 0) {
        const clarifyId = `clarify_${tasks.length + 1}`;
        tasks.push({
            id: clarifyId,
            title: `Clarification node: ${normalizeString(whyChain[0], 30)}`,
            required_capabilities: ['clarification'],
        });
        edges.push({ from: tasks[0].id, to: clarifyId });
        if (!criticalPath.includes(clarifyId)) {
            criticalPath.push(clarifyId);
        }
    }

    return {
        tasks,
        edges,
        critical_path: criticalPath,
        parallel_groups: parallelGroups,
    };
}

function expandCapabilitiesWithReasoning(
    capabilities: string[],
    reasoningProtocol: ReasoningProtocolPayload | null
): string[] {
    if (!reasoningProtocol) return capabilities;
    const set = new Set(capabilities);
    if ((reasoningProtocol.artifacts.stakeholders?.length || 0) > 0) {
        set.add('stakeholder_analysis');
    }
    if ((reasoningProtocol.artifacts.second_order?.mid_term?.length || 0) > 0) {
        set.add('second_order_simulation');
    }
    if ((reasoningProtocol.artifacts.analogies?.length || 0) > 0) {
        set.add('cross_domain_analogy');
    }
    return Array.from(set);
}

function buildReasoningDiscoveryQuery(
    query: string,
    reasoningProtocol: ReasoningProtocolPayload | null
): string {
    if (!reasoningProtocol) return query;
    const analogyTerms = (reasoningProtocol.artifacts.analogies || [])
        .map((row) => normalizeString(`${row.source_domain} ${row.mapping}`, 80))
        .filter(Boolean)
        .slice(0, 3);
    if (analogyTerms.length === 0) return query;
    return `${query}\nCross-domain references: ${analogyTerms.join(' | ')}`;
}

function toInvocationSource(source: SkillDiscoveryCandidate['source']): 'local' | 'github' | 'trusted_catalog' | 'local_template' {
    if (source === 'trusted_catalog') return 'trusted_catalog';
    if (source === 'github_search') return 'github';
    return 'local';
}

function pickDelegatedSkills(
    candidates: SkillDiscoveryCandidate[],
    preferGithubSkills: boolean
): SkillDiscoveryCandidate[] {
    const unique = new Map<string, SkillDiscoveryCandidate>();
    for (const candidate of candidates) {
        if (!candidate.admissionPassed) continue;
        if (unique.has(candidate.id)) continue;
        unique.set(candidate.id, candidate);
    }
    const list = Array.from(unique.values());
        const sorted = list.sort((a, b) => {
            const rank = (candidate: SkillDiscoveryCandidate): number => {
            if (preferGithubSkills) {
                return candidate.source === 'github_search' || candidate.source === 'trusted_catalog' ? 0 : 1;
            }
            return candidate.source === 'local_index' ? 0 : 1;
        };
        const rankDiff = rank(a) - rank(b);
        if (rankDiff !== 0) return rankDiff;
        return b.score - a.score;
    });
    return sorted.slice(0, 3);
}

function buildTaskSkillInvocations(
    plans: Map<string, TaskSkillPlan>,
    results: AgentExecutionResult[]
): NonNullable<AgentResponse['skill_invocations']> {
    const statusByTask = new Map<string, 'success' | 'partial' | 'error'>();
    for (const result of results) {
        statusByTask.set(result.task_id, result.success ? 'success' : 'error');
    }

    const rows: NonNullable<AgentResponse['skill_invocations']> = [];
    const seen = new Set<string>();
    for (const [taskId, plan] of plans.entries()) {
        const taskStatus = statusByTask.get(taskId) || 'partial';
        for (const candidate of plan.delegatedSkills) {
            if (seen.has(candidate.id)) continue;
            seen.add(candidate.id);
            rows.push({
                skill_id: candidate.id,
                source: toInvocationSource(candidate.source),
                status: taskStatus,
                latency_ms: Math.round(candidate.latencyP95 ?? 0),
                evidence_count: 0,
                sandbox_level: candidate.sandboxLevel,
            });
        }
        for (const templateId of plan.localTemplateSkills) {
            if (seen.has(templateId)) continue;
            seen.add(templateId);
            rows.push({
                skill_id: templateId,
                source: 'local_template',
                status: taskStatus === 'error' ? 'partial' : taskStatus,
                latency_ms: 0,
                evidence_count: 0,
                sandbox_level: 'none',
            });
        }
    }
    return rows.slice(0, 12);
}

function buildSkillSelectionTraceFromInvocations(
    taskGraph: AgentResponse['task_graph'],
    invocations: AgentResponse['skill_invocations']
): SkillSelectionDecision[] {
    const tasks = taskGraph?.tasks || [];
    const skills = invocations || [];
    if (tasks.length === 0 || skills.length === 0) return [];
    const successful = skills.filter((item) => item.status === 'success' || item.status === 'partial');
    const ordered = successful.length > 0 ? successful : skills;

    return tasks.slice(0, 8).map((task, index) => {
        const primary = ordered[index] || ordered[0];
        const fallback = ordered[index + 1];
        const latencyScore = primary
            ? Math.max(0, Math.min(1, 1 - (primary.latency_ms || 0) / 8000))
            : 0;
        const confidenceScore = primary?.status === 'success' ? 0.86 : primary ? 0.72 : 0.0;
        const finalScore = primary
            ? Math.max(0, Math.min(1, 0.3 + confidenceScore * 0.4 + latencyScore * 0.3))
            : 0.0;
        return {
            task_id: task.id,
            required_capability: task.required_capabilities?.[0] || 'general_reasoning',
            primary_skill_id: primary?.skill_id,
            fallback_skill_id: fallback?.skill_id,
            score_breakdown: {
                capability_fit: primary ? 1 : 0,
                success_rate_score: confidenceScore,
                latency_score: latencyScore,
                evidence_level_score: primary && primary.evidence_count > 0 ? 0.7 : 0.4,
                cost_score: 0.7,
                policy_score: 1.0,
                twin_fit_boost: 0.0,
                freshness_boost: 0.0,
                final_score: finalScore,
                total_score: finalScore,
            },
            selection_reason: primary
                ? (fallback ? 'selected_primary_with_fallback' : 'selected_primary_no_fallback')
                : 'fallback_to_market_due_to_missing_skill',
            gate_snapshot: primary
                ? `sandbox=${primary.sandbox_level}|status=${primary.status}`
                : 'no_candidate',
        };
    });
}

export interface ToolExecutionResult {
    toolName: string;
    args: Record<string, any>;
    output: any;
    success: boolean;
    error?: string;
    executionTimeMs: number;
    executionPath?: 'cli' | 'tool' | 'cli_fallback_tool';
}

interface ToolGovernorContext {
    query: string;
    route: ReturnType<typeof classifyFreshness>;
    routingDecision: NonNullable<AgentResponse['routing_decision']>;
    callCounts: Map<string, number>;
    successfulSignatures: Set<string>;
}

interface ToolGovernorDecision {
    allowed: boolean;
    reason?: string;
    response?: any;
}

interface TaskSkillPlan {
    traceId: string;
    taskId: string;
    discoveryQuery: string;
    requiredCapabilities: string[];
    delegatedSkills: SkillDiscoveryCandidate[];
    primarySkill: SkillDiscoveryCandidate | null;
    fallbackSkills: SkillDiscoveryCandidate[];
    localTemplateSkills: string[];
}

interface LlmTaskSpec {
    title: string;
    required_capabilities: string[];
    dependency_indexes: number[];
    parallelizable: boolean;
}

function extractJsonPayload(text: string): any | null {
    const trimmed = String(text || '').trim();
    if (!trimmed) return null;

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || trimmed;

    try {
        return JSON.parse(candidate);
    } catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(candidate.slice(start, end + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}

function normalizeLlmTaskSpecs(raw: any, fallbackCapabilities: string[]): LlmTaskSpec[] {
    const sourceTasks = Array.isArray(raw?.tasks)
        ? raw.tasks
        : Array.isArray(raw)
            ? raw
            : [];
    if (sourceTasks.length === 0) return [];

    const tasks: LlmTaskSpec[] = [];
    for (let i = 0; i < sourceTasks.length && tasks.length < 6; i++) {
        const item = sourceTasks[i];
        const title = String(item?.title || item?.objective || '').trim();
        if (!title) continue;

        const caps = Array.isArray(item?.required_capabilities)
            ? item.required_capabilities.map((c: any) => String(c || '').trim()).filter(Boolean)
            : [];
        const depsRaw = Array.isArray(item?.dependency_indexes)
            ? item.dependency_indexes
            : Array.isArray(item?.dependencies)
                ? item.dependencies
                : [];
        const dependencyIndexes = depsRaw
            .map((dep: any) => Number(dep))
            .filter((dep: number) => Number.isInteger(dep))
            .map((dep: number) => (dep >= 1 ? dep - 1 : dep))
            .filter((dep: number) => dep >= 0 && dep < sourceTasks.length && dep !== i);

        tasks.push({
            title,
            required_capabilities: caps.length > 0
                ? caps.slice(0, 4)
                : fallbackCapabilities.slice(0, 2),
            dependency_indexes: Array.from(new Set(dependencyIndexes)),
            parallelizable: item?.parallelizable !== false,
        });
    }

    return tasks;
}

function stableSerializeArgs(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerializeArgs(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => `${JSON.stringify(key)}:${stableSerializeArgs(val)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}

function buildTaskGraphFromPlanTasks(
    tasks: MarketplaceTask[],
    mode: 'single_agent' | 'multi_agent'
): NonNullable<AgentResponse['task_graph']> {
    const normalizedTasks = tasks.slice(0, 6).map((task) => ({
        id: task.id,
        title: task.objective,
        required_capabilities: task.required_capabilities,
    }));
    const edges = tasks.flatMap((task) =>
        task.dependencies.map((dep) => ({ from: dep, to: task.id }))
    );
    const criticalPath = edges.length > 0
        ? normalizedTasks.map((task) => task.id)
        : normalizedTasks.length > 0
            ? [normalizedTasks[0].id]
            : [];
    const parallelGroups = mode === 'multi_agent'
        ? [tasks.filter((task) => task.parallelizable).map((task) => task.id)].filter((group) => group.length > 0)
        : [];

    return {
        tasks: normalizedTasks,
        edges,
        critical_path: criticalPath,
        parallel_groups: parallelGroups,
    };
}

// ============================================================================
// Gemini Client
// ============================================================================

let geminiClient: any = null;
let currentApiKey: string = '';
let GoogleGenerativeAI: any = null;
const DEFAULT_EXTERNAL_AGENT_TIMEOUT_MS = 12_000;
const DEFAULT_EXTERNAL_PROXY_RETRIES = 1;

function getExternalAgentTimeoutMs(): number {
    const configured = typeof process !== 'undefined'
        ? Number(process.env?.AGENT_MARKET_EXECUTOR_TIMEOUT_MS)
        : NaN;
    if (Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_EXTERNAL_AGENT_TIMEOUT_MS;
}

function resolveExternalAgentEndpoint(executeRef: string): string | null {
    if (!executeRef || typeof executeRef !== 'string') return null;
    const trimmed = executeRef.trim();
    if (!trimmed) return null;

    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('/')) return buildApiUrl(trimmed);

    const base = typeof process !== 'undefined' ? process.env?.AGENT_MARKET_EXECUTOR_BASE?.trim() : '';
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
}

function shouldUseExternalProxy(): boolean {
    const raw = (typeof process !== 'undefined' ? process.env?.AGENT_MARKET_EXECUTOR_USE_PROXY : '') || '';
    if (!raw) return true;
    const normalized = raw.trim().toLowerCase();
    return !['0', 'false', 'off', 'no'].includes(normalized);
}

function getExternalProxyRetries(): number {
    const configured = typeof process !== 'undefined'
        ? Number(process.env?.AGENT_MARKET_EXECUTOR_RETRIES)
        : NaN;
    if (Number.isFinite(configured) && configured >= 0) {
        return Math.max(0, Math.min(3, Math.floor(configured)));
    }
    return DEFAULT_EXTERNAL_PROXY_RETRIES;
}

function getExternalProxyToken(): string | undefined {
    if (typeof process === 'undefined') return undefined;
    const raw = process.env?.VITE_AGENT_MARKET_PROXY_TOKEN || process.env?.AGENT_MARKET_PROXY_TOKEN;
    if (!raw) return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeExternalEvidence(
    payload: any,
    fallbackSource: string,
    fallbackUrl: string
): Array<{ source: string; url: string; fetched_at?: string }> | undefined {
    if (Array.isArray(payload?.evidence)) {
        return payload.evidence.map((item: any) => ({
            source: String(item?.source || fallbackSource),
            url: String(item?.url || fallbackUrl),
            fetched_at: item?.fetched_at ? String(item.fetched_at) : undefined,
        }));
    }

    if (Array.isArray(payload?.evidence?.items)) {
        return payload.evidence.items.map((item: any) => ({
            source: String(item?.source_name || item?.source || payload?.evidence?.provider || fallbackSource),
            url: String(item?.url || fallbackUrl),
            fetched_at: payload?.evidence?.fetched_at ? String(payload.evidence.fetched_at) : undefined,
        }));
    }

    if (Array.isArray(payload?.sources)) {
        return payload.sources.map((source: any) => ({
            source: String(source || fallbackSource),
            url: fallbackUrl,
        }));
    }

    return undefined;
}

interface RoutingScoreConfig {
    thresholds: {
        crossDomainMin: number;
        capabilitiesMin: number;
        dependencyMin: number;
        riskMin: number;
        requireEvidenceOnRisk: boolean;
    };
    complexityWeights: {
        crossDomain: number;
        capability: number;
        dependency: number;
    };
    riskProfile: {
        highRiskScore: number;
        defaultRiskScore: number;
        settingsRiskScore: number;
    };
    explicitMultiAgentKeywords: string[];
    dependencyKeywords: string[];
    highRiskKeywords: string[];
}

const DEFAULT_ROUTING_SCORE_CONFIG: RoutingScoreConfig = {
    thresholds: {
        crossDomainMin: 2,
        capabilitiesMin: 3,
        dependencyMin: 2,
        riskMin: 0.75,
        requireEvidenceOnRisk: true,
    },
    complexityWeights: {
        crossDomain: 0.38,
        capability: 0.22,
        dependency: 0.40,
    },
    riskProfile: {
        highRiskScore: 0.90,
        defaultRiskScore: 0.34,
        settingsRiskScore: 0.28,
    },
    explicitMultiAgentKeywords: ['并行协作', '多agent', 'multi-agent', '多方案'],
    dependencyKeywords: ['然后', '并且', '同时', '先', '再', 'and then'],
    highRiskKeywords: ['法律', '合同', '医疗', 'health', '投资', '股票', '比特币', '支付', '转账', 'finance'],
};

interface OverflowGatePolicy {
    complexityMin: number;
    riskMin: number;
    requiredCapabilitiesMin: number;
    queueDepthMin: number;
    lixDomains: Array<'travel' | 'recruitment' | 'local_service'>;
}

const DEFAULT_OVERFLOW_GATE_POLICY: OverflowGatePolicy = {
    complexityMin: 0.68,
    riskMin: 0.72,
    requiredCapabilitiesMin: 3,
    queueDepthMin: 8,
    lixDomains: ['travel', 'recruitment', 'local_service'],
};

function normalizeLixDomain(domain: string): 'travel' | 'recruitment' | 'local_service' | null {
    if (domain === 'travel') return 'travel';
    if (domain === 'recruitment') return 'recruitment';
    if (domain === 'local_service') return 'local_service';
    return null;
}

function loadRoutingScoreConfig(): RoutingScoreConfig {
    const fromEnv = (typeof process !== 'undefined'
        ? process.env?.LUMI_ROUTING_SCORE_CONFIG_JSON
            || process.env?.VITE_LUMI_ROUTING_SCORE_CONFIG_JSON
        : undefined)?.trim();

    if (!fromEnv) return DEFAULT_ROUTING_SCORE_CONFIG;
    try {
        const parsed = JSON.parse(fromEnv);
        return {
            thresholds: {
                ...DEFAULT_ROUTING_SCORE_CONFIG.thresholds,
                ...(parsed?.thresholds || {}),
            },
            complexityWeights: {
                ...DEFAULT_ROUTING_SCORE_CONFIG.complexityWeights,
                ...(parsed?.complexityWeights || {}),
            },
            riskProfile: {
                ...DEFAULT_ROUTING_SCORE_CONFIG.riskProfile,
                ...(parsed?.riskProfile || {}),
            },
            explicitMultiAgentKeywords: Array.isArray(parsed?.explicitMultiAgentKeywords)
                ? parsed.explicitMultiAgentKeywords
                : DEFAULT_ROUTING_SCORE_CONFIG.explicitMultiAgentKeywords,
            dependencyKeywords: Array.isArray(parsed?.dependencyKeywords)
                ? parsed.dependencyKeywords
                : DEFAULT_ROUTING_SCORE_CONFIG.dependencyKeywords,
            highRiskKeywords: Array.isArray(parsed?.highRiskKeywords)
                ? parsed.highRiskKeywords
                : DEFAULT_ROUTING_SCORE_CONFIG.highRiskKeywords,
        };
    } catch {
        return DEFAULT_ROUTING_SCORE_CONFIG;
    }
}

function evaluateRoutingDecision(
    query: string,
    domain: string,
    requiredCapabilities: string[]
): NonNullable<AgentResponse['routing_decision']> {
    const config = loadRoutingScoreConfig();
    const lower = query.toLowerCase();
    const domainSet = new Set<string>([domain]);
    for (const cap of requiredCapabilities) {
        if (/(flight|hotel|transport|itinerary|travel)/.test(cap)) domainSet.add('travel');
        if (/(agent|market|github)/.test(cap)) domainSet.add('agent_market');
        if (/(avatar|profile|twin)/.test(cap)) domainSet.add('avatar');
        if (/(destiny|bellman|strategy)/.test(cap)) domainSet.add('destiny');
        if (/(lix|negotiation|offer)/.test(cap)) domainSet.add('lix');
        if (/(rewrite|web_search|live_search|knowledge)/.test(cap)) domainSet.add('chat');
    }

    const crossDomainCount = domainSet.size;
    const requiredCount = Math.max(1, requiredCapabilities.length);
    const dependencyDepth = requiredCount >= config.thresholds.capabilitiesMin ||
        config.dependencyKeywords.some(keyword => lower.includes(keyword.toLowerCase()))
        ? 2
        : 1;
    const riskScore = config.highRiskKeywords.some(keyword => lower.includes(keyword.toLowerCase()))
        ? config.riskProfile.highRiskScore
        : domain === 'settings'
            ? config.riskProfile.settingsRiskScore
            : config.riskProfile.defaultRiskScore;
    const evidenceRequired = riskScore >= config.thresholds.riskMin;
    const explicitMulti = config.explicitMultiAgentKeywords.some(keyword => lower.includes(keyword.toLowerCase()));

    const reasonCodes: string[] = [];
    let mode: 'single_agent' | 'multi_agent' = 'single_agent';

    if (crossDomainCount >= config.thresholds.crossDomainMin) {
        mode = 'multi_agent';
        reasonCodes.push(`cross_domain_count>=${config.thresholds.crossDomainMin}`);
    }
    if (requiredCount >= config.thresholds.capabilitiesMin) {
        mode = 'multi_agent';
        reasonCodes.push(`required_capabilities>=${config.thresholds.capabilitiesMin}`);
    }
    if (dependencyDepth >= config.thresholds.dependencyMin) {
        mode = 'multi_agent';
        reasonCodes.push(`dependency_depth>=${config.thresholds.dependencyMin}`);
    }
    if (riskScore >= config.thresholds.riskMin && (evidenceRequired || !config.thresholds.requireEvidenceOnRisk)) {
        mode = 'multi_agent';
        reasonCodes.push(`risk_score>=${config.thresholds.riskMin}_and_evidence_required`);
    }
    if (explicitMulti) {
        mode = 'multi_agent';
        reasonCodes.push('explicit_multi_agent_request');
    }
    if (reasonCodes.length === 0) {
        reasonCodes.push('default_single_agent');
    }

    const complexity = Math.max(
        0,
        Math.min(
            1,
            (Math.max(0, crossDomainCount - 1) * config.complexityWeights.crossDomain) +
            (Math.max(0, requiredCount - 1) * config.complexityWeights.capability) +
            (Math.max(0, dependencyDepth - 1) * config.complexityWeights.dependency)
        )
    );

    return {
        mode,
        reason_codes: reasonCodes,
        scores: {
            complexity: Math.round(complexity * 100) / 100,
            risk: Math.round(riskScore * 100) / 100,
            dependency: dependencyDepth >= 2 ? 0.85 : 0.35,
        },
    };
}

function buildTaskGraphForResponse(
    capabilities: string[],
    mode: 'single_agent' | 'multi_agent',
    dependencyDepth: number
): NonNullable<AgentResponse['task_graph']> {
    const tasks = capabilities.slice(0, 4).map((cap, index) => ({
        id: `task_${index + 1}`,
        title: capabilityToTaskTitle(cap),
        required_capabilities: [cap],
    }));

    const edges: Array<{ from: string; to: string }> = [];
    if (dependencyDepth >= 2 && tasks.length >= 2) {
        for (let i = 0; i < tasks.length - 1; i++) {
            edges.push({ from: tasks[i].id, to: tasks[i + 1].id });
        }
    }

    const criticalPath = edges.length > 0
        ? tasks.map(t => t.id)
        : tasks.length > 0
            ? [tasks[0].id]
            : [];

    const parallelGroups = mode === 'multi_agent' && tasks.length > 1
        ? [dependencyDepth >= 2 && tasks.length > 2 ? tasks.slice(0, -1).map(t => t.id) : tasks.map(t => t.id)]
        : [];

    return { tasks, edges, critical_path: criticalPath, parallel_groups: parallelGroups };
}

function capabilityToTaskTitle(cap: string): string {
    if (cap.includes('rewrite')) return 'Rewrite and expression optimization';
    if (cap.includes('flight')) return 'Flight search';
    if (cap.includes('hotel')) return 'Hotel search';
    if (cap.includes('transport')) return 'Local transport planning';
    if (cap.includes('itinerary')) return 'Itinerary planning';
    if (cap.includes('live')) return 'Live evidence retrieval';
    if (cap.includes('web_search')) return 'Web search';
    if (cap.includes('agent') || cap.includes('market')) return 'Agent discovery and execution';
    if (cap.includes('avatar')) return 'Digital avatar profile update';
    if (cap.includes('destiny')) return 'Destiny navigation strategy evaluation';
    if (cap.includes('lix') || cap.includes('negotiation')) return 'LIX intent exchange';
    return 'General task reasoning';
}

function extractEvidenceFromToolResults(toolResults: ToolExecutionResult[]): Array<{ source: string; url: string; fetched_at?: string }> {
    const evidence: Array<{ source: string; url: string; fetched_at?: string }> = [];
    for (const result of toolResults) {
        const output = result.output;
        const list = Array.isArray(output?.evidence?.items) ? output.evidence.items : [];
        for (const item of list) {
            evidence.push({
                source: String(item?.source_name || item?.source || result.toolName),
                url: String(item?.url || ''),
                fetched_at: output?.evidence?.fetched_at ? String(output.evidence.fetched_at) : undefined,
            });
        }
        if (Array.isArray(output?.sources)) {
            for (const source of output.sources) {
                evidence.push({
                    source: String(source || result.toolName),
                    url: '',
                });
            }
        }
    }
    return evidence.slice(0, 12);
}

function extractBudgetFromQuery(query: string): { amount: number; currency: string } | null {
    const text = String(query || '');
    const match = text.match(/预算\s*(?:约|大约|大概)?\s*([0-9]+(?:\.[0-9]+)?)\s*(英镑|GBP|gbp|£|人民币|CNY|cny|元|USD|usd|\$)?/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const unit = String(match[2] || '').trim().toLowerCase();
    const currency = unit === '英镑' || unit === 'gbp' || unit === '£'
        ? 'GBP'
        : unit === '人民币' || unit === 'cny' || unit === '元'
            ? 'CNY'
            : unit === 'usd' || unit === '$'
                ? 'USD'
                : 'CNY';
    return { amount, currency };
}

function buildSkillInvocationsFromTools(
    toolResults: ToolExecutionResult[]
): NonNullable<AgentResponse['skill_invocations']> {
    return toolResults.map((result) => ({
        skill_id: result.toolName,
        source: result.toolName.startsWith('github:') ? 'github' : 'local',
        status: result.success ? 'success' : 'error',
        latency_ms: result.executionTimeMs,
        evidence_count: Array.isArray(result.output?.evidence?.items) ? result.output.evidence.items.length : 0,
        sandbox_level: result.toolName.startsWith('github:') ? 'sandbox' : 'approved',
    }));
}

async function getGeminiClient(apiKey: string) {
    if (!geminiClient || apiKey !== currentApiKey) {
        currentApiKey = apiKey;
        // Use dynamic import for @google/genai (browser-compatible)
        if (!GoogleGenerativeAI) {
            const genAIModule = await import('@google/generative-ai');
            GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
        }
        geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
}

// ============================================================================
// Super Agent Service (V5.1 - Gemini Function Calling)
// ============================================================================

export class SuperAgentService {
    private apiKey: string = '';
    private readonly llmSoftTimeoutMs = this.resolveLlmSoftTimeoutMs();
    private readonly realtimeRetryMaxAttempts = this.resolveRealtimeRetryMaxAttempts();
    private readonly toolRepeatLimit = this.resolveToolRepeatLimit();
    private readonly toolCallBudget = this.resolveToolCallBudget();

    private resolveLlmSoftTimeoutMs(): number {
        const fromEnv = Number(process.env.SUPERAGENT_GEMINI_SOFT_TIMEOUT_MS ?? 18000);
        if (!Number.isFinite(fromEnv)) return 18000;
        return Math.max(3000, Math.min(120000, Math.round(fromEnv)));
    }

    private resolveRealtimeRetryMaxAttempts(): number {
        const fromEnv = Number(process.env.SUPERAGENT_REALTIME_RETRY_ATTEMPTS ?? 2);
        if (!Number.isFinite(fromEnv)) return 2;
        return Math.max(1, Math.min(3, Math.round(fromEnv)));
    }

    private resolveToolRepeatLimit(): number {
        const fromEnv = Number(process.env.SUPERAGENT_TOOL_REPEAT_LIMIT ?? 2);
        if (!Number.isFinite(fromEnv)) return 2;
        return Math.max(1, Math.min(4, Math.round(fromEnv)));
    }

    private resolveToolCallBudget(): number {
        const fromEnv = Number(process.env.SUPERAGENT_TOOL_CALL_BUDGET ?? 6);
        if (!Number.isFinite(fromEnv)) return 6;
        return Math.max(2, Math.min(12, Math.round(fromEnv)));
    }

    private toolCallSignature(toolName: string, args: Record<string, any>): string {
        return `${toolName}:${stableSerializeArgs(args || {})}`;
    }

    private isRealtimeTool(toolName: string): boolean {
        return toolName === 'live_search' || toolName === 'web_search' || toolName === 'web_exec';
    }

    private isExplicitWebExecIntent(query: string): boolean {
        const text = String(query || '').toLowerCase();
        return /(点击|打开网页|访问网站|填写表单|提交|登录|navigate|open\s+website|click|fill|browser)/i.test(text);
    }

    private isExplicitMarketIntent(query: string): boolean {
        const text = String(query || '').toLowerCase();
        return /(lix|agent marketplace|市场|发布需求|接单|报价|交易|上架|找服务方|外包|agent\s*market)/i.test(text);
    }

    private requiresLixConstraintPackage(query: string, response?: AgentResponse): boolean {
        const text = String(query || '').toLowerCase();
        const summary = String(response?.summary || response?.answer || '').toLowerCase();
        return this.isExplicitMarketIntent(query) ||
            /(builder|build\s+.*\b(agent|skill)\b|publish\s+.*\brequirement\b|发布.*(agent|skill)|发布需求)/i.test(text) ||
            summary.includes('lix escalation') ||
            summary.includes('supplier escalation') ||
            response?.lix_dispatch?.mode === 'lix_dispatched';
    }

    private extractMissingLixConstraintFields(constraints: {
        budgetProvided: boolean;
        deadlineProvided: boolean;
        acceptanceProvided: boolean;
    }): string[] {
        const missing: string[] = [];
        if (!constraints.budgetProvided) missing.push('budget');
        if (!constraints.deadlineProvided) missing.push('deadline');
        if (!constraints.acceptanceProvided) missing.push('acceptance_criteria');
        return missing;
    }

    private extractMissingDirectTaskDetails(route: ReturnType<typeof classifyFreshness>): string[] {
        const items = Array.isArray(route.missing_constraints) ? route.missing_constraints : [];
        return items
            .map((item) => String(item || '').trim())
            .filter(Boolean)
            .slice(0, 3);
    }

    private isExplicitCommerceIntent(query: string): boolean {
        const text = String(query || '').toLowerCase();
        return /(购买|下单|报价|商品|比价|买|purchase|shopping|price compare|电商)/i.test(text);
    }

    private isTravelOrTicketingIntent(query: string): boolean {
        const text = String(query || '').toLowerCase();
        return /(旅行|旅游|机票|航班|酒店|住宿|行程|签证|高铁|火车票|travel|flight|hotel|ticket|itinerary)/i.test(text);
    }

    private buildToolBlockedResponse(toolName: string, reason: string): any {
        return {
            success: false,
            blocked: true,
            blocked_reason: reason,
            tool: toolName,
            retryable: false,
            message: `Tool Governor blocked ${toolName}: ${reason}`,
        };
    }

    private applyToolGovernor(
        toolName: string,
        toolArgs: Record<string, any>,
        ctx: ToolGovernorContext
    ): ToolGovernorDecision {
        const nextCount = (ctx.callCounts.get(toolName) || 0) + 1;
        ctx.callCounts.set(toolName, nextCount);
        const totalCalls = Array.from(ctx.callCounts.values()).reduce((sum, current) => sum + current, 0);
        const signature = this.toolCallSignature(toolName, toolArgs);

        if (nextCount > this.toolRepeatLimit) {
            const reason = `repeat_limit_exceeded_${this.toolRepeatLimit}`;
            return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
        }

        if (ctx.successfulSignatures.has(signature)) {
            const reason = 'duplicate_success_call';
            return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
        }

        if (totalCalls > this.toolCallBudget) {
            const isCriticalRealtime = ctx.route.needs_live_data && this.isRealtimeTool(toolName) && nextCount <= 2;
            if (!isCriticalRealtime) {
                const reason = `tool_call_budget_exceeded_${this.toolCallBudget}`;
                return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
            }
        }

        if (!ctx.route.needs_live_data && toolName === 'live_search') {
            const reason = 'live_search_not_required';
            return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
        }

        if (toolName === 'web_exec' && !this.isExplicitWebExecIntent(ctx.query)) {
            const reason = 'web_exec_not_explicitly_required';
            return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
        }

        if (
            toolName === 'broadcast_agent_requirement'
            && !this.isExplicitMarketIntent(ctx.query)
            && ctx.routingDecision.mode !== 'multi_agent'
        ) {
            const reason = 'agent_requirement_not_required';
            return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
        }

        if (toolName === 'broadcast_intent' && !this.isExplicitCommerceIntent(ctx.query)) {
            const reason = 'broadcast_intent_not_required';
            return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
        }

        if (toolName === 'price_compare') {
            if (this.isTravelOrTicketingIntent(ctx.query)) {
                const reason = 'travel_compare_use_live_search';
                return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
            }
            if (!this.isExplicitCommerceIntent(ctx.query)) {
                const reason = 'price_compare_ecommerce_only';
                return { allowed: false, reason, response: this.buildToolBlockedResponse(toolName, reason) };
            }
        }

        return { allowed: true };
    }

    private isToolExecutionSuccess(output: any): boolean {
        if (output && typeof output === 'object') {
            if ((output as any).blocked === true) return false;
            if (Object.prototype.hasOwnProperty.call(output, 'success')) {
                return Boolean((output as any).success);
            }
        }
        return true;
    }

    private extractToolErrorText(output: any, error?: string): string {
        const outputCode = output?.error?.code;
        const outputMessage = output?.error?.message || output?.message;
        return String(error || outputCode || outputMessage || '').toLowerCase();
    }

    private shouldRetryRealtimeTool(
        toolName: string,
        output: any,
        error: string | undefined,
        attempt: number
    ): boolean {
        if (!this.isRealtimeTool(toolName)) return false;
        if (attempt >= this.realtimeRetryMaxAttempts) return false;
        if (output?.error?.retryable === true) return true;

        const errorText = this.extractToolErrorText(output, error);
        if (!errorText) return true;
        return /(timeout|network|econn|enotfound|tempor|busy|rate|http_5|gateway|upstream|fetch failed|retry)/i.test(errorText);
    }

    private async executeToolWithRetry(
        tool: { execute: (args: Record<string, any>) => Promise<any> },
        toolName: string,
        toolArgs: Record<string, any>
    ): Promise<{ output: any; success: boolean; error?: string; attempts: number; executionPath: 'cli' | 'tool' | 'cli_fallback_tool' }> {
        let attempts = 0;
        let output: any = null;
        let success = false;
        let error: string | undefined;
        let executionPath: 'cli' | 'tool' | 'cli_fallback_tool' = 'tool';

        while (attempts < this.realtimeRetryMaxAttempts) {
            attempts += 1;
            try {
                const cliRun = await executeToolViaCli(toolName, toolArgs);
                if (cliRun.supported) {
                    output = cliRun.output;
                    success = Boolean(cliRun.success);
                    error = success ? undefined : (cliRun.error || this.extractToolErrorText(output));
                    executionPath = 'cli';
                    if (!success) {
                        try {
                            const fallbackOutput = await tool.execute(toolArgs);
                            const fallbackSuccess = this.isToolExecutionSuccess(fallbackOutput);
                            output = fallbackOutput;
                            success = fallbackSuccess;
                            error = fallbackSuccess ? undefined : this.extractToolErrorText(fallbackOutput, error);
                            executionPath = 'cli_fallback_tool';
                        } catch (fallbackError) {
                            const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                            output = {
                                ...(output && typeof output === 'object' ? output : {}),
                                fallback_error: fallbackMessage,
                            };
                            success = false;
                            error = `${error || 'cli_failed'}; fallback=${fallbackMessage}`;
                        }
                    }
                } else {
                    output = await tool.execute(toolArgs);
                    success = this.isToolExecutionSuccess(output);
                    error = success ? undefined : this.extractToolErrorText(output);
                    executionPath = 'tool';
                }
            } catch (e) {
                success = false;
                error = e instanceof Error ? e.message : String(e);
                output = { error: { code: 'EXEC_ERROR', message: error } };
                executionPath = 'tool';
            }

            if (success) break;
            if (!this.shouldRetryRealtimeTool(toolName, output, error, attempts)) break;
            const backoffMs = Math.min(1200, 250 * attempts);
            console.warn(`[SuperAgent] retrying realtime tool ${toolName}, attempt=${attempts + 1}, reason=${error || 'unknown'}`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }

        return { output, success, error, attempts, executionPath };
    }

    private async generateContentTextWithGuard(
        model: any,
        prompt: string,
        tag: string,
        timeoutMs: number = this.llmSoftTimeoutMs
    ): Promise<string | null> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutSentinel = Symbol(`${tag}_timeout`);
        try {
            const result = await Promise.race<any>([
                model.generateContent(prompt, { timeout: timeoutMs }),
                new Promise((resolve) => {
                    timer = setTimeout(() => resolve(timeoutSentinel), timeoutMs);
                }),
            ]);
            if (result === timeoutSentinel) {
                console.warn(`[SuperAgent] ${tag} timed out after ${timeoutMs}ms, degrading`);
                return null;
            }
            const text = result?.response?.text?.();
            return typeof text === 'string' ? text : '';
        } catch (error) {
            console.warn(`[SuperAgent] ${tag} failed`, error);
            return null;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    private async sendMessageWithGuard(
        chat: any,
        payload: any,
        tag: string,
        timeoutMs: number = this.llmSoftTimeoutMs
    ): Promise<any | null> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutSentinel = Symbol(`${tag}_timeout`);
        try {
            const result = await Promise.race<any>([
                chat.sendMessage(payload, { timeout: timeoutMs }),
                new Promise((resolve) => {
                    timer = setTimeout(() => resolve(timeoutSentinel), timeoutMs);
                }),
            ]);
            if (result === timeoutSentinel) {
                console.warn(`[SuperAgent] ${tag} timed out after ${timeoutMs}ms, degrading`);
                return null;
            }
            return result;
        } catch (error) {
            console.warn(`[SuperAgent] ${tag} failed`, error);
            return null;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    private formatFlightFallbackExample(query: string): string {
        const constraints = parseFlightConstraints(query);
        const datePart = constraints.departureDate || 'tomorrow';
        const timeMap: Record<string, string> = {
            morning: 'morning',
            afternoon: 'afternoon',
            evening: 'evening',
            night: 'night',
        };
        const timePart = constraints.departureTimePreference
            ? timeMap[constraints.departureTimePreference] || ''
            : '';
        const routePart = constraints.origin && constraints.destination
            ? `${constraints.origin} to ${constraints.destination}`
            : 'origin to destination';
        const classMap: Record<string, string> = {
            economy: 'economy',
            business: 'business',
            first: 'first',
        };
        const classPart = constraints.travelClass
            ? classMap[constraints.travelClass] || 'economy'
            : 'economy';
        const passengerPart = `${constraints.passengers || 1} traveler(s)`;

        return `${datePart}${timePart ? ` ${timePart}, ` : ', '}${routePart}, ${classPart}, ${passengerPart}`;
    }

    /**
     * Set API Key for all components
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;

        // Configure all dependent services
        setToolRegistryApiKey(apiKey);
        setProfilingApiKey(apiKey);

        // Legacy: Also set for builtinSkills if still used elsewhere
        import('./builtinSkills').then(mod => {
            mod.setSkillsApiKey(apiKey);
        }).catch(() => { });

        // Configure Plan Generator (Phase 2 Week 2)
        getPlanGenerator().setApiKey(apiKey);

        console.log('[SuperAgent] V5.1 Brain initialized with Gemini + Plan Generator');
    }

    private async tryLlmDecomposeTasks(
        query: string,
        domain: string,
        fallbackCapabilities: string[]
    ): Promise<MarketplaceTask[] | null> {
        if (!this.apiKey) return null;

        try {
            const client = await getGeminiClient(this.apiKey);
            const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });
            const prompt = `You are a task orchestrator. Decompose the user request into 1-6 executable tasks.

Requirements:
1) Output JSON only. Do not output any extra text.
2) JSON format:
{
  "tasks": [
    {
      "title": "Task title",
      "required_capabilities": ["capability_a", "capability_b"],
      "dependency_indexes": [0],
      "parallelizable": true
    }
  ]
}
3) Use 0-based indexes for dependency_indexes.
4) Use English snake_case for capability names.
5) If uncertain, stay concise and reuse known capabilities.

Context:
- domain: ${domain}
- fallback_capabilities: ${fallbackCapabilities.join(', ') || 'general_reasoning'}
- user_query: ${query}`;

            const text = await this.generateContentTextWithGuard(
                model,
                prompt,
                'llm_task_decompose',
                Math.min(this.llmSoftTimeoutMs, 12000)
            );
            if (!text) return null;
            const parsed = extractJsonPayload(text);
            const specs = normalizeLlmTaskSpecs(parsed, fallbackCapabilities);
            if (specs.length === 0) return null;

            const ts = Date.now();
            const ids = specs.map((_, index) => `llm_task_${index + 1}_${ts}`);
            const tasks: MarketplaceTask[] = specs.map((task, index) => ({
                id: ids[index],
                objective: task.title,
                required_capabilities: task.required_capabilities.length > 0
                    ? task.required_capabilities
                    : fallbackCapabilities.slice(0, 2),
                dependencies: task.dependency_indexes
                    .map((depIndex) => ids[depIndex])
                    .filter(Boolean),
                parallelizable: task.parallelizable,
            }));

            return tasks;
        } catch {
            return null;
        }
    }

    private async runReasoningProtocol(
        query: string,
        context: UserContext,
        routingDecision: NonNullable<AgentResponse['routing_decision']>,
        modeInput: ReasoningModeInput
    ): Promise<ReasoningProtocolPayload | null> {
        if (!isReasoningProtocolEnabled()) {
            return null;
        }

        const resolvedMode = resolveReasoningMode(modeInput, query, routingDecision);
        const methods = resolvedMode === 'full'
            ? [...REASONING_METHODS_FULL]
            : [...REASONING_METHODS_LITE];
        const contextHints = normalizeStringArray(context.recentQueries, 4, 80);
        if (!this.apiKey) {
            return this.buildReasoningProtocolFallback(
                query,
                resolvedMode,
                routingDecision,
                contextHints,
                'no_api_key'
            );
        }
        const prompt = `You are the "six-method reasoning protocol layer" for Lumi Cloud Super Agent. Output JSON only.

Rules:
1) Do not output chain-of-thought prose. Output only structured conclusions.
2) mode=${resolvedMode}。
3) methods_applied must be selected from the list below only:
${methods.map((item) => `- ${item}`).join('\n')}
4) Keep all text concise, actionable, and user-readable.
5) JSON schema must strictly match:
{
  "version": "${REASONING_PROTOCOL_VERSION}",
  "mode": "${resolvedMode}",
  "methods_applied": ["..."],
  "root_problem": "...",
  "recommended_strategy": "...",
  "confidence": 0.0-1.0,
  "artifacts": {
    "first_principles": { "assumptions": [], "base_facts": [], "key_levers": [] },
    "stakeholders": [ { "role":"", "motivation":"", "constraints":[], "conflict_level":"low|medium|high" } ],
    "five_whys": [],
    "premortem": [ { "reason":"", "likelihood":0.0, "impact":0.0, "early_signal":"", "mitigation":"" } ],
    "second_order": { "immediate": [], "mid_term": [], "long_term": [] },
    "analogies": [ { "source_domain":"", "mapping":"", "boundary":"" } ]
  }
}

Input:
- user_query: ${query}
- routing_mode: ${routingDecision.mode}
- routing_scores: ${JSON.stringify(routingDecision.scores)}
- recent_queries: ${JSON.stringify(contextHints)}

Constraints:
- In lite mode, fill only first_principles/five_whys/second_order; other fields may be empty arrays.
- In full mode, fill all six methods as much as possible, with at least 3 analogies if feasible.
- JSON must be valid.`;

        try {
            const client = await getGeminiClient(this.apiKey);
            const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });
            const text = await this.generateContentTextWithGuard(
                model,
                prompt,
                'reasoning_protocol',
                Math.min(this.llmSoftTimeoutMs, 15000)
            );
            if (!text) {
                return this.buildReasoningProtocolFallback(
                    query,
                    resolvedMode,
                    routingDecision,
                    contextHints,
                    'llm_timeout'
                );
            }
            const parsed = extractJsonPayload(text);
            const normalized = normalizeReasoningProtocol(parsed, resolvedMode);
            if (!normalized) {
                return this.buildReasoningProtocolFallback(
                    query,
                    resolvedMode,
                    routingDecision,
                    contextHints,
                    'invalid_json'
                );
            }
            return normalized;
        } catch (error) {
            console.warn('[SuperAgent] reasoning protocol degraded:', error);
            return this.buildReasoningProtocolFallback(
                query,
                resolvedMode,
                routingDecision,
                contextHints,
                'runtime_error'
            );
        }
    }

    private buildReasoningProtocolFallback(
        query: string,
        mode: ReasoningResolvedMode,
        routingDecision: NonNullable<AgentResponse['routing_decision']>,
        recentHints: string[],
        degradeReason: string
    ): ReasoningProtocolPayload {
        const rootProblem = normalizeString(query, 96) || 'Goal and constraints are not aligned yet';
        const strategy = mode === 'full'
            ? 'Clarify key constraints first, execute in parallel by task graph, then validate with evidence.'
            : 'Clarify goal and limits first, then provide one immediately executable minimal plan.';

        const topRisk = routingDecision.scores.risk >= 0.75
            ? 'High-risk actions require user confirmation and evidence re-check'
            : 'Incomplete constraints may cause execution drift';

        return {
            version: REASONING_PROTOCOL_VERSION,
            mode,
            methods_applied: mode === 'full'
                ? [...REASONING_METHODS_FULL]
                : [...REASONING_METHODS_LITE],
            root_problem: rootProblem,
            recommended_strategy: strategy,
            confidence: mode === 'full' ? 0.6 : 0.54,
            artifacts: {
                first_principles: {
                    assumptions: ['Default constraints may be incomplete', `Protocol degradation enabled (${degradeReason})`],
                    base_facts: ['Evidence-first', 'Decompose tasks before execution'],
                    key_levers: ['Constraint clarification', 'Execution order', 'Result verification'],
                },
                stakeholders: mode === 'full'
                    ? [
                        {
                            role: 'User',
                            motivation: 'Solve the problem quickly and reliably',
                            constraints: ['Limited time', 'Risk must be controlled'],
                            conflict_level: 'medium',
                        },
                    ]
                    : [],
                five_whys: [
                    'Why is the current outcome unstable? Constraints are not clear enough.',
                    'Why are constraints unclear? Input lacks key context.',
                    'Why is context missing? The request is too short or cross-domain.',
                ],
                premortem: mode === 'full'
                    ? [
                        {
                            reason: topRisk,
                            likelihood: 0.62,
                            impact: 0.78,
                            early_signal: 'Execution steps frequently rollback or user repeatedly rewrites',
                            mitigation: 'Complete constraints before advancing execution',
                        },
                    ]
                    : [],
                second_order: {
                    immediate: ['Give a minimal executable action first to reduce waiting cost'],
                    mid_term: ['Record successful paths to reduce repeated trial-and-error'],
                    long_term: ['Stabilize avatar preferences to improve personalization hit rate'],
                },
                analogies: mode === 'full'
                    ? [
                        {
                            source_domain: 'Medical triage',
                            mapping: 'Classify first, then handle to reduce misjudgment risk',
                            boundary: 'Process analogy only; not a professional diagnosis substitute',
                        },
                        {
                            source_domain: 'Trading risk control',
                            mapping: 'High-risk actions must require second confirmation',
                            boundary: 'Do not directly apply financial rules',
                        },
                        {
                            source_domain: 'Project management',
                            mapping: 'Critical path first, non-critical paths in parallel',
                            boundary: 'Must be adjusted dynamically by user scenario',
                        },
                    ]
                    : [],
            },
        };
    }

    private evaluateOverflowGate(
        query: string,
        domain: string,
        routingDecision: NonNullable<AgentResponse['routing_decision']>,
        requiredCapabilities: string[],
        context?: UserContext
    ): {
        shouldDispatch: boolean;
        normalizedDomain: 'travel' | 'recruitment' | 'local_service' | null;
        reasonCodes: string[];
        overflowContext: {
            mode: 'lumi_primary' | 'capability_auction';
            overflow_reason?: string;
            complexity: number;
            risk: number;
            required_capabilities: number;
            super_agent_queue_depth: number;
        };
    } {
        const policy = DEFAULT_OVERFLOW_GATE_POLICY;
        const normalizedDomain = normalizeLixDomain(domain);
        const complexity = Number(routingDecision.scores.complexity || 0);
        const risk = Number(routingDecision.scores.risk || 0);
        const requiredCount = Math.max(0, requiredCapabilities.length);
        const queueDepth = Number((context?.preferences as Record<string, unknown> | undefined)?.super_agent_queue_depth || 0);
        const reasonCodes: string[] = [];

        if (!normalizedDomain) {
            return {
                shouldDispatch: false,
                normalizedDomain: null,
                reasonCodes: ['domain_not_supported'],
                overflowContext: {
                    mode: 'lumi_primary',
                    complexity,
                    risk,
                    required_capabilities: requiredCount,
                    super_agent_queue_depth: queueDepth,
                },
            };
        }
        if (complexity >= policy.complexityMin) reasonCodes.push(`complexity>=${policy.complexityMin}`);
        if (risk >= policy.riskMin) reasonCodes.push(`risk>=${policy.riskMin}`);
        if (requiredCount >= policy.requiredCapabilitiesMin) reasonCodes.push(`required_capabilities>=${policy.requiredCapabilitiesMin}`);
        if (queueDepth >= policy.queueDepthMin) reasonCodes.push(`super_agent_queue_depth>=${policy.queueDepthMin}`);
        if (/(lix|发布需求|报价|接单|外包|找服务方|marketplace)/i.test(query)) {
            reasonCodes.push('explicit_lix_request');
        }

        return {
            shouldDispatch: reasonCodes.length > 0,
            normalizedDomain,
            reasonCodes,
            overflowContext: {
                mode: reasonCodes.length > 0 ? 'capability_auction' : 'lumi_primary',
                overflow_reason: reasonCodes[0],
                complexity,
                risk,
                required_capabilities: requiredCount,
                super_agent_queue_depth: queueDepth,
            },
        };
    }

    private async tryDispatchToLix(
        query: string,
        requiredCapabilities: string[],
        normalizedDomain: 'travel' | 'recruitment' | 'local_service',
        reasonCodes: string[],
        overflowContext: {
            mode: 'lumi_primary' | 'capability_auction';
            overflow_reason?: string;
            complexity: number;
            risk: number;
            required_capabilities: number;
            super_agent_queue_depth: number;
        },
        traceId: string,
        startTime: number,
        routingDecision: NonNullable<AgentResponse['routing_decision']>,
        routingTaskGraph: NonNullable<AgentResponse['task_graph']>,
        discoverySkillInvocations: NonNullable<AgentResponse['skill_invocations']>,
        reasoningProtocol: ReasoningProtocolPayload | null
    ): Promise<AgentResponse | null> {
        try {
            const response = await fetch(buildApiUrl('/api/lix/solution/broadcast'), {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    requester_id: 'demo_user',
                    requester_type: 'user',
                    query,
                    domain: normalizedDomain,
                    required_capabilities: requiredCapabilities,
                    reasoning_trace_id: traceId,
                    overflow_context: overflowContext,
                    dispatch_policy_version: 'lix_1_5',
                    prefer_paid_expert: true,
                }),
            });
            const raw = await response.text();
            const payload = raw ? JSON.parse(raw) : {};
            if (!response.ok || payload?.success !== true) {
                return null;
            }
            const intentId = String(payload?.intent_id || payload?.intent?.intent_id || '').trim();
            const offersCount = Number(payload?.offers_count || payload?.intent?.offers?.length || 0);
            const status = String(payload?.status || payload?.intent?.status || 'broadcasting');
            const summary = offersCount > 0
                ? `Complex task dispatched to LIX. Received ${offersCount} executable proposals.`
                : 'Complex task dispatched to LIX. Waiting for live supply responses.';
            return {
                answer: summary,
                toolsUsed: ['lix_capability_auction'],
                toolResults: [],
                confidence: 0.88,
                executionTimeMs: Math.round(performance.now() - startTime),
                turns: 1,
                trace_id: traceId,
                routing_decision: routingDecision,
                task_graph: routingTaskGraph,
                skill_invocations: discoverySkillInvocations,
                evidence: [],
                reasoning_protocol: reasoningProtocol || undefined,
                lix_dispatch: {
                    mode: 'lix_dispatched',
                    reason_codes: reasonCodes,
                    intent_id: intentId || undefined,
                    status,
                    offers_count: offersCount,
                },
            };
        } catch {
            return null;
        }
    }

    private async resolveTaskSkillPlan(
        task: MarketplaceTask,
        reasoningProtocol: ReasoningProtocolPayload | null,
        options?: {
            preferGithubSkills?: boolean;
            forceGithubSearch?: boolean;
        }
    ): Promise<TaskSkillPlan> {
        const expandedCapabilities = expandCapabilitiesWithReasoning(
            task.required_capabilities,
            reasoningProtocol
        );
        const discoveryQuery = buildReasoningDiscoveryQuery(
            `${task.objective} ${expandedCapabilities.join(' ')}`.trim(),
            reasoningProtocol
        );
        const externalSearchMode: ExternalSearchMode = (
            options?.forceGithubSearch || options?.preferGithubSkills
                ? 'force'
                : 'auto'
        );
        const discovery = await getSkillsDiscoveryAdapter()
            .discoverSkills(discoveryQuery, expandedCapabilities, {
                externalSearchMode,
                minApproved: 3,
            })
            .catch(() => null);

        const approved = discovery?.approvedCandidates || [];
        const delegated = pickDelegatedSkills(approved, Boolean(options?.preferGithubSkills));
        const localTemplateSkills = expandedCapabilities.slice(0, 2).map((cap) => `local_template:${cap}`);

        return {
            traceId: discovery?.traceId || `skills_task_${Date.now()}_${task.id}`,
            taskId: task.id,
            discoveryQuery,
            requiredCapabilities: expandedCapabilities,
            delegatedSkills: delegated,
            primarySkill: delegated[0] || null,
            fallbackSkills: delegated.slice(1, 3),
            localTemplateSkills,
        };
    }

    private resolveTaskIntentDomain(task: MarketplaceTask, detectedDomain: string): string {
        const caps = task.required_capabilities.join(' ').toLowerCase();
        if (caps.includes('flight')) return 'travel.flight';
        if (caps.includes('hotel')) return 'travel.hotel';
        if (caps.includes('restaurant')) return 'travel.restaurant';
        if (caps.includes('attraction')) return 'travel.attraction';
        if (caps.includes('transport')) return 'travel.transport';
        if (caps.includes('job') || caps.includes('resume') || caps.includes('salary')) return 'recruitment';
        if (caps.includes('legal')) return 'legal';
        if (caps.includes('health')) return 'health';
        if (caps.includes('finance')) return 'finance';
        const classifiedDomain = classifyFreshness(task.objective).intent_domain;
        if (classifiedDomain && classifiedDomain !== 'knowledge') return classifiedDomain;

        if (detectedDomain === 'shopping') return 'ecommerce.product';
        if (detectedDomain === 'local_service') return 'local.service';
        return detectedDomain === 'general' ? 'knowledge' : detectedDomain;
    }

    private buildFallbackToolArgs(
        task: MarketplaceTask,
        detectedDomain: string,
        toolLocale: string
    ): Record<string, any> {
        return {
            query: task.objective,
            intent_domain: this.resolveTaskIntentDomain(task, detectedDomain),
            locale: toolLocale,
        };
    }

    private async executeTaskSkillPlanFallback(
        task: MarketplaceTask,
        taskSkillPlan: TaskSkillPlan | null,
        detectedDomain: string,
        toolLocale: string,
        primaryError: string,
        startMs: number
    ): Promise<AgentExecutionResult | null> {
        if (!taskSkillPlan) return null;
        const toolRegistry = getToolRegistry();
        const skillRegistry = getSkillRegistry();

        const orderedCandidates = [
            ...taskSkillPlan.fallbackSkills,
            ...(taskSkillPlan.primarySkill ? [taskSkillPlan.primarySkill] : []),
            ...taskSkillPlan.delegatedSkills,
        ];
        const seen = new Set<string>();

        const evidenceFromOutput = (output: any): Array<{ source: string; url: string; fetched_at?: string }> => {
            if (!output || typeof output !== 'object') return [];
            const items = Array.isArray(output?.evidence?.items) ? output.evidence.items : [];
            if (items.length > 0) {
                return items.slice(0, 5).map((item: any) => ({
                    source: item?.source_name || output?.evidence?.provider || 'fallback_tool',
                    url: item?.url || '',
                    fetched_at: output?.evidence?.fetched_at ? String(output.evidence.fetched_at) : undefined,
                }));
            }
            return [];
        };

        for (const candidate of orderedCandidates) {
            if (!candidate || seen.has(candidate.id)) continue;
            seen.add(candidate.id);

            if (candidate.id.startsWith('tool:')) {
                const toolName = candidate.id.slice('tool:'.length);
                const tool = toolRegistry.getTool(toolName);
                if (!tool) continue;
                const run = await this.executeToolWithRetry(
                    tool,
                    toolName,
                    this.buildFallbackToolArgs(task, detectedDomain, toolLocale)
                );
                if (!run.success) continue;
                return {
                    task_id: task.id,
                    agent_id: `skill_fallback:${toolName}`,
                    success: true,
                    data: {
                        ...run.output,
                        fallback: {
                            mode: 'skill_plan_fallback',
                            selected_skill_id: candidate.id,
                            primary_error: primaryError,
                            execution_path: run.executionPath,
                        },
                    },
                    evidence: evidenceFromOutput(run.output),
                    latency_ms: Math.max(1, Date.now() - startMs),
                };
            }

            if (candidate.id.startsWith('skill:')) {
                const skillId = candidate.id.slice('skill:'.length);
                const skill = skillRegistry.getSkill(skillId);
                if (!skill) continue;
                try {
                    const skillOutput = await skill.execute(
                        {
                            query: task.objective,
                            objective: task.objective,
                            required_capabilities: task.required_capabilities,
                        },
                        {}
                    );
                    if (!skillOutput?.success) continue;
                    return {
                        task_id: task.id,
                        agent_id: `skill_fallback:${skillId}`,
                        success: true,
                        data: {
                            ...skillOutput,
                            fallback: {
                                mode: 'skill_plan_fallback',
                                selected_skill_id: candidate.id,
                                primary_error: primaryError,
                                execution_path: 'skill_registry',
                            },
                        },
                        evidence: Array.isArray(skillOutput?.sources)
                            ? skillOutput.sources.slice(0, 5).map((source: string) => ({ source, url: '' }))
                            : [],
                        latency_ms: Math.max(1, Date.now() - startMs),
                    };
                } catch {
                    continue;
                }
            }
        }

        const fallbackTemplates = taskSkillPlan.localTemplateSkills.slice(0, 1);
        if (fallbackTemplates.length > 0) {
            const templateId = fallbackTemplates[0];
            return {
                task_id: task.id,
                agent_id: `skill_fallback:${templateId}`,
                success: true,
                data: {
                    success: true,
                    summary: `Template fallback executed for ${task.objective}`,
                    next_action: 'Provide one more constraint and run this task again for stronger evidence.',
                    fallback: {
                        mode: 'local_template_fallback',
                        selected_skill_id: templateId,
                        primary_error: primaryError,
                        execution_path: 'local_template',
                    },
                },
                evidence: [],
                latency_ms: Math.max(1, Date.now() - startMs),
            };
        }

        return null;
    }

    /**
     * Core Method: Process user query using ReAct Loop with Gemini
     */
    async processWithReAct(
        query: string,
        context: UserContext = {},
        reasoningMode: ReasoningModeInput = configuredDefaultReasoningMode()
    ): Promise<AgentResponse> {
        if (!this.apiKey) {
            const runtimeKey = resolveRuntimeGeminiApiKey();
            if (runtimeKey) {
                this.setApiKey(runtimeKey);
            }
        }
        const startTime = performance.now();
        const traceId = `trace_${Date.now()}`;
        const flightConstraints = parseFlightConstraints(query);
        const outputLocale = this.resolveOutputLocale(context);
        const toolLocale = this.resolveToolLocale(outputLocale);
        console.log(`[SuperAgent] 🧠 ReAct Loop starting for: "${query}"`);

        // Telemetry: Track query received
        track.queryReceived(query, traceId);

        // ====================================================================
        // Context Enrichment: Build a context-aware query from conversation
        // history so short follow-ups (e.g. "15000") get proper context.
        // ====================================================================
        const conversationHistory = context.conversationHistory || [];
        const contextEnrichedQuery = this.buildContextEnrichedQuery(query, conversationHistory);
        if (contextEnrichedQuery !== query) {
            console.log(`[SuperAgent] 📝 Context-enriched query: "${contextEnrichedQuery}"`);
        }

        // ====================================================================
        // Marketplace Pre-Routing: Complex multi-task queries go through
        // the marketplace pipeline for agent discovery + DAG execution.
        // Simple queries continue to the standard ReAct loop below.
        // ====================================================================
        const detectedCaps = detectCapabilities(contextEnrichedQuery);
        const preParsedTravelCtx = parseTravelContext(contextEnrichedQuery);
        let detectedDomain = detectDomain(contextEnrichedQuery);
        const looksLikeTravelIntent = /(旅行|旅游|休假|度假|机票|航班|酒店|行程|trip|travel|vacation|holiday|从.+(到|去).+)/i
            .test(contextEnrichedQuery);
        if (
            detectedDomain === 'general'
            && looksLikeTravelIntent
            && (preParsedTravelCtx.origin || preParsedTravelCtx.destination)
        ) {
            detectedDomain = 'travel';
        }
        const freshnessRoute = classifyFreshness(contextEnrichedQuery);
        const llmDecomposedTasksRaw = await this.tryLlmDecomposeTasks(
            contextEnrichedQuery,
            detectedDomain,
            detectedCaps
        );
        const llmDecomposedTasks = llmDecomposedTasksRaw;
        const routingCaps = Array.from(
            new Set([
                ...detectedCaps,
                ...(llmDecomposedTasks || []).flatMap((task) => task.required_capabilities || []),
            ])
        );
        if (routingCaps.length === 0) {
            routingCaps.push('general_reasoning');
        }

        const baseRoutingDecision = evaluateRoutingDecision(contextEnrichedQuery, detectedDomain, routingCaps);
        const routingDependencyDepth = baseRoutingDecision.scores.dependency >= 0.8 ? 2 : 1;
        const baseRoutingTaskGraph = llmDecomposedTasks && llmDecomposedTasks.length > 0
            ? buildTaskGraphFromPlanTasks(llmDecomposedTasks, baseRoutingDecision.mode)
            : buildTaskGraphForResponse(
                routingCaps,
                baseRoutingDecision.mode,
                routingDependencyDepth
            );
        const requestedReasoningMode = normalizeReasoningModeInput(reasoningMode);
        const reasoningProtocol = await this.runReasoningProtocol(
            contextEnrichedQuery,
            context,
            baseRoutingDecision,
            requestedReasoningMode
        );
        const routingDecision = enrichRoutingWithReasoning(baseRoutingDecision, reasoningProtocol);
        const executionRoutingDecision: NonNullable<AgentResponse['routing_decision']> = routingDecision;
        const routingTaskGraph = enrichTaskGraphWithReasoning(baseRoutingTaskGraph, reasoningProtocol);
        const discoveryCapabilities = expandCapabilitiesWithReasoning(routingCaps, reasoningProtocol);
        const discoveryQuery = buildReasoningDiscoveryQuery(contextEnrichedQuery, reasoningProtocol);
        const primaryDomainForDiscovery = freshnessRoute.intent_domain.split('.')[0];
        const forceExternalDiscovery = executionRoutingDecision.mode === 'multi_agent'
            && !this.isHighRiskDomain(primaryDomainForDiscovery);
        const skillDiscovery = await getSkillsDiscoveryAdapter()
            .discoverSkills(discoveryQuery, discoveryCapabilities, {
                externalSearchMode: forceExternalDiscovery ? 'force' : 'auto',
            })
            .catch(() => null);
        const discoverySkillInvocations: NonNullable<AgentResponse['skill_invocations']> =
            skillDiscovery?.approvedCandidates.slice(0, 3).map(candidate => ({
                skill_id: candidate.id,
                source: toInvocationSource(candidate.source),
                status: 'success',
                latency_ms: candidate.latencyP95 ?? 0,
                evidence_count: 0,
                sandbox_level: candidate.sandboxLevel,
            })) || [];
        const highRiskExecutionBlocked = this.isHighRiskDomain(freshnessRoute.intent_domain.split('.')[0]) &&
            /(auto\s*execute|execute\s*now|buy\s*now|purchase\s*now|sign\s*contract|transfer\s*funds|prescribe|diagnose|自动执行|立即执行|下单|采购|签约|转账|处方|诊断)/i
                .test(contextEnrichedQuery);
        if (highRiskExecutionBlocked) {
            return this.withContractEnvelope({
                answer: 'High-risk domains are limited to decision-support mode. I can provide evidence-backed options, risk notes, and a reversible execution plan, but I will not perform irreversible actions directly.',
                toolsUsed: [],
                toolResults: [],
                confidence: 0.76,
                executionTimeMs: Math.round(performance.now() - startTime),
                turns: 0,
                trace_id: traceId,
                routing_decision: executionRoutingDecision,
                task_graph: routingTaskGraph,
                skill_invocations: discoverySkillInvocations,
                evidence: [],
                reasoning_protocol: reasoningProtocol || undefined,
            }, contextEnrichedQuery, freshnessRoute, executionRoutingDecision);
        }
        const overflowGate = this.evaluateOverflowGate(
            contextEnrichedQuery,
            detectedDomain,
            executionRoutingDecision,
            routingCaps,
            context
        );
        if (overflowGate.shouldDispatch && overflowGate.normalizedDomain) {
            const dispatched = await this.tryDispatchToLix(
                contextEnrichedQuery,
                routingCaps,
                overflowGate.normalizedDomain,
                overflowGate.reasonCodes,
                overflowGate.overflowContext,
                traceId,
                startTime,
                executionRoutingDecision,
                routingTaskGraph,
                discoverySkillInvocations,
                reasoningProtocol
            );
            if (dispatched) {
                return this.withContractEnvelope(
                    dispatched,
                    contextEnrichedQuery,
                    freshnessRoute,
                    executionRoutingDecision
                );
            }
        }
        const marketplace = await ensureMarketplaceCatalogReady(true);
        const isComplexQuery = executionRoutingDecision.mode === 'multi_agent'
            && !routingCaps.every(c => c === 'general')
            && marketplace.getRegisteredAgents().length > 0;

        // Parse travel context once, share across all agents
        const travelCtx = preParsedTravelCtx;
        if (travelCtx.destination) {
            console.log(`[SuperAgent] 🗺️ Travel context parsed:`, JSON.stringify(travelCtx));
        }

        if (isComplexQuery) {
            console.log(`[SuperAgent] 🏪 Marketplace pre-route: domain=${detectedDomain}, caps=[${routingCaps}]`);
            try {
                const taskSkillPlanCache = new Map<string, TaskSkillPlan>();
                const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => {
                    const start = Date.now();
                    let taskSkillPlan: TaskSkillPlan | null = taskSkillPlanCache.get(task.id) || null;
                    try {
                        // Find the agent descriptor and delegate by source.
                        const agents = marketplace.getRegisteredAgents();
                        const agent = agents.find(a => a.id === agentId);
                        if (!agent) throw new Error(`Agent ${agentId} not found`);
                        const preferGithubSkills = agent.source === 'external_market'
                            || executionRoutingDecision.mode === 'multi_agent';
                        if (!taskSkillPlan) {
                            taskSkillPlan = await this.resolveTaskSkillPlan(task, reasoningProtocol, {
                                preferGithubSkills,
                                forceGithubSearch: executionRoutingDecision.mode === 'multi_agent',
                            });
                        }
                        taskSkillPlanCache.set(task.id, taskSkillPlan);

                        if (agent.source === 'specialized') {
                            // Build rich params from parsed travel context
                            const agentType = agent.execute_ref as SpecializedAgentType;
                            const taskParams: Record<string, any> = { query: task.objective };

                            // Share travel context across agents
                            if (travelCtx.destination) taskParams.destination = travelCtx.destination;
                            if (travelCtx.origin) taskParams.origin = travelCtx.origin;

                            if (agentType === 'hotel_booking') {
                                if (travelCtx.checkInDate) taskParams.checkInDate = travelCtx.checkInDate;
                                if (travelCtx.checkOutDate) taskParams.checkOutDate = travelCtx.checkOutDate;
                                if (travelCtx.nights) taskParams.nights = travelCtx.nights;
                                if (travelCtx.adults) taskParams.adults = travelCtx.adults;
                                if (travelCtx.currency) taskParams.currency = travelCtx.currency;
                            }
                            if (agentType === 'flight_booking') {
                                if (travelCtx.departureDate) taskParams.departureDate = travelCtx.departureDate;
                                if (travelCtx.adults) taskParams.passengers = travelCtx.adults;
                                if (travelCtx.currency) taskParams.currency = travelCtx.currency;
                            }
                            taskParams.skill_plan = {
                                trace_id: taskSkillPlan.traceId,
                                discovery_query: taskSkillPlan.discoveryQuery,
                                primary_skill_id: taskSkillPlan.primarySkill?.id || null,
                                fallback_skill_ids: taskSkillPlan.fallbackSkills.map(s => s.id),
                                approved_skill_ids: taskSkillPlan.delegatedSkills.map(s => s.id),
                                local_template_ids: taskSkillPlan.localTemplateSkills,
                            };

                            const specializedTask = {
                                id: `mkt_${task.id}`,
                                agentType,
                                description: task.objective,
                                params: taskParams,
                                appliedPreferences: [],
                                status: 'pending' as const,
                                priority: 1,
                                canRunParallel: task.parallelizable,
                            };
                            console.log(`[SuperAgent] Executing ${agentType} with params:`, JSON.stringify(taskParams));
                            const result = await executeSpecializedAgent(specializedTask as any, this.apiKey);
                            return {
                                task_id: task.id,
                                agent_id: agentId,
                                success: Boolean(result?.success),
                                data: result,
                                evidence: result?.source
                                    ? [{ source: result.source, url: '' }]
                                    : undefined,
                                latency_ms: Date.now() - start,
                            };
                        }

                        if (agent.source === 'skill_registry') {
                            const registry = getSkillRegistry();
                            const skill = registry.getSkill(agent.execute_ref);
                            if (!skill) throw new Error(`Skill not found: ${agent.execute_ref}`);

                            const firstParam = skill.parameters.find(p => p.required)?.name
                                || skill.parameters[0]?.name
                                || 'query';
                            const input: Record<string, any> = {
                                [firstParam]: task.objective,
                                query: task.objective,
                                delegated_skills: taskSkillPlan.delegatedSkills.map(candidate => ({
                                    skill_id: candidate.id,
                                    source: candidate.source,
                                    sandbox_level: candidate.sandboxLevel,
                                })),
                                local_template_ids: taskSkillPlan.localTemplateSkills,
                            };
                            const skillResult = await skill.execute(input, {});

                            return {
                                task_id: task.id,
                                agent_id: agentId,
                                success: Boolean(skillResult?.success),
                                data: skillResult,
                                evidence: (skillResult?.sources || []).map((s: string) => ({ source: s, url: '' })),
                                latency_ms: Date.now() - start,
                            };
                        }

                        if (agent.source === 'external_market') {
                            const upstreamEndpoint = resolveExternalAgentEndpoint(agent.execute_ref);
                            if (!upstreamEndpoint) {
                                throw new Error(`External agent endpoint unresolved for execute_ref=${agent.execute_ref}`);
                            }

                            const requestPayload = {
                                trace_id: traceId,
                                agent_id: agent.id,
                                execute_ref: agent.execute_ref,
                                task: {
                                    id: task.id,
                                    objective: task.objective,
                                    required_capabilities: task.required_capabilities,
                                    dependencies: task.dependencies,
                                    parallelizable: task.parallelizable,
                                },
                                input: {
                                    query: task.objective,
                                    required_capabilities: task.required_capabilities,
                                    domain: detectedDomain,
                                    skills: {
                                        source: 'github_find_skills',
                                        trace_id: taskSkillPlan.traceId,
                                        primary: taskSkillPlan.primarySkill
                                            ? {
                                                skill_id: taskSkillPlan.primarySkill.id,
                                                source: taskSkillPlan.primarySkill.source,
                                                sandbox_level: taskSkillPlan.primarySkill.sandboxLevel,
                                                capabilities: taskSkillPlan.primarySkill.capabilities,
                                            }
                                            : null,
                                        fallbacks: taskSkillPlan.fallbackSkills.map((candidate) => ({
                                            skill_id: candidate.id,
                                            source: candidate.source,
                                            sandbox_level: candidate.sandboxLevel,
                                            capabilities: candidate.capabilities,
                                        })),
                                        approved_skill_ids: taskSkillPlan.delegatedSkills.map(s => s.id),
                                        local_template_ids: taskSkillPlan.localTemplateSkills,
                                    },
                                },
                                skill_plan: {
                                    policy: 'local_skill -> approved_github_skill -> local_template',
                                    discovery_query: taskSkillPlan.discoveryQuery,
                                    required_capabilities: taskSkillPlan.requiredCapabilities,
                                    primary_skill_id: taskSkillPlan.primarySkill?.id || null,
                                    fallback_skill_ids: taskSkillPlan.fallbackSkills.map(s => s.id),
                                    approved_skill_ids: taskSkillPlan.delegatedSkills.map(s => s.id),
                                    local_template_ids: taskSkillPlan.localTemplateSkills,
                                }
                            };

                            const timeoutMs = getExternalAgentTimeoutMs();
                            const useProxy = shouldUseExternalProxy();
                            const controller = typeof AbortController !== 'undefined'
                                ? new AbortController()
                                : undefined;
                            const timeout = controller
                                ? setTimeout(() => controller.abort(), timeoutMs)
                                : undefined;
                            const requestUrl = useProxy
                                ? buildApiUrl('/api/agent-market/execute')
                                : upstreamEndpoint;
                            const requestBody = useProxy
                                ? {
                                    target_url: upstreamEndpoint,
                                    payload: requestPayload,
                                    timeout_ms: timeoutMs,
                                    retries: getExternalProxyRetries(),
                                }
                                : requestPayload;
                            const requestHeaders: Record<string, string> = {
                                'content-type': 'application/json',
                            };
                            if (useProxy) {
                                const proxyToken = getExternalProxyToken();
                                if (proxyToken) {
                                    requestHeaders['x-agent-market-token'] = proxyToken;
                                }
                            }

                            try {
                                const resp = await fetch(requestUrl, {
                                    method: 'POST',
                                    headers: requestHeaders,
                                    body: JSON.stringify(requestBody),
                                    signal: controller?.signal,
                                });

                                const text = await resp.text();
                                let payload: any = null;
                                if (text) {
                                    try {
                                        payload = JSON.parse(text);
                                    } catch {
                                        payload = { raw: text };
                                    }
                                }

                                if (!resp.ok) {
                                    const snippet = text ? text.slice(0, 240) : '';
                                    throw new Error(`external_agent_http_${resp.status}${snippet ? `: ${snippet}` : ''}`);
                                }

                                const normalizedData = payload?.data ?? payload ?? {};
                                const evidence = normalizeExternalEvidence(payload, agentId, upstreamEndpoint);

                                return {
                                    task_id: task.id,
                                    agent_id: agentId,
                                    success: payload?.success !== false,
                                    data: normalizedData,
                                    evidence,
                                    latency_ms: Date.now() - start,
                                };
                            } finally {
                                if (timeout) clearTimeout(timeout);
                            }
                        }

                        const toolRegistry = getToolRegistry();
                        const tool = toolRegistry.getTool(agent.execute_ref);
                        if (!tool) {
                            throw new Error(`No execute_ref found for agent ${agentId}`);
                        }

                        const toolArgs: Record<string, any> = { query: task.objective };
                        if (
                            task.required_capabilities.includes('live_search')
                            || task.required_capabilities.includes('flight_search')
                            || task.required_capabilities.includes('hotel_search')
                            || task.required_capabilities.includes('local_transport')
                        ) {
                            toolArgs.intent_domain = this.resolveTaskIntentDomain(task, detectedDomain);
                            toolArgs.locale = toolLocale;
                        }

                        const run = await this.executeToolWithRetry(tool, agent.execute_ref, toolArgs);
                        if (!run.success) {
                            throw new Error(run.error || `tool_exec_failed:${agent.execute_ref}`);
                        }
                        const result = run.output;
                        const evidence = Array.isArray(result?.evidence?.items)
                            ? result.evidence.items.map((item: any) => ({
                                source: item?.source_name || result?.evidence?.provider || agentId,
                                url: item?.url || '',
                                fetched_at: result?.evidence?.fetched_at
                                    ? String(result.evidence.fetched_at)
                                    : undefined,
                            }))
                            : undefined;

                        return {
                            task_id: task.id,
                            agent_id: agentId,
                            success: Boolean(result?.success),
                            data: result,
                            evidence,
                            latency_ms: Date.now() - start,
                        };
                    } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        const fallbackResult = await this.executeTaskSkillPlanFallback(
                            task,
                            taskSkillPlan,
                            detectedDomain,
                            toolLocale,
                            errorMessage,
                            start
                        );
                        if (fallbackResult) {
                            return fallbackResult;
                        }
                        return {
                            task_id: task.id,
                            agent_id: agentId,
                            success: false,
                            data: null,
                            error: errorMessage,
                            latency_ms: Date.now() - start,
                        };
                    }
                };

                const { plan, summary, aggregated } = await marketplace.runFullPipeline(
                    contextEnrichedQuery,
                    executor,
                    detectedDomain,
                    llmDecomposedTasks ? { prebuiltTasks: llmDecomposedTasks } : undefined
                );
                const elapsed = performance.now() - startTime;
                const successfulCount = summary.results.filter(r => r.success).length;
                const confidence = summary.results.length > 0
                    ? successfulCount / summary.results.length
                    : 0.5;
                const highRisk = detectedDomain === 'health'
                    || detectedDomain === 'legal'
                    || detectedDomain === 'finance';
                const degradedConstraints = detectedDomain === 'finance'
                    ? 'Please add instrument details (e.g., ticker/symbol), time range, and risk preference'
                    : detectedDomain === 'health'
                        ? 'Please add symptom duration, medical history, and current medication'
                        : detectedDomain === 'legal'
                            ? 'Please add jurisdiction, contract clauses/disputed points, and timeline'
                            : 'Please add key constraints';
                const fallbackByTask = new Map(
                    summary.fallback_used.map(item => [item.task_id, item.to_agent_id])
                );
                const effectiveSelectedAgents = summary.selected_agents.map(item => ({
                    task_id: item.task_id,
                    agent_id: fallbackByTask.get(item.task_id) ?? item.agent_id,
                }));
                const selectedAgentMeta = new Map(
                    marketplace.getRegisteredAgents().map(agent => [agent.id, agent])
                );
                const hasStrongEvidenceAgent = effectiveSelectedAgents.some(item =>
                    selectedAgentMeta.get(item.agent_id)?.evidence_level === 'strong'
                );
                const hasTraceableEvidence = aggregated.evidence.length > 0;
                const shouldDegradeForEvidence = highRisk && (!hasStrongEvidenceAgent || !hasTraceableEvidence);

                // Convert marketplace results to AgentResponse format
                const mktToolResults: ToolExecutionResult[] = summary.results.map(r => ({
                    toolName: r.agent_id || 'marketplace_agent',
                    args: { task_id: r.task_id },
                    output: r.data,
                    success: r.success,
                    error: r.error,
                    executionTimeMs: r.latency_ms,
                }));

                // Build structured answer with LLM synthesis from tool results
                let finalAnswer: string;
                if (shouldDegradeForEvidence) {
                    finalAnswer = `This is a high-risk domain and we do not yet have a strong evidence chain. Switched to constraint-completion mode. ${degradedConstraints}.`;
                } else {
                    // Collect all tool result data for LLM synthesis
                    const toolDataSummaries: string[] = [];
                    const travelBundle = {
                        flights: [] as any[],
                        hotels: [] as any[],
                        flightEvidence: [] as Array<{ title?: string; snippet?: string; url?: string }>,
                        hotelEvidence: [] as Array<{ title?: string; snippet?: string; url?: string }>,
                        restaurants: [] as any[],
                        attractions: [] as any[],
                        toAirport: [] as any[],
                        fromAirport: [] as any[],
                        itineraryDays: [] as any[],
                        notices: [] as string[],
                    };
                    for (const r of summary.results) {
                        const agentMeta = selectedAgentMeta.get(r.agent_id);
                        const agentName = agentMeta?.name || r.agent_id;
                        const data = r.data;
                        const payload = data?.data ?? data;

                        if (!r.success) {
                            const ctas = Array.isArray(data?.fallback?.cta_buttons)
                                ? data.fallback.cta_buttons
                                    .map((item: any) => item?.label)
                                    .filter((label: unknown): label is string => typeof label === 'string' && label.length > 0)
                                    .slice(0, 3)
                                : [];
                            const ctaText = ctas.length > 0 ? `, next steps: ${ctas.join(' / ')}` : '';
                            toolDataSummaries.push(`[${agentName}] switched to robust execution fallback${ctaText}`);
                            if (detectedDomain === 'travel') {
                                const compareLinksRaw = payload?.priceComparisonLinks || payload?.comparisonLinks;
                                const compareLinks = Array.isArray(compareLinksRaw)
                                    ? compareLinksRaw
                                        .map((item: any) => ({
                                            title: item?.name || 'Comparison entry',
                                            url: item?.url || '',
                                            snippet: item?.note || '',
                                        }))
                                    : Object.values(compareLinksRaw || {})
                                        .map((item: any) => ({
                                            title: item?.name || 'Comparison entry',
                                            url: item?.url || '',
                                            snippet: item?.note || '',
                                        }));
                                const targetBucket = /flight|航班|机票/i.test(r.agent_id || agentName)
                                    ? travelBundle.flightEvidence
                                    : /hotel|住宿|酒店/i.test(r.agent_id || agentName)
                                        ? travelBundle.hotelEvidence
                                        : null;
                                if (targetBucket && compareLinks.length > 0) {
                                    targetBucket.push(...compareLinks.slice(0, 5));
                                } else if (ctas.length > 0) {
                                    travelBundle.notices.push(`Next actions provided: ${ctas.join(' / ')}`);
                                }
                            }
                            continue;
                        }

                        // Extract meaningful data for synthesis
                        if (payload?.hotels?.length) {
                            const hotels = payload.hotels.slice(0, 5);
                            travelBundle.hotels.push(...hotels);
                            toolDataSummaries.push(
                                `[${agentName}] found ${payload.hotels.length} hotels:\n` +
                                hotels.map((h: any) => {
                                    const currency = h.currency || travelCtx.currency || 'CNY';
                                    const price = h.pricePerNight ?? h.price ?? '?';
                                    return `- ${h.name || 'Unknown'}: ${currency} ${price}/night, rating: ${h.rating || '?'}`;
                                }).join('\n')
                            );
                        } else if (payload?.flights?.length) {
                            const flights = payload.flights.slice(0, 5);
                            travelBundle.flights.push(...flights);
                            toolDataSummaries.push(
                                `[${agentName}] found ${payload.flights.length} flights:\n` +
                                flights.map((f: any) => {
                                    const flightNo = f.flightNo || f.flightNumber || '';
                                    const depart = f.departure || f.departureTime || '?';
                                    const arrive = f.arrival || f.arrivalTime || '?';
                                    const currency = f.currency || travelCtx.currency || 'CNY';
                                    return `- ${f.airline || ''} ${flightNo}: ${depart}-${arrive}, ${currency} ${f.price || '?'}`;
                                }).join('\n')
                            );
                        } else if (payload?.restaurants?.length) {
                            const restaurants = payload.restaurants.slice(0, 5);
                            travelBundle.restaurants.push(...restaurants);
                            toolDataSummaries.push(
                                `[${agentName}] recommended ${payload.restaurants.length} restaurants:\n` +
                                restaurants.map((item: any) =>
                                    `- ${item.name || 'Unknown'} (${item.priceRange || 'Price TBD'}, rating ${item.rating || '?'})`
                                ).join('\n')
                            );
                        } else if (payload?.attractions?.length) {
                            const attractions = payload.attractions.slice(0, 5);
                            travelBundle.attractions.push(...attractions);
                            toolDataSummaries.push(
                                `[${agentName}] recommended ${payload.attractions.length} attractions:\n` +
                                attractions.map((item: any) =>
                                    `- ${item.name || 'Unknown'} (${item.recommendTime || 'Suggested half day'}, ${item.type || 'Attraction'})`
                                ).join('\n')
                            );
                        } else if (payload?.toAirport?.length || payload?.fromAirport?.length) {
                            travelBundle.toAirport.push(...(payload.toAirport || []));
                            travelBundle.fromAirport.push(...(payload.fromAirport || []));
                            const topToAirport = (payload.toAirport || []).slice(0, 2);
                            const topFromAirport = (payload.fromAirport || []).slice(0, 2);
                            toolDataSummaries.push(
                                `[${agentName}] transport suggestions:\n` +
                                topToAirport.map((item: any) =>
                                    `- To airport: ${item.mode || ''} (${item.duration || '?'}, ${item.cost || '?'})`
                                ).join('\n') +
                                (topFromAirport.length > 0
                                    ? `\n${topFromAirport.map((item: any) =>
                                        `- To city center: ${item.mode || ''} (${item.duration || '?'}, ${item.cost || '?'})`
                                    ).join('\n')}`
                                    : '')
                            );
                        } else if (payload?.days?.length) {
                            travelBundle.itineraryDays.push(...payload.days);
                            const days = payload.days.slice(0, 3);
                            toolDataSummaries.push(
                                `[${agentName}] itinerary draft:\n` +
                                days.map((day: any) => {
                                    const firstActivity = day?.activities?.[0];
                                    return `- Day ${day.day || '?'} ${day.title || ''}: ${firstActivity?.activity || 'TBD'}`;
                                }).join('\n')
                            );
                        } else if (data?.evidence?.items?.length) {
                            const items = data.evidence.items.slice(0, 5);
                            toolDataSummaries.push(`[${agentName}] search results:\n${items.map((item: any) => `- ${item.title || ''}: ${item.snippet || ''}${item.url ? ` [Source](${item.url})` : ''}`).join('\n')}`);
                        } else if (data?.answer || data?.text || data?.content) {
                            toolDataSummaries.push(`[${agentName}] result: ${data.answer || data.text || data.content}`);
                        } else if (typeof data === 'string') {
                            toolDataSummaries.push(`[${agentName}] result: ${data}`);
                        } else {
                            toolDataSummaries.push(`[${agentName}] task completed (data: ${JSON.stringify(data).slice(0, 300)})`);
                        }
                    }

                    if (aggregated.failed_tasks.length > 0) {
                        const pendingTaskNames = aggregated.failed_tasks
                            .map((taskId) => plan.tasks.find((task) => task.id === taskId)?.objective)
                            .filter((value): value is string => Boolean(value));
                        if (pendingTaskNames.length > 0) {
                            toolDataSummaries.push(`Immediate execution plan: complete ${pendingTaskNames.join(', ')} in parallel, then merge budget/time constraints for the final plan.`);
                        } else {
                            toolDataSummaries.push('Immediate execution plan: robust execution path enabled. Deliver executable steps first, then backfill live results.');
                        }
                    }

                    if (detectedDomain === 'travel') {
                        const toolRegistry = getToolRegistry();
                        const fallbackSearchTool = toolRegistry.getTool('live_search') || toolRegistry.getTool('web_search');

                        if (
                            fallbackSearchTool
                            && travelBundle.flights.length === 0
                            && travelBundle.flightEvidence.length === 0
                            && travelCtx.origin
                            && travelCtx.destination
                        ) {
                            try {
                                const fallbackFlightQuery = `${travelCtx.departureDate || ''} ${travelCtx.origin} to ${travelCtx.destination} flight live price`.trim();
                                const normalizedFallbackFlightQuery = `${travelCtx.departureDate || ''} ${travelCtx.origin} to ${travelCtx.destination} flight live price`.trim();
                                const fallbackRun = await this.executeToolWithRetry(
                                    fallbackSearchTool,
                                    'travel_flight_fallback_search',
                                    {
                                        query: normalizedFallbackFlightQuery || fallbackFlightQuery,
                                        intent_domain: 'travel.flight',
                                        locale: toolLocale,
                                    }
                                );
                                if (fallbackRun.success) {
                                    const fallbackItems = Array.isArray(fallbackRun.output?.evidence?.items)
                                        ? fallbackRun.output.evidence.items
                                        : [];
                                    travelBundle.flightEvidence.push(...fallbackItems.slice(0, 5).map((item: any) => ({
                                        title: item?.title || '',
                                        snippet: item?.snippet || '',
                                        url: item?.url || '',
                                    })));
                                }
                            } catch {
                                // Ignore fallback errors; user-facing output keeps existing concrete sections.
                            }
                        }

                        if (
                            fallbackSearchTool
                            && travelBundle.hotels.length === 0
                            && travelBundle.hotelEvidence.length === 0
                            && travelCtx.destination
                        ) {
                            try {
                                const fallbackHotelQuery = `${travelCtx.destination} ${travelCtx.checkInDate || ''} ${travelCtx.checkOutDate || ''} hotel live price`.trim();
                                const normalizedFallbackHotelQuery = `${travelCtx.destination} ${travelCtx.checkInDate || ''} ${travelCtx.checkOutDate || ''} hotel live price`.trim();
                                const fallbackRun = await this.executeToolWithRetry(
                                    fallbackSearchTool,
                                    'travel_hotel_fallback_search',
                                    {
                                        query: normalizedFallbackHotelQuery || fallbackHotelQuery,
                                        intent_domain: 'travel.hotel',
                                        locale: toolLocale,
                                    }
                                );
                                if (fallbackRun.success) {
                                    const fallbackItems = Array.isArray(fallbackRun.output?.evidence?.items)
                                        ? fallbackRun.output.evidence.items
                                        : [];
                                    travelBundle.hotelEvidence.push(...fallbackItems.slice(0, 5).map((item: any) => ({
                                        title: item?.title || '',
                                        snippet: item?.snippet || '',
                                        url: item?.url || '',
                                    })));
                                }
                            } catch {
                                // Ignore fallback errors; user-facing output keeps existing concrete sections.
                            }
                        }
                    }

                    const hasTravelSections = detectedDomain === 'travel' && (
                        travelBundle.flights.length > 0
                        || travelBundle.hotels.length > 0
                        || travelBundle.flightEvidence.length > 0
                        || travelBundle.hotelEvidence.length > 0
                        || travelBundle.restaurants.length > 0
                        || travelBundle.attractions.length > 0
                        || travelBundle.toAirport.length > 0
                        || travelBundle.fromAirport.length > 0
                        || travelBundle.itineraryDays.length > 0
                    );
                    if (hasTravelSections) {
                        const sectionLines: string[] = [];
                        sectionLines.push(`### Travel Plan (${travelCtx.origin || 'Origin'} → ${travelCtx.destination || 'Destination'})`);
                        const metaLine = [
                            travelCtx.departureDate ? `Departure: ${travelCtx.departureDate}` : '',
                            travelCtx.nights ? `${travelCtx.nights} night(s)` : '',
                            travelCtx.adults ? `${travelCtx.adults} traveler(s)` : '',
                            travelCtx.budget ? `Budget: ${travelCtx.currency || ''} ${travelCtx.budget}` : '',
                        ].filter(Boolean).join(' | ');
                        if (metaLine) {
                            sectionLines.push(metaLine);
                        }

                        if (travelBundle.flights.length > 0) {
                            sectionLines.push('', '### Flights');
                            for (const flight of travelBundle.flights.slice(0, 5)) {
                                const flightNo = flight.flightNo || flight.flightNumber || '';
                                const depart = flight.departure || flight.departureTime || '?';
                                const arrive = flight.arrival || flight.arrivalTime || '?';
                                const currency = flight.currency || travelCtx.currency || 'CNY';
                                const baseLine = `- ${flight.airline || 'Unknown airline'} ${flightNo}`.trim();
                                const detailLine = `${depart} -> ${arrive} | ${currency} ${flight.price || '?'}${flight.stops !== undefined ? ` | ${flight.stops} transfer(s)` : ''}`;
                                const linkLine = flight.bookingUrl ? ` | [Book](${flight.bookingUrl})` : '';
                                sectionLines.push(`${baseLine}: ${detailLine}${linkLine}`);
                            }
                        } else if (travelBundle.flightEvidence.length > 0) {
                            sectionLines.push('', '### Flights (live search candidates)');
                            for (const item of travelBundle.flightEvidence.slice(0, 5)) {
                                const snippet = item.snippet ? ` - ${item.snippet}` : '';
                                const link = item.url ? ` [View](${item.url})` : '';
                                sectionLines.push(`- ${item.title || 'Flight candidate'}${snippet}${link}`);
                            }
                        }
                        if (travelBundle.hotels.length > 0) {
                            sectionLines.push('', '### Hotels');
                            for (const hotel of travelBundle.hotels.slice(0, 5)) {
                                const currency = hotel.currency || travelCtx.currency || 'CNY';
                                const price = hotel.pricePerNight ?? hotel.price ?? '?';
                                const bookingLink = hotel.bookingLink || hotel.url || '';
                                const linkText = bookingLink ? ` | [Book](${bookingLink})` : '';
                                sectionLines.push(`- ${hotel.name || 'Unknown hotel'}: ${currency} ${price}/night | Rating ${hotel.rating || '?'}${linkText}`);
                            }
                        } else if (travelBundle.hotelEvidence.length > 0) {
                            sectionLines.push('', '### Hotels (live search candidates)');
                            for (const item of travelBundle.hotelEvidence.slice(0, 5)) {
                                const snippet = item.snippet ? ` - ${item.snippet}` : '';
                                const link = item.url ? ` [View](${item.url})` : '';
                                sectionLines.push(`- ${item.title || 'Hotel candidate'}${snippet}${link}`);
                            }
                        }
                        if (travelBundle.restaurants.length > 0) {
                            sectionLines.push('', '### Food');
                            for (const item of travelBundle.restaurants.slice(0, 5)) {
                                const highlight = Array.isArray(item.highlights) ? item.highlights.slice(0, 2).join(' / ') : '';
                                const suffix = highlight ? ` | ${highlight}` : '';
                                sectionLines.push(`- ${item.name || 'Unknown restaurant'}: ${item.priceRange || 'Price TBD'} | Rating ${item.rating || '?'}${suffix}`);
                            }
                        }
                        if (travelBundle.attractions.length > 0) {
                            sectionLines.push('', '### Attractions');
                            for (const item of travelBundle.attractions.slice(0, 5)) {
                                const highlight = Array.isArray(item.highlights) ? item.highlights.slice(0, 2).join(' / ') : '';
                                const suffix = highlight ? ` | ${highlight}` : '';
                                sectionLines.push(`- ${item.name || 'Unknown attraction'}: ${item.recommendTime || 'Suggested 2-3 hours'} | ${item.type || 'Attraction'}${suffix}`);
                            }
                        }
                        if (travelBundle.toAirport.length > 0 || travelBundle.fromAirport.length > 0) {
                            sectionLines.push('', '### Transport');
                            for (const item of travelBundle.toAirport.slice(0, 3)) {
                                sectionLines.push(`- To airport: ${item.mode || 'Transport'} (${item.duration || '?'}, ${item.cost || '?'})`);
                            }
                            for (const item of travelBundle.fromAirport.slice(0, 3)) {
                                sectionLines.push(`- To city center: ${item.mode || 'Transport'} (${item.duration || '?'}, ${item.cost || '?'})`);
                            }
                        }
                        if (travelBundle.itineraryDays.length > 0) {
                            sectionLines.push('', '### Itinerary Suggestions');
                            for (const day of travelBundle.itineraryDays.slice(0, 5)) {
                                const firstAction = day?.activities?.[0]?.activity || 'TBD';
                                sectionLines.push(`- Day ${day.day || '?'} ${day.title || ''}: ${firstAction}`);
                            }
                        }
                        if (travelBundle.notices.length > 0) {
                            sectionLines.push('', '### Pending / Retry');
                            for (const notice of travelBundle.notices.slice(0, 3)) {
                                sectionLines.push(`- ${notice}`);
                            }
                        }
                        finalAnswer = sectionLines.join('\n');
                    } else {
                        // Synthesize with LLM for a proper human-readable answer
                        try {
                            const client = await getGeminiClient(this.apiKey);
                            const synthesisModel = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });

                            // Build conversation context for synthesis
                            const recentConversation = conversationHistory.slice(-6);
                            const useEnglish = this.shouldPreferEnglish(outputLocale);
                            const conversationCtxText = recentConversation.length > 0
                                ? `\n\nConversation history (latest ${recentConversation.length} turns):\n${recentConversation.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')}`
                                : '';

                            const synthesisPrompt = useEnglish
                                ? `You are Lumi AI assistant. The user's current request is "${query}".${conversationCtxText}

Below is raw data returned by specialist agents:
${toolDataSummaries.join('\n\n')}

Provide a complete and useful response in English. Requirements:
1. Answer the user directly; do not mention technical internals like "Agent" or "tool"
2. Use Markdown (headings, bold, lists, links) for readability
3. Include concrete facts when available (prices, names, ratings, timelines)
4. Keep tone natural and professional
5. If data is limited, give the best recommendation based on available evidence
6. If the user is continuing a previous request (budget/date/constraints), combine context correctly`
                                : `You are Lumi AI assistant. The user's current request is "${query}".${conversationCtxText}

Below is raw data returned by specialist agents:
${toolDataSummaries.join('\n\n')}

Provide a complete and useful response in English. Requirements:
1. Answer the user directly; do not mention technical internals like "Agent" or "tool"
2. Use Markdown (headings, bold, lists, links) for readability
3. Include concrete facts when available (prices, names, ratings, timelines)
4. Keep tone natural and professional
5. If data is limited, give the best recommendation based on available evidence
6. If the user is continuing a previous request (budget/date/constraints), combine context correctly`;

                            console.log('[SuperAgent] 🧠 Marketplace: synthesizing final answer with LLM...');
                            const synthesized = await this.generateContentTextWithGuard(
                                synthesisModel,
                                synthesisPrompt,
                                'marketplace_synthesis',
                                Math.min(this.llmSoftTimeoutMs, 15000)
                            );
                            finalAnswer = synthesized || toolDataSummaries.join('\n');
                            console.log('[SuperAgent] ✅ Marketplace: LLM synthesis complete');
                        } catch (synthesisErr) {
                            console.warn('[SuperAgent] ⚠️ Marketplace LLM synthesis failed, using raw summaries:', synthesisErr);
                            // Fallback: use the raw summaries if LLM synthesis fails
                            finalAnswer = toolDataSummaries.join('\n');
                        }
                    }
                }
                finalAnswer = await this.enforceOutputLanguage(finalAnswer, outputLocale, contextEnrichedQuery);

                const marketInvocations: NonNullable<AgentResponse['skill_invocations']> = summary.results.map(r => {
                    const agentMeta = selectedAgentMeta.get(r.agent_id);
                    const githubImported = agentMeta?.source_meta?.imported_via === 'github_import'
                        || (r.agent_id || '').startsWith('github:');
                    return {
                        skill_id: r.agent_id || 'marketplace_agent',
                        source: githubImported ? 'github' : 'local',
                        status: r.success ? 'success' : 'error',
                        latency_ms: r.latency_ms,
                        evidence_count: Array.isArray(r.evidence) ? r.evidence.length : 0,
                        sandbox_level: githubImported ? 'approved' : 'approved',
                    };
                });
                const taskSkillInvocations = buildTaskSkillInvocations(taskSkillPlanCache, summary.results);
                const combinedInvocations = Array.from(
                    new Map(
                        [...marketInvocations, ...taskSkillInvocations, ...discoverySkillInvocations]
                            .map(item => [item.skill_id, item] as const)
                    ).values()
                ).slice(0, 12);
                const marketplaceToolsUsed = Array.from(
                    new Set(
                        [
                            ...summary.selected_agents.map(item => item.agent_id),
                            ...effectiveSelectedAgents.map(item => item.agent_id),
                            ...mktToolResults.map(item => item.toolName),
                        ].filter((item): item is string => Boolean(item && item.trim()))
                    )
                );

                return this.withContractEnvelope({
                    answer: finalAnswer,
                    toolsUsed: marketplaceToolsUsed,
                    toolResults: mktToolResults,
                    confidence,
                    executionTimeMs: Math.round(performance.now() - startTime),
                    turns: 1,
                    trace_id: plan.trace_id,
                    routing_decision: {
                        ...executionRoutingDecision,
                        mode: 'multi_agent',
                        reason_codes: Array.from(new Set([...executionRoutingDecision.reason_codes, 'marketplace_dag_selected']))
                    },
                    task_graph: {
                        tasks: plan.tasks.map(task => ({
                            id: task.id,
                            title: task.objective,
                            required_capabilities: task.required_capabilities,
                        })),
                        edges: plan.tasks.flatMap(task => task.dependencies.map(dep => ({ from: dep, to: task.id }))),
                        critical_path: plan.tasks.map(task => task.id),
                        parallel_groups: [plan.tasks.filter(t => t.parallelizable).map(t => t.id)].filter(g => g.length > 0),
                    },
                    skill_invocations: combinedInvocations,
                    evidence: aggregated.evidence,
                    marketplace_trace_id: plan.trace_id,
                    marketplace_selected_agents: effectiveSelectedAgents,
                    marketplace_fallback_used: summary.fallback_used.length > 0,
                    reasoning_protocol: reasoningProtocol || undefined,
                }, contextEnrichedQuery, freshnessRoute, executionRoutingDecision);
            } catch (mktErr) {
                console.warn('[SuperAgent] Marketplace pre-route failed, falling through to ReAct:', mktErr);
                // Fall through to standard ReAct loop
            }
        }

        const toolsUsed: string[] = [];
        const toolResults: ToolExecutionResult[] = [];
        let profilingResult: ProfilingResult | null = null;

        try {
            console.log('[SuperAgent] API Key status:', this.apiKey ? `Configured (${this.apiKey.substring(0, 8)}...)` : 'NOT CONFIGURED');

            if (!this.apiKey) {
                throw new Error('API Key not configured');
            }

            // 1. Get tools from registry
            const registry = getToolRegistry();
            const tools = registry.getGeminiTools();
            console.log(`[SuperAgent] 🔧 Available tools: ${registry.getToolNames().join(', ')}`);

            // 2. Build system prompt
            const systemPrompt = this.buildSystemPrompt(context, outputLocale);

            // 3. Get Gemini client and model
            const client = await getGeminiClient(this.apiKey);
            const model = client.getGenerativeModel({
                model: 'gemini-3-pro-preview',  // Gemini 3 Pro Preview (confirmed available)
                systemInstruction: systemPrompt,
                tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined
            });

            // 4. Build conversation history
            const history = this.buildGeminiHistory(context);

            // 5. Start chat session
            const chat = model.startChat({
                history: history
            });

            // 6. Send message and get response
            console.log('[SuperAgent] 📡 Sending request to Gemini...');
            let response = await this.sendMessageWithGuard(chat, query, 'react_initial_turn');
            if (!response) {
                throw new Error('gemini_initial_turn_timeout');
            }
            let result = response.response;

            // 7. ReAct Loop: Handle function calls
            const MAX_TURNS = 5;
            let turns = 0;
            const governorCtx: ToolGovernorContext = {
                query: contextEnrichedQuery,
                route: freshnessRoute,
                routingDecision,
                callCounts: new Map<string, number>(),
                successfulSignatures: new Set<string>(),
            };

            while (turns < MAX_TURNS) {
                const functionCalls = result.functionCalls();

                if (!functionCalls || functionCalls.length === 0) {
                    console.log(`[SuperAgent] ✅ No function calls, exiting loop`);
                    break;
                }

                console.log(`[SuperAgent] 🔄 Turn ${turns + 1}: ${functionCalls.length} function call(s)`);

                // Execute all function calls
                const functionResponses = [];

                for (const call of functionCalls) {
                    const toolName = call.name;
                    const toolArgs = call.args || {};
                    const toolSignature = this.toolCallSignature(toolName, toolArgs);

                    console.log(`[SuperAgent] 🤖 Executing: ${toolName}`, toolArgs);
                    toolsUsed.push(toolName);

                    const execStart = performance.now();
                    let output: any;
                    let success = true;
                    let error: string | undefined;
                    let executionPath: 'cli' | 'tool' | 'cli_fallback_tool' = 'tool';

                    const governorDecision = this.applyToolGovernor(toolName, toolArgs, governorCtx);
                    if (!governorDecision.allowed) {
                        success = false;
                        error = `blocked_by_governor:${governorDecision.reason || 'unknown'}`;
                        output = governorDecision.response || this.buildToolBlockedResponse(toolName, governorDecision.reason || 'unknown');
                        console.log(`[SuperAgent] ⛔ Tool blocked: ${toolName} (${governorDecision.reason || 'unknown'})`);
                    } else {
                        try {
                            const tool = registry.getTool(toolName);
                            if (!tool) {
                                throw new Error(`Tool not found: ${toolName}`);
                            }

                            const run = await this.executeToolWithRetry(
                                tool,
                                toolName,
                                toolArgs
                            );
                            output = run.output;
                            success = run.success;
                            error = run.error;
                            executionPath = run.executionPath;
                            if (!success && run.attempts > 1) {
                                output = {
                                    ...(output && typeof output === 'object' ? output : {}),
                                    retry_meta: {
                                        attempts: run.attempts,
                                        exhausted: true,
                                    },
                                };
                            }

                            // Run shadow profiling for this tool
                            if (tool.profiling && success) {
                                runShadowProfiling(output, tool.profiling.target_dimension, tool.profiling.instruction)
                                    .then(result => {
                                        if (result) {
                                            console.log('[SuperAgent] Shadow profiling result:', result);
                                        }
                                    })
                                    .catch(err => console.warn('[SuperAgent] Shadow profiling failed:', err));
                            }
                        } catch (e) {
                            success = false;
                            error = e instanceof Error ? e.message : String(e);
                            output = { error: error };
                            executionPath = 'tool';
                            console.error(`[SuperAgent] ❌ Tool failed: ${toolName}`, e);
                        }
                    }

                    if (success) {
                        governorCtx.successfulSignatures.add(toolSignature);
                    }

                    const execTime = Math.round(performance.now() - execStart);
                    console.log(`[SuperAgent] ⏱️ ${toolName} completed in ${execTime}ms`);

                    toolResults.push({
                        toolName,
                        args: toolArgs,
                        output,
                        success,
                        error,
                        executionTimeMs: execTime,
                        executionPath
                    });

                    functionResponses.push({
                        name: toolName,
                        response: output
                    });
                }

                // Send function results back to Gemini
                response = await this.sendMessageWithGuard(
                    chat,
                    functionResponses.map(fr => ({
                        functionResponse: {
                            name: fr.name,
                            response: fr.response
                        }
                    })),
                    'react_followup_turn'
                );
                if (!response) {
                    console.warn('[SuperAgent] follow-up turn timeout, keeping current partial result');
                    break;
                }

                result = response.response;
                turns++;
            }

            // 8. Extract final answer
            this.applyFlightTimePreferenceToToolResults(toolResults, flightConstraints);
            const finalText = result.text() || 'Processing completed, but no response was generated.';
            const guardedAnswer = this.enforceEvidenceFirstAnswer(query, finalText, toolResults);
            let finalAnswer = this.enforceFlightTimePreference(
                query,
                guardedAnswer,
                toolResults,
                flightConstraints
            );
            const shouldRecoverWithRealtime = freshnessRoute.needs_live_data
                && (
                    this.isGenericNonAnswer(finalAnswer)
                    || !this.hasRealtimeToolAttempt(toolResults)
                );
            if (shouldRecoverWithRealtime) {
                const realtimeRecovery = await this.tryRealtimeToolFallback(
                    query,
                    flightConstraints,
                    startTime,
                    traceId,
                    routingDecision,
                    routingTaskGraph,
                    discoverySkillInvocations,
                    reasoningProtocol,
                    outputLocale
                );
                if (realtimeRecovery) {
                    const mergedInvocations = Array.from(
                        new Map(
                            [
                                ...(realtimeRecovery.skill_invocations || []),
                                ...discoverySkillInvocations,
                            ].map((item) => [item.skill_id, item] as const)
                        ).values()
                    ).slice(0, 12);
                    return this.withContractEnvelope({
                        ...realtimeRecovery,
                        skill_invocations: mergedInvocations,
                        reasoning_protocol: reasoningProtocol || realtimeRecovery.reasoning_protocol,
                    }, contextEnrichedQuery, freshnessRoute, routingDecision);
                }
            }
            if (this.isGenericNonAnswer(finalAnswer)) {
                finalAnswer = this.buildActionableFallbackPlan(
                    query,
                    freshnessRoute,
                    toolResults,
                    reasoningProtocol,
                    outputLocale
                );
            }
            finalAnswer = await this.enforceOutputLanguage(finalAnswer, outputLocale, contextEnrichedQuery);

            // Calculate confidence
            const successfulResults = toolResults.filter(r => r.success);
            const confidence = toolResults.length > 0
                ? successfulResults.length / toolResults.length
                : 0.7;

            const executionTimeMs = Math.round(performance.now() - startTime);
            console.log(`[SuperAgent] ✅ Completed in ${executionTimeMs}ms, ${turns} turns, ${toolsUsed.length} tools`);
            const evidence = extractEvidenceFromToolResults(toolResults);
            const runtimeSkillInvocations = [
                ...buildSkillInvocationsFromTools(toolResults),
                ...discoverySkillInvocations,
            ].slice(0, 12);

            return this.withContractEnvelope({
                answer: finalAnswer,
                toolsUsed: Array.from(new Set(toolsUsed)),
                toolResults,
                confidence,
                executionTimeMs,
                turns,
                profilingResult: profilingResult || undefined,
                trace_id: traceId,
                routing_decision: routingDecision,
                task_graph: routingTaskGraph,
                skill_invocations: runtimeSkillInvocations,
                evidence,
                reasoning_protocol: reasoningProtocol || undefined,
            }, contextEnrichedQuery, freshnessRoute, routingDecision);

        } catch (error) {
            console.error('[SuperAgent] ❌ Fatal error:', error);

            const realtimeFallback = await this.tryRealtimeToolFallback(
                query,
                flightConstraints,
                startTime,
                traceId,
                routingDecision,
                routingTaskGraph,
                discoverySkillInvocations,
                reasoningProtocol,
                outputLocale
            );
            if (realtimeFallback) {
                return this.withContractEnvelope(
                    realtimeFallback,
                    contextEnrichedQuery,
                    freshnessRoute,
                    routingDecision
                );
            }

                // Try fallback to simple LLM call
                try {
                    console.log('[SuperAgent] 🔄 Attempting fallback...');
                    const fallbackResponse = await this.simpleLLMCall(query, outputLocale);
                    return this.withContractEnvelope({
                        answer: fallbackResponse,
                    toolsUsed: [],
                    toolResults: [],
                    confidence: 0.5,
                    executionTimeMs: Math.round(performance.now() - startTime),
                    turns: 0,
                    trace_id: traceId,
                    routing_decision: routingDecision,
                    task_graph: routingTaskGraph,
                    skill_invocations: discoverySkillInvocations,
                    evidence: [],
                    reasoning_protocol: reasoningProtocol || undefined,
                }, contextEnrichedQuery, freshnessRoute, routingDecision);
            } catch (fallbackError) {
                console.error('[SuperAgent] ❌ Fallback also failed:', fallbackError);
            }

            return this.withContractEnvelope({
                answer: 'Sorry, we hit an issue while processing your request. Please try again shortly.',
                toolsUsed: [],
                toolResults: [],
                confidence: 0,
                executionTimeMs: Math.round(performance.now() - startTime),
                turns: 0,
                trace_id: traceId,
                routing_decision: routingDecision,
                task_graph: routingTaskGraph,
                skill_invocations: discoverySkillInvocations,
                evidence: [],
                reasoning_protocol: reasoningProtocol || undefined,
            }, contextEnrichedQuery, freshnessRoute, routingDecision);
        }
    }

    private async withContractEnvelope(
        response: AgentResponse,
        query: string,
        route: ReturnType<typeof classifyFreshness>,
        routingDecision?: NonNullable<AgentResponse['routing_decision']>
    ): Promise<AgentResponse> {
        const effectiveRouting = routingDecision || response.routing_decision || {
            mode: 'single_agent',
            reason_codes: ['default_single_agent'],
            scores: {
                complexity: 0.35,
                risk: 0.35,
                dependency: 0.3,
            },
        };
        const evidence = Array.isArray(response.evidence)
            ? response.evidence
            : extractEvidenceFromToolResults(response.toolResults || []);
        const envelope = await this.buildContractEnvelope(query, route, effectiveRouting, evidence, response);
        const gateEnvelope = this.buildGateEnvelope({
            query,
            response,
            route,
            routingDecision: effectiveRouting,
            evidence,
            riskBoundary: envelope.risk_boundary,
        });
        const clarification = envelope.clarification_questions?.[0];
        const remappedGateDecisions = (gateEnvelope.gate_decisions || []).map((decision) => {
            if (
                clarification &&
                decision.gate === clarification.impacts_gate &&
                decision.decision !== 'passed'
            ) {
                return {
                    ...decision,
                    next_action: clarification.prompt,
                };
            }
            return decision;
        });
        const blockingGate = remappedGateDecisions.find((decision) => decision.decision !== 'passed');
        const effectiveNextAction = response.next_action
            || clarification?.prompt
            || blockingGate?.next_action
            || gateEnvelope.next_action;
        const normalizedStatus = (response.status === 'cancelled' || response.status === 'error')
            ? response.status
            : gateEnvelope.status;
        const normalizedSkillSelectionTrace = (
            Array.isArray(response.skill_selection_trace) &&
            response.skill_selection_trace.length > 0
        )
            ? response.skill_selection_trace
            : buildSkillSelectionTraceFromInvocations(
                response.task_graph,
                response.skill_invocations
            );
        return {
            ...response,
            ...envelope,
            status: normalizedStatus,
            summary: response.summary || gateEnvelope.summary,
            next_action: effectiveNextAction,
            owner_agent: response.owner_agent || gateEnvelope.owner_agent,
            gate_decisions: remappedGateDecisions,
            skill_selection_trace: normalizedSkillSelectionTrace,
        };
    }

    private async buildContractEnvelope(
        query: string,
        route: ReturnType<typeof classifyFreshness>,
        routingDecision: NonNullable<AgentResponse['routing_decision']>,
        evidence: Array<{ source: string; url: string; fetched_at?: string }>,
        response?: AgentResponse
    ): Promise<Pick<AgentResponse, 'problem_frame' | 'clarification_questions' | 'evidence_claims' | 'risk_boundary'>> {
        const normalized = query.toLowerCase();
        const problemType = /(plan|规划|方案|roadmap|strategy)/i.test(query)
            ? 'planning'
            : /(review|analy|诊断|分析|audit)/i.test(query)
                ? 'analysis'
                : /(compare|比价|对比)/i.test(query)
                    ? 'comparison'
                    : /(execute|publish|buy|下单|执行|发布)/i.test(query)
                        ? 'execution'
                        : 'qa';
        const primaryDomain = route.intent_domain.split('.')[0];
        const secondaryDomains = (route.domain_scores || [])
            .map((item) => item.domain.split('.')[0])
            .filter((domain) => domain !== primaryDomain)
            .filter((value, index, arr) => arr.indexOf(value) === index)
            .slice(0, 2);
        const riskClass = this.isHighRiskDomain(primaryDomain)
            ? 'high'
            : routingDecision.mode === 'multi_agent'
                ? 'medium'
                : 'low';
        const clarificationQuestions: ClarificationQuestionPayload[] = [];
        const responseClarification = Array.isArray(response?.clarification_questions)
            ? response?.clarification_questions?.find((item) =>
                Boolean(item?.prompt?.trim()) && Boolean(item?.reason?.trim()))
            : null;
        if (responseClarification) {
            clarificationQuestions.push({
                ...responseClarification,
                options: Array.isArray(responseClarification.options)
                    ? responseClarification.options.slice(0, 3)
                    : [],
            });
        }
        const requiresLixConstraints = this.requiresLixConstraintPackage(query, response);
        const constraintSignals = this.extractConstraintSignals(query);
        const directMissingDetails = this.extractMissingDirectTaskDetails(route);
        const missingLixFields = this.extractMissingLixConstraintFields(constraintSignals);
        const candidateFields = requiresLixConstraints ? missingLixFields : directMissingDetails;
        if (clarificationQuestions.length === 0 && candidateFields.length > 0) {
            const inferred = await this.inferClarificationQuestionWithLlm({
                query,
                primaryDomain,
                route,
                candidateFields,
                requiresLixConstraints,
                impactsGate: 'gate_r1_require_constraints',
            });
            if (inferred) {
                clarificationQuestions.push(inferred);
            }
        }
        if (clarificationQuestions.length === 0 && !requiresLixConstraints && directMissingDetails.length > 0) {
            const first = String(directMissingDetails[0] || '').trim() || 'task detail';
            clarificationQuestions.push({
                id: `clarify_${first.replace(/\s+/g, '_')}`,
                prompt: `Please provide ${first} so the agent can continue with an accurate, verifiable plan.`,
                reason: 'Missing task details can reduce execution accuracy.',
                impacts_gate: 'gate_r1_require_constraints',
                options: this.clarificationOptionsFor(first),
            });
        }
        if (clarificationQuestions.length === 0 && requiresLixConstraints && missingLixFields.length > 0) {
            const first = missingLixFields[0];
            clarificationQuestions.push({
                id: `clarify_lix_${first}`,
                prompt: `Before publishing to LIX, please provide ${first}.`,
                reason: 'LIX builder/publish flow requires budget, deadline, and acceptance criteria.',
                impacts_gate: 'gate_r1_require_constraints',
                options: this.clarificationOptionsFor(first),
            });
        }
        if (clarificationQuestions.length === 0 && this.requiresExternalSpendAction(query) && !constraintSignals.confirmationTokenProvided) {
            clarificationQuestions.push({
                id: 'clarify_confirmation_token',
                prompt: 'Please provide a confirmation token before external spend or contract actions.',
                reason: 'Per-action confirmation is required for external spend safety.',
                impacts_gate: 'gate_r2_require_user_confirmation_token',
                options: [
                    { key: 'confirm_now', label: 'Provide token now', value: 'CONFIRM-XXXX' },
                    { key: 'cancel_external', label: 'Cancel external action', value: 'cancel' },
                ],
            });
        }
        if (clarificationQuestions.length === 0 && this.isHighRiskDomain(primaryDomain) && this.containsIrreversibleAction(query)) {
            clarificationQuestions.push({
                id: 'clarify_high_risk_boundary',
                prompt: 'This is a high-risk domain. Confirm decision-support mode only.',
                reason: 'High-risk domains are restricted to reversible decision-support outputs.',
                impacts_gate: 'gate_r7_high_risk_execution_prohibited',
                options: [
                    { key: 'support_only', label: 'Decision support only', value: 'support_only' },
                    { key: 'cancel', label: 'Cancel', value: 'cancel' },
                ],
            });
        }
        const evidenceClaims: EvidenceClaimPayload[] = evidence.slice(0, 3).map((item, index) => ({
            claim_id: `claim_${index + 1}`,
            claim_text: `Evidence from ${item.source}`,
            evidence_ids: [`ev_${index + 1}`],
            confidence: item.url ? 0.78 : 0.62,
            reproducible_steps: [
                'Open the source URL and verify the claim context.',
                'Cross-check with acceptance criteria before execution.',
            ],
        }));
        const riskBoundary: RiskBoundaryPayload = {
            domain: primaryDomain,
            policy: this.isHighRiskDomain(primaryDomain) ? 'decision_support_only' : 'bounded_execution',
            blocked_actions: this.isHighRiskDomain(primaryDomain)
                ? [
                    'auto_execute_high_risk_decision',
                    'auto_purchase_or_contract_without_confirmation',
                    'irreversible_medical_legal_financial_action',
                ]
                : ['unconfirmed_external_spend'],
        };

        return {
            problem_frame: {
                problem_type: problemType,
                primary_domain: primaryDomain,
                secondary_domains: secondaryDomains,
                domain_scores: (route.domain_scores || []).map((item) => ({
                    domain: item.domain,
                    score: Number(item.score.toFixed(2)),
                })),
                risk_class: riskClass,
                requires_live_data: route.needs_live_data,
                constraint_completeness: Number((route.constraint_completeness || 0).toFixed(2)),
            },
            clarification_questions: clarificationQuestions.slice(0, 1),
            evidence_claims: evidenceClaims,
            risk_boundary: riskBoundary,
        };
    }

    private async inferClarificationQuestionWithLlm(params: {
        query: string;
        primaryDomain: string;
        route: ReturnType<typeof classifyFreshness>;
        candidateFields: string[];
        requiresLixConstraints: boolean;
        impactsGate: ClarificationQuestionPayload['impacts_gate'];
    }): Promise<ClarificationQuestionPayload | null> {
        if (!this.apiKey) return null;
        const { query, primaryDomain, route, candidateFields, requiresLixConstraints, impactsGate } = params;
        try {
            const client = await getGeminiClient(this.apiKey);
            const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });
            const prompt = `You are Lumi Requirement Clarifier. Infer one high-information-gain follow-up question to continue execution.

Rules:
1) Output JSON only.
2) Do not ask multiple questions.
3) Do not fabricate user requirements.
4) Keep prompt concise and directly answerable by user.
5) Use English output.
6) If there is uncertainty, choose the single missing input that most reduces execution risk.

JSON schema:
{
  "field": "string",
  "prompt": "string",
  "reason": "string",
  "options": ["string", "string", "string"]
}

Context:
- user_query: ${query}
- primary_domain: ${primaryDomain}
- route_reason: ${route.reason}
- route_constraint_completeness: ${route.constraint_completeness}
- requires_lix_constraints: ${requiresLixConstraints}
- candidate_missing_fields: ${JSON.stringify(candidateFields.slice(0, 6))}`;
            const raw = await this.generateContentTextWithGuard(
                model,
                prompt,
                'clarification_question_inference',
                Math.min(this.llmSoftTimeoutMs, 6000)
            );
            const parsed = raw ? extractJsonPayload(raw) : null;
            const field = normalizeString(
                parsed?.field || parsed?.missing_field || candidateFields[0] || 'task detail',
                80
            ) || 'task detail';
            const promptText = normalizeString(parsed?.prompt || '', 240);
            const reasonText = normalizeString(parsed?.reason || '', 180);
            if (!promptText || !reasonText) return null;
            const optionValues = Array.isArray(parsed?.options)
                ? parsed.options.map((item: unknown) => normalizeString(item, 80)).filter(Boolean)
                : [];
            const options = optionValues.slice(0, 3).map((value: string, index: number) => ({
                key: `llm_opt_${index + 1}`,
                label: value,
                value,
            }));
            return {
                id: `clarify_${field.replace(/[^a-zA-Z0-9_]+/g, '_').toLowerCase()}`,
                prompt: promptText,
                reason: reasonText,
                impacts_gate: impactsGate,
                options: options.length > 0 ? options : this.clarificationOptionsFor(field),
            };
        } catch {
            return null;
        }
    }

    private buildGateEnvelope(params: {
        query: string;
        response: AgentResponse;
        route: ReturnType<typeof classifyFreshness>;
        routingDecision: NonNullable<AgentResponse['routing_decision']>;
        evidence: Array<{ source: string; url: string; fetched_at?: string }>;
        riskBoundary?: RiskBoundaryPayload;
    }): Pick<AgentResponse, 'status' | 'summary' | 'next_action' | 'owner_agent' | 'gate_decisions'> {
        const { query, response, route, routingDecision, evidence, riskBoundary } = params;
        const constraints = this.extractConstraintSignals(query);
        const primaryDomain = route.intent_domain.split('.')[0];
        const requiresLixConstraints = this.requiresLixConstraintPackage(query, response);
        const missing = requiresLixConstraints
            ? this.extractMissingLixConstraintFields(constraints)
            : this.extractMissingDirectTaskDetails(route);
        const hasExecutableDraft = this.hasExecutableDraft(response);

        const gateDecisions: NonNullable<AgentResponse['gate_decisions']> = [];
        const r1Waiting = missing.length > 0 && (!hasExecutableDraft || requiresLixConstraints);
        gateDecisions.push({
            gate: 'gate_r1_require_constraints',
            decision: r1Waiting ? 'waiting_user' : 'passed',
            reason: missing.length === 0
                ? (requiresLixConstraints ? 'lix_constraints_complete' : 'task_details_complete')
                : (r1Waiting ? `missing_fields:${missing.join(',')}` : `provisional_plan_with_assumptions_missing_fields:${missing.join(',')}`),
            next_action: r1Waiting ? `Please provide ${missing[0]}.` : undefined,
            owner_agent: 'requirement_clarifier',
        });

        const requiresSpend = this.requiresExternalSpendAction(query);
        gateDecisions.push({
            gate: 'gate_r2_require_user_confirmation_token',
            decision: !requiresSpend || constraints.confirmationTokenProvided ? 'passed' : 'waiting_user',
            reason: !requiresSpend ? 'no_external_spend_action_detected' : (constraints.confirmationTokenProvided ? 'confirmation_token_verified' : 'missing_user_confirmation_token'),
            next_action: !requiresSpend || constraints.confirmationTokenProvided ? undefined : 'Provide confirmation token to authorize external spend.',
            owner_agent: 'budget_gatekeeper',
        });

        const budgetDecision = !requiresLixConstraints
            ? 'passed'
            : (!constraints.budgetProvided || constraints.budgetAmount === null
                ? 'waiting_user'
                : (constraints.budgetAmount <= 0 || constraints.budgetAmount > 500000 ? 'blocked' : 'passed'));
        gateDecisions.push({
            gate: 'gate_r3_budget_scope_guard',
            decision: budgetDecision,
            reason: !requiresLixConstraints
                ? 'budget_gate_not_required'
                : (!constraints.budgetProvided || constraints.budgetAmount === null
                    ? 'budget_missing_or_unparseable'
                    : (constraints.budgetAmount <= 0 ? 'budget_invalid_non_positive' : (constraints.budgetAmount > 500000 ? 'budget_exceeds_limit' : 'budget_within_scope'))),
            next_action: budgetDecision === 'passed'
                ? undefined
                : 'Provide a valid numeric budget within scope before LIX publishing.',
            owner_agent: 'budget_gatekeeper',
        });

        const needsEvidence = route.needs_live_data || routingDecision.mode === 'multi_agent' || this.isHighRiskDomain(primaryDomain);
        const evidenceDecision = !needsEvidence || evidence.length > 0 ? 'passed' : 'blocked';
        gateDecisions.push({
            gate: 'gate_r4_evidence_required_for_success',
            decision: evidenceDecision,
            reason: !needsEvidence ? 'evidence_optional_for_path' : (evidence.length > 0 ? 'evidence_attached' : 'success_without_evidence'),
            next_action: evidenceDecision === 'passed' ? undefined : 'Attach verifiable evidence before marking success.',
            owner_agent: 'solution_validation_agent',
        });

        const supplierPath = /(supplier|lix|marketplace|报价|接单|外采|外包)/i.test(query);
        const supplierDecision = !supplierPath
            ? 'passed'
            : (evidence.length > 0 ? 'passed' : (hasExecutableDraft ? 'passed' : 'waiting_user'));
        gateDecisions.push({
            gate: 'gate_r5_supplier_validation_required',
            decision: supplierDecision,
            reason: !supplierPath
                ? 'supplier_validation_not_required'
                : (evidence.length > 0
                    ? 'supplier_solution_validated'
                    : (hasExecutableDraft ? 'provisional_supplier_plan_pending_validation' : 'awaiting_supplier_validation')),
            next_action: supplierDecision === 'passed' ? undefined : 'Run supplier validation loop and provide evidence.',
            owner_agent: 'solution_validation_agent',
        });

        const nonEmpty = Boolean(String(response.answer || '').trim()) ||
            (Array.isArray(response.toolResults) && response.toolResults.length > 0);
        gateDecisions.push({
            gate: 'gate_r6_no_empty_return',
            decision: nonEmpty ? 'passed' : 'blocked',
            reason: nonEmpty ? 'response_contains_content' : 'empty_response_blocked',
            next_action: nonEmpty ? undefined : 'Return reason and next action to user.',
            owner_agent: 'codex_team_leader',
        });

        const highRiskBlocked = this.isHighRiskDomain(primaryDomain) && this.containsIrreversibleAction(`${query}\n${response.answer || ''}`);
        gateDecisions.push({
            gate: 'gate_r7_high_risk_execution_prohibited',
            decision: highRiskBlocked ? 'blocked' : 'passed',
            reason: highRiskBlocked ? 'high_risk_execution_blocked' : 'decision_support_only_path',
            next_action: highRiskBlocked ? 'Switch to decision-support mode and provide reversible goals.' : undefined,
            owner_agent: 'compliance_guard',
        });

        const authenticity = this.assessAuthenticityGate({
            answer: String(response.answer || ''),
            evidence,
            needsLiveData: Boolean(route.needs_live_data || this.isHighRiskDomain(primaryDomain) || routingDecision.mode === 'multi_agent'),
            status: String(response.status || 'success'),
        });
        gateDecisions.push({
            gate: 'gate_r8_data_authenticity_required',
            decision: authenticity.decision,
            reason: authenticity.reason,
            next_action: authenticity.nextAction,
            owner_agent: 'outcome_auditor',
        });

        const criticalWaitingGates = new Set([
            'gate_r1_require_constraints',
            'gate_r2_require_user_confirmation_token',
            'gate_r3_budget_scope_guard',
            'gate_r5_supplier_validation_required',
        ]);
        const blocking = gateDecisions.find((gate) =>
            gate.decision === 'blocked'
            || (gate.decision === 'waiting_user' && criticalWaitingGates.has(gate.gate))
        );
        const nonBlockingWait = gateDecisions.find((gate) => gate.decision === 'waiting_user');
        const status: NonNullable<AgentResponse['status']> = blocking
            ? 'waiting_user'
            : (nonBlockingWait ? 'partial' : 'success');
        const summary = String(response.answer || '').trim()
            ? String(response.answer).trim().slice(0, 180)
            : 'No empty return is allowed. Clarify missing details and continue.';
        return {
            status,
            summary,
            next_action: blocking?.next_action || nonBlockingWait?.next_action || 'Review output and execute the first reversible step.',
            owner_agent: blocking?.owner_agent || nonBlockingWait?.owner_agent || 'codex_team_leader',
            gate_decisions: gateDecisions,
        };
    }

    private hasExecutableDraft(response: AgentResponse): boolean {
        const answer = String(response.answer || '').trim();
        const hasActionSection = /(action steps|执行步骤|实施步骤|next action|下一步)/i.test(answer);
        const stepCount = (answer.match(/(?:^|\n)\s*(?:\d+[\.\)]|[-*•])\s+/g) || []).length;
        const hasToolResult = Array.isArray(response.toolResults) && response.toolResults.length > 0;
        return (hasActionSection && stepCount >= 2) || stepCount >= 3 || hasToolResult;
    }

    private extractConstraintSignals(query: string): {
        budgetProvided: boolean;
        budgetAmount: number | null;
        deadlineProvided: boolean;
        acceptanceProvided: boolean;
        confirmationTokenProvided: boolean;
    } {
        const budgetMatch = query.match(/(?:budget|预算)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i);
        const budgetAmount = budgetMatch ? Number(budgetMatch[1]) : null;
        const budgetProvided = /(?:budget|预算)/i.test(query) || Number.isFinite(budgetAmount || NaN);
        const deadlineProvided = /(?:deadline|时限|期限)/i.test(query);
        const acceptanceProvided = /(?:acceptance\s*criteria|acceptance|验收标准|验收)/i.test(query);
        const confirmationTokenProvided = /(?:confirmation\s*token|confirm\s*token|token|确认令牌)\s*[:：]?\s*[a-z0-9_-]{4,}/i.test(query);
        return {
            budgetProvided,
            budgetAmount: Number.isFinite(budgetAmount || NaN) ? budgetAmount : null,
            deadlineProvided,
            acceptanceProvided,
            confirmationTokenProvided,
        };
    }

    private assessAuthenticityGate(params: {
        answer: string;
        evidence: Array<{ source: string; url: string; fetched_at?: string }>;
        needsLiveData: boolean;
        status: string;
    }): { decision: 'passed' | 'blocked' | 'waiting_user'; reason: string; nextAction?: string } {
        const { answer, evidence, needsLiveData, status } = params;
        const normalized = String(answer || '').toLowerCase();
        const hasSyntheticMarker = /(placeholder|dummy|mock|fake|fictional|example\.com|lorem ipsum|simulated|synthetic|虚拟|编造|示例链接|unverified-link-removed)/i
            .test(normalized);
        const answerLinks = Array.from(String(answer || '').matchAll(/https?:\/\/[^\s)\]]+/gi)).map((m) => m[0]);
        const evidenceLinks = evidence.map((item) => String(item.url || '').trim()).filter(Boolean);
        const links = Array.from(new Set([...answerLinks, ...evidenceLinks]));
        const hasUnverifiedLikeLinks = links.some((url) => this.isBlockedAuthenticityUrl(url));
        const hasCredibleEvidenceLink = evidence.some((item) => {
            const url = String(item.url || '').trim();
            const source = String(item.source || '').toLowerCase();
            if (!url) return false;
            if (this.isBlockedAuthenticityUrl(url)) return false;
            if (/(template|mock|dummy|synthetic|simulated)/i.test(source)) return false;
            return /^https?:\/\//i.test(url);
        });
        const required = needsLiveData || status === 'success';
        if (!required) {
            return { decision: 'passed', reason: 'authenticity_gate_not_required' };
        }
        if (hasSyntheticMarker) {
            return {
                decision: status === 'success' ? 'blocked' : 'waiting_user',
                reason: 'synthetic_or_placeholder_content_detected',
                nextAction: 'Replace simulated content with verified links from live trusted sources.'
            };
        }
        if (hasUnverifiedLikeLinks) {
            return {
                decision: status === 'success' ? 'blocked' : 'waiting_user',
                reason: 'unverified_links_detected',
                nextAction: 'Remove unverified links and provide trusted public URLs.'
            };
        }
        if (needsLiveData && !hasCredibleEvidenceLink) {
            return {
                decision: status === 'success' ? 'blocked' : 'waiting_user',
                reason: 'missing_verified_live_sources',
                nextAction: 'Attach at least one real evidence URL for each key claim before delivery.'
            };
        }
        return { decision: 'passed', reason: 'authenticity_verified' };
    }

    private isBlockedAuthenticityUrl(rawUrl: string): boolean {
        const candidate = String(rawUrl || '').trim();
        if (!candidate) return true;
        let parsed: URL;
        try {
            parsed = new URL(candidate);
        } catch {
            return true;
        }
        if (!/^https?:$/i.test(parsed.protocol)) return true;
        return this.isBlockedAuthenticityHost(parsed.hostname);
    }

    private isBlockedAuthenticityHost(hostname: string): boolean {
        const host = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
        if (!host) return true;
        if (!host.includes('.')) return true;
        const blockedHosts = new Set([
            'localhost',
            'example.com',
            'example.org',
            'example.net',
            'invalid',
            'test',
            'local',
            '127.0.0.1',
        ]);
        if (blockedHosts.has(host)) return true;
        const blockedSuffixes = ['.example', '.test', '.invalid', '.localhost', '.local', '.internal', '.lan'];
        if (blockedSuffixes.some((suffix) => host.endsWith(suffix))) return true;
        if (this.isReservedIpv4Host(host)) return true;
        if (this.isReservedIpv6Host(host)) return true;
        return false;
    }

    private isReservedIpv4Host(host: string): boolean {
        if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
        const octets = host.split('.').map((value) => Number(value));
        if (octets.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) return true;
        const first = octets[0];
        const second = octets[1];
        return first === 0 ||
            first === 10 ||
            first === 127 ||
            (first === 169 && second === 254) ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168);
    }

    private isReservedIpv6Host(host: string): boolean {
        const normalized = host.toLowerCase();
        if (!normalized.includes(':')) return false;
        if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
        return normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80');
    }

    private requiresExternalSpendAction(query: string): boolean {
        return /(purchase|procure|buy|pay|publish|accept offer|supplier|marketplace|lix|下单|采购|付款|发布需求|接单|报价)/i.test(query);
    }

    private containsIrreversibleAction(query: string): boolean {
        return /(auto\s*execute|execute\s*now|buy\s*now|purchase\s*now|sign\s*contract|transfer\s*funds|prescribe|diagnose|自动执行|立即执行|下单|采购|签约|转账|处方|诊断)/i.test(query);
    }

    private clarificationOptionsFor(constraint: string): Array<{ key: string; label: string; value: string }> {
        const normalized = constraint.toLowerCase();
        if (normalized.includes('budget') || normalized.includes('预算')) {
            return [
                { key: 'budget_low', label: 'Low budget', value: '1000' },
                { key: 'budget_mid', label: 'Medium budget', value: '5000' },
                { key: 'budget_high', label: 'High budget', value: '20000' },
            ];
        }
        if (normalized.includes('deadline') || normalized.includes('截止') || normalized.includes('时限')) {
            return [
                { key: 'deadline_3d', label: '3 days', value: '3 days' },
                { key: 'deadline_7d', label: '7 days', value: '7 days' },
                { key: 'deadline_30d', label: '30 days', value: '30 days' },
            ];
        }
        return [
            { key: 'provide_now', label: 'Provide now', value: constraint },
            { key: 'later', label: 'Provide later', value: 'later' },
        ];
    }

    private isHighRiskDomain(domain: string): boolean {
        const normalized = String(domain || '').toLowerCase();
        return normalized === 'health' || normalized === 'legal' || normalized === 'finance';
    }

    private buildDirectLiveSearchAnswer(query: string, liveOutput: any, outputLocale: string = 'en-GB'): string | null {
        if (!liveOutput || typeof liveOutput !== 'object' || !liveOutput.success) {
            return null;
        }

        const useEnglish = this.shouldPreferEnglish(outputLocale);
        const route = classifyFreshness(query);
        const quoteCards = Array.isArray(liveOutput.quote_cards) ? liveOutput.quote_cards : [];
        const evidenceItems = Array.isArray(liveOutput?.evidence?.items) ? liveOutput.evidence.items : [];
        const lines: string[] = [];

        if ((route.intent_domain === 'travel.flight' || route.intent_domain === 'travel.train') && quoteCards.length > 0) {
            lines.push(
                'Real-time ticketing results retrieved (subject to source platform updates):'
            );
            for (const card of quoteCards.slice(0, 3)) {
                const provider = String(card?.provider || 'source');
                const dep = String(card?.dep_time || '--:--');
                const arr = String(card?.arr_time || '--:--');
                const price = String(card?.price_text || 'price to confirm');
                const transfers = String(card?.transfers_text || '');
                const url = String(card?.source_url || '');
                if (url.startsWith('http')) {
                    lines.push(`- ${dep}-${arr} ${price}${transfers ? `, ${transfers}` : ''} [Source: ${provider}](${url})`);
                } else {
                    lines.push(`- ${dep}-${arr} ${price}${transfers ? `, ${transfers}` : ''} (Source: ${provider})`);
                }
            }
            return lines.join('\n');
        }

        if (evidenceItems.length > 0) {
            lines.push('Real-time information retrieved:');
            for (const item of evidenceItems.slice(0, 3)) {
                const title = String(item?.title || 'Live result');
                const sourceName = String(item?.source_name || 'source');
                const url = String(item?.url || '');
                if (url.startsWith('http')) {
                    lines.push(`- ${title} [Source: ${sourceName}](${url})`);
                } else {
                    lines.push(`- ${title} (Source: ${sourceName})`);
                }
            }
            return lines.join('\n');
        }

        return null;
    }

    private async tryRealtimeToolFallback(
        query: string,
        flightConstraints: FlightConstraints,
        startTime: number,
        traceId: string,
        routingDecision: NonNullable<AgentResponse['routing_decision']>,
        routingTaskGraph: NonNullable<AgentResponse['task_graph']>,
        discoverySkillInvocations: NonNullable<AgentResponse['skill_invocations']>,
        reasoningProtocol: ReasoningProtocolPayload | null,
        outputLocale: string = 'en-GB'
    ): Promise<AgentResponse | null> {
        const route = classifyFreshness(query);
        if (!route.needs_live_data) return null;

        const registry = getToolRegistry();
        const liveSearch = registry.getTool('live_search');
        if (!liveSearch) return null;

        const args = {
            query,
            intent_domain: route.intent_domain,
            locale: this.resolveToolLocale(outputLocale),
        };

        try {
            console.log('[SuperAgent] 🧯 Realtime fallback: executing live_search directly');
            const execStart = performance.now();
            const run = await this.executeToolWithRetry(liveSearch, 'live_search', args);
            const output = run.output;
            const executionTimeMs = Math.round(performance.now() - execStart);
            const success = run.success;
            const error = success
                ? undefined
                : run.error || String(output?.error?.message || output?.error?.code || 'live_search failed');

            const toolResult: ToolExecutionResult = {
                toolName: 'live_search',
                args,
                output,
                success,
                error,
                executionTimeMs,
                executionPath: run.executionPath,
            };

            const seedAnswer = this.buildDirectLiveSearchAnswer(query, output, outputLocale)
                || 'Real-time search executed.';
            const guardedAnswer = this.enforceEvidenceFirstAnswer(query, seedAnswer, [toolResult]);
            let finalAnswer = this.enforceFlightTimePreference(
                query,
                guardedAnswer,
                [toolResult],
                flightConstraints
            );
            const hasStepStructure = /(action steps|执行步骤)/i.test(finalAnswer)
                || /(?:^|\n)\s*(?:\d+[\.\)]|[-*•])\s+/m.test(finalAnswer);
            if (this.isGenericNonAnswer(finalAnswer) || !hasStepStructure) {
                finalAnswer = this.buildActionableFallbackPlan(
                    query,
                    route,
                    [toolResult],
                    null
                );
            }
            finalAnswer = await this.enforceOutputLanguage(finalAnswer, outputLocale, query);
            const hasUsable = success && this.hasUsableEvidence(route.intent_domain, output);

            return {
                answer: finalAnswer,
                toolsUsed: ['live_search'],
                toolResults: [toolResult],
                confidence: hasUsable ? 0.65 : success ? 0.45 : 0.35,
                executionTimeMs: Math.round(performance.now() - startTime),
                turns: 1,
                trace_id: traceId,
                routing_decision: routingDecision,
                task_graph: routingTaskGraph,
                skill_invocations: [
                    ...buildSkillInvocationsFromTools([toolResult]),
                    ...discoverySkillInvocations
                ].slice(0, 12),
                evidence: extractEvidenceFromToolResults([toolResult]),
                reasoning_protocol: reasoningProtocol || undefined,
            };
        } catch (fallbackError) {
            console.warn('[SuperAgent] ⚠️ Realtime fallback failed:', fallbackError);
            return null;
        }
    }

    private extractEvidenceItems(output: any): Array<{ title?: string; snippet?: string; url?: string; source_name?: string }> {
        if (!output || typeof output !== 'object') return [];
        if (Array.isArray(output.evidence?.items)) return output.evidence.items;
        if (Array.isArray(output.items)) return output.items;
        if (Array.isArray(output.sources)) return output.sources;
        return [];
    }

    private hasStructuredTravelEvidence(
        domain: IntentDomain,
        items: Array<{ title?: string; snippet?: string; url?: string; source_name?: string }>
    ): boolean {
        if (!Array.isArray(items) || items.length === 0) return false;

        const domainSet = new Set<string>();
        let structuredCount = 0;

        for (const item of items) {
            const text = `${item?.title || ''} ${item?.snippet || ''}`;
            if (/(航班|机票|flight|airline|起飞|抵达|直飞|转机|票价|¥|￥|\$|\d{2,5}\s*(元|rmb|cny))/i.test(text)) {
                structuredCount += 1;
            }
            if (item?.url) {
                try {
                    domainSet.add(new URL(item.url).hostname.replace(/^www\./, ''));
                } catch {
                    // ignore invalid URLs
                }
            }
        }

        if (domain === 'travel.flight' || domain === 'travel.train') {
            return structuredCount >= 1 && items.length >= 2 && domainSet.size >= 1;
        }

        if (domain === 'travel.hotel') {
            return structuredCount >= 1 && items.length >= 2;
        }

        return items.length >= 1;
    }

    private hasUsableEvidence(domain: IntentDomain, output: any): boolean {
        // If tool returned success with any meaningful data, consider it usable
        if (output?.success !== false) {
            // Check for any non-empty response data
            if (output?.answer || output?.text || output?.content) return true;
            if (output?.data && Object.keys(output.data).length > 0) return true;
            if (output?.quote_cards?.length > 0) return true;
        }

        const items = this.extractEvidenceItems(output);
        if (items.length > 0) return true;

        // For travel domains, apply stricter structural check only as fallback
        if (domain.startsWith('travel.')) {
            return this.hasStructuredTravelEvidence(domain, items);
        }
        return false;
    }

    private hasRealtimeToolAttempt(toolResults: ToolExecutionResult[]): boolean {
        return toolResults.some((r) =>
            r.toolName === 'live_search'
            || r.toolName === 'web_exec'
            || r.toolName === 'web_search'
        );
    }

    private resolveOutputLocale(context: UserContext): string {
        const preferred = normalizeString(
            context.locale
            || context.preferences?.response_language
            || context.preferences?.locale
            || context.preferences?.language
            || process.env.LUMI_OUTPUT_LOCALE
            || process.env.LUMI_RESPONSE_LOCALE,
            24
        );
        return preferred || 'en-GB';
    }

    private shouldPreferEnglish(locale: string): boolean {
        return /^en(?:[-_]|$)/i.test(String(locale || '').trim());
    }

    private resolveToolLocale(locale: string): string {
        return this.shouldPreferEnglish(locale) ? 'en-GB' : 'zh-CN';
    }

    private hasCjkCharacters(text: string): boolean {
        return /[\u3400-\u9fff]/.test(text || '');
    }

    private async enforceOutputLanguage(answer: string, locale: string, query: string): Promise<string> {
        const normalizedAnswer = String(answer || '').trim();
        if (!normalizedAnswer) return normalizedAnswer;
        if (!this.shouldPreferEnglish(locale)) return normalizedAnswer;
        if (!this.hasCjkCharacters(normalizedAnswer)) return normalizedAnswer;
        if (!this.apiKey) return normalizedAnswer;

        try {
            const client = await getGeminiClient(this.apiKey);
            const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });
            const translationPrompt = `Translate the assistant response below into natural English.

Requirements:
1. Preserve original facts, numbers, links, and markdown structure.
2. Do not add new claims or remove existing constraints.
3. Keep bullet and heading hierarchy unchanged.
4. Output English only.

User query:
${query}

Assistant response:
${normalizedAnswer}`;
            const translated = await this.generateContentTextWithGuard(
                model,
                translationPrompt,
                'force_english_output',
                Math.min(this.llmSoftTimeoutMs, 8000)
            );
            return normalizeString(translated, 16000) || normalizedAnswer;
        } catch {
            return normalizedAnswer;
        }
    }

    private isGenericNonAnswer(answer: string): boolean {
        const text = String(answer || '').trim();
        if (!text) return true;
        const normalized = text.replace(/\s+/g, '');
        if (normalized.length <= 8) return true;
        const genericPatterns = [
            /抱歉.{0,20}(无法|不能|不可以|没法)/i,
            /我无法回答这个问题/i,
            /处理您的问题时遇到了困难/i,
            /请稍后重试/i,
            /未生成回复/i,
        ];
        return genericPatterns.some((pattern) => pattern.test(text));
    }

    private buildActionableFallbackPlan(
        query: string,
        route: ReturnType<typeof classifyFreshness>,
        toolResults: ToolExecutionResult[],
        reasoningProtocol: ReasoningProtocolPayload | null,
        outputLocale: string = 'en-GB'
    ): string {
        const useEnglish = this.shouldPreferEnglish(outputLocale);
        const budget = extractBudgetFromQuery(query);
        const constraints = parseFlightConstraints(query);
        const links = this.extractActionLinks(toolResults);
        const actionLinks = links.length > 0
            ? links
                : route.intent_domain === 'travel.flight'
                    ? buildFlightActionLinks(constraints)
                    : [];
        const linkLines = actionLinks.slice(0, 3).map((link) => `- [${link.title}](${link.url})`);

        if (route.intent_domain.startsWith('travel')) {
            const travelCtx = parseTravelContext(query);
            const origin = normalizeString(constraints.origin || travelCtx.origin, 48);
            const destination = normalizeString(constraints.destination || travelCtx.destination, 48);
            const departureDate = constraints.departureDate || travelCtx.departureDate;
            const cabin = constraints.travelClass || 'not provided by user';
            const departureWindow = constraints.departureWindow || 'not provided by user';
            const passengers = constraints.passengers || travelCtx.adults;
            const routeLabel = origin && destination
                ? `${origin} -> ${destination}`
                : (destination ? `to ${destination}` : 'not provided by user');
            const missingInputs: string[] = [];
            if (!origin) missingInputs.push('origin');
            if (!destination) missingInputs.push('destination');
            if (!departureDate) missingInputs.push('departure date');
            if (!constraints.travelClass) missingInputs.push('cabin preference');
            if (!passengers) missingInputs.push('number of travelers');
            if (!budget) missingInputs.push('budget');

            const twinSignals = this.extractTwinSignalsForFallback(
                query,
                constraints,
                budget
            );
            const lines = [
                'Actionable travel plan generated (based on provided input and twin signals, no fabricated requirements):',
                '',
                `- Route scope: ${routeLabel}`,
                `- Date/time scope: departure ${departureDate || 'not provided by user'}, window ${departureWindow}`,
                `- Passenger/cabin scope: travelers ${passengers || 'not provided by user'}, cabin ${cabin}`,
                `- Budget scope: ${budget ? `${budget.amount} ${budget.currency}` : 'not provided by user'}`,
                '- Execution order: lock flight window first, then hotel zone, then local transport and activities.',
            ];
            if (budget) {
                const flightBudget = Math.round(budget.amount * 0.45);
                const hotelBudget = Math.round(budget.amount * 0.35);
                const localBudget = Math.round(budget.amount * 0.2);
                lines.push(
                    `- Suggested budget split (from user budget): flights ~${flightBudget} ${budget.currency}, hotels ~${hotelBudget} ${budget.currency}, local transport/experiences ~${localBudget} ${budget.currency}.`
                );
            } else {
                lines.push('- Budget split is pending because user budget was not provided.');
            }
            lines.push(
                '',
                'Twin personalization basis:',
                ...(twinSignals.length > 0
                    ? twinSignals.map((item) => `- ${item}`)
                    : ['- No explicit digital twin preference was provided in this turn.'])
            );
            if (linkLines.length > 0) {
                lines.push('', 'Real-time entry points (ready to open):', ...linkLines);
            }
            lines.push(
                '',
                missingInputs.length > 0
                    ? `Missing user inputs (please provide directly): ${missingInputs.join(', ')}.`
                    : 'All key travel constraints were provided; you can execute with the links above.',
                'Next action: provide missing inputs and continue execution.'
            );
            return lines.join('\n');
        }

        const domainSpecificPlan = this.buildDomainSpecificFallbackPlan(
            query,
            route,
            reasoningProtocol,
            linkLines,
            useEnglish
        );
        if (domainSpecificPlan) {
            return domainSpecificPlan;
        }

        const strategy = normalizeString(reasoningProtocol?.recommended_strategy, 220)
            || (useEnglish
                ? 'Clarify goals and constraints first, then execute by priority and backfill evidence.'
                : 'Clarify goals and constraints first, then execute by priority and backfill evidence.');
        const rootProblem = normalizeString(reasoningProtocol?.root_problem, 180)
            || normalizeString(query, 160)
            || 'Current problem';
        const risks = (reasoningProtocol?.artifacts?.premortem || [])
            .map((row) => normalizeString(row.reason, 100))
            .filter(Boolean)
            .slice(0, 3);

        const lines = [
            'Actionable solution generated:',
            `- Core issue: ${rootProblem}`,
            `- Recommended strategy: ${strategy}`,
            useEnglish
                ? '- Next action: complete one minimal viable step first, then gather supplementary evidence in parallel.'
                : '- Next action: complete one minimal viable step first, then gather supplementary evidence in parallel.',
        ];
        if (risks.length > 0) {
            lines.push('- Key risks:', ...risks.map((risk, idx) => `  ${idx + 1}) ${risk}`));
        }
        if (linkLines.length > 0) {
            lines.push('- Real-time entry points:', ...linkLines);
        }
        return lines.join('\n');
    }

    private extractTwinSignalsForFallback(
        query: string,
        constraints: FlightConstraints,
        budget: { amount: number; currency: string } | null
    ): string[] {
        const signals: string[] = [];
        if (constraints.travelClass) {
            signals.push(`Cabin preference from input: ${constraints.travelClass}`);
        }
        if (constraints.departureTimePreference) {
            signals.push(`Departure time preference from input: ${constraints.departureTimePreference}`);
        }
        if (typeof constraints.passengers === 'number' && constraints.passengers > 0) {
            signals.push(`Traveler count from input: ${constraints.passengers}`);
        }
        if (budget) {
            signals.push(`Budget sensitivity from input: ${budget.amount} ${budget.currency}`);
        }
        const explicitTwinHints = Array.from(
            String(query || '').matchAll(
                /(?:digital twin|twin|profile|分身|画像|偏好)\s*(?:[:：]|=|is)?\s*([^\n;,]{3,80})/gi
            )
        )
            .map((match) => normalizeString(match?.[1] || '', 80))
            .filter(Boolean)
            .slice(0, 3);
        for (const hint of explicitTwinHints) {
            signals.push(`Twin hint: ${hint}`);
        }
        return Array.from(new Set(signals));
    }

    private buildDomainSpecificFallbackPlan(
        query: string,
        route: ReturnType<typeof classifyFreshness>,
        reasoningProtocol: ReasoningProtocolPayload | null,
        linkLines: string[],
        useEnglish: boolean
    ): string | null {
        const domainPrefix = (route.intent_domain || '').split('.')[0];
        const missingConstraints = route.missing_constraints || [];
        const constraintsLine = missingConstraints.length > 0
            ? `To continue with high accuracy, please provide: ${missingConstraints.join(', ')}.`
            : 'If you want a more personalized plan, tell me any extra constraints you care about.';
        const strategy = normalizeString(reasoningProtocol?.recommended_strategy, 220)
            || 'Clarify constraints first, then execute in a verifiable order.';
        const rootProblem = normalizeString(reasoningProtocol?.root_problem, 180)
            || normalizeString(query, 120)
            || 'Goal and constraints are not fully aligned yet.';

        const sectionsByDomain: Record<string, { title: string; steps: string[] }> = {
            finance: {
                title: 'Actionable finance plan generated:',
                steps: [
                    '1. Define scope first: instrument (ticker/symbol), horizon, and decision objective (research/rebalance/risk check).',
                    '2. Build evidence set from at least two independent sources, then compare key metrics and divergence.',
                    '3. Output three options (conservative/base/aggressive) with explicit risk and invalidation conditions.',
                ],
            },
            health: {
                title: 'Actionable health support plan generated:',
                steps: [
                    '1. Triage red flags first (severe chest pain, breathing difficulty, loss of consciousness): if present, escalate to emergency care immediately.',
                    '2. Structure symptom timeline, current medications, allergy/history, and recent triggers before any recommendation.',
                    '3. Provide a safe next-step checklist (self-care vs clinic visit) with clear stop conditions.',
                ],
            },
            legal: {
                title: 'Actionable legal prep plan generated:',
                steps: [
                    '1. Lock jurisdiction and governing law first, then identify key clauses/disputed points.',
                    '2. Build an issue matrix: claim, evidence, risk, and desired outcome for each disputed item.',
                    '3. Prepare negotiation and counsel handoff package (facts timeline + documents + red-line positions).',
                ],
            },
            recruitment: {
                title: 'Actionable recruitment plan generated:',
                steps: [
                    '1. Define hiring spec: role level, must-have skills, location/remote policy, and compensation range.',
                    '2. Run sourcing in parallel across channels and apply a unified screening rubric.',
                    '3. Execute interview pipeline with explicit pass/fail criteria and close plan.',
                ],
            },
            education: {
                title: 'Actionable learning plan generated:',
                steps: [
                    '1. Define outcome target and baseline level before selecting materials.',
                    '2. Generate weekly curriculum with time-boxed sessions and milestone checkpoints.',
                    '3. Use feedback loop each week (quiz/project) and adjust difficulty by performance.',
                ],
            },
            productivity: {
                title: 'Actionable productivity plan generated:',
                steps: [
                    '1. Convert goals into tasks with priority (impact × urgency) and dependency mapping.',
                    '2. Build execution blocks on calendar and reserve focus windows for deep work.',
                    '3. Start with one 30-minute reversible action and review progress at day-end.',
                ],
            },
        };

        const selected = sectionsByDomain[domainPrefix];
        if (!selected) return null;

        const lines = [
            selected.title,
            '',
            `- Core issue: ${rootProblem}`,
            `- Recommended strategy: ${strategy}`,
            ...selected.steps,
            '',
            constraintsLine,
            useEnglish
                ? 'I will continue filling verifiable evidence while you provide the missing constraints.'
                : 'I will continue filling verifiable evidence while you provide the missing constraints.',
        ];
        if (linkLines.length > 0) {
            lines.push('', 'Real-time entry points (ready to open):', ...linkLines);
        }
        return lines.join('\n');
    }

    private enforceEvidenceFirstAnswer(
        query: string,
        modelAnswer: string,
        toolResults: ToolExecutionResult[]
    ): string {
        const route = classifyFreshness(query);
        if (!route.needs_live_data) return modelAnswer;

        const relevant = toolResults.filter((r) => r.toolName === 'live_search' || r.toolName === 'web_exec' || r.toolName === 'web_search');
        if (relevant.length === 0) {
            return modelAnswer;
        }

        // If ANY relevant tool succeeded, trust the LLM's synthesized answer
        const anySucceeded = relevant.some((r) => r.success);
        if (anySucceeded) {
            return modelAnswer;
        }

        const hasAnyUsable = relevant.some((r) => r.success && this.hasUsableEvidence(route.intent_domain, r.output));
        if (hasAnyUsable) {
            return modelAnswer;
        }

        const latestLiveFailure = [...relevant]
            .reverse()
            .find((r) => r.toolName === 'live_search');

        const fallback: StructuredFallback = latestLiveFailure?.output?.fallback
            || createStructuredFallback(
                route.intent_domain,
                'Evidence-first guard triggered: no verifiable live result yet',
                route.missing_constraints
            );

        const missing = (fallback.missing_constraints?.length ? fallback.missing_constraints : route.missing_constraints) || [];
        const missingText = missing.length > 0
            ? missing.map((m) => `- ${m}`).join('\n')
            : '- Departure date\n- Cabin preference (economy/business)\n- Number of travelers';

        const extractedLinks = this.extractActionLinks(relevant);
        const fallbackFlightLinks = route.intent_domain === 'travel.flight'
            ? buildFlightActionLinks(parseFlightConstraints(query))
            : [];
        const links = extractedLinks.length > 0 ? extractedLinks : fallbackFlightLinks;
        const linkText = links.length > 0
            ? [
                '',
                'You can also open these live entry points first (if date is missing, select it on-site):',
                ...links.slice(0, 3).map((link) => `- [${link.title}](${link.url})`)
            ].join('\n')
            : '';

        const example = route.intent_domain === 'travel.flight'
            ? this.formatFlightFallbackExample(query)
            : route.intent_domain === 'travel.train'
                ? 'tomorrow morning, Shanghai to Beijing, second class, 1 traveler'
                : 'Please add date, travelers, and budget';

        return [
            'I will provide executable steps first and continue backfilling verifiable live results.',
            '',
            'To continue accurate search, please add the following constraints:',
            missingText,
            '',
            `You can reply directly with: \`${example}\``,
            linkText,
            '',
            'After you add these, I will re-run search immediately with verifiable sources.'
        ].join('\n');
    }

    private parseHour(timeValue: any): number | null {
        if (typeof timeValue !== 'string') return null;
        const trimmed = timeValue.trim();
        if (!trimmed) return null;

        const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (ampmMatch) {
            let hour = parseInt(ampmMatch[1], 10);
            const marker = ampmMatch[3].toUpperCase();
            if (marker === 'PM' && hour < 12) hour += 12;
            if (marker === 'AM' && hour === 12) hour = 0;
            return hour;
        }

        const normalMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
        if (normalMatch) {
            return parseInt(normalMatch[1], 10);
        }

        const cnMatch = trimmed.match(/(\d{1,2})点/);
        if (cnMatch) {
            return parseInt(cnMatch[1], 10);
        }
        return null;
    }

    private getFlightDepartureHour(flight: any): number | null {
        if (!flight || typeof flight !== 'object') return null;
        const departure = (flight as any).departure;
        if (typeof departure === 'string') return this.parseHour(departure);
        if (departure && typeof departure === 'object') {
            return this.parseHour((departure as any).time);
        }
        return null;
    }

    private isInPreferredWindow(hour: number | null, preference: FlightConstraints['departureTimePreference']): boolean {
        if (hour === null || !preference) return false;
        if (preference === 'morning') return hour >= 6 && hour < 12;
        if (preference === 'afternoon') return hour >= 12 && hour < 18;
        if (preference === 'evening') return hour >= 18 && hour < 24;
        if (preference === 'night') return hour >= 0 && hour < 6;
        return false;
    }

    private sortFlightsByPreference(
        flights: any[],
        preference: FlightConstraints['departureTimePreference'],
        mode: FlightConstraints['timePriorityMode']
    ): any[] {
        if (!Array.isArray(flights) || flights.length === 0 || !preference) return flights;

        const scored = flights.map((flight) => ({
            flight,
            hour: this.getFlightDepartureHour(flight),
            inPreferredWindow: this.isInPreferredWindow(this.getFlightDepartureHour(flight), preference),
            price: Number.isFinite((flight as any).price) ? (flight as any).price : Number.POSITIVE_INFINITY,
        }));

        if (mode === 'strict') {
            return scored.filter((item) => item.inPreferredWindow).map((item) => item.flight);
        }

        return scored
            .sort((a, b) => {
                if (a.inPreferredWindow !== b.inPreferredWindow) {
                    return a.inPreferredWindow ? -1 : 1;
                }
                return a.price - b.price;
            })
            .map((item) => item.flight);
    }

    private applyFlightTimePreferenceToToolResults(
        toolResults: ToolExecutionResult[],
        constraints: FlightConstraints
    ): void {
        if (!constraints.departureTimePreference) return;
        const mode = constraints.timePriorityMode || 'prefer';

        for (const result of toolResults) {
            const output = result.output;
            if (!output || typeof output !== 'object') continue;

            if (Array.isArray(output.flights)) {
                output.flights = this.sortFlightsByPreference(output.flights, constraints.departureTimePreference, mode);
                if (output.flights.length > 0 && output.bestOption) {
                    output.bestOption = output.flights[0];
                }
            }

            if (output.data && typeof output.data === 'object' && Array.isArray(output.data.flights)) {
                output.data.flights = this.sortFlightsByPreference(output.data.flights, constraints.departureTimePreference, mode);
                if (output.data.flights.length > 0 && output.data.bestOption) {
                    output.data.bestOption = output.data.flights[0];
                }
            }
        }
    }

    private hasStructuredFlights(toolResults: ToolExecutionResult[]): boolean {
        const getFlights = (output: any): any[] => {
            if (!output || typeof output !== 'object') return [];
            if (Array.isArray(output.flights)) return output.flights;
            if (output.data && Array.isArray(output.data.flights)) return output.data.flights;
            return [];
        };

        return toolResults.some((result) => {
            const flights = getFlights(result.output);
            if (flights.length === 0) return false;
            return flights.some((flight) => {
                const hour = this.getFlightDepartureHour(flight);
                const hasPrice = Number.isFinite((flight as any)?.price);
                return hour !== null || hasPrice;
            });
        });
    }

    private extractActionLinks(toolResults: ToolExecutionResult[]): Array<{ title: string; url: string }> {
        const links: Array<{ title: string; url: string }> = [];
        for (const result of toolResults) {
            const output = result.output;
            if (!output || typeof output !== 'object' || !Array.isArray(output.action_links)) continue;
            for (const link of output.action_links) {
                if (!link || typeof link.url !== 'string' || !link.url.startsWith('http')) continue;
                links.push({
                    title: typeof link.title === 'string' && link.title.length > 0 ? link.title : 'View Flights',
                    url: link.url,
                });
            }
        }
        return links;
    }

    private enforceFlightTimePreference(
        query: string,
        modelAnswer: string,
        toolResults: ToolExecutionResult[],
        constraints: FlightConstraints
    ): string {
        const route = classifyFreshness(query);
        const isLikelyFlightQuery = route.intent_domain === 'travel.flight'
            || Boolean(constraints.origin && constraints.destination && constraints.departureDate);
        if (!isLikelyFlightQuery) return modelAnswer;
        if (constraints.departureTimePreference !== 'morning') return modelAnswer;
        if ((constraints.timePriorityMode || 'prefer') !== 'prefer') return modelAnswer;
        if (this.hasStructuredFlights(toolResults)) return modelAnswer;

        const actionLinks = this.extractActionLinks(toolResults);
        const generatedLinks = actionLinks.length > 0 ? actionLinks : buildFlightActionLinks(constraints);
        const linkLines = generatedLinks.length > 0
            ? generatedLinks.slice(0, 3).map((link) => `- [${link.title}](${link.url})`).join('\n')
            : '- No clickable links yet. Add origin, destination, and date, then retry.';

        return [
            'Detected your time preference: morning window (06:00-11:59).',
            '',
            'Current verifiable evidence has not returned a structured flight list yet, so I cannot provide precise ranking directly in-chat.',
            'External sites often default to lowest-price sorting, so evening flights may appear first.',
            '',
            'Suggested action: open any entry point below and set departure time filter to "Morning".',
            linkLines,
        ].join('\n');
    }

    /**
     * Build a context-enriched query from conversation history.
     * Short/ambiguous follow-ups (e.g. "15000", "明天", "商务舱") get
     * the relevant prior context prepended so downstream routing and
     * tools can understand the user's intent.
     */
    private buildContextEnrichedQuery(
        query: string,
        conversationHistory: { role: string; content: string }[]
    ): string {
        // Only enrich if the query is short/ambiguous AND there's prior context
        if (conversationHistory.length === 0) return query;

        // If the query is already sufficiently descriptive (> 15 chars with CJK
        // or > 30 chars), don't enrich — the user has given enough context.
        const cjkCount = (query.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
        const isDescriptive = cjkCount > 10 || query.length > 30;
        if (isDescriptive) return query;

        // Find the last user-assistant exchange for context
        const recent = conversationHistory.slice(-4);
        const lastUserMsg = [...recent].reverse().find(m => m.role === 'user');
        const lastAssistantMsg = [...recent].reverse().find(m => m.role === 'assistant');

        if (!lastUserMsg) return query;

        // Build enriched query: prepend the prior question context
        const priorContext = lastUserMsg.content.length > 100
            ? lastUserMsg.content.slice(0, 100) + '…'
            : lastUserMsg.content;

        // Include a brief summary of the assistant's response if available
        const assistantContext = lastAssistantMsg
            ? (lastAssistantMsg.content.length > 100
                ? lastAssistantMsg.content.slice(0, 100) + '…'
                : lastAssistantMsg.content)
            : '';

        const contextPrefix = assistantContext
            ? `(Context: user asked "${priorContext}", assistant replied "${assistantContext}") `
            : `(Context: user asked "${priorContext}") `;

        return contextPrefix + query;
    }

    /**
     * Build Gemini conversation history
     */
    private buildGeminiHistory(context: UserContext): { role: string; parts: { text: string }[] }[] {
        const history: { role: string; parts: { text: string }[] }[] = [];

        if (context.conversationHistory && context.conversationHistory.length > 0) {
            const recentHistory = context.conversationHistory.slice(-6);
            for (const msg of recentHistory) {
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        return history;
    }

    /**
     * Build system prompt with 4.1 Orchestrator Routing Policy + P0-A/D enhancements
     */
    private buildSystemPrompt(context: UserContext, outputLocale: string = 'en-GB'): string {
        const registry = getToolRegistry();
        const toolNames = registry.getToolNames();
        const statePacket = this.extractStatePacket(context);
        const useEnglish = this.shouldPreferEnglish(outputLocale);

        const now = new Date();
        const currentDate = now.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        const currentTime = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let prompt = `You are Lumi's SuperAgent Orchestrator.

**⏰ Current Time Information (CRITICAL)**
- Today is: ${currentDate}
- Current time: ${currentTime}
- Note: Your training data has a cutoff date, but user's "today", "now", "latest" refer to the above date

**Primary Goal:**
- Solve user problems with the best available method.
- If the user request requires real-time facts (prices, availability, schedules, locations, current events), you MUST obtain live evidence before presenting specifics.

**P0-A Answer Aggregator (MANDATORY Priority):**

When multiple tools are called, use this STRICT priority order to determine which EvidencePack to use:

1) If \`web_exec.success === true\` AND \`evidence.items.length > 0\`
   → Use web_exec EvidencePack for your answer (MUST cite sources)

2) Otherwise if \`live_search.success === true\` AND \`evidence.items.length > 0\`
   → Use live_search EvidencePack for your answer (MUST cite sources)

3) Otherwise enter fallback mode:
   - DO NOT provide any specific prices, links, or availability
   - Show \`fallback.missing_constraints\` from the failed response
   - Provide clear CTAs such as "please add date constraints" and "open trusted source links"

**Routing Policy (Hard Rules):**

1) **Determine intent_domain:**
   - \`ticketing\`: flights, trains, timetables, seat availability
   - \`travel\`: hotels, accommodation, attractions, holiday planning
   - \`ecommerce\`: purchase intent, product compare, checkout
   - \`knowledge\`: all other information requests

2) **Determine needs_live_data:**
   - true if request involves: tickets/flights/trains/hotels/price/availability/real-time status

3) **If needs_live_data = true:**
   a) First call \`live_search(query, locale, intent_domain, max_items)\`
   b) If live_search succeeds, use EvidencePack (with TTL) to answer with citations
   c) If live_search fails and task requires website interaction, call \`web_exec\` with step plan

4) **If there is NO EvidencePack:**
   - DO NOT provide specific prices, booking links, or availability claims
   - DO NOT fabricate any real-time data
   - Ask for missing task details (date/time, origin-destination, traveler count, preference)
   - Provide general guidance only

5) **UI Gating (Hard Rule):**
   - If intent_domain is \`ticketing\` or \`travel\`, DO NOT surface ecommerce offers
   - Hide ecommerce product recommendations for travel queries

**P0-D Forced Citations (MANDATORY):**

- You may ONLY cite information from \`evidence.items[]\`
- Every specific price, availability, or link MUST have a citation in format: [Source: source_name](url)
- If \`evidence.items.length === 0\`: FORBIDDEN to output specific prices, links, or seat inventory counts
- Citation format example: "Beijing to Shanghai flights from CNY 800 [Source: ctrip.com](https://ctrip.com)"

**Available Tools:**
${toolNames.map(name => `- ${name}`).join('\n')}

**Tool Usage Rules:**
- \`live_search\`: for real-time facts (flights, trains, hotels, news, finance)
- \`web_exec\`: for read-only browser execution tasks
- \`price_compare\`: only for ecommerce physical-product comparison
- \`knowledge_qa\`: for direct answer and writing assistance
- Decide first whether a tool is truly needed; if not, answer directly
- Avoid duplicate calls with same params unless new evidence or constraints appear
- For travel/ticketing comparison, use \`live_search\` (and \`web_exec\` only if necessary)
- Do not call \`price_compare\` or \`broadcast_intent\` in non-ecommerce scenarios
- Do not call \`broadcast_agent_requirement\` unless the task is a market publication flow
- Prefer minimal tool sets (1-2 meaningful calls), avoid blind exhaustive probing

**Output Format Rules:**
- Always include route_decision (intent_domain + needs_live_data)
- If evidence exists, MUST include citations: [Source: source_name](url)
- Provide clear fallback CTAs when live data is unavailable:
  - "Please provide the departure date"
  - "Please confirm origin and destination"
  - "Please specify cabin preference (economy/business)"

**Multi-turn Context:**
- This is a multi-turn conversation - carefully read previous history
- If user's current message adds info to previous question (date, quantity, location), combine context
- Example: Previous "flights from London to Dalian" + Current "14 February" = query with date constraint

**Language & Format:**
- Respond in ${useEnglish ? 'English' : 'Chinese'} only
- Use Markdown formatting (headers, lists, bold) for readability`;

        if (statePacket) {
            const stress = statePacket.stressScore;
            const focus = statePacket.focusScore;
            const polarity = statePacket.polarity;
            const styleMode = stress >= 70
                ? 'high_stress_brief'
                : focus <= 40
                    ? 'low_focus_simplified'
                    : 'balanced';
            prompt += `\n\n**On-device Human State Packet (L3)**
- stress_score: ${stress}
- focus_score: ${focus}
- polarity: ${polarity}
- style_mode: ${styleMode}

**L3 Style Policy (must follow):**
- Do NOT change evidence/routing logic because of L3.
- L3 only controls expression style and response length.
- If stress_score >= 70: action-first, concise, max 5 bullet points.
- If focus_score <= 40: reduce options to top 2 and avoid long explanations.
- If polarity <= -0.3: use empathetic, non-judgmental wording.`;
        }

        if (context.preferences) {
            prompt += `\n\n**User Preferences:** ${JSON.stringify(context.preferences)}`;
        }

        if (context.recentQueries && context.recentQueries.length > 0) {
            prompt += `\n\n**Conversation Context (chronological):**\n${context.recentQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        return prompt;
    }

    private extractStatePacket(context: UserContext): { stressScore: number; focusScore: number; polarity: number } | null {
        const packet = context.preferences?.state_packet;
        if (!packet || typeof packet !== 'object') return null;
        const l3 = (packet as any).l3;
        if (!l3 || typeof l3 !== 'object') return null;
        const stressScore = Number((l3 as any).stress_score);
        const focusScore = Number((l3 as any).focus_score);
        const polarity = Number((l3 as any).polarity);
        if (!Number.isFinite(stressScore) || !Number.isFinite(focusScore) || !Number.isFinite(polarity)) {
            return null;
        }
        return {
            stressScore: Math.max(0, Math.min(100, Math.round(stressScore))),
            focusScore: Math.max(0, Math.min(100, Math.round(focusScore))),
            polarity: Math.max(-1, Math.min(1, Math.round(polarity * 100) / 100)),
        };
    }

    /**
     * Simple LLM call without tools (fallback)
     */
    private async simpleLLMCall(query: string, outputLocale: string = 'en-GB'): Promise<string> {
        const client = await getGeminiClient(this.apiKey);
        const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });

        let text = await this.generateContentTextWithGuard(
            model,
            query,
            'simple_llm_fallback',
            Math.min(this.llmSoftTimeoutMs, 12000)
        );
        text = await this.enforceOutputLanguage(text || '', outputLocale, query);
        if (text && !this.isGenericNonAnswer(text)) {
            return text;
        }
        return this.buildActionableFallbackPlan(
            query,
            classifyFreshness(query),
            [],
            null,
            outputLocale
        );
    }

    /**
     * Legacy method: solve() - wraps processWithReAct for backward compatibility
     */
    async solve(question: string, context: UserContext = {}): Promise<LegacySolution> {
        console.log(`[SuperAgent] solve() called with question: "${question}"`);
        const response = await this.processWithReAct(question, context);
        console.log(`[SuperAgent] solve() got response:`, response.answer.substring(0, 100) + '...');

        // Convert to legacy format
        return {
            answer: response.answer,
            reasoning: response.toolsUsed.length > 0
                ? `Used ${response.toolsUsed.join(', ')} to answer your request`
                : undefined,
            skillsUsed: response.toolsUsed,
            results: response.toolResults.map(r => ({
                success: r.success,
                data: r.output,
                confidence: r.success ? 0.9 : 0,
                error: r.error,
                executionTimeMs: r.executionTimeMs,
                skillId: r.toolName,
                skillName: r.toolName
            })),
            confidence: response.confidence,
            executionTimeMs: response.executionTimeMs,
            marketplace_trace_id: response.marketplace_trace_id,
            marketplace_selected_agents: response.marketplace_selected_agents,
            marketplace_fallback_used: response.marketplace_fallback_used,
        };
    }
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

interface LegacySolution {
    answer: string;
    reasoning?: string;
    skillsUsed: string[];
    results: SkillResult[];
    confidence: number;
    executionTimeMs: number;
    followUpSuggestions?: string[];
    marketplace_trace_id?: string;
    marketplace_selected_agents?: Array<{ task_id: string; agent_id: string }>;
    marketplace_fallback_used?: boolean;
}

// ============================================================================
// Singleton
// ============================================================================

let superAgentInstance: SuperAgentService | null = null;

export function getSuperAgent(): SuperAgentService {
    if (!superAgentInstance) {
        superAgentInstance = new SuperAgentService();
    }
    return superAgentInstance;
}

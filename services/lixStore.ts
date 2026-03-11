/**
 * LIX Store - Intent state management
 * Manages intents, offers, and observability events
 */

import * as React from 'react';
import {
    type DispatchDecision,
    type IntentAuctionPolicy,
    type LixTakeRateTier,
    type OverflowDecision,
    type AgentSolutionIntent,
    type AgentSolutionOffer,
    type DeliveredAgentManifest,
    type LixDigitalTwinSnapshot,
    type ProfileShareConsentState,
    type ReviewDecision,
    type SolutionFailureContext,
    type SolutionCustomRequirements,
    type SolutionIntentDomain,
    type SolutionIntentStatus,
    IntentRequest,
    RankedOffer,
    AcceptToken,
    LIXEvent,
    generateId,
    createTraceContext
} from './lixTypes.js';
import { lixMarketService } from './marketService.js';
import { settlementService, AcceptTokenRecord } from './settlementService.js';
import { proofOfIntentService, ProofOfIntent } from './proofOfIntentService.js';
import { ensureMarketplaceCatalogReady } from './agentMarketplaceService.js';
import type { AgentDomain, CandidateAgent } from './agentMarketplaceTypes.js';

// ============================================================================
// Store Types
// ============================================================================

export type IntentStatus = 'draft' | 'broadcasting' | 'offers_received' | 'accepted' | 'expired' | 'cancelled';

export interface StoredIntent {
    intent_id: string;
    category: string;
    item_name: string;
    item_sku?: string;
    budget_max?: number;
    currency: string;
    status: IntentStatus;
    created_at: string;
    expires_at: string;
    offers: RankedOffer[];
    total_offers_received: number;
    best_price?: number;
    accepted_offer_id?: string;
    accept_token?: AcceptToken;
    proof?: ProofOfIntent;
    settlement_token?: AcceptTokenRecord;
    trace_id?: string;  // For observability
}

export interface StoredSolutionIntent extends AgentSolutionIntent {
    trace_id?: string;
}

interface LIXStoreState {
    intents: Map<string, StoredIntent>;
    solution_intents: Map<string, StoredSolutionIntent>;
    events: LIXEvent[];
    metrics: {
        total_intents_broadcast: number;
        total_offers_received: number;
        total_accepted: number;
        avg_first_offer_seconds: number;
        total_solution_intents: number;
        total_solution_deliveries: number;
        total_solution_approved: number;
    };
}

// ============================================================================
// Observability
// ============================================================================

function logEvent(eventType: string, payload: Record<string, unknown>): void {
    const event: LIXEvent = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        trace: createTraceContext(),
        payload
    };

    lixStore.state.events.push(event);
    console.log(`📊 [LIX Event] ${eventType}:`, payload);

    // Keep only last 100 events in memory
    if (lixStore.state.events.length > 100) {
        lixStore.state.events = lixStore.state.events.slice(-100);
    }
}

function inferSolutionDomain(raw?: string): SolutionIntentDomain {
    const normalized = String(raw || '').trim().toLowerCase();
    const domains: SolutionIntentDomain[] = [
        'recruitment', 'travel', 'finance', 'health', 'legal', 'education',
        'shopping', 'productivity', 'local_service', 'general'
    ];
    if (domains.includes(normalized as SolutionIntentDomain)) {
        return normalized as SolutionIntentDomain;
    }
    return 'general';
}

function uniqueStrings(values: unknown[]): string[] {
    const out: string[] = [];
    values.forEach((value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return;
        if (!out.includes(normalized)) out.push(normalized);
    });
    return out;
}

function toPositiveNumber(value: unknown): number | undefined {
    if (!Number.isFinite(value as number)) return undefined;
    const normalized = Number(value);
    if (normalized <= 0) return undefined;
    return normalized;
}

function normalizeDeliveryModePreference(
    value: unknown
): 'agent_collab' | 'human_expert' | 'hybrid' | undefined {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'agent_collab' || normalized === 'human_expert' || normalized === 'hybrid') {
        return normalized;
    }
    return undefined;
}

function sanitizeCustomRequirements(input: unknown): SolutionCustomRequirements | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const source = input as Record<string, unknown>;
    const objective = String(source.objective || '').trim();
    const mustHave = uniqueStrings(Array.isArray(source.must_have_capabilities) ? source.must_have_capabilities : []);
    const exclusions = uniqueStrings(Array.isArray(source.exclusions) ? source.exclusions : []);
    const successCriteria = uniqueStrings(Array.isArray(source.success_criteria) ? source.success_criteria : []);
    const notes = String(source.notes || '').trim();
    const budgetMax = toPositiveNumber(source.budget_max_cny);
    const expectedDeliveryHours = toPositiveNumber(source.expected_delivery_hours);

    const out: SolutionCustomRequirements = {};
    if (objective) out.objective = objective;
    if (mustHave.length > 0) out.must_have_capabilities = mustHave;
    if (exclusions.length > 0) out.exclusions = exclusions;
    if (typeof budgetMax === 'number') out.budget_max_cny = budgetMax;
    if (typeof expectedDeliveryHours === 'number') out.expected_delivery_hours = expectedDeliveryHours;
    if (successCriteria.length > 0) out.success_criteria = successCriteria;
    if (notes) out.notes = notes;

    return Object.keys(out).length > 0 ? out : undefined;
}

function trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveLixExecutorRef(): string {
    const envBase = String(
        process.env.LIX_AGENT_EXECUTOR_BASE
        || process.env.APP_URL
        || process.env.URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    ).trim();
    if (envBase) {
        return `${trimTrailingSlash(envBase)}/api/lix/solution/executor`;
    }
    if (process.env.NODE_ENV !== 'production') {
        return 'http://127.0.0.1:3000/api/lix/solution/executor';
    }
    return 'https://lumi-agent-simulator.vercel.app/api/lix/solution/executor';
}

function inferCollaboratorAgents(caps: string[]): string[] {
    const out: string[] = [];
    const capSet = new Set(caps);

    if (capSet.has('web_search')) out.push('tool:web_search');
    if (capSet.has('live_search') || capSet.has('local_search')) out.push('tool:live_search');
    if (capSet.has('flight_search')) out.push('specialized:flight_booking');
    if (capSet.has('hotel_search')) out.push('specialized:hotel_booking');
    if (capSet.has('restaurant_search')) out.push('specialized:restaurant');
    if (capSet.has('attraction_search')) out.push('specialized:attraction');
    if (capSet.has('weather_query')) out.push('specialized:weather');
    if (capSet.has('local_transport')) out.push('specialized:transportation');
    if (capSet.has('itinerary_plan')) out.push('specialized:itinerary');

    if (out.length === 0) {
        out.push('tool:live_search', 'tool:web_search');
    }
    return uniqueStrings(out);
}

const SOLUTION_CAPABILITY_ALIASES: Record<string, string[]> = {
    talent_search: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
    local_service_match: ['local_search', 'live_search'],
    evidence_check: ['web_search', 'live_search'],
    task_execution: ['live_search'],
    negotiation: [],
    agent_discovery: ['agent_requirement_broadcast', 'expert_matching', 'web_search'],
};

function normalizeSolutionCapabilityHints(requiredCaps: string[]): string[] {
    const normalized: string[] = [];
    requiredCaps.forEach((value) => {
        const cap = String(value || '').trim().toLowerCase();
        if (!cap) return;
        const mapped = SOLUTION_CAPABILITY_ALIASES[cap];
        if (mapped) {
            normalized.push(...mapped);
            return;
        }
        normalized.push(cap);
    });
    return uniqueStrings(normalized);
}

function buildCapabilityAttempts(requiredCaps: string[]): string[][] {
    const normalized = normalizeSolutionCapabilityHints(requiredCaps);
    const relaxed = normalized.filter((cap) => cap !== 'negotiation');
    const attempts = [normalized, relaxed, [] as string[]];
    const seen = new Set<string>();
    return attempts.reduce<string[][]>((acc, caps) => {
        const deduped = uniqueStrings(caps);
        const key = deduped.join('|');
        if (!seen.has(key)) {
            seen.add(key);
            acc.push(deduped);
        }
        return acc;
    }, []);
}

function normalizeAgentDomain(domain: SolutionIntentDomain): AgentDomain {
    switch (domain) {
        case 'local_service':
            return 'local_service';
        case 'recruitment':
        case 'travel':
        case 'finance':
        case 'health':
        case 'legal':
        case 'education':
        case 'shopping':
        case 'productivity':
            return domain;
        default:
            return 'general';
    }
}

function estimateDeliveryHours(latencyMs?: number): number {
    if (!Number.isFinite(latencyMs)) return 24;
    const normalized = Number(latencyMs);
    if (normalized <= 0) return 24;
    return Math.max(1, Math.ceil(normalized / (60 * 60 * 1000)));
}

function resolveQuoteAmount(candidate: CandidateAgent): number {
    const pricingModel = candidate.agent.pricing_model;
    if (pricingModel === 'free') return 0;
    if (Number.isFinite(candidate.agent.price_per_use_cny)) {
        return Math.max(0, Math.round(Number(candidate.agent.price_per_use_cny)));
    }
    return 0;
}

const LIX_15_DOMAINS = new Set<SolutionIntentDomain>(['travel', 'recruitment', 'local_service']);
const LIX_15_AUCTION_POLICY: IntentAuctionPolicy = {
    policy_version: 'lix_1_5',
    dispatch_mode: 'capability_auction',
    fail_closed: true,
    exploration_quota: 0.2,
    domains_enforced: ['travel', 'recruitment', 'local_service'],
};

const LIX_15_TAKE_RATE_POLICY = {
    first_trade_rate: 0.30,
    repeat_trade_rate: 0.10,
};

const LIX_15_BOND_MIN_CNY = 500;

function isLix15Domain(domain: SolutionIntentDomain): boolean {
    return LIX_15_DOMAINS.has(domain);
}

function estimateIntentComplexity(query: string, requiredCaps: string[]): number {
    const lowered = query.toLowerCase();
    let score = 0.35;
    score += Math.min(0.35, requiredCaps.length * 0.08);
    if (/并行|协同|多方案|compare|parallel|multi|拆解|workflow/.test(lowered)) score += 0.18;
    if (/预算|时限|deadline|constraint|约束/.test(lowered)) score += 0.08;
    if (query.length > 80) score += 0.08;
    return Math.min(1, score);
}

function estimateIntentRisk(query: string, domain: SolutionIntentDomain): number {
    const lowered = query.toLowerCase();
    if (/支付|转账|投资|医疗|法律|授权|账户|密码|交易|合同/.test(lowered)) return 0.82;
    if (domain === 'finance' || domain === 'health' || domain === 'legal') return 0.8;
    if (domain === 'travel' || domain === 'recruitment') return 0.58;
    return 0.46;
}

function resolveDispatchDecision(input: {
    query: string;
    domain: SolutionIntentDomain;
    requiredCapabilities: string[];
    overflowContext?: OverflowDecision;
    dispatchPolicyVersion?: string;
}): DispatchDecision {
    const complexity = Number(input.overflowContext?.complexity ?? estimateIntentComplexity(input.query, input.requiredCapabilities));
    const risk = Number(input.overflowContext?.risk ?? estimateIntentRisk(input.query, input.domain));
    const requiredCaps = Number(input.overflowContext?.required_capabilities ?? input.requiredCapabilities.length);
    const queueDepth = Number(input.overflowContext?.super_agent_queue_depth ?? 0);
    const explicitOverflow = String(input.overflowContext?.mode || '').toLowerCase() === 'capability_auction';
    const domainEnabled = isLix15Domain(input.domain);

    const reasonCodes: string[] = [];
    if (!domainEnabled) {
        return {
            mode: 'lumi_primary',
            reason_codes: ['domain_not_in_lix15_scope'],
            overflow_reason: input.overflowContext?.overflow_reason,
            policy_version: input.dispatchPolicyVersion || LIX_15_AUCTION_POLICY.policy_version,
        };
    }
    if (complexity >= 0.68) reasonCodes.push('complexity>=0.68');
    if (risk >= 0.72) reasonCodes.push('risk>=0.72');
    if (requiredCaps >= 3) reasonCodes.push('required_capabilities>=3');
    if (queueDepth >= 8) reasonCodes.push('super_agent_queue_depth>=8');
    if (explicitOverflow) reasonCodes.push('explicit_overflow_context');

    return {
        mode: 'capability_auction',
        reason_codes: reasonCodes.length > 0 ? reasonCodes : ['direct_lix_dispatch'],
        overflow_reason: input.overflowContext?.overflow_reason,
        policy_version: input.dispatchPolicyVersion || LIX_15_AUCTION_POLICY.policy_version,
    };
}

const EXECUTION_SCORE_WEIGHTS = {
    fit: 0.40,
    reliability: 0.20,
    freshness: 0.15,
    latency: 0.15,
    cost: 0.10,
} as const;

function clampUnitScore(value: number): number {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function roundScore(value: number): number {
    return Math.round(clampUnitScore(value) * 100) / 100;
}

function computeExecutionScore(candidate: CandidateAgent): number {
    const fit = clampUnitScore(candidate.fit_score);
    const reliability = clampUnitScore(candidate.reliability_score);
    const freshness = clampUnitScore(candidate.freshness_score);
    const latency = clampUnitScore(candidate.latency_score);
    const cost = clampUnitScore(candidate.cost_score);

    let weightedScore =
        EXECUTION_SCORE_WEIGHTS.fit * fit
        + EXECUTION_SCORE_WEIGHTS.freshness * freshness
        + EXECUTION_SCORE_WEIGHTS.cost * cost;
    let weightTotal =
        EXECUTION_SCORE_WEIGHTS.fit
        + EXECUTION_SCORE_WEIGHTS.freshness
        + EXECUTION_SCORE_WEIGHTS.cost;

    if (candidate.reliability_known !== false) {
        weightedScore += EXECUTION_SCORE_WEIGHTS.reliability * reliability;
        weightTotal += EXECUTION_SCORE_WEIGHTS.reliability;
    }
    if (candidate.latency_known !== false) {
        weightedScore += EXECUTION_SCORE_WEIGHTS.latency * latency;
        weightTotal += EXECUTION_SCORE_WEIGHTS.latency;
    }

    const base = weightTotal > 0 ? weightedScore / weightTotal : 0;
    return roundScore(base);
}

function computeCompositeScore(executionScore: number, twinFitScore: number): number {
    // Keep feasibility/execution as the primary signal; twin fit is an overlay adjustment.
    return roundScore(executionScore + (Number.isFinite(twinFitScore) ? twinFitScore : 0) * 0.35);
}

function buildRankingRationale(executionScore: number, twinFitScore: number, hasTwinContext: boolean): string {
    if (!hasTwinContext) {
        return `执行分 ${executionScore.toFixed(2)}；未提供 Digital Twin，上下文个性化增益为 0`;
    }
    const twinLabel = twinFitScore >= 0 ? `+${twinFitScore.toFixed(2)}` : twinFitScore.toFixed(2);
    return `执行分 ${executionScore.toFixed(2)}；Twin 贴合 ${twinLabel}（在可执行候选中做个性化排序）`;
}

function buildRealtimeSummary(
    candidate: CandidateAgent,
    quoteAmount: number,
    executionScore: number,
    twinFitScore: number,
    compositeScore: number
): string {
    const realtimeLabel = candidate.agent.supports_realtime ? '实时' : '离线';
    const evidenceLabel = `证据:${candidate.agent.evidence_level}`;
    const priceLabel = candidate.agent.pricing_model === 'free'
        ? '免费'
        : quoteAmount > 0
            ? `¥${quoteAmount}/次`
            : '价格待议';
    const twinLabel = twinFitScore >= 0
        ? `Twin +${Math.abs(twinFitScore).toFixed(2)}`
        : `Twin -${Math.abs(twinFitScore).toFixed(2)}`;
    return `${realtimeLabel} · ${evidenceLabel} · ${priceLabel} · 执行 ${executionScore.toFixed(2)} · ${twinLabel} · 综合 ${compositeScore.toFixed(2)}`;
}

async function buildRealtimeSolutionOffers(
    intentId: string,
    query: string,
    domain: SolutionIntentDomain,
    requiredCaps: string[],
    deliveryModePreference?: 'agent_collab' | 'human_expert' | 'hybrid',
    digitalTwinSnapshot?: LixDigitalTwinSnapshot,
    options?: {
        takeRateTier?: LixTakeRateTier;
        explorationQuota?: number;
        preferPaidExpert?: boolean;
    }
): Promise<AgentSolutionOffer[]> {
    const marketplace = await ensureMarketplaceCatalogReady(true);
    const capabilityAttempts = buildCapabilityAttempts(requiredCaps);
    const preferredDomain = normalizeAgentDomain(domain);
    const digitalTwinContext = digitalTwinSnapshot?.marketplace_context;
    let discovery = null as ReturnType<typeof marketplace.discoverAgents> | null;
    let selectedCaps: string[] = requiredCaps;
    let selectedDomain: AgentDomain = preferredDomain;

    for (const caps of capabilityAttempts) {
        const attempt = marketplace.discoverAgents({
            query,
            locale: 'zh-CN',
            domain_hint: preferredDomain,
            required_capabilities: caps,
            digital_twin_context: digitalTwinContext,
            require_realtime: true,
            max_candidates: 8,
        });
        if (attempt.candidates.length > 0) {
            discovery = attempt;
            selectedCaps = caps;
            break;
        }
    }

    if (!discovery && preferredDomain !== 'general') {
        for (const caps of capabilityAttempts) {
            const attempt = marketplace.discoverAgents({
                query,
                locale: 'zh-CN',
                domain_hint: 'general',
                required_capabilities: caps,
                digital_twin_context: digitalTwinContext,
                require_realtime: true,
                max_candidates: 8,
            });
            if (attempt.candidates.length > 0) {
                discovery = attempt;
                selectedCaps = caps;
                selectedDomain = 'general';
                break;
            }
        }
    }

    if (!discovery) {
        discovery = marketplace.discoverAgents({
            query,
            locale: 'zh-CN',
            domain_hint: preferredDomain,
            required_capabilities: [],
            digital_twin_context: digitalTwinContext,
            require_realtime: true,
            max_candidates: 8,
        });
        selectedCaps = [];
    }

    if (selectedDomain !== preferredDomain || selectedCaps.join('|') !== requiredCaps.join('|')) {
        logEvent('solution.intent.discovery_relaxed', {
            intent_id: intentId,
            domain_from: preferredDomain,
            domain_to: selectedDomain,
            required_caps_from: requiredCaps,
            required_caps_to: selectedCaps,
            candidates_count: discovery.candidates.length,
        });
    }

    const now = new Date().toISOString();
    const preference = normalizeDeliveryModePreference(deliveryModePreference) || 'hybrid';
    const takeRateTier: LixTakeRateTier = options?.takeRateTier || 'first_trade';
    const effectiveTakeRate = takeRateTier === 'first_trade'
        ? LIX_15_TAKE_RATE_POLICY.first_trade_rate
        : LIX_15_TAKE_RATE_POLICY.repeat_trade_rate;
    const explorationQuota = Math.min(0.5, Math.max(0, Number(options?.explorationQuota ?? LIX_15_AUCTION_POLICY.exploration_quota)));
    const preferPaidExpert = options?.preferPaidExpert === true;
    const requestedCaps = normalizeSolutionCapabilityHints(requiredCaps);
    const offers = discovery.candidates.map((candidate) => {
        const caps = uniqueStrings([
            ...candidate.agent.capabilities,
            ...requestedCaps,
        ]);
        const quoteAmount = resolveQuoteAmount(candidate);
        const offerType: AgentSolutionOffer['offer_type'] = candidate.agent.supports_parallel ? 'agent_collab' : 'human_expert';
        const collaboratorAgents = offerType === 'agent_collab'
            ? inferCollaboratorAgents(caps)
            : undefined;
        const capacityScore = Math.max(0, Math.min(1, candidate.latency_score || 0.65));
        const capacityAvailable = capacityScore >= 0.3;
        const riskScore = Math.max(0, Math.min(1, 1 - (candidate.reliability_score || 0.5)));
        settlementService.ensureBondAccount(candidate.agent.id, LIX_15_BOND_MIN_CNY);
        const bondStatus = settlementService.getBondStatus(candidate.agent.id);
        const bondCoverage = bondStatus.available_balance >= LIX_15_BOND_MIN_CNY;
        const expectedCompletionMinutes = Math.max(
            5,
            Math.ceil((candidate.agent.avg_latency_ms || 30 * 60 * 1000) / (60 * 1000))
        );
        const executionScore = computeExecutionScore(candidate);
        const twinFitScore = Number.isFinite(candidate.twin_boost) ? Math.round(Number(candidate.twin_boost) * 100) / 100 : 0;
        const compositeScore = computeCompositeScore(executionScore, twinFitScore);
        const rankingRationale = buildRankingRationale(executionScore, twinFitScore, Boolean(digitalTwinContext));
        return {
            offer_id: `sol_offer_${candidate.agent.id}_${generateId().slice(0, 6)}`,
            intent_id: intentId,
            expert_id: candidate.agent.id,
            expert_name: candidate.agent.name,
            offer_type: offerType,
            summary: buildRealtimeSummary(candidate, quoteAmount, executionScore, twinFitScore, compositeScore),
            proposed_capabilities: caps,
            collaborator_agents: collaboratorAgents,
            orchestration_strategy: offerType === 'agent_collab'
                ? 'planner -> multi-agent execution -> evidence merge'
                : undefined,
            estimated_delivery_hours: estimateDeliveryHours(candidate.agent.avg_latency_ms),
            expected_completion_minutes: expectedCompletionMinutes,
            quote_amount: quoteAmount,
            currency: 'CNY',
            capacity_available: capacityAvailable,
            capacity_score: capacityScore,
            risk_score: riskScore,
            bond_coverage: bondCoverage,
            effective_take_rate: effectiveTakeRate,
            take_rate_tier: takeRateTier,
            execution_score: executionScore,
            twin_fit_score: twinFitScore,
            composite_score: compositeScore,
            ranking_rationale: rankingRationale,
            status: 'open' as const,
            created_at: now,
        };
    });

    const feasibleOffers = offers.filter((offer) => offer.bond_coverage && offer.capacity_available);
    const ranked = feasibleOffers.sort((a, b) => {
        const aPref = preference === 'agent_collab'
            ? (a.offer_type === 'agent_collab' ? 1 : 0)
            : preference === 'human_expert'
                ? (a.offer_type === 'human_expert' ? 1 : 0)
                : 0;
        const bPref = preference === 'agent_collab'
            ? (b.offer_type === 'agent_collab' ? 1 : 0)
            : preference === 'human_expert'
                ? (b.offer_type === 'human_expert' ? 1 : 0)
                : 0;
        if (aPref !== bPref) return bPref - aPref;
        if ((a.composite_score || 0) !== (b.composite_score || 0)) {
            return (b.composite_score || 0) - (a.composite_score || 0);
        }
        if ((a.execution_score || 0) !== (b.execution_score || 0)) {
            return (b.execution_score || 0) - (a.execution_score || 0);
        }
        if (preferPaidExpert) {
            if (a.quote_amount === 0 && b.quote_amount > 0) return 1;
            if (a.quote_amount > 0 && b.quote_amount === 0) return -1;
        }
        if (a.quote_amount !== b.quote_amount) return a.quote_amount - b.quote_amount;
        if ((a.risk_score || 0) !== (b.risk_score || 0)) return (a.risk_score || 0) - (b.risk_score || 0);
        if ((a.capacity_score || 0) !== (b.capacity_score || 0)) return (b.capacity_score || 0) - (a.capacity_score || 0);
        return (a.expected_completion_minutes || a.estimated_delivery_hours * 60) - (b.expected_completion_minutes || b.estimated_delivery_hours * 60);
    });

    if (ranked.length <= 1 || explorationQuota <= 0) {
        return ranked;
    }

    const newOffers = ranked.filter((offer) => {
        const counterparty = discovery.candidates.find((candidate) => offer.expert_id === candidate.agent.id)?.agent;
        const usage30d = Number(counterparty?.market_stats?.usage_30d || 0);
        return usage30d <= 0;
    });
    const matureOffers = ranked.filter((offer) => !newOffers.includes(offer));
    const quota = Math.min(newOffers.length, Math.max(1, Math.round(ranked.length * explorationQuota)));
    const selected = [
        ...matureOffers.slice(0, Math.max(0, ranked.length - quota)),
        ...newOffers.slice(0, quota),
    ];
    return selected.slice(0, ranked.length);
}

// ============================================================================
// Store Implementation
// ============================================================================

class LIXStore {
    state: LIXStoreState = {
        intents: new Map(),
        solution_intents: new Map(),
        events: [],
        metrics: {
            total_intents_broadcast: 0,
            total_offers_received: 0,
            total_accepted: 0,
            avg_first_offer_seconds: 1.5,
            total_solution_intents: 0,
            total_solution_deliveries: 0,
            total_solution_approved: 0,
        }
    };

    private listeners: Set<() => void> = new Set();
    private tradeCounterByPair = new Map<string, number>();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    // ========================================================================
    // Intent Operations (existing)
    // ========================================================================

    async broadcastIntent(params: {
        category: 'purchase' | 'job' | 'collaboration';
        item: string;
        budget?: number;
        specs?: Record<string, string>;
    }): Promise<StoredIntent> {
        const startTime = Date.now();
        const intentId = `intent_${generateId()}`;

        // Create stored intent
        const storedIntent: StoredIntent = {
            intent_id: intentId,
            category: params.category,
            item_name: params.item,
            budget_max: params.budget,
            currency: 'CNY',
            status: 'broadcasting',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            offers: [],
            total_offers_received: 0
        };

        this.state.intents.set(intentId, storedIntent);
        this.notify();

        logEvent('intent.created', { intent_id: intentId, category: params.category, item: params.item });
        logEvent('intent.broadcast', { intent_id: intentId });

        // Call market service
        try {
            const response = await lixMarketService.broadcast({
                category: params.category,
                payload: params.item,
                budget: params.budget,
                specs: params.specs
            });

            const firstOfferSeconds = (Date.now() - startTime) / 1000;

            // Update stored intent with offers
            storedIntent.status = response.ranked_offers.length > 0 ? 'offers_received' : 'broadcasting';
            storedIntent.offers = response.ranked_offers;
            storedIntent.total_offers_received = response.total_offers_received;
            storedIntent.best_price = response.ranked_offers[0]?.offer.price.amount;
            storedIntent.item_sku = response.ranked_offers[0]?.offer.item_sku;

            this.state.metrics.total_intents_broadcast++;
            this.state.metrics.total_offers_received += response.total_offers_received;
            this.state.metrics.avg_first_offer_seconds =
                (this.state.metrics.avg_first_offer_seconds * 0.9) + (firstOfferSeconds * 0.1);

            // Log offer events
            response.ranked_offers.forEach((ro, i) => {
                logEvent('offer.received', {
                    intent_id: intentId,
                    offer_id: ro.offer.offer_id,
                    provider: ro.offer.provider.name,
                    rank: i + 1
                });
                logEvent('offer.validated', {
                    intent_id: intentId,
                    offer_id: ro.offer.offer_id,
                    eligible: ro.eligible
                });
                logEvent('offer.ranked', {
                    intent_id: intentId,
                    offer_id: ro.offer.offer_id,
                    rank: ro.rank,
                    score: ro.total_score
                });
            });

            this.notify();
            return storedIntent;

        } catch (error) {
            storedIntent.status = 'expired';
            this.notify();
            throw error;
        }
    }

    async acceptOffer(intentId: string, offerId: string): Promise<AcceptToken> {
        const intent = this.state.intents.get(intentId);
        if (!intent) throw new Error(`Intent ${intentId} not found`);

        const offer = intent.offers.find(o => o.offer.offer_id === offerId);
        if (!offer) throw new Error(`Offer ${offerId} not found`);

        // Create settlement token using settlementService
        const settlementToken = settlementService.createAcceptToken({
            intent_id: intentId,
            offer_id: offerId,
            provider_id: offer.offer.provider.id,
            user_pseudonym: intent.proof?.user_pseudonym || `pub_${generateId().substring(0, 16)}`,
            offer_amount: offer.offer.price.amount,
            currency: offer.offer.price.currency,
            item_name: intent.item_name,
            category: intent.category,
            conversion_callback_url: `/api/lix/conversion/callback/${offer.offer.provider.id}`
        });

        // Generate legacy accept token for backwards compatibility
        const token: AcceptToken = {
            token_id: settlementToken.token_id,
            intent_id: intentId,
            offer_id: offerId,
            provider_id: offer.offer.provider.id,
            publisher_pseudonym: settlementToken.user_pseudonym,
            offer_amount: settlementToken.offer_amount,
            currency: settlementToken.currency,
            created_at: settlementToken.created_at.toISOString(),
            expires_at: settlementToken.expires_at.toISOString(),
            callback_url: settlementToken.conversion_callback_url || '',
            signature: `sig_accept_${generateId()}`
        };

        intent.status = 'accepted';
        intent.accepted_offer_id = offerId;
        intent.accept_token = token;
        intent.settlement_token = settlementToken;
        this.state.metrics.total_accepted++;

        logEvent('offer.accepted', {
            intent_id: intentId,
            offer_id: offerId,
            token_id: token.token_id,
            provider: offer.offer.provider.name,
            price: offer.offer.price.amount,
            settlement_status: settlementToken.status
        });

        this.notify();
        return token;
    }

    // ========================================================================
    // Solution Intent Operations (new)
    // ========================================================================

    async broadcastSolutionIntent(params: {
        requester_id?: string;
        requester_type?: 'user' | 'agent';
        requester_agent_id?: string;
        requester_agent_name?: string;
        title?: string;
        query: string;
        domain?: string;
        required_capabilities?: string[];
        delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
        custom_requirements?: SolutionCustomRequirements;
        failure_context?: SolutionFailureContext;
        profile_share_consent?: ProfileShareConsentState;
        digital_twin_snapshot?: LixDigitalTwinSnapshot;
        runtime_base_url?: string;
        reasoning_trace_id?: string;
        overflow_context?: OverflowDecision;
        dispatch_policy_version?: string;
        prefer_paid_expert?: boolean;
    }): Promise<StoredSolutionIntent> {
        const query = String(params.query || '').trim();
        if (!query) throw new Error('Missing required field: query');

        const intentId = `sol_intent_${generateId()}`;
        const now = new Date().toISOString();
        const resolvedDomain = inferSolutionDomain(params.domain);
        const customRequirements = sanitizeCustomRequirements(params.custom_requirements);
        const requiredCaps = uniqueStrings([
            ...(Array.isArray(params.required_capabilities) ? params.required_capabilities : []),
            ...((customRequirements?.must_have_capabilities || []) as string[]),
        ]);
        const dispatchDecision = resolveDispatchDecision({
            query,
            domain: resolvedDomain,
            requiredCapabilities: requiredCaps,
            overflowContext: params.overflow_context,
            dispatchPolicyVersion: params.dispatch_policy_version,
        });
        const requesterType = params.requester_type === 'agent' ? 'agent' : 'user';
        const requesterAgentId = requesterType === 'agent' ? String(params.requester_agent_id || '').trim() : '';
        const requesterAgentName = requesterType === 'agent' ? String(params.requester_agent_name || '').trim() : '';
        const deliveryModePreference = normalizeDeliveryModePreference(params.delivery_mode_preference) || 'hybrid';
        const takeRateTier: LixTakeRateTier = 'first_trade';
        let offers: AgentSolutionOffer[] = [];
        if (dispatchDecision.mode === 'capability_auction') {
            try {
                offers = await buildRealtimeSolutionOffers(
                    intentId,
                    query,
                    resolvedDomain,
                    requiredCaps,
                    deliveryModePreference,
                    params.digital_twin_snapshot,
                    {
                        takeRateTier,
                        explorationQuota: LIX_15_AUCTION_POLICY.exploration_quota,
                        preferPaidExpert: params.prefer_paid_expert,
                    }
                );
            } catch (error) {
                logEvent('solution.intent.discovery_failed', {
                    intent_id: intentId,
                    error: error instanceof Error ? error.message : 'unknown_error',
                });
                offers = [];
            }
        }

        const intent: StoredSolutionIntent = {
            intent_id: intentId,
            kind: 'solution',
            requester_id: String(params.requester_id || 'demo_user'),
            requester_type: requesterType,
            requester_agent_id: requesterAgentId || undefined,
            requester_agent_name: requesterAgentName || undefined,
            title: String(params.title || `为需求创建可执行 Agent：${query.slice(0, 32)}`),
            query,
            domain: resolvedDomain,
            required_capabilities: requiredCaps,
            delivery_mode_preference: deliveryModePreference,
            custom_requirements: customRequirements,
            failure_context: params.failure_context,
            profile_share_consent: params.profile_share_consent,
            digital_twin_snapshot: params.digital_twin_snapshot,
            status: dispatchDecision.mode === 'capability_auction'
                ? (offers.length > 0 ? 'offers_received' : 'broadcasting')
                : 'broadcasting',
            dispatch_mode: dispatchDecision.mode,
            overflow_reason: dispatchDecision.overflow_reason,
            take_rate_tier: takeRateTier,
            bond_required: isLix15Domain(resolvedDomain),
            insurance_status: isLix15Domain(resolvedDomain) ? 'insured' : 'inactive',
            eta_minutes: offers[0]?.expected_completion_minutes ?? 0,
            sla_state: offers.length === 0 ? 'at_risk' : 'on_track',
            created_at: now,
            updated_at: now,
            offers,
            trace_id: createTraceContext(intentId).trace_id,
        };

        this.state.solution_intents.set(intentId, intent);
        this.state.metrics.total_solution_intents += 1;

        logEvent('solution.intent.created', {
            intent_id: intentId,
            requester_id: intent.requester_id,
            requester_type: intent.requester_type,
            requester_agent_id: intent.requester_agent_id,
            domain: intent.domain,
            caps: intent.required_capabilities,
            dispatch_mode: intent.dispatch_mode,
            dispatch_reason_codes: dispatchDecision.reason_codes,
            reasoning_trace_id: params.reasoning_trace_id,
            delivery_mode_preference: intent.delivery_mode_preference,
            has_custom_requirements: Boolean(intent.custom_requirements),
        });
        if (offers.length > 0) {
            logEvent('solution.intent.offers_received', {
                intent_id: intentId,
                offers_count: offers.length,
            });
        }
        if (intent.digital_twin_snapshot) {
            logEvent('solution.intent.profile_attached', {
                intent_id: intentId,
                user_id: intent.digital_twin_snapshot.user_id,
                profile_share_consent: intent.profile_share_consent || 'unknown',
            });
        }

        this.notify();
        return intent;
    }

    getSolutionIntent(intentId: string): StoredSolutionIntent | undefined {
        return this.state.solution_intents.get(intentId);
    }

    getAllSolutionIntents(): StoredSolutionIntent[] {
        return Array.from(this.state.solution_intents.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    getSolutionOffers(intentId: string): AgentSolutionOffer[] {
        return this.state.solution_intents.get(intentId)?.offers || [];
    }

    async acceptSolutionOffer(intentId: string, offerId: string): Promise<StoredSolutionIntent> {
        const intent = this.state.solution_intents.get(intentId);
        if (!intent) throw new Error(`Solution intent ${intentId} not found`);

        const matched = intent.offers.find((offer) => offer.offer_id === offerId);
        if (!matched) throw new Error(`Solution offer ${offerId} not found`);

        const tradeKey = `${intent.requester_id}::${matched.expert_id}`;
        const orderSequence = (this.tradeCounterByPair.get(tradeKey) || 0) + 1;
        this.tradeCounterByPair.set(tradeKey, orderSequence);
        const takeRateTier: LixTakeRateTier = orderSequence <= 1 ? 'first_trade' : 'repeat_trade';
        const effectiveTakeRate = takeRateTier === 'first_trade'
            ? LIX_15_TAKE_RATE_POLICY.first_trade_rate
            : LIX_15_TAKE_RATE_POLICY.repeat_trade_rate;

        intent.offers = intent.offers.map((offer) => ({
            ...offer,
            effective_take_rate: offer.offer_id === offerId ? effectiveTakeRate : offer.effective_take_rate,
            take_rate_tier: offer.offer_id === offerId ? takeRateTier : offer.take_rate_tier,
            status: offer.offer_id === offerId ? 'accepted' : (offer.status === 'accepted' ? 'open' : 'rejected'),
        }));
        intent.accepted_offer_id = offerId;
        intent.take_rate_tier = takeRateTier;
        intent.updated_at = new Date().toISOString();

        if (intent.bond_required) {
            intent.status = 'bond_pending';
            const locked = settlementService.lockBond({
                intent_id: intentId,
                offer_id: offerId,
                provider_id: matched.expert_id,
                amount: LIX_15_BOND_MIN_CNY,
                reason: 'lix_intent_accept',
            });
            if (!locked.success || !locked.bond_lock_id) {
                throw new Error(`bond_gate_failed:${locked.error || 'unknown'}`);
            }
            intent.bond_lock_id = locked.bond_lock_id;
            intent.status = 'bond_locked';
            intent.insurance_status = 'insured';
        }

        logEvent('solution.offer.accepted', {
            intent_id: intentId,
            offer_id: offerId,
            expert_id: matched.expert_id,
            offer_type: matched.offer_type || 'human_expert',
            take_rate_tier: takeRateTier,
            take_rate: effectiveTakeRate,
            bond_lock_id: intent.bond_lock_id,
        });

        if (matched.offer_type === 'agent_collab') {
            const now = new Date().toISOString();
            const caps = uniqueStrings(
                matched.proposed_capabilities.length > 0
                    ? matched.proposed_capabilities
                    : intent.required_capabilities
            );
            const manifest: DeliveredAgentManifest = {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: `ext:lix:${generateId()}`,
                name: `LIX 协同 Agent · ${intent.title.slice(0, 20)}`,
                description: `由 ${matched.expert_name} 自动编排多个 Agent 协同执行`,
                execute_ref: resolveLixExecutorRef(),
                domains: [intent.domain],
                capabilities: caps.length > 0 ? caps : ['general'],
                supports_realtime: true,
                evidence_level: 'strong',
                supports_parallel: true,
                cost_tier: 'low',
                avg_latency_ms: 1400,
                success_rate: 0.93,
                owner_id: intent.requester_id,
                submitted_by: matched.expert_id,
                submitted_at: now,
                market_visibility: 'public',
                pricing_model: 'pay_per_use',
                price_per_use_cny: 9,
                delivery_mode_preference: intent.delivery_mode_preference || 'agent_collab',
            };

            intent.delivery_manifest = manifest;
            intent.review = {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: manifest.agent_id,
                reviewer_id: 'system_auto',
                decision: 'approved',
                reason: 'Agent 协同方案自动交付并通过系统审核',
                reviewed_at: now,
            };
            intent.status = 'approved';
            intent.updated_at = now;
            this.state.metrics.total_solution_deliveries += 1;
            this.state.metrics.total_solution_approved += 1;
            intent.sla_state = 'on_track';

            logEvent('solution.agent_collab.auto_delivery', {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: manifest.agent_id,
                collaborators: matched.collaborator_agents || [],
            });
            logEvent('solution.delivery.submitted', {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: manifest.agent_id,
                owner_id: manifest.owner_id,
                auto: true,
            });
            logEvent('solution.delivery.reviewed', {
                intent_id: intent.intent_id,
                agent_id: manifest.agent_id,
                decision: 'approved',
                reviewer_id: 'system_auto',
                auto: true,
            });
            if (intent.bond_lock_id) {
                settlementService.releaseBond(intent.bond_lock_id);
            }
        } else {
            intent.status = 'offer_accepted';
        }

        this.notify();
        return intent;
    }

    async submitSolutionDelivery(input: {
        intent_id: string;
        offer_id: string;
        submitted_by?: string;
        owner_id?: string;
        agent_id?: string;
        name: string;
        description?: string;
        execute_ref: string;
        domains: string[];
        capabilities: string[];
        supports_realtime?: boolean;
        evidence_level?: 'none' | 'weak' | 'strong';
        supports_parallel?: boolean;
        cost_tier?: 'low' | 'mid' | 'high';
        avg_latency_ms?: number;
        success_rate?: number;
        market_visibility?: 'public' | 'private';
        pricing_model?: 'free' | 'pay_per_use';
        price_per_use_cny?: number;
        github_repo?: string;
        manifest_path?: string;
        delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
    }): Promise<StoredSolutionIntent> {
        const intent = this.state.solution_intents.get(input.intent_id);
        if (!intent) throw new Error(`Solution intent ${input.intent_id} not found`);
        if (intent.accepted_offer_id !== input.offer_id) {
            throw new Error('offer_id is not the accepted offer for this intent');
        }

        const domains = uniqueStrings(Array.isArray(input.domains) ? input.domains : [intent.domain])
            .map((domain) => inferSolutionDomain(domain));
        const capabilities = uniqueStrings(Array.isArray(input.capabilities) ? input.capabilities : intent.required_capabilities);

        const manifest: DeliveredAgentManifest = {
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            agent_id: String(input.agent_id || `ext:lix:${generateId()}`),
            name: String(input.name || 'LIX Delivered Agent'),
            description: input.description,
            execute_ref: String(input.execute_ref || '').trim(),
            domains: domains.length > 0 ? domains : [intent.domain],
            capabilities: capabilities.length > 0 ? capabilities : ['general'],
            supports_realtime: Boolean(input.supports_realtime),
            evidence_level: input.evidence_level || 'weak',
            supports_parallel: input.supports_parallel !== false,
            cost_tier: input.cost_tier || 'mid',
            avg_latency_ms: Number.isFinite(input.avg_latency_ms) ? Number(input.avg_latency_ms) : undefined,
            success_rate: Number.isFinite(input.success_rate) ? Number(input.success_rate) : undefined,
            owner_id: String(input.owner_id || intent.requester_id || 'demo_user'),
            submitted_by: String(input.submitted_by || 'expert_unknown'),
            submitted_at: new Date().toISOString(),
            market_visibility: input.market_visibility === 'private' ? 'private' : 'public',
            pricing_model: input.pricing_model === 'free' ? 'free' : 'pay_per_use',
            price_per_use_cny: input.pricing_model === 'free'
                ? 0
                : (Number.isFinite(input.price_per_use_cny) ? Math.max(0, Number(input.price_per_use_cny)) : 9),
            github_repo: input.github_repo ? String(input.github_repo).trim() : undefined,
            manifest_path: input.manifest_path ? String(input.manifest_path).trim() : undefined,
            delivery_mode_preference: normalizeDeliveryModePreference(input.delivery_mode_preference)
                || intent.delivery_mode_preference
                || 'hybrid',
        };

        if (!manifest.execute_ref) {
            throw new Error('execute_ref is required in delivery manifest');
        }

        intent.delivery_manifest = manifest;
        intent.status = 'delivery_submitted';
        intent.updated_at = new Date().toISOString();
        this.state.metrics.total_solution_deliveries += 1;

        logEvent('solution.delivery.submitted', {
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            agent_id: manifest.agent_id,
            owner_id: manifest.owner_id,
        });

        this.notify();
        return intent;
    }

    async reviewSolutionDelivery(input: {
        intent_id: string;
        reviewer_id?: string;
        decision: 'approved' | 'rejected';
        reason?: string;
    }): Promise<StoredSolutionIntent> {
        const intent = this.state.solution_intents.get(input.intent_id);
        if (!intent) throw new Error(`Solution intent ${input.intent_id} not found`);
        if (!intent.delivery_manifest) {
            throw new Error('delivery_manifest not found for this intent');
        }

        const review: ReviewDecision = {
            intent_id: intent.intent_id,
            offer_id: intent.delivery_manifest.offer_id,
            agent_id: intent.delivery_manifest.agent_id,
            reviewer_id: String(input.reviewer_id || 'reviewer_admin'),
            decision: input.decision,
            reason: input.reason,
            reviewed_at: new Date().toISOString(),
        };

        intent.review = review;
        intent.status = input.decision === 'approved' ? 'approved' : 'rejected';
        intent.updated_at = review.reviewed_at;
        intent.sla_state = input.decision === 'approved' ? 'on_track' : 'breach';
        if (input.decision === 'approved') {
            this.state.metrics.total_solution_approved += 1;
            if (intent.bond_lock_id) {
                settlementService.releaseBond(intent.bond_lock_id);
            }
        } else if (intent.bond_lock_id) {
            const amount = Math.max(1, Number(intent.offers.find((offer) => offer.offer_id === intent.accepted_offer_id)?.quote_amount || 0));
            const escrowRefund = settlementService.refundEscrow({
                intent_id: intent.intent_id,
                offer_id: intent.accepted_offer_id || review.offer_id,
                provider_id: review.agent_id,
                amount_cny: amount,
                reason: input.reason || 'delivery_rejected',
            });
            const slash = settlementService.slashBond({
                bond_lock_id: intent.bond_lock_id,
                amount: Math.min(LIX_15_BOND_MIN_CNY, amount),
                reason: input.reason || 'delivery_rejected',
            });
            intent.status = 'compensated';
            intent.insurance_status = slash.success ? 'compensated' : 'claim_pending';
            logEvent('solution.compensation.executed', {
                intent_id: intent.intent_id,
                escrow_claim_id: escrowRefund.claim_id,
                bond_slash_success: slash.success,
                bond_slash_ledger: slash.ledger_id,
            });
        }

        logEvent('solution.delivery.reviewed', {
            intent_id: intent.intent_id,
            agent_id: review.agent_id,
            decision: review.decision,
            reviewer_id: review.reviewer_id,
        });

        this.notify();
        return intent;
    }

    ingestSolutionIntent(intent: StoredSolutionIntent): void {
        if (!intent || !intent.intent_id) return;
        this.state.solution_intents.set(intent.intent_id, intent);
        this.notify();
    }

    listMyDeliveredManifests(ownerId: string = 'demo_user'): DeliveredAgentManifest[] {
        return this.getAllSolutionIntents()
            .filter((intent) => intent.status === 'approved' && intent.delivery_manifest?.owner_id === ownerId)
            .map((intent) => intent.delivery_manifest as DeliveredAgentManifest);
    }

    // ========================================================================
    // Getters
    // ========================================================================

    getIntent(intentId: string): StoredIntent | undefined {
        return this.state.intents.get(intentId);
    }

    getAllIntents(): StoredIntent[] {
        return Array.from(this.state.intents.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    getRecentIntents(limit: number = 5): StoredIntent[] {
        return this.getAllIntents().slice(0, limit);
    }

    getMetrics() {
        return this.state.metrics;
    }

    getEvents(limit: number = 20): LIXEvent[] {
        return this.state.events.slice(-limit);
    }

    resetForTests(): void {
        this.state.intents.clear();
        this.state.solution_intents.clear();
        this.tradeCounterByPair.clear();
        this.state.events = [];
        this.state.metrics = {
            total_intents_broadcast: 0,
            total_offers_received: 0,
            total_accepted: 0,
            avg_first_offer_seconds: 1.5,
            total_solution_intents: 0,
            total_solution_deliveries: 0,
            total_solution_approved: 0,
        };
        this.notify();
    }
}

// Singleton instance
export const lixStore = new LIXStore();

// React hook for subscribing to store changes
export function useLIXStore() {
    const [, forceUpdate] = React.useState({});

    React.useEffect(() => {
        return lixStore.subscribe(() => forceUpdate({}));
    }, []);

    return {
        intents: lixStore.getAllIntents(),
        solutionIntents: lixStore.getAllSolutionIntents(),
        recentIntents: lixStore.getRecentIntents(),
        metrics: lixStore.getMetrics(),
        broadcastIntent: lixStore.broadcastIntent.bind(lixStore),
        acceptOffer: lixStore.acceptOffer.bind(lixStore),
        broadcastSolutionIntent: lixStore.broadcastSolutionIntent.bind(lixStore),
        acceptSolutionOffer: lixStore.acceptSolutionOffer.bind(lixStore),
        submitSolutionDelivery: lixStore.submitSolutionDelivery.bind(lixStore),
        reviewSolutionDelivery: lixStore.reviewSolutionDelivery.bind(lixStore),
        getSolutionIntent: lixStore.getSolutionIntent.bind(lixStore),
        getIntent: lixStore.getIntent.bind(lixStore)
    };
}

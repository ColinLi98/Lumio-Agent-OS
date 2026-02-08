/**
 * Agent Marketplace Service - 通用 Agent 市场调度引擎
 *
 * 8-step flow: Normalize → Intent & Domain → Decompose → Discover → Select → Execute → Aggregate → Respond
 *
 * Scoring: 0.40*fit + 0.20*reliability + 0.15*freshness + 0.15*latency + 0.10*cost
 */

import type {
    AgentDomain,
    AgentDescriptor,
    DiscoveryQuery,
    CandidateAgent,
    MarketplaceTask,
    AgentExecutionPlan,
    AgentExecutionResult,
    DiscoveryResponse,
    ExecutionSummary,
    PlanBuildResult,
    EvidenceLevel,
    CostTier,
} from './agentMarketplaceTypes';
import { getToolRegistry } from './toolRegistry';
import { getSkillRegistry, type Skill } from './skillRegistry';
import { SPECIALIZED_AGENTS, getSpecializedAgentRuntimeStats } from './specializedAgents';
import type { SpecializedAgentType } from '../types';
import { lixAgentRegistryService } from './lixAgentRegistryService';

// ============================================================================
// Constants & Defaults
// ============================================================================

const SCORE_WEIGHTS = {
    fit: 0.40,
    reliability: 0.20,
    freshness: 0.15,
    latency: 0.15,
    cost: 0.10,
} as const;

const MAX_FALLBACKS = 2;
const MAX_CONCURRENCY = 3;
const DEFAULT_TTL_MS = 120_000;

/** High-risk domains that auto-require evidence */
const HIGH_RISK_DOMAINS: AgentDomain[] = ['health', 'legal', 'finance'];

/** External market admission thresholds */
const EXTERNAL_ADMISSION = {
    min_success_rate: 0.95,
    max_p95_latency_ms: 6000,
    min_evidence_rate: 0.98,
};

const COMPLIANCE_BLOCK_TAGS = new Set([
    'disabled',
    'blocked',
    'non_compliant',
    'external_disabled',
]);

// Specialized catalog policy:
// - Register only usable agents that return meaningful structured outputs.
// - Keep placeholder agents (shopping/social_search/translation) hidden.
const SPECIALIZED_AGENT_META: Partial<Record<SpecializedAgentType, {
    domains: AgentDomain[];
    capabilities: string[];
    supports_realtime: boolean;
    evidence_level: EvidenceLevel;
    supports_parallel: boolean;
    cost_tier: CostTier;
}>> = {
    flight_booking: {
        domains: ['travel'],
        capabilities: ['flight_search', 'live_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        cost_tier: 'mid',
    },
    hotel_booking: {
        domains: ['travel'],
        capabilities: ['hotel_search', 'live_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        cost_tier: 'mid',
    },
    restaurant: {
        domains: ['travel', 'local_service'],
        capabilities: ['restaurant_search', 'local_search'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        cost_tier: 'low',
    },
    attraction: {
        domains: ['travel', 'local_service'],
        capabilities: ['attraction_search', 'local_search'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        cost_tier: 'low',
    },
    weather: {
        domains: ['travel', 'local_service', 'general'],
        capabilities: ['weather_query'],
        supports_realtime: true,
        evidence_level: 'weak',
        supports_parallel: true,
        cost_tier: 'low',
    },
    itinerary: {
        domains: ['travel'],
        capabilities: ['itinerary_plan'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        cost_tier: 'low',
    },
    transportation: {
        domains: ['travel', 'local_service'],
        capabilities: ['local_transport'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        cost_tier: 'low',
    },
};

// ============================================================================
// Domain Detection
// ============================================================================

const DOMAIN_KEYWORDS: Record<AgentDomain, RegExp> = {
    recruitment: /招聘|简历|面试|求职|job|resume|salary|hire|候选人|薪资|猎头/i,
    travel: /旅行|旅游|机票|航班|酒店|住宿|景点|flight|hotel|travel|行程|签证/i,
    finance: /金融|理财|股票|基金|投资|贷款|保险|银行|finance|invest|stock|黄金|比特币/i,
    health: /健康|医疗|看病|体检|用药|health|medical|诊断|症状|处方/i,
    legal: /法律|合同|诉讼|律师|法务|legal|law|lawsuit|维权|侵权/i,
    education: /学习|课程|培训|教育|考试|education|course|study|辅导|学校|大学/i,
    shopping: /购物|买|商品|价格|比价|shopping|purchase|电商|下单|优惠/i,
    productivity: /提醒|日程|待办|笔记|productivity|schedule|todo|效率|计划/i,
    local_service: /外卖|快递|维修|保洁|家政|本地|附近|周边|商家|店铺|咖啡|咖啡店|餐厅|药店|导航|local|service|nearby|maps?|上门|配送/i,
    general: /./,
};

export function detectDomain(query: string): AgentDomain {
    for (const [domain, pattern] of Object.entries(DOMAIN_KEYWORDS)) {
        if (domain === 'general') continue;
        if (pattern.test(query)) return domain as AgentDomain;
    }
    return 'general';
}

// ============================================================================
// Capability Detection
// ============================================================================

const CAPABILITY_KEYWORDS: Record<string, RegExp> = {
    job_sourcing: /招聘|职位|岗位|job|position|hiring/i,
    resume_optimization: /简历|resume|CV|优化|修改/i,
    salary_benchmark: /薪资|工资|salary|待遇|薪酬|compensation/i,
    flight_search: /机票|航班|flight|飞/i,
    hotel_search: /酒店|住宿|hotel|民宿/i,
    local_transport: /交通|打车|地铁|出行|transport/i,
    restaurant_search: /餐厅|美食|restaurant|吃/i,
    attraction_search: /景点|旅游|attraction|玩/i,
    local_search: /附近|周边|本地|商家|店铺|餐厅|咖啡|药店|导航|local|nearby|maps?/i,
    weather_query: /天气|weather|气温/i,
    price_compare: /价格|比价|price|多少钱/i,
    shopping_search: /购物|商品|下单|购买|电商|shopping|product|deal/i,
    web_search: /搜索|查询|search|是什么|是谁/i,
    live_search: /实时|最新|行情|live|realtime/i,
    knowledge_qa: /回复|润色|措辞|怎么回/i,
    itinerary_plan: /行程|安排|规划|计划|plan/i,
    legal_review: /合同|审查|法律|review|法务/i,
    health_consult: /症状|诊断|用药|健康|咨询/i,
    finance_analysis: /投资|理财|分析|financial|analysis/i,
    course_recommend: /课程|学习|推荐|course/i,
};

export function detectCapabilities(query: string): string[] {
    const caps: string[] = [];
    for (const [cap, pattern] of Object.entries(CAPABILITY_KEYWORDS)) {
        if (pattern.test(query)) caps.push(cap);
    }
    return caps.length > 0 ? caps : ['general'];
}

// ============================================================================
// Task Decomposition
// ============================================================================

/** Predefined task templates per domain */
const DOMAIN_TASK_TEMPLATES: Partial<Record<AgentDomain, Array<{
    id_suffix: string;
    objective: string;
    required_capabilities: string[];
    dependencies: string[];
    parallelizable: boolean;
}>>> = {
    recruitment: [
        { id_suffix: 'job_sourcing', objective: '搜索匹配岗位', required_capabilities: ['job_sourcing'], dependencies: [], parallelizable: true },
        { id_suffix: 'resume_opt', objective: '简历优化建议', required_capabilities: ['resume_optimization'], dependencies: [], parallelizable: true },
        { id_suffix: 'salary_bench', objective: '薪资基准分析', required_capabilities: ['salary_benchmark'], dependencies: [], parallelizable: true },
    ],
    travel: [
        { id_suffix: 'flight', objective: '搜索航班', required_capabilities: ['flight_search'], dependencies: [], parallelizable: true },
        { id_suffix: 'hotel', objective: '搜索住宿', required_capabilities: ['hotel_search'], dependencies: [], parallelizable: true },
        { id_suffix: 'transport', objective: '本地交通方案', required_capabilities: ['local_transport'], dependencies: [], parallelizable: true },
        { id_suffix: 'itinerary', objective: '行程规划', required_capabilities: ['itinerary_plan'], dependencies: ['flight', 'hotel', 'transport'], parallelizable: false },
    ],
    finance: [
        { id_suffix: 'analysis', objective: '金融数据分析', required_capabilities: ['finance_analysis', 'live_search'], dependencies: [], parallelizable: true },
    ],
    health: [
        { id_suffix: 'consult', objective: '健康咨询', required_capabilities: ['health_consult'], dependencies: [], parallelizable: true },
    ],
    legal: [
        { id_suffix: 'review', objective: '法务审查', required_capabilities: ['legal_review'], dependencies: [], parallelizable: true },
    ],
    education: [
        { id_suffix: 'course', objective: '课程推荐', required_capabilities: ['course_recommend'], dependencies: [], parallelizable: true },
    ],
    shopping: [
        { id_suffix: 'shopping_search', objective: '商品搜索', required_capabilities: ['shopping_search', 'live_search'], dependencies: [], parallelizable: true },
        { id_suffix: 'price', objective: '价格比较', required_capabilities: ['price_compare'], dependencies: [], parallelizable: true },
        { id_suffix: 'verify', objective: '多平台信息核验', required_capabilities: ['web_search'], dependencies: [], parallelizable: true },
    ],
    local_service: [
        { id_suffix: 'local_discovery', objective: '本地服务发现', required_capabilities: ['local_search', 'live_search'], dependencies: [], parallelizable: true },
        { id_suffix: 'local_verify', objective: '营业状态与评价核验', required_capabilities: ['web_search'], dependencies: [], parallelizable: true },
    ],
};

export function decomposeTasks(query: string, domain: AgentDomain): MarketplaceTask[] {
    const ts = Date.now();
    const detectedCaps = new Set(detectCapabilities(query));

    // Fixed acceptance scenario: always include 3 parallel tasks for recruitment.
    if (domain === 'recruitment') {
        return [
            {
                id: `task_job_sourcing_${ts}`,
                objective: '职位搜寻与匹配',
                required_capabilities: ['job_sourcing'],
                dependencies: [],
                parallelizable: true,
            },
            {
                id: `task_resume_optimization_${ts}`,
                objective: '简历优化',
                required_capabilities: ['resume_optimization'],
                dependencies: [],
                parallelizable: true,
            },
            {
                id: `task_salary_benchmark_${ts}`,
                objective: '薪资基准分析',
                required_capabilities: ['salary_benchmark'],
                dependencies: [],
                parallelizable: true,
            },
        ];
    }

    // Fixed acceptance scenario: always include 3 parallel tasks for travel.
    if (domain === 'travel') {
        const base: MarketplaceTask[] = [
            {
                id: `task_flight_${ts}`,
                objective: '航班查询',
                required_capabilities: ['flight_search'],
                dependencies: [],
                parallelizable: true,
            },
            {
                id: `task_hotel_${ts}`,
                objective: '酒店查询',
                required_capabilities: ['hotel_search'],
                dependencies: [],
                parallelizable: true,
            },
            {
                id: `task_local_transport_${ts}`,
                objective: '本地交通方案',
                required_capabilities: ['local_transport'],
                dependencies: [],
                parallelizable: true,
            },
        ];

        if (detectedCaps.has('itinerary_plan')) {
            base.push({
                id: `task_itinerary_${ts}`,
                objective: '行程规划',
                required_capabilities: ['itinerary_plan'],
                dependencies: [`task_flight_${ts}`, `task_hotel_${ts}`, `task_local_transport_${ts}`],
                parallelizable: false,
            });
        }

        return base;
    }

    const templates = DOMAIN_TASK_TEMPLATES[domain];
    if (!templates) {
        return [{
            id: `task_general_${ts}`,
            objective: query,
            required_capabilities: detectCapabilities(query),
            dependencies: [],
            parallelizable: true,
        }];
    }

    const matched = templates.filter(t =>
        t.required_capabilities.some(c => detectedCaps.has(c))
    );
    const final = matched.length > 0 ? matched : templates;

    return final.map(t => ({
        id: `task_${t.id_suffix}_${ts}`,
        objective: t.objective,
        required_capabilities: t.required_capabilities,
        dependencies: t.dependencies.map(d => `task_${d}_${ts}`),
        parallelizable: t.parallelizable,
    }));
}

// ============================================================================
// Scoring
// ============================================================================

function computeFitScore(agent: AgentDescriptor, query: DiscoveryQuery): number {
    if (query.required_capabilities.length === 0) return 0.5;
    const matched = query.required_capabilities.filter(c =>
        agent.capabilities.some(ac => ac === c || ac.includes(c) || c.includes(ac))
    );
    return matched.length / query.required_capabilities.length;
}

function computeReliabilityScore(agent: AgentDescriptor): number {
    if (!Number.isFinite(agent.success_rate)) return NaN;
    const successRate = Number(agent.success_rate);
    return Math.max(0, Math.min(1, successRate));
}

function computeFreshnessScore(agent: AgentDescriptor): number {
    if (agent.supports_realtime) return 1.0;
    if (agent.evidence_level === 'strong') return 0.8;
    if (agent.evidence_level === 'weak') return 0.5;
    return 0.3;
}

function computeLatencyScore(agent: AgentDescriptor): number {
    if (!Number.isFinite(agent.avg_latency_ms)) return NaN;
    const latency = Number(agent.avg_latency_ms);
    if (latency <= 500) return 1.0;
    if (latency <= 1500) return 0.85;
    if (latency <= 3000) return 0.7;
    if (latency <= 6000) return 0.5;
    return 0.3;
}

function computeCostScore(agent: AgentDescriptor): number {
    switch (agent.cost_tier) {
        case 'low': return 1.0;
        case 'mid': return 0.6;
        case 'high': return 0.3;
        default: return 0.7;
    }
}

function clampScore(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function computeTwinBoost(agent: AgentDescriptor, query: DiscoveryQuery): number {
    const ctx = query.digital_twin_context;
    if (!ctx) return 0;

    const priceVsQuality = Number(ctx.preferences?.price_vs_quality || 0);
    const preferredEvidence = ctx.preferences?.preferred_evidence_level || 'adaptive';
    const preferredLatency = ctx.preferences?.preferred_latency || 'balanced';
    const preferredDomains = Array.isArray(ctx.preferences?.preferred_domains)
        ? ctx.preferences.preferred_domains
        : [];
    const preferredTools = Array.isArray(ctx.preferences?.preferred_tools)
        ? ctx.preferences.preferred_tools
        : [];

    let costAlignment = 0;
    if (priceVsQuality <= -20) {
        costAlignment = agent.cost_tier === 'low' ? 0.06 : agent.cost_tier === 'mid' ? 0.02 : -0.06;
    } else if (priceVsQuality >= 20) {
        costAlignment = agent.cost_tier === 'high' ? 0.04 : agent.cost_tier === 'mid' ? 0.02 : -0.03;
    } else {
        costAlignment = agent.cost_tier === 'mid' ? 0.03 : agent.cost_tier === 'low' ? 0.01 : -0.01;
    }

    let evidenceAlignment = 0;
    if (preferredEvidence === 'strong') {
        evidenceAlignment = agent.evidence_level === 'strong' ? 0.04 : agent.evidence_level === 'weak' ? -0.02 : -0.04;
    } else if (preferredEvidence === 'weak') {
        evidenceAlignment = agent.evidence_level === 'weak' ? 0.03 : agent.evidence_level === 'none' ? 0.01 : -0.01;
    } else {
        evidenceAlignment = agent.evidence_level === 'strong' ? 0.02 : agent.evidence_level === 'weak' ? 0.01 : 0;
    }

    let latencyAlignment = 0;
    const latency = Number(agent.avg_latency_ms);
    if (Number.isFinite(latency)) {
        if (preferredLatency === 'fast') {
            latencyAlignment = latency <= 1500 ? 0.03 : latency <= 3000 ? 0.01 : -0.02;
        } else if (preferredLatency === 'quality') {
            latencyAlignment = latency <= 3500 ? 0.01 : 0;
        } else {
            latencyAlignment = latency <= 3000 ? 0.02 : latency <= 6000 ? 0.01 : -0.01;
        }
    }

    const domainAffinity = preferredDomains.length > 0
        ? (preferredDomains.some((domain) => agent.domains.includes(domain)) ? 0.05 : -0.03)
        : 0;

    const preferredToolBoost = preferredTools.some((tool) =>
        tool === agent.execute_ref || tool === agent.id || tool === agent.name
    ) ? 0.04 : 0;

    const completeness = Number(ctx.profile_completeness);
    const completenessFactor = Number.isFinite(completeness)
        ? clampScore(completeness / 100, 0.35, 1)
        : 1;

    const rawBoost = (costAlignment + evidenceAlignment + latencyAlignment + domainAffinity + preferredToolBoost) * completenessFactor;
    return Math.round(clampScore(rawBoost, -0.12, 0.18) * 100) / 100;
}

export function scoreCandidate(agent: AgentDescriptor, query: DiscoveryQuery): CandidateAgent {
    const fit = computeFitScore(agent, query);
    const reliability = computeReliabilityScore(agent);
    const freshness = computeFreshnessScore(agent);
    const latency = computeLatencyScore(agent);
    const cost = computeCostScore(agent);
    const twinBoost = computeTwinBoost(agent, query);
    const reliabilityKnown = Number.isFinite(reliability);
    const latencyKnown = Number.isFinite(latency);

    let weightedScore =
        SCORE_WEIGHTS.fit * fit +
        SCORE_WEIGHTS.freshness * freshness +
        SCORE_WEIGHTS.cost * cost;
    let weightTotal =
        SCORE_WEIGHTS.fit +
        SCORE_WEIGHTS.freshness +
        SCORE_WEIGHTS.cost;

    if (reliabilityKnown) {
        weightedScore += SCORE_WEIGHTS.reliability * reliability;
        weightTotal += SCORE_WEIGHTS.reliability;
    }
    if (latencyKnown) {
        weightedScore += SCORE_WEIGHTS.latency * latency;
        weightTotal += SCORE_WEIGHTS.latency;
    }

    const baseTotal = weightTotal > 0 ? weightedScore / weightTotal : 0;
    const total = clampScore(baseTotal + twinBoost, 0, 1);

    return {
        agent,
        fit_score: Math.round(fit * 100) / 100,
        reliability_score: reliabilityKnown ? Math.round(reliability * 100) / 100 : 0,
        reliability_known: reliabilityKnown,
        freshness_score: Math.round(freshness * 100) / 100,
        latency_score: latencyKnown ? Math.round(latency * 100) / 100 : 0,
        latency_known: latencyKnown,
        cost_score: Math.round(cost * 100) / 100,
        twin_boost: twinBoost,
        total_score: Math.round(total * 100) / 100,
    };
}

// ============================================================================
// Hard Filters
// ============================================================================

function hasCapabilityOverlap(agentCaps: string[], requiredCaps: string[]): boolean {
    if (requiredCaps.length === 0) return true;
    return requiredCaps.some(c =>
        agentCaps.some(ac => ac === c || ac.includes(c) || c.includes(ac))
    );
}

function parseEvidenceRateFromTags(tags: string[] | undefined): number | undefined {
    if (!tags) return undefined;
    const rateTag = tags.find(t => t.startsWith('evidence_rate:'));
    if (!rateTag) return undefined;
    const value = Number(rateTag.split(':')[1]);
    return Number.isFinite(value) ? value : undefined;
}

function checkCompliancePass(agent: AgentDescriptor): { pass: boolean; reason?: string } {
    const tags = agent.compliance_tags ?? [];
    for (const tag of tags) {
        if (COMPLIANCE_BLOCK_TAGS.has(tag)) {
            return { pass: false, reason: `compliance_pass: blocked_by_tag=${tag}` };
        }
    }
    return { pass: true };
}

function inferDomainsFromSkill(skill: Skill): AgentDomain[] {
    const text = `${skill.name} ${skill.description} ${skill.capabilities.join(' ')}`;
    const primary = detectDomain(text);
    return primary === 'general' ? ['general'] : [primary, 'general'];
}

function normalizeExternalDomain(value: unknown): AgentDomain | null {
    if (typeof value !== 'string') return null;
    const domain = value.trim().toLowerCase() as AgentDomain;
    if (domain in DOMAIN_KEYWORDS) return domain;
    return null;
}

function normalizeExternalEvidenceLevel(value: unknown): EvidenceLevel {
    if (value === 'strong' || value === 'weak' || value === 'none') return value;
    return 'weak';
}

function normalizeExternalCostTier(value: unknown): CostTier {
    if (value === 'low' || value === 'mid' || value === 'high') return value;
    return 'mid';
}

function normalizeExternalDescriptor(raw: any): AgentDescriptor | null {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.name) return null;

    const domains = Array.isArray(raw.domains)
        ? raw.domains.map(normalizeExternalDomain).filter(Boolean) as AgentDomain[]
        : [];

    const capabilities = Array.isArray(raw.capabilities)
        ? raw.capabilities.filter((c: unknown) => typeof c === 'string') as string[]
        : [];

    const successRate = Number.isFinite(raw.success_rate) ? Number(raw.success_rate) : undefined;
    const latency = Number.isFinite(raw.avg_latency_ms) ? Number(raw.avg_latency_ms) : undefined;
    const evidenceRate = Number.isFinite(raw.evidence_completeness_rate)
        ? Number(raw.evidence_completeness_rate)
        : Number.isFinite(raw.evidence_rate)
            ? Number(raw.evidence_rate)
            : Number.isFinite(raw?.metrics?.evidence_completeness_rate)
                ? Number(raw.metrics.evidence_completeness_rate)
                : undefined;

    const admitted =
        (successRate ?? 0) >= EXTERNAL_ADMISSION.min_success_rate &&
        (latency ?? Number.POSITIVE_INFINITY) <= EXTERNAL_ADMISSION.max_p95_latency_ms &&
        (evidenceRate ?? 0) >= EXTERNAL_ADMISSION.min_evidence_rate;

    const complianceTags: string[] = Array.isArray(raw.compliance_tags)
        ? raw.compliance_tags.filter((t: unknown) => typeof t === 'string')
        : [];
    complianceTags.push('external_feed');
    complianceTags.push(admitted ? 'external_admitted' : 'external_disabled');
    if (typeof evidenceRate === 'number') {
        complianceTags.push(`evidence_rate:${evidenceRate}`);
    }

    return {
        id: String(raw.id),
        name: String(raw.name),
        source: 'external_market',
        domains: domains.length > 0 ? domains : ['general'],
        capabilities: capabilities.length > 0 ? capabilities : ['general'],
        supports_realtime: Boolean(raw.supports_realtime),
        evidence_level: normalizeExternalEvidenceLevel(raw.evidence_level),
        supports_parallel: raw.supports_parallel !== false,
        avg_latency_ms: latency,
        success_rate: successRate,
        cost_tier: normalizeExternalCostTier(raw.cost_tier),
        compliance_tags: complianceTags,
        metrics_source: 'external',
        metrics_sample_size: Number.isFinite(raw?.metrics?.sample_size)
            ? Number(raw.metrics.sample_size)
            : Number.isFinite(raw?.sample_size)
                ? Number(raw.sample_size)
                : undefined,
        owner_id: typeof raw.owner_id === 'string' ? raw.owner_id : undefined,
        market_visibility: raw.market_visibility === 'private' ? 'private' : 'public',
        pricing_model: raw.pricing_model === 'free' ? 'free' : 'pay_per_use',
        price_per_use_cny: Number.isFinite(raw.price_per_use_cny) ? Math.max(0, Number(raw.price_per_use_cny)) : undefined,
        source_meta: {
            imported_via: 'external_feed',
            github_repo: typeof raw?.source_meta?.github_repo === 'string'
                ? raw.source_meta.github_repo
                : (typeof raw.github_repo === 'string' ? raw.github_repo : undefined),
            github_manifest_path: typeof raw?.source_meta?.github_manifest_path === 'string'
                ? raw.source_meta.github_manifest_path
                : (typeof raw.manifest_path === 'string' ? raw.manifest_path : undefined),
        },
        execute_ref: typeof raw.execute_ref === 'string' && raw.execute_ref.length > 0
            ? raw.execute_ref
            : String(raw.id),
    };
}

export function applyHardFilters(
    candidate: CandidateAgent,
    query: DiscoveryQuery,
    domain: AgentDomain
): CandidateAgent {
    // Domain match
    if (!candidate.agent.domains.includes(domain) && !candidate.agent.domains.includes('general')) {
        return { ...candidate, rejected: true, reject_reason: `domain_mismatch: agent domains [${candidate.agent.domains}] do not include ${domain}` };
    }

    // Capability match
    if (query.required_capabilities.length > 0) {
        if (!hasCapabilityOverlap(candidate.agent.capabilities, query.required_capabilities)) {
            return { ...candidate, rejected: true, reject_reason: `capability_mismatch: no overlap between [${candidate.agent.capabilities}] and [${query.required_capabilities}]` };
        }
    }

    // Compliance pass
    const compliance = checkCompliancePass(candidate.agent);
    if (!compliance.pass) {
        return { ...candidate, rejected: true, reject_reason: compliance.reason || 'compliance_pass: failed' };
    }

    // Realtime requirement
    const requireRealtime = query.require_realtime ?? false;
    if (requireRealtime && !candidate.agent.supports_realtime) {
        return { ...candidate, rejected: true, reject_reason: 'realtime_required: agent does not support realtime' };
    }

    // Evidence requirement (auto for high-risk domains)
    const requireEvidence = query.require_evidence ?? HIGH_RISK_DOMAINS.includes(domain);
    if (requireEvidence && candidate.agent.evidence_level === 'none') {
        return { ...candidate, rejected: true, reject_reason: 'evidence_required: agent has no evidence capability' };
    }

    // External market admission gate
    if (candidate.agent.source === 'external_market') {
        const sr = candidate.agent.success_rate ?? 0;
        const lat = candidate.agent.avg_latency_ms ?? Infinity;
        const evidenceRate = parseEvidenceRateFromTags(candidate.agent.compliance_tags);
        if (sr < EXTERNAL_ADMISSION.min_success_rate) {
            return { ...candidate, rejected: true, reject_reason: `external_admission: success_rate ${sr} < ${EXTERNAL_ADMISSION.min_success_rate}` };
        }
        if (lat > EXTERNAL_ADMISSION.max_p95_latency_ms) {
            return { ...candidate, rejected: true, reject_reason: `external_admission: latency ${lat}ms > ${EXTERNAL_ADMISSION.max_p95_latency_ms}ms` };
        }
        if ((evidenceRate ?? 0) < EXTERNAL_ADMISSION.min_evidence_rate) {
            return { ...candidate, rejected: true, reject_reason: `external_admission: evidence_rate ${(evidenceRate ?? 0)} < ${EXTERNAL_ADMISSION.min_evidence_rate}` };
        }
    }

    return candidate;
}

// ============================================================================
// Agent Marketplace Service
// ============================================================================

export class AgentMarketplaceService {
    private registeredAgents: AgentDescriptor[] = [];
    private internalSynced = false;
    private externalSynced = false;

    // ------------------------------------------------------------------
    // Agent Registration
    // ------------------------------------------------------------------

    registerAgent(descriptor: AgentDescriptor): void {
        // Deduplicate by id
        this.registeredAgents = this.registeredAgents.filter(a => a.id !== descriptor.id);
        this.registeredAgents.push(descriptor);
    }

    registerAgents(descriptors: AgentDescriptor[]): void {
        for (const d of descriptors) this.registerAgent(d);
    }

    getRegisteredAgents(): AgentDescriptor[] {
        return [...this.registeredAgents];
    }

    /**
     * Discover from internal sources (tool/skill/specialized).
     * Idempotent by default.
     */
    syncInternalSources(force: boolean = false): void {
        if (this.internalSynced && !force) return;

        // Tool Registry source
        const toolRegistry = getToolRegistry();
        const tools = toolRegistry.getAllToolsWithMeta();
        for (const tool of tools) {
            if (!tool.marketplace) continue;
            const runtimeStats = toolRegistry.getToolRuntimeStats(tool.name);
            const hasRuntime = Boolean(runtimeStats && runtimeStats.invocations > 0);
            this.registerAgent({
                id: `tool:${tool.name}`,
                name: tool.name,
                source: 'tool_registry',
                domains: tool.marketplace.domains,
                capabilities: tool.marketplace.capabilities,
                supports_realtime: tool.marketplace.supports_realtime,
                evidence_level: tool.marketplace.evidence_level,
                supports_parallel: tool.marketplace.supports_parallel,
                avg_latency_ms: hasRuntime ? runtimeStats?.avg_latency_ms : undefined,
                success_rate: hasRuntime ? runtimeStats?.success_rate : undefined,
                cost_tier: tool.marketplace.cost_tier,
                execute_ref: tool.name,
                compliance_tags: [
                    'internal',
                    hasRuntime ? 'metrics_runtime' : 'metrics_unknown',
                ],
                metrics_source: hasRuntime ? 'runtime' : 'unknown',
                metrics_sample_size: hasRuntime ? runtimeStats?.invocations : undefined,
            });
        }

        // Skill Registry source
        const skillRegistry = getSkillRegistry();
        const skills = skillRegistry.getAllSkills();
        for (const skill of skills) {
            const runtimeStats = skillRegistry.getSkillRuntimeStats(skill.id);
            const hasRuntime = Boolean(runtimeStats && runtimeStats.invocations > 0);
            this.registerAgent({
                id: `skill:${skill.id}`,
                name: skill.name,
                source: 'skill_registry',
                domains: inferDomainsFromSkill(skill),
                capabilities: skill.capabilities.length > 0 ? skill.capabilities : ['general'],
                supports_realtime: false,
                evidence_level: 'weak',
                supports_parallel: true,
                avg_latency_ms: hasRuntime ? runtimeStats?.avg_latency_ms : undefined,
                success_rate: hasRuntime ? runtimeStats?.success_rate : undefined,
                cost_tier: 'low',
                execute_ref: skill.id,
                compliance_tags: [
                    'internal',
                    hasRuntime ? 'metrics_runtime' : 'metrics_unknown',
                ],
                metrics_source: hasRuntime ? 'runtime' : 'unknown',
                metrics_sample_size: hasRuntime ? runtimeStats?.invocations : undefined,
            });
        }

        // Specialized source
        for (const [agentType] of Object.entries(SPECIALIZED_AGENTS)) {
            const type = agentType as SpecializedAgentType;
            const meta = SPECIALIZED_AGENT_META[type];
            if (!meta) continue;
            const runtimeStats = getSpecializedAgentRuntimeStats(type);
            const hasRuntime = Boolean(runtimeStats && runtimeStats.invocations > 0);
            this.registerAgent({
                id: `specialized:${type}`,
                name: type,
                source: 'specialized',
                domains: meta.domains,
                capabilities: meta.capabilities,
                supports_realtime: meta.supports_realtime,
                evidence_level: meta.evidence_level,
                supports_parallel: meta.supports_parallel,
                avg_latency_ms: hasRuntime ? runtimeStats?.avg_latency_ms : undefined,
                success_rate: hasRuntime ? runtimeStats?.success_rate : undefined,
                cost_tier: meta.cost_tier,
                execute_ref: type,
                compliance_tags: [
                    'internal',
                    hasRuntime ? 'metrics_runtime' : 'metrics_unknown',
                ],
                metrics_source: hasRuntime ? 'runtime' : 'unknown',
                metrics_sample_size: hasRuntime ? runtimeStats?.invocations : undefined,
            });
        }

        // LIX delivered & reviewed agents (external_market source)
        const lixAgents = lixAgentRegistryService.listApprovedAgents();
        for (const agent of lixAgents) {
            this.registerAgent({
                ...agent,
                compliance_tags: [
                    ...(agent.compliance_tags || []),
                    'lix_delivered',
                    'reviewed',
                ],
            });
        }

        this.internalSynced = true;
    }

    /**
     * Discover external-market agents from AGENT_MARKET_FEEDS.
     * Feed format: array of AgentDescriptor-like objects OR { agents: [] }.
     */
    async syncExternalFeeds(force: boolean = false): Promise<void> {
        if (this.externalSynced && !force) return;

        const feedEnv = (typeof process !== 'undefined' && process.env?.AGENT_MARKET_FEEDS
            ? process.env.AGENT_MARKET_FEEDS
            : '').trim();
        if (!feedEnv) {
            this.externalSynced = true;
            return;
        }

        const urls = feedEnv
            .split(',')
            .map(u => u.trim())
            .filter(Boolean);

        for (const url of urls) {
            try {
                const resp = await fetch(url);
                if (!resp.ok) {
                    console.warn(`[AgentMarketplace] External feed fetch failed: ${url} -> ${resp.status}`);
                    continue;
                }

                const json = await resp.json();
                const rawAgents = Array.isArray(json)
                    ? json
                    : Array.isArray(json?.agents)
                        ? json.agents
                        : [];

                for (const raw of rawAgents) {
                    const normalized = normalizeExternalDescriptor(raw);
                    if (normalized) this.registerAgent(normalized);
                }
            } catch (err) {
                console.warn(`[AgentMarketplace] External feed error: ${url}`, err);
            }
        }

        this.externalSynced = true;
    }

    async ensureCatalogReady(includeExternal: boolean = true): Promise<void> {
        this.syncInternalSources(false);
        if (includeExternal) {
            await this.syncExternalFeeds(false);
        }
    }

    // ------------------------------------------------------------------
    // Step 4: Discover
    // ------------------------------------------------------------------

    discoverAgents(query: DiscoveryQuery): DiscoveryResponse {
        const traceId = `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const domain = query.domain_hint ?? detectDomain(query.query);
        const maxCandidates = query.max_candidates ?? 10;

        // Score all registered agents
        const allCandidates = this.registeredAgents.map(agent =>
            applyHardFilters(scoreCandidate(agent, query), query, domain)
        );

        const rejected = allCandidates.filter(c => c.rejected);
        const accepted = allCandidates
            .filter(c => !c.rejected)
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, maxCandidates);

        const scoreBreakdown = allCandidates.map(c => ({
            agent_id: c.agent.id,
            fit_score: c.fit_score,
            reliability_score: c.reliability_score,
            reliability_known: c.reliability_known,
            freshness_score: c.freshness_score,
            latency_score: c.latency_score,
            latency_known: c.latency_known,
            cost_score: c.cost_score,
            twin_boost: c.twin_boost ?? 0,
            total_score: c.total_score,
        }));

        return {
            trace_id: traceId,
            candidates: accepted,
            rejected,
            score_breakdown: scoreBreakdown,
        };
    }

    // ------------------------------------------------------------------
    // Step 5: Select primary + fallbacks per task
    // ------------------------------------------------------------------

    selectForTask(
        task: MarketplaceTask,
        domain: AgentDomain,
        options?: { require_realtime?: boolean; require_evidence?: boolean }
    ): { primary_agent_id: string; fallback_agent_ids: string[] } | null {
        const dq: DiscoveryQuery = {
            query: task.objective,
            domain_hint: domain,
            required_capabilities: task.required_capabilities,
            require_realtime: options?.require_realtime,
            require_evidence: options?.require_evidence,
        };
        const discovery = this.discoverAgents(dq);
        if (discovery.candidates.length === 0) return null;

        const primary = discovery.candidates[0];
        const fallbacks = discovery.candidates
            .slice(1, 1 + MAX_FALLBACKS)
            .map(c => c.agent.id);

        return {
            primary_agent_id: primary.agent.id,
            fallback_agent_ids: fallbacks,
        };
    }

    // ------------------------------------------------------------------
    // Build Execution Plan (Steps 1-5)
    // ------------------------------------------------------------------

    buildExecutionPlan(query: string, domainHint?: AgentDomain): PlanBuildResult {
        const traceId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const domain = domainHint ?? detectDomain(query);
        const tasks = decomposeTasks(query, domain);

        const selections: AgentExecutionPlan['selections'] = [];
        const candidateMap: Record<string, CandidateAgent[]> = {};

        for (const task of tasks) {
            const requireRealtime =
                domain === 'travel' ||
                domain === 'finance' ||
                task.required_capabilities.includes('live_search') ||
                task.required_capabilities.includes('flight_search') ||
                task.required_capabilities.includes('hotel_search') ||
                task.required_capabilities.includes('local_transport');
            const requireEvidence = HIGH_RISK_DOMAINS.includes(domain);

            const dq: DiscoveryQuery = {
                query: task.objective,
                domain_hint: domain,
                required_capabilities: task.required_capabilities,
                require_realtime: requireRealtime,
                require_evidence: requireEvidence,
            };
            const discovery = this.discoverAgents(dq);
            candidateMap[task.id] = discovery.candidates;

            const sel = this.selectForTask(task, domain, {
                require_realtime: requireRealtime,
                require_evidence: requireEvidence,
            });
            if (sel) {
                selections.push({ task_id: task.id, ...sel });
            } else {
                // No agent found — still record with empty selection
                selections.push({ task_id: task.id, primary_agent_id: '', fallback_agent_ids: [] });
            }
        }

        return {
            plan: { trace_id: traceId, domain, tasks, selections },
            candidate_map: candidateMap,
        };
    }

    // ------------------------------------------------------------------
    // Step 6: Execute Plan (DAG-aware, parallel, with fallback)
    // ------------------------------------------------------------------

    async executePlan(
        plan: AgentExecutionPlan,
        candidateMap: Record<string, CandidateAgent[]>,
        executorFn: (agentId: string, task: MarketplaceTask) => Promise<AgentExecutionResult>
    ): Promise<ExecutionSummary> {
        const results: AgentExecutionResult[] = [];
        const selectedAgents: Array<{ task_id: string; agent_id: string }> = [];
        const fallbackUsed: Array<{ task_id: string; from_agent_id: string; to_agent_id: string }> = [];
        const completedTaskIds = new Set<string>();

        // Topological sort: tasks with no dependencies first
        const pending = [...plan.tasks];
        const taskMap = new Map(plan.tasks.map(t => [t.id, t]));
        const selectionMap = new Map(plan.selections.map(s => [s.task_id, s]));

        while (pending.length > 0) {
            // Find tasks whose dependencies are all completed
            const ready = pending.filter(t =>
                t.dependencies.every(dep => completedTaskIds.has(dep))
            );

            if (ready.length === 0 && pending.length > 0) {
                // Deadlock — force-run remaining
                ready.push(...pending.splice(0, MAX_CONCURRENCY));
            }

            // Remove ready tasks from pending
            for (const r of ready) {
                const idx = pending.indexOf(r);
                if (idx >= 0) pending.splice(idx, 1);
            }

            // Execute in batches respecting concurrency limit
            for (let i = 0; i < ready.length; i += MAX_CONCURRENCY) {
                const batch = ready.slice(i, i + MAX_CONCURRENCY);

                const batchResults = await Promise.all(
                    batch.map(async (task) => {
                        const sel = selectionMap.get(task.id);
                        if (!sel || !sel.primary_agent_id) {
                            return {
                                task_id: task.id,
                                agent_id: '',
                                success: false,
                                data: null,
                                error: 'no_agent_selected',
                                latency_ms: 0,
                            } as AgentExecutionResult;
                        }

                        // Try primary
                        let result = await this.executeWithTimeout(
                            executorFn, sel.primary_agent_id, task
                        );
                        selectedAgents.push({ task_id: task.id, agent_id: sel.primary_agent_id });

                        // Fallback if primary fails
                        if (!result.success && sel.fallback_agent_ids.length > 0) {
                            for (const fbId of sel.fallback_agent_ids) {
                                const fbResult = await this.executeWithTimeout(
                                    executorFn, fbId, task
                                );
                                if (fbResult.success) {
                                    fallbackUsed.push({
                                        task_id: task.id,
                                        from_agent_id: sel.primary_agent_id,
                                        to_agent_id: fbId,
                                    });
                                    result = fbResult;
                                    break;
                                }
                            }
                        }

                        return result;
                    })
                );

                results.push(...batchResults);
                for (const r of batchResults) {
                    completedTaskIds.add(r.task_id);
                }
            }
        }

        return {
            trace_id: plan.trace_id,
            selected_agents: selectedAgents,
            fallback_used: fallbackUsed,
            results,
        };
    }

    private async executeWithTimeout(
        executorFn: (agentId: string, task: MarketplaceTask) => Promise<AgentExecutionResult>,
        agentId: string,
        task: MarketplaceTask
    ): Promise<AgentExecutionResult> {
        const start = Date.now();
        try {
            const result = await Promise.race([
                executorFn(agentId, task),
                new Promise<AgentExecutionResult>((_, reject) =>
                    setTimeout(() => reject(new Error('TTL_EXCEEDED')), DEFAULT_TTL_MS)
                ),
            ]);
            return result;
        } catch (err) {
            return {
                task_id: task.id,
                agent_id: agentId,
                success: false,
                data: null,
                error: err instanceof Error ? err.message : String(err),
                latency_ms: Date.now() - start,
            };
        }
    }

    // ------------------------------------------------------------------
    // Step 7: Aggregate Results
    // ------------------------------------------------------------------

    aggregateResults(summary: ExecutionSummary): {
        success: boolean;
        combined_data: Record<string, any>;
        evidence: Array<{ source: string; url: string; fetched_at?: string }>;
        failed_tasks: string[];
        fallback_used: boolean;
    } {
        const combinedData: Record<string, any> = {};
        const allEvidence: Array<{ source: string; url: string; fetched_at?: string }> = [];
        const failedTasks: string[] = [];

        for (const r of summary.results) {
            if (r.success) {
                combinedData[r.task_id] = r.data;
                if (r.evidence) allEvidence.push(...r.evidence);
            } else {
                failedTasks.push(r.task_id);
            }
        }

        return {
            success: failedTasks.length === 0,
            combined_data: combinedData,
            evidence: allEvidence,
            failed_tasks: failedTasks,
            fallback_used: summary.fallback_used.length > 0,
        };
    }

    // ------------------------------------------------------------------
    // Convenience: Full pipeline (Steps 1-8)
    // ------------------------------------------------------------------

    async runFullPipeline(
        query: string,
        executorFn: (agentId: string, task: MarketplaceTask) => Promise<AgentExecutionResult>,
        domainHint?: AgentDomain
    ): Promise<{
        plan: AgentExecutionPlan;
        summary: ExecutionSummary;
        aggregated: ReturnType<AgentMarketplaceService['aggregateResults']>;
    }> {
        const { plan, candidate_map } = this.buildExecutionPlan(query, domainHint);
        const summary = await this.executePlan(plan, candidate_map, executorFn);
        const aggregated = this.aggregateResults(summary);
        return { plan, summary, aggregated };
    }
}

// ============================================================================
// Singleton
// ============================================================================

let marketplaceInstance: AgentMarketplaceService | null = null;

export function getAgentMarketplace(): AgentMarketplaceService {
    if (!marketplaceInstance) {
        marketplaceInstance = new AgentMarketplaceService();
    }
    return marketplaceInstance;
}

export async function ensureMarketplaceCatalogReady(includeExternal: boolean = true): Promise<AgentMarketplaceService> {
    const marketplace = getAgentMarketplace();
    await marketplace.ensureCatalogReady(includeExternal);
    return marketplace;
}

/** Reset singleton (for testing) */
export function resetAgentMarketplace(): void {
    marketplaceInstance = null;
}

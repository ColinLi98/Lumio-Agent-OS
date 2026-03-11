/**
 * OpenClaw Cloud Relay — Vercel Serverless Function
 *
 * POST /api/openclaw/chat
 *
 * Receives queries from the Lumi Android app and calls Gemini
 * with optional Digital Twin personalization and Bellman Decision Optimization.
 * If Gemini is rate-limited/unavailable, it falls back to OpenAI to avoid
 * empty returns while keeping the same OpenClaw cloud path.
 *
 * Accepts:
 *   - query: string            — user prompt
 *   - task_parts?: string[]    — optional explicit subtask parts for difficulty-aware routing
 *   - twin_state?: object      — Digital Twin L1/L2/L3 state for personalization
 *   - trajectory?: array       — historical trajectory points [{ts, value}]
 *   - thinking?: string        — reasoning level (off|low|medium|high)
 *   - api_key?: string         — optional Gemini API key override
 *
 * Returns:
 *   - success: boolean
 *   - reply: string
 *   - model: string
 *   - twin_applied: boolean
 *   - bellman_analysis?: object — Bellman optimization result (if decision query)
 *   - trace_id: string
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { getSkillsDiscoveryAdapter } from '../../services/skillsDiscoveryAdapter.js';

// ============================================================================
// Config
// ============================================================================

const GEMINI_MODEL = process.env.OPENCLAW_GEMINI_MODEL || 'gemini-3.1-pro-preview';
const GEMINI_MODEL_FALLBACKS = String(
    process.env.OPENCLAW_GEMINI_FALLBACK_MODELS ||
    'gemini-3-pro-preview,gemini-3-flash-preview,gemini-2.5-pro,gemini-2.5-flash'
)
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v !== GEMINI_MODEL);
const GEMINI_MODEL_CANDIDATES = [GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS];
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_MODEL = process.env.OPENCLAW_OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_API_BASE = 'https://api.openai.com/v1/responses';

// ============================================================================
// Types
// ============================================================================

interface TwinState {
    l1_risk_preference?: number;
    l1_value_anchor?: string;
    l1_spending_tier?: string;
    l2_context_load?: number;
    l2_active_threads?: number;
    l2_energy_level?: number;
    l2_app_category?: string;
    l3_stress_score?: number;
    l3_focus_score?: number;
    l3_polarity?: number;
    l3_dominant_emotion?: string;
    updated_at_ms?: number;
}

interface TrajectoryPoint {
    ts: number;
    value: number;
    label?: string;
}

interface ChatRequest {
    query: string;
    task_parts?: string[];
    twin_state?: TwinState;
    trajectory?: TrajectoryPoint[];
    thinking?: string;
    api_key?: string;
    openai_api_key?: string;
    response_language?: string;
}

interface ActionEval {
    action: string;
    bellman_score: number;
    immediate_reward: number;
    future_value: number;
    risk: number;
    scores: { asset: number; capability: number; wellbeing: number };
}

interface BellmanResult {
    optimal_action: string;
    myopic_action: string;
    discount_beta: number;
    discount_delta: number;
    effective_gamma: number;
    user_state: string;
    advisory_text: string;
    actions: ActionEval[];
}

type TaskDifficultyLevel = 'low' | 'medium' | 'high';
type ModelRoutingPolicy = 'adaptive' | 'strict-pro-for-high';

interface TaskPartAssessment {
    part: string;
    difficulty: TaskDifficultyLevel;
    score: number;
    reasons: string[];
}

interface ModelRoutingDecision {
    strategy: 'difficulty-adaptive';
    policy: ModelRoutingPolicy;
    overall_difficulty: TaskDifficultyLevel;
    part_assessments: TaskPartAssessment[];
    selected_candidates: string[];
    rationale: string[];
}

type ResponseStatusLite = 'success' | 'waiting_user' | 'partial' | 'error';

interface GateDecisionLite {
    gate: string;
    decision: 'passed' | 'blocked' | 'waiting_user';
    reason: string;
    next_action?: string;
    owner_agent?: string;
}

interface StrictEnvelopeLite {
    status: ResponseStatusLite;
    summary: string;
    next_action: string;
    owner_agent: string;
    gate_decisions: GateDecisionLite[];
    evidence: Array<{ source: string; url?: string; snippet?: string }>;
    link_audit?: LinkAuditSummary;
}

interface CloudTaskNode {
    id: string;
    title: string;
    required_capabilities: string[];
}

interface CloudTaskGraph {
    tasks: CloudTaskNode[];
    edges: Array<{ from: string; to: string }>;
    critical_path: string[];
    parallel_groups: string[][];
}

interface CloudSkillSelectionTrace {
    task_id: string;
    owner_agent: string;
    required_capability: string;
    primary_skill_id: string | null;
    fallback_skill_id: string | null;
    selection_reason: string;
    gate_snapshot: string;
    source: string | null;
    candidate_count: number;
    trace_id?: string;
}

interface CloudSubAgentAssignment {
    task_id: string;
    task_title: string;
    router_agent: string;
    execution_agent: string;
    validation_agent: string;
    selected_skill: string | null;
    fallback_skill: string | null;
}

interface LinkReachabilityResult {
    ok: boolean;
    status?: number;
    reason: string;
}

interface LinkAuditEntry {
    original_url: string;
    final_url: string;
    decision: 'verified' | 'replaced_verified' | 'replaced_unverified';
    reason: string;
    http_status?: number;
}

interface LinkAuditSummary {
    audited_count: number;
    verified_count: number;
    replaced_count: number;
    unverified_count: number;
    entries: LinkAuditEntry[];
}

// ============================================================================
// Digital Twin → System Prompt
// ============================================================================

function buildTwinSystemPrompt(twin: TwinState): string {
    const lines: string[] = [
        '你是 Lumi 键盘的 AI 助手。以下是当前用户的 Digital Twin 实时状态，请据此个性化你的回复：',
        '',
    ];

    // L1 Core State
    const risk = twin.l1_risk_preference ?? 0.5;
    const spending = twin.l1_spending_tier ?? '';
    const riskLabel = risk < 0.3 ? '保守' : risk > 0.7 ? '激进' : '平衡';
    lines.push(`【L1 核心画像】风险偏好: ${riskLabel}(${risk.toFixed(2)})`);
    if (spending) lines.push(`  消费档位: ${spending}`);

    // L2 Context State
    const ctxLoad = twin.l2_context_load ?? 0.0;
    const threads = twin.l2_active_threads ?? 0;
    const energy = twin.l2_energy_level ?? 0.5;
    const loadLabel = ctxLoad < 0.3 ? '轻松' : ctxLoad > 0.7 ? '繁忙' : '适中';
    const energyLabel = energy < 0.3 ? '低能量' : energy > 0.7 ? '高能量' : '正常';
    lines.push(`【L2 上下文】认知负荷: ${loadLabel}(${ctxLoad.toFixed(2)}), 活跃线程: ${threads}, 能量: ${energyLabel}`);

    // L3 Emotion State
    const stress = twin.l3_stress_score ?? 0;
    const focus = twin.l3_focus_score ?? 50;
    const polarity = twin.l3_polarity ?? 0;
    const emotion = twin.l3_dominant_emotion ?? 'neutral';
    const stressLabel = stress < 30 ? '低压' : stress > 70 ? '高压' : '中等';
    lines.push(`【L3 情绪】压力: ${stressLabel}(${stress}/100), 专注: ${focus}/100, 情感极性: ${polarity.toFixed(2)}, 主导情绪: ${emotion}`);

    // Adaptive instructions
    lines.push('', '个性化指引：');
    if (stress > 70) lines.push('- 用户压力较大，请用温和简洁的方式回复，避免复杂信息');
    if (focus < 30) lines.push('- 用户专注度低，请用要点列表格式回复，突出关键信息');
    if (energy < 0.3) lines.push('- 用户能量低，请简短回复，减少认知负担');
    if (ctxLoad > 0.7) lines.push('- 用户多任务繁忙，请直接给出结论，减少铺垫');
    if (risk > 0.7) lines.push('- 用户风险偏好高，可以推荐更大胆的方案');
    else if (risk < 0.3) lines.push('- 用户偏保守，请推荐稳妥安全的方案');
    if (polarity < -0.3) lines.push('- 用户情绪偏负面，请回复中带有鼓励和积极态度');

    return lines.join('\n');
}

// ============================================================================
// Bellman Decision Optimizer (TypeScript port)
// ============================================================================

const W_ASSET = 0.30;
const W_CAPABILITY = 0.35;
const W_WELLBEING = 0.35;

function computeDiscount(twin: TwinState): { beta: number; delta: number } {
    let deltaBase = 0.92;
    const anchor = twin.l1_value_anchor ?? '';
    if (anchor === 'security') deltaBase = 0.95;
    else if (anchor === 'experience') deltaBase = 0.88;

    const stress = twin.l3_stress_score ?? 0;
    const energy = twin.l2_energy_level ?? 0.5;
    const focus = twin.l3_focus_score ?? 50;
    const polarity = twin.l3_polarity ?? 0;

    const stressFactor = 1.0 - (stress / 100) * 0.4;
    const energyFactor = 0.6 + energy * 0.4;
    const focusFactor = 0.7 + (focus / 100) * 0.3;
    const polarityFactor = 0.85 + polarity * 0.15;

    let beta = stressFactor * energyFactor * focusFactor * polarityFactor;
    beta = Math.max(0.25, Math.min(1.0, beta));

    return { beta, delta: deltaBase };
}

function categorizeAction(action: string): Record<string, number> {
    const a = action.toLowerCase();
    const scores: Record<string, number> = { asset: 0, capability: 0, wellbeing: 0, risk: 0.5 };

    if (['save', 'budget', 'invest', 'cheap', '省', '存', '节'].some(w => a.includes(w))) {
        scores.asset = 0.6; scores.risk = 0.2;
    } else if (['buy', 'spend', 'expensive', '买', '花', '消费'].some(w => a.includes(w))) {
        scores.asset = -0.3; scores.risk = 0.6; scores.capability = 0.3;
    }
    if (['study', 'learn', 'practice', '学', '考', '深造', '研'].some(w => a.includes(w))) {
        scores.capability = 0.7; scores.wellbeing = -0.2; scores.risk = 0.15;
    } else if (['work', 'focus', 'build', '工作', '做', '创'].some(w => a.includes(w))) {
        scores.capability = 0.5; scores.wellbeing = -0.1;
    }
    if (['rest', 'break', 'relax', '休', '放松', '旅'].some(w => a.includes(w))) {
        scores.wellbeing = 0.7; scores.capability = -0.1; scores.risk = 0.1;
    }
    if (['wait', 'defer', 'delay', '等', '再', '先'].some(w => a.includes(w))) {
        scores.asset = 0.1; scores.risk = 0.1; scores.wellbeing = -0.1;
    }

    return scores;
}

function computeReward(twin: TwinState, scores: Record<string, number>): number {
    let asset = scores.asset ?? 0;
    let capability = scores.capability ?? 0;
    let wellbeing = scores.wellbeing ?? 0;
    const risk = scores.risk ?? 0.5;
    const stress = twin.l3_stress_score ?? 0;
    const riskPref = twin.l1_risk_preference ?? 0.5;

    if (stress > 60 && wellbeing > 0) wellbeing *= 1.0 + (stress - 60) / 100;

    const riskPenalty = (risk - riskPref) * 0.5;
    if (riskPenalty > 0) {
        asset -= riskPenalty * 0.3;
        wellbeing -= riskPenalty * 0.2;
    }

    return W_ASSET * asset + W_CAPABILITY * capability + W_WELLBEING * wellbeing;
}

function estimateFutureValue(twin: TwinState, trajectory?: TrajectoryPoint[]): number {
    const riskPref = twin.l1_risk_preference ?? 0.5;
    const ctxLoad = twin.l2_context_load ?? 0.5;
    const focus = twin.l3_focus_score ?? 50;
    const polarity = twin.l3_polarity ?? 0;
    const stress = twin.l3_stress_score ?? 0;

    const assetScore = Math.min(1, Math.max(0, 0.35 + riskPref * 0.3));
    const capScore = Math.min(1, Math.max(0, 0.4 + ctxLoad * 0.35 + (focus / 100) * 0.25));
    const wellScore = Math.min(1, Math.max(0, 0.5 + polarity * 0.22 - (stress / 100) * 0.28));

    let futureValue = assetScore * 0.3 + capScore * 0.35 + wellScore * 0.35;

    if (trajectory && trajectory.length >= 2) {
        const recent = trajectory.slice(-5).map(p => p.value);
        const trend = (recent[recent.length - 1] - recent[0]) / Math.max(1, recent.length - 1);
        futureValue += trend * 0.1;
    }

    return Math.min(1, Math.max(0, futureValue));
}

function stateLabel(twin: TwinState): string {
    const parts: string[] = [];
    const stress = twin.l3_stress_score ?? 0;
    const energy = twin.l2_energy_level ?? 0.5;
    const riskPref = twin.l1_risk_preference ?? 0.5;
    const polarity = twin.l3_polarity ?? 0;

    if (stress > 60) parts.push(`高压力(${stress}/100)`);
    else if (stress < 20) parts.push('放松');
    if (energy < 0.3) parts.push('低能量');
    else if (energy > 0.7) parts.push('高能量');
    if (polarity < -0.3) parts.push('情绪偏低');
    else if (polarity > 0.3) parts.push('情绪积极');
    if (riskPref < 0.3) parts.push('偏保守');
    else if (riskPref > 0.7) parts.push('偏冒険');
    return parts.length > 0 ? parts.join('、') : '状态正常';
}

function runBellmanOptimization(
    twin: TwinState,
    actions: string[],
    trajectory?: TrajectoryPoint[],
): BellmanResult {
    const { beta, delta } = computeDiscount(twin);
    const gamma = beta * delta;
    const futureV = estimateFutureValue(twin, trajectory);

    const evaluations: ActionEval[] = actions.map(action => {
        const scores = categorizeAction(action);
        const reward = computeReward(twin, scores);
        const bellmanScore = reward + gamma * futureV;

        return {
            action,
            bellman_score: +bellmanScore.toFixed(4),
            immediate_reward: +reward.toFixed(4),
            future_value: +futureV.toFixed(4),
            risk: +(scores.risk ?? 0.5).toFixed(2),
            scores: {
                asset: +(scores.asset ?? 0).toFixed(3),
                capability: +(scores.capability ?? 0).toFixed(3),
                wellbeing: +(scores.wellbeing ?? 0).toFixed(3),
            },
        };
    });

    evaluations.sort((a, b) => b.bellman_score - a.bellman_score);
    const optimal = evaluations[0];
    const myopic = evaluations.reduce((best, e) =>
        e.immediate_reward > best.immediate_reward ? e : best, evaluations[0]
    );

    // Build advisory text
    const lines = [
        '【Bellman 决策优化分析】',
        `用户状态: ${stateLabel(twin)}`,
        `折扣参数: β=${beta.toFixed(2)}(现时偏好), δ=${delta.toFixed(2)}(长期耐心)`,
        `有效折扣率: γ=${gamma.toFixed(2)}`,
        '', '决策评估排名 (Bellman Q值):',
    ];
    evaluations.forEach((ev, i) => {
        const marker = ev.action === optimal.action ? '★' : ' ';
        lines.push(`  ${marker} ${i + 1}. ${ev.action}: Q=${ev.bellman_score > 0 ? '+' : ''}${ev.bellman_score.toFixed(3)} (即时R=${ev.immediate_reward > 0 ? '+' : ''}${ev.immediate_reward.toFixed(3)}, 风险=${(ev.risk * 100).toFixed(0)}%)`);
    });

    if (optimal.action !== myopic.action) {
        lines.push('', `⚡ 短视选择: ${myopic.action}`, `🎯 最优选择: ${optimal.action}`);
    }

    lines.push('', '个性化建议:');
    if (beta < 0.5) lines.push('- ⚠️ 用户现时偏好强，可能过度重视眼前收益。建议温和引导关注长期影响。');
    if ((twin.l3_stress_score ?? 0) > 60) lines.push('- 用户压力较大，优先考虑能减压的选项。');
    if ((twin.l2_energy_level ?? 0.5) < 0.3) lines.push('- 用户能量低，建议选择认知负担小的选项。');

    return {
        optimal_action: optimal.action,
        myopic_action: myopic.action,
        discount_beta: +beta.toFixed(3),
        discount_delta: +delta.toFixed(3),
        effective_gamma: +gamma.toFixed(3),
        user_state: stateLabel(twin),
        advisory_text: lines.join('\n'),
        actions: evaluations,
    };
}

const HIGH_COMPLEXITY_TERMS = [
    'architecture', 'integrat', 'workflow', 'multi-agent', 'dag', 'orchestrat', 'contract',
    'compliance', 'regulation', 'legal', 'finance', 'medical', 'tax', 'audit',
    'research', 'analy', 'benchmark', 'optimiz', 'tradeoff', 'debug', 'refactor', 'deploy',
    '验证', '合规', '法务', '金融', '医疗', '架构', '编排', '多智能体', '任务拆解', '优化',
];

const MEDIUM_COMPLEXITY_TERMS = [
    'plan', 'compare', 'choose', 'route', 'book', 'estimate', 'timeline', 'risk',
    'requirements', 'constraint', 'evidence', 'fallback', 'supplier', 'market',
    '方案', '计划', '比较', '预算', '时限', '验收', '风险', '链接',
];

const LOW_COMPLEXITY_TERMS = [
    'translate', 'rewrite', 'summarize', 'paraphrase', 'spell', 'weather', 'hello',
    '翻译', '改写', '总结', '润色', '拼写', '问候',
];

const HIGH_RISK_POLICY_TERMS = [
    'medical', 'diagnosis', 'prescription', 'treatment', 'health',
    'legal', 'law', 'contract', 'litigation', 'compliance', 'regulation',
    'finance', 'investment', 'portfolio', 'tax', 'insurance', 'loan',
    '医疗', '诊断', '处方', '治疗', '健康',
    '法律', '法务', '合同', '诉讼', '合规', '监管',
    '金融', '投资', '税务', '保险', '贷款',
];

const GATE_R1 = 'gate_r1_require_constraints';
const GATE_R4 = 'gate_r4_evidence_required_for_success';
const GATE_R6 = 'gate_r6_no_empty_return';
const GATE_R7 = 'gate_r7_high_risk_execution_prohibited';
const GATE_R8 = 'gate_r8_data_authenticity_required';

const OWNER_REQUIREMENT_CLARIFIER = 'requirement_clarifier';
const OWNER_VALIDATION_AGENT = 'solution_validation_agent';
const OWNER_COMPLIANCE_GUARD = 'compliance_guard';
const OWNER_OPENCLAW_ORCHESTRATOR = 'openclaw_orchestrator';
const OWNER_CODEX_TEAM_LEADER = 'codex_team_leader';

const PLACEHOLDER_MARKERS = [
    'example.com',
    'placeholder',
    'dummy',
    'mock',
    'fake',
    'lorem ipsum',
    '[unverified-link-removed]',
];

const NEEDS_USER_TERMS = [
    'please provide',
    'need your',
    'could you share',
    'what is your',
    'which option do you prefer',
    '请提供',
    '请补充',
    '需要你提供',
    '请确认',
];

const URL_AUDIT_TIMEOUT_MS = Number(process.env.OPENCLAW_URL_AUDIT_TIMEOUT_MS || 3000);
const URL_AUDIT_MAX_COUNT = Number(process.env.OPENCLAW_URL_AUDIT_MAX_COUNT || 12);
const URL_AUDIT_USER_AGENT = process.env.OPENCLAW_URL_AUDIT_USER_AGENT || 'LumiOpenClawLinkVerifier/1.0';

function normalizeResponseStatusLite(raw: unknown): ResponseStatusLite | null {
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'success' || normalized === 'completed' || normalized === 'done') return 'success';
    if (normalized === 'waiting_user' || normalized === 'waiting' || normalized === 'needs_user') return 'waiting_user';
    if (normalized === 'partial') return 'partial';
    if (normalized === 'error' || normalized === 'failed' || normalized === 'failure') return 'error';
    return null;
}

function inferNeedsUserInput(text: string): boolean {
    const lower = text.toLowerCase();
    if (NEEDS_USER_TERMS.some((term) => lower.includes(term))) return true;
    const questionLines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.endsWith('?') || line.endsWith('？'));
    return questionLines.length > 0 && questionLines.some((line) => line.length <= 180);
}

function hasExecutablePlanContent(text: string): boolean {
    const normalized = String(text || '').trim();
    if (!normalized) return false;
    const stepLines = parseActionStepLines(normalized);
    const hasFinalOutput = /(final output|最终输出|summary|结果|结论)/i.test(normalized);
    const hasActionSection = /(action steps|执行步骤|实施步骤|执行计划)/i.test(normalized);
    if (stepLines.length >= 2 && (hasActionSection || hasFinalOutput)) return true;
    if (stepLines.length >= 3) return true;
    return false;
}

function buildProvisionalActionSteps(query: string): string[] {
    const parts = normalizeTaskParts(query).slice(0, 3);
    const primary = parts[0] || query.trim() || 'the requested goal';
    const secondary = parts.slice(1);
    const scopedSecondary = secondary.length > 0
        ? secondary.join('; ')
        : 'the main workstream and its key dependencies';
    return [
        `Define explicit assumptions and success criteria for "${primary}".`,
        `Execute the core workstreams in order: ${scopedSecondary}.`,
        'Validate outputs with verifiable evidence, then package a final deliverable with rollback options.',
    ];
}

function ensureExecutableStructuredReply(query: string, reply: string): string {
    const trimmed = String(reply || '').trim();
    if (!trimmed) return trimmed;
    if (hasExecutablePlanContent(trimmed) && /(final output|最终输出)/i.test(trimmed) && /(action steps|执行步骤)/i.test(trimmed)) {
        return trimmed;
    }
    const summary = extractSummaryLine(trimmed) || `Provisional executable solution for: ${query}`;
    const nextAction = extractNextAction(trimmed) || 'Execute Step 1 and report any blocked dependency.';
    const stepLines = parseActionStepLines(trimmed);
    const resolvedSteps = stepLines.length >= 2 ? stepLines : buildProvisionalActionSteps(query);
    const links = extractUrls(trimmed).slice(0, 4);
    const actionLinks = links.length > 0
        ? links.map((url, index) => `- Link ${index + 1}: ${url}`)
        : ['- No direct link returned by model; use verified official provider pages during execution.'];
    const evidenceLines = links.length > 0
        ? links.map((url, index) => `- Source ${index + 1}: ${url}`)
        : ['- Attach source URLs as each step is completed.'];
    return [
        'Final Output',
        summary,
        '',
        'Action Steps',
        ...resolvedSteps.map((step, index) => `${index + 1}. ${step}`),
        '',
        'Action Links',
        ...actionLinks,
        '',
        'Evidence',
        ...evidenceLines,
        '',
        'Risks',
        '- If constraints are incomplete, this plan uses conservative assumptions and may require refinement.',
        '',
        'Fallback',
        '- If any step is blocked, continue with reversible alternatives and collect missing constraints in parallel.',
        '',
        'Next Action',
        `- ${nextAction}`,
    ].join('\n');
}

function extractUrls(text: string): string[] {
    const regex = /https?:\/\/[^\s)\]]+/gi;
    const matches = text.match(regex) || [];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const raw of matches) {
        const cleaned = raw
            .trim()
            .replace(/[.,;:]+$/g, '')
            .trim()
            .replace('&amp;', '&');
        if (!cleaned) continue;
        if (!/^https?:\/\//i.test(cleaned)) continue;
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        urls.push(cleaned);
    }
    return urls;
}

function detectPlaceholderContent(text: string): boolean {
    const lower = text.toLowerCase();
    const urls = extractUrls(text);
    for (const url of urls) {
        try {
            const host = new URL(url).host.toLowerCase();
            if (host === 'example.com' || host.endsWith('.example.com')) return true;
            if (host.includes('placeholder') || host.includes('dummy') || host.includes('mock')) return true;
        } catch {
            // ignore malformed URL and continue keyword checks below
        }
    }

    const withoutUrls = lower.replace(/https?:\/\/[^\s)\]]+/gi, ' ');
    return PLACEHOLDER_MARKERS
        .filter((marker) => marker !== 'example.com')
        .some((marker) => withoutUrls.includes(marker));
}

function classifyUrlIntent(url: string, query: string): 'flight' | 'hotel' | 'food' | 'attraction' | 'transport' | 'general' {
    const corpus = `${url} ${query}`.toLowerCase();
    if (/(flight|air|airline|airport|ba\.com|easyjet|ryanair|skyscanner|google\.com\/travel\/flights)/.test(corpus)) {
        return 'flight';
    }
    if (/(hotel|stay|accommodation|resort|booking\.com|expedia|tripadvisor|handpickedhotels)/.test(corpus)) {
        return 'hotel';
    }
    if (/(restaurant|food|dining|eat|opentable|michelin)/.test(corpus)) {
        return 'food';
    }
    if (/(museum|attraction|things-to-do|visit|tour|landmark|tickets)/.test(corpus)) {
        return 'attraction';
    }
    if (/(bus|train|ferry|transport|transit|rail|metro|uber|taxi)/.test(corpus)) {
        return 'transport';
    }
    return 'general';
}

function extractLocationHint(query: string): string {
    const toMatch = query.match(/\bto\s+([A-Za-z][A-Za-z\s-]{1,40})/i);
    if (toMatch?.[1]) return toMatch[1].trim();
    const zhMatch = query.match(/到([\u4e00-\u9fa5A-Za-z\s-]{1,20})/);
    if (zhMatch?.[1]) return zhMatch[1].trim();
    return 'Jersey Channel Islands';
}

function buildFallbackCandidates(url: string, query: string): string[] {
    const locationHint = extractLocationHint(query);
    const intent = classifyUrlIntent(url, query);
    const encodedLocation = encodeURIComponent(locationHint);
    const host = (() => {
        try {
            return new URL(url).host || 'travel';
        } catch {
            return 'travel';
        }
    })();

    const generic = [
        `https://www.google.com/search?q=${encodeURIComponent(`${host} official site`)}`,
        `https://duckduckgo.com/?q=${encodeURIComponent(`${host} official site`)}`,
    ];

    if (intent === 'flight') {
        return [
            'https://www.google.com/travel/flights',
            `https://www.google.com/search?q=${encodeURIComponent(`${locationHint} flights`)}`,
            ...generic,
        ];
    }
    if (intent === 'hotel') {
        return [
            `https://www.booking.com/searchresults.html?ss=${encodedLocation}`,
            `https://www.google.com/search?q=${encodeURIComponent(`${locationHint} hotels booking`)}`,
            ...generic,
        ];
    }
    if (intent === 'food') {
        return [
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locationHint} restaurant`)}`,
            `https://www.google.com/search?q=${encodeURIComponent(`${locationHint} best restaurants`)}`,
            ...generic,
        ];
    }
    if (intent === 'attraction') {
        return [
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locationHint} attractions`)}`,
            `https://www.google.com/search?q=${encodeURIComponent(`${locationHint} things to do`)}`,
            ...generic,
        ];
    }
    if (intent === 'transport') {
        return [
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locationHint} transport`)}`,
            `https://www.google.com/search?q=${encodeURIComponent(`${locationHint} public transport`)}`,
            ...generic,
        ];
    }
    return generic;
}

function isHttpSuccess(status: number): boolean {
    return status >= 200 && status < 400;
}

async function probeUrlReachability(url: string): Promise<LinkReachabilityResult> {
    const methods: Array<'HEAD' | 'GET'> = ['HEAD', 'GET'];
    for (const method of methods) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), URL_AUDIT_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                method,
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent': URL_AUDIT_USER_AGENT,
                    Accept: '*/*',
                },
            });
            clearTimeout(timeout);
            if (isHttpSuccess(response.status)) {
                return { ok: true, status: response.status, reason: `reachable_${method.toLowerCase()}` };
            }
            if (method === 'HEAD' && response.status === 405) {
                continue;
            }
            return { ok: false, status: response.status, reason: `http_${response.status}` };
        } catch (error) {
            clearTimeout(timeout);
            if (method === 'HEAD') {
                continue;
            }
            const reason = error instanceof Error ? error.name || error.message : 'network_error';
            return { ok: false, reason };
        }
    }
    return { ok: false, reason: 'unreachable' };
}

function replaceUrlOccurrences(text: string, originalUrl: string, replacementUrl: string): string {
    if (!originalUrl || originalUrl === replacementUrl) return text;
    return text.split(originalUrl).join(replacementUrl);
}

async function sanitizeResponseLinks(query: string, text: string): Promise<{ sanitized: string; audit: LinkAuditSummary }> {
    const urls = extractUrls(text).slice(0, URL_AUDIT_MAX_COUNT);
    if (urls.length === 0) {
        return {
            sanitized: text,
            audit: {
                audited_count: 0,
                verified_count: 0,
                replaced_count: 0,
                unverified_count: 0,
                entries: [],
            },
        };
    }

    let sanitized = text;
    const entries: LinkAuditEntry[] = [];

    for (const originalUrl of urls) {
        const probe = await probeUrlReachability(originalUrl);
        if (probe.ok) {
            entries.push({
                original_url: originalUrl,
                final_url: originalUrl,
                decision: 'verified',
                reason: probe.reason,
                http_status: probe.status,
            });
            continue;
        }

        const candidates = buildFallbackCandidates(originalUrl, query);
        let replaced = false;
        for (const candidate of candidates) {
            if (!candidate || candidate === originalUrl) continue;
            const candidateProbe = await probeUrlReachability(candidate);
            if (!candidateProbe.ok) continue;
            sanitized = replaceUrlOccurrences(sanitized, originalUrl, candidate);
            entries.push({
                original_url: originalUrl,
                final_url: candidate,
                decision: 'replaced_verified',
                reason: `original_${probe.reason}_replaced`,
                http_status: candidateProbe.status,
            });
            replaced = true;
            break;
        }

        if (!replaced) {
            const fallback = candidates[0] || `https://www.google.com/search?q=${encodeURIComponent(originalUrl)}`;
            sanitized = replaceUrlOccurrences(sanitized, originalUrl, fallback);
            entries.push({
                original_url: originalUrl,
                final_url: fallback,
                decision: 'replaced_unverified',
                reason: `original_${probe.reason}_fallback_unverified`,
                http_status: probe.status,
            });
        }
    }

    const verifiedCount = entries.filter((entry) => entry.decision === 'verified').length;
    const replacedVerifiedCount = entries.filter((entry) => entry.decision === 'replaced_verified').length;
    const unverifiedCount = entries.filter((entry) => entry.decision === 'replaced_unverified').length;

    return {
        sanitized,
        audit: {
            audited_count: urls.length,
            verified_count: verifiedCount,
            replaced_count: replacedVerifiedCount,
            unverified_count: unverifiedCount,
            entries,
        },
    };
}

function extractSummaryLine(reply: string): string {
    const compact = reply
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (compact.length === 0) return '';
    const summaryHeader = compact.find((line) => /^(final output|summary|result|输出|结论)\b/i.test(line));
    if (summaryHeader) {
        const idx = compact.indexOf(summaryHeader);
        const next = compact[idx + 1];
        if (next) return next.slice(0, 320);
    }
    return compact[0].slice(0, 320);
}

function extractNextAction(reply: string): string {
    const lines = reply
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    for (let i = 0; i < lines.length; i += 1) {
        if (/^next action[:：]?/i.test(lines[i])) {
            const sameLine = lines[i].replace(/^next action[:：]?\s*/i, '').trim();
            if (sameLine) return sameLine.slice(0, 220);
            const nextLine = lines[i + 1]?.replace(/^[-*•]\s*/, '').trim();
            if (nextLine) return nextLine.slice(0, 220);
        }
    }
    const firstQuestion = lines.find((line) => line.endsWith('?') || line.endsWith('？'));
    if (firstQuestion) return firstQuestion.slice(0, 220);
    const actionableLine = lines.find((line) => /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line));
    if (actionableLine) {
        return actionableLine
            .replace(/^[-*•]\s+/, '')
            .replace(/^\d+\.\s+/, '')
            .slice(0, 220);
    }
    return '';
}

function inferStatusLite(success: boolean, reply: string, explicitStatus?: unknown): ResponseStatusLite {
    const normalizedExplicit = normalizeResponseStatusLite(explicitStatus);
    if (normalizedExplicit) return normalizedExplicit;
    const trimmed = reply.trim();
    if (!trimmed) return 'error';
    const hasExecutablePlan = hasExecutablePlanContent(trimmed);
    if (inferNeedsUserInput(trimmed)) return hasExecutablePlan ? 'partial' : 'waiting_user';
    if (!success) return 'error';
    if (/provisional|interim|fallback|temporary|待确认|临时/i.test(trimmed)) return 'partial';
    return 'success';
}

function inferOwnerAgent(status: ResponseStatusLite): string {
    switch (status) {
        case 'waiting_user':
            return OWNER_REQUIREMENT_CLARIFIER;
        case 'error':
            return OWNER_VALIDATION_AGENT;
        case 'partial':
            return OWNER_OPENCLAW_ORCHESTRATOR;
        case 'success':
        default:
            return OWNER_CODEX_TEAM_LEADER;
    }
}

function buildStrictGateDecisions(
    query: string,
    status: ResponseStatusLite,
    summary: string,
    evidence: Array<{ source: string; url?: string; snippet?: string }>,
    nextAction: string,
    linkAudit?: LinkAuditSummary,
): GateDecisionLite[] {
    const lowerQuery = query.toLowerCase();
    const lowerSummary = summary.toLowerCase();
    const hasHighRiskSignal = HIGH_RISK_POLICY_TERMS.some((term) => lowerQuery.includes(term));
    const irreversibleSignal = [
        'execute trade',
        'buy now',
        'sign contract',
        'transfer funds',
        'prescribe',
        '诊断结论',
        '自动下单',
        '自动签约',
    ].some((term) => lowerSummary.includes(term));

    const hasPlaceholder = detectPlaceholderContent(summary);
    const hasEvidenceUrl = evidence.some((row) => (row.url || '').length > 0);
    const hasUnverifiedLinkReplacement = (linkAudit?.unverified_count || 0) > 0;
    const nonEmpty = summary.trim().length > 0;
    const needsUserConstraint = inferNeedsUserInput(summary);
    const hasExecutablePlan = hasExecutablePlanContent(summary);
    const r1Waiting = needsUserConstraint && !hasExecutablePlan;

    const r1Decision: GateDecisionLite = {
        gate: GATE_R1,
        decision: r1Waiting ? 'waiting_user' : 'passed',
        reason: r1Waiting
            ? 'missing_user_constraints_or_confirmation'
            : (needsUserConstraint ? 'provisional_plan_with_assumptions' : 'constraints_satisfied_for_current_step'),
        next_action: r1Waiting
            ? (nextAction || 'Provide the missing constraint so execution can continue.')
            : undefined,
        owner_agent: OWNER_REQUIREMENT_CLARIFIER,
    };

    const r4Decision: GateDecisionLite = {
        gate: GATE_R4,
        decision: status === 'success' && !hasEvidenceUrl ? 'blocked' : 'passed',
        reason: status === 'success' && !hasEvidenceUrl ? 'success_without_verifiable_evidence' : 'evidence_requirement_satisfied',
        next_action: status === 'success' && !hasEvidenceUrl
            ? 'Attach at least one verifiable source URL before marking success.'
            : undefined,
        owner_agent: OWNER_VALIDATION_AGENT,
    };

    const r6Decision: GateDecisionLite = {
        gate: GATE_R6,
        decision: nonEmpty ? 'passed' : 'blocked',
        reason: nonEmpty ? 'non_empty_response' : 'empty_response_blocked',
        next_action: nonEmpty ? undefined : 'Return a concrete summary and next action.',
        owner_agent: OWNER_CODEX_TEAM_LEADER,
    };

    const r7Decision: GateDecisionLite = {
        gate: GATE_R7,
        decision: hasHighRiskSignal && irreversibleSignal ? 'blocked' : 'passed',
        reason: hasHighRiskSignal && irreversibleSignal
            ? 'high_risk_irreversible_action_blocked'
            : 'high_risk_boundary_respected',
        next_action: hasHighRiskSignal && irreversibleSignal
            ? 'Switch to decision-support mode and provide reversible options only.'
            : undefined,
        owner_agent: OWNER_COMPLIANCE_GUARD,
    };

    const r8Decision: GateDecisionLite = {
        gate: GATE_R8,
        decision: hasPlaceholder || hasUnverifiedLinkReplacement ? 'blocked' : 'passed',
        reason: hasPlaceholder
            ? 'placeholder_or_synthetic_content_detected'
            : hasUnverifiedLinkReplacement
                ? 'unreachable_or_blocked_links_detected'
                : 'authenticity_checks_passed',
        next_action: hasPlaceholder || hasUnverifiedLinkReplacement
            ? 'Replace invalid links with verified public links before marking success.'
            : undefined,
        owner_agent: OWNER_VALIDATION_AGENT,
    };

    return [r1Decision, r4Decision, r6Decision, r7Decision, r8Decision];
}

function buildStrictEnvelope(
    query: string,
    result: {
        success: boolean;
        reply?: string;
        model?: string;
        error?: string;
        source?: string;
        status?: unknown;
        link_audit?: LinkAuditSummary;
    },
): StrictEnvelopeLite {
    const rawReply = String(result.reply || '').trim();
    const rawError = String(result.error || '').trim();
    const summaryBase = rawReply || rawError || 'No empty return is allowed. The upstream model did not provide content.';
    const status = inferStatusLite(result.success, summaryBase, result.status);
    const summaryLine = extractSummaryLine(summaryBase);
    const summary = summaryLine || summaryBase;
    const extractedNextAction = extractNextAction(summaryBase);
    const nextAction = extractedNextAction || (
        status === 'waiting_user'
            ? 'Provide the missing detail requested in the clarification question.'
            : status === 'error'
                ? 'Retry with clearer constraints or switch to fallback retrieval.'
                : 'Review the plan and execute step 1.'
    );

    const urls = extractUrls(summaryBase);
    const urlEvidence = urls.map((url) => {
        let source = 'external_source';
        try {
            source = new URL(url).host || source;
        } catch {
            source = 'external_source';
        }
        return { source, url };
    });
    const modelEvidence = result.model ? [{ source: 'model', snippet: result.model }] : [];
    const providerEvidence = result.source ? [{ source: 'provider', snippet: result.source }] : [];
    const evidence = [...urlEvidence, ...modelEvidence, ...providerEvidence].slice(0, 12);

    const gateDecisions = buildStrictGateDecisions(
        query,
        status,
        summaryBase,
        evidence,
        nextAction,
        result.link_audit,
    );

    const blockedGate = gateDecisions.find((gate) => gate.decision === 'blocked');
    const effectiveStatus: ResponseStatusLite = (
        status === 'success' && blockedGate
            ? 'partial'
            : status
    );

    return {
        status: effectiveStatus,
        summary,
        next_action: nextAction,
        owner_agent: inferOwnerAgent(effectiveStatus),
        gate_decisions: gateDecisions,
        evidence,
        link_audit: result.link_audit,
    };
}

function dedupeModels(models: string[]): string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const model of models) {
        const trimmed = String(model || '').trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        ordered.push(trimmed);
    }
    return ordered;
}

function normalizeTaskParts(query: string, explicitParts?: string[]): string[] {
    const normalizedExplicit = (explicitParts || [])
        .map((part) => String(part || '').trim())
        .filter((part) => part.length > 0);
    if (normalizedExplicit.length > 0) return normalizedExplicit.slice(0, 12);

    const seeded = query
        .replace(/\r/g, '\n')
        .replace(/[；;]+/g, '\n')
        .replace(/[。!?！？]+/g, '\n')
        .replace(/\bthen\b/gi, '\n')
        .replace(/\band\b/gi, '\n')
        .replace(/然后|并且|以及|接着|同时/g, '\n');

    const parts = seeded
        .split(/\n+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    if (parts.length > 0) return parts.slice(0, 12);
    return [query.trim()].filter((part) => part.length > 0);
}

function assessTaskPartDifficulty(part: string): TaskPartAssessment {
    const reasons: string[] = [];
    const lower = part.toLowerCase();
    let score = 0;

    if (part.length > 220) {
        score += 3;
        reasons.push('long_part');
    } else if (part.length > 120) {
        score += 2;
        reasons.push('medium_length');
    } else if (part.length > 60) {
        score += 1;
        reasons.push('short_length');
    }

    const highMatches = HIGH_COMPLEXITY_TERMS.filter((term) => lower.includes(term)).length;
    const mediumMatches = MEDIUM_COMPLEXITY_TERMS.filter((term) => lower.includes(term)).length;
    const lowMatches = LOW_COMPLEXITY_TERMS.filter((term) => lower.includes(term)).length;

    if (highMatches > 0) {
        score += Math.min(6, highMatches * 2);
        reasons.push(`high_signals:${highMatches}`);
    }
    if (mediumMatches > 0) {
        score += Math.min(3, mediumMatches);
        reasons.push(`medium_signals:${mediumMatches}`);
    }
    if (lowMatches > 0 && highMatches === 0) {
        score = Math.max(0, score - 1);
        reasons.push(`low_signals:${lowMatches}`);
    }

    if (/(https?:\/\/|www\.)/i.test(part)) {
        score += 1;
        reasons.push('contains_links');
    }

    const checklistLike = (part.match(/[,，、]/g) || []).length;
    if (checklistLike >= 3) {
        score += 1;
        reasons.push('multi_items');
    }

    const difficulty: TaskDifficultyLevel = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';

    return {
        part,
        difficulty,
        score,
        reasons,
    };
}

function buildAdaptiveModelRouting(
    query: string,
    thinking: string,
    explicitParts?: string[],
): ModelRoutingDecision {
    const parts = normalizeTaskParts(query, explicitParts);
    const partAssessments = parts.map((part) => assessTaskPartDifficulty(part));

    const hasHigh = partAssessments.some((assessment) => assessment.difficulty === 'high');
    const hasMedium = partAssessments.some((assessment) => assessment.difficulty === 'medium');
    const hasLow = partAssessments.some((assessment) => assessment.difficulty === 'low');

    let overallDifficulty: TaskDifficultyLevel = hasHigh ? 'high' : hasMedium ? 'medium' : 'low';
    if (overallDifficulty === 'low' && parts.length >= 4) {
        overallDifficulty = 'medium';
    }
    if (thinking === 'high' && overallDifficulty === 'low') {
        overallDifficulty = 'medium';
    }
    if (thinking === 'high' && hasMedium) {
        overallDifficulty = 'high';
    }

    const baseCandidates = dedupeModels(GEMINI_MODEL_CANDIDATES);
    const proModels = baseCandidates.filter((model) => model.includes('pro'));
    const flashModels = baseCandidates.filter((model) => model.includes('flash'));
    const otherModels = baseCandidates.filter((model) => !model.includes('pro') && !model.includes('flash'));

    let ordered: string[] = [];
    const rationale: string[] = [];
    if (overallDifficulty === 'high') {
        ordered = [...proModels, ...flashModels, ...otherModels];
        rationale.push('high_complexity_prefers_pro_models');
    } else if (overallDifficulty === 'medium') {
        ordered = [...proModels.slice(0, 1), ...flashModels, ...proModels.slice(1), ...otherModels];
        rationale.push('medium_complexity_balanced_route');
    } else {
        ordered = [...flashModels, ...proModels, ...otherModels];
        rationale.push('low_complexity_prefers_fast_flash_models');
    }

    if (hasHigh && hasLow && proModels.length > 0 && flashModels.length > 0) {
        ordered = [proModels[0], flashModels[0], ...ordered];
        rationale.push('mixed_parts_interleaving_pro_and_flash');
    }

    if ((thinking === 'off' || thinking === 'low') && flashModels.length > 0) {
        ordered = [...flashModels, ...ordered];
        rationale.push('thinking_low_bias_to_latency');
    }
    if (thinking === 'high' && proModels.length > 0) {
        ordered = [...proModels, ...ordered];
        rationale.push('thinking_high_bias_to_reasoning_depth');
    }

    let selectedCandidates = dedupeModels(ordered);
    const corpus = `${query}\n${parts.join('\n')}`.toLowerCase();
    const highRiskHits = HIGH_RISK_POLICY_TERMS.filter((term) => corpus.includes(term));
    const autoPolicy: ModelRoutingPolicy = (
        overallDifficulty === 'high' &&
        (highRiskHits.length > 0 || thinking === 'high')
    ) ? 'strict-pro-for-high' : 'adaptive';

    if (autoPolicy === 'strict-pro-for-high' && overallDifficulty === 'high') {
        selectedCandidates = proModels.length > 0 ? dedupeModels(proModels) : selectedCandidates;
        rationale.push(proModels.length > 0
            ? 'auto_policy_strict_pro_for_high_enforced'
            : 'auto_policy_strict_pro_for_high_fallback_to_adaptive');
        if (highRiskHits.length > 0) {
            rationale.push(`high_risk_signals:${highRiskHits.length}`);
        }
    } else {
        rationale.push('auto_policy_adaptive');
    }

    return {
        strategy: 'difficulty-adaptive',
        policy: autoPolicy,
        overall_difficulty: overallDifficulty,
        part_assessments: partAssessments,
        selected_candidates: selectedCandidates.length > 0 ? selectedCandidates : baseCandidates,
        rationale,
    };
}

function parseActionStepLines(reply: string): string[] {
    if (!reply) return [];
    const lines = reply
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0) return [];

    let inActionSection = false;
    const collected: string[] = [];
    for (const line of lines) {
        if (/^action steps[:：]?/i.test(line) || /^执行步骤[:：]?/.test(line)) {
            inActionSection = true;
            continue;
        }
        if (inActionSection && /^(action links|evidence|risks|fallback|next action|最终输出|证据|风险|回退|下一步)[:：]?/i.test(line)) {
            break;
        }
        const isStep = /^(\d+[\.\)]\s+|[-*•]\s+)/.test(line);
        if (!isStep && !inActionSection) continue;
        const normalized = line
            .replace(/^(\d+[\.\)]\s+|[-*•]\s+)/, '')
            .trim();
        if (!normalized || normalized.length < 3) continue;
        collected.push(normalized);
    }
    return Array.from(new Set(collected)).slice(0, 8);
}

function inferTaskCapabilities(taskTitle: string, query: string): string[] {
    const text = `${taskTitle} ${query}`.toLowerCase();
    if (/(flight|airfare|airline|airport|航班|机票)/.test(text)) {
        return ['flight_search', 'live_search'];
    }
    if (/(hotel|stay|accommodation|住宿|酒店)/.test(text)) {
        return ['hotel_search', 'live_search'];
    }
    if (/(restaurant|dining|food|餐厅|美食)/.test(text)) {
        return ['restaurant_search', 'local_search'];
    }
    if (/(attraction|museum|landmark|things to do|景点|博物馆)/.test(text)) {
        return ['attraction_search', 'local_search'];
    }
    if (/(transport|bus|train|ferry|taxi|交通|公交|地铁|火车)/.test(text)) {
        return ['local_transport', 'live_search'];
    }
    if (/(itinerary|schedule|plan|summary|deliver|行程|计划|整合|汇总)/.test(text)) {
        return ['itinerary_plan', 'web_search'];
    }
    if (/(medical|health|legal|law|finance|investment|医疗|法律|金融|投资)/.test(text)) {
        return ['decision_support', 'web_search'];
    }
    return ['web_search', 'live_search'];
}

function shouldUseHubAndSpokeGraph(tasks: CloudTaskNode[]): boolean {
    if (tasks.length < 3) return false;
    const finalTitle = tasks[tasks.length - 1]?.title?.toLowerCase() || '';
    return /(final|summary|itinerary|delivery|deliverable|汇总|最终|行程整合|交付)/.test(finalTitle);
}

function buildCloudTaskGraph(query: string, explicitParts?: string[], reply?: string): CloudTaskGraph {
    const stepLines = parseActionStepLines(reply || '');
    const seedParts = stepLines.length >= 2
        ? stepLines
        : normalizeTaskParts(query, explicitParts);
    const uniqueParts = Array.from(
        new Set(
            seedParts
                .map((part) => part.trim())
                .filter((part) => part.length > 0)
        )
    ).slice(0, 8);
    const normalizedParts = uniqueParts.length > 0
        ? uniqueParts
        : [query.trim()].filter(Boolean);
    const tasks: CloudTaskNode[] = normalizedParts.map((title, index) => ({
        id: `task_${index + 1}`,
        title,
        required_capabilities: inferTaskCapabilities(title, query),
    }));

    if (tasks.length === 0) {
        tasks.push({
            id: 'task_1',
            title: query,
            required_capabilities: ['web_search'],
        });
    }

    const edges: Array<{ from: string; to: string }> = [];
    let criticalPath = tasks.map((task) => task.id);
    let parallelGroups: string[][] = [];
    if (shouldUseHubAndSpokeGraph(tasks)) {
        const finalTaskId = tasks[tasks.length - 1].id;
        const upstream = tasks.slice(0, -1).map((task) => task.id);
        for (const id of upstream) {
            edges.push({ from: id, to: finalTaskId });
        }
        criticalPath = [upstream[0], finalTaskId].filter(Boolean);
        parallelGroups = upstream.length > 1 ? [upstream] : [];
    } else {
        for (let i = 0; i < tasks.length - 1; i += 1) {
            edges.push({ from: tasks[i].id, to: tasks[i + 1].id });
        }
        if (tasks.length > 2) {
            parallelGroups = [tasks.slice(0, tasks.length - 1).map((task) => task.id)];
        }
    }

    return {
        tasks,
        edges,
        critical_path: criticalPath,
        parallel_groups: parallelGroups,
    };
}

async function buildCloudSkillSelectionTrace(
    query: string,
    tasks: CloudTaskNode[],
): Promise<CloudSkillSelectionTrace[]> {
    const adapter = getSkillsDiscoveryAdapter();
    const traces: CloudSkillSelectionTrace[] = [];
    for (const task of tasks.slice(0, 8)) {
        const requiredCaps = Array.from(new Set(task.required_capabilities)).slice(0, 4);
        try {
            const discovery = await adapter.discoverSkills(
                `${query}\n${task.title}`,
                requiredCaps,
                {
                    externalSearchMode: 'auto',
                    minApproved: 2,
                }
            );
            const approved = discovery.approvedCandidates || [];
            const primary = approved[0];
            const fallback = approved[1];
            traces.push({
                task_id: task.id,
                owner_agent: 'sub_agent_router',
                required_capability: requiredCaps[0] || 'general_reasoning',
                primary_skill_id: primary?.id || null,
                fallback_skill_id: fallback?.id || null,
                selection_reason: primary
                    ? (fallback ? 'selected_primary_with_fallback' : 'selected_primary_no_fallback')
                    : 'skill_gap_no_approved_candidate',
                gate_snapshot: primary
                    ? `admission=passed|source=${primary.source}|sandbox=${primary.sandboxLevel}`
                    : 'admission=blocked|skill_gap=true',
                source: primary?.source || null,
                candidate_count: approved.length,
                trace_id: discovery.traceId,
            });
        } catch {
            traces.push({
                task_id: task.id,
                owner_agent: 'sub_agent_router',
                required_capability: requiredCaps[0] || 'general_reasoning',
                primary_skill_id: null,
                fallback_skill_id: null,
                selection_reason: 'skill_discovery_error',
                gate_snapshot: 'admission=blocked|discovery_error=true',
                source: null,
                candidate_count: 0,
            });
        }
    }
    return traces;
}

function buildSubAgentAssignments(
    tasks: CloudTaskNode[],
    selections: CloudSkillSelectionTrace[],
): CloudSubAgentAssignment[] {
    const byTask = new Map<string, CloudSkillSelectionTrace>();
    for (const selection of selections) {
        byTask.set(selection.task_id, selection);
    }
    return tasks.map((task) => {
        const selection = byTask.get(task.id);
        return {
            task_id: task.id,
            task_title: task.title,
            router_agent: 'sub_agent_router',
            execution_agent: 'skill_execution_agent',
            validation_agent: 'solution_validation_agent',
            selected_skill: selection?.primary_skill_id || null,
            fallback_skill: selection?.fallback_skill_id || null,
        };
    });
}

async function extractDecisionOptions(query: string, apiKey: string): Promise<string[]> {
    const prompt = `Analyze this user query. If the user is asking for a recommendation or making a decision, extract 2-5 possible choices as a JSON array. Return ONLY the raw JSON array, no markdown.\n\nExamples:\n  "Should I buy this laptop?" → ["buy_the_laptop", "save_money", "buy_cheaper_model"]\n  "What is the weather?" → []\n  "我该考研还是工作" → ["考研深造", "直接工作", "先工作再考研", "出国留学"]\n\nUser query: "${query}"\n\nJSON array:`;

    try {
        for (const model of GEMINI_MODEL_CANDIDATES) {
            const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
                }),
            });
            if (!resp.ok) continue;
            const data = await resp.json() as any;
            const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();

            // Try direct parse
            try {
                const opts = JSON.parse(text);
                if (Array.isArray(opts) && opts.length >= 2) return opts.slice(0, 5).map(String);
            } catch { /* fallback below */ }

            // Regex fallback
            const match = text.match(/\[.*\]/s);
            if (match) {
                try {
                    const opts = JSON.parse(match[0]);
                    if (Array.isArray(opts) && opts.length >= 2) return opts.slice(0, 5).map(String);
                } catch { /* continue */ }
            }

            // Partial array recovery
            if (text.startsWith('[') && !text.endsWith(']')) {
                try {
                    const opts = JSON.parse(text.trimEnd().replace(/,\s*$/, '') + ']');
                    if (Array.isArray(opts) && opts.length >= 2) return opts.slice(0, 5).map(String);
                } catch { /* try next model */ }
            }
        }
    } catch { /* ignore */ }
    return [];
}

// ============================================================================
// Gemini API Call
// ============================================================================

function resolveApiKey(body: ChatRequest): string {
    const bodyKey = String(body?.api_key || '').trim();
    if (bodyKey) return bodyKey;
    const candidates = [
        process.env.GEMINI_API_KEY,
        process.env.LUMI_GEMINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        process.env.VITE_GEMINI_API_KEY,
    ];
    for (const candidate of candidates) {
        const key = String(candidate || '').trim();
        if (key) return key;
    }
    return '';
}

function resolveOpenAIApiKey(body: ChatRequest): string {
    const bodyKey = String(body?.openai_api_key || '').trim();
    if (bodyKey) return bodyKey;
    return String(process.env.OPENAI_API_KEY || '').trim();
}

function shouldFallbackToOpenAI(error: string): boolean {
    const normalized = error.toLowerCase();
    return (
        normalized.includes('gemini api error 429') ||
        normalized.includes('quota') ||
        normalized.includes('rate limit') ||
        normalized.includes('resource exhausted') ||
        normalized.includes('timed out') ||
        normalized.includes('timeout') ||
        normalized.includes('api error 500') ||
        normalized.includes('api error 502') ||
        normalized.includes('api error 503') ||
        normalized.includes('api error 504')
    );
}

function thinkingToTemperature(thinking: string): number {
    const map: Record<string, number> = {
        off: 0.2, low: 0.4, minimal: 0.3, medium: 0.7, high: 1.0,
    };
    return map[thinking] ?? 0.7;
}

function buildGlobalSystemPrompt(responseLanguage: string): string {
    const now = new Date();
    const ymdParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const year = ymdParts.find((p) => p.type === 'year')?.value || '1970';
    const month = ymdParts.find((p) => p.type === 'month')?.value || '01';
    const day = ymdParts.find((p) => p.type === 'day')?.value || '01';
    const todayIso = `${year}-${month}-${day}`;
    const todayLabel = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        dateStyle: 'full',
        timeStyle: 'short',
    }).format(now);
    const londonWeekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/London',
        weekday: 'long',
    }).format(now);
    const weekdayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentWeekdayIndex = Math.max(0, weekdayOrder.indexOf(londonWeekday));
    const baseDate = new Date(`${todayIso}T00:00:00.000Z`);
    const nextWeekdayRefs = weekdayOrder
        .filter((name) => name !== 'Sunday')
        .map((name, targetIndex) => {
            const realTargetIndex = targetIndex + 1;
            let offset = (realTargetIndex - currentWeekdayIndex + 7) % 7;
            if (offset === 0) offset = 7;
            const d = new Date(baseDate);
            d.setUTCDate(d.getUTCDate() + offset);
            return `${name}: ${d.toISOString().slice(0, 10)}`;
        });

    return [
        'You are the OpenClaw cloud planning agent for Lumi.',
        `Current Europe/London time: ${todayLabel}.`,
        `Current Europe/London date (ISO): ${todayIso} (${londonWeekday}).`,
        `Reference dates for "next <weekday>" in Europe/London: ${nextWeekdayRefs.join(', ')}.`,
        'Always resolve relative dates like "next Monday", "tomorrow", or "next week" into explicit absolute dates.',
        'Never assume stale years; use the current date above as the reference point.',
        'Use this response schema: Final Output, Action Steps, Action Links, Evidence, Risks, Fallback, Next Action.',
        'Include concrete actionable links only when relevant, and label each link purpose.',
        'If constraints are missing, ask one concise clarification question and still provide a provisional plan.',
        'For health/legal/finance requests, provide decision support only and avoid irreversible actions.',
        'Never return an empty response.',
        `Respond in ${responseLanguage}.`,
    ].join('\n');
}

async function callGemini(
    query: string,
    apiKey: string,
    thinking: string,
    responseLanguage: string,
    twinState?: TwinState,
    bellmanAdvisory?: string,
    modelCandidates?: string[],
): Promise<{
    success: boolean;
    reply?: string;
    model?: string;
    error?: string;
    twin_applied: boolean;
    source: string;
    attempted_models?: string[];
}> {
    const temperature = thinkingToTemperature(thinking);

    const requestBody: Record<string, any> = {
        contents: [{ parts: [{ text: query }] }],
        generationConfig: {
            temperature,
            maxOutputTokens: 8192,
        },
    };

    // Inject Digital Twin system prompt + Bellman advisory
    let systemPrompt = buildGlobalSystemPrompt(responseLanguage);
    if (twinState && Object.keys(twinState).length > 0) {
        systemPrompt = `${systemPrompt}\n\n${buildTwinSystemPrompt(twinState)}`;
    }
    if (bellmanAdvisory) {
        systemPrompt = `${systemPrompt}\n\n${bellmanAdvisory}`;
    }
    if (systemPrompt) {
        requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }],
        };
    }

    const errors: string[] = [];
    const attemptedModels: string[] = [];
    const candidates = dedupeModels(modelCandidates && modelCandidates.length > 0 ? modelCandidates : GEMINI_MODEL_CANDIDATES);
    for (const model of candidates) {
        attemptedModels.push(model);
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            errors.push(`${model}: ${response.status} ${errorText.slice(0, 120)}`);
            continue;
        }

        const data = await response.json() as any;
        const candidates = data?.candidates ?? [];
        if (candidates.length === 0) {
            errors.push(`${model}: no_candidates`);
            continue;
        }

        const parts = candidates[0]?.content?.parts ?? [];
        const text = parts.map((p: any) => p.text ?? '').join('').trim();
        if (!text) {
            errors.push(`${model}: empty_reply`);
            continue;
        }

        return {
            success: true,
            reply: text,
            model,
            twin_applied: !!twinState,
            source: 'cloud-gemini',
            attempted_models: attemptedModels,
        };
    }

    return {
        success: false,
        error: `Gemini API failed across models: ${errors.join(' | ').slice(0, 700)}`,
        twin_applied: !!twinState,
        source: 'cloud-gemini',
        attempted_models: attemptedModels,
    };
}

function extractOpenAIText(data: any): string {
    const outputText = String(data?.output_text || '').trim();
    if (outputText) return outputText;
    const outputs = Array.isArray(data?.output) ? data.output : [];
    const textParts: string[] = [];
    for (const item of outputs) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const part of content) {
            if (part?.type === 'output_text' && typeof part?.text === 'string') {
                textParts.push(part.text);
            }
        }
    }
    return textParts.join('\n').trim();
}

async function callOpenAI(
    query: string,
    apiKey: string,
    thinking: string,
    responseLanguage: string,
    twinState?: TwinState,
    bellmanAdvisory?: string,
): Promise<{
    success: boolean;
    reply?: string;
    model?: string;
    error?: string;
    twin_applied: boolean;
    source: string;
}> {
    const temperature = thinkingToTemperature(thinking);
    let instructions = buildGlobalSystemPrompt(responseLanguage);
    if (twinState && Object.keys(twinState).length > 0) {
        instructions = `${instructions}\n\n${buildTwinSystemPrompt(twinState)}`;
    }
    if (bellmanAdvisory) {
        instructions = `${instructions}\n\n${bellmanAdvisory}`;
    }

    const response = await fetch(OPENAI_API_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            input: query,
            instructions: instructions || undefined,
            temperature,
            max_output_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            error: `OpenAI API error ${response.status}: ${errorText.slice(0, 200)}`,
            twin_applied: !!twinState,
            source: 'cloud-openai-fallback',
        };
    }

    const data = await response.json() as any;
    const text = extractOpenAIText(data);
    if (!text) {
        return {
            success: false,
            error: 'No text in OpenAI response',
            twin_applied: !!twinState,
            source: 'cloud-openai-fallback',
        };
    }

    return {
        success: true,
        reply: text,
        model: OPENAI_MODEL,
        twin_applied: !!twinState,
        source: 'cloud-openai-fallback',
    };
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
): Promise<void> {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    const traceId = randomUUID();
    if (req.method !== 'POST') {
        const envelope = buildStrictEnvelope('', {
            success: false,
            error: 'Method not allowed',
            source: 'openclaw_chat',
            status: 'error',
        });
        res.status(405).json({
            success: false,
            error: 'Method not allowed',
            trace_id: traceId,
            ...envelope,
            reply: envelope.summary,
        });
        return;
    }

    try {
        const body = (req.body || {}) as ChatRequest;
        const query = String(body?.query || '').trim();

        if (!query) {
            const envelope = buildStrictEnvelope('', {
                success: false,
                error: 'Missing required field: query',
                source: 'openclaw_chat',
                status: 'waiting_user',
            });
            res.status(400).json({
                success: false,
                error: 'Missing required field: query',
                trace_id: traceId,
                ...envelope,
                reply: envelope.summary,
            });
            return;
        }

        const geminiApiKey = resolveApiKey(body);
        const openAiApiKey = resolveOpenAIApiKey(body);
        if (!geminiApiKey && !openAiApiKey) {
            const envelope = buildStrictEnvelope(query, {
                success: false,
                error: 'model_api_key_missing',
                source: 'openclaw_chat',
                status: 'error',
            });
            res.status(503).json({
                success: false,
                error: 'model_api_key_missing',
                trace_id: traceId,
                ...envelope,
                reply: envelope.summary,
            });
            return;
        }

        const thinking = String(body?.thinking || 'medium').trim().toLowerCase();
        const responseLanguage = String(body?.response_language || 'en-GB').trim() || 'en-GB';
        const explicitTaskParts = Array.isArray(body?.task_parts)
            ? body.task_parts.map((part) => String(part || '').trim()).filter((part) => part.length > 0)
            : undefined;
        const twinState = body?.twin_state && typeof body.twin_state === 'object' ? body.twin_state : undefined;
        const trajectory = Array.isArray(body?.trajectory) ? body.trajectory : undefined;
        const modelRouting = buildAdaptiveModelRouting(query, thinking, explicitTaskParts);

        console.log(
            `[openclaw/chat] query="${query.slice(0, 50)}..." thinking=${thinking} twin=${!!twinState} trace=${traceId}`,
        );
        console.log(
            `[openclaw/chat] routing policy=${modelRouting.policy} difficulty=${modelRouting.overall_difficulty} candidates=${modelRouting.selected_candidates.join(' -> ')} trace=${traceId}`,
        );

        // ── Bellman Decision Optimization ──
        let bellmanResult: BellmanResult | undefined;
        let bellmanAdvisory: string | undefined;
        if (twinState && geminiApiKey) {
            try {
                const options = await extractDecisionOptions(query, geminiApiKey);
                if (options.length >= 2) {
                    console.log(`[openclaw/chat] Bellman: extracted ${options.length} options: ${JSON.stringify(options)}`);
                    bellmanResult = runBellmanOptimization(twinState, options, trajectory);
                    bellmanAdvisory = bellmanResult.advisory_text;
                    console.log(`[openclaw/chat] Bellman: optimal=${bellmanResult.optimal_action}, β=${bellmanResult.discount_beta}`);
                }
            } catch (e) {
                console.error('[openclaw/chat] Bellman analysis failed:', e);
            }
        }

        let result = geminiApiKey
            ? await callGemini(
                query,
                geminiApiKey,
                thinking,
                responseLanguage,
                twinState,
                bellmanAdvisory,
                modelRouting.selected_candidates,
            )
            : {
                success: false,
                error: 'gemini_api_key_missing',
                twin_applied: !!twinState,
                source: 'cloud-gemini',
            };
        const geminiAttemptedModels = Array.isArray((result as any).attempted_models)
            ? ((result as any).attempted_models as string[])
            : [];

        let fallbackReason: string | undefined;
        let providerChain: string[] = ['gemini'];
        if (!result.success && openAiApiKey && shouldFallbackToOpenAI(String(result.error || ''))) {
            fallbackReason = result.error;
            providerChain = ['gemini', 'openai-fallback'];
            const openAiResult = await callOpenAI(query, openAiApiKey, thinking, responseLanguage, twinState, bellmanAdvisory);
            if (openAiResult.success) {
                result = openAiResult;
            } else {
                result = {
                    ...openAiResult,
                    error: `Gemini failed: ${String(fallbackReason).slice(0, 500)} | OpenAI fallback failed: ${String(openAiResult.error || 'unknown').slice(0, 300)}`,
                };
            }
        } else if (!result.success && openAiApiKey && !geminiApiKey) {
            fallbackReason = 'gemini_api_key_missing';
            providerChain = ['gemini-missing', 'openai-fallback'];
            result = await callOpenAI(query, openAiApiKey, thinking, responseLanguage, twinState, bellmanAdvisory);
        }

        let linkAudit: LinkAuditSummary | undefined;
        if (result.success && typeof result.reply === 'string' && result.reply.trim().length > 0) {
            result.reply = ensureExecutableStructuredReply(query, result.reply);
            const sanitized = await sanitizeResponseLinks(query, result.reply);
            result.reply = sanitized.sanitized;
            linkAudit = sanitized.audit;
        }

        const cloudTaskGraph = buildCloudTaskGraph(query, explicitTaskParts, result.reply);
        const skillSelectionTrace = await buildCloudSkillSelectionTrace(query, cloudTaskGraph.tasks);
        const subAgentAssignments = buildSubAgentAssignments(cloudTaskGraph.tasks, skillSelectionTrace);

        const response: Record<string, any> = {
            ...result,
            trace_id: traceId,
            model_routing: {
                ...modelRouting,
                selected_model: result.model || null,
                attempted_models: Array.isArray((result as any).attempted_models)
                    ? (result as any).attempted_models
                    : geminiAttemptedModels,
            },
            cloud_orchestration: {
                reasoning_owner: 'openclaw_cloud_llm',
                decomposition_owner: 'task_planner',
                execution_owner: 'openclaw_orchestrator',
                skill_routing_owner: 'sub_agent_router',
                mode: 'cloud_reason_then_subagent_skill_execution',
                decomposed_task_count: cloudTaskGraph.tasks.length,
            },
            task_graph: cloudTaskGraph,
            skill_selection_trace: skillSelectionTrace,
            sub_agent_assignments: subAgentAssignments,
        };
        const strictEnvelope = buildStrictEnvelope(query, {
            success: !!result.success,
            reply: result.reply,
            model: result.model,
            error: result.error,
            source: result.source,
            status: (result as any).status,
            link_audit: linkAudit,
        });
        response.status = strictEnvelope.status;
        response.summary = strictEnvelope.summary;
        response.next_action = strictEnvelope.next_action;
        response.owner_agent = strictEnvelope.owner_agent;
        response.gate_decisions = strictEnvelope.gate_decisions;
        response.evidence = strictEnvelope.evidence;
        response.link_audit = strictEnvelope.link_audit;
        if (!response.reply || String(response.reply).trim().length === 0) {
            response.reply = strictEnvelope.summary;
        }
        if (fallbackReason) {
            response.fallback_reason = fallbackReason;
            response.provider_chain = providerChain;
        }
        if (bellmanResult) {
            response.bellman_analysis = bellmanResult;
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('[openclaw/chat] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'internal_error';
        const envelope = buildStrictEnvelope('', {
            success: false,
            error: errorMessage,
            source: 'openclaw_chat',
            status: 'error',
        });
        res.status(500).json({
            success: false,
            error: errorMessage,
            trace_id: traceId,
            ...envelope,
            reply: envelope.summary,
        });
    }
}

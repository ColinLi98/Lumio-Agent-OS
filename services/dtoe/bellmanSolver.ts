/**
 * Bellman Solver
 * Phase 3 v0.2: MPC-style Bellman Approximation
 * 
 * Uses Monte Carlo rollouts to approximate the Bellman equation:
 * V(s) = max_a E[r(s,a,ξ) + γV(s')]
 * 
 * Scores actions by: E[Utility] - ρ * CVaR(α)
 */

import type { TwinState, GoalStack, Action } from './coreSchemas.js';
import type { BeliefState, Particle } from './twinBeliefStore.js';
import type { Scenario, ExogenousShock } from './scenarioEngine.js';
import { sampleParticle, getPosteriorMeanState } from './twinBeliefStore.js';
import { createScenarioGenerator, generateScenariosParallel } from './scenarioEngine.js';
import { transition } from './transitionModel.js';

// ============================================================================
// Types
// ============================================================================

export interface ActionTemplate {
    action_type: 'do' | 'ask' | 'wait' | 'commit';
    template_id: string;
    summary: string;
    cost_money: number;
    cost_time_hours: number;
    intensity: number; // 0-1
    reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
    risk_tags: string[];
}

export interface ActionScore {
    action: Action;
    mean_utility: number;
    std_utility: number;
    cvar_90: number;
    cvar_95: number;
    failure_prob: number;
    score: number;
    eligible: boolean;
    ineligible_reason?: string;
    outcome_samples: number[];
}

export interface ScoreBreakdown {
    utility_by_goal: Record<string, number>;
    constraint_violations: string[];
    risk_contribution: number;
}

export interface SolveResult {
    trace_id: string;
    ranked_actions: ActionScore[];
    best_action: Action | null;
    confidence: number;
    solve_time_ms: number;
    n_scenarios: number;
    horizon: number;
    // Engineering fields (PR-05)
    cache_hit: boolean;
    trace: {
        rollout_steps: number;
        pruned_actions: number;
        coarse_evaluated: number;
        fine_evaluated: number;
    };
}

// PR-05: Extended solve options with cache and pruning
export interface SolveOptions {
    time_budget_ms: number;
    max_actions?: number;
    coarse_scenarios?: number;  // For initial pruning pass
    fine_scenarios?: number;    // For final evaluation
    cache?: { enabled: boolean; ttl_ms: number };
    enable_parallel_scenarios?: boolean;
    parallel_batch_size?: number;
    parallel_max_concurrency?: number;
}

export interface SolverConfig {
    n_scenarios: number;
    horizon: number;
    discount: number; // γ
    risk_aversion: number; // ρ
    cvar_alpha: number; // α for CVaR
    max_failure_prob: number;
    seed?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SOLVER_CONFIG: SolverConfig = {
    n_scenarios: 5000,
    horizon: 4, // weeks
    discount: 0.98,
    risk_aversion: 0.5,
    cvar_alpha: 0.9, // CVaR_90
    max_failure_prob: 0.3,
    seed: undefined,
};

// PR-05: Value Cache
interface CacheKey {
    belief_hash: string;
    goal_hash: string;
}

interface CacheEntry {
    result: SolveResult;
    created_at: number;
    ttl_ms: number;
}

const VALUE_CACHE = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL_MS = 300000; // 5 minutes
let CACHE_HITS = 0;
let CACHE_MISSES = 0;

function computeBeliefHash(belief: BeliefState): string {
    const mean = getPosteriorMeanState(belief);
    // mean is Record<string, number> - access keys directly
    const liquid = Math.round((mean['cash_liquid'] ?? 0) / 1000);
    const cashflow = Math.round((mean['monthly_cashflow'] ?? 0) / 500);
    const attention = Math.round((mean['attention_budget_score'] ?? 0.5) * 10);
    const adherence = Math.round(
        belief.particles.reduce((sum, p) => sum + p.params.execution_adherence * p.weight, 0) * 100
    );
    const shockSeverity = Math.round(
        belief.particles.reduce((sum, p) => sum + p.params.shock_severity * p.weight, 0) * 100
    );
    return `b_${liquid}_${cashflow}_${attention}_${adherence}_${shockSeverity}_v${belief.version}`;
}

function computeGoalHash(goals: GoalStack): string {
    const objHash = goals.objectives.map(o => `${o.metric}:${o.weight}`).join('_');
    const horizon = goals.horizon_days;
    return `g_${horizon}_${objHash.slice(0, 32)}`;
}

function getCacheKey(belief: BeliefState, goals: GoalStack): string {
    return `${computeBeliefHash(belief)}_${computeGoalHash(goals)}`;
}

function getCachedResult(key: string): SolveResult | null {
    const entry = VALUE_CACHE.get(key);
    if (!entry) {
        CACHE_MISSES += 1;
        return null;
    }
    if (Date.now() - entry.created_at > entry.ttl_ms) {
        VALUE_CACHE.delete(key);
        CACHE_MISSES += 1;
        return null;
    }
    CACHE_HITS += 1;
    return entry.result;
}

function setCachedResult(key: string, result: SolveResult, ttl_ms: number): void {
    VALUE_CACHE.set(key, {
        result,
        created_at: Date.now(),
        ttl_ms,
    });
}

export function clearSolverCache(): void {
    VALUE_CACHE.clear();
    CACHE_HITS = 0;
    CACHE_MISSES = 0;
}

// ============================================================================
// Action Template Library
// ============================================================================

export const ACTION_TEMPLATES: ActionTemplate[] = [
    // Wait actions (always available)
    {
        action_type: 'wait',
        template_id: 'wait_1w',
        summary: '等待一周，观察情况变化',
        cost_money: 0,
        cost_time_hours: 0,
        intensity: 0,
        reversibility: 'reversible',
        risk_tags: [],
    },
    // Ask actions
    {
        action_type: 'ask',
        template_id: 'ask_constraints',
        summary: '询问用户时间/预算约束',
        cost_money: 0,
        cost_time_hours: 0.1,
        intensity: 0.1,
        reversibility: 'reversible',
        risk_tags: [],
    },
    {
        action_type: 'ask',
        template_id: 'ask_preferences',
        summary: '确认用户偏好和优先级',
        cost_money: 0,
        cost_time_hours: 0.2,
        intensity: 0.1,
        reversibility: 'reversible',
        risk_tags: [],
    },
    // Do actions - Low intensity
    {
        action_type: 'do',
        template_id: 'do_research_light',
        summary: '进行轻度信息收集',
        cost_money: 0,
        cost_time_hours: 2,
        intensity: 0.2,
        reversibility: 'reversible',
        risk_tags: [],
    },
    {
        action_type: 'do',
        template_id: 'do_plan_simple',
        summary: '制定简单行动计划',
        cost_money: 0,
        cost_time_hours: 1,
        intensity: 0.2,
        reversibility: 'reversible',
        risk_tags: [],
    },
    // Do actions - Medium intensity
    {
        action_type: 'do',
        template_id: 'do_optimize_schedule',
        summary: '优化日程安排，释放时间',
        cost_money: 0,
        cost_time_hours: 3,
        intensity: 0.4,
        reversibility: 'partially_reversible',
        risk_tags: ['time_commitment'],
    },
    {
        action_type: 'do',
        template_id: 'do_skill_invest',
        summary: '投入技能学习',
        cost_money: 100,
        cost_time_hours: 10,
        intensity: 0.5,
        reversibility: 'partially_reversible',
        risk_tags: ['time_commitment', 'money_outflow'],
    },
    {
        action_type: 'do',
        template_id: 'do_network_expand',
        summary: '扩展社交网络',
        cost_money: 50,
        cost_time_hours: 5,
        intensity: 0.4,
        reversibility: 'partially_reversible',
        risk_tags: ['social_risk'],
    },
    // Do actions - High intensity
    {
        action_type: 'do',
        template_id: 'do_career_move',
        summary: '采取职业发展行动',
        cost_money: 0,
        cost_time_hours: 15,
        intensity: 0.7,
        reversibility: 'partially_reversible',
        risk_tags: ['career_risk', 'time_commitment'],
    },
    {
        action_type: 'do',
        template_id: 'do_major_investment',
        summary: '进行重大财务决策',
        cost_money: 5000,
        cost_time_hours: 5,
        intensity: 0.8,
        reversibility: 'irreversible',
        risk_tags: ['financial_risk', 'high_stakes'],
    },
    // Commit actions
    {
        action_type: 'commit',
        template_id: 'commit_goal',
        summary: '确认并锁定目标',
        cost_money: 0,
        cost_time_hours: 0.5,
        intensity: 0.3,
        reversibility: 'irreversible',
        risk_tags: ['commitment'],
    },
    {
        action_type: 'commit',
        template_id: 'commit_delegation',
        summary: '确认任务委派',
        cost_money: 200,
        cost_time_hours: 1,
        intensity: 0.4,
        reversibility: 'irreversible',
        risk_tags: ['delegation_risk', 'money_outflow'],
    },
];

// ============================================================================
// Core Solver Functions
// ============================================================================

/**
 * Generate candidate actions from templates
 */
export function generateCandidateActions(templates?: ActionTemplate[]): Action[] {
    const templateList = templates ?? ACTION_TEMPLATES;

    return templateList.map((t) => ({
        action_id: `act_${t.template_id}_${Date.now()}`,
        action_type: t.action_type,
        summary: t.summary,
        cost: {
            money: t.cost_money,
            time_hours: t.cost_time_hours,
            attention_cost: t.intensity * 0.2,
        },
        reversibility: t.reversibility,
        risk_tags: t.risk_tags,
    }));
}

/**
 * Compute utility for a terminal state given goals
 */
function computeUtility(state: TwinState, goals: GoalStack): number {
    let utility = 0;

    // Weight resources by objective weights
    for (const obj of goals.objectives) {
        const resourceKey = mapObjectiveToResource(obj.metric);
        const value = state.resources[resourceKey];

        if (typeof value === 'number') {
            utility += obj.weight * value;
        }
    }

    return utility;
}

function mapObjectiveToResource(metric: string): string {
    const mapping: Record<string, string> = {
        financial_stability: 'cash_liquid',
        time_freedom: 'time_hours_per_week',
        health: 'attention_budget_score',
        social_capital: 'social_capital_score',
        career_growth: 'monthly_cashflow',
    };
    return mapping[metric] ?? metric;
}

/**
 * Rollout a single action through a scenario
 */
function rolloutAction(
    initialState: TwinState,
    action: Action,
    scenario: Scenario,
    goals: GoalStack,
    discount: number
): number {
    let state = initialState;
    let totalUtility = 0;
    let discountFactor = 1;

    // Create idle/wait action for subsequent steps
    const idleAction: Action = {
        action_id: 'idle_wait',
        action_type: 'wait',
        summary: '等待',
        cost: { time_hours: 0, money: 0 },
        reversibility: 'reversible',
    };

    for (let t = 0; t < scenario.shocks.length; t++) {
        const shock = scenario.shocks[t];

        // Apply action only on first step, idle on subsequent
        const currentAction = t === 0 ? action : idleAction;

        // Transition
        state = transition(state, currentAction, shock, true);

        // Accumulate discounted utility
        const stepUtility = computeUtility(state, goals);
        totalUtility += discountFactor * stepUtility;
        discountFactor *= discount;
    }

    return totalUtility;
}

/**
 * Check if action violates hard constraints
 */
function checkConstraints(
    action: Action,
    state: TwinState,
    goals: GoalStack
): { eligible: boolean; reason?: string } {
    const { hard_constraints } = goals;

    // Check money constraint
    if ((action.cost.money ?? 0) > (state.resources.cash_liquid ?? 0)) {
        return { eligible: false, reason: '资金不足' };
    }

    // Check time constraint
    if ((action.cost.time_hours ?? 0) > (state.resources.time_hours_per_week ?? 0)) {
        return { eligible: false, reason: '时间不足' };
    }

    // Check max_money_outflow
    const maxOutflow = hard_constraints.max_money_outflow;
    if (typeof maxOutflow === 'number' && (action.cost.money ?? 0) > maxOutflow) {
        return { eligible: false, reason: '超出单笔支出限制' };
    }

    return { eligible: true };
}

/**
 * Compute CVaR at given alpha level
 */
function computeCVaR(samples: number[], alpha: number): number {
    if (samples.length === 0) return 0;

    const sorted = [...samples].sort((a, b) => a - b);
    const cutoff = Math.floor((1 - alpha) * sorted.length);
    const tailSamples = sorted.slice(0, Math.max(1, cutoff));

    return tailSamples.reduce((a, b) => a + b, 0) / tailSamples.length;
}

/**
 * Score a single action
 */
function scoreAction(
    action: Action,
    belief: BeliefState,
    goals: GoalStack,
    scenarios: Scenario[],
    config: SolverConfig
): ActionScore {
    const samples: number[] = [];

    // Sample a representative state from belief
    const particle = sampleParticle(belief);
    const state = particle.state;

    // Check hard constraints first
    const constraintCheck = checkConstraints(action, state, goals);

    if (!constraintCheck.eligible) {
        return {
            action,
            mean_utility: -Infinity,
            std_utility: 0,
            cvar_90: -Infinity,
            cvar_95: -Infinity,
            failure_prob: 1,
            score: -Infinity,
            eligible: false,
            ineligible_reason: constraintCheck.reason,
            outcome_samples: [],
        };
    }

    // Rollout across scenarios
    for (const scenario of scenarios) {
        const utility = rolloutAction(state, action, scenario, goals, config.discount);
        samples.push(utility);
    }

    // Compute statistics
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const std = Math.sqrt(variance);

    const cvar_90 = computeCVaR(samples, 0.9);
    const cvar_95 = computeCVaR(samples, 0.95);

    // Failure probability: utility below threshold
    const failureThreshold = mean - std; // Simple threshold
    const failures = samples.filter((s) => s < failureThreshold).length;
    const failure_prob = failures / samples.length;

    // Score = E[U] - ρ * |CVaR|
    const cvar = config.cvar_alpha === 0.95 ? cvar_95 : cvar_90;
    const score = mean - config.risk_aversion * Math.abs(cvar);

    // Check failure_prob constraint
    const eligible = failure_prob <= config.max_failure_prob;

    return {
        action,
        mean_utility: mean,
        std_utility: std,
        cvar_90,
        cvar_95,
        failure_prob,
        score,
        eligible,
        ineligible_reason: eligible ? undefined : '失败概率超限',
        outcome_samples: samples,
    };
}

/**
 * Main Bellman solver
 */
export function solveBellman(
    belief: BeliefState,
    goals: GoalStack,
    config: Partial<SolverConfig> = {}
): SolveResult {
    const startTime = performance.now();
    const fullConfig = { ...DEFAULT_SOLVER_CONFIG, ...config };

    // Generate trace ID
    const trace_id = `solve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Generate scenarios
    const generator = createScenarioGenerator(fullConfig.seed ?? Date.now());
    const scenarios = generator.generateScenarios(fullConfig.n_scenarios, fullConfig.horizon);

    // Generate candidate actions
    const candidates = generateCandidateActions();

    // Score all actions
    const scores: ActionScore[] = candidates.map((action) =>
        scoreAction(action, belief, goals, scenarios, fullConfig)
    );

    // Sort by score (descending), eligible first
    scores.sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
    });

    // Compute confidence based on score gap
    let confidence = 0.5;
    if (scores.length >= 2 && scores[0].eligible && scores[1].eligible) {
        const gap = scores[0].score - scores[1].score;
        const avgScore = (scores[0].score + scores[1].score) / 2;
        confidence = Math.min(0.95, 0.5 + (gap / (Math.abs(avgScore) + 1)) * 0.3);
    }

    const best_action = scores.find((s) => s.eligible)?.action ?? null;

    return {
        trace_id,
        ranked_actions: scores,
        best_action,
        confidence,
        solve_time_ms: performance.now() - startTime,
        n_scenarios: fullConfig.n_scenarios,
        horizon: fullConfig.horizon,
        cache_hit: false,
        trace: {
            rollout_steps: fullConfig.horizon * fullConfig.n_scenarios,
            pruned_actions: 0,
            coarse_evaluated: candidates.length,
            fine_evaluated: candidates.length,
        },
    };
}

/**
 * Quick solve with reduced scenarios (for real-time UI)
 */
export function quickSolve(
    belief: BeliefState,
    goals: GoalStack,
    config?: Partial<SolverConfig>
): SolveResult {
    return solveBellman(belief, goals, {
        ...config,
        n_scenarios: 500,
        horizon: 2,
    });
}

/**
 * Solve with extended options (PR-05)
 * Supports: caching, time budget, coarse/fine pruning
 */
export function solveBellmanWithOptions(
    belief: BeliefState,
    goals: GoalStack,
    options: SolveOptions,
    config: Partial<SolverConfig> = {}
): SolveResult {
    const startTime = performance.now();
    const fullConfig = { ...DEFAULT_SOLVER_CONFIG, ...config };

    // Check cache first
    const cacheEnabled = options.cache?.enabled ?? false;
    const cacheTtl = options.cache?.ttl_ms ?? DEFAULT_CACHE_TTL_MS;
    const cacheKey = getCacheKey(belief, goals);

    if (cacheEnabled) {
        const cached = getCachedResult(cacheKey);
        if (cached) {
            return {
                ...cached,
                cache_hit: true,
                solve_time_ms: performance.now() - startTime,
            };
        }
    }

    const trace_id = `solve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Generate scenarios (start with coarse)
    const generator = createScenarioGenerator(fullConfig.seed ?? Date.now());
    const coarseCount = options.coarse_scenarios ?? 200;
    const fineCount = options.fine_scenarios ?? fullConfig.n_scenarios;

    // Generate coarse scenarios for initial pass
    const coarseScenarios = generator.generateScenarios(coarseCount, fullConfig.horizon);

    // Generate candidate actions
    let candidates = generateCandidateActions();
    if (options.max_actions && candidates.length > options.max_actions) {
        candidates = candidates.slice(0, options.max_actions);
    }

    // Coarse evaluation
    const coarseScores = candidates.map((action) =>
        scoreAction(action, belief, goals, coarseScenarios, fullConfig)
    );

    // Prune: keep top actions for fine evaluation
    const topCount = Math.max(3, Math.ceil(candidates.length / 2));
    const sortedCoarse = [...coarseScores]
        .filter(s => s.eligible)
        .sort((a, b) => b.score - a.score)
        .slice(0, topCount);

    const prunedCount = coarseScores.length - sortedCoarse.length;

    // Check time budget
    const elapsed = performance.now() - startTime;
    let finalScores: ActionScore[];

    if (elapsed < options.time_budget_ms * 0.8 && sortedCoarse.length > 0) {
        // Fine evaluation on top candidates
        const fineScenarios = generator.generateScenarios(fineCount, fullConfig.horizon);
        finalScores = sortedCoarse.map((coarse) =>
            scoreAction(coarse.action, belief, goals, fineScenarios, fullConfig)
        );
    } else {
        // Time budget exceeded, use coarse results
        finalScores = sortedCoarse;
    }

    // Sort final scores
    finalScores.sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
    });

    // Compute confidence
    let confidence = 0.5;
    if (finalScores.length >= 2 && finalScores[0].eligible && finalScores[1].eligible) {
        const gap = finalScores[0].score - finalScores[1].score;
        const avgScore = (finalScores[0].score + finalScores[1].score) / 2;
        confidence = Math.min(0.95, 0.5 + (gap / (Math.abs(avgScore) + 1)) * 0.3);
    }

    const best_action = finalScores.find((s) => s.eligible)?.action ?? null;

    const result: SolveResult = {
        trace_id,
        ranked_actions: finalScores,
        best_action,
        confidence,
        solve_time_ms: performance.now() - startTime,
        n_scenarios: finalScores.length > 0 ? fineCount : coarseCount,
        horizon: fullConfig.horizon,
        cache_hit: false,
        trace: {
            rollout_steps: fullConfig.horizon * (coarseCount + (sortedCoarse.length > 0 ? fineCount : 0)),
            pruned_actions: prunedCount,
            coarse_evaluated: coarseScores.length,
            fine_evaluated: sortedCoarse.length,
        },
    };

    // Cache result
    if (cacheEnabled) {
        setCachedResult(cacheKey, result, cacheTtl);
    }

    return result;
}

/**
 * Async solver variant that supports optional parallel scenario generation.
 * When parallel mode is disabled, it delegates to the synchronous implementation.
 */
export async function solveBellmanWithOptionsAsync(
    belief: BeliefState,
    goals: GoalStack,
    options: SolveOptions,
    config: Partial<SolverConfig> = {}
): Promise<SolveResult> {
    if (!options.enable_parallel_scenarios) {
        return solveBellmanWithOptions(belief, goals, options, config);
    }

    const startTime = performance.now();
    const fullConfig = { ...DEFAULT_SOLVER_CONFIG, ...config };

    // Check cache first
    const cacheEnabled = options.cache?.enabled ?? false;
    const cacheTtl = options.cache?.ttl_ms ?? DEFAULT_CACHE_TTL_MS;
    const cacheKey = getCacheKey(belief, goals);

    if (cacheEnabled) {
        const cached = getCachedResult(cacheKey);
        if (cached) {
            return {
                ...cached,
                cache_hit: true,
                solve_time_ms: performance.now() - startTime,
            };
        }
    }

    const trace_id = `solve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const coarseCount = options.coarse_scenarios ?? 200;
    const fineCount = options.fine_scenarios ?? fullConfig.n_scenarios;
    const baseSeed = fullConfig.seed ?? Date.now();

    const coarseScenarios = await generateScenariosParallel(coarseCount, fullConfig.horizon, {
        seed: baseSeed,
        enable_parallel_scenarios: true,
        batch_size: options.parallel_batch_size ?? 500,
        max_concurrency: options.parallel_max_concurrency ?? 4,
    });

    // Generate candidate actions
    let candidates = generateCandidateActions();
    if (options.max_actions && candidates.length > options.max_actions) {
        candidates = candidates.slice(0, options.max_actions);
    }

    // Coarse evaluation
    const coarseScores = candidates.map((action) =>
        scoreAction(action, belief, goals, coarseScenarios, fullConfig)
    );

    // Prune: keep top actions for fine evaluation
    const topCount = Math.max(3, Math.ceil(candidates.length / 2));
    const sortedCoarse = [...coarseScores]
        .filter(s => s.eligible)
        .sort((a, b) => b.score - a.score)
        .slice(0, topCount);

    const prunedCount = coarseScores.length - sortedCoarse.length;

    // Check time budget
    const elapsed = performance.now() - startTime;
    let finalScores: ActionScore[];

    if (elapsed < options.time_budget_ms * 0.8 && sortedCoarse.length > 0) {
        const fineScenarios = await generateScenariosParallel(fineCount, fullConfig.horizon, {
            seed: baseSeed + 1000003,
            enable_parallel_scenarios: true,
            batch_size: options.parallel_batch_size ?? 500,
            max_concurrency: options.parallel_max_concurrency ?? 4,
        });
        finalScores = sortedCoarse.map((coarse) =>
            scoreAction(coarse.action, belief, goals, fineScenarios, fullConfig)
        );
    } else {
        finalScores = sortedCoarse;
    }

    // Sort final scores
    finalScores.sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
    });

    // Compute confidence
    let confidence = 0.5;
    if (finalScores.length >= 2 && finalScores[0].eligible && finalScores[1].eligible) {
        const gap = finalScores[0].score - finalScores[1].score;
        const avgScore = (finalScores[0].score + finalScores[1].score) / 2;
        confidence = Math.min(0.95, 0.5 + (gap / (Math.abs(avgScore) + 1)) * 0.3);
    }

    const best_action = finalScores.find((s) => s.eligible)?.action ?? null;

    const result: SolveResult = {
        trace_id,
        ranked_actions: finalScores,
        best_action,
        confidence,
        solve_time_ms: performance.now() - startTime,
        n_scenarios: finalScores.length > 0 ? fineCount : coarseCount,
        horizon: fullConfig.horizon,
        cache_hit: false,
        trace: {
            rollout_steps: fullConfig.horizon * (coarseCount + (sortedCoarse.length > 0 ? fineCount : 0)),
            pruned_actions: prunedCount,
            coarse_evaluated: coarseScores.length,
            fine_evaluated: sortedCoarse.length,
        },
    };

    if (cacheEnabled) {
        setCachedResult(cacheKey, result, cacheTtl);
    }

    return result;
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
    size: number;
    keys: string[];
    hits: number;
    misses: number;
    hit_rate: number;
} {
    const total = CACHE_HITS + CACHE_MISSES;
    return {
        size: VALUE_CACHE.size,
        keys: Array.from(VALUE_CACHE.keys()),
        hits: CACHE_HITS,
        misses: CACHE_MISSES,
        hit_rate: total > 0 ? CACHE_HITS / total : 0,
    };
}

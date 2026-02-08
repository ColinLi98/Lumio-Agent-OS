/**
 * Monte Carlo Policy Evaluator - Phase 3 v0.1
 * Receding-horizon MPC with risk-aware objective
 *
 * Evaluates candidate actions using Monte Carlo rollouts
 * and ranks by E[Utility] - λ * CVaR (risk-adjusted score)
 */

import type {
    TwinState,
    Action,
    ActionType,
    GoalStack,
    ActionCost,
} from './coreSchemas.js';
import { generateId } from './coreSchemas.js';
import {
    transition,
    deriveExecutionFlag,
    generateShockBundle,
    type ExogenousShock,
} from './transitionModel.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_N_SCENARIOS = 5000;
const DEFAULT_HORIZON = 4;  // 4 weeks lookahead
const CVAR_PERCENTILE = 0.1;  // CVaR 90 = worst 10%

// ============================================================================
// Action Score
// ============================================================================

export interface ActionScore {
    action: Action;
    mean: number;
    std: number;
    p50: number;
    p90: number;
    cvar_90: number;
    failure_prob: number;
    score: number;  // Risk-adjusted: mean - rho * |cvar|
}

// ============================================================================
// Candidate Action Generation
// ============================================================================

const ACTION_TEMPLATES: Array<{ type: ActionType; summary: string; cost: ActionCost }> = [
    // Wait actions (first-class citizen)
    { type: 'wait', summary: '等待更多信息', cost: { time_hours: 1, cognitive_load: 0.05 } },
    { type: 'wait', summary: '观察市场变化', cost: { time_hours: 2, cognitive_load: 0.1 } },

    // Ask actions
    { type: 'ask', summary: '询问用户约束/偏好', cost: { time_hours: 0.5, cognitive_load: 0.1 } },
    { type: 'ask', summary: '请求补充关键信息', cost: { time_hours: 0.25, cognitive_load: 0.05 } },

    // Do actions (examples)
    { type: 'do', summary: '执行立即行动', cost: { time_hours: 2, money: 100, cognitive_load: 0.3 } },
    { type: 'do', summary: '研究备选方案', cost: { time_hours: 4, cognitive_load: 0.4 } },
    { type: 'do', summary: '预订/购买', cost: { time_hours: 1, money: 500, cognitive_load: 0.2 } },

    // Commit actions
    { type: 'commit', summary: '确认并提交决策', cost: { time_hours: 1, cognitive_load: 0.3 } },
];

export function generateCandidateActions(context?: string): Action[] {
    return ACTION_TEMPLATES.map((template, idx) => ({
        action_id: generateId(`act_${template.type}`),
        action_type: template.type,
        summary: template.summary,
        cost: template.cost,
        reversibility: template.type === 'wait' || template.type === 'ask'
            ? 'reversible'
            : template.type === 'commit'
                ? 'irreversible'
                : 'partially_reversible',
        risk_tags: [],
        requires_confirmation: template.type === 'commit',
    }));
}

// ============================================================================
// Utility Computation
// ============================================================================

/**
 * Compute instantaneous utility from state and goal weights
 */
function computeUtility(state: TwinState, goals: GoalStack): number {
    const weights = state.preferences.values_weights;
    if (!weights) return 0;

    const resources = state.resources;
    let utility = 0;

    // Map resources to value dimensions
    utility += weights.wealth * (resources.cash_liquid ? Math.log1p(resources.cash_liquid) / 10 : 0);
    utility += weights.freedom * (resources.time_hours_per_week ?? 40) / 40;
    utility += weights.relationships * (resources.social_capital_score ?? 0.5);
    utility += weights.stability * (1 - (resources.attention_budget_score ?? 0.5) * 0.5);

    return utility;
}

/**
 * Compute trajectory utility with discounting
 */
function computeTrajectoryUtility(
    trajectory: TwinState[],
    goals: GoalStack,
    beta: number = 0.98
): number {
    let total = 0;
    let discount = 1;

    for (const state of trajectory) {
        total += discount * computeUtility(state, goals);
        discount *= beta;
    }

    return total;
}

// ============================================================================
// Constraint Checking
// ============================================================================

/**
 * Check if a state violates hard constraints
 */
function violatesConstraints(state: TwinState, goals: GoalStack): boolean {
    const constraints = goals.hard_constraints;

    // Budget constraint
    if (constraints.max_budget !== undefined) {
        const spent = (state.resources.cash_liquid ?? 0) < 0;
        if (spent) return true;
    }

    // Time constraint
    if (constraints.min_sleep_hours !== undefined) {
        const timeLeft = state.resources.time_hours_per_week ?? 40;
        const minTime = 168 - constraints.min_sleep_hours * 7;  // Hours per week minus sleep
        if (timeLeft < minTime * 0.5) return true;
    }

    return false;
}

// ============================================================================
// Monte Carlo Rollout
// ============================================================================

/**
 * Rollout a single scenario with given action
 */
function rolloutScenario(
    initialState: TwinState,
    action: Action,
    shocks: ExogenousShock[],
    goals: GoalStack,
    horizon: number
): { utility: number; violated: boolean } {
    let state = initialState;
    const trajectory: TwinState[] = [state];
    let violated = false;

    // First step: apply the candidate action
    const executed = deriveExecutionFlag(state, action);
    state = transition(state, action, shocks[0] || {}, executed);
    trajectory.push(state);

    if (violatesConstraints(state, goals)) {
        violated = true;
    }

    // Subsequent steps: apply idle/wait
    const idleAction: Action = {
        action_id: 'idle',
        action_type: 'wait',
        summary: 'Continue',
        cost: { time_hours: 0 },
        reversibility: 'reversible',
    };

    for (let t = 1; t < horizon && t < shocks.length; t++) {
        const exec = deriveExecutionFlag(state, idleAction);
        state = transition(state, idleAction, shocks[t], exec);
        trajectory.push(state);

        if (violatesConstraints(state, goals)) {
            violated = true;
        }
    }

    const utility = computeTrajectoryUtility(trajectory, goals);
    return { utility, violated };
}

// ============================================================================
// CVaR Computation
// ============================================================================

/**
 * Compute CVaR (Conditional Value at Risk) at given percentile
 * CVaR = E[X | X <= VaR]
 */
function computeCVaR(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const cutoff = Math.floor(sorted.length * percentile);

    if (cutoff === 0) return sorted[0] || 0;

    const tail = sorted.slice(0, cutoff);
    return tail.reduce((a, b) => a + b, 0) / tail.length;
}

/**
 * Compute percentile
 */
function percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)] || 0;
}

// ============================================================================
// Main Evaluator
// ============================================================================

export interface EvaluatorOptions {
    n_scenarios?: number;
    horizon?: number;
    candidate_actions?: Action[];
}

export interface EvaluatorResult {
    ranked: ActionScore[];
    best_action: Action;
    confidence: number;
}

/**
 * Evaluate candidate actions using Monte Carlo rollouts
 */
export function evaluateActions(
    state: TwinState,
    goals: GoalStack,
    options: EvaluatorOptions = {}
): EvaluatorResult {
    const n_scenarios = options.n_scenarios ?? DEFAULT_N_SCENARIOS;
    const horizon = options.horizon ?? DEFAULT_HORIZON;
    const actions = options.candidate_actions ?? generateCandidateActions();

    // Generate shock bundle (CRN: same shocks for all actions)
    const shocks = generateShockBundle(state.uncertainty.variables, n_scenarios * horizon);

    // Risk aversion coefficient
    const rho = state.preferences.risk_aversion ?? 2.5;

    // Evaluate each action
    const scores: ActionScore[] = [];

    for (const action of actions) {
        const utilities: number[] = [];
        let violationCount = 0;

        // Monte Carlo rollouts
        for (let s = 0; s < n_scenarios; s++) {
            const scenarioShocks = shocks.slice(s * horizon, (s + 1) * horizon);
            const result = rolloutScenario(state, action, scenarioShocks, goals, horizon);

            utilities.push(result.utility);
            if (result.violated) violationCount++;
        }

        // Statistics
        const mean = utilities.reduce((a, b) => a + b, 0) / utilities.length;
        const variance = utilities.reduce((a, b) => a + (b - mean) ** 2, 0) / utilities.length;
        const std = Math.sqrt(variance);
        const p50 = percentile(utilities, 0.5);
        const p90 = percentile(utilities, 0.9);
        const cvar_90 = computeCVaR(utilities, CVAR_PERCENTILE);
        const failure_prob = violationCount / n_scenarios;

        // Risk-adjusted score: E[U] - rho * |CVaR|
        const score = mean - rho * Math.abs(cvar_90);

        scores.push({
            action,
            mean,
            std,
            p50,
            p90,
            cvar_90,
            failure_prob,
            score,
        });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Filter by hard constraint on failure probability
    const maxFailProb = goals.hard_constraints.max_failure_prob ?? 0.1;
    const feasible = scores.filter(s => s.failure_prob <= maxFailProb);

    const ranked = feasible.length > 0 ? feasible : scores;
    const best = ranked[0];

    // Confidence based on score gap
    const confidence = ranked.length > 1
        ? Math.min(0.95, 0.5 + (ranked[0].score - ranked[1].score) * 0.1)
        : 0.5;

    return {
        ranked,
        best_action: best.action,
        confidence,
    };
}

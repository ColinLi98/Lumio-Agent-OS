/**
 * Bellman Solver
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * MPC solver using Monte Carlo tree evaluation.
 * Ranks actions by risk-adjusted expected utility.
 */

import type {
    BeliefState,
    Action,
    ActionType,
    ActionScore,
    SolveResult,
    CompiledObjective,
    StateKey,
    TwinState,
    TwinParams,
    Particle,
} from './twinTypes.js';
import {
    generateScenarios,
    generateShockBundle,
    shockBundleToScenario,
    sampleParticlesStratified,
    type ScenarioSpec,
    type ScenarioBundle,
    type ShockBundle,
} from './scenarioEngine.js';
import { transition, checkFeasibility } from './transition.js';
import {
    computeRiskMetrics,
    computeRiskMetricsWeighted,
    computeRiskAdjustedScore,
    type RiskMetrics
} from './riskModels.js';
import { getMeanState, getMeanParams } from './twinBeliefStore.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_HORIZON = 8;    // 8-week horizon
const DEFAULT_SCENARIOS = 500;
const MAX_ACTIONS = 50;       // Max actions to evaluate

// ============================================================================
// Action Library
// ============================================================================

/**
 * Get action templates to evaluate
 */
export function getActionTemplates(): Action[] {
    const templates: Action[] = [];
    const types: ActionType[] = [
        'focus_work', 'focus_study', 'exercise', 'sleep_earlier',
        'networking', 'ship_milestone', 'delegate', 'drop_task',
        'reduce_spend', 'increase_savings', 'seek_mentorship',
    ];

    for (const type of types) {
        // Low intensity
        templates.push({
            action_id: `${type}_low`,
            type,
            intensity: 0.3,
        });
        // Medium intensity
        templates.push({
            action_id: `${type}_med`,
            type,
            intensity: 0.6,
        });
        // High intensity
        templates.push({
            action_id: `${type}_high`,
            type,
            intensity: 1.0,
        });
    }

    return templates;
}

// ============================================================================
// Utility Function
// ============================================================================

/**
 * Compute utility of a state given objective weights
 */
export function computeUtility(
    state: TwinState,
    objective: CompiledObjective
): number {
    const { x } = state;
    const { w } = objective;

    let utility = 0;
    for (const key of Object.keys(w) as StateKey[]) {
        utility += w[key] * x[key];
    }

    return utility;
}

/**
 * Compute discounted cumulative utility over trajectory
 */
function computeTrajectoryUtility(
    trajectory: TwinState[],
    objective: CompiledObjective
): number {
    let cumulative = 0;
    let discount = 1.0;

    for (const state of trajectory) {
        cumulative += discount * computeUtility(state, objective);
        discount *= objective.beta;
    }

    // Add terminal value
    if (trajectory.length > 0) {
        const terminal = trajectory[trajectory.length - 1];
        let terminalValue = 0;
        for (const key of Object.keys(objective.terminal_w) as StateKey[]) {
            terminalValue += objective.terminal_w[key] * terminal.x[key];
        }
        cumulative += discount * terminalValue;
    }

    return cumulative;
}

// ============================================================================
// Rollout Simulation
// ============================================================================

/**
 * Rollout a single scenario with a given action
 */
function rolloutScenario(
    initialState: TwinState,
    params: TwinParams,
    action: Action,
    scenarios: ScenarioBundle,
    scenarioIdx: number,
    horizon: number,
    objective: CompiledObjective
): number {
    const sample = scenarios.samples[scenarioIdx % scenarios.samples.length];
    let state = initialState;
    const trajectory: TwinState[] = [state];

    for (let t = 0; t < horizon; t++) {
        const executed = sample.exec_flags[t % sample.exec_flags.length];
        const shock = sample.shocks[t % sample.shocks.length];

        state = transition({
            state,
            params,
            action: t === 0 ? action : getDefaultAction(), // Action only at t=0.
            dt: 1,
            exogenous: shock,
            executed: t === 0 ? executed : true,
        });

        trajectory.push(state);
    }

    return computeTrajectoryUtility(trajectory, objective);
}

/**
 * Get default idle action for future steps
 */
function getDefaultAction(): Action {
    return {
        action_id: 'idle',
        type: 'focus_work',
        intensity: 0.3,
    };
}

// ============================================================================
// Main Solver
// ============================================================================

/**
 * Solve for best action given current belief and objective
 */
export function solve(
    belief: BeliefState,
    objective: CompiledObjective,
    options?: {
        horizon?: number;
        n_scenarios?: number;
        actions?: Action[];
    }
): SolveResult {
    const traceId = `solve_${Date.now()}`;
    const horizon = options?.horizon ?? DEFAULT_HORIZON;
    const nScenarios = options?.n_scenarios ?? DEFAULT_SCENARIOS;
    const actions = options?.actions ?? getActionTemplates();

    console.log(`[BellmanSolver] Starting solve: ${actions.length} actions, ${nScenarios} scenarios, ${horizon} steps`);

    // Get mean state/params from belief
    const meanState: TwinState = {
        t: Date.now(),
        x: getMeanState(belief),
    };
    const meanParams: TwinParams = {
        theta: getMeanParams(belief),
    };

    // Generate scenarios
    const scenarioSpec: ScenarioSpec = {
        n_scenarios: nScenarios,
        horizon_steps: horizon,
        dt: 1,
        seed: Date.now(),
    };
    const scenarios = generateScenarios(scenarioSpec, meanParams);

    // Evaluate each action
    const scored: ActionScore[] = [];

    for (const action of actions.slice(0, MAX_ACTIONS)) {
        // Check feasibility
        const feasibility = checkFeasibility(meanState, action);
        if (!feasibility.feasible) {
            scored.push({
                action,
                mean: -Infinity,
                std: 0,
                cvar: -Infinity,
                p_violate: 1,
                score: -Infinity,
                diagnostics: { reason: feasibility.reason },
            });
            continue;
        }

        // Monte Carlo rollouts
        const utilities: number[] = [];
        for (let i = 0; i < nScenarios; i++) {
            const u = rolloutScenario(meanState, meanParams, action, scenarios, i, horizon, objective);
            utilities.push(u);
        }

        // Compute risk metrics
        const baseline = computeUtility(meanState, objective);
        const metrics = computeRiskMetrics(utilities, baseline);

        // Risk-adjusted score
        const score = computeRiskAdjustedScore(metrics, objective.rho);

        scored.push({
            action,
            mean: metrics.mean,
            std: metrics.std,
            cvar: metrics.cvar_5,
            p_violate: metrics.p_violate,
            score,
        });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Build result
    const bestAction = scored[0]?.action ?? getDefaultAction();
    const confidence = computeConfidence(scored);

    console.log(`[BellmanSolver] Best action: ${bestAction.type} (score: ${scored[0]?.score.toFixed(3)})`);

    return {
        trace_id: traceId,
        best_action: bestAction,
        ranked: scored,
        confidence,
        explain: generateExplanation(scored, objective, meanState),
    };
}

// ============================================================================
// P0-3: Belief-Aware Solver (Core Upgrade)
// ============================================================================

/**
 * Belief-aware solve with particle sampling and CRN
 * This is the core P0-3 upgrade from mean-only to full belief-aware optimization
 */
export function solveBeliefAware(
    belief: BeliefState,
    objective: CompiledObjective,
    options?: {
        horizon?: number;
        n_scenarios?: number;
        n_particles?: number;
        actions?: Action[];
    }
): SolveResult {
    const traceId = `solve_belief_${Date.now()}`;
    const horizon = options?.horizon ?? DEFAULT_HORIZON;
    const nScenarios = options?.n_scenarios ?? 150;  // Reduced for perf with particles
    const nParticles = options?.n_particles ?? 80;   // P0-3: Sample particles
    const actions = options?.actions ?? getActionTemplates();

    console.log(`[BellmanSolver] Belief-aware solve: ${actions.length} actions, ${nParticles} particles, ${nScenarios} scenarios`);

    // P0-3: Sample particles from belief using stratified sampling
    const particleWeights = belief.particles.map(p => p.weight);
    const sampledIndices = sampleParticlesStratified(particleWeights, nParticles, Date.now());
    const sampledParticles = sampledIndices.map(i => belief.particles[i]);
    const sampledWeights = sampledIndices.map(i => particleWeights[i]);

    // Normalize weights for this sample
    const totalWeight = sampledWeights.reduce((a, b) => a + b, 0);
    const normWeights = sampledWeights.map(w => w / totalWeight);

    // P1-3: Generate shock bundle with CRN (independent of particle params)
    const shockSpec: ScenarioSpec = {
        n_scenarios: nScenarios,
        horizon_steps: horizon,
        dt: 1,
        seed: Date.now(),
    };
    const shockBundle = generateShockBundle(shockSpec);

    // Evaluate each action
    const scored: ActionScore[] = [];

    for (const action of actions.slice(0, MAX_ACTIONS)) {
        // Check feasibility using mean state
        const meanState: TwinState = { t: Date.now(), x: getMeanState(belief) };
        const feasibility = checkFeasibility(meanState, action);

        if (!feasibility.feasible) {
            scored.push({
                action,
                mean: -Infinity,
                std: 0,
                cvar: -Infinity,
                p_violate: 1,
                score: -Infinity,
                diagnostics: { reason: feasibility.reason },
            });
            continue;
        }

        // P0-3: Belief-aware evaluation - evaluate across particles, not just mean
        const allUtilities: number[] = [];
        const allWeights: number[] = [];

        for (let pIdx = 0; pIdx < sampledParticles.length; pIdx++) {
            const particle = sampledParticles[pIdx];
            const particleWeight = normWeights[pIdx];

            // Create particle state
            const particleState: TwinState = {
                t: Date.now(),
                x: particle.state.x,
            };
            const particleParams: TwinParams = {
                theta: particle.params.theta,
            };

            // Rollout across scenarios using CRN
            for (let sIdx = 0; sIdx < nScenarios; sIdx++) {
                // P1-3: Derive execution flags based on particle's adherence
                const scenario = shockBundleToScenario(
                    shockBundle,
                    sIdx,
                    particleParams.theta.execution_adherence
                );

                // Rollout
                const u = rolloutScenarioWithSample(
                    particleState,
                    particleParams,
                    action,
                    scenario.shocks,
                    scenario.exec_flags,
                    horizon,
                    objective
                );

                allUtilities.push(u);
                allWeights.push(particleWeight / nScenarios);  // Distribute weight across scenarios
            }
        }

        // P0-4: Use weighted risk metrics
        const baseline = computeUtility(meanState, objective);
        const metrics = computeRiskMetricsWeighted(allUtilities, allWeights, baseline);

        // Risk-adjusted score
        const score = computeRiskAdjustedScore(metrics, objective.rho);

        scored.push({
            action,
            mean: metrics.mean,
            std: metrics.std,
            cvar: metrics.cvar_5,
            p_violate: metrics.p_violate,
            score,
            // P2: Add belief-aware diagnostic info
            diagnostics: {
                n_particles: nParticles,
                n_scenarios: nScenarios,
                posterior_adherence_mean: sampledParticles.reduce((acc, p, i) =>
                    acc + normWeights[i] * p.params.theta.execution_adherence, 0
                ),
                posterior_adherence_std: Math.sqrt(sampledParticles.reduce((acc, p, i) =>
                    acc + normWeights[i] * (p.params.theta.execution_adherence -
                        sampledParticles.reduce((a, pp, j) => a + normWeights[j] * pp.params.theta.execution_adherence, 0)
                    ) ** 2, 0
                )),
            },
        });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Build result
    const bestAction = scored[0]?.action ?? getDefaultAction();
    const confidence = computeConfidence(scored);
    const meanState: TwinState = { t: Date.now(), x: getMeanState(belief) };

    console.log(`[BellmanSolver] Belief-aware best: ${bestAction.type} (score: ${scored[0]?.score.toFixed(3)})`);

    return {
        trace_id: traceId,
        best_action: bestAction,
        ranked: scored,
        confidence,
        explain: generateExplanation(scored, objective, meanState),
    };
}

/**
 * Rollout with explicit scenario sample (for CRN support)
 */
function rolloutScenarioWithSample(
    initialState: TwinState,
    params: TwinParams,
    action: Action,
    shocks: Array<{ market_return?: number; health_shock?: number; expense_shock?: number; time_shock?: number }>,
    execFlags: boolean[],
    horizon: number,
    objective: CompiledObjective
): number {
    let state = initialState;
    const trajectory: TwinState[] = [state];

    for (let t = 0; t < horizon; t++) {
        const executed = execFlags[t % execFlags.length];
        const shock = shocks[t % shocks.length];

        state = transition({
            state,
            params,
            action: t === 0 ? action : getDefaultAction(),
            dt: 1,
            exogenous: shock,
            executed: t === 0 ? executed : true,
        });

        trajectory.push(state);
    }

    return computeTrajectoryUtility(trajectory, objective);
}

// ============================================================================
// Explanation Generation
// ============================================================================

import type { DecisionExplanation, ObjectiveWeights } from './twinTypes.js';

/**
 * Generate human-readable explanation
 */
function generateExplanation(
    ranked: ActionScore[],
    objective: CompiledObjective,
    currentState: TwinState
): DecisionExplanation {
    const best = ranked[0];
    const second = ranked[1];

    const headline = getActionHeadline(best.action);

    const why: string[] = [
        `预期收益 ${(best.mean * 100).toFixed(1)}%`,
        `风险控制在可接受范围 (CVaR: ${(best.cvar * 100).toFixed(1)}%)`,
    ];

    const tradeoffs: string[] = [];
    if (second && best.score - second.score < 0.05) {
        tradeoffs.push(`${getActionLabel(second.action.type)} 也是不错的选择 (差距仅 ${((best.score - second.score) * 100).toFixed(1)}%)`);
    }

    const riskNotes: string[] = [];
    if (best.p_violate > 0.1) {
        riskNotes.push(`约 ${(best.p_violate * 100).toFixed(0)}% 概率可能未达预期`);
    }

    const sensitivity: DecisionExplanation['sensitivity'] = [];
    // Add sensitivity based on current state weaknesses
    if (currentState.x.energy < 0.4) {
        sensitivity.push({
            weight: 'energy' as keyof ObjectiveWeights,
            direction: 'increase',
            effect: '如果提高能量权重，可能推荐更多休息',
        });
    }

    const alternatives: DecisionExplanation['alternatives'] = ranked.slice(1, 4).map(r => ({
        action: r.action,
        reason: `收益 ${(r.mean * 100).toFixed(1)}%, 风险 ${(Math.abs(r.cvar) * 100).toFixed(1)}%`,
    }));

    return {
        headline,
        why,
        tradeoffs,
        risk_notes: riskNotes,
        sensitivity,
        alternatives,
        metrics: {
            mean: best.mean,
            cvar: best.cvar,
            p_violate: best.p_violate,
        },
    };
}

/**
 * Get headline for action
 */
function getActionHeadline(action: Action): string {
    const label = getActionLabel(action.type);
    const intensity = action.intensity > 0.7 ? '全力' : action.intensity > 0.4 ? '适度' : '轻度';
    return `建议: ${intensity}${label}`;
}

/**
 * Get Chinese label for action type
 */
function getActionLabel(type: ActionType): string {
    const labels: Record<ActionType, string> = {
        focus_work: '专注工作',
        focus_study: '学习提升',
        exercise: '运动健身',
        sleep_earlier: '早睡休息',
        networking: '社交拓展',
        ship_milestone: '交付里程碑',
        delegate: '任务委派',
        drop_task: '放弃低价值任务',
        reduce_spend: '减少开支',
        increase_savings: '增加储蓄',
        rebalance_portfolio: '调整投资组合',
        seek_mentorship: '寻求指导',
    };
    return labels[type] || type;
}

/**
 * Compute confidence based on score distribution
 */
function computeConfidence(ranked: ActionScore[]): number {
    if (ranked.length < 2) return 1.0;

    const best = ranked[0].score;
    const second = ranked[1].score;

    if (!isFinite(best)) return 0.1;

    // Gap between best and second best
    const gap = best - second;

    // Higher gap = higher confidence
    return Math.min(0.95, 0.5 + gap * 2);
}

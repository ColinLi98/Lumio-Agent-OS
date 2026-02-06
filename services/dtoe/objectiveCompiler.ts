/**
 * Objective Compiler - Phase 3+
 * 
 * Compiles GoalStack into a calculable Utility function.
 * Enables generalization across entity types (person/company/org/nation/project).
 * 
 * Theory: Bellman optimality + CVaR risk-adjusted reward
 */

import type {
    TwinState,
    GoalStack,
    Objective,
    MetricType,
    ValuesWeights,
    HardConstraints,
} from './coreSchemas';

// ============================================================================
// Types
// ============================================================================

export type UtilityScalar = number;

export interface CompiledObjective {
    objective_id: string;
    horizon_steps: number;
    gamma: number;                  // time discount factor
    alpha_cvar: number;             // CVaR tail level (e.g. 0.9)
    rho_risk: number;               // risk aversion coefficient
    evalUtility: (state: TwinState, ctx: UtilityContext) => UtilityScalar;
    hardConstraints: (state: TwinState) => ConstraintResult;
    // Metadata for debugging/audit
    source_objectives: Objective[];
    compiled_at_ms: number;
}

export interface UtilityContext {
    baseline: TwinState;
    time_step?: number;
}

export interface ConstraintResult {
    ok: boolean;
    violated: string[];
    margin?: Record<string, number>;  // How close to violation
}

export interface CompileObjectiveInput {
    state: TwinState;
    goals: GoalStack;
    defaults?: {
        gamma?: number;
        alpha_cvar?: number;
        rho_risk?: number;
    };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_COMPILE_OPTIONS = {
    gamma: 0.98,          // Weekly discount
    alpha_cvar: 0.9,      // CVaR at 90th percentile
    rho_risk: 0.5,        // Moderate risk aversion
};

// ============================================================================
// Metric Extractors
// ============================================================================

/**
 * Extract metric value from TwinState based on MetricType
 */
function extractMetricValue(state: TwinState, metric: MetricType): number {
    const resources = state.resources;
    const values = state.preferences.values_weights;

    switch (metric) {
        case 'wealth':
            return normalizeWealth(
                (resources.cash_liquid ?? 0) + (resources.monthly_cashflow ?? 0) * 12
            );

        case 'health':
            // Proxy: attention budget as health indicator
            return resources.attention_budget_score ?? 0.5;

        case 'freedom':
            // Time + financial freedom
            const timeFreedom = Math.min(1, (resources.time_hours_per_week ?? 40) / 60);
            const financialFreedom = normalizeWealth(resources.cash_liquid ?? 0);
            return (timeFreedom + financialFreedom) / 2;

        case 'meaning':
            // Custom metric if provided, else default
            return values?.meaning ?? 0.5;

        case 'relationships':
            return resources.social_capital_score ?? 0.5;

        case 'stability':
            // Inverse of uncertainty/volatility
            const cashflow = resources.monthly_cashflow ?? 0;
            const liquid = resources.cash_liquid ?? 0;
            const stabilityScore = liquid > 0 ? Math.min(1, (liquid / 10000) * 0.5 + (cashflow > 0 ? 0.5 : 0)) : 0;
            return stabilityScore;

        case 'custom':
            // For custom metrics, return 0.5 as neutral
            return 0.5;

        default:
            return 0.5;
    }
}

/**
 * Normalize wealth to 0-1 scale using sigmoid-like transform
 */
function normalizeWealth(amount: number): number {
    // Log-sigmoid: maps 0->0, 10k->0.5, 100k->0.75, 1M->0.9
    if (amount <= 0) return 0;
    const logAmount = Math.log10(amount + 1);
    return 1 / (1 + Math.exp(-0.5 * (logAmount - 4))); // Centered at $10k
}

// ============================================================================
// Utility Computation
// ============================================================================

/**
 * Compute raw utility from state given objectives
 */
function computeRawUtility(
    state: TwinState,
    objectives: Objective[],
    ctx: UtilityContext
): number {
    let totalUtility = 0;
    let totalWeight = 0;

    for (const obj of objectives) {
        const currentValue = extractMetricValue(state, obj.metric);
        const baselineValue = extractMetricValue(ctx.baseline, obj.metric);

        // Compute improvement over baseline
        const delta = currentValue - baselineValue;

        // Weighted contribution
        totalUtility += obj.weight * (baselineValue + delta);
        totalWeight += obj.weight;
    }

    return totalWeight > 0 ? totalUtility / totalWeight : 0;
}

/**
 * Apply time discounting
 */
function applyTimeDiscount(utility: number, timeStep: number, gamma: number): number {
    return utility * Math.pow(gamma, timeStep);
}

// ============================================================================
// Constraint Checking
// ============================================================================

/**
 * Check hard constraints against state
 */
function checkHardConstraints(
    state: TwinState,
    goalConstraints: Record<string, number | boolean | undefined>,
    stateConstraints: HardConstraints
): ConstraintResult {
    const violated: string[] = [];
    const margin: Record<string, number> = {};

    // Merge constraints (goal-level takes precedence)
    const allConstraints: Record<string, number | boolean | undefined> = {
        ...stateConstraints,
        ...goalConstraints,
    };

    // Check max_budget
    if (allConstraints.max_budget !== undefined) {
        const budget = allConstraints.max_budget as number;
        const spent = state.resources.cash_liquid !== undefined
            ? Math.max(0, 10000 - state.resources.cash_liquid) // Simplified
            : 0;
        margin['max_budget'] = budget - spent;
        if (spent > budget) {
            violated.push('max_budget');
        }
    }

    // Check max_risk_probability
    if (allConstraints.max_risk_probability !== undefined) {
        const maxRisk = allConstraints.max_risk_probability as number;
        // Estimate risk from state uncertainty
        const estimatedRisk = estimateFailureProbability(state);
        margin['max_risk_probability'] = maxRisk - estimatedRisk;
        if (estimatedRisk > maxRisk) {
            violated.push('max_risk_probability');
        }
    }

    // Check max_failure_prob
    if (allConstraints.max_failure_prob !== undefined) {
        const maxFail = allConstraints.max_failure_prob as number;
        const estimatedFail = estimateFailureProbability(state);
        margin['max_failure_prob'] = maxFail - estimatedFail;
        if (estimatedFail > maxFail) {
            violated.push('max_failure_prob');
        }
    }

    // Check deadline
    if (allConstraints.deadline_ms !== undefined) {
        const deadline = allConstraints.deadline_ms as number;
        margin['deadline_ms'] = deadline - state.timestamp_ms;
        if (state.timestamp_ms > deadline) {
            violated.push('deadline_ms');
        }
    }

    // Check min_sleep_hours (as proxy: attention budget)
    if (allConstraints.min_sleep_hours !== undefined) {
        const minSleep = allConstraints.min_sleep_hours as number;
        const attentionBudget = state.resources.attention_budget_score ?? 0.5;
        // Map attention 0-1 to sleep 4-9 hours
        const estimatedSleep = 4 + attentionBudget * 5;
        margin['min_sleep_hours'] = estimatedSleep - minSleep;
        if (estimatedSleep < minSleep) {
            violated.push('min_sleep_hours');
        }
    }

    // Check legal_compliance
    if (allConstraints.legal_compliance === true) {
        // Assume compliant unless explicitly marked otherwise
        // This is a placeholder for real compliance checking
        margin['legal_compliance'] = 1;
    }

    return {
        ok: violated.length === 0,
        violated,
        margin,
    };
}

/**
 * Estimate failure probability from state uncertainty
 */
function estimateFailureProbability(state: TwinState): number {
    // Simple estimate based on resources and uncertainty
    const liquid = state.resources.cash_liquid ?? 0;
    const cashflow = state.resources.monthly_cashflow ?? 0;

    // Low liquid + negative cashflow = higher failure risk
    if (liquid < 1000 && cashflow < 0) return 0.4;
    if (liquid < 5000 && cashflow < 0) return 0.25;
    if (liquid < 1000) return 0.2;
    if (cashflow < 0) return 0.15;

    // Check uncertainty variables
    const uncertaintyCount = state.uncertainty.variables.length;
    const baseRisk = 0.05 + uncertaintyCount * 0.02;

    return Math.min(0.5, baseRisk);
}

// ============================================================================
// Main Compiler Function
// ============================================================================

/**
 * Compile GoalStack into executable CompiledObjective
 * 
 * @param input - Compilation input including state, goals, and optional defaults
 * @returns CompiledObjective with evalUtility and hardConstraints functions
 */
export function compileObjective(input: CompileObjectiveInput): CompiledObjective {
    const { state, goals, defaults = {} } = input;

    const gamma = defaults.gamma ?? DEFAULT_COMPILE_OPTIONS.gamma;
    const alpha_cvar = defaults.alpha_cvar ?? DEFAULT_COMPILE_OPTIONS.alpha_cvar;
    const rho_risk = defaults.rho_risk ?? DEFAULT_COMPILE_OPTIONS.rho_risk;

    // Convert horizon from days to steps (assuming weekly steps)
    const horizon_steps = Math.ceil(goals.horizon_days / 7);

    // Create unique objective ID
    const objective_id = `obj_${goals.entity_id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Create evalUtility closure
    const evalUtility = (s: TwinState, ctx: UtilityContext): UtilityScalar => {
        const rawUtility = computeRawUtility(s, goals.objectives, ctx);
        const timeStep = ctx.time_step ?? 0;
        return applyTimeDiscount(rawUtility, timeStep, gamma);
    };

    // Create hardConstraints closure
    const hardConstraints = (s: TwinState): ConstraintResult => {
        return checkHardConstraints(
            s,
            goals.hard_constraints,
            state.constraints.hard
        );
    };

    return {
        objective_id,
        horizon_steps,
        gamma,
        alpha_cvar,
        rho_risk,
        evalUtility,
        hardConstraints,
        source_objectives: [...goals.objectives],
        compiled_at_ms: Date.now(),
    };
}

// ============================================================================
// Utilities for Testing/Debugging
// ============================================================================

/**
 * Create a default TwinState for testing
 */
export function createDefaultTwinState(entityId: string): TwinState {
    return {
        entity: {
            entity_id: entityId,
            entity_type: 'person',
            display_name: 'Default User',
        },
        timestamp_ms: Date.now(),
        resources: {
            time_hours_per_week: 40,
            cash_liquid: 10000,
            monthly_cashflow: 3000,
            social_capital_score: 0.5,
            attention_budget_score: 0.7,
        },
        capabilities: {
            skills: ['general'],
            execution_reliability: 0.8,
            learning_speed: 0.6,
        },
        constraints: {
            hard: {},
            soft: {},
        },
        preferences: {
            risk_aversion: 2,
            time_discount: 0.1,
            values_weights: {
                health: 0.2,
                wealth: 0.2,
                freedom: 0.2,
                meaning: 0.15,
                relationships: 0.15,
                stability: 0.1,
            },
        },
        uncertainty: {
            variables: [],
        },
        trust: {
            confidence: 0.8,
            last_verified_ms: Date.now(),
            sources: ['default'],
        },
    };
}

/**
 * Create a default GoalStack for testing
 */
export function createDefaultGoalStack(entityId: string): GoalStack {
    return {
        entity_id: entityId,
        horizon_days: 90,
        objectives: [
            { name: '财务自由', weight: 0.4, metric: 'wealth' },
            { name: '身心健康', weight: 0.2, metric: 'health' },
            { name: '时间自由', weight: 0.2, metric: 'freedom' },
            { name: '人生意义', weight: 0.2, metric: 'meaning' },
        ],
        hard_constraints: {
            max_failure_prob: 0.3,
            legal_compliance: true,
        },
    };
}

/**
 * Validate compiled objective structure
 */
export function validateCompiledObjective(obj: CompiledObjective): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!obj.objective_id) errors.push('missing objective_id');
    if (typeof obj.horizon_steps !== 'number' || obj.horizon_steps <= 0) {
        errors.push('invalid horizon_steps');
    }
    if (typeof obj.gamma !== 'number' || obj.gamma <= 0 || obj.gamma > 1) {
        errors.push('gamma must be in (0, 1]');
    }
    if (typeof obj.alpha_cvar !== 'number' || obj.alpha_cvar < 0 || obj.alpha_cvar > 1) {
        errors.push('alpha_cvar must be in [0, 1]');
    }
    if (typeof obj.rho_risk !== 'number' || obj.rho_risk < 0) {
        errors.push('rho_risk must be >= 0');
    }
    if (typeof obj.evalUtility !== 'function') errors.push('missing evalUtility function');
    if (typeof obj.hardConstraints !== 'function') errors.push('missing hardConstraints function');

    return { valid: errors.length === 0, errors };
}

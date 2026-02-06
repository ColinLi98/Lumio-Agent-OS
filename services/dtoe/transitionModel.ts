/**
 * Transition Model - Phase 3 v0.1
 * State transition dynamics for the digital twin
 *
 * Maps (state, action, shock) → next_state
 */

import type {
    TwinState,
    Action,
    UncertaintyVariable,
} from './coreSchemas';

// ============================================================================
// Exogenous Shocks
// ============================================================================

export interface ExogenousShock {
    market_return?: number;
    health_delta?: number;
    expense_shock?: number;
    time_shock?: number;
    opportunity_shock?: number;
}

// ============================================================================
// Sampling from Uncertainty Distributions
// ============================================================================

/**
 * Sample from a normal distribution using Box-Muller
 */
function sampleNormal(mu: number, sigma: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mu + sigma * z;
}

/**
 * Sample from a lognormal distribution
 */
function sampleLognormal(mu: number, sigma: number): number {
    return Math.exp(sampleNormal(mu, sigma));
}

/**
 * Sample from a Bernoulli distribution
 */
function sampleBernoulli(p: number): number {
    return Math.random() < p ? 1 : 0;
}

/**
 * Sample from empirical samples (bootstrap)
 */
function sampleEmpirical(samples: number[]): number {
    if (samples.length === 0) return 0;
    const idx = Math.floor(Math.random() * samples.length);
    return samples[idx];
}

/**
 * Sample from an uncertainty variable
 */
export function sampleVariable(variable: UncertaintyVariable): number {
    const params = variable.params || {};

    switch (variable.dist_type) {
        case 'normal':
            return sampleNormal(params.mu ?? 0, params.sigma ?? 1);

        case 'lognormal':
            return sampleLognormal(params.mu ?? 0, params.sigma ?? 0.5);

        case 'bernoulli':
            return sampleBernoulli(params.p ?? 0.5);

        case 'empirical_samples':
            return sampleEmpirical(variable.samples || []);

        default:
            return 0;
    }
}

/**
 * Sample all uncertainty variables into a shock bundle
 */
export function sampleShockBundle(variables: UncertaintyVariable[]): Record<string, number> {
    const bundle: Record<string, number> = {};
    for (const v of variables) {
        bundle[v.name] = sampleVariable(v);
    }
    return bundle;
}

// ============================================================================
// Action Effects
// ============================================================================

interface ActionEffect {
    resource_deltas: Record<string, number>;
    execution_probability: number;
}

/**
 * Get the expected effects of an action
 */
function getActionEffects(action: Action, state: TwinState): ActionEffect {
    const reliability = state.capabilities?.execution_reliability ?? 0.7;

    // Base effects by action type
    switch (action.action_type) {
        case 'do':
            return {
                resource_deltas: {
                    time_hours_per_week: -(action.cost.time_hours || 0),
                    cash_liquid: -(action.cost.money || 0),
                    attention_budget_score: -(action.cost.cognitive_load || 0) * 0.1,
                },
                execution_probability: reliability,
            };

        case 'ask':
            return {
                resource_deltas: {
                    time_hours_per_week: -0.5,
                    social_capital_score: -0.01,
                },
                execution_probability: 0.95,  // Asking is easy to execute
            };

        case 'wait':
            return {
                resource_deltas: {
                    time_hours_per_week: -1,   // Time passes
                    attention_budget_score: 0.05,  // Recover attention
                },
                execution_probability: 1.0,  // Always succeeds
            };

        case 'commit':
            return {
                resource_deltas: {
                    time_hours_per_week: -(action.cost.time_hours || 2),
                    cash_liquid: -(action.cost.money || 0),
                },
                execution_probability: reliability * 0.9,  // Slightly harder
            };

        default:
            return {
                resource_deltas: {},
                execution_probability: 0.5,
            };
    }
}

// ============================================================================
// State Transition
// ============================================================================

/**
 * Apply an action and shock to produce the next state
 */
export function transition(
    state: TwinState,
    action: Action,
    shock: ExogenousShock,
    executed: boolean
): TwinState {
    const effects = getActionEffects(action, state);

    // Clone resources
    const newResources = { ...state.resources };

    // Apply action effects only if executed
    if (executed) {
        for (const [key, delta] of Object.entries(effects.resource_deltas)) {
            const current = newResources[key] ?? 0;
            newResources[key] = Math.max(0, Math.min(1, current + delta));
        }
    }

    // Apply exogenous shocks
    if (shock.market_return !== undefined && newResources.cash_liquid !== undefined) {
        newResources.cash_liquid *= (1 + shock.market_return);
    }

    if (shock.health_delta !== undefined) {
        // Health shock affects attention and time
        newResources.attention_budget_score = Math.max(0,
            (newResources.attention_budget_score ?? 0.5) + shock.health_delta * 0.1
        );
    }

    if (shock.expense_shock !== undefined && newResources.cash_liquid !== undefined) {
        newResources.cash_liquid = Math.max(0,
            newResources.cash_liquid - shock.expense_shock
        );
    }

    if (shock.time_shock !== undefined) {
        newResources.time_hours_per_week = Math.max(0,
            (newResources.time_hours_per_week ?? 40) - shock.time_shock
        );
    }

    // Clamp normalized scores to [0, 1]
    for (const key of ['social_capital_score', 'attention_budget_score']) {
        if (newResources[key] !== undefined) {
            newResources[key] = Math.max(0, Math.min(1, newResources[key]!));
        }
    }

    return {
        ...state,
        timestamp_ms: state.timestamp_ms + 7 * 24 * 60 * 60 * 1000,  // +1 week
        resources: newResources,
        trust: {
            ...state.trust,
            last_verified_ms: Date.now(),
        },
    };
}

/**
 * Determine if action is executed based on adherence probability
 */
export function deriveExecutionFlag(
    state: TwinState,
    action: Action
): boolean {
    const effects = getActionEffects(action, state);
    return Math.random() < effects.execution_probability;
}

/**
 * Generate N shock samples for Monte Carlo
 */
export function generateShockBundle(
    variables: UncertaintyVariable[],
    n_samples: number
): ExogenousShock[] {
    const shocks: ExogenousShock[] = [];

    for (let i = 0; i < n_samples; i++) {
        const bundle = sampleShockBundle(variables);

        shocks.push({
            market_return: bundle['market_return'] ?? sampleNormal(0.07 / 52, 0.15 / Math.sqrt(52)),
            health_delta: bundle['health_delta'] ?? sampleNormal(0, 0.05),
            expense_shock: bundle['expense_shock'] ?? (Math.random() < 0.05 ? sampleLognormal(5, 1) : 0),
            time_shock: bundle['time_shock'] ?? sampleNormal(0, 2),
        });
    }

    return shocks;
}

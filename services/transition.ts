/**
 * Transition Model
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * State transition dynamics for simulation rollouts.
 * Maps (state, action, shock, executed) → next_state
 */

import type {
    TwinState,
    TwinParams,
    Action,
    ActionType,
    ExogenousShock,
    TransitionInput,
    StateKey,
} from './twinTypes';

// ============================================================================
// Transition Function
// ============================================================================

/**
 * Compute next state from current state, action, and exogenous factors
 */
export function transition(input: TransitionInput): TwinState {
    const { state, params, action, dt, exogenous, executed } = input;
    const { x } = state;
    const { theta } = params;

    // Execution damping: if action not executed, effect is heavily reduced
    const execK = executed ? 1.0 : 0.2;

    // Start with current state
    const next: Record<StateKey, number> = { ...x };

    // Apply action effects
    const effects = getActionEffects(action.type, action.intensity * execK);
    for (const [key, delta] of Object.entries(effects)) {
        next[key as StateKey] += delta * dt;
    }

    // Apply exogenous shocks
    if (exogenous.market_return !== undefined) {
        next.wealth += exogenous.market_return * x.wealth * 0.3;  // 30% exposed to market
    }
    if (exogenous.health_shock !== undefined) {
        next.health += exogenous.health_shock;
        next.energy += exogenous.health_shock * 0.5;
    }
    if (exogenous.time_shock !== undefined) {
        next.time_buffer += exogenous.time_shock;
        next.stress -= exogenous.time_shock * 0.3;
    }
    if (exogenous.expense_shock !== undefined) {
        next.wealth -= exogenous.expense_shock * 0.1;  // Normalized impact
        next.stress += exogenous.expense_shock * 0.2;
    }

    // Natural dynamics (mean reversion, decay)
    next.energy = next.energy * 0.95 + 0.05 * 0.6;  // Mean-revert to 0.6
    next.stress = next.stress * 0.9 + 0.1 * theta.stress_sensitivity * 0.4;
    next.health += theta.health_recovery * dt * 0.05;  // Slow recovery

    // Cost deductions from action
    if (action.cost_money && executed) {
        next.wealth -= action.cost_money * 0.0001;  // Normalized
    }

    // Clamp all values to [0, 1]
    for (const key of Object.keys(next) as StateKey[]) {
        next[key] = clamp(next[key]);
    }

    return {
        t: state.t + dt,
        x: next,
    };
}

// ============================================================================
// Action Effects
// ============================================================================

/**
 * Get state effects for each action type
 */
function getActionEffects(
    type: ActionType,
    intensity: number
): Partial<Record<StateKey, number>> {
    const I = intensity;

    switch (type) {
        case 'focus_work':
            return {
                career: 0.02 * I,
                skill: 0.01 * I,
                energy: -0.03 * I,
                stress: 0.02 * I,
            };

        case 'focus_study':
            return {
                skill: 0.03 * I,
                career: 0.005 * I,
                energy: -0.02 * I,
                optionality: 0.01 * I,
            };

        case 'exercise':
            return {
                health: 0.03 * I,
                energy: 0.02 * I,
                stress: -0.03 * I,
            };

        case 'sleep_earlier':
            return {
                health: 0.02 * I,
                energy: 0.04 * I,
                stress: -0.02 * I,
                time_buffer: -0.01 * I,
            };

        case 'networking':
            return {
                social: 0.03 * I,
                reputation: 0.01 * I,
                career: 0.01 * I,
                energy: -0.02 * I,
            };

        case 'ship_milestone':
            return {
                career: 0.04 * I,
                reputation: 0.02 * I,
                stress: 0.03 * I,
                energy: -0.04 * I,
                optionality: 0.02 * I,
            };

        case 'delegate':
            return {
                time_buffer: 0.03 * I,
                stress: -0.02 * I,
                wealth: -0.01 * I,  // Cost of delegation
            };

        case 'drop_task':
            return {
                time_buffer: 0.04 * I,
                stress: -0.03 * I,
                reputation: -0.01 * I,
                optionality: 0.01 * I,
            };

        case 'reduce_spend':
            return {
                wealth: 0.02 * I,
                stress: 0.01 * I,  // Slight stress from frugality
            };

        case 'increase_savings':
            return {
                wealth: 0.03 * I,
                optionality: 0.01 * I,
                stress: 0.005 * I,
            };

        case 'rebalance_portfolio':
            return {
                optionality: 0.01 * I,
                stress: -0.01 * I,
            };

        case 'seek_mentorship':
            return {
                skill: 0.02 * I,
                career: 0.02 * I,
                social: 0.01 * I,
                optionality: 0.02 * I,
            };

        default:
            return {};
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp value to [0, 1]
 */
function clamp(value: number, min: number = 0, max: number = 1): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Compute total action cost (time and money)
 */
export function computeActionCost(action: Action): {
    time_cost: number;
    money_cost: number;
} {
    const timeCost = (action.duration_min ?? 60) / 60;  // Hours
    const moneyCost = action.cost_money ?? 0;
    return { time_cost: timeCost, money_cost: moneyCost };
}

/**
 * Check if action is feasible given current state
 */
export function checkFeasibility(
    state: TwinState,
    action: Action
): { feasible: boolean; reason?: string } {
    // Energy check
    if (state.x.energy < 0.1 && ['focus_work', 'exercise', 'networking'].includes(action.type)) {
        return { feasible: false, reason: '能量太低，建议先休息' };
    }

    // Health check
    if (state.x.health < 0.2 && ['focus_work', 'ship_milestone'].includes(action.type)) {
        return { feasible: false, reason: '健康状况不佳，建议优先恢复' };
    }

    // Stress check
    if (state.x.stress > 0.8 && ['focus_work', 'ship_milestone'].includes(action.type)) {
        return { feasible: false, reason: '压力过高，建议先放松' };
    }

    return { feasible: true };
}

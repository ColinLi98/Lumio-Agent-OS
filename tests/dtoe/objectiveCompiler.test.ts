/**
 * Objective Compiler Tests
 * Phase 3+ PR-01
 * 
 * Tests:
 * 1. Snapshot: default parameters produce stable output
 * 2. Monotonicity: wealth weight ↑ → utility doesn't decrease with wealth gain
 * 3. Constraints: violated keys returned correctly (≥5 cases)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    compileObjective,
    createDefaultTwinState,
    createDefaultGoalStack,
    validateCompiledObjective,
    DEFAULT_COMPILE_OPTIONS,
    type CompiledObjective,
} from '../../services/dtoe/objectiveCompiler';
import type { TwinState, GoalStack } from '../../services/dtoe/coreSchemas';

describe('compileObjective', () => {
    let baseState: TwinState;
    let baseGoals: GoalStack;

    beforeEach(() => {
        baseState = createDefaultTwinState('test_user');
        baseGoals = createDefaultGoalStack('test_user');
    });

    describe('snapshot stability', () => {
        it('should produce stable structure with default parameters', () => {
            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
            });

            // Structure validation
            expect(compiled.objective_id).toMatch(/^obj_test_user_/);
            expect(compiled.horizon_steps).toBe(13); // 90 days / 7 = 13 weeks
            expect(compiled.gamma).toBe(DEFAULT_COMPILE_OPTIONS.gamma);
            expect(compiled.alpha_cvar).toBe(DEFAULT_COMPILE_OPTIONS.alpha_cvar);
            expect(compiled.rho_risk).toBe(DEFAULT_COMPILE_OPTIONS.rho_risk);
            expect(compiled.source_objectives).toHaveLength(4);
            expect(typeof compiled.evalUtility).toBe('function');
            expect(typeof compiled.hardConstraints).toBe('function');
        });

        it('should pass validation', () => {
            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
            });

            const validation = validateCompiledObjective(compiled);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('should respect custom defaults', () => {
            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
                defaults: {
                    gamma: 0.95,
                    alpha_cvar: 0.95,
                    rho_risk: 0.8,
                },
            });

            expect(compiled.gamma).toBe(0.95);
            expect(compiled.alpha_cvar).toBe(0.95);
            expect(compiled.rho_risk).toBe(0.8);
        });
    });

    describe('evalUtility monotonicity', () => {
        it('should increase utility when wealth increases (wealth-weighted objective)', () => {
            // Create wealth-heavy goal
            const wealthGoals: GoalStack = {
                ...baseGoals,
                objectives: [{ name: 'Wealth', weight: 1.0, metric: 'wealth' }],
            };

            const compiled = compileObjective({
                state: baseState,
                goals: wealthGoals,
            });

            // Low wealth state
            const lowWealthState = {
                ...baseState,
                resources: { ...baseState.resources, cash_liquid: 1000 },
            };

            // High wealth state
            const highWealthState = {
                ...baseState,
                resources: { ...baseState.resources, cash_liquid: 100000 },
            };

            const ctx = { baseline: baseState };
            const lowUtility = compiled.evalUtility(lowWealthState, ctx);
            const highUtility = compiled.evalUtility(highWealthState, ctx);

            expect(highUtility).toBeGreaterThan(lowUtility);
        });

        it('should increase utility with higher freedom (time + financial)', () => {
            const freedomGoals: GoalStack = {
                ...baseGoals,
                objectives: [{ name: 'Freedom', weight: 1.0, metric: 'freedom' }],
            };

            const compiled = compileObjective({
                state: baseState,
                goals: freedomGoals,
            });

            // Low freedom: low time, low cash
            const lowFreedomState = {
                ...baseState,
                resources: { ...baseState.resources, time_hours_per_week: 10, cash_liquid: 500 },
            };

            // High freedom: high time, high cash
            const highFreedomState = {
                ...baseState,
                resources: { ...baseState.resources, time_hours_per_week: 60, cash_liquid: 50000 },
            };

            const ctx = { baseline: baseState };
            const lowUtility = compiled.evalUtility(lowFreedomState, ctx);
            const highUtility = compiled.evalUtility(highFreedomState, ctx);

            expect(highUtility).toBeGreaterThan(lowUtility);
        });

        it('should increase utility with better health (attention budget)', () => {
            const healthGoals: GoalStack = {
                ...baseGoals,
                objectives: [{ name: 'Health', weight: 1.0, metric: 'health' }],
            };

            const compiled = compileObjective({
                state: baseState,
                goals: healthGoals,
            });

            const lowHealthState = {
                ...baseState,
                resources: { ...baseState.resources, attention_budget_score: 0.2 },
            };

            const highHealthState = {
                ...baseState,
                resources: { ...baseState.resources, attention_budget_score: 0.9 },
            };

            const ctx = { baseline: baseState };
            const lowUtility = compiled.evalUtility(lowHealthState, ctx);
            const highUtility = compiled.evalUtility(highHealthState, ctx);

            expect(highUtility).toBeGreaterThan(lowUtility);
        });

        it('should apply time discounting correctly', () => {
            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
                defaults: { gamma: 0.9 },
            });

            const ctx0 = { baseline: baseState, time_step: 0 };
            const ctx5 = { baseline: baseState, time_step: 5 };

            const utility0 = compiled.evalUtility(baseState, ctx0);
            const utility5 = compiled.evalUtility(baseState, ctx5);

            // utility5 should be discounted by 0.9^5
            expect(utility5).toBeCloseTo(utility0 * Math.pow(0.9, 5), 5);
        });

        it('should weight objectives correctly', () => {
            // All wealth
            const wealthOnlyGoals: GoalStack = {
                ...baseGoals,
                objectives: [{ name: 'Wealth', weight: 1.0, metric: 'wealth' }],
            };

            // All health
            const healthOnlyGoals: GoalStack = {
                ...baseGoals,
                objectives: [{ name: 'Health', weight: 1.0, metric: 'health' }],
            };

            const wealthCompiled = compileObjective({ state: baseState, goals: wealthOnlyGoals });
            const healthCompiled = compileObjective({ state: baseState, goals: healthOnlyGoals });

            // State with high wealth, low health
            const mixedState = {
                ...baseState,
                resources: {
                    ...baseState.resources,
                    cash_liquid: 100000,
                    attention_budget_score: 0.3,
                },
            };

            const ctx = { baseline: baseState };
            const wealthUtility = wealthCompiled.evalUtility(mixedState, ctx);
            const healthUtility = healthCompiled.evalUtility(mixedState, ctx);

            // Wealth objective should score higher for this state
            expect(wealthUtility).toBeGreaterThan(healthUtility);
        });
    });

    describe('hardConstraints', () => {
        it('should return ok when no constraints violated', () => {
            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
            });

            const result = compiled.hardConstraints(baseState);
            expect(result.ok).toBe(true);
            expect(result.violated).toHaveLength(0);
        });

        it('should detect max_failure_prob violation', () => {
            const strictGoals: GoalStack = {
                ...baseGoals,
                hard_constraints: { max_failure_prob: 0.01 },
            };

            const riskyState = {
                ...baseState,
                resources: { ...baseState.resources, cash_liquid: 100, monthly_cashflow: -500 },
            };

            const compiled = compileObjective({
                state: baseState,
                goals: strictGoals,
            });

            const result = compiled.hardConstraints(riskyState);
            expect(result.ok).toBe(false);
            expect(result.violated).toContain('max_failure_prob');
        });

        it('should detect deadline violation', () => {
            const deadlineGoals: GoalStack = {
                ...baseGoals,
                hard_constraints: { deadline_ms: Date.now() - 1000 }, // Past deadline
            };

            const compiled = compileObjective({
                state: baseState,
                goals: deadlineGoals,
            });

            const result = compiled.hardConstraints(baseState);
            expect(result.ok).toBe(false);
            expect(result.violated).toContain('deadline_ms');
        });

        it('should detect min_sleep_hours violation', () => {
            const sleepGoals: GoalStack = {
                ...baseGoals,
                hard_constraints: { min_sleep_hours: 9 },
            };

            // Low attention = low estimated sleep
            const tiredState = {
                ...baseState,
                resources: { ...baseState.resources, attention_budget_score: 0.1 },
            };

            const compiled = compileObjective({
                state: baseState,
                goals: sleepGoals,
            });

            const result = compiled.hardConstraints(tiredState);
            expect(result.ok).toBe(false);
            expect(result.violated).toContain('min_sleep_hours');
        });

        it('should detect max_risk_probability violation', () => {
            const lowRiskGoals: GoalStack = {
                ...baseGoals,
                hard_constraints: { max_risk_probability: 0.05 },
            };

            // Very risky state
            const riskyState = {
                ...baseState,
                resources: { ...baseState.resources, cash_liquid: 0, monthly_cashflow: -1000 },
            };

            const compiled = compileObjective({
                state: baseState,
                goals: lowRiskGoals,
            });

            const result = compiled.hardConstraints(riskyState);
            expect(result.ok).toBe(false);
            expect(result.violated).toContain('max_risk_probability');
        });

        it('should provide margin information', () => {
            const goalsWithConstraints: GoalStack = {
                ...baseGoals,
                hard_constraints: {
                    max_failure_prob: 0.5,
                    min_sleep_hours: 5,
                },
            };

            const compiled = compileObjective({
                state: baseState,
                goals: goalsWithConstraints,
            });

            const result = compiled.hardConstraints(baseState);
            expect(result.margin).toBeDefined();
            expect(typeof result.margin!['max_failure_prob']).toBe('number');
            expect(typeof result.margin!['min_sleep_hours']).toBe('number');
        });
    });

    describe('edge cases', () => {
        it('should handle empty objectives gracefully', () => {
            const emptyGoals: GoalStack = {
                ...baseGoals,
                objectives: [],
            };

            const compiled = compileObjective({
                state: baseState,
                goals: emptyGoals,
            });

            const utility = compiled.evalUtility(baseState, { baseline: baseState });
            expect(utility).toBe(0); // No objectives = 0 utility
        });

        it('should handle zero resources', () => {
            const zeroState: TwinState = {
                ...baseState,
                resources: {},
            };

            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
            });

            // Should not throw
            expect(() => compiled.evalUtility(zeroState, { baseline: baseState })).not.toThrow();
        });

        it('should handle negative cashflow', () => {
            const negativeState = {
                ...baseState,
                resources: { ...baseState.resources, monthly_cashflow: -5000 },
            };

            const compiled = compileObjective({
                state: baseState,
                goals: baseGoals,
            });

            // Should not throw, utility should be lower
            const negativeUtility = compiled.evalUtility(negativeState, { baseline: baseState });
            const normalUtility = compiled.evalUtility(baseState, { baseline: baseState });

            expect(negativeUtility).toBeLessThanOrEqual(normalUtility);
        });
    });
});

describe('validateCompiledObjective', () => {
    it('should reject invalid gamma', () => {
        const invalid = {
            objective_id: 'test',
            horizon_steps: 10,
            gamma: 1.5, // Invalid
            alpha_cvar: 0.9,
            rho_risk: 0.5,
            evalUtility: () => 0,
            hardConstraints: () => ({ ok: true, violated: [] }),
            source_objectives: [],
            compiled_at_ms: Date.now(),
        };

        const result = validateCompiledObjective(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('gamma must be in (0, 1]');
    });

    it('should reject negative rho_risk', () => {
        const invalid = {
            objective_id: 'test',
            horizon_steps: 10,
            gamma: 0.98,
            alpha_cvar: 0.9,
            rho_risk: -0.5, // Invalid
            evalUtility: () => 0,
            hardConstraints: () => ({ ok: true, violated: [] }),
            source_objectives: [],
            compiled_at_ms: Date.now(),
        };

        const result = validateCompiledObjective(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('rho_risk must be >= 0');
    });
});

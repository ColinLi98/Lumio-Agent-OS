/**
 * Bellman Solver Tests
 * Phase 3 v0.2
 */

import { describe, it, expect } from 'vitest';
import {
    solveBellman,
    quickSolve,
    solveBellmanWithOptions,
    generateCandidateActions,
    ACTION_TEMPLATES,
    clearSolverCache,
    getCacheStats,
} from '../../services/dtoe/bellmanSolver';
import { createBeliefState } from '../../services/dtoe/twinBeliefStore';
import { createDefaultGoalStack } from '../../services/dtoe/coreSchemas';

// ============================================================================
// Action Template Tests
// ============================================================================

describe('generateCandidateActions', () => {
    it('should generate correct number of actions from templates', () => {
        const actions = generateCandidateActions();
        expect(actions.length).toBe(ACTION_TEMPLATES.length);
    });

    it('should include all action types', () => {
        const actions = generateCandidateActions();
        const types = new Set(actions.map((a) => a.action_type));

        expect(types.has('do')).toBe(true);
        expect(types.has('ask')).toBe(true);
        expect(types.has('wait')).toBe(true);
        expect(types.has('commit')).toBe(true);
    });
});

// ============================================================================
// Solver Tests
// ============================================================================

describe('solveBellman', () => {
    it('should return ranked actions sorted by score', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');

        const result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        expect(result.ranked_actions.length).toBeGreaterThan(0);

        // Check sorted by score (eligible first, then by score desc)
        for (let i = 0; i < result.ranked_actions.length - 1; i++) {
            const curr = result.ranked_actions[i];
            const next = result.ranked_actions[i + 1];

            if (curr.eligible === next.eligible) {
                expect(curr.score).toBeGreaterThanOrEqual(next.score);
            }
        }
    });

    it('should have CVaR <= mean for all actions', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');

        const result = solveBellman(belief, goals, { n_scenarios: 500, seed: 42 });

        for (const score of result.ranked_actions) {
            // CVaR is the tail expectation - should be <= mean by definition
            expect(score.cvar_90).toBeLessThanOrEqual(score.mean_utility + 0.001);
        }
    });

    it('should produce stable Top1 with fixed seed', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');

        const result1 = solveBellman(belief, goals, { n_scenarios: 500, seed: 42 });
        const result2 = solveBellman(belief, goals, { n_scenarios: 500, seed: 42 });

        const top1_1 = result1.ranked_actions.find((s) => s.eligible);
        const top1_2 = result2.ranked_actions.find((s) => s.eligible);

        expect(top1_1?.action.action_type).toBe(top1_2?.action.action_type);
    });
});

// ============================================================================
// Constraint Filtering Tests
// ============================================================================

describe('constraint filtering', () => {
    it('should mark actions violating constraints as ineligible', () => {
        const belief = createBeliefState('user_1', 42, 100);

        // Set very low cash
        for (const p of belief.particles) {
            p.state.resources.cash_liquid = 0;
        }

        const goals = createDefaultGoalStack('user_1');

        const result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        // Actions requiring money should be ineligible
        const expensiveActions = result.ranked_actions.filter(
            (s) => (s.action.cost.money ?? 0) > 0
        );

        for (const action of expensiveActions) {
            expect(action.eligible).toBe(false);
        }
    });
});

// ============================================================================
// Quick Solve Tests
// ============================================================================

describe('quickSolve', () => {
    it('should use reduced workload compared with full solve', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');

        const full = solveBellman(belief, goals, { n_scenarios: 1000, horizon: 4, seed: 42 });
        const quick = quickSolve(belief, goals, { seed: 42 });

        expect(quick.ranked_actions.length).toBeGreaterThan(0);
        expect(quick.n_scenarios).toBeLessThan(full.n_scenarios);
        expect(quick.horizon).toBeLessThan(full.horizon);
    });
});

// ============================================================================
// Cache Stats Tests
// ============================================================================

describe('solver cache stats', () => {
    it('should track hit/miss/hit_rate', () => {
        clearSolverCache();

        const belief = createBeliefState('user_cache', 42, 100);
        const goals = createDefaultGoalStack('user_cache');

        const first = solveBellmanWithOptions(
            belief,
            goals,
            {
                time_budget_ms: 1000,
                coarse_scenarios: 50,
                fine_scenarios: 100,
                cache: { enabled: true, ttl_ms: 300000 },
            },
            { seed: 42 }
        );

        const statsAfterFirst = getCacheStats();
        expect(first.cache_hit).toBe(false);
        expect(statsAfterFirst.misses).toBeGreaterThanOrEqual(1);

        const second = solveBellmanWithOptions(
            belief,
            goals,
            {
                time_budget_ms: 1000,
                coarse_scenarios: 50,
                fine_scenarios: 100,
                cache: { enabled: true, ttl_ms: 300000 },
            },
            { seed: 42 }
        );

        const statsAfterSecond = getCacheStats();
        expect(second.cache_hit).toBe(true);
        expect(statsAfterSecond.hits).toBeGreaterThanOrEqual(1);
        expect(statsAfterSecond.hit_rate).toBeGreaterThan(0);
    });
});

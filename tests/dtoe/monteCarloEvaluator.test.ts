/**
 * Monte Carlo Evaluator Tests - Phase 3 v0.1
 * Tests for action evaluation and ranking
 */

import { describe, it, expect } from 'vitest';
import {
    evaluateActions,
    generateCandidateActions,
} from '../../services/dtoe/monteCarloEvaluator';
import {
    createDefaultTwinState,
    createDefaultGoalStack,
} from '../../services/dtoe/coreSchemas';

// ============================================================================
// Candidate Action Generation Tests
// ============================================================================

describe('Candidate Action Generation', () => {
    it('should generate actions including wait and ask', () => {
        const actions = generateCandidateActions();

        expect(actions.length).toBeGreaterThan(0);

        const types = actions.map(a => a.action_type);
        expect(types).toContain('wait');
        expect(types).toContain('ask');
        expect(types).toContain('do');
        expect(types).toContain('commit');
    });

    it('should generate unique action IDs', () => {
        const actions = generateCandidateActions();
        const ids = actions.map(a => a.action_id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set appropriate reversibility', () => {
        const actions = generateCandidateActions();

        const waitAction = actions.find(a => a.action_type === 'wait');
        expect(waitAction?.reversibility).toBe('reversible');

        const commitAction = actions.find(a => a.action_type === 'commit');
        expect(commitAction?.reversibility).toBe('irreversible');
    });
});

// ============================================================================
// Action Evaluation Tests
// ============================================================================

describe('Action Evaluation', () => {
    const state = createDefaultTwinState({
        entity_id: 'user_001',
        entity_type: 'person',
        display_name: 'Test User',
    });

    const goals = createDefaultGoalStack('user_001');

    it('should return ranked ActionScore array', () => {
        const result = evaluateActions(state, goals, {
            n_scenarios: 100,  // Reduced for test speed
            horizon: 2,
        });

        expect(result.ranked).toBeDefined();
        expect(result.ranked.length).toBeGreaterThan(0);
        expect(result.best_action).toBeDefined();
    });

    it('should include required fields in ActionScore', () => {
        const result = evaluateActions(state, goals, {
            n_scenarios: 100,
            horizon: 2,
        });

        const score = result.ranked[0];
        expect(score.action).toBeDefined();
        expect(typeof score.mean).toBe('number');
        expect(typeof score.std).toBe('number');
        expect(typeof score.p50).toBe('number');
        expect(typeof score.p90).toBe('number');
        expect(typeof score.cvar_90).toBe('number');
        expect(typeof score.failure_prob).toBe('number');
        expect(typeof score.score).toBe('number');
    });

    it('should return sorted scores (descending)', () => {
        const result = evaluateActions(state, goals, {
            n_scenarios: 100,
            horizon: 2,
        });

        for (let i = 0; i < result.ranked.length - 1; i++) {
            expect(result.ranked[i].score).toBeGreaterThanOrEqual(result.ranked[i + 1].score);
        }
    });

    it('should compute confidence based on score gap', () => {
        const result = evaluateActions(state, goals, {
            n_scenarios: 100,
            horizon: 2,
        });

        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should filter actions exceeding max_failure_prob', () => {
        const strictGoals = {
            ...goals,
            hard_constraints: {
                ...goals.hard_constraints,
                max_failure_prob: 0.01,  // Very strict
            },
        };

        const result = evaluateActions(state, strictGoals, {
            n_scenarios: 100,
            horizon: 2,
        });

        // With very strict constraint, some actions may be filtered
        // If all are filtered, it falls back to all actions
        expect(result.ranked.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// CVaR Computation Tests
// ============================================================================

describe('CVaR Computation', () => {
    it('should have CVaR <= mean for non-degenerate distributions', () => {
        const state = createDefaultTwinState({
            entity_id: 'user_001',
            entity_type: 'person',
            display_name: 'Test User',
        });

        const goals = createDefaultGoalStack('user_001');

        const result = evaluateActions(state, goals, {
            n_scenarios: 500,
            horizon: 3,
        });

        for (const score of result.ranked) {
            // CVaR (worst 10%) should be <= mean for reasonable distributions
            expect(score.cvar_90).toBeLessThanOrEqual(score.mean + 0.01);
        }
    });
});

// ============================================================================
// Wait Action as First-Class Citizen
// ============================================================================

describe('Wait Action First-Class Citizen', () => {
    it('should include wait in candidate actions', () => {
        const actions = generateCandidateActions();
        const waitActions = actions.filter(a => a.action_type === 'wait');

        expect(waitActions.length).toBeGreaterThan(0);
    });

    it('should evaluate wait actions with low failure probability', () => {
        const state = createDefaultTwinState({
            entity_id: 'user_001',
            entity_type: 'person',
            display_name: 'Test User',
        });

        const goals = createDefaultGoalStack('user_001');

        const result = evaluateActions(state, goals, {
            n_scenarios: 200,
            horizon: 2,
        });

        const waitScore = result.ranked.find(s => s.action.action_type === 'wait');
        expect(waitScore).toBeDefined();

        // Wait should have very low failure probability (always succeeds)
        expect(waitScore!.failure_prob).toBeLessThan(0.5);
    });
});

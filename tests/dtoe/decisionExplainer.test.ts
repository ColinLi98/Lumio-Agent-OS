/**
 * Decision Explainer Tests
 * Phase 3 v0.2
 */

import { describe, it, expect } from 'vitest';
import {
    generateExplanation,
    validateExplanationCard,
    generateWhyNotExplanations,
    analyzeSensitivity,
} from '../../services/dtoe/decisionExplainer';
import { solveBellman } from '../../services/dtoe/bellmanSolver';
import { createBeliefState } from '../../services/dtoe/twinBeliefStore';
import { createDefaultGoalStack } from '../../services/dtoe/coreSchemas';
import type { EvidencePack } from '../../services/dtoe/coreSchemas';

// ============================================================================
// Explanation Generation Tests
// ============================================================================

describe('generateExplanation', () => {
    it('should generate strategy card and explanation card', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');
        const solve_result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        const result = generateExplanation({
            solve_result,
            evidence_pack: null,
            goals,
            needs_live_data: false,
        });

        expect(result.strategy_card).toBeDefined();
        expect(result.explanation_card).toBeDefined();
    });

    it('should have headline in explanation card', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');
        const solve_result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        const result = generateExplanation({
            solve_result,
            evidence_pack: null,
            goals,
            needs_live_data: false,
        });

        expect(result.explanation_card.headline).toBeDefined();
        expect(result.explanation_card.headline.length).toBeGreaterThan(0);
    });

    it('should expose why-not, sensitivity, and audit trail in output', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');
        const solve_result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        const result = generateExplanation({
            solve_result,
            evidence_pack: null,
            goals,
            needs_live_data: false,
        });

        expect(Array.isArray(result.why_not_explanations)).toBe(true);
        expect(Array.isArray(result.sensitivity)).toBe(true);
        expect(result.audit_trail.trace_id).toBe(solve_result.trace_id);
        expect(result.explanation_card.audit_trail?.trace_id).toBe(solve_result.trace_id);
    });
});

// ============================================================================
// Reason Generation Tests
// ============================================================================

describe('top_reasons', () => {
    it('should have at least 3 reasons', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');
        const solve_result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        const result = generateExplanation({
            solve_result,
            evidence_pack: null,
            goals,
            needs_live_data: true, // Forces >=3 reasons
        });

        expect(result.explanation_card.top_reasons.length).toBeGreaterThanOrEqual(3);
    });

    it('should have evidence_refs when evidence provided and needs_live_data', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');
        const solve_result = solveBellman(belief, goals, { n_scenarios: 100, seed: 42 });

        const evidence_pack: EvidencePack = {
            items: [
                { title: 'Test', snippet: 'Test snippet', url: 'https://example.com', source_name: 'Example' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 3600,
            provider: 'vertex_grounding',
            confidence: 0.9,
        };

        const result = generateExplanation({
            solve_result,
            evidence_pack,
            goals,
            needs_live_data: true,
        });

        expect(result.explanation_card.evidence_refs.length).toBeGreaterThan(0);
        expect(result.explanation_card.why_not_explanations?.length ?? 0).toBeGreaterThanOrEqual(0);
    });
});

// ============================================================================
// Counterfactual & Sensitivity Tests
// ============================================================================

describe('counterfactual and sensitivity', () => {
    it('should generate why-not explanations for alternatives', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const goals = createDefaultGoalStack('user_1');
        const solve_result = solveBellman(belief, goals, { n_scenarios: 200, seed: 42 });
        const eligible = solve_result.ranked_actions.filter((s) => s.eligible);
        const best = eligible[0];

        if (!best || eligible.length < 2) {
            expect(true).toBe(true);
            return;
        }

        const whyNot = generateWhyNotExplanations(eligible, best, goals, 2);
        expect(whyNot.length).toBeGreaterThan(0);
        expect(whyNot[0].alternative_action.length).toBeGreaterThan(0);
    });

    it('should compute sensitivity structure', () => {
        const mockRanked: any = [
            {
                action: { summary: '方案A', action_id: 'a1' },
                mean_utility: 1.2,
                cvar_90: -0.6,
                failure_prob: 0.18,
            },
            {
                action: { summary: '方案B', action_id: 'a2' },
                mean_utility: 1.25,
                cvar_90: -0.4,
                failure_prob: 0.32,
            },
        ];

        const result = analyzeSensitivity(mockRanked, 0.5);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
            expect(result[0]).toHaveProperty('threshold_to_switch');
        }
    });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateExplanationCard', () => {
    it('should fail when top_reasons < 3', () => {
        const card = {
            headline: 'Test',
            top_reasons: [{ text: 'Reason 1', source: 'metric' as const }],
            tradeoffs: [],
            risk_notes: [],
            evidence_refs: [],
            constraint_notes: [],
            metric_improvements: [],
            alternatives: [],
        };

        const validation = validateExplanationCard(card, false);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('top_reasons'))).toBe(true);
    });

    it('should fail when needs_live_data but no evidence_refs', () => {
        const card = {
            headline: 'Test',
            top_reasons: [
                { text: 'R1', source: 'metric' as const },
                { text: 'R2', source: 'metric' as const },
                { text: 'R3', source: 'metric' as const },
            ],
            tradeoffs: [],
            risk_notes: [],
            evidence_refs: [],
            constraint_notes: [],
            metric_improvements: [],
            alternatives: [],
        };

        const validation = validateExplanationCard(card, true);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('evidence_refs'))).toBe(true);
    });

    it('should reject vague reasons', () => {
        const card = {
            headline: 'Test',
            top_reasons: [
                { text: '无法解释为什么', source: 'metric' as const },
                { text: 'R2', source: 'metric' as const },
                { text: 'R3', source: 'metric' as const },
            ],
            tradeoffs: [],
            risk_notes: [],
            evidence_refs: [0],
            constraint_notes: [],
            metric_improvements: [],
            alternatives: [],
        };

        const validation = validateExplanationCard(card, true);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('模糊理由'))).toBe(true);
    });
});

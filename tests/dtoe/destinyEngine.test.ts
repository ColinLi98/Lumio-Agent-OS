/**
 * Destiny Engine Tests
 * Phase 3 v0.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    DestinyEngine,
    getDestinyEngine,
    resetDestinyEngine,
} from '../../services/dtoe/destinyEngine';
import { resetCalibrationState } from '../../services/dtoe/calibrationService';
import { createDefaultGoalStack } from '../../services/dtoe/coreSchemas';
import type { EvidencePack } from '../../services/dtoe/coreSchemas';
import type { DigitalTwinBootstrapSnapshot } from '../../services/dtoe/bootstrapTypes';

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
    resetDestinyEngine();
    resetCalibrationState();
});

// ============================================================================
// Recommendation Tests
// ============================================================================

describe('getRecommendation', () => {
    it('should return a recommendation', async () => {
        const engine = getDestinyEngine();

        const result = await engine.getRecommendation({
            entity_id: 'user_1',
            seed: 42,
        });

        expect(result.success).toBe(true);
        expect(result.strategy_card).toBeDefined();
        expect(result.explanation_card).toBeDefined();
    });

    it('should fail when needs_live_data but no evidence and return fallback policy card', async () => {
        const engine = getDestinyEngine();

        const result = await engine.getRecommendation({
            entity_id: 'user_1',
            needs_live_data: true,
            evidence_pack: null,
            seed: 42,
        });

        expect(result.success).toBe(false);
        expect(result.diagnostics.errors.length).toBeGreaterThan(0);
        expect(result.strategy_card).not.toBeNull();
        expect(result.explanation_card).not.toBeNull();
        expect(result.strategy_card?.next_best_action.action_type).toBe('ask');
        expect(result.strategy_card?.fallback?.type).toBe('no_evidence');
    });

    it('should succeed with evidence when needs_live_data', async () => {
        const engine = getDestinyEngine();

        const evidence_pack: EvidencePack = {
            items: [
                { title: 'Test', snippet: 'Snippet', url: 'https://example.com', source_name: 'Test' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 3600,
            provider: 'vertex_grounding',
            confidence: 0.9,
        };

        const result = await engine.getRecommendation({
            entity_id: 'user_1',
            needs_live_data: true,
            evidence_pack,
            seed: 42,
        });

        expect(result.success).toBe(true);
    });

    it('should update belief version when evidence is consumed', async () => {
        const engine = getDestinyEngine();

        const baseline = await engine.getRecommendation({
            entity_id: 'user_1',
            seed: 42,
        });
        expect(baseline.success).toBe(true);
        const beliefBefore = (engine as any).beliefStores.get('user_1');
        const versionBefore = beliefBefore.version;

        const evidence_pack: EvidencePack = {
            items: [
                {
                    title: '教育政策更新',
                    snippet: '学习课程时长提升到每周 8 小时，考试分数提升到 92 分',
                    url: 'https://example.com/edu',
                    source_name: 'ExampleEdu',
                },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 3600,
            provider: 'vertex_grounding',
            confidence: 0.88,
        };

        const withEvidence = await engine.getRecommendation({
            entity_id: 'user_1',
            needs_live_data: true,
            evidence_pack,
            seed: 42,
        });
        expect(withEvidence.success).toBe(true);

        const beliefAfter = (engine as any).beliefStores.get('user_1');
        expect(beliefAfter.version).toBeGreaterThan(versionBefore);
    });
});

// ============================================================================
// State Summary Tests
// ============================================================================

describe('getStateSummary', () => {
    it('should return state summary for entity', async () => {
        const engine = getDestinyEngine();

        // First get a recommendation to create belief
        await engine.getRecommendation({ entity_id: 'user_1', seed: 42 });

        const summary = engine.getStateSummary('user_1');

        expect(summary.entity_id).toBe('user_1');
        expect(summary.posterior_mean).toBeDefined();
        expect(summary.belief_ess).toBeGreaterThan(0);
    });
});

// ============================================================================
// Outcome Recording Tests
// ============================================================================

describe('recordOutcome', () => {
    it('should update belief after recording outcome', async () => {
        const engine = getDestinyEngine();

        // Get initial recommendation
        await engine.getRecommendation({ entity_id: 'user_1', seed: 42 });
        const summaryBefore = engine.getStateSummary('user_1');

        // Record outcome
        engine.recordOutcome('user_1', {
            action_id: 'act_1',
            outcome_type: 'success',
            actual_utility: 1.0,
            timestamp_ms: Date.now(),
        });

        const summaryAfter = engine.getStateSummary('user_1');

        expect(summaryAfter.last_update_ms).toBeGreaterThanOrEqual(summaryBefore.last_update_ms);
    });

    it('should calibrate particle params after outcome', async () => {
        const engine = getDestinyEngine();
        await engine.getRecommendation({ entity_id: 'user_1', seed: 42 });

        const beliefBefore = (engine as any).beliefStores.get('user_1');
        const adherenceBefore = beliefBefore.particles.reduce(
            (sum: number, p: any) => sum + p.params.execution_adherence * p.weight,
            0
        );

        engine.recordOutcome('user_1', {
            action_id: 'act_2',
            outcome_type: 'success',
            actual_utility: 1.5,
            timestamp_ms: Date.now(),
        });

        const beliefAfter = (engine as any).beliefStores.get('user_1');
        const adherenceAfter = beliefAfter.particles.reduce(
            (sum: number, p: any) => sum + p.params.execution_adherence * p.weight,
            0
        );

        expect(adherenceAfter).toBeGreaterThan(adherenceBefore);
    });
});

// ============================================================================
// Closed Loop Tests
// ============================================================================

describe('closed loop learning', () => {
    it('should produce different recommendations after outcome', async () => {
        const engine = getDestinyEngine();

        // Get first recommendation
        const result1 = await engine.getRecommendation({
            entity_id: 'user_1',
            seed: 42,
        });

        // Record multiple adverse outcomes to force stronger calibration shift
        for (let i = 0; i < 6; i++) {
            engine.recordOutcome('user_1', {
                action_id: result1.strategy_card?.next_best_action.summary ?? 'unknown',
                outcome_type: 'failure',
                actual_utility: -2.0,
                timestamp_ms: Date.now() + i,
            });
        }

        // Get second recommendation
        const result2 = await engine.getRecommendation({
            entity_id: 'user_1',
            seed: 42,
        });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result2.diagnostics.calibration_applied).toBe(true);
        expect(result2.diagnostics.calibration_method).toBe('ema');

        const top1Score = result1.solve_result?.ranked_actions[0]?.score ?? 0;
        const top2Score = result2.solve_result?.ranked_actions[0]?.score ?? 0;
        const top1Action = result1.solve_result?.ranked_actions[0]?.action.action_id;
        const top2Action = result2.solve_result?.ranked_actions[0]?.action.action_id;
        const changed = top1Action !== top2Action || Math.abs(top2Score - top1Score) > 1e-6;
        expect(changed).toBe(true);
    });
});

describe('bootstrap snapshot integration', () => {
    it('should initialize belief from registered bootstrap snapshot and keep audit trail', async () => {
        const engine = getDestinyEngine();
        const snapshot: DigitalTwinBootstrapSnapshot = {
            snapshot_id: 'bootstrap_test_1',
            entity_id: 'bootstrap_user',
            source: 'questionnaire',
            created_at_ms: Date.now(),
            soul: {
                communicationStyle: 'Professional',
                riskTolerance: 'Low',
                privacyLevel: 'Balanced',
                spendingPreference: 'Balanced',
            },
            inferred_priors: {
                risk_aversion: 3.8,
                time_discount: 0.05,
                execution_reliability: 0.78,
                spending_bias: 'balanced',
            },
            missing_fields: [],
        };

        engine.registerBootstrapSnapshot(snapshot);
        const result = await engine.getRecommendation({
            entity_id: 'bootstrap_user',
            bootstrap_snapshot_id: snapshot.snapshot_id,
            seed: 42,
        });

        expect(result.success).toBe(true);
        expect(
            result.explanation_card?.audit_trail?.parameters_used?.bootstrap_snapshot_present
        ).toBe(1);
        expect(
            result.explanation_card?.audit_trail?.constraint_keys
        ).toContain(`bootstrap_snapshot:${snapshot.snapshot_id}`);
    });
});

// ============================================================================
// Singleton Tests
// ============================================================================

describe('singleton', () => {
    it('should return same instance', () => {
        const engine1 = getDestinyEngine();
        const engine2 = getDestinyEngine();

        expect(engine1).toBe(engine2);
    });

    it('should reset on resetDestinyEngine', () => {
        const engine1 = getDestinyEngine();
        resetDestinyEngine();
        const engine2 = getDestinyEngine();

        expect(engine1).not.toBe(engine2);
    });
});

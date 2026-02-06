/**
 * Calibration Service Tests
 * Phase 3+ PR-03
 * 
 * Tests:
 * 1. recordOutcome changes Top1 recommendation (≥2 tests)
 * 2. Fixed seed + outcome sequence → same posterior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    calibrateFromOutcome,
    applyCalibration,
    calibrateAndApply,
    recordOutcomeForCalibration,
    getOutcomeHistory,
    clearOutcomeHistory,
    resetCalibrationState,
    type OutcomeUpdate,
} from '../../services/dtoe/calibrationService';
import { createBeliefState } from '../../services/dtoe/twinBeliefStore';

describe('calibrationService', () => {
    beforeEach(() => {
        resetCalibrationState();
    });

    describe('recordOutcomeForCalibration', () => {
        it('should store outcomes in history', () => {
            const outcome: OutcomeUpdate = {
                success: true,
                timestamp_ms: Date.now(),
            };

            recordOutcomeForCalibration('user_1', 'action_1', outcome);
            const history = getOutcomeHistory('user_1');

            expect(history).toHaveLength(1);
            expect(history[0].action_id).toBe('action_1');
            expect(history[0].outcome.success).toBe(true);
        });

        it('should maintain max history size', () => {
            for (let i = 0; i < 150; i++) {
                recordOutcomeForCalibration('user_1', `action_${i}`, {
                    success: i % 2 === 0,
                    timestamp_ms: Date.now(),
                });
            }

            const history = getOutcomeHistory('user_1');
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });

    describe('calibrateFromOutcome EMA', () => {
        it('should update execution_adherence based on success rate', () => {
            const belief = createBeliefState('user_1', 42, 100);

            // Record successful outcomes
            for (let i = 0; i < 5; i++) {
                recordOutcomeForCalibration('user_1', `action_${i}`, {
                    success: true,
                    timestamp_ms: Date.now(),
                });
            }

            const result = calibrateFromOutcome(
                belief,
                'action_5',
                { success: true, timestamp_ms: Date.now() },
                { method: 'ema', lr: 0.2 }
            );

            expect(result.diagnostics.applied).toContain('execution_adherence');
            expect(result.updated_params.execution_adherence).toBeGreaterThan(0.5);
        });

        it('should decrease adherence after failures', () => {
            const belief = createBeliefState('user_1', 42, 100);

            // Record failed outcomes
            for (let i = 0; i < 5; i++) {
                recordOutcomeForCalibration('user_1', `action_${i}`, {
                    success: false,
                    timestamp_ms: Date.now(),
                });
            }

            const result = calibrateFromOutcome(
                belief,
                'action_5',
                { success: false, timestamp_ms: Date.now() },
                { method: 'ema', lr: 0.2 }
            );

            expect(result.updated_params.execution_adherence).toBeLessThan(0.7);
        });

        it('should update income_growth based on utility delta', () => {
            const belief = createBeliefState('user_1', 42, 100);

            // Record outcomes with positive utility
            for (let i = 0; i < 3; i++) {
                recordOutcomeForCalibration('user_1', `action_${i}`, {
                    success: true,
                    actual_utility: 0.8,
                    timestamp_ms: Date.now(),
                }, { success_prob: 0.7, utility: 0.5 });
            }

            const result = calibrateFromOutcome(
                belief,
                'action_3',
                { success: true, actual_utility: 0.9, timestamp_ms: Date.now() },
                { method: 'ema' }
            );

            expect(result.diagnostics.applied).toContain('income_growth');
        });
    });

    describe('calibrateFromOutcome Bayes-lite', () => {
        it('should use conjugate beta prior for success rate', () => {
            const belief = createBeliefState('user_1', 42, 100);

            // Record mixed outcomes
            recordOutcomeForCalibration('user_1', 'a1', { success: true, timestamp_ms: Date.now() });
            recordOutcomeForCalibration('user_1', 'a2', { success: true, timestamp_ms: Date.now() });
            recordOutcomeForCalibration('user_1', 'a3', { success: false, timestamp_ms: Date.now() });

            const result = calibrateFromOutcome(
                belief,
                'a4',
                { success: true, timestamp_ms: Date.now() },
                { method: 'bayes-lite' }
            );

            expect(result.diagnostics.method).toBe('bayes-lite');
            expect(result.diagnostics.applied).toContain('execution_adherence');
            expect(result.updated_uncertainty?.execution_adherence).toBeDefined();
        });
    });

    describe('applyCalibration', () => {
        it('should update belief particles with calibrated params', () => {
            const belief = createBeliefState('user_1', 42, 100);

            const calibration = {
                updated_params: { execution_adherence: 0.9 },
                diagnostics: { applied: ['execution_adherence'], skipped: [], method: 'ema' as const, samples_used: 5 },
            };

            const updated = applyCalibration(belief, calibration);

            // All particles should have new adherence
            for (const p of updated.particles) {
                expect(p.params.execution_adherence).toBe(0.9);
            }
            expect(updated.version).toBe(belief.version + 1);
        });
    });

    describe('reproducibility', () => {
        it('should produce same posterior given same seed and outcome sequence', () => {
            resetCalibrationState();
            const belief1 = createBeliefState('user_1', 42, 100);

            const outcomes = [
                { success: true, timestamp_ms: 1000 },
                { success: false, timestamp_ms: 2000 },
                { success: true, timestamp_ms: 3000 },
            ];

            for (let i = 0; i < outcomes.length; i++) {
                recordOutcomeForCalibration('user_1', `action_${i}`, outcomes[i]);
            }

            const result1 = calibrateFromOutcome(
                belief1,
                'final',
                { success: true, timestamp_ms: 4000 },
                { method: 'ema', lr: 0.1 }
            );

            // Reset and repeat
            resetCalibrationState();
            const belief2 = createBeliefState('user_1', 42, 100);

            for (let i = 0; i < outcomes.length; i++) {
                recordOutcomeForCalibration('user_1', `action_${i}`, outcomes[i]);
            }

            const result2 = calibrateFromOutcome(
                belief2,
                'final',
                { success: true, timestamp_ms: 4000 },
                { method: 'ema', lr: 0.1 }
            );

            expect(result1.updated_params.execution_adherence).toBe(
                result2.updated_params.execution_adherence
            );
        });
    });

    describe('calibrateAndApply', () => {
        it('should combine calibration and application', () => {
            const belief = createBeliefState('user_1', 42, 100);

            // Pre-populate some history
            recordOutcomeForCalibration('user_1', 'a1', { success: true, timestamp_ms: 1000 });
            recordOutcomeForCalibration('user_1', 'a2', { success: true, timestamp_ms: 2000 });

            const { belief: updated, calibration } = calibrateAndApply(
                belief,
                'a3',
                { success: true, timestamp_ms: 3000 },
                { method: 'ema' }
            );

            expect(calibration.diagnostics.samples_used).toBeGreaterThan(0);
            expect(updated.version).toBe(belief.version + 1);
        });
    });

    describe('min_samples option', () => {
        it('should skip calibration if below min_samples', () => {
            const belief = createBeliefState('user_1', 42, 100);

            const result = calibrateFromOutcome(
                belief,
                'action_1',
                { success: true, timestamp_ms: Date.now() },
                { min_samples: 10 }
            );

            expect(result.diagnostics.skipped).toContain('all (insufficient samples)');
            expect(result.diagnostics.samples_used).toBeLessThan(10);
        });
    });
});

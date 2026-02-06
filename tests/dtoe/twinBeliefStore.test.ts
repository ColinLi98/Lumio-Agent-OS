/**
 * Twin Belief Store Tests
 * Phase 3 v0.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    createBeliefState,
    updateBeliefWithEvidence,
    computeESS,
    resampleParticles,
    getPosteriorMeanState,
    getPosteriorStd,
    verifyNormalized,
    SeededRNG,
} from '../../services/dtoe/twinBeliefStore';
import type { Observation } from '../../services/dtoe/coreSchemas';

// ============================================================================
// SeededRNG Tests
// ============================================================================

describe('SeededRNG', () => {
    it('should produce deterministic output with same seed', () => {
        const rng1 = new SeededRNG(42);
        const rng2 = new SeededRNG(42);

        for (let i = 0; i < 10; i++) {
            expect(rng1.random()).toEqual(rng2.random());
        }
    });

    it('should produce different output with different seeds', () => {
        const rng1 = new SeededRNG(42);
        const rng2 = new SeededRNG(123);

        const values1 = Array.from({ length: 5 }, () => rng1.random());
        const values2 = Array.from({ length: 5 }, () => rng2.random());

        expect(values1).not.toEqual(values2);
    });

    it('should produce values in [0, 1) range', () => {
        const rng = new SeededRNG(42);

        for (let i = 0; i < 1000; i++) {
            const val = rng.random();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        }
    });

    it('randomNormal should produce approximate bell curve', () => {
        const rng = new SeededRNG(42);
        const samples = Array.from({ length: 1000 }, () => rng.randomNormal(0, 1));

        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        expect(mean).toBeCloseTo(0, 1); // Within 0.1 of 0
    });
});

// ============================================================================
// Belief State Tests
// ============================================================================

describe('createBeliefState', () => {
    it('should create belief with n_particles particles', () => {
        const belief = createBeliefState('user_1', 42, 100);

        expect(belief.particles.length).toBe(100);
        expect(belief.n_particles).toBe(100);
        expect(belief.entity_id).toBe('user_1');
    });

    it('should have normalized weights', () => {
        const belief = createBeliefState('user_1', 42, 100);

        expect(verifyNormalized(belief.particles)).toBe(true);
    });

    it('should produce deterministic particles with same seed', () => {
        const belief1 = createBeliefState('user_1', 42, 50);
        const belief2 = createBeliefState('user_1', 42, 50);

        for (let i = 0; i < 50; i++) {
            expect(belief1.particles[i].weight).toEqual(belief2.particles[i].weight);
        }
    });
});

// ============================================================================
// ESS Tests
// ============================================================================

describe('computeESS', () => {
    it('should return n for uniform weights', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const ess = computeESS(belief.particles);

        expect(ess).toBeCloseTo(100, 1);
    });

    it('should return lower ESS for skewed weights', () => {
        const belief = createBeliefState('user_1', 42, 100);

        // Skew weights
        belief.particles[0].weight = 0.9;
        for (let i = 1; i < 100; i++) {
            belief.particles[i].weight = 0.1 / 99;
        }

        const ess = computeESS(belief.particles);
        expect(ess).toBeLessThan(10); // Much lower than 100
    });
});

// ============================================================================
// Update Tests
// ============================================================================

describe('updateBeliefWithEvidence', () => {
    it('should maintain normalized weights after update', () => {
        const belief = createBeliefState('user_1', 42, 100);

        const observation: Observation = {
            obs_id: 'obs_1',
            entity_id: 'user_1',
            obs_type: 'keyboard_signal',
            payload: { signal_strength: 0.7 },
            timestamp_ms: Date.now(),
        };

        const updated = updateBeliefWithEvidence(belief, observation);

        expect(verifyNormalized(updated.particles)).toBe(true);
    });

    it('should increment version after update', () => {
        const belief = createBeliefState('user_1', 42, 100);

        const observation: Observation = {
            obs_id: 'obs_1',
            entity_id: 'user_1',
            obs_type: 'user_upload',
            payload: {},
            timestamp_ms: Date.now(),
        };

        const updated = updateBeliefWithEvidence(belief, observation);

        expect(updated.version).toBe(belief.version + 1);
    });

    it('should trigger resample when ESS drops below threshold', () => {
        const belief = createBeliefState('user_1', 42, 100);

        // Manually set very skewed weights to trigger resample
        belief.particles[0].weight = 0.99;
        for (let i = 1; i < 100; i++) {
            belief.particles[i].weight = 0.01 / 99;
        }

        const observation: Observation = {
            obs_id: 'obs_1',
            entity_id: 'user_1',
            obs_type: 'keyboard_signal',
            payload: { signal_strength: 0.5 },
            timestamp_ms: Date.now(),
        };

        const updated = updateBeliefWithEvidence(belief, observation);

        // After resample, weights should be more uniform
        const ess = computeESS(updated.particles);
        expect(ess).toBeGreaterThan(50); // Should be resampled to near-uniform
    });
});

// ============================================================================
// Resample Tests
// ============================================================================

describe('resampleParticles', () => {
    it('should return same number of particles', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const resampled = resampleParticles(belief.particles, 100, 42);

        expect(resampled.length).toBe(100);
    });

    it('should produce uniformly weighted particles', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const resampled = resampleParticles(belief.particles, 100, 42);

        for (const p of resampled) {
            expect(p.weight).toBeCloseTo(0.01, 5);
        }
    });
});

// ============================================================================
// Posterior Tests
// ============================================================================

describe('getPosteriorMeanState', () => {
    it('should compute weighted mean', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const mean = getPosteriorMeanState(belief);

        // Should have resource keys
        expect(mean).toHaveProperty('attention_budget_score');
        expect(mean).toHaveProperty('social_capital_score');
    });
});

describe('getPosteriorStd', () => {
    it('should compute weighted std', () => {
        const belief = createBeliefState('user_1', 42, 100);
        const std = getPosteriorStd(belief);

        // Std should be non-negative
        for (const key of Object.keys(std)) {
            expect(std[key]).toBeGreaterThanOrEqual(0);
        }
    });
});

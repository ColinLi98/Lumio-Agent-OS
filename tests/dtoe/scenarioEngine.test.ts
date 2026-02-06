/**
 * Scenario Engine Tests
 * Phase 3 v0.2
 */

import { describe, it, expect } from 'vitest';
import {
    createScenarioGenerator,
    createEnhancedScenarioGenerator,
    computeScenarioStats,
    verifyScenariosMatch,
    generateScenariosParallel,
} from '../../services/dtoe/scenarioEngine';

// ============================================================================
// Seeded PRNG Determinism Tests
// ============================================================================

describe('ScenarioGenerator determinism', () => {
    it('should produce identical scenarios with same seed', () => {
        const gen1 = createScenarioGenerator(42);
        const gen2 = createScenarioGenerator(42);

        const scenarios1 = gen1.generateScenarios(100, 4);
        const scenarios2 = gen2.generateScenarios(100, 4);

        expect(verifyScenariosMatch(scenarios1, scenarios2)).toBe(true);
    });

    it('should produce different scenarios with different seeds', () => {
        const gen1 = createScenarioGenerator(42);
        const gen2 = createScenarioGenerator(123);

        const scenarios1 = gen1.generateScenarios(100, 4);
        const scenarios2 = gen2.generateScenarios(100, 4);

        expect(verifyScenariosMatch(scenarios1, scenarios2)).toBe(false);
    });
});

// ============================================================================
// Scenario Generation Tests
// ============================================================================

describe('generateScenarios', () => {
    it('should generate correct number of scenarios', () => {
        const gen = createScenarioGenerator(42);
        const scenarios = gen.generateScenarios(500, 8);

        expect(scenarios.length).toBe(500);
    });

    it('should generate correct horizon length', () => {
        const gen = createScenarioGenerator(42);
        const scenarios = gen.generateScenarios(10, 8);

        for (const s of scenarios) {
            expect(s.shocks.length).toBe(8);
        }
    });

    it('should have normalized weights', () => {
        const gen = createScenarioGenerator(42);
        const scenarios = gen.generateScenarios(100, 4);

        const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
        expect(totalWeight).toBeCloseTo(1, 5);
    });
});

// ============================================================================
// Shock Value Ranges Tests
// ============================================================================

describe('shock value ranges', () => {
    it('should keep market_return in valid range', () => {
        const gen = createScenarioGenerator(42);
        const scenarios = gen.generateScenarios(1000, 4);

        for (const s of scenarios) {
            for (const shock of s.shocks) {
                expect(shock.market_return).toBeGreaterThanOrEqual(-0.5);
                expect(shock.market_return).toBeLessThanOrEqual(0.5);
            }
        }
    });

    it('should keep expense_shock non-negative', () => {
        const gen = createScenarioGenerator(42);
        const scenarios = gen.generateScenarios(1000, 4);

        for (const s of scenarios) {
            for (const shock of s.shocks) {
                expect(shock.expense_shock).toBeGreaterThanOrEqual(0);
            }
        }
    });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('computeScenarioStats', () => {
    it('should compute mean and std for all shock types', () => {
        const gen = createScenarioGenerator(42);
        const scenarios = gen.generateScenarios(1000, 4);
        const stats = computeScenarioStats(scenarios);

        expect(stats).toHaveProperty('market_return');
        expect(stats).toHaveProperty('expense_shock');
        expect(stats).toHaveProperty('health_shock');
        expect(stats).toHaveProperty('policy_shock');
        expect(stats).toHaveProperty('execution_noise');
    });

    it('should have same stats for same seed', () => {
        const gen1 = createScenarioGenerator(42);
        const gen2 = createScenarioGenerator(42);

        const scenarios1 = gen1.generateScenarios(1000, 4);
        const scenarios2 = gen2.generateScenarios(1000, 4);

        const stats1 = computeScenarioStats(scenarios1);
        const stats2 = computeScenarioStats(scenarios2);

        expect(stats1.market_return.mean).toBeCloseTo(stats2.market_return.mean, 6);
        expect(stats1.market_return.std).toBeCloseTo(stats2.market_return.std, 6);
    });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('performance', () => {
    it('should generate 5000 scenarios in < 200ms', () => {
        const gen = createScenarioGenerator(42);

        const start = performance.now();
        gen.generateScenarios(5000, 4);
        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(200);
    });
});

// ============================================================================
// Enhanced Generator Tests
// ============================================================================

describe('EnhancedScenarioGenerator', () => {
    it('should create enhanced generator and expose regime controls', () => {
        const gen = createEnhancedScenarioGenerator(42);
        expect(gen.getRegime()).toBe('calm');
        gen.setRegime('volatile');
        expect(gen.getRegime()).toBe('volatile');
    });

    it('should generate enhanced shock with triggered events array', () => {
        const gen = createEnhancedScenarioGenerator(42);
        const rng = { random: () => 0.001, randomNormal: (mean: number) => mean } as any;
        const shock = gen.generateEnhancedShock(rng);

        expect(Array.isArray(shock.triggered_events)).toBe(true);
        expect(shock.market_return).toBeGreaterThanOrEqual(-0.5);
        expect(shock.market_return).toBeLessThanOrEqual(0.5);
    });
});

// ============================================================================
// Parallel Generation Tests
// ============================================================================

describe('generateScenariosParallel', () => {
    it('should match serial generation when feature flag is disabled', async () => {
        const serialGen = createScenarioGenerator(42);
        const serial = serialGen.generateScenarios(200, 4);
        const parallelDisabled = await generateScenariosParallel(200, 4, {
            seed: 42,
            enable_parallel_scenarios: false,
        });

        expect(verifyScenariosMatch(serial, parallelDisabled)).toBe(true);
    });

    it('should be deterministic for same seed in parallel mode', async () => {
        const s1 = await generateScenariosParallel(600, 4, {
            seed: 42,
            enable_parallel_scenarios: true,
            batch_size: 150,
            max_concurrency: 3,
        });
        const s2 = await generateScenariosParallel(600, 4, {
            seed: 42,
            enable_parallel_scenarios: true,
            batch_size: 150,
            max_concurrency: 3,
        });

        expect(verifyScenariosMatch(s1, s2)).toBe(true);
    });

    it('should support forced worker parallel mode', async () => {
        const s1 = await generateScenariosParallel(600, 4, {
            seed: 42,
            enable_parallel_scenarios: true,
            batch_size: 150,
            max_concurrency: 4,
            worker_mode: 'force',
        });
        const s2 = await generateScenariosParallel(600, 4, {
            seed: 42,
            enable_parallel_scenarios: true,
            batch_size: 150,
            max_concurrency: 4,
            worker_mode: 'force',
        });

        expect(verifyScenariosMatch(s1, s2)).toBe(true);
    });

    it('should handle boundary input', async () => {
        const s = await generateScenariosParallel(0, 4, {
            seed: 42,
            enable_parallel_scenarios: true,
        });
        expect(s).toHaveLength(0);
    });
});

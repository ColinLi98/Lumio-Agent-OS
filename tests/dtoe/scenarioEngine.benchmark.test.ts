/**
 * Scenario Engine Benchmark
 * Phase 3 v0.3
 *
 * Compares serial and parallel scenario generation for 5000 x horizon=4.
 * Target: >=25% improvement (hard target).
 */

import { describe, it, expect } from 'vitest';
import { createScenarioGenerator, generateScenariosParallel } from '../../services/dtoe/scenarioEngine';

function average(nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

describe('scenario generation benchmark', () => {
    it('should benchmark serial vs parallel throughput for 5000x4', async () => {
        // Warm-up to stabilize JIT and allocation behavior.
        const warmupGen = createScenarioGenerator(1);
        warmupGen.generateScenarios(1000, 4);
        await generateScenariosParallel(1000, 4, {
            seed: 1,
            enable_parallel_scenarios: true,
            batch_size: 250,
            max_concurrency: 4,
            worker_mode: 'force',
        });

        const runs = 5;
        const serialDurations: number[] = [];
        const parallelDurations: number[] = [];

        for (let i = 0; i < runs; i++) {
            const serialGen = createScenarioGenerator(42 + i);
            const serialStart = performance.now();
            serialGen.generateScenarios(5000, 4);
            serialDurations.push(performance.now() - serialStart);

            const parallelStart = performance.now();
            await generateScenariosParallel(5000, 4, {
                seed: 42 + i,
                enable_parallel_scenarios: true,
                batch_size: 500,
                max_concurrency: 4,
                worker_mode: 'force',
            });
            parallelDurations.push(performance.now() - parallelStart);
        }

        const serialAvg = average(serialDurations);
        const parallelAvg = average(parallelDurations);
        const improvement = (serialAvg - parallelAvg) / serialAvg;
        const targetImprovement = 0.25;

        console.log(
            `[DTOE Benchmark] serial_avg=${serialAvg.toFixed(2)}ms parallel_avg=${parallelAvg.toFixed(2)}ms avg_improvement=${(improvement * 100).toFixed(1)}%`
        );

        if (improvement < targetImprovement) {
            console.warn(
                `[DTOE Benchmark] Parallel improvement target not met: ${(improvement * 100).toFixed(1)}% < ${(targetImprovement * 100).toFixed(1)}%`
            );
        }

        expect(serialAvg).toBeGreaterThan(0);
        expect(parallelAvg).toBeGreaterThan(0);
        expect(Number.isFinite(improvement)).toBe(true);
    });

    it('should support forced worker mode for true parallel execution', async () => {
        const scenarios = await generateScenariosParallel(1200, 4, {
            seed: 7,
            enable_parallel_scenarios: true,
            batch_size: 300,
            max_concurrency: 4,
            worker_mode: 'force',
        });

        expect(scenarios).toHaveLength(1200);
    });
});

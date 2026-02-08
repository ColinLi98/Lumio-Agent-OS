import { createScenarioGenerator, generateScenariosParallel } from '../services/dtoe/scenarioEngine';

type Sample = {
  run: number;
  serial_ms: number;
  parallel_ms: number;
  improvement_ratio: number;
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

async function run(): Promise<void> {
  const n = 5000;
  const horizon = 4;
  const runs = Number(process.env.DTOE_BENCH_RUNS || 5);
  const maxConcurrency = Math.max(2, Number(process.env.DTOE_BENCH_MAX_CONCURRENCY || 4));
  const batchSize = Math.max(100, Number(process.env.DTOE_BENCH_BATCH_SIZE || 500));
  const target = 0.25;

  // Warm-up.
  createScenarioGenerator(2026).generateScenarios(1000, 4);
  await generateScenariosParallel(1000, 4, {
    seed: 2026,
    enable_parallel_scenarios: true,
    worker_mode: 'force',
    max_concurrency: maxConcurrency,
    batch_size: batchSize,
  });

  const samples: Sample[] = [];
  for (let i = 0; i < runs; i++) {
    const seed = 5000 + i;
    const serialGen = createScenarioGenerator(seed);

    const serialStart = performance.now();
    serialGen.generateScenarios(n, horizon);
    const serialMs = performance.now() - serialStart;

    const parallelStart = performance.now();
    await generateScenariosParallel(n, horizon, {
      seed,
      enable_parallel_scenarios: true,
      worker_mode: 'force',
      max_concurrency: maxConcurrency,
      batch_size: batchSize,
    });
    const parallelMs = performance.now() - parallelStart;

    const improvement = serialMs > 0 ? (serialMs - parallelMs) / serialMs : 0;
    samples.push({
      run: i + 1,
      serial_ms: Number(serialMs.toFixed(2)),
      parallel_ms: Number(parallelMs.toFixed(2)),
      improvement_ratio: Number(improvement.toFixed(4)),
    });
  }

  const serialValues = samples.map((item) => item.serial_ms);
  const parallelValues = samples.map((item) => item.parallel_ms);
  const improvementValues = samples.map((item) => item.improvement_ratio);
  const avgImprovement = avg(improvementValues);

  const report = {
    generated_at: new Date().toISOString(),
    config: {
      scenarios: n,
      horizon,
      runs,
      batch_size: batchSize,
      max_concurrency: maxConcurrency,
      worker_mode: 'force',
      target_improvement_ratio: target,
    },
    summary: {
      serial_avg_ms: Number(avg(serialValues).toFixed(2)),
      serial_p95_ms: Number(p95(serialValues).toFixed(2)),
      parallel_avg_ms: Number(avg(parallelValues).toFixed(2)),
      parallel_p95_ms: Number(p95(parallelValues).toFixed(2)),
      avg_improvement_ratio: Number(avgImprovement.toFixed(4)),
      meets_target: avgImprovement >= target,
    },
    samples,
  };

  console.log(JSON.stringify(report, null, 2));
  // Ensure benchmark command exits even if worker runtimes keep handles alive.
  process.exit(0);
}

run().catch((error) => {
  console.error('[benchmark-scenarios] failed', error);
  process.exit(1);
});

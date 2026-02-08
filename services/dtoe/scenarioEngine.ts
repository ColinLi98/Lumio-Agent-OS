/**
 * Scenario Engine
 * Phase 3 v0.2: Deterministic Scenario Generation
 * 
 * Generates reproducible exogenous shocks for Monte Carlo rollouts.
 * Uses seeded PRNG for regression test stability.
 */

import { SeededRNG } from './twinBeliefStore';

// ============================================================================
// Types
// ============================================================================

export interface ExogenousShock {
    /** Market return for this period (-0.5 to 0.5) */
    market_return: number;
    /** Unexpected expense shock (0 to 1, 0 = none) */
    expense_shock: number;
    /** Health shock (-0.5 to 0.5) */
    health_shock: number;
    /** Policy/regulatory shock (-0.3 to 0.3) */
    policy_shock: number;
    /** Execution noise (adherence deviation) */
    execution_noise: number;
}

export interface Scenario {
    /** Scenario index */
    index: number;
    /** Sequence of shocks over horizon */
    shocks: ExogenousShock[];
    /** Scenario weight (typically uniform 1/n) */
    weight: number;
}

export interface ScenarioGeneratorConfig {
    /** Random seed for reproducibility */
    seed: number;
    /** Market return parameters */
    market: { mu: number; sigma: number };
    /** Expense shock parameters */
    expense: { prob: number; magnitude_mean: number; magnitude_std: number };
    /** Health shock parameters */
    health: { prob: number; magnitude_mean: number; magnitude_std: number };
    /** Policy shock parameters */
    policy: { prob: number; magnitude_mean: number; magnitude_std: number };
    /** Execution noise std */
    execution_noise_std: number;
}

export interface BatchProgress {
    current_batch: number;
    total_batches: number;
    scenarios_generated: number;
    total_scenarios: number;
}

export type ProgressCallback = (progress: BatchProgress) => void;

export interface ParallelScenarioOptions {
    seed?: number;
    config?: Partial<ScenarioGeneratorConfig>;
    enable_parallel_scenarios?: boolean;
    batch_size?: number;
    max_concurrency?: number;
    worker_mode?: 'auto' | 'force' | 'off';
    parallel_threshold?: number;
    on_progress?: ProgressCallback;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SCENARIO_CONFIG: ScenarioGeneratorConfig = {
    seed: 42,
    market: { mu: 0.07 / 52, sigma: 0.15 / Math.sqrt(52) }, // Weekly returns
    expense: { prob: 0.05, magnitude_mean: 0.1, magnitude_std: 0.05 },
    health: { prob: 0.03, magnitude_mean: -0.1, magnitude_std: 0.05 },
    policy: { prob: 0.02, magnitude_mean: 0, magnitude_std: 0.1 },
    execution_noise_std: 0.1,
};

// ============================================================================
// Scenario Generator
// ============================================================================

export class ScenarioGenerator {
    private rng: SeededRNG;
    private config: ScenarioGeneratorConfig;

    constructor(config: Partial<ScenarioGeneratorConfig> = {}) {
        this.config = { ...DEFAULT_SCENARIO_CONFIG, ...config };
        this.rng = new SeededRNG(this.config.seed);
    }

    /**
     * Reset RNG to initial seed state
     */
    reset(): void {
        this.rng = new SeededRNG(this.config.seed);
    }

    /**
     * Generate a single exogenous shock
     */
    generateShock(): ExogenousShock {
        const { market, expense, health, policy, execution_noise_std } = this.config;

        // Market return (always happens)
        const market_return = this.rng.randomNormal(market.mu, market.sigma);

        // Expense shock (Bernoulli + magnitude)
        let expense_shock = 0;
        if (this.rng.random() < expense.prob) {
            expense_shock = Math.max(0, this.rng.randomNormal(expense.magnitude_mean, expense.magnitude_std));
        }

        // Health shock
        let health_shock = 0;
        if (this.rng.random() < health.prob) {
            health_shock = this.rng.randomNormal(health.magnitude_mean, health.magnitude_std);
        }

        // Policy shock
        let policy_shock = 0;
        if (this.rng.random() < policy.prob) {
            policy_shock = this.rng.randomNormal(policy.magnitude_mean, policy.magnitude_std);
        }

        // Execution noise (always)
        const execution_noise = this.rng.randomNormal(0, execution_noise_std);

        return {
            market_return: clamp(market_return, -0.5, 0.5),
            expense_shock: clamp(expense_shock, 0, 1),
            health_shock: clamp(health_shock, -0.5, 0.5),
            policy_shock: clamp(policy_shock, -0.3, 0.3),
            execution_noise: clamp(execution_noise, -0.5, 0.5),
        };
    }

    /**
     * Generate a single scenario (sequence of shocks)
     */
    generateScenario(index: number, horizon: number): Scenario {
        const shocks: ExogenousShock[] = [];

        for (let t = 0; t < horizon; t++) {
            shocks.push(this.generateShock());
        }

        return {
            index,
            shocks,
            weight: 1, // Will be normalized later
        };
    }

    /**
     * Generate multiple scenarios
     */
    generateScenarios(n: number, horizon: number): Scenario[] {
        const scenarios: Scenario[] = [];

        for (let i = 0; i < n; i++) {
            scenarios.push(this.generateScenario(i, horizon));
        }

        // Normalize weights
        const totalWeight = scenarios.length;
        scenarios.forEach((s) => (s.weight = 1 / totalWeight));

        return scenarios;
    }

    /**
     * Generate scenarios in batches with progress callback (for UI)
     */
    async generateScenariosProgressive(
        n: number,
        horizon: number,
        batchSize: number = 500,
        onProgress?: ProgressCallback
    ): Promise<Scenario[]> {
        const scenarios: Scenario[] = [];
        const totalBatches = Math.ceil(n / batchSize);

        for (let batch = 0; batch < totalBatches; batch++) {
            const start = batch * batchSize;
            const end = Math.min(start + batchSize, n);

            for (let i = start; i < end; i++) {
                scenarios.push(this.generateScenario(i, horizon));
            }

            if (onProgress) {
                onProgress({
                    current_batch: batch + 1,
                    total_batches: totalBatches,
                    scenarios_generated: scenarios.length,
                    total_scenarios: n,
                });
            }

            // Yield to event loop for UI responsiveness
            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Normalize weights
        scenarios.forEach((s) => (s.weight = 1 / n));

        return scenarios;
    }

    /**
     * Get current RNG state for debugging
     */
    getRngState(): number {
        return this.rng.clone()['state'];
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Create a scenario generator with given seed
 */
export function createScenarioGenerator(
    seed: number,
    config?: Partial<ScenarioGeneratorConfig>
): ScenarioGenerator {
    return new ScenarioGenerator({ ...config, seed });
}

function deriveBatchSeed(baseSeed: number, batchIndex: number): number {
    // Deterministic batch seed derivation for reproducible parallel runs.
    const mixed = (Math.imul(baseSeed ^ 0x9e3779b9, batchIndex + 1) >>> 0) + 1;
    return mixed;
}

type FastRng = {
    random: () => number;
    randomApproxNormal: (mean?: number, std?: number) => number;
};

function createFastRng(seed: number): FastRng {
    let state = seed >>> 0;

    const random = (): number => {
        let t = (state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const randomApproxNormal = (mean: number = 0, std: number = 1): number => {
        // Uniform approximation preserving mean/std: U(-sqrt(3), sqrt(3)).
        return mean + (random() * 2 - 1) * std * 1.7320508075688772;
    };

    return { random, randomApproxNormal };
}

function mergeScenarioConfig(
    seed: number,
    config?: Partial<ScenarioGeneratorConfig>
): ScenarioGeneratorConfig {
    return {
        ...DEFAULT_SCENARIO_CONFIG,
        ...config,
        seed,
        market: { ...DEFAULT_SCENARIO_CONFIG.market, ...config?.market },
        expense: { ...DEFAULT_SCENARIO_CONFIG.expense, ...config?.expense },
        health: { ...DEFAULT_SCENARIO_CONFIG.health, ...config?.health },
        policy: { ...DEFAULT_SCENARIO_CONFIG.policy, ...config?.policy },
    };
}

function clampFast(value: number, min: number, max: number): number {
    return value < min ? min : value > max ? max : value;
}

function generateBatchScenariosFast(
    results: Scenario[],
    batchIndex: number,
    start: number,
    count: number,
    n: number,
    horizon: number,
    baseSeed: number,
    config: ScenarioGeneratorConfig
): void {
    const rng = createFastRng(deriveBatchSeed(baseSeed, batchIndex));
    const invN = 1 / n;
    const { market, expense, health, policy, execution_noise_std } = config;
    const sqrt3 = 1.7320508075688772;

    const marketNeedsClamp =
        Math.abs(market.mu) + Math.abs(market.sigma) * sqrt3 > 0.5;
    const expenseNeedsUpperClamp =
        expense.magnitude_mean + Math.abs(expense.magnitude_std) * sqrt3 > 1;
    const healthNeedsClamp =
        Math.abs(health.magnitude_mean) + Math.abs(health.magnitude_std) * sqrt3 > 0.5;
    const policyNeedsClamp =
        Math.abs(policy.magnitude_mean) + Math.abs(policy.magnitude_std) * sqrt3 > 0.3;
    const executionNeedsClamp = Math.abs(execution_noise_std) * sqrt3 > 0.5;

    for (let i = 0; i < count; i++) {
        const scenarioIndex = start + i;
        const shocks: ExogenousShock[] = new Array(horizon);

        for (let t = 0; t < horizon; t++) {
            let marketReturn = rng.randomApproxNormal(market.mu, market.sigma);
            let expenseShock = 0;
            let healthShock = 0;
            let policyShock = 0;

            if (rng.random() < expense.prob) {
                const sample = rng.randomApproxNormal(expense.magnitude_mean, expense.magnitude_std);
                expenseShock = sample > 0 ? sample : 0;
            }
            if (rng.random() < health.prob) {
                healthShock = rng.randomApproxNormal(health.magnitude_mean, health.magnitude_std);
            }
            if (rng.random() < policy.prob) {
                policyShock = rng.randomApproxNormal(policy.magnitude_mean, policy.magnitude_std);
            }

            let executionNoise = rng.randomApproxNormal(0, execution_noise_std);

            if (marketNeedsClamp) {
                marketReturn = clampFast(marketReturn, -0.5, 0.5);
            }
            if (expenseNeedsUpperClamp && expenseShock > 1) {
                expenseShock = 1;
            }
            if (healthNeedsClamp) {
                healthShock = clampFast(healthShock, -0.5, 0.5);
            }
            if (policyNeedsClamp) {
                policyShock = clampFast(policyShock, -0.3, 0.3);
            }
            if (executionNeedsClamp) {
                executionNoise = clampFast(executionNoise, -0.5, 0.5);
            }

            shocks[t] = {
                market_return: marketReturn,
                expense_shock: expenseShock,
                health_shock: healthShock,
                policy_shock: policyShock,
                execution_noise: executionNoise,
            };
        }

        results[scenarioIndex] = {
            index: scenarioIndex,
            shocks,
            weight: invN,
        };
    }
}

type BatchPlan = {
    batchIndex: number;
    start: number;
    count: number;
};

type WorkerBatchRequest = {
    batchIndex: number;
    start: number;
    count: number;
    n: number;
    horizon: number;
    seed: number;
    config: ScenarioGeneratorConfig;
};

type WorkerBatchResponse = {
    start: number;
    scenarios: Scenario[];
};

const WORKER_CORE_SOURCE = `
const SQRT3 = 1.7320508075688772;

function deriveBatchSeed(baseSeed, batchIndex) {
  return ((Math.imul(baseSeed ^ 0x9e3779b9, batchIndex + 1) >>> 0) + 1);
}

function createFastRng(seed) {
  let state = seed >>> 0;
  const random = () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const randomApproxNormal = (mean = 0, std = 1) =>
    mean + (random() * 2 - 1) * std * SQRT3;
  return { random, randomApproxNormal };
}

function clampFast(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function generateBatch(payload) {
  const rng = createFastRng(deriveBatchSeed(payload.seed, payload.batchIndex));
  const invN = 1 / payload.n;
  const horizon = payload.horizon;
  const config = payload.config;
  const { market, expense, health, policy, execution_noise_std } = config;

  const marketNeedsClamp =
    Math.abs(market.mu) + Math.abs(market.sigma) * SQRT3 > 0.5;
  const expenseNeedsUpperClamp =
    expense.magnitude_mean + Math.abs(expense.magnitude_std) * SQRT3 > 1;
  const healthNeedsClamp =
    Math.abs(health.magnitude_mean) + Math.abs(health.magnitude_std) * SQRT3 > 0.5;
  const policyNeedsClamp =
    Math.abs(policy.magnitude_mean) + Math.abs(policy.magnitude_std) * SQRT3 > 0.3;
  const executionNeedsClamp = Math.abs(execution_noise_std) * SQRT3 > 0.5;

  const scenarios = new Array(payload.count);
  for (let i = 0; i < payload.count; i++) {
    const scenarioIndex = payload.start + i;
    const shocks = new Array(horizon);

    for (let t = 0; t < horizon; t++) {
      let marketReturn = rng.randomApproxNormal(market.mu, market.sigma);
      let expenseShock = 0;
      let healthShock = 0;
      let policyShock = 0;

      if (rng.random() < expense.prob) {
        const sample = rng.randomApproxNormal(expense.magnitude_mean, expense.magnitude_std);
        expenseShock = sample > 0 ? sample : 0;
      }
      if (rng.random() < health.prob) {
        healthShock = rng.randomApproxNormal(health.magnitude_mean, health.magnitude_std);
      }
      if (rng.random() < policy.prob) {
        policyShock = rng.randomApproxNormal(policy.magnitude_mean, policy.magnitude_std);
      }

      let executionNoise = rng.randomApproxNormal(0, execution_noise_std);

      if (marketNeedsClamp) marketReturn = clampFast(marketReturn, -0.5, 0.5);
      if (expenseNeedsUpperClamp && expenseShock > 1) expenseShock = 1;
      if (healthNeedsClamp) healthShock = clampFast(healthShock, -0.5, 0.5);
      if (policyNeedsClamp) policyShock = clampFast(policyShock, -0.3, 0.3);
      if (executionNeedsClamp) executionNoise = clampFast(executionNoise, -0.5, 0.5);

      shocks[t] = {
        market_return: marketReturn,
        expense_shock: expenseShock,
        health_shock: healthShock,
        policy_shock: policyShock,
        execution_noise: executionNoise,
      };
    }

    scenarios[i] = {
      index: scenarioIndex,
      shocks,
      weight: invN,
    };
  }

  return { start: payload.start, scenarios };
}
`;

const NODE_WORKER_SOURCE = `${WORKER_CORE_SOURCE}
import { parentPort } from 'node:worker_threads';
if (parentPort) {
  parentPort.on('message', (payload) => {
    const result = generateBatch(payload);
    parentPort.postMessage(result);
  });
}
`;

const BROWSER_WORKER_SOURCE = `${WORKER_CORE_SOURCE}
self.onmessage = (event) => {
  const result = generateBatch(event.data);
  self.postMessage(result);
};
`;

type AnyWorker = {
    postMessage: (value: unknown) => void;
    terminate: () => void | Promise<number>;
};

type NodeWorker = AnyWorker & {
    once: (event: 'message' | 'error', listener: (...args: any[]) => void) => void;
    off: (event: 'message' | 'error', listener: (...args: any[]) => void) => void;
};

type BrowserWorker = AnyWorker & {
    addEventListener: (
        type: 'message' | 'error',
        listener: EventListenerOrEventListenerObject
    ) => void;
    removeEventListener: (
        type: 'message' | 'error',
        listener: EventListenerOrEventListenerObject
    ) => void;
};

let nodeWorkerPool: { size: number; workers: NodeWorker[] } | null = null;
let browserWorkerPool: { size: number; workers: BrowserWorker[]; url: string } | null = null;

function createBatchPlans(n: number, batchSize: number): BatchPlan[] {
    const totalBatches = Math.ceil(n / batchSize);
    const plans: BatchPlan[] = new Array(totalBatches);
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const count = Math.min(batchSize, n - start);
        plans[batchIndex] = { batchIndex, start, count };
    }
    return plans;
}

function assignWorkerBatchResult(results: Scenario[], response: WorkerBatchResponse): void {
    for (let i = 0; i < response.scenarios.length; i++) {
        results[response.start + i] = response.scenarios[i];
    }
}

async function loadNodeWorkerCtor(): Promise<
    (new (filename: string, options?: Record<string, unknown>) => NodeWorker) | null
> {
    const hasNodeRuntime =
        typeof process !== 'undefined' &&
        Boolean((process as any).versions?.node);
    if (!hasNodeRuntime) return null;

    try {
        const workerThreads = await import('node:worker_threads');
        return workerThreads.Worker ?? null;
    } catch {
        return null;
    }
}

async function terminateNodeWorkers(): Promise<void> {
    if (!nodeWorkerPool) return;
    const workers = nodeWorkerPool.workers;
    nodeWorkerPool = null;
    await Promise.all(
        workers.map((worker) => Promise.resolve(worker.terminate()).catch(() => undefined))
    );
}

async function ensureNodeWorkerPool(
    size: number
): Promise<NodeWorker[] | null> {
    if (size <= 0) return [];

    const WorkerCtor = await loadNodeWorkerCtor();
    if (!WorkerCtor) return null;

    if (nodeWorkerPool && nodeWorkerPool.size === size) {
        return nodeWorkerPool.workers;
    }

    await terminateNodeWorkers();

    const workers: NodeWorker[] = [];
    try {
        for (let i = 0; i < size; i++) {
            workers.push(new WorkerCtor(NODE_WORKER_SOURCE, { eval: true, type: 'module' }));
        }
    } catch {
        await Promise.all(
            workers.map((worker) => Promise.resolve(worker.terminate()).catch(() => undefined))
        );
        return null;
    }

    nodeWorkerPool = { size, workers };
    return workers;
}

async function runNodeWorkerParallel(
    plans: BatchPlan[],
    n: number,
    horizon: number,
    seed: number,
    config: ScenarioGeneratorConfig,
    maxConcurrency: number,
    onProgress?: ProgressCallback
): Promise<Scenario[] | null> {
    const workerCount = Math.min(maxConcurrency, plans.length);
    if (workerCount <= 0) return [];

    const workers = await ensureNodeWorkerPool(workerCount);
    if (!workers) return null;

    const results: Scenario[] = new Array(n);
    let nextPlan = 0;
    let completedPlans = 0;
    let generated = 0;

    return await new Promise<Scenario[]>((resolve, reject) => {
        let settled = false;

        const fail = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error(String(error)));
        };

        const tryResolve = () => {
            if (!settled && completedPlans === plans.length) {
                settled = true;
                resolve(results);
            }
        };

        const dispatch = (worker: NodeWorker) => {
            if (settled) return;
            const plan = plans[nextPlan++];
            if (!plan) {
                tryResolve();
                return;
            }

            const payload: WorkerBatchRequest = {
                batchIndex: plan.batchIndex,
                start: plan.start,
                count: plan.count,
                n,
                horizon,
                seed,
                config,
            };

            const onMessage = (raw: unknown) => {
                worker.off('message', onMessage);
                worker.off('error', onError);

                const response = raw as WorkerBatchResponse;
                assignWorkerBatchResult(results, response);
                completedPlans += 1;
                generated += plan.count;
                onProgress?.({
                    current_batch: completedPlans,
                    total_batches: plans.length,
                    scenarios_generated: generated,
                    total_scenarios: n,
                });

                if (completedPlans >= plans.length) {
                    tryResolve();
                    return;
                }
                dispatch(worker);
            };

            const onError = (error: unknown) => {
                worker.off('message', onMessage);
                worker.off('error', onError);
                fail(error);
            };

            worker.once('message', onMessage);
            worker.once('error', onError);
            worker.postMessage(payload);
        };

        for (const worker of workers) {
            dispatch(worker);
        }
    });
}

function hasBrowserWorkerSupport(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof Worker !== 'undefined' &&
        typeof Blob !== 'undefined' &&
        typeof URL !== 'undefined'
    );
}

function terminateBrowserWorkers(): void {
    if (!browserWorkerPool) return;
    for (const worker of browserWorkerPool.workers) {
        worker.terminate();
    }
    URL.revokeObjectURL(browserWorkerPool.url);
    browserWorkerPool = null;
}

function ensureBrowserWorkerPool(size: number): BrowserWorker[] | null {
    if (size <= 0) return [];
    if (!hasBrowserWorkerSupport()) return null;

    if (browserWorkerPool && browserWorkerPool.size === size) {
        return browserWorkerPool.workers;
    }

    terminateBrowserWorkers();

    const url = URL.createObjectURL(
        new Blob([BROWSER_WORKER_SOURCE], { type: 'text/javascript' })
    );
    const workers: BrowserWorker[] = [];
    try {
        for (let i = 0; i < size; i++) {
            workers.push(new Worker(url) as unknown as BrowserWorker);
        }
    } catch {
        for (const worker of workers) worker.terminate();
        URL.revokeObjectURL(url);
        return null;
    }

    browserWorkerPool = { size, workers, url };
    return workers;
}

async function runBrowserWorkerParallel(
    plans: BatchPlan[],
    n: number,
    horizon: number,
    seed: number,
    config: ScenarioGeneratorConfig,
    maxConcurrency: number,
    onProgress?: ProgressCallback
): Promise<Scenario[] | null> {
    const workerCount = Math.min(maxConcurrency, plans.length);
    if (workerCount <= 0) return [];

    const workers = ensureBrowserWorkerPool(workerCount);
    if (!workers) return null;

    const results: Scenario[] = new Array(n);
    let nextPlan = 0;
    let completedPlans = 0;
    let generated = 0;

    return await new Promise<Scenario[]>((resolve, reject) => {
        let settled = false;

        const fail = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error(String(error)));
        };

        const tryResolve = () => {
            if (!settled && completedPlans === plans.length) {
                settled = true;
                resolve(results);
            }
        };

        const dispatch = (worker: BrowserWorker) => {
            if (settled) return;
            const plan = plans[nextPlan++];
            if (!plan) {
                tryResolve();
                return;
            }

            const payload: WorkerBatchRequest = {
                batchIndex: plan.batchIndex,
                start: plan.start,
                count: plan.count,
                n,
                horizon,
                seed,
                config,
            };

            const onMessage = (event: Event) => {
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);

                const message = event as MessageEvent<WorkerBatchResponse>;
                assignWorkerBatchResult(results, message.data);
                completedPlans += 1;
                generated += plan.count;
                onProgress?.({
                    current_batch: completedPlans,
                    total_batches: plans.length,
                    scenarios_generated: generated,
                    total_scenarios: n,
                });

                if (completedPlans >= plans.length) {
                    tryResolve();
                    return;
                }
                dispatch(worker);
            };

            const onError = (event: Event) => {
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                const err = event as ErrorEvent;
                fail(err.error ?? new Error(err.message || 'Browser worker failed'));
            };

            worker.addEventListener('message', onMessage);
            worker.addEventListener('error', onError);
            worker.postMessage(payload);
        };

        for (const worker of workers) {
            dispatch(worker);
        }
    });
}

/**
 * Generate scenarios with optional parallel batch execution.
 * Parallel mode is gated by enable_parallel_scenarios and defaults to false.
 */
export async function generateScenariosParallel(
    n: number,
    horizon: number,
    opts: ParallelScenarioOptions = {}
): Promise<Scenario[]> {
    if (n <= 0 || horizon <= 0) {
        return [];
    }

    const seed = opts.seed ?? DEFAULT_SCENARIO_CONFIG.seed;
    const batchSize = Math.max(1, opts.batch_size ?? 500);
    const maxConcurrency = Math.max(1, opts.max_concurrency ?? 4);
    const workerMode = opts.worker_mode ?? 'auto';
    const complexity = n * horizon;
    const parallelThreshold = Math.max(1, opts.parallel_threshold ?? 1800);
    const shouldParallelize =
        opts.enable_parallel_scenarios === true &&
        (workerMode === 'force' || (workerMode !== 'off' && maxConcurrency > 1 && complexity >= parallelThreshold));

    // Feature flag default: off. In auto mode we also avoid parallel overhead for small workloads.
    if (!shouldParallelize) {
        const generator = createScenarioGenerator(seed, opts.config);
        return generator.generateScenarios(n, horizon);
    }

    const plans = createBatchPlans(n, batchSize);
    const totalBatches = plans.length;
    const mergedConfig = mergeScenarioConfig(seed, opts.config);

    if (maxConcurrency > 1) {
        try {
            const nodeResult = await runNodeWorkerParallel(
                plans,
                n,
                horizon,
                seed,
                mergedConfig,
                maxConcurrency,
                opts.on_progress
            );
            if (nodeResult) return nodeResult;

            const browserResult = await runBrowserWorkerParallel(
                plans,
                n,
                horizon,
                seed,
                mergedConfig,
                maxConcurrency,
                opts.on_progress
            );
            if (browserResult) return browserResult;

            if (workerMode === 'force') {
                throw new Error('Parallel worker mode is not available in this runtime');
            }
        } catch (error) {
            if (workerMode === 'force') {
                throw error instanceof Error ? error : new Error(String(error));
            }
        }
    }

    const results: Scenario[] = new Array(n);
    let generated = 0;
    const shouldYieldForResponsiveness = Boolean(opts.on_progress) && maxConcurrency > 1;

    for (const plan of plans) {
        generateBatchScenariosFast(
            results,
            plan.batchIndex,
            plan.start,
            plan.count,
            n,
            horizon,
            seed,
            mergedConfig
        );
        generated += plan.count;

        if (opts.on_progress) {
            opts.on_progress({
                current_batch: plan.batchIndex + 1,
                total_batches: totalBatches,
                scenarios_generated: generated,
                total_scenarios: n,
            });
        }

        // Yield once per chunk to keep the API async-friendly for long runs.
        if (
            shouldYieldForResponsiveness &&
            (plan.batchIndex + 1) % maxConcurrency === 0 &&
            plan.batchIndex < totalBatches - 1
        ) {
            await Promise.resolve();
        }
    }

    return results;
}

/**
 * Compute statistics over scenarios for validation
 */
export function computeScenarioStats(scenarios: Scenario[]): Record<string, { mean: number; std: number }> {
    const stats: Record<string, { sum: number; sumSq: number; count: number }> = {
        market_return: { sum: 0, sumSq: 0, count: 0 },
        expense_shock: { sum: 0, sumSq: 0, count: 0 },
        health_shock: { sum: 0, sumSq: 0, count: 0 },
        policy_shock: { sum: 0, sumSq: 0, count: 0 },
        execution_noise: { sum: 0, sumSq: 0, count: 0 },
    };

    for (const scenario of scenarios) {
        for (const shock of scenario.shocks) {
            for (const key of Object.keys(stats)) {
                const val = shock[key as keyof ExogenousShock];
                stats[key].sum += val;
                stats[key].sumSq += val * val;
                stats[key].count++;
            }
        }
    }

    const result: Record<string, { mean: number; std: number }> = {};
    for (const key of Object.keys(stats)) {
        const { sum, sumSq, count } = stats[key];
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        result[key] = { mean, std: Math.sqrt(Math.max(0, variance)) };
    }

    return result;
}

/**
 * Verify that two scenario sets from same seed are identical
 */
export function verifyScenariosMatch(a: Scenario[], b: Scenario[], tolerance: number = 1e-10): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i].shocks.length !== b[i].shocks.length) return false;

        for (let t = 0; t < a[i].shocks.length; t++) {
            const shockA = a[i].shocks[t];
            const shockB = b[i].shocks[t];

            for (const key of Object.keys(shockA)) {
                const diff = Math.abs(
                    shockA[key as keyof ExogenousShock] - shockB[key as keyof ExogenousShock]
                );
                if (diff > tolerance) return false;
            }
        }
    }

    return true;
}

// ============================================================================
// PR-04: Shock Library & Enhanced Sampling
// ============================================================================

/**
 * Categorized shock events for more realistic scenario generation
 */
export interface ShockEvent {
    id: string;
    category: 'market' | 'health' | 'expense' | 'policy' | 'career' | 'family';
    name: string;
    description: string;
    probability: number;  // Annual probability
    magnitude: { mean: number; std: number };
    duration_weeks: number;
    correlation_group?: string;
}

/**
 * Built-in shock library
 */
export const SHOCK_LIBRARY: ShockEvent[] = [
    // Market events
    { id: 'market_crash', category: 'market', name: '市场暴跌', description: '股市下跌超过20%', probability: 0.1, magnitude: { mean: -0.25, std: 0.1 }, duration_weeks: 12, correlation_group: 'financial' },
    { id: 'market_boom', category: 'market', name: '市场繁荣', description: '股市上涨超过20%', probability: 0.15, magnitude: { mean: 0.25, std: 0.08 }, duration_weeks: 8, correlation_group: 'financial' },
    { id: 'recession', category: 'market', name: '经济衰退', description: '宏观经济下行', probability: 0.05, magnitude: { mean: -0.15, std: 0.05 }, duration_weeks: 26, correlation_group: 'financial' },

    // Health events
    { id: 'minor_illness', category: 'health', name: '小病', description: '感冒/轻伤', probability: 0.8, magnitude: { mean: -0.05, std: 0.02 }, duration_weeks: 1 },
    { id: 'major_illness', category: 'health', name: '重大疾病', description: '需要住院治疗', probability: 0.03, magnitude: { mean: -0.4, std: 0.15 }, duration_weeks: 8, correlation_group: 'health' },
    { id: 'health_improvement', category: 'health', name: '健康改善', description: '坚持锻炼带来健康改善', probability: 0.3, magnitude: { mean: 0.1, std: 0.05 }, duration_weeks: 12 },

    // Expense events
    { id: 'car_repair', category: 'expense', name: '汽车维修', description: '意外汽车维修支出', probability: 0.2, magnitude: { mean: 0.1, std: 0.05 }, duration_weeks: 1 },
    { id: 'home_repair', category: 'expense', name: '房屋维修', description: '意外房屋维修支出', probability: 0.1, magnitude: { mean: 0.15, std: 0.08 }, duration_weeks: 2 },
    { id: 'medical_expense', category: 'expense', name: '医疗支出', description: '未覆盖的医疗费用', probability: 0.15, magnitude: { mean: 0.2, std: 0.1 }, duration_weeks: 1, correlation_group: 'health' },

    // Career events
    { id: 'promotion', category: 'career', name: '晋升', description: '职位提升带来收入增加', probability: 0.1, magnitude: { mean: 0.2, std: 0.1 }, duration_weeks: 52 },
    { id: 'job_loss', category: 'career', name: '失业', description: '失去工作', probability: 0.03, magnitude: { mean: -0.8, std: 0.1 }, duration_weeks: 16, correlation_group: 'financial' },
    { id: 'bonus', category: 'career', name: '奖金', description: '年终奖金', probability: 0.5, magnitude: { mean: 0.1, std: 0.05 }, duration_weeks: 1 },

    // Family events
    { id: 'new_child', category: 'family', name: '新生儿', description: '家庭添丁', probability: 0.05, magnitude: { mean: 0.3, std: 0.1 }, duration_weeks: 52 },
    { id: 'family_emergency', category: 'family', name: '家庭紧急', description: '家人需要紧急帮助', probability: 0.1, magnitude: { mean: -0.15, std: 0.08 }, duration_weeks: 4 },
];

/**
 * Regime for scenario generation (calm/volatile)
 */
export type MarketRegime = 'calm' | 'volatile';

export interface RegimeState {
    current: MarketRegime;
    duration_weeks: number;
    transition_prob: number;  // Weekly prob of regime switch
}

/**
 * Importance sampling weights for focusing on tail scenarios
 */
export interface ImportanceSampling {
    focus: 'neutral' | 'downside' | 'upside';
    tail_weight: number;  // Multiplier for tail scenarios (1.0 = uniform)
}

/**
 * Extended scenario generator with shock library support
 */
export class EnhancedScenarioGenerator extends ScenarioGenerator {
    private shockLibrary: ShockEvent[];
    private regime: RegimeState;
    private importanceSampling: ImportanceSampling;

    constructor(
        config: Partial<ScenarioGeneratorConfig> = {},
        shockLibrary: ShockEvent[] = SHOCK_LIBRARY,
        importanceSampling: ImportanceSampling = { focus: 'neutral', tail_weight: 1.0 }
    ) {
        super(config);
        this.shockLibrary = shockLibrary;
        this.regime = {
            current: 'calm',
            duration_weeks: 0,
            transition_prob: 0.02,
        };
        this.importanceSampling = importanceSampling;
    }

    /**
     * Generate shock with library events and regime awareness
     */
    generateEnhancedShock(rng: SeededRNG): ExogenousShock & { triggered_events: string[] } {
        const baseShock = super.generateShock();
        const triggeredEvents: string[] = [];

        // Check regime transition
        if (rng.random() < this.regime.transition_prob) {
            this.regime.current = this.regime.current === 'calm' ? 'volatile' : 'calm';
            this.regime.duration_weeks = 0;
        }
        this.regime.duration_weeks++;

        // Regime adjustments
        const volatilityMultiplier = this.regime.current === 'volatile' ? 2.0 : 1.0;

        // Apply importance sampling
        let sampleWeight = 1.0;
        if (this.importanceSampling.focus === 'downside') {
            // Increase probability of negative events
            sampleWeight = baseShock.market_return < 0 ? this.importanceSampling.tail_weight : 1.0;
        } else if (this.importanceSampling.focus === 'upside') {
            sampleWeight = baseShock.market_return > 0 ? this.importanceSampling.tail_weight : 1.0;
        }

        // Check library events
        const weeklyProb = 1 / 52;  // Convert annual to weekly
        for (const event of this.shockLibrary) {
            const adjustedProb = event.probability * weeklyProb * volatilityMultiplier;
            if (rng.random() < adjustedProb) {
                triggeredEvents.push(event.id);
                // Apply event effects
                switch (event.category) {
                    case 'market':
                        baseShock.market_return += rng.randomNormal(event.magnitude.mean, event.magnitude.std);
                        break;
                    case 'health':
                        baseShock.health_shock += rng.randomNormal(event.magnitude.mean, event.magnitude.std);
                        break;
                    case 'expense':
                        baseShock.expense_shock += rng.randomNormal(event.magnitude.mean, event.magnitude.std);
                        break;
                    case 'policy':
                        baseShock.policy_shock += rng.randomNormal(event.magnitude.mean, event.magnitude.std);
                        break;
                }
            }
        }

        // Clamp values
        return {
            market_return: clamp(baseShock.market_return, -0.5, 0.5),
            expense_shock: clamp(baseShock.expense_shock, 0, 1),
            health_shock: clamp(baseShock.health_shock, -0.5, 0.5),
            policy_shock: clamp(baseShock.policy_shock, -0.3, 0.3),
            execution_noise: baseShock.execution_noise,
            triggered_events: triggeredEvents,
        };
    }

    /**
     * Get current regime
     */
    getRegime(): MarketRegime {
        return this.regime.current;
    }

    /**
     * Set regime manually (for testing)
     */
    setRegime(regime: MarketRegime): void {
        this.regime.current = regime;
        this.regime.duration_weeks = 0;
    }
}

/**
 * Create enhanced scenario generator
 */
export function createEnhancedScenarioGenerator(
    seed: number,
    config?: Partial<ScenarioGeneratorConfig>,
    importanceSampling?: ImportanceSampling
): EnhancedScenarioGenerator {
    return new EnhancedScenarioGenerator({ ...config, seed }, SHOCK_LIBRARY, importanceSampling);
}

/**
 * Get shock event by ID
 */
export function getShockEvent(id: string): ShockEvent | undefined {
    return SHOCK_LIBRARY.find(e => e.id === id);
}

/**
 * Get shocks by category
 */
export function getShocksByCategory(category: ShockEvent['category']): ShockEvent[] {
    return SHOCK_LIBRARY.filter(e => e.category === category);
}

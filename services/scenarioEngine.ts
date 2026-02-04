/**
 * Scenario Engine
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Monte Carlo scenario generation for MPC solver.
 * Generates exogenous shocks and execution flags.
 */

import type { ExogenousShock, TwinParams, ParamKey } from './twinTypes';

// ============================================================================
// Types
// ============================================================================

/**
 * Specification for scenario generation
 */
export interface ScenarioSpec {
    /** Number of scenarios to generate */
    n_scenarios: number;
    /** Horizon length in steps (e.g., weeks) */
    horizon_steps: number;
    /** Step size in weeks */
    dt: number;
    /** Random seed for reproducibility */
    seed: number;
}

/**
 * A single scenario sample
 */
export interface ScenarioSample {
    /** Exogenous shocks per timestep */
    shocks: ExogenousShock[];
    /** Execution flags per timestep */
    exec_flags: boolean[];
    /** Optional parameter noise */
    param_noise?: Partial<Record<ParamKey, number>>;
}

/**
 * Result of scenario generation
 */
export interface ScenarioBundle {
    spec: ScenarioSpec;
    samples: ScenarioSample[];
    generated_at: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SCENARIO_SPEC: ScenarioSpec = {
    n_scenarios: 500,
    horizon_steps: 12,  // 12 weeks
    dt: 1,
    seed: Date.now(),
};

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Simple seeded PRNG (Mulberry32)
 */
class SeededRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    /**
     * Generate next random number in [0, 1)
     */
    next(): number {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Generate normal random (Box-Muller)
     */
    nextNormal(mean: number = 0, std: number = 1): number {
        const u1 = this.next();
        const u2 = this.next();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * std;
    }

    /**
     * Generate Bernoulli random
     */
    nextBernoulli(p: number): boolean {
        return this.next() < p;
    }
}

// ============================================================================
// Scenario Generation
// ============================================================================

/**
 * Generate a bundle of scenarios
 */
export function generateScenarios(
    spec: ScenarioSpec,
    params: TwinParams
): ScenarioBundle {
    const rng = new SeededRNG(spec.seed);
    const samples: ScenarioSample[] = [];

    for (let i = 0; i < spec.n_scenarios; i++) {
        const sample = generateSingleScenario(rng, spec, params);
        samples.push(sample);
    }

    return {
        spec,
        samples,
        generated_at: Date.now(),
    };
}

/**
 * Generate a single scenario sample
 */
function generateSingleScenario(
    rng: SeededRNG,
    spec: ScenarioSpec,
    params: TwinParams
): ScenarioSample {
    const shocks: ExogenousShock[] = [];
    const exec_flags: boolean[] = [];

    const { theta } = params;
    const shockFreq = theta.shock_frequency;
    const shockSeverity = theta.shock_severity;
    const adherence = theta.execution_adherence;

    for (let t = 0; t < spec.horizon_steps; t++) {
        // Generate execution flag (Bernoulli based on adherence)
        exec_flags.push(rng.nextBernoulli(adherence));

        // Generate exogenous shocks
        const shock: ExogenousShock = {};

        // Market return (log-normal)
        shock.market_return = rng.nextNormal(
            theta.market_return_mu * spec.dt,
            theta.market_return_sigma * Math.sqrt(spec.dt)
        );

        // Health shock (rare negative event)
        if (rng.nextBernoulli(shockFreq * spec.dt)) {
            shock.health_shock = -rng.next() * shockSeverity;
        }

        // Time shock (unexpected time crunch)
        if (rng.nextBernoulli(shockFreq * 0.5 * spec.dt)) {
            shock.time_shock = -rng.next() * shockSeverity * 0.5;
        }

        // Expense shock (unexpected expense)
        if (rng.nextBernoulli(shockFreq * 0.3 * spec.dt)) {
            shock.expense_shock = rng.next() * shockSeverity * 0.8;
        }

        shocks.push(shock);
    }

    return { shocks, exec_flags };
}

// ============================================================================
// Progressive Refinement
// ============================================================================

/**
 * Progressive scenario generation for responsive UI
 * Returns quick results first, then refines
 */
export async function generateScenariosProgressive(
    spec: ScenarioSpec,
    params: TwinParams,
    onProgress?: (bundle: ScenarioBundle, pass: number) => void
): Promise<ScenarioBundle> {
    const passes = [
        { n: Math.min(300, spec.n_scenarios), delay: 0 },
        { n: Math.min(1200, spec.n_scenarios), delay: 100 },
        { n: spec.n_scenarios, delay: 200 },
    ];

    let finalBundle: ScenarioBundle | null = null;

    for (let i = 0; i < passes.length; i++) {
        const pass = passes[i];
        if (pass.n <= (finalBundle?.samples.length ?? 0)) continue;

        if (pass.delay > 0) {
            await new Promise(r => setTimeout(r, pass.delay));
        }

        const passSpec = { ...spec, n_scenarios: pass.n };
        finalBundle = generateScenarios(passSpec, params);

        if (onProgress) {
            onProgress(finalBundle, i + 1);
        }
    }

    return finalBundle!;
}

// ============================================================================
// Scenario Utilities
// ============================================================================

/**
 * Sample scenarios from a bundle (for quick evaluation)
 */
export function sampleScenarios(
    bundle: ScenarioBundle,
    count: number
): ScenarioSample[] {
    if (count >= bundle.samples.length) {
        return bundle.samples;
    }

    const step = bundle.samples.length / count;
    const samples: ScenarioSample[] = [];

    for (let i = 0; i < count; i++) {
        const idx = Math.floor(i * step);
        samples.push(bundle.samples[idx]);
    }

    return samples;
}

/**
 * Get scenario statistics
 */
export function getScenarioStats(bundle: ScenarioBundle): {
    avg_market_return: number;
    shock_rate: number;
    avg_adherence: number;
} {
    let totalMarketReturn = 0;
    let shockCount = 0;
    let execCount = 0;
    let totalSteps = 0;

    for (const sample of bundle.samples) {
        for (let t = 0; t < sample.shocks.length; t++) {
            totalMarketReturn += sample.shocks[t].market_return ?? 0;
            if (sample.shocks[t].health_shock || sample.shocks[t].expense_shock) {
                shockCount++;
            }
            if (sample.exec_flags[t]) {
                execCount++;
            }
            totalSteps++;
        }
    }

    return {
        avg_market_return: totalMarketReturn / totalSteps,
        shock_rate: shockCount / totalSteps,
        avg_adherence: execCount / totalSteps,
    };
}

// ============================================================================
// P1-3: Common Random Numbers (CRN) Support
// ============================================================================

/**
 * Shock bundle with uniform random numbers for CRN
 * Execution flags are derived at rollout time from particle params
 */
export interface ShockBundle {
    spec: Omit<ScenarioSpec, 'n_scenarios'> & { n_scenarios: number };
    /** Shocks per scenario per timestep (no execution flags) */
    shocks: ExogenousShock[][];
    /** Uniform random numbers for execution flag derivation per scenario per timestep */
    uniformRands: number[][];
    generated_at: number;
}

/**
 * Generate shock bundle independently of particle params (CRN)
 * This allows same shocks to be used across different particles
 */
export function generateShockBundle(
    spec: ScenarioSpec,
    baseParams?: Partial<TwinParams>
): ShockBundle {
    const rng = new SeededRNG(spec.seed);
    const shocks: ExogenousShock[][] = [];
    const uniformRands: number[][] = [];

    // Default shock parameters
    const theta = baseParams?.theta ?? {
        shock_frequency: 0.1,
        shock_severity: 0.15,
        market_return_mu: 0.06,
        market_return_sigma: 0.18,
        execution_adherence: 0.7,
        risk_aversion: 0.5,
    };

    for (let i = 0; i < spec.n_scenarios; i++) {
        const scenarioShocks: ExogenousShock[] = [];
        const scenarioUnifs: number[] = [];

        for (let t = 0; t < spec.horizon_steps; t++) {
            // Store uniform random for execution flag derivation
            scenarioUnifs.push(rng.next());

            // Generate exogenous shocks
            const shock: ExogenousShock = {};

            // Market return (log-normal)
            shock.market_return = rng.nextNormal(
                theta.market_return_mu * spec.dt,
                theta.market_return_sigma * Math.sqrt(spec.dt)
            );

            // Health shock (rare negative event)
            if (rng.nextBernoulli(theta.shock_frequency * spec.dt)) {
                shock.health_shock = -rng.next() * theta.shock_severity;
            }

            // Time shock (unexpected time crunch)
            if (rng.nextBernoulli(theta.shock_frequency * 0.5 * spec.dt)) {
                shock.time_shock = -rng.next() * theta.shock_severity * 0.5;
            }

            // Expense shock (unexpected expense)
            if (rng.nextBernoulli(theta.shock_frequency * 0.3 * spec.dt)) {
                shock.expense_shock = rng.next() * theta.shock_severity * 0.8;
            }

            scenarioShocks.push(shock);
        }

        shocks.push(scenarioShocks);
        uniformRands.push(scenarioUnifs);
    }

    return {
        spec,
        shocks,
        uniformRands,
        generated_at: Date.now(),
    };
}

/**
 * Derive execution flags from uniform random and particle's execution adherence
 * This is the key for belief-aware optimization - different particles get different execution flags
 */
export function deriveExecuteFlags(
    uniformRands: number[],
    executionAdherence: number
): boolean[] {
    return uniformRands.map(u => u < executionAdherence);
}

/**
 * Convert shock bundle + particle to scenario sample
 */
export function shockBundleToScenario(
    shockBundle: ShockBundle,
    scenarioIdx: number,
    executionAdherence: number
): ScenarioSample {
    const shocks = shockBundle.shocks[scenarioIdx];
    const uniforms = shockBundle.uniformRands[scenarioIdx];
    const exec_flags = deriveExecuteFlags(uniforms, executionAdherence);

    return { shocks, exec_flags };
}

/**
 * Sample particles from belief for belief-aware evaluation
 * Uses stratified sampling based on weights
 */
export function sampleParticlesStratified(
    weights: number[],
    count: number,
    seed: number
): number[] {
    const rng = new SeededRNG(seed);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normWeights = weights.map(w => w / totalWeight);

    // Build CDF
    const cdf: number[] = [];
    let cumSum = 0;
    for (const w of normWeights) {
        cumSum += w;
        cdf.push(cumSum);
    }

    // Stratified sampling
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
        const u = (i + rng.next()) / count;
        const idx = cdf.findIndex(c => c >= u);
        indices.push(idx >= 0 ? idx : weights.length - 1);
    }

    return indices;
}


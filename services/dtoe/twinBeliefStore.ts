/**
 * Twin Belief Store
 * Phase 3 v0.2: Particle Filter Implementation
 * 
 * Maintains a particle-based belief state for the digital twin,
 * enabling uncertainty quantification and Bayesian updates.
 */

import type { TwinState, Observation, UncertaintyVariable } from './coreSchemas';
import { createDefaultTwinState } from './coreSchemas';

// ============================================================================
// Types
// ============================================================================

export interface Particle {
    /** State vector */
    state: TwinState;
    /** Parameter vector (learned/uncertain) */
    params: ParticleParams;
    /** Normalized weight [0, 1], sum to 1 across particles */
    weight: number;
}

export interface ParticleParams {
    /** Income growth rate */
    income_growth: number;
    /** Expected market return */
    market_return_mu: number;
    /** Market volatility */
    market_return_sigma: number;
    /** Health recovery rate */
    health_recovery: number;
    /** Stress sensitivity */
    stress_sensitivity: number;
    /** Adherence to planned actions */
    execution_adherence: number;
    /** Shock frequency */
    shock_frequency: number;
    /** Shock severity */
    shock_severity: number;
}

export interface BeliefState {
    entity_id: string;
    /** Particle set (typically 200-2000 particles) */
    particles: Particle[];
    /** Number of particles */
    n_particles: number;
    /** Last update timestamp */
    updated_at_ms: number;
    /** Version for optimistic locking */
    version: number;
    /** ESS threshold for resampling */
    ess_threshold: number;
}

export interface PosteriorSummary {
    mean: Record<string, number>;
    std: Record<string, number>;
    params_mean: ParticleParams;
    params_std: Partial<ParticleParams>;
}

// ============================================================================
// Seeded Random Number Generator (Mulberry32)
// ============================================================================

export class SeededRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    /** Returns random number in [0, 1) */
    random(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Box-Muller transform for normal distribution */
    randomNormal(mean: number = 0, std: number = 1): number {
        const u1 = this.random();
        const u2 = this.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z0 * std;
    }

    /** Clone with same state */
    clone(): SeededRNG {
        const rng = new SeededRNG(0);
        rng.state = this.state;
        return rng;
    }
}

// ============================================================================
// Default Parameter Priors
// ============================================================================

const DEFAULT_PARAM_PRIORS: Record<keyof ParticleParams, { mean: number; std: number }> = {
    income_growth: { mean: 0.03, std: 0.02 },
    market_return_mu: { mean: 0.07, std: 0.03 },
    market_return_sigma: { mean: 0.15, std: 0.05 },
    health_recovery: { mean: 0.1, std: 0.05 },
    stress_sensitivity: { mean: 0.5, std: 0.2 },
    execution_adherence: { mean: 0.7, std: 0.15 },
    shock_frequency: { mean: 0.1, std: 0.05 },
    shock_severity: { mean: 0.3, std: 0.1 },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create initial belief state with n_particles
 */
export function createBeliefState(
    entity_id: string,
    seed: number = Date.now(),
    n_particles: number = 1000
): BeliefState {
    const rng = new SeededRNG(seed);
    const particles: Particle[] = [];

    const baseState = createDefaultTwinState({
        entity_id,
        entity_type: 'person',
        display_name: 'User',
    });

    for (let i = 0; i < n_particles; i++) {
        // Sample parameters from priors
        const params = sampleParamsFromPrior(rng);

        // Add noise to base state
        const state = perturbState(baseState, rng);

        particles.push({
            state,
            params,
            weight: 1 / n_particles,
        });
    }

    return {
        entity_id,
        particles,
        n_particles,
        updated_at_ms: Date.now(),
        version: 1,
        ess_threshold: n_particles / 2,
    };
}

/**
 * Sample parameters from prior distributions
 */
function sampleParamsFromPrior(rng: SeededRNG): ParticleParams {
    const params: Partial<ParticleParams> = {};

    for (const [key, prior] of Object.entries(DEFAULT_PARAM_PRIORS)) {
        const value = rng.randomNormal(prior.mean, prior.std);
        // Clamp to reasonable ranges
        params[key as keyof ParticleParams] = Math.max(0, Math.min(1, value));
    }

    return params as ParticleParams;
}

/**
 * Add slight perturbation to base state
 */
function perturbState(base: TwinState, rng: SeededRNG): TwinState {
    const perturbed = JSON.parse(JSON.stringify(base)) as TwinState;

    // Perturb resources
    for (const key of Object.keys(perturbed.resources)) {
        const val = perturbed.resources[key];
        if (typeof val === 'number') {
            perturbed.resources[key] = Math.max(0, Math.min(1, val + rng.randomNormal(0, 0.05)));
        }
    }

    // Perturb trust confidence
    perturbed.trust.confidence = Math.max(
        0,
        Math.min(1, perturbed.trust.confidence + rng.randomNormal(0, 0.1))
    );

    return perturbed;
}

/**
 * Compute Effective Sample Size (ESS)
 * ESS = 1 / sum(w_i^2)
 */
export function computeESS(particles: Particle[]): number {
    const sumSquaredWeights = particles.reduce((sum, p) => sum + p.weight * p.weight, 0);
    return 1 / sumSquaredWeights;
}

/**
 * Compute likelihood of observation given particle
 */
function computeLikelihood(particle: Particle, observation: Observation): number {
    const { obs_type, payload } = observation;

    switch (obs_type) {
        case 'keyboard_signal': {
            // Keyboard signals weakly update stress/energy
            const signalStrength = (payload.signal_strength as number) || 0.5;
            const predictedStress = particle.state.resources.attention_budget_score || 0.5;
            const diff = Math.abs(signalStrength - predictedStress);
            return Math.exp(-diff * 2);
        }

        case 'user_upload': {
            // User uploads provide strong evidence
            return 0.9;
        }

        case 'evidence_pack': {
            // Evidence packs update based on confidence
            const confidence = (payload.confidence as number) || 0.5;
            return 0.5 + 0.5 * confidence;
        }

        case 'explicit_goal_update': {
            // Goal updates don't change likelihood
            return 1.0;
        }

        default:
            return 1.0;
    }
}

/**
 * Update belief state with new observation (Bayesian update)
 * Uses importance sampling: reweight particles by likelihood
 */
export function updateBeliefWithEvidence(
    belief: BeliefState,
    observation: Observation
): BeliefState {
    const updatedParticles = belief.particles.map((particle) => {
        const likelihood = computeLikelihood(particle, observation);
        return {
            ...particle,
            weight: particle.weight * likelihood,
        };
    });

    // Normalize weights
    const totalWeight = updatedParticles.reduce((sum, p) => sum + p.weight, 0);

    if (totalWeight === 0) {
        // All particles have zero weight - reset to uniform
        const uniformWeight = 1 / updatedParticles.length;
        updatedParticles.forEach((p) => (p.weight = uniformWeight));
    } else {
        updatedParticles.forEach((p) => (p.weight /= totalWeight));
    }

    // Check ESS and resample if needed
    const ess = computeESS(updatedParticles);
    let finalParticles = updatedParticles;

    if (ess < belief.ess_threshold) {
        finalParticles = resampleParticles(updatedParticles, belief.n_particles);
    }

    return {
        ...belief,
        particles: finalParticles,
        updated_at_ms: Date.now(),
        version: belief.version + 1,
    };
}

/**
 * Systematic resampling (lower variance than multinomial)
 */
export function resampleParticles(
    particles: Particle[],
    n_particles: number,
    seed?: number
): Particle[] {
    const rng = new SeededRNG(seed ?? Date.now());
    const n = particles.length;
    const newParticles: Particle[] = [];

    // Cumulative distribution
    const cumulative: number[] = [];
    let cumSum = 0;
    for (const p of particles) {
        cumSum += p.weight;
        cumulative.push(cumSum);
    }

    // Systematic resampling
    const step = 1 / n_particles;
    let u = rng.random() * step;

    let j = 0;
    for (let i = 0; i < n_particles; i++) {
        while (j < n - 1 && cumulative[j] < u) {
            j++;
        }

        // Clone particle with uniform weight
        newParticles.push({
            state: JSON.parse(JSON.stringify(particles[j].state)),
            params: { ...particles[j].params },
            weight: 1 / n_particles,
        });

        u += step;
    }

    return newParticles;
}

/**
 * Get posterior mean of state variables
 */
export function getPosteriorMeanState(belief: BeliefState): Record<string, number> {
    const mean: Record<string, number> = {};

    // Aggregate resource keys
    const resourceKeys = new Set<string>();
    for (const p of belief.particles) {
        for (const key of Object.keys(p.state.resources)) {
            resourceKeys.add(key);
        }
    }

    for (const key of resourceKeys) {
        let weightedSum = 0;
        for (const p of belief.particles) {
            const val = p.state.resources[key];
            if (typeof val === 'number') {
                weightedSum += p.weight * val;
            }
        }
        mean[key] = weightedSum;
    }

    return mean;
}

/**
 * Get posterior standard deviation of state variables
 */
export function getPosteriorStd(belief: BeliefState): Record<string, number> {
    const mean = getPosteriorMeanState(belief);
    const std: Record<string, number> = {};

    for (const key of Object.keys(mean)) {
        let weightedVariance = 0;
        for (const p of belief.particles) {
            const val = p.state.resources[key];
            if (typeof val === 'number') {
                const diff = val - mean[key];
                weightedVariance += p.weight * diff * diff;
            }
        }
        std[key] = Math.sqrt(weightedVariance);
    }

    return std;
}

/**
 * Get full posterior summary
 */
export function getPosteriorSummary(belief: BeliefState): PosteriorSummary {
    const mean = getPosteriorMeanState(belief);
    const std = getPosteriorStd(belief);

    // Compute parameter means
    const paramKeys = Object.keys(DEFAULT_PARAM_PRIORS) as (keyof ParticleParams)[];
    const params_mean: ParticleParams = {} as ParticleParams;
    const params_std: Partial<ParticleParams> = {};

    for (const key of paramKeys) {
        let weightedSum = 0;
        for (const p of belief.particles) {
            weightedSum += p.weight * p.params[key];
        }
        params_mean[key] = weightedSum;
    }

    for (const key of paramKeys) {
        let weightedVariance = 0;
        for (const p of belief.particles) {
            const diff = p.params[key] - params_mean[key];
            weightedVariance += p.weight * diff * diff;
        }
        params_std[key] = Math.sqrt(weightedVariance);
    }

    return { mean, std, params_mean, params_std };
}

/**
 * Get a representative particle (weighted sample)
 */
export function sampleParticle(belief: BeliefState, rng?: SeededRNG): Particle {
    const random = rng?.random() ?? Math.random();
    let cumSum = 0;

    for (const p of belief.particles) {
        cumSum += p.weight;
        if (random <= cumSum) {
            return p;
        }
    }

    return belief.particles[belief.particles.length - 1];
}

/**
 * Verify weights are normalized
 */
export function verifyNormalized(particles: Particle[], tolerance: number = 1e-6): boolean {
    const sum = particles.reduce((s, p) => s + p.weight, 0);
    return Math.abs(sum - 1) < tolerance;
}

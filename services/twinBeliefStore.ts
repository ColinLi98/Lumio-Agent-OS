/**
 * Twin Belief Store
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Manages the belief state (particle filter) for the digital twin.
 * Provides create, load, save, reweight, and resample operations.
 */

import {
    BeliefState,
    Particle,
    TwinState,
    TwinParams,
    SubjectRef,
    StateKey,
    ParamKey,
    DEFAULT_STATE,
    DEFAULT_PARAMS,
} from './twinTypes.js';
import type { TwinEvidence, OutcomeLoggedPayload, WeeklyReviewPayload } from './twinEvidenceTypes.js';
import { eventBus } from './eventBus.js';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    BELIEF: (id: string) => `lumi_twin_belief_${id}`,
    EVIDENCE_LOG: (id: string) => `lumi_evidence_log_${id}`,
} as const;

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_PARTICLE_COUNT = 500;
const MIN_EFFECTIVE_PARTICLES = 0.3;  // Resample when ESS drops below 30%

// ============================================================================
// Initialization
// ============================================================================

/**
 * Create a new belief state with default particles
 */
export function createBeliefState(
    subject: SubjectRef,
    particleCount: number = DEFAULT_PARTICLE_COUNT
): BeliefState {
    const particles: Particle[] = [];
    const uniformWeight = 1 / particleCount;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            state: {
                t: Date.now(),
                x: { ...DEFAULT_STATE },
            },
            params: {
                theta: { ...DEFAULT_PARAMS },
            },
            weight: uniformWeight,
        });
    }

    // Add some diversity to initial particles
    for (const p of particles) {
        for (const key of Object.keys(p.state.x) as StateKey[]) {
            p.state.x[key] = clamp(p.state.x[key] + (Math.random() - 0.5) * 0.2);
        }
        for (const key of Object.keys(p.params.theta) as ParamKey[]) {
            const base = p.params.theta[key];
            p.params.theta[key] = clamp(base * (0.8 + Math.random() * 0.4), 0, 2);
        }
    }

    const belief: BeliefState = {
        subject,
        particles,
        updated_at: Date.now(),
        version: 1,
    };

    console.log(`[TwinBeliefStore] Created new belief state for ${subject.display_name} with ${particleCount} particles`);
    return belief;
}

/**
 * Get default subject for personal use
 */
export function getDefaultSubject(): SubjectRef {
    return {
        subject_id: 'self',
        subject_type: 'person',
        display_name: '我',
    };
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Save belief state to localStorage
 */
export function saveBeliefState(belief: BeliefState): void {
    try {
        const key = STORAGE_KEYS.BELIEF(belief.subject.subject_id);
        localStorage.setItem(key, JSON.stringify(belief));
        console.log(`[TwinBeliefStore] Saved belief state v${belief.version}`);
    } catch (e) {
        console.error('[TwinBeliefStore] Failed to save belief state:', e);
    }
}

/**
 * Load belief state from localStorage
 */
export function loadBeliefState(subjectId: string): BeliefState | null {
    try {
        const key = STORAGE_KEYS.BELIEF(subjectId);
        const stored = localStorage.getItem(key);
        if (stored) {
            const belief = JSON.parse(stored) as BeliefState;
            console.log(`[TwinBeliefStore] Loaded belief state v${belief.version} with ${belief.particles.length} particles`);
            return belief;
        }
    } catch (e) {
        console.error('[TwinBeliefStore] Failed to load belief state:', e);
    }
    return null;
}

/**
 * Load or create belief state
 */
export function loadOrCreateBeliefState(
    subject: SubjectRef = getDefaultSubject(),
    particleCount: number = DEFAULT_PARTICLE_COUNT
): BeliefState {
    const existing = loadBeliefState(subject.subject_id);
    if (existing) {
        return existing;
    }
    return createBeliefState(subject, particleCount);
}

// ============================================================================
// Evidence Integration (Belief Update)
// ============================================================================

/**
 * Update belief state based on evidence
 * Uses importance reweighting
 */
export function updateBeliefWithEvidence(
    belief: BeliefState,
    evidence: TwinEvidence
): BeliefState {
    console.log(`[TwinBeliefStore] Updating belief with evidence: ${evidence.type}`);

    // Clone particles for update
    const newParticles = belief.particles.map(p => ({
        ...p,
        state: { ...p.state, x: { ...p.state.x } },
        params: { ...p.params, theta: { ...p.params.theta } },
    }));

    // Compute likelihood for each particle and reweight
    for (const particle of newParticles) {
        const likelihood = computeLikelihood(particle, evidence);
        particle.weight *= likelihood;
    }

    // Normalize weights
    normalizeWeights(newParticles);

    // Check if resampling needed
    const ess = computeESS(newParticles);
    console.log(`[TwinBeliefStore] ESS: ${ess.toFixed(0)} / ${newParticles.length}`);

    let finalParticles = newParticles;
    if (ess < MIN_EFFECTIVE_PARTICLES * newParticles.length) {
        console.log('[TwinBeliefStore] Resampling particles due to low ESS');
        finalParticles = resampleParticles(newParticles);
    }

    const updatedBelief: BeliefState = {
        ...belief,
        particles: finalParticles,
        updated_at: Date.now(),
        version: belief.version + 1,
    };

    // Emit event
    eventBus.emit({
        event_type: 'twin.updated',
        timestamp: Date.now(),
        subject_id: belief.subject.subject_id,
        evidence_type: evidence.type,
        ess,
        version: updatedBelief.version,
    } as any);

    return updatedBelief;
}

/**
 * Compute likelihood of evidence given particle (P1-4: Enhanced)
 * Uses Beta-like update for execution adherence and Gaussian for continuous observations
 */
function computeLikelihood(particle: Particle, evidence: TwinEvidence): number {
    const payload = evidence.payload;

    switch (payload._type) {
        case 'outcome_logged': {
            const p = payload as OutcomeLoggedPayload;
            const adherence = particle.params.theta.execution_adherence;

            // P1-4: Bernoulli/Beta-like update for execution adherence
            // success -> higher likelihood for high-adherence particles
            // failure -> higher likelihood for low-adherence particles
            if (p.outcome === 'success') {
                // P(success | adherence) = adherence
                return 0.3 + 0.7 * adherence;
            } else if (p.outcome === 'partial') {
                // Partial completion - neutral, slight favor to moderate adherence
                return 0.5 + 0.5 * (1 - Math.abs(adherence - 0.5));
            } else {
                // failure - P(fail | adherence) = 1 - adherence
                return 0.3 + 0.7 * (1 - adherence);
            }
        }

        case 'weekly_review': {
            const p = payload as WeeklyReviewPayload;
            const adherence = particle.params.theta.execution_adherence;

            // P1-4: Compare completion rate to particle's expected adherence
            // Using Gaussian likelihood with std=0.15
            const diff = p.completion_rate - adherence;
            const sigma = 0.15;
            const executionLikelihood = Math.exp(-0.5 * (diff / sigma) ** 2);

            // P1-4: State observation likelihood for stress/energy (if provided)
            let stateLikelihood = 1.0;
            if (p.stress_average !== undefined) {
                const stressDiff = p.stress_average - particle.state.x.stress;
                stateLikelihood *= Math.exp(-0.5 * (stressDiff / 0.2) ** 2);
            }
            if (p.energy_average !== undefined) {
                const energyDiff = p.energy_average - particle.state.x.energy;
                stateLikelihood *= Math.exp(-0.5 * (energyDiff / 0.2) ** 2);
            }

            // P1-4: Satisfaction-based preference weight update
            // High mood/satisfaction -> particle with matching preferences more likely
            let satisfactionLikelihood = 1.0;
            if (p.mood_average !== undefined && p.mood_average > 0.7) {
                // High mood/satisfaction -> particle with matching preferences more likely
                satisfactionLikelihood = 0.8 + 0.4 * p.mood_average;
            }

            return executionLikelihood * stateLikelihood * satisfactionLikelihood;
        }

        case 'trait_confirmed':
            // High confidence evidence - strong likelihood
            return 1.2;

        case 'trait_rejected':
            // Lower weight for particles that predicted the trait
            return 0.6;

        default:
            return 1.0;  // Neutral likelihood for unknown types
    }
}

// ============================================================================
// Resampling
// ============================================================================

/**
 * Low-variance resampling (systematic resampling)
 */
export function resampleParticles(particles: Particle[]): Particle[] {
    const N = particles.length;
    const newParticles: Particle[] = [];

    // Compute cumulative sum of weights
    const cumsum: number[] = [];
    let sum = 0;
    for (const p of particles) {
        sum += p.weight;
        cumsum.push(sum);
    }

    // Systematic resampling
    const step = 1 / N;
    let u = Math.random() * step;
    let j = 0;

    for (let i = 0; i < N; i++) {
        while (j < N - 1 && cumsum[j] < u) {
            j++;
        }

        // Clone the particle with uniform weight
        const source = particles[j];
        newParticles.push({
            state: { ...source.state, x: { ...source.state.x } },
            params: { ...source.params, theta: { ...source.params.theta } },
            weight: 1 / N,
        });

        u += step;
    }

    // Add small perturbation to avoid particle degeneracy
    for (const p of newParticles) {
        for (const key of Object.keys(p.state.x) as StateKey[]) {
            p.state.x[key] = clamp(p.state.x[key] + (Math.random() - 0.5) * 0.02);
        }
    }

    return newParticles;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize particle weights to sum to 1
 */
function normalizeWeights(particles: Particle[]): void {
    const sum = particles.reduce((acc, p) => acc + p.weight, 0);
    if (sum > 0) {
        for (const p of particles) {
            p.weight /= sum;
        }
    }
}

/**
 * Compute Effective Sample Size
 */
function computeESS(particles: Particle[]): number {
    const sumSquared = particles.reduce((acc, p) => acc + p.weight * p.weight, 0);
    return sumSquared > 0 ? 1 / sumSquared : 0;
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number = 0, max: number = 1): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Get mean state across particles
 */
export function getMeanState(belief: BeliefState): Record<StateKey, number> {
    const mean: Record<StateKey, number> = { ...DEFAULT_STATE };

    for (const key of Object.keys(mean) as StateKey[]) {
        mean[key] = belief.particles.reduce(
            (acc, p) => acc + p.weight * p.state.x[key],
            0
        );
    }

    return mean;
}

/**
 * Get mean params across particles
 */
export function getMeanParams(belief: BeliefState): Record<ParamKey, number> {
    const mean: Record<ParamKey, number> = { ...DEFAULT_PARAMS };

    for (const key of Object.keys(mean) as ParamKey[]) {
        mean[key] = belief.particles.reduce(
            (acc, p) => acc + p.weight * p.params.theta[key],
            0
        );
    }

    return mean;
}

/**
 * Get state standard deviation across particles
 */
export function getStateStd(belief: BeliefState): Record<StateKey, number> {
    const mean = getMeanState(belief);
    const std: Record<StateKey, number> = { ...DEFAULT_STATE };

    for (const key of Object.keys(std) as StateKey[]) {
        const variance = belief.particles.reduce(
            (acc, p) => acc + p.weight * Math.pow(p.state.x[key] - mean[key], 2),
            0
        );
        std[key] = Math.sqrt(variance);
    }

    return std;
}

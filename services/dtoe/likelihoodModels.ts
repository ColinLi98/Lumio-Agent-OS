/**
 * Likelihood Models - Phase 3+
 * 
 * Library of likelihood models for particle filter updates.
 * Each model computes P(observation | state) for belief updating.
 * 
 * Theory: Particle filter likelihood weighting
 * P(state | obs) ∝ P(obs | state) × P(state)
 */

import type { TwinState } from './coreSchemas.js';
import type { Particle } from './twinBeliefStore.js';
import type { TwinObservation, ObservationSignal } from './observationMapper.js';

// ============================================================================
// Types
// ============================================================================

export interface LikelihoodModel {
    model_id: string;
    description: string;
    supports: (obs: TwinObservation) => boolean;
    likelihood: (particle: Particle, obs: TwinObservation) => number;  // Unnormalized
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gaussian likelihood kernel
 */
function gaussianLikelihood(observed: number, predicted: number, sigma: number): number {
    const diff = observed - predicted;
    return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

/**
 * Soft match for categorical/binary
 */
function softMatch(observed: number | string, predicted: number | string, tolerance: number = 0.3): number {
    if (typeof observed === 'string' || typeof predicted === 'string') {
        return observed === predicted ? 1.0 : 0.1;
    }
    const diff = Math.abs(observed - predicted);
    return Math.exp(-diff / tolerance);
}

/**
 * Extract state value for a given signal key
 */
function extractStateValue(state: TwinState, key: string): number | undefined {
    // Direct resource mapping
    if (key === 'cash_liquid' || key === 'price_mention') {
        return state.resources.cash_liquid;
    }
    if (key === 'monthly_cashflow' || key === 'salary_mention') {
        return state.resources.monthly_cashflow;
    }
    if (key === 'time_hours_per_week') {
        return state.resources.time_hours_per_week;
    }
    if (key === 'attention_budget_score' || key.includes('health') || key.includes('sleep')) {
        return state.resources.attention_budget_score;
    }
    if (key === 'social_capital_score' || key.includes('relationship')) {
        return state.resources.social_capital_score;
    }

    // Market-related: map to uncertainty
    if (key === 'market_change_pct') {
        // Find market variable in uncertainty
        const marketVar = state.uncertainty.variables.find(v => v.name.includes('market'));
        if (marketVar && marketVar.params) {
            return (marketVar.params.mu ?? 0) * 100;
        }
        return 0;
    }

    // Sentiment: map to overall state quality
    if (key === 'sentiment') {
        const resources = state.resources;
        const liquid = resources.cash_liquid ?? 0;
        const attention = resources.attention_budget_score ?? 0.5;
        return (liquid > 10000 ? 0.3 : -0.1) + (attention - 0.5);
    }

    return undefined;
}

// ============================================================================
// Likelihood Models Library
// ============================================================================

/**
 * Financial observation model
 * Handles: price_mention, market_change_pct, salary_mention
 */
export const financialLikelihoodModel: LikelihoodModel = {
    model_id: 'financial_v1',
    description: 'Financial signal likelihood model',

    supports: (obs: TwinObservation): boolean => {
        const financialKeys = ['price_mention', 'market_change_pct', 'salary_mention', 'cash_liquid'];
        return obs.signals.some(s => financialKeys.includes(s.key));
    },

    likelihood: (particle: Particle, obs: TwinObservation): number => {
        let logLikelihood = 0;
        const state = particle.state;

        for (const signal of obs.signals) {
            if (typeof signal.value !== 'number') continue;

            const stateValue = extractStateValue(state, signal.key);
            if (stateValue === undefined) continue;

            // Sigma scales with signal confidence
            const sigma = (1 - signal.confidence + 0.1) * Math.abs(stateValue) * 0.2 + 1;
            const ll = gaussianLikelihood(signal.value, stateValue, sigma);

            // Weight by confidence
            logLikelihood += Math.log(ll + 1e-10) * signal.confidence;
        }

        return Math.exp(logLikelihood);
    },
};

/**
 * Health/wellness observation model
 */
export const healthLikelihoodModel: LikelihoodModel = {
    model_id: 'health_v1',
    description: 'Health and wellness signal likelihood model',

    supports: (obs: TwinObservation): boolean => {
        const healthKeys = ['exercise_mentioned', 'sleep_mentioned', 'health', 'attention'];
        return obs.signals.some(s =>
            healthKeys.some(k => s.key.includes(k))
        );
    },

    likelihood: (particle: Particle, obs: TwinObservation): number => {
        let likelihood = 1.0;
        const attention = particle.state.resources.attention_budget_score ?? 0.5;

        for (const signal of obs.signals) {
            if (signal.key === 'exercise_mentioned' || signal.key === 'sleep_mentioned') {
                // High attention correlates with health behaviors
                const expected = attention > 0.6 ? 1 : 0;
                const match = softMatch(signal.value, expected, 0.5);
                likelihood *= Math.pow(match, signal.confidence);
            }
        }

        return likelihood;
    },
};

/**
 * Sentiment observation model
 */
export const sentimentLikelihoodModel: LikelihoodModel = {
    model_id: 'sentiment_v1',
    description: 'Sentiment signal likelihood model',

    supports: (obs: TwinObservation): boolean => {
        return obs.signals.some(s => s.key === 'sentiment');
    },

    likelihood: (particle: Particle, obs: TwinObservation): number => {
        const sentimentSignal = obs.signals.find(s => s.key === 'sentiment');
        if (!sentimentSignal || typeof sentimentSignal.value !== 'number') return 1.0;

        // State-implied sentiment
        const state = particle.state;
        const liquid = state.resources.cash_liquid ?? 0;
        const cashflow = state.resources.monthly_cashflow ?? 0;
        const attention = state.resources.attention_budget_score ?? 0.5;

        let impliedSentiment = 0;
        if (liquid > 50000) impliedSentiment += 0.3;
        else if (liquid < 5000) impliedSentiment -= 0.3;
        if (cashflow > 5000) impliedSentiment += 0.2;
        else if (cashflow < 0) impliedSentiment -= 0.3;
        impliedSentiment += (attention - 0.5);

        return gaussianLikelihood(sentimentSignal.value, impliedSentiment, 0.5);
    },
};

/**
 * Evidence meta model (count, freshness, confidence)
 */
export const evidenceMetaModel: LikelihoodModel = {
    model_id: 'evidence_meta_v1',
    description: 'Evidence metadata likelihood model',

    supports: (obs: TwinObservation): boolean => {
        return obs.signals.some(s =>
            s.key === 'evidence_count' ||
            s.key === 'evidence_freshness' ||
            s.key === 'provider_confidence'
        );
    },

    likelihood: (particle: Particle, obs: TwinObservation): number => {
        // Meta signals don't directly update likelihood based on state
        // They modulate the overall update strength
        let modifier = 1.0;

        for (const signal of obs.signals) {
            if (signal.key === 'evidence_count' && typeof signal.value === 'number') {
                // More evidence = slightly stronger update
                modifier *= 1 + 0.05 * Math.min(signal.value, 10);
            }
            if (signal.key === 'evidence_freshness' && typeof signal.value === 'number') {
                // Fresher evidence = stronger update
                modifier *= 0.5 + 0.5 * signal.value;
            }
        }

        // Return uniform-ish likelihood, modulated by meta
        return modifier;
    },
};

/**
 * Task outcome model
 */
export const taskOutcomeModel: LikelihoodModel = {
    model_id: 'task_outcome_v1',
    description: 'Task outcome likelihood model',

    supports: (obs: TwinObservation): boolean => {
        return obs.source === 'task_outcome';
    },

    likelihood: (particle: Particle, obs: TwinObservation): number => {
        const successSignal = obs.signals.find(s => s.key === 'task_success');
        if (!successSignal) return 1.0;

        const success = successSignal.value === 1;
        const execReliability = particle.state.capabilities?.execution_reliability ?? 0.7;

        // P(success | state) ~ execution_reliability
        if (success) {
            return execReliability;
        } else {
            return 1 - execReliability;
        }
    },
};

// ============================================================================
// Default Model Set
// ============================================================================

export const DEFAULT_LIKELIHOOD_MODELS: LikelihoodModel[] = [
    financialLikelihoodModel,
    healthLikelihoodModel,
    sentimentLikelihoodModel,
    evidenceMetaModel,
    taskOutcomeModel,
];

// ============================================================================
// Main Computation Functions
// ============================================================================

/**
 * Compute aggregate likelihood for a particle given observation
 */
export function computeParticleLikelihood(
    particle: Particle,
    obs: TwinObservation,
    models: LikelihoodModel[] = DEFAULT_LIKELIHOOD_MODELS
): number {
    let totalLikelihood = 1.0;
    let modelCount = 0;

    for (const model of models) {
        if (model.supports(obs)) {
            const ll = model.likelihood(particle, obs);
            totalLikelihood *= Math.max(ll, 1e-10);  // Avoid zero
            modelCount++;
        }
    }

    // If no models matched, return neutral likelihood
    if (modelCount === 0) {
        return 1.0;
    }

    return totalLikelihood;
}

/**
 * Compute likelihoods for all particles (batch operation)
 */
export function computeBatchLikelihood(
    particles: Particle[],
    obs: TwinObservation,
    models: LikelihoodModel[] = DEFAULT_LIKELIHOOD_MODELS
): number[] {
    return particles.map(p => computeParticleLikelihood(p, obs, models));
}

/**
 * Get diagnostic info about which models would match an observation
 */
export function diagnoseObservation(
    obs: TwinObservation,
    models: LikelihoodModel[] = DEFAULT_LIKELIHOOD_MODELS
): { model_id: string; supports: boolean }[] {
    return models.map(m => ({
        model_id: m.model_id,
        supports: m.supports(obs),
    }));
}

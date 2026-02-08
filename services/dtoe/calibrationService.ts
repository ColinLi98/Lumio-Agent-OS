/**
 * Calibration Service - Phase 3+
 * 
 * Learns transition model parameters from recorded outcomes.
 * Implements closed-loop learning via recordOutcome → calibrateFromOutcome.
 * 
 * Methods:
 * - EMA (Exponential Moving Average): Fast, simple parameter updates
 * - Bayes-lite: Conjugate prior updates for key parameters
 */

import type { TwinState } from './coreSchemas.js';
import type { BeliefState, ParticleParams } from './twinBeliefStore.js';

// ============================================================================
// Types
// ============================================================================

export interface OutcomeUpdate {
    success: boolean;
    actual_utility?: number;
    observed_values?: Record<string, number>;
    notes?: string;
    timestamp_ms: number;
}

export interface CalibrationResult {
    updated_params: Partial<ParticleParams>;
    updated_uncertainty?: Partial<Record<keyof ParticleParams, number>>;
    diagnostics: {
        applied: string[];
        skipped: string[];
        method: 'ema' | 'bayes-lite';
        samples_used: number;
    };
}

export interface CalibrationOptions {
    method?: 'ema' | 'bayes-lite';
    lr?: number;  // Learning rate for EMA (default: 0.1)
    min_samples?: number;  // Minimum observations before calibrating
}

// ============================================================================
// Outcome History (per entity)
// ============================================================================

interface OutcomeRecord {
    action_id: string;
    outcome: OutcomeUpdate;
    predicted_success_prob: number;
    predicted_utility: number;
}

const OUTCOME_HISTORY = new Map<string, OutcomeRecord[]>();
const MAX_HISTORY_SIZE = 100;

/**
 * Store outcome for learning
 */
export function recordOutcomeForCalibration(
    entity_id: string,
    action_id: string,
    outcome: OutcomeUpdate,
    prediction?: { success_prob: number; utility: number }
): void {
    if (!OUTCOME_HISTORY.has(entity_id)) {
        OUTCOME_HISTORY.set(entity_id, []);
    }

    const history = OUTCOME_HISTORY.get(entity_id)!;
    history.push({
        action_id,
        outcome,
        predicted_success_prob: prediction?.success_prob ?? 0.5,
        predicted_utility: prediction?.utility ?? 0,
    });

    // Trim to max size
    if (history.length > MAX_HISTORY_SIZE) {
        history.shift();
    }
}

/**
 * Get outcome history for entity
 */
export function getOutcomeHistory(entity_id: string): OutcomeRecord[] {
    return OUTCOME_HISTORY.get(entity_id) ?? [];
}

/**
 * Clear outcome history
 */
export function clearOutcomeHistory(entity_id?: string): void {
    if (entity_id) {
        OUTCOME_HISTORY.delete(entity_id);
    } else {
        OUTCOME_HISTORY.clear();
    }
}

// ============================================================================
// EMA Calibration
// ============================================================================

/**
 * Calibrate parameters using Exponential Moving Average
 */
function calibrateEMA(
    belief: BeliefState,
    outcomes: OutcomeRecord[],
    lr: number
): CalibrationResult {
    const applied: string[] = [];
    const skipped: string[] = [];
    const updated_params: Partial<ParticleParams> = {};
    const updated_uncertainty: Partial<Record<keyof ParticleParams, number>> = {};

    if (outcomes.length === 0) {
        return {
            updated_params,
            diagnostics: { applied, skipped, method: 'ema', samples_used: 0 },
        };
    }

    // Compute empirical success rate
    const successCount = outcomes.filter(o => o.outcome.success).length;
    const empiricalSuccessRate = successCount / outcomes.length;

    // Get current mean execution_adherence
    const currentAdherence = belief.particles.reduce(
        (sum, p) => sum + p.params.execution_adherence * p.weight,
        0
    );

    // Update execution_adherence
    const newAdherence = currentAdherence + lr * (empiricalSuccessRate - currentAdherence);
    updated_params.execution_adherence = Math.max(0.1, Math.min(0.95, newAdherence));
    applied.push('execution_adherence');

    // If observed_values include cash changes, calibrate income_growth
    const utilityChanges: number[] = [];
    for (const record of outcomes) {
        if (record.outcome.actual_utility !== undefined) {
            const delta = record.outcome.actual_utility - record.predicted_utility;
            utilityChanges.push(delta);
        }
    }

    if (utilityChanges.length > 0) {
        const avgDelta = utilityChanges.reduce((a, b) => a + b, 0) / utilityChanges.length;
        const currentGrowth = belief.particles.reduce(
            (sum, p) => sum + p.params.income_growth * p.weight,
            0
        );
        // Positive utility delta → increase growth expectation
        const newGrowth = currentGrowth + lr * Math.sign(avgDelta) * 0.01;
        updated_params.income_growth = Math.max(-0.1, Math.min(0.2, newGrowth));
        applied.push('income_growth');
    } else {
        skipped.push('income_growth (no utility data)');
    }

    // Calibrate shock_severity based on variance of outcomes
    if (outcomes.length >= 5) {
        const successRates: number[] = outcomes.slice(-5).map(o => o.outcome.success ? 1 : 0);
        const mean = successRates.reduce((a, b) => a + b, 0) / successRates.length;
        const variance = successRates.reduce((a, b) => a + (b - mean) ** 2, 0) / successRates.length;

        const currentShockSeverity = belief.particles.reduce(
            (sum, p) => sum + p.params.shock_severity * p.weight,
            0
        );
        // High variance → increase shock severity
        const newSeverity = currentShockSeverity + lr * (variance - 0.25) * 0.5;
        updated_params.shock_severity = Math.max(0.1, Math.min(0.8, newSeverity));
        applied.push('shock_severity');
    } else {
        skipped.push('shock_severity (insufficient samples)');
    }

    return {
        updated_params,
        updated_uncertainty,
        diagnostics: {
            applied,
            skipped,
            method: 'ema',
            samples_used: outcomes.length,
        },
    };
}

// ============================================================================
// Bayes-lite Calibration
// ============================================================================

// Conjugate prior state (Beta distribution for success rate)
interface BetaPrior {
    alpha: number;  // Prior successes + 1
    beta: number;   // Prior failures + 1
}

const PRIOR_STATE = new Map<string, BetaPrior>();

/**
 * Get or initialize beta prior for entity
 */
function getBetaPrior(entity_id: string): BetaPrior {
    if (!PRIOR_STATE.has(entity_id)) {
        PRIOR_STATE.set(entity_id, { alpha: 2, beta: 2 }); // Weakly informative
    }
    return PRIOR_STATE.get(entity_id)!;
}

/**
 * Update beta prior with observation
 */
function updateBetaPrior(entity_id: string, success: boolean): void {
    const prior = getBetaPrior(entity_id);
    if (success) {
        prior.alpha += 1;
    } else {
        prior.beta += 1;
    }
}

/**
 * Calibrate parameters using Bayesian conjugate updates
 */
function calibrateBayesLite(
    belief: BeliefState,
    entity_id: string,
    outcomes: OutcomeRecord[],
): CalibrationResult {
    const applied: string[] = [];
    const skipped: string[] = [];
    const updated_params: Partial<ParticleParams> = {};
    const updated_uncertainty: Partial<Record<keyof ParticleParams, number>> = {};

    if (outcomes.length === 0) {
        return {
            updated_params,
            diagnostics: { applied, skipped, method: 'bayes-lite', samples_used: 0 },
        };
    }

    // Update beta prior with latest outcomes
    for (const record of outcomes) {
        updateBetaPrior(entity_id, record.outcome.success);
    }

    const prior = getBetaPrior(entity_id);

    // Posterior mean of success rate
    const posteriorMean = prior.alpha / (prior.alpha + prior.beta);
    // Posterior std
    const posteriorStd = Math.sqrt(
        (prior.alpha * prior.beta) /
        ((prior.alpha + prior.beta) ** 2 * (prior.alpha + prior.beta + 1))
    );

    // Map to execution_adherence
    updated_params.execution_adherence = Math.max(0.1, Math.min(0.95, posteriorMean));
    updated_uncertainty.execution_adherence = posteriorStd;
    applied.push('execution_adherence');

    // Use variance to update shock parameter
    if (posteriorStd > 0.15) {
        // High uncertainty → increase shock severity
        const currentSeverity = belief.particles.reduce(
            (sum, p) => sum + p.params.shock_severity * p.weight,
            0
        );
        updated_params.shock_severity = Math.min(0.8, currentSeverity + 0.05);
        applied.push('shock_severity');
    }

    return {
        updated_params,
        updated_uncertainty,
        diagnostics: {
            applied,
            skipped,
            method: 'bayes-lite',
            samples_used: prior.alpha + prior.beta - 4,  // Subtract initial prior
        },
    };
}

// ============================================================================
// Main Calibration Function
// ============================================================================

/**
 * Calibrate belief state parameters from recorded outcomes
 * 
 * @param belief - Current belief state
 * @param action_id - Action that was executed
 * @param outcome - Observed outcome
 * @param opts - Calibration options
 * @returns Calibration result with updated parameters
 */
export function calibrateFromOutcome(
    belief: BeliefState,
    action_id: string,
    outcome: OutcomeUpdate,
    opts: CalibrationOptions = {}
): CalibrationResult {
    const method = opts.method ?? 'ema';
    const lr = opts.lr ?? 0.1;
    const minSamples = opts.min_samples ?? 1;

    const entity_id = belief.entity_id;

    // Record this outcome
    recordOutcomeForCalibration(entity_id, action_id, outcome);

    // Get history
    const history = getOutcomeHistory(entity_id);

    if (history.length < minSamples) {
        return {
            updated_params: {},
            diagnostics: {
                applied: [],
                skipped: ['all (insufficient samples)'],
                method,
                samples_used: history.length,
            },
        };
    }

    if (method === 'bayes-lite') {
        return calibrateBayesLite(belief, entity_id, history);
    } else {
        return calibrateEMA(belief, history, lr);
    }
}

/**
 * Apply calibration result to belief state
 */
export function applyCalibration(
    belief: BeliefState,
    calibration: CalibrationResult
): BeliefState {
    if (Object.keys(calibration.updated_params).length === 0) {
        return belief;
    }

    // Update particle parameters with calibrated values
    const updatedParticles = belief.particles.map(particle => ({
        ...particle,
        params: {
            ...particle.params,
            ...calibration.updated_params,
        },
    }));

    return {
        ...belief,
        particles: updatedParticles,
        updated_at_ms: Date.now(),
        version: belief.version + 1,
    };
}

/**
 * Full calibration pipeline: calibrate and apply
 */
export function calibrateAndApply(
    belief: BeliefState,
    action_id: string,
    outcome: OutcomeUpdate,
    opts?: CalibrationOptions
): { belief: BeliefState; calibration: CalibrationResult } {
    const calibration = calibrateFromOutcome(belief, action_id, outcome, opts);
    const updatedBelief = applyCalibration(belief, calibration);
    return { belief: updatedBelief, calibration };
}

/**
 * Reset calibration state for testing
 */
export function resetCalibrationState(): void {
    OUTCOME_HISTORY.clear();
    PRIOR_STATE.clear();
}

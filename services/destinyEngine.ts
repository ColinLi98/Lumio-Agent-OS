/**
 * Destiny Engine
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Main orchestrator that integrates all DTOE components.
 * Provides high-level APIs for the UI and Super Agent.
 */

import type {
    BeliefState,
    SubjectRef,
    SolveResult,
    CompiledObjective,
    ObjectiveWeights,
    StateKey,
    Action,
    TwinState,
} from './twinTypes.js';
import {
    loadOrCreateBeliefState,
    saveBeliefState,
    updateBeliefWithEvidence,
    getMeanState,
    getMeanParams,
    getDefaultSubject,
} from './twinBeliefStore.js';
import type { TwinEvidence } from './twinEvidenceTypes.js';
import { createOutcomeTwinEvidence, createWeeklyReviewTwinEvidence } from './twinEvidenceTypes.js';
import { solve, getActionTemplates } from './bellmanSolver.js';
import { generateExplanationCard, generateNarrative, type ExplanationCard } from './decisionExplainer.js';
import { eventBus } from './eventBus.js';

// ============================================================================
// Types
// ============================================================================

export interface DestinyRecommendation {
    result: SolveResult;
    card: ExplanationCard;
    narrative: string;
    state_summary: StateSummary;
    updated_at: number;
}

export interface StateSummary {
    wealth: number;
    health: number;
    energy: number;
    stress: number;
    career: number;
    social: number;
    overall: number;  // Weighted composite
}

export interface DestinyEngineState {
    belief: BeliefState;
    lastRecommendation?: DestinyRecommendation;
    isComputing: boolean;
}

// ============================================================================
// Engine Instance
// ============================================================================

let engineState: DestinyEngineState | null = null;

/**
 * Initialize the Destiny Engine
 */
export function initializeDestinyEngine(subject?: SubjectRef): DestinyEngineState {
    const subjectRef = subject ?? getDefaultSubject();
    const belief = loadOrCreateBeliefState(subjectRef);

    engineState = {
        belief,
        isComputing: false,
    };

    console.log('[DestinyEngine] Initialized');
    eventBus.emit({
        event_type: 'destiny.initialized',
        timestamp: Date.now(),
        subject_id: subjectRef.subject_id,
        particle_count: belief.particles.length,
    } as any);

    return engineState;
}

/**
 * Get current engine state
 */
export function getEngineState(): DestinyEngineState | null {
    return engineState;
}

/**
 * Ensure engine is initialized
 */
function ensureInitialized(): DestinyEngineState {
    if (!engineState) {
        return initializeDestinyEngine();
    }
    return engineState;
}

// ============================================================================
// Objective Compilation
// ============================================================================

/**
 * Compile user objective weights into solver objective
 */
export function compileObjective(weights: ObjectiveWeights): CompiledObjective {
    // Normalize weights
    const total = weights.time + weights.money + weights.risk + weights.energy + weights.growth;
    const norm = total > 0 ? 100 / total : 1;

    // Map to state weights
    const w: Record<StateKey, number> = {
        wealth: weights.money * norm * 0.01,
        health: 0.15,  // Always important
        skill: weights.growth * norm * 0.008,
        energy: weights.energy * norm * 0.01,
        social: 0.05,
        career: weights.growth * norm * 0.007,
        reputation: 0.05,
        time_buffer: weights.time * norm * 0.01,
        stress: -0.1,  // Always penalize
        optionality: 0.08,
    };

    // Terminal weights (longer term value)
    const terminal_w: Record<StateKey, number> = {
        ...w,
        wealth: w.wealth * 1.5,
        skill: w.skill * 2,
        career: w.career * 1.5,
    };

    // Risk aversion from risk weight
    const rho = 0.3 + weights.risk * 0.007;  // 0.3 to 1.0

    return {
        beta: 0.98,  // Weekly discount
        rho,
        w,
        terminal_w,
    };
}

/**
 * Get default objective
 */
export function getDefaultObjective(): ObjectiveWeights {
    return {
        time: 50,
        money: 50,
        risk: 50,
        energy: 50,
        growth: 50,
    };
}

// ============================================================================
// Core Operations
// ============================================================================

/**
 * Get current state summary
 */
export function getStateSummary(): StateSummary {
    const state = ensureInitialized();
    const mean = getMeanState(state.belief);

    const overall = (
        mean.wealth * 0.2 +
        mean.health * 0.2 +
        mean.energy * 0.15 +
        mean.career * 0.15 +
        mean.social * 0.1 +
        (1 - mean.stress) * 0.1 +
        mean.optionality * 0.1
    );

    return {
        wealth: mean.wealth,
        health: mean.health,
        energy: mean.energy,
        stress: mean.stress,
        career: mean.career,
        social: mean.social,
        overall,
    };
}

/**
 * Get recommendation for next action
 */
export async function getRecommendation(
    weights?: ObjectiveWeights
): Promise<DestinyRecommendation> {
    const state = ensureInitialized();

    if (state.isComputing) {
        // Return cached if computing
        if (state.lastRecommendation) {
            return state.lastRecommendation;
        }
    }

    state.isComputing = true;
    const startTime = Date.now();

    try {
        const objective = compileObjective(weights ?? getDefaultObjective());
        const result = solve(state.belief, objective);
        const card = generateExplanationCard(result);
        const narrative = generateNarrative(result);
        const stateSummary = getStateSummary();

        const recommendation: DestinyRecommendation = {
            result,
            card,
            narrative,
            state_summary: stateSummary,
            updated_at: Date.now(),
        };

        state.lastRecommendation = recommendation;

        console.log(`[DestinyEngine] Recommendation computed in ${Date.now() - startTime}ms`);
        eventBus.emit({
            event_type: 'destiny.recommendation',
            timestamp: Date.now(),
            action: result.best_action.type,
            confidence: result.confidence,
            latency_ms: Date.now() - startTime,
        } as any);

        return recommendation;
    } finally {
        state.isComputing = false;
    }
}

/**
 * Update belief with new evidence
 */
export function recordEvidence(evidence: TwinEvidence): void {
    const state = ensureInitialized();

    state.belief = updateBeliefWithEvidence(state.belief, evidence);
    saveBeliefState(state.belief);

    // Clear cached recommendation
    state.lastRecommendation = undefined;

    console.log(`[DestinyEngine] Evidence recorded: ${evidence.type}`);
}

/**
 * Record task outcome
 */
export function recordOutcome(
    taskId: string,
    outcome: 'success' | 'partial' | 'fail',
    satisfaction: number
): void {
    const state = ensureInitialized();

    const evidence = createOutcomeTwinEvidence(
        state.belief.subject.subject_id,
        taskId,
        outcome,
        satisfaction
    );

    recordEvidence(evidence);
}

/**
 * Record weekly review
 */
export function recordWeeklyReview(
    weekOf: string,
    completed: number,
    planned: number,
    extras?: Record<string, any>
): void {
    const state = ensureInitialized();

    const evidence = createWeeklyReviewTwinEvidence(
        state.belief.subject.subject_id,
        weekOf,
        completed,
        planned,
        extras
    );

    recordEvidence(evidence);
}

// ============================================================================
// Integration with Super Agent
// ============================================================================

/**
 * Get destiny insight for Super Agent response
 */
export function getDestinyInsight(): {
    headline: string;
    recommendation: string;
    confidence: number;
    state: StateSummary;
} {
    const state = ensureInitialized();
    const stateSummary = getStateSummary();

    if (state.lastRecommendation) {
        const rec = state.lastRecommendation;
        return {
            headline: rec.card.title,
            recommendation: rec.narrative,
            confidence: rec.result.confidence,
            state: stateSummary,
        };
    }

    return {
        headline: '分析中...',
        recommendation: '正在计算最优建议，请稍候。',
        confidence: 0,
        state: stateSummary,
    };
}

/**
 * Reset engine state
 */
export function resetDestinyEngine(): void {
    const subject = engineState?.belief.subject ?? getDefaultSubject();
    localStorage.removeItem(`lumi_twin_belief_${subject.subject_id}`);
    engineState = null;
    console.log('[DestinyEngine] Reset complete');
}

/**
 * Twin Evidence Types (DTOE Extension)
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Extends base Evidence types with DTOE-specific payloads.
 * Used for belief state updates.
 */

import type { EvidenceType as BaseEvidenceType } from './evidenceTypes.js';
import type { StateKey, ParamKey } from './twinTypes.js';

// ============================================================================
// DTOE Evidence Types (extends base)
// ============================================================================

/**
 * Extended evidence types for DTOE belief updates
 */
export type TwinEvidenceType =
    | BaseEvidenceType
    | 'trait_confirmed'    // User confirmed a Soul Matrix trait
    | 'trait_rejected'     // User rejected a Soul Matrix trait
    | 'outcome_logged'     // Task outcome (success/fail/partial)
    | 'weekly_review'      // Weekly review summary
    | 'user_upload'        // Document/CV upload
    | 'manual_edit';       // Direct user edit

/**
 * Twin evidence item
 */
export interface TwinEvidence {
    id: string;
    type: TwinEvidenceType;
    subject_id: string;
    timestamp: number;
    payload: TwinEvidencePayload;
    reliability: number;  // 0..1
}

// ============================================================================
// Payload Types
// ============================================================================

export type TwinEvidencePayload =
    | TraitConfirmedPayload
    | TraitRejectedPayload
    | OutcomeLoggedPayload
    | WeeklyReviewPayload
    | UserUploadPayload
    | ManualEditPayload
    | GenericPayload;

export interface TraitConfirmedPayload {
    _type: 'trait_confirmed';
    trait_key: string;
    trait_value: string;
    previous_confidence: number;
    new_confidence: number;
    affects_state?: StateKey[];
}

export interface TraitRejectedPayload {
    _type: 'trait_rejected';
    trait_key: string;
    trait_value: string;
    user_feedback?: string;
}

export interface OutcomeLoggedPayload {
    _type: 'outcome_logged';
    task_id: string;
    outcome: 'success' | 'partial' | 'fail';
    satisfaction: number;  // 1-5
    time_spent_min?: number;
    cost_actual?: number;
    notes?: string;
    affects_state?: StateKey[];
    affects_param?: ParamKey[];
}

export interface WeeklyReviewPayload {
    _type: 'weekly_review';
    week_of: string;
    completed_tasks: number;
    planned_tasks: number;
    completion_rate: number;
    mood_average?: number;
    energy_average?: number;
    stress_average?: number;
    highlights?: string[];
    lowlights?: string[];
}

export interface UserUploadPayload {
    _type: 'user_upload';
    file_type: 'cv' | 'document' | 'financial' | 'health' | 'other';
    file_name: string;
    extracted_signals?: Record<string, any>;
}

export interface ManualEditPayload {
    _type: 'manual_edit';
    field_path: string;
    old_value: any;
    new_value: any;
    reason?: string;
}

export interface GenericPayload {
    _type: 'generic';
    [key: string]: any;
}

// ============================================================================
// Factory Functions
// ============================================================================

let evidenceCounter = 0;

/**
 * Create a new twin evidence item
 */
export function createTwinEvidence(
    type: TwinEvidenceType,
    subject_id: string,
    payload: TwinEvidencePayload,
    reliability: number = 0.8
): TwinEvidence {
    return {
        id: `tev_${Date.now()}_${++evidenceCounter}`,
        type,
        subject_id,
        timestamp: Date.now(),
        payload,
        reliability: Math.max(0, Math.min(1, reliability)),
    };
}

/**
 * Create trait confirmed evidence
 */
export function createTraitConfirmed(
    subject_id: string,
    trait_key: string,
    trait_value: string,
    previous_confidence: number,
    new_confidence: number,
    affects_state?: StateKey[]
): TwinEvidence {
    return createTwinEvidence('trait_confirmed', subject_id, {
        _type: 'trait_confirmed',
        trait_key,
        trait_value,
        previous_confidence,
        new_confidence,
        affects_state,
    }, 0.95);
}

/**
 * Create outcome logged evidence
 */
export function createOutcomeTwinEvidence(
    subject_id: string,
    task_id: string,
    outcome: 'success' | 'partial' | 'fail',
    satisfaction: number,
    extras?: Partial<Omit<OutcomeLoggedPayload, '_type' | 'task_id' | 'outcome' | 'satisfaction'>>
): TwinEvidence {
    return createTwinEvidence('outcome_logged', subject_id, {
        _type: 'outcome_logged',
        task_id,
        outcome,
        satisfaction,
        ...extras,
    }, 0.9);
}

/**
 * Create weekly review evidence
 */
export function createWeeklyReviewTwinEvidence(
    subject_id: string,
    week_of: string,
    completed_tasks: number,
    planned_tasks: number,
    extras?: Partial<Omit<WeeklyReviewPayload, '_type' | 'week_of' | 'completed_tasks' | 'planned_tasks' | 'completion_rate'>>
): TwinEvidence {
    return createTwinEvidence('weekly_review', subject_id, {
        _type: 'weekly_review',
        week_of,
        completed_tasks,
        planned_tasks,
        completion_rate: planned_tasks > 0 ? completed_tasks / planned_tasks : 0,
        ...extras,
    }, 0.85);
}

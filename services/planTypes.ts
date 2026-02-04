/**
 * Plan Types - Phase 2 Week 2
 * 
 * Defines the Three-Stage Plan output schema:
 * 1. Plan: 3-7 modular steps
 * 2. Execute: Primary high-priority action
 * 3. Follow-up: Monitoring conditions
 */

import { ActionType } from './taskTypes';

// ============================================================================
// Three-Stage Plan Schema
// ============================================================================

export interface ThreeStagePlan {
    /** Stage 1: Plan (3-7 modular steps) */
    plan: PlanStage;

    /** Stage 2: Execute (primary high-priority action) */
    execute: ExecuteStage | null;

    /** Stage 3: Follow-up (monitoring conditions) */
    followup: FollowupStage;

    /** Raw answer for fallback display */
    raw_answer: string;

    /** Generation metadata */
    metadata: PlanMetadata;
}

export interface PlanStage {
    /** Ordered list of plan steps */
    steps: PlanStep[];

    /** Estimated total time in minutes */
    estimated_time_minutes: number;

    /** Confidence score 0-1 */
    confidence: number;

    /** Overall plan summary */
    summary: string;
}

export interface PlanStep {
    /** Step number (1-indexed) */
    step_number: number;

    /** Short step title */
    title: string;

    /** Detailed step description */
    description: string;

    /** Optional action type for this step */
    action_type?: ActionType | 'external_link';

    /** Action data if action_type is set */
    action_data?: Record<string, unknown>;

    /** Is this the primary recommended step? */
    is_primary: boolean;

    /** Estimated time for this step in minutes */
    estimated_minutes?: number;

    /** Dependencies on other steps (by step_number) */
    depends_on?: number[];
}

export interface ExecuteStage {
    /** Action type to execute */
    action_type: ActionType | 'external_link';

    /** Data for the action */
    action_data: Record<string, unknown>;

    /** CTA button label */
    cta_label: string;

    /** Priority level */
    priority: 'high' | 'medium';

    /** Rationale for why this is the primary action */
    rationale: string;
}

export interface FollowupStage {
    /** Conditions to monitor for */
    conditions: string[];

    /** Suggested next review timestamp */
    next_review?: number;

    /** Follow-up action suggestions */
    suggestions: string[];

    /** Reminder message if user wants to set one */
    reminder_message?: string;
}

export interface PlanMetadata {
    /** Generation timestamp */
    generated_at: number;

    /** Model used for generation */
    model: string;

    /** Original query */
    query: string;

    /** User context factors that influenced the plan */
    context_factors: string[];

    /** Time taken to generate in ms */
    generation_time_ms: number;
}

// ============================================================================
// Plan Generation Request/Response
// ============================================================================

export interface PlanGenerationRequest {
    /** User's query */
    query: string;

    /** Optional user context */
    context?: {
        userId?: string;
        preferences?: Record<string, unknown>;
        recentQueries?: string[];
        currentApp?: string;
    };

    /** Optional Soul Matrix traits to consider */
    soulTraits?: Array<{
        key: string;
        value: string;
        confidence: number;
    }>;
}

export interface PlanGenerationResult {
    success: boolean;
    plan: ThreeStagePlan | null;
    error?: string;
    fallback_answer?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface PlanUIState {
    /** Currently expanded step numbers */
    expandedSteps: number[];

    /** Completed step numbers */
    completedSteps: number[];

    /** Is execute action pending? */
    executePending: boolean;

    /** Has follow-up reminder been set? */
    reminderSet: boolean;
}

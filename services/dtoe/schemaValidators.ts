/**
 * Schema Validators - Phase 3 v0.1
 * Runtime validation using Zod-like manual validators
 *
 * Evidence-first: Validates that live data queries have evidence.
 */

import type {
    TwinState,
    Observation,
    Action,
    GoalStack,
    EvidencePack,
    StrategyCard,
    EntityType,
    ActionType,
    ObservationType,
    DistributionType,
    EvidenceProvider,
    TailRiskMetric,
} from './coreSchemas';

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

function ok(): ValidationResult {
    return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
    return { valid: false, errors };
}

function merge(...results: ValidationResult[]): ValidationResult {
    const errors = results.flatMap(r => r.errors);
    return { valid: errors.length === 0, errors };
}

// ============================================================================
// Basic Type Validators
// ============================================================================

const ENTITY_TYPES: EntityType[] = ['person', 'company', 'org', 'nation', 'project'];
const ACTION_TYPES: ActionType[] = ['do', 'ask', 'wait', 'commit'];
const OBS_TYPES: ObservationType[] = ['keyboard_signal', 'user_upload', 'evidence_pack', 'explicit_goal_update'];
const DIST_TYPES: DistributionType[] = ['normal', 'lognormal', 'bernoulli', 'empirical_samples'];
const PROVIDERS: EvidenceProvider[] = ['vertex_grounding', 'openai_web_search', 'playwright_exec', 'manual_upload'];
const TAIL_METRICS: TailRiskMetric[] = ['cvar_90', 'cvar_95', 'var_95', 'none'];

function isString(val: unknown): val is string {
    return typeof val === 'string';
}

function isNumber(val: unknown): val is number {
    return typeof val === 'number' && !isNaN(val);
}

function isBoolean(val: unknown): val is boolean {
    return typeof val === 'boolean';
}

function isObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
    return Array.isArray(val);
}

function inRange(val: number, min: number, max: number): boolean {
    return val >= min && val <= max;
}

// ============================================================================
// TwinState Validator
// ============================================================================

export function validateTwinState(state: unknown): ValidationResult {
    if (!isObject(state)) {
        return fail('TwinState must be an object');
    }

    const errors: string[] = [];
    const s = state as Record<string, unknown>;

    // Required: entity
    if (!isObject(s.entity)) {
        errors.push('entity is required and must be an object');
    } else {
        const e = s.entity as Record<string, unknown>;
        if (!isString(e.entity_id)) errors.push('entity.entity_id must be a string');
        if (!isString(e.entity_type) || !ENTITY_TYPES.includes(e.entity_type as EntityType)) {
            errors.push(`entity.entity_type must be one of: ${ENTITY_TYPES.join(', ')}`);
        }
        if (!isString(e.display_name)) errors.push('entity.display_name must be a string');
    }

    // Required: timestamp_ms
    if (!isNumber(s.timestamp_ms)) {
        errors.push('timestamp_ms is required and must be a number');
    }

    // Required: resources
    if (!isObject(s.resources)) {
        errors.push('resources is required and must be an object');
    }

    // Required: constraints
    if (!isObject(s.constraints)) {
        errors.push('constraints is required and must be an object');
    } else {
        const c = s.constraints as Record<string, unknown>;
        if (!isObject(c.hard)) errors.push('constraints.hard is required');
    }

    // Required: preferences
    if (!isObject(s.preferences)) {
        errors.push('preferences is required and must be an object');
    }

    // Required: uncertainty
    if (!isObject(s.uncertainty)) {
        errors.push('uncertainty is required and must be an object');
    } else {
        const u = s.uncertainty as Record<string, unknown>;
        if (!isArray(u.variables)) errors.push('uncertainty.variables must be an array');
    }

    // Required: trust
    if (!isObject(s.trust)) {
        errors.push('trust is required and must be an object');
    } else {
        const t = s.trust as Record<string, unknown>;
        if (!isNumber(t.confidence) || !inRange(t.confidence as number, 0, 1)) {
            errors.push('trust.confidence must be a number between 0 and 1');
        }
        if (!isNumber(t.last_verified_ms)) errors.push('trust.last_verified_ms must be a number');
        if (!isArray(t.sources)) errors.push('trust.sources must be an array');
    }

    return errors.length === 0 ? ok() : fail(...errors);
}

// ============================================================================
// Observation Validator
// ============================================================================

export function validateObservation(obs: unknown): ValidationResult {
    if (!isObject(obs)) {
        return fail('Observation must be an object');
    }

    const errors: string[] = [];
    const o = obs as Record<string, unknown>;

    if (!isString(o.obs_id)) errors.push('obs_id is required');
    if (!isString(o.entity_id)) errors.push('entity_id is required');
    if (!isString(o.obs_type) || !OBS_TYPES.includes(o.obs_type as ObservationType)) {
        errors.push(`obs_type must be one of: ${OBS_TYPES.join(', ')}`);
    }
    if (!isObject(o.payload)) errors.push('payload is required');
    if (!isNumber(o.timestamp_ms)) errors.push('timestamp_ms is required');

    return errors.length === 0 ? ok() : fail(...errors);
}

// ============================================================================
// Action Validator
// ============================================================================

export function validateAction(action: unknown): ValidationResult {
    if (!isObject(action)) {
        return fail('Action must be an object');
    }

    const errors: string[] = [];
    const a = action as Record<string, unknown>;

    if (!isString(a.action_id)) errors.push('action_id is required');
    if (!isString(a.action_type) || !ACTION_TYPES.includes(a.action_type as ActionType)) {
        errors.push(`action_type must be one of: ${ACTION_TYPES.join(', ')}`);
    }
    if (!isString(a.summary)) errors.push('summary is required');
    if (!isObject(a.cost)) errors.push('cost is required');
    if (!isString(a.reversibility)) errors.push('reversibility is required');

    return errors.length === 0 ? ok() : fail(...errors);
}

// ============================================================================
// GoalStack Validator
// ============================================================================

export function validateGoalStack(goals: unknown): ValidationResult {
    if (!isObject(goals)) {
        return fail('GoalStack must be an object');
    }

    const errors: string[] = [];
    const g = goals as Record<string, unknown>;

    if (!isString(g.entity_id)) errors.push('entity_id is required');
    if (!isNumber(g.horizon_days) || !inRange(g.horizon_days as number, 7, 3650)) {
        errors.push('horizon_days must be between 7 and 3650');
    }
    if (!isArray(g.objectives) || (g.objectives as unknown[]).length === 0) {
        errors.push('objectives must be a non-empty array');
    }
    if (!isObject(g.hard_constraints)) errors.push('hard_constraints is required');

    return errors.length === 0 ? ok() : fail(...errors);
}

// ============================================================================
// EvidencePack Validator
// ============================================================================

export function validateEvidencePack(pack: unknown): ValidationResult {
    if (!isObject(pack)) {
        return fail('EvidencePack must be an object');
    }

    const errors: string[] = [];
    const p = pack as Record<string, unknown>;

    if (!isArray(p.items)) errors.push('items must be an array');
    if (!isNumber(p.fetched_at_ms)) errors.push('fetched_at_ms is required');
    if (!isNumber(p.ttl_seconds)) errors.push('ttl_seconds is required');
    if (!isString(p.provider) || !PROVIDERS.includes(p.provider as EvidenceProvider)) {
        errors.push(`provider must be one of: ${PROVIDERS.join(', ')}`);
    }
    if (!isNumber(p.confidence) || !inRange(p.confidence as number, 0, 1)) {
        errors.push('confidence must be between 0 and 1');
    }

    return errors.length === 0 ? ok() : fail(...errors);
}

// ============================================================================
// StrategyCard Validator
// ============================================================================

export function validateStrategyCard(card: unknown): ValidationResult {
    if (!isObject(card)) {
        return fail('StrategyCard must be an object');
    }

    const errors: string[] = [];
    const c = card as Record<string, unknown>;

    if (c.card_type !== 'StrategyCard') errors.push('card_type must be "StrategyCard"');
    if (!isString(c.entity_id)) errors.push('entity_id is required');
    if (!isNumber(c.decision_time_ms)) errors.push('decision_time_ms is required');

    if (!isObject(c.next_best_action)) {
        errors.push('next_best_action is required');
    }

    if (!isObject(c.outcomes_distribution)) {
        errors.push('outcomes_distribution is required');
    }

    if (!isObject(c.why)) {
        errors.push('why is required');
    }

    // Evidence pack is nullable - null means fallback required
    // Fallback is nullable - null means evidence available

    return errors.length === 0 ? ok() : fail(...errors);
}

// ============================================================================
// P0 Evidence Gate
// ============================================================================

/**
 * P0 Rule: If needs_live_data=true, evidence_pack MUST have items.
 * Otherwise, must return fallback.
 */
export function validateEvidenceGate(
    needs_live_data: boolean,
    evidence_pack: EvidencePack | null
): ValidationResult {
    if (!needs_live_data) {
        return ok();
    }

    if (!evidence_pack) {
        return fail('P0 VIOLATION: needs_live_data=true but evidence_pack is null');
    }

    if (evidence_pack.items.length === 0) {
        return fail('P0 VIOLATION: needs_live_data=true but evidence_pack.items is empty');
    }

    return ok();
}

/**
 * Check if evidence is still fresh (within TTL)
 */
export function isEvidenceFresh(pack: EvidencePack): boolean {
    const age_ms = Date.now() - pack.fetched_at_ms;
    return age_ms < pack.ttl_seconds * 1000;
}

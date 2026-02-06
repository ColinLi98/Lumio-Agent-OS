/**
 * Core Schemas - Phase 3 v0.1
 * Digital Twin Optimization Engine
 *
 * Unified schema definitions for any entity (person/company/org/nation/project).
 * Based on Bellman/DP + Monte Carlo scenario planning principles.
 */

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'person' | 'company' | 'org' | 'nation' | 'project';

export interface Entity {
    entity_id: string;
    entity_type: EntityType;
    display_name: string;
}

// ============================================================================
// TwinState v0.1
// ============================================================================

/**
 * Distribution type for uncertainty modeling
 */
export type DistributionType = 'normal' | 'lognormal' | 'bernoulli' | 'empirical_samples';

export interface UncertaintyVariable {
    name: string;
    dist_type: DistributionType;
    params?: Record<string, number>;  // e.g., { mu: 0, sigma: 1 }
    samples?: number[];               // For empirical_samples
}

/**
 * Values weights for wellbeing-compatible reward
 * Based on OECD life evaluation framework
 */
export interface ValuesWeights {
    health: number;
    wealth: number;
    freedom: number;
    meaning: number;
    relationships: number;
    stability: number;
}

/**
 * Hard constraints (must not violate)
 */
export interface HardConstraints {
    max_budget?: number;
    max_risk_probability?: number;  // 0-1
    deadline_ms?: number;
    legal_compliance?: boolean;
    [key: string]: number | boolean | undefined;
}

/**
 * Trust metadata for state provenance
 */
export interface TrustMetadata {
    confidence: number;         // 0-1
    last_verified_ms: number;
    sources: string[];
}

/**
 * TwinState - Current state of the digital twin (recursively updatable)
 */
export interface TwinState {
    entity: Entity;
    timestamp_ms: number;

    resources: {
        time_hours_per_week?: number;
        cash_liquid?: number;
        monthly_cashflow?: number;
        social_capital_score?: number;     // 0-1
        attention_budget_score?: number;   // 0-1
        [key: string]: number | undefined;
    };

    capabilities?: {
        skills?: string[];
        execution_reliability?: number;    // 0-1
        learning_speed?: number;           // 0-1
        [key: string]: string[] | number | undefined;
    };

    constraints: {
        hard: HardConstraints;
        soft?: Record<string, unknown>;
    };

    preferences: {
        risk_aversion?: number;            // 0-5
        time_discount?: number;            // 0-1 (higher = more impatient)
        values_weights?: ValuesWeights;
        [key: string]: number | ValuesWeights | undefined;
    };

    uncertainty: {
        variables: UncertaintyVariable[];
    };

    trust: TrustMetadata;
}

// ============================================================================
// Observation v0.1
// ============================================================================

export type ObservationType =
    | 'keyboard_signal'
    | 'user_upload'
    | 'evidence_pack'
    | 'explicit_goal_update';

/**
 * Observation - A single observation event that updates state
 */
export interface Observation {
    obs_id: string;
    entity_id: string;
    obs_type: ObservationType;
    payload: Record<string, unknown>;
    timestamp_ms: number;
    ttl_seconds?: number;
    source?: string;
}

// ============================================================================
// Action v0.1
// ============================================================================

export type ActionType = 'do' | 'ask' | 'wait' | 'commit';

export type Reversibility = 'reversible' | 'partially_reversible' | 'irreversible';

/**
 * Action cost structure
 */
export interface ActionCost {
    time_hours?: number;
    money?: number;
    cognitive_load?: number;   // 0-1
    [key: string]: number | undefined;
}

/**
 * Action - An executable action (wait/ask are first-class citizens)
 */
export interface Action {
    action_id: string;
    action_type: ActionType;
    summary: string;
    parameters?: Record<string, unknown>;
    cost: ActionCost;
    reversibility: Reversibility;
    risk_tags?: string[];
    requires_confirmation?: boolean;
}

// ============================================================================
// GoalStack v0.1
// ============================================================================

export type MetricType =
    | 'health'
    | 'wealth'
    | 'freedom'
    | 'meaning'
    | 'relationships'
    | 'stability'
    | 'custom';

export type TailRiskMetric = 'cvar_90' | 'cvar_95' | 'var_95' | 'none';

export interface Objective {
    name: string;
    weight: number;
    metric: MetricType;
    target?: number | string | null;
}

export interface RiskModel {
    tail_metric: TailRiskMetric;
    tail_weight: number;
}

export interface GoalStackConstraints {
    max_failure_prob?: number;     // 0-1
    max_drawdown?: number;
    min_sleep_hours?: number;
    legal_compliance?: boolean;
    [key: string]: number | boolean | undefined;
}

/**
 * GoalStack - Long-term objectives with risk model
 */
export interface GoalStack {
    entity_id: string;
    horizon_days: number;          // 7-3650

    objectives: Objective[];       // minItems: 1

    hard_constraints: GoalStackConstraints;

    risk_model?: RiskModel;
}

// ============================================================================
// EvidencePack v0.1
// ============================================================================

export type EvidenceProvider =
    | 'vertex_grounding'
    | 'openai_web_search'
    | 'playwright_exec'
    | 'manual_upload';

export interface EvidenceItem {
    title: string;
    snippet: string;
    url: string;
    source_name: string;
}

/**
 * EvidencePack - Real-time evidence with provenance
 * Reduces hallucination by grounding outputs to verifiable sources
 */
export interface EvidencePack {
    items: EvidenceItem[];
    fetched_at_ms: number;
    ttl_seconds: number;
    provider: EvidenceProvider;
    confidence: number;            // 0-1
}

// ============================================================================
// StrategyCard v0.1
// ============================================================================

export interface MetricDistribution {
    name: string;
    p50: number;
    p90: number;
    cvar_90?: number;
}

export interface OutcomesDistribution {
    metrics: MetricDistribution[];
    failure_prob: number;
}

export interface StrategyWhy {
    top_reasons: string[];
    evidence_refs: number[];       // Indices into evidence_pack.items
}

export interface StrategyFallback {
    type: 'missing_constraints' | 'no_evidence' | 'risk_violation';
    missing_fields?: string[];
    message: string;
}

/**
 * StrategyCard - Output format for "Policy > Answer"
 * Contains Next Best Action + outcome distribution + risk + evidence
 */
export interface StrategyCard {
    card_type: 'StrategyCard';
    entity_id: string;
    decision_time_ms: number;

    next_best_action: {
        action_type: ActionType;
        summary: string;
        requires_confirmation: boolean;
    };

    outcomes_distribution: OutcomesDistribution;

    why: StrategyWhy;

    evidence_pack: EvidencePack | null;

    fallback: StrategyFallback | null;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createDefaultTwinState(entity: Entity): TwinState {
    return {
        entity,
        timestamp_ms: Date.now(),
        resources: {
            time_hours_per_week: 40,
            social_capital_score: 0.5,
            attention_budget_score: 0.6,
        },
        capabilities: {
            skills: [],
            execution_reliability: 0.7,
            learning_speed: 0.5,
        },
        constraints: {
            hard: {
                legal_compliance: true,
            },
            soft: {},
        },
        preferences: {
            risk_aversion: 2.5,
            time_discount: 0.05,
            values_weights: {
                health: 0.2,
                wealth: 0.2,
                freedom: 0.15,
                meaning: 0.2,
                relationships: 0.15,
                stability: 0.1,
            },
        },
        uncertainty: {
            variables: [],
        },
        trust: {
            confidence: 0.5,
            last_verified_ms: Date.now(),
            sources: [],
        },
    };
}

export function createDefaultGoalStack(entity_id: string): GoalStack {
    return {
        entity_id,
        horizon_days: 365,
        objectives: [
            { name: 'Life Satisfaction', weight: 1.0, metric: 'meaning', target: null },
        ],
        hard_constraints: {
            legal_compliance: true,
            max_failure_prob: 0.1,
        },
        risk_model: {
            tail_metric: 'cvar_90',
            tail_weight: 0.3,
        },
    };
}

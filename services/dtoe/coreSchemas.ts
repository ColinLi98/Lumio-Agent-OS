export type EntityType = 'person' | 'company' | 'org' | 'nation' | 'project';

export interface Entity {
    entity_id: string;
    entity_type: EntityType;
    display_name: string;
}

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

export interface EvidencePack {
    items: EvidenceItem[];
    fetched_at_ms: number;
    ttl_seconds: number;
    provider: EvidenceProvider;
    confidence: number;
}

export type ObservationType =
    | 'keyboard_signal'
    | 'user_upload'
    | 'evidence_pack'
    | 'explicit_goal_update';

export interface Observation {
    obs_id: string;
    entity_id: string;
    obs_type: ObservationType;
    payload: Record<string, unknown>;
    timestamp_ms: number;
    ttl_seconds?: number;
    source?: string;
}

export interface StrategyCard {
    card_type: 'StrategyCard';
    entity_id: string;
    decision_time_ms: number;
    next_best_action: {
        action_type: 'do' | 'ask' | 'wait' | 'commit';
        summary: string;
        requires_confirmation: boolean;
    };
    outcomes_distribution: {
        metrics: Array<{ name: string; p50: number; p90: number; cvar_90?: number }>;
        failure_prob: number;
    };
    why: {
        top_reasons: string[];
        evidence_refs: number[];
    };
    evidence_pack: EvidencePack | null;
    fallback: {
        type: 'missing_constraints' | 'no_evidence' | 'risk_violation';
        missing_fields?: string[];
        message: string;
    } | null;
}

export interface GoalStack {
    entity_id: string;
    horizon_days: number;
    objectives: Array<{
        name: string;
        weight: number;
        metric: 'health' | 'wealth' | 'freedom' | 'meaning' | 'relationships' | 'stability' | 'custom';
        target?: number | string | null;
    }>;
    hard_constraints: {
        max_failure_prob?: number;
        max_drawdown?: number;
        min_sleep_hours?: number;
        legal_compliance?: boolean;
        [key: string]: number | boolean | undefined;
    };
    risk_model?: {
        tail_metric: 'cvar_90' | 'cvar_95' | 'var_95' | 'none';
        tail_weight: number;
    };
}

export function createDefaultGoalStack(entityId: string): GoalStack {
    return {
        entity_id: entityId,
        horizon_days: 365,
        objectives: [
            { name: 'Life Satisfaction', weight: 1, metric: 'meaning', target: null },
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

export type PolicyPhase =
    | 'CAPSULE'
    | 'PRE_NODE'
    | 'POST_NODE'
    | 'PRE_TOOL'
    | 'POST_TOOL'
    | 'PRE_RESPONSE';

export interface PolicyIntent {
    type?: string;
    goal?: string;
    risk_level?: 'low' | 'medium' | 'high';
}

export interface PolicyUser {
    privacy_level?: 'low' | 'medium' | 'high';
    confirm_threshold?: 'low' | 'medium' | 'high';
    risk_tolerance?: 'low' | 'medium' | 'high';
}

export interface PolicyPermissions {
    [permissionName: string]: boolean | undefined;
}

export interface PolicyDataContext {
    sensitivity?: 'low' | 'medium' | 'high';
    contains_pii?: boolean;
    egress_target?: 'cloud' | 'market' | 'third_party' | string;
    fields?: string[];
}

export interface PolicyNode {
    id?: string;
    type?: string;
    name?: string;
}

export interface PolicyTool {
    name?: string;
    category?: string;
    side_effect?: 'none' | 'draft' | 'write' | 'send' | 'post' | 'payment' | string;
}

export interface PolicyBudget {
    tool_calls_left?: number;
    tokens_left?: number;
    latency_left_ms?: number;
}

export interface PolicyContext {
    phase: PolicyPhase;
    intent?: PolicyIntent;
    user?: PolicyUser;
    permissions?: PolicyPermissions;
    data?: PolicyDataContext;
    node?: PolicyNode;
    tool?: PolicyTool;
    budget?: PolicyBudget;
    task_id?: string;
    node_id?: string;
    input?: unknown;
    output?: unknown;
}

export type PolicyAction =
    | 'ALLOW'
    | 'DENY'
    | 'REQUIRE_APPROVAL'
    | 'REDACT'
    | 'DOWNGRADE'
    | 'ALLOW_WITH_LIMITS';

export interface PolicyConstraints {
    allowed_fields?: string[];
    max_chars?: number;
    tool_allowlist?: string[];
    force_draft_only?: boolean;
    require_user_confirm_on?: string[];
}

export interface PolicyDecision {
    id: string;
    action: PolicyAction;
    reason: string;
    constraints?: PolicyConstraints;
    log_level: 'MINIMAL' | 'STANDARD' | 'FULL';
    matched_rule_id?: string;
    policy_version?: string;
}

export type ConditionOperator =
    | 'eq'
    | 'neq'
    | 'in'
    | 'not_in'
    | 'lte'
    | 'lt'
    | 'gte'
    | 'gt'
    | 'exists'
    | 'truthy';

export type RuleCondition =
    | {
        all: RuleCondition[];
    }
    | {
        any: RuleCondition[];
    }
    | {
        not: RuleCondition;
    }
    | {
        path: string;
        op: ConditionOperator;
        value?: unknown;
    };

export interface RuleDefinition {
    id: string;
    tier?: 'hard_deny' | 'egress' | 'side_effect' | 'user_pref' | 'budget' | 'default_allow';
    priority: number;
    when: RuleCondition;
    then: {
        action: PolicyAction;
        reason: string;
        constraints?: PolicyConstraints;
        log_level?: 'MINIMAL' | 'STANDARD' | 'FULL';
    };
}

export interface PolicyRulePack {
    version: number | string;
    defaults: {
        action: PolicyAction;
        log_level: 'MINIMAL' | 'STANDARD' | 'FULL';
    };
    rules: RuleDefinition[];
}

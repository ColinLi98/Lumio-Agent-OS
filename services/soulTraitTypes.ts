/**
 * Soul Trait Types
 * Phase 2 Week 1-1: Soul Matrix v1
 * 
 * Core types for editable user preference traits with evidence chain.
 */

// ============================================================================
// Soul Trait Types
// ============================================================================

/**
 * A single trait in the Soul Matrix.
 * Each trait represents a learned or confirmed user preference.
 */
export interface SoulTrait {
    trait_id: string;
    key: string;                    // e.g., 'price_sensitivity', 'risk_tolerance'
    value: string | number | boolean;
    display_name: string;           // Human-readable name
    description?: string;           // Explanation of what this trait means
    confidence: number;             // 0-1, how confident we are
    source_evidence: string[];      // evidence_id[] references
    last_updated: number;           // timestamp
    user_confirmed: boolean;        // User explicitly confirmed this trait
    user_edited?: boolean;          // User manually edited the value
    version: number;                // For conflict resolution
    category: TraitCategory;
}

/**
 * Categories for organizing traits
 */
export type TraitCategory =
    | 'preference'      // Shopping, lifestyle preferences
    | 'behavior'        // Behavioral patterns
    | 'value'           // Core values and priorities
    | 'constraint'      // Limits and boundaries
    | 'goal'            // Aspirations and objectives
    | 'personality';    // Personality traits

/**
 * Action taken on a trait
 */
export interface SoulTraitAction {
    action_id: string;
    type: SoulTraitActionType;
    trait_id: string;
    previous_value?: string | number | boolean;
    new_value?: string | number | boolean;
    timestamp: number;
    undone?: boolean;           // Was this action undone?
}

export type SoulTraitActionType =
    | 'CONFIRM'     // User confirmed trait is accurate
    | 'EDIT'        // User edited the value
    | 'REJECT'      // User said trait is wrong (lowers confidence)
    | 'DELETE'      // User deleted the trait
    | 'UNDO'        // Undo previous action
    | 'CREATE'      // System created new trait
    | 'UPDATE';     // System updated trait (from evidence)

/**
 * Trait update request
 */
export interface TraitUpdateRequest {
    trait_id: string;
    action: SoulTraitActionType;
    new_value?: string | number | boolean;
    reason?: string;
}

// ============================================================================
// Predefined Trait Keys
// ============================================================================

/**
 * Standard trait keys for consistency
 */
export const TRAIT_KEYS = {
    // Preferences
    PRICE_SENSITIVITY: 'price_sensitivity',
    QUALITY_PREFERENCE: 'quality_preference',
    BRAND_LOYALTY: 'brand_loyalty',
    CONVENIENCE_PRIORITY: 'convenience_priority',

    // Behavior
    DECISION_SPEED: 'decision_speed',
    RESEARCH_DEPTH: 'research_depth',
    RISK_TOLERANCE: 'risk_tolerance',
    IMPULSE_TENDENCY: 'impulse_tendency',

    // Values
    SUSTAINABILITY_FOCUS: 'sustainability_focus',
    LOCAL_PREFERENCE: 'local_preference',
    PRIVACY_CONCERN: 'privacy_concern',

    // Constraints
    BUDGET_RANGE: 'budget_range',
    TIME_AVAILABILITY: 'time_availability',

    // Goals
    SAVINGS_GOAL: 'savings_goal',
    LEARNING_GOAL: 'learning_goal',
    HEALTH_GOAL: 'health_goal',
    CAREER_GOAL: 'career_goal',

    // Personality
    COMMUNICATION_STYLE: 'communication_style',
    PLANNING_STYLE: 'planning_style',
} as const;

/**
 * Trait display metadata
 */
export const TRAIT_METADATA: Record<string, { display_name: string; category: TraitCategory; description: string }> = {
    [TRAIT_KEYS.PRICE_SENSITIVITY]: {
        display_name: '价格敏感度',
        category: 'preference',
        description: '对价格变化的敏感程度，值越高越注重价格'
    },
    [TRAIT_KEYS.QUALITY_PREFERENCE]: {
        display_name: '质量偏好',
        category: 'preference',
        description: '对产品/服务质量的重视程度'
    },
    [TRAIT_KEYS.BRAND_LOYALTY]: {
        display_name: '品牌忠诚度',
        category: 'preference',
        description: '倾向于选择熟悉品牌的程度'
    },
    [TRAIT_KEYS.CONVENIENCE_PRIORITY]: {
        display_name: '便捷优先',
        category: 'preference',
        description: '愿意为便捷性付出额外成本的程度'
    },
    [TRAIT_KEYS.DECISION_SPEED]: {
        display_name: '决策速度',
        category: 'behavior',
        description: '做决定的快慢倾向'
    },
    [TRAIT_KEYS.RESEARCH_DEPTH]: {
        display_name: '研究深度',
        category: 'behavior',
        description: '做决定前研究信息的深度'
    },
    [TRAIT_KEYS.RISK_TOLERANCE]: {
        display_name: '风险承受',
        category: 'behavior',
        description: '愿意承担不确定性的程度'
    },
    [TRAIT_KEYS.IMPULSE_TENDENCY]: {
        display_name: '冲动倾向',
        category: 'behavior',
        description: '冲动消费/决策的倾向'
    },
    [TRAIT_KEYS.SUSTAINABILITY_FOCUS]: {
        display_name: '可持续关注',
        category: 'value',
        description: '对环保和可持续性的重视程度'
    },
    [TRAIT_KEYS.LOCAL_PREFERENCE]: {
        display_name: '本地偏好',
        category: 'value',
        description: '偏好本地产品/服务的程度'
    },
    [TRAIT_KEYS.PRIVACY_CONCERN]: {
        display_name: '隐私关注',
        category: 'value',
        description: '对个人数据隐私的重视程度'
    },
    [TRAIT_KEYS.BUDGET_RANGE]: {
        display_name: '预算范围',
        category: 'constraint',
        description: '日常消费的预算区间'
    },
    [TRAIT_KEYS.TIME_AVAILABILITY]: {
        display_name: '时间充裕度',
        category: 'constraint',
        description: '可用于各种活动的时间'
    },
    [TRAIT_KEYS.SAVINGS_GOAL]: {
        display_name: '储蓄目标',
        category: 'goal',
        description: '财务储蓄相关目标'
    },
    [TRAIT_KEYS.LEARNING_GOAL]: {
        display_name: '学习目标',
        category: 'goal',
        description: '个人学习和成长目标'
    },
    [TRAIT_KEYS.HEALTH_GOAL]: {
        display_name: '健康目标',
        category: 'goal',
        description: '健康和运动相关目标'
    },
    [TRAIT_KEYS.CAREER_GOAL]: {
        display_name: '职业目标',
        category: 'goal',
        description: '职业发展目标'
    },
    [TRAIT_KEYS.COMMUNICATION_STYLE]: {
        display_name: '沟通风格',
        category: 'personality',
        description: '偏好的沟通方式'
    },
    [TRAIT_KEYS.PLANNING_STYLE]: {
        display_name: '计划风格',
        category: 'personality',
        description: '做计划的方式偏好'
    },
};

// ============================================================================
// Utility Functions
// ============================================================================

export function generateTraitId(): string {
    return `trait_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateActionId(): string {
    return `action_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: TraitCategory): string {
    const names: Record<TraitCategory, string> = {
        preference: '偏好',
        behavior: '行为',
        value: '价值观',
        constraint: '约束',
        goal: '目标',
        personality: '性格',
    };
    return names[category];
}

/**
 * Get confidence level description
 */
export function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return '高置信';
    if (confidence >= 0.5) return '中置信';
    if (confidence >= 0.3) return '低置信';
    return '待确认';
}

/**
 * Get confidence color
 */
export function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    if (confidence >= 0.3) return 'text-orange-500';
    return 'text-gray-400';
}

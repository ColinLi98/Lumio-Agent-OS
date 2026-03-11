export interface SoulTrait {
    trait_id: string;
    key: string;
    value: string | number | boolean;
    display_name: string;
    description?: string;
    confidence: number;
    source_evidence: string[];
    last_updated: number;
    user_confirmed: boolean;
    user_edited?: boolean;
    version: number;
    category: TraitCategory;
}

export type TraitCategory =
    | 'preference'
    | 'behavior'
    | 'value'
    | 'constraint'
    | 'goal'
    | 'personality';

export interface SoulTraitAction {
    action_id: string;
    type: SoulTraitActionType;
    trait_id: string;
    previous_value?: string | number | boolean;
    new_value?: string | number | boolean;
    timestamp: number;
    undone?: boolean;
}

export type SoulTraitActionType =
    | 'CONFIRM'
    | 'EDIT'
    | 'REJECT'
    | 'DELETE'
    | 'UNDO'
    | 'CREATE'
    | 'UPDATE';

export const TRAIT_METADATA: Record<string, { display_name: string; category: TraitCategory; description: string }> = {
    price_sensitivity: {
        display_name: '价格敏感度',
        category: 'preference',
        description: '对价格变化的敏感程度',
    },
    quality_preference: {
        display_name: '质量偏好',
        category: 'preference',
        description: '对质量和体验的偏好程度',
    },
    convenience_priority: {
        display_name: '便捷优先',
        category: 'preference',
        description: '愿意为便捷性付出额外成本的程度',
    },
    risk_tolerance: {
        display_name: '风险承受',
        category: 'behavior',
        description: '面对不确定性的偏好程度',
    },
    decision_speed: {
        display_name: '决策速度',
        category: 'behavior',
        description: '做决定的速度偏好',
    },
    communication_style: {
        display_name: '沟通风格',
        category: 'personality',
        description: '偏好的沟通方式',
    },
};

export function generateTraitId(): string {
    return `trait_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateActionId(): string {
    return `action_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

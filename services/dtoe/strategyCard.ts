/**
 * StrategyCard Builder - Phase 3 v0.1
 * Formats policy output as "Strategy > Answer"
 *
 * Contains: Next Best Action + Outcome Distribution + Why/Evidence + Fallback
 */

import type {
    StrategyCard,
    EvidencePack,
    Action,
    StrategyFallback,
    MetricDistribution,
} from './coreSchemas';

// ============================================================================
// StrategyCard Builder
// ============================================================================

/** Partial ActionScore for flexibility with v0.1 and v0.2 callers */
export interface PartialActionScore {
    action: Action;
    mean?: number;
    std?: number;
    p50?: number;
    p90?: number;
    cvar_90?: number;
    failure_prob: number;
    score: number;
}

export interface BuildStrategyCardInput {
    entity_id: string;
    best_action: Action;
    ranked_scores: PartialActionScore[];
    evidence_pack: EvidencePack | null;
    needs_live_data: boolean;
}

/**
 * Build a StrategyCard from evaluator results
 */
export function buildStrategyCard(input: BuildStrategyCardInput): StrategyCard {
    const {
        entity_id,
        best_action,
        ranked_scores,
        evidence_pack,
        needs_live_data,
    } = input;

    const best = ranked_scores[0];

    // P0: If needs live data but no evidence, create fallback
    let fallback: StrategyFallback | null = null;

    if (needs_live_data && (!evidence_pack || evidence_pack.items.length === 0)) {
        fallback = {
            type: 'no_evidence',
            message: '无法获取实时数据，请补充必要信息后重试',
            missing_fields: ['查询条件', '时间范围'],
        };
    }

    // Build metrics distribution
    const metrics: MetricDistribution[] = [
        {
            name: 'utility_score',
            p50: best.p50 ?? best.mean ?? 0,
            p90: best.p90 ?? (best.mean ?? 0) * 1.2,
            cvar_90: best.cvar_90,
        },
    ];

    // Generate reasons
    const reasons = generateReasons(best_action, best, ranked_scores);

    // Evidence references (indices into evidence_pack.items)
    const evidence_refs = evidence_pack
        ? evidence_pack.items.map((_, idx) => idx).slice(0, 3)
        : [];

    return {
        card_type: 'StrategyCard',
        entity_id,
        decision_time_ms: Date.now(),

        next_best_action: {
            action_type: best_action.action_type,
            summary: best_action.summary,
            requires_confirmation: best_action.requires_confirmation ?? false,
        },

        outcomes_distribution: {
            metrics,
            failure_prob: best.failure_prob,
        },

        why: {
            top_reasons: reasons,
            evidence_refs,
        },

        evidence_pack,

        fallback,
    };
}

// ============================================================================
// Reason Generation
// ============================================================================

function generateReasons(
    action: Action,
    best: PartialActionScore,
    ranked: PartialActionScore[]
): string[] {
    const reasons: string[] = [];

    // Reason 1: Risk assessment
    if (best.failure_prob < 0.05) {
        reasons.push('风险极低：失败概率小于5%');
    } else if (best.failure_prob < 0.1) {
        reasons.push('风险可控：失败概率低于10%');
    } else {
        reasons.push(`风险提示：失败概率约 ${(best.failure_prob * 100).toFixed(0)}%`);
    }

    // Reason 2: Action type specific
    switch (action.action_type) {
        case 'wait':
            reasons.push('等待可获取更多信息，降低决策不确定性');
            break;
        case 'ask':
            reasons.push('询问可补充关键约束，提高后续决策质量');
            break;
        case 'do':
            reasons.push('当前时机适合执行，延迟可能增加成本');
            break;
        case 'commit':
            reasons.push('满足所有硬约束，可安全提交决策');
            break;
    }

    // Reason 3: Comparison with alternatives
    if (ranked.length > 1) {
        const gap = best.score - ranked[1].score;
        if (gap > 0.5) {
            reasons.push('该方案明显优于备选方案');
        } else if (gap > 0.1) {
            reasons.push('该方案略优于备选方案');
        }
    }

    // Reason 4: CVaR tail risk
    if ((best.cvar_90 ?? 0) > -0.5) {
        reasons.push('尾部风险可接受，最坏情况损失有限');
    }

    return reasons.slice(0, 3);  // Top 3 reasons
}

// ============================================================================
// Fallback Builder
// ============================================================================

export interface FallbackInput {
    reason: 'no_evidence' | 'missing_constraints' | 'risk_violation';
    missing_fields?: string[];
    message?: string;
}

export function createFallback(input: FallbackInput): StrategyFallback {
    const messages: Record<string, string> = {
        no_evidence: '无法获取实时数据，请检查网络或稍后重试',
        missing_constraints: '请补充以下信息以便给出更准确的建议',
        risk_violation: '当前方案超出风险承受范围，建议调整约束',
    };

    return {
        type: input.reason,
        missing_fields: input.missing_fields,
        message: input.message ?? messages[input.reason] ?? '需要更多信息',
    };
}

// ============================================================================
// StrategyCard Serialization
// ============================================================================

export function serializeStrategyCard(card: StrategyCard): string {
    return JSON.stringify(card, null, 2);
}

export function formatStrategyCardForUI(card: StrategyCard): {
    headline: string;
    summary: string;
    risk_level: 'low' | 'medium' | 'high';
    action_label: string;
} {
    const riskLevel = card.outcomes_distribution.failure_prob < 0.05
        ? 'low'
        : card.outcomes_distribution.failure_prob < 0.15
            ? 'medium'
            : 'high';

    const actionLabels: Record<string, string> = {
        do: '执行',
        ask: '询问',
        wait: '等待',
        commit: '确认',
    };

    return {
        headline: card.next_best_action.summary,
        summary: card.why.top_reasons[0] || '基于当前信息的最优建议',
        risk_level: riskLevel,
        action_label: actionLabels[card.next_best_action.action_type] || '操作',
    };
}

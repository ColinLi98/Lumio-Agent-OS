/**
 * Decision Explainer
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Generates rich explanations for solver decisions.
 * Supports multiple formats: summary, detailed, and interactive.
 */

import type {
    SolveResult,
    Action,
    ActionType,
    DecisionExplanation,
    ObjectiveWeights,
    CompiledObjective,
    StateKey,
    TwinState,
} from './twinTypes';
import { interpretRiskLevel } from './riskModels';

// ============================================================================
// Types
// ============================================================================

export interface ExplanationCard {
    title: string;
    subtitle: string;
    points: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    riskColor: string;
    metrics: {
        expectedGain: string;
        riskLevel: string;
        confidence: string;
    };
    alternatives: Array<{
        label: string;
        reason: string;
    }>;
}

export interface DetailedExplanation {
    summary: string;
    reasoning: string[];
    tradeoffs: string[];
    risks: string[];
    sensitivities: string[];
    alternatives: string[];
    assumptions: string[];
}

// ============================================================================
// P2: Belief-Aware Explanation Types
// ============================================================================

/**
 * Posterior summary for belief-aware explanations
 */
export interface PosteriorSummary {
    /** Mean execution adherence from posterior */
    execution_adherence_mean: number;
    /** Std of execution adherence */
    execution_adherence_std: number;
    /** Mean risk aversion from posterior */
    risk_aversion_mean: number;
    /** Effective particle count (ESS) */
    effective_sample_size: number;
    /** Uncertainty level: low/medium/high */
    uncertainty_level: 'low' | 'medium' | 'high';
}

/**
 * Risk summary derived from weighted CVaR
 */
export interface RiskSummary {
    /** Weighted mean return */
    weighted_mean: number;
    /** Weighted CVaR (5%) */
    weighted_cvar_5: number;
    /** Risk-adjusted score */
    risk_adjusted_score: number;
    /** Risk interpretation */
    risk_interpretation: string;
    /** Tail risk description */
    tail_risk_description: string;
}

/**
 * Belief-aware explanation with posterior info
 */
export interface BeliefAwareExplanation extends DetailedExplanation {
    /** P2: Posterior summary from particle filter */
    posterior_summary: PosteriorSummary;
    /** P2: Risk summary from weighted CVaR */
    risk_summary: RiskSummary;
    /** How belief uncertainty affects recommendation */
    uncertainty_impact: string;
}

// ============================================================================
// Card Generation
// ============================================================================

/**
 * Generate a UI-ready explanation card
 */
export function generateExplanationCard(result: SolveResult): ExplanationCard {
    const { best_action, ranked, explain, confidence } = result;

    const risk = interpretRiskLevel(ranked[0]?.cvar ?? 0);

    return {
        title: explain.headline,
        subtitle: getActionDescription(best_action),
        points: [
            ...explain.why,
            ...explain.risk_notes,
        ],
        riskLevel: risk.level,
        riskColor: risk.color,
        metrics: {
            expectedGain: `+${(explain.metrics.mean * 100).toFixed(1)}%`,
            riskLevel: risk.label,
            confidence: `${(confidence * 100).toFixed(0)}%`,
        },
        alternatives: explain.alternatives.slice(0, 3).map(alt => ({
            label: getActionLabel(alt.action.type),
            reason: alt.reason,
        })),
    };
}

/**
 * Get description for action
 */
function getActionDescription(action: Action): string {
    const descriptions: Record<ActionType, string> = {
        focus_work: '集中精力完成高优先级工作任务',
        focus_study: '投入时间学习新技能或深化现有能力',
        exercise: '通过运动提升身体健康和精力',
        sleep_earlier: '改善睡眠质量，恢复精力',
        networking: '拓展人脉，建立有价值的社交关系',
        ship_milestone: '完成并交付重要的项目里程碑',
        delegate: '将部分工作委派给他人，释放时间',
        drop_task: '放弃低价值任务，聚焦核心目标',
        reduce_spend: '减少非必要支出，积累财务资本',
        increase_savings: '提高储蓄率，增强财务安全感',
        rebalance_portfolio: '调整投资组合，优化风险收益比',
        seek_mentorship: '寻找导师指导，加速成长',
    };
    return descriptions[action.type] || '采取行动推进目标';
}

// ============================================================================
// Detailed Explanation
// ============================================================================

/**
 * Generate detailed explanation for advanced users
 */
export function generateDetailedExplanation(
    result: SolveResult,
    currentState?: TwinState
): DetailedExplanation {
    const { best_action, ranked, explain, confidence } = result;
    const best = ranked[0];

    // Summary
    const summary = `基于当前状态和目标，推荐「${getActionLabel(best_action.type)}」，` +
        `预期收益 ${(best.mean * 100).toFixed(1)}%，置信度 ${(confidence * 100).toFixed(0)}%。`;

    // Reasoning
    const reasoning = [
        `该行动在 ${ranked.length} 个选项中得分最高 (${best.score.toFixed(3)})`,
        `Monte Carlo 模拟显示平均收益为 ${(best.mean * 100).toFixed(1)}%`,
        `风险控制在可接受范围内 (CVaR: ${(best.cvar * 100).toFixed(1)}%)`,
        `执行概率为 ${((1 - best.p_violate) * 100).toFixed(0)}%`,
    ];

    // Tradeoffs
    const tradeoffs = explain.tradeoffs.length > 0 ? explain.tradeoffs : [
        '无明显权衡冲突',
    ];

    // Risks
    const risks = [
        ...explain.risk_notes,
        `标准差 ${(best.std * 100).toFixed(1)}% 表示结果存在不确定性`,
    ];
    if (best.p_violate > 0.2) {
        risks.push(`约 ${(best.p_violate * 100).toFixed(0)}% 的情景可能未达预期收益`);
    }

    // Sensitivities
    const sensitivities = explain.sensitivity.map(s =>
        `若${s.direction === 'increase' ? '增加' : '减少'}${s.weight}权重，${s.effect}`
    );

    // Alternatives
    const alternatives = explain.alternatives.map(alt =>
        `${getActionLabel(alt.action.type)}: ${alt.reason}`
    );

    // Assumptions
    const assumptions = [
        '假设未来情景符合历史规律',
        '假设用户执行力符合估计的坚持率',
        '未考虑可能的黑天鹅事件',
    ];

    return {
        summary,
        reasoning,
        tradeoffs,
        risks,
        sensitivities,
        alternatives,
        assumptions,
    };
}

// ============================================================================
// P2: Belief-Aware Explanation Generation
// ============================================================================

import type { BeliefState } from './twinTypes';
import { getMeanParams, getStateStd } from './twinBeliefStore';

/**
 * P2: Generate belief-aware explanation with posterior summary
 */
export function generateBeliefAwareExplanation(
    result: SolveResult,
    belief: BeliefState,
    currentState?: TwinState
): BeliefAwareExplanation {
    // Get base detailed explanation
    const detailed = generateDetailedExplanation(result, currentState);
    const best = result.ranked[0];

    // P2: Compute posterior summary from belief particles
    const meanParams = getMeanParams(belief);
    const particles = belief.particles;

    // Compute adherence std
    const adherenceMean = meanParams.execution_adherence;
    const adherenceVar = particles.reduce((acc, p) =>
        acc + p.weight * (p.params.theta.execution_adherence - adherenceMean) ** 2, 0
    );
    const adherenceStd = Math.sqrt(adherenceVar);

    // Compute ESS
    const sumSquaredWeights = particles.reduce((acc, p) => acc + p.weight ** 2, 0);
    const ess = sumSquaredWeights > 0 ? 1 / sumSquaredWeights : 0;

    // Determine uncertainty level
    const uncertaintyLevel = adherenceStd > 0.15 ? 'high' :
        adherenceStd > 0.08 ? 'medium' : 'low';

    const posteriorSummary: PosteriorSummary = {
        execution_adherence_mean: adherenceMean,
        execution_adherence_std: adherenceStd,
        risk_aversion_mean: meanParams.stress_sensitivity,  // Use stress_sensitivity as risk proxy
        effective_sample_size: ess,
        uncertainty_level: uncertaintyLevel,
    };

    // P2: Risk summary from weighted metrics
    const riskInterpretation = interpretRiskLevel(best?.cvar ?? 0);
    const tailRiskDesc = best.cvar < -0.15
        ? `在最坏的5%情景中，可能损失${(Math.abs(best.cvar) * 100).toFixed(0)}%以上`
        : `尾部风险可控，最差情景损失约${(Math.abs(best.cvar) * 100).toFixed(0)}%`;

    const riskSummary: RiskSummary = {
        weighted_mean: best.mean,
        weighted_cvar_5: best.cvar,
        risk_adjusted_score: best.score,
        risk_interpretation: riskInterpretation.label,
        tail_risk_description: tailRiskDesc,
    };

    // Uncertainty impact description
    let uncertaintyImpact = '';
    if (uncertaintyLevel === 'high') {
        uncertaintyImpact = '由于对您执行力的不确定性较高，建议选择更稳健的行动，并注意追踪反馈以更新模型。';
    } else if (uncertaintyLevel === 'medium') {
        uncertaintyImpact = '模型对您的特征有一定把握，但仍有提升空间。继续记录反馈可以提高推荐精度。';
    } else {
        uncertaintyImpact = '模型已较好地理解了您的执行特征，推荐可信度较高。';
    }

    return {
        ...detailed,
        posterior_summary: posteriorSummary,
        risk_summary: riskSummary,
        uncertainty_impact: uncertaintyImpact,
    };
}

// ============================================================================
// Narrative Generation
// ============================================================================

/**
 * Generate natural language narrative
 */
export function generateNarrative(result: SolveResult): string {
    const { best_action, ranked, confidence } = result;
    const best = ranked[0];

    const actionLabel = getActionLabel(best_action.type);
    const intensity = best_action.intensity > 0.7 ? '全力投入' :
        best_action.intensity > 0.4 ? '适度进行' : '轻度尝试';

    let narrative = `经过分析，我建议您${intensity}「${actionLabel}」。`;

    narrative += `这个选择的预期收益约为 ${(best.mean * 100).toFixed(1)}%，`;
    narrative += `在考虑各种风险后，仍然是目前最优的策略。`;

    if (confidence < 0.6) {
        narrative += `不过，这个推荐的置信度不是特别高，您也可以考虑其他选项。`;
    }

    if (best.p_violate > 0.2) {
        narrative += `需要注意的是，约有 ${(best.p_violate * 100).toFixed(0)}% 的概率结果可能低于预期。`;
    }

    if (ranked.length > 1 && ranked[0].score - ranked[1].score < 0.03) {
        const second = ranked[1].action;
        narrative += `另外，「${getActionLabel(second.type)}」也是不错的选择，效果相近。`;
    }

    return narrative;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get Chinese label for action type
 */
function getActionLabel(type: ActionType): string {
    const labels: Record<ActionType, string> = {
        focus_work: '专注工作',
        focus_study: '学习提升',
        exercise: '运动健身',
        sleep_earlier: '早睡休息',
        networking: '社交拓展',
        ship_milestone: '交付里程碑',
        delegate: '任务委派',
        drop_task: '放弃低价值任务',
        reduce_spend: '减少开支',
        increase_savings: '增加储蓄',
        rebalance_portfolio: '调整投资组合',
        seek_mentorship: '寻求指导',
    };
    return labels[type] || type;
}

/**
 * Format metrics for display
 */
export function formatMetrics(result: SolveResult): {
    gain: string;
    risk: string;
    confidence: string;
    p_success: string;
} {
    const best = result.ranked[0];
    const risk = interpretRiskLevel(best?.cvar ?? 0);

    return {
        gain: `${(best.mean * 100).toFixed(1)}%`,
        risk: risk.label,
        confidence: `${(result.confidence * 100).toFixed(0)}%`,
        p_success: `${((1 - best.p_violate) * 100).toFixed(0)}%`,
    };
}

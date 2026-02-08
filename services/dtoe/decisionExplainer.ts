/**
 * Decision Explainer
 * Phase 3 v0.2: Explainable Decision Cards
 * 
 * Transforms ranked actions into human-readable explanation cards.
 * All reasons must be traceable to: metrics, evidence_refs, constraints.
 */

import type { Action, GoalStack, EvidencePack, StrategyCard } from './coreSchemas.js';
import type { ActionScore, SolveResult } from './bellmanSolver.js';
import { buildStrategyCard } from './strategyCard.js';

// ============================================================================
// Types
// ============================================================================

export interface ExplanationCard {
    /** Main headline */
    headline: string;
    /** Top reasons (must have ≥3 if needs_live_data) */
    top_reasons: ReasonItem[];
    /** Key tradeoffs considered */
    tradeoffs: TradeoffItem[];
    /** Risk notes */
    risk_notes: string[];
    /** Evidence references (indices into evidence_pack.items) */
    evidence_refs: number[];
    /** Constraint notes */
    constraint_notes: string[];
    /** Metric improvements */
    metric_improvements: MetricImprovement[];
    /** Alternatives summary */
    alternatives: AlternativeSummary[];
    /** Counterfactual why-not explanations */
    why_not_explanations?: WhyNotExplanation[];
    /** Sensitivity analysis results */
    sensitivity?: SensitivityResult[];
    /** Decision audit trail */
    audit_trail?: DecisionAuditTrail;
}

export interface ReasonItem {
    /** Reason text */
    text: string;
    /** What supports this reason */
    source: 'metric' | 'evidence' | 'constraint' | 'goal' | 'risk';
    /** Optional reference index */
    ref_index?: number;
}

export interface TradeoffItem {
    /** What we're gaining */
    gain: string;
    /** What we're giving up */
    cost: string;
    /** Net assessment */
    assessment: 'favorable' | 'neutral' | 'unfavorable';
}

export interface MetricImprovement {
    metric: string;
    baseline: number;
    expected: number;
    p90: number;
    delta: number;
}

export interface AlternativeSummary {
    action_summary: string;
    reason_not_chosen: string;
    score_gap: number;
}

export interface ExplainerInput {
    solve_result: SolveResult;
    evidence_pack: EvidencePack | null;
    goals: GoalStack;
    needs_live_data: boolean;
}

export interface ExplainerOutput {
    strategy_card: StrategyCard;
    explanation_card: ExplanationCard;
    why_not_explanations: WhyNotExplanation[];
    sensitivity: SensitivityResult[];
    audit_trail: DecisionAuditTrail;
}

// ============================================================================
// Reason Templates
// ============================================================================

const REASON_TEMPLATES = {
    risk_adjusted: (cvar: number) =>
        `风险调整后期望收益最优 (CVaR_90: ${cvar.toFixed(2)})`,
    low_failure_prob: (prob: number) =>
        `失败概率较低 (${(prob * 100).toFixed(1)}%)`,
    reversible_action: () =>
        `该行动可逆，降低决策风险`,
    evidence_supported: (count: number) =>
        `有 ${count} 条实时证据支撑`,
    goal_aligned: (goal: string) =>
        `与目标"${goal}"高度一致`,
    resource_efficient: (resource: string) =>
        `${resource}消耗在可接受范围内`,
    constraint_satisfied: () =>
        `满足所有硬约束条件`,
    better_than_wait: (gap: number) =>
        `优于等待策略 (收益差: +${gap.toFixed(2)})`,
    time_sensitive: () =>
        `当前时机窗口有限，建议尽快行动`,
    information_gathering: () =>
        `当前信息不确定性较高，建议先收集更多信息`,
};

// ============================================================================
// Core Explainer Functions
// ============================================================================

/**
 * Generate reason items based on action score
 */
function generateReasons(
    best: ActionScore,
    ranked: ActionScore[],
    evidence_pack: EvidencePack | null,
    goals: GoalStack,
    needs_live_data: boolean
): ReasonItem[] {
    const reasons: ReasonItem[] = [];

    // 1. Risk-adjusted score
    reasons.push({
        text: REASON_TEMPLATES.risk_adjusted(best.cvar_90),
        source: 'metric',
    });

    // 2. Failure probability
    if (best.failure_prob < 0.15) {
        reasons.push({
            text: REASON_TEMPLATES.low_failure_prob(best.failure_prob),
            source: 'risk',
        });
    }

    // 3. Reversibility
    if (best.action.reversibility === 'reversible') {
        reasons.push({
            text: REASON_TEMPLATES.reversible_action(),
            source: 'risk',
        });
    }

    // 4. Evidence support
    if (evidence_pack && evidence_pack.items.length > 0) {
        reasons.push({
            text: REASON_TEMPLATES.evidence_supported(evidence_pack.items.length),
            source: 'evidence',
            ref_index: 0,
        });
    }

    // 5. Goal alignment
    if (goals.objectives.length > 0) {
        const topGoal = goals.objectives.reduce((a, b) =>
            a.weight > b.weight ? a : b
        );
        reasons.push({
            text: REASON_TEMPLATES.goal_aligned(topGoal.name),
            source: 'goal',
        });
    }

    // 6. Resource efficiency
    if ((best.action.cost.time_hours ?? 0) < 5) {
        reasons.push({
            text: REASON_TEMPLATES.resource_efficient('时间'),
            source: 'constraint',
        });
    }

    // 7. Constraint satisfaction
    if (best.eligible) {
        reasons.push({
            text: REASON_TEMPLATES.constraint_satisfied(),
            source: 'constraint',
        });
    }

    // 8. Compare with wait action
    const waitAction = ranked.find(
        (s) => s.action.action_type === 'wait' && s.eligible
    );
    if (waitAction && best.score > waitAction.score) {
        reasons.push({
            text: REASON_TEMPLATES.better_than_wait(best.score - waitAction.score),
            source: 'metric',
        });
    }

    // 9. Information gathering (for ask actions)
    if (best.action.action_type === 'ask') {
        reasons.push({
            text: REASON_TEMPLATES.information_gathering(),
            source: 'risk',
        });
    }

    // Ensure minimum 3 reasons if needs_live_data
    if (needs_live_data && reasons.length < 3) {
        reasons.push({
            text: '基于当前可用信息的最佳建议',
            source: 'metric',
        });
    }

    return reasons;
}

/**
 * Generate tradeoffs
 */
function generateTradeoffs(
    best: ActionScore,
    ranked: ActionScore[]
): TradeoffItem[] {
    const tradeoffs: TradeoffItem[] = [];

    // Time vs outcome
    if ((best.action.cost.time_hours ?? 0) > 0) {
        tradeoffs.push({
            gain: `预期收益 ${best.mean_utility.toFixed(2)}`,
            cost: `时间投入 ${best.action.cost.time_hours ?? 0} 小时`,
            assessment: best.mean_utility > (best.action.cost.time_hours ?? 0) * 0.1 ? 'favorable' : 'neutral',
        });
    }

    // Money vs outcome
    if ((best.action.cost.money ?? 0) > 0) {
        tradeoffs.push({
            gain: `预期收益 ${best.mean_utility.toFixed(2)}`,
            cost: `资金投入 ¥${best.action.cost.money}`,
            assessment: 'neutral',
        });
    }

    // Risk vs return
    if (Math.abs(best.cvar_90) > 0.1) {
        tradeoffs.push({
            gain: `期望收益 ${best.mean_utility.toFixed(2)}`,
            cost: `尾部风险 CVaR_90: ${best.cvar_90.toFixed(2)}`,
            assessment: best.mean_utility > Math.abs(best.cvar_90) ? 'favorable' : 'unfavorable',
        });
    }

    return tradeoffs;
}

/**
 * Generate risk notes
 */
function generateRiskNotes(best: ActionScore): string[] {
    const notes: string[] = [];

    if (best.failure_prob > 0.2) {
        notes.push(`⚠️ 失败概率较高 (${(best.failure_prob * 100).toFixed(1)}%)`);
    }

    if (best.action.reversibility === 'irreversible') {
        notes.push('⚠️ 该决策不可逆，请谨慎确认');
    }

    if (best.action.risk_tags?.includes('financial_risk')) {
        notes.push('⚠️ 涉及财务风险');
    }

    if (best.action.risk_tags?.includes('high_stakes')) {
        notes.push('⚠️ 高风险决策');
    }

    if (best.std_utility > best.mean_utility * 0.5) {
        notes.push('⚠️ 结果不确定性较高');
    }

    return notes;
}

/**
 * Generate constraint notes
 */
function generateConstraintNotes(
    best: ActionScore,
    goals: GoalStack
): string[] {
    const notes: string[] = [];

    if (goals.hard_constraints.max_money_outflow !== undefined) {
        notes.push(`资金约束: ≤ ¥${goals.hard_constraints.max_money_outflow}`);
    }

    if (goals.hard_constraints.max_time_per_week !== undefined) {
        notes.push(`时间约束: ≤ ${goals.hard_constraints.max_time_per_week} 小时/周`);
    }

    if (goals.hard_constraints.max_failure_prob !== undefined) {
        notes.push(`风险约束: 失败率 ≤ ${(goals.hard_constraints.max_failure_prob * 100).toFixed(0)}%`);
    }

    return notes;
}

/**
 * Generate metric improvements
 */
function generateMetricImprovements(
    best: ActionScore,
    goals: GoalStack
): MetricImprovement[] {
    const improvements: MetricImprovement[] = [];

    // Use outcome samples to estimate improvements
    if (best.outcome_samples.length > 0) {
        const sorted = [...best.outcome_samples].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];

        improvements.push({
            metric: '综合效用',
            baseline: 0.5,
            expected: best.mean_utility,
            p90,
            delta: best.mean_utility - 0.5,
        });
    }

    return improvements;
}

/**
 * Generate alternative summaries
 */
function generateAlternatives(
    ranked: ActionScore[],
    best: ActionScore
): AlternativeSummary[] {
    return ranked
        .filter((s) => s.action.action_id !== best.action.action_id && s.eligible)
        .slice(0, 3)
        .map((s) => ({
            action_summary: s.action.summary,
            reason_not_chosen: s.score < best.score
                ? `综合评分较低 (${s.score.toFixed(2)} vs ${best.score.toFixed(2)})`
                : `风险较高`,
            score_gap: best.score - s.score,
        }));
}

/**
 * Main explainer function
 */
export function generateExplanation(input: ExplainerInput): ExplainerOutput {
    const { solve_result, evidence_pack, goals, needs_live_data } = input;
    const { ranked_actions, best_action } = solve_result;

    // Find best eligible action score
    const bestScore = ranked_actions.find(
        (s) => s.eligible && s.action.action_id === best_action?.action_id
    );

    if (!bestScore || !best_action) {
        // Fallback: no eligible action
        const fallbackCard = buildFallbackCards(goals, evidence_pack, needs_live_data, solve_result);
        return fallbackCard;
    }

    const eligibleRanked = ranked_actions.filter((s) => s.eligible);
    const whyNotExplanations = generateWhyNotExplanations(
        eligibleRanked.length > 0 ? eligibleRanked : ranked_actions,
        bestScore,
        goals
    );
    const sensitivity = analyzeSensitivity(
        eligibleRanked.length > 0 ? eligibleRanked : ranked_actions,
        goals.risk_model?.tail_weight ?? 0.5
    );
    const auditTrail = generateAuditTrail(solve_result, evidence_pack, goals);

    // Generate explanation card
    const explanation_card: ExplanationCard = {
        headline: `推荐: ${best_action.summary}`,
        top_reasons: generateReasons(
            bestScore,
            ranked_actions,
            evidence_pack,
            goals,
            needs_live_data
        ),
        tradeoffs: generateTradeoffs(bestScore, ranked_actions),
        risk_notes: generateRiskNotes(bestScore),
        evidence_refs: evidence_pack
            ? evidence_pack.items.map((_, i) => i)
            : [],
        constraint_notes: generateConstraintNotes(bestScore, goals),
        metric_improvements: generateMetricImprovements(bestScore, goals),
        alternatives: generateAlternatives(ranked_actions, bestScore),
        why_not_explanations: whyNotExplanations,
        sensitivity,
        audit_trail: auditTrail,
    };

    // Build strategy card
    const strategy_card = buildStrategyCard({
        entity_id: goals.entity_id,
        best_action,
        ranked_scores: ranked_actions.map((s) => ({
            action: s.action,
            mean: s.mean_utility,
            std: s.std_utility,
            cvar_90: s.cvar_90,
            failure_prob: s.failure_prob,
            score: s.score,
        })),
        evidence_pack,
        needs_live_data,
    });

    return {
        strategy_card,
        explanation_card,
        why_not_explanations: whyNotExplanations,
        sensitivity,
        audit_trail: auditTrail,
    };
}

/**
 * Build fallback cards when no eligible action
 */
function buildFallbackCards(
    goals: GoalStack,
    evidence_pack: EvidencePack | null,
    needs_live_data: boolean,
    solve_result: SolveResult
): ExplainerOutput {
    const strategy_card: StrategyCard = {
        card_type: 'StrategyCard',
        entity_id: goals.entity_id,
        decision_time_ms: Date.now(),
        next_best_action: {
            action_type: 'wait',
            summary: '暂无可行方案，建议等待更多信息',
            requires_confirmation: false,
        },
        outcomes_distribution: {
            metrics: [],
            failure_prob: 1,
        },
        why: {
            top_reasons: ['当前约束条件下无可行方案'],
            evidence_refs: [],
        },
        evidence_pack,
        fallback: {
            type: 'missing_constraints',
            message: '需要更多信息以生成建议',
            missing_fields: ['约束条件', '目标优先级'],
        },
    };

    const explanation_card: ExplanationCard = {
        headline: '暂无可行方案',
        top_reasons: [
            { text: '当前约束条件下无可行方案', source: 'constraint' },
            { text: '建议放宽约束或提供更多信息', source: 'constraint' },
            { text: '可尝试调整目标优先级', source: 'goal' },
        ],
        tradeoffs: [],
        risk_notes: [],
        evidence_refs: [],
        constraint_notes: ['所有候选方案均违反硬约束'],
        metric_improvements: [],
        alternatives: [],
        why_not_explanations: [],
        sensitivity: [],
        audit_trail: generateAuditTrail(solve_result, evidence_pack, goals),
    };

    return {
        strategy_card,
        explanation_card,
        why_not_explanations: [],
        sensitivity: [],
        audit_trail: explanation_card.audit_trail!,
    };
}

/**
 * Validate explanation card has required content
 */
export function validateExplanationCard(
    card: ExplanationCard,
    needs_live_data: boolean
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (card.top_reasons.length < 3) {
        errors.push(`top_reasons 少于 3 条 (当前: ${card.top_reasons.length})`);
    }

    if (needs_live_data && card.evidence_refs.length === 0) {
        errors.push('needs_live_data=true 但 evidence_refs 为空');
    }

    // Check for vague reasons
    const vaguePatterns = ['无法解释', '模型认为', '系统判断', '根据算法'];
    for (const reason of card.top_reasons) {
        if (vaguePatterns.some((p) => reason.text.includes(p))) {
            errors.push(`发现模糊理由: "${reason.text}"`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================================
// PR-06: Counterfactual Explanations & Sensitivity Analysis
// ============================================================================

/**
 * Contrastive why-not explanation
 */
export interface WhyNotExplanation {
    alternative_action: string;
    alternative_id: string;
    key_differences: WhyNotDifference[];
    hypothetical_change: string;  // "如果X，则会选择此方案"
    score_comparison: {
        chosen_score: number;
        alternative_score: number;
        gap: number;
    };
    deciding_factors: {
        factor: string;
        weight_in_decision: number;  // 0-1
        chosen_value: number;
        alternative_value: number;
    }[];
}

export interface WhyNotDifference {
    dimension: 'utility' | 'risk' | 'constraint' | 'cost' | 'timing';
    description: string;
    direction: 'better' | 'worse' | 'neutral';
}

/**
 * Sensitivity analysis result
 */
export interface SensitivityResult {
    parameter: string;
    current_value: number;
    threshold_to_switch: number;  // Value at which Top1 would change
    sensitivity: 'high' | 'medium' | 'low';
    affected_actions: string[];
}

/**
 * Generate detailed why-not explanation for an alternative
 */
export function generateWhyNotExplanation(
    chosen: ActionScore,
    alternative: ActionScore,
    goals: GoalStack
): WhyNotExplanation {
    const differences: WhyNotDifference[] = [];
    const decidingFactors: WhyNotExplanation['deciding_factors'] = [];

    // Compare utility
    if (Math.abs(chosen.mean_utility - alternative.mean_utility) > 0.01) {
        const direction: WhyNotDifference['direction'] =
            alternative.mean_utility > chosen.mean_utility ? 'better' : 'worse';
        differences.push({
            dimension: 'utility',
            description: direction === 'better'
                ? `预期收益更高 (${alternative.mean_utility.toFixed(2)} vs ${chosen.mean_utility.toFixed(2)})`
                : `预期收益较低 (${alternative.mean_utility.toFixed(2)} vs ${chosen.mean_utility.toFixed(2)})`,
            direction,
        });
        decidingFactors.push({
            factor: '预期收益',
            weight_in_decision: 0.4,
            chosen_value: chosen.mean_utility,
            alternative_value: alternative.mean_utility,
        });
    }

    // Compare risk (CVaR)
    const chosenRisk = Math.abs(chosen.cvar_90);
    const altRisk = Math.abs(alternative.cvar_90);
    if (Math.abs(chosenRisk - altRisk) > 0.05) {
        const direction: WhyNotDifference['direction'] = altRisk < chosenRisk ? 'better' : 'worse';
        differences.push({
            dimension: 'risk',
            description: direction === 'better'
                ? `风险较低 (CVaR ${altRisk.toFixed(2)} vs ${chosenRisk.toFixed(2)})`
                : `风险较高 (CVaR ${altRisk.toFixed(2)} vs ${chosenRisk.toFixed(2)})`,
            direction,
        });
        decidingFactors.push({
            factor: '下行风险',
            weight_in_decision: 0.3,
            chosen_value: chosenRisk,
            alternative_value: altRisk,
        });
    }

    // Compare failure probability
    if (Math.abs(chosen.failure_prob - alternative.failure_prob) > 0.05) {
        const direction: WhyNotDifference['direction'] =
            alternative.failure_prob < chosen.failure_prob ? 'better' : 'worse';
        differences.push({
            dimension: 'risk',
            description: direction === 'better'
                ? `失败概率较低 (${(alternative.failure_prob * 100).toFixed(0)}% vs ${(chosen.failure_prob * 100).toFixed(0)}%)`
                : `失败概率较高 (${(alternative.failure_prob * 100).toFixed(0)}% vs ${(chosen.failure_prob * 100).toFixed(0)}%)`,
            direction,
        });
    }

    // Compare costs
    const chosenCost = (chosen.action.cost.money ?? 0) + (chosen.action.cost.time_hours ?? 0) * 50;
    const altCost = (alternative.action.cost.money ?? 0) + (alternative.action.cost.time_hours ?? 0) * 50;
    if (Math.abs(chosenCost - altCost) > 100) {
        const direction: WhyNotDifference['direction'] = altCost < chosenCost ? 'better' : 'worse';
        differences.push({
            dimension: 'cost',
            description: direction === 'better'
                ? `成本较低 (¥${altCost.toFixed(0)} vs ¥${chosenCost.toFixed(0)} 当量)`
                : `成本较高 (¥${altCost.toFixed(0)} vs ¥${chosenCost.toFixed(0)} 当量)`,
            direction,
        });
        decidingFactors.push({
            factor: '资源成本',
            weight_in_decision: 0.2,
            chosen_value: chosenCost,
            alternative_value: altCost,
        });
    }

    // Check constraints
    if (!alternative.eligible && alternative.ineligible_reason) {
        differences.push({
            dimension: 'constraint',
            description: `违反约束: ${alternative.ineligible_reason}`,
            direction: 'worse',
        });
    }

    // Generate hypothetical change
    const worstDiff = differences.find(d => d.direction === 'worse');
    const hypothetical = worstDiff
        ? `如果${worstDiff.description.replace(/较高|较低|违反约束/, '改善')}，可能会选择此方案`
        : '在当前条件下此方案几乎同等优秀';

    return {
        alternative_action: alternative.action.summary,
        alternative_id: alternative.action.action_id,
        key_differences: differences,
        hypothetical_change: hypothetical,
        score_comparison: {
            chosen_score: chosen.score,
            alternative_score: alternative.score,
            gap: chosen.score - alternative.score,
        },
        deciding_factors: decidingFactors,
    };
}

/**
 * Generate multiple why-not explanations for top alternatives
 */
export function generateWhyNotExplanations(
    ranked: ActionScore[],
    best: ActionScore,
    goals: GoalStack,
    maxAlternatives: number = 3
): WhyNotExplanation[] {
    return ranked
        .filter(s => s.action.action_id !== best.action.action_id)
        .slice(0, maxAlternatives)
        .map(alt => generateWhyNotExplanation(best, alt, goals));
}

/**
 * Perform sensitivity analysis on key parameters
 */
export function analyzeSensitivity(
    ranked: ActionScore[],
    riskAversion: number
): SensitivityResult[] {
    const results: SensitivityResult[] = [];

    if (ranked.length < 2) return results;

    const best = ranked[0];
    const second = ranked[1];

    // Sensitivity to risk aversion
    // Score = mean - rho * |CVaR|
    // Switch when: second.mean - rho * |second.cvar| > best.mean - rho * |best.cvar|
    // Solve for rho: rho * (|second.cvar| - |best.cvar|) < second.mean - best.mean

    const cvarDiff = Math.abs(second.cvar_90) - Math.abs(best.cvar_90);
    const meanDiff = second.mean_utility - best.mean_utility;

    if (cvarDiff !== 0) {
        const switchThreshold = meanDiff / cvarDiff;
        if (switchThreshold > 0 && switchThreshold < 2) {
            const sensitivity: SensitivityResult['sensitivity'] =
                Math.abs(switchThreshold - riskAversion) < 0.2 ? 'high' :
                    Math.abs(switchThreshold - riskAversion) < 0.5 ? 'medium' : 'low';

            results.push({
                parameter: '风险厌恶系数 (ρ)',
                current_value: riskAversion,
                threshold_to_switch: switchThreshold,
                sensitivity,
                affected_actions: [second.action.summary],
            });
        }
    }

    // Sensitivity to failure probability threshold
    const bestFailure = best.failure_prob;
    const secondFailure = second.failure_prob;
    if (Math.abs(bestFailure - secondFailure) > 0.05) {
        const sensitivity: SensitivityResult['sensitivity'] =
            Math.abs(bestFailure - secondFailure) < 0.1 ? 'high' : 'low';

        results.push({
            parameter: '失败概率阈值',
            current_value: 0.3,  // Default max_failure_prob
            threshold_to_switch: bestFailure + 0.05,
            sensitivity,
            affected_actions: [best.action.summary, second.action.summary],
        });
    }

    return results;
}

/**
 * Get audit trail for a decision
 */
export interface DecisionAuditTrail {
    trace_id: string;
    timestamp_ms: number;
    model_version: string;
    evidence_item_indices: number[];
    constraint_keys: string[];
    parameters_used: Record<string, number>;
}

export function generateAuditTrail(
    solve_result: SolveResult,
    evidence_pack: EvidencePack | null,
    goals: GoalStack
): DecisionAuditTrail {
    return {
        trace_id: solve_result.trace_id,
        timestamp_ms: Date.now(),
        model_version: 'dtoe-v0.3.0',
        evidence_item_indices: evidence_pack?.items.map((_, i) => i) ?? [],
        constraint_keys: [
            ...(goals.hard_constraints.max_single_loss_pct !== undefined ? ['max_single_loss_pct'] : []),
            ...(goals.hard_constraints.min_liquidity_months !== undefined ? ['min_liquidity_months'] : []),
        ],
        parameters_used: {
            n_scenarios: solve_result.n_scenarios,
            horizon: solve_result.horizon,
            cache_hit: solve_result.cache_hit ? 1 : 0,
        },
    };
}

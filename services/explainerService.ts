/**
 * Explainer Service
 * Phase 2 Week 2-3: Trust layer with plan explanations
 * 
 * Generates explanations for plans based on:
 * - Trait dependencies
 * - Five-dimension scores
 * - Alternative approaches
 */

import { getSoulMatrixStore } from './soulMatrixStore.js';
import { SoulTrait, TRAIT_METADATA } from './soulTraitTypes.js';
import { Task, Plan, PlanStep, DimensionScores } from './taskTypes.js';
import { getTaskService } from './taskService.js';

// ============================================================================
// Types
// ============================================================================

export interface TraitInfluence {
    trait_id: string;
    trait_key: string;
    display_name: string;
    value: number | string | boolean;
    confidence: number;
    influence_summary: string;  // How this trait affected the recommendation
}

export interface DimensionExplanation {
    dimension: keyof DimensionScores;
    display_name: string;
    score: number;
    explanation: string;
}

export interface Alternative {
    title: string;
    description: string;
    trade_offs: string[];
    estimated_score?: number;
}

export interface PlanExplanation {
    plan_id: string;
    task_id: string;
    trait_influences: TraitInfluence[];
    dimension_explanations: DimensionExplanation[];
    alternatives: Alternative[];
    confidence_score: number;  // 0-1, overall confidence in this plan
    generated_at: number;
}

export interface FeedbackInput {
    plan_id: string;
    vote: 'up' | 'down';
    comment?: string;
}

export interface PlanFeedback {
    feedback_id: string;
    plan_id: string;
    vote: 'up' | 'down';
    comment?: string;
    created_at: number;
}

// ============================================================================
// Dimension Display Names
// ============================================================================

const DIMENSION_NAMES: Partial<Record<keyof DimensionScores, string>> = {
    time_efficiency: '时间效率',
    financial_impact: '经济影响',
    risk_level: '风险水平',
    personal_growth: '个人成长',
    relationship_impact: '关系影响',
};

// ============================================================================
// Explainer Service Class
// ============================================================================

const FEEDBACK_STORAGE_KEY = 'lumi_plan_feedback';

class ExplainerService {
    private feedbacks: Map<string, PlanFeedback> = new Map();
    private trustScores: Map<string, number> = new Map(); // plan_id -> trust score

    constructor() {
        this.loadFeedback();
    }

    /**
     * Generate explanation for a plan
     */
    generateExplanation(plan: Plan, task: Task): PlanExplanation {
        const traitStore = getSoulMatrixStore();
        const traits = traitStore.getTraits();

        // Identify trait influences
        const traitInfluences = this.identifyTraitInfluences(plan, task, traits);

        // Generate dimension explanations
        const dimensionExplanations = this.generateDimensionExplanations(plan, traits);

        // Generate alternatives
        const alternatives = this.generateAlternatives(plan, task, traits);

        // Calculate confidence
        const confidenceScore = this.calculateConfidence(traitInfluences, plan);

        return {
            plan_id: plan.plan_id,
            task_id: task.task_id,
            trait_influences: traitInfluences,
            dimension_explanations: dimensionExplanations,
            alternatives,
            confidence_score: confidenceScore,
            generated_at: Date.now(),
        };
    }

    /**
     * Identify which traits influenced the plan
     */
    private identifyTraitInfluences(
        plan: Plan,
        task: Task,
        traits: SoulTrait[]
    ): TraitInfluence[] {
        const influences: TraitInfluence[] = [];

        for (const trait of traits) {
            const influence = this.assessTraitInfluence(trait, plan, task);
            if (influence) {
                influences.push(influence);
            }
        }

        // Sort by confidence and limit to top 5
        return influences
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }

    private assessTraitInfluence(
        trait: SoulTrait,
        plan: Plan,
        task: Task
    ): TraitInfluence | null {
        const metadata = TRAIT_METADATA[trait.key];
        if (!metadata) return null;

        // Check if trait is relevant based on key
        let influenceSummary = '';

        switch (trait.key) {
            case 'price_sensitivity':
                if (task.budget) {
                    const sensitivity = typeof trait.value === 'number' ? trait.value : 0.5;
                    influenceSummary = sensitivity > 0.6
                        ? '偏好高性价比方案'
                        : '可接受较高价格的优质选项';
                } else {
                    return null;
                }
                break;

            case 'risk_tolerance':
                const riskTolerance = typeof trait.value === 'number' ? trait.value : 0.5;
                influenceSummary = riskTolerance > 0.6
                    ? '可以接受一定风险以获取更高收益'
                    : '优先选择稳妥方案';
                break;

            case 'decision_speed':
                const speed = typeof trait.value === 'number' ? trait.value : 0.5;
                influenceSummary = speed > 0.6
                    ? '倾向于快速决策'
                    : '喜欢深思熟虑后决定';
                break;

            case 'quality_preference':
                const quality = typeof trait.value === 'number' ? trait.value : 0.5;
                influenceSummary = quality > 0.6
                    ? '注重品质和做工'
                    : '实用主义者';
                break;

            case 'convenience_priority':
                const convenience = typeof trait.value === 'number' ? trait.value : 0.5;
                influenceSummary = convenience > 0.6
                    ? '优先考虑便捷性'
                    : '愿意花时间获取更好结果';
                break;

            default:
                return null;
        }

        return {
            trait_id: trait.trait_id,
            trait_key: trait.key,
            display_name: metadata.display_name,
            value: trait.value,
            confidence: trait.confidence,
            influence_summary: influenceSummary,
        };
    }

    /**
     * Generate dimension explanations
     */
    private generateDimensionExplanations(
        plan: Plan,
        traits: SoulTrait[]
    ): DimensionExplanation[] {
        // Use plan's explanation dimension scores if available
        const scores = plan.explanation?.dimension_scores || this.estimateScores(plan, traits);

        const explanations: DimensionExplanation[] = [];

        // Only include top 2-3 most relevant dimensions
        const entries = Object.entries(scores) as [keyof DimensionScores, number][];
        const sorted = entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        const top = sorted.slice(0, 3);

        for (const [dimension, score] of top) {
            const displayName = DIMENSION_NAMES[dimension];
            if (!displayName) continue; // Skip unknown dimensions
            explanations.push({
                dimension,
                display_name: displayName,
                score,
                explanation: this.generateDimensionText(dimension, score),
            });
        }

        return explanations;
    }

    private estimateScores(plan: Plan, traits: SoulTrait[]): DimensionScores {
        // Estimate dimension scores based on plan steps and traits
        const stepCount = plan.steps.length;
        const hasAutomation = plan.steps.some(s =>
            s.action_type === 'open_market' || s.action_type === 'execute_purchase'
        );

        return {
            time_efficiency: hasAutomation ? 0.8 : 0.5,
            financial_impact: 0.5, // Neutral without specific info
            risk_level: Math.min(0.3 + stepCount * 0.1, 0.8), // More steps = more risk
            personal_growth: plan.steps.some(s => s.action_type === 'save_task') ? 0.6 : 0.3,
            relationship_impact: 0.5, // Neutral
        };
    }

    private generateDimensionText(dimension: keyof DimensionScores, score: number): string {
        const highThreshold = 0.7;
        const lowThreshold = 0.4;

        switch (dimension) {
            case 'time_efficiency':
                return score > highThreshold
                    ? '方案可快速执行，预计节省大量时间'
                    : score < lowThreshold
                        ? '需要投入一定时间精力'
                        : '时间投入适中';

            case 'financial_impact':
                return score > highThreshold
                    ? '经济回报显著'
                    : score < lowThreshold
                        ? '需考虑成本投入'
                        : '财务影响适中';

            case 'risk_level':
                return score > highThreshold
                    ? '方案存在一定风险，建议准备备选'
                    : score < lowThreshold
                        ? '风险较低，稳妥可行'
                        : '风险可控';

            case 'personal_growth':
                return score > highThreshold
                    ? '有助于个人能力提升'
                    : score < lowThreshold
                        ? '成长空间有限'
                        : '有一定成长机会';

            case 'relationship_impact':
                return score > highThreshold
                    ? '有利于人际关系'
                    : score < lowThreshold
                        ? '可能影响某些关系'
                        : '对关系影响中性';

            default:
                return '';
        }
    }

    /**
     * Generate alternative approaches
     */
    private generateAlternatives(
        plan: Plan,
        task: Task,
        traits: SoulTrait[]
    ): Alternative[] {
        const alternatives: Alternative[] = [];

        // Generate at least one alternative
        // Faster but possibly less thorough
        alternatives.push({
            title: '快速方案',
            description: '简化步骤，直接执行核心操作',
            trade_offs: ['可能遗漏细节', '更快完成'],
            estimated_score: 0.7,
        });

        // More thorough alternative
        if (plan.steps.length < 5) {
            alternatives.push({
                title: '全面方案',
                description: '增加调研和对比步骤',
                trade_offs: ['耗时更长', '决策更稳妥'],
                estimated_score: 0.8,
            });
        }

        // Budget-conscious alternative if relevant
        if (task.budget && task.budget > 0) {
            alternatives.push({
                title: '经济方案',
                description: '优先考虑性价比',
                trade_offs: ['可能牺牲部分品质', '节省开支'],
                estimated_score: 0.6,
            });
        }

        return alternatives.slice(0, 3);
    }

    /**
     * Calculate overall confidence score
     */
    private calculateConfidence(
        traitInfluences: TraitInfluence[],
        plan: Plan
    ): number {
        if (traitInfluences.length === 0) {
            return 0.4; // Base confidence without trait data
        }

        // Average trait confidence
        const avgTraitConfidence = traitInfluences.reduce(
            (sum, t) => sum + t.confidence, 0
        ) / traitInfluences.length;

        // Boost for more steps (more thorough planning)
        const stepBonus = Math.min(plan.steps.length * 0.05, 0.2);

        return Math.min(avgTraitConfidence + stepBonus, 0.95);
    }

    // -------------------------------------------------------------------------
    // Feedback Management
    // -------------------------------------------------------------------------

    recordFeedback(input: FeedbackInput): PlanFeedback {
        const feedback: PlanFeedback = {
            feedback_id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            plan_id: input.plan_id,
            vote: input.vote,
            comment: input.comment,
            created_at: Date.now(),
        };

        this.feedbacks.set(feedback.feedback_id, feedback);
        this.updateTrustScore(input.plan_id, input.vote);
        this.saveFeedback();

        return feedback;
    }

    private updateTrustScore(plan_id: string, vote: 'up' | 'down'): void {
        const current = this.trustScores.get(plan_id) || 0.5;
        const delta = vote === 'up' ? 0.1 : -0.1;
        this.trustScores.set(plan_id, Math.max(0, Math.min(1, current + delta)));
    }

    getTrustScore(plan_id: string): number {
        return this.trustScores.get(plan_id) || 0.5;
    }

    getFeedback(plan_id: string): PlanFeedback[] {
        return Array.from(this.feedbacks.values())
            .filter(f => f.plan_id === plan_id);
    }

    // -------------------------------------------------------------------------
    // Persistence
    // -------------------------------------------------------------------------

    private loadFeedback(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored) as PlanFeedback[];
                this.feedbacks = new Map(data.map(f => [f.feedback_id, f]));
            }
        } catch (error) {
            console.warn('[ExplainerService] Failed to load feedback:', error);
        }
    }

    private saveFeedback(): void {
        if (typeof window === 'undefined') return;

        try {
            const data = Array.from(this.feedbacks.values());
            localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('[ExplainerService] Failed to save feedback:', error);
        }
    }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: ExplainerService | null = null;

export function getExplainerService(): ExplainerService {
    if (!serviceInstance) {
        serviceInstance = new ExplainerService();
    }
    return serviceInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { ExplainerService };

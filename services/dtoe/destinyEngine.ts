/**
 * Destiny Engine
 * Phase 3 v0.2: End-to-End Orchestrator
 * 
 * Main entry point for the Digital Twin Optimization Engine.
 * Coordinates belief → scenario → solve → explain → output.
 * Supports closed-loop learning via recordOutcome.
 */

import type { TwinState, GoalStack, Observation, EvidencePack, StrategyCard, Action } from './coreSchemas';
import { createDefaultGoalStack } from './coreSchemas';
import type { BeliefState } from './twinBeliefStore';
import {
    createBeliefState,
    updateBeliefWithEvidence,
    getPosteriorSummary,
    computeESS,
} from './twinBeliefStore';
import type { SolveResult } from './bellmanSolver';
import { solveBellmanWithOptionsAsync } from './bellmanSolver';
import type { ExplainerOutput } from './decisionExplainer';
import { generateExplanation, validateExplanationCard } from './decisionExplainer';
import { validateEvidenceGate, isEvidenceFresh } from './schemaValidators';
import { logDtoeEvent } from './dtoeEvents';
import { calibrateAndApply } from './calibrationService';
import { mapEvidencePackToObservation } from './observationMapper';

// ============================================================================
// Types
// ============================================================================

export interface RecommendationInput {
    entity_id: string;
    goal_stack?: GoalStack;
    evidence_pack?: EvidencePack | null;
    needs_live_data?: boolean;
    time_budget_ms?: number;
    enable_parallel_scenarios?: boolean;
    seed?: number;
}

export interface RecommendationOutput {
    success: boolean;
    strategy_card: StrategyCard | null;
    explanation_card: ExplainerOutput['explanation_card'] | null;
    solve_result: SolveResult | null;
    diagnostics: RecommendationDiagnostics;
}

export interface RecommendationDiagnostics {
    belief_ess: number;
    n_scenarios: number;
    solve_time_ms: number;
    evidence_status: 'fresh' | 'stale' | 'expired' | 'none';
    explanation_valid: boolean;
    calibration_applied?: boolean;
    calibration_method?: 'ema' | 'bayes_lite';
    cache_hit?: boolean;
    errors: string[];
}

export interface OutcomeRecord {
    action_id: string;
    outcome_type: 'success' | 'partial' | 'failure' | 'cancelled';
    actual_utility?: number;
    observed_state_delta?: Partial<TwinState['resources']>;
    timestamp_ms: number;
    notes?: string;
}

export interface StateSummary {
    entity_id: string;
    posterior_mean: Record<string, number>;
    posterior_std: Record<string, number>;
    belief_ess: number;
    last_update_ms: number;
    pending_actions: string[];
    recommendations_count: number;
}

// ============================================================================
// Destiny Engine Class
// ============================================================================

export class DestinyEngine {
    private beliefStores: Map<string, BeliefState> = new Map();
    private pendingActions: Map<string, Action[]> = new Map();
    private recommendationCounts: Map<string, number> = new Map();
    private calibrationStatus: Map<string, {
        calibration_applied: boolean;
        calibration_method: 'ema' | 'bayes_lite';
    }> = new Map();

    constructor() {
        logDtoeEvent('dtoe.engine_init', {});
    }

    /**
     * Get or create belief state for entity
     */
    private getOrCreateBelief(entity_id: string, seed?: number): BeliefState {
        if (!this.beliefStores.has(entity_id)) {
            const belief = createBeliefState(entity_id, seed ?? Date.now());
            this.beliefStores.set(entity_id, belief);
            logDtoeEvent('dtoe.belief_created', { entity_id, n_particles: belief.n_particles });
        }
        return this.beliefStores.get(entity_id)!;
    }

    /**
     * Get recommendation for entity
     */
    async getRecommendation(input: RecommendationInput): Promise<RecommendationOutput> {
        const {
            entity_id,
            goal_stack = createDefaultGoalStack(entity_id),
            evidence_pack = null,
            needs_live_data = false,
            time_budget_ms = 2000,
            enable_parallel_scenarios = false,
            seed,
        } = input;

        const startTime = performance.now();
        const errors: string[] = [];

        logDtoeEvent('dtoe.recommendation_start', { entity_id, time_budget_ms });

        // 1. Get belief state
        const belief = this.getOrCreateBelief(entity_id, seed);
        const belief_ess = computeESS(belief.particles);

        // 2. Check evidence gate (P0)
        const evidenceGate = validateEvidenceGate(needs_live_data, evidence_pack);
        if (!evidenceGate.valid) {
            errors.push(...evidenceGate.errors);
            logDtoeEvent('dtoe.evidence_gate_fail', { entity_id, errors });

            // Return fallback policy card instead of null to keep Policy > Answer contract.
            const fallbackCard = this.buildNoEvidenceFallback(entity_id, evidence_pack, errors);
            return {
                success: false,
                strategy_card: fallbackCard.strategy_card,
                explanation_card: fallbackCard.explanation_card,
                solve_result: null,
                diagnostics: {
                    belief_ess,
                    n_scenarios: 0,
                    solve_time_ms: performance.now() - startTime,
                    evidence_status: 'none',
                    explanation_valid: true,
                    errors,
                },
            };
        }

        // 2.5. Map evidence to observation and update belief state.
        // This closes the state-machine loop: all external evidence mutates twin state.
        let beliefForSolve = belief;
        if (evidence_pack) {
            const mappedObservation = mapEvidencePackToObservation(evidence_pack);
            const evidenceObservation: Observation = {
                obs_id: mappedObservation.obs_id,
                entity_id,
                obs_type: 'evidence_pack',
                timestamp_ms: mappedObservation.timestamp_ms,
                source: mappedObservation.source,
                ttl_seconds: evidence_pack.ttl_seconds,
                payload: {
                    confidence: evidence_pack.confidence,
                    provider: evidence_pack.provider,
                    signals: mappedObservation.signals,
                    evidence_refs: mappedObservation.evidence_refs ?? [],
                    raw_payload: mappedObservation.raw_payload ?? {},
                },
            };

            beliefForSolve = updateBeliefWithEvidence(beliefForSolve, evidenceObservation);
            this.beliefStores.set(entity_id, beliefForSolve);

            logDtoeEvent('dtoe.belief_update', {
                entity_id,
                obs_type: evidenceObservation.obs_type,
                new_version: beliefForSolve.version,
            });
        }

        // 3. Check evidence freshness
        let evidence_status: 'fresh' | 'stale' | 'expired' | 'none' = 'none';
        if (evidence_pack) {
            if (isEvidenceFresh(evidence_pack)) {
                evidence_status = 'fresh';
            } else {
                evidence_status = 'expired';
                errors.push('证据已过期，建议刷新');
            }
        }

        // 4. Solve using options path (cache + pruning + optional parallel scenarios)
        const solve_result: SolveResult = await solveBellmanWithOptionsAsync(
            beliefForSolve,
            goal_stack,
            {
                time_budget_ms,
                coarse_scenarios: 200,
                fine_scenarios: 5000,
                cache: { enabled: true, ttl_ms: 300000 },
                enable_parallel_scenarios,
                parallel_batch_size: 500,
                parallel_max_concurrency: 4,
            },
            { seed }
        );

        logDtoeEvent('dtoe.solve_complete', {
            entity_id,
            trace_id: solve_result.trace_id,
            n_scenarios: solve_result.n_scenarios,
            solve_time_ms: solve_result.solve_time_ms,
            best_action_type: solve_result.best_action?.action_type,
        });

        // 5. Generate explanation
        const explanation = generateExplanation({
            solve_result,
            evidence_pack,
            goals: goal_stack,
            needs_live_data,
        });

        // 6. Validate explanation
        const validation = validateExplanationCard(
            explanation.explanation_card,
            needs_live_data
        );
        if (!validation.valid) {
            errors.push(...validation.errors);
        }

        logDtoeEvent('dtoe.explain_complete', {
            entity_id,
            explanation_valid: validation.valid,
            top_reasons_count: explanation.explanation_card.top_reasons.length,
        });

        // 7. Track pending action
        if (solve_result.best_action) {
            const pending = this.pendingActions.get(entity_id) ?? [];
            pending.push(solve_result.best_action);
            this.pendingActions.set(entity_id, pending.slice(-10)); // Keep last 10
        }

        // 8. Increment recommendation count
        const count = (this.recommendationCounts.get(entity_id) ?? 0) + 1;
        this.recommendationCounts.set(entity_id, count);
        const calibration = this.calibrationStatus.get(entity_id);

        return {
            success: true,
            strategy_card: explanation.strategy_card,
            explanation_card: explanation.explanation_card,
            solve_result,
            diagnostics: {
                belief_ess,
                n_scenarios: solve_result.n_scenarios,
                solve_time_ms: solve_result.solve_time_ms,
                evidence_status,
                explanation_valid: validation.valid,
                calibration_applied: calibration?.calibration_applied,
                calibration_method: calibration?.calibration_method,
                cache_hit: solve_result.cache_hit,
                errors,
            },
        };
    }

    private buildNoEvidenceFallback(
        entity_id: string,
        evidence_pack: EvidencePack | null,
        gateErrors: string[]
    ): Pick<RecommendationOutput, 'strategy_card' | 'explanation_card'> {
        const missingFields = gateErrors
            .filter((e) => e.includes('needs_live_data'))
            .map(() => ['时间范围', '约束条件', '查询上下文'])
            .flat();
        const dedupedMissing = Array.from(new Set(missingFields));

        return {
            strategy_card: {
                card_type: 'StrategyCard',
                entity_id,
                decision_time_ms: Date.now(),
                next_best_action: {
                    action_type: 'ask',
                    summary: '请先补充实时查询约束（时间/地点/预算），再生成下一步策略',
                    requires_confirmation: false,
                },
                outcomes_distribution: {
                    metrics: [],
                    failure_prob: 0,
                },
                why: {
                    top_reasons: [
                        '请求包含实时信息需求，但当前缺少可验证证据',
                        'Evidence-first 模式下禁止在无证据时给出实时结论',
                        '先补齐约束可显著提升策略可执行性与可信度',
                    ],
                    evidence_refs: [],
                },
                evidence_pack,
                fallback: {
                    type: 'no_evidence',
                    missing_fields: dedupedMissing.length > 0 ? dedupedMissing : ['时间范围', '约束条件'],
                    message: '缺少实时证据，已降级为约束澄清策略',
                },
            },
            explanation_card: {
                headline: '需要补充实时约束后再推演',
                top_reasons: [
                    { text: '当前缺少 EvidencePack，无法安全回答实时问题', source: 'evidence' },
                    { text: '已降级为“先询问约束”的策略，避免幻觉输出', source: 'risk' },
                    { text: '补充时间、地点、预算后可重新计算最优动作', source: 'constraint' },
                ],
                tradeoffs: [],
                risk_notes: ['⚠️ 无证据时不输出实时价格/库存/时效结论'],
                evidence_refs: [],
                constraint_notes: dedupedMissing.length > 0 ? dedupedMissing : ['时间范围', '约束条件'],
                metric_improvements: [],
                alternatives: [],
                why_not_explanations: [],
                sensitivity: [],
                audit_trail: {
                    trace_id: `fallback_${Date.now()}`,
                    timestamp_ms: Date.now(),
                    model_version: 'dtoe-v0.3.0',
                    evidence_item_indices: [],
                    constraint_keys: ['needs_live_data'],
                    parameters_used: { needs_live_data: 1 },
                },
            },
        };
    }

    /**
     * Record outcome and update belief (closed-loop learning)
     */
    recordOutcome(entity_id: string, outcome: OutcomeRecord): void {
        logDtoeEvent('dtoe.outcome_record', {
            entity_id,
            action_id: outcome.action_id,
            outcome_type: outcome.outcome_type,
        });

        // Convert outcome to observation
        const observation: Observation = {
            obs_id: `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            entity_id,
            obs_type: 'explicit_goal_update',
            timestamp_ms: outcome.timestamp_ms,
            source: 'user_input',
            payload: {
                action_id: outcome.action_id,
                outcome_type: outcome.outcome_type,
                actual_utility: outcome.actual_utility,
                confidence: outcome.outcome_type === 'success' ? 0.9 : 0.7,
                ...outcome.observed_state_delta,
            },
        };

        // Update belief from observation first
        const belief = this.getOrCreateBelief(entity_id);
        let updatedBelief = updateBeliefWithEvidence(belief, observation);

        // Then apply calibration (default: EMA, lr=0.1). Failures fall back to belief-updated path.
        let calibrationApplied = false;
        let calibrationMethod: 'ema' | 'bayes_lite' = 'ema';
        try {
            const observedValues: Record<string, number> = {};
            for (const [key, value] of Object.entries(outcome.observed_state_delta ?? {})) {
                if (typeof value === 'number' && Number.isFinite(value)) {
                    observedValues[key] = value;
                }
            }

            const calibrationOutcome = {
                success: outcome.outcome_type === 'success' || outcome.outcome_type === 'partial',
                actual_utility: outcome.actual_utility,
                observed_values: Object.keys(observedValues).length > 0 ? observedValues : undefined,
                notes: outcome.notes,
                timestamp_ms: outcome.timestamp_ms,
            };

            const calibrationPipeline = calibrateAndApply(
                updatedBelief,
                outcome.action_id,
                calibrationOutcome,
                { method: 'ema', lr: 0.1 }
            );

            updatedBelief = calibrationPipeline.belief;
            calibrationApplied = calibrationPipeline.calibration.diagnostics.applied.length > 0;
            calibrationMethod = calibrationPipeline.calibration.diagnostics.method === 'bayes-lite'
                ? 'bayes_lite'
                : 'ema';
        } catch (error) {
            calibrationApplied = false;
            calibrationMethod = 'ema';
        }

        this.calibrationStatus.set(entity_id, {
            calibration_applied: calibrationApplied,
            calibration_method: calibrationMethod,
        });
        this.beliefStores.set(entity_id, updatedBelief);

        logDtoeEvent('dtoe.belief_update', {
            entity_id,
            new_version: updatedBelief.version,
            new_ess: computeESS(updatedBelief.particles),
            calibration_applied: calibrationApplied,
            calibration_method: calibrationMethod,
        });

        // Remove from pending
        const pending = this.pendingActions.get(entity_id) ?? [];
        const filtered = pending.filter((a) => a.action_id !== outcome.action_id);
        this.pendingActions.set(entity_id, filtered);
    }

    /**
     * Get state summary for UI
     */
    getStateSummary(entity_id: string): StateSummary {
        const belief = this.getOrCreateBelief(entity_id);
        const summary = getPosteriorSummary(belief);
        const pending = this.pendingActions.get(entity_id) ?? [];

        return {
            entity_id,
            posterior_mean: summary.mean,
            posterior_std: summary.std,
            belief_ess: computeESS(belief.particles),
            last_update_ms: belief.updated_at_ms,
            pending_actions: pending.map((a) => a.action_id),
            recommendations_count: this.recommendationCounts.get(entity_id) ?? 0,
        };
    }

    /**
     * Manually update belief with observation
     */
    updateBelief(entity_id: string, observation: Observation): void {
        const belief = this.getOrCreateBelief(entity_id);
        const updatedBelief = updateBeliefWithEvidence(belief, observation);
        this.beliefStores.set(entity_id, updatedBelief);

        logDtoeEvent('dtoe.belief_update', {
            entity_id,
            obs_type: observation.obs_type,
            new_version: updatedBelief.version,
        });
    }

    /**
     * Reset belief for entity
     */
    resetBelief(entity_id: string, seed?: number): void {
        const belief = createBeliefState(entity_id, seed ?? Date.now());
        this.beliefStores.set(entity_id, belief);
        this.pendingActions.set(entity_id, []);

        logDtoeEvent('dtoe.belief_reset', { entity_id });
    }

    /**
     * Get all tracked entity IDs
     */
    getTrackedEntities(): string[] {
        return Array.from(this.beliefStores.keys());
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: DestinyEngine | null = null;

export function getDestinyEngine(): DestinyEngine {
    if (!engineInstance) {
        engineInstance = new DestinyEngine();
    }
    return engineInstance;
}

export function resetDestinyEngine(): void {
    engineInstance = null;
}

/**
 * Likelihood Library Tests
 * Phase 3+ PR-02
 * 
 * Tests for observationMapper.ts and likelihoodModels.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    mapEvidencePackToObservation,
    createKeyboardObservation,
    createTaskOutcomeObservation,
    createManualObservation,
    mergeObservations,
    type TwinObservation,
} from '../../services/dtoe/observationMapper';
import {
    computeParticleLikelihood,
    computeBatchLikelihood,
    diagnoseObservation,
    financialLikelihoodModel,
    healthLikelihoodModel,
    sentimentLikelihoodModel,
    taskOutcomeModel,
    DEFAULT_LIKELIHOOD_MODELS,
} from '../../services/dtoe/likelihoodModels';
import type { EvidencePack } from '../../services/dtoe/coreSchemas';
import type { Particle } from '../../services/dtoe/twinBeliefStore';
import { createDefaultTwinState } from '../../services/dtoe/objectiveCompiler';

describe('observationMapper', () => {
    describe('mapEvidencePackToObservation', () => {
        it('should produce consistent structure for different providers', () => {
            const vertexEvidence: EvidencePack = {
                items: [
                    { title: '投资理财', snippet: '收益率上涨10%', url: 'https://example.com', source_name: 'Vertex' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.8,
            };

            const openaiEvidence: EvidencePack = {
                items: [
                    { title: '股市分析', snippet: '大盘下跌5%', url: 'https://example2.com', source_name: 'OpenAI' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'openai_web_search',
                confidence: 0.75,
            };

            const vertexObs = mapEvidencePackToObservation(vertexEvidence, 'financial');
            const openaiObs = mapEvidencePackToObservation(openaiEvidence, 'financial');

            // Both should have same structure
            expect(vertexObs.source).toBe('live_evidence');
            expect(openaiObs.source).toBe('live_evidence');
            expect(vertexObs.signals.length).toBeGreaterThan(0);
            expect(openaiObs.signals.length).toBeGreaterThan(0);
            expect(vertexObs.evidence_refs).toBeDefined();
            expect(openaiObs.evidence_refs).toBeDefined();
        });

        it('should extract financial signals', () => {
            const evidence: EvidencePack = {
                items: [
                    { title: '基金收益', snippet: '今日上涨5%，涨幅超预期', url: 'https://example.com', source_name: 'Test' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.8,
            };

            const obs = mapEvidencePackToObservation(evidence, 'financial');

            const marketSignal = obs.signals.find(s => s.key === 'market_change_pct');
            expect(marketSignal).toBeDefined();
            expect(marketSignal?.value).toBe(5);
        });

        it('should detect sentiment from positive/negative words', () => {
            const positiveEvidence: EvidencePack = {
                items: [
                    { title: '成功', snippet: '项目取得突破性进展，盈利增长', url: 'https://example.com', source_name: 'Test' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.8,
            };

            const negativeEvidence: EvidencePack = {
                items: [
                    { title: '困难', snippet: '面临亏损风险，损失严重', url: 'https://example.com', source_name: 'Test' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.8,
            };

            const posObs = mapEvidencePackToObservation(positiveEvidence);
            const negObs = mapEvidencePackToObservation(negativeEvidence);

            const posSentiment = posObs.signals.find(s => s.key === 'sentiment');
            const negSentiment = negObs.signals.find(s => s.key === 'sentiment');

            expect(posSentiment).toBeDefined();
            expect(negSentiment).toBeDefined();
            expect(posSentiment!.value).toBeGreaterThan(0);
            expect(negSentiment!.value).toBeLessThan(0);
        });

        it('should include evidence_refs with item_index', () => {
            const evidence: EvidencePack = {
                items: [
                    { title: 'Item 1', snippet: 'Content 1', url: 'url1', source_name: 'Source1' },
                    { title: 'Item 2', snippet: 'Content 2', url: 'url2', source_name: 'Source2' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.8,
            };

            const obs = mapEvidencePackToObservation(evidence);

            expect(obs.evidence_refs).toBeDefined();
            expect(obs.evidence_refs!.length).toBeGreaterThanOrEqual(2);
            expect(obs.evidence_refs!.some(r => r.item_index === 0)).toBe(true);
            expect(obs.evidence_refs!.some(r => r.item_index === 1)).toBe(true);
        });

        it('should include meta signals (count, freshness, confidence)', () => {
            const evidence: EvidencePack = {
                items: [
                    { title: 'Test', snippet: 'Test', url: 'url', source_name: 'Test' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.85,
            };

            const obs = mapEvidencePackToObservation(evidence);

            expect(obs.signals.find(s => s.key === 'evidence_count')?.value).toBe(1);
            expect(obs.signals.find(s => s.key === 'provider_confidence')?.value).toBe(0.85);
            expect(obs.signals.find(s => s.key === 'evidence_freshness')).toBeDefined();
        });

        it('should extract education signals', () => {
            const evidence: EvidencePack = {
                items: [
                    { title: '学习进度', snippet: '本周学习12小时，考试成绩95分', url: 'https://example.com', source_name: 'Edu' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.9,
            };

            const obs = mapEvidencePackToObservation(evidence, 'education');
            expect(obs.signals.find(s => s.key === 'learning_mentioned')?.value).toBe(1);
            expect(obs.signals.find(s => s.key === 'study_hours')?.value).toBe(12);
            expect(obs.signals.find(s => s.key === 'exam_score')?.value).toBe(95);
        });

        it('should infer and extract family signals', () => {
            const evidence: EvidencePack = {
                items: [
                    { title: '家庭事务', snippet: '家人突发住院，家庭需要紧急支持', url: 'https://example.com', source_name: 'Family' },
                ],
                fetched_at_ms: Date.now(),
                ttl_seconds: 300,
                provider: 'vertex_grounding',
                confidence: 0.8,
            };

            const obs = mapEvidencePackToObservation(evidence);
            expect(obs.signals.find(s => s.key === 'family_load')?.value).toBe(1);
            expect(obs.signals.find(s => s.key === 'family_emergency_risk')?.value).toBe(1);
            expect(obs.signals.find(s => s.key === 'family_support_signal')?.value).toBe(1);
        });
    });

    describe('createTaskOutcomeObservation', () => {
        it('should create observation with success signal', () => {
            const obs = createTaskOutcomeObservation('action_123', true);

            expect(obs.source).toBe('task_outcome');
            expect(obs.signals.find(s => s.key === 'task_success')?.value).toBe(1);
        });

        it('should include metric signals when provided', () => {
            const obs = createTaskOutcomeObservation('action_123', true, {
                time_spent: 2.5,
                money_saved: 100,
            });

            expect(obs.signals.find(s => s.key === 'outcome_time_spent')?.value).toBe(2.5);
            expect(obs.signals.find(s => s.key === 'outcome_money_saved')?.value).toBe(100);
        });
    });

    describe('mergeObservations', () => {
        it('should take max confidence per key', () => {
            const obs1: TwinObservation = {
                obs_id: 'obs1',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'test', value: 1, confidence: 0.5 }],
            };

            const obs2: TwinObservation = {
                obs_id: 'obs2',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'test', value: 2, confidence: 0.9 }],
            };

            const merged = mergeObservations([obs1, obs2]);
            const testSignal = merged.signals.find(s => s.key === 'test');

            expect(testSignal?.value).toBe(2);  // Higher confidence wins
            expect(testSignal?.confidence).toBe(0.9);
        });
    });
});

describe('likelihoodModels', () => {
    let baseState: ReturnType<typeof createDefaultTwinState>;
    let baseParticle: Particle;

    beforeEach(() => {
        baseState = createDefaultTwinState('test_user');
        baseParticle = {
            state: baseState,
            weight: 1,
            params: {
                income_growth: 0.03,
                market_return_mu: 0.07,
                market_return_sigma: 0.15,
                health_recovery: 0.1,
                stress_sensitivity: 0.5,
                execution_adherence: 0.7,
                shock_frequency: 0.1,
                shock_severity: 0.3,
            },
        };
    });

    describe('computeParticleLikelihood', () => {
        it('should return positive likelihood for any observation', () => {
            const obs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'sentiment', value: 0.5, confidence: 0.8 }],
            };

            const ll = computeParticleLikelihood(baseParticle, obs);
            expect(ll).toBeGreaterThan(0);
        });

        it('should return higher likelihood when state matches observation', () => {
            // Rich state
            const richParticle: Particle = {
                ...baseParticle,
                state: {
                    ...baseState,
                    resources: { ...baseState.resources, cash_liquid: 100000, monthly_cashflow: 10000 },
                },
            };

            // Poor state
            const poorParticle: Particle = {
                ...baseParticle,
                state: {
                    ...baseState,
                    resources: { ...baseState.resources, cash_liquid: 1000, monthly_cashflow: -500 },
                },
            };

            // Positive financial observation
            const positiveObs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'sentiment', value: 0.8, confidence: 0.9 }],
            };

            const richLL = computeParticleLikelihood(richParticle, positiveObs);
            const poorLL = computeParticleLikelihood(poorParticle, positiveObs);

            // Rich state should have higher likelihood for positive sentiment
            expect(richLL).toBeGreaterThan(poorLL);
        });
    });

    describe('computeBatchLikelihood', () => {
        it('should return likelihood for all particles', () => {
            const particles = [baseParticle, baseParticle, baseParticle];
            const obs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'sentiment', value: 0, confidence: 0.5 }],
            };

            const likelihoods = computeBatchLikelihood(particles, obs);

            expect(likelihoods).toHaveLength(3);
            expect(likelihoods.every(l => l > 0)).toBe(true);
        });
    });

    describe('posterior shift direction', () => {
        it('should favor high-wealth particles for positive financial observation', () => {
            const lowWealthParticle: Particle = {
                ...baseParticle,
                state: {
                    ...baseState,
                    resources: { ...baseState.resources, cash_liquid: 500 },
                },
            };

            const highWealthParticle: Particle = {
                ...baseParticle,
                state: {
                    ...baseState,
                    resources: { ...baseState.resources, cash_liquid: 50000 },
                },
            };

            // Observation indicating wealth
            const wealthObs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [
                    { key: 'sentiment', value: 0.9, confidence: 0.8 },
                ],
            };

            const lowLL = computeParticleLikelihood(lowWealthParticle, wealthObs);
            const highLL = computeParticleLikelihood(highWealthParticle, wealthObs);

            expect(highLL).toBeGreaterThan(lowLL);
        });

        it('should favor reliable particles for successful task outcome', () => {
            const unreliableParticle: Particle = {
                ...baseParticle,
                state: {
                    ...baseState,
                    capabilities: { ...baseState.capabilities, execution_reliability: 0.3 },
                },
            };

            const reliableParticle: Particle = {
                ...baseParticle,
                state: {
                    ...baseState,
                    capabilities: { ...baseState.capabilities, execution_reliability: 0.95 },
                },
            };

            const successObs = createTaskOutcomeObservation('action_1', true);

            const unreliableLL = computeParticleLikelihood(unreliableParticle, successObs);
            const reliableLL = computeParticleLikelihood(reliableParticle, successObs);

            expect(reliableLL).toBeGreaterThan(unreliableLL);
        });
    });

    describe('diagnoseObservation', () => {
        it('should identify which models support an observation', () => {
            const financialObs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'market_change_pct', value: 5, confidence: 0.8 }],
            };

            const diagnosis = diagnoseObservation(financialObs);

            const financialModel = diagnosis.find(d => d.model_id === 'financial_v1');
            expect(financialModel?.supports).toBe(true);
        });

        it('should identify task outcome model', () => {
            const outcomeObs = createTaskOutcomeObservation('action_1', true);
            const diagnosis = diagnoseObservation(outcomeObs);

            const outcomeModel = diagnosis.find(d => d.model_id === 'task_outcome_v1');
            expect(outcomeModel?.supports).toBe(true);
        });
    });

    describe('individual models', () => {
        it('financialLikelihoodModel should support financial signals', () => {
            const obs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'price_mention', value: 10000, confidence: 0.7 }],
            };

            expect(financialLikelihoodModel.supports(obs)).toBe(true);
        });

        it('healthLikelihoodModel should support health signals', () => {
            const obs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'exercise_mentioned', value: 1, confidence: 0.6 }],
            };

            expect(healthLikelihoodModel.supports(obs)).toBe(true);
        });

        it('sentimentLikelihoodModel should support sentiment signal', () => {
            const obs: TwinObservation = {
                obs_id: 'test',
                source: 'live_evidence',
                timestamp_ms: Date.now(),
                signals: [{ key: 'sentiment', value: 0.5, confidence: 0.5 }],
            };

            expect(sentimentLikelihoodModel.supports(obs)).toBe(true);
        });
    });
});

/**
 * StrategyCard Tests - Phase 3 v0.1
 * Tests for strategy card generation and formatting
 */

import { describe, it, expect } from 'vitest';
import {
    buildStrategyCard,
    createFallback,
    formatStrategyCardForUI,
} from '../../services/dtoe/strategyCard';
import { validateStrategyCard } from '../../services/dtoe/schemaValidators';
import { evaluateActions } from '../../services/dtoe/monteCarloEvaluator';
import {
    createDefaultTwinState,
    createDefaultGoalStack,
    generateId,
} from '../../services/dtoe/coreSchemas';
import type { EvidencePack, Action } from '../../services/dtoe/coreSchemas';

// ============================================================================
// StrategyCard Building Tests
// ============================================================================

describe('StrategyCard Building', () => {
    const state = createDefaultTwinState({
        entity_id: 'user_001',
        entity_type: 'person',
        display_name: 'Test User',
    });

    const goals = createDefaultGoalStack('user_001');

    it('should build a valid StrategyCard', () => {
        const result = evaluateActions(state, goals, {
            n_scenarios: 100,
            horizon: 2,
        });

        const evidence: EvidencePack = {
            items: [
                { title: 'Test', snippet: 'Snippet', url: 'https://example.com', source_name: 'example.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: result.best_action,
            ranked_scores: result.ranked,
            evidence_pack: evidence,
            needs_live_data: false,
        });

        const validation = validateStrategyCard(card);
        expect(validation.valid).toBe(true);
    });

    it('should include outcomes_distribution with metrics', () => {
        const result = evaluateActions(state, goals, {
            n_scenarios: 100,
            horizon: 2,
        });

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: result.best_action,
            ranked_scores: result.ranked,
            evidence_pack: null,
            needs_live_data: false,
        });

        expect(card.outcomes_distribution).toBeDefined();
        expect(card.outcomes_distribution.metrics.length).toBeGreaterThan(0);
        expect(typeof card.outcomes_distribution.failure_prob).toBe('number');

        const metric = card.outcomes_distribution.metrics[0];
        expect(typeof metric.p50).toBe('number');
        expect(typeof metric.p90).toBe('number');
    });

    it('should include why with top_reasons and evidence_refs', () => {
        const evidence: EvidencePack = {
            items: [
                { title: 'A', snippet: 'a', url: 'https://a.com', source_name: 'a.com' },
                { title: 'B', snippet: 'b', url: 'https://b.com', source_name: 'b.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const result = evaluateActions(state, goals, {
            n_scenarios: 100,
            horizon: 2,
        });

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: result.best_action,
            ranked_scores: result.ranked,
            evidence_pack: evidence,
            needs_live_data: false,
        });

        expect(card.why.top_reasons.length).toBeGreaterThan(0);
        expect(card.why.evidence_refs.length).toBeLessThanOrEqual(evidence.items.length);
    });
});

// ============================================================================
// Fallback Tests
// ============================================================================

describe('StrategyCard Fallback', () => {
    it('should create fallback when needs_live_data but no evidence', () => {
        const action: Action = {
            action_id: generateId('act'),
            action_type: 'ask',
            summary: 'Request more info',
            cost: {},
            reversibility: 'reversible',
        };

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: action,
            ranked_scores: [{
                action,
                mean: 0.5,
                std: 0.1,
                p50: 0.5,
                p90: 0.6,
                cvar_90: 0.3,
                failure_prob: 0.1,
                score: 0.45,
            }],
            evidence_pack: null,
            needs_live_data: true,
        });

        expect(card.fallback).not.toBeNull();
        expect(card.fallback?.type).toBe('no_evidence');
    });

    it('should create fallback when evidence is empty', () => {
        const action: Action = {
            action_id: generateId('act'),
            action_type: 'wait',
            summary: 'Wait',
            cost: {},
            reversibility: 'reversible',
        };

        const emptyEvidence: EvidencePack = {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0,
        };

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: action,
            ranked_scores: [{
                action,
                mean: 0.5,
                std: 0.1,
                p50: 0.5,
                p90: 0.6,
                cvar_90: 0.3,
                failure_prob: 0.05,
                score: 0.48,
            }],
            evidence_pack: emptyEvidence,
            needs_live_data: true,
        });

        expect(card.fallback).not.toBeNull();
        expect(card.fallback?.type).toBe('no_evidence');
    });

    it('should have no fallback when evidence is present', () => {
        const action: Action = {
            action_id: generateId('act'),
            action_type: 'do',
            summary: 'Execute',
            cost: { time_hours: 1 },
            reversibility: 'partially_reversible',
        };

        const evidence: EvidencePack = {
            items: [
                { title: 'Result', snippet: 'Info', url: 'https://example.com', source_name: 'example.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: action,
            ranked_scores: [{
                action,
                mean: 0.6,
                std: 0.1,
                p50: 0.6,
                p90: 0.7,
                cvar_90: 0.4,
                failure_prob: 0.08,
                score: 0.52,
            }],
            evidence_pack: evidence,
            needs_live_data: true,
        });

        expect(card.fallback).toBeNull();
    });
});

// ============================================================================
// Fallback Helper Tests
// ============================================================================

describe('createFallback', () => {
    it('should create no_evidence fallback', () => {
        const fallback = createFallback({
            reason: 'no_evidence',
        });

        expect(fallback.type).toBe('no_evidence');
        expect(fallback.message).toBeDefined();
    });

    it('should create missing_constraints fallback with fields', () => {
        const fallback = createFallback({
            reason: 'missing_constraints',
            missing_fields: ['出发城市', '日期'],
        });

        expect(fallback.type).toBe('missing_constraints');
        expect(fallback.missing_fields).toContain('出发城市');
        expect(fallback.missing_fields).toContain('日期');
    });

    it('should use custom message if provided', () => {
        const fallback = createFallback({
            reason: 'risk_violation',
            message: '自定义消息',
        });

        expect(fallback.message).toBe('自定义消息');
    });
});

// ============================================================================
// UI Formatting Tests
// ============================================================================

describe('formatStrategyCardForUI', () => {
    it('should format card for UI display', () => {
        const state = createDefaultTwinState({
            entity_id: 'user_001',
            entity_type: 'person',
            display_name: 'Test User',
        });

        const result = evaluateActions(state, createDefaultGoalStack('user_001'), {
            n_scenarios: 100,
            horizon: 2,
        });

        const card = buildStrategyCard({
            entity_id: 'user_001',
            best_action: result.best_action,
            ranked_scores: result.ranked,
            evidence_pack: null,
            needs_live_data: false,
        });

        const ui = formatStrategyCardForUI(card);

        expect(ui.headline).toBeDefined();
        expect(ui.summary).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(ui.risk_level);
        expect(ui.action_label).toBeDefined();
    });

    it('should assign correct risk levels', () => {
        const action: Action = {
            action_id: generateId('act'),
            action_type: 'wait',
            summary: 'Wait',
            cost: {},
            reversibility: 'reversible',
        };

        // Low risk
        const lowRiskCard = buildStrategyCard({
            entity_id: 'user_001',
            best_action: action,
            ranked_scores: [{
                action,
                mean: 0.5,
                std: 0.1,
                p50: 0.5,
                p90: 0.6,
                cvar_90: 0.3,
                failure_prob: 0.02,  // < 5%
                score: 0.48,
            }],
            evidence_pack: null,
            needs_live_data: false,
        });

        expect(formatStrategyCardForUI(lowRiskCard).risk_level).toBe('low');

        // High risk
        const highRiskCard = buildStrategyCard({
            entity_id: 'user_001',
            best_action: action,
            ranked_scores: [{
                action,
                mean: 0.5,
                std: 0.1,
                p50: 0.5,
                p90: 0.6,
                cvar_90: 0.3,
                failure_prob: 0.20,  // > 15%
                score: 0.48,
            }],
            evidence_pack: null,
            needs_live_data: false,
        });

        expect(formatStrategyCardForUI(highRiskCard).risk_level).toBe('high');
    });
});

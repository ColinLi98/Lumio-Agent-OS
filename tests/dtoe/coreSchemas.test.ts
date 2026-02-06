/**
 * Core Schemas Tests - Phase 3 v0.1
 * Tests for DTOE schema validation
 */

import { describe, it, expect } from 'vitest';
import {
    validateTwinState,
    validateObservation,
    validateAction,
    validateGoalStack,
    validateEvidencePack,
    validateStrategyCard,
    validateEvidenceGate,
    isEvidenceFresh,
} from '../../services/dtoe/schemaValidators';
import {
    createDefaultTwinState,
    createDefaultGoalStack,
    generateId,
} from '../../services/dtoe/coreSchemas';
import type {
    TwinState,
    Observation,
    Action,
    GoalStack,
    EvidencePack,
    StrategyCard,
} from '../../services/dtoe/coreSchemas';

// ============================================================================
// TwinState Tests
// ============================================================================

describe('TwinState Validation', () => {
    it('should validate a correct TwinState', () => {
        const state = createDefaultTwinState({
            entity_id: 'user_001',
            entity_type: 'person',
            display_name: 'Test User',
        });

        const result = validateTwinState(state);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing entity', () => {
        const state = {
            timestamp_ms: Date.now(),
            resources: {},
            constraints: { hard: {} },
            preferences: {},
            uncertainty: { variables: [] },
            trust: { confidence: 0.5, last_verified_ms: Date.now(), sources: [] },
        };

        const result = validateTwinState(state);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('entity is required and must be an object');
    });

    it('should fail for invalid entity_type', () => {
        const state = createDefaultTwinState({
            entity_id: 'user_001',
            entity_type: 'invalid_type' as any,
            display_name: 'Test User',
        });

        const result = validateTwinState(state);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('entity_type'))).toBe(true);
    });

    it('should fail for trust.confidence out of range', () => {
        const state = createDefaultTwinState({
            entity_id: 'user_001',
            entity_type: 'person',
            display_name: 'Test User',
        });
        state.trust.confidence = 1.5;

        const result = validateTwinState(state);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('confidence'))).toBe(true);
    });
});

// ============================================================================
// Observation Tests
// ============================================================================

describe('Observation Validation', () => {
    it('should validate a correct Observation', () => {
        const obs: Observation = {
            obs_id: generateId('obs'),
            entity_id: 'user_001',
            obs_type: 'keyboard_signal',
            payload: { text: 'hello' },
            timestamp_ms: Date.now(),
        };

        const result = validateObservation(obs);
        expect(result.valid).toBe(true);
    });

    it('should fail for invalid obs_type', () => {
        const obs = {
            obs_id: generateId('obs'),
            entity_id: 'user_001',
            obs_type: 'invalid_type',
            payload: {},
            timestamp_ms: Date.now(),
        };

        const result = validateObservation(obs);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('obs_type'))).toBe(true);
    });
});

// ============================================================================
// Action Tests
// ============================================================================

describe('Action Validation', () => {
    it('should validate a correct Action', () => {
        const action: Action = {
            action_id: generateId('act'),
            action_type: 'wait',
            summary: 'Wait for more information',
            cost: { time_hours: 1 },
            reversibility: 'reversible',
        };

        const result = validateAction(action);
        expect(result.valid).toBe(true);
    });

    it('should fail for missing action_type', () => {
        const action = {
            action_id: generateId('act'),
            summary: 'Do something',
            cost: {},
            reversibility: 'reversible',
        };

        const result = validateAction(action);
        expect(result.valid).toBe(false);
    });

    it('should validate all action types', () => {
        const types = ['do', 'ask', 'wait', 'commit'] as const;

        for (const type of types) {
            const action: Action = {
                action_id: generateId('act'),
                action_type: type,
                summary: `Action type: ${type}`,
                cost: {},
                reversibility: 'reversible',
            };

            const result = validateAction(action);
            expect(result.valid).toBe(true);
        }
    });
});

// ============================================================================
// GoalStack Tests
// ============================================================================

describe('GoalStack Validation', () => {
    it('should validate a correct GoalStack', () => {
        const goals = createDefaultGoalStack('user_001');

        const result = validateGoalStack(goals);
        expect(result.valid).toBe(true);
    });

    it('should fail for empty objectives', () => {
        const goals: GoalStack = {
            entity_id: 'user_001',
            horizon_days: 365,
            objectives: [],
            hard_constraints: {},
        };

        const result = validateGoalStack(goals);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('objectives'))).toBe(true);
    });

    it('should fail for horizon_days out of range', () => {
        const goals = createDefaultGoalStack('user_001');
        goals.horizon_days = 5;  // Less than 7

        const result = validateGoalStack(goals);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('horizon_days'))).toBe(true);
    });
});

// ============================================================================
// EvidencePack Tests
// ============================================================================

describe('EvidencePack Validation', () => {
    it('should validate a correct EvidencePack', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Result 1', snippet: 'Snippet', url: 'https://example.com', source_name: 'example.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const result = validateEvidencePack(pack);
        expect(result.valid).toBe(true);
    });

    it('should fail for invalid provider', () => {
        const pack = {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'invalid_provider',
            confidence: 0.5,
        };

        const result = validateEvidencePack(pack);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('provider'))).toBe(true);
    });

    it('should fail for confidence out of range', () => {
        const pack: EvidencePack = {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 1.5,
        };

        const result = validateEvidencePack(pack);
        expect(result.valid).toBe(false);
    });
});

// ============================================================================
// P0 Evidence Gate Tests
// ============================================================================

describe('P0 Evidence Gate', () => {
    it('should pass when needs_live_data=false', () => {
        const result = validateEvidenceGate(false, null);
        expect(result.valid).toBe(true);
    });

    it('should fail when needs_live_data=true and evidence is null', () => {
        const result = validateEvidenceGate(true, null);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('P0 VIOLATION');
    });

    it('should fail when needs_live_data=true and evidence.items is empty', () => {
        const pack: EvidencePack = {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0,
        };

        const result = validateEvidenceGate(true, pack);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('items is empty');
    });

    it('should pass when needs_live_data=true and evidence has items', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Result', snippet: 'Test', url: 'https://example.com', source_name: 'example.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const result = validateEvidenceGate(true, pack);
        expect(result.valid).toBe(true);
    });
});

// ============================================================================
// Evidence Freshness Tests
// ============================================================================

describe('Evidence Freshness', () => {
    it('should return true for fresh evidence', () => {
        const pack: EvidencePack = {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.5,
        };

        expect(isEvidenceFresh(pack)).toBe(true);
    });

    it('should return false for stale evidence', () => {
        const pack: EvidencePack = {
            items: [],
            fetched_at_ms: Date.now() - 200 * 1000,  // 200 seconds ago
            ttl_seconds: 120,  // 120 second TTL
            provider: 'vertex_grounding',
            confidence: 0.5,
        };

        expect(isEvidenceFresh(pack)).toBe(false);
    });
});

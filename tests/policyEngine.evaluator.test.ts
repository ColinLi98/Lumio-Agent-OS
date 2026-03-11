import { describe, expect, it } from 'vitest';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';

describe('PolicyEngine v0.1', () => {
    const engine = new PolicyEngine();

    it('requires approval for PII egress to market', () => {
        const decision = engine.evaluate({
            phase: 'CAPSULE',
            data: {
                egress_target: 'market',
                contains_pii: true,
            },
            user: {
                privacy_level: 'low',
            },
        });

        expect(decision.action).toBe('REQUIRE_APPROVAL');
    });

    it('requires approval for external send', () => {
        const decision = engine.evaluate({
            phase: 'PRE_TOOL',
            tool: {
                category: 'communication',
                side_effect: 'send',
            },
        });

        expect(decision.action).toBe('REQUIRE_APPROVAL');
    });

    it('allows draft invite with limits when permission is granted', () => {
        const decision = engine.evaluate({
            phase: 'PRE_TOOL',
            tool: {
                name: 'email.draft_invite',
                category: 'communication',
                side_effect: 'draft',
            },
            permissions: {
                email_write_draft: true,
            },
        });

        expect(decision.action).toBe('ALLOW_WITH_LIMITS');
        expect(decision.constraints?.force_draft_only).toBe(true);
    });

    it('denies payment actions in v0.1', () => {
        const decision = engine.evaluate({
            phase: 'PRE_TOOL',
            tool: {
                category: 'payment',
                side_effect: 'payment',
            },
        });

        expect(decision.action).toBe('DENY');
    });

    it('downgrades when budget is exhausted', () => {
        const decision = engine.evaluate({
            phase: 'PRE_NODE',
            budget: {
                tool_calls_left: 0,
                latency_left_ms: 100,
            },
        });

        expect(decision.action).toBe('DOWNGRADE');
    });
});

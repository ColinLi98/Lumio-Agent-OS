import { describe, expect, it } from 'vitest';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';
import { evaluatePolicyParity, type PolicyParityCase } from '../services/policy-engine/parityHarness.js';

const parityCases: PolicyParityCase[] = [
    {
        id: 'payment_deny',
        context: {
            phase: 'PRE_TOOL',
            tool: {
                category: 'payment',
                side_effect: 'payment',
            },
        },
    },
    {
        id: 'send_requires_approval',
        context: {
            phase: 'PRE_TOOL',
            tool: {
                category: 'communication',
                side_effect: 'send',
            },
        },
    },
    {
        id: 'draft_allowed',
        context: {
            phase: 'PRE_TOOL',
            tool: {
                name: 'email.draft_invite',
                category: 'communication',
                side_effect: 'draft',
            },
            permissions: {
                email_write_draft: true,
            },
        },
    },
];

describe('policy parity harness', () => {
    it('reports zero drift for identical rule packs', () => {
        const left = new PolicyEngine();
        const right = new PolicyEngine();
        const report = evaluatePolicyParity(left, right, parityCases);

        expect(report.total).toBe(parityCases.length);
        expect(report.mismatches).toBe(0);
        expect(report.mismatch_rate).toBe(0);
        expect(report.left_version).toBe(report.right_version);
    });

    it('reports drift when rule packs differ', () => {
        const left = new PolicyEngine();
        const right = new PolicyEngine({
            version: 'test-drift',
            defaults: {
                action: 'ALLOW',
                log_level: 'MINIMAL',
            },
            rules: [],
        });

        const report = evaluatePolicyParity(left, right, parityCases);
        expect(report.total).toBe(parityCases.length);
        expect(report.mismatches).toBeGreaterThan(0);
        expect(report.mismatch_rate).toBeGreaterThan(0);
        expect(report.left_version).not.toBe(report.right_version);
    });
});


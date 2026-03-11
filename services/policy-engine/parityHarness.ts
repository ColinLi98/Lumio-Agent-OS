import type { PolicyContext, PolicyDecision } from './types.js';
import { PolicyEngine } from './evaluator.js';

export interface PolicyParityCase {
    id: string;
    context: PolicyContext;
}

export interface PolicyParityMismatch {
    id: string;
    action_left: PolicyDecision['action'];
    action_right: PolicyDecision['action'];
    matched_rule_left?: string;
    matched_rule_right?: string;
}

export interface PolicyParityReport {
    total: number;
    mismatches: number;
    mismatch_rate: number;
    left_version: string;
    right_version: string;
    left_fingerprint: string;
    right_fingerprint: string;
    details: PolicyParityMismatch[];
}

export function evaluatePolicyParity(
    left: PolicyEngine,
    right: PolicyEngine,
    cases: PolicyParityCase[]
): PolicyParityReport {
    const details: PolicyParityMismatch[] = [];

    for (const testCase of cases) {
        const leftDecision = left.evaluate(testCase.context);
        const rightDecision = right.evaluate(testCase.context);
        if (leftDecision.action === rightDecision.action) continue;
        details.push({
            id: testCase.id,
            action_left: leftDecision.action,
            action_right: rightDecision.action,
            matched_rule_left: leftDecision.matched_rule_id,
            matched_rule_right: rightDecision.matched_rule_id,
        });
    }

    const total = cases.length;
    const mismatches = details.length;

    return {
        total,
        mismatches,
        mismatch_rate: total > 0 ? mismatches / total : 0,
        left_version: left.version(),
        right_version: right.version(),
        left_fingerprint: left.fingerprint(),
        right_fingerprint: right.fingerprint(),
        details,
    };
}


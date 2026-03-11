import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';
import { evaluatePolicyParity, type PolicyParityCase } from '../services/policy-engine/parityHarness.js';
import type { PolicyAction, PolicyContext, PolicyRulePack } from '../services/policy-engine/types.js';

interface SnapshotCase {
    id: string;
    context: PolicyContext;
    expected_action: PolicyAction;
}

function resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) return inputPath;
    const thisFile = fileURLToPath(import.meta.url);
    const repoRoot = path.resolve(path.dirname(thisFile), '..');
    return path.resolve(repoRoot, inputPath);
}

function readJsonFile<T>(targetPath: string): T {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(raw) as T;
}

function mismatchRate(mismatches: number, total: number): number {
    return total > 0 ? mismatches / total : 0;
}

function runSnapshotCheck(engine: PolicyEngine, cases: SnapshotCase[]): {
    total: number;
    mismatches: number;
    rate: number;
} {
    let mismatches = 0;
    for (const testCase of cases) {
        const decision = engine.evaluate(testCase.context);
        if (decision.action !== testCase.expected_action) mismatches += 1;
    }
    return {
        total: cases.length,
        mismatches,
        rate: mismatchRate(mismatches, cases.length),
    };
}

function main(): void {
    const maxMismatchRate = Number(process.env.POLICY_PARITY_MAX_MISMATCH_RATE || '0.01');
    const casesPath = resolvePath(
        process.env.POLICY_PARITY_CASES_PATH
        || 'services/policy-engine/rules/parity_cases.v0_1.json'
    );
    const candidateRulePackPathRaw = String(process.env.POLICY_PARITY_RULEPACK_PATH || '').trim();

    const cases = readJsonFile<SnapshotCase[]>(casesPath);
    const baselineEngine = new PolicyEngine();
    const baselineVersion = baselineEngine.version();
    const baselineFingerprint = baselineEngine.fingerprint();

    if (candidateRulePackPathRaw) {
        const candidateRulePackPath = resolvePath(candidateRulePackPathRaw);
        const candidateRulePack = readJsonFile<PolicyRulePack>(candidateRulePackPath);
        const candidateEngine = new PolicyEngine(candidateRulePack);
        const parityCases: PolicyParityCase[] = cases.map((testCase) => ({
            id: testCase.id,
            context: testCase.context,
        }));

        const report = evaluatePolicyParity(baselineEngine, candidateEngine, parityCases);
        console.log(
            `[policy-parity] mode=engine-compare baseline=${report.left_version}/${report.left_fingerprint} `
            + `candidate=${report.right_version}/${report.right_fingerprint} `
            + `total=${report.total} mismatches=${report.mismatches} mismatch_rate=${(report.mismatch_rate * 100).toFixed(2)}% `
            + `threshold=${(maxMismatchRate * 100).toFixed(2)}%`
        );
        if (report.mismatch_rate > maxMismatchRate) {
            const sample = report.details.slice(0, 5).map((item) => `${item.id}:${item.action_left}->${item.action_right}`);
            throw new Error(
                `Policy parity mismatch rate ${(report.mismatch_rate * 100).toFixed(2)}% exceeds threshold `
                + `${(maxMismatchRate * 100).toFixed(2)}%. Samples=${sample.join(', ')}`
            );
        }
        return;
    }

    const snapshot = runSnapshotCheck(baselineEngine, cases);
    console.log(
        `[policy-parity] mode=snapshot baseline=${baselineVersion}/${baselineFingerprint} `
        + `total=${snapshot.total} mismatches=${snapshot.mismatches} mismatch_rate=${(snapshot.rate * 100).toFixed(2)}% `
        + `threshold=${(maxMismatchRate * 100).toFixed(2)}%`
    );
    if (snapshot.rate > maxMismatchRate) {
        throw new Error(
            `Policy snapshot mismatch rate ${(snapshot.rate * 100).toFixed(2)}% exceeds threshold `
            + `${(maxMismatchRate * 100).toFixed(2)}%`
        );
    }
}

try {
    main();
} catch (error) {
    console.error('[policy-parity] check failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}


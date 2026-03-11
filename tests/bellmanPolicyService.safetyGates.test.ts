import { describe, expect, it } from 'vitest';
import { evaluateBellmanSafetyGates, runBellmanPolicy, type BellmanContext } from '../services/bellmanPolicyService';

function baseContext(): BellmanContext {
  return {
    hasCandidates: true,
    candidateCount: 4,
    averageScore: 82,
    missingFields: [],
    goalType: 'generic',
    safety: {
      dataIntegrityPassed: true,
      constraintsCompliant: true,
      riskCostDelta: 0.18,
      approvedRiskCostDelta: 0.35,
      stabilityScore: 0.81,
      minStabilityScore: 0.55,
      hasRollbackTarget: true,
      hasRollbackPlaybook: true,
      policyVersion: 'bellman_v2',
      previousPolicyVersion: 'bellman_v1',
    },
  };
}

describe('Bellman safety gates', () => {
  it('blocks promotion when risk cost delta exceeds threshold', () => {
    const trace = runBellmanPolicy({
      ...baseContext(),
      safety: {
        ...baseContext().safety,
        mode: 'promotion',
        riskCostDelta: 0.62,
        approvedRiskCostDelta: 0.35,
      },
    });

    expect(trace.policyStatus).toBe('blocked');
    expect(trace.bestAction).toBe('ASK_CLARIFY');
    expect(trace.safety?.failedGates).toContain('B3_RISK_BUDGET');

    const gate = trace.safety?.gates.find((item) => item.gate === 'B3_RISK_BUDGET');
    expect(gate?.decision).toBe('blocked');
    expect(gate?.blocking).toBe(true);
  });

  it('blocks promotion when rollback readiness is missing', () => {
    const trace = runBellmanPolicy({
      ...baseContext(),
      safety: {
        ...baseContext().safety,
        mode: 'promotion',
        hasRollbackTarget: false,
        hasRollbackPlaybook: true,
      },
    });

    expect(trace.policyStatus).toBe('blocked');
    expect(trace.safety?.failedGates).toContain('B5_ROLLBACK_READY');

    const gate = trace.safety?.gates.find((item) => item.gate === 'B5_ROLLBACK_READY');
    expect(gate?.decision).toBe('blocked');
  });

  it('keeps runtime inference in advisory mode when gates fail', () => {
    const trace = runBellmanPolicy({
      ...baseContext(),
      safety: {
        ...baseContext().safety,
        mode: 'runtime_inference',
        dataIntegrityPassed: false,
        constraintsCompliant: false,
        riskCostDelta: 0.78,
        approvedRiskCostDelta: 0.35,
        stabilityScore: 0.21,
        minStabilityScore: 0.55,
      },
    });

    expect(trace.policyStatus).toBe('advisory');
    expect(trace.bestAction).toBe('RECOMMEND_BEST');
    expect(trace.safety?.failedGates.length).toBeGreaterThan(0);
    expect(trace.safety?.gates.some((gate) => gate.decision === 'advisory')).toBe(true);
  });

  it('returns ready when all B-gates pass', () => {
    const snapshot = evaluateBellmanSafetyGates({
      ...baseContext(),
      safety: {
        ...baseContext().safety,
        mode: 'promotion',
      },
    });

    expect(snapshot.status).toBe('ready');
    expect(snapshot.failedGates).toHaveLength(0);
    expect(snapshot.gates.every((gate) => gate.decision === 'passed')).toBe(true);
  });
});

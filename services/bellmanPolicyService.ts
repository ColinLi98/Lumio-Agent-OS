import {
    BellmanDecisionAction,
    BellmanDecisionState,
    BellmanPolicyTrace,
    BellmanSafetyGateId,
    BellmanSafetyGateResult,
    BellmanSafetyMode,
    BellmanSafetySnapshot,
    SoulMatrix
} from '../types.js';

export type BellmanContext = {
    hasCandidates: boolean;
    candidateCount: number;
    averageScore: number;
    missingFields: string[];
    riskTolerance?: SoulMatrix['riskTolerance'];
    privacyLevel?: SoulMatrix['privacyLevel'];
    goalType?: 'dining' | 'travel' | 'shopping' | 'generic';
    safety?: {
        mode?: BellmanSafetyMode;
        dataIntegrityPassed?: boolean;
        constraintsCompliant?: boolean;
        riskCostDelta?: number;
        approvedRiskCostDelta?: number;
        stabilityScore?: number;
        minStabilityScore?: number;
        hasRollbackTarget?: boolean;
        hasRollbackPlaybook?: boolean;
        policyVersion?: string;
        previousPolicyVersion?: string;
    };
};

type Transition = {
    nextState: BellmanDecisionState;
    probability: number;
};

const STATES: BellmanDecisionState[] = ['NO_CONTEXT', 'PARTIAL_CONTEXT', 'UNCERTAIN', 'READY', 'DONE'];

const ACTIONS: Record<BellmanDecisionState, BellmanDecisionAction[]> = {
    NO_CONTEXT: ['ASK_CLARIFY', 'EXPAND_SEARCH', 'RECOMMEND_BEST'],
    PARTIAL_CONTEXT: ['ASK_CLARIFY', 'EXPAND_SEARCH', 'PROVIDE_ALTERNATIVES', 'RECOMMEND_BEST'],
    UNCERTAIN: ['ASK_CLARIFY', 'EXPAND_SEARCH', 'PROVIDE_ALTERNATIVES', 'RECOMMEND_BEST'],
    READY: ['RECOMMEND_BEST', 'PROVIDE_ALTERNATIVES', 'END'],
    DONE: ['END']
};

const TRANSITIONS: Record<BellmanDecisionState, Record<BellmanDecisionAction, Transition[]>> = {
    NO_CONTEXT: {
        ASK_CLARIFY: [
            { nextState: 'PARTIAL_CONTEXT', probability: 0.7 },
            { nextState: 'NO_CONTEXT', probability: 0.3 }
        ],
        EXPAND_SEARCH: [
            { nextState: 'PARTIAL_CONTEXT', probability: 0.5 },
            { nextState: 'UNCERTAIN', probability: 0.4 },
            { nextState: 'NO_CONTEXT', probability: 0.1 }
        ],
        RECOMMEND_BEST: [
            { nextState: 'DONE', probability: 0.6 },
            { nextState: 'UNCERTAIN', probability: 0.4 }
        ]
    },
    PARTIAL_CONTEXT: {
        ASK_CLARIFY: [
            { nextState: 'READY', probability: 0.6 },
            { nextState: 'PARTIAL_CONTEXT', probability: 0.3 },
            { nextState: 'UNCERTAIN', probability: 0.1 }
        ],
        EXPAND_SEARCH: [
            { nextState: 'UNCERTAIN', probability: 0.4 },
            { nextState: 'READY', probability: 0.4 },
            { nextState: 'PARTIAL_CONTEXT', probability: 0.2 }
        ],
        PROVIDE_ALTERNATIVES: [
            { nextState: 'DONE', probability: 0.7 },
            { nextState: 'UNCERTAIN', probability: 0.3 }
        ],
        RECOMMEND_BEST: [
            { nextState: 'DONE', probability: 0.8 },
            { nextState: 'UNCERTAIN', probability: 0.2 }
        ]
    },
    UNCERTAIN: {
        ASK_CLARIFY: [
            { nextState: 'PARTIAL_CONTEXT', probability: 0.6 },
            { nextState: 'UNCERTAIN', probability: 0.4 }
        ],
        EXPAND_SEARCH: [
            { nextState: 'READY', probability: 0.6 },
            { nextState: 'UNCERTAIN', probability: 0.3 },
            { nextState: 'PARTIAL_CONTEXT', probability: 0.1 }
        ],
        PROVIDE_ALTERNATIVES: [
            { nextState: 'DONE', probability: 0.7 },
            { nextState: 'UNCERTAIN', probability: 0.3 }
        ],
        RECOMMEND_BEST: [
            { nextState: 'DONE', probability: 0.5 },
            { nextState: 'UNCERTAIN', probability: 0.5 }
        ]
    },
    READY: {
        RECOMMEND_BEST: [
            { nextState: 'DONE', probability: 0.9 },
            { nextState: 'READY', probability: 0.1 }
        ],
        PROVIDE_ALTERNATIVES: [
            { nextState: 'DONE', probability: 0.9 },
            { nextState: 'READY', probability: 0.1 }
        ],
        END: [
            { nextState: 'DONE', probability: 1 }
        ]
    },
    DONE: {
        END: [
            { nextState: 'DONE', probability: 1 }
        ]
    }
};

const ACTION_LABELS: Record<BellmanDecisionAction, string> = {
    ASK_CLARIFY: '先补充偏好',
    EXPAND_SEARCH: '拓展可选项',
    PROVIDE_ALTERNATIVES: '给出备选',
    RECOMMEND_BEST: '直接推荐最优',
    END: '完成决策'
};

const DEFAULT_APPROVED_RISK_COST_DELTA = 0.35;
const DEFAULT_MIN_STABILITY_SCORE = 0.55;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function estimateRiskCostDelta(context: BellmanContext): number {
    let risk = 0;

    if (!context.hasCandidates) risk += 0.16;
    if (context.averageScore < 65) risk += 0.18;
    else if (context.averageScore < 75) risk += 0.08;

    risk += Math.min(0.24, context.missingFields.length * 0.06);

    if (context.riskTolerance === 'High') risk += 0.05;
    if (context.privacyLevel === 'Strict') risk += 0.04;

    return round3(clamp01(risk));
}

function estimateStabilityScore(context: BellmanContext): number {
    let stability = clamp01(context.averageScore / 100);

    if (!context.hasCandidates) stability -= 0.2;
    stability -= Math.min(0.25, context.missingFields.length * 0.05);
    if (context.riskTolerance === 'High') stability -= 0.03;

    return round3(clamp01(stability));
}

function resolveGateDecision(
    passed: boolean,
    mode: BellmanSafetyMode
): { decision: BellmanSafetyGateResult['decision']; blocking: boolean } {
    if (passed) return { decision: 'passed', blocking: false };
    if (mode === 'promotion') return { decision: 'blocked', blocking: true };
    return { decision: 'advisory', blocking: false };
}

function createGateResult(
    gate: BellmanSafetyGateId,
    passed: boolean,
    mode: BellmanSafetyMode,
    reason: string
): BellmanSafetyGateResult {
    const { decision, blocking } = resolveGateDecision(passed, mode);
    return { gate, decision, blocking, reason };
}

export function evaluateBellmanSafetyGates(context: BellmanContext): BellmanSafetySnapshot {
    const safety = context.safety || {};
    const mode: BellmanSafetyMode = safety.mode || 'runtime_inference';

    const riskCostDelta = Number.isFinite(safety.riskCostDelta)
        ? round3(clamp01(Number(safety.riskCostDelta)))
        : estimateRiskCostDelta(context);
    const approvedRiskCostDelta = Number.isFinite(safety.approvedRiskCostDelta)
        ? round3(clamp01(Number(safety.approvedRiskCostDelta)))
        : DEFAULT_APPROVED_RISK_COST_DELTA;

    const stabilityScore = Number.isFinite(safety.stabilityScore)
        ? round3(clamp01(Number(safety.stabilityScore)))
        : estimateStabilityScore(context);
    const minStabilityScore = Number.isFinite(safety.minStabilityScore)
        ? round3(clamp01(Number(safety.minStabilityScore)))
        : DEFAULT_MIN_STABILITY_SCORE;

    const rollbackRequired = mode !== 'runtime_inference';
    const rollbackReady = rollbackRequired
        ? Boolean(safety.hasRollbackTarget) && Boolean(safety.hasRollbackPlaybook)
        : true;

    const gateResults: BellmanSafetyGateResult[] = [
        createGateResult(
            'B1_DATA_INTEGRITY',
            safety.dataIntegrityPassed !== false,
            mode,
            safety.dataIntegrityPassed === false ? 'dataset_integrity_check_failed' : 'dataset_integrity_check_passed'
        ),
        createGateResult(
            'B2_CONSTRAINT_COMPLIANCE',
            safety.constraintsCompliant !== false,
            mode,
            safety.constraintsCompliant === false ? 'hard_constraint_encoding_missing' : 'hard_constraint_encoding_validated'
        ),
        createGateResult(
            'B3_RISK_BUDGET',
            riskCostDelta <= approvedRiskCostDelta,
            mode,
            `risk_cost_delta=${riskCostDelta} threshold=${approvedRiskCostDelta}`
        ),
        createGateResult(
            'B4_STABILITY',
            stabilityScore >= minStabilityScore,
            mode,
            `stability_score=${stabilityScore} min_required=${minStabilityScore}`
        ),
        createGateResult(
            'B5_ROLLBACK_READY',
            rollbackReady,
            mode,
            rollbackRequired
                ? (rollbackReady ? 'rollback_target_and_playbook_ready' : 'rollback_target_or_playbook_missing')
                : 'runtime_mode_no_rollout_required'
        )
    ];

    const failedGates = gateResults
        .filter((gate) => gate.decision !== 'passed')
        .map((gate) => gate.gate);

    const status: BellmanSafetySnapshot['status'] = gateResults.some((gate) => gate.blocking)
        ? 'blocked'
        : failedGates.length > 0
            ? 'advisory'
            : 'ready';

    return {
        mode,
        status,
        failedGates,
        gates: gateResults,
        riskCostDelta,
        approvedRiskCostDelta,
        stabilityScore,
        minStabilityScore,
        policyVersion: typeof safety.policyVersion === 'string' ? safety.policyVersion : undefined,
        previousPolicyVersion: typeof safety.previousPolicyVersion === 'string' ? safety.previousPolicyVersion : undefined
    };
}

function computeReward(
    state: BellmanDecisionState,
    action: BellmanDecisionAction,
    context: BellmanContext
): number {
    let reward = 0;

    switch (action) {
        case 'ASK_CLARIFY':
            reward = 4.5;
            break;
        case 'EXPAND_SEARCH':
            reward = 4.2;
            break;
        case 'PROVIDE_ALTERNATIVES':
            reward = 5.2;
            break;
        case 'RECOMMEND_BEST':
            reward = 6;
            break;
        case 'END':
            reward = 2;
            break;
    }

    if (context.missingFields.length > 0) {
        if (action === 'ASK_CLARIFY') reward += 2;
        if (action === 'RECOMMEND_BEST') reward -= 3;
        if (action === 'PROVIDE_ALTERNATIVES') reward -= 1;
    }

    if (context.candidateCount >= 3 && action === 'PROVIDE_ALTERNATIVES') {
        reward += 1.5;
    }

    if (context.averageScore >= 80 && action === 'RECOMMEND_BEST') {
        reward += 2;
    }

    if (context.averageScore < 65 && action === 'RECOMMEND_BEST') {
        reward -= 2;
    }

    if (context.averageScore < 65 && action === 'EXPAND_SEARCH') {
        reward += 1;
    }

    if (context.riskTolerance === 'High') {
        if (action === 'EXPAND_SEARCH') reward += 1;
        if (action === 'RECOMMEND_BEST') reward -= 0.5;
    } else if (context.riskTolerance === 'Low') {
        if (action === 'EXPAND_SEARCH') reward -= 0.5;
        if (action === 'RECOMMEND_BEST') reward += 0.5;
    }

    if (context.privacyLevel === 'Strict' && action === 'EXPAND_SEARCH') {
        reward -= 0.8;
    }

    if (state === 'NO_CONTEXT' && action === 'RECOMMEND_BEST') {
        reward -= 1.5;
    }

    return reward;
}

function deriveState(context: BellmanContext): BellmanDecisionState {
    if (!context.hasCandidates && context.missingFields.length === 0) {
        return 'NO_CONTEXT';
    }
    if (!context.hasCandidates && context.missingFields.length > 0) {
        return 'NO_CONTEXT';
    }
    if (context.hasCandidates && context.averageScore < 65) {
        return 'UNCERTAIN';
    }
    if (context.hasCandidates && context.missingFields.length > 0) {
        return 'PARTIAL_CONTEXT';
    }
    if (context.hasCandidates) {
        return 'READY';
    }
    return 'NO_CONTEXT';
}

function valueIteration(context: BellmanContext, gamma: number, iterations = 50): {
    values: Record<BellmanDecisionState, number>;
    policy: Record<BellmanDecisionState, BellmanDecisionAction>;
} {
    let values: Record<BellmanDecisionState, number> = {
        NO_CONTEXT: 0,
        PARTIAL_CONTEXT: 0,
        UNCERTAIN: 0,
        READY: 0,
        DONE: 0
    };

    for (let i = 0; i < iterations; i += 1) {
        const nextValues: Record<BellmanDecisionState, number> = { ...values };
        let maxDelta = 0;

        STATES.forEach((state) => {
            const actions = ACTIONS[state];
            let bestValue = Number.NEGATIVE_INFINITY;

            actions.forEach((action) => {
                const transitions = TRANSITIONS[state][action] || [];
                const immediate = computeReward(state, action, context);
                const expected = transitions.reduce((sum, transition) => {
                    return sum + transition.probability * (immediate + gamma * values[transition.nextState]);
                }, 0);
                if (expected > bestValue) {
                    bestValue = expected;
                }
            });

            nextValues[state] = Number.isFinite(bestValue) ? bestValue : values[state];
            maxDelta = Math.max(maxDelta, Math.abs(nextValues[state] - values[state]));
        });

        values = nextValues;
        if (maxDelta < 0.01) break;
    }

    const policy: Record<BellmanDecisionState, BellmanDecisionAction> = {
        NO_CONTEXT: 'ASK_CLARIFY',
        PARTIAL_CONTEXT: 'ASK_CLARIFY',
        UNCERTAIN: 'EXPAND_SEARCH',
        READY: 'RECOMMEND_BEST',
        DONE: 'END'
    };

    STATES.forEach((state) => {
        const actions = ACTIONS[state];
        let bestAction = actions[0];
        let bestValue = Number.NEGATIVE_INFINITY;

        actions.forEach((action) => {
            const transitions = TRANSITIONS[state][action] || [];
            const immediate = computeReward(state, action, context);
            const expected = transitions.reduce((sum, transition) => {
                return sum + transition.probability * (immediate + gamma * values[transition.nextState]);
            }, 0);
            if (expected > bestValue) {
                bestValue = expected;
                bestAction = action;
            }
        });

        policy[state] = bestAction;
    });

    return { values, policy };
}

function buildPolicyPath(
    startState: BellmanDecisionState,
    policy: Record<BellmanDecisionState, BellmanDecisionAction>
): BellmanDecisionAction[] {
    const path: BellmanDecisionAction[] = [];
    let state = startState;
    for (let step = 0; step < 3; step += 1) {
        const action = policy[state];
        if (!action) break;
        path.push(action);
        const transitions = TRANSITIONS[state][action] || [];
        const next = transitions.reduce((best, current) => {
            return current.probability > best.probability ? current : best;
        }, transitions[0]);
        if (!next) break;
        state = next.nextState;
        if (state === 'DONE') break;
    }
    return path;
}

export function formatBellmanPath(path: BellmanDecisionAction[]): string[] {
    return path.map((action) => ACTION_LABELS[action] || action);
}

export function runBellmanPolicy(context: BellmanContext): BellmanPolicyTrace {
    const startState = deriveState(context);
    const { values, policy } = valueIteration(context, 0.95);
    const safety = evaluateBellmanSafetyGates(context);

    const defaultBestAction = policy[startState];
    const shouldBlock = safety.status === 'blocked';
    const safeFallbackAction: BellmanDecisionAction = startState === 'DONE' ? 'END' : 'ASK_CLARIFY';

    const bestAction = shouldBlock ? safeFallbackAction : defaultBestAction;
    const path = shouldBlock ? [safeFallbackAction] : buildPolicyPath(startState, policy);

    return {
        startState,
        bestAction,
        expectedValue: Number(values[startState].toFixed(2)),
        path,
        policyStatus: safety.status,
        safety
    };
}

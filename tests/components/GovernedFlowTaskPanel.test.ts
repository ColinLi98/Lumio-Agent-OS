import { describe, expect, it } from 'vitest';
import {
  buildGovernedFlowBlockedReasonLines,
  buildGovernedFlowEvidenceLines,
  buildGovernedFlowStatusCards,
} from '../../components/GovernedFlowTaskPanel';
import type { PlatformGovernedFlowState } from '../../services/platformContract';

const flow: PlatformGovernedFlowState = {
  taskId: 'task_1',
  title: 'Northbridge Family Office',
  currentStageKey: 'APPROVAL',
  currentStageLabel: 'Approval',
  stages: [
    { key: 'REQUEST', label: 'Request', ownerRole: 'REQUESTER', section: 'requests', status: 'DONE', summary: 'Request staged.' },
    { key: 'APPROVAL', label: 'Approval', ownerRole: 'APPROVER', section: 'approval', status: 'BLOCKED', summary: 'Approval is waiting on missing scope.' },
    { key: 'OPERATIONS', label: 'Operations', ownerRole: 'OPERATOR', section: 'operations', status: 'UPCOMING', summary: 'Operations is queued.' },
    { key: 'REVIEW', label: 'Review', ownerRole: 'REVIEWER', section: 'review', status: 'UPCOMING', summary: 'Review is queued.' },
    { key: 'AUDIT', label: 'Audit', ownerRole: 'AUDITOR', section: 'audit', status: 'UPCOMING', summary: 'Audit is queued.' },
  ],
  waitingOnRole: 'APPROVER',
  waitingSummary: 'Operator is waiting on Approver.',
  nextAction: 'Use Approval Center to release bounded scope once the blocker is cleared.',
  nextDestinationSection: 'approval',
  nextDestinationRole: 'APPROVER',
  nextDestinationLabel: 'Approval',
  blocker: {
    blocked: true,
    blockedBy: 'APPROVER',
    blockedBecause: 'Missing required fields: approval_scope.',
    category: 'POLICY',
    nextSection: 'approval',
    recommendedAction: 'Resolve the policy field gap before releasing the next handoff.',
  },
  evidence: {
    evidenceSetId: 'task_1',
    roleLensRole: 'REVIEWER',
    roleLensSummary: 'Reviewer sees the same evidence set that clears the review gate.',
    receiptSummary: 'Shared receipt summary.',
    approvalSummary: 'Shared approval summary.',
    evidenceItems: ['Missing field: approval_scope'],
    receiptItems: ['Approver: approval required'],
    activityCount: 1,
  },
  timeline: [
    {
      receiptId: 'activity_1',
      kind: 'trial_activity',
      oaRole: 'REQUESTER',
      actorLabel: 'Requester',
      summary: 'Requester staged the task.',
      createdAt: 1,
    },
  ],
};

describe('GovernedFlowTaskPanel helpers', () => {
  it('builds role-aware cockpit cards', () => {
    const cards = buildGovernedFlowStatusCards(flow);
    expect(cards[0]?.value).toBe('Approval');
    expect(cards[1]?.value).toContain('Approval Center');
    expect(cards[2]?.value).toBe('Approver');
  });

  it('renders blocked reason lines', () => {
    const lines = buildGovernedFlowBlockedReasonLines(flow);
    expect(lines[0]).toContain('Approver');
    expect(lines[1]).toContain('approval_scope');
    expect(lines[2]).toContain('policy');
  });

  it('renders evidence and receipt lines from one shared evidence set', () => {
    const lines = buildGovernedFlowEvidenceLines(flow);
    expect(lines[0]).toContain('task_1');
    expect(lines[1]).toContain('Shared receipt summary');
    expect(lines[2]).toContain('Shared approval summary');
    expect(lines[3]).toContain('approval_scope');
  });
});

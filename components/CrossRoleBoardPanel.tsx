import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import { ENTERPRISE_OA_V1_ROLES, enterpriseRoleLabel, type EnterpriseOARole } from '../services/enterpriseOAShell';
import { normalizeOaRole } from '../services/platformContract';

export interface CrossRoleLane {
  role: EnterpriseOARole;
  label: string;
  description: string;
  cards: Array<{
    title: string;
    status: string;
    detail: string;
  }>;
}

function laneDescription(role: EnterpriseOARole): string {
  switch (role) {
    case 'REQUESTER': return 'Starts the business request and monitors downstream progress.';
    case 'APPROVER': return 'Owns bounded approval decisions in the workflow.';
    case 'OPERATOR': return 'Assembles the work package and coordinates execution.';
    case 'REVIEWER': return 'Checks evidence quality and review blockers before progression.';
    case 'TENANT_ADMIN': return 'Owns tenant-level readiness and final enterprise gate posture.';
    case 'WORKSPACE_ADMIN': return 'Owns workspace seat and participant governance.';
    case 'POLICY_GOVERNANCE_ADMIN': return 'Owns policy and governance posture for the workflow.';
    case 'INTEGRATION_ADMIN': return 'Owns connector and credential readiness posture.';
    case 'AUDITOR': return 'Owns read-only audit visibility and export-facing traceability.';
    default: return 'Participates in the governed workflow.';
  }
}

export function buildCrossRoleLanes(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): CrossRoleLane[] {
  if (!summary) {
    return [
      {
        role: 'REQUESTER',
        label: 'Requester',
        description: 'No workspace summary loaded.',
        cards: [],
      },
      {
        role: 'OPERATOR',
        label: 'Operator',
        description: 'No workspace summary loaded.',
        cards: [],
      },
      {
        role: 'TENANT_ADMIN',
        label: 'Tenant Admin',
        description: 'No workspace summary loaded.',
        cards: [],
      },
    ];
  }

  if (workspaceMode === 'local_lab') {
    if (summary.trial_workspace?.trial_workspace?.active_template_id === 'oa_full_cycle_governed_execution') {
      const activities = summary.trial_workspace.activities || [];
      return ENTERPRISE_OA_V1_ROLES.map((role) => ({
        role,
        label: enterpriseRoleLabel(role),
        description: laneDescription(role),
        cards: activities
          .filter((activity) => normalizeOaRole(activity) === role)
          .slice(0, 3)
          .map((activity) => ({
            title: activity.summary.split(' · ')[0] || activity.summary,
            status: 'visible',
            detail: activity.summary,
          })),
      }));
    }
    const inboxItems = summary.requester_inbox.items;
    return [
      {
        role: 'REQUESTER',
        label: 'Requester',
        description: 'Submits work, reviews receipts, and waits on downstream action.',
        cards: inboxItems
          .filter((item) => normalizeOaRole(item) === 'REQUESTER')
          .map((item) => ({
            title: item.goal,
            status: item.group.toLowerCase(),
            detail: item.summary,
          })),
      },
      {
        role: 'OPERATOR',
        label: 'Operator',
        description: 'Processes handoffs, validates package quality, and keeps execution moving.',
        cards: summary.local_role_lab.handoff_timeline
          .filter((step) => normalizeOaRole(step.to_role) === 'OPERATOR' || normalizeOaRole(step.from_role) === 'OPERATOR')
          .map((step) => ({
            title: step.title,
            status: step.status.toLowerCase(),
            detail: step.summary,
          })),
      },
      {
        role: 'TENANT_ADMIN',
        label: 'Tenant Admin',
        description: 'Reviews readiness, activation gaps, and administrative approvals.',
        cards: [
          {
            title: summary.activation_package.summary,
            status: summary.activation_package.status.toLowerCase().replace(/_/g, ' '),
            detail: `Pending requirements: ${summary.activation_package.pending_requirement_count}`,
          },
          ...summary.local_role_lab.handoff_timeline
            .filter((step) => normalizeOaRole(step.to_role) === 'TENANT_ADMIN' || normalizeOaRole(step.from_role) === 'TENANT_ADMIN')
            .map((step) => ({
              title: step.title,
              status: step.status.toLowerCase(),
              detail: step.summary,
            })),
        ],
      },
    ];
  }

    return [
      {
        role: 'REQUESTER',
        label: 'Requester',
      description: 'Submits work and monitors receipts.',
      cards: summary.requester_inbox.items.map((item) => ({
        title: item.goal,
        status: item.group.toLowerCase(),
        detail: item.summary,
      })),
    },
      {
        role: 'OPERATOR',
      label: 'Operator',
      description: 'Processes work routed through the workspace execution model.',
      cards: [
        {
          title: 'Operator workflow',
          status: 'ready',
          detail: summary.next_action,
        },
      ],
    },
      {
        role: 'TENANT_ADMIN',
      label: 'Tenant Admin',
      description: 'Owns setup, policy, and activation posture.',
      cards: [
        {
          title: summary.activation_package.summary,
          status: summary.activation_package.status.toLowerCase().replace(/_/g, ' '),
          detail: `Remaining blockers: ${summary.remaining_blockers.length}`,
        },
      ],
    },
  ];
}

interface CrossRoleBoardPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const CrossRoleBoardPanel: React.FC<CrossRoleBoardPanelProps> = ({ summary, workspaceMode }) => {
  const lanes = buildCrossRoleLanes(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Cross-role workflow board</div>
      <div className="mt-2 text-sm text-slate-300">
        See how different employees participate in the same workspace, side by side.
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {lanes.map((lane) => (
          <div key={lane.role} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{lane.label}</div>
                <div className="mt-1 text-xs text-slate-400">{lane.description}</div>
              </div>
              <div className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                {lane.cards.length} card{lane.cards.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {lane.cards.length === 0 ? (
                <div className="rounded-xl bg-slate-900/70 px-3 py-3 text-xs text-slate-500">
                  No active cards in this lane.
                </div>
              ) : lane.cards.map((card) => (
                <div key={`${lane.role}-${card.title}`} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">{card.title}</div>
                    <div className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-200">
                      {card.status}
                    </div>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">{card.detail}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrossRoleBoardPanel;

import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';

export type RoleWorkboardMode = 'requester' | 'operator' | 'tenant_admin';

export interface RoleWorkboardCard {
  title: string;
  value: string;
  detail: string;
}

export function buildRoleWorkboardCards(
  summary: ProductShellSummary | null,
  role: RoleWorkboardMode,
  workspaceMode: WorkspaceMode
): RoleWorkboardCard[] {
  if (!summary) {
    return [
      {
        title: 'Unavailable',
        value: '0',
        detail: 'Role workboard summary unavailable.',
      },
    ];
  }

  if (role === 'requester') {
    return [
      {
        title: 'Requests',
        value: String(summary.requester_inbox.total_count),
        detail: `${summary.requester_inbox.in_progress_count} in progress, ${summary.requester_inbox.waiting_count} waiting`,
      },
      {
        title: 'Blocked',
        value: String(summary.requester_inbox.blocked_count),
        detail: 'Items waiting on cross-role action or approval',
      },
      {
        title: 'Receipts',
        value: String(summary.requester_inbox.completed_count),
        detail: 'Completed items with receipt visibility',
      },
    ];
  }

  if (role === 'operator') {
    return [
      {
        title: 'Current stage',
        value: summary.local_role_lab.scenario.current_stage,
        detail: 'Operator sees the current cross-role handoff stage',
      },
      {
        title: 'Timeline steps',
        value: String(summary.local_role_lab.handoff_timeline.length),
        detail: `${summary.local_role_lab.handoff_timeline.filter((step) => step.status === 'COMPLETED').length} completed`,
      },
      {
        title: 'Mode',
        value: workspaceMode === 'local_lab' ? 'Local Lab' : 'Workspace',
        detail: 'Operator work stays in the same enterprise shell',
      },
    ];
  }

  return [
    {
      title: 'Activation package',
      value: summary.activation_package.status.toLowerCase().replace(/_/g, ' '),
      detail: `${summary.activation_package.pending_requirement_count} pending requirement(s)`,
    },
    {
      title: 'Evidence gaps',
      value: String(summary.evidence_categories.filter((item) => item.state === 'MISSING').length),
      detail: 'Real-pilot evidence categories still missing',
    },
    {
      title: 'Members',
      value: String(summary.local_role_lab.actors.length || summary.environment_activation.actor_availability.length),
      detail: 'Visible workspace seats and access posture',
    },
  ];
}

interface RoleWorkboardPanelProps {
  summary: ProductShellSummary | null;
  role: RoleWorkboardMode;
  workspaceMode: WorkspaceMode;
}

export const RoleWorkboardPanel: React.FC<RoleWorkboardPanelProps> = ({ summary, role, workspaceMode }) => {
  const cards = buildRoleWorkboardCards(summary, role, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Role workboard</div>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={`${role}-${card.title}`} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.title}</div>
            <div className="mt-2 text-lg font-semibold text-white">{card.value}</div>
            <div className="mt-2 text-xs leading-5 text-slate-400">{card.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleWorkboardPanel;

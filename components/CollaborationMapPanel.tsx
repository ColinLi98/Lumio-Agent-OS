import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import { ENTERPRISE_OA_V1_ROLES, enterpriseRoleLabel } from '../services/enterpriseOAShell';
import { normalizeOaRole } from '../services/platformContract';

export interface CollaborationMapStep {
  title: string;
  owner: string;
  status: string;
  detail: string;
}

export function buildCollaborationMapSteps(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): CollaborationMapStep[] {
  if (!summary) {
    return [
      {
        title: 'Collaboration unavailable',
        owner: 'Workspace',
        status: 'unknown',
        detail: 'No collaboration map is available until workspace truth is loaded.',
      },
    ];
  }

  if (workspaceMode === 'local_lab') {
    if (summary.trial_workspace?.trial_workspace?.active_template_id === 'oa_full_cycle_governed_execution') {
      return ENTERPRISE_OA_V1_ROLES.map((role) => ({
        title: `${enterpriseRoleLabel(role)} checkpoint`,
        owner: role.toLowerCase().replace(/_/g, ' '),
        status: summary.trial_workspace?.activities.some((activity) => normalizeOaRole(activity) === role) ? 'visible' : 'pending',
        detail: summary.trial_workspace?.activities.find((activity) => normalizeOaRole(activity) === role)?.summary
          || `${enterpriseRoleLabel(role)} is part of the 9-role OA example.`,
      }));
    }
    return summary.local_role_lab.handoff_timeline.map((step) => ({
      title: step.title,
      owner: step.to_role ? step.to_role.toLowerCase().replace(/_/g, ' ') : step.from_role?.toLowerCase().replace(/_/g, ' ') || 'workspace',
      status: step.status.toLowerCase(),
      detail: step.summary,
    }));
  }

  return [
    {
      title: 'Requester submits work',
      owner: 'requester',
      status: 'ready',
      detail: summary.requester_inbox.total_count > 0
        ? `${summary.requester_inbox.total_count} request(s) visible in the workspace inbox`
        : 'No active requests are visible yet.',
    },
    {
      title: 'Operator processes flow',
      owner: 'operator',
      status: summary.environment_activation.actor_availability.some((actor) => normalizeOaRole(actor.role) === 'OPERATOR' && actor.state === 'READY') ? 'ready' : 'blocked',
      detail: 'Operator workflow remains governed by the shared workspace execution model.',
    },
    {
      title: 'Tenant admin validates readiness',
      owner: 'tenant admin',
      status: summary.environment_activation.actor_availability.some((actor) => normalizeOaRole(actor.role) === 'TENANT_ADMIN' && actor.state === 'READY') ? 'ready' : 'blocked',
      detail: summary.activation_package.summary,
    },
  ];
}

interface CollaborationMapPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const CollaborationMapPanel: React.FC<CollaborationMapPanelProps> = ({ summary, workspaceMode }) => {
  const steps = buildCollaborationMapSteps(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Collaboration map</div>
      <div className="mt-2 text-sm text-slate-300">
        See how requester, operator, and tenant-admin work moves through the workspace.
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {steps.map((step) => (
          <div key={`${step.title}-${step.owner}`} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{step.title}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">{step.owner}</div>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-200">
                {step.status}
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-slate-400">{step.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollaborationMapPanel;

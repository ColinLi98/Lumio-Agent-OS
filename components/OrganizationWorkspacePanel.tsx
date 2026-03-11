import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import { buildPlatformWorkspaceGovernanceSurface } from '../services/platformContract';

export interface OrganizationWorkspaceFact {
  label: string;
  value: string;
  detail: string;
}

export function buildOrganizationWorkspaceFacts(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): OrganizationWorkspaceFact[] {
  if (!summary) {
      return [
      {
        label: 'Organization',
        value: 'Lumio',
        detail: 'Workspace truth unavailable.',
      },
    ];
  }

  return [
    {
      label: 'Organization',
      value: 'Lumio',
      detail: 'Primary B-end governed workspace product shell',
    },
    {
      label: 'Workspace',
      value: workspaceMode === 'local_lab'
        ? summary.local_role_lab.label
        : summary.environment_activation.environment_label || 'Workspace',
      detail: `Mode: ${workspaceMode}`,
    },
    {
      label: 'Environment',
      value: summary.environment_activation.environment_kind,
      detail: summary.environment_activation.activation_ready_summary,
    },
    {
      label: 'Activation package',
      value: summary.activation_package.status.toLowerCase().replace(/_/g, ' '),
      detail: `${summary.activation_package.pending_requirement_count} pending requirement(s)`,
    },
    {
      label: 'Policy pack',
      value: summary.policy_studio.pack_name,
      detail: summary.policy_studio.summary,
    },
    {
      label: 'Workspace seats',
      value: String(
        workspaceMode === 'local_lab'
          ? summary.local_role_lab.actors.length
          : summary.environment_activation.actor_availability.length
      ),
      detail: 'Visible employee/seat contexts in this workspace',
    },
  ];
}

interface OrganizationWorkspacePanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const OrganizationWorkspacePanel: React.FC<OrganizationWorkspacePanelProps> = ({ summary, workspaceMode }) => {
  const facts = buildOrganizationWorkspaceFacts(summary, workspaceMode);
  const governance = buildPlatformWorkspaceGovernanceSurface(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Organization & workspace</div>
      <div className="mt-2 text-sm text-slate-300">
        A management view for the organization, workspace, environment, and activation posture behind the enterprise platform.
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{fact.label}</div>
            <div className="mt-2 text-lg font-semibold text-white">{fact.value}</div>
            <div className="mt-2 text-xs leading-5 text-slate-400">{fact.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ownership & admin boundaries</div>
          <div className="mt-3 space-y-2">
            {[...governance.ownership, ...governance.adminBoundaries].map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Escalation path & workspace health</div>
          <div className="mt-3 space-y-2">
            {[...governance.escalationPath, ...governance.workspaceHealth].map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationWorkspacePanel;

import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';

export interface EnterpriseLoginEntryLine {
  title: string;
  detail: string;
}

export function buildEnterpriseLoginEntryLines(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): EnterpriseLoginEntryLine[] {
  if (!summary) {
    return [
      {
        title: 'Identity entry unavailable',
        detail: 'Workspace identity shell is unavailable until product-shell truth loads.',
      },
    ];
  }

  const environment = summary.environment_activation;
  const readyActors = environment.actor_availability.filter((actor) => actor.state === 'READY');

  if (workspaceMode === 'local_lab') {
    return [
      {
        title: 'Local role lab sign-in',
        detail: 'Uses local synthetic seat switching for rehearsal and never counts as a real enterprise sign-in path.',
      },
      {
        title: 'Ready seats',
        detail: `${readyActors.length} rehearsal seats are visible in the workspace shell.`,
      },
      {
        title: 'Real pilot gap',
        detail: environment.activation_ready_summary,
      },
    ];
  }

  return [
    {
      title: 'Identity readiness',
      detail: environment.identity_readiness.summary,
    },
    {
      title: 'Environment binding',
      detail: environment.environment_binding.summary,
    },
    {
      title: 'Activation state',
      detail: environment.activation_ready_summary,
    },
  ];
}

interface EnterpriseLoginEntryPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const EnterpriseLoginEntryPanel: React.FC<EnterpriseLoginEntryPanelProps> = ({ summary, workspaceMode }) => {
  const lines = buildEnterpriseLoginEntryLines(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Enterprise login entry</div>
      <div className="mt-2 text-sm text-slate-300">
        Show what enterprise sign-in and workspace entry would look like for company users.
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {lines.map((line) => (
          <div key={line.title} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{line.title}</div>
            <div className="mt-2 text-xs leading-5 text-slate-300">{line.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnterpriseLoginEntryPanel;

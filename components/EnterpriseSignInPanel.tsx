import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';

export function buildEnterpriseSignInLines(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): string[] {
  if (!summary) return ['Enterprise sign-in shell unavailable.'];

  const identity = summary.environment_activation.identity_readiness;
  const actors = summary.environment_activation.actor_availability;
  const readyActors = actors.filter((actor) => actor.state === 'READY');

  const lines = [
    `Identity readiness: ${identity.summary}`,
    `Ready actor seats: ${readyActors.length}`,
    `Workspace mode: ${workspaceMode}`,
    `Activation summary: ${summary.environment_activation.activation_ready_summary}`,
  ];

  if (workspaceMode === 'local_lab') {
    lines.unshift('Local role lab uses synthetic role sessions for rehearsal. This is not a real enterprise sign-in path.');
  }

  return lines;
}

interface EnterpriseSignInPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const EnterpriseSignInPanel: React.FC<EnterpriseSignInPanelProps> = ({ summary, workspaceMode }) => {
  const lines = buildEnterpriseSignInLines(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Enterprise sign-in shell</div>
      <div className="mt-2 text-sm text-slate-300">
        Show how enterprise identity, actor access, and workspace readiness would appear in the product shell.
      </div>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <div key={line} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnterpriseSignInPanel;

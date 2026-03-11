import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';

export function buildIdentityStatusLines(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): string[] {
  if (!summary) return ['Identity and access summary unavailable.'];

  const environment = summary.environment_activation;
  const lines = [
    `Environment binding: ${environment.environment_binding.summary}`,
    `Identity readiness: ${environment.identity_readiness.summary}`,
    `Connector readiness: ${environment.connector_readiness.summary}`,
    `Vault readiness: ${environment.vault_readiness.summary}`,
    `Activation summary: ${environment.activation_ready_summary}`,
  ];

  if (workspaceMode === 'local_lab') {
    lines.unshift('Local role lab uses synthetic seats for rehearsal and does not claim real pilot identity or access.');
  }

  return lines.filter(Boolean);
}

interface EnterpriseIdentityStatusPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const EnterpriseIdentityStatusPanel: React.FC<EnterpriseIdentityStatusPanelProps> = ({ summary, workspaceMode }) => {
  const lines = buildIdentityStatusLines(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Identity & access posture</div>
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

export default EnterpriseIdentityStatusPanel;

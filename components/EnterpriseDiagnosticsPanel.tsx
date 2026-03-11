import React from 'react';
import type { EnterpriseAccountShellSummary, ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';

export function buildEnterpriseDiagnosticsLines(
  account: EnterpriseAccountShellSummary | null | undefined,
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
): string[] {
  if (!account?.signed_in || !account.diagnostics) {
    return [
      workspaceMode === 'local_lab'
        ? 'Local role lab uses rehearsal-only state and does not require enterprise auth diagnostics.'
        : 'Sign in with a real enterprise session to view provider, binding, and persistence diagnostics.',
    ];
  }

  const diagnostics = account.diagnostics;
  const lines = [
    `Provider: ${diagnostics.provider}`,
    `Tenant: ${diagnostics.tenant_id}`,
    `Workspace: ${diagnostics.workspace_id || 'tenant default'}`,
    `Store driver: ${diagnostics.store_driver}`,
    `Production mode: ${diagnostics.production_mode ? 'yes' : 'no'}`,
    `Enterprise writes ready: ${diagnostics.write_persistence_ready ? 'yes' : 'no'}`,
    `Session expires in: ${Math.max(0, Math.round(diagnostics.session_time_remaining_ms / 1000))}s`,
    `Bindings: ${diagnostics.binding_count}`,
    `Groups: ${diagnostics.group_count}`,
  ];

  if (summary?.trial_workspace) {
    lines.push(`Trial persistence: ${summary.trial_workspace.persistence_state}`);
    lines.push(`Persistence detail: ${summary.trial_workspace.persistence_detail}`);
  }

  return lines;
}

interface EnterpriseDiagnosticsPanelProps {
  account: EnterpriseAccountShellSummary | null | undefined;
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const EnterpriseDiagnosticsPanel: React.FC<EnterpriseDiagnosticsPanelProps> = ({
  account,
  summary,
  workspaceMode,
}) => {
  const lines = buildEnterpriseDiagnosticsLines(account, summary, workspaceMode);
  const diagnostics = account?.diagnostics;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Auth & Persistence Diagnostics</div>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <div key={line} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
            {line}
          </div>
        ))}
      </div>
      {diagnostics?.group_role_mapping_summary?.length ? (
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Group / role mapping</div>
          <div className="mt-2 space-y-2">
            {diagnostics.group_role_mapping_summary.map((line) => (
              <div key={line} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-[11px] text-slate-400">
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EnterpriseDiagnosticsPanel;

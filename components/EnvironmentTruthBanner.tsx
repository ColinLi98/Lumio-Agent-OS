import React from 'react';
import type { EnvironmentActivationSummary } from '../services/agentKernelShellApi';

export function environmentBadgeLabel(kind: EnvironmentActivationSummary['environment_kind'] | undefined): string {
  return kind || 'UNKNOWN';
}

export function buildEnvironmentTruthLines(summary: EnvironmentActivationSummary | null | undefined): string[] {
  if (!summary) return ['Environment truth unavailable'];
  const lines = [
    `Workspace binding: ${summary.workspace_binding_kind.toLowerCase().replace(/_/g, ' ')}`,
    `Activation: ${summary.pilot_activation_status.toLowerCase().replace(/_/g, ' ')}`,
    `Activation ready: ${summary.activation_ready ? 'yes' : 'no'}`,
    summary.activation_ready_summary,
    summary.environment_binding?.summary,
    summary.connector_activation?.summary,
    ...summary.missing_dependency_summaries,
  ];
  if (summary.simulator_backing) {
    lines.unshift('This is a simulator-backed environment.');
  }
  return Array.from(new Set(lines.filter(Boolean)));
}

interface EnvironmentTruthBannerProps {
  summary: EnvironmentActivationSummary | null;
}

export const EnvironmentTruthBanner: React.FC<EnvironmentTruthBannerProps> = ({ summary }) => {
  const badge = environmentBadgeLabel(summary?.environment_kind);
  const lines = buildEnvironmentTruthLines(summary);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">
            {summary?.environment_label || 'Environment truth unavailable'}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            {summary?.workspace_mode === 'demo'
              ? 'Demo workspace is explicitly labeled non-pilot.'
              : summary?.workspace_mode === 'local_lab'
                ? 'Local role lab lets one human rehearse requester/operator/tenant-admin collaboration and is never treated as pilot evidence.'
              : 'Pilot readiness depends on real environment binding, actors, identity, connector, and vault readiness.'}
          </div>
        </div>
        <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-sky-300">
          {badge}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {lines.slice(0, 5).map((line) => (
          <div key={line} className="text-xs text-slate-400">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvironmentTruthBanner;

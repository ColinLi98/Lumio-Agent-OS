import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';

export interface AdminActionItem {
  title: string;
  owner: string;
  status: string;
  detail: string;
}

export function buildAdminActionItems(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): AdminActionItem[] {
  if (!summary) {
    return [
      {
        title: 'Admin action center unavailable',
        owner: 'tenant admin',
        status: 'unknown',
        detail: 'No admin action data is available until the workspace summary loads.',
      },
    ];
  }

  const blockerItems = summary.remaining_blockers.slice(0, 4).map((blocker) => ({
    title: blocker.summary,
    owner: blocker.owner_label,
    status: 'blocked',
    detail: blocker.next_action,
  }));

  const packageItem: AdminActionItem = {
    title: 'Activation package',
    owner: summary.activation_package.owner_label,
    status: summary.activation_package.status.toLowerCase().replace(/_/g, ' '),
    detail: `${summary.activation_package.pending_requirement_count} pending requirement(s), ${summary.activation_package.rejected_intake_count} rejected intake(s)`,
  };

  if (workspaceMode === 'local_lab') {
    return [
      packageItem,
      {
        title: 'Local role lab boundary',
        owner: 'tenant admin',
        status: 'rehearsal only',
        detail: 'Keep rehearsal visible while preserving the non-pilot evidence boundary.',
      },
      ...blockerItems,
    ];
  }

  return [packageItem, ...blockerItems];
}

interface AdminActionCenterPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const AdminActionCenterPanel: React.FC<AdminActionCenterPanelProps> = ({ summary, workspaceMode }) => {
  const items = buildAdminActionItems(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Admin action center</div>
      <div className="mt-2 text-sm text-slate-300">
        Surface the highest-signal administrative actions, blockers, and ownership items for the current workspace.
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {items.map((item) => (
          <div key={`${item.title}-${item.owner}`} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">{item.owner}</div>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-200">
                {item.status}
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-slate-400">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminActionCenterPanel;

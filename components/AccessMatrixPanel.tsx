import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import { buildPlatformMemberSeatInvites, platformRoleLabel } from '../services/platformContract';

export interface AccessMatrixRow {
  role: string;
  actor: string;
  provisioning: string;
  access: string;
}

export function buildAccessMatrixRows(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): AccessMatrixRow[] {
  return buildPlatformMemberSeatInvites(summary, workspaceMode).flatMap((record) =>
    record.oaRoles.length > 0
      ? record.oaRoles.map((role) => ({
          role: platformRoleLabel(role).toLowerCase(),
          actor: record.title,
          provisioning: record.provisioning,
          access: record.access,
        }))
      : [{
          role: 'unassigned',
          actor: record.title,
          provisioning: record.provisioning,
          access: record.access,
        }]
  );
}

interface AccessMatrixPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
}

export const AccessMatrixPanel: React.FC<AccessMatrixPanelProps> = ({ summary, workspaceMode }) => {
  const rows = buildAccessMatrixRows(summary, workspaceMode);
  const openInvites = rows.filter((row) => row.provisioning === 'open invite').length;
  const grantedAccess = rows.filter((row) => row.access === 'granted').length;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Access matrix</div>
      <div className="mt-2 text-sm text-slate-300">
        A role-by-role view of provisioning and access posture for the current workspace.
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Rows: {rows.length}</div>
        <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Granted: {grantedAccess}</div>
        <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Open invites: {openInvites}</div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
        <div className="grid grid-cols-4 bg-slate-950/90 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <div>Role</div>
          <div>Actor</div>
          <div>Provisioning</div>
          <div>Access</div>
        </div>
        {rows.map((row) => (
          <div key={`${row.role}-${row.actor}`} className="grid grid-cols-4 border-t border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-200">
            <div>{row.role}</div>
            <div>{row.actor}</div>
            <div>{row.provisioning}</div>
            <div>{row.access}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessMatrixPanel;

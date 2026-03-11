import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import {
  buildPlatformActorIdentities,
  buildPlatformRolePageHref,
  labActorIdForOaRole,
} from '../services/platformContract';

export interface WorkspaceDirectoryRow {
  actorId: string;
  actor: string;
  role: string;
  responsibility: string;
  pageHref: string;
  detailHref: string;
}

export function buildWorkspaceDirectoryRows(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
  activeLabActorId?: string
): WorkspaceDirectoryRow[] {
  return buildPlatformActorIdentities(summary, workspaceMode).map((actor) => ({
    actorId: actor.actorId,
    actor: actor.displayName,
    role: actor.oaRole.toLowerCase().replace(/_/g, ' '),
    responsibility: actor.summary,
    pageHref: buildPlatformRolePageHref(
      actor.page,
      workspaceMode,
      workspaceMode === 'local_lab'
        ? actor.page === 'workspace'
          ? actor.actorId
          : labActorIdForOaRole(actor.oaRole)
        : undefined,
    ),
    detailHref: buildPlatformRolePageHref(
      'workspace',
      workspaceMode,
      activeLabActorId || actor.actorId,
      'members',
      actor.actorId,
    ),
  }));
}

interface WorkspaceDirectoryPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
  focusedMemberId?: string | null;
  activeLabActorId?: string;
}

export const WorkspaceDirectoryPanel: React.FC<WorkspaceDirectoryPanelProps> = ({
  summary,
  workspaceMode,
  focusedMemberId,
  activeLabActorId,
}) => {
  const rows = buildWorkspaceDirectoryRows(summary, workspaceMode, activeLabActorId);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace directory</div>
      <div className="mt-2 text-sm text-slate-300">
        A directory of seats, responsibilities, and direct links into each employee-facing page.
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div
            key={`${row.actor}-${row.role}`}
            className={`rounded-2xl border p-4 ${
              focusedMemberId === row.actorId ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{row.actor}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">{row.role}</div>
              </div>
              <div className="flex gap-2">
                <a
                  href={row.detailHref}
                  className="rounded-full bg-cyan-900/40 px-3 py-1 text-[11px] font-semibold text-cyan-100"
                >
                  Inspect seat
                </a>
                <a
                  href={row.pageHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
                >
                  Open page
                </a>
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-slate-400">{row.responsibility}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceDirectoryPanel;

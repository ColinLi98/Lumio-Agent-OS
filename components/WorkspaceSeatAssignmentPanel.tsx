import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import {
  buildPlatformActorIdentities,
  buildPlatformRolePageHref,
  labActorIdForOaRole,
} from '../services/platformContract';

export interface WorkspaceSeatAssignment {
  actorId: string;
  role: string;
  actor: string;
  assignmentStatus: string;
  detail: string;
  pageHref: string;
  detailHref: string;
}

export function buildWorkspaceSeatAssignments(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
  activeLabActorId?: string
): WorkspaceSeatAssignment[] {
  return buildPlatformActorIdentities(summary, workspaceMode).map((actor) => ({
    actorId: actor.actorId,
    role: actor.oaRole.toLowerCase().replace(/_/g, ' '),
    actor: actor.displayName,
    assignmentStatus: actor.status,
    detail: actor.summary,
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
      'organization',
      actor.actorId,
    ),
  }));
}

interface WorkspaceSeatAssignmentPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
  focusedMemberId?: string | null;
  activeLabActorId?: string;
}

export const WorkspaceSeatAssignmentPanel: React.FC<WorkspaceSeatAssignmentPanelProps> = ({
  summary,
  workspaceMode,
  focusedMemberId,
  activeLabActorId,
}) => {
  const rows = buildWorkspaceSeatAssignments(summary, workspaceMode, activeLabActorId);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Seat assignment</div>
      <div className="mt-2 text-sm text-slate-300">
        See which workspace seats are assigned, active, and directly reachable as employee-facing pages.
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {rows.map((row) => (
          <div
            key={`${row.role}-${row.actor}`}
            className={`rounded-2xl border p-4 ${
              focusedMemberId === row.actorId ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{row.actor}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">{row.role}</div>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-200">
                {row.assignmentStatus}
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-slate-400">{row.detail}</div>
            <div className="mt-3 flex gap-2">
              <a
                href={row.detailHref}
                className="inline-flex rounded-full bg-cyan-900/40 px-3 py-1 text-[11px] font-semibold text-cyan-100"
              >
                Inspect seat
              </a>
              <a
                href={row.pageHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
              >
                Open assigned page
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceSeatAssignmentPanel;

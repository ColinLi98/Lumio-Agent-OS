import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import {
  buildPlatformMemberSeatInvites,
  buildPlatformMembersAccessSurface,
  buildPlatformRolePageHref,
  platformRoleLabel,
} from '../services/platformContract';

export interface WorkspaceAccessRow {
  actorId: string;
  title: string;
  role: string;
  provisioning: string;
  access: string;
  detail: string;
  detailHref: string;
}

export function buildWorkspaceAccessRows(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
  activeLabActorId?: string
): WorkspaceAccessRow[] {
  return buildPlatformMemberSeatInvites(summary, workspaceMode).map((record) => ({
    actorId: record.actorId,
    title: record.title,
    role: record.oaRoles.length > 0
      ? record.oaRoles.map((role) => platformRoleLabel(role).toLowerCase()).join(' · ')
      : 'unassigned',
    provisioning: record.provisioning,
    access: record.access,
    detail: [
      record.scope,
      record.lifecycle,
      ...record.joinTrace.slice(0, 1),
      ...record.boundaryChanges.slice(0, 1),
      ...record.detailLines,
    ].join(' · '),
    detailHref: buildPlatformRolePageHref(
      'workspace',
      workspaceMode,
      activeLabActorId || 'local_tenant_admin_01',
      'members',
      record.actorId,
    ),
  }));
}

interface WorkspaceMembersPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
  focusedMemberId?: string | null;
  activeLabActorId?: string;
}

export const WorkspaceMembersPanel: React.FC<WorkspaceMembersPanelProps> = ({
  summary,
  workspaceMode,
  focusedMemberId,
  activeLabActorId,
}) => {
  const rows = buildWorkspaceAccessRows(summary, workspaceMode, activeLabActorId);
  const membersSurface = buildPlatformMembersAccessSurface(summary, workspaceMode);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Members & access</div>
          <div className="mt-2 text-lg font-semibold text-white">Who is in this workspace and what access they have</div>
          <div className="mt-2 text-sm text-slate-300">
            This page turns role seats into a visible enterprise roster, so requester, operator, and tenant-admin participation is explicit.
          </div>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
          {rows.length} member{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {rows.map((row) => (
          <div
            key={`${row.title}-${row.role}`}
            className={`rounded-2xl border p-4 ${
              focusedMemberId === row.actorId ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{row.title}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-cyan-200">{row.role}</div>
              </div>
              <div className="flex gap-2">
                <a
                  href={row.detailHref}
                  className="rounded-full bg-cyan-900/40 px-3 py-1 text-[11px] font-semibold text-cyan-100"
                >
                  Inspect seat
                </a>
                <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-200">
                  {row.access}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Provisioning</div>
                <div className="mt-1 text-xs text-slate-200">{row.provisioning}</div>
              </div>
              <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Access</div>
                <div className="mt-1 text-xs text-slate-200">{row.access}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {row.detail.split(' · ').slice(0, 4).map((line, index) => (
                <div key={`${row.actorId}-${index}`} className="rounded-xl bg-slate-900/70 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {index === 0 ? 'Seat scope' : index === 1 ? 'Invite / lifecycle' : index === 2 ? 'Join trace' : 'Boundary change'}
                  </div>
                  <div className="mt-1 text-xs text-slate-200">{line}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs leading-5 text-slate-400">{row.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Boundary history</div>
          <div className="mt-3 space-y-2">
            {membersSurface.boundaryHistory.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] text-slate-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Change history</div>
          <div className="mt-3 space-y-2">
            {membersSurface.changeHistory.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] text-slate-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Invite lifecycle</div>
          <div className="mt-3 space-y-2">
            {membersSurface.inviteLifecycle.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] text-slate-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Join trace</div>
          <div className="mt-3 space-y-2">
            {membersSurface.joinTrace.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] text-slate-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Seat / member transitions</div>
          <div className="mt-3 space-y-2">
            {membersSurface.stateTransitions.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] text-slate-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Workspace admin boundary</div>
          <div className="mt-3 space-y-2">
            {membersSurface.workspaceAdminBoundaries.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="rounded-xl bg-slate-900/80 px-3 py-2">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] text-slate-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Governed-flow linkage</div>
        <div className="mt-3 space-y-2">
          {membersSurface.governedFlowLinkage.map((line) => (
            <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceMembersPanel;

import React from 'react';
import type { ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import {
  buildPlatformActorIdentities,
  buildPlatformMemberSeatInvites,
  buildPlatformRolePageHref,
  labActorIdForOaRole,
  normalizeOaRole,
} from '../services/platformContract';

export interface WorkspaceSeatDetail {
  actorId: string;
  actorLabel: string;
  roleLabel: string;
  statusLabel: string;
  summary: string;
  provisioning: string;
  access: string;
  sessionId?: string;
  pageHref: string;
  workItems: string[];
  handoffItems: string[];
  evidenceBoundary: string;
  nextAction: string;
}

export function buildWorkspaceSeatDetail(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
  focusedMemberId: string | null | undefined
): WorkspaceSeatDetail | null {
  if (!summary || !focusedMemberId) return null;
  const actors = buildPlatformActorIdentities(summary, workspaceMode);
  const actor = actors.find((item) => item.actorId === focusedMemberId) || actors[0];
  if (!actor) return null;
  const workItems = summary.requester_inbox.items
    .filter((item) => normalizeOaRole(item) === actor.oaRole)
    .slice(0, 3)
    .map((item) => `${item.goal} · ${item.group.toLowerCase().replace(/_/g, ' ')}`);
  const handoffItems = workspaceMode === 'local_lab'
    ? summary.local_role_lab.handoff_timeline
        .filter((step) => normalizeOaRole(step.from_role) === actor.oaRole || normalizeOaRole(step.to_role) === actor.oaRole)
        .slice(0, 3)
        .map((step) => `${step.title} · ${step.status.toLowerCase()}`)
    : summary.remaining_blockers
        .slice(0, 3)
        .map((blocker) => `${blocker.summary} · ${blocker.owner_label}`);

  return {
    actorId: actor.actorId,
    actorLabel: actor.displayName,
    roleLabel: actor.oaRole.toLowerCase().replace(/_/g, ' '),
    statusLabel: actor.status,
    summary: actor.summary,
    provisioning: actor.provisioning,
    access: actor.access,
    sessionId: actor.sessionId,
    pageHref: buildPlatformRolePageHref(
      actor.page,
      workspaceMode,
      workspaceMode === 'local_lab'
        ? actor.page === 'workspace'
          ? actor.actorId
          : labActorIdForOaRole(actor.oaRole)
        : undefined,
      undefined,
      actor.page === 'workspace' ? actor.actorId : undefined,
    ),
    workItems,
    handoffItems,
    evidenceBoundary: workspaceMode === 'local_lab'
      ? summary.local_role_lab.evidence_classification_summary
      : 'Only real pilot artifacts can advance real pilot evidence categories.',
    nextAction: summary.next_action,
  };
}

interface WorkspaceSeatDetailPanelProps {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
  focusedMemberId?: string | null;
  onFocusMember?: (memberId: string) => void;
}

export const WorkspaceSeatDetailPanel: React.FC<WorkspaceSeatDetailPanelProps> = ({
  summary,
  workspaceMode,
  focusedMemberId,
  onFocusMember,
}) => {
  const detail = buildWorkspaceSeatDetail(summary, workspaceMode, focusedMemberId);

  if (!detail) return null;

  const seatOptions = buildPlatformMemberSeatInvites(summary, workspaceMode).map((record) => ({
    actorId: record.actorId,
    label: record.title,
  }));

  return (
    <div className="rounded-3xl border border-cyan-700/40 bg-cyan-950/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Seat detail</div>
          <div className="mt-2 text-2xl font-semibold text-white">{detail.actorLabel}</div>
          <div className="mt-1 text-sm text-cyan-100/90">{detail.roleLabel} · {detail.statusLabel}</div>
          <div className="mt-3 max-w-3xl text-sm leading-6 text-cyan-50/90">{detail.summary}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {seatOptions.map((option) => (
            <button
              key={option.actorId}
              onClick={() => onFocusMember?.(option.actorId)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                option.actorId === detail.actorId
                  ? 'bg-cyan-300 text-slate-950'
                  : 'bg-slate-900/80 text-cyan-100'
              }`}
            >
              {option.label}
            </button>
          ))}
          <a
            href={detail.pageHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-cyan-100"
          >
            Open role page
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-800/50 bg-slate-950/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Provisioning</div>
          <div className="mt-2 text-sm font-medium text-white">{detail.provisioning}</div>
        </div>
        <div className="rounded-2xl border border-cyan-800/50 bg-slate-950/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Access</div>
          <div className="mt-2 text-sm font-medium text-white">{detail.access}</div>
        </div>
        <div className="rounded-2xl border border-cyan-800/50 bg-slate-950/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Session</div>
          <div className="mt-2 text-sm font-medium text-white">{detail.sessionId || 'No explicit session id'}</div>
        </div>
        <div className="rounded-2xl border border-cyan-800/50 bg-slate-950/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Next action</div>
          <div className="mt-2 text-sm font-medium text-white">{detail.nextAction}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current work</div>
          <div className="mt-3 space-y-2">
            {(detail.workItems.length > 0 ? detail.workItems : ['No direct work items on this seat yet.']).map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                {line}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Handoffs & dependencies</div>
          <div className="mt-3 space-y-2">
            {(detail.handoffItems.length > 0 ? detail.handoffItems : ['No handoff items are visible for this seat.']).map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">Evidence boundary</div>
        <div className="mt-2 text-xs leading-5 text-amber-100">{detail.evidenceBoundary}</div>
      </div>
    </div>
  );
};

export default WorkspaceSeatDetailPanel;

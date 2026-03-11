import React, { useEffect, useMemo, useState } from 'react';
import type { ProductShellSummary } from '../services/agentKernelShellApi';
import { acceptSharedTrialInvite } from '../services/localRoleLabTaskStore';
import type { EnterpriseOARole } from '../services/enterpriseOAShell';
import {
  buildPlatformTrialInviteRecords,
  buildStandaloneTrialJoinRouteHref,
  platformRoleLabel,
} from '../services/platformContract';

export interface TrialJoinInviteRow {
  inviteId: string;
  roleLabel: string;
  inviteCode: string;
  status: string;
  acceptedLabel?: string;
  claimHref: string;
  lifecycle: string;
  joinTrace: string[];
}

export function buildTrialJoinInviteRows(summary: ProductShellSummary | null): TrialJoinInviteRow[] {
  return buildPlatformTrialInviteRecords(summary).map((invite) => ({
    inviteId: invite.entityId,
    roleLabel: invite.oaRoles[0] ? platformRoleLabel(invite.oaRoles[0]).toLowerCase() : invite.title.toLowerCase(),
    inviteCode: invite.inviteCode || '',
    status: invite.status.toUpperCase(),
    acceptedLabel: invite.acceptedLabel,
    claimHref: buildStandaloneTrialJoinRouteHref(invite.inviteCode),
    lifecycle: invite.lifecycle,
    joinTrace: invite.joinTrace,
  }));
}

interface TrialJoinPanelProps {
  summary: ProductShellSummary | null;
  initialInviteCode?: string | null;
  actorLabel?: string;
  onUpdated?: () => void;
  onInviteCodeChange?: (inviteCode: string | null) => void;
  onAccepted?: (acceptance: {
    participantId: string;
    actorRole: EnterpriseOARole;
    actorLabel: string;
    seatId: string;
  }) => void;
}

export const TrialJoinPanel: React.FC<TrialJoinPanelProps> = ({
  summary,
  initialInviteCode,
  actorLabel,
  onUpdated,
  onInviteCodeChange,
  onAccepted,
}) => {
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [participantLabel, setParticipantLabel] = useState(actorLabel || '');

  useEffect(() => {
    setInviteCode(initialInviteCode || '');
  }, [initialInviteCode]);

  useEffect(() => {
    if (!participantLabel && actorLabel) {
      setParticipantLabel(actorLabel);
    }
  }, [participantLabel, actorLabel]);

  const rows = useMemo(() => buildTrialJoinInviteRows(summary), [summary]);
  const canAcceptInvite = inviteCode.trim().length > 0;
  const openInvites = rows.filter((row) => row.status === 'OPEN').length;
  const acceptedInvites = rows.filter((row) => row.status === 'ACCEPTED').length;

  const acceptInvite = async (code?: string) => {
    const nextCode = (code || inviteCode).trim();
    if (!nextCode) return;
    const acceptance = await acceptSharedTrialInvite({
      inviteCode: nextCode,
      actorLabel: participantLabel.trim() || actorLabel || 'Joined trial participant',
    });
    onInviteCodeChange?.(nextCode);
    onAccepted?.(acceptance);
    onUpdated?.();
  };

  return (
    <div className="rounded-3xl border border-cyan-700/40 bg-cyan-950/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Trial join</div>
          <div className="mt-2 text-lg font-semibold text-white">Join the shared enterprise sandbox</div>
          <div className="mt-2 text-sm leading-6 text-cyan-50/90">
            Use an invite code to claim a rehearsal seat in the shared trial workspace. This is still non-pilot and never counts as REAL_PILOT evidence.
          </div>
        </div>
        <div className="rounded-full border border-cyan-700/40 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
          Trial only
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr),minmax(0,1.1fr),auto]">
        <input
          value={inviteCode}
          onChange={(event) => {
            const next = event.target.value;
            setInviteCode(next);
            onInviteCodeChange?.(next || null);
          }}
          placeholder="Paste invite code"
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          aria-label="Trial invite code"
        />
        <input
          value={participantLabel}
          onChange={(event) => setParticipantLabel(event.target.value)}
          placeholder="Participant label"
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          aria-label="Trial participant label"
        />
        <button
          onClick={() => { acceptInvite().catch(() => undefined); }}
          disabled={!canAcceptInvite}
          title={canAcceptInvite ? 'Accept the current invite code' : 'Paste an invite code to enable acceptance'}
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Accept invite
        </button>
      </div>

      {!canAcceptInvite && (
        <div className="mt-3 text-xs text-cyan-100/80">
          Paste an invite code to enable the trial-seat acceptance CTA.
        </div>
      )}

      {inviteCode.trim() && (
        <div className="mt-4 rounded-2xl border border-cyan-700/40 bg-slate-950/70 px-4 py-3 text-sm text-cyan-50">
          Invite link detected for <span className="font-semibold">{inviteCode.trim()}</span>. Accept it here to claim a trial seat without leaving the enterprise sandbox.
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Open invites: {openInvites}</div>
            <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Accepted invites: {acceptedInvites}</div>
            <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Lifecycle source: shared trial workspace</div>
          </div>
          {rows.slice(0, 6).map((row) => (
            <div key={row.inviteId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/80 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">{row.roleLabel}</div>
                <div className="mt-1 text-xs text-slate-400">{row.inviteCode}</div>
                {row.acceptedLabel && (
                  <div className="mt-1 text-[11px] text-cyan-200">Accepted by {row.acceptedLabel}</div>
                )}
                <div className="mt-1 text-[11px] text-slate-400">{row.lifecycle}</div>
                {row.joinTrace.slice(0, 2).map((line) => (
                  <div key={`${row.inviteId}-${line}`} className="mt-1 text-[11px] text-slate-500">{line}</div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  {row.status}
                </div>
                <a
                  href={row.claimHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
                >
                  Open join link
                </a>
                {row.status === 'OPEN' && (
                  <button
                    onClick={() => {
                      setInviteCode(row.inviteCode);
                      onInviteCodeChange?.(row.inviteCode);
                      acceptInvite(row.inviteCode).catch(() => undefined);
                    }}
                    className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-cyan-100"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrialJoinPanel;

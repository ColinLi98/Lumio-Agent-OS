import React from 'react';
import type {
  PlatformCapabilityDecision,
} from '../services/platformContract';
import { buildPlatformAdminWorkflowSurface } from '../services/platformContract';
import type { ProductShellSummary } from '../services/agentKernelShellApi';

export interface CurrentWorkspaceJoinLine {
  title: string;
  detail: string;
}

export function buildCurrentWorkspaceJoinLines(
  summary: ProductShellSummary | null,
  capability: PlatformCapabilityDecision,
  enterpriseInviteToken?: string | null,
): CurrentWorkspaceJoinLine[] {
  const pendingInvites = summary?.enterprise_account?.pending_invites || [];
  const latestInvite = pendingInvites[0];
  return [
    {
      title: enterpriseInviteToken ? 'Invite token' : 'Join token',
      detail: enterpriseInviteToken
        ? 'This route carries a current-workspace enterprise invite token.'
        : 'No enterprise invite token is present on this route, so join stays explanatory only.',
    },
    {
      title: 'Pending invites',
      detail: `${pendingInvites.length} invite${pendingInvites.length === 1 ? '' : 's'} visible for the active session.`,
    },
    {
      title: 'Invite lifecycle',
      detail: latestInvite
        ? `${latestInvite.status.toLowerCase().replace(/_/g, ' ')} · invited by ${latestInvite.invited_by_label} · ${latestInvite.workspace_id || 'tenant default'}`
        : 'No current-workspace invite lifecycle is visible in this session.',
    },
    {
      title: 'Join boundary',
      detail: capability.reason,
    },
    {
      title: 'Access change',
      detail: capability.enabled
        ? 'Accepting the invite will bind the role assignment to this signed-in enterprise session.'
        : 'Workspace access does not change until the join boundary clears.',
    },
    {
      title: 'Join trace',
      detail: latestInvite
        ? `Invite issued -> sign in with Okta -> explicit accept -> role binding under current workspace.`
        : 'Join trace remains incomplete until an invite is visible on this route.',
    },
  ];
}

interface CurrentWorkspaceJoinPanelProps {
  summary: ProductShellSummary | null;
  signInCapability: PlatformCapabilityDecision;
  acceptCapability: PlatformCapabilityDecision;
  enterpriseInviteToken?: string | null;
  busy?: boolean;
  onSignIn?: () => void;
  onAcceptInvite?: () => void;
}

export const CurrentWorkspaceJoinPanel: React.FC<CurrentWorkspaceJoinPanelProps> = ({
  summary,
  signInCapability,
  acceptCapability,
  enterpriseInviteToken,
  busy = false,
  onSignIn,
  onAcceptInvite,
}) => {
  const lines = buildCurrentWorkspaceJoinLines(summary, acceptCapability, enterpriseInviteToken);
  const pendingInvites = summary?.enterprise_account?.pending_invites || [];
  const workflows = buildPlatformAdminWorkflowSurface(summary || null)
    .items
    .filter((item) => item.role === 'WORKSPACE_ADMIN')
    .slice(0, 2);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Current-workspace join</div>
          <div className="mt-2 text-sm text-slate-300">
            Join stays explicit on the current workspace path: the shell shows the invite boundary, the access change, and why the mutation is or is not available.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {signInCapability.visible && (
            <button
              onClick={onSignIn}
              disabled={busy || !signInCapability.enabled}
              className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Working...' : 'Sign in with Okta'}
            </button>
          )}
          {acceptCapability.visible && enterpriseInviteToken && (
            <button
              onClick={onAcceptInvite}
              disabled={busy || !acceptCapability.enabled}
              className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Applying…' : 'Accept invite'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {lines.map((line) => (
          <div key={line.title} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{line.title}</div>
            <div className="mt-2 text-xs leading-5 text-slate-200">{line.detail}</div>
          </div>
        ))}
      </div>

      {pendingInvites.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visible pending invites</div>
          {pendingInvites.map((invite) => (
            <div key={invite.invite_id} className="rounded-2xl bg-slate-950/80 px-4 py-3 text-xs text-slate-200">
              {invite.email} · {invite.role.toLowerCase().replace(/_/g, ' ')} · {invite.workspace_id || 'tenant default'} · invited by {invite.invited_by_label}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-2xl bg-slate-950/80 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace admin join workflows</div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {workflows.map((workflow) => (
            <div key={workflow.title} className="rounded-xl bg-slate-900/80 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">{workflow.section}</div>
              <div className="mt-1 text-xs font-semibold text-white">{workflow.title}</div>
              <div className="mt-1 text-[11px] text-slate-300">{workflow.summary}</div>
              <div className="mt-2 text-[11px] text-slate-400">Next action: {workflow.nextAction}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CurrentWorkspaceJoinPanel;

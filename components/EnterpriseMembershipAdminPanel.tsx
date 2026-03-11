import React, { useEffect, useMemo, useState } from 'react';
import type { ProductShellSummary } from '../services/agentKernelShellApi';
import {
  assignEnterpriseRole,
  deactivateEnterpriseMember,
  inviteEnterpriseMember,
  reactivateEnterpriseMember,
  removeEnterpriseRole,
  revokeEnterpriseInvite,
} from '../services/agentKernelShellApi';
import { ENTERPRISE_OA_V1_ROLES } from '../services/enterpriseOAShell';
import { normalizeOaRole, platformRoleLabel, type PlatformCapabilityDecision } from '../services/platformContract';

interface EnterpriseMembershipAdminPanelProps {
  summary: ProductShellSummary | null;
  capability?: PlatformCapabilityDecision;
  focusedMemberId?: string | null;
  onUpdated?: () => void;
}

export const EnterpriseMembershipAdminPanel: React.FC<EnterpriseMembershipAdminPanelProps> = ({
  summary,
  capability,
  focusedMemberId,
  onUpdated,
}) => {
  const [email, setEmail] = useState('');
  const [principalId, setPrincipalId] = useState('');
  const [role, setRole] = useState<string>('REQUESTER');
  const [message, setMessage] = useState<string | null>(null);
  const membership = summary?.enterprise_membership;
  const canManage = capability?.enabled ?? false;
  const reason = capability?.reason || 'Enterprise member management becomes available when a signed-in enterprise admin session is present.';
  const canInvite = email.trim().length > 0;
  const canMutatePrincipal = principalId.trim().length > 0;
  const focusedMember = useMemo(
    () => membership?.members.find((member) => member.principal_id === focusedMemberId) || null,
    [focusedMemberId, membership?.members]
  );

  useEffect(() => {
    if (!focusedMemberId || !focusedMember) return;
    setPrincipalId((current) => current || focusedMember.principal_id);
  }, [focusedMember, focusedMemberId]);

  if (!membership) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Enterprise membership admin</div>
        <div className="mt-3 text-sm text-slate-300">
          {reason}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Enterprise membership admin</div>
        <div className="mt-2 text-sm text-slate-300">
          Invite members, assign/remove OA roles, and deactivate enterprise members at tenant/workspace scope.
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {canManage
            ? 'Current-workspace membership writes are explicitly enabled for this session.'
            : reason}
        </div>
      </div>

      {message && (
        <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-cyan-100">
          {message}
        </div>
      )}

      {focusedMember && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Focused member</div>
          <div className="mt-2 text-sm font-semibold text-white">{focusedMember.display_name || focusedMember.email}</div>
          <div className="mt-1 text-xs text-slate-400">{focusedMember.principal_id}</div>
          <div className="mt-3 grid gap-2 xl:grid-cols-3">
            <div className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
              Status: {focusedMember.status.toLowerCase()}
            </div>
            <div className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
              Roles: {focusedMember.role_assignments.length > 0
                ? focusedMember.role_assignments.map((assignment) => platformRoleLabel(normalizeOaRole(assignment.role) || 'REQUESTER')).join(', ')
                : 'none'}
            </div>
            <div className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
              Workspace scope: {focusedMember.workspace_ids.join(', ') || 'tenant default'}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Member email"
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
        >
          {ENTERPRISE_OA_V1_ROLES.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <button
          onClick={() => {
            inviteEnterpriseMember({
              email,
              role,
              workspace_id: membership.workspace_id,
            }).then(() => {
              setMessage(`Invited ${email} as ${role.toLowerCase().replace(/_/g, ' ')}.`);
              setEmail('');
              onUpdated?.();
            }).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
          }}
          disabled={!canManage || !canInvite}
          title={canManage
            ? canInvite ? 'Invite a member with the selected OA role' : 'Enter a member email to enable this CTA'
            : reason}
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Invite member
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),180px,180px,180px,180px]">
        <input
          value={principalId}
          onChange={(event) => setPrincipalId(event.target.value)}
          placeholder="Principal id"
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
        />
        <button
          onClick={() => {
            assignEnterpriseRole({
              principal_id: principalId,
              role,
              workspace_id: membership.workspace_id,
            }).then(() => {
              setMessage(`Assigned ${role.toLowerCase().replace(/_/g, ' ')} to ${principalId}.`);
              onUpdated?.();
            }).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
          }}
          disabled={!canManage || !canMutatePrincipal}
          title={canManage
            ? canMutatePrincipal ? 'Assign the selected role to this principal' : 'Enter a principal id to enable this CTA'
            : reason}
          className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Assign role
        </button>
        <button
          onClick={() => {
            removeEnterpriseRole({
              principal_id: principalId,
              role,
              workspace_id: membership.workspace_id,
            }).then(() => {
              setMessage(`Removed ${role.toLowerCase().replace(/_/g, ' ')} from ${principalId}.`);
              onUpdated?.();
            }).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
          }}
          disabled={!canManage || !canMutatePrincipal}
          title={canManage
            ? canMutatePrincipal ? 'Remove the selected role from this principal' : 'Enter a principal id to enable this CTA'
            : reason}
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove role
        </button>
        <button
          onClick={() => {
            deactivateEnterpriseMember({
              principal_id: principalId,
            }).then(() => {
              setMessage(`Deactivated ${principalId}.`);
              onUpdated?.();
            }).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
          }}
          disabled={!canManage || !canMutatePrincipal}
          title={canManage
            ? canMutatePrincipal ? 'Deactivate this enterprise member' : 'Enter a principal id to enable this CTA'
            : reason}
          className="rounded-full bg-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Deactivate
        </button>
        <button
          onClick={() => {
            reactivateEnterpriseMember({
              principal_id: principalId,
            }).then(() => {
              setMessage(`Reactivated ${principalId}.`);
              onUpdated?.();
            }).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
          }}
          disabled={!canManage || !canMutatePrincipal}
          title={canManage
            ? canMutatePrincipal ? 'Reactivate this enterprise member' : 'Enter a principal id to enable this CTA'
            : reason}
          className="rounded-full bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reactivate
        </button>
      </div>

      {(!canInvite || !canMutatePrincipal) && (
        <div className="text-xs text-slate-400">
          Empty inputs keep membership CTAs disabled so the shell never shows a clickable no-op.
        </div>
      )}

      {membership.invites.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Invites</div>
          {membership.invites.map((invite) => (
            <div key={invite.invite_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/80 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">{invite.email}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {platformRoleLabel(normalizeOaRole(invite) || 'REQUESTER').toLowerCase()} · {invite.status.toLowerCase().replace(/_/g, ' ')}
                </div>
              </div>
              {invite.status === 'OPEN' && (
                <button
                  onClick={() => {
                    revokeEnterpriseInvite(invite.invite_id).then(() => {
                      setMessage(`Revoked invite for ${invite.email}.`);
                      onUpdated?.();
                    }).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
                  }}
                  disabled={!canManage}
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-950"
                >
                  Revoke invite
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnterpriseMembershipAdminPanel;

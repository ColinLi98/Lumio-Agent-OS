import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, ShieldCheck, Users } from 'lucide-react';
import { getProductShellSummary, type ProductShellSummary, type EnterpriseOARole } from '../services/agentKernelShellApi';
import { TrialJoinPanel } from './TrialJoinPanel';
import { EnvironmentTruthBanner } from './EnvironmentTruthBanner';
import {
  buildAcceptedRolePageHref as buildAcceptedRoleHref,
  buildPlatformRouteHref,
  buildStandaloneTrialJoinRouteHref,
  labActorIdForOaRole,
  parseStandaloneTrialJoinRouteSearch,
  rolePageForOaRole,
} from '../services/platformContract';

interface StandaloneTrialJoinViewProps {
  isDark: boolean;
}

function resolveInitialInviteCode(): string | null {
  if (typeof window === 'undefined') return null;
  return parseStandaloneTrialJoinRouteSearch(window.location.search).inviteCode;
}

function resolveInitialLabActorId(): string {
  if (typeof window === 'undefined') return 'local_tenant_admin_01';
  return new URLSearchParams(window.location.search).get('lab_actor_id') || 'local_tenant_admin_01';
}

export function rolePageForAcceptedRole(role: EnterpriseOARole): 'workspace' | 'requester' | 'operator' | 'tenant_admin' {
  return rolePageForOaRole(role);
}

export function labActorIdForAcceptedRole(role: EnterpriseOARole): string {
  return labActorIdForOaRole(role);
}

export function buildStandaloneTrialJoinHref(inviteCode?: string | null): string {
  return buildStandaloneTrialJoinRouteHref(inviteCode);
}

export function buildAcceptedRolePageHref(
  role: EnterpriseOARole,
  inviteCode?: string | null,
): string {
  return buildAcceptedRoleHref(role, inviteCode);
}

export const StandaloneTrialJoinView: React.FC<StandaloneTrialJoinViewProps> = ({ isDark }) => {
  const [summary, setSummary] = useState<ProductShellSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(() => resolveInitialInviteCode());
  const [labActorId] = useState(() => resolveInitialLabActorId());
  const [acceptedParticipant, setAcceptedParticipant] = useState<{
    participantId: string;
    actorRole: EnterpriseOARole;
    actorLabel: string;
    seatId: string;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setError(null);
      const next = await getProductShellSummary('local_lab', labActorId);
      setSummary(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [labActorId]);

  useEffect(() => {
    loadSummary().catch(() => undefined);
  }, [loadSummary]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(buildStandaloneTrialJoinHref(inviteCode), window.location.origin);
    window.history.replaceState({}, '', url.toString());
  }, [inviteCode]);

  const persistenceLabel = useMemo(
    () => summary?.trial_workspace?.persistence_state || 'MEMORY_ONLY',
    [summary]
  );

  return (
    <div className="w-full max-w-[1180px] mx-auto px-4 py-6">
      <div className={`overflow-hidden rounded-[28px] border ${isDark ? 'border-slate-700 bg-slate-950/95' : 'border-slate-200 bg-white/95'} shadow-[0_32px_100px_rgba(2,6,23,0.45)]`}>
        <div className="border-b border-slate-800/60 px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                <Users size={14} />
                Trial Join
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white">Join the shared enterprise sandbox</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                This is a standalone B-end invite-claim page. It is built for evaluators joining a shared enterprise trial workspace and remains strictly non-pilot.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="rounded-full border border-cyan-700/40 bg-cyan-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
                  Standalone join route
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  Trial only
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  {persistenceLabel}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Workspace</div>
                <div className="mt-2 text-base font-semibold text-white">{summary?.trial_workspace?.trial_workspace.label || 'Enterprise Trial Workspace'}</div>
                <div className="mt-2 text-xs text-cyan-100/80">
                  {summary?.trial_workspace?.trial_workspace.summary || 'Shared sandbox workspace for multi-user B-end evaluation.'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Next action</div>
                <div className="mt-2 text-sm font-medium text-white">
                  {inviteCode ? `Accept invite ${inviteCode} and claim the correct seat.` : 'Paste an invite code to claim a sandbox seat.'}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <ArrowRight size={12} />
                  {summary?.trial_workspace?.conversion_guidance_lines?.[0] || 'Trial activity remains non-pilot.'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr),340px]">
            <div className="space-y-3">
              <EnvironmentTruthBanner summary={summary?.environment_activation || null} />
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Join context</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Organization</div>
                  <div className="mt-2 text-sm font-semibold text-white">Lumi Enterprise</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence boundary</div>
                  <div className="mt-2 text-sm font-semibold text-white">Non-pilot</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr),320px]">
          <main className="space-y-5 px-6 py-5">
            {error && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                Trial join API unavailable: {error}
              </div>
            )}

            <TrialJoinPanel
              summary={summary}
              actorLabel="Trial participant"
              initialInviteCode={inviteCode}
              onInviteCodeChange={setInviteCode}
              onAccepted={setAcceptedParticipant}
              onUpdated={() => {
                loadSummary().catch(() => undefined);
              }}
            />

            {acceptedParticipant && (
              <div className="rounded-3xl border border-emerald-700/40 bg-emerald-950/20 p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Seat claimed</div>
                <div className="mt-2 text-lg font-semibold text-white">{acceptedParticipant.actorLabel}</div>
                <div className="mt-2 text-sm text-emerald-50/90">
                  The invite was accepted successfully. Continue the shared trial from the claimed role page or return to the workspace.
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={buildAcceptedRolePageHref(acceptedParticipant.actorRole, inviteCode)}
                    className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Open claimed role page
                  </a>
                  <a
                    href={buildPlatformRouteHref({
                      surface: 'platform',
                      page: 'workspace',
                      workspaceMode: 'local_lab',
                      labActorId: 'local_tenant_admin_01',
                      section: 'overview',
                      inviteCode,
                    })}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100"
                  >
                    Return to workspace
                  </a>
                </div>
              </div>
            )}
          </main>

          <aside className="border-l border-slate-800/60 px-4 py-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Building2 size={14} />
                Shared trial context
              </div>
              <div className="mt-3 space-y-2">
                <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  Participants: {summary?.trial_workspace?.participants.length ?? 0}
                </div>
                <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  Active sessions: {summary?.trial_workspace?.sessions.length ?? 0}
                </div>
                <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  Persistence: {persistenceLabel}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-amber-700/40 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                <ShieldCheck size={14} />
                Trial boundary
              </div>
              <div className="mt-3 text-sm text-amber-100">
                This route is for shared enterprise trial access only. It never creates or promotes `REAL_PILOT` evidence.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StandaloneTrialJoinView;

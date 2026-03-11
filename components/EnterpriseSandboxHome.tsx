import React from 'react';
import {
  formatTrialWorkspaceRoleLabel,
  type ProductShellSummary,
} from '../services/agentKernelShellApi';
import {
  acceptSharedTrialInvite,
  buildEnterpriseSandboxModel,
  createSharedTrialInvite,
  createSharedTrialTaskFromTemplate,
  listLocalRoleLabTasks,
  releaseSharedTrialSeat,
  type LocalRoleLabScenarioTemplateId,
} from '../services/localRoleLabTaskStore';
import { ENTERPRISE_OA_V1_ROLES, enterpriseRoleLabel, type EnterpriseOARole } from '../services/enterpriseOAShell';
import { normalizeOaRole } from '../services/platformContract';

interface EnterpriseSandboxHomeProps {
  summary: ProductShellSummary | null;
  onUpdated?: () => void;
  labActorId?: string;
}

function roleLabel(role: EnterpriseOARole | { oa_role?: EnterpriseOARole; actor_role?: EnterpriseOARole; role?: EnterpriseOARole }): string {
  const resolved = normalizeOaRole(role);
  return resolved ? enterpriseRoleLabel(resolved).toLowerCase() : 'workspace';
}

export const EnterpriseSandboxHome: React.FC<EnterpriseSandboxHomeProps> = ({ summary, onUpdated, labActorId }) => {
  const sandbox = buildEnterpriseSandboxModel(summary, listLocalRoleLabTasks());

  const runTemplate = async (templateId: LocalRoleLabScenarioTemplateId) => {
    await createSharedTrialTaskFromTemplate(templateId, { labActorId });
    onUpdated?.();
  };

  const createInvite = async (role: EnterpriseOARole) => {
    await createSharedTrialInvite(role, `${roleLabel(role)} invite`);
    onUpdated?.();
  };

  const acceptInvite = async (inviteCode: string, role: EnterpriseOARole) => {
    await acceptSharedTrialInvite({
      inviteCode,
      actorLabel: `Joined ${roleLabel(role)}`,
    });
    onUpdated?.();
  };

  const releaseSeat = async (seatId: string) => {
    await releaseSharedTrialSeat(seatId);
    onUpdated?.();
  };

  return (
    <div className="space-y-4 rounded-[28px] border border-cyan-700/40 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),rgba(15,23,42,0.96)_45%)] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Enterprise Sandbox</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">{sandbox.headline}</h2>
          <p className="mt-2 text-sm leading-6 text-cyan-50/90">{sandbox.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm font-medium text-amber-100">
          {sandbox.non_pilot_label}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {sandbox.scenario_cards.map((card) => (
          <div
            key={card.template_id}
            className={`rounded-3xl border p-4 ${
              card.status === 'ACTIVE'
                ? 'border-cyan-500/60 bg-cyan-950/20'
                : 'border-slate-800 bg-slate-950/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{card.title}</div>
                <div className="mt-2 text-xs leading-5 text-slate-300">{card.summary}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                card.status === 'ACTIVE' ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-100'
              }`}>
                {card.status}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <div>Starter seat: {card.starter_role.toLowerCase().replace(/_/g, ' ')}</div>
              <div>Role focus: {card.role_focus.join(' · ')}</div>
              <div>{card.connector_label}</div>
              <div>{card.expected_outcome}</div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { runTemplate(card.template_id).catch(() => undefined); }}
                className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950"
              >
                Run scenario
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Trial workspace</div>
              <div className="mt-2 text-sm font-medium text-white">{sandbox.trial_workspace.label}</div>
              <div className="mt-1 text-xs text-slate-300">{sandbox.trial_workspace.summary}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Participants</div>
              <div className="mt-2 text-2xl font-semibold text-white">{sandbox.trial_workspace.participant_count}</div>
              <div className="mt-1 text-xs text-slate-300">role seats visible in the shared trial workspace</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Active sessions</div>
              <div className="mt-2 text-2xl font-semibold text-white">{sandbox.trial_workspace.active_session_count}</div>
              <div className="mt-1 text-xs text-slate-300">multi-session rehearsal contexts currently tracked</div>
              <div className="mt-2 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 inline-block">
                {summary?.trial_workspace?.persistence_state || 'MEMORY_ONLY'}
              </div>
              {sandbox.persistence_detail && (
                <div className="mt-2 text-[11px] text-slate-300">{sandbox.persistence_detail}</div>
              )}
            </div>
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{sandbox.walkthrough_title}</div>
          <div className="mt-2 text-sm text-slate-300">{sandbox.walkthrough_summary}</div>
          <div className="mt-4 space-y-3">
            {sandbox.walkthrough_steps.map((step) => (
              <div key={step.step_id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{step.title}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">
                      {roleLabel(step.role as EnterpriseOARole)}
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    step.status === 'CURRENT'
                      ? 'bg-cyan-300 text-slate-950'
                      : step.status === 'DONE'
                        ? 'bg-emerald-300 text-slate-950'
                        : 'bg-slate-800 text-slate-100'
                  }`}>
                    {step.status}
                  </div>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-300">{step.summary}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-emerald-700/40 bg-emerald-950/20 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Rehearsal outcome</div>
            <div className="mt-2 text-lg font-semibold text-white">{sandbox.outcome_summary.headline}</div>
            <div className="mt-2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 inline-block">
              {sandbox.outcome_summary.status}
            </div>
            <div className="mt-3 text-sm leading-6 text-emerald-50/90">{sandbox.outcome_summary.summary}</div>
            <div className="mt-3 space-y-2">
              {sandbox.outcome_summary.detail_lines.map((line) => (
                <div key={line} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-emerald-50/90">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Role summaries</div>
            <div className="mt-3 space-y-3">
              {sandbox.role_summaries.map((role) => (
                <div key={role.role} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="text-sm font-semibold text-white">{role.title}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">{role.summary}</div>
                  <div className="mt-2 text-[11px] text-cyan-200">{role.focus}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Participants & sessions</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ENTERPRISE_OA_V1_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => { createInvite(role).catch(() => undefined); }}
                  className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-cyan-100"
                >
                  Create {roleLabel(role)} invite
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3">
              {sandbox.participants.map((participant) => (
                <div key={participant.participant_id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{participant.actor_label}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">{roleLabel(participant)}</div>
                    </div>
                    <div className="rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                      {participant.state}
                    </div>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">{participant.summary}</div>
                  {sandbox.sessions.filter((session) => session.participant_id === participant.participant_id).slice(0, 2).map((session) => (
                    <div key={session.trial_session_id} className="mt-2 rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
                      Session {session.trial_session_id} · {session.current_page} / {session.current_section}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {summary?.trial_workspace?.seats && summary.trial_workspace.seats.length > 0 && (
              <div className="mt-4 space-y-2">
                {summary.trial_workspace.seats.map((seat) => (
                  <div key={seat.seat_id} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
                    {seat.label} · {seat.claim_status}
                    {seat.claimed_via_invite_id ? ` · invite ${seat.claimed_via_invite_id}` : ''}
                    {seat.claim_status === 'CLAIMED' && (
                      <button
                        onClick={() => { releaseSeat(seat.seat_id).catch(() => undefined); }}
                        className="ml-3 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-cyan-100"
                      >
                        Release seat
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {summary?.trial_workspace?.invites && summary.trial_workspace.invites.length > 0 && (
              <div className="mt-4 space-y-2">
                {summary.trial_workspace.invites.slice(0, 4).map((invite) => (
                  <div key={invite.invite_id} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
                    {invite.label} · {formatTrialWorkspaceRoleLabel(invite)} · {invite.invite_code} · {invite.status}
                    {invite.status === 'OPEN' && (
                      <button
                        onClick={() => {
                          const role = normalizeOaRole(invite);
                          if (!role) return;
                          acceptInvite(invite.invite_code, role).catch(() => undefined);
                        }}
                        className="ml-3 rounded-full bg-cyan-900/40 px-2 py-1 text-[10px] font-semibold text-cyan-100"
                      >
                        Accept invite
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-rose-700/40 bg-rose-950/20 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">{sandbox.gap_title}</div>
            <div className="mt-3 space-y-2">
              {sandbox.gap_lines.map((line) => (
                <div key={line} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-rose-100">
                  {line}
                </div>
              ))}
            </div>
          </div>

          {sandbox.active_task_detail && (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trial task detail</div>
              <div className="mt-2 text-lg font-semibold text-white">{sandbox.active_task_detail.title}</div>
              <div className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 inline-block">
                {sandbox.active_task_detail.lifecycle}
              </div>
              <div className="mt-3 text-sm text-slate-300">{sandbox.active_task_detail.receipt_summary}</div>
              <div className="mt-3 space-y-2">
                {sandbox.active_task_detail.missing_fields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                    Missing field: {field}
                  </div>
                ))}
                {sandbox.active_task_detail.handoff_lines.map((line) => (
                  <div key={line} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                    {line}
                  </div>
                ))}
                <div className="rounded-xl bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
                  {sandbox.active_task_detail.approval_summary}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-cyan-700/40 bg-cyan-950/20 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Trial-to-pilot conversion guidance</div>
            <div className="mt-3 space-y-2">
              {sandbox.join_instructions.map((line) => (
                <div key={`join-${line}`} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-cyan-50/90">
                  {line}
                </div>
              ))}
              {sandbox.deployment_blocker && (
                <div className="rounded-xl bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
                  {sandbox.deployment_blocker}
                </div>
              )}
              {sandbox.conversion_guidance_lines.map((line) => (
                <div key={line} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-cyan-50/90">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSandboxHome;

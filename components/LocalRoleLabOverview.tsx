import React from 'react';
import type { LocalRoleLabSummary } from '../services/agentKernelShellApi';

interface LocalRoleLabOverviewProps {
  summary: LocalRoleLabSummary | null | undefined;
}

export const LocalRoleLabOverview: React.FC<LocalRoleLabOverviewProps> = ({ summary }) => {
  if (!summary?.enabled) return null;
  const activeActor = summary.actors.find((actor) => actor.is_active);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-cyan-700/50 bg-cyan-950/30 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">Rehearsal Only</div>
        <div className="mt-1 text-sm font-semibold text-white">{summary.label}</div>
        <div className="mt-1 text-xs text-cyan-100">{summary.summary}</div>
        <div className="mt-3 text-xs text-cyan-50">Active seat: {activeActor?.actor_label || summary.active_actor_id}</div>
        <div className="mt-1 text-xs text-cyan-200">{summary.scenario.title} · {summary.scenario.current_stage}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Scenario</div>
        <div className="mt-1 text-sm font-semibold text-white">{summary.scenario.title}</div>
        <div className="mt-1 text-xs text-slate-300">{summary.scenario.summary}</div>
        <div className="mt-3 space-y-1">
          {summary.scenario.focus_points.map((point) => (
            <div key={point} className="text-xs text-slate-400">{point}</div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Cross-Role Flow</div>
        <div className="mt-3 space-y-2">
          {summary.handoff_timeline.map((step) => (
            <div key={step.step_id} className="rounded-lg bg-slate-800/80 p-3">
              <div className="text-xs font-semibold text-white">
                {step.title} · {step.status.toLowerCase()}
              </div>
              <div className="mt-1 text-xs text-slate-300">{step.summary}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">Non-Pilot Evidence</div>
          <div className="mt-2 text-xs text-amber-100">{summary.evidence_classification_summary}</div>
        </div>
        <div className="rounded-xl border border-rose-700/40 bg-rose-950/20 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-200">Pilot Activation Gap</div>
          <div className="mt-2 text-xs text-rose-100">{summary.pilot_activation_gap_summary}</div>
          <div className="mt-2 text-xs text-rose-200">{summary.day_zero_blocked_summary}</div>
        </div>
      </div>
    </div>
  );
};

export default LocalRoleLabOverview;

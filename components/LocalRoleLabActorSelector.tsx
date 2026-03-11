import React from 'react';
import type { LocalRoleLabSummary } from '../services/agentKernelShellApi';

interface LocalRoleLabActorSelectorProps {
  summary: LocalRoleLabSummary | null | undefined;
  value: string;
  onChange: (actorId: string) => void;
}

export const LocalRoleLabActorSelector: React.FC<LocalRoleLabActorSelectorProps> = ({ summary, value, onChange }) => {
  if (!summary?.enabled) return null;
  const activeActor = summary.actors.find((actor) => actor.actor_id === value) || summary.actors.find((actor) => actor.is_active);
  return (
    <div className="rounded-xl border border-cyan-700/50 bg-cyan-950/30 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">Local Role Lab</div>
      <div className="text-xs text-cyan-100">{summary.summary}</div>
      <div className="mt-2 text-xs text-cyan-50">Active seat: {activeActor?.actor_label || summary.active_actor_id}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {summary.actors.map((actor) => {
          const active = actor.actor_id === value;
          return (
            <button
              key={actor.actor_id}
              onClick={() => onChange(actor.actor_id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-200'
              }`}
              title={actor.summary}
            >
              {actor.actor_label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-cyan-200">{summary.day_zero_blocked_summary}</div>
    </div>
  );
};

export default LocalRoleLabActorSelector;

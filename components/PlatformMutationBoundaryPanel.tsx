import React from 'react';
import type { PlatformMutationBoundaryItem, PlatformMutationBoundarySurface } from '../services/platformContract';

function stateTone(state: PlatformMutationBoundaryItem['state']): string {
  if (state === 'allowed') return 'border-emerald-700/40 bg-emerald-950/20 text-emerald-100';
  if (state === 'blocked') return 'border-amber-700/40 bg-amber-950/20 text-amber-100';
  if (state === 'denied') return 'border-rose-700/40 bg-rose-950/20 text-rose-100';
  if (state === 'fail_closed') return 'border-orange-700/40 bg-orange-950/20 text-orange-100';
  return 'border-slate-700 bg-slate-950/80 text-slate-100';
}

function stateLabel(state: PlatformMutationBoundaryItem['state']): string {
  return state.replace(/_/g, ' ');
}

interface PlatformMutationBoundaryPanelProps {
  surface: PlatformMutationBoundarySurface;
}

export const PlatformMutationBoundaryPanel: React.FC<PlatformMutationBoundaryPanelProps> = ({ surface }) => {
  if (surface.items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{surface.title}</div>
      <div className="mt-2 text-sm text-slate-300">{surface.summary}</div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {surface.items.map((item) => (
          <div key={item.key} className={`rounded-2xl border p-4 ${stateTone(item.state)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-1 text-xs text-slate-300">{item.reason}</div>
              </div>
              <div className="rounded-full border border-current/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
                {stateLabel(item.state)}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {item.detailLines.map((line) => (
                <div key={`${item.key}-${line}`} className="rounded-xl bg-slate-950/70 px-3 py-2 text-[11px] text-slate-200">
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformMutationBoundaryPanel;

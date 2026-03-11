import React, { useMemo } from 'react';
import PlatformStatePanel from './PlatformStatePanel';
import {
  type ProductShellSummary,
} from '../services/agentKernelShellApi';
import {
  buildPlatformTaskLifecycleEntity,
  normalizeOaRole,
  platformRoleLabel,
  type PlatformAuditReceipt,
} from '../services/platformContract';

export interface TrialTaskFocusSummary {
  taskId: string;
  title: string;
  lifecycle: string;
  receiptSummary: string;
  missingFields: string[];
  handoffLines: string[];
  approvalSummary: string;
  approvalLines: string[];
  timeline: Array<{
    id: string;
    actorRole: string;
    summary: string;
    createdAt?: number;
  }>;
  nextAction: string;
}

export function buildTrialTaskFocusSummary(
  summary: ProductShellSummary | null,
  selectedTaskId?: string | null,
): TrialTaskFocusSummary | null {
  const entity = buildPlatformTaskLifecycleEntity(summary, selectedTaskId);
  if (!entity) return null;
  return {
    taskId: entity.taskId,
    title: entity.title,
    lifecycle: entity.lifecycle,
    receiptSummary: entity.receiptSummary,
    missingFields: entity.missingFields,
    handoffLines: entity.handoffLines,
    approvalSummary: entity.approvalSummary,
    approvalLines: entity.approvalLines,
    timeline: entity.timeline.map((entry: PlatformAuditReceipt) => ({
      id: entry.receiptId,
      actorRole: entry.oaRole,
      summary: entry.summary,
      createdAt: entry.createdAt,
    })),
    nextAction: entity.nextAction,
  };
}

interface TrialTaskDetailPanelProps {
  summary: ProductShellSummary | null;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
}

export const TrialTaskDetailPanel: React.FC<TrialTaskDetailPanelProps> = ({
  summary,
  selectedTaskId,
  onSelectTask,
}) => {
  const tasks = summary?.trial_workspace?.tasks || [];
  const focus = useMemo(() => buildTrialTaskFocusSummary(summary, selectedTaskId), [summary, selectedTaskId]);

  if (tasks.length === 0) {
    return (
      <PlatformStatePanel
        kind="empty"
        title="Trial task detail"
        detail="No shared sandbox task is active yet. Run a scenario or accept a shared invite to bring task detail, handoff, and receipt context into view."
      />
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trial task detail</div>
          <div className="mt-2 text-lg font-semibold text-white">{focus?.title}</div>
          <div className="mt-2 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 inline-block">
            {focus?.lifecycle}
          </div>
        </div>
        <div className="rounded-full border border-cyan-700/40 bg-cyan-950/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
          Non-pilot
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr),minmax(0,1.1fr)]">
        <div className="space-y-2">
          {tasks.map((task) => {
            const active = task.task_id === focus?.taskId;
            return (
              <button
                key={task.task_id}
                onClick={() => onSelectTask?.(task.task_id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${
                  active ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/80'
                }`}
              >
                <div className="text-sm font-medium text-white">{task.client_name}</div>
                <div className="mt-1 text-xs text-slate-400">{task.scenario_title}</div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                  <span>{task.lifecycle}</span>
                  <span>{task.priority}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Receipt</div>
            <div className="mt-2 text-sm text-slate-200">{focus?.receiptSummary}</div>
          </div>
          <div className="rounded-2xl bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Missing fields</div>
            <div className="mt-3 space-y-2">
              {focus?.missingFields.map((field) => (
                <div key={field} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                  {field}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Handoff & next action</div>
            <div className="mt-3 space-y-2">
              {focus?.handoffLines.map((line) => (
                <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-cyan-700/40 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-50">
              {focus?.nextAction}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Approval detail</div>
            <div className="mt-3 space-y-2">
              {focus?.approvalLines.map((line) => (
                <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100">
            {focus?.approvalSummary}
          </div>
          <div className="rounded-2xl bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</div>
            <div className="mt-3 space-y-2">
              {focus?.timeline.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                  <div className="font-semibold text-cyan-100">
                    {(() => {
                      const actorRole = normalizeOaRole(entry.actorRole);
                      return actorRole ? platformRoleLabel(actorRole).toLowerCase() : 'workspace';
                    })()}
                  </div>
                  <div className="mt-1">{entry.summary}</div>
                  {entry.createdAt && (
                    <div className="mt-1 text-[10px] text-slate-400">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialTaskDetailPanel;

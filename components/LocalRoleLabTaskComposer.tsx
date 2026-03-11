import React, { useMemo, useState } from 'react';
import { createLocalRoleLabTaskFromBrief, defaultLocalRoleLabBrief, parseRequesterBrief } from '../services/localRoleLabTaskStore';

interface LocalRoleLabTaskComposerProps {
  onCreated?: () => void;
  labActorId?: string;
  onCreateTask?: (brief: string) => Promise<{ taskId: string }>;
  onTaskCreated?: (taskId: string) => void;
}

export const LocalRoleLabTaskComposer: React.FC<LocalRoleLabTaskComposerProps> = ({ onCreated, labActorId, onCreateTask, onTaskCreated }) => {
  const [brief, setBrief] = useState(defaultLocalRoleLabBrief());
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const preview = useMemo(() => parseRequesterBrief(brief), [brief]);
  const canCreate = brief.trim().length > 0;

  const handleCreate = async () => {
    if (onCreateTask) {
      const created = await onCreateTask(brief);
      setLastCreatedId(created.taskId);
      onTaskCreated?.(created.taskId);
      onCreated?.();
      return;
    }
    const record = createLocalRoleLabTaskFromBrief(brief, { labActorId });
    setLastCreatedId(record.task_id);
    onTaskCreated?.(record.task_id);
    onCreated?.();
  };

  return (
    <div className="rounded-3xl border border-cyan-700/40 bg-cyan-950/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Local role lab task runner</div>
          <div className="mt-2 text-lg font-semibold text-white">Create a real rehearsal task from requester input</div>
          <div className="mt-2 text-sm leading-6 text-cyan-50/90">
            This creates a local rehearsal task inside the enterprise platform. It is durable in the browser workspace, visible across requester/operator/tenant-admin pages, and explicitly non-pilot.
          </div>
        </div>
        {lastCreatedId && (
          <div className="rounded-full border border-cyan-700/40 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold text-cyan-100">
            Created: {lastCreatedId}
          </div>
        )}
      </div>

      <textarea
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        className="mt-4 h-52 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-cyan-400"
        aria-label="Requester brief"
      />

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Client</div>
          <div className="mt-2 text-sm font-medium text-white">{preview.client_name}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Jurisdiction</div>
          <div className="mt-2 text-sm font-medium text-white">{preview.jurisdiction}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Priority</div>
          <div className="mt-2 text-sm font-medium text-white">{preview.priority}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Outcome</div>
          <div className="mt-2 text-sm font-medium text-white">{preview.required_outcome}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => { handleCreate().catch(() => undefined); }}
          disabled={!canCreate}
          title={canCreate ? 'Run the local rehearsal task' : 'Enter a requester brief to enable this CTA'}
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run local rehearsal task
        </button>
        <div className="rounded-full border border-amber-700/40 bg-amber-950/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
          Local rehearsal only · never counts as real pilot evidence
        </div>
      </div>
    </div>
  );
};

export default LocalRoleLabTaskComposer;

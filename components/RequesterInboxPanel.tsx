import React from 'react';
import type { RequesterInboxItem, RequesterInboxSummary } from '../services/agentKernelShellApi';
import PlatformStatePanel from './PlatformStatePanel';

export function groupRequesterInboxItems(items: RequesterInboxItem[]): Array<{ key: string; label: string; items: RequesterInboxItem[] }> {
  const order: Array<[RequesterInboxItem['group'], string]> = [
    ['IN_PROGRESS', 'In progress'],
    ['BLOCKED', 'Blocked'],
    ['WAITING', 'Waiting'],
    ['COMPLETED', 'Completed'],
  ];
  return order
    .map(([key, label]) => ({
      key,
      label,
      items: items.filter((item) => item.group === key).sort((a, b) => b.updated_at - a.updated_at),
    }))
    .filter((section) => section.items.length > 0);
}

interface RequesterInboxPanelProps {
  summary: RequesterInboxSummary | null;
  workspaceMode?: 'current' | 'demo' | 'local_lab';
  onSubmitNewTask?: () => void;
  onOpenItem?: (item: RequesterInboxItem) => void;
}

export const RequesterInboxPanel: React.FC<RequesterInboxPanelProps> = ({ summary, workspaceMode, onSubmitNewTask, onOpenItem }) => {
  const groups = groupRequesterInboxItems(summary?.items || []);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Requester Inbox / Execution Inbox</div>
          <div className="text-xs text-slate-400">
            {workspaceMode === 'local_lab'
              ? 'Rehearse requester, operator, and tenant-admin handoffs locally. These items never count as pilot evidence.'
              : 'View in progress, blocked, waiting, and completed execution items.'}
          </div>
        </div>
        {onSubmitNewTask && (
          <button onClick={onSubmitNewTask} className="rounded-full bg-sky-400 px-3 py-1 text-xs font-semibold text-slate-950">
            Submit new task
          </button>
        )}
      </div>
      {groups.length === 0 ? (
        <PlatformStatePanel
          kind="empty"
          title="Requester inbox"
          detail={workspaceMode === 'local_lab' ? 'No local role lab items yet.' : 'No requester inbox items yet.'}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{group.label}</div>
              <div className="space-y-2">
                {group.items.slice(0, 4).map((item) => (
                  <div key={`${item.task_id}-${item.updated_at}`} className="rounded-lg bg-slate-800/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{item.goal}</div>
                        <div className="mt-1 text-xs text-slate-300">{item.summary}</div>
                        {item.blocker_summary && (
                          <div className="mt-1 text-xs text-amber-300">{item.blocker_summary}</div>
                        )}
                        {item.receipt_summary && (
                          <div className="mt-1 text-xs text-slate-400">{item.receipt_summary}</div>
                        )}
                        {item.actor_label && (
                          <div className="mt-1 text-[11px] text-sky-200">View: {item.actor_label}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.workspace_binding_kind === 'LOCAL_ROLE_LAB_WORKSPACE'
                            ? 'bg-cyan-300 text-slate-950'
                            : item.is_demo_data
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-700 text-slate-200'
                        }`}>
                          {item.workspace_binding_kind === 'LOCAL_ROLE_LAB_WORKSPACE'
                            ? 'LAB'
                            : item.is_demo_data
                              ? 'DEMO'
                              : 'LIVE'}
                        </div>
                        {onOpenItem && (
                          <button
                            onClick={() => onOpenItem(item)}
                            className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-cyan-100"
                          >
                            Open detail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequesterInboxPanel;

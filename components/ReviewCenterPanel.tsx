import React, { useMemo, useState } from 'react';
import type { EnterpriseCenterSummary } from '../services/agentKernelShellApi';

interface ReviewCenterPanelProps {
  centerSummary: EnterpriseCenterSummary | null;
  onDecision?: (itemId: string, decision: string) => void | Promise<void>;
  pendingItemId?: string | null;
}

export const ReviewCenterPanel: React.FC<ReviewCenterPanelProps> = ({
  centerSummary,
  onDecision,
  pendingItemId,
}) => {
  const items = centerSummary?.items || [];
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const filteredItems = useMemo(() => items.filter((item) => {
    const searchable = `${item.title} ${item.summary} ${item.detail_lines.join(' ')}`.toLowerCase();
    const q = query.trim().toLowerCase();
    if (q && !searchable.includes(q)) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  }), [items, query, statusFilter]);
  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const bucket = groups.get(item.source) || [];
      bucket.push(item);
      groups.set(item.source, bucket);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);

  const toggleSelected = (itemId: string) => {
    setSelectedItemIds((current) => current.includes(itemId)
      ? current.filter((entry) => entry !== itemId)
      : [...current, itemId]);
  };

  const runBulkDecision = async (decision: string) => {
    if (!onDecision || selectedItemIds.length === 0) return;
    for (const itemId of selectedItemIds) {
      await Promise.resolve(onDecision(itemId, decision));
    }
    setSelectedItemIds([]);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Review Center</div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review items</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centerSummary?.item_count ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actionable</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centerSummary?.actionable_count ?? 0}</div>
        </div>
      </div>
      {items.length > 0 && (
        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr),220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search review items"
            className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          >
            <option value="ALL">All statuses</option>
            {Array.from(new Set(items.map((item) => item.status))).map((status) => (
              <option key={status} value={status}>{status.toLowerCase().replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}
      {onDecision && selectedItemIds.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => { runBulkDecision('verify').catch(() => undefined); }}
            className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950"
          >
            Bulk verify ({selectedItemIds.length})
          </button>
          <button
            onClick={() => { runBulkDecision('request_evidence').catch(() => undefined); }}
            className="rounded-full bg-amber-300 px-3 py-1 text-[11px] font-semibold text-slate-950"
          >
            Bulk request evidence ({selectedItemIds.length})
          </button>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {groupedItems.map(([source, sourceItems]) => (
          <div key={source} className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {source.toLowerCase().replace(/_/g, ' ')} ({sourceItems.length})
            </div>
            {sourceItems.map((item) => (
              <div key={item.item_id} className="rounded-2xl bg-slate-950/80 px-3 py-3 text-xs text-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedItemId((current) => current === item.item_id ? null : item.item_id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-slate-300">{item.summary}</div>
                  </button>
                  {onDecision && (
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.item_id)}
                      onChange={() => toggleSelected(item.item_id)}
                      className="mt-1"
                    />
                  )}
                </div>
                <div className="mt-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 w-fit">
                  {item.status.toLowerCase().replace(/_/g, ' ')}
                </div>
                <div className="mt-2 space-y-1">
                  {(expandedItemId === item.item_id ? item.detail_lines : item.detail_lines.slice(0, 2)).map((line) => (
                    <div key={line} className="text-[11px] text-slate-400">{line}</div>
                  ))}
                </div>
                {onDecision && item.available_actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.available_actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => { Promise.resolve(onDecision(item.item_id, action)).catch(() => undefined); }}
                        disabled={pendingItemId === item.item_id}
                        className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950 disabled:opacity-60"
                      >
                        {pendingItemId === item.item_id ? 'Working...' : action.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {groupedItems.length === 0 && (
          <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
            No review items are visible yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCenterPanel;

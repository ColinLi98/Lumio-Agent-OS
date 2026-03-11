import React, { useMemo, useState } from 'react';
import type { EnterpriseCenterSummary, EnterpriseOARole, ProductShellSummary } from '../services/agentKernelShellApi';
import { buildPlatformAdminWorkflowSurface, buildPlatformAuditSurface } from '../services/platformContract';

export interface AuditReportingSummary {
  receiptCount: number;
  activityCount: number;
  details: string[];
}

export function buildAuditReportingSummary(summary: ProductShellSummary | null | undefined): AuditReportingSummary {
  const tasks = summary?.trial_workspace?.tasks || [];
  const activities = summary?.trial_workspace?.activities || [];
  return {
    receiptCount: tasks.length,
    activityCount: activities.length,
    details: activities.slice(0, 5).map((activity) => activity.summary),
  };
}

interface AuditReportingCenterPanelProps {
  summary?: ProductShellSummary | null;
  centerSummary?: EnterpriseCenterSummary | null;
  activeRole?: EnterpriseOARole;
  selectedTaskId?: string | null;
}

export const AuditReportingCenterPanel: React.FC<AuditReportingCenterPanelProps> = ({
  summary,
  centerSummary,
  activeRole = 'AUDITOR',
  selectedTaskId,
}) => {
  const audit = buildAuditReportingSummary(summary);
  const auditSurface = buildPlatformAuditSurface(summary || null, activeRole, selectedTaskId);
  const workflows = buildPlatformAdminWorkflowSurface(summary || null, selectedTaskId)
    .items
    .filter((item) => item.role === 'AUDITOR');
  const items = centerSummary?.items || [];
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'RECENT'>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const filteredTimelineLines = useMemo(() => auditSurface.timelineLines.filter((line) => {
    const q = query.trim().toLowerCase();
    if (q && !line.toLowerCase().includes(q)) return false;
    if (roleFilter !== 'ALL' && !line.toLowerCase().includes(roleFilter.toLowerCase())) return false;
    return true;
  }).slice(0, timeFilter === 'RECENT' ? 4 : 12), [auditSurface.timelineLines, query, roleFilter, timeFilter]);
  const filteredItems = useMemo(() => items.filter((item) => {
    const searchable = `${item.title} ${item.summary} ${item.detail_lines.join(' ')}`.toLowerCase();
    const q = query.trim().toLowerCase();
    if (q && !searchable.includes(q)) return false;
    if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;
    return true;
  }), [items, query, sourceFilter]);
  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const bucket = groups.get(item.source) || [];
      bucket.push(item);
      groups.set(item.source, bucket);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Audit & Reporting Center</div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Receipts</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centerSummary?.item_count ?? audit.receiptCount}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actionable</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centerSummary?.actionable_count ?? audit.activityCount}</div>
        </div>
      </div>
      {items.length > 0 && (
      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr),220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search audit items"
            className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
          <div className="grid gap-3 xl:grid-cols-3">
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All item types</option>
              {Array.from(new Set(items.map((item) => item.source))).map((source) => (
                <option key={source} value={source}>{source.toLowerCase().replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All roles</option>
              <option value="requester">Requester</option>
              <option value="approver">Approver</option>
              <option value="operator">Operator</option>
              <option value="reviewer">Reviewer</option>
              <option value="tenant">Tenant Admin</option>
              <option value="auditor">Auditor</option>
            </select>
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value as 'ALL' | 'RECENT')}
              className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All time</option>
              <option value="RECENT">Most recent</option>
            </select>
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Receipt status</div>
          <div className="mt-3 space-y-2">
            {auditSurface.receiptStatusLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Receipt completeness</div>
          <div className="mt-3 space-y-2">
            {auditSurface.receiptCompletenessLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Receipt timeline</div>
          <div className="mt-3 space-y-2">
            {filteredTimelineLines.slice(0, 6).map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Trace continuity</div>
          <div className="mt-3 space-y-2">
            {auditSurface.traceContinuityLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence bundle</div>
          <div className="mt-3 space-y-2">
            {auditSurface.evidenceBundleLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence to export</div>
          <div className="mt-3 space-y-2">
            {auditSurface.evidenceToExportLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Traceability view</div>
          <div className="mt-3 space-y-2">
            {auditSurface.traceabilityLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Filter clarity</div>
          <div className="mt-3 space-y-2">
            {auditSurface.filterClarityLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Export bundle</div>
            <button
              onClick={() => {
                if (typeof window === 'undefined') return;
                const payload = {
                  task: selectedTaskId,
                  role: activeRole,
                  query,
                  roleFilter,
                  timeFilter,
                  timeline: filteredTimelineLines,
                  evidence: auditSurface.evidenceBundleLines,
                  export: auditSurface.exportBundleLines,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = `audit-bundle-${selectedTaskId || 'workspace'}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
              }}
              className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950"
            >
              Export bundle
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {auditSurface.exportBundleLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {auditSurface.exportBoundaryLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-950/80 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Auditor workflows</div>
        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {workflows.map((workflow) => (
            <div key={workflow.title} className="rounded-xl bg-slate-900/80 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">{workflow.section}</div>
              <div className="mt-1 text-xs font-semibold text-white">{workflow.title}</div>
              <div className="mt-1 text-[11px] text-slate-300">{workflow.summary}</div>
              <div className="mt-2 text-[11px] text-slate-400">Next action: {workflow.nextAction}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {groupedItems.length > 0 ? groupedItems.map(([source, sourceItems]) => (
          <div key={source} className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {source.toLowerCase().replace(/_/g, ' ')} ({sourceItems.length})
            </div>
            {sourceItems.map((item) => (
              <button
                key={item.item_id}
                onClick={() => setExpandedItemId((current) => current === item.item_id ? null : item.item_id)}
                className="w-full rounded-2xl bg-slate-950/80 px-3 py-3 text-left text-xs text-slate-200"
              >
                <div className="font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-slate-300">{item.summary}</div>
                <div className="mt-2 space-y-1">
                  {(expandedItemId === item.item_id ? item.detail_lines : item.detail_lines.slice(0, 2)).map((line) => (
                    <div key={line} className="text-[11px] text-slate-400">{line}</div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )) : (audit.details.length > 0 ? audit.details : ['No audit-visible activity exists yet.']).map((line) => (
          <div key={line} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditReportingCenterPanel;

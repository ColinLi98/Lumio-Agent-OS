import React from 'react';
import type { EnterpriseOARole, PolicyStudioSummary, ProductShellSummary } from '../services/agentKernelShellApi';
import { buildPlatformAdminWorkflowSurface, buildPlatformPolicySurface } from '../services/platformContract';

export function buildPolicyStudioLines(summary: PolicyStudioSummary | null | undefined): string[] {
  if (!summary) return ['Policy Studio summary unavailable'];
  return [summary.summary, ...summary.detail_lines].filter(Boolean);
}

interface PolicyStudioPanelProps {
  summary: PolicyStudioSummary | null;
  productShellSummary?: ProductShellSummary | null;
  activeRole?: EnterpriseOARole;
  selectedTaskId?: string | null;
}

export const PolicyStudioPanel: React.FC<PolicyStudioPanelProps> = ({
  summary,
  productShellSummary,
  activeRole = 'POLICY_GOVERNANCE_ADMIN',
  selectedTaskId,
}) => {
  const lines = buildPolicyStudioLines(summary);
  const surface = buildPlatformPolicySurface(productShellSummary || null, activeRole, selectedTaskId);
  const workflows = buildPlatformAdminWorkflowSurface(productShellSummary || null, selectedTaskId)
    .items
    .filter((item) => item.role === 'POLICY_GOVERNANCE_ADMIN');
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-white">Policy Studio v1</div>
        <div className="text-xs text-slate-400">
          Current pack, override, rollout, simulation, and approval-governance summaries.
        </div>
      </div>
      <div className="space-y-1">
        {lines.slice(0, 8).map((line) => (
          <div key={line} className="text-xs text-slate-300">{line}</div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Policy basis</div>
          <div className="mt-3 space-y-2">
            {surface.policyBasis.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Decision trace</div>
          <div className="mt-3 space-y-2">
            {surface.decisionTrace.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Exceptions / waivers</div>
          <div className="mt-3 space-y-2">
            {surface.exceptionWaiver.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Decision rationale</div>
          <div className="mt-3 space-y-2">
            {surface.decisionRationale.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Blocked reason linkage</div>
          <div className="mt-3 space-y-2">
            {surface.blockedReasonLinkage.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Who can act</div>
          <div className="mt-3 space-y-2">
            {surface.actionAuthority.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">What changes</div>
          <div className="mt-3 space-y-2">
            {surface.changeImpact.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{line}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4 xl:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Policy / Governance admin workflows</div>
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
      </div>
    </div>
  );
};

export default PolicyStudioPanel;

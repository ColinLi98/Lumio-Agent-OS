import React, { useMemo } from 'react';
import type { EnterpriseOARole, ProductShellSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import PlatformStatePanel from './PlatformStatePanel';
import {
  buildPlatformGovernedFlowState,
  buildPlatformSectionHref,
  platformRoleLabel,
  type PlatformGovernedFlowState,
  type PlatformRolePage,
} from '../services/platformContract';

export interface GovernedFlowStatusCard {
  label: string;
  value: string;
  detail: string;
}

export function buildGovernedFlowStatusCards(flow: PlatformGovernedFlowState): GovernedFlowStatusCard[] {
  const currentStage = flow.stages.find((stage) => stage.key === flow.currentStageKey) || flow.stages[0];
  return [
    {
      label: 'Current stage',
      value: flow.currentStageLabel,
      detail: currentStage?.summary || 'No current stage summary available.',
    },
    {
      label: 'Next action',
      value: flow.nextAction,
      detail: `Role lens: ${platformRoleLabel(flow.evidence.roleLensRole)}`,
    },
    {
      label: 'Waiting on',
      value: platformRoleLabel(flow.waitingOnRole),
      detail: flow.waitingSummary,
    },
    {
      label: 'Current blocker',
      value: flow.blocker.blocked ? flow.blocker.category.toLowerCase() : 'clear',
      detail: flow.blocker.blockedBecause,
    },
    {
      label: 'Best next',
      value: flow.nextDestinationLabel,
      detail: flow.blocker.recommendedAction,
    },
  ];
}

export function buildGovernedFlowBlockedReasonLines(flow: PlatformGovernedFlowState): string[] {
  return [
    `Blocked by: ${flow.blocker.blockedBy === 'WORKSPACE' ? 'workspace' : platformRoleLabel(flow.blocker.blockedBy)}`,
    `Blocked because: ${flow.blocker.blockedBecause}`,
    `Category: ${flow.blocker.category.toLowerCase()}`,
    `Next section: ${flow.nextDestinationLabel}`,
    `Recommended action: ${flow.blocker.recommendedAction}`,
  ];
}

export function buildGovernedFlowEvidenceLines(flow: PlatformGovernedFlowState): string[] {
  return [
    `Evidence set: ${flow.evidence.evidenceSetId}`,
    `Receipt: ${flow.evidence.receiptSummary}`,
    `Approval: ${flow.evidence.approvalSummary}`,
    ...flow.evidence.evidenceItems,
  ];
}

interface GovernedFlowTaskPanelProps {
  summary: ProductShellSummary | null;
  activeRole: EnterpriseOARole;
  rolePage: PlatformRolePage;
  workspaceMode: WorkspaceMode;
  labActorId?: string | null;
  focusedMemberId?: string | null;
  selectedTaskId?: string | null;
  inviteCode?: string | null;
  enterpriseInviteToken?: string | null;
  title?: string;
}

export const GovernedFlowTaskPanel: React.FC<GovernedFlowTaskPanelProps> = ({
  summary,
  activeRole,
  rolePage,
  workspaceMode,
  labActorId,
  focusedMemberId,
  selectedTaskId,
  inviteCode,
  enterpriseInviteToken,
  title = 'Governed execution flow',
}) => {
  const flow = useMemo(
    () => buildPlatformGovernedFlowState(summary, selectedTaskId, activeRole),
    [summary, selectedTaskId, activeRole]
  );

  if (!flow) {
    return (
      <PlatformStatePanel
        kind="empty"
        title={title}
        detail="No governed task is currently selected. Pick a shared trial task to see the request-to-audit chain."
      />
    );
  }

  const cards = buildGovernedFlowStatusCards(flow);
  const blockedLines = buildGovernedFlowBlockedReasonLines(flow);
  const evidenceLines = buildGovernedFlowEvidenceLines(flow);
  const bestNextHref = buildPlatformSectionHref({
    currentPage: rolePage,
    workspaceMode,
    labActorId,
    section: flow.nextDestinationSection,
    memberId: focusedMemberId,
    trialTaskId: flow.taskId,
    inviteCode,
    oaRole: activeRole,
    enterpriseInviteToken,
  });

  return (
    <div className="rounded-3xl border border-cyan-700/40 bg-cyan-950/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">{title}</div>
          <div className="mt-2 text-lg font-semibold text-white">{flow.title}</div>
          <div className="mt-2 text-sm text-cyan-50/90">
            One shared governed-flow view across Request, Approval, Operations, Review, and Audit.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-cyan-700/40 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
            Current stage: {flow.currentStageLabel}
          </div>
          <a
            href={bestNextHref}
            className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950"
          >
            Open {flow.nextDestinationLabel}
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-2 xl:grid-cols-5">
        {flow.stages.map((stage) => {
          const href = buildPlatformSectionHref({
            currentPage: rolePage,
            workspaceMode,
            labActorId,
            section: stage.section,
            memberId: focusedMemberId,
            trialTaskId: flow.taskId,
            inviteCode,
            oaRole: activeRole,
            enterpriseInviteToken,
          });
          return (
            <a
              key={stage.key}
              href={href}
              className={`rounded-2xl border px-3 py-3 ${
                stage.status === 'CURRENT'
                  ? 'border-cyan-500/60 bg-cyan-950/30'
                  : stage.status === 'BLOCKED'
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : stage.status === 'DONE'
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{stage.label}</div>
              <div className="mt-2 text-sm font-semibold text-white">{platformRoleLabel(stage.ownerRole)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200">{stage.status.toLowerCase()}</div>
              <div className="mt-2 text-xs leading-5 text-slate-300">{stage.summary}</div>
            </a>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
            <div className="mt-2 text-sm font-semibold text-white">{card.value}</div>
            <div className="mt-2 text-xs leading-5 text-slate-400">{card.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">Blocked reason / handoff</div>
          <div className="mt-3 space-y-2">
            {blockedLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-950/80 px-3 py-2 text-xs text-amber-50/90">
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Evidence & receipt continuity</div>
          <div className="mt-2 text-xs leading-5 text-cyan-100">{flow.evidence.roleLensSummary}</div>
          <div className="mt-3 space-y-2">
            {evidenceLines.map((line) => (
              <div key={line} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Shared timeline</div>
        <div className="mt-3 space-y-2">
          {flow.timeline.map((entry) => (
            <div key={entry.receiptId} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
              <div className="font-semibold text-cyan-100">{entry.actorLabel}</div>
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
  );
};

export default GovernedFlowTaskPanel;

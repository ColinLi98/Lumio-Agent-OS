import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  Compass,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Workflow,
} from 'lucide-react';
import {
  acceptEnterpriseInvite,
  decideEnterpriseCenterItem,
  exchangeEnterpriseOidcCode,
  getEnterpriseAccountSummary,
  getEnterpriseCenterSummary,
  getEnterpriseSessionId,
  getProductShellSummary,
  setEnterpriseSessionId,
  startEnterpriseOidcAuthorization,
  type ProductShellSummary,
  type EnterpriseCenterSummary,
  type WorkspaceMode,
} from '../services/agentKernelShellApi';
import {
  createSharedTrialTaskFromBrief,
  buildLocalRoleLabFallbackProductShellSummary,
  listLocalRoleLabTasks,
  mergeLocalRoleLabProductShellSummary,
  registerSharedTrialWorkspaceSession,
  subscribeLocalRoleLabTasks,
} from '../services/localRoleLabTaskStore';
import { EnvironmentTruthBanner } from './EnvironmentTruthBanner';
import { WorkspaceModeSelector } from './WorkspaceModeSelector';
import { LocalRoleLabActorSelector } from './LocalRoleLabActorSelector';
import { LocalRoleLabOverview } from './LocalRoleLabOverview';
import { RequesterInboxPanel } from './RequesterInboxPanel';
import { TenantAdminSetupPanel, buildActivationPackageLines } from './TenantAdminSetupPanel';
import { PolicyStudioPanel } from './PolicyStudioPanel';
import { EnterpriseAccountShell } from './EnterpriseAccountShell';
import { RoleWorkboardPanel } from './RoleWorkboardPanel';
import { WorkspaceMembersPanel } from './WorkspaceMembersPanel';
import { CollaborationMapPanel } from './CollaborationMapPanel';
import { EnterpriseIdentityStatusPanel } from './EnterpriseIdentityStatusPanel';
import { EnterpriseSignInPanel } from './EnterpriseSignInPanel';
import { EnterpriseDiagnosticsPanel } from './EnterpriseDiagnosticsPanel';
import { AccessMatrixPanel } from './AccessMatrixPanel';
import { EnterpriseMembershipAdminPanel } from './EnterpriseMembershipAdminPanel';
import { OrganizationWorkspacePanel } from './OrganizationWorkspacePanel';
import { CrossRoleBoardPanel } from './CrossRoleBoardPanel';
import { EnterpriseLoginEntryPanel } from './EnterpriseLoginEntryPanel';
import { WorkspaceDirectoryPanel } from './WorkspaceDirectoryPanel';
import { WorkspaceSeatAssignmentPanel } from './WorkspaceSeatAssignmentPanel';
import { AdminActionCenterPanel } from './AdminActionCenterPanel';
import { WorkspaceSeatDetailPanel } from './WorkspaceSeatDetailPanel';
import { EnterpriseModuleAccessPanel } from './EnterpriseModuleAccessPanel';
import { EnterpriseRoleSwitcher } from './EnterpriseRoleSwitcher';
import { EnterpriseRoleCharterPanel } from './EnterpriseRoleCharterPanel';
import { ApprovalCenterPanel } from './ApprovalCenterPanel';
import { AuditReportingCenterPanel } from './AuditReportingCenterPanel';
import { ReviewCenterPanel } from './ReviewCenterPanel';
import PlatformErrorBoundary from './PlatformErrorBoundary';
import PlatformStatePanel from './PlatformStatePanel';
import { LocalRoleLabTaskComposer } from './LocalRoleLabTaskComposer';
import { EnterpriseSandboxHome } from './EnterpriseSandboxHome';
import { TrialJoinPanel } from './TrialJoinPanel';
import { TrialTaskDetailPanel } from './TrialTaskDetailPanel';
import { GovernedFlowTaskPanel } from './GovernedFlowTaskPanel';
import { MarketHome } from './MarketHome';
import { AgentMarketplacePanel } from './AgentMarketplacePanel';
import { LixTwinFusionPanel } from './LixTwinFusionPanel';
import { DestinyNavigatorPanel } from './DestinyNavigator';
import { ObservabilityDashboard } from './ObservabilityDashboard';
import {
  buildEnterpriseOAShell,
  type EnterpriseOARole,
} from '../services/enterpriseOAShell';
import {
  buildPlatformCapabilityDecisions,
  buildPlatformMemberSeatInvites,
  buildPlatformRolePageHref as buildRolePageHref,
  buildPlatformRouteIssues,
  buildPlatformRouteHref,
  buildPlatformWorkspaceContext,
  defaultOaRoleForRolePage,
  defaultSectionForOaRole,
  defaultSectionForRolePage,
  DEFAULT_LOCAL_LAB_ACTOR_IDS,
  effectiveLocalLabActorIdForRolePage,
  parsePlatformRouteSearch,
  resolvePlatformFocusedMemberId,
  resolvePlatformTrialTaskId,
  sectionsForRolePage,
  type PlatformRolePage,
  type PlatformSection,
} from '../services/platformContract';
import { trackPlatformShellDiagnostic } from '../services/platformShellDiagnostics';

export { buildRolePageHref, sectionsForRolePage };

interface EnterprisePlatformViewProps {
  isDark: boolean;
}

interface WorkspaceRosterItem {
  actorId: string;
  title: string;
  subtitle: string;
  badge: string;
  oaRole: EnterpriseOARole | null;
  rolePage: PlatformRolePage;
}

interface HeaderMetaItem {
  label: string;
  value: string;
}

interface QuickStatItem {
  label: string;
  value: string;
  detail: string;
}

interface RolePageDefinition {
  key: PlatformRolePage;
  label: string;
  title: string;
  description: string;
}

interface PlatformSectionDefinition {
  key: PlatformSection;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const SECTION_DEFINITIONS: PlatformSectionDefinition[] = [
  {
    key: 'join',
    label: 'Trial Join',
    eyebrow: 'Sandbox Access',
    title: 'Join the shared trial workspace',
    description: 'Accept a sandbox invite, claim a role seat, and land in the shared trial path without confusing trial access with real pilot activation.',
    icon: <Users size={16} />,
  },
  {
    key: 'organization',
    label: 'Organization & Workspace',
    eyebrow: 'Management',
    title: 'Manage organization and workspace context',
    description: 'Show the organization, workspace, environment, activation, and policy posture that frame the enterprise platform.',
    icon: <Building2 size={16} />,
  },
  {
    key: 'overview',
    label: 'Workspace Overview',
    eyebrow: 'Workspace',
    title: 'Enterprise workspace command center',
    description: 'See activation state, role seats, demand volume, and the current enterprise operating model in one place.',
    icon: <Building2 size={16} />,
  },
  {
    key: 'requests',
    label: 'Request Center',
    eyebrow: 'Core Module',
    title: 'Request Center',
    description: 'Requesters create work, add missing detail, review progress, and receive governed outcomes here.',
    icon: <ClipboardList size={16} />,
  },
  {
    key: 'approval',
    label: 'Approval Center',
    eyebrow: 'Core Module',
    title: 'Approval Center',
    description: 'Approvers and reviewers inspect bounded decision context, verify evidence, and control progression here.',
    icon: <ShieldCheck size={16} />,
  },
  {
    key: 'review',
    label: 'Review Center',
    eyebrow: 'Core Module',
    title: 'Review Center',
    description: 'Reviewers verify evidence, request more proof, and hand items back before promotion here.',
    icon: <ShieldAlert size={16} />,
  },
  {
    key: 'operations',
    label: 'Operations Console',
    eyebrow: 'Core Module',
    title: 'Operations Console',
    description: 'Operators own execution, blockers, timelines, and safe case progression here.',
    icon: <Workflow size={16} />,
  },
  {
    key: 'admin',
    label: 'Integration & Readiness Center',
    eyebrow: 'Core Module',
    title: 'Integration & Readiness Center',
    description: 'Tenant, workspace, and integration admins manage environment binding, actor readiness, connector posture, and workspace setup here.',
    icon: <ShieldCheck size={16} />,
  },
  {
    key: 'members',
    label: 'Members & Access',
    eyebrow: 'Workspace Access',
    title: 'See who is in the workspace and what they can do',
    description: 'Make workspace participation explicit so enterprise users can understand seats, access posture, and how roles map to work.',
    icon: <Users size={16} />,
  },
  {
    key: 'policy',
    label: 'Policy & Governance Center',
    eyebrow: 'Core Module',
    title: 'Policy & Governance Center',
    description: 'Policy, rollout, override, and governance posture live here for governance admins and selected workspace admins.',
    icon: <Sparkles size={16} />,
  },
  {
    key: 'audit',
    label: 'Audit & Reporting Center',
    eyebrow: 'Core Module',
    title: 'Audit & Reporting Center',
    description: 'Auditors inspect receipts, proof, exports, and timeline history here without mutating workflow state.',
    icon: <ShieldAlert size={16} />,
  },
  {
    key: 'marketplace',
    label: 'Marketplace',
    eyebrow: 'Market',
    title: 'Keep market and execution context in-platform',
    description: 'Marketplace, supply, and external execution context remain accessible from the enterprise platform instead of a separate demo shell.',
    icon: <Store size={16} />,
  },
  {
    key: 'navigator',
    label: 'Navigator',
    eyebrow: 'Navigator',
    title: 'Strategic guidance inside the workspace',
    description: 'Strategic navigation and twin-informed planning remain integrated into the same enterprise platform surface.',
    icon: <Compass size={16} />,
  },
  {
    key: 'observability',
    label: 'Observability',
    eyebrow: 'Operations',
    title: 'Health, telemetry, and operational visibility',
    description: 'Health and observability remain operator-facing parts of the platform rather than a disconnected engineering-only console.',
    icon: <Activity size={16} />,
  },
];

const ROLE_PAGE_DEFINITIONS: RolePageDefinition[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    title: 'Shared workspace page',
    description: 'Best for overview, onboarding, and cross-role walkthroughs.',
  },
  {
    key: 'requester',
    label: 'Requester',
    title: 'Requester page',
    description: 'Focused request intake, progress, blockers, and receipts.',
  },
  {
    key: 'operator',
    label: 'Operator',
    title: 'Operator page',
    description: 'Focused execution, handoffs, and operational workflow context.',
  },
  {
    key: 'tenant_admin',
    label: 'Tenant Admin',
    title: 'Tenant admin page',
    description: 'Focused setup, readiness, activation, and policy posture.',
  },
];

function resolveInitialRoute() {
  if (typeof window === 'undefined') {
    return parsePlatformRouteSearch('', { availableRoles: ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'] });
  }
  return parsePlatformRouteSearch(window.location.search);
}

function currentOidcRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  return url.toString();
}

function normalizeTrialTaskId(taskId: string): string {
  return taskId.split('__')[0] || taskId;
}

function moduleForSection(section: PlatformSection) {
  if (section === 'requests') return 'REQUEST_CENTER' as const;
  if (section === 'approval' || section === 'review') return 'APPROVAL_CENTER' as const;
  if (section === 'operations') return 'OPERATIONS_CONSOLE' as const;
  if (section === 'policy') return 'POLICY_GOVERNANCE_CENTER' as const;
  if (section === 'admin' || section === 'organization' || section === 'members' || section === 'join') {
    return 'INTEGRATION_READINESS_CENTER' as const;
  }
  return 'AUDIT_REPORTING_CENTER' as const;
}

export function resolvePlatformSignedInLabel(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode, localLabActorId: string): string {
  if (!summary) return 'Platform preview';
  if (summary.enterprise_account?.signed_in && summary.enterprise_account.session) {
    return summary.enterprise_account.session.display_name || summary.enterprise_account.session.email;
  }
  if (workspaceMode === 'local_lab') {
    return summary.local_role_lab.actors.find((actor) => actor.actor_id === localLabActorId)?.actor_label || 'Local Tenant Admin';
  }
  if (workspaceMode === 'current') {
    return 'Enterprise session required';
  }
  const readyActor = summary.environment_activation.actor_availability.find((actor) => actor.state === 'READY');
  return readyActor?.actor_label || readyActor?.actor_id || 'Workspace member';
}

export function buildWorkspaceRoster(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): WorkspaceRosterItem[] {
  return buildPlatformMemberSeatInvites(summary, workspaceMode).map((record) => ({
    actorId: record.actorId,
    title: record.title,
    subtitle: record.summary,
    badge: record.oaRoles[0] ? record.oaRoles[0].toLowerCase().replace(/_/g, ' ') : record.status,
    oaRole: record.oaRoles[0] || null,
    rolePage: record.page,
  }));
}

export function buildPlatformGapLines(summary: ProductShellSummary | null): string[] {
  if (!summary) return ['Workspace activation summary unavailable.'];
  const lines = [
    summary.activation_package.summary,
    ...summary.remaining_blockers.slice(0, 4).map((item) => `${item.owner_label}: ${item.missing_artifact}`),
  ].filter(Boolean);
  return lines.length > 0 ? lines : ['No current workspace gap summary available.'];
}

export function buildPlatformHeaderMeta(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): HeaderMetaItem[] {
  if (!summary) {
    return [
      { label: 'Organization', value: 'Lumio' },
      { label: 'Workspace', value: 'Platform preview' },
      { label: 'Environment', value: 'Unknown' },
    ];
  }
  return [
    { label: 'Organization', value: 'Lumio' },
    {
      label: 'Workspace',
      value: workspaceMode === 'local_lab'
        ? summary.local_role_lab.label
        : summary.environment_activation.environment_label || 'Workspace',
    },
    { label: 'Environment', value: summary.environment_activation.environment_kind },
    { label: 'Activation', value: summary.environment_activation.pilot_activation_status.replace(/_/g, ' ') },
  ];
}

export function buildPlatformQuickStats(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): QuickStatItem[] {
  if (!summary) {
    return [
      { label: 'Requests', value: '0', detail: 'No summary loaded yet' },
      { label: 'Seats', value: '0', detail: 'No workspace seats loaded yet' },
    ];
  }
  const seats = workspaceMode === 'local_lab'
    ? (summary.trial_workspace?.seats.length || summary.local_role_lab.actors.length)
    : summary.environment_activation.actor_availability.length;
  return [
    {
      label: 'Requests',
      value: String(summary.requester_inbox.total_count),
      detail: `${summary.requester_inbox.in_progress_count} in progress · ${summary.requester_inbox.waiting_count} waiting`,
    },
    {
      label: 'Blocked',
      value: String(summary.requester_inbox.blocked_count),
      detail: `${summary.remaining_blockers.length} activation blockers tracked`,
    },
    {
      label: 'Seats',
      value: String(seats),
      detail: workspaceMode === 'local_lab'
        ? 'Requester, operator, and tenant-admin rehearsal seats'
        : 'Workspace actor availability',
    },
    {
      label: 'Policy',
      value: summary.policy_studio.pack_name || 'Policy Studio',
      detail: summary.policy_studio.summary || 'Policy summary unavailable',
    },
  ];
}

export function buildRoleContextLines(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode, localLabActorId: string): string[] {
  if (!summary) return ['Role context unavailable.'];
  if (workspaceMode === 'local_lab') {
    const activeActor = summary.local_role_lab.actors.find((actor) => actor.actor_id === localLabActorId)
      || summary.local_role_lab.actors.find((actor) => actor.is_active)
      || summary.local_role_lab.actors[0];
    return [
      `Active seat: ${activeActor?.actor_label || 'Unknown seat'}`,
      `Scenario: ${summary.local_role_lab.scenario.title}`,
      `Current stage: ${summary.local_role_lab.scenario.current_stage}`,
      summary.local_role_lab.evidence_classification_summary,
    ].filter(Boolean);
  }
  const environment = summary.environment_activation;
  return [
    environment.activation_ready_summary,
    environment.environment_binding.summary,
    ...environment.missing_dependency_summaries.slice(0, 2),
  ].filter(Boolean);
}

export function buildRolePageSummaryLines(summary: ProductShellSummary | null, rolePage: PlatformRolePage): string[] {
  if (!summary) return ['Workspace role page summary unavailable.'];
  switch (rolePage) {
    case 'requester':
      return [
        `${summary.requester_inbox.total_count} total requests in this workspace`,
        `${summary.requester_inbox.completed_count} completed items with receipt context`,
        `${summary.requester_inbox.blocked_count} blocked items still need cross-role action`,
      ];
    case 'operator':
      return [
        'Operator page explains how work moves across requester, operator, and tenant-admin seats.',
        `Current stage: ${summary.local_role_lab.scenario.current_stage}`,
        `Next action: ${summary.next_action}`,
      ];
    case 'tenant_admin':
      return [
        summary.tenant_admin_setup.summary,
        `Activation package: ${summary.activation_package.status.toLowerCase().replace(/_/g, ' ')}`,
        `${summary.remaining_blockers.length} remaining blocker(s) tracked`,
      ];
    case 'workspace':
    default:
      return [
        'Workspace page shows the full cross-role system view.',
        `Seats visible: ${summary.trial_workspace?.seats.length || summary.enterprise_membership?.member_count || summary.local_role_lab.actors.length || summary.environment_activation.actor_availability.length}`,
        `Activation state: ${summary.environment_activation.pilot_activation_status.toLowerCase().replace(/_/g, ' ')}`,
      ];
  }
}

function SectionShell(props: {
  definition: PlatformSectionDefinition;
  children: React.ReactNode;
  badges?: string[];
}) {
  const { definition, children, badges = [] } = props;
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/85 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {definition.icon}
              {definition.eyebrow}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{definition.title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{definition.description}</p>
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div key={badge} className="rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1 text-[11px] font-medium text-slate-200">
                  {badge}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

const EnterprisePlatformView: React.FC<EnterprisePlatformViewProps> = ({ isDark }) => {
  const [initialRoute] = useState(() => resolveInitialRoute());
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => initialRoute.workspaceMode);
  const [localLabActorId, setLocalLabActorId] = useState(() => initialRoute.labActorId);
  const [rolePage, setRolePage] = useState<PlatformRolePage>(() => initialRoute.page);
  const [activeOaRole, setActiveOaRole] = useState<EnterpriseOARole>(() => initialRoute.oaRole);
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(() => initialRoute.memberId);
  const [selectedTrialTaskId, setSelectedTrialTaskId] = useState<string | null>(() => initialRoute.trialTaskId);
  const [inviteCode, setInviteCode] = useState<string | null>(() => initialRoute.inviteCode);
  const [enterpriseInviteToken, setEnterpriseInviteToken] = useState<string | null>(() => initialRoute.enterpriseInviteToken);
  const [section, setSection] = useState<PlatformSection>(() => initialRoute.section);
  const [summary, setSummary] = useState<ProductShellSummary | null>(null);
  const [approvalCenter, setApprovalCenter] = useState<EnterpriseCenterSummary | null>(null);
  const [reviewCenter, setReviewCenter] = useState<EnterpriseCenterSummary | null>(null);
  const [auditCenter, setAuditCenter] = useState<EnterpriseCenterSummary | null>(null);
  const [enterpriseSessionIdState, setEnterpriseSessionIdState] = useState<string | null>(() => getEnterpriseSessionId() || null);
  const [pendingCenterItemId, setPendingCenterItemId] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const effectiveLocalLabActorId = useMemo(
    () => workspaceMode === 'local_lab'
      ? effectiveLocalLabActorIdForRolePage(rolePage, localLabActorId)
      : localLabActorId,
    [workspaceMode, rolePage, localLabActorId]
  );
  const oaShell = useMemo(
    () => buildEnterpriseOAShell(summary, workspaceMode, activeOaRole, moduleForSection(section)),
    [summary, workspaceMode, activeOaRole, section]
  );
  const platformContext = useMemo(
    () => buildPlatformWorkspaceContext({
      summary,
      workspaceMode,
      page: rolePage,
      section,
      oaRole: oaShell.activeRole,
      enterpriseInviteToken,
      inviteCode,
      focusedMemberId,
      selectedTrialTaskId,
    }),
    [summary, workspaceMode, rolePage, section, oaShell.activeRole, enterpriseInviteToken, inviteCode, focusedMemberId, selectedTrialTaskId]
  );
  const capabilityDecisions = useMemo(
    () => buildPlatformCapabilityDecisions(platformContext),
    [platformContext]
  );
  const routeIssues = useMemo(
    () => buildPlatformRouteIssues({
      warnings: initialRoute.warnings,
      requestedMemberId: initialRoute.memberId,
      resolvedMemberId: focusedMemberId,
      requestedTaskId: initialRoute.trialTaskId,
      resolvedTaskId: selectedTrialTaskId,
      context: platformContext,
    }),
    [initialRoute.memberId, initialRoute.trialTaskId, initialRoute.warnings, focusedMemberId, platformContext, selectedTrialTaskId]
  );

  const loadPlatform = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const shell = await getProductShellSummary(workspaceMode, effectiveLocalLabActorId);
      const nextSummary = workspaceMode === 'local_lab' && !shell.trial_workspace
        ? mergeLocalRoleLabProductShellSummary(shell, listLocalRoleLabTasks())
        : shell;
      if (workspaceMode === 'current' && enterpriseSessionIdState) {
        try {
          const account = await getEnterpriseAccountSummary();
          nextSummary.enterprise_account = account;
        } catch (accountError) {
          const message = accountError instanceof Error ? accountError.message : String(accountError);
          if (
            message === 'enterprise_session_not_found'
            || message === 'enterprise_session_not_active'
            || message === 'enterprise_session_expired'
            || message === 'enterprise_principal_not_active'
          ) {
            setEnterpriseSessionId(null);
            setEnterpriseSessionIdState(null);
            setAuthError(message);
          }
        }
      }
      setSummary(nextSummary);
      if (workspaceMode === 'current' && enterpriseSessionIdState) {
        const [approval, review, audit] = await Promise.all([
          getEnterpriseCenterSummary('APPROVAL').catch(() => null),
          getEnterpriseCenterSummary('REVIEW').catch(() => null),
          getEnterpriseCenterSummary('AUDIT').catch(() => null),
        ]);
        setApprovalCenter(approval);
        setReviewCenter(review);
        setAuditCenter(audit);
      } else {
        setApprovalCenter(null);
        setReviewCenter(null);
        setAuditCenter(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (workspaceMode === 'local_lab') {
        const fallbackSummary = buildLocalRoleLabFallbackProductShellSummary(listLocalRoleLabTasks());
        setSummary(fallbackSummary);
        setApprovalCenter(null);
        setReviewCenter(null);
        setAuditCenter(null);
        setError(`Local fallback active: ${message}`);
        trackPlatformShellDiagnostic('load_failure', {
          workspaceMode,
          fallback: 'local_lab',
          message,
        });
      } else {
        setError(message);
        trackPlatformShellDiagnostic('load_failure', {
          workspaceMode,
          fallback: 'none',
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceMode, effectiveLocalLabActorId, enterpriseSessionIdState]);

  useEffect(() => {
    loadPlatform().catch(() => undefined);
  }, [loadPlatform]);

  useEffect(() => {
    if (workspaceMode !== 'local_lab') return;
    return subscribeLocalRoleLabTasks(() => {
      loadPlatform().catch(() => undefined);
    });
  }, [workspaceMode, loadPlatform]);

  useEffect(() => {
    if (workspaceMode !== 'local_lab') return;
    registerSharedTrialWorkspaceSession({
      labActorId: effectiveLocalLabActorId,
      oaRole: activeOaRole,
      page: rolePage,
      section,
    }).catch(() => undefined);
  }, [workspaceMode, effectiveLocalLabActorId, activeOaRole, rolePage, section]);

  useEffect(() => {
    if (!summary) return;
    const nextTaskId = resolvePlatformTrialTaskId(summary, selectedTrialTaskId);
    if (nextTaskId !== selectedTrialTaskId) {
      setSelectedTrialTaskId(nextTaskId);
    }
  }, [summary, selectedTrialTaskId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return;

    let cancelled = false;
    setAuthBusy(true);
    setAuthError(null);
    exchangeEnterpriseOidcCode({
      code,
      state,
      redirect_uri: currentOidcRedirectUri(),
    }).then((payload) => {
      if (cancelled) return;
      setEnterpriseSessionIdState(payload.session.session_id);
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());
      setAuthNotice(`Signed in as ${payload.session.display_name || payload.session.email}.`);
      loadPlatform().catch(() => undefined);
    }).catch((err) => {
      if (cancelled) return;
      setAuthError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (!cancelled) setAuthBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadPlatform]);

  useEffect(() => {
    if (!enterpriseInviteToken || !enterpriseSessionIdState || workspaceMode !== 'current') return;
    if (!capabilityDecisions.ENTERPRISE_INVITE_ACCEPT.enabled) {
      setAuthError(capabilityDecisions.ENTERPRISE_INVITE_ACCEPT.reason);
      trackPlatformShellDiagnostic('cta_blocked', {
        cta: 'ENTERPRISE_INVITE_ACCEPT',
        reason: capabilityDecisions.ENTERPRISE_INVITE_ACCEPT.reason,
      });
      return;
    }
    let cancelled = false;
    setAuthBusy(true);
    setAuthError(null);
    acceptEnterpriseInvite(enterpriseInviteToken).then(() => {
      if (cancelled) return;
      setAuthNotice('Enterprise invite accepted and role claim completed.');
      setEnterpriseInviteToken(null);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('enterprise_invite');
        window.history.replaceState({}, '', url.toString());
      }
      loadPlatform().catch(() => undefined);
    }).catch((err) => {
      if (cancelled) return;
      setAuthError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (!cancelled) setAuthBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [capabilityDecisions.ENTERPRISE_INVITE_ACCEPT.enabled, capabilityDecisions.ENTERPRISE_INVITE_ACCEPT.reason, enterpriseInviteToken, enterpriseSessionIdState, workspaceMode, loadPlatform]);

  useEffect(() => {
    if (!summary) return;
    const nextFocusedMemberId = resolvePlatformFocusedMemberId(
      summary,
      workspaceMode,
      rolePage,
      focusedMemberId,
      effectiveLocalLabActorId,
    );
    if (nextFocusedMemberId !== focusedMemberId) {
      setFocusedMemberId(nextFocusedMemberId);
    }
  }, [summary, workspaceMode, rolePage, effectiveLocalLabActorId, focusedMemberId]);

  useEffect(() => {
    if (initialRoute.warnings.length === 0) return;
    trackPlatformShellDiagnostic('route_warning', {
      warnings: initialRoute.warnings,
      page: initialRoute.page,
      section: initialRoute.section,
    });
  }, [initialRoute.page, initialRoute.section, initialRoute.warnings]);

  useEffect(() => {
    if (!initialRoute.memberId || !focusedMemberId || initialRoute.memberId === focusedMemberId) return;
    trackPlatformShellDiagnostic('stale_link', {
      type: 'member',
      requested: initialRoute.memberId,
      resolved: focusedMemberId,
    });
  }, [focusedMemberId, initialRoute.memberId]);

  useEffect(() => {
    if (!initialRoute.trialTaskId || !selectedTrialTaskId || initialRoute.trialTaskId === selectedTrialTaskId) return;
    trackPlatformShellDiagnostic('stale_link', {
      type: 'task',
      requested: initialRoute.trialTaskId,
      resolved: selectedTrialTaskId,
    });
  }, [initialRoute.trialTaskId, selectedTrialTaskId]);

  useEffect(() => {
    const allowedSections = sectionsForRolePage(rolePage);
    if (!allowedSections.includes(section)) {
      setSection(defaultSectionForRolePage(rolePage));
    }
  }, [rolePage, section]);

  useEffect(() => {
    if (oaShell.activeRole !== activeOaRole) {
      setActiveOaRole(oaShell.activeRole);
    }
  }, [activeOaRole, oaShell.activeRole]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextHref = buildPlatformRouteHref({
      surface: 'platform',
      workspaceMode,
      page: rolePage,
      section,
      labActorId: workspaceMode === 'local_lab' ? effectiveLocalLabActorId : null,
      memberId: focusedMemberId,
      trialTaskId: selectedTrialTaskId,
      inviteCode,
      enterpriseInviteToken,
      oaRole: activeOaRole,
    });
    const url = new URL(nextHref, window.location.origin);
    window.history.replaceState({}, '', url.toString());
  }, [workspaceMode, rolePage, section, effectiveLocalLabActorId, focusedMemberId, selectedTrialTaskId, inviteCode, enterpriseInviteToken, activeOaRole]);

  const sectionDefinition = useMemo(
    () => SECTION_DEFINITIONS.find((item) => item.key === section) || SECTION_DEFINITIONS[0],
    [section]
  );
  const rolePageDefinition = useMemo(
    () => ROLE_PAGE_DEFINITIONS.find((item) => item.key === rolePage) || ROLE_PAGE_DEFINITIONS[0],
    [rolePage]
  );
  const signedInLabel = useMemo(
    () => resolvePlatformSignedInLabel(summary, workspaceMode, effectiveLocalLabActorId),
    [summary, workspaceMode, effectiveLocalLabActorId]
  );
  const roster = useMemo(() => buildWorkspaceRoster(summary, workspaceMode), [summary, workspaceMode]);
  const activationLines = useMemo(() => buildActivationPackageLines(summary), [summary]);
  const gapLines = useMemo(() => buildPlatformGapLines(summary), [summary]);
  const headerMeta = useMemo(() => buildPlatformHeaderMeta(summary, workspaceMode), [summary, workspaceMode]);
  const quickStats = useMemo(() => buildPlatformQuickStats(summary, workspaceMode), [summary, workspaceMode]);
  const roleContextLines = useMemo(
    () => buildRoleContextLines(summary, workspaceMode, effectiveLocalLabActorId),
    [summary, workspaceMode, effectiveLocalLabActorId]
  );
  const rolePageSummaryLines = useMemo(() => buildRolePageSummaryLines(summary, rolePage), [summary, rolePage]);
  const allowedSections = useMemo(() => sectionsForRolePage(rolePage), [rolePage]);
  const primaryNav = useMemo(
    () => SECTION_DEFINITIONS.filter((item) =>
      allowedSections.includes(item.key)
      && ['requests', 'approval', 'review', 'operations', 'policy', 'admin', 'audit'].includes(item.key)
    ),
    [allowedSections]
  );
  const secondaryNav = useMemo(
    () => SECTION_DEFINITIONS.filter((item) =>
      allowedSections.includes(item.key)
      && ['join', 'organization', 'overview', 'members', 'marketplace', 'navigator', 'observability'].includes(item.key)
    ),
    [allowedSections]
  );

  const openRolePageHere = useCallback((page: PlatformRolePage) => {
    setRolePage(page);
    setSection(defaultSectionForRolePage(page));
    setActiveOaRole(defaultOaRoleForRolePage(page));
    if (workspaceMode === 'local_lab' && page !== 'workspace') {
      setLocalLabActorId(DEFAULT_LOCAL_LAB_ACTOR_IDS[page]);
      setFocusedMemberId(DEFAULT_LOCAL_LAB_ACTOR_IDS[page]);
    }
  }, [workspaceMode]);

  const handleEnterpriseSignIn = useCallback(async () => {
    if (!capabilityDecisions.OKTA_SIGN_IN.enabled) {
      setAuthError(capabilityDecisions.OKTA_SIGN_IN.reason);
      trackPlatformShellDiagnostic('cta_blocked', {
        cta: 'OKTA_SIGN_IN',
        reason: capabilityDecisions.OKTA_SIGN_IN.reason,
      });
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const payload = await startEnterpriseOidcAuthorization({
        redirect_uri: currentOidcRedirectUri(),
        workspace_id: summary?.environment_activation.workspace_id,
      });
      window.location.assign(payload.authorize_url);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
      setAuthBusy(false);
    }
  }, [capabilityDecisions.OKTA_SIGN_IN.enabled, capabilityDecisions.OKTA_SIGN_IN.reason, summary]);

  const handleEnterpriseSignOut = useCallback(() => {
    setEnterpriseSessionId(null);
    setEnterpriseSessionIdState(null);
    setAuthNotice('Enterprise session cleared.');
    setApprovalCenter(null);
    setReviewCenter(null);
    setAuditCenter(null);
    loadPlatform().catch(() => undefined);
  }, [loadPlatform]);

  const handleCenterDecision = useCallback(async (itemId: string, decision: string) => {
    setPendingCenterItemId(itemId);
    setAuthError(null);
    try {
      await decideEnterpriseCenterItem({
        item_id: itemId,
        decision,
      });
      await loadPlatform();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingCenterItemId(null);
    }
  }, [loadPlatform]);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 py-4">
      <div className={`overflow-hidden rounded-[28px] border ${isDark ? 'border-slate-700 bg-slate-950/95' : 'border-slate-200 bg-white/95'} shadow-[0_32px_100px_rgba(2,6,23,0.45)]`}>
        <div className="border-b border-slate-800/60 px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                <Building2 size={14} />
                Lumio Enterprise Workspace Console
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white">Lumio: single platform for requesters, operators, and tenant admins</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Lumio is the primary B2B workspace surface for Agent OS: an enterprise workspace cockpit and role-aware workflow governance console built around the existing governed workspace sections.
              </p>
              <div className="mt-3 text-xs leading-6 text-slate-400">
                Naming split: `Lumio` is the B-end governed workspace platform, while `Lumi` remains the C-end product naming. Current B-end foundation: OA v1 nine-role model, Okta OIDC-only enterprise login target, and `local_lab` as a sandbox/preview workspace rather than a real pilot tenant.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="rounded-full border border-cyan-700/40 bg-cyan-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
                  Default web entry
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  Workspace-first
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  Enterprise-only shell
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  Module-first OA
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  Okta OIDC only
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  OA v1 nine-role
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-4">
                <EnterpriseAccountShell
                  signedInLabel={signedInLabel}
                  organizationLabel="Lumio"
                  workspaceLabel={headerMeta.find((item) => item.label === 'Workspace')?.value || 'Workspace'}
                  environmentLabel={headerMeta.find((item) => item.label === 'Environment')?.value || 'Unknown'}
                  rolePageLabel={rolePageDefinition.label}
                  workspaceMode={workspaceMode}
                />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Next action</div>
                <div className="mt-2 text-sm font-medium text-white">{summary?.next_action || 'Load workspace activation context.'}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <ArrowRight size={12} />
                  {summary?.activation_package.status.toLowerCase().replace(/_/g, ' ') || 'package unavailable'}
                </div>
              </div>
            </div>
          </div>

          {(authError || authNotice) && (
            <div className="mt-4 space-y-2">
              {authError && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {authError}
                </div>
              )}
              {authNotice && (
                <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                  {authNotice}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            {headerMeta.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                <div className="mt-1 text-sm font-medium text-white">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr),340px]">
            <div className="space-y-3">
              <EnvironmentTruthBanner summary={summary?.environment_activation || null} />
              <WorkspaceModeSelector
                options={summary?.environment_activation.workspace_options || []}
                value={workspaceMode}
                onChange={setWorkspaceMode}
              />
              {workspaceMode === 'local_lab' && rolePage === 'workspace' && (
                <LocalRoleLabActorSelector
                  summary={summary?.local_role_lab}
                  value={effectiveLocalLabActorId}
                  onChange={setLocalLabActorId}
                />
              )}
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Platform snapshot</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{stat.value}</div>
                    <div className="mt-1 text-xs text-slate-400">{stat.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">OA role pages</div>
                <div className="mt-1 text-sm text-slate-300">
                  Open compatibility role pages or switch the active OA role. The platform is now module-first, but old requester/operator/tenant-admin routes still work as aliases.
                </div>
              </div>
              <div className="rounded-full border border-cyan-700/40 bg-cyan-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
                Current page: {rolePageDefinition.label}
              </div>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-4">
              {ROLE_PAGE_DEFINITIONS.map((page) => {
                const active = page.key === rolePage;
                const targetActorId = workspaceMode === 'local_lab' && page.key !== 'workspace'
                  ? DEFAULT_LOCAL_LAB_ACTOR_IDS[page.key]
                  : effectiveLocalLabActorId;
                return (
                  <div key={page.key} className={`rounded-2xl border p-4 ${active ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/80'}`}>
                    <div className="text-sm font-semibold text-white">{page.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{page.description}</div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openRolePageHere(page.key)}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${active ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
                      >
                        Open here
                      </button>
                      <a
                        href={buildRolePageHref(page.key, workspaceMode, targetActorId, undefined, undefined, selectedTrialTaskId, inviteCode, activeOaRole)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
                      >
                        New tab
                        <ArrowUpRight size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
            <EnterpriseRoleSwitcher
              roles={oaShell.roles.map((role) => role.role)}
              activeRole={oaShell.activeRole}
              onChange={setActiveOaRole}
              title={workspaceMode === 'local_lab' ? 'Active example roles' : 'OA roles'}
              description={workspaceMode === 'local_lab'
                ? summary?.trial_workspace?.trial_workspace?.active_template_id === 'oa_full_cycle_governed_execution'
                  ? 'This local_lab example explicitly covers all 9 OA roles in one governed B-end workflow.'
                  : 'This local_lab example currently uses Requester, Operator, and Tenant Admin only. The full OA v1 role model is broader than this walkthrough.'
                : undefined}
            />
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Primary module</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {oaShell.modules.find((module) => module.module === oaShell.activeModule)?.label || 'Enterprise OA'}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {oaShell.roles.find((role) => role.role === oaShell.activeRole)?.primaryObjective || 'Sign in to load real workspace role scope.'}
              </div>
              {workspaceMode === 'current' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {capabilityDecisions.OKTA_SIGN_OUT.visible ? (
                    <button
                      onClick={handleEnterpriseSignOut}
                      disabled={!capabilityDecisions.OKTA_SIGN_OUT.enabled}
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-950"
                    >
                      Sign out
                    </button>
                  ) : capabilityDecisions.OKTA_SIGN_IN.visible ? (
                    <button
                      onClick={() => {
                        handleEnterpriseSignIn().catch(() => undefined);
                      }}
                      disabled={authBusy || !capabilityDecisions.OKTA_SIGN_IN.enabled}
                      className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950 disabled:opacity-60"
                    >
                      {authBusy ? 'Signing in...' : 'Sign in with Okta'}
                    </button>
                  ) : null}
                  {capabilityDecisions.ENTERPRISE_INVITE_ACCEPT.visible && (
                    <div className="rounded-full border border-cyan-700/40 bg-cyan-950/30 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                      Invite link detected
                    </div>
                  )}
                </div>
              )}
              {workspaceMode === 'current' && !platformContext.signedIn && (
                <div className="mt-3 text-xs text-slate-400">
                  Current workspace actions are locked until a real enterprise session is present.
                </div>
              )}
              {workspaceMode === 'current' && platformContext.availableRoles.length ? (
                <div className="mt-2 text-xs text-slate-400">
                  Bound roles: {platformContext.availableRoles.map((role) => role.toLowerCase().replace(/_/g, ' ')).join(' · ')}
                </div>
              ) : null}
              {workspaceMode === 'current' && summary?.enterprise_account?.pending_invites?.length ? (
                <div className="mt-2 text-xs text-cyan-100">
                  Pending invites: {summary.enterprise_account.pending_invites.length}
                </div>
              ) : null}
              {workspaceMode === 'current' && !platformContext.writePersistenceReady && summary?.enterprise_account?.diagnostics && (
                <div className="mt-2 text-xs text-amber-200">
                  Enterprise writes are currently fail-closed because production persistence is not ready.
                </div>
              )}
              </div>
            </div>
          </div>

        <div className="grid xl:grid-cols-[260px,minmax(0,1fr),320px]">
          <aside className="border-r border-slate-800/60 px-4 py-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{rolePageDefinition.label} page</div>
            <div className="mt-3 space-y-2">
              {primaryNav.map((item) => {
                const active = item.key === section;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
                      active
                        ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-900/30'
                        : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className={`text-[11px] ${active ? 'text-slate-900/70' : 'text-slate-400'}`}>{item.eyebrow}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {secondaryNav.length > 0 && (
              <>
                <div className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Intelligence & ops</div>
                <div className="mt-3 space-y-2">
                  {secondaryNav.map((item) => {
                    const active = item.key === section;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setSection(item.key)}
                        className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
                          active
                            ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-900/30'
                            : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className={`text-[11px] ${active ? 'text-slate-900/70' : 'text-slate-400'}`}>{item.eyebrow}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Users size={14} />
                Workspace seats
              </div>
              <div className="mt-3 space-y-3">
                {roster.map((member) => (
                  <div key={`${member.title}-${member.badge}`} className="rounded-2xl bg-slate-950/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{member.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{member.subtitle}</div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              if (member.oaRole) {
                                setActiveOaRole(member.oaRole);
                                setSection(defaultSectionForOaRole(member.oaRole));
                              } else {
                                setSection(defaultSectionForRolePage(member.rolePage));
                              }
                              setRolePage(member.rolePage);
                              setFocusedMemberId(member.actorId);
                              if (workspaceMode === 'local_lab' && member.rolePage !== 'workspace') {
                                setLocalLabActorId(DEFAULT_LOCAL_LAB_ACTOR_IDS[member.rolePage]);
                              }
                            }}
                            className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
                          >
                            Open here
                          </button>
                          <a
                            href={buildRolePageHref(
                              member.rolePage,
                              workspaceMode,
                              workspaceMode === 'local_lab'
                                ? member.rolePage === 'workspace'
                                ? effectiveLocalLabActorId
                                  : DEFAULT_LOCAL_LAB_ACTOR_IDS[member.rolePage]
                                : undefined,
                              undefined,
                              member.rolePage === 'workspace' ? member.actorId : undefined,
                              selectedTrialTaskId,
                              inviteCode,
                              member.oaRole || oaShell.activeRole
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
                          >
                            New tab
                            <ArrowUpRight size={12} />
                          </a>
                        </div>
                      </div>
                      <div className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                        {member.badge}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-5 px-6 py-5">
            {loading && !summary && (
              <PlatformStatePanel
                kind="loading"
                title="Loading workspace shell"
                detail="Loading route, role, member, and task context for this enterprise workspace."
              />
            )}

            {routeIssues.map((issue) => (
              <PlatformStatePanel
                key={`${issue.kind}-${issue.title}`}
                kind={issue.kind === 'NO_ACCESS' ? 'no_access' : issue.kind === 'STALE_LINK' ? 'stale_link' : 'malformed_url'}
                title={issue.title}
                detail={issue.detail}
              />
            ))}

            {error && (
              <PlatformStatePanel
                kind={summary ? 'runtime_failure' : 'runtime_failure'}
                title={summary ? 'Runtime fallback active' : 'Workspace shell failed to load'}
                detail={summary ? error : `Platform shell API unavailable: ${error}`}
                primaryActionLabel="Retry load"
                onPrimaryAction={() => {
                  loadPlatform().catch(() => undefined);
                }}
              />
            )}

            <PlatformErrorBoundary scope={`${sectionDefinition.label} section`} resetKey={section}>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{rolePageDefinition.title}</div>
                  <div className="mt-1 text-sm text-slate-200">{rolePageDefinition.description}</div>
                </div>
                <a
                  href={buildRolePageHref(rolePage, workspaceMode, effectiveLocalLabActorId, section, focusedMemberId, selectedTrialTaskId, inviteCode, activeOaRole)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-slate-200"
                >
                  Open this page in a new tab
                  <ArrowUpRight size={12} />
                </a>
              </div>
              <div className="mt-3 grid gap-2 xl:grid-cols-3">
                {rolePageSummaryLines.map((line) => (
                  <div key={line} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <WorkspaceSeatDetailPanel
              summary={summary}
              workspaceMode={workspaceMode}
              focusedMemberId={focusedMemberId}
              onFocusMember={setFocusedMemberId}
            />

            {section === 'overview' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[
                  summary?.environment_activation.pilot_activation_status.replace(/_/g, ' ') || 'unknown activation',
                  workspaceMode === 'local_lab' ? 'rehearsal only' : 'workspace live state',
                ]}
              >
                {workspaceMode === 'local_lab' && (
                  <EnterpriseSandboxHome
                    summary={summary}
                    labActorId={effectiveLocalLabActorId}
                    onUpdated={() => {
                      loadPlatform().catch(() => undefined);
                    }}
                  />
                )}
                {workspaceMode === 'local_lab' && (
                  <TrialJoinPanel
                    summary={summary}
                    actorLabel={signedInLabel}
                    initialInviteCode={inviteCode}
                    onInviteCodeChange={setInviteCode}
                    onUpdated={() => {
                      loadPlatform().catch(() => undefined);
                    }}
                  />
                )}
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                  title="Role-aware cockpit"
                />
                {workspaceMode === 'local_lab' && <LocalRoleLabOverview summary={summary?.local_role_lab} />}
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Activation package</div>
                    <div className="mt-3 space-y-2">
                      {activationLines.slice(0, 6).map((line) => (
                        <div key={line} className="text-sm text-slate-200">{line}</div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-rose-700/40 bg-rose-950/20 p-5">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                      <ShieldAlert size={14} />
                      Pilot activation gap
                    </div>
                    <div className="mt-3 space-y-2">
                      {gapLines.map((line) => (
                        <div key={line} className="text-sm text-rose-100">{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <CrossRoleBoardPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <CollaborationMapPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
              </SectionShell>
            )}

            {section === 'join' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[
                  workspaceMode === 'local_lab' ? 'trial-only access' : 'workspace access',
                  inviteCode ? 'invite link detected' : 'manual invite entry',
                ]}
              >
                <TrialJoinPanel
                  summary={summary}
                  actorLabel={signedInLabel}
                  initialInviteCode={inviteCode}
                  onInviteCodeChange={setInviteCode}
                  onUpdated={() => {
                    loadPlatform().catch(() => undefined);
                  }}
                />
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Join flow guidance</div>
                  <div className="mt-3 space-y-2">
                    {summary?.trial_workspace?.join_instructions?.map((line) => (
                      <div key={line} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
                        {line}
                      </div>
                    )) || (
                      <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
                        Create or paste an invite code, accept it, and continue the shared trial path from a claimed seat.
                      </div>
                    )}
                  </div>
                </div>
                <TrialTaskDetailPanel
                  summary={summary}
                  selectedTaskId={selectedTrialTaskId}
                  onSelectTask={setSelectedTrialTaskId}
                />
              </SectionShell>
            )}

            {section === 'organization' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[summary?.environment_activation.environment_kind || 'unknown environment', summary?.activation_package.status.toLowerCase().replace(/_/g, ' ') || 'activation unavailable']}
              >
                <OrganizationWorkspacePanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <EnterpriseLoginEntryPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <EnterpriseDiagnosticsPanel
                  account={summary?.enterprise_account}
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <WorkspaceDirectoryPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                  focusedMemberId={focusedMemberId}
                  activeLabActorId={effectiveLocalLabActorId}
                />
                <WorkspaceSeatAssignmentPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                  focusedMemberId={focusedMemberId}
                  activeLabActorId={effectiveLocalLabActorId}
                />
                <WorkspaceMembersPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                  focusedMemberId={focusedMemberId}
                  activeLabActorId={effectiveLocalLabActorId}
                />
                <EnterpriseMembershipAdminPanel
                  summary={summary}
                  capability={capabilityDecisions.ENTERPRISE_MEMBERSHIP_WRITE}
                  onUpdated={() => {
                    loadPlatform().catch(() => undefined);
                  }}
                />
                <AccessMatrixPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
              </SectionShell>
            )}

            {section === 'requests' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[`${summary?.requester_inbox.total_count ?? 0} total requests`, `${summary?.requester_inbox.blocked_count ?? 0} blocked`]}
              >
                {workspaceMode === 'local_lab' && (
                  <LocalRoleLabTaskComposer
                    labActorId={effectiveLocalLabActorId}
                    onTaskCreated={setSelectedTrialTaskId}
                    onCreated={() => {
                      loadPlatform().catch(() => undefined);
                    }}
                    onCreateTask={async (brief) => {
                      const created = await createSharedTrialTaskFromBrief(brief, {
                        labActorId: effectiveLocalLabActorId,
                      });
                      setSelectedTrialTaskId(created.taskId);
                      return { taskId: created.taskId };
                    }}
                  />
                )}
                <RoleWorkboardPanel
                  summary={summary}
                  role="requester"
                  workspaceMode={workspaceMode}
                />
                <RequesterInboxPanel
                  summary={summary?.requester_inbox || null}
                  workspaceMode={workspaceMode}
                  onOpenItem={(item) => setSelectedTrialTaskId(normalizeTrialTaskId(item.task_id))}
                  onSubmitNewTask={workspaceMode === 'local_lab'
                    ? () => {
                        const target = document.querySelector('[aria-label=\"Requester brief\"]');
                        if (target instanceof HTMLElement) target.focus();
                      }
                    : undefined}
                />
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                />
              </SectionShell>
            )}

            {section === 'approval' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[
                  `${approvalCenter?.item_count ?? (oaShell.modules.find((module) => module.module === 'APPROVAL_CENTER')?.metricValue || '0')} approval items`,
                  `Active role: ${oaShell.roles.find((role) => role.role === oaShell.activeRole)?.label || oaShell.activeRole}`,
                ]}
              >
                <ApprovalCenterPanel
                  summary={summary}
                  centerSummary={approvalCenter}
                  onDecision={capabilityDecisions.APPROVAL_DECISION.enabled ? handleCenterDecision : undefined}
                  pendingItemId={pendingCenterItemId}
                />
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                />
                {workspaceMode === 'current' && !capabilityDecisions.APPROVAL_DECISION.enabled && capabilityDecisions.APPROVAL_DECISION.visible && (
                  <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                    {capabilityDecisions.APPROVAL_DECISION.reason}
                  </div>
                )}
              </SectionShell>
            )}

            {section === 'review' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[
                  `${reviewCenter?.item_count ?? 0} review items`,
                  `Active role: ${oaShell.roles.find((role) => role.role === oaShell.activeRole)?.label || oaShell.activeRole}`,
                ]}
              >
                <ReviewCenterPanel
                  centerSummary={reviewCenter}
                  onDecision={capabilityDecisions.REVIEW_DECISION.enabled ? handleCenterDecision : undefined}
                  pendingItemId={pendingCenterItemId}
                />
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                />
                {workspaceMode === 'current' && !capabilityDecisions.REVIEW_DECISION.enabled && capabilityDecisions.REVIEW_DECISION.visible && (
                  <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                    {capabilityDecisions.REVIEW_DECISION.reason}
                  </div>
                )}
              </SectionShell>
            )}

            {section === 'operations' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[workspaceMode === 'local_lab' ? 'rehearsal flow' : 'workspace flow']}
              >
                <RoleWorkboardPanel
                  summary={summary}
                  role="operator"
                  workspaceMode={workspaceMode}
                />
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                />
                {workspaceMode === 'local_lab' && <LocalRoleLabOverview summary={summary?.local_role_lab} />}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Operator desk</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    Operator work is one role shell inside the workspace platform. It stays visible alongside requester and tenant-admin context so the cross-role flow is understandable without opening a different product surface.
                  </div>
                </div>
              </SectionShell>
            )}

            {section === 'admin' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[summary?.activation_package.status.toLowerCase().replace(/_/g, ' ') || 'activation unavailable']}
              >
                <RoleWorkboardPanel
                  summary={summary}
                  role="tenant_admin"
                  workspaceMode={workspaceMode}
                />
                <EnterpriseSignInPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <EnterpriseIdentityStatusPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <EnterpriseDiagnosticsPanel
                  account={summary?.enterprise_account}
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <AdminActionCenterPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
                <TenantAdminSetupPanel
                  summary={summary?.tenant_admin_setup || null}
                  productShellSummary={summary}
                  workspaceMode={workspaceMode}
                />
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                />
                <EnterpriseMembershipAdminPanel
                  summary={summary}
                  capability={capabilityDecisions.ENTERPRISE_MEMBERSHIP_WRITE}
                  onUpdated={() => {
                    loadPlatform().catch(() => undefined);
                  }}
                />
              </SectionShell>
            )}

            {section === 'members' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[`${roster.length} workspace seats`, workspaceMode === 'local_lab' ? 'rehearsal roster' : 'workspace roster']}
              >
                <WorkspaceMembersPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                  focusedMemberId={focusedMemberId}
                  activeLabActorId={effectiveLocalLabActorId}
                />
                <AccessMatrixPanel
                  summary={summary}
                  workspaceMode={workspaceMode}
                />
              </SectionShell>
            )}

            {section === 'policy' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[summary?.policy_studio.pack_name || 'policy studio']}
              >
                <PolicyStudioPanel
                  summary={summary?.policy_studio || null}
                  productShellSummary={summary}
                  activeRole={oaShell.activeRole}
                  selectedTaskId={selectedTrialTaskId}
                />
              </SectionShell>
            )}

            {section === 'audit' && (
              <SectionShell
                definition={sectionDefinition}
                badges={[
                  `${auditCenter?.item_count ?? (oaShell.modules.find((module) => module.module === 'AUDIT_REPORTING_CENTER')?.metricValue || '0')} receipts`,
                  'Read-oriented role',
                ]}
              >
                <AuditReportingCenterPanel
                  summary={summary}
                  centerSummary={auditCenter}
                  activeRole={oaShell.activeRole}
                  selectedTaskId={selectedTrialTaskId}
                />
                <GovernedFlowTaskPanel
                  summary={summary}
                  activeRole={oaShell.activeRole}
                  rolePage={rolePage}
                  workspaceMode={workspaceMode}
                  labActorId={effectiveLocalLabActorId}
                  focusedMemberId={focusedMemberId}
                  selectedTaskId={selectedTrialTaskId}
                  inviteCode={inviteCode}
                  enterpriseInviteToken={enterpriseInviteToken}
                />
              </SectionShell>
            )}

            {section === 'marketplace' && (
              <SectionShell definition={sectionDefinition}>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-300">
                  Marketplace and external execution context remain inside the same enterprise workspace so product demos no longer depend on a phone-style shell.
                </div>
                <LixTwinFusionPanel />
                <MarketHome onSelectIntent={() => setSection('requests')} />
                <AgentMarketplacePanel onOpenLixMarket={() => setSection('marketplace')} />
              </SectionShell>
            )}

            {section === 'navigator' && (
              <SectionShell definition={sectionDefinition}>
                <DestinyNavigatorPanel isDark />
              </SectionShell>
            )}

            {section === 'observability' && (
              <SectionShell definition={sectionDefinition}>
                <ObservabilityDashboard isDark={isDark} />
              </SectionShell>
            )}
            </PlatformErrorBoundary>
          </main>

          <aside className="border-l border-slate-800/60 px-4 py-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Role context</div>
              <div className="mt-3 space-y-2">
                {roleContextLines.map((line) => (
                  <div key={line} className="text-sm text-slate-200">{line}</div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Activation pulse</div>
              <div className="mt-3 text-sm text-white">
                {summary?.activation_package.summary || 'Activation package summary unavailable.'}
              </div>
              <div className="mt-3 space-y-2">
                <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  Pending requirements: {summary?.activation_package.pending_requirement_count ?? 0}
                </div>
                <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  Rejected intakes: {summary?.activation_package.rejected_intake_count ?? 0}
                </div>
                <div className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  Remaining blockers: {summary?.remaining_blockers.length ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Evidence boundary</div>
              <div className="mt-3 text-sm text-slate-200">
                {workspaceMode === 'local_lab'
                  ? summary?.local_role_lab.evidence_classification_summary || 'Local role lab evidence boundary unavailable.'
                  : 'Only real pilot artifacts can advance real pilot evidence categories.'}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {workspaceMode === 'local_lab'
                  ? summary?.local_role_lab.pilot_activation_gap_summary
                  : summary?.next_action}
              </div>
            </div>

            {oaShell.roles.length > 0 && (
              <div className="mt-4">
                <EnterpriseRoleCharterPanel
                  role={oaShell.roles.find((role) => role.role === oaShell.activeRole) || oaShell.roles[0]}
                />
              </div>
            )}
            <div className="mt-4">
              <EnterpriseModuleAccessPanel account={summary?.enterprise_account} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export { EnterprisePlatformView };
export default EnterprisePlatformView;

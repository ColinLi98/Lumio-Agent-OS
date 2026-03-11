import type {
  DependencyReadinessState,
  EnterpriseOAModule,
  EnterpriseOARole,
  ProductShellSummary,
  TrialWorkspaceActivityRecord,
  TrialWorkspaceInviteRecord,
  TrialWorkspaceTaskRecord,
  WorkspaceMode,
} from './agentKernelShellApi';

export type PlatformRolePage = 'workspace' | 'requester' | 'operator' | 'tenant_admin';

export type PlatformSection =
  | 'join'
  | 'organization'
  | 'overview'
  | 'requests'
  | 'approval'
  | 'review'
  | 'operations'
  | 'admin'
  | 'members'
  | 'policy'
  | 'audit'
  | 'marketplace'
  | 'navigator'
  | 'observability';

export type PlatformCapability =
  | 'OKTA_SIGN_IN'
  | 'OKTA_SIGN_OUT'
  | 'ENTERPRISE_INVITE_ACCEPT'
  | 'ENTERPRISE_MEMBERSHIP_WRITE'
  | 'APPROVAL_DECISION'
  | 'REVIEW_DECISION'
  | 'OA_ROLE_SWITCH'
  | 'TRIAL_INVITE_ACCEPT';

export interface PlatformActorIdentity {
  actorId: string;
  displayName: string;
  oaRole: EnterpriseOARole;
  roleLabel: string;
  page: PlatformRolePage;
  summary: string;
  status: string;
  provisioning: string;
  access: string;
  sessionId?: string;
  source: 'local_lab_actor' | 'trial_seat' | 'environment_actor';
}

export interface PlatformWorkspaceContext {
  workspaceMode: WorkspaceMode;
  page: PlatformRolePage;
  section: PlatformSection;
  oaRole: EnterpriseOARole;
  availableRoles: EnterpriseOARole[];
  signedIn: boolean;
  writePersistenceReady: boolean;
  enterpriseInviteToken?: string | null;
  inviteCode?: string | null;
  focusedMemberId?: string | null;
  selectedTrialTaskId?: string | null;
  warnings: string[];
}

export interface PlatformAuditReceipt {
  receiptId: string;
  kind: 'trial_activity' | 'handoff_fallback';
  oaRole: EnterpriseOARole | 'WORKSPACE';
  actorLabel: string;
  summary: string;
  createdAt?: number;
}

export interface PlatformTaskLifecycleEntity {
  taskId: string;
  title: string;
  lifecycle: string;
  receiptSummary: string;
  missingFields: string[];
  handoffLines: string[];
  approvalSummary: string;
  approvalLines: string[];
  nextAction: string;
  timeline: PlatformAuditReceipt[];
}

export type PlatformGovernedFlowStageKey = 'REQUEST' | 'APPROVAL' | 'OPERATIONS' | 'REVIEW' | 'AUDIT';
export type PlatformGovernedFlowStageStatus = 'DONE' | 'CURRENT' | 'UPCOMING' | 'BLOCKED';
export type PlatformBlockedReasonCategory = 'POLICY' | 'ACCESS' | 'READINESS' | 'EVIDENCE';

export interface PlatformGovernedFlowStage {
  key: PlatformGovernedFlowStageKey;
  label: string;
  ownerRole: EnterpriseOARole;
  section: PlatformSection;
  status: PlatformGovernedFlowStageStatus;
  summary: string;
}

export interface PlatformBlockedReason {
  blocked: boolean;
  blockedBy: EnterpriseOARole | 'WORKSPACE';
  blockedBecause: string;
  category: PlatformBlockedReasonCategory;
  nextSection: PlatformSection;
  recommendedAction: string;
}

export interface PlatformEvidenceLens {
  evidenceSetId: string;
  roleLensRole: EnterpriseOARole;
  roleLensSummary: string;
  receiptSummary: string;
  approvalSummary: string;
  evidenceItems: string[];
  receiptItems: string[];
  activityCount: number;
}

export interface PlatformGovernedFlowState {
  taskId: string;
  title: string;
  currentStageKey: PlatformGovernedFlowStageKey;
  currentStageLabel: string;
  stages: PlatformGovernedFlowStage[];
  waitingOnRole: EnterpriseOARole;
  waitingSummary: string;
  nextAction: string;
  nextDestinationSection: PlatformSection;
  nextDestinationRole: EnterpriseOARole;
  nextDestinationLabel: string;
  blocker: PlatformBlockedReason;
  evidence: PlatformEvidenceLens;
  timeline: PlatformAuditReceipt[];
}

export interface PlatformPolicySurface {
  policyBasis: string[];
  exceptionWaiver: string[];
  decisionRationale: string[];
  blockedReasonLinkage: string[];
}

export interface PlatformOktaReadinessSurface {
  checklist: Array<{
    key: string;
    label: string;
    state: DependencyReadinessState | 'OKTA_ONLY' | 'UNKNOWN' | 'BOUND';
    detail: string;
  }>;
  whyReady: string[];
  whyNotReady: string[];
  environmentStatus: string[];
}

export interface PlatformAuditSurface {
  timelineLines: string[];
  evidenceBundleLines: string[];
  exportBundleLines: string[];
}

export interface PlatformWorkspaceGovernanceSurface {
  ownership: string[];
  adminBoundaries: string[];
  escalationPath: string[];
  workspaceHealth: string[];
}

export interface PlatformCapabilityDecision {
  capability: PlatformCapability;
  visible: boolean;
  enabled: boolean;
  ambiguous: boolean;
  reason: string;
}

export interface PlatformReadinessGate {
  gateId: string;
  state: DependencyReadinessState | 'UNKNOWN';
  summary: string;
  ownerLabel?: string;
}

export interface PlatformMemberSeatInvite {
  entityId: string;
  kind: 'MEMBER' | 'SEAT' | 'INVITE' | 'ROLE_LENS';
  actorId: string;
  title: string;
  oaRoles: EnterpriseOARole[];
  summary: string;
  status: string;
  provisioning: string;
  access: string;
  scope: string;
  lifecycle: string;
  joinTrace: string[];
  boundaryChanges: string[];
  page: PlatformRolePage;
  sessionId?: string;
  inviteCode?: string;
  acceptedLabel?: string;
  detailLines: string[];
}

export interface PlatformRouteState {
  surface: 'platform';
  workspaceMode: WorkspaceMode;
  page: PlatformRolePage;
  section: PlatformSection;
  oaRole: EnterpriseOARole;
  roleResolution: 'url' | 'page_default' | 'ordered_fallback';
  sectionResolution: 'url' | 'page_default';
  labActorId: string;
  memberId: string | null;
  trialTaskId: string | null;
  inviteCode: string | null;
  enterpriseInviteToken: string | null;
  warnings: string[];
}

export interface PlatformRouteIssue {
  kind: 'MALFORMED_URL' | 'STALE_LINK' | 'NO_ACCESS';
  title: string;
  detail: string;
}

export interface StandaloneTrialJoinRouteState {
  surface: 'trial-join';
  workspaceMode: 'local_lab';
  inviteCode: string | null;
  warnings: string[];
}

export const PLATFORM_OA_ROLE_ORDER: EnterpriseOARole[] = [
  'REQUESTER',
  'APPROVER',
  'OPERATOR',
  'REVIEWER',
  'TENANT_ADMIN',
  'WORKSPACE_ADMIN',
  'POLICY_GOVERNANCE_ADMIN',
  'INTEGRATION_ADMIN',
  'AUDITOR',
];

export const PLATFORM_ROLE_LABELS: Record<EnterpriseOARole, string> = {
  REQUESTER: 'Requester',
  APPROVER: 'Approver',
  OPERATOR: 'Operator',
  REVIEWER: 'Reviewer',
  TENANT_ADMIN: 'Tenant Admin',
  WORKSPACE_ADMIN: 'Workspace Admin',
  POLICY_GOVERNANCE_ADMIN: 'Policy / Governance Admin',
  INTEGRATION_ADMIN: 'Integration Admin',
  AUDITOR: 'Auditor',
};

export const DEFAULT_LOCAL_LAB_ACTOR_IDS: Record<Exclude<PlatformRolePage, 'workspace'>, string> = {
  requester: 'local_requester_01',
  operator: 'local_operator_01',
  tenant_admin: 'local_tenant_admin_01',
};

const PAGE_DEFAULT_ROLE_MAP: Record<PlatformRolePage, EnterpriseOARole> = {
  workspace: 'TENANT_ADMIN',
  requester: 'REQUESTER',
  operator: 'OPERATOR',
  tenant_admin: 'TENANT_ADMIN',
};

const PAGE_DEFAULT_SECTION_MAP: Record<PlatformRolePage, PlatformSection> = {
  workspace: 'overview',
  requester: 'requests',
  operator: 'operations',
  tenant_admin: 'admin',
};

const PAGE_SECTION_MAP: Record<PlatformRolePage, PlatformSection[]> = {
  requester: ['requests', 'approval', 'members', 'navigator'],
  operator: ['operations', 'review', 'approval', 'requests', 'members', 'observability', 'audit'],
  tenant_admin: ['admin', 'review', 'organization', 'members', 'policy', 'audit', 'overview'],
  workspace: ['join', 'organization', 'overview', 'requests', 'approval', 'review', 'operations', 'admin', 'members', 'policy', 'audit', 'marketplace', 'navigator', 'observability'],
};

const ROLE_MODULE_MAP: Record<EnterpriseOARole, EnterpriseOAModule> = {
  REQUESTER: 'REQUEST_CENTER',
  APPROVER: 'APPROVAL_CENTER',
  OPERATOR: 'OPERATIONS_CONSOLE',
  REVIEWER: 'APPROVAL_CENTER',
  TENANT_ADMIN: 'INTEGRATION_READINESS_CENTER',
  WORKSPACE_ADMIN: 'INTEGRATION_READINESS_CENTER',
  POLICY_GOVERNANCE_ADMIN: 'POLICY_GOVERNANCE_CENTER',
  INTEGRATION_ADMIN: 'INTEGRATION_READINESS_CENTER',
  AUDITOR: 'AUDIT_REPORTING_CENTER',
};

const GOVERNED_FLOW_STAGES: Array<{
  key: PlatformGovernedFlowStageKey;
  label: string;
  ownerRole: EnterpriseOARole;
  section: PlatformSection;
}> = [
  { key: 'REQUEST', label: 'Request', ownerRole: 'REQUESTER', section: 'requests' },
  { key: 'APPROVAL', label: 'Approval', ownerRole: 'APPROVER', section: 'approval' },
  { key: 'OPERATIONS', label: 'Operations', ownerRole: 'OPERATOR', section: 'operations' },
  { key: 'REVIEW', label: 'Review', ownerRole: 'REVIEWER', section: 'review' },
  { key: 'AUDIT', label: 'Audit', ownerRole: 'AUDITOR', section: 'audit' },
];

function normalizeStringParam(value: string | null | undefined): string | null {
  const next = typeof value === 'string' ? value.trim() : '';
  return next ? next : null;
}

function normalizeRoleToken(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function formatStateLabel(value: string | null | undefined, fallback = 'unknown'): string {
  const next = normalizeStringParam(value);
  return next ? next.toLowerCase().replace(/_/g, ' ') : fallback;
}

function roleKey(role: EnterpriseOARole): string {
  return role.toLowerCase();
}

function platformRouteParams(input: string | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input.toString());
  }
  const search = input.startsWith('?') ? input.slice(1) : input;
  return new URLSearchParams(search);
}

function isWorkspaceMode(value: string | null): value is WorkspaceMode {
  return value === 'current' || value === 'demo' || value === 'local_lab';
}

function isPlatformRolePage(value: string | null): value is PlatformRolePage {
  return value === 'workspace' || value === 'requester' || value === 'operator' || value === 'tenant_admin';
}

function isPlatformSection(value: string | null): value is PlatformSection {
  return value === 'join'
    || value === 'organization'
    || value === 'overview'
    || value === 'requests'
    || value === 'approval'
    || value === 'review'
    || value === 'operations'
    || value === 'admin'
    || value === 'members'
    || value === 'policy'
    || value === 'audit'
    || value === 'marketplace'
    || value === 'navigator'
    || value === 'observability';
}

function activeTrialTask(summary: ProductShellSummary | null, selectedTaskId?: string | null): TrialWorkspaceTaskRecord | null {
  const tasks = summary?.trial_workspace?.tasks || [];
  if (tasks.length === 0) return null;
  return tasks.find((task) => task.task_id === selectedTaskId) || tasks[0] || null;
}

function buildFallbackHandoffLines(task: TrialWorkspaceTaskRecord): string[] {
  if (task.scenario_id === 'oa_full_cycle_governed_execution') {
    return [
      `Requester initiates ${task.client_name} package · completed`,
      `Approver releases bounded execution scope for ${task.client_name} · active`,
      `Operator assembles governed package for ${task.client_name} · pending`,
      `Reviewer validates evidence for ${task.client_name} · pending`,
      `Audit receipt visibility review for ${task.client_name} · pending`,
    ];
  }
  const lines = [
    `Requester staged ${task.client_name} in the trial workspace.`,
    `Operator review is required before compliance and handoff can continue.`,
    task.compliance_review_requested
      ? 'Tenant admin review is queued behind compliance-required field completion.'
      : 'Tenant admin review has not been requested yet.',
  ];
  lines.push(
    task.connector_requested
      ? 'External handoff remains blocked until required compliance fields are complete.'
      : 'Connector path is not involved in this sandbox scenario.'
  );
  return lines;
}

function resolveRequestedOaRole(page: PlatformRolePage, requestedRole: EnterpriseOARole | null, availableRoles: EnterpriseOARole[]): {
  oaRole: EnterpriseOARole;
  roleResolution: PlatformRouteState['roleResolution'];
} {
  const orderedRoles = availableRoles.length > 0
    ? PLATFORM_OA_ROLE_ORDER.filter((role) => availableRoles.includes(role))
    : [...PLATFORM_OA_ROLE_ORDER];
  if (requestedRole && orderedRoles.includes(requestedRole)) {
    return { oaRole: requestedRole, roleResolution: 'url' };
  }
  const pageDefault = PAGE_DEFAULT_ROLE_MAP[page];
  if (orderedRoles.includes(pageDefault)) {
    return { oaRole: pageDefault, roleResolution: requestedRole ? 'ordered_fallback' : 'page_default' };
  }
  return {
    oaRole: orderedRoles[0] || pageDefault,
    roleResolution: requestedRole ? 'ordered_fallback' : 'page_default',
  };
}

export function normalizeOaRole(value: unknown): EnterpriseOARole | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const normalized = normalizeRoleToken(value);
    return PLATFORM_OA_ROLE_ORDER.includes(normalized as EnterpriseOARole)
      ? (normalized as EnterpriseOARole)
      : null;
  }
  if (typeof value === 'object') {
    const record = value as { oa_role?: unknown; role?: unknown; actor_role?: unknown };
    return normalizeOaRole(record.oa_role) || normalizeOaRole(record.role) || normalizeOaRole(record.actor_role);
  }
  return null;
}

export function normalizeOaRoles(values: Iterable<unknown> | null | undefined): EnterpriseOARole[] {
  const found = new Set<EnterpriseOARole>();
  for (const value of values || []) {
    const role = normalizeOaRole(value);
    if (role) found.add(role);
  }
  return PLATFORM_OA_ROLE_ORDER.filter((role) => found.has(role));
}

export function platformRoleLabel(role: EnterpriseOARole): string {
  return PLATFORM_ROLE_LABELS[role];
}

export function platformModuleForRole(role: EnterpriseOARole): EnterpriseOAModule {
  return ROLE_MODULE_MAP[role];
}

export function sectionsForRolePage(page: PlatformRolePage): PlatformSection[] {
  return [...PAGE_SECTION_MAP[page]];
}

export function defaultSectionForRolePage(page: PlatformRolePage): PlatformSection {
  return PAGE_DEFAULT_SECTION_MAP[page];
}

export function defaultOaRoleForRolePage(page: PlatformRolePage): EnterpriseOARole {
  return PAGE_DEFAULT_ROLE_MAP[page];
}

export function defaultSectionForOaRole(role: EnterpriseOARole): PlatformSection {
  const module = platformModuleForRole(role);
  if (module === 'REQUEST_CENTER') return 'requests';
  if (module === 'APPROVAL_CENTER') return 'approval';
  if (module === 'OPERATIONS_CONSOLE') return 'operations';
  if (module === 'POLICY_GOVERNANCE_CENTER') return 'policy';
  if (module === 'INTEGRATION_READINESS_CENTER') return 'admin';
  return 'audit';
}

export function sectionForOaRole(role: EnterpriseOARole): PlatformSection {
  return defaultSectionForOaRole(role);
}

export function rolePageForOaRole(role: EnterpriseOARole): PlatformRolePage {
  if (role === 'REQUESTER') return 'requester';
  if (role === 'OPERATOR') return 'operator';
  if (role === 'TENANT_ADMIN') return 'tenant_admin';
  return 'workspace';
}

export function labActorIdForOaRole(role: EnterpriseOARole): string {
  if (role === 'REQUESTER') return DEFAULT_LOCAL_LAB_ACTOR_IDS.requester;
  if (role === 'OPERATOR') return DEFAULT_LOCAL_LAB_ACTOR_IDS.operator;
  return DEFAULT_LOCAL_LAB_ACTOR_IDS.tenant_admin;
}

export function effectiveLocalLabActorIdForRolePage(page: PlatformRolePage, actorId: string): string {
  if (page === 'workspace') return actorId;
  return DEFAULT_LOCAL_LAB_ACTOR_IDS[page];
}

export function parsePlatformRouteSearch(
  input: string | URLSearchParams,
  options?: { availableRoles?: EnterpriseOARole[] },
): PlatformRouteState {
  const params = platformRouteParams(input);
  const warnings: string[] = [];
  const workspaceMode = isWorkspaceMode(params.get('workspace_mode')) ? (params.get('workspace_mode') as WorkspaceMode) : 'local_lab';
  if (params.get('workspace_mode') && params.get('workspace_mode') !== workspaceMode) {
    warnings.push('workspace_mode fallback applied');
  }

  const page = isPlatformRolePage(params.get('page')) ? (params.get('page') as PlatformRolePage) : 'workspace';
  if (params.get('page') && params.get('page') !== page) {
    warnings.push('page fallback applied');
  }

  const explicitRole = normalizeOaRole(params.get('oa_role'));
  if (params.get('oa_role') && !explicitRole) {
    warnings.push('oa_role fallback applied');
  }

  const availableRoles = normalizeOaRoles(options?.availableRoles || PLATFORM_OA_ROLE_ORDER);
  const roleState = resolveRequestedOaRole(page, explicitRole, availableRoles);
  if (explicitRole && roleState.oaRole !== explicitRole) {
    warnings.push('oa_role unavailable, ordered fallback applied');
  }

  const requestedSection = isPlatformSection(params.get('section')) ? (params.get('section') as PlatformSection) : null;
  const allowedSections = sectionsForRolePage(page);
  const section = requestedSection && allowedSections.includes(requestedSection)
    ? requestedSection
    : defaultSectionForRolePage(page);
  if (params.get('section') && section !== params.get('section')) {
    warnings.push('section fallback applied');
  }

  return {
    surface: 'platform',
    workspaceMode,
    page,
    section,
    oaRole: roleState.oaRole,
    roleResolution: roleState.roleResolution,
    sectionResolution: requestedSection && requestedSection === section ? 'url' : 'page_default',
    labActorId: normalizeStringParam(params.get('lab_actor_id')) || DEFAULT_LOCAL_LAB_ACTOR_IDS.tenant_admin,
    memberId: normalizeStringParam(params.get('member')),
    trialTaskId: normalizeStringParam(params.get('trial_task')),
    inviteCode: normalizeStringParam(params.get('invite_code')),
    enterpriseInviteToken: normalizeStringParam(params.get('enterprise_invite')),
    warnings,
  };
}

export function parseStandaloneTrialJoinRouteSearch(input: string | URLSearchParams): StandaloneTrialJoinRouteState {
  const params = platformRouteParams(input);
  const warnings: string[] = [];
  if (params.get('workspace_mode') && params.get('workspace_mode') !== 'local_lab') {
    warnings.push('trial-join workspace_mode fallback applied');
  }
  return {
    surface: 'trial-join',
    workspaceMode: 'local_lab',
    inviteCode: normalizeStringParam(params.get('invite_code')),
    warnings,
  };
}

export function buildPlatformRouteHref(route: {
  surface?: 'platform' | 'trial-join';
  workspaceMode?: WorkspaceMode;
  page?: PlatformRolePage;
  section?: PlatformSection;
  labActorId?: string | null;
  memberId?: string | null;
  trialTaskId?: string | null;
  inviteCode?: string | null;
  enterpriseInviteToken?: string | null;
  oaRole?: EnterpriseOARole | null;
}): string {
  const surface = route.surface || 'platform';
  const params = new URLSearchParams();
  params.set('surface', surface);
  if (surface === 'trial-join') {
    params.set('workspace_mode', route.workspaceMode || 'local_lab');
    if (route.inviteCode) {
      params.set('invite_code', route.inviteCode);
    }
    return `/?${params.toString()}`;
  }

  params.set('page', route.page || 'workspace');
  params.set('workspace_mode', route.workspaceMode || 'local_lab');
  if (route.workspaceMode === 'local_lab' && route.labActorId) {
    params.set('lab_actor_id', route.labActorId);
  }
  if (route.section) {
    params.set('section', route.section);
  }
  if (route.memberId) {
    params.set('member', route.memberId);
  }
  if (route.trialTaskId) {
    params.set('trial_task', route.trialTaskId);
  }
  if (route.inviteCode) {
    params.set('invite_code', route.inviteCode);
  }
  if (route.enterpriseInviteToken) {
    params.set('enterprise_invite', route.enterpriseInviteToken);
  }
  if (route.oaRole) {
    params.set('oa_role', route.oaRole);
  }
  return `/?${params.toString()}`;
}

export function buildPlatformRolePageHref(
  page: PlatformRolePage,
  workspaceMode: WorkspaceMode,
  labActorId?: string,
  section?: PlatformSection,
  focusedMemberId?: string | null,
  selectedTrialTaskId?: string | null,
  inviteCode?: string | null,
  activeOaRole?: EnterpriseOARole | null,
  enterpriseInviteToken?: string | null,
): string {
  return buildPlatformRouteHref({
    surface: 'platform',
    page,
    workspaceMode,
    labActorId,
    section,
    memberId: focusedMemberId,
    trialTaskId: selectedTrialTaskId,
    inviteCode,
    enterpriseInviteToken,
    oaRole: activeOaRole,
  });
}

export function preferredPageForSection(currentPage: PlatformRolePage, section: PlatformSection): PlatformRolePage {
  return sectionsForRolePage(currentPage).includes(section) ? currentPage : 'workspace';
}

export function buildPlatformSectionHref(input: {
  currentPage: PlatformRolePage;
  workspaceMode: WorkspaceMode;
  labActorId?: string | null;
  section: PlatformSection;
  memberId?: string | null;
  trialTaskId?: string | null;
  inviteCode?: string | null;
  oaRole: EnterpriseOARole;
  enterpriseInviteToken?: string | null;
}): string {
  const page = preferredPageForSection(input.currentPage, input.section);
  const labActorId = input.workspaceMode === 'local_lab'
    ? page === 'workspace'
      ? input.labActorId || DEFAULT_LOCAL_LAB_ACTOR_IDS.tenant_admin
      : labActorIdForOaRole(input.oaRole)
    : undefined;
  return buildPlatformRolePageHref(
    page,
    input.workspaceMode,
    labActorId,
    input.section,
    input.memberId,
    input.trialTaskId,
    input.inviteCode,
    input.oaRole,
    input.enterpriseInviteToken,
  );
}

export function buildStandaloneTrialJoinRouteHref(inviteCode?: string | null): string {
  return buildPlatformRouteHref({
    surface: 'trial-join',
    workspaceMode: 'local_lab',
    inviteCode,
  });
}

export function buildAcceptedRolePageHref(role: EnterpriseOARole, inviteCode?: string | null): string {
  const params = new URLSearchParams({
    surface: 'platform',
    page: rolePageForOaRole(role),
    workspace_mode: 'local_lab',
    lab_actor_id: labActorIdForOaRole(role),
    section: sectionForOaRole(role),
    oa_role: role,
  });
  if (inviteCode) {
    params.set('invite_code', inviteCode);
  }
  return `/?${params.toString()}`;
}

export function buildPlatformMemberSeatInvites(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
): PlatformMemberSeatInvite[] {
  if (!summary) return [];

  if (workspaceMode === 'local_lab') {
    const trialSeats = summary.trial_workspace?.seats || [];
    if (trialSeats.length > 0) {
      const participants = summary.trial_workspace?.participants || [];
      const participantsBySeatId = new Map(
        participants.map((participant) => [participant.seat_id, participant]),
      );
      const participantsByParticipantId = new Map(
        participants.map((participant) => [participant.participant_id, participant]),
      );
      const sessionsByParticipantId = new Map(
        (summary.trial_workspace?.sessions || []).map((session) => [session.participant_id, session]),
      );
      return PLATFORM_OA_ROLE_ORDER.map((role) => {
        const seat = trialSeats.find((item) => normalizeOaRole(item) === role || normalizeOaRole(item.role) === role);
        const participant = seat?.assigned_participant_id ? participantsByParticipantId.get(seat.assigned_participant_id) : undefined;
        const assignedParticipant = seat ? participantsBySeatId.get(seat.seat_id) : undefined;
        const effectiveParticipant = participant || assignedParticipant;
        const session = effectiveParticipant ? sessionsByParticipantId.get(effectiveParticipant.participant_id) : undefined;
        return {
          entityId: seat?.seat_id || `seat:${role}`,
          kind: 'SEAT',
          actorId: roleKey(role),
          title: effectiveParticipant?.actor_label || seat?.label || platformRoleLabel(role),
          oaRoles: [role],
          summary: seat?.summary || `${platformRoleLabel(role)} seat is visible in the shared trial workspace.`,
          status: formatStateLabel(seat?.claim_status || 'UNASSIGNED', 'unassigned'),
          provisioning: seat?.claim_status === 'ASSIGNED_BASE'
            ? 'assigned base'
            : formatStateLabel(seat?.claim_status || 'UNASSIGNED', 'unassigned'),
          access: seat?.claim_status === 'UNASSIGNED' ? 'not claimed' : 'granted',
          scope: 'shared trial workspace seat',
          lifecycle: seat?.claim_status === 'CLAIMED' ? 'claimed seat' : seat?.claim_status === 'ASSIGNED_BASE' ? 'assigned base seat' : 'open seat',
          joinTrace: [
            seat?.claimed_via_invite_id ? `Claimed via invite ${seat.claimed_via_invite_id}` : 'No invite claim recorded.',
            effectiveParticipant?.participant_id ? `Participant ${effectiveParticipant.participant_id}` : 'No participant claim recorded.',
            session?.session_id ? `Session ${session.session_id}` : 'No active session recorded.',
          ],
          boundaryChanges: [
            `Role boundary fixed to ${platformRoleLabel(role)}.`,
            seat?.claim_status === 'CLAIMED' ? 'Seat reassignment would change active access boundaries.' : 'Seat claim is required before access boundaries change.',
          ],
          page: rolePageForOaRole(role),
          sessionId: session?.session_id,
          detailLines: [
            seat?.summary || `${platformRoleLabel(role)} seat is visible in the shared trial workspace.`,
            effectiveParticipant?.summary || `${platformRoleLabel(role)} remains available for the shared trial path.`,
          ].filter(Boolean),
        };
      });
    }

    const localLabRecords: Array<PlatformMemberSeatInvite | null> = summary.local_role_lab.actors
      .map((actor) => {
        const role = normalizeOaRole(actor.role);
        if (!role) return null;
        return {
          entityId: actor.actor_id,
          kind: 'MEMBER' as const,
          actorId: actor.actor_id,
          title: actor.actor_label,
          oaRoles: [role],
          summary: actor.summary,
          status: actor.is_active ? 'active seat' : 'assigned seat',
          provisioning: 'provisioned',
          access: 'granted',
          scope: 'local role lab actor',
          lifecycle: actor.is_active ? 'actively viewing' : 'assigned in sandbox',
          joinTrace: [
            `Actor ${actor.actor_id}`,
            `Session ${actor.session_id}`,
          ],
          boundaryChanges: [
            `Role boundary fixed to ${platformRoleLabel(role)} in local_lab.`,
            'Boundary changes require switching the active seat or page.',
          ],
          page: rolePageForOaRole(role),
          sessionId: actor.session_id,
          detailLines: [actor.summary],
        } as PlatformMemberSeatInvite;
      });
    return localLabRecords.filter((record): record is PlatformMemberSeatInvite => record !== null);
  }

  if (summary.enterprise_membership?.members?.length) {
    return summary.enterprise_membership.members.map((member) => {
      const roles = normalizeOaRoles(member.role_assignments.map((assignment) => assignment.role));
      const roleLines = member.role_assignments.length > 0
        ? member.role_assignments.map((assignment) => {
            const role = normalizeOaRole(assignment.role);
            const roleLabel = role ? platformRoleLabel(role) : assignment.role;
            return `${roleLabel} @ ${assignment.workspace_id || assignment.tenant_id}`;
          })
        : ['No OA v1 role assignments yet.'];
      return {
        entityId: member.principal_id,
        kind: 'MEMBER' as const,
        actorId: member.principal_id,
        title: member.display_name || member.email,
        oaRoles: roles,
        summary: roleLines.join(' · '),
        status: formatStateLabel(member.status, 'unknown'),
        provisioning: formatStateLabel(member.status, 'unknown'),
        access: roles.length > 0 ? 'granted' : 'not assigned',
        scope: member.workspace_ids.length > 0 ? `${member.workspace_ids.length} workspace scope(s)` : 'tenant scope',
        lifecycle: formatStateLabel(member.status, 'unknown'),
        joinTrace: [
          `Principal ${member.principal_id}`,
          `Workspace scopes: ${member.workspace_ids.join(', ') || 'tenant default'}`,
        ],
        boundaryChanges: member.role_assignments.length > 0
          ? member.role_assignments.map((assignment) => {
              const role = normalizeOaRole(assignment.role);
              return `${role ? platformRoleLabel(role) : assignment.role} via ${assignment.source.toLowerCase().replace(/_/g, ' ')}`;
            })
          : ['No role boundary changes recorded yet.'],
        page: roles[0] ? rolePageForOaRole(roles[0]) : 'workspace',
        detailLines: roleLines,
      };
    });
  }

  const environmentActors: Array<PlatformMemberSeatInvite | null> = summary.environment_activation.actor_availability
    .map((actor) => {
      const role = normalizeOaRole(actor.role);
      if (!role) return null;
      return {
        entityId: actor.actor_id || roleKey(role),
        kind: 'MEMBER' as const,
        actorId: actor.actor_id || roleKey(role),
        title: actor.actor_label || actor.actor_id || platformRoleLabel(role),
        oaRoles: [role],
        summary: actor.summary,
        status: formatStateLabel(actor.state, 'unknown'),
        provisioning: formatStateLabel(actor.provisioning_state || 'UNKNOWN', 'unknown'),
        access: formatStateLabel(actor.access_state || 'UNKNOWN', 'unknown'),
        scope: 'workspace readiness actor',
        lifecycle: formatStateLabel(actor.state, 'unknown'),
        joinTrace: [
          actor.actor_id ? `Actor ${actor.actor_id}` : 'No actor id bound yet.',
          actor.missing_dependency_code ? `Missing dependency ${actor.missing_dependency_code}` : 'No join/access gap recorded.',
        ],
        boundaryChanges: [
          `Role boundary fixed to ${platformRoleLabel(role)}.`,
          'Access boundaries change only when the readiness state changes.',
        ],
        page: rolePageForOaRole(role),
        detailLines: [actor.summary],
      } as PlatformMemberSeatInvite;
    });
  const normalizedEnvironmentActors = environmentActors.filter((record): record is PlatformMemberSeatInvite => record !== null);
  const visibleRoles = new Set(normalizedEnvironmentActors.flatMap((record) => record.oaRoles));

  return normalizedEnvironmentActors.concat(
    PLATFORM_OA_ROLE_ORDER
      .filter((role) => !visibleRoles.has(role))
      .map((role) => ({
        entityId: `role_lens:${role}`,
        kind: 'ROLE_LENS' as const,
        actorId: roleKey(role),
        title: platformRoleLabel(role),
        oaRoles: [role],
        summary: `${platformRoleLabel(role)} is part of the OA v1 role model and is visible as a role lens.`,
        status: workspaceMode === 'demo' ? 'demo only' : 'mapped',
        provisioning: workspaceMode === 'demo' ? 'demo only' : 'mapped',
        access: workspaceMode === 'demo' ? 'demo only' : 'role lens',
        scope: 'role lens only',
        lifecycle: workspaceMode === 'demo' ? 'demo lens' : 'mapped lens',
        joinTrace: ['No member or invite is currently bound to this role lens.'],
        boundaryChanges: [`Role boundary is visible as ${platformRoleLabel(role)} only.`],
        page: rolePageForOaRole(role),
        detailLines: [`${platformRoleLabel(role)} is part of the OA v1 role model and is visible as a role lens.`],
      })),
  );
}

export function buildPlatformActorIdentities(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
): PlatformActorIdentity[] {
  if (!summary) return [];

  if (workspaceMode === 'local_lab') {
    const records = buildPlatformMemberSeatInvites(summary, workspaceMode);
    if (records.length > 0) {
      return records
        .filter((record) => record.oaRoles[0])
        .map((record) => ({
          actorId: record.actorId,
          displayName: record.title,
          oaRole: record.oaRoles[0],
          roleLabel: platformRoleLabel(record.oaRoles[0]),
          page: record.page,
          summary: record.summary,
          status: record.status,
          provisioning: record.provisioning,
          access: record.access,
          sessionId: record.sessionId,
          source: record.kind === 'SEAT' ? 'trial_seat' : 'local_lab_actor',
        }));
    }
  }

  const environmentActors: Array<PlatformActorIdentity | null> = summary.environment_activation.actor_availability
    .map((actor) => {
      const role = normalizeOaRole(actor.role);
      if (!role) return null;
      return {
        actorId: actor.actor_id || roleKey(role),
        displayName: actor.actor_label || actor.actor_id || platformRoleLabel(role),
        oaRole: role,
        roleLabel: platformRoleLabel(role),
        page: rolePageForOaRole(role),
        summary: actor.summary,
        status: formatStateLabel(actor.state, 'unknown'),
        provisioning: formatStateLabel(actor.provisioning_state || 'UNKNOWN', 'unknown'),
        access: formatStateLabel(actor.access_state || 'UNKNOWN', 'unknown'),
        source: 'environment_actor' as const,
      } as PlatformActorIdentity;
    });
  return environmentActors.filter((record): record is PlatformActorIdentity => record !== null);
}

export function buildPlatformTrialInviteRecords(summary: ProductShellSummary | null): PlatformMemberSeatInvite[] {
  return (summary?.trial_workspace?.invites || []).map((invite: TrialWorkspaceInviteRecord) => {
    const role = normalizeOaRole(invite) || 'TENANT_ADMIN';
    return {
      entityId: invite.invite_id,
      kind: 'INVITE',
      actorId: roleKey(role),
      title: platformRoleLabel(role),
      oaRoles: [role],
      summary: invite.label,
      status: invite.status,
      provisioning: invite.status === 'OPEN' ? 'open invite' : formatStateLabel(invite.status, 'unknown'),
      access: invite.status === 'OPEN' ? 'claimable' : 'claimed',
      scope: 'shared trial invite',
      lifecycle: invite.status === 'OPEN' ? 'awaiting claim' : 'invite consumed',
      joinTrace: [
        `Invite code ${invite.invite_code}`,
        invite.accepted_participant_id ? `Accepted by ${invite.accepted_participant_id}` : 'No participant has accepted this invite yet.',
      ],
      boundaryChanges: [
        `Invite targets ${platformRoleLabel(role)} access.`,
        invite.status === 'OPEN' ? 'Claiming this invite will change seat access boundaries.' : 'Invite no longer changes access boundaries.',
      ],
      page: rolePageForOaRole(role),
      inviteCode: invite.invite_code,
      acceptedLabel: invite.accepted_participant_id,
      detailLines: [invite.label],
    };
  });
}

export function buildPlatformAuditReceipts(
  summary: ProductShellSummary | null,
  selectedTaskId?: string | null,
): PlatformAuditReceipt[] {
  const task = activeTrialTask(summary, selectedTaskId);
  if (!task) return [];

  const activities = (summary?.trial_workspace?.activities || []).filter((activity) => activity.task_id === task.task_id);
  if (activities.length > 0) {
    return [...activities]
      .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
      .map((activity: TrialWorkspaceActivityRecord) => {
        const role = normalizeOaRole(activity);
        return {
          receiptId: activity.activity_id,
          kind: 'trial_activity',
          oaRole: role || 'WORKSPACE',
          actorLabel: role ? platformRoleLabel(role) : 'Workspace',
          summary: activity.summary,
          createdAt: activity.created_at,
        };
      });
  }

  return buildFallbackHandoffLines(task).map((line, index) => {
    const fallbackRole: EnterpriseOARole = index === 0 ? 'REQUESTER' : index === 1 ? 'OPERATOR' : 'TENANT_ADMIN';
    return {
      receiptId: `${task.task_id}:${index}`,
      kind: 'handoff_fallback',
      oaRole: fallbackRole,
      actorLabel: platformRoleLabel(fallbackRole),
      summary: line,
    };
  });
}

export function buildPlatformTaskLifecycleEntity(
  summary: ProductShellSummary | null,
  selectedTaskId?: string | null,
): PlatformTaskLifecycleEntity | null {
  const task = activeTrialTask(summary, selectedTaskId);
  if (!task) return null;
  const activeDetail = summary?.trial_workspace?.active_task_detail?.task_id === task.task_id
    ? summary.trial_workspace.active_task_detail
    : null;
  const approvalLines = [
    task.operator_review_required
      ? 'Operator review is required before downstream approval can continue.'
      : 'Operator review is already satisfied.',
    task.compliance_review_requested
      ? 'Tenant-admin / compliance review is part of the current trial path.'
      : 'Tenant-admin / compliance review has not been requested yet.',
    task.connector_requested
      ? 'Connector handoff is connector-aware but stays blocked until required fields are complete.'
      : 'Connector path is not involved in this sandbox scenario.',
  ];
  const missingFields = activeDetail?.missing_fields || task.missing_fields;
  return {
    taskId: task.task_id,
    title: `${task.scenario_title} · ${task.client_name}`,
    lifecycle: task.lifecycle,
    receiptSummary: activeDetail?.receipt_summary || task.receipt_summary,
    missingFields,
    handoffLines: activeDetail?.handoff_lines || buildFallbackHandoffLines(task),
    approvalSummary: activeDetail?.approval_summary || task.external_handoff_guard,
    approvalLines,
    nextAction: missingFields.length > 0
      ? `Resolve missing fields (${missingFields.join(', ')}) before attempting any external handoff.`
      : 'Complete the current review stage and continue to the next role handoff.',
    timeline: buildPlatformAuditReceipts(summary, task.task_id),
  };
}

function stageLineForTask(
  task: TrialWorkspaceTaskRecord,
  entity: PlatformTaskLifecycleEntity,
  stageKey: PlatformGovernedFlowStageKey,
): string | undefined {
  const lines = entity.handoffLines || [];
  if (stageKey === 'REQUEST') {
    return lines.find((line) => /requester/i.test(line)) || lines[0];
  }
  if (stageKey === 'APPROVAL') {
    if (task.scenario_id === 'oa_full_cycle_governed_execution') {
      return lines.find((line) => /approver|approval/i.test(line));
    }
    return undefined;
  }
  if (stageKey === 'OPERATIONS') {
    return lines.find((line) => /operator/i.test(line));
  }
  if (stageKey === 'REVIEW') {
    return lines.find((line) => /reviewer|tenant-admin|compliance request|boundary approval|remediation approval/i.test(line));
  }
  return lines.find((line) => /audit|receipt visibility/i.test(line));
}

function stageStatusFromLine(line?: string): PlatformGovernedFlowStageStatus | undefined {
  if (!line) return undefined;
  if (/·\s*(active|current)$/i.test(line)) return 'CURRENT';
  if (/·\s*(completed|done)$/i.test(line)) return 'DONE';
  if (/·\s*(pending|waiting|queued)$/i.test(line)) return 'UPCOMING';
  return undefined;
}

function stageSummaryFromLine(line: string | undefined, fallback: string): string {
  if (!line) return fallback;
  return line.split('·')[0]?.trim() || fallback;
}

function implicitStageSummary(task: TrialWorkspaceTaskRecord, stageKey: PlatformGovernedFlowStageKey): string {
  if (stageKey === 'REQUEST') {
    return `${task.client_name} request is staged in the workspace.`;
  }
  if (stageKey === 'APPROVAL') {
    return task.scenario_id === 'oa_full_cycle_governed_execution'
      ? `Bounded approval must release ${task.client_name} before execution continues.`
      : `Approval posture is already captured before ${task.client_name} moves deeper into the flow.`;
  }
  if (stageKey === 'OPERATIONS') {
    return `Operator package assembly is responsible for progressing ${task.client_name}.`;
  }
  if (stageKey === 'REVIEW') {
    return `Review evidence and gate posture remain in focus for ${task.client_name}.`;
  }
  return `Audit receipt visibility follows the same evidence set for ${task.client_name}.`;
}

function fallbackCurrentStageKey(task: TrialWorkspaceTaskRecord): PlatformGovernedFlowStageKey {
  if (task.scenario_id === 'oa_full_cycle_governed_execution') return 'APPROVAL';
  if (task.lifecycle === 'REQUESTED') return 'REQUEST';
  if (task.lifecycle === 'TENANT_ADMIN_REVIEW') return 'REVIEW';
  return 'OPERATIONS';
}

function blockedCategoryFromMissingFields(missingFields: string[]): PlatformBlockedReasonCategory {
  const normalized = missingFields.map((field) => field.toLowerCase());
  if (normalized.some((field) => field.includes('policy') || field.includes('approval'))) return 'POLICY';
  if (normalized.some((field) => field.includes('workspace') || field.includes('assignment') || field.includes('seat'))) return 'ACCESS';
  if (normalized.some((field) => field.includes('integration') || field.includes('connector') || field.includes('readiness') || field.includes('environment') || field.includes('vault'))) {
    return 'READINESS';
  }
  return 'EVIDENCE';
}

function blockedCategoryFromBlockerCode(code: string | undefined): PlatformBlockedReasonCategory {
  const normalized = String(code || '').toLowerCase();
  if (normalized.includes('access') || normalized.includes('workspace') || normalized.includes('identity')) return 'ACCESS';
  if (normalized.includes('connector') || normalized.includes('vault') || normalized.includes('environment') || normalized.includes('readiness')) return 'READINESS';
  if (normalized.includes('policy') || normalized.includes('approval')) return 'POLICY';
  return 'EVIDENCE';
}

function roleLensSummary(activeRole: EnterpriseOARole, currentStage: PlatformGovernedFlowStage): string {
  if (activeRole === 'REVIEWER') {
    return `Reviewer sees the same evidence set that clears the ${currentStage.label.toLowerCase()} gate.`;
  }
  if (activeRole === 'AUDITOR') {
    return `Auditor sees the same evidence set in a read-only receipt and export lens.`;
  }
  if (activeRole === 'TENANT_ADMIN') {
    return `Tenant Admin sees the same evidence set with readiness and boundary emphasis.`;
  }
  if (activeRole === 'APPROVER') {
    return `Approver sees the same evidence set used to release bounded scope.`;
  }
  if (activeRole === 'OPERATOR') {
    return `Operator sees the same evidence set used to assemble the governed package.`;
  }
  return `Requester sees the same evidence set that explains progress, blockers, and final receipt posture.`;
}

function roleAwareNextAction(
  activeRole: EnterpriseOARole,
  currentStage: PlatformGovernedFlowStage,
  blocker: PlatformBlockedReason,
): string {
  if (activeRole === currentStage.ownerRole) {
    if (currentStage.key === 'REQUEST') {
      return 'Confirm request scope in Request Center and hand the task into Approval Center.';
    }
    if (currentStage.key === 'APPROVAL') {
      return blocker.blocked
        ? 'Use Approval Center to release bounded scope once the current blocker is cleared.'
        : 'Record the approval decision in Approval Center and hand the task to Operations Console.';
    }
    if (currentStage.key === 'OPERATIONS') {
      return blocker.blocked
        ? 'Use Operations Console to resolve the blocker and prepare the next handoff.'
        : 'Complete the operator package in Operations Console and route it to Review Center.';
    }
    if (currentStage.key === 'REVIEW') {
      return blocker.blocked
        ? 'Use Review Center to validate missing evidence and clear the review blocker.'
        : 'Use Review Center to validate evidence and release the task into Audit & Reporting Center.';
    }
    return 'Use Audit & Reporting Center to confirm receipt visibility and export the governed audit package.';
  }

  if (activeRole === 'REQUESTER') {
    return `Stay in Request Center and answer any missing-field prompts while ${platformRoleLabel(currentStage.ownerRole)} progresses ${currentStage.label.toLowerCase()}.`;
  }
  if (activeRole === 'APPROVER') {
    return `Watch ${currentStage.label.toLowerCase()} progress and prepare to release bounded scope from Approval Center.`;
  }
  if (activeRole === 'OPERATOR') {
    return `Watch ${platformRoleLabel(currentStage.ownerRole)} in ${currentStage.label.toLowerCase()} and continue the package from Operations Console when it returns to you.`;
  }
  if (activeRole === 'REVIEWER') {
    return `Keep the shared evidence set under review so Review Center can clear the next gate once ${platformRoleLabel(currentStage.ownerRole)} is done.`;
  }
  if (activeRole === 'AUDITOR') {
    return `Track the same evidence set from Audit & Reporting Center; final receipt visibility follows ${platformRoleLabel(currentStage.ownerRole)}.`;
  }
  if (activeRole === 'TENANT_ADMIN') {
    return `Use Integration & Readiness Center to inspect the same blocker and clear enterprise gates while ${platformRoleLabel(currentStage.ownerRole)} remains the chain owner.`;
  }
  return `${platformRoleLabel(activeRole)} should monitor ${platformRoleLabel(currentStage.ownerRole)} in ${currentStage.label.toLowerCase()}.`;
}

export function buildPlatformGovernedFlowState(
  summary: ProductShellSummary | null,
  selectedTaskId: string | null | undefined,
  activeRole: EnterpriseOARole,
): PlatformGovernedFlowState | null {
  const task = activeTrialTask(summary, selectedTaskId);
  const entity = buildPlatformTaskLifecycleEntity(summary, selectedTaskId);
  if (!task || !entity) return null;

  const explicitCurrentStage = GOVERNED_FLOW_STAGES.find((stage) => stageStatusFromLine(stageLineForTask(task, entity, stage.key)) === 'CURRENT');
  const currentStageKey = explicitCurrentStage?.key || fallbackCurrentStageKey(task);
  const currentStageMeta = GOVERNED_FLOW_STAGES.find((stage) => stage.key === currentStageKey) || GOVERNED_FLOW_STAGES[0];

  const blocker = (() => {
    if (entity.missingFields.length > 0) {
      const category = blockedCategoryFromMissingFields(entity.missingFields);
      return {
        blocked: true,
        blockedBy: currentStageMeta.ownerRole,
        blockedBecause: `Missing required fields: ${entity.missingFields.join(', ')}.`,
        category,
        nextSection: currentStageMeta.section,
        recommendedAction: category === 'EVIDENCE'
          ? 'Complete the missing evidence fields before progressing the governed handoff.'
          : category === 'POLICY'
            ? 'Resolve the policy or approval field gap before releasing the next handoff.'
            : category === 'ACCESS'
              ? 'Fix the workspace or assignment gap before progressing the task.'
              : 'Clear the readiness dependency before progressing the task.',
      } satisfies PlatformBlockedReason;
    }
    const workspaceBlocker = summary?.remaining_blockers?.[0];
    if (workspaceBlocker) {
      const category = blockedCategoryFromBlockerCode(workspaceBlocker.code);
      return {
        blocked: true,
        blockedBy: 'WORKSPACE',
        blockedBecause: workspaceBlocker.missing_artifact || workspaceBlocker.summary,
        category,
        nextSection: category === 'EVIDENCE'
          ? currentStageMeta.section
          : 'admin',
        recommendedAction: workspaceBlocker.next_action || 'Resolve the workspace blocker before continuing the governed flow.',
      } satisfies PlatformBlockedReason;
    }
    return {
      blocked: false,
      blockedBy: currentStageMeta.ownerRole,
      blockedBecause: entity.approvalSummary,
      category: 'EVIDENCE' as PlatformBlockedReasonCategory,
      nextSection: currentStageMeta.section,
      recommendedAction: `Open ${currentStageMeta.label} to continue governed progression.`,
    } satisfies PlatformBlockedReason;
  })();

  const currentStageIndex = GOVERNED_FLOW_STAGES.findIndex((stage) => stage.key === currentStageKey);
  const stages = GOVERNED_FLOW_STAGES.map((stage, index) => {
    const line = stageLineForTask(task, entity, stage.key);
    const parsedStatus = stageStatusFromLine(line);
    const summaryLine = stageSummaryFromLine(line, implicitStageSummary(task, stage.key));
    let status: PlatformGovernedFlowStageStatus;
    if (stage.key === currentStageKey) {
      status = blocker.blocked ? 'BLOCKED' : 'CURRENT';
    } else if (parsedStatus === 'DONE') {
      status = 'DONE';
    } else if (index < currentStageIndex) {
      status = 'DONE';
    } else {
      status = parsedStatus === 'CURRENT' || parsedStatus === 'BLOCKED' ? 'UPCOMING' : (parsedStatus || 'UPCOMING');
    }
    return {
      key: stage.key,
      label: stage.label,
      ownerRole: stage.ownerRole,
      section: stage.section,
      status,
      summary: summaryLine,
    };
  });

  const currentStage = stages.find((stage) => stage.key === currentStageKey) || stages[0];
  const evidenceItems = [
    ...entity.missingFields.map((field) => `Missing field: ${field}`),
    ...entity.approvalLines,
  ];
  const receiptItems = entity.timeline.slice(0, 5).map((entry) => `${entry.actorLabel}: ${entry.summary}`);
  const waitingSummary = activeRole === currentStage.ownerRole
    ? `Downstream roles are waiting on ${platformRoleLabel(currentStage.ownerRole)}.`
    : `${platformRoleLabel(activeRole)} is waiting on ${platformRoleLabel(currentStage.ownerRole)}.`;

  return {
    taskId: task.task_id,
    title: entity.title,
    currentStageKey,
    currentStageLabel: currentStage.label,
    stages,
    waitingOnRole: currentStage.ownerRole,
    waitingSummary,
    nextAction: roleAwareNextAction(activeRole, currentStage, blocker),
    nextDestinationSection: blocker.nextSection,
    nextDestinationRole: currentStage.ownerRole,
    nextDestinationLabel: GOVERNED_FLOW_STAGES.find((stage) => stage.section === blocker.nextSection)?.label || currentStage.label,
    blocker,
    evidence: {
      evidenceSetId: task.task_id,
      roleLensRole: activeRole,
      roleLensSummary: roleLensSummary(activeRole, currentStage),
      receiptSummary: entity.receiptSummary,
      approvalSummary: entity.approvalSummary,
      evidenceItems: evidenceItems.length > 0 ? evidenceItems : ['No explicit evidence deltas are recorded yet.'],
      receiptItems: receiptItems.length > 0 ? receiptItems : ['No receipt timeline entries are visible yet.'],
      activityCount: entity.timeline.length,
    },
    timeline: entity.timeline,
  };
}

export function buildPlatformReadinessGates(summary: ProductShellSummary | null): PlatformReadinessGate[] {
  if (!summary) {
    return [{ gateId: 'workspace', state: 'UNKNOWN', summary: 'Workspace activation summary unavailable.' }];
  }

  return [
    {
      gateId: 'identity',
      state: summary.environment_activation.identity_readiness.state,
      summary: summary.environment_activation.identity_readiness.summary,
    },
    {
      gateId: 'connector',
      state: summary.environment_activation.connector_readiness.state,
      summary: summary.environment_activation.connector_readiness.summary,
    },
    {
      gateId: 'vault',
      state: summary.environment_activation.vault_readiness.state,
      summary: summary.environment_activation.vault_readiness.summary,
    },
    ...summary.remaining_blockers.map((blocker) => ({
      gateId: blocker.code,
      state: 'BLOCKED' as const,
      summary: blocker.summary,
      ownerLabel: blocker.owner_label,
    })),
  ];
}

export function resolvePlatformFocusedMemberId(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
  rolePage: PlatformRolePage,
  focusedMemberId?: string | null,
  activeLabActorId?: string,
): string | null {
  const records = buildPlatformMemberSeatInvites(summary, workspaceMode);
  if (focusedMemberId && records.some((record) => record.actorId === focusedMemberId)) {
    return focusedMemberId;
  }

  if (workspaceMode === 'local_lab' && rolePage !== 'workspace') {
    const pageRole = defaultOaRoleForRolePage(rolePage);
    const pageRecord = records.find((record) => record.oaRoles.includes(pageRole));
    if (pageRecord) {
      return pageRecord.actorId;
    }
    return effectiveLocalLabActorIdForRolePage(rolePage, activeLabActorId || DEFAULT_LOCAL_LAB_ACTOR_IDS.tenant_admin);
  }

  if (workspaceMode === 'local_lab' && activeLabActorId && records.some((record) => record.actorId === activeLabActorId)) {
    return activeLabActorId;
  }

  return records[0]?.actorId || null;
}

export function resolvePlatformTrialTaskId(
  summary: ProductShellSummary | null,
  requestedTaskId?: string | null,
): string | null {
  const tasks = summary?.trial_workspace?.tasks || [];
  if (tasks.length === 0) return null;
  if (requestedTaskId && tasks.some((task) => task.task_id === requestedTaskId)) {
    return requestedTaskId;
  }
  return tasks[0]?.task_id || null;
}

function availabilityRolesForContext(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): EnterpriseOARole[] {
  if (workspaceMode === 'demo') {
    return [...PLATFORM_OA_ROLE_ORDER];
  }
  if (workspaceMode === 'current') {
    return normalizeOaRoles(summary?.enterprise_account?.available_roles || []);
  }
  const trialRoles = normalizeOaRoles(summary?.trial_workspace?.participants || []);
  if (trialRoles.length > 0) return trialRoles;
  const actorRoles = normalizeOaRoles(summary?.local_role_lab?.actors?.map((actor) => actor.role) || []);
  if (actorRoles.length > 0) return actorRoles;
  return ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'];
}

export function buildPlatformWorkspaceContext(input: {
  summary: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
  page: PlatformRolePage;
  section: PlatformSection;
  oaRole: EnterpriseOARole;
  enterpriseInviteToken?: string | null;
  inviteCode?: string | null;
  focusedMemberId?: string | null;
  selectedTrialTaskId?: string | null;
  warnings?: string[];
}): PlatformWorkspaceContext {
  const availableRoles = availabilityRolesForContext(input.summary, input.workspaceMode);
  const roleState = resolveRequestedOaRole(input.page, input.oaRole, availableRoles);
  return {
    workspaceMode: input.workspaceMode,
    page: input.page,
    section: input.section,
    oaRole: roleState.oaRole,
    availableRoles,
    signedIn: Boolean(input.summary?.enterprise_account?.signed_in),
    writePersistenceReady: Boolean(input.summary?.enterprise_account?.diagnostics?.write_persistence_ready),
    enterpriseInviteToken: input.enterpriseInviteToken,
    inviteCode: input.inviteCode,
    focusedMemberId: input.focusedMemberId,
    selectedTrialTaskId: input.selectedTrialTaskId,
    warnings: input.warnings || [],
  };
}

export function buildPlatformCapabilityDecisions(
  context: PlatformWorkspaceContext,
): Record<PlatformCapability, PlatformCapabilityDecision> {
  const deny = (
    capability: PlatformCapability,
    reason: string,
    visible: boolean,
    ambiguous = false,
  ): PlatformCapabilityDecision => ({
    capability,
    visible,
    enabled: false,
    ambiguous,
    reason,
  });
  const allow = (capability: PlatformCapability, reason: string, visible: boolean): PlatformCapabilityDecision => ({
    capability,
    visible,
    enabled: true,
    ambiguous: false,
    reason,
  });
  const roleBound = context.availableRoles.includes(context.oaRole);
  const writeClosedReason = 'Enterprise writes are fail-closed until a real current-workspace session reports write persistence ready.';

  return {
    OKTA_SIGN_IN: context.workspaceMode !== 'current'
      ? deny('OKTA_SIGN_IN', 'Okta OIDC sign-in is only available on the current workspace path.', false)
      : context.signedIn
        ? deny('OKTA_SIGN_IN', 'Enterprise session already active.', false)
        : allow('OKTA_SIGN_IN', 'Sign in with Okta OIDC.', true),
    OKTA_SIGN_OUT: context.workspaceMode === 'current' && context.signedIn
      ? allow('OKTA_SIGN_OUT', 'Clear the active enterprise session.', true)
      : deny('OKTA_SIGN_OUT', 'No active enterprise session is present.', false),
    ENTERPRISE_INVITE_ACCEPT: context.workspaceMode !== 'current' || !context.enterpriseInviteToken
      ? deny('ENTERPRISE_INVITE_ACCEPT', 'Enterprise invite acceptance is only relevant on current-workspace invite links.', Boolean(context.enterpriseInviteToken))
      : !context.signedIn
        ? deny('ENTERPRISE_INVITE_ACCEPT', 'Sign in with Okta OIDC before accepting the enterprise invite.', true)
        : !context.writePersistenceReady
          ? deny('ENTERPRISE_INVITE_ACCEPT', writeClosedReason, true)
          : !roleBound
            ? deny('ENTERPRISE_INVITE_ACCEPT', 'The selected oa_role is not bound to this current workspace session.', true, true)
            : allow('ENTERPRISE_INVITE_ACCEPT', 'Accept the enterprise invite with the active oa_role.', true),
    ENTERPRISE_MEMBERSHIP_WRITE: context.workspaceMode !== 'current'
      ? deny('ENTERPRISE_MEMBERSHIP_WRITE', 'Membership writes only apply to the current workspace.', false)
      : !context.signedIn
        ? deny('ENTERPRISE_MEMBERSHIP_WRITE', 'Sign in with Okta OIDC before managing enterprise membership.', true)
        : !context.writePersistenceReady
          ? deny('ENTERPRISE_MEMBERSHIP_WRITE', writeClosedReason, true)
          : !roleBound
            ? deny('ENTERPRISE_MEMBERSHIP_WRITE', 'The selected oa_role is not bound to this current workspace session.', true, true)
            : context.oaRole !== 'TENANT_ADMIN' && context.oaRole !== 'WORKSPACE_ADMIN'
              ? deny('ENTERPRISE_MEMBERSHIP_WRITE', 'Select TENANT_ADMIN or WORKSPACE_ADMIN to manage membership.', true)
              : allow('ENTERPRISE_MEMBERSHIP_WRITE', 'Manage membership with the active oa_role.', true),
    APPROVAL_DECISION: context.workspaceMode !== 'current'
      ? deny('APPROVAL_DECISION', 'Approval decisions only run on the current workspace.', false)
      : !context.signedIn
        ? deny('APPROVAL_DECISION', 'Sign in with Okta OIDC before making approval decisions.', true)
        : !context.writePersistenceReady
          ? deny('APPROVAL_DECISION', writeClosedReason, true)
          : !roleBound
            ? deny('APPROVAL_DECISION', 'The selected oa_role is not bound to this current workspace session.', true, true)
            : context.oaRole !== 'APPROVER'
              ? deny('APPROVAL_DECISION', 'Select APPROVER to make approval decisions.', true)
              : allow('APPROVAL_DECISION', 'Approval actions are enabled for the active oa_role.', true),
    REVIEW_DECISION: context.workspaceMode !== 'current'
      ? deny('REVIEW_DECISION', 'Review decisions only run on the current workspace.', false)
      : !context.signedIn
        ? deny('REVIEW_DECISION', 'Sign in with Okta OIDC before making review decisions.', true)
        : !context.writePersistenceReady
          ? deny('REVIEW_DECISION', writeClosedReason, true)
          : !roleBound
            ? deny('REVIEW_DECISION', 'The selected oa_role is not bound to this current workspace session.', true, true)
            : context.oaRole !== 'REVIEWER'
              ? deny('REVIEW_DECISION', 'Select REVIEWER to make review decisions.', true)
              : allow('REVIEW_DECISION', 'Review actions are enabled for the active oa_role.', true),
    OA_ROLE_SWITCH: context.availableRoles.length === 0
      ? deny('OA_ROLE_SWITCH', 'No OA roles are currently available in this workspace context.', true, true)
      : allow('OA_ROLE_SWITCH', 'Switch between available OA roles.', true),
    TRIAL_INVITE_ACCEPT: context.workspaceMode !== 'local_lab'
      ? deny('TRIAL_INVITE_ACCEPT', 'Trial invite acceptance is only available in local_lab.', false)
      : allow('TRIAL_INVITE_ACCEPT', 'Accept the shared-trial invite in local_lab.', true),
  };
}

export function buildPlatformRouteIssues(input: {
  warnings: string[];
  requestedMemberId?: string | null;
  resolvedMemberId?: string | null;
  requestedTaskId?: string | null;
  resolvedTaskId?: string | null;
  context: PlatformWorkspaceContext;
}): PlatformRouteIssue[] {
  const issues: PlatformRouteIssue[] = [];
  if (input.warnings.length > 0) {
    issues.push({
      kind: 'MALFORMED_URL',
      title: 'Malformed URL fallback applied',
      detail: `The link included unsupported or incomplete route state, so the workspace fell back to the closest safe view. Details: ${input.warnings.join(', ')}.`,
    });
  }
  if (input.requestedMemberId && input.resolvedMemberId && input.requestedMemberId !== input.resolvedMemberId) {
    issues.push({
      kind: 'STALE_LINK',
      title: 'Stale member link',
      detail: `The requested member focus is no longer available, so the workspace moved to ${input.resolvedMemberId}.`,
    });
  }
  if (input.requestedTaskId && input.resolvedTaskId && input.requestedTaskId !== input.resolvedTaskId) {
    issues.push({
      kind: 'STALE_LINK',
      title: 'Stale task link',
      detail: `The requested task focus is no longer available, so the workspace moved to ${input.resolvedTaskId}.`,
    });
  }
  if (input.context.workspaceMode === 'current' && !input.context.signedIn) {
    issues.push({
      kind: 'NO_ACCESS',
      title: 'No current-workspace access',
      detail: 'This current-workspace route requires a signed-in enterprise session. The shell remains visible, but write actions stay fail-closed.',
    });
  }
  return issues;
}

export function buildPlatformPolicySurface(
  summary: ProductShellSummary | null,
  activeRole: EnterpriseOARole,
  selectedTaskId?: string | null,
): PlatformPolicySurface {
  const flow = buildPlatformGovernedFlowState(summary, selectedTaskId, activeRole);
  const packName = summary?.policy_studio?.pack_name || 'Policy Studio';
  const packVersion = summary?.policy_studio?.pack_version || 'unknown';
  const packFingerprint = summary?.policy_studio?.pack_fingerprint || 'unavailable';
  const overrideCount = summary?.policy_studio?.override_count ?? 0;
  return {
    policyBasis: [
      `Policy basis: ${packName} v${packVersion}`,
      `Fingerprint: ${packFingerprint}`,
      summary?.policy_studio?.summary || 'No policy summary is available.',
    ],
    exceptionWaiver: [
      overrideCount > 0
        ? `Exceptions / waivers recorded: ${overrideCount}`
        : 'No explicit exception or waiver is recorded in this preview.',
      flow?.blocker.category === 'POLICY'
        ? 'The current blocker remains under policy control and no waiver has released it.'
        : 'No active policy waiver is required for the current task state.',
    ],
    decisionRationale: [
      summary?.policy_studio?.approval_governance_summary || 'Approval-governance rationale unavailable.',
      summary?.policy_studio?.rollout_summary || 'Rollout rationale unavailable.',
      ...(summary?.policy_studio?.detail_lines || []).slice(0, 2),
    ],
    blockedReasonLinkage: flow
      ? [
          `Blocked reason links back to ${packName}.`,
          `${flow.blocker.category} blocker: ${flow.blocker.blockedBecause}`,
          `Next section: ${flow.nextDestinationLabel}`,
        ]
      : [
          `Blocked reason linkage defaults to ${packName}.`,
          'No governed task is selected, so there is no active blocker linkage to show.',
        ],
  };
}

export function buildPlatformOktaReadinessSurface(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
): PlatformOktaReadinessSurface {
  const environment = summary?.environment_activation;
  const diagnostics = summary?.enterprise_account?.diagnostics;
  const checklist: PlatformOktaReadinessSurface['checklist'] = [
    {
      key: 'idp_target',
      label: 'Okta OIDC target',
      state: diagnostics?.provider ? 'OKTA_ONLY' : workspaceMode === 'local_lab' ? 'OKTA_ONLY' : 'UNKNOWN',
      detail: diagnostics?.provider
        ? `Enterprise login target is ${diagnostics.provider}.`
        : workspaceMode === 'local_lab'
          ? 'Local role lab uses a simulated identity path but the real enterprise target remains Okta OIDC only.'
          : 'Sign in to load the fixed Okta OIDC target diagnostics.',
    },
    {
      key: 'identity',
      label: 'Identity readiness',
      state: environment?.identity_readiness.state || 'UNKNOWN',
      detail: environment?.identity_readiness.summary || 'Identity readiness unavailable.',
    },
    {
      key: 'environment',
      label: 'Environment binding',
      state: environment?.environment_binding.state || 'UNKNOWN',
      detail: environment?.environment_binding.summary || 'Environment binding unavailable.',
    },
    {
      key: 'connector',
      label: 'Connector / route readiness',
      state: environment?.connector_readiness.state || 'UNKNOWN',
      detail: environment?.connector_readiness.summary || 'Connector readiness unavailable.',
    },
    {
      key: 'vault',
      label: 'Credential / vault readiness',
      state: environment?.vault_readiness.state || 'UNKNOWN',
      detail: environment?.vault_readiness.summary || 'Vault readiness unavailable.',
    },
  ];

  return {
    checklist,
    whyReady: environment?.activation_ready
      ? [
          environment.activation_ready_summary,
          'Tenant admins can explain readiness because the identity, environment, connector, and vault gates are all clear.',
        ]
      : [],
    whyNotReady: environment?.activation_ready
      ? []
      : [
          environment?.activation_ready_summary || 'Activation readiness is unavailable.',
          ...(environment?.missing_dependency_summaries || []).slice(0, 3),
        ],
    environmentStatus: [
      `Workspace mode: ${workspaceMode}`,
      `Environment: ${environment?.environment_kind || 'UNKNOWN'}`,
      `Connector activation: ${environment?.connector_activation.summary || 'Connector activation unavailable.'}`,
      diagnostics
        ? `Enterprise writes ready: ${diagnostics.write_persistence_ready ? 'yes' : 'no'}`
        : 'Enterprise diagnostics not loaded.',
    ],
  };
}

export function buildPlatformAuditSurface(
  summary: ProductShellSummary | null,
  activeRole: EnterpriseOARole,
  selectedTaskId?: string | null,
): PlatformAuditSurface {
  const flow = buildPlatformGovernedFlowState(summary, selectedTaskId, activeRole);
  if (!flow) {
    return {
      timelineLines: ['No governed task timeline is currently selected.'],
      evidenceBundleLines: ['No shared evidence bundle is currently selected.'],
      exportBundleLines: ['No preview export bundle is currently available.'],
    };
  }
  return {
    timelineLines: flow.timeline.map((entry) => `${entry.actorLabel} · ${entry.summary}`),
    evidenceBundleLines: [
      `Evidence bundle: ${flow.evidence.evidenceSetId}`,
      ...flow.evidence.evidenceItems,
    ],
    exportBundleLines: [
      `Receipt summary: ${flow.evidence.receiptSummary}`,
      `Approval summary: ${flow.evidence.approvalSummary}`,
      `Timeline entries: ${flow.evidence.activityCount}`,
    ],
  };
}

export function buildPlatformWorkspaceGovernanceSurface(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
): PlatformWorkspaceGovernanceSurface {
  const ownerLabel = summary?.activation_package?.owner_label || 'Workspace owner unavailable';
  const blockers = summary?.remaining_blockers || [];
  return {
    ownership: [
      `Workspace owner: ${ownerLabel}`,
      workspaceMode === 'local_lab'
        ? 'Local role lab acts as the bounded workspace owner for the rehearsal shell.'
        : `Workspace mode: ${workspaceMode}`,
    ],
    adminBoundaries: [
      'Tenant Admin owns enterprise readiness and activation gates.',
      'Workspace Admin owns seat scope, participant scope, and workspace-local boundary changes.',
      'Policy / Governance Admin owns policy basis, overrides, and waivers.',
    ],
    escalationPath: [
      'Requester -> Operator -> Tenant Admin',
      'Tenant Admin -> Workspace Admin -> Policy / Governance Admin',
      `Current escalation owner: ${ownerLabel}`,
    ],
    workspaceHealth: [
      summary?.environment_activation?.activation_ready_summary || 'Workspace health unavailable.',
      `Remaining blockers: ${blockers.length}`,
      blockers[0]?.summary || 'No blocker summary is currently loaded.',
    ],
  };
}

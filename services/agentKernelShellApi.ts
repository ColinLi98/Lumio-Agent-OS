import { buildApiUrl } from './apiBaseUrl';

export type EnvironmentKind = 'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION';
export type WorkspaceBindingKind = 'UNBOUND' | 'DEMO_WORKSPACE' | 'TENANT_WORKSPACE' | 'LOCAL_ROLE_LAB_WORKSPACE';
export type PilotActivationStatus =
    | 'NOT_APPLICABLE'
    | 'DEMO_READY'
    | 'PILOT_BLOCKED'
    | 'PILOT_READY'
    | 'PRODUCTION_READY';
export type DependencyReadinessState = 'READY' | 'MISSING' | 'DEGRADED' | 'DEMO_ONLY' | 'BLOCKED';
export type PilotActivationPackageStatus = 'HANDOFF_REQUIRED' | 'IN_PROGRESS' | 'VERIFICATION_PENDING' | 'BLOCKED' | 'ACTIVATION_READY';
export type PilotActivationRequirementStatus = 'PENDING' | 'RECEIVED' | 'VERIFIED' | 'PROMOTED' | 'REJECTED' | 'BLOCKED';
export type RequesterInboxGroup = 'IN_PROGRESS' | 'BLOCKED' | 'WAITING' | 'COMPLETED';
export type WorkspaceMode = 'current' | 'demo' | 'local_lab';
export type ActorRole = 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
export type EnterpriseOARole =
    | 'REQUESTER'
    | 'APPROVER'
    | 'OPERATOR'
    | 'REVIEWER'
    | 'TENANT_ADMIN'
    | 'WORKSPACE_ADMIN'
    | 'POLICY_GOVERNANCE_ADMIN'
    | 'INTEGRATION_ADMIN'
    | 'AUDITOR';
export type EnterpriseOAModule =
    | 'REQUEST_CENTER'
    | 'APPROVAL_CENTER'
    | 'OPERATIONS_CONSOLE'
    | 'POLICY_GOVERNANCE_CENTER'
    | 'INTEGRATION_READINESS_CENTER'
    | 'AUDIT_REPORTING_CENTER';

const ENTERPRISE_OA_ROLE_VALUES: EnterpriseOARole[] = [
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

interface TrialWorkspaceRoleLike {
    role?: EnterpriseOARole | ActorRole;
    oa_role?: EnterpriseOARole;
    actor_role?: ActorRole;
}

export function isEnterpriseOARole(value: unknown): value is EnterpriseOARole {
    return typeof value === 'string' && ENTERPRISE_OA_ROLE_VALUES.includes(value as EnterpriseOARole);
}

export function resolveTrialWorkspaceOaRole(
    value: TrialWorkspaceRoleLike | EnterpriseOARole | ActorRole | string | null | undefined,
): EnterpriseOARole | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') {
        return isEnterpriseOARole(value) ? value : undefined;
    }
    if (isEnterpriseOARole(value.oa_role)) return value.oa_role;
    if (isEnterpriseOARole(value.role)) return value.role;
    if (isEnterpriseOARole(value.actor_role)) return value.actor_role;
    return undefined;
}

export function formatTrialWorkspaceRoleLabel(
    value: TrialWorkspaceRoleLike | EnterpriseOARole | ActorRole | string | null | undefined,
    fallback = 'workspace',
): string {
    const role = resolveTrialWorkspaceOaRole(value) || fallback;
    return String(role).toLowerCase().replace(/_/g, ' ');
}

export interface WorkspaceModeOptionSummary {
    mode: WorkspaceMode;
    label: string;
    selected: boolean;
    workspace_binding_kind: WorkspaceBindingKind;
    environment_kind: EnvironmentKind;
    description: string;
}

export interface ActorAvailabilitySummary {
    role: ActorRole;
    state: DependencyReadinessState;
    provisioning_state?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    access_state?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    actor_id?: string;
    actor_label?: string;
    summary: string;
    missing_dependency_code?: string;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface LocalRoleLabActorSummary {
    actor_id: string;
    role: ActorRole;
    actor_label: string;
    session_id: string;
    summary: string;
    is_active: boolean;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export type LocalRoleLabHandoffStatus = 'COMPLETED' | 'ACTIVE' | 'PENDING';

export interface LocalRoleLabScenarioSummary {
    scenario_id: string;
    title: string;
    summary: string;
    current_stage: string;
    focus_points: string[];
}

export interface LocalRoleLabHandoffStep {
    step_id: string;
    from_role?: ActorRole;
    to_role?: ActorRole;
    title: string;
    summary: string;
    status: LocalRoleLabHandoffStatus;
}

export interface LocalRoleLabSummary {
    enabled: boolean;
    label: string;
    summary: string;
    active_actor_id: string;
    active_role: ActorRole;
    day_zero_blocked_summary: string;
    scenario: LocalRoleLabScenarioSummary;
    handoff_timeline: LocalRoleLabHandoffStep[];
    evidence_classification_summary: string;
    pilot_activation_gap_summary: string;
    actors: LocalRoleLabActorSummary[];
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface PilotEnvironmentBindingSummary {
    state: 'MISSING' | 'BOUND' | 'DEMO_ONLY' | 'BLOCKED';
    environment_kind: EnvironmentKind;
    environment_label: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    summary: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
}

export interface PilotConnectorActivationSummary {
    state: 'INELIGIBLE' | 'ELIGIBLE' | 'DEMO_ONLY' | 'BLOCKED';
    connector_id?: string;
    summary: string;
    source?: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
}

export interface ReadinessSummary {
    state: DependencyReadinessState;
    summary: string;
    issues: string[];
    provider?: string;
    connector_id?: string;
    connector_label?: string;
    backend?: string;
    credential_id?: string;
    tenant_id?: string;
    workspace_id?: string;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface EnvironmentActivationSummary {
    generated_at: number;
    environment_kind: EnvironmentKind;
    environment_label: string;
    workspace_binding_kind: WorkspaceBindingKind;
    workspace_mode: WorkspaceMode;
    tenant_id?: string;
    workspace_id?: string;
    pilot_activation_status: PilotActivationStatus;
    simulator_backing: boolean;
    demo_mode_enabled: boolean;
    base_url?: string;
    base_url_source?: string;
    workspace_options: WorkspaceModeOptionSummary[];
    missing_dependency_codes: string[];
    missing_dependency_summaries: string[];
    environment_binding: PilotEnvironmentBindingSummary;
    actor_availability: ActorAvailabilitySummary[];
    identity_readiness: ReadinessSummary;
    connector_readiness: ReadinessSummary;
    vault_readiness: ReadinessSummary;
    connector_activation: PilotConnectorActivationSummary;
    activation_ready: boolean;
    activation_ready_summary: string;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface RequesterInboxItem {
    task_id: string;
    correlation_id?: string;
    goal: string;
    task_status: string;
    group: RequesterInboxGroup;
    summary: string;
    blocker_summary?: string;
    receipt_summary?: string;
    actor_role?: ActorRole;
    actor_label?: string;
    updated_at: number;
    workspace_binding_kind: WorkspaceBindingKind;
    environment_kind: EnvironmentKind;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface RequesterInboxSummary {
    generated_at: number;
    total_count: number;
    in_progress_count: number;
    blocked_count: number;
    waiting_count: number;
    completed_count: number;
    items: RequesterInboxItem[];
}

export interface TenantAdminActivationSummary {
    status: DependencyReadinessState;
    title: string;
    summary: string;
    detail_lines: string[];
    missing_dependency_codes: string[];
    actor_availability: ActorAvailabilitySummary[];
    identity_readiness: ReadinessSummary;
    connector_readiness: ReadinessSummary;
    vault_readiness: ReadinessSummary;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface PolicyStudioSummary {
    generated_at: number;
    pack_name: string;
    pack_version: string;
    pack_fingerprint: string;
    override_count: number;
    summary: string;
    rollout_summary: string;
    simulation_summary: string;
    approval_governance_summary: string;
    detail_lines: string[];
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface EnterpriseModuleAccessSummary {
    module: EnterpriseOAModule;
    access_state: 'FULL_ACCESS' | 'READ_ONLY' | 'REQUEST_ACCESS' | 'NOT_ASSIGNED';
    summary: string;
}

export interface EnterpriseRoleAssignmentSummary {
    principal_id: string;
    binding_id: string;
    role: string;
    tenant_id: string;
    workspace_id?: string;
    status: 'ACTIVE' | 'INACTIVE';
    source: 'OIDC_LOGIN' | 'SCIM_SYNC' | 'MANUAL_ADMIN';
}

export interface EnterpriseMemberSummary {
    principal_id: string;
    email: string;
    display_name?: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DEPROVISIONED';
    tenant_id: string;
    workspace_ids: string[];
    role_assignments: EnterpriseRoleAssignmentSummary[];
}

export interface EnterpriseMembershipInviteRecord {
    invite_id: string;
    tenant_id: string;
    workspace_id?: string;
    email: string;
    role: string;
    invite_token: string;
    invited_by_principal_id: string;
    invited_by_label: string;
    status: 'OPEN' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
    expires_at?: number;
    accepted_at?: number;
    accepted_principal_id?: string;
    created_at: number;
    updated_at: number;
}

export interface EnterpriseMembershipSummary {
    generated_at: number;
    tenant_id?: string;
    workspace_id?: string;
    member_count: number;
    invite_count: number;
    members: EnterpriseMemberSummary[];
    invites: EnterpriseMembershipInviteRecord[];
}

export interface EnterpriseOASessionSummary {
    session_id: string;
    principal_id: string;
    email: string;
    display_name?: string;
    tenant_id: string;
    workspace_id?: string;
    roles: string[];
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export interface EnterpriseAccountShellSummary {
    session?: EnterpriseOASessionSummary;
    active_bindings: EnterpriseRoleAssignmentSummary[];
    module_access: EnterpriseModuleAccessSummary[];
    role_badges: string[];
    available_roles: EnterpriseOARole[];
    pending_invites: EnterpriseMembershipInviteRecord[];
    diagnostics?: EnterpriseRuntimeDiagnosticsSummary;
    signed_in: boolean;
    summary: string;
}

export interface EnterpriseRuntimeDiagnosticsSummary {
    provider: string;
    tenant_id: string;
    workspace_id?: string;
    store_driver: 'memory' | 'postgres' | 'redis';
    production_mode: boolean;
    write_persistence_ready: boolean;
    session_expires_at: number;
    session_time_remaining_ms: number;
    binding_count: number;
    group_count: number;
    group_role_mapping_summary: string[];
}

export type EnterpriseCenterType = 'APPROVAL' | 'REVIEW' | 'AUDIT';

export interface EnterpriseCenterItem {
    item_id: string;
    center: EnterpriseCenterType;
    source:
        | 'TASK_APPROVAL_WAIT'
        | 'PILOT_ARTIFACT_REVIEW'
        | 'PILOT_ARTIFACT_PROMOTION'
        | 'COMPLIANCE_AUDIT_EXPORT'
        | 'MEMBERSHIP_INVITE'
        | 'MEMBERSHIP_PRINCIPAL'
        | 'PILOT_ACTIVATION_BLOCKER';
    status: 'PENDING' | 'READY_FOR_APPROVAL' | 'VERIFIED' | 'OPEN' | 'COMPLETED' | 'BLOCKED' | 'REJECTED' | 'EXPIRED' | 'INACTIVE';
    title: string;
    summary: string;
    detail_lines: string[];
    available_actions: string[];
    task_id?: string;
    node_id?: string;
    intake_id?: string;
    invite_id?: string;
    principal_id?: string;
    created_at: number;
    updated_at: number;
}

export interface EnterpriseCenterSummary {
    generated_at: number;
    center: EnterpriseCenterType;
    item_count: number;
    actionable_count: number;
    items: EnterpriseCenterItem[];
}

export interface EnterpriseInviteAcceptanceResult {
    invite: EnterpriseMembershipInviteRecord;
    principal: {
        principal_id: string;
        email: string;
        display_name?: string;
        status: string;
        tenant_id: string;
    };
    active_bindings: EnterpriseRoleAssignmentSummary[];
}

export type TrialWorkspaceStatus =
    | 'ACTIVE'
    | 'REHEARSAL_IN_PROGRESS'
    | 'READY_FOR_CONVERSION';
export type TrialParticipantState =
    | 'ACTIVE'
    | 'READY'
    | 'VIEWING';
export type TrialInviteStatus =
    | 'OPEN'
    | 'ACCEPTED'
    | 'REVOKED';
export type TrialSeatClaimStatus =
    | 'ASSIGNED_BASE'
    | 'CLAIMED'
    | 'UNASSIGNED';
export type TrialTaskLifecycle =
    | 'REQUESTED'
    | 'OPERATOR_REVIEW'
    | 'TENANT_ADMIN_REVIEW'
    | 'HANDOFF_BLOCKED';
export type TrialPersistenceState =
    | 'MEMORY_ONLY'
    | 'SERVER_BACKED';

export interface TrialWorkspaceRecord {
    trial_workspace_id: string;
    workspace_key: string;
    label: string;
    summary: string;
    status: TrialWorkspaceStatus;
    active_template_id: string;
    created_at: number;
    updated_at: number;
}

export interface TrialWorkspaceSeatRecord {
    seat_id: string;
    trial_workspace_id: string;
    role: EnterpriseOARole;
    actor_role?: ActorRole;
    label: string;
    summary: string;
    claim_status: TrialSeatClaimStatus;
    assigned_participant_id?: string;
    claimed_via_invite_id?: string;
    created_at: number;
    updated_at: number;
}

export interface TrialWorkspaceParticipantRecord {
    participant_id: string;
    trial_workspace_id: string;
    seat_id: string;
    actor_role?: ActorRole;
    oa_role: EnterpriseOARole;
    actor_label: string;
    summary: string;
    state: TrialParticipantState;
    invite_id?: string;
    created_at: number;
    updated_at: number;
}

export interface TrialWorkspaceInviteRecord {
    invite_id: string;
    trial_workspace_id: string;
    seat_id: string;
    actor_role?: ActorRole;
    oa_role: EnterpriseOARole;
    invite_code: string;
    label: string;
    status: TrialInviteStatus;
    accepted_participant_id?: string;
    created_at: number;
    accepted_at?: number;
    updated_at: number;
}

export interface TrialWorkspaceSessionRecord {
    session_id: string;
    trial_workspace_id: string;
    participant_id: string;
    actor_role?: ActorRole;
    oa_role: EnterpriseOARole;
    current_page: string;
    current_section: string;
    created_at: number;
    last_seen_at: number;
}

export interface TrialWorkspaceTaskRecord {
    task_id: string;
    trial_workspace_id: string;
    created_by_participant_id: string;
    scenario_id: string;
    scenario_title: string;
    scenario_summary: string;
    requester_brief: string;
    client_name: string;
    jurisdiction: string;
    priority: string;
    required_outcome: string;
    external_handoff_guard: string;
    missing_data_policy: string;
    missing_fields: string[];
    operator_review_required: boolean;
    compliance_review_requested: boolean;
    connector_requested: boolean;
    lifecycle: TrialTaskLifecycle;
    receipt_summary: string;
    created_at: number;
    updated_at: number;
}

export interface TrialWorkspaceActivityRecord {
    activity_id: string;
    trial_workspace_id: string;
    actor_role?: ActorRole;
    oa_role?: EnterpriseOARole;
    summary: string;
    task_id?: string;
    created_at: number;
}

export interface TrialWorkspaceTaskDetailSummary {
    task_id: string;
    title: string;
    lifecycle: TrialTaskLifecycle;
    receipt_summary: string;
    missing_fields: string[];
    handoff_lines: string[];
    approval_summary: string;
}

export interface TrialWorkspaceSummary {
    trial_workspace: TrialWorkspaceRecord;
    seats: TrialWorkspaceSeatRecord[];
    participants: TrialWorkspaceParticipantRecord[];
    invites: TrialWorkspaceInviteRecord[];
    sessions: TrialWorkspaceSessionRecord[];
    activities: TrialWorkspaceActivityRecord[];
    tasks: TrialWorkspaceTaskRecord[];
    active_task_detail?: TrialWorkspaceTaskDetailSummary;
    persistence_state: TrialPersistenceState;
    persistence_detail: string;
    deployment_blocker?: string;
    join_instructions: string[];
    conversion_guidance_lines: string[];
}

export interface ProductShellSummary {
    generated_at: number;
    environment_activation: EnvironmentActivationSummary;
    enterprise_account?: EnterpriseAccountShellSummary;
    enterprise_membership?: EnterpriseMembershipSummary;
    requester_inbox: RequesterInboxSummary;
    tenant_admin_setup: TenantAdminActivationSummary;
    policy_studio: PolicyStudioSummary;
    local_role_lab: LocalRoleLabSummary;
    demo: {
        enabled: boolean;
        label: string;
        summary: string;
        seeded_scenarios: string[];
        seeded_task_count: number;
        is_demo_data: boolean;
        is_pilot_evidence: boolean;
    };
    activation_package: {
        package_id: string;
        status: PilotActivationPackageStatus;
        owner_type: 'PILOT_COMMANDER' | 'REQUESTER_OWNER' | 'OPERATOR_OWNER' | 'TENANT_ADMIN_OWNER';
        owner_label: string;
        summary: string;
        handoff_note?: string;
        due_at?: number;
        pending_requirement_count: number;
        rejected_intake_count: number;
        recent_intakes: Array<{
            intake_id: string;
            artifact_kind: 'ENVIRONMENT_BINDING' | 'ACTOR_READINESS' | 'CONNECTOR_ELIGIBILITY' | 'REAL_EVIDENCE';
            source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
            summary: string;
            verification_status: 'RECEIVED' | 'EVIDENCE_REQUESTED' | 'HANDED_BACK' | 'VERIFIED' | 'REJECTED' | 'PROMOTED';
            rejection_reason?: string;
            verification_summary?: string;
            actor_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
            evidence_category?: string;
            connector_id?: string;
            environment_label?: string;
            promoted_record_ids: string[];
        }>;
    };
    activation_checklist: Array<{
        item_id: string;
        code: string;
        title: string;
        owner_label: string;
        state: DependencyReadinessState;
        requirement_status?: PilotActivationRequirementStatus;
        missing_artifact: string;
        next_action: string;
        linked_intake_ids?: string[];
    }>;
    remaining_blockers: Array<{
        code: string;
        owner_label: string;
        summary: string;
        missing_artifact: string;
        next_action: string;
    }>;
    evidence_categories: Array<{
        category: string;
        state: DependencyReadinessState;
        summary: string;
        real_evidence_count: number;
    }>;
    trial_workspace?: TrialWorkspaceSummary;
    oa_shell?: {
        active_role: EnterpriseOARole;
        active_module: EnterpriseOAModule;
    };
    next_action: string;
}

const ENTERPRISE_SESSION_STORAGE_KEY = 'lumi_enterprise_session_id';

export function getEnterpriseSessionId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const paramValue = params.get('enterprise_session_id') || params.get('session_id');
    if (paramValue?.trim()) return paramValue.trim();
    const stored = window.localStorage.getItem(ENTERPRISE_SESSION_STORAGE_KEY);
    return stored?.trim() || undefined;
}

export function setEnterpriseSessionId(sessionId: string | null | undefined): void {
    if (typeof window === 'undefined') return;
    if (sessionId?.trim()) {
        window.localStorage.setItem(ENTERPRISE_SESSION_STORAGE_KEY, sessionId.trim());
        return;
    }
    window.localStorage.removeItem(ENTERPRISE_SESSION_STORAGE_KEY);
}

function buildApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const sessionId = getEnterpriseSessionId();
    if (sessionId) {
        headers.Authorization = `Bearer ${sessionId}`;
    }
    return headers;
}

async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(buildApiUrl(path), {
        method: 'GET',
        headers: buildApiHeaders(),
    });
    return readJsonResponse<T>(response);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => undefined) as T & { error?: string } | undefined;
    if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    if (payload === undefined || payload === null || typeof payload !== 'object') {
        throw new Error('invalid_api_payload');
    }
    return payload as T;
}

function workspaceQuery(workspaceMode: WorkspaceMode, labActorId?: string): string {
    const params = new URLSearchParams({
        workspace_mode: workspaceMode,
    });
    if (labActorId) params.set('lab_actor_id', labActorId);
    return params.toString();
}

export async function getProductShellSummary(workspaceMode: WorkspaceMode, labActorId?: string): Promise<ProductShellSummary> {
    const payload = await getJson<{ success: boolean; summary: ProductShellSummary }>(
        `/api/agent-kernel/product-shell/summary?${workspaceQuery(workspaceMode, labActorId)}`
    );
    return payload.summary;
}

export async function getTrialWorkspaceSummary(workspaceMode: WorkspaceMode, labActorId?: string) {
    const payload = await getJson<{ success: boolean; summary: TrialWorkspaceSummary }>(
        `/api/agent-kernel/trial-workspace/summary?${workspaceQuery(workspaceMode, labActorId)}`
    );
    return payload.summary;
}

export async function registerTrialWorkspaceSession(input: {
    workspaceMode: WorkspaceMode;
    labActorId?: string;
    oaRole?: EnterpriseOARole;
    page: string;
    section: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/trial-workspace/session'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<{ success: boolean; session: TrialWorkspaceSessionRecord; summary: TrialWorkspaceSummary }>;
}

export async function createTrialWorkspaceTask(input: {
    workspaceMode: WorkspaceMode;
    labActorId?: string;
    templateId: string;
    requesterBrief: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/trial-workspace/task'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<{ success: boolean; task: TrialWorkspaceTaskRecord; summary: TrialWorkspaceSummary }>;
}

export async function createTrialWorkspaceInvite(input: {
    workspaceMode: WorkspaceMode;
    role: EnterpriseOARole;
    label?: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/trial-workspace/invite'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse<{ success: boolean; invite: TrialWorkspaceInviteRecord; summary: TrialWorkspaceSummary }>(response);
}

export async function acceptTrialWorkspaceInvite(input: {
    workspaceMode: WorkspaceMode;
    inviteCode: string;
    actorLabel?: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/trial-workspace/invite/accept'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse<{ success: boolean; participant: TrialWorkspaceParticipantRecord; summary: TrialWorkspaceSummary }>(response);
}

export async function releaseTrialWorkspaceSeat(input: {
    workspaceMode: WorkspaceMode;
    seatId: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/trial-workspace/seat/release'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse<{ success: boolean; seat: TrialWorkspaceSeatRecord; summary: TrialWorkspaceSummary }>(response);
}

export async function getEnterpriseAccountSummary() {
    const payload = await getJson<{ success: boolean; summary: EnterpriseAccountShellSummary }>('/api/agent-kernel/enterprise/account');
    return payload.summary;
}

export async function getEnterpriseMembershipSummary(workspaceId?: string) {
    const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
    const payload = await getJson<{ success: boolean; summary: EnterpriseMembershipSummary }>(`/api/agent-kernel/enterprise/members${query}`);
    return payload.summary;
}

export async function assignEnterpriseRole(input: { principal_id: string; role: string; workspace_id?: string }) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/members/assign-role'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse(response);
}

export async function removeEnterpriseRole(input: { principal_id: string; role: string; workspace_id?: string }) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/members/remove-role'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse(response);
}

export async function inviteEnterpriseMember(input: { email: string; role: string; workspace_id?: string }) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/members/invite'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse(response);
}

export async function deactivateEnterpriseMember(input: { principal_id: string }) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/members/deactivate'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse(response);
}

export async function reactivateEnterpriseMember(input: { principal_id: string }) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/members/reactivate'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify(input),
    });
    return readJsonResponse(response);
}

export async function listEnterpriseInvites(workspaceId?: string) {
    const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
    const payload = await getJson<{ success: boolean; invites: EnterpriseMembershipInviteRecord[] }>(`/api/agent-kernel/enterprise/invites${query}`);
    return payload.invites;
}

export async function acceptEnterpriseInvite(inviteToken: string) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/invites/accept'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify({ invite_token: inviteToken }),
    });
    return readJsonResponse<{ success: boolean; result: EnterpriseInviteAcceptanceResult }>(response);
}

export async function revokeEnterpriseInvite(inviteId: string) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/enterprise/invites/revoke'), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify({ invite_id: inviteId }),
    });
    return readJsonResponse<{ success: boolean; invite: EnterpriseMembershipInviteRecord }>(response);
}

export async function getEnterpriseCenterSummary(center: EnterpriseCenterType) {
    const payload = await getJson<{ success: boolean; summary: EnterpriseCenterSummary }>(
        `/api/agent-kernel/enterprise/centers?center=${encodeURIComponent(center)}`
    );
    return payload.summary;
}

export async function decideEnterpriseCenterItem(input: {
    item_id: string;
    decision: string;
    note?: string;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/enterprise/centers/${encodeURIComponent(input.item_id)}/decision`), {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify({
            decision: input.decision,
            note: input.note,
        }),
    });
    return readJsonResponse(response);
}

export async function startEnterpriseOidcAuthorization(input: {
    redirect_uri: string;
    workspace_id?: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/identity/oidc/authorize'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    return readJsonResponse<{
        success: boolean;
        provider: string;
        tenant_id: string;
        workspace_id?: string;
        authorize_url: string;
        state: string;
        expires_at: number;
    }>(response);
}

export async function exchangeEnterpriseOidcCode(input: {
    state: string;
    code: string;
    redirect_uri: string;
}) {
    const response = await fetch(buildApiUrl('/api/agent-kernel/identity/oidc/exchange'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    const payload = await readJsonResponse<{
        success: boolean;
        session: EnterpriseOASessionSummary;
        principal: EnterpriseMemberSummary;
        active_bindings: EnterpriseRoleAssignmentSummary[];
    }>(response);
    setEnterpriseSessionId(payload.session.session_id);
    return payload;
}

export async function getEnvironmentSummary(workspaceMode: WorkspaceMode, labActorId?: string): Promise<EnvironmentActivationSummary> {
    const payload = await getJson<{ success: boolean; summary: EnvironmentActivationSummary }>(
        `/api/agent-kernel/environment/summary?${workspaceQuery(workspaceMode, labActorId)}`
    );
    return payload.summary;
}

export async function getPolicyStudioSummary(workspaceMode: WorkspaceMode, labActorId?: string): Promise<PolicyStudioSummary> {
    const payload = await getJson<{ success: boolean; summary: PolicyStudioSummary }>(
        `/api/agent-kernel/policy-studio/summary?${workspaceQuery(workspaceMode, labActorId)}`
    );
    return payload.summary;
}

export async function listRequesterInboxItems(workspaceMode: WorkspaceMode, labActorId?: string): Promise<RequesterInboxSummary> {
    const payload = await getJson<{
        success: boolean;
        generated_at: number;
        total_count: number;
        in_progress_count: number;
        blocked_count: number;
        waiting_count: number;
        completed_count: number;
        items: RequesterInboxItem[];
    }>(`/api/agent-kernel/tasks?${workspaceQuery(workspaceMode, labActorId)}`);
    return {
        generated_at: payload.generated_at,
        total_count: payload.total_count,
        in_progress_count: payload.in_progress_count,
        blocked_count: payload.blocked_count,
        waiting_count: payload.waiting_count,
        completed_count: payload.completed_count,
        items: payload.items,
    };
}

export async function getAgentKernelTask(taskId: string) {
    return getJson(`/api/agent-kernel/tasks/${encodeURIComponent(taskId)}`);
}

export async function runAgentKernelTask(taskId: string) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/tasks/${encodeURIComponent(taskId)}/run`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function approveAgentKernelTask(taskId: string, nodeId: string, decision: string) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/tasks/${encodeURIComponent(taskId)}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            node_id: nodeId,
            decision,
        }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function cancelAgentKernelTask(taskId: string) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/tasks/${encodeURIComponent(taskId)}/cancel`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function registerPilotActorReadiness(input: {
    workspaceMode: WorkspaceMode;
    role: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    actor_id?: string;
    actor_label?: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    provisioningState?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    accessState?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    note?: string;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/actor-readiness?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function registerPilotEvidenceArtifact(input: {
    workspaceMode: WorkspaceMode;
    category: 'DEVICE_SESSION_PROOF' | 'WORKFLOW_ARTIFACT_PROOF' | 'CONNECTOR_CREDENTIAL_PROOF' | 'TENANT_ADMIN_SUPPORT_PROOF' | 'STABILITY_SAFETY_PROOF';
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary: string;
    uri?: string;
    actor_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/evidence?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function registerPilotEnvironmentBinding(input: {
    workspaceMode: WorkspaceMode;
    environment_kind: EnvironmentKind;
    environment_label: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary?: string;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/environment-binding?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function registerPilotConnectorEligibility(input: {
    workspaceMode: WorkspaceMode;
    connector_id: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary?: string;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/connector-eligibility?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function registerPilotActivationPackageHandoff(input: {
    workspaceMode: WorkspaceMode;
    owner_type: 'PILOT_COMMANDER' | 'REQUESTER_OWNER' | 'OPERATOR_OWNER' | 'TENANT_ADMIN_OWNER';
    owner_label?: string;
    summary?: string;
    handoff_note?: string;
    due_at?: number;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/package-handoff?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function submitPilotExternalArtifactIntake(input: {
    workspaceMode: WorkspaceMode;
    artifact_kind: 'ENVIRONMENT_BINDING' | 'ACTOR_READINESS' | 'CONNECTOR_ELIGIBILITY' | 'REAL_EVIDENCE';
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary: string;
    uri?: string;
    submitted_by_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    submitted_by_label?: string;
    actor_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    actor_id?: string;
    actor_label?: string;
    provisioning_state?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    access_state?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    evidence_category?: 'DEVICE_SESSION_PROOF' | 'WORKFLOW_ARTIFACT_PROOF' | 'CONNECTOR_CREDENTIAL_PROOF' | 'TENANT_ADMIN_SUPPORT_PROOF' | 'STABILITY_SAFETY_PROOF';
    environment_kind?: EnvironmentKind;
    environment_label?: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    connector_id?: string;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/artifact-intake?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function reviewPilotExternalArtifactIntake(input: {
    workspaceMode: WorkspaceMode;
    intake_id: string;
    decision: 'VERIFY' | 'REJECT' | 'PROMOTE';
    reviewed_by?: string;
    verification_note?: string;
}) {
    const response = await fetch(buildApiUrl(`/api/agent-kernel/activation/artifact-review?${workspaceQuery(input.workspaceMode)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

import type { PolicyContext, PolicyDecision } from '../policy-engine/types.js';

export type NodeType = 'tool' | 'llm' | 'approval' | 'ask_user' | 'verify' | 'merge';

export type NodeStatus =
    | 'PENDING'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'SKIPPED'
    | 'WAITING_USER'
    | 'CANCELLED';

export type TaskStatus = 'RUNNING' | 'WAITING_USER' | 'DONE' | 'FAILED' | 'CANCELLED';

export type NodeErrorCode =
    | 'TASK_TIMEOUT'
    | 'BUDGET_EXCEEDED'
    | 'TOOL_TIMEOUT'
    | 'TOOL_UNAVAILABLE'
    | 'TOOL_ERROR'
    | 'POLICY_DENY'
    | 'POST_POLICY_DENY'
    | 'VERIFICATION_FAILED'
    | 'INVALID_OUTPUT'
    | 'DEPENDENCY_NOT_READY'
    | 'NEEDS_USER_INPUT'
    | 'INTERNAL_ERROR';

export interface RetryPolicy {
    max_retries: number;
    backoff_ms: number;
    jitter: boolean;
    dead_letter_after_max_retries?: boolean;
}

export type RetryJobStatus =
    | 'SCHEDULED'
    | 'REQUEUED'
    | 'COMPLETED'
    | 'CANCELLED';

export type DeadLetterStatus =
    | 'OPEN'
    | 'REPLAY_REQUESTED'
    | 'RESOLVED';

export interface RetryJobRecord {
    job_id: string;
    dedupe_key: string;
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    status: RetryJobStatus;
    attempt: number;
    max_retries: number;
    scheduled_at: number;
    available_at: number;
    last_error_code?: NodeErrorCode | string;
    last_error_message?: string;
    idempotency_key?: string;
    created_at: number;
    updated_at: number;
}

export interface DeadLetterRecord {
    dead_letter_id: string;
    dedupe_key: string;
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    status: DeadLetterStatus;
    attempt: number;
    max_retries: number;
    error_code?: NodeErrorCode | string;
    error_message?: string;
    idempotency_key?: string;
    retry_job_id?: string;
    created_at: number;
    updated_at: number;
}

export type WorkerType = 'LOCAL_RUNTIME' | 'REMOTE_RUNNER';
export type RunnerType = 'LOCAL_FALLBACK' | 'REMOTE_CONTROL_PLANE';
export type TaskExecutionMode =
    | 'LOCAL_FIRST'
    | 'REMOTE_PREFERRED'
    | 'LOCAL_FALLBACK';
export type WorkerSessionStatus =
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CLOSED';
export type TaskExecutionUnitStatus =
    | 'RUNNABLE'
    | 'CLAIMED'
    | 'COMPLETED'
    | 'TIMED_OUT'
    | 'CANCELLED';
export type TaskLeaseStatus =
    | 'ACTIVE'
    | 'RELEASED'
    | 'EXPIRED'
    | 'COMPLETED';
export type TaskClaimReleaseReason =
    | 'EXECUTION_COMPLETED'
    | 'EXECUTION_FAILED'
    | 'AWAITING_USER'
    | 'RETRY_SCHEDULED'
    | 'DEAD_LETTERED'
    | 'TASK_CANCELLED'
    | 'LEASE_EXPIRED';
export type RemoteRunnerControlStatus =
    | 'ACCEPTED'
    | 'LOCAL_FALLBACK'
    | 'UNAVAILABLE'
    | 'REJECTED'
    | 'NOOP';
export type ServicePrincipalType =
    | 'RUNTIME_SERVICE'
    | 'WORKER_SERVICE'
    | 'CONTROL_PLANE_SERVICE';
export type ServiceAuthMode =
    | 'STANDARD'
    | 'BREAK_GLASS';
export type ServiceAuthAction =
    | 'CLAIM_EXECUTION'
    | 'HEARTBEAT_EXECUTION'
    | 'RELEASE_EXECUTION'
    | 'RECOVER_STALE_CLAIMS'
    | 'REQUEST_REMOTE_RUNNER';
export type ServiceAuthDecisionOutcome = 'ALLOWED' | 'DENIED';

export interface ServicePrincipalIdentity {
    principal_id: string;
    principal_type: ServicePrincipalType;
    display_name?: string;
    allowed_actions: ServiceAuthAction[];
    bound_worker_id?: string;
    bound_pool_id?: string;
    issued_by?: string;
}

export interface ServiceAuthContext {
    auth_context_id: string;
    auth_mode: ServiceAuthMode;
    issued_at: number;
    expires_at: number;
    principal: ServicePrincipalIdentity;
    justification?: string;
    break_glass_approved_by?: string;
    break_glass_expires_at?: number;
}

export interface ServiceActionAuthorizationInput {
    action: ServiceAuthAction;
    task_id: string;
    node_id?: string;
    claim_id?: string;
    execution_unit_id?: string;
    session_id?: string;
    worker_id?: string;
    worker_pool_id?: string;
    correlation_id?: string;
    run_id?: string;
    service_auth_context?: ServiceAuthContext;
}

export interface ServiceAuthDecision {
    decision_id: string;
    action: ServiceAuthAction;
    outcome: ServiceAuthDecisionOutcome;
    decided_at: number;
    reason?: string;
    auth_mode?: ServiceAuthMode;
    principal?: ServicePrincipalIdentity;
    break_glass_used?: boolean;
}

export interface ServiceAuthAuditRecord {
    task_id: string;
    node_id?: string;
    claim_id?: string;
    execution_unit_id?: string;
    session_id?: string;
    worker_id?: string;
    correlation_id?: string;
    run_id?: string;
    decision: ServiceAuthDecision;
    service_auth_context?: ServiceAuthContext;
}

export interface ServiceActionAuthorizerPort {
    authorize(input: ServiceActionAuthorizationInput): Promise<ServiceAuthDecision>;
}

export interface ServiceAuthAuditRecorderPort {
    recordServiceAuthDecision(record: ServiceAuthAuditRecord): Promise<void>;
}

export interface WorkerIdentity {
    worker_id: string;
    worker_type: WorkerType;
    runner_type: RunnerType;
    execution_mode: TaskExecutionMode;
    local_first: boolean;
    service_principal: ServicePrincipalIdentity;
    service_auth_context_id: string;
    service_auth_mode: ServiceAuthMode;
    service_auth_expires_at: number;
}

export interface WorkerPoolRecord {
    pool_id: string;
    pool_name: string;
    runner_type: RunnerType;
    execution_mode: TaskExecutionMode;
    local_first: boolean;
    enabled: boolean;
    max_concurrency: number;
    created_at: number;
    updated_at: number;
}

export interface WorkerSessionRecord {
    session_id: string;
    task_id: string;
    worker_id: string;
    correlation_id?: string;
    run_id?: string;
    worker_type: WorkerType;
    runner_type: RunnerType;
    execution_mode: TaskExecutionMode;
    status: WorkerSessionStatus;
    claimed_at?: number;
    released_at?: number;
    lease_expires_at?: number;
    last_heartbeat_at?: number;
    service_auth_context?: ServiceAuthContext;
    last_service_auth_action?: ServiceAuthAction;
    last_service_auth_decision_id?: string;
    last_service_auth_outcome?: ServiceAuthDecisionOutcome;
    created_at: number;
    updated_at: number;
}

export interface TaskExecutionUnit {
    execution_unit_id: string;
    dedupe_key: string;
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    target_attempt: number;
    status: TaskExecutionUnitStatus;
    desired_execution_mode: TaskExecutionMode;
    runner_type: RunnerType;
    available_at: number;
    claim_id?: string;
    claimed_by_worker_id?: string;
    claimed_by_session_id?: string;
    claimed_at?: number;
    lease_expires_at?: number;
    last_heartbeat_at?: number;
    release_reason?: TaskClaimReleaseReason;
    remote_result_status?: RemoteRunnerControlStatus;
    created_at: number;
    updated_at: number;
}

export interface TaskClaimRecord {
    claim_id: string;
    execution_unit_id: string;
    task_id: string;
    node_id: string;
    worker_id: string;
    correlation_id?: string;
    run_id?: string;
    worker_type: WorkerType;
    session_id: string;
    status: TaskLeaseStatus;
    execution_mode: TaskExecutionMode;
    runner_type: RunnerType;
    claimed_at: number;
    lease_expires_at: number;
    last_heartbeat_at: number;
    released_at?: number;
    release_reason?: TaskClaimReleaseReason;
    remote_request_id?: string;
    remote_result_status?: RemoteRunnerControlStatus;
    remote_result_detail?: string;
    service_auth_context?: ServiceAuthContext;
    last_service_auth_action?: ServiceAuthAction;
    last_service_auth_decision_id?: string;
    last_service_auth_outcome?: ServiceAuthDecisionOutcome;
    created_at: number;
    updated_at: number;
}

export interface TaskHeartbeatRecord {
    claim_id: string;
    execution_unit_id: string;
    task_id: string;
    node_id: string;
    worker_id: string;
    correlation_id?: string;
    run_id?: string;
    heartbeat_at: number;
    lease_expires_at: number;
    status: TaskLeaseStatus;
    service_auth_context?: ServiceAuthContext;
    service_auth_decision_id?: string;
}

export interface TaskExecutionTimeoutRecord {
    timeout_id: string;
    claim_id: string;
    execution_unit_id: string;
    task_id: string;
    node_id: string;
    worker_id?: string;
    correlation_id?: string;
    run_id?: string;
    timed_out_at: number;
    lease_expires_at: number;
    requeued: boolean;
    service_auth_context?: ServiceAuthContext;
    service_auth_decision_id?: string;
    created_at: number;
}

export interface RemoteRunnerControlRequest {
    request_id: string;
    execution_unit_id: string;
    task_id: string;
    node_id: string;
    worker_id: string;
    correlation_id?: string;
    run_id?: string;
    desired_execution_mode: TaskExecutionMode;
    runner_type: RunnerType;
    requested_at: number;
    reason: string;
    service_auth_context?: ServiceAuthContext;
    service_auth_decision_id?: string;
}

export interface RemoteRunnerControlResult {
    request_id: string;
    execution_unit_id: string;
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    status: RemoteRunnerControlStatus;
    execution_mode: TaskExecutionMode;
    runner_type: RunnerType;
    detail?: string;
    service_auth_decision_id?: string;
    handled_at: number;
}

export interface ExecutionWorkerSummary {
    worker_pool: WorkerPoolRecord;
    worker_identity: WorkerIdentity;
    runnable_execution_units: TaskExecutionUnit[];
    active_claims: TaskClaimRecord[];
    claim_history: TaskClaimRecord[];
    worker_sessions: WorkerSessionRecord[];
    runnable_count: number;
    claimed_count: number;
    stale_claim_count: number;
    local_fallback_count: number;
    completed_claim_count: number;
    released_claim_count: number;
    expired_claim_count: number;
    last_claimed_at?: number;
    last_heartbeat_at?: number;
    last_released_at?: number;
    last_timed_out_at?: number;
    last_claim_id?: string;
    last_execution_unit_id?: string;
    last_session_id?: string;
    last_worker_id?: string;
    last_correlation_id?: string;
    last_run_id?: string;
    last_execution_mode?: TaskExecutionMode;
    last_claim_status?: TaskLeaseStatus;
    last_lease_expires_at?: number;
    last_release_reason?: TaskClaimReleaseReason;
    last_service_auth_action?: ServiceAuthAction;
    last_service_auth_decision_id?: string;
    last_service_auth_outcome?: ServiceAuthDecisionOutcome;
    last_service_principal_id?: string;
    last_service_auth_mode?: ServiceAuthMode;
    last_runner_control_result?: RemoteRunnerControlResult;
}

export interface TaskExecutionSubstrateSummary {
    pending_retry_jobs: RetryJobRecord[];
    dead_letters: DeadLetterRecord[];
    dead_letter_count: number;
    last_retry_scheduled_at?: number;
    last_dead_letter_at?: number;
    worker_summary?: ExecutionWorkerSummary;
}

export type EnterpriseIdentityProviderType = 'OKTA_OIDC';
export type EnterprisePrincipalStatus =
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'DEPROVISIONED';
export type EnterpriseSessionStatus =
    | 'ACTIVE'
    | 'REVOKED'
    | 'EXPIRED';
export type EnterpriseAccessBindingStatus =
    | 'ACTIVE'
    | 'INACTIVE';
export type EnterpriseInviteStatus =
    | 'OPEN'
    | 'ACCEPTED'
    | 'REVOKED'
    | 'EXPIRED';
export type EnterpriseRole =
    | 'TENANT_ADMIN'
    | 'WORKSPACE_ADMIN'
    | 'WORKSPACE_MEMBER'
    | 'REQUESTER'
    | 'APPROVER'
    | 'OPERATOR'
    | 'REVIEWER'
    | 'POLICY_GOVERNANCE_ADMIN'
    | 'INTEGRATION_ADMIN'
    | 'AUDITOR';
export type OidcLoginStateStatus =
    | 'PENDING'
    | 'CONSUMED'
    | 'EXPIRED';
export type DirectoryProvisioningSource =
    | 'OIDC_LOGIN'
    | 'SCIM_SYNC'
    | 'MANUAL_ADMIN';

export interface EnterpriseModuleAccessSummary {
    module: EnterpriseOAModule;
    access_state: 'FULL_ACCESS' | 'READ_ONLY' | 'REQUEST_ACCESS' | 'NOT_ASSIGNED';
    summary: string;
}

export interface EnterpriseRoleAssignmentSummary {
    principal_id: string;
    binding_id: string;
    role: EnterpriseRole;
    tenant_id: string;
    workspace_id?: string;
    status: EnterpriseAccessBindingStatus;
    source: DirectoryProvisioningSource;
}

export interface EnterpriseMemberSummary {
    principal_id: string;
    email: string;
    display_name?: string;
    status: EnterprisePrincipalStatus;
    tenant_id: string;
    workspace_ids: string[];
    role_assignments: EnterpriseRoleAssignmentSummary[];
}

export interface EnterpriseMembershipInviteRecord {
    invite_id: string;
    tenant_id: string;
    workspace_id?: string;
    email: string;
    role: EnterpriseRole;
    invite_token: string;
    invited_by_principal_id: string;
    invited_by_label: string;
    status: EnterpriseInviteStatus;
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
    roles: EnterpriseRole[];
    status: EnterpriseSessionStatus;
}

export interface EnterpriseAccountShellSummary {
    session?: EnterpriseOASessionSummary;
    active_bindings: EnterpriseRoleAssignmentSummary[];
    module_access: EnterpriseModuleAccessSummary[];
    role_badges: EnterpriseRole[];
    available_roles: EnterpriseRole[];
    pending_invites: EnterpriseMembershipInviteRecord[];
    diagnostics?: EnterpriseRuntimeDiagnosticsSummary;
    signed_in: boolean;
    summary: string;
}

export interface EnterpriseRuntimeDiagnosticsSummary {
    provider: EnterpriseIdentityProviderType;
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

export type EnterpriseCenterType =
    | 'APPROVAL'
    | 'REVIEW'
    | 'AUDIT';

export type EnterpriseCenterItemSource =
    | 'TASK_APPROVAL_WAIT'
    | 'PILOT_ARTIFACT_REVIEW'
    | 'PILOT_ARTIFACT_PROMOTION'
    | 'COMPLIANCE_AUDIT_EXPORT'
    | 'MEMBERSHIP_INVITE'
    | 'MEMBERSHIP_PRINCIPAL'
    | 'PILOT_ACTIVATION_BLOCKER';

export type EnterpriseCenterItemStatus =
    | 'PENDING'
    | 'READY_FOR_APPROVAL'
    | 'VERIFIED'
    | 'OPEN'
    | 'COMPLETED'
    | 'BLOCKED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'INACTIVE';

export type EnterpriseAction =
    | 'ENTERPRISE_ACCOUNT_VIEW'
    | 'ENTERPRISE_MEMBER_INVITE'
    | 'ENTERPRISE_MEMBER_ASSIGN_ROLE'
    | 'ENTERPRISE_MEMBER_REMOVE_ROLE'
    | 'ENTERPRISE_MEMBER_SUSPEND'
    | 'ENTERPRISE_MEMBER_REACTIVATE'
    | 'ENTERPRISE_INVITE_VIEW'
    | 'ENTERPRISE_INVITE_ACCEPT'
    | 'ENTERPRISE_INVITE_REVOKE'
    | 'ENTERPRISE_CENTER_APPROVAL_VIEW'
    | 'ENTERPRISE_CENTER_REVIEW_VIEW'
    | 'ENTERPRISE_CENTER_AUDIT_VIEW'
    | 'ENTERPRISE_CENTER_APPROVAL_DECIDE'
    | 'ENTERPRISE_CENTER_REVIEW_DECIDE'
    | 'ENTERPRISE_CENTER_AUDIT_EXPORT'
    | 'PILOT_ENVIRONMENT_BINDING_WRITE'
    | 'PILOT_ACTOR_READINESS_WRITE'
    | 'PILOT_EVIDENCE_WRITE'
    | 'PILOT_PACKAGE_HANDOFF_WRITE'
    | 'PILOT_ARTIFACT_INTAKE_WRITE'
    | 'PILOT_ARTIFACT_VERIFY'
    | 'PILOT_ARTIFACT_PROMOTE';

export interface EnterpriseCenterItem {
    item_id: string;
    center: EnterpriseCenterType;
    source: EnterpriseCenterItemSource;
    status: EnterpriseCenterItemStatus;
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
    principal: EnterprisePrincipalRecord;
    active_bindings: EnterpriseAccessBindingRecord[];
}

export interface PilotIdentityGroupRoleMapping {
    group_name: string;
    tenant_id: string;
    workspace_id?: string;
    roles: EnterpriseRole[];
}

export interface PilotIdentityProviderConfig {
    provider: EnterpriseIdentityProviderType;
    tenant_id: string;
    issuer: string;
    client_id: string;
    client_secret: string;
    default_workspace_id?: string;
    scopes: string[];
    groups_claim?: string;
    email_claim?: string;
    name_claim?: string;
    subject_claim?: string;
    default_roles?: EnterpriseRole[];
    group_role_mappings: PilotIdentityGroupRoleMapping[];
}

export interface OidcLoginStateRecord {
    state_id: string;
    provider: EnterpriseIdentityProviderType;
    tenant_id: string;
    workspace_id?: string;
    redirect_uri: string;
    nonce: string;
    status: OidcLoginStateStatus;
    expires_at: number;
    consumed_at?: number;
    created_at: number;
    updated_at: number;
}

export interface EnterprisePrincipalRecord {
    principal_id: string;
    provider: EnterpriseIdentityProviderType;
    tenant_id: string;
    external_subject: string;
    email: string;
    display_name?: string;
    groups: string[];
    status: EnterprisePrincipalStatus;
    last_login_at?: number;
    last_directory_sync_at?: number;
    created_at: number;
    updated_at: number;
}

export interface EnterpriseAccessBindingRecord {
    binding_id: string;
    principal_id: string;
    tenant_id: string;
    workspace_id?: string;
    roles: EnterpriseRole[];
    source: DirectoryProvisioningSource;
    source_group?: string;
    status: EnterpriseAccessBindingStatus;
    provisioned_at: number;
    deprovisioned_at?: number;
    created_at: number;
    updated_at: number;
}

export interface EnterpriseSessionClaimsSummary {
    issuer: string;
    subject: string;
    audience: string | string[];
    email?: string;
    display_name?: string;
    groups: string[];
    nonce?: string;
}

export interface EnterpriseIdentitySessionRecord {
    session_id: string;
    principal_id: string;
    provider: EnterpriseIdentityProviderType;
    tenant_id: string;
    workspace_id?: string;
    roles: EnterpriseRole[];
    status: EnterpriseSessionStatus;
    claims: EnterpriseSessionClaimsSummary;
    idp_session_id?: string;
    issued_at: number;
    expires_at: number;
    last_seen_at: number;
    revoked_at?: number;
    revocation_reason?: string;
    created_at: number;
    updated_at: number;
}

export interface OidcAuthorizationStartResult {
    provider: EnterpriseIdentityProviderType;
    tenant_id: string;
    workspace_id?: string;
    authorize_url: string;
    state: string;
    nonce: string;
    expires_at: number;
}

export interface VerifiedOidcIdentity {
    provider: EnterpriseIdentityProviderType;
    tenant_id: string;
    issuer: string;
    subject: string;
    audience: string | string[];
    email: string;
    display_name?: string;
    groups: string[];
    idp_session_id?: string;
    issued_at: number;
    expires_at: number;
    claims: Record<string, unknown>;
}

export interface OidcCodeExchangeInput {
    config: PilotIdentityProviderConfig;
    code: string;
    redirect_uri: string;
    nonce: string;
}

export interface OidcCodeExchangePort {
    exchangeAuthorizationCode(input: OidcCodeExchangeInput): Promise<VerifiedOidcIdentity>;
}

export type VaultBackendType = 'HASHICORP_VAULT';
export type PilotConnectorType = 'HTTPS_WEBHOOK';
export type ConnectorAdapterType =
    | 'GENERIC_HTTPS_WEBHOOK'
    | 'ADVISOR_CRM_COMPLIANCE_HANDOFF';
export type VaultCredentialStatus =
    | 'ACTIVE'
    | 'EXPIRING'
    | 'EXPIRED'
    | 'REVOKED'
    | 'COMPROMISED'
    | 'UNHEALTHY';
export type VaultCredentialCompromiseStatus =
    | 'CLEAR'
    | 'SUSPECTED'
    | 'CONFIRMED';
export type WebhookDeliveryStatus =
    | 'DELIVERED'
    | 'BLOCKED_CREDENTIAL'
    | 'TIMED_OUT'
    | 'RATE_LIMITED'
    | 'DEAD_LETTERED'
    | 'FAILED';
export type ConnectorPlatformHealthStatus =
    | 'HEALTHY'
    | 'DEGRADED'
    | 'UNHEALTHY';

export interface PilotVaultWebhookConfig {
    backend: VaultBackendType;
    tenant_id: string;
    workspace_id?: string;
    connector_type: PilotConnectorType;
    connector_id: string;
    endpoint_url: string;
    auth_header_name: string;
    auth_header_prefix?: string;
    static_headers?: Record<string, string>;
    timeout_ms: number;
    credential_id: string;
    vault_addr: string;
    vault_token: string;
    vault_namespace?: string;
    read_path: string;
    rotate_path?: string;
    secret_value_field: string;
    renew_increment_seconds?: number;
}

export interface VaultResolvedCredential {
    credential_id: string;
    secret_value: string;
    lease_id?: string;
    renewable: boolean;
    lease_duration_seconds?: number;
    expires_at?: number;
    version?: string;
    metadata?: Record<string, unknown>;
}

export interface VaultCredentialRecord {
    credential_id: string;
    backend: VaultBackendType;
    tenant_id: string;
    workspace_id?: string;
    connector_type: PilotConnectorType;
    connector_id: string;
    vault_path: string;
    status: VaultCredentialStatus;
    compromise_status: VaultCredentialCompromiseStatus;
    lease_id?: string;
    renewable: boolean;
    lease_duration_seconds?: number;
    lease_expires_at?: number;
    last_materialized_at?: number;
    last_renewed_at?: number;
    rotated_at?: number;
    revoked_at?: number;
    last_failure_at?: number;
    last_failure_reason?: string;
    last_delivery_status?: WebhookDeliveryStatus;
    last_delivery_at?: number;
    version?: string;
    created_at: number;
    updated_at: number;
}

export interface WebhookDeliveryRecord {
    delivery_id: string;
    connector_id: string;
    credential_id: string;
    tenant_id: string;
    workspace_id?: string;
    task_id?: string;
    correlation_id?: string;
    run_id?: string;
    status: WebhookDeliveryStatus;
    adapter_id?: string;
    adapter_type?: ConnectorAdapterType;
    delivery_group_id?: string;
    attempt?: number;
    credential_status: VaultCredentialStatus;
    compromise_status: VaultCredentialCompromiseStatus;
    blocked_reason?: string;
    dead_letter_reason?: string;
    request_id?: string;
    http_status?: number;
    response_excerpt?: string;
    payload_summary?: string;
    created_at: number;
    updated_at: number;
}

export interface HashiCorpVaultPort {
    readCredential(config: PilotVaultWebhookConfig): Promise<VaultResolvedCredential>;
    renewLease(
        config: PilotVaultWebhookConfig,
        leaseId: string,
        incrementSeconds?: number
    ): Promise<Pick<VaultResolvedCredential, 'lease_id' | 'renewable' | 'lease_duration_seconds' | 'expires_at' | 'version'>>;
    revokeLease(config: PilotVaultWebhookConfig, leaseId: string): Promise<void>;
    rotateCredential(config: PilotVaultWebhookConfig): Promise<VaultResolvedCredential>;
}

export interface WebhookDeliveryRequest {
    config: PilotVaultWebhookConfig;
    payload: unknown;
    credential: VaultResolvedCredential;
    correlation_id?: string;
    request_headers?: Record<string, string>;
    timeout_ms?: number;
}

export interface WebhookDeliveryResponse {
    ok: boolean;
    status: number;
    request_id?: string;
    response_excerpt?: string;
}

export interface WebhookDeliveryPort {
    deliver(input: WebhookDeliveryRequest): Promise<WebhookDeliveryResponse>;
}

export interface ConnectorAdapterDefinition {
    adapter_id: string;
    adapter_type: ConnectorAdapterType;
    display_name: string;
    description: string;
    business_path: boolean;
    transport_connector_type: PilotConnectorType;
    transport_connector_id: string;
    timeout_ms: number;
    max_attempts: number;
    rate_limit_window_ms: number;
    rate_limit_max_deliveries: number;
    dead_letter_after_max_attempts: boolean;
}

export interface ConnectorPlatformDispatchSummary {
    delivery_group_id: string;
    adapter_id: string;
    adapter_type: ConnectorAdapterType;
    transport_connector_id: string;
    task_id?: string;
    correlation_id?: string;
    run_id?: string;
    final_status: WebhookDeliveryStatus;
    attempts: number;
    succeeded: boolean;
    dead_lettered: boolean;
    timed_out: boolean;
    rate_limited: boolean;
    final_http_status?: number;
    final_request_id?: string;
    final_reason?: string;
    created_at: number;
    updated_at: number;
}

export interface ConnectorPlatformHealthSummary {
    adapter: ConnectorAdapterDefinition;
    health_status: ConnectorPlatformHealthStatus;
    route_eligible: boolean;
    credential_health: {
        connector_id: string;
        credential_id: string;
        backend: VaultBackendType;
        status: VaultCredentialStatus;
        compromise_status: VaultCredentialCompromiseStatus;
        route_eligible: boolean;
        lease_id?: string;
        lease_expires_at?: number;
        renewable: boolean;
        rotated_at?: number;
        revoked_at?: number;
        last_failure_reason?: string;
        last_failure_at?: number;
        last_delivery_status?: WebhookDeliveryStatus;
        last_delivery_at?: number;
        recent_deliveries: WebhookDeliveryRecord[];
        recommended_action: 'NONE' | 'RENEW' | 'ROTATE' | 'REVOKE_AND_ROTATE' | 'INVESTIGATE';
    };
    recent_attempt_count: number;
    recent_failure_count: number;
    recent_timeout_count: number;
    recent_rate_limited_count: number;
    dead_letter_count: number;
    last_delivery_status?: WebhookDeliveryStatus;
    last_delivery_at?: number;
}

export interface GenericWebhookConnectorDispatchInput {
    session_id: string;
    task_id?: string;
    correlation_id?: string;
    run_id?: string;
    payload: unknown;
    request_headers?: Record<string, string>;
    payload_summary?: string;
}

export interface AdvisorCrmComplianceHandoffInput {
    session_id: string;
    task_id?: string;
    correlation_id?: string;
    run_id?: string;
    workflow_id: string;
    crm_record_id: string;
    client_name: string;
    advisor_name?: string;
    meeting_title?: string;
    post_meeting_notes: string;
    crm_ready_draft: string;
    compliance_handoff_package: string;
    evidence_refs?: string[];
    request_headers?: Record<string, string>;
}

export interface ConnectorPlatformDispatchResult {
    adapter: ConnectorAdapterDefinition;
    connector_delivery: ConnectorPlatformDispatchSummary;
    attempts: WebhookDeliveryRecord[];
    delivery?: WebhookDeliveryRecord;
    connector_health: ConnectorPlatformHealthSummary;
    route_eligible: boolean;
}

export const EXECUTION_LEDGER_EVENT_TYPES = [
    'TASK_CREATED',
    'TASK_STARTED',
    'TASK_UPDATED',
    'TASK_COMPLETED',
    'TASK_FAILED',
    'TASK_CANCELLED',
    'NODE_STARTED',
    'NODE_SUCCEEDED',
    'NODE_FAILED',
    'NODE_WAITING_USER',
    'NODE_CANCELLED',
    'TASK_RETRY_SCHEDULED',
    'TASK_RETRY_REQUEUED',
    'TASK_DEAD_LETTERED',
    'TASK_EXECUTION_SUBSTRATE_UPDATED',
    'TASK_EXECUTION_UNIT_ENQUEUED',
    'TASK_EXECUTION_CLAIMED',
    'TASK_EXECUTION_HEARTBEAT_RECORDED',
    'TASK_EXECUTION_RELEASED',
    'TASK_EXECUTION_LEASE_EXPIRED',
    'TASK_EXECUTION_REQUEUED',
    'TASK_EXECUTION_LOCAL_FALLBACK_USED',
    'TASK_SERVICE_AUTH_ALLOWED',
    'TASK_SERVICE_AUTH_DENIED',
] as const;

export type ExecutionLedgerEventType = typeof EXECUTION_LEDGER_EVENT_TYPES[number];
export type ExecutionLedgerSequence = number;
export type ProjectionCompatibilityState =
    | 'CURRENT'
    | 'MIXED_HISTORY_COMPATIBLE'
    | 'REQUIRES_REBUILD';
export type TaskProjectionState =
    | 'CURRENT'
    | 'STALE'
    | 'REBUILDING';
export type ProjectionReplayStrategy =
    | 'CHECKPOINT_CATCH_UP'
    | 'FULL_REPLAY'
    | 'FROM_SEQUENCE_REPLAY'
    | 'COMPATIBILITY_REBUILD';

export interface LedgerSourceSummary {
    source: 'AGENT_KERNEL_RUNTIME';
    authoritative: boolean;
    append_only: boolean;
    local_first: boolean;
}

export interface ExecutionLedgerRecord {
    ledger_id: string;
    dedupe_key: string;
    task_id: string;
    sequence: ExecutionLedgerSequence;
    event_type: ExecutionLedgerEventType;
    source: 'TASK_RUNTIME' | 'PROJECTION_REBUILD';
    occurred_at: number;
    created_at: number;
    payload?: Record<string, unknown>;
}

export interface ExecutionLedgerCheckpoint {
    task_id: string;
    record_count: number;
    first_sequence?: ExecutionLedgerSequence;
    last_sequence?: ExecutionLedgerSequence;
    last_event_type?: ExecutionLedgerEventType;
    last_event_at?: number;
    updated_at: number;
}

export interface ExecutionLedgerAppendResult {
    record: ExecutionLedgerRecord;
    checkpoint: ExecutionLedgerCheckpoint;
    appended: boolean;
}

export interface ExecutionLedgerReadFilter {
    task_id?: string;
    sequence_gte?: ExecutionLedgerSequence;
    sequence_lte?: ExecutionLedgerSequence;
    event_types?: ExecutionLedgerEventType[];
    limit?: number;
}

export interface ExecutionLedgerCompactionHint {
    hint_id: string;
    task_id: string;
    projection_name: string;
    up_to_sequence: ExecutionLedgerSequence;
    reason: string;
    record_count: number;
    oldest_record_at?: number;
    newest_record_at?: number;
    archive_recommended: boolean;
    snapshot_required_before_archive: boolean;
    delete_allowed: boolean;
    created_at: number;
    updated_at: number;
}

export interface ProjectionSourceSummary {
    projection_name: string;
    projection_version: number;
    minimum_compatible_projection_version: number;
    source: 'EXECUTION_LEDGER';
    authoritative_ledger: boolean;
    rebuildable: boolean;
    checkpoint_catch_up_supported: boolean;
}

export interface ProjectionLagSummary {
    last_ledger_sequence: ExecutionLedgerSequence;
    projected_sequence: ExecutionLedgerSequence;
    lag_records: number;
    in_sync: boolean;
}

export interface TaskProjectionCheckpoint {
    task_id: string;
    projection_name: string;
    projection_version: number;
    last_sequence: ExecutionLedgerSequence;
    last_event_at?: number;
    replayed_records: number;
    updated_at: number;
    compatibility_state: ProjectionCompatibilityState;
}

export interface TaskQueryProjection {
    task_id: string;
    projection_name: string;
    projection_version: number;
    state: TaskProjectionState;
    compatibility_state: ProjectionCompatibilityState;
    source_summary: ProjectionSourceSummary;
    checkpoint: TaskProjectionCheckpoint;
    last_task_status?: TaskStatus;
    last_event_type?: ExecutionLedgerEventType;
    first_event_at?: number;
    last_event_at?: number;
    node_statuses: Record<string, NodeStatus>;
    node_status_counts: Partial<Record<NodeStatus, number>>;
    current_wait_node_id?: string;
    current_wait_type?: 'approval' | 'ask_user';
    pending_retry_jobs: number;
    dead_letter_count: number;
    runnable_execution_units: number;
    active_claim_count: number;
    stale_claim_count: number;
    local_fallback_count: number;
    completed_claim_count: number;
    released_claim_count: number;
    expired_claim_count: number;
    allowed_service_auth_count: number;
    denied_service_auth_count: number;
    break_glass_service_auth_count: number;
    last_execution_mode?: TaskExecutionMode;
    last_runner_status?: RemoteRunnerControlStatus;
    last_worker_id?: string;
    last_claim_status?: TaskLeaseStatus;
    last_lease_expires_at?: number;
    last_heartbeat_at?: number;
    last_claim_id?: string;
    last_execution_unit_id?: string;
    last_session_id?: string;
    last_release_reason?: TaskClaimReleaseReason;
    last_service_auth_action?: ServiceAuthAction;
    last_service_auth_outcome?: ServiceAuthDecisionOutcome;
    last_service_principal_id?: string;
    last_service_principal_type?: ServicePrincipalType;
    last_service_auth_mode?: ServiceAuthMode;
    last_service_auth_reason?: string;
    rebuild_count: number;
    last_rebuild_at?: number;
    last_rebuild_from_sequence?: ExecutionLedgerSequence;
    last_rebuild_strategy?: ProjectionReplayStrategy;
    last_rebuild_replayed_records: number;
    updated_at: number;
}

export interface ProjectionRebuildRequest {
    task_id: string;
    projection_name?: string;
    full_rebuild?: boolean;
    from_sequence?: ExecutionLedgerSequence;
}

export interface ProjectionCompatibilitySummary {
    projection_name: string;
    current_projection_version: number;
    materialized_projection_version: number;
    minimum_compatible_projection_version: number;
    state: ProjectionCompatibilityState;
    full_rebuild_recommended: boolean;
    reason: string;
}

export interface ExecutionLedgerRetentionSummary {
    policy_name: 'PILOT_APPEND_ONLY_NO_DELETE';
    retained_from_sequence: ExecutionLedgerSequence;
    retained_through_sequence: ExecutionLedgerSequence;
    record_count: number;
    oldest_record_at?: number;
    newest_record_at?: number;
    archive_after_record_count: number;
    archive_after_age_ms: number;
    archive_recommended: boolean;
    archive_reason?: string;
    snapshot_required_before_archive: boolean;
    delete_allowed: boolean;
    projection_rebuild_required_after_archive: boolean;
    latest_compaction_hint?: ExecutionLedgerCompactionHint;
}

export interface ProjectionRebuildResult {
    task_id: string;
    projection_name: string;
    replayed_records: number;
    rebuild_strategy: ProjectionReplayStrategy;
    projection: TaskQueryProjection;
    checkpoint: TaskProjectionCheckpoint;
    lag: ProjectionLagSummary;
    source_summary: ProjectionSourceSummary;
    compatibility: ProjectionCompatibilitySummary;
    retention: ExecutionLedgerRetentionSummary;
}

export interface ExecutionLedgerSummary {
    record_count: number;
    first_sequence?: ExecutionLedgerSequence;
    last_sequence?: ExecutionLedgerSequence;
    last_event_type?: ExecutionLedgerEventType;
    last_event_at?: number;
    checkpoint: ExecutionLedgerCheckpoint;
}

export interface TaskProjectionSummary {
    projection_name: string;
    projection_version: number;
    state: TaskProjectionState;
    compatibility_state: ProjectionCompatibilityState;
    last_projected_sequence: ExecutionLedgerSequence;
    last_event_at?: number;
    last_task_status?: TaskStatus;
    pending_retry_jobs: number;
    dead_letter_count: number;
    runnable_execution_units: number;
    active_claim_count: number;
    stale_claim_count: number;
    local_fallback_count: number;
    completed_claim_count: number;
    released_claim_count: number;
    expired_claim_count: number;
    allowed_service_auth_count: number;
    denied_service_auth_count: number;
    break_glass_service_auth_count: number;
    last_execution_mode?: TaskExecutionMode;
    last_runner_status?: RemoteRunnerControlStatus;
    last_worker_id?: string;
    last_claim_status?: TaskLeaseStatus;
    last_lease_expires_at?: number;
    last_heartbeat_at?: number;
    last_claim_id?: string;
    last_execution_unit_id?: string;
    last_session_id?: string;
    last_release_reason?: TaskClaimReleaseReason;
    last_service_auth_action?: ServiceAuthAction;
    last_service_auth_outcome?: ServiceAuthDecisionOutcome;
    last_service_principal_id?: string;
    last_service_principal_type?: ServicePrincipalType;
    last_service_auth_mode?: ServiceAuthMode;
    last_service_auth_reason?: string;
    rebuild_count: number;
    last_rebuild_at?: number;
    last_rebuild_from_sequence?: ExecutionLedgerSequence;
    last_rebuild_strategy?: ProjectionReplayStrategy;
    last_rebuild_replayed_records: number;
    lag: ProjectionLagSummary;
    updated_at: number;
}

export interface ExecutionClaimStorePort {
    listTaskIds(): Promise<string[]>;
    listExecutionUnits(taskId: string): Promise<TaskExecutionUnit[]>;
    getExecutionUnit(executionUnitId: string): Promise<TaskExecutionUnit | undefined>;
    upsertExecutionUnit(executionUnit: TaskExecutionUnit): Promise<void>;
    updateExecutionUnit(
        executionUnitId: string,
        update: Partial<TaskExecutionUnit>
    ): Promise<TaskExecutionUnit | undefined>;
    listExecutionClaims(taskId: string): Promise<TaskClaimRecord[]>;
    getExecutionClaim(claimId: string): Promise<TaskClaimRecord | undefined>;
    upsertExecutionClaim(claim: TaskClaimRecord): Promise<void>;
    updateExecutionClaim(claimId: string, update: Partial<TaskClaimRecord>): Promise<TaskClaimRecord | undefined>;
    listWorkerSessions(taskId: string): Promise<WorkerSessionRecord[]>;
    getWorkerSession(sessionId: string): Promise<WorkerSessionRecord | undefined>;
    upsertWorkerSession(session: WorkerSessionRecord): Promise<void>;
    updateWorkerSession(
        sessionId: string,
        update: Partial<WorkerSessionRecord>
    ): Promise<WorkerSessionRecord | undefined>;
}

export interface EnterpriseIdentityStorePort {
    listEnterprisePrincipals(): Promise<EnterprisePrincipalRecord[]>;
    getEnterprisePrincipal(principalId: string): Promise<EnterprisePrincipalRecord | undefined>;
    upsertEnterprisePrincipal(principal: EnterprisePrincipalRecord): Promise<void>;
    updateEnterprisePrincipal(
        principalId: string,
        update: Partial<EnterprisePrincipalRecord>
    ): Promise<EnterprisePrincipalRecord | undefined>;
    listEnterpriseAccessBindings(principalId?: string): Promise<EnterpriseAccessBindingRecord[]>;
    getEnterpriseAccessBinding(bindingId: string): Promise<EnterpriseAccessBindingRecord | undefined>;
    upsertEnterpriseAccessBinding(binding: EnterpriseAccessBindingRecord): Promise<void>;
    updateEnterpriseAccessBinding(
        bindingId: string,
        update: Partial<EnterpriseAccessBindingRecord>
    ): Promise<EnterpriseAccessBindingRecord | undefined>;
    listEnterpriseIdentitySessions(principalId?: string): Promise<EnterpriseIdentitySessionRecord[]>;
    getEnterpriseIdentitySession(sessionId: string): Promise<EnterpriseIdentitySessionRecord | undefined>;
    upsertEnterpriseIdentitySession(session: EnterpriseIdentitySessionRecord): Promise<void>;
    updateEnterpriseIdentitySession(
        sessionId: string,
        update: Partial<EnterpriseIdentitySessionRecord>
    ): Promise<EnterpriseIdentitySessionRecord | undefined>;
    getOidcLoginState(stateId: string): Promise<OidcLoginStateRecord | undefined>;
    upsertOidcLoginState(state: OidcLoginStateRecord): Promise<void>;
    updateOidcLoginState(
        stateId: string,
        update: Partial<OidcLoginStateRecord>
    ): Promise<OidcLoginStateRecord | undefined>;
    listEnterpriseMembershipInvites(tenantId?: string, workspaceId?: string): Promise<EnterpriseMembershipInviteRecord[]>;
    getEnterpriseMembershipInvite(inviteId: string): Promise<EnterpriseMembershipInviteRecord | undefined>;
    upsertEnterpriseMembershipInvite(invite: EnterpriseMembershipInviteRecord): Promise<void>;
    updateEnterpriseMembershipInvite(
        inviteId: string,
        update: Partial<EnterpriseMembershipInviteRecord>
    ): Promise<EnterpriseMembershipInviteRecord | undefined>;
}

export interface VaultCredentialStorePort {
    listVaultCredentials(connectorId?: string): Promise<VaultCredentialRecord[]>;
    getVaultCredential(credentialId: string): Promise<VaultCredentialRecord | undefined>;
    upsertVaultCredential(record: VaultCredentialRecord): Promise<void>;
    updateVaultCredential(
        credentialId: string,
        update: Partial<VaultCredentialRecord>
    ): Promise<VaultCredentialRecord | undefined>;
    listWebhookDeliveries(connectorId?: string): Promise<WebhookDeliveryRecord[]>;
    getWebhookDelivery(deliveryId: string): Promise<WebhookDeliveryRecord | undefined>;
    upsertWebhookDelivery(record: WebhookDeliveryRecord): Promise<void>;
    updateWebhookDelivery(
        deliveryId: string,
        update: Partial<WebhookDeliveryRecord>
    ): Promise<WebhookDeliveryRecord | undefined>;
}

export interface EnsureExecutionUnitParams {
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    target_attempt: number;
    available_at: number;
    desired_execution_mode?: TaskExecutionMode;
    runner_type?: RunnerType;
}

export interface ClaimExecutionUnitParams {
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    target_attempt: number;
    lease_ttl_ms: number;
    service_auth_context?: ServiceAuthContext;
}

export interface ClaimExecutionUnitResult {
    execution_unit: TaskExecutionUnit;
    claim: TaskClaimRecord;
    worker_session: WorkerSessionRecord;
    created_execution_unit: boolean;
}

export interface HeartbeatExecutionClaimResult {
    claim: TaskClaimRecord;
    execution_unit: TaskExecutionUnit;
    worker_session?: WorkerSessionRecord;
    heartbeat: TaskHeartbeatRecord;
}

export interface ReleaseExecutionClaimParams {
    claim_id: string;
    release_reason: TaskClaimReleaseReason;
    unit_status?: TaskExecutionUnitStatus;
    service_auth_context?: ServiceAuthContext;
}

export interface ReleaseExecutionClaimResult {
    claim: TaskClaimRecord;
    execution_unit: TaskExecutionUnit;
    worker_session?: WorkerSessionRecord;
}

export interface StaleClaimRecoveryResult {
    expired_claims: TaskClaimRecord[];
    timed_out_units: TaskExecutionUnit[];
    requeued_units: TaskExecutionUnit[];
    timeout_records: TaskExecutionTimeoutRecord[];
}

export interface ExecutionWorkerPoolPort {
    ensureExecutionUnit(params: EnsureExecutionUnitParams): Promise<{
        execution_unit: TaskExecutionUnit;
        created: boolean;
    }>;
    claimExecutionUnit(params: ClaimExecutionUnitParams): Promise<ClaimExecutionUnitResult | undefined>;
    heartbeatClaim(claimId: string, leaseTtlMs: number): Promise<HeartbeatExecutionClaimResult | undefined>;
    releaseClaim(params: ReleaseExecutionClaimParams): Promise<ReleaseExecutionClaimResult | undefined>;
    recoverStaleClaims(taskId: string, atMs?: number): Promise<StaleClaimRecoveryResult>;
    getSummary(taskId: string): Promise<TaskExecutionSubstrateSummary | undefined>;
}

export interface RemoteRunnerControlPort {
    requestExecution(request: RemoteRunnerControlRequest): Promise<RemoteRunnerControlResult>;
}

export interface ExecutionLedgerVisibilitySummary {
    source: LedgerSourceSummary;
    ledger: ExecutionLedgerSummary;
    projection: TaskProjectionSummary;
    compatibility: ProjectionCompatibilitySummary;
    retention: ExecutionLedgerRetentionSummary;
}

export interface TaskBudget {
    max_tool_calls?: number;
    max_tokens?: number;
    max_latency_ms?: number;
}

export interface MergePolicy {
    mode: 'ALL' | 'ANY_K' | 'BEST_EFFORT';
    k?: number;
    timeout_ms?: number;
}

export interface NodeOutputSchema {
    required?: string[];
}

export interface NodeDef {
    id: string;
    type: NodeType;
    name: string;
    input?: Record<string, unknown>;
    input_from?: string[];
    requires_permission?: string;
    idempotency_key?: string;
    idempotent?: boolean;
    idempotency_ttl_ms?: number;
    merge_policy?: MergePolicy;
    output_schema?: NodeOutputSchema;
    metadata?: Record<string, unknown>;
}

export interface CompensationRule {
    on: `${string}_fail` | `${string}_succeed` | 'task_cancelled';
    do: string;
}

export interface TaskGraph {
    task_id: string;
    goal: string;
    budget?: TaskBudget;
    nodes: NodeDef[];
    edges: Array<[string, string]>;
    retry_policy?: RetryPolicy;
    compensation?: CompensationRule[];
    max_parallel_nodes?: number;
    created_at?: number;
    context?: {
        intent?: PolicyContext['intent'];
        user?: PolicyContext['user'];
        permissions?: PolicyContext['permissions'];
        data?: PolicyContext['data'];
    };
}

export interface NodeError {
    code: NodeErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
}

export interface NodeTrace {
    tool_call_id?: string;
    verifier?: string;
    policy_decision_ids?: string[];
    approval_granted?: boolean;
    approval_decision?: string;
    correlation_id?: string;
    run_id?: string;
    span_id?: string;
}

export interface NodeState {
    task_id: string;
    node_id: string;
    status: NodeStatus;
    attempt: number;
    started_at?: number;
    ended_at?: number;
    input?: unknown;
    output?: unknown;
    error?: NodeError;
    trace?: NodeTrace;
}

export interface ApprovalPayload {
    task_id: string;
    node_id: string;
    type: 'approval' | 'ask_user';
    title: string;
    summary: string;
    options: Array<{ id: string; label: string }>;
    default?: string;
    risk?: 'low' | 'medium' | 'high';
    expires_at?: number;
}

export interface TaskState {
    task_id: string;
    status: TaskStatus;
    correlation?: AgentKernelCorrelationContext;
    current_wait?: {
        node_id: string;
        type: 'approval' | 'ask_user';
        expires_at?: number;
        prompt?: ApprovalPayload;
    };
    budget_spent: {
        tool_calls: number;
        tokens: number;
        latency_ms: number;
    };
    created_at: number;
    updated_at: number;
}

export interface TaskSnapshot {
    graph: TaskGraph;
    task_state: TaskState;
    node_states: NodeState[];
    policy_decision_ids: string[];
    execution_substrate?: TaskExecutionSubstrateSummary;
    execution_ledger?: ExecutionLedgerVisibilitySummary;
    observability?: AgentKernelTaskObservabilitySummary;
    compliance?: AgentKernelTaskComplianceSummary;
    deployment?: AgentKernelTaskDeploymentSummary;
    environment_activation?: EnvironmentActivationSummary;
}

export type AgentKernelLogLevel = 'INFO' | 'WARN' | 'ERROR';
export type AgentKernelSpanStatus = 'ACTIVE' | 'SUCCEEDED' | 'FAILED' | 'DEGRADED';
export type AgentKernelComponent =
    | 'RUNTIME'
    | 'WORKER'
    | 'CONTROL_PLANE'
    | 'CONNECTOR'
    | 'LEDGER';
export type AgentKernelSpanType =
    | 'TASK_RUN'
    | 'NODE_EXECUTION'
    | 'CLAIM_LEASE'
    | 'CONTROL_PLANE_ACTION'
    | 'CONNECTOR_DELIVERY';
export type AgentKernelAlertSeverity = 'SEV1' | 'SEV2' | 'SEV3';
export type AgentKernelAlertStatus = 'OPEN' | 'ACKNOWLEDGED';
export type AgentKernelSloStatus = 'HEALTHY' | 'AT_RISK' | 'BREACHED';

export interface AgentKernelCorrelationContext {
    trace_id: string;
    correlation_id: string;
    current_run_id: string;
    run_sequence: number;
    created_at: number;
    last_run_started_at?: number;
    last_run_completed_at?: number;
}

export interface AgentKernelStructuredLogRecord {
    log_id: string;
    correlation_id: string;
    run_id?: string;
    span_id?: string;
    task_id: string;
    node_id?: string;
    component: AgentKernelComponent;
    level: AgentKernelLogLevel;
    message: string;
    event_type: string;
    occurred_at: number;
    attributes?: Record<string, unknown>;
}

export interface AgentKernelTraceSpan {
    span_id: string;
    parent_span_id?: string;
    correlation_id: string;
    run_id?: string;
    task_id: string;
    node_id?: string;
    component: AgentKernelComponent;
    span_type: AgentKernelSpanType;
    status: AgentKernelSpanStatus;
    started_at: number;
    ended_at?: number;
    attributes?: Record<string, unknown>;
}

export interface AgentKernelRunbookReference {
    runbook_id: string;
    title: string;
    path: string;
    trigger_codes: string[];
}

export interface AgentKernelAlertRecord {
    alert_id: string;
    code: string;
    severity: AgentKernelAlertSeverity;
    status: AgentKernelAlertStatus;
    scope: 'TASK' | 'CONNECTOR' | 'PLATFORM';
    task_id?: string;
    connector_id?: string;
    correlation_id?: string;
    run_id?: string;
    summary: string;
    detail: string;
    triggered_at: number;
    runbook: AgentKernelRunbookReference;
}

export interface AgentKernelSloSummary {
    scope: 'TASK' | 'PLATFORM' | 'CONNECTOR';
    name: string;
    objective: string;
    target: number;
    measured: number;
    comparator: 'LTE' | 'GTE';
    window: string;
    status: AgentKernelSloStatus;
}

export interface AgentKernelDegradedModeSummary {
    active: boolean;
    reason_codes: string[];
    last_degraded_at?: number;
    recovery_runbooks: AgentKernelRunbookReference[];
}

export interface AgentKernelTaskObservabilityMetrics {
    open_alert_count: number;
    dead_letter_count: number;
    stale_claim_count: number;
    denied_service_auth_count: number;
    local_fallback_count: number;
    connector_failure_count: number;
}

export interface AgentKernelTaskObservabilitySummary {
    task_id: string;
    task_status: TaskStatus;
    correlation: AgentKernelCorrelationContext;
    tracing: {
        root_span_id: string;
        spans: AgentKernelTraceSpan[];
    };
    structured_logs: AgentKernelStructuredLogRecord[];
    alerts: AgentKernelAlertRecord[];
    slo: AgentKernelSloSummary[];
    degraded_mode: AgentKernelDegradedModeSummary;
    metrics: AgentKernelTaskObservabilityMetrics;
    runbooks: AgentKernelRunbookReference[];
}

export interface AgentKernelPilotTaskSummary {
    task_id: string;
    task_status: TaskStatus;
    correlation_id: string;
    run_id: string;
    degraded_mode_active: boolean;
    open_alert_count: number;
    dead_letter_count: number;
    stale_claim_count: number;
    denied_service_auth_count: number;
    local_fallback_count: number;
    updated_at: number;
}

export interface AgentKernelPilotConnectorSummary {
    connector_id: string;
    adapter_id?: string;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    open_alert_count: number;
    recent_failure_count: number;
    dead_letter_count: number;
    last_delivery_status?: WebhookDeliveryStatus;
    last_delivery_at?: number;
    last_correlation_id?: string;
}

export interface AgentKernelOnCallSummary {
    tier: 'PILOT_PRIMARY';
    primary_responsibility: string;
    escalation_policy: string;
    runbook_ids: string[];
}

export interface AgentKernelPilotObservabilitySummary {
    generated_at: number;
    alerts: AgentKernelAlertRecord[];
    slo: AgentKernelSloSummary[];
    task_summaries: AgentKernelPilotTaskSummary[];
    connector_summaries: AgentKernelPilotConnectorSummary[];
    runbooks: AgentKernelRunbookReference[];
    on_call: AgentKernelOnCallSummary;
}

export type AgentKernelComplianceActorType = 'ENTERPRISE_SESSION' | 'SYSTEM';
export type AgentKernelComplianceDeletionStatus =
    | 'DENIED_APPEND_ONLY_POLICY'
    | 'DENIED_MANUAL_LEGAL_HOLD_REVIEW';
export type AgentKernelAuditExportStatus = 'GENERATED';

export interface AgentKernelComplianceQuestionnaireReference {
    version: 'PILOT_2026_03_07';
    title: string;
    path: string;
}

export interface AgentKernelLegalHoldPostureSummary {
    mode: 'MANUAL_ESCALATION_REQUIRED';
    supported_for_pilot: false;
    automated_enforcement: false;
    deletion_blocking_requires_manual_review: true;
    export_blocking_requires_manual_review: true;
    deferred_reason: string;
    runbook_path: string;
}

export interface AgentKernelComplianceActorSummary {
    actor_type: AgentKernelComplianceActorType;
    principal_id?: string;
    session_id?: string;
    email?: string;
    display_name?: string;
}

export interface AgentKernelComplianceDeletionRequestRecord {
    request_id: string;
    task_id: string;
    correlation_id?: string;
    run_id?: string;
    requested_by: AgentKernelComplianceActorSummary;
    reason: string;
    status: AgentKernelComplianceDeletionStatus;
    delete_scope: 'TASK_AUDIT_STATE';
    legal_hold_mode: AgentKernelLegalHoldPostureSummary['mode'];
    decision_summary: string;
    next_action: string;
    created_at: number;
    updated_at: number;
}

export interface AgentKernelAuditExportSectionHash {
    section_id: string;
    sha256: string;
    item_count: number;
}

export interface AgentKernelAuditExportRecordCounts {
    node_count: number;
    ledger_record_count: number;
    delivery_count: number;
    alert_count: number;
    deletion_request_count: number;
}

export interface AgentKernelAuditExportRecord {
    export_id: string;
    task_id: string;
    correlation_id?: string;
    run_id?: string;
    requested_by: AgentKernelComplianceActorSummary;
    status: AgentKernelAuditExportStatus;
    bundle_version: 'PILOT_AUDIT_EXPORT_V1';
    redaction_mode: 'SUMMARY_ONLY_NO_SECRET_MATERIAL';
    manifest_sha256: string;
    bundle_sha256: string;
    section_hashes: AgentKernelAuditExportSectionHash[];
    record_counts: AgentKernelAuditExportRecordCounts;
    created_at: number;
    updated_at: number;
}

export interface AgentKernelAuditExportBundleSection {
    section_id: string;
    item_count: number;
    data: unknown;
}

export interface AgentKernelAuditExportBundle {
    manifest: {
        export_id: string;
        task_id: string;
        correlation_id?: string;
        run_id?: string;
        generated_at: number;
        bundle_version: 'PILOT_AUDIT_EXPORT_V1';
        redaction_mode: 'SUMMARY_ONLY_NO_SECRET_MATERIAL';
        section_hashes: AgentKernelAuditExportSectionHash[];
        record_counts: AgentKernelAuditExportRecordCounts;
        questionnaire: AgentKernelComplianceQuestionnaireReference;
        legal_hold: AgentKernelLegalHoldPostureSummary;
    };
    manifest_sha256: string;
    bundle_sha256: string;
    sections: AgentKernelAuditExportBundleSection[];
}

export interface AgentKernelTaskComplianceSummary {
    task_id: string;
    retention: ExecutionLedgerRetentionSummary;
    deletion: {
        delete_allowed: false;
        baseline: 'APPEND_ONLY_REQUEST_AND_DENY';
        latest_requests: AgentKernelComplianceDeletionRequestRecord[];
    };
    audit_export: {
        baseline: 'MANIFEST_HASH_AND_SECTION_HASHES';
        total_exports: number;
        latest_export?: AgentKernelAuditExportRecord;
    };
    legal_hold: AgentKernelLegalHoldPostureSummary;
    questionnaire: AgentKernelComplianceQuestionnaireReference;
}

export interface AgentKernelPilotComplianceTaskSummary {
    task_id: string;
    task_status: TaskStatus;
    correlation_id: string;
    archive_recommended: boolean;
    deletion_request_count: number;
    latest_deletion_status?: AgentKernelComplianceDeletionStatus;
    latest_export_at?: number;
    updated_at: number;
}

export interface AgentKernelPilotComplianceSummary {
    generated_at: number;
    retention_policy_name: ExecutionLedgerRetentionSummary['policy_name'];
    archive_recommended_task_count: number;
    deletion_request_count: number;
    audit_export_count: number;
    legal_hold: AgentKernelLegalHoldPostureSummary;
    questionnaire: AgentKernelComplianceQuestionnaireReference;
    task_summaries: AgentKernelPilotComplianceTaskSummary[];
}

export type AgentKernelDeploymentSummaryStatus = 'READY' | 'DEGRADED';
export type AgentKernelDeploymentModel = 'VENDOR_MANAGED_SINGLE_TENANT_CLOUD';
export type AgentKernelDeploymentStage =
    | 'DEVELOPMENT'
    | 'STAGING'
    | 'PILOT'
    | 'PRODUCTION'
    | 'UNSPECIFIED';
export type AgentKernelInfrastructureEnvironment =
    | 'DEVELOPMENT'
    | 'STAGING'
    | 'PRODUCTION'
    | 'UNSPECIFIED';
export type AgentKernelTenantIsolationStatus = 'ISOLATED' | 'DEGRADED';
export type AgentKernelRegionResidencyStatus = 'CONFIGURED' | 'DEGRADED';
export type AgentKernelSecretSeparationStatus = 'SCOPED' | 'DEGRADED';

export interface AgentKernelIdentityAdminPathSummary {
    path_name: 'OKTA_OIDC_SCIM';
    provider: 'OKTA_OIDC';
    configured: boolean;
    tenant_id?: string;
    default_workspace_id?: string;
}

export interface AgentKernelVaultPathSummary {
    path_name: 'HASHICORP_VAULT_WEBHOOK';
    backend: 'HASHICORP_VAULT';
    configured: boolean;
    tenant_id?: string;
    workspace_id?: string;
    connector_id?: string;
    credential_id?: string;
}

export interface AgentKernelEnvironmentBoundarySummary {
    stage: Exclude<AgentKernelDeploymentStage, 'UNSPECIFIED'>;
    backing_environment: Exclude<AgentKernelInfrastructureEnvironment, 'UNSPECIFIED'>;
    customer_data_policy:
        | 'LOCAL_OR_SYNTHETIC_ONLY'
        | 'APPROVED_VALIDATION_ONLY'
        | 'TENANT_PRODUCTION_DATA';
    secret_scope:
        | 'LOCAL_ONLY'
        | 'NON_PRODUCTION_TENANT_SCOPE'
        | 'PRODUCTION_TENANT_SCOPE';
    promotion_from?: Exclude<AgentKernelDeploymentStage, 'UNSPECIFIED'>;
    promotion_to?: Exclude<AgentKernelDeploymentStage, 'UNSPECIFIED'>;
    manual_approval_required: boolean;
    description: string;
}

export interface AgentKernelTenantIsolationSummary {
    status: AgentKernelTenantIsolationStatus;
    isolation_model: 'SINGLE_TENANT_VENDOR_MANAGED_DEPLOYMENT';
    configured_tenant_id?: string;
    identity_tenant_id?: string;
    connector_tenant_id?: string;
    observed_active_tenant_ids: string[];
    observed_workspace_ids: string[];
    issues: string[];
}

export interface AgentKernelRegionResidencySummary {
    status: AgentKernelRegionResidencyStatus;
    strategy: 'SINGLE_PRIMARY_REGION_PER_TENANT';
    primary_region?: string;
    staging_region?: string;
    residency_scope?: string;
    active_active_enabled: false;
    failover_mode: 'MANUAL_REDEPLOY';
    issues: string[];
}

export interface AgentKernelSecretSeparationSummary {
    status: AgentKernelSecretSeparationStatus;
    strategy: 'TENANT_DEPLOYMENT_AND_ENVIRONMENT_SCOPED';
    backend?: 'HASHICORP_VAULT';
    vault_namespace?: string;
    read_path?: string;
    rotate_path?: string;
    connector_id?: string;
    credential_id?: string;
    issues: string[];
}

export interface AgentKernelPilotDeploymentTaskSummary {
    task_id: string;
    task_status: TaskStatus;
    correlation_id: string;
    updated_at: number;
}

export interface AgentKernelTaskDeploymentSummary {
    task_id: string;
    correlation_id: string;
    status: AgentKernelDeploymentSummaryStatus;
    deployment_model: AgentKernelDeploymentModel;
    deployment_stage: AgentKernelDeploymentStage;
    backing_environment: AgentKernelInfrastructureEnvironment;
    baseline_doc_path: string;
    identity_admin_path: AgentKernelIdentityAdminPathSummary;
    vault_path: AgentKernelVaultPathSummary;
    tenant_isolation: AgentKernelTenantIsolationSummary;
    region: AgentKernelRegionResidencySummary;
    secret_separation: AgentKernelSecretSeparationSummary;
    environment_boundaries: AgentKernelEnvironmentBoundarySummary[];
    warnings: string[];
}

export interface AgentKernelPilotDeploymentSummary {
    generated_at: number;
    status: AgentKernelDeploymentSummaryStatus;
    deployment_model: AgentKernelDeploymentModel;
    deployment_stage: AgentKernelDeploymentStage;
    backing_environment: AgentKernelInfrastructureEnvironment;
    baseline_doc_path: string;
    identity_admin_path: AgentKernelIdentityAdminPathSummary;
    vault_path: AgentKernelVaultPathSummary;
    tenant_isolation: AgentKernelTenantIsolationSummary;
    region: AgentKernelRegionResidencySummary;
    secret_separation: AgentKernelSecretSeparationSummary;
    environment_boundaries: AgentKernelEnvironmentBoundarySummary[];
    task_count: number;
    active_task_count: number;
    task_summaries: AgentKernelPilotDeploymentTaskSummary[];
    warnings: string[];
    deferred_items: string[];
}

export type EnvironmentKind = 'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION';
export type WorkspaceBindingKind = 'UNBOUND' | 'DEMO_WORKSPACE' | 'TENANT_WORKSPACE' | 'LOCAL_ROLE_LAB_WORKSPACE';
export type PilotActivationStatus =
    | 'NOT_APPLICABLE'
    | 'DEMO_READY'
    | 'PILOT_BLOCKED'
    | 'PILOT_READY'
    | 'PRODUCTION_READY';
export type DependencyReadinessState = 'READY' | 'MISSING' | 'DEGRADED' | 'DEMO_ONLY' | 'BLOCKED';
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
export type RequesterInboxGroup = 'IN_PROGRESS' | 'BLOCKED' | 'WAITING' | 'COMPLETED';
export type WorkspaceMode = 'current' | 'demo' | 'local_lab';

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
    provisioning_state?: PilotProvisioningState;
    access_state?: PilotAccessGrantState;
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

export interface IdentityReadinessSummary {
    state: DependencyReadinessState;
    provider?: string;
    tenant_id?: string;
    workspace_id?: string;
    summary: string;
    issues: string[];
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface ConnectorReadinessSummary {
    state: DependencyReadinessState;
    connector_id?: string;
    connector_label?: string;
    summary: string;
    issues: string[];
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface VaultReadinessSummary {
    state: DependencyReadinessState;
    backend?: string;
    credential_id?: string;
    summary: string;
    issues: string[];
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export type PilotEnvironmentBindingState = 'MISSING' | 'BOUND' | 'DEMO_ONLY' | 'BLOCKED';
export type PilotProvisioningState = 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
export type PilotAccessGrantState = 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
export type PilotConnectorActivationState = 'INELIGIBLE' | 'ELIGIBLE' | 'DEMO_ONLY' | 'BLOCKED';

export interface PilotEnvironmentBindingSummary {
    state: PilotEnvironmentBindingState;
    environment_kind: EnvironmentKind;
    environment_label: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    summary: string;
    source: PilotArtifactSource;
}

export interface PilotConnectorActivationSummary {
    state: PilotConnectorActivationState;
    connector_id?: string;
    summary: string;
    source?: PilotArtifactSource;
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
    identity_readiness: IdentityReadinessSummary;
    connector_readiness: ConnectorReadinessSummary;
    vault_readiness: VaultReadinessSummary;
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
    task_status: TaskStatus;
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
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export interface TenantAdminActivationSummary {
    status: DependencyReadinessState;
    title: string;
    summary: string;
    detail_lines: string[];
    missing_dependency_codes: string[];
    actor_availability: ActorAvailabilitySummary[];
    identity_readiness: IdentityReadinessSummary;
    connector_readiness: ConnectorReadinessSummary;
    vault_readiness: VaultReadinessSummary;
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

export interface ProductShellDemoSummary {
    enabled: boolean;
    label: string;
    summary: string;
    seeded_scenarios: string[];
    seeded_task_count: number;
    is_demo_data: boolean;
    is_pilot_evidence: boolean;
}

export type PilotEvidenceCategory =
    | 'DEVICE_SESSION_PROOF'
    | 'WORKFLOW_ARTIFACT_PROOF'
    | 'CONNECTOR_CREDENTIAL_PROOF'
    | 'TENANT_ADMIN_SUPPORT_PROOF'
    | 'STABILITY_SAFETY_PROOF';
export type PilotArtifactSource =
    | 'REAL_PILOT'
    | 'DEMO'
    | 'SIMULATOR'
    | 'TEST'
    | 'LOCAL_SYNTHETIC';
export type PilotActivationOwnerType =
    | 'PILOT_COMMANDER'
    | 'REQUESTER_OWNER'
    | 'OPERATOR_OWNER'
    | 'TENANT_ADMIN_OWNER';
export type PilotActivationPackageStatus =
    | 'HANDOFF_REQUIRED'
    | 'IN_PROGRESS'
    | 'VERIFICATION_PENDING'
    | 'BLOCKED'
    | 'ACTIVATION_READY';
export type PilotActivationRequirementStatus =
    | 'PENDING'
    | 'RECEIVED'
    | 'VERIFIED'
    | 'PROMOTED'
    | 'REJECTED'
    | 'BLOCKED';
export type PilotExternalArtifactKind =
    | 'ENVIRONMENT_BINDING'
    | 'ACTOR_READINESS'
    | 'CONNECTOR_ELIGIBILITY'
    | 'REAL_EVIDENCE';
export type PilotExternalArtifactVerificationStatus =
    | 'RECEIVED'
    | 'EVIDENCE_REQUESTED'
    | 'HANDED_BACK'
    | 'VERIFIED'
    | 'REJECTED'
    | 'PROMOTED';

export interface PilotActivationPackageRecord {
    package_id: string;
    workspace_key: string;
    owner_type: PilotActivationOwnerType;
    owner_label: string;
    status: PilotActivationPackageStatus;
    summary: string;
    handoff_note?: string;
    due_at?: number;
    created_at: number;
    updated_at: number;
}

export interface PilotEnvironmentBindingRecord {
    binding_id: string;
    workspace_key: string;
    environment_kind: EnvironmentKind;
    state: PilotEnvironmentBindingState;
    environment_label: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    source: PilotArtifactSource;
    summary: string;
    created_at: number;
    updated_at: number;
}

export interface PilotActorReadinessRecord {
    readiness_id: string;
    workspace_key: string;
    role: ActorRole;
    state: DependencyReadinessState;
    provisioning_state: PilotProvisioningState;
    access_state: PilotAccessGrantState;
    actor_id?: string;
    actor_label?: string;
    source: PilotArtifactSource;
    note?: string;
    evidence_reference_ids: string[];
    created_at: number;
    updated_at: number;
}

export interface PilotConnectorActivationRecord {
    activation_id: string;
    workspace_key: string;
    connector_id: string;
    state: PilotConnectorActivationState;
    source: PilotArtifactSource;
    summary: string;
    evidence_reference_ids: string[];
    created_at: number;
    updated_at: number;
}

export interface PilotExternalArtifactIntakeRecord {
    intake_id: string;
    workspace_key: string;
    package_id?: string;
    artifact_kind: PilotExternalArtifactKind;
    source: PilotArtifactSource;
    summary: string;
    uri?: string;
    submitted_by_role?: ActorRole;
    submitted_by_enterprise_role?: EnterpriseRole;
    submitted_by_label?: string;
    actor_role?: ActorRole;
    actor_id?: string;
    actor_label?: string;
    provisioning_state?: PilotProvisioningState;
    access_state?: PilotAccessGrantState;
    evidence_category?: PilotEvidenceCategory;
    environment_kind?: EnvironmentKind;
    environment_label?: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    connector_id?: string;
    verification_status: PilotExternalArtifactVerificationStatus;
    verification_summary?: string;
    rejection_reason?: string;
    reviewed_by?: string;
    reviewed_by_enterprise_role?: EnterpriseRole;
    promoted_record_ids: string[];
    created_at: number;
    updated_at: number;
    verified_at?: number;
    promoted_at?: number;
}

export interface PilotEvidenceArtifactRecord {
    artifact_id: string;
    workspace_key: string;
    category: PilotEvidenceCategory;
    source: PilotArtifactSource;
    summary: string;
    uri?: string;
    actor_role?: ActorRole;
    accepted_as_real_pilot_evidence: boolean;
    rejection_reason?: string;
    created_at: number;
    updated_at: number;
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

export interface PilotEvidenceReference {
    artifact_id: string;
    category: PilotEvidenceCategory;
    source: PilotArtifactSource;
    summary: string;
    uri?: string;
    accepted_as_real_pilot_evidence: boolean;
    rejection_reason?: string;
    created_at: number;
}

export interface PilotEvidenceCategoryStatus {
    category: PilotEvidenceCategory;
    state: DependencyReadinessState;
    summary: string;
    real_evidence_count: number;
    latest_reference?: PilotEvidenceReference;
}

export interface PilotActivationChecklistItem {
    item_id: string;
    code: string;
    title: string;
    owner_type: PilotActivationOwnerType;
    owner_label: string;
    state: DependencyReadinessState;
    requirement_status?: PilotActivationRequirementStatus;
    package_id?: string;
    missing_artifact: string;
    next_action: string;
    actor_role?: ActorRole;
    evidence_category?: PilotEvidenceCategory;
    linked_intake_ids?: string[];
    evidence_references: PilotEvidenceReference[];
}

export interface PilotActivationBlockerSummary {
    code: string;
    owner_type: PilotActivationOwnerType;
    owner_label: string;
    summary: string;
    missing_artifact: string;
    next_action: string;
    evidence_references: PilotEvidenceReference[];
}

export interface PilotActivationPackageSummary {
    package_id: string;
    status: PilotActivationPackageStatus;
    owner_type: PilotActivationOwnerType;
    owner_label: string;
    summary: string;
    handoff_note?: string;
    due_at?: number;
    pending_requirement_count: number;
    rejected_intake_count: number;
    recent_intakes: PilotExternalArtifactIntakeRecord[];
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
    demo: ProductShellDemoSummary;
    activation_package: PilotActivationPackageSummary;
    activation_checklist: PilotActivationChecklistItem[];
    remaining_blockers: PilotActivationBlockerSummary[];
    evidence_categories: PilotEvidenceCategoryStatus[];
    trial_workspace?: TrialWorkspaceSummary;
    oa_shell?: {
        active_role: EnterpriseOARole;
        active_module: EnterpriseOAModule;
    };
    next_action: string;
}

export interface TaskCreateInput {
    graph: TaskGraph;
}

export type { PolicyContext, PolicyDecision };

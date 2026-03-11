import type {
    ActorAvailabilitySummary,
    ActorRole,
    ConnectorReadinessSummary,
    DependencyReadinessState,
    EnvironmentActivationSummary,
    EnvironmentKind,
    EnterpriseRole,
    IdentityReadinessSummary,
    LocalRoleLabActorSummary,
    LocalRoleLabHandoffStep,
    LocalRoleLabSummary,
    PilotActivationPackageRecord,
    PilotActivationPackageStatus,
    PilotActivationBlockerSummary,
    PilotActivationChecklistItem,
    PilotActivationOwnerType,
    PilotActivationRequirementStatus,
    PilotActorReadinessRecord,
    PilotArtifactSource,
    PilotConnectorActivationRecord,
    PilotEvidenceArtifactRecord,
    PilotEvidenceCategory,
    PilotEvidenceCategoryStatus,
    PilotEvidenceReference,
    PilotEnvironmentBindingRecord,
    PilotExternalArtifactIntakeRecord,
    PilotExternalArtifactKind,
    PilotActivationStatus,
    PilotActivationPackageSummary,
    PolicyStudioSummary,
    ProductShellDemoSummary,
    ProductShellSummary,
    RequesterInboxGroup,
    RequesterInboxItem,
    RequesterInboxSummary,
    TaskSnapshot,
    TaskStatus,
    TenantAdminActivationSummary,
    VaultReadinessSummary,
    WorkspaceBindingKind,
    WorkspaceMode,
    WorkspaceModeOptionSummary,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { AgentKernelDeploymentBaselineService } from './deployment.js';
import { resolvePilotIdentityProviderConfigFromEnv } from './identityAdmin.js';
import { resolvePilotVaultWebhookConfigFromEnv } from './vaultWebhook.js';
import { getPolicyEngineMetadata } from '../policy-engine/evaluator.js';

const SIMULATOR_BASE_URL = 'https://lumi-agent-simulator.vercel.app';
const DEFAULT_DEMO_SCENARIOS = [
    'Pre-meeting prep in progress',
    'Post-meeting notes to CRM-ready draft completed',
    'Compliance handoff blocked on activation requirement',
] as const;
const DEFAULT_LOCAL_ROLE_LAB_ACTORS = [
    {
        actor_id: 'local_requester_01',
        role: 'REQUESTER' as const,
        actor_label: 'Local Requester',
        session_id: 'lab_sess_requester_01',
        summary: 'Submit and review tasks from the requester perspective in a non-pilot local lab.',
    },
    {
        actor_id: 'local_operator_01',
        role: 'OPERATOR' as const,
        actor_label: 'Local Operator',
        session_id: 'lab_sess_operator_01',
        summary: 'Triage blocked and waiting tasks from the operator perspective in a non-pilot local lab.',
    },
    {
        actor_id: 'local_tenant_admin_01',
        role: 'TENANT_ADMIN' as const,
        actor_label: 'Local Tenant Admin',
        session_id: 'lab_sess_tenant_admin_01',
        summary: 'Review readiness, approvals, and activation blockers from the tenant-admin perspective in a non-pilot local lab.',
    },
] as const;

export interface AgentKernelProductShellServiceOptions {
    now?: () => number;
}

export interface ProductShellQuery {
    taskId?: string;
    workspaceMode?: WorkspaceMode;
    labActorId?: string;
}

export interface RegisterPilotActorReadinessInput {
    workspaceMode?: WorkspaceMode;
    role: ActorRole;
    actorId?: string;
    actorLabel?: string;
    source: PilotArtifactSource;
    provisioningState?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    accessState?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    note?: string;
    evidenceReferenceIds?: string[];
}

export interface RegisterPilotEvidenceArtifactInput {
    workspaceMode?: WorkspaceMode;
    category: PilotEvidenceCategory;
    source: PilotArtifactSource;
    summary: string;
    uri?: string;
    actorRole?: ActorRole;
}

export interface RegisterPilotEnvironmentBindingInput {
    workspaceMode?: WorkspaceMode;
    environmentKind: EnvironmentKind;
    environmentLabel: string;
    baseUrl?: string;
    tenantId?: string;
    workspaceId?: string;
    source: PilotArtifactSource;
    summary?: string;
}

export interface RegisterPilotConnectorActivationInput {
    workspaceMode?: WorkspaceMode;
    connectorId: string;
    source: PilotArtifactSource;
    summary?: string;
}

export interface RegisterPilotActivationPackageHandoffInput {
    workspaceMode?: WorkspaceMode;
    ownerType: PilotActivationOwnerType;
    ownerLabel?: string;
    summary?: string;
    handoffNote?: string;
    dueAt?: number;
}

export interface SubmitPilotExternalArtifactIntakeInput {
    workspaceMode?: WorkspaceMode;
    artifactKind: PilotExternalArtifactKind;
    source: PilotArtifactSource;
    summary: string;
    uri?: string;
    submittedByRole?: ActorRole;
    submittedByEnterpriseRole?: EnterpriseRole;
    submittedByLabel?: string;
    actorRole?: ActorRole;
    actorId?: string;
    actorLabel?: string;
    provisioningState?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    accessState?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    evidenceCategory?: PilotEvidenceCategory;
    environmentKind?: EnvironmentKind;
    environmentLabel?: string;
    baseUrl?: string;
    tenantId?: string;
    workspaceId?: string;
    connectorId?: string;
}

export interface ReviewPilotExternalArtifactIntakeInput {
    workspaceMode?: WorkspaceMode;
    intakeId: string;
    decision: 'VERIFY' | 'REJECT' | 'PROMOTE' | 'REQUEST_EVIDENCE' | 'HAND_BACK';
    reviewedBy?: string;
    reviewedByEnterpriseRole?: EnterpriseRole;
    verificationNote?: string;
}

function currentTime(): number {
    return Date.now();
}

function normalizeUrl(value: string | undefined): string | undefined {
    const trimmed = String(value || '').trim();
    if (!trimmed) return undefined;
    return trimmed.replace(/\/+$/, '');
}

function readEnv(...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = String(process.env[key] || '').trim();
        if (value) return value;
    }
    return undefined;
}

function readBooleanEnv(keys: string[], fallback: boolean): boolean {
    const value = readEnv(...keys);
    if (!value) return fallback;
    const normalized = value.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function resolveBaseUrl(): { baseUrl?: string; source?: string } {
    const envBase = normalizeUrl(readEnv('LUMI_API_BASE_URL', 'LUMI_BASE_URL'));
    if (envBase) return { baseUrl: envBase, source: 'env' };

    const explicitAppUrl = normalizeUrl(readEnv('APP_URL', 'URL'));
    if (explicitAppUrl) return { baseUrl: explicitAppUrl, source: 'app_url' };

    const vercelUrl = normalizeUrl(readEnv('VERCEL_URL'));
    if (vercelUrl) {
        const normalized = /^https?:\/\//i.test(vercelUrl) ? vercelUrl : `https://${vercelUrl}`;
        return { baseUrl: normalized, source: 'vercel_url' };
    }

    return { baseUrl: SIMULATOR_BASE_URL, source: 'default_simulator' };
}

function normalizeWorkspaceMode(raw: unknown): WorkspaceMode {
    const normalized = String(raw || '').trim().toLowerCase();
    if (normalized === 'demo') return 'demo';
    if (normalized === 'local_lab') return 'local_lab';
    return 'current';
}

function normalizeEnvironmentKind(raw: string | undefined): EnvironmentKind | undefined {
    const normalized = String(raw || '').trim().toUpperCase();
    if (normalized === 'SIMULATOR') return 'SIMULATOR';
    if (normalized === 'DEMO') return 'DEMO';
    if (normalized === 'PILOT') return 'PILOT';
    if (normalized === 'PRODUCTION') return 'PRODUCTION';
    return undefined;
}

function inferEnvironmentKind(
    explicitKind: EnvironmentKind | undefined,
    baseUrl: string | undefined,
    workspaceMode: WorkspaceMode,
): EnvironmentKind {
    if (explicitKind) return explicitKind;
    if (String(baseUrl || '').toLowerCase().includes('lumi-agent-simulator')) return 'SIMULATOR';
    if (workspaceMode === 'demo') return 'DEMO';
    return 'PRODUCTION';
}

function workspaceBindingKindFor(
    workspaceMode: WorkspaceMode,
    tenantId: string | undefined,
    workspaceId: string | undefined,
): WorkspaceBindingKind {
    if (workspaceMode === 'demo') return 'DEMO_WORKSPACE';
    if (workspaceMode === 'local_lab') return 'LOCAL_ROLE_LAB_WORKSPACE';
    if (tenantId && workspaceId) return 'TENANT_WORKSPACE';
    return 'UNBOUND';
}

function environmentLabelFor(
    kind: EnvironmentKind,
    workspaceMode: WorkspaceMode,
    simulatorBacking: boolean,
    explicitLabel: string | undefined,
): string {
    if (workspaceMode === 'demo') {
        return simulatorBacking ? 'Demo workspace (simulator-backed)' : 'Demo workspace';
    }
    if (workspaceMode === 'local_lab') {
        return simulatorBacking ? 'Local role lab (simulator-backed)' : 'Local role lab';
    }
    if (explicitLabel) return explicitLabel;
    switch (kind) {
    case 'SIMULATOR':
        return 'Simulator workspace';
    case 'DEMO':
        return 'Demo workspace';
    case 'PILOT':
        return 'Pilot workspace';
    case 'PRODUCTION':
        return 'Production workspace';
    default:
        return 'Environment';
    }
}

function isConcreteActorValue(raw: string | undefined): boolean {
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) return false;
    return ![
        'demo_user',
        'demo-requester',
        'demo_operator',
        'demo-admin',
        'local-user',
        'local_operator',
        'pilot-operator-lead',
        'tenant-admin',
        'requester',
        'operator',
        'admin',
        'mock',
        'test',
        'simulator',
    ].includes(normalized);
}

function actorSummary(
    role: ActorRole,
    workspaceMode: WorkspaceMode,
    actorId: string | undefined,
    actorLabel: string | undefined,
    missingCode: string,
    missingSummary: string,
    demoLabel: string,
): ActorAvailabilitySummary {
    if (workspaceMode === 'demo') {
        return {
            role,
            state: 'DEMO_ONLY',
            provisioning_state: 'DEMO_ONLY',
            access_state: 'DEMO_ONLY',
            actor_id: `demo:${role.toLowerCase()}`,
            actor_label: demoLabel,
            summary: `${demoLabel} is available for demo walkthroughs only.`,
            is_demo_data: true,
            is_pilot_evidence: false,
        };
    }

    if (isConcreteActorValue(actorId) || isConcreteActorValue(actorLabel)) {
        return {
            role,
            state: 'READY',
            provisioning_state: 'PROVISIONED',
            access_state: 'GRANTED',
            actor_id: actorId,
            actor_label: actorLabel,
            summary: `${role.toLowerCase().replace('_', ' ')} actor is configured.`,
            is_demo_data: false,
            is_pilot_evidence: true,
        };
    }

    return {
        role,
        state: 'MISSING',
        provisioning_state: 'UNPROVISIONED',
        access_state: 'NOT_GRANTED',
        actor_id: actorId,
        actor_label: actorLabel,
        summary: missingSummary,
        missing_dependency_code: missingCode,
        is_demo_data: false,
        is_pilot_evidence: false,
    };
}

function statusGroupFor(taskStatus: TaskStatus): RequesterInboxGroup {
    switch (taskStatus) {
    case 'WAITING_USER':
        return 'WAITING';
    case 'DONE':
        return 'COMPLETED';
    case 'FAILED':
    case 'CANCELLED':
        return 'BLOCKED';
    default:
        return 'IN_PROGRESS';
    }
}

function findBlockerSummary(snapshot: TaskSnapshot): string | undefined {
    if (snapshot.task_state.current_wait?.prompt?.summary) {
        return snapshot.task_state.current_wait.prompt.summary;
    }
    const failedNode = snapshot.node_states.find((node) => node.status === 'FAILED' && node.error?.message);
    if (failedNode?.error?.message) return failedNode.error.message;
    return undefined;
}

function buildReceiptSummary(snapshot: TaskSnapshot): string {
    const total = snapshot.node_states.length;
    const succeeded = snapshot.node_states.filter((node) => node.status === 'SUCCEEDED').length;
    const running = snapshot.node_states.filter((node) => node.status === 'RUNNING').length;
    if (snapshot.task_state.status === 'DONE') return `${succeeded}/${total} steps completed`;
    if (snapshot.task_state.status === 'WAITING_USER') return 'Waiting for user or approval action';
    if (snapshot.task_state.status === 'FAILED') return 'Execution failed before completion';
    if (snapshot.task_state.status === 'CANCELLED') return 'Execution was cancelled';
    if (running > 0) return `${running} step(s) currently running`;
    return `${succeeded}/${total} steps executed so far`;
}

function seededDemoInboxItems(nowMs: number): RequesterInboxItem[] {
    return [
        {
            task_id: 'demo_task_pre_meeting_prep',
            correlation_id: 'demo_corr_pre_meeting_prep',
            goal: 'Prepare advisor pre-meeting brief',
            task_status: 'RUNNING',
            group: 'IN_PROGRESS',
            summary: 'Collecting account context, prior notes, and agenda inputs.',
            receipt_summary: '2/4 demo steps complete',
            updated_at: nowMs - 15 * 60 * 1000,
            workspace_binding_kind: 'DEMO_WORKSPACE',
            environment_kind: 'DEMO',
            is_demo_data: true,
            is_pilot_evidence: false,
        },
        {
            task_id: 'demo_task_crm_ready_draft',
            correlation_id: 'demo_corr_crm_ready_draft',
            goal: 'Convert post-meeting notes into CRM-ready draft',
            task_status: 'DONE',
            group: 'COMPLETED',
            summary: 'Draft completed with evidence-backed next actions.',
            receipt_summary: 'CRM-ready draft verified (demo)',
            updated_at: nowMs - 45 * 60 * 1000,
            workspace_binding_kind: 'DEMO_WORKSPACE',
            environment_kind: 'DEMO',
            is_demo_data: true,
            is_pilot_evidence: false,
        },
        {
            task_id: 'demo_task_compliance_handoff',
            correlation_id: 'demo_corr_compliance_handoff',
            goal: 'Prepare compliance handoff package',
            task_status: 'WAITING_USER',
            group: 'WAITING',
            summary: 'Handoff package assembled and waiting for activation approval.',
            blocker_summary: 'Demo scenario intentionally blocks handoff until tenant activation requirements are met.',
            receipt_summary: 'Approval gate waiting (demo)',
            updated_at: nowMs - 5 * 60 * 1000,
            workspace_binding_kind: 'DEMO_WORKSPACE',
            environment_kind: 'DEMO',
            is_demo_data: true,
            is_pilot_evidence: false,
        },
    ];
}

function localRoleLabActors(activeActorId: string | undefined): LocalRoleLabActorSummary[] {
    const resolvedActiveActorId = DEFAULT_LOCAL_ROLE_LAB_ACTORS.some((actor) => actor.actor_id === activeActorId)
        ? activeActorId
        : 'local_tenant_admin_01';
    return DEFAULT_LOCAL_ROLE_LAB_ACTORS.map((actor) => ({
        actor_id: actor.actor_id,
        role: actor.role,
        actor_label: actor.actor_label,
        session_id: actor.session_id,
        summary: actor.summary,
        is_active: actor.actor_id === resolvedActiveActorId,
        is_demo_data: false,
        is_pilot_evidence: false,
    }));
}

function activeLocalRoleLabActor(activeActorId: string | undefined): LocalRoleLabActorSummary {
    return localRoleLabActors(activeActorId).find((actor) => actor.is_active) || localRoleLabActors(undefined)[0]!;
}

function seededLocalRoleLabInboxItems(
    nowMs: number,
    activeActor: LocalRoleLabActorSummary,
): RequesterInboxItem[] {
    const common = {
        workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE' as const,
        environment_kind: 'SIMULATOR' as const,
        is_demo_data: false,
        is_pilot_evidence: false,
        actor_role: activeActor.role,
        actor_label: activeActor.actor_label,
    };
    switch (activeActor.role) {
    case 'REQUESTER':
        return [
            {
                task_id: 'lab_task_requester_prep',
                correlation_id: 'lab_corr_requester_prep',
                goal: 'Prepare advisor pre-meeting brief',
                task_status: 'RUNNING' as const,
                group: 'IN_PROGRESS' as const,
                summary: 'Requester submitted the brief and is waiting for operator consolidation.',
                receipt_summary: 'Requester sees current progress only',
                updated_at: nowMs - 12 * 60 * 1000,
                ...common,
            },
            {
                task_id: 'lab_task_requester_blocked',
                correlation_id: 'lab_corr_requester_blocked',
                goal: 'Send compliance handoff package',
                task_status: 'WAITING_USER' as const,
                group: 'WAITING' as const,
                summary: 'Requester is waiting for tenant-admin acknowledgement before handoff continues.',
                blocker_summary: 'Tenant-admin acknowledgement missing in local role lab rehearsal.',
                receipt_summary: 'Approval gate waiting (local role lab)',
                updated_at: nowMs - 4 * 60 * 1000,
                ...common,
            },
        ];
    case 'OPERATOR':
        return [
            {
                task_id: 'lab_task_operator_triage',
                correlation_id: 'lab_corr_operator_triage',
                goal: 'Review CRM-ready draft before compliance handoff',
                task_status: 'RUNNING' as const,
                group: 'IN_PROGRESS' as const,
                summary: 'Operator is validating evidence completeness and drafting the receipt.',
                receipt_summary: 'Operator review in progress',
                updated_at: nowMs - 8 * 60 * 1000,
                ...common,
            },
            {
                task_id: 'lab_task_operator_waiting',
                correlation_id: 'lab_corr_operator_waiting',
                goal: 'Route compliance handoff after admin check',
                task_status: 'WAITING_USER' as const,
                group: 'WAITING' as const,
                summary: 'Operator is blocked on tenant-admin readiness confirmation.',
                blocker_summary: 'Tenant-admin confirmation required before connector handoff.',
                receipt_summary: 'Waiting on admin confirmation (local role lab)',
                updated_at: nowMs - 3 * 60 * 1000,
                ...common,
            },
        ];
    case 'TENANT_ADMIN':
    default:
        return [
            {
                task_id: 'lab_task_admin_activation',
                correlation_id: 'lab_corr_admin_activation',
                goal: 'Review activation blockers for advisor workflow rehearsal',
                task_status: 'FAILED' as const,
                group: 'BLOCKED' as const,
                summary: 'Tenant admin sees the local role lab blocked from real pilot evidence by design.',
                blocker_summary: 'Local role lab is rehearsal-only and cannot satisfy real pilot activation.',
                receipt_summary: 'Non-pilot rehearsal surface',
                updated_at: nowMs - 6 * 60 * 1000,
                ...common,
            },
            {
                task_id: 'lab_task_admin_complete',
                correlation_id: 'lab_corr_admin_complete',
                goal: 'Acknowledge local multi-actor rehearsal checklist',
                task_status: 'DONE' as const,
                group: 'COMPLETED' as const,
                summary: 'Tenant admin completed the local rehearsal acknowledgment step.',
                receipt_summary: 'Checklist acknowledged (local role lab)',
                updated_at: nowMs - 25 * 60 * 1000,
                ...common,
            },
        ];
    }
}

function localRoleLabSummary(activeActorId: string | undefined): LocalRoleLabSummary {
    const actors = localRoleLabActors(activeActorId);
    const activeActor = actors.find((actor) => actor.is_active) || actors[0]!;
    const handoffTimeline: LocalRoleLabHandoffStep[] = [
        {
            step_id: 'requester_to_operator',
            from_role: 'REQUESTER' as const,
            to_role: 'OPERATOR' as const,
            title: 'Requester submits brief',
            summary: 'Requester creates the initial advisor brief and hands context to the operator seat.',
            status: activeActor.role === 'REQUESTER' ? 'ACTIVE' as const : 'COMPLETED' as const,
        },
        {
            step_id: 'operator_to_tenant_admin',
            from_role: 'OPERATOR' as const,
            to_role: 'TENANT_ADMIN' as const,
            title: 'Operator validates handoff package',
            summary: 'Operator checks evidence completeness and prepares the approval-facing handoff packet.',
            status: activeActor.role === 'OPERATOR'
                ? 'ACTIVE' as const
                : activeActor.role === 'TENANT_ADMIN'
                    ? 'COMPLETED' as const
                    : 'PENDING' as const,
        },
        {
            step_id: 'tenant_admin_ack',
            from_role: 'TENANT_ADMIN' as const,
            title: 'Tenant admin reviews activation gap',
            summary: 'Tenant admin confirms the rehearsal state, sees the non-pilot evidence boundary, and decides what is still missing for a real pilot.',
            status: activeActor.role === 'TENANT_ADMIN' ? 'ACTIVE' as const : 'PENDING' as const,
        },
    ];
    return {
        enabled: true,
        label: 'Local role lab',
        summary: 'One human can rehearse requester, operator, and tenant-admin collaboration locally without claiming pilot activation.',
        active_actor_id: activeActor.actor_id,
        active_role: activeActor.role,
        day_zero_blocked_summary: 'True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.',
        scenario: {
            scenario_id: 'advisor_handoff_rehearsal',
            title: 'Advisor workflow rehearsal',
            summary: 'Walk one advisor workflow through requester submission, operator validation, and tenant-admin acknowledgement.',
            current_stage: handoffTimeline.find((step) => step.status === 'ACTIVE')?.title || 'Requester submits brief',
            focus_points: [
                'Keep active role visible at all times',
                'Show blocked versus waiting transitions clearly',
                'Make the non-pilot evidence boundary obvious',
            ],
        },
        handoff_timeline: handoffTimeline,
        evidence_classification_summary: 'All local role lab artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.',
        pilot_activation_gap_summary: 'A real pilot still needs a real environment binding, real operator access, a named requester, a tenant-admin/support touchpoint, and the first real task/session/run artifact.',
        actors,
        is_demo_data: false,
        is_pilot_evidence: false,
    };
}

function workspaceKey(tenantId: string | undefined, workspaceId: string | undefined, workspaceMode: WorkspaceMode): string {
    return `${workspaceMode}:${tenantId || 'unbound'}:${workspaceId || 'unbound'}`;
}

function acceptedRealPilotSource(source: PilotArtifactSource, workspaceMode: WorkspaceMode): boolean {
    return workspaceMode !== 'demo' && workspaceMode !== 'local_lab' && source === 'REAL_PILOT';
}

function toEvidenceReference(record: PilotEvidenceArtifactRecord): PilotEvidenceReference {
    return {
        artifact_id: record.artifact_id,
        category: record.category,
        source: record.source,
        summary: record.summary,
        uri: record.uri,
        accepted_as_real_pilot_evidence: record.accepted_as_real_pilot_evidence,
        rejection_reason: record.rejection_reason,
        created_at: record.created_at,
    };
}

function ownerLabel(ownerType: PilotActivationOwnerType): string {
    switch (ownerType) {
    case 'PILOT_COMMANDER':
        return 'Pilot commander';
    case 'REQUESTER_OWNER':
        return 'Requester owner';
    case 'OPERATOR_OWNER':
        return 'Pilot operator lead';
    case 'TENANT_ADMIN_OWNER':
        return 'Tenant admin';
    default:
        return 'Owner';
    }
}

function packageIdForWorkspace(workspaceKeyValue: string): string {
    return `pilot_activation_package_${workspaceKeyValue.replace(/[^a-z0-9]+/gi, '_')}`;
}

function latestActorReadinessByRole(records: PilotActorReadinessRecord[]): Map<ActorRole, PilotActorReadinessRecord> {
    const map = new Map<ActorRole, PilotActorReadinessRecord>();
    for (const record of records.sort((a, b) => b.updated_at - a.updated_at)) {
        if (!map.has(record.role)) {
            map.set(record.role, record);
        }
    }
    return map;
}

function actorSummaryFromRecord(record: PilotActorReadinessRecord): ActorAvailabilitySummary {
    return {
        role: record.role,
        state: record.state,
        provisioning_state: record.provisioning_state,
        access_state: record.access_state,
        actor_id: record.actor_id,
        actor_label: record.actor_label,
        summary: record.note || `${record.role.toLowerCase().replace('_', ' ')} readiness recorded.`,
        missing_dependency_code: record.state === 'READY' || record.state === 'DEMO_ONLY'
            ? undefined
            : `${record.role.toLowerCase()}_readiness_blocked`,
        is_demo_data: record.source !== 'REAL_PILOT',
        is_pilot_evidence: record.source === 'REAL_PILOT' && record.state === 'READY',
    };
}

function buildEvidenceCategoryStatuses(
    records: PilotEvidenceArtifactRecord[],
): PilotEvidenceCategoryStatus[] {
    const categories: PilotEvidenceCategory[] = [
        'DEVICE_SESSION_PROOF',
        'WORKFLOW_ARTIFACT_PROOF',
        'CONNECTOR_CREDENTIAL_PROOF',
        'TENANT_ADMIN_SUPPORT_PROOF',
        'STABILITY_SAFETY_PROOF',
    ];
    return categories.map((category) => {
        const matching = records.filter((record) => record.category === category);
        const realMatches = matching.filter((record) => record.accepted_as_real_pilot_evidence);
        const latest = matching.sort((a, b) => b.updated_at - a.updated_at)[0];
        const state: DependencyReadinessState = realMatches.length > 0
            ? 'READY'
            : matching.some((record) => record.source === 'DEMO')
                ? 'DEMO_ONLY'
                : matching.length > 0
                    ? 'BLOCKED'
                    : 'MISSING';
        const summary = realMatches.length > 0
            ? `${category.toLowerCase().replace(/_/g, ' ')} advanced with real pilot evidence.`
            : latest?.rejection_reason
                ? latest.rejection_reason
                : `No accepted real pilot evidence for ${category.toLowerCase().replace(/_/g, ' ')}.`;
        return {
            category,
            state,
            summary,
            real_evidence_count: realMatches.length,
            latest_reference: latest ? toEvidenceReference(latest) : undefined,
        };
    });
}

function requirementStatusFor(
    item: PilotActivationChecklistItem,
    relevantIntakes: PilotExternalArtifactIntakeRecord[],
): PilotActivationRequirementStatus {
    const latest = relevantIntakes.sort((a, b) => b.updated_at - a.updated_at)[0];
    if (item.state === 'READY') return 'PROMOTED';
    if (latest?.verification_status === 'PROMOTED') return 'PROMOTED';
    if (latest?.verification_status === 'VERIFIED') return 'VERIFIED';
    if (latest?.verification_status === 'REJECTED') return 'REJECTED';
    if (
        latest?.verification_status === 'RECEIVED'
        || latest?.verification_status === 'EVIDENCE_REQUESTED'
        || latest?.verification_status === 'HANDED_BACK'
    ) {
        return 'RECEIVED';
    }
    if (item.state === 'BLOCKED') return 'BLOCKED';
    return 'PENDING';
}

function packageStatusFor(params: {
    environment: EnvironmentActivationSummary;
    checklist: PilotActivationChecklistItem[];
    intakes: PilotExternalArtifactIntakeRecord[];
    evidenceCategories: PilotEvidenceCategoryStatus[];
}): PilotActivationPackageStatus {
    if (params.environment.workspace_mode === 'demo') return 'HANDOFF_REQUIRED';
    if (params.environment.activation_ready && params.evidenceCategories.every((item) => item.state === 'READY')) {
        return 'ACTIVATION_READY';
    }
    if (params.intakes.some((item) => item.verification_status === 'REJECTED')) {
        return 'BLOCKED';
    }
    if (params.intakes.some((item) => item.verification_status === 'VERIFIED')) {
        return 'VERIFICATION_PENDING';
    }
    if (
        params.intakes.length > 0
        || params.checklist.some((item) =>
            item.requirement_status === 'PROMOTED'
            || item.requirement_status === 'RECEIVED'
            || item.requirement_status === 'VERIFIED'
        )
    ) {
        return 'IN_PROGRESS';
    }
    return 'HANDOFF_REQUIRED';
}

function summarizePackageStatus(
    status: PilotActivationPackageStatus,
    nextAction: string,
): string {
    switch (status) {
    case 'ACTIVATION_READY':
        return 'External activation package is fully promoted and ready for real pilot evidence intake.';
    case 'BLOCKED':
        return 'External activation package is blocked by rejected or missing activation artifacts.';
    case 'VERIFICATION_PENDING':
        return 'External activation package has received artifacts waiting for verification or promotion.';
    case 'IN_PROGRESS':
        return 'External activation package is in progress and waiting for more verified external artifacts.';
    case 'HANDOFF_REQUIRED':
    default:
        return `External activation handoff is still required. ${nextAction}`;
    }
}

function intakeMatchesChecklist(
    item: PilotActivationChecklistItem,
    intake: PilotExternalArtifactIntakeRecord,
): boolean {
    switch (item.code) {
    case 'pilot_environment_binding':
        return intake.artifact_kind === 'ENVIRONMENT_BINDING';
    case 'requester_actor':
        return intake.artifact_kind === 'ACTOR_READINESS' && intake.actor_role === 'REQUESTER';
    case 'operator_actor':
        return intake.artifact_kind === 'ACTOR_READINESS' && intake.actor_role === 'OPERATOR';
    case 'tenant_admin_actor':
        return intake.artifact_kind === 'ACTOR_READINESS' && intake.actor_role === 'TENANT_ADMIN';
    case 'connector_readiness':
        return intake.artifact_kind === 'CONNECTOR_ELIGIBILITY';
    case 'device_session_proof':
        return intake.artifact_kind === 'REAL_EVIDENCE' && intake.evidence_category === 'DEVICE_SESSION_PROOF';
    case 'workflow_artifact_proof':
        return intake.artifact_kind === 'REAL_EVIDENCE' && intake.evidence_category === 'WORKFLOW_ARTIFACT_PROOF';
    case 'connector_credential_proof':
        return intake.artifact_kind === 'REAL_EVIDENCE' && intake.evidence_category === 'CONNECTOR_CREDENTIAL_PROOF';
    case 'tenant_admin_support_proof':
        return intake.artifact_kind === 'REAL_EVIDENCE' && intake.evidence_category === 'TENANT_ADMIN_SUPPORT_PROOF';
    case 'stability_safety_proof':
        return intake.artifact_kind === 'REAL_EVIDENCE' && intake.evidence_category === 'STABILITY_SAFETY_PROOF';
    default:
        return false;
    }
}

function checklistItem(
    item_id: string,
    code: string,
    title: string,
    owner_type: PilotActivationOwnerType,
    state: DependencyReadinessState,
    missing_artifact: string,
    next_action: string,
    options?: {
        actor_role?: ActorRole;
        evidence_category?: PilotEvidenceCategory;
        requirement_status?: PilotActivationRequirementStatus;
        package_id?: string;
        linked_intake_ids?: string[];
        evidence_references?: PilotEvidenceReference[];
    }
): PilotActivationChecklistItem {
    return {
        item_id,
        code,
        title,
        owner_type,
        owner_label: ownerLabel(owner_type),
        state,
        requirement_status: options?.requirement_status,
        package_id: options?.package_id,
        missing_artifact,
        next_action,
        actor_role: options?.actor_role,
        evidence_category: options?.evidence_category,
        linked_intake_ids: options?.linked_intake_ids || [],
        evidence_references: options?.evidence_references || [],
    };
}

function blockerFromChecklist(item: PilotActivationChecklistItem): PilotActivationBlockerSummary {
    return {
        code: item.code,
        owner_type: item.owner_type,
        owner_label: item.owner_label,
        summary: item.title,
        missing_artifact: item.missing_artifact,
        next_action: item.next_action,
        evidence_references: item.evidence_references,
    };
}

function acceptedRealBindingSource(source: PilotArtifactSource, workspaceMode: WorkspaceMode): boolean {
    return workspaceMode !== 'demo' && workspaceMode !== 'local_lab' && source === 'REAL_PILOT';
}

export class AgentKernelProductShellService {
    private readonly now: () => number;

    constructor(
        private readonly store: TaskStore,
        private readonly deploymentService: AgentKernelDeploymentBaselineService,
        options?: AgentKernelProductShellServiceOptions,
    ) {
        this.now = options?.now || currentTime;
    }

    async summarizeEnvironment(input?: ProductShellQuery): Promise<EnvironmentActivationSummary> {
        const workspaceMode = normalizeWorkspaceMode(input?.workspaceMode);
        const nowMs = this.now();
        const explicitKind = normalizeEnvironmentKind(readEnv('LUMI_ENVIRONMENT_KIND', 'AGENT_KERNEL_ENVIRONMENT_KIND'));
        const explicitLabel = readEnv('LUMI_ENVIRONMENT_LABEL', 'AGENT_KERNEL_ENVIRONMENT_LABEL');
        const tenantId = readEnv('LUMI_TENANT_ID', 'AGENT_KERNEL_PILOT_TENANT_ID');
        const workspaceId = readEnv('LUMI_WORKSPACE_ID', 'AGENT_KERNEL_WORKSPACE_ID', 'AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID');
        const demoSupported = readBooleanEnv(['LUMI_DEMO_MODE_ENABLED', 'AGENT_KERNEL_DEMO_MODE_ENABLED'], true);
        const { baseUrl, source } = resolveBaseUrl();
        const simulatorBacking = String(baseUrl || '').toLowerCase().includes('lumi-agent-simulator');
        const environmentKind = inferEnvironmentKind(explicitKind, baseUrl, workspaceMode);
        const workspaceBindingKind = workspaceBindingKindFor(workspaceMode, tenantId, workspaceId);
        const environmentLabel = environmentLabelFor(environmentKind, workspaceMode, simulatorBacking, explicitLabel);
        const resolvedTenantId = workspaceMode === 'demo' ? 'demo-tenant' : tenantId;
        const resolvedWorkspaceId = workspaceMode === 'demo' ? 'demo-workspace' : workspaceId;
        if (workspaceMode === 'local_lab') {
            const labSummary = localRoleLabSummary(input?.labActorId);
            const workspaceOptions: WorkspaceModeOptionSummary[] = [
                {
                    mode: 'current',
                    label: 'Current workspace',
                    selected: false,
                    workspace_binding_kind: workspaceBindingKindFor('current', tenantId, workspaceId),
                    environment_kind: inferEnvironmentKind(explicitKind, baseUrl, 'current'),
                    description: simulatorBacking
                        ? 'Uses the current simulator-backed environment binding.'
                        : 'Uses the current environment binding.',
                },
                {
                    mode: 'demo',
                    label: 'Demo workspace',
                    selected: false,
                    workspace_binding_kind: 'DEMO_WORKSPACE',
                    environment_kind: simulatorBacking ? 'SIMULATOR' : 'DEMO',
                    description: 'Uses seeded demo data that is always labeled non-pilot.',
                },
                {
                    mode: 'local_lab',
                    label: 'Local role lab',
                    selected: true,
                    workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
                    environment_kind: simulatorBacking ? 'SIMULATOR' : environmentKind,
                    description: 'Lets one human rehearse requester/operator/tenant-admin collaboration locally.',
                },
            ];
            const activeActor = labSummary.actors.find((actor) => actor.is_active) || labSummary.actors[0]!;
            return {
                generated_at: nowMs,
                environment_kind: simulatorBacking ? 'SIMULATOR' : environmentKind,
                environment_label: environmentLabel,
                workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
                workspace_mode: 'local_lab',
                tenant_id: 'local-role-lab-tenant',
                workspace_id: 'local-role-lab-workspace',
                pilot_activation_status: 'NOT_APPLICABLE',
                simulator_backing: simulatorBacking,
                demo_mode_enabled: demoSupported,
                base_url: baseUrl,
                base_url_source: source,
                workspace_options: workspaceOptions,
                missing_dependency_codes: [],
                missing_dependency_summaries: [
                    'This is a local multi-actor lab.',
                    'Local role lab never counts as real pilot activation or live pilot evidence.',
                    labSummary.day_zero_blocked_summary,
                ],
                environment_binding: {
                    state: 'BLOCKED',
                    environment_kind: simulatorBacking ? 'SIMULATOR' : environmentKind,
                    environment_label: environmentLabel,
                    base_url: baseUrl,
                    tenant_id: 'local-role-lab-tenant',
                    workspace_id: 'local-role-lab-workspace',
                    summary: 'Local role lab is a rehearsal surface and cannot satisfy real pilot environment binding.',
                    source: 'LOCAL_SYNTHETIC',
                },
                actor_availability: labSummary.actors.map((actor) => ({
                    role: actor.role,
                    state: 'READY',
                    provisioning_state: 'PROVISIONED',
                    access_state: 'GRANTED',
                    actor_id: actor.actor_id,
                    actor_label: actor.actor_label,
                    summary: actor.summary,
                    is_demo_data: false,
                    is_pilot_evidence: false,
                })),
                identity_readiness: {
                    state: 'DEMO_ONLY',
                    summary: 'Local role lab uses local synthetic role sessions and does not claim pilot identity readiness.',
                    issues: [],
                    is_demo_data: false,
                    is_pilot_evidence: false,
                },
                connector_readiness: {
                    state: 'DEMO_ONLY',
                    connector_id: 'pilot_https_webhook',
                    connector_label: 'Approved pilot connector path',
                    summary: 'Local role lab can rehearse connector-adjacent steps but does not activate the real connector path.',
                    issues: [],
                    is_demo_data: false,
                    is_pilot_evidence: false,
                },
                vault_readiness: {
                    state: 'DEMO_ONLY',
                    summary: 'Local role lab does not claim a real vault / credential path.',
                    issues: [],
                    is_demo_data: false,
                    is_pilot_evidence: false,
                },
                connector_activation: {
                    state: 'BLOCKED',
                    connector_id: 'pilot_https_webhook',
                    summary: 'Local role lab never grants real connector eligibility.',
                    source: 'LOCAL_SYNTHETIC',
                },
                activation_ready: false,
                activation_ready_summary: `Local role lab is active for ${activeActor.actor_label} and is rehearsal-only.`,
                is_demo_data: false,
                is_pilot_evidence: false,
            };
        }
        const activationWorkspaceKey = workspaceKey(resolvedTenantId, resolvedWorkspaceId, workspaceMode);
        const environmentBindingRecords = await this.store.listPilotEnvironmentBindings(activationWorkspaceKey);
        const actorRecords = await this.store.listPilotActorReadiness(activationWorkspaceKey);
        const connectorActivationRecords = await this.store.listPilotConnectorActivationRecords(activationWorkspaceKey);
        const latestActorRecords = latestActorReadinessByRole(actorRecords);
        const latestEnvironmentBinding = environmentBindingRecords.sort((a, b) => b.updated_at - a.updated_at)[0];
        const latestConnectorActivation = connectorActivationRecords.sort((a, b) => b.updated_at - a.updated_at)[0];

        let requesterActor = actorSummary(
            'REQUESTER',
            workspaceMode,
            readEnv('LUMI_REQUESTER_ACTOR_ID', 'AGENT_KERNEL_REQUESTER_ACTOR_ID'),
            readEnv('LUMI_REQUESTER_ACTOR_LABEL', 'AGENT_KERNEL_REQUESTER_ACTOR_LABEL'),
            'requester_actor_missing',
            'Missing requester actor',
            'Demo requester'
        );
        let operatorActor = actorSummary(
            'OPERATOR',
            workspaceMode,
            readEnv('LUMI_OPERATOR_ACTOR_ID', 'AGENT_KERNEL_OPERATOR_ACTOR_ID'),
            readEnv('LUMI_OPERATOR_ACTOR_LABEL', 'AGENT_KERNEL_OPERATOR_ACTOR_LABEL'),
            'operator_access_missing',
            'Missing operator access',
            'Demo operator'
        );
        let tenantAdminActor = actorSummary(
            'TENANT_ADMIN',
            workspaceMode,
            readEnv('LUMI_TENANT_ADMIN_ACTOR_ID', 'AGENT_KERNEL_TENANT_ADMIN_ACTOR_ID'),
            readEnv('LUMI_TENANT_ADMIN_ACTOR_LABEL', 'AGENT_KERNEL_TENANT_ADMIN_ACTOR_LABEL'),
            'tenant_admin_touchpoint_missing',
            'Missing tenant-admin touchpoint',
            'Demo tenant admin'
        );
        const requesterRecord = latestActorRecords.get('REQUESTER');
        const operatorRecord = latestActorRecords.get('OPERATOR');
        const tenantAdminRecord = latestActorRecords.get('TENANT_ADMIN');
        if (requesterRecord) requesterActor = actorSummaryFromRecord(requesterRecord);
        if (operatorRecord) operatorActor = actorSummaryFromRecord(operatorRecord);
        if (tenantAdminRecord) tenantAdminActor = actorSummaryFromRecord(tenantAdminRecord);
        const actors = [requesterActor, operatorActor, tenantAdminActor];

        const environmentBinding = workspaceMode === 'demo'
            ? {
                state: 'DEMO_ONLY' as const,
                environment_kind: simulatorBacking ? 'SIMULATOR' as const : 'DEMO' as const,
                environment_label: simulatorBacking ? 'Demo workspace (simulator-backed)' : 'Demo workspace',
                base_url: baseUrl,
                tenant_id: resolvedTenantId,
                workspace_id: resolvedWorkspaceId,
                summary: 'Demo workspace is available for walkthroughs only.',
                source: 'DEMO' as const,
            }
            : latestEnvironmentBinding
                ? {
                    state: latestEnvironmentBinding.state,
                    environment_kind: latestEnvironmentBinding.environment_kind,
                    environment_label: latestEnvironmentBinding.environment_label,
                    base_url: latestEnvironmentBinding.base_url,
                    tenant_id: latestEnvironmentBinding.tenant_id,
                    workspace_id: latestEnvironmentBinding.workspace_id,
                    summary: latestEnvironmentBinding.summary,
                    source: latestEnvironmentBinding.source,
                }
                : {
                    state: (simulatorBacking || workspaceBindingKind !== 'TENANT_WORKSPACE') ? 'BLOCKED' as const : 'MISSING' as const,
                    environment_kind: environmentKind,
                    environment_label: environmentLabel,
                    base_url: baseUrl,
                    tenant_id: resolvedTenantId,
                    workspace_id: resolvedWorkspaceId,
                    summary: simulatorBacking
                        ? 'This is a simulator-backed environment.'
                        : 'Missing pilot environment binding.',
                    source: simulatorBacking ? 'SIMULATOR' as const : 'LOCAL_SYNTHETIC' as const,
                };

        const identityConfig = resolvePilotIdentityProviderConfigFromEnv();
        const identityReadiness: IdentityReadinessSummary = workspaceMode === 'demo'
            ? {
                state: 'DEMO_ONLY',
                provider: identityConfig?.provider,
                tenant_id: identityConfig?.tenant_id,
                workspace_id: identityConfig?.default_workspace_id,
                summary: 'Demo workspace uses seeded identity readiness and does not claim pilot activation.',
                issues: [],
                is_demo_data: true,
                is_pilot_evidence: false,
            }
            : identityConfig
                ? {
                    state: 'READY',
                    provider: identityConfig.provider,
                    tenant_id: identityConfig.tenant_id,
                    workspace_id: identityConfig.default_workspace_id,
                    summary: 'Identity path is configured.',
                    issues: [],
                    is_demo_data: false,
                    is_pilot_evidence: true,
                }
                : {
                    state: 'MISSING',
                    summary: 'Identity not ready',
                    issues: ['identity_not_ready'],
                    is_demo_data: false,
                    is_pilot_evidence: false,
                };

        const vaultConfig = resolvePilotVaultWebhookConfigFromEnv();
        const vaultRecords = await this.store.listVaultCredentials();
        const matchingCredential = vaultConfig?.credential_id
            ? vaultRecords.find((record) => record.credential_id === vaultConfig.credential_id)
            : undefined;

        const vaultReadiness: VaultReadinessSummary = workspaceMode === 'demo'
            ? {
                state: 'DEMO_ONLY',
                backend: vaultConfig?.backend,
                credential_id: vaultConfig?.credential_id,
                summary: 'Demo workspace uses seeded vault readiness and does not claim pilot credential activation.',
                issues: [],
                is_demo_data: true,
                is_pilot_evidence: false,
            }
            : !vaultConfig
                ? {
                    state: 'MISSING',
                    summary: 'Vault / credential path not ready',
                    issues: ['vault_not_ready'],
                    is_demo_data: false,
                    is_pilot_evidence: false,
                }
                : matchingCredential && ['REVOKED', 'COMPROMISED', 'EXPIRED'].includes(String(matchingCredential.status || '').toUpperCase())
                    ? {
                        state: 'DEGRADED',
                        backend: vaultConfig.backend,
                        credential_id: vaultConfig.credential_id,
                        summary: 'Vault / credential path is configured but degraded.',
                        issues: ['vault_not_ready'],
                        is_demo_data: false,
                        is_pilot_evidence: false,
                    }
                    : {
                        state: 'READY',
                        backend: vaultConfig.backend,
                        credential_id: vaultConfig.credential_id,
                        summary: 'Vault / credential path is configured.',
                        issues: [],
                        is_demo_data: false,
                        is_pilot_evidence: true,
                    };

        const connectorReadiness: ConnectorReadinessSummary = workspaceMode === 'demo'
            ? {
                state: 'DEMO_ONLY',
                connector_id: vaultConfig?.connector_id,
                connector_label: 'Webhook transport (demo)',
                summary: 'Demo workspace uses seeded connector readiness and does not claim pilot connector activation.',
                issues: [],
                is_demo_data: true,
                is_pilot_evidence: false,
            }
            : !vaultConfig?.connector_id
                ? {
                    state: 'MISSING',
                    connector_label: 'Webhook transport',
                    summary: 'Connector not ready',
                    issues: ['connector_not_ready'],
                    is_demo_data: false,
                    is_pilot_evidence: false,
                }
                : {
                    state: vaultReadiness.state === 'READY' ? 'READY' : 'DEGRADED',
                    connector_id: vaultConfig.connector_id,
                    connector_label: 'Webhook transport',
                    summary: vaultReadiness.state === 'READY'
                        ? 'Connector path is configured.'
                        : 'Connector path is configured but blocked by credential readiness.',
                    issues: vaultReadiness.state === 'READY' ? [] : ['connector_not_ready'],
                    is_demo_data: false,
                    is_pilot_evidence: vaultReadiness.state === 'READY',
                };

        const connectorActivation = workspaceMode === 'demo'
            ? {
                state: 'DEMO_ONLY' as const,
                connector_id: vaultConfig?.connector_id,
                summary: 'Demo workspace uses seeded connector activation.',
                source: 'DEMO' as const,
            }
            : latestConnectorActivation
                ? {
                    state: latestConnectorActivation.state,
                    connector_id: latestConnectorActivation.connector_id,
                    summary: latestConnectorActivation.summary,
                    source: latestConnectorActivation.source,
                }
                : {
                    state: connectorReadiness.state === 'READY' ? 'INELIGIBLE' as const : 'BLOCKED' as const,
                    connector_id: connectorReadiness.connector_id,
                    summary: connectorReadiness.state === 'READY'
                        ? 'Connector path exists but activation has not been granted.'
                        : 'Connector activation is blocked until connector readiness is resolved.',
                    source: 'LOCAL_SYNTHETIC' as const,
                };

        const missingDependencyCodes = new Set<string>();
        const missingDependencySummaries: string[] = [];
        const addMissing = (code: string, summary: string) => {
            if (workspaceMode === 'demo') return;
            if (missingDependencyCodes.has(code)) return;
            missingDependencyCodes.add(code);
            missingDependencySummaries.push(summary);
        };

        if (workspaceMode !== 'demo') {
            if (environmentBinding.state !== 'BOUND') {
                addMissing('pilot_environment_binding_missing', environmentBinding.summary);
            }
            actors.forEach((actor) => {
                const actorReady = actor.state === 'READY'
                    && actor.provisioning_state === 'PROVISIONED'
                    && actor.access_state === 'GRANTED';
                if (!actorReady && actor.missing_dependency_code) {
                    addMissing(actor.missing_dependency_code, actor.summary);
                }
            });
            if (identityReadiness.state !== 'READY') addMissing('identity_not_ready', 'Identity not ready');
            if (connectorReadiness.state !== 'READY') addMissing('connector_not_ready', 'Connector not ready');
            if (connectorActivation.state !== 'ELIGIBLE') addMissing('connector_activation_not_ready', connectorActivation.summary);
            if (vaultReadiness.state !== 'READY') addMissing('vault_not_ready', 'Vault / credential path not ready');
        }

        const activationReady = workspaceMode === 'demo'
            ? false
            : environmentBinding.state === 'BOUND'
                && actors.every((actor) =>
                    actor.state === 'READY'
                    && actor.provisioning_state === 'PROVISIONED'
                    && actor.access_state === 'GRANTED'
                )
                && identityReadiness.state === 'READY'
                && connectorReadiness.state === 'READY'
                && vaultReadiness.state === 'READY'
                && connectorActivation.state === 'ELIGIBLE';

        const pilotActivationStatus: PilotActivationStatus = (() => {
            if (workspaceMode === 'demo' && demoSupported) return 'DEMO_READY';
            if (!activationReady) return 'PILOT_BLOCKED';
            if (environmentKind === 'PRODUCTION') return 'PRODUCTION_READY';
            if (environmentKind === 'PILOT') return 'PILOT_READY';
            return 'PILOT_BLOCKED';
        })();

        const workspaceOptions: WorkspaceModeOptionSummary[] = [
            {
                mode: 'current',
                label: 'Current workspace',
                selected: workspaceMode === 'current',
                workspace_binding_kind: workspaceBindingKindFor('current', tenantId, workspaceId),
                environment_kind: inferEnvironmentKind(explicitKind, baseUrl, 'current'),
                description: simulatorBacking
                    ? 'Uses the current simulator-backed environment binding.'
                    : 'Uses the current environment binding.',
            },
            {
                mode: 'demo',
                label: 'Demo workspace',
                selected: workspaceMode === 'demo',
                workspace_binding_kind: 'DEMO_WORKSPACE',
                environment_kind: simulatorBacking ? 'SIMULATOR' : 'DEMO',
                description: 'Uses seeded demo data that is always labeled non-pilot.',
            },
            {
                mode: 'local_lab',
                label: 'Local role lab',
                selected: false,
                workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
                environment_kind: simulatorBacking ? 'SIMULATOR' : environmentKind,
                description: 'Lets one human rehearse requester/operator/tenant-admin collaboration locally.',
            },
        ];

        return {
            generated_at: nowMs,
            environment_kind: environmentKind,
            environment_label: environmentLabel,
            workspace_binding_kind: workspaceBindingKind,
            workspace_mode: workspaceMode,
            tenant_id: resolvedTenantId,
            workspace_id: resolvedWorkspaceId,
            pilot_activation_status: pilotActivationStatus,
            simulator_backing: simulatorBacking,
            demo_mode_enabled: demoSupported || workspaceMode === 'demo',
            base_url: baseUrl,
            base_url_source: source,
            workspace_options: workspaceOptions,
            missing_dependency_codes: Array.from(missingDependencyCodes),
            missing_dependency_summaries: missingDependencySummaries,
            environment_binding: environmentBinding,
            actor_availability: actors,
            identity_readiness: identityReadiness,
            connector_readiness: connectorReadiness,
            vault_readiness: vaultReadiness,
            connector_activation: connectorActivation,
            activation_ready: activationReady,
            activation_ready_summary: activationReady
                ? 'Pilot activation is ready to progress.'
                : 'Pilot activation is blocked by environment binding, actor provisioning/access, identity, connector, or vault readiness.',
            is_demo_data: workspaceMode === 'demo',
            is_pilot_evidence: workspaceMode !== 'demo' && activationReady,
        };
    }

    private async buildActivationWorkflow(
        input: ProductShellQuery | undefined,
        environment: EnvironmentActivationSummary,
    ): Promise<{
        activationPackage: PilotActivationPackageSummary;
        checklist: PilotActivationChecklistItem[];
        blockers: PilotActivationBlockerSummary[];
        evidenceCategories: PilotEvidenceCategoryStatus[];
        nextAction: string;
    }> {
        const workspaceMode = normalizeWorkspaceMode(input?.workspaceMode);
        const key = workspaceKey(environment.tenant_id, environment.workspace_id, workspaceMode);
        const packageId = packageIdForWorkspace(key);
        const packageRecord = (await this.store.listPilotActivationPackages(key))
            .sort((a, b) => b.updated_at - a.updated_at)[0];
        const actorRecords = await this.store.listPilotActorReadiness(key);
        const artifactIntakes = await this.store.listPilotExternalArtifactIntakes(key);
        const evidenceRecords = await this.store.listPilotEvidenceArtifacts(key);
        const evidenceCategories = buildEvidenceCategoryStatuses(evidenceRecords);
        const latestActorRecords = latestActorReadinessByRole(actorRecords);
        const actorEvidenceRefs = (role: ActorRole): PilotEvidenceReference[] => {
            const record = latestActorRecords.get(role);
            if (!record) return [];
            return record.evidence_reference_ids
                .map((artifactId) => evidenceRecords.find((artifact) => artifact.artifact_id === artifactId))
                .filter((artifact): artifact is PilotEvidenceArtifactRecord => Boolean(artifact))
                .map(toEvidenceReference);
        };
        const evidenceRefsForCategory = (category: PilotEvidenceCategory): PilotEvidenceReference[] => {
            return evidenceRecords
                .filter((record) => record.category === category)
                .sort((a, b) => b.updated_at - a.updated_at)
                .slice(0, 2)
                .map(toEvidenceReference);
        };

        if (workspaceMode === 'demo') {
            const checklist = [
                checklistItem(
                    'demo_workspace',
                    'demo_workspace_active',
                    'Demo workspace active',
                    'PILOT_COMMANDER',
                    'DEMO_ONLY',
                    'Real pilot activation is intentionally not attempted in demo mode.',
                    'Use demo workspace for walkthroughs only.',
                    {
                        package_id: packageId,
                        requirement_status: 'PENDING',
                    }
                ),
            ];
            return {
                activationPackage: {
                    package_id: packageRecord?.package_id || packageId,
                    status: packageRecord?.status || 'HANDOFF_REQUIRED',
                    owner_type: packageRecord?.owner_type || 'PILOT_COMMANDER',
                    owner_label: packageRecord?.owner_label || ownerLabel('PILOT_COMMANDER'),
                    summary: packageRecord?.summary || 'Demo workspace does not accept real pilot activation handoff artifacts.',
                    handoff_note: packageRecord?.handoff_note,
                    due_at: packageRecord?.due_at,
                    pending_requirement_count: 1,
                    rejected_intake_count: 0,
                    recent_intakes: artifactIntakes.slice(0, 5),
                },
                checklist,
                blockers: [],
                evidenceCategories,
                nextAction: 'Use demo workspace for walkthroughs. Switch back to current workspace for real pilot activation.',
            };
        }

        if (workspaceMode === 'local_lab') {
            const labSummary = localRoleLabSummary(input?.labActorId);
            const checklist = [
                checklistItem(
                    'local_role_lab_active',
                    'local_role_lab_active',
                    'Local role lab active',
                    'PILOT_COMMANDER',
                    'DEMO_ONLY',
                    'Real pilot activation is intentionally blocked in local role lab mode.',
                    'Switch actors to rehearse requester/operator/tenant-admin collaboration locally.',
                    {
                        package_id: packageRecord?.package_id || packageId,
                        requirement_status: 'PENDING',
                    }
                ),
            ];
            return {
                activationPackage: {
                    package_id: packageRecord?.package_id || packageId,
                    status: 'IN_PROGRESS',
                    owner_type: packageRecord?.owner_type || 'PILOT_COMMANDER',
                    owner_label: packageRecord?.owner_label || ownerLabel('PILOT_COMMANDER'),
                    summary: 'Local role lab is active for multi-actor rehearsal and is blocked from real pilot promotion by design.',
                    handoff_note: packageRecord?.handoff_note,
                    due_at: packageRecord?.due_at,
                    pending_requirement_count: 1,
                    rejected_intake_count: 0,
                    recent_intakes: artifactIntakes.slice(0, 5),
                },
                checklist,
                blockers: [],
                evidenceCategories,
                nextAction: `Switch to ${labSummary.active_role.toLowerCase().replace('_', ' ')} and rehearse the next handoff locally.`,
            };
        }

        const requesterActor = environment.actor_availability.find((actor) => actor.role === 'REQUESTER');
        const operatorActor = environment.actor_availability.find((actor) => actor.role === 'OPERATOR');
        const tenantAdminActor = environment.actor_availability.find((actor) => actor.role === 'TENANT_ADMIN');
        const deviceSessionEvidence = evidenceCategories.find((item) => item.category === 'DEVICE_SESSION_PROOF');
        const workflowArtifactEvidence = evidenceCategories.find((item) => item.category === 'WORKFLOW_ARTIFACT_PROOF');
        const connectorEvidence = evidenceCategories.find((item) => item.category === 'CONNECTOR_CREDENTIAL_PROOF');
        const tenantAdminEvidence = evidenceCategories.find((item) => item.category === 'TENANT_ADMIN_SUPPORT_PROOF');
        const stabilityEvidence = evidenceCategories.find((item) => item.category === 'STABILITY_SAFETY_PROOF');

        const baseChecklist = [
            checklistItem(
                'environment_binding',
                'pilot_environment_binding',
                'Pilot environment binding',
                'PILOT_COMMANDER',
                environment.environment_binding.state === 'BOUND'
                    ? 'READY'
                    : environment.environment_binding.state === 'DEMO_ONLY'
                        ? 'DEMO_ONLY'
                        : 'BLOCKED',
                'Real pilot environment binding and base URL',
                'Provide a real pilot environment binding and base URL.',
            ),
            checklistItem(
                'requester_actor',
                'requester_actor',
                'Requester actor ready',
                'REQUESTER_OWNER',
                requesterActor?.state === 'READY'
                    && requesterActor?.provisioning_state === 'PROVISIONED'
                    && requesterActor?.access_state === 'GRANTED'
                    ? 'READY'
                    : requesterActor?.state || 'MISSING',
                'Named requester actor',
                'Register the named requester actor using a real pilot artifact.',
                {
                    actor_role: 'REQUESTER',
                    evidence_references: actorEvidenceRefs('REQUESTER'),
                }
            ),
            checklistItem(
                'operator_actor',
                'operator_actor',
                'Operator access ready',
                'OPERATOR_OWNER',
                operatorActor?.state === 'READY'
                    && operatorActor?.provisioning_state === 'PROVISIONED'
                    && operatorActor?.access_state === 'GRANTED'
                    ? 'READY'
                    : operatorActor?.state || 'MISSING',
                'Supported operator access package',
                'Register operator readiness using a real pilot credential or access artifact.',
                {
                    actor_role: 'OPERATOR',
                    evidence_references: actorEvidenceRefs('OPERATOR'),
                }
            ),
            checklistItem(
                'tenant_admin_actor',
                'tenant_admin_actor',
                'Tenant-admin touchpoint ready',
                'TENANT_ADMIN_OWNER',
                tenantAdminActor?.state === 'READY'
                    && tenantAdminActor?.provisioning_state === 'PROVISIONED'
                    && tenantAdminActor?.access_state === 'GRANTED'
                    ? 'READY'
                    : tenantAdminActor?.state || 'MISSING',
                'Tenant-admin/support channel and touchpoint artifact',
                'Register the tenant-admin/support touchpoint using a real pilot artifact.',
                {
                    actor_role: 'TENANT_ADMIN',
                    evidence_references: actorEvidenceRefs('TENANT_ADMIN'),
                }
            ),
            checklistItem(
                'identity_readiness',
                'identity_readiness',
                'Identity readiness',
                'PILOT_COMMANDER',
                environment.identity_readiness.state,
                'Configured identity readiness',
                'Complete identity readiness for the pilot environment.',
            ),
            checklistItem(
                'connector_readiness',
                'connector_readiness',
                'Connector readiness',
                'PILOT_COMMANDER',
                environment.connector_readiness.state === 'READY' && environment.connector_activation.state === 'ELIGIBLE'
                    ? 'READY'
                    : environment.connector_activation.state === 'DEMO_ONLY'
                        ? 'DEMO_ONLY'
                        : environment.connector_readiness.state,
                'Configured connector path',
                'Complete connector readiness and connector activation for the pilot environment.',
            ),
            checklistItem(
                'vault_readiness',
                'vault_readiness',
                'Vault / credential readiness',
                'PILOT_COMMANDER',
                environment.vault_readiness.state,
                'Configured vault and credential path',
                'Complete vault / credential readiness for the pilot environment.',
            ),
            checklistItem(
                'device_session_proof',
                'device_session_proof',
                'Device / session proof',
                'OPERATOR_OWNER',
                deviceSessionEvidence?.state || 'MISSING',
                'True device/session pilot artifact',
                'Register a true pilot device/session artifact.',
                {
                    evidence_category: 'DEVICE_SESSION_PROOF',
                    evidence_references: evidenceRefsForCategory('DEVICE_SESSION_PROOF'),
                }
            ),
            checklistItem(
                'workflow_artifact_proof',
                'workflow_artifact_proof',
                'Workflow artifact proof',
                'OPERATOR_OWNER',
                workflowArtifactEvidence?.state || 'MISSING',
                'True workflow artifact from a real pilot run',
                'Register a real workflow artifact from a true pilot run.',
                {
                    evidence_category: 'WORKFLOW_ARTIFACT_PROOF',
                    evidence_references: evidenceRefsForCategory('WORKFLOW_ARTIFACT_PROOF'),
                }
            ),
            checklistItem(
                'connector_credential_proof',
                'connector_credential_proof',
                'Connector / credential proof',
                'OPERATOR_OWNER',
                connectorEvidence?.state || 'MISSING',
                'True connector / credential artifact',
                'Register a real connector / credential artifact only if the real pilot run legitimately touches the connector path.',
                {
                    evidence_category: 'CONNECTOR_CREDENTIAL_PROOF',
                    evidence_references: evidenceRefsForCategory('CONNECTOR_CREDENTIAL_PROOF'),
                }
            ),
            checklistItem(
                'tenant_admin_support_proof',
                'tenant_admin_support_proof',
                'Tenant-admin / support proof',
                'TENANT_ADMIN_OWNER',
                tenantAdminEvidence?.state || 'MISSING',
                'True tenant-admin/support touchpoint artifact',
                'Register a real tenant-admin/support touchpoint artifact.',
                {
                    evidence_category: 'TENANT_ADMIN_SUPPORT_PROOF',
                    evidence_references: evidenceRefsForCategory('TENANT_ADMIN_SUPPORT_PROOF'),
                }
            ),
            checklistItem(
                'stability_safety_proof',
                'stability_safety_proof',
                'Stability / safety proof',
                'PILOT_COMMANDER',
                stabilityEvidence?.state || 'MISSING',
                'True pilot stability/safety evidence',
                'Register a real stability/safety artifact from pilot operation.',
                {
                    evidence_category: 'STABILITY_SAFETY_PROOF',
                    evidence_references: evidenceRefsForCategory('STABILITY_SAFETY_PROOF'),
                }
            ),
        ];

        const checklist = baseChecklist.map((item) => {
            const matchingIntakes = artifactIntakes.filter((intake) => intakeMatchesChecklist(item, intake));
            return {
                ...item,
                package_id: packageRecord?.package_id || packageId,
                requirement_status: requirementStatusFor(item, matchingIntakes),
                linked_intake_ids: matchingIntakes.map((intake) => intake.intake_id),
            };
        });

        const blockers = checklist
            .filter((item) => item.state !== 'READY' && item.state !== 'DEMO_ONLY')
            .map((item) => blockerFromChecklist(item));
        const nextAction = blockers[0]?.next_action || 'Pilot activation is ready to progress.';
        const activationPackageStatus = packageStatusFor({
            environment,
            checklist,
            intakes: artifactIntakes,
            evidenceCategories,
        });
        return {
            activationPackage: {
                package_id: packageRecord?.package_id || packageId,
                status: packageRecord?.status || activationPackageStatus,
                owner_type: packageRecord?.owner_type || 'PILOT_COMMANDER',
                owner_label: packageRecord?.owner_label || ownerLabel(packageRecord?.owner_type || 'PILOT_COMMANDER'),
                summary: packageRecord?.summary || summarizePackageStatus(activationPackageStatus, nextAction),
                handoff_note: packageRecord?.handoff_note,
                due_at: packageRecord?.due_at,
                pending_requirement_count: checklist.filter((item) => item.requirement_status !== 'PROMOTED').length,
                rejected_intake_count: artifactIntakes.filter((item) => item.verification_status === 'REJECTED').length,
                recent_intakes: artifactIntakes.slice(0, 5),
            },
            checklist,
            blockers,
            evidenceCategories,
            nextAction,
        };
    }

    async registerPilotActorReadiness(input: RegisterPilotActorReadinessInput): Promise<PilotActorReadinessRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const environment = await this.summarizeEnvironment({ workspaceMode });
        const key = workspaceKey(environment.tenant_id, environment.workspace_id, workspaceMode);
        const existing = (await this.store.listPilotActorReadiness(key)).find((record) => record.role === input.role);
        const isReal = input.source === 'REAL_PILOT' && workspaceMode !== 'demo' && (isConcreteActorValue(input.actorId) || isConcreteActorValue(input.actorLabel));
        const provisioningState = workspaceMode === 'demo'
            ? 'DEMO_ONLY'
            : input.provisioningState
                || (isReal ? 'PROVISIONED' : input.source === 'DEMO' ? 'DEMO_ONLY' : 'BLOCKED');
        const accessState = workspaceMode === 'demo'
            ? 'DEMO_ONLY'
            : input.accessState
                || (isReal ? 'GRANTED' : input.source === 'DEMO' ? 'DEMO_ONLY' : 'BLOCKED');
        const state: DependencyReadinessState = workspaceMode === 'demo'
            ? 'DEMO_ONLY'
            : isReal && provisioningState === 'PROVISIONED' && accessState === 'GRANTED'
                ? 'READY'
                : input.source === 'DEMO'
                    ? 'DEMO_ONLY'
                    : 'BLOCKED';
        const record: PilotActorReadinessRecord = {
            readiness_id: existing?.readiness_id || `pilot_actor_${input.role.toLowerCase()}_${Date.now().toString(36)}`,
            workspace_key: key,
            role: input.role,
            state,
            provisioning_state: provisioningState,
            access_state: accessState,
            actor_id: input.actorId,
            actor_label: input.actorLabel,
            source: input.source,
            note: input.note
                || (isReal
                    ? `${input.role.toLowerCase().replace('_', ' ')} provisioning and access recorded from real pilot evidence.`
                    : 'Actor provisioning/access recorded but not accepted as real pilot readiness.'),
            evidence_reference_ids: input.evidenceReferenceIds || existing?.evidence_reference_ids || [],
            created_at: existing?.created_at || this.now(),
            updated_at: this.now(),
        };
        await this.store.upsertPilotActorReadiness(record);
        return record;
    }

    async registerPilotEnvironmentBinding(input: RegisterPilotEnvironmentBindingInput): Promise<PilotEnvironmentBindingRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const key = workspaceKey(input.tenantId, input.workspaceId, workspaceMode);
        const existing = (await this.store.listPilotEnvironmentBindings(key))[0];
        const normalizedBaseUrl = normalizeUrl(input.baseUrl);
        const simulatorLike = String(normalizedBaseUrl || '').toLowerCase().includes('lumi-agent-simulator');
        const isReal = acceptedRealBindingSource(input.source, workspaceMode)
            && !simulatorLike
            && Boolean(input.tenantId)
            && Boolean(input.workspaceId)
            && (input.environmentKind === 'PILOT' || input.environmentKind === 'PRODUCTION');
        const record: PilotEnvironmentBindingRecord = {
            binding_id: existing?.binding_id || `pilot_binding_${Date.now().toString(36)}`,
            workspace_key: key,
            environment_kind: input.environmentKind,
            state: workspaceMode === 'demo'
                ? 'DEMO_ONLY'
                : isReal
                    ? 'BOUND'
                    : 'BLOCKED',
            environment_label: input.environmentLabel,
            base_url: normalizedBaseUrl,
            tenant_id: input.tenantId,
            workspace_id: input.workspaceId,
            source: input.source,
            summary: input.summary
                || (isReal
                    ? 'Real pilot environment binding recorded.'
                    : 'Environment binding recorded but not accepted as real pilot binding.'),
            created_at: existing?.created_at || this.now(),
            updated_at: this.now(),
        };
        await this.store.upsertPilotEnvironmentBinding(record);
        return record;
    }

    async registerPilotConnectorActivation(input: RegisterPilotConnectorActivationInput): Promise<PilotConnectorActivationRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const environment = await this.summarizeEnvironment({ workspaceMode });
        const key = workspaceKey(environment.tenant_id, environment.workspace_id, workspaceMode);
        const existing = (await this.store.listPilotConnectorActivationRecords(key))
            .find((record) => record.connector_id === input.connectorId);
        const isReal = acceptedRealBindingSource(input.source, workspaceMode);
        const record: PilotConnectorActivationRecord = {
            activation_id: existing?.activation_id || `pilot_connector_${Date.now().toString(36)}`,
            workspace_key: key,
            connector_id: input.connectorId,
            state: workspaceMode === 'demo'
                ? 'DEMO_ONLY'
                : isReal
                    ? 'ELIGIBLE'
                    : 'BLOCKED',
            source: input.source,
            summary: input.summary
                || (isReal
                    ? 'Connector activation eligibility recorded for the pilot path.'
                    : 'Connector activation was recorded but is not eligible for real pilot activation.'),
            evidence_reference_ids: existing?.evidence_reference_ids || [],
            created_at: existing?.created_at || this.now(),
            updated_at: this.now(),
        };
        await this.store.upsertPilotConnectorActivationRecord(record);
        return record;
    }

    async registerPilotActivationPackageHandoff(
        input: RegisterPilotActivationPackageHandoffInput,
    ): Promise<PilotActivationPackageRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const environment = await this.summarizeEnvironment({ workspaceMode });
        const key = workspaceKey(environment.tenant_id, environment.workspace_id, workspaceMode);
        const existing = (await this.store.listPilotActivationPackages(key))
            .sort((a, b) => b.updated_at - a.updated_at)[0];
        const record: PilotActivationPackageRecord = {
            package_id: existing?.package_id || packageIdForWorkspace(key),
            workspace_key: key,
            owner_type: input.ownerType,
            owner_label: input.ownerLabel || ownerLabel(input.ownerType),
            status: existing?.status || 'IN_PROGRESS',
            summary: input.summary || 'External pilot activation package handoff is registered and awaiting artifacts.',
            handoff_note: input.handoffNote,
            due_at: input.dueAt,
            created_at: existing?.created_at || this.now(),
            updated_at: this.now(),
        };
        await this.store.upsertPilotActivationPackage(record);
        return record;
    }

    async submitPilotExternalArtifactIntake(
        input: SubmitPilotExternalArtifactIntakeInput,
    ): Promise<PilotExternalArtifactIntakeRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const environment = await this.summarizeEnvironment({ workspaceMode });
        const key = workspaceKey(
            input.tenantId || environment.tenant_id,
            input.workspaceId || environment.workspace_id,
            workspaceMode,
        );
        const packageRecord = (await this.store.listPilotActivationPackages(key))
            .sort((a, b) => b.updated_at - a.updated_at)[0];
        const record: PilotExternalArtifactIntakeRecord = {
            intake_id: `pilot_intake_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            workspace_key: key,
            package_id: packageRecord?.package_id || packageIdForWorkspace(key),
            artifact_kind: input.artifactKind,
            source: input.source,
            summary: input.summary,
            uri: input.uri,
            submitted_by_role: input.submittedByRole,
            submitted_by_enterprise_role: input.submittedByEnterpriseRole,
            submitted_by_label: input.submittedByLabel,
            actor_role: input.actorRole,
            actor_id: input.actorId,
            actor_label: input.actorLabel,
            provisioning_state: input.provisioningState,
            access_state: input.accessState,
            evidence_category: input.evidenceCategory,
            environment_kind: input.environmentKind,
            environment_label: input.environmentLabel,
            base_url: normalizeUrl(input.baseUrl),
            tenant_id: input.tenantId || environment.tenant_id,
            workspace_id: input.workspaceId || environment.workspace_id,
            connector_id: input.connectorId,
            verification_status: 'RECEIVED',
            promoted_record_ids: [],
            created_at: this.now(),
            updated_at: this.now(),
        };
        await this.store.upsertPilotExternalArtifactIntake(record);
        if (!packageRecord) {
            await this.store.upsertPilotActivationPackage({
                package_id: record.package_id!,
                workspace_key: key,
                owner_type: 'PILOT_COMMANDER',
                owner_label: ownerLabel('PILOT_COMMANDER'),
                status: 'IN_PROGRESS',
                summary: 'External pilot activation package handoff is in progress.',
                created_at: this.now(),
                updated_at: this.now(),
            });
        }
        return record;
    }

    async reviewPilotExternalArtifactIntake(
        input: ReviewPilotExternalArtifactIntakeInput,
    ): Promise<PilotExternalArtifactIntakeRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const current = await this.store.getPilotExternalArtifactIntake(input.intakeId);
        if (!current) {
            throw new Error('pilot_external_artifact_intake_not_found');
        }

        const canPromote = current.source === 'REAL_PILOT' && workspaceMode !== 'demo';
        const nowMs = this.now();
        let next: PilotExternalArtifactIntakeRecord = {
            ...current,
            reviewed_by: input.reviewedBy,
            reviewed_by_enterprise_role: input.reviewedByEnterpriseRole,
            updated_at: nowMs,
        };

        if (input.decision === 'REJECT') {
            next = {
                ...next,
                verification_status: 'REJECTED',
                verification_summary: input.verificationNote || 'External artifact intake was rejected.',
                rejection_reason: input.verificationNote || 'Artifact does not satisfy real pilot activation requirements.',
                verified_at: nowMs,
            };
            await this.store.upsertPilotExternalArtifactIntake(next);
            return next;
        }

        if (input.decision === 'REQUEST_EVIDENCE') {
            next = {
                ...next,
                verification_status: 'EVIDENCE_REQUESTED',
                verification_summary: input.verificationNote || 'Additional evidence was requested before verification can continue.',
                rejection_reason: undefined,
                verified_at: nowMs,
            };
            await this.store.upsertPilotExternalArtifactIntake(next);
            return next;
        }

        if (input.decision === 'HAND_BACK') {
            next = {
                ...next,
                verification_status: 'HANDED_BACK',
                verification_summary: input.verificationNote || 'Artifact was handed back for remediation before verification can continue.',
                rejection_reason: undefined,
                verified_at: nowMs,
            };
            await this.store.upsertPilotExternalArtifactIntake(next);
            return next;
        }

        if (!canPromote) {
            next = {
                ...next,
                verification_status: 'REJECTED',
                verification_summary: input.verificationNote || 'Non-real sources cannot progress pilot activation.',
                rejection_reason: 'Demo/simulator/test/local synthetic artifacts cannot count as real pilot evidence.',
                verified_at: nowMs,
            };
            await this.store.upsertPilotExternalArtifactIntake(next);
            return next;
        }

        if (input.decision === 'VERIFY') {
            next = {
                ...next,
                verification_status: 'VERIFIED',
                verification_summary: input.verificationNote || 'External artifact intake verified and awaiting promotion.',
                verified_at: nowMs,
            };
            await this.store.upsertPilotExternalArtifactIntake(next);
            return next;
        }

        const promotedRecordIds: string[] = [];
        switch (current.artifact_kind) {
        case 'ENVIRONMENT_BINDING': {
            const binding = await this.registerPilotEnvironmentBinding({
                workspaceMode,
                environmentKind: current.environment_kind || 'PILOT',
                environmentLabel: current.environment_label || 'Pilot environment',
                baseUrl: current.base_url,
                tenantId: current.tenant_id,
                workspaceId: current.workspace_id,
                source: 'REAL_PILOT',
                summary: current.summary,
            });
            promotedRecordIds.push(binding.binding_id);
            break;
        }
        case 'ACTOR_READINESS': {
            if (!current.actor_role) {
                throw new Error('pilot_external_artifact_actor_role_required');
            }
            const readiness = await this.registerPilotActorReadiness({
                workspaceMode,
                role: current.actor_role,
                actorId: current.actor_id,
                actorLabel: current.actor_label,
                source: 'REAL_PILOT',
                provisioningState: current.provisioning_state || 'PROVISIONED',
                accessState: current.access_state || 'GRANTED',
                note: current.summary,
            });
            promotedRecordIds.push(readiness.readiness_id);
            break;
        }
        case 'CONNECTOR_ELIGIBILITY': {
            if (!current.connector_id) {
                throw new Error('pilot_external_artifact_connector_id_required');
            }
            const activation = await this.registerPilotConnectorActivation({
                workspaceMode,
                connectorId: current.connector_id,
                source: 'REAL_PILOT',
                summary: current.summary,
            });
            promotedRecordIds.push(activation.activation_id);
            break;
        }
        case 'REAL_EVIDENCE': {
            if (!current.evidence_category) {
                throw new Error('pilot_external_artifact_evidence_category_required');
            }
            const artifact = await this.registerPilotEvidenceArtifact({
                workspaceMode,
                category: current.evidence_category,
                source: 'REAL_PILOT',
                summary: current.summary,
                uri: current.uri,
                actorRole: current.actor_role,
            });
            promotedRecordIds.push(artifact.artifact_id);
            break;
        }
        default:
            throw new Error('pilot_external_artifact_kind_unsupported');
        }

        next = {
            ...next,
            verification_status: 'PROMOTED',
            verification_summary: input.verificationNote || 'External artifact intake promoted into pilot activation runtime truth.',
            rejection_reason: undefined,
            verified_at: next.verified_at || nowMs,
            promoted_at: nowMs,
            promoted_record_ids: promotedRecordIds,
        };
        await this.store.upsertPilotExternalArtifactIntake(next);
        return next;
    }

    async registerPilotEvidenceArtifact(input: RegisterPilotEvidenceArtifactInput): Promise<PilotEvidenceArtifactRecord> {
        const workspaceMode = normalizeWorkspaceMode(input.workspaceMode);
        const environment = await this.summarizeEnvironment({ workspaceMode });
        const key = workspaceKey(environment.tenant_id, environment.workspace_id, workspaceMode);
        const accepted = acceptedRealPilotSource(input.source, workspaceMode);
        const record: PilotEvidenceArtifactRecord = {
            artifact_id: `pilot_artifact_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            workspace_key: key,
            category: input.category,
            source: input.source,
            summary: input.summary,
            uri: input.uri,
            actor_role: input.actorRole,
            accepted_as_real_pilot_evidence: accepted,
            rejection_reason: accepted
                ? undefined
                : 'Demo/simulator/test/local synthetic artifacts cannot count as real pilot evidence.',
            created_at: this.now(),
            updated_at: this.now(),
        };
        await this.store.upsertPilotEvidenceArtifact(record);
        return record;
    }

    async listRequesterInboxItems(input?: ProductShellQuery): Promise<RequesterInboxItem[]> {
        const environment = await this.summarizeEnvironment(input);
        if (environment.workspace_mode === 'demo') {
            return seededDemoInboxItems(this.now());
        }
        if (environment.workspace_mode === 'local_lab') {
            const labSummary = localRoleLabSummary(input?.labActorId);
            const activeActor = labSummary.actors.find((actor) => actor.is_active) || labSummary.actors[0]!;
            return seededLocalRoleLabInboxItems(this.now(), activeActor);
        }

        const taskIds = await this.store.listTaskIds();
        const snapshots = await Promise.all(taskIds.map((taskId) => this.store.getTaskSnapshot(taskId)));
        return snapshots
            .filter((snapshot): snapshot is TaskSnapshot => Boolean(snapshot))
            .map((snapshot) => ({
                task_id: snapshot.task_state.task_id,
                correlation_id: snapshot.task_state.correlation?.correlation_id,
                goal: snapshot.graph.goal,
                task_status: snapshot.task_state.status,
                group: statusGroupFor(snapshot.task_state.status),
                summary: snapshot.task_state.current_wait?.prompt?.title
                    || snapshot.task_state.current_wait?.prompt?.summary
                    || snapshot.graph.goal,
                blocker_summary: findBlockerSummary(snapshot),
                receipt_summary: buildReceiptSummary(snapshot),
                actor_role: undefined,
                actor_label: undefined,
                updated_at: snapshot.task_state.updated_at,
                workspace_binding_kind: environment.workspace_binding_kind,
                environment_kind: environment.environment_kind,
                is_demo_data: false,
                is_pilot_evidence: false,
            }))
            .sort((a, b) => b.updated_at - a.updated_at);
    }

    async summarizeRequesterInbox(input?: ProductShellQuery): Promise<RequesterInboxSummary> {
        const items = await this.listRequesterInboxItems(input);
        const count = (group: RequesterInboxGroup) => items.filter((item) => item.group === group).length;
        return {
            generated_at: this.now(),
            total_count: items.length,
            in_progress_count: count('IN_PROGRESS'),
            blocked_count: count('BLOCKED'),
            waiting_count: count('WAITING'),
            completed_count: count('COMPLETED'),
            items,
            is_demo_data: normalizeWorkspaceMode(input?.workspaceMode) === 'demo',
            is_pilot_evidence: false,
        };
    }

    async summarizePolicyStudio(input?: ProductShellQuery): Promise<PolicyStudioSummary> {
        const metadata = getPolicyEngineMetadata();
        const workspaceMode = normalizeWorkspaceMode(input?.workspaceMode);
        const detailLines = [
            `Policy pack: Agent OS v${metadata.version}`,
            `Fingerprint: ${metadata.fingerprint}`,
            'Overrides: v1 read-only summary only',
            'Rollout / simulation: visible summary only; existing rollout and governance controls remain authoritative',
            'Approval governance: enforced by existing policy, receipt, and operator surfaces',
        ];
        return {
            generated_at: this.now(),
            pack_name: 'Agent OS Policy Pack',
            pack_version: String(metadata.version),
            pack_fingerprint: metadata.fingerprint,
            override_count: 0,
            summary: workspaceMode === 'demo'
                ? 'Policy Studio v1 is available for demo walkthroughs with explicit non-pilot labeling.'
                : 'Policy Studio v1 exposes the active policy pack and rollout/governance summaries.',
            rollout_summary: 'Current rollout state is read-only in the product shell and remains governed by existing rollout controls.',
            simulation_summary: 'Simulation visibility is surfaced from existing governance capabilities; no new DSL or BPM layer is introduced.',
            approval_governance_summary: 'Approval governance remains enforced by existing policy and receipt runtime decisions.',
            detail_lines: detailLines,
            is_demo_data: workspaceMode === 'demo',
            is_pilot_evidence: workspaceMode !== 'demo',
        };
    }

    async summarizeTenantAdminSetup(input?: ProductShellQuery): Promise<TenantAdminActivationSummary> {
        const environment = await this.summarizeEnvironment(input);
        const activationWorkflow = await this.buildActivationWorkflow(input, environment);
        const labSummary = environment.workspace_mode === 'local_lab'
            ? localRoleLabSummary(input?.labActorId)
            : undefined;
        const detailLines = [
            `Environment: ${environment.environment_label}`,
            `Workspace binding: ${environment.workspace_binding_kind.toLowerCase().replace('_', ' ')}`,
            `Pilot activation: ${environment.pilot_activation_status.toLowerCase().replace('_', ' ')}`,
            `Activation package: ${activationWorkflow.activationPackage.status.toLowerCase().replace(/_/g, ' ')}`,
            activationWorkflow.activationPackage.summary,
            ...(labSummary ? [
                `Active lab actor: ${labSummary.actors.find((actor) => actor.is_active)?.actor_label}`,
                labSummary.summary,
                labSummary.day_zero_blocked_summary,
            ] : []),
            ...environment.missing_dependency_summaries,
            `Activation checklist: ${activationWorkflow.checklist.filter((item) => item.state === 'READY').length}/${activationWorkflow.checklist.length} ready`,
            `Next action: ${activationWorkflow.nextAction}`,
            ...activationWorkflow.activationPackage.recent_intakes
                .slice(0, 2)
                .map((intake) => `Artifact ${intake.artifact_kind.toLowerCase().replace(/_/g, ' ')}: ${intake.verification_status.toLowerCase().replace(/_/g, ' ')}`),
            ...activationWorkflow.blockers.slice(0, 3).map((blocker) => `Blocker: ${blocker.summary} · ${blocker.missing_artifact}`),
            ...activationWorkflow.evidenceCategories.map((item) => `Evidence ${item.category.toLowerCase().replace(/_/g, ' ')}: ${item.state.toLowerCase().replace(/_/g, ' ')}`),
        ];
        return {
            status: environment.workspace_mode === 'demo'
                ? 'DEMO_ONLY'
                : environment.workspace_mode === 'local_lab'
                    ? 'DEMO_ONLY'
                : environment.missing_dependency_codes.length === 0
                    ? 'READY'
                    : 'BLOCKED',
            title: environment.workspace_mode === 'demo'
                ? 'Demo setup'
                : environment.workspace_mode === 'local_lab'
                    ? 'Local Role Lab Setup'
                    : 'Tenant Admin Setup / Activation',
            summary: environment.workspace_mode === 'demo'
                ? 'Demo workspace is ready for walkthroughs and is explicitly marked non-pilot.'
                : environment.workspace_mode === 'local_lab'
                    ? 'Local role lab is ready for multi-actor rehearsal and is explicitly non-pilot.'
                : environment.missing_dependency_codes.length === 0
                    ? 'Environment is ready for pilot activation.'
                    : 'Environment is not ready for pilot activation.',
            detail_lines: detailLines,
            missing_dependency_codes: [...environment.missing_dependency_codes],
            actor_availability: environment.actor_availability,
            identity_readiness: environment.identity_readiness,
            connector_readiness: environment.connector_readiness,
            vault_readiness: environment.vault_readiness,
            is_demo_data: environment.is_demo_data,
            is_pilot_evidence: environment.is_pilot_evidence,
        };
    }

    async summarizeProductShell(input?: ProductShellQuery): Promise<ProductShellSummary> {
        const environment = await this.summarizeEnvironment(input);
        const requesterInbox = await this.summarizeRequesterInbox(input);
        const tenantAdminSetup = await this.summarizeTenantAdminSetup(input);
        const policyStudio = await this.summarizePolicyStudio(input);
        const activationWorkflow = await this.buildActivationWorkflow(input, environment);
        const localRoleLab = localRoleLabSummary(input?.labActorId);
        const demo: ProductShellDemoSummary = {
            enabled: environment.demo_mode_enabled,
            label: 'Demo workspace',
            summary: 'Seeded demo workspace is clearly labeled simulated and is never treated as pilot evidence.',
            seeded_scenarios: [...DEFAULT_DEMO_SCENARIOS],
            seeded_task_count: seededDemoInboxItems(this.now()).length,
            is_demo_data: true,
            is_pilot_evidence: false,
        };
        return {
            generated_at: this.now(),
            environment_activation: environment,
            requester_inbox: requesterInbox,
            tenant_admin_setup: tenantAdminSetup,
            policy_studio: policyStudio,
            local_role_lab: localRoleLab,
            demo,
            activation_package: activationWorkflow.activationPackage,
            activation_checklist: activationWorkflow.checklist,
            remaining_blockers: activationWorkflow.blockers,
            evidence_categories: activationWorkflow.evidenceCategories,
            next_action: activationWorkflow.nextAction,
        };
    }
}

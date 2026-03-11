import type {
    ActorRole,
    LocalRoleLabHandoffStep,
    ProductShellSummary,
    RequesterInboxGroup,
    RequesterInboxItem,
    RequesterInboxSummary,
    TrialInviteStatus,
    TrialSeatClaimStatus,
    TrialWorkspaceSummary,
    WorkspaceModeOptionSummary,
    type EnterpriseOARole,
} from './agentKernelShellApi';
import {
    acceptTrialWorkspaceInvite,
    createTrialWorkspaceInvite,
    createTrialWorkspaceTask,
    releaseTrialWorkspaceSeat,
    registerTrialWorkspaceSession as registerServerTrialWorkspaceSession,
} from './agentKernelShellApi';

const STORAGE_KEY = 'lumi_trial_workspace_state_v1';
const UPDATE_EVENT = 'lumi-trial-workspace-state-updated';
const SESSION_STORAGE_KEY = 'lumi_trial_workspace_session_id';
const DEFAULT_TRIAL_WORKSPACE_ID = 'trial_workspace_enterprise_sandbox';
let fallbackState: TrialWorkspaceState | null = null;

export type LocalRoleLabScenarioTemplateId =
    | 'advisor_client_intake'
    | 'cross_boundary_export_review'
    | 'exception_dispute_remediation'
    | 'oa_full_cycle_governed_execution';

export type SandboxWalkthroughStatus = 'DONE' | 'CURRENT' | 'UPCOMING';
export type SandboxOutcomeStatus =
    | 'READY_TO_REHEARSE'
    | 'IN_PROGRESS'
    | 'REVIEW_REQUIRED'
    | 'HANDOFF_BLOCKED';
export type TrialWorkspaceStatus =
    | 'ACTIVE'
    | 'REHEARSAL_IN_PROGRESS'
    | 'READY_FOR_CONVERSION';
export type TrialParticipantState = 'ACTIVE' | 'READY' | 'VIEWING';
export type TrialTaskLifecycle = 'REQUESTED' | 'OPERATOR_REVIEW' | 'TENANT_ADMIN_REVIEW' | 'HANDOFF_BLOCKED';

export interface ParsedRequesterBrief {
    client_name: string;
    jurisdiction: string;
    priority: string;
    required_outcome: string;
    external_handoff_guard: string;
    missing_data_policy: string;
}

export interface LocalRoleLabScenarioTemplate {
    template_id: LocalRoleLabScenarioTemplateId;
    title: string;
    summary: string;
    starter_role: ActorRole;
    role_focus: EnterpriseOARole[];
    expected_outcome: string;
    connector_involved: boolean;
    default_brief: string;
    missing_fields: string[];
}

export interface TrialWorkspaceRecord {
    trial_workspace_id: string;
    label: string;
    summary: string;
    status: TrialWorkspaceStatus;
    active_template_id: LocalRoleLabScenarioTemplateId;
    created_at: number;
    updated_at: number;
}

export interface TrialParticipantRecord {
    participant_id: string;
    trial_workspace_id: string;
    actor_role: ActorRole;
    actor_label: string;
    seat_id: string;
    summary: string;
    state: TrialParticipantState;
    invite_id?: string;
    created_at: number;
    updated_at: number;
}

export interface TrialWorkspaceSeatRecord {
    seat_id: string;
    trial_workspace_id: string;
    role: ActorRole;
    label: string;
    summary: string;
    claim_status: TrialSeatClaimStatus;
    assigned_participant_id?: string;
    claimed_via_invite_id?: string;
    created_at: number;
    updated_at: number;
}

export interface TrialWorkspaceInviteRecord {
    invite_id: string;
    trial_workspace_id: string;
    seat_id: string;
    actor_role: ActorRole;
    invite_code: string;
    label: string;
    status: TrialInviteStatus;
    accepted_participant_id?: string;
    created_at: number;
    accepted_at?: number;
    updated_at: number;
}

export interface TrialSessionRecord {
    trial_session_id: string;
    trial_workspace_id: string;
    participant_id: string;
    actor_role: ActorRole;
    current_page: string;
    current_section: string;
    created_at: number;
    last_seen_at: number;
}

export interface LocalRoleLabTaskRecord {
    task_id: string;
    correlation_id: string;
    trial_workspace_id: string;
    created_by_participant_id: string;
    scenario_id: LocalRoleLabScenarioTemplateId;
    scenario_title: string;
    scenario_summary: string;
    requester_brief: string;
    client_name: string;
    jurisdiction: string;
    priority: string;
    required_outcome: string;
    external_handoff_guard: string;
    missing_data_policy: string;
    missing_compliance_fields: string[];
    operator_review_required: boolean;
    compliance_review_requested: boolean;
    connector_requested: boolean;
    lifecycle: TrialTaskLifecycle;
    receipt_summary: string;
    created_at: number;
    updated_at: number;
}

interface TrialWorkspaceState {
    workspace: TrialWorkspaceRecord;
    seats: TrialWorkspaceSeatRecord[];
    participants: TrialParticipantRecord[];
    invites: TrialWorkspaceInviteRecord[];
    sessions: TrialSessionRecord[];
    tasks: LocalRoleLabTaskRecord[];
}

export interface EnterpriseSandboxScenarioCard {
    template_id: LocalRoleLabScenarioTemplateId;
    title: string;
    summary: string;
    starter_role: ActorRole;
    role_focus: string[];
    expected_outcome: string;
    connector_label: string;
    status: 'ACTIVE' | 'READY';
}

export interface EnterpriseSandboxWalkthroughStep {
    step_id: string;
    role: EnterpriseOARole;
    title: string;
    status: SandboxWalkthroughStatus;
    summary: string;
}

export interface EnterpriseSandboxRoleSummary {
    role: EnterpriseOARole;
    title: string;
    summary: string;
    focus: string;
}

export interface EnterpriseSandboxOutcomeSummary {
    headline: string;
    status: SandboxOutcomeStatus;
    summary: string;
    detail_lines: string[];
}

export interface TrialWorkspaceSummaryCard {
    trial_workspace_id: string;
    label: string;
    summary: string;
    status: TrialWorkspaceStatus;
    participant_count: number;
    active_session_count: number;
    task_count: number;
}

export interface TrialTaskDetailSummary {
    task_id: string;
    title: string;
    lifecycle: TrialTaskLifecycle;
    receipt_summary: string;
    missing_fields: string[];
    handoff_lines: string[];
    approval_summary: string;
}

export interface EnterpriseSandboxModel {
    headline: string;
    subtitle: string;
    active_template_id: LocalRoleLabScenarioTemplateId;
    active_template_title: string;
    scenario_cards: EnterpriseSandboxScenarioCard[];
    walkthrough_title: string;
    walkthrough_summary: string;
    walkthrough_steps: EnterpriseSandboxWalkthroughStep[];
    role_summaries: EnterpriseSandboxRoleSummary[];
    outcome_summary: EnterpriseSandboxOutcomeSummary;
    gap_title: string;
    gap_lines: string[];
    non_pilot_label: string;
    trial_workspace: TrialWorkspaceSummaryCard;
    seats: TrialWorkspaceSeatRecord[];
    participants: TrialParticipantRecord[];
    invites: TrialWorkspaceInviteRecord[];
    sessions: TrialSessionRecord[];
    active_task_detail?: TrialTaskDetailSummary;
    persistence_detail?: string;
    deployment_blocker?: string;
    join_instructions: string[];
    conversion_guidance_lines: string[];
}

const SCENARIO_TEMPLATES: readonly LocalRoleLabScenarioTemplate[] = [
    {
        template_id: 'advisor_client_intake',
        title: 'Advisor Client Intake → Compliance Review → CRM Handoff',
        summary: 'Show how a requester starts a high-value advisory intake, the operator completes missing compliance fields, and tenant admin gates any CRM handoff.',
        starter_role: 'REQUESTER',
        role_focus: ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'],
        expected_outcome: 'Intake is prepared, compliance review is requested, and CRM handoff stays blocked until required fields are complete.',
        connector_involved: true,
        default_brief: `Create a new client intake for a high-net-worth advisory prospect.
Client name: Eleanor Hart
Jurisdiction: UK
Priority: high
Required outcome: intake record prepared, compliance review requested, CRM handoff ready if policy allows.
Do not finalize external handoff until compliance-required fields are complete.
If anything is missing, request operator review instead of silently proceeding.`,
        missing_fields: ['primary_contact_details', 'source_of_funds', 'risk_profile', 'kyc_status'],
    },
    {
        template_id: 'cross_boundary_export_review',
        title: 'Cross-Boundary Export Review',
        summary: 'Demonstrate how an operator and tenant admin hold a cross-boundary export until residency, approval, and destination review requirements are satisfied.',
        starter_role: 'REQUESTER',
        role_focus: ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'],
        expected_outcome: 'Export review is staged, boundary checks are requested, and external delivery stays blocked until policy and approval fields are complete.',
        connector_involved: false,
        default_brief: `Create a cross-boundary export review for a portfolio insight package.
Client name: Meridian Family Office Export
Jurisdiction: UK to EU
Priority: high
Required outcome: export package prepared, boundary review requested, delivery package ready only if policy allows.
Do not finalize external transfer until jurisdiction, approval, and residency-required fields are complete.
If anything is missing, request operator review instead of silently proceeding.`,
        missing_fields: ['destination_approval', 'residency_basis', 'export_manifest'],
    },
    {
        template_id: 'exception_dispute_remediation',
        title: 'Exception / Dispute / Remediation Handling',
        summary: 'Show how a dispute is opened, triaged by an operator, and held for tenant-admin remediation approval before any downstream action closes.',
        starter_role: 'REQUESTER',
        role_focus: ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'],
        expected_outcome: 'Exception case is recorded, remediation review is routed, and closure stays blocked until evidence and approval fields are complete.',
        connector_involved: false,
        default_brief: `Create an exception and dispute remediation case for an advisory workflow.
Client name: Redwood Dispute 17
Jurisdiction: UK
Priority: high
Required outcome: exception case prepared, remediation review requested, closure package ready only if policy allows.
Do not finalize remediation closure until evidence, dispute-resolution, and approval-required fields are complete.
        If anything is missing, request operator review instead of silently proceeding.`,
        missing_fields: ['dispute_evidence', 'remediation_owner', 'approval_resolution'],
    },
    {
        template_id: 'oa_full_cycle_governed_execution',
        title: '9-Role OA Governed Execution Cycle',
        summary: 'Demonstrate one governed B-end execution cycle that explicitly shows how all 9 OA roles participate across request, approval, review, policy, integration, workspace governance, and audit.',
        starter_role: 'REQUESTER',
        role_focus: [
            'REQUESTER',
            'APPROVER',
            'OPERATOR',
            'REVIEWER',
            'TENANT_ADMIN',
            'WORKSPACE_ADMIN',
            'POLICY_GOVERNANCE_ADMIN',
            'INTEGRATION_ADMIN',
            'AUDITOR',
        ],
        expected_outcome: 'The request is staged, bounded approvals are captured, integration and policy posture are checked, and audit visibility is explicit across all 9 OA roles.',
        connector_involved: true,
        default_brief: `Create a 9-role OA governed execution example for a regulated client onboarding package.
Client name: Northbridge Family Office
Jurisdiction: UK
Priority: high
Required outcome: request staged, approval captured, operator package reviewed, policy and integration posture checked, workspace/admin governance confirmed, and audit trail visible.
Do not finalize any external handoff until approval, review, policy, integration, and audit-required fields are explicitly complete.
If anything is missing, keep the flow inside the enterprise platform and route it to the correct OA role instead of silently progressing.`,
        missing_fields: ['approval_scope', 'review_evidence', 'policy_basis', 'integration_readiness', 'workspace_assignment', 'audit_export_reference'],
    },
] as const;

const DEFAULT_PARTICIPANTS: readonly Omit<TrialParticipantRecord, 'trial_workspace_id' | 'created_at' | 'updated_at'>[] = [
    {
        participant_id: 'participant_requester_01',
        actor_role: 'REQUESTER',
        actor_label: 'Local Requester',
        seat_id: 'seat_requester',
        summary: 'Submits requests, reviews receipts, and follows cross-role progress.',
        state: 'ACTIVE',
    },
    {
        participant_id: 'participant_operator_01',
        actor_role: 'OPERATOR',
        actor_label: 'Local Operator',
        seat_id: 'seat_operator',
        summary: 'Validates missing fields, prepares handoffs, and explains operational progress.',
        state: 'ACTIVE',
    },
    {
        participant_id: 'participant_tenant_admin_01',
        actor_role: 'TENANT_ADMIN',
        actor_label: 'Local Tenant Admin',
        seat_id: 'seat_tenant_admin',
        summary: 'Reviews readiness, boundaries, and what must change before pilot conversion.',
        state: 'ACTIVE',
    },
] as const;

function now(): number {
    return Date.now();
}

function randomId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getSessionStorage(): Storage | undefined {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
        ? window.sessionStorage
        : undefined;
}

function bootstrapTrialWorkspaceState(): TrialWorkspaceState {
    const timestamp = now();
    return {
        workspace: {
            trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
            label: 'Enterprise Sandbox Workspace',
            summary: 'Shared trial workspace for multi-role enterprise rehearsal. This workspace is durable for sandbox evaluation only and never counts as real pilot evidence.',
            status: 'ACTIVE',
            active_template_id: 'advisor_client_intake',
            created_at: timestamp,
            updated_at: timestamp,
        },
        participants: DEFAULT_PARTICIPANTS.map((participant) => ({
            ...participant,
            trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
            created_at: timestamp,
            updated_at: timestamp,
        })),
        seats: [
            {
                seat_id: 'trial_seat_requester',
                trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
                role: 'REQUESTER',
                label: 'Requester seat',
                summary: 'Business requester perspective.',
                claim_status: 'ASSIGNED_BASE',
                assigned_participant_id: 'participant_requester_01',
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                seat_id: 'trial_seat_operator',
                trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
                role: 'OPERATOR',
                label: 'Operator seat',
                summary: 'Operational reviewer perspective.',
                claim_status: 'ASSIGNED_BASE',
                assigned_participant_id: 'participant_operator_01',
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                seat_id: 'trial_seat_tenant_admin',
                trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
                role: 'TENANT_ADMIN',
                label: 'Tenant-admin seat',
                summary: 'Admin / approval perspective.',
                claim_status: 'ASSIGNED_BASE',
                assigned_participant_id: 'participant_tenant_admin_01',
                created_at: timestamp,
                updated_at: timestamp,
            },
        ],
        invites: [],
        sessions: [],
        tasks: [],
    };
}

function normalizeState(raw: unknown): TrialWorkspaceState {
    if (!raw || typeof raw !== 'object') return bootstrapTrialWorkspaceState();
    const candidate = raw as Partial<TrialWorkspaceState>;
    if (!candidate.workspace || !candidate.participants || !candidate.tasks || !candidate.sessions) {
        return bootstrapTrialWorkspaceState();
    }
    return {
        workspace: candidate.workspace as TrialWorkspaceRecord,
        seats: (candidate as any).seats as TrialWorkspaceSeatRecord[] || bootstrapTrialWorkspaceState().seats,
        participants: candidate.participants as TrialParticipantRecord[],
        invites: (candidate as any).invites as TrialWorkspaceInviteRecord[] || [],
        sessions: candidate.sessions as TrialSessionRecord[],
        tasks: candidate.tasks as LocalRoleLabTaskRecord[],
    };
}

function readState(): TrialWorkspaceState {
    if (!canUseStorage()) {
        fallbackState ||= bootstrapTrialWorkspaceState();
        return fallbackState;
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return bootstrapTrialWorkspaceState();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const base = bootstrapTrialWorkspaceState();
            return {
                ...base,
                tasks: parsed as LocalRoleLabTaskRecord[],
            };
        }
        return normalizeState(parsed);
    } catch {
        return bootstrapTrialWorkspaceState();
    }
}

function writeState(state: TrialWorkspaceState): void {
    if (!canUseStorage()) {
        fallbackState = state;
        return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function parseLabeledValue(lines: string[], label: string): string {
    const prefix = `${label.toLowerCase()}:`;
    const line = lines.find((entry) => entry.toLowerCase().startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : '';
}

function scenarioTemplateById(templateId: LocalRoleLabScenarioTemplateId): LocalRoleLabScenarioTemplate {
    return SCENARIO_TEMPLATES.find((template) => template.template_id === templateId) || SCENARIO_TEMPLATES[0];
}

function inferScenarioTemplateId(brief: string): LocalRoleLabScenarioTemplateId {
    const normalized = brief.toLowerCase();
    if (normalized.includes('9-role oa') || normalized.includes('governed execution example')) {
        return 'oa_full_cycle_governed_execution';
    }
    if (normalized.includes('cross-boundary export')) return 'cross_boundary_export_review';
    if (normalized.includes('exception') || normalized.includes('dispute') || normalized.includes('remediation')) {
        return 'exception_dispute_remediation';
    }
    return 'advisor_client_intake';
}

function actorRoleForLabActorId(labActorId: string | undefined): ActorRole {
    if (labActorId === 'local_requester_01') return 'REQUESTER';
    if (labActorId === 'local_operator_01') return 'OPERATOR';
    return 'TENANT_ADMIN';
}

function participantForRole(state: TrialWorkspaceState, role: ActorRole): TrialParticipantRecord {
    return state.participants.find((participant) => participant.actor_role === role) || state.participants[0];
}

function participantForLabActorId(state: TrialWorkspaceState, labActorId: string | undefined): TrialParticipantRecord {
    const role = actorRoleForLabActorId(labActorId);
    return participantForRole(state, role);
}

function parseRequesterBrief(brief: string): ParsedRequesterBrief {
    const lines = brief
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    return {
        client_name: parseLabeledValue(lines, 'Client name') || 'Unknown client',
        jurisdiction: parseLabeledValue(lines, 'Jurisdiction') || 'Unknown jurisdiction',
        priority: parseLabeledValue(lines, 'Priority') || 'normal',
        required_outcome: parseLabeledValue(lines, 'Required outcome') || 'Outcome not specified',
        external_handoff_guard: lines.find((line) => /^Do not /i.test(line)) || 'Do not finalize external handoff until compliance-required fields are complete.',
        missing_data_policy: lines.find((line) => /^If anything is missing/i.test(line)) || 'If anything is missing, request operator review instead of silently proceeding.',
    };
}

function taskReceiptSummary(record: LocalRoleLabTaskRecord): string {
    if (record.scenario_id === 'cross_boundary_export_review') {
        return 'Cross-boundary export package is staged locally; external delivery remains blocked.';
    }
    if (record.scenario_id === 'exception_dispute_remediation') {
        return 'Exception case is recorded locally; remediation closure remains blocked.';
    }
    return record.connector_requested
        ? 'CRM handoff remains blocked pending operator review and compliance completeness.'
        : 'Connector path is not involved in this rehearsal task.';
}

function taskLifecycleFor(record: LocalRoleLabTaskRecord): TrialTaskLifecycle {
    if (record.scenario_id === 'oa_full_cycle_governed_execution') return 'TENANT_ADMIN_REVIEW';
    if (record.scenario_id === 'advisor_client_intake') return 'OPERATOR_REVIEW';
    if (record.scenario_id === 'cross_boundary_export_review') return 'OPERATOR_REVIEW';
    return 'TENANT_ADMIN_REVIEW';
}

function buildHandoffTimeline(record: LocalRoleLabTaskRecord): LocalRoleLabHandoffStep[] {
    switch (record.scenario_id) {
    case 'cross_boundary_export_review':
        return [
            {
                step_id: `${record.task_id}__requester_submit`,
                from_role: 'REQUESTER',
                to_role: 'OPERATOR',
                title: `Requester stages ${record.client_name} export`,
                summary: `${record.client_name} export request is captured and routed for operator boundary review.`,
                status: 'COMPLETED',
            },
            {
                step_id: `${record.task_id}__operator_review`,
                from_role: 'OPERATOR',
                to_role: 'TENANT_ADMIN',
                title: `Operator export review for ${record.client_name}`,
                summary: 'Operator must validate residency basis, export manifest, and destination controls before admin approval.',
                status: 'ACTIVE',
            },
            {
                step_id: `${record.task_id}__tenant_admin`,
                from_role: 'TENANT_ADMIN',
                title: `Boundary approval queue for ${record.client_name}`,
                summary: 'Tenant admin will decide whether the export may proceed once required controls are complete.',
                status: 'PENDING',
            },
        ];
    case 'exception_dispute_remediation':
        return [
            {
                step_id: `${record.task_id}__requester_submit`,
                from_role: 'REQUESTER',
                to_role: 'OPERATOR',
                title: `Requester opens ${record.client_name} exception`,
                summary: `${record.client_name} dispute is recorded and routed for operator remediation review.`,
                status: 'COMPLETED',
            },
            {
                step_id: `${record.task_id}__operator_review`,
                from_role: 'OPERATOR',
                to_role: 'TENANT_ADMIN',
                title: `Operator remediation review for ${record.client_name}`,
                summary: 'Operator must validate dispute evidence, remediation owner, and closure preconditions.',
                status: 'ACTIVE',
            },
            {
                step_id: `${record.task_id}__tenant_admin`,
                from_role: 'TENANT_ADMIN',
                title: `Tenant-admin remediation approval for ${record.client_name}`,
                summary: 'Tenant admin will approve or hold closure after evidence and approval fields are complete.',
                status: 'PENDING',
            },
        ];
    case 'advisor_client_intake':
    default:
        return [
            {
                step_id: `${record.task_id}__requester_submit`,
                from_role: 'REQUESTER',
                to_role: 'OPERATOR',
                title: `Requester submits ${record.client_name} intake`,
                summary: `${record.client_name} (${record.jurisdiction}) was submitted with ${record.priority} priority and routed to operator review.`,
                status: 'COMPLETED',
            },
            {
                step_id: `${record.task_id}__operator_review`,
                from_role: 'OPERATOR',
                to_role: 'TENANT_ADMIN',
                title: `Operator review required for ${record.client_name}`,
                summary: 'Operator must complete missing compliance fields before compliance review and any CRM handoff can proceed.',
                status: 'ACTIVE',
            },
            {
                step_id: `${record.task_id}__tenant_admin`,
                from_role: 'TENANT_ADMIN',
                title: `Compliance request queued for ${record.client_name}`,
                summary: record.connector_requested
                    ? 'CRM handoff is requested but explicitly blocked until compliance-required fields are complete.'
                    : 'Connector path is not involved in this rehearsal task.',
                status: 'PENDING',
            },
        ];
    }
}

function buildWorkItems(record: LocalRoleLabTaskRecord, role: EnterpriseOARole): string[] {
    switch (record.scenario_id) {
    case 'oa_full_cycle_governed_execution':
        switch (role) {
        case 'REQUESTER':
            return [`Submit governed onboarding request for ${record.client_name} · waiting`, 'Confirm outcome scope and business objective · waiting'];
        case 'APPROVER':
            return [`Approve bounded execution scope for ${record.client_name} · waiting`, 'Record approval rationale and release posture · waiting'];
        case 'OPERATOR':
            return [`Operator package assembly for ${record.client_name} · in progress`, 'Coordinate downstream handoff and missing fields · in progress'];
        case 'REVIEWER':
            return [`Evidence review for ${record.client_name} · waiting`, 'Verify review package completeness before promotion · waiting'];
        case 'TENANT_ADMIN':
            return [`Tenant-level activation / readiness check for ${record.client_name} · waiting`, 'Hold final progression until enterprise gates are complete · waiting'];
        case 'WORKSPACE_ADMIN':
            return [`Workspace seat and participant scope for ${record.client_name} · waiting`, 'Confirm workspace assignment and accountability path · waiting'];
        case 'POLICY_GOVERNANCE_ADMIN':
            return [`Policy basis check for ${record.client_name} · waiting`, 'Validate rollout / override posture before release · waiting'];
        case 'INTEGRATION_ADMIN':
            return [`Integration readiness check for ${record.client_name} · waiting`, 'Confirm connector and credential posture · waiting'];
        case 'AUDITOR':
            return [`Audit trail review for ${record.client_name} · waiting`, 'Confirm export-ready receipt and timeline visibility · waiting'];
        default:
            return ['No work items'];
        }
    case 'cross_boundary_export_review':
        return role === 'REQUESTER'
            ? [`Stage export review for ${record.client_name} · waiting`, 'Confirm destination and residency rationale · waiting']
            : role === 'OPERATOR'
                ? [`Operator export review for ${record.client_name} · in progress`, 'Validate export manifest and jurisdiction controls · in progress']
                : [`Boundary approval review for ${record.client_name} · waiting`, 'Approve or hold external delivery package · waiting'];
    case 'exception_dispute_remediation':
        return role === 'REQUESTER'
            ? [`Open exception case for ${record.client_name} · waiting`, 'Collect dispute narrative and expected remediation outcome · waiting']
            : role === 'OPERATOR'
                ? [`Operator remediation plan for ${record.client_name} · in progress`, 'Review evidence and assign remediation owner · in progress']
                : [`Dispute closure approval for ${record.client_name} · waiting`, 'Hold closure until evidence and approval fields are complete · waiting'];
    case 'advisor_client_intake':
    default:
        return role === 'REQUESTER'
            ? [`Create client intake for ${record.client_name} · waiting`, 'Prepare advisor pre-meeting brief · in progress']
            : role === 'OPERATOR'
                ? [`Operator review for ${record.client_name} intake · in progress`, 'Review CRM-ready draft before compliance handoff · in progress']
                : [`Compliance review request for ${record.client_name} · waiting`, 'Hold CRM handoff until compliance fields are complete · waiting'];
    }
}

function toInboxItems(record: LocalRoleLabTaskRecord): RequesterInboxItem[] {
    const missingFields = record.missing_compliance_fields.join(', ');
    const common = {
        correlation_id: record.correlation_id,
        updated_at: record.updated_at,
        workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE' as const,
        environment_kind: 'SIMULATOR' as const,
        is_demo_data: false,
        is_pilot_evidence: false,
    };
    return [
        {
            task_id: record.task_id,
            goal: buildWorkItems(record, 'REQUESTER')[0]!.split(' · ')[0],
            task_status: 'WAITING_USER',
            group: 'WAITING',
            summary: buildWorkItems(record, 'REQUESTER')[0]!.split(' · ')[1] ? `Requester staged ${record.client_name} in the sandbox.` : `Requester staged ${record.client_name}.`,
            blocker_summary: `Missing fields: ${missingFields}`,
            receipt_summary: taskReceiptSummary(record),
            actor_role: 'REQUESTER',
            actor_label: 'Local Requester',
            ...common,
        },
        {
            task_id: `${record.task_id}__operator`,
            goal: buildWorkItems(record, 'OPERATOR')[0]!.split(' · ')[0],
            task_status: 'RUNNING',
            group: 'IN_PROGRESS',
            summary: buildWorkItems(record, 'OPERATOR')[1] || buildWorkItems(record, 'OPERATOR')[0]!,
            blocker_summary: `Missing fields: ${missingFields}`,
            receipt_summary: 'Operator review requested from sandbox brief.',
            actor_role: 'OPERATOR',
            actor_label: 'Local Operator',
            ...common,
        },
        {
            task_id: `${record.task_id}__tenant_admin`,
            goal: buildWorkItems(record, 'TENANT_ADMIN')[0]!.split(' · ')[0],
            task_status: 'WAITING_USER',
            group: 'WAITING',
            summary: buildWorkItems(record, 'TENANT_ADMIN')[1] || buildWorkItems(record, 'TENANT_ADMIN')[0]!,
            blocker_summary: record.external_handoff_guard,
            receipt_summary: taskReceiptSummary(record),
            actor_role: 'TENANT_ADMIN',
            actor_label: 'Local Tenant Admin',
            ...common,
        },
    ];
}

function taskDetailSummary(record: LocalRoleLabTaskRecord): TrialTaskDetailSummary {
    return {
        task_id: record.task_id,
        title: record.scenario_title,
        lifecycle: record.lifecycle,
        receipt_summary: taskReceiptSummary(record),
        missing_fields: [...record.missing_compliance_fields],
        handoff_lines: buildHandoffTimeline(record).map((step) => `${step.title} · ${step.status.toLowerCase()}`),
        approval_summary: record.external_handoff_guard,
    };
}

function roleSummaryFor(record: LocalRoleLabTaskRecord, role: EnterpriseOARole): EnterpriseSandboxRoleSummary {
    if (record.scenario_id === 'oa_full_cycle_governed_execution') {
        const title = role.toLowerCase().replace(/_/g, ' ');
        const summary = role === 'REQUESTER'
            ? `Starts the governed execution cycle for ${record.client_name}.`
            : role === 'APPROVER'
                ? 'Owns bounded approval release for the example.'
                : role === 'OPERATOR'
                    ? 'Owns active operational package assembly and handoff continuity.'
                    : role === 'REVIEWER'
                        ? 'Validates evidence quality and review blockers.'
                        : role === 'TENANT_ADMIN'
                            ? 'Owns final tenant-level readiness and progression boundary.'
                            : role === 'WORKSPACE_ADMIN'
                                ? 'Owns workspace assignment, seat, and participation governance.'
                                : role === 'POLICY_GOVERNANCE_ADMIN'
                                    ? 'Owns policy pack and governance posture for the example.'
                                    : role === 'INTEGRATION_ADMIN'
                                        ? 'Owns connector, credential, and integration readiness.'
                                        : 'Owns read-only audit visibility and receipt verification.';
        return {
            role,
            title: `${title} seat`,
            summary,
            focus: buildWorkItems(record, role)[0] || 'Follow the 9-role OA workflow.',
        };
    }
    switch (role) {
    case 'REQUESTER':
        return {
            role,
            title: 'Requester seat',
            summary: `Starts the ${record.scenario_title} workflow and sees whether the request is progressing, blocked, or waiting.`,
            focus: buildWorkItems(record, role)[0] || 'Submit the initial enterprise request.',
        };
    case 'OPERATOR':
        return {
            role,
            title: 'Operator seat',
            summary: `Owns the active review stage for ${record.client_name} and keeps cross-role handoff explicit.`,
            focus: buildWorkItems(record, role)[0] || 'Review missing fields and prepare the next handoff.',
        };
    case 'TENANT_ADMIN':
    default:
        return {
            role: 'TENANT_ADMIN',
            title: 'Tenant-admin seat',
            summary: 'Owns the final sandbox approval / boundary and keeps the trial-to-pilot gap visible.',
            focus: buildWorkItems(record, 'TENANT_ADMIN')[0] || 'Review readiness, gaps, and final approval posture.',
        };
    }
}

function walkthroughSteps(record: LocalRoleLabTaskRecord): EnterpriseSandboxWalkthroughStep[] {
    if (record.scenario_id === 'oa_full_cycle_governed_execution') {
        return [
            { step_id: `${record.task_id}__requester`, role: 'REQUESTER', title: `Requester initiates ${record.client_name}`, status: 'DONE', summary: 'Business request and expected outcome are staged in the B-end platform.' },
            { step_id: `${record.task_id}__approver`, role: 'APPROVER', title: `Approver releases bounded scope`, status: 'CURRENT', summary: 'Approval posture is explicit before broader execution continues.' },
            { step_id: `${record.task_id}__operator`, role: 'OPERATOR', title: `Operator assembles governed package`, status: 'UPCOMING', summary: 'Operator prepares the work package and coordinates missing data.' },
            { step_id: `${record.task_id}__reviewer`, role: 'REVIEWER', title: `Reviewer validates evidence`, status: 'UPCOMING', summary: 'Evidence quality, blockers, and readiness are reviewed.' },
            { step_id: `${record.task_id}__tenant_admin`, role: 'TENANT_ADMIN', title: `Tenant Admin confirms enterprise gate`, status: 'UPCOMING', summary: 'Tenant-level readiness and final boundary remain explicit.' },
            { step_id: `${record.task_id}__workspace_admin`, role: 'WORKSPACE_ADMIN', title: `Workspace Admin confirms workspace scope`, status: 'UPCOMING', summary: 'Seat ownership and workspace participation remain visible.' },
            { step_id: `${record.task_id}__policy_admin`, role: 'POLICY_GOVERNANCE_ADMIN', title: `Policy / Governance Admin checks policy basis`, status: 'UPCOMING', summary: 'Policy pack / override posture is reviewed before release.' },
            { step_id: `${record.task_id}__integration_admin`, role: 'INTEGRATION_ADMIN', title: `Integration Admin checks connector readiness`, status: 'UPCOMING', summary: 'Connector and credential readiness are confirmed inside the platform.' },
            { step_id: `${record.task_id}__auditor`, role: 'AUDITOR', title: `Auditor confirms receipt visibility`, status: 'UPCOMING', summary: 'Audit-facing receipt and export visibility are the final read-only checkpoint.' },
        ];
    }
    return buildHandoffTimeline(record).map((step, index) => ({
        step_id: step.step_id,
        role: (step.to_role || step.from_role || 'TENANT_ADMIN') as EnterpriseOARole,
        title: step.title,
        status: index === 0 ? 'DONE' : index === 1 ? 'CURRENT' : 'UPCOMING',
        summary: step.summary,
    }));
}

function outcomeSummary(record: LocalRoleLabTaskRecord): EnterpriseSandboxOutcomeSummary {
    if (record.scenario_id === 'oa_full_cycle_governed_execution') {
        return {
            headline: `9-role OA cycle staged for ${record.client_name}`,
            status: 'REVIEW_REQUIRED',
            summary: 'All 9 OA roles are represented in one governed example, but final progression remains intentionally blocked inside the sandbox.',
            detail_lines: [
                `Missing governance fields: ${record.missing_compliance_fields.join(', ')}`,
                'The example demonstrates role coverage, not real pilot completion.',
                'Approval, review, policy, integration, workspace governance, and audit remain explicit inside the B-end flow.',
            ],
        };
    }
    const missing = record.missing_compliance_fields.join(', ');
    if (record.scenario_id === 'cross_boundary_export_review') {
        return {
            headline: `Export held for ${record.client_name}`,
            status: 'REVIEW_REQUIRED',
            summary: 'Cross-boundary export is staged, but boundary review and destination controls remain incomplete.',
            detail_lines: [
                `Missing review fields: ${missing}`,
                'External delivery remains blocked until boundary approval is complete.',
                'This sandbox run demonstrates boundary review, not real export execution.',
            ],
        };
    }
    if (record.scenario_id === 'exception_dispute_remediation') {
        return {
            headline: `Remediation review open for ${record.client_name}`,
            status: 'REVIEW_REQUIRED',
            summary: 'Exception handling is recorded, but remediation evidence and approval are still missing.',
            detail_lines: [
                `Missing remediation fields: ${missing}`,
                'Dispute closure remains blocked until approval-required fields are complete.',
                'This sandbox run demonstrates dispute handling, not real closure execution.',
            ],
        };
    }
    return {
        headline: `Client intake staged for ${record.client_name}`,
        status: 'HANDOFF_BLOCKED',
        summary: 'Intake is prepared and compliance review is requested, but CRM handoff remains blocked until required fields are complete.',
        detail_lines: [
            `Missing compliance-required fields: ${missing}`,
            'Operator review is required before compliance review can complete.',
            record.connector_requested
                ? 'CRM handoff is intentionally blocked until the operator closes the compliance gaps.'
                : 'Connector path is not involved in this sandbox task.',
        ],
    };
}

function baseGapLines(summary: ProductShellSummary | null): string[] {
    if (!summary?.local_role_lab.enabled) {
        return ['A real pilot still needs a real environment binding, real operator access, a named requester, a tenant-admin/support touchpoint, and the first real task/session/run artifact.'];
    }
    return [
        summary.local_role_lab.pilot_activation_gap_summary,
        summary.local_role_lab.day_zero_blocked_summary,
    ].filter(Boolean);
}

function countByGroup(items: RequesterInboxItem[], group: RequesterInboxGroup): number {
    return items.filter((item) => item.group === group).length;
}

export function listScenarioTemplates(): LocalRoleLabScenarioTemplate[] {
    return [...SCENARIO_TEMPLATES];
}

export function defaultLocalRoleLabBrief(templateId: LocalRoleLabScenarioTemplateId = 'advisor_client_intake'): string {
    return scenarioTemplateById(templateId).default_brief;
}

export { parseRequesterBrief };

export function listLocalRoleLabTasks(): LocalRoleLabTaskRecord[] {
    return readState().tasks.sort((a, b) => b.updated_at - a.updated_at);
}

export function getTrialWorkspaceState(): TrialWorkspaceState {
    return readState();
}

export function registerTrialWorkspaceSession(params: {
    labActorId?: string;
    oaRole?: EnterpriseOARole;
    page: string;
    section: string;
}): TrialSessionRecord {
    const state = readState();
    const participant = participantForLabActorId(state, params.labActorId);
    const sessionStorage = getSessionStorage();
    const existingSessionId = sessionStorage?.getItem(SESSION_STORAGE_KEY);
    const trialSessionId = existingSessionId || randomId('trial_session');
    if (sessionStorage && !existingSessionId) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, trialSessionId);
    }
    const timestamp = now();
    const next: TrialSessionRecord = {
        trial_session_id: trialSessionId,
        trial_workspace_id: state.workspace.trial_workspace_id,
        participant_id: participant.participant_id,
        actor_role: participant.actor_role,
        current_page: params.page,
        current_section: params.section,
        created_at: timestamp,
        last_seen_at: timestamp,
    };
    const sessions = [
        next,
        ...state.sessions.filter((session) => session.trial_session_id !== trialSessionId),
    ].slice(0, 24);
    writeState({
        ...state,
        sessions,
        participants: state.participants.map((item) =>
            item.participant_id === participant.participant_id
                ? { ...item, state: 'VIEWING', updated_at: timestamp }
                : item
        ),
        workspace: {
            ...state.workspace,
            updated_at: timestamp,
        },
    });
    return next;
}

export async function registerSharedTrialWorkspaceSession(params: {
    labActorId?: string;
    oaRole?: EnterpriseOARole;
    page: string;
    section: string;
}): Promise<void> {
    try {
        await registerServerTrialWorkspaceSession({
            workspaceMode: 'local_lab',
            labActorId: params.labActorId,
            oaRole: params.oaRole,
            page: params.page,
            section: params.section,
        });
    } catch {
        registerTrialWorkspaceSession(params);
    }
}

export function createLocalRoleLabTaskFromBrief(
    brief: string,
    options?: { templateId?: LocalRoleLabScenarioTemplateId; labActorId?: string }
): LocalRoleLabTaskRecord {
    const state = readState();
    const templateId = options?.templateId || inferScenarioTemplateId(brief);
    const template = scenarioTemplateById(templateId);
    const parsed = parseRequesterBrief(brief);
    const participant = participantForLabActorId(state, options?.labActorId || 'local_requester_01');
    const timestamp = now();
    const record: LocalRoleLabTaskRecord = {
        task_id: `trial_task_${timestamp}`,
        correlation_id: `trial_corr_${timestamp}`,
        trial_workspace_id: state.workspace.trial_workspace_id,
        created_by_participant_id: participant.participant_id,
        scenario_id: template.template_id,
        scenario_title: template.title,
        scenario_summary: template.summary,
        requester_brief: brief,
        ...parsed,
        missing_compliance_fields: [...template.missing_fields],
        operator_review_required: true,
        compliance_review_requested: true,
        connector_requested: template.connector_involved,
        lifecycle: taskLifecycleFor({
            task_id: '',
            correlation_id: '',
            trial_workspace_id: '',
            created_by_participant_id: '',
            scenario_id: template.template_id,
            scenario_title: template.title,
            scenario_summary: template.summary,
            requester_brief: brief,
            ...parsed,
            missing_compliance_fields: [...template.missing_fields],
            operator_review_required: true,
            compliance_review_requested: true,
            connector_requested: template.connector_involved,
            lifecycle: 'REQUESTED',
            receipt_summary: '',
            created_at: timestamp,
            updated_at: timestamp,
        }),
        receipt_summary: template.connector_involved
            ? 'Connector-adjacent handoff remains blocked until the sandbox review is complete.'
            : 'No external connector path is involved in this sandbox scenario.',
        created_at: timestamp,
        updated_at: timestamp,
    };
    const nextState: TrialWorkspaceState = {
        ...state,
        workspace: {
            ...state.workspace,
            status: 'REHEARSAL_IN_PROGRESS',
            active_template_id: template.template_id,
            updated_at: timestamp,
        },
        tasks: [record, ...state.tasks].slice(0, 24),
        participants: state.participants.map((item) =>
            item.participant_id === participant.participant_id
                ? { ...item, state: 'ACTIVE', updated_at: timestamp }
                : item
        ),
    };
    writeState(nextState);
    return record;
}

export function createLocalRoleLabTaskFromTemplate(
    templateId: LocalRoleLabScenarioTemplateId,
    options?: { labActorId?: string }
): LocalRoleLabTaskRecord {
    const template = scenarioTemplateById(templateId);
    return createLocalRoleLabTaskFromBrief(template.default_brief, {
        templateId,
        labActorId: options?.labActorId,
    });
}

export async function createSharedTrialTaskFromBrief(
    brief: string,
    options?: { templateId?: LocalRoleLabScenarioTemplateId; labActorId?: string }
): Promise<{ taskId: string }> {
    try {
        const response = await createTrialWorkspaceTask({
            workspaceMode: 'local_lab',
            labActorId: options?.labActorId,
            templateId: options?.templateId || inferScenarioTemplateId(brief),
            requesterBrief: brief,
        });
        return { taskId: response.task.task_id };
    } catch {
        const record = createLocalRoleLabTaskFromBrief(brief, options);
        return { taskId: record.task_id };
    }
}

export async function createSharedTrialTaskFromTemplate(
    templateId: LocalRoleLabScenarioTemplateId,
    options?: { labActorId?: string }
): Promise<{ taskId: string }> {
    const template = scenarioTemplateById(templateId);
    return createSharedTrialTaskFromBrief(template.default_brief, {
        templateId,
        labActorId: options?.labActorId,
    });
}

export async function createSharedTrialInvite(
    role: EnterpriseOARole,
    label?: string,
): Promise<void> {
    try {
        await createTrialWorkspaceInvite({
            workspaceMode: 'local_lab',
            role,
            label,
        });
    } catch {
        const state = readState();
        const timestamp = now();
        writeState({
            ...state,
            invites: [
                {
                    invite_id: randomId('trial_invite'),
                    trial_workspace_id: state.workspace.trial_workspace_id,
                    seat_id: `trial_seat_${role.toLowerCase()}`,
                    actor_role: role,
                    invite_code: randomId('invite_code'),
                    label: label || `${role.toLowerCase().replace(/_/g, ' ')} invite`,
                    status: 'OPEN',
                    created_at: timestamp,
                    updated_at: timestamp,
                },
                ...state.invites,
            ].slice(0, 20),
        });
    }
}

export async function acceptSharedTrialInvite(input: {
    inviteCode: string;
    actorLabel?: string;
}): Promise<{
    participantId: string;
    actorRole: EnterpriseOARole;
    actorLabel: string;
    seatId: string;
}> {
    try {
        const response = await acceptTrialWorkspaceInvite({
            workspaceMode: 'local_lab',
            inviteCode: input.inviteCode,
            actorLabel: input.actorLabel,
        });
        return {
            participantId: response.participant.participant_id,
            actorRole: response.participant.oa_role || response.participant.actor_role || 'TENANT_ADMIN',
            actorLabel: response.participant.actor_label,
            seatId: response.participant.seat_id,
        };
    } catch {
        const state = readState();
        const timestamp = now();
        const invite = state.invites.find((item) => item.invite_code === input.inviteCode && item.status === 'OPEN');
        if (!invite) {
            throw new Error('Trial invite not found');
        }
        const participant: TrialParticipantRecord = {
            participant_id: randomId('participant'),
            trial_workspace_id: state.workspace.trial_workspace_id,
            actor_role: invite.actor_role,
            actor_label: input.actorLabel || `Joined ${invite.actor_role.toLowerCase().replace(/_/g, ' ')}`,
            seat_id: invite.seat_id,
            summary: `Accepted invite for ${invite.actor_role.toLowerCase().replace(/_/g, ' ')} seat.`,
            state: 'ACTIVE',
            invite_id: invite.invite_id,
            created_at: timestamp,
            updated_at: timestamp,
        };
        writeState({
            ...state,
            participants: [
                participant,
                ...state.participants.map((item) =>
                    item.participant_id === `participant_${invite.actor_role.toLowerCase()}_01`
                        ? { ...item, state: 'READY' as TrialParticipantState, updated_at: timestamp }
                        : item
                ),
            ],
            seats: state.seats.map((seat) =>
                seat.seat_id === invite.seat_id
                    ? {
                        ...seat,
                        claim_status: 'CLAIMED',
                        assigned_participant_id: participant.participant_id,
                        claimed_via_invite_id: invite.invite_id,
                        updated_at: timestamp,
                    }
                    : seat
            ),
            invites: state.invites.map((item) =>
                item.invite_id === invite.invite_id
                    ? { ...item, status: 'ACCEPTED', accepted_participant_id: participant.participant_id, accepted_at: timestamp, updated_at: timestamp }
                    : item
            ),
        });
        return {
            participantId: participant.participant_id,
            actorRole: participant.actor_role,
            actorLabel: participant.actor_label,
            seatId: participant.seat_id,
        };
    }
}

export async function releaseSharedTrialSeat(seatId: string): Promise<void> {
    try {
        await releaseTrialWorkspaceSeat({
            workspaceMode: 'local_lab',
            seatId,
        });
    } catch {
        const state = readState();
        const seat = state.seats.find((item) => item.seat_id === seatId);
        const baseParticipantId = seat?.role === 'REQUESTER'
            ? 'participant_requester_01'
            : seat?.role === 'OPERATOR'
                ? 'participant_operator_01'
                : 'participant_tenant_admin_01';
        writeState({
            ...state,
            seats: state.seats.map((seat) =>
                seat.seat_id === seatId
                    ? {
                        ...seat,
                        claim_status: 'ASSIGNED_BASE',
                        assigned_participant_id: baseParticipantId,
                        claimed_via_invite_id: undefined,
                        updated_at: now(),
                    }
                    : seat
            ),
            participants: state.participants.filter((participant) =>
                participant.seat_id !== seatId || participant.participant_id === baseParticipantId
            ),
        });
    }
}

export function subscribeLocalRoleLabTasks(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onUpdate = () => listener();
    window.addEventListener(UPDATE_EVENT, onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
        window.removeEventListener(UPDATE_EVENT, onUpdate);
        window.removeEventListener('storage', onUpdate);
    };
}

export function mergeLocalRoleLabRequesterInbox(
    baseSummary: RequesterInboxSummary,
    records: LocalRoleLabTaskRecord[],
): RequesterInboxSummary {
    if (records.length === 0) return baseSummary;
    const mergedItems = [...records.flatMap(toInboxItems), ...baseSummary.items]
        .sort((a, b) => b.updated_at - a.updated_at);
    return {
        ...baseSummary,
        total_count: mergedItems.length,
        in_progress_count: countByGroup(mergedItems, 'IN_PROGRESS'),
        blocked_count: countByGroup(mergedItems, 'BLOCKED'),
        waiting_count: countByGroup(mergedItems, 'WAITING'),
        completed_count: countByGroup(mergedItems, 'COMPLETED'),
        items: mergedItems,
    };
}

export function buildEnterpriseSandboxModel(
    summary: ProductShellSummary | null,
    records: LocalRoleLabTaskRecord[],
): EnterpriseSandboxModel {
    const state = readState();
    const serverTrial = summary?.trial_workspace;
    const record = records[0];
    const activeTemplateId = serverTrial?.trial_workspace.active_template_id || record?.scenario_id || state.workspace.active_template_id;
    const activeTemplate = scenarioTemplateById(activeTemplateId);
    const walkthrough = record
        ? walkthroughSteps(record)
        : activeTemplate.role_focus.map((role, index) => ({
            step_id: `${activeTemplate.template_id}_${role.toLowerCase()}`,
            role,
            title: index === 0
                ? `${role.toLowerCase().replace(/_/g, ' ')} starts ${activeTemplate.title}`
                : index === 1
                    ? `${role.toLowerCase().replace(/_/g, ' ')} reviews the sandbox package`
                    : `${role.toLowerCase().replace(/_/g, ' ')} holds the final boundary`,
            status: index === 0 ? 'CURRENT' : 'UPCOMING',
            summary: activeTemplate.summary,
        }));
    const roleSummaries = activeTemplate.role_focus.map((role) =>
        record ? roleSummaryFor(record, role) : ({
            role,
            title: `${role.toLowerCase().replace(/_/g, ' ')} seat`,
            summary: `This seat participates in ${activeTemplate.title}.`,
            focus: 'Open the matching role page to continue the trial rehearsal.',
        })
    );
    const outcome = record
        ? outcomeSummary(record)
        : {
            headline: activeTemplate.title,
            status: 'READY_TO_REHEARSE' as const,
            summary: 'No shared sandbox run is active yet. Start a scenario to create a durable trial task and visible multi-role handoff chain.',
            detail_lines: [
                activeTemplate.expected_outcome,
                activeTemplate.connector_involved
                    ? 'Connector-adjacent behavior is visible, but remains non-pilot and blocked from real execution.'
                    : 'No external connector path is involved in this sandbox scenario.',
            ],
        };

    return {
        headline: 'Enterprise Sandbox',
        subtitle: 'Shared trial workspace for B-end evaluation. Participants, sessions, and trial tasks are durable within the sandbox boundary and never count as REAL_PILOT evidence.',
        active_template_id: activeTemplateId,
        active_template_title: activeTemplate.title,
        scenario_cards: listScenarioTemplates().map((template) => ({
            template_id: template.template_id,
            title: template.title,
            summary: template.summary,
            starter_role: template.starter_role,
            role_focus: template.role_focus.map((role) => role.toLowerCase().replace(/_/g, ' ')),
            expected_outcome: template.expected_outcome,
            connector_label: template.connector_involved ? 'Connector-aware sandbox' : 'Internal sandbox flow',
            status: template.template_id === activeTemplateId ? 'ACTIVE' : 'READY',
        })),
        walkthrough_title: `${activeTemplate.title} walkthrough`,
        walkthrough_summary: activeTemplate.template_id === 'oa_full_cycle_governed_execution'
            ? 'Follow all 9 OA roles through one governed B-end execution cycle without confusing sandbox rehearsal with real pilot evidence.'
            : 'Follow requester → operator → tenant-admin through a shared trial workspace without confusing rehearsal with real pilot evidence.',
        walkthrough_steps: walkthrough,
        role_summaries: roleSummaries,
        outcome_summary: outcome,
        gap_title: 'Trial-to-pilot conversion gap',
        gap_lines: [
            ...baseGapLines(summary),
            'Trial workspace activity improves enterprise evaluation but never clears the real pilot activation gate.',
        ],
        non_pilot_label: summary?.local_role_lab.evidence_classification_summary
            || 'All enterprise sandbox artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.',
        trial_workspace: serverTrial
            ? {
                trial_workspace_id: serverTrial.trial_workspace.trial_workspace_id,
                label: serverTrial.trial_workspace.label,
                summary: serverTrial.trial_workspace.summary,
                status: serverTrial.trial_workspace.status,
                participant_count: serverTrial.participants.length,
                active_session_count: serverTrial.sessions.length,
                task_count: serverTrial.tasks.length,
            }
            : {
                trial_workspace_id: state.workspace.trial_workspace_id,
                label: state.workspace.label,
                summary: state.workspace.summary,
                status: state.workspace.status,
                participant_count: state.participants.length,
                active_session_count: state.sessions.length,
                task_count: state.tasks.length,
            },
        seats: serverTrial?.seats || state.seats,
        participants: serverTrial?.participants || state.participants,
        invites: serverTrial?.invites || state.invites,
        sessions: serverTrial?.sessions || state.sessions.sort((a, b) => b.last_seen_at - a.last_seen_at),
        active_task_detail: serverTrial?.active_task_detail || (record ? taskDetailSummary(record) : undefined),
        persistence_detail: serverTrial?.persistence_detail,
        deployment_blocker: serverTrial?.deployment_blocker,
        join_instructions: serverTrial?.join_instructions || [
            'Create an invite for the required role seat.',
            'Accept the invite to claim the seat in the shared trial workspace.',
            'Release the seat when the evaluation handoff is finished.',
        ],
        conversion_guidance_lines: serverTrial?.conversion_guidance_lines || [
            'Promote to pilot only after real environment binding, real operator access, named requester, and tenant-admin/support touchpoint exist.',
            'Do not reuse sandbox artifacts as pilot evidence.',
            'Use sandbox sessions to prove multi-role workflow comprehension before opening a real pilot workspace.',
        ],
    };
}

export function mergeLocalRoleLabProductShellSummary(
    baseSummary: ProductShellSummary,
    records: LocalRoleLabTaskRecord[],
): ProductShellSummary {
    if (baseSummary.trial_workspace && baseSummary.trial_workspace.tasks.length > 0) {
        return baseSummary;
    }
    if (records.length === 0) return baseSummary;
    const latest = records[0];
    const mergedInbox = mergeLocalRoleLabRequesterInbox(baseSummary.requester_inbox, records);
    const mergedTimeline = [
        ...buildHandoffTimeline(latest),
        ...baseSummary.local_role_lab.handoff_timeline,
    ].slice(0, 8);
    const outcome = outcomeSummary(latest);
    const state = readState();
    return {
        ...baseSummary,
        requester_inbox: mergedInbox,
        next_action: `Operator review required for ${latest.client_name}; complete compliance-required fields before compliance review or CRM handoff.`,
        local_role_lab: {
            ...baseSummary.local_role_lab,
            summary: `${state.workspace.summary} ${state.tasks.length} shared sandbox task(s) are now tracked in this trial workspace.`,
            scenario: {
                ...baseSummary.local_role_lab.scenario,
                scenario_id: latest.scenario_id,
                title: `${latest.scenario_title} · ${latest.client_name}`,
                summary: latest.scenario_summary,
                current_stage: buildHandoffTimeline(latest)[1]?.title || latest.scenario_title,
                focus_points: [
                    `Missing fields: ${latest.missing_compliance_fields.join(', ')}`,
                    ...baseSummary.local_role_lab.scenario.focus_points,
                ].slice(0, 4),
            },
            handoff_timeline: mergedTimeline,
            pilot_activation_gap_summary: `${baseSummary.local_role_lab.pilot_activation_gap_summary} Trial workspace activity stays explicitly non-pilot and cannot clear the real pilot gap.`,
        },
        activation_package: {
            ...baseSummary.activation_package,
            summary: `${baseSummary.activation_package.summary} Trial workspace outcome: ${outcome.headline}.`,
        },
    };
}

function fallbackWorkspaceOptions(selected: 'current' | 'demo' | 'local_lab'): WorkspaceModeOptionSummary[] {
    return [
        {
            mode: 'current',
            label: 'Current workspace',
            selected: selected === 'current',
            workspace_binding_kind: 'TENANT_WORKSPACE',
            environment_kind: 'PRODUCTION',
            description: 'Use a signed-in enterprise session against the current workspace.',
        },
        {
            mode: 'demo',
            label: 'Demo workspace',
            selected: selected === 'demo',
            workspace_binding_kind: 'DEMO_WORKSPACE',
            environment_kind: 'DEMO',
            description: 'Demo-only workspace lens.',
        },
        {
            mode: 'local_lab',
            label: 'Local role lab',
            selected: selected === 'local_lab',
            workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
            environment_kind: 'SIMULATOR',
            description: 'Shared local sandbox with role switching and trial tasks.',
        },
    ];
}

function fallbackTrialActivities(records: LocalRoleLabTaskRecord[]) {
    const latest = records[0];
    if (!latest) return [];
    return walkthroughSteps(latest).map((step, index) => ({
        activity_id: `${latest.task_id}__activity_${index}`,
        trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
        oa_role: step.role,
        summary: step.summary,
        task_id: latest.task_id,
        created_at: latest.updated_at - index,
    }));
}

export function buildLocalRoleLabFallbackProductShellSummary(
    records: LocalRoleLabTaskRecord[] = listLocalRoleLabTasks(),
): ProductShellSummary {
    const timestamp = now();
    const state = readState();
    const latest = records[0];
    const activeTemplate = latest ? scenarioTemplateById(latest.scenario_id) : scenarioTemplateById(state.workspace.active_template_id);
    const requesterInbox = mergeLocalRoleLabRequesterInbox({
        generated_at: timestamp,
        total_count: 0,
        in_progress_count: 0,
        blocked_count: 0,
        waiting_count: 0,
        completed_count: 0,
        items: [],
    }, records);
    const currentStage = latest
        ? walkthroughSteps(latest).find((step) => step.status === 'CURRENT')?.title || activeTemplate.title
        : activeTemplate.title;
    const actors = state.participants.map((participant) => ({
        actor_id: participant.actor_role === 'REQUESTER'
            ? 'local_requester_01'
            : participant.actor_role === 'OPERATOR'
                ? 'local_operator_01'
                : 'local_tenant_admin_01',
        role: participant.actor_role,
        actor_label: participant.actor_label,
        session_id: state.sessions.find((session) => session.participant_id === participant.participant_id)?.trial_session_id || `session_${participant.actor_role.toLowerCase()}`,
        summary: participant.summary,
        is_active: participant.state === 'VIEWING' || participant.state === 'ACTIVE',
        is_demo_data: false,
        is_pilot_evidence: false,
    }));
    const trialWorkspace: TrialWorkspaceSummary = {
        trial_workspace: {
            trial_workspace_id: state.workspace.trial_workspace_id,
            workspace_key: state.workspace.trial_workspace_id,
            label: state.workspace.label,
            summary: state.workspace.summary,
            status: state.workspace.status,
            active_template_id: latest?.scenario_id || state.workspace.active_template_id,
            created_at: state.workspace.created_at,
            updated_at: state.workspace.updated_at,
        },
        seats: state.seats.map((seat) => ({
            ...seat,
            role: seat.role as EnterpriseOARole,
            actor_role: seat.role,
        })),
        participants: state.participants.map((participant) => ({
            ...participant,
            oa_role: participant.actor_role as EnterpriseOARole,
        })),
        invites: state.invites.map((invite) => ({
            ...invite,
            oa_role: invite.actor_role as EnterpriseOARole,
        })),
        sessions: state.sessions.map((session) => ({
            session_id: session.trial_session_id,
            trial_workspace_id: session.trial_workspace_id,
            participant_id: session.participant_id,
            actor_role: session.actor_role,
            oa_role: session.actor_role as EnterpriseOARole,
            current_page: session.current_page,
            current_section: session.current_section,
            created_at: session.created_at,
            last_seen_at: session.last_seen_at,
        })),
        tasks: records.map((record) => ({
            task_id: record.task_id,
            trial_workspace_id: record.trial_workspace_id,
            created_by_participant_id: record.created_by_participant_id,
            scenario_id: record.scenario_id,
            scenario_title: record.scenario_title,
            scenario_summary: record.scenario_summary,
            requester_brief: record.requester_brief,
            client_name: record.client_name,
            jurisdiction: record.jurisdiction,
            priority: record.priority,
            required_outcome: record.required_outcome,
            external_handoff_guard: record.external_handoff_guard,
            missing_data_policy: record.missing_data_policy,
            missing_fields: [...record.missing_compliance_fields],
            operator_review_required: record.operator_review_required,
            compliance_review_requested: record.compliance_review_requested,
            connector_requested: record.connector_requested,
            lifecycle: record.lifecycle,
            receipt_summary: record.receipt_summary,
            created_at: record.created_at,
            updated_at: record.updated_at,
        })),
        activities: fallbackTrialActivities(records),
        active_task_detail: latest ? taskDetailSummary(latest) : undefined,
        persistence_state: 'MEMORY_ONLY',
        persistence_detail: 'Browser-only local role lab fallback is active.',
        join_instructions: [
            'Create an invite for the required role seat.',
            'Accept the invite to claim the seat in the shared trial workspace.',
            'Release the seat when the rehearsal handoff is finished.',
        ],
        conversion_guidance_lines: [
            'Keep sandbox activity non-pilot and inside the enterprise platform.',
            'Promote to pilot only when real environment, actor, and support evidence exists.',
        ],
    };

    return {
        generated_at: timestamp,
        environment_activation: {
            generated_at: timestamp,
            environment_kind: 'SIMULATOR',
            environment_label: state.workspace.label,
            workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
            workspace_mode: 'local_lab',
            workspace_id: state.workspace.trial_workspace_id,
            pilot_activation_status: 'NOT_APPLICABLE',
            simulator_backing: true,
            demo_mode_enabled: false,
            workspace_options: fallbackWorkspaceOptions('local_lab'),
            missing_dependency_codes: ['real_pilot_artifacts_missing'],
            missing_dependency_summaries: ['Local role lab is non-pilot and cannot satisfy real pilot activation evidence.'],
            environment_binding: {
                state: 'BOUND',
                environment_kind: 'SIMULATOR',
                environment_label: state.workspace.label,
                workspace_id: state.workspace.trial_workspace_id,
                summary: 'Browser-local sandbox binding is active for enterprise rehearsal only.',
                source: 'LOCAL_SYNTHETIC',
            },
            actor_availability: actors.map((actor) => ({
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
                summary: 'Identity is simulated in local role lab.',
                issues: ['local_lab_only'],
                is_demo_data: false,
                is_pilot_evidence: false,
            },
            connector_readiness: {
                state: latest?.connector_requested ? 'DEMO_ONLY' : 'READY',
                summary: latest?.connector_requested
                    ? 'Connector posture is simulated for sandbox rehearsal.'
                    : 'No connector dependency is active for the current local sandbox state.',
                issues: latest?.connector_requested ? ['connector_simulated'] : [],
                is_demo_data: false,
                is_pilot_evidence: false,
            },
            vault_readiness: {
                state: 'DEMO_ONLY',
                summary: 'Vault / credential posture is simulated in local role lab.',
                issues: ['vault_simulated'],
                is_demo_data: false,
                is_pilot_evidence: false,
            },
            connector_activation: {
                state: latest?.connector_requested ? 'DEMO_ONLY' : 'INELIGIBLE',
                summary: latest?.connector_requested
                    ? 'Connector activation remains simulated in local role lab.'
                    : 'No connector activation is required for the current local sandbox state.',
                source: 'LOCAL_SYNTHETIC',
            },
            activation_ready: false,
            activation_ready_summary: 'Local role lab remains rehearsal-only and does not satisfy real pilot activation.',
            is_demo_data: false,
            is_pilot_evidence: false,
        },
        enterprise_account: {
            signed_in: false,
            role_badges: [],
            available_roles: [],
            module_access: [],
            active_bindings: [],
            pending_invites: [],
            summary: 'Local role lab fallback shell',
        },
        requester_inbox: requesterInbox,
        tenant_admin_setup: {
            status: 'BLOCKED',
            title: 'Tenant Admin Setup / Activation',
            summary: 'Local role lab is healthy for rehearsal but remains blocked from real pilot activation.',
            detail_lines: [
                'Local role lab is running without a live enterprise backend.',
                'Sandbox evidence remains blocked from REAL_PILOT promotion.',
            ],
            missing_dependency_codes: ['real_pilot_artifacts_missing'],
            actor_availability: [],
            identity_readiness: {
                state: 'DEMO_ONLY',
                summary: 'Identity is simulated in local role lab.',
                issues: ['local_lab_only'],
                is_demo_data: false,
                is_pilot_evidence: false,
            },
            connector_readiness: {
                state: latest?.connector_requested ? 'DEMO_ONLY' : 'READY',
                summary: latest?.connector_requested ? 'Connector posture is simulated in local role lab.' : 'No connector dependency is active.',
                issues: latest?.connector_requested ? ['connector_simulated'] : [],
                is_demo_data: false,
                is_pilot_evidence: false,
            },
            vault_readiness: {
                state: 'DEMO_ONLY',
                summary: 'Vault posture is simulated in local role lab.',
                issues: ['vault_simulated'],
                is_demo_data: false,
                is_pilot_evidence: false,
            },
            is_demo_data: false,
            is_pilot_evidence: false,
        },
        policy_studio: {
            generated_at: timestamp,
            pack_name: 'Local Governance Pack',
            pack_version: 'preview',
            pack_fingerprint: 'local-role-lab',
            override_count: 0,
            summary: 'Local fallback policy posture keeps sandbox activity explicitly non-pilot.',
            rollout_summary: 'Policy rollout remains simulated in local role lab.',
            simulation_summary: 'Simulation-only policy lens.',
            approval_governance_summary: 'Approvals remain inside the enterprise sandbox.',
            detail_lines: [
                'Local fallback summary keeps policy posture visible without claiming production governance.',
            ],
            is_demo_data: false,
            is_pilot_evidence: false,
        },
        local_role_lab: {
            enabled: true,
            label: state.workspace.label,
            summary: `${state.workspace.summary} ${records.length} shared sandbox task(s) are currently visible.`,
            active_actor_id: actors.find((actor) => actor.is_active)?.actor_id || 'local_tenant_admin_01',
            active_role: actors.find((actor) => actor.is_active)?.role || 'TENANT_ADMIN',
            day_zero_blocked_summary: 'True pilot Day 0 still needs real environment, actor, and support evidence outside the local role lab.',
            scenario: {
                scenario_id: latest?.scenario_id || activeTemplate.template_id,
                title: activeTemplate.title,
                summary: activeTemplate.summary,
                current_stage: currentStage,
                focus_points: ['Local sandbox fallback'],
            },
            handoff_timeline: latest ? buildHandoffTimeline(latest) : [],
            evidence_classification_summary: 'All local role lab artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.',
            pilot_activation_gap_summary: 'Local role lab activity does not clear the real pilot activation gate.',
            actors,
            is_demo_data: false,
            is_pilot_evidence: false,
        },
        demo: {
            enabled: false,
            label: 'Demo workspace',
            summary: 'Demo mode remains separate from the local role lab fallback.',
            seeded_scenarios: [],
            seeded_task_count: 0,
            is_demo_data: true,
            is_pilot_evidence: false,
        },
        activation_package: {
            package_id: 'local_lab_fallback_package',
            status: 'BLOCKED',
            owner_type: 'TENANT_ADMIN_OWNER',
            owner_label: 'Local role lab',
            summary: 'Local fallback shell is active; real enterprise activation inputs are still missing.',
            pending_requirement_count: 1,
            rejected_intake_count: 0,
            recent_intakes: [],
        },
        activation_checklist: [],
        remaining_blockers: [
            {
                code: 'real_pilot_artifacts_missing',
                owner_label: 'Pilot commander',
                summary: 'Real pilot artifacts are still missing.',
                missing_artifact: 'Real environment, actor, and support evidence',
                next_action: 'Keep rehearsal activity inside local_lab until real pilot inputs exist.',
            },
        ],
        evidence_categories: [],
        trial_workspace: trialWorkspace,
        next_action: latest
            ? `Continue the governed workflow for ${latest.client_name} from ${currentStage}.`
            : 'Run a sandbox scenario to create a governed workflow inside local_lab.',
    } as ProductShellSummary;
}

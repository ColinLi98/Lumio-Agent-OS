import type {
    ActorRole,
    EnterpriseOARole,
    ProductShellSummary,
    RequesterInboxItem,
    TrialSeatClaimStatus,
    TrialInviteStatus,
    TrialParticipantState,
    TrialPersistenceState,
    TrialTaskLifecycle,
    TrialWorkspaceActivityRecord,
    TrialWorkspaceInviteRecord,
    TrialWorkspaceParticipantRecord,
    TrialWorkspaceRecord,
    TrialWorkspaceSeatRecord,
    TrialWorkspaceSessionRecord,
    TrialWorkspaceSummary,
    TrialWorkspaceTaskDetailSummary,
    TrialWorkspaceTaskRecord,
} from './contracts.js';

const DEFAULT_TRIAL_WORKSPACE_ID = 'server_trial_workspace_enterprise_sandbox';
const DEFAULT_WORKSPACE_KEY = 'local_lab:trial_workspace:enterprise_sandbox';
const ENTERPRISE_OA_ROLES: EnterpriseOARole[] = [
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

type ScenarioTemplateId =
    | 'advisor_client_intake'
    | 'cross_boundary_export_review'
    | 'exception_dispute_remediation'
    | 'oa_full_cycle_governed_execution';

interface ScenarioTemplate {
    template_id: ScenarioTemplateId;
    title: string;
    summary: string;
    connector_involved: boolean;
    missing_fields: string[];
}

interface TrialWorkspaceState {
    workspace: TrialWorkspaceRecord;
    seats: TrialWorkspaceSeatRecord[];
    participants: TrialWorkspaceParticipantRecord[];
    invites: TrialWorkspaceInviteRecord[];
    sessions: TrialWorkspaceSessionRecord[];
    tasks: TrialWorkspaceTaskRecord[];
    activities: TrialWorkspaceActivityRecord[];
}

const SCENARIO_TEMPLATES: readonly ScenarioTemplate[] = [
    {
        template_id: 'advisor_client_intake',
        title: 'Advisor Client Intake → Compliance Review → CRM Handoff',
        summary: 'Requester starts advisory intake, operator completes missing compliance fields, and tenant admin gates CRM handoff.',
        connector_involved: true,
        missing_fields: ['primary_contact_details', 'source_of_funds', 'risk_profile', 'kyc_status'],
    },
    {
        template_id: 'cross_boundary_export_review',
        title: 'Cross-Boundary Export Review',
        summary: 'Operator and tenant admin hold a cross-boundary export until residency, approval, and destination fields are complete.',
        connector_involved: false,
        missing_fields: ['destination_approval', 'residency_basis', 'export_manifest'],
    },
    {
        template_id: 'exception_dispute_remediation',
        title: 'Exception / Dispute / Remediation Handling',
        summary: 'Operator and tenant admin coordinate dispute evidence, remediation ownership, and closure approval.',
        connector_involved: false,
        missing_fields: ['dispute_evidence', 'remediation_owner', 'approval_resolution'],
    },
    {
        template_id: 'oa_full_cycle_governed_execution',
        title: '9-Role OA Governed Execution Cycle',
        summary: 'A B-end example that explicitly covers all 9 OA roles across request, approval, review, admin, policy, integration, and audit.',
        connector_involved: true,
        missing_fields: ['approval_scope', 'review_evidence', 'policy_basis', 'integration_readiness', 'workspace_assignment', 'audit_export_reference'],
    },
] as const;

function now(): number {
    return Date.now();
}

function randomId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseLabeledValue(lines: string[], label: string): string {
    const prefix = `${label.toLowerCase()}:`;
    const line = lines.find((entry) => entry.toLowerCase().startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : '';
}

function parseRequesterBrief(brief: string) {
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

function templateById(templateId: string): ScenarioTemplate {
    return SCENARIO_TEMPLATES.find((template) => template.template_id === templateId) || SCENARIO_TEMPLATES[0];
}

function actorRoleForLabActorId(labActorId: string | undefined): ActorRole {
    if (labActorId === 'local_requester_01') return 'REQUESTER';
    if (labActorId === 'local_operator_01') return 'OPERATOR';
    return 'TENANT_ADMIN';
}

function oaRoleForLabActorId(labActorId: string | undefined): EnterpriseOARole {
    if (labActorId === 'local_requester_01') return 'REQUESTER';
    if (labActorId === 'local_operator_01') return 'OPERATOR';
    return 'TENANT_ADMIN';
}

function flowActorRoleForOaRole(role: EnterpriseOARole): ActorRole | undefined {
    if (role === 'REQUESTER' || role === 'OPERATOR' || role === 'TENANT_ADMIN') return role;
    return undefined;
}

function baseParticipantIdForRole(role: EnterpriseOARole): string {
    return `trial_participant_${role.toLowerCase()}`;
}

function defaultParticipants(timestamp: number): TrialWorkspaceParticipantRecord[] {
    return ENTERPRISE_OA_ROLES.map((role) => ({
        participant_id: baseParticipantIdForRole(role),
        trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
        seat_id: `trial_seat_${role.toLowerCase()}`,
        oa_role: role,
        actor_role: flowActorRoleForOaRole(role),
        actor_label: role
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (match) => match.toUpperCase())
            .replace('Policy Governance', 'Policy / Governance')
            .replace('Tenant Admin', 'Trial Tenant Admin')
            .replace('Requester', 'Trial Requester')
            .replace('Operator', 'Trial Operator')
            .replace('Approver', 'Trial Approver')
            .replace('Reviewer', 'Trial Reviewer')
            .replace('Workspace Admin', 'Trial Workspace Admin')
            .replace('Integration Admin', 'Trial Integration Admin')
            .replace('Auditor', 'Trial Auditor'),
        summary: role === 'REQUESTER'
            ? 'Submits sandbox requests and monitors receipts.'
            : role === 'APPROVER'
                ? 'Owns bounded approval decisions inside the sandbox.'
                : role === 'OPERATOR'
                    ? 'Owns review, handoff, and execution continuity inside the sandbox.'
                    : role === 'REVIEWER'
                        ? 'Checks evidence quality, compliance posture, and review blockers.'
                        : role === 'TENANT_ADMIN'
                            ? 'Owns sandbox approval, gap visibility, and trial-to-pilot conversion posture.'
                            : role === 'WORKSPACE_ADMIN'
                                ? 'Owns workspace membership, seat governance, and setup posture.'
                                : role === 'POLICY_GOVERNANCE_ADMIN'
                                    ? 'Owns policy pack, override, and rollout visibility.'
                                    : role === 'INTEGRATION_ADMIN'
                                        ? 'Owns connector, credential, and integration readiness.'
                                        : 'Owns read-only audit and proof visibility.',
        state: role === 'REQUESTER' || role === 'OPERATOR' || role === 'TENANT_ADMIN' ? 'ACTIVE' : 'READY',
        created_at: timestamp,
        updated_at: timestamp,
    }));
}

function defaultSeats(timestamp: number): TrialWorkspaceSeatRecord[] {
    return ENTERPRISE_OA_ROLES.map((role) => ({
        seat_id: `trial_seat_${role.toLowerCase()}`,
        trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
        role,
        actor_role: flowActorRoleForOaRole(role),
        label: `${role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase()).replace('Policy Governance', 'Policy / Governance')} seat`,
        summary: role === 'REQUESTER'
            ? 'Business requester perspective.'
            : role === 'APPROVER'
                ? 'Bounded approval perspective.'
                : role === 'OPERATOR'
                    ? 'Operational reviewer perspective.'
                    : role === 'REVIEWER'
                        ? 'Evidence review perspective.'
                        : role === 'TENANT_ADMIN'
                            ? 'Tenant activation and readiness perspective.'
                            : role === 'WORKSPACE_ADMIN'
                                ? 'Workspace governance perspective.'
                                : role === 'POLICY_GOVERNANCE_ADMIN'
                                    ? 'Policy and rollout governance perspective.'
                                    : role === 'INTEGRATION_ADMIN'
                                        ? 'Connector and credential readiness perspective.'
                                        : 'Audit and reporting perspective.',
        claim_status: 'ASSIGNED_BASE',
        assigned_participant_id: baseParticipantIdForRole(role),
        created_at: timestamp,
        updated_at: timestamp,
    }));
}

function bootstrapState(): TrialWorkspaceState {
    const timestamp = now();
    return {
        workspace: {
            trial_workspace_id: DEFAULT_TRIAL_WORKSPACE_ID,
            workspace_key: DEFAULT_WORKSPACE_KEY,
            label: 'Enterprise Trial Workspace',
            summary: 'Shared server-backed sandbox workspace for B-end evaluation. Trial activity is never REAL_PILOT evidence.',
            status: 'ACTIVE',
            active_template_id: 'advisor_client_intake',
            created_at: timestamp,
            updated_at: timestamp,
        },
        seats: defaultSeats(timestamp),
        participants: defaultParticipants(timestamp),
        invites: [],
        sessions: [],
        tasks: [],
        activities: [],
    };
}

function buildHandoffLines(record: TrialWorkspaceTaskRecord): string[] {
    if (record.scenario_id === 'oa_full_cycle_governed_execution') {
        return [
            `Requester initiates ${record.client_name} package · completed`,
            `Approver releases bounded execution scope for ${record.client_name} · active`,
            `Operator assembles governed package for ${record.client_name} · pending`,
            `Reviewer validates evidence for ${record.client_name} · pending`,
            `Tenant-admin gate for ${record.client_name} · pending`,
            `Workspace-admin scope check for ${record.client_name} · pending`,
            `Policy / governance review for ${record.client_name} · pending`,
            `Integration readiness review for ${record.client_name} · pending`,
            `Audit receipt visibility review for ${record.client_name} · pending`,
        ];
    }
    if (record.scenario_id === 'cross_boundary_export_review') {
        return [
            `Requester stages ${record.client_name} export · completed`,
            `Operator export review for ${record.client_name} · active`,
            `Boundary approval queue for ${record.client_name} · pending`,
        ];
    }
    if (record.scenario_id === 'exception_dispute_remediation') {
        return [
            `Requester opens ${record.client_name} exception · completed`,
            `Operator remediation review for ${record.client_name} · active`,
            `Tenant-admin remediation approval for ${record.client_name} · pending`,
        ];
    }
    return [
        `Requester submits ${record.client_name} intake · completed`,
        `Operator review required for ${record.client_name} · active`,
        `Compliance request queued for ${record.client_name} · pending`,
    ];
}

function taskDetail(record: TrialWorkspaceTaskRecord): TrialWorkspaceTaskDetailSummary {
    return {
        task_id: record.task_id,
        title: record.scenario_title,
        lifecycle: record.lifecycle,
        receipt_summary: record.receipt_summary,
        missing_fields: [...record.missing_fields],
        handoff_lines: buildHandoffLines(record),
        approval_summary: record.external_handoff_guard,
    };
}

function taskActivitiesForTemplate(params: {
    workspaceId: string;
    template: ScenarioTemplate;
    task: TrialWorkspaceTaskRecord;
    participant: TrialWorkspaceParticipantRecord;
    role: EnterpriseOARole;
    clientName: string;
}): TrialWorkspaceActivityRecord[] {
    const timestamp = now();
    if (params.template.template_id === 'oa_full_cycle_governed_execution') {
        return [
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, actor_role: 'REQUESTER', oa_role: 'REQUESTER', summary: `${params.clientName} request was staged by the requester.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, oa_role: 'APPROVER', summary: `Bounded approval is required before governed execution can continue for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, actor_role: 'OPERATOR', oa_role: 'OPERATOR', summary: `Operator package assembly is queued for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, oa_role: 'REVIEWER', summary: `Reviewer evidence validation is required for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, actor_role: 'TENANT_ADMIN', oa_role: 'TENANT_ADMIN', summary: `Tenant-admin readiness gate remains pending for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, oa_role: 'WORKSPACE_ADMIN', summary: `Workspace-admin seat and participant scope remains pending for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, oa_role: 'POLICY_GOVERNANCE_ADMIN', summary: `Policy / governance basis review remains pending for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, oa_role: 'INTEGRATION_ADMIN', summary: `Integration readiness review remains pending for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
            { activity_id: randomId('trial_activity'), trial_workspace_id: params.workspaceId, oa_role: 'AUDITOR', summary: `Audit receipt / export visibility remains pending for ${params.clientName}.`, task_id: params.task.task_id, created_at: timestamp },
        ];
    }

    return [
        {
            activity_id: randomId('trial_activity'),
            trial_workspace_id: params.workspaceId,
            actor_role: params.participant.actor_role,
            oa_role: params.role,
            summary: `${params.participant.actor_label} created trial task ${params.template.title} for ${params.clientName}.`,
            task_id: params.task.task_id,
            created_at: timestamp,
        },
        {
            activity_id: randomId('trial_activity'),
            trial_workspace_id: params.workspaceId,
            actor_role: 'OPERATOR' as ActorRole,
            oa_role: 'OPERATOR' as EnterpriseOARole,
            summary: `Operator review opened for ${params.clientName}; complete required fields before handoff continues.`,
            task_id: params.task.task_id,
            created_at: timestamp,
        },
        {
            activity_id: randomId('trial_activity'),
            trial_workspace_id: params.workspaceId,
            actor_role: 'TENANT_ADMIN' as ActorRole,
            oa_role: 'TENANT_ADMIN' as EnterpriseOARole,
            summary: params.template.connector_involved
                ? `Tenant-admin approval remains blocked for ${params.clientName} until compliance-required fields are complete.`
                : `Tenant-admin review remains pending for ${params.clientName} until sandbox approval conditions are complete.`,
            task_id: params.task.task_id,
            created_at: timestamp,
        },
    ];
}

function toRequesterInboxItems(tasks: TrialWorkspaceTaskRecord[]): RequesterInboxItem[] {
    return tasks.flatMap((record) => {
        const common = {
            correlation_id: record.task_id,
            updated_at: record.updated_at,
            workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE' as const,
            environment_kind: 'SIMULATOR' as const,
            is_demo_data: false,
            is_pilot_evidence: false,
        };
        return [
            {
                task_id: record.task_id,
                goal: `Create client intake for ${record.client_name}`,
                task_status: 'WAITING_USER',
                group: 'WAITING' as const,
                summary: `${record.client_name} sandbox request is staged in the shared trial workspace.`,
                blocker_summary: `Missing fields: ${record.missing_fields.join(', ')}`,
                receipt_summary: record.receipt_summary,
                actor_role: 'REQUESTER',
                actor_label: 'Trial Requester',
                ...common,
            },
            {
                task_id: `${record.task_id}__operator`,
                goal: `Operator review for ${record.client_name}`,
                task_status: 'RUNNING',
                group: 'IN_PROGRESS' as const,
                summary: 'Operator owns the current review stage in the shared trial workspace.',
                blocker_summary: `Missing fields: ${record.missing_fields.join(', ')}`,
                receipt_summary: 'Shared trial workspace review in progress.',
                actor_role: 'OPERATOR',
                actor_label: 'Trial Operator',
                ...common,
            },
            {
                task_id: `${record.task_id}__tenant_admin`,
                goal: `Tenant-admin gate for ${record.client_name}`,
                task_status: 'WAITING_USER',
                group: 'WAITING' as const,
                summary: 'Tenant admin sees the final gate and conversion gap for this trial task.',
                blocker_summary: record.external_handoff_guard,
                receipt_summary: record.receipt_summary,
                actor_role: 'TENANT_ADMIN',
                actor_label: 'Trial Tenant Admin',
                ...common,
            },
        ];
    });
}

class TrialWorkspaceService {
    private readonly connectionUrl = process.env.AGENT_KERNEL_POSTGRES_URL?.trim();
    private pool: any | null = null;
    private initError?: string;
    private memoryState = bootstrapState();

    private async ensureReady(): Promise<void> {
        if (!this.connectionUrl || this.pool || this.initError) return;
        try {
            const pg = await import('pg');
            this.pool = new pg.Pool({ connectionString: this.connectionUrl });
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspaces (
                    trial_workspace_id TEXT PRIMARY KEY,
                    workspace_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspace_seats (
                    seat_id TEXT PRIMARY KEY,
                    trial_workspace_id TEXT NOT NULL,
                    seat_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspace_participants (
                    participant_id TEXT PRIMARY KEY,
                    trial_workspace_id TEXT NOT NULL,
                    participant_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspace_invites (
                    invite_id TEXT PRIMARY KEY,
                    trial_workspace_id TEXT NOT NULL,
                    invite_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspace_sessions (
                    session_id TEXT PRIMARY KEY,
                    trial_workspace_id TEXT NOT NULL,
                    session_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspace_tasks (
                    task_id TEXT PRIMARY KEY,
                    trial_workspace_id TEXT NOT NULL,
                    task_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_kernel_trial_workspace_activities (
                    activity_id TEXT PRIMARY KEY,
                    trial_workspace_id TEXT NOT NULL,
                    activity_json JSONB NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
        } catch (error) {
            this.initError = error instanceof Error ? error.message : String(error);
            this.pool = null;
        }
    }

    private persistenceState(): TrialPersistenceState {
        return this.connectionUrl && !this.initError ? 'SERVER_BACKED' : 'MEMORY_ONLY';
    }

    private persistenceDetail(): string {
        if (this.connectionUrl && !this.initError) {
            return 'Configured Postgres backend detected for the trial workspace.';
        }
        if (this.connectionUrl && this.initError) {
            return `Configured Postgres backend is invalid or unreachable: ${this.initError}`;
        }
        return 'Persistent backend env is not configured; current deployment uses memory-only server backing.';
    }

    private deploymentBlocker(): string | undefined {
        if (this.connectionUrl && this.initError) {
            return `AGENT_KERNEL_POSTGRES_URL is configured but unreachable: ${this.initError}`;
        }
        return this.connectionUrl
            ? undefined
            : 'Configure AGENT_KERNEL_POSTGRES_URL to close true multi-browser persistence.';
    }

    private participantForRole(state: TrialWorkspaceState, role: EnterpriseOARole): TrialWorkspaceParticipantRecord {
        return state.participants.find((participant) => participant.oa_role === role) || state.participants[0]!;
    }

    private async loadState(): Promise<TrialWorkspaceState> {
        await this.ensureReady();
        if (!this.pool) return this.memoryState;

        const workspaceResult = await this.pool.query(
            `SELECT workspace_json FROM agent_kernel_trial_workspaces WHERE trial_workspace_id = $1`,
            [DEFAULT_TRIAL_WORKSPACE_ID]
        );
        if (workspaceResult.rowCount === 0) {
            await this.saveState(this.memoryState);
            return this.memoryState;
        }

        const trial_workspace_id = DEFAULT_TRIAL_WORKSPACE_ID;
        const [seats, participants, invites, sessions, tasks, activities] = await Promise.all([
            this.pool.query(`SELECT seat_json FROM agent_kernel_trial_workspace_seats WHERE trial_workspace_id = $1`, [trial_workspace_id]),
            this.pool.query(`SELECT participant_json FROM agent_kernel_trial_workspace_participants WHERE trial_workspace_id = $1`, [trial_workspace_id]),
            this.pool.query(`SELECT invite_json FROM agent_kernel_trial_workspace_invites WHERE trial_workspace_id = $1`, [trial_workspace_id]),
            this.pool.query(`SELECT session_json FROM agent_kernel_trial_workspace_sessions WHERE trial_workspace_id = $1`, [trial_workspace_id]),
            this.pool.query(`SELECT task_json FROM agent_kernel_trial_workspace_tasks WHERE trial_workspace_id = $1`, [trial_workspace_id]),
            this.pool.query(`SELECT activity_json FROM agent_kernel_trial_workspace_activities WHERE trial_workspace_id = $1`, [trial_workspace_id]),
        ]);

        const state: TrialWorkspaceState = {
            workspace: workspaceResult.rows[0].workspace_json as TrialWorkspaceRecord,
            seats: seats.rows.map((row: any) => row.seat_json as TrialWorkspaceSeatRecord),
            participants: participants.rows.map((row: any) => row.participant_json as TrialWorkspaceParticipantRecord),
            invites: invites.rows.map((row: any) => row.invite_json as TrialWorkspaceInviteRecord),
            sessions: sessions.rows.map((row: any) => row.session_json as TrialWorkspaceSessionRecord),
            tasks: tasks.rows.map((row: any) => row.task_json as TrialWorkspaceTaskRecord),
            activities: activities.rows.map((row: any) => row.activity_json as TrialWorkspaceActivityRecord),
        };
        this.memoryState = state;
        return state;
    }

    private async saveState(state: TrialWorkspaceState): Promise<void> {
        this.memoryState = state;
        await this.ensureReady();
        if (!this.pool) return;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const id = state.workspace.trial_workspace_id;
            const updatedAt = now();
            await client.query(
                `
                INSERT INTO agent_kernel_trial_workspaces (trial_workspace_id, workspace_json, updated_at)
                VALUES ($1, $2::jsonb, $3)
                ON CONFLICT (trial_workspace_id) DO UPDATE SET
                    workspace_json = EXCLUDED.workspace_json,
                    updated_at = EXCLUDED.updated_at
                `,
                [id, JSON.stringify(state.workspace), updatedAt]
            );

            const syncRows = async <T>(params: {
                table: string;
                idColumn: string;
                jsonColumn: string;
                rows: T[];
            }) => {
                const ids = params.rows
                    .map((row) => String((row as Record<string, unknown>)[params.idColumn] || '').trim())
                    .filter(Boolean);

                if (ids.length > 0) {
                    await client.query(
                        `DELETE FROM ${params.table} WHERE trial_workspace_id = $1 AND ${params.idColumn} <> ALL($2::text[])`,
                        [id, ids]
                    );
                } else {
                    await client.query(`DELETE FROM ${params.table} WHERE trial_workspace_id = $1`, [id]);
                }

                for (const row of params.rows) {
                    const rowId = String((row as Record<string, unknown>)[params.idColumn] || '').trim();
                    await client.query(
                        `
                        INSERT INTO ${params.table} (${params.idColumn}, trial_workspace_id, ${params.jsonColumn}, updated_at)
                        VALUES ($1, $2, $3::jsonb, $4)
                        ON CONFLICT (${params.idColumn}) DO UPDATE SET
                            trial_workspace_id = EXCLUDED.trial_workspace_id,
                            ${params.jsonColumn} = EXCLUDED.${params.jsonColumn},
                            updated_at = EXCLUDED.updated_at
                        `,
                        [rowId, id, JSON.stringify(row), updatedAt]
                    );
                }
            };

            await syncRows({
                table: 'agent_kernel_trial_workspace_seats',
                idColumn: 'seat_id',
                jsonColumn: 'seat_json',
                rows: state.seats,
            });
            await syncRows({
                table: 'agent_kernel_trial_workspace_participants',
                idColumn: 'participant_id',
                jsonColumn: 'participant_json',
                rows: state.participants,
            });
            await syncRows({
                table: 'agent_kernel_trial_workspace_invites',
                idColumn: 'invite_id',
                jsonColumn: 'invite_json',
                rows: state.invites,
            });
            await syncRows({
                table: 'agent_kernel_trial_workspace_sessions',
                idColumn: 'session_id',
                jsonColumn: 'session_json',
                rows: state.sessions,
            });
            await syncRows({
                table: 'agent_kernel_trial_workspace_tasks',
                idColumn: 'task_id',
                jsonColumn: 'task_json',
                rows: state.tasks,
            });
            await syncRows({
                table: 'agent_kernel_trial_workspace_activities',
                idColumn: 'activity_id',
                jsonColumn: 'activity_json',
                rows: state.activities,
            });
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            this.initError = error instanceof Error ? error.message : String(error);
            this.pool = null;
        } finally {
            client.release();
        }
    }

    async summarize(): Promise<TrialWorkspaceSummary> {
        const state = await this.loadState();
        return {
            trial_workspace: { ...state.workspace },
            seats: state.seats.map((item) => ({ ...item })),
            participants: state.participants.map((item) => ({ ...item })),
            invites: state.invites.map((item) => ({ ...item })),
            sessions: state.sessions.map((item) => ({ ...item })).sort((a, b) => b.last_seen_at - a.last_seen_at),
            activities: state.activities.map((item) => ({ ...item })).sort((a, b) => b.created_at - a.created_at),
            tasks: state.tasks.map((item) => ({ ...item, missing_fields: [...item.missing_fields] })).sort((a, b) => b.updated_at - a.updated_at),
            active_task_detail: state.tasks[0] ? taskDetail(state.tasks[0]) : undefined,
            persistence_state: this.persistenceState(),
            persistence_detail: this.persistenceDetail(),
            deployment_blocker: this.deploymentBlocker(),
            join_instructions: [
                'Create an invite for the required seat.',
                'Accept the invite with a participant label to claim the seat.',
                'Release the seat when the trial session is finished.',
            ],
            conversion_guidance_lines: [
                'Promote to pilot only after real environment binding, real operator access, named requester, and tenant-admin/support touchpoint exist.',
                'Do not reuse trial artifacts as REAL_PILOT evidence.',
                this.persistenceState() === 'SERVER_BACKED'
                    ? 'This trial workspace is running with configured server-backed persistence.'
                    : 'Current deployment is using memory-only server backing; configure AGENT_KERNEL_POSTGRES_URL or AGENT_KERNEL_REDIS_URL for true cross-instance durability.',
            ],
        };
    }

    async mergeProductShell(baseSummary: ProductShellSummary): Promise<ProductShellSummary> {
        const trialSummary = await this.summarize();
        const mergedItems = [...toRequesterInboxItems(trialSummary.tasks), ...baseSummary.requester_inbox.items]
            .sort((a, b) => b.updated_at - a.updated_at);
        const count = (group: 'IN_PROGRESS' | 'BLOCKED' | 'WAITING' | 'COMPLETED') =>
            mergedItems.filter((item) => item.group === group).length;
        const latestTask = trialSummary.tasks[0];
        return {
            ...baseSummary,
            requester_inbox: {
                ...baseSummary.requester_inbox,
                total_count: mergedItems.length,
                in_progress_count: count('IN_PROGRESS'),
                blocked_count: count('BLOCKED'),
                waiting_count: count('WAITING'),
                completed_count: count('COMPLETED'),
                items: mergedItems,
            },
            local_role_lab: latestTask
                ? {
                    ...baseSummary.local_role_lab,
                    summary: `${baseSummary.local_role_lab.summary} Shared trial workspace is active with ${trialSummary.participants.length} participants and ${trialSummary.sessions.length} session(s).`,
                    scenario: {
                        ...baseSummary.local_role_lab.scenario,
                        title: `${latestTask.scenario_title} · ${latestTask.client_name}`,
                        summary: latestTask.scenario_summary,
                        current_stage: buildHandoffLines(latestTask)[1]?.split(' · ')[0] || latestTask.scenario_title,
                    },
                    handoff_timeline: buildHandoffLines(latestTask).map((line, index) => ({
                        step_id: `${latestTask.task_id}_${index}`,
                        title: line.split(' · ')[0]!,
                        summary: line,
                        status: index === 0 ? 'COMPLETED' : index === 1 ? 'ACTIVE' : 'PENDING',
                    })),
                    pilot_activation_gap_summary: `${baseSummary.local_role_lab.pilot_activation_gap_summary} Shared trial workspace activity also remains non-pilot and cannot clear the real pilot gap.`,
                }
                : baseSummary.local_role_lab,
            trial_workspace: trialSummary,
            next_action: latestTask
                ? `Continue shared trial workspace review for ${latestTask.client_name} before any pilot conversion.`
                : baseSummary.next_action,
        };
    }

    async registerSession(params: {
        labActorId?: string;
        oaRole?: EnterpriseOARole;
        page: string;
        section: string;
    }): Promise<TrialWorkspaceSessionRecord> {
        const state = await this.loadState();
        const timestamp = now();
        const role = params.oaRole || oaRoleForLabActorId(params.labActorId);
        const participant = this.participantForRole(state, role);
        const session: TrialWorkspaceSessionRecord = {
            session_id: randomId('trial_session'),
            trial_workspace_id: state.workspace.trial_workspace_id,
            participant_id: participant.participant_id,
            actor_role: participant.actor_role,
            oa_role: role,
            current_page: params.page,
            current_section: params.section,
            created_at: timestamp,
            last_seen_at: timestamp,
        };
        await this.saveState({
            ...state,
            sessions: [session, ...state.sessions.filter((item) => item.session_id !== session.session_id)].slice(0, 24),
            participants: state.participants.map((item) =>
                item.participant_id === participant.participant_id
                    ? { ...item, state: 'VIEWING' as TrialParticipantState, updated_at: timestamp }
                    : item
            ),
            activities: [
                {
                    activity_id: randomId('trial_activity'),
                    trial_workspace_id: state.workspace.trial_workspace_id,
                    actor_role: participant.actor_role,
                    oa_role: role,
                    summary: `${participant.actor_label} opened ${params.page}/${params.section} in the shared trial workspace.`,
                    created_at: timestamp,
                },
                ...state.activities,
            ].slice(0, 40),
            workspace: {
                ...state.workspace,
                updated_at: timestamp,
            },
        });
        return session;
    }

    async createInvite(params: {
        role: EnterpriseOARole;
        label?: string;
    }): Promise<TrialWorkspaceInviteRecord> {
        const state = await this.loadState();
        const timestamp = now();
        const seat = state.seats.find((item) => item.role === params.role) || state.seats[0]!;
        const invite: TrialWorkspaceInviteRecord = {
            invite_id: randomId('trial_invite'),
            trial_workspace_id: state.workspace.trial_workspace_id,
            seat_id: seat.seat_id,
            actor_role: flowActorRoleForOaRole(params.role),
            oa_role: params.role,
            invite_code: randomId('invite_code'),
            label: params.label || `${params.role.toLowerCase().replace(/_/g, ' ')} invite`,
            status: 'OPEN',
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.saveState({
            ...state,
            invites: [invite, ...state.invites].slice(0, 20),
            activities: [
                {
                    activity_id: randomId('trial_activity'),
                    trial_workspace_id: state.workspace.trial_workspace_id,
                    actor_role: flowActorRoleForOaRole(params.role),
                    oa_role: params.role,
                    summary: `Invite created for ${params.role.toLowerCase().replace(/_/g, ' ')} seat.`,
                    created_at: timestamp,
                },
                ...state.activities,
            ].slice(0, 40),
        });
        return invite;
    }

    async acceptInvite(params: {
        inviteCode: string;
        actorLabel?: string;
    }): Promise<TrialWorkspaceParticipantRecord> {
        const state = await this.loadState();
        const timestamp = now();
        const invite = state.invites.find((item) => item.invite_code === params.inviteCode && item.status === 'OPEN');
        if (!invite) throw new Error('Trial invite not found');
        const seat = state.seats.find((item) => item.seat_id === invite.seat_id);
        if (!seat) throw new Error('Trial seat not found');
        const participant: TrialWorkspaceParticipantRecord = {
            participant_id: randomId('trial_participant'),
            trial_workspace_id: state.workspace.trial_workspace_id,
            seat_id: seat.seat_id,
            actor_role: invite.actor_role,
            oa_role: invite.oa_role,
            actor_label: params.actorLabel?.trim() || `Joined ${invite.oa_role.toLowerCase().replace(/_/g, ' ')}`,
            summary: `Accepted invite for ${invite.oa_role.toLowerCase().replace(/_/g, ' ')} seat.`,
            state: 'ACTIVE',
            invite_id: invite.invite_id,
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.saveState({
            ...state,
            participants: [
                participant,
                ...state.participants.map((item) =>
                    item.participant_id === baseParticipantIdForRole(invite.oa_role)
                        ? { ...item, state: 'READY' as TrialParticipantState, updated_at: timestamp }
                        : item
                ),
            ],
            invites: state.invites.map((item) =>
                item.invite_id === invite.invite_id
                    ? { ...item, status: 'ACCEPTED' as TrialInviteStatus, accepted_participant_id: participant.participant_id, accepted_at: timestamp, updated_at: timestamp }
                    : item
            ),
            seats: state.seats.map((item) =>
                item.seat_id === seat.seat_id
                    ? { ...item, claim_status: 'CLAIMED' as TrialSeatClaimStatus, assigned_participant_id: participant.participant_id, claimed_via_invite_id: invite.invite_id, updated_at: timestamp }
                    : item
            ),
            activities: [
                {
                    activity_id: randomId('trial_activity'),
                    trial_workspace_id: state.workspace.trial_workspace_id,
                    actor_role: invite.actor_role,
                    oa_role: invite.oa_role,
                    summary: `${participant.actor_label} accepted invite ${invite.invite_code} and claimed ${invite.oa_role.toLowerCase().replace(/_/g, ' ')} seat.`,
                    created_at: timestamp,
                },
                ...state.activities,
            ].slice(0, 40),
        });
        return participant;
    }

    async releaseSeat(params: { seatId: string }): Promise<TrialWorkspaceSeatRecord> {
        const state = await this.loadState();
        const timestamp = now();
        const seat = state.seats.find((item) => item.seat_id === params.seatId);
        if (!seat) throw new Error('Trial seat not found');
        const previousParticipantId = seat.assigned_participant_id;
        const baseParticipantId = baseParticipantIdForRole(seat.role);
        const nextSeat: TrialWorkspaceSeatRecord = {
            ...seat,
            claim_status: 'ASSIGNED_BASE',
            assigned_participant_id: baseParticipantId,
            claimed_via_invite_id: undefined,
            updated_at: timestamp,
        };
        await this.saveState({
            ...state,
            seats: state.seats.map((item) => item.seat_id === seat.seat_id ? nextSeat : item),
            participants: state.participants
                .filter((item) => item.participant_id === baseParticipantId || item.participant_id !== previousParticipantId)
                .map((item) =>
                    item.participant_id === baseParticipantId
                        ? { ...item, state: 'ACTIVE' as TrialParticipantState, updated_at: timestamp }
                        : item
                ),
            activities: [
                {
                    activity_id: randomId('trial_activity'),
                    trial_workspace_id: state.workspace.trial_workspace_id,
                    actor_role: seat.actor_role,
                    oa_role: seat.role,
                    summary: `${seat.label} was released back to the base trial participant.`,
                    created_at: timestamp,
                },
                ...state.activities,
            ].slice(0, 40),
        });
        return nextSeat;
    }

    async createTask(input: {
        labActorId?: string;
        templateId: string;
        requesterBrief: string;
    }): Promise<TrialWorkspaceTaskRecord> {
        const state = await this.loadState();
        const timestamp = now();
        const role = oaRoleForLabActorId(input.labActorId);
        const participant = this.participantForRole(state, role);
        const template = templateById(input.templateId);
        const parsed = parseRequesterBrief(input.requesterBrief);
        const task: TrialWorkspaceTaskRecord = {
            task_id: randomId('trial_task'),
            trial_workspace_id: state.workspace.trial_workspace_id,
            created_by_participant_id: participant.participant_id,
            scenario_id: template.template_id,
            scenario_title: template.title,
            scenario_summary: template.summary,
            requester_brief: input.requesterBrief,
            client_name: parsed.client_name,
            jurisdiction: parsed.jurisdiction,
            priority: parsed.priority,
            required_outcome: parsed.required_outcome,
            external_handoff_guard: parsed.external_handoff_guard,
            missing_data_policy: parsed.missing_data_policy,
            missing_fields: [...template.missing_fields],
            operator_review_required: true,
            compliance_review_requested: true,
            connector_requested: template.connector_involved,
            lifecycle: template.template_id === 'exception_dispute_remediation' || template.template_id === 'oa_full_cycle_governed_execution'
                ? 'TENANT_ADMIN_REVIEW'
                : 'OPERATOR_REVIEW',
            receipt_summary: template.template_id === 'oa_full_cycle_governed_execution'
                ? 'Shared 9-role OA workflow is staged; progression remains inside the sandbox until every governance role has been exercised.'
                : template.connector_involved
                    ? 'Shared trial task is staged; external handoff remains blocked until review is complete.'
                    : 'Shared trial task is staged inside the sandbox only.',
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.saveState({
            ...state,
            tasks: [task, ...state.tasks].slice(0, 24),
            activities: [
                ...taskActivitiesForTemplate({
                    workspaceId: state.workspace.trial_workspace_id,
                    template,
                    task,
                    participant,
                    role,
                    clientName: parsed.client_name,
                }),
                ...state.activities,
            ].slice(0, 40),
            workspace: {
                ...state.workspace,
                status: 'REHEARSAL_IN_PROGRESS',
                active_template_id: template.template_id,
                updated_at: timestamp,
            },
        });
        return task;
    }
}

let singleton: TrialWorkspaceService | undefined;

export function getTrialWorkspaceService(): TrialWorkspaceService {
    singleton ||= new TrialWorkspaceService();
    return singleton;
}

export function resetTrialWorkspaceServiceForTests(): void {
    singleton = undefined;
}

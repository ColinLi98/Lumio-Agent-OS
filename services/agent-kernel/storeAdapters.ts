import crypto from 'node:crypto';
import {
    InMemoryTaskStore,
    type IdempotencyEntry,
    type TaskStore,
} from './store.js';
import type {
    AgentKernelAuditExportRecord,
    AgentKernelComplianceDeletionRequestRecord,
    DeadLetterRecord,
    EnterpriseAccessBindingRecord,
    EnterpriseMembershipInviteRecord,
    EnterpriseIdentitySessionRecord,
    EnterprisePrincipalRecord,
    ExecutionLedgerCompactionHint,
    ExecutionLedgerReadFilter,
    ExecutionLedgerRecord,
    NodeState,
    OidcLoginStateRecord,
    PilotActivationPackageRecord,
    PilotConnectorActivationRecord,
    PilotEnvironmentBindingRecord,
    PilotExternalArtifactIntakeRecord,
    PilotActorReadinessRecord,
    PilotEvidenceArtifactRecord,
    RetryJobRecord,
    TaskClaimRecord,
    TaskExecutionUnit,
    TaskGraph,
    TaskProjectionCheckpoint,
    TaskQueryProjection,
    TaskSnapshot,
    TaskState,
    VaultCredentialRecord,
    WebhookDeliveryRecord,
    WorkerSessionRecord,
} from './contracts.js';

export type TaskStoreDriver = 'memory' | 'postgres' | 'redis';

export interface TaskStoreFactoryOptions {
    driver?: TaskStoreDriver;
    postgresUrl?: string;
    redisUrl?: string;
    redisKeyPrefix?: string;
}

export function resolveTaskStoreDriverFromEnv(): TaskStoreDriver {
    const raw = String(process.env.AGENT_KERNEL_STORE_DRIVER || '').trim().toLowerCase();
    if (raw === 'postgres' || raw === 'redis' || raw === 'memory') return raw;
    if (String(process.env.AGENT_KERNEL_POSTGRES_URL || '').trim()) return 'postgres';
    if (String(process.env.AGENT_KERNEL_REDIS_URL || '').trim()) return 'redis';
    return 'memory';
}

export function isEnterpriseWritePersistenceReady(): boolean {
    const environment = String(process.env.NODE_ENV || '').trim().toLowerCase();
    if (environment !== 'production') return true;
    return resolveTaskStoreDriverFromEnv() === 'postgres'
        && Boolean(String(process.env.AGENT_KERNEL_POSTGRES_URL || '').trim());
}

function toJson(value: unknown): string {
    return JSON.stringify(value);
}

function asNodeStateArray(raw: unknown): NodeState[] {
    if (!Array.isArray(raw)) return [];
    return raw as NodeState[];
}

class PostgresTaskStore implements TaskStore {
    private readonly memory = new InMemoryTaskStore();
    private readonly connectionUrl?: string;
    private pool: any | null = null;
    private readonly readyPromise: Promise<void>;

    constructor(connectionUrl?: string) {
        this.connectionUrl = connectionUrl;
        this.readyPromise = this.init();
    }

    private async init(): Promise<void> {
        if (!this.connectionUrl) {
            console.warn('[AgentKernel] PostgresTaskStore requested without connection string. Falling back to in-memory mode.');
            return;
        }

        const pg = await import('pg');
        this.pool = new pg.Pool({
            connectionString: this.connectionUrl,
        });

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_tasks (
                task_id TEXT PRIMARY KEY,
                graph_json JSONB NOT NULL,
                task_state_json JSONB NOT NULL,
                policy_decision_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                updated_at BIGINT NOT NULL
            );
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_nodes (
                task_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                node_state_json JSONB NOT NULL,
                status TEXT NOT NULL,
                updated_at BIGINT NOT NULL,
                PRIMARY KEY (task_id, node_id)
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_nodes_task_status
            ON agent_kernel_nodes(task_id, status);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_idempotency (
                idem_key TEXT PRIMARY KEY,
                entry_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_retry_jobs (
                job_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                dedupe_key TEXT NOT NULL UNIQUE,
                retry_job_json JSONB NOT NULL,
                status TEXT NOT NULL,
                available_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_retry_jobs_task_status_available
            ON agent_kernel_retry_jobs(task_id, status, available_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_dead_letters (
                dead_letter_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                dedupe_key TEXT NOT NULL UNIQUE,
                dead_letter_json JSONB NOT NULL,
                status TEXT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_dead_letters_task_status_updated
            ON agent_kernel_dead_letters(task_id, status, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_execution_units (
                execution_unit_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                target_attempt INT NOT NULL,
                dedupe_key TEXT NOT NULL UNIQUE,
                unit_json JSONB NOT NULL,
                status TEXT NOT NULL,
                available_at BIGINT NOT NULL,
                lease_expires_at BIGINT,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_units_task_status_available
            ON agent_kernel_execution_units(task_id, status, available_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_execution_claims (
                claim_id TEXT PRIMARY KEY,
                execution_unit_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                claim_json JSONB NOT NULL,
                status TEXT NOT NULL,
                lease_expires_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_claims_task_status_lease
            ON agent_kernel_execution_claims(task_id, status, lease_expires_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_worker_sessions (
                session_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                worker_id TEXT NOT NULL,
                session_json JSONB NOT NULL,
                status TEXT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_worker_sessions_task_status_updated
            ON agent_kernel_worker_sessions(task_id, status, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_principals (
                principal_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                external_subject TEXT NOT NULL,
                email TEXT NOT NULL,
                principal_json JSONB NOT NULL,
                status TEXT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_principals_tenant_status
            ON agent_kernel_enterprise_principals(tenant_id, status, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_access_bindings (
                binding_id TEXT PRIMARY KEY,
                principal_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                workspace_id TEXT,
                binding_json JSONB NOT NULL,
                status TEXT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_access_bindings_principal_status
            ON agent_kernel_enterprise_access_bindings(principal_id, status, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_identity_sessions (
                session_id TEXT PRIMARY KEY,
                principal_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                workspace_id TEXT,
                session_json JSONB NOT NULL,
                status TEXT NOT NULL,
                expires_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_identity_sessions_principal_status
            ON agent_kernel_enterprise_identity_sessions(principal_id, status, expires_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_oidc_login_states (
                state_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                workspace_id TEXT,
                oidc_state_json JSONB NOT NULL,
                status TEXT NOT NULL,
                expires_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_oidc_login_states_status_expiry
            ON agent_kernel_oidc_login_states(status, expires_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_membership_invites (
                invite_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                workspace_id TEXT,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                invite_json JSONB NOT NULL,
                status TEXT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_membership_invites_tenant_status
            ON agent_kernel_enterprise_membership_invites(tenant_id, status, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_vault_credentials (
                credential_id TEXT PRIMARY KEY,
                connector_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                workspace_id TEXT,
                status TEXT NOT NULL,
                compromise_status TEXT NOT NULL,
                lease_expires_at BIGINT,
                credential_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_vault_credentials_connector_status
            ON agent_kernel_vault_credentials(connector_id, status, compromise_status, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_webhook_deliveries (
                delivery_id TEXT PRIMARY KEY,
                connector_id TEXT NOT NULL,
                credential_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                workspace_id TEXT,
                status TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                delivery_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_webhook_deliveries_connector_status_created
            ON agent_kernel_webhook_deliveries(connector_id, status, created_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_compliance_deletion_requests (
                request_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                deletion_request_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_compliance_deletion_requests_task_status_created
            ON agent_kernel_compliance_deletion_requests(task_id, status, created_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_compliance_audit_exports (
                export_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                audit_export_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_compliance_audit_exports_task_status_created
            ON agent_kernel_compliance_audit_exports(task_id, status, created_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_pilot_activation_packages (
                package_id TEXT PRIMARY KEY,
                workspace_key TEXT NOT NULL,
                owner_type TEXT NOT NULL,
                package_status TEXT NOT NULL,
                activation_package_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_activation_packages_workspace_updated
            ON agent_kernel_pilot_activation_packages(workspace_key, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_pilot_actor_readiness (
                readiness_id TEXT PRIMARY KEY,
                workspace_key TEXT NOT NULL,
                role TEXT NOT NULL,
                actor_readiness_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_actor_readiness_workspace_role_updated
            ON agent_kernel_pilot_actor_readiness(workspace_key, role, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_pilot_environment_bindings (
                binding_id TEXT PRIMARY KEY,
                workspace_key TEXT NOT NULL,
                environment_kind TEXT NOT NULL,
                binding_state TEXT NOT NULL,
                environment_binding_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_environment_bindings_workspace_updated
            ON agent_kernel_pilot_environment_bindings(workspace_key, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_pilot_connector_activation (
                activation_id TEXT PRIMARY KEY,
                workspace_key TEXT NOT NULL,
                connector_id TEXT NOT NULL,
                connector_state TEXT NOT NULL,
                connector_activation_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_connector_activation_workspace_connector_updated
            ON agent_kernel_pilot_connector_activation(workspace_key, connector_id, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_pilot_external_artifact_intakes (
                intake_id TEXT PRIMARY KEY,
                workspace_key TEXT NOT NULL,
                artifact_kind TEXT NOT NULL,
                verification_status TEXT NOT NULL,
                artifact_intake_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_external_artifact_intakes_workspace_updated
            ON agent_kernel_pilot_external_artifact_intakes(workspace_key, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_pilot_evidence_artifacts (
                artifact_id TEXT PRIMARY KEY,
                workspace_key TEXT NOT NULL,
                category TEXT NOT NULL,
                pilot_evidence_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_evidence_workspace_category_updated
            ON agent_kernel_pilot_evidence_artifacts(workspace_key, category, updated_at);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_execution_ledger (
                ledger_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                sequence BIGINT NOT NULL,
                dedupe_key TEXT NOT NULL UNIQUE,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                payload_json JSONB,
                record_json JSONB NOT NULL,
                occurred_at BIGINT NOT NULL,
                created_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_ledger_task_sequence
            ON agent_kernel_execution_ledger(task_id, sequence);
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_task_projections (
                task_id TEXT NOT NULL,
                projection_name TEXT NOT NULL,
                projection_json JSONB NOT NULL,
                last_sequence BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                PRIMARY KEY (task_id, projection_name)
            );
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_projection_checkpoints (
                task_id TEXT NOT NULL,
                projection_name TEXT NOT NULL,
                checkpoint_json JSONB NOT NULL,
                last_sequence BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                PRIMARY KEY (task_id, projection_name)
            );
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS agent_kernel_execution_ledger_compaction_hints (
                hint_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                projection_name TEXT NOT NULL,
                up_to_sequence BIGINT NOT NULL,
                created_at BIGINT NOT NULL,
                hint_json JSONB NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_agent_kernel_ledger_compaction_hints_task_updated
            ON agent_kernel_execution_ledger_compaction_hints(task_id, updated_at DESC);
        `);

        await this.hydrateFromPostgres();
    }

    private async ensureReady(): Promise<void> {
        await this.readyPromise;
    }

    private async hydrateFromPostgres(): Promise<void> {
        if (!this.pool) return;

        const taskRows = await this.pool.query(`
            SELECT task_id, graph_json, task_state_json, policy_decision_ids
            FROM agent_kernel_tasks
        `);
        const nodeRows = await this.pool.query(`
            SELECT task_id, node_state_json
            FROM agent_kernel_nodes
        `);

        const nodesByTask = new Map<string, NodeState[]>();
        for (const row of nodeRows.rows || []) {
            const taskId = String(row.task_id || '');
            if (!taskId) continue;
            const list = nodesByTask.get(taskId) || [];
            list.push(row.node_state_json as NodeState);
            nodesByTask.set(taskId, list);
        }

        const snapshots: TaskSnapshot[] = [];
        for (const row of taskRows.rows || []) {
            const taskId = String(row.task_id || '');
            if (!taskId) continue;
            const graph = row.graph_json as TaskGraph;
            const taskState = row.task_state_json as TaskState;
            const policyDecisionIds = Array.isArray(row.policy_decision_ids) ? row.policy_decision_ids as string[] : [];
            const nodeStates = asNodeStateArray(nodesByTask.get(taskId) || []);
            snapshots.push({
                graph,
                task_state: taskState,
                node_states: nodeStates,
                policy_decision_ids: policyDecisionIds,
            });
        }

        this.memory.hydrateFromSnapshots(snapshots);

        const idemRows = await this.pool.query(`
            SELECT idem_key, entry_json
            FROM agent_kernel_idempotency
        `);
        for (const row of idemRows.rows || []) {
            const key = String(row.idem_key || '');
            if (!key) continue;
            await this.memory.setIdempotency(key, row.entry_json as IdempotencyEntry);
        }

        const retryRows = await this.pool.query(`
            SELECT job_id, retry_job_json
            FROM agent_kernel_retry_jobs
        `);
        for (const row of retryRows.rows || []) {
            const job = row.retry_job_json as RetryJobRecord;
            if (!job?.job_id) continue;
            await this.memory.upsertRetryJob(job);
        }

        const deadLetterRows = await this.pool.query(`
            SELECT dead_letter_id, dead_letter_json
            FROM agent_kernel_dead_letters
        `);
        for (const row of deadLetterRows.rows || []) {
            const deadLetter = row.dead_letter_json as DeadLetterRecord;
            if (!deadLetter?.dead_letter_id) continue;
            await this.memory.upsertDeadLetter(deadLetter);
        }

        const executionUnitRows = await this.pool.query(`
            SELECT execution_unit_id, unit_json
            FROM agent_kernel_execution_units
        `);
        for (const row of executionUnitRows.rows || []) {
            const executionUnit = row.unit_json as TaskExecutionUnit;
            if (!executionUnit?.execution_unit_id) continue;
            await this.memory.upsertExecutionUnit(executionUnit);
        }

        const executionClaimRows = await this.pool.query(`
            SELECT claim_id, claim_json
            FROM agent_kernel_execution_claims
        `);
        for (const row of executionClaimRows.rows || []) {
            const claim = row.claim_json as TaskClaimRecord;
            if (!claim?.claim_id) continue;
            await this.memory.upsertExecutionClaim(claim);
        }

        const workerSessionRows = await this.pool.query(`
            SELECT session_id, session_json
            FROM agent_kernel_worker_sessions
        `);
        for (const row of workerSessionRows.rows || []) {
            const session = row.session_json as WorkerSessionRecord;
            if (!session?.session_id) continue;
            await this.memory.upsertWorkerSession(session);
        }

        const enterprisePrincipalRows = await this.pool.query(`
            SELECT principal_id, principal_json
            FROM agent_kernel_enterprise_principals
        `);
        for (const row of enterprisePrincipalRows.rows || []) {
            const principal = row.principal_json as EnterprisePrincipalRecord;
            if (!principal?.principal_id) continue;
            await this.memory.upsertEnterprisePrincipal(principal);
        }

        const enterpriseBindingRows = await this.pool.query(`
            SELECT binding_id, binding_json
            FROM agent_kernel_enterprise_access_bindings
        `);
        for (const row of enterpriseBindingRows.rows || []) {
            const binding = row.binding_json as EnterpriseAccessBindingRecord;
            if (!binding?.binding_id) continue;
            await this.memory.upsertEnterpriseAccessBinding(binding);
        }

        const enterpriseSessionRows = await this.pool.query(`
            SELECT session_id, session_json
            FROM agent_kernel_enterprise_identity_sessions
        `);
        for (const row of enterpriseSessionRows.rows || []) {
            const session = row.session_json as EnterpriseIdentitySessionRecord;
            if (!session?.session_id) continue;
            await this.memory.upsertEnterpriseIdentitySession(session);
        }

        const oidcStateRows = await this.pool.query(`
            SELECT state_id, oidc_state_json
            FROM agent_kernel_oidc_login_states
        `);
        for (const row of oidcStateRows.rows || []) {
            const state = row.oidc_state_json as OidcLoginStateRecord;
            if (!state?.state_id) continue;
            await this.memory.upsertOidcLoginState(state);
        }

        const membershipInviteRows = await this.pool.query(`
            SELECT invite_id, invite_json
            FROM agent_kernel_enterprise_membership_invites
        `);
        for (const row of membershipInviteRows.rows || []) {
            const invite = row.invite_json as EnterpriseMembershipInviteRecord;
            if (!invite?.invite_id) continue;
            await this.memory.upsertEnterpriseMembershipInvite(invite);
        }

        const vaultCredentialRows = await this.pool.query(`
            SELECT credential_id, credential_json
            FROM agent_kernel_vault_credentials
        `);
        for (const row of vaultCredentialRows.rows || []) {
            const record = row.credential_json as VaultCredentialRecord;
            if (!record?.credential_id) continue;
            await this.memory.upsertVaultCredential(record);
        }

        const webhookDeliveryRows = await this.pool.query(`
            SELECT delivery_id, delivery_json
            FROM agent_kernel_webhook_deliveries
        `);
        const complianceDeletionRequestRows = await this.pool.query(`
            SELECT request_id, deletion_request_json
            FROM agent_kernel_compliance_deletion_requests
        `);
        const complianceAuditExportRows = await this.pool.query(`
            SELECT export_id, audit_export_json
            FROM agent_kernel_compliance_audit_exports
        `);
        const pilotActivationPackageRows = await this.pool.query(`
            SELECT package_id, activation_package_json
            FROM agent_kernel_pilot_activation_packages
        `);
        const pilotActorReadinessRows = await this.pool.query(`
            SELECT readiness_id, actor_readiness_json
            FROM agent_kernel_pilot_actor_readiness
        `);
        const pilotEnvironmentBindingRows = await this.pool.query(`
            SELECT binding_id, environment_binding_json
            FROM agent_kernel_pilot_environment_bindings
        `);
        const pilotConnectorActivationRows = await this.pool.query(`
            SELECT activation_id, connector_activation_json
            FROM agent_kernel_pilot_connector_activation
        `);
        const pilotExternalArtifactIntakeRows = await this.pool.query(`
            SELECT intake_id, artifact_intake_json
            FROM agent_kernel_pilot_external_artifact_intakes
        `);
        const pilotEvidenceArtifactRows = await this.pool.query(`
            SELECT artifact_id, pilot_evidence_json
            FROM agent_kernel_pilot_evidence_artifacts
        `);
        for (const row of webhookDeliveryRows.rows || []) {
            const record = row.delivery_json as WebhookDeliveryRecord;
            if (!record?.delivery_id) continue;
            await this.memory.upsertWebhookDelivery(record);
        }
        for (const row of complianceDeletionRequestRows.rows || []) {
            const record = row.deletion_request_json as AgentKernelComplianceDeletionRequestRecord;
            if (!record?.request_id) continue;
            await this.memory.upsertComplianceDeletionRequest(record);
        }
        for (const row of complianceAuditExportRows.rows || []) {
            const record = row.audit_export_json as AgentKernelAuditExportRecord;
            if (!record?.export_id) continue;
            await this.memory.upsertComplianceAuditExport(record);
        }
        for (const row of pilotActivationPackageRows.rows || []) {
            const record = row.activation_package_json as PilotActivationPackageRecord;
            if (!record?.package_id) continue;
            await this.memory.upsertPilotActivationPackage(record);
        }
        for (const row of pilotActorReadinessRows.rows || []) {
            const record = row.actor_readiness_json as PilotActorReadinessRecord;
            if (!record?.readiness_id) continue;
            await this.memory.upsertPilotActorReadiness(record);
        }
        for (const row of pilotEnvironmentBindingRows.rows || []) {
            const record = row.environment_binding_json as PilotEnvironmentBindingRecord;
            if (!record?.binding_id) continue;
            await this.memory.upsertPilotEnvironmentBinding(record);
        }
        for (const row of pilotConnectorActivationRows.rows || []) {
            const record = row.connector_activation_json as PilotConnectorActivationRecord;
            if (!record?.activation_id) continue;
            await this.memory.upsertPilotConnectorActivationRecord(record);
        }
        for (const row of pilotExternalArtifactIntakeRows.rows || []) {
            const record = row.artifact_intake_json as PilotExternalArtifactIntakeRecord;
            if (!record?.intake_id) continue;
            await this.memory.upsertPilotExternalArtifactIntake(record);
        }
        for (const row of pilotEvidenceArtifactRows.rows || []) {
            const record = row.pilot_evidence_json as PilotEvidenceArtifactRecord;
            if (!record?.artifact_id) continue;
            await this.memory.upsertPilotEvidenceArtifact(record);
        }

        const ledgerRows = await this.pool.query(`
            SELECT ledger_id, record_json
            FROM agent_kernel_execution_ledger
            ORDER BY task_id ASC, sequence ASC
        `);
        for (const row of ledgerRows.rows || []) {
            const record = row.record_json as ExecutionLedgerRecord;
            if (!record?.ledger_id) continue;
            await this.memory.appendLedgerRecord({
                ledger_id: record.ledger_id,
                dedupe_key: record.dedupe_key,
                task_id: record.task_id,
                event_type: record.event_type,
                source: record.source,
                occurred_at: record.occurred_at,
                created_at: record.created_at,
                payload: record.payload,
            });
        }

        const projectionRows = await this.pool.query(`
            SELECT task_id, projection_name, projection_json
            FROM agent_kernel_task_projections
        `);
        for (const row of projectionRows.rows || []) {
            const projection = row.projection_json as TaskQueryProjection;
            if (!projection?.task_id || !projection?.projection_name) continue;
            await this.memory.upsertTaskProjection(projection);
        }

        const checkpointRows = await this.pool.query(`
            SELECT task_id, projection_name, checkpoint_json
            FROM agent_kernel_projection_checkpoints
        `);
        for (const row of checkpointRows.rows || []) {
            const checkpoint = row.checkpoint_json as TaskProjectionCheckpoint;
            if (!checkpoint?.task_id || !checkpoint?.projection_name) continue;
            await this.memory.upsertProjectionCheckpoint(checkpoint);
        }

        const compactionHintRows = await this.pool.query(`
            SELECT hint_id, hint_json
            FROM agent_kernel_execution_ledger_compaction_hints
        `);
        for (const row of compactionHintRows.rows || []) {
            const hint = row.hint_json as ExecutionLedgerCompactionHint;
            if (!hint?.hint_id || !hint?.task_id) continue;
            await this.memory.upsertExecutionLedgerCompactionHint(hint);
        }
    }

    private async persistSnapshot(taskId: string): Promise<void> {
        if (!this.pool) return;
        const snapshot = await this.memory.getTaskSnapshot(taskId);
        if (!snapshot) return;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `
                INSERT INTO agent_kernel_tasks (task_id, graph_json, task_state_json, policy_decision_ids, updated_at)
                VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5)
                ON CONFLICT (task_id) DO UPDATE SET
                    graph_json = EXCLUDED.graph_json,
                    task_state_json = EXCLUDED.task_state_json,
                    policy_decision_ids = EXCLUDED.policy_decision_ids,
                    updated_at = EXCLUDED.updated_at
                `,
                [
                    taskId,
                    toJson(snapshot.graph),
                    toJson(snapshot.task_state),
                    toJson(snapshot.policy_decision_ids),
                    Date.now(),
                ]
            );

            await client.query('DELETE FROM agent_kernel_nodes WHERE task_id = $1', [taskId]);
            for (const nodeState of snapshot.node_states) {
                await client.query(
                    `
                    INSERT INTO agent_kernel_nodes (task_id, node_id, node_state_json, status, updated_at)
                    VALUES ($1, $2, $3::jsonb, $4, $5)
                    ON CONFLICT (task_id, node_id) DO UPDATE SET
                        node_state_json = EXCLUDED.node_state_json,
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at
                    `,
                    [
                        taskId,
                        nodeState.node_id,
                        toJson(nodeState),
                        nodeState.status,
                        Date.now(),
                    ]
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private async persistIdempotency(idempotencyKey: string, value: IdempotencyEntry): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_idempotency (idem_key, entry_json, updated_at)
            VALUES ($1, $2::jsonb, $3)
            ON CONFLICT (idem_key) DO UPDATE SET
                entry_json = EXCLUDED.entry_json,
                updated_at = EXCLUDED.updated_at
            `,
            [idempotencyKey, toJson(value), Date.now()]
        );
    }

    private async persistRetryJob(retryJob: RetryJobRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_retry_jobs (job_id, task_id, node_id, dedupe_key, retry_job_json, status, available_at, updated_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
            ON CONFLICT (job_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                node_id = EXCLUDED.node_id,
                dedupe_key = EXCLUDED.dedupe_key,
                retry_job_json = EXCLUDED.retry_job_json,
                status = EXCLUDED.status,
                available_at = EXCLUDED.available_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
                retryJob.job_id,
                retryJob.task_id,
                retryJob.node_id,
                retryJob.dedupe_key,
                toJson(retryJob),
                retryJob.status,
                retryJob.available_at,
                Date.now(),
            ]
        );
    }

    private async persistDeadLetter(deadLetter: DeadLetterRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_dead_letters (dead_letter_id, task_id, node_id, dedupe_key, dead_letter_json, status, updated_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
            ON CONFLICT (dead_letter_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                node_id = EXCLUDED.node_id,
                dedupe_key = EXCLUDED.dedupe_key,
                dead_letter_json = EXCLUDED.dead_letter_json,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            `,
            [
                deadLetter.dead_letter_id,
                deadLetter.task_id,
                deadLetter.node_id,
                deadLetter.dedupe_key,
                toJson(deadLetter),
                deadLetter.status,
                Date.now(),
            ]
        );
    }

    private async persistExecutionUnit(executionUnit: TaskExecutionUnit): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_execution_units (
                execution_unit_id,
                task_id,
                node_id,
                target_attempt,
                dedupe_key,
                unit_json,
                status,
                available_at,
                lease_expires_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
            ON CONFLICT (execution_unit_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                node_id = EXCLUDED.node_id,
                target_attempt = EXCLUDED.target_attempt,
                dedupe_key = EXCLUDED.dedupe_key,
                unit_json = EXCLUDED.unit_json,
                status = EXCLUDED.status,
                available_at = EXCLUDED.available_at,
                lease_expires_at = EXCLUDED.lease_expires_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
                executionUnit.execution_unit_id,
                executionUnit.task_id,
                executionUnit.node_id,
                executionUnit.target_attempt,
                executionUnit.dedupe_key,
                toJson(executionUnit),
                executionUnit.status,
                executionUnit.available_at,
                executionUnit.lease_expires_at ?? null,
                Date.now(),
            ]
        );
    }

    private async persistExecutionClaim(claim: TaskClaimRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_execution_claims (
                claim_id,
                execution_unit_id,
                task_id,
                node_id,
                claim_json,
                status,
                lease_expires_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
            ON CONFLICT (claim_id) DO UPDATE SET
                execution_unit_id = EXCLUDED.execution_unit_id,
                task_id = EXCLUDED.task_id,
                node_id = EXCLUDED.node_id,
                claim_json = EXCLUDED.claim_json,
                status = EXCLUDED.status,
                lease_expires_at = EXCLUDED.lease_expires_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
                claim.claim_id,
                claim.execution_unit_id,
                claim.task_id,
                claim.node_id,
                toJson(claim),
                claim.status,
                claim.lease_expires_at,
                Date.now(),
            ]
        );
    }

    private async persistWorkerSession(session: WorkerSessionRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_worker_sessions (
                session_id,
                task_id,
                worker_id,
                session_json,
                status,
                updated_at
            )
            VALUES ($1, $2, $3, $4::jsonb, $5, $6)
            ON CONFLICT (session_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                worker_id = EXCLUDED.worker_id,
                session_json = EXCLUDED.session_json,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            `,
            [
                session.session_id,
                session.task_id,
                session.worker_id,
                toJson(session),
                session.status,
                Date.now(),
            ]
        );
    }

    private async persistEnterprisePrincipal(principal: EnterprisePrincipalRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_enterprise_principals (
                principal_id,
                tenant_id,
                external_subject,
                email,
                principal_json,
                status,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
            ON CONFLICT (principal_id) DO UPDATE SET
                tenant_id = EXCLUDED.tenant_id,
                external_subject = EXCLUDED.external_subject,
                email = EXCLUDED.email,
                principal_json = EXCLUDED.principal_json,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            `,
            [
                principal.principal_id,
                principal.tenant_id,
                principal.external_subject,
                principal.email,
                toJson(principal),
                principal.status,
                Date.now(),
            ]
        );
    }

    private async persistEnterpriseAccessBinding(binding: EnterpriseAccessBindingRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_enterprise_access_bindings (
                binding_id,
                principal_id,
                tenant_id,
                workspace_id,
                binding_json,
                status,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
            ON CONFLICT (binding_id) DO UPDATE SET
                principal_id = EXCLUDED.principal_id,
                tenant_id = EXCLUDED.tenant_id,
                workspace_id = EXCLUDED.workspace_id,
                binding_json = EXCLUDED.binding_json,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            `,
            [
                binding.binding_id,
                binding.principal_id,
                binding.tenant_id,
                binding.workspace_id ?? null,
                toJson(binding),
                binding.status,
                Date.now(),
            ]
        );
    }

    private async persistEnterpriseIdentitySession(session: EnterpriseIdentitySessionRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_enterprise_identity_sessions (
                session_id,
                principal_id,
                tenant_id,
                workspace_id,
                session_json,
                status,
                expires_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
            ON CONFLICT (session_id) DO UPDATE SET
                principal_id = EXCLUDED.principal_id,
                tenant_id = EXCLUDED.tenant_id,
                workspace_id = EXCLUDED.workspace_id,
                session_json = EXCLUDED.session_json,
                status = EXCLUDED.status,
                expires_at = EXCLUDED.expires_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
                session.session_id,
                session.principal_id,
                session.tenant_id,
                session.workspace_id ?? null,
                toJson(session),
                session.status,
                session.expires_at,
                Date.now(),
            ]
        );
    }

    private async persistOidcLoginState(state: OidcLoginStateRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_oidc_login_states (
                state_id,
                tenant_id,
                workspace_id,
                oidc_state_json,
                status,
                expires_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
            ON CONFLICT (state_id) DO UPDATE SET
                tenant_id = EXCLUDED.tenant_id,
                workspace_id = EXCLUDED.workspace_id,
                oidc_state_json = EXCLUDED.oidc_state_json,
                status = EXCLUDED.status,
                expires_at = EXCLUDED.expires_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
                state.state_id,
                state.tenant_id,
                state.workspace_id ?? null,
                toJson(state),
                state.status,
                state.expires_at,
                Date.now(),
            ]
        );
    }

    private async persistEnterpriseMembershipInvite(invite: EnterpriseMembershipInviteRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_enterprise_membership_invites (
                invite_id,
                tenant_id,
                workspace_id,
                email,
                role,
                invite_json,
                status,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
            ON CONFLICT (invite_id) DO UPDATE SET
                tenant_id = EXCLUDED.tenant_id,
                workspace_id = EXCLUDED.workspace_id,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                invite_json = EXCLUDED.invite_json,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            `,
            [
                invite.invite_id,
                invite.tenant_id,
                invite.workspace_id ?? null,
                invite.email,
                invite.role,
                toJson(invite),
                invite.status,
                Date.now(),
            ]
        );
    }

    private async persistVaultCredential(record: VaultCredentialRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_vault_credentials (
                credential_id,
                connector_id,
                tenant_id,
                workspace_id,
                status,
                compromise_status,
                lease_expires_at,
                credential_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
            ON CONFLICT (credential_id) DO UPDATE SET
                connector_id = EXCLUDED.connector_id,
                tenant_id = EXCLUDED.tenant_id,
                workspace_id = EXCLUDED.workspace_id,
                status = EXCLUDED.status,
                compromise_status = EXCLUDED.compromise_status,
                lease_expires_at = EXCLUDED.lease_expires_at,
                credential_json = EXCLUDED.credential_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.credential_id,
                record.connector_id,
                record.tenant_id,
                record.workspace_id ?? null,
                record.status,
                record.compromise_status,
                record.lease_expires_at ?? null,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistWebhookDelivery(record: WebhookDeliveryRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_webhook_deliveries (
                delivery_id,
                connector_id,
                credential_id,
                tenant_id,
                workspace_id,
                status,
                created_at,
                delivery_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
            ON CONFLICT (delivery_id) DO UPDATE SET
                connector_id = EXCLUDED.connector_id,
                credential_id = EXCLUDED.credential_id,
                tenant_id = EXCLUDED.tenant_id,
                workspace_id = EXCLUDED.workspace_id,
                status = EXCLUDED.status,
                created_at = EXCLUDED.created_at,
                delivery_json = EXCLUDED.delivery_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.delivery_id,
                record.connector_id,
                record.credential_id,
                record.tenant_id,
                record.workspace_id ?? null,
                record.status,
                record.created_at,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistComplianceDeletionRequest(
        record: AgentKernelComplianceDeletionRequestRecord,
    ): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_compliance_deletion_requests (
                request_id,
                task_id,
                status,
                created_at,
                deletion_request_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (request_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                status = EXCLUDED.status,
                created_at = EXCLUDED.created_at,
                deletion_request_json = EXCLUDED.deletion_request_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.request_id,
                record.task_id,
                record.status,
                record.created_at,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistComplianceAuditExport(record: AgentKernelAuditExportRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_compliance_audit_exports (
                export_id,
                task_id,
                status,
                created_at,
                audit_export_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (export_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                status = EXCLUDED.status,
                created_at = EXCLUDED.created_at,
                audit_export_json = EXCLUDED.audit_export_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.export_id,
                record.task_id,
                record.status,
                record.created_at,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistPilotActivationPackage(record: PilotActivationPackageRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_pilot_activation_packages (
                package_id,
                workspace_key,
                owner_type,
                package_status,
                activation_package_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (package_id) DO UPDATE SET
                workspace_key = EXCLUDED.workspace_key,
                owner_type = EXCLUDED.owner_type,
                package_status = EXCLUDED.package_status,
                activation_package_json = EXCLUDED.activation_package_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.package_id,
                record.workspace_key,
                record.owner_type,
                record.status,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistPilotActorReadiness(record: PilotActorReadinessRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_pilot_actor_readiness (
                readiness_id,
                workspace_key,
                role,
                actor_readiness_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4::jsonb, $5)
            ON CONFLICT (readiness_id) DO UPDATE SET
                workspace_key = EXCLUDED.workspace_key,
                role = EXCLUDED.role,
                actor_readiness_json = EXCLUDED.actor_readiness_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.readiness_id,
                record.workspace_key,
                record.role,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistPilotEnvironmentBinding(record: PilotEnvironmentBindingRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_pilot_environment_bindings (
                binding_id,
                workspace_key,
                environment_kind,
                binding_state,
                environment_binding_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (binding_id) DO UPDATE SET
                workspace_key = EXCLUDED.workspace_key,
                environment_kind = EXCLUDED.environment_kind,
                binding_state = EXCLUDED.binding_state,
                environment_binding_json = EXCLUDED.environment_binding_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.binding_id,
                record.workspace_key,
                record.environment_kind,
                record.state,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistPilotConnectorActivation(record: PilotConnectorActivationRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_pilot_connector_activation (
                activation_id,
                workspace_key,
                connector_id,
                connector_state,
                connector_activation_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (activation_id) DO UPDATE SET
                workspace_key = EXCLUDED.workspace_key,
                connector_id = EXCLUDED.connector_id,
                connector_state = EXCLUDED.connector_state,
                connector_activation_json = EXCLUDED.connector_activation_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.activation_id,
                record.workspace_key,
                record.connector_id,
                record.state,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistPilotExternalArtifactIntake(record: PilotExternalArtifactIntakeRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_pilot_external_artifact_intakes (
                intake_id,
                workspace_key,
                artifact_kind,
                verification_status,
                artifact_intake_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (intake_id) DO UPDATE SET
                workspace_key = EXCLUDED.workspace_key,
                artifact_kind = EXCLUDED.artifact_kind,
                verification_status = EXCLUDED.verification_status,
                artifact_intake_json = EXCLUDED.artifact_intake_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.intake_id,
                record.workspace_key,
                record.artifact_kind,
                record.verification_status,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistPilotEvidenceArtifact(record: PilotEvidenceArtifactRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_pilot_evidence_artifacts (
                artifact_id,
                workspace_key,
                category,
                pilot_evidence_json,
                updated_at
            )
            VALUES ($1, $2, $3, $4::jsonb, $5)
            ON CONFLICT (artifact_id) DO UPDATE SET
                workspace_key = EXCLUDED.workspace_key,
                category = EXCLUDED.category,
                pilot_evidence_json = EXCLUDED.pilot_evidence_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                record.artifact_id,
                record.workspace_key,
                record.category,
                toJson(record),
                Date.now(),
            ]
        );
    }

    private async persistLedgerRecord(record: ExecutionLedgerRecord): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_execution_ledger (ledger_id, task_id, sequence, dedupe_key, event_type, source, payload_json, record_json, occurred_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
            ON CONFLICT (ledger_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                sequence = EXCLUDED.sequence,
                dedupe_key = EXCLUDED.dedupe_key,
                event_type = EXCLUDED.event_type,
                source = EXCLUDED.source,
                payload_json = EXCLUDED.payload_json,
                record_json = EXCLUDED.record_json,
                occurred_at = EXCLUDED.occurred_at,
                created_at = EXCLUDED.created_at
            `,
            [
                record.ledger_id,
                record.task_id,
                record.sequence,
                record.dedupe_key,
                record.event_type,
                record.source,
                toJson(record.payload || {}),
                toJson(record),
                record.occurred_at,
                record.created_at,
            ]
        );
    }

    private async persistTaskProjection(projection: TaskQueryProjection): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_task_projections (task_id, projection_name, projection_json, last_sequence, updated_at)
            VALUES ($1, $2, $3::jsonb, $4, $5)
            ON CONFLICT (task_id, projection_name) DO UPDATE SET
                projection_json = EXCLUDED.projection_json,
                last_sequence = EXCLUDED.last_sequence,
                updated_at = EXCLUDED.updated_at
            `,
            [
                projection.task_id,
                projection.projection_name,
                toJson(projection),
                projection.checkpoint.last_sequence,
                projection.updated_at,
            ]
        );
    }

    private async persistProjectionCheckpoint(checkpoint: TaskProjectionCheckpoint): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_projection_checkpoints (task_id, projection_name, checkpoint_json, last_sequence, updated_at)
            VALUES ($1, $2, $3::jsonb, $4, $5)
            ON CONFLICT (task_id, projection_name) DO UPDATE SET
                checkpoint_json = EXCLUDED.checkpoint_json,
                last_sequence = EXCLUDED.last_sequence,
                updated_at = EXCLUDED.updated_at
            `,
            [
                checkpoint.task_id,
                checkpoint.projection_name,
                toJson(checkpoint),
                checkpoint.last_sequence,
                checkpoint.updated_at,
            ]
        );
    }

    private async persistExecutionLedgerCompactionHint(hint: ExecutionLedgerCompactionHint): Promise<void> {
        if (!this.pool) return;
        await this.pool.query(
            `
            INSERT INTO agent_kernel_execution_ledger_compaction_hints (hint_id, task_id, projection_name, up_to_sequence, created_at, hint_json, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
            ON CONFLICT (hint_id) DO UPDATE SET
                task_id = EXCLUDED.task_id,
                projection_name = EXCLUDED.projection_name,
                up_to_sequence = EXCLUDED.up_to_sequence,
                created_at = EXCLUDED.created_at,
                hint_json = EXCLUDED.hint_json,
                updated_at = EXCLUDED.updated_at
            `,
            [
                hint.hint_id,
                hint.task_id,
                hint.projection_name,
                hint.up_to_sequence,
                hint.created_at,
                toJson(hint),
                hint.updated_at,
            ]
        );
    }

    async createTask(graph: TaskGraph): Promise<TaskSnapshot> {
        await this.ensureReady();
        const snapshot = await this.memory.createTask(graph);
        await this.persistSnapshot(graph.task_id);
        return snapshot;
    }

    async listTaskIds(): Promise<string[]> {
        await this.ensureReady();
        return this.memory.listTaskIds();
    }

    async getTaskSnapshot(taskId: string): Promise<TaskSnapshot | undefined> {
        await this.ensureReady();
        return this.memory.getTaskSnapshot(taskId);
    }

    async getTaskGraph(taskId: string): Promise<TaskGraph | undefined> {
        await this.ensureReady();
        return this.memory.getTaskGraph(taskId);
    }

    async getTaskState(taskId: string): Promise<TaskState | undefined> {
        await this.ensureReady();
        return this.memory.getTaskState(taskId);
    }

    async updateTaskState(taskId: string, update: Partial<TaskState>): Promise<TaskState | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateTaskState(taskId, update);
        if (next) await this.persistSnapshot(taskId);
        return next;
    }

    async listNodeStates(taskId: string): Promise<NodeState[]> {
        await this.ensureReady();
        return this.memory.listNodeStates(taskId);
    }

    async getNodeState(taskId: string, nodeId: string): Promise<NodeState | undefined> {
        await this.ensureReady();
        return this.memory.getNodeState(taskId, nodeId);
    }

    async updateNodeState(taskId: string, nodeId: string, update: Partial<NodeState>): Promise<NodeState | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateNodeState(taskId, nodeId, update);
        if (next) await this.persistSnapshot(taskId);
        return next;
    }

    async attachPolicyDecision(taskId: string, nodeId: string, decisionId: string): Promise<void> {
        await this.ensureReady();
        await this.memory.attachPolicyDecision(taskId, nodeId, decisionId);
        await this.persistSnapshot(taskId);
    }

    async getPolicyDecisionIds(taskId: string): Promise<string[]> {
        await this.ensureReady();
        return this.memory.getPolicyDecisionIds(taskId);
    }

    async getIdempotency(idempotencyKey: string): Promise<IdempotencyEntry | undefined> {
        await this.ensureReady();
        return this.memory.getIdempotency(idempotencyKey);
    }

    async setIdempotency(idempotencyKey: string, value: IdempotencyEntry): Promise<void> {
        await this.ensureReady();
        await this.memory.setIdempotency(idempotencyKey, value);
        await this.persistIdempotency(idempotencyKey, value);
    }

    async listRetryJobs(taskId: string): Promise<RetryJobRecord[]> {
        await this.ensureReady();
        return this.memory.listRetryJobs(taskId);
    }

    async upsertRetryJob(retryJob: RetryJobRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertRetryJob(retryJob);
        await this.persistRetryJob(retryJob);
    }

    async updateRetryJob(jobId: string, update: Partial<RetryJobRecord>): Promise<RetryJobRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateRetryJob(jobId, update);
        if (next) await this.persistRetryJob(next);
        return next;
    }

    async listDeadLetters(taskId: string): Promise<DeadLetterRecord[]> {
        await this.ensureReady();
        return this.memory.listDeadLetters(taskId);
    }

    async upsertDeadLetter(deadLetter: DeadLetterRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertDeadLetter(deadLetter);
        await this.persistDeadLetter(deadLetter);
    }

    async listExecutionUnits(taskId: string): Promise<TaskExecutionUnit[]> {
        await this.ensureReady();
        return this.memory.listExecutionUnits(taskId);
    }

    async getExecutionUnit(executionUnitId: string): Promise<TaskExecutionUnit | undefined> {
        await this.ensureReady();
        return this.memory.getExecutionUnit(executionUnitId);
    }

    async upsertExecutionUnit(executionUnit: TaskExecutionUnit): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertExecutionUnit(executionUnit);
        await this.persistExecutionUnit(executionUnit);
    }

    async updateExecutionUnit(
        executionUnitId: string,
        update: Partial<TaskExecutionUnit>
    ): Promise<TaskExecutionUnit | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateExecutionUnit(executionUnitId, update);
        if (next) await this.persistExecutionUnit(next);
        return next;
    }

    async listExecutionClaims(taskId: string): Promise<TaskClaimRecord[]> {
        await this.ensureReady();
        return this.memory.listExecutionClaims(taskId);
    }

    async getExecutionClaim(claimId: string): Promise<TaskClaimRecord | undefined> {
        await this.ensureReady();
        return this.memory.getExecutionClaim(claimId);
    }

    async upsertExecutionClaim(claim: TaskClaimRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertExecutionClaim(claim);
        await this.persistExecutionClaim(claim);
    }

    async updateExecutionClaim(
        claimId: string,
        update: Partial<TaskClaimRecord>
    ): Promise<TaskClaimRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateExecutionClaim(claimId, update);
        if (next) await this.persistExecutionClaim(next);
        return next;
    }

    async listWorkerSessions(taskId: string): Promise<WorkerSessionRecord[]> {
        await this.ensureReady();
        return this.memory.listWorkerSessions(taskId);
    }

    async getWorkerSession(sessionId: string): Promise<WorkerSessionRecord | undefined> {
        await this.ensureReady();
        return this.memory.getWorkerSession(sessionId);
    }

    async upsertWorkerSession(session: WorkerSessionRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertWorkerSession(session);
        await this.persistWorkerSession(session);
    }

    async updateWorkerSession(
        sessionId: string,
        update: Partial<WorkerSessionRecord>
    ): Promise<WorkerSessionRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateWorkerSession(sessionId, update);
        if (next) await this.persistWorkerSession(next);
        return next;
    }

    async listEnterprisePrincipals(): Promise<EnterprisePrincipalRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterprisePrincipals();
    }

    async getEnterprisePrincipal(principalId: string): Promise<EnterprisePrincipalRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterprisePrincipal(principalId);
    }

    async upsertEnterprisePrincipal(principal: EnterprisePrincipalRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterprisePrincipal(principal);
        await this.persistEnterprisePrincipal(principal);
    }

    async updateEnterprisePrincipal(
        principalId: string,
        update: Partial<EnterprisePrincipalRecord>
    ): Promise<EnterprisePrincipalRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterprisePrincipal(principalId, update);
        if (next) await this.persistEnterprisePrincipal(next);
        return next;
    }

    async listEnterpriseAccessBindings(principalId?: string): Promise<EnterpriseAccessBindingRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterpriseAccessBindings(principalId);
    }

    async getEnterpriseAccessBinding(bindingId: string): Promise<EnterpriseAccessBindingRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterpriseAccessBinding(bindingId);
    }

    async upsertEnterpriseAccessBinding(binding: EnterpriseAccessBindingRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterpriseAccessBinding(binding);
        await this.persistEnterpriseAccessBinding(binding);
    }

    async updateEnterpriseAccessBinding(
        bindingId: string,
        update: Partial<EnterpriseAccessBindingRecord>
    ): Promise<EnterpriseAccessBindingRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterpriseAccessBinding(bindingId, update);
        if (next) await this.persistEnterpriseAccessBinding(next);
        return next;
    }

    async listEnterpriseIdentitySessions(principalId?: string): Promise<EnterpriseIdentitySessionRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterpriseIdentitySessions(principalId);
    }

    async getEnterpriseIdentitySession(sessionId: string): Promise<EnterpriseIdentitySessionRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterpriseIdentitySession(sessionId);
    }

    async upsertEnterpriseIdentitySession(session: EnterpriseIdentitySessionRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterpriseIdentitySession(session);
        await this.persistEnterpriseIdentitySession(session);
    }

    async updateEnterpriseIdentitySession(
        sessionId: string,
        update: Partial<EnterpriseIdentitySessionRecord>
    ): Promise<EnterpriseIdentitySessionRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterpriseIdentitySession(sessionId, update);
        if (next) await this.persistEnterpriseIdentitySession(next);
        return next;
    }

    async getOidcLoginState(stateId: string): Promise<OidcLoginStateRecord | undefined> {
        await this.ensureReady();
        return this.memory.getOidcLoginState(stateId);
    }

    async upsertOidcLoginState(state: OidcLoginStateRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertOidcLoginState(state);
        await this.persistOidcLoginState(state);
    }

    async updateOidcLoginState(
        stateId: string,
        update: Partial<OidcLoginStateRecord>
    ): Promise<OidcLoginStateRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateOidcLoginState(stateId, update);
        if (next) await this.persistOidcLoginState(next);
        return next;
    }

    async listEnterpriseMembershipInvites(tenantId?: string, workspaceId?: string): Promise<EnterpriseMembershipInviteRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterpriseMembershipInvites(tenantId, workspaceId);
    }

    async getEnterpriseMembershipInvite(inviteId: string): Promise<EnterpriseMembershipInviteRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterpriseMembershipInvite(inviteId);
    }

    async upsertEnterpriseMembershipInvite(invite: EnterpriseMembershipInviteRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterpriseMembershipInvite(invite);
        await this.persistEnterpriseMembershipInvite(invite);
    }

    async updateEnterpriseMembershipInvite(
        inviteId: string,
        update: Partial<EnterpriseMembershipInviteRecord>
    ): Promise<EnterpriseMembershipInviteRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterpriseMembershipInvite(inviteId, update);
        if (next) await this.persistEnterpriseMembershipInvite(next);
        return next;
    }

    async listVaultCredentials(connectorId?: string): Promise<VaultCredentialRecord[]> {
        await this.ensureReady();
        return this.memory.listVaultCredentials(connectorId);
    }

    async getVaultCredential(credentialId: string): Promise<VaultCredentialRecord | undefined> {
        await this.ensureReady();
        return this.memory.getVaultCredential(credentialId);
    }

    async upsertVaultCredential(record: VaultCredentialRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertVaultCredential(record);
        await this.persistVaultCredential(record);
    }

    async updateVaultCredential(
        credentialId: string,
        update: Partial<VaultCredentialRecord>
    ): Promise<VaultCredentialRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateVaultCredential(credentialId, update);
        if (next) await this.persistVaultCredential(next);
        return next;
    }

    async listWebhookDeliveries(connectorId?: string): Promise<WebhookDeliveryRecord[]> {
        await this.ensureReady();
        return this.memory.listWebhookDeliveries(connectorId);
    }

    async getWebhookDelivery(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
        await this.ensureReady();
        return this.memory.getWebhookDelivery(deliveryId);
    }

    async upsertWebhookDelivery(record: WebhookDeliveryRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertWebhookDelivery(record);
        await this.persistWebhookDelivery(record);
    }

    async updateWebhookDelivery(
        deliveryId: string,
        update: Partial<WebhookDeliveryRecord>
    ): Promise<WebhookDeliveryRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateWebhookDelivery(deliveryId, update);
        if (next) await this.persistWebhookDelivery(next);
        return next;
    }

    async listComplianceDeletionRequests(taskId?: string): Promise<AgentKernelComplianceDeletionRequestRecord[]> {
        await this.ensureReady();
        return this.memory.listComplianceDeletionRequests(taskId);
    }

    async getComplianceDeletionRequest(
        requestId: string,
    ): Promise<AgentKernelComplianceDeletionRequestRecord | undefined> {
        await this.ensureReady();
        return this.memory.getComplianceDeletionRequest(requestId);
    }

    async upsertComplianceDeletionRequest(record: AgentKernelComplianceDeletionRequestRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertComplianceDeletionRequest(record);
        await this.persistComplianceDeletionRequest(record);
    }

    async listComplianceAuditExports(taskId?: string): Promise<AgentKernelAuditExportRecord[]> {
        await this.ensureReady();
        return this.memory.listComplianceAuditExports(taskId);
    }

    async getComplianceAuditExport(exportId: string): Promise<AgentKernelAuditExportRecord | undefined> {
        await this.ensureReady();
        return this.memory.getComplianceAuditExport(exportId);
    }

    async upsertComplianceAuditExport(record: AgentKernelAuditExportRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertComplianceAuditExport(record);
        await this.persistComplianceAuditExport(record);
    }

    async listPilotActivationPackages(workspaceKey?: string): Promise<PilotActivationPackageRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotActivationPackages(workspaceKey);
    }

    async getPilotActivationPackage(packageId: string): Promise<PilotActivationPackageRecord | undefined> {
        await this.ensureReady();
        return this.memory.getPilotActivationPackage(packageId);
    }

    async upsertPilotActivationPackage(record: PilotActivationPackageRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotActivationPackage(record);
        await this.persistPilotActivationPackage(record);
    }

    async listPilotActorReadiness(workspaceKey?: string): Promise<PilotActorReadinessRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotActorReadiness(workspaceKey);
    }

    async listPilotEnvironmentBindings(workspaceKey?: string): Promise<PilotEnvironmentBindingRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotEnvironmentBindings(workspaceKey);
    }

    async upsertPilotEnvironmentBinding(record: PilotEnvironmentBindingRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotEnvironmentBinding(record);
        await this.persistPilotEnvironmentBinding(record);
    }

    async upsertPilotActorReadiness(record: PilotActorReadinessRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotActorReadiness(record);
        await this.persistPilotActorReadiness(record);
    }

    async listPilotConnectorActivationRecords(workspaceKey?: string): Promise<PilotConnectorActivationRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotConnectorActivationRecords(workspaceKey);
    }

    async upsertPilotConnectorActivationRecord(record: PilotConnectorActivationRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotConnectorActivationRecord(record);
        await this.persistPilotConnectorActivation(record);
    }

    async listPilotExternalArtifactIntakes(workspaceKey?: string): Promise<PilotExternalArtifactIntakeRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotExternalArtifactIntakes(workspaceKey);
    }

    async getPilotExternalArtifactIntake(intakeId: string): Promise<PilotExternalArtifactIntakeRecord | undefined> {
        await this.ensureReady();
        return this.memory.getPilotExternalArtifactIntake(intakeId);
    }

    async upsertPilotExternalArtifactIntake(record: PilotExternalArtifactIntakeRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotExternalArtifactIntake(record);
        await this.persistPilotExternalArtifactIntake(record);
    }

    async listPilotEvidenceArtifacts(workspaceKey?: string): Promise<PilotEvidenceArtifactRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotEvidenceArtifacts(workspaceKey);
    }

    async upsertPilotEvidenceArtifact(record: PilotEvidenceArtifactRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotEvidenceArtifact(record);
        await this.persistPilotEvidenceArtifact(record);
    }

    async appendLedgerRecord(record: Omit<ExecutionLedgerRecord, 'sequence'>) {
        await this.ensureReady();
        const result = await this.memory.appendLedgerRecord(record);
        await this.persistLedgerRecord(result.record);
        return result;
    }

    async listLedgerRecords(filter?: ExecutionLedgerReadFilter): Promise<ExecutionLedgerRecord[]> {
        await this.ensureReady();
        return this.memory.listLedgerRecords(filter);
    }

    async listExecutionLedgerCompactionHints(taskId?: string): Promise<ExecutionLedgerCompactionHint[]> {
        await this.ensureReady();
        return this.memory.listExecutionLedgerCompactionHints(taskId);
    }

    async upsertExecutionLedgerCompactionHint(hint: ExecutionLedgerCompactionHint): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertExecutionLedgerCompactionHint(hint);
        const persistedHint = (await this.memory.listExecutionLedgerCompactionHints(hint.task_id))
            .find((candidate) => candidate.hint_id === hint.hint_id) || hint;
        await this.persistExecutionLedgerCompactionHint(persistedHint);
    }

    async getTaskProjection(taskId: string, projectionName: string): Promise<TaskQueryProjection | undefined> {
        await this.ensureReady();
        return this.memory.getTaskProjection(taskId, projectionName);
    }

    async upsertTaskProjection(projection: TaskQueryProjection): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertTaskProjection(projection);
        await this.persistTaskProjection(projection);
    }

    async getProjectionCheckpoint(taskId: string, projectionName: string): Promise<TaskProjectionCheckpoint | undefined> {
        await this.ensureReady();
        return this.memory.getProjectionCheckpoint(taskId, projectionName);
    }

    async upsertProjectionCheckpoint(checkpoint: TaskProjectionCheckpoint): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertProjectionCheckpoint(checkpoint);
        await this.persistProjectionCheckpoint(checkpoint);
    }
}

class RedisTaskStore implements TaskStore {
    private readonly memory = new InMemoryTaskStore();
    private readonly connectionUrl?: string;
    private readonly keyPrefix: string;
    private client: any | null = null;
    private readonly readyPromise: Promise<void>;

    constructor(connectionUrl?: string, keyPrefix = 'agent-kernel') {
        this.connectionUrl = connectionUrl;
        this.keyPrefix = keyPrefix;
        this.readyPromise = this.init();
    }

    private tasksIndexKey(): string {
        return `${this.keyPrefix}:tasks`;
    }

    private idempotencyIndexKey(): string {
        return `${this.keyPrefix}:idempotency`;
    }

    private retryJobsIndexKey(): string {
        return `${this.keyPrefix}:retry-jobs`;
    }

    private deadLettersIndexKey(): string {
        return `${this.keyPrefix}:dead-letters`;
    }

    private executionUnitsIndexKey(): string {
        return `${this.keyPrefix}:execution-units`;
    }

    private executionClaimsIndexKey(): string {
        return `${this.keyPrefix}:execution-claims`;
    }

    private workerSessionsIndexKey(): string {
        return `${this.keyPrefix}:worker-sessions`;
    }

    private enterprisePrincipalsIndexKey(): string {
        return `${this.keyPrefix}:enterprise-principals`;
    }

    private enterpriseAccessBindingsIndexKey(): string {
        return `${this.keyPrefix}:enterprise-access-bindings`;
    }

    private enterpriseIdentitySessionsIndexKey(): string {
        return `${this.keyPrefix}:enterprise-identity-sessions`;
    }

    private oidcLoginStatesIndexKey(): string {
        return `${this.keyPrefix}:oidc-login-states`;
    }

    private vaultCredentialsIndexKey(): string {
        return `${this.keyPrefix}:vault-credentials`;
    }

    private webhookDeliveriesIndexKey(): string {
        return `${this.keyPrefix}:webhook-deliveries`;
    }

    private complianceDeletionRequestsIndexKey(): string {
        return `${this.keyPrefix}:compliance-deletion-requests`;
    }

    private complianceAuditExportsIndexKey(): string {
        return `${this.keyPrefix}:compliance-audit-exports`;
    }

    private pilotActivationPackagesIndexKey(): string {
        return `${this.keyPrefix}:pilot-activation-packages`;
    }

    private pilotActorReadinessIndexKey(): string {
        return `${this.keyPrefix}:pilot-actor-readiness`;
    }

    private pilotEnvironmentBindingsIndexKey(): string {
        return `${this.keyPrefix}:pilot-environment-bindings`;
    }

    private pilotConnectorActivationIndexKey(): string {
        return `${this.keyPrefix}:pilot-connector-activation`;
    }

    private pilotExternalArtifactIntakesIndexKey(): string {
        return `${this.keyPrefix}:pilot-external-artifact-intakes`;
    }

    private pilotEvidenceArtifactsIndexKey(): string {
        return `${this.keyPrefix}:pilot-evidence-artifacts`;
    }

    private taskProjectionsIndexKey(): string {
        return `${this.keyPrefix}:task-projections`;
    }

    private projectionCheckpointsIndexKey(): string {
        return `${this.keyPrefix}:projection-checkpoints`;
    }

    private ledgerCompactionHintsIndexKey(): string {
        return `${this.keyPrefix}:ledger-compaction-hints`;
    }

    private taskLedgerIndexKey(taskId: string): string {
        return `${this.keyPrefix}:task:${taskId}:ledger`;
    }

    private taskKey(taskId: string): string {
        return `${this.keyPrefix}:task:${taskId}`;
    }

    private idempotencyKey(key: string): string {
        const digest = crypto.createHash('sha256').update(key).digest('hex');
        return `${this.keyPrefix}:idem:${digest}`;
    }

    private retryJobKey(jobId: string): string {
        return `${this.keyPrefix}:retry-job:${jobId}`;
    }

    private deadLetterKey(deadLetterId: string): string {
        return `${this.keyPrefix}:dead-letter:${deadLetterId}`;
    }

    private executionUnitKey(executionUnitId: string): string {
        return `${this.keyPrefix}:execution-unit:${executionUnitId}`;
    }

    private executionClaimKey(claimId: string): string {
        return `${this.keyPrefix}:execution-claim:${claimId}`;
    }

    private workerSessionKey(sessionId: string): string {
        return `${this.keyPrefix}:worker-session:${sessionId}`;
    }

    private enterprisePrincipalKey(principalId: string): string {
        return `${this.keyPrefix}:enterprise-principal:${principalId}`;
    }

    private enterpriseAccessBindingKey(bindingId: string): string {
        return `${this.keyPrefix}:enterprise-access-binding:${bindingId}`;
    }

    private enterpriseIdentitySessionKey(sessionId: string): string {
        return `${this.keyPrefix}:enterprise-identity-session:${sessionId}`;
    }

    private oidcLoginStateKey(stateId: string): string {
        return `${this.keyPrefix}:oidc-login-state:${stateId}`;
    }

    private enterpriseMembershipInvitesIndexKey(): string {
        return `${this.keyPrefix}:enterprise-membership-invites`;
    }

    private enterpriseMembershipInviteKey(inviteId: string): string {
        return `${this.keyPrefix}:enterprise-membership-invite:${inviteId}`;
    }

    private vaultCredentialKey(credentialId: string): string {
        return `${this.keyPrefix}:vault-credential:${credentialId}`;
    }

    private webhookDeliveryKey(deliveryId: string): string {
        return `${this.keyPrefix}:webhook-delivery:${deliveryId}`;
    }

    private complianceDeletionRequestKey(requestId: string): string {
        return `${this.keyPrefix}:compliance-deletion-request:${requestId}`;
    }

    private complianceAuditExportKey(exportId: string): string {
        return `${this.keyPrefix}:compliance-audit-export:${exportId}`;
    }

    private pilotActivationPackageKey(packageId: string): string {
        return `${this.keyPrefix}:pilot-activation-package:${packageId}`;
    }

    private pilotActorReadinessKey(readinessId: string): string {
        return `${this.keyPrefix}:pilot-actor-readiness:${readinessId}`;
    }

    private pilotEnvironmentBindingKey(bindingId: string): string {
        return `${this.keyPrefix}:pilot-environment-binding:${bindingId}`;
    }

    private pilotConnectorActivationKey(activationId: string): string {
        return `${this.keyPrefix}:pilot-connector-activation:${activationId}`;
    }

    private pilotExternalArtifactIntakeKey(intakeId: string): string {
        return `${this.keyPrefix}:pilot-external-artifact-intake:${intakeId}`;
    }

    private pilotEvidenceArtifactKey(artifactId: string): string {
        return `${this.keyPrefix}:pilot-evidence-artifact:${artifactId}`;
    }

    private ledgerRecordKey(ledgerId: string): string {
        return `${this.keyPrefix}:ledger:${ledgerId}`;
    }

    private taskProjectionKey(taskId: string, projectionName: string): string {
        return `${this.keyPrefix}:task-projection:${taskId}:${projectionName}`;
    }

    private projectionCheckpointKey(taskId: string, projectionName: string): string {
        return `${this.keyPrefix}:projection-checkpoint:${taskId}:${projectionName}`;
    }

    private ledgerCompactionHintKey(hintId: string): string {
        return `${this.keyPrefix}:ledger-compaction-hint:${hintId}`;
    }

    private async init(): Promise<void> {
        if (!this.connectionUrl) {
            console.warn('[AgentKernel] RedisTaskStore requested without connection string. Falling back to in-memory mode.');
            return;
        }

        const redis = await import('redis');
        this.client = redis.createClient({
            url: this.connectionUrl,
        });
        await this.client.connect();
        await this.hydrateFromRedis();
    }

    private async ensureReady(): Promise<void> {
        await this.readyPromise;
    }

    private async hydrateFromRedis(): Promise<void> {
        if (!this.client) return;
        const taskIds = await this.client.sMembers(this.tasksIndexKey());
        const snapshots: TaskSnapshot[] = [];

        for (const taskId of taskIds) {
            const raw = await this.client.get(this.taskKey(taskId));
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as TaskSnapshot;
                snapshots.push(parsed);
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse task snapshot from redis', { taskId, error });
            }
        }

        this.memory.hydrateFromSnapshots(snapshots);

        const idempotencyKeys = await this.client.sMembers(this.idempotencyIndexKey());
        for (const cacheKey of idempotencyKeys) {
            const raw = await this.client.get(cacheKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as { key: string; value: IdempotencyEntry };
                if (parsed?.key) {
                    await this.memory.setIdempotency(parsed.key, parsed.value);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse idempotency cache from redis', { cacheKey, error });
            }
        }

        const retryJobKeys = await this.client.sMembers(this.retryJobsIndexKey());
        for (const cacheKey of retryJobKeys) {
            const raw = await this.client.get(cacheKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as RetryJobRecord;
                if (parsed?.job_id) {
                    await this.memory.upsertRetryJob(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse retry job from redis', { cacheKey, error });
            }
        }

        const deadLetterKeys = await this.client.sMembers(this.deadLettersIndexKey());
        for (const cacheKey of deadLetterKeys) {
            const raw = await this.client.get(cacheKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as DeadLetterRecord;
                if (parsed?.dead_letter_id) {
                    await this.memory.upsertDeadLetter(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse dead letter from redis', { cacheKey, error });
            }
        }

        const executionUnitKeys = await this.client.sMembers(this.executionUnitsIndexKey());
        for (const storageKey of executionUnitKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as TaskExecutionUnit;
                if (parsed?.execution_unit_id) {
                    await this.memory.upsertExecutionUnit(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse execution unit from redis', { storageKey, error });
            }
        }

        const executionClaimKeys = await this.client.sMembers(this.executionClaimsIndexKey());
        for (const storageKey of executionClaimKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as TaskClaimRecord;
                if (parsed?.claim_id) {
                    await this.memory.upsertExecutionClaim(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse execution claim from redis', { storageKey, error });
            }
        }

        const workerSessionKeys = await this.client.sMembers(this.workerSessionsIndexKey());
        for (const storageKey of workerSessionKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as WorkerSessionRecord;
                if (parsed?.session_id) {
                    await this.memory.upsertWorkerSession(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse worker session from redis', { storageKey, error });
            }
        }

        const enterprisePrincipalKeys = await this.client.sMembers(this.enterprisePrincipalsIndexKey());
        for (const storageKey of enterprisePrincipalKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as EnterprisePrincipalRecord;
                if (parsed?.principal_id) {
                    await this.memory.upsertEnterprisePrincipal(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse enterprise principal from redis', { storageKey, error });
            }
        }

        const enterpriseAccessBindingKeys = await this.client.sMembers(this.enterpriseAccessBindingsIndexKey());
        for (const storageKey of enterpriseAccessBindingKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as EnterpriseAccessBindingRecord;
                if (parsed?.binding_id) {
                    await this.memory.upsertEnterpriseAccessBinding(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse enterprise access binding from redis', { storageKey, error });
            }
        }

        const enterpriseIdentitySessionKeys = await this.client.sMembers(this.enterpriseIdentitySessionsIndexKey());
        for (const storageKey of enterpriseIdentitySessionKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as EnterpriseIdentitySessionRecord;
                if (parsed?.session_id) {
                    await this.memory.upsertEnterpriseIdentitySession(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse enterprise identity session from redis', { storageKey, error });
            }
        }

        const oidcLoginStateKeys = await this.client.sMembers(this.oidcLoginStatesIndexKey());
        for (const storageKey of oidcLoginStateKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as OidcLoginStateRecord;
                if (parsed?.state_id) {
                    await this.memory.upsertOidcLoginState(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse OIDC login state from redis', { storageKey, error });
            }
        }

        const enterpriseMembershipInviteKeys = await this.client.sMembers(this.enterpriseMembershipInvitesIndexKey());
        for (const storageKey of enterpriseMembershipInviteKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as EnterpriseMembershipInviteRecord;
                if (parsed?.invite_id) {
                    await this.memory.upsertEnterpriseMembershipInvite(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse enterprise membership invite from redis', { storageKey, error });
            }
        }

        const vaultCredentialKeys = await this.client.sMembers(this.vaultCredentialsIndexKey());
        for (const storageKey of vaultCredentialKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as VaultCredentialRecord;
                if (parsed?.credential_id) {
                    await this.memory.upsertVaultCredential(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse vault credential from redis', { storageKey, error });
            }
        }

        const webhookDeliveryKeys = await this.client.sMembers(this.webhookDeliveriesIndexKey());
        for (const storageKey of webhookDeliveryKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as WebhookDeliveryRecord;
                if (parsed?.delivery_id) {
                    await this.memory.upsertWebhookDelivery(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse webhook delivery from redis', { storageKey, error });
            }
        }

        const complianceDeletionRequestKeys = await this.client.sMembers(this.complianceDeletionRequestsIndexKey());
        for (const storageKey of complianceDeletionRequestKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as AgentKernelComplianceDeletionRequestRecord;
                if (parsed?.request_id) {
                    await this.memory.upsertComplianceDeletionRequest(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse compliance deletion request from redis', { storageKey, error });
            }
        }

        const complianceAuditExportKeys = await this.client.sMembers(this.complianceAuditExportsIndexKey());
        for (const storageKey of complianceAuditExportKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as AgentKernelAuditExportRecord;
                if (parsed?.export_id) {
                    await this.memory.upsertComplianceAuditExport(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse compliance audit export from redis', { storageKey, error });
            }
        }

        const pilotActivationPackageKeys = await this.client.sMembers(this.pilotActivationPackagesIndexKey());
        for (const storageKey of pilotActivationPackageKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as PilotActivationPackageRecord;
                if (parsed?.package_id) {
                    await this.memory.upsertPilotActivationPackage(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse pilot activation package from redis', { storageKey, error });
            }
        }

        const pilotActorReadinessKeys = await this.client.sMembers(this.pilotActorReadinessIndexKey());
        for (const storageKey of pilotActorReadinessKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as PilotActorReadinessRecord;
                if (parsed?.readiness_id) {
                    await this.memory.upsertPilotActorReadiness(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse pilot actor readiness from redis', { storageKey, error });
            }
        }

        const pilotEnvironmentBindingKeys = await this.client.sMembers(this.pilotEnvironmentBindingsIndexKey());
        for (const storageKey of pilotEnvironmentBindingKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as PilotEnvironmentBindingRecord;
                if (parsed?.binding_id) {
                    await this.memory.upsertPilotEnvironmentBinding(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse pilot environment binding from redis', { storageKey, error });
            }
        }

        const pilotConnectorActivationKeys = await this.client.sMembers(this.pilotConnectorActivationIndexKey());
        for (const storageKey of pilotConnectorActivationKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as PilotConnectorActivationRecord;
                if (parsed?.activation_id) {
                    await this.memory.upsertPilotConnectorActivationRecord(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse pilot connector activation from redis', { storageKey, error });
            }
        }

        const pilotExternalArtifactIntakeKeys = await this.client.sMembers(this.pilotExternalArtifactIntakesIndexKey());
        for (const storageKey of pilotExternalArtifactIntakeKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as PilotExternalArtifactIntakeRecord;
                if (parsed?.intake_id) {
                    await this.memory.upsertPilotExternalArtifactIntake(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse pilot external artifact intake from redis', { storageKey, error });
            }
        }

        const pilotEvidenceArtifactKeys = await this.client.sMembers(this.pilotEvidenceArtifactsIndexKey());
        for (const storageKey of pilotEvidenceArtifactKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as PilotEvidenceArtifactRecord;
                if (parsed?.artifact_id) {
                    await this.memory.upsertPilotEvidenceArtifact(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse pilot evidence artifact from redis', { storageKey, error });
            }
        }

        for (const taskId of taskIds) {
            const ledgerKeys = await this.client.sMembers(this.taskLedgerIndexKey(taskId));
            const records: ExecutionLedgerRecord[] = [];
            for (const storageKey of ledgerKeys) {
                const raw = await this.client.get(storageKey);
                if (!raw) continue;
                try {
                    const parsed = JSON.parse(raw) as ExecutionLedgerRecord;
                    if (parsed?.ledger_id) {
                        records.push(parsed);
                    }
                } catch (error) {
                    console.warn('[AgentKernel] Failed to parse execution ledger record from redis', { storageKey, error });
                }
            }
            records.sort((a, b) => a.sequence - b.sequence);
            for (const record of records) {
                await this.memory.appendLedgerRecord({
                    ledger_id: record.ledger_id,
                    dedupe_key: record.dedupe_key,
                    task_id: record.task_id,
                    event_type: record.event_type,
                    source: record.source,
                    occurred_at: record.occurred_at,
                    created_at: record.created_at,
                    payload: record.payload,
                });
            }
        }

        const projectionKeys = await this.client.sMembers(this.taskProjectionsIndexKey());
        for (const storageKey of projectionKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as TaskQueryProjection;
                if (parsed?.task_id && parsed?.projection_name) {
                    await this.memory.upsertTaskProjection(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse task projection from redis', { storageKey, error });
            }
        }

        const checkpointKeys = await this.client.sMembers(this.projectionCheckpointsIndexKey());
        for (const storageKey of checkpointKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as TaskProjectionCheckpoint;
                if (parsed?.task_id && parsed?.projection_name) {
                    await this.memory.upsertProjectionCheckpoint(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse projection checkpoint from redis', { storageKey, error });
            }
        }

        const compactionHintKeys = await this.client.sMembers(this.ledgerCompactionHintsIndexKey());
        for (const storageKey of compactionHintKeys) {
            const raw = await this.client.get(storageKey);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw) as ExecutionLedgerCompactionHint;
                if (parsed?.hint_id && parsed?.task_id) {
                    await this.memory.upsertExecutionLedgerCompactionHint(parsed);
                }
            } catch (error) {
                console.warn('[AgentKernel] Failed to parse ledger compaction hint from redis', { storageKey, error });
            }
        }
    }

    private async persistSnapshot(taskId: string): Promise<void> {
        if (!this.client) return;
        const snapshot = await this.memory.getTaskSnapshot(taskId);
        if (!snapshot) return;
        await this.client.set(this.taskKey(taskId), JSON.stringify(snapshot));
        await this.client.sAdd(this.tasksIndexKey(), taskId);
    }

    private async persistIdempotency(idempotencyKey: string, value: IdempotencyEntry): Promise<void> {
        if (!this.client) return;
        const storageKey = this.idempotencyKey(idempotencyKey);
        await this.client.set(
            storageKey,
            JSON.stringify({
                key: idempotencyKey,
                value,
            })
        );
        await this.client.sAdd(this.idempotencyIndexKey(), storageKey);
    }

    private async persistRetryJob(retryJob: RetryJobRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.retryJobKey(retryJob.job_id);
        await this.client.set(storageKey, JSON.stringify(retryJob));
        await this.client.sAdd(this.retryJobsIndexKey(), storageKey);
    }

    private async persistDeadLetter(deadLetter: DeadLetterRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.deadLetterKey(deadLetter.dead_letter_id);
        await this.client.set(storageKey, JSON.stringify(deadLetter));
        await this.client.sAdd(this.deadLettersIndexKey(), storageKey);
    }

    private async persistExecutionUnit(executionUnit: TaskExecutionUnit): Promise<void> {
        if (!this.client) return;
        const storageKey = this.executionUnitKey(executionUnit.execution_unit_id);
        await this.client.set(storageKey, JSON.stringify(executionUnit));
        await this.client.sAdd(this.executionUnitsIndexKey(), storageKey);
    }

    private async persistExecutionClaim(claim: TaskClaimRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.executionClaimKey(claim.claim_id);
        await this.client.set(storageKey, JSON.stringify(claim));
        await this.client.sAdd(this.executionClaimsIndexKey(), storageKey);
    }

    private async persistWorkerSession(session: WorkerSessionRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.workerSessionKey(session.session_id);
        await this.client.set(storageKey, JSON.stringify(session));
        await this.client.sAdd(this.workerSessionsIndexKey(), storageKey);
    }

    private async persistEnterprisePrincipal(principal: EnterprisePrincipalRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.enterprisePrincipalKey(principal.principal_id);
        await this.client.set(storageKey, JSON.stringify(principal));
        await this.client.sAdd(this.enterprisePrincipalsIndexKey(), storageKey);
    }

    private async persistEnterpriseAccessBinding(binding: EnterpriseAccessBindingRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.enterpriseAccessBindingKey(binding.binding_id);
        await this.client.set(storageKey, JSON.stringify(binding));
        await this.client.sAdd(this.enterpriseAccessBindingsIndexKey(), storageKey);
    }

    private async persistEnterpriseIdentitySession(session: EnterpriseIdentitySessionRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.enterpriseIdentitySessionKey(session.session_id);
        await this.client.set(storageKey, JSON.stringify(session));
        await this.client.sAdd(this.enterpriseIdentitySessionsIndexKey(), storageKey);
    }

    private async persistOidcLoginState(state: OidcLoginStateRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.oidcLoginStateKey(state.state_id);
        await this.client.set(storageKey, JSON.stringify(state));
        await this.client.sAdd(this.oidcLoginStatesIndexKey(), storageKey);
    }

    private async persistEnterpriseMembershipInvite(invite: EnterpriseMembershipInviteRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.enterpriseMembershipInviteKey(invite.invite_id);
        await this.client.set(storageKey, JSON.stringify(invite));
        await this.client.sAdd(this.enterpriseMembershipInvitesIndexKey(), storageKey);
    }

    private async persistVaultCredential(record: VaultCredentialRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.vaultCredentialKey(record.credential_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.vaultCredentialsIndexKey(), storageKey);
    }

    private async persistWebhookDelivery(record: WebhookDeliveryRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.webhookDeliveryKey(record.delivery_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.webhookDeliveriesIndexKey(), storageKey);
    }

    private async persistComplianceDeletionRequest(
        record: AgentKernelComplianceDeletionRequestRecord,
    ): Promise<void> {
        if (!this.client) return;
        const storageKey = this.complianceDeletionRequestKey(record.request_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.complianceDeletionRequestsIndexKey(), storageKey);
    }

    private async persistComplianceAuditExport(record: AgentKernelAuditExportRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.complianceAuditExportKey(record.export_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.complianceAuditExportsIndexKey(), storageKey);
    }

    private async persistLedgerRecord(record: ExecutionLedgerRecord): Promise<void> {
        if (!this.client) return;
        const storageKey = this.ledgerRecordKey(record.ledger_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.taskLedgerIndexKey(record.task_id), storageKey);
    }

    private async persistTaskProjection(projection: TaskQueryProjection): Promise<void> {
        if (!this.client) return;
        const storageKey = this.taskProjectionKey(projection.task_id, projection.projection_name);
        await this.client.set(storageKey, JSON.stringify(projection));
        await this.client.sAdd(this.taskProjectionsIndexKey(), storageKey);
    }

    private async persistProjectionCheckpoint(checkpoint: TaskProjectionCheckpoint): Promise<void> {
        if (!this.client) return;
        const storageKey = this.projectionCheckpointKey(checkpoint.task_id, checkpoint.projection_name);
        await this.client.set(storageKey, JSON.stringify(checkpoint));
        await this.client.sAdd(this.projectionCheckpointsIndexKey(), storageKey);
    }

    private async persistExecutionLedgerCompactionHint(hint: ExecutionLedgerCompactionHint): Promise<void> {
        if (!this.client) return;
        const storageKey = this.ledgerCompactionHintKey(hint.hint_id);
        await this.client.set(storageKey, JSON.stringify(hint));
        await this.client.sAdd(this.ledgerCompactionHintsIndexKey(), storageKey);
    }

    async createTask(graph: TaskGraph): Promise<TaskSnapshot> {
        await this.ensureReady();
        const snapshot = await this.memory.createTask(graph);
        await this.persistSnapshot(graph.task_id);
        return snapshot;
    }

    async listTaskIds(): Promise<string[]> {
        await this.ensureReady();
        return this.memory.listTaskIds();
    }

    async getTaskSnapshot(taskId: string): Promise<TaskSnapshot | undefined> {
        await this.ensureReady();
        return this.memory.getTaskSnapshot(taskId);
    }

    async getTaskGraph(taskId: string): Promise<TaskGraph | undefined> {
        await this.ensureReady();
        return this.memory.getTaskGraph(taskId);
    }

    async getTaskState(taskId: string): Promise<TaskState | undefined> {
        await this.ensureReady();
        return this.memory.getTaskState(taskId);
    }

    async updateTaskState(taskId: string, update: Partial<TaskState>): Promise<TaskState | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateTaskState(taskId, update);
        if (next) await this.persistSnapshot(taskId);
        return next;
    }

    async listNodeStates(taskId: string): Promise<NodeState[]> {
        await this.ensureReady();
        return this.memory.listNodeStates(taskId);
    }

    async getNodeState(taskId: string, nodeId: string): Promise<NodeState | undefined> {
        await this.ensureReady();
        return this.memory.getNodeState(taskId, nodeId);
    }

    async updateNodeState(taskId: string, nodeId: string, update: Partial<NodeState>): Promise<NodeState | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateNodeState(taskId, nodeId, update);
        if (next) await this.persistSnapshot(taskId);
        return next;
    }

    async attachPolicyDecision(taskId: string, nodeId: string, decisionId: string): Promise<void> {
        await this.ensureReady();
        await this.memory.attachPolicyDecision(taskId, nodeId, decisionId);
        await this.persistSnapshot(taskId);
    }

    async getPolicyDecisionIds(taskId: string): Promise<string[]> {
        await this.ensureReady();
        return this.memory.getPolicyDecisionIds(taskId);
    }

    async getIdempotency(idempotencyKey: string): Promise<IdempotencyEntry | undefined> {
        await this.ensureReady();
        return this.memory.getIdempotency(idempotencyKey);
    }

    async setIdempotency(idempotencyKey: string, value: IdempotencyEntry): Promise<void> {
        await this.ensureReady();
        await this.memory.setIdempotency(idempotencyKey, value);
        await this.persistIdempotency(idempotencyKey, value);
    }

    async listRetryJobs(taskId: string): Promise<RetryJobRecord[]> {
        await this.ensureReady();
        return this.memory.listRetryJobs(taskId);
    }

    async upsertRetryJob(retryJob: RetryJobRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertRetryJob(retryJob);
        await this.persistRetryJob(retryJob);
    }

    async updateRetryJob(jobId: string, update: Partial<RetryJobRecord>): Promise<RetryJobRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateRetryJob(jobId, update);
        if (next) await this.persistRetryJob(next);
        return next;
    }

    async listDeadLetters(taskId: string): Promise<DeadLetterRecord[]> {
        await this.ensureReady();
        return this.memory.listDeadLetters(taskId);
    }

    async upsertDeadLetter(deadLetter: DeadLetterRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertDeadLetter(deadLetter);
        await this.persistDeadLetter(deadLetter);
    }

    async listExecutionUnits(taskId: string): Promise<TaskExecutionUnit[]> {
        await this.ensureReady();
        return this.memory.listExecutionUnits(taskId);
    }

    async getExecutionUnit(executionUnitId: string): Promise<TaskExecutionUnit | undefined> {
        await this.ensureReady();
        return this.memory.getExecutionUnit(executionUnitId);
    }

    async upsertExecutionUnit(executionUnit: TaskExecutionUnit): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertExecutionUnit(executionUnit);
        await this.persistExecutionUnit(executionUnit);
    }

    async updateExecutionUnit(
        executionUnitId: string,
        update: Partial<TaskExecutionUnit>
    ): Promise<TaskExecutionUnit | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateExecutionUnit(executionUnitId, update);
        if (next) await this.persistExecutionUnit(next);
        return next;
    }

    async listExecutionClaims(taskId: string): Promise<TaskClaimRecord[]> {
        await this.ensureReady();
        return this.memory.listExecutionClaims(taskId);
    }

    async getExecutionClaim(claimId: string): Promise<TaskClaimRecord | undefined> {
        await this.ensureReady();
        return this.memory.getExecutionClaim(claimId);
    }

    async upsertExecutionClaim(claim: TaskClaimRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertExecutionClaim(claim);
        await this.persistExecutionClaim(claim);
    }

    async updateExecutionClaim(
        claimId: string,
        update: Partial<TaskClaimRecord>
    ): Promise<TaskClaimRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateExecutionClaim(claimId, update);
        if (next) await this.persistExecutionClaim(next);
        return next;
    }

    async listWorkerSessions(taskId: string): Promise<WorkerSessionRecord[]> {
        await this.ensureReady();
        return this.memory.listWorkerSessions(taskId);
    }

    async getWorkerSession(sessionId: string): Promise<WorkerSessionRecord | undefined> {
        await this.ensureReady();
        return this.memory.getWorkerSession(sessionId);
    }

    async upsertWorkerSession(session: WorkerSessionRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertWorkerSession(session);
        await this.persistWorkerSession(session);
    }

    async updateWorkerSession(
        sessionId: string,
        update: Partial<WorkerSessionRecord>
    ): Promise<WorkerSessionRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateWorkerSession(sessionId, update);
        if (next) await this.persistWorkerSession(next);
        return next;
    }

    async listEnterprisePrincipals(): Promise<EnterprisePrincipalRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterprisePrincipals();
    }

    async getEnterprisePrincipal(principalId: string): Promise<EnterprisePrincipalRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterprisePrincipal(principalId);
    }

    async upsertEnterprisePrincipal(principal: EnterprisePrincipalRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterprisePrincipal(principal);
        await this.persistEnterprisePrincipal(principal);
    }

    async updateEnterprisePrincipal(
        principalId: string,
        update: Partial<EnterprisePrincipalRecord>
    ): Promise<EnterprisePrincipalRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterprisePrincipal(principalId, update);
        if (next) await this.persistEnterprisePrincipal(next);
        return next;
    }

    async listEnterpriseAccessBindings(principalId?: string): Promise<EnterpriseAccessBindingRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterpriseAccessBindings(principalId);
    }

    async getEnterpriseAccessBinding(bindingId: string): Promise<EnterpriseAccessBindingRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterpriseAccessBinding(bindingId);
    }

    async upsertEnterpriseAccessBinding(binding: EnterpriseAccessBindingRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterpriseAccessBinding(binding);
        await this.persistEnterpriseAccessBinding(binding);
    }

    async updateEnterpriseAccessBinding(
        bindingId: string,
        update: Partial<EnterpriseAccessBindingRecord>
    ): Promise<EnterpriseAccessBindingRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterpriseAccessBinding(bindingId, update);
        if (next) await this.persistEnterpriseAccessBinding(next);
        return next;
    }

    async listEnterpriseIdentitySessions(principalId?: string): Promise<EnterpriseIdentitySessionRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterpriseIdentitySessions(principalId);
    }

    async getEnterpriseIdentitySession(sessionId: string): Promise<EnterpriseIdentitySessionRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterpriseIdentitySession(sessionId);
    }

    async upsertEnterpriseIdentitySession(session: EnterpriseIdentitySessionRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterpriseIdentitySession(session);
        await this.persistEnterpriseIdentitySession(session);
    }

    async updateEnterpriseIdentitySession(
        sessionId: string,
        update: Partial<EnterpriseIdentitySessionRecord>
    ): Promise<EnterpriseIdentitySessionRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterpriseIdentitySession(sessionId, update);
        if (next) await this.persistEnterpriseIdentitySession(next);
        return next;
    }

    async getOidcLoginState(stateId: string): Promise<OidcLoginStateRecord | undefined> {
        await this.ensureReady();
        return this.memory.getOidcLoginState(stateId);
    }

    async upsertOidcLoginState(state: OidcLoginStateRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertOidcLoginState(state);
        await this.persistOidcLoginState(state);
    }

    async updateOidcLoginState(
        stateId: string,
        update: Partial<OidcLoginStateRecord>
    ): Promise<OidcLoginStateRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateOidcLoginState(stateId, update);
        if (next) await this.persistOidcLoginState(next);
        return next;
    }

    async listEnterpriseMembershipInvites(tenantId?: string, workspaceId?: string): Promise<EnterpriseMembershipInviteRecord[]> {
        await this.ensureReady();
        return this.memory.listEnterpriseMembershipInvites(tenantId, workspaceId);
    }

    async getEnterpriseMembershipInvite(inviteId: string): Promise<EnterpriseMembershipInviteRecord | undefined> {
        await this.ensureReady();
        return this.memory.getEnterpriseMembershipInvite(inviteId);
    }

    async upsertEnterpriseMembershipInvite(invite: EnterpriseMembershipInviteRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertEnterpriseMembershipInvite(invite);
        await this.persistEnterpriseMembershipInvite(invite);
    }

    async updateEnterpriseMembershipInvite(
        inviteId: string,
        update: Partial<EnterpriseMembershipInviteRecord>
    ): Promise<EnterpriseMembershipInviteRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateEnterpriseMembershipInvite(inviteId, update);
        if (next) await this.persistEnterpriseMembershipInvite(next);
        return next;
    }

    async listVaultCredentials(connectorId?: string): Promise<VaultCredentialRecord[]> {
        await this.ensureReady();
        return this.memory.listVaultCredentials(connectorId);
    }

    async getVaultCredential(credentialId: string): Promise<VaultCredentialRecord | undefined> {
        await this.ensureReady();
        return this.memory.getVaultCredential(credentialId);
    }

    async upsertVaultCredential(record: VaultCredentialRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertVaultCredential(record);
        await this.persistVaultCredential(record);
    }

    async updateVaultCredential(
        credentialId: string,
        update: Partial<VaultCredentialRecord>
    ): Promise<VaultCredentialRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateVaultCredential(credentialId, update);
        if (next) await this.persistVaultCredential(next);
        return next;
    }

    async listWebhookDeliveries(connectorId?: string): Promise<WebhookDeliveryRecord[]> {
        await this.ensureReady();
        return this.memory.listWebhookDeliveries(connectorId);
    }

    async getWebhookDelivery(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
        await this.ensureReady();
        return this.memory.getWebhookDelivery(deliveryId);
    }

    async upsertWebhookDelivery(record: WebhookDeliveryRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertWebhookDelivery(record);
        await this.persistWebhookDelivery(record);
    }

    async updateWebhookDelivery(
        deliveryId: string,
        update: Partial<WebhookDeliveryRecord>
    ): Promise<WebhookDeliveryRecord | undefined> {
        await this.ensureReady();
        const next = await this.memory.updateWebhookDelivery(deliveryId, update);
        if (next) await this.persistWebhookDelivery(next);
        return next;
    }

    async listComplianceDeletionRequests(taskId?: string): Promise<AgentKernelComplianceDeletionRequestRecord[]> {
        await this.ensureReady();
        return this.memory.listComplianceDeletionRequests(taskId);
    }

    async getComplianceDeletionRequest(
        requestId: string,
    ): Promise<AgentKernelComplianceDeletionRequestRecord | undefined> {
        await this.ensureReady();
        return this.memory.getComplianceDeletionRequest(requestId);
    }

    async upsertComplianceDeletionRequest(record: AgentKernelComplianceDeletionRequestRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertComplianceDeletionRequest(record);
        await this.persistComplianceDeletionRequest(record);
    }

    async listComplianceAuditExports(taskId?: string): Promise<AgentKernelAuditExportRecord[]> {
        await this.ensureReady();
        return this.memory.listComplianceAuditExports(taskId);
    }

    async getComplianceAuditExport(exportId: string): Promise<AgentKernelAuditExportRecord | undefined> {
        await this.ensureReady();
        return this.memory.getComplianceAuditExport(exportId);
    }

    async upsertComplianceAuditExport(record: AgentKernelAuditExportRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertComplianceAuditExport(record);
        await this.persistComplianceAuditExport(record);
    }

    async listPilotActivationPackages(workspaceKey?: string): Promise<PilotActivationPackageRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotActivationPackages(workspaceKey);
    }

    async getPilotActivationPackage(packageId: string): Promise<PilotActivationPackageRecord | undefined> {
        await this.ensureReady();
        return this.memory.getPilotActivationPackage(packageId);
    }

    async upsertPilotActivationPackage(record: PilotActivationPackageRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotActivationPackage(record);
        const storageKey = this.pilotActivationPackageKey(record.package_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.pilotActivationPackagesIndexKey(), storageKey);
    }

    async listPilotActorReadiness(workspaceKey?: string): Promise<PilotActorReadinessRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotActorReadiness(workspaceKey);
    }

    async listPilotEnvironmentBindings(workspaceKey?: string): Promise<PilotEnvironmentBindingRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotEnvironmentBindings(workspaceKey);
    }

    async upsertPilotEnvironmentBinding(record: PilotEnvironmentBindingRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotEnvironmentBinding(record);
        const storageKey = this.pilotEnvironmentBindingKey(record.binding_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.pilotEnvironmentBindingsIndexKey(), storageKey);
    }

    async upsertPilotActorReadiness(record: PilotActorReadinessRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotActorReadiness(record);
        const storageKey = this.pilotActorReadinessKey(record.readiness_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.pilotActorReadinessIndexKey(), storageKey);
    }

    async listPilotConnectorActivationRecords(workspaceKey?: string): Promise<PilotConnectorActivationRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotConnectorActivationRecords(workspaceKey);
    }

    async upsertPilotConnectorActivationRecord(record: PilotConnectorActivationRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotConnectorActivationRecord(record);
        const storageKey = this.pilotConnectorActivationKey(record.activation_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.pilotConnectorActivationIndexKey(), storageKey);
    }

    async listPilotExternalArtifactIntakes(workspaceKey?: string): Promise<PilotExternalArtifactIntakeRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotExternalArtifactIntakes(workspaceKey);
    }

    async getPilotExternalArtifactIntake(intakeId: string): Promise<PilotExternalArtifactIntakeRecord | undefined> {
        await this.ensureReady();
        return this.memory.getPilotExternalArtifactIntake(intakeId);
    }

    async upsertPilotExternalArtifactIntake(record: PilotExternalArtifactIntakeRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotExternalArtifactIntake(record);
        const storageKey = this.pilotExternalArtifactIntakeKey(record.intake_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.pilotExternalArtifactIntakesIndexKey(), storageKey);
    }

    async listPilotEvidenceArtifacts(workspaceKey?: string): Promise<PilotEvidenceArtifactRecord[]> {
        await this.ensureReady();
        return this.memory.listPilotEvidenceArtifacts(workspaceKey);
    }

    async upsertPilotEvidenceArtifact(record: PilotEvidenceArtifactRecord): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertPilotEvidenceArtifact(record);
        const storageKey = this.pilotEvidenceArtifactKey(record.artifact_id);
        await this.client.set(storageKey, JSON.stringify(record));
        await this.client.sAdd(this.pilotEvidenceArtifactsIndexKey(), storageKey);
    }

    async appendLedgerRecord(record: Omit<ExecutionLedgerRecord, 'sequence'>) {
        await this.ensureReady();
        const result = await this.memory.appendLedgerRecord(record);
        await this.persistLedgerRecord(result.record);
        return result;
    }

    async listLedgerRecords(filter?: ExecutionLedgerReadFilter): Promise<ExecutionLedgerRecord[]> {
        await this.ensureReady();
        return this.memory.listLedgerRecords(filter);
    }

    async listExecutionLedgerCompactionHints(taskId?: string): Promise<ExecutionLedgerCompactionHint[]> {
        await this.ensureReady();
        return this.memory.listExecutionLedgerCompactionHints(taskId);
    }

    async upsertExecutionLedgerCompactionHint(hint: ExecutionLedgerCompactionHint): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertExecutionLedgerCompactionHint(hint);
        const persistedHint = (await this.memory.listExecutionLedgerCompactionHints(hint.task_id))
            .find((candidate) => candidate.hint_id === hint.hint_id) || hint;
        await this.persistExecutionLedgerCompactionHint(persistedHint);
    }

    async getTaskProjection(taskId: string, projectionName: string): Promise<TaskQueryProjection | undefined> {
        await this.ensureReady();
        return this.memory.getTaskProjection(taskId, projectionName);
    }

    async upsertTaskProjection(projection: TaskQueryProjection): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertTaskProjection(projection);
        await this.persistTaskProjection(projection);
    }

    async getProjectionCheckpoint(taskId: string, projectionName: string): Promise<TaskProjectionCheckpoint | undefined> {
        await this.ensureReady();
        return this.memory.getProjectionCheckpoint(taskId, projectionName);
    }

    async upsertProjectionCheckpoint(checkpoint: TaskProjectionCheckpoint): Promise<void> {
        await this.ensureReady();
        await this.memory.upsertProjectionCheckpoint(checkpoint);
        await this.persistProjectionCheckpoint(checkpoint);
    }
}

export function createTaskStore(options?: TaskStoreFactoryOptions): TaskStore {
    const driver = options?.driver || resolveTaskStoreDriverFromEnv();
    if (driver === 'postgres') {
        return new PostgresTaskStore(options?.postgresUrl || process.env.AGENT_KERNEL_POSTGRES_URL);
    }
    if (driver === 'redis') {
        return new RedisTaskStore(
            options?.redisUrl || process.env.AGENT_KERNEL_REDIS_URL,
            options?.redisKeyPrefix || process.env.AGENT_KERNEL_REDIS_KEY_PREFIX || 'agent-kernel'
        );
    }
    return new InMemoryTaskStore();
}

export { PostgresTaskStore, RedisTaskStore };

import type {
    AgentKernelAuditExportRecord,
    AgentKernelComplianceDeletionRequestRecord,
    DeadLetterRecord,
    EnterpriseAccessBindingRecord,
    EnterpriseIdentitySessionRecord,
    EnterpriseIdentityStorePort,
    EnterpriseMembershipInviteRecord,
    EnterprisePrincipalRecord,
    ExecutionClaimStorePort,
    ExecutionLedgerAppendResult,
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
    VaultCredentialStorePort,
    WebhookDeliveryRecord,
    WorkerSessionRecord,
} from './contracts.js';
import { hashText } from './utils.js';

interface TaskRecord {
    graph: TaskGraph;
    taskState: TaskState;
    nodeStates: Map<string, NodeState>;
    policyDecisionIds: string[];
}

export interface IdempotencyEntry {
    output: unknown;
    at: number;
}

export interface TaskStore extends ExecutionClaimStorePort, EnterpriseIdentityStorePort, VaultCredentialStorePort {
    listTaskIds(): Promise<string[]>;
    createTask(graph: TaskGraph): Promise<TaskSnapshot>;
    getTaskSnapshot(taskId: string): Promise<TaskSnapshot | undefined>;
    getTaskGraph(taskId: string): Promise<TaskGraph | undefined>;
    getTaskState(taskId: string): Promise<TaskState | undefined>;
    updateTaskState(taskId: string, update: Partial<TaskState>): Promise<TaskState | undefined>;
    listNodeStates(taskId: string): Promise<NodeState[]>;
    getNodeState(taskId: string, nodeId: string): Promise<NodeState | undefined>;
    updateNodeState(taskId: string, nodeId: string, update: Partial<NodeState>): Promise<NodeState | undefined>;
    attachPolicyDecision(taskId: string, nodeId: string, decisionId: string): Promise<void>;
    getPolicyDecisionIds(taskId: string): Promise<string[]>;
    getIdempotency(idempotencyKey: string): Promise<IdempotencyEntry | undefined>;
    setIdempotency(idempotencyKey: string, value: IdempotencyEntry): Promise<void>;
    listRetryJobs(taskId: string): Promise<RetryJobRecord[]>;
    upsertRetryJob(retryJob: RetryJobRecord): Promise<void>;
    updateRetryJob(jobId: string, update: Partial<RetryJobRecord>): Promise<RetryJobRecord | undefined>;
    listDeadLetters(taskId: string): Promise<DeadLetterRecord[]>;
    upsertDeadLetter(deadLetter: DeadLetterRecord): Promise<void>;
    listComplianceDeletionRequests(taskId?: string): Promise<AgentKernelComplianceDeletionRequestRecord[]>;
    getComplianceDeletionRequest(requestId: string): Promise<AgentKernelComplianceDeletionRequestRecord | undefined>;
    upsertComplianceDeletionRequest(record: AgentKernelComplianceDeletionRequestRecord): Promise<void>;
    listComplianceAuditExports(taskId?: string): Promise<AgentKernelAuditExportRecord[]>;
    getComplianceAuditExport(exportId: string): Promise<AgentKernelAuditExportRecord | undefined>;
    upsertComplianceAuditExport(record: AgentKernelAuditExportRecord): Promise<void>;
    listPilotActivationPackages(workspaceKey?: string): Promise<PilotActivationPackageRecord[]>;
    getPilotActivationPackage(packageId: string): Promise<PilotActivationPackageRecord | undefined>;
    upsertPilotActivationPackage(record: PilotActivationPackageRecord): Promise<void>;
    listPilotEnvironmentBindings(workspaceKey?: string): Promise<PilotEnvironmentBindingRecord[]>;
    upsertPilotEnvironmentBinding(record: PilotEnvironmentBindingRecord): Promise<void>;
    listPilotActorReadiness(workspaceKey?: string): Promise<PilotActorReadinessRecord[]>;
    upsertPilotActorReadiness(record: PilotActorReadinessRecord): Promise<void>;
    listPilotConnectorActivationRecords(workspaceKey?: string): Promise<PilotConnectorActivationRecord[]>;
    upsertPilotConnectorActivationRecord(record: PilotConnectorActivationRecord): Promise<void>;
    listPilotExternalArtifactIntakes(workspaceKey?: string): Promise<PilotExternalArtifactIntakeRecord[]>;
    getPilotExternalArtifactIntake(intakeId: string): Promise<PilotExternalArtifactIntakeRecord | undefined>;
    upsertPilotExternalArtifactIntake(record: PilotExternalArtifactIntakeRecord): Promise<void>;
    listPilotEvidenceArtifacts(workspaceKey?: string): Promise<PilotEvidenceArtifactRecord[]>;
    upsertPilotEvidenceArtifact(record: PilotEvidenceArtifactRecord): Promise<void>;
    appendLedgerRecord(record: Omit<ExecutionLedgerRecord, 'sequence'>): Promise<ExecutionLedgerAppendResult>;
    listLedgerRecords(filter?: ExecutionLedgerReadFilter): Promise<ExecutionLedgerRecord[]>;
    listExecutionLedgerCompactionHints(taskId?: string): Promise<ExecutionLedgerCompactionHint[]>;
    upsertExecutionLedgerCompactionHint(hint: ExecutionLedgerCompactionHint): Promise<void>;
    getTaskProjection(taskId: string, projectionName: string): Promise<TaskQueryProjection | undefined>;
    upsertTaskProjection(projection: TaskQueryProjection): Promise<void>;
    getProjectionCheckpoint(taskId: string, projectionName: string): Promise<TaskProjectionCheckpoint | undefined>;
    upsertProjectionCheckpoint(checkpoint: TaskProjectionCheckpoint): Promise<void>;
}

function now(): number {
    return Date.now();
}

function initialCorrelationContext(taskId: string, createdAt: number): TaskState['correlation'] {
    return {
        trace_id: `trace_${hashText(`${taskId}:trace:${createdAt}`).slice(0, 16)}`,
        correlation_id: `corr_${hashText(`${taskId}:corr:${createdAt}`).slice(0, 16)}`,
        current_run_id: `run_${hashText(`${taskId}:run:0:${createdAt}`).slice(0, 16)}`,
        run_sequence: 0,
        created_at: createdAt,
    };
}

function cloneNodeState(value: NodeState): NodeState {
    return {
        ...value,
        input: value.input,
        output: value.output,
        error: value.error ? { ...value.error } : undefined,
        trace: value.trace
            ? {
                ...value.trace,
                policy_decision_ids: value.trace.policy_decision_ids
                    ? [...value.trace.policy_decision_ids]
                    : undefined,
            }
            : undefined,
    };
}

function cloneTaskState(taskState: TaskState): TaskState {
    return {
        ...taskState,
        budget_spent: { ...taskState.budget_spent },
        correlation: taskState.correlation
            ? { ...taskState.correlation }
            : undefined,
    };
}

function cloneTaskGraph(graph: TaskGraph): TaskGraph {
    return {
        ...graph,
        nodes: graph.nodes.map((node) => ({ ...node })),
        edges: graph.edges.map((edge) => [edge[0], edge[1]]),
    };
}

function toSnapshot(record: TaskRecord): TaskSnapshot {
    return {
        graph: cloneTaskGraph(record.graph),
        task_state: cloneTaskState(record.taskState),
        node_states: Array.from(record.nodeStates.values()).map(cloneNodeState),
        policy_decision_ids: [...record.policyDecisionIds],
    };
}

function cloneRetryJob(value: RetryJobRecord): RetryJobRecord {
    return {
        ...value,
    };
}

function cloneDeadLetter(value: DeadLetterRecord): DeadLetterRecord {
    return {
        ...value,
    };
}

function cloneLedgerRecord(value: ExecutionLedgerRecord): ExecutionLedgerRecord {
    return {
        ...value,
        payload: value.payload ? { ...value.payload } : undefined,
    };
}

function cloneTaskProjection(value: TaskQueryProjection): TaskQueryProjection {
    return {
        ...value,
        source_summary: { ...value.source_summary },
        checkpoint: { ...value.checkpoint },
        node_statuses: { ...value.node_statuses },
        node_status_counts: { ...value.node_status_counts },
    };
}

function cloneProjectionCheckpoint(value: TaskProjectionCheckpoint): TaskProjectionCheckpoint {
    return {
        ...value,
    };
}

function cloneLedgerCompactionHint(value: ExecutionLedgerCompactionHint): ExecutionLedgerCompactionHint {
    return {
        ...value,
    };
}

function cloneExecutionUnit(value: TaskExecutionUnit): TaskExecutionUnit {
    return {
        ...value,
    };
}

function cloneExecutionClaim(value: TaskClaimRecord): TaskClaimRecord {
    return {
        ...value,
    };
}

function cloneWorkerSession(value: WorkerSessionRecord): WorkerSessionRecord {
    return {
        ...value,
    };
}

function cloneEnterprisePrincipal(value: EnterprisePrincipalRecord): EnterprisePrincipalRecord {
    return {
        ...value,
        groups: [...value.groups],
    };
}

function cloneEnterpriseAccessBinding(value: EnterpriseAccessBindingRecord): EnterpriseAccessBindingRecord {
    return {
        ...value,
        roles: [...value.roles],
    };
}

function cloneEnterpriseIdentitySession(value: EnterpriseIdentitySessionRecord): EnterpriseIdentitySessionRecord {
    return {
        ...value,
        roles: [...value.roles],
        claims: {
            ...value.claims,
            groups: [...value.claims.groups],
            audience: Array.isArray(value.claims.audience)
                ? [...value.claims.audience]
                : value.claims.audience,
        },
    };
}

function cloneOidcLoginState(value: OidcLoginStateRecord): OidcLoginStateRecord {
    return {
        ...value,
    };
}

function cloneEnterpriseMembershipInvite(value: EnterpriseMembershipInviteRecord): EnterpriseMembershipInviteRecord {
    return {
        ...value,
    };
}

function cloneVaultCredential(value: VaultCredentialRecord): VaultCredentialRecord {
    return {
        ...value,
    };
}

function cloneWebhookDelivery(value: WebhookDeliveryRecord): WebhookDeliveryRecord {
    return {
        ...value,
    };
}

function cloneComplianceDeletionRequest(
    value: AgentKernelComplianceDeletionRequestRecord,
): AgentKernelComplianceDeletionRequestRecord {
    return {
        ...value,
        requested_by: { ...value.requested_by },
    };
}

function cloneComplianceAuditExport(value: AgentKernelAuditExportRecord): AgentKernelAuditExportRecord {
    return {
        ...value,
        requested_by: { ...value.requested_by },
        section_hashes: value.section_hashes.map((section) => ({ ...section })),
        record_counts: { ...value.record_counts },
    };
}

function clonePilotEnvironmentBinding(value: PilotEnvironmentBindingRecord): PilotEnvironmentBindingRecord {
    return {
        ...value,
    };
}

function clonePilotActivationPackage(value: PilotActivationPackageRecord): PilotActivationPackageRecord {
    return {
        ...value,
    };
}

function clonePilotActorReadiness(value: PilotActorReadinessRecord): PilotActorReadinessRecord {
    return {
        ...value,
        evidence_reference_ids: [...value.evidence_reference_ids],
    };
}

function clonePilotConnectorActivationRecord(value: PilotConnectorActivationRecord): PilotConnectorActivationRecord {
    return {
        ...value,
        evidence_reference_ids: [...value.evidence_reference_ids],
    };
}

function clonePilotExternalArtifactIntake(value: PilotExternalArtifactIntakeRecord): PilotExternalArtifactIntakeRecord {
    return {
        ...value,
        promoted_record_ids: [...value.promoted_record_ids],
    };
}

function clonePilotEvidenceArtifact(value: PilotEvidenceArtifactRecord): PilotEvidenceArtifactRecord {
    return {
        ...value,
    };
}

function fromSnapshot(snapshot: TaskSnapshot): TaskRecord {
    return {
        graph: cloneTaskGraph(snapshot.graph),
        taskState: cloneTaskState(snapshot.task_state),
        nodeStates: new Map(
            snapshot.node_states.map((nodeState) => [nodeState.node_id, cloneNodeState(nodeState)])
        ),
        policyDecisionIds: [...snapshot.policy_decision_ids],
    };
}

export class InMemoryTaskStore implements TaskStore {
    protected readonly records = new Map<string, TaskRecord>();
    protected readonly idempotency = new Map<string, IdempotencyEntry>();
    protected readonly retryJobs = new Map<string, RetryJobRecord>();
    protected readonly deadLetters = new Map<string, DeadLetterRecord>();
    protected readonly ledgerRecordsByTask = new Map<string, ExecutionLedgerRecord[]>();
    protected readonly ledgerRecordsByDedupeKey = new Map<string, ExecutionLedgerRecord>();
    protected readonly ledgerCompactionHints = new Map<string, ExecutionLedgerCompactionHint>();
    protected readonly projections = new Map<string, TaskQueryProjection>();
    protected readonly projectionCheckpoints = new Map<string, TaskProjectionCheckpoint>();
    protected readonly executionUnits = new Map<string, TaskExecutionUnit>();
    protected readonly executionClaims = new Map<string, TaskClaimRecord>();
    protected readonly workerSessions = new Map<string, WorkerSessionRecord>();
    protected readonly enterprisePrincipals = new Map<string, EnterprisePrincipalRecord>();
    protected readonly enterpriseAccessBindings = new Map<string, EnterpriseAccessBindingRecord>();
    protected readonly enterpriseIdentitySessions = new Map<string, EnterpriseIdentitySessionRecord>();
    protected readonly oidcLoginStates = new Map<string, OidcLoginStateRecord>();
    protected readonly enterpriseMembershipInvites = new Map<string, EnterpriseMembershipInviteRecord>();
    protected readonly vaultCredentials = new Map<string, VaultCredentialRecord>();
    protected readonly webhookDeliveries = new Map<string, WebhookDeliveryRecord>();
    protected readonly complianceDeletionRequests = new Map<string, AgentKernelComplianceDeletionRequestRecord>();
    protected readonly complianceAuditExports = new Map<string, AgentKernelAuditExportRecord>();
    protected readonly pilotActivationPackages = new Map<string, PilotActivationPackageRecord>();
    protected readonly pilotEnvironmentBindings = new Map<string, PilotEnvironmentBindingRecord>();
    protected readonly pilotActorReadiness = new Map<string, PilotActorReadinessRecord>();
    protected readonly pilotConnectorActivationRecords = new Map<string, PilotConnectorActivationRecord>();
    protected readonly pilotExternalArtifactIntakes = new Map<string, PilotExternalArtifactIntakeRecord>();
    protected readonly pilotEvidenceArtifacts = new Map<string, PilotEvidenceArtifactRecord>();

    hydrateFromSnapshots(snapshots: TaskSnapshot[]): void {
        for (const snapshot of snapshots) {
            this.records.set(snapshot.task_state.task_id, fromSnapshot(snapshot));
        }
    }

    exportSnapshots(): TaskSnapshot[] {
        return Array.from(this.records.values()).map((record) => toSnapshot(record));
    }

    async listTaskIds(): Promise<string[]> {
        return Array.from(this.records.keys()).sort((a, b) => a.localeCompare(b));
    }

    async createTask(graph: TaskGraph): Promise<TaskSnapshot> {
        const createdAt = graph.created_at || now();
        const taskState: TaskState = {
            task_id: graph.task_id,
            status: 'RUNNING',
            correlation: initialCorrelationContext(graph.task_id, createdAt),
            created_at: createdAt,
            updated_at: createdAt,
            budget_spent: {
                tool_calls: 0,
                tokens: 0,
                latency_ms: 0,
            },
        };

        const nodeStates = new Map<string, NodeState>();
        for (const node of graph.nodes) {
            nodeStates.set(node.id, {
                task_id: graph.task_id,
                node_id: node.id,
                status: 'PENDING',
                attempt: 0,
                trace: {
                    policy_decision_ids: [],
                },
            });
        }

        const record: TaskRecord = {
            graph,
            taskState,
            nodeStates,
            policyDecisionIds: [],
        };
        this.records.set(graph.task_id, record);

        return toSnapshot(record);
    }

    async getTaskSnapshot(taskId: string): Promise<TaskSnapshot | undefined> {
        const record = this.records.get(taskId);
        if (!record) return undefined;
        return toSnapshot(record);
    }

    async getTaskGraph(taskId: string): Promise<TaskGraph | undefined> {
        const graph = this.records.get(taskId)?.graph;
        return graph ? cloneTaskGraph(graph) : undefined;
    }

    async getTaskState(taskId: string): Promise<TaskState | undefined> {
        const taskState = this.records.get(taskId)?.taskState;
        return taskState ? cloneTaskState(taskState) : undefined;
    }

    async updateTaskState(taskId: string, update: Partial<TaskState>): Promise<TaskState | undefined> {
        const record = this.records.get(taskId);
        if (!record) return undefined;
        record.taskState = {
            ...record.taskState,
            ...update,
            updated_at: now(),
            budget_spent: {
                ...record.taskState.budget_spent,
                ...(update.budget_spent || {}),
            },
            correlation: update.correlation
                ? {
                    ...(record.taskState.correlation || {}),
                    ...update.correlation,
                }
                : record.taskState.correlation
                    ? { ...record.taskState.correlation }
                    : undefined,
        };
        return cloneTaskState(record.taskState);
    }

    async listNodeStates(taskId: string): Promise<NodeState[]> {
        const record = this.records.get(taskId);
        if (!record) return [];
        return Array.from(record.nodeStates.values()).map(cloneNodeState);
    }

    async getNodeState(taskId: string, nodeId: string): Promise<NodeState | undefined> {
        const nodeState = this.records.get(taskId)?.nodeStates.get(nodeId);
        return nodeState ? cloneNodeState(nodeState) : undefined;
    }

    async updateNodeState(taskId: string, nodeId: string, update: Partial<NodeState>): Promise<NodeState | undefined> {
        const record = this.records.get(taskId);
        if (!record) return undefined;

        const current = record.nodeStates.get(nodeId);
        if (!current) return undefined;

        const next: NodeState = {
            ...current,
            ...update,
            trace: {
                ...(current.trace || {}),
                ...(update.trace || {}),
                policy_decision_ids: update.trace?.policy_decision_ids
                    ? [...update.trace.policy_decision_ids]
                    : current.trace?.policy_decision_ids
                        ? [...current.trace.policy_decision_ids]
                        : [],
            },
        };

        record.nodeStates.set(nodeId, next);
        record.taskState.updated_at = now();
        return cloneNodeState(next);
    }

    async attachPolicyDecision(taskId: string, nodeId: string, decisionId: string): Promise<void> {
        const record = this.records.get(taskId);
        if (!record) return;

        if (!record.policyDecisionIds.includes(decisionId)) {
            record.policyDecisionIds.push(decisionId);
        }

        const state = record.nodeStates.get(nodeId);
        if (!state) return;
        const traceIds = state.trace?.policy_decision_ids || [];
        if (!traceIds.includes(decisionId)) {
            record.nodeStates.set(nodeId, {
                ...state,
                trace: {
                    ...(state.trace || {}),
                    policy_decision_ids: [...traceIds, decisionId],
                },
            });
        }
    }

    async getPolicyDecisionIds(taskId: string): Promise<string[]> {
        const ids = this.records.get(taskId)?.policyDecisionIds || [];
        return [...ids];
    }

    async getIdempotency(idempotencyKey: string): Promise<IdempotencyEntry | undefined> {
        const entry = this.idempotency.get(idempotencyKey);
        return entry ? { ...entry } : undefined;
    }

    async setIdempotency(idempotencyKey: string, value: IdempotencyEntry): Promise<void> {
        this.idempotency.set(idempotencyKey, { ...value });
    }

    async listRetryJobs(taskId: string): Promise<RetryJobRecord[]> {
        return Array.from(this.retryJobs.values())
            .filter((job) => job.task_id === taskId)
            .sort((a, b) => a.available_at - b.available_at)
            .map(cloneRetryJob);
    }

    async upsertRetryJob(retryJob: RetryJobRecord): Promise<void> {
        this.retryJobs.set(retryJob.job_id, cloneRetryJob(retryJob));
    }

    async updateRetryJob(jobId: string, update: Partial<RetryJobRecord>): Promise<RetryJobRecord | undefined> {
        const current = this.retryJobs.get(jobId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.retryJobs.set(jobId, next);
        return cloneRetryJob(next);
    }

    async listDeadLetters(taskId: string): Promise<DeadLetterRecord[]> {
        return Array.from(this.deadLetters.values())
            .filter((record) => record.task_id === taskId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneDeadLetter);
    }

    async upsertDeadLetter(deadLetter: DeadLetterRecord): Promise<void> {
        this.deadLetters.set(deadLetter.dead_letter_id, cloneDeadLetter(deadLetter));
    }

    async listExecutionUnits(taskId: string): Promise<TaskExecutionUnit[]> {
        return Array.from(this.executionUnits.values())
            .filter((unit) => unit.task_id === taskId)
            .sort((a, b) => {
                if (a.available_at !== b.available_at) return a.available_at - b.available_at;
                return a.created_at - b.created_at;
            })
            .map(cloneExecutionUnit);
    }

    async getExecutionUnit(executionUnitId: string): Promise<TaskExecutionUnit | undefined> {
        const unit = this.executionUnits.get(executionUnitId);
        return unit ? cloneExecutionUnit(unit) : undefined;
    }

    async upsertExecutionUnit(executionUnit: TaskExecutionUnit): Promise<void> {
        this.executionUnits.set(executionUnit.execution_unit_id, cloneExecutionUnit(executionUnit));
    }

    async updateExecutionUnit(
        executionUnitId: string,
        update: Partial<TaskExecutionUnit>
    ): Promise<TaskExecutionUnit | undefined> {
        const current = this.executionUnits.get(executionUnitId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.executionUnits.set(executionUnitId, next);
        return cloneExecutionUnit(next);
    }

    async listExecutionClaims(taskId: string): Promise<TaskClaimRecord[]> {
        return Array.from(this.executionClaims.values())
            .filter((claim) => claim.task_id === taskId)
            .sort((a, b) => a.claimed_at - b.claimed_at)
            .map(cloneExecutionClaim);
    }

    async getExecutionClaim(claimId: string): Promise<TaskClaimRecord | undefined> {
        const claim = this.executionClaims.get(claimId);
        return claim ? cloneExecutionClaim(claim) : undefined;
    }

    async upsertExecutionClaim(claim: TaskClaimRecord): Promise<void> {
        this.executionClaims.set(claim.claim_id, cloneExecutionClaim(claim));
    }

    async updateExecutionClaim(
        claimId: string,
        update: Partial<TaskClaimRecord>
    ): Promise<TaskClaimRecord | undefined> {
        const current = this.executionClaims.get(claimId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.executionClaims.set(claimId, next);
        return cloneExecutionClaim(next);
    }

    async listWorkerSessions(taskId: string): Promise<WorkerSessionRecord[]> {
        return Array.from(this.workerSessions.values())
            .filter((session) => session.task_id === taskId)
            .sort((a, b) => a.updated_at - b.updated_at)
            .map(cloneWorkerSession);
    }

    async getWorkerSession(sessionId: string): Promise<WorkerSessionRecord | undefined> {
        const session = this.workerSessions.get(sessionId);
        return session ? cloneWorkerSession(session) : undefined;
    }

    async upsertWorkerSession(session: WorkerSessionRecord): Promise<void> {
        this.workerSessions.set(session.session_id, cloneWorkerSession(session));
    }

    async updateWorkerSession(
        sessionId: string,
        update: Partial<WorkerSessionRecord>
    ): Promise<WorkerSessionRecord | undefined> {
        const current = this.workerSessions.get(sessionId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.workerSessions.set(sessionId, next);
        return cloneWorkerSession(next);
    }

    async listEnterprisePrincipals(): Promise<EnterprisePrincipalRecord[]> {
        return Array.from(this.enterprisePrincipals.values())
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneEnterprisePrincipal);
    }

    async getEnterprisePrincipal(principalId: string): Promise<EnterprisePrincipalRecord | undefined> {
        const principal = this.enterprisePrincipals.get(principalId);
        return principal ? cloneEnterprisePrincipal(principal) : undefined;
    }

    async upsertEnterprisePrincipal(principal: EnterprisePrincipalRecord): Promise<void> {
        this.enterprisePrincipals.set(principal.principal_id, cloneEnterprisePrincipal(principal));
    }

    async updateEnterprisePrincipal(
        principalId: string,
        update: Partial<EnterprisePrincipalRecord>
    ): Promise<EnterprisePrincipalRecord | undefined> {
        const current = this.enterprisePrincipals.get(principalId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
            groups: update.groups ? [...update.groups] : [...current.groups],
        };
        this.enterprisePrincipals.set(principalId, next);
        return cloneEnterprisePrincipal(next);
    }

    async listEnterpriseAccessBindings(principalId?: string): Promise<EnterpriseAccessBindingRecord[]> {
        return Array.from(this.enterpriseAccessBindings.values())
            .filter((binding) => principalId === undefined || binding.principal_id === principalId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneEnterpriseAccessBinding);
    }

    async getEnterpriseAccessBinding(bindingId: string): Promise<EnterpriseAccessBindingRecord | undefined> {
        const binding = this.enterpriseAccessBindings.get(bindingId);
        return binding ? cloneEnterpriseAccessBinding(binding) : undefined;
    }

    async upsertEnterpriseAccessBinding(binding: EnterpriseAccessBindingRecord): Promise<void> {
        this.enterpriseAccessBindings.set(binding.binding_id, cloneEnterpriseAccessBinding(binding));
    }

    async updateEnterpriseAccessBinding(
        bindingId: string,
        update: Partial<EnterpriseAccessBindingRecord>
    ): Promise<EnterpriseAccessBindingRecord | undefined> {
        const current = this.enterpriseAccessBindings.get(bindingId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
            roles: update.roles ? [...update.roles] : [...current.roles],
        };
        this.enterpriseAccessBindings.set(bindingId, next);
        return cloneEnterpriseAccessBinding(next);
    }

    async listEnterpriseIdentitySessions(principalId?: string): Promise<EnterpriseIdentitySessionRecord[]> {
        return Array.from(this.enterpriseIdentitySessions.values())
            .filter((session) => principalId === undefined || session.principal_id === principalId)
            .sort((a, b) => a.issued_at - b.issued_at)
            .map(cloneEnterpriseIdentitySession);
    }

    async getEnterpriseIdentitySession(sessionId: string): Promise<EnterpriseIdentitySessionRecord | undefined> {
        const session = this.enterpriseIdentitySessions.get(sessionId);
        return session ? cloneEnterpriseIdentitySession(session) : undefined;
    }

    async upsertEnterpriseIdentitySession(session: EnterpriseIdentitySessionRecord): Promise<void> {
        this.enterpriseIdentitySessions.set(session.session_id, cloneEnterpriseIdentitySession(session));
    }

    async updateEnterpriseIdentitySession(
        sessionId: string,
        update: Partial<EnterpriseIdentitySessionRecord>
    ): Promise<EnterpriseIdentitySessionRecord | undefined> {
        const current = this.enterpriseIdentitySessions.get(sessionId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
            roles: update.roles ? [...update.roles] : [...current.roles],
            claims: update.claims
                ? {
                    ...current.claims,
                    ...update.claims,
                    groups: update.claims.groups ? [...update.claims.groups] : [...current.claims.groups],
                    audience: update.claims.audience !== undefined
                        ? Array.isArray(update.claims.audience)
                            ? [...update.claims.audience]
                            : update.claims.audience
                        : Array.isArray(current.claims.audience)
                            ? [...current.claims.audience]
                            : current.claims.audience,
                }
                : {
                    ...current.claims,
                    groups: [...current.claims.groups],
                    audience: Array.isArray(current.claims.audience)
                        ? [...current.claims.audience]
                        : current.claims.audience,
                },
        };
        this.enterpriseIdentitySessions.set(sessionId, next);
        return cloneEnterpriseIdentitySession(next);
    }

    async getOidcLoginState(stateId: string): Promise<OidcLoginStateRecord | undefined> {
        const state = this.oidcLoginStates.get(stateId);
        return state ? cloneOidcLoginState(state) : undefined;
    }

    async upsertOidcLoginState(state: OidcLoginStateRecord): Promise<void> {
        this.oidcLoginStates.set(state.state_id, cloneOidcLoginState(state));
    }

    async updateOidcLoginState(
        stateId: string,
        update: Partial<OidcLoginStateRecord>
    ): Promise<OidcLoginStateRecord | undefined> {
        const current = this.oidcLoginStates.get(stateId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.oidcLoginStates.set(stateId, next);
        return cloneOidcLoginState(next);
    }

    async listEnterpriseMembershipInvites(tenantId?: string, workspaceId?: string): Promise<EnterpriseMembershipInviteRecord[]> {
        return Array.from(this.enterpriseMembershipInvites.values())
            .filter((invite) => tenantId === undefined || invite.tenant_id === tenantId)
            .filter((invite) => workspaceId === undefined || invite.workspace_id === workspaceId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneEnterpriseMembershipInvite);
    }

    async getEnterpriseMembershipInvite(inviteId: string): Promise<EnterpriseMembershipInviteRecord | undefined> {
        const invite = this.enterpriseMembershipInvites.get(inviteId);
        return invite ? cloneEnterpriseMembershipInvite(invite) : undefined;
    }

    async upsertEnterpriseMembershipInvite(invite: EnterpriseMembershipInviteRecord): Promise<void> {
        this.enterpriseMembershipInvites.set(invite.invite_id, cloneEnterpriseMembershipInvite(invite));
    }

    async updateEnterpriseMembershipInvite(
        inviteId: string,
        update: Partial<EnterpriseMembershipInviteRecord>
    ): Promise<EnterpriseMembershipInviteRecord | undefined> {
        const current = this.enterpriseMembershipInvites.get(inviteId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.enterpriseMembershipInvites.set(inviteId, next);
        return cloneEnterpriseMembershipInvite(next);
    }

    async listVaultCredentials(connectorId?: string): Promise<VaultCredentialRecord[]> {
        return Array.from(this.vaultCredentials.values())
            .filter((record) => connectorId === undefined || record.connector_id === connectorId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneVaultCredential);
    }

    async getVaultCredential(credentialId: string): Promise<VaultCredentialRecord | undefined> {
        const record = this.vaultCredentials.get(credentialId);
        return record ? cloneVaultCredential(record) : undefined;
    }

    async upsertVaultCredential(record: VaultCredentialRecord): Promise<void> {
        this.vaultCredentials.set(record.credential_id, cloneVaultCredential(record));
    }

    async updateVaultCredential(
        credentialId: string,
        update: Partial<VaultCredentialRecord>
    ): Promise<VaultCredentialRecord | undefined> {
        const current = this.vaultCredentials.get(credentialId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.vaultCredentials.set(credentialId, next);
        return cloneVaultCredential(next);
    }

    async listWebhookDeliveries(connectorId?: string): Promise<WebhookDeliveryRecord[]> {
        return Array.from(this.webhookDeliveries.values())
            .filter((record) => connectorId === undefined || record.connector_id === connectorId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneWebhookDelivery);
    }

    async getWebhookDelivery(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
        const record = this.webhookDeliveries.get(deliveryId);
        return record ? cloneWebhookDelivery(record) : undefined;
    }

    async upsertWebhookDelivery(record: WebhookDeliveryRecord): Promise<void> {
        this.webhookDeliveries.set(record.delivery_id, cloneWebhookDelivery(record));
    }

    async updateWebhookDelivery(
        deliveryId: string,
        update: Partial<WebhookDeliveryRecord>
    ): Promise<WebhookDeliveryRecord | undefined> {
        const current = this.webhookDeliveries.get(deliveryId);
        if (!current) return undefined;
        const next = {
            ...current,
            ...update,
        };
        this.webhookDeliveries.set(deliveryId, next);
        return cloneWebhookDelivery(next);
    }

    async listComplianceDeletionRequests(taskId?: string): Promise<AgentKernelComplianceDeletionRequestRecord[]> {
        return Array.from(this.complianceDeletionRequests.values())
            .filter((record) => taskId === undefined || record.task_id === taskId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneComplianceDeletionRequest);
    }

    async getComplianceDeletionRequest(
        requestId: string,
    ): Promise<AgentKernelComplianceDeletionRequestRecord | undefined> {
        const record = this.complianceDeletionRequests.get(requestId);
        return record ? cloneComplianceDeletionRequest(record) : undefined;
    }

    async upsertComplianceDeletionRequest(record: AgentKernelComplianceDeletionRequestRecord): Promise<void> {
        this.complianceDeletionRequests.set(record.request_id, cloneComplianceDeletionRequest(record));
    }

    async listComplianceAuditExports(taskId?: string): Promise<AgentKernelAuditExportRecord[]> {
        return Array.from(this.complianceAuditExports.values())
            .filter((record) => taskId === undefined || record.task_id === taskId)
            .sort((a, b) => a.created_at - b.created_at)
            .map(cloneComplianceAuditExport);
    }

    async getComplianceAuditExport(exportId: string): Promise<AgentKernelAuditExportRecord | undefined> {
        const record = this.complianceAuditExports.get(exportId);
        return record ? cloneComplianceAuditExport(record) : undefined;
    }

    async upsertComplianceAuditExport(record: AgentKernelAuditExportRecord): Promise<void> {
        this.complianceAuditExports.set(record.export_id, cloneComplianceAuditExport(record));
    }

    async listPilotActivationPackages(workspaceKey?: string): Promise<PilotActivationPackageRecord[]> {
        return Array.from(this.pilotActivationPackages.values())
            .filter((record) => !workspaceKey || record.workspace_key === workspaceKey)
            .sort((a, b) => b.updated_at - a.updated_at)
            .map(clonePilotActivationPackage);
    }

    async getPilotActivationPackage(packageId: string): Promise<PilotActivationPackageRecord | undefined> {
        const record = this.pilotActivationPackages.get(packageId);
        return record ? clonePilotActivationPackage(record) : undefined;
    }

    async upsertPilotActivationPackage(record: PilotActivationPackageRecord): Promise<void> {
        this.pilotActivationPackages.set(record.package_id, clonePilotActivationPackage(record));
    }

    async listPilotEnvironmentBindings(workspaceKey?: string): Promise<PilotEnvironmentBindingRecord[]> {
        return Array.from(this.pilotEnvironmentBindings.values())
            .filter((record) => !workspaceKey || record.workspace_key === workspaceKey)
            .sort((a, b) => b.updated_at - a.updated_at)
            .map(clonePilotEnvironmentBinding);
    }

    async upsertPilotEnvironmentBinding(record: PilotEnvironmentBindingRecord): Promise<void> {
        this.pilotEnvironmentBindings.set(record.binding_id, clonePilotEnvironmentBinding(record));
    }

    async listPilotActorReadiness(workspaceKey?: string): Promise<PilotActorReadinessRecord[]> {
        return Array.from(this.pilotActorReadiness.values())
            .filter((record) => !workspaceKey || record.workspace_key === workspaceKey)
            .sort((a, b) => a.role.localeCompare(b.role) || b.updated_at - a.updated_at)
            .map(clonePilotActorReadiness);
    }

    async upsertPilotActorReadiness(record: PilotActorReadinessRecord): Promise<void> {
        this.pilotActorReadiness.set(record.readiness_id, clonePilotActorReadiness(record));
    }

    async listPilotConnectorActivationRecords(workspaceKey?: string): Promise<PilotConnectorActivationRecord[]> {
        return Array.from(this.pilotConnectorActivationRecords.values())
            .filter((record) => !workspaceKey || record.workspace_key === workspaceKey)
            .sort((a, b) => b.updated_at - a.updated_at)
            .map(clonePilotConnectorActivationRecord);
    }

    async upsertPilotConnectorActivationRecord(record: PilotConnectorActivationRecord): Promise<void> {
        this.pilotConnectorActivationRecords.set(record.activation_id, clonePilotConnectorActivationRecord(record));
    }

    async listPilotExternalArtifactIntakes(workspaceKey?: string): Promise<PilotExternalArtifactIntakeRecord[]> {
        return Array.from(this.pilotExternalArtifactIntakes.values())
            .filter((record) => !workspaceKey || record.workspace_key === workspaceKey)
            .sort((a, b) => b.updated_at - a.updated_at)
            .map(clonePilotExternalArtifactIntake);
    }

    async getPilotExternalArtifactIntake(intakeId: string): Promise<PilotExternalArtifactIntakeRecord | undefined> {
        const record = this.pilotExternalArtifactIntakes.get(intakeId);
        return record ? clonePilotExternalArtifactIntake(record) : undefined;
    }

    async upsertPilotExternalArtifactIntake(record: PilotExternalArtifactIntakeRecord): Promise<void> {
        this.pilotExternalArtifactIntakes.set(record.intake_id, clonePilotExternalArtifactIntake(record));
    }

    async listPilotEvidenceArtifacts(workspaceKey?: string): Promise<PilotEvidenceArtifactRecord[]> {
        return Array.from(this.pilotEvidenceArtifacts.values())
            .filter((record) => !workspaceKey || record.workspace_key === workspaceKey)
            .sort((a, b) => b.updated_at - a.updated_at)
            .map(clonePilotEvidenceArtifact);
    }

    async upsertPilotEvidenceArtifact(record: PilotEvidenceArtifactRecord): Promise<void> {
        this.pilotEvidenceArtifacts.set(record.artifact_id, clonePilotEvidenceArtifact(record));
    }

    async appendLedgerRecord(record: Omit<ExecutionLedgerRecord, 'sequence'>): Promise<ExecutionLedgerAppendResult> {
        const existing = this.ledgerRecordsByDedupeKey.get(record.dedupe_key);
        if (existing) {
            return {
                record: cloneLedgerRecord(existing),
                checkpoint: await this.buildLedgerCheckpoint(record.task_id),
                appended: false,
            };
        }

        const byTask = this.ledgerRecordsByTask.get(record.task_id) || [];
        const nextRecord: ExecutionLedgerRecord = {
            ...record,
            payload: record.payload ? { ...record.payload } : undefined,
            sequence: byTask.length > 0 ? byTask[byTask.length - 1].sequence + 1 : 1,
        };

        byTask.push(nextRecord);
        this.ledgerRecordsByTask.set(record.task_id, byTask);
        this.ledgerRecordsByDedupeKey.set(record.dedupe_key, nextRecord);

        return {
            record: cloneLedgerRecord(nextRecord),
            checkpoint: await this.buildLedgerCheckpoint(record.task_id),
            appended: true,
        };
    }

    async listLedgerRecords(filter?: ExecutionLedgerReadFilter): Promise<ExecutionLedgerRecord[]> {
        const taskId = filter?.task_id;
        const base = taskId
            ? (this.ledgerRecordsByTask.get(taskId) || [])
            : Array.from(this.ledgerRecordsByTask.values()).flat();

        const filtered = base
            .filter((record) => filter?.sequence_gte === undefined || record.sequence >= filter.sequence_gte)
            .filter((record) => filter?.sequence_lte === undefined || record.sequence <= filter.sequence_lte)
            .filter((record) => !filter?.event_types?.length || filter.event_types.includes(record.event_type))
            .sort((a, b) => {
                if (a.task_id !== b.task_id) return a.task_id.localeCompare(b.task_id);
                return a.sequence - b.sequence;
            });

        const limited = typeof filter?.limit === 'number' && filter.limit >= 0
            ? filtered.slice(0, filter.limit)
            : filtered;

        return limited.map(cloneLedgerRecord);
    }

    async listExecutionLedgerCompactionHints(taskId?: string): Promise<ExecutionLedgerCompactionHint[]> {
        return Array.from(this.ledgerCompactionHints.values())
            .filter((hint) => !taskId || hint.task_id === taskId)
            .sort((a, b) => b.updated_at - a.updated_at)
            .map(cloneLedgerCompactionHint);
    }

    async upsertExecutionLedgerCompactionHint(hint: ExecutionLedgerCompactionHint): Promise<void> {
        const existing = this.ledgerCompactionHints.get(hint.hint_id);
        this.ledgerCompactionHints.set(hint.hint_id, {
            ...hint,
            created_at: existing?.created_at || hint.created_at,
            updated_at: hint.updated_at,
        });
    }

    async getTaskProjection(taskId: string, projectionName: string): Promise<TaskQueryProjection | undefined> {
        const projection = this.projections.get(`${taskId}:${projectionName}`);
        return projection ? cloneTaskProjection(projection) : undefined;
    }

    async upsertTaskProjection(projection: TaskQueryProjection): Promise<void> {
        this.projections.set(
            `${projection.task_id}:${projection.projection_name}`,
            cloneTaskProjection(projection)
        );
    }

    async getProjectionCheckpoint(taskId: string, projectionName: string): Promise<TaskProjectionCheckpoint | undefined> {
        const checkpoint = this.projectionCheckpoints.get(`${taskId}:${projectionName}`);
        return checkpoint ? cloneProjectionCheckpoint(checkpoint) : undefined;
    }

    async upsertProjectionCheckpoint(checkpoint: TaskProjectionCheckpoint): Promise<void> {
        this.projectionCheckpoints.set(
            `${checkpoint.task_id}:${checkpoint.projection_name}`,
            cloneProjectionCheckpoint(checkpoint)
        );
    }

    private async buildLedgerCheckpoint(taskId: string): Promise<ExecutionLedgerAppendResult['checkpoint']> {
        const records = this.ledgerRecordsByTask.get(taskId) || [];
        const first = records[0];
        const last = records[records.length - 1];
        return {
            task_id: taskId,
            record_count: records.length,
            first_sequence: first?.sequence,
            last_sequence: last?.sequence,
            last_event_type: last?.event_type,
            last_event_at: last?.occurred_at,
            updated_at: now(),
        };
    }
}

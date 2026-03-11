import type {
    AgentKernelCorrelationContext,
    ApprovalPayload,
    EnvironmentActivationSummary,
    NodeDef,
    NodeState,
    NodeStatus,
    NodeTrace,
    RemoteRunnerControlPort,
    RetryPolicy,
    ServiceActionAuthorizerPort,
    ServiceAuthContext,
    TaskClaimReleaseReason,
    TaskGraph,
    TaskSnapshot,
    TaskState,
    TaskStatus,
    PolicyContext,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { createTaskStore, resolveTaskStoreDriverFromEnv } from './storeAdapters.js';
import { PolicyEngine, getPolicyEngine } from '../policy-engine/evaluator.js';
import {
    backoff,
    classifyError,
    hashText,
    NeedsUserInputError,
    PolicyDenyError,
    VerificationFailure,
} from './utils.js';
import {
    runApprovalExecutor,
    runLlmExecutor,
    runMergeExecutor,
    runToolExecutor,
    runVerifyExecutor,
} from './nodeExecutors/index.js';
import { sanitizeToolOutput } from '../policy-engine/redaction.js';
import { getToolRegistry, type ToolRegistry } from '../toolRegistry.js';
import {
    CompensationRegistry,
    createDefaultCompensationRegistry,
    toApprovalPayload,
} from './compensation.js';
import { incCounter } from '../metricsCollector.js';
import { createRuntimeEvent, type AgentKernelRuntimeEvent } from './events.js';
import { LocalFirstExecutionSubstrate, resolveNodeIdempotencyKey } from './substrate.js';
import { ExecutionLedgerAuthority } from './ledger.js';
import { AgentKernelComplianceService } from './compliance.js';
import { AgentKernelDeploymentBaselineService } from './deployment.js';
import { AgentKernelObservabilityService } from './observability.js';
import { AgentKernelProductShellService, type ProductShellQuery } from './productShell.js';
import {
    ServiceBackedWorkerPool,
    type ServiceBackedWorkerCycleResult,
} from './workerPool.js';

export interface TaskGraphRuntimeOptions {
    store?: TaskStore;
    policyEngine?: PolicyEngine;
    maxParallelNodes?: number;
    toolTimeoutMs?: number;
    claimLeaseTtlMs?: number;
    toolRegistry?: ToolRegistry;
    compensationRegistry?: CompensationRegistry;
    remoteRunnerControl?: RemoteRunnerControlPort;
    serviceActionAuthorizer?: ServiceActionAuthorizerPort;
    defaultServiceAuthContext?: ServiceAuthContext;
    onEvent?: (event: AgentKernelRuntimeEvent) => void;
}

function now(): number {
    return Date.now();
}

function createApprovalPayloadFromPolicy(taskId: string, node: NodeDef, reason: string): ApprovalPayload {
    return {
        task_id: taskId,
        node_id: node.id,
        type: 'approval',
        title: `Approval required for ${node.name}`,
        summary: reason,
        options: [
            { id: 'approve', label: 'Approve' },
            { id: 'reject', label: 'Reject' },
        ],
        default: 'approve',
        risk: 'medium',
        expires_at: now() + (15 * 60 * 1000),
    };
}

function ensureNodeInputFrom(graph: TaskGraph, node: NodeDef): string[] {
    if (Array.isArray(node.input_from) && node.input_from.length > 0) return node.input_from;
    return graph.edges
        .filter((edge) => edge[1] === node.id)
        .map((edge) => edge[0]);
}

function validateGraph(graph: TaskGraph): void {
    const ids = new Set<string>();
    for (const node of graph.nodes) {
        if (!node.id || ids.has(node.id)) {
            throw new Error(`Invalid graph: duplicate or empty node id ${node.id}`);
        }
        ids.add(node.id);
    }

    for (const [from, to] of graph.edges) {
        if (!ids.has(from) || !ids.has(to)) {
            throw new Error(`Invalid edge ${from} -> ${to}: node not found`);
        }
    }
}

function statusFromDecision(decision: string): TaskStatus {
    const normalized = String(decision || '').toLowerCase();
    if (normalized === 'approve' || normalized === 'approved') return 'RUNNING';
    if (normalized === 'reject' || normalized === 'rejected') return 'CANCELLED';
    return 'RUNNING';
}

function isApprovedDecision(decision: string): boolean {
    const normalized = String(decision || '').toLowerCase();
    return normalized === 'approve' || normalized === 'approved';
}

function normalizeCompensationTrigger(trigger: unknown): string {
    const text = String(trigger || '').trim();
    if (!text) return 'unknown';
    if (text === 'task_cancelled') return 'task_cancelled';
    if (text.endsWith('_fail')) return 'fail';
    if (text.endsWith('_succeed')) return 'succeed';
    return text;
}

function normalizeCompensationAction(action: unknown): string {
    const text = String(action || '').trim();
    if (!text) return 'unknown';
    return text.slice(0, 64);
}

const TERMINAL_NODE_STATUSES: ReadonlySet<NodeStatus> = new Set([
    'SUCCEEDED',
    'FAILED',
    'SKIPPED',
    'CANCELLED',
]);

export class TaskGraphRuntime {
    private readonly store: TaskStore;
    private readonly policyEngine: PolicyEngine;
    private readonly maxParallelNodes: number;
    private readonly toolTimeoutMs: number;
    private readonly claimLeaseTtlMs: number;
    private readonly toolRegistry: ToolRegistry;
    private readonly compensationRegistry: CompensationRegistry;
    private readonly executionSubstrate: LocalFirstExecutionSubstrate;
    private readonly executionLedger: ExecutionLedgerAuthority;
    private readonly complianceService: AgentKernelComplianceService;
    private readonly deploymentService: AgentKernelDeploymentBaselineService;
    private readonly observabilityService: AgentKernelObservabilityService;
    private readonly productShellService: AgentKernelProductShellService;
    private readonly serviceBackedWorkerPool: ServiceBackedWorkerPool;
    private readonly onEvent?: TaskGraphRuntimeOptions['onEvent'];
    private readonly runningTaskIds = new Set<string>();

    constructor(options?: TaskGraphRuntimeOptions) {
        this.store = options?.store || createTaskStore({
            driver: resolveTaskStoreDriverFromEnv(),
        });
        this.policyEngine = options?.policyEngine || getPolicyEngine();
        this.maxParallelNodes = Math.max(1, Number(options?.maxParallelNodes || 4));
        this.toolTimeoutMs = Math.max(1000, Number(options?.toolTimeoutMs || 15000));
        this.claimLeaseTtlMs = Math.max(1000, Number(options?.claimLeaseTtlMs || (this.toolTimeoutMs + 5000)));
        this.toolRegistry = options?.toolRegistry || getToolRegistry();
        this.compensationRegistry = options?.compensationRegistry || createDefaultCompensationRegistry();
        this.executionSubstrate = new LocalFirstExecutionSubstrate(this.store, options?.remoteRunnerControl, {
            serviceActionAuthorizer: options?.serviceActionAuthorizer,
            defaultServiceAuthContext: options?.defaultServiceAuthContext,
        });
        this.executionLedger = new ExecutionLedgerAuthority(this.store, this.executionSubstrate);
        this.executionSubstrate.setServiceAuthAuditRecorder(this.executionLedger);
        this.complianceService = new AgentKernelComplianceService(this.store);
        this.deploymentService = new AgentKernelDeploymentBaselineService(this.store);
        this.observabilityService = new AgentKernelObservabilityService(this.store);
        this.productShellService = new AgentKernelProductShellService(this.store, this.deploymentService);
        this.serviceBackedWorkerPool = new ServiceBackedWorkerPool({
            runtime: this,
            store: this.store,
        });
        this.onEvent = options?.onEvent;
    }

    getStore(): TaskStore {
        return this.store;
    }

    private defaultRetryPolicy(graph: TaskGraph): RetryPolicy {
        return {
            max_retries: graph.retry_policy?.max_retries ?? 2,
            backoff_ms: graph.retry_policy?.backoff_ms ?? 800,
            jitter: graph.retry_policy?.jitter ?? true,
            dead_letter_after_max_retries: graph.retry_policy?.dead_letter_after_max_retries ?? true,
        };
    }

    private correlationFromTaskState(taskState: TaskState | undefined, taskId: string): AgentKernelCorrelationContext {
        if (taskState?.correlation) return {
            ...taskState.correlation,
        };
        const createdAt = taskState?.created_at || now();
        return {
            trace_id: `trace_${hashText(`${taskId}:trace:${createdAt}`).slice(0, 16)}`,
            correlation_id: `corr_${hashText(`${taskId}:corr:${createdAt}`).slice(0, 16)}`,
            current_run_id: `run_${hashText(`${taskId}:run:0:${createdAt}`).slice(0, 16)}`,
            run_sequence: 0,
            created_at: createdAt,
            last_run_started_at: createdAt,
        };
    }

    private nextRunCorrelation(taskState: TaskState): AgentKernelCorrelationContext {
        const current = this.correlationFromTaskState(taskState, taskState.task_id);
        const startedAt = now();
        const runSequence = current.run_sequence + 1;
        return {
            ...current,
            current_run_id: `run_${hashText(`${taskState.task_id}:${runSequence}:${startedAt}`).slice(0, 16)}`,
            run_sequence: runSequence,
            last_run_started_at: startedAt,
        };
    }

    private async beginTaskRun(taskId: string): Promise<AgentKernelCorrelationContext | undefined> {
        const taskState = await this.store.getTaskState(taskId);
        if (!taskState) return undefined;
        const correlation = this.nextRunCorrelation(taskState);
        await this.store.updateTaskState(taskId, {
            correlation,
        });
        return correlation;
    }

    private async completeTaskRun(taskId: string, correlation: AgentKernelCorrelationContext | undefined): Promise<void> {
        if (!correlation) return;
        await this.store.updateTaskState(taskId, {
            correlation: {
                ...correlation,
                last_run_completed_at: now(),
            },
        });
    }

    private nodeTraceFor(params: {
        taskId: string;
        nodeId: string;
        attempt: number;
        correlation: AgentKernelCorrelationContext;
        currentTrace?: NodeTrace;
    }): NodeTrace {
        return {
            ...(params.currentTrace || {}),
            correlation_id: params.correlation.correlation_id,
            run_id: params.correlation.current_run_id,
            span_id: params.currentTrace?.span_id || `span_${hashText([
                params.taskId,
                params.nodeId,
                params.attempt,
                params.correlation.current_run_id,
            ].join(':')).slice(0, 16)}`,
        };
    }

    private async eventContext(taskId: string, nodeId?: string): Promise<{
        correlation_id?: string;
        run_id?: string;
        span_id?: string;
    }> {
        const taskState = await this.store.getTaskState(taskId);
        const nodeState = nodeId ? await this.store.getNodeState(taskId, nodeId) : undefined;
        return {
            correlation_id: nodeState?.trace?.correlation_id || taskState?.correlation?.correlation_id,
            run_id: nodeState?.trace?.run_id || taskState?.correlation?.current_run_id,
            span_id: nodeState?.trace?.span_id,
        };
    }

    private async releaseExecutionClaim(
        claimId: string | undefined,
        releaseReason: TaskClaimReleaseReason,
    ): Promise<void> {
        if (!claimId) return;
        const released = await this.executionSubstrate.releaseClaim({
            claim_id: claimId,
            release_reason: releaseReason,
        });
        if (!released) return;
        await this.executionLedger.recordExecutionReleased(
            released.claim.task_id,
            released.execution_unit,
            released.claim,
        );
    }

    private async releaseActiveClaimsForTask(taskId: string, releaseReason: TaskClaimReleaseReason): Promise<void> {
        const releasedClaims = await this.executionSubstrate.releaseActiveClaims(taskId, releaseReason);
        for (const released of releasedClaims) {
            await this.executionLedger.recordExecutionReleased(
                released.claim.task_id,
                released.execution_unit,
                released.claim,
            );
        }
    }

    private async recoverStaleExecutionClaims(taskId: string): Promise<void> {
        const recovery = await this.executionSubstrate.recoverStaleClaims(taskId);
        if (recovery.expired_claims.length === 0) return;

        for (let index = 0; index < recovery.expired_claims.length; index += 1) {
            const claim = recovery.expired_claims[index];
            const executionUnit = recovery.timed_out_units[index];
            const timeout = recovery.timeout_records[index];
            if (!claim || !executionUnit || !timeout) continue;

            const nodeState = await this.store.getNodeState(taskId, claim.node_id);
            if (nodeState && (nodeState.status === 'RUNNING' || nodeState.status === 'PENDING')) {
                await this.store.updateNodeState(taskId, claim.node_id, {
                    status: 'PENDING',
                    started_at: undefined,
                    ended_at: undefined,
                    error: undefined,
                });
            }

            await this.executionLedger.recordExecutionLeaseExpired(taskId, timeout, claim, executionUnit);
            const requeuedUnit = recovery.requeued_units[index];
            if (requeuedUnit) {
                await this.executionLedger.recordExecutionRequeued(taskId, requeuedUnit, claim);
            }
        }
    }

    private async scheduleFollowUpRun(taskId: string): Promise<void> {
        const snapshot = await this.store.getTaskSnapshot(taskId);
        if (!snapshot) return;
        if (['DONE', 'FAILED', 'CANCELLED'].includes(snapshot.task_state.status)) return;

        const runnable = this.computeRunnableNodes(snapshot);
        if (runnable.length > 0) {
            this.enqueueRunTask(taskId, 0);
            return;
        }

        const nextWakeup = await this.executionSubstrate.nextWakeupDelay(taskId);
        if (nextWakeup !== undefined) {
            this.enqueueRunTask(taskId, nextWakeup);
        }
    }

    private async withInfrastructureSummaries(snapshot: TaskSnapshot | undefined): Promise<TaskSnapshot | undefined> {
        if (!snapshot) return undefined;
        const executionSubstrate = await this.executionSubstrate.getSummary(snapshot.task_state.task_id);
        const executionLedger = await this.executionLedger.getVisibilitySummary(snapshot.task_state.task_id);
        const enrichedSnapshot: TaskSnapshot = {
            ...snapshot,
            execution_substrate: executionSubstrate || snapshot.execution_substrate,
            execution_ledger: executionLedger || snapshot.execution_ledger,
        };
        const observability = await this.observabilityService.summarizeTask(enrichedSnapshot);
        const compliance = await this.complianceService.summarizeTask({
            ...enrichedSnapshot,
            observability,
        });
        const deployment = await this.deploymentService.summarizeTask({
            ...enrichedSnapshot,
            observability,
            compliance,
        });
        const environmentActivation = await this.productShellService.summarizeEnvironment({
            taskId: snapshot.task_state.task_id,
        });
        return {
            ...enrichedSnapshot,
            observability,
            compliance,
            deployment,
            environment_activation: environmentActivation,
        };
    }

    async createTask(graph: TaskGraph): Promise<TaskSnapshot> {
        validateGraph(graph);
        const snapshot = await this.store.createTask({
            ...graph,
            max_parallel_nodes: graph.max_parallel_nodes || this.maxParallelNodes,
            retry_policy: this.defaultRetryPolicy(graph),
            created_at: graph.created_at || now(),
        });
        await this.executionLedger.recordTaskCreated(snapshot);
        await this.executionLedger.recordTaskStarted(snapshot);
        return await this.withInfrastructureSummaries(snapshot) as TaskSnapshot;
    }

    async getTaskSnapshot(taskId: string): Promise<TaskSnapshot | undefined> {
        const snapshot = await this.store.getTaskSnapshot(taskId);
        return this.withInfrastructureSummaries(snapshot);
    }

    async getTaskObservabilitySummary(taskId: string) {
        const snapshot = await this.getTaskSnapshot(taskId);
        return snapshot?.observability;
    }

    async getPilotObservabilitySummary() {
        const taskIds = await this.store.listTaskIds();
        const snapshots: TaskSnapshot[] = [];
        for (const taskId of taskIds) {
            const snapshot = await this.getTaskSnapshot(taskId);
            if (snapshot) snapshots.push(snapshot);
        }
        return this.observabilityService.summarizePilot(snapshots);
    }

    async getTaskComplianceSummary(taskId: string) {
        const snapshot = await this.getTaskSnapshot(taskId);
        return snapshot?.compliance;
    }

    async getPilotComplianceSummary() {
        const taskIds = await this.store.listTaskIds();
        const snapshots: TaskSnapshot[] = [];
        for (const taskId of taskIds) {
            const snapshot = await this.getTaskSnapshot(taskId);
            if (snapshot) snapshots.push(snapshot);
        }
        return this.complianceService.summarizePilot(snapshots);
    }

    async getTaskDeploymentSummary(taskId: string) {
        const snapshot = await this.getTaskSnapshot(taskId);
        return snapshot?.deployment;
    }

    async getPilotDeploymentSummary() {
        const taskIds = await this.store.listTaskIds();
        const snapshots: TaskSnapshot[] = [];
        for (const taskId of taskIds) {
            const snapshot = await this.getTaskSnapshot(taskId);
            if (snapshot) snapshots.push(snapshot);
        }
        return this.deploymentService.summarizePilot(snapshots);
    }

    async listTaskSnapshots(): Promise<TaskSnapshot[]> {
        const taskIds = await this.store.listTaskIds();
        const snapshots: TaskSnapshot[] = [];
        for (const taskId of taskIds) {
            const snapshot = await this.getTaskSnapshot(taskId);
            if (snapshot) snapshots.push(snapshot);
        }
        return snapshots.sort((a, b) => b.task_state.updated_at - a.task_state.updated_at);
    }

    async getTaskEnvironmentActivationSummary(taskId: string): Promise<EnvironmentActivationSummary | undefined> {
        const snapshot = await this.getTaskSnapshot(taskId);
        return snapshot?.environment_activation;
    }

    async getEnvironmentActivationSummary(query?: ProductShellQuery) {
        return this.productShellService.summarizeEnvironment(query);
    }

    async getRequesterInboxSummary(query?: ProductShellQuery) {
        return this.productShellService.summarizeRequesterInbox(query);
    }

    async getPolicyStudioSummary(query?: ProductShellQuery) {
        return this.productShellService.summarizePolicyStudio(query);
    }

    async getProductShellSummary(query?: ProductShellQuery) {
        return this.productShellService.summarizeProductShell(query);
    }

    async registerPilotActorReadiness(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        role: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
        actorId?: string;
        actorLabel?: string;
        source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
        provisioningState?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
        accessState?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
        note?: string;
        evidenceReferenceIds?: string[];
    }) {
        return this.productShellService.registerPilotActorReadiness(params);
    }

    async registerPilotEnvironmentBinding(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        environmentKind: 'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION';
        environmentLabel: string;
        baseUrl?: string;
        tenantId?: string;
        workspaceId?: string;
        source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
        summary?: string;
    }) {
        return this.productShellService.registerPilotEnvironmentBinding(params);
    }

    async registerPilotConnectorActivation(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        connectorId: string;
        source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
        summary?: string;
    }) {
        return this.productShellService.registerPilotConnectorActivation(params);
    }

    async registerPilotActivationPackageHandoff(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        ownerType: 'PILOT_COMMANDER' | 'REQUESTER_OWNER' | 'OPERATOR_OWNER' | 'TENANT_ADMIN_OWNER';
        ownerLabel?: string;
        summary?: string;
        handoffNote?: string;
        dueAt?: number;
    }) {
        return this.productShellService.registerPilotActivationPackageHandoff(params);
    }

    async submitPilotExternalArtifactIntake(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        artifactKind: 'ENVIRONMENT_BINDING' | 'ACTOR_READINESS' | 'CONNECTOR_ELIGIBILITY' | 'REAL_EVIDENCE';
        source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
        summary: string;
        uri?: string;
        submittedByRole?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
        submittedByEnterpriseRole?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN' | 'WORKSPACE_ADMIN' | 'INTEGRATION_ADMIN';
        submittedByLabel?: string;
        actorRole?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
        actorId?: string;
        actorLabel?: string;
        provisioningState?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
        accessState?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
        evidenceCategory?: 'DEVICE_SESSION_PROOF' | 'WORKFLOW_ARTIFACT_PROOF' | 'CONNECTOR_CREDENTIAL_PROOF' | 'TENANT_ADMIN_SUPPORT_PROOF' | 'STABILITY_SAFETY_PROOF';
        environmentKind?: 'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION';
        environmentLabel?: string;
        baseUrl?: string;
        tenantId?: string;
        workspaceId?: string;
        connectorId?: string;
    }) {
        return this.productShellService.submitPilotExternalArtifactIntake(params);
    }

    async reviewPilotExternalArtifactIntake(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        intakeId: string;
        decision: 'VERIFY' | 'REJECT' | 'PROMOTE' | 'REQUEST_EVIDENCE' | 'HAND_BACK';
        reviewedBy?: string;
        reviewedByEnterpriseRole?: 'REQUESTER' | 'APPROVER' | 'OPERATOR' | 'REVIEWER' | 'TENANT_ADMIN' | 'WORKSPACE_ADMIN' | 'POLICY_GOVERNANCE_ADMIN' | 'INTEGRATION_ADMIN' | 'AUDITOR';
        verificationNote?: string;
    }) {
        return this.productShellService.reviewPilotExternalArtifactIntake(params);
    }

    async registerPilotEvidenceArtifact(params: {
        workspaceMode?: 'current' | 'demo' | 'local_lab';
        category:
            | 'DEVICE_SESSION_PROOF'
            | 'WORKFLOW_ARTIFACT_PROOF'
            | 'CONNECTOR_CREDENTIAL_PROOF'
            | 'TENANT_ADMIN_SUPPORT_PROOF'
            | 'STABILITY_SAFETY_PROOF';
        source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
        summary: string;
        uri?: string;
        actorRole?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    }) {
        return this.productShellService.registerPilotEvidenceArtifact(params);
    }

    async createComplianceDeletionRequest(input: {
        task_id: string;
        session_id: string;
        workspace_id?: string;
        reason: string;
        legal_hold_asserted?: boolean;
    }) {
        const snapshot = await this.getTaskSnapshot(input.task_id);
        if (!snapshot) return undefined;
        const deletionRequest = await this.complianceService.createDeletionRequest(snapshot, input);
        const refreshed = await this.getTaskSnapshot(input.task_id);
        return {
            deletion_request: deletionRequest,
            compliance: refreshed?.compliance,
        };
    }

    async createComplianceAuditExport(input: {
        task_id: string;
        session_id: string;
        workspace_id?: string;
    }) {
        const snapshot = await this.getTaskSnapshot(input.task_id);
        if (!snapshot) return undefined;
        const created = await this.complianceService.createAuditExport(snapshot, input);
        const refreshed = await this.getTaskSnapshot(input.task_id);
        return {
            ...created,
            compliance: refreshed?.compliance,
        };
    }

    async runTask(taskId: string): Promise<TaskSnapshot | undefined> {
        await this.recoverStaleExecutionClaims(taskId);
        await this.requeueDueRetryJobs(taskId);
        const snapshot = await this.store.getTaskSnapshot(taskId);
        if (!snapshot) return undefined;

        if (this.runningTaskIds.has(taskId)) {
            this.enqueueRunTask(taskId, 50);
            return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
        }

        this.runningTaskIds.add(taskId);
        let activeRun: AgentKernelCorrelationContext | undefined;
        try {
            const current = await this.store.getTaskSnapshot(taskId);
            if (!current) return undefined;
            if (['DONE', 'FAILED', 'CANCELLED'].includes(current.task_state.status)) {
                return await this.withInfrastructureSummaries(current);
            }

            activeRun = await this.beginTaskRun(taskId);

            if (this.isTaskExpired(current)) {
                await this.failTask(taskId, 'TASK_TIMEOUT', 'Task exceeded latency budget');
                return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
            }

            if (this.isBudgetExceeded(current.task_state, current.graph)) {
                await this.applyBudgetDowngrade(taskId, current, 'Task budget exceeded; running best-effort mode');
            }

            const refreshed = await this.store.getTaskSnapshot(taskId);
            if (!refreshed) return undefined;

            const runnable = this.computeRunnableNodes(refreshed)
                .slice(0, refreshed.graph.max_parallel_nodes || this.maxParallelNodes);

            if (runnable.length === 0) {
                await this.reconcileTaskTerminalState(taskId);
                await this.scheduleFollowUpRun(taskId);
                return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
            }

            await this.store.updateTaskState(taskId, { status: 'RUNNING' });
            await this.executionLedger.recordTaskStateUpdate(taskId, 'run_task');
            await Promise.all(runnable.map((node) => this.executeNode(taskId, node.id)));
            await this.reconcileTaskTerminalState(taskId);
            await this.scheduleFollowUpRun(taskId);
            return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
        } finally {
            await this.completeTaskRun(taskId, activeRun);
            this.runningTaskIds.delete(taskId);
        }
    }

    async approveTask(taskId: string, params: {
        node_id: string;
        decision: string;
        edited_payload?: unknown;
    }): Promise<TaskSnapshot | undefined> {
        const snapshot = await this.store.getTaskSnapshot(taskId);
        if (!snapshot) return undefined;

        const nodeState = await this.store.getNodeState(taskId, params.node_id);
        if (!nodeState || nodeState.status !== 'WAITING_USER') {
            throw new Error(`Node ${params.node_id} is not waiting user input`);
        }

        const nodeDef = snapshot.graph.nodes.find((node) => node.id === params.node_id);
        if (!nodeDef) {
            throw new Error(`Node ${params.node_id} not found in task graph`);
        }

        const nextStatus = statusFromDecision(params.decision);
        if (nextStatus === 'CANCELLED') {
            await this.cancelTask(taskId, `Rejected on node ${params.node_id}`);
            return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
        }

        if (nodeDef.type === 'approval' || nodeDef.type === 'ask_user') {
            await this.store.updateNodeState(taskId, params.node_id, {
                status: 'SUCCEEDED',
                output: {
                    decision: params.decision,
                    edited_payload: params.edited_payload,
                    approved_at: now(),
                },
                ended_at: now(),
                error: undefined,
                trace: {
                    ...(nodeState.trace || {}),
                    approval_granted: isApprovedDecision(params.decision),
                    approval_decision: params.decision,
                },
            });
        } else {
            // For non-approval nodes, user approval resumes the same node execution
            // instead of short-circuiting it as succeeded.
            await this.store.updateNodeState(taskId, params.node_id, {
                status: 'PENDING',
                output: undefined,
                started_at: undefined,
                ended_at: now(),
                error: undefined,
                trace: {
                    ...(nodeState.trace || {}),
                    approval_granted: isApprovedDecision(params.decision),
                    approval_decision: params.decision,
                },
            });
        }

        const currentTask = await this.store.getTaskState(taskId);
        if (currentTask?.current_wait?.node_id === params.node_id) {
            await this.store.updateTaskState(taskId, {
                status: 'RUNNING',
                current_wait: undefined,
            });
            await this.executionLedger.recordTaskStateUpdate(taskId, 'approval_resume');
        }

        await this.emit('task.node.succeeded', taskId, params.node_id, {
            reason: nodeDef.type === 'approval' || nodeDef.type === 'ask_user'
                ? 'user_approved'
                : 'user_approved_resume',
        });

        this.enqueueRunTask(taskId, 0);
        return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
    }

    async cancelTask(taskId: string, reason?: string): Promise<TaskSnapshot | undefined> {
        const snapshot = await this.store.getTaskSnapshot(taskId);
        if (!snapshot) return undefined;
        const cancelledNodeIds: string[] = [];

        for (const nodeState of snapshot.node_states) {
            if (['PENDING', 'RUNNING', 'WAITING_USER', 'FAILED'].includes(nodeState.status)) {
                const cancelledNode = await this.store.updateNodeState(taskId, nodeState.node_id, {
                    status: 'CANCELLED',
                    ended_at: now(),
                    error: reason
                        ? {
                            code: 'INTERNAL_ERROR',
                            message: reason,
                            retryable: false,
                        }
                        : nodeState.error,
                });
                if (cancelledNode) {
                    cancelledNodeIds.push(cancelledNode.node_id);
                    await this.executionLedger.recordNodeCancelled(taskId, cancelledNode, reason);
                }
            }
        }

        await this.executionSubstrate.cancelPendingRetryJobs(taskId);
        await this.releaseActiveClaimsForTask(taskId, 'TASK_CANCELLED');
        await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'task_cancelled');
        await this.store.updateTaskState(taskId, {
            status: 'CANCELLED',
            current_wait: undefined,
        });
        await this.maybeRunCompensation(taskId, 'task_cancelled');
        await this.emit('task.cancelled', taskId, undefined, { reason, cancelled_node_ids: cancelledNodeIds });
        return await this.withInfrastructureSummaries(await this.store.getTaskSnapshot(taskId));
    }

    private enqueueRunTask(taskId: string, delayMs: number): void {
        this.serviceBackedWorkerPool.scheduleTask(taskId, delayMs);
    }

    private heartbeatIntervalMs(): number {
        return Math.max(25, Math.min(250, Math.floor(this.claimLeaseTtlMs / 2)));
    }

    private async renewExecutionClaimHeartbeat(claimId: string): Promise<void> {
        const heartbeat = await this.executionSubstrate.heartbeatClaim(claimId, this.claimLeaseTtlMs);
        if (!heartbeat) return;
        await this.executionLedger.recordExecutionHeartbeat(
            heartbeat.claim.task_id,
            heartbeat.heartbeat,
            heartbeat.claim,
        );
    }

    private async withExecutionClaimHeartbeat<T>(claimId: string, work: () => Promise<T>): Promise<T> {
        const intervalMs = this.heartbeatIntervalMs();
        let active = true;
        let renewal = Promise.resolve();
        const timer = setInterval(() => {
            if (!active) return;
            renewal = renewal
                .then(() => this.renewExecutionClaimHeartbeat(claimId))
                .catch(() => undefined);
        }, intervalMs);

        try {
            return await work();
        } finally {
            active = false;
            clearInterval(timer);
            await renewal;
        }
    }

    async drainWorkerPoolOnce(params?: {
        task_ids?: string[];
        max_tasks?: number;
    }): Promise<ServiceBackedWorkerCycleResult> {
        return this.serviceBackedWorkerPool.drainOnce(params);
    }

    startWorkerPoolPolling(pollIntervalMs?: number): void {
        this.serviceBackedWorkerPool.start(pollIntervalMs);
    }

    stopWorkerPoolPolling(): void {
        this.serviceBackedWorkerPool.stop();
    }

    private async requeueDueRetryJobs(taskId: string): Promise<void> {
        const dueJobs = await this.executionSubstrate.getDueRetryJobs(taskId);
        if (dueJobs.length === 0) return;

        for (const job of dueJobs) {
            const nodeState = await this.store.getNodeState(taskId, job.node_id);
            if (!nodeState) {
                await this.executionSubstrate.markRetryJobStatus(job.job_id, 'CANCELLED');
                continue;
            }

            if (nodeState.status === 'FAILED' && nodeState.attempt + 1 === job.attempt) {
                await this.store.updateNodeState(taskId, job.node_id, {
                    status: 'PENDING',
                    started_at: undefined,
                    ended_at: undefined,
                    error: undefined,
                });
                await this.executionSubstrate.markRetryJobStatus(job.job_id, 'REQUEUED');
                await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'retry_requeued');
                await this.emit('task.retry.requeued', taskId, job.node_id, {
                    job_id: job.job_id,
                    attempt: job.attempt,
                    available_at: job.available_at,
                    idempotency_key: job.idempotency_key,
                });
                continue;
            }

            if (nodeState.attempt + 1 >= job.attempt || nodeState.status === 'PENDING' || nodeState.status === 'RUNNING') {
                await this.executionSubstrate.markRetryJobStatus(job.job_id, 'COMPLETED');
                await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'retry_completed');
            }
        }
    }

    private async emit(type: string, taskId: string, nodeId?: string, payload?: Record<string, unknown>): Promise<void> {
        const context = await this.eventContext(taskId, nodeId);
        const event = createRuntimeEvent({
            type,
            task_id: taskId,
            node_id: nodeId,
            correlation_id: context.correlation_id,
            run_id: context.run_id,
            span_id: context.span_id,
            payload: {
                ...payload,
                correlation_id: payload?.correlation_id || context.correlation_id,
                run_id: payload?.run_id || context.run_id,
                span_id: payload?.span_id || context.span_id,
            },
        });

        incCounter(
            'agent_kernel_events_total',
            { event_type: type },
            1,
            'Total number of emitted agent-kernel events'
        );

        if (type === 'task.done') {
            incCounter('agent_kernel_tasks_total', { status: 'done' }, 1, 'Agent-kernel task outcomes');
        } else if (type === 'task.failed') {
            incCounter('agent_kernel_tasks_total', { status: 'failed' }, 1, 'Agent-kernel task outcomes');
        } else if (type === 'task.awaiting_user') {
            incCounter('agent_kernel_tasks_total', { status: 'waiting_user' }, 1, 'Agent-kernel task outcomes');
        }

        if (type === 'task.compensation.result') {
            const disposition = String(payload?.disposition || 'unknown').toLowerCase();
            const action = normalizeCompensationAction(payload?.action);
            const trigger = normalizeCompensationTrigger(payload?.trigger);
            incCounter(
                'agent_kernel_compensation_total',
                { disposition, action, trigger },
                1,
                'Agent-kernel compensation outcomes'
            );
            if (payload?.requires_user === true) {
                incCounter(
                    'agent_kernel_compensation_total',
                    { disposition: 'requires_user', action, trigger },
                    1,
                    'Agent-kernel compensation outcomes'
                );
            }
        }

        if (type === 'task.compensation.irreversible') {
            const action = normalizeCompensationAction(payload?.action);
            const trigger = normalizeCompensationTrigger(payload?.trigger);
            incCounter(
                'agent_kernel_compensation_total',
                { disposition: 'irreversible', action, trigger },
                1,
                'Agent-kernel compensation outcomes'
            );
        }

        await this.executionLedger.captureRuntimeEvent(event);
        this.onEvent?.(event);
    }

    private async failTask(taskId: string, code: string, message: string): Promise<void> {
        await this.executionSubstrate.cancelPendingRetryJobs(taskId);
        await this.releaseActiveClaimsForTask(taskId, 'TASK_CANCELLED');
        await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'task_failed');
        await this.store.updateTaskState(taskId, {
            status: 'FAILED',
            current_wait: undefined,
        });
        await this.emit('task.failed', taskId, undefined, { code, message });
    }

    private isTaskExpired(snapshot: TaskSnapshot): boolean {
        const maxLatency = snapshot.graph.budget?.max_latency_ms;
        if (!maxLatency || maxLatency <= 0) return false;
        const elapsed = now() - snapshot.task_state.created_at;
        return elapsed > maxLatency;
    }

    private isBudgetExceeded(task: TaskState, graph: TaskGraph): boolean {
        const budget = graph.budget;
        if (!budget) return false;
        if (typeof budget.max_tool_calls === 'number' && task.budget_spent.tool_calls >= budget.max_tool_calls) return true;
        if (typeof budget.max_tokens === 'number' && task.budget_spent.tokens >= budget.max_tokens) return true;
        if (typeof budget.max_latency_ms === 'number' && task.budget_spent.latency_ms >= budget.max_latency_ms) return true;
        return false;
    }

    private willExceedBudget(snapshot: TaskSnapshot, node: NodeDef): boolean {
        const budget = snapshot.graph.budget;
        if (!budget) return false;

        if (node.type === 'tool' && typeof budget.max_tool_calls === 'number') {
            if (snapshot.task_state.budget_spent.tool_calls + 1 > budget.max_tool_calls) return true;
        }

        if (typeof budget.max_latency_ms === 'number') {
            const elapsed = now() - snapshot.task_state.created_at;
            if (elapsed > budget.max_latency_ms) return true;
        }

        return false;
    }

    private buildBestEffortOutput(node: NodeDef, reason: string, input?: unknown): Record<string, unknown> {
        const inputKeys = input && typeof input === 'object' && !Array.isArray(input)
            ? Object.keys(input as Record<string, unknown>).slice(0, 12)
            : [];
        return {
            downgraded: true,
            best_effort: true,
            reason,
            node_id: node.id,
            node_name: node.name,
            input_keys: inputKeys,
            generated_at: now(),
        };
    }

    private async markNodeDowngraded(
        taskId: string,
        node: NodeDef,
        params: {
            input?: unknown;
            attempt?: number;
            startedAt?: number;
            reason: string;
        }
    ): Promise<void> {
        const endedAt = now();
        const startedAt = params.startedAt || endedAt;
        await this.store.updateNodeState(taskId, node.id, {
            status: 'SUCCEEDED',
            input: params.input,
            output: this.buildBestEffortOutput(node, params.reason, params.input),
            started_at: startedAt,
            ended_at: endedAt,
            attempt: params.attempt,
            error: undefined,
        });
        await this.store.updateTaskState(taskId, {
            status: 'RUNNING',
            current_wait: undefined,
        });
        await this.maybeRunCompensation(taskId, `${node.id}_succeed`);
        await this.emit('task.node.succeeded', taskId, node.id, {
            downgraded: true,
            reason: params.reason,
            latency_ms: Math.max(0, endedAt - startedAt),
        });
    }

    private async applyBudgetDowngrade(taskId: string, snapshot: TaskSnapshot, reason: string): Promise<void> {
        const nodeStateMap = new Map(snapshot.node_states.map((state) => [state.node_id, state]));
        let downgradedCount = 0;

        for (const node of snapshot.graph.nodes) {
            if (node.type !== 'tool') continue;
            const state = nodeStateMap.get(node.id);
            if (!state || state.status !== 'PENDING') continue;

            const inputs = this.gatherInputs(snapshot, node);
            if (!inputs.ready) continue;
            await this.markNodeDowngraded(taskId, node, {
                input: inputs.value,
                attempt: state.attempt + 1,
                startedAt: now(),
                reason,
            });
            downgradedCount += 1;
        }

        if (downgradedCount > 0) {
            await this.emit('task.downgraded', taskId, undefined, {
                reason,
                downgraded_nodes: downgradedCount,
            });
        }
    }

    private evaluateNodeReadiness(snapshot: TaskSnapshot, node: NodeDef): {
        ready: boolean;
        value: Record<string, unknown>;
    } {
        const deps = ensureNodeInputFrom(snapshot.graph, node);
        const nodeStateMap = new Map(snapshot.node_states.map((state) => [state.node_id, state]));
        const value: Record<string, unknown> = {
            ...(node.input || {}),
        };

        if (deps.length === 0) {
            return { ready: true, value };
        }

        const depEntries = deps.map((depId) => ({
            depId,
            state: nodeStateMap.get(depId),
        }));
        const succeeded = depEntries.filter((dep) => dep.state?.status === 'SUCCEEDED');
        for (const dep of succeeded) {
            value[dep.depId] = dep.state?.output;
        }

        if (node.type !== 'merge') {
            const allSucceeded = depEntries.every((dep) => dep.state?.status === 'SUCCEEDED');
            return {
                ready: allSucceeded,
                value,
            };
        }

        const mergeMode = node.merge_policy?.mode || 'ALL';
        if (mergeMode === 'ANY_K') {
            const required = Math.max(1, Number(node.merge_policy?.k || 1));
            return {
                ready: succeeded.length >= required,
                value,
            };
        }

        if (mergeMode === 'BEST_EFFORT') {
            const timeoutMs = Number(node.merge_policy?.timeout_ms || 0);
            const elapsed = now() - snapshot.task_state.created_at;
            const allTerminal = depEntries.every((dep) => dep.state && TERMINAL_NODE_STATUSES.has(dep.state.status));
            const timedOut = timeoutMs > 0 && elapsed >= timeoutMs;
            return {
                ready: allTerminal || timedOut,
                value,
            };
        }

        const allSucceeded = depEntries.every((dep) => dep.state?.status === 'SUCCEEDED');
        return {
            ready: allSucceeded,
            value,
        };
    }

    private computeRunnableNodes(snapshot: TaskSnapshot): NodeDef[] {
        const runnable: NodeDef[] = [];
        const nodeStateMap = new Map(snapshot.node_states.map((state) => [state.node_id, state]));

        for (const node of snapshot.graph.nodes) {
            const state = nodeStateMap.get(node.id);
            if (!state || state.status !== 'PENDING') continue;

            const readiness = this.evaluateNodeReadiness(snapshot, node);
            if (readiness.ready) runnable.push(node);
        }

        return runnable;
    }

    private gatherInputs(snapshot: TaskSnapshot, node: NodeDef): {
        ready: boolean;
        value: Record<string, unknown>;
    } {
        return this.evaluateNodeReadiness(snapshot, node);
    }

    private buildPolicyContext(
        phase: PolicyContext['phase'],
        snapshot: TaskSnapshot,
        node: NodeDef,
        input: unknown,
        output?: unknown
    ): PolicyContext {
        return {
            phase,
            task_id: snapshot.graph.task_id,
            node_id: node.id,
            intent: {
                type: 'multi_step_task',
                goal: snapshot.graph.goal,
                risk_level: snapshot.graph.context?.intent?.risk_level || 'medium',
                ...(snapshot.graph.context?.intent || {}),
            },
            user: {
                privacy_level: snapshot.graph.context?.user?.privacy_level || 'medium',
                confirm_threshold: snapshot.graph.context?.user?.confirm_threshold || 'medium',
                risk_tolerance: snapshot.graph.context?.user?.risk_tolerance || 'low',
                ...(snapshot.graph.context?.user || {}),
            },
            permissions: {
                ...(snapshot.graph.context?.permissions || {}),
            },
            data: {
                sensitivity: snapshot.graph.context?.data?.sensitivity || 'medium',
                contains_pii: snapshot.graph.context?.data?.contains_pii || false,
                egress_target: snapshot.graph.context?.data?.egress_target || 'cloud',
                fields: snapshot.graph.context?.data?.fields || [],
                ...(snapshot.graph.context?.data || {}),
            },
            node: {
                id: node.id,
                type: node.type,
                name: node.name,
            },
            tool: node.type === 'tool'
                ? {
                    name: node.name,
                    category: String(node.metadata?.tool_category || ''),
                    side_effect: String(node.metadata?.tool_side_effect || 'none'),
                }
                : undefined,
            budget: {
                tool_calls_left: typeof snapshot.graph.budget?.max_tool_calls === 'number'
                    ? snapshot.graph.budget.max_tool_calls - snapshot.task_state.budget_spent.tool_calls
                    : undefined,
                tokens_left: typeof snapshot.graph.budget?.max_tokens === 'number'
                    ? snapshot.graph.budget.max_tokens - snapshot.task_state.budget_spent.tokens
                    : undefined,
                latency_left_ms: typeof snapshot.graph.budget?.max_latency_ms === 'number'
                    ? snapshot.graph.budget.max_latency_ms - (now() - snapshot.task_state.created_at)
                    : undefined,
            },
            input,
            output,
        };
    }

    private hasRequiredPermission(snapshot: TaskSnapshot, node: NodeDef): boolean {
        if (!node.requires_permission) return true;
        const granted = snapshot.graph.context?.permissions?.[node.requires_permission];
        return granted === true;
    }

    private async executeNode(taskId: string, nodeId: string): Promise<void> {
        const snapshot = await this.store.getTaskSnapshot(taskId);
        if (!snapshot) return;

        const node = snapshot.graph.nodes.find((item) => item.id === nodeId);
        if (!node) return;

        const currentState = await this.store.getNodeState(taskId, nodeId);
        if (!currentState || currentState.status !== 'PENDING') return;
        const taskState = await this.store.getTaskState(taskId);
        const correlation = this.correlationFromTaskState(taskState, taskId);
        const pendingTrace = this.nodeTraceFor({
            taskId,
            nodeId,
            attempt: currentState.attempt + 1,
            correlation,
            currentTrace: currentState.trace,
        });

        const inputs = this.gatherInputs(snapshot, node);
        if (!inputs.ready) return;

        if (this.willExceedBudget(snapshot, node)) {
            if (node.type === 'tool') {
                await this.markNodeDowngraded(taskId, node, {
                    input: inputs.value,
                    attempt: currentState.attempt + 1,
                    startedAt: now(),
                    reason: 'Budget exceeded before tool execution',
                });
            } else {
                await this.store.updateNodeState(taskId, nodeId, {
                    status: 'FAILED',
                    ended_at: now(),
                    error: {
                        code: 'BUDGET_EXCEEDED',
                        message: 'Node execution would exceed budget',
                        retryable: false,
                    },
                    trace: pendingTrace,
                });
                await this.emit('task.node.failed', taskId, nodeId, { code: 'BUDGET_EXCEEDED' });
            }
            return;
        }

        const preNodeCtx = this.buildPolicyContext('PRE_NODE', snapshot, node, inputs.value);
        const preNodeDecision = this.policyEngine.evaluate(preNodeCtx);
        await this.store.attachPolicyDecision(taskId, nodeId, preNodeDecision.id);

        if (preNodeDecision.action === 'DENY') {
            await this.store.updateNodeState(taskId, nodeId, {
                status: 'FAILED',
                ended_at: now(),
                error: {
                    code: 'POLICY_DENY',
                    message: preNodeDecision.reason,
                    retryable: false,
                },
                trace: pendingTrace,
            });
            await this.emit('policy.denied', taskId, nodeId, { reason: preNodeDecision.reason, phase: 'PRE_NODE' });
            return;
        }

        if (!this.hasRequiredPermission(snapshot, node)) {
            const missingPermission = String(node.requires_permission || 'unknown_permission');
            await this.store.updateNodeState(taskId, nodeId, {
                status: 'FAILED',
                ended_at: now(),
                error: {
                    code: 'POLICY_DENY',
                    message: `Missing required permission: ${missingPermission}`,
                    retryable: false,
                },
                trace: pendingTrace,
            });
            await this.emit('policy.denied', taskId, nodeId, {
                reason: `Missing required permission: ${missingPermission}`,
                phase: 'PRE_NODE',
            });
            return;
        }

        if (preNodeDecision.action === 'DOWNGRADE' && node.type === 'tool') {
            await this.markNodeDowngraded(taskId, node, {
                input: inputs.value,
                attempt: currentState.attempt + 1,
                startedAt: now(),
                reason: preNodeDecision.reason || 'Policy requested downgrade',
            });
            return;
        }

        if (
            preNodeDecision.action === 'REQUIRE_APPROVAL'
            && !['approval', 'ask_user'].includes(node.type)
            && currentState.trace?.approval_granted !== true
        ) {
            const prompt = createApprovalPayloadFromPolicy(taskId, node, preNodeDecision.reason);
            await this.store.updateNodeState(taskId, nodeId, {
                status: 'WAITING_USER',
                output: prompt,
                ended_at: now(),
                trace: pendingTrace,
            });
            await this.store.updateTaskState(taskId, {
                status: 'WAITING_USER',
                current_wait: {
                    node_id: node.id,
                    type: 'approval',
                    prompt,
                    expires_at: prompt.expires_at,
                },
            });
            await this.emit('task.awaiting_user', taskId, nodeId, { reason: preNodeDecision.reason });
            return;
        }

        const nextAttempt = currentState.attempt + 1;
        const executionClaim = await this.executionSubstrate.claimExecutionUnit({
            task_id: taskId,
            node_id: nodeId,
            target_attempt: nextAttempt,
            lease_ttl_ms: this.claimLeaseTtlMs,
            correlation_id: correlation.correlation_id,
            run_id: correlation.current_run_id,
        });
        if (!executionClaim) return;

        if (executionClaim.created_execution_unit) {
            await this.executionLedger.recordExecutionUnitEnqueued(taskId, executionClaim.execution_unit);
        }
        await this.executionLedger.recordExecutionClaimed(
            taskId,
            executionClaim.execution_unit,
            executionClaim.claim,
        );

        const heartbeat = await this.executionSubstrate.heartbeatClaim(
            executionClaim.claim.claim_id,
            this.claimLeaseTtlMs,
        );
        if (heartbeat) {
            await this.executionLedger.recordExecutionHeartbeat(taskId, heartbeat.heartbeat, heartbeat.claim);
        }

        const runnerResult = await this.executionSubstrate.requestRemoteRunner(
            executionClaim.claim.claim_id,
            'execute_node',
        );
        if (runnerResult?.result.status === 'LOCAL_FALLBACK') {
            await this.executionLedger.recordExecutionLocalFallbackUsed(
                taskId,
                runnerResult.execution_unit,
                runnerResult.claim,
                runnerResult.result,
            );
        }

        const startedAt = now();
        const nodeTrace = this.nodeTraceFor({
            taskId,
            nodeId,
            attempt: nextAttempt,
            correlation,
            currentTrace: currentState.trace,
        });
        await this.store.updateNodeState(taskId, nodeId, {
            status: 'RUNNING',
            started_at: startedAt,
            input: inputs.value,
            attempt: nextAttempt,
            error: undefined,
            trace: nodeTrace,
        });
        const consumedRetryJob = await this.executionSubstrate.markRetryJobCompleted(taskId, nodeId, nextAttempt);
        if (consumedRetryJob) {
            await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'retry_consumed');
        }
        await this.emit('task.node.started', taskId, nodeId, { attempt: nextAttempt });

        await this.withExecutionClaimHeartbeat(executionClaim.claim.claim_id, async () => {
            try {
                let output: unknown;

                if (node.type === 'tool') {
                    const preToolCtx = this.buildPolicyContext('PRE_TOOL', snapshot, node, inputs.value);
                    const preToolDecision = this.policyEngine.evaluate(preToolCtx);
                    await this.store.attachPolicyDecision(taskId, nodeId, preToolDecision.id);

                    if (preToolDecision.action === 'DENY') {
                        throw new PolicyDenyError(`PRE_TOOL DENY: ${preToolDecision.reason}`);
                    }
                    if (preToolDecision.action === 'DOWNGRADE') {
                        await this.markNodeDowngraded(taskId, node, {
                            input: inputs.value,
                            attempt: nextAttempt,
                            startedAt,
                            reason: preToolDecision.reason || 'Policy requested downgrade',
                        });
                        await this.releaseExecutionClaim(executionClaim.claim.claim_id, 'EXECUTION_COMPLETED');
                        return;
                    }
                    if (preToolDecision.action === 'REQUIRE_APPROVAL' && currentState.trace?.approval_granted !== true) {
                        const prompt = createApprovalPayloadFromPolicy(taskId, node, preToolDecision.reason);
                        await this.store.updateNodeState(taskId, nodeId, {
                            status: 'WAITING_USER',
                            output: prompt,
                            ended_at: now(),
                            trace: nodeTrace,
                        });
                        await this.store.updateTaskState(taskId, {
                            status: 'WAITING_USER',
                            current_wait: {
                                node_id: node.id,
                                type: 'approval',
                                prompt,
                                expires_at: prompt.expires_at,
                            },
                        });
                        await this.emit('task.awaiting_user', taskId, nodeId, { reason: preToolDecision.reason, phase: 'PRE_TOOL' });
                        await this.releaseExecutionClaim(executionClaim.claim.claim_id, 'AWAITING_USER');
                        return;
                    }

                    await this.emit('tool.called', taskId, nodeId, {
                        tool_name: node.name,
                        attempt: nextAttempt,
                        timeout_ms: this.toolTimeoutMs,
                        policy_decision_ids: preToolDecision.id ? [preToolDecision.id] : [],
                    });

                    output = await runToolExecutor({
                        taskId,
                        node,
                        input: inputs.value,
                        timeoutMs: this.toolTimeoutMs,
                        store: this.store,
                        preToolDecision,
                        toolRegistry: this.toolRegistry,
                    });

                    const postToolCtx = this.buildPolicyContext('POST_TOOL', snapshot, node, inputs.value, output);
                    const postToolDecision = this.policyEngine.evaluate(postToolCtx);
                    await this.store.attachPolicyDecision(taskId, nodeId, postToolDecision.id);

                    if (postToolDecision.action === 'DENY') {
                        throw new PolicyDenyError(`POST_TOOL DENY: ${postToolDecision.reason}`);
                    }
                    if (postToolDecision.action === 'REDACT' || postToolDecision.action === 'ALLOW_WITH_LIMITS') {
                        output = sanitizeToolOutput(output, {
                            allowedFields: postToolDecision.constraints?.allowed_fields,
                            maxChars: postToolDecision.constraints?.max_chars,
                        });
                    }
                } else if (node.type === 'llm') {
                    output = await runLlmExecutor(node, inputs.value);
                } else if (node.type === 'approval' || node.type === 'ask_user') {
                    const prompt = runApprovalExecutor(taskId, node, inputs.value);
                    await this.store.updateNodeState(taskId, nodeId, {
                        status: 'WAITING_USER',
                        output: prompt,
                        ended_at: now(),
                        trace: nodeTrace,
                    });
                    await this.store.updateTaskState(taskId, {
                        status: 'WAITING_USER',
                        current_wait: {
                            node_id: node.id,
                            type: prompt.type,
                            prompt,
                            expires_at: prompt.expires_at,
                        },
                    });
                    await this.emit('task.awaiting_user', taskId, nodeId, { reason: 'approval_node' });
                    await this.releaseExecutionClaim(executionClaim.claim.claim_id, 'AWAITING_USER');
                    return;
                } else if (node.type === 'verify') {
                    output = await runVerifyExecutor(node, inputs.value);
                } else if (node.type === 'merge') {
                    output = await runMergeExecutor(node, inputs.value);
                } else {
                    throw new Error(`Unknown node type: ${node.type}`);
                }

                if (node.output_schema?.required?.length) {
                    if (!output || typeof output !== 'object') {
                        throw new VerificationFailure('INVALID_OUTPUT: expected object');
                    }
                    const obj = output as Record<string, unknown>;
                    const missing = node.output_schema.required.filter((field) => !Object.prototype.hasOwnProperty.call(obj, field));
                    if (missing.length > 0) {
                        throw new VerificationFailure(`INVALID_OUTPUT: missing ${missing.join(',')}`);
                    }
                }

                const postNodeCtx = this.buildPolicyContext('POST_NODE', snapshot, node, inputs.value, output);
                const postNodeDecision = this.policyEngine.evaluate(postNodeCtx);
                await this.store.attachPolicyDecision(taskId, nodeId, postNodeDecision.id);

                if (postNodeDecision.action === 'DENY') {
                    throw new PolicyDenyError(`POST_NODE DENY: ${postNodeDecision.reason}`);
                }

                const endedAt = now();
                const currentTaskState = await this.store.getTaskState(taskId);
                const spent = currentTaskState?.budget_spent || {
                    tool_calls: 0,
                    tokens: 0,
                    latency_ms: 0,
                };
                const elapsed = Math.max(0, endedAt - startedAt);
                await this.store.updateNodeState(taskId, nodeId, {
                    status: 'SUCCEEDED',
                    output,
                    ended_at: endedAt,
                    error: undefined,
                    trace: {
                        ...nodeTrace,
                        approval_granted: false,
                        approval_decision: undefined,
                    },
                });
                await this.store.updateTaskState(taskId, {
                    status: 'RUNNING',
                    current_wait: undefined,
                    budget_spent: {
                        tool_calls: spent.tool_calls + (node.type === 'tool' ? 1 : 0),
                        tokens: spent.tokens + (node.type === 'llm' ? Math.ceil(JSON.stringify(output || '').length / 4) : 0),
                        latency_ms: spent.latency_ms + elapsed,
                    },
                });
                await this.maybeRunCompensation(taskId, `${nodeId}_succeed`);
                await this.emit('task.node.succeeded', taskId, nodeId, { latency_ms: elapsed });
                await this.releaseExecutionClaim(executionClaim.claim.claim_id, 'EXECUTION_COMPLETED');
            } catch (error) {
                await this.handleNodeFailure(taskId, nodeId, error, executionClaim.claim.claim_id);
            }
        });
    }

    private async handleNodeFailure(
        taskId: string,
        nodeId: string,
        error: unknown,
        executionClaimId?: string,
    ): Promise<void> {
        const state = await this.store.getNodeState(taskId, nodeId);
        if (!state) return;

        const classified = classifyError(error);
        if (classified.code === 'VERIFICATION_FAILED') {
            await this.emit('verifier.failed', taskId, nodeId, {
                code: classified.code,
                message: classified.message,
                retryable: classified.retryable,
            });
        }
        const compensation = await this.maybeRunCompensation(taskId, `${nodeId}_fail`, nodeId, classified.message);
        if (compensation.requiresUser) {
            await this.emit('task.awaiting_user', taskId, nodeId, {
                reason: compensation.message,
                source: 'compensation',
            });
            await this.releaseExecutionClaim(executionClaimId, 'AWAITING_USER');
            return;
        }

        if (classified.kind === 'NEEDS_USER') {
            const prompt = runApprovalExecutor(taskId, {
                id: nodeId,
                type: 'ask_user',
                name: 'ask_user',
            }, {
                summary: classified.userPrompt,
                options: [
                    { id: 'provide', label: 'Provide details' },
                    { id: 'cancel', label: 'Cancel' },
                ],
            });
            await this.store.updateNodeState(taskId, nodeId, {
                status: 'WAITING_USER',
                error: {
                    code: 'NEEDS_USER_INPUT',
                    message: classified.message,
                    retryable: false,
                },
                output: prompt,
                ended_at: now(),
                trace: state.trace,
            });
            await this.store.updateTaskState(taskId, {
                status: 'WAITING_USER',
                current_wait: {
                    node_id: nodeId,
                    type: 'ask_user',
                    prompt,
                    expires_at: prompt.expires_at,
                },
            });
            await this.emit('task.awaiting_user', taskId, nodeId, { reason: classified.message });
            await this.releaseExecutionClaim(executionClaimId, 'AWAITING_USER');
            return;
        }

        const taskGraph = await this.store.getTaskGraph(taskId);
        const retryPolicy = taskGraph
            ? this.defaultRetryPolicy(taskGraph)
            : this.defaultRetryPolicy({
                task_id: taskId,
                goal: '',
                nodes: [],
                edges: [],
            });
        const node = taskGraph?.nodes.find((item) => item.id === nodeId);
        const idempotencyKey = node ? resolveNodeIdempotencyKey(taskId, node, state.input) : undefined;

        const retriesUsed = Math.max(0, state.attempt - 1);
        const canRetry = classified.retryable && retriesUsed < retryPolicy.max_retries;
        const endedAt = now();

        await this.store.updateNodeState(taskId, nodeId, {
            status: 'FAILED',
            ended_at: endedAt,
            error: {
                code: classified.code,
                message: classified.message,
                retryable: canRetry,
            },
            trace: state.trace,
        });

        await this.emit('task.node.failed', taskId, nodeId, {
            code: classified.code,
            retryable: canRetry,
            message: classified.message,
        });

        if (canRetry) {
            const delay = backoff(retryPolicy, state.attempt || 1);
            const retryJob = await this.executionSubstrate.scheduleRetryJob({
                taskId,
                nodeId,
                targetAttempt: state.attempt + 1,
                maxRetries: retryPolicy.max_retries,
                scheduledAt: endedAt,
                availableAt: endedAt + delay,
                errorCode: classified.code,
                errorMessage: classified.message,
                idempotencyKey,
                correlationId: state.trace?.correlation_id,
                runId: state.trace?.run_id,
            });
            await this.emit('task.retry.scheduled', taskId, nodeId, {
                job_id: retryJob.job_id,
                attempt: retryJob.attempt,
                available_at: retryJob.available_at,
                error_code: classified.code,
                idempotency_key: retryJob.idempotency_key,
            });
            await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'retry_scheduled');
            await this.releaseExecutionClaim(executionClaimId, 'RETRY_SCHEDULED');
            this.enqueueRunTask(taskId, Math.max(0, retryJob.available_at - now()));
            return;
        }

        if (classified.retryable && retryPolicy.dead_letter_after_max_retries !== false) {
            const relatedRetryJob = (await this.executionSubstrate.listRetryJobs(taskId))
                .find((job) => job.node_id === nodeId && job.attempt === state.attempt);
            const deadLetter = await this.executionSubstrate.recordDeadLetter({
                taskId,
                nodeId,
                attempt: state.attempt,
                maxRetries: retryPolicy.max_retries,
                errorCode: classified.code,
                errorMessage: classified.message,
                idempotencyKey,
                retryJobId: relatedRetryJob?.job_id,
                correlationId: state.trace?.correlation_id,
                runId: state.trace?.run_id,
            });
            await this.emit('task.dead_lettered', taskId, nodeId, {
                dead_letter_id: deadLetter.dead_letter_id,
                attempt: deadLetter.attempt,
                max_retries: deadLetter.max_retries,
                error_code: deadLetter.error_code,
                idempotency_key: deadLetter.idempotency_key,
            });
            await this.executionLedger.recordExecutionSubstrateUpdate(taskId, 'dead_lettered');
            await this.releaseExecutionClaim(executionClaimId, 'DEAD_LETTERED');
        } else {
            await this.releaseExecutionClaim(executionClaimId, 'EXECUTION_FAILED');
        }

        await this.reconcileTaskTerminalState(taskId);
    }

    private async maybeRunCompensation(
        taskId: string,
        trigger: `${string}_fail` | `${string}_succeed` | 'task_cancelled',
        nodeId?: string,
        reason?: string
    ): Promise<{
        requiresUser: boolean;
        message?: string;
    }> {
        const graph = await this.store.getTaskGraph(taskId);
        if (!graph?.compensation?.length) {
            return { requiresUser: false };
        }

        const matched = graph.compensation.filter((rule) => rule.on === trigger);
        if (!matched.length) {
            return { requiresUser: false };
        }

        const nodeState = nodeId ? await this.store.getNodeState(taskId, nodeId) : undefined;
        let requiresUser = false;
        let lastMessage: string | undefined;

        for (const rule of matched) {
            await this.emit('task.compensation.triggered', taskId, nodeId, {
                trigger,
                action: rule.do,
                reason,
            });

            const result = await this.compensationRegistry.execute({
                task_id: taskId,
                node_id: nodeId,
                trigger,
                reason,
                action: rule.do,
                graph,
                node_state: nodeState,
            });
            lastMessage = result.message;

            await this.emit('task.compensation.result', taskId, nodeId, {
                trigger,
                action: rule.do,
                disposition: result.disposition,
                message: result.message,
                requires_user: result.requires_user === true,
            });

            if (result.disposition === 'IRREVERSIBLE') {
                await this.emit('task.compensation.irreversible', taskId, nodeId, {
                    trigger,
                    action: rule.do,
                    reason: result.message,
                });
            }

            if (result.requires_user && nodeId) {
                const prompt = toApprovalPayload(
                    taskId,
                    nodeId,
                    result.user_prompt || {
                        summary: result.message,
                    }
                );
                await this.store.updateNodeState(taskId, nodeId, {
                    status: 'WAITING_USER',
                    output: prompt,
                    ended_at: now(),
                    error: {
                        code: 'NEEDS_USER_INPUT',
                        message: result.message,
                        retryable: false,
                    },
                });
                await this.store.updateTaskState(taskId, {
                    status: 'WAITING_USER',
                    current_wait: {
                        node_id: nodeId,
                        type: 'ask_user',
                        prompt,
                        expires_at: prompt.expires_at,
                    },
                });
                requiresUser = true;
            }
        }

        return {
            requiresUser,
            message: lastMessage,
        };
    }

    private async reconcileTaskTerminalState(taskId: string): Promise<void> {
        const snapshot = await this.store.getTaskSnapshot(taskId);
        if (!snapshot) return;

        const statuses = snapshot.node_states.map((node) => node.status);
        const hasPendingRetryJobs = await this.executionSubstrate.hasPendingRetryJobs(taskId);
        const hasActiveExecutionClaims = await this.executionSubstrate.hasActiveExecutionClaims(taskId);
        const hasRetryableFailed = snapshot.node_states.some(
            (node) => node.status === 'FAILED' && node.error?.retryable === true
        );
        const hasWaiting = statuses.includes('WAITING_USER');
        if (hasWaiting) {
            await this.store.updateTaskState(taskId, { status: 'WAITING_USER' });
            return;
        }

        const hasPendingOrRunning = statuses.some((status) => status === 'PENDING' || status === 'RUNNING');
        if (hasPendingOrRunning || hasRetryableFailed || hasPendingRetryJobs || hasActiveExecutionClaims) {
            await this.store.updateTaskState(taskId, { status: 'RUNNING' });
            return;
        }

        const hasFailed = statuses.includes('FAILED');
        const hasSucceeded = statuses.includes('SUCCEEDED');
        if (hasFailed && !hasSucceeded) {
            await this.store.updateTaskState(taskId, { status: 'FAILED' });
            await this.emit('task.failed', taskId, undefined, { reason: 'all_paths_failed' });
            return;
        }

        const output: Record<string, unknown> = {};
        for (const nodeState of snapshot.node_states) {
            if (nodeState.status === 'SUCCEEDED') {
                output[nodeState.node_id] = nodeState.output;
            }
        }

        const responseDecision = this.policyEngine.evaluate({
            phase: 'PRE_RESPONSE',
            intent: {
                goal: snapshot.graph.goal,
                type: 'multi_step_task',
            },
            user: snapshot.graph.context?.user,
            permissions: snapshot.graph.context?.permissions,
            data: snapshot.graph.context?.data,
            output,
            task_id: taskId,
        });

        if (responseDecision.action === 'DENY') {
            await this.store.updateTaskState(taskId, {
                status: 'FAILED',
            });
            await this.emit('policy.denied', taskId, undefined, {
                reason: responseDecision.reason,
                phase: 'PRE_RESPONSE',
            });
            return;
        }

        await this.store.updateTaskState(taskId, {
            status: hasFailed ? 'FAILED' : 'DONE',
            current_wait: undefined,
        });
        await this.emit(hasFailed ? 'task.failed' : 'task.done', taskId, undefined, {
            partial_failure: hasFailed,
        });
    }
}

let runtimeSingleton: TaskGraphRuntime | null = null;

export function getTaskGraphRuntime(): TaskGraphRuntime {
    if (!runtimeSingleton) {
        runtimeSingleton = new TaskGraphRuntime();
    }
    return runtimeSingleton;
}

export function resetTaskGraphRuntimeForTests(): void {
    runtimeSingleton?.stopWorkerPoolPolling();
    runtimeSingleton = null;
}

export function setTaskGraphRuntimeForTests(runtime: TaskGraphRuntime): void {
    runtimeSingleton?.stopWorkerPoolPolling();
    runtimeSingleton = runtime;
}

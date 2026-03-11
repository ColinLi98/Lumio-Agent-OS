import type {
    ClaimExecutionUnitParams,
    ClaimExecutionUnitResult,
    DeadLetterRecord,
    ExecutionWorkerPoolPort,
    HeartbeatExecutionClaimResult,
    NodeDef,
    ReleaseExecutionClaimParams,
    ReleaseExecutionClaimResult,
    RemoteRunnerControlPort,
    RemoteRunnerControlRequest,
    RemoteRunnerControlResult,
    RetryJobRecord,
    RetryJobStatus,
    ServiceActionAuthorizationInput,
    ServiceActionAuthorizerPort,
    ServiceAuthAction,
    ServiceAuthAuditRecord,
    ServiceAuthAuditRecorderPort,
    ServiceAuthContext,
    ServiceAuthDecision,
    ServiceAuthDecisionOutcome,
    ServicePrincipalIdentity,
    StaleClaimRecoveryResult,
    TaskClaimRecord,
    TaskExecutionSubstrateSummary,
    TaskExecutionTimeoutRecord,
    TaskExecutionUnit,
    TaskExecutionUnitStatus,
    TaskExecutionMode,
    WorkerIdentity,
    WorkerPoolRecord,
    WorkerSessionRecord,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { computeIdempotencyKey, hashText } from './utils.js';

const ACTIVE_RETRY_JOB_STATUSES: ReadonlySet<RetryJobStatus> = new Set([
    'SCHEDULED',
    'REQUEUED',
]);
const ALL_SERVICE_AUTH_ACTIONS: ServiceAuthAction[] = [
    'CLAIM_EXECUTION',
    'HEARTBEAT_EXECUTION',
    'RELEASE_EXECUTION',
    'RECOVER_STALE_CLAIMS',
    'REQUEST_REMOTE_RUNNER',
];
const DEFAULT_SERVICE_AUTH_TTL_MS = 12 * 60 * 60 * 1000;

function now(): number {
    return Date.now();
}

function retryJobIdFor(dedupeKey: string): string {
    return `retry_${hashText(dedupeKey).slice(0, 16)}`;
}

function deadLetterIdFor(dedupeKey: string): string {
    return `dlq_${hashText(dedupeKey).slice(0, 16)}`;
}

function executionUnitIdFor(dedupeKey: string): string {
    return `exec_${hashText(dedupeKey).slice(0, 16)}`;
}

function claimIdFor(executionUnitId: string, workerId: string, claimedAt: number): string {
    return `claim_${hashText(`${executionUnitId}:${workerId}:${claimedAt}`).slice(0, 16)}`;
}

function sessionIdFor(taskId: string, workerId: string): string {
    return `ws_${hashText(`${taskId}:${workerId}`).slice(0, 16)}`;
}

function timeoutIdFor(claimId: string, timedOutAt: number): string {
    return `timeout_${hashText(`${claimId}:${timedOutAt}`).slice(0, 16)}`;
}

function serviceAuthDecisionIdFor(params: {
    action: ServiceAuthAction;
    taskId: string;
    claimId?: string;
    executionUnitId?: string;
    nodeId?: string;
    workerId?: string;
    decidedAt: number;
}): string {
    return `svc_auth_${hashText([
        params.action,
        params.taskId,
        params.claimId || '',
        params.executionUnitId || '',
        params.nodeId || '',
        params.workerId || '',
        String(params.decidedAt),
    ].join(':')).slice(0, 16)}`;
}

function serviceAuthDecision(
    outcome: ServiceAuthDecisionOutcome,
    input: ServiceActionAuthorizationInput,
    params: {
        decidedAt?: number;
        reason?: string;
        breakGlassUsed?: boolean;
    } = {}
): ServiceAuthDecision {
    const decidedAt = params.decidedAt ?? now();
    return {
        decision_id: serviceAuthDecisionIdFor({
            action: input.action,
            taskId: input.task_id,
            claimId: input.claim_id,
            executionUnitId: input.execution_unit_id,
            nodeId: input.node_id,
            workerId: input.worker_id,
            decidedAt,
        }),
        action: input.action,
        outcome,
        decided_at: decidedAt,
        reason: params.reason,
        auth_mode: input.service_auth_context?.auth_mode,
        principal: input.service_auth_context?.principal,
        break_glass_used: params.breakGlassUsed,
    };
}

export function createDefaultServicePrincipal(
    workerId: string,
    workerPoolId: string,
): ServicePrincipalIdentity {
    return {
        principal_id: `svc_worker_${workerId}`,
        principal_type: 'WORKER_SERVICE',
        display_name: 'Local First Runtime Worker',
        allowed_actions: [...ALL_SERVICE_AUTH_ACTIONS],
        bound_worker_id: workerId,
        bound_pool_id: workerPoolId,
        issued_by: 'agent_kernel_runtime',
    };
}

export function createDefaultServiceAuthContext(
    workerId: string,
    workerPoolId: string,
    issuedAt = now(),
): ServiceAuthContext {
    return {
        auth_context_id: `svc_ctx_${hashText(`${workerId}:${workerPoolId}:${issuedAt}`).slice(0, 16)}`,
        auth_mode: 'STANDARD',
        issued_at: issuedAt,
        expires_at: issuedAt + DEFAULT_SERVICE_AUTH_TTL_MS,
        principal: createDefaultServicePrincipal(workerId, workerPoolId),
    };
}

export class DefaultServiceActionAuthorizer implements ServiceActionAuthorizerPort {
    async authorize(input: ServiceActionAuthorizationInput): Promise<ServiceAuthDecision> {
        const decidedAt = now();
        const context = input.service_auth_context;
        if (!context) {
            return serviceAuthDecision('DENIED', input, {
                decidedAt,
                reason: 'missing_service_auth_context',
            });
        }

        const principal = context.principal;
        if (!principal?.principal_id) {
            return serviceAuthDecision('DENIED', input, {
                decidedAt,
                reason: 'missing_service_principal',
            });
        }

        if (context.issued_at > decidedAt || context.expires_at <= decidedAt) {
            return serviceAuthDecision('DENIED', input, {
                decidedAt,
                reason: 'service_auth_context_expired',
            });
        }

        if (principal.bound_worker_id && input.worker_id && principal.bound_worker_id !== input.worker_id) {
            return serviceAuthDecision('DENIED', input, {
                decidedAt,
                reason: 'service_auth_worker_binding_mismatch',
            });
        }

        if (principal.bound_pool_id && input.worker_pool_id && principal.bound_pool_id !== input.worker_pool_id) {
            return serviceAuthDecision('DENIED', input, {
                decidedAt,
                reason: 'service_auth_pool_binding_mismatch',
            });
        }

        if (context.auth_mode === 'BREAK_GLASS') {
            const hasApproval = Boolean(context.break_glass_approved_by);
            const notExpired = typeof context.break_glass_expires_at === 'number'
                && context.break_glass_expires_at > decidedAt;
            const hasJustification = Boolean(String(context.justification || '').trim());
            if (!hasApproval || !notExpired || !hasJustification) {
                return serviceAuthDecision('DENIED', input, {
                    decidedAt,
                    reason: 'invalid_break_glass_context',
                });
            }
            return serviceAuthDecision('ALLOWED', input, {
                decidedAt,
                reason: 'break_glass_override',
                breakGlassUsed: true,
            });
        }

        if (!principal.allowed_actions.includes(input.action)) {
            return serviceAuthDecision('DENIED', input, {
                decidedAt,
                reason: 'service_auth_scope_denied',
            });
        }

        return serviceAuthDecision('ALLOWED', input, {
            decidedAt,
        });
    }
}

export function isRetryJobActive(status: RetryJobStatus): boolean {
    return ACTIVE_RETRY_JOB_STATUSES.has(status);
}

export function resolveNodeIdempotencyKey(taskId: string, node: NodeDef, input: unknown): string | undefined {
    if (node.type !== 'tool') return undefined;
    if (node.idempotent === true || node.idempotency_key || node.metadata?.idempotent === true) {
        return node.idempotency_key || computeIdempotencyKey(taskId, node.id, input);
    }
    return undefined;
}

export interface ScheduleRetryJobParams {
    taskId: string;
    nodeId: string;
    correlationId?: string;
    runId?: string;
    targetAttempt: number;
    maxRetries: number;
    scheduledAt: number;
    availableAt: number;
    errorCode?: string;
    errorMessage?: string;
    idempotencyKey?: string;
}

export interface RecordDeadLetterParams {
    taskId: string;
    nodeId: string;
    correlationId?: string;
    runId?: string;
    attempt: number;
    maxRetries: number;
    errorCode?: string;
    errorMessage?: string;
    idempotencyKey?: string;
    retryJobId?: string;
}

function isActiveExecutionUnitStatus(status: TaskExecutionUnitStatus): boolean {
    return status === 'RUNNABLE' || status === 'CLAIMED';
}

function isClaimActive(claim: TaskClaimRecord, atMs = now()): boolean {
    return claim.status === 'ACTIVE' && claim.lease_expires_at > atMs;
}

function summarizeRemoteRunnerResult(
    claim: TaskClaimRecord,
    executionUnit: TaskExecutionUnit,
): RemoteRunnerControlResult | undefined {
    if (!claim.remote_request_id || !claim.remote_result_status) return undefined;
    return {
        request_id: claim.remote_request_id,
        execution_unit_id: executionUnit.execution_unit_id,
        task_id: claim.task_id,
        node_id: claim.node_id,
        correlation_id: claim.correlation_id,
        run_id: claim.run_id,
        status: claim.remote_result_status,
        execution_mode: claim.execution_mode,
        runner_type: claim.runner_type,
        detail: claim.remote_result_detail,
        service_auth_decision_id: claim.last_service_auth_decision_id,
        handled_at: claim.updated_at,
    };
}

export class NoopRemoteRunnerControlPort implements RemoteRunnerControlPort {
    async requestExecution(request: RemoteRunnerControlRequest): Promise<RemoteRunnerControlResult> {
        const handledAt = now();
        return {
            request_id: request.request_id,
            execution_unit_id: request.execution_unit_id,
            task_id: request.task_id,
            node_id: request.node_id,
            correlation_id: request.correlation_id,
            run_id: request.run_id,
            status: 'LOCAL_FALLBACK',
            execution_mode: 'LOCAL_FALLBACK',
            runner_type: 'LOCAL_FALLBACK',
            detail: 'remote_runner_unconfigured',
            service_auth_decision_id: request.service_auth_decision_id,
            handled_at: handledAt,
        };
    }
}

export interface LocalFirstExecutionSubstrateOptions {
    serviceActionAuthorizer?: ServiceActionAuthorizerPort;
    defaultServiceAuthContext?: ServiceAuthContext;
}

export class LocalFirstExecutionSubstrate implements ExecutionWorkerPoolPort {
    private readonly workerIdentity: WorkerIdentity;
    private readonly workerPool: WorkerPoolRecord;
    private readonly serviceActionAuthorizer: ServiceActionAuthorizerPort;
    private readonly defaultServiceAuthContext: ServiceAuthContext;
    private serviceAuthAuditRecorder?: ServiceAuthAuditRecorderPort;

    constructor(
        private readonly store: TaskStore,
        private readonly remoteRunnerControl: RemoteRunnerControlPort = new NoopRemoteRunnerControlPort(),
        options: LocalFirstExecutionSubstrateOptions = {},
    ) {
        const timestamp = now();
        const workerSuffix = hashText(`${process.pid}:${Date.now()}:${Math.random()}`).slice(0, 16);
        const workerId = `local_worker_${workerSuffix}`;
        this.workerIdentity = {
            worker_id: workerId,
            worker_type: 'LOCAL_RUNTIME',
            runner_type: 'LOCAL_FALLBACK',
            execution_mode: 'LOCAL_FIRST',
            local_first: true,
            service_principal: options.defaultServiceAuthContext?.principal
                || createDefaultServicePrincipal(workerId, 'worker_pool_local_first'),
            service_auth_context_id: options.defaultServiceAuthContext?.auth_context_id
                || createDefaultServiceAuthContext(workerId, 'worker_pool_local_first', timestamp).auth_context_id,
            service_auth_mode: options.defaultServiceAuthContext?.auth_mode || 'STANDARD',
            service_auth_expires_at: options.defaultServiceAuthContext?.expires_at
                || (timestamp + DEFAULT_SERVICE_AUTH_TTL_MS),
        };
        this.workerPool = {
            pool_id: 'worker_pool_local_first',
            pool_name: 'local_first_runtime_pool',
            runner_type: 'LOCAL_FALLBACK',
            execution_mode: 'LOCAL_FIRST',
            local_first: true,
            enabled: true,
            max_concurrency: 1,
            created_at: now(),
            updated_at: now(),
        };
        this.defaultServiceAuthContext = options.defaultServiceAuthContext
            || createDefaultServiceAuthContext(workerId, this.workerPool.pool_id, timestamp);
        this.workerIdentity.service_principal = this.defaultServiceAuthContext.principal;
        this.workerIdentity.service_auth_context_id = this.defaultServiceAuthContext.auth_context_id;
        this.workerIdentity.service_auth_mode = this.defaultServiceAuthContext.auth_mode;
        this.workerIdentity.service_auth_expires_at = this.defaultServiceAuthContext.expires_at;
        this.serviceActionAuthorizer = options.serviceActionAuthorizer || new DefaultServiceActionAuthorizer();
    }

    setServiceAuthAuditRecorder(recorder: ServiceAuthAuditRecorderPort): void {
        this.serviceAuthAuditRecorder = recorder;
    }

    private executionUnitDedupeKey(taskId: string, nodeId: string, targetAttempt: number): string {
        return `execution-unit:${taskId}:${nodeId}:attempt:${targetAttempt}`;
    }

    private sessionId(taskId: string): string {
        return sessionIdFor(taskId, this.workerIdentity.worker_id);
    }

    private async ensureWorkerSession(
        taskId: string,
        params: {
            correlationId?: string;
            runId?: string;
            status?: WorkerSessionRecord['status'];
            claimedAt?: number;
            releasedAt?: number;
            leaseExpiresAt?: number;
            lastHeartbeatAt?: number;
            executionMode?: TaskExecutionMode;
            runnerType?: WorkerSessionRecord['runner_type'];
            serviceAuthContext?: ServiceAuthContext;
            lastServiceAuthAction?: ServiceAuthAction;
            lastServiceAuthDecisionId?: string;
            lastServiceAuthOutcome?: ServiceAuthDecisionOutcome;
        } = {}
    ): Promise<WorkerSessionRecord> {
        const sessionId = this.sessionId(taskId);
        const existing = await this.store.getWorkerSession(sessionId);
        const timestamp = now();
        const next: WorkerSessionRecord = {
            session_id: sessionId,
            task_id: taskId,
            worker_id: this.workerIdentity.worker_id,
            correlation_id: params.correlationId ?? existing?.correlation_id,
            run_id: params.runId ?? existing?.run_id,
            worker_type: this.workerIdentity.worker_type,
            runner_type: params.runnerType || existing?.runner_type || this.workerIdentity.runner_type,
            execution_mode: params.executionMode || existing?.execution_mode || this.workerIdentity.execution_mode,
            status: params.status || existing?.status || 'ACTIVE',
            claimed_at: params.claimedAt ?? existing?.claimed_at,
            released_at: params.releasedAt ?? existing?.released_at,
            lease_expires_at: params.leaseExpiresAt ?? existing?.lease_expires_at,
            last_heartbeat_at: params.lastHeartbeatAt ?? existing?.last_heartbeat_at,
            service_auth_context: params.serviceAuthContext ?? existing?.service_auth_context,
            last_service_auth_action: params.lastServiceAuthAction ?? existing?.last_service_auth_action,
            last_service_auth_decision_id: params.lastServiceAuthDecisionId ?? existing?.last_service_auth_decision_id,
            last_service_auth_outcome: params.lastServiceAuthOutcome ?? existing?.last_service_auth_outcome,
            created_at: existing?.created_at || timestamp,
            updated_at: timestamp,
        };
        await this.store.upsertWorkerSession(next);
        return next;
    }

    private resolveServiceAuthContext(serviceAuthContext?: ServiceAuthContext): ServiceAuthContext {
        return serviceAuthContext || this.defaultServiceAuthContext;
    }

    private async authorizeAction(input: ServiceActionAuthorizationInput): Promise<{
        decision: ServiceAuthDecision;
        service_auth_context: ServiceAuthContext;
    }> {
        const serviceAuthContext = this.resolveServiceAuthContext(input.service_auth_context);
        const decision = await this.serviceActionAuthorizer.authorize({
            ...input,
            worker_pool_id: input.worker_pool_id || this.workerPool.pool_id,
            service_auth_context: serviceAuthContext,
        });
        if (this.serviceAuthAuditRecorder) {
            const auditRecord: ServiceAuthAuditRecord = {
                task_id: input.task_id,
                node_id: input.node_id,
                claim_id: input.claim_id,
                execution_unit_id: input.execution_unit_id,
                session_id: input.session_id,
                worker_id: input.worker_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                decision,
                service_auth_context: serviceAuthContext,
            };
            await this.serviceAuthAuditRecorder.recordServiceAuthDecision(auditRecord);
        }
        return {
            decision,
            service_auth_context: serviceAuthContext,
        };
    }

    async scheduleRetryJob(params: ScheduleRetryJobParams): Promise<RetryJobRecord> {
        const dedupeKey = `retry:${params.taskId}:${params.nodeId}:attempt:${params.targetAttempt}`;
        const timestamp = now();
        const retryJob: RetryJobRecord = {
            job_id: retryJobIdFor(dedupeKey),
            dedupe_key: dedupeKey,
            task_id: params.taskId,
            node_id: params.nodeId,
            correlation_id: params.correlationId,
            run_id: params.runId,
            status: 'SCHEDULED',
            attempt: params.targetAttempt,
            max_retries: params.maxRetries,
            scheduled_at: params.scheduledAt,
            available_at: params.availableAt,
            last_error_code: params.errorCode,
            last_error_message: params.errorMessage,
            idempotency_key: params.idempotencyKey,
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.store.upsertRetryJob(retryJob);
        return retryJob;
    }

    async listRetryJobs(taskId: string): Promise<RetryJobRecord[]> {
        return this.store.listRetryJobs(taskId);
    }

    async listPendingRetryJobs(taskId: string): Promise<RetryJobRecord[]> {
        const jobs = await this.store.listRetryJobs(taskId);
        return jobs.filter((job) => isRetryJobActive(job.status));
    }

    async getDueRetryJobs(taskId: string, atMs = now()): Promise<RetryJobRecord[]> {
        const jobs = await this.listPendingRetryJobs(taskId);
        return jobs.filter((job) => job.status === 'SCHEDULED' && job.available_at <= atMs);
    }

    async markRetryJobStatus(jobId: string, status: RetryJobStatus, updatedAt = now()): Promise<RetryJobRecord | undefined> {
        return this.store.updateRetryJob(jobId, {
            status,
            updated_at: updatedAt,
        });
    }

    async markRetryJobCompleted(taskId: string, nodeId: string, targetAttempt: number): Promise<boolean> {
        const jobs = await this.store.listRetryJobs(taskId);
        const match = jobs.find((job) =>
            job.node_id === nodeId
            && job.attempt === targetAttempt
            && isRetryJobActive(job.status)
        );
        if (!match) return false;
        await this.markRetryJobStatus(match.job_id, 'COMPLETED');
        return true;
    }

    async cancelPendingRetryJobs(taskId: string): Promise<void> {
        const jobs = await this.listPendingRetryJobs(taskId);
        await Promise.all(jobs.map((job) => this.markRetryJobStatus(job.job_id, 'CANCELLED')));
    }

    async recordDeadLetter(params: RecordDeadLetterParams): Promise<DeadLetterRecord> {
        const dedupeKey = `dead-letter:${params.taskId}:${params.nodeId}:attempt:${params.attempt}`;
        const timestamp = now();
        const deadLetter: DeadLetterRecord = {
            dead_letter_id: deadLetterIdFor(dedupeKey),
            dedupe_key: dedupeKey,
            task_id: params.taskId,
            node_id: params.nodeId,
            correlation_id: params.correlationId,
            run_id: params.runId,
            status: 'OPEN',
            attempt: params.attempt,
            max_retries: params.maxRetries,
            error_code: params.errorCode,
            error_message: params.errorMessage,
            idempotency_key: params.idempotencyKey,
            retry_job_id: params.retryJobId,
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.store.upsertDeadLetter(deadLetter);
        return deadLetter;
    }

    async listDeadLetters(taskId: string): Promise<DeadLetterRecord[]> {
        return this.store.listDeadLetters(taskId);
    }

    async ensureExecutionUnit(params: {
        task_id: string;
        node_id: string;
        correlation_id?: string;
        run_id?: string;
        target_attempt: number;
        available_at: number;
        desired_execution_mode?: TaskExecutionMode;
        runner_type?: TaskExecutionUnit['runner_type'];
    }): Promise<{
        execution_unit: TaskExecutionUnit;
        created: boolean;
    }> {
        const dedupeKey = this.executionUnitDedupeKey(params.task_id, params.node_id, params.target_attempt);
        const existing = (await this.store.listExecutionUnits(params.task_id))
            .find((unit) => unit.dedupe_key === dedupeKey);
        if (existing) {
            if (!isActiveExecutionUnitStatus(existing.status) && existing.status !== 'TIMED_OUT') {
                return { execution_unit: existing, created: false };
            }
            return { execution_unit: existing, created: false };
        }

        const timestamp = now();
        const executionUnit: TaskExecutionUnit = {
            execution_unit_id: executionUnitIdFor(dedupeKey),
            dedupe_key: dedupeKey,
            task_id: params.task_id,
            node_id: params.node_id,
            correlation_id: params.correlation_id,
            run_id: params.run_id,
            target_attempt: params.target_attempt,
            status: 'RUNNABLE',
            desired_execution_mode: params.desired_execution_mode || 'REMOTE_PREFERRED',
            runner_type: params.runner_type || 'REMOTE_CONTROL_PLANE',
            available_at: params.available_at,
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.store.upsertExecutionUnit(executionUnit);
        return {
            execution_unit: executionUnit,
            created: true,
        };
    }

    async claimExecutionUnit(params: ClaimExecutionUnitParams): Promise<ClaimExecutionUnitResult | undefined> {
        const authorization = await this.authorizeAction({
            action: 'CLAIM_EXECUTION',
            task_id: params.task_id,
            node_id: params.node_id,
            worker_id: this.workerIdentity.worker_id,
            correlation_id: params.correlation_id,
            run_id: params.run_id,
            service_auth_context: params.service_auth_context,
        });
        if (authorization.decision.outcome === 'DENIED') return undefined;

        const { execution_unit, created } = await this.ensureExecutionUnit({
            task_id: params.task_id,
            node_id: params.node_id,
            correlation_id: params.correlation_id,
            run_id: params.run_id,
            target_attempt: params.target_attempt,
            available_at: now(),
        });

        if (execution_unit.status === 'CLAIMED' && execution_unit.claim_id) {
            const activeClaim = await this.store.getExecutionClaim(execution_unit.claim_id);
            if (activeClaim && isClaimActive(activeClaim)) {
                return undefined;
            }
        }

        if (execution_unit.status === 'COMPLETED' || execution_unit.status === 'CANCELLED') {
            return undefined;
        }

        const claimedAt = now();
        const leaseExpiresAt = claimedAt + Math.max(1000, params.lease_ttl_ms);
        const claimId = claimIdFor(execution_unit.execution_unit_id, this.workerIdentity.worker_id, claimedAt);
        const claim: TaskClaimRecord = {
            claim_id: claimId,
            execution_unit_id: execution_unit.execution_unit_id,
            task_id: params.task_id,
            node_id: params.node_id,
            worker_id: this.workerIdentity.worker_id,
            correlation_id: params.correlation_id || execution_unit.correlation_id,
            run_id: params.run_id || execution_unit.run_id,
            worker_type: this.workerIdentity.worker_type,
            session_id: this.sessionId(params.task_id),
            status: 'ACTIVE',
            execution_mode: execution_unit.desired_execution_mode,
            runner_type: execution_unit.runner_type,
            claimed_at: claimedAt,
            lease_expires_at: leaseExpiresAt,
            last_heartbeat_at: claimedAt,
            service_auth_context: authorization.service_auth_context,
            last_service_auth_action: authorization.decision.action,
            last_service_auth_decision_id: authorization.decision.decision_id,
            last_service_auth_outcome: authorization.decision.outcome,
            created_at: claimedAt,
            updated_at: claimedAt,
        };
        await this.store.upsertExecutionClaim(claim);

        const claimedUnit: TaskExecutionUnit = {
            ...execution_unit,
            status: 'CLAIMED',
            claim_id: claim.claim_id,
            claimed_by_worker_id: claim.worker_id,
            claimed_by_session_id: claim.session_id,
            claimed_at: claim.claimed_at,
            lease_expires_at: claim.lease_expires_at,
            last_heartbeat_at: claim.last_heartbeat_at,
            updated_at: claimedAt,
        };
        await this.store.upsertExecutionUnit(claimedUnit);

        const workerSession = await this.ensureWorkerSession(params.task_id, {
            status: 'ACTIVE',
            claimedAt,
            leaseExpiresAt,
            lastHeartbeatAt: claimedAt,
            correlationId: claim.correlation_id,
            runId: claim.run_id,
            executionMode: claim.execution_mode,
            runnerType: claim.runner_type,
            serviceAuthContext: authorization.service_auth_context,
            lastServiceAuthAction: authorization.decision.action,
            lastServiceAuthDecisionId: authorization.decision.decision_id,
            lastServiceAuthOutcome: authorization.decision.outcome,
        });

        return {
            execution_unit: claimedUnit,
            claim,
            worker_session: workerSession,
            created_execution_unit: created,
        };
    }

    async heartbeatClaim(
        claimId: string,
        leaseTtlMs: number,
        serviceAuthContext?: ServiceAuthContext,
    ): Promise<HeartbeatExecutionClaimResult | undefined> {
        const claim = await this.store.getExecutionClaim(claimId);
        if (!claim || claim.status !== 'ACTIVE') return undefined;
        const executionUnit = await this.store.getExecutionUnit(claim.execution_unit_id);
        if (!executionUnit) return undefined;
        const authorization = await this.authorizeAction({
            action: 'HEARTBEAT_EXECUTION',
            task_id: claim.task_id,
            node_id: claim.node_id,
            claim_id: claim.claim_id,
            execution_unit_id: claim.execution_unit_id,
            session_id: claim.session_id,
            worker_id: claim.worker_id,
            correlation_id: claim.correlation_id,
            run_id: claim.run_id,
            service_auth_context: serviceAuthContext,
        });
        if (authorization.decision.outcome === 'DENIED') return undefined;

        const heartbeatAt = now();
        const leaseExpiresAt = heartbeatAt + Math.max(1000, leaseTtlMs);
        const nextClaim = await this.store.updateExecutionClaim(claimId, {
            last_heartbeat_at: heartbeatAt,
            lease_expires_at: leaseExpiresAt,
            service_auth_context: authorization.service_auth_context,
            last_service_auth_action: authorization.decision.action,
            last_service_auth_decision_id: authorization.decision.decision_id,
            last_service_auth_outcome: authorization.decision.outcome,
            updated_at: heartbeatAt,
        });
        const nextUnit = await this.store.updateExecutionUnit(executionUnit.execution_unit_id, {
            last_heartbeat_at: heartbeatAt,
            lease_expires_at: leaseExpiresAt,
            updated_at: heartbeatAt,
        });
        const workerSession = await this.store.updateWorkerSession(claim.session_id, {
            status: 'ACTIVE',
            correlation_id: claim.correlation_id,
            run_id: claim.run_id,
            execution_mode: claim.execution_mode,
            runner_type: claim.runner_type,
            lease_expires_at: leaseExpiresAt,
            last_heartbeat_at: heartbeatAt,
            service_auth_context: authorization.service_auth_context,
            last_service_auth_action: authorization.decision.action,
            last_service_auth_decision_id: authorization.decision.decision_id,
            last_service_auth_outcome: authorization.decision.outcome,
            updated_at: heartbeatAt,
        });

        if (!nextClaim || !nextUnit) return undefined;

        return {
            claim: nextClaim,
            execution_unit: nextUnit,
            worker_session: workerSession,
            heartbeat: {
                claim_id: nextClaim.claim_id,
                execution_unit_id: nextUnit.execution_unit_id,
                task_id: nextClaim.task_id,
                node_id: nextClaim.node_id,
                worker_id: nextClaim.worker_id,
                correlation_id: nextClaim.correlation_id,
                run_id: nextClaim.run_id,
                heartbeat_at: heartbeatAt,
                lease_expires_at: leaseExpiresAt,
                status: nextClaim.status,
                service_auth_context: authorization.service_auth_context,
                service_auth_decision_id: authorization.decision.decision_id,
            },
        };
    }

    async noteRemoteRunnerResult(
        claimId: string,
        result: RemoteRunnerControlResult,
        params: {
            serviceAuthContext?: ServiceAuthContext;
            serviceAuthDecision?: ServiceAuthDecision;
        } = {},
    ): Promise<{
        claim: TaskClaimRecord;
        execution_unit: TaskExecutionUnit;
        worker_session?: WorkerSessionRecord;
        result: RemoteRunnerControlResult;
    } | undefined> {
        const claim = await this.store.getExecutionClaim(claimId);
        if (!claim) return undefined;
        const executionUnit = await this.store.getExecutionUnit(claim.execution_unit_id);
        if (!executionUnit) return undefined;

        const updatedAt = now();
        const nextClaim = await this.store.updateExecutionClaim(claimId, {
            execution_mode: result.execution_mode,
            runner_type: result.runner_type,
            correlation_id: result.correlation_id || claim.correlation_id,
            run_id: result.run_id || claim.run_id,
            remote_request_id: result.request_id,
            remote_result_status: result.status,
            remote_result_detail: result.detail,
            service_auth_context: params.serviceAuthContext || claim.service_auth_context,
            last_service_auth_action: params.serviceAuthDecision?.action || claim.last_service_auth_action,
            last_service_auth_decision_id: params.serviceAuthDecision?.decision_id || result.service_auth_decision_id || claim.last_service_auth_decision_id,
            last_service_auth_outcome: params.serviceAuthDecision?.outcome || claim.last_service_auth_outcome,
            updated_at: updatedAt,
        });
        const nextUnit = await this.store.updateExecutionUnit(executionUnit.execution_unit_id, {
            remote_result_status: result.status,
            updated_at: updatedAt,
        });
        const workerSession = await this.store.updateWorkerSession(claim.session_id, {
            correlation_id: result.correlation_id || claim.correlation_id,
            run_id: result.run_id || claim.run_id,
            execution_mode: result.execution_mode,
            runner_type: result.runner_type,
            service_auth_context: params.serviceAuthContext,
            last_service_auth_action: params.serviceAuthDecision?.action,
            last_service_auth_decision_id: params.serviceAuthDecision?.decision_id || result.service_auth_decision_id,
            last_service_auth_outcome: params.serviceAuthDecision?.outcome,
            updated_at: updatedAt,
        });
        if (!nextClaim || !nextUnit) return undefined;
        return {
            claim: nextClaim,
            execution_unit: nextUnit,
            worker_session: workerSession,
            result,
        };
    }

    async requestRemoteRunner(
        claimId: string,
        reason: string,
    ): Promise<{
        claim: TaskClaimRecord;
        execution_unit: TaskExecutionUnit;
        worker_session?: WorkerSessionRecord;
        result: RemoteRunnerControlResult;
    } | undefined> {
        const claim = await this.store.getExecutionClaim(claimId);
        if (!claim) return undefined;
        const executionUnit = await this.store.getExecutionUnit(claim.execution_unit_id);
        if (!executionUnit) return undefined;
        const authorization = await this.authorizeAction({
            action: 'REQUEST_REMOTE_RUNNER',
            task_id: claim.task_id,
            node_id: claim.node_id,
            claim_id: claim.claim_id,
            execution_unit_id: executionUnit.execution_unit_id,
            session_id: claim.session_id,
            worker_id: claim.worker_id,
            correlation_id: claim.correlation_id,
            run_id: claim.run_id,
        });

        const request: RemoteRunnerControlRequest = {
            request_id: `rr_${hashText(`${claim.claim_id}:${Date.now()}`).slice(0, 16)}`,
            execution_unit_id: executionUnit.execution_unit_id,
            task_id: claim.task_id,
            node_id: claim.node_id,
            worker_id: claim.worker_id,
            correlation_id: claim.correlation_id,
            run_id: claim.run_id,
            desired_execution_mode: executionUnit.desired_execution_mode,
            runner_type: executionUnit.runner_type,
            requested_at: now(),
            reason,
            service_auth_context: authorization.service_auth_context,
            service_auth_decision_id: authorization.decision.decision_id,
        };
        if (authorization.decision.outcome === 'DENIED') {
            return this.noteRemoteRunnerResult(claimId, {
                request_id: request.request_id,
                execution_unit_id: executionUnit.execution_unit_id,
                task_id: claim.task_id,
                node_id: claim.node_id,
                correlation_id: claim.correlation_id,
                run_id: claim.run_id,
                status: 'LOCAL_FALLBACK',
                execution_mode: 'LOCAL_FALLBACK',
                runner_type: 'LOCAL_FALLBACK',
                detail: authorization.decision.reason || 'service_auth_denied',
                service_auth_decision_id: authorization.decision.decision_id,
                handled_at: now(),
            }, {
                serviceAuthContext: authorization.service_auth_context,
                serviceAuthDecision: authorization.decision,
            });
        }
        const result = await this.remoteRunnerControl.requestExecution(request);
        return this.noteRemoteRunnerResult(claimId, result, {
            serviceAuthContext: authorization.service_auth_context,
            serviceAuthDecision: authorization.decision,
        });
    }

    async releaseClaim(params: ReleaseExecutionClaimParams): Promise<ReleaseExecutionClaimResult | undefined> {
        const claim = await this.store.getExecutionClaim(params.claim_id);
        if (!claim) return undefined;
        const executionUnit = await this.store.getExecutionUnit(claim.execution_unit_id);
        if (!executionUnit) return undefined;
        const authorization = await this.authorizeAction({
            action: 'RELEASE_EXECUTION',
            task_id: claim.task_id,
            node_id: claim.node_id,
            claim_id: claim.claim_id,
            execution_unit_id: claim.execution_unit_id,
            session_id: claim.session_id,
            worker_id: this.workerIdentity.worker_id,
            correlation_id: claim.correlation_id,
            run_id: claim.run_id,
            service_auth_context: params.service_auth_context,
        });
        if (authorization.decision.outcome === 'DENIED') return undefined;

        const releasedAt = now();
        const nextClaimStatus = params.release_reason === 'LEASE_EXPIRED'
            ? 'EXPIRED'
            : params.release_reason === 'TASK_CANCELLED'
                ? 'RELEASED'
                : 'COMPLETED';
        const nextUnitStatus = params.unit_status || (
            params.release_reason === 'LEASE_EXPIRED'
                ? 'TIMED_OUT'
                : params.release_reason === 'TASK_CANCELLED'
                    ? 'CANCELLED'
                    : 'COMPLETED'
        );

        const nextClaim = await this.store.updateExecutionClaim(claim.claim_id, {
            status: nextClaimStatus,
            released_at: releasedAt,
            release_reason: params.release_reason,
            service_auth_context: authorization.service_auth_context,
            last_service_auth_action: authorization.decision.action,
            last_service_auth_decision_id: authorization.decision.decision_id,
            last_service_auth_outcome: authorization.decision.outcome,
            updated_at: releasedAt,
        });
        const nextUnit = await this.store.updateExecutionUnit(executionUnit.execution_unit_id, {
            status: nextUnitStatus,
            release_reason: params.release_reason,
            updated_at: releasedAt,
            lease_expires_at: undefined,
        });
        const workerSession = await this.store.updateWorkerSession(claim.session_id, {
            status: params.release_reason === 'LEASE_EXPIRED' ? 'EXPIRED' : 'CLOSED',
            correlation_id: claim.correlation_id,
            run_id: claim.run_id,
            released_at: releasedAt,
            service_auth_context: authorization.service_auth_context,
            last_service_auth_action: authorization.decision.action,
            last_service_auth_decision_id: authorization.decision.decision_id,
            last_service_auth_outcome: authorization.decision.outcome,
            updated_at: releasedAt,
        });

        if (!nextClaim || !nextUnit) return undefined;
        return {
            claim: nextClaim,
            execution_unit: nextUnit,
            worker_session: workerSession,
        };
    }

    async recoverStaleClaims(
        taskId: string,
        atMs = now(),
        serviceAuthContext?: ServiceAuthContext,
    ): Promise<StaleClaimRecoveryResult> {
        const claims = await this.store.listExecutionClaims(taskId);
        const staleClaims = claims.filter((claim) => claim.status === 'ACTIVE' && claim.lease_expires_at <= atMs);
        if (staleClaims.length === 0) {
            return {
                expired_claims: [],
                timed_out_units: [],
                requeued_units: [],
                timeout_records: [],
            };
        }
        const authorization = await this.authorizeAction({
            action: 'RECOVER_STALE_CLAIMS',
            task_id: taskId,
            worker_id: this.workerIdentity.worker_id,
            service_auth_context: serviceAuthContext,
        });
        if (authorization.decision.outcome === 'DENIED') {
            return {
                expired_claims: [],
                timed_out_units: [],
                requeued_units: [],
                timeout_records: [],
            };
        }
        const expired_claims: TaskClaimRecord[] = [];
        const timed_out_units: TaskExecutionUnit[] = [];
        const requeued_units: TaskExecutionUnit[] = [];
        const timeout_records: TaskExecutionTimeoutRecord[] = [];

        for (const claim of staleClaims) {
            const released = await this.releaseClaim({
                claim_id: claim.claim_id,
                release_reason: 'LEASE_EXPIRED',
                unit_status: 'TIMED_OUT',
                service_auth_context: authorization.service_auth_context,
            });
            if (!released) continue;

            expired_claims.push(released.claim);
            timed_out_units.push(released.execution_unit);
            timeout_records.push({
                timeout_id: timeoutIdFor(claim.claim_id, atMs),
                claim_id: claim.claim_id,
                execution_unit_id: claim.execution_unit_id,
                task_id: claim.task_id,
                node_id: claim.node_id,
                worker_id: claim.worker_id,
                correlation_id: claim.correlation_id,
                run_id: claim.run_id,
                timed_out_at: atMs,
                lease_expires_at: claim.lease_expires_at,
                requeued: true,
                service_auth_context: authorization.service_auth_context,
                service_auth_decision_id: authorization.decision.decision_id,
                created_at: atMs,
            });

            const requeuedUnit = await this.store.updateExecutionUnit(released.execution_unit.execution_unit_id, {
                status: 'RUNNABLE',
                claim_id: undefined,
                claimed_by_worker_id: undefined,
                claimed_by_session_id: undefined,
                claimed_at: undefined,
                lease_expires_at: undefined,
                available_at: atMs,
                updated_at: atMs,
            });
            if (requeuedUnit) {
                requeued_units.push(requeuedUnit);
            }
        }

        return {
            expired_claims,
            timed_out_units,
            requeued_units,
            timeout_records,
        };
    }

    async releaseActiveClaims(
        taskId: string,
        releaseReason: ReleaseExecutionClaimParams['release_reason'],
        unitStatus: TaskExecutionUnitStatus = 'CANCELLED',
    ): Promise<ReleaseExecutionClaimResult[]> {
        const claims = await this.store.listExecutionClaims(taskId);
        const results: ReleaseExecutionClaimResult[] = [];
        for (const claim of claims) {
            if (claim.status !== 'ACTIVE') continue;
            const released = await this.releaseClaim({
                claim_id: claim.claim_id,
                release_reason: releaseReason,
                unit_status: unitStatus,
            });
            if (released) results.push(released);
        }
        return results;
    }

    async getActiveClaims(taskId: string): Promise<TaskClaimRecord[]> {
        const claims = await this.store.listExecutionClaims(taskId);
        return claims.filter((claim) => claim.status === 'ACTIVE');
    }

    async hasActiveExecutionClaims(taskId: string): Promise<boolean> {
        const activeClaims = await this.getActiveClaims(taskId);
        return activeClaims.length > 0;
    }

    async nextWakeupDelay(taskId: string, atMs = now()): Promise<number | undefined> {
        const pendingRetryJobs = await this.listPendingRetryJobs(taskId);
        const activeClaims = await this.getActiveClaims(taskId);
        const candidates: number[] = [];

        for (const job of pendingRetryJobs) {
            if (job.available_at > atMs) candidates.push(job.available_at);
        }
        for (const claim of activeClaims) {
            if (claim.lease_expires_at > atMs) candidates.push(claim.lease_expires_at);
        }

        if (candidates.length === 0) return undefined;
        return Math.max(0, Math.min(...candidates) - atMs);
    }

    async getSummary(taskId: string): Promise<TaskExecutionSubstrateSummary | undefined> {
        const retryJobs = await this.store.listRetryJobs(taskId);
        const deadLetters = await this.store.listDeadLetters(taskId);
        const executionUnits = await this.store.listExecutionUnits(taskId);
        const executionClaims = await this.store.listExecutionClaims(taskId);
        const workerSessions = await this.store.listWorkerSessions(taskId);
        if (
            retryJobs.length === 0
            && deadLetters.length === 0
            && executionUnits.length === 0
            && executionClaims.length === 0
            && workerSessions.length === 0
        ) {
            return undefined;
        }

        const pendingRetryJobs = retryJobs.filter((job) => isRetryJobActive(job.status));
        const lastRetryScheduledAt = retryJobs.length > 0
            ? Math.max(...retryJobs.map((job) => job.scheduled_at))
            : undefined;
        const lastDeadLetterAt = deadLetters.length > 0
            ? Math.max(...deadLetters.map((record) => record.created_at))
            : undefined;
        const activeClaims = executionClaims.filter((claim) => claim.status === 'ACTIVE');
        const staleClaimCount = executionClaims.filter((claim) => claim.status === 'ACTIVE' && claim.lease_expires_at <= now()).length;
        const localFallbackClaims = executionClaims.filter((claim) => claim.execution_mode === 'LOCAL_FALLBACK');
        const runnableExecutionUnits = executionUnits.filter((unit) => unit.status === 'RUNNABLE');
        const completedClaimCount = executionClaims.filter((claim) => claim.status === 'COMPLETED').length;
        const releasedClaimCount = executionClaims.filter((claim) => claim.status === 'RELEASED').length;
        const expiredClaimCount = executionClaims.filter((claim) => claim.status === 'EXPIRED').length;
        const lastClaim = executionClaims.length > 0
            ? [...executionClaims].sort((a, b) => b.updated_at - a.updated_at)[0]
            : undefined;
        const lastServiceAuthContext = lastClaim?.service_auth_context;
        const lastClaimedAt = executionClaims.length > 0
            ? Math.max(...executionClaims.map((claim) => claim.claimed_at))
            : undefined;
        const lastHeartbeatAt = executionClaims
            .map((claim) => claim.last_heartbeat_at)
            .filter((value): value is number => typeof value === 'number')
            .sort((a, b) => b - a)[0];
        const lastReleasedAt = executionClaims
            .map((claim) => claim.released_at)
            .filter((value): value is number => typeof value === 'number')
            .sort((a, b) => b - a)[0];
        const lastTimedOutAt = executionClaims
            .filter((claim) => claim.release_reason === 'LEASE_EXPIRED')
            .map((claim) => claim.released_at)
            .filter((value): value is number => typeof value === 'number')
            .sort((a, b) => b - a)[0];

        return {
            pending_retry_jobs: pendingRetryJobs,
            dead_letters: deadLetters,
            dead_letter_count: deadLetters.length,
            last_retry_scheduled_at: lastRetryScheduledAt,
            last_dead_letter_at: lastDeadLetterAt,
            worker_summary: {
                worker_pool: this.workerPool,
                worker_identity: this.workerIdentity,
                runnable_execution_units: runnableExecutionUnits,
                active_claims: activeClaims,
                claim_history: executionClaims,
                worker_sessions: workerSessions,
                runnable_count: runnableExecutionUnits.length,
                claimed_count: activeClaims.length,
                stale_claim_count: staleClaimCount,
                local_fallback_count: localFallbackClaims.length,
                completed_claim_count: completedClaimCount,
                released_claim_count: releasedClaimCount,
                expired_claim_count: expiredClaimCount,
                last_claimed_at: lastClaimedAt,
                last_heartbeat_at: lastHeartbeatAt,
                last_released_at: lastReleasedAt,
                last_timed_out_at: lastTimedOutAt,
                last_claim_id: lastClaim?.claim_id,
                last_execution_unit_id: lastClaim?.execution_unit_id,
                last_session_id: lastClaim?.session_id,
                last_worker_id: lastClaim?.worker_id,
                last_correlation_id: lastClaim?.correlation_id,
                last_run_id: lastClaim?.run_id,
                last_execution_mode: lastClaim?.execution_mode,
                last_claim_status: lastClaim?.status,
                last_lease_expires_at: lastClaim?.lease_expires_at,
                last_release_reason: lastClaim?.release_reason,
                last_service_auth_action: lastClaim?.last_service_auth_action,
                last_service_auth_decision_id: lastClaim?.last_service_auth_decision_id,
                last_service_auth_outcome: lastClaim?.last_service_auth_outcome,
                last_service_principal_id: lastServiceAuthContext?.principal.principal_id,
                last_service_auth_mode: lastServiceAuthContext?.auth_mode,
                last_runner_control_result: lastClaim && lastClaim.remote_result_status
                    ? summarizeRemoteRunnerResult(
                        lastClaim,
                        executionUnits.find((unit) => unit.execution_unit_id === lastClaim.execution_unit_id)
                            || {
                                execution_unit_id: lastClaim.execution_unit_id,
                                dedupe_key: '',
                                task_id: lastClaim.task_id,
                                node_id: lastClaim.node_id,
                                target_attempt: 0,
                                status: 'CLAIMED',
                                desired_execution_mode: lastClaim.execution_mode,
                                runner_type: lastClaim.runner_type,
                                available_at: lastClaim.claimed_at,
                                created_at: lastClaim.created_at,
                                updated_at: lastClaim.updated_at,
                            }
                    )
                    : undefined,
            },
        };
    }

    async hasPendingRetryJobs(taskId: string): Promise<boolean> {
        const jobs = await this.listPendingRetryJobs(taskId);
        return jobs.length > 0;
    }
}

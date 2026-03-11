import type {
    DeadLetterRecord,
    ExecutionLedgerAppendResult,
    ExecutionLedgerCheckpoint,
    ExecutionLedgerCompactionHint,
    ExecutionLedgerEventType,
    ExecutionLedgerReadFilter,
    ExecutionLedgerRecord,
    ExecutionLedgerRetentionSummary,
    ExecutionLedgerSummary,
    ExecutionLedgerVisibilitySummary,
    LedgerSourceSummary,
    NodeState,
    NodeStatus,
    ProjectionLagSummary,
    ProjectionCompatibilitySummary,
    ProjectionRebuildRequest,
    ProjectionRebuildResult,
    ProjectionReplayStrategy,
    ProjectionSourceSummary,
    RemoteRunnerControlResult,
    RetryJobRecord,
    ServiceAuthAction,
    ServiceAuthAuditRecord,
    ServiceAuthAuditRecorderPort,
    ServiceAuthDecisionOutcome,
    ServiceAuthMode,
    ServicePrincipalType,
    TaskClaimRecord,
    TaskGraph,
    TaskHeartbeatRecord,
    TaskProjectionCheckpoint,
    TaskProjectionSummary,
    TaskProjectionState,
    TaskQueryProjection,
    TaskSnapshot,
    TaskState,
    TaskStatus,
    TaskExecutionTimeoutRecord,
    TaskExecutionUnit,
} from './contracts.js';
import type { AgentKernelRuntimeEvent } from './events.js';
import type { TaskStore } from './store.js';
import type { LocalFirstExecutionSubstrate } from './substrate.js';
import { hashText } from './utils.js';

export const TASK_QUERY_PROJECTION_NAME = 'task_query_projection_v1';
const TASK_QUERY_PROJECTION_VERSION = 2;
const MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION = 1;
const DEFAULT_ARCHIVE_AFTER_RECORD_COUNT = 500;
const DEFAULT_ARCHIVE_AFTER_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface ExecutionLedgerAuthorityOptions {
    now?: () => number;
    archiveAfterRecordCount?: number;
    archiveAfterAgeMs?: number;
}

const LEDGER_SOURCE_SUMMARY: LedgerSourceSummary = {
    source: 'AGENT_KERNEL_RUNTIME',
    authoritative: true,
    append_only: true,
    local_first: true,
};

function projectionSourceSummary(projectionName: string): ProjectionSourceSummary {
    return {
        projection_name: projectionName,
        projection_version: TASK_QUERY_PROJECTION_VERSION,
        minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
        source: 'EXECUTION_LEDGER',
        authoritative_ledger: true,
        rebuildable: true,
        checkpoint_catch_up_supported: true,
    };
}

function currentTime(): number {
    return Date.now();
}

function emptyProjectionCheckpoint(taskId: string, projectionName: string): TaskProjectionCheckpoint {
    return {
        task_id: taskId,
        projection_name: projectionName,
        projection_version: TASK_QUERY_PROJECTION_VERSION,
        last_sequence: 0,
        replayed_records: 0,
        updated_at: 0,
        compatibility_state: 'CURRENT',
    };
}

function cloneNodeStatusCounts(value: Partial<Record<NodeStatus, number>>): Partial<Record<NodeStatus, number>> {
    return { ...value };
}

function cloneProjection(value: TaskQueryProjection): TaskQueryProjection {
    return {
        ...value,
        source_summary: { ...value.source_summary },
        checkpoint: { ...value.checkpoint },
        node_statuses: { ...value.node_statuses },
        node_status_counts: cloneNodeStatusCounts(value.node_status_counts),
    };
}

function normalizeProjectionVersion(value: unknown): number {
    const parsed = asNumber(value);
    return parsed && parsed > 0 ? parsed : MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION;
}

function normalizeProjection(
    value: TaskQueryProjection | undefined,
    taskId: string,
    projectionName: string,
): TaskQueryProjection {
    if (!value) {
        return createEmptyTaskProjection(taskId, projectionName);
    }

    const projectionVersion = normalizeProjectionVersion(value.projection_version);
    const sourceSummary = {
        ...projectionSourceSummary(projectionName),
        ...(value.source_summary || {}),
        projection_name: projectionName,
        projection_version: projectionVersion,
        minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
        checkpoint_catch_up_supported: true,
        authoritative_ledger: true,
        rebuildable: true,
        source: 'EXECUTION_LEDGER' as const,
    };
    const checkpoint = {
        ...emptyProjectionCheckpoint(taskId, projectionName),
        ...(value.checkpoint || {}),
        task_id: taskId,
        projection_name: projectionName,
        projection_version: normalizeProjectionVersion(value.checkpoint?.projection_version ?? projectionVersion),
        compatibility_state: value.checkpoint?.compatibility_state || value.compatibility_state || 'CURRENT',
    };

    return {
        ...createEmptyTaskProjection(taskId, projectionName),
        ...value,
        task_id: taskId,
        projection_name: projectionName,
        projection_version: projectionVersion,
        compatibility_state: value.compatibility_state || 'CURRENT',
        source_summary: sourceSummary,
        checkpoint,
        node_statuses: { ...(value.node_statuses || {}) },
        node_status_counts: cloneNodeStatusCounts(value.node_status_counts || {}),
        rebuild_count: asNumber(value.rebuild_count) || 0,
        last_rebuild_replayed_records: asNumber(value.last_rebuild_replayed_records) || 0,
    };
}

function asTaskStatus(value: unknown): TaskStatus | undefined {
    return value === 'RUNNING' || value === 'WAITING_USER' || value === 'DONE' || value === 'FAILED' || value === 'CANCELLED'
        ? value
        : undefined;
}

function asNodeStatus(value: unknown): NodeStatus | undefined {
    return value === 'PENDING'
        || value === 'RUNNING'
        || value === 'SUCCEEDED'
        || value === 'FAILED'
        || value === 'SKIPPED'
        || value === 'WAITING_USER'
        || value === 'CANCELLED'
        ? value
        : undefined;
}

function asWaitType(value: unknown): 'approval' | 'ask_user' | undefined {
    return value === 'approval' || value === 'ask_user' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function asTaskClaimReleaseReason(value: unknown): TaskClaimRecord['release_reason'] {
    return value === 'EXECUTION_COMPLETED'
        || value === 'EXECUTION_FAILED'
        || value === 'AWAITING_USER'
        || value === 'RETRY_SCHEDULED'
        || value === 'DEAD_LETTERED'
        || value === 'TASK_CANCELLED'
        || value === 'LEASE_EXPIRED'
        ? value
        : undefined;
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string') as string[]
        : [];
}

function asServiceAuthAction(value: unknown): ServiceAuthAction | undefined {
    return value === 'CLAIM_EXECUTION'
        || value === 'HEARTBEAT_EXECUTION'
        || value === 'RELEASE_EXECUTION'
        || value === 'RECOVER_STALE_CLAIMS'
        || value === 'REQUEST_REMOTE_RUNNER'
        ? value
        : undefined;
}

function asServiceAuthDecisionOutcome(value: unknown): ServiceAuthDecisionOutcome | undefined {
    return value === 'ALLOWED' || value === 'DENIED' ? value : undefined;
}

function asServiceAuthMode(value: unknown): ServiceAuthMode | undefined {
    return value === 'STANDARD' || value === 'BREAK_GLASS' ? value : undefined;
}

function asServicePrincipalType(value: unknown): ServicePrincipalType | undefined {
    return value === 'RUNTIME_SERVICE'
        || value === 'WORKER_SERVICE'
        || value === 'CONTROL_PLANE_SERVICE'
        ? value
        : undefined;
}

function ledgerIdFor(taskId: string, dedupeKey: string): string {
    return `ledger_${hashText(`${taskId}:${dedupeKey}`).slice(0, 24)}`;
}

function buildLedgerCheckpoint(taskId: string, records: ExecutionLedgerRecord[]): ExecutionLedgerCheckpoint {
    const first = records[0];
    const last = records[records.length - 1];
    return {
        task_id: taskId,
        record_count: records.length,
        first_sequence: first?.sequence,
        last_sequence: last?.sequence,
        last_event_type: last?.event_type,
        last_event_at: last?.occurred_at,
        updated_at: last?.occurred_at || 0,
    };
}

function buildRetentionCompactionHint(params: {
    taskId: string;
    projectionName: string;
    records: ExecutionLedgerRecord[];
    now: number;
    archiveAfterRecordCount: number;
    archiveAfterAgeMs: number;
}): ExecutionLedgerCompactionHint | undefined {
    const first = params.records[0];
    const last = params.records[params.records.length - 1];
    if (!first || !last) return undefined;

    let reason: string | undefined;
    if (params.records.length >= params.archiveAfterRecordCount) {
        reason = 'LEDGER_RECORD_THRESHOLD_EXCEEDED';
    } else if ((params.now - first.occurred_at) >= params.archiveAfterAgeMs) {
        reason = 'LEDGER_AGE_THRESHOLD_EXCEEDED';
    }
    if (!reason) return undefined;

    return {
        hint_id: `ledger_compaction_${hashText(`${params.taskId}:${params.projectionName}`).slice(0, 24)}`,
        task_id: params.taskId,
        projection_name: params.projectionName,
        up_to_sequence: last.sequence,
        reason,
        record_count: params.records.length,
        oldest_record_at: first.occurred_at,
        newest_record_at: last.occurred_at,
        archive_recommended: true,
        snapshot_required_before_archive: true,
        delete_allowed: false,
        created_at: params.now,
        updated_at: params.now,
    };
}

function retentionSummary(params: {
    records: ExecutionLedgerRecord[];
    archiveAfterRecordCount: number;
    archiveAfterAgeMs: number;
    latestCompactionHint?: ExecutionLedgerCompactionHint;
}): ExecutionLedgerRetentionSummary {
    const first = params.records[0];
    const last = params.records[params.records.length - 1];
    const latestHint = params.latestCompactionHint;

    return {
        policy_name: 'PILOT_APPEND_ONLY_NO_DELETE',
        retained_from_sequence: first?.sequence || 0,
        retained_through_sequence: last?.sequence || 0,
        record_count: params.records.length,
        oldest_record_at: first?.occurred_at,
        newest_record_at: last?.occurred_at,
        archive_after_record_count: params.archiveAfterRecordCount,
        archive_after_age_ms: params.archiveAfterAgeMs,
        archive_recommended: latestHint?.archive_recommended === true,
        archive_reason: latestHint?.reason,
        snapshot_required_before_archive: true,
        delete_allowed: false,
        projection_rebuild_required_after_archive: true,
        latest_compaction_hint: latestHint,
    };
}

function compatibilitySummary(params: {
    taskId: string;
    projectionName: string;
    projection: TaskQueryProjection;
    lastLedgerSequence: number;
    retainedFromSequence: number;
}): ProjectionCompatibilitySummary {
    if (params.projection.projection_name !== params.projectionName) {
        return {
            projection_name: params.projectionName,
            current_projection_version: TASK_QUERY_PROJECTION_VERSION,
            materialized_projection_version: params.projection.projection_version,
            minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
            state: 'REQUIRES_REBUILD',
            full_rebuild_recommended: true,
            reason: 'projection_name_mismatch',
        };
    }

    if (params.projection.checkpoint.last_sequence > params.lastLedgerSequence) {
        return {
            projection_name: params.projectionName,
            current_projection_version: TASK_QUERY_PROJECTION_VERSION,
            materialized_projection_version: params.projection.projection_version,
            minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
            state: 'REQUIRES_REBUILD',
            full_rebuild_recommended: true,
            reason: 'checkpoint_ahead_of_ledger',
        };
    }

    if (
        params.projection.checkpoint.last_sequence > 0
        && params.projection.checkpoint.last_sequence < (params.retainedFromSequence - 1)
    ) {
        return {
            projection_name: params.projectionName,
            current_projection_version: TASK_QUERY_PROJECTION_VERSION,
            materialized_projection_version: params.projection.projection_version,
            minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
            state: 'REQUIRES_REBUILD',
            full_rebuild_recommended: true,
            reason: 'retained_ledger_window_excludes_required_history',
        };
    }

    if (params.projection.projection_version === TASK_QUERY_PROJECTION_VERSION) {
        return {
            projection_name: params.projectionName,
            current_projection_version: TASK_QUERY_PROJECTION_VERSION,
            materialized_projection_version: params.projection.projection_version,
            minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
            state: 'CURRENT',
            full_rebuild_recommended: false,
            reason: 'current_schema',
        };
    }

    if (params.projection.projection_version >= MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION) {
        return {
            projection_name: params.projectionName,
            current_projection_version: TASK_QUERY_PROJECTION_VERSION,
            materialized_projection_version: params.projection.projection_version,
            minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
            state: 'MIXED_HISTORY_COMPATIBLE',
            full_rebuild_recommended: true,
            reason: 'older_schema_still_replayable',
        };
    }

    return {
        projection_name: params.projectionName,
        current_projection_version: TASK_QUERY_PROJECTION_VERSION,
        materialized_projection_version: params.projection.projection_version,
        minimum_compatible_projection_version: MINIMUM_COMPATIBLE_TASK_QUERY_PROJECTION_VERSION,
        state: 'REQUIRES_REBUILD',
        full_rebuild_recommended: true,
        reason: 'projection_schema_too_old',
    };
}

function setNodeStatus(
    projection: TaskQueryProjection,
    nodeId: string,
    status: NodeStatus
): void {
    const previous = projection.node_statuses[nodeId];
    if (previous === status) return;

    if (previous) {
        const previousCount = projection.node_status_counts[previous] || 0;
        if (previousCount <= 1) {
            delete projection.node_status_counts[previous];
        } else {
            projection.node_status_counts[previous] = previousCount - 1;
        }
    }

    projection.node_statuses[nodeId] = status;
    projection.node_status_counts[status] = (projection.node_status_counts[status] || 0) + 1;
}

function applyInitialNodeState(projection: TaskQueryProjection, payload: Record<string, unknown>): void {
    const nodeStatuses = payload.node_statuses;
    if (!nodeStatuses || typeof nodeStatuses !== 'object' || Array.isArray(nodeStatuses)) {
        return;
    }

    projection.node_statuses = {};
    projection.node_status_counts = {};
    for (const [nodeId, rawStatus] of Object.entries(nodeStatuses as Record<string, unknown>)) {
        const status = asNodeStatus(rawStatus);
        if (!status) continue;
        setNodeStatus(projection, nodeId, status);
    }
}

function applyExecutionSubstratePayload(
    projection: TaskQueryProjection,
    payload: Record<string, unknown>,
): void {
    const pendingRetryJobs = asNumber(payload.pending_retry_jobs);
    const deadLetterCount = asNumber(payload.dead_letter_count);
    const runnableExecutionUnits = asNumber(payload.runnable_execution_units);
    const activeClaimCount = asNumber(payload.active_claim_count);
    const staleClaimCount = asNumber(payload.stale_claim_count);
    const localFallbackCount = asNumber(payload.local_fallback_count);
    const completedClaimCount = asNumber(payload.completed_claim_count);
    const releasedClaimCount = asNumber(payload.released_claim_count);
    const expiredClaimCount = asNumber(payload.expired_claim_count);
    const lastLeaseExpiresAt = asNumber(payload.last_lease_expires_at);
    const lastHeartbeatAt = asNumber(payload.last_heartbeat_at);
    const lastWorkerId = asString(payload.worker_id);
    const lastClaimId = asString(payload.claim_id);
    const lastExecutionUnitId = asString(payload.execution_unit_id);
    const lastSessionId = asString(payload.session_id);
    const lastReleaseReason = asTaskClaimReleaseReason(payload.release_reason);
    const lastExecutionMode = asString(payload.execution_mode);
    const lastRunnerStatus = asString(payload.runner_status);
    const lastClaimStatus = asString(payload.claim_status);
    const lastServiceAuthAction = asServiceAuthAction(payload.last_service_auth_action || payload.service_auth_action);
    const lastServiceAuthOutcome = asServiceAuthDecisionOutcome(payload.last_service_auth_outcome || payload.service_auth_outcome);
    const lastServicePrincipalId = asString(payload.last_service_principal_id || payload.service_principal_id);
    const lastServiceAuthMode = asServiceAuthMode(payload.last_service_auth_mode || payload.service_auth_mode);
    const lastServiceAuthReason = asString(payload.last_service_auth_reason || payload.service_auth_reason);

    if (pendingRetryJobs !== undefined) projection.pending_retry_jobs = pendingRetryJobs;
    if (deadLetterCount !== undefined) projection.dead_letter_count = deadLetterCount;
    if (runnableExecutionUnits !== undefined) projection.runnable_execution_units = runnableExecutionUnits;
    if (activeClaimCount !== undefined) projection.active_claim_count = activeClaimCount;
    if (staleClaimCount !== undefined) projection.stale_claim_count = staleClaimCount;
    if (localFallbackCount !== undefined) projection.local_fallback_count = localFallbackCount;
    if (completedClaimCount !== undefined) projection.completed_claim_count = completedClaimCount;
    if (releasedClaimCount !== undefined) projection.released_claim_count = releasedClaimCount;
    if (expiredClaimCount !== undefined) projection.expired_claim_count = expiredClaimCount;
    if (lastExecutionMode === 'LOCAL_FIRST' || lastExecutionMode === 'REMOTE_PREFERRED' || lastExecutionMode === 'LOCAL_FALLBACK') {
        projection.last_execution_mode = lastExecutionMode;
    }
    if (
        lastRunnerStatus === 'ACCEPTED'
        || lastRunnerStatus === 'LOCAL_FALLBACK'
        || lastRunnerStatus === 'UNAVAILABLE'
        || lastRunnerStatus === 'REJECTED'
        || lastRunnerStatus === 'NOOP'
    ) {
        projection.last_runner_status = lastRunnerStatus;
    }
    if (
        lastClaimStatus === 'ACTIVE'
        || lastClaimStatus === 'RELEASED'
        || lastClaimStatus === 'EXPIRED'
        || lastClaimStatus === 'COMPLETED'
    ) {
        projection.last_claim_status = lastClaimStatus;
    }
    if (lastWorkerId) projection.last_worker_id = lastWorkerId;
    if (lastClaimId) projection.last_claim_id = lastClaimId;
    if (lastExecutionUnitId) projection.last_execution_unit_id = lastExecutionUnitId;
    if (lastSessionId) projection.last_session_id = lastSessionId;
    if (lastReleaseReason) projection.last_release_reason = lastReleaseReason;
    if (lastServiceAuthAction) projection.last_service_auth_action = lastServiceAuthAction;
    if (lastServiceAuthOutcome) projection.last_service_auth_outcome = lastServiceAuthOutcome;
    if (lastServicePrincipalId) projection.last_service_principal_id = lastServicePrincipalId;
    if (lastServiceAuthMode) projection.last_service_auth_mode = lastServiceAuthMode;
    if (lastServiceAuthReason) projection.last_service_auth_reason = lastServiceAuthReason;
    if (lastLeaseExpiresAt !== undefined) projection.last_lease_expires_at = lastLeaseExpiresAt;
    if (lastHeartbeatAt !== undefined) projection.last_heartbeat_at = lastHeartbeatAt;
}

function applyServiceAuthPayload(
    projection: TaskQueryProjection,
    payload: Record<string, unknown>,
): void {
    const action = asServiceAuthAction(payload.service_auth_action);
    const outcome = asServiceAuthDecisionOutcome(payload.service_auth_outcome);
    const principalId = asString(payload.service_principal_id);
    const principalType = asServicePrincipalType(payload.service_principal_type);
    const authMode = asServiceAuthMode(payload.service_auth_mode);
    const reason = asString(payload.service_auth_reason);
    const breakGlassUsed = asBoolean(payload.break_glass_used) === true;

    if (outcome === 'ALLOWED') {
        projection.allowed_service_auth_count += 1;
        if (breakGlassUsed || authMode === 'BREAK_GLASS') {
            projection.break_glass_service_auth_count += 1;
        }
    }
    if (outcome === 'DENIED') {
        projection.denied_service_auth_count += 1;
    }
    if (action) projection.last_service_auth_action = action;
    if (outcome) projection.last_service_auth_outcome = outcome;
    if (principalId) projection.last_service_principal_id = principalId;
    if (principalType) projection.last_service_principal_type = principalType;
    if (authMode) projection.last_service_auth_mode = authMode;
    if (reason) projection.last_service_auth_reason = reason;
}

export function createEmptyTaskProjection(
    taskId: string,
    projectionName = TASK_QUERY_PROJECTION_NAME
): TaskQueryProjection {
    return {
        task_id: taskId,
        projection_name: projectionName,
        projection_version: TASK_QUERY_PROJECTION_VERSION,
        state: 'CURRENT',
        compatibility_state: 'CURRENT',
        source_summary: projectionSourceSummary(projectionName),
        checkpoint: emptyProjectionCheckpoint(taskId, projectionName),
        node_statuses: {},
        node_status_counts: {},
        pending_retry_jobs: 0,
        dead_letter_count: 0,
        runnable_execution_units: 0,
        active_claim_count: 0,
        stale_claim_count: 0,
        local_fallback_count: 0,
        completed_claim_count: 0,
        released_claim_count: 0,
        expired_claim_count: 0,
        allowed_service_auth_count: 0,
        denied_service_auth_count: 0,
        break_glass_service_auth_count: 0,
        rebuild_count: 0,
        last_rebuild_replayed_records: 0,
        updated_at: 0,
    };
}

export function applyExecutionLedgerRecord(
    projectionInput: TaskQueryProjection,
    record: ExecutionLedgerRecord
): TaskQueryProjection {
    const projection = normalizeProjection(
        cloneProjection(projectionInput),
        projectionInput.task_id,
        projectionInput.projection_name,
    );
    const payload = record.payload || {};

    projection.last_event_type = record.event_type;
    projection.first_event_at = projection.first_event_at || record.occurred_at;
    projection.last_event_at = record.occurred_at;
    projection.state = 'CURRENT';

    switch (record.event_type) {
    case 'TASK_CREATED': {
        projection.last_task_status = asTaskStatus(payload.task_status) || projection.last_task_status;
        applyInitialNodeState(projection, payload);
        break;
    }
    case 'TASK_STARTED':
        projection.last_task_status = 'RUNNING';
        break;
    case 'TASK_UPDATED':
        projection.last_task_status = asTaskStatus(payload.task_status) || projection.last_task_status;
        projection.current_wait_node_id = asString(payload.current_wait_node_id);
        projection.current_wait_type = asWaitType(payload.current_wait_type);
        break;
    case 'TASK_COMPLETED':
        projection.last_task_status = 'DONE';
        projection.current_wait_node_id = undefined;
        projection.current_wait_type = undefined;
        break;
    case 'TASK_FAILED':
        projection.last_task_status = 'FAILED';
        projection.current_wait_node_id = undefined;
        projection.current_wait_type = undefined;
        break;
    case 'TASK_CANCELLED': {
        projection.last_task_status = 'CANCELLED';
        projection.current_wait_node_id = undefined;
        projection.current_wait_type = undefined;
        for (const nodeId of asStringArray(payload.cancelled_node_ids)) {
            setNodeStatus(projection, nodeId, 'CANCELLED');
        }
        break;
    }
    case 'NODE_STARTED': {
        const nodeId = asString(payload.node_id);
        if (nodeId) setNodeStatus(projection, nodeId, 'RUNNING');
        if (projection.current_wait_node_id === nodeId) {
            projection.current_wait_node_id = undefined;
            projection.current_wait_type = undefined;
        }
        break;
    }
    case 'NODE_SUCCEEDED': {
        const nodeId = asString(payload.node_id);
        if (nodeId) setNodeStatus(projection, nodeId, 'SUCCEEDED');
        if (projection.current_wait_node_id === nodeId) {
            projection.current_wait_node_id = undefined;
            projection.current_wait_type = undefined;
        }
        break;
    }
    case 'NODE_FAILED': {
        const nodeId = asString(payload.node_id);
        if (nodeId) setNodeStatus(projection, nodeId, 'FAILED');
        if (projection.current_wait_node_id === nodeId) {
            projection.current_wait_node_id = undefined;
            projection.current_wait_type = undefined;
        }
        break;
    }
    case 'NODE_WAITING_USER': {
        const nodeId = asString(payload.node_id);
        if (nodeId) {
            setNodeStatus(projection, nodeId, 'WAITING_USER');
            projection.current_wait_node_id = nodeId;
        }
        projection.current_wait_type = asWaitType(payload.current_wait_type) || projection.current_wait_type;
        projection.last_task_status = 'WAITING_USER';
        break;
    }
    case 'NODE_CANCELLED': {
        const nodeId = asString(payload.node_id);
        if (nodeId) setNodeStatus(projection, nodeId, 'CANCELLED');
        break;
    }
    case 'TASK_RETRY_SCHEDULED':
    case 'TASK_RETRY_REQUEUED':
    case 'TASK_DEAD_LETTERED':
    case 'TASK_EXECUTION_SUBSTRATE_UPDATED': {
        applyExecutionSubstratePayload(projection, payload);

        const nodeId = asString(payload.node_id);
        if (record.event_type === 'TASK_RETRY_REQUEUED' && nodeId) {
            setNodeStatus(projection, nodeId, 'PENDING');
        }
        break;
    }
    case 'TASK_EXECUTION_UNIT_ENQUEUED':
    case 'TASK_EXECUTION_CLAIMED':
    case 'TASK_EXECUTION_HEARTBEAT_RECORDED':
    case 'TASK_EXECUTION_RELEASED':
    case 'TASK_EXECUTION_LOCAL_FALLBACK_USED': {
        applyExecutionSubstratePayload(projection, payload);
        break;
    }
    case 'TASK_EXECUTION_REQUEUED': {
        applyExecutionSubstratePayload(projection, payload);
        const nodeId = asString(payload.node_id);
        if (nodeId) setNodeStatus(projection, nodeId, 'PENDING');
        break;
    }
    case 'TASK_EXECUTION_LEASE_EXPIRED': {
        applyExecutionSubstratePayload(projection, payload);
        const nodeId = asString(payload.node_id);
        if (nodeId) setNodeStatus(projection, nodeId, 'PENDING');
        break;
    }
    case 'TASK_SERVICE_AUTH_ALLOWED':
    case 'TASK_SERVICE_AUTH_DENIED': {
        applyExecutionSubstratePayload(projection, payload);
        applyServiceAuthPayload(projection, payload);
        break;
    }
    default:
        break;
    }

    projection.checkpoint = {
        task_id: projection.task_id,
        projection_name: projection.projection_name,
        projection_version: projection.projection_version,
        last_sequence: record.sequence,
        last_event_at: record.occurred_at,
        replayed_records: record.sequence,
        updated_at: record.occurred_at,
        compatibility_state: projection.compatibility_state,
    };
    projection.updated_at = record.occurred_at;

    return projection;
}

function lagSummary(lastLedgerSequence: number, projectedSequence: number): ProjectionLagSummary {
    const lagRecords = Math.max(0, lastLedgerSequence - projectedSequence);
    return {
        last_ledger_sequence: lastLedgerSequence,
        projected_sequence: projectedSequence,
        lag_records: lagRecords,
        in_sync: lagRecords === 0,
    };
}

export class ExecutionLedgerAuthority implements ServiceAuthAuditRecorderPort {
    private readonly now: () => number;
    private readonly archiveAfterRecordCount: number;
    private readonly archiveAfterAgeMs: number;

    constructor(
        private readonly store: TaskStore,
        private readonly executionSubstrate?: LocalFirstExecutionSubstrate,
        options?: ExecutionLedgerAuthorityOptions,
    ) {
        this.now = options?.now || currentTime;
        this.archiveAfterRecordCount = Math.max(1, Number(options?.archiveAfterRecordCount || DEFAULT_ARCHIVE_AFTER_RECORD_COUNT));
        this.archiveAfterAgeMs = Math.max(60_000, Number(options?.archiveAfterAgeMs || DEFAULT_ARCHIVE_AFTER_AGE_MS));
    }

    private async syncCompactionHint(
        taskId: string,
        projectionName: string,
        records: ExecutionLedgerRecord[],
    ): Promise<ExecutionLedgerCompactionHint | undefined> {
        const hint = buildRetentionCompactionHint({
            taskId,
            projectionName,
            records,
            now: this.now(),
            archiveAfterRecordCount: this.archiveAfterRecordCount,
            archiveAfterAgeMs: this.archiveAfterAgeMs,
        });
        if (!hint) return undefined;
        await this.store.upsertExecutionLedgerCompactionHint(hint);
        return hint;
    }

    private async latestCompactionHint(taskId: string): Promise<ExecutionLedgerCompactionHint | undefined> {
        const hints = await this.store.listExecutionLedgerCompactionHints(taskId);
        return hints[0];
    }

    private async appendLedgerRecord(params: {
        taskId: string;
        dedupeKey: string;
        eventType: ExecutionLedgerEventType;
        payload?: Record<string, unknown>;
        occurredAt?: number;
        source?: 'TASK_RUNTIME' | 'PROJECTION_REBUILD';
    }): Promise<ExecutionLedgerAppendResult> {
        const occurredAt = params.occurredAt ?? this.now();
        const appendResult = await this.store.appendLedgerRecord({
            ledger_id: ledgerIdFor(params.taskId, params.dedupeKey),
            dedupe_key: params.dedupeKey,
            task_id: params.taskId,
            event_type: params.eventType,
            source: params.source || 'TASK_RUNTIME',
            occurred_at: occurredAt,
            created_at: occurredAt,
            payload: params.payload,
        });
        await this.catchUpProjection(params.taskId);
        return appendResult;
    }

    async recordTaskCreated(snapshot: TaskSnapshot): Promise<void> {
        const nodeStatuses: Record<string, NodeStatus> = {};
        for (const nodeState of snapshot.node_states) {
            nodeStatuses[nodeState.node_id] = nodeState.status;
        }

        await this.appendLedgerRecord({
            taskId: snapshot.task_state.task_id,
            dedupeKey: `task-created:${snapshot.task_state.task_id}`,
            eventType: 'TASK_CREATED',
            occurredAt: snapshot.task_state.created_at,
            payload: {
                goal: snapshot.graph.goal,
                node_count: snapshot.node_states.length,
                task_status: snapshot.task_state.status,
                correlation_id: snapshot.task_state.correlation?.correlation_id,
                run_id: snapshot.task_state.correlation?.current_run_id,
                node_statuses: nodeStatuses,
            },
        });
    }

    async recordTaskStarted(snapshot: TaskSnapshot): Promise<void> {
        await this.appendLedgerRecord({
            taskId: snapshot.task_state.task_id,
            dedupeKey: `task-started:${snapshot.task_state.task_id}`,
            eventType: 'TASK_STARTED',
            occurredAt: snapshot.task_state.created_at,
            payload: {
                task_status: 'RUNNING',
                correlation_id: snapshot.task_state.correlation?.correlation_id,
                run_id: snapshot.task_state.correlation?.current_run_id,
            },
        });
    }

    async recordTaskStateUpdate(taskId: string, reason: string): Promise<void> {
        const taskState = await this.store.getTaskState(taskId);
        if (!taskState) return;

        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-updated:${taskId}:${taskState.updated_at}:${reason}`,
            eventType: 'TASK_UPDATED',
            occurredAt: taskState.updated_at,
            payload: {
                task_status: taskState.status,
                correlation_id: taskState.correlation?.correlation_id,
                run_id: taskState.correlation?.current_run_id,
                current_wait_node_id: taskState.current_wait?.node_id,
                current_wait_type: taskState.current_wait?.type,
                reason,
            },
        });
    }

    async recordServiceAuthDecision(record: ServiceAuthAuditRecord): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(record.task_id)
            : undefined;
        const eventType = record.decision.outcome === 'DENIED'
            ? 'TASK_SERVICE_AUTH_DENIED'
            : 'TASK_SERVICE_AUTH_ALLOWED';
        await this.appendLedgerRecord({
            taskId: record.task_id,
            dedupeKey: `task-service-auth:${record.decision.decision_id}`,
            eventType,
            occurredAt: record.decision.decided_at,
            payload: {
                node_id: record.node_id,
                claim_id: record.claim_id,
                execution_unit_id: record.execution_unit_id,
                session_id: record.session_id,
                worker_id: record.worker_id,
                correlation_id: record.correlation_id,
                run_id: record.run_id,
                ...this.serviceAuthPayload({
                    serviceAuthContext: record.service_auth_context,
                    serviceAuthAction: record.decision.action,
                    serviceAuthOutcome: record.decision.outcome,
                    serviceAuthReason: record.decision.reason,
                    breakGlassUsed: record.decision.break_glass_used,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionSubstrateUpdate(taskId: string, reason: string): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        const pendingRetryJobs = summary?.pending_retry_jobs.length || 0;
        const deadLetterCount = summary?.dead_letter_count || 0;
        const workerSummary = summary?.worker_summary;
        const dedupeTail = [
            reason,
            pendingRetryJobs,
            deadLetterCount,
            workerSummary?.runnable_count || 0,
            workerSummary?.claimed_count || 0,
            summary?.last_retry_scheduled_at || 0,
            summary?.last_dead_letter_at || 0,
            workerSummary?.last_claimed_at || 0,
            workerSummary?.last_heartbeat_at || 0,
        ].join(':');

        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-substrate:${taskId}:${dedupeTail}`,
            eventType: 'TASK_EXECUTION_SUBSTRATE_UPDATED',
            payload: {
                pending_retry_jobs: pendingRetryJobs,
                dead_letter_count: deadLetterCount,
                last_retry_scheduled_at: summary?.last_retry_scheduled_at,
                last_dead_letter_at: summary?.last_dead_letter_at,
                ...this.executionSubstratePayload(summary),
                reason,
            },
        });
    }

    async recordNodeCancelled(taskId: string, nodeState: NodeState, reason?: string): Promise<void> {
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `node-cancelled:${taskId}:${nodeState.node_id}:attempt:${nodeState.attempt}`,
            eventType: 'NODE_CANCELLED',
            occurredAt: nodeState.ended_at,
            payload: {
                node_id: nodeState.node_id,
                node_status: 'CANCELLED',
                attempt: nodeState.attempt,
                reason,
            },
        });
    }

    async recordExecutionUnitEnqueued(taskId: string, executionUnit: TaskExecutionUnit): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-unit-enqueued:${executionUnit.execution_unit_id}`,
            eventType: 'TASK_EXECUTION_UNIT_ENQUEUED',
            occurredAt: executionUnit.created_at,
            payload: {
                execution_unit_id: executionUnit.execution_unit_id,
                node_id: executionUnit.node_id,
                correlation_id: executionUnit.correlation_id,
                run_id: executionUnit.run_id,
                target_attempt: executionUnit.target_attempt,
                available_at: executionUnit.available_at,
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionClaimed(
        taskId: string,
        executionUnit: TaskExecutionUnit,
        claim: TaskClaimRecord,
    ): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-claimed:${claim.claim_id}`,
            eventType: 'TASK_EXECUTION_CLAIMED',
            occurredAt: claim.claimed_at,
            payload: {
                execution_unit_id: executionUnit.execution_unit_id,
                claim_id: claim.claim_id,
                node_id: claim.node_id,
                worker_id: claim.worker_id,
                correlation_id: claim.correlation_id,
                run_id: claim.run_id,
                claim_status: claim.status,
                execution_mode: claim.execution_mode,
                lease_expires_at: claim.lease_expires_at,
                ...this.serviceAuthPayload({
                    serviceAuthContext: claim.service_auth_context,
                    serviceAuthAction: claim.last_service_auth_action,
                    serviceAuthOutcome: claim.last_service_auth_outcome,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionHeartbeat(
        taskId: string,
        heartbeat: TaskHeartbeatRecord,
        claim: TaskClaimRecord,
    ): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-heartbeat:${heartbeat.claim_id}:${heartbeat.heartbeat_at}`,
            eventType: 'TASK_EXECUTION_HEARTBEAT_RECORDED',
            occurredAt: heartbeat.heartbeat_at,
            payload: {
                execution_unit_id: heartbeat.execution_unit_id,
                claim_id: heartbeat.claim_id,
                node_id: heartbeat.node_id,
                worker_id: heartbeat.worker_id,
                correlation_id: heartbeat.correlation_id,
                run_id: heartbeat.run_id,
                claim_status: claim.status,
                last_heartbeat_at: heartbeat.heartbeat_at,
                last_lease_expires_at: heartbeat.lease_expires_at,
                ...this.serviceAuthPayload({
                    serviceAuthContext: heartbeat.service_auth_context || claim.service_auth_context,
                    serviceAuthAction: claim.last_service_auth_action,
                    serviceAuthOutcome: claim.last_service_auth_outcome,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionReleased(
        taskId: string,
        executionUnit: TaskExecutionUnit,
        claim: TaskClaimRecord,
    ): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-released:${claim.claim_id}:${claim.updated_at}`,
            eventType: 'TASK_EXECUTION_RELEASED',
            occurredAt: claim.updated_at,
            payload: {
                execution_unit_id: executionUnit.execution_unit_id,
                claim_id: claim.claim_id,
                node_id: claim.node_id,
                worker_id: claim.worker_id,
                correlation_id: claim.correlation_id,
                run_id: claim.run_id,
                claim_status: claim.status,
                release_reason: claim.release_reason,
                unit_status: executionUnit.status,
                ...this.serviceAuthPayload({
                    serviceAuthContext: claim.service_auth_context,
                    serviceAuthAction: claim.last_service_auth_action,
                    serviceAuthOutcome: claim.last_service_auth_outcome,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionLeaseExpired(
        taskId: string,
        timeout: TaskExecutionTimeoutRecord,
        claim: TaskClaimRecord,
        executionUnit: TaskExecutionUnit,
    ): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-lease-expired:${timeout.timeout_id}`,
            eventType: 'TASK_EXECUTION_LEASE_EXPIRED',
            occurredAt: timeout.timed_out_at,
            payload: {
                execution_unit_id: timeout.execution_unit_id,
                claim_id: timeout.claim_id,
                node_id: timeout.node_id,
                worker_id: timeout.worker_id,
                correlation_id: timeout.correlation_id,
                run_id: timeout.run_id,
                claim_status: claim.status,
                unit_status: executionUnit.status,
                last_lease_expires_at: timeout.lease_expires_at,
                ...this.serviceAuthPayload({
                    serviceAuthContext: timeout.service_auth_context || claim.service_auth_context,
                    serviceAuthAction: claim.last_service_auth_action,
                    serviceAuthOutcome: claim.last_service_auth_outcome,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionRequeued(
        taskId: string,
        executionUnit: TaskExecutionUnit,
        claim?: TaskClaimRecord,
    ): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-requeued:${executionUnit.execution_unit_id}:${executionUnit.updated_at}`,
            eventType: 'TASK_EXECUTION_REQUEUED',
            occurredAt: executionUnit.updated_at,
            payload: {
                execution_unit_id: executionUnit.execution_unit_id,
                claim_id: claim?.claim_id,
                node_id: executionUnit.node_id,
                worker_id: claim?.worker_id,
                correlation_id: claim?.correlation_id || executionUnit.correlation_id,
                run_id: claim?.run_id || executionUnit.run_id,
                claim_status: claim?.status,
                release_reason: claim?.release_reason,
                unit_status: executionUnit.status,
                available_at: executionUnit.available_at,
                ...this.serviceAuthPayload({
                    serviceAuthContext: claim?.service_auth_context,
                    serviceAuthAction: claim?.last_service_auth_action,
                    serviceAuthOutcome: claim?.last_service_auth_outcome,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    async recordExecutionLocalFallbackUsed(
        taskId: string,
        executionUnit: TaskExecutionUnit,
        claim: TaskClaimRecord,
        result: RemoteRunnerControlResult,
    ): Promise<void> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        await this.appendLedgerRecord({
            taskId,
            dedupeKey: `task-execution-local-fallback:${claim.claim_id}:${result.request_id}`,
            eventType: 'TASK_EXECUTION_LOCAL_FALLBACK_USED',
            occurredAt: result.handled_at,
            payload: {
                execution_unit_id: executionUnit.execution_unit_id,
                claim_id: claim.claim_id,
                node_id: claim.node_id,
                worker_id: claim.worker_id,
                correlation_id: result.correlation_id || claim.correlation_id,
                run_id: result.run_id || claim.run_id,
                execution_mode: result.execution_mode,
                runner_status: result.status,
                detail: result.detail,
                ...this.serviceAuthPayload({
                    serviceAuthContext: claim.service_auth_context,
                    serviceAuthAction: claim.last_service_auth_action,
                    serviceAuthOutcome: claim.last_service_auth_outcome,
                    serviceAuthReason: claim.last_service_auth_outcome === 'DENIED'
                        ? result.detail
                        : undefined,
                }),
                ...this.executionSubstratePayload(summary),
            },
        });
    }

    private serviceAuthPayload(params: {
        serviceAuthContext?: ServiceAuthAuditRecord['service_auth_context'];
        serviceAuthAction?: ServiceAuthAction;
        serviceAuthOutcome?: ServiceAuthDecisionOutcome;
        serviceAuthReason?: string;
        breakGlassUsed?: boolean;
    }): Record<string, unknown> {
        return {
            auth_context_id: params.serviceAuthContext?.auth_context_id,
            service_auth_action: params.serviceAuthAction,
            service_auth_outcome: params.serviceAuthOutcome,
            service_auth_reason: params.serviceAuthReason,
            service_auth_mode: params.serviceAuthContext?.auth_mode,
            service_principal_id: params.serviceAuthContext?.principal.principal_id,
            service_principal_type: params.serviceAuthContext?.principal.principal_type,
            break_glass_used: params.breakGlassUsed === true,
        };
    }

    private executionSubstratePayload(summary: Awaited<ReturnType<LocalFirstExecutionSubstrate['getSummary']>>): Record<string, unknown> {
        const workerSummary = summary?.worker_summary;
        return {
            runnable_execution_units: workerSummary?.runnable_count || 0,
            active_claim_count: workerSummary?.claimed_count || 0,
            stale_claim_count: workerSummary?.stale_claim_count || 0,
            local_fallback_count: workerSummary?.local_fallback_count || 0,
            completed_claim_count: workerSummary?.completed_claim_count || 0,
            released_claim_count: workerSummary?.released_claim_count || 0,
            expired_claim_count: workerSummary?.expired_claim_count || 0,
            last_claimed_at: workerSummary?.last_claimed_at,
            last_heartbeat_at: workerSummary?.last_heartbeat_at,
            last_released_at: workerSummary?.last_released_at,
            last_timed_out_at: workerSummary?.last_timed_out_at,
            last_lease_expires_at: workerSummary?.last_lease_expires_at,
            worker_id: workerSummary?.last_worker_id
                || workerSummary?.worker_sessions[0]?.worker_id,
            correlation_id: workerSummary?.last_correlation_id,
            run_id: workerSummary?.last_run_id,
            execution_mode: workerSummary?.last_execution_mode,
            claim_status: workerSummary?.last_claim_status,
            claim_id: workerSummary?.last_claim_id,
            execution_unit_id: workerSummary?.last_execution_unit_id,
            session_id: workerSummary?.last_session_id,
            release_reason: workerSummary?.last_release_reason,
            runner_status: workerSummary?.last_runner_control_result?.status,
            last_service_auth_action: workerSummary?.last_service_auth_action,
            last_service_auth_outcome: workerSummary?.last_service_auth_outcome,
            last_service_principal_id: workerSummary?.last_service_principal_id,
            last_service_auth_mode: workerSummary?.last_service_auth_mode,
        };
    }

    private async currentExecutionSubstrateCounts(taskId: string): Promise<{
        pendingRetryJobs: number;
        deadLetterCount: number;
        runnableExecutionUnits: number;
        activeClaimCount: number;
        staleClaimCount: number;
        localFallbackCount: number;
    }> {
        const summary = this.executionSubstrate
            ? await this.executionSubstrate.getSummary(taskId)
            : undefined;
        return {
            pendingRetryJobs: summary?.pending_retry_jobs.length || 0,
            deadLetterCount: summary?.dead_letter_count || 0,
            runnableExecutionUnits: summary?.worker_summary?.runnable_count || 0,
            activeClaimCount: summary?.worker_summary?.claimed_count || 0,
            staleClaimCount: summary?.worker_summary?.stale_claim_count || 0,
            localFallbackCount: summary?.worker_summary?.local_fallback_count || 0,
        };
    }

    async captureRuntimeEvent(event: AgentKernelRuntimeEvent): Promise<void> {
        const taskState = await this.store.getTaskState(event.task_id);
        const nodeState = event.node_id
            ? await this.store.getNodeState(event.task_id, event.node_id)
            : undefined;
        const substrateCounts = await this.currentExecutionSubstrateCounts(event.task_id);

        switch (event.type) {
        case 'task.node.started':
            if (!nodeState || !event.node_id) return;
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `node-started:${event.task_id}:${event.node_id}:attempt:${nodeState.attempt}`,
                eventType: 'NODE_STARTED',
                occurredAt: event.occurred_at,
                payload: {
                    node_id: event.node_id,
                    node_status: nodeState.status,
                    attempt: nodeState.attempt,
                },
            });
            return;
        case 'task.node.succeeded':
            if (!nodeState || !event.node_id) return;
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `node-succeeded:${event.task_id}:${event.node_id}:attempt:${nodeState.attempt}`,
                eventType: 'NODE_SUCCEEDED',
                occurredAt: event.occurred_at,
                payload: {
                    node_id: event.node_id,
                    node_status: nodeState.status,
                    attempt: nodeState.attempt,
                },
            });
            return;
        case 'task.node.failed':
            if (!nodeState || !event.node_id) return;
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `node-failed:${event.task_id}:${event.node_id}:attempt:${nodeState.attempt}:code:${nodeState.error?.code || 'unknown'}`,
                eventType: 'NODE_FAILED',
                occurredAt: event.occurred_at,
                payload: {
                    node_id: event.node_id,
                    node_status: nodeState.status,
                    attempt: nodeState.attempt,
                    error_code: nodeState.error?.code,
                    retryable: nodeState.error?.retryable,
                },
            });
            return;
        case 'task.awaiting_user':
            if (event.node_id && nodeState) {
                await this.appendLedgerRecord({
                    taskId: event.task_id,
                    dedupeKey: `node-waiting-user:${event.task_id}:${event.node_id}:attempt:${nodeState.attempt}:type:${taskState?.current_wait?.type || 'unknown'}`,
                    eventType: 'NODE_WAITING_USER',
                    occurredAt: event.occurred_at,
                    payload: {
                        node_id: event.node_id,
                        node_status: nodeState.status,
                        attempt: nodeState.attempt,
                        current_wait_type: taskState?.current_wait?.type,
                    },
                });
            }
            if (taskState) {
                await this.appendLedgerRecord({
                    taskId: event.task_id,
                    dedupeKey: `task-updated:${event.task_id}:${taskState.updated_at}:awaiting-user`,
                    eventType: 'TASK_UPDATED',
                    occurredAt: taskState.updated_at,
                    payload: {
                        task_status: taskState.status,
                        current_wait_node_id: taskState.current_wait?.node_id,
                        current_wait_type: taskState.current_wait?.type,
                        reason: asString(event.payload?.reason) || 'awaiting_user',
                    },
                });
            }
            return;
        case 'task.done':
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `task-terminal:${event.task_id}:DONE`,
                eventType: 'TASK_COMPLETED',
                occurredAt: event.occurred_at,
                payload: {
                    task_status: 'DONE',
                },
            });
            return;
        case 'task.failed':
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `task-terminal:${event.task_id}:FAILED`,
                eventType: 'TASK_FAILED',
                occurredAt: event.occurred_at,
                payload: {
                    task_status: 'FAILED',
                    reason: asString(event.payload?.reason) || asString(event.payload?.message),
                },
            });
            return;
        case 'task.cancelled':
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `task-terminal:${event.task_id}:CANCELLED`,
                eventType: 'TASK_CANCELLED',
                occurredAt: event.occurred_at,
                payload: {
                    task_status: 'CANCELLED',
                    cancelled_node_ids: event.payload?.cancelled_node_ids,
                    reason: asString(event.payload?.reason),
                },
            });
            return;
        case 'task.retry.scheduled':
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `task-retry-scheduled:${asString(event.payload?.job_id) || `${event.task_id}:${event.node_id}`}`,
                eventType: 'TASK_RETRY_SCHEDULED',
                occurredAt: event.occurred_at,
                payload: {
                    node_id: event.node_id,
                    job_id: event.payload?.job_id,
                    attempt: event.payload?.attempt,
                    available_at: event.payload?.available_at,
                    pending_retry_jobs: substrateCounts.pendingRetryJobs,
                    dead_letter_count: substrateCounts.deadLetterCount,
                    runnable_execution_units: substrateCounts.runnableExecutionUnits,
                    active_claim_count: substrateCounts.activeClaimCount,
                    stale_claim_count: substrateCounts.staleClaimCount,
                    local_fallback_count: substrateCounts.localFallbackCount,
                },
            });
            return;
        case 'task.retry.requeued':
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `task-retry-requeued:${asString(event.payload?.job_id) || `${event.task_id}:${event.node_id}`}`,
                eventType: 'TASK_RETRY_REQUEUED',
                occurredAt: event.occurred_at,
                payload: {
                    node_id: event.node_id,
                    job_id: event.payload?.job_id,
                    attempt: event.payload?.attempt,
                    pending_retry_jobs: substrateCounts.pendingRetryJobs,
                    dead_letter_count: substrateCounts.deadLetterCount,
                    runnable_execution_units: substrateCounts.runnableExecutionUnits,
                    active_claim_count: substrateCounts.activeClaimCount,
                    stale_claim_count: substrateCounts.staleClaimCount,
                    local_fallback_count: substrateCounts.localFallbackCount,
                },
            });
            return;
        case 'task.dead_lettered':
            await this.appendLedgerRecord({
                taskId: event.task_id,
                dedupeKey: `task-dead-lettered:${asString(event.payload?.dead_letter_id) || `${event.task_id}:${event.node_id}`}`,
                eventType: 'TASK_DEAD_LETTERED',
                occurredAt: event.occurred_at,
                payload: {
                    node_id: event.node_id,
                    dead_letter_id: event.payload?.dead_letter_id,
                    attempt: event.payload?.attempt,
                    max_retries: event.payload?.max_retries,
                    pending_retry_jobs: substrateCounts.pendingRetryJobs,
                    dead_letter_count: substrateCounts.deadLetterCount,
                    runnable_execution_units: substrateCounts.runnableExecutionUnits,
                    active_claim_count: substrateCounts.activeClaimCount,
                    stale_claim_count: substrateCounts.staleClaimCount,
                    local_fallback_count: substrateCounts.localFallbackCount,
                },
            });
            return;
        default:
            return;
        }
    }

    async catchUpProjection(taskId: string, projectionName = TASK_QUERY_PROJECTION_NAME): Promise<TaskQueryProjection | undefined> {
        const records = await this.store.listLedgerRecords({ task_id: taskId });
        if (records.length === 0) return undefined;

        const latestHint = await this.syncCompactionHint(taskId, projectionName, records)
            || await this.latestCompactionHint(taskId);
        const retention = retentionSummary({
            records,
            archiveAfterRecordCount: this.archiveAfterRecordCount,
            archiveAfterAgeMs: this.archiveAfterAgeMs,
            latestCompactionHint: latestHint,
        });
        const lastLedgerSequence = records[records.length - 1]?.sequence || 0;
        const existingProjectionRaw = await this.store.getTaskProjection(taskId, projectionName);
        const existingCheckpoint = await this.store.getProjectionCheckpoint(taskId, projectionName);

        if (!existingProjectionRaw) {
            let projection = createEmptyTaskProjection(taskId, projectionName);
            for (const record of records) {
                projection = applyExecutionLedgerRecord(projection, record);
            }
            projection.checkpoint.replayed_records = records.length;
            projection.compatibility_state = 'CURRENT';
            projection.checkpoint.compatibility_state = 'CURRENT';
            projection.checkpoint.projection_version = projection.projection_version;
            projection.state = 'CURRENT';
            await this.store.upsertTaskProjection(projection);
            await this.store.upsertProjectionCheckpoint(projection.checkpoint);
            return projection;
        }

        let projection = normalizeProjection(existingProjectionRaw, taskId, projectionName);
        if (existingCheckpoint) {
            projection.checkpoint = {
                ...projection.checkpoint,
                ...existingCheckpoint,
                task_id: taskId,
                projection_name: projectionName,
                projection_version: normalizeProjectionVersion(
                    existingCheckpoint.projection_version ?? projection.projection_version
                ),
            };
        }

        const compatibility = compatibilitySummary({
            taskId,
            projectionName,
            projection,
            lastLedgerSequence,
            retainedFromSequence: retention.retained_from_sequence || 1,
        });

        if (compatibility.state === 'REQUIRES_REBUILD') {
            projection.state = 'STALE';
            projection.compatibility_state = compatibility.state;
            projection.checkpoint.compatibility_state = compatibility.state;
            projection.checkpoint.projection_version = projection.projection_version;
            await this.store.upsertTaskProjection(projection);
            await this.store.upsertProjectionCheckpoint(projection.checkpoint);
            return projection;
        }

        const fromSequence = existingCheckpoint?.last_sequence ?? projection.checkpoint.last_sequence;
        const pending = records.filter((record) => record.sequence > fromSequence);
        const previousReplayedRecords = projection.checkpoint.replayed_records;

        for (const record of pending) {
            projection = applyExecutionLedgerRecord(projection, record);
        }

        projection.state = 'CURRENT';
        projection.compatibility_state = compatibility.state;
        projection.checkpoint.compatibility_state = compatibility.state;
        projection.checkpoint.projection_version = projection.projection_version;
        projection.checkpoint.replayed_records = previousReplayedRecords + pending.length;

        if (
            pending.length > 0
            || projection.compatibility_state !== existingProjectionRaw.compatibility_state
            || projection.state !== existingProjectionRaw.state
            || projection.checkpoint.projection_version !== existingProjectionRaw.checkpoint?.projection_version
        ) {
            await this.store.upsertTaskProjection(projection);
            await this.store.upsertProjectionCheckpoint(projection.checkpoint);
        }

        return projection;
    }

    async rebuildTaskProjection(request: ProjectionRebuildRequest): Promise<ProjectionRebuildResult> {
        const projectionName = request.projection_name || TASK_QUERY_PROJECTION_NAME;
        const allRecords = await this.store.listLedgerRecords({ task_id: request.task_id });
        const latestHint = await this.syncCompactionHint(request.task_id, projectionName, allRecords)
            || await this.latestCompactionHint(request.task_id);
        const retention = retentionSummary({
            records: allRecords,
            archiveAfterRecordCount: this.archiveAfterRecordCount,
            archiveAfterAgeMs: this.archiveAfterAgeMs,
            latestCompactionHint: latestHint,
        });
        if (allRecords.length === 0) {
            const projection = createEmptyTaskProjection(request.task_id, projectionName);
            const compatibility = compatibilitySummary({
                taskId: request.task_id,
                projectionName,
                projection,
                lastLedgerSequence: 0,
                retainedFromSequence: retention.retained_from_sequence || 0,
            });
            return {
                task_id: request.task_id,
                projection_name: projectionName,
                replayed_records: 0,
                rebuild_strategy: 'FULL_REPLAY',
                projection,
                checkpoint: projection.checkpoint,
                lag: lagSummary(0, 0),
                source_summary: projection.source_summary,
                compatibility,
                retention,
            };
        }

        const existingProjectionRaw = await this.store.getTaskProjection(request.task_id, projectionName);
        const existingCheckpoint = await this.store.getProjectionCheckpoint(request.task_id, projectionName);
        const existingProjection = normalizeProjection(existingProjectionRaw, request.task_id, projectionName);
        if (existingCheckpoint) {
            existingProjection.checkpoint = {
                ...existingProjection.checkpoint,
                ...existingCheckpoint,
                projection_version: normalizeProjectionVersion(
                    existingCheckpoint.projection_version ?? existingProjection.projection_version
                ),
            };
        }

        const currentCompatibility = compatibilitySummary({
            taskId: request.task_id,
            projectionName,
            projection: existingProjection,
            lastLedgerSequence: allRecords[allRecords.length - 1]?.sequence || 0,
            retainedFromSequence: retention.retained_from_sequence || 1,
        });

        let projection: TaskQueryProjection;
        let startSequence: number;
        let rebuildStrategy: ProjectionReplayStrategy;

        if (request.full_rebuild === true) {
            rebuildStrategy = request.from_sequence && request.from_sequence > (retention.retained_from_sequence || 1)
                ? 'FROM_SEQUENCE_REPLAY'
                : 'FULL_REPLAY';
            projection = createEmptyTaskProjection(request.task_id, projectionName);
            startSequence = rebuildStrategy === 'FROM_SEQUENCE_REPLAY'
                ? Number(request.from_sequence)
                : Math.max(1, retention.retained_from_sequence || 1);
        } else if (currentCompatibility.state === 'REQUIRES_REBUILD') {
            rebuildStrategy = 'COMPATIBILITY_REBUILD';
            projection = createEmptyTaskProjection(request.task_id, projectionName);
            startSequence = Math.max(1, retention.retained_from_sequence || 1);
        } else {
            rebuildStrategy = 'CHECKPOINT_CATCH_UP';
            projection = existingProjectionRaw
                ? existingProjection
                : createEmptyTaskProjection(request.task_id, projectionName);
            startSequence = Math.max(
                (existingCheckpoint?.last_sequence ?? projection.checkpoint.last_sequence) + 1,
                1,
            );
        }

        const records = allRecords.filter((record) => record.sequence >= startSequence);
        for (const record of records) {
            projection = applyExecutionLedgerRecord(projection, record);
        }

        projection.rebuild_count = (existingProjectionRaw ? existingProjection.rebuild_count : 0) + 1;
        projection.last_rebuild_at = this.now();
        projection.last_rebuild_from_sequence = startSequence;
        projection.last_rebuild_strategy = rebuildStrategy;
        projection.last_rebuild_replayed_records = records.length;
        projection.checkpoint.replayed_records = rebuildStrategy === 'CHECKPOINT_CATCH_UP'
            ? existingProjection.checkpoint.replayed_records + records.length
            : records.length;

        let compatibility = compatibilitySummary({
            taskId: request.task_id,
            projectionName,
            projection,
            lastLedgerSequence: allRecords[allRecords.length - 1]?.sequence || 0,
            retainedFromSequence: retention.retained_from_sequence || 1,
        });
        if (rebuildStrategy === 'FROM_SEQUENCE_REPLAY' && startSequence > (retention.retained_from_sequence || 1)) {
            compatibility = {
                ...compatibility,
                state: 'MIXED_HISTORY_COMPATIBLE',
                full_rebuild_recommended: true,
                reason: 'from_sequence_replay_requires_full_history',
            };
        }
        projection.compatibility_state = compatibility.state;
        projection.checkpoint.compatibility_state = compatibility.state;
        projection.checkpoint.projection_version = projection.projection_version;
        projection.state = compatibility.state === 'REQUIRES_REBUILD' ? 'STALE' : 'CURRENT';

        await this.store.upsertTaskProjection(projection);
        await this.store.upsertProjectionCheckpoint(projection.checkpoint);

        const lastLedgerSequence = allRecords[allRecords.length - 1]?.sequence || 0;
        return {
            task_id: request.task_id,
            projection_name: projectionName,
            replayed_records: records.length,
            rebuild_strategy: rebuildStrategy,
            projection,
            checkpoint: projection.checkpoint,
            lag: lagSummary(lastLedgerSequence, projection.checkpoint.last_sequence),
            source_summary: projection.source_summary,
            compatibility,
            retention,
        };
    }

    async getVisibilitySummary(taskId: string): Promise<ExecutionLedgerVisibilitySummary | undefined> {
        const records = await this.store.listLedgerRecords({ task_id: taskId } satisfies ExecutionLedgerReadFilter);
        if (records.length === 0) return undefined;

        const projection = await this.catchUpProjection(taskId);
        if (!projection) return undefined;
        const latestHint = await this.latestCompactionHint(taskId);
        const retention = retentionSummary({
            records,
            archiveAfterRecordCount: this.archiveAfterRecordCount,
            archiveAfterAgeMs: this.archiveAfterAgeMs,
            latestCompactionHint: latestHint,
        });

        const checkpoint = buildLedgerCheckpoint(taskId, records);
        const ledger: ExecutionLedgerSummary = {
            record_count: checkpoint.record_count,
            first_sequence: checkpoint.first_sequence,
            last_sequence: checkpoint.last_sequence,
            last_event_type: checkpoint.last_event_type,
            last_event_at: checkpoint.last_event_at,
            checkpoint,
        };

        const projectionLag = lagSummary(
            checkpoint.last_sequence || 0,
            projection.checkpoint.last_sequence,
        );
        const compatibility = compatibilitySummary({
            taskId,
            projectionName: projection.projection_name,
            projection,
            lastLedgerSequence: checkpoint.last_sequence || 0,
            retainedFromSequence: retention.retained_from_sequence || 1,
        });
        const projectionSummary: TaskProjectionSummary = {
            projection_name: projection.projection_name,
            projection_version: projection.projection_version,
            state: projection.state,
            compatibility_state: projection.compatibility_state,
            last_projected_sequence: projection.checkpoint.last_sequence,
            last_event_at: projection.last_event_at,
            last_task_status: projection.last_task_status,
            pending_retry_jobs: projection.pending_retry_jobs,
            dead_letter_count: projection.dead_letter_count,
            runnable_execution_units: projection.runnable_execution_units,
            active_claim_count: projection.active_claim_count,
            stale_claim_count: projection.stale_claim_count,
            local_fallback_count: projection.local_fallback_count,
            completed_claim_count: projection.completed_claim_count,
            released_claim_count: projection.released_claim_count,
            expired_claim_count: projection.expired_claim_count,
            allowed_service_auth_count: projection.allowed_service_auth_count,
            denied_service_auth_count: projection.denied_service_auth_count,
            break_glass_service_auth_count: projection.break_glass_service_auth_count,
            last_execution_mode: projection.last_execution_mode,
            last_runner_status: projection.last_runner_status,
            last_worker_id: projection.last_worker_id,
            last_claim_status: projection.last_claim_status,
            last_lease_expires_at: projection.last_lease_expires_at,
            last_heartbeat_at: projection.last_heartbeat_at,
            last_claim_id: projection.last_claim_id,
            last_execution_unit_id: projection.last_execution_unit_id,
            last_session_id: projection.last_session_id,
            last_release_reason: projection.last_release_reason,
            last_service_auth_action: projection.last_service_auth_action,
            last_service_auth_outcome: projection.last_service_auth_outcome,
            last_service_principal_id: projection.last_service_principal_id,
            last_service_principal_type: projection.last_service_principal_type,
            last_service_auth_mode: projection.last_service_auth_mode,
            last_service_auth_reason: projection.last_service_auth_reason,
            rebuild_count: projection.rebuild_count,
            last_rebuild_at: projection.last_rebuild_at,
            last_rebuild_from_sequence: projection.last_rebuild_from_sequence,
            last_rebuild_strategy: projection.last_rebuild_strategy,
            last_rebuild_replayed_records: projection.last_rebuild_replayed_records,
            lag: projectionLag,
            updated_at: projection.updated_at,
        };

        return {
            source: LEDGER_SOURCE_SUMMARY,
            ledger,
            projection: projectionSummary,
            compatibility,
            retention,
        };
    }
}

export function summarizeExecutionSubstrateForLedger(
    retryJobs: RetryJobRecord[],
    deadLetters: DeadLetterRecord[],
): {
    pending_retry_jobs: number;
    dead_letter_count: number;
} {
    return {
        pending_retry_jobs: retryJobs.length,
        dead_letter_count: deadLetters.length,
    };
}

export function materializeTaskGraphSummary(graph: TaskGraph, taskState: TaskState): Record<string, unknown> {
    return {
        goal: graph.goal,
        node_count: graph.nodes.length,
        task_status: taskState.status,
    };
}

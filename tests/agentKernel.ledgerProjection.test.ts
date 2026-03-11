import { describe, expect, it } from 'vitest';
import { InMemoryTaskStore } from '../services/agent-kernel/store.js';
import {
    applyExecutionLedgerRecord,
    createEmptyTaskProjection,
    ExecutionLedgerAuthority,
    TASK_QUERY_PROJECTION_NAME,
} from '../services/agent-kernel/ledger.js';
import { LocalFirstExecutionSubstrate } from '../services/agent-kernel/substrate.js';

function stripRebuildMetadata<T extends Record<string, unknown>>(projection: T): Omit<T, 'rebuild_count' | 'last_rebuild_at' | 'last_rebuild_from_sequence' | 'last_rebuild_replayed_records' | 'last_rebuild_strategy'> {
    const {
        rebuild_count,
        last_rebuild_at,
        last_rebuild_from_sequence,
        last_rebuild_replayed_records,
        last_rebuild_strategy,
        ...rest
    } = projection;
    return rest;
}

describe('agent-kernel ledger and projection scaffolding', () => {
    it('round-trips ledger and projection structures through JSON safely', () => {
        const projection = applyExecutionLedgerRecord(
            createEmptyTaskProjection('ledger_round_trip', TASK_QUERY_PROJECTION_NAME),
            {
                ledger_id: 'ledger_round_trip_1',
                dedupe_key: 'task-created:ledger_round_trip',
                task_id: 'ledger_round_trip',
                sequence: 1,
                event_type: 'TASK_CREATED',
                source: 'TASK_RUNTIME',
                occurred_at: 100,
                created_at: 100,
                payload: {
                    task_status: 'RUNNING',
                    node_statuses: { n1: 'PENDING' },
                },
            },
        );

        const roundTripped = JSON.parse(JSON.stringify(projection));
        expect(roundTripped.task_id).toBe('ledger_round_trip');
        expect(roundTripped.checkpoint.last_sequence).toBe(1);
        expect(roundTripped.node_status_counts.PENDING).toBe(1);
        expect(roundTripped.active_claim_count).toBe(0);
    });

    it('rebuilds deterministically from a checkpoint and matches full replay', async () => {
        const store = new InMemoryTaskStore();
        const substrate = new LocalFirstExecutionSubstrate(store);
        const authority = new ExecutionLedgerAuthority(store, substrate);
        const taskId = 'ledger_rebuild_determinism';

        await store.appendLedgerRecord({
            ledger_id: 'ledger_det_1',
            dedupe_key: 'task-created:det',
            task_id: taskId,
            event_type: 'TASK_CREATED',
            source: 'TASK_RUNTIME',
            occurred_at: 100,
            created_at: 100,
            payload: {
                task_status: 'RUNNING',
                node_statuses: { n1: 'PENDING', n2: 'PENDING' },
            },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_det_2',
            dedupe_key: 'node-started:det:n1:1',
            task_id: taskId,
            event_type: 'NODE_STARTED',
            source: 'TASK_RUNTIME',
            occurred_at: 110,
            created_at: 110,
            payload: { node_id: 'n1', node_status: 'RUNNING', attempt: 1 },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_det_3',
            dedupe_key: 'node-succeeded:det:n1:1',
            task_id: taskId,
            event_type: 'NODE_SUCCEEDED',
            source: 'TASK_RUNTIME',
            occurred_at: 120,
            created_at: 120,
            payload: { node_id: 'n1', node_status: 'SUCCEEDED', attempt: 1 },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_det_4',
            dedupe_key: 'task-updated:det:waiting',
            task_id: taskId,
            event_type: 'TASK_UPDATED',
            source: 'TASK_RUNTIME',
            occurred_at: 130,
            created_at: 130,
            payload: { task_status: 'WAITING_USER', current_wait_node_id: 'n2', current_wait_type: 'approval' },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_det_4a',
            dedupe_key: 'task-execution-claimed:det',
            task_id: taskId,
            event_type: 'TASK_EXECUTION_CLAIMED',
            source: 'TASK_RUNTIME',
            occurred_at: 135,
            created_at: 135,
            payload: {
                node_id: 'n2',
                worker_id: 'worker_det',
                claim_status: 'ACTIVE',
                execution_mode: 'LOCAL_FALLBACK',
                runnable_execution_units: 0,
                active_claim_count: 1,
                stale_claim_count: 0,
                local_fallback_count: 1,
                last_lease_expires_at: 235,
                last_heartbeat_at: 135,
                runner_status: 'LOCAL_FALLBACK',
            },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_det_5',
            dedupe_key: 'task-done:det',
            task_id: taskId,
            event_type: 'TASK_COMPLETED',
            source: 'TASK_RUNTIME',
            occurred_at: 140,
            created_at: 140,
            payload: { task_status: 'DONE' },
        });

        const fullReplay = await authority.rebuildTaskProjection({
            task_id: taskId,
            projection_name: TASK_QUERY_PROJECTION_NAME,
            full_rebuild: true,
        });

        const allRecords = await store.listLedgerRecords({ task_id: taskId });
        let checkpointProjection = createEmptyTaskProjection(taskId, TASK_QUERY_PROJECTION_NAME);
        for (const record of allRecords.slice(0, 3)) {
            checkpointProjection = applyExecutionLedgerRecord(checkpointProjection, record);
        }
        await store.upsertTaskProjection(checkpointProjection);
        await store.upsertProjectionCheckpoint(checkpointProjection.checkpoint);

        const checkpointReplay = await authority.rebuildTaskProjection({
            task_id: taskId,
            projection_name: TASK_QUERY_PROJECTION_NAME,
        });

        expect(stripRebuildMetadata(checkpointReplay.projection)).toEqual(stripRebuildMetadata(fullReplay.projection));
        expect(checkpointReplay.checkpoint.last_sequence).toBe(fullReplay.checkpoint.last_sequence);
        expect(checkpointReplay.lag.in_sync).toBe(true);
        expect(checkpointReplay.projection.local_fallback_count).toBe(1);
        expect(checkpointReplay.projection.last_runner_status).toBe('LOCAL_FALLBACK');
        expect(checkpointReplay.rebuild_strategy).toBe('CHECKPOINT_CATCH_UP');
        expect(checkpointReplay.projection.last_rebuild_strategy).toBe('CHECKPOINT_CATCH_UP');
        expect(fullReplay.rebuild_strategy).toBe('FULL_REPLAY');
        expect(fullReplay.projection.last_rebuild_strategy).toBe('FULL_REPLAY');
    });

    it('tracks execution requeue and release metadata in projections', () => {
        const projection = applyExecutionLedgerRecord(
            createEmptyTaskProjection('ledger_requeue_projection', TASK_QUERY_PROJECTION_NAME),
            {
                ledger_id: 'ledger_requeue_1',
                dedupe_key: 'task-execution-requeued:ledger-requeue',
                task_id: 'ledger_requeue_projection',
                sequence: 1,
                event_type: 'TASK_EXECUTION_REQUEUED',
                source: 'TASK_RUNTIME',
                occurred_at: 150,
                created_at: 150,
                payload: {
                    execution_unit_id: 'exec_requeue_1',
                    claim_id: 'claim_requeue_1',
                    session_id: 'session_requeue_1',
                    worker_id: 'worker_requeue_1',
                    claim_status: 'EXPIRED',
                    release_reason: 'LEASE_EXPIRED',
                    unit_status: 'RUNNABLE',
                    runnable_execution_units: 1,
                    active_claim_count: 0,
                    stale_claim_count: 0,
                    local_fallback_count: 1,
                    completed_claim_count: 0,
                    released_claim_count: 0,
                    expired_claim_count: 1,
                    execution_mode: 'LOCAL_FALLBACK',
                },
            },
        );

        expect(projection.runnable_execution_units).toBe(1);
        expect(projection.active_claim_count).toBe(0);
        expect(projection.expired_claim_count).toBe(1);
        expect(projection.last_claim_id).toBe('claim_requeue_1');
        expect(projection.last_execution_unit_id).toBe('exec_requeue_1');
        expect(projection.last_session_id).toBe('session_requeue_1');
        expect(projection.last_release_reason).toBe('LEASE_EXPIRED');
        expect(projection.last_execution_mode).toBe('LOCAL_FALLBACK');
    });

    it('tracks allowed, denied, and break-glass service auth decisions in projections', () => {
        let projection = createEmptyTaskProjection('ledger_service_auth_projection', TASK_QUERY_PROJECTION_NAME);

        projection = applyExecutionLedgerRecord(projection, {
            ledger_id: 'ledger_service_auth_1',
            dedupe_key: 'task-service-auth:allow',
            task_id: 'ledger_service_auth_projection',
            sequence: 1,
            event_type: 'TASK_SERVICE_AUTH_ALLOWED',
            source: 'TASK_RUNTIME',
            occurred_at: 200,
            created_at: 200,
            payload: {
                service_auth_action: 'REQUEST_REMOTE_RUNNER',
                service_auth_outcome: 'ALLOWED',
                service_auth_mode: 'BREAK_GLASS',
                service_principal_id: 'svc_break_glass',
                service_principal_type: 'CONTROL_PLANE_SERVICE',
                service_auth_reason: 'break_glass_override',
                break_glass_used: true,
            },
        });
        projection = applyExecutionLedgerRecord(projection, {
            ledger_id: 'ledger_service_auth_2',
            dedupe_key: 'task-service-auth:deny',
            task_id: 'ledger_service_auth_projection',
            sequence: 2,
            event_type: 'TASK_SERVICE_AUTH_DENIED',
            source: 'TASK_RUNTIME',
            occurred_at: 210,
            created_at: 210,
            payload: {
                service_auth_action: 'REQUEST_REMOTE_RUNNER',
                service_auth_outcome: 'DENIED',
                service_auth_mode: 'STANDARD',
                service_principal_id: 'svc_worker_local',
                service_principal_type: 'WORKER_SERVICE',
                service_auth_reason: 'service_auth_scope_denied',
            },
        });

        expect(projection.allowed_service_auth_count).toBe(1);
        expect(projection.denied_service_auth_count).toBe(1);
        expect(projection.break_glass_service_auth_count).toBe(1);
        expect(projection.last_service_auth_action).toBe('REQUEST_REMOTE_RUNNER');
        expect(projection.last_service_auth_outcome).toBe('DENIED');
        expect(projection.last_service_principal_id).toBe('svc_worker_local');
        expect(projection.last_service_principal_type).toBe('WORKER_SERVICE');
        expect(projection.last_service_auth_mode).toBe('STANDARD');
        expect(projection.last_service_auth_reason).toBe('service_auth_scope_denied');
    });

    it('marks legacy materialized projections as mixed-history compatible and upgrades them on full rebuild', async () => {
        const store = new InMemoryTaskStore();
        const substrate = new LocalFirstExecutionSubstrate(store);
        const authority = new ExecutionLedgerAuthority(store, substrate);
        const taskId = 'ledger_legacy_projection';

        await store.appendLedgerRecord({
            ledger_id: 'ledger_legacy_1',
            dedupe_key: 'task-created:legacy',
            task_id: taskId,
            event_type: 'TASK_CREATED',
            source: 'TASK_RUNTIME',
            occurred_at: 100,
            created_at: 100,
            payload: {
                task_status: 'RUNNING',
                node_statuses: { n1: 'PENDING' },
            },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_legacy_2',
            dedupe_key: 'task-done:legacy',
            task_id: taskId,
            event_type: 'TASK_COMPLETED',
            source: 'TASK_RUNTIME',
            occurred_at: 120,
            created_at: 120,
            payload: { task_status: 'DONE' },
        });

        let legacyProjection = createEmptyTaskProjection(taskId, TASK_QUERY_PROJECTION_NAME);
        for (const record of await store.listLedgerRecords({ task_id: taskId })) {
            legacyProjection = applyExecutionLedgerRecord(legacyProjection, record);
        }
        legacyProjection.projection_version = 1;
        legacyProjection.source_summary.projection_version = 1;
        legacyProjection.checkpoint.projection_version = 1;
        await store.upsertTaskProjection(legacyProjection);
        await store.upsertProjectionCheckpoint(legacyProjection.checkpoint);

        const visibility = await authority.getVisibilitySummary(taskId);
        expect(visibility?.compatibility.state).toBe('MIXED_HISTORY_COMPATIBLE');
        expect(visibility?.compatibility.reason).toBe('older_schema_still_replayable');
        expect(visibility?.projection.projection_version).toBe(1);

        const rebuilt = await authority.rebuildTaskProjection({
            task_id: taskId,
            projection_name: TASK_QUERY_PROJECTION_NAME,
            full_rebuild: true,
        });

        expect(rebuilt.rebuild_strategy).toBe('FULL_REPLAY');
        expect(rebuilt.compatibility.state).toBe('CURRENT');
        expect(rebuilt.projection.projection_version).toBeGreaterThan(1);
        expect(rebuilt.projection.rebuild_count).toBe(1);
        expect(rebuilt.projection.last_rebuild_replayed_records).toBe(2);
    });

    it('marks projections stale when the checkpoint runs ahead of the authoritative ledger', async () => {
        const store = new InMemoryTaskStore();
        const substrate = new LocalFirstExecutionSubstrate(store);
        const authority = new ExecutionLedgerAuthority(store, substrate);
        const taskId = 'ledger_checkpoint_ahead';

        const append = await store.appendLedgerRecord({
            ledger_id: 'ledger_ahead_1',
            dedupe_key: 'task-created:ahead',
            task_id: taskId,
            event_type: 'TASK_CREATED',
            source: 'TASK_RUNTIME',
            occurred_at: 100,
            created_at: 100,
            payload: {
                task_status: 'RUNNING',
                node_statuses: { n1: 'PENDING' },
            },
        });
        const projection = applyExecutionLedgerRecord(
            createEmptyTaskProjection(taskId, TASK_QUERY_PROJECTION_NAME),
            append.record,
        );
        projection.checkpoint.last_sequence = 99;
        projection.checkpoint.replayed_records = 99;
        await store.upsertTaskProjection(projection);
        await store.upsertProjectionCheckpoint(projection.checkpoint);

        const caughtUp = await authority.catchUpProjection(taskId);
        const visibility = await authority.getVisibilitySummary(taskId);

        expect(caughtUp?.state).toBe('STALE');
        expect(caughtUp?.compatibility_state).toBe('REQUIRES_REBUILD');
        expect(visibility?.compatibility.state).toBe('REQUIRES_REBUILD');
        expect(visibility?.compatibility.reason).toBe('checkpoint_ahead_of_ledger');
    });

    it('emits retention summaries and compaction hints once archive thresholds are crossed', async () => {
        const store = new InMemoryTaskStore();
        const authority = new ExecutionLedgerAuthority(store, undefined, {
            now: () => 1_000_000,
            archiveAfterRecordCount: 2,
            archiveAfterAgeMs: 60_000,
        });
        const taskId = 'ledger_retention_threshold';

        await store.appendLedgerRecord({
            ledger_id: 'ledger_retention_1',
            dedupe_key: 'task-created:retention',
            task_id: taskId,
            event_type: 'TASK_CREATED',
            source: 'TASK_RUNTIME',
            occurred_at: 100,
            created_at: 100,
            payload: {
                task_status: 'RUNNING',
                node_statuses: { n1: 'PENDING' },
            },
        });
        await store.appendLedgerRecord({
            ledger_id: 'ledger_retention_2',
            dedupe_key: 'task-done:retention',
            task_id: taskId,
            event_type: 'TASK_COMPLETED',
            source: 'TASK_RUNTIME',
            occurred_at: 110,
            created_at: 110,
            payload: { task_status: 'DONE' },
        });

        const visibility = await authority.getVisibilitySummary(taskId);
        const hints = await store.listExecutionLedgerCompactionHints(taskId);

        expect(visibility?.retention.archive_recommended).toBe(true);
        expect(visibility?.retention.archive_reason).toBe('LEDGER_RECORD_THRESHOLD_EXCEEDED');
        expect(visibility?.retention.delete_allowed).toBe(false);
        expect(visibility?.retention.projection_rebuild_required_after_archive).toBe(true);
        expect(visibility?.retention.latest_compaction_hint?.up_to_sequence).toBe(2);
        expect(hints).toHaveLength(1);
        expect(hints[0]?.snapshot_required_before_archive).toBe(true);
        expect(hints[0]?.delete_allowed).toBe(false);
    });
});

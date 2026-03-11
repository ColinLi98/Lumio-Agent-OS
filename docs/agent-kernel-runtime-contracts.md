# Agent Kernel Runtime Contracts (SQL + Events + Node Logs)

This document is the implementation contract for:
1. task/node persistence,
2. append-only execution ledger persistence,
3. rebuildable task projection persistence,
4. service-backed execution-unit / claim / worker-session persistence,
5. runtime event topics,
6. node execution log fields.

## 1) SQL Objects

Applied from:
- `services/agent-kernel/sql/schema.sql`

Primary tables:
1. `agent_kernel_tasks`
- latest task graph + task state snapshot.

2. `agent_kernel_nodes`
- latest node state per `(task_id, node_id)`.

3. `agent_kernel_idempotency`
- idempotency cache for declared idempotent tools.

4. `agent_kernel_retry_jobs`
- durable retry scheduling truth for retryable node failures.

5. `agent_kernel_dead_letters`
- durable dead-letter records for exhausted retry paths.

6. `agent_kernel_events`
- append-only runtime event sink (can mirror Kafka/PubSub topics).

7. `agent_kernel_node_execution_logs`
- append-only per-node attempt logs for audit/replay.

8. `agent_kernel_execution_ledger`
- append-only authoritative execution ledger records keyed by per-task sequence and dedupe key.

9. `agent_kernel_task_projections`
- additive materialized task projection snapshots derived from ledger truth.

10. `agent_kernel_projection_checkpoints`
- additive replay checkpoints used to catch projections up deterministically after restart.

11. `agent_kernel_execution_units`
- durable runnable-work records for claimable task execution units.

12. `agent_kernel_execution_claims`
- durable claim / lease / release state for claimed execution units.

13. `agent_kernel_worker_sessions`
- durable per-task worker session records for local-first worker/control-plane continuity.

## 2) Event Topic Contract

Topic:
- `agent-kernel.runtime.v1`

Event envelope fields:
1. `event_id` (string, unique)
2. `topic` (string)
3. `type` (string)
4. `task_id` (string)
5. `node_id` (string, optional)
6. `occurred_at` (epoch ms)
7. `payload` (object, optional)
8. `node_log` (object, optional, see section 5)

Canonical event types:
1. `task.node.started`
2. `task.node.succeeded`
3. `task.node.failed`
4. `task.awaiting_user`
5. `task.done`
6. `task.failed`
7. `task.cancelled`
8. `task.downgraded`
9. `task.compensation.triggered`
10. `task.compensation.result`
11. `task.compensation.irreversible`
12. `tool.called`
13. `policy.denied`
14. `verifier.failed`
15. `task.retry.scheduled`
16. `task.retry.requeued`
17. `task.dead_lettered`

## 3) Execution Substrate Summary

Task snapshots and task API responses may include an optional `execution_substrate` object with:
1. `pending_retry_jobs` (`RetryJobRecord[]`)
2. `dead_letters` (`DeadLetterRecord[]`)
3. `dead_letter_count` (number)
4. `last_retry_scheduled_at` (epoch ms, optional)
5. `last_dead_letter_at` (epoch ms, optional)
6. `worker_summary` (`ExecutionWorkerSummary`, optional) with:
7. `worker_pool`
8. `worker_identity`
9. `runnable_execution_units`
10. `active_claims`
11. `worker_sessions`
12. `runnable_count`
13. `claimed_count`
14. `stale_claim_count`
15. `local_fallback_count`
16. `last_claimed_at`, `last_heartbeat_at`, `last_released_at`, `last_timed_out_at`
17. `last_runner_control_result`

## 4) Execution Ledger Summary

Task snapshots and task API responses may include an optional `execution_ledger` object with:
1. `source` (`LedgerSourceSummary`)
2. `ledger` (`ExecutionLedgerSummary`)
3. `projection` (`TaskProjectionSummary`)

Ledger records are append-only and projection summaries are rebuildable from `agent_kernel_execution_ledger`.
Projection summaries now also carry additive worker/control-plane counters:
- `runnable_execution_units`
- `active_claim_count`
- `stale_claim_count`
- `local_fallback_count`
- `last_execution_mode`
- `last_runner_status`
- `last_worker_id`
- `last_claim_status`
- `last_lease_expires_at`
- `last_heartbeat_at`

## 5) Node Execution Log Fields

`node_log` object (in events and DB logs):
1. `task_id` (string)
2. `node_id` (string)
3. `status` (`RUNNING|SUCCEEDED|FAILED|WAITING_USER|...`)
4. `attempt` (number, optional)
5. `error_code` (string, optional)
6. `error_message` (string, optional)
7. `retryable` (boolean, optional)
8. `tool_call_id` (string, optional)
9. `verifier` (string, optional)
10. `policy_decision_ids` (string[], optional)
11. `approval_decision` (string, optional)
12. `started_at` (epoch ms, optional)
13. `ended_at` (epoch ms, optional)
14. `latency_ms` (number, optional)

Code source of truth:
- `services/agent-kernel/events.ts`
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/substrate.ts`
- `services/agent-kernel/ledger.ts`

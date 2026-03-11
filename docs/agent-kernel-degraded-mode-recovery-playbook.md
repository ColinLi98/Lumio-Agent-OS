# Agent Kernel Degraded Mode Recovery Playbook

## Purpose
Recovery playbook for common degraded pilot states while preserving local-first safety behavior.

## Degraded states in scope
- local task failure with dead-letter
- stale claim or lease expiry churn
- service-auth denial on remote/control-plane action
- connector credential or delivery degradation
- projection rebuild requirement

## Recovery principles
- do not fabricate success
- do not rewrite or delete authoritative ledger history
- prefer bounded replay, requeue, rotate, or rebuild over manual state edits
- keep local-first fallback visible until the degraded cause is cleared

## Recovery paths
### Dead-letter recovery
1. identify the dead-lettered node and error
2. fix the underlying dependency or payload issue
3. requeue/replay from the bounded retry or dead-letter recovery path
4. confirm `dead_letter_count` returns to `0`

### Stale claim recovery
1. confirm the lease expired and the claim is stale
2. release or recover the stale claim through the control-plane path
3. verify the execution unit becomes `RUNNABLE` or closes terminally
4. confirm `stale_claim_count` returns to `0`

### Service-auth denial recovery
1. inspect the denied action and principal binding
2. restore the missing service scope or worker binding if the deny is unintended
3. use break-glass only with explicit approval and expiry
4. confirm no new `TASK_SERVICE_AUTH_DENIED` events accumulate

### Connector recovery
1. inspect credential health and recent delivery history
2. renew, rotate, or revoke/rotate through the bounded vault lifecycle as required
3. replay only after the route is eligible again
4. confirm delivery status returns to `DELIVERED`

### Projection rebuild recovery
1. confirm compatibility state is `REQUIRES_REBUILD`
2. rebuild the materialized projection from the execution ledger
3. verify lag returns to `0`
4. confirm compatibility state returns to `CURRENT`

## Recovery verification
- `/api/agent-kernel/observability/summary` shows no remaining degraded reason for the recovered task
- dashboard/metrics gauges for open alerts and degraded tasks drop accordingly
- receipts and task snapshots still show the true failure/degraded history that occurred

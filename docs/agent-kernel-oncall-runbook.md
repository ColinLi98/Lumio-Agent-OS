# Agent Kernel Pilot On-Call Runbook

## Purpose
Minimum on-call baseline for the controlled enterprise pilot.

## Coverage
- task execution failures
- service-auth denials
- projection rebuild requirements
- stale worker claims
- connector delivery degradation

## Alert codes
- `TASK_FAILED`
- `SERVICE_AUTH_DENIED`
- `PROJECTION_REBUILD_REQUIRED`
- `DEAD_LETTER_OPEN`
- `STALE_CLAIM_ACTIVE`
- `CONNECTOR_HEALTH_DEGRADED`
- `CONNECTOR_DELIVERY_DEGRADED`

## Triage order
1. Confirm the affected `task_id`, `correlation_id`, and `run_id` from `/api/agent-kernel/observability/summary`.
2. Check `execution_ledger.compatibility`, `execution_substrate.worker_summary`, and connector delivery records in the same response.
3. Classify the incident into one of:
   - task/runtime failure
   - control-plane/service-auth failure
   - projection truth/rebuild failure
   - connector/vault degradation
4. If tenant impact exists, notify the pilot tenant admin and keep local-first degraded behavior in place until recovery is verified.

## Immediate actions
- `TASK_FAILED`
  - confirm dead-letter state and failing node/error details
  - if recoverable, replay from the bounded retry/dead-letter path; do not mutate ledger history
- `SERVICE_AUTH_DENIED`
  - inspect the denied action, service principal, and auth mode
  - confirm deny-by-default is expected before using any break-glass path
- `PROJECTION_REBUILD_REQUIRED`
  - rebuild the materialized task projection from the append-only ledger before trusting query state
- `DEAD_LETTER_OPEN`
  - inspect dead-letter record, connector/worker correlation, and last release reason
  - either recover the underlying dependency and replay or leave the task visibly failed
- `STALE_CLAIM_ACTIVE`
  - run stale-claim recovery and confirm the unit is requeued or closed cleanly
- `CONNECTOR_HEALTH_DEGRADED` or `CONNECTOR_DELIVERY_DEGRADED`
  - inspect recent webhook deliveries, credential health, and last failure reason
  - if credential compromise or revoke state is present, keep the route blocked until rotation is complete

## Escalation
- Platform engineering owns substrate, projection, and service-auth incidents.
- Tenant admin owns business communication and approval for business-impacting degraded mode.
- Break-glass use requires explicit justification, bounded expiry, and post-incident review.

## Exit criteria
- alert no longer appears in observability summary
- degraded mode reasons are cleared or intentionally documented
- connector/task/query state is verified through the authoritative task and ledger summaries

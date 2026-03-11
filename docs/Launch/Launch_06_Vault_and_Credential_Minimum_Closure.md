# Vault and Credential Minimum Closure

## Goal
Back the frozen pilot webhook path with one real vault and credential lifecycle closure.

## Why this step is now
Typed vault semantics were already present, but the enterprise pilot still lacked one real credential path. Launch 06 closes that gap for the frozen HashiCorp Vault plus outbound HTTPS webhook path.

## Scope lock
- one real vault backend path only: `HashiCorp Vault`
- one real connector path only: frozen outbound `HTTPS_WEBHOOK`
- additive and backward-compatible only
- no full vendor matrix
- no broad secret platform replacement
- no weakening of local-first safety behavior

## Completed outputs
- Added one real HashiCorp Vault-backed pilot connector path for the frozen outbound webhook handoff.
- Added durable credential metadata and webhook delivery audit records across memory, Postgres, Redis, and the static Postgres schema.
- Added bounded runtime support for:
  - credential inspect/materialize
  - lease renew
  - lease revoke
  - credential rotate
  - webhook delivery with vault-resolved secret material
- Added bounded admin API routes for:
  - `GET|POST /api/agent-kernel/connectors/webhook/credential-health`
  - `POST /api/agent-kernel/connectors/webhook/credential/renew`
  - `POST /api/agent-kernel/connectors/webhook/credential/revoke`
  - `POST /api/agent-kernel/connectors/webhook/credential/rotate`
  - `POST /api/agent-kernel/connectors/webhook/deliver`
- Added route gating by credential health:
  - revoked, compromised, expired, or unhealthy credentials block delivery
  - expiring renewable credentials can renew before delivery
  - unauthorized webhook responses degrade credential health visibly
- Added operator-visible credential summaries:
  - additive `credential_health` summary with status, compromise state, lease metadata, recommended action, and recent deliveries
  - blocked-delivery audit records for unhealthy or compromised states

## Local-first safety
- Secret material is resolved from Vault at use time and is not persisted in task-store state.
- Remote credential degradation blocks or degrades visibly rather than fabricating success.
- Existing local governance truth, receipts, approvals, and task execution safety behavior are unchanged.

## Explicitly deferred
- broader vault provider matrix
- generalized secret platform or secret-management productization
- native vendor connector expansion beyond the single pilot webhook path
- broader connector platform work, observability, compliance, deployment, and operator-readiness closure in later launch steps

## Definition of done
- At least one production connector path uses a real HashiCorp Vault-backed credential lifecycle.
- Lease expiry, renew, revoke, rotate, and unhealthy states are durable and auditable.
- Connector routing fails closed on unhealthy credential state.
- Operator-visible credential failure and compromise summaries exist.

## Validation
- `npm run -s typecheck`
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts`

## Final report
- changed files
- exact step outputs completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

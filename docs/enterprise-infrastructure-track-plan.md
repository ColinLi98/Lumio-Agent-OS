# Enterprise Infrastructure Track Plan

Date: 2026-03-06
Owner: Codex
Execution mode: additive, backward-compatible, shippable slices

## 1. Track Summary

This track hardens the enterprise substrate under the existing Agent OS decision and governance plane.

It is:
- not a product redesign
- not an orchestrator rewrite
- not a broad UX pass

It is:
- a parallel infrastructure hardening track
- milestone-scoped and additive
- local-first safe by default

Authoritative planning inputs:
- `docs/Enterprise_Infrastructure_Gap_Map.md`
- `docs/enterprise-infrastructure-track-workstreams.md`
- `docs/enterprise-infrastructure-track-status.md`

## 2. Priority Boundaries

### P0
1. Remote execution substrate
2. Authoritative ledger and query model
3. Enterprise identity and authorization closure
4. Vault and credential lifecycle

### P1
1. Connector platform hardening
2. Observability and SRE
3. Compliance process execution
4. Deployment / tenant isolation / environment strategy

### P2
- Do not start deeper optimization, broader operator UX polish, or advanced automation layers until P0 and P1 are materially closed.

## 3. Workstream Order

### EI-P0A Remote execution substrate bootstrap
- Target `services/agent-kernel` first because it already has durable task state, retry policy, idempotency, APIs, and tests.
- Add durable retry job and dead-letter scaffolding before any service-backed worker rollout.
- Preserve current task/node statuses and local-first execution behavior.

### EI-P0B Authoritative ledger/query model bootstrap
- Use the retry/dead-letter records from EI-P0A as the first durable execution-substrate artifacts.
- Define append-only ledger ownership, version rules, rebuild policy, and projection boundaries.

### EI-P0C Service-backed worker pool and remote runner control plane scaffolding
- Add durable runnable execution units, claim/lease/heartbeat/release state, and a no-op remote runner boundary that preserves local-first execution.
- Preserve process-death continuity by expiring stale claims back into runnable local work without introducing a remote-only dependency.
- Keep ledger/projection truth authoritative and additive.

### EI-P0D Identity/auth closure
- Move from typed semantics toward real OIDC/SAML + SCIM + service auth closure.
- Keep denial and audit trails first-class.

### EI-P0E Vault and credential lifecycle
- Move from typed refs and runtime summaries toward real lease/renew/rotate/revoke/expiry handling.
- Keep route gating and local-first fallback semantics intact.

### EI-P1A to EI-P1D
- Run only after P0 is materially stable enough for enterprise pilots.
- Keep connector, observability, compliance-process, and deployment/isolation workstreams separate from product-surface work.

## 4. Exit Criteria

### Design-partner-ready
- Major product flows remain stable.
- Receipts, governance, and local-first recovery remain usable.
- Enterprise gap closure is organized into explicit workstreams and boundaries.
- No infrastructure slice weakens LIX, twin, Bellman, or existing safety gates.

### Enterprise-pilot-ready
- All P0 workstreams meet pilot baselines.
- Remote execution has durable retry/dead-letter/idempotency scaffolding.
- Authoritative ledger/projection policy is defined and partially implemented.
- One usable SSO/SCIM path exists.
- One usable vault path exists.
- Support and runbook expectations are documented.

### Repeatable-enterprise-product-ready
- P0 and P1 are materially closed.
- Deployment/isolation strategy is defined and testable.
- Connector lifecycle and credential rotation are robust.
- Observability and compliance operations are runbook-backed.
- Onboarding and support no longer depend on founder/manual intervention.

## 5. Current Slice: EI-P0C

Scope for this run:
- `services/agent-kernel/*`
- `api/agent-kernel/tasks/*`
- `tests/agentKernel*.test.ts`
- enterprise-track and refactor/status docs

Delivered in this slice:
- typed worker/session/claim/lease/heartbeat/release and remote-runner control contracts
- durable runnable execution units, execution claims, and worker-session persistence in memory/Postgres/Redis adapters
- local-first claim, heartbeat, release, timeout, and stale-claim recovery behavior in the TypeScript runtime
- authoritative ledger append behavior for execution-unit enqueue, claim, heartbeat, release, lease-expiry, and local-fallback transitions
- additive `execution_substrate` and `execution_ledger.projection` visibility for worker/control-plane summaries
- test coverage for runtime claim lifecycle, persistence continuity, API visibility, and replay-safe projection updates

Completed prerequisites carried forward from EI-P0A and EI-P0B:
- durable retry/dead-letter substrate
- local-first execution substrate boundary
- runtime scheduling/requeue/dead-letter behavior
- API exposure for execution substrate summaries
- append-only execution ledger
- rebuildable task projection/checkpoint scaffolding

Deferred within EI-P0C:
- real remote worker fleet autoscaling and multi-runner coordination
- remote-runner acceptance/execution beyond the no-op local-fallback control boundary
- queue backlog tooling beyond task-level execution substrate summaries
- broader cross-task/server-side materialized query suites
- archival, retention, and migration/version policy beyond current task projection scaffolding

## 6. Validation Baseline

Required validation for the EI-P0C slice:
1. `npm run -s typecheck`
2. `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts`

## 7. Remaining Open Gaps After EI-P0C

Not addressed in this slice:
- no real remote worker fleet, autoscaling, or remote runner mesh yet
- no broader server-side materialized query suite, archival policy, or migration/version closure yet
- no production OIDC/SAML/SCIM rollout closure yet
- no production vault lease/rotate/revoke backend yet
- no connector SDK or conformance suite yet
- no SLO, tracing, on-call, or incident runbook stack yet
- no retention/deletion/legal-hold execution engine yet
- no finalized tenant/region deployment and isolation strategy yet

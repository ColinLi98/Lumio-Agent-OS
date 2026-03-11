# Launch 03: EI-P0C Service-Backed Worker Pool and Remote Runner Control Plane

## Goal
Turn the remote execution substrate scaffolding into a minimal service-backed execution loop with durable claim, lease, heartbeat, release, timeout, and requeue behavior.

## Scope lock
- service-layer only
- additive and backward-compatible
- no autoscaling fleet
- no full remote execution platform
- no Android/orchestrator rewrite
- no weakening of local-first fallback behavior

## Completed outputs
- Added a bounded service-backed worker loop in `services/agent-kernel/workerPool.ts`.
- Routed runtime follow-up execution through the worker-loop abstraction for:
  - deterministic task draining
  - background polling
  - delayed follow-up runs
- Closed durable execution substrate visibility by surfacing:
  - claim history
  - completed/released/expired claim counts
  - last claim/session/execution-unit identifiers
  - last release reason and lease metadata
- Made stale-claim recovery replay-safe and auditable with explicit `TASK_EXECUTION_REQUEUED` ledger records after lease expiry.
- Preserved the existing local-first fallback path when remote runner requests degrade or fail.
- Kept retry/dead-letter behavior compatible with the authoritative execution ledger and projection rebuild path.

## Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/storeAdapters.ts`
- `services/agent-kernel/substrate.ts`
- `services/agent-kernel/ledger.ts`
- `services/agent-kernel/runtime.ts`
- `services/agent-kernel/workerPool.ts`
- `services/agent-kernel/index.ts`
- `tests/agentKernel.runtime.test.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `tests/agentKernel.ledgerProjection.test.ts`
- `docs/Launch/Launch_03_EI_P0C_Service_Backed_Worker_Pool_and_Remote_Runner_Control_Plane.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands were not run because this step did not touch Android or host runtime files.

## Compatibility / migration
- No migration required.
- Existing task API shapes remain backward-compatible; Launch 03 only adds execution-substrate and execution-ledger detail.
- Local-first safety semantics remain authoritative when remote execution is unavailable.

## Deferred beyond this step
- service-auth closure, stronger worker identity, and control-plane admission safety in `EI-P0D`
- autoscaling fleets, worker mesh, and broader remote-runner orchestration
- broader cross-task query/model hardening, observability/SRE closure, compliance execution, and deployment topology work from later frozen launch steps

## Exit result
- Tasks can now be drained or polled outside a single request path through a bounded service-backed worker loop.
- Lease expiry, timeout, release, and requeue are durable, visible, and replay-safe.
- Local-first fallback remains intact.

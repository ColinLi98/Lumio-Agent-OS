# EI-P0C - Service-Backed Worker Pool and Remote Runner Control Plane Scaffolding

## Why EI-P0C is next

EI-P0A established the local-first execution substrate baseline:
- durable retry jobs
- durable dead-letter records
- restart-safe requeue behavior
- additive, backward-compatible API visibility

EI-P0B then established the next foundational truth layer:
- append-only execution ledger
- rebuildable task query projection scaffolding
- checkpointed deterministic replay
- additive ledger visibility in task responses

The next missing infrastructure boundary is no longer durable truth.
The next missing boundary is **durable execution outside the request thread and outside a single in-process runtime path**.

Without EI-P0C, the system still lacks:
- a service-backed worker pool that can claim runnable work
- a remote-runner-ready control plane boundary
- typed worker claims, leases, heartbeats, and release semantics
- durable in-flight execution state outside purely local inline runtime handling
- a path from "authoritative ledger" to "distributed execution substrate"

EI-P0C should add those foundations **without rewriting Android/orchestrator behavior and without breaking the local-first safety baseline**.

---

## Goal

Add the first bounded service-backed worker/control-plane layer for the agent-kernel TypeScript service by introducing:
- typed worker-pool and runner-control contracts
- durable runnable-work claiming
- lease / heartbeat / release / timeout semantics
- local-first compatible remote-runner scaffolding
- additive API and observability visibility

This milestone is still a scaffolding pass.
It should prepare the codebase for distributed execution while preserving today's local-first correctness guarantees.

---

## Non-goals

EI-P0C should **not** do the following:
- no orchestrator architecture rewrite
- no Android behavior rewrite
- no broad remote job scheduling platform buildout
- no full production worker autoscaling system
- no breaking API or contract changes
- no generalized cross-service execution mesh
- no broad worktree cleanup outside the bounded surface

Keep the write surface bounded to:
- enterprise-track docs
- `services/agent-kernel`
- `api/agent-kernel/tasks`
- targeted `tests/agentKernel*.test.ts`

---

## Required outcome

After EI-P0C, the system should be able to:
1. persist runnable work as typed execution units
2. allow a worker to claim runnable work through a durable lease/claim path
3. represent worker identity and worker-session state in typed/runtime records
4. heartbeat, release, timeout, or fail claims durably
5. preserve local-first fallback when no remote worker/control-plane path is configured
6. expose additive execution-substrate summaries through task detail / run responses
7. preserve EI-P0A retry/dead-letter semantics and EI-P0B ledger/projection semantics

---

## Core architecture direction

### Existing layers to preserve
- retry jobs and dead-letter behavior remain durable and authoritative
- append-only execution ledger remains the source of execution history truth
- query projections remain rebuildable from ledger truth
- local-first execution remains the default safety baseline

### New layer to introduce
Add a service-backed worker/control-plane boundary that sits between:
- durable runnable work state
- worker claims / leases / heartbeats
- eventual remote runner execution

The important design rule is:

> EI-P0C introduces a **claimable execution substrate**, not a full distributed execution platform.

---

## Typed model requirements

Add or strengthen typed concepts such as:
- `WorkerPoolRecord`
- `WorkerIdentity`
- `WorkerSessionRecord`
- `TaskExecutionUnit`
- `TaskClaimRecord`
- `TaskLeaseStatus`
- `TaskLeaseHandle`
- `TaskHeartbeatRecord`
- `TaskClaimReleaseReason`
- `TaskExecutionTimeoutRecord`
- `RemoteRunnerControlRequest`
- `RemoteRunnerControlResult`
- `ExecutionWorkerSummary`
- `TaskExecutionSubstrateSummary`

The exact names may vary, but the semantics must be explicit and durable.

### Minimum typed fields to support
At minimum, support fields such as:
- task id
- execution unit id
- worker id
- worker type / runner type
- claim time
- lease expiry
- heartbeat timestamp
- claim status
- release reason
- timeout status
- local vs remote execution mode
- last runner-control result summary

All new fields should remain additive and backward-compatible.

---

## Store and persistence requirements

### Durable claimable work path
The store layer should gain additive support for:
- listing runnable execution units
- claiming work atomically where feasible within the current bounded architecture
- persisting lease state
- persisting heartbeat state
- persisting release/timeout/failure state

### Compatibility requirements
- old task data must still decode safely
- older task records without EI-P0C fields must remain readable
- restore/replay should still function when EI-P0C state is absent

### Projection requirements
The query/projection path should be able to reflect at least:
- task queued for worker execution
- task claimed by worker
- task lease expired
- task heartbeat stale
- task released back to queue
- task execution timed out
- local fallback used instead of remote execution

---

## Runtime behavior requirements

### 1. Claim lifecycle
Introduce bounded runtime behavior for:
- claim runnable work
- renew or heartbeat claim
- release claim
- requeue after claim timeout or release
- dead-letter after bounded exhaustion if consistent with existing retry policy

### 2. Local-first fallback
If remote runner or worker pool behavior is unavailable, unhealthy, or not configured:
- the system must preserve local-first safety behavior
- task truth must not become stuck in an inconsistent remote-only state
- fallback must be durable, typed, and visible

### 3. Ledger integration
Every material EI-P0C transition should append durable ledger events, for example:
- task.execution_unit.created
- task.claimed
- task.lease.renewed
- task.lease.expired
- task.released
- task.requeued.after_release
- task.execution.timeout
- task.remote_fallback_used

Exact event names may vary, but the semantics must be durable and replay-friendly.

### 4. Determinism and replay
Projection rebuild from the append-only ledger must remain deterministic.
EI-P0C must not introduce hidden mutable state that cannot be rebuilt or reconciled.

---

## API visibility requirements

Task detail/run responses should gain additive visibility for the new execution substrate state where applicable, such as:
- queued for worker pool
- claimed by worker
- lease expires at
- last heartbeat
- remote runner requested / unavailable / fallback used
- execution substrate summary

This should be concise and backward-compatible.

Do not redesign the external API broadly.

---

## Port / boundary requirements

Add or strengthen explicit boundary interfaces such as:
- `ExecutionWorkerPoolPort`
- `RemoteRunnerControlPort`
- `ExecutionClaimStorePort`

Provide at least:
- a no-op implementation
- a local durable/stub implementation
- adapter-ready structure for future remote worker control plane integration

These ports must preserve local-first operation if unconfigured.

---

## Observability requirements

Additive observability should include typed summaries for:
- queue depth of runnable work
- claimed count
- stale lease count
- fallback-to-local count
- timeout count
- dead-letter due to execution substrate issues

This does not need a full SRE stack yet.
It does need typed/runtime signals that later SLO/error-budget work can build upon.

---

## Suggested milestone breakdown

### EI-P0C-A — Typed worker/control-plane contracts
Add typed worker/session/claim/lease/heartbeat/release contracts and backward-compatible fields.

**Done when**
- typed worker/control-plane models exist
- old/new records decode safely
- additive API/contract surfaces are updated

### EI-P0C-B — Store and claim semantics
Add durable runnable-work, claim, lease, heartbeat, and release semantics to stores/adapters.

**Done when**
- runnable work can be claimed and released durably
- lease/heartbeat state persists across in-memory/Postgres/Redis adapters where applicable
- restore continuity is preserved

### EI-P0C-C — Runtime + ledger integration
Wire claim lifecycle and remote-runner fallback into runtime and ledger append behavior.

**Done when**
- claim/lease/release/timeout/fallback are durable runtime behaviors
- ledger events and projections reflect EI-P0C transitions
- local-first fallback stays authoritative

### EI-P0C-D — API/summary/tests/docs
Expose additive execution-substrate summaries and add targeted tests + docs.

**Done when**
- task/run APIs can surface execution substrate summary
- tests cover claim lifecycle, fallback, replay, and compatibility
- docs/status are updated with exact EI-P0C coverage and deferred items

---

## Required tests

Add or update tests for at least:
1. typed contract round-trip for worker/claim/lease/heartbeat/release state
2. claim lifecycle durability across memory/Postgres/Redis adapters
3. lease expiry and requeue behavior
4. deterministic replay / rebuild with EI-P0C ledger events
5. local-first fallback when remote runner path is unavailable
6. API/task response visibility for execution substrate summaries
7. process death / restore continuity for claim/lease/fallback state
8. mixed old/new history compatibility

---

## Validation commands

Run and keep green:

```bash
npm run -s typecheck
npx vitest run \
  tests/agentKernel.runtime.test.ts \
  tests/agentKernel.storeAdapters.test.ts \
  tests/agentKernel.api.test.ts \
  tests/agentKernel.events.test.ts \
  tests/agentKernel.observability.test.ts \
  tests/agentKernel.metricsExport.test.ts \
  tests/agentKernel.ledgerProjection.test.ts
```

If new targeted EI-P0C tests are introduced, include them in the validation report explicitly.

---

## Definition of done

EI-P0C is done when:
1. typed worker/control-plane contracts exist and are durable
2. runnable work can be claimed, heartbeated, released, and timed out in a bounded, additive way
3. local-first fallback remains the authoritative safety baseline
4. append-only ledger and rebuildable projections include EI-P0C execution substrate events
5. task detail/run surfaces can expose additive execution substrate summaries
6. restore/process death continuity remains intact
7. tests pass and docs/status reflect the exact remaining gaps

---

## Remaining gaps after EI-P0C

Expected open items after this slice:
- no true service-backed worker autoscaling/control plane yet
- no production remote runner fleet management yet
- no authoritative service-auth closure yet
- no full SLO/error-budget/on-call stack yet
- no broad archival/retention/version-closure yet
- no finalized tenant isolation / environment / region deployment model yet

These remain separate infrastructure workstreams and should not be forced into EI-P0C.

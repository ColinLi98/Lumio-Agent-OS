# EI-P0B - Authoritative Append-Only Ledger and Rebuildable Query Projection Scaffolding

## Why this is the next P0 slice

EI-P0A established the first serious remote-execution substrate boundary in the TypeScript service layer:
- durable retry jobs
- dead-letter records
- requeue-after-restart behavior
- local-first retry semantics
- additive API visibility for execution substrate status

That is the correct first step. It gives the system a durable execution substrate without forcing a distributed worker/control plane too early.

The next missing enterprise infrastructure boundary is:

> an authoritative append-only execution ledger with rebuildable query projections.

Without this layer, the system still depends too much on mutable state and ad hoc read models. Retry jobs now exist durably, but the product still lacks a single durable event truth that can:
- replay state transitions
- rebuild task/query views
- support durable auditability
- power future reconciliation, analytics, and service extraction
- survive schema evolution without rewriting history semantics

EI-P0B should create that foundation while preserving:
- additive compatibility
- local-first behavior
- narrow write surface
- no Android/orchestrator changes
- no orchestrator architecture rewrite

---

## Goal

Add a typed, authoritative, append-only execution ledger and rebuildable query projection scaffolding to the TypeScript `services/agent-kernel` layer.

This slice should:
1. make ledger events the durable truth for task execution state changes
2. introduce typed projection checkpoints and rebuildable query models
3. keep existing API/task responses backward-compatible
4. preserve local-first safety and current retry/dead-letter behavior
5. avoid introducing a full remote worker control plane in this slice

---

## Non-goals

Do **not** do the following in EI-P0B:
- do not build a service-backed worker pool
- do not build a remote runner control plane
- do not change Android/orchestrator behavior
- do not rewrite the current API surface broadly
- do not introduce a broad event-sourcing rewrite across the whole product
- do not remove the current retry/dead-letter substrate from EI-P0A
- do not implement full OIDC/SAML/SCIM, vault backend, connector SDK, or SRE stack in this slice

This slice is specifically about:
- durable ledger truth
- projection rebuildability
- additive compatibility

---

## Architectural direction

### Current state after EI-P0A
The system already has:
- durable retry job records
- durable dead-letter records
- additive response visibility for execution substrate state
- persistence adapters across memory/Postgres/Redis

### Required next state after EI-P0B
The system should gain:
- append-only execution ledger records
- typed ledger event families
- monotonic ordering / sequence semantics
- projection checkpoints and replay cursors
- rebuildable task/query summaries derived from ledger truth
- additive API summaries exposing ledger/projection state where useful

The ledger becomes the **authoritative write path** for meaningful task execution state changes.
Query models become **derived views**, not the source of truth.

---

## Core design principles

### 1. Ledger is authoritative, projections are disposable
The append-only ledger is the truth.
Projections must be rebuildable from ledger events.

### 2. Additive compatibility only
All new fields, tables, and summaries must remain additive and backward-compatible.
Old task payloads and older history must still decode.

### 3. Local-first remains the safety baseline
If remote infrastructure is absent, the local-first path must still work.
The ledger/projection model should strengthen local correctness, not weaken it.

### 4. Narrow write surface
Keep changes bounded primarily to:
- `services/agent-kernel`
- `api/agent-kernel/tasks`
- `tests/agentKernel*.test.ts`
- enterprise infrastructure docs/status files

### 5. Replay determinism matters
Rebuilding projections from ledger events must be deterministic.

---

## Required typed concepts

The exact names may vary, but the following concepts must exist in typed form.

### Ledger
- `ExecutionLedgerRecord`
- `ExecutionLedgerEventType`
- `ExecutionLedgerSequence`
- `ExecutionLedgerAppendResult`
- `ExecutionLedgerReadFilter`
- `ExecutionLedgerCheckpoint`
- `ExecutionLedgerCompactionHint` (optional, if useful as a future hook)

### Projection
- `TaskQueryProjection`
- `TaskProjectionState`
- `TaskProjectionCheckpoint`
- `ProjectionRebuildRequest`
- `ProjectionRebuildResult`
- `ProjectionLagSummary`
- `ProjectionSourceSummary`

### API/read-model summaries
- `ExecutionLedgerSummary`
- `TaskProjectionSummary`
- `ExecutionLedgerVisibilitySummary`

### Compatibility / provenance
- `LedgerSourceSummary`
- `ProjectionCompatibilityState`

---

## Required ledger event families

At minimum, define typed event families for meaningful execution transitions such as:
- `TASK_CREATED`
- `TASK_UPDATED`
- `TASK_STARTED`
- `TASK_COMPLETED`
- `TASK_FAILED`
- `TASK_RETRY_SCHEDULED`
- `TASK_RETRY_REQUEUED`
- `TASK_DEAD_LETTERED`
- `TASK_SELECTION_MADE` (if selection/decision durability is already present)
- `TASK_EXECUTION_SUBSTRATE_UPDATED`

Exact names may vary, but the family must be explicit and durable.

Not every derived display field needs its own ledger event.
Only material execution-truth transitions should enter the authoritative ledger.

---

## Required persistence additions

### Postgres / SQL path
Add additive tables and indexes for:
- append-only execution ledger
- projection checkpoint state
- optional projection materialized summaries if needed for query performance

### Memory / Redis path
Add equivalent structures so test and local adapter behavior remain aligned.

### Key requirements
- append-only ledger semantics
- monotonic sequence or ordering key
- efficient read by task id / time / sequence
- efficient checkpoint storage by projection name

---

## Runtime behavior requirements

### A. Authoritative append path
Whenever a material task execution transition occurs, the runtime should:
1. append a typed ledger event
2. update or advance the relevant projection(s)
3. preserve existing response behavior unless explicitly extended additively

### B. Projection rebuild path
The system must support replaying ledger records into rebuildable projections.
At minimum, support:
- full rebuild from start
- rebuild from checkpoint
- replay after process death

### C. Restart / restore continuity
After process death or restart:
- ledger records remain authoritative
- projection checkpoints restore correctly
- projections can catch up deterministically
- retry/dead-letter truth from EI-P0A remains intact

### D. API compatibility
Task API responses should remain backward-compatible.
Optional additive fields may expose:
- ledger summary
- projection summary
- last ledger sequence
- projection lag summary

### E. No state truth split
Do not create a situation where:
- mutable task state says one thing
- ledger says another
- projection says a third

If dual-write is temporarily necessary during transition, the ledger should still be treated as the intended long-term source of truth.

---

## Suggested milestone breakdown

### EI-P0B-A - Typed ledger contracts
Add typed ledger and projection contracts in the service-layer contracts.

**Done when**
- ledger/projection concepts are typed
- additive compatibility is preserved
- tests for contract round-trip are added

### EI-P0B-B - Durable append-only ledger persistence
Add additive persistence for the ledger and checkpoints across memory/Postgres/Redis.

**Done when**
- ledger events persist durably
- checkpoints persist durably
- old/new mixed state still restores

### EI-P0B-C - Projection build/rebuild flow
Implement projection derivation and deterministic replay/rebuild behavior.

**Done when**
- projection views can be rebuilt from ledger events
- restart/recovery preserves correctness
- replay determinism is tested

### EI-P0B-D - Additive API visibility + docs/tests
Expose additive summaries and finish validation coverage.

**Done when**
- task responses can optionally surface ledger/projection summaries
- docs/status reflect exact scope
- all required tests pass

---

## Required tests

Add or update tests for at least the following:

### Contract compatibility
- ledger/projection round-trip serialization
- mixed old/new history decode

### Runtime behavior
- material transitions append the correct ledger records
- retry/dead-letter transitions produce authoritative ledger events
- projection state updates deterministically from ledger events
- projection rebuild from checkpoint produces the same result as full replay
- selection/execution summaries remain backward-compatible

### Persistence continuity
- ledger survives process death
- checkpoints survive process death
- projection rebuild after restart is correct
- old/new mixed persisted state restores safely

### API behavior
- task response stays backward-compatible
- optional ledger/projection block renders correctly when present

---

## Validation commands

Run and fix failures before marking complete:

```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts
```

If new tests are added for the ledger/projection work, include them in the validation summary explicitly.

---

## Definition of done

EI-P0B is done when:
1. an append-only authoritative execution ledger exists in typed/service-layer form
2. material task execution transitions append durable ledger records
3. projection checkpoints and rebuildable query models exist
4. replay/rebuild after restore is deterministic and tested
5. API behavior remains backward-compatible with additive summaries only
6. EI-P0A retry/dead-letter behavior continues to work on top of the new ledger truth
7. docs/status/workstreams are updated with exact remaining gaps

---

## Remaining gaps after EI-P0B

After this slice, the next most important infrastructure gaps should still be considered open:
- service-backed worker pool / remote runner control plane
- production OIDC/SAML/SCIM and service-auth closure
- production vault lease/renew/rotate/revoke backend
- hardened connector SDK and conformance suite
- SLO/error-budget/tracing/on-call stack
- executable retention/deletion/legal-hold engine
- finalized tenant isolation, environment strategy, and region deployment model

The next most natural infrastructure slice after EI-P0B is:

## EI-P0C - service-backed worker pool and remote runner control plane scaffolding

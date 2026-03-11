# M5 - Versioned Proof Ledger + History Hardening

## Why M5 now

M0 through M4 established a strong role-aware Agent OS foundation:
- role-aware execution is now a real runtime capability
- Role Contract v1 compliance is hardened
- receipts and explainability are visible in the product
- external fulfillment is role-aware and contract-oriented
- users can now edit bounded role policies

This changes the primary system requirement.
The next most important problem is no longer "can the system make role-aware decisions?"
It is now:

**Can the system durably prove which policy version, role context, approval scope, provider decision, and proof chain were in effect when each run happened?**

Without this step, the product risks three failures:
1. **Audit ambiguity** - after a policy edit, past runs may become hard to interpret
2. **History fragility** - current receipt/history behavior is additive and workable, but not yet a durable ledger
3. **Governance limits** - dispute handling, rollback analysis, and trust reporting remain weaker than the runtime itself

M5 addresses this by turning receipts and execution history into a versioned, durable, queryable proof ledger.

---

## M5 goal

Create a versioned, durable proof-ledger layer for execution history so that every material run can be reconstructed with:
- the role and role source used
- the effective policy snapshot used at decision time
- the delegation mode in force
- approvals requested and granted
- data scope sent externally
- provider selection / denial reasons
- proof and verification outcomes
- rollback / dispute events

This must survive restore, replay, product upgrades, and later policy edits.

---

## Product outcome

After M5, the system should be able to answer questions like:
- Which role policy version approved this run?
- What exact provider-facing data scope was used?
- Which policy override changed the decision?
- Was the provider denied for trust, cost, compliance, or data reasons?
- What proof was returned and how was it verified?
- Was rollback available or triggered?
- Did the user later edit the role policy, and if so, what was true at the time of execution?

This milestone is primarily infrastructure and product-trust work, not a broad visual redesign.

---

## In scope

### 1. Versioned policy snapshots
Introduce a durable snapshot concept so that each material run can reference the effective role policy at execution time.

At minimum capture:
- active role
- role source
- delegation mode
- effective approval thresholds
- external fulfillment preference
- provider trust/block rules relevant to the run
- sharing mode / allowed scopes / cloud sync policy relevant to the run
- policy override source if applicable
- policy version or deterministic snapshot hash

### 2. Durable receipt / ledger storage
Strengthen history from additive runtime payloads into a durable proof-ledger model.

Add or strengthen durable storage for:
- execution receipts
- run events
- policy snapshots or policy snapshot references
- provider decision records
- verification records
- rollback / dispute records

This may be implemented incrementally.
Do not require a full backend rewrite.

### 3. Event model hardening
Introduce or strengthen append-only event recording for material execution steps.

Preferred event families include:
- role_selected
- role_source_resolved
- role_policy_snapshot_bound
- role_policy_override_applied
- approval_requested
- approval_granted
- approval_denied
- quote_collected
- provider_selected
- provider_denied
- data_scope_reduced
- data_scope_blocked
- proof_received
- verification_passed
- verification_failed
- rollback_available
- rollback_triggered
- dispute_opened
- dispute_synced
- sync_pending
- sync_resolved

### 4. Receipt snapshot integrity
Ensure receipts are tied to the effective decision-time snapshot, not to mutable current settings.

Past receipts must never be reinterpreted using a later edited role policy.

### 5. Replay / restore hardening
Strengthen replay and restore so the system can reconstruct material historical state.

At minimum preserve or reconstruct:
- active role
- role source
- delegation mode
- effective policy snapshot reference
- provider decision summary
- proof / verification / rollback summary

### 6. Query and inspection readiness
Prepare history for future filtering and governance workflows.

At minimum, the ledger should be queryable by:
- run id
- role
- provider
- approval state
- verification state
- dispute / rollback state
- policy version / snapshot id

This does not require shipping a full user-facing query UI in this pass.

---

## Out of scope

- full orchestrator rewrite
- free-form policy DSL
- unlimited custom role creation
- full settlement engine implementation
- broad marketplace backend redesign
- complete analytics platform rollout
- major visual redesign
- replacing all existing history UI with a brand new navigation model

---

## Typed model direction

Exact names may vary, but introduce or strengthen typed concepts equivalent to:
- `PolicySnapshotId`
- `RolePolicySnapshot`
- `ExecutionReceiptRecord`
- `RunEventRecord`
- `ProviderDecisionRecord`
- `VerificationRecord`
- `RollbackRecord`
- `DisputeRecord`
- `LedgerQueryFilter`
- `ReceiptSnapshotBinding`

### Required semantics

#### `RolePolicySnapshot`
Must represent the effective policy state used at execution time, not just a pointer to mutable current settings.

#### `ExecutionReceiptRecord`
Must be durable and reconstructable.
It should not depend solely on transient UI payloads.

#### `RunEventRecord`
Must use stable event types and timestamps suitable for replay and audit.

---

## Runtime requirements

### 1. Snapshot binding at decision time
When a material run begins, or when a material policy-relevant step occurs, bind the run to an effective policy snapshot.

Important:
- later edits must not mutate past snapshot meaning
- explicit task constraints still override role defaults
- role policy snapshot must capture only what was relevant/effective, not necessarily every possible field

### 2. Decision-time provider record
When provider selection or denial happens, persist a structured provider decision record.

At minimum record:
- candidate set or compared provider subset if available
- selected provider
- denied providers if materially relevant
- canonical reason codes
- role-aware ranking factors that materially changed the outcome
- quote / proof / rollback expectations if applicable

### 3. Verification and rollback durability
Verification and rollback/dispute outcomes must be written to durable records, not only surfaced through transient receipts.

### 4. Immutable historical semantics
Past runs must remain interpretable even after:
- role policy edits
- app restart
- process death
- UI formatter changes
- future field additions

---

## Storage / migration guidance

This milestone is the right place to begin the previously deferred history/storage hardening.

Preferred approach:
- additive schema evolution
- versioned records
- backward-compatible read path
- migration strategy that preserves existing receipt-first UX while introducing durable records underneath

If using Room or local storage tables, favor:
- additive tables or additive columns first
- migration scripts that preserve old history rows
- read adapters that can interpret both old and new history representations during transition

Avoid a risky big-bang history replacement.

---

## UI expectations for M5

M5 is not a major UI redesign, but the product should benefit from stronger integrity and traceability.

Expected visible improvements may include:
- receipts that remain stable after policy edits
- more reliable replay / history detail
- clearer display of policy version or snapshot-derived explanations where appropriate
- stronger dispute / rollback continuity in Activity/history

Do not make M5 a cosmetic pass.

---

## Telemetry / governance expectations

This pass should prepare or improve metrics for governance and trust reporting.

Suggested metrics:
- `policy_snapshot_bind_rate`
- `historical_receipt_reconstruction_success_rate`
- `provider_decision_record_coverage`
- `verification_record_coverage`
- `rollback_record_coverage`
- `dispute_record_coverage`
- `receipt_replay_integrity_rate`
- `history_migration_read_success_rate`
- `policy_edit_after_run_traceability_rate`

A full analytics platform rollout may remain deferred, but the runtime should emit or support these signals.

---

## Required test scenarios

### M5-S1 - policy edit does not rewrite past receipt meaning
1. run a task under one role policy
2. edit the role policy
3. reopen the old receipt/history
4. verify the old run still reflects the old effective snapshot

### M5-S2 - restore / replay reconstructs role + policy snapshot
1. execute a role-aware run
2. persist state
3. simulate process death / restore
4. verify receipt and history still reconstruct role, source, policy snapshot, and decision summaries

### M5-S3 - provider decision remains auditable
1. run an external fulfillment case
2. confirm selected and denied provider reasoning is durably stored
3. verify replay/history still shows a consistent explanation

### M5-S4 - verification and rollback chain persists
1. run a verification-success or verification-failure flow
2. trigger rollback/dispute if applicable
3. verify all material events persist and replay coherently

### M5-S5 - mixed old/new history compatibility
1. keep existing pre-M5 history data
2. read old entries and new ledger-backed entries
3. verify the app remains functional and traceable during migration

### M5-S6 - explicit task constraint still wins over edited role policy
1. create a user-edited role policy
2. run a task with explicit constraints that conflict
3. verify the historical record captures that task constraint precedence won

---

## Milestones

### M5A - Snapshot model and binding
- add typed policy snapshot concepts
- bind snapshots to runs / receipts / material decisions
- keep changes backward-compatible

### M5B - Durable ledger records
- introduce durable records for receipts/events/provider decisions/verification/rollback-dispute
- keep old history readable

### M5C - Replay / restore / migration hardening
- restore and replay using durable records
- additive migration strategy
- compatibility for old and new history data

### M5D - Tests / telemetry / docs
- implement required scenarios
- add governance-oriented counters/coverage where practical
- update docs/status with exact M5 compliance mapping

---

## Definition of done

M5 is done when:
1. material runs bind to a durable effective policy snapshot
2. past receipts remain interpretable after later role-policy edits
3. receipts/events/provider decisions/verification/rollback-dispute have durable records or equivalent durable backing
4. replay and restore can reconstruct role, source, delegation, policy snapshot, provider decision, and proof/verification chain where applicable
5. old and new history can coexist during migration without breaking the product
6. required M5 scenarios are implemented and passing
7. docs/status clearly map what is durable, what is still additive, and what remains deferred

---

## Recommended execution rules for Codex

- keep diffs tightly scoped
- prefer additive, backward-compatible changes
- do not rewrite the entire history architecture in one pass
- do not turn this into a cosmetic UI pass
- preserve all current M0-M4 behavior
- favor stable typed records and adapters over ad-hoc string persistence
- keep receipts and explanations human-readable in English


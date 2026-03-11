# M7 - Settlement / Dispute / Marketplace Infra Deeper Pass

## Why M7 now

The platform now has:
- role-aware runtime execution
- Role Contract hardening
- receipt-first explainability
- role-aware external fulfillment
- UI surfacing for external decisions and issue states
- guided role policy editing
- versioned proof ledger / durable history
- governance analytics over the ledger

The next meaningful gap is not more UI or more role features. It is the backend durability of post-decision execution outcomes:
- settlement
- rollback finality
- dispute lifecycle
- sync/reconciliation with external systems
- provider-side acknowledgement / mismatch handling
- durable retry semantics

M7 should turn the current execution/dispute behavior into a stronger infrastructure layer for external fulfillment.

This is not a wording pass. This is not a marketplace browsing pass. This is a typed/runtime/ledger/infrastructure pass.

---

## Core objective

Turn settlement, rollback, dispute, and sync-reconciliation into durable first-class infrastructure for external fulfillment.

By the end of M7, the system should be able to answer for any material external run:
- what was selected
- what was committed
- what remains provisional / sync-pending
- whether rollback is possible / requested / completed
- whether a dispute exists
- what remote acknowledgement state is known
- what retries or reconciliation attempts happened
- what the current authoritative local state is

---

## In scope

### 1. Typed settlement / dispute / reconciliation models
Add or strengthen typed models such as:
- `SettlementRecord`
- `SettlementAttempt`
- `SettlementStatus`
- `SettlementReconciliationResult`
- `SettlementSyncState`
- `DisputeCaseRecord`
- `DisputeStatus`
- `DisputeEventRecord`
- `RollbackAttemptRecord`
- `RollbackOutcome`
- `ProviderAckRecord`
- `MarketplaceSyncIssue`
- `MarketplaceReconciliationSummary`

The exact naming may vary, but the concepts must be explicit and durable.

### 2. Idempotent settlement lifecycle
Strengthen the lifecycle around commit / finalize / rollback / dispute.

Requirements:
- material external runs have durable settlement state
- retries are idempotent
- repeated callbacks do not duplicate final outcomes
- local authoritative state remains coherent during partial remote failure
- sync-pending is not treated as successful final settlement

### 3. Dispute lifecycle hardening
Move from a basic dispute-visible state into a more durable dispute model.

Support at least:
- dispute opened
- dispute pending sync / submission
- dispute acknowledged
- dispute under review
- dispute resolved
- dispute closed

Requirements:
- dispute reason and evidence references must be durable
- dispute events must append to ledger/history
- dispute state changes must preserve earlier receipts, not rewrite them

### 4. Rollback durability
Rollback should become more than a display summary.

Requirements:
- rollback attempts must be recorded durably
- rollback success/failure/pending states must be explicit
- rollback may depend on provider ack / remote sync result
- rollback availability and finality must be reflected in receipts and ledger

### 5. Remote acknowledgement and reconciliation
Introduce stronger handling for mismatch between local and remote states.

Examples:
- local dispute opened but provider/gateway ack not yet received
- local rollback requested but provider reports already committed
- local settlement marked provisional while remote callback is delayed
- duplicate remote callback / late callback / conflicting callback

Requirements:
- preserve local durable state
- record reconciliation attempts and outcomes
- surface mismatch summaries in receipts/activity where relevant
- do not silently collapse disagreement into a misleading final state

### 6. Ledger integration
All meaningful settlement/dispute/rollback/reconciliation changes must append to the durable proof ledger.

At minimum, add or strengthen event recording for:
- settlement_started
- settlement_committed
- settlement_sync_pending
- settlement_reconciled
- provider_ack_received
- rollback_requested
- rollback_completed
- rollback_failed
- dispute_opened
- dispute_sync_pending
- dispute_acknowledged
- dispute_resolved
- dispute_closed
- reconciliation_mismatch_detected
- reconciliation_retry_scheduled

### 7. Query / filter support
Add or strengthen minimal typed queries for operational use.

Examples:
- by settlement status
- by dispute status
- by provider
- by sync-pending flag
- by role
- by policy snapshot version
- by reason-code family
- by unresolved reconciliation issue

This may initially remain local/in-process if that matches the current architecture.

### 8. Receipt / activity integration
M7 must preserve the receipt-first product direction.

Requirements:
- receipts must show settlement/dispute state coherently
- sync-pending and reconciliation mismatch must be readable
- rollback outcomes must be visible
- dispute timeline items must be representable in activity/history

---

## Out of scope

Do not do the following in M7:
- no orchestrator rewrite
- no full payment processor integration overhaul
- no broad settlement engine for financial rails beyond current product need
- no full operator console buildout (deeper operator workflows belong in M8)
- no broad visual redesign
- no unlimited marketplace/provider onboarding redesign
- no free-form policy DSL
- no history/storage architecture rewrite beyond additive durability needed for M7

---

## Product and architecture principles

1. **Local authoritative state must remain durable even when remote sync is incomplete.**
2. **Receipts and ledger entries are append-oriented; later reconciliation must not erase the historical path.**
3. **Repeated retries and callbacks must be idempotent.**
4. **Mismatch between local and remote state must be explicit, not flattened.**
5. **Role, policy snapshot, and provider decision context must remain attached to settlement/dispute records where relevant.**
6. **Backward compatibility must be preserved where practical.**

---

## Suggested milestone breakdown

### M7A - Typed settlement and dispute durability
Add the typed models and durable record paths.

Done when:
- settlement / rollback / dispute records exist as typed durable objects
- existing flows can bind to them without breaking compatibility
- local durable records exist even when remote sync is pending

### M7B - Idempotency and reconciliation
Add idempotent commit/rollback/dispute handling plus remote acknowledgement tracking.

Done when:
- duplicate callbacks do not duplicate final state
- retry semantics are explicit
- mismatch between local and remote can be represented durably

### M7C - Receipt and ledger integration
Push settlement/dispute/reconciliation deeper into receipts and ledger events.

Done when:
- receipts show meaningful settlement/dispute outcomes
- activity/history can display sync-pending, rollback, and dispute progression clearly
- ledger queries can filter unresolved settlement/dispute issues

### M7D - Tests, telemetry, docs
Add scenario tests, compatibility checks, and status updates.

Done when:
- core scenarios are covered
- docs/status are updated with exact compliance mapping
- telemetry keys or aggregations exist for settlement/dispute quality where appropriate

---

## Required scenario coverage

At minimum, add or update tests for:

1. **duplicate provider callback idempotency**
   - repeated remote ack does not duplicate settlement/dispute transitions

2. **local dispute with delayed remote acknowledgement**
   - local state remains disputed
   - sync pending persists until reconciliation

3. **rollback requested but remote system disagrees**
   - mismatch is recorded explicitly
   - receipt reflects unresolved reconciliation

4. **provider commit then late rollback failure**
   - final state remains coherent
   - rollback failure is durably visible

5. **receipt/ledger historical preservation**
   - later policy edits do not rewrite prior settlement/dispute semantics

6. **query/filter coverage**
   - unresolved disputes and sync-pending runs are discoverable through typed query/filter paths

7. **process death / restore continuity**
   - settlement/dispute/rollback records survive restore and remain linked to receipts/ledger

8. **legacy compatibility**
   - older records without full M7 data continue to load without breakage

---

## Suggested telemetry / governance additions

Where practical, add typed local governance metrics or reserved keys for:
- `settlement_sync_pending_rate`
- `settlement_reconciliation_mismatch_rate`
- `duplicate_callback_ignored_rate`
- `rollback_success_rate`
- `rollback_failure_rate`
- `dispute_open_rate`
- `dispute_ack_delay_rate`
- `dispute_resolution_rate`
- `unresolved_dispute_backlog`
- `provider_ack_timeout_rate`

These may remain local/in-process in this pass if remote telemetry is still deferred.

---

## Definition of done

M7 is done when:

1. Settlement, rollback, dispute, and reconciliation are represented as durable typed runtime objects.  
2. Local authoritative state remains coherent under remote delay, retry, and callback duplication.  
3. Receipts and ledger entries preserve settlement/dispute history without rewriting earlier steps.  
4. Rollback/dispute/sync-pending/reconciliation states are readable in product surfaces already using receipts/activity.  
5. Typed query/filter support exists for unresolved or problematic external runs.  
6. Scenario tests cover idempotency, delayed ack, mismatch, rollback failure, restore continuity, and compatibility.  
7. Docs/status are updated with exact M7 scope completion and deferred items.  

---

## Recommended validation commands

Run relevant commands after each batch and repair failures before continuing:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

Add any new settlement/dispute-specific tests to this list as they are introduced.

---

## Delivery expectations

At the end of the run, report:
- changed files
- typed model additions
- runtime behavior changes
- receipt/ledger changes
- reconciliation / idempotency changes
- tests added/updated
- remaining deferred items
- blockers, if any

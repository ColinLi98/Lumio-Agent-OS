# M9 - Remote Telemetry, Alert Delivery, and Reconciliation Services Extraction

## Why M9 now

The system now has all of the following working locally and durably:

- role-aware runtime behavior
- Role Contract v1 hardening
- explainability and receiptization
- role-aware external fulfillment
- UI surfacing for external execution and issue states
- guided role policy editing
- versioned proof ledger and durable history
- governance analytics and typed aggregation
- operator workflows, alerts, and governance console
- settlement, dispute, reconciliation, and idempotent callback hardening

The next step is not more product surface area. The next step is to make the existing governance and operations layer extraction-ready for remote sinks and remote operators.

M9 turns the current local-first governance stack into a remote-ready architecture for:

- telemetry export
- alert delivery
- reconciliation job extraction
- remote handoff and retry tracking

This is not a full remote backend rewrite. It is a typed, additive extraction pass.

---

## Goal

Make governance metrics, operator alerts, and reconciliation workstreams exportable and remotely deliverable through typed, durable, retryable service boundaries, while preserving the current local-first behavior as the default.

---

## Product / system outcome

After M9:

1. Governance telemetry can be emitted through a typed sink, not only consumed in-process.
2. Governance alerts can be routed through a typed delivery pipeline, not only shown locally.
3. Reconciliation work can be represented as durable jobs with retry and handoff state.
4. Remote delivery and remote sync status become visible in operator surfaces and ledger traces.
5. The current app remains functional without a remote backend, using safe local or no-op implementations.

---

## In scope

### 1. Typed remote telemetry extraction
Add typed contracts and boundaries for remote-ready telemetry emission from durable ledger / governance aggregates.

### 2. Typed alert delivery extraction
Add typed contracts and boundaries for alert routing and delivery tracking.

### 3. Typed reconciliation job extraction
Represent unresolved/sync-pending/provider-issue cases as durable reconciliation jobs that can be retried, handed off, or marked blocked.

### 4. Local-first compatible adapters
Provide safe default adapters:
- no-op
- local in-memory
- local durable queue / export state

Optional cloud/webhook stubs are acceptable if they remain feature-gated and additive.

### 5. Operator traceability
Expose remote handoff / delivery / retry state in internal operator surfaces, receipts, or governance detail views where appropriate.

---

## Out of scope

- full remote operator backend implementation
- full multi-operator RBAC / permission model
- full Slack / CRM / ticketing production integration
- full payment rail or settlement backend rebuild
- orchestrator rewrite
- Room schema rewrite unless absolutely necessary
- broad end-user UI redesign
- replacing the local-first default behavior

---

## Principles

1. **Local-first remains the default.**
   The app must continue to function without remote services.

2. **Typed before integrated.**
   Introduce stable contracts and durable records before deep vendor-specific integration.

3. **Durable and idempotent.**
   Remote delivery attempts, retries, and failures must be queryable and deduplicated.

4. **Backward-compatible.**
   Old payloads, receipt records, and mixed history should remain readable.

5. **Operator-visible.**
   Remote/export state must be visible enough to debug, not hidden as silent background behavior.

---

## Required typed model additions

Introduce or strengthen typed concepts along these lines. Exact names may vary, but the concepts must exist explicitly.

### Telemetry
- `GovernanceTelemetryEnvelope`
- `GovernanceTelemetryBatch`
- `TelemetryDeliveryStatus`
- `TelemetryDeliveryAttempt`
- `TelemetrySinkTarget`
- `TelemetryEmissionRecord`

### Alerts
- `AlertDeliveryChannel`
- `AlertDeliveryTarget`
- `AlertDispatchRequest`
- `AlertDispatchAttempt`
- `AlertDispatchStatus`
- `AlertDeliveryRecord`

### Reconciliation services
- `ReconciliationJobStatus`
- `ReconciliationJobType`
- `ReconciliationJobRecord`
- `ReconciliationRetryPolicy`
- `ReconciliationDispatchAttempt`
- `RemoteSyncHandoffStatus`

### Shared operator / service visibility
- `RemoteDeliveryIssue`
- `RemotePipelineSummary`
- `RemotePipelineFilter`

These must integrate cleanly with existing receipt / ledger / governance / operator models.

---

## Runtime behavior requirements

### A. Telemetry extraction
Governance summaries and durable ledger signals should be convertible into typed telemetry envelopes.

At minimum support emission of:
- role-based aggregate counts
- provider issue counts
- unresolved / sync-pending / mismatch counts
- verification / rollback / dispute quality counts
- policy snapshot related friction summaries
- reason-code family buckets

Emission requirements:
- additive
- feature-gated if necessary
- safe when remote sink is unavailable
- durable enough to preserve failed attempts or pending batches

### B. Alert delivery extraction
Governance alerts should be dispatchable through a typed alert delivery pipeline.

At minimum support:
- alert routing to one or more targets
- severity
- alert category / queue context
- deduplication key
- delivery status
- retry count
- last attempt summary

When remote delivery is unavailable:
- keep durable local record
- expose pending/failed state
- do not lose the alert silently

### C. Reconciliation job extraction
Unresolved, sync-pending, provider-issue, mismatch, and retry-worthy cases should be representable as durable jobs.

At minimum support:
- job type
- source case / run / provider linkage
- current status
- retry state
- remote handoff state
- last error summary
- next suggested action

### D. Idempotency and deduplication
Remote attempts must not create duplicate durable outcomes.

At minimum:
- repeated telemetry emission for same durable batch should be deduplicated or coalesced
- repeated alert dispatch attempts should preserve trail, not duplicate final state incorrectly
- repeated reconciliation retry requests should be idempotent per target case / job when applicable

---

## UI / operator surface requirements

This pass is not a broad UI redesign, but internal/governance surfaces should expose enough remote pipeline state to be useful.

Add or strengthen internal/debug/operator visibility for:
- telemetry pending / delivered / failed state
- alert pending / delivered / failed state
- reconciliation job pending / in-progress / blocked / retrying / handed-off state
- last remote error summary where available
- export / handoff timestamps

Prefer concise English summaries such as:
- `Telemetry export pending`
- `Alert delivery failed`
- `Reconciliation handoff pending`
- `Remote retry requested`
- `Remote pipeline unavailable`

---

## Suggested reason code families

Introduce canonical reason code families where appropriate. Exact codes may vary, but the family structure should be explicit.

- `ROLE_REMOTE_TELEMETRY_*`
- `ROLE_ALERT_DELIVERY_*`
- `ROLE_RECONCILIATION_JOB_*`
- `ROLE_REMOTE_HANDOFF_*`
- `ROLE_REMOTE_RETRY_*`
- `ROLE_REMOTE_PIPELINE_*`

Examples:
- `ROLE_REMOTE_TELEMETRY_BATCH_QUEUED`
- `ROLE_REMOTE_TELEMETRY_DELIVERY_FAILED`
- `ROLE_ALERT_DELIVERY_RETRY_SCHEDULED`
- `ROLE_RECONCILIATION_JOB_CREATED`
- `ROLE_REMOTE_HANDOFF_PENDING`
- `ROLE_REMOTE_RETRY_REQUESTED`

---

## Persistence and compatibility requirements

- keep all new fields additive and optional where compatibility matters
- persist remote delivery attempts and job state through process death / restore
- support old/new mixed history and receipt records
- do not reinterpret old receipts as remotely delivered if they were not
- preserve local truth even when remote export state is missing or failed

---

## Suggested implementation structure

### M9A - Typed service boundaries
Add typed models and interfaces/ports for:
- telemetry sink
- alert delivery sink
- reconciliation job dispatch / retry

Provide safe default implementations:
- no-op
- local durable recording
- optional stub adapter if a cloud hook already exists

### M9B - Durable attempt tracking
Track emission/dispatch/handoff attempts durably.

Requirements:
- attempt counts
- last status
- last error summary
- timestamps
- dedupe / idempotency key where relevant

### M9C - Operator visibility
Expose remote pipeline status in governance/operator detail views and formatters.

At minimum:
- queue/state summary
- delivery status
- retry visibility
- handoff state

### M9D - Tests, docs, and compatibility
Add tests for:
- contract encode/decode
- mixed old/new history compatibility
- telemetry deduplication
- alert dispatch retry state
- reconciliation job persistence / restore
- operator-visible summary formatting

Update docs/spec/plan/status with exact M9 compliance mapping and deferred items.

---

## Test requirements

Add or update tests covering at least:

1. telemetry envelope round-trip compatibility
2. governance summary -> telemetry batch extraction
3. alert dispatch durable retry trail
4. repeated telemetry/export attempts do not duplicate final durable outcomes incorrectly
5. reconciliation job creation from unresolved/sync-pending/provider-issue cases
6. process death / restore continuity for remote attempts and reconciliation jobs
7. operator formatter / summary visibility for remote pipeline states
8. old/new mixed history remains readable

---

## Validation commands

Run and fix failures before finishing:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

If new formatter / operator / telemetry tests are added, run those explicitly as well.

---

## Definition of done

M9 is done when:

1. Governance telemetry can be emitted through typed remote-ready envelopes and durable delivery tracking.
2. Governance alerts can be dispatched through typed delivery contracts with retry/delivery state.
3. Reconciliation work is represented as durable jobs with retry/handoff state.
4. Remote/export state is visible in operator/internal surfaces in readable English.
5. Process death / restore preserves remote delivery and reconciliation job continuity where applicable.
6. Old/new mixed history remains compatible.
7. Tests cover telemetry extraction, alert delivery tracking, reconciliation job persistence, operator visibility, and compatibility.
8. Docs/status are updated with exact scope completed and deferred items.

---

## Deferred by design

Still deferred after M9 unless a minimal hook is required:
- full remote SaaS ops backend
- multi-operator permissions / collaboration model
- production Slack / ticketing / CRM integration
- full remote alert routing rules engine
- full storage/backend extraction from local-first runtime

---

## Expected final report

At the end of the run, report:
- changed files
- typed model additions
- runtime/service boundary additions
- persistence / compatibility changes
- operator-visible remote/export changes
- tests run
- deferred items
- blockers if any

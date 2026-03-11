# M2: Explainability + Activity Receiptization

## Status and intent

This document defines the M2 implementation pass for Lumi Agent OS after:
- M0: core role-aware architecture
- M1: Role Contract v1 compliance hardening

M2 is not a new architecture pass. It is a productization pass.
The goal is to turn the newly hardened role-aware execution system into a readable, auditable, user-trust surface.

The core shift for this milestone is:
- from generic history to execution receipts
- from hidden policy behavior to readable explanations
- from internal role traces to user-visible trust artifacts

This pass must remain incremental and backward-compatible.
Do not rewrite the orchestrator. Do not redesign the entire history stack. Do not introduce a broad UI redesign.

## Why this milestone exists

M0 established that role-aware execution is a real runtime capability.
M1 established typed role provenance, reason codes, continuity, traceability, and compliance hardening.

M2 must answer the next product question:

**Can a user, operator, or reviewer understand what the system did, under which role and policy, with what approval and data-sharing scope, and what proof or rollback path exists?**

This is the trust surface that distinguishes an Agent OS from a generic AI application.

## Primary goal

Every material run should be able to produce a readable, role-aware execution receipt.

The receipt should make it easy to answer:
1. What was the system trying to do?
2. Which role was active?
3. Where did that role come from?
4. Which role or policy rules materially affected the run?
5. Was approval required, granted, denied, or skipped?
6. What data scope was used or restricted?
7. Which provider or capability was selected or blocked?
8. What verification, proof, or rollback information exists?

## Product principles

1. **Receipt-first, not chat-first**
   Activity should evolve from generic message history toward execution receipts and material execution events.

2. **Readable English, not debug jargon**
   User-facing explanations must be concise, natural, and suitable for US and European markets.

3. **Reason codes remain structured, explanations remain human**
   Canonical `ROLE_*` reason codes are the structured source of truth. User-visible text should be generated from that structure, not from scattered ad-hoc strings.

4. **Success and failure paths matter equally**
   Approval denial, provider denial, verification failure, rollback availability, and dispute-like states must be explainable, not only successful completion.

5. **Backward-compatible evolution**
   Prefer additive models and rendering paths. Reuse the role trace and task-track work introduced in M1.

## In scope

### 1. Typed receipt model
Introduce a typed receipt object or equivalent typed structure. The exact class name may vary, but it must behave as a stable product-level execution summary.

Recommended name:
- `ExecutionReceipt`

Minimum fields:
- `runId`
- `intentSummary`
- `status`
- `activeRole`
- `roleSource`
- `delegationMode`
- `roleImpactReasonCodes`
- `roleImpactSummary`
- `approvalSummary`
- `dataScopeSummary`
- `providerSummary`
- `verificationSummary`
- `proofSummary`
- `rollbackSummary`
- `startedAt`
- `updatedAt`
- `completedAt` (nullable)

Recommended optional fields:
- `roleChangeReason`
- `selectedCapabilityIds`
- `blockedCapabilityIds`
- `selectedProviderId`
- `proofLinks`
- `artifactReferences`
- `nextActionSummary`
- `issueSummary`

This object may initially be derived from existing response, task-track, and activity data rather than requiring a new storage backend.

### 2. Activity receiptization
Refactor Activity so that material execution events can be rendered as receipt-oriented items rather than generic history-only items.

Preferred activity item families:
- `Run started`
- `Role applied`
- `Approval required`
- `Approval granted`
- `Approval denied`
- `Data sharing limited`
- `Provider selected`
- `Provider blocked`
- `Execution started`
- `Verification passed`
- `Verification failed`
- `Result delivered`
- `Rollback available`
- `Rolled back`
- `Issue detected`

Not every run needs every item. But every material run should produce a coherent receipt summary.

### 3. Readable explainability surfaces
Expose role-aware explanations in these surfaces where applicable:
- Activity feed items
- response cards
- execution panel / chat execution surface
- export summary or shareable summary if such a surface already exists

Minimum explanation elements where relevant:
- active role
- role source
- delegation mode
- concise role impact statement
- approval outcome summary
- data scope summary
- provider selection or denial summary
- verification or proof summary

### 4. Failure and denial coverage
Receipt behavior must cover more than success states.
At minimum, support coherent receipt summaries for:
- approval denied
- data scope restricted or blocked
- provider rejected by policy
- verification failed
- rollback available
- rolled back
- issue or dispute-like states if already represented

### 5. Persistence and continuity for receipt traceability
Where receipt data is derived from run state, task-track, or dynamic persistence, ensure that restore/resume flows retain enough information to keep receipt explanations coherent.

This does **not** require a full history-storage rewrite in this pass.

## Out of scope

Do not do the following in M2:
- full proof-ledger backend rewrite
- Room history-table schema migration unless strictly necessary
- custom role policy editor
- large visual redesign
- orchestrator rewrite
- broad external-fulfillment backend redesign
- large expansion of built-in roles

## Receipt model requirements

### A. Execution receipt must be role-aware
Every material receipt must be able to represent:
- active role
- role source
- delegation mode
- meaningful role impact

If there was no material role impact, the receipt may say so explicitly, but the system should still retain the role context.

### B. Execution receipt must be policy-aware
Where applicable, the receipt should explain whether:
- approval was required by policy
- a data-sharing scope was reduced by policy
- a provider was rejected by policy
- ranking was influenced by role or policy

### C. Execution receipt must be proof-aware
Where proof or verification exists, the receipt should summarize:
- verification state
- proof availability
- proof references or artifacts where already supported
- rollback availability

### D. Execution receipt must stay readable
Do not dump raw reason-code arrays directly into user-facing UI.
Use formatter logic to produce concise English such as:
- `Running as WORK (inherited from task).`
- `Approval required because WORK policy limits spend above $500.`
- `Cloud sync blocked because PARENT policy restricts cloud twin sync.`
- `Provider ranking favored compliance-focused options under BUYER policy.`

## Activity UX requirements

### Activity feed direction
The Activity feed should increasingly behave like an execution ledger, not a generic transcript.

This means the default value of an item is not that a message existed, but that a meaningful execution event can be understood.

### Required fields per visible item
Where an item is receipt-capable, it should be able to show:
- title
- timestamp
- status or event type
- active role
- concise role explanation
- supporting execution detail (approval, provider, proof, data scope, issue, etc.)

### English-first phrasing guidance
Preferred wording patterns:
- `Running as WORK`
- `Role source: inherited from task`
- `Approval required`
- `Approval denied`
- `Data sharing limited`
- `Provider selected`
- `Provider blocked by policy`
- `Verification completed`
- `Verification failed`
- `Rollback available`
- `Issue detected`

Avoid overly anthropomorphic or vague phrases such as:
- `Your twin decided...`
- `The system felt that...`
- `This was magically handled...`

## Receipt event taxonomy

Additive typed event families are encouraged where helpful. Suggested families:
- `ROLE_APPLIED`
- `ROLE_CHANGED`
- `APPROVAL_REQUIRED`
- `APPROVAL_GRANTED`
- `APPROVAL_DENIED`
- `DATA_SCOPE_REDUCED`
- `DATA_SCOPE_BLOCKED`
- `PROVIDER_SELECTED`
- `PROVIDER_BLOCKED`
- `EXECUTION_STARTED`
- `VERIFICATION_PASSED`
- `VERIFICATION_FAILED`
- `RESULT_DELIVERED`
- `ROLLBACK_AVAILABLE`
- `ROLLED_BACK`
- `ISSUE_REPORTED`

Use the current architecture pragmatically. This taxonomy does not require a brand-new event backend in this pass.

## Relationship to M1 reason codes

M2 must reuse and expose the canonical `ROLE_*` reason-code families introduced in M1.

Guidance:
- canonical role reason codes are the structured input
- receipt summaries are the human-readable output
- legacy ad-hoc detail strings may remain internally where needed, but user-facing surfaces should prefer canonical structured interpretation

## Rendering guidance

### Response cards and execution panel
For material runs, include a compact receipt summary block where relevant.

Recommended summary order:
1. current run status
2. active role and role source
3. key policy or role impact summary
4. approval state
5. provider / capability summary
6. verification / proof summary
7. rollback / issue summary

### Activity item detail level
Keep the first line concise. Details can expand when space allows.

Example compact card:
- `Approval required`
- `Running as BUYER (explicitly selected). Spend exceeds BUYER approval limit.`
- `Awaiting your decision.`

Example failure card:
- `Verification failed`
- `Running as WORK (inherited from task). Submitted proof did not meet verification requirements.`
- `Retry or choose another provider.`

## Continuity requirements

Receipt traceability should survive:
- app process death
- state restoration
- resumed task flow
- replay or history rendering where applicable

If the system reconstructs role context during recovery, this should remain compatible with the M1 role semantics, including `roleChangeReason=SYSTEM_RECOVERY` when appropriate.

## Testing requirements

Add or update tests for at least the following families:

### Receipt generation and formatting
- successful run receipt generation
- approval-required receipt generation
- approval-denied receipt generation
- verification-failed receipt generation
- rollback-available receipt generation
- provider-blocked receipt generation

### Traceability
- receipt includes active role
- receipt includes role source
- receipt includes delegation mode where applicable
- receipt includes readable role impact summary
- receipt survives restore/resume flows where applicable

### Policy linkage
- explicit constraints still override role defaults in receipt explanation
- policy denial is reflected in receipt output
- role-aware data-sharing restriction is reflected in receipt output

### UI formatting
- readable English output on response cards / activity / execution panel
- no debug-only or internal jargon leaks into primary user-facing copy

## Telemetry recommendations

If telemetry is available in the current stack, add or prepare support for:
- `receipt_generated_rate`
- `receipt_with_role_trace_rate`
- `approval_receipt_coverage`
- `data_scope_receipt_coverage`
- `verification_receipt_coverage`
- `rollback_receipt_coverage`
- `receipt_reason_code_unmapped_rate`

This is recommended, not mandatory, for M2 completion if adding telemetry would materially expand scope.

## Validation commands

Run the relevant commands and fix failures before declaring the milestone complete:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

Add additional receipt-specific tests as part of this milestone.

## Milestone sequencing

### M2A - Receipt foundation
- define typed receipt model
- map existing role/policy/proof data into receipt structure
- keep changes additive and backward-compatible

### M2B - Activity receiptization
- render receipt-oriented activity items
- surface role/source/delegation/impact summaries
- cover key success and failure states

### M2C - Execution-surface explainability
- surface readable receipt summaries in response cards and execution panels
- align formatter behavior with canonical reason codes

### M2D - Validation and cleanup
- add tests
- update docs/status
- remove obvious wording inconsistencies
- verify restore/resume traceability

## Definition of done

M2 is complete when all of the following are true:

1. Every material run can produce a readable execution receipt or equivalent receipt summary.
2. Activity shows role-aware execution history rather than generic history only.
3. Receipt-capable items can display active role, role source, delegation mode, and concise role impact explanation.
4. Approval, data-sharing, provider, verification, and rollback information are surfaced where applicable.
5. Success and failure or denial paths both produce coherent receipt output.
6. Receipt traceability remains coherent across restore/resume flows where applicable.
7. Tests cover receipt generation, traceability, readable rendering, and failure-state behavior.
8. Docs and status files are updated to map current implementation against this milestone.

## Required end-of-run report

At the end of the implementation pass, report:
- changed files
- receipt model additions or changes
- activity and response-surface changes
- formatter or rendering changes
- tests added or updated
- validation commands run
- remaining intentional deferrals
- any blockers with precise reasons

## Implementation notes (2026-03-03)

### Milestone completion
- M2A: done
- M2B: done
- M2C: done
- M2D: done

### Implemented surfaces
- Activity is receipt-first for receipt-capable runs with fallback for legacy records.
- Response detail includes a dedicated execution-receipt summary block.
- Chat execution surface includes a dedicated execution-receipt summary block.
- Export summary lines include receipt-aware snippets.

### Added test coverage
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
  - readable receipt headline formatting
  - failure-signal summary lines
  - receipt-unavailable fallback
  - export snippet fields

### Validation outcome
- Full validation command set executed and passed, including connected Android tests on device `SM-X916B - 16`.

### Deferred by design
- No Room history schema migration (kept additive and backward-compatible via response/task-track receipt payloads).

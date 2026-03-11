# M3.5 - UI Surfacing + Dogfooding Pass

## Status
Completed (2026-03-03)

## Context
M0, M1, M2, and M3 established the core role-aware execution foundation:
- role-aware execution is a real runtime capability
- Role Contract v1 compliance hardening is complete
- explainability and activity receiptization are in place
- external fulfillment is now contract-oriented and role-aware at runtime

However, the product can still feel visually unchanged in normal usage because many of the new capabilities are primarily visible in deep detail surfaces, receipt details, or conditional execution paths.

This pass exists to make the value of M2 and M3 obvious in the main product experience without redesigning the product or rewriting the architecture.

## Primary goal
Make the completed role-aware execution and external fulfillment chain clearly visible in the main task experience, especially for external fulfillment flows.

## Product problem to solve
Today, the runtime has changed more than the UI has changed.
A user or teammate may not immediately notice that the system now supports:
- role-aware provider selection
- role-aware approval gating
- role-aware data-scope control
- proof / verification visibility
- rollback / dispute traceability

The result is a perception gap:
- the system is stronger than it looks
- the trust model is richer than it appears
- the product may still feel like a generic agent UI unless the execution chain is surfaced more clearly

## In scope
This pass should focus on visible, high-value surfacing of already-implemented runtime behavior.

### 1. External fulfillment summary surfacing
Surface external fulfillment state more prominently in the main task flow.
At minimum, make these concepts easy to notice without deep inspection:
- provider selected
- provider denied by policy
- approval required / granted / denied
- data sharing limited / reduced / blocked
- verification pending / passed / failed
- rollback available
- issue reported / dispute opened
- sync pending where applicable

### 2. Concise "why" summaries
For major external-fulfillment decisions, expose short readable English summaries such as:
- why this provider was selected
- why approval is required
- why data sharing was reduced or blocked
- why verification failed
- why rollback or dispute is available

These summaries should be concise, consistent, and grounded in the canonical reason-code families and receipt data already produced by the runtime.

### 3. Main-path visibility improvements
Improve visibility in the main user path, not only in deep details.
Preferred surfacing locations include:
- Work current-task area
- response primary cards or nearby summary panels
- Activity recent items
- chat execution panel

This does not require all surfaces to show the full receipt. It does require the main surfaces to reveal the external execution chain clearly.

### 4. Failure and issue parity
Failure / issue / denial states must be as visible as success states.
Specifically, ensure first-class surfacing for:
- provider denied by role policy
- approval denied
- verification failed
- rollback available
- dispute opened
- sync pending after local dispute state

### 5. Dogfooding readiness
Create or refine a lightweight internal dogfooding checklist / scenario pass so that non-engineers can verify that the external execution chain is understandable in the UI.

## Out of scope
Do not do the following in M3.5:
- custom role editor
- new built-in roles
- orchestrator rewrite
- marketplace backend redesign
- history/storage backend rewrite
- Room schema migration
- full proof-ledger backend overhaul
- broad visual redesign or branding refresh

This is a surfacing and productization pass, not a new runtime pass.

## Design direction
Use what already exists.
Do not create parallel concepts if current receipt and role-trace data can be reused.

### Preferred user-facing framing
Use clear English, aligned with the current product direction:
- External Fulfillment
- Approval required
- Verification failed
- Data sharing limited
- Rollback available
- Issue reported
- Sync pending

Avoid internal jargon in the primary visible path.

## Required user-visible outcomes
A tester should be able to trigger representative external-fulfillment scenarios and immediately answer:
1. Which provider was selected, rejected, or blocked?
2. Why did the system make that provider decision?
3. Is approval required, already granted, denied, or pending?
4. Was data sharing limited or blocked?
5. Is verification pending, passed, or failed?
6. Is rollback available?
7. Was a dispute opened?
8. Is anything still waiting to sync?

## Suggested implementation direction

### M3.5A - Prominent external summary block
Add or strengthen a concise external-fulfillment summary block in the main task experience.

This block should summarize, where applicable:
- provider status
- approval status
- data-scope status
- verification status
- rollback / dispute status

This may be implemented as a compact summary card, inline status block, or equivalent UI pattern that does not require deep inspection.

### M3.5B - "Why" visibility
Expose concise readable summaries for the three most important external decisions:
- provider selection / denial
- approval gating
- data-scope restriction

These should be visible without opening a deep receipt view.

### M3.5C - Failure-path surfacing
Ensure that failure and issue states render clearly in the same product areas where success states are visible.

Examples:
- local dispute entered, sync pending
- verification failed, proof issue shown
- provider denied by policy
- rollback available after failed verification or rejected review

### M3.5D - Dogfooding pass
Add or refine tests, previews, sample payloads, or scenario helpers so a human tester can run the key external-fulfillment scenarios and verify the UI behavior quickly.

## Golden scenarios
At minimum, validate these scenarios end-to-end in UI-visible form.

### Scenario 1 - Same task, different roles
For the same external task, compare `WORK` and `BUYER`.
Expected outcome:
- provider choice or ordering may differ
- reason summaries differ
- approval or data-scope expectations may differ

### Scenario 2 - Review rejected, sync pending
Reject a review / fulfillment outcome when the gateway does not sync immediately.
Expected outcome:
- local dispute is visible
- sync pending is visible
- receipt / activity clearly shows the issue state

### Scenario 3 - Data scope limited
Trigger reduced / blocked / redacted provider-facing data scope.
Expected outcome:
- data-scope limitation is visible in the main path
- the reason is understandable in plain English

### Scenario 4 - Verification failed / rollback available
Trigger a proof or verification failure.
Expected outcome:
- failure state is clearly visible
- rollback availability or dispute path is visible
- the UI does not degrade into generic error text

## Testing expectations
Add or update tests where needed to cover visible behavior, not only runtime behavior.

Recommended focus areas:
- summary block rendering
- concise reason rendering
- dispute / sync-pending visibility
- data-scope limitation visibility
- verification-failure visibility
- rollback-available visibility
- role-dependent visible differences across scenarios

## Telemetry recommendations
If telemetry hooks already exist or are easy to extend, add or refine metrics such as:
- `external_summary_visible_rate`
- `provider_reason_visible_rate`
- `approval_reason_visible_rate`
- `data_scope_reason_visible_rate`
- `verification_failure_visible_rate`
- `rollback_visible_rate`
- `dispute_visible_rate`
- `sync_pending_visible_rate`

If the telemetry pipeline is deferred, at least keep local counters or structured logs that can later be promoted.

## Validation commands
Run relevant validation after implementation and fix failures before concluding the pass:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done
M3.5 is done when:
1. A tester can trigger the four golden scenarios and clearly see the role-aware external execution chain in the UI.
2. Provider choice, approval status, data-scope limitation, verification status, and rollback / dispute state are visible in the main task experience.
3. Failure and issue paths are first-class and not hidden behind deep detail views only.
4. The implementation preserves the typed/runtime behavior built in M2 and M3.
5. Tests pass and docs/status are updated.

## Required final report
At the end of the implementation pass, report:
- changed files
- what became more visible in the UI
- which external-fulfillment scenarios were validated
- tests run
- any remaining gaps that are intentionally deferred

## Implementation notes (2026-03-03)
- External visibility promoted in primary surfaces (Response history/detail, Chat execution card, Activity rows) using receipt-driven headline + tone-tagged external status pills.
- Added concise visible "why" summaries for provider selection/denial, approval gating, and data-scope restriction.
- Added sync-pending dispute wording hardening so local dispute + gateway sync delay is explicit in summary/issue surfaces.
- Added formatter and dogfood tests for:
  - WORK vs BUYER divergence
  - dispute + sync pending
  - data-scope blocked
  - verification failed + rollback-capable flow

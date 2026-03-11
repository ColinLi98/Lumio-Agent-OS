# M18 - SaaS-Grade Operator Console and Enterprise Ops UX

## Why this milestone now

M0 through M17 established the execution, trust, governance, and enterprise-integration foundation of the product:
- role-aware runtime execution
- durable receipts and proof ledger
- role-aware external fulfillment
- guided role policy editing
- governance analytics
- settlement, dispute, reconciliation, and idempotency durability
- operator workflows and alerts
- remote-ready telemetry, alert routing, and reconciliation service boundaries
- remote operator auth, assignment, and connector routing foundations
- enterprise identity, SCIM-like directory, provider-aware routing, and vault lifecycle semantics

The next major gap is not backend semantics. The next gap is operator usability and operational throughput.

The system already knows how to:
- find unresolved cases
- classify provider and sync issues
- record operator trail events
- represent settlement, dispute, and reconciliation state
- attach enterprise identity, auth provenance, and credential health summaries

But operators still need a broader SaaS-grade console experience that turns these durable system truths into a usable enterprise operations workflow.

## Goal

Turn the current internal/debug governance surfaces into a broader SaaS-grade operator console and enterprise operations UX, while preserving typed/runtime truth and local-first compatibility.

This milestone should improve:
- operator navigation
- case triage flow
- queue usability
- assignment clarity
- action ergonomics
- multi-case operations
- enterprise issue visibility
- audit readability

This is an operator-productization milestone, not a core-runtime rewrite.

## Core product outcome

After M18, an operator should be able to:
1. land in a clear operator home/console
2. see prioritized queues, alerts, and health summaries
3. open a case and understand the full execution chain quickly
4. assign, reassign, review, and escalate cases with low friction
5. inspect enterprise identity, connector, vault, settlement, and dispute state in one coherent place
6. run bulk-safe operations for common triage work
7. move through cases and queues without relying on deep debug screens or raw payload inspection

## In scope

### 1. Broader operator console IA and UX
Evolve the current internal/admin/debug-facing governance console into a broader, more coherent operator console.

Expected major areas:
- home / overview
- queue views
- case detail
- alerts / health
- assignment / ownership
- recent operator actions / audit timeline
- enterprise identity and connector health panels

### 2. Queue and triage usability
Improve the operator queue experience with:
- saved filters / presets
- clearer priority and severity signals
- bulk selection for safe actions
- queue counts and queue segmentation
- better scanability for unresolved, sync-pending, provider-issue, mismatch, verification-failure, and credential-health cases

### 3. Case detail UX hardening
Broaden the case-detail experience so an operator can quickly inspect:
- active role
- role source
- delegation mode
- provider summary
- approval summary
- data-scope summary
- verification and proof summary
- settlement summary
- dispute summary
- reconciliation summary
- rollout/cutover summary
- enterprise identity / directory sync summary
- auth provenance
- vault / credential health
- operator assignment / action history
- connector route and delivery outcome

### 4. Assignment and collaboration UX
Improve operator collaboration flows around:
- assign
- reassign
- claim ownership
- mark reviewed
- add operator note
- escalate
- hand off to another queue or team if supported by the current model

All of these should remain typed, durable, and auditable.

### 5. Bulk-safe operations
Add bounded bulk operations only where they are safe and idempotent.
Examples:
- bulk mark reviewed
- bulk retry sync intent
- bulk copy/export case summary
- bulk acknowledge informational alerts

Do not introduce destructive bulk actions in this pass.

### 6. Enterprise operations panels
Add clearer enterprise-oriented surfaces for:
- directory sync freshness and errors
- connector route binding
- vault credential health and expiry/rotation state
- auth provenance and fallback state
- rollout stage and cutover readiness where applicable

### 7. Alert and health UX
Make alerts and health summaries more operator-usable.
Expected improvements:
- grouped alert buckets
- clearer severity labels
- action-oriented summaries
- drill-down to affected cases
- connector/delivery/vault/provider health rollups

### 8. Audit and timeline usability
Make operator and system actions easier to scan.
Show a coherent timeline for:
- system decisions
- provider decisions
- operator actions
- alert deliveries
- sync failures / retries
- dispute / reconciliation / settlement transitions

## Out of scope

Do not do the following in M18:
- broad end-user product redesign
- orchestrator rewrite
- full enterprise SaaS redesign beyond operator surfaces
- full remote backend rewrite
- broad storage/history rewrite
- destructive bulk action program
- complete custom workflow engine
- deep RBAC/SCIM/IdP production rollout beyond what M17 already established

## Design principles

1. Operator clarity over debug density
   - Operators should not need raw JSON or scattered surfaces to understand a case.

2. Typed truth remains primary
   - UI must reflect durable runtime truth, not invent parallel semantics.

3. Actionability over dashboards-only
   - Every important alert or case bucket should connect to a usable action path.

4. Safe bulk operations only
   - No destructive or ambiguous mass actions in this pass.

5. Local-first compatibility remains intact
   - The console should remain usable even if remote sinks are degraded.

## Suggested typed concepts to add or strengthen

Exact names may vary, but the following semantic areas should be explicit.

### Console and navigation
- `OperatorHomeSummary`
- `OperatorQueueView`
- `OperatorSavedFilter`
- `OperatorPresetView`
- `OperatorWorkbenchState`

### Case UX
- `GovernanceCaseSectionState`
- `OperatorCaseTimelineItem`
- `OperatorCaseActionAvailability`
- `OperatorCaseNavigationContext`

### Collaboration
- `OperatorAssignmentSummary`
- `OperatorEscalationRecord`
- `OperatorNoteRecord`
- `OperatorBulkActionRequest`
- `OperatorBulkActionResult`

### Health / alerts
- `ConnectorHealthPanelSummary`
- `VaultHealthPanelSummary`
- `EnterpriseIdentityPanelSummary`
- `AlertBucketView`
- `QueueHealthSummary`

## Suggested milestone breakdown

### M18A - Operator home and queue UX
Build a broader operator entry experience with:
- queue segmentation
- saved filters/presets
- severity/priority readability
- queue counts and queue summaries

Done when:
- operators can land on a usable console instead of stitching together debug paths
- queues are easier to scan and filter

### M18B - Case detail and timeline UX
Strengthen case detail and timeline presentation.

Done when:
- operators can understand a case end-to-end without raw payload inspection
- enterprise identity, provider, settlement, dispute, vault, and auth provenance are visible in one coherent place

### M18C - Collaboration and bulk-safe actions
Add collaboration ergonomics and bounded bulk operations.

Done when:
- assignment / note / reassign / escalate flows are operator-usable
- safe bulk operations exist for repetitive triage work
- all operator actions remain durable and auditable

### M18D - Alerts and enterprise operations surfaces
Improve alert usability and enterprise operations views.

Done when:
- connector/delivery/vault/directory health summaries are actionable
- alert buckets can drill into affected cases
- tests and docs are updated

## Required scenarios

Add or update scenarios for at least:
1. triage unresolved and sync-pending queues from the operator home
2. assign -> note -> reassign -> escalate flow with durable timeline visibility
3. bulk mark reviewed on multiple low-risk cases
4. bulk retry sync intent on eligible cases
5. case detail with provider, settlement, dispute, reconciliation, and enterprise identity sections visible
6. connector health issue drill-down to affected cases
7. vault credential health issue drill-down to affected cases
8. local-first degraded mode where remote delivery/provider state is stale but the operator console remains coherent

## Testing expectations

Add or update tests for:
- queue rendering and preset/filter behavior
- case detail section visibility
- operator note / assignment / escalation durability
- bulk-safe action behavior and audit trail
- health/alert summary formatting
- enterprise panel summary formatting
- compatibility with old/new mixed records

Keep the existing milestone test suite green.

## Validation commands

Run and fix failures before concluding the pass:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

Add any new operator-console test targets if introduced.

## Definition of done

M18 is done when:
1. operators have a broader console home / queue / case-detail workflow
2. queue triage is meaningfully easier via presets, counts, and readable summaries
3. collaboration actions are easier to use and remain durable/auditable
4. safe bulk operations exist for repetitive triage work
5. enterprise identity, provider, auth, vault, settlement, dispute, and health summaries are visible in coherent operator surfaces
6. alerts and health buckets are drillable and actionable
7. compatibility is preserved and tests/docs are updated

## Deliverables expected from Codex

At the end, report:
- changed files
- new/updated operator surfaces
- collaboration/bulk-action additions
- health/alert/enterprise summary improvements
- tests added/updated
- deferred items kept out of scope
- blockers if any

# M40 - Enterprise Data Exchange Governance, Safe Destination Bundles, and Cross-Boundary Audit Operations

## What this milestone is
M40 extends the remote-learning and compliance-export system from destination-aware routing into a broader **enterprise data exchange governance layer**.

By M39, the system already supports:
- policy-safe remote learning destinations
- data residency controls
- compliance export routing
- consent, role-policy, privacy, connector, and key/credential gating
- local-first fallback when remote delivery is blocked or unavailable
- durable visibility for destination selection, residency boundaries, reroute reasons, hold/suppress states, and compliance export summaries

The next gap is not basic routing.
The next gap is **how data exchange itself is packaged, governed, audited, and operated across boundaries**.

M40 should introduce:
- safe destination bundles
- explicit exchange manifests and artifact classes
- cross-boundary audit operations
- reusable exchange policy decisions
- durable governance truth for what can cross which boundary, in what bundle form, under what constraints, and with what audit history

## Why M40 is next
The system can already decide whether a transport or export is allowed.
It now needs to decide **how to package and govern the exchange unit itself**.

Enterprise operators need answers to questions like:
- Which artifacts can be grouped together for a given destination class?
- Which destinations can receive the same bundle and which require separation?
- Which jurisdiction or residency rule blocked part of a bundle?
- Was the final exchange redacted, split, rerouted, or held?
- Which cross-boundary audit operations have already been performed for this exchange path?
- Which exchange bundles should be reusable or forbidden in future runs?

M40 closes that gap.

## Goal
Build a typed, durable **data exchange governance layer** that can:
- define safe destination bundles
- package eligible artifacts into governed exchange manifests
- enforce cross-boundary policy and residency checks at bundle level
- persist cross-boundary audit operations
- make bundle decisions readable in receipts, governance summaries, and operator views

This is not a broad platform rewrite.
It is the governance layer that sits on top of M37–M39 transport, consent, compliance, and routing semantics.

## Core outcome
After M40, the system should be able to say, for any external learning or compliance export action:
- which bundle type was attempted
- which artifact classes were included or excluded
- which destination bundle policy applied
- whether the bundle was allowed, split, redacted, rerouted, held, or suppressed
- what cross-boundary audit operation was performed
- which durable audit trail and compliance evidence belongs to this exchange

## In scope

### 1. Typed safe destination bundle models
Add or strengthen typed concepts such as:
- `SafeDestinationBundle`
- `SafeDestinationBundleType`
- `DestinationBundlePolicy`
- `DestinationBundleEligibility`
- `DestinationBundleDecision`
- `DestinationBundleSplitResult`
- `DestinationBundleRedactionResult`
- `DestinationBundleRoutingSummary`

These concepts should be durable and queryable, not only formatter-level summaries.

### 2. Typed exchange manifest models
Add or strengthen typed concepts such as:
- `DataExchangeManifest`
- `DataExchangeArtifactClass`
- `DataExchangeArtifactRef`
- `DataExchangeManifestDecision`
- `DataExchangeManifestStatus`
- `DataExchangeBoundarySummary`
- `DataExchangeRerouteSummary`
- `DataExchangeHoldReason`

The system should be able to reason about exchange at the level of **bundles/manifests**, not only individual transport attempts.

### 3. Cross-boundary audit operation models
Add or strengthen typed concepts such as:
- `CrossBoundaryAuditOperation`
- `CrossBoundaryAuditOperationType`
- `CrossBoundaryAuditResult`
- `CrossBoundaryAuditRecord`
- `CrossBoundaryAuditScope`
- `CrossBoundaryAuditIssue`
- `CrossBoundaryAuditRecommendation`

These operations should capture important governance events such as:
- boundary check passed
- residency gate failed
- bundle split required
- redaction forced
- reroute executed
- hold/suppress confirmed
- post-exchange audit review recorded

### 4. Bundle-level runtime behavior
The runtime should support real, typed behavior for:
- bundle construction
- artifact inclusion/exclusion
- bundle splitting when some artifact classes are disallowed for a destination
- bundle-level redaction decisions
- destination-specific reroute/hold/suppress decisions
- durable status tracking for the resulting manifest/bundle state

### 5. Cross-boundary governance visibility
Governance and receipt/operator surfaces should be able to show:
- bundle type
- artifact class summary
- destination bundle policy summary
- residency/jurisdiction boundary summary
- final decision (allowed/split/redacted/rerouted/held/suppressed)
- audit operation summary
- next action or remediation recommendation if blocked

### 6. Query and filter support
Extend internal query/filter semantics where practical to support:
- bundle type
- destination class
- residency boundary outcome
- split/redaction/hold/suppress state
- audit operation type/result
- reroute destination category

### 7. Additive, backward-compatible persistence
All new fields must be additive and preserve:
- local-first behavior
- M35 isolation constraints
- M36 privacy/federation constraints
- M37 consent/audit export semantics
- M38 connector/key/compliance gating
- M39 destination/residency routing semantics

## Out of scope
Do not do any of the following in M40:
- orchestrator rewrite
- broad storage/history rewrite
- broad operator console redesign
- raw prompt/message export by default
- weakening M35/M36 privacy or isolation guarantees
- destructive automation
- generalized data-exchange DSL
- complete enterprise data-governance suite redesign

## Design principles

### 1. Bundle first, not blob first
The exchange unit should be typed and governed.
The system should not treat all outbound data as an undifferentiated payload.

### 2. Cross-boundary truth must be durable
Split/redact/reroute/hold/suppress decisions must become durable truth, not transient formatter output.

### 3. Audit operations are first-class
Boundary decisions and reviews should be represented as durable audit operations, not only as side effects.

### 4. Local-first semantics stay intact
Remote delivery, reroute, or exchange failure must not silently override local authority or trust semantics.

### 5. Privacy and residency still dominate
If bundle composition conflicts with privacy/residency policy, the system must split, reduce, reroute, or block—not silently over-share.

## Required runtime behavior

### A. Bundle construction and decisioning
The system should be able to:
- construct a bundle from typed artifact classes
- evaluate destination eligibility at bundle level
- remove or redact disallowed artifact classes
- split a bundle if policy requires separate handling
- reroute, hold, or suppress the bundle if the destination is not eligible

### B. Boundary evaluation
The system should evaluate, durably:
- residency boundaries
- jurisdiction rules
- destination policy
- connector/key/compliance state
- consent and role-policy gates

### C. Cross-boundary audit operations
The system should be able to persist audit operations such as:
- `BOUNDARY_CHECK_PASSED`
- `BOUNDARY_CHECK_FAILED`
- `BUNDLE_SPLIT_REQUIRED`
- `REDACTION_APPLIED`
- `REROUTE_REQUESTED`
- `REROUTE_COMPLETED`
- `HOLD_CONFIRMED`
- `SUPPRESSION_CONFIRMED`
- `AUDIT_REVIEW_RECORDED`

### D. Readable summaries
Receipts/governance/operator summaries should render concise lines like:
- `Bundle type: Compliance export (artifact-only)`
- `Destination policy required redaction of 2 artifact classes`
- `Bundle split because residency policy blocked cross-region transfer`
- `Exchange rerouted to local-only compliance destination`
- `Cross-boundary audit recorded: reroute completed`

## Suggested milestone breakdown

### M40A - Typed bundle and manifest contracts
Add typed bundle/manifests/artifact-class contracts and compatible persistence fields.

**Done when**
- bundle/manifests are durable typed concepts
- old/new records remain compatible

### M40B - Bundle-level runtime governance
Implement bundle composition, splitting, redaction, reroute, hold, and suppress as real runtime behavior.

**Done when**
- bundle decisions are durable and readable
- destination and residency policies affect bundle outcome at runtime

### M40C - Cross-boundary audit operations
Implement typed audit-operation recording and visibility.

**Done when**
- significant boundary decisions create durable audit operation records
- governance/receipt views can show them clearly

### M40D - Tests, docs, and validation
Add/update tests and docs/status mappings.

**Done when**
- contract compatibility, runtime bundle behavior, continuity, and readability tests pass
- docs/status reflect exact M40 coverage and deferred items

## Suggested typed model areas
The exact names may vary, but M40 should converge on these semantic areas.

### Bundle identity
- bundle id
- bundle type
- bundle policy source
- bundle status
- destination class
- destination summary

### Artifact composition
- artifact class list
- artifact inclusion/exclusion decision
- redaction summary
- split summary

### Boundary truth
- residency summary
- jurisdiction summary
- destination boundary decision
- reroute summary
- hold/suppress reason

### Audit operation truth
- audit operation type
- audit result
- audit scope
- audit issue summary
- audit recommendation
- recorded at / recorded by system context

## Suggested reason-code direction
Add or strengthen structured reason families such as:
- `ROLE_DESTINATION_BUNDLE_ALLOWED`
- `ROLE_DESTINATION_BUNDLE_SPLIT`
- `ROLE_DESTINATION_BUNDLE_REDACTED`
- `ROLE_DESTINATION_BUNDLE_REROUTED`
- `ROLE_DESTINATION_BUNDLE_HELD`
- `ROLE_DESTINATION_BUNDLE_SUPPRESSED`
- `ROLE_CROSS_BOUNDARY_AUDIT_RECORDED`
- `ROLE_RESIDENCY_BOUNDARY_BLOCKED`
- `ROLE_JURISDICTION_BOUNDARY_BLOCKED`
- `ROLE_DESTINATION_POLICY_BLOCKED`

Exact names may vary, but the semantics must be typed and queryable.

## Required test coverage
Add or update tests for at least:
- bundle/manifest contract round-trip compatibility
- bundle split under residency block
- bundle redaction under destination policy
- reroute/hold/suppress durable behavior
- cross-boundary audit operation durability
- restore/process-death continuity for M40 records
- formatter visibility for bundle and audit summaries
- mixed old/new history compatibility

## Validation commands
Run and keep green:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done
M40 is done when:
1. safe destination bundles and exchange manifests are durable typed concepts
2. bundle-level split/redaction/reroute/hold/suppress behavior is real runtime behavior
3. cross-boundary audit operations are durable and visible
4. governance/receipt/operator surfaces can show bundle and audit outcomes clearly
5. restore/process-death continuity preserves M40 semantics
6. backward compatibility remains intact
7. tests and docs/status are updated and passing

## Expected deliverables from Codex
At the end of the run, report:
- changed files
- typed model additions or strengthened usage
- runtime bundle/audit behavior changes
- visibility changes in governance/receipt/operator summaries
- tests added or updated
- remaining deferred items
- blockers, if any

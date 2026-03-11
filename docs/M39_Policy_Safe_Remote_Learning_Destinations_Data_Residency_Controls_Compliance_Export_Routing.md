# M39 - Policy-Safe Remote Learning Destinations, Data Residency Controls, and Compliance Export Routing

## What this milestone is
M39 extends the remote-learning and compliance layer from:
- typed remote learning transport boundaries
- enterprise consent and privacy controls
- production connector and key/credential runtime gating
- durable retry / dedupe / dead-letter / fallback semantics

into a **destination-aware policy and residency control plane**.

The core purpose of M39 is to make the system able to decide, durably and explainably:
- **where** learning or compliance artifacts are allowed to go
- **why** a destination is eligible or blocked
- **which residency or jurisdiction policy applies**
- **which export route should be selected under current consent, role, and enterprise controls**
- **how fallback, rerouting, suppression, and compliance holds behave when destination policy changes**

This is not a generic data-routing platform rewrite.
It is a typed, policy-safe routing and data-residency governance milestone built on top of M35-M38.

---

## Why M39 is next
By the end of M38, the platform already supports:
- multi-tenant learning isolation and safe propagation rules
- cross-device learning sync boundaries and federated/privacy controls
- consent flows and compliance audit export boundaries
- production-ready connector/key/compliance runtime gating
- durable retry, dedupe, dead-letter, and local-first fallback behavior

The next gap is no longer whether the system can send something remotely.
The next gap is whether it can decide **which destination is legally, organizationally, and policy-wise allowed**.

Operators now need the system to answer:
- can this learning artifact leave the current residency boundary?
- which destinations are approved for this tenant/workspace/role/purpose?
- if the preferred destination is blocked, can another approved destination be used?
- should the artifact be held, rerouted, downgraded, or remain local-only?
- what exact policy, residency, consent, connector, and credential reasons caused the routing decision?

M39 closes that gap.

---

## Goal
Build a typed, durable destination-routing and residency-governance layer for remote learning and compliance export flows.

The system should be able to:
1. represent allowed and disallowed destinations explicitly
2. enforce data residency and jurisdiction constraints at runtime
3. route compliance exports through approved destinations only
4. reroute or suppress delivery when destination policy blocks the preferred path
5. preserve readable, auditable reasons in governance, receipts, and internal summaries

---

## Core outcomes
After M39, the platform should be able to say, in durable and readable form:
- which destination class was requested
- which destinations were eligible
- which destinations were blocked and why
- which residency policy and compliance policy were applied
- whether export was routed, rerouted, downgraded, held, or suppressed
- whether the export remains local-only due to destination or residency constraints
- what fallback destination was chosen, if any

---

## In scope

### 1. Typed destination and residency models
Add or strengthen typed concepts such as:
- `RemoteLearningDestination`
- `RemoteLearningDestinationType`
- `RemoteLearningDestinationProfile`
- `RemoteLearningDestinationEligibility`
- `RemoteLearningDestinationDecision`
- `RemoteLearningDestinationBlockReason`
- `DataResidencyPolicy`
- `ResidencyRegion`
- `ResidencyBoundary`
- `JurisdictionPolicy`
- `ComplianceExportRoute`
- `ComplianceExportRouteDecision`
- `ComplianceExportRouteResult`
- `DestinationFallbackSummary`
- `DestinationPolicySummary`

Exact names may vary, but these semantics must be explicit, typed, and durable.

### 2. Runtime destination eligibility and route selection
The runtime must evaluate destination routing using real policy gates, not only formatter text.

At minimum, routing should be able to consider:
- consent status and purpose scope
- role policy and privacy policy
- tenant/workspace destination restrictions
- data residency and jurisdiction boundaries
- connector health and credential/key state
- destination class allow/block rules
- compliance export route policy

The output should be a typed decision, such as:
- route to destination A
- reroute to destination B
- hold until compliant destination available
- degrade to metadata-only export
- remain local-only
- suppress export entirely

### 3. Data residency and jurisdiction controls
Add or strengthen typed runtime behavior for:
- same-region required
- approved-region only
- blocked-region restrictions
- jurisdiction-sensitive export suppression
- tenant/workspace-specific residency boundaries
- role-sensitive residency exceptions where already consistent with current policy semantics

M39 must not weaken existing M35 isolation or M36 privacy/federation constraints.

### 4. Compliance export routing
Compliance export should become destination-aware.

At minimum, the system should support typed behavior for:
- selecting an export route by policy
- attaching destination summaries to export records
- rerouting away from blocked or unhealthy destinations
- falling back to local-only durable export if no compliant destination is available
- preserving redaction-first behavior and never defaulting to raw prompt/message export

### 5. Destination fallback and hold semantics
Support typed states such as:
- `ROUTED`
- `REROUTED`
- `HELD_FOR_COMPLIANCE`
- `LOCAL_ONLY_FALLBACK`
- `SUPPRESSED`
- `BLOCKED_BY_RESIDENCY`
- `BLOCKED_BY_JURISDICTION`
- `BLOCKED_BY_DESTINATION_POLICY`

These states should be durable, queryable, and readable.

### 6. Governance / receipt / internal surface updates
Governance summaries, execution receipts, internal export summaries, and timeline entries should be able to show:
- destination chosen
- destination type
- residency boundary summary
- jurisdiction summary
- destination block reason
- reroute summary
- hold/suppress/local-only summary
- readable reason lines for the major M39 decision families

### 7. Query and filter support
Extend filter/query behavior where appropriate for:
- destination type
- residency status
- held exports
- rerouted exports
- blocked-by-residency exports
- blocked-by-destination-policy exports
- local-only fallback exports

### 8. Additive compatibility
All new fields and records must remain additive and backward-compatible.
Mixed old/new history must continue to decode and render.
Restore/process death continuity must preserve M39 destination/residency decisions.

---

## Out of scope
Do not do the following in M39:
- rewrite the orchestrator
- build a generic data-routing platform or DSL
- broadly redesign the operator console
- broadly rewrite storage/history
- weaken local-first fallback behavior
- enable raw prompt/message export by default
- weaken M35 isolation or M36 privacy/federation constraints
- implement a full external SaaS data-routing control plane

---

## Design principles

### 1. Destination safety is first-class
Choosing **where** data may go is as important as deciding **whether** it may go.

### 2. Residency truth must be durable
Residency and jurisdiction decisions must survive restore/replay and remain auditable.

### 3. No silent reroutes
If a preferred destination is blocked and another route is chosen, that must be explicit and durable.

### 4. Local-first fallback remains authoritative
If no compliant destination is available, local-only behavior remains the safe fallback.

### 5. Compliance export remains redaction-first
M39 must preserve artifact-only and redaction-first export behavior.

---

## Suggested milestone breakdown

### M39A - Typed destination and residency contracts
Add or strengthen typed destination, residency, jurisdiction, and export-route models.

**Done when**
- destination and residency concepts are explicit and typed
- serialization remains backward-compatible
- existing records can coexist with new M39 semantics

### M39B - Runtime route selection and fallback behavior
Implement runtime destination eligibility, route selection, reroute, hold, suppress, and local-only fallback behavior.

**Done when**
- destination decisions are real typed/runtime outputs
- blocked/rerouted/local-only states are durable and queryable

### M39C - Governance, receipt, and export visibility
Add readable visibility for destination/residency/reroute states in governance and receipt surfaces.

**Done when**
- operators can see destination/residency reasoning clearly
- export summaries reflect the final destination or fallback path

### M39D - Tests, docs, and continuity
Add tests and update milestone docs/status.

**Done when**
- contract/runtime/formatter tests pass
- restore continuity is verified
- docs/status reflect exact M39 scope and deferred items

---

## Required runtime behaviors
At minimum, M39 should make these situations real and durable:
- a destination is allowed and selected normally
- a preferred destination is blocked by residency or jurisdiction
- a fallback destination is allowed and selected
- no compliant destination exists, so local-only fallback is used
- an export is held for compliance review instead of being sent
- a compliance export route is selected differently from a learning route due to stricter policy

---

## Required tests
Add or update tests for at least:
1. typed M39 contract serialization and backward compatibility
2. destination eligibility evaluation with residency block
3. reroute to fallback destination when preferred route is blocked
4. local-only fallback when no compliant destination exists
5. held/suppressed export state durability
6. restore/process-death continuity for M39 destination and residency state
7. readable formatter output for destination/residency/reroute lines
8. mixed old/new history compatibility remains intact

---

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

---

## Definition of done
M39 is done when:
1. destination/residency/export-route concepts are typed and durable
2. runtime route decisions can be allowed, rerouted, held, suppressed, or local-only based on real policy evaluation
3. governance/receipt/export surfaces show destination and residency reasoning readably
4. local-first fallback remains intact and visible
5. restore/process-death continuity preserves M39 state
6. backward compatibility is preserved
7. tests and docs/status are updated and green

---

## What comes next
After M39, the most natural next milestone is:
- **M40 - Enterprise Data Exchange Governance, Safe Destination Bundles, and Cross-Boundary Audit Operations**

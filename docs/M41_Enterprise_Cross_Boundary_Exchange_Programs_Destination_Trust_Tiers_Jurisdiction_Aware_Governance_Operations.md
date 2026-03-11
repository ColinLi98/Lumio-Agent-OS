# M41 - Enterprise Cross-Boundary Exchange Programs, Destination Trust Tiers, and Jurisdiction-Aware Governance Operations

## What this milestone is
M41 extends the enterprise data exchange governance layer from single exchange bundles into a broader cross-boundary program governance system.

The goal is to make the platform capable of governing:
- groups of exchange bundles over time
- destination trust tiers
- jurisdiction-aware escalation and approval rules
- cross-boundary program health and drift
- durable governance operations across multiple destinations, bundles, and regulatory contexts

This is not a generic data-routing DSL.
It is an enterprise governance milestone that adds typed trust-tier and jurisdiction-aware controls on top of the existing exchange bundle, residency, consent, and compliance model.

## Why M41 is next
The system already supports:
- policy-safe remote learning destinations
- data residency controls
- compliance export routing
- exchange bundles with allow / split / reroute / hold / block behavior
- cross-boundary audit operations and readable governance summaries

The next gap is not whether a single bundle is safe.
The next gap is whether the system can coordinate many bundles and destinations under a durable enterprise governance program.

Operators now need to answer questions like:
- Which destinations are trusted enough for which classes of exchange?
- Which trust tier applies to a specific destination or destination group?
- Which exchanges are blocked only because of jurisdiction mismatch, and which are blocked because trust tier is too low?
- Which cross-boundary programs are healthy, paused, degraded, or drifted from policy intent?
- Which jurisdictions require stricter approval, different redaction, or a different safe reroute path?

M41 closes that gap.

## Goal
Build a typed, durable governance layer for:
- cross-boundary exchange programs
- destination trust tiers
- jurisdiction-aware policy and approval behavior
- cross-program health and drift summaries
- durable governance actions for adjusting trust, holding programs, pausing destinations, or rerouting safely

## Core outcomes
After M41, the system should be able to:
1. assign and persist trust tiers for destinations or destination groups
2. evaluate exchange eligibility using jurisdiction + trust tier + existing consent/privacy/residency/compliance rules
3. track cross-boundary program health, drift, pauses, and blockers across bundles
4. produce readable summaries explaining whether a destination or bundle failed due to trust tier, jurisdiction, or another governance control
5. expose typed operator actions for trust-tier and program governance without rewriting the underlying truth model

## In scope

### 1. Typed cross-boundary program models
Add or strengthen typed concepts such as:
- `CrossBoundaryExchangeProgram`
- `CrossBoundaryExchangeProgramStatus`
- `CrossBoundaryProgramScope`
- `CrossBoundaryProgramSummary`
- `CrossBoundaryProgramBlocker`
- `CrossBoundaryProgramHealth`
- `CrossBoundaryProgramDriftSummary`
- `CrossBoundaryProgramOperation`

Exact names may vary, but the concepts must be explicit and durable.

### 2. Typed destination trust-tier models
Add or strengthen typed concepts such as:
- `DestinationTrustTier`
- `DestinationTrustTierAssignment`
- `DestinationTrustEvaluationResult`
- `DestinationTrustTierReason`
- `DestinationTrustDriftSummary`
- `DestinationTrustRestrictionSummary`

Suggested trust-tier direction:
- `UNVERIFIED`
- `LIMITED`
- `TRUSTED`
- `HIGH_TRUST`
- `RESTRICTED`

The exact labels may vary, but the model must support bounded, typed tiering.

### 3. Typed jurisdiction-aware governance models
Add or strengthen typed concepts such as:
- `JurisdictionPolicySummary`
- `JurisdictionBoundaryResult`
- `JurisdictionApprovalRequirement`
- `JurisdictionRestrictionReason`
- `JurisdictionCompatibilitySummary`
- `CrossBoundaryApprovalSummary`

This layer should work with, not replace, the existing residency and compliance model.

### 4. Runtime trust-tier and jurisdiction behavior
The runtime should support real typed behavior for:
- evaluating destination trust tier at dispatch time
- evaluating jurisdiction compatibility at bundle and destination level
- requiring stronger approvals for specific jurisdictions or trust tiers
- rerouting or splitting bundles when a subset of destinations fails trust or jurisdiction checks
- marking durable blockers and summaries accordingly

### 5. Governance and operator visibility
Governance/operator surfaces should be able to show:
- destination trust tier
- jurisdiction summary
- trust-tier or jurisdiction blocker reason
- cross-boundary program status
- affected bundle count
- paused / degraded / rerouted state
- next recommended governance action

### 6. Durable governance operations
Additive, typed governance actions may include:
- assign or update destination trust tier
- hold a cross-boundary program
- pause a destination under a program
- reroute to an approved destination tier
- require escalation or approval for a jurisdictional exception
- mark trust-tier review requested

These actions must create durable audit trail entries and readable summaries.

### 7. Query/filter support
Support filters for at least:
- trust tier
- jurisdiction
- cross-boundary program status
- blocker type
- approval-required
- rerouted / held / blocked state
- destination group or bundle group where already supported

## Out of scope
Do not do the following in M41:
- build a generic routing DSL
- rewrite the orchestrator
- broadly redesign the operator console
- rewrite storage/history architecture broadly
- weaken existing residency, privacy, or compliance rules
- enable raw prompt/message export by default
- replace local-first fallback semantics with remote-only behavior

## Design principles

### 1. Trust tier is additive governance, not arbitrary scoring
Trust tiers must be bounded, typed, and auditable.

### 2. Jurisdiction logic must stay explicit
If an exchange is blocked or rerouted for jurisdiction reasons, that must be durable and readable.

### 3. Existing policy constraints still win
M41 must not override explicit task constraints, role policies, or existing consent/privacy/residency/compliance truth.

### 4. Cross-boundary program state must be durable
Program status, drift, and blockers must survive restore/replay/process death.

### 5. Operators need concise but precise summaries
Readable English summaries should explain whether the effective blocker was trust tier, jurisdiction, approval requirement, or connector/key/compliance state.

## Required runtime behaviors

### A. Trust-tier-aware destination evaluation
At dispatch or routing time, the runtime should be able to say:
- destination allowed
- destination limited
- destination requires approval
- destination rerouted
- destination blocked by trust tier

### B. Jurisdiction-aware bundle evaluation
The runtime should be able to say:
- bundle fully allowed
- bundle partially allowed and split
- bundle rerouted to safe subset
- bundle held pending approval
- bundle blocked by jurisdiction incompatibility

### C. Program-level governance state
The runtime should be able to maintain:
- active
- degraded
- paused
- blocked
- rerouting
- drifted
- review required

for a cross-boundary exchange program.

### D. Durable reason-code and audit output
Material M41 decisions must produce durable reasoned output, such as:
- trust-tier assignment applied
- jurisdiction gate triggered
- reroute due to low trust tier
- reroute due to jurisdiction mismatch
- approval required due to jurisdiction rule
- program paused due to repeated cross-boundary blockers

## Suggested reason-code direction
Add or strengthen structured reason families such as:
- `ROLE_DESTINATION_TRUST_TIER_APPLIED`
- `ROLE_DESTINATION_TRUST_TIER_BLOCKED`
- `ROLE_DESTINATION_TRUST_TIER_REVIEW_REQUIRED`
- `ROLE_JURISDICTION_COMPATIBLE`
- `ROLE_JURISDICTION_BLOCKED`
- `ROLE_JURISDICTION_APPROVAL_REQUIRED`
- `ROLE_CROSS_BOUNDARY_PROGRAM_PAUSED`
- `ROLE_CROSS_BOUNDARY_PROGRAM_DEGRADED`
- `ROLE_CROSS_BOUNDARY_PROGRAM_REROUTED`
- `ROLE_CROSS_BOUNDARY_TRUST_DRIFT_DETECTED`

Keep them typed and durable rather than relying on ad-hoc strings only.

## Suggested milestone breakdown

### M41A - Typed trust-tier and jurisdiction model layer
- add typed trust-tier, jurisdiction, and cross-boundary program concepts
- keep everything additive and backward-compatible

### M41B - Runtime trust/jurisdiction evaluation
- implement real trust-tier and jurisdiction evaluation in the runtime path
- ensure reroute/split/hold/block semantics are durable and readable

### M41C - Governance operations and visibility
- add durable governance operations for trust and cross-boundary program handling
- surface readable summaries in governance/operator views and receipts where material

### M41D - Tests, docs, and continuity
- add/update tests and docs/status mappings
- preserve mixed-history compatibility and restore continuity

## Required tests
Add or update tests for at least:
1. typed trust-tier and jurisdiction models round-trip and mixed-history decode
2. runtime destination blocked by trust tier
3. runtime bundle split/reroute due to jurisdiction mismatch
4. approval-required path triggered by jurisdiction rule
5. cross-boundary program paused/degraded state durability
6. readable formatter output for trust/jurisdiction/program summaries
7. restore/process-death continuity for M41 state
8. compatibility with older bundle/history records lacking M41 fields

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
M41 is done when:
1. destination trust tiers and jurisdiction-aware governance concepts are typed and durable
2. runtime trust/jurisdiction evaluation can allow, split, reroute, hold, or block exchanges in a typed way
3. cross-boundary program state is durable and queryable
4. governance/operator/receipt surfaces can show readable trust-tier, jurisdiction, and program summaries
5. restore/replay/process death preserve M41 semantics
6. mixed old/new history remains compatible
7. tests and docs/status are updated

## What comes next
After M41, the most natural next milestone is:
- **M42 - Enterprise Cross-Boundary Governance Portfolios, Trust Tier Programs, and Jurisdiction-Aware Rollout Coordination**

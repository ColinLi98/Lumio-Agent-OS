# M42 - Enterprise Cross-Boundary Governance Portfolios, Trust Tier Programs, and Jurisdiction-Aware Rollout Coordination

## What this milestone is
M42 extends the enterprise cross-boundary governance model from individual exchange programs and destination trust tiers into a portfolio-level coordination layer.

By this point the system already supports:
- policy-safe remote learning destinations
- data residency controls and compliance export routing
- cross-boundary bundle governance and audit operations
- cross-boundary exchange programs
- destination trust tiers
- jurisdiction-aware governance operations

The next missing layer is no longer whether the system can make a safe cross-boundary decision for one bundle or one program.
The next missing layer is whether it can coordinate **multiple cross-boundary governance programs at portfolio scale**, across:
- jurisdictions
- trust tiers
- rollout waves
- destination groups
- enterprise policy programs

M42 adds that portfolio coordination layer.

## Why M42 is next
The system can already decide:
- whether an exchange is allowed, split, rerouted, held, or blocked
- whether a destination is compatible with consent, privacy, residency, and compliance policy
- whether a trust tier or jurisdiction requires special governance treatment

But it still needs to answer higher-level questions such as:
- Which cross-boundary program should advance first across multiple jurisdictions?
- Which trust-tier rollout should be paused because it creates portfolio-level risk?
- Which jurisdiction conflict is local and which one is systemic across multiple programs?
- Which destination groups are safe to promote together, and which must be separated into distinct waves?
- How should shared blockers, trust-tier policies, and jurisdiction restrictions affect portfolio rollout order and operator attention?

That is the purpose of M42.

## Goal
Build a typed, durable portfolio coordination layer for cross-boundary governance programs, trust-tier programs, and jurisdiction-aware rollout sequencing.

This milestone should let the system:
- group related cross-boundary programs into governance portfolios
- coordinate rollout waves across trust tiers and jurisdictions
- surface portfolio-level blockers, dependencies, and readiness
- recommend portfolio-level next actions
- preserve durable, auditable, readable operator visibility

## Core outcomes
After M42, the system should be able to answer:
- which cross-boundary program has highest portfolio priority
- which trust tier or jurisdiction is blocking broader rollout
- whether a portfolio should split, defer, pause, or re-sequence its waves
- which blockers are shared across multiple programs and destinations
- which portfolio-level action is recommended next, and why

## In scope

### 1. Typed portfolio and trust-tier coordination models
Add or strengthen typed concepts such as:
- `CrossBoundaryGovernancePortfolio`
- `CrossBoundaryProgramPortfolioSummary`
- `TrustTierProgram`
- `TrustTierRolloutSummary`
- `JurisdictionRolloutPlan`
- `JurisdictionRolloutConstraint`
- `PortfolioPriorityDecision`
- `PortfolioBlockerSummary`
- `PortfolioDependencySummary`
- `PortfolioCoordinationRecommendation`
- `PortfolioWaveCoordinationRecord`
- `PortfolioConflictType`
- `PortfolioConflictSummary`

Exact names may vary, but the semantic areas must be explicit and typed.

### 2. Portfolio-level prioritization and coordination
Support additive runtime logic to coordinate:
- multiple cross-boundary programs
- trust-tier-specific rollout ordering
- jurisdiction-specific defer/hold/split decisions
- shared blocker concentration across programs and destinations
- portfolio-level priority winners and losers

The system should be able to determine, durably and readably:
- which program or wave should advance next
- which should be deferred or paused
- which should be split by trust tier or jurisdiction

### 3. Trust-tier program coordination
Treat destination trust tiers as more than static labels.
The system should support typed coordination behavior such as:
- trust-tier promotion order
- trust-tier hold/defer semantics
- trust-tier compatibility groups
- trust-tier-specific governance blockers
- trust-tier-specific next-action recommendations

### 4. Jurisdiction-aware rollout coordination
At portfolio scale, jurisdictions should influence more than single exchange decisions.
Support typed runtime summaries for:
- jurisdiction-level blockers
- cross-jurisdiction dependencies
- jurisdiction-specific rollout sequencing
- jurisdiction-specific readiness or hold states
- jurisdiction-aware split or reroute recommendations

### 5. Portfolio-level governance visibility
Governance/internal/operator surfaces should be able to show:
- active portfolio(s)
- active cross-boundary programs
- trust-tier rollout state
- jurisdiction rollout state
- portfolio-level blocker buckets
- coordination recommendations
- next eligible coordination action
- shared conflict summaries

### 6. Durable timeline and audit linkage
Portfolio coordination changes should produce durable records and readable timeline items such as:
- `Portfolio priority raised`
- `Trust tier rollout deferred`
- `Jurisdiction blocker detected`
- `Shared portfolio conflict opened`
- `Portfolio recommendation updated`
- `Cross-boundary wave split by jurisdiction`

### 7. Restore/replay continuity
Portfolio, trust-tier, and jurisdiction coordination state must survive restore/replay/process death.
The model must remain additive and backward-compatible with old history.

## Out of scope
Do not do any of the following in M42:
- generic routing DSL
- BPM/workflow DSL
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- fully generalized global policy market or external policy platform
- weakening consent/privacy/residency/compliance/local-first protections

## Design principles

### 1. Portfolio truth must be durable
Portfolio priority, blockers, dependencies, and recommendations must be ledger-backed and queryable.

### 2. Trust tiers must affect real coordination
Trust tier is not just display metadata. It must influence rollout coordination and operator attention.

### 3. Jurisdiction rules remain first-class
Jurisdiction-aware behavior must stay explicit in runtime and summaries.

### 4. Shared blockers must be visible
If a blocker affects multiple programs or waves, the system must surface that as a shared portfolio concern.

### 5. Local-first remains authoritative
Remote or cross-boundary portfolio state must not silently weaken local-first safety guarantees.

## Suggested milestone breakdown

### M42A - Typed portfolio/trust-tier/jurisdiction models
Add the additive typed models and summary objects.

**Done when**
- portfolio-level typed concepts exist
- trust-tier and jurisdiction rollout summaries are representable
- serialization remains backward-compatible

### M42B - Runtime portfolio coordination
Add runtime logic for portfolio prioritization, shared blocker summaries, trust-tier ordering, and jurisdiction sequencing.

**Done when**
- portfolio next-action suggestions are durable and queryable
- trust-tier and jurisdiction state can change rollout ordering in real runtime behavior

### M42C - Governance/operator visibility
Expose portfolio state in governance/operator surfaces.

**Done when**
- operators can see priority, blockers, conflicts, and recommendations at portfolio level
- readable summary lines exist for trust-tier and jurisdiction coordination

### M42D - Tests, docs, and continuity
Add tests, validation coverage, and update docs/status.

**Done when**
- contract/runtime/formatter/continuity coverage exists for M42
- docs/status map M42 coverage and deferred items explicitly

## Required runtime behaviors
At minimum, M42 should support real, durable behavior for:
- portfolio priority winner selection
- trust-tier-specific defer/pause recommendations
- jurisdiction-aware split or reroute recommendation
- shared blocker aggregation across programs
- next-action recommendations at portfolio scope
- timeline/audit visibility for portfolio coordination operations

## Required tests
Add or update tests for at least:
1. typed portfolio/trust-tier/jurisdiction contract round-trip compatibility
2. portfolio priority and blocker summary derivation
3. shared blocker propagation across multiple cross-boundary programs
4. trust-tier-specific defer/hold behavior
5. jurisdiction-aware split/resequence recommendation behavior
6. readable formatter/governance visibility for portfolio summaries
7. restore/process-death continuity for M42 portfolio records
8. backward-compatible decode/render with older history

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
M42 is done when:
1. portfolio, trust-tier, and jurisdiction coordination concepts are typed and durable
2. runtime prioritization and recommendations can operate at portfolio scope
3. shared blockers and cross-program conflicts are visible and queryable
4. governance/operator surfaces show readable portfolio/trust-tier/jurisdiction summaries
5. restore/replay/process-death continuity preserves M42 semantics
6. backward compatibility is preserved
7. tests and docs/status are updated and passing

## What comes next
After M42, the most natural next milestone is:
- **M43 - Enterprise Cross-Boundary Governance Portfolio Analytics, Risk Budgeting, and Trust Tier Drift Operations**

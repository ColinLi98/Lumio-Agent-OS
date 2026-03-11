# M43 - Enterprise Cross-Boundary Governance Portfolio Analytics, Risk Budgeting, and Trust Tier Drift Operations

## What this milestone is
M43 extends the cross-boundary governance portfolio from coordination and rollout sequencing into a stronger **portfolio analytics and risk-governance layer**.

By this point, the system already supports:
- policy-safe remote learning destinations
- data residency controls and compliance export routing
- safe destination bundles and cross-boundary audit operations
- cross-boundary exchange programs
- destination trust tiers
- jurisdiction-aware governance operations
- cross-boundary governance portfolios
- trust-tier program coordination
- jurisdiction-aware rollout coordination

The next gap is not basic portfolio coordination.
The next gap is whether the system can **measure portfolio risk, detect trust-tier drift, manage bounded risk budgets, and recommend corrective governance actions** across a changing cross-boundary estate.

This milestone adds that layer.

## Why M43 is next
Once portfolio coordination exists, operators need more than:
- current priority
- blockers
- next recommended action

They also need to know:
- which trust tiers are drifting away from intended posture
- where jurisdiction mismatches are accumulating across the estate
- which cross-boundary programs are consuming too much risk budget
- whether a portfolio is healthy enough to continue promotion
- whether a trust tier should be tightened, held, split, or rebalanced
- whether risk concentration is creeping into a small set of destinations or jurisdictions

M43 turns the portfolio layer into a **measurable risk and drift governance system**.

## Goal
Build a durable, typed portfolio analytics and risk-budgeting layer for cross-boundary governance, with explicit support for:
- trust-tier drift detection
- jurisdiction drift and incompatibility summaries
- portfolio-level risk budgeting
- risk concentration and blocker trend summaries
- typed corrective recommendations and operations
- readable operator/governance visibility without broad console redesign

## Core outcome
After M43, the system should be able to answer:
- which trust tiers are currently healthy, at risk, or drifting
- which jurisdictions are overrepresented in blocked or rerouted flows
- how much risk budget a portfolio or program has consumed
- whether a rollout should continue, rebalance, hold, or tighten
- which corrective action is recommended and why
- whether the portfolio is converging toward intended governance posture or drifting away from it

## In scope

### 1. Typed portfolio analytics and risk models
Add or strengthen typed concepts such as:
- `CrossBoundaryPortfolioAnalyticsSummary`
- `CrossBoundaryPortfolioHealthStatus`
- `CrossBoundaryRiskBudget`
- `CrossBoundaryRiskBudgetConsumption`
- `CrossBoundaryRiskBudgetStatus`
- `TrustTierDriftSummary`
- `TrustTierDriftReason`
- `JurisdictionDriftSummary`
- `JurisdictionRiskSummary`
- `DestinationRiskConcentrationSummary`
- `PortfolioBlockerTrendSummary`
- `PortfolioRiskRecommendation`
- `PortfolioRiskDecision`
- `CrossBoundaryCorrectiveActionType`
- `CrossBoundaryCorrectiveActionRecord`

The exact names may vary, but the semantics must be explicit and typed.

### 2. Trust-tier drift detection
Support durable detection and summarization for situations such as:
- destinations operating outside intended trust tier expectations
- repeated reroutes from a nominally allowed tier into fallback or lower-confidence tiers
- policy/consent/residency/compliance mismatches concentrated in a given trust tier
- portfolio segments that remain pinned, exempted, or blocked beyond acceptable governance thresholds

Trust-tier drift must be visible in operator/governance views and durable enough for replay and analysis.

### 3. Jurisdiction drift and concentration analytics
Support durable summaries for:
- jurisdiction mismatch concentration
- repeated cross-jurisdiction fallback patterns
- residency-driven reroute or block concentration
- regions or jurisdictions with disproportionate unresolved blockers
- windows where a jurisdiction is repeatedly deferred or held for safety reasons

### 4. Risk budgeting
Introduce typed bounded risk-budget semantics for governance portfolios, for example:
- budget allocation by portfolio or program
- risk consumed by blocked/rerouted/held operations
- thresholds for at-risk or over-budget status
- durable reasons for why risk budget increased
- readable summaries for remaining budget / consumed budget / breach status

This must remain bounded and governance-oriented, not a generic financial or statistical budgeting engine.

### 5. Corrective governance recommendations and actions
Support typed corrective recommendations such as:
- tighten trust tier
- hold a jurisdiction subset
- split a portfolio by jurisdiction or trust tier
- rebalance away from an overconcentrated destination set
- request policy pack review
- request exemption review
- request replacement-plan review

These should be durable, queryable, and readable.

Additive operator/governance actions may include safe operations like:
- mark drift reviewed
- request re-evaluation
- request rebalance review
- request risk-hold
- request trust-tier review

Do not introduce destructive automation in this pass.

### 6. Governance and operator visibility
Operator/governance surfaces should be able to show, where applicable:
- portfolio health status
- trust tier drift summary
- jurisdiction drift summary
- risk budget consumed / remaining / breached
- top blocker trend families
- corrective recommendation and reason
- whether the portfolio is converging, stalled, or drifting

These should integrate into existing summaries/timelines without a broad console redesign.

### 7. Restore / replay continuity
All new summaries, recommendations, and risk-budget states must survive process death, replay, and restore continuity.
History must remain additive and backward-compatible.

## Out of scope
Do not do any of the following in M43:
- generic routing DSL
- BPM / workflow DSL
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- destructive automation
- full external risk-scoring service rollout
- generalized portfolio optimization engine beyond the bounded governance scope here

## Design principles

### 1. Risk must be typed, bounded, and explainable
Do not hide risk decisions in free text or UI-only logic.

### 2. Drift is a first-class governance concept
Trust-tier and jurisdiction drift should be durable, queryable, and operator-visible.

### 3. Historical truth must not be rewritten
New analytics or budget states must not reinterpret prior receipts or audit records.

### 4. Recommendations should be auditable
If the system recommends hold, split, tighten, or rebalance, the recommendation and its evidence must be durable and reviewable later.

### 5. Local-first and compliance protections remain intact
M43 must not weaken the current consent/privacy/residency/compliance guardrails.

## Suggested milestone breakdown

### M43A - Typed portfolio analytics and risk-budget models
Implement or strengthen typed portfolio, drift, and risk-budget concepts.

**Done when**
- typed analytics, drift, and budget models exist
- mixed old/new history remains backward-compatible

### M43B - Runtime drift and risk-budget derivation
Add runtime derivation for trust-tier drift, jurisdiction drift, and risk-budget consumption.

**Done when**
- portfolio health and risk-budget summaries are computed durably
- drift summaries are queryable and restorable

### M43C - Corrective recommendations and safe actions
Add durable corrective recommendations and bounded operator/governance actions.

**Done when**
- recommendations are typed and readable
- safe action records are durable and auditable

### M43D - Governance visibility, tests, and docs
Expose readable summaries and update tests/docs/status.

**Done when**
- operator/governance surfaces show M43 state clearly enough for internal use
- tests and docs/status are updated and green

## Required runtime behaviors

### A. Trust-tier drift derivation
The system must be able to determine whether a trust tier is:
- healthy
- at risk
- drifting
- blocked
- temporarily degraded

### B. Jurisdiction drift derivation
The system must be able to summarize whether a jurisdiction or region is causing:
- repeated reroute
- repeated block
- repeated defer
- repeated hold
- unresolved blocker concentration

### C. Risk-budget consumption
The system must be able to derive a bounded risk-budget summary such as:
- not started
- within budget
- near limit
- exceeded
- held by budget breach

### D. Recommendation generation
The system should be able to produce typed recommendations such as:
- continue
- hold
- tighten
- split
- rebalance
- review
- defer

These recommendations must be durable and readable.

## UI / summary expectations
Governance/operator surfaces should show readable lines like:
- `Trust tier B is drifting due to repeated jurisdiction reroutes.`
- `Portfolio risk budget is near limit because 4 destination groups remain blocked.`
- `Recommendation: split high-risk jurisdictions into a separate rollout lane.`
- `Jurisdiction EU-West remains blocked across 3 windows and is now marked at-risk.`
- `Portfolio is converging, but trust tier fallback concentration increased this week.`

These should remain concise, readable, and additive to the current surfaces.

## Required tests
Add or update tests for at least these cases:
1. contract round-trip for M43 analytics, drift, and risk-budget fields
2. trust-tier drift derivation and visibility
3. jurisdiction drift concentration derivation and visibility
4. risk-budget consumption summary and budget breach state
5. corrective recommendation durability and readability
6. restore/process-death continuity for M43 state
7. backward compatibility with older history that lacks M43 fields
8. operator/governance visibility formatting for M43 summaries

## Validation commands
Run and fix failures before completion:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done
M43 is done when:
1. typed portfolio analytics, drift, and risk-budget concepts exist and are durable
2. trust-tier and jurisdiction drift can be derived and restored
3. risk-budget summaries and breach states are durable and readable
4. corrective recommendations and safe actions are durable and auditable
5. governance/operator surfaces show M43 summaries clearly enough for internal use
6. backward compatibility and restore continuity are preserved
7. tests and docs/status are updated and passing

## What comes next
After M43, the most natural next milestone is:
- **M44 - Enterprise Cross-Boundary Governance Portfolio Safety Rails, Budget Guardrails, and Remediation Automation Controls**

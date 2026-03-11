# M44 - Enterprise Cross-Boundary Governance Portfolio Safety Rails, Budget Guardrails, and Remediation Automation Controls

## What this milestone is
M44 extends the enterprise cross-boundary governance portfolio from analytics and recommendations into an explicit safety and remediation control layer.

By the end of M43, the system can already:
- derive trust-tier drift, jurisdiction drift, destination concentration, blocker trends, and bounded risk budget status
- surface portfolio health and trajectory summaries
- emit durable corrective action suggestions and analytics-linked governance visibility
- preserve restore continuity and additive compatibility across old/new records

The next gap is not visibility. The next gap is **operational enforcement and safe intervention**.

M44 should add typed, durable, non-destructive controls that can:
- block unsafe portfolio progression
- enforce budget guardrails
- throttle or suppress risky remediation paths
- convert corrective recommendations into explicit, auditable remediation controls
- preserve local-first, consent, residency, compliance, and isolation guarantees

This is still not a general routing DSL, BPM engine, or destructive automation framework.
It is a bounded governance safety and remediation-control layer.

## Why M44 is next
The system now knows when a portfolio is drifting, over-concentrated, or consuming too much risk budget.
What it still needs is the ability to respond in a typed and durable way.

Without M44, operators can see:
- that a trust tier is drifting
- that jurisdiction exposure is becoming unhealthy
- that a risk budget is near or over threshold
- that corrective action is recommended

But the system still lacks a durable control plane for:
- policy-enforced safety rails
- budget hard-stop / soft-stop semantics
- remediation throttling and suppression
- safe automated follow-up that is bounded, explainable, and auditable
- durable portfolio hold / slowdown / quarantine / escalation controls

M44 closes that gap.

## Goal
Add typed safety rails, budget guardrails, and bounded remediation automation controls to the cross-boundary governance portfolio layer.

This milestone should let the system:
- classify and enforce portfolio-level safety states
- compute and apply budget guardrails in runtime decisions
- turn recommendations into safe, typed remediation controls
- pause, slow, quarantine, or gate subsets of cross-boundary operations without rewriting historical truth
- expose safety state and remediation-control provenance clearly in governance, receipt, and operator views

## Core product outcome
After M44, the system should be able to answer:
- whether a portfolio or sub-scope is inside or outside allowed budget
- whether the current state is safe, at risk, guarded, quarantined, or blocked
- whether remediation is allowed, throttled, suppressed, or approval-gated
- what guardrail caused a hold, throttle, or quarantine
- whether a corrective action was merely suggested or was actually applied as a durable governance control
- which actions remain safe to automate and which require explicit human approval

## In scope

### 1. Typed portfolio safety and budget-guardrail concepts
Add or strengthen typed concepts such as:
- `PortfolioSafetyState`
- `PortfolioSafetyRail`
- `PortfolioSafetyViolation`
- `PortfolioBudgetGuardrail`
- `PortfolioBudgetStatus`
- `PortfolioBudgetDecision`
- `PortfolioGuardrailResult`
- `PortfolioEnforcementMode`
- `PortfolioControlScope`
- `PortfolioSafetySummary`

Exact names may vary, but the semantics must be explicit and durable.

### 2. Typed remediation automation control concepts
Add or strengthen typed concepts such as:
- `RemediationAutomationPolicy`
- `RemediationAutomationEligibility`
- `RemediationAutomationSuppressionReason`
- `RemediationAutomationThrottle`
- `RemediationAutomationCooldown`
- `RemediationAutomationBudget`
- `RemediationAutomationAction`
- `RemediationAutomationDecision`
- `RemediationAutomationAuditRecord`

These should remain bounded, typed, and non-destructive.

### 3. Runtime budget-guardrail evaluation
Support runtime evaluation for:
- within budget
- nearing threshold
- threshold exceeded
- hard-stop enforced
- soft-stop / slow-down enforced
- quarantine or hold enforced
- approval required before further rollout or remediation

This must be real runtime behavior, not only summary text.

### 4. Runtime remediation-control behavior
Support bounded remediation controls such as:
- allow remediation
- throttle remediation
- cooldown active
- suppression active
- manual-review required
- hold portfolio segment
- quarantine destination or trust tier
- block further rollout under unsafe state

All such controls must be durable, auditable, and additive.

### 5. Governance / receipt / operator visibility
Expose, where applicable:
- safety state
- guardrail state
- budget status
- active enforcement mode
- remediation automation eligibility
- remediation suppression/throttle/cooldown state
- approval-required reason
- safe next-action summary

These should be readable in concise English and tied to durable records.

### 6. Restore / replay continuity
All new safety and remediation-control semantics must survive:
- process death
- restore
- replay
- mixed old/new history decoding

### 7. Query and filter support
Add or strengthen query/filter dimensions where practical for:
- safety state
- budget status
- guardrail status
- remediation automation eligibility
- suppression active
- throttle active
- quarantine active
- manual review required
- approval required

## Out of scope
Do not do the following in M44:
- generic routing DSL
- BPM / workflow DSL
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- destructive automation
- weakening M35/M36 consent/privacy/residency/compliance/local-first protections
- automatic broad remediation across scopes without durable audit and guardrails

## Design principles

### 1. Safety rails are first-class runtime controls
If the system says a portfolio is unsafe, the resulting controls must actually constrain behavior.

### 2. Budget is not only analytic, it is enforceable
Bounded budget semantics should affect what the system allows next.

### 3. Recommendations and controls are distinct
A recommendation may exist without enforcement.
An enforcement must be durable, typed, and auditable.

### 4. Non-destructive by default
Remediation automation should remain safe, bounded, and reversible where practical.

### 5. Historical meaning must not be rewritten
Future safety or remediation controls must not reinterpret past receipt or ledger truth.

## Required runtime behaviors

### A. Safety-state evaluation
The runtime must classify portfolio and sub-scope state into typed safety states based on durable analytics and guardrail thresholds.

### B. Budget enforcement
The runtime must distinguish between:
- warning-only state
- soft-stop / slowdown state
- hard-stop state
- manual approval required state

### C. Remediation control evaluation
The runtime must evaluate whether remediation is:
- allowed
- throttled
- suppressed
- cooling down
- blocked pending approval
- quarantined to a narrower safe subset

### D. Durable enforcement records
Every meaningful M44 control application should produce durable records such as:
- safety rail triggered
- budget guardrail applied
- remediation throttled
- remediation suppressed
- cooldown activated
- quarantine applied
- approval required
- approval cleared

### E. No destructive automatic control expansion
If a recommended control would expand into destructive or high-risk action, it must remain blocked or require explicit approval.

## Suggested reason-code direction
Add structured reason-code families such as:
- `ROLE_PORTFOLIO_SAFETY_AT_RISK`
- `ROLE_PORTFOLIO_SAFETY_GUARDED`
- `ROLE_PORTFOLIO_SAFETY_QUARANTINED`
- `ROLE_PORTFOLIO_BUDGET_WARNING`
- `ROLE_PORTFOLIO_BUDGET_SOFT_STOP`
- `ROLE_PORTFOLIO_BUDGET_HARD_STOP`
- `ROLE_REMEDIATION_AUTOMATION_ALLOWED`
- `ROLE_REMEDIATION_AUTOMATION_THROTTLED`
- `ROLE_REMEDIATION_AUTOMATION_SUPPRESSED`
- `ROLE_REMEDIATION_AUTOMATION_COOLDOWN_ACTIVE`
- `ROLE_REMEDIATION_AUTOMATION_APPROVAL_REQUIRED`
- `ROLE_PORTFOLIO_QUARANTINE_APPLIED`

Exact names may vary, but they must be typed, durable, and queryable.

## Governance/operator surface expectations
Without a broad redesign, the system should still expose:
- portfolio safety state
- risk budget status
- active guardrails
- remediation state
- safe next action
- why an action is blocked or slowed
- whether operator approval is required before further remediation or rollout

Readable example lines:
- `Portfolio is guarded because risk budget is near threshold.`
- `Remediation is throttled due to repeated drift in the same trust tier.`
- `Further rollout is paused until manual approval clears the hard-stop.`
- `Destination group quarantined due to jurisdiction mismatch pressure.`

## Suggested milestone breakdown

### M44A - Typed safety and budget-guardrail models
Add typed concepts for safety state, enforcement mode, guardrail results, and remediation control semantics.

**Done when**
- contracts and summaries can represent M44 states durably
- compatibility with older records is preserved

### M44B - Runtime enforcement and remediation-control behavior
Implement real runtime evaluation and enforcement for safety rails, budget guardrails, and bounded remediation automation controls.

**Done when**
- runtime behavior changes under guarded/quarantined/hard-stop states
- controls remain additive and non-destructive

### M44C - Governance/receipt/timeline visibility
Expose readable safety, budget, and remediation-control summaries in existing surfaces.

**Done when**
- operators can see why progression or remediation is allowed/blocked/throttled
- export and receipt summaries stay concise and consistent

### M44D - Tests, continuity, docs, and validation
Add or update tests, ensure restore continuity, and update milestone docs/status.

**Done when**
- tests pass
- continuity is preserved
- docs/status show exact M44 scope and deferred items

## Required tests
Add or update tests for at least:
1. contract round-trip and mixed-history decode for M44 safety/budget/remediation-control fields
2. runtime budget warning / soft-stop / hard-stop behavior
3. remediation throttle / suppression / cooldown behavior
4. manual-approval-required gating under hard-stop or unsafe portfolio state
5. quarantine application and readable visibility
6. restore/process-death continuity for M44 state
7. formatter/governance visibility coverage for M44 reason families and summaries

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
M44 is done when:
1. typed safety-rail, budget-guardrail, and remediation-control concepts exist and are durable
2. runtime can enforce warning / soft-stop / hard-stop / quarantine / approval-required behavior
3. remediation automation can be allowed, throttled, suppressed, or cooled down in a typed way
4. governance/receipt/operator surfaces show M44 state readably
5. restore/replay/process-death continuity preserves M44 state
6. tests and docs/status are updated and green

## Explicitly deferred after M44
- generic routing DSL
- BPM / workflow DSL
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- destructive automation
- fully autonomous portfolio remediation without human review controls

## What comes next
After M44, the most natural next milestone is:
- **M45 - Enterprise Governance Portfolio Policy Feedback, Budget Recalibration, and Safe Remediation Learning**

## Execution checkpoint (2026-03-06)
- Status: completed
- Implemented:
  - typed M44 portfolio safety, budget guardrail, enforcement mode, remediation automation, suppression reason, safety rail, budget guardrail, safety summary, and remediation control contracts
  - deterministic runtime derivation of warning / soft-stop / hard-stop / quarantine / approval-required behavior on top of durable M43 analytics and cross-boundary portfolio truth
  - additive persistence and restore continuity for safety rails, budget guardrails, portfolio safety summaries, and remediation automation controls
  - readable governance summary, governance-case detail/search, execution receipt/export, role-trace, and Activity portfolio-surface visibility for M44 state
- Validation:
  - `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
  - `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
  - `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
  - `./gradlew :app-backend-host:assembleDebug` -> PASS
  - `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
  - `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

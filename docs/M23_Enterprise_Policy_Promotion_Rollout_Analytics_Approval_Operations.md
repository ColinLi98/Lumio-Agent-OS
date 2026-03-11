# M23 - Enterprise Policy Promotion, Rollout Analytics, and Approval Operations

## Status
Proposed next milestone after M22.

## Why M23 now

The system now has:
- workflow templates and workflow runs
- workflow policies, SLA timers, escalation timers, and automation guardrails
- policy packs with tenant/workspace overrides
- simulation, throttle, cooldown, suppression, and precedence resolution as real runtime semantics
- rollout safety, rollout stages, simulation-before-enforcement, approval governance, freeze, and rollback semantics
- durable receipts, proof-ledger history, governance analytics, operator console, and enterprise identity/provider/vault semantics

The next missing layer is not policy expression.
The next missing layer is **policy promotion and operational rollout management**.

The product now needs a coherent way to answer:
- Which policy pack or override is ready to be promoted?
- What simulation evidence exists for a promotion candidate?
- What rollout analytics support or block the next promotion stage?
- Which approvals are still pending for a risky rollout transition?
- Which rollout should be paused, rolled back, or advanced?
- Which tenant/workspace is deviating from policy expectations and why?

M23 converts the current policy system from "configurable and enforceable" into a more complete **promotion, analytics, and approval operations system**.

## Goal

Add typed, durable support for:
- policy promotion requests and decisions
- rollout analytics summaries and readiness evaluation
- approval operations queues and review flows
- promotion/advance/pause/rollback recommendations grounded in durable evidence

This is an enterprise operations milestone, not a BPM/DSL milestone.

## Core outcome

After M23, an operator should be able to:
1. identify a policy pack or override candidate for promotion
2. inspect simulation and rollout evidence before promotion
3. see whether the promotion is blocked by approval, analytics, or guardrail conditions
4. approve, reject, pause, or roll back policy rollout changes through typed and auditable operations
5. understand promotion state and history through governance and receipt surfaces

## In scope

### 1. Typed policy promotion models
Add or strengthen typed concepts such as:
- `PolicyPromotionRequest`
- `PolicyPromotionDecision`
- `PolicyPromotionStatus`
- `PolicyPromotionTarget`
- `PolicyPromotionWindow`
- `PolicyPromotionCandidate`
- `PolicyPromotionEvidenceSummary`
- `PolicyPromotionBlocker`
- `PolicyPromotionRecommendation`
- `PolicyPromotionAuditRecord`

Exact names may vary, but the concepts must be explicit and durable.

### 2. Rollout analytics and readiness evaluation
Add typed analytics summaries that make rollout readiness inspectable.
Examples:
- `RolloutAnalyticsSummary`
- `RolloutEvaluationWindow`
- `RolloutHealthBucket`
- `SimulationEvidenceSummary`
- `PromotionReadinessResult`
- `PromotionRiskSummary`
- `PolicyOutcomeDelta`

At minimum, readiness should be able to account for:
- simulation-only results
- approval friction
- dispute/rollback signals
- automation suppression or throttle patterns
- verification/proof quality signals where applicable
- role/provider/data-scope behavior shifts if relevant to the policy target

### 3. Approval operations queue
Add or strengthen typed approval operations concepts.
Examples:
- `ApprovalOperationQueueItem`
- `ApprovalOperationDecision`
- `ApprovalOperationStatus`
- `ApprovalOperationAction`
- `ApprovalReviewSummary`
- `ApprovalEscalationState`

This should support durable queues for:
- promotion approval pending
- rollout-stage advance pending
- freeze/unfreeze review pending
- rollback confirmation pending

### 4. Promotion and rollout operations in runtime
Introduce real runtime handling for actions such as:
- create promotion request
- approve promotion request
- reject promotion request
- pause rollout
- resume rollout
- roll back rollout
- advance rollout stage when allowed

These actions must:
- be typed and auditable
- respect existing precedence and safety rules
- not silently rewrite historical semantics
- update governance/receipt/summary views coherently

### 5. Governance and operator visibility
Governance/operator surfaces should show, where applicable:
- active policy pack/version
- source scope (tenant/workspace/pack)
- promotion candidate status
- rollout stage and rollout mode
- simulation evidence summary
- approval status
- readiness / blockers / recommendation
- freeze / rollback state
- latest promotion decision or pending approval item

### 6. Local-first and compatibility
Continue to preserve:
- additive, optional/default field compatibility
- local-first fallback
- durable historical meaning
- mixed old/new history decode and render behavior

## Out of scope

Do **not** do the following in M23:
- general-purpose BPM or workflow DSL
- destructive automation
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- enterprise policy language redesign
- full remote SaaS rollout platform
- end-user-facing redesign

## Product and systems principles

1. **Promotion is evidence-based**
   A promotion should not be a blind flag flip. It should be grounded in simulation and rollout evidence.

2. **Approval operations are first-class**
   Approval queues and decisions must be typed, durable, and queryable.

3. **Historical truth remains stable**
   Promotion or rollback decisions must not rewrite the meaning of past receipts or history.

4. **Local-first safety remains intact**
   Remote or higher-scope rollout semantics must not silently override local safety baselines.

5. **Readable operator semantics**
   Promotion readiness, blockers, and approval state must be readable in governance surfaces.

## Suggested milestone breakdown

### M23A - Typed promotion and approval models
Implement the core typed concepts for policy promotion, readiness, blockers, and approval operations.

**Done when**
- promotion and approval operation records are typed and durable
- compatible optional/default fields are added where needed
- docs/spec/status are aligned

### M23B - Rollout analytics and readiness evaluation
Implement rollout analytics summaries and promotion readiness evaluation.

**Done when**
- the system can summarize evidence for a promotion candidate
- readiness/blocker/recommendation outputs are durable and queryable
- simulation evidence and rollout-state evidence can be surfaced together

### M23C - Runtime promotion/approval actions
Implement runtime actions for approve/reject/pause/resume/rollback/advance where allowed.

**Done when**
- operator actions are typed, auditable, and reflected in governance state
- invalid or unsafe transitions are denied with durable reasons
- historical semantics remain stable

### M23D - Governance/operator surfacing, tests, docs
Surface promotion and approval operations in governance/operator views and complete test coverage.

**Done when**
- operator surfaces expose promotion state, blockers, approval status, and recommendations readably
- tests cover serialization, readiness evaluation, promotion actions, rollback/pause cases, and restore continuity
- docs/status include an explicit M23 coverage map

## Required typed surfaces

### Promotion candidate surface
A policy candidate should be able to show:
- source pack / version
- target scope
- candidate status
- rollout mode / current rollout stage
- recommendation
- blockers
- evidence summary

### Approval queue surface
An approval queue item should be able to show:
- operation type
- policy target
- scope
- requested action
- current approval status
- required approver type or role if modeled
- blockers / notes / escalation state

### Readiness surface
A readiness summary should be able to show:
- simulation-only results
- live rollout analytics snapshot
- policy safety deltas
- recommendation: advance / hold / reject / rollback

## Runtime behavior requirements

### Promotion actions
The system should support durable behavior for:
- promotion request creation
- approval/rejection
- rollout stage advance if allowed
- pause / unpause
- rollback initiation and confirmation where already supported by current rollback semantics

### Recommendation engine (bounded)
This milestone may add a bounded recommendation layer for:
- advance when safe
- hold when evidence is insufficient
- reject when blockers are present
- roll back when policy outcome deltas are unacceptable

Do not make recommendations silently enforce changes in this pass.
Recommendations must remain reviewable and durable.

### Blockers and denials
If a transition is denied, it must be denied with typed blockers and readable reason output.
Examples:
- simulation evidence insufficient
- approval required
- freeze active
- unresolved critical disputes too high
- verification failure rate above threshold
- automation suppression signals indicate instability

## Suggested reason-code families

Introduce or strengthen structured families such as:
- `ROLE_POLICY_PROMOTION_REQUESTED`
- `ROLE_POLICY_PROMOTION_APPROVED`
- `ROLE_POLICY_PROMOTION_REJECTED`
- `ROLE_POLICY_PROMOTION_BLOCKED`
- `ROLE_POLICY_ROLLOUT_ADVANCE_ALLOWED`
- `ROLE_POLICY_ROLLOUT_ADVANCE_DENIED`
- `ROLE_POLICY_ROLLOUT_PAUSED`
- `ROLE_POLICY_ROLLOUT_RESUMED`
- `ROLE_POLICY_ROLLOUT_ROLLED_BACK`
- `ROLE_POLICY_APPROVAL_REQUIRED`
- `ROLE_POLICY_APPROVAL_PENDING`
- `ROLE_POLICY_APPROVAL_GRANTED`
- `ROLE_POLICY_APPROVAL_DENIED`
- `ROLE_POLICY_SIMULATION_EVIDENCE_INSUFFICIENT`
- `ROLE_POLICY_ANALYTICS_RECOMMENDATION_HOLD`
- `ROLE_POLICY_ANALYTICS_RECOMMENDATION_ADVANCE`
- `ROLE_POLICY_ANALYTICS_RECOMMENDATION_ROLLBACK`

Exact names may vary, but the semantics should remain structured and durable.

## Persistence and continuity

M23 must preserve:
- additive/backward-compatible contracts
- process death / restore continuity for promotion/approval states
- historical stability of old records
- mixed old/new decode and render support

Promotion/approval state should survive restore with:
- current stage
- pending actions
- latest decision
- evidence summary
- blocker summary

## Testing requirements

At minimum, add or update tests for:

### Domain / contract tests
- promotion/approval/readiness models round-trip and backward compatibility

### Orchestrator / runtime tests
- promotion request creation durability
- approval / rejection durability
- invalid stage advance denied by transition policy
- pause / resume / rollback state transitions
- readiness/blocker/recommendation evaluation
- historical meaning remains stable after promotion changes

### Persistence tests
- restore continuity keeps promotion/approval/readiness state
- mixed old/new records remain compatible

### Formatter / UI tests
- governance/operator summaries include promotion/readiness/approval lines
- export snippets and searchable text include key M23 provenance where intended
- blocker/recommendation lines are readable in English

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

M23 is done when:
1. policy promotion, readiness, blockers, and approval operation records are typed and durable
2. rollout analytics can produce readiness/blocker/recommendation summaries grounded in existing durable truth
3. promotion and approval actions are real runtime behavior, not wording-only state changes
4. governance/operator surfaces can show promotion status, readiness, blockers, and approval state readably
5. historical meaning remains stable and backward-compatible
6. tests cover serialization, readiness evaluation, promotion actions, denial paths, restore continuity, and readable visibility
7. docs/status are updated with exact M23 mapping and deferred items

## Deferred after M23

Expected next milestone after M23:
- **M24 - Enterprise Policy Governance Programs, Pack Lifecycle Operations, and Cross-Tenant Rollout Controls**

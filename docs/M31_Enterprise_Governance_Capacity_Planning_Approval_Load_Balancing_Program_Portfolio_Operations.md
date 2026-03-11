# M31 - Enterprise Governance Capacity Planning, Approval Load Balancing, and Program Portfolio Operations

## What this milestone is
**M31 - Enterprise Governance Capacity Planning, Approval Load Balancing, and Program Portfolio Operations**

This milestone turns the current rollout-governance system into a capacity-aware portfolio control layer.

By M30, the system already supports:
- policy packs and override precedence
- workflow policy / SLA / escalation / automation guardrails
- rollout safety, simulation, approval governance
- rollout waves, calendar-aware promotion, and cross-window controls
- promotion readiness, cross-wave analytics, and window-aware governance operations
- multi-program coordination, prioritization, conflict handling, and escalation operations

M31 adds the missing enterprise operations dimension:
- approval load planning
- reviewer bandwidth and queue pressure awareness
- portfolio capacity constraints
- prioritization under limited governance capacity
- explicit defer / reassign / reroute semantics when human review becomes the bottleneck

---

## Why now
The current system can already decide:
- what should roll out
- in which wave/window
- under what readiness/approval/guardrail rules
- how programs should be prioritized or deferred

What it cannot yet do well is answer:
- do we have enough approval capacity to run these programs safely?
- which review queues are overloaded?
- which program should win when approval bandwidth is limited?
- when should a promotion be delayed because review capacity is exhausted rather than because policy is invalid?
- how should approvals be balanced across programs, teams, and scopes without violating governance rules?

That is the point of M31.

---

## Goal
Add typed, durable, auditable support for:
- capacity planning
- approval queue pressure analysis
- load balancing across governance operations
- portfolio-level prioritization under constrained human approval capacity
- readable operator and governance visibility into bottlenecks and rebalancing decisions

This is still an additive, local-first, backward-compatible governance milestone.
It is **not** a BPM/DSL rewrite and **not** a broad operator console redesign.

---

## In scope

### 1. Typed capacity and approval-load models
Add or strengthen typed concepts such as:
- `GovernanceCapacityPool`
- `GovernanceCapacityScope`
- `ApprovalCapacityBudget`
- `ApprovalQueuePressureSummary`
- `ApprovalLoadBucket`
- `ProgramCapacityImpactSummary`
- `PortfolioCapacitySnapshot`
- `ApprovalBalancingDecision`
- `ApprovalDeferralReason`
- `GovernanceCapacityConstraint`
- `ApprovalAssignmentRecommendation`
- `CapacityAwarePromotionDecision`
- `ProgramPortfolioSummary`

Exact names may vary, but the concepts must be explicit and typed.

### 2. Capacity-aware runtime behavior
The runtime should be able to incorporate capacity state into governance decisions, including:
- whether a promotion can proceed now
- whether approval must be deferred
- whether load should be rebalanced
- whether a lower-priority program should be paused due to approval scarcity
- whether a case should be reassigned or held because the current queue is saturated

### 3. Approval load balancing
Add real runtime behavior for safe, typed balancing decisions such as:
- choose another eligible approval queue or operator group
- defer a program because approval capacity is exhausted
- downgrade non-urgent work to avoid starving critical work
- surface “capacity blocked” distinctly from policy blocked or rollout blocked

### 4. Portfolio-level operations
Add support for multi-program, multi-wave portfolio visibility, including:
- review load by program
- review load by tenant/workspace scope
- approval bottleneck summaries
- critical-path program detection
- capacity-based recommendation and defer signals

### 5. Governance/operator visibility
Governance, receipt, operator, and timeline surfaces should be able to show:
- capacity pressure summary
- approval load status
- queue saturation / bottleneck state
- why a program was deferred due to capacity
- why another queue/assignee was recommended
- portfolio priority vs available review capacity

### 6. Durability and continuity
Capacity-aware decisions and summaries must:
- survive restore/replay/process death
- remain backward-compatible with old records
- not rewrite existing truth semantics
- remain additive to the current ledger / receipt / governance model

---

## Explicitly out of scope
- no BPM / general workflow DSL
- no orchestrator rewrite
- no broad operator console redesign
- no broad storage/history rewrite
- no destructive automation
- no full staffing / HR system integration
- no enterprise-wide workforce planning suite
- no full ML-based scheduling optimizer in this pass

---

## Design principles

### 1. Capacity is advisory until it becomes blocking
Capacity pressure should be surfaced early, but only become a hard blocker where policy/rules say it should.

### 2. Capacity constraints are not policy failures
The UI, receipts, and governance traces must clearly distinguish:
- blocked by policy
- blocked by rollout safety
- blocked by calendar/window
- blocked by approval capacity

### 3. Preserve explicit precedence
Capacity-aware behavior must not silently override:
- task explicit constraints
- hard policy denials
- hard approval requirements

### 4. Portfolio truth stays additive
Do not create a competing truth model. Extend the durable ledger / governance summaries.

### 5. Explainability stays first-class
Every capacity-aware defer, hold, reassignment recommendation, or balancing decision must remain visible and explainable.

---

## Typed model direction

### Capacity pool and budget
Suggested typed concepts:
- `GovernanceCapacityPool` for a queue/team/scope with bounded review capacity
- `ApprovalCapacityBudget` for available review slots or weighted capacity over a time horizon
- `GovernanceCapacityConstraint` for hard or soft limits

### Pressure and balancing
Suggested typed concepts:
- `ApprovalQueuePressureSummary`
- `ApprovalLoadBucket`
- `ApprovalBalancingDecision`
- `ApprovalDeferralReason`
- `ApprovalAssignmentRecommendation`

### Portfolio summaries
Suggested typed concepts:
- `ProgramPortfolioSummary`
- `PortfolioCapacitySnapshot`
- `ProgramCapacityImpactSummary`
- `CapacityAwarePromotionDecision`

### Readable visibility
These should be able to drive readable summary fields on:
- governance case summary
- execution receipt summary where relevant
- governance/operator timeline
- portfolio home / queue summaries

---

## Runtime behaviors to implement

### A. Capacity-aware promotion gating
When a promotion is otherwise eligible, runtime should still be able to say:
- allowed now
- deferred by capacity
- reassigned to another approval pool
- held until next eligible capacity window

### B. Approval balancing decisions
Where safe and supported, runtime should be able to emit a typed balancing decision such as:
- `REMAIN_IN_CURRENT_QUEUE`
- `REASSIGN_TO_LOWER_PRESSURE_QUEUE`
- `DEFER_FOR_CAPACITY`
- `PAUSE_LOWER_PRIORITY_PROGRAM`
- `RESERVE_CAPACITY_FOR_CRITICAL_PROGRAM`

### C. Capacity-aware prioritization under contention
When multiple programs compete for the same approval bandwidth, runtime should be able to produce a deterministic, auditable result.

### D. Timeline and governance visibility
Capacity-related transitions must appear in timeline/governance summaries, for example:
- `Deferred due to approval capacity`
- `Reassigned to lower-pressure queue`
- `Held to protect critical-path approvals`
- `Promotion resumed after capacity became available`

---

## Canonical reason-code direction
Add structured reason families where needed, for example:
- `ROLE_GOVERNANCE_CAPACITY_DEFERRED`
- `ROLE_GOVERNANCE_CAPACITY_REASSIGNED`
- `ROLE_GOVERNANCE_CAPACITY_BLOCKED`
- `ROLE_GOVERNANCE_CAPACITY_RESUMED`
- `ROLE_GOVERNANCE_PORTFOLIO_PRIORITIZED`
- `ROLE_GOVERNANCE_APPROVAL_QUEUE_SATURATED`
- `ROLE_GOVERNANCE_APPROVAL_LOAD_BALANCED`
- `ROLE_GOVERNANCE_CRITICAL_PROGRAM_RESERVED`

Use structured reason codes as primary machine-readable output.
Readable summaries should derive from them.

---

## Governance / operator visibility requirements
At minimum, internal surfaces should be able to show:
- capacity pressure
- approval queue load
- bottlenecked program count
- deferred-by-capacity state
- reassignment recommendation or balancing outcome
- critical-path protected capacity
- next available approval window or next available capacity signal

This does **not** require a broad console redesign. Additive UI and formatter expansion is preferred.

---

## Suggested milestone breakdown

### M31A - Typed capacity and portfolio models
Add or strengthen typed contracts and summaries for capacity, load, balancing, and portfolio state.

**Done when**
- capacity/load/portfolio concepts are explicit and typed
- compatibility with old records is preserved

### M31B - Capacity-aware runtime decisions
Implement real runtime behavior for defer/reassign/balance/priority decisions.

**Done when**
- runtime can emit real typed capacity-aware decisions
- hard policy semantics remain authoritative

### M31C - Governance/operator visibility
Surface capacity and balancing signals in governance/operator/receipt/timeline summaries.

**Done when**
- operators can tell whether a program is blocked by policy or by approval capacity
- portfolio bottlenecks are readable without deep raw inspection

### M31D - Durability, restore continuity, tests, and docs
Add restore/replay continuity and test coverage. Update spec/plan/status.

**Done when**
- capacity-aware state survives restore and mixed old/new histories
- tests pass
- docs/status reflect real M31 scope and deferred items

---

## Required test scenarios
Add or update tests for at least these scenarios:

1. capacity-aware defer when approval pool is saturated
2. reassignment recommendation when another eligible queue has lower pressure
3. lower-priority program paused to protect a critical-path program
4. capacity block is visible and distinct from policy block
5. restore continuity preserves capacity-aware decisions and summaries
6. mixed old/new history remains decodable and readable
7. timeline/formatter output clearly reflects capacity-driven transitions
8. portfolio analytics summarize bottlenecks and balancing outcomes correctly

---

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

Add any new M31-specific tests to the validation summary.

---

## Definition of done
M31 is done when:
1. capacity, load, balancing, and portfolio concepts are typed and durable
2. runtime can emit real capacity-aware governance decisions
3. policy blocks and capacity blocks remain distinct and explainable
4. governance/operator/receipt/timeline surfaces can expose approval load and bottleneck state readably
5. restore/replay continuity is preserved
6. backward compatibility remains intact
7. tests and docs/status are updated

---

## Deliverables expected from Codex
At the end of the run, report:
- changed files
- typed model additions or strengthened usage
- runtime capacity/balancing behaviors added
- visibility/formatter updates
- persistence/compatibility changes
- tests added or updated
- exact deferred items
- blockers, if any

---

## What comes after M31
The next natural step after M31 is:
**M32 - Enterprise Governance Portfolio Simulation, Scenario Planning, and Capacity Forecast Operations**

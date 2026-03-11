# M30 - Enterprise Rollout Program Coordination, Multi-Program Prioritization, and Escalation Operations

## What this milestone is

M30 turns the existing rollout and policy governance stack into a coordinated multi-program control layer.

By M29, the system can already:
- manage policy packs, overrides, and workflow policies
- evaluate rollout readiness and blockers
- schedule by windows and calendars
- operate waves, defer/pause/resume/expire flows
- surface readiness and governance state in receipts and operator views

The next step is to handle the harder enterprise reality:
multiple rollout programs competing for the same windows, tenants, workspaces, operator attention, and approval bandwidth.

M30 adds a durable coordination layer for:
- multi-program priority
- dependency and conflict handling
- contention-aware scheduling
- escalation operations
- cross-program governance decisions

## Why now

The system now has enough single-program rollout intelligence that the next operational bottleneck is no longer "can one rollout be governed safely?"
It is now:
- which rollout should go first
- which program must wait
- which blocked program should be escalated
- which program is creating risk for another program
- which windows and capacities are oversubscribed
- how operators can reason about competing rollout streams without losing auditability

Without M30, governance remains locally consistent but globally inefficient.
With M30, rollout governance becomes portfolio-aware.

## Goal

Add a typed, durable, audit-friendly coordination layer for multiple concurrent rollout programs, including priority arbitration, dependency handling, contention-aware scheduling, and escalation operations.

## In scope

### 1. Typed multi-program coordination models
Add or strengthen typed concepts such as:
- `RolloutProgramPriority`
- `RolloutProgramCoordinationState`
- `RolloutProgramDependency`
- `RolloutProgramConflict`
- `RolloutProgramContentionSummary`
- `RolloutProgramPriorityDecision`
- `RolloutProgramEscalationState`
- `RolloutProgramEscalationAction`
- `RolloutProgramResourceWindow`
- `RolloutProgramCapacitySummary`
- `RolloutProgramCoordinationRecord`
- `CrossProgramGovernanceSummary`

Exact names may vary, but the concepts must be explicit, typed, and durable.

### 2. Priority arbitration and precedence
Support runtime evaluation of competing programs using typed rules such as:
- priority level
- program class / criticality
- explicit operator override
- dependency blocking
- conflict severity
- window/capacity contention
- approval or promotion state
- pause/hold state

Priority must be durable, queryable, and visible.

### 3. Dependency and conflict handling
Programs may depend on or conflict with each other.
Support typed handling for:
- depends-on relationships
- blocked-by relationships
- cannot-run-with relationships
- shared-target contention
- shared-window contention
- shared-operator-capacity contention

These should feed both runtime decisions and governance visibility.

### 4. Escalation operations
Add typed escalation operations for rollout coordination.
Examples:
- escalate blocked program
- escalate capacity contention
- escalate dependency deadlock
- escalate missed promotion window
- escalate repeated defer/hold state

Escalation must be durable, visible, and auditable.

### 5. Coordination visibility in governance/operator surfaces
Governance and operator surfaces should show, where relevant:
- active program priority
- dependency blockers
- conflict reasons
- contention buckets
- escalation state
- recommended next action
- why one program won a window and another was deferred

This should remain additive, not a broad console redesign.

### 6. Restore/replay continuity
All coordination, priority, dependency, contention, and escalation state must survive restore and replay in the same additive, backward-compatible way as previous milestones.

## Out of scope

- full BPM or workflow DSL
- destructive automation
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- full enterprise portfolio management suite
- remote multi-team planning backend

## Design principles

1. **Typed, not narrative-only**
   Coordination must be a real runtime and ledger concept, not a UI explanation only.

2. **Authoritative truth remains the existing ledger/governance model**
   M30 must extend, not replace, the current durable truth chain.

3. **Deterministic arbitration**
   If two programs compete, the winning reason must be explainable and stable.

4. **Escalation is additive, not destructive**
   Escalation should surface and coordinate, not silently mutate past truth.

5. **Backward-compatible evolution**
   New fields should be optional/defaulted, and older records must still decode and render.

## Runtime behavior requirements

### A. Multi-program priority resolution
If multiple rollout programs are simultaneously eligible, the system should produce a durable priority decision using typed rules.

At minimum, the decision should be able to answer:
- which program won
- which program was deferred
- whether the outcome was due to priority, dependency, conflict, contention, or explicit override
- what the next eligible state is for the losing program

### B. Dependency blocking
If a program depends on another, the blocked state must be durable and readable.

### C. Conflict and contention handling
If two programs cannot safely proceed together, the system should:
- mark the conflict explicitly
- choose a durable outcome (winner/loser/defer/pause)
- surface the reasoning in governance/receipt/timeline summaries

### D. Escalation
Escalation operations must be durable and auditable.
At minimum, support typed escalation for:
- blocked program
- repeated defer
- missed window
- resource contention
- unresolved dependency chain

### E. Window-aware coordination
M30 should build on existing M27/M28 time-aware rollout logic.
A program may be eligible in principle but still lose due to:
- another program owning the same wave/window
- maintenance/blackout interactions
- capacity or queue contention

## Suggested typed additions

### Coordination
- `RolloutProgramCoordinationState`
- `RolloutProgramPriorityDecision`
- `RolloutProgramDecisionReason`
- `RolloutProgramBlockedBy`
- `RolloutProgramDeferredBy`

### Dependency/conflict
- `RolloutProgramDependency`
- `RolloutProgramConflict`
- `RolloutProgramConflictSeverity`
- `RolloutProgramContentionType`

### Escalation
- `RolloutProgramEscalationState`
- `RolloutProgramEscalationReason`
- `RolloutProgramEscalationAction`
- `RolloutProgramEscalationAuditRecord`

### Visibility and analytics
- `CrossProgramGovernanceSummary`
- `ProgramPriorityBucket`
- `ProgramContentionBucket`
- `ProgramEscalationBucket`

## Canonical reason-code direction

Add structured reason families where needed, for example:
- `ROLE_ROLLOUT_PROGRAM_PRIORITY_APPLIED`
- `ROLE_ROLLOUT_PROGRAM_DEFERRED_BY_PRIORITY`
- `ROLE_ROLLOUT_PROGRAM_BLOCKED_BY_DEPENDENCY`
- `ROLE_ROLLOUT_PROGRAM_CONFLICT_DETECTED`
- `ROLE_ROLLOUT_PROGRAM_WINDOW_CONTENTION`
- `ROLE_ROLLOUT_PROGRAM_ESCALATION_OPENED`
- `ROLE_ROLLOUT_PROGRAM_ESCALATION_RESOLVED`
- `ROLE_ROLLOUT_PROGRAM_CAPACITY_BLOCKED`

The exact naming may vary, but the families should be typed and queryable.

## Governance / operator visibility requirements

At minimum, add visibility for:
- current program priority
- current coordination state
- dependency blockers
- contention class
- escalation state
- readable next-action hint

Readable examples:
- `Deferred by higher-priority rollout program.`
- `Blocked by dependency on rollout program X.`
- `Window contention detected; next eligible window scheduled.`
- `Escalated after repeated defer across two windows.`

## Suggested milestone slices

### M30A - Priority and coordination model
- add typed coordination and priority records
- wire deterministic arbitration behavior

### M30B - Dependency and contention runtime
- add dependency/conflict/contention evaluation and durable recording
- add readable summaries

### M30C - Escalation operations
- add typed escalation state, actions, and durable audit trail
- expose escalation visibility in governance/operator summaries

### M30D - Tests, docs, and validation
- add/update tests
- update spec/plan/status and memory docs

## Required tests

Add or update tests for at least:
1. higher-priority program wins a shared window
2. lower-priority program is deferred with durable reason trace
3. dependency-blocked program remains blocked until dependency clears
4. conflict/contention creates readable and durable summaries
5. escalation opens after repeated defer/block conditions
6. restore continuity preserves coordination and escalation state
7. formatter/export lines include priority/dependency/contention/escalation signals
8. older payloads still decode/render with optional/defaulted fields

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

M30 is done when:
1. multiple rollout programs can be coordinatively prioritized using typed runtime behavior
2. dependency, conflict, and contention states are durable and readable
3. escalation operations are typed, auditable, and visible
4. governance/operator surfaces show multi-program coordination state clearly enough for internal use
5. restore/replay continuity preserves coordination and escalation truth
6. tests cover priority, dependency, contention, escalation, visibility, and compatibility
7. docs/status are updated with exact scope and deferred items

## Deliverables

At the end of the run, report:
- changed files
- typed coordination/priority/dependency/escalation additions
- runtime behaviors added
- persistence/compatibility changes
- tests added or updated
- remaining deferred items
- blockers, if any

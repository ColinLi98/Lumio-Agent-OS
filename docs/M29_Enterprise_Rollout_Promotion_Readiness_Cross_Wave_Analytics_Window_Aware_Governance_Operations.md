# M29 - Enterprise Rollout Promotion Readiness, Cross-Wave Analytics, and Window-Aware Governance Operations

## What this milestone is
M29 turns the rollout system from a time-aware wave engine into a promotion and readiness control layer.

By M28, the system can already:
- manage rollout waves
- evaluate calendar windows and blackout periods
- defer or pause work across windows
- track next eligible execution times
- carry forward work between windows

The next missing layer is not raw timing. It is enterprise rollout operations:
- when a rollout is actually ready to be promoted
- how waves compare against one another
- which blockers are localized versus systemic
- which windows are producing repeated delay or drift
- how operators should advance, pause, defer, or hold promotion with evidence

## Goal
Add typed rollout-promotion readiness, cross-wave analytics, and window-aware governance operations so that enterprise rollout can be evaluated, promoted, delayed, or held using durable evidence rather than ad-hoc operator judgment.

## Why this is the right next step
The system already has:
- workflow templates and workflow policy packs
- tenant and workspace overrides
- simulation and automation guardrails
- approval governance for rollout
- cross-tenant governance programs and lifecycle controls
- safe remediation scheduling and multi-stage automation governance
- rollout waves and calendar-aware controls

What is missing is a stable layer for:
- promotion readiness evaluation
- cross-wave comparison
- window-effect analytics
- blocker classification and prioritization
- promotion and hold operations grounded in durable runtime evidence

M29 fills that gap.

## In scope

### 1. Typed rollout-promotion readiness models
Add or strengthen additive typed concepts such as:
- `RolloutPromotionCandidate`
- `RolloutPromotionReadinessSummary`
- `RolloutPromotionDecision`
- `RolloutPromotionBlocker`
- `RolloutPromotionRecommendation`
- `RolloutPromotionOperation`
- `CrossWaveAnalyticsSummary`
- `WaveHealthBucket`
- `WindowImpactSummary`
- `WindowDelayReason`
- `GovernanceOperationStatus`

Exact names may vary, but the concepts must be explicit and typed.

### 2. Cross-wave analytics
The system should be able to compare waves within the same rollout/governance program, including where applicable:
- success versus carry-forward rate
- pause and defer rate
- approval-wait rate
- simulation-only rate
- window-block rate
- blackout-block rate
- expiry rate
- repeated blocker families

### 3. Window-aware governance operations
Add runtime operations and summaries for:
- promote current wave
- hold promotion
- defer promotion to next eligible window
- pause rollout progression
- resume rollout progression
- expire stale promotion candidates
- attach blocker and recommendation summaries

These must be real typed/runtime behaviors, not just UI strings.

### 4. Readiness and blocker evidence
Promotion readiness should be computed from durable signals, including where applicable:
- approval state
- simulation results
- automation guardrail status
- SLA/escalation state
- blocker families
- window eligibility
- calendar delay patterns
- cross-wave drift
- carry-forward burden

### 5. Readable visibility in governance surfaces
Governance/receipt/operator surfaces should show readable summaries for:
- current wave readiness
- promotion recommendation
- blockers
- next eligible promotion window
- window delay reason
- hold/pause/expired state
- cross-wave health comparison

### 6. Backward-compatible persistence and replay
All new M29 records and summaries must remain additive and backward-compatible.
Restore/replay continuity must preserve:
- promotion readiness
- blocker summaries
- cross-wave analytics summaries
- window-aware governance operations

## Out of scope
Do not do the following in M29:
- do not add a general BPM or workflow DSL
- do not rewrite the orchestrator
- do not do a broad operator console redesign
- do not do a broad storage/history rewrite
- do not introduce destructive automation
- do not create a separate truth model outside the existing receipt/ledger/governance chain

## Runtime behavior expectations

### Promotion readiness
The system should compute promotion readiness using typed evidence and expose whether a wave is:
- ready
- ready with caution
- blocked
- deferred
- expired
- paused

### Cross-wave comparison
The system should be able to explain why one wave is promotable and another is not.
This should include both machine-readable reasons and readable summaries.

### Window-aware operations
If a promotion cannot proceed due to timing constraints, the system should record and surface:
- blocked by blackout
- blocked by maintenance window
- deferred to next eligible window
- expired before eligible window
- paused by governance hold

### Reason-code output
Canonical structured reason codes should remain primary.
Readable summaries should derive from these typed reasons, not replace them.

## Suggested typed reason-code families
Use or extend canonical structured reason-code families such as:
- `ROLE_ROLLOUT_PROMOTION_READY`
- `ROLE_ROLLOUT_PROMOTION_READY_WITH_CAUTION`
- `ROLE_ROLLOUT_PROMOTION_BLOCKED`
- `ROLE_ROLLOUT_PROMOTION_DEFERRED_TO_WINDOW`
- `ROLE_ROLLOUT_PROMOTION_EXPIRED`
- `ROLE_ROLLOUT_WAVE_HEALTH_DEGRADED`
- `ROLE_ROLLOUT_WAVE_HEALTH_STABLE`
- `ROLE_WINDOW_BLOCK_BLACKOUT`
- `ROLE_WINDOW_BLOCK_MAINTENANCE`
- `ROLE_WINDOW_NEXT_ELIGIBLE_COMPUTED`
- `ROLE_CROSS_WAVE_BLOCKER_REPEAT`
- `ROLE_CROSS_WAVE_CARRY_FORWARD_PRESSURE`

Exact names may vary, but structured coverage is required.

## Governance surface expectations
Add or strengthen the following internal/operator-facing visibility:
- wave readiness summary
- blocker bucket summary
- cross-wave health summary
- next eligible window summary
- promotion decision state
- hold/pause/defer/expire status
- readable line items for top blocker families and window causes

This should remain additive to the current operator surface rather than a full redesign.

## Suggested milestone breakdown

### M29A - Typed promotion readiness and blocker models
Add the new typed promotion/readiness/blocker/recommendation structures and wire them into existing governance/runtime chains.

### M29B - Cross-wave analytics
Compute wave comparison and health buckets from durable records.
Add query/filter support where useful.

### M29C - Window-aware governance operations
Add typed operations for promote, hold, defer, pause, resume, and expire with durable trail output.

### M29D - Visibility, tests, and docs
Expose readable summaries in governance/operator surfaces.
Add tests and update docs/status mapping.

## Required tests
Add or update tests for at least:
- contract serialization / backward-compatible decode of M29 typed models
- promotion readiness computed from durable blocker and window evidence
- cross-wave analytics bucket generation
- window-aware defer / pause / expire behavior
- promotion operation durability and replay continuity
- readable governance summary lines for readiness, blocker, and window state
- restore/process-death continuity for M29 records and summaries

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
M29 is done when:
1. rollout-promotion readiness is represented through typed runtime models
2. cross-wave analytics and health summaries exist and are derived from durable evidence
3. window-aware governance operations are durable, readable, and replay-safe
4. governance surfaces can show readiness, blockers, window impacts, and next eligible promotion states
5. restore/replay continuity preserves M29 records and summaries
6. tests and docs/status are updated and passing

## Exact deferred items
- no BPM/DSL
- no orchestrator rewrite
- no broad operator console redesign
- no broad storage/history rewrite
- no destructive automation

## Next likely milestone after M29
- `M30 - Enterprise Rollout Program Coordination, Multi-Program Prioritization, and Escalation Operations`

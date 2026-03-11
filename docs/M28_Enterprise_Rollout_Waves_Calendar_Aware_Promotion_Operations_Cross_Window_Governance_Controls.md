# M28 - Enterprise Rollout Waves, Calendar-Aware Promotion Operations, and Cross-Window Governance Controls

## What this milestone is

M28 extends the enterprise policy governance stack from:
- policy packs and overrides
- rollout safety and approval governance
- promotion analytics and approval operations
- governance programs and lifecycle operations
- estate analytics and remediation
- scheduled automation
- scheduling windows, blackout periods, maintenance windows, and rollout calendars

into a **wave-based, calendar-aware promotion control plane**.

This milestone is about making rollout operations work safely across:
- staged rollout waves
- calendar windows
- window conflicts
- deferred promotions
- carry-forward behavior
- partial completion across windows
- cross-window governance visibility

The result should be a system that can explain not only *what policy should be promoted*, but also:
- in which wave
- in which window
- why it is deferred, blocked, or carried forward
- what remains pending for the next window
- whether a wave is partially complete, paused, expired, or waiting for the next eligible slot

---

## Why M28 now

The system already has:
- workflow policies, SLA timers, escalation policies, and automation guardrails
- policy packs with tenant/workspace overrides
- rollout safety, simulation, freeze, pause, and rollback semantics
- policy promotion, approval operations, and rollout analytics
- governance programs, lifecycle operations, exemptions, pinning, replacement plans, and cross-tenant governance
- estate analytics, drift remediation, and lifecycle health summaries
- scheduled safe automation with durable audit trails
- scheduling windows, blackout windows, maintenance windows, and time-aware automation governance

The next gap is **wave-aware execution across windows**.

Without M28, the system can know whether a rollout is allowed in a given time window, but it still lacks a first-class model for:
- promoting in ordered waves
- carrying partially completed waves into the next window
- handling window expiration vs. deliberate deferral
- distinguishing wave-blocked vs. window-blocked vs. approval-blocked states
- operating cross-window promotion programs safely and readably

M28 closes that gap.

---

## Goal

Build a durable, typed, calendar-aware rollout wave control layer that governs how enterprise policy promotions progress across windows and over time.

This milestone should make it possible to:
- define rollout waves
- evaluate each wave against calendar constraints
- defer or carry forward work safely
- track partial wave completion
- preserve durable auditability for every decision
- surface readable wave/window status in governance, receipts, and operator timelines

---

## In scope

### 1. Typed rollout wave models

Add or strengthen typed concepts such as:
- `RolloutWave`
- `RolloutWaveTargetSet`
- `RolloutWaveStatus`
- `RolloutWaveProgress`
- `RolloutWaveSummary`
- `RolloutWaveDecision`
- `RolloutWaveBlockReason`
- `RolloutWaveCarryForwardState`
- `RolloutWaveCompletionRecord`

The exact names may vary, but the semantics must be explicit and durable.

### 2. Calendar-aware promotion operation models

Add or strengthen typed concepts such as:
- `CalendarAwarePromotionRequest`
- `CalendarAwarePromotionDecision`
- `PromotionWindowEligibility`
- `PromotionWindowConflictSummary`
- `DeferredPromotionRecord`
- `PromotionCarryForwardRecord`
- `NextEligibleWindowSummary`
- `WindowExpiryStatus`
- `WaveWindowAssignment`

These should capture not just whether a rollout is allowed, but also *when* and *why*.

### 3. Cross-window governance control models

Add or strengthen typed concepts such as:
- `CrossWindowGovernanceControl`
- `CrossWindowPauseState`
- `CrossWindowHoldReason`
- `CrossWindowBlockerSummary`
- `CrossWindowCompletionState`
- `CrossWindowReadinessSummary`

These models should support safe governance of rollouts that span multiple windows or require carry-forward into future windows.

### 4. Runtime wave progression behavior

The runtime should support real wave-aware behavior, including:
- assigning rollout work to specific waves
- determining wave eligibility for the current window
- distinguishing wave-complete vs. partially-complete vs. deferred
- carrying incomplete waves into future eligible windows
- preserving partial progress without rewriting history
- generating durable audit records for wave decisions

### 5. Calendar-aware promotion operations

The runtime should support real, typed promotion behaviors such as:
- `PROMOTE_IN_CURRENT_WINDOW`
- `DEFER_TO_NEXT_WINDOW`
- `CARRY_FORWARD_PARTIAL_WAVE`
- `PAUSE_CROSS_WINDOW_ROLLOUT`
- `RESUME_NEXT_ELIGIBLE_WINDOW`
- `EXPIRE_PENDING_WINDOW_SLOT`
- `MARK_WINDOW_BLOCKED`

Do not reduce these to wording-only status labels.

### 6. Readable governance and receipt visibility

Governance, receipts, and operator timelines should be able to show, in readable English:
- current wave
- wave status
- current or last evaluated window
- why the wave is blocked, deferred, or carried forward
- next eligible window
- whether the promotion expired, paused, or is waiting for approval
- what remains to complete the program

### 7. Restore/replay continuity

Wave and window semantics must survive process death, replay, and restore continuity.
History must remain additive and backward-compatible.

---

## Out of scope

Do not do any of the following in M28:
- BPM / DSL
- destructive automation
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- full remote SaaS rollout platform
- generalized scheduling language beyond the typed models needed here

---

## Design principles

### 1. Waves are first-class
Rollout waves must be durable typed entities, not only an integer label on a promotion.

### 2. Window decisions are durable decisions
If a rollout is deferred, carried forward, expired, or blocked by a calendar/window rule, that must be represented durably and readably.

### 3. Partial progress must remain truthful
If part of a wave completed and part did not, the system must preserve that distinction and carry forward only what remains pending.

### 4. Calendar constraints must be explainable
Operators should be able to tell whether the blocker is:
- approval
- blackout window
- maintenance window mismatch
- wave ordering
- cross-window pause/hold
- schedule expiration

### 5. No historical rewriting
Future window decisions must never rewrite what already happened in a prior wave/window.

---

## Runtime behavior requirements

### A. Wave-aware ordering
The system must preserve wave order where configured.
A later wave should not advance if an earlier wave is still required and incomplete, unless a typed exception/control explicitly allows it.

### B. Window-aware eligibility
A wave should evaluate against current calendar rules and produce a typed eligibility or block result.

### C. Partial completion and carry-forward
If a wave partially completes within a window, the runtime should record:
- what completed
- what did not complete
- whether the remainder is carried forward
- what next eligible window or action applies

### D. Expiration and defer semantics
The system should distinguish:
- intentionally deferred
- blocked by current window
- expired waiting for window
- paused by governance control
- waiting for approval

### E. Safe cross-window pause/resume
Governance actions should allow safe pause/resume semantics across windows, with durable auditability.

---

## Suggested typed model details

### RolloutWave
Recommended fields include:
- `waveId`
- `waveIndex`
- `targetSummary`
- `status`
- `progressSummary`
- `blockReasonCodes`
- `carryForwardState`
- `windowAssignment`
- `nextEligibleWindow`
- `completionState`

### CalendarAwarePromotionDecision
Recommended fields include:
- `promotionId`
- `waveId`
- `windowEligibility`
- `decisionType`
- `deferReasonCodes`
- `carryForwardReasonCodes`
- `nextEligibleWindow`
- `expiryStatus`
- `approvalDependencySummary`
- `createdAt`

### CrossWindowGovernanceControl
Recommended fields include:
- `controlId`
- `programId`
- `scope`
- `pauseState`
- `holdReason`
- `effectiveWindowRange`
- `resumeConditionSummary`
- `createdAt`

---

## Suggested reason code families

Introduce or strengthen canonical structured reason families such as:
- `ROLE_ROLLOUT_WAVE_ASSIGNED`
- `ROLE_ROLLOUT_WAVE_BLOCKED`
- `ROLE_ROLLOUT_WAVE_PARTIAL_COMPLETION`
- `ROLE_ROLLOUT_WAVE_CARRIED_FORWARD`
- `ROLE_PROMOTION_WINDOW_BLOCKED`
- `ROLE_PROMOTION_WINDOW_DEFERRED`
- `ROLE_PROMOTION_WINDOW_EXPIRED`
- `ROLE_PROMOTION_NEXT_WINDOW_SELECTED`
- `ROLE_CROSS_WINDOW_PAUSED`
- `ROLE_CROSS_WINDOW_RESUMED`
- `ROLE_CROSS_WINDOW_WAITING_APPROVAL`
- `ROLE_CROSS_WINDOW_MAINTENANCE_BLOCK`
- `ROLE_CROSS_WINDOW_BLACKOUT_BLOCK`

Exact names may vary, but they must be structured and queryable.

---

## Governance / operator surface expectations

The governance surfaces should expose, at minimum:
- wave id / name / index
- wave status
- window eligibility / current window / next eligible window
- deferred / blocked / expired / carry-forward state
- cross-window control state
- approval dependency if relevant
- readable English explanation for the active blocker or next action

The operator timeline should show durable events such as:
- wave assigned
- wave started
- wave partially completed
- wave carried forward
- promotion deferred to next window
- window expired
- cross-window pause applied
- cross-window resume applied

---

## Query / filtering expectations

The system should support governance filtering for at least:
- `waveStatus`
- `windowEligibility`
- `deferredOnly`
- `carryForwardOnly`
- `expiredOnly`
- `blockedByWindowOnly`
- `crossWindowPausedOnly`
- `nextWindowPendingOnly`

Keep this additive and backward-compatible.

---

## Suggested milestone breakdown

### M28A - Typed wave and window contracts
Add or strengthen typed wave/window/cross-window models and reason codes.

### M28B - Runtime wave/window decision layer
Implement real runtime behavior for wave eligibility, defer, carry-forward, expiry, and pause/resume semantics.

### M28C - Governance and receipt visibility
Expose wave/window/cross-window signals in receipts, governance summaries, and operator timeline text.

### M28D - Persistence, filters, tests, and docs
Add or update persistence, restore continuity, filtering, formatter tests, and docs/status mapping.

---

## Required tests

Add or update coverage for at least:
1. wave ordering blocks later waves when required
2. blackout/maintenance windows block a promotion with durable typed reason
3. partial completion creates carry-forward state and preserves completed work
4. next eligible window is computed and visible
5. deferred vs. expired semantics remain distinct
6. cross-window pause/resume survives restore continuity
7. governance filters work for wave/window/carry-forward/deferred states
8. formatter output is readable and includes wave/window signals

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

M28 is done when:
1. rollout waves are durable typed entities with real runtime behavior
2. calendar-aware promotion decisions are durable and queryable
3. partial completion, carry-forward, defer, expiry, and cross-window pause/resume are real runtime states
4. governance/receipt/timeline surfaces can explain wave and window state in readable English
5. restore/replay continuity preserves wave and window semantics
6. filters and tests cover the new wave/window/cross-window behavior
7. docs/status are updated with exact M28 compliance mapping and deferred items

---

## Deliverables expected from Codex

At the end, report:
- changed files
- typed wave/window/cross-window additions
- runtime behavior added
- persistence/compatibility changes
- tests added or updated
- remaining deferred items
- blockers, if any

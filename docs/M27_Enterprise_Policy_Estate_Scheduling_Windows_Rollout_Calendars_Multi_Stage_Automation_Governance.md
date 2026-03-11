# M27 - Enterprise Policy Estate Scheduling Windows, Rollout Calendars, and Multi-Stage Automation Governance

## Why this milestone exists now

M20 through M26 established the core enterprise policy operations stack:
- workflow policy, SLA, escalation, and automation guardrails
- policy packs with tenant and workspace overrides
- rollout safety, simulation, approval governance, and promotion operations
- cross-tenant governance programs and pack lifecycle controls
- estate-level analytics, drift detection, remediation suggestions, and safe automation

The next missing layer is not another policy dimension. The next missing layer is **time**.

The system can already decide:
- what policy should apply
- who is exempt or pinned
- whether automation is allowed or blocked
- whether remediation can be safely executed

It still needs to decide:
- **when** a rollout or remediation is allowed to run
- which maintenance window or blackout window applies
- how multi-stage rollout waves advance across time
- whether scheduled automation should pause, defer, expire, or escalate
- how calendar-bound policy operations are represented durably and explained to operators

M27 adds that missing temporal governance layer.

## Goal

Introduce typed scheduling windows, rollout calendars, and multi-stage automation governance so enterprise policy operations can be scheduled, deferred, resumed, and audited with explicit temporal semantics.

This is not a generic workflow DSL or a broad console redesign.
It is a targeted milestone to make enterprise policy operations safe and controllable over time.

## Core product outcome

After M27, the system should be able to answer, for a given policy operation or automation run:
- which schedule or maintenance window applied
- whether the action ran immediately, was deferred, or was blocked by time policy
- which rollout wave or stage was active at that time
- whether blackout, cooldown, suppression, or approval timing prevented execution
- when the next eligible execution window is
- whether a staged rollout was promoted, paused, resumed, or expired according to calendar-aware governance rules

## In scope

### 1. Typed scheduling and calendar models
Add or strengthen typed concepts such as:
- `PolicySchedulingWindow`
- `SchedulingWindowType`
- `SchedulingWindowStatus`
- `RolloutCalendar`
- `RolloutCalendarEntry`
- `CalendarWindowBinding`
- `MaintenanceWindow`
- `BlackoutWindow`
- `ExecutionWindowDecision`
- `ExecutionWindowBlockReason`
- `ScheduledGovernanceOperation`
- `ScheduledOperationStatus`
- `ScheduledOperationRun`
- `RolloutWaveSchedule`
- `RolloutWaveProgress`
- `AutomationScheduleSummary`
- `CalendarEvaluationResult`

The exact names may vary, but the semantics must be typed and durable.

### 2. Typed temporal governance behavior
Introduce runtime behavior for:
- scheduled execution eligibility
- maintenance window allow/deny semantics
- blackout window block semantics
- scheduled rollout wave advance
- deferred or expired automation runs
- next eligible window calculation
- time-aware escalation or requeue behavior

### 3. Multi-stage rollout governance
Add or strengthen support for rollout stages or waves that are governed by calendar and schedule semantics, including:
- stage start and end windows
- stage hold/pause semantics
- stage expiry or stale-stage detection
- next stage readiness based on both approval state and calendar state
- durable recording of stage progression and schedule-driven blocking

### 4. Operator and governance visibility
Surface readable schedule-aware summaries in existing operator/governance surfaces, such as:
- active window
- blocked by blackout
- waiting for maintenance window
- rollout stage scheduled for later
- next eligible execution time
- schedule expired
- stage promotion deferred

### 5. Durable receipts and ledger traceability
Ensure schedule and calendar semantics are visible in:
- execution receipts
- governance case summaries
- role trace / reason-code paths where relevant
- operator timelines
- ledger and restore/replay continuity

### 6. Filters and queries
Add or strengthen filterability by schedule-aware fields where appropriate, for example:
- window type
- window status
- scheduled operation status
- blocked-by-calendar only
- rollout wave id
- stage pending only
- expired-schedule only

## Out of scope

Do not do the following in M27:
- do not build a BPM or workflow DSL
- do not introduce destructive automation
- do not rewrite the orchestrator
- do not do a broad operator console redesign
- do not do a broad storage/history rewrite
- do not build a full external calendar platform integration matrix
- do not turn this into a general-purpose cron or job scheduler platform

## Design principles

1. **Time is a policy input, not an afterthought**
   Schedule and calendar state must be treated as first-class governance semantics.

2. **Temporal blocking must be explainable**
   Operators should know why something did not run yet, not only that it did not run.

3. **Schedules must not silently override explicit approvals or explicit task constraints**
   Existing precedence and trust semantics remain intact.

4. **Durability over convenience**
   Scheduled and deferred operations must survive process death and restore.

5. **Calendar-driven actions remain safe and non-destructive**
   Maintain the current safe-only automation posture.

## Required runtime semantics

### A. Scheduling windows
The system should distinguish, at minimum, among:
- allowed window
- blocked by blackout
- waiting for maintenance window
- cooldown active
- schedule expired
- schedule paused
- schedule suppressed

### B. Rollout calendars
The system should support explicit rollout timing semantics, including:
- wave scheduled start
- wave active
- wave paused
- wave completed
- wave expired
- wave blocked pending approval
- next wave not yet eligible

### C. Multi-stage automation governance
When multi-stage rollout or remediation automation is enabled, the system should be able to decide:
- whether current stage is allowed to run now
- whether next stage may be promoted now
- whether escalation should occur now or later
- whether automation is blocked by schedule even if otherwise eligible

### D. Explanation and reason codes
The result of schedule-aware decisions must be reflected in readable summaries and canonical reason-code families, for example:
- `ROLE_SCHEDULE_WINDOW_ACTIVE`
- `ROLE_SCHEDULE_BLOCKED_BY_BLACKOUT`
- `ROLE_SCHEDULE_WAITING_FOR_MAINTENANCE_WINDOW`
- `ROLE_SCHEDULE_COOLDOWN_ACTIVE`
- `ROLE_SCHEDULE_EXPIRED`
- `ROLE_ROLLOUT_STAGE_DEFERRED_BY_CALENDAR`
- `ROLE_ROLLOUT_STAGE_ADVANCED_IN_WINDOW`
- `ROLE_AUTOMATION_SUPPRESSED_BY_SCHEDULE`

Exact names may vary, but durable structured output is required.

## Suggested milestone breakdown

### M27A - Typed scheduling and calendar contracts
- add or strengthen typed window, schedule, and rollout-calendar contracts
- keep all changes additive and backward-compatible

**Done when**
- typed scheduling and calendar semantics exist in contracts/runtime structures
- old payloads remain decodable

### M27B - Runtime schedule evaluation and stage timing
- implement schedule evaluation for automation, remediation, and rollout stage progression
- support defer/pause/block/expire semantics

**Done when**
- the runtime can make real schedule-aware decisions
- schedule decisions affect execution truth and not only UI copy

### M27C - Governance / receipt / timeline visibility
- surface schedule and calendar decisions in readable English
- add filters and summary visibility where useful

**Done when**
- operators can see why an action is running, deferred, or blocked by time policy

### M27D - Tests, continuity, and docs
- add or update tests
- validate restore/process-death continuity
- update docs/spec/plan/status

**Done when**
- schedule-aware behavior is durable, tested, and documented

## Suggested typed model areas

### Scheduling windows
Recommended semantic coverage includes:
- window id
- window type
- start/end time
- timezone or schedule reference if applicable
- status
- block reason
- next eligible time

### Rollout calendars
Recommended semantic coverage includes:
- calendar id
- wave id
- stage id
- stage schedule state
- pause/resume state
- expiry state
- approval dependency state

### Scheduled operation state
Recommended semantic coverage includes:
- operation id
- operation type
- target pack / tenant / workspace / stage
- current status
- scheduledAt
- deferredUntil
- expiredAt
- lastEvaluationAt
- lastDecisionReasonCodes

## Persistence and compatibility requirements

- Keep all additions additive and backward-compatible.
- Old receipts and governance records must still render.
- Schedule-aware state must survive process death and restore where the rest of the governance chain already does.
- Do not reinterpret old history retroactively.

## Required tests

Add or update tests for at least the following:

1. Contract compatibility and round-trip for M27 scheduling/calendar types
2. Runtime schedule evaluation for allowed window vs blackout block
3. Runtime defer behavior when next eligible maintenance window is in the future
4. Multi-stage rollout advancement blocked by schedule
5. Multi-stage rollout advancement allowed inside eligible window
6. Schedule expiry semantics
7. Restore/process-death continuity for scheduled operations and calendar-aware stage state
8. Readable formatter output for scheduling and rollout calendar visibility
9. Filter/query behavior for schedule-aware fields if added

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

M27 is done when:
1. Scheduling windows and rollout calendar semantics are typed and durable.
2. Runtime decisions can be blocked, deferred, paused, or advanced by real schedule and calendar logic.
3. Governance and receipt surfaces can explain schedule-aware execution in readable English.
4. Multi-stage rollout timing is durable and auditable.
5. Restore/process-death continuity is preserved.
6. Tests for schedule, calendar, stage timing, and readability are implemented and passing.
7. Docs/status files are updated with exact M27 scope and deferred items.

## Required final report

At the end of the run, report:
- changed files
- scheduling/calendar typed additions
- runtime schedule evaluation changes
- receipt/governance visibility changes
- tests added or updated
- remaining deferred items
- blockers, if any

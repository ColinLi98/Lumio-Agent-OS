# M26 - Enterprise Policy Estate Automation, Scheduled Remediation, and Governance Program Operations

## Why M26 now

By the end of M25, the system already supports:
- workflow policy packs, tenant/workspace overrides, and precedence-aware runtime behavior
- rollout safety, simulation, approval governance, and promotion operations
- cross-tenant governance programs, lifecycle state, pinning, exemptions, and replacement plans
- estate-level analytics, drift detection, blocker analysis, remediation suggestions, and lifecycle governance visibility

The next missing layer is **durable governance automation**.

The platform can already detect:
- rollout drift
- exemption drift
- pinning drift
- override divergence
- replacement-plan mismatch
- retirement blockers
- readiness issues and lifecycle blockers

But it still treats most remediation as manual or suggestion-driven.

M26 should move the estate from:
- detect
- explain
- suggest

to:
- schedule
- safely automate
- audit
- pause/resume
- replay and review

without introducing a full BPM/DSL or destructive automation.

---

## Goal

Introduce safe, typed, durable estate-automation flows for:
- scheduled remediation
- governance program operations
- auto-apply of bounded remediation classes
- approval-aware automation handoff
- automation suppression / cooldown / maintenance-window behavior
- durable automation audit and replay

This milestone should make enterprise policy operations more scalable while preserving existing trust, precedence, and local-first semantics.

---

## Core outcome

After M26, the system should be able to:
- identify eligible remediation targets
- schedule bounded remediation operations
- auto-apply safe remediations when policy allows
- defer unsafe remediations into approval-governed operator queues
- record the full automation chain durably in receipts / governance summaries / estate history
- pause, resume, suppress, or cancel scheduled automation without rewriting historical truth

---

## In scope

### 1. Typed estate automation models
Add or strengthen typed concepts such as:
- `EstateAutomationRule`
- `EstateAutomationEligibility`
- `EstateAutomationSuppressionState`
- `EstateAutomationCooldownState`
- `EstateAutomationWindow`
- `ScheduledRemediationPlan`
- `ScheduledRemediationTarget`
- `ScheduledRemediationExecution`
- `ScheduledRemediationResult`
- `GovernanceProgramOperation`
- `GovernanceProgramOperationStatus`
- `AutomationApprovalRequirement`
- `AutomationApprovalDecision`
- `AutomationReplaySummary`
- `AutomationCancellationRecord`

Exact names may vary, but the semantics must be explicit and typed.

### 2. Scheduled remediation planning
Add durable planning semantics for remediation operations such as:
- remove obsolete exemptions
- remove outdated pinning
- advance eligible rollout waves
- apply safe replacement-plan moves
- schedule retirement transitions when blockers are cleared
- schedule simulation-only rollout checks
- schedule metadata-only or visibility-only governance reconciliations

Scheduled remediation must support:
- target scoping
- eligibility checks
- suppression rules
- cooldown rules
- maintenance windows
- human approval requirements when needed

### 3. Governance program operations
Strengthen the runtime model for governance program actions such as:
- wave scheduling
- wave pause / resume
- staged advancement
- replacement-plan progression
- retirement workflow progression
- bulk-safe rollout governance actions

These should remain bounded and additive.
Do not turn M26 into a general workflow engine.

### 4. Automation guardrails in runtime
Automation must remain safe and policy-aware.
At minimum, enforce:
- explicit task / tenant / workspace constraints still outrank automation defaults
- suppression and cooldown windows block repeated or unsafe execution
- maintenance windows restrict execution timing
- approval-required automation cannot silently auto-apply
- safe-only automation actions may proceed automatically when explicitly eligible

### 5. Durable audit trail and explainability
All scheduled and automated governance operations must be visible in:
- governance case summary
- receipt summary where relevant
- estate analytics / lifecycle summaries
- operator timeline / automation timeline

At minimum, record:
- who or what scheduled the action
- whether it was simulated, scheduled, executed, skipped, suppressed, blocked, paused, resumed, or cancelled
- why the action was eligible or ineligible
- which guardrail blocked or allowed it
- whether human approval was required or not

### 6. Query / filter / visibility enhancements
Extend governance querying and UI-readable summaries so operators can find:
- automation-eligible cases
- automation-blocked cases
- scheduled-but-pending remediation
- paused or suppressed automation
- cooldown-blocked automation
- approval-required automation backlog
- recently executed automation operations

Where relevant, support filters such as:
- `automationEligibleOnly`
- `automationBlockedOnly`
- `scheduledOnly`
- `approvalRequiredOnly`
- `cooldownOnly`
- `suppressedOnly`
- `maintenanceWindowOnly`

### 7. Restore / replay continuity
Automation and scheduled remediation state must survive:
- process death
- restore
- replay
- old/new mixed record reading

Past automation history must not be reinterpreted after later policy changes.

---

## Out of scope

Do **not** do the following in M26:
- do not introduce a general BPM / workflow DSL
- do not add destructive automation
- do not rewrite the orchestrator
- do not redesign the full operator console
- do not rewrite storage/history architecture broadly
- do not introduce unsafe autonomous cross-tenant mutation
- do not replace current truth models with automation state

---

## Product and governance direction

M26 should make the system capable of **bounded enterprise operations automation**.

It should remain clear that:
- truth still lives in durable receipts / governance history / estate records
- automation is an execution and governance layer on top of that truth
- safe automation is allowed only where typed eligibility and guardrails permit it
- risky transitions still require explicit approval and durable reviewability

---

## Typed runtime behavior expectations

### Safe automation
Examples of actions that may be eligible for safe automation if policy allows:
- clear expired simulation-only markers
- remove obsolete exemptions after replacement readiness is confirmed
- progress lifecycle metadata after all blockers are cleared
- advance a rollout wave from staged/simulated to next internal checkpoint only when no approval requirement is present
- apply safe metadata/state reconciliation that does not create destructive effect

### Approval-governed automation
Examples that should require approval or remain blocked by default:
- forceful pack retirement
- high-impact cross-tenant rollout transitions
- broad override removals with unresolved blockers
- any action that changes a critical policy state across large scope without explicit governance approval

### Suppression and cooldown
Automation must support:
- suppression due to policy or operator override
- cooldown to prevent repeated execution churn
- maintenance windows to constrain when automation runs
- durable explanation for why an action did not run

---

## Suggested milestone breakdown

### M26A - Typed automation and scheduling contracts
- add typed scheduled remediation and automation state models
- add durable status / suppression / cooldown / window semantics
- keep everything additive and backward-compatible

**Done when**
- automation and remediation state are typed and serializable
- old records remain readable
- contract coverage exists in tests

### M26B - Runtime automation eligibility and scheduling
- compute eligibility from M25 estate analytics / blockers / lifecycle signals
- schedule safe remediation plans
- enforce suppression / cooldown / maintenance-window rules
- preserve approval requirements for risky operations

**Done when**
- runtime can mark actions as eligible / blocked / suppressed / cooldown / approval-required using typed semantics
- these states are durable and queryable

### M26C - Governance program operation execution
- add bounded execution for safe scheduled remediation and governance program operations
- emit durable automation audit records and timeline events
- allow pause / resume / cancel / replay-friendly status transitions

**Done when**
- safe operations can actually execute through real runtime logic
- execution history is durable and visible

### M26D - Visibility, filtering, tests, docs
- extend governance / receipt / timeline / analytics formatting
- add query filters for automation states
- add contract, persistence, runtime, and formatter tests
- update docs/spec/plan/status and memory/open-loops artifacts

**Done when**
- operators can see what automation is eligible, blocked, scheduled, executed, or paused
- tests and docs are complete

---

## Required tests

Add or update tests covering at least:

### Domain / contract tests
- encode/decode round-trip for M26 automation/scheduling contract fields
- compatibility with old records where M26 fields are absent

### Orchestrator / runtime tests
- safe remediation is scheduled when eligibility conditions are met
- approval-required remediation is blocked from automatic execution
- suppression / cooldown / maintenance-window semantics prevent execution correctly
- automation actions generate durable audit trail and timeline events
- pause / resume / cancel operations preserve correct state
- explicit tenant/workspace constraints still override automation defaults

### Persistence tests
- scheduled remediation survives process death / restore
- automation audit trail survives restore / replay
- paused/suppressed/cooldown state continuity is preserved

### Formatter / UI tests
- governance summary includes M26 automation visibility lines
- receipt/export includes automation signals where relevant
- role / governance / summary formatters can render scheduled / blocked / suppressed / executed / approval-required states clearly

---

## Suggested canonical reason-code direction

Extend canonical structured reason-code families such as:
- `ROLE_ESTATE_AUTOMATION_ELIGIBLE`
- `ROLE_ESTATE_AUTOMATION_BLOCKED`
- `ROLE_ESTATE_AUTOMATION_SUPPRESSED`
- `ROLE_ESTATE_AUTOMATION_COOLDOWN`
- `ROLE_ESTATE_AUTOMATION_WINDOW_BLOCKED`
- `ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED`
- `ROLE_ESTATE_AUTOMATION_SCHEDULED`
- `ROLE_ESTATE_AUTOMATION_EXECUTED`
- `ROLE_ESTATE_AUTOMATION_PAUSED`
- `ROLE_ESTATE_AUTOMATION_RESUMED`
- `ROLE_ESTATE_AUTOMATION_CANCELLED`

Do not rely on copy-only state changes.

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

Add any new M26 formatter / runtime / persistence tests to the validation report.

---

## Definition of done

M26 is done when:
1. typed automation and scheduled remediation semantics exist and are durable
2. safe remediation can be scheduled and executed through real runtime logic
3. approval-required automation is blocked from automatic execution and visible as such
4. suppression / cooldown / maintenance-window guardrails are real runtime behavior
5. automation states are queryable and visible in governance / receipt / timeline surfaces
6. restore / replay continuity preserves automation state and audit trails
7. tests and docs are updated and passing

---

## Required final report

At the end of the run, report:
- changed files
- typed automation / scheduling additions or strengthened usage
- runtime behavior changes
- persistence / continuity changes
- tests added or updated
- exact deferred items
- blockers, if any

---

## Next likely milestone after M26

After M26, the most natural next step is:
- **M27 - Enterprise Policy Estate Scheduling Windows, Rollout Calendars, and Multi-Stage Automation Governance**

That milestone should build on M26's safe automation substrate rather than introducing a general workflow DSL.

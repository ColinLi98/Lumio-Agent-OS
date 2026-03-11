# M20 - Enterprise Workflow Policies, SLA Timers, and Automation Guardrails

## Why M20 is next

M19 established the collaboration and workflow layer on top of the operator console:
- typed workflow templates and workflow runs
- typed collaboration artifacts such as notes, handoffs, escalations, and events
- safe remote-ops automation rules and durable automation audit records
- workflow stage, next-action, and automation visibility in governance summaries and timelines
- restore and replay continuity for workflow, collaboration, and automation artifacts

The next gap is not collaboration structure. The next gap is operational discipline.

At this point, the system can:
- represent workflow stages
- attach workflow templates to cases
- append collaboration artifacts durably
- run safe automation rules

But it still needs stronger enterprise controls for:
- policy-bound workflow execution
- explicit SLA timing and breach semantics
- escalation timing and queue aging
- automation eligibility and suppression rules
- operator-visible and auditable automation guardrails

M20 turns workflow and automation from durable capabilities into policy-governed enterprise operations.

## Goal

Introduce typed workflow policy, SLA timing, escalation timing, and automation guardrail semantics so that operator workflows can be measured, constrained, and safely automated without rewriting the existing truth model.

## Core product outcome

After M20, an operator or reviewer should be able to answer, for any workflow-driven case:
- what SLA applies
- whether the case is on time, at risk, or breached
- which stage timer is active
- whether escalation is required or pending
- whether automation is allowed, suppressed, throttled, or blocked
- why an automation step did or did not run
- whether policy, queue state, role, provider, or credential state blocked it

## In scope

### 1. Typed workflow policy concepts
Add or strengthen typed policy concepts such as:
- `WorkflowPolicyProfile`
- `WorkflowStagePolicy`
- `WorkflowTransitionPolicy`
- `WorkflowEscalationPolicy`
- `WorkflowAutomationGuardrail`
- `WorkflowEligibilityDecision`
- `WorkflowSuppressionReason`
- `WorkflowThrottlePolicy`

The exact names may vary, but the concepts must be explicit and typed.

### 2. Typed SLA and timer concepts
Add typed timing concepts such as:
- `SlaPolicy`
- `SlaClock`
- `SlaTarget`
- `SlaStatus`
- `SlaCheckpoint`
- `SlaBreachRecord`
- `StageTimerStatus`
- `EscalationTimerStatus`

At minimum, the system should be able to represent:
- no SLA
- active/on time
- approaching breach
- breached
- paused/suppressed where policy allows

### 3. Typed automation guardrails
Automation must stop being just "safe by convention" and become explicitly policy-governed.

Add or strengthen concepts such as:
- `AutomationEligibilityDecision`
- `AutomationGuardrailDecision`
- `AutomationSuppressionRecord`
- `AutomationThrottleState`
- `AutomationCooldownState`
- `AutomationTriggerSummary`

These should explain why an automation action:
- ran
- was skipped
- was suppressed
- was throttled
- was blocked

### 4. Runtime workflow policy evaluation
At runtime, workflow actions and automation should evaluate policy before proceeding.

This should include, where applicable:
- queue type
- case priority
- role-aware context
- provider or settlement state
- dispute or sync-pending state
- credential or route health state
- assignee or operator state
- workflow stage
- SLA pressure or breach state

### 5. Governance and console visibility
Operator surfaces should expose workflow policy and timing state in readable English.

At minimum, internal surfaces should be able to show:
- workflow template
- current stage
- SLA status
- stage timer state
- escalation timer state
- automation allowed / blocked / suppressed
- automation reason summary
- next required human action if automation is blocked

### 6. Durable trail and auditability
Every material automation decision and every SLA/escalation transition should produce durable typed records or summaries linked to the existing ledger/receipt/governance chain.

Do not create a parallel truth model.

### 7. Query and filter support
Add or strengthen filter/query support for:
- `slaStatus`
- `stageTimerStatus`
- `automationEligibility`
- `automationBlockedOnly`
- `slaBreachOnly`
- `escalationPendingOnly`
- `workflowTemplateId`
- `workflowStageId`

## Out of scope

Do not do the following in M20:
- do not create a general-purpose BPM or workflow DSL
- do not add destructive automation actions
- do not rewrite the orchestrator
- do not redesign the full operator console
- do not rewrite storage/history architecture from scratch
- do not change Role Contract precedence
- do not create arbitrary user-editable workflow policy language in this pass

## Design principles

1. Workflow state is overlay guidance, not the source of truth for execution outcome.
2. SLA and escalation semantics must be typed, not ad-hoc text.
3. Automation must remain safe, explainable, and suppressible.
4. Human override remains authoritative where required.
5. Past workflow and automation history must not be rewritten by later policy edits.
6. Existing durable receipt/ledger/governance records remain the canonical substrate.

## Required typed model areas

### Workflow policy
Suggested concepts:
- `WorkflowPolicyProfile`
- `WorkflowStagePolicy`
- `WorkflowTransitionConstraint`
- `EscalationPolicySummary`

### SLA / timing
Suggested concepts:
- `SlaStatus`
- `SlaTarget`
- `SlaWindow`
- `SlaBreachRecord`
- `StageTimerSummary`
- `EscalationTimerSummary`

### Automation guardrails
Suggested concepts:
- `AutomationEligibilityDecision`
- `AutomationGuardrailDecision`
- `AutomationSuppressionReason`
- `AutomationCooldownSummary`
- `AutomationAuditRecord`

### Console / case summary extensions
Suggested additive fields on case/receipt/governance summary objects:
- `workflowPolicySummary`
- `slaSummary`
- `stageTimerSummary`
- `escalationSummary`
- `automationGuardrailSummary`
- `automationSuppressionSummary`
- `nextRequiredHumanAction`

## Canonical reason-code direction

Add structured reason-code families where needed, for example:
- `ROLE_WORKFLOW_POLICY_APPLIED`
- `ROLE_SLA_ACTIVE`
- `ROLE_SLA_APPROACHING_BREACH`
- `ROLE_SLA_BREACHED`
- `ROLE_ESCALATION_REQUIRED`
- `ROLE_ESCALATION_TRIGGERED`
- `ROLE_AUTOMATION_ALLOWED`
- `ROLE_AUTOMATION_BLOCKED`
- `ROLE_AUTOMATION_SUPPRESSED`
- `ROLE_AUTOMATION_THROTTLED`
- `ROLE_AUTOMATION_COOLDOWN_ACTIVE`

Do not rely only on formatter strings.

## Runtime behavior requirements

### Workflow policy evaluation
When a workflow action or transition is requested, the system should evaluate:
- workflow stage policy
- SLA state
- escalation state
- automation eligibility
- role/provider/credential dependent constraints where relevant

### SLA and escalation timing
The system should be able to:
- start or update an SLA clock
- compute current SLA status
- mark breach or approaching breach
- mark escalation pending or required
- write those transitions into durable history/governance state

### Automation guardrails
A safe automation action should run only if policy allows.

The system should be able to explain, durably:
- why an automation action was allowed
- why it was blocked
- why it was suppressed
- why it was throttled or cooled down
- what human action is required next

### Local-first compatibility
If timing or automation context cannot be refreshed from a remote dependency, the system should degrade safely and visibly rather than silently pretending the automation succeeded.

## Operator-facing visibility expectations

The operator console should surface, in readable English:
- `SLA: on time / at risk / breached`
- `Stage timer: active / overdue`
- `Escalation: pending / required / triggered`
- `Automation: allowed / blocked / suppressed / throttled`
- `Next action: review manually / wait for sync / escalate / retry later`

The intent is not a full visual redesign.
The intent is to make workflow and automation policy legible and operable.

## Suggested milestone breakdown

### M20A - Typed workflow policy and timer contracts
- add typed workflow policy, SLA, stage timer, and escalation timer models
- extend additive summary/case/receipt objects

### M20B - Runtime policy evaluation
- evaluate workflow transitions and automation against policy
- compute SLA and escalation states
- produce durable summaries/reason codes

### M20C - Console and timeline visibility
- surface SLA / escalation / automation summaries in governance UI
- ensure timeline and summary views expose readable workflow policy outcomes

### M20D - Tests, docs, and coverage matrix
- add or update tests
- update spec/plan/status and open loops / decision log
- add scenario coverage matrix for workflow policy and SLA/automation guardrails

## Required scenarios

Add or update at least these scenarios:

1. A case with an active workflow template enters an SLA window and remains on time.
2. A case approaches breach and becomes escalation pending.
3. A case breaches SLA and escalation state becomes visible in governance summaries.
4. A safe automation rule is allowed and writes a durable automation audit trail.
5. A safe automation rule is blocked by guardrail policy and emits a durable suppression reason.
6. A safe automation rule is throttled or cooled down and the operator sees the reason.
7. Role/provider/credential state causes workflow automation suppression and the next required human action is visible.
8. Restore/process death continuity preserves workflow policy, timer, escalation, and automation guardrail state.

## Tests expected

Add or update tests for:
- typed workflow policy / SLA / automation contract serialization compatibility
- runtime policy evaluation behavior
- SLA status transitions
- escalation state transitions
- automation allow/block/suppress/throttle decisions
- durable workflow/automation audit trail continuity
- formatter and governance summary visibility for workflow policy and SLA state
- restore/process death continuity

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

M20 is done when:
1. Typed workflow policy, SLA timer, escalation timer, and automation guardrail concepts exist.
2. Runtime workflow actions and safe automation evaluate those policies and produce durable outcomes.
3. Governance/case/receipt summaries expose readable workflow policy, SLA, escalation, and automation states.
4. Safe automation remains bounded and explainable.
5. Process death / restore continuity is preserved.
6. Tests cover contract compatibility, runtime behavior, visibility, and continuity.
7. Docs/status are updated with exact scope and deferred items.

## Deferred after M20

Still out of scope after this pass:
- full BPM/workflow DSL
- destructive automation
- broad operator console redesign
- orchestrator rewrite
- broad history/storage rewrite

## Next likely milestone after M20

- **M21 - Enterprise Workflow Policy Packs, Tenant Overrides, and Advanced Automation Controls**

# M19 - Enterprise Operator Collaboration, Workflow Templates, and Remote Ops Automation

## Why M19 is next

M0 through M18 established the core execution and governance substrate:
- role-aware runtime execution
- proof ledger and receiptization
- governance analytics
- settlement, dispute, and reconciliation durability
- remote-ready telemetry, alert, and reconciliation service boundaries
- operator auth, assignment, and connector routing foundations
- enterprise identity, directory sync, and credential lifecycle semantics
- SaaS-grade operator console surfaces with queue, detail, timeline, and safe bulk actions

The next missing layer is collaborative operations.

The system can now represent cases, assignments, alerts, routes, providers, credentials, disputes, and operator actions. What it still lacks is a more structured way to:
- define repeatable operator workflows
- coordinate handoffs across operators or teams
- attach standard response templates to recurring case patterns
- drive safe remote ops automation from typed rules and templates
- measure progress against operator workflow states rather than only raw case states

M19 fills that gap.

## Goal

Add typed operator collaboration workflows, reusable workflow templates, and safe remote ops automation on top of the existing durable governance, operator, and connector foundations.

This is not a full BPM engine or enterprise workflow suite.
It is a bounded, additive operational collaboration layer.

## Product outcome

After M19, operators should be able to:
- apply a known workflow template to a case or case family
- hand off a case in a structured, durable way
- see case stage, SLA-ish timing, and next action guidance
- use typed notes, handoff records, and escalation reasons
- trigger safe remote ops automation from templates or case rules
- distinguish between manual operator actions and automation-driven actions in the ledger and console

## In scope

### 1. Typed workflow template concepts
Add or strengthen typed concepts such as:
- `OperatorWorkflowTemplate`
- `OperatorWorkflowStage`
- `OperatorWorkflowStep`
- `OperatorWorkflowActionTemplate`
- `OperatorWorkflowTrigger`
- `OperatorWorkflowApplicability`
- `OperatorWorkflowResolutionHint`
- `OperatorWorkflowRun`
- `OperatorWorkflowRunStatus`
- `OperatorWorkflowStepStatus`

Exact names may vary, but the concepts must be explicit and typed.

### 2. Typed collaboration concepts
Add or strengthen typed collaboration concepts such as:
- `GovernanceCaseNote`
- `GovernanceCaseHandoff`
- `GovernanceCaseEscalation`
- `GovernanceAssignmentChange`
- `GovernanceCollaborationEvent`
- `GovernanceCollaborationActor`
- `GovernanceCollaborationActionSource`

These should make it clear whether an action came from:
- a human operator
- a local automation
- a remote integration
- a system-generated workflow transition

### 3. Workflow stage and timeline integration
Cases should be able to carry workflow stage context in addition to raw case state.
Examples:
- triage
- waiting for provider
- waiting for remote sync
- under review
- awaiting retry
- awaiting escalation
- resolved

These are operator workflow states, not replacements for the underlying durable truth.
They should layer on top of the ledger and case records rather than replace them.

### 4. Reusable workflow templates
Support a small set of reusable workflow templates for recurring operator scenarios, for example:
- sync pending follow-up
- provider issue triage
- reconciliation mismatch review
- rollback failure handling
- dispute review and escalation
- credential / vault health incident follow-up

Templates should be typed and bounded.
Do not build a free-form workflow DSL in this pass.

### 5. Safe remote ops automation
Allow limited safe automations tied to workflow templates or typed case conditions, for example:
- schedule a retry sync intent
- enqueue an alert routing retry
- add a standard note / status update
- suggest reassignment or escalation
- mark a step ready for human review

Do not allow destructive or high-risk automated actions without explicit human gating.

### 6. Governance console integration
The operator console should surface:
- workflow template name (if attached)
- current workflow stage
- next recommended action
- handoff / note / escalation history
- whether the latest step was human-driven or automation-driven

### 7. Durable history and audit
All collaboration and automation events must be durable and auditable.
They should link cleanly into the existing proof ledger / governance case timeline.

## Out of scope

Do not do the following in M19:
- build a general-purpose workflow DSL
- build arbitrary user-authored automation scripts
- rewrite the orchestrator
- redesign the whole console UI from scratch
- add destructive bulk automation
- implement a full enterprise BPM platform
- build deep cross-tenant collaboration semantics
- replace the existing truth model with workflow-only state

## Design principles

1. Workflow is a coordination layer, not the source of truth.
2. Templates must be bounded, typed, and reusable.
3. Automation must be safe, explainable, and auditable.
4. Human operator authority must remain explicit.
5. Existing case, receipt, and ledger semantics must remain authoritative.
6. Local-first compatibility must remain intact if remote automation services are absent.

## Required typed models

At minimum, add or strengthen typed concepts similar to the following.

### Workflow templates and runs
- `OperatorWorkflowTemplate`
- `OperatorWorkflowTemplateId`
- `OperatorWorkflowStage`
- `OperatorWorkflowStep`
- `OperatorWorkflowRun`
- `OperatorWorkflowRunStatus`
- `WorkflowNextActionSuggestion`

### Collaboration artifacts
- `GovernanceCaseNote`
- `GovernanceCaseNoteType`
- `GovernanceCaseHandoff`
- `GovernanceCaseEscalation`
- `GovernanceCollaborationEvent`
- `GovernanceCollaborationActor`
- `GovernanceCollaborationSource`

### Automation artifacts
- `RemoteOpsAutomationRule`
- `RemoteOpsAutomationTrigger`
- `RemoteOpsAutomationDecision`
- `RemoteOpsAutomationResult`
- `RemoteOpsAutomationAuditRecord`

The exact implementation may differ, but these semantics must be represented.

## Collaboration behavior requirements

### Notes
Operators should be able to add structured notes to a case.
Notes should be durable, timestamped, and attributable.

### Handoffs
Operators should be able to hand off a case to another operator or team in a typed way.
Handoffs should record:
- previous assignee
- new assignee or team
- handoff reason
- workflow stage context
- actor and timestamp

### Escalations
Escalation should be explicit and durable.
At minimum, support:
- escalation requested
- escalation accepted or assigned
- escalation resolved or cleared

### Assignment changes
Assignment changes must remain auditable and must integrate with case detail, timeline, and workflow state.

## Workflow template requirements

Templates should support:
- applicability rules by case type / queue / provider issue family / reason-code family
- default stages
- recommended safe actions
- recommended note / summary patterns
- reminder or timeout hints where supported

Templates should not directly mutate truth without generating normal durable actions and records.

## Safe automation requirements

Automation should be limited to actions that are:
- bounded
- idempotent or explicitly guarded
- low risk
- explainable
- auditable

Examples of allowed automation in this pass:
- propose a retry
- schedule a reminder
- append a standard note
- suggest reassignment or escalation
- prefill a case summary

Examples of not allowed automation in this pass:
- silently close disputes
- force settlement decisions
- override operator auth
- rewrite prior receipts or case history

## Canonical reason-code direction

Add structured families where needed, for example:
- `ROLE_WORKFLOW_TEMPLATE_ATTACHED`
- `ROLE_WORKFLOW_STAGE_CHANGED`
- `ROLE_CASE_NOTE_ADDED`
- `ROLE_CASE_HANDOFF_CREATED`
- `ROLE_CASE_ESCALATION_CREATED`
- `ROLE_AUTOMATION_RULE_TRIGGERED`
- `ROLE_AUTOMATION_ACTION_SUGGESTED`
- `ROLE_AUTOMATION_ACTION_EXECUTED`
- `ROLE_AUTOMATION_ACTION_SKIPPED`

These may coexist with existing operator, remote, and enterprise reason-code families.

## Console / UX requirements

Keep the console additive and internal-facing.
At minimum, operators should be able to see:
- workflow template attached to the case
- current workflow stage
- latest note / handoff / escalation
- next suggested action
- whether a step was human or automation sourced

This is not a broad UX redesign. Use the current console structure and extend it carefully.

## Persistence and compatibility

Persist and restore:
- workflow runs and stages
- notes
- handoffs
- escalations
- automation audit records
- template attachments

Compatibility requirements:
- old cases without workflow templates still render correctly
- old case timelines can coexist with new collaboration events
- new workflow artifacts must be optional/defaulted where appropriate

## Suggested milestone breakdown

### M19A - Typed workflow templates and collaboration artifacts
- add typed template, run, note, handoff, escalation, and automation models
- add durable records and compatibility behavior

### M19B - Workflow stage and console integration
- show workflow template, stage, and next action in console detail and summaries
- add readable timeline events for collaboration actions

### M19C - Safe automation layer
- add bounded remote ops automation rules and audit trail
- integrate with existing safe operator actions and queues

### M19D - Tests, docs, and dogfood scenarios
- add test coverage and update docs/status
- ensure scenario-based validation is explicit

## Required test scenarios

At minimum, add or update tests for:

1. attaching a workflow template to a case
2. workflow stage progression reflected in console/timeline
3. adding a structured note produces durable collaboration record
4. handoff and reassignment remain auditable and visible
5. escalation creation and resolution remain durable and readable
6. safe automation trigger produces durable audit record
7. automation suggestions do not bypass human auth boundaries
8. old cases without workflow template remain compatible
9. restore/process-death continuity for workflow and collaboration artifacts

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

M19 is done when:
1. typed workflow templates, notes, handoffs, escalations, and automation artifacts exist
2. cases can carry workflow stage and template context without replacing truth-state semantics
3. collaboration actions are durable and auditable
4. safe remote ops automation is typed, bounded, and explainable
5. console/timeline surfaces show collaboration and workflow context readably
6. restore/process-death compatibility holds
7. docs/status are updated with exact M19 scope and deferred items

## Deliverables

At the end, report:
- changed files
- typed model additions
- runtime workflow/collaboration/automation changes
- console/timeline additions
- tests added or updated
- deferred items that remain
- blockers if any

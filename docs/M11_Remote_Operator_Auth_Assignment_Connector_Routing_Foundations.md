# M11 - Remote Operator Auth, Assignment, and Connector Routing Foundations

## Why this milestone now

The current system already has:

- role-aware runtime
- proof ledger and receiptization
- governance analytics
- operator queues and local operator actions
- settlement/dispute/reconciliation durability
- remote-ready telemetry, alert delivery, and reconciliation service boundaries

What remains deferred is the first real step from a local/developer operator model toward a shared remote operator model:

- multi-operator auth and permission boundaries
- durable case assignment / ownership / escalation
- destination-aware alert routing
- connector-ready delivery contracts for Slack / Jira / Zendesk / CRM style integrations

This milestone should **not** attempt a full SaaS console redesign or full production connector rollout.
It should create the durable typed and runtime foundations that make those later steps safe.

## Goal

Turn the current local operator workflows into a permission-aware, assignment-aware, connector-routable remote collaboration foundation.

## In scope

### 1. Typed operator identity and permission model

Add or strengthen typed concepts such as:

- `OperatorIdentity`
- `OperatorRole`
- `OperatorPermission`
- `PermissionScope`
- `OperatorSessionSummary`
- `GovernanceCaseAssignment`
- `GovernanceCaseAssignmentEvent`
- `GovernanceCaseOwnershipState`

Minimum behavior:

- operator actions are associated with a typed operator identity
- operator actions can be permission-checked
- durable trails record who performed which action

### 2. Assignment / claim / release / escalate workflow

Add typed, durable support for:

- assign case
- claim case
- release case
- reassign case
- escalate case
- optional resolution note / handoff note

All of these must append durable operator trail events and update governance case state.

### 3. Connector routing foundations

Add or strengthen typed concepts such as:

- `AlertDestinationType`
- `AlertDestinationRef`
- `AlertRoutingRule`
- `AlertRoutingDecision`
- `ConnectorDeliveryStatus`
- `ConnectorDeliveryAttempt`
- `ConnectorDeliveryRecord`
- `ConnectorIssueSummary`

Minimum destination families to model:

- Slack-like
- Jira-like
- Zendesk-like
- CRM / case-management like
- generic webhook / export target

This milestone does **not** require full production integrations.
It does require typed routing/runtime behavior and durable delivery attempts.

### 4. Permission-aware operator actions

Existing operator actions and new collaboration actions should be permission-aware, including:

- mark reviewed
- retry sync
- assign / claim / release / reassign
- escalate
- export / copy summary where appropriate

Denied actions must produce durable, readable, canonical reason codes.

### 5. Governance console collaboration visibility

Extend internal/debug-facing governance views to show, where applicable:

- assignee / owner
- claimed / unclaimed
- escalation state
- remote destination routing summary
- connector delivery status
- permission denial summary if relevant

### 6. Durable trail integration

Assignment / escalation / delivery routing actions must be written into the durable ledger trail.

Add or strengthen canonical event support for examples like:

- `OPERATOR_ASSIGNED`
- `OPERATOR_CLAIMED`
- `OPERATOR_RELEASED`
- `OPERATOR_REASSIGNED`
- `OPERATOR_ESCALATED`
- `CONNECTOR_ROUTING_REQUESTED`
- `CONNECTOR_DELIVERY_ATTEMPTED`
- `CONNECTOR_DELIVERY_FAILED`
- `CONNECTOR_DELIVERY_ACKED`

### 7. Canonical reason-code families

Introduce or strengthen structured reason-code families such as:

- `ROLE_OPERATOR_PERMISSION_DENIED`
- `ROLE_OPERATOR_ASSIGNMENT_UPDATED`
- `ROLE_OPERATOR_ESCALATION_REQUESTED`
- `ROLE_CONNECTOR_ROUTE_SELECTED`
- `ROLE_CONNECTOR_ROUTE_FAILED`
- `ROLE_CONNECTOR_DELIVERY_RETRIED`

Keep compatibility with existing trails and summaries.

## Out of scope

Do **not** do these in M11:

- full SaaS console redesign
- full identity provider / SSO integration
- production-grade Slack / Jira / Zendesk / CRM connectors with real credentials
- orchestrator rewrite
- full remote settlement rail integration
- broad storage rewrite
- free-form operator workflow builder

## Architectural direction

Prefer additive, typed, backward-compatible changes.

Use ports/adapters where needed:

- operator auth / session port
- connector routing / delivery port
- assignment persistence / collaboration port

Keep local-first fallback behavior:

- if no remote operator backend is configured, the system should still function with local durable state
- if no real connector is configured, routing may target local durable stubs / no-op adapters without breaking the main governance flow

## Suggested implementation breakdown

### M11A - Typed auth and assignment model
- add operator identity / permission / assignment types
- add durable assignment and ownership state
- add audit trail events

### M11B - Permission-gated actions
- enforce permission checks on operator actions
- add canonical denial reason codes
- surface readable denial messages in internal views

### M11C - Connector routing foundations
- add alert destination and routing decision models
- add connector delivery attempt/status records
- integrate with remote-ready pipeline boundaries

### M11D - Console visibility and tests
- show assignment / escalation / connector routing status in governance views
- add tests and update docs/status

## Minimum test coverage

Add or update tests for:

- operator action denied without permission
- operator action succeeds with permission and durable trail is written
- case assignment / claim / release / reassign transitions
- escalation creates durable state and visible summary
- connector routing chooses expected destination type
- connector delivery failure is durable and queryable
- backward-compatible decoding of old records without new auth/assignment fields
- local-first fallback works without remote backend configured

## Validation commands

Run and pass at least:

- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

## Definition of done

M11 is done when:

1. Operator actions are associated with typed operator identity and permission context.
2. Assignment / claim / release / reassign / escalate flows are durable and queryable.
3. Permission denials are explicit, typed, and readable.
4. Connector routing and delivery attempts are typed runtime behavior, not just labels.
5. Governance console/internal views show owner/assignee/escalation/connector status clearly.
6. Durable ledger trail records collaboration and connector-routing actions.
7. Old records remain decodable and local-first fallback remains intact.
8. Tests and validation commands pass.
9. Docs/spec/plan/status are updated with exact M11 compliance mapping.

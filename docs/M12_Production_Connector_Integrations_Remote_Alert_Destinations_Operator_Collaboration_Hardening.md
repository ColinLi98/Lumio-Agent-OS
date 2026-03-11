# M12 - Production Connector Integrations, Remote Alert Destinations, and Operator Collaboration Hardening

## Why M12 now

The system already has:
- role-aware runtime
- durable receipts and proof-ledger semantics
- governance analytics
- settlement / dispute / reconciliation hardening
- governance console and operator workflows
- remote-ready telemetry / alert / reconciliation service boundaries
- remote operator auth / assignment / connector routing foundations

The next bottleneck is no longer internal state modeling. It is whether the operator side can move from "local or stub-ready" to "production-capable remote collaboration and delivery" without breaking the local-first architecture.

M12 closes the biggest remaining gap between an internal operator tool and a real deployable operator support system:
- real connector adapter contracts
- delivery status and acknowledgement mapping
- durable collaboration actions across operators
- destination-aware alert routing
- permission-aware remote operator actions
- connector-level retry, dead-letter, and visibility behavior

This is not a cosmetic pass. It is a runtime and infrastructure pass.

---

## Goal

Turn the existing remote-ready operator and alert pipeline into a production-capable connector and collaboration layer while preserving local-first fallback behavior.

In plain terms:
- alerts should be routable to real destinations
- operator actions should be collaboration-aware and durable
- connector delivery outcomes should be modeled and queryable
- routing and assignment behavior should remain explainable and auditable
- the system must continue functioning even when remote destinations are unavailable

---

## In scope

### 1. Production-capable connector contracts and adapters
Strengthen typed connector concepts for real delivery targets, including at minimum:
- Slack-like messaging destination
- Jira-like issue destination
- Zendesk-like ticket destination
- CRM-like destination
- generic webhook destination

The exact names may vary, but the system must distinguish connector type and runtime behavior explicitly.

Expected typed concepts include equivalents of:
- `ConnectorProviderType`
- `ConnectorDeliveryTarget`
- `ConnectorCredentialRef`
- `ConnectorDeliveryRequest`
- `ConnectorDeliveryAttempt`
- `ConnectorDeliveryRecord`
- `ConnectorDeliveryStatus`
- `ConnectorAck`
- `ConnectorFailureReason`
- `DeadLetterRecord`
- `ConnectorHealthSummary`

Adapters should be real runtime components, not UI placeholders.
Where live credentials are unavailable, implementations must still be adapter-complete and testable using injected fake transports.

### 2. Destination-aware alert routing
Expand alert routing so that the system can decide:
- which destination(s) should receive an alert
- what payload shape should be emitted
- what priority/severity rules apply
- which queues or case families should route to which connectors
- when duplicate routing must be suppressed
- when escalation should trigger additional destinations

This must be typed/runtime behavior, not only formatter text.

### 3. Operator collaboration hardening
Strengthen collaboration semantics across operator actions, such as:
- assign
- claim
- reassign
- escalate
- acknowledge
- comment / note
- resolve with rationale
- request retry
- request handoff

Expected typed concepts include equivalents of:
- `OperatorAssignmentRecord`
- `OperatorCollaborationAction`
- `OperatorCommentRecord`
- `OperatorEscalationRecord`
- `OperatorActionPermissionResult`
- `OperatorHandoffSummary`

Every material collaboration action must be durable and must enter the ledger trail.

### 4. Permission-aware remote operator actions
Use the existing operator auth / permission foundations from M11 and make them runtime-enforced for remote and collaborative actions.

At minimum, the system should distinguish:
- who may assign / reassign
- who may escalate
- who may resolve / close
- who may route alerts externally
- who may retry remote sync / delivery

Denied actions must generate durable operator events and readable reason codes.

### 5. Connector delivery receipts and governance visibility
Governance and Activity surfaces should expose production-relevant remote state, such as:
- connector target
- delivery status
- last attempt outcome
- ack / not-acked / duplicate / dead-letter state
- assignment owner
- escalation state
- collaboration note count / latest note summary

This does not require a broad console redesign.
It does require the state to be visible in existing internal/governance surfaces.

### 6. Retry, idempotency, dead-letter, and health behavior
Connector delivery must support:
- retry with attempt trail
- duplicate suppression / idempotency keys
- dead-letter semantics for terminal delivery failure
- connector health summaries
- queryable unresolved connector issues

This should extend the current M7-M9 durability model rather than replacing it.

---

## Out of scope

Do not do the following in M12:
- full SaaS redesign of the operator console
- full SSO / IdP production integration
- organization directory sync or complete user lifecycle management
- complete payment-rail or settlement backend rewrite
- orchestrator rewrite
- broad storage rewrite
- custom end-user UX overhaul
- broad non-scoped cleanup unrelated to M12

If live external credentials are unavailable, do not block the milestone. Implement adapter-complete runtime behavior with injectable test transports and explicit deferred notes.

---

## Architectural direction

### A. Keep local-first behavior intact
Remote delivery and collaboration must enhance the system, not become a hard dependency.

Rules:
- if remote delivery fails, local ledger truth must remain intact
- if connectors are unavailable, cases remain operable locally
- local governance visibility must continue to function without remote success
- remote actions should degrade to durable pending / failed / retryable states

### B. Reuse existing durable truth layers
Build on:
- receipts
- proof-ledger events
- settlement / dispute / reconciliation records
- governance case records
- remote pipeline summaries

Do not invent a parallel history model.

### C. Separate delivery semantics from rendering semantics
Connector state must exist in typed models first.
UI formatting is downstream of real state.

---

## Suggested work breakdown

### M12A - Typed production connector delivery layer
Add or strengthen the typed contracts and runtime adapters required for production-capable connector delivery.

Expected behaviors:
- destination-specific payload generation
- status mapping into durable records
- ack / delivery failure / retry handling
- idempotency keys for duplicate suppression
- per-connector health visibility

### M12B - Collaboration actions and assignment durability
Add durable collaboration records and runtime behavior for:
- claim / assign / reassign / escalate
- collaboration comments or notes
- remote routing decisions
- permission-denied actions

These actions should be available in governance/operator flows and reflected in ledger history.

### M12C - Governance visibility and delivery trail
Expose the most important connector and collaboration state in the existing governance surfaces.

At minimum, make visible:
- assigned operator
- escalation state
- delivery target and status
- latest connector issue
- latest collaboration action
- dead-letter or unresolved routing problem

### M12D - Tests, docs, and compatibility verification
Add and update tests for:
- connector contract serialization / compatibility
- destination routing behavior
- permission gating for collaborative actions
- duplicate suppression / retry / dead-letter behavior
- governance visibility formatting
- local-first fallback when connectors fail or are absent

Update:
- spec
- plan
- status
- milestone compliance mapping

---

## Required runtime principles

### 1. Real typed/runtime behavior
Do not treat this as a naming or UI pass.
Connectors, delivery state, collaboration state, and permission results must be real runtime outputs.

### 2. Durable auditability
Every material collaboration or connector action must be recoverable from durable records.

### 3. Idempotency
Repeated remote attempts or repeated connector callbacks must not corrupt terminal state.

### 4. Permission enforcement
Do not rely on UI hiding alone.
Denied remote/operator actions must be enforced in runtime and recorded durably.

### 5. Compatibility
New fields must remain additive and backward-compatible where possible.

---

## Suggested typed concept coverage

The exact class names may differ, but M12 should cover equivalents of the following:

### Connector and delivery
- connector provider type
- connector target / destination
- credential reference
- delivery request
- delivery attempt
- delivery record
- delivery status
- provider acknowledgement
- delivery failure reason
- dead-letter record
- connector health summary

### Collaboration and operator actions
- assignment record
- claim / reassign / escalate action record
- collaboration note / comment record
- permission result for operator action
- handoff summary
- remote routing action summary

### Query / filtering / governance
- unresolved connector issues
- connector failure bucket
- dead-letter bucket
- queue by connector target
- queue by assignee
- queue by escalation state

---

## Suggested reason-code families

Introduce or strengthen canonical reason-code families for M12, for example:
- `ROLE_CONNECTOR_ROUTE_*`
- `ROLE_CONNECTOR_DELIVERY_*`
- `ROLE_CONNECTOR_ACK_*`
- `ROLE_CONNECTOR_DEAD_LETTER_*`
- `ROLE_OPERATOR_ASSIGN_*`
- `ROLE_OPERATOR_ESCALATE_*`
- `ROLE_OPERATOR_PERMISSION_DENIED_*`
- `ROLE_OPERATOR_COLLAB_*`

If legacy strings remain, canonical structured codes should still be primary.

---

## Dogfood scenarios

At minimum, validate these scenarios:

1. **Same case, different routing target**
   - same governance case under different severity/queue rules routes to different connector targets
   - visible in governance trail

2. **Permission-denied operator action**
   - operator without assign/escalate permission attempts action
   - action denied in runtime
   - durable denial event recorded
   - readable reason shown

3. **Duplicate connector callback**
   - duplicate delivery callback or repeated attempt does not duplicate terminal outcome
   - duplicate suppression visible in records

4. **Remote connector unavailable**
   - local case remains operable
   - delivery becomes pending/failed/retryable
   - governance console shows unresolved remote issue

5. **Escalation creates additional routing**
   - escalation triggers additional destination or priority path
   - all delivery attempts remain visible and durable

6. **Dead-letter path**
   - repeated delivery failure moves alert/case into dead-letter state
   - case remains queryable and operator-visible

7. **Assignment + note + reassign trail**
   - operator collaboration chain is durable and visible end-to-end

---

## Validation commands

Run relevant validation commands and fix failures before declaring completion:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

Add additional connector/collaboration tests where appropriate and report them explicitly.

---

## Definition of done

M12 is done when:

1. Production-capable connector delivery contracts and runtime adapters exist.
2. Destination-aware alert routing is typed, durable, and queryable.
3. Assignment / reassign / escalate / collaboration actions are durable and permission-aware.
4. Connector delivery status, ack state, dead-letter state, and unresolved issues are visible in governance surfaces.
5. Duplicate delivery/callback handling remains idempotent.
6. Local-first fallback still works when remote connectors are unavailable.
7. Tests cover connector delivery, collaboration actions, permission denial, retry/dead-letter behavior, and governance visibility.
8. Docs/status files are updated with exact M12 scope and deferred items.

---

## Deliverable format

At the end, report:
- changed files
- typed model additions
- runtime behavior additions
- governance/UI visibility changes
- tests added or updated
- validations run
- remaining deferred items
- blockers, if any


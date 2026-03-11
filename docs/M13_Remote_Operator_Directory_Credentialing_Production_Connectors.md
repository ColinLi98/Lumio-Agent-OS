# M13 — Remote Operator Directory, Credentialing, and Production Connector Hardening

## Why M13 is next

M0–M12 established the local-first Agent OS execution stack, durable proof ledger, governance analytics, operator console, remote-ready ports, operator action trails, and collaboration primitives.

The major remaining gap is not local correctness anymore. It is **remote trust and production connectivity**.

At this point, the system can:
- execute and explain role-aware workflows
- persist receipts, disputes, rollback, and reconciliation state
- derive governance cases and alerts
- route operator actions through typed local/runtime paths
- surface collaboration and operator-trail state internally

What it still cannot fully do in production is:
- identify remote operators through a durable shared directory
- enforce remote multi-operator authorization consistently
- manage connector credentials and destinations as durable production resources
- deliver production-grade alerts and case handoffs through real connector implementations
- bind outbound connector activity to auditable operator/team identity

That is the focus of M13.

---

## Goal

Add the production-ready foundations for:
1. remote operator directory and identity binding
2. multi-operator auth / permission enforcement beyond local-only context
3. connector credentialing and destination management
4. production-capable outbound connector implementations behind typed adapter contracts
5. durable audit and authorization linkage between operator identity, connector action, and remote delivery

This is **not** a broad SaaS console redesign.
It is a trust, identity, and connector-hardening milestone.

---

## Core outcome

After M13, the system should be able to answer, durably and auditably:
- which remote operator or operator team performed or authorized an action
- which connector destination was used
- which credentials or auth profile were active for that destination
- whether the operator was allowed to perform the action
- whether the connector delivery was production-routed, denied, failed, retried, or dead-lettered
- which remote operator directory entry owns or is assigned to a case

---

## In scope

### 1. Remote operator directory foundations
Add typed models and persistence for a shared remote operator identity layer.

Suggested concepts:
- `RemoteOperatorIdentity`
- `RemoteOperatorTeam`
- `RemoteOperatorDirectoryEntry`
- `RemoteOperatorRole`
- `RemoteOperatorPermission`
- `RemoteOperatorAssignment`
- `RemoteOperatorSessionBinding`
- `RemoteOperatorAuthorizationContext`

Minimum capabilities:
- durable operator id
- display name / handle
- team / group link
- bounded role set
- assignment identity usable by governance cases
- local-first fallback when no remote directory is configured

### 2. Remote authorization / permission hardening
Strengthen authorization semantics for remote operator actions.

Suggested concepts:
- `RemoteAuthorizationResult`
- `RemoteActionPermissionCheck`
- `OperatorCapabilityMatrix`
- `AssignmentMutationAuthorization`

At minimum, gate:
- case claim / assign / reassign
- mark reviewed
- retry sync intent
- retry alert delivery
- connector reroute or resend
- escalation / note / handoff where already modeled

Important:
- denied actions must remain durable and auditable
- local debug/admin fallback may still exist, but remote-aware auth must become first-class

### 3. Connector destination and credentialing models
This is the key production hardening layer.

Add typed concepts such as:
- `ConnectorDestination`
- `ConnectorDestinationId`
- `ConnectorCredentialRef`
- `ConnectorCredentialStatus`
- `ConnectorAuthProfile`
- `ConnectorRouteBinding`
- `ConnectorSecretHandle`
- `ConnectorCapabilityPolicy`
- `ConnectorOwnershipSummary`

Support at least these destination classes through a shared adapter contract:
- generic webhook
- Slack-like alert destination
- Jira-like ticket destination
- Zendesk-like support destination
- CRM-like escalation destination

This milestone does **not** require every vendor integration to be feature-complete.
But it must make real production connector instances possible instead of staying at only local stub/no-op boundaries.

### 4. Production connector implementations behind adapter boundary
Use the existing connector adapter pattern and harden it with production-capable paths.

Expected direction:
- preserve typed adapter boundary
- keep stub/no-op adapters for local-first fallback
- add one or more production-capable connector implementations or a generic credentialed HTTP adapter that proves the path
- preserve idempotency, retry, dead-letter, and delivery audit semantics

### 5. Durable operator-to-connector audit linkage
Every meaningful remote connector action should be attributable.

Persist and expose where applicable:
- operator identity
- operator team
- auth result
- destination id
- connector type
- credential ref / auth profile ref
- route binding
- delivery attempt id
- delivery result
- reason-code family

This should join the existing receipt / governance / operator-trail model, not fork from it.

### 6. Governance console integration
The internal governance console should be able to show production-hardened metadata such as:
- assignee / owner / team
- remote operator identity
- connector destination summary
- connector auth status summary
- delivery route / retry / dead-letter state
- permission denied / auth failure summaries

This is still an internal/admin/debug-facing surface in this pass.
Do not turn it into a broad SaaS redesign.

---

## Out of scope

Do **not** do the following in M13:
- full SSO / IdP / SCIM enterprise rollout
- broad SaaS operator console redesign
- orchestrator rewrite
- broad storage/history rewrite
- full payment or settlement rail integration
- unlimited connector marketplace
- free-form RBAC policy DSL
- complete end-user surface redesign

---

## Design principles

1. **Identity must be durable**
   Remote operator identity cannot remain an implied local context.

2. **Authorization must be explicit**
   Every meaningful operator action must be either clearly allowed or clearly denied.

3. **Connectors must be production-addressable resources**
   Destinations and credential references should be typed, durable, and queryable.

4. **Audit linkage must stay intact**
   Operator identity, connector choice, delivery result, and governance case state must remain linkable.

5. **Local-first fallback remains valid**
   The system must still run without remote directory or destination configuration.

6. **Backward compatibility stays required**
   New models should be additive and compatible with the existing durable ledger/receipt records.

---

## Suggested milestone breakdown

### M13A — Remote operator directory foundation
- typed remote operator identity / team / role / permission models
- durable directory entry and assignment linkage
- local-first fallback when no remote directory is configured

**Done when**
- cases can be bound to durable remote operator identity or team records
- authorization context is no longer only local/implicit

### M13B — Remote authorization hardening
- explicit permission checks for remote-aware operator actions
- denied actions produce durable audit records
- assignment / reassign / retry / reroute actions use typed auth results

**Done when**
- remote-aware auth is first-class in operator action flow
- denied actions are durable and explainable

### M13C — Connector credentialing and destination hardening
- typed destination models
- credential references / auth profiles
- route binding and capability policy
- one or more production-capable connector paths (or a generic credentialed delivery path)

**Done when**
- connector destinations are durable resources
- connector delivery can reference credential/auth metadata safely

### M13D — Governance visibility and tests
- governance console shows assignee / operator identity / destination / auth / delivery status
- tests cover remote identity, auth denial, destination binding, connector delivery metadata, and compatibility
- docs/status updated

**Done when**
- operator and connector production metadata is visible and auditable
- required tests pass

---

## Required typed concepts

Add or strengthen typed contracts similar to:
- `RemoteOperatorIdentity`
- `RemoteOperatorTeam`
- `RemoteOperatorAssignment`
- `RemoteOperatorAuthorizationContext`
- `RemoteAuthorizationResult`
- `ConnectorDestination`
- `ConnectorCredentialRef`
- `ConnectorAuthProfile`
- `ConnectorRouteBinding`
- `ConnectorDeliveryAuditRecord`
- `ConnectorDeliveryFailureSummary`
- `OperatorConnectorActionSummary`

Exact names may vary, but the semantic areas must be explicit.

---

## Suggested reason-code families

Add structured reason-code families where needed, for example:
- `ROLE_REMOTE_OPERATOR_AUTH_ALLOWED`
- `ROLE_REMOTE_OPERATOR_AUTH_DENIED`
- `ROLE_REMOTE_ASSIGNMENT_BOUND`
- `ROLE_REMOTE_ASSIGNMENT_REASSIGNED`
- `ROLE_CONNECTOR_DESTINATION_SELECTED`
- `ROLE_CONNECTOR_DESTINATION_DENIED`
- `ROLE_CONNECTOR_AUTH_PROFILE_APPLIED`
- `ROLE_CONNECTOR_CREDENTIAL_MISSING`
- `ROLE_CONNECTOR_DELIVERY_RETRIED`
- `ROLE_CONNECTOR_DELIVERY_DEAD_LETTERED`

Do not reduce this to only UI copy.

---

## Required scenarios

Add or update tests for at least:

1. remote operator identity binds to case assignment and survives restore
2. unauthorized remote operator action is denied and durably logged
3. authorized remote operator action succeeds and produces durable trail
4. connector destination binding selects the expected destination class
5. missing/invalid credential reference produces durable delivery failure state
6. connector delivery metadata remains queryable and auditable
7. local-first fallback still works when no remote operator directory or connector destination is configured
8. old/new mixed records remain compatible

---

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

Add new M13-specific tests to the validation report if introduced.

---

## Definition of done

M13 is done when:
1. remote operator identity and assignment are durable typed concepts
2. remote-aware operator actions are permission-gated
3. connector destinations and credential references are durable typed resources
4. production-capable connector delivery is possible through the adapter boundary
5. operator identity, connector route, auth profile, and delivery result are auditable together
6. governance/internal surfaces can show operator assignment and connector delivery state clearly enough for internal use
7. local-first fallback remains functional
8. tests and docs/status are updated

---

## Deferred after M13

Expected next milestone after M13:
- **M14 — Enterprise SSO / IdP / Directory Sync + Full Remote Collaboration Hardening**

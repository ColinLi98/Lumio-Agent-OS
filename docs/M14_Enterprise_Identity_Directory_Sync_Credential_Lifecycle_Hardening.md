# M14 - Enterprise Identity, Directory Sync, and Credential Lifecycle Hardening

## Why M14 is next

M13 completed the remote-ready foundations for:
- operator identity and remote authorization result types
- connector destinations, route bindings, and auth profile references
- durable collaboration and connector audit linkage
- remote denial auditability and governance searchability

The next real production gap is no longer runtime structure. It is **enterprise-grade identity and credential reality**.

Right now, the system can model:
- remote operator identity
- remote authorization outcomes
- connector auth profiles as typed references
- connector delivery and governance traces

But the following are still explicitly deferred:
- enterprise remote directory / SSO / SCIM / IdP integration
- production credential storage and rotation
- stronger remote identity provenance and session lifecycle

That makes M14 the correct next milestone.

---

## Goal

Turn the current remote-ready identity and connector model into a production-capable enterprise foundation by adding:
1. enterprise directory sync semantics
2. SSO / IdP-ready operator session and identity linkage
3. credential reference lifecycle, health, and rotation semantics
4. stronger authorization provenance and auditability
5. additive, local-first-compatible implementations that do not require a full backend rewrite

---

## What M14 should achieve

After M14, the system should be able to answer:
- which remote operator directory entry this user/session came from
- whether the operator identity is local-only, remotely linked, or enterprise-synced
- which credential reference a connector route is using
- whether that credential is healthy, expiring, rotated, revoked, or misconfigured
- whether an operator action was authorized via local policy, remote policy, or enterprise-linked session state
- when a remote identity or credential changed, and whether that change affects current operator workflows

---

## In scope

### 1. Enterprise operator identity and directory-sync concepts
Add or strengthen typed concepts such as:
- `EnterpriseDirectoryIdentity`
- `EnterpriseDirectorySource`
- `DirectorySyncStatus`
- `DirectorySyncSnapshot`
- `DirectorySyncResult`
- `RemoteIdentityLink`
- `RemoteSessionBinding`
- `RemoteSessionStatus`
- `OperatorIdentityProvenance`

These do not require a full production IdP connection in this pass, but the contracts and durable semantics must exist.

### 2. SSO / IdP-ready session semantics
Add typed models and runtime handling for:
- session origin
- session binding to remote operator identity
- session freshness / expiry / invalidation
- remote auth provenance
- local fallback when remote identity is unavailable

Examples:
- `SessionAuthority`
- `SessionAuthContext`
- `SessionFreshnessState`
- `RemoteAuthorizationProvenance`

The product should remain local-first-compatible even when remote auth is unavailable.

### 3. Credential lifecycle and rotation semantics
Strengthen connector credential concepts beyond static typed refs.

Add or strengthen typed concepts such as:
- `CredentialReference`
- `CredentialHealthStatus`
- `CredentialRotationState`
- `CredentialRotationRequest`
- `CredentialRotationResult`
- `CredentialRevocationState`
- `CredentialExpirySummary`
- `ConnectorCredentialBinding`
- `ConnectorCredentialIssue`

This pass should not build a full secret-management platform, but it must make credential lifecycle durable and visible.

### 4. Authorization provenance hardening
Operator actions should be able to show whether they were authorized by:
- local default authorization
- enterprise-linked remote authorization
- stale-but-permitted fallback
- denied remote session state
- explicit credential/route health failure

The system should preserve this provenance in durable traces.

### 5. Governance and console visibility
The internal governance/operator surfaces should become able to show, where relevant:
- identity source
- sync status
- session status
- credential health
- credential expiry / rotation needed
- connector auth issues
- authorization provenance summary

This is not a broad console redesign. It is additive visibility for correctness and production hardening.

### 6. Additive service boundaries
Introduce or strengthen additive ports/interfaces for:
- directory sync
- remote session validation
- credential status resolution
- credential rotation trigger/request

These may be local durable stubs in this pass, but the service seam must be explicit.

---

## Out of scope

Do **not** do the following in M14:
- full enterprise SSO product rollout
- full SCIM user/group provisioning implementation
- full secret vault backend implementation
- broad operator SaaS console redesign
- orchestrator rewrite
- settlement rail redesign
- broad history/storage rewrite
- arbitrary custom identity policy DSL

---

## Product and platform principles

### 1. Local-first must survive
If remote directory or credential state is unavailable, the product must degrade safely.
It must not silently erase local governance capability.

### 2. Provenance matters as much as permission
The system should not only know **whether** an action was allowed.
It should also know **why**, from which identity/session source, and under which credential health state.

### 3. Credential state is part of runtime truth
Credential health, expiry, revocation, and rotation need typed status — not only hidden connector configuration.

### 4. No rewriting of past audit truth
If identity links or credential bindings change later, past audit/ledger records must remain historically correct.

---

## Suggested typed model areas

### Identity / directory
- `EnterpriseDirectoryIdentity`
- `DirectorySyncSnapshot`
- `DirectorySyncStatus`
- `RemoteIdentityLink`
- `OperatorIdentityProvenance`

### Session / authorization provenance
- `SessionAuthContext`
- `SessionAuthority`
- `RemoteAuthorizationProvenance`
- `SessionFreshnessState`
- `AuthorizationSourceSummary`

### Credential lifecycle
- `CredentialReference`
- `CredentialHealthStatus`
- `CredentialRotationState`
- `CredentialRevocationState`
- `CredentialRotationRequest`
- `CredentialRotationResult`
- `ConnectorCredentialBinding`
- `ConnectorCredentialIssue`

### Governance surface summaries
- `OperatorIdentitySummary`
- `ConnectorCredentialSummary`
- `AuthorizationProvenanceSummary`
- `DirectorySyncSummary`

Exact names may vary, but these concepts should be explicit and durable.

---

## Runtime requirements

### A. Identity binding
When a remote operator directory entry is known, it should be linked durably to operator action provenance.

### B. Session-aware authorization
Authorization checks should record:
- local vs remote authority
- session freshness
- fallback usage
- denial cause

### C. Credential-aware connector routing
A connector route should be able to reflect:
- which credential reference is bound
- whether that credential is valid
- whether routing is blocked due to credential state
- whether rotation/re-auth is needed

### D. Governance visibility
Where operator/governance surfaces already exist, they should become able to show:
- identity sync status
- session/auth provenance
- credential health / rotation-needed
- connector auth issues

---

## Suggested reason-code families

Add canonical structured families where useful, for example:
- `ROLE_REMOTE_IDENTITY_LINKED`
- `ROLE_REMOTE_IDENTITY_SYNC_PENDING`
- `ROLE_REMOTE_SESSION_FALLBACK_USED`
- `ROLE_REMOTE_AUTH_PROVENANCE_RECORDED`
- `ROLE_CONNECTOR_CREDENTIAL_HEALTHY`
- `ROLE_CONNECTOR_CREDENTIAL_EXPIRING`
- `ROLE_CONNECTOR_CREDENTIAL_REVOKED`
- `ROLE_CONNECTOR_CREDENTIAL_ROTATION_REQUIRED`
- `ROLE_CONNECTOR_ROUTE_BLOCKED_BY_CREDENTIAL_STATE`

These should remain structured and auditable, not only formatter strings.

---

## Milestone breakdown

### M14A - Enterprise identity and directory-sync contracts
Add typed contracts and durable summaries for enterprise identity, remote identity link, and directory sync status.

**Done when**
- identity/directory-sync concepts are typed
- sync status can be stored and surfaced
- past audit truth remains stable

### M14B - Session/auth provenance hardening
Add typed session/auth provenance concepts and make operator authorization record them.

**Done when**
- authorization decisions preserve local/remote provenance
- fallback / stale / denial conditions are durable and readable

### M14C - Credential lifecycle and route health
Add typed credential health / rotation / revocation / binding semantics and make connector routing sensitive to them.

**Done when**
- connector auth profiles are no longer effectively opaque refs
- credential health and route blocking become durable/runtime-visible

### M14D - Governance visibility, tests, docs
Expose identity/auth/credential summaries in internal governance surfaces and add the required tests.

**Done when**
- governance/internal surfaces can show identity source, session state, and credential health summaries
- tests and docs are updated

---

## Required tests

Add or update tests for at least these scenarios:

1. remote directory link persists and is visible in operator audit provenance
2. remote session denial does not overwrite local permission semantics incorrectly
3. local fallback authorization is recorded explicitly
4. connector route becomes blocked when credential health is revoked/expired
5. credential rotation-needed state becomes visible in governance summaries
6. identity/credential state survives process death / restore where applicable
7. old/new mixed records remain compatible
8. formatter/governance summaries show identity source, session provenance, and credential state readably

---

## Validation commands

Run and fix failures before considering M14 complete:

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

M14 is done when:
1. enterprise identity / directory-sync / remote session concepts are typed and durable
2. operator authorization can preserve local/remote provenance cleanly
3. connector credential lifecycle state is typed and can influence routing/visibility
4. governance/internal surfaces can show identity source, auth provenance, and credential health
5. past audit truth remains stable when identity/credential state changes later
6. tests cover identity binding, fallback/denial, credential health, restore continuity, and compatibility
7. docs/status are updated with exact deferred items

---

## Deferred after M14

Expected next milestone after M14:
- M15 - Enterprise SSO / SCIM / IdP integration and production credential vault integration

# M16 - Production Enterprise Rollout Controls, Secret Vault Backend, and Cutover Readiness

## Why this milestone exists now

M0 through M15 established the product and platform shape of the Agent OS:
- role-aware runtime execution
- durable receipts and proof-ledger history
- governance analytics
- settlement/dispute/reconciliation durability
- operator governance workflows
- remote-ready telemetry, alert delivery, and reconciliation service boundaries
- remote operator auth / assignment / connector routing foundations
- enterprise identity/session/directory/credential lifecycle typed semantics

The next gap is not core semantics.
The next gap is **production rollout safety**.

The system can now represent:
- enterprise identity provenance
- directory sync freshness and errors
- credential lifecycle states
- connector route blocking and degradation
- operator-visible enterprise summaries

But it still needs stronger production controls for:
- tenant/workspace/environment rollout
- real secret/vault-backed credential resolution
- safe connector cutover and fallback
- rollout-stage visibility and health
- non-leaky credential handling
- cutover readiness checks before broad enterprise rollout

This milestone turns “enterprise-ready models” into “enterprise-safe rollout infrastructure.”

---

## Goal

Add the rollout controls, secret-vault runtime boundary, and cutover-readiness infrastructure needed to safely move from typed enterprise-ready semantics to production-capable enterprise deployment.

This is not a full enterprise SaaS redesign.
This is a controlled rollout and runtime-hardening milestone.

---

## Core outcome

After M16, the system should be able to answer:
- which tenant/workspace/environment is allowed to use which enterprise features
- whether a connector route is enabled, canary-only, dry-run-only, degraded, or blocked
- whether credential material is available from a real vault/runtime boundary
- whether a connector can safely execute with current credential lease / rotation / revocation state
- whether directory/IdP sync is healthy enough for cutover
- whether a run should stay local-first, degrade, or proceed with enterprise-backed execution

---

## In scope

### 1. Typed rollout-control models

Add or strengthen typed concepts such as:
- `EnterpriseRolloutStage`
- `TenantRolloutProfile`
- `WorkspaceRolloutProfile`
- `ConnectorRolloutPolicy`
- `CutoverReadinessStatus`
- `CutoverReadinessSummary`
- `FeatureGateDecision`
- `ExecutionDegradationMode`
- `EnterpriseFallbackPolicy`

The exact names may vary, but the semantics must be typed and durable.

Minimum rollout stages should support something equivalent to:
- `DISABLED`
- `INTERNAL_ONLY`
- `CANARY`
- `LIMITED_BETA`
- `GA`
- `DEGRADED`
- `BLOCKED`

### 2. Secret vault runtime boundary

Add a real secret/vault runtime boundary rather than relying only on typed credential refs.

Add or strengthen typed concepts such as:
- `VaultLeaseHandle`
- `VaultLeaseStatus`
- `VaultResolutionResult`
- `VaultCredentialMaterialState`
- `VaultAccessAuditRecord`
- `VaultRotationRequest`
- `VaultRotationResult`
- `VaultRevocationResult`
- `VaultHealthSummary`

This pass does not require production vendor-specific vault rollout everywhere, but it must establish a real runtime boundary where credential material can be resolved, checked, renewed, revoked, or denied.

### 3. Connector execution with vault-backed credential health

Connector routing/execution should now consider more than typed status fields.
It should evaluate credential material availability and lease state through the vault boundary.

At minimum, support typed outcomes such as:
- credential resolved and healthy
- credential expiring but usable
- credential expired
- credential revoked
- credential rotation required
- credential misconfigured
- vault unavailable
- vault denied

These outcomes must influence routing and degradation behavior in runtime, not only summary text.

### 4. Directory/IdP cutover readiness

Strengthen enterprise identity rollout with typed cutover-readiness semantics.

Add or strengthen typed concepts such as:
- `DirectoryCutoverCheck`
- `DirectoryCutoverBlockReason`
- `EnterpriseAuthReadinessSummary`
- `IdentitySourceDecision`
- `SessionFreshnessDecision`

The system should be able to decide whether enterprise-backed auth/directory behavior is:
- ready
- not ready
- degraded
- blocked
- fallback-only

### 5. Tenant/workspace scoped rollout decisions

Enterprise rollout should not be all-or-nothing.
Add the ability to make scoped decisions by tenant/workspace/environment where practical.

At minimum, support typed decisions for:
- enterprise identity enabled or not
- remote directory required or optional
- connector routes enabled or canary-only
- vault-backed credential execution enabled or dry-run only
- external alert/connector delivery allowed, degraded, or blocked

### 6. Governance/internal visibility

Internal surfaces should now be able to show, at minimum:
- rollout stage
- cutover readiness summary
- vault/credential runtime health summary
- route blocked/degraded by rollout or vault health
- enterprise fallback reason
- tenant/workspace rollout scope where applicable

This can stay within existing governance/internal UI patterns. No broad redesign is required.

---

## Out of scope

Do not do the following in M16:
- full enterprise SSO/SCIM/IdP provider rollout across every target system
- full production secret-vault vendor integration matrix
- broad SaaS console redesign
- orchestrator rewrite
- broad storage/history rewrite
- full remote operator platform redesign
- full payment/settlement rail rebuild
- end-user-facing IA redesign

---

## Design principles

1. **Local-first remains authoritative**
   Enterprise infrastructure must not silently override safe local authority semantics.

2. **No secret leakage**
   Secret material must not leak into receipts, ledger summaries, or user-visible traces.

3. **Rollout must be typed**
   Do not rely on scattered booleans or ad-hoc strings.

4. **Cutover must be observable**
   Operators should be able to see why a route is enabled, canary-only, degraded, blocked, or falling back.

5. **Fallback must be explicit**
   When enterprise systems are unhealthy or unavailable, the fallback path must be readable and auditable.

6. **Backward compatibility remains required**
   Existing typed refs, summaries, receipts, and history should remain decodable and useful.

---

## Suggested milestone breakdown

### M16A - Rollout control and gate models
- add typed rollout stages and gate decisions
- add tenant/workspace/environment scoping
- thread rollout decisions into runtime summaries and route decisions

**Done when**
- rollout/cutover decisions are typed and queryable
- route blocking/degradation can reference rollout state clearly

### M16B - Vault runtime boundary
- add vault lease/material/health resolution boundary
- add runtime evaluation of vault outcomes
- add audit trail for vault access/denial/rotation/revocation summaries

**Done when**
- runtime can differentiate typed vault-backed credential outcomes
- connector execution can degrade or block based on real vault/runtime boundary results

### M16C - Cutover readiness and fallback
- add typed directory/auth/vault cutover-readiness summaries
- preserve local-first fallback when enterprise systems are not ready
- make fallback reasons durable and readable

**Done when**
- enterprise cutover is no longer implicit
- readiness/fallback states are visible in governance/internal summaries

### M16D - Tests, docs, validation
- add compatibility, runtime, persistence, and formatting tests
- update spec/plan/status with exact M16 coverage and deferred items

**Done when**
- tests cover rollout, vault, cutover, fallback, and restore continuity
- docs/status are updated and clear

---

## Suggested typed model areas

The exact implementation may differ, but M16 should cover semantics equivalent to the following.

### Enterprise rollout
- tenant/workspace id
- rollout stage
- feature gates
- canary/limited beta flags
- degradation mode
- fallback mode
- cutover block reasons

### Vault / credential runtime
- vault handle id
- credential reference id
- lease status
- lease expiry / freshness
- rotation state
- revocation state
- access audit result
- runtime usable / blocked decision

### Identity / directory cutover
- identity source
- assertion freshness
- directory sync freshness
- last sync result
- cutover readiness
- fallback reason

---

## Runtime behavior requirements

### 1. Local permission precedence remains intact
Local permission gates must remain authoritative.
Enterprise identity and remote authorization are additive provenance and gating layers, not silent overrides.

### 2. Route blocking/degradation must be typed
If a connector cannot execute because of vault/credential/rollout state, that decision must be typed and auditable.

### 3. Fallback must be durable and visible
If execution degrades to local-only, dry-run, or blocked mode because enterprise systems are unhealthy, the system should preserve readable and durable reason traces.

### 4. Cutover decisions must not rewrite history
A later enterprise rollout stage or credential fix must not reinterpret past execution receipts or ledger facts.

---

## Required tests

Add or update tests for at least these scenarios:

1. rollout stage blocks a connector route before execution
2. canary/limited-beta route is allowed only under the correct rollout profile
3. vault lease expired causes route block or degrade with typed summary
4. revoked credential blocks route and stays visible after restore
5. vault unavailable triggers explicit fallback path without losing local authority semantics
6. directory/auth cutover not ready results in readable fallback summary
7. typed rollout/vault/enterprise summaries round-trip through contracts and persistence
8. old payloads remain compatible with new optional rollout/vault fields

---

## Validation commands

Run and fix failures before concluding the pass:

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

M16 is done when:
1. typed rollout control and cutover-readiness models exist
2. vault-backed runtime credential states are modeled and used in routing/degradation decisions
3. enterprise fallback remains local-first and explicit
4. governance/internal summaries expose rollout, cutover, and credential health clearly
5. old/new payloads remain compatible
6. tests cover rollout, vault, cutover, fallback, and persistence continuity
7. docs/status are updated with exact M16 coverage and deferred items

---

## Required final report

At the end of the run, report:
- changed files
- new or updated rollout / vault / cutover typed models
- runtime routing/degradation changes
- persistence/compatibility changes
- tests added/updated
- remaining deferred items
- blockers if any

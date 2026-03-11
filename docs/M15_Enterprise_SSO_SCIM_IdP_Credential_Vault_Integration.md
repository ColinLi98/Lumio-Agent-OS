# M15 - Enterprise SSO, SCIM, IdP, and Credential Vault Integration

## Why this milestone exists now

M14 established enterprise-ready identity, directory sync semantics, session/auth provenance, and credential lifecycle modeling.
M14.5 should establish a cleaner release baseline.

The next major gap is production integration depth:
- enterprise SSO semantics still stop at typed models and local/remote provenance
- SCIM/IdP semantics are not yet integrated enough to drive real remote directory state
- credential lifecycle is modeled, but not yet connected to a production-grade vault/integration path
- connector auth and operator identity are ready for deeper productionization, but not yet fully integrated

M15 should harden these paths without rewriting the broader platform.

## Goal

Connect the existing enterprise-ready identity and connector model to real integration-grade flows for:
- enterprise SSO/IdP session provenance
- SCIM-style directory sync inputs
- credential vault references and lifecycle state transitions
- connector auth readiness and route blocking based on vault/credential state

## In scope

### 1. Enterprise identity integration semantics
Add or strengthen additive typed/runtime concepts for:
- SSO session provenance
- IdP-originated identity assertions
- directory sync provenance
- SCIM-like identity update semantics
- remote directory freshness and sync error state

### 2. Credential vault integration semantics
Add or strengthen typed/runtime concepts for:
- vault-backed credential references
- credential lease/refresh state
- rotation requested / rotation completed
- revocation and emergency disable
- route blocking based on vault health or credential lifecycle state

### 3. Route/auth binding hardening
Ensure connector routes can bind to:
- destination
- auth profile
- credential reference
- operator or team context where applicable
- current credential health state

### 4. Governance and receipt visibility
Surface readable summaries for:
- identity source / SSO provenance
- directory freshness / sync state
- credential health / rotation required / revoked / misconfigured
- route blocked due to credential or identity state

### 5. Backward-compatible local-first behavior
No remote dependency should break the system's safe local behavior.
If remote identity/vault integration is unavailable, the system should degrade safely and visibly.

## Out of scope

- full enterprise SSO rollout across every provider
- full SCIM provisioning product
- full secret vault backend implementation from scratch
- broad SaaS console redesign
- orchestrator rewrite
- payment/settlement rail overhaul

## Suggested typed concepts

The exact names may vary, but M15 should explicitly cover concepts such as:
- `EnterpriseIdentityAssertion`
- `EnterpriseSessionProvenance`
- `DirectorySyncUpdate`
- `DirectorySyncErrorState`
- `ScimLikeDirectoryRecord`
- `VaultCredentialReference`
- `VaultCredentialStatus`
- `VaultCredentialRotationState`
- `ConnectorCredentialBinding`
- `CredentialRouteBlockReason`
- `EnterpriseAuthIntegrationSummary`

## Required behavior

### Identity and SSO
- preserve local permission precedence where already defined
- remote identity assertions should add provenance, not erase local governance truth
- denied or degraded enterprise identity paths should remain auditable

### Directory sync
- sync freshness, mismatch, and stale states should be visible and typed
- remote directory updates should not silently corrupt local durable state

### Credential vault
- route eligibility should depend on current credential state
- revoked/expired/misconfigured credentials should block or degrade connector routes safely
- rotation-required state should be visible in governance/internal surfaces

## Suggested milestone breakdown

### M15A - Enterprise identity and SSO provenance
### M15B - SCIM-like directory sync integration semantics
### M15C - Credential vault references and lifecycle state transitions
### M15D - Route binding, visibility, tests, docs

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

M15 is done when:
1. enterprise identity / SSO / directory sync semantics are materially integrated beyond placeholder models
2. credential vault references and lifecycle states influence real route/auth behavior
3. governance/internal surfaces expose readable enterprise identity and credential health state
4. local-first fallback remains intact
5. tests cover compatibility, degraded paths, blocked routes, and restore continuity
6. docs/status are updated with exact scope and deferred items

## Next milestone after M15

After M15, proceed to:
- `M16 - Production Remote Collaboration, Escalation, and Multi-Operator Coordination`

# M17 - Enterprise SSO, SCIM, IdP Provider Rollout, and Production Vault Integration

## Why this milestone exists now

M16 completed the rollout-control and cutover-readiness layer:
- enterprise identity and directory sync typed semantics exist
- session/auth provenance is typed and durable
- vault runtime boundary and credential lifecycle states exist
- route gating and degradation decisions are real runtime behavior
- governance and receipt surfaces can show rollout, cutover, vault, and fallback summaries
- local-first safety remains intact

The remaining gap is no longer modeling. The remaining gap is provider-grade execution.

At this point, the system can represent:
- enterprise identity assertions
- SCIM-like directory updates
- vault credential references and health
- rollout stage and cutover readiness

But it still does not fully execute against production-grade provider integrations.

M17 is the milestone that turns enterprise-readiness from typed/runtime semantics into controlled provider rollout.

## Goal

Introduce production-oriented provider rollout paths for:
- enterprise SSO / IdP session exchange
- SCIM-like directory ingestion and freshness management
- vault-backed connector credential materialization and health checking
- provider-specific route eligibility and degradation

This must remain additive, staged, and local-first safe.

## Core outcome

After M17, the system should be able to do all of the following in a controlled way:
- accept configured enterprise identity providers through typed provider adapters
- track SCIM-like directory sync freshness and provider health through provider-specific records
- resolve connector credentials through a production-oriented vault integration boundary
- gate connector routing using real provider/vault state rather than only local placeholder semantics
- preserve durable auth provenance and credential lifecycle audit trails
- degrade safely when a provider, vault, or directory system is unhealthy

## In scope

### 1. Enterprise SSO / IdP provider adapter rollout
Add provider-oriented adapter contracts and runtime integration paths for enterprise identity providers.

Examples of typed concepts:
- `EnterpriseIdpAdapterType`
- `EnterpriseIdpProviderConfig`
- `EnterpriseIdpSessionExchangeRequest`
- `EnterpriseIdpSessionExchangeResult`
- `EnterpriseAuthProviderHealth`
- `EnterpriseIdentityResolutionResult`

The exact names may vary, but the semantics must be explicit and typed.

Requirements:
- support a staged provider adapter model rather than one hardcoded path
- preserve local permission precedence
- treat remote provider auth as authoritative provenance for remote identity, not a replacement for local trust semantics
- keep failure and fallback durable and explainable

### 2. SCIM-like provider rollout
Add provider-oriented sync semantics for directory ingestion and freshness management.

Examples:
- `ScimProviderAdapterType`
- `ScimProviderConfig`
- `DirectorySyncCheckpoint`
- `DirectorySyncFreshnessStatus`
- `DirectorySyncProviderHealth`
- `DirectorySyncProviderResult`

Requirements:
- support typed freshness, lag, last-success, and last-error summaries
- keep additive compatibility with the existing `ScimLikeDirectoryRecord` family
- surface provider health and drift/degradation state in governance/internal summaries

### 3. Production vault integration boundary
Strengthen the vault runtime boundary from typed semantics into production-oriented provider integration readiness.

Examples:
- `VaultProviderType`
- `VaultProviderConfig`
- `VaultMaterializationRequest`
- `VaultMaterializationResult`
- `VaultLeaseRenewalResult`
- `VaultCredentialHealthCheckResult`
- `VaultProviderHealth`

Requirements:
- materialize connector credential state through the vault boundary
- preserve current lifecycle states: healthy, expiring, expired, revoked, rotation-required, misconfigured
- keep route gating tied to credential/vault state
- make lease/material/health outcomes durable and auditable

### 4. Provider-aware route eligibility and degradation
Connector routes must now evaluate:
- rollout stage
- cutover readiness
- enterprise provider auth state
- SCIM freshness and health
- vault credential health and materialization result

Requirements:
- use specific block/degrade reasons before generic cutover reasons
- keep governance and receipt summaries readable
- do not silently route through degraded enterprise state without leaving trace

### 5. Durable provider provenance in receipts / governance
Receipts and governance records should carry enough provider information to explain:
- which enterprise IdP path was used
- which SCIM provider status applied
- which vault provider or vault result influenced routing
- why a route was degraded, blocked, or allowed

This is not a broad UI redesign. It is a durable provenance pass.

### 6. Staged rollout support
M17 should use the M16 rollout/cutover model to keep provider rollout controlled.

Support concepts like:
- disabled
- staged
- canary
- partial tenant enablement
- fully enabled

This must remain typed and queryable.

## Out of scope

Do not do the following in M17:
- full enterprise SSO / SCIM / IdP vendor matrix rollout across every provider
- full enterprise secret-vault vendor matrix
- broad SaaS console redesign
- orchestrator rewrite
- broad storage/history rewrite
- full payment/settlement platform work
- free-form policy DSL
- broad end-user UI redesign

## Design principles

1. **Provider rollout is controlled, not all-at-once**
2. **Local-first safety remains in force**
3. **Specific provider/vault reasons beat generic fallback reasons**
4. **Every provider decision must be durable and auditable**
5. **Backward compatibility must remain intact**
6. **No provider outage may silently corrupt local truth**

## Suggested typed model areas

### Identity / auth provider area
Suggested concepts:
- provider type
- provider config
- session exchange request/result
- provider health
- auth provenance binding
- provider failure summary

### Directory sync provider area
Suggested concepts:
- provider config
- sync checkpoint
- freshness state
- lag summary
- provider health
- sync result / failure summary

### Vault provider area
Suggested concepts:
- provider config
- credential materialization result
- lease state
- renewal result
- health check result
- route block reason
- rotation / revocation result

### Rollout / cutover area
Suggested concepts:
- rollout stage
- tenant/workspace enablement summary
- cutover readiness summary
- fallback mode
- degrade mode

## Runtime requirements

### 1. Local permission precedence remains unchanged
Local permission checks must continue to execute before remote enterprise overlays.
Remote provider state must not erase local denial semantics.

### 2. Remote auth provenance must be durable
Allowed, denied, fallback, and degraded paths must record:
- provider identity
- provenance type
- session freshness where applicable
- failure or fallback summary

### 3. Vault failures must not silently pass
If vault materialization, lease, or health fails in a way that should block a route, the block must be typed, durable, and visible.

### 4. Directory freshness matters
If directory freshness is stale enough to affect trust or routing, that must surface as a typed state and not only a formatter string.

### 5. Provider rollout is stage-gated
A provider may be configured but not yet rollout-eligible for a given tenant/workspace/profile. Routing must respect that.

## Suggested reason-code families

Extend canonical reason codes with M17-specific families where useful, such as:
- `ROLE_ENTERPRISE_IDP_*`
- `ROLE_SCIM_PROVIDER_*`
- `ROLE_VAULT_PROVIDER_*`
- `ROLE_PROVIDER_ROLLOUT_*`
- `ROLE_PROVIDER_CUTOVER_*`
- `ROLE_CREDENTIAL_MATERIALIZATION_*`

Use specific typed reasons over generic fallback reasons whenever possible.

## Suggested milestone breakdown

### M17A - IdP / SCIM provider adapter rollout
Add typed provider adapter contracts and runtime/provider-health binding for enterprise identity and directory sync.

### M17B - Production vault integration boundary
Add production-oriented vault provider integration semantics, materialization, health, and route gating.

### M17C - Provider-aware routing / provenance durability
Strengthen routing, receipt, governance, and ledger behavior so provider identity, health, rollout stage, cutover state, and fallback/degrade state are durable and readable.

### M17D - Tests / docs / rollout coverage
Add provider-oriented coverage, compatibility checks, rollout-stage checks, and doc/status updates.

## Required test scenarios

Add or update tests for at least the following:

1. Local permission denial still wins even when remote IdP would allow.
2. Allowed remote auth path records provider provenance and session context durably.
3. Vault lease expired or materialization failed blocks route with specific typed reason.
4. Directory freshness stale enough to matter produces typed degradation/block state.
5. Provider rollout stage disabled/canary/full changes route eligibility correctly.
6. Mixed old/new history remains decodable and renderable.
7. Process death / restore preserves enterprise provider, SCIM, and vault provenance continuity.
8. Governance summaries show provider health / auth provenance / credential lifecycle clearly.

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

M17 is done when:
1. Enterprise IdP and SCIM provider adapter semantics are typed and integrated into runtime decisions.
2. Vault provider integration semantics are typed and influence real route gating/degradation.
3. Rollout stage and cutover readiness materially affect provider eligibility.
4. Receipts and governance records show enterprise/SCIM/vault provenance and health summaries clearly.
5. Local-first safety and backward compatibility remain intact.
6. Tests cover provider auth, SCIM freshness, vault blocking, rollout gating, restore continuity, and formatter visibility.
7. Docs/status are updated with exact scope and deferred items.

## Deferred after M17

Expected next milestone after M17:
- `M18 - Broader SaaS-grade Operator Console and Enterprise Ops UX`
- later: deeper production provider matrix rollout and full enterprise integration programs

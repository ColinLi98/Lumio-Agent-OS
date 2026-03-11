# M24 - Enterprise Policy Governance Programs, Pack Lifecycle Operations, and Cross-Tenant Rollout Controls

## Status
Proposed next milestone after M23.

## Why M24 now

The system now has:
- workflow templates and workflow runs
- workflow policies, SLA timers, escalation timers, and automation guardrails
- policy packs with tenant and workspace overrides
- simulation, throttle, cooldown, suppression, and deterministic precedence resolution
- rollout safety, approval governance, freeze, pause, resume, and rollback semantics
- promotion requests, rollout analytics, readiness evaluation, blockers, and approval operations
- durable receipts, proof-ledger history, governance analytics, operator console, and enterprise identity/provider/vault semantics

The next missing layer is no longer single-policy promotion.
The next missing layer is **program-level governance and pack lifecycle operations across multiple tenants/workspaces**.

The product now needs a coherent way to answer:
- Which policy packs are active, deprecated, staged, or retired across the estate?
- Which tenants/workspaces are pinned, exempted, drifted, or partially rolled out?
- How are multiple promotion waves coordinated across a governance program?
- Which pack version is the strategic baseline versus local override deviation?
- Which rollouts are blocked because of cross-tenant issues, not just single-target readiness?
- Which pack lifecycle events need durable governance review, pause, or retirement?

M24 converts the current policy system from a capable per-target rollout engine into a more complete **enterprise policy governance program system**.

## Goal

Add typed, durable support for:
- policy governance programs
- pack lifecycle operations
- cross-tenant rollout controls
- estate-wide drift, exemption, and rollout coordination
- pack adoption, deprecation, retirement, and replacement workflows

This is a governance program milestone, not a BPM/DSL milestone and not a broad console redesign.

## Core outcome

After M24, an operator should be able to:
1. view a policy governance program that spans many tenants/workspaces
2. understand which packs/versions are strategic defaults, candidates, deprecated, or retired
3. identify rollout drift, exemptions, and pinned deviations across tenants/workspaces
4. coordinate staged rollout controls across multiple scopes
5. pause, hold, exempt, retire, or replace packs through typed and auditable operations
6. understand the lifecycle history of a pack and the rollout state of its estate-wide adoption

## In scope

### 1. Typed governance program models
Add or strengthen typed concepts such as:
- `PolicyGovernanceProgram`
- `PolicyGovernanceProgramStatus`
- `PolicyGovernanceProgramScope`
- `PolicyProgramMemberTarget`
- `PolicyProgramWave`
- `PolicyProgramWaveStatus`
- `PolicyProgramRecommendation`
- `PolicyProgramBlocker`
- `PolicyProgramAuditRecord`

Exact names may vary, but the concepts must be explicit and durable.

### 2. Pack lifecycle models
Add or strengthen typed pack lifecycle concepts such as:
- `WorkflowPolicyPackLifecycleStatus`
- `WorkflowPolicyPackLifecycleEvent`
- `WorkflowPolicyPackReplacementPlan`
- `WorkflowPolicyPackRetirementSummary`
- `WorkflowPolicyPackDeprecationNotice`
- `WorkflowPolicyPackAdoptionSummary`
- `WorkflowPolicyPackDriftSummary`

Lifecycle statuses should support at least the semantic equivalent of:
- draft
- proposed
- approved
- active
- staged
- deprecated
- retiring
- retired
- superseded
- blocked

### 3. Cross-tenant rollout control models
Add or strengthen typed concepts such as:
- `CrossTenantRolloutPolicy`
- `CrossTenantRolloutStatus`
- `TenantRolloutException`
- `WorkspaceRolloutException`
- `RolloutDriftReason`
- `RolloutPinningSummary`
- `RolloutAdoptionBucket`
- `CrossTenantReadinessSummary`
- `CrossTenantPromotionImpactSummary`

At minimum, the model must allow the system to represent:
- pinned tenants/workspaces
- exempted tenants/workspaces
- drifted tenants/workspaces
- partially rolled-out estates
- blocked estates due to unhealthy subsets

### 4. Runtime governance operations
Introduce real runtime handling for actions such as:
- create governance program
- attach pack to governance program
- stage rollout wave
- pause cross-tenant wave
- exempt tenant/workspace
- remove exemption
- pin tenant/workspace to a version
- unpin tenant/workspace
- mark pack deprecated
- begin pack retirement
- replace pack with successor plan

These actions must:
- be typed and auditable
- preserve current precedence and local-first safety behavior
- not rewrite past receipt or ledger meaning
- update governance/operator surfaces coherently

### 5. Governance/operator visibility
Governance/operator surfaces should show, where applicable:
- governance program name and status
- active pack/version and lifecycle state
- target scope and wave state
- adoption coverage
- exempted/pinned/drifted counts
- readiness/blockers/recommendations
- retirement/replacement status
- latest governance action

### 6. Cross-tenant analytics and drift visibility
Add or strengthen aggregate visibility for:
- adoption by pack version
- drift count by tenant/workspace
- exemption count by reason
- pinning count by reason
- blocked wave count
- deprecated pack still-in-use count
- retirement readiness summary

### 7. Local-first and compatibility
Continue to preserve:
- additive, optional/default field compatibility
- local-first fallback
- durable historical meaning
- mixed old/new history decode and render behavior

## Out of scope

Do **not** do the following in M24:
- general-purpose BPM or workflow DSL
- destructive automation
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- enterprise policy language redesign
- full remote SaaS rollout platform
- end-user-facing redesign
- full tenant billing/compliance program management

## Product and systems principles

1. **Program governance is evidence-backed**
   Estate-wide rollout should not be a blind bulk action. It must be grounded in adoption, drift, simulation, and blocker evidence.

2. **Pack lifecycle is a first-class durable concept**
   Deprecation, retirement, replacement, and supersession must be represented explicitly.

3. **Cross-tenant controls do not erase local truth**
   Estate-level governance can coordinate rollout, but it must not silently overwrite local explicit safety or historical truth.

4. **Drift and exceptions are visible, not hidden**
   Exemptions, pinning, and drift must be visible in governance surfaces and aggregates.

5. **Historical meaning remains stable**
   Deprecating or replacing a pack must not rewrite the semantics of past receipts or governance history.

## Suggested milestone breakdown

### M24A - Typed governance program and pack lifecycle models
Implement the core typed concepts for governance programs, waves, lifecycle state, drift, and exceptions.

**Done when**
- governance program and pack lifecycle records are typed and durable
- compatible optional/default fields are added where needed
- docs/spec/status are aligned

### M24B - Cross-tenant rollout analytics and control state
Implement cross-tenant readiness, adoption, drift, exemption, pinning, and blocker summaries.

**Done when**
- the system can summarize estate-wide rollout state for a pack/program
- drift and exception summaries are durable and queryable
- blocked wave / retirement readiness / replacement readiness are representable

### M24C - Runtime governance actions
Implement runtime actions for stage/pause/exempt/pin/unpin/deprecate/retire/replace where allowed.

**Done when**
- governance actions are typed, auditable, and reflected in governance state
- invalid or unsafe transitions are denied with durable reasons
- local-first and precedence semantics remain intact

### M24D - Governance/operator surfacing, tests, docs
Surface governance program state, pack lifecycle, drift, and cross-tenant controls in governance/operator views and complete test coverage.

**Done when**
- operator surfaces expose program state, lifecycle, drift, exceptions, and recommendations readably
- tests cover serialization, drift logic, lifecycle operations, denial paths, visibility, and restore continuity
- docs/status include an explicit M24 coverage map

## Required typed surfaces

### Governance program surface
A governance program should be able to show:
- program status
- source pack / version
- target scope
- wave status
- recommendation
- blockers
- adoption summary
- drift / exception counts

### Pack lifecycle surface
A pack should be able to show:
- lifecycle state
- replacement plan / successor pack
- deprecation notice
- retirement readiness
- still-in-use count
- blocked retirement reasons

### Cross-tenant control surface
A control surface should be able to show:
- pinned tenants/workspaces
- exemptions and reasons
- drifted targets and reasons
- blocked wave segments
- advance/hold/pause recommendations

## Runtime behavior requirements

### Governance actions
The system should support durable behavior for:
- governance program creation
- pack attach/detach
- wave stage and pause
- exemption add/remove
- pin/unpin target
- deprecate pack
- start retirement
- attach replacement plan

### Recommendations (bounded)
This milestone may add a bounded recommendation layer for:
- advance when estate readiness is acceptable
- hold when drift or blockers are too high
- exempt when target-local blockers are isolated
- deprecate when successor is ready
- retire when active usage is below threshold and blockers are clear

Recommendations must remain reviewable and durable.
They must not silently enforce changes in this pass.

### Blockers and denials
If a transition is denied, it must be denied with typed blockers and readable reason output.
Examples:
- too many drifted tenants
- critical blocked wave count too high
- successor pack not approved
- active exemptions incompatible with retirement
- approval required
- freeze active

## Suggested reason-code families

Introduce or strengthen structured families such as:
- `ROLE_POLICY_PROGRAM_CREATED`
- `ROLE_POLICY_PROGRAM_WAVE_ADVANCED`
- `ROLE_POLICY_PROGRAM_WAVE_PAUSED`
- `ROLE_POLICY_PACK_DEPRECATED`
- `ROLE_POLICY_PACK_RETIREMENT_STARTED`
- `ROLE_POLICY_PACK_REPLACEMENT_ATTACHED`
- `ROLE_POLICY_TARGET_EXEMPTED`
- `ROLE_POLICY_TARGET_UNEXEMPTED`
- `ROLE_POLICY_TARGET_PINNED`
- `ROLE_POLICY_TARGET_UNPINNED`
- `ROLE_POLICY_DRIFT_DETECTED`
- `ROLE_POLICY_RETIREMENT_BLOCKED`
- `ROLE_POLICY_CROSS_TENANT_ROLLOUT_HELD`

Do not rely on ad-hoc strings only.

## Required tests

Add or update tests for at least these cases:

1. governance program and pack lifecycle contracts round-trip compatibly
2. estate-wide rollout summary can count adoption, drift, exemptions, and pinning correctly
3. invalid retirement or replacement transitions are denied durably
4. pin/exempt/unpin/remove-exemption actions update durable state and visibility correctly
5. recommendation logic produces stable outputs from durable evidence
6. local explicit constraints and local-first semantics are preserved under cross-tenant controls
7. process death / restore continuity preserves governance program, lifecycle, and cross-tenant state
8. old/new history compatibility remains intact

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

M24 is done when:
1. governance program, pack lifecycle, and cross-tenant rollout records are typed and durable
2. cross-tenant readiness, drift, pinning, and exemption summaries are queryable
3. governance actions are real runtime behavior and auditable
4. pack lifecycle states and replacement/retirement semantics are visible in governance/operator surfaces
5. local-first and historical truth semantics remain intact
6. tests cover serialization, analytics, runtime actions, denial paths, visibility, and restore continuity
7. docs/status are updated with exact deferred items

## Deliverables expected from Codex

At the end of the run, report:
- changed files
- typed model additions or strengthened concepts
- runtime governance/lifecycle/cross-tenant behaviors added
- persistence/compatibility changes
- tests added or updated
- exact deferred items
- blockers, if any

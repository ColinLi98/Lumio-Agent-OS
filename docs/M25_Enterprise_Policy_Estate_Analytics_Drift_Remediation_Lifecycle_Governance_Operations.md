# M25 - Enterprise Policy Estate Analytics, Drift Remediation, and Lifecycle Governance Operations

## Status
Proposed next milestone after M24.

## Why this milestone now

M20 through M24 established the core enterprise policy governance stack:
- workflow policies, SLA timers, escalation timers, and automation guardrails
- policy packs and tenant/workspace overrides
- rollout safety, simulation, approval governance, and rollout promotion
- cross-tenant governance programs, lifecycle states, exemptions, pinning, and replacement plans

The next missing layer is estate-wide governance visibility and remediation.

The system can already represent:
- which pack is active
- which tenants or workspaces are pinned or exempted
- which policies are deprecated, retiring, or retired
- which rollouts are paused, simulated, or approved

What it still cannot do well enough is answer estate-scale governance questions such as:
- Which tenants are still behind the target pack version?
- Which workspaces are drifting from the intended lifecycle state?
- Where are overrides masking rollout intent?
- Which pinned or exempted scopes now present retirement blockers?
- Which packs are safe to retire, and which are still transitively depended on?
- Which remediation operations should happen first, and which are blocked by policy, simulation, or lifecycle constraints?

M25 should convert the current pack/lifecycle/governance machinery into an estate-level policy operations layer.

## Goal

Add durable estate analytics, drift detection, remediation planning, and lifecycle governance operations for workflow policy packs across tenants and workspaces.

This milestone should make it possible to:
- compute estate-wide pack adoption and drift
- identify blockers to retirement / replacement / rollout convergence
- recommend and execute safe governance remediation actions
- persist and audit those remediation actions
- expose estate-level lifecycle health in governance/operator surfaces

## Product outcome

After M25, internal governance users should be able to answer:
- which packs are healthy, drifting, blocked, deprecated, retiring, retired, or superseded
- which tenants/workspaces are out of policy intent and why
- which scopes are pinned or exempted and now causing lifecycle blockers
- which remediation action is recommended next
- which lifecycle transitions are still blocked by unresolved drift or exceptions

This is an internal governance and operator milestone. It is not a broad end-user UX milestone.

## In scope

### 1. Estate analytics and drift detection
Add or strengthen typed concepts for estate-wide policy state, such as:
- `PolicyEstateSnapshot`
- `PolicyEstateAnalyticsSummary`
- `PolicyEstateFilter`
- `PolicyEstateScopeRecord`
- `PolicyEstateDriftRecord`
- `PolicyEstateDriftBucket`
- `PolicyEstateDriftSeverity`
- `PolicyEstateLifecycleHealthSummary`
- `PolicyEstateAdoptionSummary`
- `PolicyEstateBlockerSummary`

Exact names may vary, but the concepts must be typed and queryable.

### 2. Drift and lifecycle reasoning
Support typed detection for at least these classes of drift or lifecycle mismatch:
- pack version behind target
- pack lifecycle mismatch (active vs deprecated/retiring/retired)
- workspace or tenant pinning blocking rollout progression
- exemption drift
- replacement-plan mismatch
- simulation-only divergence
- override divergence from intended pack state
- lifecycle blocker caused by unresolved prior rollout or policy freeze

### 3. Remediation planning and recommendations
Add or strengthen typed remediation concepts, such as:
- `PolicyEstateRemediationSuggestion`
- `PolicyEstateRemediationPlan`
- `PolicyEstateRemediationAction`
- `PolicyEstateRemediationResult`
- `PolicyEstateRecommendationReason`

At minimum, safe remediation should support operations such as:
- recommend unpin
- recommend remove exemption
- recommend attach replacement plan
- recommend move to target pack version
- recommend retire blocked pack later due to blockers
- recommend hold rollout due to unresolved drift

### 4. Lifecycle governance operations
Add additive runtime operations over existing lifecycle foundations for estate-wide governance, such as:
- attach remediation plan
- mark blocker acknowledged
- mark remediation scheduled
- apply safe remediation action where allowed
- record lifecycle operation result
- bulk-safe governance operations where the action is non-destructive and within current constraints

This milestone should not introduce destructive or irreversible bulk operations.

### 5. Governance / operator visibility
Add or strengthen internal governance surfaces so they can show:
- estate adoption summary
- drift buckets
- lifecycle blockers
- remediation recommendations
- replacement / retirement readiness
- safe remediation action availability

The operator should be able to filter by:
- pack id / pack version
- lifecycle state
- tenant / workspace
- pinning / exemption state
- drift severity
- remediation status
- replacement readiness

## Out of scope

Do not do the following in M25:
- do not build a general BPM or workflow DSL
- do not rewrite the orchestrator
- do not redesign the full operator console
- do not rewrite storage/history architecture broadly
- do not add destructive bulk remediation operations
- do not introduce a full remote SaaS rollout platform
- do not replace the existing truth model with a new estate-only model

## Design principles

1. **Estate analytics must derive from durable truth**
   Use existing durable pack, rollout, lifecycle, override, and governance records as the basis.

2. **Recommendations must remain explainable**
   Every drift record or remediation suggestion should be traceable to durable reasons.

3. **Non-destructive by default**
   Safe remediation actions should be additive, reversible where practical, and auditable.

4. **Lifecycle intent beats cosmetic state**
   M25 should reason over actual pack state, rollout state, pins, exemptions, and overrides - not merely UI labels.

5. **Backward-compatible and additive**
   Existing records, summaries, and runtime behavior must continue to function with optional/default fields.

## Runtime behavior requirements

### A. Estate snapshot computation
The system should be able to compute an estate snapshot from durable records, including:
- current pack lifecycle state
- pack replacement targets
- tenant/workspace bindings
- current overrides
- pin / exemption status
- rollout state
- simulation vs enforcement state where relevant

### B. Drift classification
Drift must be classified using typed reasons and severities.
Examples:
- `PACK_VERSION_BEHIND_TARGET`
- `PACK_RETIRING_BUT_STILL_PINNED`
- `TENANT_EXEMPTION_BLOCKS_RETIREMENT`
- `WORKSPACE_OVERRIDE_DIVERGES_FROM_INTENDED_PACK`
- `SIMULATION_ONLY_SCOPE_NOT_PROMOTED`
- `REPLACEMENT_PLAN_MISSING`

### C. Remediation suggestion generation
The system should generate typed remediation suggestions from estate drift state.
Examples:
- unpin workspace X
- remove exemption for tenant Y
- attach replacement plan to pack Z
- promote tenant cohort A to target version B
- hold retirement because unresolved blockers remain

### D. Safe remediation application
Where safe and already supported by current governance actions, the system may apply remediation in runtime.
Examples:
- mark acknowledged
- schedule remediation
- apply safe unpin
- apply safe exemption removal

All such actions must enter durable governance and ledger trails.

### E. Lifecycle health summary
A pack or governance program should be able to summarize:
- adoption progress
- drift count
- blocker count
- pinned scope count
- exemption count
- replacement readiness
- retirement readiness

## Suggested milestone breakdown

### M25A - Estate analytics and drift model
Implement or strengthen typed estate snapshot, drift, severity, and blocker concepts.

**Done when**
- estate snapshot and drift can be computed from durable records
- drift classes are typed and queryable
- lifecycle health summaries exist

### M25B - Remediation recommendations and operations
Implement typed remediation suggestions, plans, and safe operations.

**Done when**
- remediation suggestions are generated and visible
- safe remediation actions are durable and auditable
- recommendations remain explainable

### M25C - Governance surface integration
Expose estate summaries, drift buckets, and remediation suggestions in internal governance surfaces.

**Done when**
- operators can filter and inspect drift/remediation state without raw record spelunking
- pack lifecycle and replacement readiness are visible

### M25D - Tests, continuity, docs, and validation
Add/update tests, continuity coverage, docs, and validation.

**Done when**
- tests cover estate analytics, remediation, lifecycle blockers, and continuity
- docs/status are updated with exact M25 scope and deferred items

## Suggested typed fields / concepts

### Estate snapshot / summary
Potential fields include:
- `packId`
- `packVersion`
- `lifecycleStatus`
- `replacementPlanId`
- `activeBindings`
- `pinnedScopeCount`
- `exemptionCount`
- `driftCount`
- `blockerCount`
- `retirementReadiness`
- `replacementReadiness`
- `lastAnalyticsAt`

### Drift record
Potential fields include:
- `scopeType`
- `scopeId`
- `packId`
- `packVersion`
- `driftType`
- `driftSeverity`
- `reasonCodes`
- `replacementPlanId`
- `recommendedAction`
- `blockerSummary`

### Remediation suggestion
Potential fields include:
- `suggestionId`
- `packId`
- `scopeType`
- `scopeId`
- `actionType`
- `actionReasonCodes`
- `safeToApply`
- `requiresApproval`
- `status`
- `scheduledAt`
- `appliedAt`

## Visibility requirements

Governance/operator surfaces should make the following readable:
- active pack and lifecycle state
- drift severity and type
- pinned/exempted scopes causing blockers
- replacement or retirement readiness
- recommended remediation action
- whether an action is safe, blocked, scheduled, or already applied

Readable examples:
- `Workspace pinned to pack v3 while target rollout is v5`
- `Tenant exemption blocks pack retirement`
- `Replacement plan missing for retiring pack`
- `Safe remediation available: remove exemption`
- `Retirement blocked by 14 unresolved scopes`

## Persistence and continuity

M25 additions must:
- remain additive and backward-compatible
- survive process death / restore where relevant
- not reinterpret historical pack lifecycle truth after later changes
- preserve durable remediation trails and blocker summaries

## Suggested canonical reason-code direction

Add structured M25 reason-code families as needed, for example:
- `ROLE_POLICY_ESTATE_DRIFT_DETECTED`
- `ROLE_POLICY_ESTATE_BLOCKER_DETECTED`
- `ROLE_POLICY_ESTATE_REMEDIATION_SUGGESTED`
- `ROLE_POLICY_ESTATE_REMEDIATION_APPLIED`
- `ROLE_POLICY_ESTATE_REPLACEMENT_REQUIRED`
- `ROLE_POLICY_ESTATE_RETIREMENT_BLOCKED`

Exact names may vary, but they must be structured and durable.

## Required tests

Add or update tests for at least:
- estate snapshot and drift classification round-trip / compatibility
- remediation suggestion durability and explainability
- replacement / retirement blocker detection
- safe remediation application persistence and audit trail
- pinned / exemption / override drift cases
- restore continuity for estate analytics/remediation records
- formatter readability for drift, blockers, and remediation lines

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

M25 is done when:
1. estate snapshots and drift classes are durable, typed, and queryable
2. lifecycle health and blocker summaries are visible in governance surfaces
3. remediation suggestions are generated, readable, and durable
4. safe remediation operations are auditable and persist correctly
5. replacement and retirement readiness can be evaluated from durable truth
6. restore/process-death continuity preserves M25 analytics and remediation records
7. tests and docs/status are updated and passing

## Deferred items

Remain deferred after M25:
- general BPM / workflow DSL
- destructive bulk remediation
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite

## What comes after M25

The next likely step after M25 is:
- **M26 - Enterprise Policy Estate Automation, Scheduled Remediation, and Governance Program Operations**

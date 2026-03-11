# M21 - Enterprise Workflow Policy Packs, Tenant Overrides, and Advanced Automation Controls

## Why this milestone now

M0-M20 established the core Agent OS stack from runtime semantics through operator workflows:
- role-aware execution
- proof ledger and receiptization
- governance analytics
- durable settlement, dispute, and reconciliation states
- operator console, collaboration, and safe automation
- enterprise workflow policies, SLA timers, and automation guardrails

The next constraint is no longer whether workflow policy exists.
The next constraint is whether workflow policy can be operated at enterprise scale without turning into a hand-maintained matrix of one-off settings.

At this point the system needs:
- reusable policy packs
- explicit tenant/workspace overrides
- clear override precedence
- advanced but bounded automation controls
- simulation and auditability for policy changes

M21 turns workflow policy from "configured in place" into "packaged, overrideable, and safely governable across tenants/workspaces".

## Goal

Add an enterprise-grade policy-pack and override layer for workflow policies, plus stronger automation controls, without introducing a general-purpose BPM/DSL or breaking the existing execution truth model.

## Product outcome

After M21, the system should support:
- reusable workflow policy packs
- tenant/workspace-specific overrides
- explicit, inspectable override precedence
- bounded advanced automation controls such as throttles, cooldowns, windows, caps, and suppression rules
- readable policy provenance in receipts/governance/operator surfaces
- safer rollout of policy changes via simulation or dry-run style checks

## In scope

### 1. Typed workflow policy pack concepts
Add or strengthen additive typed concepts such as:
- `WorkflowPolicyPack`
- `WorkflowPolicyPackVersion`
- `WorkflowPolicyPackBinding`
- `WorkflowPolicyPackScope`
- `WorkflowPolicyPackActivationState`
- `WorkflowPolicyPackSummary`

Exact names may vary, but the concept must be explicit and durable.

### 2. Typed tenant/workspace override concepts
Add or strengthen additive typed concepts such as:
- `TenantWorkflowPolicyOverride`
- `WorkspaceWorkflowPolicyOverride`
- `OverrideSource`
- `OverrideReason`
- `OverrideApprovalState`
- `OverrideDiffSummary`

Overrides must stay bounded and typed. This is not a free-form rules language.

### 3. Explicit override precedence
The system must make it clear which policy layer won and why.
Recommended precedence for workflow policy resolution in this milestone:
1. explicit current case/task constraints
2. emergency/manual operator hold or explicit action-level override
3. workspace override
4. tenant override
5. bound workflow policy pack
6. role-aware defaults / system defaults
7. inference / heuristic suggestions

The exact final order can be adjusted to fit the existing system, but it must be explicit, durable, and testable.

### 4. Advanced automation controls
Add bounded typed controls such as:
- throttle windows
- cooldown periods
- max automation attempts
- max escalations per window
- quiet hours / maintenance windows
- tenant-level suppressions
- workspace-level suppressions
- connector/provider-specific automation eligibility
- dry-run or simulation mode for new policy-pack rollout

This is not a general-purpose workflow language. Keep it bounded.

### 5. Policy provenance and visibility
Governance/receipt/operator surfaces should be able to show:
- which policy pack is active
- which version is active
- whether a tenant/workspace override changed the outcome
- whether automation was allowed, blocked, throttled, suppressed, or simulated
- why a stage transition or automation step did or did not run

### 6. Safe rollout and simulation support
Add a bounded policy simulation or dry-run capability that can answer questions like:
- would this new policy pack have blocked the current action?
- would this override have changed escalation timing?
- would automation have been suppressed?

Simulation does not need to become a full historical replay engine in this pass. It needs to be good enough to validate pack/override changes before activation.

### 7. Auditability and durability
All pack bindings, override changes, activation changes, and simulation results should produce durable audit records where appropriate.

## Out of scope

Do not do the following in M21:
- do not introduce a general BPM/workflow DSL
- do not add destructive automation
- do not rewrite the orchestrator
- do not do a broad console redesign
- do not replace the current truth model with policy-pack state
- do not introduce unbounded custom role creation
- do not do a broad storage/history rewrite beyond additive support

## Design principles

1. **Bounded, typed, and auditable**
   Policy packs and overrides must remain structured and reviewable.

2. **Truth model stays authoritative**
   Workflow policy influences execution, but does not replace receipt/ledger truth.

3. **Override clarity is mandatory**
   The system must make it obvious why a policy decision came from workspace/tenant/pack/default.

4. **Advanced automation controls must be safe-by-default**
   Start conservative. Prefer throttling, suppression, and simulation over aggressive execution.

5. **Backward-compatible and additive**
   Existing workflow policy behavior should continue to work without a big-bang migration.

## Suggested typed model areas

### Policy packs
Recommended fields include:
- `policyPackId`
- `policyPackVersionId`
- `scope`
- `activationState`
- `workflowTemplateIds`
- `policySummary`
- `createdAt`
- `updatedAt`

### Overrides
Recommended fields include:
- `overrideId`
- `scopeType` (tenant/workspace)
- `scopeId`
- `policyArea`
- `overridePayloadSummary`
- `overrideSource`
- `approvalState`
- `effectiveFrom`
- `effectiveUntil`
- `createdAt`
- `updatedAt`

### Advanced automation controls
Recommended fields include:
- `maxAttempts`
- `cooldownMs`
- `windowStart` / `windowEnd`
- `quietHoursPolicy`
- `maintenanceWindowPolicy`
- `suppressionReason`
- `throttleState`
- `simulationOnly`

## Canonical reason-code direction

Add or strengthen canonical structured reason-code families where needed, for example:
- `ROLE_WORKFLOW_POLICY_PACK_APPLIED`
- `ROLE_WORKFLOW_TENANT_OVERRIDE_APPLIED`
- `ROLE_WORKFLOW_WORKSPACE_OVERRIDE_APPLIED`
- `ROLE_WORKFLOW_OVERRIDE_DENIED`
- `ROLE_AUTOMATION_THROTTLED`
- `ROLE_AUTOMATION_SUPPRESSED`
- `ROLE_AUTOMATION_SIMULATION_ONLY`
- `ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT`
- `ROLE_WORKFLOW_POLICY_PRECEDENCE_OPERATOR_OVERRIDE`

Exact names may vary, but the coverage must be structured and queryable.

## Runtime behavior requirements

### Policy resolution
Runtime workflow decisions must evaluate policy-pack binding, tenant/workspace overrides, and advanced automation controls in a deterministic way.

### Automation guardrails
Automation should be able to be:
- allowed
- blocked
- suppressed
- throttled
- simulation-only

These states must be durable and visible.

### Timeline / case detail visibility
Operator surfaces should show:
- active policy pack/version
- current override influence
- automation guardrail state
- next suggested human action when automation is blocked/suppressed

### Persistence / restore continuity
Policy pack bindings, overrides, and advanced automation states must survive restore/process death consistently with the existing durable workflow artifacts.

## Suggested milestone breakdown

### M21A - Policy packs and bindings
- Add typed policy-pack concepts
- Add activation/binding support
- Keep existing workflow policy compatible

### M21B - Tenant/workspace overrides
- Add typed override concepts
- Make override precedence durable and testable
- Add readable provenance summaries

### M21C - Advanced automation controls
- Add throttle/cooldown/window/suppression/simulation concepts
- Make automation decisions durable and readable

### M21D - Simulation, tests, docs, status
- Add bounded simulation/dry-run behavior
- Add tests for precedence/override/suppression/throttle/simulation
- Update docs and status mappings

## Required tests

Add or update tests for at least:
1. policy-pack binding and version compatibility
2. tenant override changes outcome vs pack/default
3. workspace override changes outcome vs tenant pack/default
4. explicit current-case/task constraint still wins over policy-pack/override
5. automation throttled state is durable and visible
6. automation suppressed state is durable and visible
7. simulation-only mode does not execute but produces readable/auditable outcome
8. restore/process-death continuity for pack/override/automation states
9. formatter visibility for pack/override/automation provenance

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

M21 is done when:
1. workflow policy packs are typed, bindable, and versioned
2. tenant/workspace overrides are typed, durable, and precedence-aware
3. advanced automation controls (throttle/suppression/cooldown/window/simulation) are real runtime behavior
4. receipts/governance/operator surfaces show policy-pack/override/automation provenance clearly
5. restore/process-death continuity covers M21 artifacts
6. tests cover pack/override precedence, automation controls, simulation, and visibility
7. docs/status are updated with exact M21 coverage and deferred items

## Deliverables expected from Codex

At the end of the run, report:
- changed files
- typed pack/override/automation additions
- runtime policy resolution changes
- persistence/compatibility changes
- tests added/updated
- deferred items that remain intentionally out of scope
- blockers if any

# M22 - Enterprise Policy Rollout Safety, Simulation, and Approval Governance

## Why M22 is next

M21 completed the policy-pack and override layer:
- policy packs are typed and versioned
- tenant/workspace overrides are durable and filterable
- simulation/throttle/cooldown/suppression are real runtime behavior
- provenance, precedence, and visibility are already part of receipts, governance summaries, and restore continuity

The next gap is not more policy expressiveness.
The next gap is **policy rollout governance**.

At this point, the system can represent and execute policy packs, but it still needs stronger controls for:
- staged rollout
- simulation-before-enforcement
- approval requirements for risky policy changes
- rollout freeze and rollback semantics
- tenant/workspace blast-radius control
- durable auditability of who approved, simulated, promoted, paused, or rolled back a policy rollout

M22 turns policy packs from "config that can run" into "governed changes that can be safely introduced into production environments."

---

## Goal

Introduce typed rollout-safety, simulation, and approval-governance infrastructure for workflow policy packs and overrides.

The system should support:
- staged policy rollout
- simulation-only rollout states
- approval-gated promotion of policy changes
- freeze / pause / rollback of rollout state
- scoped rollout by tenant/workspace/provider surface where applicable
- durable audit trail for rollout decisions and actions

This is not a BPM/DSL milestone. It is a governance and safety milestone.

---

## Core product outcome

After M22, the system should be able to answer, for any policy-pack or override rollout:
- what version is active vs simulated vs pending
- where the rollout applies
- whether the rollout is in simulation-only, canary, staged, paused, or enforced mode
- whether promotion requires approval and whether that approval was granted
- whether the rollout is frozen, blocked, or rolled back
- who performed the rollout action or approval
- what receipts/governance records prove that history

---

## In scope

### 1. Typed rollout governance models
Add or strengthen typed concepts such as:
- `PolicyRolloutStage`
- `PolicyRolloutMode`
- `PolicyRolloutScope`
- `PolicyRolloutTarget`
- `PolicyRolloutDecision`
- `PolicyRolloutApprovalRequirement`
- `PolicyRolloutApprovalRecord`
- `PolicyRolloutSimulationSummary`
- `PolicyRolloutFreezeState`
- `PolicyRolloutRollbackRecord`
- `PolicyRolloutAuditRecord`
- `PolicyRolloutRiskSummary`
- `PolicyRolloutGuardrailDecision`

Exact names may vary, but the semantics must be typed and durable.

### 2. Simulation-before-enforcement behavior
The system must support a typed distinction between:
- not active
- simulation-only
- canary / limited rollout
- staged rollout
- fully enforced
- paused / frozen
- rolled back

Simulation-only must remain real runtime behavior, not copy-only.
Simulation results should be inspectable in governance summaries and operator views.

### 3. Approval governance for risky policy rollout
Certain policy changes should require typed approval before promotion.
This can include:
- moving from simulation-only to enforced
- expanding rollout scope from workspace to tenant-wide
- relaxing automation guardrails
- changing SLA or escalation behavior in ways classified as risky
- enabling policies that materially alter external fulfillment, approval gating, or automation eligibility

Approval decisions must be durable and auditable.

### 4. Freeze / pause / rollback semantics
Operators must be able to:
- pause/freeze a rollout
- keep the last known safe state
- roll back to a previous pack/version/state
- see the reason for freeze or rollback in durable records

This does not mean destructive runtime rewrites.
It means typed rollout-state control and rollback governance.

### 5. Scope-aware rollout
Policy rollout should be explicitly scoped.
At minimum, support typed scope distinctions such as:
- global product scope if already modeled
- tenant-wide
- workspace-specific
- template-specific
- role/workflow-specific where already representable

Scope must be durable, queryable, and visible in summaries.

### 6. Governance / operator visibility
Governance and operator surfaces should be able to show:
- active policy pack and version
- rollout stage/mode
- simulation summary
- approval status
- freeze/rollback status
- target scope
- last rollout action
- last approver / actor summary where already modeled
- reason codes / readable English summary

### 7. Durable audit trail
Every material rollout action should leave a durable typed audit trail, such as:
- pack attached
- simulation started
- rollout promoted
- rollout paused
- rollout resumed
- rollout rolled back
- approval requested
- approval granted/denied
- scope expanded/reduced

Use durable records and existing proof-ledger/governance patterns rather than introducing a separate truth model.

---

## Out of scope

Do not do the following in M22:
- do not introduce a general-purpose BPM or workflow DSL
- do not add destructive automation
- do not rewrite the orchestrator
- do not redesign the operator console broadly
- do not rewrite storage/history architecture broadly
- do not build a full remote policy-control service if additive local-first semantics are sufficient for this pass
- do not replace explicit task constraint precedence

---

## Product and runtime principles

### 1. Simulation is first-class
Simulation-only must be durable, inspectable, and auditable.
It is not just a label.

### 2. Promotion can be risk-gated
The system should distinguish between safe rollout transitions and risky ones.
Risky transitions should be approval-aware.

### 3. Scope expansion is a meaningful governance event
Moving from workspace-level to tenant-level should be treated as a material rollout action, not a silent config update.

### 4. Freeze and rollback preserve trust
If a rollout is unsafe, operators must be able to pause it and revert cleanly without rewriting past history.

### 5. Existing precedence remains intact
Task explicit constraints continue to outrank pack/override defaults.
M22 governs pack rollout, not precedence inversion.

---

## Suggested milestone breakdown

### M22A - Typed rollout governance models
Implement the typed rollout, simulation, approval, freeze, and rollback concepts.
Keep everything additive and backward-compatible.

### M22B - Runtime rollout state handling
Wire rollout stage/mode/scope into real runtime policy resolution.
Simulation-only, paused, rolled-back, and enforced states must affect runtime behavior where appropriate.

### M22C - Approval governance and audit trail
Implement typed approval requirements and durable approval records for risky rollout transitions.
Add durable rollout audit records.

### M22D - Governance visibility, tests, docs
Expose rollout stage/mode/scope/approval/freeze/rollback state in governance summaries, receipts, and operator surfaces where relevant.
Add tests and update docs/status.

---

## Suggested typed state families

### Rollout stage / mode
Examples:
- `SIMULATION_ONLY`
- `CANARY`
- `STAGED`
- `ENFORCED`
- `PAUSED`
- `ROLLED_BACK`

### Approval requirement / result
Examples:
- `NOT_REQUIRED`
- `REQUIRED_PENDING`
- `APPROVED`
- `DENIED`

### Freeze / rollback
Examples:
- `NOT_FROZEN`
- `FROZEN_BY_OPERATOR`
- `FROZEN_BY_GUARDRAIL`
- `ROLLBACK_PENDING`
- `ROLLBACK_COMPLETE`

### Guardrail decisions
Examples:
- rollout allowed
- rollout blocked by risk
- rollout forced to simulation-only
- rollout blocked due to missing approval
- rollout blocked due to unresolved governance issue

The exact enums may vary, but the semantics must remain explicit and queryable.

---

## Suggested reason-code families

Add structured, canonical reason-code families for M22, for example:
- `ROLE_POLICY_ROLLOUT_SIMULATION_ONLY`
- `ROLE_POLICY_ROLLOUT_PROMOTED`
- `ROLE_POLICY_ROLLOUT_SCOPE_EXPANDED`
- `ROLE_POLICY_ROLLOUT_APPROVAL_REQUIRED`
- `ROLE_POLICY_ROLLOUT_APPROVED`
- `ROLE_POLICY_ROLLOUT_DENIED`
- `ROLE_POLICY_ROLLOUT_FROZEN`
- `ROLE_POLICY_ROLLOUT_GUARDRAIL_BLOCKED`
- `ROLE_POLICY_ROLLOUT_ROLLED_BACK`

These may coexist with M21 policy-pack reason families but must be typed enough for durable summaries and filtering.

---

## Required scenarios

Add or update tests for at least the following:

1. A policy pack enters simulation-only mode and remains non-enforced in runtime behavior.
2. Promotion from simulation-only to enforced requires approval for a risky change.
3. A policy rollout is paused/frozen and no longer advances to stronger enforcement.
4. A workspace-scoped rollout can be expanded to tenant scope only through a typed, auditable transition.
5. A rollback restores the last safe rollout state without rewriting past receipts.
6. Process death / restore keeps rollout stage, simulation provenance, approval state, and rollback state intact.
7. Governance summaries and searchable text include rollout stage/mode/scope/approval/freeze/rollback semantics.
8. Explicit task constraints still outrank a newly promoted pack or override.

---

## Testing expectations

Add or extend coverage for:
- typed rollout contract serialization / compatibility
- runtime handling of simulation-only / staged / enforced / paused / rolled-back states
- risky rollout approval gating
- durable approval and rollout audit trail records
- restore continuity for rollout/approval/freeze/rollback state
- formatter/governance visibility for M22 summaries
- backward compatibility with older records where rollout fields are absent

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

---

## Definition of done

M22 is done when:
1. policy rollout stage/mode/scope are typed, durable, and queryable
2. simulation-only, staged, enforced, paused, and rolled-back states affect runtime behavior where appropriate
3. risky rollout transitions can require approval and produce durable approval records
4. freeze/rollback behavior is durable and visible in governance summaries
5. receipts/governance/operator surfaces can show active rollout state and key explanations in readable English
6. restore continuity preserves rollout/approval/freeze/rollback state
7. tests cover rollout behavior, approval governance, rollback, visibility, and compatibility
8. docs/status are updated with exact scope and deferred items

---

## Deferred after M22

Still deferred after this milestone:
- general-purpose BPM/DSL
- destructive automation
- broad operator console redesign
- orchestrator rewrite
- broad storage/history rewrite

## Deliverables expected from Codex

At the end of the run, report:
- changed files
- typed rollout/approval/freeze/rollback model additions or usages
- runtime rollout governance changes
- persistence/compatibility changes
- tests added/updated
- exact deferred items
- blockers, if any

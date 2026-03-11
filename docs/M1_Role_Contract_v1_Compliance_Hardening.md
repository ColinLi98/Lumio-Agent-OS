# M1 - Role Contract v1 Compliance Hardening

## Purpose

This document defines the next implementation pass after the initial role-aware architecture milestone.

The goal of M1 is **not** to expand product scope. The goal is to make the current role-aware execution model fully compliant with `docs/Role_Contract_v1.md` in a tightly scoped, backward-compatible, production-safe way.

This is a hardening pass focused on:
- typed role provenance
- canonical role reason codes
- role traceability in activity and receipts
- continuity across restore and process death
- contamination guardrails
- required scenario coverage

## Context

The current implementation already established the core architectural milestone:
- role-aware execution is a real model/runtime capability, not only UI
- `activeRole` propagates through request and contract flows
- role already influences policy, approvals, routing, ranking, and data-sharing
- baseline tests and device validation are passing

The current gaps are now mostly about compliance, explainability, traceability, and lifecycle correctness.

## Scope of this pass

### In scope

1. Add missing typed role-contract concepts
2. Add backward-compatible role provenance fields where needed
3. Centralize role resolution into a single typed role execution context
4. Introduce canonical `ROLE_*` reason-code families
5. Attach role/source/impact traceability to activity, receipt, and history surfaces
6. Persist and restore role context through restore/resume/process death
7. Reduce cross-role contamination from inferred roles
8. Add missing scenario tests required by Role Contract v1 Section 14
9. Update docs and status with explicit compliance mapping

### Out of scope

- Custom role policy editor
- Broad UI redesign
- Additional built-in roles beyond what already exists
- Full proof-ledger backend redesign
- Full external-fulfillment redesign
- Orchestrator rewrite
- New market or fulfillment features

## Source of truth

Use these as the governing documents for this pass:
- `docs/Role_Contract_v1.md`
- current Role Contract v1 gap analysis
- existing role-aware implementation already landed in current branch

If the current implementation conflicts with `docs/Role_Contract_v1.md`, prefer the contract unless a compatibility reason is documented explicitly.

## Goals

By the end of M1, the system should be able to answer, for any relevant run:
- what the active role was
- where that role came from
- what role-based policy was active
- how role affected approvals, routing, ranking, and data scope
- whether role changed during the run
- whether role context survives restore/replay/resume

## Deliverables

### D1. Missing typed concepts

Add typed definitions for at least:
- `RoleSource`
- `RoleChangeReason`
- `RoleScopedDelegationPolicy`

These should be introduced in a backward-compatible manner.

Preferred semantics:

#### `RoleSource`
Contract-aligned values for this pass:
- `EXPLICIT_USER_SELECTION`
- `USER_PROFILE_DEFAULT`
- `TASK_INHERITED`
- `SAFE_SYSTEM_INFERENCE`
- `SYSTEM_FALLBACK`

Restored provenance is represented via `RoleChangeReason.SYSTEM_RECOVERY` while keeping `RoleSource` contract-aligned.

#### `RoleChangeReason`
Possible values may include:
- `USER_SWITCHED_ROLE`
- `TASK_RESCOPED`
- `RESUME_INHERITED_ROLE`
- `POLICY_REEVALUATION`
- `SYSTEM_RECOVERY`
- `ROLE_INVALIDATED`

#### `RoleScopedDelegationPolicy`
This should make role-aware delegation policy explicit rather than implied.
It may map delegation behavior such as:
- `MANUAL`
- `ASSISTED`
- `SUPERVISED`
- `AUTONOMOUS_WITHIN_POLICY`

If equivalent types already exist, adapt rather than duplicate.

### D2. Backward-compatible contract/state metadata

Ensure run-relevant models can carry role provenance and role impact data.

Where appropriate, add optional fields such as:
- `activeRole`
- `roleSource`
- `roleChangeReason`
- `roleImpactReasonCodes`
- `delegationMode`

Targets may include:
- request objects
- request constraints
- intent contracts
- response objects
- task/run tracking objects
- persisted dynamic state
- activity/receipt-facing models

The exact field placement may vary, but the information must be available end-to-end.

### D3. Centralized typed role execution context

Centralize role resolution into one typed concept used by all major role-sensitive decisions.

Suggested names:
- `ResolvedRoleContext`
- `RoleExecutionContext`

It should encapsulate at least:
- active role
- role source
- delegation mode
- applicable role policy
- applicable data-sharing policy
- role impact reasons
- sticky/non-sticky behavior if relevant

This context should be the common source for:
- policy evaluation
- approvals
- routing
- ranking
- data-sharing
- sync decisions where applicable

Avoid leaving role resolution fragmented across unrelated branches of orchestration logic.

### D4. Canonical role reason codes

Introduce canonical `ROLE_*` reason-code families.

At minimum, cover these families:
- `ROLE_SOURCE_*`
- `ROLE_POLICY_*`
- `ROLE_APPROVAL_*`
- `ROLE_ROUTING_*`
- `ROLE_RANKING_*`
- `ROLE_DATA_SCOPE_*`
- `ROLE_SYNC_*`
- `ROLE_CHANGE_*`

Examples:
- `ROLE_SOURCE_EXPLICIT_USER_SELECTION`
- `ROLE_POLICY_BUDGET_LIMIT_APPLIED`
- `ROLE_APPROVAL_REQUIRED_BY_ROLE_POLICY`
- `ROLE_ROUTING_PARALLEL_SPECIALISTS_PREFERRED`
- `ROLE_RANKING_PROVIDER_DEPRIORITIZED_BY_ROLE_POLICY`
- `ROLE_DATA_SCOPE_CLOUD_SYNC_BLOCKED`
- `ROLE_CHANGE_FUTURE_STEPS_REEVALUATED`

Implementation rule:
- keep legacy/ad-hoc strings only as detail or compatibility notes if needed
- canonical reason codes must become the primary structured form for new logic, telemetry, and UI explanation layers

### D5. Activity / receipt / history traceability

Attach role-aware traceability to user-visible execution history.

Each relevant activity or response-history item should be able to expose, at minimum:
- active role
- role source
- delegation mode
- key role impact reasons
- concise English explanation when role blocked or changed a decision

Examples of expected readable outputs:
- "Running as Work role"
- "Approval required by Work role spending policy"
- "Cloud sync blocked by Parent role data policy"
- "Provider ranking adjusted by Buyer role trust policy"

Do not limit role visibility to Preferences & Permissions only.
Role context should be visible where execution outcomes are reviewed.

### D6. Continuity and restore

Persist and restore role context for relevant task/run continuity scenarios.

At minimum, support continuity for:
- process death
- restore
- resume
- replay/history review where applicable

Persist at least:
- active role
- role source
- delegation mode if role-derived or user-set

Implementation rule:
- restored role provenance should remain distinguishable from freshly inferred role
- `RESTORED_STATE` or equivalent source should be available when appropriate

### D7. Cross-role contamination guardrails

Reduce incorrect carry-over of role context between unrelated runs.

Required guardrail:
- inferred role must be non-sticky by default unless explicitly promoted or inherited by a valid task chain

Preferred additional behavior:
- explicit role selection may persist according to existing product behavior
- inherited role may continue within the same task chain
- global last-role caches must not silently override unrelated future runs

If a global cache remains temporarily for compatibility, constrain and document it.

### D8. Mid-run role change semantics

M1 must make role change semantics explicit enough to be testable.

Required minimum behavior:
- role changes affect future decisions only
- past receipts/history must not be rewritten
- role change should emit a typed reason and canonical `ROLE_CHANGE_*` code where relevant
- steps that are role-sensitive and not yet committed may be reevaluated

If full mid-run orchestration reevaluation is not implemented, document the deferred boundary clearly, but emit enough structure to support it later.

## Test requirements

Add or extend scenario coverage for the following families from Role Contract v1 Section 14:

1. Role source tracking
   - explicit selection
   - inherited role
   - inferred role
   - restored state

2. Precedence
   - explicit task constraints override role defaults
   - role policy overrides weaker account defaults where intended

3. Denial overrides ranking
   - if role policy forbids or blocks, ranking must not bypass it

4. Role-aware data sharing
   - role policy narrows data scope correctly
   - Parent role cloud sync block is enforced and visible

5. Continuity
   - active role survives restore/process death where expected
   - role source survives restore/process death where expected

6. Mid-run role change reevaluation
   - future-step behavior changes appropriately
   - past history is not rewritten

7. Activity traceability
   - role/source/impact appear in response-history or equivalent execution surfaces

## Validation commands

Run at least the relevant subsets below and fix failures before finalizing:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest
```

If activity/receipt UI changes are touched, also run the relevant UI/instrumentation coverage already used in previous milestones.

## Implementation constraints

- Keep diffs tightly scoped
- Prefer additive and backward-compatible changes
- Preserve current passing behavior
- Do not rewrite the orchestrator broadly
- Do not do a naming-only pass
- Do not stop at internal plumbing; role/source/impact must be exposed in readable English where execution is reviewed
- Avoid broad refactors unrelated to Role Contract v1 compliance

## Suggested implementation order

1. Add typed concepts and contract fields
2. Introduce centralized role execution context
3. Normalize canonical role reason codes
4. Thread role/source/impact into activity and response-history surfaces
5. Persist and restore role context
6. Add contamination guardrails
7. Add scenario tests
8. Update docs/status/compliance map

## Definition of done

M1 is done when:

1. `RoleSource`, `RoleChangeReason`, and `RoleScopedDelegationPolicy` exist as typed concepts.
2. `activeRole` and `roleSource` are carried on run-relevant request/response/state objects in a backward-compatible way.
3. Role resolution is centralized into one typed role context used by policy, approvals, routing, ranking, and data-sharing.
4. Canonical `ROLE_*` reason-code families exist and are emitted for material role-driven decisions.
5. Activity / receipt surfaces can show active role, role source, delegation mode, and concise role-impact explanations.
6. Active role and role source survive restore/process death/resume flows.
7. Inferred role is non-sticky by default unless explicitly promoted or inherited.
8. Required scenario tests from Role Contract v1 Section 14 are implemented and passing.
9. Docs/status files are updated with an explicit compliance map and any remaining deferred items.

## Required final report

At the end of the implementation pass, report:
- changed files
- typed additions
- contract/state field additions
- role reason-code additions
- activity/receipt traceability changes
- persistence/continuity changes
- tests added or updated
- validations run
- exact remaining gaps, if any
- any deferred items with explicit reason

---

## Implementation Snapshot (2026-03-03)

This M1 pass was implemented as an additive, backward-compatible hardening pass.

### Implemented decisions

1. Added typed concepts in domain contracts:
   - `RoleSource`
   - `RoleChangeReason`
   - `RoleScopedDelegationPolicy`
2. Added optional role metadata fields to run-relevant contracts/state:
   - `AgentRequest`, `AgentRequestConstraints`, `IntentContract`, `TaskTrackPayload`, `AgentResponse`
3. Centralized role resolution in orchestrator using internal `RoleExecutionContext` with:
   - active role
   - role source
   - role change reason
   - role policy profile
   - delegation mode
   - canonical role reason codes
   - legacy detail reasons
4. Added canonical `ROLE_*` reason families as primary structured role-impact outputs.
5. Added role/source/impact English traceability to:
   - response history cards
   - chat execution surfaces
   - activity/export summary lines
6. Extended dynamic-state persistence to include:
   - `activeRole`
   - `roleSource`
7. Added contamination guardrails:
   - inferred/fallback role is non-sticky by default
   - explicit/inherited/profile-default can persist with scoped semantics
8. Added/updated tests for Section 14 scenario coverage.

## Role Contract v1 Compliance Map

| Contract area | Status | Evidence |
|---|---|---|
| Typed role concepts (`RoleSource`, `RoleChangeReason`, `RoleScopedDelegationPolicy`) | Implemented | `core-domain/.../AgentContracts.kt` |
| Backward-compatible role metadata on request/constraints/intent/task/response | Implemented | `core-domain/.../AgentContracts.kt`, `core-agent/.../TaskTrackBuilder.kt` |
| Centralized role resolution and precedence | Implemented | `core-agent/.../AgentOrchestrator.kt` (`resolveRoleExecutionContext`) |
| Explicit-constraint-overrides-role precedence | Implemented + tested | `AgentOrchestrator.kt` + `AgentOrchestratorTest.kt` (`explicitConstraintsOverrideRoleDefaultsInIntentContract`) |
| Role source semantics + tracking | Implemented + tested | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` (`roleSourceTracking...`) |
| Canonical `ROLE_*` reason families as primary structured output | Implemented | `AgentContracts.kt` (`RoleReasonCodes`), `AgentOrchestrator.kt` reason merge/injection |
| Policy/approval/routing/ranking/data-sharing role influence | Implemented + tested | `AgentOrchestrator.kt`, `SkillSelectionEngineTest.kt`, `AgentOrchestratorTest.kt` |
| Activity/receipt/history readable traceability | Implemented + tested | `RoleTraceFormatter.kt`, `ResponseCards.kt`, `ChatScreen.kt`, `MainActivity.kt`, `RoleTraceFormatterTest.kt` |
| Restore/process-death continuity for role+source | Implemented + tested | `DynamicStatePersistencePort.kt`, `SharedPrefsDynamicStateStore.kt`, `AgentOrchestrator.kt`, `DynamicStatePersistenceTest.kt` |
| Cross-role contamination guardrails | Implemented + tested | `AgentOrchestrator.kt` (non-sticky inference), `AgentOrchestratorTest.kt` (`inferredRoleIsNonSticky...`) |
| Mid-run role change semantics (future-step reevaluation, non-retroactive history) | Implemented + tested | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` (`midRunRoleChange...`) |

## Validation Results (This Pass)

Executed and passing:

- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

Additional regression check:

- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`

## Remaining Gaps / Deferred

- No custom role editor in this pass (explicitly out of scope).
- No broad orchestrator rewrite (explicitly out of scope).
- No Room schema migration; role continuity remains in dynamic-state persistence storage path.

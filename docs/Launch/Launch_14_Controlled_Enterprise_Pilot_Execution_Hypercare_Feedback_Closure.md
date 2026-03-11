# Launch 14 - Controlled Enterprise Pilot Execution, Hypercare, and Feedback Closure

## Freeze note (2026-03-07)

Launch 14.x expansion is frozen unless real pilot evidence appears.

Current state:
- the Agent OS / execution-governance core is strong
- the product is not yet a real activated enterprise pilot
- real pilot activation is still blocked by missing real environment binding, named requester/operator/admin actors, and real pilot evidence
- explicit launch-state wording for this condition:
  - `PILOT_ACTIVATION_IN_PROGRESS`
  - true pilot Day 0 still does not start until the first real task/session/run artifact exists

Therefore:
- do not continue docs-only `HOLD` / `REMEDIATE` launch loops as product progress
- treat remaining Launch 14.x work as external pilot-activation dependency work only
- route active product progress to:
  - `docs/enterprise_productization_foundation_spec.md`
  - `docs/enterprise_productization_foundation_plan.md`
  - `docs/enterprise_productization_foundation_status.md`
- use `docs/external_pilot_activation_request_pack.md` as the operational handoff pack for external pilot activation dependencies
- use `docs/Pilot_Activation_War_Room_Execution_Checklist.md` as the 48-hour execution frame
- active productization slices after the freeze:
  - `docs/EPF_2_Pilot_Activation_Flows_Actor_Onboarding_Evidence_Capture.md`
  - `docs/EPF_3_Pilot_Environment_Binding_Actor_Provisioning_Real_Evidence_Handoff.md`
  - `docs/EPF_4_External_Pilot_Activation_Package_Handoff_Verified_Live_Evidence_Intake.md`
  - `docs/EPF_5_Real_Pilot_Activation_Execution_Verified_Artifact_Promotion_Live_Evidence_Closure.md`
  - `docs/EPF_6_Local_Multi_Actor_Lab_and_Role_Segmented_Rehearsal.md`
  - `docs/EPF_7_Local_Role_Lab_Visualization_Rehearsal_UX.md`
  - `docs/EPF_8_Standalone_Enterprise_Platform_Frontend.md`
  - `docs/EPF_9_Enterprise_Web_Platform_Primary_Shell.md`

## Why this step exists

Launch 13.6 closed the final launch gate and produced a **GO** decision for a controlled enterprise pilot launch.

That means the next step is **not** another product or infrastructure milestone.
The next step is to run the pilot as an operational program with strong guardrails, hypercare, evidence capture, and decision discipline.

This phase exists to ensure that the product is not only launchable in theory, but also supportable, observable, and improvable under real pilot conditions.

## Goal

Run a controlled enterprise pilot launch with:
- explicit customer/account scope
- guarded rollout and enablement
- hypercare monitoring
- incident and rollback readiness
- structured feedback capture
- durable launch evidence and post-pilot decision outputs

## Core outcome

At the end of Launch 14, the team should be able to answer:
- which pilot tenants/accounts were onboarded
- which templates/workflows/connectors were enabled
- whether the launch remained within agreed risk boundaries
- what incidents or degradations occurred
- what product friction appeared in real usage
- what support load emerged
- whether the pilot should expand, hold, or roll back

## In scope

### 1. Pilot cohort definition and freeze
Define the exact pilot scope:
- pilot tenant/account list
- enabled capabilities
- enabled connectors
- enabled policy packs / workflow packs
- supported deployment/environment model
- named stakeholders and support path

### 2. Launch execution and change control
Treat pilot enablement as a controlled rollout:
- explicit launch checklist
- named owner for go-live
- freeze on unrelated product changes for the pilot branch/candidate
- change log for anything enabled/disabled during pilot

### 3. Hypercare operations
Run a structured hypercare period with:
- daily or per-shift review cadence
- monitored critical signals
- incident triage and escalation rules
- rollback criteria
- support ownership

### 4. Feedback and evidence capture
Capture feedback through structured channels:
- user-facing issues
- operator friction
- admin/policy-owner friction
- connector/identity/vault/runtime failures
- audit/compliance questions
- adoption and usage signals

### 5. Pilot decision closure
At the end of the pilot window, record a durable decision:
- expand
- continue limited
- hold
- rollback
- require remediation before expansion

## Out of scope

Do not do the following during Launch 14 unless they are launch-blocking fixes:
- open new broad milestone development
- redesign the product surface
- add new major connectors without change control
- expand beyond the pilot cohort without explicit decision
- weaken current safety, privacy, or compliance boundaries

## Design principles

1. **Protect the pilot surface**
   Do not mix pilot operations with unrelated roadmap expansion.

2. **Evidence over intuition**
   Decisions to expand or hold should be based on durable signals and logs.

3. **Hypercare is finite and structured**
   This is not indefinite firefighting. It is a bounded operational phase.

4. **Launch evidence must remain durable**
   Major launch, incident, rollback, and decision events should be recorded in durable docs/logs.

5. **One pilot can justify many later milestones**
   The point is not to keep building in the abstract. The point is to learn from live usage.

## Required workstreams

### Launch 14A - Pilot cohort and enablement pack
Create a durable pilot cohort and enablement definition.

Required outputs:
- pilot cohort list
- enabled features/capabilities matrix
- enabled connector matrix
- owner/stakeholder/support matrix
- rollback boundary

### Launch 14B - Hypercare monitoring and incident ops
Define and run the hypercare process.

Required outputs:
- hypercare schedule
- daily review template
- critical signal list
- incident severity definitions
- escalation path
- rollback trigger rules

### Launch 14C - Feedback, friction, and evidence capture
Create structured capture for:
- user friction
- admin/operator friction
- runtime issues
- connector/identity/vault issues
- compliance/export/audit questions

Required outputs:
- issue taxonomy
- feedback capture template
- friction buckets
- pilot evidence log

### Launch 14D - Pilot closure and next-step decision
At the end of the pilot window, produce a durable outcome.

Required outputs:
- pilot review summary
- success/failure against goals
- open blocking issues
- recommendation: expand / hold / rollback / remediate
- next-step milestone mapping

## Minimum critical signals to track during hypercare

At minimum, track:
- task/run failure rate
- retry/dead-letter rate
- connector failure rate
- identity/auth failure rate
- vault/credential health failures
- rollout/policy governance errors
- operator case backlog growth
- dispute/rollback/reconciliation abnormal spikes
- Android/client critical crash or regression incidents
- support ticket or escalation load

## Suggested daily review format

For each hypercare review:
1. incidents in last window
2. current blocker list
3. connector/identity/vault health
4. operator backlog and aged cases
5. pilot user/admin/operator feedback highlights
6. any rollback thresholds close to tripping
7. explicit decision: continue / tighten / rollback / remediate

## Required documents

At minimum, add/update:
- `docs/Launch_14_Controlled_Enterprise_Pilot_Execution_Hypercare_Feedback_Closure.md`
- `docs/launch-pilot-cohort.md`
- `docs/launch-hypercare-runbook.md`
- `docs/launch-feedback-log.md`
- `docs/launch-pilot-closure-template.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

## Validation expectations

This phase is operational, but keep code validation green if any launch-blocking fix is made.

At minimum, any fix merged during hypercare must rerun the relevant subset of:
- TypeScript typecheck
- targeted vitest suites
- Android unit tests
- Android connected tests if affected
- release baseline gate if launch candidate changes

## Definition of done

Launch 14 is done when:
1. the pilot cohort is explicitly defined and enabled
2. hypercare is run for the agreed window
3. incidents, friction, and support load are captured durably
4. any launch-blocking defects are either fixed and revalidated or explicitly accepted with mitigation
5. a durable pilot closure decision is written
6. the team has a clear recommendation for expand / hold / rollback / remediate

## Expected final outputs

At the end of Launch 14, report:
- pilot cohort launched
- what was enabled
- incidents and severity summary
- main friction buckets
- operational load summary
- launch-blocking issues found/fixed
- pilot decision: expand / hold / rollback / remediate
- recommended next milestone or remediation package

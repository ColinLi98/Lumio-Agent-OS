# Launch 14.7 - Real Device, Real Task Evidence Pack

## Purpose
This step clarifies the difference between:
- automated launch-gate evidence, and
- real-device, real-task pilot evidence.

The automated launch gate is already green.
The remaining gap before closure is not more automated testing. It is broader live evidence inside the frozen pilot cohort.

This checkpoint exists to formalize the real-device, real-task evidence collection plan during Launch 14 hypercare.

## Current state
- Launch gate: GO already achieved on the clean candidate.
- Pilot status: active, frozen scope, HOLD.
- Hypercare window: 2026-03-07 through 2026-03-21.
- No new Sev1 or repeated Sev2.
- No bounded remediation package open.
- Closure readiness still rejected because the live evidence base is too narrow.

## Key clarification
### When should real-device, real-task testing happen?
**Now.**

It should begin immediately inside the existing frozen pilot window.
It is not a future milestone after hypercare.
It is one of the core inputs required to exit HOLD and reach CLOSURE_READY.

Automated connected Android tests prove the app still boots and the instrumented surfaces behave.
Real-device, real-task testing proves that the actual pilot workflow, operator flow, and tenant-admin flow work in live conditions for the chosen frozen scope.

## Goal
Collect enough real-device, real-task evidence to broaden the live evidence base across:
- KPI evidence
- operator/support evidence
- tenant-admin evidence
- real workflow completion evidence
- stability/no-regression evidence

## Frozen pilot scope for real-task testing
Real-task testing must remain inside the already frozen pilot scope only:
- `pilot-alpha-prod`
- `pilot-alpha-staging`
- advisor workflow template family only
- Okta OIDC + Okta SCIM-like provisioning/shrink
- HashiCorp Vault credential lifecycle
- `generic_https_webhook`
- `advisor_crm_compliance_handoff`
- vendor-managed single-tenant cloud
- one primary region handle
- local-first fail-closed behavior

No new connector, tenant, workflow family, or deployment model should be introduced for this evidence pack.

## What counts as real-device, real-task evidence
A valid evidence item should involve at least one of the following on a real device and in the live frozen pilot environment:
- a real requester/business-user task initiation or approval
- a real operator queue/case handling step
- a real tenant-admin or identity/admin handling step
- a real workflow completion or meaningful progression step
- a real connector/vault/compliance path exercising the live frozen stack

Synthetic demonstrations or local mock-only steps do not count as closure-broadening live evidence.

## Minimum evidence categories
### A. Requester / business-user evidence
Examples:
- start a real advisor workflow task
- review a generated receipt/result
- approve or reject a real gated action
- confirm that the result and receipt are understandable

### B. Operator evidence
Examples:
- operator opens a real case from the governance queue
- operator uses queue presets or detail timeline
- operator marks reviewed, retries a safe action, or otherwise handles a real issue-free or low-risk path
- operator confirms the current runbook is sufficient

### C. Tenant-admin evidence
Examples:
- tenant-admin path for sign-in / access / directory sync review
- policy / rollout / admin understanding in live use
- confirmation that admin-facing assumptions are understandable and operable

### D. Stability / no-regression evidence
Examples:
- same frozen workflow completes or advances correctly multiple times in live pilot
- same operator path remains stable across repeated use
- no new Sev1 / repeated Sev2 / active friction bucket appears

## Required daily target set
For each hypercare day, try to capture at least:
- 1 requester/business-user live evidence item
- 1 operator live evidence item
- 1 tenant-admin or identity/admin live evidence item
- 1 stability/no-regression evidence item

If one category cannot be exercised that day, the checkpoint must explicitly say which category is still missing.

## Evidence logging requirements
Every valid evidence item should be appended to `launch-pilot-evidence-log.md` with at least:
- date/time
- environment (`pilot-alpha-prod` or `pilot-alpha-staging`)
- actor type (`requester`, `operator`, `tenant_admin`)
- workflow or surface exercised
- result (`success`, `minor friction`, `blocked`, etc.)
- whether any incident or friction bucket was created
- short note on whether this broadens the closure evidence base

If any real-task attempt exposes a defect or real friction, also update:
- `launch-pilot-incident-log.md`
- `launch-feedback-log.md`

## Trigger rules during real-task testing
### HOLD
Remain in HOLD if:
- no Sev1
- no open or repeated Sev2
- no bounded remediation package is justified
- scope remains frozen
- evidence breadth is improving but still not sufficient for closure

### REMEDIATE
Open a bounded remediation package if:
- a real defect appears in the frozen pilot scope
- the defect is actionable and worth changing code/config/runbook for
- the fault domain is clear enough to keep remediation bounded

### ROLLBACK
Use rollback only if:
- a launch-critical fault appears
- continued live pilot use is no longer safe

### CLOSURE_READY
Only consider closure-ready when:
- the hypercare window is sufficiently complete
- evidence exists across requester, operator, tenant-admin, and stability categories
- no unresolved launch-critical blocker remains
- the evidence base is no longer just “no incidents happened”

## What not to do
- do not expand scope to get easier evidence
- do not enable new connectors or tenants
- do not treat connected Android tests as a substitute for real-task evidence
- do not rerun the full validation suite unless a bounded remediation package actually changes runtime/API/Android/host/config behavior

## Definition of done
Launch 14.7 is complete when:
1. the real-device, real-task evidence plan is explicit
2. the daily target set is recorded
3. evidence logging rules are explicit
4. trigger rules for HOLD / REMEDIATE / ROLLBACK / CLOSURE_READY are explicit
5. docs/spec/plan/status are synced

## Next step after 14.7
Continue daily hypercare checkpoints with real-task evidence accumulation until either:
- closure readiness is finally met, or
- a bounded remediation package is opened, or
- rollback is required.

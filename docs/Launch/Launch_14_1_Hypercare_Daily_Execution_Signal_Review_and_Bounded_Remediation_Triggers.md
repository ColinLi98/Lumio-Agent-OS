# Launch 14.1 - Hypercare Daily Execution, Signal Review, and Bounded Remediation Triggers

## What this step is
This is the immediate follow-up step after Launch 14 entered **HOLD** with a frozen pilot cohort and no current Sev1/Sev2 blockers.

This step is not a new product milestone.
It is an operational execution package for the existing pilot.

The purpose is to:
- run the pilot inside the approved frozen scope
- capture daily evidence, incidents, blockers, and friction in a disciplined way
- detect whether a bounded remediation package is needed
- keep the pilot in a controlled state until a real closure decision can be made

## Current operating posture
- Launch gate is already **GO**.
- Pilot operating decision is currently **HOLD**.
- Scope expansion is not allowed during this step.
- New connector, tenant, workflow family, or deployment-mode expansion is not allowed.
- No new feature milestone should begin during this step.

## Frozen pilot scope
This step assumes the existing frozen pilot scope remains unchanged:
- `pilot-alpha-prod` as the only live production cohort handle
- `pilot-alpha-staging` as the only supporting staging cohort handle
- advisor workflow template family only
- Okta OIDC + Okta SCIM-like provisioning/shrink only
- HashiCorp Vault credential lifecycle only
- `generic_https_webhook` and `advisor_crm_compliance_handoff` only
- vendor-managed single-tenant cloud
- one primary region handle
- local-first fail-closed behavior remains mandatory

## Goal
Execute the hypercare window in a disciplined, evidence-first way and reach one of three valid outcomes:
1. **EXPAND** - only if the closure evidence justifies controlled scope expansion
2. **HOLD** - if the pilot is stable but still under-observed or not yet decision-ready
3. **REMEDIATE / ROLLBACK** - if real production evidence shows launch-blocking or pilot-blocking faults

## In scope
This step includes:
- daily evidence capture
- daily incident and blocker review
- friction review by bucket
- explicit watch-item review
- bounded remediation trigger detection
- closure-template preparation during the hypercare window
- final recommendation drafting at the end of the window

## Out of scope
This step does not include:
- new product capabilities
- new connectors
- new tenants
- new workflow families
- new deployment models
- broad UI redesign
- orchestrator or storage rewrites
- speculative performance or architecture work without pilot evidence

## Source-of-truth docs for this step
Use and update only the existing launch docs:
- `launch-pilot-cohort.md`
- `launch-hypercare-runbook.md`
- `launch-feedback-log.md`
- `launch-pilot-evidence-log.md`
- `launch-pilot-incident-log.md`
- `launch-pilot-closure-template.md`
- `codex-agent-os-refactor-spec.md`
- `codex-agent-os-refactor-plan.md`
- `codex-agent-os-refactor-status.md`

## Daily operating cadence

### Daily pass 1 - Evidence append
At least once per day, append to `launch-pilot-evidence-log.md`:
- date/time
- active cohort
- production/staging observations
- completed pilot interactions
- operator-visible issues or absence of issues
- any meaningful receipt / governance / workflow / connector / identity / vault observations
- whether the frozen scope was maintained

### Daily pass 2 - Incident and blocker review
At least once per day, review and update `launch-pilot-incident-log.md`:
- new incidents
- current status of open incidents
- resolved incidents
- whether any item qualifies as Sev1 / repeated Sev2 / launch-blocking
- whether a bounded remediation package should be opened

### Daily pass 3 - Friction bucket review
At least once per day, review and append to `launch-feedback-log.md` against the existing buckets:
- workflow
- operator
- tenant_admin
- identity_auth
- vault_connector
- compliance_audit
- deployment_isolation
- android_host
- scope_pressure

Each entry should be classified as one of:
- observation only
- low-priority follow-up
- candidate remediation
- expand blocker

## Bounded remediation trigger rules
Open a bounded remediation package only if one of the following becomes true:

### Trigger A - Sev1 appears
Any Sev1 production issue immediately blocks continued passive HOLD and requires bounded remediation.

### Trigger B - repeated Sev2 in the same fault domain
If the same Sev2-class issue repeats enough to indicate a real domain problem, open bounded remediation for that domain only.

### Trigger C - proven frozen-scope break
If the pilot operates outside the explicitly frozen scope, open a bounded remediation or control package to restore scope discipline.

### Trigger D - evidence shows a false-positive GO assumption
If a launch assumption that passed the gate is disproven in live pilot behavior, open bounded remediation for that specific assumption/fault domain.

## Non-triggers
Do not open remediation for:
- theoretical concerns not evidenced in the pilot
- backlog desires or product ideas
- broad GA improvements
- broad UX redesign wishes
- architecture cleanup that is not tied to a live pilot fault domain

## Bounded remediation package rules
If a remediation package is required, it must be:
- tied to one proven fault domain
- limited in scope
- documented with exact trigger evidence
- accompanied by the minimum validation rerun needed for that domain
- re-entered into the launch docs with a clear return-to-hold or return-to-go decision

It must not become a hidden new feature milestone.

## Watch-item handling
The existing historical watch item remains:
- Launch 13.5 one-off Android connected-test failure

During this step:
- keep it recorded as resolved historical watch item only
- do not reopen it unless real pilot evidence reproduces it
- do not spend time on prophylactic changes without fresh evidence

## Daily status classification
Each day should end with one of these status calls:
- `STABLE_HOLD` - no new evidence requiring remediation, continue pilot
- `WATCH` - concerning but not yet remediation-triggering
- `REMEDIATE` - trigger threshold met, open bounded remediation package
- `CLOSURE_READY` - enough evidence accumulated to run the closure template

## Closure preparation
Do not wait until the end to prepare closure.
Update `launch-pilot-closure-template.md` continuously with:
- evidence summary
- incident summary
- blocker summary
- friction summary by bucket
- scope discipline confirmation
- recommendation trend (EXPAND / HOLD / REMEDIATE / ROLLBACK)

The final decision should be based on accumulated evidence, not reconstructed from memory afterward.

## End-of-window decision rules
At the end of the hypercare window, the valid decision outcomes are:

### EXPAND
Only if:
- no Sev1 occurred
- no repeated Sev2 remains unresolved in a launch-critical domain
- frozen scope was maintained
- evidence is strong enough that controlled expansion is justified

### HOLD
If:
- the pilot is stable
- no launch-blocking issues emerged
- but evidence is still not strong enough to justify expansion

### REMEDIATE
If:
- a real bounded fault domain emerged and needs code or ops correction before any expansion

### ROLLBACK
Only if:
- a severe fault makes continued pilot operation unsafe or not credible

## Required artifacts at the end of this step
By the end of Launch 14.1, these artifacts must be complete and current:
- `launch-pilot-evidence-log.md`
- `launch-pilot-incident-log.md`
- `launch-feedback-log.md`
- `launch-pilot-closure-template.md`
- `codex-agent-os-refactor-spec.md`
- `codex-agent-os-refactor-plan.md`
- `codex-agent-os-refactor-status.md`

## Definition of done
Launch 14.1 is complete when:
1. the hypercare window has been executed under the frozen pilot scope
2. daily evidence, incident, and feedback logs are complete and append-only
3. any Sev1 or repeated Sev2 has either not occurred or has been routed into a bounded remediation package
4. the closure template contains enough durable evidence to support an EXPAND / HOLD / REMEDIATE / ROLLBACK decision
5. docs/status reflect the actual pilot state and recommendation

## Required final report format
At the end of the step, report:
- pilot window dates covered
- total evidence entries appended
- total incidents appended and their severities
- any remediation triggers opened
- final closure recommendation
- whether scope remained frozen
- exact next action: EXPAND, HOLD, REMEDIATE, or ROLLBACK

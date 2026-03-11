# Launch 14.9 - Real Device Task Run 1, Coverage Closure Push, and Closure-Readiness Advancement

## What this step is
Launch 14.9 is the first checkpoint that must be driven by **real pilot evidence execution**, not only by daily HOLD documentation.

The purpose of this step is to move the pilot from:
- passive hypercare observation
- daily HOLD continuation
- evidence bookkeeping

to:
- live real-device task execution
- explicit coverage closure by evidence category
- gap-by-gap closure-readiness advancement

This step is still inside the frozen hypercare window and does not authorize any scope expansion.
It exists to force the pilot to produce evidence broad enough to support a future closure decision.

## Why this step is next
Launch 14.1 through Launch 14.8 established:
- daily hypercare checkpoints
- frozen cohort and scope boundaries
- trigger rules for HOLD / REMEDIATE / ROLLBACK / CLOSURE_READY
- append-only evidence, feedback, and incident logs
- explicit real-device / real-task evidence categories
- explicit coverage-gap framing for closure-readiness

The current problem is no longer ambiguity.
The current problem is that the pilot remains **under-evidenced**, especially across the live categories required for closure-readiness.

Therefore the next correct action is not another passive checkpoint.
It is a forced real-task evidence run with explicit coverage accounting.

## Goal
During this step, execute and record a minimum viable set of real pilot tasks on real devices and close as many evidence-category gaps as possible without expanding scope.

The output of this step must answer:
- which evidence categories were actually exercised live
- which categories are still missing or too narrow
- whether closure-readiness moved forward materially
- whether a bounded remediation package is now required

## Frozen scope reminder
No new scope may be introduced in this step.
Continue using only the frozen pilot scope already defined:
- pilot-alpha-prod
- pilot-alpha-staging
- advisor workflow template family only
- Okta OIDC + Okta SCIM-like provisioning/shrink
- HashiCorp Vault credential lifecycle
- generic_https_webhook
- advisor_crm_compliance_handoff
- vendor-managed single-tenant cloud
- one primary region handle
- local-first fail-closed behavior

No new tenant, connector, workflow family, or deployment model may be enabled.

## Required evidence categories
Each real task attempt should be mapped into one or more of these categories:

1. **Device/session proof**
   - real device used
   - real session present
   - no simulator-only substitution

2. **Workflow artifact proof**
   - real workflow template used
   - real task moved through its expected path
   - real receipt / proof / artifact output observed

3. **Connector / credential proof**
   - real connector path touched, or
   - explicit proof that none was touched that day
   - if touched, credential / connector / fallback behavior must be logged

4. **Tenant-admin / support proof**
   - real tenant-admin or operator-facing action, or
   - explicit none-today entry with reason

5. **Stability / safety proof**
   - no-regression evidence from repeated or comparable execution
   - incident absence is not enough; there must be a real stability claim tied to actual usage

## Minimum daily target set for this step
This step should aim to close coverage using at least:
- 1 real-device production task sample
- 1 workflow-artifact outcome sample
- 1 connector/credential sample, or an explicit none-today record
- 1 tenant-admin/support sample, or an explicit none-today record
- 1 stability/safety review linked to actual live usage

This is the minimum.
If more live evidence is available, record it.

## Required execution flow

### 1. Select live tasks
Choose a bounded set of real pilot tasks that stay within frozen scope.
Do not choose synthetic or edge tasks unless the pilot actually used them.

### 2. Execute on real device/session
Use the real pilot device/session path wherever applicable.
Record actual behavior, not expected behavior.

### 3. Capture receipts and operator traces
Where real receipts, proofs, governance summaries, or operator traces exist, record them in the evidence pack.
Do not summarize vaguely.

### 4. Map evidence to categories
For each task/evidence item, explicitly mark which categories it covers.

### 5. Update logs immediately
Append to:
- `launch-pilot-evidence-log.md`
- `launch-feedback-log.md`
- `launch-pilot-incident-log.md` if needed
- `launch-pilot-closure-template.md`

### 6. Perform coverage gap assessment
At the end of the checkpoint, explicitly state:
- category coverage improved / unchanged / still missing
- whether any category remains too narrow for closure
- whether a bounded remediation package is now required

## What counts as sufficient advancement
This step is successful only if it materially improves the breadth of live evidence.

Examples of sufficient advancement:
- first confirmed real device + real workflow + real receipt chain in frozen prod scope
- first real tenant-admin or operator support action tied to the live pilot
- first real connector/credential path evidence or first well-justified explicit none-today record
- repeated live path with no-regression evidence

Examples of insufficient advancement:
- only more HOLD prose with no new live task evidence
- repeating the same abstract statement that “no new incidents appeared”
- logging only simulated or inferred outcomes without real execution

## Trigger rules
At the end of the checkpoint, only one decision is allowed:

### HOLD
Use when:
- no Sev1
- no open/repeated Sev2
- no bounded remediation package is justified
- but evidence breadth is still not sufficient for closure-ready

### REMEDIATE
Use when:
- a real task exposes a bounded fault domain that deserves a contained remediation package
- especially if it affects required evidence categories or materially weakens confidence

### ROLLBACK
Use when:
- a true launch-blocking issue is discovered in the live pilot
- especially a Sev1 or sustained repeated Sev2 that invalidates current frozen operation

### CLOSURE_READY
Use only when:
- evidence breadth is now materially sufficient across the required categories
- no Sev1 or repeated Sev2 remains open
- no remediation package is needed
- the closure template can be defended with actual live evidence, not just absence of incidents

## Expected artifacts
This step should produce:
- updated daily checkpoint doc
- updated evidence log with real task evidence
- explicit category coverage mapping
- closure-template progress update
- explicit statement of which categories remain weak, if any

## Definition of done
Launch 14.9 is done when:
1. at least one real pilot task has been executed and recorded in frozen scope
2. evidence categories are explicitly mapped from real evidence, not only inferred
3. coverage gap assessment is written, not implied
4. the checkpoint ends in exactly one decision: HOLD / REMEDIATE / ROLLBACK / CLOSURE_READY
5. all updates remain append-only and no scope expansion occurs

## Required final report format
At the end of the step, report:
- current pilot day / hypercare window status
- total evidence count
- incident count and severity summary
- which evidence categories received new live evidence today
- which categories remain insufficient
- whether remediation was opened
- whether scope remained frozen
- final checkpoint decision
- exact next action

# Step 1A - Pilot Activation Closure Execution and State Reclassification

## Purpose

This package is the first non-speculative execution step under **Sellable Standard Roadmap v1**.
The roadmap is already aligned in docs. The next step is **not** another documentation-only checkpoint. The next step is to execute the actual Pilot Activation Closure work and determine whether the pilot can be activated at all.

This step has three goals:
1. get the roadmap and EPF alignment docs into a tracked, reviewable repo state
2. drive external artifact collection for Pilot Activation Closure
3. reclassify the launch state promptly if activation artifacts are still missing after their due dates

---

## Current truth

The repo now treats **Step 1 - Pilot Activation Closure** as the active step.
Step 2 is blocked until the first verified/promoted `REAL_PILOT` task/session/run artifact exists.
The current external blocker set still includes the absence of:
- real pilot environment binding
- real operator access/session
- named real requester actor
- real tenant-admin/support touchpoint
- first real task/session/run artifact
- connector/credential artifact if that first real task actually touches the approved connector path

This means the platform is no longer blocked by product architecture.
It is blocked by **external activation artifacts**.

---

## Strict rule for this step

Do not create another docs-only HOLD checkpoint without a changed real fact.
A changed real fact means at least one of:
- a required external artifact was actually delivered
- a blocker was narrowed to a more concrete owner + missing artifact + decision
- the state was reclassified according to the due-date rules below

If none of those occurred, do not open a new checkpoint document.

---

## Immediate substep 0 - make the six governing docs real repo truth

The six docs updated in the last pass are currently `??` in git status.
That is not acceptable for a governing execution frame.

### Required actions

1. Move or add the six docs into the tracked repo path that is intended to govern execution.
2. Ensure the tracked versions are the ones Codex and reviewers will actually read.
3. Confirm no duplicate stale copies remain in conflicting paths.
4. Stage and commit them in one bounded docs-only commit.

### Done when

- the six execution-frame docs are no longer untracked
- the repo has one authoritative tracked copy for each
- the docs-only commit is reviewable and reversible

---

## Required external artifacts

The following artifacts remain mandatory.
They are not optional.

### Artifact A - real pilot environment binding
Owner: `pilot-commander`
Due: `2026-03-10`

Required evidence:
- real `pilot-alpha-prod` base URL
- tenant id
- workspace id
- proof it is not the simulator binding

Acceptance:
- must be submitted as `REAL_PILOT`
- must not point to `lumi-agent-simulator`
- must be promotable through the existing EPF-4 intake/review/promote path

### Artifact B - named real requester actor
Owner: `pilot-commander`
Due: `2026-03-10`

Required evidence:
- one named real requester identity
- actor-readiness record
- promotable requester readiness

Acceptance:
- must be submitted as `REAL_PILOT`
- must promote to requester readiness

### Artifact C - real operator session/access
Owner: `pilot-operator-lead`
Due: `2026-03-10`

Required evidence:
- one real operator identity
- one real session/token or equivalent access grant
- actor-readiness record with provisioned + granted semantics

Acceptance:
- must be submitted as `REAL_PILOT`
- must promote to operator readiness with `PROVISIONED + GRANTED`

### Artifact D - real tenant-admin/support touchpoint
Owner: `tenant-admin`
Due: `2026-03-10`

Required evidence:
- one real admin/support contact or channel
- actor-readiness record or equivalent touchpoint proof

Acceptance:
- must be submitted as `REAL_PILOT`
- must promote to tenant-admin/support readiness

### Artifact E - first real task/session/run artifact
Owner: `pilot-operator-lead`
Due: `2026-03-11`

Required evidence:
- one real task/session/run path originating from the activated pilot environment and actors
- one promotable workflow/session artifact

Acceptance:
- must be submitted as `REAL_PILOT`
- must promote into `device_session_proof` and/or `workflow_artifact_proof`

### Artifact F - real connector/credential artifact if actually involved
Owner: `connector-platform-owner`
Due: `2026-03-11`

Required evidence:
- only required if Artifact E legitimately touches the approved connector path
- otherwise record explicit `NOT_INVOLVED_IN_THIS_REAL_TASK`

Acceptance:
- if involved, must be submitted as `REAL_PILOT`
- if not involved, the absence must be explicitly recorded

---

## Required execution flow

### Step 1 - external request pack dispatch
Use the existing external request pack and update it to reflect the exact owners, due dates, and acceptance rules above.

### Step 2 - artifact intake
As artifacts arrive, ingest them only through the EPF-4 handoff/intake/review/promotion flow.
Do not manually mark readiness without artifact-backed promotion.

### Step 3 - promotion into runtime truth
As artifacts are verified:
- promote environment binding
- promote requester readiness
- promote operator readiness
- promote tenant-admin/support readiness
- promote the first real task/session/run artifact
- promote connector/credential proof if applicable

### Step 4 - update launch truth
Once artifacts are promoted, update:
- `launch-pilot-evidence-log.md`
- `launch-feedback-log.md`
- `launch-pilot-incident-log.md` only if needed
- `launch-pilot-closure-template.md`
- the enterprise productization status docs if state materially changes

---

## State reclassification rules

### Rule 1 - by 2026-03-10
If any of Artifacts A-D are still missing by the end of `2026-03-10`, reclassify the launch state to:

`PILOT_ACTIVATION_DELAYED`

Do not keep using generic HOLD language if the due date has been crossed.

### Rule 2 - by 2026-03-11
If Artifact E is still missing by the end of `2026-03-11`, reclassify the launch state to:

`PILOT_NOT_STARTED`

At that point the system still may be product-ready, but the pilot itself is not active.

### Rule 3 - if first real evidence lands
If a real task/session/run artifact is promoted successfully, move from activation-only language into the real evidence closure state and resume evidence-based checkpointing.

---

## Allowed outcomes for this step

Only these outcomes are acceptable:
- `REAL_ARTIFACT_RECEIVED`
- `REAL_ARTIFACT_VERIFIED`
- `REAL_ARTIFACT_PROMOTED`
- `PILOT_ACTIVATION_DELAYED`
- `PILOT_NOT_STARTED`

Avoid vague HOLD wording unless at least one concrete fact changed and the due-date rule has not yet been crossed.

---

## Not allowed in this step

- no new product features
- no new connector/workflow/deployment expansion
- no speculative launch docs with no changed facts
- no synthetic promotion of simulator/demo/test/local artifacts into pilot evidence
- no reopening of broad milestone expansion work

---

## Deliverables expected at the end

At the end of Step 1A, report:
- whether the six governing docs were moved into tracked repo truth
- which artifacts A-F were received, verified, or promoted
- which artifacts remain missing
- whether the state must now be reclassified to `PILOT_ACTIVATION_DELAYED` or `PILOT_NOT_STARTED`
- exact next action

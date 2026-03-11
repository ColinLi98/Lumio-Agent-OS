# EPF-5 - Real Pilot Activation Execution, Verified Artifact Promotion, and Live Evidence Closure

## Why EPF-5 is next

EPF-2, EPF-3, and EPF-4 established the productized activation path:
- typed actor readiness and evidence category tracking
- typed environment binding, actor provisioning, and connector activation readiness
- typed activation package handoff, external artifact intake, verification, rejection, and promotion
- durable activation checklist, blocker summaries, and next-action state in product surfaces

The system now has the required product/runtime structures to consume real pilot activation artifacts.

The remaining blocker is no longer an implementation gap inside the productization foundation. It is an **external pilot activation execution gap**:
- no real pilot environment binding has been provided
- no real operator access/session has been provided
- no named real requester actor has been provided
- no real tenant-admin/support touchpoint has been provided
- no real task/session/run artifact has been produced
- no real connector/credential path artifact has been produced

So the next step is not another docs-only HOLD loop and not another new product primitive by default.

The next step is to use the existing EPF-4 machinery to capture, verify, and promote the first real pilot artifacts into durable activation truth.

---

## Goal

Execute the real pilot activation path using the existing EPF-4 handoff/intake/review/promotion system, and convert real external artifacts into:
- durable pilot environment binding
- durable real actor readiness
- durable connector activation eligibility
- durable real pilot evidence category coverage
- a narrower or cleared blocker set

This milestone should only introduce new implementation changes if a real artifact cannot be represented, verified, or promoted by the current EPF-4 model.

---

## Core outcome

At the end of EPF-5, at least one of the following must be true:

1. A real pilot artifact has been captured, verified, and promoted into activation truth, advancing one or more previously missing evidence categories.
2. A narrower, concrete remediation package has been opened because a real external artifact exposed a specific product or runtime gap in EPF-4 representation or promotion.
3. The team has explicit proof that the pilot has not yet been truly activated because named external artifacts still do not exist, and the blocker set is now as narrow and owner-bound as possible.

EPF-5 must not fabricate pilot evidence from simulator/demo/test/local-synthetic sources.

---

## In scope

### 1. Real pilot environment binding execution
Use the existing product/runtime path to capture and promote a real environment binding artifact.

Required outcome:
- either `pilot-alpha-prod` (or equivalent real pilot env) is durably bound and promoted
- or the blocker remains explicitly external and owner-bound

### 2. Real actor provisioning and access execution
Use the existing actor readiness and activation package flows to capture and promote:
- a real operator access/session proof
- a real named requester proof
- a real tenant-admin/support touchpoint proof

Required outcome:
- actor readiness is advanced only through real pilot sources
- missing actor paths remain explicit blockers with owner and missing artifact

### 3. Real evidence artifact promotion
Use the existing evidence intake/review/promotion flow to capture and promote real pilot artifacts into evidence category progress.

Evidence categories to drive forward:
- `device_session_proof`
- `workflow_artifact_proof`
- `connector_credential_proof`
- `tenant_admin_support_proof`
- `stability_safety_proof` (already covered, but may be extended)

### 4. Connector/credential path evidence
If the first real pilot task truly uses a connector/credential path, capture and promote that artifact.
If not, record explicitly that connector proof was not involved in the current task rather than fabricating it.

### 5. Durable blocker narrowing
If a category still cannot advance, the result must be one of:
- a clearly narrower external blocker
- a bounded remediation package with exact missing field/path/representation
- an explicit statement that the pilot is not yet truly activated

### 6. Status, logs, and closure alignment
Update the existing append-only artifacts:
- `launch-pilot-evidence-log.md`
- `launch-pilot-incident-log.md`
- `launch-feedback-log.md`
- `launch-pilot-closure-template.md`
- launch summary/spec/plan/status docs

Do not reopen fake hypercare progress if no real evidence advanced.

---

## Out of scope

Do not do the following in EPF-5 unless a real artifact reveals a strict representation gap that blocks promotion:
- introduce new broad product primitives
- redesign the product shell
- broaden the workflow family scope
- add new connectors for general expansion
- expand tenant count or deployment mode
- treat simulator/demo/test/local-synthetic artifacts as real pilot evidence
- continue docs-only HOLD loops without new evidence or a narrower blocker

---

## Required execution order

### Step 1 - Attempt real environment binding
Use the current activation package/intake path to capture a real pilot environment artifact.

### Step 2 - Attempt operator access promotion
Capture a real operator session/access artifact and promote it if valid.

### Step 3 - Attempt requester promotion
Capture a real named requester artifact and promote it if valid.

### Step 4 - Attempt tenant-admin/support touchpoint promotion
Capture a real admin/support touchpoint artifact and promote it if valid.

### Step 5 - Attempt one real pilot task or prove why it cannot yet run
If environment + actor paths are sufficiently active, run one real task and capture:
- session/run/task artifact
- receipt/governance reference
- connector artifact if actually involved

### Step 6 - Recompute activation-ready state from typed truth
Use only promoted REAL_PILOT artifacts for advancement.

---

## Hard rules

1. `DEMO`, `SIMULATOR`, `TEST`, and `LOCAL_SYNTHETIC` sources must never count as real pilot evidence.
2. A local-only artifact must not be promoted just because it looks similar to a real one.
3. If a real artifact cannot be represented with the current EPF-4 model, that must become a bounded remediation package rather than a fake evidence promotion.
4. No docs-only HOLD loop is acceptable if there is neither new real evidence nor a narrower blocker.
5. The launch state must remain honest: if the pilot is not truly activated, say so.

---

## Required operator-visible summaries

At minimum, the product and logs should be able to state clearly:
- whether a real pilot environment is bound
- whether a real operator access path is active
- whether a real requester exists
- whether a real tenant-admin/support touchpoint exists
- which evidence categories are still missing
- what the next exact action is
- why activation-ready is still false, if false

---

## Required test posture

EPF-5 is not primarily a new implementation milestone.
Only rerun or add tests if a bounded remediation package modifies runtime/API/shell behavior.

If no code changes are made:
- no broad validation rerun is required
- status docs must still reflect that this was an evidence-execution slice, not a runtime change

If a bounded remediation is opened:
- rerun the affected validation subset for that slice
- record why the rerun was necessary

---

## Definition of done

EPF-5 is done when one of the following is true:

### Successful advancement path
- at least one previously missing evidence category advanced using real pilot artifacts
- activation-ready state moved forward from durable REAL_PILOT truth
- blocker set narrowed materially

### Bounded remediation path
- a real external artifact was received
- current EPF-4 model could not safely represent/promote it
- a bounded remediation package was opened with exact missing field/path/behavior

### Honest activation-stop path
- no real pilot artifacts are actually available
- blocker set is as narrow and owner-bound as possible
- the system explicitly records that pilot activation remains blocked by external dependency rather than pretending hypercare is progressing normally

---

## Expected outputs from Codex

At the end, report only:
1. what real artifacts were received
2. which of them were verified
3. which of them were promoted
4. which evidence categories advanced
5. which blockers remain, each with owner + missing artifact
6. final decision: `HOLD`, `REMEDIATE`, `ROLLBACK`, or `CLOSURE_READY`
7. exact next action

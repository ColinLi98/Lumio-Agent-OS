# Pilot Activation War Room - Execution Checklist

## Purpose

This package converts the current blocked pilot state into a concrete activation sprint.

The key premise is:
- the product is not currently blocked by runtime quality,
- the pilot is blocked by missing **external activation artifacts**,
- therefore the correct next step is not another docs-only HOLD checkpoint,
- but a short, explicit, owner-driven activation effort.

This checklist is designed to answer one question:

**Can the pilot be truly activated within the next 48 hours?**

If yes, the team should capture the first real pilot evidence and restart true pilot Day 0 from the first real live artifact.
If no, the pilot should be explicitly reclassified as `PILOT_ACTIVATION_DELAYED` or `PILOT_NOT_STARTED` rather than continuing ambiguous hypercare language.

---

## Current known blocker set

The current blocker set is already narrowed and should be treated as the source of truth:

- `EXTERNAL_DEPENDENCY_PILOT_ENV_BINDING_ABSENT`
- `EXTERNAL_DEPENDENCY_OPERATOR_ACCESS_ABSENT`
- `EXTERNAL_DEPENDENCY_REQUESTER_ACTOR_ABSENT`
- `EXTERNAL_DEPENDENCY_TENANT_ADMIN_CHANNEL_ABSENT`
- `EXTERNAL_DEPENDENCY_REAL_TASK_AND_CONNECTOR_ARTIFACT_ABSENT`

These blockers must be resolved with **real external artifacts**, not inferred from simulator, demo, test, or local synthetic paths.

---

## War room operating rule

From this point forward, the team should stop creating generic docs-only HOLD checkpoints unless one of the following is true:

1. a new real external artifact was obtained,
2. a blocker was narrowed materially,
3. a bounded remediation package was opened,
4. the pilot state changed to `CLOSURE_READY`, `ROLLBACK`, `PILOT_ACTIVATION_DELAYED`, or `PILOT_NOT_STARTED`.

If none of those happened, another HOLD document does not add useful signal.

---

## War room timebox

### Activation sprint window
- Start immediately
- Hard checkpoint A: **2026-03-10**
- Hard checkpoint B: **2026-03-11**

### Decision points
- By **2026-03-10 end of day**: environment + actors + access must exist
- By **2026-03-11 end of day**: first real pilot task/session/run artifact must exist

---

## Required artifact set

The pilot must obtain the following artifacts.

### Artifact A - Real pilot environment binding
**Owner:** `pilot-commander`

**Due:** `2026-03-10`

**Required artifact**
A real `pilot-alpha-prod` environment binding record containing at minimum:
- real pilot base URL
- tenant id
- workspace id
- proof that the target is not `lumi-agent-simulator`
- proof that this environment is the real frozen pilot target

**Acceptance criteria**
- artifact source is `REAL_PILOT`
- environment status becomes `BOUND`
- simulator-only binding is not accepted
- artifact can be promoted into activation truth

**Failure wording if missing**
`Pilot environment not provisioned or not handed over.`

---

### Artifact B - Real operator access/session
**Owner:** `pilot-operator-lead`

**Due:** `2026-03-10`

**Required artifact**
A real operator access artifact containing at minimum:
- named operator identity
- real session/token or equivalent real access proof
- successful access into the real pilot environment
- at least one real operator-facing interaction record

**Acceptance criteria**
- artifact source is `REAL_PILOT`
- operator state becomes `PROVISIONED + GRANTED`
- invalid, stub, simulator, or local synthetic access does not count

**Failure wording if missing**
`Operator access not granted or not activated.`

---

### Artifact C - Named real requester
**Owner:** `pilot-commander`

**Due:** `2026-03-10`

**Required artifact**
A real requester artifact containing at minimum:
- named requester identity
- proof that this requester belongs to the real pilot scope
- readiness to initiate one real pilot task

**Acceptance criteria**
- artifact source is `REAL_PILOT`
- requester readiness is promoted into activation truth
- no placeholder or anonymous actor counts

**Failure wording if missing**
`No named requester assigned to the pilot.`

---

### Artifact D - Real tenant-admin/support touchpoint
**Owner:** `tenant-admin`

**Due:** `2026-03-10`

**Required artifact**
A real support/admin artifact containing at minimum:
- named contact or named support owner
- real communication or support channel
- one real touchpoint record (acknowledgement, setup confirmation, support exchange, or equivalent)

**Acceptance criteria**
- artifact source is `REAL_PILOT`
- tenant-admin/support readiness is promoted into activation truth
- generic role handles without a real channel do not count

**Failure wording if missing**
`No real tenant-admin/support touchpoint available.`

---

### Artifact E - First real pilot task/session/run artifact
**Owner:** `pilot-operator-lead`

**Due:** `2026-03-11`

**Prerequisites**
Artifacts A, B, C, and D must already be satisfied.

**Required artifact**
The first real pilot task chain must produce at minimum:
- real task initiation
- real session or run artifact
- real workflow artifact or receipt/governance reference
- evidence category advancement into:
  - `device_session_proof`
  - and/or `workflow_artifact_proof`

**Acceptance criteria**
- artifact source is `REAL_PILOT`
- artifact is not from simulator/demo/test/local synthetic path
- artifact promotes into evidence truth and closure evidence logs

**Failure wording if missing**
`No first real pilot task/session/run artifact exists.`

---

### Artifact F - Real connector/credential artifact (only if actually involved)
**Owner:** `connector-platform-owner`

**Due:** `2026-03-11`

**Required artifact**
If the first real pilot task genuinely touches the approved connector path, capture:
- route artifact
- connector handoff artifact
- credential or route proof summary

If the task does not involve the connector path, explicitly record:
- `Connector not involved in this task.`

**Acceptance criteria**
- only real connector involvement counts
- fabricated or synthetic connector proof is disallowed

---

## War room operating board

Track each artifact in one table.

| Artifact | Owner | Due | Current state | Evidence received? | Promoted? | Narrowest blocker |
|---|---|---:|---|---|---|---|
| A. Environment binding | pilot-commander | 2026-03-10 | Missing | No | No | missing real pilot URL/binding |
| B. Operator access | pilot-operator-lead | 2026-03-10 | Missing | No | No | missing real session/token |
| C. Requester | pilot-commander | 2026-03-10 | Missing | No | No | no named requester |
| D. Tenant-admin/support | tenant-admin | 2026-03-10 | Missing | No | No | no real touchpoint/channel |
| E. First real task | pilot-operator-lead | 2026-03-11 | Blocked | No | No | blocked by A/B/C/D |
| F. Connector proof | connector-platform-owner | 2026-03-11 | Conditional | No | No | not yet involved |

Update this table only when a real fact changes.

---

## Evidence category mapping

When artifacts are obtained, map them into these evidence categories:

- `device_session_proof`
- `workflow_artifact_proof`
- `connector_credential_proof`
- `tenant_admin_support_proof`
- `stability_safety_proof`

### Important rule
`DEMO`, `SIMULATOR`, `TEST`, and `LOCAL_SYNTHETIC` artifacts may be durably recorded, but they must never advance real pilot evidence categories.

---

## Logging requirements

When a real artifact arrives, immediately update:
- `launch-pilot-evidence-log.md`
- `launch-feedback-log.md`
- `launch-pilot-incident-log.md` (only if needed)
- `launch-pilot-closure-template.md`

When an artifact is still missing, update only:
- the war room status
- the blocker list
- the closure template blocker section

Do not fabricate progress.

---

## Decision rules

### Rule 1 - Hold is only valid if something changed
`HOLD` is only acceptable if:
- at least one real artifact was received, or
- at least one blocker was materially narrowed, or
- the team is still within a due window and ownership is explicit.

### Rule 2 - Remediate is required if deadlines are missed
If by `2026-03-10` artifacts A-D are still missing, the state should move from passive HOLD to explicit remediation/escalation.

### Rule 3 - Pilot cannot be called active without real artifacts
If the environment, operator, requester, and tenant-admin are absent, the correct state is not “pilot in progress.”
It is one of:
- `PILOT_ACCESS_PARTIALLY_AVAILABLE`
- `PILOT_ACTIVATION_IN_PROGRESS`
- `PILOT_ACTIVATION_DELAYED`
- `PILOT_NOT_STARTED`

### Rule 4 - Real Day 0 starts only after the first true pilot artifact
Do not treat simulator or docs-only hold checkpoints as true pilot Day 0.
True pilot Day 0 starts when Artifact E exists.

---

## Escalation rules

### Escalation A - Activation delayed
If artifacts A-D are still missing at `2026-03-10 23:59`, record:
- `PILOT_ACTIVATION_DELAYED`

### Escalation B - Pilot not started
If artifact E is still missing at `2026-03-11 23:59`, record:
- `PILOT_NOT_STARTED`

### Escalation C - Rollback only if real launch-critical incident appears
Do not use rollback for missing access unless there is an actual pilot execution failure or launch-critical Sev1.

---

## Completion criteria for this package

This package is complete only when one of the following is true:

1. Artifacts A, B, C, and D are obtained and promoted, and Artifact E is produced.
2. The team formally records `PILOT_ACTIVATION_DELAYED` because A-D were not delivered by the deadline.
3. The team formally records `PILOT_NOT_STARTED` because E does not exist by the next deadline.

If none of those are true, the war room remains active.

---

## Expected final output from Codex / operator team

At the end of the next execution cycle, report only:
1. Which artifacts were newly received
2. Which evidence categories advanced
3. Which blockers remain, each with owner and exact missing artifact
4. Whether the pilot state is now:
   - `PILOT_ACTIVATION_IN_PROGRESS`
   - `PILOT_ACCESS_PARTIALLY_AVAILABLE`
   - `PILOT_ACTIVATION_DELAYED`
   - `PILOT_NOT_STARTED`
   - or `REAL_EVIDENCE_RECOVERED`
5. The exact next action

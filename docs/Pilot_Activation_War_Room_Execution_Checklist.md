# Pilot Activation War Room Execution Checklist

Date opened: 2026-03-08
Window: 2026-03-08 through 2026-03-10
Current explicit pilot state: `PILOT_ACTIVATION_IN_PROGRESS`

## Purpose
Use a 48-hour war room to obtain the exact external artifacts required to activate the real pilot path.

## Hard rules
- Do not count `DEMO`, `SIMULATOR`, `TEST`, or `LOCAL_SYNTHETIC` artifacts as live pilot evidence.
- Do not declare true pilot Day 0 until the first real task/session/run artifact exists.
- Do not reopen generic hypercare hold wording while artifact blockers are specific.

## Artifact tracker

### Artifact A
- Name: real `pilot-alpha-prod` environment binding
- Owner: `pilot-commander`
- Due: `2026-03-10`
- Acceptance rule: must be a `REAL_PILOT` environment-binding artifact with real base URL, tenant id, workspace id, and a non-simulator environment

### Artifact B
- Name: named real requester
- Owner: `pilot-commander`
- Due: `2026-03-10`
- Acceptance rule: must be a `REAL_PILOT` actor-readiness artifact and promote to requester readiness

### Artifact C
- Name: real operator session/access
- Owner: `pilot-operator-lead`
- Due: `2026-03-10`
- Acceptance rule: must be a `REAL_PILOT` actor-readiness artifact with provisioned plus granted access and promote to operator readiness

### Artifact D
- Name: real tenant-admin/support touchpoint
- Owner: `tenant-admin`
- Due: `2026-03-10`
- Acceptance rule: must be a `REAL_PILOT` actor-readiness artifact with a real admin/support contact or channel and promote to tenant-admin readiness

### Artifact E
- Name: first real task/session/run artifact
- Owner: `pilot-operator-lead`
- Due: `2026-03-11`
- Acceptance rule: must come from the real activated pilot path and produce a real task/session/run/receipt artifact; this starts true pilot Day 0

### Artifact F
- Name: connector/credential artifact if actually involved
- Owner: `connector-platform-owner`
- Due: `2026-03-11`
- Acceptance rule: required only if Artifact E legitimately touches the approved connector path; otherwise record `not involved in this task`

## State model
- `PILOT_ACTIVATION_IN_PROGRESS`
  - use while artifacts A-F are being actively chased inside the war room
- `PILOT_ACCESS_PARTIALLY_AVAILABLE`
  - use when one or more of A-D are verified/promoted but the set is incomplete
- `PILOT_ACTIVATION_DELAYED`
  - record automatically if A-D remain missing by `2026-03-10`
- `PILOT_NOT_STARTED`
  - record automatically if Artifact E remains missing by `2026-03-11`
- `REAL_EVIDENCE_RECOVERED`
  - use when Artifact E is promoted and at least one real evidence category advances

## Exact next action
- secure Artifacts A-D by `2026-03-10`
- only after A-D are real and promoted, execute one real pilot task to recover Artifact E

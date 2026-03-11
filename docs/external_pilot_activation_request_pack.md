# External Pilot Activation Request Pack

Date: 2026-03-08
Owner: Codex
Status: active external request pack
Current explicit launch state: `PILOT_ACTIVATION_IN_PROGRESS`

## Purpose
Turn the current launch state from ambiguous hypercare hold language into an explicit external activation dependency package.

This pack does **not** claim live pilot progress.
It exists to obtain the first real pilot artifacts required by the existing EPF-4 intake, verification, and promotion system.

## Current state
- The product/runtime path for pilot activation exists.
- The current workspace does **not** contain a real pilot environment binding.
- The current workspace does **not** contain real operator access/session material for `pilot-alpha-prod`.
- The only local auth material currently visible is Vercel OIDC token scope for:
  - `lumi-agent-simulator` / `development`
  - `lumi-website` / `development`
- The current workspace does **not** contain a named real requester artifact.
- The current workspace does **not** contain a real tenant-admin/support touchpoint artifact.
- The 48-hour war room is now active.
- Therefore the current operational state is `PILOT_ACTIVATION_IN_PROGRESS`, not generic `HOLD`.
- True pilot Day 0 still has **not** started because Artifact E does not yet exist.

## Artifact requests

| Artifact | Owner | Due date | Acceptance rule |
|---|---|---|---|
| Real `pilot-alpha-prod` environment binding | `pilot-commander` | `2026-03-10` | Must be submitted as a `REAL_PILOT` environment-binding artifact, must name the real base URL, tenant id, and workspace id, and must not point to `lumi-agent-simulator` or any demo/simulator path |
| Named real requester | `pilot-commander` | `2026-03-10` | Must be submitted as a `REAL_PILOT` actor-readiness artifact with a named requester identity and must promote to requester readiness |
| Real operator session/access | `pilot-operator-lead` | `2026-03-10` | Must be submitted as a `REAL_PILOT` actor-readiness artifact with provisioned + granted access semantics and must promote to operator readiness |
| Real tenant-admin/support touchpoint | `tenant-admin` | `2026-03-10` | Must be submitted as a `REAL_PILOT` actor-readiness artifact with a real admin/support channel or named contact and must promote to tenant-admin readiness |
| First real task/session/run artifact | `pilot-operator-lead` | `2026-03-11` | May only be accepted after the environment binding plus requester/operator paths are real and active; must link to a real task/session/run/receipt path and promote into `device_session_proof` and/or `workflow_artifact_proof` as applicable |
| Connector/credential artifact if actually involved | `connector-platform-owner` | `2026-03-11` | Required only if the first real task legitimately touches the approved connector path; must be submitted as `REAL_PILOT` and promote into `connector_credential_proof`; otherwise record `not involved in this task` explicitly |

## Submission path
All requested artifacts must flow through the existing EPF-4 path:
1. activation package handoff
2. artifact intake
3. verification
4. promotion

Artifacts from `DEMO`, `SIMULATOR`, `TEST`, or `LOCAL_SYNTHETIC` sources do not satisfy this pack.

## Explicit state model

### `PILOT_ACTIVATION_IN_PROGRESS`
Use when:
- the external request pack is issued
- and at least one required external artifact is actively outstanding or under intake/review
- but activation-ready is still false

### `PILOT_ACCESS_PARTIALLY_AVAILABLE`
Use when:
- one or more real environment/actor artifacts have been verified or promoted
- but the full actor/environment set is still incomplete

### `REAL_EVIDENCE_RECOVERED`
Use when:
- at least one real task/session/run artifact has been verified and promoted
- and at least one previously missing evidence category advances from true `REAL_PILOT` truth

### `PILOT_ACTIVATION_DELAYED`
Use when:
- Artifacts A-D remain missing by `2026-03-10`

### `PILOT_NOT_STARTED`
Use when:
- Artifact E remains missing by `2026-03-11`

## State transition rules
- Current state on `2026-03-08`: `PILOT_ACTIVATION_IN_PROGRESS`
- Move to `PILOT_ACCESS_PARTIALLY_AVAILABLE` when at least one environment or actor artifact is verified/promoted but the full activation set is incomplete.
- Move to `PILOT_ACTIVATION_DELAYED` if A-D are still missing on `2026-03-10`.
- Move to `PILOT_NOT_STARTED` if Artifact E is still missing on `2026-03-11`.
- Move to `REAL_EVIDENCE_RECOVERED` when the first real task/session/run artifact is promoted and at least one missing evidence category advances.

## Next action
- external owners provide the six required artifacts above
- EPF-5 reruns using only those real artifacts

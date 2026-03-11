# Launch Pilot Incident Log

Append-only.

## 2026-03-08
- Severity: `SEV3`
- State: `PILOT_NOT_ACTIVATED`
- Title: External pilot activation artifacts absent
- Owner: `pilot-commander`
- Summary: real pilot activation cannot begin because the real environment binding, operator access, requester, and tenant-admin/support artifacts are still absent from this workspace
- Mitigation: use the external pilot activation request pack and EPF-4 intake/promotion path; do not treat simulator/demo/test/local artifacts as acceptable substitutes

## 2026-03-08 - War Room Opened
- Severity: `SEV3`
- State: `PILOT_ACTIVATION_IN_PROGRESS`
- Title: 48-hour pilot activation war room active
- Owner: `pilot-commander`
- Summary: artifact chase is active; the state is no longer an ambiguous hold, but pilot Day 0 is still blocked until Artifact E exists
- Mitigation: collect A-D by `2026-03-10`; if they remain missing, record `PILOT_ACTIVATION_DELAYED`

## 2026-03-08 - Blocker Set Narrowed
- Severity: `SEV3`
- State: `REMEDIATE`
- Title: Pilot activation blocker set narrowed to exact missing artifacts
- Owner: `pilot-commander`
- Summary: the blocker set is now explicitly narrowed to `A` missing real `pilot-alpha-prod` environment binding, `B` missing named requester actor, `C` missing real operator session/access, `D` missing tenant-admin/support touchpoint, `E` blocked first real task/session/run artifact, and `F` conditional connector proof. The current workspace still only shows the simulator Vercel binding and no live auth material.
- Mitigation: keep the artifact-by-artifact tracker authoritative, collect `A-D` by `2026-03-10`, and reclassify to `PILOT_ACTIVATION_DELAYED` if any remain missing after that date.

## 2026-03-08 - Operator Access Scope Narrowed
- Severity: `SEV3`
- State: `REMEDIATE`
- Title: Local auth material exists but is simulator-only
- Owner: `pilot-operator-lead`
- Summary: the workspace does contain local Vercel OIDC auth material, but the decoded scope is limited to `lumi-agent-simulator` / `development` and `lumi-website` / `development`. No token or binding was found for `pilot-alpha-prod`, so Artifact `C` remains missing as a live-pilot access artifact rather than a total absence-of-auth problem.
- Mitigation: obtain real operator session/access for `pilot-alpha-prod` and promote it through the EPF-4 path; do not treat simulator or website development tokens as `REAL_PILOT` proof.

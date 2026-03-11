# EPF-5 - Real Pilot Activation Execution, Verified Artifact Promotion, and Live Evidence Closure

Date: 2026-03-07
Owner: Codex
Status: blocked by external activation inputs
Current explicit launch state: `PILOT_ACTIVATION_IN_PROGRESS`

## Goal
Use the existing EPF-4 activation package/intake/review/promotion system to execute real pilot activation and advance real evidence categories, or else narrow the blocker/remediation state honestly.

## Real execution result
- No real pilot environment binding artifact was available in this workspace.
- No real operator access/session artifact was available in this workspace.
- No named real requester artifact was available in this workspace.
- No tenant-admin/support touchpoint artifact was available in this workspace.
- No real task/session/run/receipt artifact could be created because the real pilot path never activated.
- No connector/credential artifact could be captured because no real pilot task path executed.

## Narrowed blocker proof
- The only locally bound Vercel project metadata is `.vercel/project.json` for `lumi-agent-simulator`.
- The workspace does expose local Vercel OIDC tokens, but they are scoped only to:
  - project `lumi-agent-simulator` / environment `development`
  - project `lumi-website` / environment `development`
- No local token or binding was found for `pilot-alpha-prod` or any other non-simulator pilot environment.
- No local Vercel auth files are present under:
  - `~/.vercel`
  - `~/.config/vercel`
  - `~/.netrc`
- Therefore the EPF-4 receive/verify/promote path still cannot honestly accept a `REAL_PILOT` environment or actor artifact from this machine; the narrower truth is that local auth material exists, but only for simulator/website development scope.

## Evidence categories advanced
- none

## Final decision
- `REMEDIATE`

## Exact next action
- obtain the real pilot base URL, real operator session/token, named requester artifact, and tenant-admin/support touchpoint from external owners, then rerun EPF-5 through the existing EPF-4 package/intake/promotion path.
- use the external pilot activation request pack as the authoritative owner/due-date/acceptance reference
- use the Pilot Activation War Room checklist as the 48-hour execution frame

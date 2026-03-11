# Launch Feedback Log

Append-only.

## 2026-03-08
- Bucket: `pilot_activation_dependencies`
- State: `PILOT_NOT_ACTIVATED`
- Observation: current workspace has the product/runtime activation path but does not have the external artifacts required to activate a real pilot
- Action: external request pack issued with exact owners, due dates, and acceptance rules

## 2026-03-08 - War Room Opened
- Bucket: `pilot_activation_dependencies`
- State: `PILOT_ACTIVATION_IN_PROGRESS`
- Observation: the blocker is now managed as a 48-hour artifact chase, not a generic hypercare hold
- Action: artifacts A-F are now the only tracked activation path

## 2026-03-08 - Blocker Narrowing
- Bucket: `pilot_activation_dependencies`
- State: `REMEDIATE`
- Observation: the blocker set is now expressed as exact missing artifacts rather than one broad absence statement: `A` environment binding, `B` requester, `C` operator access, `D` tenant-admin/support touchpoint, `E` first real task/run blocked on `A-D`, and `F` conditional connector proof only if `E` touches the approved path
- Action: use the closure-template tracker plus the external request pack as the authoritative owner/due/missing-artifact view; do not open another generic hold entry unless a real artifact arrives, the blocker narrows again, or the due-date rules force reclassification

## 2026-03-08 - Auth Scope Narrowing
- Bucket: `pilot_activation_dependencies`
- State: `REMEDIATE`
- Observation: local auth material is present, but it is narrowed to Vercel OIDC scope for `lumi-agent-simulator` and `lumi-website` development only; this does not satisfy Artifact `C` for `pilot-alpha-prod`
- Action: request real operator session/access for `pilot-alpha-prod`; do not treat simulator or website development tokens as live pilot access evidence

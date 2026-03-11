# Support Escalation

Date: 2026-03-11
Audience: Demo host, field engineer, internal support, admin owner

## Purpose

Provide a simple escalation model for the current enterprise workspace platform package.

## First-line checks

Before escalating:

1. Confirm the user is in the intended workspace mode.
2. Confirm the URL is not stale or malformed.
3. Confirm the expected `oa_role`, section, member, and task focus are present.
4. Confirm whether the issue is:
   - sandbox / preview only
   - current-workspace auth/write posture
   - data continuity
   - CTA disablement or capability gating

## Role-based escalation path

- Request / workflow issue:
  - Requester -> Operator -> Tenant Admin
- Access / seat / membership issue:
  - Workspace Admin -> Tenant Admin
- Policy / blocker rationale issue:
  - Policy / Governance Admin
- Integration / readiness issue:
  - Integration Admin -> Tenant Admin
- Audit / receipt traceability issue:
  - Auditor -> Policy / Governance Admin -> Tenant Admin

## What to capture in every escalation

- URL used
- workspace mode
- active `oa_role`
- selected section
- selected member
- selected task
- visible blocker / error message
- whether the issue happened in `local_lab` or current workspace

## Demo-host guidance

If a stakeholder asks for something beyond current scope, answer clearly:

- Okta OIDC is the only identity target currently in scope.
- `local_lab` is sandbox / preview.
- Real pilot and full production closure are not what this package is claiming.
- Do not speculate on unsupported provider or rollout breadth.

## Current non-blocking known gaps

- Broader live admin mutation depth is still intentionally limited.
- Some warnings during build/tests remain non-blocking.
- The package is designed for credible preview and field evaluation, not for claiming full enterprise rollout closure.

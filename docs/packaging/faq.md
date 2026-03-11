# Packaging FAQ

Date: 2026-03-11

## Is this a consumer app?

No. The current product framing is B2B enterprise workspace platform only.

## What is the core product?

The current B-end product is **Lumio**. It is the enterprise workspace shell:

- enterprise workspace cockpit
- role-aware workflow governance console
- governed request-to-audit flow
- enterprise control plane sections

## What roles are in scope?

The current foundation is the OA v1 nine-role model only:

- `REQUESTER`
- `APPROVER`
- `OPERATOR`
- `REVIEWER`
- `TENANT_ADMIN`
- `WORKSPACE_ADMIN`
- `POLICY_GOVERNANCE_ADMIN`
- `INTEGRATION_ADMIN`
- `AUDITOR`

No tenth role is in scope for the current package.

## Which enterprise login path is supported?

Okta OIDC only.

## How does Lumio differ from Lumi?

- `Lumio` is the B-end governed workspace platform
- `Lumi` is the C-end product naming

## Is this a full IAM product?

No. The platform shows membership, access posture, role assignments, invites, and readiness, but it is not framed as a standalone IAM suite.

## What is `local_lab`?

`local_lab` is the sandbox / preview workspace used to demonstrate governed workflow continuity and role-aware control-plane visibility.

It is not a production tenant and it is not real-pilot evidence.

## Does this package claim real-pilot closure?

No.

## Does this package claim full production completeness?

No.

## What can a buyer evaluate today?

A buyer can evaluate:

- workspace shell quality
- governed task flow
- role-aware workflow visibility
- members/access control-plane framing
- policy/governance linkage
- Okta-only readiness framing
- audit and receipt traceability

## What remains intentionally deferred?

- broader live enterprise rollout depth
- broader provider coverage
- richer live admin mutation depth
- full pilot evidence closure
- full production deployment completeness

## Why keep provider scope narrow?

To keep the package honest and aligned with the actual implementation. Current enterprise login framing is intentionally locked to Okta OIDC.

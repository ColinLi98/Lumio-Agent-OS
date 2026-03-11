# Lumio One-Pager (EN)

Date: 2026-03-11
Audience: buyer, sponsor, enterprise admin stakeholder, internal field team

## What Lumio is

Lumio is a governed enterprise workspace preview.

It is an enterprise workspace platform, not a consumer app and not a standalone IAM product. It brings governed work, role-aware coordination, readiness posture, membership visibility, policy context, and audit traceability into one enterprise workspace shell.

## Core product shape

- Enterprise workspace platform
- Governed flow:
  - Request
  - Approval
  - Operations
  - Review
  - Audit
- OA v1 nine-role model:
  - `REQUESTER`
  - `APPROVER`
  - `OPERATOR`
  - `REVIEWER`
  - `TENANT_ADMIN`
  - `WORKSPACE_ADMIN`
  - `POLICY_GOVERNANCE_ADMIN`
  - `INTEGRATION_ADMIN`
  - `AUDITOR`
- Okta OIDC as the only enterprise login target in scope

## What a buyer can evaluate now

- One governed workspace shell instead of disconnected admin pages
- One governed flow visible across multiple role lenses on the same task
- Current-workspace depth that is becoming more credible for buyer-facing and internal review flows
- `local_lab` as a sandbox / preview workspace for guided evaluation
- Members & Access, Policy & Governance, Integration & Readiness, and Audit & Reporting as part of the same control plane
- Explicit mutation boundaries:
  - allowed
  - blocked
  - denied
  - fail-closed
  - read-only

## Key sections

- Workspace Overview
- Organization & Workspace
- Members & Access
- Trial Join
- Request Center
- Approval Center
- Review Center
- Operations Console
- Integration & Readiness Center
- Policy & Governance Center
- Audit & Reporting Center

## Why this matters

Lumio gives enterprise teams one place to explain:

- what is blocked
- why it is blocked
- who owns the next action
- what evidence supports the current state
- what the audit receipt and evidence bundle mean

## Maturity framing

Use this wording consistently:

- Lumio is a governed enterprise workspace preview
- `current workspace` is the path being deepened into the more credible enterprise path
- `local_lab` is a sandbox / preview workspace
- the package does not claim full production closure
- the package does not claim full pilot closure
- the package does not claim provider breadth beyond Okta OIDC

## What Lumio does not claim

- full production deployment completeness
- full pilot closure
- broader IdP or provider coverage
- a standalone IAM suite
- unsupported live mutation breadth

## Best evaluation path

1. Start in `current workspace` to show the governed enterprise path.
2. Walk the governed flow on one task.
3. Use the control plane to show policy basis, readiness, member/access boundaries, audit receipt, and evidence bundle continuity.
4. Use `local_lab` only where a sandbox example is helpful, and label it clearly as preview-only.

## Safe proof points

- governed flow is implemented
- OA v1 nine-role model is implemented as the product backbone
- current-workspace reliability guardrails and smoke coverage exist
- mutation boundaries are explicit and honest
- audit receipt and evidence bundle framing are visible in product
- Okta OIDC-only readiness is explicit in product

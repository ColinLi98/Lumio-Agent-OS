# Lumio Admin Onboarding Pack

Date: 2026-03-11
Audience: tenant admin, workspace admin, integration admin, policy/governance admin, auditor, demo host

## Purpose

Help a new internal operator or field teammate explain and operate the current Lumio package without drifting from the actual product.

## Canonical terminology

Use these exact terms:

- enterprise workspace platform
- governed flow
- OA v1 nine-role model
- `current workspace`
- `local_lab`
- readiness
- audit receipt
- evidence bundle

Avoid mixing these with looser alternatives in buyer-facing settings.

## Product framing

Say:

- Lumio is a governed enterprise workspace preview.
- It is not a consumer product.
- It is not a standalone IAM product.
- Okta OIDC is the only enterprise login target in scope.
- OA v1 nine roles are the product backbone.
- `current workspace` is the enterprise path being deepened.
- `local_lab` is sandbox / preview.

## First-day tour

1. Workspace Overview
2. Request Center
3. Approval Center
4. Operations Console
5. Review Center
6. Audit & Reporting Center
7. Members & Access
8. Policy & Governance Center
9. Integration & Readiness Center
10. Organization & Workspace

## Role-to-section quick map

- `TENANT_ADMIN`
  - Integration & Readiness Center
  - Organization & Workspace
  - Members & Access
- `WORKSPACE_ADMIN`
  - Members & Access
  - Trial Join
  - Organization & Workspace
- `POLICY_GOVERNANCE_ADMIN`
  - Policy & Governance Center
  - Audit & Reporting Center
- `INTEGRATION_ADMIN`
  - Integration & Readiness Center
  - Organization & Workspace
- `AUDITOR`
  - Audit & Reporting Center
  - Policy & Governance Center

## Demo-safe usage matrix

### Use `current workspace` when you want to show

- the more credible enterprise path
- route restore / role switch / member/task continuity
- explicit mutation boundaries
- current-workspace readiness framing
- current-workspace audit receipt and evidence bundle continuity

### Use `local_lab` when you want to show

- sandbox rehearsal
- guided multi-role preview
- simple demo setup without implying live enterprise depth

## Admin workflow examples

### `TENANT_ADMIN`

- explain why a workspace is not ready
- track the next readiness action
- connect evidence gaps back to governed progression

### `WORKSPACE_ADMIN`

- inspect member/access boundaries
- explain invite lifecycle and join trace
- explain workspace-local escalation boundaries

### `POLICY_GOVERNANCE_ADMIN`

- explain policy basis
- explain decision rationale
- explain exception / waiver posture

### `INTEGRATION_ADMIN`

- explain Okta OIDC-only gate posture
- explain connector/credential gating
- explain the next readiness step

### `AUDITOR`

- explain the audit receipt
- explain the evidence bundle
- explain what export means today and what it does not mean

## Common buyer questions

- Why is `current workspace` important?
  - Because it is the more credible enterprise path and now carries explicit guardrails, restore behavior, and mutation boundaries.
- Why keep `local_lab`?
  - Because it is the sandbox / preview workspace for guided evaluation without overclaiming live enterprise maturity.
- Why only Okta OIDC?
  - Because that is the only supported login target in scope today, and the package keeps that boundary explicit.

## Onboarding checklist

- Can the admin explain the governed flow?
- Can the admin explain the difference between `current workspace` and `local_lab`?
- Can the admin explain at least one role-specific workflow?
- Can the admin explain readiness, audit receipt, and evidence bundle without overclaiming maturity?

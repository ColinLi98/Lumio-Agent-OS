# Enterprise Workspace Platform One-Pager

Date: 2026-03-11
Scope: Buyer-facing preview package
Audience: Enterprise operators, workflow owners, governance leads, solution buyers

## What it is

Lumi is a B2B enterprise workspace platform built around a governed workspace cockpit and role-aware workflow governance console.

It brings request, approval, operations, review, members/access, policy/governance, audit/reporting, and integration/readiness into one workspace shell instead of scattering those concerns across disconnected tools or demo-only pages.

## What it is for

- Enterprises that want one workspace-level operating surface for governed request handling
- Teams that need visible handoffs between requester, approver, operator, reviewer, and auditor roles
- Admin and governance stakeholders who need policy, access, readiness, and audit posture inside the same B2B shell

## Product framing

The current platform is organized around:

- Enterprise Workspace Cockpit
- Role-Aware Workflow Governance Console
- B2B Workspace Platform with these core sections:
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

## Current foundation

- OA v1 nine-role model
  - `REQUESTER`
  - `APPROVER`
  - `OPERATOR`
  - `REVIEWER`
  - `TENANT_ADMIN`
  - `WORKSPACE_ADMIN`
  - `POLICY_GOVERNANCE_ADMIN`
  - `INTEGRATION_ADMIN`
  - `AUDITOR`
- Okta OIDC is the only enterprise login target in scope
- `local_lab` is the sandbox / preview workspace for guided evaluation
- Current-workspace enterprise writes remain fail-closed when readiness is ambiguous

## What a buyer can see today

- A workspace-first shell instead of a consumer-style app
- A governed request-to-audit chain across request, approval, operations, review, and audit
- Role-aware next action, blocker, timeline, and evidence views for the same task
- Members, seat, invite, join, and access posture inside the same workspace
- Policy, readiness, and audit surfaces that share the same task and evidence context

## What this package does not claim

- It does not claim full real-pilot closure
- It does not claim full production deployment completeness
- It does not claim provider breadth beyond Okta OIDC
- It does not claim consumer-product scope
- It does not treat `local_lab` as a production tenant

## Best-fit evaluation path

1. Start in Workspace Overview to show the role-aware cockpit.
2. Walk Request -> Approval -> Operations -> Review -> Audit on one task.
3. Move into Members & Access, Policy & Governance, Integration & Readiness, and Audit & Reporting.
4. Use `local_lab` to explain how the preview works without overclaiming real-pilot status.

## Commercial posture

This is a buyer-facing preview package for a B2B governed workspace platform.

It is credible where it is implemented:

- workspace shell
- governed flow
- role-aware views
- control-plane sections
- local browser automation and regression coverage

It is intentionally honest where maturity is still partial:

- broader live enterprise rollout depth
- richer live admin mutations
- real-pilot evidence closure
- full production packaging and support closure

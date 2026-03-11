# Architecture And Governance

Date: 2026-03-11
Scope: External technical framing for the current enterprise workspace platform

## Overview

The current B-end product is **Lumio**, a B2B enterprise workspace platform. It is not a consumer app and not a separate IAM product.

Its current architecture is centered on:

- one enterprise workspace shell
- one governed task flow across core workflow sections
- one enterprise control plane across members, policy, readiness, and audit
- one normalized platform contract for route, role, task, member, and CTA semantics

## Workspace shell

The workspace shell is the product entry for the B2B platform.

In current naming:

- `Lumio` refers to the B-end governed workspace platform
- `Lumi` refers to the C-end product naming

It provides:

- workspace-first navigation
- role switching across the OA v1 role set
- section-aware deep links
- member and task focus via URL state
- fail-closed current-workspace write posture

## Governed workflow chain

The current governed chain is:

`Request -> Approval -> Operations -> Review -> Audit`

This chain is represented consistently across the platform through the shared stage model and governed-flow surface. The same task can be understood from different role lenses without changing the underlying task/evidence identity.

## Enterprise control plane

The current control plane is spread across existing sections, not a separate admin product:

- Organization & Workspace
  - workspace ownership
  - admin boundaries
  - escalation path
  - workspace state / health
- Members & Access
  - seat scope
  - invite lifecycle
  - join trace
  - role and access boundary changes
- Integration & Readiness Center
  - Okta OIDC-only readiness checklist
  - gate states
  - environment / connector / credential posture
  - why-ready / why-not-ready explanation
- Policy & Governance Center
  - policy basis
  - decision rationale
  - exception / waiver posture
  - blocker linkage back to policy basis
- Audit & Reporting Center
  - receipt timeline
  - evidence bundle framing
  - export bundle framing

## Identity and access framing

Current identity scope is intentionally narrow:

- Okta OIDC only
- no provider expansion
- no separate IAM console

The platform shows enterprise membership and access posture, but it is not positioned as a general-purpose IAM suite.

## Sandbox and deployment honesty

`local_lab` is the guided sandbox / preview workspace.

It is used to show:

- multi-role workflow comprehension
- shared task continuity
- control-plane visibility

It is not used to claim:

- real-pilot completion
- production tenant status
- provider breadth
- complete live enterprise rollout depth

## Operational posture

The shell favors explicit visibility over silent progression:

- malformed or stale links fall back safely
- non-actionable CTAs are disabled with reasons
- runtime failures surface explicit fallback states
- current-workspace writes fail closed when readiness is missing or ambiguous

## What is deliberately deferred

- provider expansion beyond Okta OIDC
- a tenth role
- a separate workflow engine
- a separate IAM product surface
- full real-pilot closure claims
- full production deployment completeness claims

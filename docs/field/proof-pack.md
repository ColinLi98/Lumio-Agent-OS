# Lumio Proof Pack

Date: 2026-03-11
Audience: buyer, internal review, field team
Purpose: support buyer conversations with implemented facts instead of unsupported maturity claims

## Proof-pack rules

- Use implemented product facts only.
- Keep maturity framing honest.
- Pair every proof point with a “do not claim” boundary.

## Proof 1: Governed flow is real in the product

What exists today:

- Lumio exposes one governed flow:
  - Request
  - Approval
  - Operations
  - Review
  - Audit
- The same task is visible across multiple role-aware views.

Safe claim:

- “Lumio already supports a governed flow narrative inside one enterprise workspace shell.”

Do not claim:

- “Every enterprise workflow is already production-complete.”

## Proof 2: OA v1 nine-role model is the product backbone

What exists today:

- OA v1 nine roles are implemented and used as the role backbone for the workspace shell and control-plane framing.

Safe claim:

- “The role model is already part of how Lumio structures governed work and control-plane visibility.”

Do not claim:

- “Role expansion is broad or finished beyond the current OA v1 model.”

## Proof 3: Current-workspace path has explicit reliability guardrails

What exists today:

- current-workspace route restore handling
- stale-state handling
- malformed URL handling
- explicit CTA blocked / denied / fail-closed behavior
- current-workspace smoke matrix
- current-workspace browser smoke in release baseline

Safe claim:

- “The current-workspace path now has explicit reliability guardrails and test coverage.”

Do not claim:

- “The whole repository baseline is fully green.”

## Proof 4: Members & Access is more than a roster

What exists today:

- boundary history
- change history
- invite lifecycle
- join trace
- seat/member/access state transitions
- workspace admin boundary visibility

Safe claim:

- “Members & Access already explains workspace participation and access change posture inside the governed workspace.”

Do not claim:

- “Lumio is a general-purpose IAM suite.”

## Proof 5: Policy is tied to governed flow

What exists today:

- policy basis
- decision trace
- decision rationale
- exception / waiver state
- blocked reason linkage back to policy basis

Safe claim:

- “Policy and governance are connected to the live blocker and governed flow, not just a static admin page.”

Do not claim:

- “Live policy-waiver mutation is broadly available.”

## Proof 6: Readiness is tied to one supported enterprise target

What exists today:

- readiness checklist
- gate owner
- gate state
- why ready / why not ready
- next action
- gate transitions
- Okta OIDC-only framing

Safe claim:

- “Readiness is implemented as an honest, role-aware operating view around the one supported enterprise login target.”

Do not claim:

- “Multiple IdP providers are already supported.”

## Proof 7: Audit receipt and evidence bundle are part of the product story

What exists today:

- audit receipt
- receipt completeness
- traceability view
- evidence bundle continuity
- export boundary clarity

Safe claim:

- “Lumio already exposes an audit receipt and evidence bundle story in the governed workspace preview.”

Do not claim:

- “Audit export is already a full production-grade export program.”

## Proof 8: `local_lab` and `current workspace` are clearly separated

What exists today:

- `local_lab` is explicitly framed as sandbox / preview
- `current workspace` is framed as the more credible enterprise path

Safe claim:

- “The package is honest about sandbox versus current-workspace maturity.”

Do not claim:

- “`local_lab` is equivalent to live enterprise deployment proof.”

## How to use this proof pack

Use it in this order:

1. governed flow
2. role model
3. current-workspace reliability
4. members/access
5. policy
6. readiness
7. audit receipt and evidence bundle

This keeps the discussion anchored in platform facts instead of future promises.

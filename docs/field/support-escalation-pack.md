# Lumio Support / Escalation Pack

Date: 2026-03-11
Audience: field engineer, demo host, internal support, product owner

## Purpose

Standardize how Lumio issues are classified, explained, and escalated during buyer-facing and internal review activity.

## First-line support framing

Before escalating, classify the issue by:

- workspace mode
  - `current workspace`
  - `local_lab`
- path type
  - governed flow
  - control plane
  - route/restore
  - CTA/mutation
- posture
  - allowed
  - blocked
  - denied
  - fail-closed
  - no-access

## Minimum capture checklist

- exact URL
- workspace mode
- active `oa_role`
- selected section
- selected member
- selected task
- visible blocker or error text
- whether the issue is in `current workspace` or `local_lab`
- whether the CTA was disabled, hidden, or failed after click

## Current-workspace diagnostics to capture

If available in browser logs or internal diagnostics, note:

- `route_warning`
- `route_restore_failure`
- `stale_link`
- `load_failure`
- `cta_blocked`
- `cta_execution_failed`
- `runtime_boundary`

## Escalation map

### Route / restore issue

- Field engineer
- Product engineering

Typical examples:

- malformed current-workspace URL state
- stored route restore failure
- unsupported deep-link params

### Access / membership issue

- Workspace Admin
- Tenant Admin
- Product engineering if the issue looks like wrong capability gating

Typical examples:

- member focus mismatch
- invite lifecycle confusion
- fail-closed membership mutation

### Policy / blocker rationale issue

- Policy / Governance Admin
- Product owner

Typical examples:

- blocked reason unclear
- exception / waiver state unclear
- policy basis not obvious enough

### Readiness issue

- Integration Admin
- Tenant Admin
- Product engineering if gate state looks wrong

Typical examples:

- gate owner unclear
- why-ready / why-not-ready mismatch
- next action mismatch

### Audit / receipt issue

- Auditor
- Policy / Governance Admin
- Product engineering if receipt/trace continuity looks broken

Typical examples:

- audit receipt incomplete
- evidence bundle mismatch
- export interpretation confusion

## Field-safe explanations

### If the CTA is blocked

Say:

- “The system is intentionally exposing the boundary. It is visible, but not available under the current policy, readiness, or access state.”

### If the CTA is denied

Say:

- “The current role does not have authority for this action in the current workspace.”

### If the CTA is fail-closed

Say:

- “The product is intentionally refusing the write because the required enterprise safety conditions are not ready.”

### If the issue is in `local_lab`

Say:

- “`local_lab` is the sandbox / preview workspace. It is useful for rehearsal, but it is not the same maturity claim as current workspace.”

## What not to say

- do not promise unsupported providers
- do not say the product is fully production ready
- do not say the pilot is fully closed
- do not describe `local_lab` as live enterprise proof

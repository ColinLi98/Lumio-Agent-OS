# Agent Kernel Pilot Operator Guide

Decision date: 2026-03-07
Scope: controlled enterprise pilot only

## Purpose
Give pilot support and ops teams one readable guide for daily checks, common case handling, and escalation without requiring engineers to inspect raw ledger or store state.

## Operator role boundary
- Pilot operators own first-line triage, customer coordination, and evidence capture.
- Tenant admins own customer approvals, business escalations, and access decisions.
- Platform engineering owns runtime, control-plane, projection, and deployment drift incidents.
- Security/compliance owners own audit-export exceptions, legal-hold escalation, and credential-compromise review.

## Primary operator surfaces
- `GET /api/agent-kernel/observability/summary`
  - use for task health, open alerts, degraded reasons, correlation id, and on-call guidance
- `GET /api/agent-kernel/compliance/summary`
  - use for audit export status, deletion-request posture, and legal-hold handling
- `GET /api/agent-kernel/deployment/summary`
  - use for deployment stage, tenant isolation, region posture, and secret-scope drift
- `GET /api/agent-kernel/connectors/platform/health`
  - use for connector health, retry pressure, rate limits, and dead-letter visibility

## Daily operating cadence
1. Check pilot deployment summary first.
   - Confirm `status=READY`.
   - If `DEGRADED`, stop rollout expansion and escalate according to the matrix below.
2. Check pilot observability summary.
   - Confirm no unresolved `SEV1` or `SEV2` alerts.
   - Confirm no unexplained degraded tasks or stale claims.
3. Check connector platform health.
   - Confirm the frozen `generic_https_webhook` and `advisor_crm_compliance_handoff` adapters remain route-eligible.
4. Check compliance summary.
   - Confirm no unresolved audit export failures.
   - Confirm any deletion or legal-hold requests have documented follow-up.

## Common case handling

### Case 1: Task is stalled, failed, or degraded
- First source:
  - observability summary
- What to look for:
  - `TASK_FAILED`
  - `DEAD_LETTER_OPEN`
  - `STALE_CLAIM_ACTIVE`
  - `PROJECTION_REBUILD_REQUIRED`
- Operator action:
  - capture `task_id`, `correlation_id`, `run_id`
  - classify the issue by the existing observability alert or degraded reason
  - follow the relevant step in:
    - `docs/agent-kernel-oncall-runbook.md`
    - `docs/agent-kernel-degraded-mode-recovery-playbook.md`
- Escalate to platform engineering if:
  - the same task degrades again after one bounded replay/recovery attempt
  - projection rebuild is required
  - stale claims continue accumulating

### Case 2: Connector, vault, or delivery degradation
- First source:
  - connector platform health
- What to look for:
  - rate limit growth
  - retry or timeout spikes
  - dead-lettered deliveries
  - credential or route ineligible state
- Operator action:
  - confirm whether the issue is payload/business, credential lifecycle, or endpoint health
  - use the existing webhook credential lifecycle path only
  - keep the route blocked if credential status is revoked, compromised, expired, or unhealthy
- Escalate to:
  - platform engineering for transport/runtime issues
  - security owner for suspected credential compromise
  - tenant admin if business delivery is blocked

### Case 3: Customer asks for audit export, deletion, or legal-hold response
- First source:
  - compliance summary
- Operator action:
  - use the bounded compliance APIs only
  - record every request through the durable deletion/audit-export path
  - follow `docs/agent-kernel-compliance-operations-runbook.md`
- Escalate to security/compliance owner if:
  - `legal_hold_asserted=true`
  - export hashing/integrity verification fails
  - customer expects destructive delete, which remains unsupported in the frozen pilot

### Case 4: Deployment drift or isolation concern
- First source:
  - deployment summary
- What to look for:
  - `multiple_active_tenants_observed`
  - `identity_and_vault_tenant_mismatch`
  - `primary_region_missing`
  - `vault_scope_not_environment_partitioned`
- Operator action:
  - stop rollout changes
  - preserve current local-first behavior
  - collect the summary output and the affected tenant/workspace ids
- Escalate immediately to platform engineering.

## Escalation matrix
| Trigger | Primary owner | Secondary owner | Response expectation |
|---|---|---|---|
| task failure/degraded run | Pilot operator | Platform engineering | triage within 15 min in active support window |
| connector or credential issue | Pilot operator | Platform engineering / security | acknowledge within 15 min |
| audit export or deletion request | Pilot operator | Security/compliance owner | acknowledge same business day |
| deployment drift or tenancy issue | Pilot operator | Platform engineering | immediate escalation |
| business approval or customer-impacting degraded mode | Tenant admin | Pilot operator | same business hour |

## Evidence operators must capture
- `task_id`
- `correlation_id`
- `run_id` when present
- alert or degraded reason code
- current operator action taken
- next owner and due time

## Do not do
- Do not edit raw durable state.
- Do not rewrite or delete ledger history.
- Do not claim legal-hold automation or destructive delete.
- Do not widen the pilot beyond the frozen advisor workflow, Okta, Vault, webhook, and single-tenant deployment path.

## Companion references
- `docs/agent-kernel-oncall-runbook.md`
- `docs/agent-kernel-degraded-mode-recovery-playbook.md`
- `docs/agent-kernel-compliance-operations-runbook.md`
- `docs/agent-kernel-pilot-deployment-baseline.md`

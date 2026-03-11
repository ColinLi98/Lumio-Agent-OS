# Agent Kernel Security and Privacy Questionnaire Starter Pack

Version: `PILOT_2026_03_07`
Scope: controlled enterprise pilot only

## Product and deployment scope
- Launch scope is one frozen workflow template family: advisor workflow execution with evidence and approval gates.
- Launch template: pre-meeting prep -> post-meeting notes -> CRM-ready draft -> compliance handoff package.
- Deployment model: vendor-managed single-tenant cloud, one staging environment, one production environment, one primary region per pilot tenant.

## Identity and access
- Supported enterprise identity path: Okta OIDC plus bounded Okta-SCIM-like directory sync.
- Admin actions require an active enterprise session and durable role binding.
- Supported admin roles for the pilot are `TENANT_ADMIN`, `WORKSPACE_ADMIN`, and `WORKSPACE_MEMBER`.
- Service-side worker and control-plane actions are deny-by-default and durably audited.

## Secrets and connectors
- Supported vault backend: HashiCorp Vault.
- Supported production connector transport: outbound credentialed HTTPS webhook.
- Secret material is resolved at use time and is not persisted into task-state or compliance export records.
- Connector delivery is gated by credential health, compromise state, and lease state.

## Data handling and retention
- Authoritative task truth is the append-only execution ledger plus bounded task/query state.
- Retention policy for the pilot is `PILOT_APPEND_ONLY_NO_DELETE`.
- The pilot supports archive recommendation and compaction hints, not destructive history rewrite.
- Destructive delete is not supported. Deletion requests are durably recorded and fail closed.

## Auditability and exports
- Runtime events, execution state, worker claims, connector deliveries, and compliance actions are durably recorded.
- Audit exports are redaction-first and integrity-backed:
  - manifest hash
  - bundle hash
  - per-section hashes
- Compliance export records do not persist raw secret material.

## Legal hold
- Automated legal-hold lifecycle is deferred beyond the pilot.
- Current posture is manual escalation required.
- Any legal-hold assertion blocks deletion handling and requires manual review before export distribution decisions.

## Observability and incident response
- The pilot includes correlation ids, bounded tracing/log/alert summaries, degraded-mode visibility, and runbooks.
- On-call and degraded-mode recovery instructions are documented in:
  - `docs/agent-kernel-oncall-runbook.md`
  - `docs/agent-kernel-degraded-mode-recovery-playbook.md`
  - `docs/agent-kernel-compliance-operations-runbook.md`

## Known pilot defers
- automated legal-hold application and release
- destructive delete execution and downstream erasure orchestration
- broad provider matrix rollout
- shared multi-tenant productization, self-hosted/on-prem, hybrid, and multi-region active-active deployment
- full compliance suite or legal operations platform

# Enterprise Infrastructure Track Workstreams

Date: 2026-03-06
Owner: Codex

## P0 Workstreams

| Workstream | Priority | Owner | Purpose | Pilot-ready baseline | Repeatable-enterprise target | Depends on |
|---|---|---|---|---|---|---|
| Remote execution substrate | P0 | Platform runtime | Durable async execution, retry, dead-letter, idempotency, replay-safe boundaries | Typed job/retry/dead-letter records, deterministic idempotency keys, local-first durable retry state, claimable execution units, durable claim/lease/heartbeat/release lifecycle, no-op remote runner boundary | Service-backed queue/workers, retry budget/backoff/jitter policy, dead-letter replay tooling, backlog health visibility, real remote worker fleet control plane | None |
| Authoritative ledger and query model | P0 | Data/platform | Define authoritative execution and ops truth, versioning, and replay-safe projections | Durable immutable-ish ledger chain, schema/version rules, replay-safe summaries, no-history-rewrite guarantees | Server-side authoritative ledger, materialized views, migration/version policy, archival and rebuild tooling | Remote execution substrate records available |
| Enterprise identity and authorization closure | P0 | Security/identity | Close enterprise auth from typed semantics to real provider and service auth behavior | Usable SSO/SCIM path, durable session/directory state, deprovision correctness, scoped operator/admin permissions, denial audit trails | Production OIDC/SAML/SCIM rollout, tenant/workspace admin model, break-glass handling, service-to-service auth, enterprise audit closure | None |
| Vault and credential lifecycle | P0 | Platform security | Move from typed refs to real credential lease/rotation/revocation lifecycle | Vault adapter boundary, lease/health semantics, route block/degrade on credential state, credential resolution audit trail | Production vault backend, rotation/revocation workflows, JIT access, tenant/environment-scoped isolation, compromise runbooks | None |

## P1 Workstreams

| Workstream | Priority | Owner | Purpose | Pilot-ready baseline | Repeatable-enterprise target | Depends on |
|---|---|---|---|---|---|---|
| Connector platform hardening | P1 | Connector platform | Turn connector-ready abstractions into a hardened platform layer | Capability declarations, auth bindings, health/retry/dedupe/dead-letter behavior, typed route gating | Connector SDK, conformance suite, sandbox/prod separation, lifecycle management, reliability scorecards | P0 identity + vault baselines materially usable |
| Observability and SRE | P1 | SRE/platform | Make failures, backlog, blast radius, and degraded mode operationally visible | Correlation IDs, durable health summaries, error classification, run and connector visibility, governance alert buckets | Distributed tracing, SLO/error budgets, alert routing, synthetic checks, canary/shadow visibility, incident playbooks | P0 remote execution and ledger baselines |
| Compliance process execution | P1 | Compliance platform | Turn compliance-aware semantics into executable retention/deletion/export workflows | Durable export records, redaction-first bundles, jurisdiction/residency gating, compliance audit trails | Retention/deletion engine, legal hold, export integrity verification, subject access/erasure workflows, policy tests | P0 ledger and deployment boundaries |
| Deployment / tenant isolation / environment strategy | P1 | Platform/deploy | Define how the system is deployed, isolated, and rolled out per tenant and region | Environment-aware config, explicit tenant/workspace isolation assumptions, preview vs prod rollout gates | Deployment profiles, repeatable provisioning, region isolation, environment-scoped secret/connector governance, per-tenant rollout and rollback | P0 identity + vault + ledger baselines |

## P2 Boundary

Do not start these until P0 and P1 are materially closed:
- deeper portfolio optimization layers
- broader operator UX polish
- expanded scenario/simulation work
- more advanced automation layers

## Current Execution Decision

Active slice:
- `EI-P0C: service-backed worker pool and remote runner control plane scaffolding`

Why this slice now:
- `EI-P0A` already landed durable retry/dead-letter records and restart-safe retry behavior
- `EI-P0B` already landed authoritative append-only execution truth and rebuildable query views on top of that substrate
- the next narrow gap is claimable service-backed execution state and a remote-runner-ready control boundary on top of that durable truth
- it keeps the write surface bounded to `services/agent-kernel`, `api/agent-kernel/tasks`, and targeted tests

## Workstream Activation Rule

- Only one enterprise infrastructure workstream should be active in code at a time during bootstrap.
- The only active implementation workstream in this run is `EI-P0C`.
- All other workstreams remain in planning/status mode until `docs/enterprise-infrastructure-track-status.md` records the next bounded slice.

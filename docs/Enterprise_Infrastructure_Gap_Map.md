# Enterprise Infrastructure Gap Map

## Purpose

This document translates the current product state into a concrete enterprise infrastructure gap map.

The product already has a strong execution and governance control plane:
- role-aware runtime execution
- proof ledger / receipts
- operator workflows
- governance analytics
- policy packs / overrides / rollout safety
- cross-boundary routing, residency, and compliance-aware exchange logic

The remaining gap is not “more product semantics.”
The remaining gap is the infrastructure needed to make the system durable, operable, supportable, and sellable as a mature enterprise product.

This document should be used as:
- an architecture prioritization guide
- a market-readiness hardening map
- a planning input for Codex, engineering leads, platform leads, security, and operations

---

## Executive summary

The team has already built the hard part of the **decision plane** and **governance plane**.

What is still missing is the **service substrate** and **enterprise substrate**:
- remote execution and scheduling infrastructure
- authoritative server-side truth and query models
- enterprise identity and authorization closure
- vault / credential lifecycle systems
- connector platform hardening
- observability and SRE foundations
- compliance process execution and retention/deletion controls
- deployment, isolation, and region strategy

The product is already suitable for:
- design partner conversations
- internal pilot environments
- deep enterprise co-build

It is not yet fully ready for:
- repeatable multi-customer enterprise rollout at scale
- low-touch enterprise onboarding
- long-running, high-reliability, supportable production operations

---

## Current system strengths

The current system already provides strong foundations in:
- role-aware execution
- receipts and proof-ledger semantics
- policy and approval governance
- rollout safety and promotion controls
- operator console and governance workflows
- cross-boundary routing, residency, consent, and compliance export governance
- portfolio and rollout coordination semantics

This means the product is not blocked by weak product abstraction.
It is blocked by missing enterprise infrastructure depth.

---

## Gap map overview

The infrastructure gaps fall into eight major domains:

1. Remote execution substrate
2. Authoritative ledger and query model
3. Enterprise identity and authorization closure
4. Vault and credential lifecycle
5. Connector platform hardening
6. Observability, SRE, and reliability operations
7. Compliance process execution
8. Deployment, tenant isolation, and environment strategy

Each domain is scored here in terms of:
- why it matters
- what is likely missing
- what “good enough for enterprise pilots” looks like
- what “repeatable enterprise product” looks like
- suggested priority

---

# 1. Remote execution substrate

## Why it matters
A mature enterprise product cannot rely only on in-process or app-bound execution semantics for long-running work, retries, reconciliation, callbacks, dead-letter handling, or delayed operations.

Even if the product is local-first, it still needs explicit service-grade machinery for:
- async jobs
- retries
- dead-letter queues
- delayed execution
- reconciliation workers
- callback idempotency
- backoff and replay safety

## Likely current gap
The product has strong typed runtime semantics, but not yet a fully hardened remote execution substrate.

## Pilot-ready baseline
- typed job / retry / dead-letter models
- deterministic idempotency keys
- remote-ready boundary interfaces
- durable local-first fallback semantics
- explicit retry and reconciliation records

## Repeatable enterprise-product target
- service-backed job queue and worker model
- backoff / jitter / retry budget policy
- dead-letter processing and replay tooling
- callback dedupe guarantees
- operational visibility for worker backlog and job health

## Priority
**P0**

---

# 2. Authoritative ledger and query model

## Why it matters
The product already has receipts and proof-ledger semantics.
For enterprise scale, there must be a clear answer to:
- what is the authoritative source of truth?
- how are historical decisions preserved?
- how do materialized views get rebuilt?
- how are older and newer records versioned together?

## Likely current gap
There is likely strong additive persistence but not yet a fully clarified service-grade authoritative ledger and query model for multi-surface, multi-connector, multi-operator production use.

## Pilot-ready baseline
- durable immutable-ish event / receipt chain
- schema/version compatibility rules
- replay-safe summaries
- clear “history is not rewritten” guarantees

## Repeatable enterprise-product target
- authoritative server-side ledger
- materialized query models
- explicit migration/version policy
- archival and retention semantics
- replay tooling and consistency policies

## Priority
**P0**

---

# 3. Enterprise identity and authorization closure

## Why it matters
Typed identity semantics are not enough.
Enterprise customers require:
- SSO / OIDC / SAML integration
- SCIM / directory lifecycle
- deprovisioning correctness
- admin/operator permission closure
- break-glass handling
- service-to-service authorization
- non-repudiation for sensitive operations

## Likely current gap
Strong typed semantics and local-first guards exist, but full enterprise auth closure is still incomplete.

## Pilot-ready baseline
- one or two real provider integrations
- durable session and directory sync state
- deprovisioning correctness
- operator/admin roles with scoped permissions
- denial/audit trails for restricted actions

## Repeatable enterprise-product target
- production SSO/SCIM rollout
- tenant/workspace admin model
- break-glass procedures
- robust service auth model
- support for enterprise audit expectations

## Priority
**P0**

---

# 4. Vault and credential lifecycle

## Why it matters
Connectors become production-critical only when credential lifecycle is real:
- creation
- storage
- lease
- renewal
- rotation
- revocation
- expiry
- compromise response

## Likely current gap
Typed refs and runtime states may already exist, but full vault-backed production lifecycle is likely incomplete.

## Pilot-ready baseline
- vault adapter boundary
- lease and health semantics
- route block/degrade based on credential state
- audit trail for credential resolution attempts

## Repeatable enterprise-product target
- production vault backend
- rotation and revocation workflows
- JIT credential access
- tenant/environment scoped secret isolation
- incident playbooks for key compromise

## Priority
**P0**

---

# 5. Connector platform hardening

## Why it matters
The product should not evolve into a collection of fragile bespoke connectors.
It needs a connector platform with:
- typed connector contracts
- auth profiles
- health checks
- timeouts
- retries
- rate-limit policy
- conformance tests
- environment separation

## Likely current gap
The system likely has connector-ready abstractions but still needs a hardened platform layer.

## Pilot-ready baseline
- connector capability declaration
- auth binding semantics
- health / retry / dedupe / dead-letter behavior
- typed route gating

## Repeatable enterprise-product target
- connector SDK / conformance suite
- production-grade connector lifecycle management
- sandbox/prod separation
- connector reliability scorecards

## Priority
**P1**

---

# 6. Observability, SRE, and reliability operations

## Why it matters
Enterprise maturity requires visibility into:
- what failed
- where it failed
- how often
- what the blast radius is
- how quickly it recovers

This includes:
- tracing
- run correlation
- tenant-level health
- canary/shadow observability
- degraded mode policy
- alerts and on-call supportability

## Likely current gap
Governance summaries exist, but service-grade observability and operational reliability may still be incomplete.

## Pilot-ready baseline
- durable health summaries
- error classification
- correlation ids
- run and connector visibility
- governance alert buckets

## Repeatable enterprise-product target
- distributed tracing
- SLO / error budget views
- alert routing and on-call workflows
- synthetic checks
- canary/shadow reliability observability
- incident and degraded-mode playbooks

## Priority
**P1**

---

# 7. Compliance process execution

## Why it matters
Having compliance-aware semantics is not the same as running compliance processes.
Enterprises need:
- retention and deletion
- legal hold
- export package integrity
- subject access / erasure workflows
- data classification enforcement
- redaction policy execution
- cross-boundary evidence packs

## Likely current gap
The product likely has strong compliance semantics but not yet full compliance-process execution.

## Pilot-ready baseline
- durable export records
- redaction-first bundles
- jurisdiction/residency gating
- compliance audit trails

## Repeatable enterprise-product target
- retention/deletion engine
- legal hold
- integrity verification for exported bundles
- subject access and erasure workflows
- policy testing for compliance controls

## Priority
**P1**

---

# 8. Deployment, tenant isolation, and environment strategy

## Why it matters
Enterprise products must answer:
- SaaS vs private cloud vs hybrid
- tenant isolation model
- region-specific deployment
- staging vs prod vs preview separation
- environment-scoped credentials and connectors
- rollout controls per tenant/environment

## Likely current gap
The product likely has environment-aware semantics in parts, but not a complete deployment/isolation story.

## Pilot-ready baseline
- environment-aware config
- explicit tenant/workspace isolation assumptions
- region-aware restrictions where already required
- rollout gates for preview vs production

## Repeatable enterprise-product target
- documented deployment profiles
- repeatable tenant provisioning
- region isolation strategy
- environment-scoped secret and connector governance
- per-tenant rollout control and rollback support

## Priority
**P1**

---

## Priority map

### P0 — Must close for serious enterprise pilots
1. Remote execution substrate
2. Authoritative ledger and query model
3. Enterprise identity and authorization closure
4. Vault and credential lifecycle

### P1 — Must close for repeatable enterprise productization
1. Connector platform hardening
2. Observability / SRE / reliability operations
3. Compliance process execution
4. Deployment / tenant isolation / environment strategy

### P2 — Can follow after enterprise productization foundations exist
1. Deeper portfolio optimization
2. Expanded simulation and scenario planning
3. Broader operator UX polish
4. More advanced automation layers

---

## Recommended execution model

Do not treat this as one giant “infra rewrite.”
Run it as a parallel infrastructure track with explicit bounded programs.

### Track I — Remote execution and truth
- remote execution substrate
- authoritative ledger/query model
- migration/version policy

### Track II — Identity and credentials
- SSO/SCIM provider rollout
- RBAC/admin closure
- vault backend and credential lifecycle

### Track III — Operability and compliance
- observability / SRE
- compliance process execution
- export integrity / retention / deletion / legal hold

### Track IV — Deployment and scale readiness
- tenant isolation
- region/environment strategy
- deployment profile hardening

---

## Anti-patterns to avoid

1. **Do not keep adding new governance primitives forever**
   The control plane is already strong.

2. **Do not expand connector count without connector platform hardening**
   That will create brittle complexity.

3. **Do not ship enterprise identity semantics without real auth closure**
   Typed fields are not a substitute for real authorization.

4. **Do not rely on local durable state forever for long-running enterprise operations**
   Service-grade truth must emerge.

5. **Do not ignore schema/version strategy**
   Enterprise failures often come from upgrades and compatibility, not model behavior.

---

## Suggested next deliverable for engineering

The best immediate follow-up is an execution plan that turns this map into:
- workstreams
- owners
- milestones
- dependencies
- pilot-ready exit criteria
- repeatable-enterprise exit criteria

That plan should avoid feature sprawl and should explicitly separate:
- product-surface work
- platform infrastructure work
- compliance/security work
- deployment/ops work

---

## Enterprise readiness checkpoints

### Design partner ready
- major product flows stable
- receipts and governance usable
- local-first recovery stable
- basic auditability in place

### Enterprise pilot ready
- P0 infrastructure gaps sufficiently closed
- SSO/SCIM path usable
- vault path usable
- remote execution substrate dependable enough for pilots
- support/runbook story exists

### Repeatable enterprise product ready
- P0 and P1 materially closed
- deployment/isolation story defined
- observability and compliance operations mature
- connector platform and credentials lifecycle robust
- onboarding and support no longer founder-dependent

---

## Final thesis

The product does not primarily need more product semantics.
It needs the infrastructure that makes its existing governance and execution semantics safe, durable, auditable, and operable at enterprise scale.

In other words:

**You have a strong decision/governance plane.  
Now you need the enterprise-grade service substrate under it.**

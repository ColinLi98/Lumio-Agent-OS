# Sellable Standard Roadmap v1

## Purpose

This roadmap defines the shortest credible path from the current Agent OS / execution governance platform to a sellable enterprise product.

The goal is not to expand the conceptual platform indefinitely.
The goal is to reach a state where the product can be:
- understood by enterprise buyers
- piloted with real users
- operated by internal teams
- supported with runbooks and evidence
- evaluated by security / privacy / procurement stakeholders

This roadmap intentionally deprioritizes new product primitives and agent-workforce expansion until the sellable baseline is achieved.

---

## Strategic principle

From this point forward, work should be judged by one question:

**Does this move the platform materially closer to a sellable enterprise product?**

If the answer is no, the work should be deferred.

This means:
- pause new agent-layer primitives
- pause broad new governance abstractions
- pause broad UI redesigns
- focus on pilot activation, live evidence, enterprise shell clarity, infrastructure closure, supportability, and launch packaging

---

## Target product definition

The near-term product is:

# Enterprise Execution Governance Platform

Not yet:
- a broad consumer product
- a general multi-agent workforce platform
- a BPM / workflow DSL
- a broad enterprise portfolio SaaS suite

The platform should be packaged around three role-facing surfaces:
- **Requester shell**
- **Tenant Admin shell**
- **Operator shell**

All three should sit on the same underlying runtime, ledger, policy, and governance substrate.

---

## Sellable standard definition

The product is considered to meet the sellable standard only when all of the following are true:

1. There is a real pilot environment, not just simulator/demo paths.
2. There is a real requester/operator/tenant-admin loop.
3. At least one real identity/auth path is usable.
4. At least one real vault/credential path is usable.
5. At least one real connector path is usable.
6. There is real live pilot evidence, not only test or synthetic evidence.
7. The three role-facing shells are understandable and usable without reading raw internal state.
8. The operator team can handle most cases without raw JSON.
9. Release baseline, runbooks, incident handling, and compliance materials exist.
10. Product positioning, onboarding, and packaging are clear enough for enterprise evaluation.

---

## Roadmap structure

This roadmap is organized into six steps.
Each step has:
- purpose
- scope
- done criteria
- exit conditions

The steps must be executed in order.

---

# Step 1 — Pilot Activation Closure

## Purpose

Convert the current “pilot-like but not truly activated” state into a real, externally validated pilot activation.

## Why this is first

Without real pilot activation, all hypercare, live evidence, closure-readiness, and pilot decision language remains unstable.

## Required outcomes

The following artifacts must exist and be verifiably real:

1. **Real pilot environment binding**
   - not a simulator URL
   - real base URL
   - tenant id
   - workspace id
   - deployment binding evidence

2. **Real operator access**
   - named operator identity
   - real session/token or supported login state
   - at least one real operator interaction artifact

3. **Named real requester**
   - real requester identity
   - access path into the pilot flow

4. **Real tenant-admin/support touchpoint**
   - real contact or channel
   - real interaction artifact

5. **First real task/session/run artifact**
   - generated from the real pilot path
   - not derived from simulator/demo/test/synthetic sources

6. **Connector/credential artifact if legitimately involved**
   - only if the real task traverses the approved connector path

## Scope

In scope:
- pilot environment binding
- actor provisioning/access
- real evidence capture
- blocker narrowing
- pilot activation decision state

Out of scope:
- new platform primitives
- broad UI redesign
- synthetic evidence upgrades

## Done when

Step 1 is done only if:
- the pilot is truly activated
- at least one real task/run artifact exists
- demo/simulator/test/local synthetic artifacts remain blocked from promotion
- the product can honestly say `REAL_EVIDENCE_RECOVERED` or `PILOT_ACTIVATED`

## Exit states

Valid exit states:
- `PILOT_ACTIVATED`
- `PILOT_NOT_ACTIVATED`
- `PILOT_ACTIVATION_DELAYED`

---

# Step 2 — Live Evidence Closure

## Purpose

Broaden live pilot evidence beyond activation into enough real-world proof to support closure-readiness evaluation.

## Required evidence categories

The following evidence categories must be explicitly tracked and advanced:
- `device_session_proof`
- `workflow_artifact_proof`
- `connector_credential_proof`
- `tenant_admin_support_proof`
- `stability_safety_proof`

## Scope

In scope:
- repeated real pilot runs
- evidence logging
- feedback logging
- incident logging
- closure-template evidence accumulation

Out of scope:
- fake evidence from tests
- simulator/demo promotion

## Done when

Step 2 is done only if:
- all required categories have real live evidence or explicit “not involved” treatment where allowed
- there are no open Sev1 or repeated Sev2 blockers in the covered window
- closure-readiness can be evaluated on evidence, not on absence-of-failure alone

## Exit states

Valid exit states:
- `HOLD`
- `REMEDIATE`
- `ROLLBACK`
- `CLOSURE_READY_CANDIDATE`

---

# Step 3 — Enterprise Shell Consolidation

## Purpose

Turn the current runtime and governance features into a role-facing product that enterprise users can understand.

## Shells to consolidate

### A. Requester shell
Should support:
- task/request creation
- status view
- approval or rejection
- result view
- receipt view

### B. Tenant Admin shell
Should support:
- environment binding visibility
- actor readiness visibility
- activation blockers
- identity/vault/connector readiness summaries
- policy/setup understanding

### C. Operator shell
Should support:
- queue
- case detail
- timeline
- blocker visibility
- remediation steps
- safe bulk actions where already approved

## Scope

In scope:
- shell clarity
- role-facing summary surfaces
- clear non-pilot vs real-pilot distinction
- understandable blocker / next-action messaging

Out of scope:
- broad aesthetic redesign
- new governance primitives

## Done when

Step 3 is done when:
- enterprise users can understand their role-specific surface without reading raw internal state
- operator handling does not require raw JSON for most cases
- tenant admin can see why the system is or is not activation-ready

---

# Step 4 — Enterprise Infrastructure P0 Closure

## Purpose

Close the minimal infrastructure gaps required for serious enterprise pilot launch credibility.

## Required workstreams

### 4.1 Service-backed execution substrate
- worker pool / claim / lease / heartbeat / timeout / retry / dead-letter baseline

### 4.2 Authoritative ledger / query model
- append-only authoritative truth
- rebuildable projection
- replay/rebuild discipline
- compatibility and migration posture

### 4.3 Real identity/auth closure
- at least one usable enterprise identity path
- explicit service auth closure where needed

### 4.4 Real vault/credential closure
- at least one real vault/credential path
- route gating based on actual credential state

### 4.5 Connector platform minimum closure
- adapter boundary
- health / retry / timeout / dead-letter
- at least one real connector path

## Scope

In scope:
- minimal enterprise infrastructure closure
- no architectural rewrites
- no broad provider matrix expansion

Out of scope:
- generalized infrastructure platform ambitions beyond launch-blocking needs

## Done when

Step 4 is done when:
- the pilot can honestly rely on at least one real path for identity, vault, and connector execution
- authoritative truth and replay/rebuild are stable enough for operator use

---

# Step 5 — Launch, Support, and Compliance Package

## Purpose

Convert the technically working platform into something that can be onboarded, supported, audited, and reviewed by enterprise stakeholders.

## Required deliverables

- release baseline and clean candidate discipline
- operator runbook
- incident playbook
- support path
- audit export package
- privacy / residency / data boundary explanations
- retention/deletion baseline
- deployment model description
- onboarding checklist

## Scope

In scope:
- launch and support readiness
- compliance-adjacent packaging
- operational clarity

Out of scope:
- full enterprise certification programs unless separately required

## Done when

Step 5 is done when:
- internal teams know how to launch, monitor, support, and explain the product
- enterprise stakeholders can review a coherent operational/compliance package

---

# Step 6 — Commercial Packaging and Sales Readiness

## Purpose

Make the product understandable and buyable, not just runnable.

## Required outputs

- one primary buyer definition
- one primary launch scenario
- packaging/modules definition
- deployment model offering definition
- evaluation / pilot / production transition path
- support boundary definition
- pricing/packaging direction (even if preliminary)

## Suggested commercial framing

Current recommended positioning:

# Enterprise Execution Governance Platform

Alternative internal framing such as “Agent OS” or “Execution OS” can remain, but external packaging should stay enterprise-readable.

## Done when

Step 6 is done when:
- the product can be described in buyer language
- onboarding and deployment paths are clear
- there is a coherent path from pilot to paid enterprise relationship

---

## Priority order

Execute these steps in this order:

1. Pilot Activation Closure
2. Live Evidence Closure
3. Enterprise Shell Consolidation
4. Enterprise Infrastructure P0 Closure
5. Launch, Support, and Compliance Package
6. Commercial Packaging and Sales Readiness

Do not swap the order unless a blocker explicitly forces it.

---

## What to pause until sellable standard is reached

Pause or deprioritize:
- Role Agent Layer / Agent Workforce Platform expansion
- new governance primitive expansion beyond launch-blocking needs
- broad console redesign
- generic BPM / workflow DSL
- destructive automation expansion
- connector proliferation without platform hardening
- speculative consumer shell work

---

## Launch recommendation

The most realistic near-term launch target is:

# Controlled enterprise pilot launch

Not:
- broad GA
- broad self-serve SaaS launch
- general consumer launch

This roadmap is intended to make that pilot launch credible, supportable, and commercially useful.

---

## Final note

If Step 1 is not completed, the rest of the roadmap does not meaningfully advance.
A pilot that is not truly activated cannot generate valid live evidence, and without that, later sellable-standard claims remain weak.

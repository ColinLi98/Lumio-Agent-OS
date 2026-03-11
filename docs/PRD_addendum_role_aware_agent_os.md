# Agent OS Vision Addendum

## Purpose

This addendum updates the current product direction without replacing the existing product backbone.

The goal is to evolve the product from a modular AI app toward a policy-driven, role-aware Agent OS for Western markets.

This pass is incremental.
It preserves the current architecture where possible while changing the meaning of the system’s primary objects.

---

## Strategic direction

The product should increasingly be understood as an operating layer for user intent.

It should not be framed primarily as:
- a chat interface with extra modules
- a persona-style digital avatar
- an agent marketplace browsing surface

It should be framed as a system that:
- captures intent
- operates within user policy
- routes work to capabilities
- executes tasks through governed flows
- verifies outcomes
- records proof
- learns from results

---

## The new product primitives

The product should increasingly organize around six primitives:

1. **Intent** — what the user wants done
2. **Policy** — what the system is allowed to do
3. **Capability** — who or what can do it
4. **Run** — the live execution state of a task
5. **Proof** — how completion is verified
6. **Learning** — how outcomes improve future behavior

These primitives should guide product decisions, naming, data models, and system behavior.

---

## Product implications

### 1. Top-level surfaces remain stable

Keep the current top-level product surfaces:
- Goals
- Work
- Activity

This pass does not replace the top-level information architecture.

### 2. Work becomes the primary execution environment

Work should evolve into one unified task workspace.

The user should not be forced to first choose between internal modules.
Instead, the system should route execution contextually.

The user experience should increasingly center on:
- current task progress
- missing information
- approval gates
- external offers when needed
- verification state
- result review

### 3. Activity becomes proof-oriented

Activity should evolve from a generic history view toward a proof ledger / execution receipt model.

It should increasingly communicate:
- what happened
- under which role
- with what approval
- which provider or capability was used
- what proof was returned
- whether rollback is available

### 4. The digital twin becomes a policy layer

The digital twin should be repositioned as a policy-aware control layer.

Primary purpose:
- stable preferences
- permissions and approval rules
- data-sharing boundaries
- sync visibility
- role-aware defaults
- learning from outcomes

The twin must not be presented primarily as a conversational persona.
The twin must not silently replace missing user requirements.

---

## Multi-role selves / role-aware twin

### Rationale

A user is not one flat profile.
The same person operates under different roles with different constraints, permissions, budgets, and trust boundaries.

Examples:
- Personal
- Work
- Buyer
- Traveler
- Parent
- Custom

### Product requirement

The system should support an active role for a task / run / intent.

At minimum, the active role should influence:
- preferences
- approval thresholds
- data-sharing scope
- trusted providers
- budget interpretation
- recommendation ranking
- external fulfillment decisions

### User experience expectation

The system may suggest a role based on context.
The user must be able to override the role.
Role inference must not fabricate missing requirements.

### Minimum model expectation

The codebase should move toward explicit typed role-aware structures such as:
- UserRole
- RolePolicyProfile
- RoleScopedPreferences
- RoleScopedApprovalPolicy
- RoleScopedDataPolicy

---

## Policy precedence

All decisions should follow explicit precedence rules.

Priority order:
1. current task hard constraints
2. current task explicit user input
3. active role policy
4. account-level stable preferences and permissions
5. contextual heuristics
6. model inference / ranking heuristics

Implications:
- explicit task requirements always win
- role defaults do not override direct user instructions
- long-term preferences do not override current task constraints
- model inference is the weakest source of authority

---

## Delegation model

Delegation should become a first-class product concept.

Target levels:
- Manual
- Assisted
- Supervised
- Autonomous within policy

Definition:
- Manual: suggest only
- Assisted: draft or prepare, but do not act externally
- Supervised: may act, but requires approval at meaningful gates
- Autonomous within policy: may act automatically within explicit rules

This pass does not require a full UI rollout.
However, the architecture should not block this model.

---

## External Fulfillment direction

External capability should be contextual and quote-based.
It should not feel like browsing a marketplace first.

The ideal flow is:
1. the user expresses an intent
2. internal capabilities are attempted or evaluated
3. if there is a capability gap or a clearly better external option, the system collects structured offers
4. the user compares outcome tradeoffs
5. the system asks for approval when required
6. execution occurs
7. proof is verified
8. the result is committed or rolled back

Users should compare external options using:
- price
- ETA
- risk
- proof method
- rollback or dispute terms

---

## State-machine evolution

Preserve current stable behavior.
Do not break the current follow-up loop.

But move toward execution-oriented states that distinguish:
- missing information
- missing approval
- quoting
- execution
- verification
- commit
- rollback / dispute

Preferred added states:
- QUOTING
- AUTH_REQUIRED
- VERIFYING
- COMMITTED
- ROLLED_BACK
- DISPUTED

WAITING_USER should not become a catch-all state for every gated situation.

---

## Trust model

The long-term product advantage depends on trust infrastructure.

The system should preserve and strengthen:
- explicit confirmation for high-risk actions
- trusted-skill attribution
- verifiable source / proof links where supported
- clear disclosure of what stays local vs what is sent to cloud
- non-fabrication of missing constraints
- readable execution history

The best Agent OS will not merely feel intelligent.
It will feel safe to delegate to.

---

## Language and positioning

This product targets Western markets.
All primary user-facing copy should be natural English.

Preferred visible labels:
- Goals
- Work
- Activity
- Preferences & Permissions
- Recommendations & Risk
- External Fulfillment
- External Capabilities

Avoid requiring users to learn internal names before they can act.

---

## Out of scope for this pass

This addendum does not require:
- a full orchestrator rewrite
- a full marketplace backend rewrite
- a full cross-device sync redesign
- a Bellman rewrite
- a broad visual rebrand
- a complete autonomy UI rollout in one step

This is an incremental migration toward a role-aware, contract-oriented Agent OS.

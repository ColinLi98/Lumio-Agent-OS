## Vision addendum: Role-aware Agent OS

This refactor is not only a UX cleanup. It is also a strategic product-shaping pass.

The product should evolve toward an Agent OS built around:
- intent
- policy
- capability
- execution
- proof
- learning

Do not treat the system as a generic chat shell with extra modules.
Do not treat the digital twin as a persona or avatar simulation.
Treat the system as an execution environment for user intent, operating within explicit user rules.

---

## Role-aware self model

A user must not be modeled as one flat profile.

Introduce or strengthen the concept of multi-role selves / role-aware execution.

At minimum, support these roles in models and sample data:
- `PERSONAL`
- `WORK`
- `BUYER`
- `TRAVELER`
- `PARENT`
- `CUSTOM`

A task / run / intent may have an active role.
The active role affects:
- preference selection
- approval thresholds
- data-sharing scope
- trusted providers
- budget interpretation
- recommendation ranking
- external fulfillment routing

This role concept must exist in core models and decision logic, not only in UI copy.

### Role rules

- A role is a policy context, not a cosmetic label.
- A role must never silently invent missing user constraints.
- Role inference may be used to suggest defaults, but not to fabricate requirements.
- Users must be able to override the active role for a task.
- Role changes should be visible in task history / activity where relevant.

### Model requirement

Add or extend typed structures such as:
- `UserRole`
- `RolePolicyProfile`
- `RoleScopedPreferences`
- `RoleScopedApprovalPolicy`
- `RoleScopedDataPolicy`

The exact names may vary, but the concept must be explicit and typed.

---

## Policy precedence

All planning and execution decisions must follow explicit precedence rules.

Use this priority order:

1. current task hard constraints
2. current task explicit user input
3. active role policy
4. account-level stable preferences and permissions
5. contextual heuristics
6. model inference / ranking heuristics

Important:
- model inference must be last
- role defaults must not override explicit task constraints
- long-term preferences must not override explicit current-task requirements

Document this precedence clearly in code comments, docs, and any relevant UI explanations.

---

## Digital twin positioning

The twin is a policy-aware control layer, not a human-like companion.

Avoid product behavior that implies:
- the twin speaks as the user by default
- the twin can substitute for missing requirements
- the twin is a personality-first product surface

Prefer product behavior that emphasizes:
- preferences
- permissions
- approval rules
- data-sharing scope
- sync status
- role-aware defaults
- learning from accepted / rejected / edited / rolled-back outcomes

The preferred user-facing direction remains:
- `Preferences & Permissions`
- or another English label with the same meaning

Do not reintroduce persona-heavy framing in primary product UX.

---

## Delegation model

Treat delegation as a first-class product concept.

Where practical in models and task flow, introduce or prepare support for:

- `MANUAL`
- `ASSISTED`
- `SUPERVISED`
- `AUTONOMOUS_WITHIN_POLICY`

Or equivalent naming.

Meaning:
- `MANUAL`: suggest only
- `ASSISTED`: draft / prepare, no external action
- `SUPERVISED`: may act, but requires approval at key gates
- `AUTONOMOUS_WITHIN_POLICY`: may act automatically inside explicit user rules

This does not require a full UI rollout in this pass.
However, code and models should avoid blocking this concept.

High-risk actions must still preserve explicit approval requirements.

---

## Execution object model

The system should increasingly be modeled around task execution, not only around conversational response generation.

Prefer or strengthen these core objects:
- `Intent`
- `TaskRun`
- `IntentContract`
- `ClarificationTicket`
- `ApprovalGrant` or equivalent
- `CapabilityCard`
- `Quote`
- `VerificationProof`
- `RollbackPolicy`
- `RunEvent`

The exact implementation may remain incremental.
Do not force a full backend rewrite in this pass.
But new work should move the codebase toward contract-oriented execution.

---

## External fulfillment direction

External capability should behave like contextual fulfillment, not marketplace browsing.

Preferred concepts:
- `External Fulfillment`
- `External Capabilities`
- structured offers
- quote comparison
- verification
- rollback / dispute handling

Do not optimize for “browse agent market first” behavior.
Do optimize for:
- detect capability gap
- collect offers
- compare outcome tradeoffs
- request approval when needed
- execute
- verify
- record proof

Where comparing external options, prioritize these fields:
- price
- ETA
- risk
- proof method
- rollback or dispute terms
- trust / provider quality indicators

---

## Proof-first product behavior

A meaningful action should produce a proof trail, not just a response card.

Prefer system behavior that can answer:
- what was done
- under which role
- under which approval or permission
- what data scope was used
- who executed it
- what proof was returned
- whether rollback is possible

Activity should evolve toward a proof ledger / execution receipt model.

This does not require a full ledger backend in one pass.
But new states, models, and UI should move toward this framing.

Preferred concepts:
- `Proof`
- `Receipt`
- `Verification`
- `Execution history`
- `Approval history`

Avoid reducing Activity to a generic message log.

---

## State-machine guidance

Preserve existing stable behavior, especially `WAITING_USER`.
But future-oriented work should distinguish between:
- missing information
- missing approval
- external quoting
- verification
- completion / commit
- rollback / dispute

Where new states are introduced, make sure they reflect execution semantics, not only UI display semantics.

For example:
- `QUOTING`
- `AUTH_REQUIRED`
- `VERIFYING`
- `COMMITTED`
- `ROLLED_BACK`
- `DISPUTED`

Do not overload `WAITING_USER` to mean all of the above.

---

## English-first language standards

All primary user-facing copy must be in natural English suitable for US/European markets.

Avoid internal jargon in the main user path.

Preferred visible labels:
- `Goals`
- `Work`
- `Activity`
- `Preferences & Permissions`
- `Recommendations & Risk`
- `External Fulfillment`
- `External Capabilities`

Avoid making users learn internal product vocabulary before they can act.

Developer-facing terms may remain in debug, docs, or internal identifiers where necessary.

---

## Migration rule: do not do a naming-only pass

A rename alone is not sufficient.

Examples of unacceptable partial work:
- renaming Avatar to Preferences without changing the underlying purpose
- renaming LIX to External Fulfillment while preserving marketplace-first behavior
- adding role labels in UI without role-aware policy logic
- adding state names without wiring models, handlers, cards, and tests

For this refactor, product naming changes must be backed by model or flow changes where applicable.

---

## Minimal architectural direction

Prefer incremental migration toward these principles:

- user intent is the primary object
- execution runs are stateful
- role and policy influence routing
- external execution is quote-based and proof-aware
- activity is receipt-oriented
- learning comes from outcomes, not only from inferred profile data

Do not introduce an entirely parallel architecture unless necessary.
Adapt the existing architecture in place where possible.

---

## Testing expectations for this direction

When role-aware logic is introduced, add or update tests for:
- role selection / override behavior
- policy precedence
- explicit task constraints overriding role defaults
- approval gating for high-risk actions
- role-aware data-sharing decisions
- role-aware offer ranking if applicable

When proof / verification concepts are introduced, add or update tests for:
- state transitions
- proof-required rendering
- missing-proof handling
- rollback or dispute path behavior if implemented

---

## Documentation expectations

When implementing any part of this vision addendum, update the working docs:
- spec
- milestone plan
- status tracker

Document:
- what changed in models
- what changed in user-visible flow
- how role-aware policy works
- what remains intentionally deferred

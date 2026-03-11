# Role Contract v1

## Status
Draft v1 for implementation alignment

## Purpose
This document defines the minimum contract for role-aware execution in the Agent OS.

The goal is to ensure that role-aware behavior is:
- explicit
- typed
- explainable
- testable
- stable across planning, execution, verification, and activity history

This contract is intended for product, backend, Android, orchestration, and evaluation teams.

It is not a UI-only guideline. A role must be treated as a runtime policy context.

---

## 1. Design principles

### 1.1 Role is not decoration
A role is not a visual label, persona skin, or static dropdown. A role is a policy context that influences planning and execution.

### 1.2 Explicit user input wins
Role defaults and model heuristics must never override explicit task constraints or explicit user instructions.

### 1.3 Role is bounded authority
A role may change what the system is allowed to do, what data may be shared, which providers are preferred, and when approval is required.

### 1.4 Role must be explainable
Any material decision influenced by role must be traceable through reason codes, activity history, or debug logs.

### 1.5 Role must be safe to evolve
The system must support future custom roles without breaking the semantics of current built-in roles.

---

## 2. Scope

Role-aware behavior applies to:
- request creation
- task and run creation
- constraint derivation
- policy evaluation
- approval gating
- data-sharing scope generation
- skill and provider ranking
- routing and fallback selection
- external fulfillment comparison
- activity history and proof display
- outcome learning where role context is relevant

Role-aware behavior does not imply:
- automatic invention of missing user requirements
- silent replacement of explicit user constraints
- retroactive rewriting of past receipts or run history

---

## 3. Role model

### 3.1 Built-in roles
The minimum built-in role set for v1 is:
- `PERSONAL`
- `WORK`
- `BUYER`
- `TRAVELER`
- `PARENT`
- `CUSTOM`

### 3.2 Role intent
Each built-in role represents a distinct execution posture:

- `PERSONAL`: general personal context and default individual behavior
- `WORK`: work or organization-scoped behavior, often with tighter compliance and vendor constraints
- `BUYER`: purchasing-oriented behavior with stronger budget, approval, and offer comparison semantics
- `TRAVELER`: travel-oriented behavior with itinerary, timing, cancellation, and provider-fit sensitivities
- `PARENT`: guardian-oriented behavior with stricter data-sharing and safety protections
- `CUSTOM`: user-defined role extension point for future policy editing

### 3.3 Role as runtime context
A role may be attached to:
- an `AgentRequest`
- `AgentRequestConstraints`
- an `IntentContract`
- a task or run
- approval and data-sharing decisions
- activity and proof records

A role must be treated as part of runtime state, not only preference metadata.

---

## 4. Required typed concepts

The exact implementation names may vary, but the system must expose typed equivalents of the following:

- `UserRole`
- `RolePolicyProfile`
- `RoleScopedPreferences`
- `RoleScopedApprovalPolicy`
- `RoleScopedDataPolicy`
- `RoleScopedDelegationPolicy`
- `RoleSource`
- `RoleChangeReason`

### 4.1 Recommended shapes

```kotlin
enum class UserRole {
    PERSONAL,
    WORK,
    BUYER,
    TRAVELER,
    PARENT,
    CUSTOM
}

enum class RoleSource {
    EXPLICIT_USER_SELECTION,
    USER_PROFILE_DEFAULT,
    TASK_INHERITED,
    SAFE_SYSTEM_INFERENCE,
    SYSTEM_FALLBACK
}

enum class DelegationMode {
    MANUAL,
    ASSISTED,
    SUPERVISED,
    AUTONOMOUS_WITHIN_POLICY
}
```

Illustrative policy shape:

```kotlin
data class RolePolicyProfile(
    val role: UserRole,
    val approvalPolicy: RoleScopedApprovalPolicy,
    val dataPolicy: RoleScopedDataPolicy,
    val preferences: RoleScopedPreferences,
    val delegationPolicy: RoleScopedDelegationPolicy,
    val trustedProviderRules: TrustedProviderRules = TrustedProviderRules(),
    val version: String
)
```

---

## 5. Policy precedence

All planning and execution decisions must follow this precedence order:

1. current task hard constraints
2. current task explicit user input
3. active role policy
4. account-level stable preferences and permissions
5. contextual heuristics
6. model inference or ranking heuristics

### 5.1 Hard rules
- Explicit current-task constraints always win over role defaults.
- Active role policy may override account-level defaults.
- Model inference must be last.
- No policy layer may fabricate missing requirements.

### 5.2 Required examples
The system must support the following outcomes:

- If a task explicitly says "budget under $300", a role-level higher budget preference must not override it.
- If account-level sync is permitted but `PARENT` blocks cloud twin sync, the role-level restriction must win.
- If model ranking prefers a provider that violates role data policy, the provider must be excluded.

---

## 6. Role source semantics

Every run with an active role must record a `RoleSource`.

### 6.1 Allowed sources
- `EXPLICIT_USER_SELECTION`: the user explicitly chose the role
- `USER_PROFILE_DEFAULT`: the role came from persistent user default
- `TASK_INHERITED`: the role was inherited from an existing task or run
- `SAFE_SYSTEM_INFERENCE`: the system suggested or selected a role under narrow, explainable conditions
- `SYSTEM_FALLBACK`: last-resort fallback used when no better source exists

### 6.2 Rules
- `SAFE_SYSTEM_INFERENCE` must be conservative.
- `SYSTEM_FALLBACK` should be visible in logs and measurable in telemetry.
- Role source must be inspectable in debug or activity metadata.
- Important user-facing flows should surface the active role and, where relevant, why it was chosen.

### 6.3 Prohibited behavior
- Do not silently infer a role and then use it to fabricate missing task requirements.
- Do not silently downgrade an explicit role to `PERSONAL` without a reason code.

---

## 7. Role influence domains

The active role must be capable of influencing the following domains.

### 7.1 Policy
Role policy can:
- allow or deny categories of action
- impose stricter guardrails
- narrow eligible capabilities or providers
- change whether a step must pause for approval

### 7.2 Approvals
Role policy can:
- alter approval thresholds
- require approval for budget, spend, message sending, booking, or data-sharing
- restrict auto-run behavior through delegation mode

### 7.3 Routing
Role policy can:
- influence which skills are eligible
- bias internal vs external execution choices
- block routes that violate role constraints
- contribute reason codes to route selection or exclusion

### 7.4 Ranking
Role policy can:
- bias skill ranking
- bias external provider ranking
- favor trusted providers
- penalize providers that do not match risk, region, compliance, or privacy expectations

### 7.5 Data-sharing
Role policy can:
- narrow the allowed data scope
- block fields from leaving device or trusted boundary
- prevent cloud sync for certain roles or contexts

### 7.6 Learning
Role context may influence how outcomes are stored or weighted. The system must avoid unbounded cross-role contamination.

---

## 8. Delegation model

Role policy and task behavior must remain compatible with these delegation modes:

- `MANUAL`: suggest only
- `ASSISTED`: prepare or draft, but do not take external action
- `SUPERVISED`: may act, but pauses for approval at key gates
- `AUTONOMOUS_WITHIN_POLICY`: may act automatically within explicit policy limits

### 8.1 Rules
- Delegation mode must not override hard safety requirements.
- High-risk actions may still require explicit approval even in `AUTONOMOUS_WITHIN_POLICY`.
- Role policy may narrow allowed delegation relative to account defaults.

---

## 9. Role change semantics

### 9.1 General rule
Role changes affect future decisions. They do not retroactively rewrite past receipts, proofs, approvals, or activity history.

### 9.2 Mid-run role changes
When role changes during a run:
- future ranking may be recalculated
- future routing may be recalculated
- future approval requirements may change
- future data-sharing decisions may change
- already completed steps remain historically attached to the earlier role context

### 9.3 Re-evaluation triggers
A role change should trigger re-evaluation for:
- pending external offer comparison
- not-yet-approved actions
- not-yet-executed steps
- unsent drafts or requests

### 9.4 Non-retroactive rule
A role change must not:
- mutate historical proof records
- rewrite the role recorded for completed actions
- silently invalidate prior completed receipts without explicit state transition

### 9.5 Optional policy
Implementations may require re-approval when role change materially alters risk or authority.

---

## 10. Reason codes

Every material role-influenced decision should emit a machine-readable reason code.

### 10.1 Minimum reason code families

#### Role selection
- `ROLE_EXPLICIT_USER_SELECTED`
- `ROLE_PROFILE_DEFAULT_APPLIED`
- `ROLE_TASK_INHERITED`
- `ROLE_SAFE_INFERENCE_APPLIED`
- `ROLE_SYSTEM_FALLBACK_APPLIED`

#### Policy and approvals
- `ROLE_POLICY_ALLOWED`
- `ROLE_POLICY_DENIED`
- `ROLE_APPROVAL_REQUIRED`
- `ROLE_APPROVAL_THRESHOLD_EXCEEDED`
- `ROLE_DELEGATION_MODE_LIMITED`

#### Routing and ranking
- `ROLE_ROUTE_BIAS_APPLIED`
- `ROLE_ROUTE_EXCLUDED`
- `ROLE_PROVIDER_PREFERRED`
- `ROLE_PROVIDER_EXCLUDED`
- `ROLE_RANKING_BIAS_APPLIED`

#### Data-sharing
- `ROLE_DATA_SCOPE_REDUCED`
- `ROLE_CLOUD_SYNC_BLOCKED`
- `ROLE_FIELD_REDACTED`

#### Mid-run changes
- `ROLE_CHANGED_BY_USER`
- `ROLE_CHANGED_BY_SYSTEM_SAFE_RULE`
- `ROLE_CHANGE_TRIGGERED_REEVALUATION`
- `ROLE_CHANGE_REQUIRES_REAPPROVAL`

### 10.2 Requirements
- Reason codes must be stable enough for telemetry and debugging.
- User-facing copy may summarize reason codes in plain English.
- Reason codes should be present in logs and, where meaningful, activity metadata.

---

## 11. Activity and receipt requirements

Role-aware execution must be visible in activity and proof surfaces.

At minimum, the system should be able to display:
- active role
- delegation mode
- approval context where relevant
- data-sharing scope where relevant
- provider choice where relevant
- proof or verification status where relevant

### 11.1 Historical integrity
Past activity must retain the role under which the action occurred.

### 11.2 Readability
The user should be able to understand:
- which role the system used
- what that role changed
- why the system asked for approval or blocked a step

---

## 12. Data and sync rules

### 12.1 Role-aware data policy
Each role may define:
- allowed sync behavior
- allowed outbound fields
- prohibited cloud operations
- provider-specific restrictions

### 12.2 PARENT minimum protection
For v1, the system must support a stricter role rule such as blocking cloud twin sync under `PARENT`, where implemented.

### 12.3 Conflict handling
If restored state and current role policy version conflict:
- historical records remain unchanged
- future decisions use current policy version
- logs should record the policy version transition

---

## 13. Learning and contamination control

Role-aware learning must avoid inappropriate cross-role spillover.

### 13.1 Minimum requirement
The system must define one of these approaches for key learned signals:
- global
- role-scoped
- role-weighted

### 13.2 Guidance
Examples:
- trusted provider preference may be role-scoped or role-weighted
- budget tolerance should not be naively global across all roles
- sensitive data-sharing restrictions must remain policy-bound, not inferred from unrelated outcomes

### 13.3 Prohibited behavior
- Do not treat one role's accepted provider as universal truth for all roles.
- Do not let one role's temporary constraint permanently rewrite all role defaults.

---

## 14. Required test scenarios

The following scenario families are required for v1 confidence.

### 14.1 Same intent, different roles
Given the same intent, validate differences across `PERSONAL`, `WORK`, `BUYER`, or `TRAVELER` where applicable:
- ranking
- routing
- approval thresholds
- data scope

### 14.2 Explicit constraint overrides role default
A current-task hard constraint must beat role defaults.

### 14.3 Role-level denial overrides ranking
A provider preferred by ranking must be excluded when role policy forbids it.

### 14.4 Role-aware data-sharing
A restrictive role must reduce data scope or block cloud sync as configured.

### 14.5 Process restore
After process death or restore:
- active role persists correctly
- role source persists correctly when applicable
- role-influenced behavior remains stable

### 14.6 Mid-run role change
Role changes affect future steps without rewriting past receipts.

### 14.7 Activity traceability
The resulting activity trail should show enough metadata to explain the outcome.

---

## 15. Telemetry recommendations

Track at minimum:
- `role_override_rate`
- `role_mismatch_correction_rate`
- `system_fallback_role_rate`
- `policy_block_rate_by_role`
- `approval_required_rate_by_role`
- `data_scope_reduction_rate_by_role`
- `cloud_sync_block_rate_by_role`
- `routing_change_due_to_role_policy_rate`
- `provider_exclusion_due_to_role_policy_rate`
- `decision_without_reason_code_rate`

These metrics are used to validate that the feature is working operationally, not only syntactically.

---

## 16. Out of scope for v1

The following are intentionally out of scope for this contract version:
- full end-user custom role policy editor
- unrestricted user-defined role schema design
- full CRDT-based role policy sync engine
- complete role-aware settlement and dispute engine
- domain-specific per-vertical role packs beyond the built-in set

These may be added in later versions without changing the core semantics of v1.

---

## 17. Definition of done for Role Contract v1

Role Contract v1 is considered implemented when:
- role exists as a typed core model
- role participates in request and contract propagation
- role influences policy, approvals, routing, ranking, and data-sharing where applicable
- policy precedence is tested and stable
- role source is tracked
- role change semantics are defined and implemented for future-step reevaluation
- reason codes exist for material role-driven decisions
- activity and user-visible surfaces can explain role impact at a readable level
- regression tests cover the required scenario families

---

## 18. Appendix: example decision summary

Example plain-English explanation:

> Active role: WORK  
> Delegation mode: SUPERVISED  
> Why approval is required: Estimated spend exceeds the WORK role approval threshold.  
> Why this provider ranked higher: It matches the WORK role's trusted-provider policy and data-sharing restrictions.  
> Why cloud sync was not used: The current role policy limited outbound sync for this task.

This example is illustrative only. Final wording may vary by surface.

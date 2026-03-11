# M4 - Guided Role Policy Editor

## Why M4 now

M0 through M3.5 established the technical and product foundations for role-aware execution:
- role-aware execution exists in the runtime
- Role Contract v1 is hardened and traceable
- Activity and receipts are readable
- external fulfillment is role-aware
- role-driven decisions are now visible in the UI

The next product gap is no longer "can the system use roles?"
It is "can the user actually own and edit the policies that roles enforce?"

This milestone turns `Preferences & Permissions` from a read-mostly explanation surface into a real control surface.

## Goal

Give users safe, bounded, understandable control over role policies.

The editor must let users change meaningful role behavior without turning the product into a generic rules engine.

This milestone is about **guided governance**, not arbitrary scripting.

## Product objective

A user should be able to:
- inspect each role's current operating rules
- edit bounded policy fields for that role
- understand what those changes will affect
- save changes confidently
- see those changes influence real runtime behavior
- see those changes reflected later in receipts / activity / execution outcomes

## Core principle

Policy editing must remain:
- role-aware
- English-first
- bounded
- previewable
- explainable
- backward-compatible
- local-first where possible

Do not build a free-form policy language.
Do not let users modify system precedence rules.
Do not let users create an unbounded hierarchy of roles.

## In scope

### 1. Guided role editor inside Preferences & Permissions

Add a role-policy editing surface for supported roles.

At minimum, support editing for built-in roles and the existing `CUSTOM` role slot if present.

The editor should expose bounded policy controls such as:
- delegation mode default
- approval thresholds / approval requirements
- external fulfillment allowance or preference
- data-sharing scope defaults
- cloud sync allowance where applicable
- trusted provider preferences / allow or block controls
- budget or affordability preferences where applicable
- risk posture / selection preference where applicable

The exact field set may vary by role, but the set must be typed and validated.

### 2. Policy preview / impact explanation

For any pending edit, show a readable preview section such as:
- "What this changes"
- "This role will now require approval for purchases above ..."
- "This role will now prefer lower-risk providers"
- "Cloud sync will remain blocked for this role"

The preview must be generated from real policy values, not hard-coded copy.

### 3. Runtime integration

Saved policy changes must materially affect runtime behavior where applicable:
- approvals
- routing
- ranking
- provider selection
- data-sharing scope
- delegation defaults
- external fulfillment behavior

A saved role policy must not be a decorative setting.

### 4. Persistence and continuity

Role policy edits must persist and survive:
- app restart
- process death
- restore/resume flow

Use an additive, backward-compatible persistence approach.

### 5. Receipt / activity visibility

When a user changes a role policy, the system should be able to reflect that in appropriate places, such as:
- policy summary surfaces
- subsequent execution receipts
- activity/history when a policy change materially affects later behavior

This milestone does not require a full policy-ledger backend, but edits must not become invisible after save.

### 6. Safety and validation

Before save, validate policy combinations.

Examples:
- impossible threshold combinations
- invalid provider preference states
- unsupported sync/data combinations
- dangerous settings that violate protected system rules

Show readable English validation messages.

## Out of scope

Do not implement:
- a free-form rule language or DSL
- user-editable precedence ordering
- arbitrary unlimited custom role creation
- multi-role inheritance graphs
- a full orchestrator rewrite
- a full history schema rewrite
- a full backend marketplace redesign
- a broad visual redesign across the app

If `CUSTOM` role support exists, it may be used as a bounded user-editable slot.
That is different from building an unlimited custom-role factory.

## Required product behavior

### Role policy ownership

The user must feel that role behavior belongs to them, not only to the system.

### Explainability

Every editable field should have plain-English supporting text.
The user should understand:
- what the field means
- what it affects
- whether the value is local-only or syncable
- whether a system guard overrides it

### Protected system rules

Some rules may remain system-protected.
For example, if a role has a protected safety restriction, the UI should explain that it is protected rather than pretending it is editable.

### Preview before trust

Before saving, the user should be able to understand likely consequences.
Do not require users to learn consequences only after a failed run.

## Typed model direction

Introduce or strengthen typed structures such as:
- `RolePolicySnapshot`
- `RolePolicyDraft`
- `RolePolicyUpdate`
- `RolePolicyValidationResult`
- `EditableRolePolicyFields`
- `ProtectedRolePolicyFields`

Possible field groups:
- delegation policy
- approval policy
- data-sharing policy
- sync policy
- provider trust policy
- selection preference / ranking bias
- spend / affordability policy

Exact names may vary, but the structure must remain typed and testable.

## Precedence requirements

Saving user-edited role policy must not change core precedence order.

Precedence remains:
1. current task hard constraints
2. current task explicit user input
3. active role policy
4. account-level defaults
5. contextual heuristics
6. model inference

This milestone edits role policy values, not the precedence system.

## UX guidance

### Overview page

`Preferences & Permissions` should show a role list or role cards with concise summaries such as:
- active delegation mode
- approval posture
- data-sharing posture
- provider trust posture
- last updated

### Role editor page

Group settings into understandable sections:
- Delegation
- Approvals
- Data sharing
- External fulfillment
- Trusted providers
- Budget / risk

Avoid exposing raw internal jargon.

### Preview block

Add a visible preview block before save, for example:
- "This role will ask before sending purchase requests above $500."
- "This role will prefer lower-risk providers over fastest providers."
- "This role will keep cloud sync disabled."

### Reset / revert

Users should be able to:
- discard unsaved edits
- reset a role to default values

## Runtime requirements

Edited role policy must be consumed by the same role-aware runtime that already powers:
- policy checks
- approval gating
- routing
- ranking
- data-sharing
- external fulfillment decisions

Do not build a parallel logic path just for the editor.
The preview and runtime should derive from the same typed policy data whenever possible.

## Activity / receipt expectations

A future run should make it visible when a user-edited role policy materially influenced behavior.

Examples:
- "Approval required because BUYER policy was customized to require approval above $300."
- "Provider ranking changed because WORK policy prefers lower-risk providers."
- "Cloud sync remained disabled due to role policy."

This does not require every policy edit to produce a standalone ledger entry, but material downstream effects must remain explainable.

## Validation requirements

At minimum, validate:
- threshold ranges and ordering
- conflicts between delegation and approval requirements
- conflicts between sync and data-sharing policy
- invalid or contradictory provider preference states
- protected field edit attempts

Validation must produce readable English errors or warnings.

## Suggested milestone breakdown

### M4A - Typed storage and policy update path
- add typed editable role-policy structures
- implement load/save/update path
- implement validation
- preserve backward compatibility

### M4B - Preferences & Permissions editing UI
- add role list / role summary surface
- add editor UI for bounded fields
- add reset / cancel / save behavior
- add preview / impact summary block

### M4C - Runtime integration and explainability
- ensure saved policy changes influence real runtime decisions
- ensure subsequent receipts / activity / summaries reflect changed policy behavior
- ensure restore/resume uses updated policy

### M4D - Tests, docs, and dogfooding
- add unit tests and UI tests
- update docs/spec/plan/status
- add dogfood scenarios for policy edit -> runtime effect

## Definition of done

M4 is done when:
1. users can edit bounded role policy fields in `Preferences & Permissions`
2. edited values persist and survive restart/restore
3. edited values materially affect role-aware runtime behavior
4. policy previews explain the impact before save
5. protected rules are clearly surfaced and not falsely editable
6. subsequent receipts / activity can explain material effects of edited role policy
7. tests cover editing, validation, persistence, runtime effect, and explainability
8. docs/status are updated with exact M4 compliance mapping

## Required tests

At minimum, add or update tests for:
- loading default role policy
- editing and saving a role policy
- validation failure for invalid combinations
- protected-field handling
- restore/process death persistence of edited policy
- edited role policy changing approval behavior
- edited role policy changing ranking / provider selection where applicable
- edited role policy changing data-sharing behavior where applicable
- preview text consistency with saved runtime behavior
- reset-to-default behavior

## Suggested telemetry

Add or prepare telemetry such as:
- `role_policy_edit_open_rate`
- `role_policy_save_rate`
- `role_policy_reset_rate`
- `role_policy_validation_error_rate`
- `role_policy_preview_to_save_rate`
- `policy_change_effect_on_runtime_rate`
- `edited_policy_receipt_explanation_coverage`

Telemetry implementation can remain incremental, but the event model should be clear.

## Rollout guidance

Prefer a bounded rollout:
- start with built-in roles and bounded editable fields
- allow `CUSTOM` role editing only if it stays typed and controlled
- avoid shipping an unbounded role factory in this milestone

The goal is to move from system-owned role rules to user-owned role rules without losing safety or explainability.

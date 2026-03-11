# M8 - Operator Workflows, Alerts, and Governance Console

## Status
Proposed next milestone after M7.

## Why M8 is next
The system now has:
- role-aware runtime behavior
- role contract hardening
- explainability and receiptization
- external fulfillment contractization
- UI surfacing for external fulfillment
- guided role policy editing
- versioned proof ledger and history hardening
- governance analytics and telemetry aggregation
- typed settlement / dispute / reconciliation / idempotency infrastructure

At this point, the biggest remaining gap is not user-facing task execution. It is operational control.

The platform can now produce durable truth about:
- settlement state
- dispute state
- reconciliation mismatches
- sync pending cases
- provider issues
- rollback attempts
- verification outcomes
- policy snapshot context

But there is still no strong internal operator-facing workflow for reviewing, filtering, escalating, or resolving these cases in one place.

M8 should turn the durable infra from M5-M7 into an internal governance and operations surface.

---

## Goal
Create a practical internal-facing governance console and operator workflow layer for unresolved external cases, sync issues, disputes, settlement anomalies, and policy-sensitive execution review.

This milestone should make it easy for product, ops, support, and QA to answer:
- Which runs are unresolved right now?
- Which disputes are pending sync or provider ack?
- Which providers are producing the most mismatches or rollback failures?
- Which role or policy versions generate the most friction?
- Which runs need manual follow-up first?

---

## Product outcome
After M8, the system should support an internal operator / debug / governance surface that can:
- list unresolved or risky runs
- filter by operational dimensions
- show durable execution evidence
- show settlement / dispute / reconciliation state clearly
- support manual triage actions or workflow stubs where appropriate
- expose governance summaries in a compact, readable way

This does not need to be a polished enterprise admin product yet.
It does need to be real, typed, query-driven, and useful for dogfooding and internal operations.

---

## In scope

### 1. Governance Console Surface
Add an internal or debug-facing governance console surface that can show:
- unresolved runs
- sync-pending runs
- provider-issue runs
- dispute cases
- rollback failures
- reconciliation mismatches
- verification failures
- high-friction policy snapshots or role segments

The exact UI location can be implementation-led. Examples:
- debug panel
- internal tab under Activity
- governance screen behind developer toggle
- operator-only panel in app-host

### 2. Typed query and summary flows
Use the existing durable ledger and governance aggregates to support:
- listing
- filtering
- summary counts
- grouping
- prioritization

Minimum query dimensions should include:
- role
- provider
- policy snapshot version
- settlement status
- dispute status
- sync state
- unresolved only
- provider issue only
- time range if feasible

### 3. Case-oriented operator summaries
For each case, show a compact, readable operator summary including at minimum:
- run / receipt identity
- user id or local subject key if available in current architecture
- active role
- provider
- settlement status
- dispute status
- reconciliation summary
- sync issues
- reason-code families
- last material event timestamp
- next recommended operator action

### 4. Operator action stubs
Do not build a full remote operations backend in this pass.
Do provide typed, local, or stubbed actions where helpful, such as:
- mark reviewed
- copy case summary
- export case summary
- retry sync intent
- open dispute details
- open receipt / ledger trail
- filter related runs by provider or role

If actions cannot yet complete remotely, they should still be modeled clearly as local workflow actions or stubs.

### 5. Alerts and prioritization heuristics
Add lightweight operator-facing alerts or badges for cases such as:
- dispute sync pending
- settlement mismatch
- rollback failed
- verification failed
- duplicate callback ignored repeatedly
- provider ack missing for too long
- high unresolved count for one provider or one policy snapshot

These may be local in-app summaries first. They do not require remote alert delivery yet.

### 6. Governance formatter and readability
Add or extend formatter support so governance summaries and case rows are readable English and do not require code-level interpretation.

Preferred style:
- concise
- operational
- English-first
- reason-aware
- suitable for internal support and product teams

---

## Out of scope
- full remote operator console backend
- multi-user operator permissions model
- broad end-user UI redesign
- orchestrator rewrite
- full settlement rail implementation
- full remote alert delivery platform
- CRM / ticketing / Slack integration
- broad analytics warehouse extraction

---

## Suggested typed additions
The exact names can vary, but the milestone should converge on typed operator-facing objects such as:
- `GovernanceCaseRecord`
- `GovernanceCaseSummary`
- `GovernanceCasePriority`
- `GovernanceActionSuggestion`
- `GovernanceAlert`
- `GovernanceAlertSeverity`
- `GovernanceConsoleState`
- `GovernanceConsoleFilter`
- `GovernanceConsoleSection`
- `GovernanceCaseExportSummary`

These should be derived from the durable ledger / receipt / aggregate base, not implemented as a separate truth system.

---

## Suggested UI sections
A compact governance console can start with these sections:

### Overview
- unresolved runs
- disputes pending sync
- reconciliation mismatches
- rollback failures
- provider issue count
- top friction roles / providers / policy snapshots

### Queues
- needs operator attention
- sync pending
- dispute follow-up
- provider issues
- verification failures
- rollback failures

### Detail panel
For a selected case, show:
- receipt summary
- role / source / delegation
- policy snapshot version
- provider decision summary
- settlement summary
- dispute summary
- reconciliation summary
- sync issues
- recent events
- action suggestions

---

## Priority model
Cases should be able to surface with at least a basic priority heuristic.

A simple scoring model is enough for this pass. For example:
- dispute + sync pending -> high
- rollback failed -> high
- reconciliation mismatch -> high
- verification failed -> medium to high
- repeated duplicate callback ignored -> medium
- provider issue only, but settled -> medium or low depending on state

The priority does not need to be perfect.
It does need to be explicit, stable, and explainable.

---

## Alerts model
Alerts should be based on durable facts, not transient UI state.

Minimum alert families:
- `GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING`
- `GOVERNANCE_ALERT_SETTLEMENT_MISMATCH`
- `GOVERNANCE_ALERT_ROLLBACK_FAILED`
- `GOVERNANCE_ALERT_VERIFICATION_FAILED`
- `GOVERNANCE_ALERT_PROVIDER_ISSUE_CLUSTER`
- `GOVERNANCE_ALERT_DUPLICATE_CALLBACK_CLUSTER`
- `GOVERNANCE_ALERT_POLICY_FRICTION_CLUSTER`

Clusters can initially be local aggregate summaries.
They do not require remote fan-out in this pass.

---

## Readability requirements
Every governance case row or detail view should help an internal operator answer quickly:
- What happened?
- What is the current durable state?
- Is this resolved or unresolved?
- Why is it in this queue?
- What should happen next?

Preferred operator phrases:
- "Dispute pending provider acknowledgement"
- "Settlement mismatch between local and provider state"
- "Rollback failed after verification issue"
- "Provider issue cluster detected for this vendor"
- "Manual review recommended before retry"
- "Policy snapshot v12 generated repeated approval friction"

Avoid vague labels like:
- "warning"
- "issue"
- "attention"
without durable context.

---

## Data source rules
All governance console and alert surfaces should read from the existing durable truth chain:
- execution receipts
- receipt records
- run event records
- provider decision records
- verification records
- rollback records
- dispute case records
- settlement records
- reconciliation summaries
- governance aggregates

Do not create a parallel truth model for operator flows.

---

## M8A - Governance case model and query path
Implement or strengthen:
- governance case summary objects
- console filters
- grouping / prioritization
- mapping from ledger + receipts into operator cases

### Done when
- the system can derive governance case summaries from durable records
- unresolved, sync-pending, provider-issue, and mismatch queues can be queried cleanly

---

## M8B - Governance console surface
Add an internal-facing UI surface to render:
- overview metrics
- queue sections
- case rows
- detail panel
- action suggestions

### Done when
- an internal tester can open one place and see actionable unresolved external cases

---

## M8C - Alerts and formatter pass
Add operator alert summaries and readable English governance formatting.

### Done when
- the system can render concise, readable governance alerts and case explanations

---

## M8D - Tests, docs, and dogfooding
Add tests for:
- case derivation
- queue filters
- priority calculation
- alert generation
- formatter readability
- mixed old/new durable records compatibility

Update docs and milestone status.

### Done when
- tests pass
- docs are updated
- dogfooding confirms that unresolved external cases are easy to inspect and triage

---

## Suggested tests
At minimum add or extend tests for:
- governance case generation from settlement/dispute/reconciliation records
- unresolved queue includes only unresolved material cases
- sync-pending queue behavior
- provider-issue queue behavior
- policy snapshot grouping behavior
- duplicate-callback cluster alert behavior
- rollback failure alert behavior
- formatter outputs readable operator lines
- mixed legacy/new history compatibility in console summaries

---

## Suggested telemetry
This milestone may continue using local aggregation first.
Useful metric keys include:
- `governance_case_count`
- `governance_unresolved_count`
- `governance_sync_pending_count`
- `governance_provider_issue_count`
- `governance_alert_count`
- `governance_high_priority_case_count`
- `governance_policy_friction_cluster_count`
- `governance_duplicate_callback_cluster_count`

Do not block M8 on remote telemetry sink work.

---

## Definition of done
M8 is complete when:
1. Durable ledger and receipt records can be turned into governance cases.
2. Internal-facing queues exist for unresolved, sync-pending, provider-issue, and equivalent high-risk states.
3. A governance console or equivalent surface shows readable case summaries and detail.
4. Operator alerts and priorities are generated from durable facts.
5. Internal users can identify what happened, why it matters, and what to do next.
6. Tests cover case derivation, filtering, alerts, and formatter output.
7. Docs/status are updated with exact M8 coverage and deferred items.

---

## Recommended execution guidance for Codex
- Keep this pass incremental.
- Reuse the durable ledger and governance aggregates already built.
- Prefer additive typed models and compact internal UI surfaces.
- Do not turn this into a full enterprise admin product yet.
- Keep the implementation tightly scoped to governance visibility and operator workflow basics.

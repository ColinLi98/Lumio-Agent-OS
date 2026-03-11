# M6 - Governance Analytics + Telemetry Aggregation

## Why M6 now

M0 through M5 established the core product and runtime foundations:
- role-aware execution exists in core runtime
- Role Contract compliance and traceability are hardened
- receipts and Activity are readable and durable
- external fulfillment is role-aware and contractized
- policy editing is user-controllable
- versioned proof ledger / history hardening now preserves decision-time truth

The next bottleneck is no longer raw capability. It is governance visibility.

The system can now execute, explain, and preserve decisions. The next question becomes:

**Can we measure whether the system is operating safely, consistently, and effectively across roles, policies, providers, approvals, data-sharing, verification, rollback, and dispute paths?**

Without M6, the product can perform material actions but the team cannot reliably answer:
- which roles cause the most approval friction
- where provider denials are coming from
- which policy edits improve or degrade execution quality
- where data-scope restrictions are suppressing external success
- whether verification, rollback, and dispute rates are improving or worsening
- whether restore / replay / receipt durability is stable in real usage

M6 turns the existing durable ledger into an operational governance layer.

---

## Goal

Build a governance analytics and telemetry aggregation layer on top of the existing proof ledger and receipt system.

This milestone should make the system measurable across:
- decision quality
- approval friction
- provider selection
- data-sharing restrictions
- verification outcomes
- rollback / dispute behavior
- policy override impact
- role-level safety and reliability

---

## Product / platform objective

After M6, the team should be able to answer questions such as:
- Which roles most often trigger approval requirements?
- Which role policies most often suppress external fulfillment?
- Which providers are most frequently denied by policy?
- Which providers have high verification-failure or dispute rates?
- Are policy edits improving affordability, safety, or completion rates?
- Which runs are most affected by explicit task constraints overriding role defaults?
- How often is cloud sync blocked by role policy?
- How often do rollback-capable flows end in dispute?
- What changed after a product, policy, or ranking adjustment?

---

## In scope

### 1. Canonical governance metric schema
Define a stable metric/event vocabulary derived from the durable ledger and receipts.

At minimum support structured aggregation for:
- role
- role source
- delegation mode
- policy snapshot id / version
- provider id / provider class
- external fulfillment attempted
- provider selected / denied
- approval requested / granted / denied
- data scope outcome (full / reduced / redacted / blocked)
- verification outcome
- rollback available / triggered
- dispute opened / pending / resolved if applicable
- explicit-constraint precedence applied
- policy user override applied

### 2. Telemetry aggregation pipeline
Add an internal aggregation layer that can compute rollups from existing ledger records.

This can remain app-local / in-process / lightweight if needed for this pass.
Do not require a full remote analytics pipeline in M6.

### 3. Governance query surfaces
Provide typed query paths so the app/service layer can request governance summaries.

Examples:
- aggregate by role
- aggregate by provider
- aggregate by policy snapshot version
- aggregate by outcome status
- aggregate by reason-code family
- filter by date range or recent window

### 4. Product / internal surfacing
Expose governance summaries in a bounded way.
This may be debug/internal/admin-facing in this pass.

Examples:
- governance summary card
- internal metrics panel
- exportable governance report snippet
- analytics summary in developer or admin mode

### 5. Alert-friendly counters
Add counters and summaries that support future alerting, without requiring a full alerting backend in this pass.

### 6. Documentation and compliance mapping
Update milestone docs/status/spec to record:
- what is measured
- what is aggregated
- what is intentionally deferred
- how metrics map back to receipts / ledger records

---

## Out of scope

Do not do the following in M6:
- no orchestrator rewrite
- no free-form analytics DSL
- no full remote telemetry platform buildout
- no full settlement engine
- no full dispute-resolution backend
- no large end-user UI redesign
- no full history storage migration if additive hardening is sufficient
- no role editor redesign
- no unlimited custom roles

M6 is about **measurement, aggregation, and governance visibility**, not about expanding user-facing execution features.

---

## Recommended typed additions

The exact names may vary, but the system should converge on typed structures such as:
- `GovernanceMetricKey`
- `GovernanceMetricValue`
- `GovernanceAggregationWindow`
- `GovernanceSummary`
- `RoleGovernanceSummary`
- `ProviderGovernanceSummary`
- `PolicySnapshotGovernanceSummary`
- `VerificationGovernanceSummary`
- `DisputeGovernanceSummary`
- `GovernanceQuery`
- `GovernanceQueryResult`
- `GovernanceTrendPoint`
- `GovernanceCounterSet`

If a smaller initial model is safer, start narrow but typed.

---

## Minimum metric families

At minimum, M6 should support these families.

### Role / policy metrics
- `approval_required_rate_by_role`
- `approval_denied_rate_by_role`
- `auto_run_rate_by_role`
- `policy_override_applied_rate_by_role`
- `explicit_constraint_precedence_rate`
- `role_source_distribution`

### External fulfillment metrics
- `external_fulfillment_attempt_rate`
- `provider_selection_rate_by_role`
- `provider_denial_rate_by_role`
- `provider_denial_rate_by_reason_family`
- `quote_selection_divergence_by_role`

### Data-sharing metrics
- `data_scope_full_rate`
- `data_scope_reduced_rate`
- `data_scope_redacted_rate`
- `data_scope_blocked_rate`
- `cloud_sync_block_rate_by_role`

### Verification / reliability metrics
- `verification_pass_rate`
- `verification_fail_rate`
- `proof_missing_rate`
- `rollback_available_rate`
- `rollback_triggered_rate`
- `dispute_open_rate`

### Persistence / durability metrics
- `ledger_restore_success_rate`
- `receipt_traceability_coverage`
- `snapshot_binding_coverage`
- `old_new_history_merge_success_rate`

---

## Query scenarios M6 must support

The implementation should be able to answer these queries in typed form:

1. Last 7 days, grouped by role:
   - approvals requested
   - approvals denied
   - external fulfillment attempts
   - data scope blocked
   - verification failed

2. By provider:
   - selected count
   - denied count
   - verification failure count
   - rollback/dispute count

3. By policy snapshot version:
   - run count
   - external attempt rate
   - approval rate
   - dispute rate
   - proof missing rate

4. By reason-code family:
   - role route excluded
   - policy user override applied
   - data scope restriction applied
   - provider denied by policy

5. For a recent window:
   - receipt generation coverage
   - snapshot binding coverage
   - restore continuity coverage

---

## UX / surfacing guidance

M6 does not require a broad consumer-facing UI pass.
However, it should make governance summaries available in at least one product surface.

Recommended bounded surfaces:
- internal metrics panel
- developer/admin mode analytics summary
- export report block
- debug-friendly governance summary card

If a small user-facing surface is included, keep it narrow and operational, not dashboard-heavy.

Examples of acceptable UI:
- "Recent governance summary"
- "Approvals by role"
- "Provider denials by policy"
- "Verification issues this week"

---

## Implementation guidance

### M6A - Metric schema + extraction
Build a typed extraction layer from the durable ledger / receipts.
Normalize the existing data into canonical aggregation inputs.

### M6B - Aggregation + query layer
Add typed aggregators and query functions.
Support recent-window and simple filter-based rollups.

### M6C - Surfacing + export
Expose the aggregated results in an internal/admin/debug-friendly surface and/or export summary.

### M6D - Tests + docs + validation
Add unit/integration coverage and update docs/status with exact metric coverage.

---

## Definition of done

M6 is done when:

1. Governance summaries can be generated from durable ledger / receipt records.
2. Aggregation supports at least role, provider, policy snapshot, outcome, and reason-family dimensions.
3. The system can answer the minimum query scenarios listed above.
4. At least one internal/admin/debug-facing surface or export path shows readable governance summaries.
5. Metrics are derived from typed runtime/ledger data, not fragile string scraping.
6. Tests cover extraction, aggregation, filtering, and compatibility with mixed old/new history records.
7. Docs/status/spec files are updated with metric coverage and deferred items.

---

## Recommended tests

### Domain / contract tests
- governance summary serialization compatibility
- query/filter compatibility with optional fields

### Orchestrator / ledger tests
- role/policy/provider/verification events correctly feed aggregation extraction
- mixed old/new records do not break aggregation
- policy snapshot version rollups are accurate

### App / formatting / surface tests
- governance summary formatting is readable in English
- internal summary surface renders key counts and trend snippets correctly
- export/report summary includes governance section if applicable

---

## Validation commands

At minimum run:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

Add new M6-specific tests and run them as well.

---

## Deliverables expected from Codex

At the end of the run, report:
- changed files
- typed model additions
- aggregation/query additions
- surfaces added or updated
- tests added/updated
- validation commands run
- deferred items
- blockers if any

---

## Notes on sequencing

M6 should land before any major settlement/dispute backend deepening.
The product now has enough durable state to support governance measurement. Use that advantage before expanding infra scope.

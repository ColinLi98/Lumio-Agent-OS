# M3 - External Fulfillment Full Role-Aware Contractization

## Purpose

This document defines **M3: External Fulfillment Full Role-Aware Contractization** for Lumi Agent OS.

M0 established role-aware execution as a core runtime capability.
M1 hardened Role Contract v1 compliance.
M2 made role-aware execution readable through receipt-first activity and explainability surfaces.

M3 extends that foundation into **external fulfillment** so that provider selection, approvals, data sharing, verification, and rollback behavior are all shaped by role-aware policy and expressed through typed contracts and readable receipts.

This is **not** a marketplace expansion pass and **not** a broad backend rewrite.
This is a tightly scoped role-aware contractization and traceability pass for external execution.

---

## Why M3 now

The product can already:
- carry `activeRole` through core request / contract flows
- apply role-aware policy, approvals, routing, ranking, and data-sharing decisions
- explain those decisions in readable English
- generate receipt-first activity surfaces for internal execution flows

The next missing layer is **external execution trustworthiness**.

Without M3, the product risks becoming:
- internally explainable but externally under-specified
- strong at recommending but weaker at delegating high-value work
- receipt-rich for internal flows but shallow for provider-mediated outcomes

M3 closes that gap by making external fulfillment:
- quote-aware
- role-aware
- proof-aware
- rollback-aware
- receipt-visible

---

## Product goal

Turn **External Fulfillment** into a role-aware, contract-oriented execution layer where:
- providers are compared using typed quotes and readable tradeoffs
- provider selection can materially change by role policy
- external approvals, data scope, and proof requirements are role-aware
- verification, rollback, and dispute paths are traceable in receipts and Activity

---

## Strategic intent

M3 should move the product from:
- "we can call external capabilities"

to:
- "we can delegate work externally within explicit user role, policy, proof, and recovery boundaries"

This is the difference between an assistant that can browse providers and an Agent OS that can safely orchestrate external work.

---

## Source of truth documents

Before implementation, read:
- `docs/Role_Contract_v1.md`
- `docs/M1_Role_Contract_v1_Compliance_Hardening.md`
- `docs/M2_Explainability_Activity_Receiptization.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Update the spec / plan / status docs during this milestone.

---

## In scope

### 1. Typed external-fulfillment contract strengthening
Strengthen or extend typed models around:
- `Quote`
- `ProviderSelectionSummary` or equivalent
- `ProviderPolicyDecision` or equivalent
- `ProviderDenyReason` or equivalent
- `VerificationSummary`
- `ProofSummary`
- `RollbackSummary`
- `DisputeSummary` or equivalent

These exact names may vary, but the semantic coverage must be explicit.

### 2. Role-aware quote comparison
External offers must be compared through role-aware logic, not only raw price or generic score.

Comparison should account for:
- price
- ETA
- risk
- proof method
- rollback / dispute terms
- provider trust fit
- role policy fit

### 3. Role-aware provider selection and denial
Provider selection must be materially influenced by role-aware policy.
If a provider is denied or down-ranked by policy, the system must produce readable reasons.

### 4. Role-aware approval gating for external execution
External execution must respect role-aware approval thresholds and approval classes.
The system must clearly express why approval is required, skipped, or denied.

### 5. Role-aware provider-facing data scope
The actual data sent or made available to an external provider must be filtered by role-aware policy.
This must be visible in summary form in receipt / activity surfaces.

### 6. Role-aware proof and verification requirements
Proof and verification expectations for external fulfillment must be role-aware where applicable.
For example, some roles may require stronger receipt evidence, compliance details, or reduced data exposure.

### 7. Receipt / Activity end-to-end external chain
Activity and receipt surfaces must show the external fulfillment chain where applicable:
- quote collected
- provider selected
- provider denied by policy
- approval requested / granted / denied
- execution started
- proof returned
- verification passed / failed
- rollback available / triggered
- dispute opened / updated

### 8. Tests, telemetry, and docs
Add or update scenario tests, telemetry, and documentation for external role-aware execution.

---

## Out of scope

Do **not** do the following in M3:
- build a custom role editor
- expand the number of built-in roles broadly
- rewrite the orchestrator
- redesign the full marketplace backend
- introduce a full settlement engine rewrite
- do a broad visual redesign
- do a full Room history schema migration if additive compatibility is sufficient
- turn this into a generic marketplace growth initiative

This pass is about **contractization, explainability, proof, and recovery** for external fulfillment.

---

## Product principles for M3

### External Fulfillment is contextual, not browse-first
Do not optimize for users browsing a marketplace first.
Optimize for:
1. detect capability gap or external superiority
2. gather role-aware quotes
3. compare tradeoffs clearly
4. request approval when needed
5. execute
6. verify
7. record receipt / proof / rollback path

### Role policy is a real execution boundary
Role-aware policy is not decoration.
It must influence:
- provider eligibility
- provider ranking
- approval requirements
- data scope
- proof expectations
- rollback / dispute posture where applicable

### Explainability must remain concise
Readable explanations should be in plain English, concise, and consistent with canonical reason codes.
Do not flood the UI with internal debug strings.

### Success and failure must both be first-class
Do not build only the successful provider-selection path.
External denial, proof failure, verification failure, rollback, and dispute-relevant states must also produce coherent receipts.

---

## Recommended typed model direction

The implementation may adapt current models incrementally, but should move toward the following semantic objects.

### Quote
Should support or summarize:
- provider identity
- offer summary
- price / pricing notes
- ETA / delivery estimate
- proof method
- verification expectations
- rollback or dispute terms
- provider trust indicators
- role-policy fit summary

### ProviderSelectionSummary
Should support or summarize:
- selected provider
- selection rationale
- role-aware factors that influenced the choice
- competing offers considered
- whether approval was needed before selection or before execution

### ProviderPolicyDecision
Should support or summarize:
- allowed / denied / deprioritized
- canonical reason codes
- concise readable explanation
- role and role source context

### VerificationSummary
Should support or summarize:
- proof received or missing
- verification passed / failed / partial
- verification notes
- role-aware proof requirement summary

### RollbackSummary
Should support or summarize:
- rollback available / not available
- rollback triggered or not
- rollback reason
- dispute path summary if applicable

### DisputeSummary
If dispute flows exist or are partially modeled, support or summarize:
- dispute opened / not opened
- issue type
- traceability / evidence summary

---

## Required external chain semantics

The external chain should be representable end-to-end in typed models and visible surfaces.

### Minimum external chain
1. Quote requested
2. Quote received
3. Provider selected or denied
4. Approval requested / granted / denied (if needed)
5. External execution started
6. Proof returned or missing
7. Verification passed / failed / partial
8. Rollback available / triggered (if applicable)
9. Dispute opened / noted (if applicable)

The exact state representation may reuse existing structures where appropriate, but the chain must be visible.

---

## Role-aware quote comparison requirements

The same quote set must be able to produce different outcomes depending on role-aware policy.

Examples:
- `WORK` may prefer providers with stronger compliance, traceability, or business-process fit.
- `BUYER` may weight commercial terms, trust fit, and dispute terms more heavily.
- `TRAVELER` may weight ETA and execution continuity.
- `PARENT` may prioritize stronger data minimization and lower data-sharing exposure.

### Required behavior
- role-aware ranking must be real, not cosmetic
- role-aware denial must be possible even if a provider has a high generic score
- provider selection output must include concise readable reasons

---

## Role-aware approval requirements

External execution approval behavior must reflect role-aware policy.

Examples:
- a provider may require approval under one role but not another
- the same price may be acceptable in one role and blocked in another
- some roles may restrict certain classes of external action regardless of ranking

### Required behavior
- approval prompts must cite concise readable role-aware reason summaries
- approval decisions must appear in receipts and Activity where applicable
- denial or non-execution caused by policy must be visible and explainable

---

## Role-aware provider-facing data scope

The system must apply role-aware data policy to external providers at the actual provider-facing boundary, not only in internal explanation.

### Required behavior
- role-aware data minimization must shape what is sent to or exposed to the provider
- receipts and Activity should summarize data scope in readable English
- blocked or reduced data sharing should produce readable reasons

---

## Role-aware proof and verification

External fulfillment must not end at provider selection.
Verification and proof must be part of the contractized path.

### Required behavior
- proof expectations should be role-aware where applicable
- proof returned or missing must be receipt-visible
- verification passed / failed / partial must be visible in Activity and receipt surfaces
- proof / verification failure must not collapse into generic error copy

---

## Rollback and dispute guidance

If rollback or dispute concepts already exist in partial form, connect them to the external receipt chain.
If they do not exist deeply yet, add the minimum typed summary layer and receipt visibility required for M3.

### Required behavior
- rollback availability must be visible where applicable
- rollback triggered must be traceable
- dispute-capable or issue-reported paths must be coherent and readable

M3 is not required to fully redesign settlement or dispute infrastructure.
It **is** required to represent rollback / dispute semantics clearly enough for users and reviewers to understand the external execution outcome.

---

## Receipt and Activity requirements

M2 established receipt-first surfaces.
M3 extends those surfaces for external fulfillment.

### Every material external run should be able to show
- active role
- role source
- delegation mode
- external quote summary
- selected or denied provider summary
- approval summary
- data-scope summary
- proof summary
- verification summary
- rollback / dispute summary where applicable

### Required surfaces
- Activity
- response details / execution receipt block
- chat execution panel
- export summary snippets where applicable

### Readability requirement
Readable English should answer:
- which provider was selected or denied
- how role policy influenced the decision
- whether approval was required
- what data scope was used
- whether proof was returned and verified
- whether rollback or dispute remains available

---

## Suggested canonical reason-code families

Preserve the canonical `ROLE_*` direction from M1.
For M3, ensure coverage extends into external fulfillment through families such as:
- `ROLE_PROVIDER_*`
- `ROLE_QUOTE_*`
- `ROLE_EXTERNAL_APPROVAL_*`
- `ROLE_EXTERNAL_DATA_SCOPE_*`
- `ROLE_EXTERNAL_PROOF_*`
- `ROLE_EXTERNAL_VERIFICATION_*`
- `ROLE_EXTERNAL_ROLLBACK_*`
- `ROLE_EXTERNAL_DISPUTE_*`

Exact names may vary, but the structured family concept should remain stable and readable.

---

## Testing requirements

Add or update tests for the following scenario families.

### Required scenario tests
1. **Same quotes, different roles**
   - same provider set
   - different role-aware ranking or selection outcomes

2. **Role policy denies top-ranked provider**
   - generic score prefers one provider
   - role-aware policy denies or demotes it

3. **Role-aware data scope to provider**
   - provider-facing data scope is reduced or blocked based on role policy

4. **Approval required in one role but not another**
   - same quote / action
   - different approval behavior by role

5. **Proof returned and verified**
   - success path produces coherent external receipt

6. **Proof missing or verification failed**
   - failure path produces coherent external receipt and explanation

7. **Rollback / dispute traceability**
   - rollback or issue-reported path is visible in receipts / Activity if applicable

8. **Restore / resume continuity for external receipt traceability**
   - receipt trace remains coherent after restore / resume where applicable

### Test surfaces
- domain / contract tests
- orchestrator tests
- formatter / UI-model tests
- targeted app-host receipt display tests where appropriate

---

## Telemetry recommendations

Add telemetry that helps determine whether external role-aware execution is actually working in practice.

Suggested metrics:
- `quote_selection_divergence_by_role`
- `provider_denied_by_role_policy_rate`
- `approval_required_rate_by_role_for_external_runs`
- `external_data_scope_reduction_rate_by_role`
- `proof_missing_rate_by_role`
- `verification_failure_rate_by_role`
- `rollback_receipt_coverage`
- `dispute_traceability_coverage`
- `external_receipt_generation_rate`

Telemetry implementation may be incremental, but the spec / plan / status docs should note what was added and what remains deferred.

---

## Milestone breakdown

### M3A - Typed quote and provider decision strengthening
Focus on:
- typed quote / provider decision semantics
- readable provider selection and denial summaries
- canonical reason-code coverage for external decisions

### M3B - Role-aware approval, data scope, and proof requirements
Focus on:
- approval behavior
- provider-facing data scope behavior
- proof / verification requirement visibility

### M3C - Receipt / Activity end-to-end external chain
Focus on:
- receipt-first external chain representation
- Activity visibility for external execution events
- success and failure path coherence

### M3D - Tests, telemetry, docs, and validation
Focus on:
- scenario coverage
- telemetry additions
- docs / status updates
- validation commands and regression safety

---

## Validation commands

Run relevant commands after each meaningful batch and fix failures before continuing.

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

Add or adjust targeted tests if new provider-facing or receipt formatting coverage requires it.

---

## Implementation checkpoint (2026-03-03)

### Completed
1. Typed external fulfillment summaries are attached to LIX payload and execution receipt:
   - provider selection/policy decision
   - approval summary
   - provider-facing data scope summary
   - proof summary
   - verification summary
   - rollback summary
   - dispute summary
2. Role-aware quote comparison is runtime-effective:
   - provider denial remains policy-first
   - buyer path supports affordability-weighted selection within policy limits
3. Provider-facing data projection is runtime-effective:
   - redaction/block applies before broadcast
   - blocked/reduced scope survives finalization and receipt generation
4. Reject review semantics are dispute-safe:
   - explicit reject maps to `DISPUTED` even when gateway review sync fails
   - summary marks gateway sync as pending instead of losing dispute traceability
5. Receipt-first surfaces consume typed external chain summaries without parallel UI systems.

### Added telemetry counters (in-process)
- `external_receipt_generation_rate`
- `quote_selection_divergence_by_role`
- `provider_denied_by_role_policy_rate`
- `approval_required_rate_by_role_for_external_runs`
- `external_data_scope_reduction_rate_by_role`
- `proof_missing_rate_by_role`
- `verification_failure_rate_by_role`
- `rollback_receipt_coverage`
- `dispute_traceability_coverage`

### Deferred (explicit)
1. Telemetry export/aggregation pipeline beyond in-process counters.
2. Marketplace settlement/dispute backend redesign.

---

## Definition of done

M3 is complete when:

1. external offers are compared through typed, role-aware quote / contract structures
2. provider selection can be materially changed by role policy, with readable reasons
3. external approvals, data-sharing scope, and proof requirements are role-aware and visible
4. verification, rollback, and dispute-relevant states are reflected in receipts and Activity
5. both success and failure paths produce coherent external fulfillment receipts
6. tests cover role-aware quote selection, denial, data scope, proof failure, and rollback / dispute traceability
7. docs / status are updated with exact M3 compliance mapping and deferred items

---

## Explicit non-goals reminder

To avoid scope drift, M3 must **not** become:
- a custom role policy editor project
- a marketplace growth program
- a settlement-engine redesign
- a broad visual redesign
- an orchestrator rewrite

Keep the milestone tightly scoped to **role-aware external fulfillment contractization**.

---

## End-of-milestone reporting requirements

At the end of the M3 run, report:
- changed files
- typed model additions or changes
- provider-selection and quote-comparison changes
- approval / data-scope / proof changes
- receipt / Activity changes
- tests added / updated / run
- telemetry added or deferred
- exact remaining gaps, if any

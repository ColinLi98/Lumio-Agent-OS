# M34 - Enterprise Governance Closed-Loop Learning for Portfolio Optimization (Feedback, Drift Correction, Objective Tuning)

## What this milestone is

M34 adds a **closed-loop learning layer** on top of M33’s local-first portfolio optimizer.

M33 delivered:
- typed optimization requests/results and candidate schedules (top-N)
- deterministic local-first bounded solver
- hard constraints: blackout/maintenance windows, readiness, approvals, dependencies, capacity, guardrails, concurrent risk limits
- durable selection and restore continuity
- first-class explainability (scores, binding constraints, tradeoffs) and readable governance summaries

M34 turns optimization from “plan once” into **plan → observe → learn → improve** while keeping:
- additive/backward-compatible payloads
- local-first execution
- durable audit trails and readable explanations
- no destructive automation and no BPM/workflow DSL

---

## Why M34 is next

After M33, the missing piece is **calibration**.

Operators will immediately ask:
- Did the chosen schedule actually execute as expected?
- Which constraints were binding in reality vs predicted?
- Are our objective weights (risk vs speed vs cost) tuned correctly for this environment?
- Are we over-penalizing approvals or under-estimating readiness delays?
- When reality diverges (drift), how do we correct the optimizer safely without silently changing behavior?

M34 makes those answers durable, typed, and explainable.

---

## Goal

Add typed, durable feedback ingestion and closed-loop updates so the portfolio optimizer can:
- record outcome signals from schedule execution and governance operations
- detect prediction-vs-reality drift
- propose (and optionally apply) bounded objective/parameter adjustments
- preserve historical non-rewrite semantics via snapshots and decision-time bindings
- surface readable learning summaries in governance/operator views

This is not ML/AI “model training”.
It is a bounded, deterministic, auditable learning loop suitable for enterprise governance.

---

## In scope

### 1) Typed feedback / outcome contracts
Add or strengthen typed concepts such as:
- `PortfolioScheduleOutcomeRecord`
- `PortfolioExecutionObservation`
- `PortfolioApprovalLatencyObservation`
- `PortfolioWindowUtilizationObservation`
- `PortfolioRiskIncidentObservation`
- `PortfolioConstraintBindingObservation`
- `PortfolioOutcomeSummary`

These capture what actually happened after selection.

### 2) Drift detection contracts
Add or strengthen typed concepts such as:
- `PortfolioOptimizationDriftSummary`
- `PortfolioDriftSignal`
- `PortfolioDriftSeverity`
- `PortfolioPredictionVsActualDelta`
- `PortfolioDriftEvidenceRef`

Drift detection must be explicit and durable, not hidden.

### 3) Objective tuning / calibration contracts
Add or strengthen typed concepts such as:
- `ObjectiveWeightVector`
- `ObjectiveWeightFamily` (bounded families only)
- `ObjectiveTuningSuggestion`
- `ObjectiveTuningDecisionRecord`
- `ObjectiveTuningGuardrail`
- `OptimizationParameterCalibration`
- `CalibrationSnapshotBinding`

### 4) Learning loop runtime behavior
Add real runtime behaviors:
- ingest outcome/feedback events
- compute deltas vs predicted scores/constraints
- compute bounded tuning suggestions (e.g., adjust approval-latency penalty, risk penalty slope)
- apply changes only under explicit rules (see below)
- bind tuning changes to snapshots so past receipts are not reinterpreted

### 5) Visibility and explainability
Expose readable learning summaries:
- “Observed vs predicted” deltas
- top drift signals
- recommended tuning (if any)
- whether tuning was applied, deferred, or blocked by guardrails
- canonical reason-code families for learning decisions

### 6) Restore/replay continuity
Feedback, drift, and tuning records must survive process death and restore like M33 selections.

### 7) Query / filter support
Add query support where practical for:
- drift severity
- tuning applied vs pending
- objective family impacted
- time window / horizon
- schedule id / decision id linkage

---

## Out of scope

Do not do the following in M34:
- remote/cloud optimization service
- any destructive automation
- full ML model training pipeline
- broad operator-console redesign
- orchestrator rewrite
- broad storage/history rewrite
- general-purpose workflow DSL

---

## Design principles

1. **Bounded and deterministic**
   Learning updates must remain deterministic given the same inputs and seeds.

2. **No silent behavior changes**
   If objective weights or calibration parameters change, it must be durable and visible.

3. **Historical non-rewrite**
   Past decisions remain bound to their decision-time calibration snapshot.

4. **Guardrails first**
   Tuning must be capped and blockable:
   - max delta per time window
   - minimum evidence threshold
   - block tuning if incidents increase beyond threshold
   - require approval for high-impact changes

5. **Readable explanations**
   Operators must understand why the optimizer changed its behavior.

---

## Required runtime behaviors

### A) Outcome recording
When a schedule is selected and later acted upon (or fails to act):
- record a typed outcome record
- link to the schedule decision id
- record which constraints were actually binding
- record window utilization results (used/underused/expired)
- record approval latency and readiness delays if available

### B) Drift computation
Compute drift such as:
- predicted feasible window vs actual missed window
- predicted approval capacity vs actual backlog
- predicted risk-limited concurrency vs actual incidents
- predicted readiness time vs actual readiness delay

### C) Tuning suggestion
If drift exceeds thresholds:
- generate bounded tuning suggestions (e.g., increase approval-latency penalty weight)
- include evidence references and confidence bounds

### D) Tuning application
Support “apply tuning” as a typed operation that:
- writes a durable decision record
- binds a new calibration snapshot id/version
- does not rewrite prior receipts/summaries
- updates future optimization requests’ default calibration context

### E) Learning explainability
Expose in governance summaries:
- drift status
- tuning status
- top deltas
- “why tuning applied/blocked”

---

## Suggested reason-code families

Add or strengthen canonical reason families (names can vary but must be structured):
- `ROLE_PORTFOLIO_LEARNING_OUTCOME_RECORDED`
- `ROLE_PORTFOLIO_LEARNING_DRIFT_DETECTED`
- `ROLE_PORTFOLIO_LEARNING_TUNING_SUGGESTED`
- `ROLE_PORTFOLIO_LEARNING_TUNING_APPLIED`
- `ROLE_PORTFOLIO_LEARNING_TUNING_BLOCKED_GUARDRAIL`
- `ROLE_PORTFOLIO_LEARNING_INSUFFICIENT_EVIDENCE`

---

## Suggested milestone breakdown

### M34A - Feedback contracts + persistence
- outcome records
- observation events
- durable storage + restore

### M34B - Drift detection + readable summaries
- prediction vs actual deltas
- drift severity and evidence
- governance visibility

### M34C - Objective tuning suggestions + guardrails
- bounded tuning suggestions
- guardrail evaluation
- apply/deny operations

### M34D - Tests + docs/status mapping
- determinism tests
- continuity tests
- visibility tests
- update spec/plan/status + memory logs

---

## Required tests

Add or update tests for at least:

1. contract round-trip for feedback/drift/tuning records and mixed-history decode
2. deterministic drift computation for the same inputs/seeds
3. tuning suggestion triggers only when drift thresholds exceed
4. guardrails block excessive tuning deltas
5. apply tuning persists and affects subsequent optimization ranking deterministically
6. restore continuity preserves selected schedule + outcomes + drift + tuning bindings
7. readable summaries export drift/tuning lines and reason codes

---

## Validation commands

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

---

## Definition of done

M34 is done when:
1. feedback/outcome records are typed, durable, and linked to M33 decisions
2. drift detection is typed, durable, and readable in governance summaries
3. tuning suggestions exist with guardrails and can be applied as typed operations
4. tuning changes are snapshot-bound and do not rewrite historical meaning
5. restore continuity holds for outcomes/drift/tuning state
6. tests and docs/status are updated and green

---

## Deferred after M34

- remote/cloud optimization service
- automatic execution of schedules (still manual/operator-driven)
- destructive automation
- broad console redesign
- full ML pipeline

## Next likely milestone after M34

- **M35 - Multi-tenant Objective Profiles, Cross-tenant Learning Isolation, and Safe Propagation Rules**

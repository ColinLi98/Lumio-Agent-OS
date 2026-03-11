# M32 — Enterprise Governance Portfolio Simulation, Scenario Planning, and Capacity Forecast Operations

## Why M32 exists now

M31 introduced capacity-aware governance:
- approval load balancing
- queue pressure visibility
- critical-path protection under constrained human review capacity
- capacity-driven defer/pause/reassign behaviors with durable traceability

The next limiting factor is decision quality under uncertainty.

Operators and governance programs need to answer "what happens if…" questions before making changes:
- If we promote Pack A to more tenants next window, will approval capacity saturate?
- If we schedule 3 governance programs in the same week, what conflicts and bottlenecks appear?
- If we tighten automation guardrails for one tenant group, what is the expected backlog growth?
- If we pause a wave or shift windows, what is the predicted completion date?

M32 adds a portfolio-level simulation and forecasting layer, grounded in the existing durable governance signals (ledger, receipts, analytics), without introducing a general BPM/DSL or a full remote analytics platform.

---

## Goal

Enable internal/operator-facing portfolio simulation and capacity forecasting so governance leaders can:
- run deterministic what-if simulations on governance programs, waves, windows, and pack promotions
- forecast approval demand and queue pressure by time bucket
- compare scenarios and choose safer promotion schedules
- produce durable simulation evidence to support approvals and program coordination decisions

---

## In scope

### 1. Typed simulation and forecasting contracts

Introduce or strengthen typed concepts such as:

#### Scenario and simulation run
- `PortfolioScenarioDefinition`
- `PortfolioScenarioAssumptionSet`
- `PortfolioSimulationRunRecord`
- `PortfolioSimulationRunStatus`
- `PortfolioScenarioVariant`
- `PortfolioScenarioComparison`

#### Forecast outputs
- `ApprovalDemandForecast`
- `QueuePressureForecast`
- `ProgramCompletionForecast`
- `WindowEligibilityForecast`
- `ForecastTimeBucket`
- `ForecastConfidenceBand` (optional; may be coarse)

#### Inputs derived from durable records
- `BaselinePortfolioSnapshot`
- `BaselineCapacitySnapshot`
- `BaselineProgramStateSnapshot`
- `BaselineWaveStateSnapshot`

Exact names may vary, but the concepts must be typed, durable, and queryable.

### 2. Deterministic simulation engine (bounded)

Add a bounded simulation engine that can:
- take current durable portfolio state as baseline input
- apply scenario modifications (what-if changes)
- output forecast buckets
- produce a durable simulation record with a summary and evidence trace

This is **not** a generic optimization platform.
It is a practical forecast tool grounded in existing governance semantics.

### 3. Supported scenario modifications (bounded set)

At minimum support:

#### Rollout plan edits
- shift a wave to a different window
- pause/resume a program for a window range
- change wave ordering within a program
- adjust wave size or tenant cohort selection (bounded)
- switch pack rollout stage/mode for a target scope (simulation-only)

#### Capacity adjustments
- approval capacity by role/team/time bucket
- approval queue allocation weights (bounded)
- reserve capacity for critical programs (toggle/weight)
- maximum parallel approvals or concurrency limits (bounded)

#### Automation adjustments (bounded)
- simulation toggles (simulate enforcement vs simulation-only)
- throttle/cooldown/suppression parameter changes (simulation-only)

### 4. Evidence and auditability

Every simulation run must produce durable artifacts:
- baseline snapshot reference
- scenario definition
- simulation output summary
- key derived recommendations (optional)
- reason-family codes for major conclusions (e.g., capacity breach expected)

Simulation should not overwrite live governance truth.
It is an overlay used for decision support.

### 5. Operator surface / console integration (internal)

Add an internal/admin/operator surface that supports:
- create scenario from current baseline
- edit scenario parameters
- run simulation
- view forecast summary (approval demand, queue pressure, completion estimates)
- compare two scenarios
- export simulation summary snippet

This can remain internal-facing and minimal.

### 6. Linkage to approvals and promotion operations

Simulation outputs should be attachable to:
- promotion requests
- rollout decisions
- program coordination conflicts
- approval governance operations

This should be additive: do not block core functionality.

---

## Out of scope

- General-purpose BPM/workflow DSL
- Destructive automation
- Orchestrator rewrite
- Broad operator console redesign
- Full data-warehouse rollout or external BI integration
- Full remote multi-tenant simulation service
- Machine-learning forecasting platform rebuild

---

## Design principles

1. **Bounded and deterministic**
   Prefer deterministic, explainable forecasts over opaque predictions.

2. **Baseline from durable truth**
   Simulation inputs must come from ledger/receipts/governance state, not UI-only state.

3. **Local-first**
   Simulation runs should work locally/in-process for now.
   Remote execution can be deferred.

4. **Explainable outputs**
   Forecasts must explain why they predict saturation or completion delays (via reason families and top drivers).

5. **Non-invasive**
   Simulation does not alter live governance state unless an operator explicitly converts a scenario into an approved action (which is out of scope for M32; M32 focuses on simulation and evidence).

---

## Suggested milestone breakdown

### M32A — Typed scenario + simulation run contracts
- add typed scenario definitions, run records, forecast buckets, and summaries
- ensure backward compatibility

### M32B — Baseline snapshot extraction
- derive baseline portfolio/capacity/program/wave snapshots from durable records
- ensure restore continuity and queryability

### M32C — Simulation and forecasting engine
- implement deterministic forecast computation
- output approval demand and queue pressure by time bucket
- output program completion estimates and window eligibility forecasts

### M32D — Operator surface + tests + docs
- internal simulation UI (minimal)
- export snippet
- tests and documentation updates

---

## Required behaviors

### Forecast buckets
At minimum support forecasts per time bucket (e.g., per day or per window):
- expected approval demand
- expected queue pressure / saturation indicator
- expected backlog growth
- expected completion dates for each program/wave (coarse estimates are acceptable)

### Capacity breach signals
When expected demand exceeds capacity:
- produce typed breach status
- include top drivers (e.g., which programs/waves)
- include suggested mitigation knobs (e.g., shift window, reduce wave size)

### Scenario comparison
Given baseline and two scenarios:
- produce a diff summary (which scenario reduces breach risk / improves completion)
- include readable reasons

---

## Canonical reason code direction

Add structured reason families where useful, for example:
- `ROLE_PORTFOLIO_SIMULATION_RUN_CREATED`
- `ROLE_PORTFOLIO_SIMULATION_CAPACITY_BREACH_PREDICTED`
- `ROLE_PORTFOLIO_SIMULATION_BACKLOG_GROWTH_PREDICTED`
- `ROLE_PORTFOLIO_SIMULATION_COMPLETION_DELAY_PREDICTED`
- `ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_SHIFT_WINDOW`
- `ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_REDUCE_WAVE_SIZE`
- `ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY`

Exact names may vary; keep them canonical and queryable.

---

## Persistence and continuity

Persist:
- scenario definitions
- simulation run records
- forecast outputs
- comparison results (optional)
- baseline snapshot references

Ensure:
- process death / restore keeps simulation history
- old/new mixed history remains compatible
- simulation evidence does not rewrite past truth

---

## Tests required

Add or update tests for:

1. contract serialization round-trip for scenario + run + forecast objects
2. deterministic simulation output given a fixed baseline
3. scenario modification impacts forecast in expected direction (e.g., shift window reduces breach)
4. capacity breach detection and reason-family output
5. scenario comparison output readability and correctness
6. persistence/restore continuity for simulation artifacts
7. formatter/export snippet includes scenario id, baseline id, and key forecast buckets
8. governance console can render simulation summary (internal surface)

Keep the existing full validation gate green.

---

## Validation commands

Run and keep green:

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

M32 is done when:

1. typed scenario + simulation run + forecast contracts exist and are backward compatible
2. baseline portfolio/capacity snapshots are derived from durable governance truth
3. deterministic simulation outputs approval demand/queue pressure/completion forecasts by time bucket
4. capacity breach and backlog growth signals are typed and explainable
5. operators can create/run/compare scenarios in an internal surface and export summary snippets
6. simulation artifacts persist and survive restore
7. tests cover determinism, scenario modifications, breach detection, persistence, and formatting
8. docs/status are updated with scope and deferred items

---

## What comes next

After M32, the natural next step is:
- **M33 — Enterprise Governance Portfolio Optimization, Multi-Objective Tradeoffs, and Risk-Aware Scheduling**

This would remain bounded (no general DSL) but introduce stronger decision support and optimization suggestions.


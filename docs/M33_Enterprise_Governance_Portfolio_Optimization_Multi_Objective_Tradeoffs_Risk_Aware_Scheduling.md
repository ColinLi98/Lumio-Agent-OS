# M33 - Enterprise Governance Portfolio Optimization, Multi-Objective Tradeoffs, and Risk-Aware Scheduling

## What this milestone is

M33 upgrades the enterprise governance system from:
- capacity-aware governance (M31)
- portfolio simulation and scenario planning (M32)

into a **multi-objective portfolio optimization and risk-aware scheduling layer**.

This milestone is about producing **actionable, explainable schedules** under real constraints:
- limited approval capacity
- blackout / maintenance windows
- program priorities, dependencies, and blockers
- risk posture and guardrails
- promotion readiness and wave readiness
- cross-program conflicts

M33 is not a generic BPM engine. It is an optimization and scheduling layer on top of the existing typed governance truth chain.

---

## Why M33 now

By M32, the system can simulate and forecast:
- approval capacity availability
- governance load across programs
- what-if scenarios for policy rollouts, waves, and windows
- projected delays and queue pressure under alternative assumptions

However, operators still need the system to answer:

1. **Given constraints, what should we do next?**
2. **What schedule best balances risk, throughput, and SLA commitments?**
3. **If we change risk tolerance or prioritization, how does the schedule change?**
4. **What is the optimal frontier, not just one recommendation?**
5. **What tradeoffs are we making, and why?**

M33 adds a typed portfolio optimization engine that can output:
- recommended schedules
- alternative schedules
- Pareto-style tradeoff summaries
- reasoned explanations of objective tradeoffs and constraint binding points

---

## Goal

Add a typed, durable, explainable **multi-objective optimizer** that produces portfolio scheduling recommendations across:
- programs
- waves
- windows
- approvals
- remediation automation (safe-only)
- escalation operations

The optimizer must be:
- deterministic enough for testing (seeded)
- compatible with local-first execution
- additive and backward-compatible
- auditable (inputs, constraints, objectives, outputs, reasons)

---

## Core product outcome

After M33, operators should be able to:
1. generate a schedule recommendation set (top-N candidates)
2. see objective scores and constraints that bind the schedule
3. choose a recommended schedule or keep current plan
4. understand tradeoffs (e.g., “risk reduced but throughput lower”)
5. see which actions were deferred due to risk, window, capacity, or dependency constraints
6. preserve durable traceability of the optimization decision and schedule selection

---

## In scope

### 1. Typed optimization contracts

Add or strengthen typed concepts such as:

- `PortfolioOptimizationRequest`
- `PortfolioOptimizationObjectiveProfile`
- `PortfolioOptimizationObjectiveWeight`
- `PortfolioOptimizationConstraintProfile`
- `PortfolioOptimizationConstraint`
- `PortfolioOptimizationScenarioSet`
- `PortfolioOptimizationSolverConfig`
- `PortfolioOptimizationResult`
- `PortfolioOptimizationCandidateSchedule`
- `PortfolioOptimizationCandidateScore`
- `PortfolioOptimizationParetoFrontierSummary`
- `PortfolioOptimizationTradeoffExplanation`
- `PortfolioOptimizationBindingConstraintSummary`
- `PortfolioOptimizationDecisionRecord` (selected schedule)

Exact names may vary, but the semantics must be explicit and typed.

### 2. Objective families

Support a bounded set of objective families, for example:

- **Throughput:** maximize completed promotions / completed waves per window
- **Risk:** minimize risk-weighted exposure (verification failures, dispute rate, rollback probability, provider/vault/identity instability)
- **SLA:** minimize SLA breach risk / escalation overdue risk
- **Fairness:** avoid starving specific tenants/workspaces/programs over time
- **Stability:** reduce churn (avoid re-planning too often)
- **Cost / Friction:** minimize approval load or operator workload
- **Critical-path protection:** prioritize escalated or high-impact programs

This is not a “free-form objective DSL.” Keep objectives enumerated and typed.

### 3. Constraint families

Support a bounded set of constraint families, for example:

- approval capacity per time bucket
- window eligibility (blackout/maintenance)
- dependencies (program or wave prerequisites)
- readiness gating (promotion readiness, wave readiness)
- guardrails (do not schedule actions suppressed by policy)
- max concurrent risky promotions
- mandatory review requirements for high-risk transitions
- max automation actions per case per window (safe-only)
- pinned or exempt targets (cannot be changed / must be skipped)

Keep constraints typed and queryable.

### 4. Solver and scheduling behavior

Implement a practical optimization approach suitable for local-first execution (examples):
- greedy + local search improvement
- bounded beam search
- Monte Carlo scenario search
- constrained knapsack-style selection per window
- Pareto candidate generation under multiple objective profiles

Important:
- Provide deterministic seeding for reproducibility.
- Keep solver runtime bounded and measurable.
- Prefer generating a small top-N candidate set over attempting a global optimum.

### 5. Explainability and audit trail

Every optimization run must output:
- objective profile used
- constraint profile used
- scenario assumptions (scenario set or baseline forecast inputs)
- candidate schedules with objective scores
- binding constraint summaries
- readable tradeoff explanations
- selected schedule decision (if chosen) as a durable record

### 6. Governance/operator visibility (additive)

Add an internal-facing view or summary lines that show:
- “Recommended schedule: …”
- “Alternative schedules: …”
- “Tradeoffs: …”
- “Binding constraints: …”
- “Why deferred: …”

Do not require a broad UI redesign. This can be:
- a new section in the governance console detail panel
- a new “Optimization” card in internal/developer path
- exportable snippet fields

### 7. Restore/replay continuity

Optimization decisions and selected schedules should be recoverable after process death and replay, consistent with existing durability semantics.

---

## Out of scope

Do not do the following in M33:

- a general-purpose workflow DSL or BPM engine
- destructive automation
- orchestrator rewrite
- broad operator console redesign
- broad storage/history rewrite
- full-blown cloud optimizer requirement (keep local-first; remote extraction can be adapter-ready but not required)

---

## Design principles

1. **Optimization is advisory unless explicitly applied**
   Generating a schedule is not the same as executing it.

2. **Explainability is mandatory**
   Every recommendation must come with a readable “why” and “tradeoff” summary.

3. **Constraints are first-class**
   The system must say *which constraint prevented a better score* (binding constraints).

4. **Multi-objective means multiple candidates**
   Provide top-N schedules or Pareto-like candidates; don’t pretend one schedule is universally optimal.

5. **Compatibility and durability**
   Keep changes additive and preserve decode/render for older history.

---

## Required runtime behaviors

### A. Optimization request and result generation
- Accept a typed optimization request.
- Generate a small candidate set (top-N), each with:
  - actions selected per time bucket/window
  - objective scores
  - constraint violations (must be none) or explicit “rejected candidate” logs (optional)

### B. Tradeoff explanation
For each candidate, produce:
- “improves X but worsens Y” style explanations
- explicit binding constraint summaries (capacity, window, dependency, risk limit)

### C. Schedule selection
Support an explicit “select schedule” operation that:
- records the selected schedule id
- records the objective profile and constraints used
- records timestamp and operator identity if available
- does **not** rewrite past truth
- influences future wave/program progression decisions only if that is already consistent with existing governance operations

### D. Window-aware scheduling
Candidate schedules must respect:
- blackout/maintenance windows
- next eligible windows
- window expiry semantics
- cross-window carry-forward logic where relevant

### E. Risk-aware scheduling
Candidates must be able to constrain or penalize:
- high-risk promotions during unstable provider/vault/identity health
- actions that would violate guardrails or require missing approvals
- escalations that must be prioritized due to SLA pressure

---

## Suggested milestone breakdown

### M33A - Typed optimization request/result contracts
- add request, objective/constraint profiles, scenario sets, candidate schedule formats
- ensure compatibility and serialization coverage

### M33B - Local-first solver implementation
- implement bounded candidate generation
- deterministic seeding
- objective scoring and constraint enforcement

### M33C - Explainability + selection + durability
- tradeoff explanations
- binding constraint summaries
- schedule selection operation
- durable records and restore continuity

### M33D - Visibility + tests + docs
- governance/receipt readable summaries
- tests for solver determinism, constraints, and restore continuity
- spec/plan/status updates

---

## Required tests

Add or update tests for at least:

1. serialization round-trip for optimization request/result/contracts
2. solver determinism with a fixed seed
3. constraints respected (no scheduling in blackout windows)
4. approval capacity constraints bind the schedule and are reported in binding constraints
5. dependency constraints prevent scheduling dependent actions early
6. risk constraints penalize or block high-risk promotions during unstable health inputs
7. top-N candidate generation produces distinct candidates with tradeoff explanations
8. selecting a schedule creates durable decision records and survives restore/process death
9. mixed old/new history remains decodable and readable

---

## Validation commands

Run and fix failures before marking M33 complete:

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

M33 is done when:
1. typed optimization request/result and objective/constraint profiles exist and are durable
2. local-first optimizer generates top-N candidate schedules under constraints
3. candidate schedules include scores, binding constraint summaries, and tradeoff explanations
4. schedule selection creates durable decision records
5. window-aware and risk-aware scheduling semantics are enforced
6. restore/process death continuity preserves optimization and selection records
7. compatibility with older history remains intact
8. tests and docs/status are updated and passing

---

## Next milestone suggestion
After M33, the natural next step is:
- **M34 - Closed-Loop Learning for Portfolio Optimization (Feedback, Drift Correction, Objective Tuning)**

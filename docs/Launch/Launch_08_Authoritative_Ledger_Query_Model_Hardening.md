# Authoritative Ledger and Query Model Hardening

## Goal
Take ledger/projection scaffolding to a production-safe truth layer with replay, rebuild, archival, and compatibility policy.

## Why this step is now
The pilot cannot rely on half-finished projection semantics or unclear truth-source boundaries.

## In scope
- Materialized query model hardening.
- Replay/rebuild strategy.
- Migration/version policy.
- Archive/retention baseline for ledger and query state.

## Out of scope
- No broad history rewrite.
- No unrelated product work.

## Required outputs
- updated docs/spec/plan/status for this step
- bounded, reviewable code changes only
- explicit compatibility statement
- step-specific tests and validation summary

## Definition of done
- Ledger truth, projections, rebuild, and migration policy are explicit and testable.

## Scope lock
- additive and backward-compatible only
- append-only ledger remains the authoritative truth source
- no broad history rewrite
- no unrelated product work
- local-first safety semantics remain authoritative

## Completed outputs
- Froze the authoritative truth boundary:
  - append-only execution ledger is the only source of truth
  - task query projections are explicitly rebuildable materializations, not competing truth
- Hardened the materialized query model:
  - current task projection schema version is durable and explicit
  - minimum compatible legacy projection version is explicit
  - projection compatibility states are explicit:
    - `CURRENT`
    - `MIXED_HISTORY_COMPATIBLE`
    - `REQUIRES_REBUILD`
- Hardened replay and rebuild strategy:
  - bounded replay strategies are explicit and testable:
    - `CHECKPOINT_CATCH_UP`
    - `FULL_REPLAY`
    - `FROM_SEQUENCE_REPLAY`
    - `COMPATIBILITY_REBUILD`
  - rebuild metadata is now durable on projections and visible in summaries
- Added archive/retention baseline without broad history rewrite:
  - pilot policy is `PILOT_APPEND_ONLY_NO_DELETE`
  - durable ledger compaction/archive hints exist
  - archive recommendations require a projection snapshot and do not allow delete in pilot scope
- Exposed authoritative visibility through existing task responses:
  - projection version
  - compatibility summary
  - retention summary
  - rebuild metadata
- Added test coverage for:
  - deterministic rebuild/catch-up behavior
  - legacy projection compatibility
  - stale checkpoint detection
  - durable compaction-hint persistence across store adapters
  - API visibility for compatibility and retention summaries

## Explicitly deferred
- legal-hold execution, deletion workflows, and broad archival engines
- cross-task/global materialized query suites beyond the task-level projection
- history rewrite or destructive compaction
- wider migration tooling beyond the bounded projection compatibility policy

Validation expectation:
- Run the relevant TypeScript/agent-kernel validation set when this step touches the service substrate:
  - npm run -s typecheck
  - npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts
- Keep the Android / host-side gate green when touched:
  - ./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
  - ./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
  - ./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
  - ./gradlew :app-backend-host:assembleDebug
  - ./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
  - ./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest


## Final report
- changed files
- what was completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

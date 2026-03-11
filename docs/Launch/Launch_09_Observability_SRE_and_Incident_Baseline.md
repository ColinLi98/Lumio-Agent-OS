# Observability, SRE, and Incident Baseline

## Goal
Establish the minimum observability and incident-response baseline needed to run an enterprise pilot safely.

## Why this step is now
Without tracing, SLO baselines, and playbooks, every production issue becomes slow and high-risk.

## In scope
- Correlation IDs across runs/connectors/worker/control-plane actions.
- Metrics, structured logs, and tracing baseline.
- Alerting baseline.
- On-call and incident runbooks.
- Degraded-mode and recovery playbooks.

## Out of scope
- No full platform observability redesign.
- No enterprise NOC product.

## Scope lock
- additive and backward-compatible only
- service-layer plus bounded observability API surface only
- no Android/orchestrator rewrite
- no weakening of local-first safety behavior

## Completed outputs
- Correlation ids are now threaded across task runs, node traces, worker claims/sessions, control-plane requests, and connector delivery records.
- Task snapshots now expose additive `observability` summaries with:
  - tracing spans
  - structured logs
  - alert records
  - degraded-mode state
  - bounded SLO summaries
- Added bounded observability API closure:
  - `GET /api/agent-kernel/observability/summary`
  - `GET /api/agent-kernel/observability/summary?task_id=<task_id>`
- Added pilot observability gauges for:
  - open task alerts
  - degraded tasks
  - open dead letters
  - stale claims
  - denied service-auth actions
  - projection rebuild requirements
- Added operator runbooks:
  - `docs/agent-kernel-oncall-runbook.md`
  - `docs/agent-kernel-degraded-mode-recovery-playbook.md`

## Exit criteria
- operators can detect common pilot failures from bounded task/global summaries
- correlation ids are visible across task, worker, control-plane, and connector records
- degraded-mode and incident recovery playbooks are explicit
- required TypeScript agent-kernel validation gate is green

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

## Deferred beyond this step
- external tracing vendors, full log pipeline/NOC productization, and broad platform observability redesign
- automated paging integrations beyond the bounded pilot runbook baseline
- broader Android/host/operator UI observability surfaces beyond existing additive summaries

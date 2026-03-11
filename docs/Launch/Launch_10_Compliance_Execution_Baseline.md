# Compliance Execution Baseline

## Goal
Turn compliance semantics into minimally executable enterprise processes for pilot launch.

## Why this step is now
Typed consent/privacy/export semantics exist, but launch still needs executable retention, deletion, and export-integrity behavior over the frozen pilot task truth.

## In scope
- Retention baseline.
- Deletion baseline.
- Audit export integrity baseline.
- Legal hold minimal posture with explicit defer.
- Security/privacy questionnaire starter pack.

## Out of scope
- No full compliance suite.
- No broad legal platform.

## Scope lock
- additive and backward-compatible only
- service-layer plus bounded compliance API surface only
- no Android/orchestrator rewrite
- no weakening of local-first safety behavior

## Completed outputs
- Task snapshots now expose additive `compliance` summaries with:
  - append-only retention posture from the authoritative ledger
  - bounded deletion-request history
  - bounded audit-export history
  - explicit legal-hold posture
  - questionnaire-pack reference
- Added durable compliance audit records across memory, Postgres, Redis, and static schema parity:
  - deletion requests
  - audit export records
- Added bounded compliance API closure:
  - `GET /api/agent-kernel/compliance/summary`
  - `GET /api/agent-kernel/compliance/summary?task_id=<task_id>`
  - `POST /api/agent-kernel/compliance/deletion-request`
  - `POST /api/agent-kernel/compliance/audit-export`
- Deletion behavior is now executable and fail-closed for the pilot:
  - requests are durably recorded
  - destructive delete remains denied by the frozen `PILOT_APPEND_ONLY_NO_DELETE` policy
  - legal-hold assertions fail closed to manual review
- Audit export integrity is now executable and bounded:
  - exports produce a redaction-first bundle
  - manifest hash and bundle hash are generated
  - per-section hashes are recorded durably
  - no secret material is persisted into the durable export record
- Added compliance/operator docs:
  - `docs/agent-kernel-compliance-operations-runbook.md`
  - `docs/agent-kernel-security-privacy-questionnaire-starter-pack.md`

## Exit criteria
- retention, deletion posture, and audit-export integrity are executable over the frozen pilot task truth
- destructive delete remains explicitly denied or deferred rather than implicit
- legal-hold posture is explicit, documented, and fail-closed
- the team has a starter security/privacy response pack for pilot diligence
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
- automated legal-hold lifecycle and end-to-end hold release management
- destructive delete execution, downstream connector erasure orchestration, and broader archival engines
- broader compliance automation, policy testing productization, and full legal operations tooling

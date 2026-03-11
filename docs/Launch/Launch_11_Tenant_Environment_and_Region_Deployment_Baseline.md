# Tenant, Environment, and Region Deployment Baseline

## Goal
Define and harden the deployment, tenancy, environment, and region strategy for pilot launch.

## Why this step is now
Enterprise customers will ask how the frozen pilot path is deployed, isolated, promoted, and region-scoped before they accept a controlled pilot.

## In scope
- Deployment model for the frozen pilot.
- Tenant isolation baseline.
- Development, staging, pilot, and production boundaries.
- Region, residency, and secret-separation baseline.

## Out of scope
- No full multi-region rollout platform.
- No broad infra redesign beyond pilot needs.

## Scope lock
- additive and backward-compatible only
- service-layer plus bounded deployment-summary API surface only
- no shared multi-tenant productization or new control plane
- no weakening of local-first safety behavior

## Completed outputs
- Added additive `deployment` summaries to task snapshots with:
  - explicit deployment model
  - explicit deployment stage and backing environment
  - tenant isolation posture
  - region/residency posture
  - secret-separation posture
  - environment-boundary matrix and warning set
- Added bounded deployment API closure:
  - `GET /api/agent-kernel/deployment/summary`
  - `GET /api/agent-kernel/deployment/summary?task_id=<task_id>`
- Added machine-checkable deployment hardening over the frozen pilot path:
  - explicit single-tenant deployment model
  - explicit dev/staging/pilot/prod boundary definitions
  - explicit primary-region and residency config checks
  - explicit tenant-drift and workspace-mismatch warnings
  - explicit vault secret-scope checks for the pilot environment
- Added deployment/reference documentation:
  - `docs/agent-kernel-pilot-deployment-baseline.md`

## Exit criteria
- deployment model, tenant isolation, environment boundaries, and region strategy are explicit in docs and runtime summaries
- tenant/env/region assumptions fail visible as `DEGRADED` rather than remaining implicit
- the pilot deployment path is bounded to vendor-managed single-tenant cloud with explicit deferred breadth
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
- shared multi-tenant productization beyond the frozen pilot baseline
- self-hosted, private-cloud, or hybrid deployment models
- multi-region active-active runtime, automated failover, and broad region orchestration
- generalized self-serve tenant and environment provisioning

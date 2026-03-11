# Operator Runbooks, Solution Templates, and Onboarding

## Goal
Make the product usable by support/ops teams and repeatable for pilot customers through templates and operational playbooks.

## Why this step is now
A technically strong system still fails commercially if operators and customers cannot use it repeatably.

## In scope
- Operator runbooks and escalation paths.
- At least 2-3 solution templates.
- Onboarding checklist.
- Pilot KPI and success criteria.

## Out of scope
- No full academy or LMS.
- No broad GTM expansion.

## Scope lock
- additive and backward-compatible only
- docs-and-ops-packaging step only
- no new runtime primitives or customer-facing product surface
- no weakening of local-first safety behavior

## Completed outputs
- Added a pilot operator guide that translates the existing observability, degraded-mode, compliance, and deployment baselines into a human-readable operating procedure and escalation path:
  - `docs/agent-kernel-pilot-operator-guide.md`
- Added a bounded pilot template pack with three templates over the frozen advisor workflow family:
  - `docs/agent-kernel-pilot-solution-templates.md`
- Added a pilot onboarding checklist covering tenant prep, identity, vault, connector, operator enablement, staging validation, and go-live readiness:
  - `docs/agent-kernel-pilot-onboarding-checklist.md`
- Added a pilot KPI and success-scorecard baseline:
  - `docs/agent-kernel-pilot-success-scorecard.md`
- Kept Launch 12 explicitly tied to the existing bounded APIs and runbooks from Launch 05 through Launch 11 rather than inventing new product or training systems.

## Exit criteria
- operators can triage most pilot cases through runbooks and summary APIs without reading raw ledger JSON
- the frozen advisor pilot workflow has 2-3 repeatable solution templates
- pilot onboarding has a concrete checklist with owners and evidence expectations
- pilot KPI and success criteria are explicit enough for Launch 13 rehearsal and go/no-go review

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
- broad customer training academy, LMS, certification, or partner enablement programs
- broad GTM expansion, generalized solution-library growth, and self-serve onboarding productization
- operator UX redesign beyond the bounded pilot runbook and template pack

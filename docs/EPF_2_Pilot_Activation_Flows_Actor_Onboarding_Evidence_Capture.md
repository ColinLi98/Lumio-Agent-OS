# EPF-2 - Pilot Activation Flows, Actor Onboarding, and Real Evidence Capture

Date: 2026-03-07
Owner: Codex
Status: completed

## Goal
Turn pilot activation from passive blocker visibility into a bounded, actionable enterprise shell workflow.

## Scope lock
- additive and backward-compatible only
- no fake pilot evidence from simulator / demo / test / local synthetic artifacts
- no pilot scope expansion
- no new connectors, workflow families, or deployment modes
- no broad visual redesign
- no orchestrator rewrite

## Outputs completed
- Added typed durable pilot activation records for:
  - actor readiness
  - evidence artifacts
- Added derived typed activation workflow state for:
  - checklist items
  - remaining blockers
  - evidence category status
  - next action
- Added bounded activation actions:
  - register actor readiness
  - register evidence artifact
- Added product-shell visibility for activation progress, blockers, evidence categories, and next action.
- Preserved the rule that non-real sources cannot count as real pilot evidence.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## Deferred
- real pilot activation itself
- richer admin workflows beyond bounded activation actions
- broader pilot-evidence capture once real pilot artifacts exist

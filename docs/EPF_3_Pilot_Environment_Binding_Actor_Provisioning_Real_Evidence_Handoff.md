# EPF-3 - Pilot Environment Binding, Actor Provisioning, and Real Evidence Handoff

Date: 2026-03-07
Owner: Codex
Status: completed

## Goal
Turn external pilot-access blockers into explicit, typed, durable product truth for environment binding, actor provisioning, access grants, connector activation eligibility, and real evidence handoff.

## Scope lock
- additive and backward-compatible only
- no fake pilot evidence from simulator / demo / test / local synthetic artifacts
- no scope expansion
- no orchestrator rewrite
- no broad UI redesign

## Outputs completed
- Added typed durable pilot environment binding state.
- Added typed durable actor provisioning/access state.
- Added typed durable connector activation eligibility state.
- Added runtime activation-ready decision derived from:
  - real environment binding
  - real actor provisioning/access
  - identity readiness
  - connector readiness
  - vault readiness
  - connector activation eligibility
- Surfaced activation-ready and blocker summaries in enterprise shell / internal governance views.
- Preserved the rule that non-real sources never count as real pilot evidence.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## Deferred
- Real pilot environment/actor provisioning outside the codebase
- Richer activation workflows beyond bounded binding/provisioning/evidence registration
- Live pilot evidence itself

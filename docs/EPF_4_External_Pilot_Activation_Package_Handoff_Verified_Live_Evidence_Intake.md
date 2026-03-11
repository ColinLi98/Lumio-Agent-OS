# EPF-4 - External Pilot Activation Package, Handoff, and Verified Live Evidence Intake

Date: 2026-03-07
Owner: Codex
Status: completed

## Goal
Add a typed, durable external activation handoff and evidence-intake layer so pilot activation can progress from external artifacts rather than docs-only checkpoints.

## Scope lock
- additive and backward-compatible only
- no fake pilot evidence from simulator / demo / test / local synthetic artifacts
- no orchestrator rewrite
- no broad UI redesign
- no generic launch-tooling expansion

## Outputs completed
- Added typed durable activation package state with owner, handoff note, due date, and package status.
- Added typed durable external artifact intake state with receive / verify / reject / promote outcomes.
- Added runtime promotion from verified real external artifacts into:
  - pilot environment binding
  - actor readiness
  - connector activation eligibility
  - real evidence categories
- Added package/intake verification progress to enterprise shell and internal governance summaries.
- Preserved the hard rule that demo / simulator / test / local synthetic artifacts can never count as real pilot evidence.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## Deferred
- real external pilot environment binding and real external actor provisioning
- real live pilot evidence itself
- richer external package workflows beyond the bounded handoff/intake/review/promotion model
- broader launch tooling beyond pilot activation relevance

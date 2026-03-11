# EPF-7 - Local Role Lab Visualization and Rehearsal UX

Date: 2026-03-08
Owner: Codex
Status: completed

## Goal
Make `LOCAL_ROLE_LAB` visually obvious, role-readable, and usable as a first-class rehearsal shell on both web and Android.

## Scope lock
- additive and backward-compatible only
- no new governance/runtime primitives
- no weakening of the non-pilot evidence boundary
- no new workflow family / connector / deployment expansion
- no broad visual redesign

## Outputs completed
- Added a persistent local-lab shell header with rehearsal-only language.
- Kept the active role seat visible at all times in local lab.
- Added a visible scenario summary for the current rehearsal flow.
- Made role-segmented inbox behavior visually obvious with `LAB` labeling and active-seat context.
- Added a visible cross-role handoff/timeline summary.
- Added visible non-pilot evidence classification.
- Added visible pilot activation gap messaging.
- Kept Android and web meanings aligned on the same local-lab truth model.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## Deferred
- Real pilot activation and live pilot evidence
- A true multi-user sandbox workspace beyond one-machine local rehearsal
- Richer local-lab actions beyond role switching, scenario visibility, and handoff/timeline explanation

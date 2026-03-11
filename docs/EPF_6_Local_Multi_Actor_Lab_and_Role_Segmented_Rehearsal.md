# EPF-6 - Local Multi-Actor Lab and Role-Segmented Rehearsal

Date: 2026-03-08
Owner: Codex
Status: completed

## Goal
Productize the reality that one machine often has only one human operator by adding a clearly non-pilot local multi-actor lab.

## Scope lock
- additive and backward-compatible only
- no orchestrator rewrite
- no pilot evidence fabrication
- no new tenant / connector / workflow-family / deployment-mode expansion
- no broad UI redesign

## Outputs completed
- Added explicit `local_lab` workspace mode.
- Added explicit `LOCAL_ROLE_LAB_WORKSPACE` binding kind.
- Added typed local role lab actor summaries for:
  - requester
  - operator
  - tenant-admin
- Added role-segmented local synthetic inbox/task views for one-machine rehearsal.
- Added explicit local role lab labeling in web and Android enterprise shell surfaces.
- Preserved the hard rule that local lab artifacts are always non-pilot and non-promotable as `REAL_PILOT` evidence.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## Deferred
- Any real pilot activation and live pilot evidence
- Richer local lab actions beyond role switching and role-segmented rehearsal visibility
- Promotion of any artifact from local lab into real pilot evidence

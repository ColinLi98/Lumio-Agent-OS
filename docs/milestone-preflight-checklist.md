# Milestone Preflight Checklist

Date baseline: 2026-03-07
Owner: Codex / contributors

## 1) Active milestone and scope sanity
- Confirm the active launch-step or milestone doc is explicit.
- Confirm modified files are scoped to that step only.
- Confirm behavior changes and hygiene changes are not mixed in one handoff.
- Classify each changed path before handoff:
  - durable source/docs
  - sanctioned hygiene/baseline file
  - deferred tracked artifact noise

Quick checks:
```bash
git status --short --untracked-files=all
git status --short
git diff --name-only
git diff --name-only --cached
```

## 2) Artifact hygiene
- Confirm no generated/transient/local-only artifacts are staged accidentally.
- Keep scratch outputs under one of:
  - `.local-output/`
  - `local-output/`
  - `artifacts/local/`
- Keep temp/cache churn behind ignore boundaries when it is clearly local-only.

Optional scans:
```bash
git status --short --untracked-files=all
git status --short | rg '(/build/|/\.gradle/|/bin/|\.apk$|\.hprof$|intermediates|/tmp/|/temp/|__pycache__/|\.pytest_cache/)'
git ls-files | rg '(^|/)(build|\.gradle|test-results|tmp|temp)(/|$)|\.(log|tmp|bak|orig|rej)$'
```

## 3) Validation baseline
- For docs/ignore/boundary-only changes:
  - record in status docs that runtime validation was not rerun and why
- When the service substrate is touched, run:
```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts
```
- When Android / host-side runtime paths are touched, run:
```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## 4) Status/doc sync
- Update the active launch-step doc if milestone scope or evidence changed.
- Update `docs/codex-agent-os-refactor-spec.md` if contract/scope changed.
- Update `docs/codex-agent-os-refactor-plan.md` with milestone execution notes.
- Update `docs/codex-agent-os-refactor-status.md` with exact evidence, validation notes, and defer notes.

## 5) Rollback safety
- Keep rollback scope explicit and small.
- Avoid touching unrelated modules in hygiene passes.
- Record known noisy tracked paths that remain unresolved instead of hiding them with broad ignore rules.

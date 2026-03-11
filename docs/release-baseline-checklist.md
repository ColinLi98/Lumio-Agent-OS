# Release Baseline Checklist (Launch 02)

Date: 2026-03-07  
Scope: release-baseline freeze, repo hygiene, and gating only

## 1) Active step alignment
- [ ] The active step matches `docs/Launch/Launch_02_Release_Baseline_Repo_Hygiene_and_Gating.md`.
- [ ] Scope remains hygiene/baseline only, with no feature expansion.
- [ ] The deferred list is still explicit and unchanged unless status docs say otherwise.

## 2) Allowed write surface
- [ ] Changes are limited to the active launch-step doc, ignore files, `AGENTS.md`, baseline/checklist/inventory docs, and `docs/codex-agent-os-refactor-{spec,plan,status}.md`.
- [ ] Any write outside that surface has explicit justification in the status docs.
- [ ] No index-wide tracked-artifact migration is mixed into this step.

Suggested checks:
```bash
git status --short --untracked-files=all
git status --short
git diff --name-only
git diff --name-only --cached
```

## 3) Diff-surface sanity
- [ ] Generated/transient outputs are not newly introduced into the tracked surface.
- [ ] Current noisy paths are classified as:
  - durable source/docs
  - deferred tracked artifact noise
  - immediate ignore candidates
- [ ] `docs/repo-noise-inventory.md` is updated with the current snapshot and defer notes.

Suggested checks:
```bash
git status --short --untracked-files=all
git status --short | rg '(/build/|/\.gradle/|test-results/|\.local-output/|local-output/|artifacts/local/|/tmp/|/temp/|__pycache__/|\.pytest_cache/)'
git ls-files | rg '(^|/)(build|\.gradle|test-results|tmp|temp)(/|$)|\.(log|tmp|bak|orig|rej)$'
```

## 4) Validation policy
- [ ] If only docs/ignore/boundary files changed, record in status docs that `G2`/`G3` were not rerun and why.
- [ ] If `services/agent-kernel/*`, `api/agent-kernel/tasks/*`, or `tests/agentKernel*.test.ts` changed, run the TypeScript gate:
```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts
```
- [ ] If Android / host-side runtime paths changed, run the Android gate:
```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## 5) Docs and status sync
- [ ] `docs/codex-agent-os-refactor-spec.md` reflects the Launch 02 hygiene boundary.
- [ ] `docs/codex-agent-os-refactor-plan.md` reflects the Launch 02 execution notes and exit criteria.
- [ ] `docs/codex-agent-os-refactor-status.md` records changed files, validation evidence, and deferred cleanup.

## 6) Rollback safety
- [ ] Hygiene changes are additive and backward-compatible.
- [ ] No product/runtime behavior is rewritten in this pass.
- [ ] High-blast-radius cleanup remains explicitly deferred rather than mixed into this baseline step.

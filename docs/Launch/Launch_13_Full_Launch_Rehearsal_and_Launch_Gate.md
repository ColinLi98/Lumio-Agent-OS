# Full Launch Rehearsal and Launch Gate

Decision date: 2026-03-07
Owner: Codex
Status: rehearsal complete, launch gate blocked on `G1`

## Goal
Run the final all-green launch rehearsal and decide pilot launch readiness against a frozen gate.

## Why this step is now
A controlled enterprise pilot launch should follow a tested rehearsal, not just a checklist.

## In scope
- Golden scenario run.
- Restore/replay/mixed-history rehearsal.
- Connector failure / credential expiry / remote denial drills.
- Incident and rollback drill.
- Pilot onboarding rehearsal.
- Final launch gate review.

## Out of scope
- No new features.
- No scope expansion.

## Required outputs
- updated docs/spec/plan/status for this step
- bounded, reviewable code changes only
- explicit compatibility statement
- step-specific tests and validation summary

## Definition of done
- All launch gates are satisfied and the team has completed a full launch rehearsal.

## Rehearsal evidence

### 1. Golden scenario run
- Result: PASS
- Evidence:
  - The frozen pilot task/API path stayed green in the required TypeScript gate:
    - `tests/agentKernel.api.test.ts` -> `routes the pilot business connector through the connector platform with retry and health visibility`
    - `tests/agentKernel.api.test.ts` -> `serves task and pilot observability summaries through the bounded API`
    - `tests/agentKernel.api.test.ts` -> `serves bounded deployment summaries and flags tenant-isolation drift`
- Rehearsal interpretation:
  - The frozen advisor workflow handoff path, bounded connector path, observability path, and deployment-summary path remained intact without widening the launch scope.

### 2. Restore / replay / mixed-history rehearsal
- Result: PASS
- Evidence:
  - `tests/agentKernel.ledgerProjection.test.ts` -> `rebuilds deterministically from a checkpoint and matches full replay`
  - `tests/agentKernel.ledgerProjection.test.ts` -> `marks legacy materialized projections as mixed-history compatible and upgrades them on full rebuild`
  - `tests/agentKernel.runtime.test.ts` -> `recovers stale execution claims after restart and replays work locally`
- Rehearsal interpretation:
  - The append-only ledger remains authoritative, rebuild behavior stays deterministic, and mixed-history compatibility is explicit rather than implicit.

### 3. Connector failure / credential expiry / remote denial drills
- Result: PASS
- Evidence:
  - `tests/agentKernel.api.test.ts` -> `supports pilot vault-backed webhook credential lifecycle and route gating`
  - `tests/agentKernel.connectorPlatform.test.ts` -> `dead letters the pilot business adapter after timeout retries and preserves the transformed payload`
  - `tests/agentKernel.runtime.test.ts` -> `fails closed on denied remote runner control actions and audits the denial`
- Rehearsal interpretation:
  - Credential-health closure, connector timeout/dead-letter behavior, and deny-by-default control-plane behavior all remain fail-closed and auditable.

### 4. Incident and rollback drill
- Result: PASS
- Evidence:
  - `tests/agentKernel.runtime.test.ts` -> `dead-letters exhausted retries once and keeps the record stable`
  - `tests/agentKernel.runtime.test.ts` -> `runs reversible compensation handlers on node failure`
  - `tests/agentKernel.api.test.ts` -> `includes dead-letter summary after retries are exhausted`
  - Operator playbooks already exist in:
    - `docs/agent-kernel-oncall-runbook.md`
    - `docs/agent-kernel-degraded-mode-recovery-playbook.md`
- Rehearsal interpretation:
  - The frozen pilot has a bounded incident path with durable failure truth, operator-facing dead-letter visibility, and a rollback/compensation drill that does not rewrite ledger history.

### 5. Pilot onboarding rehearsal
- Result: PASS
- Evidence:
  - `tests/agentKernel.api.test.ts` -> `supports pilot oidc login, admin role mapping, directory shrink, and deprovision`
  - `docs/agent-kernel-pilot-onboarding-checklist.md`
  - `docs/agent-kernel-pilot-operator-guide.md`
  - `docs/agent-kernel-pilot-success-scorecard.md`
- Rehearsal interpretation:
  - The frozen pilot still has one explicit onboarding path, one explicit operator pack, and one explicit KPI/success rubric; no unsupported path had to be invented during rehearsal review.

## Final launch gate review

### `G1` Release-baseline gate
- Result: BLOCKED
- Evidence:
  - `git status --short` still shows a broad mixed worktree outside the active Launch 13 doc/status surface.
  - `git diff --name-only --cached` still includes historically tracked generated Android paths under:
    - `LumiKeyboard-Android/.gradle/**`
    - `LumiKeyboard-Android/app/build/**`
  - `git diff --name-only` still spans unrelated app, component, service, test, and docs paths outside the frozen launch-candidate handoff.
- Important note:
  - `scripts/check-release-baseline.sh` returned PASS, but its tracked-artifact check did not surface the still-tracked Android artifact paths that are visible in the Git diff evidence above. For Launch 13, that script is therefore not accepted as sufficient `G1` evidence by itself.

### `G2` Agent-kernel service gate
- Result: PASS
- Evidence:
  - `npm run -s typecheck` -> PASS
  - `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
  - additional rehearsal coverage:
    - `npx vitest run tests/agentKernel.connectorPlatform.test.ts` -> PASS

### `G3` Android / host gate
- Result: PASS
- Evidence:
  - `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
  - `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
  - `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
  - `./gradlew :app-backend-host:assembleDebug` -> PASS
  - `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
  - `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### `G4` Launch rehearsal gate
- Result: BLOCKED
- Decision:
  - The frozen pilot runtime path rehearsed successfully and the required TypeScript plus Android/host validation suites are green.
  - Pilot launch readiness is still blocked because the final candidate does not satisfy the non-negotiable `G1` release-baseline cleanliness requirement.

## Compatibility statement
- Additive and backward-compatible only.
- No runtime or product behavior changed in this step.
- Local-first safety semantics remain authoritative.

## Current decision
- Launch rehearsal: complete
- Pilot launch readiness: NOT READY
- Blocking condition:
  - close the `G1` release-baseline candidate cleanliness gap and rerun the Launch 13 gate review without widening scope

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


## Final report
- changed files
- what was completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

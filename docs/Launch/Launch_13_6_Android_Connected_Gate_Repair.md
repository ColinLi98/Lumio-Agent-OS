# Launch 13.6 - Android Connected Gate Repair and Final Pilot Launch Gate Recovery

## Purpose

Launch 13.5 closed the G1 release-baseline blocker on a clean launch candidate, but the final launch gate remains blocked because G3 is red.

The failing gate is the required connected Android instrumentation run on the clean candidate.
The observed failure mode is:

- all 8 targeted instrumentation tests fail
- error: `java.lang.IllegalStateException: No compose hierarchies found in the app`

This milestone exists to fix that gate in the smallest possible bounded slice and rerun the final launch gate on the same clean candidate model.

## What this milestone is

This is not a new feature milestone.
It is not a product-surface milestone.
It is not a runtime/governance milestone.

It is a **launch blocker repair milestone** focused only on making the required Android connected gate deterministic and green on the release candidate.

## Scope

### In scope
- reproduce the connected Android failure on the clean candidate or equivalent branch/worktree
- identify why the test process cannot see a Compose hierarchy
- fix the smallest valid Android host/test/instrumentation path so the 8 required tests can run against a real Compose tree
- preserve the existing product/runtime behavior
- rerun the full final gate set on a clean candidate
- update launch docs/spec/plan/status with the G3 repair evidence

### Out of scope
- no product feature work
- no orchestrator/runtime feature expansion
- no broad Android UI redesign
- no broad test suite refactor
- no unrelated cleanup outside the bounded Android host/test gate repair surface
- no release-scope expansion

## Known failure

Current blocking symptom:
- `No compose hierarchies found in the app`

This strongly suggests one or more of the following classes of problems:
1. the expected Activity/host never reaches the Compose `setContent` path during the test
2. the test launches the wrong Activity / entry route / flavor / process state
3. the app launches but exits or stalls before Compose becomes available
4. the app requires setup/config/state that the clean candidate does not provide
5. the test harness does not wait correctly for the Compose hierarchy to exist
6. a build/runtime flag or initialization path disables the expected Compose host in the clean candidate

The fix should target the actual cause, not just silence the symptom.

## Goal

Get G3 green on the clean launch candidate by making the required connected Android tests reliably detect and interact with the intended Compose hierarchy.

## Required outputs

### A. Root-cause diagnosis
Produce a brief root-cause note in docs/status that states which one of the failure classes actually caused the issue.

### B. Bounded Android fix
Apply the smallest valid fix in the Android host/test path. Examples of acceptable fix areas:
- Activity startup path
- test launch path
- host initialization ordering
- Compose host readiness/waiting
- required local test config/state bootstrap for the clean candidate
- deterministic app-idle / Compose-idle behavior for the required tests

### C. Evidence of repaired gate
Rerun the connected Android test command on the clean candidate (or a fresh clean candidate derived from the same release branch strategy), then rerun the full launch gate set.

### D. Updated launch decision
Update launch docs/spec/plan/status with:
- root cause
- exact fix applied
- rerun evidence
- final G1/G2/G3/G4 state
- final GO / NO-GO decision

## Constraints

1. Keep the write surface tightly bounded.
2. Preserve the clean candidate strategy.
3. Do not introduce new product/runtime behavior unless required for deterministic host readiness.
4. Do not weaken release-baseline cleanliness.
5. Do not accept partial success; the exact required connected Android gate must pass.

## Suggested bounded write surface

Prefer limiting changes to:
- Android host startup / Activity launch path
- Android instrumentation tests / test utilities / test rules
- Android host/bootstrap code required for deterministic Compose readiness
- launch docs/spec/plan/status

Avoid touching unrelated TS services or governance runtime code unless the diagnosis proves that is the actual blocker.

## Step-by-step work plan

### Step 1 - Reproduce and isolate
- run the failing connected Android command on the clean candidate
- confirm all failing tests share the same root symptom
- capture the first reliable failing stack / log / startup trace

### Step 2 - Verify Activity and Compose host path
- confirm which Activity is launched by the failing tests
- confirm that the expected screen uses Compose and reaches `setContent`
- confirm whether the Activity is stuck behind an initialization gate, missing state, or alternate route

### Step 3 - Verify clean-candidate bootstrap assumptions
- confirm whether the clean candidate needs any local bootstrap, test-only seed, or config path to reach the Compose host
- confirm the behavior when `local.properties` is intentionally absent
- confirm the app can still reach the tested screen under the clean-candidate environment assumptions

### Step 4 - Repair the minimal deterministic path
- fix the wrong launch path, missing bootstrap, readiness wait, or disabled host condition
- add or strengthen deterministic waiting only if genuinely needed
- avoid papering over a broken host path with arbitrary sleeps

### Step 5 - Add/adjust the smallest regression coverage
- add or adjust the smallest test/helper assertion needed so this failure mode is caught earlier next time
- keep it tightly scoped to host/test readiness

### Step 6 - Rerun final gate
Rerun:
- connected Android gate
- then the full final gate command set on the clean candidate

### Step 7 - Record final launch decision
- update Launch 13.6 doc and launch docs/spec/plan/status
- record whether pilot launch is now GO or remains NO-GO

## Acceptance criteria

Launch 13.6 is complete when all of the following are true:
1. the root cause of `No compose hierarchies found in the app` is identified and documented
2. the Android fix is bounded and does not expand product scope
3. the required connected Android command passes on the clean candidate
4. the full final launch gate is rerun on the same clean candidate strategy
5. docs/spec/plan/status contain the exact rerun evidence and final launch decision

## Validation commands

Run and record, at minimum:

```bash
bash scripts/check-release-baseline.sh
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts
npx vitest run tests/agentKernel.connectorPlatform.test.ts
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Final report format

At the end, report:
- root cause
- changed files
- exact Android host/test fix applied
- whether any additional bootstrap/config assumption was required
- connected Android rerun result
- final G1/G2/G3/G4 status
- final GO / NO-GO decision

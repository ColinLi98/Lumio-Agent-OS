# Launch 13.5 - Release Baseline Closure and Final Pilot Launch Gate

## Purpose

Launch 13 completed the full rehearsal and proved that:
- golden scenarios are passing
- restore/replay/mixed-history rehearsals are passing
- connector failure / credential expiry / remote denial drills are passing
- incident / rollback drill is passing
- pilot onboarding rehearsal is passing
- G2 and G3 are green

The only remaining blocker is **G1 release-baseline cleanliness**, and therefore **G4 remains blocked**.

This step exists to close that blocker in a disciplined, auditable way.

This is **not** a feature milestone.
This is a release-candidate hygiene and evidence milestone.

---

## Goal

Produce a clean, defensible pilot launch candidate where:
1. the Git worktree and index match the intended release surface
2. tracked generated artifacts are removed from version control or excluded from the candidate
3. the release-baseline script is trustworthy and aligned with real Git evidence
4. Launch 13 final gate can be rerun from a clean candidate and produce a real go/no-go decision

---

## Scope

### In scope
- create or derive a clean release candidate branch/worktree
- isolate the intended pilot launch surface
- remove or untrack tracked generated files that currently invalidate G1
- tighten `.gitignore` and related hygiene controls if needed
- fix `scripts/check-release-baseline.sh` so it cannot return false-green against dirty Git evidence
- generate explicit release-baseline evidence
- rerun Launch 13 gate on the clean candidate
- update docs/spec/plan/status with the exact closure record

### Out of scope
- new feature work
- new product milestones
- broad repo-wide cleanup war beyond what is necessary to green G1
- architecture refactors
- new connector / identity / vault work

---

## Current blocker summary

G1 is blocked because the current candidate worktree is not a clean release baseline.
Known problems:
- `git status --short` is broadly dirty outside the Launch 13 handoff surface
- `git diff --name-only --cached` still includes historically tracked generated Android paths under:
  - `LumiKeyboard-Android/.gradle/**`
  - `LumiKeyboard-Android/app/build/**`
- `git diff --name-only` spans unrelated app/component/service/test/docs paths outside the frozen launch candidate
- `scripts/check-release-baseline.sh` returned a false green relative to Git evidence, so it is not currently sufficient proof for G1

---

## Required outcome

At the end of Launch 13.5:
- G1 must be truly green, not script-green only
- G4 can be rerun credibly
- the pilot launch candidate must be based on a clean, reviewable, reproducible branch or worktree

---

## Execution plan

### Step 1 - Freeze the current branch and stop feature work
Do not continue product feature work on the current dirty candidate.

Actions:
- record current HEAD SHA
- record current dirty-path inventory
- stop all non-launch writes to the candidate branch
- tag or document the last validated functional state for recovery if needed

Done when:
- current state is preserved and recoverable
- no new unrelated changes are being added during hygiene work

### Step 2 - Create a clean launch-candidate branch or worktree
Do not try to fix G1 inside a long-lived dirty worktree if it can be avoided.

Preferred approach:
- create a fresh launch candidate branch/worktree from the last validated integration commit
- cherry-pick or apply only the intended pilot-launch changes

Alternative approach:
- if branch recreation is impractical, surgically isolate only approved files and explicitly park unrelated changes elsewhere

Done when:
- the launch-candidate surface is isolated from unrelated in-progress work

### Step 3 - Remove tracked generated artifacts from the candidate
Tracked generated paths must not remain inside the release candidate.

Minimum targets:
- `LumiKeyboard-Android/.gradle/**`
- `LumiKeyboard-Android/app/build/**`

Actions:
- remove from Git tracking if they are not intended source assets
- tighten ignore rules to prevent reintroduction
- verify no generated Android artifacts remain in staged or unstaged diff for the candidate

Done when:
- generated build artifacts are no longer part of the launch candidate diff or index

### Step 4 - Resolve unrelated dirty paths outside frozen scope
The release candidate must only contain intended launch-scope changes.

Actions:
- inventory dirty paths
- classify each path as:
  - required for launch
  - unrelated / deferred
  - generated / accidental
- move unrelated changes to another branch, patch, stash, or parking location
- keep only launch-approved paths in the candidate

Done when:
- `git diff --name-only` and `git diff --name-only --cached` match the intended release surface only

### Step 5 - Repair the release-baseline script
`scripts/check-release-baseline.sh` must be brought into alignment with actual Git evidence.

Minimum expectations:
- fail if tracked generated artifacts are present in the candidate diff or index
- fail if dirty paths exist outside the approved allowlist
- fail if staged changes exceed the intended launch surface
- fail if unexpected untracked files exist in forbidden locations
- emit clear diagnostic output for each failing category

The script must no longer be accepted as sole evidence unless it matches Git truth.

Done when:
- the script result matches manual Git inspection
- false-green conditions are eliminated

### Step 6 - Create explicit G1 evidence
G1 should be supported by a real evidence bundle, not by one script result alone.

Evidence should include:
- current commit SHA
- `git status --short`
- `git diff --name-only`
- `git diff --name-only --cached`
- release-baseline script output
- allowlist of approved changed files
- note explaining why any non-repo memory logs are out of scope

Store this in docs/status if appropriate.

Done when:
- a reviewer can verify G1 from the evidence package alone

### Step 7 - Rerun Launch 13 final gate on the clean candidate
Once G1 is truly green, rerun the final launch gate sequence from the clean candidate.

Minimum rerun set:
- release-baseline proof
- required TS validation
- required Gradle validation
- connected Android gate
- final docs/spec/plan/status update

Done when:
- G1, G2, G3, and G4 are all green on the same clean candidate

### Step 8 - Issue pilot launch go/no-go
After the clean rerun, make an explicit decision:
- GO
- GO WITH KNOWN DEFERRED ITEMS
- NO-GO

Record:
- candidate commit/tag
- exact deferred items
- support/on-call owner(s)
- rollback point

Done when:
- the pilot launch decision is durable, documented, and reproducible

---

## Recommended Git evidence rules for G1

G1 should only be marked green if all of the following are true:
1. `git status --short` shows no unexpected dirty tracked/untracked paths in the candidate
2. `git diff --name-only` contains only approved launch-scope paths
3. `git diff --name-only --cached` contains only approved launch-scope paths
4. no tracked generated Android build paths remain in the candidate
5. release-baseline script output agrees with the above Git evidence

---

## Release-candidate write-surface discipline

During Launch 13.5, only these categories may change:
- launch docs/spec/plan/status
- release-baseline scripts / ignore rules / hygiene controls
- minimum required repo hygiene fixes to remove generated or unrelated candidate noise

Do not mix Launch 13.5 with new runtime or product work.

---

## Validation commands

Run and record at minimum:

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

---

## Definition of done

Launch 13.5 is done when:
1. G1 is green based on real Git evidence, not only a script result
2. tracked generated artifacts are removed from the candidate surface
3. unrelated dirty paths are excluded from the launch candidate
4. release-baseline script is trustworthy against actual Git state
5. Launch 13 final gate is rerun on the clean candidate
6. G1, G2, G3, and G4 are all green on the same launch candidate
7. pilot launch go/no-go is explicitly recorded

---

## Deliverables expected from Codex

At the end of the run, report:
- candidate branch/worktree strategy used
- exact launch-scope file list
- tracked generated artifacts removed/untracked
- release-baseline script changes
- G1 evidence bundle summary
- final gate rerun result
- pilot launch decision
- remaining deferred items
- blockers if any

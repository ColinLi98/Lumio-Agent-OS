# M14.5 - Repo Noise Reduction and Release Baseline

## Why this milestone exists now

M0-M14 have established a deep and valuable system, but the repo is now showing sustained noise symptoms:
- working tree noise is high
- some directories are historically untracked
- milestone diffs are harder to review cleanly
- feature work and hygiene work are increasingly mixed
- future Codex runs are more likely to touch unrelated files
- validation results are green, but release confidence is lower than it should be

The next step should not be to immediately stack more platform complexity on top of a noisy baseline.
The next step is to create a stable release baseline so later milestones remain reviewable, revertable, and auditable.

This is a short hardening and hygiene pass, not a feature milestone.

## Goal

Reduce repository noise, tighten milestone boundaries, and establish a cleaner release baseline for the next major platform milestone.

## In scope

### 1. Working tree and tracked/untracked hygiene
- Identify historically noisy tracked vs untracked paths.
- Classify files into:
  - durable product or platform source
  - durable docs
  - generated artifacts
  - local debug output
  - scratch analysis output
  - test device or run leftovers
- Move or ignore anything that should not remain in the normal milestone diff surface.

### 2. Ignore policy hardening
- Tighten `.gitignore` and any module-level ignore patterns.
- Ensure build outputs, export artifacts, local traces, temporary files, generated images, and scratch outputs do not appear as normal review noise.
- Keep durable docs in `docs/` and keep transient outputs outside the normal source review path.

### 3. Milestone write-boundary hardening
- Update `AGENTS.md` and milestone docs if needed so Codex has stricter write boundaries.
- Make it explicit that milestone work must not opportunistically touch unrelated files.
- Separate hygiene changes from behavior changes where practical.

### 4. Warning and formatting hygiene in touched files only
- Reduce obvious warnings, dead imports, and trivial style noise only in files already touched or in explicitly approved hygiene files.
- Do not open a repo-wide cleanup war.

### 5. Release baseline checks
- Produce a release-baseline checklist that confirms:
  - scoped diff
  - no accidental generated artifacts
  - green validation
  - updated docs/spec/plan/status
  - recoverable commit boundary

## Out of scope

- broad refactor unrelated to the current repo noise problem
- full warning cleanup across the whole repo
- broad renaming campaigns
- architecture rewrites
- end-user product redesign
- storage/history redesign
- orchestrator rewrite

## Required outputs

### A. Noise inventory
Create a short, durable inventory document for the repo, for example:
- `docs/repo-noise-inventory.md`

It should classify major noisy paths and explain whether each should be:
- tracked source
- tracked durable docs
- ignored generated output
- local-only scratch/debug artifact

### B. Release baseline checklist
Create a short durable checklist document, for example:
- `docs/release-baseline-checklist.md`

It should include:
- milestone scope check
- dirty tree sanity check
- validation command set
- docs/status update check
- tracked/untracked sanity check

### C. Ignore policy updates
Update `.gitignore` and any additional ignore surfaces only where justified by the noise inventory.

### D. Scoped cleanup only
Remove or isolate obvious non-source noise where safe.
Do not perform broad cleanup outside the documented scope.

## Engineering rules for this pass

1. Do not mix major new feature work into this pass.
2. Prefer moving noise out of the path over inventing new abstractions.
3. Avoid touching stable runtime files unless needed for scoped hygiene.
4. Keep this pass small, reviewable, and easily revertable.
5. Treat this as a release-train discipline milestone.

## Suggested milestone breakdown

### M14.5A - Inventory and classification
- identify noisy paths
- classify tracked vs untracked vs generated
- document decisions

### M14.5B - Ignore and boundary tightening
- update ignore rules
- tighten AGENTS/doc guidance if needed
- ensure transient outputs stop polluting the repo

### M14.5C - Scoped cleanup
- remove or isolate obvious noise
- fix trivial warnings in touched files only
- avoid broad repo churn

### M14.5D - Release baseline validation
- run the standard validation suite
- confirm clean milestone diff surface
- update spec/plan/status with the hygiene baseline result

## Validation commands

Run and keep green:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done

M14.5 is done when:
1. the repo has an explicit noise inventory and classification
2. ignore rules and write boundaries are tightened where needed
3. transient/generated noise is reduced from the normal milestone diff surface
4. no broad accidental cleanup was mixed into the pass
5. the standard validation suite remains green
6. spec/plan/status reflect the new release baseline

## Next milestone after M14.5

After this pass, proceed to:
- `M15 - Enterprise SSO, SCIM, IdP, and Credential Vault Integration`

## M14.5 implementation checkpoint (2026-03-04)
- Status: completed.
- Implemented:
  - Added durable inventory: `docs/repo-noise-inventory.md`.
  - Added release baseline checklist: `docs/release-baseline-checklist.md`.
  - Tightened ignore boundaries in root `.gitignore` and `LumiKeyboard-Android/.gitignore`.
  - Added hygiene write-boundary guidance in repository `AGENTS.md`.
- Snapshot notes:
  - Dominant residual noise remains historically tracked Android generated artifacts under `LumiKeyboard-Android/app/build` and `.gradle`.
  - This index-level cleanup remains intentionally deferred to dedicated migration loop (`LOOP-010`) to keep M14.5 reviewable and low risk.

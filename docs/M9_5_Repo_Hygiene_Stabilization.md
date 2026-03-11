# M9.5 - Repo Hygiene and Stabilization Pass

## Why this pass exists

The product/runtime roadmap is progressing well, but the repository is now noisy enough to increase the cost and risk of every future milestone.

This pass is intentionally short and operational. It is not a feature milestone. Its goal is to make the repo safer for continued multi-milestone Codex-driven work.

The current pain is not only "many changed files". The real risk is:
- unclear signal vs noise in diffs
- generated or transient files mixing with source changes
- milestone work landing on top of an unstable working tree
- test/validation confidence degrading over time
- increased review and rollback cost

## Goal

Create a stable, low-noise repo baseline so future milestones can be implemented with smaller diffs, clearer reviews, and lower regression risk.

## In scope

1. Establish a clean milestone workflow baseline.
2. Reduce noisy or repeatedly regenerated file churn.
3. Tighten ignore rules and generated-artifact boundaries.
4. Add repo-local working conventions for Codex and human contributors.
5. Add a lightweight validation / preflight discipline.
6. Reduce non-blocking compile warning noise where safe and tightly scoped.

## Out of scope

- orchestrator rewrite
- large package/module reshuffle
- history/storage architecture rewrite
- visual redesign
- broad product feature work
- large-scale ktlint/detekt migration unless already present and trivial to scope

## Success criteria

This pass is done when:
1. The repo has a documented low-noise workflow for future milestones.
2. Generated/transient files are reliably excluded or quarantined.
3. Codex-facing instructions clearly constrain write scope and artifact placement.
4. The working tree can be returned to a clean baseline after validation.
5. Warnings reduced in touched areas where low-risk, without broad refactors.
6. Docs/status reflect the new hygiene rules.

## Workstreams

### M9.5A - Working tree and artifact hygiene

- Audit current noisy paths.
- Identify categories:
  - generated build artifacts
  - transient test/device outputs
  - temporary exports
  - local scratch docs
  - durable source/docs that should remain tracked
- Tighten `.gitignore` and any local artifact directories.
- Standardize a small set of allowed temp/output locations.
- Ensure milestone docs and prompts live in stable tracked locations only when intentional.

Recommended conventions:
- keep durable milestone docs in `docs/`
- keep generated local analysis/output in a clearly ignored local path
- avoid scattering one-off files at repo root

### M9.5B - Codex and contributor scope discipline

Update repo guidance so future work follows strict scoping rules.

Add or tighten guidance in `AGENTS.md` and docs:
- edit only milestone-scoped files unless explicitly required
- separate mechanical cleanup from behavioral changes
- avoid opportunistic broad rewrites
- update spec/plan/status together
- keep additive compatibility unless the milestone explicitly permits migration
- do not leave mixed old/new states

Recommended execution discipline:
- one milestone, one scoped branch/worktree
- one milestone status doc update
- validation before widening scope
- no unrelated cleanup in feature commits

### M9.5C - Validation and warning discipline

Add a lightweight repo-local preflight checklist for milestone work:
- assemble/debug build
- core unit test set
- app host unit tests
- critical connected UI tests when UI is touched

If compile warnings are localized and safe to clean without widening scope, reduce them in touched areas only.
Do not turn this into a broad warning-elimination refactor.

### M9.5D - Baseline cleanliness and rollback safety

Document a clean baseline procedure:
- confirm intended tracked changes only
- confirm no accidental generated files are staged
- confirm milestone docs/status are synced
- confirm validation commands passed
- confirm rollback/revert blast radius remains small

Optionally add a simple checklist doc such as:
- `docs/repo-hygiene-checklist.md`
- `docs/milestone-preflight-checklist.md`

## Recommended concrete actions

1. Audit and tighten ignore rules.
2. Add a clearly ignored local output/scratch area.
3. Update `AGENTS.md` with repo hygiene constraints.
4. Add a short contributor/Codex workflow note under `docs/`.
5. Reduce localized warnings in files touched during this pass if safe.
6. Update spec/plan/status docs with hygiene baseline completion.

## Suggested files to review

- `.gitignore`
- `AGENTS.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`
- build/test output paths currently producing churn

## Validation commands

Run the usual baseline validations after hygiene changes:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
```

Only run connected tests if this pass changes UI or instrumentation-relevant wiring.

## Definition of done

- repo-noise sources are identified and reduced
- ignore rules and local artifact boundaries are tightened
- Codex/contributor workflow constraints are documented
- preflight/checklist docs exist or existing docs are updated clearly
- localized warning reduction completed where safe
- validation passes

## What comes next

After this pass, proceed to:

**M10 - Remote Operator Backend, Alert Routing Integrations, and Operator Collaboration**

That next milestone should build on a calmer, more predictable repository baseline.

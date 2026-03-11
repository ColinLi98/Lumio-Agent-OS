# AGENTS.md (Repo Hygiene Baseline)

## Purpose
This file adds repository-local workflow discipline for milestone execution.  
It is additive to higher-level safety/product instructions.

## Scope Discipline
- Work milestone-by-milestone.
- Edit only milestone-scoped files unless explicitly required.
- Keep behavioral changes separate from hygiene/mechanical cleanup.
- Do not bundle opportunistic broad cleanup in feature milestones.
- Update `docs/codex-agent-os-refactor-spec.md`, `docs/codex-agent-os-refactor-plan.md`, and `docs/codex-agent-os-refactor-status.md` together when milestone state changes.

## Local Artifact Discipline
- Do not commit generated build artifacts or local scratch outputs.
- Preferred local scratch/output paths:
  - `.local-output/`
  - `local-output/`
  - `artifacts/local/`
- Keep durable milestone and architecture docs under `docs/`.
- Avoid creating one-off files at repository root unless intentionally tracked.

## Milestone Preflight
Before widening scope or handing off a milestone:
1. Confirm only intended files are modified.
2. Confirm no generated/transient files are staged.
3. Run baseline validation for touched areas.
4. Record pass/fail and any defer notes in status docs.
5. Keep rollback blast radius small and explicit.

## Hygiene Milestone Boundary
For repo-hygiene milestones (for example M9.5, M14.5):
- Allowed write surface by default:
  - `.gitignore`
  - module-level ignore files
  - `AGENTS.md`
  - `docs/*` baseline/checklist/status artifacts
- Any runtime/product code edit requires explicit milestone scope justification in status docs.
- Avoid index-wide tracked-artifact migration unless the milestone explicitly approves a dedicated cleanup migration.

## Launch Step Boundary
For launch-sequence steps under `docs/Launch/Launch_0X_*`:
- Default write surface is the active launch-step doc, `docs/codex-agent-os-refactor-spec.md`, `docs/codex-agent-os-refactor-plan.md`, `docs/codex-agent-os-refactor-status.md`, and only the files explicitly required by that step.
- For release-baseline and hygiene steps, the default additional write surface is:
  - `.gitignore`
  - module-level ignore files
  - `AGENTS.md`
  - `docs/*baseline*`
  - `docs/*checklist*`
  - `docs/*inventory*`
- If work needs to touch anything outside the active step's default write surface, record explicit scope justification in the status docs before handoff.
- Do not mix index-wide tracked-artifact migration with launch-step hygiene updates unless the active step explicitly allows that migration.

## Guardrails
- No orchestrator rewrite during hygiene passes.
- No broad package/module refactors during hygiene passes.
- No broad UX redesign during hygiene passes.
- Preserve backward compatibility unless the active milestone explicitly allows migration.

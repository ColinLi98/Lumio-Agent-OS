# Release Baseline, Repo Hygiene, and Gating

Decision date: 2026-03-07
Owner: Codex
Status: frozen for the launch sequence

## Goal
Reduce repository noise, freeze the release baseline, and make all future launch work reviewable, revertible, and bisectable.

## Why this step is now
A noisy repo undermines confidence in every remaining launch-blocking step.

## Current noise snapshot
- `git status --short` entries at step start: `1040`
- expanded untracked visibility check:
  - `git status --short --untracked-files=all`: `1212`
- dominant noisy bucket:
  - `LumiKeyboard-Android/app/**`: `667`
  - of those, `LumiKeyboard-Android/app/build/**`: `636`
- additional noisy tracked artifact bucket:
  - `LumiKeyboard-Android/.gradle/**`: `29`
- durable but intentionally visible workstreams:
  - `docs/**`: `86`
  - `services/**`: `49`
  - `api/**`: `22`
  - `tests/**`: `51`

Interpretation:
- the largest source of noise is still historically tracked generated Android build/Gradle state
- the large `docs/`, `services/`, `api/`, and `tests/` buckets are durable workstreams, not ignore candidates

## Launch 02 write surface freeze
Allowed write surface by default for this step:
- `.gitignore`
- module-level ignore files
- `AGENTS.md`
- `docs/Launch/Launch_02_Release_Baseline_Repo_Hygiene_and_Gating.md`
- `docs/repo-noise-inventory.md`
- `docs/release-baseline-checklist.md`
- `docs/milestone-preflight-checklist.md`
- `docs/repo-hygiene-baseline.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Anything outside this surface requires explicit status-doc justification before handoff.

## In scope
- inventory noisy paths and classify tracked durable docs/source vs generated/transient noise
- tighten `.gitignore` and scratch/build/temp boundaries
- freeze Codex write boundaries and milestone-scoped file discipline
- refresh the release baseline checklist and preflight gate

## Out of scope
- no broad cleanup war across unrelated directories
- no opportunistic refactors
- no architecture changes
- no index-wide tracked-artifact migration in this step

## Step outputs completed
1. Refreshed the live repo-noise inventory with current counts and path classes.
2. Tightened ignore boundaries for:
   - temp/cache churn
   - patch leftovers
   - local Python/tool caches
   - root ad-hoc export binaries
3. Froze launch-step write boundaries in `AGENTS.md`.
4. Refreshed the release baseline checklist and milestone preflight checklist as the canonical `G1` hygiene gate, including expanded untracked-file visibility checks.
5. Synced `spec`, `plan`, and `status` with the Launch 02 baseline checkpoint.

## Explicitly deferred from this step
- removing previously tracked Android build/Gradle artifacts from the index
- broad cleanup across unrelated `docs/`, `services/`, `api/`, `components/`, and `tests/` workstreams
- any runtime/product code change not strictly required for ignore/boundary hygiene

## Dependency note
- Launch 02 does not waive the roadmap dependency order from `Launch_00`.
- The Launch 01 scope freeze is now recorded complete in `docs/codex-agent-os-refactor-status.md`.
- `Launch_03` may proceed only after this Launch 02 hygiene baseline remains the active `G1` gate for the next implementation slice.

## Compatibility statement
- additive and backward-compatible only
- no runtime behavior changed
- no local-first safety semantics changed
- this step narrows review boundaries; it does not rewrite product or infrastructure behavior

## Validation summary
This step is docs/ignore/boundary only.
- No `services/agent-kernel/*` files changed.
- No Android / host runtime files changed.
- The TypeScript and Android validation gates were therefore not rerun in this step.

Validation expectation for later steps:
- run the TypeScript `agent-kernel` gate when service substrate files change
- run the Android / host gate when Android or host runtime paths change

## Definition of done
- The release branch has a stable bounded write surface.
- Unexpected generated artifacts and untracked noise are under control.
- Every remaining step can be reviewed with clear diff boundaries.

## Final report checklist
- changed files
- exact step outputs completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

# Repo Noise Inventory (Launch 02 Release Baseline)

Date: 2026-03-07  
Workspace: `/Users/lili/Desktop/Agent OS`  
Source: live `git status --short` snapshot before Launch 02 hygiene edits, plus expanded `--untracked-files=all` verification

## Snapshot
- `git status --short` total entries: `1040`
- `git status --short --untracked-files=all` total entries: `1212`
- Status mix:
  - modified tracked: `154`
  - deleted tracked: `688`
  - untracked: `191`
  - mixed staged/unstaged combinations: `34`

## Top noisy buckets (by path prefix)
- `LumiKeyboard-Android/app`: `667`
  - mostly tracked generated Android build output under `app/build/**`
  - also contains a smaller set of real product/source edits under `app/src/**`
- `docs`: `86`
  - mostly durable markdown/spec/workstream documents
- `components`: `62`
  - durable source work, not ignore candidates
- `tests`: `51`
  - durable source/test work, not ignore candidates
- `services`: `49`
  - durable source work, not ignore candidates
- `LumiKeyboard-Android/.gradle`: `29`
  - tracked generated Gradle state
- `api`: `22`
  - durable source work, not ignore candidates
- `scripts`: `21`
  - mixed durable scripts plus local utility churn

## High-signal path counts
- `LumiKeyboard-Android/app/build/**`: `636`
- `LumiKeyboard-Android/.gradle/**`: `29`
- `docs/**`: `86`
- `services/**`: `49`
- `api/**`: `22`
- `tests/**`: `51`

## Expanded untracked visibility cross-check
- `docs/**`: `99`
- `services/**`: `73`
- `api/**`: `30`
- `tests/**`: `51`

Interpretation:
- the expanded untracked view increases durable workstream fanout, but it does not change the dominant tracked-artifact noise story
- the review boundary remains: keep durable source/docs visible, keep generated/tracked artifact cleanup deferred, and block local-only scratch churn with ignore rules

## Classification

### A) Tracked generated/build noise (deferred cleanup)
- Examples:
  - `LumiKeyboard-Android/app/build/**`
  - `LumiKeyboard-Android/.gradle/**`
  - tracked report output such as `LumiKeyboard-Android/build/reports/problems/problems-report.html`
  - tracked test runner artifacts such as `test-results/.last-run.json`
- Class:
  - generated artifacts that should not define milestone review boundaries
- Action in Launch 02:
  - keep them explicitly documented
  - do not perform index-wide cleanup in this milestone
  - defer removal-from-index migration to `LOOP-010`

### B) Durable source and docs (visible by design)
- Examples:
  - `docs/Launch/**`
  - `docs/*.md`
  - `services/**`
  - `api/**`
  - `tests/**`
  - `LumiKeyboard-Android/app-backend-host/**`
  - `LumiKeyboard-Android/core-agent/**`
  - `LumiKeyboard-Android/core-domain/**`
- Class:
  - real product, infrastructure, or documentation workstreams
- Action in Launch 02:
  - keep visible
  - control through milestone-scoped write boundaries, not ignore rules

### C) Immediate ignore boundary candidates (tighten now)
- Examples:
  - local scratch/output directories: `.local-output/`, `local-output/`, `artifacts/local/`
  - root temp/cache churn: `.tmp/`, `.temp/`, `tmp/`, `temp/`, `.cache/`
  - Python/tool caches: `__pycache__/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `.tox/`, `.nox/`
  - patch/temp files: `*.tmp`, `*.bak`, `*.orig`, `*.rej`
  - root ad-hoc binary/doc exports: `/*.pdf`, `/*.pptx`, `/*.docx`, `/*.html`
- Class:
  - local-only scratch/debug/export outputs that should never pollute milestone diffs
- Action in Launch 02:
  - ignore them now via additive `.gitignore` tightening

### D) Local config churn that still needs reviewer attention
- Examples:
  - `LumiKeyboard-Android/local.properties` when historically tracked
  - repo-level config files already in active use
- Class:
  - environment-sensitive files that may be legitimate but still need scoped review
- Action in Launch 02:
  - do not hide with broad ignore rules if already tracked
  - require explicit milestone scoping and status-doc evidence

## Launch 02 hygiene actions
- Root `.gitignore` tightened for temp/cache churn and root export artifacts.
- `LumiKeyboard-Android/.gitignore` tightened for local temp/cache boundaries.
- `AGENTS.md` updated with launch-step write-boundary rules.
- Release-baseline and milestone-preflight checklist docs updated to act as the canonical preflight gate for later launch steps, including `--untracked-files=all` visibility checks.

## Remaining intentional deferrals
1. Index-level cleanup of historically tracked generated Android artifacts remains deferred to dedicated migration loop `LOOP-010`.
2. Broad cleanup across unrelated `docs/`, `services/`, `api/`, `components/`, and `tests/` workstreams is intentionally out of scope for Launch 02.
3. No attempt is made in this milestone to hide or rewrite durable source/docs just because the repo is currently large and dirty.

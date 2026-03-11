# Repo Hygiene Baseline (Launch 02)

Date: 2026-03-07
Scope: release-baseline freeze, repo hygiene, and gating only

## Persistent noise sources
- Android/Gradle local state churn:
  - `LumiKeyboard-Android/.gradle/**`
  - `LumiKeyboard-Android/.gradle-home/**`
  - `LumiKeyboard-Android/.kotlin/**`
- Tracked build/output churn:
  - `LumiKeyboard-Android/app/build/**`
  - tracked report/test artifacts already in the index
- Local scratch, cache, and ad-hoc export outputs that can appear during docs/build/test work
- Large unrelated in-flight workstreams that must remain visible but milestone-scoped

## Launch 02 hardening applied
- Refreshed the live repo-noise inventory with current counts and path classes.
- Tightened root and Android-subproject ignore rules for local temp/cache/export churn.
- Froze the launch-step write surface in `AGENTS.md`.
- Refreshed the release-baseline checklist and milestone-preflight checklist as the canonical hygiene gate, including expanded untracked-file visibility checks.

## Operating rule after Launch 02
- Hygiene and feature changes remain separated.
- Launch-step doc, `spec`, `plan`, and `status` docs must stay synchronized.
- Preflight review should check both `git status --short` and `git status --short --untracked-files=all`.
- Do not hide durable source/docs just because the repo is large or dirty.
- Keep local-first runtime behavior and compatibility protections unchanged by hygiene passes.

## Remaining known risks
- Historically tracked generated/build files still create large diff noise until the dedicated cleanup migration in `LOOP-010`.
- The repo remains a dirty mixed worktree; reviewers still need milestone-scoped path discipline.
- This step does not clean unrelated feature work or normalize the entire index.

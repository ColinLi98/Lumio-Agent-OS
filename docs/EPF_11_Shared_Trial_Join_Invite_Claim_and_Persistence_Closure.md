# EPF-11 Shared Trial Join, Invite Claim, and Persistence Closure

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Add the minimum join / invite acceptance / seat claim / release flows needed to make the shared B-end trial workspace meaningfully usable by multiple evaluators.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no BPM / DSL
- no orchestrator rewrite
- no destructive automation

## Delivered
- Added invite acceptance flow through a dedicated API.
- Added seat claim / release semantics and visible claim status.
- Added persistence truth details:
  - `MEMORY_ONLY`
  - `SERVER_BACKED`
  - deployment blocker messaging when persistence env is missing
- Added join instructions so the workflow is understandable in-product.
- Strengthened shared trial continuity and kept all artifacts explicitly non-pilot.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Real pilot activation and `REAL_PILOT` evidence
- Full enterprise auth/account rollout
- Persistent cross-instance durability until Postgres or Redis env is configured
- Broader participant identity lifecycle and approval mechanics beyond bounded invite acceptance / seat release

# EPF-10 Server-Backed Enterprise Trial Workspace and Multi-User Coordination

Date: 2026-03-09
Owner: Codex
Status: implemented with explicit deployment blocker

## Goal
Move the enterprise sandbox beyond one-browser-origin rehearsal by adding a bounded server-backed trial workspace path for shared participants, seats, sessions, invites, and trial-task continuity.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no BPM / DSL
- no orchestrator rewrite
- no destructive automation

## Delivered
- Added typed server-side trial workspace service and APIs for:
  - summary
  - session registration
  - trial task creation
  - invite creation
- Added typed trial workspace concepts in platform truth:
  - trial workspace
  - trial seats
  - trial participants
  - trial invites
  - trial sessions
  - trial activities
  - trial task detail
  - persistence state
- Product-shell summary now exposes `trial_workspace` in `local_lab` mode.
- Web platform now prefers server-backed trial summary when available and only falls back to browser-local state when needed.
- Trial-to-pilot conversion guidance and `MEMORY_ONLY` vs `SERVER_BACKED` state are now visible in-product.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Explicit blocker
- Current Vercel project does **not** have `AGENT_KERNEL_POSTGRES_URL` or `AGENT_KERNEL_REDIS_URL` configured.
- Because of that, EPF-10 currently runs in `MEMORY_ONLY` server mode in deployed environments.
- The server-backed path is implemented, but true cross-instance multi-browser durability depends on persistent backend env configuration.

## Deferred
- Real pilot activation and `REAL_PILOT` evidence
- Full enterprise auth/account rollout
- Invite acceptance / participant claim workflows beyond bounded invite creation
- Persistent cross-instance durability until Postgres or Redis is configured in deployment

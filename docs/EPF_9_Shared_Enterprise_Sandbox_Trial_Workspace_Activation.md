# EPF-9 Shared Enterprise Sandbox, Trial Workspace Activation, and Multi-User Rehearsal

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Turn the current one-browser enterprise sandbox into a shared trial workspace model that supports multi-session B-end evaluation without being confused with `REAL_PILOT` truth.

## Scope lock
- additive and bounded
- not real pilot activation
- no BPM / DSL
- no orchestrator rewrite
- no broad UI redesign
- no connector / workflow / deployment expansion
- no weakening of the non-pilot evidence boundary

## Delivered
- Added typed trial workspace concepts:
  - trial workspace
  - trial participant
  - role seat
  - trial session
  - trial task detail
- Added durable trial workspace state in the enterprise web platform data layer.
- Added multi-session semantics:
  - session registration by page / section / role seat
  - participant roster and session visibility
  - shareable trial state inside the same browser-origin workspace
- Added deeper sandbox task detail:
  - lifecycle
  - receipt summary
  - approval summary
  - missing fields
  - handoff lines
- Added trial-to-pilot conversion guidance in-product.
- Kept all sandbox/trial activity explicitly non-pilot and blocked from `REAL_PILOT` evidence.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Real pilot activation and true live pilot evidence
- Server-backed cross-browser/shared-tenant trial persistence
- Full enterprise auth/account rollout
- Richer operator/admin mutation actions and approval mechanics inside the trial workspace
- Android / C-end product evolution remains outside this B-end platform pass

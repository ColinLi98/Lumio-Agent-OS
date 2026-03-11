# EPF-24 Standalone Trial Join Route

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Turn the enterprise sandbox invite-claim flow into a true standalone B-end route so evaluators can open a dedicated join page directly from a shared link.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion
- no BPM / DSL or orchestrator rewrite

## Delivered
- Added a standalone `surface=trial-join` route.
- Added a dedicated standalone join page that:
  - loads the shared trial workspace summary
  - shows invite-code claim UI
  - preserves non-pilot labeling
  - exposes shared trial context and persistence state
- Updated invite claim links to land directly on the standalone route.
- Added accepted-seat next-step links that open the correct role page or return to the workspace.
- Kept all trial activity explicitly non-pilot.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Richer standalone invite acceptance completion states beyond role-page jump
- Standalone receipt / approval detail follow-up pages
- Production persistence activation
- Real pilot activation and `REAL_PILOT` evidence

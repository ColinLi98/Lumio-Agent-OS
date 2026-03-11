# EPF-22 Trial Timeline, Approval Detail, and Shareable Join Links

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Deepen the B-end shared trial workspace from basic task focus into a clearer enterprise workflow detail experience with visible timeline, approval posture, and shareable invite-claim links.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion
- no BPM / DSL or orchestrator rewrite

## Delivered
- Extended trial task detail with:
  - explicit next-action guidance
  - approval detail lines
  - task timeline
  - activity-derived history when available
- Added shareable invite-claim links for open trial invites.
- Preserved URL-deep-linkable task focus and reused the same shared trial truth.
- Kept all new surfaces explicitly non-pilot and trial-only.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Dedicated invite-claim landing page outside the main workspace shell
- Richer receipt export and approval decision history
- Production persistence activation
- Real pilot activation and `REAL_PILOT` evidence

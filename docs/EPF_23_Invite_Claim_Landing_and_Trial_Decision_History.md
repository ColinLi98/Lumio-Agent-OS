# EPF-23 Invite Claim Landing and Trial Decision History

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Strengthen the B-end enterprise trial workspace with a dedicated join landing path and clearer decision-history visibility so evaluators can join and understand workflow progress without operator guidance.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion
- no BPM / DSL or orchestrator rewrite

## Delivered
- Added a dedicated `Trial Join` workspace section for invite claim entry.
- Updated shareable invite links to land on the dedicated join section instead of a generic overview.
- Extended trial task detail with:
  - explicit approval detail lines
  - clearer next-action guidance
  - timeline visibility using shared activity when available
- Extended server-backed trial activity generation so task creation immediately records requester, operator, and tenant-admin workflow context.
- Preserved strict non-pilot labeling throughout.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Dedicated standalone invite-claim route outside the main workspace shell
- Richer receipt export and approval decision history
- Production persistence activation
- Real pilot activation and `REAL_PILOT` evidence

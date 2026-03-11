# EPF-21 Shared Trial Join Surface and Task Detail Web Experience

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Close the next B-end trial UX gap by adding invite-code join input, deep-linkable trial task focus, and clearer cross-role task drill-down in the shared enterprise sandbox.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion
- no BPM / DSL or orchestrator rewrite

## Delivered
- Added a trial join panel with:
  - invite-code input
  - participant label input
  - visible open / accepted invite list
  - direct join actions
- Added deep-linkable trial task focus using URL state:
  - `trial_task`
  - `invite_code`
- Added a dedicated trial task detail panel with:
  - task picker
  - lifecycle
  - receipt summary
  - missing-field detail
  - handoff / next-action lines
  - approval boundary summary
- Wired requester inbox items into task drill-down so a requester can open the same trial task context that operator and tenant-admin pages can continue to inspect.
- Preserved strong non-pilot labeling across all new surfaces.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Dedicated invite-claim landing page outside the main workspace shell
- Richer task timeline / receipt export / approval detail views
- Production persistence activation
- Real pilot activation and `REAL_PILOT` evidence

# EPF-20 Local Role Lab Task Submission and Cross-Request Continuity

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Fix the practical product gap where the enterprise web platform could display rehearsal roles but could not submit and keep a local-lab task alive across pages and requests.

## Scope
- add a browser-durable task layer for `LOCAL_ROLE_LAB`
- add requester brief parsing for enterprise rehearsal tasks
- add requester-side task submission UI in the enterprise platform
- merge local-lab tasks into the existing product-shell truth used by the web platform
- keep all local-lab tasks explicitly non-pilot and blocked from `REAL_PILOT` promotion

## Delivered
- Added `services/localRoleLabTaskStore.ts` with:
  - browser-local durable storage
  - requester brief parsing
  - local rehearsal task creation
  - cross-tab update subscription
  - inbox and local-role-lab summary merging
- Added `LocalRoleLabTaskComposer` to the requester shell.
- Enterprise platform now merges local-lab tasks into:
  - requester inbox
  - next action
  - scenario summary
  - handoff timeline
  - seat detail current work / dependencies
- This fixes the practical continuity gap for rehearsal tasks without pretending serverless preview memory is durable.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Real pilot activation and true live pilot evidence
- Shared multi-user server-backed workspace task persistence
- Richer operator/admin mutation actions for local-lab tasks
- Any promotion of local-lab tasks into real pilot evidence

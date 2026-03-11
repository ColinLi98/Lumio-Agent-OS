# EPF-19 Workspace Seat Detail and Management Drilldown

Date: 2026-03-08
Owner: Codex
Status: implemented

## Goal
Make the enterprise web platform feel like a real workspace console by adding focused seat/member drilldown instead of only showing high-level role pages and summary cards.

## Scope
- add shareable `member` deep links in the enterprise platform
- add a focused seat detail panel for the currently selected workspace participant
- keep the current viewer role stable while inspecting another seat in `LOCAL_ROLE_LAB`
- strengthen organization/members/seat-management surfaces with direct inspection links
- keep all local-lab artifacts explicitly non-pilot

## Delivered
- Added a focused seat detail panel that shows:
  - selected actor / role / seat status
  - provisioning and access posture
  - session context
  - current work items
  - handoffs/dependencies
  - evidence-boundary reminder
  - next action
- Added `member` query-param deep linking in the enterprise platform URL model.
- Added `Inspect seat` actions to:
  - workspace directory
  - seat assignment
  - members & access
- Kept `LOCAL_ROLE_LAB` semantics strict:
  - inspection improves rehearsal visibility only
  - local rehearsal data still cannot count as `REAL_PILOT` evidence

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS

## Deferred
- Real pilot activation and real live pilot evidence
- Richer member-edit/admin-write flows
- Full org/workspace/member backend provisioning system
- Any promotion from local-lab inspection into real pilot evidence

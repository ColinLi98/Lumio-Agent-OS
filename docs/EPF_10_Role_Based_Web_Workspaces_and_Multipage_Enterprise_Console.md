# EPF-10 Role-Based Web Workspaces and Multipage Enterprise Console

Date: 2026-03-08
Owner: Codex
Status: Implemented

## Objective
Turn the enterprise web platform from a single workspace overview into a role-readable product shell with shareable requester, operator, tenant-admin, and workspace pages.

## Scope
- Web platform only
- Additive on top of existing product-shell truth
- No new governance/runtime primitive
- No new connector, workflow-family, or deployment expansion

## What shipped
- Role page model for:
  - `workspace`
  - `requester`
  - `operator`
  - `tenant_admin`
- Shareable URL state for:
  - `surface=platform`
  - `page=...`
  - `workspace_mode=...`
  - `lab_actor_id=...`
- Role-page switcher in the platform header with:
  - open here
  - open in new tab
- Role-aware left navigation:
  - requester page emphasizes inbox/navigator
  - operator page emphasizes operations/observability
  - tenant-admin page emphasizes admin/policy
  - workspace page keeps the full cross-role system view
- Workspace seat cards now open role pages directly, making multi-seat participation visible as separate pages rather than one person mentally simulating the whole system in a single view
- Role summary rail and role-page context summaries now explain what each page is for and how work moves across roles

## Non-pilot rule preserved
- `LOCAL_ROLE_LAB`, `DEMO`, `SIMULATOR`, `TEST`, and `LOCAL_SYNTHETIC` remain non-pilot
- Role pages improve rehearsal and enterprise presentation only
- No role page can promote synthetic artifacts into `REAL_PILOT`

## Validation
- `npm run -s typecheck`
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts`
- Browser QA on the deployed enterprise platform URL

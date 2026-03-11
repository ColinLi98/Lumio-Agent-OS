# EPF-8 - Standalone Enterprise Platform Frontend

Date: 2026-03-08
Owner: Codex
Status: completed

## Goal
Create a standalone web enterprise platform frontend so the product can be shown as a workspace-level B2B platform rather than only as a phone-style app shell.

## Scope lock
- additive and backward-compatible only
- no new governance/runtime primitive
- no fake pilot evidence
- no connector/workflow/deployment expansion
- no broad app rewrite

## Outputs completed
- Added a standalone `EnterprisePlatformView` to the top-level web app.
- Added a top-level mode switch so the platform preview is separate from the app-style shell.
- Reused existing agent-kernel product-shell truth rather than inventing a new backend.
- Surfaced workspace-level concepts:
  - signed-in member label
  - workspace seats
  - requester inbox
  - operator desk
  - tenant-admin setup
  - policy studio
  - activation package
  - pilot activation gap
- Kept `LOCAL_ROLE_LAB` explicitly non-pilot inside the platform view.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts` -> PASS

## Deferred
- Real enterprise login and true account-bound auth
- Multi-user live collaboration beyond local lab and existing activation truth
- Full standalone route/app-shell split beyond the current integrated top-level mode switch

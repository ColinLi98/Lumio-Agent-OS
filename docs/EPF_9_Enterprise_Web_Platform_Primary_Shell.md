# EPF-9 - Enterprise Web Platform Primary Shell

Date: 2026-03-08
Owner: Codex
Status: completed

## Goal
Make the enterprise web platform the primary default product shell for enterprise users, instead of requiring them to enter through the phone-style app preview.

## Scope lock
- additive and backward-compatible only
- no new runtime primitive
- no fake pilot evidence
- no connector/workflow/deployment expansion
- no Android scope expansion in this slice

## Outputs completed
- Enterprise Platform is now the default web entry.
- Legacy phone-style app shell remains available only as a compatibility surface through URL routing.
- Enterprise platform now presents as a workspace operating console instead of a mobile preview mode.
- Workspace-first header metadata is visible:
  - organization
  - workspace
  - environment
  - activation

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS

## Deferred
- Real enterprise login and true account-bound auth
- Full route/app-shell separation beyond URL-based compatibility entry points

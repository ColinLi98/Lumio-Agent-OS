# EPF-11 Enterprise Account Shell and Members Access Workspace

Date: 2026-03-08
Owner: Codex
Status: Implemented

## Objective
Make the enterprise web platform read more like a real SaaS workspace by adding:
- a visible enterprise account shell
- a dedicated Members & Access page
- clearer workspace participation and access posture

## Scope
- web enterprise platform only
- additive product-shell presentation
- no runtime primitive expansion
- no Android scope

## What shipped
- account shell card in the enterprise header
- dedicated `Members & Access` workspace page
- member/access cards derived from current workspace truth
- clearer role/access visibility for requester, operator, and tenant-admin seats

## Rules preserved
- `LOCAL_ROLE_LAB` remains rehearsal-only
- no local-lab artifact is promoted to `REAL_PILOT`
- no new connector, workflow-family, or deployment expansion

## Validation
- `npm run -s typecheck`
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts`
- browser QA on the deployed enterprise platform

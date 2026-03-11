# EPF-8 Enterprise Sandbox and Guided Scenario Productization

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Turn `LOCAL_ROLE_LAB` into a visibly productized Enterprise Sandbox that can demonstrate realistic multi-role workflows without being confused with `REAL_PILOT` evidence.

## Scope lock
- additive and backward-compatible only
- no new governance/runtime primitives
- no BPM / DSL
- no connector / workflow-family / deployment-mode expansion
- no weakening of the non-pilot evidence boundary
- prefer existing runtime truth and shell surfaces over fake demo-only branches

## Delivered
- Added a clear Enterprise Sandbox landing surface in the web platform.
- Added three visible and runnable scenario templates:
  - Advisor Client Intake → Compliance Review → CRM Handoff
  - Cross-Boundary Export Review
  - Exception / Dispute / Remediation Handling
- Added a lightweight guided walkthrough layer tied to the active sandbox scenario.
- Added readable rehearsal outcome summary and explicit demo-to-pilot gap messaging.
- Strengthened role-seat visibility and role-specific summaries across the enterprise shell.
- Kept all sandbox activity explicitly non-pilot and blocked from `REAL_PILOT` promotion.
- Kept Android out of the active B-end delivery scope for this pass; the primary product surface is the enterprise web platform.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Real pilot activation and true live pilot evidence
- Multi-user/shared server-backed sandbox beyond one-browser local rehearsal
- Richer operator/admin mutation actions beyond guided scenario visibility
- Any promotion of sandbox activity into `REAL_PILOT` evidence
- Android/C-end product surfaces remain separate and are not part of this B-end platform pass

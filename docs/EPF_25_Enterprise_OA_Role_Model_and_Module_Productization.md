# EPF-25 Enterprise OA Role Model and Module Productization

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Turn the B-end platform from a three-role trial shell into a commercially legible enterprise OA / execution platform by freezing the v1 role set, mapping roles to modules, and surfacing those roles in-product.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no BPM / DSL or orchestrator rewrite
- no new connector / workflow-family / deployment-mode expansion

## Delivered
- Added a frozen OA v1 role set with 9 first-class roles:
  - Requester
  - Approver
  - Operator
  - Reviewer
  - Tenant Admin
  - Workspace Admin
  - Policy / Governance Admin
  - Integration Admin
  - Auditor
- Added OA shell types and module mapping for:
  - Request Center
  - Approval Center
  - Operations Console
  - Policy & Governance Center
  - Integration & Readiness Center
  - Audit & Reporting Center
- Added module-first OA navigation, role switching, and role-charter visibility in the web platform.
- Expanded the shared trial workspace model from 3 seats to 9 seats while keeping all trial activity non-pilot.
- Expanded trial invite creation/claim semantics to support the OA v1 role set.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/components/StandaloneTrialJoinView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Deeper module-specific queues and mutation actions for all 9 roles
- Richer approval/review decision history and export surfaces
- Production persistence activation
- Real pilot activation and `REAL_PILOT` evidence

# EPF-26 Enterprise Account, Membership, and OA Permission Closure

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Close the biggest gap between the current platform and a real enterprise OA product by turning the existing identity/admin substrate into a true B-end account, membership, and OA permission layer.

## Scope lock
- B-end web platform only
- non-pilot by default
- no Android / C-end expansion
- no BPM / DSL or orchestrator rewrite
- no real pilot activation in this pass

## Delivered
- Added additive enterprise account and membership summaries on top of existing principal/binding/session truth.
- Added enterprise member-management APIs:
  - account summary
  - member list
  - assign role
  - remove role
  - invite member
  - deactivate member
- Expanded enterprise and trial role semantics to support the OA v1 role set.
- Added module-access summaries derived from assigned OA roles.
- Added an in-product enterprise membership admin panel for B-end member and role operations.
- Kept sandbox/trial/demo/local artifacts explicitly non-pilot.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/components/StandaloneTrialJoinView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Full enterprise auth/account rollout beyond the current Okta/OIDC path
- Deeper module-specific queues and mutation actions for all OA roles
- Production persistence activation
- Real pilot activation and `REAL_PILOT` evidence

# EPF-12 Trial Persistence Activation and Deployment Config Closure

Date: 2026-03-09
Owner: Codex
Status: implemented

## Goal
Close the deployment blocker and activate one real persistence path for the B-end enterprise sandbox / shared trial workspace.

## Scope lock
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion
- no full enterprise auth rollout

## Delivered
- Activated a real Preview persistence backend using `AGENT_KERNEL_POSTGRES_URL`.
- Verified the deployed trial workspace now reports `SERVER_BACKED`.
- Verified continuity through the real deployed APIs for:
  - invite creation
  - invite acceptance
  - seat claim
  - session registration
  - trial task creation
  - seat release
- Kept sandbox/trial activity explicitly non-pilot throughout.

## Verification outcome
- `trial_workspace.persistence_state` now returns `SERVER_BACKED` on the live Preview deployment.
- Trial workspace activity survives across separate API calls with real backend persistence.

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Deferred
- Production-environment persistence activation
- Real pilot activation and `REAL_PILOT` evidence
- Full enterprise auth/account rollout
- Broader participant lifecycle and approval mechanics beyond the bounded trial workspace

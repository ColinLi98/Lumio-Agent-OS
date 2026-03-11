# Phase 3 Platform Hardening

Date: 2026-03-11

## Goal

Harden the existing B2B enterprise workspace shell without widening scope. This phase focuses on route/state correctness, fail-closed CTA behavior, browser-safe fallbacks, and clearer productized states.

## Hardening changes

### Route and state handling

- Local route parsing remains centralized in [services/platformContract.ts](/Users/lili/Desktop/Agent%20OS/services/platformContract.ts).
- Added route issue detection for:
  - malformed URL fallback
  - stale member focus
  - stale task focus
  - no-access current-workspace state
- Added local-shell fallback summary generation in [services/localRoleLabTaskStore.ts](/Users/lili/Desktop/Agent%20OS/services/localRoleLabTaskStore.ts) so the enterprise shell can still render on the local Vite server even when no API backend is attached.
- Hardened API payload parsing in [services/agentKernelShellApi.ts](/Users/lili/Desktop/Agent%20OS/services/agentKernelShellApi.ts) so invalid browser responses fail predictably instead of throwing nested property errors.

### Error boundaries and product states

- Added shared state UI in [components/PlatformStatePanel.tsx](/Users/lili/Desktop/Agent%20OS/components/PlatformStatePanel.tsx).
- Added shell/section error boundaries in [components/PlatformErrorBoundary.tsx](/Users/lili/Desktop/Agent%20OS/components/PlatformErrorBoundary.tsx).
- Standardized visible shell states for:
  - loading
  - empty
  - no access
  - stale link
  - malformed URL
  - runtime failure fallback

### CTA correctness

- Trial invite acceptance now disables until an invite code exists.
- Local role-lab task creation now disables when the requester brief is empty.
- Enterprise membership admin actions now disable when required inputs are empty.
- Current-workspace enterprise CTAs continue to fail closed through the existing capability guard path.

### Browser coverage

- Added [playwright-tests/enterprise-platform-hardening.spec.ts](/Users/lili/Desktop/Agent%20OS/playwright-tests/enterprise-platform-hardening.spec.ts) to cover:
  - nine-role visibility on the governed local-lab route
  - section navigation
  - role switching
  - member/task URL focus
  - disabled CTA behavior
- Fixed the legacy keyboard compatibility path in [App.tsx](/Users/lili/Desktop/Agent%20OS/App.tsx) so the existing IME smoke passes again.

### Diagnostics

- Added lightweight shell diagnostics in [services/platformShellDiagnostics.ts](/Users/lili/Desktop/Agent%20OS/services/platformShellDiagnostics.ts).
- Route warnings, stale-link corrections, blocked CTAs, load failures, and runtime-boundary failures now emit lightweight shell diagnostics without introducing a new telemetry stack.

## Key files

- [App.tsx](/Users/lili/Desktop/Agent%20OS/App.tsx)
- [components/EnterprisePlatformView.tsx](/Users/lili/Desktop/Agent%20OS/components/EnterprisePlatformView.tsx)
- [components/PlatformStatePanel.tsx](/Users/lili/Desktop/Agent%20OS/components/PlatformStatePanel.tsx)
- [components/PlatformErrorBoundary.tsx](/Users/lili/Desktop/Agent%20OS/components/PlatformErrorBoundary.tsx)
- [components/TrialJoinPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/TrialJoinPanel.tsx)
- [components/LocalRoleLabTaskComposer.tsx](/Users/lili/Desktop/Agent%20OS/components/LocalRoleLabTaskComposer.tsx)
- [components/EnterpriseMembershipAdminPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/EnterpriseMembershipAdminPanel.tsx)
- [components/RequesterInboxPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/RequesterInboxPanel.tsx)
- [components/TrialTaskDetailPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/TrialTaskDetailPanel.tsx)
- [services/platformContract.ts](/Users/lili/Desktop/Agent%20OS/services/platformContract.ts)
- [services/platformShellDiagnostics.ts](/Users/lili/Desktop/Agent%20OS/services/platformShellDiagnostics.ts)
- [services/localRoleLabTaskStore.ts](/Users/lili/Desktop/Agent%20OS/services/localRoleLabTaskStore.ts)
- [services/agentKernelShellApi.ts](/Users/lili/Desktop/Agent%20OS/services/agentKernelShellApi.ts)
- [tests/platformContract.test.ts](/Users/lili/Desktop/Agent%20OS/tests/platformContract.test.ts)
- [tests/components/GovernedFlowTaskPanel.test.ts](/Users/lili/Desktop/Agent%20OS/tests/components/GovernedFlowTaskPanel.test.ts)
- [tests/components/EnterprisePlatformView.test.ts](/Users/lili/Desktop/Agent%20OS/tests/components/EnterprisePlatformView.test.ts)
- [playwright-tests/enterprise-platform-hardening.spec.ts](/Users/lili/Desktop/Agent%20OS/playwright-tests/enterprise-platform-hardening.spec.ts)

## Validation

Validated with:

- `npm run typecheck`
- `npm run build`
- `npm run test:unit`
- `npm run test:e2e`

All passed on the local hardened baseline.

## Known non-blocking warnings

- Vite still reports large-chunk and browser-externalization warnings during build.
- DTOE benchmark tests still log the existing parallel-improvement warning.
- Playwright still logs the existing `NO_COLOR` / `FORCE_COLOR` warning from the Node process environment.

# B-End Platform Okta Auth Checklist

Date: 2026-03-10
Owner: Codex
Scope: B-end platform only

## Objective
Validate that the B-end platform’s Okta OIDC path behaves correctly under a real enterprise tenant.

## Required tenant inputs
- Okta issuer
- client id
- client secret
- default workspace id
- group-role mapping set

## Required smoke flow
1. Open the canonical B-end platform URL.
2. Trigger `Sign in with Okta`.
3. Complete redirect and callback.
4. Confirm a durable enterprise session appears in the platform.
5. Confirm `available_roles` reflects the configured group-role mapping.
6. Confirm `module_access` matches those roles.
7. Refresh the page and confirm session continuity.
8. Sign out and confirm enterprise writes are no longer available.

## Failure-path checks
- redirect mismatch shows a readable failure state
- missing/expired session collapses to signed-out state
- missing role binding does not expose unauthorized modules

## Acceptance
- Real tenant login succeeds end-to-end.
- Role mapping is visible and correct.
- Session expiry/sign-out behavior is understandable in-product.

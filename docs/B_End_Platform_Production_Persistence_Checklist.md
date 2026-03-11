# Lumio Production Persistence Checklist

Date: 2026-03-10
Owner: Codex
Scope: Lumio enterprise workspace platform preview

## Objective
Turn the existing production fail-closed persistence gate into a provable production-ready operating path for enterprise writes.

## Required configuration
- `NODE_ENV=production`
- `AGENT_KERNEL_STORE_DRIVER=postgres`
- `AGENT_KERNEL_POSTGRES_URL=<production postgres url>`

## Required smoke flow
1. Sign in with a valid enterprise session.
2. Verify session survives refresh.
3. Create one member invite.
4. Accept the invite from a second enterprise session.
5. Assign and remove one role.
6. Suspend and reactivate one member.
7. Verify Approval / Review / Audit center items survive refresh.
8. Verify audit export remains visible after refresh.

## Fail-closed expectations
- If `AGENT_KERNEL_POSTGRES_URL` is missing in production, enterprise writes must fail.
- The platform must not silently degrade to memory-only write success.
- The diagnostics surface must show write persistence as not ready.

## Acceptance
- Session continuity holds across refresh.
- Member lifecycle records hold across refresh.
- Center items hold across refresh.
- Production write path is explicitly blocked when Postgres is unavailable.

# B-End Platform Access Troubleshooting

Date: 2026-03-10
Owner: Codex
Scope: B-end platform only

## Common issues

### 1. Sign-in succeeded but no roles are visible
- Check Okta group-role mapping.
- Check whether the session’s tenant/workspace matches the target workspace.
- Check diagnostics panel for binding count and group-role mapping summary.

### 2. Member admin actions are missing
- Confirm the session has `TENANT_ADMIN` or `WORKSPACE_ADMIN`.
- Confirm you are in `workspace_mode=current`.
- Confirm enterprise writes are persistence-ready.

### 3. Review / approval actions fail
- Confirm the user’s bound role includes:
  - `APPROVER` for approval decisions
  - `REVIEWER` or approved reviewer scope for review decisions
  - `TENANT_ADMIN` for promotion-critical actions

### 4. Platform says enterprise writes are fail-closed
- This means production persistence is not ready.
- Check `AGENT_KERNEL_POSTGRES_URL` and driver configuration.

### 5. Session disappears after refresh
- Confirm the callback completed correctly.
- Check session expiry.
- Check whether sign-out or session revocation occurred.

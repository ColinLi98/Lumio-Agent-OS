import { describe, expect, it } from 'vitest';
import { buildEnterpriseDiagnosticsLines } from '../../components/EnterpriseDiagnosticsPanel';
import type { EnterpriseAccountShellSummary, ProductShellSummary } from '../../services/agentKernelShellApi';

describe('EnterpriseDiagnosticsPanel helpers', () => {
  it('builds signed-in diagnostics lines with persistence and mapping state', () => {
    const account: EnterpriseAccountShellSummary = {
      signed_in: true,
      summary: 'Signed in',
      role_badges: ['TENANT_ADMIN'],
      available_roles: ['TENANT_ADMIN'],
      pending_invites: [],
      active_bindings: [],
      module_access: [],
      diagnostics: {
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        store_driver: 'postgres',
        production_mode: true,
        write_persistence_ready: true,
        session_expires_at: 123456789,
        session_time_remaining_ms: 45000,
        binding_count: 3,
        group_count: 2,
        group_role_mapping_summary: ['TENANT_ADMIN via OIDC_LOGIN (tenant scope)'],
      },
    };

    const summary = {
      trial_workspace: {
        persistence_state: 'SERVER_BACKED',
        persistence_detail: 'Shared trial workspace is backed by Postgres.',
      },
    } as ProductShellSummary;

    const lines = buildEnterpriseDiagnosticsLines(account, summary, 'current');
    expect(lines).toContain('Provider: OKTA_OIDC');
    expect(lines).toContain('Store driver: postgres');
    expect(lines).toContain('Enterprise writes ready: yes');
    expect(lines).toContain('Trial persistence: SERVER_BACKED');
  });

  it('returns signed-out guidance when no diagnostics are available', () => {
    const lines = buildEnterpriseDiagnosticsLines(undefined, null, 'current');
    expect(lines[0]).toContain('Sign in with a real enterprise session');
  });
});

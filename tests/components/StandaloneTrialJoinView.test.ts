import { describe, expect, it } from 'vitest';
import {
  buildAcceptedRolePageHref,
  buildStandaloneTrialJoinHref,
  labActorIdForAcceptedRole,
  rolePageForAcceptedRole,
} from '../../components/StandaloneTrialJoinView';

describe('StandaloneTrialJoinView helpers', () => {
  it('builds standalone trial join hrefs', () => {
    expect(buildStandaloneTrialJoinHref()).toBe('/?surface=trial-join&workspace_mode=local_lab');
    expect(buildStandaloneTrialJoinHref('invite_code_123')).toBe('/?surface=trial-join&workspace_mode=local_lab&invite_code=invite_code_123');
  });

  it('maps accepted roles to platform pages and lab actors', () => {
    expect(rolePageForAcceptedRole('REQUESTER')).toBe('requester');
    expect(rolePageForAcceptedRole('OPERATOR')).toBe('operator');
    expect(rolePageForAcceptedRole('TENANT_ADMIN')).toBe('tenant_admin');
    expect(rolePageForAcceptedRole('APPROVER')).toBe('workspace');
    expect(labActorIdForAcceptedRole('REQUESTER')).toBe('local_requester_01');
    expect(labActorIdForAcceptedRole('OPERATOR')).toBe('local_operator_01');
    expect(labActorIdForAcceptedRole('TENANT_ADMIN')).toBe('local_tenant_admin_01');
  });

  it('builds accepted-role page hrefs', () => {
    expect(buildAcceptedRolePageHref('OPERATOR', 'invite_code_123')).toBe(
      '/?surface=platform&page=operator&workspace_mode=local_lab&lab_actor_id=local_operator_01&section=operations&oa_role=OPERATOR&invite_code=invite_code_123'
    );
    expect(buildAcceptedRolePageHref('TENANT_ADMIN')).toBe(
      '/?surface=platform&page=tenant_admin&workspace_mode=local_lab&lab_actor_id=local_tenant_admin_01&section=admin&oa_role=TENANT_ADMIN'
    );
    expect(buildAcceptedRolePageHref('APPROVER')).toBe(
      '/?surface=platform&page=workspace&workspace_mode=local_lab&lab_actor_id=local_tenant_admin_01&section=approval&oa_role=APPROVER'
    );
  });
});

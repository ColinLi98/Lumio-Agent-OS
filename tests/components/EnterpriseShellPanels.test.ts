import { describe, expect, it } from 'vitest';
import { buildEnvironmentTruthLines, environmentBadgeLabel } from '../../components/EnvironmentTruthBanner';
import { groupRequesterInboxItems } from '../../components/RequesterInboxPanel';
import { buildActivationPackageLines, buildLocalRoleLabLines, buildTenantAdminLines } from '../../components/TenantAdminSetupPanel';
import { buildPolicyStudioLines } from '../../components/PolicyStudioPanel';
import type {
  EnvironmentActivationSummary,
  PolicyStudioSummary,
  RequesterInboxItem,
  TenantAdminActivationSummary,
} from '../../services/agentKernelShellApi';

describe('enterprise shell panels', () => {
  it('shows simulator, demo, pilot, and production labels', () => {
    expect(environmentBadgeLabel('SIMULATOR')).toBe('SIMULATOR');
    expect(environmentBadgeLabel('DEMO')).toBe('DEMO');
    expect(environmentBadgeLabel('PILOT')).toBe('PILOT');
    expect(environmentBadgeLabel('PRODUCTION')).toBe('PRODUCTION');
  });

  it('builds visibility lines for missing operator and tenant admin readiness', () => {
    const summary: EnvironmentActivationSummary = {
      generated_at: 1,
      environment_kind: 'SIMULATOR',
      environment_label: 'Simulator workspace',
      workspace_binding_kind: 'UNBOUND',
      workspace_mode: 'current',
      pilot_activation_status: 'PILOT_BLOCKED',
      simulator_backing: true,
      demo_mode_enabled: true,
      workspace_options: [],
      missing_dependency_codes: ['operator_access_missing', 'tenant_admin_touchpoint_missing'],
      missing_dependency_summaries: ['Missing operator access', 'Missing tenant-admin touchpoint'],
      environment_binding: {
        state: 'BLOCKED',
        environment_kind: 'SIMULATOR',
        environment_label: 'Simulator workspace',
        base_url: 'https://lumio-b-end-platform.vercel.app',
        summary: 'Simulator binding cannot count as a real pilot environment.',
        source: 'SIMULATOR',
      },
      actor_availability: [],
      identity_readiness: {
        state: 'MISSING',
        summary: 'Identity not ready',
        issues: ['identity_not_ready'],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      connector_readiness: {
        state: 'MISSING',
        summary: 'Connector not ready',
        issues: ['connector_not_ready'],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      vault_readiness: {
        state: 'MISSING',
        summary: 'Vault / credential path not ready',
        issues: ['vault_not_ready'],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      connector_activation: {
        state: 'BLOCKED',
        connector_id: 'pilot_https_webhook',
        summary: 'Connector activation is blocked until real pilot binding and access exist.',
        source: 'LOCAL_SYNTHETIC',
      },
      activation_ready: false,
      activation_ready_summary: 'Pilot activation is blocked by environment binding and actor readiness.',
      is_demo_data: false,
      is_pilot_evidence: false,
    };

    const lines = buildEnvironmentTruthLines(summary);
    expect(lines.some((line) => line.includes('simulator-backed'))).toBe(true);
    expect(lines).toContain('Activation ready: no');
    expect(lines).toContain('Pilot activation is blocked by environment binding and actor readiness.');
    expect(lines).toContain('Simulator binding cannot count as a real pilot environment.');
    expect(lines).toContain('Missing operator access');
    expect(lines).toContain('Missing tenant-admin touchpoint');
  });

  it('groups requester inbox items and preserves demo labels', () => {
    const items: RequesterInboxItem[] = [
      {
        task_id: 'demo-1',
        goal: 'Demo task',
        task_status: 'DONE',
        group: 'COMPLETED',
        summary: 'Demo summary',
        actor_role: 'REQUESTER',
        actor_label: 'Demo requester',
        updated_at: 20,
        workspace_binding_kind: 'DEMO_WORKSPACE',
        environment_kind: 'DEMO',
        is_demo_data: true,
        is_pilot_evidence: false,
      },
      {
        task_id: 'live-1',
        goal: 'Live task',
        task_status: 'RUNNING',
        group: 'IN_PROGRESS',
        summary: 'Live summary',
        actor_role: 'OPERATOR',
        actor_label: 'Live operator',
        updated_at: 10,
        workspace_binding_kind: 'TENANT_WORKSPACE',
        environment_kind: 'PRODUCTION',
        is_demo_data: false,
        is_pilot_evidence: false,
      },
    ];

    const groups = groupRequesterInboxItems(items);
    expect(groups[0].key).toBe('IN_PROGRESS');
    expect(groups[1].key).toBe('COMPLETED');
    expect(groups[1].items[0].is_demo_data).toBe(true);
    expect(groups[1].items[0].is_pilot_evidence).toBe(false);
  });

  it('renders tenant admin activation setup lines', () => {
    const summary: TenantAdminActivationSummary = {
      status: 'BLOCKED',
      title: 'Tenant Admin Setup / Activation',
      summary: 'Environment is not ready for pilot activation.',
      detail_lines: ['Missing requester actor', 'Missing operator access', 'Missing tenant-admin touchpoint'],
      missing_dependency_codes: ['requester_actor_missing', 'operator_access_missing', 'tenant_admin_touchpoint_missing'],
      actor_availability: [],
      identity_readiness: {
        state: 'MISSING',
        summary: 'Identity not ready',
        issues: ['identity_not_ready'],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      connector_readiness: {
        state: 'MISSING',
        summary: 'Connector not ready',
        issues: ['connector_not_ready'],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      vault_readiness: {
        state: 'MISSING',
        summary: 'Vault / credential path not ready',
        issues: ['vault_not_ready'],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      is_demo_data: false,
      is_pilot_evidence: false,
    };

    const lines = buildTenantAdminLines(summary);
    expect(lines[0]).toContain('not ready for pilot activation');
    expect(lines).toContain('Missing operator access');
  });

  it('renders activation package verification progress lines', () => {
    const lines = buildActivationPackageLines({
      generated_at: 1,
      environment_activation: {} as any,
      requester_inbox: {} as any,
      tenant_admin_setup: {} as any,
      policy_studio: {} as any,
      local_role_lab: {
        enabled: false,
        label: 'Local role lab',
        summary: 'Lab',
        active_actor_id: 'local_tenant_admin_01',
        active_role: 'TENANT_ADMIN',
        day_zero_blocked_summary: 'Day 0 blocked',
        scenario: {
          scenario_id: 'advisor_handoff_rehearsal',
          title: 'Advisor workflow rehearsal',
          summary: 'Scenario',
          current_stage: 'Requester submits brief',
          focus_points: [],
        },
        handoff_timeline: [],
        evidence_classification_summary: 'Non-pilot',
        pilot_activation_gap_summary: 'Pilot gap',
        actors: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      demo: {
        enabled: false,
        label: 'Demo workspace',
        summary: 'Demo',
        seeded_scenarios: [],
        seeded_task_count: 0,
        is_demo_data: true,
        is_pilot_evidence: false,
      },
      activation_package: {
        package_id: 'pkg_1',
        status: 'VERIFICATION_PENDING',
        owner_type: 'PILOT_COMMANDER',
        owner_label: 'Pilot commander',
        summary: 'External activation package is waiting on verification.',
        pending_requirement_count: 2,
        rejected_intake_count: 1,
        recent_intakes: [
          {
            intake_id: 'intake_1',
            artifact_kind: 'REAL_EVIDENCE',
            source: 'REAL_PILOT',
            summary: 'Workflow artifact submitted',
            verification_status: 'VERIFIED',
            promoted_record_ids: [],
          },
        ],
      },
      activation_checklist: [],
      remaining_blockers: [],
      evidence_categories: [],
      next_action: 'Promote verified artifact',
    });

    expect(lines).toContain('Package status: verification pending');
    expect(lines).toContain('Owner: Pilot commander');
    expect(lines.some((line) => line.toLowerCase().includes('workflow artifact submitted'))).toBe(true);
  });

  it('renders local role lab lines and keeps them non-pilot', () => {
    const lines = buildLocalRoleLabLines({
      generated_at: 1,
      environment_activation: {} as any,
      requester_inbox: {} as any,
      tenant_admin_setup: {} as any,
      policy_studio: {} as any,
      local_role_lab: {
        enabled: true,
        label: 'Local role lab',
        summary: 'One human can rehearse requester, operator, and tenant-admin collaboration locally.',
        active_actor_id: 'local_tenant_admin_01',
        active_role: 'TENANT_ADMIN',
        day_zero_blocked_summary: 'True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.',
        scenario: {
          scenario_id: 'advisor_handoff_rehearsal',
          title: 'Advisor workflow rehearsal',
          summary: 'Walk one advisor workflow through requester submission, operator validation, and tenant-admin acknowledgement.',
          current_stage: 'Tenant admin reviews activation gap',
          focus_points: ['Keep active role visible'],
        },
        handoff_timeline: [
          {
            step_id: 'requester_to_operator',
            from_role: 'REQUESTER',
            to_role: 'OPERATOR',
            title: 'Requester submits brief',
            summary: 'handoff',
            status: 'COMPLETED',
          },
        ],
        evidence_classification_summary: 'All local role lab artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.',
        pilot_activation_gap_summary: 'A real pilot still needs a real environment binding.',
        actors: [
          {
            actor_id: 'local_requester_01',
            role: 'REQUESTER',
            actor_label: 'Local Requester',
            session_id: 'lab_sess_requester_01',
            summary: 'Requester rehearsal view',
            is_active: false,
            is_demo_data: false,
            is_pilot_evidence: false,
          },
          {
            actor_id: 'local_tenant_admin_01',
            role: 'TENANT_ADMIN',
            actor_label: 'Local Tenant Admin',
            session_id: 'lab_sess_tenant_admin_01',
            summary: 'Admin rehearsal view',
            is_active: true,
            is_demo_data: false,
            is_pilot_evidence: false,
          },
        ],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      demo: {
        enabled: false,
        label: 'Demo workspace',
        summary: 'Demo',
        seeded_scenarios: [],
        seeded_task_count: 0,
        is_demo_data: true,
        is_pilot_evidence: false,
      },
      activation_package: {
        package_id: 'pkg_1',
        status: 'IN_PROGRESS',
        owner_type: 'PILOT_COMMANDER',
        owner_label: 'Pilot commander',
        summary: 'Package in progress',
        pending_requirement_count: 1,
        rejected_intake_count: 0,
        recent_intakes: [],
      },
      activation_checklist: [],
      remaining_blockers: [],
      evidence_categories: [],
      next_action: 'Switch actors',
    });

    expect(lines.some((line) => line.includes('Local role lab'))).toBe(true);
    expect(lines).toContain('Active actor: Local Tenant Admin');
    expect(lines.some((line) => line.includes('True pilot Day 0 is blocked'))).toBe(true);
  });

  it('renders policy studio summary lines', () => {
    const summary: PolicyStudioSummary = {
      generated_at: 1,
      pack_name: 'Agent OS Policy Pack',
      pack_version: 'runtime-v1',
      pack_fingerprint: 'abc123',
      override_count: 0,
      summary: 'Policy Studio v1 exposes the active policy pack.',
      rollout_summary: 'read only',
      simulation_summary: 'summary only',
      approval_governance_summary: 'governed',
      detail_lines: ['Policy pack: Agent OS runtime policy', 'Overrides: use the guided role policy editor'],
      is_demo_data: false,
      is_pilot_evidence: false,
    };

    const lines = buildPolicyStudioLines(summary);
    expect(lines[0]).toContain('Policy Studio v1');
    expect(lines).toContain('Overrides: use the guided role policy editor');
  });
});

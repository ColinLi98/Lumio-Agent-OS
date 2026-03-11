import { describe, expect, it } from 'vitest';
import type { ProductShellSummary } from '../services/agentKernelShellApi';
import {
  buildPlatformCapabilityDecisions,
  buildPlatformRouteIssues,
  buildPlatformSectionHref,
  buildPlatformWorkspaceContext,
  parsePlatformRouteSearch,
  resolvePlatformFocusedMemberId,
  resolvePlatformTrialTaskId,
} from '../services/platformContract';

function currentWorkspaceSummary(overrides: Partial<ProductShellSummary> = {}): ProductShellSummary {
  return {
    generated_at: 1,
    environment_activation: {
      generated_at: 1,
      environment_kind: 'PRODUCTION',
      environment_label: 'Current workspace',
      workspace_binding_kind: 'TENANT_WORKSPACE',
      workspace_mode: 'current',
      pilot_activation_status: 'PILOT_BLOCKED',
      simulator_backing: false,
      demo_mode_enabled: false,
      workspace_options: [],
      missing_dependency_codes: [],
      missing_dependency_summaries: [],
      environment_binding: {
        state: 'BOUND',
        environment_kind: 'PRODUCTION',
        environment_label: 'Current workspace',
        tenant_id: 'tenant_1',
        workspace_id: 'workspace_1',
        summary: 'Current workspace binding is present.',
        source: 'REAL_PILOT',
      },
      actor_availability: [
        {
          role: 'REQUESTER',
          state: 'READY',
          provisioning_state: 'PROVISIONED',
          access_state: 'GRANTED',
          actor_id: 'principal_requester',
          actor_label: 'Requester One',
          summary: 'Requester is ready.',
          is_demo_data: false,
          is_pilot_evidence: true,
        },
        {
          role: 'OPERATOR',
          state: 'READY',
          provisioning_state: 'PROVISIONED',
          access_state: 'GRANTED',
          actor_id: 'principal_operator',
          actor_label: 'Operator One',
          summary: 'Operator is ready.',
          is_demo_data: false,
          is_pilot_evidence: true,
        },
      ],
      identity_readiness: {
        state: 'READY',
        summary: 'Identity ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: true,
      },
      connector_readiness: {
        state: 'READY',
        summary: 'Connector ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: true,
      },
      vault_readiness: {
        state: 'READY',
        summary: 'Vault ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: true,
      },
      connector_activation: {
        state: 'ELIGIBLE',
        connector_id: 'okta_oidc_workspace',
        summary: 'Connector eligible.',
        source: 'REAL_PILOT',
      },
      activation_ready: false,
      activation_ready_summary: 'Pilot activation is blocked by evidence and review posture.',
      is_demo_data: false,
      is_pilot_evidence: true,
    },
    enterprise_account: {
      signed_in: true,
      summary: 'Current workspace session.',
      role_badges: ['WORKSPACE_ADMIN', 'APPROVER', 'REVIEWER'],
      available_roles: ['WORKSPACE_ADMIN', 'APPROVER', 'REVIEWER'],
      pending_invites: [],
      active_bindings: [],
      module_access: [],
      diagnostics: {
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_1',
        workspace_id: 'workspace_1',
        store_driver: 'postgres',
        production_mode: true,
        write_persistence_ready: true,
        session_expires_at: 1000,
        session_time_remaining_ms: 500,
        binding_count: 3,
        group_count: 2,
        group_role_mapping_summary: [],
      },
    },
    enterprise_membership: {
      generated_at: 1,
      tenant_id: 'tenant_1',
      workspace_id: 'workspace_1',
      member_count: 1,
      invite_count: 1,
      members: [
        {
          principal_id: 'principal_requester',
          email: 'requester@example.com',
          display_name: 'Requester One',
          status: 'ACTIVE',
          tenant_id: 'tenant_1',
          workspace_ids: ['workspace_1'],
          role_assignments: [],
        },
      ],
      invites: [
        {
          invite_id: 'invite_1',
          tenant_id: 'tenant_1',
          workspace_id: 'workspace_1',
          email: 'invitee@example.com',
          role: 'REQUESTER',
          invite_token: 'token_1',
          invited_by_principal_id: 'principal_admin',
          invited_by_label: 'Workspace Admin',
          status: 'OPEN',
          created_at: 1,
          updated_at: 2,
        },
      ],
    },
    requester_inbox: {
      generated_at: 1,
      total_count: 2,
      in_progress_count: 1,
      blocked_count: 1,
      waiting_count: 0,
      completed_count: 0,
      items: [
        {
          task_id: 'task_current_1',
          goal: 'Current task one',
          task_status: 'IN_PROGRESS',
          group: 'IN_PROGRESS',
          summary: 'Task one summary.',
          actor_role: 'REQUESTER',
          updated_at: 1,
          workspace_binding_kind: 'TENANT_WORKSPACE',
          environment_kind: 'PRODUCTION',
          is_demo_data: false,
          is_pilot_evidence: true,
        },
        {
          task_id: 'task_current_2',
          goal: 'Current task two',
          task_status: 'BLOCKED',
          group: 'BLOCKED',
          summary: 'Task two summary.',
          blocker_summary: 'Waiting on approval.',
          actor_role: 'REQUESTER',
          updated_at: 2,
          workspace_binding_kind: 'TENANT_WORKSPACE',
          environment_kind: 'PRODUCTION',
          is_demo_data: false,
          is_pilot_evidence: true,
        },
      ],
    },
    tenant_admin_setup: {
      status: 'BLOCKED',
      title: 'Tenant admin setup',
      summary: 'Setup still blocked by review.',
      detail_lines: ['Review evidence is missing.'],
      missing_dependency_codes: ['review_evidence_missing'],
      actor_availability: [],
      identity_readiness: {
        state: 'READY',
        summary: 'Identity ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: true,
      },
      connector_readiness: {
        state: 'READY',
        summary: 'Connector ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: true,
      },
      vault_readiness: {
        state: 'READY',
        summary: 'Vault ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: true,
      },
      is_demo_data: false,
      is_pilot_evidence: true,
    },
    policy_studio: {
      generated_at: 1,
      pack_name: 'Agent OS Policy Pack',
      pack_version: '2026.03',
      pack_fingerprint: 'fp_123',
      override_count: 0,
      summary: 'Current policy pack is active.',
      rollout_summary: 'Rollout remains bounded.',
      simulation_summary: 'Simulation not requested.',
      approval_governance_summary: 'Approval requires bounded review evidence.',
      detail_lines: ['Policy basis is visible in current workspace.'],
      is_demo_data: false,
      is_pilot_evidence: true,
    },
    local_role_lab: {
      enabled: true,
      label: 'Local role lab',
      summary: 'Local lab',
      active_actor_id: 'local_operator_01',
      active_role: 'OPERATOR',
      day_zero_blocked_summary: 'Local lab only.',
      scenario: {
        scenario_id: 'scenario',
        title: 'Scenario',
        summary: 'Scenario summary.',
        current_stage: 'Review',
        focus_points: [],
      },
      handoff_timeline: [],
      evidence_classification_summary: 'Local only.',
      pilot_activation_gap_summary: 'Gap.',
      actors: [],
      is_demo_data: false,
      is_pilot_evidence: false,
    },
    demo: {
      enabled: false,
      label: 'Demo',
      summary: 'Demo',
      seeded_scenarios: [],
      seeded_task_count: 0,
      is_demo_data: true,
      is_pilot_evidence: false,
    },
    activation_package: {
      package_id: 'pkg_1',
      status: 'BLOCKED',
      owner_type: 'PILOT_COMMANDER',
      owner_label: 'Pilot commander',
      summary: 'Activation package blocked.',
      pending_requirement_count: 1,
      rejected_intake_count: 0,
      recent_intakes: [],
    },
    activation_checklist: [],
    remaining_blockers: [
      {
        code: 'review_evidence_missing',
        owner_label: 'Approver',
        summary: 'Review evidence missing',
        missing_artifact: 'Review evidence',
        next_action: 'Provide review evidence.',
      },
    ],
    evidence_categories: [],
    trial_workspace: {
      trial_workspace: {
        trial_workspace_id: 'trial_1',
        workspace_key: 'current:tenant_1:workspace_1',
        label: 'Current workspace flow support',
        summary: 'Current workspace task focus.',
        status: 'ACTIVE',
        active_template_id: 'oa_full_cycle_governed_execution',
        created_at: 1,
        updated_at: 1,
      },
      seats: [],
      participants: [],
      invites: [],
      sessions: [],
      activities: [
        {
          activity_id: 'activity_1',
          trial_workspace_id: 'trial_1',
          oa_role: 'APPROVER',
          summary: 'Approver review is pending.',
          task_id: 'task_current_2',
          created_at: 2,
        },
      ],
      tasks: [
        {
          task_id: 'task_current_1',
          trial_workspace_id: 'trial_1',
          created_by_participant_id: 'participant_requester',
          scenario_id: 'oa_full_cycle_governed_execution',
          scenario_title: 'Scenario',
          scenario_summary: 'Scenario',
          requester_brief: 'Brief',
          client_name: 'Acme One',
          jurisdiction: 'UK',
          priority: 'HIGH',
          required_outcome: 'Outcome',
          external_handoff_guard: 'Guard',
          missing_data_policy: 'Policy',
          missing_fields: ['review_evidence'],
          operator_review_required: true,
          compliance_review_requested: true,
          connector_requested: true,
          lifecycle: 'TENANT_ADMIN_REVIEW',
          receipt_summary: 'Receipt one.',
          created_at: 1,
          updated_at: 1,
        },
        {
          task_id: 'task_current_2',
          trial_workspace_id: 'trial_1',
          created_by_participant_id: 'participant_requester',
          scenario_id: 'oa_full_cycle_governed_execution',
          scenario_title: 'Scenario',
          scenario_summary: 'Scenario',
          requester_brief: 'Brief',
          client_name: 'Acme Two',
          jurisdiction: 'UK',
          priority: 'HIGH',
          required_outcome: 'Outcome',
          external_handoff_guard: 'Guard',
          missing_data_policy: 'Policy',
          missing_fields: ['approval_scope'],
          operator_review_required: true,
          compliance_review_requested: true,
          connector_requested: true,
          lifecycle: 'TENANT_ADMIN_REVIEW',
          receipt_summary: 'Receipt two.',
          created_at: 2,
          updated_at: 2,
        },
      ],
      active_task_detail: {
        task_id: 'task_current_2',
        title: 'Scenario · Acme Two',
        lifecycle: 'TENANT_ADMIN_REVIEW',
        receipt_summary: 'Receipt two.',
        missing_fields: ['approval_scope'],
        handoff_lines: ['Approver review pending'],
        approval_summary: 'Guard',
      },
      persistence_state: 'SERVER_BACKED',
      persistence_detail: 'Server backed.',
      join_instructions: [],
      conversion_guidance_lines: [],
    },
    next_action: 'Keep current-workspace reliability explicit.',
    ...overrides,
  } as ProductShellSummary;
}

describe('current workspace reliability', () => {
  it('covers the current-workspace smoke matrix for route entry and navigation continuity', () => {
    const matrix = [
      {
        label: 'role entry',
        route: parsePlatformRouteSearch('?workspace_mode=current&page=workspace&section=approval&oa_role=APPROVER'),
        expected: { page: 'workspace', section: 'approval', oaRole: 'APPROVER' },
      },
      {
        label: 'member focus',
        route: parsePlatformRouteSearch('?workspace_mode=current&page=workspace&section=members&member=principal_requester&oa_role=WORKSPACE_ADMIN'),
        expected: { page: 'workspace', section: 'members', memberId: 'principal_requester' },
      },
      {
        label: 'task focus',
        route: parsePlatformRouteSearch('?workspace_mode=current&page=workspace&section=requests&trial_task=task_current_2&oa_role=APPROVER'),
        expected: { page: 'workspace', section: 'requests', trialTaskId: 'task_current_2' },
      },
    ] as const;

    for (const item of matrix) {
      expect(item.route.workspaceMode).toBe('current');
      expect(item.route.page).toBe(item.expected.page);
      expect(item.route.section).toBe(item.expected.section);
      if ('oaRole' in item.expected) expect(item.route.oaRole).toBe(item.expected.oaRole);
      if ('memberId' in item.expected) expect(item.route.memberId).toBe(item.expected.memberId);
      if ('trialTaskId' in item.expected) expect(item.route.trialTaskId).toBe(item.expected.trialTaskId);
    }

    const href = buildPlatformSectionHref({
      currentPage: 'workspace',
      workspaceMode: 'current',
      section: 'audit',
      memberId: 'principal_requester',
      trialTaskId: 'task_current_2',
      oaRole: 'AUDITOR',
    });
    expect(href).toContain('workspace_mode=current');
    expect(href).toContain('section=audit');
    expect(href).toContain('member=principal_requester');
    expect(href).toContain('trial_task=task_current_2');
    expect(href).toContain('oa_role=AUDITOR');
  });

  it('warns on unsupported current-workspace deep-link params and degrades stale focus safely', () => {
    const route = parsePlatformRouteSearch('?workspace_mode=current&page=workspace&section=join&lab_actor_id=local_operator_01&invite_code=trial_join_code&member=missing_member&trial_task=missing_task');
    expect(route.warnings).toContain('lab_actor_id ignored outside local_lab');
    expect(route.warnings).toContain('invite_code ignored outside local_lab');

    const summary = currentWorkspaceSummary();
    const resolvedMember = resolvePlatformFocusedMemberId(summary, 'current', 'workspace', 'missing_member');
    const resolvedTask = resolvePlatformTrialTaskId(summary, 'missing_task');
    const issues = buildPlatformRouteIssues({
      warnings: route.warnings,
      requestedMemberId: 'missing_member',
      resolvedMemberId: resolvedMember,
      requestedTaskId: 'missing_task',
      resolvedTaskId: resolvedTask,
      context: buildPlatformWorkspaceContext({
        summary,
        workspaceMode: 'current',
        page: 'workspace',
        section: route.section,
        oaRole: 'WORKSPACE_ADMIN',
      }),
    });
    expect(issues.some((issue) => issue.kind === 'MALFORMED_URL')).toBe(true);
    expect(issues.some((issue) => issue.kind === 'STALE_LINK' && issue.title.includes('member'))).toBe(true);
    expect(issues.some((issue) => issue.kind === 'STALE_LINK' && issue.title.includes('task'))).toBe(true);
  });

  it('covers allowed, blocked, denied, fail-closed, and no-access CTA paths in current workspace', () => {
    const summary = currentWorkspaceSummary();

    const allowed = buildPlatformCapabilityDecisions(buildPlatformWorkspaceContext({
      summary,
      workspaceMode: 'current',
      page: 'workspace',
      section: 'approval',
      oaRole: 'APPROVER',
    }));
    expect(allowed.APPROVAL_DECISION.enabled).toBe(true);

    const blocked = buildPlatformCapabilityDecisions(buildPlatformWorkspaceContext({
      summary: currentWorkspaceSummary({
        enterprise_account: {
          ...summary.enterprise_account!,
          signed_in: false,
          diagnostics: undefined,
          available_roles: [],
          role_badges: [],
        },
      }),
      workspaceMode: 'current',
      page: 'workspace',
      section: 'members',
      oaRole: 'WORKSPACE_ADMIN',
      enterpriseInviteToken: 'invite_token_1',
    }));
    expect(blocked.ENTERPRISE_INVITE_ACCEPT.enabled).toBe(false);
    expect(blocked.ENTERPRISE_INVITE_ACCEPT.reason).toContain('Sign in with Okta OIDC');

    const denied = buildPlatformCapabilityDecisions(buildPlatformWorkspaceContext({
      summary,
      workspaceMode: 'current',
      page: 'workspace',
      section: 'members',
      oaRole: 'REQUESTER',
    }));
    expect(denied.ENTERPRISE_MEMBERSHIP_WRITE.enabled).toBe(false);
    expect(denied.ENTERPRISE_MEMBERSHIP_WRITE.reason).toContain('Select TENANT_ADMIN or WORKSPACE_ADMIN');

    const failClosed = buildPlatformCapabilityDecisions(buildPlatformWorkspaceContext({
      summary: currentWorkspaceSummary({
        enterprise_account: {
          ...summary.enterprise_account!,
          diagnostics: {
            ...summary.enterprise_account!.diagnostics!,
            write_persistence_ready: false,
          },
        },
      }),
      workspaceMode: 'current',
      page: 'workspace',
      section: 'members',
      oaRole: 'WORKSPACE_ADMIN',
    }));
    expect(failClosed.ENTERPRISE_MEMBERSHIP_WRITE.enabled).toBe(false);
    expect(failClosed.ENTERPRISE_MEMBERSHIP_WRITE.reason).toContain('fail-closed');

    const noAccessContext = buildPlatformWorkspaceContext({
      summary: currentWorkspaceSummary({
        enterprise_account: {
          ...summary.enterprise_account!,
          signed_in: false,
          diagnostics: undefined,
          available_roles: [],
          role_badges: [],
        },
      }),
      workspaceMode: 'current',
      page: 'workspace',
      section: 'overview',
      oaRole: 'WORKSPACE_ADMIN',
    });
    const noAccessIssues = buildPlatformRouteIssues({
      warnings: [],
      context: noAccessContext,
    });
    expect(noAccessIssues.some((issue) => issue.kind === 'NO_ACCESS')).toBe(true);
  });
});

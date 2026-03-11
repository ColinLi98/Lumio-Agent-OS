import { describe, expect, it } from 'vitest';
import type { ProductShellSummary } from '../services/agentKernelShellApi';
import {
  buildPlatformAuditSurface,
  buildPlatformCapabilityDecisions,
  buildPlatformGovernedFlowState,
  buildPlatformOktaReadinessSurface,
  buildPlatformPolicySurface,
  buildPlatformSectionHref,
  buildPlatformTaskLifecycleEntity,
  buildPlatformWorkspaceGovernanceSurface,
  buildPlatformWorkspaceContext,
  normalizeOaRole,
  parsePlatformRouteSearch,
  resolvePlatformFocusedMemberId,
  resolvePlatformTrialTaskId,
} from '../services/platformContract';

function makeSummary(overrides: Partial<ProductShellSummary> = {}): ProductShellSummary {
  return {
    generated_at: 1,
    environment_activation: {
      generated_at: 1,
      environment_kind: 'SIMULATOR',
      environment_label: 'Local role lab',
      workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
      workspace_mode: 'local_lab',
      pilot_activation_status: 'NOT_APPLICABLE',
      simulator_backing: true,
      demo_mode_enabled: false,
      workspace_options: [],
      missing_dependency_codes: [],
      missing_dependency_summaries: [],
      environment_binding: {
        state: 'BOUND',
        environment_kind: 'SIMULATOR',
        environment_label: 'Local role lab',
        summary: 'Bound local-lab workspace.',
        source: 'LOCAL_SYNTHETIC',
      },
      actor_availability: [
        {
          role: 'REQUESTER',
          state: 'READY',
          provisioning_state: 'PROVISIONED',
          access_state: 'GRANTED',
          actor_id: 'principal_requester',
          actor_label: 'Requester One',
          summary: 'Requester seat available.',
          is_demo_data: false,
          is_pilot_evidence: false,
        },
      ],
      identity_readiness: {
        state: 'READY',
        summary: 'Identity ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      connector_readiness: {
        state: 'READY',
        summary: 'Connector ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      vault_readiness: {
        state: 'READY',
        summary: 'Vault ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      connector_activation: {
        state: 'ELIGIBLE',
        summary: 'Connector eligible.',
        source: 'LOCAL_SYNTHETIC',
      },
      activation_ready: false,
      activation_ready_summary: 'Activation remains gated.',
      is_demo_data: false,
      is_pilot_evidence: false,
    },
    enterprise_account: {
      signed_in: false,
      role_badges: [],
      available_roles: [],
      module_access: [],
      active_bindings: [],
      pending_invites: [],
      summary: 'No current session.',
    },
    requester_inbox: {
      generated_at: 1,
      total_count: 1,
      in_progress_count: 1,
      blocked_count: 0,
      waiting_count: 0,
      completed_count: 0,
      items: [
        {
          task_id: 'task_1',
          goal: 'Prepare client packet',
          task_status: 'IN_PROGRESS',
          group: 'IN_PROGRESS',
          summary: 'Requester is preparing the package.',
          actor_role: 'REQUESTER',
          updated_at: 1,
          workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
          environment_kind: 'SIMULATOR',
          is_demo_data: false,
          is_pilot_evidence: false,
        },
      ],
    },
    tenant_admin_setup: {
      status: 'READY',
      title: 'Tenant setup',
      summary: 'Tenant setup ready.',
      detail_lines: [],
      missing_dependency_codes: [],
      actor_availability: [],
      identity_readiness: {
        state: 'READY',
        summary: 'Identity ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      connector_readiness: {
        state: 'READY',
        summary: 'Connector ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      vault_readiness: {
        state: 'READY',
        summary: 'Vault ready.',
        issues: [],
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      is_demo_data: false,
      is_pilot_evidence: false,
    },
    policy_studio: {
      generated_at: 1,
      pack_name: 'Pack',
      pack_version: '1',
      pack_fingerprint: 'fingerprint',
      override_count: 0,
      summary: 'Policy pack summary.',
      rollout_summary: 'Rollout summary.',
      simulation_summary: 'Simulation summary.',
      approval_governance_summary: 'Approval summary.',
      detail_lines: [],
      is_demo_data: false,
      is_pilot_evidence: false,
    },
    local_role_lab: {
      enabled: true,
      label: 'Local role lab',
      summary: 'Local lab summary.',
      active_actor_id: 'local_operator_01',
      active_role: 'OPERATOR',
      day_zero_blocked_summary: 'Local lab only.',
      scenario: {
        scenario_id: 'scenario_1',
        title: 'Scenario',
        summary: 'Scenario summary.',
        current_stage: 'Operator review',
        focus_points: [],
      },
      handoff_timeline: [
        {
          step_id: 'handoff_1',
          from_role: 'REQUESTER',
          to_role: 'OPERATOR',
          title: 'Requester submits brief',
          summary: 'Operator receives the request.',
          status: 'COMPLETED',
        },
      ],
      evidence_classification_summary: 'Local role lab evidence stays non-pilot.',
      pilot_activation_gap_summary: 'Real pilot inputs still missing.',
      actors: [
        {
          actor_id: 'local_requester_01',
          role: 'REQUESTER',
          actor_label: 'Local Requester',
          session_id: 'session_requester',
          summary: 'Requester view',
          is_active: false,
          is_demo_data: false,
          is_pilot_evidence: false,
        },
        {
          actor_id: 'local_operator_01',
          role: 'OPERATOR',
          actor_label: 'Local Operator',
          session_id: 'session_operator',
          summary: 'Operator view',
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
      label: 'Demo',
      summary: 'Demo summary.',
      seeded_scenarios: [],
      seeded_task_count: 0,
      is_demo_data: true,
      is_pilot_evidence: false,
    },
    activation_package: {
      package_id: 'package_1',
      status: 'BLOCKED',
      owner_type: 'PILOT_COMMANDER',
      owner_label: 'Pilot commander',
      summary: 'Activation package blocked.',
      pending_requirement_count: 1,
      rejected_intake_count: 0,
      recent_intakes: [],
    },
    activation_checklist: [],
    remaining_blockers: [],
    evidence_categories: [],
    trial_workspace: {
      trial_workspace: {
        trial_workspace_id: 'trial_1',
        workspace_key: 'workspace',
        label: 'Trial workspace',
        summary: 'Shared trial workspace.',
        status: 'ACTIVE',
        active_template_id: 'oa_full_cycle_governed_execution',
        created_at: 1,
        updated_at: 1,
      },
      seats: [
        {
          seat_id: 'seat_requester',
          trial_workspace_id: 'trial_1',
          role: 'REQUESTER',
          label: 'Requester Seat',
          summary: 'Requester lane',
          claim_status: 'CLAIMED',
          assigned_participant_id: 'participant_requester',
          created_at: 1,
          updated_at: 1,
        },
        {
          seat_id: 'seat_operator',
          trial_workspace_id: 'trial_1',
          role: 'OPERATOR',
          label: 'Operator Seat',
          summary: 'Operator lane',
          claim_status: 'ASSIGNED_BASE',
          created_at: 1,
          updated_at: 1,
        },
      ],
      participants: [
        {
          participant_id: 'participant_requester',
          trial_workspace_id: 'trial_1',
          seat_id: 'seat_requester',
          oa_role: 'REQUESTER',
          actor_label: 'Requester Seat',
          summary: 'Requester seat claimed.',
          state: 'ACTIVE',
          created_at: 1,
          updated_at: 1,
        },
      ],
      invites: [
        {
          invite_id: 'invite_1',
          trial_workspace_id: 'trial_1',
          seat_id: 'seat_requester',
          oa_role: 'REQUESTER',
          invite_code: 'invite_code_1',
          label: 'Requester invite',
          status: 'OPEN',
          created_at: 1,
          updated_at: 1,
        },
      ],
      sessions: [
        {
          session_id: 'session_requester',
          trial_workspace_id: 'trial_1',
          participant_id: 'participant_requester',
          oa_role: 'REQUESTER',
          current_page: 'requester',
          current_section: 'requests',
          created_at: 1,
          last_seen_at: 1,
        },
      ],
      activities: [
        {
          activity_id: 'activity_1',
          trial_workspace_id: 'trial_1',
          oa_role: 'REQUESTER',
          summary: 'Requester created packet.',
          task_id: 'task_1',
          created_at: 1,
        },
      ],
      tasks: [
        {
          task_id: 'task_1',
          trial_workspace_id: 'trial_1',
          created_by_participant_id: 'participant_requester',
          scenario_id: 'scenario_1',
          scenario_title: 'Scenario',
          scenario_summary: 'Scenario summary.',
          requester_brief: 'Prepare packet',
          client_name: 'Acme',
          jurisdiction: 'UK',
          priority: 'HIGH',
          required_outcome: 'Packet',
          external_handoff_guard: 'Blocked until approval.',
          missing_data_policy: 'Collect missing fields.',
          missing_fields: ['nda'],
          operator_review_required: true,
          compliance_review_requested: true,
          connector_requested: false,
          lifecycle: 'OPERATOR_REVIEW',
          receipt_summary: 'Receipt summary.',
          created_at: 1,
          updated_at: 1,
        },
      ],
      persistence_state: 'MEMORY_ONLY',
      persistence_detail: 'Memory only.',
      join_instructions: ['Join through invite.'],
      conversion_guidance_lines: ['Trial only.'],
    },
    next_action: 'Continue the workflow.',
    ...overrides,
  } as ProductShellSummary;
}

describe('platform contract', () => {
  it('normalizes oa_role from frozen and legacy role fields', () => {
    expect(normalizeOaRole('policy governance admin')).toBe('POLICY_GOVERNANCE_ADMIN');
    expect(normalizeOaRole({ oa_role: 'APPROVER' })).toBe('APPROVER');
    expect(normalizeOaRole({ actor_role: 'OPERATOR' })).toBe('OPERATOR');
    expect(normalizeOaRole({ role: 'workspace admin' })).toBe('WORKSPACE_ADMIN');
    expect(normalizeOaRole('unknown_role')).toBeNull();
  });

  it('parses deep links and falls back closed for invalid role and section values', () => {
    const route = parsePlatformRouteSearch('?workspace_mode=current&page=requester&section=policy&oa_role=unknown&member=principal_requester&trial_task=task_1&invite_code=invite_1');
    expect(route.workspaceMode).toBe('current');
    expect(route.page).toBe('requester');
    expect(route.section).toBe('requests');
    expect(route.oaRole).toBe('REQUESTER');
    expect(route.memberId).toBe('principal_requester');
    expect(route.trialTaskId).toBe('task_1');
    expect(route.inviteCode).toBe('invite_1');
    expect(route.warnings).toContain('section fallback applied');
    expect(route.warnings).toContain('oa_role fallback applied');
  });

  it('restores member and trial task focus from normalized URL state', () => {
    const summary = makeSummary();
    expect(resolvePlatformFocusedMemberId(summary, 'local_lab', 'workspace', 'requester', 'local_tenant_admin_01')).toBe('requester');
    expect(resolvePlatformFocusedMemberId(summary, 'local_lab', 'operator', 'missing', 'local_tenant_admin_01')).toBe('operator');
    expect(resolvePlatformTrialTaskId(summary, 'missing_task')).toBe('task_1');
  });

  it('fails membership and approval writes closed when the active oa_role or persistence is not eligible', () => {
    const currentSummary = makeSummary({
      environment_activation: {
        ...makeSummary().environment_activation,
        workspace_mode: 'current',
        environment_kind: 'PRODUCTION',
        environment_label: 'Current workspace',
        workspace_binding_kind: 'TENANT_WORKSPACE',
      },
      enterprise_account: {
        signed_in: true,
        role_badges: ['REQUESTER', 'WORKSPACE_ADMIN'],
        available_roles: ['REQUESTER', 'WORKSPACE_ADMIN'],
        module_access: [],
        active_bindings: [],
        pending_invites: [],
        diagnostics: {
          provider: 'OKTA_OIDC',
          tenant_id: 'tenant_1',
          workspace_id: 'workspace_1',
          store_driver: 'postgres',
          production_mode: true,
          write_persistence_ready: false,
          session_expires_at: 10,
          session_time_remaining_ms: 10,
          binding_count: 2,
          group_count: 2,
          group_role_mapping_summary: [],
        },
        summary: 'Current workspace session.',
      },
    });

    const requesterContext = buildPlatformWorkspaceContext({
      summary: currentSummary,
      workspaceMode: 'current',
      page: 'workspace',
      section: 'members',
      oaRole: 'REQUESTER',
    });
    const requesterDecisions = buildPlatformCapabilityDecisions(requesterContext);
    expect(requesterDecisions.ENTERPRISE_MEMBERSHIP_WRITE.enabled).toBe(false);
    expect(requesterDecisions.ENTERPRISE_MEMBERSHIP_WRITE.reason).toContain('fail-closed');

    const adminReadySummary = makeSummary({
      environment_activation: {
        ...currentSummary.environment_activation,
      },
      enterprise_account: {
        ...currentSummary.enterprise_account,
        role_badges: ['WORKSPACE_ADMIN'],
        available_roles: ['WORKSPACE_ADMIN'],
        diagnostics: {
          ...currentSummary.enterprise_account!.diagnostics!,
          write_persistence_ready: true,
        },
      },
    });

    const adminContext = buildPlatformWorkspaceContext({
      summary: adminReadySummary,
      workspaceMode: 'current',
      page: 'workspace',
      section: 'members',
      oaRole: 'WORKSPACE_ADMIN',
    });
    const adminDecisions = buildPlatformCapabilityDecisions(adminContext);
    expect(adminDecisions.ENTERPRISE_MEMBERSHIP_WRITE.enabled).toBe(true);
    expect(adminDecisions.APPROVAL_DECISION.enabled).toBe(false);

    const approverSummary = makeSummary({
      environment_activation: {
        ...currentSummary.environment_activation,
      },
      enterprise_account: {
        ...currentSummary.enterprise_account,
        role_badges: ['APPROVER'],
        available_roles: ['APPROVER'],
        diagnostics: {
          ...currentSummary.enterprise_account!.diagnostics!,
          write_persistence_ready: true,
        },
      },
    });

    const approverContext = buildPlatformWorkspaceContext({
      summary: approverSummary,
      workspaceMode: 'current',
      page: 'workspace',
      section: 'approval',
      oaRole: 'APPROVER',
    });
    expect(buildPlatformCapabilityDecisions(approverContext).APPROVAL_DECISION.enabled).toBe(true);
  });

  it('normalizes task timeline receipts around the selected trial task', () => {
    const summary = makeSummary();
    const task = buildPlatformTaskLifecycleEntity(summary, 'task_1');
    expect(task?.taskId).toBe('task_1');
    expect(task?.timeline[0]?.oaRole).toBe('REQUESTER');
    expect(task?.nextAction).toContain('nda');
  });

  it('maps the governed flow into the shared request-to-audit stage chain', () => {
    const flow = buildPlatformGovernedFlowState(makeSummary({
      trial_workspace: {
        ...makeSummary().trial_workspace!,
        tasks: [
          {
            ...makeSummary().trial_workspace!.tasks[0],
            scenario_id: 'oa_full_cycle_governed_execution',
          },
        ],
      },
    }), 'task_1', 'OPERATOR');
    expect(flow?.currentStageKey).toBe('APPROVAL');
    expect(flow?.stages.map((stage) => `${stage.key}:${stage.status}`)).toEqual([
      'REQUEST:DONE',
      'APPROVAL:BLOCKED',
      'OPERATIONS:UPCOMING',
      'REVIEW:UPCOMING',
      'AUDIT:UPCOMING',
    ]);
  });

  it('computes role-aware next action from the shared stage model', () => {
    const summary = makeSummary();
    const approverFlow = buildPlatformGovernedFlowState(summary, 'task_1', 'APPROVER');
    const reviewerFlow = buildPlatformGovernedFlowState(summary, 'task_1', 'REVIEWER');
    expect(approverFlow?.nextAction).toContain('Approval Center');
    expect(reviewerFlow?.nextAction).toContain('shared evidence set');
  });

  it('preserves task, role, and member context in cross-center section links', () => {
    const href = buildPlatformSectionHref({
      currentPage: 'requester',
      workspaceMode: 'local_lab',
      labActorId: 'local_requester_01',
      section: 'operations',
      memberId: 'requester',
      trialTaskId: 'task_1',
      inviteCode: 'invite_1',
      oaRole: 'REQUESTER',
    });
    expect(href).toContain('page=workspace');
    expect(href).toContain('section=operations');
    expect(href).toContain('member=requester');
    expect(href).toContain('trial_task=task_1');
    expect(href).toContain('oa_role=REQUESTER');
  });

  it('keeps evidence and receipt continuity across reviewer, auditor, and tenant-admin lenses', () => {
    const summary = makeSummary();
    const reviewerFlow = buildPlatformGovernedFlowState(summary, 'task_1', 'REVIEWER');
    const auditorFlow = buildPlatformGovernedFlowState(summary, 'task_1', 'AUDITOR');
    const tenantAdminFlow = buildPlatformGovernedFlowState(summary, 'task_1', 'TENANT_ADMIN');
    expect(reviewerFlow?.evidence.evidenceSetId).toBe('task_1');
    expect(auditorFlow?.evidence.evidenceSetId).toBe('task_1');
    expect(tenantAdminFlow?.evidence.evidenceSetId).toBe('task_1');
    expect(reviewerFlow?.evidence.receiptSummary).toBe(auditorFlow?.evidence.receiptSummary);
    expect(auditorFlow?.evidence.receiptSummary).toBe(tenantAdminFlow?.evidence.receiptSummary);
  });

  it('builds policy basis and blocked-reason linkage for governance surfaces', () => {
    const summary = makeSummary({
      policy_studio: {
        ...makeSummary().policy_studio,
        pack_name: 'Agent OS Policy Pack',
        pack_version: '2026.03',
        pack_fingerprint: 'fingerprint_123',
        override_count: 1,
        approval_governance_summary: 'Approval requires policy basis.',
        detail_lines: ['Override recorded in preview.'],
      },
    });
    const surface = buildPlatformPolicySurface(summary, 'POLICY_GOVERNANCE_ADMIN', 'task_1');
    expect(surface.policyBasis[0]).toContain('Agent OS Policy Pack');
    expect(surface.exceptionWaiver[0]).toContain('1');
    expect(surface.blockedReasonLinkage[0]).toContain('Agent OS Policy Pack');
  });

  it('builds Okta-only readiness explanations for tenant admins', () => {
    const summary = makeSummary({
      enterprise_account: {
        ...makeSummary().enterprise_account!,
        signed_in: true,
        diagnostics: {
          provider: 'OKTA_OIDC',
          tenant_id: 'tenant_1',
          workspace_id: 'workspace_1',
          store_driver: 'postgres',
          production_mode: false,
          write_persistence_ready: false,
          session_expires_at: 10,
          session_time_remaining_ms: 10,
          binding_count: 1,
          group_count: 1,
          group_role_mapping_summary: [],
        },
      },
    });
    const readiness = buildPlatformOktaReadinessSurface(summary, 'current');
    expect(readiness.checklist[0]?.detail).toContain('OKTA_OIDC');
    expect(readiness.whyNotReady[0]).toContain('Activation remains gated');
  });

  it('builds audit bundle continuity for the shared evidence set', () => {
    const audit = buildPlatformAuditSurface(makeSummary(), 'AUDITOR', 'task_1');
    expect(audit.timelineLines[0]).toContain('Requester');
    expect(audit.evidenceBundleLines[0]).toContain('task_1');
    expect(audit.exportBundleLines[0]).toContain('Receipt summary');
  });

  it('builds workspace ownership and escalation surfaces', () => {
    const governance = buildPlatformWorkspaceGovernanceSurface(makeSummary(), 'local_lab');
    expect(governance.ownership[0]).toContain('Pilot commander');
    expect(governance.adminBoundaries[0]).toContain('Tenant Admin');
    expect(governance.escalationPath[0]).toContain('Requester');
  });
});

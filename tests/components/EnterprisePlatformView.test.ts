import { describe, expect, it } from 'vitest';
import {
  buildRolePageHref,
  buildRolePageSummaryLines,
  buildPlatformHeaderMeta,
  buildPlatformQuickStats,
  buildPlatformGapLines,
  buildRoleContextLines,
  buildWorkspaceRoster,
  resolvePlatformSignedInLabel,
  sectionsForRolePage,
} from '../../components/EnterprisePlatformView';
import type { ProductShellSummary } from '../../services/agentKernelShellApi';
import { buildAccountShellLines } from '../../components/EnterpriseAccountShell';
import { buildWorkspaceAccessRows } from '../../components/WorkspaceMembersPanel';
import { buildRoleWorkboardCards } from '../../components/RoleWorkboardPanel';
import { buildCollaborationMapSteps } from '../../components/CollaborationMapPanel';
import { buildIdentityStatusLines } from '../../components/EnterpriseIdentityStatusPanel';
import { buildEnterpriseSignInLines } from '../../components/EnterpriseSignInPanel';
import { buildAccessMatrixRows } from '../../components/AccessMatrixPanel';
import { buildCrossRoleLanes } from '../../components/CrossRoleBoardPanel';
import { buildOrganizationWorkspaceFacts } from '../../components/OrganizationWorkspacePanel';
import { buildEnterpriseLoginEntryLines } from '../../components/EnterpriseLoginEntryPanel';
import { buildWorkspaceDirectoryRows } from '../../components/WorkspaceDirectoryPanel';
import { buildWorkspaceSeatAssignments } from '../../components/WorkspaceSeatAssignmentPanel';
import { buildAdminActionItems } from '../../components/AdminActionCenterPanel';
import { buildWorkspaceSeatDetail } from '../../components/WorkspaceSeatDetailPanel';
import { buildTrialJoinInviteRows } from '../../components/TrialJoinPanel';
import { buildTrialTaskFocusSummary } from '../../components/TrialTaskDetailPanel';
import { buildEnterpriseOAShell, ENTERPRISE_OA_V1_ROLES, enterpriseModuleForRole } from '../../services/enterpriseOAShell';

const baseSummary: ProductShellSummary = {
  generated_at: 1,
  environment_activation: {
    environment_kind: 'SIMULATOR',
    environment_label: 'Local role lab',
    workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
    workspace_mode: 'local_lab',
    pilot_activation_status: 'NOT_APPLICABLE',
  } as any,
  requester_inbox: {} as any,
  tenant_admin_setup: {} as any,
  policy_studio: {} as any,
  local_role_lab: {
    enabled: true,
    label: 'Local role lab',
    summary: 'One human can rehearse requester, operator, and tenant-admin collaboration locally.',
    active_actor_id: 'local_operator_01',
    active_role: 'OPERATOR',
    day_zero_blocked_summary: 'True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.',
    scenario: {
      scenario_id: 'advisor_handoff_rehearsal',
      title: 'Advisor workflow rehearsal',
      summary: 'Rehearsal scenario',
      current_stage: 'Operator validates handoff package',
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
        actor_id: 'local_operator_01',
        role: 'OPERATOR',
        actor_label: 'Local Operator',
        session_id: 'lab_sess_operator_01',
        summary: 'Operator rehearsal view',
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
    status: 'BLOCKED',
    owner_type: 'PILOT_COMMANDER',
    owner_label: 'Pilot commander',
    summary: 'External activation package is blocked by rejected or missing activation artifacts.',
    pending_requirement_count: 4,
    rejected_intake_count: 0,
    recent_intakes: [],
  },
  activation_checklist: [],
  remaining_blockers: [
    {
      code: 'pilot_environment_binding',
      owner_label: 'Pilot commander',
      summary: 'Pilot environment binding',
      missing_artifact: 'Real pilot environment binding and base URL',
      next_action: 'Provide a real pilot environment binding and base URL.',
    },
  ],
  evidence_categories: [],
  next_action: 'Provide real pilot environment binding',
};

describe('EnterprisePlatformView helpers', () => {
  it('resolves signed-in label from local role lab seat', () => {
    expect(resolvePlatformSignedInLabel(baseSummary, 'local_lab', 'local_operator_01')).toBe('Local Operator');
  });

  it('builds workspace roster from local role lab actors', () => {
    const roster = buildWorkspaceRoster(baseSummary, 'local_lab');
    expect(roster).toHaveLength(2);
    expect(roster[0]?.title).toBe('Local Requester');
    expect(roster[1]?.badge).toBe('operator');
  });

  it('builds gap lines from activation package and blockers', () => {
    const lines = buildPlatformGapLines(baseSummary);
    expect(lines[0]).toContain('External activation package is blocked');
    expect(lines.some((line) => line.includes('Pilot commander: Real pilot environment binding and base URL'))).toBe(true);
  });

  it('builds workspace-first platform header metadata', () => {
    const meta = buildPlatformHeaderMeta(baseSummary, 'local_lab');
    expect(meta[0]).toEqual({ label: 'Organization', value: 'Lumi Enterprise' });
    expect(meta[1]).toEqual({ label: 'Workspace', value: 'Local role lab' });
    expect(meta[2]).toEqual({ label: 'Environment', value: 'SIMULATOR' });
  });

  it('builds quick stats for the workspace command center', () => {
    const summary = {
      ...baseSummary,
      requester_inbox: {
        total_count: 6,
        in_progress_count: 2,
        waiting_count: 1,
        blocked_count: 1,
      },
      policy_studio: {
        pack_name: 'Advisor Pack',
        summary: 'Current policy pack summary',
      },
    } as ProductShellSummary;
    const stats = buildPlatformQuickStats(summary, 'local_lab');
    expect(stats[0]).toEqual({
      label: 'Requests',
      value: '6',
      detail: '2 in progress · 1 waiting',
    });
    expect(stats[2]?.label).toBe('Seats');
    expect(stats[3]?.value).toBe('Advisor Pack');
  });

  it('builds local role context lines for the right rail', () => {
    const lines = buildRoleContextLines(baseSummary, 'local_lab', 'local_operator_01');
    expect(lines[0]).toContain('Local Operator');
    expect(lines[1]).toContain('Advisor workflow rehearsal');
    expect(lines[3]).toContain('REAL_PILOT promotion');
  });

  it('builds current-workspace role context lines without relying on local-lab-only fields', () => {
    const summary = {
      ...baseSummary,
      environment_activation: {
        ...baseSummary.environment_activation,
        workspace_mode: 'current',
        workspace_binding_kind: 'UNBOUND',
        activation_ready_summary: 'Pilot activation is blocked by environment binding, actor provisioning/access, identity, connector, or vault readiness.',
        environment_binding: {
          summary: 'This is a simulator-backed environment.',
        },
        missing_dependency_summaries: ['Missing operator access', 'Missing tenant-admin touchpoint'],
      },
    } as ProductShellSummary;
    const lines = buildRoleContextLines(summary, 'current', 'local_operator_01');
    expect(lines[0]).toContain('Pilot activation is blocked');
    expect(lines[1]).toContain('simulator-backed environment');
    expect(lines[2]).toContain('Missing operator access');
  });

  it('builds shareable role page hrefs', () => {
    expect(buildRolePageHref('operator', 'local_lab', 'local_operator_01')).toBe(
      '/?surface=platform&page=operator&workspace_mode=local_lab&lab_actor_id=local_operator_01'
    );
    expect(buildRolePageHref('tenant_admin', 'local_lab', 'local_tenant_admin_01', 'members')).toBe(
      '/?surface=platform&page=tenant_admin&workspace_mode=local_lab&lab_actor_id=local_tenant_admin_01&section=members'
    );
    expect(buildRolePageHref('workspace', 'local_lab', 'local_operator_01', 'members', 'local_requester_01')).toBe(
      '/?surface=platform&page=workspace&workspace_mode=local_lab&lab_actor_id=local_operator_01&section=members&member=local_requester_01'
    );
    expect(buildRolePageHref(
      'operator',
      'local_lab',
      'local_operator_01',
      'operations',
      'local_operator_01',
      'trial_task_123',
      'invite_abc'
    )).toBe(
      '/?surface=platform&page=operator&workspace_mode=local_lab&lab_actor_id=local_operator_01&section=operations&member=local_operator_01&trial_task=trial_task_123&invite_code=invite_abc'
    );
  });

  it('limits sections for role pages', () => {
    expect(sectionsForRolePage('requester')).toEqual(['requests', 'approval', 'members', 'navigator']);
    expect(sectionsForRolePage('tenant_admin')).toEqual(['admin', 'review', 'organization', 'members', 'policy', 'audit', 'overview']);
    expect(sectionsForRolePage('workspace')).toContain('join');
  });

  it('builds page summary lines for requester and admin pages', () => {
    const summary = {
      ...baseSummary,
      requester_inbox: {
        total_count: 5,
        completed_count: 2,
        blocked_count: 1,
      },
      tenant_admin_setup: {
        summary: 'Tenant admin setup summary',
      },
      activation_package: {
        ...baseSummary.activation_package,
        status: 'IN_PROGRESS',
      },
      remaining_blockers: [{ ...baseSummary.remaining_blockers[0] }],
    } as ProductShellSummary;
    expect(buildRolePageSummaryLines(summary, 'requester')[0]).toContain('5 total requests');
    expect(buildRolePageSummaryLines(summary, 'tenant_admin')[0]).toContain('Tenant admin setup summary');
  });

  it('builds account shell lines', () => {
    const lines = buildAccountShellLines({
      signedInLabel: 'Local Operator',
      organizationLabel: 'Lumi Enterprise',
      workspaceLabel: 'Local role lab',
      environmentLabel: 'SIMULATOR',
      rolePageLabel: 'Operator',
      workspaceMode: 'local_lab',
    });
    expect(lines[0]).toContain('Local Operator');
    expect(lines[4]).toContain('Operator');
  });

  it('builds workspace access rows from local role lab actors', () => {
    const rows = buildWorkspaceAccessRows(baseSummary, 'local_lab');
    expect(rows[0]?.title).toBe('Local Requester');
    expect(rows[1]?.access).toBe('granted');
    expect(rows[0]?.detailHref).toContain('member=local_requester_01');
    expect(rows[0]?.detail).toContain('local role lab actor');
  });

  it('builds requester and tenant-admin workboard cards', () => {
    const summary = {
      ...baseSummary,
      requester_inbox: {
        total_count: 4,
        in_progress_count: 1,
        waiting_count: 2,
        blocked_count: 1,
        completed_count: 3,
      },
      activation_package: {
        ...baseSummary.activation_package,
        status: 'IN_PROGRESS',
        pending_requirement_count: 2,
      },
      evidence_categories: [
        { category: 'DEVICE_SESSION_PROOF', state: 'MISSING' },
        { category: 'WORKFLOW_ARTIFACT_PROOF', state: 'READY' },
      ],
    } as ProductShellSummary;
    expect(buildRoleWorkboardCards(summary, 'requester', 'local_lab')[0]?.value).toBe('4');
    expect(buildRoleWorkboardCards(summary, 'tenant_admin', 'local_lab')[0]?.value).toContain('in progress');
  });

  it('builds the frozen OA v1 role set and module mapping', () => {
    const shell = buildEnterpriseOAShell(baseSummary, 'local_lab', 'APPROVER', 'APPROVAL_CENTER');
    expect(shell.roles.map((role) => role.role)).toEqual(['REQUESTER', 'OPERATOR']);
    expect(ENTERPRISE_OA_V1_ROLES).toContain('AUDITOR');
    expect(enterpriseModuleForRole('REQUESTER')).toBe('REQUEST_CENTER');
    expect(enterpriseModuleForRole('APPROVER')).toBe('APPROVAL_CENTER');
    expect(enterpriseModuleForRole('POLICY_GOVERNANCE_ADMIN')).toBe('POLICY_GOVERNANCE_CENTER');
  });

  it('limits current-workspace OA roles to the signed-in session bindings', () => {
    const shell = buildEnterpriseOAShell({
      ...baseSummary,
      enterprise_account: {
        signed_in: true,
        role_badges: ['REQUESTER', 'APPROVER'],
        available_roles: ['REQUESTER', 'APPROVER'],
        module_access: [],
        active_bindings: [],
        pending_invites: [],
        summary: 'Signed in',
      },
    } as ProductShellSummary, 'current', 'APPROVER', 'APPROVAL_CENTER');
    expect(shell.roles.map((role) => role.role)).toEqual(['REQUESTER', 'APPROVER']);
  });

  it('shows all 9 OA roles when the 9-role local_lab example is active', () => {
    const shell = buildEnterpriseOAShell({
      ...baseSummary,
      trial_workspace: {
        trial_workspace: {
          active_template_id: 'oa_full_cycle_governed_execution',
        },
      } as any,
    } as ProductShellSummary, 'local_lab', 'APPROVER', 'APPROVAL_CENTER');
    expect(shell.roles).toHaveLength(9);
    expect(shell.roles.map((role) => role.role)).toContain('AUDITOR');
  });

  it('builds collaboration map steps from local role lab timeline', () => {
    const steps = buildCollaborationMapSteps(baseSummary, 'local_lab');
    expect(steps[0]?.title).toContain('Requester submits brief');
    expect(steps[0]?.owner).toContain('operator');
  });

  it('builds cross-role workflow lanes', () => {
    const summary = {
      ...baseSummary,
      requester_inbox: {
        items: [
          {
            goal: 'Prepare advisor brief',
            group: 'IN_PROGRESS',
            summary: 'Requester is preparing context.',
            actor_role: 'REQUESTER',
          },
        ],
      },
      activation_package: {
        ...baseSummary.activation_package,
        status: 'IN_PROGRESS',
        summary: 'Activation package is moving.',
        pending_requirement_count: 1,
      },
    } as ProductShellSummary;
    const lanes = buildCrossRoleLanes(summary, 'local_lab');
    expect(lanes).toHaveLength(3);
    expect(lanes[0]?.label).toBe('Requester');
    expect(lanes[0]?.cards[0]?.title).toContain('Prepare advisor brief');
  });

  it('builds 9 collaboration lanes for the 9-role OA example', () => {
    const summary = {
      ...baseSummary,
      trial_workspace: {
        trial_workspace: {
          active_template_id: 'oa_full_cycle_governed_execution',
        },
        activities: [
          { oa_role: 'REQUESTER', summary: 'Requester staged request.' },
          { oa_role: 'APPROVER', summary: 'Approver released bounded scope.' },
          { oa_role: 'OPERATOR', summary: 'Operator assembled package.' },
        ],
      },
    } as ProductShellSummary;
    const lanes = buildCrossRoleLanes(summary, 'local_lab');
    expect(lanes).toHaveLength(9);
    expect(lanes.some((lane) => lane.label === 'Approver')).toBe(true);
    expect(lanes.some((lane) => lane.label === 'Auditor')).toBe(true);
  });

  it('builds identity posture lines from environment truth', () => {
    const summary = {
      ...baseSummary,
      environment_activation: {
        ...baseSummary.environment_activation,
        environment_binding: { summary: 'Environment binding is blocked.' },
        identity_readiness: { summary: 'Identity not ready.' },
        connector_readiness: { summary: 'Connector not ready.' },
        vault_readiness: { summary: 'Vault path not ready.' },
        activation_ready_summary: 'Pilot activation is still blocked.',
      },
    } as ProductShellSummary;
    const lines = buildIdentityStatusLines(summary, 'local_lab');
    expect(lines[0]).toContain('Local role lab uses synthetic seats');
    expect(lines.some((line) => line.includes('Identity not ready'))).toBe(true);
  });

  it('builds enterprise sign-in shell lines', () => {
    const summary = {
      ...baseSummary,
      environment_activation: {
        ...baseSummary.environment_activation,
        identity_readiness: { summary: 'Identity available for rehearsal only.' },
        activation_ready_summary: 'Activation still blocked.',
        actor_availability: [
          { role: 'REQUESTER', state: 'READY' },
          { role: 'OPERATOR', state: 'READY' },
        ],
      },
    } as ProductShellSummary;
    const lines = buildEnterpriseSignInLines(summary, 'local_lab');
    expect(lines[0]).toContain('synthetic role sessions');
    expect(lines.some((line) => line.includes('Ready actor seats: 2'))).toBe(true);
  });

  it('builds access matrix rows', () => {
    const rows = buildAccessMatrixRows(baseSummary, 'local_lab');
    expect(rows[0]?.role).toBe('requester');
    expect(rows[0]?.access).toBe('granted');
  });

  it('builds organization and workspace facts', () => {
    const summary = {
      ...baseSummary,
      activation_package: {
        ...baseSummary.activation_package,
        status: 'IN_PROGRESS',
        pending_requirement_count: 1,
      },
      policy_studio: {
        pack_name: 'Agent OS Policy Pack',
        summary: 'Policy summary',
      },
      environment_activation: {
        ...baseSummary.environment_activation,
        activation_ready_summary: 'Activation is blocked by external pilot inputs.',
      },
    } as ProductShellSummary;
    const facts = buildOrganizationWorkspaceFacts(summary, 'local_lab');
    expect(facts[0]?.value).toBe('Lumi Enterprise');
    expect(facts[1]?.value).toBe('Local role lab');
    expect(facts[3]?.value).toContain('in progress');
  });

  it('builds enterprise login entry lines', () => {
    const summary = {
      ...baseSummary,
      environment_activation: {
        ...baseSummary.environment_activation,
        identity_readiness: { summary: 'Identity ready for rehearsal.' },
        environment_binding: { summary: 'Environment binding remains synthetic.' },
        activation_ready_summary: 'Pilot activation is blocked by missing real evidence.',
        actor_availability: [
          { role: 'REQUESTER', state: 'READY' },
          { role: 'OPERATOR', state: 'READY' },
          { role: 'TENANT_ADMIN', state: 'READY' },
        ],
      },
    } as ProductShellSummary;
    const lines = buildEnterpriseLoginEntryLines(summary, 'local_lab');
    expect(lines[0]?.title).toContain('Local role lab sign-in');
    expect(lines[1]?.detail).toContain('3 rehearsal seats');
  });

  it('builds workspace directory rows with role page hrefs', () => {
    const rows = buildWorkspaceDirectoryRows(baseSummary, 'local_lab');
    expect(rows[0]?.actor).toBe('Local Requester');
    expect(rows[0]?.pageHref).toContain('page=requester');
    expect(rows[0]?.detailHref).toContain('member=local_requester_01');
    expect(rows[1]?.pageHref).toContain('page=operator');
  });

  it('builds workspace seat assignments', () => {
    const rows = buildWorkspaceSeatAssignments(baseSummary, 'local_lab');
    expect(rows[0]?.assignmentStatus).toContain('assigned');
    expect(rows[0]?.pageHref).toContain('page=requester');
    expect(rows[1]?.detailHref).toContain('member=local_operator_01');
  });

  it('builds admin action center items', () => {
    const summary = {
      ...baseSummary,
      activation_package: {
        ...baseSummary.activation_package,
        status: 'IN_PROGRESS',
        pending_requirement_count: 2,
      },
      remaining_blockers: [
        {
          summary: 'Operator access missing',
          owner_label: 'Pilot commander',
          next_action: 'Provision operator access',
        },
      ],
    } as ProductShellSummary;
    const items = buildAdminActionItems(summary, 'local_lab');
    expect(items[0]?.title).toContain('Activation package');
    expect(items.some((item) => item.title.includes('Operator access missing'))).toBe(true);
  });

  it('builds a focused workspace seat detail for the current actor', () => {
    const summary = {
      ...baseSummary,
      requester_inbox: {
        items: [
          {
            goal: 'Prepare advisor brief',
            group: 'IN_PROGRESS',
            summary: 'Requester is preparing context.',
            actor_role: 'REQUESTER',
          },
        ],
      },
      next_action: 'Move work from requester to operator.',
    } as ProductShellSummary;
    const detail = buildWorkspaceSeatDetail(summary, 'local_lab', 'local_operator_01');
    expect(detail?.actorLabel).toBe('Local Operator');
    expect(detail?.statusLabel).toContain('active');
    expect(detail?.sessionId).toBe('lab_sess_operator_01');
    expect(detail?.handoffItems[0]).toContain('Requester submits brief');
    expect(detail?.evidenceBoundary).toContain('REAL_PILOT');
  });

  it('builds visible trial invite rows from shared trial summary', () => {
    const summary = {
      ...baseSummary,
      trial_workspace: {
        trial_workspace: {} as any,
        seats: [],
        participants: [],
        sessions: [],
        activities: [],
        tasks: [],
        persistence_state: 'SERVER_BACKED',
        persistence_detail: 'Shared through preview Postgres.',
        invites: [
          {
            invite_id: 'invite_1',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            seat_id: 'seat_operator',
            actor_role: 'OPERATOR',
            invite_code: 'trial-join-001',
            label: 'operator invite',
            status: 'OPEN',
            created_at: 1,
            updated_at: 1,
          },
        ],
        join_instructions: [],
        conversion_guidance_lines: [],
      },
    } as ProductShellSummary;
    const rows = buildTrialJoinInviteRows(summary);
    expect(rows[0]).toEqual({
      inviteId: 'invite_1',
      roleLabel: 'operator',
      inviteCode: 'trial-join-001',
      status: 'OPEN',
      acceptedLabel: undefined,
      claimHref: '/?surface=trial-join&workspace_mode=local_lab&invite_code=trial-join-001',
      lifecycle: 'awaiting claim',
      joinTrace: [
        'Invite code trial-join-001',
        'No participant has accepted this invite yet.',
      ],
    });
  });

  it('builds visible trial invite rows when only oa_role is present', () => {
    const summary = {
      ...baseSummary,
      trial_workspace: {
        trial_workspace: {} as any,
        seats: [],
        participants: [],
        sessions: [],
        activities: [],
        tasks: [],
        persistence_state: 'SERVER_BACKED',
        persistence_detail: 'Shared through preview Postgres.',
        invites: [
          {
            invite_id: 'invite_approver_1',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            seat_id: 'seat_approver',
            oa_role: 'APPROVER',
            invite_code: 'trial-join-approver-001',
            label: 'approver invite',
            status: 'OPEN',
            created_at: 1,
            updated_at: 1,
          },
        ],
        join_instructions: [],
        conversion_guidance_lines: [],
      },
    } as ProductShellSummary;
    const rows = buildTrialJoinInviteRows(summary);
    expect(rows[0]?.roleLabel).toBe('approver');
  });

  it('builds a focused trial task summary from shared trial workspace state', () => {
    const summary = {
      ...baseSummary,
      trial_workspace: {
        trial_workspace: {} as any,
        seats: [],
        participants: [],
        invites: [],
        sessions: [],
        persistence_state: 'SERVER_BACKED',
        persistence_detail: 'Shared through preview Postgres.',
        tasks: [
          {
            task_id: 'trial_task_1',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            created_by_participant_id: 'participant_requester_01',
            scenario_id: 'advisor_client_intake',
            scenario_title: 'Advisor Client Intake → Compliance Review → CRM Handoff',
            scenario_summary: 'Summary',
            requester_brief: 'Brief',
            client_name: 'Eleanor Hart',
            jurisdiction: 'UK',
            priority: 'high',
            required_outcome: 'Intake ready',
            external_handoff_guard: 'Do not finalize external handoff until compliance-required fields are complete.',
            missing_fields: ['kyc_status', 'source_of_funds'],
            operator_review_required: true,
            compliance_review_requested: true,
            connector_requested: true,
            lifecycle: 'OPERATOR_REVIEW',
            receipt_summary: 'Operator review requested.',
            created_at: 1,
            updated_at: 2,
          },
        ],
        active_task_detail: {
          task_id: 'trial_task_1',
          title: 'Advisor Client Intake → Compliance Review → CRM Handoff · Eleanor Hart',
          lifecycle: 'OPERATOR_REVIEW',
          receipt_summary: 'Operator review requested.',
          missing_fields: ['kyc_status', 'source_of_funds'],
          handoff_lines: ['Requester staged Eleanor Hart', 'Operator review queued'],
          approval_summary: 'Do not finalize external handoff until compliance-required fields are complete.',
        },
        activities: [
          {
            activity_id: 'activity_1',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            actor_role: 'REQUESTER',
            summary: 'Trial Requester created the task for Eleanor Hart.',
            task_id: 'trial_task_1',
            created_at: 10,
          },
          {
            activity_id: 'activity_2',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            actor_role: 'OPERATOR',
            summary: 'Operator review opened for Eleanor Hart.',
            task_id: 'trial_task_1',
            created_at: 11,
          },
        ],
        join_instructions: [],
        conversion_guidance_lines: [],
      },
    } as ProductShellSummary;
    const focus = buildTrialTaskFocusSummary(summary, 'trial_task_1');
    expect(focus?.taskId).toBe('trial_task_1');
    expect(focus?.title).toContain('Eleanor Hart');
    expect(focus?.missingFields).toContain('kyc_status');
    expect(focus?.approvalSummary).toContain('Do not finalize external handoff');
    expect(focus?.approvalLines[0]).toContain('Operator review is required');
    expect(focus?.timeline[0]?.summary).toContain('Operator review opened');
    expect(focus?.nextAction).toContain('Resolve missing fields');
  });

  it('builds a focused trial task summary when timeline activities use oa_role only', () => {
    const summary = {
      ...baseSummary,
      trial_workspace: {
        trial_workspace: {} as any,
        seats: [],
        participants: [],
        invites: [],
        sessions: [],
        persistence_state: 'SERVER_BACKED',
        persistence_detail: 'Shared through preview Postgres.',
        tasks: [
          {
            task_id: 'trial_task_oa_only',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            created_by_participant_id: 'trial_participant_requester',
            scenario_id: 'oa_full_cycle_governed_execution',
            scenario_title: '9-Role OA Governed Execution Cycle',
            scenario_summary: 'Summary',
            requester_brief: 'Brief',
            client_name: 'Northbridge Family Office',
            jurisdiction: 'UK',
            priority: 'high',
            required_outcome: 'Intake ready',
            external_handoff_guard: 'Guard',
            missing_data_policy: 'Policy',
            missing_fields: ['review_evidence'],
            operator_review_required: true,
            compliance_review_requested: true,
            connector_requested: true,
            lifecycle: 'TENANT_ADMIN_REVIEW',
            receipt_summary: 'Waiting on governed review.',
            created_at: 1,
            updated_at: 2,
          },
        ],
        activities: [
          {
            activity_id: 'activity_approver_1',
            trial_workspace_id: 'trial_workspace_enterprise_sandbox',
            oa_role: 'APPROVER',
            summary: 'Approver decision remains pending.',
            task_id: 'trial_task_oa_only',
            created_at: 20,
          },
        ],
        join_instructions: [],
        conversion_guidance_lines: [],
      },
    } as ProductShellSummary;
    const focus = buildTrialTaskFocusSummary(summary, 'trial_task_oa_only');
    expect(focus?.timeline[0]?.actorRole).toBe('APPROVER');
    expect(focus?.timeline[0]?.summary).toContain('Approver decision remains pending');
  });
});

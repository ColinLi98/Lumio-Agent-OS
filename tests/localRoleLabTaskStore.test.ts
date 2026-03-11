import { describe, expect, it } from 'vitest';
import type { ProductShellSummary } from '../services/agentKernelShellApi';
import {
  acceptSharedTrialInvite,
  buildEnterpriseSandboxModel,
  createLocalRoleLabTaskFromTemplate,
  createSharedTrialInvite,
  defaultLocalRoleLabBrief,
  getTrialWorkspaceState,
  listScenarioTemplates,
  mergeLocalRoleLabProductShellSummary,
  parseRequesterBrief,
  releaseSharedTrialSeat,
  registerTrialWorkspaceSession,
} from '../services/localRoleLabTaskStore';

const baseSummary: ProductShellSummary = {
  generated_at: 1,
  environment_activation: {
    environment_kind: 'SIMULATOR',
    environment_label: 'Local role lab',
    workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
    workspace_mode: 'local_lab',
    pilot_activation_status: 'NOT_APPLICABLE',
  } as any,
  requester_inbox: {
    generated_at: 1,
    total_count: 0,
    in_progress_count: 0,
    blocked_count: 0,
    waiting_count: 0,
    completed_count: 0,
    items: [],
  },
  tenant_admin_setup: {} as any,
  policy_studio: {
    pack_name: 'Agent OS Policy Pack',
    summary: 'Policy summary',
  } as any,
  local_role_lab: {
    enabled: true,
    label: 'Local role lab',
    summary: 'Rehearsal summary',
    active_actor_id: 'local_tenant_admin_01',
    active_role: 'TENANT_ADMIN',
    day_zero_blocked_summary: 'True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.',
    scenario: {
      scenario_id: 'advisor_handoff_rehearsal',
      title: 'Advisor workflow rehearsal',
      summary: 'Rehearsal',
      current_stage: 'Tenant admin reviews activation gap',
      focus_points: ['Keep active role visible'],
    },
    handoff_timeline: [],
    evidence_classification_summary: 'All local role lab artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.',
    pilot_activation_gap_summary: 'A real pilot still needs a real environment binding.',
    actors: [
      {
        actor_id: 'local_requester_01',
        role: 'REQUESTER',
        actor_label: 'Local Requester',
        session_id: 'lab_sess_requester_01',
        summary: 'Requester view',
        is_active: false,
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      {
        actor_id: 'local_operator_01',
        role: 'OPERATOR',
        actor_label: 'Local Operator',
        session_id: 'lab_sess_operator_01',
        summary: 'Operator view',
        is_active: false,
        is_demo_data: false,
        is_pilot_evidence: false,
      },
      {
        actor_id: 'local_tenant_admin_01',
        role: 'TENANT_ADMIN',
        actor_label: 'Local Tenant Admin',
        session_id: 'lab_sess_tenant_admin_01',
        summary: 'Admin view',
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
    summary: 'Local role lab is active for multi-actor rehearsal and is blocked from real pilot promotion by design.',
    pending_requirement_count: 1,
    rejected_intake_count: 0,
    recent_intakes: [],
  },
  activation_checklist: [],
  remaining_blockers: [],
  evidence_categories: [],
  next_action: 'Switch to tenant admin and rehearse the next handoff locally.',
};

describe('localRoleLabTaskStore', () => {
  it('parses the default requester brief', () => {
    const parsed = parseRequesterBrief(defaultLocalRoleLabBrief());
    expect(parsed.client_name).toBe('Eleanor Hart');
    expect(parsed.jurisdiction).toBe('UK');
    expect(parsed.priority).toBe('high');
    expect(parsed.required_outcome).toContain('CRM handoff ready');
  });

  it('exposes the full sandbox scenario template set', () => {
    const templates = listScenarioTemplates();
    expect(templates).toHaveLength(4);
    expect(templates.map((item) => item.template_id)).toEqual([
      'advisor_client_intake',
      'cross_boundary_export_review',
      'exception_dispute_remediation',
      'oa_full_cycle_governed_execution',
    ]);
  });

  it('creates a sandbox task from the remediation template', () => {
    const task = createLocalRoleLabTaskFromTemplate('exception_dispute_remediation');
    expect(task.scenario_id).toBe('exception_dispute_remediation');
    expect(task.scenario_title).toContain('Exception / Dispute / Remediation');
    expect(task.missing_compliance_fields).toContain('dispute_evidence');
  });

  it('merges local lab tasks into the product shell summary', () => {
    const merged = mergeLocalRoleLabProductShellSummary(baseSummary, [
      {
        task_id: 'local_lab_task_1',
        correlation_id: 'local_lab_corr_1',
        trial_workspace_id: 'trial_workspace_enterprise_sandbox',
        created_by_participant_id: 'participant_requester_01',
        scenario_id: 'advisor_client_intake',
        scenario_title: 'Advisor Client Intake → Compliance Review → CRM Handoff',
        scenario_summary: 'Client intake is routed to operator review before compliance and CRM handoff.',
        requester_brief: defaultLocalRoleLabBrief(),
        client_name: 'Eleanor Hart',
        jurisdiction: 'UK',
        priority: 'high',
        required_outcome: 'intake record prepared, compliance review requested, CRM handoff ready if policy allows',
        external_handoff_guard: 'Do not finalize external handoff until compliance-required fields are complete.',
        missing_data_policy: 'If anything is missing, request operator review instead of silently proceeding.',
        missing_compliance_fields: ['primary_contact_details', 'source_of_funds'],
        operator_review_required: true,
        compliance_review_requested: true,
        connector_requested: true,
        lifecycle: 'OPERATOR_REVIEW',
        receipt_summary: 'Operator review required before CRM handoff can proceed.',
        created_at: 2,
        updated_at: 3,
      },
    ]);

    expect(merged.requester_inbox.total_count).toBe(3);
    expect(merged.requester_inbox.waiting_count).toBe(2);
    expect(merged.requester_inbox.in_progress_count).toBe(1);
    expect(merged.next_action).toContain('Operator review required for Eleanor Hart');
    expect(merged.local_role_lab.scenario.title).toContain('Eleanor Hart');
    expect(merged.local_role_lab.handoff_timeline[0]?.title).toContain('Eleanor Hart');
  });

  it('builds enterprise sandbox model with walkthrough, outcome, and gap state', () => {
    const merged = mergeLocalRoleLabProductShellSummary(baseSummary, [
      {
        task_id: 'local_lab_task_2',
        correlation_id: 'local_lab_corr_2',
        trial_workspace_id: 'trial_workspace_enterprise_sandbox',
        created_by_participant_id: 'participant_requester_01',
        scenario_id: 'cross_boundary_export_review',
        scenario_title: 'Cross-Boundary Export Review',
        scenario_summary: 'Export review waits on operator boundary checks and tenant-admin approval.',
        requester_brief: defaultLocalRoleLabBrief('cross_boundary_export_review'),
        client_name: 'Meridian Family Office Export',
        jurisdiction: 'UK to EU',
        priority: 'high',
        required_outcome: 'export package prepared, boundary review requested, delivery package ready only if policy allows',
        external_handoff_guard: 'Do not finalize external transfer until jurisdiction, approval, and residency-required fields are complete.',
        missing_data_policy: 'If anything is missing, request operator review instead of silently proceeding.',
        missing_compliance_fields: ['destination_approval', 'residency_basis', 'export_manifest'],
        operator_review_required: true,
        compliance_review_requested: true,
        connector_requested: false,
        lifecycle: 'OPERATOR_REVIEW',
        receipt_summary: 'Boundary review remains blocked until export fields are complete.',
        created_at: 2,
        updated_at: 5,
      },
    ]);
    const sandbox = buildEnterpriseSandboxModel(merged, [
      {
        task_id: 'local_lab_task_2',
        correlation_id: 'local_lab_corr_2',
        trial_workspace_id: 'trial_workspace_enterprise_sandbox',
        created_by_participant_id: 'participant_requester_01',
        scenario_id: 'cross_boundary_export_review',
        scenario_title: 'Cross-Boundary Export Review',
        scenario_summary: 'Export review waits on operator boundary checks and tenant-admin approval.',
        requester_brief: defaultLocalRoleLabBrief('cross_boundary_export_review'),
        client_name: 'Meridian Family Office Export',
        jurisdiction: 'UK to EU',
        priority: 'high',
        required_outcome: 'export package prepared, boundary review requested, delivery package ready only if policy allows',
        external_handoff_guard: 'Do not finalize external transfer until jurisdiction, approval, and residency-required fields are complete.',
        missing_data_policy: 'If anything is missing, request operator review instead of silently proceeding.',
        missing_compliance_fields: ['destination_approval', 'residency_basis', 'export_manifest'],
        operator_review_required: true,
        compliance_review_requested: true,
        connector_requested: false,
        lifecycle: 'OPERATOR_REVIEW',
        receipt_summary: 'Boundary review remains blocked until export fields are complete.',
        created_at: 2,
        updated_at: 5,
      },
    ]);

    expect(sandbox.scenario_cards).toHaveLength(4);
    expect(sandbox.active_template_id).toBe('cross_boundary_export_review');
    expect(sandbox.walkthrough_steps[1]?.status).toBe('CURRENT');
    expect(sandbox.outcome_summary.headline).toContain('Meridian Family Office Export');
    expect(sandbox.gap_lines.some((line) => line.includes('cannot clear the real pilot gap'))).toBe(true);
    expect(sandbox.trial_workspace.label).toContain('Enterprise Sandbox');
    expect(sandbox.participants.length).toBeGreaterThanOrEqual(3);
    expect(sandbox.conversion_guidance_lines.length).toBeGreaterThan(0);
  });

  it('bootstraps and updates shared trial workspace sessions', () => {
    const initial = getTrialWorkspaceState();
    expect(initial.workspace.label).toContain('Enterprise Sandbox');
    expect(initial.participants.map((item) => item.actor_role)).toEqual(['REQUESTER', 'OPERATOR', 'TENANT_ADMIN']);

    const session = registerTrialWorkspaceSession({
      labActorId: 'local_operator_01',
      page: 'operator',
      section: 'operations',
    });
    expect(session.actor_role).toBe('OPERATOR');
    expect(getTrialWorkspaceState().sessions.length).toBeGreaterThanOrEqual(1);
  });

  it('accepts invites and releases claimed seats in fallback trial state', async () => {
    await createSharedTrialInvite('TENANT_ADMIN', 'tenant admin observer');
    const stateWithInvite = getTrialWorkspaceState();
    const inviteCode = stateWithInvite.invites[0]?.invite_code;
    expect(inviteCode).toBeTruthy();

    await acceptSharedTrialInvite({
      inviteCode: String(inviteCode),
      actorLabel: 'Joined Tenant Admin',
    });
    const claimedSeat = getTrialWorkspaceState().seats.find((seat) => seat.claim_status === 'CLAIMED');
    expect(claimedSeat?.assigned_participant_id).toBeTruthy();

    await releaseSharedTrialSeat(String(claimedSeat?.seat_id));
    const releasedSeat = getTrialWorkspaceState().seats.find((seat) => seat.seat_id === claimedSeat?.seat_id);
    expect(releasedSeat?.claim_status).toBe('ASSIGNED_BASE');
  });
});

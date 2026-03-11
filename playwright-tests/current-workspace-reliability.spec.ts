import { test, expect, type Page } from '@playwright/test';

const baseCurrentSummary = {
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
    workspace_options: [
      {
        mode: 'current',
        label: 'Current workspace',
        selected: true,
        workspace_binding_kind: 'TENANT_WORKSPACE',
        environment_kind: 'PRODUCTION',
        description: 'Uses the current environment binding.',
      },
      {
        mode: 'local_lab',
        label: 'Local role lab',
        selected: false,
        workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
        environment_kind: 'SIMULATOR',
        description: 'Sandbox rehearsal only.',
      },
    ],
    missing_dependency_codes: [],
    missing_dependency_summaries: [],
    environment_binding: {
      state: 'BOUND',
      environment_kind: 'PRODUCTION',
      environment_label: 'Current workspace',
      base_url: 'https://lumio.example.com',
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
    activation_ready_summary: 'Pilot activation is blocked by review evidence and approval scope.',
    is_demo_data: false,
    is_pilot_evidence: true,
  },
  enterprise_account: {
    signed_in: true,
    summary: 'Signed in',
    role_badges: ['WORKSPACE_ADMIN', 'APPROVER', 'REVIEWER', 'AUDITOR'],
    available_roles: ['WORKSPACE_ADMIN', 'APPROVER', 'REVIEWER', 'AUDITOR'],
    pending_invites: [
      {
        invite_id: 'invite_1',
        tenant_id: 'tenant_1',
        workspace_id: 'workspace_1',
        email: 'invitee@example.com',
        role: 'REQUESTER',
        invite_token: 'invite_token_1',
        invited_by_principal_id: 'principal_admin',
        invited_by_label: 'Workspace Admin',
        status: 'OPEN',
        created_at: 1,
        updated_at: 2,
      },
    ],
    active_bindings: [],
    module_access: [],
    diagnostics: {
      provider: 'OKTA_OIDC',
      tenant_id: 'tenant_1',
      workspace_id: 'workspace_1',
      store_driver: 'postgres',
      production_mode: true,
      write_persistence_ready: true,
      session_expires_at: 10000,
      session_time_remaining_ms: 9000,
      binding_count: 4,
      group_count: 2,
      group_role_mapping_summary: ['WORKSPACE_ADMIN via OIDC_LOGIN (workspace workspace_1)'],
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
        role_assignments: [
          {
            principal_id: 'principal_requester',
            binding_id: 'binding_requester',
            role: 'REQUESTER',
            tenant_id: 'tenant_1',
            workspace_id: 'workspace_1',
            status: 'ACTIVE',
            source: 'MANUAL_ADMIN',
          },
        ],
      },
    ],
    invites: [
      {
        invite_id: 'invite_1',
        tenant_id: 'tenant_1',
        workspace_id: 'workspace_1',
        email: 'invitee@example.com',
        role: 'REQUESTER',
        invite_token: 'invite_token_1',
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
        actor_label: 'Requester One',
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
        actor_label: 'Requester One',
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
    summary: 'Setup blocked by review evidence.',
    detail_lines: ['Review evidence missing'],
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
    approval_governance_summary: 'Approval requires review evidence.',
    detail_lines: ['Policy basis is explicit in current workspace.'],
    is_demo_data: false,
    is_pilot_evidence: true,
  },
  local_role_lab: {
    enabled: true,
    label: 'Local lab',
    summary: 'Local lab',
    active_actor_id: 'local_operator_01',
    active_role: 'OPERATOR',
    day_zero_blocked_summary: 'Local only.',
    scenario: {
      scenario_id: 'scenario',
      title: 'Scenario',
      summary: 'Scenario',
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
      summary: 'Current workspace task focus support.',
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
};

const approvalCenter = {
  generated_at: 1,
  center: 'APPROVAL',
  item_count: 1,
  actionable_count: 1,
  items: [
    {
      item_id: 'approval_item_1',
      center: 'APPROVAL',
      source: 'TASK_APPROVAL_WAIT',
      status: 'READY_FOR_APPROVAL',
      title: 'Approval item',
      summary: 'Approval item summary',
      detail_lines: ['Approval detail'],
      available_actions: ['approve'],
      task_id: 'task_current_2',
      created_at: 1,
      updated_at: 1,
    },
  ],
};

const reviewCenter = {
  generated_at: 1,
  center: 'REVIEW',
  item_count: 1,
  actionable_count: 1,
  items: [
    {
      item_id: 'review_item_1',
      center: 'REVIEW',
      source: 'PILOT_ARTIFACT_REVIEW',
      status: 'OPEN',
      title: 'Review item',
      summary: 'Review item summary',
      detail_lines: ['Review detail'],
      available_actions: ['verify'],
      task_id: 'task_current_2',
      created_at: 1,
      updated_at: 1,
    },
  ],
};

const auditCenter = {
  generated_at: 1,
  center: 'AUDIT',
  item_count: 1,
  actionable_count: 1,
  items: [
    {
      item_id: 'audit_item_1',
      center: 'AUDIT',
      source: 'COMPLIANCE_AUDIT_EXPORT',
      status: 'OPEN',
      title: 'Audit item',
      summary: 'Audit item summary',
      detail_lines: ['Audit detail'],
      available_actions: [],
      task_id: 'task_current_2',
      created_at: 1,
      updated_at: 1,
    },
  ],
};

const noAccessSummary = {
  ...baseCurrentSummary,
  enterprise_account: {
    signed_in: false,
    summary: 'No current session.',
    role_badges: [],
    available_roles: [],
    pending_invites: [],
    active_bindings: [],
    module_access: [],
  },
  enterprise_membership: undefined,
};

async function installCurrentWorkspaceApiMocks(
  page: Page,
  options?: { signedIn?: boolean; writeReady?: boolean; recordDecision?: () => void },
) {
  const signedIn = options?.signedIn ?? true;
  const writeReady = options?.writeReady ?? true;
  const summary = signedIn
    ? {
        ...baseCurrentSummary,
        enterprise_account: {
          ...baseCurrentSummary.enterprise_account,
          diagnostics: {
            ...baseCurrentSummary.enterprise_account.diagnostics,
            write_persistence_ready: writeReady,
          },
        },
      }
    : noAccessSummary;
  const account = signedIn
    ? {
        ...baseCurrentSummary.enterprise_account,
        diagnostics: {
          ...baseCurrentSummary.enterprise_account.diagnostics,
          write_persistence_ready: writeReady,
        },
      }
    : noAccessSummary.enterprise_account;

  await page.route('**/api/agent-kernel/product-shell/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        workspace_mode: 'current',
        summary,
      }),
    });
  });

  await page.route('**/api/agent-kernel/enterprise/account', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        summary: account,
      }),
    });
  });

  await page.route('**/api/agent-kernel/enterprise/centers?center=APPROVAL', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        summary: approvalCenter,
      }),
    });
  });
  await page.route('**/api/agent-kernel/enterprise/centers?center=REVIEW', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        summary: reviewCenter,
      }),
    });
  });
  await page.route('**/api/agent-kernel/enterprise/centers?center=AUDIT', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        summary: auditCenter,
      }),
    });
  });

  await page.route('**/api/agent-kernel/enterprise/centers/*/decision', async (route) => {
    options?.recordDecision?.();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function dismissBlockingUi(page: Page) {
  const maybeClick = async (selector: string) => {
    const locator = page.locator(selector);
    if (await locator.first().isVisible().catch(() => false)) {
      await locator.first().click({ force: true });
    }
  };

  await maybeClick('[title="Dismiss"]');
  await maybeClick('button:has-text("跳过，慢慢了解我")');
  await maybeClick('button:has-text("Skip, learn about me later")');
  await maybeClick('button:has-text("暂不开启")');
}

test('current workspace degrades safely on malformed route state, stale focus, and restore failure', async ({ page }) => {
  await installCurrentWorkspaceApiMocks(page, { signedIn: false });
  await page.addInitScript(() => {
    sessionStorage.setItem('lumio_platform_route_snapshot_v1', '{bad json');
  });

  await page.goto('/?surface=platform&workspace_mode=current&page=workspace&section=join&member=missing_member&trial_task=missing_task&invite_code=trial_invite&lab_actor_id=local_operator_01&oa_role=unknown');
  await dismissBlockingUi(page);

  await expect(page.getByText('Stored route restore failed')).toBeVisible();
  await expect(page.getByText('Malformed URL fallback applied')).toBeVisible();
  await expect(page.getByText('Stale member link')).toBeVisible();
  await expect(page.getByText('Stale task link')).toBeVisible();
  await expect(page.getByText('No current-workspace access')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with Okta' }).first()).toBeVisible();
});

test('current workspace smoke matrix covers role entry, role switch, member focus, task focus, section nav, and CTA execution', async ({ page }) => {
  let decisionCount = 0;
  await installCurrentWorkspaceApiMocks(page, {
    signedIn: true,
    writeReady: true,
    recordDecision: () => {
      decisionCount += 1;
    },
  });
  await page.addInitScript(() => {
    localStorage.setItem('lumi_enterprise_session_id', 'session_current_1');
  });

  await page.goto('/?surface=platform&workspace_mode=current&page=workspace&section=members&member=principal_requester&trial_task=task_current_1&oa_role=WORKSPACE_ADMIN');
  await dismissBlockingUi(page);

  await expect(page.getByText('Focused member', { exact: true })).toBeVisible();
  await expect(page.getByText('Requester One').first()).toBeVisible();
  await expect.poll(() => page.url()).toContain('member=principal_requester');
  await expect.poll(() => page.url()).toContain('trial_task=task_current_1');

  await page.getByRole('button', { name: 'Approver' }).first().click();
  await expect.poll(() => page.url()).toContain('oa_role=APPROVER');
  await expect.poll(() => page.url()).toContain('section=members');

  await page.getByRole('button', { name: 'Approval Center', exact: false }).click();
  await expect.poll(() => page.url()).toContain('section=approval');

  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: /Bulk approve \(1\)/ }).click();
  await expect.poll(() => decisionCount).toBe(1);

  await page.getByRole('button', { name: 'Request Center', exact: false }).click();
  await page.getByRole('button', { name: 'Open detail' }).nth(1).click();
  await expect.poll(() => page.url()).toContain('trial_task=task_current_2');

  await page.getByRole('button', { name: 'Audit & Reporting Center', exact: false }).click();
  await expect.poll(() => page.url()).toContain('section=audit');
  await expect.poll(() => page.url()).toContain('member=principal_requester');
  await expect.poll(() => page.url()).toContain('trial_task=task_current_2');
  await expect(page.getByRole('button', { name: 'Export bundle' })).toBeVisible();
});

test('current workspace CTAs stay disabled with explicit reasons when writes are fail-closed', async ({ page }) => {
  await installCurrentWorkspaceApiMocks(page, {
    signedIn: true,
    writeReady: false,
  });
  await page.addInitScript(() => {
    localStorage.setItem('lumi_enterprise_session_id', 'session_current_1');
  });

  await page.goto('/?surface=platform&workspace_mode=current&page=workspace&section=members&member=principal_requester&oa_role=WORKSPACE_ADMIN');
  await dismissBlockingUi(page);

  await expect(page.getByText('Enterprise writes are currently fail-closed because production persistence is not ready.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite member' })).toBeDisabled();

  await page.getByRole('button', { name: 'Approver' }).first().click();
  await expect.poll(() => page.url()).toContain('oa_role=APPROVER');
  await page.getByRole('button', { name: 'Approval Center', exact: false }).click();
  await expect.poll(() => page.url()).toContain('section=approval');
  await expect(page.getByText('Enterprise writes are fail-closed until a real current-workspace session reports write persistence ready.').first()).toBeVisible();
});

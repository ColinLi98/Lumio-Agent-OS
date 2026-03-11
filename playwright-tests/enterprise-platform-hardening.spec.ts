import { test, expect, type Page, type Locator } from '@playwright/test';

const seedTrialWorkspaceState = {
  workspace: {
    trial_workspace_id: 'trial_workspace_enterprise_sandbox',
    label: 'Enterprise Sandbox Workspace',
    summary: 'Shared trial workspace for multi-role enterprise rehearsal.',
    status: 'REHEARSAL_IN_PROGRESS',
    active_template_id: 'oa_full_cycle_governed_execution',
    created_at: 1,
    updated_at: 1,
  },
  participants: [
    {
      participant_id: 'participant_requester_01',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      actor_role: 'REQUESTER',
      actor_label: 'Local Requester',
      seat_id: 'trial_seat_requester',
      summary: 'Submits requests, reviews receipts, and follows cross-role progress.',
      state: 'ACTIVE',
      created_at: 1,
      updated_at: 1,
    },
    {
      participant_id: 'participant_operator_01',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      actor_role: 'OPERATOR',
      actor_label: 'Local Operator',
      seat_id: 'trial_seat_operator',
      summary: 'Validates missing fields, prepares handoffs, and explains operational progress.',
      state: 'ACTIVE',
      created_at: 1,
      updated_at: 1,
    },
    {
      participant_id: 'participant_tenant_admin_01',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      actor_role: 'TENANT_ADMIN',
      actor_label: 'Local Tenant Admin',
      seat_id: 'trial_seat_tenant_admin',
      summary: 'Reviews readiness, boundaries, and what must change before pilot conversion.',
      state: 'VIEWING',
      created_at: 1,
      updated_at: 1,
    },
  ],
  seats: [
    {
      seat_id: 'trial_seat_requester',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      role: 'REQUESTER',
      label: 'Requester seat',
      summary: 'Business requester perspective.',
      claim_status: 'ASSIGNED_BASE',
      assigned_participant_id: 'participant_requester_01',
      created_at: 1,
      updated_at: 1,
    },
    {
      seat_id: 'trial_seat_operator',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      role: 'OPERATOR',
      label: 'Operator seat',
      summary: 'Operational reviewer perspective.',
      claim_status: 'ASSIGNED_BASE',
      assigned_participant_id: 'participant_operator_01',
      created_at: 1,
      updated_at: 1,
    },
    {
      seat_id: 'trial_seat_tenant_admin',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      role: 'TENANT_ADMIN',
      label: 'Tenant-admin seat',
      summary: 'Admin / approval perspective.',
      claim_status: 'ASSIGNED_BASE',
      assigned_participant_id: 'participant_tenant_admin_01',
      created_at: 1,
      updated_at: 1,
    },
  ],
  invites: [
    {
      invite_id: 'invite_1',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      seat_id: 'trial_seat_requester',
      actor_role: 'REQUESTER',
      invite_code: 'invite_code_1',
      label: 'requester invite',
      status: 'OPEN',
      created_at: 1,
      updated_at: 1,
    },
  ],
  sessions: [
    {
      trial_session_id: 'trial_session_seed',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      participant_id: 'participant_tenant_admin_01',
      actor_role: 'TENANT_ADMIN',
      current_page: 'workspace',
      current_section: 'overview',
      created_at: 1,
      last_seen_at: 1,
    },
  ],
  tasks: [
    {
      task_id: 'trial_task_smoke_1',
      correlation_id: 'trial_corr_smoke_1',
      trial_workspace_id: 'trial_workspace_enterprise_sandbox',
      created_by_participant_id: 'participant_requester_01',
      scenario_id: 'oa_full_cycle_governed_execution',
      scenario_title: '9-Role OA Governed Execution Cycle',
      scenario_summary: 'One governed flow across the enterprise centers.',
      requester_brief: 'Seeded browser smoke task',
      client_name: 'Northbridge Family Office',
      jurisdiction: 'UK',
      priority: 'high',
      required_outcome: 'Request staged and governed flow visible.',
      external_handoff_guard: 'Do not progress until approval, review, policy, integration, and audit requirements are explicit.',
      missing_data_policy: 'If anything is missing, keep the task inside the enterprise platform.',
      missing_compliance_fields: ['approval_scope', 'review_evidence', 'policy_basis'],
      operator_review_required: true,
      compliance_review_requested: true,
      connector_requested: true,
      lifecycle: 'TENANT_ADMIN_REVIEW',
      receipt_summary: 'Shared 9-role OA workflow is staged; progression remains inside the sandbox.',
      created_at: 1,
      updated_at: 1,
    },
  ],
};

const preparePage = async (page: Page) => {
  await page.addInitScript((seed) => {
    localStorage.setItem('lumi_onboarding_completed', 'true');
    localStorage.setItem('lumi_digital_soul_bootstrapped', 'true');
    localStorage.setItem('lumi_trial_workspace_state_v1', JSON.stringify(seed));
  }, seedTrialWorkspaceState);
};

const clickIfVisible = async (locator: Locator) => {
  if (await locator.isVisible().catch(() => false)) {
    await locator.click({ force: true });
  }
};

const dismissBlockingUI = async (page: Page) => {
  await clickIfVisible(page.getByTitle('Dismiss'));
  await clickIfVisible(page.getByRole('button', { name: '跳过，慢慢了解我' }));
  await clickIfVisible(page.getByRole('button', { name: 'Skip, learn about me later' }));
  await clickIfVisible(page.getByRole('button', { name: '暂不开启' }));
};

test('enterprise platform keeps role, section, member, and task context coherent across the governed chain', async ({ page }) => {
  await preparePage(page);
  await page.goto('/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview&member=requester&trial_task=trial_task_smoke_1&oa_role=APPROVER');
  await dismissBlockingUI(page);

  await expect(page.getByText('Role-aware cockpit')).toBeVisible();
  await expect(page.getByText('9-role OA cycle staged for Northbridge Family Office', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approver' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auditor' }).first()).toBeVisible();

  await page.getByRole('link', { name: /Approval Approver/i }).first().click();
  await expect.poll(() => page.url()).toContain('section=approval');

  await page.getByRole('button', { name: 'Review Center', exact: false }).click();
  await expect.poll(() => page.url()).toContain('section=review');

  await page.getByRole('button', { name: 'Auditor' }).first().click();
  await expect.poll(() => page.url()).toContain('oa_role=AUDITOR');

  await page.getByRole('button', { name: 'Audit & Reporting Center', exact: false }).click();
  await expect.poll(() => page.url()).toContain('section=audit');
});

test('enterprise platform surfaces disabled CTA states instead of no-op buttons', async ({ page }) => {
  await preparePage(page);
  await page.goto('/?surface=platform&workspace_mode=local_lab&page=workspace&section=join');
  await dismissBlockingUI(page);

  const acceptInvite = page.getByRole('button', { name: 'Accept invite' });
  await expect(acceptInvite).toBeDisabled();
  await expect(page.getByText('Paste an invite code to enable the trial-seat acceptance CTA.')).toBeVisible();

  await page.getByRole('button', { name: 'Request Center', exact: false }).click();
  const runTask = page.getByRole('button', { name: 'Run local rehearsal task' });
  await expect(runTask).toBeEnabled();

  const brief = page.getByLabel('Requester brief');
  await brief.fill('');
  await expect(runTask).toBeDisabled();
});

test('enterprise control-plane sections expose deeper admin surfaces', async ({ page }) => {
  await preparePage(page);
  await page.goto('/?surface=platform&workspace_mode=local_lab&page=workspace&section=organization&trial_task=trial_task_smoke_1&oa_role=TENANT_ADMIN');
  await dismissBlockingUI(page);

  await expect(page.getByText('Ownership & admin boundaries')).toBeVisible();
  await expect(page.getByText('Escalation path & workspace health')).toBeVisible();

  await page.getByRole('button', { name: 'Members & Access', exact: false }).click();
  await expect(page.getByText('Seat scope').first()).toBeVisible();

  await page.getByRole('button', { name: 'Policy & Governance Center', exact: false }).click();
  await expect(page.getByText('Policy basis').first()).toBeVisible();
  await expect(page.getByText('Exceptions / waivers').first()).toBeVisible();

  await page.getByRole('button', { name: 'Integration & Readiness Center', exact: false }).click();
  await expect(page.getByText('Okta OIDC readiness').first()).toBeVisible();
  await expect(page.getByText('Why not ready').first()).toBeVisible();

  await page.getByRole('button', { name: 'Audit & Reporting Center', exact: false }).click();
  await expect(page.getByText('Receipt timeline').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export bundle' })).toBeVisible();
});

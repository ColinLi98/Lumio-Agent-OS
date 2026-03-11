import { type ProductShellSummary, type WorkspaceMode } from './agentKernelShellApi';
import {
  normalizeOaRole,
  normalizeOaRoles,
  platformModuleForRole,
  platformRoleLabel,
  PLATFORM_OA_ROLE_ORDER,
} from './platformContract';

export type EnterpriseOARole =
  | 'REQUESTER'
  | 'APPROVER'
  | 'OPERATOR'
  | 'REVIEWER'
  | 'TENANT_ADMIN'
  | 'WORKSPACE_ADMIN'
  | 'POLICY_GOVERNANCE_ADMIN'
  | 'INTEGRATION_ADMIN'
  | 'AUDITOR';

export type EnterpriseOAModule =
  | 'REQUEST_CENTER'
  | 'APPROVAL_CENTER'
  | 'OPERATIONS_CONSOLE'
  | 'POLICY_GOVERNANCE_CENTER'
  | 'INTEGRATION_READINESS_CENTER'
  | 'AUDIT_REPORTING_CENTER';

export interface EnterpriseRoleMatrixEntry {
  role: EnterpriseOARole;
  label: string;
  primaryObjective: string;
  primarySurfaces: string[];
  visibleObjects: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  approvalAuthority: string;
  dataIntegrationScope: string;
  evidenceResponsibility: string;
  escalationTargets: string[];
  primaryModule: EnterpriseOAModule;
}

export interface EnterpriseModuleCenterSummary {
  module: EnterpriseOAModule;
  label: string;
  summary: string;
  primaryRoles: EnterpriseOARole[];
  metricLabel: string;
  metricValue: string;
}

export interface EnterpriseSeatRoleSummary {
  role: EnterpriseOARole;
  label: string;
  summary: string;
  state: string;
  trialOnly: boolean;
}

export interface EnterpriseRoleActionPolicySummary {
  role: EnterpriseOARole;
  allowedActions: string[];
  forbiddenActions: string[];
  approvalAuthority: string;
}

export interface EnterpriseOAShellSummary {
  roles: EnterpriseRoleMatrixEntry[];
  modules: EnterpriseModuleCenterSummary[];
  seatRoles: EnterpriseSeatRoleSummary[];
  activeRole: EnterpriseOARole;
  activeModule: EnterpriseOAModule;
  actionPolicy: EnterpriseRoleActionPolicySummary;
}

export const ENTERPRISE_OA_V1_ROLES: EnterpriseOARole[] = [...PLATFORM_OA_ROLE_ORDER];

export const ENTERPRISE_OA_V1_MODULES: EnterpriseOAModule[] = [
  'REQUEST_CENTER',
  'APPROVAL_CENTER',
  'OPERATIONS_CONSOLE',
  'POLICY_GOVERNANCE_CENTER',
  'INTEGRATION_READINESS_CENTER',
  'AUDIT_REPORTING_CENTER',
];

const ROLE_MATRIX: Record<EnterpriseOARole, EnterpriseRoleMatrixEntry> = {
  REQUESTER: {
    role: 'REQUESTER',
    label: 'Requester',
    primaryObjective: 'Initiate work and receive outcomes.',
    primarySurfaces: ['Request Center', 'Requester Inbox', 'Receipt / Result View'],
    visibleObjects: ['own requests', 'own approvals', 'own receipts', 'own status changes'],
    allowedActions: ['create request', 'add missing info', 'respond to clarification', 'view result'],
    forbiddenActions: ['policy edits', 'admin setup changes', 'connector/admin mutation'],
    approvalAuthority: 'Can approve bounded prompts only when explicitly requested.',
    dataIntegrationScope: 'Own request and receipt scope only.',
    evidenceResponsibility: 'Provide clear request context and confirm final outcome when requested.',
    escalationTargets: ['Operator', 'Approver', 'Tenant Admin'],
    primaryModule: 'REQUEST_CENTER',
  },
  APPROVER: {
    role: 'APPROVER',
    label: 'Approver',
    primaryObjective: 'Authorize or deny controlled actions.',
    primarySurfaces: ['Approval Center', 'Approval Queue', 'Decision Review Pane'],
    visibleObjects: ['approval-required tasks', 'bounded decision context', 'approval notes'],
    allowedActions: ['approve', 'reject', 'request clarification', 'leave approval note'],
    forbiddenActions: ['broad policy mutation', 'queue-wide operator mutation', 'environment setup mutation'],
    approvalAuthority: 'Owns bounded operational release and approval notes.',
    dataIntegrationScope: 'Approval-scoped request, receipt, and bounded risk context.',
    evidenceResponsibility: 'Leave durable approval decisions and rationale.',
    escalationTargets: ['Requester', 'Policy / Governance Admin'],
    primaryModule: 'APPROVAL_CENTER',
  },
  OPERATOR: {
    role: 'OPERATOR',
    label: 'Operator',
    primaryObjective: 'Progress and resolve cases operationally.',
    primarySurfaces: ['Operations Console', 'Queue', 'Case Detail', 'Timeline'],
    visibleObjects: ['assigned/open cases', 'blockers', 'handoffs', 'workflow status'],
    allowedActions: ['inspect/update safe case state', 'handoff', 'escalate', 'run safe bulk actions', 'attach notes'],
    forbiddenActions: ['unrestricted policy change', 'unrestricted connector/admin change', 'destructive automation'],
    approvalAuthority: 'No final approval authority; can route to review/approval.',
    dataIntegrationScope: 'Operational case scope and execution context.',
    evidenceResponsibility: 'Leave timeline, blocker, and remediation notes.',
    escalationTargets: ['Reviewer', 'Tenant Admin', 'Policy / Governance Admin'],
    primaryModule: 'OPERATIONS_CONSOLE',
  },
  REVIEWER: {
    role: 'REVIEWER',
    label: 'Reviewer',
    primaryObjective: 'Check quality, risk, or compliance before progression.',
    primarySurfaces: ['Approval Center', 'Review Queue', 'Evidence / Receipt View'],
    visibleObjects: ['review-required cases', 'evidence', 'review blockers'],
    allowedActions: ['mark reviewed', 'request additional evidence', 'block progression', 'hand back to operator'],
    forbiddenActions: ['broad admin mutation', 'unrelated operational bulk actions'],
    approvalAuthority: 'Can complete review gates but not broad admin approval.',
    dataIntegrationScope: 'Review package, proof, and blocker scope.',
    evidenceResponsibility: 'Leave review decision and reason.',
    escalationTargets: ['Operator', 'Policy / Governance Admin'],
    primaryModule: 'APPROVAL_CENTER',
  },
  TENANT_ADMIN: {
    role: 'TENANT_ADMIN',
    label: 'Tenant Admin',
    primaryObjective: 'Ensure tenant activation and readiness.',
    primarySurfaces: ['Integration & Readiness Center', 'Activation / Readiness View'],
    visibleObjects: ['environment binding', 'actor readiness', 'pilot blockers', 'readiness summaries'],
    allowedActions: ['register readiness artifacts', 'track blockers', 'confirm setup state'],
    forbiddenActions: ['arbitrary workflow execution', 'unrestricted policy authoring'],
    approvalAuthority: 'Owns tenant activation and readiness confirmation.',
    dataIntegrationScope: 'Tenant-level readiness and activation scope.',
    evidenceResponsibility: 'Leave setup/activation evidence and blocker notes.',
    escalationTargets: ['Integration Admin', 'Policy / Governance Admin'],
    primaryModule: 'INTEGRATION_READINESS_CENTER',
  },
  WORKSPACE_ADMIN: {
    role: 'WORKSPACE_ADMIN',
    label: 'Workspace Admin',
    primaryObjective: 'Manage workspace-level participants and readiness.',
    primarySurfaces: ['Integration & Readiness Center', 'Members & Access', 'Workspace Setup'],
    visibleObjects: ['workspace config', 'workspace participants', 'workspace blockers'],
    allowedActions: ['confirm workspace setup', 'manage workspace-scoped readiness artifacts', 'see workspace-specific trial state'],
    forbiddenActions: ['tenant-wide policy or environment mutation'],
    approvalAuthority: 'Workspace-scoped setup and participant readiness only.',
    dataIntegrationScope: 'Workspace-scoped participant and readiness data.',
    evidenceResponsibility: 'Leave workspace readiness and seat-governance notes.',
    escalationTargets: ['Tenant Admin', 'Policy / Governance Admin'],
    primaryModule: 'INTEGRATION_READINESS_CENTER',
  },
  POLICY_GOVERNANCE_ADMIN: {
    role: 'POLICY_GOVERNANCE_ADMIN',
    label: 'Policy / Governance Admin',
    primaryObjective: 'Control policy packs, overrides, rollout, and governance behavior.',
    primarySurfaces: ['Policy & Governance Center', 'Policy Studio', 'Rollout Views'],
    visibleObjects: ['policy packs', 'overrides', 'rollout state', 'governance blockers'],
    allowedActions: ['inspect/edit policy packs', 'manage overrides', 'review simulation', 'pause/freeze rollout'],
    forbiddenActions: ['arbitrary business request creation', 'support-only changes'],
    approvalAuthority: 'Policy pack and rollout governance authority.',
    dataIntegrationScope: 'Policy, simulation, and governance data.',
    evidenceResponsibility: 'Leave policy change reasoning and rollout evidence.',
    escalationTargets: ['Auditor', 'Governance owner'],
    primaryModule: 'POLICY_GOVERNANCE_CENTER',
  },
  INTEGRATION_ADMIN: {
    role: 'INTEGRATION_ADMIN',
    label: 'Integration Admin',
    primaryObjective: 'Manage integration readiness and connector health.',
    primarySurfaces: ['Integration & Readiness Center', 'Connector / Credential Views'],
    visibleObjects: ['connector readiness', 'credential/vault summaries', 'route eligibility', 'integration blockers'],
    allowedActions: ['register integration readiness', 'inspect route/credential state', 'coordinate safe unblock'],
    forbiddenActions: ['unrelated business workflow mutation', 'broad policy authoring'],
    approvalAuthority: 'Connector readiness and route eligibility signoff.',
    dataIntegrationScope: 'Connector, route, and credential scope.',
    evidenceResponsibility: 'Leave connector readiness and route evidence.',
    escalationTargets: ['Tenant Admin', 'Support / CS Ops'],
    primaryModule: 'INTEGRATION_READINESS_CENTER',
  },
  AUDITOR: {
    role: 'AUDITOR',
    label: 'Auditor',
    primaryObjective: 'Inspect proof, receipts, and audit-relevant state.',
    primarySurfaces: ['Audit & Reporting Center', 'Receipt / Proof / Export Views'],
    visibleObjects: ['receipts', 'proof summaries', 'audit exports', 'timeline/approval trails'],
    allowedActions: ['read', 'export where policy allows'],
    forbiddenActions: ['mutate workflows', 'approve operations', 'change admin/policy/integration state'],
    approvalAuthority: 'No workflow approval authority.',
    dataIntegrationScope: 'Audit-visible proof and reporting scope.',
    evidenceResponsibility: 'Observation role only; no progression evidence duties.',
    escalationTargets: ['Policy / Governance Admin', 'Compliance Reviewer'],
    primaryModule: 'AUDIT_REPORTING_CENTER',
  },
};

const MODULE_LABELS: Record<EnterpriseOAModule, string> = {
  REQUEST_CENTER: 'Request Center',
  APPROVAL_CENTER: 'Approval Center',
  OPERATIONS_CONSOLE: 'Operations Console',
  POLICY_GOVERNANCE_CENTER: 'Policy & Governance Center',
  INTEGRATION_READINESS_CENTER: 'Integration & Readiness Center',
  AUDIT_REPORTING_CENTER: 'Audit & Reporting Center',
};

const MODULE_PRIMARY_ROLES: Record<EnterpriseOAModule, EnterpriseOARole[]> = {
  REQUEST_CENTER: ['REQUESTER'],
  APPROVAL_CENTER: ['APPROVER', 'REVIEWER'],
  OPERATIONS_CONSOLE: ['OPERATOR'],
  POLICY_GOVERNANCE_CENTER: ['POLICY_GOVERNANCE_ADMIN', 'WORKSPACE_ADMIN'],
  INTEGRATION_READINESS_CENTER: ['TENANT_ADMIN', 'WORKSPACE_ADMIN', 'INTEGRATION_ADMIN'],
  AUDIT_REPORTING_CENTER: ['AUDITOR'],
};

export function enterpriseModuleForRole(role: EnterpriseOARole): EnterpriseOAModule {
  return platformModuleForRole(role);
}

export function enterpriseRoleLabel(role: EnterpriseOARole): string {
  return platformRoleLabel(role);
}

export function enterpriseRoleMatrix(): EnterpriseRoleMatrixEntry[] {
  return ENTERPRISE_OA_V1_ROLES.map((role) => ROLE_MATRIX[role]);
}

function availableRolesForShell(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
): EnterpriseOARole[] {
  if (workspaceMode === 'demo') {
    return [...ENTERPRISE_OA_V1_ROLES];
  }
  if (workspaceMode === 'local_lab') {
    if (summary?.trial_workspace?.trial_workspace?.active_template_id === 'oa_full_cycle_governed_execution') {
      return [...ENTERPRISE_OA_V1_ROLES];
    }
    const trialRoles = normalizeOaRoles(summary?.trial_workspace?.participants || []);
    if (trialRoles.length > 0) return trialRoles;

    const labRoles = normalizeOaRoles((summary?.local_role_lab?.actors || []).map((actor) => actor.role));
    if (labRoles.length > 0) return labRoles;

    return ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'];
  }
  return summary?.enterprise_account?.signed_in
    ? normalizeOaRoles(summary.enterprise_account.available_roles || [])
    : [];
}

function seatStateLabel(state: string | undefined): string {
  return String(state || 'UNSET').toLowerCase().replace(/_/g, ' ');
}

function buildSeatSummaries(summary: ProductShellSummary | null, workspaceMode: WorkspaceMode): EnterpriseSeatRoleSummary[] {
  const trialSeats = summary?.trial_workspace?.seats || [];
  if (trialSeats.length > 0) {
    return ENTERPRISE_OA_V1_ROLES.map((role) => {
      const seat = trialSeats.find((item) => normalizeOaRole(item) === role || normalizeOaRole(item.role) === role);
      return {
        role,
        label: ROLE_MATRIX[role].label,
        summary: seat?.summary || ROLE_MATRIX[role].primaryObjective,
        state: seatStateLabel(seat?.claim_status || 'UNASSIGNED'),
        trialOnly: true,
      };
    });
  }

  if (workspaceMode === 'demo') {
    return ENTERPRISE_OA_V1_ROLES.map((role) => ({
      role,
      label: ROLE_MATRIX[role].label,
      summary: `${ROLE_MATRIX[role].label} is available as a demo lens only.`,
      state: 'demo only',
      trialOnly: true,
    }));
  }

  return ENTERPRISE_OA_V1_ROLES.map((role) => ({
    role,
    label: ROLE_MATRIX[role].label,
    summary: ROLE_MATRIX[role].primaryObjective,
    state: role === 'REQUESTER' || role === 'OPERATOR' || role === 'TENANT_ADMIN' ? 'visible' : 'mapped',
    trialOnly: workspaceMode === 'local_lab',
  }));
}

function buildModuleSummary(summary: ProductShellSummary | null, module: EnterpriseOAModule, workspaceMode: WorkspaceMode): EnterpriseModuleCenterSummary {
  if (!summary) {
    return {
      module,
      label: MODULE_LABELS[module],
      summary: 'Module summary unavailable until workspace truth loads.',
      primaryRoles: MODULE_PRIMARY_ROLES[module],
      metricLabel: 'Objects',
      metricValue: '0',
    };
  }

  switch (module) {
    case 'REQUEST_CENTER':
      return {
        module,
        label: MODULE_LABELS[module],
        summary: 'Create, track, and receive governed outcomes for enterprise requests.',
        primaryRoles: MODULE_PRIMARY_ROLES[module],
        metricLabel: 'Requests',
        metricValue: String(summary.requester_inbox.total_count),
      };
    case 'APPROVAL_CENTER': {
      const approvalCount = (summary.trial_workspace?.tasks || []).filter((task) =>
        task.lifecycle === 'TENANT_ADMIN_REVIEW' || task.operator_review_required || task.compliance_review_requested
      ).length;
      return {
        module,
        label: MODULE_LABELS[module],
        summary: 'Bounded approvals and evidence reviews live here for approvers and reviewers.',
        primaryRoles: MODULE_PRIMARY_ROLES[module],
        metricLabel: 'Approvals',
        metricValue: String(approvalCount),
      };
    }
    case 'OPERATIONS_CONSOLE':
      return {
        module,
        label: MODULE_LABELS[module],
        summary: 'Operators progress work, manage blockers, and drive handoffs here.',
        primaryRoles: MODULE_PRIMARY_ROLES[module],
        metricLabel: 'Handoffs',
        metricValue: String(summary.local_role_lab.handoff_timeline.length || summary.trial_workspace?.activities.length || 0),
      };
    case 'POLICY_GOVERNANCE_CENTER':
      return {
        module,
        label: MODULE_LABELS[module],
        summary: 'Policy packs, overrides, rollout posture, and governance truth stay here.',
        primaryRoles: MODULE_PRIMARY_ROLES[module],
        metricLabel: 'Policy pack',
        metricValue: summary.policy_studio.pack_name || 'Policy Studio',
      };
    case 'INTEGRATION_READINESS_CENTER':
      return {
        module,
        label: MODULE_LABELS[module],
        summary: 'Activation, environment, workspace, and connector readiness are managed here.',
        primaryRoles: MODULE_PRIMARY_ROLES[module],
        metricLabel: 'Blockers',
        metricValue: String(summary.remaining_blockers.length),
      };
    case 'AUDIT_REPORTING_CENTER':
    default:
      return {
        module,
        label: MODULE_LABELS[module],
        summary: 'Receipts, proof, timeline, and audit-facing reporting stay isolated here.',
        primaryRoles: MODULE_PRIMARY_ROLES[module],
        metricLabel: 'Evidence',
        metricValue: String(summary.evidence_categories.length),
      };
  }
}

export function buildEnterpriseOAShell(
  summary: ProductShellSummary | null,
  workspaceMode: WorkspaceMode,
  activeRole: EnterpriseOARole,
  activeModule: EnterpriseOAModule,
): EnterpriseOAShellSummary {
  const availableRoles = availableRolesForShell(summary, workspaceMode);
  const roles = availableRoles.map((role) => ROLE_MATRIX[role]);
  const effectiveRole = roles.some((role) => role.role === activeRole)
    ? activeRole
    : roles[0]?.role || activeRole;
  return {
    roles,
    modules: ENTERPRISE_OA_V1_MODULES.map((module) => buildModuleSummary(summary, module, workspaceMode)),
    seatRoles: buildSeatSummaries(summary, workspaceMode),
    activeRole: effectiveRole,
    activeModule,
    actionPolicy: {
      role: effectiveRole,
      allowedActions: ROLE_MATRIX[effectiveRole].allowedActions,
      forbiddenActions: ROLE_MATRIX[effectiveRole].forbiddenActions,
      approvalAuthority: ROLE_MATRIX[effectiveRole].approvalAuthority,
    },
  };
}

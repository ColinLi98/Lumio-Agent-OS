import type {
    EnterpriseAccessBindingRecord,
    EnterpriseAction,
    EnterpriseIdentitySessionRecord,
    EnterprisePrincipalRecord,
    EnterpriseRole,
    PilotExternalArtifactKind,
    WorkspaceMode,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { isEnterpriseWritePersistenceReady } from './storeAdapters.js';

export interface EnterpriseAuthorizedSessionContext {
    principal: EnterprisePrincipalRecord;
    session: EnterpriseIdentitySessionRecord;
    active_bindings: EnterpriseAccessBindingRecord[];
    available_roles: EnterpriseRole[];
}

export interface AuthorizeEnterpriseActionInput {
    session_id: string;
    action: EnterpriseAction;
    tenant_id?: string;
    workspace_id?: string;
    workspace_mode?: WorkspaceMode;
    artifact_kind?: PilotExternalArtifactKind;
}

function now(): number {
    return Date.now();
}

function uniqueRoles(roles: EnterpriseRole[]): EnterpriseRole[] {
    return Array.from(new Set(roles));
}

function bindingMatchesWorkspace(binding: EnterpriseAccessBindingRecord, workspaceId?: string): boolean {
    if (!workspaceId) return true;
    if (!binding.workspace_id) return true;
    return binding.workspace_id === workspaceId;
}

function hasRole(
    context: EnterpriseAuthorizedSessionContext,
    role: EnterpriseRole,
    workspaceId?: string,
): boolean {
    return context.active_bindings.some((binding) =>
        binding.status === 'ACTIVE'
        && binding.roles.includes(role)
        && bindingMatchesWorkspace(binding, workspaceId)
    );
}

function hasAnyRole(
    context: EnterpriseAuthorizedSessionContext,
    roles: EnterpriseRole[],
    workspaceId?: string,
): boolean {
    return roles.some((role) => hasRole(context, role, workspaceId));
}

function workspaceScopedAdmin(context: EnterpriseAuthorizedSessionContext, workspaceId?: string): boolean {
    return hasRole(context, 'TENANT_ADMIN')
        || Boolean(workspaceId) && hasRole(context, 'WORKSPACE_ADMIN', workspaceId);
}

export function assertEnterpriseWriteAllowed(workspaceMode?: WorkspaceMode): void {
    if (workspaceMode && workspaceMode !== 'current') {
        throw new Error('enterprise_current_workspace_required');
    }
    if (!isEnterpriseWritePersistenceReady()) {
        throw new Error('enterprise_persistence_required');
    }
}

export async function resolveEnterpriseSessionContext(
    store: TaskStore,
    sessionId: string,
): Promise<EnterpriseAuthorizedSessionContext> {
    const normalizedSessionId = String(sessionId || '').trim();
    if (!normalizedSessionId) {
        throw new Error('missing_enterprise_session');
    }

    const session = await store.getEnterpriseIdentitySession(normalizedSessionId);
    if (!session) {
        throw new Error('enterprise_session_not_found');
    }
    if (session.status !== 'ACTIVE') {
        throw new Error('enterprise_session_not_active');
    }
    if (session.expires_at <= now()) {
        await store.updateEnterpriseIdentitySession(session.session_id, {
            status: 'EXPIRED',
            updated_at: now(),
        });
        throw new Error('enterprise_session_expired');
    }

    const principal = await store.getEnterprisePrincipal(session.principal_id);
    if (!principal || principal.status !== 'ACTIVE') {
        throw new Error('enterprise_principal_not_active');
    }

    const activeBindings = (await store.listEnterpriseAccessBindings(principal.principal_id))
        .filter((binding) => binding.status === 'ACTIVE')
        .sort((a, b) => a.binding_id.localeCompare(b.binding_id));

    await store.updateEnterpriseIdentitySession(session.session_id, {
        last_seen_at: now(),
        updated_at: now(),
    });

    return {
        principal,
        session,
        active_bindings: activeBindings,
        available_roles: uniqueRoles(activeBindings.flatMap((binding) => binding.roles)),
    };
}

function ensureTenantWorkspaceScope(
    context: EnterpriseAuthorizedSessionContext,
    tenantId?: string,
    workspaceId?: string,
): void {
    if (tenantId && tenantId !== context.session.tenant_id) {
        throw new Error('enterprise_session_tenant_mismatch');
    }
    if (!workspaceId) return;
    const boundToWorkspace = context.active_bindings.some((binding) =>
        binding.status === 'ACTIVE' && binding.workspace_id === workspaceId
    );
    if (!boundToWorkspace && !hasRole(context, 'TENANT_ADMIN')) {
        throw new Error('enterprise_session_workspace_mismatch');
    }
}

export async function authorizeEnterpriseAction(
    store: TaskStore,
    input: AuthorizeEnterpriseActionInput,
): Promise<EnterpriseAuthorizedSessionContext> {
    const context = await resolveEnterpriseSessionContext(store, input.session_id);
    ensureTenantWorkspaceScope(context, input.tenant_id, input.workspace_id || context.session.workspace_id);
    const workspaceId = input.workspace_id || context.session.workspace_id;

    switch (input.action) {
    case 'ENTERPRISE_ACCOUNT_VIEW':
    case 'ENTERPRISE_INVITE_VIEW':
        return context;
    case 'ENTERPRISE_MEMBER_INVITE':
    case 'ENTERPRISE_MEMBER_ASSIGN_ROLE':
    case 'ENTERPRISE_MEMBER_REMOVE_ROLE':
    case 'ENTERPRISE_MEMBER_SUSPEND':
    case 'ENTERPRISE_MEMBER_REACTIVATE':
    case 'ENTERPRISE_INVITE_REVOKE':
        if (!workspaceScopedAdmin(context, workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'ENTERPRISE_CENTER_APPROVAL_VIEW':
        if (!hasAnyRole(context, ['APPROVER', 'REVIEWER', 'TENANT_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'ENTERPRISE_CENTER_REVIEW_VIEW':
        if (!hasAnyRole(context, ['REVIEWER', 'APPROVER', 'TENANT_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'ENTERPRISE_CENTER_AUDIT_VIEW':
        if (!hasAnyRole(context, ['AUDITOR', 'TENANT_ADMIN', 'WORKSPACE_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'ENTERPRISE_CENTER_APPROVAL_DECIDE':
        if (!hasAnyRole(context, ['APPROVER', 'TENANT_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'ENTERPRISE_CENTER_REVIEW_DECIDE':
        if (!hasAnyRole(context, ['REVIEWER', 'APPROVER', 'TENANT_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'ENTERPRISE_CENTER_AUDIT_EXPORT':
        if (!hasAnyRole(context, ['AUDITOR', 'TENANT_ADMIN', 'WORKSPACE_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_ENVIRONMENT_BINDING_WRITE':
        if (!hasAnyRole(context, ['TENANT_ADMIN', 'INTEGRATION_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_ACTOR_READINESS_WRITE':
        if (!hasAnyRole(context, ['TENANT_ADMIN', 'WORKSPACE_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_EVIDENCE_WRITE':
        if (!hasAnyRole(context, ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_PACKAGE_HANDOFF_WRITE':
        if (!hasAnyRole(context, ['TENANT_ADMIN', 'WORKSPACE_ADMIN', 'INTEGRATION_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_ARTIFACT_INTAKE_WRITE':
        if (!hasAnyRole(context, ['REQUESTER', 'OPERATOR', 'TENANT_ADMIN', 'WORKSPACE_ADMIN', 'INTEGRATION_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_ARTIFACT_VERIFY':
        if (!hasAnyRole(context, ['REVIEWER', 'APPROVER', 'TENANT_ADMIN'], workspaceId)) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    case 'PILOT_ARTIFACT_PROMOTE':
        if (input.artifact_kind === 'ENVIRONMENT_BINDING' || input.artifact_kind === 'CONNECTOR_ELIGIBILITY') {
            if (!hasAnyRole(context, ['TENANT_ADMIN', 'INTEGRATION_ADMIN'], workspaceId)) {
                throw new Error('enterprise_action_not_authorized');
            }
            return context;
        }
        if (!hasRole(context, 'TENANT_ADMIN')) {
            throw new Error('enterprise_action_not_authorized');
        }
        return context;
    default:
        throw new Error('enterprise_action_not_authorized');
    }
}

export function assertEnterpriseRoleBound(
    context: EnterpriseAuthorizedSessionContext,
    role: EnterpriseRole,
    workspaceId?: string,
): void {
    if (!hasRole(context, role, workspaceId || context.session.workspace_id)) {
        throw new Error('enterprise_role_not_bound');
    }
}

export function assertInviteEmailMatchesContext(
    context: EnterpriseAuthorizedSessionContext,
    inviteEmail: string,
): void {
    const normalizedInviteEmail = String(inviteEmail || '').trim().toLowerCase();
    if (!normalizedInviteEmail || normalizedInviteEmail !== context.principal.email.trim().toLowerCase()) {
        throw new Error('enterprise_invite_email_mismatch');
    }
}

import crypto from 'node:crypto';
import type {
    EnterpriseAccountShellSummary,
    EnterpriseInviteAcceptanceResult,
    EnterpriseMemberSummary,
    EnterpriseMembershipInviteRecord,
    EnterpriseMembershipSummary,
    EnterpriseModuleAccessSummary,
    EnterpriseRole,
    EnterpriseRoleAssignmentSummary,
    EnterpriseRuntimeDiagnosticsSummary,
} from './contracts.js';
import type { TaskStore } from './store.js';
import {
    assertInviteEmailMatchesContext,
    resolveEnterpriseSessionContext,
    type EnterpriseAuthorizedSessionContext,
} from './enterpriseAuthorization.js';
import { createTaskStore, isEnterpriseWritePersistenceReady, resolveTaskStoreDriverFromEnv } from './storeAdapters.js';

function now(): number {
    return Date.now();
}

function unique<T>(values: T[]): T[] {
    return Array.from(new Set(values));
}

function createOpaqueId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}

function moduleAccessForRoles(roles: EnterpriseRole[]): EnterpriseModuleAccessSummary[] {
    const has = (role: EnterpriseRole) => roles.includes(role);
    return [
        {
            module: 'REQUEST_CENTER',
            access_state: has('REQUESTER') ? 'FULL_ACCESS' : has('WORKSPACE_MEMBER') ? 'READ_ONLY' : 'NOT_ASSIGNED',
            summary: has('REQUESTER') ? 'Can create and manage requests.' : has('WORKSPACE_MEMBER') ? 'Can inspect request context only.' : 'No request center assignment.',
        },
        {
            module: 'APPROVAL_CENTER',
            access_state: has('APPROVER') || has('REVIEWER') ? 'FULL_ACCESS' : 'NOT_ASSIGNED',
            summary: has('APPROVER') || has('REVIEWER') ? 'Can review and/or approve bounded workflow gates.' : 'No approval center assignment.',
        },
        {
            module: 'OPERATIONS_CONSOLE',
            access_state: has('OPERATOR') ? 'FULL_ACCESS' : 'NOT_ASSIGNED',
            summary: has('OPERATOR') ? 'Can operate assigned work and handoffs.' : 'No operations console assignment.',
        },
        {
            module: 'POLICY_GOVERNANCE_CENTER',
            access_state: has('POLICY_GOVERNANCE_ADMIN') ? 'FULL_ACCESS' : has('WORKSPACE_ADMIN') ? 'READ_ONLY' : 'NOT_ASSIGNED',
            summary: has('POLICY_GOVERNANCE_ADMIN') ? 'Can manage policy and rollout state.' : has('WORKSPACE_ADMIN') ? 'Can inspect workspace governance posture.' : 'No policy/governance assignment.',
        },
        {
            module: 'INTEGRATION_READINESS_CENTER',
            access_state: has('TENANT_ADMIN') || has('WORKSPACE_ADMIN') || has('INTEGRATION_ADMIN') ? 'FULL_ACCESS' : 'NOT_ASSIGNED',
            summary: has('TENANT_ADMIN') || has('WORKSPACE_ADMIN') || has('INTEGRATION_ADMIN')
                ? 'Can manage readiness, membership, or integration state.'
                : 'No integration/readiness assignment.',
        },
        {
            module: 'AUDIT_REPORTING_CENTER',
            access_state: has('AUDITOR') ? 'READ_ONLY' : 'NOT_ASSIGNED',
            summary: has('AUDITOR') ? 'Can inspect audit and reporting data in read-only mode.' : 'No audit/reporting assignment.',
        },
    ];
}

function groupRoleMappingSummary(context: EnterpriseAuthorizedSessionContext): string[] {
    return context.active_bindings.map((binding) => {
        const scope = binding.workspace_id ? `workspace ${binding.workspace_id}` : 'tenant scope';
        return `${binding.roles.join(', ')} via ${binding.source} (${scope})`;
    });
}

function toRoleAssignments(context: EnterpriseAuthorizedSessionContext): EnterpriseRoleAssignmentSummary[] {
    return context.active_bindings.flatMap((binding) =>
        binding.roles.map((role) => ({
            principal_id: binding.principal_id,
            binding_id: binding.binding_id,
            role,
            tenant_id: binding.tenant_id,
            workspace_id: binding.workspace_id,
            status: binding.status,
            source: binding.source,
        }))
    );
}

export class EnterpriseAccountService {
    private readonly store: TaskStore;

    constructor(store?: TaskStore) {
        this.store = store || createTaskStore();
    }

    private assertRoleAdmin(context: EnterpriseAuthorizedSessionContext, workspaceId?: string): void {
        const hasTenant = context.active_bindings.some((binding) => binding.roles.includes('TENANT_ADMIN'));
        const hasWorkspace = Boolean(workspaceId) && context.active_bindings.some((binding) =>
            binding.workspace_id === workspaceId && binding.roles.includes('WORKSPACE_ADMIN')
        );
        if (hasTenant || hasWorkspace) return;
        throw new Error('enterprise_admin_access_denied');
    }

    private async listScopedInvites(tenantId: string, workspaceId?: string): Promise<EnterpriseMembershipInviteRecord[]> {
        const invites = await this.store.listEnterpriseMembershipInvites(tenantId, workspaceId);
        const timestamp = now();
        const nextInvites: EnterpriseMembershipInviteRecord[] = [];

        for (const invite of invites) {
            if (invite.status === 'OPEN' && invite.expires_at && invite.expires_at <= timestamp) {
                const expired = await this.store.updateEnterpriseMembershipInvite(invite.invite_id, {
                    status: 'EXPIRED',
                    updated_at: timestamp,
                });
                nextInvites.push(expired || {
                    ...invite,
                    status: 'EXPIRED',
                    updated_at: timestamp,
                });
                continue;
            }
            nextInvites.push(invite);
        }

        return nextInvites.sort((a, b) => b.updated_at - a.updated_at);
    }

    private async upsertManualBinding(input: {
        principalId: string;
        tenantId: string;
        role: EnterpriseRole;
        workspaceId?: string;
    }): Promise<EnterpriseRoleAssignmentSummary> {
        const timestamp = now();
        const existingBinding = (await this.store.listEnterpriseAccessBindings(input.principalId)).find((binding) =>
            binding.tenant_id === input.tenantId
            && binding.workspace_id === input.workspaceId
        );
        if (existingBinding) {
            const nextRoles = unique([...existingBinding.roles, input.role]);
            const updated = await this.store.updateEnterpriseAccessBinding(existingBinding.binding_id, {
                roles: nextRoles,
                updated_at: timestamp,
                status: 'ACTIVE',
                deprovisioned_at: undefined,
            });
            return {
                principal_id: updated!.principal_id,
                binding_id: updated!.binding_id,
                role: input.role,
                tenant_id: updated!.tenant_id,
                workspace_id: updated!.workspace_id,
                status: updated!.status,
                source: updated!.source,
            };
        }

        const bindingId = `ebind_manual_${input.principalId}_${input.role.toLowerCase()}_${timestamp}`;
        await this.store.upsertEnterpriseAccessBinding({
            binding_id: bindingId,
            principal_id: input.principalId,
            tenant_id: input.tenantId,
            workspace_id: input.workspaceId,
            roles: [input.role],
            source: 'MANUAL_ADMIN',
            status: 'ACTIVE',
            provisioned_at: timestamp,
            created_at: timestamp,
            updated_at: timestamp,
        });
        return {
            principal_id: input.principalId,
            binding_id: bindingId,
            role: input.role,
            tenant_id: input.tenantId,
            workspace_id: input.workspaceId,
            status: 'ACTIVE',
            source: 'MANUAL_ADMIN',
        };
    }

    async summarizeAccount(sessionId: string): Promise<EnterpriseAccountShellSummary> {
        const context = await resolveEnterpriseSessionContext(this.store, sessionId);
        const roles = unique(context.active_bindings.flatMap((binding) => binding.roles));
        const pendingInvites = (await this.listScopedInvites(context.session.tenant_id))
            .filter((invite) => invite.email === context.principal.email.toLowerCase())
            .filter((invite) => invite.status === 'OPEN');
        const diagnostics: EnterpriseRuntimeDiagnosticsSummary = {
            provider: context.session.provider,
            tenant_id: context.session.tenant_id,
            workspace_id: context.session.workspace_id,
            store_driver: resolveTaskStoreDriverFromEnv(),
            production_mode: String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production',
            write_persistence_ready: isEnterpriseWritePersistenceReady(),
            session_expires_at: context.session.expires_at,
            session_time_remaining_ms: Math.max(0, context.session.expires_at - now()),
            binding_count: context.active_bindings.length,
            group_count: context.principal.groups.length,
            group_role_mapping_summary: groupRoleMappingSummary(context),
        };
        return {
            session: {
                session_id: context.session.session_id,
                principal_id: context.principal.principal_id,
                email: context.principal.email,
                display_name: context.principal.display_name,
                tenant_id: context.session.tenant_id,
                workspace_id: context.session.workspace_id,
                roles: context.session.roles,
                status: context.session.status,
            },
            active_bindings: toRoleAssignments(context),
            module_access: moduleAccessForRoles(roles),
            role_badges: roles,
            available_roles: roles,
            pending_invites: pendingInvites,
            diagnostics,
            signed_in: true,
            summary: `${context.principal.display_name || context.principal.email} is signed in with ${roles.length} active OA role assignment(s).`,
        };
    }

    async listMembers(sessionId: string, workspaceId?: string): Promise<EnterpriseMembershipSummary> {
        const context = await resolveEnterpriseSessionContext(this.store, sessionId);
        this.assertRoleAdmin(context, workspaceId || context.session.workspace_id);
        const principals = await this.store.listEnterprisePrincipals();
        const bindings = await this.store.listEnterpriseAccessBindings();
        const invites = await this.listScopedInvites(context.session.tenant_id, workspaceId);

        const members: EnterpriseMemberSummary[] = principals
            .filter((principal) => principal.tenant_id === context.session.tenant_id)
            .map((principal) => {
                const principalBindings = bindings.filter((binding) =>
                    binding.principal_id === principal.principal_id
                    && binding.tenant_id === context.session.tenant_id
                    && (workspaceId === undefined || binding.workspace_id === workspaceId)
                );
                return {
                    principal_id: principal.principal_id,
                    email: principal.email,
                    display_name: principal.display_name,
                    status: principal.status,
                    tenant_id: principal.tenant_id,
                    workspace_ids: unique(principalBindings.map((binding) => String(binding.workspace_id || '')).filter(Boolean)),
                    role_assignments: principalBindings.flatMap((binding) =>
                        binding.roles.map((role) => ({
                            principal_id: binding.principal_id,
                            binding_id: binding.binding_id,
                            role,
                            tenant_id: binding.tenant_id,
                            workspace_id: binding.workspace_id,
                            status: binding.status,
                            source: binding.source,
                        }))
                    ),
                };
            });

        return {
            generated_at: now(),
            tenant_id: context.session.tenant_id,
            workspace_id: workspaceId || context.session.workspace_id,
            member_count: members.length,
            invite_count: invites.length,
            members,
            invites,
        };
    }

    async assignRole(input: {
        sessionId: string;
        principalId: string;
        role: EnterpriseRole;
        workspaceId?: string;
    }): Promise<EnterpriseRoleAssignmentSummary> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        this.assertRoleAdmin(context, input.workspaceId || context.session.workspace_id);
        const principal = await this.store.getEnterprisePrincipal(input.principalId);
        if (!principal) {
            throw new Error('enterprise_principal_not_found');
        }
        return this.upsertManualBinding({
            principalId: principal.principal_id,
            tenantId: context.session.tenant_id,
            workspaceId: input.workspaceId || context.session.workspace_id,
            role: input.role,
        });
    }

    async removeRole(input: {
        sessionId: string;
        principalId: string;
        role: EnterpriseRole;
        workspaceId?: string;
    }): Promise<void> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        this.assertRoleAdmin(context, input.workspaceId || context.session.workspace_id);
        const bindings = await this.store.listEnterpriseAccessBindings(input.principalId);
        const target = bindings.find((binding) =>
            binding.tenant_id === context.session.tenant_id
            && binding.workspace_id === (input.workspaceId || context.session.workspace_id)
            && binding.roles.includes(input.role)
            && binding.status === 'ACTIVE'
        );
        if (!target) return;
        const nextRoles = target.roles.filter((role) => role !== input.role);
        await this.store.updateEnterpriseAccessBinding(target.binding_id, {
            roles: nextRoles,
            status: nextRoles.length === 0 ? 'INACTIVE' : 'ACTIVE',
            updated_at: now(),
        });
    }

    async inviteMember(input: {
        sessionId: string;
        email: string;
        role: EnterpriseRole;
        workspaceId?: string;
    }): Promise<EnterpriseMembershipInviteRecord> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        this.assertRoleAdmin(context, input.workspaceId || context.session.workspace_id);
        const timestamp = now();
        const invite: EnterpriseMembershipInviteRecord = {
            invite_id: `eminvite_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
            tenant_id: context.session.tenant_id,
            workspace_id: input.workspaceId || context.session.workspace_id,
            email: input.email.trim().toLowerCase(),
            role: input.role,
            invite_token: createOpaqueId('einvite'),
            invited_by_principal_id: context.principal.principal_id,
            invited_by_label: context.principal.display_name || context.principal.email,
            status: 'OPEN',
            expires_at: timestamp + (7 * 24 * 60 * 60 * 1000),
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.store.upsertEnterpriseMembershipInvite(invite);
        return invite;
    }

    async listInvites(input: {
        sessionId: string;
        workspaceId?: string;
    }): Promise<EnterpriseMembershipInviteRecord[]> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        const workspaceId = input.workspaceId || context.session.workspace_id;
        const isAdmin = context.active_bindings.some((binding) =>
            binding.roles.includes('TENANT_ADMIN')
            || (workspaceId && binding.workspace_id === workspaceId && binding.roles.includes('WORKSPACE_ADMIN'))
        );
        const invites = await this.listScopedInvites(context.session.tenant_id, isAdmin ? workspaceId : undefined);
        if (isAdmin) return invites;
        return invites.filter((invite) => invite.email === context.principal.email.toLowerCase());
    }

    async acceptInvite(input: {
        sessionId: string;
        inviteToken: string;
    }): Promise<EnterpriseInviteAcceptanceResult> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        const invite = (await this.listScopedInvites(context.session.tenant_id))
            .find((item) => item.invite_token === String(input.inviteToken || '').trim());
        if (!invite) {
            throw new Error('enterprise_membership_invite_not_found');
        }
        if (invite.status !== 'OPEN') {
            throw new Error('enterprise_membership_invite_not_open');
        }
        assertInviteEmailMatchesContext(context, invite.email);

        await this.upsertManualBinding({
            principalId: context.principal.principal_id,
            tenantId: invite.tenant_id,
            workspaceId: invite.workspace_id,
            role: invite.role,
        });
        const acceptedAt = now();
        const acceptedInvite = await this.store.updateEnterpriseMembershipInvite(invite.invite_id, {
            status: 'ACCEPTED',
            accepted_at: acceptedAt,
            accepted_principal_id: context.principal.principal_id,
            updated_at: acceptedAt,
        });
        const activeBindings = (await this.store.listEnterpriseAccessBindings(context.principal.principal_id))
            .filter((binding) => binding.status === 'ACTIVE');
        const sessionRoles = unique(activeBindings.flatMap((binding) => binding.roles));
        await this.store.updateEnterpriseIdentitySession(context.session.session_id, {
            workspace_id: invite.workspace_id || context.session.workspace_id,
            roles: sessionRoles,
            updated_at: acceptedAt,
        });
        return {
            invite: acceptedInvite || {
                ...invite,
                status: 'ACCEPTED',
                accepted_at: acceptedAt,
                accepted_principal_id: context.principal.principal_id,
                updated_at: acceptedAt,
            },
            principal: context.principal,
            active_bindings: activeBindings,
        };
    }

    async revokeInvite(input: {
        sessionId: string;
        inviteId: string;
    }): Promise<EnterpriseMembershipInviteRecord> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        const invite = await this.store.getEnterpriseMembershipInvite(input.inviteId);
        if (!invite) {
            throw new Error('enterprise_membership_invite_not_found');
        }
        this.assertRoleAdmin(context, invite.workspace_id || context.session.workspace_id);
        const revoked = await this.store.updateEnterpriseMembershipInvite(invite.invite_id, {
            status: 'REVOKED',
            updated_at: now(),
        });
        return revoked || {
            ...invite,
            status: 'REVOKED',
            updated_at: now(),
        };
    }

    async deactivateMember(input: {
        sessionId: string;
        principalId: string;
    }): Promise<void> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        this.assertRoleAdmin(context, context.session.workspace_id);
        const timestamp = now();
        await this.store.updateEnterprisePrincipal(input.principalId, {
            status: 'SUSPENDED',
            updated_at: timestamp,
        });
        const bindings = await this.store.listEnterpriseAccessBindings(input.principalId);
        for (const binding of bindings) {
            await this.store.updateEnterpriseAccessBinding(binding.binding_id, {
                status: 'INACTIVE',
                updated_at: timestamp,
                deprovisioned_at: timestamp,
            });
        }
        const sessions = await this.store.listEnterpriseIdentitySessions(input.principalId);
        for (const session of sessions) {
            if (session.status === 'ACTIVE') {
                await this.store.updateEnterpriseIdentitySession(session.session_id, {
                    status: 'REVOKED',
                    revoked_at: timestamp,
                    revocation_reason: 'enterprise_member_deactivated',
                    updated_at: timestamp,
                });
            }
        }
    }

    async reactivateMember(input: {
        sessionId: string;
        principalId: string;
    }): Promise<void> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        this.assertRoleAdmin(context, context.session.workspace_id);
        const timestamp = now();
        const principal = await this.store.getEnterprisePrincipal(input.principalId);
        if (!principal) {
            throw new Error('enterprise_principal_not_found');
        }
        if (principal.status === 'DEPROVISIONED') {
            throw new Error('enterprise_principal_deprovisioned');
        }
        await this.store.updateEnterprisePrincipal(input.principalId, {
            status: 'ACTIVE',
            updated_at: timestamp,
        });
        const bindings = await this.store.listEnterpriseAccessBindings(input.principalId);
        for (const binding of bindings) {
            if (binding.status !== 'ACTIVE') {
                await this.store.updateEnterpriseAccessBinding(binding.binding_id, {
                    status: 'ACTIVE',
                    deprovisioned_at: undefined,
                    updated_at: timestamp,
                });
            }
        }
    }
}

let enterpriseAccountServiceSingleton: EnterpriseAccountService | null = null;

export function getEnterpriseAccountService(): EnterpriseAccountService {
    if (!enterpriseAccountServiceSingleton) {
        enterpriseAccountServiceSingleton = new EnterpriseAccountService();
    }
    return enterpriseAccountServiceSingleton;
}

export function resetEnterpriseAccountServiceForTests(): void {
    enterpriseAccountServiceSingleton = null;
}

export function setEnterpriseAccountServiceForTests(service: EnterpriseAccountService): void {
    enterpriseAccountServiceSingleton = service;
}

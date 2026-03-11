import crypto, { type JsonWebKey as NodeJsonWebKey } from 'node:crypto';
import type {
    EnterpriseAccessBindingRecord,
    EnterpriseAccessBindingStatus,
    EnterpriseAccountShellSummary,
    EnterpriseIdentitySessionRecord,
    EnterpriseMembershipInviteRecord,
    EnterpriseMembershipSummary,
    EnterpriseMemberSummary,
    EnterprisePrincipalRecord,
    EnterprisePrincipalStatus,
    EnterpriseRole,
    EnterpriseRoleAssignmentSummary,
    EnterpriseModuleAccessSummary,
    EnterpriseSessionStatus,
    OidcAuthorizationStartResult,
    OidcCodeExchangeInput,
    OidcCodeExchangePort,
    PilotIdentityGroupRoleMapping,
    PilotIdentityProviderConfig,
    VerifiedOidcIdentity,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { createTaskStore, resolveTaskStoreDriverFromEnv } from './storeAdapters.js';

export interface EnterpriseAuthenticationResult {
    principal: EnterprisePrincipalRecord;
    session: EnterpriseIdentitySessionRecord;
    active_bindings: EnterpriseAccessBindingRecord[];
}

export interface EnterpriseDirectorySyncUpdate {
    external_subject: string;
    email: string;
    display_name?: string;
    groups?: string[];
    status?: EnterprisePrincipalStatus;
    workspace_id?: string;
}

export interface EnterpriseDirectorySyncInput {
    session_id: string;
    workspace_id?: string;
    updates: EnterpriseDirectorySyncUpdate[];
}

export interface EnterpriseDirectorySyncResult {
    updated_count: number;
    deprovisioned_count: number;
    suspended_count: number;
    reactivated_count: number;
    bindings_updated: number;
    bindings_deactivated: number;
    sessions_revoked: number;
    principals: EnterprisePrincipalRecord[];
}

export interface EnterpriseAdminSessionContext {
    principal: EnterprisePrincipalRecord;
    session: EnterpriseIdentitySessionRecord;
    active_bindings: EnterpriseAccessBindingRecord[];
}

export interface EnterpriseIdentityAdminServiceOptions {
    store?: TaskStore;
    config?: PilotIdentityProviderConfig;
    oidcCodeExchangePort?: OidcCodeExchangePort;
    now?: () => number;
}

interface DesiredBinding {
    binding_id: string;
    tenant_id: string;
    workspace_id?: string;
    roles: EnterpriseRole[];
    source_group?: string;
}

interface BindingSyncResult {
    active_bindings: EnterpriseAccessBindingRecord[];
    updated_count: number;
    deactivated_count: number;
}

interface JwkSetResponse {
    keys?: Array<NodeJsonWebKey & { kid?: string }>;
}

interface OidcDiscoveryDocument {
    authorization_endpoint?: string;
    token_endpoint?: string;
    jwks_uri?: string;
}

const ENTERPRISE_ROLE_ORDER: readonly EnterpriseRole[] = [
    'TENANT_ADMIN',
    'WORKSPACE_ADMIN',
    'POLICY_GOVERNANCE_ADMIN',
    'INTEGRATION_ADMIN',
    'AUDITOR',
    'REQUESTER',
    'APPROVER',
    'OPERATOR',
    'REVIEWER',
    'WORKSPACE_MEMBER',
];

function currentTime(): number {
    return Date.now();
}

function normalizeIssuer(value: string): string {
    return String(value || '').trim().replace(/\/+$/, '');
}

function parseRole(raw: string): EnterpriseRole | undefined {
    const normalized = String(raw || '').trim().toUpperCase();
    if (normalized === 'TENANT_ADMIN') return 'TENANT_ADMIN';
    if (normalized === 'WORKSPACE_ADMIN') return 'WORKSPACE_ADMIN';
    if (normalized === 'POLICY_GOVERNANCE_ADMIN') return 'POLICY_GOVERNANCE_ADMIN';
    if (normalized === 'INTEGRATION_ADMIN') return 'INTEGRATION_ADMIN';
    if (normalized === 'AUDITOR') return 'AUDITOR';
    if (normalized === 'REQUESTER') return 'REQUESTER';
    if (normalized === 'APPROVER') return 'APPROVER';
    if (normalized === 'OPERATOR') return 'OPERATOR';
    if (normalized === 'REVIEWER') return 'REVIEWER';
    if (normalized === 'WORKSPACE_MEMBER') return 'WORKSPACE_MEMBER';
    return undefined;
}

function uniqueRoles(roles: EnterpriseRole[]): EnterpriseRole[] {
    return ENTERPRISE_ROLE_ORDER.filter((role) => roles.includes(role));
}

function moduleAccessForRoles(roles: EnterpriseRole[]): EnterpriseModuleAccessSummary[] {
    const has = (role: EnterpriseRole) => roles.includes(role);
    return [
        {
            module: 'REQUEST_CENTER',
            access_state: has('REQUESTER') ? 'FULL_ACCESS' : has('WORKSPACE_MEMBER') ? 'READ_ONLY' : 'NOT_ASSIGNED',
            summary: has('REQUESTER') ? 'Can create and manage requests.' : has('WORKSPACE_MEMBER') ? 'Can view request context only.' : 'No request-center assignment.',
        },
        {
            module: 'APPROVAL_CENTER',
            access_state: has('APPROVER') || has('REVIEWER') ? 'FULL_ACCESS' : 'NOT_ASSIGNED',
            summary: has('APPROVER') || has('REVIEWER') ? 'Can review and/or approve bounded workflow gates.' : 'No approval-center assignment.',
        },
        {
            module: 'OPERATIONS_CONSOLE',
            access_state: has('OPERATOR') ? 'FULL_ACCESS' : 'NOT_ASSIGNED',
            summary: has('OPERATOR') ? 'Can operate assigned work and handoffs.' : 'No operations-console assignment.',
        },
        {
            module: 'POLICY_GOVERNANCE_CENTER',
            access_state: has('POLICY_GOVERNANCE_ADMIN') ? 'FULL_ACCESS' : has('WORKSPACE_ADMIN') ? 'READ_ONLY' : 'NOT_ASSIGNED',
            summary: has('POLICY_GOVERNANCE_ADMIN') ? 'Can manage policy and governance state.' : has('WORKSPACE_ADMIN') ? 'Can inspect workspace governance posture.' : 'No policy/governance assignment.',
        },
        {
            module: 'INTEGRATION_READINESS_CENTER',
            access_state: has('TENANT_ADMIN') || has('INTEGRATION_ADMIN') || has('WORKSPACE_ADMIN') ? 'FULL_ACCESS' : 'NOT_ASSIGNED',
            summary: has('TENANT_ADMIN') || has('INTEGRATION_ADMIN') || has('WORKSPACE_ADMIN')
                ? 'Can inspect or manage readiness, membership, and integration state.'
                : 'No readiness-center assignment.',
        },
        {
            module: 'AUDIT_REPORTING_CENTER',
            access_state: has('AUDITOR') ? 'READ_ONLY' : 'NOT_ASSIGNED',
            summary: has('AUDITOR') ? 'Read-only audit and reporting access.' : 'No audit/reporting assignment.',
        },
    ];
}

function bindingToRoleAssignment(binding: EnterpriseAccessBindingRecord): EnterpriseRoleAssignmentSummary[] {
    return binding.roles.map((role) => ({
        principal_id: binding.principal_id,
        binding_id: binding.binding_id,
        role,
        tenant_id: binding.tenant_id,
        workspace_id: binding.workspace_id,
        status: binding.status,
        source: binding.source,
    }));
}

function normalizeGroups(groups: unknown): string[] {
    if (!Array.isArray(groups)) return [];
    return Array.from(
        new Set(
            groups
                .map((group) => String(group || '').trim())
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));
}

function parseRolesCsv(raw: string | undefined): EnterpriseRole[] {
    return uniqueRoles(
        String(raw || '')
            .split(',')
            .map((role) => parseRole(role))
            .filter((role): role is EnterpriseRole => Boolean(role))
    );
}

function parseScopes(raw: string | undefined): string[] {
    const scopes = String(raw || 'openid profile email groups')
        .split(/[,\s]+/)
        .map((scope) => scope.trim())
        .filter(Boolean);
    return Array.from(new Set(scopes));
}

function parseGroupRoleMappings(raw: string | undefined): PilotIdentityGroupRoleMapping[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap((entry): PilotIdentityGroupRoleMapping[] => {
            const groupName = String(entry?.group_name || '').trim();
            const tenantId = String(entry?.tenant_id || '').trim();
            const workspaceId = String(entry?.workspace_id || '').trim() || undefined;
            const roles = uniqueRoles(
                Array.isArray(entry?.roles)
                    ? entry.roles
                        .map((role) => parseRole(String(role || '')))
                        .filter((role): role is EnterpriseRole => Boolean(role))
                    : []
            );
            if (!groupName || !tenantId || roles.length === 0) return [];
            return [{
                group_name: groupName,
                tenant_id: tenantId,
                workspace_id: workspaceId,
                roles,
            }];
        });
    } catch {
        return [];
    }
}

export function resolvePilotIdentityProviderConfigFromEnv(): PilotIdentityProviderConfig | undefined {
    const issuer = normalizeIssuer(process.env.AGENT_KERNEL_OKTA_ISSUER || '');
    const clientId = String(process.env.AGENT_KERNEL_OKTA_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.AGENT_KERNEL_OKTA_CLIENT_SECRET || '').trim();
    const tenantId = String(process.env.AGENT_KERNEL_PILOT_TENANT_ID || '').trim();
    if (!issuer || !clientId || !clientSecret || !tenantId) return undefined;

    return {
        provider: 'OKTA_OIDC',
        tenant_id: tenantId,
        issuer,
        client_id: clientId,
        client_secret: clientSecret,
        default_workspace_id: String(process.env.AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID || '').trim() || undefined,
        scopes: parseScopes(process.env.AGENT_KERNEL_OKTA_SCOPES),
        groups_claim: String(process.env.AGENT_KERNEL_OKTA_GROUPS_CLAIM || 'groups').trim() || 'groups',
        email_claim: String(process.env.AGENT_KERNEL_OKTA_EMAIL_CLAIM || 'email').trim() || 'email',
        name_claim: String(process.env.AGENT_KERNEL_OKTA_NAME_CLAIM || 'name').trim() || 'name',
        subject_claim: String(process.env.AGENT_KERNEL_OKTA_SUBJECT_CLAIM || 'sub').trim() || 'sub',
        default_roles: parseRolesCsv(process.env.AGENT_KERNEL_OKTA_DEFAULT_ROLES),
        group_role_mappings: parseGroupRoleMappings(process.env.AGENT_KERNEL_OKTA_GROUP_ROLE_MAPPINGS),
    };
}

function safeStringClaim(payload: Record<string, unknown>, claimName: string | undefined): string | undefined {
    if (!claimName) return undefined;
    const raw = payload[claimName];
    if (typeof raw !== 'string') return undefined;
    const value = raw.trim();
    return value || undefined;
}

function safeStringArrayClaim(payload: Record<string, unknown>, claimName: string | undefined): string[] {
    if (!claimName) return [];
    return normalizeGroups(payload[claimName]);
}

function base64UrlToBuffer(value: string): Buffer {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, 'base64');
}

function decodeJwtSection(section: string): Record<string, unknown> {
    const decoded = base64UrlToBuffer(section).toString('utf8');
    return JSON.parse(decoded) as Record<string, unknown>;
}

function createOpaqueId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}

function createDeterministicId(prefix: string, ...parts: Array<string | undefined>): string {
    const digest = crypto
        .createHash('sha256')
        .update(parts.map((part) => String(part || '')).join('|'))
        .digest('hex')
        .slice(0, 24);
    return `${prefix}_${digest}`;
}

function buildBindingKey(principalId: string, tenantId: string, workspaceId: string | undefined, sourceGroup?: string): string {
    return createDeterministicId(
        'ebind',
        principalId,
        tenantId,
        workspaceId || '',
        sourceGroup || '__default__'
    );
}

function buildAuthorizeUrl(config: PilotIdentityProviderConfig, redirectUri: string, state: string, nonce: string): string {
    const url = new URL(`${normalizeIssuer(config.issuer)}/v1/authorize`);
    url.searchParams.set('client_id', config.client_id);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', config.scopes.join(' '));
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    return url.toString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`oidc_request_failed:${response.status}`);
    }
    return response.json() as Promise<T>;
}

class OktaOidcCodeExchangePort implements OidcCodeExchangePort {
    async exchangeAuthorizationCode(input: OidcCodeExchangeInput): Promise<VerifiedOidcIdentity> {
        const discovery = await fetchJson<OidcDiscoveryDocument>(`${normalizeIssuer(input.config.issuer)}/.well-known/openid-configuration`);
        const tokenEndpoint = discovery.token_endpoint || `${normalizeIssuer(input.config.issuer)}/v1/token`;
        const jwksUri = discovery.jwks_uri || `${normalizeIssuer(input.config.issuer)}/v1/keys`;

        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code');
        body.set('code', input.code);
        body.set('redirect_uri', input.redirect_uri);

        const basicAuth = Buffer
            .from(`${input.config.client_id}:${input.config.client_secret}`, 'utf8')
            .toString('base64');

        const tokenResponse = await fetchJson<Record<string, unknown>>(tokenEndpoint, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });

        const idToken = String(tokenResponse.id_token || '').trim();
        if (!idToken) {
            throw new Error('oidc_missing_id_token');
        }

        const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
        if (!encodedHeader || !encodedPayload || !encodedSignature) {
            throw new Error('oidc_invalid_jwt');
        }

        const header = decodeJwtSection(encodedHeader);
        const payload = decodeJwtSection(encodedPayload);
        if (String(header.alg || '') !== 'RS256') {
            throw new Error('oidc_unsupported_alg');
        }

        const kid = String(header.kid || '').trim();
        if (!kid) {
            throw new Error('oidc_missing_kid');
        }

        const jwkSet = await fetchJson<JwkSetResponse>(jwksUri);
        const jwk = (jwkSet.keys || []).find((candidate) => String(candidate?.kid || '') === kid);
        if (!jwk) {
            throw new Error('oidc_signing_key_not_found');
        }

        const publicKey = crypto.createPublicKey({
            key: jwk as NodeJsonWebKey,
            format: 'jwk',
        });
        const verified = crypto.verify(
            'RSA-SHA256',
            Buffer.from(`${encodedHeader}.${encodedPayload}`),
            publicKey,
            base64UrlToBuffer(encodedSignature)
        );
        if (!verified) {
            throw new Error('oidc_signature_invalid');
        }

        const issuer = safeStringClaim(payload, 'iss');
        if (issuer !== normalizeIssuer(input.config.issuer)) {
            throw new Error('oidc_invalid_issuer');
        }

        const subject = safeStringClaim(payload, input.config.subject_claim || 'sub');
        if (!subject) {
            throw new Error('oidc_missing_subject');
        }

        const audience = payload.aud as string | string[] | undefined;
        const audienceList = Array.isArray(audience)
            ? audience.map((value) => String(value || '').trim()).filter(Boolean)
            : typeof audience === 'string'
                ? [audience.trim()]
                : [];
        if (!audienceList.includes(input.config.client_id)) {
            throw new Error('oidc_invalid_audience');
        }

        const exp = Number(payload.exp || 0);
        const iat = Number(payload.iat || 0);
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (!Number.isFinite(exp) || exp <= nowSeconds) {
            throw new Error('oidc_token_expired');
        }

        const nonce = safeStringClaim(payload, 'nonce');
        if (!nonce || nonce !== input.nonce) {
            throw new Error('oidc_invalid_nonce');
        }

        const email = safeStringClaim(payload, input.config.email_claim || 'email');
        if (!email) {
            throw new Error('oidc_missing_email');
        }

        return {
            provider: input.config.provider,
            tenant_id: input.config.tenant_id,
            issuer: issuer || normalizeIssuer(input.config.issuer),
            subject,
            audience: Array.isArray(audience) ? audienceList : audienceList[0] || input.config.client_id,
            email,
            display_name: safeStringClaim(payload, input.config.name_claim || 'name'),
            groups: safeStringArrayClaim(payload, input.config.groups_claim || 'groups'),
            idp_session_id: safeStringClaim(payload, 'sid'),
            issued_at: iat > 0 ? iat * 1000 : Date.now(),
            expires_at: exp * 1000,
            claims: payload,
        };
    }
}

export class EnterpriseIdentityAdminService {
    private readonly store: TaskStore;
    private readonly config?: PilotIdentityProviderConfig;
    private readonly oidcCodeExchangePort: OidcCodeExchangePort;
    private readonly now: () => number;

    constructor(options?: EnterpriseIdentityAdminServiceOptions) {
        this.store = options?.store || createTaskStore({
            driver: resolveTaskStoreDriverFromEnv(),
        });
        this.config = options?.config || resolvePilotIdentityProviderConfigFromEnv();
        this.oidcCodeExchangePort = options?.oidcCodeExchangePort || new OktaOidcCodeExchangePort();
        this.now = options?.now || currentTime;
    }

    private requireConfig(): PilotIdentityProviderConfig {
        if (!this.config) {
            throw new Error('pilot_identity_provider_not_configured');
        }
        return this.config;
    }

    private roleSort(roles: EnterpriseRole[]): EnterpriseRole[] {
        return uniqueRoles(roles);
    }

    private async revokeActiveSessions(principalId: string, reason: string): Promise<number> {
        const sessions = await this.store.listEnterpriseIdentitySessions(principalId);
        const activeSessions = sessions.filter((session) => session.status === 'ACTIVE');
        for (const session of activeSessions) {
            await this.store.updateEnterpriseIdentitySession(session.session_id, {
                status: 'REVOKED',
                revoked_at: this.now(),
                revocation_reason: reason,
                updated_at: this.now(),
            });
        }
        return activeSessions.length;
    }

    private buildGroupDerivedBindings(
        principalId: string,
        groups: string[],
        source: 'OIDC_LOGIN' | 'SCIM_SYNC',
        workspaceOverride?: string
    ): DesiredBinding[] {
        const config = this.requireConfig();
        const merged = new Map<string, DesiredBinding>();
        const matchingMappings = config.group_role_mappings.filter((mapping) => groups.includes(mapping.group_name));
        for (const mapping of matchingMappings) {
            const workspaceId = mapping.workspace_id || workspaceOverride || config.default_workspace_id;
            const bindingId = buildBindingKey(principalId, mapping.tenant_id, workspaceId, mapping.group_name);
            const existing = merged.get(bindingId);
            merged.set(bindingId, {
                binding_id: bindingId,
                tenant_id: mapping.tenant_id,
                workspace_id: workspaceId,
                source_group: mapping.group_name,
                roles: this.roleSort([...(existing?.roles || []), ...mapping.roles]),
            });
        }

        if (source === 'OIDC_LOGIN' && (config.default_roles || []).length > 0) {
            const workspaceId = workspaceOverride || config.default_workspace_id;
            const bindingId = buildBindingKey(principalId, config.tenant_id, workspaceId);
            const existing = merged.get(bindingId);
            merged.set(bindingId, {
                binding_id: bindingId,
                tenant_id: config.tenant_id,
                workspace_id: workspaceId,
                roles: this.roleSort([...(existing?.roles || []), ...(config.default_roles || [])]),
            });
        }

        return Array.from(merged.values())
            .filter((binding) => binding.roles.length > 0)
            .sort((a, b) => a.binding_id.localeCompare(b.binding_id));
    }

    private async syncBindings(
        principalId: string,
        desiredBindings: DesiredBinding[],
        source: 'OIDC_LOGIN' | 'SCIM_SYNC'
    ): Promise<BindingSyncResult> {
        const existing = await this.store.listEnterpriseAccessBindings(principalId);
        const desiredIds = new Set(desiredBindings.map((binding) => binding.binding_id));
        let updatedCount = 0;
        let deactivatedCount = 0;

        for (const desired of desiredBindings) {
            const existingBinding = existing.find((binding) => binding.binding_id === desired.binding_id);
            const timestamp = this.now();
            const nextBinding: EnterpriseAccessBindingRecord = {
                binding_id: desired.binding_id,
                principal_id: principalId,
                tenant_id: desired.tenant_id,
                workspace_id: desired.workspace_id,
                roles: desired.roles,
                source,
                source_group: desired.source_group,
                status: 'ACTIVE',
                provisioned_at: existingBinding?.provisioned_at || timestamp,
                deprovisioned_at: undefined,
                created_at: existingBinding?.created_at || timestamp,
                updated_at: timestamp,
            };
            await this.store.upsertEnterpriseAccessBinding(nextBinding);
            updatedCount += 1;
        }

        for (const binding of existing) {
            if (!binding.status || binding.status === 'INACTIVE') continue;
            if (desiredIds.has(binding.binding_id)) continue;
            if (!binding.source_group && binding.source === 'OIDC_LOGIN' && source === 'SCIM_SYNC') {
                continue;
            }
            const nextStatus: EnterpriseAccessBindingStatus = 'INACTIVE';
            await this.store.updateEnterpriseAccessBinding(binding.binding_id, {
                status: nextStatus,
                deprovisioned_at: this.now(),
                updated_at: this.now(),
            });
            deactivatedCount += 1;
        }

        const activeBindings = (await this.store.listEnterpriseAccessBindings(principalId))
            .filter((binding) => binding.status === 'ACTIVE')
            .sort((a, b) => a.binding_id.localeCompare(b.binding_id));
        return {
            active_bindings: activeBindings,
            updated_count: updatedCount,
            deactivated_count: deactivatedCount,
        };
    }

    private principalIdForSubject(externalSubject: string): string {
        const config = this.requireConfig();
        return createDeterministicId(
            'eprincipal',
            config.provider,
            config.tenant_id,
            externalSubject
        );
    }

    private buildSessionRoles(bindings: EnterpriseAccessBindingRecord[]): EnterpriseRole[] {
        return this.roleSort(bindings.flatMap((binding) => binding.roles));
    }

    private chooseWorkspaceId(
        requestedWorkspaceId: string | undefined,
        bindings: EnterpriseAccessBindingRecord[]
    ): string | undefined {
        if (requestedWorkspaceId) return requestedWorkspaceId;
        const workspaceBinding = bindings.find((binding) => Boolean(binding.workspace_id));
        return workspaceBinding?.workspace_id;
    }

    async startAuthorization(input: { redirect_uri: string; workspace_id?: string }): Promise<OidcAuthorizationStartResult> {
        const config = this.requireConfig();
        const redirectUri = String(input.redirect_uri || '').trim();
        if (!redirectUri) {
            throw new Error('missing_redirect_uri');
        }
        const stateId = createOpaqueId('oidc_state');
        const nonce = createOpaqueId('oidc_nonce');
        const createdAt = this.now();
        const expiresAt = createdAt + (10 * 60 * 1000);
        await this.store.upsertOidcLoginState({
            state_id: stateId,
            provider: config.provider,
            tenant_id: config.tenant_id,
            workspace_id: String(input.workspace_id || '').trim() || undefined,
            redirect_uri: redirectUri,
            nonce,
            status: 'PENDING',
            expires_at: expiresAt,
            created_at: createdAt,
            updated_at: createdAt,
        });

        return {
            provider: config.provider,
            tenant_id: config.tenant_id,
            workspace_id: String(input.workspace_id || '').trim() || undefined,
            authorize_url: buildAuthorizeUrl(config, redirectUri, stateId, nonce),
            state: stateId,
            nonce,
            expires_at: expiresAt,
        };
    }

    async exchangeAuthorizationCode(input: {
        state: string;
        code: string;
        redirect_uri: string;
    }): Promise<EnterpriseAuthenticationResult> {
        const config = this.requireConfig();
        const stateId = String(input.state || '').trim();
        const redirectUri = String(input.redirect_uri || '').trim();
        const code = String(input.code || '').trim();
        if (!stateId || !redirectUri || !code) {
            throw new Error('missing_oidc_exchange_fields');
        }

        const loginState = await this.store.getOidcLoginState(stateId);
        if (!loginState) {
            throw new Error('oidc_state_not_found');
        }
        if (loginState.status !== 'PENDING') {
            throw new Error('oidc_state_not_pending');
        }
        if (loginState.redirect_uri !== redirectUri) {
            throw new Error('oidc_redirect_uri_mismatch');
        }
        if (loginState.expires_at <= this.now()) {
            await this.store.updateOidcLoginState(stateId, {
                status: 'EXPIRED',
                updated_at: this.now(),
            });
            throw new Error('oidc_state_expired');
        }

        await this.store.updateOidcLoginState(stateId, {
            status: 'CONSUMED',
            consumed_at: this.now(),
            updated_at: this.now(),
        });

        const verifiedIdentity = await this.oidcCodeExchangePort.exchangeAuthorizationCode({
            config,
            code,
            redirect_uri: redirectUri,
            nonce: loginState.nonce,
        });

        if (verifiedIdentity.provider !== config.provider || verifiedIdentity.tenant_id !== config.tenant_id) {
            throw new Error('oidc_identity_provider_mismatch');
        }

        const principalId = this.principalIdForSubject(verifiedIdentity.subject);
        const existingPrincipal = await this.store.getEnterprisePrincipal(principalId);
        if (existingPrincipal?.status === 'DEPROVISIONED' || existingPrincipal?.status === 'SUSPENDED') {
            throw new Error('enterprise_principal_not_active');
        }

        const principalTimestamp = this.now();
        const principal: EnterprisePrincipalRecord = {
            principal_id: principalId,
            provider: config.provider,
            tenant_id: config.tenant_id,
            external_subject: verifiedIdentity.subject,
            email: verifiedIdentity.email,
            display_name: verifiedIdentity.display_name,
            groups: normalizeGroups(verifiedIdentity.groups),
            status: 'ACTIVE',
            last_login_at: principalTimestamp,
            last_directory_sync_at: existingPrincipal?.last_directory_sync_at,
            created_at: existingPrincipal?.created_at || principalTimestamp,
            updated_at: principalTimestamp,
        };
        await this.store.upsertEnterprisePrincipal(principal);

        const bindingSync = await this.syncBindings(
            principalId,
            this.buildGroupDerivedBindings(principalId, principal.groups, 'OIDC_LOGIN', loginState.workspace_id),
            'OIDC_LOGIN'
        );
        if (bindingSync.active_bindings.length === 0) {
            throw new Error('enterprise_access_not_granted');
        }

        const sessionCreatedAt = this.now();
        const session: EnterpriseIdentitySessionRecord = {
            session_id: createOpaqueId('entsess'),
            principal_id: principalId,
            provider: config.provider,
            tenant_id: config.tenant_id,
            workspace_id: this.chooseWorkspaceId(loginState.workspace_id, bindingSync.active_bindings),
            roles: this.buildSessionRoles(bindingSync.active_bindings),
            status: 'ACTIVE',
            claims: {
                issuer: verifiedIdentity.issuer,
                subject: verifiedIdentity.subject,
                audience: verifiedIdentity.audience,
                email: verifiedIdentity.email,
                display_name: verifiedIdentity.display_name,
                groups: principal.groups,
                nonce: loginState.nonce,
            },
            idp_session_id: verifiedIdentity.idp_session_id,
            issued_at: verifiedIdentity.issued_at,
            expires_at: verifiedIdentity.expires_at,
            last_seen_at: sessionCreatedAt,
            created_at: sessionCreatedAt,
            updated_at: sessionCreatedAt,
        };
        await this.store.upsertEnterpriseIdentitySession(session);

        return {
            principal,
            session,
            active_bindings: bindingSync.active_bindings,
        };
    }

    async resolveAdminSession(sessionId: string): Promise<EnterpriseAdminSessionContext> {
        const normalizedSessionId = String(sessionId || '').trim();
        if (!normalizedSessionId) {
            throw new Error('missing_enterprise_session');
        }

        const session = await this.store.getEnterpriseIdentitySession(normalizedSessionId);
        if (!session) {
            throw new Error('enterprise_session_not_found');
        }
        if (session.status !== 'ACTIVE') {
            throw new Error('enterprise_session_not_active');
        }
        if (session.expires_at <= this.now()) {
            await this.store.updateEnterpriseIdentitySession(session.session_id, {
                status: 'EXPIRED',
                updated_at: this.now(),
            });
            throw new Error('enterprise_session_expired');
        }

        const principal = await this.store.getEnterprisePrincipal(session.principal_id);
        if (!principal || principal.status !== 'ACTIVE') {
            throw new Error('enterprise_principal_not_active');
        }

        const activeBindings = (await this.store.listEnterpriseAccessBindings(principal.principal_id))
            .filter((binding) => binding.status === 'ACTIVE')
            .sort((a, b) => a.binding_id.localeCompare(b.binding_id));

        await this.store.updateEnterpriseIdentitySession(session.session_id, {
            last_seen_at: this.now(),
            updated_at: this.now(),
        });

        return {
            principal,
            session,
            active_bindings: activeBindings,
        };
    }

    private assertAdminAccess(
        context: EnterpriseAdminSessionContext,
        workspaceId?: string
    ): void {
        const tenantAdmin = context.active_bindings.some((binding) => binding.roles.includes('TENANT_ADMIN'));
        if (tenantAdmin) return;

        const workspaceAdmin = Boolean(workspaceId) && context.active_bindings.some((binding) =>
            binding.workspace_id === workspaceId && binding.roles.includes('WORKSPACE_ADMIN')
        );
        if (workspaceAdmin) return;

        throw new Error('enterprise_admin_access_denied');
    }

    async syncDirectory(input: EnterpriseDirectorySyncInput): Promise<EnterpriseDirectorySyncResult> {
        const workspaceId = String(input.workspace_id || '').trim() || undefined;
        const adminContext = await this.resolveAdminSession(input.session_id);
        this.assertAdminAccess(adminContext, workspaceId);

        let updatedCount = 0;
        let deprovisionedCount = 0;
        let suspendedCount = 0;
        let reactivatedCount = 0;
        let bindingsUpdated = 0;
        let bindingsDeactivated = 0;
        let sessionsRevoked = 0;
        const principals: EnterprisePrincipalRecord[] = [];
        const config = this.requireConfig();

        for (const update of input.updates || []) {
            const externalSubject = String(update.external_subject || '').trim();
            const email = String(update.email || '').trim().toLowerCase();
            if (!externalSubject || !email) {
                throw new Error('invalid_directory_sync_update');
            }

            const principalId = this.principalIdForSubject(externalSubject);
            const existingPrincipal = await this.store.getEnterprisePrincipal(principalId);
            const status = update.status || 'ACTIVE';
            const groups = normalizeGroups(update.groups);
            const timestamp = this.now();

            const principal: EnterprisePrincipalRecord = {
                principal_id: principalId,
                provider: config.provider,
                tenant_id: config.tenant_id,
                external_subject: externalSubject,
                email,
                display_name: String(update.display_name || '').trim() || existingPrincipal?.display_name,
                groups,
                status,
                last_login_at: existingPrincipal?.last_login_at,
                last_directory_sync_at: timestamp,
                created_at: existingPrincipal?.created_at || timestamp,
                updated_at: timestamp,
            };
            await this.store.upsertEnterprisePrincipal(principal);
            principals.push(principal);
            updatedCount += 1;

            if (existingPrincipal && existingPrincipal.status !== 'ACTIVE' && status === 'ACTIVE') {
                reactivatedCount += 1;
            }

            if (status === 'DEPROVISIONED' || status === 'SUSPENDED') {
                if (status === 'DEPROVISIONED') {
                    deprovisionedCount += 1;
                } else {
                    suspendedCount += 1;
                }

                const activeBindings = (await this.store.listEnterpriseAccessBindings(principalId))
                    .filter((binding) => binding.status === 'ACTIVE');
                for (const binding of activeBindings) {
                    await this.store.updateEnterpriseAccessBinding(binding.binding_id, {
                        status: 'INACTIVE',
                        deprovisioned_at: timestamp,
                        updated_at: timestamp,
                    });
                    bindingsDeactivated += 1;
                }
                sessionsRevoked += await this.revokeActiveSessions(
                    principalId,
                    status === 'DEPROVISIONED' ? 'DIRECTORY_DEPROVISIONED' : 'DIRECTORY_SUSPENDED'
                );
                continue;
            }

            const bindingSync = await this.syncBindings(
                principalId,
                this.buildGroupDerivedBindings(
                    principalId,
                    groups,
                    'SCIM_SYNC',
                    String(update.workspace_id || workspaceId || '').trim() || undefined
                ),
                'SCIM_SYNC'
            );
            bindingsUpdated += bindingSync.updated_count;
            bindingsDeactivated += bindingSync.deactivated_count;
        }

        return {
            updated_count: updatedCount,
            deprovisioned_count: deprovisionedCount,
            suspended_count: suspendedCount,
            reactivated_count: reactivatedCount,
            bindings_updated: bindingsUpdated,
            bindings_deactivated: bindingsDeactivated,
            sessions_revoked: sessionsRevoked,
            principals,
        };
    }
}

let enterpriseIdentityAdminServiceSingleton: EnterpriseIdentityAdminService | null = null;

export function getEnterpriseIdentityAdminService(): EnterpriseIdentityAdminService {
    if (!enterpriseIdentityAdminServiceSingleton) {
        enterpriseIdentityAdminServiceSingleton = new EnterpriseIdentityAdminService();
    }
    return enterpriseIdentityAdminServiceSingleton;
}

export function resetEnterpriseIdentityAdminServiceForTests(): void {
    enterpriseIdentityAdminServiceSingleton = null;
}

export function setEnterpriseIdentityAdminServiceForTests(service: EnterpriseIdentityAdminService): void {
    enterpriseIdentityAdminServiceSingleton = service;
}

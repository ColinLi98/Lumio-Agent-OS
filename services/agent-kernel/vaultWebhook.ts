import crypto from 'node:crypto';
import type {
    EnterpriseAdminSessionContext,
    EnterpriseIdentityAdminService,
} from './identityAdmin.js';
import {
    getEnterpriseIdentityAdminService,
} from './identityAdmin.js';
import type {
    ConnectorAdapterType,
    HashiCorpVaultPort,
    PilotVaultWebhookConfig,
    VaultCredentialCompromiseStatus,
    VaultCredentialRecord,
    VaultCredentialStatus,
    VaultResolvedCredential,
    WebhookDeliveryPort,
    WebhookDeliveryRecord,
    WebhookDeliveryResponse,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { createTaskStore, resolveTaskStoreDriverFromEnv } from './storeAdapters.js';

export interface VaultCredentialHealthSummary {
    connector_id: string;
    credential_id: string;
    backend: 'HASHICORP_VAULT';
    status: VaultCredentialStatus;
    compromise_status: VaultCredentialCompromiseStatus;
    route_eligible: boolean;
    lease_id?: string;
    lease_expires_at?: number;
    renewable: boolean;
    rotated_at?: number;
    revoked_at?: number;
    last_failure_reason?: string;
    last_failure_at?: number;
    last_delivery_status?: WebhookDeliveryRecord['status'];
    last_delivery_at?: number;
    recent_deliveries: WebhookDeliveryRecord[];
    recommended_action: 'NONE' | 'RENEW' | 'ROTATE' | 'REVOKE_AND_ROTATE' | 'INVESTIGATE';
}

export interface WebhookDeliveryResult {
    delivery: WebhookDeliveryRecord;
    credential_health: VaultCredentialHealthSummary;
    route_eligible: boolean;
}

export interface VaultBackedWebhookServiceOptions {
    store?: TaskStore;
    config?: PilotVaultWebhookConfig;
    hashiCorpVaultPort?: HashiCorpVaultPort;
    webhookDeliveryPort?: WebhookDeliveryPort;
    identityAdminService?: EnterpriseIdentityAdminService;
    now?: () => number;
}

interface VaultReadPayload {
    lease_id?: string;
    renewable?: boolean;
    lease_duration?: number;
    data?: Record<string, unknown> & {
        data?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    };
}

function currentTime(): number {
    return Date.now();
}

function normalizeUrl(url: string): string {
    return String(url || '').trim().replace(/\/+$/, '');
}

function normalizePath(path: string): string {
    return String(path || '').trim().replace(/^\/+/, '');
}

function createOpaqueId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}

function truncate(value: string, max = 240): string {
    const text = String(value || '');
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3)}...`;
}

function parseHeadersJson(raw: string | undefined): Record<string, string> | undefined {
    if (!raw) return undefined;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
        return Object.fromEntries(
            Object.entries(parsed)
                .map(([key, value]) => [String(key).trim(), String(value || '').trim()])
                .filter(([key, value]) => Boolean(key) && Boolean(value))
        );
    } catch {
        return undefined;
    }
}

function parseNumber(raw: string | undefined, fallback: number): number {
    const parsed = Number(raw || '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function chooseSecretValue(container: Record<string, unknown>, field: string): string | undefined {
    const direct = String(container[field] || '').trim();
    if (direct) return direct;
    for (const candidate of ['token', 'secret', 'credential', 'value']) {
        const value = String(container[candidate] || '').trim();
        if (value) return value;
    }
    return undefined;
}

function statusFromLease(
    resolved: Pick<VaultResolvedCredential, 'lease_id' | 'expires_at' | 'renewable'>,
    atMs: number
): VaultCredentialStatus {
    if (!resolved.lease_id || !resolved.expires_at) return 'UNHEALTHY';
    if (resolved.expires_at <= atMs) return 'EXPIRED';
    if ((resolved.expires_at - atMs) <= 60_000) return 'EXPIRING';
    return 'ACTIVE';
}

function recommendedAction(record: VaultCredentialRecord | undefined): VaultCredentialHealthSummary['recommended_action'] {
    if (!record) return 'INVESTIGATE';
    if (record.compromise_status === 'CONFIRMED') return 'REVOKE_AND_ROTATE';
    if (record.compromise_status === 'SUSPECTED') return 'INVESTIGATE';
    if (record.status === 'REVOKED') return 'ROTATE';
    if (record.status === 'COMPROMISED') return 'REVOKE_AND_ROTATE';
    if (record.status === 'UNHEALTHY') return 'INVESTIGATE';
    if (record.status === 'EXPIRED' || record.status === 'EXPIRING') return 'RENEW';
    return 'NONE';
}

function routeEligible(record: VaultCredentialRecord | undefined): boolean {
    if (!record) return false;
    if (record.compromise_status !== 'CLEAR') return false;
    return record.status === 'ACTIVE' || record.status === 'EXPIRING';
}

function summarizePayload(payload: unknown): string {
    if (typeof payload === 'string') return truncate(payload);
    try {
        return truncate(JSON.stringify(payload));
    } catch {
        return 'payload_unserializable';
    }
}

export function resolvePilotVaultWebhookConfigFromEnv(): PilotVaultWebhookConfig | undefined {
    const vaultAddr = normalizeUrl(process.env.AGENT_KERNEL_VAULT_ADDR || '');
    const vaultToken = String(process.env.AGENT_KERNEL_VAULT_TOKEN || '').trim();
    const readPath = normalizePath(process.env.AGENT_KERNEL_VAULT_WEBHOOK_READ_PATH || '');
    const endpointUrl = normalizeUrl(process.env.AGENT_KERNEL_WEBHOOK_ENDPOINT_URL || '');
    const tenantId = String(process.env.AGENT_KERNEL_PILOT_TENANT_ID || '').trim();
    if (!vaultAddr || !vaultToken || !readPath || !endpointUrl || !tenantId) {
        return undefined;
    }

    return {
        backend: 'HASHICORP_VAULT',
        tenant_id: tenantId,
        workspace_id: String(
            process.env.AGENT_KERNEL_VAULT_WEBHOOK_WORKSPACE_ID
            || process.env.AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID
            || ''
        ).trim() || undefined,
        connector_type: 'HTTPS_WEBHOOK',
        connector_id: String(process.env.AGENT_KERNEL_WEBHOOK_CONNECTOR_ID || 'pilot_https_webhook').trim() || 'pilot_https_webhook',
        endpoint_url: endpointUrl,
        auth_header_name: String(process.env.AGENT_KERNEL_WEBHOOK_AUTH_HEADER || 'Authorization').trim() || 'Authorization',
        auth_header_prefix: String(process.env.AGENT_KERNEL_WEBHOOK_AUTH_SCHEME || 'Bearer').trim() || undefined,
        static_headers: parseHeadersJson(process.env.AGENT_KERNEL_WEBHOOK_STATIC_HEADERS_JSON),
        timeout_ms: parseNumber(process.env.AGENT_KERNEL_WEBHOOK_TIMEOUT_MS, 10_000),
        credential_id: String(process.env.AGENT_KERNEL_VAULT_WEBHOOK_CREDENTIAL_ID || 'pilot_https_webhook_credential').trim() || 'pilot_https_webhook_credential',
        vault_addr: vaultAddr,
        vault_token: vaultToken,
        vault_namespace: String(process.env.AGENT_KERNEL_VAULT_NAMESPACE || '').trim() || undefined,
        read_path: readPath,
        rotate_path: normalizePath(process.env.AGENT_KERNEL_VAULT_WEBHOOK_ROTATE_PATH || '') || undefined,
        secret_value_field: String(process.env.AGENT_KERNEL_VAULT_WEBHOOK_SECRET_FIELD || 'token').trim() || 'token',
        renew_increment_seconds: parseNumber(process.env.AGENT_KERNEL_VAULT_WEBHOOK_RENEW_INCREMENT_SECONDS, 300),
    };
}

async function fetchJson(url: string, init: RequestInit): Promise<{ response: Response; payload: VaultReadPayload }> {
    const response = await fetch(url, init);
    const payload = await response.json() as VaultReadPayload;
    if (!response.ok) {
        throw new Error(`vault_request_failed:${response.status}`);
    }
    return { response, payload };
}

class HashiCorpVaultHttpPort implements HashiCorpVaultPort {
    private requestHeaders(config: PilotVaultWebhookConfig): Record<string, string> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Vault-Token': config.vault_token,
        };
        if (config.vault_namespace) {
            headers['X-Vault-Namespace'] = config.vault_namespace;
        }
        return headers;
    }

    private credentialFromPayload(config: PilotVaultWebhookConfig, payload: VaultReadPayload): VaultResolvedCredential {
        const container = payload?.data?.data && typeof payload.data.data === 'object'
            ? payload.data.data
            : payload?.data && typeof payload.data === 'object'
                ? payload.data
                : {};
        const secretValue = chooseSecretValue(container as Record<string, unknown>, config.secret_value_field);
        if (!secretValue) {
            throw new Error('vault_secret_value_missing');
        }

        const leaseDurationSeconds = Number(payload.lease_duration || 0);
        const expiresAt = Number.isFinite(leaseDurationSeconds) && leaseDurationSeconds > 0
            ? Date.now() + (leaseDurationSeconds * 1000)
            : undefined;
        const metadata = payload?.data?.metadata && typeof payload.data.metadata === 'object'
            ? payload.data.metadata
            : undefined;
        const version = metadata && metadata.version !== undefined
            ? String(metadata.version)
            : undefined;

        return {
            credential_id: config.credential_id,
            secret_value: secretValue,
            lease_id: String(payload.lease_id || '').trim() || undefined,
            renewable: Boolean(payload.renewable),
            lease_duration_seconds: Number.isFinite(leaseDurationSeconds) && leaseDurationSeconds > 0
                ? leaseDurationSeconds
                : undefined,
            expires_at: expiresAt,
            version,
            metadata,
        };
    }

    async readCredential(config: PilotVaultWebhookConfig): Promise<VaultResolvedCredential> {
        const url = `${config.vault_addr}/v1/${normalizePath(config.read_path)}`;
        const { payload } = await fetchJson(url, {
            method: 'GET',
            headers: this.requestHeaders(config),
        });
        return this.credentialFromPayload(config, payload);
    }

    async renewLease(
        config: PilotVaultWebhookConfig,
        leaseId: string,
        incrementSeconds?: number
    ): Promise<Pick<VaultResolvedCredential, 'lease_id' | 'renewable' | 'lease_duration_seconds' | 'expires_at' | 'version'>> {
        const url = `${config.vault_addr}/v1/sys/leases/renew`;
        const { payload } = await fetchJson(url, {
            method: 'PUT',
            headers: {
                ...this.requestHeaders(config),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lease_id: leaseId,
                increment: incrementSeconds || config.renew_increment_seconds,
            }),
        });
        const leaseDurationSeconds = Number(payload.lease_duration || 0);
        return {
            lease_id: String(payload.lease_id || leaseId).trim() || leaseId,
            renewable: Boolean(payload.renewable),
            lease_duration_seconds: Number.isFinite(leaseDurationSeconds) && leaseDurationSeconds > 0
                ? leaseDurationSeconds
                : undefined,
            expires_at: Number.isFinite(leaseDurationSeconds) && leaseDurationSeconds > 0
                ? Date.now() + (leaseDurationSeconds * 1000)
                : undefined,
            version: undefined,
        };
    }

    async revokeLease(config: PilotVaultWebhookConfig, leaseId: string): Promise<void> {
        const url = `${config.vault_addr}/v1/sys/leases/revoke`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                ...this.requestHeaders(config),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lease_id: leaseId }),
        });
        if (!response.ok) {
            throw new Error(`vault_request_failed:${response.status}`);
        }
    }

    async rotateCredential(config: PilotVaultWebhookConfig): Promise<VaultResolvedCredential> {
        if (!config.rotate_path) {
            throw new Error('vault_rotate_path_not_configured');
        }
        const rotateUrl = `${config.vault_addr}/v1/${normalizePath(config.rotate_path)}`;
        const rotateResponse = await fetch(rotateUrl, {
            method: 'POST',
            headers: this.requestHeaders(config),
        });
        if (!rotateResponse.ok) {
            throw new Error(`vault_request_failed:${rotateResponse.status}`);
        }
        return this.readCredential(config);
    }
}

class DefaultWebhookDeliveryPort implements WebhookDeliveryPort {
    async deliver(input: {
        config: PilotVaultWebhookConfig;
        payload: unknown;
        credential: VaultResolvedCredential;
        correlation_id?: string;
        request_headers?: Record<string, string>;
        timeout_ms?: number;
    }): Promise<WebhookDeliveryResponse> {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            Math.max(1000, input.timeout_ms ?? input.config.timeout_ms)
        );
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(input.config.static_headers || {}),
                ...(input.request_headers || {}),
            };
            const authPrefix = String(input.config.auth_header_prefix || '').trim();
            headers[input.config.auth_header_name] = authPrefix
                ? `${authPrefix} ${input.credential.secret_value}`
                : input.credential.secret_value;
            if (input.correlation_id) {
                headers['X-Agent-Kernel-Correlation-Id'] = input.correlation_id;
            }

            const response = await fetch(input.config.endpoint_url, {
                method: 'POST',
                headers,
                body: JSON.stringify(input.payload),
                signal: controller.signal,
            });
            const responseExcerpt = truncate(await response.text(), 512) || undefined;
            return {
                ok: response.ok,
                status: response.status,
                request_id: response.headers.get('x-request-id') || undefined,
                response_excerpt: responseExcerpt,
            };
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('connector_delivery_timeout');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export class VaultBackedWebhookService {
    private readonly store: TaskStore;
    private readonly config?: PilotVaultWebhookConfig;
    private readonly hashiCorpVaultPort: HashiCorpVaultPort;
    private readonly webhookDeliveryPort: WebhookDeliveryPort;
    private readonly identityAdminService: EnterpriseIdentityAdminService;
    private readonly now: () => number;

    constructor(options?: VaultBackedWebhookServiceOptions) {
        this.store = options?.store || createTaskStore({
            driver: resolveTaskStoreDriverFromEnv(),
        });
        this.config = options?.config || resolvePilotVaultWebhookConfigFromEnv();
        this.hashiCorpVaultPort = options?.hashiCorpVaultPort || new HashiCorpVaultHttpPort();
        this.webhookDeliveryPort = options?.webhookDeliveryPort || new DefaultWebhookDeliveryPort();
        this.identityAdminService = options?.identityAdminService || getEnterpriseIdentityAdminService();
        this.now = options?.now || currentTime;
    }

    private requireConfig(): PilotVaultWebhookConfig {
        if (!this.config) {
            throw new Error('pilot_vault_webhook_not_configured');
        }
        return this.config;
    }

    private async resolveAdminContext(sessionId: string): Promise<EnterpriseAdminSessionContext> {
        const config = this.requireConfig();
        const context = await this.identityAdminService.resolveAdminSession(sessionId);
        const tenantAdmin = context.active_bindings.some((binding) => binding.roles.includes('TENANT_ADMIN'));
        if (tenantAdmin) return context;
        const workspaceAdmin = Boolean(config.workspace_id) && context.active_bindings.some((binding) =>
            binding.workspace_id === config.workspace_id && binding.roles.includes('WORKSPACE_ADMIN')
        );
        if (workspaceAdmin) return context;
        throw new Error('enterprise_admin_access_denied');
    }

    private async latestRecord(): Promise<VaultCredentialRecord | undefined> {
        const config = this.requireConfig();
        return this.store.getVaultCredential(config.credential_id);
    }

    private async recentDeliveries(): Promise<WebhookDeliveryRecord[]> {
        const config = this.requireConfig();
        const deliveries = await this.store.listWebhookDeliveries(config.connector_id);
        return deliveries.sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    }

    private async upsertCredentialRecord(
        update: Partial<VaultCredentialRecord>,
        base?: VaultCredentialRecord
    ): Promise<VaultCredentialRecord> {
        const config = this.requireConfig();
        const createdAt = base?.created_at || this.now();
        const updatedAt = this.now();
        const record: VaultCredentialRecord = {
            ...base,
            credential_id: config.credential_id,
            backend: config.backend,
            tenant_id: config.tenant_id,
            workspace_id: config.workspace_id,
            connector_type: config.connector_type,
            connector_id: config.connector_id,
            vault_path: config.read_path,
            status: base?.status || 'UNHEALTHY',
            compromise_status: base?.compromise_status || 'CLEAR',
            renewable: base?.renewable || false,
            ...update,
            created_at: createdAt,
            updated_at: updatedAt,
        };
        await this.store.upsertVaultCredential(record);
        return record;
    }

    private async recordDelivery(update: Omit<WebhookDeliveryRecord, 'delivery_id' | 'created_at' | 'updated_at'>): Promise<WebhookDeliveryRecord> {
        const now = this.now();
        const record: WebhookDeliveryRecord = {
            delivery_id: createOpaqueId('webhook_delivery'),
            created_at: now,
            updated_at: now,
            ...update,
        };
        await this.store.upsertWebhookDelivery(record);
        return record;
    }

    private async summarizeHealth(record?: VaultCredentialRecord): Promise<VaultCredentialHealthSummary> {
        const config = this.requireConfig();
        const recentDeliveries = await this.recentDeliveries();
        const effective = record || await this.latestRecord();
        return {
            connector_id: config.connector_id,
            credential_id: config.credential_id,
            backend: config.backend,
            status: effective?.status || 'UNHEALTHY',
            compromise_status: effective?.compromise_status || 'CLEAR',
            route_eligible: routeEligible(effective),
            lease_id: effective?.lease_id,
            lease_expires_at: effective?.lease_expires_at,
            renewable: Boolean(effective?.renewable),
            rotated_at: effective?.rotated_at,
            revoked_at: effective?.revoked_at,
            last_failure_reason: effective?.last_failure_reason,
            last_failure_at: effective?.last_failure_at,
            last_delivery_status: effective?.last_delivery_status,
            last_delivery_at: effective?.last_delivery_at,
            recent_deliveries: recentDeliveries,
            recommended_action: recommendedAction(effective),
        };
    }

    private async syncCredentialFromVault(options?: { autoRenew?: boolean; allowBlockedRead?: boolean }): Promise<{
        record: VaultCredentialRecord;
        resolved: VaultResolvedCredential;
    }> {
        const config = this.requireConfig();
        const existing = await this.latestRecord();
        if (!options?.allowBlockedRead && existing && (existing.status === 'REVOKED' || existing.compromise_status !== 'CLEAR')) {
            throw new Error('credential_route_blocked');
        }

        try {
            const resolved = await this.hashiCorpVaultPort.readCredential(config);
            let nextResolved = resolved;
            let nextStatus = statusFromLease(nextResolved, this.now());
            if (options?.autoRenew && nextStatus === 'EXPIRING' && nextResolved.renewable && nextResolved.lease_id) {
                const renewed = await this.hashiCorpVaultPort.renewLease(
                    config,
                    nextResolved.lease_id,
                    config.renew_increment_seconds
                );
                nextResolved = {
                    ...nextResolved,
                    ...renewed,
                    lease_id: renewed.lease_id || nextResolved.lease_id,
                };
                nextStatus = statusFromLease(nextResolved, this.now());
            }

            const record = await this.upsertCredentialRecord({
                status: nextStatus,
                compromise_status: existing?.compromise_status === 'SUSPECTED' ? 'SUSPECTED' : 'CLEAR',
                lease_id: nextResolved.lease_id,
                renewable: nextResolved.renewable,
                lease_duration_seconds: nextResolved.lease_duration_seconds,
                lease_expires_at: nextResolved.expires_at,
                last_materialized_at: this.now(),
                last_failure_at: undefined,
                last_failure_reason: undefined,
                version: nextResolved.version,
            }, existing);
            return {
                record,
                resolved: nextResolved,
            };
        } catch (error) {
            const failureReason = error instanceof Error ? error.message : 'vault_read_failed';
            const record = await this.upsertCredentialRecord({
                status: 'UNHEALTHY',
                last_failure_at: this.now(),
                last_failure_reason: failureReason,
            }, existing);
            throw new Error(failureReason);
        }
    }

    async inspectCredentialHealth(input: { session_id: string }): Promise<VaultCredentialHealthSummary> {
        await this.resolveAdminContext(input.session_id);
        const existing = await this.latestRecord();
        if (!existing || (existing.status !== 'REVOKED' && existing.compromise_status === 'CLEAR')) {
            try {
                const synced = await this.syncCredentialFromVault({ autoRenew: false });
                return this.summarizeHealth(synced.record);
            } catch {
                return this.summarizeHealth();
            }
        }
        return this.summarizeHealth(existing);
    }

    async renewCredentialLease(input: { session_id: string; increment_seconds?: number }): Promise<VaultCredentialHealthSummary> {
        await this.resolveAdminContext(input.session_id);
        const config = this.requireConfig();
        const existing = await this.latestRecord();
        const current = existing?.lease_id ? existing : (await this.syncCredentialFromVault({ autoRenew: false })).record;
        if (!current.lease_id) {
            throw new Error('vault_lease_not_found');
        }
        if (!current.renewable) {
            throw new Error('vault_lease_not_renewable');
        }
        const renewed = await this.hashiCorpVaultPort.renewLease(
            config,
            current.lease_id,
            input.increment_seconds || config.renew_increment_seconds
        );
        const record = await this.upsertCredentialRecord({
            status: statusFromLease({
                lease_id: renewed.lease_id || current.lease_id,
                expires_at: renewed.expires_at,
                renewable: renewed.renewable,
            }, this.now()),
            lease_id: renewed.lease_id || current.lease_id,
            renewable: renewed.renewable,
            lease_duration_seconds: renewed.lease_duration_seconds,
            lease_expires_at: renewed.expires_at,
            last_renewed_at: this.now(),
            last_failure_at: undefined,
            last_failure_reason: undefined,
        }, current);
        return this.summarizeHealth(record);
    }

    async revokeCredential(input: { session_id: string; compromised?: boolean; reason?: string }): Promise<VaultCredentialHealthSummary> {
        await this.resolveAdminContext(input.session_id);
        const current = await this.latestRecord() || (await this.syncCredentialFromVault({ autoRenew: false })).record;
        if (!current.lease_id) {
            throw new Error('vault_lease_not_found');
        }
        const config = this.requireConfig();
        await this.hashiCorpVaultPort.revokeLease(config, current.lease_id);
        const record = await this.upsertCredentialRecord({
            status: input.compromised ? 'COMPROMISED' : 'REVOKED',
            compromise_status: input.compromised ? 'CONFIRMED' : current.compromise_status,
            revoked_at: this.now(),
            last_failure_reason: input.reason || (input.compromised ? 'credential_compromised' : 'credential_revoked'),
            last_failure_at: this.now(),
        }, current);
        return this.summarizeHealth(record);
    }

    async rotateCredential(input: { session_id: string }): Promise<VaultCredentialHealthSummary> {
        await this.resolveAdminContext(input.session_id);
        const config = this.requireConfig();
        const existing = await this.latestRecord();
        const resolved = await this.hashiCorpVaultPort.rotateCredential(config);
        const record = await this.upsertCredentialRecord({
            status: statusFromLease(resolved, this.now()),
            compromise_status: 'CLEAR',
            lease_id: resolved.lease_id,
            renewable: resolved.renewable,
            lease_duration_seconds: resolved.lease_duration_seconds,
            lease_expires_at: resolved.expires_at,
            last_materialized_at: this.now(),
            rotated_at: this.now(),
            revoked_at: undefined,
            last_failure_at: undefined,
            last_failure_reason: undefined,
            version: resolved.version,
        }, existing);
        return this.summarizeHealth(record);
    }

    async deliver(input: {
        session_id: string;
        task_id?: string;
        correlation_id?: string;
        run_id?: string;
        payload: unknown;
        request_headers?: Record<string, string>;
        payload_summary?: string;
        adapter_id?: string;
        adapter_type?: ConnectorAdapterType;
        delivery_group_id?: string;
        attempt?: number;
        timeout_ms?: number;
    }): Promise<WebhookDeliveryResult> {
        await this.resolveAdminContext(input.session_id);
        const config = this.requireConfig();
        const payloadSummary = input.payload_summary || summarizePayload(input.payload);
        const existing = await this.latestRecord();
        if (existing && !routeEligible(existing) && (existing.status === 'REVOKED' || existing.compromise_status !== 'CLEAR')) {
            const blocked = await this.recordDelivery({
                connector_id: config.connector_id,
                credential_id: config.credential_id,
                tenant_id: config.tenant_id,
                workspace_id: config.workspace_id,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: 'BLOCKED_CREDENTIAL',
                adapter_id: input.adapter_id,
                adapter_type: input.adapter_type,
                delivery_group_id: input.delivery_group_id,
                attempt: input.attempt,
                credential_status: existing.status,
                compromise_status: existing.compromise_status,
                blocked_reason: existing.last_failure_reason || 'credential_route_blocked',
                payload_summary: payloadSummary,
            });
            await this.upsertCredentialRecord({
                last_delivery_status: blocked.status,
                last_delivery_at: blocked.created_at,
            }, existing);
            return {
                delivery: blocked,
                credential_health: await this.summarizeHealth(existing),
                route_eligible: false,
            };
        }

        let record: VaultCredentialRecord;
        let resolved: VaultResolvedCredential;
        try {
            const synced = await this.syncCredentialFromVault({ autoRenew: true });
            record = synced.record;
            resolved = synced.resolved;
        } catch (error) {
            const failedRecord = await this.latestRecord();
            const blocked = await this.recordDelivery({
                connector_id: config.connector_id,
                credential_id: config.credential_id,
                tenant_id: config.tenant_id,
                workspace_id: config.workspace_id,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: 'BLOCKED_CREDENTIAL',
                adapter_id: input.adapter_id,
                adapter_type: input.adapter_type,
                delivery_group_id: input.delivery_group_id,
                attempt: input.attempt,
                credential_status: failedRecord?.status || 'UNHEALTHY',
                compromise_status: failedRecord?.compromise_status || 'CLEAR',
                blocked_reason: error instanceof Error ? error.message : 'credential_unhealthy',
                payload_summary: payloadSummary,
            });
            return {
                delivery: blocked,
                credential_health: await this.summarizeHealth(failedRecord),
                route_eligible: false,
            };
        }

        if (!routeEligible(record)) {
            const blocked = await this.recordDelivery({
                connector_id: config.connector_id,
                credential_id: config.credential_id,
                tenant_id: config.tenant_id,
                workspace_id: config.workspace_id,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: 'BLOCKED_CREDENTIAL',
                adapter_id: input.adapter_id,
                adapter_type: input.adapter_type,
                delivery_group_id: input.delivery_group_id,
                attempt: input.attempt,
                credential_status: record.status,
                compromise_status: record.compromise_status,
                blocked_reason: record.last_failure_reason || 'credential_route_blocked',
                payload_summary: payloadSummary,
            });
            await this.upsertCredentialRecord({
                last_delivery_status: blocked.status,
                last_delivery_at: blocked.created_at,
            }, record);
            return {
                delivery: blocked,
                credential_health: await this.summarizeHealth(record),
                route_eligible: false,
            };
        }

        let delivery: WebhookDeliveryRecord;
        let updatedRecord: VaultCredentialRecord;
        let routeEligibleResult = false;
        try {
            const deliveryResponse = await this.webhookDeliveryPort.deliver({
                config,
                payload: input.payload,
                credential: resolved,
                correlation_id: input.correlation_id,
                request_headers: input.request_headers,
                timeout_ms: input.timeout_ms,
            });
            const deliveryStatus = deliveryResponse.ok
                ? 'DELIVERED'
                : deliveryResponse.status === 429
                    ? 'RATE_LIMITED'
                    : 'FAILED';
            const blockedReason = !deliveryResponse.ok && (deliveryResponse.status === 401 || deliveryResponse.status === 403)
                ? 'webhook_unauthorized'
                : !deliveryResponse.ok && deliveryResponse.status === 429
                    ? 'webhook_rate_limited'
                    : !deliveryResponse.ok
                        ? `webhook_delivery_failed:${deliveryResponse.status}`
                        : undefined;

            delivery = await this.recordDelivery({
                connector_id: config.connector_id,
                credential_id: config.credential_id,
                tenant_id: config.tenant_id,
                workspace_id: config.workspace_id,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: deliveryStatus,
                adapter_id: input.adapter_id,
                adapter_type: input.adapter_type,
                delivery_group_id: input.delivery_group_id,
                attempt: input.attempt,
                credential_status: deliveryResponse.ok
                    ? record.status
                    : (blockedReason === 'webhook_unauthorized' ? 'UNHEALTHY' : record.status),
                compromise_status: record.compromise_status,
                blocked_reason: blockedReason,
                request_id: deliveryResponse.request_id,
                http_status: deliveryResponse.status,
                response_excerpt: deliveryResponse.response_excerpt,
                payload_summary: payloadSummary,
            });

            updatedRecord = await this.upsertCredentialRecord({
                status: blockedReason === 'webhook_unauthorized' ? 'UNHEALTHY' : record.status,
                last_delivery_status: delivery.status,
                last_delivery_at: delivery.created_at,
                last_failure_reason: blockedReason,
                last_failure_at: blockedReason ? delivery.created_at : undefined,
            }, record);
            routeEligibleResult = deliveryResponse.ok;
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'webhook_delivery_failed';
            const failureStatus = reason === 'connector_delivery_timeout' ? 'TIMED_OUT' : 'FAILED';
            delivery = await this.recordDelivery({
                connector_id: config.connector_id,
                credential_id: config.credential_id,
                tenant_id: config.tenant_id,
                workspace_id: config.workspace_id,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: failureStatus,
                adapter_id: input.adapter_id,
                adapter_type: input.adapter_type,
                delivery_group_id: input.delivery_group_id,
                attempt: input.attempt,
                credential_status: record.status,
                compromise_status: record.compromise_status,
                blocked_reason: reason,
                payload_summary: payloadSummary,
            });
            updatedRecord = await this.upsertCredentialRecord({
                last_delivery_status: delivery.status,
                last_delivery_at: delivery.created_at,
                last_failure_reason: reason,
                last_failure_at: delivery.created_at,
            }, record);
            routeEligibleResult = false;
        }

        return {
            delivery,
            credential_health: await this.summarizeHealth(updatedRecord),
            route_eligible: routeEligibleResult,
        };
    }
}

let vaultBackedWebhookServiceSingleton: VaultBackedWebhookService | null = null;

export function getVaultBackedWebhookService(): VaultBackedWebhookService {
    if (!vaultBackedWebhookServiceSingleton) {
        vaultBackedWebhookServiceSingleton = new VaultBackedWebhookService();
    }
    return vaultBackedWebhookServiceSingleton;
}

export function resetVaultBackedWebhookServiceForTests(): void {
    vaultBackedWebhookServiceSingleton = null;
}

export function setVaultBackedWebhookServiceForTests(service: VaultBackedWebhookService): void {
    vaultBackedWebhookServiceSingleton = service;
}

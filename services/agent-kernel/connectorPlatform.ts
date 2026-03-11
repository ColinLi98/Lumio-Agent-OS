import crypto from 'node:crypto';
import type {
    AdvisorCrmComplianceHandoffInput,
    ConnectorAdapterDefinition,
    ConnectorAdapterType,
    ConnectorPlatformDispatchResult,
    ConnectorPlatformDispatchSummary,
    ConnectorPlatformHealthStatus,
    ConnectorPlatformHealthSummary,
    GenericWebhookConnectorDispatchInput,
    PilotVaultWebhookConfig,
    WebhookDeliveryRecord,
    WebhookDeliveryStatus,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { createTaskStore, resolveTaskStoreDriverFromEnv } from './storeAdapters.js';
import type { VaultCredentialHealthSummary, VaultBackedWebhookService } from './vaultWebhook.js';
import {
    getVaultBackedWebhookService,
    resolvePilotVaultWebhookConfigFromEnv,
} from './vaultWebhook.js';

export interface ConnectorPlatformServiceOptions {
    store?: TaskStore;
    config?: PilotVaultWebhookConfig;
    webhookService?: VaultBackedWebhookService;
    now?: () => number;
}

interface PreparedDispatch {
    payload: unknown;
    payload_summary: string;
    request_headers?: Record<string, string>;
}

interface ConnectorAdapter<Input> {
    definition: ConnectorAdapterDefinition;
    prepare(input: Input): PreparedDispatch;
}

function currentTime(): number {
    return Date.now();
}

function createOpaqueId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}

function truncate(value: string, max = 240): string {
    const text = String(value || '');
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3)}...`;
}

function summarizePayload(payload: unknown): string {
    if (typeof payload === 'string') return truncate(payload);
    try {
        return truncate(JSON.stringify(payload));
    } catch {
        return 'payload_unserializable';
    }
}

function requireString(field: string, value: unknown): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new Error(`missing_${field}`);
    }
    return normalized;
}

function connectorHealthStatus(
    credentialHealth: VaultCredentialHealthSummary,
    attempts: WebhookDeliveryRecord[],
): ConnectorPlatformHealthStatus {
    if (!credentialHealth.route_eligible) return 'UNHEALTHY';
    if (attempts.some((attempt) => attempt.status === 'DEAD_LETTERED')) return 'DEGRADED';
    if (attempts.some((attempt) =>
        attempt.status === 'FAILED'
        || attempt.status === 'TIMED_OUT'
        || attempt.status === 'RATE_LIMITED'
    )) {
        return 'DEGRADED';
    }
    return 'HEALTHY';
}

function isRetryableStatus(status: WebhookDeliveryStatus): boolean {
    return status === 'FAILED' || status === 'TIMED_OUT';
}

class GenericHttpsWebhookAdapter implements ConnectorAdapter<GenericWebhookConnectorDispatchInput> {
    readonly definition: ConnectorAdapterDefinition;

    constructor(definition: ConnectorAdapterDefinition) {
        this.definition = definition;
    }

    prepare(input: GenericWebhookConnectorDispatchInput): PreparedDispatch {
        return {
            payload: input.payload,
            payload_summary: String(input.payload_summary || '').trim() || summarizePayload(input.payload),
            request_headers: input.request_headers,
        };
    }
}

class AdvisorCrmComplianceHandoffAdapter implements ConnectorAdapter<AdvisorCrmComplianceHandoffInput> {
    readonly definition: ConnectorAdapterDefinition;

    constructor(definition: ConnectorAdapterDefinition) {
        this.definition = definition;
    }

    prepare(input: AdvisorCrmComplianceHandoffInput): PreparedDispatch {
        const workflowId = requireString('workflow_id', input.workflow_id);
        const crmRecordId = requireString('crm_record_id', input.crm_record_id);
        const clientName = requireString('client_name', input.client_name);
        const postMeetingNotes = requireString('post_meeting_notes', input.post_meeting_notes);
        const crmReadyDraft = requireString('crm_ready_draft', input.crm_ready_draft);
        const complianceHandoffPackage = requireString(
            'compliance_handoff_package',
            input.compliance_handoff_package,
        );

        const payload = {
            template_family: 'advisor_workflow_execution',
            handoff_path: 'crm_compliance_intake',
            workflow_stage: 'crm_ready_draft_to_compliance_handoff',
            workflow_id: workflowId,
            crm_record_id: crmRecordId,
            client_name: clientName,
            advisor_name: String(input.advisor_name || '').trim() || undefined,
            meeting_title: String(input.meeting_title || '').trim() || undefined,
            package: {
                post_meeting_notes: postMeetingNotes,
                crm_ready_draft: crmReadyDraft,
                compliance_handoff_package: complianceHandoffPackage,
                evidence_refs: Array.isArray(input.evidence_refs)
                    ? input.evidence_refs
                        .map((ref) => String(ref || '').trim())
                        .filter(Boolean)
                    : [],
            },
        };

        return {
            payload,
            payload_summary: `advisor CRM/compliance handoff ${crmRecordId} for ${clientName}`,
            request_headers: input.request_headers,
        };
    }
}

export class ConnectorPlatformService {
    private readonly store: TaskStore;
    private readonly config?: PilotVaultWebhookConfig;
    private readonly webhookService: VaultBackedWebhookService;
    private readonly now: () => number;
    private readonly adapters: Map<string, ConnectorAdapter<any>>;

    constructor(options?: ConnectorPlatformServiceOptions) {
        this.store = options?.store || createTaskStore({
            driver: resolveTaskStoreDriverFromEnv(),
        });
        this.config = options?.config || resolvePilotVaultWebhookConfigFromEnv();
        this.webhookService = options?.webhookService || getVaultBackedWebhookService();
        this.now = options?.now || currentTime;
        this.adapters = this.buildAdapters();
    }

    private requireConfig(): PilotVaultWebhookConfig {
        if (!this.config) {
            throw new Error('pilot_vault_webhook_not_configured');
        }
        return this.config;
    }

    private buildAdapters(): Map<string, ConnectorAdapter<any>> {
        const config = this.requireConfig();
        const genericDefinition: ConnectorAdapterDefinition = {
            adapter_id: 'generic_https_webhook',
            adapter_type: 'GENERIC_HTTPS_WEBHOOK',
            display_name: 'Generic HTTPS webhook',
            description: 'Bounded generic webhook adapter over the frozen pilot transport.',
            business_path: false,
            transport_connector_type: config.connector_type,
            transport_connector_id: config.connector_id,
            timeout_ms: config.timeout_ms,
            max_attempts: 2,
            rate_limit_window_ms: 60_000,
            rate_limit_max_deliveries: 6,
            dead_letter_after_max_attempts: true,
        };
        const businessDefinition: ConnectorAdapterDefinition = {
            adapter_id: 'advisor_crm_compliance_handoff',
            adapter_type: 'ADVISOR_CRM_COMPLIANCE_HANDOFF',
            display_name: 'Advisor CRM/compliance handoff',
            description: 'Pilot advisor workflow handoff into the CRM/compliance intake package.',
            business_path: true,
            transport_connector_type: config.connector_type,
            transport_connector_id: config.connector_id,
            timeout_ms: config.timeout_ms,
            max_attempts: 2,
            rate_limit_window_ms: 60_000,
            rate_limit_max_deliveries: 4,
            dead_letter_after_max_attempts: true,
        };
        return new Map<string, ConnectorAdapter<any>>([
            [genericDefinition.adapter_id, new GenericHttpsWebhookAdapter(genericDefinition)],
            [businessDefinition.adapter_id, new AdvisorCrmComplianceHandoffAdapter(businessDefinition)],
        ]);
    }

    listAdapterDefinitions(): ConnectorAdapterDefinition[] {
        return Array.from(this.adapters.values())
            .map((adapter) => adapter.definition)
            .sort((a, b) => a.adapter_id.localeCompare(b.adapter_id));
    }

    private getAdapter(adapterId: string): ConnectorAdapter<any> {
        const adapter = this.adapters.get(String(adapterId || '').trim());
        if (!adapter) {
            throw new Error('connector_adapter_not_found');
        }
        return adapter;
    }

    private async listAdapterAttempts(adapter: ConnectorAdapter<any>): Promise<WebhookDeliveryRecord[]> {
        const attempts = await this.store.listWebhookDeliveries(adapter.definition.transport_connector_id);
        return attempts
            .filter((record) => record.adapter_id === adapter.definition.adapter_id)
            .sort((a, b) => b.created_at - a.created_at);
    }

    private async buildHealthSummary(
        sessionId: string,
        adapter: ConnectorAdapter<any>,
    ): Promise<ConnectorPlatformHealthSummary> {
        const credentialHealth = await this.webhookService.inspectCredentialHealth({
            session_id: sessionId,
        });
        const attempts = await this.listAdapterAttempts(adapter);
        const recentAttempts = attempts.filter((attempt) => attempt.created_at >= (this.now() - 3_600_000));
        const lastAttempt = attempts[0];

        return {
            adapter: adapter.definition,
            health_status: connectorHealthStatus(credentialHealth, recentAttempts),
            route_eligible: credentialHealth.route_eligible,
            credential_health: {
                connector_id: credentialHealth.connector_id,
                credential_id: credentialHealth.credential_id,
                backend: credentialHealth.backend,
                status: credentialHealth.status,
                compromise_status: credentialHealth.compromise_status,
                route_eligible: credentialHealth.route_eligible,
                lease_id: credentialHealth.lease_id,
                lease_expires_at: credentialHealth.lease_expires_at,
                renewable: credentialHealth.renewable,
                rotated_at: credentialHealth.rotated_at,
                revoked_at: credentialHealth.revoked_at,
                last_failure_reason: credentialHealth.last_failure_reason,
                last_failure_at: credentialHealth.last_failure_at,
                last_delivery_status: credentialHealth.last_delivery_status,
                last_delivery_at: credentialHealth.last_delivery_at,
                recent_deliveries: credentialHealth.recent_deliveries,
                recommended_action: credentialHealth.recommended_action,
            },
            recent_attempt_count: recentAttempts.length,
            recent_failure_count: recentAttempts.filter((attempt) => attempt.status === 'FAILED').length,
            recent_timeout_count: recentAttempts.filter((attempt) => attempt.status === 'TIMED_OUT').length,
            recent_rate_limited_count: recentAttempts.filter((attempt) => attempt.status === 'RATE_LIMITED').length,
            dead_letter_count: attempts.filter((attempt) => attempt.status === 'DEAD_LETTERED').length,
            last_delivery_status: lastAttempt?.status,
            last_delivery_at: lastAttempt?.created_at,
        };
    }

    private async recordSyntheticAttempt(input: {
        adapter: ConnectorAdapter<any>;
        credentialHealth: VaultCredentialHealthSummary;
        delivery_group_id: string;
        task_id?: string;
        correlation_id?: string;
        run_id?: string;
        status: WebhookDeliveryStatus;
        attempt: number;
        payload_summary: string;
        reason: string;
    }): Promise<WebhookDeliveryRecord> {
        const config = this.requireConfig();
        const timestamp = this.now();
        const record: WebhookDeliveryRecord = {
            delivery_id: createOpaqueId('webhook_delivery'),
            connector_id: config.connector_id,
            credential_id: input.credentialHealth.credential_id,
            tenant_id: config.tenant_id,
            workspace_id: config.workspace_id,
            task_id: input.task_id,
            correlation_id: input.correlation_id,
            run_id: input.run_id,
            status: input.status,
            adapter_id: input.adapter.definition.adapter_id,
            adapter_type: input.adapter.definition.adapter_type,
            delivery_group_id: input.delivery_group_id,
            attempt: input.attempt,
            credential_status: input.credentialHealth.status,
            compromise_status: input.credentialHealth.compromise_status,
            blocked_reason: input.status === 'DEAD_LETTERED' ? undefined : input.reason,
            dead_letter_reason: input.status === 'DEAD_LETTERED' ? input.reason : undefined,
            payload_summary: input.payload_summary,
            created_at: timestamp,
            updated_at: timestamp,
        };
        await this.store.upsertWebhookDelivery(record);
        return record;
    }

    private summarizeDispatch(
        adapter: ConnectorAdapter<any>,
        deliveryGroupId: string,
        attempts: WebhookDeliveryRecord[],
    ): ConnectorPlatformDispatchSummary {
        const transportAttemptCount = attempts.filter((attempt) => attempt.status !== 'DEAD_LETTERED').length;
        const finalDelivery = attempts[attempts.length - 1];
        const lastTransportDelivery = [...attempts]
            .reverse()
            .find((attempt) => attempt.status !== 'DEAD_LETTERED')
            || finalDelivery;
        return {
            delivery_group_id: deliveryGroupId,
            adapter_id: adapter.definition.adapter_id,
            adapter_type: adapter.definition.adapter_type,
            transport_connector_id: adapter.definition.transport_connector_id,
            task_id: finalDelivery?.task_id,
            correlation_id: finalDelivery?.correlation_id,
            run_id: finalDelivery?.run_id,
            final_status: finalDelivery?.status || 'FAILED',
            attempts: transportAttemptCount,
            succeeded: finalDelivery?.status === 'DELIVERED',
            dead_lettered: finalDelivery?.status === 'DEAD_LETTERED',
            timed_out: attempts.some((attempt) => attempt.status === 'TIMED_OUT'),
            rate_limited: attempts.some((attempt) => attempt.status === 'RATE_LIMITED'),
            final_http_status: lastTransportDelivery?.http_status,
            final_request_id: lastTransportDelivery?.request_id,
            final_reason: finalDelivery?.dead_letter_reason || finalDelivery?.blocked_reason,
            created_at: attempts[0]?.created_at || this.now(),
            updated_at: finalDelivery?.updated_at || this.now(),
        };
    }

    private async dispatchWithAdapter<Input extends {
        session_id: string;
        task_id?: string;
        correlation_id?: string;
        run_id?: string;
    }>(
        adapterId: string,
        input: Input,
    ): Promise<ConnectorPlatformDispatchResult> {
        const adapter = this.getAdapter(adapterId);
        const prepared = adapter.prepare(input);
        const deliveryGroupId = createOpaqueId('connector_delivery');
        const initialHealth = await this.webhookService.inspectCredentialHealth({
            session_id: input.session_id,
        });

        if (!initialHealth.route_eligible) {
            const blocked = await this.recordSyntheticAttempt({
                adapter,
                credentialHealth: initialHealth,
                delivery_group_id: deliveryGroupId,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: 'BLOCKED_CREDENTIAL',
                attempt: 1,
                payload_summary: prepared.payload_summary,
                reason: initialHealth.last_failure_reason || 'credential_route_blocked',
            });
            const connectorHealth = await this.buildHealthSummary(input.session_id, adapter);
            return {
                adapter: adapter.definition,
                connector_delivery: this.summarizeDispatch(adapter, deliveryGroupId, [blocked]),
                attempts: [blocked],
                delivery: blocked,
                connector_health: connectorHealth,
                route_eligible: false,
            };
        }

        const recentAttempts = (await this.listAdapterAttempts(adapter))
            .filter((attempt) => attempt.created_at >= (this.now() - adapter.definition.rate_limit_window_ms))
            .filter((attempt) => attempt.status !== 'DEAD_LETTERED');
        if (recentAttempts.length >= adapter.definition.rate_limit_max_deliveries) {
            const rateLimited = await this.recordSyntheticAttempt({
                adapter,
                credentialHealth: initialHealth,
                delivery_group_id: deliveryGroupId,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: 'RATE_LIMITED',
                attempt: 1,
                payload_summary: prepared.payload_summary,
                reason: 'connector_rate_limit_exceeded',
            });
            const connectorHealth = await this.buildHealthSummary(input.session_id, adapter);
            return {
                adapter: adapter.definition,
                connector_delivery: this.summarizeDispatch(adapter, deliveryGroupId, [rateLimited]),
                attempts: [rateLimited],
                delivery: rateLimited,
                connector_health: connectorHealth,
                route_eligible: false,
            };
        }

        const attempts: WebhookDeliveryRecord[] = [];
        for (let attempt = 1; attempt <= adapter.definition.max_attempts; attempt += 1) {
            const result = await this.webhookService.deliver({
                session_id: input.session_id,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                payload: prepared.payload,
                request_headers: prepared.request_headers,
                payload_summary: prepared.payload_summary,
                adapter_id: adapter.definition.adapter_id,
                adapter_type: adapter.definition.adapter_type,
                delivery_group_id: deliveryGroupId,
                attempt,
                timeout_ms: adapter.definition.timeout_ms,
            });
            attempts.push(result.delivery);

            if (!isRetryableStatus(result.delivery.status)) {
                const connectorHealth = await this.buildHealthSummary(input.session_id, adapter);
                return {
                    adapter: adapter.definition,
                    connector_delivery: this.summarizeDispatch(adapter, deliveryGroupId, attempts),
                    attempts,
                    delivery: result.delivery,
                    connector_health: connectorHealth,
                    route_eligible: connectorHealth.route_eligible,
                };
            }
        }

        const lastAttempt = attempts[attempts.length - 1];
        if (adapter.definition.dead_letter_after_max_attempts && lastAttempt) {
            const postFailureHealth = await this.webhookService.inspectCredentialHealth({
                session_id: input.session_id,
            });
            const deadLetter = await this.recordSyntheticAttempt({
                adapter,
                credentialHealth: postFailureHealth,
                delivery_group_id: deliveryGroupId,
                task_id: input.task_id,
                correlation_id: input.correlation_id,
                run_id: input.run_id,
                status: 'DEAD_LETTERED',
                attempt: adapter.definition.max_attempts,
                payload_summary: prepared.payload_summary,
                reason: lastAttempt.blocked_reason || 'connector_max_attempts_exhausted',
            });
            attempts.push(deadLetter);
        }

        const connectorHealth = await this.buildHealthSummary(input.session_id, adapter);
        const delivery = [...attempts]
            .reverse()
            .find((attempt) => attempt.status !== 'DEAD_LETTERED');
        return {
            adapter: adapter.definition,
            connector_delivery: this.summarizeDispatch(adapter, deliveryGroupId, attempts),
            attempts,
            delivery,
            connector_health: connectorHealth,
            route_eligible: connectorHealth.route_eligible,
        };
    }

    async inspectConnectorHealth(input: {
        session_id: string;
        adapter_id: string;
    }): Promise<ConnectorPlatformHealthSummary> {
        const adapter = this.getAdapter(input.adapter_id);
        return this.buildHealthSummary(input.session_id, adapter);
    }

    async inspectAllConnectorHealth(input: {
        session_id: string;
    }): Promise<ConnectorPlatformHealthSummary[]> {
        const adapters = this.listAdapterDefinitions();
        const results: ConnectorPlatformHealthSummary[] = [];
        for (const definition of adapters) {
            results.push(await this.inspectConnectorHealth({
                session_id: input.session_id,
                adapter_id: definition.adapter_id,
            }));
        }
        return results;
    }

    async dispatchGenericWebhook(
        input: GenericWebhookConnectorDispatchInput,
    ): Promise<ConnectorPlatformDispatchResult> {
        return this.dispatchWithAdapter('generic_https_webhook', input);
    }

    async dispatchAdvisorCrmComplianceHandoff(
        input: AdvisorCrmComplianceHandoffInput,
    ): Promise<ConnectorPlatformDispatchResult> {
        return this.dispatchWithAdapter('advisor_crm_compliance_handoff', input);
    }
}

let connectorPlatformServiceSingleton: ConnectorPlatformService | null = null;

export function getConnectorPlatformService(): ConnectorPlatformService {
    if (!connectorPlatformServiceSingleton) {
        connectorPlatformServiceSingleton = new ConnectorPlatformService();
    }
    return connectorPlatformServiceSingleton;
}

export function resetConnectorPlatformServiceForTests(): void {
    connectorPlatformServiceSingleton = null;
}

export function setConnectorPlatformServiceForTests(service: ConnectorPlatformService): void {
    connectorPlatformServiceSingleton = service;
}

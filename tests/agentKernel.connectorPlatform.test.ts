import { describe, expect, it } from 'vitest';
import { ConnectorPlatformService } from '../services/agent-kernel/connectorPlatform.js';
import type {
    HashiCorpVaultPort,
    PilotIdentityProviderConfig,
    PilotVaultWebhookConfig,
    WebhookDeliveryPort,
} from '../services/agent-kernel/contracts.js';
import { EnterpriseIdentityAdminService } from '../services/agent-kernel/identityAdmin.js';
import { createTaskStore } from '../services/agent-kernel/storeAdapters.js';
import { VaultBackedWebhookService } from '../services/agent-kernel/vaultWebhook.js';

function createPilotIdentityConfig(): PilotIdentityProviderConfig {
    return {
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        issuer: 'https://example.okta.com/oauth2/default',
        client_id: 'client_test',
        client_secret: 'secret_test',
        default_workspace_id: 'workspace_alpha',
        scopes: ['openid', 'profile', 'email', 'groups'],
        groups_claim: 'groups',
        email_claim: 'email',
        name_claim: 'name',
        subject_claim: 'sub',
        default_roles: ['WORKSPACE_MEMBER'],
        group_role_mappings: [],
    };
}

function createWebhookConfig(): PilotVaultWebhookConfig {
    return {
        backend: 'HASHICORP_VAULT',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        connector_type: 'HTTPS_WEBHOOK',
        connector_id: 'pilot_https_webhook',
        endpoint_url: 'https://webhook.example.com/pilot',
        auth_header_name: 'Authorization',
        auth_header_prefix: 'Bearer',
        timeout_ms: 4_000,
        credential_id: 'pilot_https_webhook_credential',
        vault_addr: 'https://vault.example.com',
        vault_token: 'vault-token',
        read_path: 'secret/data/pilot/webhook',
        rotate_path: 'sys/rotate/pilot/webhook',
        secret_value_field: 'token',
        renew_increment_seconds: 600,
    };
}

async function seedTenantAdmin(input: {
    store: ReturnType<typeof createTaskStore>;
    sessionId: string;
    principalId: string;
    now: () => number;
}): Promise<void> {
    await input.store.upsertEnterprisePrincipal({
        principal_id: input.principalId,
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        external_subject: `${input.principalId}_subject`,
        email: `${input.principalId}@example.com`,
        display_name: 'Connector Platform Admin',
        groups: ['agent-os-tenant-admins'],
        status: 'ACTIVE',
        created_at: input.now(),
        updated_at: input.now(),
    });
    await input.store.upsertEnterpriseAccessBinding({
        binding_id: `${input.principalId}_binding`,
        principal_id: input.principalId,
        tenant_id: 'tenant_pilot',
        roles: ['TENANT_ADMIN'],
        source: 'SCIM_SYNC',
        source_group: 'agent-os-tenant-admins',
        status: 'ACTIVE',
        provisioned_at: input.now(),
        created_at: input.now(),
        updated_at: input.now(),
    });
    await input.store.upsertEnterpriseIdentitySession({
        session_id: input.sessionId,
        principal_id: input.principalId,
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        roles: ['TENANT_ADMIN'],
        status: 'ACTIVE',
        claims: {
            issuer: 'https://example.okta.com/oauth2/default',
            subject: `${input.principalId}_subject`,
            audience: 'client_test',
            email: `${input.principalId}@example.com`,
            display_name: 'Connector Platform Admin',
            groups: ['agent-os-tenant-admins'],
        },
        issued_at: input.now(),
        expires_at: input.now() + 600_000,
        last_seen_at: input.now(),
        created_at: input.now(),
        updated_at: input.now(),
    });
}

function createServiceHarness(options?: {
    webhookDeliveryPort?: WebhookDeliveryPort;
    vaultPort?: HashiCorpVaultPort;
}) {
    const store = createTaskStore({ driver: 'memory' });
    let currentTimeMs = 1_900_000_000_000;
    const now = () => {
        currentTimeMs += 100;
        return currentTimeMs;
    };
    const config = createWebhookConfig();
    const identityService = new EnterpriseIdentityAdminService({
        store,
        config: createPilotIdentityConfig(),
        now,
    });
    const vaultPort = options?.vaultPort || {
        async readCredential(activeConfig) {
            return {
                credential_id: activeConfig.credential_id,
                secret_value: 'platform_secret_v1',
                lease_id: 'lease_platform_v1',
                renewable: true,
                lease_duration_seconds: 900,
                expires_at: currentTimeMs + 900_000,
                version: '1',
                metadata: { backend: 'kv-v2' },
            };
        },
        async renewLease(activeConfig, leaseId) {
            return {
                lease_id: leaseId,
                renewable: true,
                lease_duration_seconds: 900,
                expires_at: currentTimeMs + 900_000,
                version: '1',
            };
        },
        async revokeLease() {
            // unused in Launch 07 conformance coverage
        },
        async rotateCredential(activeConfig) {
            return {
                credential_id: activeConfig.credential_id,
                secret_value: 'platform_secret_v2',
                lease_id: 'lease_platform_v2',
                renewable: true,
                lease_duration_seconds: 900,
                expires_at: currentTimeMs + 900_000,
                version: '2',
                metadata: { backend: 'kv-v2', rotated: true },
            };
        },
    } satisfies HashiCorpVaultPort;
    const webhookDeliveryPort = options?.webhookDeliveryPort || {
        async deliver({ payload }) {
            return {
                ok: true,
                status: 202,
                request_id: `platform_req_${String((payload as { crm_record_id?: string })?.crm_record_id || 'generic')}`,
                response_excerpt: 'accepted',
            };
        },
    } satisfies WebhookDeliveryPort;
    const webhookService = new VaultBackedWebhookService({
        store,
        config,
        hashiCorpVaultPort: vaultPort,
        webhookDeliveryPort,
        identityAdminService: identityService,
        now,
    });
    const connectorPlatform = new ConnectorPlatformService({
        store,
        config,
        webhookService,
        now,
    });
    return {
        store,
        now,
        config,
        identityService,
        webhookService,
        connectorPlatform,
    };
}

describe('agent-kernel connector platform', () => {
    it('lists the frozen adapter set and reports healthy baseline state', async () => {
        const harness = createServiceHarness();
        await seedTenantAdmin({
            store: harness.store,
            sessionId: 'entsess_platform_health',
            principalId: 'eprinc_platform_health',
            now: harness.now,
        });

        const definitions = harness.connectorPlatform.listAdapterDefinitions();
        expect(definitions.map((definition) => definition.adapter_id)).toEqual([
            'advisor_crm_compliance_handoff',
            'generic_https_webhook',
        ]);
        expect(definitions.map((definition) => definition.adapter_type)).toEqual([
            'ADVISOR_CRM_COMPLIANCE_HANDOFF',
            'GENERIC_HTTPS_WEBHOOK',
        ]);

        const health = await harness.connectorPlatform.inspectAllConnectorHealth({
            session_id: 'entsess_platform_health',
        });
        expect(health).toHaveLength(2);
        expect(health.every((entry) => entry.route_eligible)).toBe(true);
        expect(health.every((entry) => entry.health_status === 'HEALTHY')).toBe(true);
        expect(health[0]?.credential_health.backend).toBe('HASHICORP_VAULT');
    });

    it('rate limits the generic webhook adapter and durably records adapter metadata', async () => {
        const harness = createServiceHarness();
        await seedTenantAdmin({
            store: harness.store,
            sessionId: 'entsess_platform_rate_limit',
            principalId: 'eprinc_platform_rate_limit',
            now: harness.now,
        });

        for (let index = 0; index < 6; index += 1) {
            const result = await harness.connectorPlatform.dispatchGenericWebhook({
                session_id: 'entsess_platform_rate_limit',
                payload: { sequence: index + 1 },
                payload_summary: `generic-${index + 1}`,
                request_headers: { 'x-request-source': 'connector-platform-test' },
            });
            expect(result.connector_delivery.final_status).toBe('DELIVERED');
        }

        const rateLimited = await harness.connectorPlatform.dispatchGenericWebhook({
            session_id: 'entsess_platform_rate_limit',
            payload: { sequence: 7 },
            payload_summary: 'generic-7',
            request_headers: { 'x-request-source': 'connector-platform-test' },
        });

        expect(rateLimited.connector_delivery.final_status).toBe('RATE_LIMITED');
        expect(rateLimited.connector_delivery.rate_limited).toBe(true);
        expect(rateLimited.delivery?.status).toBe('RATE_LIMITED');
        expect(rateLimited.delivery?.adapter_id).toBe('generic_https_webhook');
        expect(rateLimited.delivery?.adapter_type).toBe('GENERIC_HTTPS_WEBHOOK');
        expect(rateLimited.delivery?.delivery_group_id).toBeTruthy();
        expect(rateLimited.delivery?.attempt).toBe(1);
        expect(rateLimited.route_eligible).toBe(false);

        const health = await harness.connectorPlatform.inspectConnectorHealth({
            session_id: 'entsess_platform_rate_limit',
            adapter_id: 'generic_https_webhook',
        });
        expect(health.health_status).toBe('DEGRADED');
        expect(health.recent_attempt_count).toBe(7);
        expect(health.recent_rate_limited_count).toBe(1);

        const persisted = (await harness.store.listWebhookDeliveries(harness.config.connector_id))
            .filter((record) => record.adapter_id === 'generic_https_webhook');
        expect(persisted).toHaveLength(7);
        expect(persisted.some((record) => record.status === 'RATE_LIMITED')).toBe(true);
    });

    it('dead letters the pilot business adapter after timeout retries and preserves the transformed payload', async () => {
        const deliveredPayloads: unknown[] = [];
        const harness = createServiceHarness({
            webhookDeliveryPort: {
                async deliver({ payload }) {
                    deliveredPayloads.push(payload);
                    throw new Error('connector_delivery_timeout');
                },
            },
        });
        await seedTenantAdmin({
            store: harness.store,
            sessionId: 'entsess_platform_dead_letter',
            principalId: 'eprinc_platform_dead_letter',
            now: harness.now,
        });

        const result = await harness.connectorPlatform.dispatchAdvisorCrmComplianceHandoff({
            session_id: 'entsess_platform_dead_letter',
            workflow_id: 'workflow_123',
            crm_record_id: 'crm_456',
            client_name: 'A. Client',
            advisor_name: 'Advisor Jane',
            meeting_title: 'Quarterly Review',
            post_meeting_notes: 'Discussed risk tolerance changes.',
            crm_ready_draft: 'CRM draft summary',
            compliance_handoff_package: 'Compliance packet v1',
            evidence_refs: ['note_1', 'draft_1'],
            request_headers: { 'x-request-source': 'connector-platform-test' },
        });

        expect(result.adapter.adapter_id).toBe('advisor_crm_compliance_handoff');
        expect(result.connector_delivery.final_status).toBe('DEAD_LETTERED');
        expect(result.connector_delivery.dead_lettered).toBe(true);
        expect(result.connector_delivery.timed_out).toBe(true);
        expect(result.connector_delivery.attempts).toBe(2);
        expect(result.attempts.map((attempt) => attempt.status)).toEqual([
            'TIMED_OUT',
            'TIMED_OUT',
            'DEAD_LETTERED',
        ]);
        expect(result.attempts[2]?.dead_letter_reason).toBe('connector_delivery_timeout');
        expect(result.delivery?.status).toBe('TIMED_OUT');
        expect(result.connector_health.health_status).toBe('DEGRADED');
        expect(result.connector_health.recent_timeout_count).toBe(2);
        expect(result.connector_health.dead_letter_count).toBe(1);

        expect(deliveredPayloads).toHaveLength(2);
        expect(deliveredPayloads[0]).toMatchObject({
            template_family: 'advisor_workflow_execution',
            handoff_path: 'crm_compliance_intake',
            workflow_stage: 'crm_ready_draft_to_compliance_handoff',
            workflow_id: 'workflow_123',
            crm_record_id: 'crm_456',
            client_name: 'A. Client',
            advisor_name: 'Advisor Jane',
            meeting_title: 'Quarterly Review',
            package: {
                post_meeting_notes: 'Discussed risk tolerance changes.',
                crm_ready_draft: 'CRM draft summary',
                compliance_handoff_package: 'Compliance packet v1',
                evidence_refs: ['note_1', 'draft_1'],
            },
        });

        const persisted = (await harness.store.listWebhookDeliveries(harness.config.connector_id))
            .filter((record) => record.adapter_id === 'advisor_crm_compliance_handoff');
        expect(persisted).toHaveLength(3);
        expect(persisted.some((record) => record.status === 'DEAD_LETTERED')).toBe(true);
    });
});

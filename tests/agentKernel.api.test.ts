import { beforeEach, describe, expect, it } from 'vitest';
import directorySyncHandler from '../api/agent-kernel/admin/directory-sync';
import complianceAuditExportHandler from '../api/agent-kernel/compliance/audit-export';
import complianceDeletionRequestHandler from '../api/agent-kernel/compliance/deletion-request';
import complianceSummaryHandler from '../api/agent-kernel/compliance/summary';
import activationActorReadinessHandler from '../api/agent-kernel/activation/actor-readiness';
import activationArtifactIntakeHandler from '../api/agent-kernel/activation/artifact-intake';
import activationArtifactReviewHandler from '../api/agent-kernel/activation/artifact-review';
import activationConnectorEligibilityHandler from '../api/agent-kernel/activation/connector-eligibility';
import activationEvidenceHandler from '../api/agent-kernel/activation/evidence';
import activationEnvironmentBindingHandler from '../api/agent-kernel/activation/environment-binding';
import activationPackageHandoffHandler from '../api/agent-kernel/activation/package-handoff';
import deploymentSummaryHandler from '../api/agent-kernel/deployment/summary';
import environmentSummaryHandler from '../api/agent-kernel/environment/summary';
import advisorCrmComplianceHandoffHandler from '../api/agent-kernel/connectors/business/advisor-crm-compliance-handoff';
import connectorPlatformHealthHandler from '../api/agent-kernel/connectors/platform/health';
import credentialHealthWebhookHandler from '../api/agent-kernel/connectors/webhook/credential-health';
import renewWebhookCredentialHandler from '../api/agent-kernel/connectors/webhook/credential/renew';
import revokeWebhookCredentialHandler from '../api/agent-kernel/connectors/webhook/credential/revoke';
import rotateWebhookCredentialHandler from '../api/agent-kernel/connectors/webhook/credential/rotate';
import deliverWebhookHandler from '../api/agent-kernel/connectors/webhook/deliver';
import authorizeOidcHandler from '../api/agent-kernel/identity/oidc/authorize';
import exchangeOidcHandler from '../api/agent-kernel/identity/oidc/exchange';
import observabilitySummaryHandler from '../api/agent-kernel/observability/summary';
import policyStudioSummaryHandler from '../api/agent-kernel/policy-studio/summary';
import productShellSummaryHandler from '../api/agent-kernel/product-shell/summary';
import enterpriseAccountHandler from '../api/agent-kernel/enterprise/account';
import enterpriseCentersHandler from '../api/agent-kernel/enterprise/centers';
import enterpriseCenterDecisionHandler from '../api/agent-kernel/enterprise/centers/[itemId]/decision';
import enterpriseInvitesHandler from '../api/agent-kernel/enterprise/invites';
import enterpriseInviteAcceptHandler from '../api/agent-kernel/enterprise/invites/accept';
import enterpriseInviteRevokeHandler from '../api/agent-kernel/enterprise/invites/revoke';
import enterpriseMembersHandler from '../api/agent-kernel/enterprise/members';
import enterpriseReactivateHandler from '../api/agent-kernel/enterprise/members/reactivate';
import enterpriseAssignRoleHandler from '../api/agent-kernel/enterprise/members/assign-role';
import enterpriseRemoveRoleHandler from '../api/agent-kernel/enterprise/members/remove-role';
import enterpriseInviteHandler from '../api/agent-kernel/enterprise/members/invite';
import enterpriseDeactivateHandler from '../api/agent-kernel/enterprise/members/deactivate';
import trialWorkspaceSummaryHandler from '../api/agent-kernel/trial-workspace/summary';
import trialWorkspaceSessionHandler from '../api/agent-kernel/trial-workspace/session';
import trialWorkspaceTaskHandler from '../api/agent-kernel/trial-workspace/task';
import trialWorkspaceInviteHandler from '../api/agent-kernel/trial-workspace/invite';
import trialWorkspaceInviteAcceptHandler from '../api/agent-kernel/trial-workspace/invite/accept';
import trialWorkspaceSeatReleaseHandler from '../api/agent-kernel/trial-workspace/seat/release';
import createTaskHandler from '../api/agent-kernel/tasks/index';
import getTaskHandler from '../api/agent-kernel/tasks/[taskId]';
import runTaskHandler from '../api/agent-kernel/tasks/[taskId]/run';
import approveTaskHandler from '../api/agent-kernel/tasks/[taskId]/approve';
import {
    EnterpriseIdentityAdminService,
    resetEnterpriseIdentityAdminServiceForTests,
    setEnterpriseIdentityAdminServiceForTests,
} from '../services/agent-kernel/identityAdmin.js';
import {
    EnterpriseAccountService,
    resetEnterpriseAccountServiceForTests,
    setEnterpriseAccountServiceForTests,
} from '../services/agent-kernel/enterpriseAccount.js';
import {
    resetTaskGraphRuntimeForTests,
    setTaskGraphRuntimeForTests,
    TaskGraphRuntime,
} from '../services/agent-kernel/runtime.js';
import { createTaskStore } from '../services/agent-kernel/storeAdapters.js';
import {
    ConnectorPlatformService,
    resetConnectorPlatformServiceForTests,
    setConnectorPlatformServiceForTests,
} from '../services/agent-kernel/connectorPlatform.js';
import {
    resetVaultBackedWebhookServiceForTests,
    setVaultBackedWebhookServiceForTests,
    VaultBackedWebhookService,
} from '../services/agent-kernel/vaultWebhook.js';
import { resetTrialWorkspaceServiceForTests } from '../services/agent-kernel/trialWorkspace.js';
import type {
    EnterpriseIdentitySessionRecord,
    HashiCorpVaultPort,
    PilotIdentityProviderConfig,
    PilotVaultWebhookConfig,
    WebhookDeliveryPort,
} from '../services/agent-kernel/contracts.js';
import { getToolRegistry } from '../services/toolRegistry.js';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';

type MockReq = {
    method: string;
    body?: any;
    query?: Record<string, any>;
    headers?: Record<string, any>;
};

const DEPLOYMENT_ENV_KEYS = [
    'AGENT_KERNEL_DEPLOYMENT_STAGE',
    'AGENT_KERNEL_DEPLOYMENT_ENVIRONMENT',
    'AGENT_KERNEL_PRIMARY_REGION',
    'AGENT_KERNEL_STAGING_REGION',
    'AGENT_KERNEL_RESIDENCY_SCOPE',
    'AGENT_KERNEL_PILOT_TENANT_ID',
    'AGENT_KERNEL_OKTA_ISSUER',
    'AGENT_KERNEL_OKTA_CLIENT_ID',
    'AGENT_KERNEL_OKTA_CLIENT_SECRET',
    'AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID',
    'AGENT_KERNEL_VAULT_ADDR',
    'AGENT_KERNEL_VAULT_TOKEN',
    'AGENT_KERNEL_VAULT_NAMESPACE',
    'AGENT_KERNEL_VAULT_WEBHOOK_READ_PATH',
    'AGENT_KERNEL_VAULT_WEBHOOK_ROTATE_PATH',
    'AGENT_KERNEL_WEBHOOK_ENDPOINT_URL',
    'AGENT_KERNEL_WEBHOOK_CONNECTOR_ID',
    'AGENT_KERNEL_VAULT_WEBHOOK_CREDENTIAL_ID',
] as const;

const PRODUCT_SHELL_ENV_KEYS = [
    'LUMI_BASE_URL',
    'LUMI_API_BASE_URL',
    'LUMI_ENVIRONMENT_KIND',
    'LUMI_ENVIRONMENT_LABEL',
    'LUMI_TENANT_ID',
    'LUMI_WORKSPACE_ID',
    'LUMI_REQUESTER_ACTOR_ID',
    'LUMI_REQUESTER_ACTOR_LABEL',
    'LUMI_OPERATOR_ACTOR_ID',
    'LUMI_OPERATOR_ACTOR_LABEL',
    'LUMI_TENANT_ADMIN_ACTOR_ID',
    'LUMI_TENANT_ADMIN_ACTOR_LABEL',
    'LUMI_DEMO_MODE_ENABLED',
] as const;

type MockRes = {
    statusCode: number;
    payload: any;
    headers: Record<string, string>;
    status: (code: number) => MockRes;
    json: (payload: any) => MockRes;
    setHeader: (key: string, value: string) => void;
    end: () => void;
};

function createMockRes(): MockRes {
    return {
        statusCode: 200,
        payload: undefined,
        headers: {},
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.payload = payload;
            return this;
        },
        setHeader(key: string, value: string) {
            this.headers[key] = value;
        },
        end() {
            // no-op
        },
    };
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

function createAllowAllPolicy(): PolicyEngine {
    return new PolicyEngine({
        version: 'test',
        defaults: {
            action: 'ALLOW',
            log_level: 'MINIMAL',
        },
        rules: [],
    });
}

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
        group_role_mappings: [
            {
                group_name: 'agent-os-tenant-admins',
                tenant_id: 'tenant_pilot',
                roles: ['TENANT_ADMIN'],
            },
            {
                group_name: 'agent-os-workspace-admins',
                tenant_id: 'tenant_pilot',
                workspace_id: 'workspace_alpha',
                roles: ['WORKSPACE_ADMIN'],
            },
        ],
    };
}

function resetDeploymentEnv(): void {
    for (const key of DEPLOYMENT_ENV_KEYS) {
        delete process.env[key];
    }
}

function applyPilotDeploymentEnv(overrides?: Record<string, string | undefined>): void {
    resetDeploymentEnv();
    const values: Record<string, string> = {
        AGENT_KERNEL_DEPLOYMENT_STAGE: 'pilot',
        AGENT_KERNEL_DEPLOYMENT_ENVIRONMENT: 'production',
        AGENT_KERNEL_PRIMARY_REGION: 'eu-west-2',
        AGENT_KERNEL_STAGING_REGION: 'eu-west-2',
        AGENT_KERNEL_RESIDENCY_SCOPE: 'UK',
        AGENT_KERNEL_PILOT_TENANT_ID: 'tenant_pilot',
        AGENT_KERNEL_OKTA_ISSUER: 'https://example.okta.com/oauth2/default',
        AGENT_KERNEL_OKTA_CLIENT_ID: 'client_test',
        AGENT_KERNEL_OKTA_CLIENT_SECRET: 'secret_test',
        AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID: 'workspace_alpha',
        AGENT_KERNEL_VAULT_ADDR: 'https://vault.example.com',
        AGENT_KERNEL_VAULT_TOKEN: 'vault_token_test',
        AGENT_KERNEL_VAULT_WEBHOOK_READ_PATH: 'secret/data/pilot/webhook',
        AGENT_KERNEL_VAULT_WEBHOOK_ROTATE_PATH: 'sys/rotate/pilot/webhook',
        AGENT_KERNEL_WEBHOOK_ENDPOINT_URL: 'https://webhook.example.com/pilot',
        AGENT_KERNEL_WEBHOOK_CONNECTOR_ID: 'pilot_https_webhook',
        AGENT_KERNEL_VAULT_WEBHOOK_CREDENTIAL_ID: 'pilot_https_webhook_credential',
    };
    for (const [key, value] of Object.entries(overrides || {})) {
        if (value === undefined) {
            delete values[key];
            continue;
        }
        values[key] = value;
    }
    Object.assign(process.env, values);
}

async function seedEnterpriseAdminSession(
    sessionId = 'entsess_compliance_admin',
    role: EnterpriseIdentitySessionRecord['roles'][number] = 'WORKSPACE_ADMIN',
): Promise<{ sessionId: string }> {
    const store = createTaskStore({ driver: 'memory' });
    const runtime = new TaskGraphRuntime({
        policyEngine: createAllowAllPolicy(),
        store,
    });
    setTaskGraphRuntimeForTests(runtime);

    await store.upsertEnterprisePrincipal({
        principal_id: 'principal_compliance_admin',
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        external_subject: '00u_compliance_admin',
        email: 'compliance-admin@example.com',
        display_name: 'Compliance Admin',
        groups: ['agent-os-workspace-admins'],
        status: 'ACTIVE',
        last_login_at: 100,
        last_directory_sync_at: 100,
        created_at: 100,
        updated_at: 100,
    });
    await store.upsertEnterpriseAccessBinding({
        binding_id: 'binding_compliance_admin',
        principal_id: 'principal_compliance_admin',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        roles: [role],
        source: 'OIDC_LOGIN',
        source_group: 'agent-os-workspace-admins',
        status: 'ACTIVE',
        provisioned_at: 100,
        created_at: 100,
        updated_at: 100,
    });
    await store.upsertEnterpriseIdentitySession({
        session_id: sessionId,
        principal_id: 'principal_compliance_admin',
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        roles: [role],
        status: 'ACTIVE',
        claims: {
            issuer: 'https://example.okta.com/oauth2/default',
            subject: '00u_compliance_admin',
            audience: 'client_test',
            email: 'compliance-admin@example.com',
            display_name: 'Compliance Admin',
            groups: ['agent-os-workspace-admins'],
            nonce: 'nonce_compliance_admin',
        },
        issued_at: Date.now(),
        expires_at: Date.now() + 60_000,
        last_seen_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
    });

    return { sessionId };
}

async function seedEnterpriseSessionForActivation(
    store: ReturnType<typeof createTaskStore>,
    sessionId = 'entsess_activation_admin',
): Promise<{ sessionId: string }> {
    const issuedAt = Date.now();
    await store.upsertEnterprisePrincipal({
        principal_id: 'principal_activation_admin',
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        external_subject: '00u_activation_admin',
        email: 'activation-admin@example.com',
        display_name: 'Activation Admin',
        groups: ['agent-os-tenant-admins', 'agent-os-workspace-admins'],
        status: 'ACTIVE',
        last_login_at: issuedAt,
        last_directory_sync_at: issuedAt,
        created_at: issuedAt,
        updated_at: issuedAt,
    });
    await store.upsertEnterpriseAccessBinding({
        binding_id: 'binding_activation_admin_tenant',
        principal_id: 'principal_activation_admin',
        tenant_id: 'tenant_pilot',
        roles: ['TENANT_ADMIN', 'REQUESTER', 'OPERATOR', 'APPROVER', 'REVIEWER', 'INTEGRATION_ADMIN'],
        source: 'OIDC_LOGIN',
        source_group: 'agent-os-tenant-admins',
        status: 'ACTIVE',
        provisioned_at: issuedAt,
        created_at: issuedAt,
        updated_at: issuedAt,
    });
    await store.upsertEnterpriseAccessBinding({
        binding_id: 'binding_activation_admin_workspace',
        principal_id: 'principal_activation_admin',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        roles: ['WORKSPACE_ADMIN'],
        source: 'OIDC_LOGIN',
        source_group: 'agent-os-workspace-admins',
        status: 'ACTIVE',
        provisioned_at: issuedAt,
        created_at: issuedAt,
        updated_at: issuedAt,
    });
    await store.upsertEnterpriseIdentitySession({
        session_id: sessionId,
        principal_id: 'principal_activation_admin',
        provider: 'OKTA_OIDC',
        tenant_id: 'tenant_pilot',
        workspace_id: 'workspace_alpha',
        roles: ['TENANT_ADMIN', 'WORKSPACE_ADMIN', 'REQUESTER', 'OPERATOR', 'APPROVER', 'REVIEWER', 'INTEGRATION_ADMIN'],
        status: 'ACTIVE',
        claims: {
            issuer: 'https://example.okta.com/oauth2/default',
            subject: '00u_activation_admin',
            audience: 'client_test',
            email: 'activation-admin@example.com',
            display_name: 'Activation Admin',
            groups: ['agent-os-tenant-admins', 'agent-os-workspace-admins'],
            nonce: 'nonce_activation_admin',
        },
        issued_at: issuedAt,
        expires_at: issuedAt + 60_000,
        last_seen_at: issuedAt,
        created_at: issuedAt,
        updated_at: issuedAt,
    });

    return { sessionId };
}

describe('agent-kernel api', () => {
    beforeEach(() => {
        resetDeploymentEnv();
        for (const key of PRODUCT_SHELL_ENV_KEYS) {
            delete process.env[key];
        }
        resetTaskGraphRuntimeForTests();
        resetEnterpriseIdentityAdminServiceForTests();
        resetEnterpriseAccountServiceForTests();
        resetVaultBackedWebhookServiceForTests();
        resetConnectorPlatformServiceForTests();
        resetTrialWorkspaceServiceForTests();
        setTaskGraphRuntimeForTests(new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
        }));
    });

    it('creates, runs, waits approval, and resumes', async () => {
        const createReq: MockReq = {
            method: 'POST',
            body: {
                graph: {
                    task_id: `kernel_test_${Date.now()}`,
                    goal: 'approval path',
                    nodes: [
                        { id: 'n1', type: 'approval', name: 'calendar.read' },
                        { id: 'n2', type: 'llm', name: 'search.web', input_from: ['n1'] },
                    ],
                    edges: [['n1', 'n2']],
                    retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
                    context: {
                        permissions: { any: true },
                    },
                },
            },
        };
        const createRes = createMockRes();
        await createTaskHandler(createReq as any, createRes as any);

        expect(createRes.statusCode).toBe(200);
        expect(createRes.payload?.success).toBe(true);
        expect(createRes.payload?.correlation_id).toBeTruthy();
        expect(createRes.payload?.execution_ledger?.ledger?.record_count).toBe(2);
        expect(createRes.payload?.observability?.correlation?.correlation_id).toBe(createRes.payload?.correlation_id);

        const taskId = String(createRes.payload?.task_id || '');
        expect(taskId).toBeTruthy();

        const runRes = createMockRes();
        await runTaskHandler({ method: 'POST', query: { taskId } } as any, runRes as any);
        expect(runRes.statusCode).toBe(200);

        await sleep(30);

        const getWaitingRes = createMockRes();
        await getTaskHandler({ method: 'GET', query: { taskId } } as any, getWaitingRes as any);
        expect(getWaitingRes.statusCode).toBe(200);
        expect(getWaitingRes.payload?.status).toBe('WAITING_USER');
        expect(getWaitingRes.payload?.current_wait?.node_id).toBe('n1');

        const approveRes = createMockRes();
        await approveTaskHandler({
            method: 'POST',
            query: { taskId },
            body: { node_id: 'n1', decision: 'approve' },
        } as any, approveRes as any);
        expect(approveRes.statusCode).toBe(200);

        await sleep(60);

        const getDoneRes = createMockRes();
        await getTaskHandler({ method: 'GET', query: { taskId } } as any, getDoneRes as any);
        expect(getDoneRes.statusCode).toBe(200);
        expect(getDoneRes.payload?.status).toBe('DONE');
        expect(getDoneRes.payload?.execution_substrate?.worker_summary?.local_fallback_count).toBeGreaterThanOrEqual(1);
        expect(getDoneRes.payload?.execution_substrate?.worker_summary?.claim_history?.length).toBeGreaterThanOrEqual(2);
        expect(getDoneRes.payload?.execution_substrate?.worker_summary?.completed_claim_count).toBeGreaterThanOrEqual(2);
        expect(getDoneRes.payload?.execution_substrate?.worker_summary?.worker_identity?.service_principal?.principal_type).toBe('WORKER_SERVICE');
        expect(getDoneRes.payload?.execution_substrate?.worker_summary?.claim_history?.[0]?.service_auth_context?.auth_context_id).toBeTruthy();
        expect(getDoneRes.payload?.execution_ledger?.projection?.local_fallback_count).toBeGreaterThanOrEqual(1);
        expect(getDoneRes.payload?.execution_ledger?.projection?.completed_claim_count).toBeGreaterThanOrEqual(1);
        expect(getDoneRes.payload?.execution_ledger?.projection?.projection_version).toBeGreaterThanOrEqual(1);
        expect(getDoneRes.payload?.execution_ledger?.projection?.rebuild_count).toBe(0);
        expect(getDoneRes.payload?.execution_ledger?.projection?.allowed_service_auth_count).toBeGreaterThanOrEqual(4);
        expect(getDoneRes.payload?.execution_ledger?.projection?.denied_service_auth_count).toBe(0);
        expect(getDoneRes.payload?.execution_ledger?.compatibility?.state).toBe('CURRENT');
        expect(getDoneRes.payload?.execution_ledger?.retention?.delete_allowed).toBe(false);
        expect(getDoneRes.payload?.execution_ledger?.retention?.policy_name).toBe('PILOT_APPEND_ONLY_NO_DELETE');
        expect(getDoneRes.payload?.observability?.task_id).toBe(taskId);
        expect(getDoneRes.payload?.observability?.correlation?.correlation_id).toBe(createRes.payload?.correlation_id);
        expect(getDoneRes.payload?.observability?.tracing?.root_span_id).toBeTruthy();
        expect(getDoneRes.payload?.observability?.structured_logs?.length).toBeGreaterThan(0);
    });

    it('includes execution substrate summary for pending retries', async () => {
        getToolRegistry().register({
            name: 'api_retry_summary_tool',
            description: 'api retry summary tool',
            parameters: { type: 'object', properties: {} },
            execute: async () => {
                throw new Error('temporary network timeout');
            },
        });

        const createReq: MockReq = {
            method: 'POST',
            body: {
                graph: {
                    task_id: `kernel_retry_${Date.now()}`,
                    goal: 'retry summary',
                    nodes: [
                        { id: 'n1', type: 'tool', name: 'api_retry_summary_tool' },
                    ],
                    edges: [],
                    retry_policy: { max_retries: 1, backoff_ms: 5000, jitter: false },
                },
            },
        };
        const createRes = createMockRes();
        await createTaskHandler(createReq as any, createRes as any);
        const taskId = String(createRes.payload?.task_id || '');

        const runRes = createMockRes();
        await runTaskHandler({ method: 'POST', query: { taskId } } as any, runRes as any);
        expect(runRes.statusCode).toBe(200);
        expect(runRes.payload?.execution_substrate?.pending_retry_jobs).toHaveLength(1);
        expect(runRes.payload?.execution_ledger?.ledger?.record_count).toBeGreaterThan(0);
        expect(runRes.payload?.execution_ledger?.projection?.last_task_status).toBe('RUNNING');

        const getRes = createMockRes();
        await getTaskHandler({ method: 'GET', query: { taskId } } as any, getRes as any);
        expect(getRes.statusCode).toBe(200);
        expect(getRes.payload?.execution_substrate?.pending_retry_jobs[0]?.attempt).toBe(2);
        expect(getRes.payload?.execution_substrate?.dead_letter_count).toBe(0);
        expect(getRes.payload?.execution_substrate?.worker_summary?.local_fallback_count).toBe(1);
        expect(getRes.payload?.execution_substrate?.worker_summary?.last_release_reason).toBe('RETRY_SCHEDULED');
        expect(getRes.payload?.execution_substrate?.worker_summary?.completed_claim_count).toBe(1);
        expect(getRes.payload?.execution_ledger?.projection?.pending_retry_jobs).toBe(1);
        expect(getRes.payload?.execution_ledger?.projection?.local_fallback_count).toBe(1);
        expect(getRes.payload?.execution_ledger?.projection?.completed_claim_count).toBe(1);
        expect(getRes.payload?.execution_ledger?.compatibility?.state).toBe('CURRENT');
        expect(getRes.payload?.execution_ledger?.retention?.delete_allowed).toBe(false);
    });

    it('serves task and pilot observability summaries through the bounded API', async () => {
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
        });
        setTaskGraphRuntimeForTests(runtime);

        const createRes = createMockRes();
        await createTaskHandler({
            method: 'POST',
            body: {
                graph: {
                    task_id: `kernel_obs_${Date.now()}`,
                    goal: 'observability summary',
                    nodes: [{ id: 'n1', type: 'llm', name: 'llm.obs' }],
                    edges: [],
                    retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
                },
            },
        } as any, createRes as any);
        const taskId = String(createRes.payload?.task_id || '');

        const runRes = createMockRes();
        await runTaskHandler({ method: 'POST', query: { taskId } } as any, runRes as any);
        expect(runRes.statusCode).toBe(200);

        await sleep(40);

        const taskObsRes = createMockRes();
        await observabilitySummaryHandler({
            method: 'GET',
            query: { task_id: taskId },
        } as any, taskObsRes as any);
        expect(taskObsRes.statusCode).toBe(200);
        expect(taskObsRes.payload?.observability?.task_id).toBe(taskId);
        expect(taskObsRes.payload?.observability?.correlation?.correlation_id).toBe(createRes.payload?.correlation_id);

        const globalObsRes = createMockRes();
        await observabilitySummaryHandler({
            method: 'GET',
            query: {},
        } as any, globalObsRes as any);
        expect(globalObsRes.statusCode).toBe(200);
        expect(
            globalObsRes.payload?.summary?.task_summaries.some((summary: { task_id: string }) => summary.task_id === taskId)
        ).toBe(true);
        expect(globalObsRes.payload?.summary?.runbooks?.length).toBeGreaterThanOrEqual(2);
        expect(globalObsRes.payload?.summary?.on_call?.tier).toBe('PILOT_PRIMARY');
    });

    it('serves bounded deployment summaries and flags tenant-isolation drift', async () => {
        applyPilotDeploymentEnv();

        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);

        await store.upsertVaultCredential({
            credential_id: 'pilot_https_webhook_credential',
            connector_id: 'pilot_https_webhook',
            connector_type: 'HTTPS_WEBHOOK',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            backend: 'HASHICORP_VAULT',
            vault_path: 'secret/data/pilot/webhook',
            status: 'ACTIVE',
            compromise_status: 'CLEAR',
            lease_id: 'lease_pilot_1',
            renewable: true,
            lease_expires_at: Date.now() + 60_000,
            last_materialized_at: Date.now(),
            created_at: Date.now(),
            updated_at: Date.now(),
        });

        const createRes = createMockRes();
        await createTaskHandler({
            method: 'POST',
            body: {
                graph: {
                    task_id: `kernel_deploy_${Date.now()}`,
                    goal: 'deployment summary',
                    nodes: [{ id: 'n1', type: 'llm', name: 'llm.deploy' }],
                    edges: [],
                },
            },
        } as any, createRes as any);
        const taskId = String(createRes.payload?.task_id || '');

        const taskDeploymentRes = createMockRes();
        await deploymentSummaryHandler({
            method: 'GET',
            query: { task_id: taskId },
        } as any, taskDeploymentRes as any);

        expect(taskDeploymentRes.statusCode).toBe(200);
        expect(taskDeploymentRes.payload?.deployment?.deployment_model).toBe('VENDOR_MANAGED_SINGLE_TENANT_CLOUD');
        expect(taskDeploymentRes.payload?.deployment?.deployment_stage).toBe('PILOT');
        expect(taskDeploymentRes.payload?.deployment?.backing_environment).toBe('PRODUCTION');
        expect(taskDeploymentRes.payload?.deployment?.tenant_isolation?.status).toBe('ISOLATED');
        expect(taskDeploymentRes.payload?.deployment?.region?.primary_region).toBe('eu-west-2');
        expect(taskDeploymentRes.payload?.deployment?.secret_separation?.status).toBe('SCOPED');
        expect(taskDeploymentRes.payload?.deployment?.environment_boundaries).toHaveLength(4);

        const pilotDeploymentRes = createMockRes();
        await deploymentSummaryHandler({
            method: 'GET',
            query: {},
        } as any, pilotDeploymentRes as any);

        expect(pilotDeploymentRes.statusCode).toBe(200);
        expect(pilotDeploymentRes.payload?.summary?.status).toBe('READY');
        expect(pilotDeploymentRes.payload?.summary?.task_count).toBeGreaterThanOrEqual(1);
        expect(pilotDeploymentRes.payload?.summary?.deferred_items).toContain(
            'multi-region active-active runtime and automated region failover'
        );

        await store.upsertEnterprisePrincipal({
            principal_id: 'principal_other_tenant',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_other',
            external_subject: '00u_other_tenant',
            email: 'other@example.com',
            display_name: 'Other Tenant',
            groups: ['agent-os-tenant-admins'],
            status: 'ACTIVE',
            created_at: Date.now(),
            updated_at: Date.now(),
        });

        const degradedDeploymentRes = createMockRes();
        await deploymentSummaryHandler({
            method: 'GET',
            query: {},
        } as any, degradedDeploymentRes as any);

        expect(degradedDeploymentRes.statusCode).toBe(200);
        expect(degradedDeploymentRes.payload?.summary?.status).toBe('DEGRADED');
        expect(degradedDeploymentRes.payload?.summary?.tenant_isolation?.issues).toContain(
            'active_records_escape_configured_tenant_boundary'
        );
        expect(degradedDeploymentRes.payload?.summary?.warnings).toContain('multiple_active_tenants_observed');
    });

    it('serves environment activation truth, requester inbox, policy studio summary, and product shell demo labeling', async () => {
        applyPilotDeploymentEnv({
            AGENT_KERNEL_PILOT_TENANT_ID: undefined,
            AGENT_KERNEL_OKTA_ISSUER: undefined,
            AGENT_KERNEL_OKTA_CLIENT_ID: undefined,
            AGENT_KERNEL_OKTA_CLIENT_SECRET: undefined,
            AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID: undefined,
            AGENT_KERNEL_VAULT_ADDR: undefined,
            AGENT_KERNEL_VAULT_TOKEN: undefined,
            AGENT_KERNEL_VAULT_WEBHOOK_READ_PATH: undefined,
            AGENT_KERNEL_VAULT_WEBHOOK_ROTATE_PATH: undefined,
            AGENT_KERNEL_WEBHOOK_ENDPOINT_URL: undefined,
            AGENT_KERNEL_WEBHOOK_CONNECTOR_ID: undefined,
            AGENT_KERNEL_VAULT_WEBHOOK_CREDENTIAL_ID: undefined,
        });
        process.env.LUMI_BASE_URL = 'https://lumi-agent-simulator.vercel.app';
        delete process.env.LUMI_TENANT_ID;
        delete process.env.LUMI_WORKSPACE_ID;
        delete process.env.LUMI_REQUESTER_ACTOR_ID;
        delete process.env.LUMI_OPERATOR_ACTOR_ID;
        delete process.env.LUMI_TENANT_ADMIN_ACTOR_ID;

        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);

        const createRes = createMockRes();
        await createTaskHandler({
            method: 'POST',
            body: {
                graph: {
                    task_id: `kernel_product_shell_${Date.now()}`,
                    goal: 'enterprise productization inbox',
                    nodes: [
                        { id: 'n1', type: 'approval', name: 'approval.node' },
                    ],
                    edges: [],
                },
            },
        } as any, createRes as any);
        const taskId = String(createRes.payload?.task_id || '');

        const envRes = createMockRes();
        await environmentSummaryHandler({
            method: 'GET',
            query: {},
        } as any, envRes as any);
        expect(envRes.statusCode).toBe(200);
        expect(envRes.payload?.summary?.environment_kind).toBe('SIMULATOR');
        expect(envRes.payload?.summary?.pilot_activation_status).toBe('PILOT_BLOCKED');
        expect(envRes.payload?.summary?.missing_dependency_codes).toContain('pilot_environment_binding_missing');
        expect(envRes.payload?.summary?.missing_dependency_summaries).toContain('Missing operator access');

        const inboxRes = createMockRes();
        await createTaskHandler({
            method: 'GET',
            query: {},
        } as any, inboxRes as any);
        expect(inboxRes.statusCode).toBe(200);
        expect(inboxRes.payload?.items.some((item: { task_id: string; group: string }) => item.task_id === taskId)).toBe(true);
        expect(inboxRes.payload?.items.some((item: { group: string }) => item.group === 'IN_PROGRESS')).toBe(true);

        const demoInboxRes = createMockRes();
        await createTaskHandler({
            method: 'GET',
            query: { workspace_mode: 'demo' },
        } as any, demoInboxRes as any);
        expect(demoInboxRes.statusCode).toBe(200);
        expect(demoInboxRes.payload?.items).toHaveLength(3);
        expect(demoInboxRes.payload?.items.every((item: { is_demo_data: boolean; is_pilot_evidence: boolean }) => item.is_demo_data && !item.is_pilot_evidence)).toBe(true);

        const policyRes = createMockRes();
        await policyStudioSummaryHandler({
            method: 'GET',
            query: {},
        } as any, policyRes as any);
        expect(policyRes.statusCode).toBe(200);
        expect(policyRes.payload?.summary?.pack_name).toBe('Agent OS Policy Pack');
        expect(policyRes.payload?.summary?.detail_lines).toContain('Overrides: v1 read-only summary only');

        const shellRes = createMockRes();
        await productShellSummaryHandler({
            method: 'GET',
            query: { workspace_mode: 'demo' },
        } as any, shellRes as any);
        expect(shellRes.statusCode).toBe(200);
        expect(shellRes.payload?.summary?.environment_activation?.workspace_mode).toBe('demo');
        expect(shellRes.payload?.summary?.tenant_admin_setup?.status).toBe('DEMO_ONLY');
        expect(shellRes.payload?.summary?.requester_inbox?.items.every((item: { is_demo_data: boolean; is_pilot_evidence: boolean }) => item.is_demo_data && !item.is_pilot_evidence)).toBe(true);
    });

    it('serves local role lab truth and actor-segmented inbox without promoting lab artifacts as pilot evidence', async () => {
        applyPilotDeploymentEnv({
            AGENT_KERNEL_PILOT_TENANT_ID: undefined,
            AGENT_KERNEL_OKTA_ISSUER: undefined,
            AGENT_KERNEL_OKTA_CLIENT_ID: undefined,
            AGENT_KERNEL_OKTA_CLIENT_SECRET: undefined,
            AGENT_KERNEL_OKTA_DEFAULT_WORKSPACE_ID: undefined,
            AGENT_KERNEL_VAULT_ADDR: undefined,
            AGENT_KERNEL_VAULT_TOKEN: undefined,
            AGENT_KERNEL_VAULT_WEBHOOK_READ_PATH: undefined,
            AGENT_KERNEL_VAULT_WEBHOOK_ROTATE_PATH: undefined,
            AGENT_KERNEL_WEBHOOK_ENDPOINT_URL: undefined,
            AGENT_KERNEL_WEBHOOK_CONNECTOR_ID: undefined,
            AGENT_KERNEL_VAULT_WEBHOOK_CREDENTIAL_ID: undefined,
        });
        process.env.LUMI_BASE_URL = 'https://lumi-agent-simulator.vercel.app';
        delete process.env.LUMI_TENANT_ID;
        delete process.env.LUMI_WORKSPACE_ID;

        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);

        const envRes = createMockRes();
        await environmentSummaryHandler({
            method: 'GET',
            query: {
                workspace_mode: 'local_lab',
                lab_actor_id: 'local_operator_01',
            },
        } as any, envRes as any);
        expect(envRes.statusCode).toBe(200);
        expect(envRes.payload?.summary?.workspace_mode).toBe('local_lab');
        expect(envRes.payload?.summary?.workspace_binding_kind).toBe('LOCAL_ROLE_LAB_WORKSPACE');
        expect(envRes.payload?.summary?.pilot_activation_status).toBe('NOT_APPLICABLE');
        expect(envRes.payload?.summary?.activation_ready).toBe(false);

        const inboxRes = createMockRes();
        await createTaskHandler({
            method: 'GET',
            query: {
                workspace_mode: 'local_lab',
                lab_actor_id: 'local_operator_01',
            },
        } as any, inboxRes as any);
        expect(inboxRes.statusCode).toBe(200);
        expect(inboxRes.payload?.items.length).toBeGreaterThan(0);
        expect(inboxRes.payload?.items.every((item: { workspace_binding_kind: string; is_pilot_evidence: boolean; actor_label?: string }) =>
            item.workspace_binding_kind === 'LOCAL_ROLE_LAB_WORKSPACE'
            && item.is_pilot_evidence === false
            && item.actor_label === 'Local Operator'
        )).toBe(true);

        const shellRes = createMockRes();
        await productShellSummaryHandler({
            method: 'GET',
            query: {
                workspace_mode: 'local_lab',
                lab_actor_id: 'local_tenant_admin_01',
            },
        } as any, shellRes as any);
        expect(shellRes.statusCode).toBe(200);
        expect(shellRes.payload?.summary?.local_role_lab?.enabled).toBe(true);
        expect(shellRes.payload?.summary?.local_role_lab?.active_actor_id).toBe('local_tenant_admin_01');
        expect(shellRes.payload?.summary?.local_role_lab?.active_role).toBe('TENANT_ADMIN');
        expect(shellRes.payload?.summary?.local_role_lab?.is_pilot_evidence).toBe(false);
        expect(shellRes.payload?.summary?.tenant_admin_setup?.summary).toContain('Local role lab');
        expect(shellRes.payload?.summary?.next_action).toContain('Switch to');
    });

    it('registers pilot actor readiness and evidence artifacts while blocking demo/test artifacts from counting as real pilot evidence', async () => {
        applyPilotDeploymentEnv();
        process.env.LUMI_BASE_URL = 'https://pilot.example.com';
        process.env.LUMI_TENANT_ID = 'tenant_pilot';
        process.env.LUMI_WORKSPACE_ID = 'workspace_alpha';
        process.env.LUMI_ENVIRONMENT_KIND = 'PILOT';

        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);
        const { sessionId } = await seedEnterpriseSessionForActivation(store);

        const bindingRes = createMockRes();
        await activationEnvironmentBindingHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                environment_kind: 'PILOT',
                environment_label: 'Pilot workspace',
                base_url: 'https://pilot.example.com',
                tenant_id: 'tenant_pilot',
                workspace_id: 'workspace_alpha',
                source: 'REAL_PILOT',
            },
        } as any, bindingRes as any);
        expect(bindingRes.statusCode).toBe(200);
        expect(bindingRes.payload?.record?.state).toBe('BOUND');

        const actorRes = createMockRes();
        await activationActorReadinessHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                role: 'OPERATOR',
                actor_id: 'pilot_operator_1',
                actor_label: 'Pilot Operator',
                source: 'REAL_PILOT',
                provisioningState: 'PROVISIONED',
                accessState: 'GRANTED',
                note: 'Real operator access granted.',
            },
        } as any, actorRes as any);
        expect(actorRes.statusCode).toBe(200);
        expect(actorRes.payload?.record?.state).toBe('READY');

        for (const role of ['REQUESTER', 'TENANT_ADMIN'] as const) {
            const res = createMockRes();
            await activationActorReadinessHandler({
                method: 'POST',
                headers: { authorization: `Bearer ${sessionId}` },
                query: {},
                body: {
                    role,
                    actor_id: `${role.toLowerCase()}_real_1`,
                    actor_label: `${role.toLowerCase()} real`,
                    source: 'REAL_PILOT',
                    provisioningState: 'PROVISIONED',
                    accessState: 'GRANTED',
                },
            } as any, res as any);
            expect(res.statusCode).toBe(200);
            expect(res.payload?.record?.state).toBe('READY');
        }

        const connectorRes = createMockRes();
        await activationConnectorEligibilityHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                connector_id: 'pilot_https_webhook',
                source: 'REAL_PILOT',
                summary: 'Pilot connector activation approved.',
            },
        } as any, connectorRes as any);
        expect(connectorRes.statusCode).toBe(200);
        expect(connectorRes.payload?.record?.state).toBe('ELIGIBLE');

        const testEvidenceRes = createMockRes();
        await activationEvidenceHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                category: 'TENANT_ADMIN_SUPPORT_PROOF',
                source: 'TEST',
                summary: 'Synthetic support artifact',
            },
        } as any, testEvidenceRes as any);
        expect(testEvidenceRes.statusCode).toBe(200);
        expect(testEvidenceRes.payload?.record?.accepted_as_real_pilot_evidence).toBe(false);

        const realEvidenceRes = createMockRes();
        await activationEvidenceHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                category: 'DEVICE_SESSION_PROOF',
                source: 'REAL_PILOT',
                summary: 'Real device session artifact',
                uri: 'https://pilot.example.com/artifacts/device-session',
                actor_role: 'OPERATOR',
            },
        } as any, realEvidenceRes as any);
        expect(realEvidenceRes.statusCode).toBe(200);
        expect(realEvidenceRes.payload?.record?.accepted_as_real_pilot_evidence).toBe(true);

        const shellRes = createMockRes();
        await productShellSummaryHandler({
            method: 'GET',
            query: {},
        } as any, shellRes as any);
        expect(shellRes.statusCode).toBe(200);
        expect(shellRes.payload?.summary?.activation_checklist.length).toBeGreaterThan(0);
        expect(shellRes.payload?.summary?.environment_activation?.environment_binding?.state).toBe('BOUND');
        expect(shellRes.payload?.summary?.environment_activation?.connector_activation?.state).toBe('ELIGIBLE');
        expect(shellRes.payload?.summary?.environment_activation?.activation_ready).toBe(true);
        expect(shellRes.payload?.summary?.evidence_categories.some((item: { category: string; real_evidence_count: number }) =>
            item.category === 'DEVICE_SESSION_PROOF' && item.real_evidence_count === 1
        )).toBe(true);
        expect(shellRes.payload?.summary?.evidence_categories.some((item: { category: string; state: string }) =>
            item.category === 'TENANT_ADMIN_SUPPORT_PROOF' && item.state === 'BLOCKED'
        )).toBe(true);
        expect(shellRes.payload?.summary?.next_action).toBeTruthy();
    });

    it('tracks external activation package handoff and promotes verified real artifacts into activation truth', async () => {
        applyPilotDeploymentEnv();
        process.env.LUMI_BASE_URL = 'https://pilot.example.com';
        process.env.LUMI_TENANT_ID = 'tenant_pilot';
        process.env.LUMI_WORKSPACE_ID = 'workspace_alpha';
        process.env.LUMI_ENVIRONMENT_KIND = 'PILOT';

        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);
        const { sessionId } = await seedEnterpriseSessionForActivation(store);

        const handoffRes = createMockRes();
        await activationPackageHandoffHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                owner_type: 'OPERATOR_OWNER',
                owner_label: 'Pilot operator lead',
                summary: 'External pilot activation package is in progress.',
                handoff_note: 'Waiting on verified environment and operator artifacts.',
            },
        } as any, handoffRes as any);
        expect(handoffRes.statusCode).toBe(200);
        expect(handoffRes.payload?.record?.owner_type).toBe('OPERATOR_OWNER');

        const envIntakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'ENVIRONMENT_BINDING',
                source: 'REAL_PILOT',
                summary: 'Signed pilot environment handoff package',
                environment_kind: 'PILOT',
                environment_label: 'Pilot workspace',
                base_url: 'https://pilot.example.com',
                tenant_id: 'tenant_pilot',
                workspace_id: 'workspace_alpha',
            },
        } as any, envIntakeRes as any);
        expect(envIntakeRes.statusCode).toBe(200);

        const operatorIntakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'ACTOR_READINESS',
                source: 'REAL_PILOT',
                summary: 'Operator access package approved',
                actor_role: 'OPERATOR',
                actor_id: 'pilot_operator_1',
                actor_label: 'Pilot Operator',
                provisioning_state: 'PROVISIONED',
                access_state: 'GRANTED',
            },
        } as any, operatorIntakeRes as any);
        expect(operatorIntakeRes.statusCode).toBe(200);

        const tenantAdminIntakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'ACTOR_READINESS',
                source: 'REAL_PILOT',
                summary: 'Tenant-admin touchpoint established',
                actor_role: 'TENANT_ADMIN',
                actor_id: 'tenant_admin_1',
                actor_label: 'Tenant Admin',
                provisioning_state: 'PROVISIONED',
                access_state: 'GRANTED',
            },
        } as any, tenantAdminIntakeRes as any);
        expect(tenantAdminIntakeRes.statusCode).toBe(200);

        const requesterIntakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'ACTOR_READINESS',
                source: 'REAL_PILOT',
                summary: 'Requester actor provisioned',
                actor_role: 'REQUESTER',
                actor_id: 'requester_1',
                actor_label: 'Requester One',
                provisioning_state: 'PROVISIONED',
                access_state: 'GRANTED',
            },
        } as any, requesterIntakeRes as any);
        expect(requesterIntakeRes.statusCode).toBe(200);

        const connectorIntakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'CONNECTOR_ELIGIBILITY',
                source: 'REAL_PILOT',
                summary: 'Connector activation eligibility approved',
                connector_id: 'pilot_https_webhook',
            },
        } as any, connectorIntakeRes as any);
        expect(connectorIntakeRes.statusCode).toBe(200);

        const evidenceIntakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'REAL_EVIDENCE',
                source: 'REAL_PILOT',
                summary: 'Real workflow artifact from pilot run',
                evidence_category: 'WORKFLOW_ARTIFACT_PROOF',
                uri: 'https://pilot.example.com/artifacts/workflow',
            },
        } as any, evidenceIntakeRes as any);
        expect(evidenceIntakeRes.statusCode).toBe(200);

        for (const intakeId of [
            envIntakeRes.payload?.record?.intake_id,
            operatorIntakeRes.payload?.record?.intake_id,
            tenantAdminIntakeRes.payload?.record?.intake_id,
            requesterIntakeRes.payload?.record?.intake_id,
            connectorIntakeRes.payload?.record?.intake_id,
            evidenceIntakeRes.payload?.record?.intake_id,
        ]) {
            const reviewRes = createMockRes();
            await activationArtifactReviewHandler({
                method: 'POST',
                headers: { authorization: `Bearer ${sessionId}` },
                query: {},
                body: {
                    intake_id: intakeId,
                    decision: 'PROMOTE',
                    reviewed_by: 'pilot_operator_lead',
                    verification_note: 'Verified external pilot artifact',
                },
            } as any, reviewRes as any);
            expect(reviewRes.statusCode).toBe(200);
            expect(reviewRes.payload?.record?.verification_status).toBe('PROMOTED');
        }

        const shellRes = createMockRes();
        await productShellSummaryHandler({
            method: 'GET',
            query: {},
        } as any, shellRes as any);
        expect(shellRes.statusCode).toBe(200);
        expect(shellRes.payload?.summary?.activation_package?.owner_label).toBe('Pilot operator lead');
        expect(shellRes.payload?.summary?.activation_package?.recent_intakes.some((intake: { verification_status: string }) =>
            intake.verification_status === 'PROMOTED'
        )).toBe(true);
        expect(shellRes.payload?.summary?.environment_activation?.environment_binding?.state).toBe('BOUND');
        expect(shellRes.payload?.summary?.environment_activation?.connector_activation?.state).toBe('ELIGIBLE');
        expect(shellRes.payload?.summary?.activation_checklist.some((item: { code: string; requirement_status: string }) =>
            item.code === 'pilot_environment_binding' && item.requirement_status === 'PROMOTED'
        )).toBe(true);
        expect(shellRes.payload?.summary?.evidence_categories.some((item: { category: string; real_evidence_count: number }) =>
            item.category === 'WORKFLOW_ARTIFACT_PROOF' && item.real_evidence_count === 1
        )).toBe(true);
        expect(shellRes.payload?.summary?.environment_activation?.activation_ready).toBe(true);
    });

    it('includes dead-letter summary after retries are exhausted', async () => {
        getToolRegistry().register({
            name: 'api_dead_letter_tool',
            description: 'api dead letter tool',
            parameters: { type: 'object', properties: {} },
            execute: async () => {
                throw new Error('temporary network timeout');
            },
        });

        const createReq: MockReq = {
            method: 'POST',
            body: {
                graph: {
                    task_id: `kernel_dead_letter_${Date.now()}`,
                    goal: 'dead letter summary',
                    nodes: [
                        { id: 'n1', type: 'tool', name: 'api_dead_letter_tool' },
                    ],
                    edges: [],
                    retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
                },
            },
        };
        const createRes = createMockRes();
        await createTaskHandler(createReq as any, createRes as any);
        const taskId = String(createRes.payload?.task_id || '');

        const runRes = createMockRes();
        await runTaskHandler({ method: 'POST', query: { taskId } } as any, runRes as any);
        expect(runRes.statusCode).toBe(200);

        await sleep(80);

        const getRes = createMockRes();
        await getTaskHandler({ method: 'GET', query: { taskId } } as any, getRes as any);
        expect(getRes.statusCode).toBe(200);
        expect(getRes.payload?.status).toBe('FAILED');
        expect(getRes.payload?.execution_substrate?.dead_letter_count).toBe(1);
        expect(getRes.payload?.execution_substrate?.pending_retry_jobs).toHaveLength(0);
        expect(getRes.payload?.execution_substrate?.worker_summary?.local_fallback_count).toBeGreaterThanOrEqual(1);
        expect(getRes.payload?.execution_substrate?.worker_summary?.last_release_reason).toBe('DEAD_LETTERED');
        expect(getRes.payload?.execution_ledger?.projection?.dead_letter_count).toBe(1);
        expect(getRes.payload?.execution_ledger?.projection?.last_task_status).toBe('FAILED');
        expect(getRes.payload?.execution_ledger?.projection?.last_release_reason).toBe('DEAD_LETTERED');
        expect(getRes.payload?.execution_ledger?.compatibility?.state).toBe('CURRENT');
        expect(getRes.payload?.execution_ledger?.retention?.delete_allowed).toBe(false);
    });

    it('supports pilot oidc login, admin role mapping, directory shrink, and deprovision', async () => {
        const store = createTaskStore({ driver: 'memory' });
        const identityService = new EnterpriseIdentityAdminService({
            store,
            config: createPilotIdentityConfig(),
            oidcCodeExchangePort: {
                async exchangeAuthorizationCode() {
                    return {
                        provider: 'OKTA_OIDC',
                        tenant_id: 'tenant_pilot',
                        issuer: 'https://example.okta.com/oauth2/default',
                        subject: '00u_test_admin',
                        audience: 'client_test',
                        email: 'pilot-admin@example.com',
                        display_name: 'Pilot Admin',
                        groups: ['agent-os-tenant-admins', 'agent-os-workspace-admins'],
                        idp_session_id: 'sid_test_admin',
                        issued_at: 1000,
                        expires_at: 60_000,
                        claims: {
                            sub: '00u_test_admin',
                            email: 'pilot-admin@example.com',
                            groups: ['agent-os-tenant-admins', 'agent-os-workspace-admins'],
                        },
                    };
                },
            },
            now: (() => {
                let current = 1000;
                return () => {
                    current += 10;
                    return current;
                };
            })(),
        });
        setEnterpriseIdentityAdminServiceForTests(identityService);

        const authorizeRes = createMockRes();
        await authorizeOidcHandler({
            method: 'POST',
            body: {
                redirect_uri: 'https://app.example.com/callback',
                workspace_id: 'workspace_alpha',
            },
        } as any, authorizeRes as any);

        expect(authorizeRes.statusCode).toBe(200);
        expect(authorizeRes.payload?.authorize_url).toContain('https://example.okta.com/oauth2/default/v1/authorize');
        expect(authorizeRes.payload?.state).toBeTruthy();

        const exchangeRes = createMockRes();
        await exchangeOidcHandler({
            method: 'POST',
            body: {
                state: authorizeRes.payload?.state,
                code: 'code_test_1',
                redirect_uri: 'https://app.example.com/callback',
            },
        } as any, exchangeRes as any);

        expect(exchangeRes.statusCode).toBe(200);
        expect(exchangeRes.payload?.session?.roles).toContain('TENANT_ADMIN');
        expect(exchangeRes.payload?.session?.roles).toContain('WORKSPACE_ADMIN');
        expect(exchangeRes.payload?.active_bindings).toHaveLength(3);

        const sessionId = String(exchangeRes.payload?.session?.session_id || '');
        const principalId = String(exchangeRes.payload?.principal?.principal_id || '');
        expect(sessionId).toBeTruthy();
        expect(principalId).toBeTruthy();

        const shrinkRes = createMockRes();
        await directorySyncHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                workspace_id: 'workspace_alpha',
                updates: [
                    {
                        external_subject: '00u_test_admin',
                        email: 'pilot-admin@example.com',
                        display_name: 'Pilot Admin',
                        groups: ['agent-os-workspace-admins'],
                        status: 'ACTIVE',
                    },
                ],
            },
        } as any, shrinkRes as any);

        expect(shrinkRes.statusCode).toBe(200);
        expect(shrinkRes.payload?.bindings_deactivated).toBeGreaterThanOrEqual(1);

        const bindingsAfterShrink = await store.listEnterpriseAccessBindings(principalId);
        const tenantAdminBinding = bindingsAfterShrink.find((binding) => binding.roles.includes('TENANT_ADMIN'));
        expect(tenantAdminBinding?.status).toBe('INACTIVE');
        expect(bindingsAfterShrink.some((binding) => binding.status === 'ACTIVE' && binding.roles.includes('WORKSPACE_ADMIN'))).toBe(true);

        const deprovisionRes = createMockRes();
        await directorySyncHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                workspace_id: 'workspace_alpha',
                updates: [
                    {
                        external_subject: '00u_test_admin',
                        email: 'pilot-admin@example.com',
                        status: 'DEPROVISIONED',
                    },
                ],
            },
        } as any, deprovisionRes as any);

        expect(deprovisionRes.statusCode).toBe(200);
        expect(deprovisionRes.payload?.deprovisioned_count).toBe(1);
        expect(deprovisionRes.payload?.sessions_revoked).toBe(1);

        const principalAfterDeprovision = await store.getEnterprisePrincipal(principalId);
        const sessionAfterDeprovision = await store.getEnterpriseIdentitySession(sessionId);
        expect(principalAfterDeprovision?.status).toBe('DEPROVISIONED');
        expect(sessionAfterDeprovision?.status).toBe('REVOKED');

        const deniedRes = createMockRes();
        await directorySyncHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                workspace_id: 'workspace_alpha',
                updates: [
                    {
                        external_subject: '00u_test_admin',
                        email: 'pilot-admin@example.com',
                        status: 'ACTIVE',
                    },
                ],
            },
        } as any, deniedRes as any);
        expect(deniedRes.statusCode).toBe(400);
        expect(deniedRes.payload?.error).toBe('enterprise_session_not_active');
    });

    it('exposes enterprise account, members, and OA role assignment flows', async () => {
        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);

        const identityService = new EnterpriseIdentityAdminService({
            store,
            config: createPilotIdentityConfig(),
        });
        setEnterpriseIdentityAdminServiceForTests(identityService);
        setEnterpriseAccountServiceForTests(new EnterpriseAccountService(store));

        const nowMs = Date.now();
        await store.upsertEnterprisePrincipal({
            principal_id: 'principal_admin',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_admin',
            email: 'admin@example.com',
            display_name: 'Admin User',
            groups: ['agent-os-workspace-admins'],
            status: 'ACTIVE',
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterprisePrincipal({
            principal_id: 'principal_member',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_member',
            email: 'member@example.com',
            display_name: 'Member User',
            groups: [],
            status: 'ACTIVE',
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterpriseAccessBinding({
            binding_id: 'binding_admin_workspace',
            principal_id: 'principal_admin',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            source: 'OIDC_LOGIN',
            status: 'ACTIVE',
            provisioned_at: nowMs,
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterpriseIdentitySession({
            session_id: 'entsess_admin',
            principal_id: 'principal_admin',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_admin',
                audience: 'client_test',
                email: 'admin@example.com',
                display_name: 'Admin User',
                groups: ['agent-os-workspace-admins'],
            },
            issued_at: nowMs,
            expires_at: nowMs + 60_000,
            last_seen_at: nowMs,
            created_at: nowMs,
            updated_at: nowMs,
        });

        const accountRes = createMockRes();
        await enterpriseAccountHandler({
            method: 'GET',
            headers: { authorization: 'Bearer entsess_admin' },
        } as any, accountRes as any);
        expect(accountRes.statusCode).toBe(200);
        expect(accountRes.payload?.summary?.signed_in).toBe(true);
        expect(accountRes.payload?.summary?.role_badges).toContain('WORKSPACE_ADMIN');

        const assignRes = createMockRes();
        await enterpriseAssignRoleHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            body: {
                principal_id: 'principal_member',
                role: 'APPROVER',
                workspace_id: 'workspace_alpha',
            },
        } as any, assignRes as any);
        expect(assignRes.statusCode).toBe(200);
        expect(assignRes.payload?.assignment?.role).toBe('APPROVER');

        const inviteRes = createMockRes();
        await enterpriseInviteHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            body: {
                email: 'reviewer@example.com',
                role: 'REVIEWER',
                workspace_id: 'workspace_alpha',
            },
        } as any, inviteRes as any);
        expect(inviteRes.statusCode).toBe(200);
        expect(inviteRes.payload?.invite?.role).toBe('REVIEWER');

        const membersRes = createMockRes();
        await enterpriseMembersHandler({
            method: 'GET',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_id: 'workspace_alpha' },
        } as any, membersRes as any);
        expect(membersRes.statusCode).toBe(200);
        expect(membersRes.payload?.summary?.members.some((member: { principal_id: string; role_assignments: Array<{ role: string }> }) =>
            member.principal_id === 'principal_member'
            && member.role_assignments.some((assignment) => assignment.role === 'APPROVER')
        )).toBe(true);
        expect(membersRes.payload?.summary?.invite_count).toBeGreaterThanOrEqual(1);

        const removeRes = createMockRes();
        await enterpriseRemoveRoleHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            body: {
                principal_id: 'principal_member',
                role: 'APPROVER',
                workspace_id: 'workspace_alpha',
            },
        } as any, removeRes as any);
        expect(removeRes.statusCode).toBe(200);

        const deactivateRes = createMockRes();
        await enterpriseDeactivateHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            body: {
                principal_id: 'principal_member',
            },
        } as any, deactivateRes as any);
        expect(deactivateRes.statusCode).toBe(200);

        const shellRes = createMockRes();
        await productShellSummaryHandler({
            method: 'GET',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_mode: 'current' },
        } as any, shellRes as any);
        expect(shellRes.statusCode).toBe(200);
        expect(shellRes.payload?.summary?.enterprise_account?.signed_in).toBe(true);
        expect(shellRes.payload?.summary?.enterprise_membership?.members.length).toBeGreaterThanOrEqual(2);
    });

    it('accepts enterprise invites, reactivates suspended members, and revokes open invites', async () => {
        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);
        setEnterpriseIdentityAdminServiceForTests(new EnterpriseIdentityAdminService({
            store,
            config: createPilotIdentityConfig(),
        }));
        setEnterpriseAccountServiceForTests(new EnterpriseAccountService(store));

        const nowMs = Date.now();
        await store.upsertEnterprisePrincipal({
            principal_id: 'principal_admin',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_admin',
            email: 'admin@example.com',
            display_name: 'Admin User',
            groups: ['agent-os-workspace-admins'],
            status: 'ACTIVE',
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterprisePrincipal({
            principal_id: 'principal_member',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_member',
            email: 'member@example.com',
            display_name: 'Member User',
            groups: [],
            status: 'ACTIVE',
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterpriseAccessBinding({
            binding_id: 'binding_admin_workspace',
            principal_id: 'principal_admin',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            source: 'OIDC_LOGIN',
            status: 'ACTIVE',
            provisioned_at: nowMs,
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterpriseIdentitySession({
            session_id: 'entsess_admin',
            principal_id: 'principal_admin',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_admin',
                audience: 'client_test',
                email: 'admin@example.com',
                display_name: 'Admin User',
                groups: ['agent-os-workspace-admins'],
            },
            issued_at: nowMs,
            expires_at: nowMs + 60_000,
            last_seen_at: nowMs,
            created_at: nowMs,
            updated_at: nowMs,
        });
        await store.upsertEnterpriseIdentitySession({
            session_id: 'entsess_member',
            principal_id: 'principal_member',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: [],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_member',
                audience: 'client_test',
                email: 'member@example.com',
                display_name: 'Member User',
                groups: [],
            },
            issued_at: nowMs,
            expires_at: nowMs + 60_000,
            last_seen_at: nowMs,
            created_at: nowMs,
            updated_at: nowMs,
        });

        const inviteRes = createMockRes();
        await enterpriseInviteHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_mode: 'current' },
            body: {
                email: 'member@example.com',
                role: 'REVIEWER',
                workspace_id: 'workspace_alpha',
            },
        } as any, inviteRes as any);
        expect(inviteRes.statusCode).toBe(200);

        const listInvitesRes = createMockRes();
        await enterpriseInvitesHandler({
            method: 'GET',
            headers: { authorization: 'Bearer entsess_member' },
            query: { workspace_mode: 'current' },
        } as any, listInvitesRes as any);
        expect(listInvitesRes.statusCode).toBe(200);
        expect(listInvitesRes.payload?.invites).toHaveLength(1);

        const acceptRes = createMockRes();
        await enterpriseInviteAcceptHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_member' },
            query: { workspace_mode: 'current' },
            body: {
                invite_token: inviteRes.payload?.invite?.invite_token,
            },
        } as any, acceptRes as any);
        expect(acceptRes.statusCode).toBe(200);
        expect(acceptRes.payload?.result?.invite?.status).toBe('ACCEPTED');
        expect((await store.listEnterpriseAccessBindings('principal_member')).some((binding) => binding.roles.includes('REVIEWER') && binding.status === 'ACTIVE')).toBe(true);

        const deactivateRes = createMockRes();
        await enterpriseDeactivateHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_mode: 'current' },
            body: {
                principal_id: 'principal_member',
            },
        } as any, deactivateRes as any);
        expect(deactivateRes.statusCode).toBe(200);

        const reactivateRes = createMockRes();
        await enterpriseReactivateHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_mode: 'current' },
            body: {
                principal_id: 'principal_member',
            },
        } as any, reactivateRes as any);
        expect(reactivateRes.statusCode).toBe(200);
        expect((await store.getEnterprisePrincipal('principal_member'))?.status).toBe('ACTIVE');

        const revokeInviteSeed = createMockRes();
        await enterpriseInviteHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_mode: 'current' },
            body: {
                email: 'other@example.com',
                role: 'REQUESTER',
                workspace_id: 'workspace_alpha',
            },
        } as any, revokeInviteSeed as any);

        const revokeRes = createMockRes();
        await enterpriseInviteRevokeHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_admin' },
            query: { workspace_mode: 'current' },
            body: {
                invite_id: revokeInviteSeed.payload?.invite?.invite_id,
            },
        } as any, revokeRes as any);
        expect(revokeRes.statusCode).toBe(200);
        expect(revokeRes.payload?.invite?.status).toBe('REVOKED');
    });

    it('surfaces review and approval centers over real artifact review state', async () => {
        applyPilotDeploymentEnv();
        process.env.LUMI_BASE_URL = 'https://pilot.example.com';
        process.env.LUMI_TENANT_ID = 'tenant_pilot';
        process.env.LUMI_WORKSPACE_ID = 'workspace_alpha';
        process.env.LUMI_ENVIRONMENT_KIND = 'PILOT';

        const store = createTaskStore({ driver: 'memory' });
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            store,
        });
        setTaskGraphRuntimeForTests(runtime);
        const { sessionId } = await seedEnterpriseSessionForActivation(store, 'entsess_center_admin');

        const intakeRes = createMockRes();
        await activationArtifactIntakeHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: {},
            body: {
                artifact_kind: 'ENVIRONMENT_BINDING',
                source: 'REAL_PILOT',
                summary: 'Pilot environment handoff package',
                environment_kind: 'PILOT',
                environment_label: 'Pilot workspace',
                base_url: 'https://pilot.example.com',
                tenant_id: 'tenant_pilot',
                workspace_id: 'workspace_alpha',
            },
        } as any, intakeRes as any);
        expect(intakeRes.statusCode).toBe(200);

        const reviewCenterRes = createMockRes();
        await enterpriseCentersHandler({
            method: 'GET',
            headers: { authorization: `Bearer ${sessionId}` },
            query: { workspace_mode: 'current', center: 'REVIEW' },
        } as any, reviewCenterRes as any);
        expect(reviewCenterRes.statusCode).toBe(200);
        expect(reviewCenterRes.payload?.summary?.items[0]?.item_id).toBe(`pilot_review:${intakeRes.payload?.record?.intake_id}`);

        const verifyRes = createMockRes();
        await enterpriseCenterDecisionHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: { workspace_mode: 'current', itemId: `pilot_review:${intakeRes.payload?.record?.intake_id}` },
            body: {
                decision: 'verify',
            },
        } as any, verifyRes as any);
        expect(verifyRes.statusCode).toBe(200);
        expect(verifyRes.payload?.record?.verification_status).toBe('VERIFIED');

        const approvalCenterRes = createMockRes();
        await enterpriseCentersHandler({
            method: 'GET',
            headers: { authorization: `Bearer ${sessionId}` },
            query: { workspace_mode: 'current', center: 'APPROVAL' },
        } as any, approvalCenterRes as any);
        expect(approvalCenterRes.statusCode).toBe(200);
        expect(approvalCenterRes.payload?.summary?.items.some((item: { item_id: string }) => item.item_id === `pilot_promotion:${intakeRes.payload?.record?.intake_id}`)).toBe(true);

        const promoteRes = createMockRes();
        await enterpriseCenterDecisionHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            query: { workspace_mode: 'current', itemId: `pilot_promotion:${intakeRes.payload?.record?.intake_id}` },
            body: {
                decision: 'approve',
            },
        } as any, promoteRes as any);
        expect(promoteRes.statusCode).toBe(200);
        expect(promoteRes.payload?.record?.verification_status).toBe('PROMOTED');
    });

    it('supports pilot vault-backed webhook credential lifecycle and route gating', async () => {
        const store = createTaskStore({ driver: 'memory' });
        let currentTimeMs = 1_700_000_000_000;
        const now = () => {
            currentTimeMs += 1_000;
            return currentTimeMs;
        };
        const identityService = new EnterpriseIdentityAdminService({
            store,
            config: createPilotIdentityConfig(),
            now,
        });
        setEnterpriseIdentityAdminServiceForTests(identityService);

        const principalId = 'eprinc_webhook_admin';
        const sessionId = 'entsess_webhook_admin';
        await store.upsertEnterprisePrincipal({
            principal_id: principalId,
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_webhook_admin',
            email: 'webhook-admin@example.com',
            display_name: 'Webhook Admin',
            groups: ['agent-os-tenant-admins'],
            status: 'ACTIVE',
            created_at: now(),
            updated_at: now(),
        });
        await store.upsertEnterpriseAccessBinding({
            binding_id: 'ebind_webhook_tenant_admin',
            principal_id: principalId,
            tenant_id: 'tenant_pilot',
            roles: ['TENANT_ADMIN'],
            source: 'SCIM_SYNC',
            source_group: 'agent-os-tenant-admins',
            status: 'ACTIVE',
            provisioned_at: now(),
            created_at: now(),
            updated_at: now(),
        });
        await store.upsertEnterpriseIdentitySession({
            session_id: sessionId,
            principal_id: principalId,
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['TENANT_ADMIN'],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_webhook_admin',
                audience: 'client_test',
                email: 'webhook-admin@example.com',
                display_name: 'Webhook Admin',
                groups: ['agent-os-tenant-admins'],
            },
            issued_at: now(),
            expires_at: now() + 600_000,
            last_seen_at: now(),
            created_at: now(),
            updated_at: now(),
        });

        const webhookConfig: PilotVaultWebhookConfig = {
            backend: 'HASHICORP_VAULT',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            connector_type: 'HTTPS_WEBHOOK',
            connector_id: 'pilot_https_webhook',
            endpoint_url: 'https://webhook.example.com/pilot',
            auth_header_name: 'Authorization',
            auth_header_prefix: 'Bearer',
            static_headers: {
                'x-pilot-connector': 'true',
            },
            timeout_ms: 5_000,
            credential_id: 'pilot_https_webhook_credential',
            vault_addr: 'https://vault.example.com',
            vault_token: 'vault-token',
            read_path: 'secret/data/pilot/webhook',
            rotate_path: 'sys/rotate/pilot/webhook',
            secret_value_field: 'token',
            renew_increment_seconds: 900,
        };

        let leaseVersion = 1;
        let currentLeaseId = 'lease_v1';
        let currentSecretValue = 'webhook_secret_v1';
        let currentExpiresAt = currentTimeMs + 240_000;
        let renewCount = 0;
        let revokeCount = 0;
        let rotateCount = 0;
        const deliveredSecrets: string[] = [];

        const vaultPort: HashiCorpVaultPort = {
            async readCredential(config) {
                return {
                    credential_id: config.credential_id,
                    secret_value: currentSecretValue,
                    lease_id: currentLeaseId,
                    renewable: true,
                    lease_duration_seconds: Math.max(1, Math.floor((currentExpiresAt - currentTimeMs) / 1000)),
                    expires_at: currentExpiresAt,
                    version: String(leaseVersion),
                    metadata: { backend: 'kv-v2' },
                };
            },
            async renewLease(config, leaseId, incrementSeconds) {
                expect(config.connector_id).toBe(webhookConfig.connector_id);
                expect(leaseId).toBe(currentLeaseId);
                renewCount += 1;
                currentExpiresAt = currentTimeMs + ((incrementSeconds || config.renew_increment_seconds || 900) * 1000);
                return {
                    lease_id: currentLeaseId,
                    renewable: true,
                    lease_duration_seconds: Math.max(1, Math.floor((currentExpiresAt - currentTimeMs) / 1000)),
                    expires_at: currentExpiresAt,
                    version: String(leaseVersion),
                };
            },
            async revokeLease(config, leaseId) {
                expect(config.connector_id).toBe(webhookConfig.connector_id);
                expect(leaseId).toBe(currentLeaseId);
                revokeCount += 1;
            },
            async rotateCredential(config) {
                expect(config.connector_id).toBe(webhookConfig.connector_id);
                rotateCount += 1;
                leaseVersion += 1;
                currentLeaseId = `lease_v${leaseVersion}`;
                currentSecretValue = `webhook_secret_v${leaseVersion}`;
                currentExpiresAt = currentTimeMs + 360_000;
                return {
                    credential_id: config.credential_id,
                    secret_value: currentSecretValue,
                    lease_id: currentLeaseId,
                    renewable: true,
                    lease_duration_seconds: Math.max(1, Math.floor((currentExpiresAt - currentTimeMs) / 1000)),
                    expires_at: currentExpiresAt,
                    version: String(leaseVersion),
                    metadata: { backend: 'kv-v2', rotated: true },
                };
            },
        };

        const webhookDeliveryPort: WebhookDeliveryPort = {
            async deliver({ config, credential, payload, request_headers, correlation_id }) {
                expect(config.connector_id).toBe(webhookConfig.connector_id);
                expect(request_headers?.['x-request-source']).toBe('api-test');
                expect(correlation_id).toBe('corr_webhook_api');
                deliveredSecrets.push(credential.secret_value);
                return {
                    ok: true,
                    status: 202,
                    request_id: `webhook_req_${deliveredSecrets.length}`,
                    response_excerpt: JSON.stringify(payload),
                };
            },
        };

        const webhookService = new VaultBackedWebhookService({
            store,
            config: webhookConfig,
            hashiCorpVaultPort: vaultPort,
            webhookDeliveryPort,
            identityAdminService: identityService,
            now,
        });
        setVaultBackedWebhookServiceForTests(webhookService);
        setConnectorPlatformServiceForTests(new ConnectorPlatformService({
            store,
            config: webhookConfig,
            webhookService,
            now,
        }));

        const authHeaders = {
            authorization: `Bearer ${sessionId}`,
        };

        const healthRes = createMockRes();
        await credentialHealthWebhookHandler({
            method: 'GET',
            headers: authHeaders,
        } as any, healthRes as any);
        expect(healthRes.statusCode).toBe(200);
        expect(healthRes.payload?.success).toBe(true);
        expect(healthRes.payload?.credential_health?.backend).toBe('HASHICORP_VAULT');
        expect(healthRes.payload?.credential_health?.status).toBe('ACTIVE');
        expect(healthRes.payload?.credential_health?.route_eligible).toBe(true);
        expect(healthRes.payload?.credential_health?.recommended_action).toBe('NONE');

        const deliverRes = createMockRes();
        await deliverWebhookHandler({
            method: 'POST',
            headers: authHeaders,
            body: {
                payload: {
                    template_family: 'advisor_meeting_handoff',
                    document_id: 'crm_draft_001',
                },
                request_headers: {
                    'x-request-source': 'api-test',
                },
                task_id: 'task_webhook_api',
                correlation_id: 'corr_webhook_api',
                run_id: 'run_webhook_api',
                payload_summary: 'crm-ready draft handoff',
            },
        } as any, deliverRes as any);
        expect(deliverRes.statusCode).toBe(200);
        expect(deliverRes.payload?.success).toBe(true);
        expect(deliverRes.payload?.delivery?.status).toBe('DELIVERED');
        expect(deliverRes.payload?.correlation_id).toBe('corr_webhook_api');
        expect(deliverRes.payload?.delivery?.correlation_id).toBe('corr_webhook_api');
        expect(deliverRes.payload?.adapter?.adapter_id).toBe('generic_https_webhook');
        expect(deliverRes.payload?.connector_delivery?.task_id).toBe('task_webhook_api');
        expect(deliverRes.payload?.connector_delivery?.final_status).toBe('DELIVERED');
        expect(deliverRes.payload?.attempts).toHaveLength(1);
        expect(deliverRes.payload?.route_eligible).toBe(true);
        expect(deliverRes.payload?.credential_health?.last_delivery_status).toBe('DELIVERED');
        expect(deliveredSecrets).toEqual(['webhook_secret_v1']);

        const renewRes = createMockRes();
        await renewWebhookCredentialHandler({
            method: 'POST',
            headers: authHeaders,
            body: {
                increment_seconds: 1_200,
            },
        } as any, renewRes as any);
        expect(renewRes.statusCode).toBe(200);
        expect(renewRes.payload?.success).toBe(true);
        expect(renewRes.payload?.credential_health?.status).toBe('ACTIVE');
        expect(renewRes.payload?.credential_health?.renewable).toBe(true);
        expect(renewCount).toBe(1);

        const revokeRes = createMockRes();
        await revokeWebhookCredentialHandler({
            method: 'POST',
            headers: authHeaders,
            body: {
                compromised: true,
                reason: 'suspected_token_exposure',
            },
        } as any, revokeRes as any);
        expect(revokeRes.statusCode).toBe(200);
        expect(revokeRes.payload?.success).toBe(true);
        expect(revokeRes.payload?.credential_health?.status).toBe('COMPROMISED');
        expect(revokeRes.payload?.credential_health?.compromise_status).toBe('CONFIRMED');
        expect(revokeRes.payload?.credential_health?.route_eligible).toBe(false);
        expect(revokeRes.payload?.credential_health?.recommended_action).toBe('REVOKE_AND_ROTATE');
        expect(revokeCount).toBe(1);

        const blockedRes = createMockRes();
        await deliverWebhookHandler({
            method: 'POST',
            headers: authHeaders,
            body: {
                payload: {
                    template_family: 'advisor_meeting_handoff',
                    document_id: 'crm_draft_002',
                },
                request_headers: {
                    'x-request-source': 'api-test',
                },
                task_id: 'task_webhook_api',
                correlation_id: 'corr_webhook_api',
                run_id: 'run_webhook_api',
                payload_summary: 'blocked after compromise',
            },
        } as any, blockedRes as any);
        expect(blockedRes.statusCode).toBe(200);
        expect(blockedRes.payload?.success).toBe(false);
        expect(blockedRes.payload?.delivery?.status).toBe('BLOCKED_CREDENTIAL');
        expect(blockedRes.payload?.delivery?.blocked_reason).toBe('suspected_token_exposure');
        expect(blockedRes.payload?.credential_health?.compromise_status).toBe('CONFIRMED');
        expect(blockedRes.payload?.route_eligible).toBe(false);
        expect(deliveredSecrets).toEqual(['webhook_secret_v1']);

        const rotateRes = createMockRes();
        await rotateWebhookCredentialHandler({
            method: 'POST',
            headers: authHeaders,
        } as any, rotateRes as any);
        expect(rotateRes.statusCode).toBe(200);
        expect(rotateRes.payload?.success).toBe(true);
        expect(rotateRes.payload?.credential_health?.status).toBe('ACTIVE');
        expect(rotateRes.payload?.credential_health?.compromise_status).toBe('CLEAR');
        expect(rotateRes.payload?.credential_health?.route_eligible).toBe(true);
        expect(rotateRes.payload?.credential_health?.rotated_at).toBeTruthy();
        expect(rotateCount).toBe(1);

        const recoveredDeliverRes = createMockRes();
        await deliverWebhookHandler({
            method: 'POST',
            headers: authHeaders,
            body: {
                payload: {
                    template_family: 'advisor_meeting_handoff',
                    document_id: 'crm_draft_003',
                },
                request_headers: {
                    'x-request-source': 'api-test',
                },
                task_id: 'task_webhook_api',
                correlation_id: 'corr_webhook_api',
                run_id: 'run_webhook_api',
                payload_summary: 'post-rotate recovery delivery',
            },
        } as any, recoveredDeliverRes as any);
        expect(recoveredDeliverRes.statusCode).toBe(200);
        expect(recoveredDeliverRes.payload?.success).toBe(true);
        expect(recoveredDeliverRes.payload?.delivery?.status).toBe('DELIVERED');
        expect(recoveredDeliverRes.payload?.delivery?.request_id).toBe('webhook_req_2');
        expect(recoveredDeliverRes.payload?.connector_delivery?.final_status).toBe('DELIVERED');
        expect(recoveredDeliverRes.payload?.credential_health?.route_eligible).toBe(true);
        expect(recoveredDeliverRes.payload?.credential_health?.recent_deliveries).toHaveLength(3);
        expect(
            recoveredDeliverRes.payload?.credential_health?.recent_deliveries.some((delivery: { status: string }) =>
                delivery.status === 'BLOCKED_CREDENTIAL'
            )
        ).toBe(true);
        expect(deliveredSecrets).toEqual(['webhook_secret_v1', 'webhook_secret_v2']);

        const credentialRecord = await store.getVaultCredential(webhookConfig.credential_id);
        expect(credentialRecord?.status).toBe('ACTIVE');
        expect(credentialRecord?.compromise_status).toBe('CLEAR');
    });

    it('routes the pilot business connector through the connector platform with retry and health visibility', async () => {
        const store = createTaskStore({ driver: 'memory' });
        let currentTimeMs = 1_800_000_000_000;
        const now = () => {
            currentTimeMs += 1_000;
            return currentTimeMs;
        };
        const identityService = new EnterpriseIdentityAdminService({
            store,
            config: createPilotIdentityConfig(),
            now,
        });
        setEnterpriseIdentityAdminServiceForTests(identityService);

        await store.upsertEnterprisePrincipal({
            principal_id: 'eprinc_business_admin',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_business_admin',
            email: 'business-admin@example.com',
            display_name: 'Business Admin',
            groups: ['agent-os-tenant-admins'],
            status: 'ACTIVE',
            created_at: now(),
            updated_at: now(),
        });
        await store.upsertEnterpriseAccessBinding({
            binding_id: 'ebind_business_admin',
            principal_id: 'eprinc_business_admin',
            tenant_id: 'tenant_pilot',
            roles: ['TENANT_ADMIN'],
            source: 'SCIM_SYNC',
            source_group: 'agent-os-tenant-admins',
            status: 'ACTIVE',
            provisioned_at: now(),
            created_at: now(),
            updated_at: now(),
        });
        await store.upsertEnterpriseIdentitySession({
            session_id: 'entsess_business_admin',
            principal_id: 'eprinc_business_admin',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['TENANT_ADMIN'],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_business_admin',
                audience: 'client_test',
                email: 'business-admin@example.com',
                display_name: 'Business Admin',
                groups: ['agent-os-tenant-admins'],
            },
            issued_at: now(),
            expires_at: now() + 600_000,
            last_seen_at: now(),
            created_at: now(),
            updated_at: now(),
        });

        const webhookConfig: PilotVaultWebhookConfig = {
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

        let leaseId = 'lease_platform_1';
        let secretValue = 'platform_secret_1';
        let expiresAt = currentTimeMs + 300_000;
        let webhookAttempt = 0;
        const deliveredPayloads: unknown[] = [];

        const vaultPort: HashiCorpVaultPort = {
            async readCredential(config) {
                return {
                    credential_id: config.credential_id,
                    secret_value: secretValue,
                    lease_id: leaseId,
                    renewable: true,
                    lease_duration_seconds: Math.max(1, Math.floor((expiresAt - currentTimeMs) / 1000)),
                    expires_at: expiresAt,
                    version: '1',
                };
            },
            async renewLease(config, currentLeaseId) {
                return {
                    lease_id: currentLeaseId,
                    renewable: true,
                    lease_duration_seconds: Math.max(1, Math.floor((expiresAt - currentTimeMs) / 1000)),
                    expires_at: expiresAt,
                    version: '1',
                };
            },
            async revokeLease() {
                throw new Error('not_expected');
            },
            async rotateCredential(config) {
                leaseId = 'lease_platform_2';
                secretValue = 'platform_secret_2';
                expiresAt = currentTimeMs + 300_000;
                return {
                    credential_id: config.credential_id,
                    secret_value: secretValue,
                    lease_id: leaseId,
                    renewable: true,
                    lease_duration_seconds: Math.max(1, Math.floor((expiresAt - currentTimeMs) / 1000)),
                    expires_at: expiresAt,
                    version: '2',
                };
            },
        };

        const webhookDeliveryPort: WebhookDeliveryPort = {
            async deliver({ payload, correlation_id }) {
                expect(correlation_id).toBe('corr_business_handoff');
                webhookAttempt += 1;
                if (webhookAttempt === 1) {
                    throw new Error('temporary_connector_failure');
                }
                deliveredPayloads.push(payload);
                return {
                    ok: true,
                    status: 202,
                    request_id: `crm_handoff_req_${webhookAttempt}`,
                    response_excerpt: 'accepted',
                };
            },
        };

        const webhookService = new VaultBackedWebhookService({
            store,
            config: webhookConfig,
            hashiCorpVaultPort: vaultPort,
            webhookDeliveryPort,
            identityAdminService: identityService,
            now,
        });
        setVaultBackedWebhookServiceForTests(webhookService);
        setConnectorPlatformServiceForTests(new ConnectorPlatformService({
            store,
            config: webhookConfig,
            webhookService,
            now,
        }));

        const handoffRes = createMockRes();
        await advisorCrmComplianceHandoffHandler({
            method: 'POST',
            headers: { authorization: 'Bearer entsess_business_admin' },
            body: {
                workflow_id: 'workflow_123',
                crm_record_id: 'crm_456',
                client_name: 'A. Client',
                advisor_name: 'Advisor Jane',
                meeting_title: 'Quarterly Review',
                post_meeting_notes: 'Discussed rebalancing and tax-loss harvesting.',
                crm_ready_draft: 'CRM summary draft',
                compliance_handoff_package: 'Compliance packet v1',
                evidence_refs: ['note_1', 'draft_1'],
                task_id: 'task_business_handoff',
                correlation_id: 'corr_business_handoff',
                run_id: 'run_business_handoff',
                request_headers: {
                    'x-request-source': 'business-api-test',
                },
            },
        } as any, handoffRes as any);

        expect(handoffRes.statusCode).toBe(200);
        expect(handoffRes.payload?.success).toBe(true);
        expect(handoffRes.payload?.adapter?.adapter_id).toBe('advisor_crm_compliance_handoff');
        expect(handoffRes.payload?.correlation_id).toBe('corr_business_handoff');
        expect(handoffRes.payload?.connector_delivery?.attempts).toBe(2);
        expect(handoffRes.payload?.connector_delivery?.final_status).toBe('DELIVERED');
        expect(handoffRes.payload?.attempts).toHaveLength(2);
        expect(handoffRes.payload?.attempts[0]?.status).toBe('FAILED');
        expect(handoffRes.payload?.attempts[1]?.status).toBe('DELIVERED');
        expect(handoffRes.payload?.attempts[0]?.correlation_id).toBe('corr_business_handoff');
        expect(handoffRes.payload?.connector_health?.health_status).toBe('DEGRADED');
        expect(deliveredPayloads).toHaveLength(1);
        expect((deliveredPayloads[0] as { handoff_path?: string })?.handoff_path).toBe('crm_compliance_intake');

        const platformHealthRes = createMockRes();
        await connectorPlatformHealthHandler({
            method: 'GET',
            headers: { authorization: 'Bearer entsess_business_admin' },
            query: { adapter_id: 'advisor_crm_compliance_handoff' },
        } as any, platformHealthRes as any);
        expect(platformHealthRes.statusCode).toBe(200);
        expect(platformHealthRes.payload?.success).toBe(true);
        expect(platformHealthRes.payload?.connector?.adapter?.adapter_id).toBe('advisor_crm_compliance_handoff');
        expect(platformHealthRes.payload?.connector?.recent_failure_count).toBe(1);
        expect(platformHealthRes.payload?.connector?.route_eligible).toBe(true);

        const allPlatformHealthRes = createMockRes();
        await connectorPlatformHealthHandler({
            method: 'GET',
            headers: { authorization: 'Bearer entsess_business_admin' },
        } as any, allPlatformHealthRes as any);
        expect(allPlatformHealthRes.statusCode).toBe(200);
        expect(allPlatformHealthRes.payload?.success).toBe(true);
        expect(allPlatformHealthRes.payload?.connectors).toHaveLength(2);
        expect(
            allPlatformHealthRes.payload?.connectors.map((connector: { adapter: { adapter_id: string } }) =>
                connector.adapter.adapter_id
            )
        ).toEqual([
            'advisor_crm_compliance_handoff',
            'generic_https_webhook',
        ]);
    });

    it('records bounded compliance deletion requests and hashed audit exports for an admin session', async () => {
        const { sessionId } = await seedEnterpriseAdminSession('entsess_compliance_admin');

        const createRes = createMockRes();
        await createTaskHandler({
            method: 'POST',
            body: {
                graph: {
                    task_id: 'compliance_task_1',
                    goal: 'compliance task',
                    nodes: [{ id: 'n1', type: 'llm', name: 'llm.compliance' }],
                    edges: [],
                    retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
                },
            },
        } as any, createRes as any);
        expect(createRes.statusCode).toBe(200);
        expect(createRes.payload?.compliance?.retention?.policy_name).toBe('PILOT_APPEND_ONLY_NO_DELETE');

        const runRes = createMockRes();
        await runTaskHandler({ method: 'POST', query: { taskId: 'compliance_task_1' } } as any, runRes as any);
        expect(runRes.statusCode).toBe(200);
        await sleep(40);

        const summaryRes = createMockRes();
        await complianceSummaryHandler({
            method: 'GET',
            query: { task_id: 'compliance_task_1' },
        } as any, summaryRes as any);
        expect(summaryRes.statusCode).toBe(200);
        expect(summaryRes.payload?.compliance?.deletion?.delete_allowed).toBe(false);
        expect(summaryRes.payload?.compliance?.legal_hold?.mode).toBe('MANUAL_ESCALATION_REQUIRED');

        const deletionRes = createMockRes();
        await complianceDeletionRequestHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                task_id: 'compliance_task_1',
                reason: 'customer_erasure_request',
            },
        } as any, deletionRes as any);
        expect(deletionRes.statusCode).toBe(200);
        expect(deletionRes.payload?.deletion_request?.status).toBe('DENIED_APPEND_ONLY_POLICY');
        expect(deletionRes.payload?.compliance?.deletion?.latest_requests).toHaveLength(1);

        const legalHoldDeletionRes = createMockRes();
        await complianceDeletionRequestHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                task_id: 'compliance_task_1',
                reason: 'legal_hold_case',
                legal_hold_asserted: true,
            },
        } as any, legalHoldDeletionRes as any);
        expect(legalHoldDeletionRes.statusCode).toBe(200);
        expect(legalHoldDeletionRes.payload?.deletion_request?.status).toBe('DENIED_MANUAL_LEGAL_HOLD_REVIEW');

        const exportRes = createMockRes();
        await complianceAuditExportHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                task_id: 'compliance_task_1',
            },
        } as any, exportRes as any);
        expect(exportRes.statusCode).toBe(200);
        expect(exportRes.payload?.audit_export?.status).toBe('GENERATED');
        expect(exportRes.payload?.audit_export?.manifest_sha256).toBeTruthy();
        expect(exportRes.payload?.audit_export?.bundle_sha256).toBeTruthy();
        expect(exportRes.payload?.export_bundle?.sections?.length).toBeGreaterThan(0);
        expect(exportRes.payload?.compliance?.audit_export?.total_exports).toBe(1);

        const getTaskRes = createMockRes();
        await getTaskHandler({ method: 'GET', query: { taskId: 'compliance_task_1' } } as any, getTaskRes as any);
        expect(getTaskRes.statusCode).toBe(200);
        expect(getTaskRes.payload?.compliance?.audit_export?.latest_export?.export_id).toBe(
            exportRes.payload?.audit_export?.export_id
        );
    });

    it('denies compliance actions for non-admin enterprise sessions', async () => {
        const { sessionId } = await seedEnterpriseAdminSession('entsess_non_admin', 'WORKSPACE_MEMBER');

        const createRes = createMockRes();
        await createTaskHandler({
            method: 'POST',
            body: {
                graph: {
                    task_id: 'compliance_task_denied',
                    goal: 'compliance denied task',
                    nodes: [{ id: 'n1', type: 'llm', name: 'llm.compliance.denied' }],
                    edges: [],
                },
            },
        } as any, createRes as any);
        expect(createRes.statusCode).toBe(200);

        const deletionRes = createMockRes();
        await complianceDeletionRequestHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                task_id: 'compliance_task_denied',
                reason: 'unauthorized_delete_attempt',
            },
        } as any, deletionRes as any);
        expect(deletionRes.statusCode).toBe(403);
        expect(deletionRes.payload?.error).toBe('enterprise_admin_access_denied');

        const exportRes = createMockRes();
        await complianceAuditExportHandler({
            method: 'POST',
            headers: { authorization: `Bearer ${sessionId}` },
            body: {
                task_id: 'compliance_task_denied',
            },
        } as any, exportRes as any);
        expect(exportRes.statusCode).toBe(403);
        expect(exportRes.payload?.error).toBe('enterprise_admin_access_denied');
    });

    it('creates shared trial workspace session, task, invite, and summary records', async () => {
        const sessionRes = createMockRes();
        await trialWorkspaceSessionHandler({
            method: 'POST',
            body: {
                lab_actor_id: 'local_operator_01',
                page: 'operator',
                section: 'operations',
            },
        } as any, sessionRes as any);
        expect(sessionRes.statusCode).toBe(200);
        expect(sessionRes.payload?.session?.actor_role).toBe('OPERATOR');

        const taskRes = createMockRes();
        await trialWorkspaceTaskHandler({
            method: 'POST',
            body: {
                lab_actor_id: 'local_requester_01',
                template_id: 'advisor_client_intake',
                requester_brief: [
                    'Create a new client intake for a high-net-worth advisory prospect.',
                    'Client name: Eleanor Hart',
                    'Jurisdiction: UK',
                    'Priority: high',
                    'Required outcome: intake record prepared, compliance review requested, CRM handoff ready if policy allows.',
                    'Do not finalize external handoff until compliance-required fields are complete.',
                    'If anything is missing, request operator review instead of silently proceeding.',
                ].join('\n'),
            },
        } as any, taskRes as any);
        expect(taskRes.statusCode).toBe(200);
        expect(taskRes.payload?.task?.scenario_id).toBe('advisor_client_intake');

        const inviteRes = createMockRes();
        await trialWorkspaceInviteHandler({
            method: 'POST',
            body: {
                role: 'APPROVER',
                label: 'approver observer',
            },
        } as any, inviteRes as any);
        expect(inviteRes.statusCode).toBe(200);
        expect(inviteRes.payload?.invite?.status).toBe('OPEN');
        expect(inviteRes.payload?.invite?.oa_role).toBe('APPROVER');

        const acceptRes = createMockRes();
        await trialWorkspaceInviteAcceptHandler({
            method: 'POST',
            body: {
                invite_code: inviteRes.payload?.invite?.invite_code,
                actor_label: 'Shared Tenant Admin',
            },
        } as any, acceptRes as any);
        expect(acceptRes.statusCode).toBe(200);
        expect(acceptRes.payload?.participant?.actor_label).toBe('Shared Tenant Admin');

        const claimedSeatId = String(
            acceptRes.payload?.summary?.seats?.find((seat: { claim_status: string }) => seat.claim_status === 'CLAIMED')?.seat_id || ''
        );
        expect(claimedSeatId).toBeTruthy();

        const releaseRes = createMockRes();
        await trialWorkspaceSeatReleaseHandler({
            method: 'POST',
            body: {
                seat_id: claimedSeatId,
            },
        } as any, releaseRes as any);
        expect(releaseRes.statusCode).toBe(200);
        expect(releaseRes.payload?.seat?.claim_status).toBe('ASSIGNED_BASE');

        const summaryRes = createMockRes();
        await trialWorkspaceSummaryHandler({ method: 'GET' } as any, summaryRes as any);
        expect(summaryRes.statusCode).toBe(200);
        expect(summaryRes.payload?.summary?.trial_workspace?.label).toContain('Enterprise Trial Workspace');
        expect(summaryRes.payload?.summary?.participants.length).toBeGreaterThanOrEqual(9);
        expect(summaryRes.payload?.summary?.seats.length).toBeGreaterThanOrEqual(9);
        expect(summaryRes.payload?.summary?.sessions.length).toBeGreaterThanOrEqual(1);
        expect(summaryRes.payload?.summary?.tasks.length).toBeGreaterThanOrEqual(1);
        expect(summaryRes.payload?.summary?.conversion_guidance_lines.length).toBeGreaterThan(0);
        expect(summaryRes.payload?.summary?.persistence_state).toBe('MEMORY_ONLY');
        expect(summaryRes.payload?.summary?.join_instructions.length).toBeGreaterThan(0);
    });
});

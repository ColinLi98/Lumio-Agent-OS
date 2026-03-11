import type {
    AgentKernelDeploymentModel,
    AgentKernelDeploymentStage,
    AgentKernelEnvironmentBoundarySummary,
    AgentKernelIdentityAdminPathSummary,
    AgentKernelInfrastructureEnvironment,
    AgentKernelPilotDeploymentSummary,
    AgentKernelPilotDeploymentTaskSummary,
    AgentKernelSecretSeparationSummary,
    AgentKernelTaskDeploymentSummary,
    AgentKernelTenantIsolationSummary,
    AgentKernelVaultPathSummary,
    AgentKernelRegionResidencySummary,
    TaskSnapshot,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { resolvePilotIdentityProviderConfigFromEnv } from './identityAdmin.js';
import { resolvePilotVaultWebhookConfigFromEnv } from './vaultWebhook.js';

export interface AgentKernelDeploymentBaselineServiceOptions {
    now?: () => number;
}

const BASELINE_DOC_PATH = 'docs/agent-kernel-pilot-deployment-baseline.md';
const DEPLOYMENT_MODEL: AgentKernelDeploymentModel = 'VENDOR_MANAGED_SINGLE_TENANT_CLOUD';
const DEFERRED_ITEMS = [
    'shared multi-tenant productization beyond the frozen pilot deployment baseline',
    'self-hosted, private-cloud, or hybrid deployment models',
    'multi-region active-active runtime and automated region failover',
    'broad self-serve tenant/environment provisioning',
] as const;

function currentTime(): number {
    return Date.now();
}

function uniqueStrings(values: Array<string | undefined>): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => String(value || '').trim())
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));
}

function normalizeStage(raw: string | undefined): AgentKernelDeploymentStage {
    const normalized = String(raw || '').trim().toUpperCase();
    if (normalized === 'DEV' || normalized === 'DEVELOPMENT') return 'DEVELOPMENT';
    if (normalized === 'STAGE' || normalized === 'STAGING') return 'STAGING';
    if (normalized === 'PILOT') return 'PILOT';
    if (normalized === 'PROD' || normalized === 'PRODUCTION') return 'PRODUCTION';
    return 'UNSPECIFIED';
}

function normalizeEnvironment(raw: string | undefined): AgentKernelInfrastructureEnvironment {
    const normalized = String(raw || '').trim().toUpperCase();
    if (normalized === 'DEV' || normalized === 'DEVELOPMENT') return 'DEVELOPMENT';
    if (normalized === 'STAGE' || normalized === 'STAGING') return 'STAGING';
    if (normalized === 'PROD' || normalized === 'PRODUCTION') return 'PRODUCTION';
    return 'UNSPECIFIED';
}

function inferEnvironment(stage: AgentKernelDeploymentStage): AgentKernelInfrastructureEnvironment {
    if (stage === 'DEVELOPMENT') return 'DEVELOPMENT';
    if (stage === 'STAGING') return 'STAGING';
    if (stage === 'PILOT' || stage === 'PRODUCTION') return 'PRODUCTION';
    return 'UNSPECIFIED';
}

function stageTokens(stage: AgentKernelDeploymentStage): string[] {
    switch (stage) {
    case 'DEVELOPMENT':
        return ['dev', 'development', 'local'];
    case 'STAGING':
        return ['stage', 'staging', 'preprod'];
    case 'PILOT':
        return ['pilot', 'prod', 'production'];
    case 'PRODUCTION':
        return ['prod', 'production', 'live'];
    default:
        return [];
    }
}

function pathMatchesStage(path: string | undefined, stage: AgentKernelDeploymentStage): boolean {
    const normalized = String(path || '').trim().toLowerCase();
    if (!normalized) return false;
    return stageTokens(stage).some((token) => normalized.includes(token));
}

function environmentBoundaries(): AgentKernelEnvironmentBoundarySummary[] {
    return [
        {
            stage: 'DEVELOPMENT',
            backing_environment: 'DEVELOPMENT',
            customer_data_policy: 'LOCAL_OR_SYNTHETIC_ONLY',
            secret_scope: 'LOCAL_ONLY',
            promotion_to: 'STAGING',
            manual_approval_required: false,
            description: 'Internal engineering environment only. No tenant production data and no shared pilot secrets.',
        },
        {
            stage: 'STAGING',
            backing_environment: 'STAGING',
            customer_data_policy: 'APPROVED_VALIDATION_ONLY',
            secret_scope: 'NON_PRODUCTION_TENANT_SCOPE',
            promotion_from: 'DEVELOPMENT',
            promotion_to: 'PILOT',
            manual_approval_required: true,
            description: 'Tenant-specific pre-production validation with manual promotion and non-production secrets.',
        },
        {
            stage: 'PILOT',
            backing_environment: 'PRODUCTION',
            customer_data_policy: 'TENANT_PRODUCTION_DATA',
            secret_scope: 'PRODUCTION_TENANT_SCOPE',
            promotion_from: 'STAGING',
            promotion_to: 'PRODUCTION',
            manual_approval_required: true,
            description: 'Controlled release ring on the dedicated production deployment for the frozen pilot tenant.',
        },
        {
            stage: 'PRODUCTION',
            backing_environment: 'PRODUCTION',
            customer_data_policy: 'TENANT_PRODUCTION_DATA',
            secret_scope: 'PRODUCTION_TENANT_SCOPE',
            promotion_from: 'PILOT',
            manual_approval_required: true,
            description: 'Full production operation after pilot sign-off, still within the single-tenant dedicated deployment.',
        },
    ];
}

interface DeploymentBaseSummary {
    status: AgentKernelTaskDeploymentSummary['status'];
    deployment_stage: AgentKernelDeploymentStage;
    backing_environment: AgentKernelInfrastructureEnvironment;
    identity_admin_path: AgentKernelIdentityAdminPathSummary;
    vault_path: AgentKernelVaultPathSummary;
    tenant_isolation: AgentKernelTenantIsolationSummary;
    region: AgentKernelRegionResidencySummary;
    secret_separation: AgentKernelSecretSeparationSummary;
    environment_boundaries: AgentKernelEnvironmentBoundarySummary[];
    warnings: string[];
}

export class AgentKernelDeploymentBaselineService {
    private readonly now: () => number;

    constructor(
        private readonly store: TaskStore,
        options?: AgentKernelDeploymentBaselineServiceOptions,
    ) {
        this.now = options?.now || currentTime;
    }

    private async buildBaseSummary(): Promise<DeploymentBaseSummary> {
        const identityConfig = resolvePilotIdentityProviderConfigFromEnv();
        const vaultConfig = resolvePilotVaultWebhookConfigFromEnv();
        const configuredTenantId = String(
            identityConfig?.tenant_id
            || vaultConfig?.tenant_id
            || process.env.AGENT_KERNEL_PILOT_TENANT_ID
            || ''
        ).trim() || undefined;
        const deploymentStage = normalizeStage(process.env.AGENT_KERNEL_DEPLOYMENT_STAGE);
        const backingEnvironment = (() => {
            const explicit = normalizeEnvironment(process.env.AGENT_KERNEL_DEPLOYMENT_ENVIRONMENT);
            return explicit !== 'UNSPECIFIED' ? explicit : inferEnvironment(deploymentStage);
        })();
        const primaryRegion = String(process.env.AGENT_KERNEL_PRIMARY_REGION || '').trim() || undefined;
        const stagingRegion = String(
            process.env.AGENT_KERNEL_STAGING_REGION
            || primaryRegion
            || ''
        ).trim() || undefined;
        const residencyScope = String(process.env.AGENT_KERNEL_RESIDENCY_SCOPE || '').trim() || undefined;

        const principals = await this.store.listEnterprisePrincipals();
        const bindings = await this.store.listEnterpriseAccessBindings();
        const sessions = await this.store.listEnterpriseIdentitySessions();
        const credentials = await this.store.listVaultCredentials();
        const activeTenantIds = uniqueStrings([
            ...principals.filter((record) => record.status === 'ACTIVE').map((record) => record.tenant_id),
            ...bindings.filter((record) => record.status === 'ACTIVE').map((record) => record.tenant_id),
            ...sessions.filter((record) => record.status === 'ACTIVE').map((record) => record.tenant_id),
            ...credentials
                .filter((record) => record.status !== 'REVOKED')
                .map((record) => record.tenant_id),
        ]);
        const observedWorkspaceIds = uniqueStrings([
            identityConfig?.default_workspace_id,
            vaultConfig?.workspace_id,
            ...bindings.filter((record) => record.status === 'ACTIVE').map((record) => record.workspace_id),
            ...sessions.filter((record) => record.status === 'ACTIVE').map((record) => record.workspace_id),
            ...credentials
                .filter((record) => record.status !== 'REVOKED')
                .map((record) => record.workspace_id),
        ]);

        const globalIssues: string[] = [];
        if (deploymentStage === 'UNSPECIFIED') {
            globalIssues.push('deployment_stage_not_explicit');
        }
        if (backingEnvironment === 'UNSPECIFIED') {
            globalIssues.push('backing_environment_not_explicit');
        }
        if (!primaryRegion) {
            globalIssues.push('primary_region_not_explicit');
        }
        if (!residencyScope) {
            globalIssues.push('residency_scope_not_explicit');
        }
        if (deploymentStage === 'PILOT' && backingEnvironment !== 'PRODUCTION') {
            globalIssues.push('pilot_stage_must_run_on_production_environment');
        }
        if (deploymentStage === 'PRODUCTION' && backingEnvironment !== 'PRODUCTION') {
            globalIssues.push('production_stage_must_run_on_production_environment');
        }

        const identity_admin_path: AgentKernelIdentityAdminPathSummary = {
            path_name: 'OKTA_OIDC_SCIM',
            provider: 'OKTA_OIDC',
            configured: Boolean(identityConfig),
            tenant_id: identityConfig?.tenant_id,
            default_workspace_id: identityConfig?.default_workspace_id,
        };
        if (!identityConfig) {
            globalIssues.push('identity_admin_path_not_configured');
        }

        const vault_path: AgentKernelVaultPathSummary = {
            path_name: 'HASHICORP_VAULT_WEBHOOK',
            backend: 'HASHICORP_VAULT',
            configured: Boolean(vaultConfig),
            tenant_id: vaultConfig?.tenant_id,
            workspace_id: vaultConfig?.workspace_id,
            connector_id: vaultConfig?.connector_id,
            credential_id: vaultConfig?.credential_id,
        };
        if (!vaultConfig) {
            globalIssues.push('vault_connector_path_not_configured');
        }

        const tenantIsolationIssues: string[] = [];
        if (identityConfig && vaultConfig && identityConfig.tenant_id !== vaultConfig.tenant_id) {
            tenantIsolationIssues.push('identity_and_vault_tenant_mismatch');
        }
        if (identityConfig?.default_workspace_id && vaultConfig?.workspace_id
            && identityConfig.default_workspace_id !== vaultConfig.workspace_id) {
            tenantIsolationIssues.push('identity_and_vault_workspace_mismatch');
        }
        if (activeTenantIds.length > 1) {
            tenantIsolationIssues.push('multiple_active_tenants_observed');
        }
        if (configuredTenantId && activeTenantIds.some((tenantId) => tenantId !== configuredTenantId)) {
            tenantIsolationIssues.push('active_records_escape_configured_tenant_boundary');
        }

        const tenant_isolation: AgentKernelTenantIsolationSummary = {
            status: tenantIsolationIssues.length === 0 ? 'ISOLATED' : 'DEGRADED',
            isolation_model: 'SINGLE_TENANT_VENDOR_MANAGED_DEPLOYMENT',
            configured_tenant_id: configuredTenantId,
            identity_tenant_id: identityConfig?.tenant_id,
            connector_tenant_id: vaultConfig?.tenant_id,
            observed_active_tenant_ids: activeTenantIds,
            observed_workspace_ids: observedWorkspaceIds,
            issues: tenantIsolationIssues,
        };

        const regionIssues: string[] = [];
        if (!primaryRegion) {
            regionIssues.push('primary_region_missing');
        }
        if (!residencyScope) {
            regionIssues.push('residency_scope_missing');
        }
        const region: AgentKernelRegionResidencySummary = {
            status: regionIssues.length === 0 ? 'CONFIGURED' : 'DEGRADED',
            strategy: 'SINGLE_PRIMARY_REGION_PER_TENANT',
            primary_region: primaryRegion,
            staging_region: stagingRegion,
            residency_scope: residencyScope,
            active_active_enabled: false,
            failover_mode: 'MANUAL_REDEPLOY',
            issues: regionIssues,
        };

        const secretIssues: string[] = [];
        if (!vaultConfig) {
            secretIssues.push('vault_secret_scope_unavailable');
        } else {
            if (!vaultConfig.rotate_path) {
                secretIssues.push('vault_rotate_path_missing');
            }
            if (deploymentStage !== 'UNSPECIFIED' && !vaultConfig.vault_namespace
                && !pathMatchesStage(vaultConfig.read_path, deploymentStage)
                && !pathMatchesStage(vaultConfig.rotate_path, deploymentStage)) {
                secretIssues.push('vault_scope_not_environment_partitioned');
            }
            if (primaryRegion && !vaultConfig.vault_namespace && !pathMatchesStage(vaultConfig.read_path, deploymentStage)) {
                secretIssues.push('vault_scope_relies_on_shared_path_without_namespace');
            }
        }
        const secret_separation: AgentKernelSecretSeparationSummary = {
            status: secretIssues.length === 0 ? 'SCOPED' : 'DEGRADED',
            strategy: 'TENANT_DEPLOYMENT_AND_ENVIRONMENT_SCOPED',
            backend: vaultConfig?.backend,
            vault_namespace: vaultConfig?.vault_namespace,
            read_path: vaultConfig?.read_path,
            rotate_path: vaultConfig?.rotate_path,
            connector_id: vaultConfig?.connector_id,
            credential_id: vaultConfig?.credential_id,
            issues: secretIssues,
        };

        const warnings = uniqueStrings([
            ...globalIssues,
            ...tenantIsolationIssues,
            ...regionIssues,
            ...secretIssues,
        ]);

        return {
            status: warnings.length === 0 ? 'READY' : 'DEGRADED',
            deployment_stage: deploymentStage,
            backing_environment: backingEnvironment,
            identity_admin_path,
            vault_path,
            tenant_isolation,
            region,
            secret_separation,
            environment_boundaries: environmentBoundaries(),
            warnings,
        };
    }

    async summarizeTask(snapshot: TaskSnapshot): Promise<AgentKernelTaskDeploymentSummary> {
        const base = await this.buildBaseSummary();
        return {
            task_id: snapshot.task_state.task_id,
            correlation_id: snapshot.task_state.correlation?.correlation_id || `corr_missing_${snapshot.task_state.task_id}`,
            status: base.status,
            deployment_model: DEPLOYMENT_MODEL,
            deployment_stage: base.deployment_stage,
            backing_environment: base.backing_environment,
            baseline_doc_path: BASELINE_DOC_PATH,
            identity_admin_path: base.identity_admin_path,
            vault_path: base.vault_path,
            tenant_isolation: base.tenant_isolation,
            region: base.region,
            secret_separation: base.secret_separation,
            environment_boundaries: base.environment_boundaries,
            warnings: base.warnings,
        };
    }

    async summarizePilot(snapshots: TaskSnapshot[]): Promise<AgentKernelPilotDeploymentSummary> {
        const base = await this.buildBaseSummary();
        const task_summaries: AgentKernelPilotDeploymentTaskSummary[] = snapshots
            .map((snapshot) => ({
                task_id: snapshot.task_state.task_id,
                task_status: snapshot.task_state.status,
                correlation_id: snapshot.task_state.correlation?.correlation_id || `corr_missing_${snapshot.task_state.task_id}`,
                updated_at: snapshot.task_state.updated_at,
            }))
            .sort((a, b) => b.updated_at - a.updated_at);

        return {
            generated_at: this.now(),
            status: base.status,
            deployment_model: DEPLOYMENT_MODEL,
            deployment_stage: base.deployment_stage,
            backing_environment: base.backing_environment,
            baseline_doc_path: BASELINE_DOC_PATH,
            identity_admin_path: base.identity_admin_path,
            vault_path: base.vault_path,
            tenant_isolation: base.tenant_isolation,
            region: base.region,
            secret_separation: base.secret_separation,
            environment_boundaries: base.environment_boundaries,
            task_count: snapshots.length,
            active_task_count: snapshots.filter((snapshot) => snapshot.task_state.status === 'RUNNING' || snapshot.task_state.status === 'WAITING_USER').length,
            task_summaries,
            warnings: base.warnings,
            deferred_items: [...DEFERRED_ITEMS],
        };
    }
}

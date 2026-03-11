/**
 * LIX Dashboard API
 * Provider Metrics and 24h Statistics
 * 
 * For beta: exposes provider health, circuit status, and fee metrics.
 */

import { getAllCircuitStatuses } from './providerRegistry.js';
import { getProxyStats } from './proxyPolicy.js';
import { getAcceptFeeStats, getProviderBalance } from '../acceptFeeService.js';
import { getDisputeStats, getProviderPenalties, isProviderBanned } from '../disputeService.js';
import { sumCounters, sumGauges } from '../metricsCollector.js';

// ============================================================================
// Types
// ============================================================================

export interface ProviderHealth {
    provider_id: string;
    name: string;
    circuit_status: 'closed' | 'open' | 'half_open';
    is_banned: boolean;
    reputation_impact: number;
    pending_fees: number;
    total_penalties: number;
}

export interface DashboardMetrics {
    timestamp: number;
    providers: ProviderHealth[];
    circuit_summary: {
        total: number;
        closed: number;
        open: number;
        half_open: number;
    };
    fee_summary: {
        total_collected: number;
        pending: number;
        count: number;
        avg_transaction: number;
    };
    dispute_summary: {
        total: number;
        open: number;
        resolved: number;
        refund_rate: number;
    };
    proxy_status: {
        enabled: boolean;
        total: number;
        healthy: number;
    };
    agent_kernel_summary: {
        tasks_done: number;
        tasks_failed: number;
        tasks_waiting_user: number;
        compensation_applied: number;
        compensation_irreversible: number;
        compensation_requires_user: number;
        rollout_target_percent: number;
        rollout_routed_total: number;
        rollout_enabled_total: number;
        rollout_enabled_rate: number;
        runtime_attempts: number;
        runtime_failures: number;
        runtime_failure_rate: number;
        policy_sync_matched: number;
        policy_sync_mismatch: number;
        policy_sync_missing_client: number;
        task_open_alerts: number;
        tasks_degraded: number;
        task_dead_letters_open: number;
        task_stale_claims: number;
        task_service_auth_denied: number;
        task_projection_rebuild_required: number;
    };
}

// ============================================================================
// Provider Name Mapping
// ============================================================================

const PROVIDER_NAMES: Record<string, string> = {
    jd: '京东',
    pdd: '拼多多',
    taobao: '淘宝/天猫'
};

function parseRolloutPercent(value: unknown): number {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
}

// ============================================================================
// Dashboard Endpoint
// ============================================================================

/**
 * Get complete dashboard metrics (for admin UI).
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get circuit statuses
    const circuitStatuses = await getAllCircuitStatuses();

    // Build provider health list
    const providers: ProviderHealth[] = [];
    let closedCount = 0, openCount = 0, halfOpenCount = 0;

    for (const [providerId, status] of Object.entries(circuitStatuses)) {
        const balance = getProviderBalance(providerId);
        const penalties = getProviderPenalties(providerId);
        const banned = isProviderBanned(providerId);

        providers.push({
            provider_id: providerId,
            name: PROVIDER_NAMES[providerId] || providerId,
            circuit_status: status as 'closed' | 'open' | 'half_open',
            is_banned: banned,
            reputation_impact: penalties.reduce((sum, p) => sum + (p.value || 0), 0),
            pending_fees: balance.pending_fees,
            total_penalties: penalties.length
        });

        if (status === 'closed') closedCount++;
        else if (status === 'open') openCount++;
        else halfOpenCount++;
    }

    // Get fee stats
    const feeStats = getAcceptFeeStats();

    // Get dispute stats
    const disputeStats = getDisputeStats();

    // Get proxy stats
    const proxyStats = getProxyStats();

    const tasksDone = sumCounters('agent_kernel_tasks_total', { status: 'done' });
    const tasksFailed = sumCounters('agent_kernel_tasks_total', { status: 'failed' });
    const tasksWaitingUser = sumCounters('agent_kernel_tasks_total', { status: 'waiting_user' });
    const compensationApplied = sumCounters('agent_kernel_compensation_total', { disposition: 'applied' });
    const compensationIrreversible = sumCounters('agent_kernel_compensation_total', { disposition: 'irreversible' });
    const compensationRequiresUser = sumCounters('agent_kernel_compensation_total', { disposition: 'requires_user' });
    const rolloutTargetPercent = parseRolloutPercent(
        process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT
        ?? process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT
        ?? 0
    );
    const rolloutRoutedTotal = sumCounters('super_agent_agent_kernel_routing_total');
    const rolloutEnabledTotal = sumCounters('super_agent_agent_kernel_routing_total', { enabled: 'true' });
    const rolloutEnabledRate = rolloutRoutedTotal > 0 ? rolloutEnabledTotal / rolloutRoutedTotal : 0;
    const runtimeAttempts = sumCounters('super_agent_agent_kernel_runtime_total');
    const runtimeFailures = sumCounters('super_agent_agent_kernel_runtime_total', { status: 'failed' })
        + sumCounters('super_agent_agent_kernel_runtime_total', { status: 'execution_error' });
    const runtimeFailureRate = runtimeAttempts > 0 ? runtimeFailures / runtimeAttempts : 0;
    const policySyncMatched = sumCounters('super_agent_policy_sync_total', { status: 'matched' });
    const policySyncMissingClient = sumCounters('super_agent_policy_sync_total', { status: 'missing_client' });
    const policySyncMismatch = sumCounters('super_agent_policy_sync_total', { status: 'version_mismatch' })
        + sumCounters('super_agent_policy_sync_total', { status: 'fingerprint_mismatch' });
    const taskOpenAlerts = sumGauges('agent_kernel_task_open_alerts');
    const tasksDegraded = sumGauges('agent_kernel_task_degraded_mode');
    const taskDeadLettersOpen = sumGauges('agent_kernel_task_dead_letters_open');
    const taskStaleClaims = sumGauges('agent_kernel_task_stale_claims');
    const taskServiceAuthDenied = sumGauges('agent_kernel_task_service_auth_denied');
    const taskProjectionRebuildRequired = sumGauges('agent_kernel_task_projection_rebuild_required');

    return {
        timestamp: Date.now(),
        providers,
        circuit_summary: {
            total: providers.length,
            closed: closedCount,
            open: openCount,
            half_open: halfOpenCount
        },
        fee_summary: {
            total_collected: feeStats.total_fees_collected,
            pending: feeStats.pending_amount,
            count: feeStats.fee_count,
            avg_transaction: feeStats.avg_transaction
        },
        dispute_summary: {
            total: disputeStats.total_disputes,
            open: disputeStats.open_disputes,
            resolved: disputeStats.resolved_disputes,
            refund_rate: disputeStats.refund_rate
        },
        proxy_status: {
            enabled: proxyStats.enabled,
            total: proxyStats.total_proxies,
            healthy: proxyStats.healthy_proxies
        },
        agent_kernel_summary: {
            tasks_done: tasksDone,
            tasks_failed: tasksFailed,
            tasks_waiting_user: tasksWaitingUser,
            compensation_applied: compensationApplied,
            compensation_irreversible: compensationIrreversible,
            compensation_requires_user: compensationRequiresUser,
            rollout_target_percent: rolloutTargetPercent,
            rollout_routed_total: rolloutRoutedTotal,
            rollout_enabled_total: rolloutEnabledTotal,
            rollout_enabled_rate: rolloutEnabledRate,
            runtime_attempts: runtimeAttempts,
            runtime_failures: runtimeFailures,
            runtime_failure_rate: runtimeFailureRate,
            policy_sync_matched: policySyncMatched,
            policy_sync_mismatch: policySyncMismatch,
            policy_sync_missing_client: policySyncMissingClient,
            task_open_alerts: taskOpenAlerts,
            tasks_degraded: tasksDegraded,
            task_dead_letters_open: taskDeadLettersOpen,
            task_stale_claims: taskStaleClaims,
            task_service_auth_denied: taskServiceAuthDenied,
            task_projection_rebuild_required: taskProjectionRebuildRequired,
        }
    };
}

/**
 * Get quick health summary (for monitoring).
 */
export async function getHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    active_providers: number;
    open_circuits: number;
    pending_disputes: number;
}> {
    const metrics = await getDashboardMetrics();

    // Determine overall health
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.circuit_summary.open === metrics.circuit_summary.total) {
        status = 'unhealthy';  // All circuits open
    } else if (metrics.circuit_summary.open > 0 || metrics.dispute_summary.open > 2) {
        status = 'degraded';
    }

    return {
        status,
        active_providers: metrics.circuit_summary.closed + metrics.circuit_summary.half_open,
        open_circuits: metrics.circuit_summary.open,
        pending_disputes: metrics.dispute_summary.open
    };
}

export default {
    getDashboardMetrics,
    getHealthSummary
};

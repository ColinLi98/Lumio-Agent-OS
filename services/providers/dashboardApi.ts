/**
 * LIX Dashboard API
 * Provider Metrics and 24h Statistics
 * 
 * For beta: exposes provider health, circuit status, and fee metrics.
 */

import { getAllCircuitStatuses } from './providerRegistry';
import { getProxyStats } from './proxyPolicy';
import { getAcceptFeeStats, getProviderBalance } from '../acceptFeeService';
import { getDisputeStats, getProviderPenalties, isProviderBanned } from '../disputeService';

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
}

// ============================================================================
// Provider Name Mapping
// ============================================================================

const PROVIDER_NAMES: Record<string, string> = {
    jd: '京东',
    pdd: '拼多多',
    taobao: '淘宝/天猫'
};

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

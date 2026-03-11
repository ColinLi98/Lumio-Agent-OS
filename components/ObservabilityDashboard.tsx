/**
 * ObservabilityDashboard - Provider metrics and system health
 * 
 * Displays: provider status, circuit states, latency metrics, validation rates
 */

import React, { useState, useEffect } from 'react';
import {
    Activity, AlertTriangle, CheckCircle, XCircle,
    Wifi, WifiOff, Clock, TrendingUp, Shield, DollarSign,
    RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { getDashboardMetrics, DashboardMetrics, ProviderHealth } from '../services/providers/dashboardApi';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#a78bfa',
    positive: '#34d399',
    warning: '#fbbf24',
    error: '#ef4444',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Sub Components
// ============================================================================

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subtitle, color = colors.primary }) => (
    <div style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.bg2,
        border: `1px solid ${colors.border}`
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ color }}>{icon}</div>
            <span style={{ fontSize: 11, color: colors.text3 }}>{label}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.text1 }}>{value}</div>
        {subtitle && (
            <div style={{ fontSize: 11, color: colors.text3, marginTop: 4 }}>{subtitle}</div>
        )}
    </div>
);

interface ProviderRowProps {
    provider: ProviderHealth;
}

const ProviderRow: React.FC<ProviderRowProps> = ({ provider }) => {
    const circuitColors = {
        closed: colors.positive,
        open: colors.error,
        half_open: colors.warning
    };

    const circuitLabels = {
        closed: 'Normal',
        open: 'Open',
        half_open: 'Recovering'
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 8,
            backgroundColor: colors.bg3,
            marginBottom: 8
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: circuitColors[provider.circuit_status]
                }} />
                <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: colors.text1 }}>
                        {provider.name}
                    </div>
                    <div style={{ fontSize: 11, color: colors.text3 }}>
                        {circuitLabels[provider.circuit_status]}
                        {provider.is_banned && ' · Banned'}
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: colors.text2 }}>
                    ¥{provider.pending_fees.toFixed(2)}
                </div>
                {provider.total_penalties > 0 && (
                    <div style={{ fontSize: 10, color: colors.warning }}>
                        {provider.total_penalties} penalties
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface ObservabilityDashboardProps {
    isDark?: boolean;
}

export const ObservabilityDashboard: React.FC<ObservabilityDashboardProps> = ({ isDark = true }) => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showProviders, setShowProviders] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadMetrics = async () => {
        setIsLoading(true);
        try {
            const data = await getDashboardMetrics();
            setMetrics(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('[Dashboard] Failed to load metrics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
        // Refresh every 30 seconds
        const interval = setInterval(loadMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading && !metrics) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: colors.text3 }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p>Loading monitoring data...</p>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: colors.error }}>
                <AlertTriangle size={24} />
                <p>Unable to load monitoring data</p>
            </div>
        );
    }

    const healthStatus = metrics.circuit_summary.open === 0 ? 'healthy' :
        metrics.circuit_summary.open === metrics.circuit_summary.total ? 'unhealthy' : 'degraded';

    const healthColors = {
        healthy: colors.positive,
        degraded: colors.warning,
        unhealthy: colors.error
    };

    const healthLabels = {
        healthy: 'Healthy',
        degraded: 'Degraded',
        unhealthy: 'Unhealthy'
    };

    return (
        <div style={{ padding: 4 }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Activity size={20} color={colors.primary} />
                    <h2 style={{ color: colors.text1, fontSize: 16, fontWeight: 600, margin: 0 }}>
                        LIX Monitoring Dashboard
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 20,
                        backgroundColor: `${healthColors[healthStatus]}20`,
                        color: healthColors[healthStatus],
                        fontSize: 11,
                        fontWeight: 500
                    }}>
                        {healthStatus === 'healthy' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {healthLabels[healthStatus]}
                    </div>
                    <button
                        onClick={loadMetrics}
                        style={{
                            padding: 6,
                            borderRadius: 6,
                            backgroundColor: colors.bg3,
                            border: 'none',
                            color: colors.text2,
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <MetricCard
                    icon={<Wifi size={16} />}
                    label="Active providers"
                    value={`${metrics.circuit_summary.closed}/${metrics.circuit_summary.total}`}
                    subtitle={`${metrics.circuit_summary.open} circuits open`}
                    color={metrics.circuit_summary.open > 0 ? colors.warning : colors.positive}
                />
                <MetricCard
                    icon={<DollarSign size={16} />}
                    label="Accept Fee"
                    value={`¥${metrics.fee_summary.total_collected.toFixed(0)}`}
                    subtitle={`${metrics.fee_summary.count} transactions`}
                    color={colors.positive}
                />
                <MetricCard
                    icon={<Shield size={16} />}
                    label="Disputes"
                    value={metrics.dispute_summary.open}
                    subtitle={`Total ${metrics.dispute_summary.total} | Refund rate ${(metrics.dispute_summary.refund_rate * 100).toFixed(0)}%`}
                    color={metrics.dispute_summary.open > 2 ? colors.warning : colors.positive}
                />
                <MetricCard
                    icon={metrics.proxy_status.enabled ? <Wifi size={16} /> : <WifiOff size={16} />}
                    label="Proxy status"
                    value={metrics.proxy_status.enabled ? `${metrics.proxy_status.healthy}/${metrics.proxy_status.total}` : 'Disabled'}
                    subtitle={metrics.proxy_status.enabled ? 'Proxy healthy' : 'Direct mode'}
                    color={metrics.proxy_status.enabled ? colors.positive : colors.text3}
                />
                <MetricCard
                    icon={<Activity size={16} />}
                    label="Agent kernel tasks"
                    value={metrics.agent_kernel_summary.tasks_done}
                    subtitle={`Failed ${metrics.agent_kernel_summary.tasks_failed} | Waiting ${metrics.agent_kernel_summary.tasks_waiting_user}`}
                    color={metrics.agent_kernel_summary.tasks_failed > 0 ? colors.warning : colors.positive}
                />
                <MetricCard
                    icon={<AlertTriangle size={16} />}
                    label="Compensations"
                    value={metrics.agent_kernel_summary.compensation_applied}
                    subtitle={`Irreversible ${metrics.agent_kernel_summary.compensation_irreversible} | Needs user ${metrics.agent_kernel_summary.compensation_requires_user}`}
                    color={metrics.agent_kernel_summary.compensation_irreversible > 0 ? colors.warning : colors.positive}
                />
                <MetricCard
                    icon={<TrendingUp size={16} />}
                    label="Kernel rollout"
                    value={`${(metrics.agent_kernel_summary.rollout_enabled_rate * 100).toFixed(1)}%`}
                    subtitle={`${metrics.agent_kernel_summary.rollout_enabled_total}/${metrics.agent_kernel_summary.rollout_routed_total} | target ${metrics.agent_kernel_summary.rollout_target_percent}%`}
                    color={metrics.agent_kernel_summary.rollout_enabled_rate > 0 ? colors.primary : colors.text3}
                />
                <MetricCard
                    icon={<Clock size={16} />}
                    label="Policy sync / runtime"
                    value={metrics.agent_kernel_summary.policy_sync_mismatch}
                    subtitle={`Missing client ${metrics.agent_kernel_summary.policy_sync_missing_client} | runtime fail ${(metrics.agent_kernel_summary.runtime_failure_rate * 100).toFixed(1)}%`}
                    color={
                        metrics.agent_kernel_summary.policy_sync_mismatch > 0
                            || metrics.agent_kernel_summary.runtime_failure_rate > 0.05
                            ? colors.warning
                            : colors.positive
                    }
                />
            </div>

            {/* Provider List */}
            <div style={{
                borderRadius: 12,
                backgroundColor: colors.bg2,
                border: `1px solid ${colors.border}`,
                overflow: 'hidden'
            }}>
                <button
                    onClick={() => setShowProviders(!showProviders)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'none',
                        border: 'none',
                        color: colors.text1,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    <span>Provider status</span>
                    {showProviders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showProviders && (
                    <div style={{ padding: '0 12px 12px' }}>
                        {metrics.providers.map(provider => (
                            <ProviderRow key={provider.provider_id} provider={provider} />
                        ))}
                    </div>
                )}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
                <div style={{
                    marginTop: 12,
                    fontSize: 10,
                    color: colors.text3,
                    textAlign: 'center'
                }}>
                    <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Last updated: {lastUpdated.toLocaleTimeString('en-US')}
                </div>
            )}
        </div>
    );
};

export default ObservabilityDashboard;

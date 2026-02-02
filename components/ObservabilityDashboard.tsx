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
        closed: '正常',
        open: '断开',
        half_open: '恢复中'
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
                        {provider.is_banned && ' · 已封禁'}
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: colors.text2 }}>
                    ¥{provider.pending_fees.toFixed(2)}
                </div>
                {provider.total_penalties > 0 && (
                    <div style={{ fontSize: 10, color: colors.warning }}>
                        {provider.total_penalties} 惩罚
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
                <p>加载监控数据...</p>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: colors.error }}>
                <AlertTriangle size={24} />
                <p>无法加载监控数据</p>
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
        healthy: '系统正常',
        degraded: '部分降级',
        unhealthy: '系统异常'
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
                        LIX 监控面板
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
                    label="活跃提供商"
                    value={`${metrics.circuit_summary.closed}/${metrics.circuit_summary.total}`}
                    subtitle={`${metrics.circuit_summary.open} 断路器打开`}
                    color={metrics.circuit_summary.open > 0 ? colors.warning : colors.positive}
                />
                <MetricCard
                    icon={<DollarSign size={16} />}
                    label="Accept Fee"
                    value={`¥${metrics.fee_summary.total_collected.toFixed(0)}`}
                    subtitle={`${metrics.fee_summary.count} 笔交易`}
                    color={colors.positive}
                />
                <MetricCard
                    icon={<Shield size={16} />}
                    label="争议处理"
                    value={metrics.dispute_summary.open}
                    subtitle={`总 ${metrics.dispute_summary.total} | 退款率 ${(metrics.dispute_summary.refund_rate * 100).toFixed(0)}%`}
                    color={metrics.dispute_summary.open > 2 ? colors.warning : colors.positive}
                />
                <MetricCard
                    icon={metrics.proxy_status.enabled ? <Wifi size={16} /> : <WifiOff size={16} />}
                    label="代理状态"
                    value={metrics.proxy_status.enabled ? `${metrics.proxy_status.healthy}/${metrics.proxy_status.total}` : '禁用'}
                    subtitle={metrics.proxy_status.enabled ? '代理健康' : '直连模式'}
                    color={metrics.proxy_status.enabled ? colors.positive : colors.text3}
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
                    <span>提供商状态</span>
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
                    最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
                </div>
            )}
        </div>
    );
};

export default ObservabilityDashboard;

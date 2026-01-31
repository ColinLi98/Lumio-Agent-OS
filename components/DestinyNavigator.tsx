/**
 * Destiny Navigator - 命运导航系统
 * 
 * 设计理念：专业级人生决策仪表盘
 * 视觉风格：Bloomberg Terminal / 投行级工具
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ArrowUpRight, ArrowDownRight, TrendingUp, ChevronRight,
    RefreshCw, AlertTriangle, Target, Clock, Gauge, BarChart3,
    Layers, Activity, Compass, Crosshair, MoveRight, Info,
    ArrowRight, Check, X, Minus
} from 'lucide-react';

import {
    NavigationAdvice,
    LifeDecision,
    LifeSnapshot,
    SimulatedPath,
    LIFE_DECISIONS,
    getNavigationAdvice,
    analyzeLifeDecision,
} from '../services/destinyNavigatorService';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    // 主色调 - 克制的蓝绿色
    primary: '#0EA5E9',
    primaryMuted: 'rgba(14, 165, 233, 0.15)',
    
    // 语义色
    positive: '#10B981',
    positiveMuted: 'rgba(16, 185, 129, 0.15)',
    negative: '#EF4444',
    negativeMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    neutral: '#6B7280',
    
    // 背景层次
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    
    // 文字
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    
    // 边框
    border: 'rgba(148, 163, 184, 0.1)',
    borderHover: 'rgba(148, 163, 184, 0.2)',
};

// ============================================================================
// Utility Components
// ============================================================================

const MetricValue: React.FC<{
    value: number;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
}> = ({ value, suffix = '', trend, size = 'md' }) => {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl'
    };
    
    return (
        <div className="flex items-baseline gap-1">
            <span className={`font-mono font-semibold ${sizeClasses[size]}`} style={{ color: colors.text1 }}>
                {value.toFixed(0)}
            </span>
            {suffix && (
                <span className="text-sm font-medium" style={{ color: colors.text3 }}>{suffix}</span>
            )}
            {trend && trend !== 'neutral' && (
                <span className={`ml-1 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </span>
            )}
        </div>
    );
};

const ProgressBar: React.FC<{
    value: number;
    max?: number;
    color?: string;
    showValue?: boolean;
    height?: number;
}> = ({ value, max = 100, color = colors.primary, showValue = false, height = 4 }) => {
    const percentage = Math.min(100, (value / max) * 100);
    
    return (
        <div className="flex items-center gap-3 w-full">
            <div 
                className="flex-1 rounded-full overflow-hidden"
                style={{ backgroundColor: colors.bg3, height }}
            >
                <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                        width: `${percentage}%`,
                        backgroundColor: color
                    }}
                />
            </div>
            {showValue && (
                <span className="text-xs font-mono tabular-nums" style={{ color: colors.text2, minWidth: 32 }}>
                    {value}
                </span>
            )}
        </div>
    );
};

const StatusIndicator: React.FC<{
    status: 'positive' | 'negative' | 'warning' | 'neutral';
    label: string;
    size?: 'sm' | 'md';
}> = ({ status, label, size = 'sm' }) => {
    const statusColors = {
        positive: colors.positive,
        negative: colors.negative,
        warning: colors.warning,
        neutral: colors.neutral
    };
    
    return (
        <div className="flex items-center gap-2">
            <div 
                className={`rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                style={{ backgroundColor: statusColors[status] }}
            />
            <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'}`} style={{ color: colors.text2 }}>
                {label}
            </span>
        </div>
    );
};

// ============================================================================
// Section Components
// ============================================================================

/**
 * 核心指标卡片
 */
const MetricCard: React.FC<{
    label: string;
    value: number;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    description?: string;
    color?: string;
}> = ({ label, value, suffix, trend, description, color = colors.primary }) => {
    return (
        <div 
            className="p-4 rounded-lg transition-colors hover:bg-slate-800/50"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.text3 }}>
                    {label}
                </span>
                {trend && trend !== 'neutral' && (
                    <div className={`flex items-center gap-0.5 text-xs ${
                        trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                        {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        <span>{trend === 'up' ? '+' : '-'}12%</span>
                    </div>
                )}
            </div>
            <MetricValue value={value} suffix={suffix} size="md" />
            {description && (
                <p className="text-xs mt-2" style={{ color: colors.text3 }}>{description}</p>
            )}
            <div className="mt-3">
                <ProgressBar value={value} color={color} height={3} />
            </div>
        </div>
    );
};

/**
 * 当前状态仪表盘
 */
const StateOverview: React.FC<{
    position: LifeSnapshot;
}> = ({ position }) => {
    const metrics = [
        { key: 'wealth', label: '财务资本', value: position.wealth, color: '#10B981' },
        { key: 'health', label: '健康资本', value: position.health, color: '#F59E0B' },
        { key: 'network', label: '社会资本', value: position.networkQuality, color: '#6366F1' },
        { key: 'fulfillment', label: '实现度', value: position.fulfillment, color: '#EC4899' },
    ];

    return (
        <div 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-3">
                    <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: colors.primaryMuted }}
                    >
                        <Crosshair size={16} style={{ color: colors.primary }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: colors.text1 }}>当前状态</h3>
                        <p className="text-xs" style={{ color: colors.text3 }}>{position.age} 岁</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs" style={{ color: colors.text3 }}>综合评分</div>
                    <div className="text-xl font-mono font-semibold" style={{ color: colors.primary }}>
                        {Math.round((position.wealth + position.health + position.networkQuality + position.fulfillment) / 4)}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
                {metrics.map(metric => (
                    <div key={metric.key} className="p-3 rounded-lg" style={{ backgroundColor: colors.bg3 }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: colors.text3 }}>{metric.label}</span>
                            <span className="text-sm font-mono font-semibold" style={{ color: colors.text1 }}>
                                {metric.value}
                            </span>
                        </div>
                        <ProgressBar value={metric.value} color={metric.color} height={3} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * 最优行动建议
 */
const OptimalAction: React.FC<{
    advice: NavigationAdvice;
    onAnalyze: (decision: LifeDecision) => void;
}> = ({ advice, onAnalyze }) => {
    const action = advice.nextBestAction;
    
    return (
        <div 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            {/* Rerouting Alert */}
            {advice.rerouting && (
                <div 
                    className="px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: colors.warningMuted, borderBottom: `1px solid ${colors.border}` }}
                >
                    <RefreshCw size={14} className="animate-spin" style={{ color: colors.warning }} />
                    <div>
                        <span className="text-xs font-medium" style={{ color: colors.warning }}>
                            重新计算中
                        </span>
                        <span className="text-xs ml-2" style={{ color: colors.text3 }}>
                            {advice.reroutingReason}
                        </span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                    <Target size={14} style={{ color: colors.positive }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.positive }}>
                        最优行动
                    </span>
                </div>
                <h3 className="text-lg font-semibold" style={{ color: colors.text1 }}>
                    {action.name}
                </h3>
            </div>

            {/* Content */}
            <div className="p-5">
                <p className="text-sm leading-relaxed mb-4" style={{ color: colors.text2 }}>
                    {action.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <div className="text-xs mb-1" style={{ color: colors.text3 }}>时间成本</div>
                        <div className="font-mono font-semibold" style={{ color: colors.text1 }}>
                            {action.timeCost} <span className="text-xs font-normal" style={{ color: colors.text3 }}>年</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs mb-1" style={{ color: colors.text3 }}>成功概率</div>
                        <div className="font-mono font-semibold" style={{ color: colors.positive }}>
                            {Math.round(action.baseSuccessProbability * 100)}%
                        </div>
                    </div>
                    <div>
                        <div className="text-xs mb-1" style={{ color: colors.text3 }}>风险等级</div>
                        <div className="font-mono font-semibold" style={{ 
                            color: (action.impacts.risk || 0) > 50 ? colors.negative : 
                                   (action.impacts.risk || 0) > 30 ? colors.warning : colors.positive 
                        }}>
                            {action.impacts.risk || 0}
                        </div>
                    </div>
                </div>

                {/* Opportunity Cost */}
                {action.opportunityCost.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs mb-2" style={{ color: colors.text3 }}>机会成本</div>
                        <div className="flex flex-wrap gap-2">
                            {action.opportunityCost.map((cost, idx) => (
                                <span 
                                    key={idx}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ backgroundColor: colors.bg3, color: colors.text2 }}
                                >
                                    {cost}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={() => onAnalyze(action)}
                    className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    style={{ 
                        backgroundColor: colors.primaryMuted, 
                        color: colors.primary,
                        border: `1px solid ${colors.primary}30`
                    }}
                >
                    查看详细分析
                    <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

/**
 * 价值投影
 */
const ValueProjection: React.FC<{
    currentValue: number;
    projectedValue: number;
    regretMinimization: number;
    etaToGoal: number;
}> = ({ currentValue, projectedValue, regretMinimization, etaToGoal }) => {
    const delta = projectedValue - currentValue;
    const deltaPercent = ((delta / currentValue) * 100).toFixed(1);
    
    return (
        <div 
            className="rounded-xl p-5"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} style={{ color: colors.primary }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.text3 }}>
                    价值投影
                </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <div className="text-xs mb-1" style={{ color: colors.text3 }}>当前价值</div>
                    <div className="text-2xl font-mono font-semibold" style={{ color: colors.text1 }}>
                        {currentValue.toFixed(0)}
                    </div>
                </div>
                <div>
                    <div className="text-xs mb-1" style={{ color: colors.text3 }}>预期价值 (60岁)</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold" style={{ color: colors.positive }}>
                            {projectedValue.toFixed(0)}
                        </span>
                        <span className="text-xs" style={{ color: colors.positive }}>
                            +{deltaPercent}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs mb-1" style={{ color: colors.text3 }}>后悔最小化指数</div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-mono font-semibold" style={{ color: colors.text1 }}>
                                {regretMinimization.toFixed(0)}%
                            </span>
                            <StatusIndicator 
                                status={regretMinimization > 80 ? 'positive' : regretMinimization > 50 ? 'warning' : 'negative'}
                                label={regretMinimization > 80 ? '优秀' : regretMinimization > 50 ? '良好' : '需改进'}
                            />
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs mb-1" style={{ color: colors.text3 }}>预计达成</div>
                        <span className="text-lg font-mono font-semibold" style={{ color: colors.text1 }}>
                            {etaToGoal} 年
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * 风险与机会
 */
const RiskOpportunity: React.FC<{
    risks: string[];
    opportunities: string[];
}> = ({ risks, opportunities }) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Risks */}
            <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: colors.negativeMuted, border: `1px solid ${colors.negative}20` }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: colors.negative }} />
                    <span className="text-xs font-medium" style={{ color: colors.negative }}>风险提示</span>
                </div>
                <div className="space-y-2">
                    {risks.length > 0 ? risks.slice(0, 3).map((risk, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                            <X size={12} className="mt-0.5 flex-shrink-0" style={{ color: colors.negative }} />
                            <span className="text-xs leading-relaxed" style={{ color: colors.text2 }}>{risk}</span>
                        </div>
                    )) : (
                        <span className="text-xs" style={{ color: colors.text3 }}>暂无重大风险</span>
                    )}
                </div>
            </div>

            {/* Opportunities */}
            <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: colors.positiveMuted, border: `1px solid ${colors.positive}20` }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Check size={14} style={{ color: colors.positive }} />
                    <span className="text-xs font-medium" style={{ color: colors.positive }}>机会窗口</span>
                </div>
                <div className="space-y-2">
                    {opportunities.length > 0 ? opportunities.slice(0, 3).map((opp, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                            <Check size={12} className="mt-0.5 flex-shrink-0" style={{ color: colors.positive }} />
                            <span className="text-xs leading-relaxed" style={{ color: colors.text2 }}>{opp}</span>
                        </div>
                    )) : (
                        <span className="text-xs" style={{ color: colors.text3 }}>持续积累中</span>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * 路径可视化
 */
const PathVisualization: React.FC<{
    path: SimulatedPath;
}> = ({ path }) => {
    const dataPoints = useMemo(() => {
        return path.snapshots.map((s, i) => ({
            age: s.age,
            value: Math.round((s.wealth + s.health + s.fulfillment + s.networkQuality) / 4)
        }));
    }, [path.snapshots]);

    const maxValue = Math.max(...dataPoints.map(d => d.value));
    const minValue = Math.min(...dataPoints.map(d => d.value));
    const range = maxValue - minValue || 1;

    return (
        <div 
            className="rounded-xl p-5"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity size={14} style={{ color: colors.primary }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.text3 }}>
                        价值曲线预测
                    </span>
                </div>
                <div className="text-xs" style={{ color: colors.text3 }}>
                    基于 1000 次蒙特卡洛模拟
                </div>
            </div>

            {/* Simple Line Chart */}
            <div className="relative h-32">
                <svg className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={colors.primary} />
                            <stop offset="100%" stopColor={colors.positive} />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(y => (
                        <line 
                            key={y}
                            x1="0" 
                            y1={`${y}%`} 
                            x2="100%" 
                            y2={`${y}%`}
                            stroke={colors.border}
                            strokeWidth="1"
                        />
                    ))}

                    {/* Area */}
                    <path
                        d={`
                            M 0 ${128}
                            ${dataPoints.map((d, i) => {
                                const x = (i / (dataPoints.length - 1)) * 100;
                                const y = 128 - ((d.value - minValue) / range) * 120;
                                return `L ${x}% ${y}`;
                            }).join(' ')}
                            L 100% ${128}
                            Z
                        `}
                        fill="url(#areaGradient)"
                    />

                    {/* Line */}
                    <path
                        d={dataPoints.map((d, i) => {
                            const x = (i / (dataPoints.length - 1)) * 100;
                            const y = 128 - ((d.value - minValue) / range) * 120;
                            return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>

                {/* Labels */}
                <div 
                    className="absolute bottom-0 left-0 right-0 flex justify-between text-xs px-1"
                    style={{ color: colors.text3 }}
                >
                    <span>{dataPoints[0]?.age || 28}</span>
                    <span>{dataPoints[Math.floor(dataPoints.length / 2)]?.age || 44}</span>
                    <span>{dataPoints[dataPoints.length - 1]?.age || 60}</span>
                </div>
            </div>

            {/* Key Decisions */}
            {path.decisions.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <div className="text-xs mb-2" style={{ color: colors.text3 }}>路径关键节点</div>
                    <div className="flex flex-wrap gap-2">
                        {path.decisions.slice(0, 4).map((d, idx) => (
                            <span 
                                key={idx}
                                className="px-2 py-1 rounded text-xs"
                                style={{ backgroundColor: colors.bg3, color: colors.text2 }}
                            >
                                {d.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 决策分析弹窗
 */
const DecisionAnalysisModal: React.FC<{
    decision: LifeDecision;
    onClose: () => void;
}> = ({ decision, onClose }) => {
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const result = analyzeLifeDecision(decision.id);
        setAnalysis(result);
        setLoading(false);
    }, [decision.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div 
                className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl"
                style={{ backgroundColor: colors.bg1, border: `1px solid ${colors.border}` }}
            >
                {/* Header */}
                <div 
                    className="sticky top-0 px-5 py-4 flex items-center justify-between"
                    style={{ backgroundColor: colors.bg1, borderBottom: `1px solid ${colors.border}` }}
                >
                    <h3 className="font-semibold" style={{ color: colors.text1 }}>决策分析</h3>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} style={{ color: colors.text3 }} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Decision Info */}
                    <div>
                        <h4 className="text-lg font-semibold mb-2" style={{ color: colors.text1 }}>
                            {decision.name}
                        </h4>
                        <p className="text-sm" style={{ color: colors.text2 }}>
                            {decision.description}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="animate-spin" style={{ color: colors.text3 }} />
                        </div>
                    ) : analysis && (
                        <>
                            {/* Expected Value */}
                            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.bg2 }}>
                                <div className="text-xs mb-2" style={{ color: colors.text3 }}>累计期望价值</div>
                                <div className="text-3xl font-mono font-semibold" style={{ color: colors.positive }}>
                                    {analysis.expectedValue.toFixed(1)}
                                </div>
                            </div>

                            {/* Risk */}
                            <div>
                                <div className="text-xs mb-2" style={{ color: colors.text3 }}>风险评估</div>
                                <StatusIndicator 
                                    status={
                                        analysis.riskAssessment === '高风险' ? 'negative' :
                                        analysis.riskAssessment === '中等风险' ? 'warning' : 'positive'
                                    }
                                    label={analysis.riskAssessment}
                                    size="md"
                                />
                            </div>

                            {/* Long Term Impact */}
                            <div>
                                <div className="text-xs mb-2" style={{ color: colors.text3 }}>长期影响</div>
                                <p className="text-sm" style={{ color: colors.text2 }}>
                                    {analysis.longTermImpact}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface DestinyNavigatorProps {
    isDark?: boolean;
}

export const DestinyNavigatorPanel: React.FC<DestinyNavigatorProps> = ({ isDark = true }) => {
    const [advice, setAdvice] = useState<NavigationAdvice | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDecision, setSelectedDecision] = useState<LifeDecision | null>(null);

    useEffect(() => {
        refreshNavigation();
    }, []);

    const refreshNavigation = useCallback(() => {
        setLoading(true);
        setTimeout(() => {
            const nav = getNavigationAdvice();
            setAdvice(nav);
            setLoading(false);
        }, 300);
    }, []);

    if (loading) {
        return (
            <div 
                className="flex flex-col items-center justify-center h-64 gap-4"
                style={{ color: colors.text3 }}
            >
                <RefreshCw className="animate-spin" size={24} />
                <div className="text-sm">正在计算最优路径...</div>
            </div>
        );
    }

    if (!advice) {
        return (
            <div className="text-center py-8" style={{ color: colors.text3 }}>
                无法获取导航数据
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div 
                className="rounded-xl p-5"
                style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: colors.primaryMuted }}
                        >
                            <Compass size={20} style={{ color: colors.primary }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: colors.text1 }}>
                                命运导航
                            </h2>
                            <p className="text-xs" style={{ color: colors.text3 }}>
                                Bellman 最优化引擎 · γ = 0.92
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={refreshNavigation}
                        className="p-2 rounded-lg transition-colors hover:bg-slate-700"
                    >
                        <RefreshCw size={16} style={{ color: colors.text3 }} />
                    </button>
                </div>
            </div>

            {/* State Overview */}
            <StateOverview position={advice.currentPosition} />

            {/* Value Projection */}
            <ValueProjection 
                currentValue={advice.currentLifeValue}
                projectedValue={advice.projectedLifeValue}
                regretMinimization={advice.regretMinimization}
                etaToGoal={advice.etaToGoal}
            />

            {/* Optimal Action */}
            <OptimalAction 
                advice={advice}
                onAnalyze={setSelectedDecision}
            />

            {/* Risk & Opportunity */}
            <RiskOpportunity 
                risks={advice.riskAhead}
                opportunities={advice.opportunities}
            />

            {/* Path Visualization */}
            <PathVisualization path={advice.recommendedPath} />

            {/* Decision Modal */}
            {selectedDecision && (
                <DecisionAnalysisModal
                    decision={selectedDecision}
                    onClose={() => setSelectedDecision(null)}
                />
            )}
        </div>
    );
};

export default DestinyNavigatorPanel;

/**
 * TrustScorePanel - Trust score visualization component
 *
 * Multi-dimensional trust visualization:
 * - Overall score gauge
 * - Four-dimension view
 * - Historical trend
 * - Trust level badge
 */

import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getTrustScore, TrustScore, TrustLevel, TrustDimensions } from '../services/trustScoreService';

// ============================================================================
// Trust Gauge
// ============================================================================

interface TrustGaugeProps {
    score: number;
    level: TrustLevel;
    size?: number;
}

const TrustGauge: React.FC<TrustGaugeProps> = ({ score, level, size = 120 }) => {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = Math.PI * radius; // semicircle
    const offset = circumference - (score / 100) * circumference;

    // Get color by trust level.
    const getColor = (l: TrustLevel): string => {
        const colors: Record<TrustLevel, string> = {
            [TrustLevel.UNTRUSTED]: '#ef4444',
            [TrustLevel.LOW]: '#f97316',
            [TrustLevel.MEDIUM]: '#eab308',
            [TrustLevel.HIGH]: '#22c55e',
            [TrustLevel.VERIFIED]: '#3b82f6',
        };
        return colors[l];
    };

    const getLevelLabel = (l: TrustLevel): string => {
        const labels: Record<TrustLevel, string> = {
            [TrustLevel.UNTRUSTED]: 'Untrusted',
            [TrustLevel.LOW]: 'Low Trust',
            [TrustLevel.MEDIUM]: 'Medium',
            [TrustLevel.HIGH]: 'High Trust',
            [TrustLevel.VERIFIED]: 'Verified',
        };
        return labels[l];
    };

    const color = getColor(level);

    return (
        <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
            <svg width={size} height={size / 2 + 10} className="overflow-visible">
                {/* Background arc */}
                <path
                    d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Progress arc */}
                <path
                    d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-700"
                />
                {/* Ticks */}
                {[0, 25, 50, 75, 100].map((tick) => {
                    const angle = Math.PI - (tick / 100) * Math.PI;
                    const x = size / 2 + (radius + 15) * Math.cos(angle);
                    const y = size / 2 - (radius + 15) * Math.sin(angle);
                    return (
                        <text
                            key={tick}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] fill-slate-500"
                        >
                            {tick}
                        </text>
                    );
                })}
            </svg>
            {/* Center score */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <div className="text-2xl font-bold" style={{ color }}>{score}</div>
                <div className="text-xs text-slate-400">{getLevelLabel(level)}</div>
            </div>
        </div>
    );
};

// ============================================================================
// Dimension Bar
// ============================================================================

interface DimensionBarProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

const DimensionBar: React.FC<DimensionBarProps> = ({ label, value, icon, color }) => {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                    {icon}
                    <span>{label}</span>
                </div>
                <span className="text-slate-400">{value}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${value}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
};

// ============================================================================
// Trust History Item
// ============================================================================

interface HistoryItemProps {
    action: string;
    delta: number;
    reason: string;
    timestamp: number;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ action, delta, reason, timestamp }) => {
    const isPositive = delta >= 0;
    const timeStr = new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="flex items-center gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
            <div className={`p-1 rounded ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {isPositive ? (
                    <TrendingUp size={12} className="text-green-400" />
                ) : (
                    <TrendingDown size={12} className="text-red-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{reason}</div>
                <div className="text-[10px] text-slate-500">{timeStr}</div>
            </div>
            <div className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{delta}
            </div>
        </div>
    );
};

// ============================================================================
// Trust Level Badge
// ============================================================================

interface TrustBadgeProps {
    level: TrustLevel;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ level }) => {
    const config: Record<TrustLevel, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
        [TrustLevel.UNTRUSTED]: {
            icon: <AlertTriangle size={14} />,
            bg: 'bg-red-500/20 border-red-500/30',
            text: 'text-red-400',
            label: 'Trust Not Established',
        },
        [TrustLevel.LOW]: {
            icon: <Info size={14} />,
            bg: 'bg-orange-500/20 border-orange-500/30',
            text: 'text-orange-400',
            label: 'Low Trust',
        },
        [TrustLevel.MEDIUM]: {
            icon: <Shield size={14} />,
            bg: 'bg-yellow-500/20 border-yellow-500/30',
            text: 'text-yellow-400',
            label: 'Medium Trust',
        },
        [TrustLevel.HIGH]: {
            icon: <CheckCircle size={14} />,
            bg: 'bg-green-500/20 border-green-500/30',
            text: 'text-green-400',
            label: 'High Trust',
        },
        [TrustLevel.VERIFIED]: {
            icon: <Award size={14} />,
            bg: 'bg-blue-500/20 border-blue-500/30',
            text: 'text-blue-400',
            label: 'Verified',
        },
    };

    const c = config[level];

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${c.bg} ${c.text}`}>
            {c.icon}
            <span className="text-xs font-medium">{c.label}</span>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface TrustScorePanelProps {
    onLog?: (message: string) => void;
}

export const TrustScorePanel: React.FC<TrustScorePanelProps> = ({ onLog }) => {
    const [trustData, setTrustData] = useState<TrustScore | null>(null);

    useEffect(() => {
        loadTrustData();
        // Listen for storage changes.
        const handleStorage = () => loadTrustData();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const loadTrustData = () => {
        const data = getTrustScore();
        setTrustData(data);
    };

    if (!trustData) {
        return (
            <div className="text-center py-4 text-slate-400">
                <Shield size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading...</p>
            </div>
        );
    }

    const dimensionConfig: {
        key: keyof TrustDimensions;
        label: string;
        icon: React.ReactNode;
        color: string;
    }[] = [
            { key: 'authentication', label: 'Authentication', icon: <Shield size={12} />, color: '#3b82f6' },
            { key: 'behaviorHistory', label: 'Behavior History', icon: <TrendingUp size={12} />, color: '#22c55e' },
            { key: 'communityReputation', label: 'Community Reputation', icon: <Award size={12} />, color: '#a855f7' },
            { key: 'technicalSecurity', label: 'Technical Security', icon: <CheckCircle size={12} />, color: '#f59e0b' },
        ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield size={18} className="text-blue-400" />
                    <span className="font-semibold text-white">Trust Score</span>
                </div>
                <TrustBadge level={trustData.level} />
            </div>

            {/* Gauge */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex justify-center">
                <TrustGauge score={trustData.overall} level={trustData.level} size={140} />
            </div>

            {/* Dimensions */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs font-medium text-slate-300 mb-3">Score Dimensions</div>
                <div className="space-y-3">
                    {dimensionConfig.map((dim) => (
                        <DimensionBar
                            key={dim.key}
                            label={dim.label}
                            value={trustData.dimensions[dim.key]}
                            icon={dim.icon}
                            color={dim.color}
                        />
                    ))}
                </div>
            </div>

            {/* History */}
            {trustData.history.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs font-medium text-slate-300 mb-3">Recent Changes</div>
                    <div className="max-h-32 overflow-y-auto">
                        {trustData.history.slice(-5).reverse().map((entry, i) => (
                            <HistoryItem
                                key={i}
                                action={entry.action}
                                delta={entry.delta}
                                reason={entry.reason}
                                timestamp={entry.timestamp}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Last Updated */}
            <div className="text-center text-xs text-slate-500">
                Last updated: {new Date(trustData.lastUpdated).toLocaleString('en-US')}
            </div>
        </div>
    );
};

export default TrustScorePanel;

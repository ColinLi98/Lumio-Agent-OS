/**
 * DestinyPanel
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Collapsible panel for CommandCenter that shows DTOE insights.
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Target, RefreshCw } from 'lucide-react';
import {
    getRecommendation,
    getStateSummary,
    initializeDestinyEngine,
    type DestinyRecommendation,
    type StateSummary,
} from '../services/destinyEngine';
import type { ObjectiveWeights } from '../services/twinTypes';

// ============================================================================
// Types
// ============================================================================

interface DestinyPanelProps {
    onOpenFullCard?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const DestinyPanel: React.FC<DestinyPanelProps> = ({ onOpenFullCard }) => {
    const [expanded, setExpanded] = useState(false);
    const [recommendation, setRecommendation] = useState<DestinyRecommendation | null>(null);
    const [stateSummary, setStateSummary] = useState<StateSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            initializeDestinyEngine();
            const rec = await getRecommendation();
            const state = getStateSummary();
            setRecommendation(rec);
            setStateSummary(state);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('[DestinyPanel] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        loadData();
    };

    return (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <Target size={16} className="text-purple-400" />
                    <span className="text-sm font-medium text-slate-200">命运引擎</span>
                    {stateSummary && (
                        <span className="text-xs text-slate-500">
                            综合 {Math.round(stateSummary.overall * 100)}%
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw
                            size={14}
                            className={`text-slate-400 ${loading ? 'animate-spin' : ''}`}
                        />
                    </button>
                    {expanded ? (
                        <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-3 pb-3 border-t border-slate-700/30">
                    {loading ? (
                        <div className="py-4 text-center text-slate-500 text-sm">
                            分析中...
                        </div>
                    ) : recommendation ? (
                        <>
                            {/* Quick Stats */}
                            {stateSummary && (
                                <div className="grid grid-cols-4 gap-2 py-3">
                                    <StatCircle
                                        label="财富"
                                        value={stateSummary.wealth}
                                        color="#22c55e"
                                    />
                                    <StatCircle
                                        label="健康"
                                        value={stateSummary.health}
                                        color="#3b82f6"
                                    />
                                    <StatCircle
                                        label="精力"
                                        value={stateSummary.energy}
                                        color="#f59e0b"
                                    />
                                    <StatCircle
                                        label="压力"
                                        value={1 - stateSummary.stress}
                                        color="#a855f7"
                                    />
                                </div>
                            )}

                            {/* Recommendation Summary */}
                            <div className="bg-slate-700/30 rounded-lg p-3 mb-3">
                                <div className="text-sm font-medium text-slate-200 mb-1">
                                    {recommendation.card.title}
                                </div>
                                <div className="text-xs text-slate-400 line-clamp-2">
                                    {recommendation.card.subtitle}
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                    <span className="text-green-400">
                                        {recommendation.card.metrics.expectedGain}
                                    </span>
                                    <span style={{ color: recommendation.card.riskColor }}>
                                        {recommendation.card.metrics.riskLevel}
                                    </span>
                                    <span className="text-slate-500">
                                        置信 {recommendation.card.metrics.confidence}
                                    </span>
                                </div>
                            </div>

                            {/* View Full Button */}
                            <button
                                onClick={onOpenFullCard}
                                className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 
                                         hover:bg-purple-500/10 rounded-lg transition-colors"
                            >
                                查看详情 →
                            </button>

                            {/* Last Updated */}
                            {lastUpdated && (
                                <div className="text-xs text-slate-600 text-center mt-2">
                                    更新于 {lastUpdated.toLocaleTimeString()}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-4 text-center text-slate-500 text-sm">
                            暂无数据
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Stat Circle Component
// ============================================================================

const StatCircle: React.FC<{
    label: string;
    value: number;
    color: string;
}> = ({ label, value, color }) => {
    const percentage = Math.round(value * 100);
    const circumference = 2 * Math.PI * 18;
    const dashOffset = circumference * (1 - value);

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90">
                    <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.2)"
                        strokeWidth="3"
                    />
                    <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-slate-300">
                        {percentage}
                    </span>
                </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">{label}</span>
        </div>
    );
};

export default DestinyPanel;

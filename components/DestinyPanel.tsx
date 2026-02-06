/**
 * DestinyPanel
 * Phase 3 v0.2 DTOE: Digital Twin Optimization Engine
 * 
 * Collapsible ambient panel showing DTOE insights with live status badge.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Target, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import {
    getDestinyEngine,
    type RecommendationOutput,
    type StateSummary,
} from '../services/dtoe/destinyEngine';
import { isEvidenceFresh } from '../services/dtoe/schemaValidators';
import type { EvidencePack } from '../services/dtoe/coreSchemas';

// ============================================================================
// Types
// ============================================================================

interface DestinyPanelProps {
    entityId?: string;
    onOpenFullCard?: () => void;
    evidencePack?: EvidencePack | null;
}

// ============================================================================
// Live Status Badge
// ============================================================================

const LiveStatusBadge: React.FC<{
    isFresh: boolean;
    loading: boolean;
}> = ({ isFresh, loading }) => {
    if (loading) {
        return (
            <span className="flex items-center gap-1 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                计算中
            </span>
        );
    }

    return (
        <span className={`flex items-center gap-1 text-xs ${isFresh ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isFresh ? 'bg-emerald-400' : 'bg-amber-400'} ${isFresh ? 'animate-pulse' : ''}`} />
            {isFresh ? '实时' : '数据过期'}
        </span>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const DestinyPanel: React.FC<DestinyPanelProps> = ({
    entityId = 'default_user',
    onOpenFullCard,
    evidencePack,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [recommendation, setRecommendation] = useState<RecommendationOutput | null>(null);
    const [stateSummary, setStateSummary] = useState<StateSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isFresh, setIsFresh] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const engine = getDestinyEngine();

            const result = await engine.getRecommendation({
                entity_id: entityId,
                evidence_pack: evidencePack ?? null,
                needs_live_data: evidencePack !== undefined,
            });

            setRecommendation(result);
            const summary = engine.getStateSummary(entityId);
            setStateSummary(summary);
            setLastUpdated(new Date());

            // Check evidence freshness
            if (evidencePack) {
                setIsFresh(isEvidenceFresh(evidencePack));
            } else {
                setIsFresh(true);
            }
        } catch (e) {
            console.error('[DestinyPanel] Error:', e);
        } finally {
            setLoading(false);
        }
    }, [entityId, evidencePack]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        loadData();
    };

    // Extract relevant info from recommendation
    const bestAction = recommendation?.strategy_card?.next_best_action;
    const failureProb = recommendation?.strategy_card?.outcomes_distribution?.failure_prob ?? 0;
    const topReasons = recommendation?.explanation_card?.top_reasons ?? [];
    const topWhyNot = recommendation?.explanation_card?.why_not_explanations?.[0];
    const topSensitivity = recommendation?.explanation_card?.sensitivity?.[0];

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
                            ESS: {stateSummary.belief_ess.toFixed(0)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <LiveStatusBadge isFresh={isFresh} loading={loading} />
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
                    ) : recommendation?.success ? (
                        <>
                            {/* Stale Evidence Warning */}
                            {!isFresh && (
                                <div className="flex items-center gap-2 py-2 px-3 my-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <Clock size={14} className="text-amber-400" />
                                    <span className="text-xs text-amber-300">
                                        证据已过期，建议刷新获取最新数据
                                    </span>
                                </div>
                            )}

                            {/* Quick Stats */}
                            {stateSummary && (
                                <div className="grid grid-cols-3 gap-2 py-3">
                                    <StatItem
                                        label="置信度"
                                        value={`${Math.round(recommendation.diagnostics.explanation_valid ? 85 : 60)}%`}
                                        color="#22c55e"
                                    />
                                    <StatItem
                                        label="风险"
                                        value={`${(failureProb * 100).toFixed(0)}%`}
                                        color={failureProb > 0.2 ? "#ef4444" : "#22c55e"}
                                    />
                                    <StatItem
                                        label="证据"
                                        value={`${evidencePack?.items?.length ?? 0}条`}
                                        color="#3b82f6"
                                    />
                                </div>
                            )}

                            {/* Recommendation Summary */}
                            {bestAction && (
                                <div className="bg-slate-700/30 rounded-lg p-3 mb-3">
                                    <div className="text-sm font-medium text-slate-200 mb-1">
                                        推荐: {bestAction.summary}
                                    </div>
                                    <div className="text-xs text-slate-400 line-clamp-2">
                                        {topReasons[0]?.text ?? '基于当前状态的最优建议'}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span className={`px-2 py-0.5 rounded ${bestAction.action_type === 'do'
                                                ? 'bg-blue-500/20 text-blue-300'
                                                : bestAction.action_type === 'wait'
                                                    ? 'bg-amber-500/20 text-amber-300'
                                                    : 'bg-purple-500/20 text-purple-300'
                                            }`}>
                                            {bestAction.action_type === 'do' ? '执行' :
                                                bestAction.action_type === 'wait' ? '等待' :
                                                    bestAction.action_type === 'ask' ? '询问' : '确认'}
                                        </span>
                                        {bestAction.requires_confirmation && (
                                            <span className="text-amber-400">需确认</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Why-Not / Sensitivity (only render when data exists) */}
                            {(topWhyNot || topSensitivity) && (
                                <div className="bg-slate-700/20 rounded-lg p-3 mb-3 border border-slate-600/30">
                                    {topWhyNot && (
                                        <>
                                            <div className="text-xs text-slate-400 mb-1">备选方案</div>
                                            <div className="text-sm text-slate-200">
                                                {topWhyNot.alternative_action}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {topWhyNot.hypothetical_change}
                                            </div>
                                        </>
                                    )}
                                    {topSensitivity && (
                                        <div className={`${topWhyNot ? 'mt-2 pt-2 border-t border-slate-600/30' : ''}`}>
                                            <div className="text-xs text-slate-400">切换阈值</div>
                                            <div className="text-sm text-slate-200">
                                                {topSensitivity.parameter}: {topSensitivity.threshold_to_switch.toFixed(2)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                        <div className="py-4 text-center">
                            <AlertCircle size={20} className="mx-auto text-amber-400 mb-2" />
                            <div className="text-slate-400 text-sm">
                                {recommendation?.diagnostics?.errors?.[0] ?? '暂无数据'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Stat Item Component
// ============================================================================

const StatItem: React.FC<{
    label: string;
    value: string;
    color: string;
}> = ({ label, value, color }) => {
    return (
        <div className="flex flex-col items-center">
            <span className="text-lg font-semibold" style={{ color }}>{value}</span>
            <span className="text-[10px] text-slate-500">{label}</span>
        </div>
    );
};

export default DestinyPanel;

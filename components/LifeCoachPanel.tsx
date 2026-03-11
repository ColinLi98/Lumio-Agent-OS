/**
 * Life Coach Panel
 *
 * Design goal: professional decision-support interface.
 */

import React, { useState, useEffect } from 'react';
import {
    RefreshCw, ChevronRight, Target, Activity,
    TrendingUp, MessageCircle, ArrowRight, Clock,
    AlertCircle, CheckCircle, Zap, Send
} from 'lucide-react';
import {
    getCurrentLifeState,
    getProactiveInsights,
    getDailyWisdom,
    getTopRecommendations,
    getRecommendationForQuery,
    LifeStateDisplay,
    ProactiveInsight,
    ActionRecommendation
} from '../services/bellmanLifeService';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#0EA5E9',
    primaryMuted: 'rgba(14, 165, 233, 0.15)',
    positive: '#10B981',
    positiveMuted: 'rgba(16, 185, 129, 0.15)',
    negative: '#EF4444',
    negativeMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Types
// ============================================================================

interface LifeCoachPanelProps {
    isDark?: boolean;
}

// ============================================================================
// Sub Components
// ============================================================================

const StateBadge: React.FC<{
    label: string;
    value: number;
    color?: string;
}> = ({ label, value, color }) => {
    const getColor = () => {
        if (color) return color;
        if (value >= 70) return colors.positive;
        if (value >= 40) return colors.warning;
        return colors.negative;
    };

    return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg3 }}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: colors.text3 }}>{label}</span>
                <span className="text-sm font-mono font-semibold" style={{ color: colors.text1 }}>
                    {value}
                </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg2 }}>
                <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, backgroundColor: getColor() }}
                />
            </div>
        </div>
    );
};

const InsightCard: React.FC<{
    insight: ProactiveInsight;
}> = ({ insight }) => {
    const getPriorityStyle = () => {
        if (insight.priority >= 8) return { bg: colors.negativeMuted, border: colors.negative };
        if (insight.priority >= 5) return { bg: colors.warningMuted, border: colors.warning };
        return { bg: colors.primaryMuted, border: colors.primary };
    };
    
    const style = getPriorityStyle();

    return (
        <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: style.bg, borderLeft: `3px solid ${style.border}` }}
        >
            <div className="flex items-start gap-3">
                <AlertCircle size={16} style={{ color: style.border, marginTop: 2 }} />
                <div className="flex-1">
                    <p className="text-sm font-medium mb-1" style={{ color: colors.text1 }}>
                        {insight.message}
                    </p>
                    <p className="text-xs" style={{ color: colors.text3 }}>
                        Suggestion: {insight.suggestion}
                    </p>
                </div>
            </div>
        </div>
    );
};

const RecommendationCard: React.FC<{
    recommendation: ActionRecommendation;
    isExpanded: boolean;
    onToggle: () => void;
    onComplete: () => void;
}> = ({ recommendation, isExpanded, onToggle, onComplete }) => {
    const { action, qValue, confidence, reasoning, expectedOutcome, anxietyRelief } = recommendation;

    const getDomainLabel = (domain: string) => {
        const labels: Record<string, string> = {
            health: 'Health',
            career: 'Career',
            finance: 'Finance',
            social: 'Social',
            learning: 'Learning',
            immediate: 'Immediate',
        };
        return labels[domain] || domain;
    };

    const getTimeLabel = (horizon: string) => {
        const labels: Record<string, string> = {
            immediate: 'Now',
            short: 'Short-term',
            medium: 'Mid-term',
            long: 'Long-term',
        };
        return labels[horizon] || horizon;
    };

    return (
        <div 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-slate-800/30"
            >
                <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.primaryMuted }}
                >
                    <Target size={18} style={{ color: colors.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" style={{ color: colors.text1 }}>
                        {action.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: colors.bg3, color: colors.text3 }}
                        >
                            {getDomainLabel(action.domain)}
                        </span>
                        <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: colors.bg3, color: colors.text3 }}
                        >
                            {getTimeLabel(action.timeHorizon)}
                        </span>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="text-lg font-mono font-semibold" style={{ color: colors.positive }}>
                        {qValue.toFixed(1)}
                    </div>
                    <div className="text-xs" style={{ color: colors.text3 }}>Q-value</div>
                </div>
                <ChevronRight 
                    size={16} 
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    style={{ color: colors.text3 }}
                />
            </button>

            {isExpanded && (
                <div className="px-4 pb-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <div className="pt-4 space-y-4">
                        <p className="text-sm" style={{ color: colors.text2 }}>
                            {action.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg3 }}>
                                <div className="text-xs mb-1" style={{ color: colors.text3 }}>Confidence</div>
                                <div className="font-mono font-semibold" style={{ color: colors.text1 }}>
                                    {Math.round(confidence * 100)}%
                                </div>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg3 }}>
                                <div className="text-xs mb-1" style={{ color: colors.text3 }}>Expected gain</div>
                                <div className="font-mono font-semibold" style={{ color: colors.positive }}>
                                    +{qValue.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs mb-2" style={{ color: colors.text3 }}>Why this recommendation</div>
                            <p className="text-sm" style={{ color: colors.text2 }}>{reasoning}</p>
                        </div>

                        <div>
                            <div className="text-xs mb-2" style={{ color: colors.text3 }}>Expected outcome</div>
                            <p className="text-sm" style={{ color: colors.text2 }}>{expectedOutcome}</p>
                        </div>

                        {anxietyRelief && (
                            <div 
                                className="p-3 rounded-lg"
                                style={{ backgroundColor: colors.positiveMuted }}
                            >
                                <div className="text-xs mb-1" style={{ color: colors.positive }}>Stress support</div>
                                <p className="text-sm" style={{ color: colors.text2 }}>{anxietyRelief}</p>
                            </div>
                        )}

                        <button
                            onClick={onComplete}
                            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                            style={{ 
                                backgroundColor: colors.positiveMuted, 
                                color: colors.positive,
                                border: `1px solid ${colors.positive}30`
                            }}
                        >
                            <CheckCircle size={16} />
                            Mark as done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const LifeCoachPanel: React.FC<LifeCoachPanelProps> = ({ isDark = true }) => {
    const [lifeState, setLifeState] = useState<LifeStateDisplay | null>(null);
    const [insights, setInsights] = useState<ProactiveInsight[]>([]);
    const [wisdom, setWisdom] = useState<{ quote: string; source: string } | null>(null);
    const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([]);
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [customRecommendation, setCustomRecommendation] = useState<ActionRecommendation | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setLifeState(getCurrentLifeState());
        setInsights(getProactiveInsights());
        setWisdom(getDailyWisdom());
        setRecommendations(getTopRecommendations(3));
        setCustomRecommendation(null);
        setExpandedId(null);
    };

    const handleAskQuestion = () => {
        if (!question.trim()) return;
        setIsLoading(true);
        setTimeout(() => {
            const recommendation = getRecommendationForQuery(question);
            setCustomRecommendation(recommendation);
            setIsLoading(false);
            setQuestion('');
        }, 500);
    };

    const handleComplete = (rec: ActionRecommendation) => {
        // TODO: Persist completion state.
        setExpandedId(null);
    };

    if (!lifeState) {
        return (
            <div className="flex items-center justify-center h-64" style={{ color: colors.text3 }}>
                <RefreshCw className="animate-spin" size={24} />
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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: colors.primaryMuted }}
                        >
                            <Activity size={20} style={{ color: colors.primary }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: colors.text1 }}>
                                Life Coach
                            </h2>
                            <p className="text-xs" style={{ color: colors.text3 }}>
                                Decision advice powered by Bellman optimization
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={refreshData}
                        className="p-2 rounded-lg transition-colors hover:bg-slate-700"
                    >
                        <RefreshCw size={16} style={{ color: colors.text3 }} />
                    </button>
                </div>

                {/* State Overview */}
                <div className="grid grid-cols-4 gap-2">
                    <StateBadge label="Energy" value={lifeState.energy} />
                    <StateBadge label="Mood" value={lifeState.emotion} />
                    <StateBadge label="Finance" value={lifeState.financial} />
                    <StateBadge label="Social" value={lifeState.social} />
                </div>
            </div>

            {/* Wisdom */}
            {wisdom && (
                <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                >
                    <p className="text-sm italic mb-2" style={{ color: colors.text2 }}>
                        "{wisdom.quote}"
                    </p>
                    <p className="text-xs text-right" style={{ color: colors.text3 }}>
                        — {wisdom.source}
                    </p>
                </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider px-1" style={{ color: colors.text3 }}>
                        Insight alerts
                    </h3>
                    {insights.slice(0, 2).map((insight, idx) => (
                        <InsightCard key={idx} insight={insight} />
                    ))}
                </div>
            )}

            {/* Ask Question */}
            <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <MessageCircle size={14} style={{ color: colors.primary }} />
                    <span className="text-xs font-medium" style={{ color: colors.text3 }}>
                        Ask for guidance
                    </span>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                        placeholder="Type your question..."
                        className="flex-1 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        style={{ 
                            backgroundColor: colors.bg3, 
                            color: colors.text1,
                            border: `1px solid ${colors.border}`
                        }}
                    />
                    <button
                        onClick={handleAskQuestion}
                        disabled={isLoading || !question.trim()}
                        className="px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: colors.primary, color: '#fff' }}
                    >
                        {isLoading ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </div>
            </div>

            {/* Custom Recommendation */}
            {customRecommendation && (
                <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider px-1" style={{ color: colors.text3 }}>
                        Tailored recommendation
                    </h3>
                    <RecommendationCard
                        recommendation={customRecommendation}
                        isExpanded={expandedId === 'custom'}
                        onToggle={() => setExpandedId(expandedId === 'custom' ? null : 'custom')}
                        onComplete={() => handleComplete(customRecommendation)}
                    />
                </div>
            )}

            {/* Top Recommendations */}
            <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider px-1" style={{ color: colors.text3 }}>
                    Recommended actions
                </h3>
                {recommendations.map((rec) => (
                    <RecommendationCard
                        key={rec.action.id}
                        recommendation={rec}
                        isExpanded={expandedId === rec.action.id}
                        onToggle={() => setExpandedId(expandedId === rec.action.id ? null : rec.action.id)}
                        onComplete={() => handleComplete(rec)}
                    />
                ))}
            </div>
        </div>
    );
};

export default LifeCoachPanel;

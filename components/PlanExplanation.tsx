/**
 * Plan Explanation Component
 * Phase 2 Week 2-3: Trust layer UI
 * 
 * Shows:
 * - Trait influences (why this plan)
 * - Dimension scores (5D evaluation)
 * - Alternative approaches
 * - Feedback buttons
 */

import React, { useState, useEffect } from 'react';
import {
    getExplainerService,
    PlanExplanation,
    TraitInfluence,
    DimensionExplanation,
    Alternative,
} from '../services/explainerService';
import { Plan, Task } from '../services/taskTypes';
import {
    HelpCircle, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
    Brain, BarChart3, Lightbulb, CheckCircle2, AlertTriangle,
    TrendingUp, Clock, DollarSign, Heart, Zap
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface PlanExplanationProps {
    plan: Plan;
    task: Task;
    onFeedback?: (vote: 'up' | 'down', comment?: string) => void;
    compact?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
        case 'time_efficiency': return Clock;
        case 'financial_impact': return DollarSign;
        case 'risk_level': return AlertTriangle;
        case 'personal_growth': return TrendingUp;
        case 'relationship_impact': return Heart;
        default: return BarChart3;
    }
};

const getScoreColor = (score: number): string => {
    if (score >= 0.7) return '#10B981'; // green
    if (score >= 0.4) return '#F59E0B'; // orange
    return '#EF4444'; // red
};

const formatScore = (score: number): string => {
    return Math.round(score * 100) + '%';
};

// ============================================================================
// Sub-Components
// ============================================================================

const TraitInfluenceCard: React.FC<{ influence: TraitInfluence }> = ({ influence }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Brain size={14} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{influence.display_name}</span>
                <span
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{
                        backgroundColor: `${getScoreColor(influence.confidence)}20`,
                        color: getScoreColor(influence.confidence),
                    }}
                >
                    {formatScore(influence.confidence)}
                </span>
            </div>
            <p className="text-xs text-gray-400">{influence.influence_summary}</p>
        </div>
    </div>
);

const DimensionBar: React.FC<{ dimension: DimensionExplanation }> = ({ dimension }) => {
    const Icon = getDimensionIcon(dimension.dimension);
    const color = getScoreColor(dimension.score);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-300">
                    <Icon size={12} style={{ color }} />
                    <span>{dimension.display_name}</span>
                </div>
                <span style={{ color }}>{formatScore(dimension.score)}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${dimension.score * 100}%`,
                        backgroundColor: color,
                    }}
                />
            </div>
            <p className="text-xs text-gray-500">{dimension.explanation}</p>
        </div>
    );
};

const AlternativeCard: React.FC<{ alt: Alternative; index: number }> = ({ alt, index }) => (
    <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                {index + 1}
            </div>
            <span className="text-sm font-medium text-gray-200">{alt.title}</span>
            {alt.estimated_score && (
                <span className="ml-auto text-xs text-gray-500">
                    Est. {formatScore(alt.estimated_score)}
                </span>
            )}
        </div>
        <p className="text-xs text-gray-400 mb-2">{alt.description}</p>
        <div className="flex flex-wrap gap-1.5">
            {alt.trade_offs.map((tradeoff, i) => (
                <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400"
                >
                    {tradeoff}
                </span>
            ))}
        </div>
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const PlanExplanationPanel: React.FC<PlanExplanationProps> = ({
    plan,
    task,
    onFeedback,
    compact = false,
}) => {
    const [explanation, setExplanation] = useState<PlanExplanation | null>(null);
    const [expanded, setExpanded] = useState(!compact);
    const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

    useEffect(() => {
        const explainer = getExplainerService();
        const exp = explainer.generateExplanation(plan, task);
        setExplanation(exp);

        // Check existing feedback
        const feedback = explainer.getFeedback(plan.plan_id);
        if (feedback.length > 0) {
            setFeedbackGiven(feedback[feedback.length - 1].vote);
        }
    }, [plan, task]);

    const handleFeedback = (vote: 'up' | 'down') => {
        const explainer = getExplainerService();
        explainer.recordFeedback({ plan_id: plan.plan_id, vote });
        setFeedbackGiven(vote);
        onFeedback?.(vote);
    };

    if (!explanation) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                Generating explanation...
            </div>
        );
    }

    // Compact view
    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-left hover:bg-gray-800/70 transition-colors"
            >
                <HelpCircle size={14} className="text-indigo-400" />
                <span className="text-xs text-gray-300">Why this recommendation?</span>
                <span
                    className="ml-auto text-xs"
                    style={{ color: getScoreColor(explanation.confidence_score) }}
                >
                    Confidence {formatScore(explanation.confidence_score)}
                </span>
                <ChevronDown size={14} className="text-gray-500" />
            </button>
        );
    }

    return (
        <div className="rounded-xl bg-gray-800/50 border border-gray-700 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-gray-800 cursor-pointer"
                onClick={() => compact && setExpanded(false)}
            >
                <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-indigo-400" />
                    <span className="text-sm font-medium text-white">Explanation & Feedback</span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs"
                        style={{ color: getScoreColor(explanation.confidence_score) }}
                    >
                        Confidence {formatScore(explanation.confidence_score)}
                    </span>
                    {compact && <ChevronUp size={14} className="text-gray-500" />}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Trait Influences */}
                {explanation.trait_influences.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                            Based on Your Preferences
                        </h4>
                        <div className="space-y-2">
                            {explanation.trait_influences.slice(0, 3).map(influence => (
                                <TraitInfluenceCard key={influence.trait_id} influence={influence} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Dimension Scores */}
                {explanation.dimension_explanations.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                            5D Evaluation
                        </h4>
                        <div className="space-y-3">
                            {explanation.dimension_explanations.map(dim => (
                                <DimensionBar key={dim.dimension} dimension={dim} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Alternatives */}
                {explanation.alternatives.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                            Alternatives
                        </h4>
                        <div className="space-y-2">
                            {explanation.alternatives.map((alt, i) => (
                                <AlternativeCard key={i} alt={alt} index={i} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Feedback */}
                <div className="pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Was this recommendation helpful?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFeedback('up')}
                            disabled={feedbackGiven !== null}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${feedbackGiven === 'up'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : feedbackGiven === null
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <ThumbsUp size={14} />
                            Helpful
                        </button>
                        <button
                            onClick={() => handleFeedback('down')}
                            disabled={feedbackGiven !== null}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${feedbackGiven === 'down'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : feedbackGiven === null
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <ThumbsDown size={14} />
                            Needs Improvement
                        </button>
                    </div>
                    {feedbackGiven && (
                        <p className="mt-2 text-xs text-gray-500">
                            Thanks for the feedback. We will keep improving recommendation quality.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanExplanationPanel;

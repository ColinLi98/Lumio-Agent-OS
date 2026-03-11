import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, TrendingUp, Lightbulb, Calendar, ChevronRight } from 'lucide-react';
import { InsightReport, EnhancedDigitalAvatar, TrendData } from '../types';
import { MoodTrendChart, ActivityBarChart, ComparisonCard } from './TrendCharts';

// ============================================================================
// AI Insights Generation (Local Simulation)
// ============================================================================

/**
 * Generate insight report (local simulation, no API required).
 * In production this can connect to a Gemini API.
 */
function generateLocalInsights(avatar: EnhancedDigitalAvatar): InsightReport {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Generate insights based on current data.
    const highlights: string[] = [];
    const suggestions: string[] = [];

    // Activity analysis.
    if (avatar.totalInteractions > 50) {
        highlights.push(`🎯 You maintained strong usage habits this week with ${avatar.totalInteractions} interactions.`);
    } else if (avatar.totalInteractions > 20) {
        highlights.push(`📊 Your usage frequency is moderate with ${avatar.totalInteractions} total interactions.`);
    } else {
        highlights.push(`🌱 You are still getting familiar with Lumi, with ${avatar.totalInteractions} interactions so far.`);
    }

    // Tool usage analysis.
    if (avatar.behaviorPatterns.preferredTools.length > 0) {
        const topTool = avatar.behaviorPatterns.preferredTools[0];
        highlights.push(`🔧 Your most frequently used feature is "${topTool}".`);
    }

    // Activity time profile.
    const chronotypeText = {
        morning_person: 'You are a morning user and most active earlier in the day.',
        night_owl: 'You are a night owl and most active in late hours.',
        flexible: 'Your usage schedule is flexible without a strict time preference.'
    };
    highlights.push(`⏰ ${chronotypeText[avatar.behaviorPatterns.chronotype]}`);

    // Mood analysis.
    if (avatar.emotionalProfile.baselinePositivity > 60) {
        highlights.push('😊 You generally maintain a positive and optimistic usage state.');
    }

    // Suggestions.
    if (avatar.behaviorPatterns.chronotype === 'night_owl') {
        suggestions.push('💡 Try using Lumi in the morning. You may get better efficiency in that time window.');
    }

    if (avatar.behaviorPatterns.toolExplorationRate < 30) {
        suggestions.push('🔍 You still have many features to explore. Try "Find for Me" and "Remember for Me".');
    }

    if (avatar.communicationStyle.avgMessageLength < 20) {
        suggestions.push('✍️ Try giving more detailed prompts so the AI can respond more precisely.');
    }

    if (avatar.profileCompleteness < 50) {
        suggestions.push('📝 Continued usage helps your digital twin learn your preferences better.');
    }

    // Summary.
    const summary = generateSummary(avatar);

    return {
        id: `report-${now}`,
        generatedAt: now,
        periodStart: weekAgo,
        periodEnd: now,
        periodType: 'weekly',
        summary,
        highlights: highlights.slice(0, 4),
        suggestions: suggestions.slice(0, 3),
        personalitySnapshot: {
            openness: avatar.personality.openness,
            conscientiousness: avatar.personality.conscientiousness,
            extraversion: avatar.personality.extraversion,
            agreeableness: avatar.personality.agreeableness,
            neuroticism: avatar.personality.neuroticism,
        },
        activitySummary: {
            totalInteractions: avatar.totalInteractions,
            totalMessages: avatar.totalMessages,
            totalToolUses: avatar.totalToolUses,
            avgMoodScore: avatar.emotionalProfile.currentMoodScore,
        }
    };
}

function generateSummary(avatar: EnhancedDigitalAvatar): string {
    const style = avatar.communicationStyle.formality === 'formal' ? 'professional' :
        avatar.communicationStyle.formality === 'casual' ? 'casual' : 'adaptive';

    const activity = avatar.totalInteractions > 50 ? 'high' :
        avatar.totalInteractions > 20 ? 'steady' : 'early-stage';

    const mood = avatar.emotionalProfile.currentMood === 'positive' ? 'positive' :
        avatar.emotionalProfile.currentMood === 'negative' ? 'low' : 'stable';

    return `This week your usage activity is ${activity} and your overall mood is ${mood}. ` +
        `Your communication style is ${style}, and profile completeness reached ${avatar.profileCompleteness}%. Keep going.`;
}

// ============================================================================
// Mock Trend Data Generator
// ============================================================================

function generateMockTrendData(avatar: EnhancedDigitalAvatar, days: number = 7): {
    moodTrend: TrendData[];
    activityTrend: TrendData[];
} {
    const moodTrend: TrendData[] = [];
    const activityTrend: TrendData[] = [];

    const baselinePositivity = avatar.emotionalProfile.baselinePositivity;
    const avgActivity = Math.max(1, Math.floor(avatar.totalInteractions / days));

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);

        // Generate mood data (baseline + random variance).
        const moodValue = Math.max(-50, Math.min(50,
            (baselinePositivity - 50) + (Math.random() - 0.5) * 30
        ));
        moodTrend.push({ date: dateStr, value: moodValue, type: 'mood' });

        // Generate activity data.
        const activityValue = Math.max(0, Math.floor(
            avgActivity * (0.5 + Math.random())
        ));
        activityTrend.push({ date: dateStr, value: activityValue, type: 'activity' });
    }

    return { moodTrend, activityTrend };
}

// ============================================================================
// Avatar Insights Panel Component
// ============================================================================

interface AvatarInsightsPanelProps {
    avatar: EnhancedDigitalAvatar;
    onLog?: (message: string) => void;
}

export const AvatarInsightsPanel: React.FC<AvatarInsightsPanelProps> = ({
    avatar,
    onLog
}) => {
    const [report, setReport] = useState<InsightReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [trendData, setTrendData] = useState<{
        moodTrend: TrendData[];
        activityTrend: TrendData[];
    } | null>(null);

    // Initial load.
    useEffect(() => {
        const { moodTrend, activityTrend } = generateMockTrendData(avatar, 7);
        setTrendData({ moodTrend, activityTrend });

        // Try loading a cached report.
        try {
            const cached = localStorage.getItem('lumi_insight_report');
            if (cached) {
                const parsed = JSON.parse(cached);
                // Validate that cache is still fresh (24h).
                if (Date.now() - parsed.generatedAt < 24 * 60 * 60 * 1000) {
                    setReport(parsed);
                }
            }
        } catch (e) {
            // Ignore malformed cache.
        }
    }, [avatar]);

    // Generate report.
    const handleGenerateReport = useCallback(async () => {
        setIsGenerating(true);
        onLog?.('Generating AI insight report...');

        // Simulated model latency.
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newReport = generateLocalInsights(avatar);
        setReport(newReport);

        // Cache report.
        localStorage.setItem('lumi_insight_report', JSON.stringify(newReport));

        setIsGenerating(false);
        onLog?.('AI insight report generated.');
    }, [avatar, onLog]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={16} />
                    <span className="text-sm font-medium text-white">AI Insights</span>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {/* Report Content */}
            {report ? (
                <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-700/30">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">📊</div>
                            <div className="flex-1">
                                <div className="text-xs text-purple-400 mb-1">Weekly Summary</div>
                                <p className="text-sm text-slate-200 leading-relaxed">
                                    {report.summary}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 text-right">
                            Generated at {new Date(report.generatedAt).toLocaleString()}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-green-400" />
                            <span className="text-xs font-medium text-slate-300">Highlights</span>
                        </div>
                        <div className="space-y-2">
                            {report.highlights.map((highlight, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <ChevronRight size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>{highlight}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggestions */}
                    {report.suggestions.length > 0 && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Lightbulb size={14} className="text-yellow-400" />
                                <span className="text-xs font-medium text-slate-300">Smart Suggestions</span>
                            </div>
                            <div className="space-y-2">
                                {report.suggestions.map((suggestion, i) => (
                                    <div key={i} className="text-sm text-slate-400 bg-slate-700/30 rounded-lg p-2">
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-dashed border-slate-700">
                    <Sparkles className="mx-auto text-slate-500 mb-3" size={32} />
                    <p className="text-sm text-slate-400 mb-3">
                        Click "Generate Report" to get AI insight analysis.
                    </p>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : '✨ Generate My Insight Report'}
                    </button>
                </div>
            )}

            {/* Trend Charts */}
            {trendData && (
                <div className="grid grid-cols-1 gap-4">
                    {/* Mood Trend */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <MoodTrendChart data={trendData.moodTrend} days={7} />
                    </div>

                    {/* Activity Trend */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <ActivityBarChart data={trendData.activityTrend} maxBars={7} />
                    </div>
                </div>
            )}

            {/* Quick Stats Comparison */}
            <div className="grid grid-cols-2 gap-3">
                <ComparisonCard
                    label="Interactions This Week"
                    current={avatar.totalInteractions}
                    previous={Math.floor(avatar.totalInteractions * 0.85)}
                />
                <ComparisonCard
                    label="Mood Stability"
                    current={avatar.emotionalProfile.emotionalStability}
                    previous={avatar.emotionalProfile.emotionalStability - 5}
                    format="percent"
                />
            </div>
        </div>
    );
};

export default AvatarInsightsPanel;

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, TrendingUp, Lightbulb, Calendar, ChevronRight } from 'lucide-react';
import { InsightReport, EnhancedDigitalAvatar, TrendData } from '../types';
import { MoodTrendChart, ActivityBarChart, ComparisonCard } from './TrendCharts';

// ============================================================================
// AI Insights Generation (Local Simulation)
// ============================================================================

/**
 * 生成洞察报告（本地模拟版，无需 API）
 * 在实际应用中可以连接 Gemini API
 */
function generateLocalInsights(avatar: EnhancedDigitalAvatar): InsightReport {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 基于数据生成洞察
    const highlights: string[] = [];
    const suggestions: string[] = [];

    // 活跃度分析
    if (avatar.totalInteractions > 50) {
        highlights.push(`🎯 本周保持了稳定的使用习惯，共完成 ${avatar.totalInteractions} 次交互`);
    } else if (avatar.totalInteractions > 20) {
        highlights.push(`📊 使用频率适中，累计 ${avatar.totalInteractions} 次交互`);
    } else {
        highlights.push(`🌱 正在逐渐熟悉 Lumi，已完成 ${avatar.totalInteractions} 次交互`);
    }

    // 工具使用分析
    if (avatar.behaviorPatterns.preferredTools.length > 0) {
        const topTool = avatar.behaviorPatterns.preferredTools[0];
        highlights.push(`🔧 最常使用的功能是「${topTool}」`);
    }

    // 作息分析
    const chronotypeText = {
        morning_person: '你是早起型用户，上午时段最为活跃',
        night_owl: '你是夜猫子型用户，夜间时段较为活跃',
        flexible: '你的使用时间比较灵活，没有固定偏好'
    };
    highlights.push(`⏰ ${chronotypeText[avatar.behaviorPatterns.chronotype]}`);

    // 情绪分析
    if (avatar.emotionalProfile.baselinePositivity > 60) {
        highlights.push('😊 整体保持积极乐观的使用状态');
    }

    // 生成建议
    if (avatar.behaviorPatterns.chronotype === 'night_owl') {
        suggestions.push('💡 尝试在上午使用 Lumi，研究表明这时段效率可能更高');
    }

    if (avatar.behaviorPatterns.toolExplorationRate < 30) {
        suggestions.push('🔍 你还有很多功能未探索，试试「帮我找」和「帮我记」功能');
    }

    if (avatar.communicationStyle.avgMessageLength < 20) {
        suggestions.push('✍️ 尝试提供更详细的指令，AI 能给出更精准的回复');
    }

    if (avatar.profileCompleteness < 50) {
        suggestions.push('📝 继续使用可以让数字分身更了解你的偏好');
    }

    // 生成摘要
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
    const style = avatar.communicationStyle.formality === 'formal' ? '专业' :
        avatar.communicationStyle.formality === 'casual' ? '轻松' : '灵活';

    const activity = avatar.totalInteractions > 50 ? '活跃' :
        avatar.totalInteractions > 20 ? '稳定' : '初期';

    const mood = avatar.emotionalProfile.currentMood === 'positive' ? '积极' :
        avatar.emotionalProfile.currentMood === 'negative' ? '低落' : '平稳';

    return `本周你的使用状态${activity}，整体情绪${mood}。沟通风格偏${style}，` +
        `画像完整度达到 ${avatar.profileCompleteness}%。继续保持！`;
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

        // 生成情绪数据 (基于基线 + 随机波动)
        const moodValue = Math.max(-50, Math.min(50,
            (baselinePositivity - 50) + (Math.random() - 0.5) * 30
        ));
        moodTrend.push({ date: dateStr, value: moodValue, type: 'mood' });

        // 生成活跃度数据
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

    // 初始化加载
    useEffect(() => {
        const { moodTrend, activityTrend } = generateMockTrendData(avatar, 7);
        setTrendData({ moodTrend, activityTrend });

        // 尝试加载缓存的报告
        try {
            const cached = localStorage.getItem('lumi_insight_report');
            if (cached) {
                const parsed = JSON.parse(cached);
                // 检查是否超过24小时
                if (Date.now() - parsed.generatedAt < 24 * 60 * 60 * 1000) {
                    setReport(parsed);
                }
            }
        } catch (e) {
            // 忽略
        }
    }, [avatar]);

    // 生成报告
    const handleGenerateReport = useCallback(async () => {
        setIsGenerating(true);
        onLog?.('正在生成 AI 洞察报告...');

        // 模拟 AI 处理时间
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newReport = generateLocalInsights(avatar);
        setReport(newReport);

        // 缓存报告
        localStorage.setItem('lumi_insight_report', JSON.stringify(newReport));

        setIsGenerating(false);
        onLog?.('AI 洞察报告已生成');
    }, [avatar, onLog]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={16} />
                    <span className="text-sm font-medium text-white">AI 洞察</span>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                    {isGenerating ? '生成中...' : '生成报告'}
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
                                <div className="text-xs text-purple-400 mb-1">本周总结</div>
                                <p className="text-sm text-slate-200 leading-relaxed">
                                    {report.summary}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 text-right">
                            生成于 {new Date(report.generatedAt).toLocaleString()}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-green-400" />
                            <span className="text-xs font-medium text-slate-300">亮点发现</span>
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
                                <span className="text-xs font-medium text-slate-300">智能建议</span>
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
                        点击"生成报告"获取 AI 洞察分析
                    </p>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? '生成中...' : '✨ 生成我的洞察报告'}
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
                    label="本周交互"
                    current={avatar.totalInteractions}
                    previous={Math.floor(avatar.totalInteractions * 0.85)}
                />
                <ComparisonCard
                    label="情绪稳定性"
                    current={avatar.emotionalProfile.emotionalStability}
                    previous={avatar.emotionalProfile.emotionalStability - 5}
                    format="percent"
                />
            </div>
        </div>
    );
};

export default AvatarInsightsPanel;

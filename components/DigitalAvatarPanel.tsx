import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Activity, Clock, Tag, Sparkles, RefreshCw, Download, Trash2,
    Edit2, Check, X, MessageSquare, Wrench, Heart, Brain, Zap,
    TrendingUp, Shield, Eye, EyeOff, Award, Sun, Moon, Coffee
} from 'lucide-react';
import {
    getDigitalAvatar,
    getInteractionStats,
    resetDigitalAvatar,
    downloadDataAsJSON,
    saveDigitalAvatar,
    getEnhancedDigitalAvatar,
    saveEnhancedDigitalAvatar,
    refreshEnhancedAvatarAnalysis,
    resetEnhancedDigitalAvatar,
    togglePrivacyMode
} from '../services/localStorageService';
import { EnhancedDigitalAvatar, DigitalAvatar, PersonalityTraits } from '../types';

interface DigitalAvatarPanelProps {
    onLog?: (message: string) => void;
}

// ============================================================================
// Personality Radar Chart - 性格雷达图 (SVG)
// ============================================================================

interface RadarChartProps {
    personality: PersonalityTraits;
    size?: number;
}

const PersonalityRadarChart: React.FC<RadarChartProps> = ({ personality, size = 200 }) => {
    const center = size / 2;
    const radius = size * 0.4;

    // Big Five 五维数据
    const dimensions = [
        { key: 'openness', label: '开放性', value: personality.openness, color: '#a855f7' },
        { key: 'conscientiousness', label: '尽责性', value: personality.conscientiousness, color: '#3b82f6' },
        { key: 'extraversion', label: '外向性', value: personality.extraversion, color: '#22c55e' },
        { key: 'agreeableness', label: '宜人性', value: personality.agreeableness, color: '#f59e0b' },
        { key: 'neuroticism', label: '情绪性', value: 100 - personality.neuroticism, color: '#ef4444' }, // 反转显示为稳定性
    ];

    const angleStep = (2 * Math.PI) / dimensions.length;

    // 计算多边形顶点
    const getPoint = (value: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    // 生成数据多边形路径
    const dataPath = dimensions
        .map((d, i) => {
            const point = getPoint(d.value, i);
            return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
        })
        .join(' ') + ' Z';

    // 生成网格线
    const gridLevels = [20, 40, 60, 80, 100];

    return (
        <svg width={size} height={size} className="mx-auto">
            {/* 背景网格 */}
            {gridLevels.map((level) => (
                <polygon
                    key={level}
                    points={dimensions
                        .map((_, i) => {
                            const point = getPoint(level, i);
                            return `${point.x},${point.y}`;
                        })
                        .join(' ')}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth="1"
                />
            ))}

            {/* 轴线 */}
            {dimensions.map((_, i) => {
                const point = getPoint(100, i);
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={point.x}
                        y2={point.y}
                        stroke="rgba(148, 163, 184, 0.3)"
                        strokeWidth="1"
                    />
                );
            })}

            {/* 数据区域 */}
            <path
                d={dataPath}
                fill="rgba(139, 92, 246, 0.3)"
                stroke="rgb(139, 92, 246)"
                strokeWidth="2"
            />

            {/* 数据点 */}
            {dimensions.map((d, i) => {
                const point = getPoint(d.value, i);
                return (
                    <circle
                        key={d.key}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill={d.color}
                        stroke="white"
                        strokeWidth="1"
                    />
                );
            })}

            {/* 标签 */}
            {dimensions.map((d, i) => {
                const labelRadius = radius + 25;
                const angle = i * angleStep - Math.PI / 2;
                const x = center + labelRadius * Math.cos(angle);
                const y = center + labelRadius * Math.sin(angle);
                return (
                    <text
                        key={d.key}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs fill-slate-400"
                    >
                        {d.label}
                    </text>
                );
            })}
        </svg>
    );
};

// ============================================================================
// Activity Heatmap - 活跃时间热力图
// ============================================================================

interface HeatmapProps {
    activeHours: number[];
    activeDays: number[];
}

const ActivityHeatmap: React.FC<HeatmapProps> = ({ activeHours, activeDays }) => {
    const maxHour = Math.max(...activeHours, 1);
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    // 简化为 6 个时段
    const timeSlots = [
        { label: '凌晨', hours: [0, 1, 2, 3, 4, 5] },
        { label: '早晨', hours: [6, 7, 8, 9] },
        { label: '上午', hours: [10, 11] },
        { label: '下午', hours: [12, 13, 14, 15, 16, 17] },
        { label: '傍晚', hours: [18, 19, 20, 21] },
        { label: '深夜', hours: [22, 23] },
    ];

    const getSlotValue = (hours: number[]) => {
        return hours.reduce((sum, h) => sum + activeHours[h], 0);
    };

    const getColor = (value: number, max: number) => {
        const intensity = max > 0 ? value / max : 0;
        if (intensity === 0) return 'bg-slate-800';
        if (intensity < 0.25) return 'bg-purple-900/50';
        if (intensity < 0.5) return 'bg-purple-700/60';
        if (intensity < 0.75) return 'bg-purple-500/70';
        return 'bg-purple-400';
    };

    const maxSlot = Math.max(...timeSlots.map(s => getSlotValue(s.hours)), 1);

    return (
        <div className="space-y-2">
            {/* 时段热力图 */}
            <div className="flex gap-1">
                {timeSlots.map((slot) => {
                    const value = getSlotValue(slot.hours);
                    return (
                        <div
                            key={slot.label}
                            className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${getColor(value, maxSlot)}`}
                            title={`${slot.label}: ${value} 次`}
                        >
                            {slot.label}
                        </div>
                    );
                })}
            </div>

            {/* 星期分布 */}
            <div className="flex gap-1">
                {activeDays.map((count, i) => {
                    const maxDay = Math.max(...activeDays, 1);
                    return (
                        <div
                            key={i}
                            className={`flex-1 h-6 rounded flex items-center justify-center text-xs ${getColor(count, maxDay)}`}
                            title={`周${dayLabels[i]}: ${count} 次`}
                        >
                            {dayLabels[i]}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// Profile Completeness Ring - 画像完整度环形图
// ============================================================================

interface CompletenessRingProps {
    percentage: number;
    size?: number;
}

const CompletenessRing: React.FC<CompletenessRingProps> = ({ percentage, size = 60 }) => {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* 背景圆环 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth={strokeWidth}
                />
                {/* 进度圆环 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500"
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{percentage}%</span>
            </div>
        </div>
    );
};

// ============================================================================
// Milestone Card - 里程碑卡片
// ============================================================================

interface MilestoneListProps {
    milestones: EnhancedDigitalAvatar['milestones'];
}

const MilestoneList: React.FC<MilestoneListProps> = ({ milestones }) => {
    const recentMilestones = milestones.slice(-5).reverse();

    return (
        <div className="space-y-2">
            {recentMilestones.map((m) => (
                <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg"
                >
                    <div className="text-xl">{m.icon || '🏆'}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{m.title}</div>
                        <div className="text-xs text-slate-400">{m.description}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                        {new Date(m.timestamp).toLocaleDateString()}
                    </div>
                </div>
            ))}
            {milestones.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-4">
                    继续使用解锁成就！
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Main Panel - 主面板
// ============================================================================

export const DigitalAvatarPanel: React.FC<DigitalAvatarPanelProps> = ({ onLog }) => {
    const [avatar, setAvatar] = useState<EnhancedDigitalAvatar | null>(null);
    const [stats, setStats] = useState<ReturnType<typeof getInteractionStats> | null>(null);
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nicknameInput, setNicknameInput] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'personality' | 'behavior' | 'milestones'>('overview');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(() => {
        const avatarData = getEnhancedDigitalAvatar();
        const statsData = getInteractionStats();
        setAvatar(avatarData);
        setStats(statsData);
        setNicknameInput(avatarData.nickname || '');
    }, []);

    useEffect(() => {
        loadData();
        const handleStorage = () => loadData();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [loadData]);

    const handleSaveNickname = () => {
        if (avatar) {
            avatar.nickname = nicknameInput.trim() || undefined;
            saveEnhancedDigitalAvatar(avatar);
            setAvatar({ ...avatar });
            setIsEditingNickname(false);
            onLog?.('昵称已更新');
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        onLog?.('正在刷新画像分析...');

        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 500));
        refreshEnhancedAvatarAnalysis();
        loadData();

        setIsRefreshing(false);
        onLog?.('画像分析已刷新');
    };

    const handleReset = () => {
        if (confirm('确定要重置数字分身吗？所有交互记录和画像数据将被清空。')) {
            resetEnhancedDigitalAvatar();
            loadData();
            onLog?.('数字分身已重置');
        }
    };

    const handleExport = () => {
        downloadDataAsJSON();
        onLog?.('数据已导出为 JSON');
    };

    const handleTogglePrivacy = () => {
        if (avatar) {
            togglePrivacyMode(!avatar.privacyMode);
            loadData();
            onLog?.(avatar.privacyMode ? '隐私模式已关闭' : '隐私模式已开启');
        }
    };

    if (!avatar) {
        return (
            <div className="text-center py-8 text-gray-400">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <p>加载中...</p>
            </div>
        );
    }

    // 时段描述
    const chronotypeDesc = {
        morning_person: { icon: <Sun size={14} />, text: '早起型' },
        night_owl: { icon: <Moon size={14} />, text: '夜猫型' },
        flexible: { icon: <Coffee size={14} />, text: '灵活型' },
    };

    // 沟通风格描述
    const formalityDesc = {
        formal: '正式',
        casual: '休闲',
        adaptive: '自适应',
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-400" />
                    <span className="font-semibold text-white">增强型数字分身</span>
                    <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">v2.0</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={handleTogglePrivacy}
                        className={`p-1.5 rounded transition-colors ${avatar.privacyMode
                                ? 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                        title={avatar.privacyMode ? '隐私模式开启中' : '开启隐私模式'}
                    >
                        {avatar.privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                        title="刷新分析"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                        title="导出数据"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="重置"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-4">
                    {/* Avatar with Completeness */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {avatar.nickname ? avatar.nickname[0].toUpperCase() : '👤'}
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                            <CompletenessRing percentage={avatar.profileCompleteness} size={28} />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        {/* Nickname */}
                        <div className="flex items-center gap-2 mb-1">
                            {isEditingNickname ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={nicknameInput}
                                        onChange={(e) => setNicknameInput(e.target.value)}
                                        className="bg-slate-700 text-white px-2 py-0.5 rounded text-sm w-24"
                                        placeholder="输入昵称"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveNickname} className="text-green-400 hover:text-green-300">
                                        <Check size={14} />
                                    </button>
                                    <button onClick={() => setIsEditingNickname(false)} className="text-red-400 hover:text-red-300">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-lg font-semibold text-white">
                                        {avatar.nickname || '未设置昵称'}
                                    </span>
                                    <button
                                        onClick={() => setIsEditingNickname(true)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Stats Summary */}
                        <div className="flex items-center gap-4 text-xs text-slate-300">
                            <span className="flex items-center gap-1">
                                <Activity size={12} className="text-green-400" />
                                {avatar.totalInteractions} 次交互
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageSquare size={12} className="text-blue-400" />
                                {avatar.totalMessages} 条消息
                            </span>
                            <span className="flex items-center gap-1">
                                <Wrench size={12} className="text-yellow-400" />
                                {avatar.totalToolUses} 次工具
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
                {[
                    { key: 'overview', label: '概览', icon: <Zap size={14} /> },
                    { key: 'personality', label: '性格', icon: <Brain size={14} /> },
                    { key: 'behavior', label: '行为', icon: <TrendingUp size={14} /> },
                    { key: 'milestones', label: '成就', icon: <Award size={14} /> },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${activeTab === tab.key
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[280px]">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
                                <div className="text-2xl mb-1">
                                    {avatar.emotionalProfile.currentMood === 'positive' ? '😊' :
                                        avatar.emotionalProfile.currentMood === 'negative' ? '😔' : '😐'}
                                </div>
                                <div className="text-xs text-slate-400">当前情绪</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
                                <div className="text-2xl mb-1 flex items-center justify-center">
                                    {chronotypeDesc[avatar.behaviorPatterns.chronotype].icon}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {chronotypeDesc[avatar.behaviorPatterns.chronotype].text}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
                                <div className="text-lg font-bold text-purple-400 mb-1">
                                    {formalityDesc[avatar.communicationStyle.formality]}
                                </div>
                                <div className="text-xs text-slate-400">沟通风格</div>
                            </div>
                        </div>

                        {/* Activity Heatmap */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock size={14} className="text-orange-400" />
                                <span className="text-xs font-medium text-slate-300">活跃时段</span>
                            </div>
                            <ActivityHeatmap
                                activeHours={avatar.activeHours}
                                activeDays={avatar.activeDays}
                            />
                        </div>

                        {/* Interest Tags */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag size={14} className="text-cyan-400" />
                                <span className="text-xs font-medium text-slate-300">兴趣标签</span>
                            </div>
                            {avatar.interestTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {avatar.interestTags.slice(0, 10).map((tag) => (
                                        <span
                                            key={tag.name}
                                            className="px-2 py-0.5 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 text-xs rounded-full border border-cyan-500/30"
                                            style={{ opacity: 0.5 + tag.weight * 0.5 }}
                                        >
                                            {tag.name}
                                            <span className="ml-1 text-cyan-400/60">×{tag.occurrences}</span>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 text-center py-2">
                                    使用工具和发送消息后将自动生成标签
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Personality Tab */}
                {activeTab === 'personality' && (
                    <div className="space-y-4">
                        {/* Radar Chart */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Brain size={14} className="text-purple-400" />
                                <span className="text-xs font-medium text-slate-300">
                                    五维性格 (Big Five)
                                </span>
                                <span className="text-xs text-slate-500 ml-auto">
                                    置信度: {avatar.personality.confidence}%
                                </span>
                            </div>
                            <PersonalityRadarChart personality={avatar.personality} size={200} />
                        </div>

                        {/* Extended Traits */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="text-xs font-medium text-slate-300 mb-3">扩展特征</div>
                            <div className="space-y-2">
                                {/* 理性 vs 感性 */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-pink-400">感性</span>
                                        <span className="text-blue-400">理性</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-pink-500 to-blue-500"
                                            style={{
                                                width: `${50 + avatar.personality.rationalVsEmotional / 2}%`,
                                                marginLeft: `${Math.max(0, 50 - (50 + avatar.personality.rationalVsEmotional / 2))}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 其他扩展特征 */}
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div className="text-xs">
                                        <span className="text-slate-400">风险承受:</span>
                                        <span className="text-white ml-2">{avatar.personality.riskTolerance}%</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-slate-400">决策速度:</span>
                                        <span className="text-white ml-2">{avatar.personality.decisionSpeed}%</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-slate-400">创造力:</span>
                                        <span className="text-white ml-2">{avatar.personality.creativityIndex}%</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-slate-400">样本数:</span>
                                        <span className="text-white ml-2">{avatar.personality.sampleSize}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Communication Style */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <MessageSquare size={14} className="text-blue-400" />
                                <span className="text-xs font-medium text-slate-300">沟通风格</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">表达丰富度</div>
                                    <div className="text-white">{avatar.communicationStyle.expressiveness}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">直接程度</div>
                                    <div className="text-white">{avatar.communicationStyle.directness}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">幽默使用</div>
                                    <div className="text-white">{avatar.communicationStyle.humorUsage}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">平均字数</div>
                                    <div className="text-white">{avatar.communicationStyle.avgMessageLength} 字</div>
                                </div>
                            </div>
                            {avatar.communicationStyle.topEmojis.length > 0 && (
                                <div className="mt-2 text-xs">
                                    <span className="text-slate-400">常用 Emoji: </span>
                                    <span className="text-lg">{avatar.communicationStyle.topEmojis.join(' ')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Behavior Tab */}
                {activeTab === 'behavior' && (
                    <div className="space-y-4">
                        {/* Behavior Patterns */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp size={14} className="text-green-400" />
                                <span className="text-xs font-medium text-slate-300">行为模式</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">决策风格</div>
                                    <div className="text-white">
                                        {avatar.behaviorPatterns.decisionStyle === 'quick' ? '快速决策' :
                                            avatar.behaviorPatterns.decisionStyle === 'deliberate' ? '深思熟虑' : '混合型'}
                                    </div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">多任务倾向</div>
                                    <div className="text-white">{avatar.behaviorPatterns.multitaskingTendency}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">任务完成率</div>
                                    <div className="text-white">{avatar.behaviorPatterns.taskCompletionRate}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">专注度评分</div>
                                    <div className="text-white">{avatar.behaviorPatterns.focusScore}%</div>
                                </div>
                            </div>
                        </div>

                        {/* Preferred Tools */}
                        {avatar.behaviorPatterns.preferredTools.length > 0 && (
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={14} className="text-yellow-400" />
                                    <span className="text-xs font-medium text-slate-300">常用工具</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {avatar.behaviorPatterns.preferredTools.map((tool, i) => (
                                        <span
                                            key={tool}
                                            className={`px-2 py-0.5 text-xs rounded-full ${i === 0 ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/30' :
                                                    'bg-slate-700 text-slate-300'
                                                }`}
                                        >
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Emotional Profile */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Heart size={14} className="text-pink-400" />
                                <span className="text-xs font-medium text-slate-300">情绪画像</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">基准积极度</div>
                                    <div className="text-white">{avatar.emotionalProfile.baselinePositivity}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">情绪稳定性</div>
                                    <div className="text-white">{avatar.emotionalProfile.emotionalStability}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">压力指标</div>
                                    <div className={avatar.emotionalProfile.stressIndicators > 60 ? 'text-red-400' : 'text-white'}>
                                        {avatar.emotionalProfile.stressIndicators}%
                                    </div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2">
                                    <div className="text-slate-400 mb-1">心理韧性</div>
                                    <div className="text-white">{avatar.emotionalProfile.resilienceScore}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Milestones Tab */}
                {activeTab === 'milestones' && (
                    <div className="space-y-4">
                        {/* Streak Info */}
                        <div className="bg-gradient-to-r from-orange-900/50 to-amber-900/50 rounded-lg p-4 border border-orange-700/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-orange-400 mb-1">连续使用</div>
                                    <div className="text-2xl font-bold text-white">{avatar.currentStreak} 天</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 mb-1">最长记录</div>
                                    <div className="text-lg font-semibold text-orange-400">{avatar.longestStreak} 天</div>
                                </div>
                            </div>
                        </div>

                        {/* Milestones List */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Award size={14} className="text-amber-400" />
                                <span className="text-xs font-medium text-slate-300">成就里程碑</span>
                            </div>
                            <MilestoneList milestones={avatar.milestones} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-700">
                <span>🔒 所有数据仅保存在本地</span>
                <span className="mx-2">·</span>
                <span>创建于 {new Date(avatar.createdAt).toLocaleDateString()}</span>
                <span className="mx-2">·</span>
                <span>最后分析 {new Date(avatar.lastAnalyzedAt).toLocaleTimeString()}</span>
            </div>
        </div>
    );
};

export default DigitalAvatarPanel;

/**
 * Lumi App View - 主应用视图
 * 
 * 设计理念：专业、克制、高效
 */

import React, { useState, useEffect } from 'react';
import { SoulMatrix, PolicyConfig, DecisionMeta } from '../types';
import { ApiKeyState } from '../services/apiKeyManager';
import { getDashboardStats } from '../services/localStorageService';
import { buildApiUrl } from '../services/apiBaseUrl';
import {
    buildMarketplaceTwinContext,
    getProfileShareConsent,
    revokeProfileShareConsent,
} from '../services/digitalTwinMarketplaceBridge';
import { DigitalAvatarPanel } from './DigitalAvatarPanel';
import { PreferencePanel } from './PreferencePanel';
import { LifeCoachPanel } from './LifeCoachPanel';
import { BellmanTestPanel } from './BellmanTestPanel';
import { DestinyNavigatorPanel } from './DestinyNavigator';
import { DigitalSoulEditor } from './DigitalSoulEditor';
import { SoulMatrixPanel } from './SoulMatrixPanel';
import { MarketHome } from './MarketHome';
import { AgentMarketplacePanel } from './AgentMarketplacePanel';
import { IntentDetail } from './IntentDetail';
import { ObservabilityDashboard } from './ObservabilityDashboard';
import { DestinySimulationResult } from '../App';
import {
    Home, User, Settings, Keyboard, ChevronRight, Key,
    Compass, FlaskConical, Navigation, Activity, ArrowRight, Check,
    Zap, TrendingUp, Clock, UserCheck, X, Target, AlertCircle, CheckCircle2,
    Store, Bot, MessageSquare
} from 'lucide-react';
import { LumiChat } from './LumiChat';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#0EA5E9',
    primaryMuted: 'rgba(14, 165, 233, 0.15)',
    positive: '#10B981',
    positiveMuted: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
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

interface LumiAppViewProps {
    soul: SoulMatrix;
    policy: PolicyConfig;
    onUpdateSoul: (soul: SoulMatrix) => void;
    onUpdatePolicy: (policy: PolicyConfig) => void;
    logs: string[];
    apiKeyState: ApiKeyState;
    onApiKeyChange: (key: string) => void;
    onPersistChange: (persist: boolean) => void;
    onSaveApiKey: () => void;
    onClearApiKey: () => void;
    onOpenKeyboard: () => void;
    isDark: boolean;
    latestDecision?: DecisionMeta | null;
    destinyResult?: DestinySimulationResult | null;
    onCloseDestinyResult?: () => void;
    /** Pending query from keyboard Agent Mode to be sent to LumiChat */
    pendingAgentQuery?: string | null;
    onPendingAgentQueryConsumed?: () => void;
    /** Force-switch to chat tab */
    forceActiveTab?: string | null;
}

type AppTab = 'home' | 'chat' | 'avatar' | 'coach' | 'destiny' | 'lix_market' | 'lix_intent' | 'agent_market' | 'test' | 'settings';

// ============================================================================
// Sub Components
// ============================================================================

const MetricCard: React.FC<{
    icon: React.ReactNode;
    value: string | number;
    label: string;
    suffix?: string;
}> = ({ icon, value, label, suffix }) => (
    <div
        className="p-4 rounded-xl"
        style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
    >
        <div className="flex items-center justify-between mb-2">
            <div style={{ color: colors.primary }}>{icon}</div>
        </div>
        <div className="text-xl font-mono font-semibold" style={{ color: colors.text1 }}>
            {value}{suffix}
        </div>
        <div className="text-xs" style={{ color: colors.text3 }}>{label}</div>
    </div>
);

const ActionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    badge?: string;
}> = ({ icon, title, description, onClick, badge }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-slate-800/50"
        style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
    >
        <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.primaryMuted, color: colors.primary }}
        >
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: colors.text1 }}>{title}</span>
                {badge && (
                    <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{ backgroundColor: colors.positiveMuted, color: colors.positive }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-xs truncate" style={{ color: colors.text3 }}>{description}</p>
        </div>
        <ChevronRight size={16} style={{ color: colors.text3 }} />
    </button>
);

const TabButton: React.FC<{
    icon: React.FC<{ size?: number }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className="flex-1 flex flex-col items-center py-3 transition-colors"
        style={{ color: isActive ? colors.primary : colors.text3 }}
    >
        <Icon size={20} />
        <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
);

// ============================================================================
// Main Component
// ============================================================================

export const LumiAppView: React.FC<LumiAppViewProps> = ({
    soul,
    policy,
    onUpdateSoul,
    onUpdatePolicy,
    logs,
    apiKeyState,
    onApiKeyChange,
    onPersistChange,
    onSaveApiKey,
    onClearApiKey,
    onOpenKeyboard,
    isDark,
    latestDecision,
    destinyResult,
    onCloseDestinyResult,
    pendingAgentQuery,
    onPendingAgentQueryConsumed,
    forceActiveTab,
}) => {
    const [activeTab, setActiveTab] = useState<AppTab>('home');

    // Force-switch to chat tab when a pending agent query arrives
    useEffect(() => {
        if (forceActiveTab === 'chat') {
            setActiveTab('chat');
        }
    }, [forceActiveTab, pendingAgentQuery]);
    const [avatarSubTab, setAvatarSubTab] = useState<'profile' | 'editor' | 'matrix'>('profile');
    const [lixIntentId, setLixIntentId] = useState<string | null>(null);
    const [serpStatusLoading, setSerpStatusLoading] = useState(false);
    const [serpConfigured, setSerpConfigured] = useState<boolean | null>(null);
    const [serpKeySource, setSerpKeySource] = useState<string>('none');
    const [serpStatusError, setSerpStatusError] = useState<string | null>(null);

    // 仪表盘统计数据
    const [stats, setStats] = useState(() => getDashboardStats());

    // 定时刷新统计数据（当在首页时）
    useEffect(() => {
        if (activeTab === 'home') {
            setStats(getDashboardStats());
            const interval = setInterval(() => {
                setStats(getDashboardStats());
            }, 10000); // 每10秒刷新
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    useEffect(() => {
        let cancelled = false;
        if (activeTab !== 'settings') return;

        const loadSerpStatus = async () => {
            setSerpStatusLoading(true);
            setSerpStatusError(null);
            try {
                const resp = await fetch(buildApiUrl('/api/serpapi/status'), { method: 'GET' });
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }
                const payload = await resp.json();
                if (!cancelled) {
                    setSerpConfigured(Boolean(payload?.configured));
                    setSerpKeySource(String(payload?.source || 'none'));
                }
            } catch (error) {
                if (!cancelled) {
                    setSerpConfigured(null);
                    setSerpKeySource('none');
                    setSerpStatusError(error instanceof Error ? error.message : String(error));
                }
            } finally {
                if (!cancelled) {
                    setSerpStatusLoading(false);
                }
            }
        };

        loadSerpStatus();
        return () => {
            cancelled = true;
        };
    }, [activeTab]);

    const tabs: { id: AppTab; icon: React.FC<{ size?: number }>; label: string }[] = [
        { id: 'home', icon: Home, label: '首页' },
        { id: 'chat', icon: MessageSquare, label: '对话' },
        { id: 'lix_market', icon: Store, label: 'LIX' },
        { id: 'agent_market', icon: Bot, label: 'Agent' },
        { id: 'avatar', icon: User, label: '画像' },
        { id: 'destiny', icon: Navigation, label: '导航' },
        { id: 'settings', icon: Settings, label: '设置' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="space-y-4">
                        {/* Header */}
                        <div
                            className="rounded-xl p-5"
                            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h1 className="text-lg font-semibold" style={{ color: colors.text1 }}>
                                        Lumi
                                    </h1>
                                    <p className="text-xs" style={{ color: colors.text3 }}>
                                        人生决策优化系统
                                    </p>
                                </div>
                                <button
                                    onClick={onOpenKeyboard}
                                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                                >
                                    <Keyboard size={16} />
                                    打开键盘
                                </button>
                            </div>

                            {/* Status */}
                            <div
                                className="flex items-center gap-2 p-3 rounded-lg"
                                style={{ backgroundColor: colors.positiveMuted }}
                            >
                                <Check size={14} style={{ color: colors.positive }} />
                                <span className="text-xs" style={{ color: colors.text2 }}>
                                    系统就绪 · API {apiKeyState.status === 'valid' ? '已连接' : '未配置'}
                                </span>
                            </div>
                        </div>

                        {/* Stats - 真实数据 */}
                        <div className="grid grid-cols-2 gap-3">
                            <MetricCard
                                icon={<Zap size={18} />}
                                value={stats.todayAssists}
                                label="今日辅助"
                            />
                            <MetricCard
                                icon={<TrendingUp size={18} />}
                                value={stats.acceptanceRate}
                                suffix="%"
                                label="采纳率"
                            />
                            <MetricCard
                                icon={<Clock size={18} />}
                                value={stats.timeSavedMinutes}
                                suffix=" min"
                                label="累计节省"
                            />
                            <MetricCard
                                icon={<UserCheck size={18} />}
                                value={stats.profileCompleteness}
                                suffix="%"
                                label="画像完整度"
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium uppercase tracking-wider px-1" style={{ color: colors.text3 }}>
                                快捷入口
                            </h3>
                            <ActionCard
                                icon={<Navigation size={18} />}
                                title="命运导航"
                                description="查看你的最优人生路径"
                                onClick={() => setActiveTab('destiny')}
                            />
                            <ActionCard
                                icon={<User size={18} />}
                                title="完善数字分身"
                                description="让 AI 更懂你"
                                onClick={() => { setActiveTab('avatar'); setAvatarSubTab('editor'); }}
                            />
                            <ActionCard
                                icon={<Compass size={18} />}
                                title="人生教练"
                                description="获取个性化建议"
                                onClick={() => setActiveTab('coach')}
                            />
                            <ActionCard
                                icon={<Bot size={18} />}
                                title="Agent Marketplace"
                                description="查看候选评分、拒绝原因与 trace_id"
                                onClick={() => setActiveTab('agent_market')}
                                badge="NEW"
                            />
                        </div>

                        {/* Recent Activity */}
                        {logs.length > 0 && (
                            <div
                                className="rounded-xl p-4"
                                style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                            >
                                <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: colors.text3 }}>
                                    最近活动
                                </h3>
                                <div className="space-y-2">
                                    {logs.slice(0, 3).map((log, i) => (
                                        <div key={i} className="text-xs py-2" style={{
                                            color: colors.text2,
                                            borderBottom: i < 2 ? `1px solid ${colors.border}` : undefined
                                        }}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'chat':
                return (
                    <LumiChat
                        soul={soul}
                        apiKey={apiKeyState.key}
                        onLog={(log) => { /* propagate if needed */ }}
                        pendingQuery={pendingAgentQuery}
                        onPendingQueryConsumed={onPendingAgentQueryConsumed}
                    />
                );

            case 'avatar':
                return (
                    <div className="space-y-4">
                        {/* Sub-nav */}
                        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.bg2 }}>
                            <button
                                onClick={() => setAvatarSubTab('profile')}
                                className="flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: avatarSubTab === 'profile' ? colors.primary : 'transparent',
                                    color: avatarSubTab === 'profile' ? '#fff' : colors.text3
                                }}
                            >
                                画像概览
                            </button>
                            <button
                                onClick={() => setAvatarSubTab('matrix')}
                                className="flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: avatarSubTab === 'matrix' ? colors.primary : 'transparent',
                                    color: avatarSubTab === 'matrix' ? '#fff' : colors.text3
                                }}
                            >
                                分身认知
                            </button>
                            <button
                                onClick={() => setAvatarSubTab('editor')}
                                className="flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: avatarSubTab === 'editor' ? colors.primary : 'transparent',
                                    color: avatarSubTab === 'editor' ? '#fff' : colors.text3
                                }}
                            >
                                完善信息
                            </button>
                        </div>

                        {avatarSubTab === 'profile' && <DigitalAvatarPanel />}
                        {avatarSubTab === 'matrix' && <SoulMatrixPanel showHeader={false} />}
                        {avatarSubTab === 'editor' && <DigitalSoulEditor isDark={isDark} />}
                    </div>
                );

            case 'coach':
                return <LifeCoachPanel isDark={isDark} />;

            case 'destiny':
                return (
                    <DestinyNavigatorPanel
                        isDark={isDark}
                        onOpenLIXMarket={() => setActiveTab('lix_market')}
                    />
                );

            case 'lix_market':
                return (
                    <MarketHome
                        onSelectIntent={(intentId) => {
                            setLixIntentId(intentId);
                            setActiveTab('lix_intent');
                        }}
                    />
                );

            case 'lix_intent':
                return lixIntentId ? (
                    <IntentDetail
                        intentId={lixIntentId}
                        onBack={() => {
                            setLixIntentId(null);
                            setActiveTab('lix_market');
                        }}
                    />
                ) : (
                    <MarketHome
                        onSelectIntent={(intentId) => {
                            setLixIntentId(intentId);
                            setActiveTab('lix_intent');
                        }}
                    />
                );

            case 'agent_market': {
                const twinContext = buildMarketplaceTwinContext();
                const profileConsent = getProfileShareConsent();
                return (
                    <div className="space-y-3">
                        <div
                            className="rounded-xl p-3"
                            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-xs font-medium" style={{ color: colors.text1 }}>
                                        数字分身联动状态
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: colors.text2 }}>
                                        画像完整度 {twinContext.profile_completeness}% · 隐私模式 {twinContext.privacy_mode ? '开启' : '关闭'} · 授权状态 {profileConsent}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        revokeProfileShareConsent();
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-xs"
                                    style={{
                                        backgroundColor: colors.bg3,
                                        color: colors.text2,
                                        border: `1px solid ${colors.border}`,
                                    }}
                                >
                                    撤销画像授权
                                </button>
                            </div>
                        </div>
                        <AgentMarketplacePanel
                            onOpenLixMarket={(intentId) => {
                                setLixIntentId(intentId);
                                setActiveTab('lix_intent');
                            }}
                        />
                    </div>
                );
            }

            case 'test':
                return <BellmanTestPanel isDark={isDark} />;

            case 'settings':
                return (
                    <div className="space-y-4">
                        {/* Observability Dashboard */}
                        <ObservabilityDashboard isDark={isDark} />

                        {/* API Settings */}
                        <div
                            className="rounded-xl p-5"
                            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Key size={16} style={{ color: colors.primary }} />
                                <h3 className="text-sm font-semibold" style={{ color: colors.text1 }}>
                                    API 配置
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {/* DeepSeek API */}
                                <div>
                                    <label className="text-xs font-medium" style={{ color: colors.text3 }}>
                                        Gemini API Key
                                    </label>
                                    <div className="mt-1.5 flex gap-2">
                                        <input
                                            type="password"
                                            value={apiKeyState.key}
                                            onChange={(e) => onApiKeyChange(e.target.value)}
                                            placeholder="输入 API Key..."
                                            className="flex-1 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                                            style={{
                                                backgroundColor: colors.bg3,
                                                color: colors.text1,
                                                border: `1px solid ${colors.border}`
                                            }}
                                        />
                                        <button
                                            onClick={onSaveApiKey}
                                            className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                            style={{ backgroundColor: colors.primary, color: '#fff' }}
                                        >
                                            保存
                                        </button>
                                    </div>
                                    {apiKeyState.status === 'valid' && (
                                        <p className="text-xs mt-1.5" style={{ color: colors.positive }}>
                                            ✓ API Key 已验证
                                        </p>
                                    )}
                                    {apiKeyState.status === 'invalid' && (
                                        <p className="text-xs mt-1.5 text-red-400">
                                            ✗ {apiKeyState.error}
                                        </p>
                                    )}
                                </div>

                                {/* SerpApi */}
                                <div style={{ paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
                                    <label className="text-xs font-medium" style={{ color: colors.text3 }}>
                                        SerpApi 服务端配置状态
                                    </label>
                                    <div
                                        className="mt-1.5 rounded-lg px-3 py-2.5 text-sm"
                                        style={{
                                            backgroundColor: colors.bg3,
                                            color: colors.text1,
                                            border: `1px solid ${colors.border}`
                                        }}
                                    >
                                        {serpStatusLoading && '检查中...'}
                                        {!serpStatusLoading && serpConfigured === true && `已配置（${serpKeySource}）`}
                                        {!serpStatusLoading && serpConfigured === false && '未配置（请在服务端环境变量设置 SERPAPI_API_KEY 或 SERPAPI_KEY）'}
                                        {!serpStatusLoading && serpConfigured === null && `状态未知${serpStatusError ? `：${serpStatusError}` : ''}`}
                                    </div>
                                    <p className="text-xs mt-1.5" style={{ color: colors.text3 }}>
                                        安全策略：前端不再直接保存或发送 SerpApi Key，统一由服务端代理调用。
                                    </p>
                                </div>

                                {/* Remember */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={apiKeyState.persist}
                                        onChange={(e) => onPersistChange(e.target.checked)}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm" style={{ color: colors.text2 }}>
                                        记住 API Key (本地存储)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Preferences */}
                        <PreferencePanel />
                    </div>
                );

            default:
                return null;
        }
    };

    // 获取信号灯颜色
    const getSignalColor = (signal: string) => {
        switch (signal) {
            case 'green': return '#10B981';
            case 'yellow': return '#F59E0B';
            case 'red': return '#EF4444';
            default: return colors.primary;
        }
    };

    const getSignalIcon = (signal: string) => {
        switch (signal) {
            case 'green': return <CheckCircle2 size={24} />;
            case 'yellow': return <AlertCircle size={24} />;
            case 'red': return <X size={24} />;
            default: return <Target size={24} />;
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto flex flex-col h-full" style={{ backgroundColor: colors.bg1 }}>
            {/* 命运模拟结果弹出层 */}
            {destinyResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div
                        className="w-full max-w-md rounded-2xl overflow-hidden"
                        style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                    >
                        {/* Header */}
                        <div
                            className="px-5 py-4 flex items-center justify-between"
                            style={{
                                backgroundColor: getSignalColor(destinyResult.navigatorOutput.signal),
                                color: '#fff'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {getSignalIcon(destinyResult.navigatorOutput.signal)}
                                <div>
                                    <div className="font-semibold">命运模拟结果</div>
                                    <div className="text-xs opacity-80">{destinyResult.intentType === 'career' ? '职业决策' : '财务决策'}</div>
                                </div>
                            </div>
                            <button
                                onClick={onCloseDestinyResult}
                                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 原始问题 */}
                        <div className="px-5 py-3 border-b" style={{ borderColor: colors.border }}>
                            <div className="text-xs" style={{ color: colors.text3 }}>您的问题</div>
                            <div className="text-sm font-medium mt-1" style={{ color: colors.text1 }}>
                                "{destinyResult.query}"
                            </div>
                        </div>

                        {/* Navigator 回复 */}
                        <div className="px-5 py-4 max-h-80 overflow-y-auto">
                            <div
                                className="text-sm leading-relaxed whitespace-pre-wrap"
                                style={{ color: colors.text1 }}
                            >
                                {destinyResult.navigatorOutput.formattedResponse}
                            </div>
                        </div>

                        {/* 推荐操作 */}
                        <div
                            className="px-5 py-4 border-t"
                            style={{ borderColor: colors.border, backgroundColor: colors.bg3 }}
                        >
                            <div className="text-xs mb-3" style={{ color: colors.text3 }}>下一步建议</div>
                            <div className="space-y-2">
                                <button
                                    className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                                    onClick={onCloseDestinyResult}
                                >
                                    <CheckCircle2 size={16} />
                                    我明白了
                                </button>
                                <button
                                    className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    style={{ backgroundColor: colors.bg2, color: colors.text2, border: `1px solid ${colors.border}` }}
                                    onClick={() => {
                                        setActiveTab('coach');
                                        onCloseDestinyResult?.();
                                    }}
                                >
                                    <Compass size={16} />
                                    咨询人生教练
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
                {renderContent()}
            </div>

            {/* Tab Bar */}
            <div
                className="fixed bottom-0 left-0 right-0"
                style={{ backgroundColor: colors.bg2, borderTop: `1px solid ${colors.border}`, zIndex: 50 }}
            >
                <div className="max-w-lg mx-auto flex">
                    {tabs.map((tab) => (
                        <TabButton
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            isActive={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LumiAppView;

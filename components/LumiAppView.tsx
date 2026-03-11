/**
 * Lumi App View - Main application view
 *
 * Design intent: professional, focused, and efficient
 */

import React, { useState, useEffect } from 'react';
import { SoulMatrix, PolicyConfig, DecisionMeta } from '../types';
import { ApiKeyState } from '../services/apiKeyManager';
import { getDashboardStats } from '../services/localStorageService';
import { buildApiUrl } from '../services/apiBaseUrl';
import { revokeProfileShareConsent } from '../services/digitalTwinMarketplaceBridge';
import { DigitalAvatarPanel } from './DigitalAvatarPanel';
import { PreferencePanel } from './PreferencePanel';
import { LifeCoachPanel } from './LifeCoachPanel';
import { BellmanTestPanel } from './BellmanTestPanel';
import { DestinyNavigatorPanel } from './DestinyNavigator';
import { DigitalSoulEditor } from './DigitalSoulEditor';
import { SoulMatrixPanel } from './SoulMatrixPanel';
import { MarketHome } from './MarketHome';
import { AgentMarketplacePanel } from './AgentMarketplacePanel';
import { LixTwinFusionPanel } from './LixTwinFusionPanel';
import { IntentDetail } from './IntentDetail';
import { ObservabilityDashboard } from './ObservabilityDashboard';
import { EnvironmentTruthBanner } from './EnvironmentTruthBanner';
import { WorkspaceModeSelector } from './WorkspaceModeSelector';
import { LocalRoleLabActorSelector } from './LocalRoleLabActorSelector';
import { LocalRoleLabOverview } from './LocalRoleLabOverview';
import { RequesterInboxPanel } from './RequesterInboxPanel';
import { TenantAdminSetupPanel } from './TenantAdminSetupPanel';
import { PolicyStudioPanel } from './PolicyStudioPanel';
import { DestinySimulationResult } from '../App';
import {
    getProductShellSummary,
    listRequesterInboxItems,
    registerPilotActivationPackageHandoff,
    registerPilotConnectorEligibility,
    registerPilotEnvironmentBinding,
    registerPilotActorReadiness,
    registerPilotEvidenceArtifact,
    reviewPilotExternalArtifactIntake,
    submitPilotExternalArtifactIntake,
    type ProductShellSummary,
    type RequesterInboxSummary,
    type WorkspaceMode,
} from '../services/agentKernelShellApi';
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
    const [twinPanelRefreshSeed, setTwinPanelRefreshSeed] = useState(0);

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
    const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('current');
    const [localLabActorId, setLocalLabActorId] = useState<string>('local_tenant_admin_01');
    const [productShellSummary, setProductShellSummary] = useState<ProductShellSummary | null>(null);
    const [requesterInbox, setRequesterInbox] = useState<RequesterInboxSummary | null>(null);
    const [productShellError, setProductShellError] = useState<string | null>(null);

    const loadEnterpriseShell = React.useCallback(async () => {
        try {
            setProductShellError(null);
            const [shell, inbox] = await Promise.all([
                getProductShellSummary(workspaceMode, localLabActorId),
                listRequesterInboxItems(workspaceMode, localLabActorId),
            ]);
            setProductShellSummary(shell);
            setRequesterInbox(inbox);
        } catch (error) {
            setProductShellError(error instanceof Error ? error.message : String(error));
        }
    }, [workspaceMode, localLabActorId]);

    // Dashboard stats
    const [stats, setStats] = useState(() => getDashboardStats());

    // Refresh stats periodically while on Home tab
    useEffect(() => {
        if (activeTab === 'home') {
            setStats(getDashboardStats());
            const interval = setInterval(() => {
                setStats(getDashboardStats());
            }, 10000); // refresh every 10s
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

    useEffect(() => {
        loadEnterpriseShell().catch(() => undefined);
    }, [loadEnterpriseShell]);

    const renderEnterpriseShellHeader = () => (
        <div className="space-y-3">
            <EnvironmentTruthBanner summary={productShellSummary?.environment_activation || null} />
            <WorkspaceModeSelector
                options={productShellSummary?.environment_activation.workspace_options || [
                    {
                        mode: 'current',
                        label: 'Current workspace',
                        selected: workspaceMode === 'current',
                        workspace_binding_kind: 'UNBOUND',
                        environment_kind: 'SIMULATOR',
                        description: 'Current workspace',
                    },
                    {
                        mode: 'demo',
                        label: 'Demo workspace',
                        selected: workspaceMode === 'demo',
                        workspace_binding_kind: 'DEMO_WORKSPACE',
                        environment_kind: 'DEMO',
                        description: 'Demo workspace',
                    },
                    {
                        mode: 'local_lab',
                        label: 'Local role lab',
                        selected: workspaceMode === 'local_lab',
                        workspace_binding_kind: 'LOCAL_ROLE_LAB_WORKSPACE',
                        environment_kind: 'SIMULATOR',
                        description: 'Local role lab',
                    },
                ]}
                value={workspaceMode}
                onChange={setWorkspaceMode}
            />
            {workspaceMode === 'local_lab' && (
                <>
                    <LocalRoleLabActorSelector
                        summary={productShellSummary?.local_role_lab}
                        value={localLabActorId}
                        onChange={setLocalLabActorId}
                    />
                    <LocalRoleLabOverview summary={productShellSummary?.local_role_lab} />
                </>
            )}
            {productShellError && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                    Enterprise shell API unavailable: {productShellError}
                </div>
            )}
        </div>
    );

    const tabs: { id: AppTab; icon: React.FC<{ size?: number }>; label: string }[] = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'chat', icon: MessageSquare, label: 'Chat' },
        { id: 'lix_market', icon: Store, label: 'LIX' },
        { id: 'agent_market', icon: Bot, label: 'Agent' },
        { id: 'avatar', icon: User, label: 'Avatar' },
        { id: 'destiny', icon: Navigation, label: 'Navigator' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="space-y-4">
                        {renderEnterpriseShellHeader()}
                        <RequesterInboxPanel
                            summary={requesterInbox}
                            workspaceMode={workspaceMode}
                            onSubmitNewTask={() => setActiveTab('chat')}
                        />
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
                                        Personal Decision Optimisation
                                    </p>
                                </div>
                                <button
                                    onClick={onOpenKeyboard}
                                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                                >
                                    <Keyboard size={16} />
                                    Open Keyboard
                                </button>
                            </div>

                            {/* Status */}
                            <div
                                className="flex items-center gap-2 p-3 rounded-lg"
                                style={{ backgroundColor: colors.positiveMuted }}
                            >
                                <Check size={14} style={{ color: colors.positive }} />
                                <span className="text-xs" style={{ color: colors.text2 }}>
                                    System ready · API {apiKeyState.status === 'valid' ? 'Connected' : 'Not configured'}
                                </span>
                            </div>
                        </div>

                        {/* Stats - live data */}
                        <div className="grid grid-cols-2 gap-3">
                            <MetricCard
                                icon={<Zap size={18} />}
                                value={stats.todayAssists}
                                label="Today assists"
                            />
                            <MetricCard
                                icon={<TrendingUp size={18} />}
                                value={stats.acceptanceRate}
                                suffix="%"
                                label="Acceptance rate"
                            />
                            <MetricCard
                                icon={<Clock size={18} />}
                                value={stats.timeSavedMinutes}
                                suffix=" min"
                                label="Time saved"
                            />
                            <MetricCard
                                icon={<UserCheck size={18} />}
                                value={stats.profileCompleteness}
                                suffix="%"
                                label="Avatar completeness"
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium uppercase tracking-wider px-1" style={{ color: colors.text3 }}>
                                Quick actions
                            </h3>
                            <ActionCard
                                icon={<Navigation size={18} />}
                                title="Destiny Navigator"
                                description="Explore your optimal path"
                                onClick={() => setActiveTab('destiny')}
                            />
                            <ActionCard
                                icon={<User size={18} />}
                                title="Improve digital avatar"
                                description="Help AI understand you better"
                                onClick={() => { setActiveTab('avatar'); setAvatarSubTab('editor'); }}
                            />
                            <ActionCard
                                icon={<Compass size={18} />}
                                title="Life Coach"
                                description="Get personalised guidance"
                                onClick={() => setActiveTab('coach')}
                            />
                            <ActionCard
                                icon={<Bot size={18} />}
                                title="Agent Marketplace"
                                description="Review ranking, rejection reasons, and trace_id"
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
                                    Recent activity
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
                        {renderEnterpriseShellHeader()}
                        <PolicyStudioPanel summary={productShellSummary?.policy_studio || null} />
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
                                Overview
                            </button>
                            <button
                                onClick={() => setAvatarSubTab('matrix')}
                                className="flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: avatarSubTab === 'matrix' ? colors.primary : 'transparent',
                                    color: avatarSubTab === 'matrix' ? '#fff' : colors.text3
                                }}
                            >
                                Twin cognition
                            </button>
                            <button
                                onClick={() => setAvatarSubTab('editor')}
                                className="flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: avatarSubTab === 'editor' ? colors.primary : 'transparent',
                                    color: avatarSubTab === 'editor' ? '#fff' : colors.text3
                                }}
                            >
                                Profile setup
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
                    <div className="space-y-3">
                        <LixTwinFusionPanel
                            soul={soul}
                            onOpenLixMarket={() => setActiveTab('lix_market')}
                            onOpenAgentMarket={() => setActiveTab('agent_market')}
                            refreshSeed={twinPanelRefreshSeed}
                        />
                        <MarketHome
                            onSelectIntent={(intentId) => {
                                setLixIntentId(intentId);
                                setActiveTab('lix_intent');
                            }}
                        />
                    </div>
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
                return (
                    <div className="space-y-3">
                        <LixTwinFusionPanel
                            soul={soul}
                            variant="compact"
                            onOpenLixMarket={() => setActiveTab('lix_market')}
                            onOpenAgentMarket={() => setActiveTab('agent_market')}
                            refreshSeed={twinPanelRefreshSeed}
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    revokeProfileShareConsent();
                                    setTwinPanelRefreshSeed((value) => value + 1);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs"
                                style={{
                                    backgroundColor: colors.bg3,
                                    color: colors.text2,
                                    border: `1px solid ${colors.border}`,
                                }}
                            >
                                Revoke avatar consent
                            </button>
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
                        {renderEnterpriseShellHeader()}
                        <TenantAdminSetupPanel
                            summary={productShellSummary?.tenant_admin_setup || null}
                            productShellSummary={productShellSummary}
                            workspaceMode={workspaceMode}
                            onRegisterActivationPackageHandoff={async (input) => {
                                await registerPilotActivationPackageHandoff(input);
                                await loadEnterpriseShell();
                            }}
                            onRegisterEnvironmentBinding={async (input) => {
                                await registerPilotEnvironmentBinding(input);
                                await loadEnterpriseShell();
                            }}
                            onRegisterActor={async (input) => {
                                await registerPilotActorReadiness(input);
                                await loadEnterpriseShell();
                            }}
                            onRegisterConnectorEligibility={async (input) => {
                                await registerPilotConnectorEligibility(input);
                                await loadEnterpriseShell();
                            }}
                            onSubmitArtifactIntake={async (input) => {
                                await submitPilotExternalArtifactIntake(input);
                                await loadEnterpriseShell();
                            }}
                            onReviewArtifactIntake={async (input) => {
                                await reviewPilotExternalArtifactIntake(input);
                                await loadEnterpriseShell();
                            }}
                            onRegisterEvidence={async (input) => {
                                await registerPilotEvidenceArtifact(input);
                                await loadEnterpriseShell();
                            }}
                        />
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
                                    API settings
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
                                            placeholder="Enter API key..."
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
                                            Save
                                        </button>
                                    </div>
                                    {apiKeyState.status === 'valid' && (
                                        <p className="text-xs mt-1.5" style={{ color: colors.positive }}>
                                            ✓ API key validated
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
                                        SerpApi server status
                                    </label>
                                    <div
                                        className="mt-1.5 rounded-lg px-3 py-2.5 text-sm"
                                        style={{
                                            backgroundColor: colors.bg3,
                                            color: colors.text1,
                                            border: `1px solid ${colors.border}`
                                        }}
                                    >
                                        {serpStatusLoading && 'Checking...'}
                                        {!serpStatusLoading && serpConfigured === true && `Configured (${serpKeySource})`}
                                        {!serpStatusLoading && serpConfigured === false && 'Not configured (set SERPAPI_API_KEY or SERPAPI_KEY on server env)'}
                                        {!serpStatusLoading && serpConfigured === null && `Unknown${serpStatusError ? `: ${serpStatusError}` : ''}`}
                                    </div>
                                    <p className="text-xs mt-1.5" style={{ color: colors.text3 }}>
                                        Security policy: frontend no longer stores or sends SerpApi key directly; all calls go through server proxy.
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
                                        Remember API key (local storage)
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

    // Resolve signal color
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
            {/* Destiny simulation modal */}
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
                                    <div className="font-semibold">Destiny simulation result</div>
                                    <div className="text-xs opacity-80">{destinyResult.intentType === 'career' ? 'Career decision' : 'Financial decision'}</div>
                                </div>
                            </div>
                            <button
                                onClick={onCloseDestinyResult}
                                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Original query */}
                        <div className="px-5 py-3 border-b" style={{ borderColor: colors.border }}>
                            <div className="text-xs" style={{ color: colors.text3 }}>Your question</div>
                            <div className="text-sm font-medium mt-1" style={{ color: colors.text1 }}>
                                "{destinyResult.query}"
                            </div>
                        </div>

                        {/* Navigator response */}
                        <div className="px-5 py-4 max-h-80 overflow-y-auto">
                            <div
                                className="text-sm leading-relaxed whitespace-pre-wrap"
                                style={{ color: colors.text1 }}
                            >
                                {destinyResult.navigatorOutput.formattedResponse}
                            </div>
                        </div>

                        {/* Recommended actions */}
                        <div
                            className="px-5 py-4 border-t"
                            style={{ borderColor: colors.border, backgroundColor: colors.bg3 }}
                        >
                            <div className="text-xs mb-3" style={{ color: colors.text3 }}>Recommended next steps</div>
                            <div className="space-y-2">
                                <button
                                    className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                                    onClick={onCloseDestinyResult}
                                >
                                    <CheckCircle2 size={16} />
                                    Got it
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
                                    Ask Life Coach
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

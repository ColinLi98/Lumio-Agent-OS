/**
 * MarketHome - LIX 意图交易所 (Sci-Fi Redesign)
 * Shows intent list, publish button, and recent offers summary
 */

import React, { useEffect, useState } from 'react';
import {
    Zap, Plus, Package, Briefcase, Users,
    ChevronRight, Clock, CheckCircle, AlertCircle,
    TrendingUp, Radio, MapPin, Calendar, Github, RefreshCw, Upload
} from 'lucide-react';
import { useLIXStore, StoredIntent } from '../services/lixStore';
import type { StoredSolutionIntent } from '../services/lixStore';
import { buildApiUrl } from '../services/apiBaseUrl';
import { getCurrentUserId } from '../services/digitalTwinMarketplaceBridge';
import { MiniLineChart } from './TrendCharts';
import type { TrendData } from '../types';
import {
    techColors, TechKeyframesInjector, HexGridBackground, GradientHeading,
    GlowCard, NeonBadge, MetricBox, TechProgressBar, TechButton, TechInput,
    TechSelect, TechSectionHeader, RankBadge, PulseRing, ScanLine,
} from './TechStyles';

// ============================================================================
// Status Badge (Neon variant)
// ============================================================================

type BadgeVariant = 'cyan' | 'green' | 'purple' | 'gold' | 'red';

interface StatusBadgeProps { status: string; }

const statusConfig: Record<string, { variant: BadgeVariant; text: string; icon: React.ReactNode }> = {
    broadcasting: { variant: 'cyan', text: 'LIVE', icon: <Radio size={10} /> },
    offers_received: { variant: 'green', text: '报价已收', icon: <CheckCircle size={10} /> },
    accepted: { variant: 'green', text: '已接受', icon: <CheckCircle size={10} /> },
    offer_accepted: { variant: 'green', text: '方案确认', icon: <CheckCircle size={10} /> },
    delivery_submitted: { variant: 'purple', text: '审核中', icon: <Clock size={10} /> },
    approved: { variant: 'green', text: '已上架', icon: <CheckCircle size={10} /> },
    rejected: { variant: 'red', text: '已拒绝', icon: <AlertCircle size={10} /> },
    expired: { variant: 'gold', text: '已过期', icon: <AlertCircle size={10} /> },
    cancelled: { variant: 'red', text: '已取消', icon: <AlertCircle size={10} /> },
    draft: { variant: 'purple', text: '草稿', icon: <Clock size={10} /> },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const c = statusConfig[status] || statusConfig.draft;
    return <NeonBadge variant={c.variant}>{c.icon} {c.text}</NeonBadge>;
};

// ============================================================================
// Intent Card (Glow variant)
// ============================================================================

interface IntentCardProps { intent: StoredIntent; onClick: () => void; }

const categoryMeta: Record<string, { icon: React.ReactNode; color: string }> = {
    purchase: { icon: <Package size={18} />, color: techColors.cyan },
    job: { icon: <Briefcase size={18} />, color: techColors.purple },
    collaboration: { icon: <Users size={18} />, color: techColors.green },
};

const IntentCard: React.FC<IntentCardProps> = ({ intent, onClick }) => {
    const meta = categoryMeta[intent.category] || { icon: <Zap size={18} />, color: techColors.cyan };
    return (
        <GlowCard
            glowColor={meta.color}
            onClick={onClick}
            style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${meta.color}25, ${meta.color}08)`,
                color: meta.color,
                border: `1px solid ${meta.color}30`,
                flexShrink: 0,
            }}>
                {meta.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                        color: techColors.text1, fontSize: 14, fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {intent.item_name}
                    </span>
                    <StatusBadge status={intent.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: techColors.text3, fontFamily: 'monospace' }}>
                    {intent.budget_max && <span>¥{intent.budget_max}</span>}
                    {intent.total_offers_received > 0 && <span>{intent.total_offers_received} offers</span>}
                    {intent.best_price && (
                        <span style={{ color: techColors.green }}>best ¥{intent.best_price}</span>
                    )}
                </div>
            </div>

            <ChevronRight size={16} style={{ color: techColors.text3, flexShrink: 0 }} />
        </GlowCard>
    );
};

// ============================================================================
// Solution Intent Card (Glow variant)
// ============================================================================

interface SolutionIntentCardProps { intent: StoredSolutionIntent; onClick: () => void; }

const SolutionIntentCard: React.FC<SolutionIntentCardProps> = ({ intent, onClick }) => (
    <GlowCard
        glowColor={techColors.purple}
        onClick={onClick}
        style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
    >
        <div style={{
            width: 40, height: 40, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${techColors.purple}25, ${techColors.purple}08)`,
            color: techColors.purple,
            border: `1px solid ${techColors.purple}30`,
            flexShrink: 0,
        }}>
            <Zap size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                    color: techColors.text1, fontSize: 14, fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {intent.title}
                </span>
                <StatusBadge status={intent.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: techColors.text3, fontFamily: 'monospace' }}>
                <span>{intent.domain}</span>
                <span>{intent.offers.length} solutions</span>
                <span>
                    {intent.requester_type === 'agent'
                        ? `⚡ ${intent.requester_agent_name || intent.requester_agent_id || 'agent'}`
                        : '👤 user'}
                </span>
            </div>
        </div>

        <ChevronRight size={16} style={{ color: techColors.text3, flexShrink: 0 }} />
    </GlowCard>
);

// ============================================================================
// Publish Intent Modal (Glassmorphism)
// ============================================================================

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (params: {
        category: 'purchase' | 'job' | 'collaboration';
        item: string;
        budget?: number;
        locationCode?: string;
        deadline?: string;
    }) => void;
}

const CITY_CODES = [
    { value: 'beijing', label: '北京' },
    { value: 'shanghai', label: '上海' },
    { value: 'guangzhou', label: '广州' },
    { value: 'shenzhen', label: '深圳' },
    { value: 'hangzhou', label: '杭州' },
    { value: 'chengdu', label: '成都' },
    { value: 'wuhan', label: '武汉' },
    { value: 'nanjing', label: '南京' },
    { value: 'all', label: '全国' },
];

const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, onPublish }) => {
    const [category, setCategory] = useState<'purchase' | 'job' | 'collaboration'>('purchase');
    const [item, setItem] = useState('');
    const [budget, setBudget] = useState('');
    const [locationCode, setLocationCode] = useState('all');
    const [deadline, setDeadline] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    if (!isOpen) return null;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const handlePublish = async () => {
        if (!item.trim()) return;
        setIsPublishing(true);
        await onPublish({
            category,
            item,
            budget: budget ? parseInt(budget) : undefined,
            locationCode: locationCode !== 'all' ? locationCode : undefined,
            deadline: deadline || undefined
        });
        setIsPublishing(false);
        setItem('');
        setBudget('');
        setLocationCode('all');
        setDeadline('');
        onClose();
    };

    const categories = [
        { id: 'purchase' as const, icon: <Package size={20} />, label: '购买', color: techColors.cyan },
        { id: 'job' as const, icon: <Briefcase size={20} />, label: '求职', color: techColors.purple },
        { id: 'collaboration' as const, icon: <Users size={20} />, label: '合作', color: techColors.green },
    ];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                width: '100%',
                background: `linear-gradient(180deg, ${techColors.bg1} 0%, ${techColors.bg0} 100%)`,
                borderRadius: '24px 24px 0 0',
                padding: 24,
                border: `1px solid ${techColors.border}`,
                borderBottom: 'none',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <GradientHeading size={18}>发布意图</GradientHeading>
                    <button
                        onClick={onClose}
                        style={{
                            color: techColors.text3, background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: 13, fontFamily: 'monospace',
                        }}
                    >
                        [ESC]
                    </button>
                </div>

                {/* Category Selection */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCategory(c.id)}
                            style={{
                                flex: 1, padding: '14px 8px', borderRadius: 12,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                background: category === c.id ? `${c.color}15` : techColors.bgCard,
                                border: `1px solid ${category === c.id ? `${c.color}50` : techColors.border}`,
                                color: category === c.id ? c.color : techColors.text3,
                                cursor: 'pointer',
                                boxShadow: category === c.id ? `0 0 16px ${c.color}20` : 'none',
                                transition: 'all 0.3s',
                            }}
                        >
                            {c.icon}
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
                        </button>
                    ))}
                </div>

                <TechInput
                    value={item}
                    onChange={setItem}
                    placeholder="描述你的需求，例如：iPhone 16 Pro Max 256G"
                    style={{ marginBottom: 12 }}
                />

                <TechInput
                    value={budget}
                    onChange={setBudget}
                    type="number"
                    placeholder="预算上限（可选）"
                    style={{ marginBottom: 12 }}
                />

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: techColors.text3, fontSize: 11, fontFamily: 'monospace' }}>
                            <MapPin size={11} /> <span>LOCATION</span>
                        </div>
                        <TechSelect
                            value={locationCode}
                            onChange={setLocationCode}
                            options={CITY_CODES}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: techColors.text3, fontSize: 11, fontFamily: 'monospace' }}>
                            <Calendar size={11} /> <span>DEADLINE</span>
                        </div>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            min={minDate}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                backgroundColor: 'rgba(6,10,20,0.8)',
                                border: `1px solid ${techColors.border}`,
                                color: techColors.text1, fontSize: 13, cursor: 'pointer',
                            }}
                        />
                    </div>
                </div>

                <TechButton
                    onClick={handlePublish}
                    disabled={!item.trim() || isPublishing}
                    icon={isPublishing ? undefined : <Radio size={18} />}
                    fullWidth
                >
                    {isPublishing ? '广播中...' : '广播到市场'}
                </TechButton>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface MarketHomeProps { onSelectIntent: (intentId: string) => void; }

interface RevenueSummary {
    owner_id: string;
    total_revenue_cny: number;
    total_usage_count: number;
    active_agents: number;
}

interface LeaderboardRow {
    rank: number;
    agent_id: string;
    agent_name: string;
    owner_id?: string;
    hotness_score: number;
    revenue_7d: number;
    success_rate_7d: number;
    usage_7d: number;
    sparkline: number[];
}

export function toSparklineTrendData(values: number[]): TrendData[] {
    const base = new Date();
    const normalized = Array.isArray(values) && values.length > 0 ? values : [0];
    return normalized.map((value, idx) => {
        const date = new Date(base.getTime() - (normalized.length - idx - 1) * 24 * 3600 * 1000);
        return {
            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            value: Number.isFinite(value) ? Number(value) : 0,
        };
    });
}

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectIntent }) => {
    const { intents, solutionIntents, metrics, broadcastIntent } = useLIXStore();
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
    const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const [githubRepos, setGithubRepos] = useState<Array<{ full_name: string; private: boolean }>>([]);
    const [githubRepoLoading, setGithubRepoLoading] = useState(false);
    const [selectedGithubRepo, setSelectedGithubRepo] = useState('');
    const [manifestPath, setManifestPath] = useState('.lix/agent.manifest.json');
    const [githubImporting, setGithubImporting] = useState(false);
    const userId = getCurrentUserId();

    const handlePublish = async (params: {
        category: 'purchase' | 'job' | 'collaboration';
        item: string;
        budget?: number;
        locationCode?: string;
        deadline?: string;
    }) => {
        const result = await broadcastIntent({
            category: params.category,
            item: params.item,
            budget: params.budget,
            specs: {
                ...(params.locationCode && { location_code: params.locationCode }),
                ...(params.deadline && { deadline: params.deadline })
            }
        });
        onSelectIntent(result.intent_id);
    };

    useEffect(() => {
        const loadRevenueSummary = async () => {
            try {
                const response = await fetch(buildApiUrl(`/api/lix/solution/my-agents?owner_id=${encodeURIComponent(userId)}`));
                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload?.success) return;
                if (!payload?.revenue_summary) return;
                setRevenueSummary({
                    owner_id: String(payload.revenue_summary.owner_id || userId),
                    total_revenue_cny: Number(payload.revenue_summary.total_revenue_cny || 0),
                    total_usage_count: Number(payload.revenue_summary.total_usage_count || 0),
                    active_agents: Number(payload.revenue_summary.active_agents || 0),
                });
            } catch { /* ignore */ }
        };
        loadRevenueSummary();
    }, [solutionIntents.length, intents.length, userId]);

    useEffect(() => {
        const loadLeaderboard = async () => {
            setLeaderboardLoading(true);
            try {
                const response = await fetch(buildApiUrl('/api/agent-market/leaderboard?window=7d&sort=commercial&limit=8'));
                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload?.success || !Array.isArray(payload?.rankings)) {
                    setLeaderboardRows([]);
                    return;
                }
                const rows = payload.rankings
                    .map((row: any) => ({
                        rank: Number(row?.rank || 0),
                        agent_id: String(row?.agent_id || ''),
                        agent_name: String(row?.agent_name || row?.agent_id || ''),
                        owner_id: row?.owner_id ? String(row.owner_id) : undefined,
                        hotness_score: Number(row?.hotness_score || 0),
                        revenue_7d: Number(row?.revenue_7d || 0),
                        success_rate_7d: Number(row?.success_rate_7d || 0),
                        usage_7d: Number(row?.usage_7d || 0),
                        sparkline: Array.isArray(row?.sparkline)
                            ? row.sparkline.map((v: any) => Number(v || 0))
                            : [],
                    }))
                    .filter((row: LeaderboardRow) => row.agent_id);
                setLeaderboardRows(rows);
            } catch {
                setLeaderboardRows([]);
            } finally {
                setLeaderboardLoading(false);
            }
        };
        loadLeaderboard();
    }, [solutionIntents.length, intents.length]);

    const myLeaderboardRows = leaderboardRows.filter((row) => row.owner_id === userId);

    const refreshGithubRepos = async () => {
        setGithubRepoLoading(true);
        try {
            const response = await fetch(buildApiUrl(`/api/agent-market/github/repos?user_id=${encodeURIComponent(userId)}`));
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
                setGithubRepos([]); setGithubConnected(false); return;
            }
            setGithubConnected(Boolean(payload?.connected));
            const repos = Array.isArray(payload?.repos)
                ? payload.repos.map((repo: any) => ({
                    full_name: String(repo?.full_name || ''),
                    private: Boolean(repo?.private),
                })).filter((repo: { full_name: string }) => Boolean(repo.full_name))
                : [];
            setGithubRepos(repos);
            if (!selectedGithubRepo && repos.length > 0) setSelectedGithubRepo(repos[0].full_name);
        } catch {
            setGithubRepos([]); setGithubConnected(false);
        } finally {
            setGithubRepoLoading(false);
        }
    };

    const connectGithub = async () => {
        setGithubRepoLoading(true);
        try {
            const connectResp = await fetch(buildApiUrl(`/api/agent-market/github/connect?user_id=${encodeURIComponent(userId)}`));
            const connectPayload = await connectResp.json().catch(() => null);
            if (!connectResp.ok || !connectPayload?.success) return;
            const connectUrl = String(connectPayload?.connect_url || '');
            const state = String(connectPayload?.state || '');
            if (connectUrl.startsWith('mock://')) {
                await fetch(buildApiUrl(`/api/agent-market/github/callback?user_id=${encodeURIComponent(userId)}&state=${encodeURIComponent(state)}`));
                setGithubConnected(true);
                await refreshGithubRepos();
                return;
            }
            if (typeof window !== 'undefined' && /^https?:\/\//i.test(connectUrl)) {
                window.open(connectUrl, '_blank', 'noopener,noreferrer');
            }
        } finally {
            setGithubRepoLoading(false);
        }
    };

    const importGithubRepo = async () => {
        const repo = selectedGithubRepo.trim();
        if (!repo) return;
        setGithubImporting(true);
        try {
            const response = await fetch(buildApiUrl('/api/agent-market/github/import'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, owner_id: userId, repo,
                    manifest_path: manifestPath.trim() || '.lix/agent.manifest.json',
                    delivery_mode_preference: 'hybrid',
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) return;
            await refreshGithubRepos();
        } finally { setGithubImporting(false); }
    };

    useEffect(() => {
        refreshGithubRepos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    return (
        <HexGridBackground style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <TechKeyframesInjector />

            {/* ── Hero Header ── */}
            <div style={{
                padding: '20px 16px',
                background: `linear-gradient(135deg, rgba(0,234,255,0.08) 0%, rgba(168,85,247,0.06) 50%, transparent 100%)`,
                borderRadius: 16,
                marginBottom: 16,
                border: `1px solid ${techColors.border}`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative scan line */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${techColors.cyan}, transparent)`,
                    animation: 'techShimmer 3s linear infinite',
                    backgroundSize: '200% 100%',
                }} />

                <GradientHeading
                    size={22}
                    icon={<Zap size={26} color={techColors.cyan} />}
                    subtitle="AI Agent Marketplace · Intent Trading Protocol"
                >
                    LIX 意图交易所
                </GradientHeading>

                {/* Metrics Row */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <MetricBox
                        label="意图广播"
                        value={metrics.total_intents_broadcast}
                        icon={<Radio size={16} color={techColors.cyan} />}
                        accent={techColors.cyan}
                    />
                    <MetricBox
                        label="报价收到"
                        value={metrics.total_offers_received}
                        icon={<CheckCircle size={16} color={techColors.green} />}
                        accent={techColors.green}
                    />
                    <MetricBox
                        label="平均响应"
                        value={`${metrics.avg_first_offer_seconds.toFixed(1)}s`}
                        icon={<Clock size={16} color={techColors.purple} />}
                        accent={techColors.purple}
                    />
                    <MetricBox
                        label={`收益 (${revenueSummary?.active_agents || 0})`}
                        value={`¥${Math.round(revenueSummary?.total_revenue_cny || 0)}`}
                        icon={<TrendingUp size={16} color={techColors.gold} />}
                        accent={techColors.gold}
                    />
                </div>
            </div>

            {/* ── Agent Leaderboard ── */}
            <GlowCard glowColor={techColors.gold} style={{ marginBottom: 14 }}>
                <TechSectionHeader
                    title="Agent 热度榜"
                    icon={<TrendingUp size={16} />}
                    accent={techColors.gold}
                    extra={
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: techColors.text3 }}>
                            7D · COMMERCIAL
                        </span>
                    }
                />
                <ScanLine color={techColors.gold} />

                {leaderboardLoading && (
                    <div style={{ color: techColors.text3, fontSize: 12, fontFamily: 'monospace', padding: '8px 0' }}>
                        ⟳ 加载排行榜中...
                    </div>
                )}
                {!leaderboardLoading && leaderboardRows.length === 0 && (
                    <div style={{ color: techColors.text3, fontSize: 12, padding: '12px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>📊</div>
                        暂无榜单数据，先去 Agent Marketplace 执行任务即可生成
                    </div>
                )}
                {!leaderboardLoading && leaderboardRows.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {leaderboardRows.slice(0, 5).map((row) => (
                            <div
                                key={row.agent_id}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${techColors.border}`,
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <RankBadge rank={row.rank} />
                                        <span style={{ color: techColors.text1, fontSize: 13, fontWeight: 600 }}>
                                            {row.agent_name}
                                        </span>
                                    </div>
                                    <span style={{
                                        color: techColors.gold, fontSize: 12, fontWeight: 700,
                                        fontFamily: 'monospace',
                                        textShadow: `0 0 8px ${techColors.goldGlow}`,
                                    }}>
                                        {row.hotness_score.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 16, color: techColors.text3, fontSize: 10, marginBottom: 6, fontFamily: 'monospace' }}>
                                    <span>¥{Math.round(row.revenue_7d)}</span>
                                    <span>{row.usage_7d} uses</span>
                                    <span>{(row.success_rate_7d * 100).toFixed(0)}% win</span>
                                </div>
                                <TechProgressBar
                                    value={row.success_rate_7d}
                                    color={row.owner_id === userId ? techColors.green : techColors.purple}
                                    height={4}
                                    showPercent={false}
                                />
                                <div style={{ marginTop: 6 }}>
                                    <MiniLineChart
                                        data={toSparklineTrendData(row.sparkline)}
                                        width={240}
                                        height={40}
                                        color={row.owner_id === userId ? techColors.green : techColors.gold}
                                        showDots={false}
                                        showArea
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {myLeaderboardRows.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${techColors.border}`, color: techColors.text2, fontSize: 12 }}>
                        <NeonBadge variant="green" size="sm">我的 Agent 上榜: {myLeaderboardRows.length}</NeonBadge>
                    </div>
                )}
            </GlowCard>

            {/* ── GitHub Import ── */}
            <GlowCard glowColor={techColors.text3} style={{ marginBottom: 14 }}>
                <TechSectionHeader
                    title="GitHub 导入 Agent"
                    icon={<Github size={16} />}
                    accent={techColors.text2}
                    extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <PulseRing color={githubConnected ? techColors.green : techColors.red} size={8} active={githubConnected} />
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: githubConnected ? techColors.green : techColors.text3 }}>
                                {githubConnected ? 'CONNECTED' : 'OFFLINE'}
                            </span>
                        </div>
                    }
                />
                <div style={{ color: techColors.text3, fontSize: 11, marginBottom: 10, fontFamily: 'monospace' }}>
                    支持从仓库读取 .lix/agent.manifest.json，导入后参与 Marketplace 调用与收益统计
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <TechButton
                        variant="secondary"
                        onClick={connectGithub}
                        disabled={githubRepoLoading}
                        icon={<Github size={14} />}
                    >
                        {githubConnected ? '已连接' : '连接 GitHub'}
                    </TechButton>
                    <TechButton
                        variant="ghost"
                        onClick={refreshGithubRepos}
                        disabled={githubRepoLoading}
                        icon={<RefreshCw size={14} />}
                    >
                        刷新仓库
                    </TechButton>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <TechSelect
                        value={selectedGithubRepo}
                        onChange={setSelectedGithubRepo}
                        options={
                            githubRepos.length === 0
                                ? [{ value: '', label: '暂无可用仓库' }]
                                : githubRepos.map(r => ({
                                    value: r.full_name,
                                    label: `${r.full_name}${r.private ? ' 🔒' : ''}`,
                                }))
                        }
                        style={{ flex: 1, minWidth: 160 }}
                    />
                    <TechInput
                        value={manifestPath}
                        onChange={setManifestPath}
                        placeholder=".lix/agent.manifest.json"
                        style={{ flex: 1, minWidth: 160, fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <TechButton
                        variant="secondary"
                        onClick={importGithubRepo}
                        disabled={!selectedGithubRepo || githubImporting}
                        icon={<Upload size={14} />}
                    >
                        {githubImporting ? '导入中...' : '导入上架'}
                    </TechButton>
                </div>
            </GlowCard>

            {/* ── Publish Intent CTA ── */}
            <TechButton
                onClick={() => setShowPublishModal(true)}
                icon={<Plus size={20} />}
                fullWidth
                style={{ marginBottom: 20 }}
            >
                发布意图
            </TechButton>

            {/* ── Intent List ── */}
            <div style={{ flex: 1 }}>
                <div style={{
                    color: techColors.text3, fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    marginBottom: 12, fontFamily: 'monospace',
                }}>
                    我的意图 ({intents.length})
                </div>

                {intents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: techColors.text3 }}>
                        <Zap size={40} style={{ opacity: 0.15, marginBottom: 12, color: techColors.cyan }} />
                        <p style={{ fontSize: 13, margin: '0 0 4px 0' }}>还没有意图</p>
                        <p style={{ fontSize: 11, margin: 0, fontFamily: 'monospace' }}>点击上方发布按钮创建第一个需求</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {intents.map(intent => (
                            <IntentCard key={intent.intent_id} intent={intent} onClick={() => onSelectIntent(intent.intent_id)} />
                        ))}
                    </div>
                )}

                <div style={{
                    color: techColors.text3, fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    marginTop: 20, marginBottom: 12, fontFamily: 'monospace',
                }}>
                    专家交付需求 ({solutionIntents.length})
                </div>
                <div style={{
                    marginBottom: 10, padding: '8px 12px', borderRadius: 8,
                    backgroundColor: `${techColors.cyan}08`,
                    border: `1px solid ${techColors.cyan}18`,
                    color: techColors.text2, fontSize: 11, fontFamily: 'monospace',
                }}>
                    审核通过后将自动同步到 Agent Marketplace
                </div>
                {solutionIntents.length === 0 ? (
                    <div style={{ color: techColors.text3, fontSize: 12, paddingBottom: 20 }}>
                        暂无专家交付需求。可从 Agent Marketplace 在"结果不足"时一键发布。
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
                        {solutionIntents.map((intent) => (
                            <SolutionIntentCard key={intent.intent_id} intent={intent} onClick={() => onSelectIntent(intent.intent_id)} />
                        ))}
                    </div>
                )}
            </div>

            <PublishModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onPublish={handlePublish}
            />
        </HexGridBackground>
    );
};

export default MarketHome;

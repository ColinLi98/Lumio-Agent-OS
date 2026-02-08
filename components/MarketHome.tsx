/**
 * MarketHome - LIX Market Entry Screen
 * Shows intent list, publish button, and recent offers summary
 */

import React, { useEffect, useState } from 'react';
import {
    Zap, Plus, Package, Briefcase, Users,
    ChevronRight, Clock, CheckCircle, AlertCircle,
    TrendingUp, Radio, MapPin, Calendar
} from 'lucide-react';
import { useLIXStore, StoredIntent } from '../services/lixStore';
import type { StoredSolutionIntent } from '../services/lixStore';
import { buildApiUrl } from '../services/apiBaseUrl';
import { getCurrentUserId } from '../services/digitalTwinMarketplaceBridge';
import { MiniLineChart } from './TrendCharts';
import type { TrendData } from '../types';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#a78bfa',
    primaryMuted: 'rgba(167, 139, 250, 0.15)',
    positive: '#34d399',
    positiveMuted: 'rgba(52, 211, 153, 0.15)',
    warning: '#fbbf24',
    warningMuted: 'rgba(251, 191, 36, 0.15)',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Sub Components
// ============================================================================

interface StatusBadgeProps {
    status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config: Record<string, { bg: string; color: string; text: string; icon: React.ReactNode }> = {
        broadcasting: { bg: colors.primaryMuted, color: colors.primary, text: '广播中', icon: <Radio size={12} /> },
        offers_received: { bg: colors.positiveMuted, color: colors.positive, text: '已收到报价', icon: <CheckCircle size={12} /> },
        accepted: { bg: colors.positiveMuted, color: colors.positive, text: '已接受', icon: <CheckCircle size={12} /> },
        offer_accepted: { bg: colors.positiveMuted, color: colors.positive, text: '方案已接受', icon: <CheckCircle size={12} /> },
        delivery_submitted: { bg: colors.primaryMuted, color: colors.primary, text: '待审核', icon: <Clock size={12} /> },
        approved: { bg: colors.positiveMuted, color: colors.positive, text: '已上架', icon: <CheckCircle size={12} /> },
        rejected: { bg: colors.warningMuted, color: colors.warning, text: '已拒绝', icon: <AlertCircle size={12} /> },
        expired: { bg: colors.warningMuted, color: colors.warning, text: '已过期', icon: <AlertCircle size={12} /> },
        cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', text: '已取消', icon: <AlertCircle size={12} /> },
        draft: { bg: colors.bg3, color: colors.text3, text: '草稿', icon: <Clock size={12} /> }
    };

    const c = config[status] || config.draft;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: c.bg,
            color: c.color
        }}>
            {c.icon}
            {c.text}
        </span>
    );
};

interface IntentCardProps {
    intent: StoredIntent;
    onClick: () => void;
}

const IntentCard: React.FC<IntentCardProps> = ({ intent, onClick }) => {
    const categoryIcons: Record<string, React.ReactNode> = {
        purchase: <Package size={18} />,
        job: <Briefcase size={18} />,
        collaboration: <Users size={18} />
    };

    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.bg2,
                border: `1px solid ${colors.border}`,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primaryMuted,
                color: colors.primary,
                flexShrink: 0
            }}>
                {categoryIcons[intent.category] || <Zap size={18} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                        color: colors.text1,
                        fontSize: 14,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {intent.item_name}
                    </span>
                    <StatusBadge status={intent.status} />
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12,
                    color: colors.text3
                }}>
                    {intent.budget_max && (
                        <span>预算: ¥{intent.budget_max}</span>
                    )}
                    {intent.total_offers_received > 0 && (
                        <span>{intent.total_offers_received} 个报价</span>
                    )}
                    {intent.best_price && (
                        <span style={{ color: colors.positive }}>
                            最低 ¥{intent.best_price}
                        </span>
                    )}
                </div>
            </div>

            <ChevronRight size={16} style={{ color: colors.text3, flexShrink: 0 }} />
        </button>
    );
};

interface SolutionIntentCardProps {
    intent: StoredSolutionIntent;
    onClick: () => void;
}

const SolutionIntentCard: React.FC<SolutionIntentCardProps> = ({ intent, onClick }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 12,
            backgroundColor: colors.bg2,
            border: `1px solid ${colors.border}`,
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}
    >
        <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryMuted,
            color: colors.primary,
            flexShrink: 0
        }}>
            <Zap size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                    color: colors.text1,
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {intent.title}
                </span>
                <StatusBadge status={intent.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: colors.text3 }}>
                <span>domain: {intent.domain}</span>
                <span>{intent.offers.length} 个专家方案</span>
                <span>
                    {intent.requester_type === 'agent'
                        ? `agent: ${intent.requester_agent_name || intent.requester_agent_id || 'unknown'}`
                        : 'user'}
                </span>
            </div>
        </div>

        <ChevronRight size={16} style={{ color: colors.text3, flexShrink: 0 }} />
    </button>
);

// ============================================================================
// Publish Intent Modal
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

// Common city codes
const CITY_CODES = [
    { code: 'beijing', label: '北京' },
    { code: 'shanghai', label: '上海' },
    { code: 'guangzhou', label: '广州' },
    { code: 'shenzhen', label: '深圳' },
    { code: 'hangzhou', label: '杭州' },
    { code: 'chengdu', label: '成都' },
    { code: 'wuhan', label: '武汉' },
    { code: 'nanjing', label: '南京' },
    { code: 'all', label: '全国' },
];

const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, onPublish }) => {
    const [category, setCategory] = useState<'purchase' | 'job' | 'collaboration'>('purchase');
    const [item, setItem] = useState('');
    const [budget, setBudget] = useState('');
    const [locationCode, setLocationCode] = useState('all');
    const [deadline, setDeadline] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    if (!isOpen) return null;

    // Get tomorrow as min date for deadline
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
        { id: 'purchase' as const, icon: <Package size={20} />, label: '购买' },
        { id: 'job' as const, icon: <Briefcase size={20} />, label: '求职' },
        { id: 'collaboration' as const, icon: <Users size={20} />, label: '合作' }
    ];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
            <div style={{
                width: '100%',
                backgroundColor: colors.bg1,
                borderRadius: '20px 20px 0 0',
                padding: 20
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20
                }}>
                    <h2 style={{ color: colors.text1, fontSize: 18, fontWeight: 600 }}>
                        发布意图
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ color: colors.text3, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        取消
                    </button>
                </div>

                {/* Category Selection */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCategory(c.id)}
                            style={{
                                flex: 1,
                                padding: '12px 8px',
                                borderRadius: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: category === c.id ? colors.primaryMuted : colors.bg2,
                                border: `1px solid ${category === c.id ? colors.primary : colors.border}`,
                                color: category === c.id ? colors.primary : colors.text3,
                                cursor: 'pointer'
                            }}
                        >
                            {c.icon}
                            <span style={{ fontSize: 12 }}>{c.label}</span>
                        </button>
                    ))}
                </div>

                {/* Item Input */}
                <input
                    type="text"
                    value={item}
                    onChange={e => setItem(e.target.value)}
                    placeholder="描述你的需求，例如：iPhone 16 Pro Max 256G"
                    style={{
                        width: '100%',
                        padding: 14,
                        borderRadius: 12,
                        backgroundColor: colors.bg2,
                        border: `1px solid ${colors.border}`,
                        color: colors.text1,
                        fontSize: 14,
                        marginBottom: 12
                    }}
                />

                {/* Budget Input */}
                <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="预算上限（可选）"
                    style={{
                        width: '100%',
                        padding: 14,
                        borderRadius: 12,
                        backgroundColor: colors.bg2,
                        border: `1px solid ${colors.border}`,
                        color: colors.text1,
                        fontSize: 14,
                        marginBottom: 12
                    }}
                />

                {/* Location and Deadline Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {/* Location Select */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 6,
                            color: colors.text3,
                            fontSize: 12
                        }}>
                            <MapPin size={12} />
                            <span>所在地区</span>
                        </div>
                        <select
                            value={locationCode}
                            onChange={e => setLocationCode(e.target.value)}
                            style={{
                                width: '100%',
                                padding: 12,
                                borderRadius: 10,
                                backgroundColor: colors.bg2,
                                border: `1px solid ${colors.border}`,
                                color: colors.text1,
                                fontSize: 14,
                                cursor: 'pointer'
                            }}
                        >
                            {CITY_CODES.map(city => (
                                <option key={city.code} value={city.code}>
                                    {city.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Deadline Picker */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 6,
                            color: colors.text3,
                            fontSize: 12
                        }}>
                            <Calendar size={12} />
                            <span>截止日期</span>
                        </div>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            min={minDate}
                            style={{
                                width: '100%',
                                padding: 12,
                                borderRadius: 10,
                                backgroundColor: colors.bg2,
                                border: `1px solid ${colors.border}`,
                                color: colors.text1,
                                fontSize: 14,
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>

                {/* Publish Button */}
                <button
                    onClick={handlePublish}
                    disabled={!item.trim() || isPublishing}
                    style={{
                        width: '100%',
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: item.trim() ? colors.primary : colors.bg3,
                        color: item.trim() ? '#fff' : colors.text3,
                        fontSize: 16,
                        fontWeight: 600,
                        border: 'none',
                        cursor: item.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}
                >
                    {isPublishing ? (
                        <>广播中...</>
                    ) : (
                        <>
                            <Radio size={18} />
                            广播到市场
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface MarketHomeProps {
    onSelectIntent: (intentId: string) => void;
}

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
            } catch {
                // Ignore summary fetch failures; main page should remain usable.
            }
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
                setGithubRepos([]);
                setGithubConnected(false);
                return;
            }
            setGithubConnected(Boolean(payload?.connected));
            const repos = Array.isArray(payload?.repos)
                ? payload.repos.map((repo: any) => ({
                    full_name: String(repo?.full_name || ''),
                    private: Boolean(repo?.private),
                })).filter((repo: { full_name: string }) => Boolean(repo.full_name))
                : [];
            setGithubRepos(repos);
            if (!selectedGithubRepo && repos.length > 0) {
                setSelectedGithubRepo(repos[0].full_name);
            }
        } catch {
            setGithubRepos([]);
            setGithubConnected(false);
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
                    user_id: userId,
                    owner_id: userId,
                    repo,
                    manifest_path: manifestPath.trim() || '.lix/agent.manifest.json',
                    delivery_mode_preference: 'hybrid',
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) return;
            await refreshGithubRepos();
        } finally {
            setGithubImporting(false);
        }
    };

    useEffect(() => {
        refreshGithubRepos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 16,
                background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.bg1} 100%)`,
                borderRadius: 16,
                marginBottom: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Zap size={24} color={colors.primary} />
                    <h1 style={{ color: colors.text1, fontSize: 20, fontWeight: 700, margin: 0 }}>
                        LIX 意图交易
                    </h1>
                </div>
                <p style={{ color: colors.text3, fontSize: 13, margin: 0 }}>
                    发布需求，获取全网最优报价
                </p>

                {/* Metrics */}
                <div style={{
                    display: 'flex',
                    gap: 16,
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: 10
                }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ color: colors.text1, fontSize: 20, fontWeight: 700 }}>
                            {metrics.total_intents_broadcast}
                        </div>
                        <div style={{ color: colors.text3, fontSize: 11 }}>意图广播</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ color: colors.text1, fontSize: 20, fontWeight: 700 }}>
                            {metrics.total_offers_received}
                        </div>
                        <div style={{ color: colors.text3, fontSize: 11 }}>报价收到</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ color: colors.positive, fontSize: 20, fontWeight: 700 }}>
                            {metrics.avg_first_offer_seconds.toFixed(1)}s
                        </div>
                        <div style={{ color: colors.text3, fontSize: 11 }}>平均响应</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ color: colors.warning, fontSize: 20, fontWeight: 700 }}>
                            ¥{Math.round(revenueSummary?.total_revenue_cny || 0)}
                        </div>
                        <div style={{ color: colors.text3, fontSize: 11 }}>
                            Agent 收益 ({revenueSummary?.active_agents || 0})
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.bg2,
                    border: `1px solid ${colors.border}`,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TrendingUp size={16} color={colors.warning} />
                    <div style={{ color: colors.text1, fontSize: 14, fontWeight: 700 }}>
                        Agent 热度榜（商业转化优先）
                    </div>
                </div>
                <div style={{ color: colors.text3, fontSize: 11, marginBottom: 10 }}>
                    指标窗口：7天 · 排序：commercial · 数据源：Marketplace usage/revenue
                </div>
                {leaderboardLoading && (
                    <div style={{ color: colors.text3, fontSize: 12 }}>加载排行榜中...</div>
                )}
                {!leaderboardLoading && leaderboardRows.length === 0 && (
                    <div style={{ color: colors.text3, fontSize: 12 }}>
                        暂无榜单数据，先去 Agent Marketplace 执行几次任务即可生成。
                    </div>
                )}
                {!leaderboardLoading && leaderboardRows.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {leaderboardRows.slice(0, 5).map((row) => (
                            <div
                                key={row.agent_id}
                                style={{
                                    padding: 10,
                                    borderRadius: 10,
                                    backgroundColor: colors.bg1,
                                    border: `1px solid ${colors.border}`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ color: colors.text1, fontSize: 13, fontWeight: 600 }}>
                                        #{row.rank} {row.agent_name}
                                    </div>
                                    <div style={{ color: colors.warning, fontSize: 12, fontWeight: 700 }}>
                                        热度 {row.hotness_score.toFixed(2)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, color: colors.text3, fontSize: 11, marginBottom: 6, flexWrap: 'wrap' }}>
                                    <span>7天收益 ¥{Math.round(row.revenue_7d)}</span>
                                    <span>使用 {row.usage_7d}</span>
                                    <span>成功率 {(row.success_rate_7d * 100).toFixed(0)}%</span>
                                </div>
                                <MiniLineChart
                                    data={toSparklineTrendData(row.sparkline)}
                                    width={240}
                                    height={54}
                                    color={row.owner_id === userId ? '#34d399' : '#a78bfa'}
                                    showDots={false}
                                    showArea
                                />
                            </div>
                        ))}
                    </div>
                )}
                {myLeaderboardRows.length > 0 && (
                    <div
                        style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: `1px dashed ${colors.border}`,
                            color: colors.text2,
                            fontSize: 12,
                        }}
                    >
                        我的 Agent 上榜: {myLeaderboardRows.length} 个
                    </div>
                )}
            </div>

            <div
                style={{
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.bg2,
                    border: `1px solid ${colors.border}`,
                }}
            >
                <div style={{ color: colors.text1, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                    GitHub 导入 Agent
                </div>
                <div style={{ color: colors.text3, fontSize: 11, marginBottom: 10 }}>
                    支持从仓库读取 `.lix/agent.manifest.json`，导入后可进入 Marketplace 被调用并参与收益统计。
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <button
                        onClick={connectGithub}
                        disabled={githubRepoLoading}
                        style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: githubConnected ? colors.positiveMuted : colors.primaryMuted,
                            border: `1px solid ${githubConnected ? colors.positive : colors.primary}`,
                            color: githubConnected ? colors.positive : colors.primary,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: githubRepoLoading ? 'default' : 'pointer',
                        }}
                    >
                        {githubConnected ? 'GitHub 已连接' : '连接 GitHub'}
                    </button>
                    <button
                        onClick={refreshGithubRepos}
                        disabled={githubRepoLoading}
                        style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: colors.bg1,
                            border: `1px solid ${colors.border}`,
                            color: colors.text2,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: githubRepoLoading ? 'default' : 'pointer',
                        }}
                    >
                        刷新仓库
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                        value={selectedGithubRepo}
                        onChange={(event) => setSelectedGithubRepo(event.target.value)}
                        style={{
                            flex: 1,
                            minWidth: 180,
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: colors.bg1,
                            border: `1px solid ${colors.border}`,
                            color: colors.text1,
                            fontSize: 12,
                        }}
                    >
                        {githubRepos.length === 0 && <option value="">暂无可用仓库</option>}
                        {githubRepos.map((repo) => (
                            <option key={repo.full_name} value={repo.full_name}>
                                {repo.full_name}{repo.private ? ' (private)' : ''}
                            </option>
                        ))}
                    </select>
                    <input
                        value={manifestPath}
                        onChange={(event) => setManifestPath(event.target.value)}
                        style={{
                            flex: 1,
                            minWidth: 180,
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: colors.bg1,
                            border: `1px solid ${colors.border}`,
                            color: colors.text2,
                            fontSize: 12,
                        }}
                        placeholder=".lix/agent.manifest.json"
                    />
                    <button
                        onClick={importGithubRepo}
                        disabled={!selectedGithubRepo || githubImporting}
                        style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: colors.primary,
                            border: 'none',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: (!selectedGithubRepo || githubImporting) ? 'default' : 'pointer',
                            opacity: (!selectedGithubRepo || githubImporting) ? 0.65 : 1,
                        }}
                    >
                        {githubImporting ? '导入中...' : '导入并上架'}
                    </button>
                </div>
            </div>

            {/* Publish Button */}
            <button
                onClick={() => setShowPublishModal(true)}
                style={{
                    width: '100%',
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 20
                }}
            >
                <Plus size={20} />
                发布意图
            </button>

            {/* Intent List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h3 style={{
                    color: colors.text3,
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    marginBottom: 12
                }}>
                    我的意图 ({intents.length})
                </h3>

                {intents.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 40,
                        color: colors.text3,
                        fontSize: 14
                    }}>
                        <Zap size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p>还没有意图</p>
                        <p style={{ fontSize: 12 }}>点击上方按钮发布你的第一个需求</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {intents.map(intent => (
                            <IntentCard
                                key={intent.intent_id}
                                intent={intent}
                                onClick={() => onSelectIntent(intent.intent_id)}
                            />
                        ))}
                    </div>
                )}

                <h3 style={{
                    color: colors.text3,
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    marginTop: 18,
                    marginBottom: 12
                }}>
                    专家交付需求 ({solutionIntents.length})
                </h3>
                <div
                    style={{
                        marginBottom: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(14, 165, 233, 0.08)',
                        border: `1px solid rgba(14, 165, 233, 0.22)`,
                        color: colors.text2,
                        fontSize: 11,
                    }}
                >
                    审核通过后将自动同步到 Agent Marketplace 的“我的 Agent（分身同步）”，可与市场 Agent 多选协作执行。
                </div>
                {solutionIntents.length === 0 ? (
                    <div style={{ color: colors.text3, fontSize: 12, paddingBottom: 20 }}>
                        暂无专家交付需求。你可以从 Agent Marketplace 在“结果不足”时一键发布。
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
                        {solutionIntents.map((intent) => (
                            <SolutionIntentCard
                                key={intent.intent_id}
                                intent={intent}
                                onClick={() => onSelectIntent(intent.intent_id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Publish Modal */}
            <PublishModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onPublish={handlePublish}
            />
        </div>
    );
};

export default MarketHome;

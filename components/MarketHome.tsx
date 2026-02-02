/**
 * MarketHome - LIX Market Entry Screen
 * Shows intent list, publish button, and recent offers summary
 */

import React, { useState } from 'react';
import {
    Zap, Plus, Package, Briefcase, Users,
    ChevronRight, Clock, CheckCircle, AlertCircle,
    TrendingUp, Radio, MapPin, Calendar
} from 'lucide-react';
import { useLIXStore, StoredIntent } from '../services/lixStore';

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
    status: StoredIntent['status'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config: Record<string, { bg: string; color: string; text: string; icon: React.ReactNode }> = {
        broadcasting: { bg: colors.primaryMuted, color: colors.primary, text: '广播中', icon: <Radio size={12} /> },
        offers_received: { bg: colors.positiveMuted, color: colors.positive, text: '已收到报价', icon: <CheckCircle size={12} /> },
        accepted: { bg: colors.positiveMuted, color: colors.positive, text: '已接受', icon: <CheckCircle size={12} /> },
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

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectIntent }) => {
    const { intents, metrics, broadcastIntent } = useLIXStore();
    const [showPublishModal, setShowPublishModal] = useState(false);

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

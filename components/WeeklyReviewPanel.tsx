/**
 * Weekly Review Panel - Phase 2 Week 3-2
 * 
 * Dashboard showing weekly progress: completion rate, satisfaction,
 * category breakdown, and insights.
 */

import React from 'react';
import {
    Calendar,
    CheckCircle,
    XCircle,
    Star,
    Clock,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    ChevronRight,
    PieChart,
    Lightbulb,
    User,
} from 'lucide-react';
import {
    getWeeklyReviewService,
    WeeklyReview,
    CategoryBreakdown,
    SoulTraitChange,
} from '../services/weeklyReviewService';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    bg1: 'rgba(30, 30, 45, 0.95)',
    bg2: 'rgba(45, 45, 65, 0.6)',
    bg3: 'rgba(60, 60, 80, 0.4)',
    border: 'rgba(255, 255, 255, 0.1)',
    text1: '#ffffff',
    text2: 'rgba(255, 255, 255, 0.85)',
    text3: 'rgba(255, 255, 255, 0.6)',
    primary: '#6366f1',
    primaryMuted: 'rgba(99, 102, 241, 0.15)',
    positive: '#22c55e',
    positiveMuted: 'rgba(34, 197, 94, 0.15)',
    negative: '#ef4444',
    negativeMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
};

// ============================================================================
// Component Props
// ============================================================================

interface WeeklyReviewPanelProps {
    onClose?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const WeeklyReviewPanel: React.FC<WeeklyReviewPanelProps> = ({
    onClose,
}) => {
    const [review, setReview] = React.useState<WeeklyReview | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadReview();
    }, []);

    const loadReview = async () => {
        setLoading(true);
        try {
            const currentReview = getWeeklyReviewService().getCurrentWeekReview();
            setReview(currentReview);
        } catch (error) {
            console.error('[WeeklyReviewPanel] Load failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        const freshReview = getWeeklyReviewService().generateWeeklyReview();
        setReview(freshReview);
    };

    if (loading) {
        return (
            <div style={{
                background: colors.bg1,
                borderRadius: 16,
                padding: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.text3,
            }}>
                加载中...
            </div>
        );
    }

    if (!review) {
        return (
            <div style={{
                background: colors.bg1,
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                color: colors.text3,
            }}>
                本周暂无数据
            </div>
        );
    }

    const weekStartDate = new Date(review.week_start);
    const weekEndDate = new Date(review.week_end);
    const formatDate = (d: Date) =>
        `${d.getMonth() + 1}月${d.getDate()}日`;

    return (
        <div style={{
            background: colors.bg1,
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${colors.border}`,
            width: '100%',
            maxWidth: 480,
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={20} color={colors.primary} />
                    <div>
                        <h3 style={{
                            color: colors.text1,
                            fontSize: 16,
                            fontWeight: 600,
                            margin: 0,
                        }}>
                            周回顾
                        </h3>
                        <p style={{
                            color: colors.text3,
                            fontSize: 12,
                            margin: '2px 0 0 0',
                        }}>
                            {formatDate(weekStartDate)} - {formatDate(weekEndDate)}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        padding: 8,
                        color: colors.text3,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = colors.bg2;
                        e.currentTarget.style.color = colors.text1;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = colors.text3;
                    }}
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 20,
            }}>
                <StatCard
                    icon={<CheckCircle size={16} />}
                    label="完成任务"
                    value={review.summary.tasks_completed}
                    color={colors.positive}
                />
                <StatCard
                    icon={<XCircle size={16} />}
                    label="失败任务"
                    value={review.summary.tasks_failed}
                    color={colors.negative}
                />
                <StatCard
                    icon={<Star size={16} />}
                    label="满意度"
                    value={`${review.summary.avg_satisfaction}/5`}
                    color={colors.warning}
                />
            </div>

            {/* Completion Rate Ring */}
            <div style={{
                background: colors.bg2,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
            }}>
                <CompletionRing rate={review.summary.completion_rate} size={80} />
                <div style={{ flex: 1 }}>
                    <div style={{ color: colors.text1, fontSize: 14, fontWeight: 500 }}>
                        完成率
                    </div>
                    <div style={{ color: colors.text3, fontSize: 12, marginTop: 4 }}>
                        创建 {review.summary.tasks_created} 个任务，
                        完成 {review.summary.tasks_completed} 个
                    </div>
                    {review.comparison && (
                        <TrendBadge comparison={review.comparison} />
                    )}
                </div>
            </div>

            {/* Category Breakdown */}
            {review.category_breakdown.length > 0 && (
                <div style={{
                    background: colors.bg2,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        <PieChart size={16} color={colors.primary} />
                        <span style={{ color: colors.text1, fontSize: 14, fontWeight: 500 }}>
                            类别分布
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {review.category_breakdown.slice(0, 4).map((cat) => (
                            <CategoryBar key={cat.category} category={cat} />
                        ))}
                    </div>
                </div>
            )}

            {/* Insights */}
            {review.insights.length > 0 && (
                <div style={{
                    background: colors.bg2,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        <Lightbulb size={16} color={colors.warning} />
                        <span style={{ color: colors.text1, fontSize: 14, fontWeight: 500 }}>
                            本周洞察
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {review.insights.map((insight, i) => (
                            <div
                                key={i}
                                style={{
                                    color: colors.text2,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                }}
                            >
                                {insight}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Soul Updates */}
            {review.soul_updates.length > 0 && (
                <div style={{
                    background: colors.primaryMuted,
                    borderRadius: 12,
                    padding: 16,
                    border: `1px solid ${colors.primary}30`,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        <User size={16} color={colors.primary} />
                        <span style={{ color: colors.text1, fontSize: 14, fontWeight: 500 }}>
                            Soul Matrix 更新
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {review.soul_updates.map((update, i) => (
                            <SoulUpdateRow key={i} update={update} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
    <div style={{
        background: colors.bg2,
        borderRadius: 10,
        padding: 12,
        textAlign: 'center',
    }}>
        <div style={{ color, marginBottom: 6 }}>{icon}</div>
        <div style={{ color: colors.text1, fontSize: 18, fontWeight: 600 }}>
            {value}
        </div>
        <div style={{ color: colors.text3, fontSize: 11 }}>{label}</div>
    </div>
);

interface CompletionRingProps {
    rate: number;
    size: number;
}

const CompletionRing: React.FC<CompletionRingProps> = ({ rate, size }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (rate / 100) * circumference;

    const getColor = () => {
        if (rate >= 80) return colors.positive;
        if (rate >= 50) return colors.warning;
        return colors.negative;
    };

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.bg3}
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.text1,
                fontSize: 18,
                fontWeight: 600,
            }}>
                {rate}%
            </div>
        </div>
    );
};

interface TrendBadgeProps {
    comparison: NonNullable<WeeklyReview['comparison']>;
}

const TrendBadge: React.FC<TrendBadgeProps> = ({ comparison }) => {
    const { trend, completion_rate_delta } = comparison;

    const config = {
        improving: {
            icon: <TrendingUp size={12} />,
            color: colors.positive,
            bg: colors.positiveMuted,
            label: `上升 ${Math.abs(completion_rate_delta)}%`,
        },
        declining: {
            icon: <TrendingDown size={12} />,
            color: colors.negative,
            bg: colors.negativeMuted,
            label: `下降 ${Math.abs(completion_rate_delta)}%`,
        },
        stable: {
            icon: <Minus size={12} />,
            color: colors.text3,
            bg: colors.bg3,
            label: '持平',
        },
    };

    const { icon, color, bg, label } = config[trend];

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: bg,
            color,
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            marginTop: 8,
        }}>
            {icon}
            比上周{label}
        </div>
    );
};

interface CategoryBarProps {
    category: CategoryBreakdown;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ category }) => {
    const maxCount = 10; // Normalize to max 10 for display
    const width = Math.min((category.count / maxCount) * 100, 100);

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
            }}>
                <span style={{ color: colors.text2, fontSize: 12 }}>
                    {category.category}
                </span>
                <span style={{ color: colors.text3, fontSize: 11 }}>
                    {category.count} 个 · {category.success_rate}% 成功
                </span>
            </div>
            <div style={{
                height: 6,
                background: colors.bg3,
                borderRadius: 3,
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: `${width}%`,
                    background: colors.primary,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </div>
    );
};

interface SoulUpdateRowProps {
    update: SoulTraitChange;
}

const SoulUpdateRow: React.FC<SoulUpdateRowProps> = ({ update }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    }}>
        <ChevronRight size={14} color={colors.primary} />
        <span style={{ color: colors.text2, fontSize: 13 }}>
            <strong>{update.trait_key}</strong>: {String(update.new_value)}
        </span>
        {update.confidence_delta > 0 && (
            <span style={{
                color: colors.positive,
                fontSize: 11,
                background: colors.positiveMuted,
                padding: '2px 6px',
                borderRadius: 4,
            }}>
                +{Math.round(update.confidence_delta * 100)}%
            </span>
        )}
    </div>
);

export default WeeklyReviewPanel;

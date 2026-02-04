/**
 * DestinyRecommendationCard
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Displays Bellman MPC recommendation with risk metrics and alternatives.
 */

import React, { useState, useEffect } from 'react';
import {
    getRecommendation,
    getStateSummary,
    initializeDestinyEngine,
    type DestinyRecommendation,
    type StateSummary,
} from '../services/destinyEngine';
import type { ObjectiveWeights } from '../services/twinTypes';

// ============================================================================
// Types
// ============================================================================

interface DestinyRecommendationCardProps {
    weights?: ObjectiveWeights;
    onActionSelect?: (actionType: string) => void;
    compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const DestinyRecommendationCard: React.FC<DestinyRecommendationCardProps> = ({
    weights,
    onActionSelect,
    compact = false,
}) => {
    const [recommendation, setRecommendation] = useState<DestinyRecommendation | null>(null);
    const [stateSummary, setStateSummary] = useState<StateSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRecommendation();
    }, [weights]);

    const loadRecommendation = async () => {
        try {
            setLoading(true);
            setError(null);

            initializeDestinyEngine();
            const rec = await getRecommendation(weights);
            const state = getStateSummary();

            setRecommendation(rec);
            setStateSummary(state);
        } catch (e) {
            console.error('[DestinyCard] Error:', e);
            setError('计算建议时出错');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner} />
                    <span style={styles.loadingText}>分析最优策略...</span>
                </div>
            </div>
        );
    }

    if (error || !recommendation) {
        return (
            <div style={styles.container}>
                <div style={styles.errorText}>{error || '无法获取建议'}</div>
            </div>
        );
    }

    const { card, narrative, result } = recommendation;

    if (compact) {
        return (
            <div style={styles.compactContainer}>
                <div style={styles.compactHeader}>
                    <span style={styles.compactIcon}>🎯</span>
                    <span style={styles.compactTitle}>{card.title}</span>
                </div>
                <div style={styles.compactMetric}>
                    <span>预期收益 {card.metrics.expectedGain}</span>
                    <span style={{ color: card.riskColor }}>• {card.metrics.riskLevel}</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.icon}>🎯</span>
                    <span style={styles.title}>命运引擎建议</span>
                </div>
                <div style={{
                    ...styles.confidenceBadge,
                    background: result.confidence > 0.7 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                    color: result.confidence > 0.7 ? '#22c55e' : '#fbbf24',
                }}>
                    置信度 {card.metrics.confidence}
                </div>
            </div>

            {/* Main Recommendation */}
            <div style={styles.mainCard}>
                <div style={styles.mainTitle}>{card.title}</div>
                <div style={styles.subtitle}>{card.subtitle}</div>

                {/* Metrics Row */}
                <div style={styles.metricsRow}>
                    <div style={styles.metric}>
                        <div style={styles.metricValue}>{card.metrics.expectedGain}</div>
                        <div style={styles.metricLabel}>预期收益</div>
                    </div>
                    <div style={styles.metric}>
                        <div style={{ ...styles.metricValue, color: card.riskColor }}>
                            {card.metrics.riskLevel}
                        </div>
                        <div style={styles.metricLabel}>风险等级</div>
                    </div>
                    <div style={styles.metric}>
                        <div style={styles.metricValue}>{card.metrics.confidence}</div>
                        <div style={styles.metricLabel}>置信度</div>
                    </div>
                </div>
            </div>

            {/* Key Points */}
            {card.points.length > 0 && (
                <div style={styles.pointsSection}>
                    {card.points.map((point, idx) => (
                        <div key={idx} style={styles.point}>
                            <span style={styles.pointBullet}>•</span>
                            <span>{point}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* State Overview */}
            {stateSummary && (
                <div style={styles.stateSection}>
                    <div style={styles.sectionTitle}>当前状态</div>
                    <div style={styles.stateGrid}>
                        <StateBar label="财富" value={stateSummary.wealth} color="#22c55e" />
                        <StateBar label="健康" value={stateSummary.health} color="#3b82f6" />
                        <StateBar label="精力" value={stateSummary.energy} color="#f59e0b" />
                        <StateBar label="压力" value={stateSummary.stress} color="#ef4444" inverted />
                    </div>
                </div>
            )}

            {/* Alternatives */}
            {card.alternatives.length > 0 && (
                <div style={styles.alternativesSection}>
                    <div style={styles.sectionTitle}>备选方案</div>
                    {card.alternatives.map((alt, idx) => (
                        <div
                            key={idx}
                            style={styles.alternative}
                            onClick={() => onActionSelect?.(alt.label)}
                        >
                            <span style={styles.altLabel}>{alt.label}</span>
                            <span style={styles.altReason}>{alt.reason}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Narrative */}
            <div style={styles.narrativeSection}>
                <div style={styles.narrative}>{narrative}</div>
            </div>

            {/* Action Button */}
            <button
                style={styles.actionButton}
                onClick={() => onActionSelect?.(result.best_action.type)}
            >
                采纳建议
            </button>
        </div>
    );
};

// ============================================================================
// State Bar Component
// ============================================================================

const StateBar: React.FC<{
    label: string;
    value: number;
    color: string;
    inverted?: boolean;
}> = ({ label, value, color, inverted }) => {
    const displayValue = inverted ? 1 - value : value;

    return (
        <div style={styles.stateBar}>
            <div style={styles.stateLabel}>{label}</div>
            <div style={styles.stateTrack}>
                <div
                    style={{
                        ...styles.stateFill,
                        width: `${displayValue * 100}%`,
                        background: color,
                    }}
                />
            </div>
            <div style={styles.stateValue}>{Math.round(displayValue * 100)}%</div>
        </div>
    );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
        borderRadius: 16,
        padding: 20,
        border: '1px solid rgba(148, 163, 184, 0.1)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
    },

    compactContainer: {
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 12,
        padding: 12,
        border: '1px solid rgba(148, 163, 184, 0.1)',
    },

    compactHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },

    compactIcon: {
        fontSize: 16,
    },

    compactTitle: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: 600,
    },

    compactMetric: {
        display: 'flex',
        gap: 12,
        fontSize: 12,
        color: '#94a3b8',
    },

    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
    },

    spinner: {
        width: 24,
        height: 24,
        border: '3px solid rgba(148, 163, 184, 0.3)',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },

    loadingText: {
        color: '#94a3b8',
        fontSize: 14,
    },

    errorText: {
        color: '#ef4444',
        textAlign: 'center' as const,
        padding: 20,
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },

    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },

    icon: {
        fontSize: 20,
    },

    title: {
        color: '#f1f5f9',
        fontSize: 16,
        fontWeight: 600,
    },

    confidenceBadge: {
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
    },

    mainCard: {
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        border: '1px solid rgba(59, 130, 246, 0.2)',
    },

    mainTitle: {
        color: '#f1f5f9',
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 4,
    },

    subtitle: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 16,
        lineHeight: 1.5,
    },

    metricsRow: {
        display: 'flex',
        gap: 16,
    },

    metric: {
        flex: 1,
        textAlign: 'center' as const,
    },

    metricValue: {
        color: '#22c55e',
        fontSize: 18,
        fontWeight: 700,
    },

    metricLabel: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 2,
    },

    pointsSection: {
        marginBottom: 16,
    },

    point: {
        display: 'flex',
        gap: 8,
        color: '#cbd5e1',
        fontSize: 13,
        marginBottom: 6,
    },

    pointBullet: {
        color: '#3b82f6',
    },

    stateSection: {
        marginBottom: 16,
    },

    sectionTitle: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 500,
        marginBottom: 10,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },

    stateGrid: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 8,
    },

    stateBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },

    stateLabel: {
        color: '#94a3b8',
        fontSize: 12,
        width: 40,
    },

    stateTrack: {
        flex: 1,
        height: 6,
        background: 'rgba(148, 163, 184, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },

    stateFill: {
        height: '100%',
        borderRadius: 3,
        transition: 'width 0.5s ease',
    },

    stateValue: {
        color: '#64748b',
        fontSize: 11,
        width: 36,
        textAlign: 'right' as const,
    },

    alternativesSection: {
        marginBottom: 16,
    },

    alternative: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(148, 163, 184, 0.05)',
        borderRadius: 8,
        marginBottom: 6,
        cursor: 'pointer',
        transition: 'background 0.2s',
    },

    altLabel: {
        color: '#cbd5e1',
        fontSize: 13,
        fontWeight: 500,
    },

    altReason: {
        color: '#64748b',
        fontSize: 11,
    },

    narrativeSection: {
        marginBottom: 16,
        paddingTop: 12,
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
    },

    narrative: {
        color: '#94a3b8',
        fontSize: 13,
        lineHeight: 1.6,
        fontStyle: 'italic' as const,
    },

    actionButton: {
        width: '100%',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: 10,
        color: '#fff',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
};

export default DestinyRecommendationCard;

/**
 * DestinyRecommendationCard
 * Phase 3 v0.2 DTOE: Digital Twin Optimization Engine
 * 
 * Full-featured card displaying Bellman MPC recommendation with:
 * - p50/p90/CVaR metrics
 * - failure_prob risk indicator
 * - Evidence references with freshness status
 * - Alternative actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    ExternalLink,
} from 'lucide-react';
import {
    getDestinyEngine,
    type RecommendationOutput,
    type StateSummary,
} from '../services/dtoe/destinyEngine';
import { isEvidenceFresh } from '../services/dtoe/schemaValidators';
import type { EvidencePack, MetricDistribution } from '../services/dtoe/coreSchemas';
import type { ExplanationCard, AlternativeSummary } from '../services/dtoe/decisionExplainer';

// ============================================================================
// Types
// ============================================================================

interface DestinyRecommendationCardProps {
    entityId?: string;
    evidencePack?: EvidencePack | null;
    onActionSelect?: (actionType: string) => void;
    onRefreshEvidence?: () => void;
    compact?: boolean;
}

// ============================================================================
// Risk Level Helper
// ============================================================================

function getRiskLevel(failureProb: number): { label: string; color: string; bgColor: string } {
    if (failureProb < 0.1) {
        return { label: 'Low Risk', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' };
    } else if (failureProb < 0.25) {
        return { label: 'Moderate Risk', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' };
    } else {
        return { label: 'High Risk', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    }
}

// ============================================================================
// Main Component
// ============================================================================

export const DestinyRecommendationCard: React.FC<DestinyRecommendationCardProps> = ({
    entityId = 'default_user',
    evidencePack,
    onActionSelect,
    onRefreshEvidence,
    compact = false,
}) => {
    const [recommendation, setRecommendation] = useState<RecommendationOutput | null>(null);
    const [stateSummary, setStateSummary] = useState<StateSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFresh, setIsFresh] = useState(true);

    const loadRecommendation = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const engine = getDestinyEngine();

            const result = await engine.getRecommendation({
                entity_id: entityId,
                evidence_pack: evidencePack ?? null,
                needs_live_data: evidencePack !== undefined,
            });

            setRecommendation(result);
            const summary = engine.getStateSummary(entityId);
            setStateSummary(summary);

            // Check evidence freshness
            if (evidencePack) {
                setIsFresh(isEvidenceFresh(evidencePack));
            }

            if (!result.success) {
                setError(result.diagnostics.errors[0] ?? 'Unable to generate recommendation');
            }
        } catch (e) {
            console.error('[DestinyCard] Error:', e);
            setError('Error while calculating recommendation');
        } finally {
            setLoading(false);
        }
    }, [entityId, evidencePack]);

    useEffect(() => {
        loadRecommendation();
    }, [loadRecommendation]);

    // Loading State
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <RefreshCw size={24} className="animate-spin" style={{ color: '#3b82f6' }} />
                    <span style={styles.loadingText}>Analyzing optimal strategy...</span>
                </div>
            </div>
        );
    }

    // Error State
    if (error || !recommendation?.success) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <AlertCircle size={24} style={{ color: '#ef4444' }} />
                    <div style={styles.errorText}>{error || 'Unable to fetch recommendation'}</div>
                    <button onClick={loadRecommendation} style={styles.retryButton}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const { strategy_card, explanation_card } = recommendation;
    const bestAction = strategy_card?.next_best_action;
    const outcomes = strategy_card?.outcomes_distribution;
    const failureProb = outcomes?.failure_prob ?? 0;
    const riskLevel = getRiskLevel(failureProb);

    // Compact Version
    if (compact) {
        return (
            <div style={styles.compactContainer}>
                <div style={styles.compactHeader}>
                    <span style={styles.compactIcon}>🎯</span>
                    <span style={styles.compactTitle}>{bestAction?.summary}</span>
                </div>
                <div style={styles.compactMetric}>
                    <span style={{ color: riskLevel.color }}>{riskLevel.label}</span>
                    <span>• Failure rate {(failureProb * 100).toFixed(0)}%</span>
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
                    <span style={styles.title}>Destiny Engine Recommendation</span>
                </div>
                <div style={{
                    ...styles.confidenceBadge,
                    background: recommendation.diagnostics.explanation_valid
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(251, 191, 36, 0.2)',
                    color: recommendation.diagnostics.explanation_valid ? '#22c55e' : '#fbbf24',
                }}>
                    {recommendation.diagnostics.explanation_valid ? 'High Confidence' : 'Needs Validation'}
                </div>
            </div>

            {/* Stale Evidence Warning */}
            {!isFresh && (
                <div style={styles.staleWarning}>
                    <Clock size={14} />
                    <span>Evidence data is outdated</span>
                    {onRefreshEvidence && (
                        <button onClick={onRefreshEvidence} style={styles.refreshLink}>
                            Refresh
                        </button>
                    )}
                </div>
            )}

            {/* Main Recommendation */}
            <div style={styles.mainCard}>
                <div style={styles.mainTitle}>{bestAction?.summary}</div>
                <div style={styles.subtitle}>
                    {explanation_card?.headline ?? 'Best recommendation based on current state'}
                </div>

                {/* Metrics Row */}
                <div style={styles.metricsRow}>
                    {outcomes?.metrics?.map((m: MetricDistribution) => (
                        <MetricBox key={m.name} metric={m} />
                    ))}
                    <div style={{ ...styles.metric, background: riskLevel.bgColor }}>
                        <div style={{ ...styles.metricValue, color: riskLevel.color }}>
                            {(failureProb * 100).toFixed(0)}%
                        </div>
                        <div style={styles.metricLabel}>Failure Rate</div>
                    </div>
                </div>
            </div>

            {/* Top Reasons */}
            {explanation_card && explanation_card.top_reasons.length > 0 && (
                <div style={styles.reasonsSection}>
                    <div style={styles.sectionTitle}>Recommendation Rationale</div>
                    {explanation_card.top_reasons.slice(0, 4).map((reason, idx) => (
                        <div key={idx} style={styles.reason}>
                            <span style={{
                                ...styles.reasonBullet,
                                color: reason.source === 'evidence' ? '#3b82f6' :
                                    reason.source === 'constraint' ? '#f59e0b' :
                                        reason.source === 'risk' ? '#ef4444' : '#22c55e',
                            }}>
                                {reason.source === 'evidence' ? '📄' :
                                    reason.source === 'constraint' ? '⚙️' :
                                        reason.source === 'risk' ? '⚠️' : '✓'}
                            </span>
                            <span>{reason.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Risk Notes */}
            {explanation_card && explanation_card.risk_notes.length > 0 && (
                <div style={styles.riskSection}>
                    {explanation_card.risk_notes.map((note, idx) => (
                        <div key={idx} style={styles.riskNote}>
                            {note}
                        </div>
                    ))}
                </div>
            )}

            {/* Evidence References */}
            {evidencePack && evidencePack.items.length > 0 && (
                <div style={styles.evidenceSection}>
                    <div style={styles.sectionTitle}>
                        Evidence Sources
                        {!isFresh && <span style={styles.staleBadge}>Stale</span>}
                    </div>
                    {evidencePack.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} style={styles.evidenceItem}>
                            <ExternalLink size={12} style={{ color: '#64748b' }} />
                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                                {item.title}
                            </a>
                            <span style={styles.evidenceSource}>{item.source_name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Alternatives */}
            {explanation_card && explanation_card.alternatives.length > 0 && (
                <div style={styles.alternativesSection}>
                    <div style={styles.sectionTitle}>Alternatives</div>
                    {explanation_card.alternatives.slice(0, 3).map((alt: AlternativeSummary, idx: number) => (
                        <div
                            key={idx}
                            style={styles.alternative}
                            onClick={() => onActionSelect?.(alt.action_summary)}
                        >
                            <span style={styles.altLabel}>{alt.action_summary}</span>
                            <span style={styles.altReason}>{alt.reason_not_chosen}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Button */}
            <button
                style={styles.actionButton}
                onClick={() => onActionSelect?.(bestAction?.action_type ?? 'do')}
            >
                {bestAction?.requires_confirmation ? 'Confirm and Execute' : 'Accept Recommendation'}
            </button>
        </div>
    );
};

// ============================================================================
// Metric Box Component
// ============================================================================

const MetricBox: React.FC<{ metric: MetricDistribution }> = ({ metric }) => {
    const nameMap: Record<string, string> = {
        utility_score: 'Overall Utility',
        wealth: 'Wealth Gain',
        time: 'Time Cost',
    };

    return (
        <div style={styles.metric}>
            <div style={styles.metricValue}>{metric.p50.toFixed(2)}</div>
            <div style={styles.metricLabel}>{nameMap[metric.name] ?? metric.name}</div>
            <div style={styles.metricRange}>
                p90: {metric.p90.toFixed(2)} | CVaR: {metric.cvar_90?.toFixed(2) ?? '-'}
            </div>
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
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
    },

    loadingText: {
        color: '#94a3b8',
        fontSize: 14,
    },

    errorContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 12,
        padding: 30,
    },

    errorText: {
        color: '#ef4444',
        textAlign: 'center' as const,
    },

    retryButton: {
        padding: '8px 16px',
        background: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 8,
        color: '#ef4444',
        fontSize: 13,
        cursor: 'pointer',
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

    staleWarning: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        marginBottom: 12,
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        borderRadius: 8,
        color: '#fbbf24',
        fontSize: 12,
    },

    refreshLink: {
        marginLeft: 'auto',
        color: '#3b82f6',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'underline',
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
        gap: 12,
    },

    metric: {
        flex: 1,
        textAlign: 'center' as const,
        padding: '8px',
        background: 'rgba(148, 163, 184, 0.08)',
        borderRadius: 8,
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

    metricRange: {
        color: '#475569',
        fontSize: 9,
        marginTop: 4,
    },

    reasonsSection: {
        marginBottom: 12,
    },

    sectionTitle: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 500,
        marginBottom: 8,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },

    reason: {
        display: 'flex',
        gap: 8,
        color: '#cbd5e1',
        fontSize: 13,
        marginBottom: 6,
        alignItems: 'flex-start',
    },

    reasonBullet: {
        fontSize: 12,
    },

    riskSection: {
        marginBottom: 12,
    },

    riskNote: {
        padding: '6px 10px',
        marginBottom: 4,
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 6,
        color: '#f87171',
        fontSize: 12,
    },

    evidenceSection: {
        marginBottom: 12,
        padding: 12,
        background: 'rgba(148, 163, 184, 0.05)',
        borderRadius: 8,
    },

    staleBadge: {
        marginLeft: 8,
        padding: '2px 6px',
        background: 'rgba(251, 191, 36, 0.2)',
        color: '#fbbf24',
        borderRadius: 4,
        fontSize: 10,
    },

    evidenceItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        fontSize: 12,
    },

    evidenceLink: {
        color: '#93c5fd',
        textDecoration: 'none',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },

    evidenceSource: {
        color: '#64748b',
        fontSize: 10,
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

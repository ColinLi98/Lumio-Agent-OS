/**
 * IntentDetail - Full intent view with ranked offers and accept flow
 */

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Zap, Star, Shield, Clock, CheckCircle,
    AlertTriangle, ChevronDown, ChevronUp, ExternalLink,
    Package, Briefcase, Users, HelpCircle, Copy, XCircle, AlertOctagon
} from 'lucide-react';
import { lixStore, StoredIntent } from '../services/lixStore';
import { RankedOffer } from '../services/lixTypes';

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
    error: '#ef4444',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Offer Card Component
// ============================================================================

interface OfferCardProps {
    rankedOffer: RankedOffer;
    isTop: boolean;
    onAccept: () => void;
    isAccepted: boolean;
}

const OfferCard: React.FC<OfferCardProps> = ({ rankedOffer, isTop, onAccept, isAccepted }) => {
    const [showDetails, setShowDetails] = useState(false);
    const { offer, rank, total_score, score_breakdown, explanation } = rankedOffer;

    return (
        <div style={{
            backgroundColor: colors.bg2,
            border: `1px solid ${isTop ? colors.primary : colors.border}`,
            borderRadius: 14,
            padding: 14,
            position: 'relative',
            boxShadow: isTop ? `0 0 20px ${colors.primary}30` : 'none'
        }}>
            {/* Rank Badge */}
            {rank === 1 && (
                <div style={{
                    position: 'absolute',
                    top: -8,
                    left: -8,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.warning}, #f59e0b)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#000'
                }}>
                    1
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: colors.text1, fontSize: 15, fontWeight: 600 }}>
                            {offer.provider.name}
                        </span>
                        <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            backgroundColor: offer.provider.type === 'B2C' ? colors.primaryMuted : colors.positiveMuted,
                            color: offer.provider.type === 'B2C' ? colors.primary : colors.positive
                        }}>
                            {offer.provider.type}
                        </span>
                        {offer.provider.verified && (
                            <Shield size={14} color={colors.positive} />
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Star size={12} fill={colors.warning} stroke={colors.warning} />
                        <span style={{ fontSize: 12, color: colors.text2 }}>
                            {offer.provider.reputation_score.toFixed(1)}
                        </span>
                        {offer.fulfillment?.delivery_eta && (
                            <>
                                <Clock size={12} color={colors.text3} />
                                <span style={{ fontSize: 12, color: colors.text3 }}>
                                    {new Date(offer.fulfillment.delivery_eta).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: colors.warning, fontSize: 20, fontWeight: 700 }}>
                        ¥{offer.price.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: colors.text3 }}>
                        匹配度 {Math.floor(total_score * 100)}%
                    </div>
                </div>
            </div>

            {/* Explanation */}
            <div style={{
                padding: '8px 10px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                fontSize: 12,
                color: colors.text2,
                marginBottom: 10
            }}>
                {explanation}
            </div>

            {/* Why This Offer - Expandable */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    color: colors.primary,
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: showDetails ? 10 : 0
                }}
            >
                <HelpCircle size={14} />
                为什么推荐这个报价
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
                <div style={{
                    padding: 10,
                    backgroundColor: colors.bg3,
                    borderRadius: 8,
                    marginBottom: 10
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                        <div>
                            <span style={{ color: colors.text3 }}>价格得分</span>
                            <div style={{ color: colors.text1, fontWeight: 500 }}>
                                {(score_breakdown.price_score * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div>
                            <span style={{ color: colors.text3 }}>信誉得分</span>
                            <div style={{ color: colors.text1, fontWeight: 500 }}>
                                {(score_breakdown.reputation_score * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div>
                            <span style={{ color: colors.text3 }}>配送得分</span>
                            <div style={{ color: colors.text1, fontWeight: 500 }}>
                                {(score_breakdown.delivery_score * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div>
                            <span style={{ color: colors.text3 }}>SKU匹配</span>
                            <div style={{ color: colors.text1, fontWeight: 500 }}>
                                {(score_breakdown.sku_match_score * 100).toFixed(0)}%
                            </div>
                        </div>
                        {score_breakdown.validation_penalty > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ color: colors.warning }}>
                                    ⚠️ 验证惩罚: -{(score_breakdown.validation_penalty * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Validation Warnings */}
                    {rankedOffer.validation_result && rankedOffer.validation_result.warnings.length > 0 && (
                        <div style={{
                            marginTop: 10,
                            padding: 8,
                            backgroundColor: colors.warningMuted,
                            borderRadius: 6,
                            border: `1px solid ${colors.warning}30`
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 6,
                                color: colors.warning,
                                fontSize: 11,
                                fontWeight: 600
                            }}>
                                <AlertTriangle size={12} />
                                <span>验证警告 ({rankedOffer.validation_result.action})</span>
                            </div>
                            <ul style={{
                                margin: 0,
                                paddingLeft: 16,
                                fontSize: 11,
                                color: colors.text2,
                                lineHeight: 1.4
                            }}>
                                {rankedOffer.validation_result.warnings.slice(0, 3).map((warn, i) => (
                                    <li key={i}>{warn}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
                <button
                    onClick={onAccept}
                    disabled={isAccepted}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        backgroundColor: isAccepted ? colors.positive : colors.primary,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        border: 'none',
                        cursor: isAccepted ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                    }}
                >
                    {isAccepted ? (
                        <>
                            <CheckCircle size={16} />
                            已接受
                        </>
                    ) : (
                        '接受报价'
                    )}
                </button>
                <button
                    style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        backgroundColor: colors.bg3,
                        color: colors.text2,
                        fontSize: 14,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}
                >
                    <ExternalLink size={14} />
                    查看
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface IntentDetailProps {
    intentId: string;
    onBack: () => void;
}

export const IntentDetail: React.FC<IntentDetailProps> = ({ intentId, onBack }) => {
    const [intent, setIntent] = useState<StoredIntent | undefined>(lixStore.getIntent(intentId));
    const [isAccepting, setIsAccepting] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    // Poll for updates when status is broadcasting (every 2s)
    useEffect(() => {
        if (!intent || intent.status !== 'broadcasting') {
            setIsPolling(false);
            return;
        }

        setIsPolling(true);
        const pollInterval = setInterval(() => {
            const updated = lixStore.getIntent(intentId);
            if (updated) {
                setIntent(updated);
                // Stop polling once we have offers or status changed
                if (updated.status !== 'broadcasting' || updated.offers.length > 0) {
                    setIsPolling(false);
                    clearInterval(pollInterval);
                }
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [intentId, intent?.status]);

    if (!intent) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: colors.text3 }}>
                意图不存在
            </div>
        );
    }

    const handleAccept = async (offerId: string) => {
        setIsAccepting(true);
        try {
            await lixStore.acceptOffer(intentId, offerId);
            setIntent(lixStore.getIntent(intentId));
        } finally {
            setIsAccepting(false);
        }
    };

    const categoryIcons: Record<string, React.ReactNode> = {
        purchase: <Package size={20} />,
        job: <Briefcase size={20} />,
        collaboration: <Users size={20} />
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: `1px solid ${colors.border}`
            }}>
                <button
                    onClick={onBack}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.bg2,
                        border: 'none',
                        color: colors.text1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{
                        color: colors.text1,
                        fontSize: 18,
                        fontWeight: 600,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        {categoryIcons[intent.category]}
                        {intent.item_name}
                    </h1>
                    <p style={{ color: colors.text3, fontSize: 12, margin: '4px 0 0' }}>
                        {intent.status === 'accepted' ? '已接受报价' : `${intent.offers.length} 个报价`}
                    </p>
                </div>
            </div>

            {/* Intent Metadata */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                padding: 12,
                backgroundColor: colors.bg2,
                borderRadius: 12,
                marginBottom: 16
            }}>
                {intent.budget_max && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: colors.text3, fontSize: 11 }}>预算</div>
                        <div style={{ color: colors.text1, fontSize: 14, fontWeight: 600 }}>
                            ¥{intent.budget_max}
                        </div>
                    </div>
                )}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.text3, fontSize: 11 }}>报价数</div>
                    <div style={{ color: colors.text1, fontSize: 14, fontWeight: 600 }}>
                        {intent.total_offers_received}
                    </div>
                </div>
                {intent.best_price && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: colors.text3, fontSize: 11 }}>最低价</div>
                        <div style={{ color: colors.positive, fontSize: 14, fontWeight: 600 }}>
                            ¥{intent.best_price}
                        </div>
                    </div>
                )}
                {intent.item_sku && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                        <div style={{ color: colors.text3, fontSize: 11 }}>SKU</div>
                        <div style={{ color: colors.text2, fontSize: 12, fontFamily: 'monospace' }}>
                            {intent.item_sku}
                        </div>
                    </div>
                )}
            </div>

            {/* Proof of Intent Status */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: colors.positiveMuted,
                borderRadius: 8,
                marginBottom: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={14} color={colors.positive} />
                    <span style={{ fontSize: 12, color: colors.positive }}>
                        意图已签名验证
                    </span>
                </div>
                {intent.trace_id && (
                    <button
                        onClick={() => navigator.clipboard.writeText(intent.trace_id || '')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            color: colors.text3,
                            fontSize: 10,
                            cursor: 'pointer',
                            fontFamily: 'monospace'
                        }}
                        title="复制 trace_id"
                    >
                        <Copy size={10} />
                        {intent.trace_id.slice(0, 12)}...
                    </button>
                )}
            </div>

            {/* Offers List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h3 style={{
                    color: colors.text3,
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    marginBottom: 12
                }}>
                    排名报价
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {intent.offers.map((ro, i) => (
                        <OfferCard
                            key={ro.offer.offer_id}
                            rankedOffer={ro}
                            isTop={i === 0}
                            isAccepted={intent.accepted_offer_id === ro.offer.offer_id}
                            onAccept={() => handleAccept(ro.offer.offer_id)}
                        />
                    ))}
                </div>
            </div>

            {/* Accept Token Display */}
            {intent.accept_token && (
                <div style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: colors.positiveMuted,
                    borderRadius: 12,
                    border: `1px solid ${colors.positive}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <CheckCircle size={16} color={colors.positive} />
                        <span style={{ color: colors.positive, fontSize: 14, fontWeight: 600 }}>
                            已生成接受令牌
                        </span>
                    </div>
                    <div style={{
                        fontSize: 11,
                        color: colors.text2,
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                    }}>
                        Token: {intent.accept_token.token_id}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntentDetail;

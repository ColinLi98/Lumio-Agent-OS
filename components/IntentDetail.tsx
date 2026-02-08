/**
 * IntentDetail - Full intent view with ranked offers and accept flow
 */

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Zap, Star, Shield, Clock, CheckCircle,
    AlertTriangle, ChevronDown, ChevronUp, ExternalLink,
    Package, Briefcase, Users, HelpCircle, Copy, XCircle, AlertOctagon, Ticket, Bell, Calendar
} from 'lucide-react';
import { buildApiUrl } from '../services/apiBaseUrl';
import { lixStore, StoredIntent } from '../services/lixStore';
import type { StoredSolutionIntent } from '../services/lixStore';
import { type AgentSolutionOffer, RankedOffer, type SolutionCustomRequirements } from '../services/lixTypes';
import { getCurrentUserId } from '../services/digitalTwinMarketplaceBridge';
import { syncApprovedAgentToDigitalTwin } from '../services/digitalTwinLixSyncService';

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
// Ticketing Detection Helper
// ============================================================================

const TICKETING_KEYWORDS = ['车票', '火车票', '机票', '高铁票', '飞机票', '门票', '入场券'];

function isTicketingIntent(itemName: string): boolean {
    return TICKETING_KEYWORDS.some(kw => itemName.includes(kw));
}

// ============================================================================
// Ticketing Empty State Component (P0: Vertical Classification)
// ============================================================================

interface TicketingEmptyStateProps {
    itemName: string;
}

const TicketingEmptyState: React.FC<TicketingEmptyStateProps> = ({ itemName }) => (
    <div style={{
        backgroundColor: colors.bg2,
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
        border: `1px solid ${colors.border}`
    }}>
        <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: colors.primaryMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
        }}>
            <Ticket size={32} color={colors.primary} />
        </div>

        <h3 style={{ color: colors.text1, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            暂无票务服务商
        </h3>
        <p style={{ color: colors.text3, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            「{itemName}」属于票务类需求，目前平台暂未接入票务服务商。
            <br />您可以设置提醒，待服务商上线后第一时间通知您。
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={{
                padding: '10px 20px',
                borderRadius: 10,
                backgroundColor: colors.primary,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
                <Bell size={16} />
                设置提醒
            </button>
            <button style={{
                padding: '10px 20px',
                borderRadius: 10,
                backgroundColor: colors.bg3,
                color: colors.text2,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
                <Calendar size={16} />
                完善信息
            </button>
        </div>
    </div>
);

// ============================================================================
// Offer Card Component
// ============================================================================

interface OfferCardProps {
    rankedOffer: RankedOffer;
    isTop: boolean;
    onAccept: () => void;
    isAccepted: boolean;
    viewUrl: string;
}

const OfferCard: React.FC<OfferCardProps> = ({ rankedOffer, isTop, onAccept, isAccepted, viewUrl }) => {
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
                <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
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
                        gap: 4,
                        textDecoration: 'none'
                    }}
                >
                    <ExternalLink size={14} />
                    查看
                </a>
            </div>
        </div>
    );
};

interface AgentCollabMetaProps {
    offer: AgentSolutionOffer;
}

const AgentCollabMeta: React.FC<AgentCollabMetaProps> = ({ offer }) => {
    const collaborators = Array.isArray(offer.collaborator_agents)
        ? offer.collaborator_agents.filter(Boolean)
        : [];

    return (
        <div
            style={{
                marginBottom: 8,
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(167, 139, 250, 0.08)',
                border: `1px solid ${colors.primaryMuted}`,
            }}
        >
            {collaborators.length > 0 && (
                <div style={{ color: colors.text3, fontSize: 11, marginBottom: 4 }}>
                    协同 Agent: {collaborators.slice(0, 4).join(' / ')}
                </div>
            )}
            {offer.orchestration_strategy && (
                <div style={{ color: colors.text3, fontSize: 11 }}>
                    编排策略: {offer.orchestration_strategy}
                </div>
            )}
        </div>
    );
};

interface CustomRequirementMetaProps {
    customRequirements?: SolutionCustomRequirements;
}

const CustomRequirementMeta: React.FC<CustomRequirementMetaProps> = ({ customRequirements }) => {
    if (!customRequirements) return null;
    const mustHave = customRequirements.must_have_capabilities || [];
    const exclusions = customRequirements.exclusions || [];
    const successCriteria = customRequirements.success_criteria || [];

    return (
        <div
            style={{
                padding: 10,
                borderRadius: 10,
                backgroundColor: 'rgba(251, 191, 36, 0.07)',
                border: `1px solid ${colors.warningMuted}`,
                marginBottom: 12,
            }}
        >
            <div style={{ color: colors.text1, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                定制化需求
            </div>
            {customRequirements.objective && (
                <div style={{ color: colors.text2, fontSize: 11, marginBottom: 4 }}>
                    目标: {customRequirements.objective}
                </div>
            )}
            {mustHave.length > 0 && (
                <div style={{ color: colors.text2, fontSize: 11, marginBottom: 4 }}>
                    必须能力: {mustHave.join(' / ')}
                </div>
            )}
            {exclusions.length > 0 && (
                <div style={{ color: colors.text2, fontSize: 11, marginBottom: 4 }}>
                    排除条件: {exclusions.join(' / ')}
                </div>
            )}
            {(typeof customRequirements.budget_max_cny === 'number' || typeof customRequirements.expected_delivery_hours === 'number') && (
                <div style={{ color: colors.text2, fontSize: 11, marginBottom: 4 }}>
                    {typeof customRequirements.budget_max_cny === 'number' ? `预算上限: ¥${customRequirements.budget_max_cny}` : '预算上限: 未设置'}
                    {' · '}
                    {typeof customRequirements.expected_delivery_hours === 'number' ? `期望交付: ${customRequirements.expected_delivery_hours}h` : '期望交付: 未设置'}
                </div>
            )}
            {successCriteria.length > 0 && (
                <div style={{ color: colors.text2, fontSize: 11, marginBottom: 4 }}>
                    验收标准: {successCriteria.join(' / ')}
                </div>
            )}
            {customRequirements.notes && (
                <div style={{ color: colors.text3, fontSize: 11 }}>
                    备注: {customRequirements.notes}
                </div>
            )}
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
    const [solutionIntent, setSolutionIntent] = useState<StoredSolutionIntent | undefined>(lixStore.getSolutionIntent(intentId));
    const [isAccepting, setIsAccepting] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [submittingDelivery, setSubmittingDelivery] = useState(false);
    const [reviewingDelivery, setReviewingDelivery] = useState(false);
    const currentUserId = getCurrentUserId();

    useEffect(() => {
        setIntent(lixStore.getIntent(intentId));
        setSolutionIntent(lixStore.getSolutionIntent(intentId));
    }, [intentId]);

    useEffect(() => {
        if (!solutionIntent?.delivery_manifest) return;
        if (solutionIntent.status !== 'approved') return;
        syncApprovedAgentToDigitalTwin(solutionIntent, solutionIntent.delivery_manifest);
    }, [solutionIntent]);

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

    if (!intent && !solutionIntent) {
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

    const buildOfferViewUrl = (ro: RankedOffer): string => {
        const direct = String(ro?.offer?.price_proof?.proof_url || '').trim();
        if (/^https?:\/\//i.test(direct)) return direct;
        const query = `${intent?.item_name || ''} ${ro?.offer?.provider?.name || ''}`.trim() || ro?.offer?.offer_id;
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    };

    const handleAcceptSolution = async (offerId: string) => {
        if (!solutionIntent) return;
        setIsAccepting(true);
        try {
            const resp = await fetch(buildApiUrl('/api/lix/solution/offer/accept'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    intent_id: solutionIntent.intent_id,
                    offer_id: offerId,
                }),
            });
            const payload = await resp.json().catch(() => null);
            if (!resp.ok || !payload?.success || !payload?.intent) {
                throw new Error(payload?.error || `HTTP ${resp.status}: solution accept failed`);
            }
            lixStore.ingestSolutionIntent(payload.intent);
            setSolutionIntent(payload.intent);
        } catch (error) {
            console.error('[IntentDetail] accept solution failed:', error);
        } finally {
            setIsAccepting(false);
        }
    };

    const handleSubmitSolutionDelivery = async () => {
        if (!solutionIntent?.accepted_offer_id) return;
        setSubmittingDelivery(true);
        try {
            const executorUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/api/lix/solution/executor`
                : 'http://127.0.0.1:3000/api/lix/solution/executor';
            const resp = await fetch(buildApiUrl('/api/lix/solution/delivery'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    intent_id: solutionIntent.intent_id,
                    offer_id: solutionIntent.accepted_offer_id,
                    owner_id: solutionIntent.requester_id || currentUserId,
                    submitted_by: 'expert_mock',
                    name: `LIX Agent · ${solutionIntent.title.slice(0, 20)}`,
                    description: `由 LIX 专家交付：${solutionIntent.query}`,
                    execute_ref: executorUrl,
                    domains: [solutionIntent.domain],
                    capabilities: solutionIntent.required_capabilities,
                    supports_realtime: true,
                    evidence_level: 'weak',
                    supports_parallel: true,
                    cost_tier: 'mid',
                    avg_latency_ms: 1800,
                    success_rate: 0.96,
                }),
            });
            const payload = await resp.json().catch(() => null);
            if (!resp.ok || !payload?.success || !payload?.intent) {
                throw new Error(payload?.error || `HTTP ${resp.status}: solution delivery failed`);
            }
            lixStore.ingestSolutionIntent(payload.intent);
            setSolutionIntent(payload.intent);
        } catch (error) {
            console.error('[IntentDetail] submit delivery failed:', error);
        } finally {
            setSubmittingDelivery(false);
        }
    };

    const handleReviewSolutionDelivery = async (decision: 'approved' | 'rejected') => {
        if (!solutionIntent) return;
        setReviewingDelivery(true);
        try {
            const resp = await fetch(buildApiUrl('/api/lix/solution/review'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    intent_id: solutionIntent.intent_id,
                    decision,
                    reviewer_id: 'reviewer_admin',
                    reason: decision === 'approved' ? '自动审核通过（演示）' : '未通过审核（演示）',
                }),
            });
            const payload = await resp.json().catch(() => null);
            if (!resp.ok || !payload?.success || !payload?.intent) {
                throw new Error(payload?.error || `HTTP ${resp.status}: solution review failed`);
            }
            lixStore.ingestSolutionIntent(payload.intent);
            setSolutionIntent(payload.intent);
            if (decision === 'approved' && payload.intent?.delivery_manifest) {
                syncApprovedAgentToDigitalTwin(payload.intent, payload.intent.delivery_manifest);
            }
        } catch (error) {
            console.error('[IntentDetail] review delivery failed:', error);
        } finally {
            setReviewingDelivery(false);
        }
    };

    const categoryIcons: Record<string, React.ReactNode> = {
        purchase: <Package size={20} />,
        job: <Briefcase size={20} />,
        collaboration: <Users size={20} />
    };

    if (solutionIntent && (!intent || solutionIntent.intent_id === intentId)) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                        <h1 style={{ color: colors.text1, fontSize: 18, fontWeight: 600, margin: 0 }}>
                            🤖 专家 / Agent 协同交付
                        </h1>
                        <p style={{ color: colors.text3, fontSize: 12, margin: '4px 0 0' }}>
                            {solutionIntent.title}
                        </p>
                    </div>
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        backgroundColor: colors.primaryMuted,
                        color: colors.primary,
                        fontSize: 11,
                        fontWeight: 600
                    }}>
                        {solutionIntent.status}
                    </span>
                </div>

                <div style={{
                    padding: 12,
                    backgroundColor: colors.bg2,
                    borderRadius: 12,
                    marginBottom: 14
                }}>
                    <div style={{ color: colors.text2, fontSize: 13, marginBottom: 6 }}>{solutionIntent.query}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: colors.text3 }}>
                        <span>domain: {solutionIntent.domain}</span>
                        <span>cap: {solutionIntent.required_capabilities.join(', ') || 'general'}</span>
                        <span>offers: {solutionIntent.offers.length}</span>
                        <span>
                            requester: {solutionIntent.requester_type === 'agent'
                                ? `agent ${solutionIntent.requester_agent_name || solutionIntent.requester_agent_id || ''}`.trim()
                                : 'user'}
                        </span>
                    </div>
                </div>

                <CustomRequirementMeta customRequirements={solutionIntent.custom_requirements} />

                {solutionIntent.digital_twin_snapshot && (
                    <div
                        style={{
                            padding: 12,
                            backgroundColor: 'rgba(14, 165, 233, 0.08)',
                            borderRadius: 12,
                            border: `1px solid rgba(14, 165, 233, 0.25)`,
                            marginBottom: 14,
                        }}
                    >
                        <div style={{ color: colors.text1, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                            已附带数字分身画像
                        </div>
                        <div style={{ color: colors.text2, fontSize: 12, marginBottom: 4 }}>
                            user: {solutionIntent.digital_twin_snapshot.user_id}
                        </div>
                        {solutionIntent.digital_twin_snapshot.marketplace_context?.preferences && (
                            <div style={{ color: colors.text3, fontSize: 11, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <span>
                                    domains:{' '}
                                    {solutionIntent.digital_twin_snapshot.marketplace_context.preferences.preferred_domains.slice(0, 3).join(' / ') || 'general'}
                                </span>
                                <span>
                                    evidence: {solutionIntent.digital_twin_snapshot.marketplace_context.preferences.preferred_evidence_level}
                                </span>
                                <span>
                                    latency: {solutionIntent.digital_twin_snapshot.marketplace_context.preferences.preferred_latency}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {solutionIntent.offers.map((offer) => (
                        <div
                            key={offer.offer_id}
                            style={{
                                backgroundColor: colors.bg2,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 12,
                                padding: 12
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ color: colors.text1, fontSize: 14, fontWeight: 600 }}>
                                        {offer.expert_name}
                                    </div>
                                    <span
                                        style={{
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            backgroundColor: offer.offer_type === 'agent_collab'
                                                ? colors.primaryMuted
                                                : colors.warningMuted,
                                            color: offer.offer_type === 'agent_collab'
                                                ? colors.primary
                                                : colors.warning,
                                            fontSize: 10,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {offer.offer_type === 'agent_collab' ? 'Agent 协同' : '人工专家'}
                                    </span>
                                </div>
                                <div style={{ color: colors.positive, fontSize: 13, fontWeight: 600 }}>
                                    ¥{offer.quote_amount}
                                </div>
                            </div>
                            <div style={{ color: colors.text2, fontSize: 12, marginBottom: 8 }}>{offer.summary}</div>
                            {offer.offer_type === 'agent_collab' && (
                                <AgentCollabMeta offer={offer} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ color: colors.text3, fontSize: 11 }}>
                                    预计交付 {offer.estimated_delivery_hours} 小时
                                </div>
                                <button
                                    onClick={() => handleAcceptSolution(offer.offer_id)}
                                    disabled={isAccepting || solutionIntent.accepted_offer_id === offer.offer_id || solutionIntent.status === 'approved'}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: solutionIntent.accepted_offer_id === offer.offer_id ? colors.positive : colors.primary,
                                        color: '#fff',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        opacity: isAccepting ? 0.7 : 1,
                                    }}
                                >
                                    {solutionIntent.accepted_offer_id === offer.offer_id
                                        ? '已接受'
                                        : (offer.offer_type === 'agent_collab' ? '接受并自动交付' : '接受方案')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {solutionIntent.status === 'offer_accepted' && !solutionIntent.delivery_manifest && (
                    <button
                        onClick={handleSubmitSolutionDelivery}
                        disabled={submittingDelivery}
                        style={{
                            marginTop: 14,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: colors.primary,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        {submittingDelivery ? '提交交付中...' : '提交交付（模拟专家）'}
                    </button>
                )}

                {solutionIntent.delivery_manifest && (
                    <div style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 12,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.bg2
                    }}>
                        <div style={{ color: colors.text1, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                            交付物：{solutionIntent.delivery_manifest.name}
                        </div>
                        <div style={{ color: colors.text3, fontSize: 11, marginBottom: 8, wordBreak: 'break-all' }}>
                            execute_ref: {solutionIntent.delivery_manifest.execute_ref}
                        </div>
                        <div style={{ color: colors.text3, fontSize: 11, marginBottom: 8 }}>
                            市场发布: {solutionIntent.delivery_manifest.market_visibility === 'private' ? '私有' : '公开'}
                            {' · '}
                            收益模式: {solutionIntent.delivery_manifest.pricing_model === 'free'
                                ? '免费'
                                : `按次 ¥${solutionIntent.delivery_manifest.price_per_use_cny || 0}`}
                        </div>
                        {(solutionIntent.status === 'delivery_submitted' || solutionIntent.status === 'rejected') && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => handleReviewSolutionDelivery('approved')}
                                    disabled={reviewingDelivery}
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        border: 'none',
                                        backgroundColor: colors.positive,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    审核通过并上架
                                </button>
                                <button
                                    onClick={() => handleReviewSolutionDelivery('rejected')}
                                    disabled={reviewingDelivery}
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: colors.bg3,
                                        color: colors.text2,
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    驳回
                                </button>
                            </div>
                        )}
                        {solutionIntent.status === 'approved' && (
                            <div style={{ color: colors.positive, fontSize: 12, marginTop: 6 }}>
                                {solutionIntent.review?.reviewer_id === 'system_auto'
                                    ? 'Agent 协同方案已自动交付并通过系统审核，已进入 Agent Marketplace。'
                                    : '已审核通过并进入 Agent Marketplace，可返回市场页执行。'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (!intent) {
        return null;
    }

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
                    {/* Ticketing Empty State */}
                    {intent.offers.length === 0 && isTicketingIntent(intent.item_name) && (
                        <TicketingEmptyState itemName={intent.item_name} />
                    )}

                    {/* Regular Offers */}
                    {intent.offers.map((ro, i) => (
                        <OfferCard
                            key={ro.offer.offer_id}
                            rankedOffer={ro}
                            isTop={i === 0}
                            isAccepted={intent.accepted_offer_id === ro.offer.offer_id}
                            onAccept={() => handleAccept(ro.offer.offer_id)}
                            viewUrl={buildOfferViewUrl(ro)}
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

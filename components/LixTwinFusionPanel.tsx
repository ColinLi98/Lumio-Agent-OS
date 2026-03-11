import React, { useMemo } from 'react';
import {
    Activity,
    Bot,
    Fingerprint,
    Shield,
    Store,
    Target,
    UserRound,
    Zap,
} from 'lucide-react';
import type { SoulMatrix, TrendData } from '../types';
import { MiniLineChart } from './TrendCharts';
import { useLIXStore } from '../services/lixStore';
import { buildMarketplaceTwinContext, getProfileShareConsent } from '../services/digitalTwinMarketplaceBridge';

interface LixTwinFusionPanelProps {
    soul: SoulMatrix;
    variant?: 'full' | 'compact';
    onOpenLixMarket?: () => void;
    onOpenAgentMarket?: () => void;
    refreshSeed?: number;
}

const panelColors = {
    bg: '#111827',
    card: '#1f2937',
    border: 'rgba(148, 163, 184, 0.18)',
    text1: '#f8fafc',
    text2: '#cbd5e1',
    text3: '#94a3b8',
    cyan: '#22d3ee',
    green: '#34d399',
    purple: '#a78bfa',
    amber: '#f59e0b',
};

function toDailyTrend(
    dates: string[],
    days = 7
): TrendData[] {
    const map = new Map<string, number>();
    dates.forEach((date) => {
        const day = new Date(date);
        if (Number.isNaN(day.getTime())) return;
        const key = day.toISOString().slice(0, 10);
        map.set(key, (map.get(key) || 0) + 1);
    });

    const out: TrendData[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - i);
        const key = day.toISOString().slice(0, 10);
        out.push({ date: key, value: map.get(key) || 0 });
    }
    return out;
}

function clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
}

function normalizeSoulRisk(soulRisk: SoulMatrix['riskTolerance']): number {
    if (soulRisk === 'Low') return 30;
    if (soulRisk === 'High') return 80;
    return 55;
}

function normalizeSoulPrice(spending: SoulMatrix['spendingPreference']): number {
    if (spending === 'PriceFirst') return 30;
    if (spending === 'QualityFirst') return 75;
    return 50;
}

function normalizeSoulPrivacy(level: SoulMatrix['privacyLevel']): number {
    if (level === 'Strict') return 85;
    if (level === 'Open') return 30;
    return 55;
}

const ProgressStrip: React.FC<{
    label: string;
    value: number;
    color: string;
}> = ({ label, value, color }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: panelColors.text3 }}>{label}</span>
            <span style={{ fontSize: 11, color: panelColors.text2, fontFamily: 'monospace' }}>
                {Math.round(value)}
            </span>
        </div>
        <div style={{
            width: '100%',
            height: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(148, 163, 184, 0.15)',
            overflow: 'hidden',
        }}>
            <div style={{
                width: `${clamp(value)}%`,
                height: '100%',
                borderRadius: 999,
                background: `linear-gradient(90deg, ${color}aa, ${color})`,
            }} />
        </div>
    </div>
);

export const LixTwinFusionPanel: React.FC<LixTwinFusionPanelProps> = ({
    soul,
    variant = 'full',
    onOpenLixMarket,
    onOpenAgentMarket,
    refreshSeed,
}) => {
    const { intents, solutionIntents, metrics } = useLIXStore();
    const twinContext = useMemo(() => buildMarketplaceTwinContext(), [soul]);
    const consent = useMemo(() => getProfileShareConsent(), [refreshSeed]);

    const intentDates = useMemo(() => intents.map((item) => item.created_at), [intents]);
    const solutionDates = useMemo(() => solutionIntents.map((item) => item.created_at), [solutionIntents]);
    const activityTrend = useMemo(() => toDailyTrend(intentDates, 7), [intentDates]);
    const deliveryTrend = useMemo(() => toDailyTrend(solutionDates, 7), [solutionDates]);

    const acceptanceRate = metrics.total_intents_broadcast > 0
        ? (metrics.total_accepted / metrics.total_intents_broadcast) * 100
        : 0;
    const solutionApprovalRate = metrics.total_solution_deliveries > 0
        ? (metrics.total_solution_approved / metrics.total_solution_deliveries) * 100
        : 0;

    const styleProfile = useMemo(() => {
        const communicationMapped = soul.communicationStyle === 'Professional' ? 80
            : soul.communicationStyle === 'Friendly' ? 65
                : soul.communicationStyle === 'Concise' ? 75
                    : 55;
        return {
            risk: normalizeSoulRisk(soul.riskTolerance),
            priceQuality: normalizeSoulPrice(soul.spendingPreference),
            privacy: normalizeSoulPrivacy(soul.privacyLevel),
            communication: communicationMapped,
        };
    }, [soul]);

    const compact = variant === 'compact';

    return (
        <div
            className="rounded-2xl p-4 space-y-4"
            style={{
                backgroundColor: panelColors.bg,
                border: `1px solid ${panelColors.border}`,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.18))',
                        border: `1px solid ${panelColors.border}`,
                    }}>
                        <Fingerprint size={16} color={panelColors.cyan} />
                    </div>
                    <div>
                        <div style={{ color: panelColors.text1, fontSize: 14, fontWeight: 600 }}>
                            LIX × Digital Twin Sync View
                        </div>
                        <div style={{ color: panelColors.text3, fontSize: 11 }}>
                            Unified market execution + twin preference visualization
                        </div>
                    </div>
                </div>
                <div style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    color: consent === 'revoked' ? panelColors.amber : panelColors.green,
                    backgroundColor: consent === 'revoked' ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                    border: `1px solid ${consent === 'revoked' ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.35)'}`,
                    fontFamily: 'monospace',
                }}>
                    consent: {consent}
                </div>
            </div>

            <div className={compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: panelColors.card, border: `1px solid ${panelColors.border}` }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Store size={14} color={panelColors.cyan} />
                        <span style={{ fontSize: 12, color: panelColors.text2, fontWeight: 600 }}>LIX Market Pulse</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(34,211,238,0.08)' }}>
                            <div style={{ fontSize: 10, color: panelColors.text3 }}>Broadcasts</div>
                            <div style={{ fontSize: 18, color: panelColors.text1, fontFamily: 'monospace' }}>
                                {metrics.total_intents_broadcast}
                            </div>
                        </div>
                        <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.08)' }}>
                            <div style={{ fontSize: 10, color: panelColors.text3 }}>Offers</div>
                            <div style={{ fontSize: 18, color: panelColors.text1, fontFamily: 'monospace' }}>
                                {metrics.total_offers_received}
                            </div>
                        </div>
                        <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.08)' }}>
                            <div style={{ fontSize: 10, color: panelColors.text3 }}>Acceptance</div>
                            <div style={{ fontSize: 18, color: panelColors.text1, fontFamily: 'monospace' }}>
                                {Math.round(acceptanceRate)}%
                            </div>
                        </div>
                        <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.08)' }}>
                            <div style={{ fontSize: 10, color: panelColors.text3 }}>Solution pass</div>
                            <div style={{ fontSize: 18, color: panelColors.text1, fontFamily: 'monospace' }}>
                                {Math.round(solutionApprovalRate)}%
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 8 }}>
                        <div>
                            <div style={{ fontSize: 10, color: panelColors.text3, marginBottom: 4 }}>Intent activity 7d</div>
                            <MiniLineChart
                                data={activityTrend}
                                width={compact ? 300 : 150}
                                height={52}
                                color="deepskyblue"
                                showDots={false}
                                showArea
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: panelColors.text3, marginBottom: 4 }}>Delivery trend 7d</div>
                            <MiniLineChart
                                data={deliveryTrend}
                                width={compact ? 300 : 150}
                                height={52}
                                color="mediumseagreen"
                                showDots={false}
                                showArea
                            />
                        </div>
                    </div>
                </div>

                <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: panelColors.card, border: `1px solid ${panelColors.border}` }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <UserRound size={14} color={panelColors.purple} />
                        <span style={{ fontSize: 12, color: panelColors.text2, fontWeight: 600 }}>Digital Twin Fit</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)' }}>
                            <div style={{ fontSize: 10, color: panelColors.text3 }}>Profile fit</div>
                            <div style={{ fontSize: 18, color: panelColors.text1, fontFamily: 'monospace' }}>
                                {clamp(twinContext.profile_completeness)}%
                            </div>
                        </div>
                        <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.10)' }}>
                            <div style={{ fontSize: 10, color: panelColors.text3 }}>Evidence mode</div>
                            <div style={{ fontSize: 13, color: panelColors.text1, fontFamily: 'monospace', marginTop: 6 }}>
                                {twinContext.preferences.preferred_evidence_level}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mb-3">
                        <ProgressStrip label="Risk appetite" value={styleProfile.risk} color={panelColors.purple} />
                        <ProgressStrip label="Price vs quality" value={styleProfile.priceQuality} color={panelColors.cyan} />
                        <ProgressStrip label="Privacy protection" value={styleProfile.privacy} color={panelColors.amber} />
                        <ProgressStrip label="Communication precision" value={styleProfile.communication} color={panelColors.green} />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(twinContext.preferences.preferred_domains.length > 0
                            ? twinContext.preferences.preferred_domains
                            : ['general']).slice(0, 4).map((domain) => (
                            <span
                                key={domain}
                                style={{
                                    fontSize: 10,
                                    color: panelColors.text2,
                                    padding: '3px 7px',
                                    borderRadius: 999,
                                    backgroundColor: 'rgba(148,163,184,0.12)',
                                    border: `1px solid ${panelColors.border}`,
                                    fontFamily: 'monospace',
                                }}
                            >
                                {domain}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {!compact && (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={onOpenLixMarket}
                        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'rgba(34,211,238,0.14)',
                            color: panelColors.cyan,
                            border: `1px solid rgba(34,211,238,0.3)`,
                        }}
                    >
                        <Activity size={14} />
                        Market board
                    </button>
                    <button
                        onClick={onOpenAgentMarket}
                        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'rgba(167,139,250,0.14)',
                            color: panelColors.purple,
                            border: `1px solid rgba(167,139,250,0.3)`,
                        }}
                    >
                        <Bot size={14} />
                        Agent execution
                    </button>
                </div>
            )}

            {compact && (
                <div className="flex items-center gap-2" style={{ color: panelColors.text3, fontSize: 11 }}>
                    <Shield size={12} />
                    <span>
                        Policy signal:
                        <span style={{ color: panelColors.text2, marginLeft: 4 }}>
                            {twinContext.privacy_mode ? 'privacy-first routing' : 'balanced routing'}
                        </span>
                    </span>
                    <Target size={12} style={{ marginLeft: 'auto', color: panelColors.green }} />
                    <span style={{ color: panelColors.text2 }}>
                        avg first offer {metrics.avg_first_offer_seconds.toFixed(1)}s
                    </span>
                    <Zap size={12} style={{ color: panelColors.amber }} />
                </div>
            )}
        </div>
    );
};

export default LixTwinFusionPanel;

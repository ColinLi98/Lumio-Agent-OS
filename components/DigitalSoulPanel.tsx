import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { SoulMatrix } from '../types';
import { DigitalSoulStats, getDigitalSoulStats } from '../services/digitalSoulService';

interface DigitalSoulPanelProps {
    soul: SoulMatrix;
    isDark?: boolean;
}

const STYLE_LABELS: Record<SoulMatrix['communicationStyle'], string> = {
    Professional: '专业',
    Friendly: '亲切',
    Casual: '轻松',
    Concise: '简洁'
};

const STYLE_COLORS: Record<SoulMatrix['communicationStyle'], string> = {
    Professional: 'bg-blue-500',
    Friendly: 'bg-emerald-500',
    Casual: 'bg-amber-500',
    Concise: 'bg-purple-500'
};

const RISK_LABELS: Record<SoulMatrix['riskTolerance'], string> = {
    Low: '稳健',
    Medium: '平衡',
    High: '探索'
};

const SPENDING_LABELS: Record<SoulMatrix['spendingPreference'], string> = {
    PriceFirst: '价格优先',
    Balanced: '均衡',
    QualityFirst: '品质优先'
};

const SPENDING_COLORS: Record<SoulMatrix['spendingPreference'], string> = {
    PriceFirst: 'text-green-500',
    Balanced: 'text-blue-500',
    QualityFirst: 'text-purple-500'
};

const SPENDING_EMOJIS: Record<SoulMatrix['spendingPreference'], string> = {
    PriceFirst: '💰',
    Balanced: '⚖️',
    QualityFirst: '✨'
};

function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return '尚未更新';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 60000) return '刚刚更新';
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
}

function riskScoreFallback(risk: SoulMatrix['riskTolerance']): number {
    if (risk === 'Low') return 0.3;
    if (risk === 'Medium') return 0.6;
    return 0.85;
}

export const DigitalSoulPanel: React.FC<DigitalSoulPanelProps> = ({ soul, isDark = false }) => {
    const [stats, setStats] = useState<DigitalSoulStats>(() => getDigitalSoulStats());
    const previousSoulRef = useRef<SoulMatrix>(soul);

    useEffect(() => {
        setStats(getDigitalSoulStats());
    }, [soul]);

    const riskScore = Number.isFinite(stats.riskScore) ? stats.riskScore : riskScoreFallback(soul.riskTolerance);
    const riskPercent = Math.round(riskScore * 100);

    const styleWeights = useMemo(() => {
        const weights = stats.styleWeights;
        if (weights) return weights;
        return {
            Professional: soul.communicationStyle === 'Professional' ? 1 : 0,
            Friendly: soul.communicationStyle === 'Friendly' ? 1 : 0,
            Casual: soul.communicationStyle === 'Casual' ? 1 : 0,
            Concise: soul.communicationStyle === 'Concise' ? 1 : 0
        };
    }, [stats.styleWeights, soul]);

    const previousSoul = previousSoulRef.current;
    const styleChanged = previousSoul.communicationStyle !== soul.communicationStyle;
    const riskChanged = previousSoul.riskTolerance !== soul.riskTolerance;
    const spendingChanged = previousSoul.spendingPreference !== soul.spendingPreference;

    useEffect(() => {
        previousSoulRef.current = soul;
    }, [soul]);

    return (
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-500" />
                    <div>
                        <div className="text-sm font-semibold">Digital Soul 动态画像</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatRelativeTime(stats.lastUpdatedAt)}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setStats(getDigitalSoulStats())}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-800'}`}
                >
                    <RefreshCw size={12} />
                    刷新
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <div className="text-xs text-gray-500">沟通风格</div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
                        {STYLE_LABELS[soul.communicationStyle]}
                        {styleChanged && <TrendingUp size={12} className="text-emerald-400" />}
                    </div>
                </div>
                <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <div className="text-xs text-gray-500">消费偏好</div>
                    <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${SPENDING_COLORS[soul.spendingPreference || 'Balanced']}`}>
                        <span>{SPENDING_EMOJIS[soul.spendingPreference || 'Balanced']}</span>
                        {SPENDING_LABELS[soul.spendingPreference || 'Balanced']}
                        {spendingChanged && <TrendingUp size={12} className="text-emerald-400" />}
                    </div>
                </div>
                <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <div className="text-xs text-gray-500">风险倾向</div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
                        {RISK_LABELS[soul.riskTolerance]}
                        {riskChanged && <TrendingDown size={12} className="text-amber-400" />}
                    </div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {(Object.keys(styleWeights) as Array<SoulMatrix['communicationStyle']>).map((style) => {
                    const percent = Math.round((styleWeights[style] || 0) * 100);
                    return (
                        <div key={style}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{STYLE_LABELS[style]}</span>
                                <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{percent}%</span>
                            </div>
                            <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div
                                    className={`h-2 rounded-full ${STYLE_COLORS[style]} transition-all`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>探索指数</span>
                    <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{riskPercent}%</span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                        className="h-2 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${riskPercent}%` }}
                    />
                </div>
                <div className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    接受 {stats.draftsAccepted} · 调整 {stats.draftsEdited}
                </div>
            </div>
        </div>
    );
};

export default DigitalSoulPanel;

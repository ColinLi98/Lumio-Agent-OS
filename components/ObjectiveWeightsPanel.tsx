/**
 * Objective Weights Panel - Phase 2 Week 3-3
 * 
 * User priority sliders for Time, Money, Risk, Energy, and Growth.
 * These weights personalize plan generation.
 */

import React from 'react';
import {
    Clock,
    DollarSign,
    AlertTriangle,
    Zap,
    TrendingUp,
    RotateCcw,
} from 'lucide-react';
import { getSoulMatrixStore, ObjectiveWeights } from '../services/soulMatrixStore';

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    bg1: 'rgba(30, 30, 45, 0.95)',
    bg2: 'rgba(45, 45, 65, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
    text1: '#ffffff',
    text2: 'rgba(255, 255, 255, 0.85)',
    text3: 'rgba(255, 255, 255, 0.6)',
    primary: '#6366f1',
    primaryGlow: 'rgba(99, 102, 241, 0.3)',
    time: '#3b82f6',
    money: '#22c55e',
    risk: '#f59e0b',
    energy: '#ec4899',
    growth: '#8b5cf6',
};

// ============================================================================
// Weight Dimension Config
// ============================================================================

interface WeightDimension {
    key: keyof ObjectiveWeights;
    label: string;
    labelLow: string;
    labelHigh: string;
    icon: React.ReactNode;
    color: string;
    description: string;
}

const weightDimensions: WeightDimension[] = [
    {
        key: 'time',
        label: '时间',
        labelLow: '不急，可以慢慢来',
        labelHigh: '越快越好',
        icon: <Clock size={18} />,
        color: colors.time,
        description: '时间效率优先级',
    },
    {
        key: 'money',
        label: '成本',
        labelLow: '愿意为质量付费',
        labelHigh: '尽量省钱',
        icon: <DollarSign size={18} />,
        color: colors.money,
        description: '成本节约优先级',
    },
    {
        key: 'risk',
        label: '冒险',
        labelLow: '稳妥方案',
        labelHigh: '愿意尝试新事物',
        icon: <AlertTriangle size={18} />,
        color: colors.risk,
        description: '风险承受能力',
    },
    {
        key: 'energy',
        label: '精力',
        labelLow: '愿意投入精力',
        labelHigh: '希望省心省力',
        icon: <Zap size={18} />,
        color: colors.energy,
        description: '精力消耗偏好',
    },
    {
        key: 'growth',
        label: '成长',
        labelLow: '偏好熟悉的方式',
        labelHigh: '重视学习机会',
        icon: <TrendingUp size={18} />,
        color: colors.growth,
        description: '学习成长优先级',
    },
];

// ============================================================================
// Component Props
// ============================================================================

interface ObjectiveWeightsPanelProps {
    onClose?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const ObjectiveWeightsPanel: React.FC<ObjectiveWeightsPanelProps> = ({
    onClose,
}) => {
    const [weights, setWeights] = React.useState<ObjectiveWeights>(() =>
        getSoulMatrixStore().getObjectiveWeights()
    );

    // Subscribe to weight changes
    React.useEffect(() => {
        const store = getSoulMatrixStore();
        return store.subscribe(() => {
            setWeights(store.getObjectiveWeights());
        });
    }, []);

    const handleWeightChange = (key: keyof ObjectiveWeights, value: number) => {
        const newWeights = { ...weights, [key]: value };
        setWeights(newWeights);
        getSoulMatrixStore().setObjectiveWeights({ [key]: value });
    };

    const handleReset = () => {
        getSoulMatrixStore().resetObjectiveWeights();
    };

    return (
        <div style={{
            background: colors.bg1,
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${colors.border}`,
            width: '100%',
            maxWidth: 400,
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
            }}>
                <div>
                    <h3 style={{
                        color: colors.text1,
                        fontSize: 16,
                        fontWeight: 600,
                        margin: 0,
                    }}>
                        生活目标权重
                    </h3>
                    <p style={{
                        color: colors.text3,
                        fontSize: 12,
                        margin: '4px 0 0 0',
                    }}>
                        调整这些偏好来个性化你的计划建议
                    </p>
                </div>
                <button
                    onClick={handleReset}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        padding: '6px 12px',
                        color: colors.text3,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
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
                    <RotateCcw size={14} />
                    重置
                </button>
            </div>

            {/* Weight Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {weightDimensions.map((dim) => (
                    <WeightSlider
                        key={dim.key}
                        dimension={dim}
                        value={weights[dim.key]}
                        onChange={(v) => handleWeightChange(dim.key, v)}
                    />
                ))}
            </div>

            {/* Preview */}
            <div style={{
                marginTop: 20,
                padding: 12,
                background: colors.bg2,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
            }}>
                <div style={{
                    color: colors.text3,
                    fontSize: 11,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    当前偏好总结
                </div>
                <div style={{
                    color: colors.text2,
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                }}>
                    {getSoulMatrixStore().getWeightsPrompt()}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Weight Slider Component
// ============================================================================

interface WeightSliderProps {
    dimension: WeightDimension;
    value: number;
    onChange: (value: number) => void;
}

const WeightSlider: React.FC<WeightSliderProps> = ({
    dimension,
    value,
    onChange,
}) => {
    const { label, labelLow, labelHigh, icon, color } = dimension;

    return (
        <div>
            {/* Label Row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
            }}>
                <span style={{ color }}>{icon}</span>
                <span style={{
                    color: colors.text1,
                    fontSize: 14,
                    fontWeight: 500,
                }}>
                    {label}
                </span>
                <span style={{
                    marginLeft: 'auto',
                    color,
                    fontSize: 13,
                    fontWeight: 600,
                }}>
                    {value}
                </span>
            </div>

            {/* Slider */}
            <div style={{ position: 'relative' }}>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value, 10))}
                    style={{
                        width: '100%',
                        height: 6,
                        appearance: 'none',
                        background: `linear-gradient(to right, ${color} ${value}%, ${colors.bg2} ${value}%)`,
                        borderRadius: 3,
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                />
            </div>

            {/* Low/High Labels */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 4,
            }}>
                <span style={{ color: colors.text3, fontSize: 10 }}>
                    {labelLow}
                </span>
                <span style={{ color: colors.text3, fontSize: 10 }}>
                    {labelHigh}
                </span>
            </div>
        </div>
    );
};

export default ObjectiveWeightsPanel;

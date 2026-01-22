import React from 'react';
import { TrendData } from '../types';

// ============================================================================
// Mini Line Chart - 迷你折线图
// ============================================================================

interface MiniLineChartProps {
    data: TrendData[];
    width?: number;
    height?: number;
    color?: string;
    showDots?: boolean;
    showArea?: boolean;
}

export const MiniLineChart: React.FC<MiniLineChartProps> = ({
    data,
    width = 200,
    height = 60,
    color = '#a855f7',
    showDots = true,
    showArea = true
}) => {
    if (data.length < 2) {
        return (
            <div className="text-xs text-slate-500 text-center py-4">
                数据不足，需要至少2个数据点
            </div>
        );
    }

    const padding = { top: 10, right: 10, bottom: 20, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // 生成点坐标
    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight,
        data: d
    }));

    // 生成折线路径
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // 生成填充区域路径
    const areaPath = linePath +
        ` L ${points[points.length - 1].x} ${padding.top + chartHeight}` +
        ` L ${points[0].x} ${padding.top + chartHeight} Z`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            {/* 渐变定义 */}
            <defs>
                <linearGradient id={`areaGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>

            {/* 填充区域 */}
            {showArea && (
                <path
                    d={areaPath}
                    fill={`url(#areaGradient-${color})`}
                />
            )}

            {/* 折线 */}
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* 数据点 */}
            {showDots && points.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:r-4 transition-all"
                />
            ))}

            {/* X轴标签 (简化显示首尾) */}
            <text
                x={padding.left}
                y={height - 2}
                className="text-[10px] fill-slate-500"
                textAnchor="start"
            >
                {data[0].date.slice(5)}
            </text>
            <text
                x={width - padding.right}
                y={height - 2}
                className="text-[10px] fill-slate-500"
                textAnchor="end"
            >
                {data[data.length - 1].date.slice(5)}
            </text>
        </svg>
    );
};

// ============================================================================
// Mood Trend Chart - 情绪趋势图
// ============================================================================

interface MoodTrendChartProps {
    data: TrendData[];
    days?: 7 | 14 | 30;
}

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
    data,
    days = 7
}) => {
    // 过滤最近N天数据
    const recentData = data.slice(-days);

    // 计算趋势
    const trend = recentData.length >= 2
        ? recentData[recentData.length - 1].value - recentData[0].value
        : 0;

    const trendIcon = trend > 10 ? '📈' : trend < -10 ? '📉' : '➡️';
    const trendText = trend > 10 ? '上升' : trend < -10 ? '下降' : '稳定';
    const trendColor = trend > 10 ? 'text-green-400' : trend < -10 ? 'text-red-400' : 'text-slate-400';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">近{days}天情绪</span>
                <span className={`text-xs ${trendColor}`}>
                    {trendIcon} {trendText}
                </span>
            </div>
            <MiniLineChart
                data={recentData}
                width={260}
                height={50}
                color={trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#a855f7'}
            />
        </div>
    );
};

// ============================================================================
// Activity Bar Chart - 活跃度柱状图
// ============================================================================

interface ActivityBarChartProps {
    data: TrendData[];
    maxBars?: number;
}

export const ActivityBarChart: React.FC<ActivityBarChartProps> = ({
    data,
    maxBars = 7
}) => {
    const recentData = data.slice(-maxBars);
    const maxValue = Math.max(...recentData.map(d => d.value), 1);

    return (
        <div className="space-y-2">
            <div className="text-xs text-slate-400">每日活跃度</div>
            <div className="flex items-end gap-1 h-12">
                {recentData.map((d, i) => {
                    const height = (d.value / maxValue) * 100;
                    const isToday = i === recentData.length - 1;
                    return (
                        <div
                            key={d.date}
                            className="flex-1 flex flex-col items-center"
                            title={`${d.date}: ${d.value} 次交互`}
                        >
                            <div
                                className={`w-full rounded-t transition-all ${isToday
                                    ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                                    : 'bg-slate-600 hover:bg-slate-500'
                                    }`}
                                style={{ height: `${Math.max(height, 5)}%` }}
                            />
                            <span className="text-[8px] text-slate-500 mt-1">
                                {d.date.slice(8)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// Personality Trend - 性格变化趋势
// ============================================================================

interface PersonalityTrendProps {
    current: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
    };
    previous?: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
    };
}

export const PersonalityTrend: React.FC<PersonalityTrendProps> = ({
    current,
    previous
}) => {
    const dimensions = [
        { key: 'openness', label: '开放性', current: current.openness, previous: previous?.openness },
        { key: 'conscientiousness', label: '尽责性', current: current.conscientiousness, previous: previous?.conscientiousness },
        { key: 'extraversion', label: '外向性', current: current.extraversion, previous: previous?.extraversion },
        { key: 'agreeableness', label: '宜人性', current: current.agreeableness, previous: previous?.agreeableness },
        { key: 'neuroticism', label: '稳定性', current: 100 - current.neuroticism, previous: previous ? 100 - previous.neuroticism : undefined },
    ];

    return (
        <div className="space-y-2">
            {dimensions.map(d => {
                const change = d.previous !== undefined ? d.current - d.previous : 0;
                const changeIcon = change > 5 ? '↑' : change < -5 ? '↓' : '';
                const changeColor = change > 5 ? 'text-green-400' : change < -5 ? 'text-red-400' : 'text-slate-400';

                return (
                    <div key={d.key} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-14">{d.label}</span>
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${d.current}%` }}
                            />
                        </div>
                        <span className="text-xs text-white w-8 text-right">{d.current}</span>
                        {change !== 0 && (
                            <span className={`text-[10px] w-6 ${changeColor}`}>
                                {changeIcon}{Math.abs(change)}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// Comparison Card - 对比卡片
// ============================================================================

interface ComparisonCardProps {
    label: string;
    current: number;
    previous: number;
    unit?: string;
    format?: 'number' | 'percent';
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
    label,
    current,
    previous,
    unit = '',
    format = 'number'
}) => {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const changeText = change > 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
    const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-400';

    return (
        <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">
                    {format === 'percent' ? `${current}%` : current}
                    {unit}
                </span>
                {previous > 0 && (
                    <span className={`text-xs ${changeColor}`}>
                        {changeText}
                    </span>
                )}
            </div>
        </div>
    );
};

export default {
    MiniLineChart,
    MoodTrendChart,
    ActivityBarChart,
    PersonalityTrend,
    ComparisonCard
};

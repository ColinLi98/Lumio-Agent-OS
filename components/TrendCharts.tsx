import React from 'react';
import { TrendData } from '../types';

// ============================================================================
// Mini Line Chart
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
                Not enough data. At least 2 points are required.
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

    // Generate point coordinates
    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight,
        data: d
    }));

    // Generate polyline path
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Generate area fill path
    const areaPath = linePath +
        ` L ${points[points.length - 1].x} ${padding.top + chartHeight}` +
        ` L ${points[0].x} ${padding.top + chartHeight} Z`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            {/* Gradient definition */}
            <defs>
                <linearGradient id={`areaGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>

            {/* Filled area */}
            {showArea && (
                <path
                    d={areaPath}
                    fill={`url(#areaGradient-${color})`}
                />
            )}

            {/* Line */}
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Data points */}
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

            {/* X-axis labels (show first and last only) */}
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
// Mood Trend Chart
// ============================================================================

interface MoodTrendChartProps {
    data: TrendData[];
    days?: 7 | 14 | 30;
}

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
    data,
    days = 7
}) => {
    // Filter recent N-day data
    const recentData = data.slice(-days);

    // Calculate trend
    const trend = recentData.length >= 2
        ? recentData[recentData.length - 1].value - recentData[0].value
        : 0;

    const trendIcon = trend > 10 ? '📈' : trend < -10 ? '📉' : '➡️';
    const trendText = trend > 10 ? 'Upward' : trend < -10 ? 'Downward' : 'Stable';
    const trendColor = trend > 10 ? 'text-green-400' : trend < -10 ? 'text-red-400' : 'text-slate-400';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Mood over last {days} days</span>
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
// Activity Bar Chart
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
            <div className="text-xs text-slate-400">Daily activity</div>
            <div className="flex items-end gap-1 h-12">
                {recentData.map((d, i) => {
                    const height = (d.value / maxValue) * 100;
                    const isToday = i === recentData.length - 1;
                    return (
                        <div
                            key={d.date}
                            className="flex-1 flex flex-col items-center"
                            title={`${d.date}: ${d.value} interactions`}
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
// Personality Trend
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
        { key: 'openness', label: 'Openness', current: current.openness, previous: previous?.openness },
        { key: 'conscientiousness', label: 'Conscientiousness', current: current.conscientiousness, previous: previous?.conscientiousness },
        { key: 'extraversion', label: 'Extraversion', current: current.extraversion, previous: previous?.extraversion },
        { key: 'agreeableness', label: 'Agreeableness', current: current.agreeableness, previous: previous?.agreeableness },
        { key: 'neuroticism', label: 'Emotional Stability', current: 100 - current.neuroticism, previous: previous ? 100 - previous.neuroticism : undefined },
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
// Comparison Card
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

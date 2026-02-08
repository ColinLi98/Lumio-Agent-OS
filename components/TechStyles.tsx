/**
 * TechStyles.tsx — 科技风共享样式组件库
 * Shared futuristic / sci-fi design system for LIX & Agent Marketplace
 */

import React, { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

// ============================================================================
// Color Palette
// ============================================================================

export const techColors = {
    // Accent neons
    cyan: '#00eaff',
    cyanMuted: 'rgba(0, 234, 255, 0.15)',
    cyanGlow: 'rgba(0, 234, 255, 0.35)',
    purple: '#a855f7',
    purpleMuted: 'rgba(168, 85, 247, 0.15)',
    purpleGlow: 'rgba(168, 85, 247, 0.35)',
    green: '#00ff88',
    greenMuted: 'rgba(0, 255, 136, 0.15)',
    greenGlow: 'rgba(0, 255, 136, 0.35)',
    gold: '#fbbf24',
    goldMuted: 'rgba(251, 191, 36, 0.15)',
    goldGlow: 'rgba(251, 191, 36, 0.35)',
    red: '#ff4466',
    redMuted: 'rgba(255, 68, 102, 0.15)',

    // Surfaces
    bg0: '#060a14',
    bg1: '#0c1222',
    bg2: 'rgba(15, 23, 42, 0.75)',
    bg3: 'rgba(30, 41, 59, 0.6)',
    bgCard: 'rgba(12, 18, 34, 0.85)',

    // Text
    text1: '#f0f6ff',
    text2: '#94a3b8',
    text3: '#4a5568',

    // Borders
    border: 'rgba(0, 234, 255, 0.08)',
    borderHover: 'rgba(0, 234, 255, 0.25)',
    borderGold: 'rgba(251, 191, 36, 0.2)',
};

// ============================================================================
// CSS Keyframes (injected once)
// ============================================================================

const KEYFRAMES_ID = '__tech_styles_keyframes__';

const keyframesCSS = `
@keyframes techPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
@keyframes techGlow {
    0%, 100% { box-shadow: 0 0 8px rgba(0,234,255,0.2), inset 0 0 8px rgba(0,234,255,0.05); }
    50% { box-shadow: 0 0 20px rgba(0,234,255,0.35), inset 0 0 12px rgba(0,234,255,0.1); }
}
@keyframes techScanLine {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(400%); }
}
@keyframes techShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
@keyframes techBorderRotate {
    0% { --angle: 0deg; }
    100% { --angle: 360deg; }
}
@keyframes techPulseRing {
    0% { transform: scale(0.85); opacity: 1; }
    100% { transform: scale(1.8); opacity: 0; }
}
@keyframes techFadeIn {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
}
@keyframes techCountUp {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: translateY(0); }
}
`;

export function TechKeyframesInjector() {
    useEffect(() => {
        if (document.getElementById(KEYFRAMES_ID)) return;
        const style = document.createElement('style');
        style.id = KEYFRAMES_ID;
        style.textContent = keyframesCSS;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, []);
    return null;
}

// ============================================================================
// Hex Grid Background
// ============================================================================

export const HexGridBackground: React.FC<{
    children?: ReactNode;
    style?: CSSProperties;
}> = ({ children, style }) => (
    <div style={{
        position: 'relative',
        background: `
            radial-gradient(ellipse at 20% 50%, rgba(0,234,255,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.05) 0%, transparent 50%),
            ${techColors.bg0}
        `,
        ...style,
    }}>
        {/* Hex grid overlay */}
        <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z' fill='none' stroke='rgba(0,234,255,0.04)' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
            pointerEvents: 'none',
            zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
        </div>
    </div>
);

// ============================================================================
// Gradient Heading
// ============================================================================

export const GradientHeading: React.FC<{
    children: ReactNode;
    size?: number;
    from?: string;
    to?: string;
    icon?: ReactNode;
    subtitle?: string;
    style?: CSSProperties;
}> = ({ children, size = 22, from = techColors.cyan, to = techColors.purple, icon, subtitle, style }) => (
    <div style={style}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon && <span style={{ filter: `drop-shadow(0 0 6px ${from})` }}>{icon}</span>}
            <h1 style={{
                fontSize: size,
                fontWeight: 800,
                margin: 0,
                background: `linear-gradient(135deg, ${from}, ${to})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                letterSpacing: '0.02em',
            }}>
                {children}
            </h1>
        </div>
        {subtitle && (
            <p style={{
                color: techColors.text3,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                margin: '6px 0 0 0',
                fontFamily: 'monospace',
            }}>
                {subtitle}
            </p>
        )}
    </div>
);

// ============================================================================
// Glow Card
// ============================================================================

export const GlowCard: React.FC<{
    children: ReactNode;
    glowColor?: string;
    style?: CSSProperties;
    hoverGlow?: boolean;
    onClick?: () => void;
    className?: string;
}> = ({ children, glowColor = techColors.cyan, style, hoverGlow = true, onClick, className }) => {
    const ref = useRef<HTMLDivElement>(null);

    const handleEnter = () => {
        if (!hoverGlow || !ref.current) return;
        ref.current.style.borderColor = glowColor.replace(')', ',0.35)').replace('rgba', 'rgba').replace('rgb(', 'rgba(');
        ref.current.style.boxShadow = `0 0 24px ${glowColor.replace(')', ',0.15)').replace('rgb(', 'rgba(')}`;
    };
    const handleLeave = () => {
        if (!ref.current) return;
        ref.current.style.borderColor = techColors.border;
        ref.current.style.boxShadow = `0 0 8px rgba(0,0,0,0.3)`;
    };

    return (
        <div
            ref={ref}
            className={className}
            onClick={onClick}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            style={{
                position: 'relative',
                background: techColors.bgCard,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${techColors.border}`,
                borderRadius: 14,
                padding: 16,
                transition: 'border-color 0.3s, box-shadow 0.3s',
                boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                cursor: onClick ? 'pointer' : undefined,
                ...style,
            }}
        >
            {/* Corner brackets */}
            <span style={{
                position: 'absolute', top: 4, left: 4, width: 12, height: 12,
                borderTop: `2px solid ${glowColor}`, borderLeft: `2px solid ${glowColor}`,
                borderRadius: '3px 0 0 0', opacity: 0.5, pointerEvents: 'none',
            }} />
            <span style={{
                position: 'absolute', top: 4, right: 4, width: 12, height: 12,
                borderTop: `2px solid ${glowColor}`, borderRight: `2px solid ${glowColor}`,
                borderRadius: '0 3px 0 0', opacity: 0.5, pointerEvents: 'none',
            }} />
            <span style={{
                position: 'absolute', bottom: 4, left: 4, width: 12, height: 12,
                borderBottom: `2px solid ${glowColor}`, borderLeft: `2px solid ${glowColor}`,
                borderRadius: '0 0 0 3px', opacity: 0.5, pointerEvents: 'none',
            }} />
            <span style={{
                position: 'absolute', bottom: 4, right: 4, width: 12, height: 12,
                borderBottom: `2px solid ${glowColor}`, borderRight: `2px solid ${glowColor}`,
                borderRadius: '0 0 3px 0', opacity: 0.5, pointerEvents: 'none',
            }} />
            {children}
        </div>
    );
};

// ============================================================================
// Neon Badge
// ============================================================================

type NeonBadgeVariant = 'cyan' | 'green' | 'purple' | 'gold' | 'red';

const badgeColors: Record<NeonBadgeVariant, { bg: string; border: string; text: string }> = {
    cyan: { bg: techColors.cyanMuted, border: techColors.cyan, text: techColors.cyan },
    green: { bg: techColors.greenMuted, border: techColors.green, text: techColors.green },
    purple: { bg: techColors.purpleMuted, border: techColors.purple, text: techColors.purple },
    gold: { bg: techColors.goldMuted, border: techColors.gold, text: techColors.gold },
    red: { bg: techColors.redMuted, border: techColors.red, text: techColors.red },
};

export const NeonBadge: React.FC<{
    children: ReactNode;
    variant?: NeonBadgeVariant;
    size?: 'sm' | 'md';
    pulse?: boolean;
    style?: CSSProperties;
}> = ({ children, variant = 'cyan', size = 'sm', pulse, style }) => {
    const c = badgeColors[variant];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: size === 'sm' ? '2px 8px' : '4px 12px',
            borderRadius: 20,
            fontSize: size === 'sm' ? 10 : 12,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: c.text,
            backgroundColor: c.bg,
            border: `1px solid ${c.border}40`,
            boxShadow: `0 0 8px ${c.border}30`,
            animation: pulse ? 'techPulse 2s ease-in-out infinite' : undefined,
            ...style,
        }}>
            {children}
        </span>
    );
};

// ============================================================================
// Metric Box
// ============================================================================

export const MetricBox: React.FC<{
    label: string;
    value: string | number;
    icon?: ReactNode;
    accent?: string;
    style?: CSSProperties;
}> = ({ label, value, icon, accent = techColors.cyan, style }) => (
    <div style={{
        flex: 1,
        padding: '14px 12px',
        borderRadius: 12,
        background: techColors.bgCard,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${accent}15`,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        ...style,
    }}>
        {/* Subtle top accent line */}
        <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            borderRadius: '0 0 4px 4px',
        }} />
        {icon && <div style={{ marginBottom: 6, filter: `drop-shadow(0 0 4px ${accent})` }}>{icon}</div>}
        <div style={{
            color: accent,
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            textShadow: `0 0 12px ${accent}50`,
            animation: 'techCountUp 0.5s ease-out',
        }}>
            {value}
        </div>
        <div style={{
            color: techColors.text3,
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 4,
            fontFamily: 'monospace',
        }}>
            {label}
        </div>
    </div>
);

// ============================================================================
// Progress Bar
// ============================================================================

export const TechProgressBar: React.FC<{
    value: number; // 0..1
    max?: number;
    color?: string;
    height?: number;
    label?: string;
    showPercent?: boolean;
    style?: CSSProperties;
}> = ({ value, max = 1, color = techColors.cyan, height = 6, label, showPercent = true, style }) => {
    const pct = Math.min(Math.max((value / max) * 100, 0), 100);
    return (
        <div style={{ ...style }}>
            {(label || showPercent) && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 4, fontSize: 11, color: techColors.text2,
                }}>
                    {label && <span>{label}</span>}
                    {showPercent && (
                        <span style={{ fontFamily: 'monospace', color, fontSize: 11, fontWeight: 600 }}>
                            {pct.toFixed(0)}%
                        </span>
                    )}
                </div>
            )}
            <div style={{
                height,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: height,
                overflow: 'hidden',
                position: 'relative',
            }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}90, ${color})`,
                    borderRadius: height,
                    boxShadow: `0 0 8px ${color}50`,
                    transition: 'width 0.6s ease-out',
                }} />
            </div>
        </div>
    );
};

// ============================================================================
// Pulse Ring (connection indicator)
// ============================================================================

export const PulseRing: React.FC<{
    color?: string;
    size?: number;
    active?: boolean;
}> = ({ color = techColors.green, size = 10, active = true }) => (
    <span style={{
        display: 'inline-block',
        position: 'relative',
        width: size, height: size,
    }}>
        <span style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
        }} />
        {active && (
            <span style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                animation: 'techPulseRing 1.5s ease-out infinite',
            }} />
        )}
    </span>
);

// ============================================================================
// Scan Line Decoration
// ============================================================================

export const ScanLine: React.FC<{ color?: string }> = ({ color = techColors.cyan }) => (
    <div style={{
        overflow: 'hidden', height: 1,
        position: 'relative', margin: '10px 0',
    }}>
        <div style={{
            position: 'absolute',
            width: '40%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            animation: 'techShimmer 3s linear infinite',
            backgroundSize: '200% 100%',
        }} />
        <div style={{
            width: '100%', height: '100%',
            backgroundColor: `${color}15`,
        }} />
    </div>
);

// ============================================================================
// Tech Button
// ============================================================================

export const TechButton: React.FC<{
    children: ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    icon?: ReactNode;
    fullWidth?: boolean;
    style?: CSSProperties;
}> = ({ children, onClick, variant = 'primary', disabled, icon, fullWidth, style }) => {
    const ref = useRef<HTMLButtonElement>(null);

    const isPrimary = variant === 'primary';
    const isGhost = variant === 'ghost';

    const baseStyle: CSSProperties = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: isPrimary ? '14px 24px' : '10px 16px',
        borderRadius: 12,
        fontSize: isPrimary ? 15 : 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.3s',
        width: fullWidth ? '100%' : undefined,
        border: 'none',
        ...(isPrimary ? {
            background: `linear-gradient(135deg, ${techColors.cyan}, ${techColors.purple})`,
            color: '#fff',
            boxShadow: `0 0 20px rgba(0,234,255,0.25), 0 0 40px rgba(168,85,247,0.15)`,
        } : isGhost ? {
            background: 'transparent',
            color: techColors.cyan,
            border: `1px solid ${techColors.border}`,
        } : {
            background: techColors.bgCard,
            color: techColors.text1,
            border: `1px solid ${techColors.border}`,
        }),
        ...style,
    };

    return (
        <button
            ref={ref}
            onClick={disabled ? undefined : onClick}
            style={baseStyle}
            onMouseEnter={() => {
                if (ref.current && !disabled) {
                    if (isPrimary) {
                        ref.current.style.boxShadow = `0 0 30px rgba(0,234,255,0.4), 0 0 60px rgba(168,85,247,0.25)`;
                        ref.current.style.transform = 'translateY(-1px)';
                    } else {
                        ref.current.style.borderColor = techColors.cyan;
                        ref.current.style.boxShadow = `0 0 12px ${techColors.cyanGlow}`;
                    }
                }
            }}
            onMouseLeave={() => {
                if (ref.current) {
                    ref.current.style.transform = 'translateY(0)';
                    if (isPrimary) {
                        ref.current.style.boxShadow = `0 0 20px rgba(0,234,255,0.25), 0 0 40px rgba(168,85,247,0.15)`;
                    } else {
                        ref.current.style.borderColor = techColors.border;
                        ref.current.style.boxShadow = 'none';
                    }
                }
            }}
        >
            {icon}
            {children}
        </button>
    );
};

// ============================================================================
// Tech Input
// ============================================================================

export const TechInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    multiline?: boolean;
    rows?: number;
    style?: CSSProperties;
    disabled?: boolean;
}> = ({ value, onChange, placeholder, type = 'text', multiline, rows = 3, style, disabled }) => {
    const commonStyle: CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        borderRadius: 10,
        backgroundColor: 'rgba(6, 10, 20, 0.8)',
        border: `1px solid ${techColors.border}`,
        color: techColors.text1,
        fontSize: 14,
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ...style,
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = techColors.cyan;
        e.target.style.boxShadow = `0 0 12px ${techColors.cyanMuted}`;
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = techColors.border;
        e.target.style.boxShadow = 'none';
    };

    if (multiline) {
        return (
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                style={{ ...commonStyle, resize: 'vertical' }}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        );
    }

    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            style={commonStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    );
};

// ============================================================================
// Tech Select
// ============================================================================

export const TechSelect: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    style?: CSSProperties;
    disabled?: boolean;
}> = ({ value, onChange, options, style, disabled }) => (
    <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: 'rgba(6, 10, 20, 0.8)',
            border: `1px solid ${techColors.border}`,
            color: techColors.text1,
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'auto' as any,
            ...style,
        }}
    >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

// ============================================================================
// Radial Score Gauge
// ============================================================================

export const RadialGauge: React.FC<{
    value: number; // 0..1
    size?: number;
    color?: string;
    label?: string;
    thickness?: number;
}> = ({ value, size = 56, color = techColors.cyan, label, thickness = 4 }) => {
    const pct = Math.min(Math.max(value, 0), 1);
    const radius = (size - thickness * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct);

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.06)"
                    strokeWidth={thickness}
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: 'stroke-dashoffset 0.8s ease-out',
                        filter: `drop-shadow(0 0 4px ${color})`,
                    }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{
                    fontSize: size > 50 ? 14 : 11,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color,
                    textShadow: `0 0 6px ${color}50`,
                }}>
                    {(pct * 100).toFixed(0)}
                </span>
                {label && (
                    <span style={{ fontSize: 7, color: techColors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Section Header
// ============================================================================

export const TechSectionHeader: React.FC<{
    title: string;
    icon?: ReactNode;
    accent?: string;
    extra?: ReactNode;
}> = ({ title, icon, accent = techColors.cyan, extra }) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon && <span style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent})` }}>{icon}</span>}
            <span style={{
                color: techColors.text1,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.04em',
            }}>
                {title}
            </span>
        </div>
        {extra}
    </div>
);

// ============================================================================
// Rank Badge
// ============================================================================

const RANK_COLORS = ['#fbbf24', '#94a3b8', '#cd7f32']; // gold, silver, bronze

export const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const color = rank <= 3 ? RANK_COLORS[rank - 1] : techColors.text3;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'monospace',
            color: rank <= 3 ? techColors.bg0 : techColors.text2,
            backgroundColor: rank <= 3 ? color : 'rgba(255,255,255,0.06)',
            boxShadow: rank <= 3 ? `0 0 8px ${color}50` : 'none',
        }}>
            {rank}
        </span>
    );
};

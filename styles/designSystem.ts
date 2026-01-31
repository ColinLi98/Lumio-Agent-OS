/**
 * Lumi Design System
 * 
 * 统一的设计语言，确保整个产品的视觉一致性
 * 风格定位：专业、克制、数据驱动
 */

// ============================================================================
// Color System
// ============================================================================

export const colors = {
    // Brand Colors
    brand: {
        primary: '#0EA5E9',        // Sky blue - 主色
        primaryLight: '#38BDF8',
        primaryDark: '#0284C7',
        primaryMuted: 'rgba(14, 165, 233, 0.15)',
    },

    // Semantic Colors
    semantic: {
        positive: '#10B981',       // Emerald - 正向
        positiveMuted: 'rgba(16, 185, 129, 0.15)',
        negative: '#EF4444',       // Red - 负向
        negativeMuted: 'rgba(239, 68, 68, 0.15)',
        warning: '#F59E0B',        // Amber - 警告
        warningMuted: 'rgba(245, 158, 11, 0.15)',
        info: '#6366F1',           // Indigo - 信息
        infoMuted: 'rgba(99, 102, 241, 0.15)',
    },

    // Neutral Colors (Dark Theme)
    dark: {
        bg0: '#020617',            // Darkest
        bg1: '#0F172A',            // Background
        bg2: '#1E293B',            // Card background
        bg3: '#334155',            // Input background
        bg4: '#475569',            // Hover state
        
        text1: '#F8FAFC',          // Primary text
        text2: '#94A3B8',          // Secondary text
        text3: '#64748B',          // Muted text
        text4: '#475569',          // Disabled text
        
        border: 'rgba(148, 163, 184, 0.1)',
        borderHover: 'rgba(148, 163, 184, 0.2)',
        borderActive: 'rgba(148, 163, 184, 0.3)',
    },

    // Neutral Colors (Light Theme)
    light: {
        bg0: '#FFFFFF',
        bg1: '#F8FAFC',
        bg2: '#FFFFFF',
        bg3: '#F1F5F9',
        bg4: '#E2E8F0',
        
        text1: '#0F172A',
        text2: '#475569',
        text3: '#64748B',
        text4: '#94A3B8',
        
        border: 'rgba(15, 23, 42, 0.08)',
        borderHover: 'rgba(15, 23, 42, 0.12)',
        borderActive: 'rgba(15, 23, 42, 0.16)',
    },

    // Chart Colors
    chart: {
        blue: '#0EA5E9',
        emerald: '#10B981',
        amber: '#F59E0B',
        rose: '#F43F5E',
        violet: '#8B5CF6',
        cyan: '#06B6D4',
    }
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
    },
    
    fontSize: {
        xs: '0.75rem',     // 12px
        sm: '0.875rem',    // 14px
        base: '1rem',      // 16px
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
    },
    
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    
    lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
    },
    
    letterSpacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.05em',
        wider: '0.1em',
    }
} as const;

// ============================================================================
// Spacing
// ============================================================================

export const spacing = {
    0: '0',
    px: '1px',
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px
    3.5: '0.875rem',   // 14px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    7: '1.75rem',      // 28px
    8: '2rem',         // 32px
    9: '2.25rem',      // 36px
    10: '2.5rem',      // 40px
    12: '3rem',        // 48px
    14: '3.5rem',      // 56px
    16: '4rem',        // 64px
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const radius = {
    none: '0',
    sm: '0.25rem',     // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
} as const;

// ============================================================================
// Shadows
// ============================================================================

export const shadows = {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    
    // Glow effects
    glow: {
        primary: '0 0 20px rgba(14, 165, 233, 0.3)',
        positive: '0 0 20px rgba(16, 185, 129, 0.3)',
        negative: '0 0 20px rgba(239, 68, 68, 0.3)',
    }
} as const;

// ============================================================================
// Transitions
// ============================================================================

export const transitions = {
    duration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
        slower: '500ms',
    },
    
    timing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    }
} as const;

// ============================================================================
// Z-Index
// ============================================================================

export const zIndex = {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    overlay: 400,
    toast: 500,
    tooltip: 600,
} as const;

// ============================================================================
// Component Styles
// ============================================================================

export const componentStyles = {
    // Card
    card: {
        base: `
            rounded-xl
            transition-colors
        `,
        dark: `
            bg-slate-800/50
            border border-slate-700/50
        `,
        light: `
            bg-white
            border border-gray-200
            shadow-sm
        `,
    },
    
    // Button
    button: {
        base: `
            inline-flex items-center justify-center
            font-medium
            transition-all
            focus:outline-none focus:ring-2 focus:ring-offset-2
        `,
        sizes: {
            sm: 'px-3 py-1.5 text-xs rounded-md',
            md: 'px-4 py-2 text-sm rounded-lg',
            lg: 'px-5 py-2.5 text-base rounded-lg',
        },
        variants: {
            primary: `
                bg-sky-500 text-white
                hover:bg-sky-600
                focus:ring-sky-500
            `,
            secondary: `
                bg-slate-700 text-slate-200
                hover:bg-slate-600
                focus:ring-slate-500
            `,
            ghost: `
                bg-transparent text-slate-400
                hover:bg-slate-800 hover:text-slate-200
            `,
        },
    },
    
    // Input
    input: {
        base: `
            w-full
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-sky-500/50
        `,
        dark: `
            bg-slate-700/50
            border border-slate-600
            text-white
            placeholder-slate-400
        `,
        light: `
            bg-gray-50
            border border-gray-200
            text-gray-900
            placeholder-gray-400
        `,
        sizes: {
            sm: 'px-2.5 py-1.5 text-xs rounded-md',
            md: 'px-3 py-2 text-sm rounded-lg',
            lg: 'px-4 py-3 text-base rounded-lg',
        },
    },
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 根据主题获取颜色
 */
export function getThemeColors(isDark: boolean) {
    return isDark ? colors.dark : colors.light;
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: 'positive' | 'negative' | 'warning' | 'info' | 'neutral') {
    switch (status) {
        case 'positive': return colors.semantic.positive;
        case 'negative': return colors.semantic.negative;
        case 'warning': return colors.semantic.warning;
        case 'info': return colors.semantic.info;
        default: return colors.dark.text3;
    }
}

/**
 * 获取数值对应的状态
 */
export function getValueStatus(value: number, thresholds: { low: number; high: number } = { low: 40, high: 70 }): 'positive' | 'negative' | 'warning' {
    if (value >= thresholds.high) return 'positive';
    if (value >= thresholds.low) return 'warning';
    return 'negative';
}

/**
 * 格式化数字
 */
export function formatNumber(value: number, options?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
}): string {
    const { decimals = 0, prefix = '', suffix = '' } = options || {};
    return `${prefix}${value.toFixed(decimals)}${suffix}`;
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 0): string {
    return `${value.toFixed(decimals)}%`;
}

export default {
    colors,
    typography,
    spacing,
    radius,
    shadows,
    transitions,
    zIndex,
    componentStyles,
    getThemeColors,
    getStatusColor,
    getValueStatus,
    formatNumber,
    formatPercent,
};

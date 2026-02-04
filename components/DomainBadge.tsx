/**
 * Domain Badge Component
 * Shows the intent domain classification in the UI
 */

import React from 'react';
import type { IntentDomain } from '../services/intentRouterTypes';

interface DomainBadgeProps {
    domain: IntentDomain;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const DOMAIN_CONFIG: Record<IntentDomain, { label: string; icon: string; color: string }> = {
    ticketing: { label: '票务', icon: '🎫', color: '#8B5CF6' },
    commerce: { label: '电商', icon: '🛒', color: '#10B981' },
    travel: { label: '旅行', icon: '✈️', color: '#3B82F6' },
    food: { label: '餐饮', icon: '🍜', color: '#F59E0B' },
    local_service: { label: '本地服务', icon: '🔧', color: '#EC4899' },
    education: { label: '教育', icon: '📚', color: '#6366F1' },
    talent: { label: '找人', icon: '👤', color: '#14B8A6' },
    other: { label: '其他', icon: '📋', color: '#6B7280' },
};

const SIZE_CLASSES = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
};

export const DomainBadge: React.FC<DomainBadgeProps> = ({
    domain,
    size = 'md',
    className = ''
}) => {
    const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.other;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-medium ${SIZE_CLASSES[size]} ${className}`}
            style={{
                backgroundColor: `${config.color}20`,
                color: config.color,
                border: `1px solid ${config.color}40`
            }}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
};

export default DomainBadge;

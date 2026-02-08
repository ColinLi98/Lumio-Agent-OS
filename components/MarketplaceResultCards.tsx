/**
 * MarketplaceResultCards - Shared UI components for Agent Marketplace results
 * 
 * Used by both AgentMarketplacePanel and SuperAgentResultPanel to render
 * structured agent results (hotels, flights, etc.) in a premium dark-mode style.
 */

import React from 'react';
import { ExternalLink, ChevronRight, Plane, Hotel, Car, Utensils, MapPin, Cloud, ShoppingBag, Globe, FileText } from 'lucide-react';

// ============================================================================
// Design Tokens (shared with SuperAgentResultPanel)
// ============================================================================

export const mktColors = {
    primary: '#0EA5E9',
    primaryMuted: 'rgba(14, 165, 233, 0.15)',
    positive: '#10B981',
    positiveMuted: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#CBD5E1',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Agent Type Metadata
// ============================================================================

export interface AgentTypeMeta {
    icon: string;
    label: string;
    gradient: string;
    LucideIcon: React.ComponentType<{ size?: number; color?: string }>;
}

export interface OutboundLinkClickPayload {
    agentType: string;
    title: string;
    url: string;
}

export type OutboundLinkClickHandler = (payload: OutboundLinkClickPayload) => void;

export const AGENT_TYPE_META: Record<string, AgentTypeMeta> = {
    flight_booking: { icon: '✈️', label: '航班', gradient: 'linear-gradient(135deg, #0EA5E915, #06B6D410)', LucideIcon: Plane },
    hotel_booking: { icon: '🏨', label: '酒店', gradient: 'linear-gradient(135deg, #2563EB15, #7C3AED10)', LucideIcon: Hotel },
    live_search: { icon: '📡', label: '实时搜索', gradient: 'linear-gradient(135deg, #0EA5E915, #10B98110)', LucideIcon: Globe },
    web_search: { icon: '🔎', label: '网页搜索', gradient: 'linear-gradient(135deg, #60A5FA15, #0EA5E910)', LucideIcon: Globe },
    price_compare: { icon: '💹', label: '比价', gradient: 'linear-gradient(135deg, #A78BFA15, #F472B610)', LucideIcon: ShoppingBag },
    transportation: { icon: '🚗', label: '交通', gradient: 'linear-gradient(135deg, #F59E0B15, #EF444410)', LucideIcon: Car },
    restaurant: { icon: '🍽️', label: '美食', gradient: 'linear-gradient(135deg, #EF444415, #F97316 10)', LucideIcon: Utensils },
    attraction: { icon: '📍', label: '景点', gradient: 'linear-gradient(135deg, #10B98115, #06B6D410)', LucideIcon: MapPin },
    weather: { icon: '🌤️', label: '天气', gradient: 'linear-gradient(135deg, #60A5FA15, #818CF810)', LucideIcon: Cloud },
    shopping: { icon: '🛍️', label: '购物', gradient: 'linear-gradient(135deg, #A78BFA15, #EC489910)', LucideIcon: ShoppingBag },
    local_service: { icon: '📍', label: '本地生活', gradient: 'linear-gradient(135deg, #10B98115, #06B6D410)', LucideIcon: MapPin },
    social_search: { icon: '📱', label: '攻略', gradient: 'linear-gradient(135deg, #F472B615, #EC489910)', LucideIcon: Globe },
    translation: { icon: '🌐', label: '翻译', gradient: 'linear-gradient(135deg, #34D39915, #10B98110)', LucideIcon: Globe },
    itinerary: { icon: '📋', label: '行程', gradient: 'linear-gradient(135deg, #818CF815, #6366F110)', LucideIcon: FileText },
};

export function getAgentMeta(agentType: string): AgentTypeMeta {
    // Try direct match first
    if (AGENT_TYPE_META[agentType]) return AGENT_TYPE_META[agentType];
    // Try partial match (e.g. "spec_hotel_booking_internal" → "hotel_booking")
    for (const [key, meta] of Object.entries(AGENT_TYPE_META)) {
        if (agentType.includes(key)) return meta;
    }
    return { icon: '📌', label: agentType.split('_')[0] || 'Agent', gradient: 'linear-gradient(135deg, #94A3B815, #64748B10)', LucideIcon: Globe };
}

function isSafePublicUrl(url?: string): boolean {
    if (!url || !/^https?:\/\//i.test(url)) return false;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (host.includes('serpapi.com')) return false;
        if (path.includes('/search.json')) return false;
        if (parsed.searchParams.has('api_key')) return false;
        return true;
    } catch {
        return false;
    }
}

function pickSafeUrl(...urls: Array<string | undefined>): string | undefined {
    for (const url of urls) {
        if (isSafePublicUrl(url)) return url;
    }
    return undefined;
}

function buildFallbackMapUrl(item: any): string | undefined {
    const query = [String(item?.name || '').trim(), String(item?.address || '').trim()]
        .filter(Boolean)
        .join(' ')
        .trim();
    if (!query) return undefined;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildFallbackShoppingUrl(item: any): string | undefined {
    const query = [String(item?.title || '').trim(), String(item?.merchant || item?.source || '').trim()]
        .filter(Boolean)
        .join(' ')
        .trim();
    if (!query) return undefined;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function buildWeatherSearchUrl(location?: string): string | undefined {
    const loc = String(location || '').trim();
    if (!loc) return undefined;
    return `https://www.google.com/search?q=${encodeURIComponent(`${loc} 天气`)}`;
}

function buildWindyUrl(lat?: number, lon?: number): string | undefined {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    return `https://www.windy.com/${lat!.toFixed(4)}/${lon!.toFixed(4)}?${lat!.toFixed(4)},${lon!.toFixed(4)},7`;
}

function trackOutboundLink(
    onOutboundLinkClick: OutboundLinkClickHandler | undefined,
    payload: OutboundLinkClickPayload
): void {
    if (!onOutboundLinkClick) return;
    onOutboundLinkClick(payload);
}

// ============================================================================
// Marketplace Header Component
// ============================================================================

export const MarketplaceHeader: React.FC<{
    traceId?: string;
    successCount: number;
    totalCount: number;
    title?: string;
}> = ({ traceId, successCount, totalCount, title = 'Agent Marketplace' }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${mktColors.bg2}, ${mktColors.bg1})`,
        borderRadius: 14,
        border: `1px solid ${mktColors.border}`,
        marginBottom: 12,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${mktColors.primary}30, ${mktColors.primary}10)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${mktColors.primary}40`,
            }}>
                <span style={{ fontSize: 16 }}>🤖</span>
            </div>
            <div>
                <div style={{ color: mktColors.text1, fontWeight: 700, fontSize: 15 }}>{title}</div>
                {traceId && (
                    <div style={{ color: mktColors.text3, fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                        trace: {traceId.slice(0, 8)}
                    </div>
                )}
            </div>
        </div>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: successCount === totalCount ? mktColors.positiveMuted : mktColors.warningMuted,
            color: successCount === totalCount ? mktColors.positive : mktColors.warning,
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
        }}>
            <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: successCount === totalCount ? mktColors.positive : mktColors.warning,
            }} />
            {successCount}/{totalCount} 成功
        </div>
    </div>
);

// ============================================================================
// Agent Tab Bar Component
// ============================================================================

export interface AgentTab {
    id: string;
    agentType: string;
    label: string;
    icon: string;
    hasData: boolean;
}

export const AgentTabBar: React.FC<{
    tabs: AgentTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => (
    <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        marginBottom: 12,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
    }}>
        {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 20,
                        border: isActive
                            ? `1.5px solid ${mktColors.primary}`
                            : `1px solid ${mktColors.border}`,
                        background: isActive ? mktColors.primaryMuted : mktColors.bg2,
                        color: isActive ? mktColors.primary : mktColors.text2,
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? `0 0 12px ${mktColors.primary}20` : 'none',
                    }}
                >
                    <span style={{ fontSize: 15 }}>{tab.icon}</span>
                    {tab.label}
                    {!tab.hasData && (
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: mktColors.warning,
                        }} />
                    )}
                </button>
            );
        })}
    </div>
);

// ============================================================================
// Hotel Result Card
// ============================================================================

export const HotelResultCard: React.FC<{
    data: any;
    onOutboundLinkClick?: OutboundLinkClickHandler;
}> = ({ data, onOutboundLinkClick }) => {
    const hotels = data?.data?.hotels || data?.hotels || [];
    const destination = data?.data?.destination || data?.destination || '';
    const comparisonLinks = data?.data?.comparisonLinks || data?.comparisonLinks || [];
    const personalizedNote = data?.personalizedNote || '';
    const latencyMs = data?.latencyMs || data?.executionTimeMs;

    return (
        <div style={{
            background: mktColors.bg2,
            borderRadius: 14,
            border: `1px solid ${mktColors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                background: AGENT_TYPE_META.hotel_booking.gradient,
                borderBottom: `1px solid ${mktColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🏨</span>
                    <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 14 }}>
                        {destination ? `${destination} 酒店推荐` : '酒店推荐'}
                    </span>
                    <span style={{
                        background: mktColors.positiveMuted,
                        color: mktColors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        实时数据
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: mktColors.text3, fontSize: 12 }}>{hotels.length} 家</span>
                    {latencyMs && (
                        <span style={{ color: mktColors.text3, fontSize: 11 }}>{latencyMs}ms</span>
                    )}
                </div>
            </div>

            {/* Hotel List */}
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hotels.slice(0, 4).map((hotel: any, i: number) => (
                    <div key={i} style={{
                        display: 'flex',
                        gap: 10,
                        padding: 10,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                        transition: 'transform 0.15s ease',
                    }}>
                        {hotel.thumbnail && (
                            <img
                                src={hotel.thumbnail}
                                alt={hotel.name}
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 8,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                color: mktColors.text1,
                                fontWeight: 600,
                                fontSize: 13,
                                marginBottom: 3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {hotel.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                {hotel.stars && (
                                    <span style={{ fontSize: 11, color: '#F59E0B' }}>
                                        {'★'.repeat(Math.min(hotel.stars, 5))}
                                    </span>
                                )}
                                {hotel.rating && (
                                    <span style={{
                                        background: '#2563EB20',
                                        color: '#2563EB',
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}>
                                        {hotel.rating}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: mktColors.text3, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                                    {hotel.location || hotel.address || ''}
                                </span>
                                <span style={{ color: mktColors.positive, fontWeight: 700, fontSize: 14 }}>
                                    ¥{hotel.pricePerNight || hotel.price || '—'}
                                    <span style={{ fontSize: 11, fontWeight: 400 }}>/晚</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Comparison Links */}
            {comparisonLinks.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${mktColors.border}` }}>
                    <div style={{ color: mktColors.text3, fontSize: 11, marginBottom: 6 }}>对比预订 →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {comparisonLinks.slice(0, 4).map((link: any, i: number) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                    trackOutboundLink(onOutboundLinkClick, {
                                        agentType: 'hotel_booking',
                                        title: String(link?.provider || link?.title || '酒店比价入口'),
                                        url: String(link?.url || ''),
                                    })
                                }
                                style={{
                                    background: mktColors.bg3,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: mktColors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'background 0.15s',
                                }}
                            >
                                {link.provider || link.title}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {personalizedNote && (
                <div style={{ padding: '4px 14px 10px', color: mktColors.text3, fontSize: 11, fontStyle: 'italic' }}>
                    💡 {personalizedNote}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Flight Result Card
// ============================================================================

export const FlightResultCard: React.FC<{
    data: any;
    onOutboundLinkClick?: OutboundLinkClickHandler;
}> = ({ data, onOutboundLinkClick }) => {
    const flights = data?.data?.flights || data?.flights || [];
    const rawComparisonLinks =
        data?.data?.comparisonLinks ||
        data?.comparisonLinks ||
        data?.data?.comparison_links ||
        data?.data?.priceComparisonLinks ||
        data?.priceComparisonLinks ||
        [];
    const comparisonLinks = Array.isArray(rawComparisonLinks)
        ? rawComparisonLinks
        : (rawComparisonLinks && typeof rawComparisonLinks === 'object'
            ? Object.values(rawComparisonLinks)
            : []);
    const personalizedNote = data?.personalizedNote || '';
    const latencyMs = data?.latencyMs || data?.executionTimeMs;

    return (
        <div style={{
            background: mktColors.bg2,
            borderRadius: 14,
            border: `1px solid ${mktColors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                background: AGENT_TYPE_META.flight_booking.gradient,
                borderBottom: `1px solid ${mktColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>✈️</span>
                    <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 14 }}>航班推荐</span>
                    <span style={{
                        background: mktColors.positiveMuted,
                        color: mktColors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        实时数据
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: mktColors.text3, fontSize: 12 }}>{flights.length} 个航班</span>
                    {latencyMs && (
                        <span style={{ color: mktColors.text3, fontSize: 11 }}>{latencyMs}ms</span>
                    )}
                </div>
            </div>

            {/* Flight List */}
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flights.length === 0 && (
                    <div style={{
                        padding: 12,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                        color: mktColors.text2,
                        fontSize: 12,
                    }}>
                        暂未返回可展示的航班详情，请使用下方比价入口继续查看。
                    </div>
                )}
                {flights.slice(0, 4).map((flight: any, i: number) => (
                    <div key={i} style={{
                        padding: 10,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 13 }}>
                                    {flight.airline || flight.carrier || '航班'}
                                </span>
                                {(flight.flightNumber || flight.flightNo) && (
                                    <span style={{ color: mktColors.text3, fontSize: 11 }}>
                                        {flight.flightNumber || flight.flightNo}
                                    </span>
                                )}
                            </div>
                            <span style={{ color: mktColors.positive, fontWeight: 700, fontSize: 14 }}>
                                ¥{flight.price || flight.totalPrice || '—'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: mktColors.text2, fontSize: 12 }}>
                            <span>{flight.departure_time || flight.departureTime || flight.departure || '时刻待确认'}</span>
                            <span style={{ color: mktColors.text3 }}>→</span>
                            <span>{flight.arrival_time || flight.arrivalTime || flight.arrival || '时刻待确认'}</span>
                            {flight.duration && (
                                <span style={{ color: mktColors.text3, marginLeft: 'auto', fontSize: 11 }}>
                                    {flight.duration}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                            <span style={{ color: mktColors.text3, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                {flight.source || '实时来源'}
                            </span>
                            {flight.bookingUrl && (
                                <a
                                    href={flight.bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                        trackOutboundLink(onOutboundLinkClick, {
                                            agentType: 'flight_booking',
                                            title: `${flight.airline || flight.carrier || '航班'} 预订入口`,
                                            url: String(flight.bookingUrl || ''),
                                        })
                                    }
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: mktColors.primary,
                                        fontSize: 11,
                                        textDecoration: 'none',
                                        border: `1px solid ${mktColors.primary}55`,
                                        borderRadius: 8,
                                        padding: '3px 8px',
                                        background: mktColors.primaryMuted,
                                    }}
                                >
                                    去预订
                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Comparison Links */}
            {comparisonLinks.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${mktColors.border}` }}>
                    <div style={{ color: mktColors.text3, fontSize: 11, marginBottom: 6 }}>对比预订 →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {comparisonLinks.slice(0, 4).map((link: any, i: number) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                    trackOutboundLink(onOutboundLinkClick, {
                                        agentType: 'flight_booking',
                                        title: String(link?.provider || link?.name || link?.title || '航班比价入口'),
                                        url: String(link?.url || ''),
                                    })
                                }
                                style={{
                                    background: mktColors.bg3,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: mktColors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.provider || link.name || link.title || '比价入口'}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {personalizedNote && (
                <div style={{ padding: '4px 14px 10px', color: mktColors.text3, fontSize: 11, fontStyle: 'italic' }}>
                    💡 {personalizedNote}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Local Service Result Card
// ============================================================================

export const LocalResultCard: React.FC<{
    data: any;
    onOutboundLinkClick?: OutboundLinkClickHandler;
}> = ({ data, onOutboundLinkClick }) => {
    const localResults = Array.isArray(data?.local_results)
        ? data.local_results
        : Array.isArray(data?.normalized?.local_results)
            ? data.normalized.local_results
            : [];
    const links = Array.isArray(data?.action_links)
        ? data.action_links
        : Array.isArray(data?.normalized?.links)
            ? data.normalized.links
            : [];
    const safeLinks = links.filter((link: any) => isSafePublicUrl(link?.url));
    const latencyMs = data?.latencyMs || data?.executionTimeMs;

    return (
        <div style={{
            background: mktColors.bg2,
            borderRadius: 14,
            border: `1px solid ${mktColors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            <div style={{
                padding: '12px 16px',
                background: AGENT_TYPE_META.attraction.gradient,
                borderBottom: `1px solid ${mktColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>📍</span>
                    <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 14 }}>本地服务推荐</span>
                    <span style={{
                        background: mktColors.positiveMuted,
                        color: mktColors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        实时数据
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: mktColors.text3, fontSize: 12 }}>{localResults.length} 条</span>
                    {latencyMs && (
                        <span style={{ color: mktColors.text3, fontSize: 11 }}>{latencyMs}ms</span>
                    )}
                </div>
            </div>

            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {localResults.slice(0, 5).map((item: any, i: number) => {
                    const navUrl = pickSafeUrl(item?.map_url, item?.website, buildFallbackMapUrl(item));
                    return <div key={i} style={{
                        padding: 10,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 13 }}>
                                {item.name || '商家'}
                            </span>
                            {Number.isFinite(item.rating) && (
                                <span style={{
                                    background: '#2563EB20',
                                    color: '#2563EB',
                                    padding: '1px 6px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                }}>
                                    {item.rating}⭐
                                </span>
                            )}
                        </div>
                        {item.address && (
                            <div style={{ color: mktColors.text2, fontSize: 12, marginBottom: 4 }}>
                                {item.address}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: mktColors.text3, fontSize: 11 }}>
                                {item.status || item.category || '信息待补充'}
                            </span>
                            {navUrl && (
                                <a
                                    href={navUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                        trackOutboundLink(onOutboundLinkClick, {
                                            agentType: 'local_service',
                                            title: `${item?.name || '商家'} 导航`,
                                            url: String(navUrl || ''),
                                        })
                                    }
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: mktColors.primary,
                                        fontSize: 11,
                                        textDecoration: 'none',
                                        border: `1px solid ${mktColors.primary}55`,
                                        borderRadius: 8,
                                        padding: '3px 8px',
                                        background: mktColors.primaryMuted,
                                    }}
                                >
                                    去导航
                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>;
                })}
            </div>

            {safeLinks.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${mktColors.border}` }}>
                    <div style={{ color: mktColors.text3, fontSize: 11, marginBottom: 6 }}>快捷入口 →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {safeLinks.slice(0, 4).map((link: any, i: number) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                    trackOutboundLink(onOutboundLinkClick, {
                                        agentType: 'local_service',
                                        title: String(link?.title || link?.provider || '本地服务详情'),
                                        url: String(link?.url || ''),
                                    })
                                }
                                style={{
                                    background: mktColors.bg3,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: mktColors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.title || link.provider || '查看详情'}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Shopping Result Card
// ============================================================================

export const ShoppingResultCard: React.FC<{
    data: any;
    onOutboundLinkClick?: OutboundLinkClickHandler;
}> = ({ data, onOutboundLinkClick }) => {
    const shoppingResults = Array.isArray(data?.shopping_results)
        ? data.shopping_results
        : Array.isArray(data?.normalized?.shopping_results)
            ? data.normalized.shopping_results
            : [];
    const links = Array.isArray(data?.action_links)
        ? data.action_links
        : Array.isArray(data?.normalized?.links)
            ? data.normalized.links
            : [];
    const safeLinks = links.filter((link: any) => isSafePublicUrl(link?.url));
    const latencyMs = data?.latencyMs || data?.executionTimeMs;

    return (
        <div style={{
            background: mktColors.bg2,
            borderRadius: 14,
            border: `1px solid ${mktColors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            <div style={{
                padding: '12px 16px',
                background: AGENT_TYPE_META.shopping.gradient,
                borderBottom: `1px solid ${mktColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🛍️</span>
                    <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 14 }}>商品比价</span>
                    <span style={{
                        background: mktColors.positiveMuted,
                        color: mktColors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        实时数据
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: mktColors.text3, fontSize: 12 }}>{shoppingResults.length} 条</span>
                    {latencyMs && (
                        <span style={{ color: mktColors.text3, fontSize: 11 }}>{latencyMs}ms</span>
                    )}
                </div>
            </div>

            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shoppingResults.slice(0, 5).map((item: any, i: number) => {
                    const itemUrl = pickSafeUrl(item?.url, buildFallbackShoppingUrl(item));
                    return <div key={i} style={{
                        padding: 10,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                    }}>
                        <div style={{ color: mktColors.text1, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                            {item.title || '商品'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: mktColors.text2, fontSize: 12 }}>
                                {item.source || item.merchant || '平台待确认'}
                            </span>
                            <span style={{ color: mktColors.positive, fontWeight: 700, fontSize: 14 }}>
                                {item.price_text || (Number.isFinite(item.price) ? `¥${item.price}` : '价格待确认')}
                            </span>
                        </div>
                        {itemUrl && (
                            <div style={{ marginTop: 7 }}>
                                <a
                                    href={itemUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                        trackOutboundLink(onOutboundLinkClick, {
                                            agentType: 'shopping',
                                            title: String(item?.title || '商品详情'),
                                            url: String(itemUrl || ''),
                                        })
                                    }
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: mktColors.primary,
                                        fontSize: 11,
                                        textDecoration: 'none',
                                        border: `1px solid ${mktColors.primary}55`,
                                        borderRadius: 8,
                                        padding: '3px 8px',
                                        background: mktColors.primaryMuted,
                                    }}
                                >
                                    查看商品
                                    <ExternalLink size={10} />
                                </a>
                            </div>
                        )}
                    </div>;
                })}
            </div>

            {safeLinks.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${mktColors.border}` }}>
                    <div style={{ color: mktColors.text3, fontSize: 11, marginBottom: 6 }}>快速跳转 →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {safeLinks.slice(0, 5).map((link: any, i: number) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                    trackOutboundLink(onOutboundLinkClick, {
                                        agentType: 'shopping',
                                        title: String(link?.title || link?.provider || '商品报价'),
                                        url: String(link?.url || ''),
                                    })
                                }
                                style={{
                                    background: mktColors.bg3,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: mktColors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.title || link.provider || '查看报价'}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Weather Result Card
// ============================================================================

export const WeatherResultCard: React.FC<{
    data: any;
    onOutboundLinkClick?: OutboundLinkClickHandler;
}> = ({ data, onOutboundLinkClick }) => {
    const weatherData = data?.data || data || {};
    const forecast = Array.isArray(weatherData?.forecast) ? weatherData.forecast : [];
    const tips = Array.isArray(weatherData?.tips) ? weatherData.tips : [];
    const location = String(weatherData?.locationCN || weatherData?.location || '').trim() || '目的地';
    const coords = weatherData?.coordinates || {};
    const lat = Number(coords?.lat);
    const lon = Number(coords?.lon);
    const latencyMs = data?.latencyMs || data?.executionTimeMs;

    const rawLinks = Array.isArray(weatherData?.action_links) ? weatherData.action_links : [];
    const links = [
        ...rawLinks,
        { title: `${location} 天气搜索`, url: buildWeatherSearchUrl(location) },
        { title: '天气雷达 (Windy)', url: buildWindyUrl(lat, lon) },
    ]
        .map((item: any) => ({
            title: item?.title || item?.provider || '查看天气',
            url: String(item?.url || '').trim(),
        }))
        .filter((item: any) => isSafePublicUrl(item.url));

    const dedupedLinks = Array.from(
        new Map(links.map((link: any) => [link.url, link])).values()
    ).slice(0, 4);

    return (
        <div style={{
            background: mktColors.bg2,
            borderRadius: 14,
            border: `1px solid ${mktColors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            <div style={{
                padding: '12px 16px',
                background: AGENT_TYPE_META.weather.gradient,
                borderBottom: `1px solid ${mktColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🌤️</span>
                    <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 14 }}>
                        {location} 天气
                    </span>
                    <span style={{
                        background: mktColors.positiveMuted,
                        color: mktColors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        实时数据
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: mktColors.text3, fontSize: 12 }}>{forecast.length} 天</span>
                    {latencyMs && (
                        <span style={{ color: mktColors.text3, fontSize: 11 }}>{latencyMs}ms</span>
                    )}
                </div>
            </div>

            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {forecast.length === 0 && (
                    <div style={{
                        padding: 10,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                        color: mktColors.text2,
                        fontSize: 12,
                    }}>
                        暂无可展示天气详情，可通过下方来源链接继续查看。
                    </div>
                )}
                {forecast.slice(0, 5).map((day: any, i: number) => (
                    <div key={i} style={{
                        padding: 10,
                        background: mktColors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${mktColors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{day?.icon || '🌤️'}</span>
                            <div>
                                <div style={{ color: mktColors.text1, fontWeight: 600, fontSize: 13 }}>
                                    {day?.day || day?.date || `第 ${i + 1} 天`}
                                </div>
                                <div style={{ color: mktColors.text2, fontSize: 12 }}>
                                    {day?.condition || '天气信息待补充'}
                                </div>
                            </div>
                        </div>
                        <div style={{ color: mktColors.positive, fontWeight: 700, fontSize: 14 }}>
                            {day?.temp || (
                                Number.isFinite(day?.tempMin) && Number.isFinite(day?.tempMax)
                                    ? `${day.tempMin}-${day.tempMax}°C`
                                    : '--'
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {tips.length > 0 && (
                <div style={{ padding: '0 12px 10px' }}>
                    <div style={{ color: mktColors.text3, fontSize: 11, marginBottom: 6 }}>出行建议</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tips.slice(0, 2).map((tip: any, i: number) => (
                            <div key={i} style={{ color: mktColors.text2, fontSize: 12 }}>
                                {String(tip || '')}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dedupedLinks.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${mktColors.border}` }}>
                    <div style={{ color: mktColors.text3, fontSize: 11, marginBottom: 6 }}>查看详情 →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {dedupedLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                    trackOutboundLink(onOutboundLinkClick, {
                                        agentType: 'weather',
                                        title: String(link?.title || '天气详情'),
                                        url: String(link?.url || ''),
                                    })
                                }
                                style={{
                                    background: mktColors.bg3,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: mktColors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.title}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Generic Agent Result Card (fallback for unknown agent types)
// ============================================================================

export const GenericAgentResultCard: React.FC<{
    agentName: string;
    agentType: string;
    data: any;
    latencyMs?: number;
    onOutboundLinkClick?: OutboundLinkClickHandler;
}> = ({ agentName, agentType, data, latencyMs, onOutboundLinkClick }) => {
    const meta = getAgentMeta(agentType);
    const highlights: string[] = [];
    const links: Array<{ title: string; url: string }> = [];

    // Extract displayable info from data
    if (data) {
        if (typeof data === 'string') {
            highlights.push(data);
        } else if (data.summary) {
            highlights.push(String(data.summary));
        } else if (data.personalizedNote) {
            highlights.push(String(data.personalizedNote));
        }
        if (data.suggestions && Array.isArray(data.suggestions)) {
            data.suggestions.slice(0, 3).forEach((s: any) => {
                if (typeof s === 'string') highlights.push(s);
                else if (s?.name) highlights.push(s.name);
            });
        }
        if (data.data?.comparisonLinks) {
            data.data.comparisonLinks.slice(0, 3).forEach((l: any) => {
                if (isSafePublicUrl(l?.url)) links.push({ title: l.provider || l.title || 'Link', url: l.url });
            });
        }
        const actionLinks = [
            ...(Array.isArray(data?.action_links) ? data.action_links : []),
            ...(Array.isArray(data?.data?.action_links) ? data.data.action_links : []),
        ];
        actionLinks.slice(0, 4).forEach((l: any) => {
            if (isSafePublicUrl(l?.url)) links.push({ title: l.title || l.provider || '查看详情', url: l.url });
        });
        const evidenceItems = Array.isArray(data?.evidence?.items) ? data.evidence.items : [];
        evidenceItems.slice(0, 3).forEach((item: any) => {
            if (isSafePublicUrl(item?.url)) links.push({ title: item?.title || '查看证据', url: item.url });
        });
        const sourceItems = Array.isArray(data?.sources) ? data.sources : [];
        sourceItems.slice(0, 3).forEach((item: any) => {
            if (isSafePublicUrl(item?.url)) links.push({ title: item?.title || item?.source_name || '查看来源', url: item.url });
        });
    }

    const dedupedLinks = Array.from(
        new Map(links.map((link) => [link.url, link])).values()
    ).slice(0, 6);

    return (
        <div style={{
            background: mktColors.bg2,
            borderRadius: 14,
            border: `1px solid ${mktColors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            <div style={{
                padding: '12px 16px',
                background: meta.gradient,
                borderBottom: `1px solid ${mktColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <span style={{ color: mktColors.text1, fontWeight: 600, fontSize: 14 }}>
                        {agentName || meta.label}
                    </span>
                </div>
                {latencyMs && (
                    <span style={{ color: mktColors.text3, fontSize: 11 }}>{latencyMs}ms</span>
                )}
            </div>
            {highlights.length > 0 && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {highlights.map((line, i) => (
                        <div key={i} style={{ color: mktColors.text2, fontSize: 12 }}>
                            • {line}
                        </div>
                    ))}
                </div>
            )}
            {dedupedLinks.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${mktColors.border}` }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {dedupedLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                    trackOutboundLink(onOutboundLinkClick, {
                                        agentType,
                                        title: String(link?.title || '查看详情'),
                                        url: String(link?.url || ''),
                                    })
                                }
                                style={{
                                    background: mktColors.bg3,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: mktColors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.title}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Smart Action Bar
// ============================================================================

export interface SmartAction {
    id: string;
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const SmartActionBar: React.FC<{
    actions: SmartAction[];
    style?: React.CSSProperties;
}> = ({ actions, style }) => (
    <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        padding: '10px 0',
        ...style,
    }}>
        {actions.map((action) => (
            <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: `1px solid ${mktColors.primary}40`,
                    background: `linear-gradient(135deg, ${mktColors.primary}08, ${mktColors.primary}04)`,
                    color: action.disabled ? mktColors.text3 : mktColors.primary,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: action.disabled ? 'not-allowed' : 'pointer',
                    opacity: action.disabled ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                }}
            >
                {action.icon && <span style={{ fontSize: 13 }}>{action.icon}</span>}
                {action.label}
            </button>
        ))}
    </div>
);

// ============================================================================
// Chat Preview Card
// ============================================================================

export const ChatPreviewCard: React.FC<{
    userMessage: string;
    assistantLines: string[];
    assistantLinks?: Array<{ title: string; url: string }>;
}> = ({ userMessage, assistantLines, assistantLinks = [] }) => (
    <div style={{
        background: mktColors.bg2,
        borderRadius: 14,
        border: `1px solid ${mktColors.border}`,
        padding: 14,
        marginBottom: 12,
    }}>
        <div style={{
            color: mktColors.text3,
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            marginBottom: 10,
        }}>
            对话预览
        </div>

        {/* User Bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <div style={{
                maxWidth: '85%',
                background: mktColors.primary,
                color: '#fff',
                borderRadius: '16px 16px 4px 16px',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
            }}>
                {userMessage}
            </div>
        </div>

        {/* Assistant Bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
                maxWidth: '90%',
                background: mktColors.bg3,
                border: `1px solid ${mktColors.border}`,
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 14px',
            }}>
                {assistantLines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ color: mktColors.text2, fontSize: 12, marginBottom: 2 }}>
                            已为你汇总可用信息：
                        </div>
                        {assistantLines.map((line, i) => (
                            <div key={i} style={{ color: mktColors.text1, fontSize: 12 }}>
                                • {line}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: '#FCA5A5', fontSize: 12 }}>
                        暂无可用结果，请补充更多约束后重试。
                    </div>
                )}

                {assistantLinks.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {assistantLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: mktColors.bg1,
                                    color: mktColors.primary,
                                    border: `1px solid ${mktColors.border}`,
                                    borderRadius: 8,
                                    padding: '3px 8px',
                                    fontSize: 11,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                <ExternalLink size={10} />
                                {link.title}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);

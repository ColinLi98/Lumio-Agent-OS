/**
 * Super Agent Result Panel - Result Visualization Panel
 * 
 * Displays structured Super Agent results in the App view
 * v0.3: Added LIX Intent Router integration with DomainBadge and FallbackPanel
 */

import React from 'react';
import {
    ShoppingCart, Search, Brain, Languages, Calculator,
    Clock, MessageCircle, ExternalLink, TrendingDown, Star,
    CheckCircle, AlertCircle, Sparkles, Zap,
    ChevronDown, ChevronRight, Play, Bell, Target, ListChecks,
    ShieldCheck, Newspaper, Users, Globe
} from 'lucide-react';
import OfferComparisonCard from './OfferComparisonCard';
import { ThreeStagePlan, PlanStep } from '../services/planTypes';
import { getActionService } from '../services/actionService';
// v0.3: LIX Intent Router UI components
import { DomainBadge } from './DomainBadge';
import { FallbackPanel } from './FallbackPanel';
import type { RouteResult, FallbackResponse } from '../services/intentRouterTypes';

// ============================================================================
// Types
// ============================================================================

export interface SkillResultData {
    skillId?: string;           // Optional: SkillResult does not include this field
    skillName?: string;         // Optional: SkillResult does not include this field
    success: boolean;
    confidence: number;
    data: any;
    error?: string;
    sources?: string[];
    executionTimeMs?: number;
}

export interface SuperAgentResult {
    question: string;
    answer: string;
    skillsUsed: string[];
    results: SkillResultData[];
    confidence: number;
    executionTimeMs: number;
    reasoning?: string;
    timestamp: number;
    /** Three-Stage Plan (Phase 2 Week 2) */
    plan?: ThreeStagePlan;
    /** v0.3: Intent routing result */
    routeResult?: RouteResult;
    /** v0.3: Fallback response when no valid offers */
    fallbackResponse?: FallbackResponse;
}

interface SuperAgentResultPanelProps {
    result: SuperAgentResult | null;
    onClose?: () => void;
    onFollowUp?: (question: string) => void;
    onOpenInMarket?: (intentId: string) => void;  // Deep link to LIX Market
    /** v0.3: Callback when user selects a fallback option */
    onFallbackAction?: (actionType: string, data?: any) => void;
}

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#0EA5E9',
    primaryMuted: 'rgba(14, 165, 233, 0.15)',
    positive: '#10B981',
    positiveMuted: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#CBD5E1',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Skill Icon Mapping
// ============================================================================

const skillIcons: Record<string, any> = {
    'price_compare': ShoppingCart,
    'web_search': Search,
    'memory': Brain,
    'translate': Languages,
    'calculate': Calculator,
    'schedule': Clock,
    'general_qa': MessageCircle,
    'broadcast_intent': Zap,
};

// ============================================================================
// Phase 3.5: Freshness Badge Component
// ============================================================================

interface FreshnessBadgeProps {
    isLive: boolean;
    fetchedAt?: string | number;  // ISO string or timestamp
    isStale?: boolean;
}

const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({ isLive, fetchedAt, isStale }) => {
    const getTimeLabel = () => {
        if (!fetchedAt) return '';
        const timestamp = typeof fetchedAt === 'string' ? new Date(fetchedAt).getTime() : fetchedAt;
        const ageMs = Date.now() - timestamp;
        const ageSec = Math.floor(ageMs / 1000);

        if (ageSec < 60) return 'Just updated';
        if (ageSec < 120) return '1 min ago';
        if (ageSec < 300) return `${Math.floor(ageSec / 60)} min ago`;
        return `${Math.floor(ageSec / 60)} min ago`;
    };

    if (isLive && fetchedAt) {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                background: isStale ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                borderRadius: 12,
                fontSize: 11,
                color: isStale ? '#F59E0B' : '#10B981',
                fontWeight: 500,
            }}>
                <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isStale ? '#F59E0B' : '#10B981',
                    animation: isStale ? undefined : 'pulse 2s infinite',
                }} />
                <span>Live retrieval</span>
                <span style={{ opacity: 0.7 }}>·</span>
                <span>{getTimeLabel()}</span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            background: 'rgba(148, 163, 184, 0.15)',
            borderRadius: 12,
            fontSize: 11,
            color: '#94A3B8',
            fontWeight: 500,
        }}>
            <span>📋</span>
            <span>Non-live suggestion</span>
        </div>
    );
};

// ============================================================================
// Phase 3: Live Search Result Card Component
// ============================================================================

interface LiveSearchResultCardProps {
    data: {
        success: boolean;
        is_live?: boolean;
        fetched_at?: string | number;
        ttl_seconds?: number;
        items?: Array<{ title: string; snippet: string; url: string; source_name: string }>;
        sources?: Array<{ title: string; url: string; source_name: string }>;
        action_links?: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }>;
        quote_cards?: Array<{
            quote_id: string;
            provider: string;
            dep_time: string;
            arr_time: string;
            price_text: string;
            transfers_text: string;
            source_url: string;
            fetched_at: string;
            objective_score?: number;
        }>;
        fallback?: {
            failure_reason: string;
            missing_constraints: string[];
            cta_buttons: Array<{ label: string; action: string; constraint_key?: string }>;
        };
        normalized?: {
            kind?: string;
            local_results?: Array<any>;
            shopping_results?: Array<any>;
        };
        local_results?: Array<any>;
        shopping_results?: Array<any>;
        error?: { code: string; message: string };
        route_decision?: { intent_domain: string; needs_live_data: boolean };
    };
    onRefresh?: () => void;
    onConstraintClick?: (constraint: string) => void;
}

function isSafeExternalUrl(url?: string): boolean {
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

export const LiveSearchResultCard: React.FC<LiveSearchResultCardProps> = ({ data, onRefresh, onConstraintClick }) => {
    const { success, is_live, fetched_at, items, sources, action_links, quote_cards, fallback, error, route_decision } = data;
    const actionLinks = Array.isArray(action_links)
        ? action_links.filter((link) => typeof link.url === 'string' && isSafeExternalUrl(link.url))
        : [];
    const quoteCards = Array.isArray(quote_cards)
        ? quote_cards.filter((item) => typeof item.source_url === 'string' && isSafeExternalUrl(item.source_url))
        : [];
    const localResults = Array.isArray(data.local_results)
        ? data.local_results
        : Array.isArray(data.normalized?.local_results)
            ? data.normalized.local_results
            : [];
    const shoppingResults = Array.isArray(data.shopping_results)
        ? data.shopping_results
        : Array.isArray(data.normalized?.shopping_results)
            ? data.normalized.shopping_results
            : [];

    // Calculate if stale (> TTL)
    const isStale = fetched_at && data.ttl_seconds
        ? (Date.now() - new Date(fetched_at).getTime()) > data.ttl_seconds * 1000
        : false;

    const renderActionLinks = () => {
        if (actionLinks.length === 0) return null;
        return (
            <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Quick links
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {actionLinks.slice(0, 3).map((link, idx) => (
                        <a
                            key={`${link.url}_${idx}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                textDecoration: 'none',
                                background: 'rgba(15, 23, 42, 0.55)',
                                border: '1px solid rgba(14, 165, 233, 0.28)',
                                borderRadius: 10,
                                padding: '10px 12px',
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    color: '#60A5FA',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {link.title}
                                </div>
                                <div style={{ color: '#94A3B8', fontSize: 11 }}>
                                    {link.provider}
                                    {!link.supports_time_filter && ' · manually select early-flight filter on site'}
                                </div>
                            </div>
                            <ExternalLink size={14} color="#60A5FA" />
                        </a>
                    ))}
                </div>
            </div>
        );
    };

    const renderQuoteCards = () => {
        if (quoteCards.length === 0) return null;
        return (
            <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Price comparison options
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {quoteCards.slice(0, 5).map((quote, idx) => (
                        <a
                            key={`${quote.quote_id}_${idx}`}
                            href={quote.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                textDecoration: 'none',
                                background: 'rgba(15, 23, 42, 0.55)',
                                border: '1px solid rgba(16, 185, 129, 0.28)',
                                borderRadius: 10,
                                padding: '10px 12px',
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    color: '#E2E8F0',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {quote.price_text}
                                </div>
                                <div style={{ color: '#94A3B8', fontSize: 11 }}>
                                    {quote.dep_time || '--:--'} → {quote.arr_time || '--:--'} · {quote.transfers_text} · {quote.provider}
                                </div>
                            </div>
                            <ExternalLink size={14} color="#34D399" />
                        </a>
                    ))}
                </div>
            </div>
        );
    };

    const renderLocalResults = () => {
        if (localResults.length === 0) return null;
        return (
            <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Local service options
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {localResults.slice(0, 5).map((item, idx) => {
                        const url = isSafeExternalUrl(item?.map_url) ? item.map_url : (isSafeExternalUrl(item?.website) ? item.website : '');
                        return (
                        <a
                            key={`${item?.id || idx}_local`}
                            href={url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                background: 'rgba(15, 23, 42, 0.55)',
                                border: '1px solid rgba(14, 165, 233, 0.28)',
                                borderRadius: 10,
                                padding: '10px 12px',
                                textDecoration: 'none',
                            }}
                        >
                            <div style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>
                                {item?.name || 'Local provider'}
                            </div>
                            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                                {item?.address || item?.category || item?.status || 'Details pending'}
                                {item?.rating ? ` · ${item.rating}⭐` : ''}
                            </div>
                        </a>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderShoppingResults = () => {
        if (shoppingResults.length === 0) return null;
        return (
            <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Shopping comparison options
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {shoppingResults.slice(0, 5).map((item, idx) => {
                        const url = isSafeExternalUrl(item?.url) ? item.url : '';
                        return (
                        <a
                            key={`${item?.id || idx}_shopping`}
                            href={url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                background: 'rgba(15, 23, 42, 0.55)',
                                border: '1px solid rgba(16, 185, 129, 0.28)',
                                borderRadius: 10,
                                padding: '10px 12px',
                                textDecoration: 'none',
                            }}
                        >
                            <div style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>
                                {item?.title || 'Product'}
                            </div>
                            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                                {item?.source || item?.merchant || 'Platform pending'}
                                {(item?.price_text || item?.price) ? ` · ${item.price_text || item.price}` : ''}
                            </div>
                        </a>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Failure case: show structured fallback
    if (!success && fallback) {
        return (
            <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <AlertCircle size={18} color="#EF4444" />
                    <span style={{ color: '#F87171', fontWeight: 500 }}>Unable to fetch live information</span>
                </div>

                <p style={{ color: '#CBD5E1', fontSize: 13, marginBottom: 12 }}>
                    {fallback.failure_reason}
                </p>

                {fallback.missing_constraints.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <span style={{ color: '#94A3B8', fontSize: 12 }}>Please provide:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {fallback.missing_constraints.map((constraint, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onConstraintClick?.(constraint)}
                                    style={{
                                        background: 'rgba(14, 165, 233, 0.15)',
                                        border: 'none',
                                        borderRadius: 16,
                                        padding: '6px 12px',
                                        color: '#0EA5E9',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                    }}
                                >
                                    + {constraint}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {renderActionLinks()}
                {renderQuoteCards()}

                <button
                    onClick={onRefresh}
                    style={{
                        background: 'rgba(14, 165, 233, 0.2)',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        borderRadius: 8,
                        padding: '8px 16px',
                        color: '#0EA5E9',
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    Refresh search
                </button>
            </div>
        );
    }

    // Success case: show sources with freshness badge
    const displayItems = (items || sources?.map(s => ({ ...s, snippet: '' })) || [])
        .filter((item) => isSafeExternalUrl(item?.url));

    if (displayItems.length === 0) {
        return null;
    }

    return (
        <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            border: '1px solid rgba(16, 185, 129, 0.15)',
        }}>
            {/* Header with badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search size={16} color="#10B981" />
                    <span style={{ color: '#F8FAFC', fontWeight: 500, fontSize: 14 }}>Live search results</span>
                </div>
                <FreshnessBadge isLive={is_live || false} fetchedAt={fetched_at} isStale={isStale} />
            </div>

            {renderActionLinks()}
            {renderQuoteCards()}
            {renderLocalResults()}
            {renderShoppingResults()}

            {/* Sources list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayItems.slice(0, 5).map((item, idx) => (
                    <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'block',
                            background: 'rgba(15, 23, 42, 0.5)',
                            borderRadius: 8,
                            padding: 10,
                            textDecoration: 'none',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                        }}
                    >
                        <div style={{ color: '#60A5FA', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                            {item.title}
                        </div>
                        {item.snippet && (
                            <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.4 }}>
                                {item.snippet.slice(0, 100)}...
                            </div>
                        )}
                        <div style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
                            {item.source_name} <ExternalLink size={10} style={{ marginLeft: 4 }} />
                        </div>
                    </a>
                ))}
            </div>

            {/* Refresh button */}
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        color: '#10B981',
                        fontSize: 12,
                        cursor: 'pointer',
                        marginTop: 12,
                    }}
                >
                    Refresh
                </button>
            )}
        </div>
    );
};

// ============================================================================
// Markdown Renderer - Simple markdown renderer component
// ============================================================================

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    // Preprocess: fix cross-line markdown links and extract standalone URLs
    const preprocessText = (content: string): string => {
        let processed = content;

        // 1. Fix cross-line markdown links: [text]\n(url) -> [text](url)
        processed = processed.replace(/\[([^\]]+)\]\s*\n\s*\(([^)]+)\)/g, '[$1]($2)');

        // 2. Fix [text] followed by (url) with spaces in between
        processed = processed.replace(/\[([^\]]+)\]\s+\(([^)]+)\)/g, '[$1]($2)');

        // 3. Fix URLs broken by line breaks/whitespace inside markdown links
        // Example: [Title](https://a.com/x
        //       ?k=v)
        processed = processed.replace(
            /\[([^\]]+)\]\((https?:\/\/[\s\S]*?)\)/g,
            (_match, label: string, rawUrl: string) => {
                const normalizedUrl = String(rawUrl).replace(/[\n\r\t ]+/g, '');
                return `[${label}](${normalizedUrl})`;
            }
        );

        return processed;
    };

    // Render a clickable link card
    const renderLinkCard = (url: string, displayText: string, key: number) => {
        // Extract domain
        let domain = '';
        try {
            const urlObj = new URL(url);
            domain = urlObj.hostname.replace('www.', '');
        } catch {
            domain = url.slice(0, 30);
        }

        return (
            <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                    e.stopPropagation();
                    window.open(url, '_blank', 'noopener,noreferrer');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    marginTop: 12,
                    marginBottom: 12,
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                    borderRadius: 12,
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(96, 165, 250, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #60A5FA 0%, #8B5CF6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <ExternalLink size={20} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        color: '#E0E7FF',
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {displayText || 'View details'}
                    </div>
                    <div style={{
                        color: '#94A3B8',
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {domain}
                    </div>
                </div>
                <div style={{
                    color: '#60A5FA',
                    fontSize: 20,
                }}>
                    →
                </div>
            </a>
        );
    };

    // Parse markdown text into React elements
    const renderMarkdown = (content: string) => {
        // Preprocess content
        const processedContent = preprocessText(content);

        // Split by line
        const lines = processedContent.split('\n');
        const elements: React.ReactNode[] = [];
        let currentParagraph: string[] = [];
        let elementKey = 0;

        const flushParagraph = () => {
            if (currentParagraph.length > 0) {
                const text = currentParagraph.join(' ');
                elements.push(
                    <p key={elementKey++} style={{ marginBottom: 12 }}>
                        {renderInlineMarkdown(text)}
                    </p>
                );
                currentParagraph = [];
            }
        };

        // Detect standalone URL lines (including wrapped in parentheses)
        const urlLinePattern = /^\s*\(?https?:\/\/[^\s)]+\)?\s*(?:\*?\((?:source|\u6765\u6e90)[^)]*\)\*?)?$/i;
        const extractUrlFromLine = (line: string): string | null => {
            const match = line.match(/https?:\/\/[^\s)]+/);
            return match ? match[0] : null;
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // Empty line: paragraph break
            if (!trimmedLine) {
                flushParagraph();
                return;
            }

            // Standalone URL line: render link card
            if (urlLinePattern.test(trimmedLine)) {
                flushParagraph();
                const url = extractUrlFromLine(trimmedLine);
                if (url) {
                    elements.push(renderLinkCard(url, 'View full details', elementKey++));
                }
                return;
            }

            // Markdown link line [text](url): render link card
            const markdownLinkMatch = trimmedLine.match(/^\s*(?:[-*•]\s+)?(?:[✈🔗📎]\s*)?\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/);
            if (markdownLinkMatch) {
                flushParagraph();
                const normalizedUrl = markdownLinkMatch[2].replace(/[\n\r\t ]+/g, '');
                elements.push(renderLinkCard(normalizedUrl, markdownLinkMatch[1], elementKey++));
                return;
            }

            // ### Heading
            if (trimmedLine.startsWith('### ')) {
                flushParagraph();
                elements.push(
                    <h4 key={elementKey++} style={{
                        color: colors.primary,
                        fontSize: 15,
                        fontWeight: 600,
                        marginTop: 16,
                        marginBottom: 8,
                        borderBottom: `1px solid ${colors.border}`,
                        paddingBottom: 4,
                    }}>
                        {renderInlineMarkdown(trimmedLine.slice(4))}
                    </h4>
                );
                return;
            }

            // ## Heading
            if (trimmedLine.startsWith('## ')) {
                flushParagraph();
                elements.push(
                    <h3 key={elementKey++} style={{
                        color: colors.text1,
                        fontSize: 16,
                        fontWeight: 700,
                        marginTop: 20,
                        marginBottom: 10,
                    }}>
                        {renderInlineMarkdown(trimmedLine.slice(3))}
                    </h3>
                );
                return;
            }

            // Ordered list (1. 2. 3.)
            const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
            if (orderedMatch) {
                flushParagraph();
                elements.push(
                    <div key={elementKey++} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 8,
                        paddingLeft: 4,
                    }}>
                        <span style={{
                            color: colors.primary,
                            fontWeight: 600,
                            minWidth: 20,
                        }}>
                            {orderedMatch[1]}.
                        </span>
                        <span style={{ flex: 1 }}>
                            {renderInlineMarkdown(orderedMatch[2])}
                        </span>
                    </div>
                );
                return;
            }

            // Unordered list (- * •), but do not treat `* **bold**` as a list item
            const isBulletList = (
                trimmedLine.startsWith('- ') ||
                trimmedLine.startsWith('• ') ||
                (trimmedLine.startsWith('* ') && !trimmedLine.startsWith('* **'))
            );
            if (isBulletList) {
                flushParagraph();
                elements.push(
                    <div key={elementKey++} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 8,
                        paddingLeft: 4,
                    }}>
                        <span style={{ color: colors.primary }}>•</span>
                        <span style={{ flex: 1 }}>
                            {renderInlineMarkdown(trimmedLine.slice(2))}
                        </span>
                    </div>
                );
                return;
            }

            // Plain text: collect into paragraph
            currentParagraph.push(trimmedLine);
        });

        // Flush final paragraph
        flushParagraph();

        return elements;
    };

    // Render inline markdown (**bold**, *italic*)
    const renderInlineMarkdown = (text: string): React.ReactNode => {
        // Handle inline tokens: **bold**, [link](url), and raw URLs
        const elements: React.ReactNode[] = [];
        let remaining = text;
        let keyIndex = 0;

        while (remaining.length > 0) {
            // Find next markdown token
            const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
            const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
            const plainUrlMatch = remaining.match(/https?:\/\/[^\s)\]]+/);

            // Pick the earliest match
            let earliestMatch: { type: 'bold' | 'link' | 'url'; index: number; match: RegExpMatchArray } | null = null;

            if (boldMatch && boldMatch.index !== undefined) {
                earliestMatch = { type: 'bold', index: boldMatch.index, match: boldMatch };
            }
            if (linkMatch && linkMatch.index !== undefined) {
                if (!earliestMatch || linkMatch.index < earliestMatch.index) {
                    earliestMatch = { type: 'link', index: linkMatch.index, match: linkMatch };
                }
            }
            if (plainUrlMatch && plainUrlMatch.index !== undefined) {
                if (!earliestMatch || plainUrlMatch.index < earliestMatch.index) {
                    earliestMatch = { type: 'url', index: plainUrlMatch.index, match: plainUrlMatch };
                }
            }

            if (!earliestMatch) {
                // No more matches, append remaining text
                if (remaining) {
                    elements.push(<span key={keyIndex++}>{remaining}</span>);
                }
                break;
            }

            // Append text before the match
            if (earliestMatch.index > 0) {
                elements.push(<span key={keyIndex++}>{remaining.slice(0, earliestMatch.index)}</span>);
            }

            // Render matched token
            if (earliestMatch.type === 'bold') {
                elements.push(
                    <strong key={keyIndex++} style={{ color: colors.text1, fontWeight: 600 }}>
                        {earliestMatch.match[1]}
                    </strong>
                );
                remaining = remaining.slice(earliestMatch.index + earliestMatch.match[0].length);
            } else if (earliestMatch.type === 'link') {
                const linkText = earliestMatch.match[1];
                const linkUrl = earliestMatch.match[2].replace(/[\n\r\t ]+/g, '');
                elements.push(
                    <a
                        key={keyIndex++}
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Open link in a new window
                            window.open(linkUrl, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                            color: '#60A5FA',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        {linkText} ↗
                    </a>
                );
                remaining = remaining.slice(earliestMatch.index + earliestMatch.match[0].length);
            } else if (earliestMatch.type === 'url') {
                const rawUrl = earliestMatch.match[0];
                const url = rawUrl.replace(/[\n\r\t ]+/g, '');
                let linkLabel = url;
                try {
                    linkLabel = new URL(url).hostname.replace('www.', '');
                } catch {
                    // keep original url
                }
                elements.push(
                    <a
                        key={keyIndex++}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                            color: '#60A5FA',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        {linkLabel} ↗
                    </a>
                );
                remaining = remaining.slice(earliestMatch.index + earliestMatch.match[0].length);
            }
        }

        return elements.length > 0 ? elements : text;
    };

    return (
        <div style={{
            color: colors.text2,
            fontSize: 14,
            lineHeight: 1.7,
        }}>
            {renderMarkdown(text)}
        </div>
    );
};

// Follow-up input component
const FollowUpInput: React.FC<{ onSubmit: (question: string) => void }> = ({ onSubmit }) => {
    const [input, setInput] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = () => {
        if (input.trim() && !isSubmitting) {
            setIsSubmitting(true);
            onSubmit(input.trim());
            setInput('');
            // Brief delay before resetting state
            setTimeout(() => setIsSubmitting(false), 500);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
        }}>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your question..."
                disabled={isSubmitting}
                style={{
                    flex: 1,
                    background: colors.bg2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 20,
                    padding: '10px 16px',
                    color: colors.text1,
                    fontSize: 14,
                    outline: 'none',
                }}
            />
            <button
                onClick={handleSubmit}
                disabled={!input.trim() || isSubmitting}
                style={{
                    background: input.trim() ? colors.primary : colors.bg3,
                    color: colors.text1,
                    border: 'none',
                    borderRadius: 20,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    opacity: input.trim() ? 1 : 0.5,
                    transition: 'all 0.2s',
                }}
            >
                {isSubmitting ? 'Sending...' : 'Send'}
            </button>
        </div>
    );
};

// Price comparison card - supports product variants and clickable links
const PriceCompareCard: React.FC<{ data: any }> = ({ data }) => {
    // Supports both new format (products array) and legacy format (results/prices)
    const products = data?.products;
    const legacyPrices = data?.results || data?.prices;

    // New format path (products array)
    if (products && Array.isArray(products) && products.length > 0) {
        return (
            <div style={{
                background: colors.bg2,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12
                }}>
                    <ShoppingCart size={18} color={colors.primary} />
                    <span style={{ color: colors.text1, fontWeight: 600 }}>Price comparison</span>
                    {data.brand && (
                        <span style={{ color: colors.text3, fontSize: 12 }}>
                            {data.brand}
                        </span>
                    )}
                    {data.lowestPrice && typeof data.lowestPrice === 'number' && !isNaN(data.lowestPrice) && (
                        <span style={{
                            background: colors.positiveMuted,
                            color: colors.positive,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            marginLeft: 'auto',
                        }}>
                            Lowest ¥{data.lowestPrice}
                        </span>
                    )}
                </div>

                {/* Product variants */}
                {products.map((product: any, pIndex: number) => (
                    <div key={pIndex} style={{
                        marginBottom: pIndex < products.length - 1 ? 16 : 0,
                        border: `1px solid ${colors.bg3}`,
                        borderRadius: 10,
                        overflow: 'hidden'
                    }}>
                        {/* Model and specs */}
                        <div style={{
                            background: colors.bg3,
                            padding: '10px 12px',
                            borderBottom: `1px solid ${colors.bg1}`
                        }}>
                            <div style={{
                                color: colors.text1,
                                fontWeight: 600,
                                fontSize: 14,
                                marginBottom: product.specs ? 4 : 0
                            }}>
                                🎧 {product.model}
                            </div>
                            {product.specs && (
                                <div style={{
                                    color: colors.text3,
                                    fontSize: 12
                                }}>
                                    {product.specs}
                                </div>
                            )}
                        </div>

                        {/* Platform price list */}
                        <div style={{ padding: 8 }}>
                            {(product.platforms || [])
                                // Filter out invalid platform records
                                .filter((plat: any) =>
                                    plat.name &&
                                    typeof plat.price === 'number' &&
                                    !isNaN(plat.price) &&
                                    plat.price > 0
                                )
                                .map((plat: any, platIndex: number, filteredPlatforms: any[]) => {
                                    const isLowest = plat.price === Math.min(...filteredPlatforms.map((p: any) => p.price));
                                    return (
                                        <div
                                            key={platIndex}
                                            onClick={() => plat.url && window.open(plat.url, '_blank')}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 10px',
                                                marginBottom: platIndex < filteredPlatforms.length - 1 ? 4 : 0,
                                                background: isLowest ? colors.positiveMuted : 'transparent',
                                                borderRadius: 6,
                                                cursor: plat.url ? 'pointer' : 'default',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {isLowest && <Star size={14} color={colors.positive} />}
                                                <span style={{ color: colors.text1, fontWeight: 500 }}>
                                                    {plat.name}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{
                                                    color: isLowest ? colors.positive : colors.text1,
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                }}>
                                                    ¥{plat.price}
                                                </span>
                                                {plat.url && (
                                                    <ExternalLink size={14} color={colors.text3} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}

                {/* Recommendation */}
                {data?.recommendation && (
                    <div style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        background: colors.primaryMuted,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <TrendingDown size={16} color={colors.primary} />
                        <span style={{ color: colors.primary, fontSize: 13 }}>
                            {data.recommendation}
                        </span>
                    </div>
                )}

                {/* Estimate note */}
                {data?.isEstimate && (
                    <div style={{
                        marginTop: 8,
                        color: colors.text3,
                        fontSize: 11,
                        textAlign: 'center'
                    }}>
                        * Estimated price. Open link for live pricing.
                    </div>
                )}
            </div>
        );
    }

    // Legacy format fallback
    if (!legacyPrices || !Array.isArray(legacyPrices) || legacyPrices.length === 0) return null;

    const lowestPrice = Math.min(...legacyPrices.map((p: any) => p.price));
    const productName = data?.product || data?.query || 'Product';
    const category = data?.category || '';

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
            }}>
                <ShoppingCart size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>Price comparison</span>
                {category && (
                    <span style={{ color: colors.text3, fontSize: 12 }}>
                        {category}
                    </span>
                )}
                <span style={{
                    background: colors.positiveMuted,
                    color: colors.positive,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    marginLeft: 'auto',
                }}>
                    Lowest ¥{lowestPrice}
                </span>
            </div>

            {productName && productName !== 'Product' && (
                <div style={{
                    color: colors.text2,
                    fontSize: 13,
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: colors.bg3,
                    borderRadius: 8,
                }}>
                    🏷️ {productName}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {legacyPrices.map((item: any, i: number) => (
                    <div
                        key={i}
                        onClick={() => item.url && window.open(item.url, '_blank')}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: item.price === lowestPrice ? colors.positiveMuted : colors.bg3,
                            borderRadius: 8,
                            border: item.price === lowestPrice ? `1px solid ${colors.positive}` : 'none',
                            cursor: item.url ? 'pointer' : 'default',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {item.price === lowestPrice && <Star size={14} color={colors.positive} />}
                            <span style={{ fontSize: 16 }}>{item.icon || '🛒'}</span>
                            <span style={{ color: colors.text1, fontWeight: 500 }}>{item.platform || item.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {item.originalPrice && item.originalPrice > item.price && (
                                <span style={{
                                    color: colors.text3,
                                    fontSize: 12,
                                    textDecoration: 'line-through',
                                }}>
                                    ¥{item.originalPrice}
                                </span>
                            )}
                            <span style={{
                                color: item.price === lowestPrice ? colors.positive : colors.text1,
                                fontWeight: 700,
                                fontSize: 16,
                            }}>
                                {item.currency || '¥'}{item.price}
                            </span>
                            {item.savings && item.savings > 0 && (
                                <span style={{
                                    background: colors.warningMuted,
                                    color: colors.warning,
                                    padding: '2px 6px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                }}>
                                    Save ¥{item.savings}
                                </span>
                            )}
                            {item.url && (
                                <ExternalLink size={14} color={colors.text3} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {data?.recommendation && (
                <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: colors.primaryMuted,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <TrendingDown size={16} color={colors.primary} />
                    <span style={{ color: colors.primary, fontSize: 13 }}>
                        {data.recommendation}
                    </span>
                </div>
            )}
        </div>
    );
};

// Search results card
const SearchResultCard: React.FC<{ data: any }> = ({ data }) => {
    if (!data || !data.results) return null;

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
            }}>
                <Search size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>Search results</span>
                <span style={{ color: colors.text3, fontSize: 12 }}>
                    {data.results.length} results
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.results.slice(0, 3).map((item: any, i: number) => (
                    <div
                        key={i}
                        style={{
                            padding: '10px 12px',
                            background: colors.bg3,
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                        onClick={() => item.url && window.open(item.url, '_blank')}
                    >
                        <div style={{
                            color: colors.primary,
                            fontSize: 14,
                            marginBottom: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}>
                            {item.title}
                            <ExternalLink size={12} />
                        </div>
                        <div style={{ color: colors.text3, fontSize: 12 }}>
                            {item.snippet || item.description}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// Hotel Result Card - hotel search result card
// ============================================================================

const HotelResultCard: React.FC<{ data: any }> = ({ data }) => {
    const hotels = data?.data?.hotels || data?.hotels || [];
    const destination = data?.data?.destination || data?.destination || '';
    const comparisonLinks = data?.data?.comparisonLinks || data?.comparisonLinks || [];
    const personalizedNote = data?.personalizedNote || '';

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 14px',
                background: `linear-gradient(135deg, #2563EB15, #7C3AED10)`,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🏨</span>
                    <span style={{ color: colors.text1, fontWeight: 600, fontSize: 14 }}>
                        {destination} hotel recommendations
                    </span>
                    <span style={{
                        background: colors.positiveMuted,
                        color: colors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        Live data
                    </span>
                </div>
                <span style={{ color: colors.text3, fontSize: 12 }}>{hotels.length} hotels</span>
            </div>

            {/* Hotel List */}
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hotels.slice(0, 4).map((hotel: any, i: number) => (
                    <div key={i} style={{
                        display: 'flex',
                        gap: 10,
                        padding: 10,
                        background: colors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                    }}>
                        {/* Thumbnail */}
                        {hotel.thumbnail && (
                            <img
                                src={hotel.thumbnail}
                                alt={hotel.name}
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 8,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                color: colors.text1,
                                fontWeight: 600,
                                fontSize: 13,
                                marginBottom: 4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {hotel.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                {hotel.stars && (
                                    <span style={{ fontSize: 11, color: '#F59E0B' }}>
                                        {'★'.repeat(hotel.stars)}
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
                                <span style={{ color: colors.text3, fontSize: 11 }}>
                                    {hotel.location || hotel.address || ''}
                                </span>
                                <span style={{
                                    color: colors.positive,
                                    fontWeight: 700,
                                    fontSize: 14,
                                }}>
                                    ¥{hotel.pricePerNight || hotel.price || '—'}<span style={{ fontSize: 11, fontWeight: 400 }}>/night</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Comparison Links */}
            {comparisonLinks.length > 0 && (
                <div style={{
                    padding: '8px 10px 10px',
                    borderTop: `1px solid ${colors.border}`,
                }}>
                    <div style={{ color: colors.text3, fontSize: 11, marginBottom: 6 }}>Compare bookings →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {comparisonLinks.slice(0, 4).map((link: any, i: number) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: colors.bg3,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: colors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.provider || link.title}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Personalized Note */}
            {personalizedNote && (
                <div style={{
                    padding: '6px 14px 10px',
                    color: colors.text3,
                    fontSize: 11,
                    fontStyle: 'italic',
                }}>
                    💡 {personalizedNote}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Flight Result Card - flight search result card
// ============================================================================

const FlightResultCard: React.FC<{ data: any }> = ({ data }) => {
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

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
            marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 14px',
                background: `linear-gradient(135deg, #0EA5E915, #06B6D410)`,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🛫</span>
                    <span style={{ color: colors.text1, fontWeight: 600, fontSize: 14 }}>
                        Flight recommendations
                    </span>
                    <span style={{
                        background: colors.positiveMuted,
                        color: colors.positive,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                    }}>
                        Live data
                    </span>
                </div>
                <span style={{ color: colors.text3, fontSize: 12 }}>{flights.length} flights</span>
            </div>

            {/* Flight List */}
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flights.length === 0 && (
                    <div style={{
                        padding: 12,
                        background: colors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        color: colors.text2,
                        fontSize: 12,
                    }}>
                        No displayable flight details returned yet. Use the comparison links below to continue.
                    </div>
                )}
                {flights.slice(0, 4).map((flight: any, i: number) => (
                    <div key={i} style={{
                        padding: 10,
                        background: colors.bg3,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: colors.text1, fontWeight: 600, fontSize: 13 }}>
                                    {flight.airline || flight.carrier || 'Flight'}
                                </span>
                                {(flight.flightNumber || flight.flightNo) && (
                                    <span style={{ color: colors.text3, fontSize: 11 }}>
                                        {flight.flightNumber || flight.flightNo}
                                    </span>
                                )}
                            </div>
                            <span style={{
                                color: colors.positive,
                                fontWeight: 700,
                                fontSize: 14,
                            }}>
                                ¥{flight.price || flight.totalPrice || '—'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text2, fontSize: 12 }}>
                            <span>{flight.departure_time || flight.departureTime || flight.departure || 'Time pending'}</span>
                            <span style={{ color: colors.text3 }}>→</span>
                            <span>{flight.arrival_time || flight.arrivalTime || flight.arrival || 'Time pending'}</span>
                            {flight.duration && (
                                <span style={{ color: colors.text3, marginLeft: 'auto', fontSize: 11 }}>
                                    {flight.duration}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                            <span style={{ color: colors.text3, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                {flight.source || 'Live source'}
                            </span>
                            {flight.bookingUrl && (
                                <a
                                    href={flight.bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: colors.primary,
                                        fontSize: 11,
                                        textDecoration: 'none',
                                        border: `1px solid ${colors.primary}55`,
                                        borderRadius: 8,
                                        padding: '3px 8px',
                                        background: colors.primaryMuted,
                                    }}
                                >
                                    Book
                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Comparison Links */}
            {comparisonLinks.length > 0 && (
                <div style={{
                    padding: '8px 10px 10px',
                    borderTop: `1px solid ${colors.border}`,
                }}>
                    <div style={{ color: colors.text3, fontSize: 11, marginBottom: 6 }}>Compare bookings →</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {comparisonLinks.slice(0, 4).map((link: any, i: number) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: colors.bg3,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: colors.primary,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {link.provider || link.name || link.title || 'Comparison link'}
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Personalized Note */}
            {personalizedNote && (
                <div style={{
                    padding: '6px 14px 10px',
                    color: colors.text3,
                    fontSize: 11,
                    fontStyle: 'italic',
                }}>
                    💡 {personalizedNote}
                </div>
            )}
        </div>
    );
};

// Generic skill result card - smart formatting
const GenericSkillCard: React.FC<{ skillName: string; data: any; icon: any }> = ({
    skillName, data, icon: Icon
}) => {
    // Try smart rendering by data structure
    const renderDataContent = () => {
        if (typeof data === 'string') {
            return <div style={{ color: colors.text2, fontSize: 14 }}>{data}</div>;
        }

        // If results array exists, render it as a list first
        if (data?.results && Array.isArray(data.results)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Product header */}
                    {data.product && (
                        <div style={{
                            color: colors.text2,
                            fontSize: 13,
                            padding: '6px 10px',
                            background: colors.bg3,
                            borderRadius: 8,
                        }}>
                            🏷️ {data.product} {data.category && `· ${data.category}`}
                        </div>
                    )}
                    {/* Result list */}
                    {data.results.slice(0, 6).map((item: any, i: number) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: colors.bg3,
                                borderRadius: 8,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 16 }}>{item.icon || '📍'}</span>
                                <span style={{ color: colors.text1, fontWeight: 500 }}>
                                    {item.platform || item.name || item.title || `Result ${i + 1}`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {item.price !== undefined && (
                                    <span style={{ color: colors.positive, fontWeight: 700 }}>
                                        {item.currency || '¥'}{item.price}
                                    </span>
                                )}
                                {item.savings && item.savings > 0 && (
                                    <span style={{
                                        background: colors.warningMuted,
                                        color: colors.warning,
                                        padding: '2px 6px',
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}>
                                        Save ¥{item.savings}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* Recommendation */}
                    {data.recommendation && (
                        <div style={{
                            marginTop: 4,
                            padding: '8px 12px',
                            background: colors.primaryMuted,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <TrendingDown size={14} color={colors.primary} />
                            <span style={{ color: colors.primary, fontSize: 13 }}>
                                {data.recommendation}
                            </span>
                        </div>
                    )}
                </div>
            );
        }

        // Other object types: format key-value pairs
        if (typeof data === 'object' && data !== null) {
            const entries = Object.entries(data).filter(([k, v]) =>
                v !== null && v !== undefined && typeof v !== 'object'
            );
            if (entries.length > 0) {
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {entries.map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', gap: 8 }}>
                                <span style={{ color: colors.text3, fontSize: 13 }}>{key}:</span>
                                <span style={{ color: colors.text2, fontSize: 13, flex: 1 }}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                );
            }
        }

        // Fallback: raw JSON
        return (
            <pre style={{
                color: colors.text3,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        );
    };

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10
            }}>
                <Icon size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>{skillName}</span>
            </div>
            {renderDataContent()}
        </div>
    );
};

// ============================================================================
// Three-Stage Plan Card (Phase 2 Week 2)
// ============================================================================

interface ThreeStagePlanCardProps {
    plan: ThreeStagePlan;
    onActionExecuted?: (action: string) => void;
}

const ThreeStagePlanCard: React.FC<ThreeStagePlanCardProps> = ({ plan, onActionExecuted }) => {
    const [expandedSteps, setExpandedSteps] = React.useState<number[]>([1]);
    const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
    const [executeLoading, setExecuteLoading] = React.useState(false);

    const toggleStep = (stepNum: number) => {
        setExpandedSteps(prev =>
            prev.includes(stepNum)
                ? prev.filter(n => n !== stepNum)
                : [...prev, stepNum]
        );
    };

    const toggleComplete = (stepNum: number) => {
        setCompletedSteps(prev =>
            prev.includes(stepNum)
                ? prev.filter(n => n !== stepNum)
                : [...prev, stepNum]
        );
    };

    const handleExecute = async () => {
        if (!plan.execute) return;
        setExecuteLoading(true);

        try {
            const actionService = getActionService();
            const result = await actionService.execute(
                plan.execute.action_type as any,
                plan.execute.action_data,
                { source: 'plan_step' }
            );

            if (result.success) {
                onActionExecuted?.(plan.execute.action_type);
            }
        } catch (error) {
            console.error('[ThreeStagePlanCard] Execute failed:', error);
        } finally {
            setExecuteLoading(false);
        }
    };

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
        }}>
            {/* Plan Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
            }}>
                <ListChecks size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>Execution plan</span>
                <span style={{
                    background: colors.primaryMuted,
                    color: colors.primary,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                }}>
                    {plan.plan.steps.length} steps · ~{plan.plan.estimated_time_minutes} min
                </span>
            </div>

            {/* Summary */}
            {plan.plan.summary && (
                <p style={{
                    color: colors.text2,
                    fontSize: 13,
                    marginBottom: 12,
                    lineHeight: 1.5,
                }}>
                    {plan.plan.summary}
                </p>
            )}

            {/* Plan Steps */}
            <div style={{ marginBottom: 16 }}>
                {plan.plan.steps.map((step) => {
                    const isExpanded = expandedSteps.includes(step.step_number);
                    const isCompleted = completedSteps.includes(step.step_number);

                    return (
                        <div
                            key={step.step_number}
                            style={{
                                background: step.is_primary ? colors.primaryMuted : colors.bg3,
                                borderRadius: 8,
                                marginBottom: 8,
                                border: step.is_primary ? `1px solid ${colors.primary}` : 'none',
                                opacity: isCompleted ? 0.7 : 1,
                            }}
                        >
                            {/* Step Header */}
                            <div
                                onClick={() => toggleStep(step.step_number)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    gap: 8,
                                }}
                            >
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleComplete(step.step_number);
                                    }}
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 4,
                                        border: `2px solid ${isCompleted ? colors.positive : colors.text3}`,
                                        background: isCompleted ? colors.positive : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {isCompleted && <CheckCircle size={14} color="#fff" />}
                                </div>

                                {isExpanded ? (
                                    <ChevronDown size={16} color={colors.text3} />
                                ) : (
                                    <ChevronRight size={16} color={colors.text3} />
                                )}

                                <span style={{
                                    color: step.is_primary ? colors.primary : colors.text1,
                                    fontWeight: step.is_primary ? 600 : 500,
                                    fontSize: 14,
                                    flex: 1,
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                }}>
                                    {step.step_number}. {step.title}
                                </span>

                                {step.estimated_minutes && (
                                    <span style={{
                                        color: colors.text3,
                                        fontSize: 12,
                                    }}>
                                        ~{step.estimated_minutes}min
                                    </span>
                                )}

                                {step.is_primary && (
                                    <Target size={14} color={colors.primary} />
                                )}
                            </div>

                            {/* Step Content */}
                            {isExpanded && (
                                <div style={{
                                    padding: '0 12px 12px 48px',
                                    color: colors.text2,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                }}>
                                    {step.description}

                                    {step.action_type && step.action_type !== 'external_link' && (
                                        <button
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                marginTop: 8,
                                                padding: '6px 12px',
                                                background: colors.bg1,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: 6,
                                                color: colors.text1,
                                                fontSize: 12,
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                getActionService().execute(
                                                    step.action_type as any,
                                                    step.action_data || {},
                                                    { source: 'plan_step' }
                                                );
                                            }}
                                        >
                                            <Play size={12} />
                                            Execute this step
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Execute Section */}
            {plan.execute && (
                <div style={{
                    background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}10)`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div>
                            <div style={{
                                color: colors.primary,
                                fontWeight: 600,
                                fontSize: 14,
                                marginBottom: 4,
                            }}>
                                {plan.execute.rationale}
                            </div>
                        </div>
                        <button
                            onClick={handleExecute}
                            disabled={executeLoading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '10px 20px',
                                background: executeLoading ? colors.bg3 : colors.primary,
                                border: 'none',
                                borderRadius: 8,
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: executeLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <Play size={16} />
                            {executeLoading ? 'Running...' : plan.execute.cta_label}
                        </button>
                    </div>
                </div>
            )}

            {/* Follow-up Section */}
            {(plan.followup.suggestions.length > 0 || plan.followup.conditions.length > 0) && (
                <div style={{
                    background: colors.bg3,
                    borderRadius: 8,
                    padding: 12,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 8,
                    }}>
                        <Bell size={14} color={colors.text3} />
                        <span style={{ color: colors.text2, fontSize: 13, fontWeight: 500 }}>
                            Follow-up
                        </span>
                    </div>

                    {plan.followup.conditions.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            {plan.followup.conditions.map((condition, i) => (
                                <div key={i} style={{
                                    color: colors.text3,
                                    fontSize: 12,
                                    marginBottom: 4,
                                }}>
                                    • {condition}
                                </div>
                            ))}
                        </div>
                    )}

                    {plan.followup.suggestions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {plan.followup.suggestions.map((suggestion, i) => (
                                <span
                                    key={i}
                                    style={{
                                        background: colors.bg1,
                                        color: colors.text2,
                                        padding: '4px 10px',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                >
                                    {suggestion}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

type ResultViewMode = 'answer' | 'details';

type SourceType = 'official' | 'news' | 'search' | 'ugc' | 'other';

interface SourcePreview {
    title: string;
    url: string;
    sourceName: string;
    domain: string;
    sourceType: SourceType;
    confidence: number; // 0-1
}

function safeDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'unknown';
    }
}

const OFFICIAL_DOMAIN_HINTS = [
    '.gov', '.edu', '.ac.', 'metoffice.gov.uk', 'weather.gov', 'wmo.int', 'who.int',
];
const NEWS_DOMAIN_HINTS = [
    'reuters.com', 'bbc.com', 'nytimes.com', 'apnews.com', 'bloomberg.com', 'ft.com',
    'theguardian.com', 'wsj.com', 'cnn.com',
];
const SEARCH_DOMAIN_HINTS = ['google.com', 'bing.com', 'baidu.com', 'duckduckgo.com'];
const UGC_DOMAIN_HINTS = ['reddit.com', 'x.com', 'twitter.com', 'weibo.com', 'zhihu.com', 'youtube.com'];

function inferSourceType(domain: string): SourceType {
    const host = domain.toLowerCase();
    if (OFFICIAL_DOMAIN_HINTS.some((hint) => host.includes(hint))) return 'official';
    if (NEWS_DOMAIN_HINTS.some((hint) => host.includes(hint))) return 'news';
    if (SEARCH_DOMAIN_HINTS.some((hint) => host.includes(hint))) return 'search';
    if (UGC_DOMAIN_HINTS.some((hint) => host.includes(hint))) return 'ugc';
    return 'other';
}

function scoreSourceConfidence(
    sourceType: SourceType,
    title?: string,
    sourceName?: string
): number {
    const baseMap: Record<SourceType, number> = {
        official: 0.94,
        news: 0.82,
        search: 0.72,
        ugc: 0.58,
        other: 0.68,
    };

    let score = baseMap[sourceType];
    const hintText = `${title || ''} ${sourceName || ''}`.toLowerCase();
    if (hintText.includes('official') || hintText.includes('Official')) score += 0.04;
    if (hintText.includes('blog') || hintText.includes('forum') || hintText.includes('\u8bba\u575b') || hintText.includes('community')) score -= 0.04;
    return Math.max(0.45, Math.min(0.99, score));
}

function classifySource(url: string, title: string, sourceName?: string): {
    domain: string;
    sourceType: SourceType;
    confidence: number;
} {
    const domain = safeDomain(url);
    const sourceType = inferSourceType(domain);
    const confidence = scoreSourceConfidence(sourceType, title, sourceName);
    return { domain, sourceType, confidence };
}

function collectSourcePreviews(result: SuperAgentResult): SourcePreview[] {
    const previews: SourcePreview[] = [];
    const seen = new Set<string>();

    const pushSource = (title: string, url: string, sourceName?: string) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        const { domain, sourceType, confidence } = classifySource(url, title, sourceName);
        previews.push({
            title: title || 'Source link',
            url,
            sourceName: sourceName || domain,
            domain,
            sourceType,
            confidence,
        });
    };

    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    const plainLinkRegex = /https?:\/\/[^\s)\]]+/g;

    const answer = result.answer || '';
    for (const match of answer.matchAll(markdownLinkRegex)) {
        pushSource(match[1], match[2], safeDomain(match[2]));
    }
    for (const match of answer.matchAll(plainLinkRegex)) {
        pushSource(safeDomain(match[0]), match[0], safeDomain(match[0]));
    }

    for (const item of result.results || []) {
        const data = item.data;
        if (!data || typeof data !== 'object') continue;

        if (Array.isArray(data.items)) {
            for (const source of data.items) {
                if (source?.url) {
                    pushSource(
                        source.title || source.source_name || safeDomain(source.url),
                        source.url,
                        source.source_name
                    );
                }
            }
        }

        if (Array.isArray(data.sources)) {
            for (const source of data.sources) {
                if (source?.url) {
                    pushSource(
                        source.title || source.source_name || safeDomain(source.url),
                        source.url,
                        source.source_name
                    );
                }
            }
        }

        if (Array.isArray(data.results)) {
            for (const source of data.results) {
                if (source?.url) {
                    pushSource(
                        source.title || source.name || safeDomain(source.url),
                        source.url,
                        source.source_name || source.platform || safeDomain(source.url)
                    );
                }
            }
        }
    }

    return previews
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 12);
}

export const SuperAgentResultPanel: React.FC<SuperAgentResultPanelProps> = ({
    result,
    onClose,
    onFollowUp,
    onOpenInMarket,
    onFallbackAction,
}) => {
    if (!result) return null;

    const [activeView, setActiveView] = React.useState<ResultViewMode>('answer');
    const [selectedSkillFilter, setSelectedSkillFilter] = React.useState<string>('all');
    const [answerExpanded, setAnswerExpanded] = React.useState(true);
    const [copyState, setCopyState] = React.useState<'idle' | 'copied'>('idle');

    const validResults = React.useMemo(
        () => (result.results || []).filter((r) => r.success && r.data),
        [result.results]
    );

    const sourcePreviews = React.useMemo(() => collectSourcePreviews(result), [result]);

    const sourceTypeMeta: Record<SourceType, {
        label: string;
        color: string;
        background: string;
        icon: React.ComponentType<{ size?: number; color?: string }>;
    }> = {
        official: { label: 'Official', color: '#10B981', background: 'rgba(16, 185, 129, 0.18)', icon: ShieldCheck },
        news: { label: 'News', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.18)', icon: Newspaper },
        search: { label: 'Search', color: '#0EA5E9', background: 'rgba(14, 165, 233, 0.18)', icon: Search },
        ugc: { label: 'UGC', color: '#A78BFA', background: 'rgba(167, 139, 250, 0.18)', icon: Users },
        other: { label: 'Web', color: '#94A3B8', background: 'rgba(148, 163, 184, 0.18)', icon: Globe },
    };

    const skillFilters = React.useMemo(() => {
        const counts = new Map<string, { id: string; label: string; count: number }>();
        validResults.forEach((item, index) => {
            const id = item.skillId || item.skillName || `skill_${index}`;
            const label = item.skillName || item.skillId || `Skill ${index + 1}`;
            const current = counts.get(id);
            if (current) {
                current.count += 1;
            } else {
                counts.set(id, { id, label, count: 1 });
            }
        });
        return Array.from(counts.values());
    }, [validResults]);

    const filteredResults = React.useMemo(() => {
        if (selectedSkillFilter === 'all') return validResults;
        return validResults.filter((item, index) => {
            const id = item.skillId || item.skillName || `skill_${index}`;
            return id === selectedSkillFilter;
        });
    }, [validResults, selectedSkillFilter]);

    const handleCopyAnswer = async () => {
        if (!result.answer) return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(result.answer);
            } else if (typeof document !== 'undefined') {
                const textarea = document.createElement('textarea');
                textarea.value = result.answer;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 1500);
        } catch (e) {
            console.warn('[SuperAgentResultPanel] copy failed:', e);
        }
    };

    const renderSkillResult = (skillResult: SkillResultData, index: number) => {
        const skillId = skillResult.skillId || `skill_${index}`;
        const resultKey = `${skillId}_${index}`;
        const skillName = skillResult.skillName || 'Skill result';
        const Icon = skillIcons[skillId] || MessageCircle;
        const data = skillResult.data;

        // Debug log
        console.log('[SuperAgentResultPanel] Rendering skill:', skillId, 'Data:', data);

        // P0: Live Search (highest priority)
        const isLiveSearch =
            skillId === 'live_search' ||
            skillName?.toLowerCase().includes('live search') ||
            skillName?.includes('\u5b9e\u65f6\u641c\u7d22') ||
            (data && data.is_live && data.items);

        if (isLiveSearch && data) {
            console.log('[SuperAgentResultPanel] Using LiveSearchResultCard for:', skillId);
            return <LiveSearchResultCard key={resultKey} data={data} />;
        }

        // Search results: detect by skillId and data shape
        const isWebSearch =
            skillId === 'web_search' ||
            skillName?.toLowerCase().includes('search') ||
            skillName?.includes('\u641c\u7d22') ||
            (data && data.results && data.query && !data.product && !data.products && !data.lowestPrice);

        if (isWebSearch && data) {
            console.log('[SuperAgentResultPanel] Using SearchResultCard for:', skillId);
            return <SearchResultCard key={resultKey} data={data} />;
        }

        // LIX intent trade: detect by skillId or data shape
        const isBroadcastIntent =
            skillId === 'broadcast_intent' ||
            skillName?.toLowerCase().includes('lix') ||
            skillName?.toLowerCase().includes('intent trade') ||
            skillName?.includes('\u610f\u56fe\u4ea4\u6613') ||
            (data && data.intentId && data.offers && Array.isArray(data.offers));

        // Domain Guard: Block market cards for non-purchase domains
        const isDomainGuardBlocked = data?.domain_guard_blocked === true;

        if (isBroadcastIntent && data && !isDomainGuardBlocked) {
            console.log('[SuperAgentResultPanel] Using OfferComparisonCard for:', skillId);
            return <OfferComparisonCard key={resultKey} data={data} onOpenInMarket={onOpenInMarket} />;
        }

        // P0-1: Completely hide blocked offers (Fallback A: no visual at all)
        // Do NOT show any message or red indicator - just hide to preserve trust
        if (isDomainGuardBlocked) {
            console.log('[SuperAgentResultPanel] DomainGuard HIDDEN (P0-1): category=', data?.blocked_category);
            return null;  // Complete hide - do not damage trust with any e-commerce reference
        }

        // Price comparison: detect by skillId or data shape
        const isPriceCompare =
            skillId === 'price_compare' ||
            skillName?.toLowerCase().includes('price') ||
            skillName?.toLowerCase().includes('compare') ||
            skillName?.includes('\u6bd4\u4ef7') ||
            (data && (data.products || data.prices) && (data.product || data.lowestPrice));

        if (isPriceCompare && data) {
            console.log('[SuperAgentResultPanel] Using PriceCompareCard for:', skillId);
            return <PriceCompareCard key={resultKey} data={data} />;
        }

        // Skip empty/placeholder data
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
            return null;
        }

        // Skip memory skill results with no hits
        if (skillId === 'memory' && data.found === 0) {
            return null;
        }

        // 🏨 Marketplace Hotel Agent Result
        const isHotelResult =
            skillId.includes('hotel_booking') ||
            (data?.data?.hotels && Array.isArray(data.data.hotels)) ||
            (data?.hotels && Array.isArray(data.hotels));

        if (isHotelResult && data) {
            console.log('[SuperAgentResultPanel] Using HotelResultCard for:', skillId);
            return <HotelResultCard key={resultKey} data={data} />;
        }

        // 🛫 Marketplace Flight Agent Result
        const isFlightResult =
            skillId.includes('flight_booking') ||
            (data?.data?.flights && Array.isArray(data.data.flights)) ||
            (data?.flights && Array.isArray(data.flights));

        if (isFlightResult && data) {
            console.log('[SuperAgentResultPanel] Using FlightResultCard for:', skillId);
            return <FlightResultCard key={resultKey} data={data} />;
        }

        // Generic renderer for other skills
        if (skillResult.success && data) {
            return (
                <GenericSkillCard
                    key={resultKey}
                    skillName={skillName}
                    data={data}
                    icon={Icon}
                />
            );
        }

        return null;
    };

    return (
        <div style={{
            background: colors.bg1,
            borderRadius: 16,
            padding: 20,
            height: '100%',
            overflowY: 'auto',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={20} color={colors.primary} />
                    <span style={{ color: colors.text1, fontWeight: 600, fontSize: 16 }}>
                        Super Agent Results
                    </span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <span style={{
                        background: result.confidence > 0.7 ? colors.positiveMuted : colors.warningMuted,
                        color: result.confidence > 0.7 ? colors.positive : colors.warning,
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                    }}>
                        Confidence {(result.confidence * 100).toFixed(0)}%
                    </span>
                    <span style={{ color: colors.text3, fontSize: 12 }}>
                        {result.executionTimeMs}ms
                    </span>
                </div>
            </div>

            {/* View Switcher */}
            <div style={{
                display: 'inline-flex',
                gap: 6,
                background: colors.bg2,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 4,
                marginBottom: 14,
            }}>
                <button
                    onClick={() => setActiveView('answer')}
                    style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        background: activeView === 'answer' ? colors.primaryMuted : 'transparent',
                        color: activeView === 'answer' ? colors.primary : colors.text2,
                        fontWeight: 600,
                    }}
                >
                    Answer View
                </button>
                <button
                    onClick={() => setActiveView('details')}
                    style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        background: activeView === 'details' ? colors.primaryMuted : 'transparent',
                        color: activeView === 'details' ? colors.primary : colors.text2,
                        fontWeight: 600,
                    }}
                >
                    Evidence & Data
                </button>
            </div>

            {/* Question */}
            <div style={{
                background: colors.bg2,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4
                }}>
                    <span style={{ color: colors.text3, fontSize: 12 }}>
                        Your Question
                    </span>
                    {/* v0.3: Domain Badge */}
                    {result.routeResult && (
                        <DomainBadge
                            domain={result.routeResult.intent_domain}
                            size="sm"
                        />
                    )}
                </div>
                <div style={{ color: colors.text1, fontSize: 14 }}>
                    {result.question}
                </div>
            </div>

            {/* v0.3: Fallback Panel when no valid offers */}
            {result.fallbackResponse && (
                <FallbackPanel
                    fallbackResponse={result.fallbackResponse}
                    intentText={result.question}
                    onOptionSelect={(option, data) => {
                        console.log('[SuperAgentResultPanel] Fallback action:', option.action_type, data);
                        onFallbackAction?.(option.action_type, data);
                    }}
                />
            )}

            {/* Answer View */}
            {activeView === 'answer' && (
                <>
                    {/* Answer */}
                    {result.answer && (
                        <div style={{
                            background: colors.primaryMuted,
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            borderLeft: `3px solid ${colors.primary}`,
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                marginBottom: 10,
                                flexWrap: 'wrap',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={16} color={colors.primary} />
                                    <span style={{ color: colors.primary, fontWeight: 600, fontSize: 13 }}>
                                        Best Answer
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={handleCopyAnswer}
                                        style={{
                                            border: `1px solid ${colors.border}`,
                                            background: colors.bg2,
                                            color: colors.text2,
                                            borderRadius: 8,
                                            padding: '6px 10px',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {copyState === 'copied' ? 'Copied' : 'Copy Answer'}
                                    </button>
                                    <button
                                        onClick={() => setAnswerExpanded((prev) => !prev)}
                                        style={{
                                            border: `1px solid ${colors.border}`,
                                            background: colors.bg2,
                                            color: colors.text2,
                                            borderRadius: 8,
                                            padding: '6px 10px',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {answerExpanded ? 'Collapse' : 'Expand'}
                                    </button>
                                    <button
                                        onClick={() => setActiveView('details')}
                                        style={{
                                            border: `1px solid ${colors.primary}`,
                                            background: colors.primaryMuted,
                                            color: colors.primary,
                                            borderRadius: 8,
                                            padding: '6px 10px',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        View Evidence
                                    </button>
                                </div>
                            </div>
                            {answerExpanded && (
                                <div style={{ color: colors.text1, fontSize: 14, lineHeight: 1.7 }}>
                                    <SimpleMarkdown text={result.answer} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Source Preview */}
                    {sourcePreviews.length > 0 && (
                        <div style={{
                            background: colors.bg2,
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 16,
                            border: `1px solid ${colors.border}`,
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 10,
                            }}>
                                <span style={{ color: colors.text1, fontWeight: 600, fontSize: 13 }}>Sources</span>
                                <span style={{ color: colors.text3, fontSize: 12 }}>{sourcePreviews.length} results</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {sourcePreviews.slice(0, 3).map((source, index) => (
                                    <a
                                        key={`${source.url}_${index}`}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            textDecoration: 'none',
                                            background: colors.bg3,
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            border: `1px solid ${colors.border}`,
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            marginBottom: 5,
                                        }}>
                                            <div style={{
                                                color: colors.primary,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                minWidth: 0,
                                                flex: 1,
                                            }}>
                                                <span style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                }}>
                                                    {source.title}
                                                </span>
                                                <ExternalLink size={12} />
                                            </div>
                                            <span style={{
                                                fontSize: 11,
                                                color: colors.text2,
                                                background: colors.bg2,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: 10,
                                                padding: '2px 7px',
                                                flexShrink: 0,
                                            }}>
                                                Confidence {(source.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}>
                                            <div style={{ color: colors.text3, fontSize: 11 }}>
                                                {source.sourceName}
                                            </div>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                borderRadius: 10,
                                                padding: '2px 7px',
                                                fontSize: 11,
                                                color: sourceTypeMeta[source.sourceType].color,
                                                background: sourceTypeMeta[source.sourceType].background,
                                                flexShrink: 0,
                                            }}>
                                                {(() => {
                                                    const Icon = sourceTypeMeta[source.sourceType].icon;
                                                    return <Icon size={11} color={sourceTypeMeta[source.sourceType].color} />;
                                                })()}
                                                {sourceTypeMeta[source.sourceType].label}
                                            </span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Three-Stage Plan (Phase 2 Week 2) */}
                    {result.plan && (
                        <ThreeStagePlanCard
                            plan={result.plan}
                            onActionExecuted={(action) => {
                                console.log('[SuperAgentResultPanel] Action executed:', action);
                            }}
                        />
                    )}
                </>
            )}

            {/* Details View */}
            {activeView === 'details' && (
                <div>
                    {/* Skill Filters */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 14,
                    }}>
                        <button
                            onClick={() => setSelectedSkillFilter('all')}
                            style={{
                                border: `1px solid ${selectedSkillFilter === 'all' ? colors.primary : colors.border}`,
                                background: selectedSkillFilter === 'all' ? colors.primaryMuted : colors.bg3,
                                color: selectedSkillFilter === 'all' ? colors.primary : colors.text2,
                                borderRadius: 16,
                                padding: '5px 11px',
                                fontSize: 12,
                                cursor: 'pointer',
                            }}
                        >
                            All
                        </button>
                        {skillFilters.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setSelectedSkillFilter(filter.id)}
                                style={{
                                    border: `1px solid ${selectedSkillFilter === filter.id ? colors.primary : colors.border}`,
                                    background: selectedSkillFilter === filter.id ? colors.primaryMuted : colors.bg3,
                                    color: selectedSkillFilter === filter.id ? colors.primary : colors.text2,
                                    borderRadius: 16,
                                    padding: '5px 11px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }}
                            >
                                {filter.label} · {filter.count}
                            </button>
                        ))}
                    </div>

                    <div style={{
                        color: colors.text3,
                        fontSize: 12,
                        marginBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Detailed Data
                    </div>

                    {filteredResults.length === 0 ? (
                        <div style={{
                            background: colors.bg2,
                            borderRadius: 12,
                            padding: 16,
                            color: colors.text3,
                            fontSize: 13,
                            textAlign: 'center',
                        }}>
                            No detailed data for the current filter
                        </div>
                    ) : (
                        filteredResults.map(renderSkillResult)
                    )}
                </div>
            )}

            {/* Follow-up Suggestions */}
            {
                onFollowUp && (() => {
                    // Extract original query/product name from result
                    const originalQuery = result.question ||
                        result.results?.find(r => r.data?.query || r.data?.product)?.data?.query ||
                        result.results?.find(r => r.data?.query || r.data?.product)?.data?.product ||
                        '';

                    // Generate smart follow-up suggestions from original query
                    const followUpSuggestions = originalQuery ? [
                        `${originalQuery} models`,
                        `${originalQuery} reviews`,
                        `Find coupons for ${originalQuery}`
                    ] : [
                        'Show more details',
                        'Related product recommendations',
                        'Continue searching for me'
                    ];

                    return (
                        <div style={{ marginTop: 16 }}>
                            <div style={{
                                color: colors.text3,
                                fontSize: 12,
                                marginBottom: 8
                            }}>
                                Ask a follow-up
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                {followUpSuggestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onFollowUp(q)}
                                        style={{
                                            background: colors.bg2,
                                            color: colors.text2,
                                            border: `1px solid ${colors.border}`,
                                            padding: '8px 14px',
                                            borderRadius: 20,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            {/* Free-form input for continuing the agent conversation */}
                            <FollowUpInput onSubmit={onFollowUp} />
                        </div>
                    );
                })()
            }
        </div >
    );
};

export default SuperAgentResultPanel;

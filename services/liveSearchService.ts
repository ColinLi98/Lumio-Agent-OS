/**
 * Live Search Service - Phase 3 Production
 * Real-time data retrieval using OpenAI web_search tool
 * 
 * POLICY:
 * - API key from OPENAI_API_KEY env var ONLY (never hardcoded)
 * - Returns EvidencePack with sources, fetched_at, TTL
 * - Cache by (intent_domain + normalized_query)
 * - PII redaction before external calls
 */

import { sanitizeForExternalSearch, redactPII } from './piiRedactor';
import { classifyFreshness } from './freshnessClassifier';
import type {
    EvidencePack as DtoeEvidencePack,
    EvidenceItem as DtoeEvidenceItem,
    EvidenceProvider as DtoeEvidenceProvider,
} from './dtoe/coreSchemas';

// ============================================================================
// Types
// ============================================================================

export interface LiveSearchRequest {
    query: string;
    locale: string;
    intent_domain: string;
    max_items?: number;
}

/**
 * v0.1 aligned provider types
 */
export type EvidenceProvider = DtoeEvidenceProvider;

export type EvidenceItem = DtoeEvidenceItem;

/**
 * EvidencePack - aligned with v0.1 schema
 * NOTE: Both fetched_at (ISO string) and fetched_at_ms (number) are provided for compatibility
 */
export interface EvidencePack extends DtoeEvidencePack {
    fetched_at: string;       // ISO timestamp (legacy)
    query_normalized: string;
    intent_domain: string;
    notes: {
        warnings: string[];
        cache_hit?: boolean;
    };
}

export interface LiveSearchError {
    code: 'PII_BLOCKED' | 'API_ERROR' | 'NO_RESULTS' | 'RATE_LIMITED' | 'NO_API_KEY' | 'NETWORK_ERROR';
    message: string;
    retryable: boolean;
    reason_code: string;
}

export type LiveSearchResult =
    | { success: true; evidence: EvidencePack }
    | { success: false; error: LiveSearchError };

// ============================================================================
// Observability Logging
// ============================================================================

interface LogEvent {
    timestamp: string;
    event: string;
    data: Record<string, any>;
}

const eventLogs: LogEvent[] = [];

function logEvent(event: string, data: Record<string, any>): void {
    const logEntry: LogEvent = {
        timestamp: new Date().toISOString(),
        event,
        data,
    };
    eventLogs.push(logEntry);
    console.log(`[LiveSearch] ${event}:`, JSON.stringify(data));

    // Keep only last 100 logs
    if (eventLogs.length > 100) {
        eventLogs.shift();
    }
}

export function getRecentLogs(): LogEvent[] {
    return [...eventLogs];
}

// ============================================================================
// Cache Layer
// ============================================================================

interface CacheEntry {
    evidence: EvidencePack;
    expires_at: number;
}

const searchCache = new Map<string, CacheEntry>();

/**
 * TTL by domain (in seconds) - per spec
 */
const TTL_BY_DOMAIN: Record<string, number> = {
    'travel.flight': 120,
    'travel.train': 120,
    'travel.hotel': 180,
    'ecommerce.product': 60,
    'local.service': 60,
    'finance': 300,
    'news': 300,
    'knowledge': 600,
};

function getTTL(domain: string): number {
    if (TTL_BY_DOMAIN[domain]) {
        return TTL_BY_DOMAIN[domain];
    }
    const prefix = domain.split('.')[0];
    for (const [key, ttl] of Object.entries(TTL_BY_DOMAIN)) {
        if (key.startsWith(prefix + '.') || key === prefix) {
            return ttl;
        }
    }
    return 300; // default 5 minutes
}

function normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCacheKey(query: string, domain: string): string {
    return `${domain}::${normalizeQuery(query)}`;
}

function getFromCache(query: string, domain: string): EvidencePack | null {
    const key = getCacheKey(query, domain);
    const entry = searchCache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expires_at) {
        searchCache.delete(key);
        return null;
    }

    logEvent('live_search.cache_hit', { domain, query: query.slice(0, 30) });

    // Return with cache_hit flag
    return {
        ...entry.evidence,
        notes: {
            ...entry.evidence.notes,
            cache_hit: true,
        },
    };
}

function setCache(query: string, domain: string, evidence: EvidencePack): void {
    const key = getCacheKey(query, domain);
    const ttlMs = evidence.ttl_seconds * 1000;

    searchCache.set(key, {
        evidence,
        expires_at: Date.now() + ttlMs,
    });

    // Cleanup old entries (simple LRU-like)
    if (searchCache.size > 100) {
        const oldest = searchCache.keys().next().value;
        if (oldest) searchCache.delete(oldest);
    }
}

// ============================================================================
// OpenAI Web Search (Responses API)
// ============================================================================

/**
 * Call OpenAI Responses API with web_search tool
 * Key is read from OPENAI_API_KEY env var only
 */
async function callOpenAIWebSearch(
    query: string,
    maxItems: number,
    traceId: string
): Promise<{ items: EvidenceItem[]; warnings: string[] }> {
    // Get API key from environment - NEVER hardcoded
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        logEvent('live_search.fail', { reason_code: 'NO_API_KEY', trace_id: traceId });
        throw new Error('OPENAI_API_KEY environment variable not set');
    }

    logEvent('live_search.call', { trace_id: traceId, query: query.slice(0, 50) });

    const warnings: string[] = [];

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                tools: [{ type: 'web_search' }],
                input: `Search the web for: ${query}. Return the most relevant and recent results with accurate information.`,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logEvent('live_search.fail', {
                reason_code: 'API_ERROR',
                status: response.status,
                trace_id: traceId
            });
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const items: EvidenceItem[] = [];

        // Parse web search results from OpenAI Responses API output
        if (data.output) {
            for (const output of data.output) {
                if (output.type === 'web_search_call' && output.results) {
                    for (const result of output.results) {
                        items.push({
                            title: result.title || '',
                            snippet: result.snippet || result.description || '',
                            url: result.url || '',
                            source_name: extractSourceName(result.url || ''),
                        });
                    }
                }
                // Also handle message type outputs that may contain extracted info
                if (output.type === 'message' && output.content) {
                    // The model may have synthesized info - note this as a warning
                    warnings.push('Response includes AI-synthesized content');
                }
            }
        }

        // Filter to valid items only
        const validItems = items
            .filter(item => item.url && item.title)
            .slice(0, maxItems);

        logEvent('live_search.success', {
            trace_id: traceId,
            items_count: validItems.length
        });

        return { items: validItems, warnings };

    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            logEvent('live_search.fail', { reason_code: 'NETWORK_ERROR', trace_id: traceId });
            throw new Error('Network error: Unable to reach OpenAI API');
        }
        throw error;
    }
}

function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

// ============================================================================
// Main Service
// ============================================================================

let traceCounter = 0;

/**
 * Perform live search with caching and PII protection
 */
export async function liveSearch(request: LiveSearchRequest): Promise<LiveSearchResult> {
    const { query, locale, intent_domain, max_items = 5 } = request;
    const traceId = `ls_${Date.now()}_${++traceCounter}`;

    logEvent('live_search.request', {
        trace_id: traceId,
        intent_domain,
        locale,
        query_length: query.length
    });

    // 1. PII Redaction - MUST happen before any external call
    const redactionResult = redactPII(query);
    const sanitizedQuery = sanitizeForExternalSearch(query);

    if (!sanitizedQuery) {
        logEvent('live_search.fail', {
            reason_code: 'PII_BLOCKED',
            trace_id: traceId,
            pii_types: redactionResult.pii_types_found
        });
        return {
            success: false,
            error: {
                code: 'PII_BLOCKED',
                message: '查询包含敏感信息，无法进行外部搜索',
                retryable: false,
                reason_code: 'PII_BLOCKED',
            },
        };
    }

    // 2. Check cache
    const cached = getFromCache(sanitizedQuery, intent_domain);
    if (cached) {
        return { success: true, evidence: cached };
    }

    // 3. Check API key exists before making call
    if (!process.env.OPENAI_API_KEY) {
        logEvent('live_search.fail', { reason_code: 'NO_API_KEY', trace_id: traceId });
        return {
            success: false,
            error: {
                code: 'NO_API_KEY',
                message: 'OpenAI API key not configured',
                retryable: false,
                reason_code: 'NO_API_KEY',
            },
        };
    }

    // 4. Call OpenAI web search
    try {
        const { items, warnings } = await callOpenAIWebSearch(sanitizedQuery, max_items, traceId);

        if (items.length === 0) {
            logEvent('live_search.fail', { reason_code: 'NO_RESULTS', trace_id: traceId });
            return {
                success: false,
                error: {
                    code: 'NO_RESULTS',
                    message: '未找到相关实时结果',
                    retryable: true,
                    reason_code: 'NO_RESULTS',
                },
            };
        }

        // 5. Build EvidencePack
        const ttl = getTTL(intent_domain);
        const fetchedAt = new Date();
        const confidence = Math.min(0.9, 0.5 + items.length * 0.1);

        const evidence: EvidencePack = {
            provider: 'openai_web_search',
            fetched_at: fetchedAt.toISOString(),
            fetched_at_ms: fetchedAt.getTime(),
            ttl_seconds: ttl,
            query_normalized: normalizeQuery(sanitizedQuery),
            intent_domain,
            items,
            confidence,
            notes: {
                warnings,
                cache_hit: false,
            },
        };

        // 6. Cache it
        setCache(sanitizedQuery, intent_domain, evidence);

        return { success: true, evidence };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const reasonCode = errorMessage.includes('OPENAI_API_KEY') ? 'NO_API_KEY' :
            errorMessage.includes('Network') ? 'NETWORK_ERROR' : 'API_ERROR';

        logEvent('live_search.fail', {
            reason_code: reasonCode,
            trace_id: traceId,
            error: errorMessage
        });

        return {
            success: false,
            error: {
                code: reasonCode as any,
                message: errorMessage,
                retryable: reasonCode !== 'NO_API_KEY',
                reason_code: reasonCode,
            },
        };
    }
}

/**
 * Check if evidence is still fresh
 */
export function isEvidenceFresh(evidence: EvidencePack): boolean {
    const fetchedAt = Number.isFinite(evidence.fetched_at_ms)
        ? evidence.fetched_at_ms
        : new Date(evidence.fetched_at).getTime();
    const age = Date.now() - fetchedAt;
    return age < evidence.ttl_seconds * 1000;
}

/**
 * Get formatted update time for UI display
 */
export function formatFetchedAt(evidence: EvidencePack): string {
    const date = new Date(Number.isFinite(evidence.fetched_at_ms) ? evidence.fetched_at_ms : evidence.fetched_at);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Clear the cache (for testing/debugging)
 */
export function clearCache(): void {
    searchCache.clear();
    logEvent('live_search.cache_cleared', {});
}

// ============================================================================
// Exports
// ============================================================================

export default {
    liveSearch,
    isEvidenceFresh,
    formatFetchedAt,
    getRecentLogs,
    clearCache,
};

/**
 * Vertex Grounding Parser - Phase 3 v0.1
 * Parses Vertex AI Grounding citations into EvidencePack
 *
 * Grounding: Connects model outputs to verifiable sources
 */

import type { EvidencePack, EvidenceItem, EvidenceProvider } from './coreSchemas';

// ============================================================================
// Vertex AI Grounding Response Types
// ============================================================================

interface VertexCitation {
    title?: string;
    uri?: string;
    publicationDate?: string;
}

interface VertexGroundingMetadata {
    webSearchQueries?: string[];
    retrievalQueries?: string[];
    groundingSupports?: Array<{
        segment?: { text?: string };
        groundingChunkIndices?: number[];
        confidenceScores?: number[];
    }>;
    groundingChunks?: Array<{
        web?: {
            uri?: string;
            title?: string;
        };
        retrievedContext?: {
            uri?: string;
            title?: string;
        };
    }>;
}

interface VertexGroundingResponse {
    candidates?: Array<{
        groundingMetadata?: VertexGroundingMetadata;
        citationMetadata?: {
            citations?: VertexCitation[];
        };
    }>;
}

// ============================================================================
// TTL Configuration by Domain
// ============================================================================

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
        if (key.startsWith(prefix)) {
            return ttl;
        }
    }
    return 300;  // Default 5 minutes
}

// ============================================================================
// Source Name Extraction
// ============================================================================

function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

// ============================================================================
// Main Parser
// ============================================================================

export interface ParseOptions {
    domain?: string;
    max_items?: number;
}

/**
 * Parse Vertex AI Grounding response into EvidencePack
 */
export function parseVertexGrounding(
    response: VertexGroundingResponse,
    options: ParseOptions = {}
): EvidencePack {
    const domain = options.domain ?? 'knowledge';
    const maxItems = options.max_items ?? 5;
    const items: EvidenceItem[] = [];

    // Extract from candidates
    for (const candidate of response.candidates || []) {
        const grounding = candidate.groundingMetadata;
        const citations = candidate.citationMetadata?.citations || [];

        // Process grounding chunks (primary source)
        if (grounding?.groundingChunks) {
            for (const chunk of grounding.groundingChunks) {
                if (chunk.web?.uri) {
                    items.push({
                        title: chunk.web.title || 'Web Result',
                        snippet: '',  // Vertex doesn't provide snippets in chunks
                        url: chunk.web.uri,
                        source_name: extractSourceName(chunk.web.uri),
                    });
                }
                if (chunk.retrievedContext?.uri) {
                    items.push({
                        title: chunk.retrievedContext.title || 'Retrieved Context',
                        snippet: '',
                        url: chunk.retrievedContext.uri,
                        source_name: extractSourceName(chunk.retrievedContext.uri),
                    });
                }
            }
        }

        // Process citations (fallback)
        for (const citation of citations) {
            if (citation.uri) {
                items.push({
                    title: citation.title || 'Citation',
                    snippet: '',
                    url: citation.uri,
                    source_name: extractSourceName(citation.uri),
                });
            }
        }

        // Extract snippets from grounding supports
        if (grounding?.groundingSupports) {
            for (const support of grounding.groundingSupports) {
                if (support.segment?.text && support.groundingChunkIndices?.length) {
                    const idx = support.groundingChunkIndices[0];
                    if (items[idx]) {
                        items[idx].snippet = support.segment.text.slice(0, 200);
                    }
                }
            }
        }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueItems = items.filter(item => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    }).slice(0, maxItems);

    // Compute confidence based on item count
    const confidence = Math.min(0.9, 0.3 + uniqueItems.length * 0.15);

    return {
        items: uniqueItems,
        fetched_at_ms: Date.now(),
        ttl_seconds: getTTL(domain),
        provider: 'vertex_grounding',
        confidence,
    };
}

// ============================================================================
// Domain Guard: Filter Ecommerce from Ticketing
// ============================================================================

const ECOMMERCE_DOMAINS = [
    'jd.com',
    'taobao.com',
    'tmall.com',
    'pinduoduo.com',
    'pdd.com',
    'amazon.com',
    'amazon.cn',
    'suning.com',
    'dangdang.com',
];

/**
 * Filter out ecommerce sources for ticketing domain
 * P0: Ticketing queries must not show ecommerce results
 */
export function filterEcommerceForTicketing(
    pack: EvidencePack,
    intent_domain: string
): EvidencePack {
    if (!intent_domain.startsWith('ticketing') && !intent_domain.startsWith('travel')) {
        return pack;
    }

    const filteredItems = pack.items.filter(item => {
        const source = item.source_name.toLowerCase();
        return !ECOMMERCE_DOMAINS.some(domain => source.includes(domain));
    });

    return {
        ...pack,
        items: filteredItems,
        confidence: filteredItems.length > 0
            ? pack.confidence
            : 0,  // No confidence if all filtered out
    };
}

// ============================================================================
// Combine Multiple Evidence Sources
// ============================================================================

export function mergeEvidencePacks(packs: EvidencePack[]): EvidencePack {
    if (packs.length === 0) {
        return {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 300,
            provider: 'manual_upload',
            confidence: 0,
        };
    }

    const allItems: EvidenceItem[] = [];
    let minTTL = Infinity;
    let maxConfidence = 0;

    for (const pack of packs) {
        allItems.push(...pack.items);
        minTTL = Math.min(minTTL, pack.ttl_seconds);
        maxConfidence = Math.max(maxConfidence, pack.confidence);
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueItems = allItems.filter(item => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    });

    return {
        items: uniqueItems.slice(0, 10),
        fetched_at_ms: Date.now(),
        ttl_seconds: minTTL === Infinity ? 300 : minTTL,
        provider: packs[0].provider,
        confidence: maxConfidence,
    };
}

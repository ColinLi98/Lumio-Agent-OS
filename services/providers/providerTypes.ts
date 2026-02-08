/**
 * Provider Types
 * L.I.X. Provider Adapter Layer
 * 
 * Core types for JD/PDD/Taobao scraping adapters.
 * These types do NOT modify the v0.2 frozen contract.
 */

import type { IntentRequest, Offer, PriceInfo, FulfillmentInfo } from '../lixTypes.js';

// ============================================================================
// Provider Identifiers
// ============================================================================

export type ProviderId = 'jd' | 'pdd' | 'taobao';

export const PROVIDER_IDS: ProviderId[] = ['jd', 'pdd', 'taobao'];

// ============================================================================
// Search Input/Output
// ============================================================================

export interface ProviderSearchInput {
    canonical_sku: string;
    keywords: string[];           // Derived from sku/specs
    budget_max?: number;
    budget_min?: number;
    location_code?: string;
    trace_id: string;
}

export interface CandidateItem {
    provider_id: ProviderId;
    title: string;
    url: string;
    listed_price?: number;
    currency: 'CNY';
    shop_label?: 'official' | 'flagship' | 'third_party' | 'unknown';
    image_url?: string;
    sales_count?: number;
    evidence?: {
        html_hash?: string;
        scraped_at: string;
        cache_hit?: boolean;
    };
}

// ============================================================================
// Detail Extraction
// ============================================================================

// Inventory signal type (mirrors lixTypes for adapter use)
export type InventorySignal = 'in_stock' | 'low_stock' | 'out_of_stock' | 'limited' | 'unknown';

export interface DetailExtractionResult {
    final_price: number;
    currency: 'CNY';
    inventory_signal: InventorySignal;
    delivery_eta?: string;
    sku_specs?: Record<string, string>;  // e.g., { storage: '256GB', color: '黑色' }
    shop_name?: string;
    shop_rating?: number;
    source_url: string;
    price_verified_at: string;
    html_hash?: string;
}

// ============================================================================
// Offer Building
// ============================================================================

export interface OfferBuildInput {
    candidate: CandidateItem;
    detail: DetailExtractionResult;
    intent: IntentRequest;
    trace_id: string;
}

// ============================================================================
// Provider Adapter Interface
// ============================================================================

// Provider capability classification
export type ProviderKind = 'ticketing' | 'ecommerce' | 'service';

// Provider group (more detailed classification)
export type ProviderGroupType =
    | 'ecommerce'
    | 'ticketing'
    | 'travel'
    | 'local_service'
    | 'food'
    | 'talent';

// Supported domains
export type SupportedDomain =
    | 'commerce'
    | 'ticketing'
    | 'travel'
    | 'food'
    | 'local_service'
    | 'education'
    | 'talent'
    | 'other';

// Result types that a provider can return
export type ResultType = 'product' | 'ticket' | 'booking' | 'quote' | 'lead';

/**
 * Provider Capabilities (v0.3)
 * Describes what a provider can and cannot do
 */
export interface ProviderCapabilities {
    /** Provider group classification */
    provider_group: ProviderGroupType;
    /** Domains this provider supports */
    supported_domains: SupportedDomain[];
    /** Specific intent subtypes supported */
    supported_subtypes: string[];
    /** Types of results this provider returns */
    result_types: ResultType[];
}

export interface ProviderAdapter {
    id: ProviderId;
    name: string;
    domains_allowlist: string[];
    /** Provider capability - determines which verticals can route to this provider */
    provider_kind: ProviderKind;
    /** Detailed capabilities (v0.3) */
    capabilities: ProviderCapabilities;

    /**
     * Search for candidates matching the input.
     * Returns top 5-10 candidates.
     */
    search(input: ProviderSearchInput): Promise<CandidateItem[]>;

    /**
     * Extract detailed info from a candidate's product page.
     */
    extractDetail(candidate: CandidateItem, trace_id: string): Promise<DetailExtractionResult | null>;

    /**
     * Build a complete Offer from candidate + detail.
     */
    buildOffer(input: OfferBuildInput): Promise<Offer>;
}


// ============================================================================
// Scraping Result Types
// ============================================================================

export type ScrapeLayer = 'search' | 'detail';

export interface ScrapeResult<T> {
    success: boolean;
    data?: T;
    cache_hit: boolean;
    latency_ms: number;
    error?: string;
    ban_detected?: boolean;
    ban_reason?: BanReason;
}

// ============================================================================
// Ban Detection Types
// ============================================================================

export type BanReason =
    | 'HTTP_403'
    | 'HTTP_429'
    | 'CAPTCHA_PAGE'
    | 'LOGIN_REQUIRED'
    | 'SECURITY_REDIRECT'
    | 'EMPTY_DOM'
    | 'PARSE_FAILED'
    | 'REDIRECT_BLOCKED'
    | 'DOMAIN_MISMATCH'
    | 'TIMEOUT';

export type BanSeverity = 'HARD' | 'SOFT';

export interface BanSignal {
    detected: boolean;
    reason?: BanReason;
    severity?: BanSeverity;
    score_delta?: number;
    message?: string;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitResult {
    allowed: boolean;
    remaining?: number;
    reset_at?: number;
    wait_ms?: number;
}

// ============================================================================
// Circuit Breaker Types
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
    state: CircuitState;
    ban_score: number;
    last_failure_at?: number;
    cooldown_until?: number;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
    id: ProviderId;
    name: string;
    domains_allowlist: string[];
    rate_limit_per_min: number;
    max_concurrency: number;
    search_url_template: string;
    selectors: {
        search: SearchSelectors;
        detail: DetailSelectors;
    };
}

export interface SearchSelectors {
    item_container: string[];
    title: string[];
    price: string[];
    link: string[];
    shop_label: string[];
    image: string[];
}

export interface DetailSelectors {
    final_price: string[];
    stock_status: string[];
    delivery_eta: string[];
    shop_name: string[];
    sku_options: string[];
}

// ============================================================================
// Fingerprint Types
// ============================================================================

export interface BrowserFingerprint {
    user_agent: string;
    viewport: { width: number; height: number };
    device_scale_factor: number;
    is_mobile: boolean;
    locale: string;
    timezone: string;
    accept_language: string;
}

// ============================================================================
// Retry Types
// ============================================================================

export interface RetryConfig {
    max_attempts: number;
    base_delay_ms: number;
    max_delay_ms: number;
    jitter_ms: number;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    attempts: number;
    total_latency_ms: number;
    last_error?: string;
}

// ============================================================================
// Provider Registry Types
// ============================================================================

export interface ProviderFanoutResult {
    provider_id: ProviderId;
    candidates: CandidateItem[];
    offers: Offer[];
    latency_ms: number;
    cache_hits: { search: boolean; detail: boolean[] };
    errors: string[];
    circuit_open: boolean;
}

export interface MarketFanoutResult {
    all_candidates: CandidateItem[];
    all_offers: Offer[];
    provider_results: ProviderFanoutResult[];
    total_latency_ms: number;
    /** Set to 'NO_PROVIDER_FOR_VERTICAL' if no providers support the intent vertical */
    status?: 'OK' | 'NO_PROVIDER_FOR_VERTICAL';
    /** The vertical classification for the intent (for UI handling) */
    vertical?: string;
}

// ============================================================================
// Cache Key Builders
// ============================================================================

export function buildSearchCacheKey(
    provider_id: ProviderId,
    canonical_sku: string,
    location_code?: string,
    budget_max?: number
): string {
    const sku_hash = hashString(canonical_sku);
    const loc = location_code || 'CN';
    const budget_bucket = budget_max ? Math.floor(budget_max / 1000) * 1000 : 0;
    return `lix:scrape:search:${provider_id}:${sku_hash}:${loc}:${budget_bucket}`;
}

export function buildDetailCacheKey(
    provider_id: ProviderId,
    url: string
): string {
    const url_hash = hashString(url);
    return `lix:scrape:detail:${provider_id}:${url_hash}`;
}

// Simple hash function for cache keys
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// ============================================================================
// Utility: Generate Offer ID
// ============================================================================

export function generateOfferId(provider_id: ProviderId): string {
    return `off_${provider_id}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================================================
// Utility: Extract Keywords from SKU
// ============================================================================

export function extractKeywords(sku: string, specs?: Record<string, string>): string[] {
    const keywords: string[] = [];

    // Split SKU by common delimiters
    const skuParts = sku.split(/[\s\-_\/]+/).filter(p => p.length > 1);
    keywords.push(...skuParts);

    // Add spec values
    if (specs) {
        Object.values(specs).forEach(v => {
            if (v && v.length > 1) {
                keywords.push(v);
            }
        });
    }

    // Deduplicate
    return [...new Set(keywords)];
}

export type SerpApiEngine =
    | 'google_maps'
    | 'google_local'
    | 'google_maps_reviews'
    | 'google_shopping'
    | 'google_flights'
    | 'google_hotels';

export type SerpApiDomain = 'local_service' | 'shopping' | 'travel' | 'general';
export type SerpApiFreshnessPolicy = 'cache_ok' | 'force_live';

export type SerpApiParamValue = string | number | boolean;

export interface SerpApiExecuteRequest {
    engine: SerpApiEngine;
    params: Record<string, SerpApiParamValue>;
    locale?: string;
    domain?: SerpApiDomain;
    freshness_policy?: SerpApiFreshnessPolicy;
}

export type SerpApiErrorCode =
    | 'auth'
    | 'quota'
    | 'network'
    | 'provider_error'
    | 'parse_error'
    | 'no_results'
    | 'invalid_request'
    | 'internal_error';

export interface SerpApiExecuteError {
    code: SerpApiErrorCode;
    message: string;
    retryable: boolean;
    status?: number;
}

export interface SerpApiFallbackMeta {
    reason: string;
    cta_buttons: Array<{ label: string; action: string; constraint_key?: string }>;
}

export interface SerpApiNormalizedLink {
    title: string;
    url: string;
    source?: string;
}

export interface SerpApiLocalItem {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    reviews?: number;
    status?: string;
    price_level?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    map_url?: string;
}

export interface SerpApiReviewItem {
    author?: string;
    rating?: number;
    date?: string;
    snippet: string;
    source?: string;
}

export interface SerpApiShoppingItem {
    id: string;
    title: string;
    source?: string;
    merchant?: string;
    price?: number;
    price_text?: string;
    currency?: string;
    rating?: number;
    reviews?: number;
    thumbnail?: string;
    url?: string;
}

export interface SerpApiNormalizedPayload {
    kind: 'local' | 'shopping' | 'travel' | 'raw';
    items?: Array<SerpApiLocalItem | SerpApiShoppingItem | SerpApiReviewItem>;
    cards?: any[];
    links?: SerpApiNormalizedLink[];
    local_results?: SerpApiLocalItem[];
    shopping_results?: SerpApiShoppingItem[];
    review_results?: SerpApiReviewItem[];
}

export interface SerpApiEvidenceItem {
    title: string;
    snippet: string;
    url: string;
    source_name: string;
}

export interface SerpApiExecuteResponse {
    success: boolean;
    engine: SerpApiEngine;
    raw?: any;
    normalized: SerpApiNormalizedPayload;
    evidence: {
        provider: string;
        fetched_at: string;
        ttl_seconds: number;
        items: SerpApiEvidenceItem[];
    };
    debug_meta?: {
        status?: number;
        request_url?: string;
    };
    error?: SerpApiExecuteError;
    fallback?: SerpApiFallbackMeta;
}


/**
 * Scrape Cache
 * L.I.X. Provider Adapter Layer
 * 
 * Redis-backed cache for search (60s TTL) and detail (120s TTL) results.
 * The #1 anti-ban lever - prefer cached data to avoid repeated requests.
 */

import type { ProviderId, CandidateItem, DetailExtractionResult, ScrapeLayer } from './providerTypes';
import { buildSearchCacheKey, buildDetailCacheKey } from './providerTypes';
import { incCounter } from '../metricsCollector';

// ============================================================================
// Configuration
// ============================================================================

const CACHE_TTL = {
    search: 60,      // 60 seconds for search results
    detail: 120,     // 120 seconds for detail pages
    ban_page: 30     // 30 seconds for ban/error pages (avoid hammering)
};

// ============================================================================
// Redis Client Interface (MVP: In-Memory Fallback)
// ============================================================================

interface CacheEntry<T> {
    data: T;
    expires_at: number;
    created_at: number;
}

// In-memory cache for MVP (replace with Redis in production)
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Periodic cleanup
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
        if (entry.expires_at < now) {
            memoryCache.delete(key);
        }
    }
}, 30000); // Clean up every 30s

if (typeof (cleanupTimer as NodeJS.Timeout).unref === 'function') {
    (cleanupTimer as NodeJS.Timeout).unref();
}

// ============================================================================
// Redis Operations (with memory fallback)
// ============================================================================

async function getFromRedis<T>(key: string): Promise<T | null> {
    // Try Redis first (if available)
    if (typeof globalThis !== 'undefined' && (globalThis as any).redisClient) {
        try {
            const redis = (globalThis as any).redisClient;
            const value = await redis.get(key);
            if (value) {
                return JSON.parse(value) as T;
            }
        } catch (e) {
            console.warn('[scrapeCache.redis_error] GET failed, falling back to memory', e);
        }
    }

    // Fallback to memory
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expires_at > Date.now()) {
        return entry.data;
    }
    return null;
}

async function setInRedis<T>(key: string, value: T, ttlSec: number): Promise<void> {
    const serialized = JSON.stringify(value);

    // Try Redis first
    if (typeof globalThis !== 'undefined' && (globalThis as any).redisClient) {
        try {
            const redis = (globalThis as any).redisClient;
            await redis.set(key, serialized, { EX: ttlSec });
            return;
        } catch (e) {
            console.warn('[scrapeCache.redis_error] SET failed, falling back to memory', e);
        }
    }

    // Fallback to memory
    memoryCache.set(key, {
        data: value,
        expires_at: Date.now() + (ttlSec * 1000),
        created_at: Date.now()
    });
}

// ============================================================================
// Search Cache
// ============================================================================

export async function getCachedSearch(
    provider_id: ProviderId,
    canonical_sku: string,
    location_code?: string,
    budget_max?: number
): Promise<CandidateItem[] | null> {
    const key = buildSearchCacheKey(provider_id, canonical_sku, location_code, budget_max);
    const cached = await getFromRedis<CandidateItem[]>(key);

    if (cached) {
        incCounter('lix_provider_cache_hits_total', { provider_id, layer: 'search' });
        return cached;
    }

    incCounter('lix_provider_cache_misses_total', { provider_id, layer: 'search' });
    return null;
}

export async function setCachedSearch(
    provider_id: ProviderId,
    canonical_sku: string,
    candidates: CandidateItem[],
    location_code?: string,
    budget_max?: number
): Promise<void> {
    const key = buildSearchCacheKey(provider_id, canonical_sku, location_code, budget_max);
    await setInRedis(key, candidates, CACHE_TTL.search);
}

// ============================================================================
// Detail Cache
// ============================================================================

export async function getCachedDetail(
    provider_id: ProviderId,
    url: string
): Promise<DetailExtractionResult | null> {
    const key = buildDetailCacheKey(provider_id, url);
    const cached = await getFromRedis<DetailExtractionResult>(key);

    if (cached) {
        incCounter('lix_provider_cache_hits_total', { provider_id, layer: 'detail' });
        return cached;
    }

    incCounter('lix_provider_cache_misses_total', { provider_id, layer: 'detail' });
    return null;
}

export async function setCachedDetail(
    provider_id: ProviderId,
    url: string,
    detail: DetailExtractionResult
): Promise<void> {
    const key = buildDetailCacheKey(provider_id, url);
    await setInRedis(key, detail, CACHE_TTL.detail);
}

// ============================================================================
// Ban Page Cache (short TTL to avoid hammering)
// ============================================================================

export async function cacheBanPage(
    provider_id: ProviderId,
    url: string,
    reason: string
): Promise<void> {
    const key = `lix:scrape:ban:${provider_id}:${hashUrl(url)}`;
    await setInRedis(key, { reason, cached_at: Date.now() }, CACHE_TTL.ban_page);
}

export async function isBanPageCached(
    provider_id: ProviderId,
    url: string
): Promise<boolean> {
    const key = `lix:scrape:ban:${provider_id}:${hashUrl(url)}`;
    const cached = await getFromRedis<{ reason: string }>(key);
    return cached !== null;
}

// ============================================================================
// Cache Statistics
// ============================================================================

export function getCacheStats(): {
    memory_entries: number;
    memory_size_estimate: number;
} {
    let sizeEstimate = 0;
    for (const [key, entry] of memoryCache.entries()) {
        sizeEstimate += key.length + JSON.stringify(entry.data).length;
    }

    return {
        memory_entries: memoryCache.size,
        memory_size_estimate: sizeEstimate
    };
}

// ============================================================================
// Clear Cache (for testing)
// ============================================================================

export function clearCache(): void {
    memoryCache.clear();
}

// ============================================================================
// Utility
// ============================================================================

function hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

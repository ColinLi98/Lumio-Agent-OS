/**
 * Rate Limiter
 * L.I.X. Provider Adapter Layer
 * 
 * Redis-based token bucket rate limiting per provider.
 * Prevents ban by limiting request frequency.
 */

import type { ProviderId, RateLimitResult } from './providerTypes';
import { incCounter } from '../metricsCollector';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_LIMITS: Record<ProviderId, number> = {
    jd: 20,      // 20 requests per minute
    pdd: 15,     // 15 requests per minute
    taobao: 15   // 15 requests per minute
};

const GLOBAL_LIMIT = 50; // 50 total requests per minute across all providers
const WINDOW_SIZE_MS = 60000; // 1 minute window

// ============================================================================
// In-Memory Token Bucket (MVP - replace with Redis in production)
// ============================================================================

interface TokenBucket {
    tokens: number;
    last_refill: number;
    max_tokens: number;
    refill_rate: number; // tokens per second
}

const buckets = new Map<string, TokenBucket>();

function getOrCreateBucket(key: string, maxTokens: number): TokenBucket {
    let bucket = buckets.get(key);

    if (!bucket) {
        bucket = {
            tokens: maxTokens,
            last_refill: Date.now(),
            max_tokens: maxTokens,
            refill_rate: maxTokens / 60 // Refill over 1 minute
        };
        buckets.set(key, bucket);
    }

    return bucket;
}

function refillTokens(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed_sec = (now - bucket.last_refill) / 1000;
    const tokens_to_add = elapsed_sec * bucket.refill_rate;

    bucket.tokens = Math.min(bucket.max_tokens, bucket.tokens + tokens_to_add);
    bucket.last_refill = now;
}

// ============================================================================
// Redis-based Rate Limiting (with memory fallback)
// ============================================================================

async function checkRateLimitRedis(key: string, limit: number): Promise<RateLimitResult> {
    // Try Redis first
    if (typeof globalThis !== 'undefined' && (globalThis as any).redisClient) {
        try {
            const redis = (globalThis as any).redisClient;
            const windowKey = `lix:ratelimit:${key}:${Math.floor(Date.now() / WINDOW_SIZE_MS)}`;

            // INCR + EXPIRE pattern
            const count = await redis.incr(windowKey);
            if (count === 1) {
                await redis.expire(windowKey, 61); // TTL slightly longer than window
            }

            if (count > limit) {
                return {
                    allowed: false,
                    remaining: 0,
                    reset_at: Math.ceil(Date.now() / WINDOW_SIZE_MS) * WINDOW_SIZE_MS,
                    wait_ms: WINDOW_SIZE_MS - (Date.now() % WINDOW_SIZE_MS)
                };
            }

            return {
                allowed: true,
                remaining: limit - count
            };
        } catch (e) {
            console.warn('[rateLimiter.redis_error] Falling back to memory', e);
        }
    }

    // Fallback to memory token bucket
    const bucket = getOrCreateBucket(key, limit);
    refillTokens(bucket);

    if (bucket.tokens < 1) {
        return {
            allowed: false,
            remaining: 0,
            wait_ms: Math.ceil((1 - bucket.tokens) / bucket.refill_rate * 1000)
        };
    }

    bucket.tokens -= 1;
    return {
        allowed: true,
        remaining: Math.floor(bucket.tokens)
    };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if a request to a provider is allowed
 */
export async function checkProviderRateLimit(provider_id: ProviderId): Promise<RateLimitResult> {
    const limit = DEFAULT_LIMITS[provider_id] || 15;
    const result = await checkRateLimitRedis(`provider:${provider_id}`, limit);

    if (!result.allowed) {
        incCounter('lix_provider_rate_limit_blocks_total', { provider_id });
        console.log(`[rateLimiter.blocked] provider=${provider_id} remaining=0`);
    }

    return result;
}

/**
 * Check global rate limit (across all providers)
 */
export async function checkGlobalRateLimit(): Promise<RateLimitResult> {
    const result = await checkRateLimitRedis('global', GLOBAL_LIMIT);

    if (!result.allowed) {
        incCounter('lix_provider_rate_limit_blocks_total', { provider_id: 'global' });
        console.log('[rateLimiter.blocked] global limit reached');
    }

    return result;
}

/**
 * Check domain-specific rate limit
 */
export async function checkDomainRateLimit(domain: string): Promise<RateLimitResult> {
    const domainLimit = 30; // 30 requests per minute per domain
    return await checkRateLimitRedis(`domain:${domain}`, domainLimit);
}

/**
 * Combined check: provider + global + domain
 */
export async function canMakeRequest(provider_id: ProviderId, domain?: string): Promise<RateLimitResult> {
    // Check global first
    const globalResult = await checkGlobalRateLimit();
    if (!globalResult.allowed) {
        return globalResult;
    }

    // Check provider limit
    const providerResult = await checkProviderRateLimit(provider_id);
    if (!providerResult.allowed) {
        return providerResult;
    }

    // Check domain limit if provided
    if (domain) {
        const domainResult = await checkDomainRateLimit(domain);
        if (!domainResult.allowed) {
            return domainResult;
        }
    }

    return { allowed: true, remaining: providerResult.remaining };
}

// ============================================================================
// Configuration Override (for testing/tuning)
// ============================================================================

export function setProviderLimit(provider_id: ProviderId, limit: number): void {
    DEFAULT_LIMITS[provider_id] = limit;
    // Clear existing bucket to apply new limit
    buckets.delete(`provider:${provider_id}`);
}

// ============================================================================
// Statistics
// ============================================================================

export function getRateLimitStats(): Record<string, { tokens: number; max: number }> {
    const stats: Record<string, { tokens: number; max: number }> = {};

    for (const [key, bucket] of buckets.entries()) {
        refillTokens(bucket);
        stats[key] = {
            tokens: Math.floor(bucket.tokens),
            max: bucket.max_tokens
        };
    }

    return stats;
}

// ============================================================================
// Reset (for testing)
// ============================================================================

export function resetRateLimits(): void {
    buckets.clear();
}

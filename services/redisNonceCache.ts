/**
 * Redis-Based Nonce Cache for Replay Protection
 * L.I.X. v0.2 Compliant - P0-2 Blocking Fix
 * 
 * Interface with two implementations:
 * - RedisNonceCache: Production-ready Redis SETNX pattern
 * - MemoryNonceCache: MVP fallback (NOT production-ready)
 * 
 * Redis pattern: SET nonce:{user_pseudonym}:{nonce} 1 NX EX {validity_window_sec}
 * If SETNX fails → return 409 NONCE_REPLAY
 */

// ============================================================================
// Interface
// ============================================================================

export interface NonceCacheResult {
    valid: boolean;
    error?: string;
    code?: 'NONCE_REPLAY' | 'INVALID_NONCE_FORMAT';
}

export interface NonceCache {
    /**
     * Validate nonce is unique and record it atomically
     * Returns valid=false if nonce was already used (replay attack)
     */
    validateAndRecord(
        userPseudonym: string,
        nonce: string,
        ttlSec: number
    ): Promise<NonceCacheResult>;

    /**
     * Check if a nonce was already used (read-only)
     */
    isReplayed(userPseudonym: string, nonce: string): Promise<boolean>;

    /**
     * Get cache statistics
     */
    getStats(): Promise<{ size: number; backend: 'redis' | 'memory' }>;

    /**
     * Clear cache (for testing only)
     */
    clear(): Promise<void>;
}

// ============================================================================
// Redis Implementation (Production)
// ============================================================================

interface RedisClient {
    set(key: string, value: string, options?: { NX?: boolean; EX?: number }): Promise<'OK' | null>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
}

export class RedisNonceCache implements NonceCache {
    private redis: RedisClient;
    private keyPrefix: string;

    constructor(redis: RedisClient, keyPrefix: string = 'lix:nonce') {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
    }

    private makeKey(userPseudonym: string, nonce: string): string {
        return `${this.keyPrefix}:${userPseudonym}:${nonce}`;
    }

    async validateAndRecord(
        userPseudonym: string,
        nonce: string,
        ttlSec: number
    ): Promise<NonceCacheResult> {
        // Validate nonce format
        if (!nonce || nonce.length < 16) {
            return {
                valid: false,
                error: 'Invalid nonce format: must be at least 16 characters',
                code: 'INVALID_NONCE_FORMAT'
            };
        }

        const key = this.makeKey(userPseudonym, nonce);

        // Atomic SET NX EX - only succeeds if key doesn't exist
        const result = await this.redis.set(key, '1', { NX: true, EX: ttlSec });

        if (result === null) {
            // Key already exists = nonce was already used
            console.log(`[security.nonce_replay] key=${key.substring(0, 30)}...`);
            return {
                valid: false,
                error: 'Nonce already used (replay attack detected)',
                code: 'NONCE_REPLAY'
            };
        }

        console.log(`[security.nonce_recorded] key=${key.substring(0, 30)}... ttl=${ttlSec}s`);
        return { valid: true };
    }

    async isReplayed(userPseudonym: string, nonce: string): Promise<boolean> {
        const key = this.makeKey(userPseudonym, nonce);
        const exists = await this.redis.get(key);
        return exists !== null;
    }

    async getStats(): Promise<{ size: number; backend: 'redis' | 'memory' }> {
        const keys = await this.redis.keys(`${this.keyPrefix}:*`);
        return { size: keys.length, backend: 'redis' };
    }

    async clear(): Promise<void> {
        const keys = await this.redis.keys(`${this.keyPrefix}:*`);
        for (const key of keys) {
            await this.redis.del(key);
        }
    }
}

// ============================================================================
// Memory Implementation (MVP Fallback)
// ============================================================================

interface NonceRecord {
    userPseudonym: string;
    nonce: string;
    timestamp: number;
    expiresAt: number;
}

export class MemoryNonceCache implements NonceCache {
    private cache = new Map<string, NonceRecord>();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Start periodic cleanup
        this.startCleanup();
        console.warn('[nonceCache] Using in-memory cache - NOT PRODUCTION READY');
    }

    private makeKey(userPseudonym: string, nonce: string): string {
        return `${userPseudonym}:${nonce}`;
    }

    private startCleanup(): void {
        if (this.cleanupInterval) return;

        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            for (const [key, record] of this.cache.entries()) {
                if (now > record.expiresAt) {
                    this.cache.delete(key);
                    cleaned++;
                }
            }
            if (cleaned > 0) {
                console.log(`[nonceCache] Cleaned ${cleaned} expired nonces`);
            }
        }, 60000); // Every minute
    }

    async validateAndRecord(
        userPseudonym: string,
        nonce: string,
        ttlSec: number
    ): Promise<NonceCacheResult> {
        // Validate nonce format
        if (!nonce || nonce.length < 16) {
            return {
                valid: false,
                error: 'Invalid nonce format: must be at least 16 characters',
                code: 'INVALID_NONCE_FORMAT'
            };
        }

        const key = this.makeKey(userPseudonym, nonce);

        // Check if already exists
        const existing = this.cache.get(key);
        if (existing && Date.now() < existing.expiresAt) {
            console.log(`[security.nonce_replay] key=${key.substring(0, 30)}...`);
            return {
                valid: false,
                error: 'Nonce already used (replay attack detected)',
                code: 'NONCE_REPLAY'
            };
        }

        // Record the nonce
        this.cache.set(key, {
            userPseudonym,
            nonce,
            timestamp: Date.now(),
            expiresAt: Date.now() + (ttlSec * 1000)
        });

        console.log(`[security.nonce_recorded] key=${key.substring(0, 30)}... ttl=${ttlSec}s (memory)`);
        return { valid: true };
    }

    async isReplayed(userPseudonym: string, nonce: string): Promise<boolean> {
        const key = this.makeKey(userPseudonym, nonce);
        const record = this.cache.get(key);
        return record !== undefined && Date.now() < record.expiresAt;
    }

    async getStats(): Promise<{ size: number; backend: 'redis' | 'memory' }> {
        return { size: this.cache.size, backend: 'memory' };
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// ============================================================================
// Factory & Singleton
// ============================================================================

let nonceCacheInstance: NonceCache | null = null;

/**
 * Get the nonce cache instance
 * Uses Redis if available, falls back to memory
 */
export function getNonceCache(): NonceCache {
    if (!nonceCacheInstance) {
        // TODO: Check for Redis connection and use RedisNonceCache if available
        // For MVP, use memory cache
        nonceCacheInstance = new MemoryNonceCache();
    }
    return nonceCacheInstance;
}

/**
 * Set a custom nonce cache instance (for testing or Redis injection)
 */
export function setNonceCache(cache: NonceCache): void {
    nonceCacheInstance = cache;
}

/**
 * Initialize with Redis client
 */
export function initRedisNonceCache(redis: RedisClient): void {
    nonceCacheInstance = new RedisNonceCache(redis);
    console.log('[nonceCache] Initialized with Redis backend');
}

// ============================================================================
// Convenience Functions (use singleton)
// ============================================================================

/**
 * Validate and record nonce using singleton cache
 */
export async function validateAndRecordNonce(
    userPseudonym: string,
    nonce: string,
    ttlSec: number = 1800
): Promise<NonceCacheResult> {
    return getNonceCache().validateAndRecord(userPseudonym, nonce, ttlSec);
}

/**
 * Check if nonce is replayed using singleton cache
 */
export async function isNonceReplayed(
    userPseudonym: string,
    nonce: string
): Promise<boolean> {
    return getNonceCache().isReplayed(userPseudonym, nonce);
}

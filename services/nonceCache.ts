/**
 * Server-side Nonce Cache for Replay Protection
 * L.I.X. v0.2 Compliant
 * 
 * MVP: In-memory Map
 * Production: Redis with TTL
 */

// ============================================================================
// Types
// ============================================================================

export interface NonceRecord {
    nonce: string;
    timestamp: number;
    intent_hash: string;
    used: boolean;
    ip_address?: string;
}

// ============================================================================
// In-Memory Cache (Replace with Redis in production)
// ============================================================================

const nonceCache = new Map<string, NonceRecord>();
const NONCE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

// Periodic cleanup of expired nonces
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupInterval(): void {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
        const cutoff = Date.now() - NONCE_TTL_MS;
        let cleaned = 0;
        for (const [key, record] of nonceCache.entries()) {
            if (record.timestamp < cutoff) {
                nonceCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`[nonceCache] Cleaned ${cleaned} expired nonces`);
        }
    }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCleanupInterval();

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate that nonce has not been used
 */
export function validateNonce(nonce: string): {
    valid: boolean;
    error?: string;
    code?: string;
} {
    // Check format
    if (!nonce || nonce.length < 16) {
        return {
            valid: false,
            error: 'Invalid nonce format: must be at least 16 characters',
            code: 'INVALID_NONCE_FORMAT'
        };
    }

    // Check if nonce exists and was already used
    const existing = nonceCache.get(nonce);
    if (existing && existing.used) {
        console.log(`[security.nonce_replay] Nonce reuse detected: ${nonce.substring(0, 8)}...`);
        return {
            valid: false,
            error: 'Nonce already used (replay attack detected)',
            code: 'NONCE_REPLAY'
        };
    }

    return { valid: true };
}

/**
 * Record nonce as used (call after successful validation)
 */
export function recordNonce(
    nonce: string,
    intentHash: string,
    ipAddress?: string
): void {
    nonceCache.set(nonce, {
        nonce,
        timestamp: Date.now(),
        intent_hash: intentHash,
        used: true,
        ip_address: ipAddress
    });

    // Log for observability
    console.log(`[security.nonce_recorded] ${nonce.substring(0, 8)}... -> ${intentHash.substring(0, 16)}...`);
}

/**
 * Check if validity window has expired
 */
export function isValidityWindowExpired(
    timestamp: number,
    validityWindowSec: number
): boolean {
    const expiresAt = timestamp + (validityWindowSec * 1000);
    return Date.now() > expiresAt;
}

/**
 * Get remaining validity in seconds
 */
export function getRemainingValidity(
    timestamp: number,
    validityWindowSec: number
): number {
    const expiresAt = timestamp + (validityWindowSec * 1000);
    const remaining = expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
}

/**
 * Get cache stats (for observability)
 */
export function getNonceCacheStats(): {
    size: number;
    oldest_timestamp: number | null;
    newest_timestamp: number | null;
} {
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const record of nonceCache.values()) {
        if (oldest === null || record.timestamp < oldest) {
            oldest = record.timestamp;
        }
        if (newest === null || record.timestamp > newest) {
            newest = record.timestamp;
        }
    }

    return {
        size: nonceCache.size,
        oldest_timestamp: oldest,
        newest_timestamp: newest
    };
}

/**
 * Clear all nonces (for testing only)
 */
export function clearNonceCache(): void {
    nonceCache.clear();
    console.log('[nonceCache] Cache cleared');
}

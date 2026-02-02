/**
 * Proof-of-Intent Service
 * 
 * Generates cryptographic proof of user intent for LIX market:
 * - Stable hash (canonicalized JSON)
 * - Device signature (browser fingerprint)
 * - Nonce for uniqueness
 * - TTL enforcement
 */

import { IntentRequest } from './lixTypes';

// ============================================================================
// Types
// ============================================================================

export interface ProofOfIntent {
    /** SHA-256 hash of canonicalized intent */
    intent_hash: string;
    /** Random nonce for uniqueness */
    nonce: string;
    /** Unix timestamp of proof creation */
    timestamp: number;
    /** Time-to-live in seconds (default 1800 = 30 min) */
    ttl: number;
    /** Expiration timestamp */
    expires_at: number;
    /** Device fingerprint signature */
    device_signature: string;
    /** User pseudonym (privacy-preserving) */
    user_pseudonym: string;
}

export interface ProofValidationResult {
    valid: boolean;
    expired: boolean;
    hash_mismatch: boolean;
    device_mismatch: boolean;
    error?: string;
}

// ============================================================================
// Device Fingerprinting
// ============================================================================

function getDeviceFingerprint(): string {
    const components: string[] = [];

    if (typeof navigator !== 'undefined') {
        components.push(navigator.userAgent || '');
        components.push(navigator.language || '');
        components.push(String((navigator as any).hardwareConcurrency || 0));
        components.push(String((navigator as any).deviceMemory || 0));
        components.push(navigator.platform || '');
    }

    if (typeof screen !== 'undefined') {
        components.push(`${screen.width}x${screen.height}`);
        components.push(String(screen.colorDepth || 0));
    }

    // Get timezone
    try {
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
        components.push('unknown-tz');
    }

    return components.join('|');
}

// ============================================================================
// Hashing Utilities
// ============================================================================

/**
 * Canonicalize object for stable hashing (sorted keys, no whitespace)
 */
function canonicalize(obj: any): string {
    if (obj === null || obj === undefined) return '';
    if (typeof obj !== 'object') return String(obj);

    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalize).join(',') + ']';
    }

    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(key => {
        const value = obj[key];
        if (value === undefined) return null;
        return `"${key}":${typeof value === 'string' ? `"${value}"` : canonicalize(value)}`;
    }).filter(Boolean);

    return '{' + pairs.join(',') + '}';
}

/**
 * SHA-256 hash using Web Crypto API
 */
async function sha256(message: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for environments without Web Crypto
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        const char = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Generate random nonce
 */
function generateNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Generate user pseudonym (privacy-preserving identifier)
 */
async function generateUserPseudonym(deviceFingerprint: string): Promise<string> {
    const dailySalt = new Date().toISOString().split('T')[0]; // Rotates daily
    const input = `lumi:user:${deviceFingerprint}:${dailySalt}`;
    const hash = await sha256(input);
    return `usr_${hash.substring(0, 16)}`;
}

// ============================================================================
// Main Service
// ============================================================================

const DEFAULT_TTL = 1800; // 30 minutes

export const proofOfIntentService = {
    /**
     * Generate proof of intent for a given intent request
     * 
     * v0.2 COMPLIANT: Hash ONLY structured fields, never raw user text
     * Hash input: { category, canonical_sku, budget_max, location_code, timestamp, nonce }
     */
    async generateProof(
        intent: Partial<IntentRequest> & {
            canonical_sku?: string;
            budget_max?: number;
            location_code?: string;
        },
        ttl: number = DEFAULT_TTL
    ): Promise<ProofOfIntent> {
        // Get device fingerprint
        const deviceFingerprint = getDeviceFingerprint();

        // Generate nonce
        const nonce = generateNonce();

        // Create timestamp
        const timestamp = Date.now();
        const expires_at = timestamp + (ttl * 1000);

        // v0.2 COMPLIANT: Canonicalize ONLY structured fields, never raw text
        // This is critical - raw user text (payload) must NOT be in hash
        const intentPayload = {
            category: intent.category,
            canonical_sku: intent.canonical_sku || intent.item?.canonical_sku,
            budget_max: intent.budget_max || intent.constraints?.budget_max,
            location_code: intent.location_code || intent.constraints?.location_code,
            timestamp: timestamp,
            nonce: nonce
        };
        const canonical = canonicalize(intentPayload);

        // Generate hashes
        const [intent_hash, device_signature, user_pseudonym] = await Promise.all([
            sha256(canonical),
            sha256(`${deviceFingerprint}:${nonce}:${timestamp}`),
            generateUserPseudonym(deviceFingerprint)
        ]);

        return {
            intent_hash,
            nonce,
            timestamp,
            ttl,
            expires_at,
            device_signature,
            user_pseudonym
        };
    },

    /**
     * Validate a proof of intent
     * v0.2 COMPLIANT: Verify hash uses only structured fields
     */
    async validateProof(
        proof: ProofOfIntent,
        intent: Partial<IntentRequest> & {
            canonical_sku?: string;
            budget_max?: number;
            location_code?: string;
        }
    ): Promise<ProofValidationResult> {
        const now = Date.now();

        // Check expiration
        if (now > proof.expires_at) {
            return {
                valid: false,
                expired: true,
                hash_mismatch: false,
                device_mismatch: false,
                error: 'Proof has expired'
            };
        }

        // v0.2 COMPLIANT: Verify intent hash using only structured fields
        const intentPayload = {
            category: intent.category,
            canonical_sku: intent.canonical_sku || intent.item?.canonical_sku,
            budget_max: intent.budget_max || intent.constraints?.budget_max,
            location_code: intent.location_code || intent.constraints?.location_code,
            timestamp: proof.timestamp,
            nonce: proof.nonce
        };
        const canonical = canonicalize(intentPayload);
        const expectedHash = await sha256(canonical);

        if (expectedHash !== proof.intent_hash) {
            return {
                valid: false,
                expired: false,
                hash_mismatch: true,
                device_mismatch: false,
                error: 'Intent hash mismatch - intent may have been tampered'
            };
        }

        // Verify device signature
        const deviceFingerprint = getDeviceFingerprint();
        const expectedSignature = await sha256(
            `${deviceFingerprint}:${proof.nonce}:${proof.timestamp}`
        );

        if (expectedSignature !== proof.device_signature) {
            return {
                valid: false,
                expired: false,
                hash_mismatch: false,
                device_mismatch: true,
                error: 'Device signature mismatch - different device detected'
            };
        }

        return {
            valid: true,
            expired: false,
            hash_mismatch: false,
            device_mismatch: false
        };
    },

    /**
     * Check if proof is still valid (not expired)
     */
    isProofValid(proof: ProofOfIntent): boolean {
        return Date.now() < proof.expires_at;
    },

    /**
     * Get remaining TTL in seconds
     */
    getRemainingTTL(proof: ProofOfIntent): number {
        const remaining = proof.expires_at - Date.now();
        return Math.max(0, Math.floor(remaining / 1000));
    }
};

export default proofOfIntentService;

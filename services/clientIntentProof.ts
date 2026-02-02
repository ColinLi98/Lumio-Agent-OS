/**
 * Client-side Intent Proof Generation
 * L.I.X. v0.2 Compliant - hashes ONLY structured fields, never raw text
 */

export interface IntentProofInput {
    category: string;
    canonical_sku: string;
    budget_max?: number;
    location_code?: string;
    timestamp: number;
    nonce: string;
}

export interface IntentProofOutput {
    proof_type: 'device_signed';
    intent_hash: string;
    device_fingerprint: string;
    timestamp: number;
    signature: string;
    nonce: string;
    validity_window_sec: number;
}

// ============================================================================
// Cryptographic Utilities
// ============================================================================

/**
 * SHA-256 using Web Crypto API
 */
async function sha256(message: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    // Fallback for non-browser environments
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        hash = ((hash << 5) - hash) + message.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Generate device fingerprint from browser/device characteristics
 */
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

    try {
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
        components.push('unknown-tz');
    }

    return components.join('|');
}

/**
 * Generate cryptographically secure nonce
 */
function generateNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate proof of intent - v0.2 compliant
 * 
 * IMPORTANT: Only hashes structured fields, never raw user text!
 * Hash input: { category, canonical_sku, budget_max, location_code, timestamp, nonce }
 */
export async function generateIntentProof(
    input: IntentProofInput,
    validityWindowSec: number = 1800
): Promise<IntentProofOutput> {
    const deviceFingerprint = getDeviceFingerprint();

    // v0.2 COMPLIANT: Hash ONLY structured fields, never raw text
    const hashPayload = JSON.stringify({
        category: input.category,
        canonical_sku: input.canonical_sku,
        budget_max: input.budget_max,
        location_code: input.location_code,
        timestamp: input.timestamp,
        nonce: input.nonce
    });

    const intent_hash = await sha256(hashPayload);

    // Device signature using fingerprint + nonce + timestamp
    // In production: Use Secure Enclave (iOS) / Keystore (Android) / WebAuthn
    const signaturePayload = `${intent_hash}:${deviceFingerprint}:${input.timestamp}`;
    const signature = await sha256(signaturePayload);

    // Hash device fingerprint for privacy
    const hashedFingerprint = await sha256(deviceFingerprint);

    return {
        proof_type: 'device_signed',
        intent_hash: `sha256:${intent_hash}`,
        device_fingerprint: hashedFingerprint,
        timestamp: input.timestamp,
        signature: `sig_${signature.substring(0, 32)}`,
        nonce: input.nonce,
        validity_window_sec: validityWindowSec
    };
}

/**
 * Quick helper to generate nonce for new intent
 */
export function createNonce(): string {
    return generateNonce();
}

/**
 * Determine if confirmation is required based on budget
 * v0.2 thresholds: 5000 = modal, 20000 = biometric
 */
export function requiresConfirmation(budget?: number): {
    required: boolean;
    level: 'none' | 'modal' | 'biometric';
    threshold?: number;
} {
    if (!budget) return { required: false, level: 'none' };
    if (budget >= 20000) return { required: true, level: 'biometric', threshold: 20000 };
    if (budget >= 5000) return { required: true, level: 'modal', threshold: 5000 };
    return { required: false, level: 'none' };
}

/**
 * Calculate intent strength score (0-1)
 * Based on: specificity, budget clarity, timing, user history
 */
export function calculateIntentStrength(params: {
    hasCanonicalSku: boolean;
    hasBudget: boolean;
    hasDeliveryDeadline: boolean;
    hasLocationCode: boolean;
    isRepeatIntent: boolean;
    userConfirmed: boolean;
}): number {
    let score = 0.4; // Base score

    // Specificity factors
    if (params.hasCanonicalSku) score += 0.15;
    if (params.hasBudget) score += 0.15;
    if (params.hasDeliveryDeadline) score += 0.1;
    if (params.hasLocationCode) score += 0.05;

    // User commitment factors
    if (params.isRepeatIntent) score += 0.05;
    if (params.userConfirmed) score += 0.1;

    return Math.min(1, Math.max(0, score));
}

/**
 * Validate proof format (client-side pre-check)
 */
export function validateProofFormat(proof: Partial<IntentProofOutput>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!proof.intent_hash?.startsWith('sha256:')) {
        errors.push('intent_hash must start with "sha256:"');
    }
    if (!proof.nonce || proof.nonce.length < 16) {
        errors.push('nonce must be at least 16 characters');
    }
    if (!proof.timestamp || proof.timestamp < Date.now() - 3600000) {
        errors.push('timestamp is missing or too old');
    }
    if (!proof.signature?.startsWith('sig_')) {
        errors.push('signature must start with "sig_"');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Settlement Service - Complete AcceptToken lifecycle management
 * 
 * Features:
 * - Token creation with TTL
 * - Status state machine (pending → converted/expired/disputed)
 * - Conversion callback handling
 * - Fallback worker for expired tokens
 * - Dispute management
 * - Accept Fee integration (1% of transaction)
 */

import { reputationService } from './reputationService';
import { recordAcceptFee } from './acceptFeeService';

// ============================================================================
// Types
// ============================================================================

export type AcceptTokenStatus = 'pending' | 'converted' | 'expired' | 'disputed' | 'refunded' | 'accept_fee_charged' | 'resolved';

export interface AcceptTokenRecord {
    token_id: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    user_pseudonym: string;

    // Financial
    offer_amount: number;
    currency: string;
    accept_fee?: number;        // Fee charged on conversion

    // Lifecycle
    status: AcceptTokenStatus;
    created_at: Date;
    ttl_days: number;
    expires_at: Date;

    // Conversion
    conversion_callback_url?: string;
    conversion_timestamp?: Date;
    conversion_proof?: string;

    // Dispute
    dispute_reason?: string;
    dispute_evidence_urls?: string[];
    dispute_opened_at?: Date;
    dispute_resolved_at?: Date;
    dispute_resolution?: 'provider_wins' | 'user_wins' | 'split';

    // Metadata
    item_name: string;
    category: string;
}

export interface ConversionCallbackPayload {
    token_id: string;
    provider_id: string;
    transaction_id: string;
    transaction_amount: number;
    proof_signature: string;
    metadata?: Record<string, any>;
}

export interface DisputeRequest {
    token_id: string;
    reason: string;
    evidence_urls: string[];
    user_statement: string;
}

export interface SettlementMetrics {
    total_tokens: number;
    pending_tokens: number;
    converted_tokens: number;
    expired_tokens: number;
    disputed_tokens: number;
    total_volume: number;
    conversion_rate: number;
    avg_conversion_time_hours: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TTL_DAYS = 7;
const ACCEPT_FEE_RATE = 0.02; // 2% fee on conversion

// ============================================================================
// In-Memory Store (would be database in production)
// ============================================================================

const tokenStore = new Map<string, AcceptTokenRecord>();
const tokensByIntent = new Map<string, string[]>(); // intent_id -> token_ids

// ============================================================================
// Helper Functions
// ============================================================================

function generateTokenId(): string {
    return `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function calculateExpiry(ttl_days: number): Date {
    return new Date(Date.now() + ttl_days * 24 * 60 * 60 * 1000);
}

// ============================================================================
// Main Service
// ============================================================================

export const settlementService = {
    /**
     * Create a new AcceptToken when user accepts an offer
     */
    createAcceptToken(params: {
        intent_id: string;
        offer_id: string;
        provider_id: string;
        user_pseudonym: string;
        offer_amount: number;
        currency: string;
        item_name: string;
        category: string;
        conversion_callback_url?: string;
        ttl_days?: number;
    }): AcceptTokenRecord {
        const ttl = params.ttl_days || DEFAULT_TTL_DAYS;
        const token: AcceptTokenRecord = {
            token_id: generateTokenId(),
            intent_id: params.intent_id,
            offer_id: params.offer_id,
            provider_id: params.provider_id,
            user_pseudonym: params.user_pseudonym,
            offer_amount: params.offer_amount,
            currency: params.currency,
            status: 'pending',
            created_at: new Date(),
            ttl_days: ttl,
            expires_at: calculateExpiry(ttl),
            conversion_callback_url: params.conversion_callback_url,
            item_name: params.item_name,
            category: params.category
        };

        tokenStore.set(token.token_id, token);

        // Index by intent
        const intentTokens = tokensByIntent.get(params.intent_id) || [];
        intentTokens.push(token.token_id);
        tokensByIntent.set(params.intent_id, intentTokens);

        // Apply reputation event
        reputationService.applyEvent(params.provider_id, 'offer_accepted', {
            intent_id: params.intent_id,
            offer_id: params.offer_id
        });

        // Record accept fee (1% of transaction amount)
        try {
            recordAcceptFee(
                token.token_id,
                params.intent_id,
                params.offer_id,
                params.provider_id,
                params.offer_amount
            );
        } catch (error) {
            console.warn(`[Settlement] Failed to record accept fee: ${error}`);
        }

        console.log(`[Settlement] Created token ${token.token_id} for offer ${params.offer_id}`);
        return token;
    },

    /**
     * Get token by ID
     */
    getToken(token_id: string): AcceptTokenRecord | undefined {
        return tokenStore.get(token_id);
    },

    /**
     * Get all tokens for an intent
     */
    getTokensByIntent(intent_id: string): AcceptTokenRecord[] {
        const tokenIds = tokensByIntent.get(intent_id) || [];
        return tokenIds.map(id => tokenStore.get(id)).filter(Boolean) as AcceptTokenRecord[];
    },

    /**
     * Get all tokens (for admin/debugging)
     */
    getAllTokens(): AcceptTokenRecord[] {
        return Array.from(tokenStore.values());
    },

    /**
     * Update token status with optional metadata
     * P0-3: Required for conversion callback and dispute endpoints
     */
    updateTokenStatus(
        token_id: string,
        status: AcceptTokenStatus,
        metadata?: Record<string, unknown>
    ): AcceptTokenRecord | undefined {
        const token = tokenStore.get(token_id);
        if (!token) return undefined;

        token.status = status;

        // Apply metadata properties
        if (metadata) {
            Object.assign(token, metadata);
        }

        tokenStore.set(token_id, token);
        console.log(`[Settlement] Token ${token_id} status updated to ${status}`);
        return token;
    },


    /**
     * Process conversion callback from provider
     */
    confirmConversion(payload: ConversionCallbackPayload): {
        success: boolean;
        token?: AcceptTokenRecord;
        error?: string;
    } {
        const token = tokenStore.get(payload.token_id);

        if (!token) {
            return { success: false, error: 'Token not found' };
        }

        if (token.status !== 'pending') {
            return { success: false, error: `Token status is ${token.status}, not pending` };
        }

        if (new Date() > token.expires_at) {
            token.status = 'expired';
            tokenStore.set(token.token_id, token);
            return { success: false, error: 'Token has expired' };
        }

        if (token.provider_id !== payload.provider_id) {
            return { success: false, error: 'Provider ID mismatch' };
        }

        // Calculate fee
        const fee = Math.round(payload.transaction_amount * ACCEPT_FEE_RATE * 100) / 100;

        // Update token
        token.status = 'converted';
        token.conversion_timestamp = new Date();
        token.conversion_proof = payload.proof_signature;
        token.accept_fee = fee;
        tokenStore.set(token.token_id, token);

        // Apply reputation event
        reputationService.applyEvent(token.provider_id, 'conversion_success', {
            intent_id: token.intent_id,
            offer_id: token.offer_id,
            description: `Conversion confirmed: ¥${payload.transaction_amount}`
        });

        console.log(`[Settlement] Token ${token.token_id} converted. Fee: ¥${fee}`);
        return { success: true, token };
    },

    /**
     * Open a dispute for a token
     */
    openDispute(request: DisputeRequest): {
        success: boolean;
        token?: AcceptTokenRecord;
        error?: string;
    } {
        const token = tokenStore.get(request.token_id);

        if (!token) {
            return { success: false, error: 'Token not found' };
        }

        if (token.status === 'disputed') {
            return { success: false, error: 'Dispute already opened' };
        }

        if (token.status === 'expired' || token.status === 'refunded') {
            return { success: false, error: `Cannot dispute token with status: ${token.status}` };
        }

        token.status = 'disputed';
        token.dispute_reason = request.reason;
        token.dispute_evidence_urls = request.evidence_urls;
        token.dispute_opened_at = new Date();
        tokenStore.set(token.token_id, token);

        console.log(`[Settlement] Dispute opened for token ${token.token_id}: ${request.reason}`);
        return { success: true, token };
    },

    /**
     * Resolve a dispute
     */
    resolveDispute(
        token_id: string,
        resolution: 'provider_wins' | 'user_wins' | 'split'
    ): {
        success: boolean;
        token?: AcceptTokenRecord;
        error?: string;
    } {
        const token = tokenStore.get(token_id);

        if (!token) {
            return { success: false, error: 'Token not found' };
        }

        if (token.status !== 'disputed') {
            return { success: false, error: 'Token is not in disputed status' };
        }

        token.dispute_resolved_at = new Date();
        token.dispute_resolution = resolution;

        // Apply reputation based on resolution
        if (resolution === 'user_wins') {
            token.status = 'refunded';
            reputationService.applyEvent(token.provider_id, 'dispute_lost', {
                intent_id: token.intent_id,
                offer_id: token.offer_id,
                description: `Dispute lost: ${token.dispute_reason}`
            });
        } else if (resolution === 'provider_wins') {
            token.status = 'converted';
            reputationService.applyEvent(token.provider_id, 'dispute_won', {
                intent_id: token.intent_id,
                offer_id: token.offer_id
            });
        } else {
            // Split - partial refund
            token.status = 'refunded';
            token.accept_fee = (token.accept_fee || 0) / 2; // Half fee
        }

        tokenStore.set(token.token_id, token);

        console.log(`[Settlement] Dispute resolved for ${token_id}: ${resolution}`);
        return { success: true, token };
    },

    /**
     * Process expired tokens (fallback worker)
     * Should be called periodically (e.g., every hour)
     */
    processExpiredTokens(): {
        processed: number;
        tokens: AcceptTokenRecord[];
    } {
        const now = new Date();
        const expired: AcceptTokenRecord[] = [];

        tokenStore.forEach((token, id) => {
            if (token.status === 'pending' && now > token.expires_at) {
                token.status = 'expired';
                // Charge accept fee even on expiry (provider responsibility)
                token.accept_fee = Math.round(token.offer_amount * ACCEPT_FEE_RATE * 100) / 100;
                tokenStore.set(id, token);
                expired.push(token);

                // Apply reputation penalty
                reputationService.applyEvent(token.provider_id, 'conversion_fail', {
                    intent_id: token.intent_id,
                    offer_id: token.offer_id,
                    description: 'Token expired without conversion'
                });

                console.log(`[Settlement] Token ${id} expired. Fee charged: ¥${token.accept_fee}`);
            }
        });

        return { processed: expired.length, tokens: expired };
    },

    /**
     * Get settlement metrics
     */
    getMetrics(): SettlementMetrics {
        const tokens = Array.from(tokenStore.values());
        const converted = tokens.filter(t => t.status === 'converted');

        let totalConversionTime = 0;
        converted.forEach(t => {
            if (t.conversion_timestamp) {
                totalConversionTime += t.conversion_timestamp.getTime() - t.created_at.getTime();
            }
        });

        return {
            total_tokens: tokens.length,
            pending_tokens: tokens.filter(t => t.status === 'pending').length,
            converted_tokens: converted.length,
            expired_tokens: tokens.filter(t => t.status === 'expired').length,
            disputed_tokens: tokens.filter(t => t.status === 'disputed').length,
            total_volume: tokens.reduce((sum, t) => sum + t.offer_amount, 0),
            conversion_rate: tokens.length > 0 ? converted.length / tokens.length : 0,
            avg_conversion_time_hours: converted.length > 0
                ? (totalConversionTime / converted.length) / (1000 * 60 * 60)
                : 0
        };
    },

    /**
     * Get pending tokens for a provider
     */
    getPendingTokensByProvider(provider_id: string): AcceptTokenRecord[] {
        return Array.from(tokenStore.values())
            .filter(t => t.provider_id === provider_id && t.status === 'pending');
    },

    /**
     * Get token statistics for a provider
     */
    getProviderStats(provider_id: string): {
        total: number;
        converted: number;
        expired: number;
        disputed: number;
        total_volume: number;
        conversion_rate: number;
    } {
        const tokens = Array.from(tokenStore.values())
            .filter(t => t.provider_id === provider_id);

        const converted = tokens.filter(t => t.status === 'converted').length;

        return {
            total: tokens.length,
            converted,
            expired: tokens.filter(t => t.status === 'expired').length,
            disputed: tokens.filter(t => t.status === 'disputed').length,
            total_volume: tokens.reduce((sum, t) => sum + t.offer_amount, 0),
            conversion_rate: tokens.length > 0 ? converted / tokens.length : 0
        };
    }
};

export default settlementService;

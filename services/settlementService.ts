/**
 * Settlement Service - Complete AcceptToken lifecycle management
 *
 * Features:
 * - Token creation with TTL
 * - Status state machine (pending → converted/expired/disputed)
 * - Conversion callback handling
 * - Fallback worker for expired tokens
 * - Dispute management
 * - Accept Fee integration
 * - LIX 1.5 bond lock/slash + escrow + insurance claim
 */

import { reputationService } from './reputationService.js';
import { recordAcceptFee } from './acceptFeeService.js';

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
    transaction_id?: string;
    transaction_amount: number;
    proof_signature: string;
    conversion_type?: 'purchase_completed' | 'partial' | 'cancelled';
    timestamp?: number;
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

export interface BondAccount {
    provider_id: string;
    available_balance: number;
    locked_balance: number;
    updated_at: Date;
}

export interface BondLockTxn {
    bond_lock_id: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    amount: number;
    status: 'locked' | 'released' | 'slashed';
    reason: string;
    trace_id: string;
    ledger_id: string;
    created_at: Date;
    updated_at: Date;
}

export interface EscrowClaimRecord {
    claim_id: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    amount_cny: number;
    reason: string;
    status: 'opened' | 'approved' | 'rejected' | 'paid';
    trace_id: string;
    ledger_id: string;
    created_at: Date;
    updated_at: Date;
}

export interface InsuranceClaimRecord {
    claim_id: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    amount_cny: number;
    status: 'opened' | 'approved' | 'rejected' | 'paid';
    reason: string;
    trace_id: string;
    ledger_id: string;
    created_at: Date;
    updated_at: Date;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TTL_DAYS = 7;
const ACCEPT_FEE_RATE = 0.02; // 2% fee on conversion
const DEFAULT_BOND_MIN = 500;

// ============================================================================
// In-Memory Store (would be database in production)
// ============================================================================

const tokenStore = new Map<string, AcceptTokenRecord>();
const tokensByIntent = new Map<string, string[]>(); // intent_id -> token_ids
const bondAccounts = new Map<string, BondAccount>();
const bondLocks = new Map<string, BondLockTxn>();
const escrowClaims = new Map<string, EscrowClaimRecord>();
const insuranceClaims = new Map<string, InsuranceClaimRecord>();

// ============================================================================
// Helper Functions
// ============================================================================

function generateTokenId(): string {
    return `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function calculateExpiry(ttl_days: number): Date {
    return new Date(Date.now() + ttl_days * 24 * 60 * 60 * 1000);
}

function makeTraceId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeLedgerId(prefix: string): string {
    return `ledger_${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveConversionSigningSecret(providerId: string): string {
    const mapRaw = String(process.env.LIX_PROVIDER_CALLBACK_SECRETS_JSON || '').trim();
    if (mapRaw) {
        try {
            const parsed = JSON.parse(mapRaw) as Record<string, unknown>;
            const candidate = parsed?.[providerId];
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        } catch {
            // Fall through to global secret.
        }
    }
    return String(process.env.LIX_PROVIDER_CALLBACK_SECRET || '').trim();
}

function normalizeSignature(raw: string): string {
    return String(raw || '').trim().toLowerCase().replace(/^sig_/, '');
}

type NodeCryptoCompat = {
    createHmac: (algorithm: string, secret: string) => {
        update: (input: string) => { digest: (encoding: 'hex') => string };
    };
    timingSafeEqual: (left: Uint8Array, right: Uint8Array) => boolean;
};

let nodeCryptoCompat: NodeCryptoCompat | null | undefined;

function getNodeCryptoCompat(): NodeCryptoCompat | null {
    if (nodeCryptoCompat !== undefined) return nodeCryptoCompat;
    try {
        const maybeRequire = (0, eval)('typeof require !== "undefined" ? require : undefined');
        if (typeof maybeRequire === 'function') {
            nodeCryptoCompat = maybeRequire('node:crypto') as NodeCryptoCompat;
            return nodeCryptoCompat;
        }
    } catch {
        // Browser/runtime without Node crypto support.
    }
    nodeCryptoCompat = null;
    return nodeCryptoCompat;
}

function pseudoHmacHex(secret: string, data: string): string {
    const input = `${secret}|${data}`;
    let state = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        state ^= input.charCodeAt(i);
        state = Math.imul(state, 0x01000193) >>> 0;
    }
    let hex = '';
    for (let i = 0; i < 8; i++) {
        state = Math.imul((state ^ (i * 0x9e3779b9)) >>> 0, 0x85ebca6b) >>> 0;
        hex += state.toString(16).padStart(8, '0');
    }
    return hex.slice(0, 64);
}

function computeConversionSignature(payload: ConversionCallbackPayload, secret: string): string {
    const raw = `${payload.token_id}.${payload.provider_id}.${payload.transaction_id}.${payload.transaction_amount}`;
    const nodeCrypto = getNodeCryptoCompat();
    if (nodeCrypto) {
        return nodeCrypto
            .createHmac('sha256', secret)
            .update(raw)
            .digest('hex');
    }
    return pseudoHmacHex(secret, raw);
}

function signatureMatches(provided: string, expected: string): boolean {
    const providedNormalized = normalizeSignature(provided);
    const expectedNormalized = normalizeSignature(expected);
    if (!providedNormalized || !expectedNormalized) return false;
    if (providedNormalized.length !== expectedNormalized.length) return false;
    const nodeCrypto = getNodeCryptoCompat();
    if (nodeCrypto) {
        const providedBuf = Buffer.from(providedNormalized, 'utf8');
        const expectedBuf = Buffer.from(expectedNormalized, 'utf8');
        return nodeCrypto.timingSafeEqual(providedBuf, expectedBuf);
    }
    let diff = 0;
    for (let i = 0; i < providedNormalized.length; i++) {
        diff |= providedNormalized.charCodeAt(i) ^ expectedNormalized.charCodeAt(i);
    }
    return diff === 0;
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
     * Ensure provider bond account exists.
     */
    ensureBondAccount(provider_id: string, initialBalance: number = 0): BondAccount {
        const key = String(provider_id || '').trim();
        if (!key) {
            throw new Error('provider_id is required');
        }
        const existing = bondAccounts.get(key);
        if (existing) return existing;
        const created: BondAccount = {
            provider_id: key,
            available_balance: Math.max(0, Number(initialBalance || 0)),
            locked_balance: 0,
            updated_at: new Date(),
        };
        bondAccounts.set(key, created);
        return created;
    },

    /**
     * Top up provider bond balance.
     */
    topUpBond(provider_id: string, amount: number): BondAccount {
        const account = this.ensureBondAccount(provider_id);
        const normalized = Math.max(0, Number(amount || 0));
        account.available_balance += normalized;
        account.updated_at = new Date();
        bondAccounts.set(account.provider_id, account);
        return account;
    },

    /**
     * Get provider bond status.
     */
    getBondStatus(provider_id: string): {
        provider_id: string;
        available_balance: number;
        locked_balance: number;
        sufficient: boolean;
        min_required: number;
        updated_at?: string;
    } {
        const key = String(provider_id || '').trim();
        const account = key ? bondAccounts.get(key) : undefined;
        const available = Math.max(0, Number(account?.available_balance || 0));
        const locked = Math.max(0, Number(account?.locked_balance || 0));
        return {
            provider_id: key,
            available_balance: available,
            locked_balance: locked,
            sufficient: available >= DEFAULT_BOND_MIN,
            min_required: DEFAULT_BOND_MIN,
            updated_at: account?.updated_at?.toISOString(),
        };
    },

    /**
     * Lock provider bond before execution.
     */
    lockBond(input: {
        intent_id: string;
        offer_id: string;
        provider_id: string;
        amount?: number;
        reason?: string;
    }): {
        success: boolean;
        bond_lock_id?: string;
        trace_id: string;
        ledger_id?: string;
        error?: string;
    } {
        const trace_id = makeTraceId('bond_lock');
        const provider = String(input.provider_id || '').trim();
        if (!provider) {
            return { success: false, trace_id, error: 'provider_id_required' };
        }
        const amount = Math.max(0, Number(input.amount ?? DEFAULT_BOND_MIN));
        const account = this.ensureBondAccount(provider);
        if (account.available_balance < amount) {
            return { success: false, trace_id, error: 'insufficient_bond_balance' };
        }

        account.available_balance -= amount;
        account.locked_balance += amount;
        account.updated_at = new Date();
        bondAccounts.set(provider, account);

        const bond_lock_id = `bond_${generateTokenId()}`;
        const ledger_id = makeLedgerId('bond_lock');
        const txn: BondLockTxn = {
            bond_lock_id,
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            provider_id: provider,
            amount,
            status: 'locked',
            reason: input.reason || 'lix_execution_guarantee',
            trace_id,
            ledger_id,
            created_at: new Date(),
            updated_at: new Date(),
        };
        bondLocks.set(bond_lock_id, txn);
        return { success: true, bond_lock_id, trace_id, ledger_id };
    },

    /**
     * Release bond back to available balance.
     */
    releaseBond(bond_lock_id: string): {
        success: boolean;
        trace_id: string;
        ledger_id?: string;
        error?: string;
    } {
        const trace_id = makeTraceId('bond_release');
        const txn = bondLocks.get(bond_lock_id);
        if (!txn) return { success: false, trace_id, error: 'bond_lock_not_found' };
        if (txn.status !== 'locked') {
            return { success: false, trace_id, error: `bond_lock_not_releasable_${txn.status}` };
        }
        const account = this.ensureBondAccount(txn.provider_id);
        account.locked_balance = Math.max(0, account.locked_balance - txn.amount);
        account.available_balance += txn.amount;
        account.updated_at = new Date();
        bondAccounts.set(txn.provider_id, account);

        txn.status = 'released';
        txn.updated_at = new Date();
        txn.trace_id = trace_id;
        txn.ledger_id = makeLedgerId('bond_release');
        bondLocks.set(txn.bond_lock_id, txn);
        return { success: true, trace_id, ledger_id: txn.ledger_id };
    },

    /**
     * Slash locked bond for failed delivery.
     */
    slashBond(input: {
        bond_lock_id: string;
        amount?: number;
        reason?: string;
    }): {
        success: boolean;
        trace_id: string;
        ledger_id?: string;
        slashed_amount?: number;
        error?: string;
    } {
        const trace_id = makeTraceId('bond_slash');
        const txn = bondLocks.get(input.bond_lock_id);
        if (!txn) return { success: false, trace_id, error: 'bond_lock_not_found' };
        if (txn.status !== 'locked') {
            return { success: false, trace_id, error: `bond_lock_not_slashable_${txn.status}` };
        }
        const amount = Math.max(0, Math.min(txn.amount, Number(input.amount ?? txn.amount)));
        const account = this.ensureBondAccount(txn.provider_id);
        account.locked_balance = Math.max(0, account.locked_balance - amount);
        account.updated_at = new Date();
        bondAccounts.set(txn.provider_id, account);

        txn.status = 'slashed';
        txn.amount = amount;
        txn.reason = input.reason || txn.reason || 'delivery_failed';
        txn.updated_at = new Date();
        txn.trace_id = trace_id;
        txn.ledger_id = makeLedgerId('bond_slash');
        bondLocks.set(txn.bond_lock_id, txn);
        return {
            success: true,
            trace_id,
            ledger_id: txn.ledger_id,
            slashed_amount: amount,
        };
    },

    getBondLock(bond_lock_id: string): BondLockTxn | undefined {
        return bondLocks.get(bond_lock_id);
    },

    refundEscrow(input: {
        intent_id: string;
        offer_id: string;
        provider_id: string;
        amount_cny: number;
        reason: string;
    }): {
        success: boolean;
        claim_id: string;
        trace_id: string;
        ledger_id: string;
    } {
        const trace_id = makeTraceId('escrow_refund');
        const claim_id = `escrow_${generateTokenId()}`;
        const ledger_id = makeLedgerId('escrow_refund');
        const record: EscrowClaimRecord = {
            claim_id,
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            provider_id: input.provider_id,
            amount_cny: Math.max(0, Number(input.amount_cny || 0)),
            reason: input.reason || 'delivery_failed',
            status: 'paid',
            trace_id,
            ledger_id,
            created_at: new Date(),
            updated_at: new Date(),
        };
        escrowClaims.set(claim_id, record);
        return { success: true, claim_id, trace_id, ledger_id };
    },

    openInsuranceClaim(input: {
        intent_id: string;
        offer_id: string;
        provider_id: string;
        amount_cny: number;
        reason: string;
    }): {
        success: boolean;
        claim_id: string;
        trace_id: string;
        ledger_id: string;
    } {
        const trace_id = makeTraceId('insurance_claim');
        const claim_id = `ins_${generateTokenId()}`;
        const ledger_id = makeLedgerId('insurance_claim');
        const record: InsuranceClaimRecord = {
            claim_id,
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            provider_id: input.provider_id,
            amount_cny: Math.max(0, Number(input.amount_cny || 0)),
            status: 'opened',
            reason: input.reason || 'delivery_dispute',
            trace_id,
            ledger_id,
            created_at: new Date(),
            updated_at: new Date(),
        };
        insuranceClaims.set(claim_id, record);
        return { success: true, claim_id, trace_id, ledger_id };
    },

    resolveInsuranceClaim(input: {
        claim_id: string;
        approve: boolean;
    }): {
        success: boolean;
        trace_id: string;
        ledger_id?: string;
        error?: string;
    } {
        const trace_id = makeTraceId('insurance_resolve');
        const claim = insuranceClaims.get(input.claim_id);
        if (!claim) return { success: false, trace_id, error: 'claim_not_found' };
        claim.status = input.approve ? 'paid' : 'rejected';
        claim.trace_id = trace_id;
        claim.ledger_id = makeLedgerId('insurance_resolve');
        claim.updated_at = new Date();
        insuranceClaims.set(claim.claim_id, claim);
        return { success: true, trace_id, ledger_id: claim.ledger_id };
    },

    getEscrowClaim(claim_id: string): EscrowClaimRecord | undefined {
        return escrowClaims.get(claim_id);
    },

    getInsuranceClaim(claim_id: string): InsuranceClaimRecord | undefined {
        return insuranceClaims.get(claim_id);
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

        const signingSecret = resolveConversionSigningSecret(payload.provider_id);
        if (signingSecret) {
            const expected = computeConversionSignature(payload, signingSecret);
            if (!signatureMatches(payload.proof_signature, expected)) {
                return { success: false, error: 'Invalid conversion signature' };
            }
        } else if (process.env.NODE_ENV === 'production') {
            return { success: false, error: 'Conversion callback secret not configured' };
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
    },

    resetForTests(): void {
        tokenStore.clear();
        tokensByIntent.clear();
        bondAccounts.clear();
        bondLocks.clear();
        escrowClaims.clear();
        insuranceClaims.clear();
    }
};

export default settlementService;

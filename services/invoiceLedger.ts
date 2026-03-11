/**
 * Invoice Ledger Service
 * L.I.X. v0.2 Compliant - P0-3 Blocking Fix
 * 
 * Manages the fee/invoice ledger for:
 * - Conversion fees (provider pays on successful conversion)
 * - Accept fees (7-day fallback fee if no conversion)
 * - Penalty fees (for fraud/violations)
 * 
 * MVP: In-memory storage with persistence interface
 * Production: PostgreSQL or Redis
 */

import { generateId } from './lixTypes.js';

// ============================================================================
// Types
// ============================================================================

export type InvoiceStatus = 'pending' | 'paid' | 'waived' | 'disputed' | 'cancelled';
export type FeeType = 'conversion' | 'accept_fee' | 'penalty' | 'refund';

export interface Invoice {
    invoice_id: string;
    provider_id: string;
    token_id: string;
    intent_id: string;
    offer_id: string;
    fee_type: FeeType;
    fee_amount: number;
    currency: string;
    description: string;
    status: InvoiceStatus;
    created_at: number;
    updated_at: number;
    paid_at?: number;
    metadata?: Record<string, unknown>;
}

export interface InvoiceCreateInput {
    provider_id: string;
    token_id: string;
    intent_id: string;
    offer_id: string;
    fee_type: FeeType;
    fee_amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

export interface InvoiceLedgerStats {
    total_invoices: number;
    total_pending: number;
    total_paid: number;
    total_revenue: number;
    by_fee_type: Record<FeeType, { count: number; amount: number }>;
}

// ============================================================================
// Fee Configuration
// ============================================================================

export const FEE_CONFIG = {
    // Conversion fee: percentage of transaction value
    CONVERSION_FEE_RATE: 0.02,  // 2%
    CONVERSION_FEE_MIN: 1,      // ¥1 minimum
    CONVERSION_FEE_MAX: 500,    // ¥500 maximum

    // Accept fee: LIX 1.5 tiered take rate
    TAKE_RATE_FIRST: 0.30,     // first trade
    TAKE_RATE_REPEAT: 0.10,    // repeat trade
    ACCEPT_FEE_MIN: 0.01,      // ¥0.01 minimum
    ACCEPT_FEE_MAX: 5000,      // ¥5000 maximum

    // Penalty fees
    PENALTY_FRAUD: 100,        // Fraud detection penalty
    PENALTY_FALSE_CLAIM: 50,   // False inventory/price claim
    PENALTY_RATE_LIMIT: 10,    // Rate limit violation
};

// ============================================================================
// Invoice Ledger Implementation
// ============================================================================

class InvoiceLedger {
    private invoices = new Map<string, Invoice>();
    private byToken = new Map<string, string[]>();  // token_id -> invoice_ids
    private byProvider = new Map<string, string[]>(); // provider_id -> invoice_ids

    /**
     * Create a new invoice
     */
    createInvoice(input: InvoiceCreateInput): Invoice {
        const invoice_id = `inv_${generateId()}`;
        const now = Date.now();

        const invoice: Invoice = {
            invoice_id,
            provider_id: input.provider_id,
            token_id: input.token_id,
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            fee_type: input.fee_type,
            fee_amount: input.fee_amount,
            currency: input.currency || 'CNY',
            description: input.description || this.generateDescription(input.fee_type, input.fee_amount),
            status: 'pending',
            created_at: now,
            updated_at: now,
            metadata: input.metadata
        };

        // Store invoice
        this.invoices.set(invoice_id, invoice);

        // Index by token
        const tokenInvoices = this.byToken.get(input.token_id) || [];
        tokenInvoices.push(invoice_id);
        this.byToken.set(input.token_id, tokenInvoices);

        // Index by provider
        const providerInvoices = this.byProvider.get(input.provider_id) || [];
        providerInvoices.push(invoice_id);
        this.byProvider.set(input.provider_id, providerInvoices);

        console.log(`[invoice.created] id=${invoice_id} provider=${input.provider_id} type=${input.fee_type} amount=${input.fee_amount}`);

        return invoice;
    }

    /**
     * Get invoice by ID
     */
    getInvoice(invoice_id: string): Invoice | undefined {
        return this.invoices.get(invoice_id);
    }

    /**
     * Get invoices for a token
     */
    getInvoicesByToken(token_id: string): Invoice[] {
        const ids = this.byToken.get(token_id) || [];
        return ids.map(id => this.invoices.get(id)!).filter(Boolean);
    }

    /**
     * Get invoices for a provider
     */
    getInvoicesByProvider(provider_id: string): Invoice[] {
        const ids = this.byProvider.get(provider_id) || [];
        return ids.map(id => this.invoices.get(id)!).filter(Boolean);
    }

    /**
     * Check if token already has a specific fee type invoice
     * Used for idempotency
     */
    hasInvoiceForToken(token_id: string, fee_type: FeeType): Invoice | undefined {
        const invoices = this.getInvoicesByToken(token_id);
        return invoices.find(inv => inv.fee_type === fee_type && inv.status !== 'cancelled');
    }

    /**
     * Update invoice status
     */
    updateInvoiceStatus(invoice_id: string, status: InvoiceStatus): Invoice | undefined {
        const invoice = this.invoices.get(invoice_id);
        if (!invoice) return undefined;

        invoice.status = status;
        invoice.updated_at = Date.now();
        if (status === 'paid') {
            invoice.paid_at = Date.now();
        }

        console.log(`[invoice.updated] id=${invoice_id} status=${status}`);
        return invoice;
    }

    /**
     * Calculate conversion fee
     */
    calculateConversionFee(offerPrice: number): number {
        let fee = offerPrice * FEE_CONFIG.CONVERSION_FEE_RATE;
        fee = Math.max(FEE_CONFIG.CONVERSION_FEE_MIN, fee);
        fee = Math.min(FEE_CONFIG.CONVERSION_FEE_MAX, fee);
        return Math.round(fee * 100) / 100; // Round to 2 decimals
    }

    /**
     * Calculate accept fee (7-day fallback)
     */
    calculateAcceptFee(
        offerPrice: number,
        tier: 'first_trade' | 'repeat_trade' = 'first_trade'
    ): number {
        const rate = tier === 'repeat_trade' ? FEE_CONFIG.TAKE_RATE_REPEAT : FEE_CONFIG.TAKE_RATE_FIRST;
        let fee = offerPrice * rate;
        fee = Math.max(FEE_CONFIG.ACCEPT_FEE_MIN, fee);
        fee = Math.min(FEE_CONFIG.ACCEPT_FEE_MAX, fee);
        return Math.round(fee * 100) / 100;
    }

    /**
     * Get ledger statistics
     */
    getStats(): InvoiceLedgerStats {
        const stats: InvoiceLedgerStats = {
            total_invoices: this.invoices.size,
            total_pending: 0,
            total_paid: 0,
            total_revenue: 0,
            by_fee_type: {
                conversion: { count: 0, amount: 0 },
                accept_fee: { count: 0, amount: 0 },
                penalty: { count: 0, amount: 0 },
                refund: { count: 0, amount: 0 }
            }
        };

        for (const invoice of this.invoices.values()) {
            if (invoice.status === 'pending') stats.total_pending++;
            if (invoice.status === 'paid') {
                stats.total_paid++;
                stats.total_revenue += invoice.fee_amount;
            }

            stats.by_fee_type[invoice.fee_type].count++;
            stats.by_fee_type[invoice.fee_type].amount += invoice.fee_amount;
        }

        return stats;
    }

    /**
     * Get all invoices (for debugging)
     */
    getAllInvoices(): Invoice[] {
        return Array.from(this.invoices.values());
    }

    /**
     * Clear all invoices (for testing)
     */
    clear(): void {
        this.invoices.clear();
        this.byToken.clear();
        this.byProvider.clear();
    }

    private generateDescription(feeType: FeeType, amount: number): string {
        switch (feeType) {
            case 'conversion':
                return `转化服务费 ¥${amount}`;
            case 'accept_fee':
                return `接受费 (7日未转化) ¥${amount}`;
            case 'penalty':
                return `违规处罚 ¥${amount}`;
            case 'refund':
                return `退款 ¥${amount}`;
            default:
                return `费用 ¥${amount}`;
        }
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const invoiceLedger = new InvoiceLedger();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create conversion fee invoice when provider callback confirms conversion
 */
export function createConversionInvoice(
    provider_id: string,
    token_id: string,
    intent_id: string,
    offer_id: string,
    offerPrice: number
): Invoice {
    // Check idempotency
    const existing = invoiceLedger.hasInvoiceForToken(token_id, 'conversion');
    if (existing) {
        console.log(`[invoice.idempotent] Returning existing conversion invoice ${existing.invoice_id}`);
        return existing;
    }

    const feeAmount = invoiceLedger.calculateConversionFee(offerPrice);
    return invoiceLedger.createInvoice({
        provider_id,
        token_id,
        intent_id,
        offer_id,
        fee_type: 'conversion',
        fee_amount: feeAmount,
        metadata: { offer_price: offerPrice }
    });
}

/**
 * Create accept fee invoice for 7-day fallback
 */
export function createAcceptFeeInvoice(
    provider_id: string,
    token_id: string,
    intent_id: string,
    offer_id: string,
    offerPrice: number,
    options?: {
        take_rate_tier?: 'first_trade' | 'repeat_trade';
        order_sequence?: number;
    }
): Invoice {
    // Check idempotency
    const existing = invoiceLedger.hasInvoiceForToken(token_id, 'accept_fee');
    if (existing) {
        console.log(`[invoice.idempotent] Returning existing accept_fee invoice ${existing.invoice_id}`);
        return existing;
    }

    const tier = options?.take_rate_tier || 'first_trade';
    const feeAmount = invoiceLedger.calculateAcceptFee(offerPrice, tier);
    return invoiceLedger.createInvoice({
        provider_id,
        token_id,
        intent_id,
        offer_id,
        fee_type: 'accept_fee',
        fee_amount: feeAmount,
        description: '接受费 - 7日内未完成转化',
        metadata: {
            offer_price: offerPrice,
            reason: '7_day_fallback',
            take_rate_tier: tier,
            order_sequence: options?.order_sequence ?? 1,
        }
    });
}

/**
 * Create penalty invoice for violations
 */
export function createPenaltyInvoice(
    provider_id: string,
    token_id: string,
    intent_id: string,
    offer_id: string,
    penaltyType: 'fraud' | 'false_claim' | 'rate_limit',
    description?: string
): Invoice {
    const feeAmount = {
        fraud: FEE_CONFIG.PENALTY_FRAUD,
        false_claim: FEE_CONFIG.PENALTY_FALSE_CLAIM,
        rate_limit: FEE_CONFIG.PENALTY_RATE_LIMIT
    }[penaltyType];

    return invoiceLedger.createInvoice({
        provider_id,
        token_id,
        intent_id,
        offer_id,
        fee_type: 'penalty',
        fee_amount: feeAmount,
        description: description || `违规处罚 - ${penaltyType}`,
        metadata: { penalty_type: penaltyType }
    });
}

/**
 * Accept Fee Service v1.0
 * L.I.X. Beta Settlement Layer
 * 
 * Handles accept fee recording and invoice aggregation.
 * Fee model: 1% of transaction amount (instead of flat fee).
 */

import { generateId } from './lixTypes.js';

// ============================================================================
// Types
// ============================================================================

export type FeeStatus = 'pending' | 'invoiced' | 'paid' | 'disputed' | 'refunded';
export type ProviderId = 'jd' | 'pdd' | 'taobao' | string;

export interface AcceptFeeRecord {
    fee_id: string;
    accept_token: string;
    intent_id: string;
    offer_id: string;
    provider_id: ProviderId;
    transaction_amount: number;     // Original transaction amount (CNY)
    fee_amount: number;             // 1% of transaction amount
    fee_rate: number;               // 0.01 (1%)
    fee_status: FeeStatus;
    created_at: number;
    updated_at: number;
    invoice_id?: string;
    trace_id?: string;
}

export interface InvoiceRecord {
    invoice_id: string;
    provider_id: ProviderId;
    period_start: string;           // ISO date
    period_end: string;             // ISO date
    total_fees: number;
    fee_count: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    created_at: number;
    fee_ids: string[];
}

export interface ProviderBalance {
    provider_id: ProviderId;
    pending_fees: number;
    invoiced_fees: number;
    paid_total: number;
    disputed_amount: number;
    last_invoice_at?: number;
}

// ============================================================================
// Storage (In-Memory for Beta)
// ============================================================================

const feeRecords: Map<string, AcceptFeeRecord> = new Map();
const invoices: Map<string, InvoiceRecord> = new Map();

// Fee rate: 1% of transaction
const FEE_RATE = 0.01;
const MIN_FEE = 0.01;  // Minimum ¥0.01
const MAX_FEE = 500;   // Cap at ¥500 per transaction

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Record an accept fee when user accepts an offer.
 * Fee = 1% of transaction amount (capped at ¥500).
 */
export function recordAcceptFee(
    accept_token: string,
    intent_id: string,
    offer_id: string,
    provider_id: ProviderId,
    transaction_amount: number,
    trace_id?: string
): AcceptFeeRecord {
    const fee_id = `fee_${generateId()}`;

    // Calculate 1% fee with min/max bounds
    let fee_amount = transaction_amount * FEE_RATE;
    fee_amount = Math.max(MIN_FEE, Math.min(MAX_FEE, fee_amount));
    fee_amount = Math.round(fee_amount * 100) / 100;  // Round to 2 decimals

    const record: AcceptFeeRecord = {
        fee_id,
        accept_token,
        intent_id,
        offer_id,
        provider_id,
        transaction_amount,
        fee_amount,
        fee_rate: FEE_RATE,
        fee_status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
        trace_id
    };

    feeRecords.set(fee_id, record);
    console.log(`[AcceptFee] Recorded fee ${fee_id}: ¥${fee_amount} (1% of ¥${transaction_amount})`);

    return record;
}

/**
 * Get all fee records for a provider.
 */
export function getProviderFees(provider_id: ProviderId): AcceptFeeRecord[] {
    return Array.from(feeRecords.values())
        .filter(r => r.provider_id === provider_id)
        .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Get fee record by ID.
 */
export function getFeeById(fee_id: string): AcceptFeeRecord | undefined {
    return feeRecords.get(fee_id);
}

/**
 * Get fee record by accept token.
 */
export function getFeeByAcceptToken(accept_token: string): AcceptFeeRecord | undefined {
    return Array.from(feeRecords.values())
        .find(r => r.accept_token === accept_token);
}

/**
 * Update fee status.
 */
export function updateFeeStatus(fee_id: string, status: FeeStatus): boolean {
    const record = feeRecords.get(fee_id);
    if (!record) return false;

    record.fee_status = status;
    record.updated_at = Date.now();
    console.log(`[AcceptFee] Updated fee ${fee_id} status to ${status}`);

    return true;
}

// ============================================================================
// Invoice Aggregation
// ============================================================================

/**
 * Aggregate pending fees into an invoice for a provider.
 */
export function aggregateInvoice(
    provider_id: ProviderId,
    period: 'daily' | 'weekly' = 'weekly'
): InvoiceRecord | null {
    const pendingFees = Array.from(feeRecords.values())
        .filter(r => r.provider_id === provider_id && r.fee_status === 'pending');

    if (pendingFees.length === 0) {
        console.log(`[AcceptFee] No pending fees for provider ${provider_id}`);
        return null;
    }

    const invoice_id = `inv_${generateId()}`;
    const now = Date.now();
    const periodDays = period === 'daily' ? 1 : 7;

    // Calculate period
    const period_end = new Date().toISOString().split('T')[0];
    const periodStart = new Date(now - periodDays * 24 * 60 * 60 * 1000);
    const period_start = periodStart.toISOString().split('T')[0];

    // Calculate totals
    const total_fees = pendingFees.reduce((sum, f) => sum + f.fee_amount, 0);
    const fee_ids = pendingFees.map(f => f.fee_id);

    const invoice: InvoiceRecord = {
        invoice_id,
        provider_id,
        period_start,
        period_end,
        total_fees: Math.round(total_fees * 100) / 100,
        fee_count: pendingFees.length,
        status: 'draft',
        created_at: now,
        fee_ids
    };

    invoices.set(invoice_id, invoice);

    // Update fee records
    for (const fee of pendingFees) {
        fee.fee_status = 'invoiced';
        fee.invoice_id = invoice_id;
        fee.updated_at = now;
    }

    console.log(`[AcceptFee] Created invoice ${invoice_id}: ¥${total_fees} (${fee_ids.length} fees)`);

    return invoice;
}

/**
 * Get all invoices for a provider.
 */
export function getProviderInvoices(provider_id: ProviderId): InvoiceRecord[] {
    return Array.from(invoices.values())
        .filter(inv => inv.provider_id === provider_id)
        .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Mark invoice as sent/paid.
 */
export function updateInvoiceStatus(
    invoice_id: string,
    status: 'sent' | 'paid' | 'overdue'
): boolean {
    const invoice = invoices.get(invoice_id);
    if (!invoice) return false;

    invoice.status = status;

    // If paid, update all associated fees
    if (status === 'paid') {
        for (const fee_id of invoice.fee_ids) {
            updateFeeStatus(fee_id, 'paid');
        }
    }

    console.log(`[AcceptFee] Invoice ${invoice_id} status updated to ${status}`);
    return true;
}

// ============================================================================
// Provider Balance
// ============================================================================

/**
 * Get balance summary for a provider.
 */
export function getProviderBalance(provider_id: ProviderId): ProviderBalance {
    const fees = getProviderFees(provider_id);
    const invoiceList = getProviderInvoices(provider_id);

    const pending_fees = fees
        .filter(f => f.fee_status === 'pending')
        .reduce((sum, f) => sum + f.fee_amount, 0);

    const invoiced_fees = fees
        .filter(f => f.fee_status === 'invoiced')
        .reduce((sum, f) => sum + f.fee_amount, 0);

    const paid_total = fees
        .filter(f => f.fee_status === 'paid')
        .reduce((sum, f) => sum + f.fee_amount, 0);

    const disputed_amount = fees
        .filter(f => f.fee_status === 'disputed')
        .reduce((sum, f) => sum + f.fee_amount, 0);

    const lastInvoice = invoiceList[0];

    return {
        provider_id,
        pending_fees: Math.round(pending_fees * 100) / 100,
        invoiced_fees: Math.round(invoiced_fees * 100) / 100,
        paid_total: Math.round(paid_total * 100) / 100,
        disputed_amount: Math.round(disputed_amount * 100) / 100,
        last_invoice_at: lastInvoice?.created_at
    };
}

// ============================================================================
// Stats & Metrics
// ============================================================================

export function getAcceptFeeStats(): {
    total_fees_collected: number;
    pending_amount: number;
    fee_count: number;
    avg_transaction: number;
} {
    const allFees = Array.from(feeRecords.values());

    const total_fees_collected = allFees
        .filter(f => f.fee_status === 'paid')
        .reduce((sum, f) => sum + f.fee_amount, 0);

    const pending_amount = allFees
        .filter(f => f.fee_status === 'pending' || f.fee_status === 'invoiced')
        .reduce((sum, f) => sum + f.fee_amount, 0);

    const total_transactions = allFees.reduce((sum, f) => sum + f.transaction_amount, 0);

    return {
        total_fees_collected: Math.round(total_fees_collected * 100) / 100,
        pending_amount: Math.round(pending_amount * 100) / 100,
        fee_count: allFees.length,
        avg_transaction: allFees.length > 0
            ? Math.round((total_transactions / allFees.length) * 100) / 100
            : 0
    };
}

export default {
    recordAcceptFee,
    getProviderFees,
    getFeeById,
    getFeeByAcceptToken,
    updateFeeStatus,
    aggregateInvoice,
    getProviderInvoices,
    updateInvoiceStatus,
    getProviderBalance,
    getAcceptFeeStats
};

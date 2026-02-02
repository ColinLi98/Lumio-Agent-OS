/**
 * LIX Process Pending Tokens API
 * L.I.X. v0.2 Compliant - P0-3
 * 
 * POST /api/lix/process-pending
 * 
 * Processes tokens that have been pending for >7 days.
 * Charges accept_fee and creates invoice.
 * 
 * In production: This would be a scheduled cron job.
 * For MVP: Manual trigger endpoint.
 */

import { settlementService } from '../services/settlementService';
import { createAcceptFeeInvoice, invoiceLedger } from '../services/invoiceLedger';


export default async function handler(request: Request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // GET: Return current stats
    if (request.method === 'GET') {
        const allTokens = settlementService.getAllTokens();
        const invoiceStats = invoiceLedger.getStats();

        return new Response(JSON.stringify({
            tokens: {
                total: allTokens.length,
                pending: allTokens.filter(t => t.status === 'pending').length,
                converted: allTokens.filter(t => t.status === 'converted').length,
                expired: allTokens.filter(t => t.status === 'expired').length,
                accept_fee_charged: allTokens.filter(t => t.status === 'accept_fee_charged').length,
                disputed: allTokens.filter(t => t.status === 'disputed').length
            },
            invoices: invoiceStats
        }), { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders,
        });
    }

    try {
        console.log('[LIX Process Pending] Starting fallback worker...');

        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        // Get all tokens
        const allTokens = settlementService.getAllTokens();
        const pendingTokens = allTokens.filter(t => t.status === 'pending');

        console.log(`[process_pending] Found ${pendingTokens.length} pending tokens`);

        const processed: Array<{
            token_id: string;
            provider_id: string;
            status: string;
            invoice_id?: string;
            fee_amount?: number;
        }> = [];

        for (const token of pendingTokens) {
            const createdAt = token.created_at instanceof Date
                ? token.created_at.getTime()
                : token.created_at;
            const ageMs = now - createdAt;

            // Check if token is older than 7 days
            if (ageMs >= SEVEN_DAYS_MS) {
                console.log(`[process_pending] Token ${token.token_id} is ${Math.floor(ageMs / (24 * 60 * 60 * 1000))} days old`);

                // Create accept fee invoice
                const invoice = createAcceptFeeInvoice(
                    token.provider_id,
                    token.token_id,
                    token.intent_id,
                    token.offer_id,
                    token.offer_amount
                );

                // Update token status
                settlementService.updateTokenStatus(token.token_id, 'accept_fee_charged', {
                    accept_fee: invoice.fee_amount,
                    accept_fee_charged: true,
                    accept_fee_charged_at: Date.now(),
                    invoice_id: invoice.invoice_id
                });

                processed.push({
                    token_id: token.token_id,
                    provider_id: token.provider_id,
                    status: 'accept_fee_charged',
                    invoice_id: invoice.invoice_id,
                    fee_amount: invoice.fee_amount
                });

                console.log(`[process_pending.accept_fee_charged] token=${token.token_id} fee=${invoice.fee_amount}`);

                // Emit event
                console.log(`[event.conversion.timeout]`, {
                    token_id: token.token_id,
                    provider_id: token.provider_id,
                    invoice_id: invoice.invoice_id,
                    fee_amount: invoice.fee_amount,
                    age_days: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
                    timestamp: Date.now()
                });
            }
        }

        // Get updated stats
        const updatedTokens = settlementService.getAllTokens();
        const invoiceStats = invoiceLedger.getStats();

        return new Response(JSON.stringify({
            success: true,
            processed_count: processed.length,
            processed_tokens: processed,
            stats: {
                tokens: {
                    total: updatedTokens.length,
                    pending: updatedTokens.filter(t => t.status === 'pending').length,
                    accept_fee_charged: updatedTokens.filter(t => t.status === 'accept_fee_charged').length,
                    converted: updatedTokens.filter(t => t.status === 'converted').length
                },
                invoices: invoiceStats
            },
            note: 'In production, this runs as a scheduled job every hour'
        }), { status: 200, headers: corsHeaders });

    } catch (error) {
        console.error('[process_pending.error]', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: corsHeaders });
    }
}

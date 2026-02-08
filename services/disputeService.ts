/**
 * Dispute Service v1.0
 * L.I.X. Beta Settlement Layer
 * 
 * Handles dispute opening, investigation, resolution, and penalties.
 */

import { generateId } from './lixTypes.js';
import { updateFeeStatus, getFeeByAcceptToken } from './acceptFeeService.js';

// ============================================================================
// Types
// ============================================================================

export type DisputeReason =
    | 'price_mismatch'      // Actual price differed from offer
    | 'out_of_stock'        // Item not available
    | 'fake_offer'          // Fraudulent/fabricated offer
    | 'quality_issue'       // Item differs from description
    | 'delivery_failed'     // Never received
    | 'other';

export type DisputeStatus =
    | 'open'                // Just created
    | 'investigating'       // Under review
    | 'awaiting_response'   // Waiting for provider response
    | 'resolved'            // Closed with resolution
    | 'rejected';           // Dispute dismissed

export type DisputeResolution =
    | 'full_refund'         // Fee fully refunded
    | 'partial_refund'      // Fee partially refunded
    | 'penalty_applied'     // Provider penalized
    | 'dismissed'           // No action taken
    | 'provider_warning';   // Warning issued

export type PenaltyType =
    | 'reputation_decrease' // -0.1 to -0.5 reputation score
    | 'fee_penalty'         // Extra fee charge
    | 'temporary_ban'       // Provider banned from LIX
    | 'warning';            // Logged warning

export interface Dispute {
    dispute_id: string;
    accept_token: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    reason: DisputeReason;
    description: string;
    evidence_urls: string[];
    status: DisputeStatus;
    resolution?: DisputeResolution;
    resolution_notes?: string;
    created_at: number;
    updated_at: number;
    resolved_at?: number;
    refund_amount?: number;
    trace_id?: string;
}

export interface Penalty {
    penalty_id: string;
    provider_id: string;
    dispute_id?: string;
    type: PenaltyType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    value?: number;         // e.g., reputation decrease amount
    reason: string;
    applied_at: number;
    expires_at?: number;    // For temporary bans
}

// ============================================================================
// Storage (In-Memory for Beta)
// ============================================================================

const disputes: Map<string, Dispute> = new Map();
const penalties: Map<string, Penalty> = new Map();

// Penalty thresholds
const PENALTY_WEIGHTS = {
    price_mismatch: 0.1,    // -0.1 reputation
    out_of_stock: 0.15,
    fake_offer: 0.5,        // Severe
    quality_issue: 0.2,
    delivery_failed: 0.25,
    other: 0.05
};

// ============================================================================
// Dispute Operations
// ============================================================================

/**
 * Open a new dispute for an accepted offer.
 */
export function openDispute(
    accept_token: string,
    intent_id: string,
    offer_id: string,
    provider_id: string,
    reason: DisputeReason,
    description: string,
    evidence_urls: string[] = [],
    trace_id?: string
): Dispute {
    const dispute_id = `disp_${generateId()}`;

    const dispute: Dispute = {
        dispute_id,
        accept_token,
        intent_id,
        offer_id,
        provider_id,
        reason,
        description,
        evidence_urls,
        status: 'open',
        created_at: Date.now(),
        updated_at: Date.now(),
        trace_id
    };

    disputes.set(dispute_id, dispute);

    // Mark associated fee as disputed
    updateFeeStatus(accept_token, 'disputed');

    console.log(`[Dispute] Opened dispute ${dispute_id}: ${reason} for offer ${offer_id}`);

    return dispute;
}

/**
 * Update dispute status.
 */
export function updateDisputeStatus(
    dispute_id: string,
    status: DisputeStatus
): boolean {
    const dispute = disputes.get(dispute_id);
    if (!dispute) return false;

    dispute.status = status;
    dispute.updated_at = Date.now();

    console.log(`[Dispute] Updated ${dispute_id} status to ${status}`);
    return true;
}

/**
 * Resolve a dispute with a specific resolution.
 */
export function resolveDispute(
    dispute_id: string,
    resolution: DisputeResolution,
    notes?: string,
    refund_amount?: number
): boolean {
    const dispute = disputes.get(dispute_id);
    if (!dispute) return false;

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolution_notes = notes;
    dispute.resolved_at = Date.now();
    dispute.updated_at = Date.now();
    dispute.refund_amount = refund_amount;

    // Update fee status based on resolution
    const feeRecord = getFeeByAcceptToken(dispute.accept_token);
    if (feeRecord) {
        if (resolution === 'full_refund' || resolution === 'partial_refund') {
            updateFeeStatus(feeRecord.fee_id, 'refunded');
        } else {
            // Dispute resolved but no refund - fee stays as pending
            updateFeeStatus(feeRecord.fee_id, 'pending');
        }
    }

    // Apply penalty if needed
    if (resolution === 'penalty_applied' || resolution === 'full_refund') {
        applyPenalty(
            dispute.provider_id,
            'reputation_decrease',
            PENALTY_WEIGHTS[dispute.reason] || 0.1,
            `Dispute ${dispute_id}: ${dispute.reason}`,
            dispute_id
        );
    }

    console.log(`[Dispute] Resolved ${dispute_id} with ${resolution}`);
    return true;
}

/**
 * Reject/dismiss a dispute.
 */
export function rejectDispute(
    dispute_id: string,
    reason: string
): boolean {
    const dispute = disputes.get(dispute_id);
    if (!dispute) return false;

    dispute.status = 'rejected';
    dispute.resolution = 'dismissed';
    dispute.resolution_notes = reason;
    dispute.resolved_at = Date.now();
    dispute.updated_at = Date.now();

    // Restore fee to pending
    const feeRecord = getFeeByAcceptToken(dispute.accept_token);
    if (feeRecord) {
        updateFeeStatus(feeRecord.fee_id, 'pending');
    }

    console.log(`[Dispute] Rejected ${dispute_id}: ${reason}`);
    return true;
}

/**
 * Get dispute by ID.
 */
export function getDisputeById(dispute_id: string): Dispute | undefined {
    return disputes.get(dispute_id);
}

/**
 * Get all disputes for a provider.
 */
export function getProviderDisputes(provider_id: string): Dispute[] {
    return Array.from(disputes.values())
        .filter(d => d.provider_id === provider_id)
        .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Get all open disputes.
 */
export function getOpenDisputes(): Dispute[] {
    return Array.from(disputes.values())
        .filter(d => d.status === 'open' || d.status === 'investigating')
        .sort((a, b) => a.created_at - b.created_at);
}

// ============================================================================
// Penalty Operations
// ============================================================================

/**
 * Apply a penalty to a provider.
 */
export function applyPenalty(
    provider_id: string,
    type: PenaltyType,
    value: number,
    reason: string,
    dispute_id?: string
): Penalty {
    const penalty_id = `pen_${generateId()}`;

    // Determine severity based on type and value
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (type === 'temporary_ban') severity = 'critical';
    else if (type === 'fee_penalty' && value > 100) severity = 'high';
    else if (type === 'reputation_decrease' && value > 0.3) severity = 'high';
    else if (value > 0.15) severity = 'medium';

    const penalty: Penalty = {
        penalty_id,
        provider_id,
        dispute_id,
        type,
        severity,
        value,
        reason,
        applied_at: Date.now(),
        expires_at: type === 'temporary_ban'
            ? Date.now() + 7 * 24 * 60 * 60 * 1000  // 7 days
            : undefined
    };

    penalties.set(penalty_id, penalty);

    console.log(`[Penalty] Applied ${type} to ${provider_id}: ${value} (${reason})`);

    return penalty;
}

/**
 * Get all penalties for a provider.
 */
export function getProviderPenalties(provider_id: string): Penalty[] {
    return Array.from(penalties.values())
        .filter(p => p.provider_id === provider_id)
        .sort((a, b) => b.applied_at - a.applied_at);
}

/**
 * Check if provider is currently banned.
 */
export function isProviderBanned(provider_id: string): boolean {
    return Array.from(penalties.values()).some(p =>
        p.provider_id === provider_id &&
        p.type === 'temporary_ban' &&
        (!p.expires_at || p.expires_at > Date.now())
    );
}

/**
 * Calculate total reputation impact for a provider.
 */
export function getReputationImpact(provider_id: string): number {
    return Array.from(penalties.values())
        .filter(p => p.provider_id === provider_id && p.type === 'reputation_decrease')
        .reduce((sum, p) => sum + (p.value || 0), 0);
}

// ============================================================================
// Stats
// ============================================================================

export function getDisputeStats(): {
    total_disputes: number;
    open_disputes: number;
    resolved_disputes: number;
    avg_resolution_time_hours: number;
    refund_rate: number;
} {
    const all = Array.from(disputes.values());
    const resolved = all.filter(d => d.status === 'resolved');
    const refunded = resolved.filter(d =>
        d.resolution === 'full_refund' || d.resolution === 'partial_refund'
    );

    // Calculate average resolution time
    let totalResolutionTime = 0;
    for (const d of resolved) {
        if (d.resolved_at) {
            totalResolutionTime += d.resolved_at - d.created_at;
        }
    }
    const avgResolutionMs = resolved.length > 0
        ? totalResolutionTime / resolved.length
        : 0;

    return {
        total_disputes: all.length,
        open_disputes: all.filter(d => d.status === 'open' || d.status === 'investigating').length,
        resolved_disputes: resolved.length,
        avg_resolution_time_hours: Math.round(avgResolutionMs / (1000 * 60 * 60) * 10) / 10,
        refund_rate: resolved.length > 0
            ? Math.round((refunded.length / resolved.length) * 100) / 100
            : 0
    };
}

export default {
    openDispute,
    updateDisputeStatus,
    resolveDispute,
    rejectDispute,
    getDisputeById,
    getProviderDisputes,
    getOpenDisputes,
    applyPenalty,
    getProviderPenalties,
    isProviderBanned,
    getReputationImpact,
    getDisputeStats
};

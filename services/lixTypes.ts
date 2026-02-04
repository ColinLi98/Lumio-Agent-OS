/**
 * L.I.X. (Lumi Intent Exchange) Type Definitions
 * Version: 0.2.1
 */

// ============================================================================
// Trace Context (End-to-End Observability)
// ============================================================================

export interface TraceContext {
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
    provider_request_id?: string;
}

// ============================================================================
// Intent Types
// ============================================================================

export type IntentCategory = 'purchase' | 'job' | 'collaboration';
export type AnonymityLevel = 'pseudonymous' | 'anonymous' | 'identified';

// Vertical classification for intent routing
export type IntentVertical = 'ticketing' | 'ecommerce' | 'outsourcing' | 'generic';
export type IntentKind = 'ticket' | 'product' | 'service';

export interface ItemSpec {
    name: string;
    canonical_sku?: string;
    specs: Record<string, string>;
    quantity: number;
}

export interface IntentConstraints {
    budget_max?: number;
    budget_min?: number;
    currency: string;
    delivery_by?: string;
    location_granularity: 'national' | 'province' | 'city';
    location_code?: string;
}

export interface IntentProof {
    proof_type: 'device_signed' | 'server_attested';
    intent_hash: string;
    signed_at?: string;
    device_attestation_id?: string;
    signature: string;
    // v0.2 required fields
    nonce: string;
    timestamp: number;
    validity_window_sec: number;
    device_fingerprint: string;
    device_public_key?: string;  // P0-1: For server-side verification
}

export interface IntentRequest {
    intent_id: string;
    publisher_pseudonym: string;
    category: IntentCategory;
    item: ItemSpec;
    constraints: IntentConstraints;
    intent_proof?: IntentProof;
    user_confirmed: boolean;
    intent_strength_score: number;
    confirmation_required: boolean;
    anonymity_level: AnonymityLevel;
    validity_window_sec: number;
    nonce: string;
    created_at: string;
    trace: TraceContext;
    // Vertical classification (auto-detected or explicit)
    vertical?: IntentVertical;
    intent_kind?: IntentKind;
}

// ============================================================================
// Offer Types
// ============================================================================

export type ProviderType = 'B2C' | 'C2C';

export interface PriceBreakdown {
    base: number;
    discount: number;
    shipping: number;
    tax?: number;
}

export interface PriceInfo {
    amount: number;
    currency: string;
    breakdown?: PriceBreakdown;
    amount_normalized?: number;
}

export interface PriceProof {
    claimed_price: number;
    proof_url: string;
    proof_timestamp: string;
    provider_signature: string;
}

export interface FulfillmentInfo {
    delivery_eta?: string;
    method: string;
    tracking_available: boolean;
}

export interface SLAInfo {
    response_time_hours: number;
    refund_window_days: number;
    warranty_months?: number;
}

export interface ProviderInfo {
    id: string;
    name: string;
    type: ProviderType;
    reputation_score: number;
    verified: boolean;
    allowed_domains?: string[];
}

export interface Offer {
    offer_id: string;
    intent_id: string;
    provider: ProviderInfo;
    item_sku?: string;
    price: PriceInfo;
    price_proof?: PriceProof;
    fulfillment?: FulfillmentInfo;
    sla?: SLAInfo;
    inventory_signal: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
    expires_at: string;
    provider_signature?: string;
    trace: TraceContext;

    // =========== NEW: Domain Mismatch Protection (v0.3) ===========
    /** Type of offer (product, ticket, booking, etc.) */
    offer_type?: OfferType;
    /** Domain this offer belongs to */
    domain?: OfferDomain;
    /** Provider group that generated this offer */
    source_provider_group?: OfferProviderGroup;
    /** Canonical representation of the item */
    canonical_item?: OfferCanonicalItem;
}

// Offer type classification
export type OfferType = 'product' | 'ticket' | 'booking' | 'quote' | 'lead';

// Offer domain (matches IntentDomain)
export type OfferDomain =
    | 'commerce'
    | 'ticketing'
    | 'travel'
    | 'food'
    | 'local_service'
    | 'education'
    | 'talent'
    | 'other';

// Provider group for offers
export type OfferProviderGroup =
    | 'ecommerce'
    | 'ticketing'
    | 'travel'
    | 'local_service'
    | 'food'
    | 'talent';

// Canonical item representations
export interface TicketCanonical {
    type: 'transport' | 'event';
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    carrier?: string;
    seat_class?: string;
    event_name?: string;
    venue?: string;
}

export interface ProductCanonical {
    type: 'product';
    sku?: string;
    brand?: string;
    model?: string;
    category?: string;
}

export interface BookingCanonical {
    type: 'booking';
    check_in?: string;
    check_out?: string;
    location?: string;
    room_type?: string;
}

export interface ServiceCanonical {
    type: 'service';
    service_type?: string;
    location?: string;
    scheduled_date?: string;
}

export type OfferCanonicalItem =
    | TicketCanonical
    | ProductCanonical
    | BookingCanonical
    | ServiceCanonical;


// ============================================================================
// Validation Types
// ============================================================================

export type ValidationAction = 'PASS' | 'WARN' | 'DOWNRANK' | 'BLOCK';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export const PENALTY_WEIGHTS: Record<Severity, number> = {
    low: 0.02,
    medium: 0.06,
    high: 0.12,
    critical: 0.25
};

export interface ValidationResult {
    stage: string;
    passed: boolean;
    action: ValidationAction;
    severity?: Severity;
    penalty_weight?: number;
    reason?: string;
    latency_ms?: number;
}

export interface ValidationPipelineResult {
    offer_id: string;
    all_passed: boolean;
    final_action: ValidationAction;
    stages: ValidationResult[];
    total_latency_ms: number;
}

// ============================================================================
// Ranking Types
// ============================================================================

export interface ScoreBreakdown {
    price_score: number;
    reputation_score: number;
    delivery_score: number;
    sku_match_score: number;
    validation_penalty: number;
}

export interface RankedOffer {
    offer: Offer;
    rank: number;
    total_score: number;
    score_breakdown: ScoreBreakdown;
    eligible: boolean;
    ineligibility_reason?: string;
    explanation: string;
    /** UI-friendly validation summary */
    validation_result?: {
        action: ValidationAction;
        warnings: string[];
        stage_results?: ValidationResult[];
    };
}

// ============================================================================
// Market Response Types
// ============================================================================

export interface MarketResponse {
    intent_id: string;
    status: 'success' | 'pending' | 'no_matches' | 'no_providers_for_vertical';
    ranked_offers: RankedOffer[];
    total_offers_received: number;
    broadcast_reach: number;
    latency_ms: number;
    trace: TraceContext;
    /** Source of offers: 'real' (scraped), 'mock' (dev mode), 'mixed', or 'none' (no providers) */
    provider_source?: 'real' | 'mock' | 'mixed' | 'none';
    /** Vertical classification (for ticketing/outsourcing empty states) */
    vertical?: string;
    /** Suggested next action for UI (e.g., 'collect_slots' for ticketing) */
    next_action_suggestion?: 'collect_slots' | 'set_reminder' | 'retry';
}

// ============================================================================
// Settlement Types
// ============================================================================

export interface AcceptToken {
    token_id: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    publisher_pseudonym: string;
    created_at: string;
    expires_at: string;
    callback_url: string;
    signature: string;
}

export interface ConversionCallback {
    token_id: string;
    conversion_type: 'purchase_completed' | 'partial' | 'cancelled';
    provider_order_id: string;
    provider_order_hash: string;
    order_amount: number;
    currency: string;
    timestamp: string;
    provider_signature: string;
}

// ============================================================================
// C2C Types
// ============================================================================

export interface DeliverableSpec {
    name: string;
    format: string;
    specs: Record<string, string>;
    confirmation_method?: 'auto_check' | 'mutual_confirmation';
}

export interface RevisionPolicy {
    included_revisions: number;
    revision_turnaround_hours: number;
    additional_revision_fee: number;
}

export interface SkillSpec {
    type: string;
    description: string;
    deliverables: DeliverableSpec[];
    revision_policy?: RevisionPolicy;
}

export interface EscrowInfo {
    status: 'pending' | 'locked' | 'released' | 'disputed' | 'refunded';
    locked_at?: string;
    release_conditions: string[];
    timeout_days: number;
}

export interface SkillOrder {
    order_id: string;
    requester_id: string;
    provider_id: string;
    skill_requested: SkillSpec;
    skill_offered?: SkillSpec;
    deliverable_artifacts: DeliverableArtifact[];
    escrow: EscrowInfo;
    status: 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'disputed' | 'cancelled';
    timeline: {
        created_at: string;
        first_delivery_at?: string;
        completed_at?: string;
    };
}

export interface DeliverableArtifact {
    artifact_id: string;
    deliverable_index: number;
    file_hash: string;
    file_size_bytes: number;
    storage_url: string;
    submitted_at: string;
    version: number;
    revision_note?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface LIXEvent {
    event_type: string;
    timestamp: string;
    trace: TraceContext;
    payload: Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

export function generateNonce(): string {
    return `nonce_${Date.now()}_${generateId()}`;
}

export function createTraceContext(intentId?: string): TraceContext {
    const id = intentId || generateId();
    return {
        trace_id: `trace_${id}`,
        span_id: `span_${generateId()}`
    };
}

export function createChildSpan(parent: TraceContext): TraceContext {
    return {
        trace_id: parent.trace_id,
        span_id: `span_${generateId()}`,
        parent_span_id: parent.span_id
    };
}

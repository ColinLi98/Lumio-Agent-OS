/**
 * L.I.X. (Lumi Intent Exchange) Type Definitions
 * Version: 0.2.1
 */

import type { EnhancedDigitalAvatar } from '../types.js';
import type { DigitalTwinContext } from './agentMarketplaceTypes.js';

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
    capability_match_score?: number;
    risk_coverage_score?: number;
    capacity_score?: number;
    cost_score?: number;
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
    dispatch_mode?: LixDispatchMode;
    dispatch_decision?: DispatchDecision;
    auction_policy_applied?: IntentAuctionPolicy;
    retry_trace?: string;
    route_result?: import('./intentRouterTypes.js').RouteResult;
    fallback_response?: import('./intentRouterTypes.js').FallbackResponse;
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
    offer_amount?: number;
    currency?: string;
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
// Agent Solution Marketplace Types (Phase 2)
// ============================================================================

export type SolutionIntentDomain =
    | 'recruitment'
    | 'travel'
    | 'finance'
    | 'health'
    | 'legal'
    | 'education'
    | 'shopping'
    | 'productivity'
    | 'local_service'
    | 'general';

export type SolutionIntentStatus =
    | 'broadcasting'
    | 'offers_received'
    | 'offer_accepted'
    | 'bond_pending'
    | 'bond_locked'
    | 'insured'
    | 'compensated'
    | 'delivery_submitted'
    | 'approved'
    | 'rejected'
    | 'cancelled';

export type LixDispatchMode = 'lumi_primary' | 'capability_auction';
export type LixTakeRateTier = 'first_trade' | 'repeat_trade';
export type LixInsuranceStatus = 'inactive' | 'insured' | 'claim_pending' | 'compensated' | 'claim_rejected';
export type LixSlaState = 'on_track' | 'at_risk' | 'breach';

export interface IntentAuctionPolicy {
    policy_version: string;
    dispatch_mode: LixDispatchMode;
    fail_closed: boolean;
    exploration_quota: number; // 0.0 - 1.0
    domains_enforced: SolutionIntentDomain[];
}

export interface TakeRatePolicy {
    policy_version: string;
    first_trade_rate: number;
    repeat_trade_rate: number;
}

export interface BondPolicy {
    policy_version: string;
    enabled: boolean;
    min_bond_cny: number;
    slash_order: Array<'escrow_refund' | 'bond_slash'>;
}

export interface EscrowClaim {
    claim_id: string;
    intent_id: string;
    offer_id: string;
    provider_id: string;
    reason: string;
    amount_cny: number;
    status: 'opened' | 'approved' | 'rejected' | 'paid';
    created_at: string;
    updated_at: string;
}

export interface OverflowDecision {
    mode: LixDispatchMode;
    overflow_reason?: string;
    complexity?: number;
    risk?: number;
    required_capabilities?: number;
    super_agent_queue_depth?: number;
}

export interface ProviderCapacitySnapshot {
    provider_id: string;
    capacity_available: boolean;
    capacity_score: number; // 0.0 - 1.0
    expected_completion_minutes: number;
    sampled_at: string;
}

export interface DispatchDecision {
    mode: LixDispatchMode;
    reason_codes: string[];
    overflow_reason?: string;
    policy_version: string;
    retry_trace?: string;
}

export interface SolutionFailureContext {
    candidate_count?: number;
    failed_agent_ids?: string[];
    failed_count?: number;
    error_codes?: string[];
}

export interface SolutionCustomRequirements {
    objective?: string;
    must_have_capabilities?: string[];
    exclusions?: string[];
    budget_max_cny?: number;
    expected_delivery_hours?: number;
    success_criteria?: string[];
    notes?: string;
}

export type ProfileShareConsentState = 'granted_once' | 'granted_remembered' | 'revoked';

export interface LixDigitalTwinSnapshot {
    user_id: string;
    captured_at: string;
    source: 'agent_marketplace';
    enhanced_avatar: EnhancedDigitalAvatar;
    marketplace_context?: DigitalTwinContext;
}

export interface AgentSolutionOffer {
    offer_id: string;
    intent_id: string;
    expert_id: string;
    expert_name: string;
    offer_type?: 'human_expert' | 'agent_collab';
    summary: string;
    proposed_capabilities: string[];
    collaborator_agents?: string[];
    orchestration_strategy?: string;
    estimated_delivery_hours: number;
    expected_completion_minutes?: number;
    quote_amount: number;
    currency: string;
    capacity_available?: boolean;
    capacity_score?: number;
    risk_score?: number;
    bond_coverage?: boolean;
    effective_take_rate?: number;
    take_rate_tier?: LixTakeRateTier;
    execution_score?: number;
    twin_fit_score?: number;
    composite_score?: number;
    ranking_rationale?: string;
    status: 'open' | 'accepted' | 'rejected';
    created_at: string;
}

export interface DeliveredAgentManifest {
    intent_id: string;
    offer_id: string;
    agent_id: string;
    name: string;
    description?: string;
    execute_ref: string; // external endpoint or execute path
    domains: SolutionIntentDomain[];
    capabilities: string[];
    supports_realtime: boolean;
    evidence_level: 'none' | 'weak' | 'strong';
    supports_parallel: boolean;
    cost_tier: 'low' | 'mid' | 'high';
    avg_latency_ms?: number;
    success_rate?: number;
    owner_id: string;
    submitted_by: string;
    submitted_at: string;
    market_visibility?: 'public' | 'private';
    pricing_model?: 'free' | 'pay_per_use';
    price_per_use_cny?: number;
    github_repo?: string;
    manifest_path?: string;
    delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
}

export interface ReviewDecision {
    intent_id: string;
    offer_id: string;
    agent_id: string;
    reviewer_id: string;
    decision: 'approved' | 'rejected';
    reason?: string;
    reviewed_at: string;
}

export interface AgentSolutionIntent {
    intent_id: string;
    kind: 'solution';
    requester_id: string;
    requester_type?: 'user' | 'agent';
    requester_agent_id?: string;
    requester_agent_name?: string;
    title: string;
    query: string;
    domain: SolutionIntentDomain;
    required_capabilities: string[];
    delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
    custom_requirements?: SolutionCustomRequirements;
    failure_context?: SolutionFailureContext;
    profile_share_consent?: ProfileShareConsentState;
    digital_twin_snapshot?: LixDigitalTwinSnapshot;
    status: SolutionIntentStatus;
    dispatch_mode?: LixDispatchMode;
    overflow_reason?: string;
    take_rate_tier?: LixTakeRateTier;
    bond_required?: boolean;
    bond_lock_id?: string;
    insurance_status?: LixInsuranceStatus;
    eta_minutes?: number;
    sla_state?: LixSlaState;
    created_at: string;
    updated_at: string;
    offers: AgentSolutionOffer[];
    accepted_offer_id?: string;
    delivery_manifest?: DeliveredAgentManifest;
    review?: ReviewDecision;
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

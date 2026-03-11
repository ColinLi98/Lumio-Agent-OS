/**
 * L.I.X. Market Service v0.3
 * The "Dark Pool" for intent broadcasting with full validation and ranking
 * 
 * v0.3: Integrated Intent Router for domain mismatch protection
 */

import {
    IntentRequest,
    IntentCategory,
    Offer,
    MarketResponse,
    IntentAuctionPolicy,
    RankedOffer,
    TraceContext,
    generateId,
    createTraceContext
} from './lixTypes.js';
import { validateOffer } from './offerValidator.js';
import { rankOffers, canonicalizeSKU } from './auctionEngine.js';
import { fanoutSearch, getAllCircuitStatuses } from './providers/providerRegistry.js';
import { routeIntent, generateFallback } from './intentRouterService.js';
import type { FallbackResponse } from './intentRouterTypes.js';
import { proofOfIntentService } from './proofOfIntentService.js';

// ============================================================================
// Publisher Pseudonym (Rotating Daily)
// ============================================================================

let publisherSecret: string | null = null;

function getPublisherPseudonym(): string {
    if (!publisherSecret) {
        publisherSecret = `secret_${generateId()}`;
    }
    const daily = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

    // Simple HMAC-like derivation
    let hash = 0;
    const input = `${publisherSecret}_daily_${daily}`;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash = hash & hash;
    }
    return `pub_${Math.abs(hash).toString(16).substring(0, 16)}`;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Main Market Service
// ============================================================================

export interface BroadcastInput {
    category: IntentCategory;
    payload: string;
    budget?: number;
    specs?: Record<string, string>;
    trace_id?: string;
    dispatch_policy_version?: string;
    prefer_paid_expert?: boolean;
    overflow_context?: {
        from?: 'lumi_super_agent' | 'direct';
        reason?: string;
        reasoning_trace_id?: string;
    };
}

const DEFAULT_AUCTION_POLICY: IntentAuctionPolicy = {
    policy_version: 'lix_1_5',
    dispatch_mode: 'capability_auction',
    fail_closed: true,
    exploration_quota: 0.2,
    domains_enforced: [
        'recruitment',
        'travel',
        'finance',
        'health',
        'legal',
        'education',
        'shopping',
        'productivity',
        'local_service',
        'general',
    ],
};

export const lixMarketService = {
    /**
     * Broadcast an intent to the market
     * v0.3: Integrated Intent Router for domain-based routing
     */
    broadcast: async (input: BroadcastInput): Promise<MarketResponse> => {
        const startTime = Date.now();
        const trace = input.trace_id
            ? { trace_id: input.trace_id, span_id: `span_${generateId()}` }
            : createTraceContext();

        console.log(`📡 [LIX] Broadcasting Intent: ${JSON.stringify(input)}`);

        // Build IntentRequest
        const canonicalSKU = canonicalizeSKU(input.payload, input.specs || {});

        const intent: IntentRequest = {
            intent_id: `intent_${generateId()}`,
            publisher_pseudonym: getPublisherPseudonym(),
            category: input.category,
            item: {
                name: input.payload,
                canonical_sku: canonicalSKU,
                specs: input.specs || {},
                quantity: 1
            },
            constraints: {
                budget_max: input.budget,
                currency: 'CNY',
                location_granularity: 'city',
                location_code: 'SHA'
            },
            user_confirmed: false,
            intent_strength_score: 0.8,
            confirmation_required: (input.budget || 0) > 5000,
            anonymity_level: 'pseudonymous',
            validity_window_sec: 3600,
            nonce: '',
            created_at: new Date().toISOString(),
            trace
        };

        // Generate canonical proof payload and keep intent nonce/proof in sync.
        const generatedProof = await proofOfIntentService.generateProof(
            {
                category: intent.category,
                item: intent.item,
                constraints: intent.constraints,
                canonical_sku: canonicalSKU,
                budget_max: input.budget,
                location_code: intent.constraints.location_code,
            },
            intent.validity_window_sec
        );
        intent.nonce = generatedProof.nonce;

        // Generate intent proof (server-attested bridge for current contracts).
        intent.intent_proof = {
            proof_type: 'device_signed',
            intent_hash: generatedProof.intent_hash.startsWith('sha256:')
                ? generatedProof.intent_hash
                : `sha256:${generatedProof.intent_hash}`,
            signed_at: new Date(generatedProof.timestamp).toISOString(),
            device_attestation_id: `att_${generateId().substring(0, 16)}`,
            signature: generatedProof.signature,
            nonce: generatedProof.nonce,
            timestamp: generatedProof.timestamp,
            validity_window_sec: generatedProof.ttl,
            device_fingerprint: `fp_${generatedProof.user_pseudonym.substring(0, 12)}`
        };

        // =====================================================================
        // v0.3: Intent Router - Domain-based routing
        // =====================================================================
        const routeResult = routeIntent(intent);
        console.log(`📡 [LIX] Intent routed: domain=${routeResult.intent_domain}, subtype=${routeResult.intent_subtype}, confidence=${routeResult.route_confidence.toFixed(2)}`);

        // Set intent vertical from route result
        intent.vertical = routeResult.intent_domain as any;

        // Real-time only: never generate synthetic offers.
        let rawOffers: Offer[] = [];
        let providerSource: 'real' | 'none' = 'none';
        let fallbackResponse: FallbackResponse | undefined;
        let providerCount = 0;
        let retryTrace: string | undefined;

        try {
            let fanoutResult: Awaited<ReturnType<typeof fanoutSearch>> | null = null;
            let lastError: unknown;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`📡 [LIX] Attempting real provider fanout (attempt ${attempt}/2) with route filtering...`);
                    fanoutResult = await fanoutSearch(intent, trace.trace_id, {
                        provider_group_allowlist: routeResult.provider_group_allowlist,
                        provider_group_blocklist: routeResult.provider_group_blocklist
                    });
                    break;
                } catch (error) {
                    lastError = error;
                    if (attempt < 2) {
                        await sleep(300);
                        continue;
                    }
                    throw lastError;
                }
            }
            if (!fanoutResult) throw new Error('fanout_result_missing');

            providerCount = fanoutResult.provider_results.length;

            // P0: Handle NO_PROVIDER_FOR_VERTICAL status
            if (fanoutResult.status === 'NO_PROVIDER_FOR_VERTICAL') {
                console.log(`📡 [LIX] No providers for domain: ${routeResult.intent_domain}`);

                if (routeResult.intent_domain === 'ticketing') {
                    fallbackResponse = generateFallback(routeResult.intent_domain, 'no_provider');
                }

                return {
                    intent_id: intent.intent_id,
                    status: 'no_providers_for_vertical',
                    ranked_offers: [],
                    total_offers_received: 0,
                    broadcast_reach: 0,
                    latency_ms: Date.now() - startTime,
                    trace,
                    provider_source: 'none',
                    vertical: routeResult.intent_domain,
                    next_action_suggestion: 'collect_slots',
                    route_result: routeResult,
                    fallback_response: fallbackResponse,
                    dispatch_mode: DEFAULT_AUCTION_POLICY.dispatch_mode,
                    auction_policy_applied: {
                        ...DEFAULT_AUCTION_POLICY,
                        policy_version: input.dispatch_policy_version || DEFAULT_AUCTION_POLICY.policy_version,
                    },
                    dispatch_decision: {
                        mode: DEFAULT_AUCTION_POLICY.dispatch_mode,
                        reason_codes: ['no_provider_for_vertical'],
                        overflow_reason: input.overflow_context?.reason,
                        policy_version: input.dispatch_policy_version || DEFAULT_AUCTION_POLICY.policy_version,
                    },
                } as MarketResponse;
            }

            rawOffers = fanoutResult.all_offers;
            if (rawOffers.length === 0) {
                retryTrace = `retry_${trace.trace_id}`;
                const relaxedResult = await fanoutSearch(intent, retryTrace);
                providerCount = Math.max(providerCount, relaxedResult.provider_results.length);
                rawOffers = relaxedResult.all_offers;
            }
            if (rawOffers.length > 0) {
                providerSource = 'real';
                console.log(`📡 [LIX] Real providers returned ${rawOffers.length} offers`);
            } else {
                console.log('📡 [LIX] Real providers returned 0 offers');
            }
        } catch (error) {
            console.error('📡 [LIX] Real provider fanout failed:', error);
            fallbackResponse = generateFallback(routeResult.intent_domain, 'timeout');
            return {
                intent_id: intent.intent_id,
                status: 'no_matches',
                ranked_offers: [],
                total_offers_received: 0,
                broadcast_reach: providerCount,
                latency_ms: Date.now() - startTime,
                trace,
                provider_source: 'none',
                vertical: routeResult.intent_domain,
                next_action_suggestion: 'retry',
                route_result: routeResult,
                fallback_response: fallbackResponse,
                retry_trace: retryTrace,
                dispatch_mode: DEFAULT_AUCTION_POLICY.dispatch_mode,
                auction_policy_applied: {
                    ...DEFAULT_AUCTION_POLICY,
                    policy_version: input.dispatch_policy_version || DEFAULT_AUCTION_POLICY.policy_version,
                },
            } as MarketResponse;
        }

        if (rawOffers.length === 0) {
            fallbackResponse = generateFallback(routeResult.intent_domain, 'all_rejected');
            return {
                intent_id: intent.intent_id,
                status: 'no_matches',
                ranked_offers: [],
                total_offers_received: 0,
                broadcast_reach: providerCount,
                latency_ms: Date.now() - startTime,
                trace,
                provider_source: 'none',
                vertical: routeResult.intent_domain,
                next_action_suggestion: 'retry',
                route_result: routeResult,
                fallback_response: fallbackResponse,
                retry_trace: retryTrace,
                dispatch_mode: DEFAULT_AUCTION_POLICY.dispatch_mode,
                auction_policy_applied: {
                    ...DEFAULT_AUCTION_POLICY,
                    policy_version: input.dispatch_policy_version || DEFAULT_AUCTION_POLICY.policy_version,
                },
            } as MarketResponse;
        }

        // Validate all offers
        const validationResults = await Promise.all(
            rawOffers.map(offer => validateOffer(offer, intent))
        );

        // Rank offers
        const rankingInputs = rawOffers.map((offer, i) => ({
            offer,
            validationResult: validationResults[i]
        }));

        const rankedOffers = rankOffers(rankingInputs, intent, 5);

        console.log(`📡 [LIX] Received ${rawOffers.length} offers (${providerSource}), ${rankedOffers.length} eligible`);

        return {
            intent_id: intent.intent_id,
            status: rankedOffers.length > 0 ? 'success' : 'no_matches',
            ranked_offers: rankedOffers,
            total_offers_received: rawOffers.length,
            broadcast_reach: providerCount,
            latency_ms: Date.now() - startTime,
            trace,
            provider_source: providerSource,
            retry_trace: retryTrace,
            dispatch_mode: DEFAULT_AUCTION_POLICY.dispatch_mode,
            auction_policy_applied: {
                ...DEFAULT_AUCTION_POLICY,
                policy_version: input.dispatch_policy_version || DEFAULT_AUCTION_POLICY.policy_version,
            },
            dispatch_decision: {
                mode: DEFAULT_AUCTION_POLICY.dispatch_mode,
                reason_codes: ['capability_auction'],
                overflow_reason: input.overflow_context?.reason,
                policy_version: input.dispatch_policy_version || DEFAULT_AUCTION_POLICY.policy_version,
                retry_trace: retryTrace,
            },
        };
    },

    /**
     * Get market stats (for dashboard)
     */
    getStats: async () => {
        const circuits = await getAllCircuitStatuses();
        const providers = Object.keys(circuits).length;
        return {
            activeIntents: 0,
            dailyMatches: 0,
            providers,
            avgLatencyMs: 0
        };
    }
};

// Export for backward compatibility
export const marketService = {
    broadcast: async (input: { category: IntentCategory; payload: string; budget?: string }) => {
        const response = await lixMarketService.broadcast({
            category: input.category,
            payload: input.payload,
            budget: input.budget ? parseInt(input.budget) : undefined
        });
        return response;
    }
};

export default lixMarketService;

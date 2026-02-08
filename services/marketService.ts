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
    RankedOffer,
    TraceContext,
    generateId,
    generateNonce,
    createTraceContext,
    createChildSpan
} from './lixTypes.js';
import { validateOffer } from './offerValidator.js';
import { rankOffers, canonicalizeSKU } from './auctionEngine.js';
import { fanoutSearch, getAllCircuitStatuses } from './providers/providerRegistry.js';
import type { MarketFanoutResult } from './providers/providerTypes.js';
import { classifyVertical } from './verticalClassifier.js';
import { routeIntent, generateFallback } from './intentRouterService.js';
import type { RouteResult, FallbackResponse } from './intentRouterTypes.js';


// ============================================================================
// Feature Flags
// ============================================================================

/** 
 * Enable real provider scraping (JD/PDD/Taobao).
 * Set to 'true' via env or leave as 'false' for mock-only mode.
 */
const USE_REAL_PROVIDERS =
    typeof process !== 'undefined' && process.env?.USE_REAL_PROVIDERS === 'true' ||
    typeof window !== 'undefined' && (window as any).__LIX_USE_REAL_PROVIDERS__ === true;

// ============================================================================
// Mock Provider Database
// ============================================================================

interface MockProvider {
    id: string;
    name: string;
    type: 'B2C' | 'C2C';
    reputation_score: number;
    verified: boolean;
    categories: IntentCategory[];
    price_modifier: number; // 0.85 = 15% discount
}

const MOCK_PROVIDERS: MockProvider[] = [
    { id: 'pdd_001', name: '拼多多官方', type: 'B2C', reputation_score: 4.5, verified: true, categories: ['purchase'], price_modifier: 0.85 },
    { id: 'jd_001', name: '京东自营', type: 'B2C', reputation_score: 4.8, verified: true, categories: ['purchase'], price_modifier: 0.95 },
    { id: 'taobao_001', name: '天猫旗舰店', type: 'B2C', reputation_score: 4.6, verified: true, categories: ['purchase'], price_modifier: 0.90 },
    { id: 'xianyu_001', name: '闲鱼数码达人', type: 'C2C', reputation_score: 4.2, verified: false, categories: ['purchase'], price_modifier: 0.70 },
    { id: 'boss_001', name: 'Boss直聘AI', type: 'B2C', reputation_score: 4.4, verified: true, categories: ['job'], price_modifier: 1.0 },
    { id: 'headhunter_001', name: '猎头Linda', type: 'C2C', reputation_score: 4.7, verified: true, categories: ['job'], price_modifier: 1.0 },
    { id: 'designer_001', name: '设计师小明', type: 'C2C', reputation_score: 4.3, verified: false, categories: ['collaboration'], price_modifier: 0.8 },
    { id: 'studio_001', name: '创意工作室', type: 'B2C', reputation_score: 4.6, verified: true, categories: ['collaboration'], price_modifier: 1.0 },
    { id: 'dev_001', name: '全栈开发者007', type: 'C2C', reputation_score: 4.5, verified: false, categories: ['collaboration'], price_modifier: 0.75 },
];

// ============================================================================
// Price Database (Mock)
// ============================================================================

const BASE_PRICES: Record<string, number> = {
    'iphone 16 pro max': 9999,
    'iphone 16 pro': 7999,
    'iphone 16': 5999,
    'iphone 15': 4999,
    'airpods pro': 1899,
    'airpods': 999,
    'macbook pro': 14999,
    'macbook air': 7999,
    'ipad pro': 6999,
    'ipad': 2999,
    '华为 mate 60 pro': 6999,
    '华为 p60': 4999,
    '小米 14': 3999,
    'logo设计': 500,
    '网站开发': 5000,
    '前端开发': 3000,
    'python': 200,
};

function getBasePrice(itemName: string): number {
    const normalized = itemName.toLowerCase();
    for (const [key, price] of Object.entries(BASE_PRICES)) {
        if (normalized.includes(key)) {
            return price;
        }
    }
    return 1000; // Default
}

// ============================================================================
// Intent Hash Generation (Stable)
// ============================================================================

function generateIntentHash(intent: Partial<IntentRequest>): string {
    const hashPayload = JSON.stringify({
        category: intent.category,
        canonical_sku: intent.item?.canonical_sku,
        budget_max: intent.constraints?.budget_max,
        location_code: intent.constraints?.location_code,
        validity_window_sec: intent.validity_window_sec,
        nonce: intent.nonce
    });

    // Simple hash (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < hashPayload.length; i++) {
        const char = hashPayload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

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

// ============================================================================
// Offer Generation (Mock)
// ============================================================================

function generateMockOffers(intent: IntentRequest): Offer[] {
    const offers: Offer[] = [];
    const basePrice = getBasePrice(intent.item.name);
    const relevantProviders = MOCK_PROVIDERS.filter(p => p.categories.includes(intent.category));

    for (const provider of relevantProviders) {
        const offerId = `offer_${generateId()}`;
        const finalPrice = Math.floor(basePrice * provider.price_modifier);

        // Check budget constraint
        if (intent.constraints.budget_max && finalPrice > intent.constraints.budget_max * 1.1) {
            continue; // Skip if way over budget
        }

        const now = Date.now();
        const deliveryDays = provider.type === 'B2C' ? (provider.id.includes('jd') ? 1 : 3) : 7;

        let offerContent = '';
        if (intent.category === 'purchase') {
            offerContent = `￥${finalPrice} - ${provider.name}`;
        } else if (intent.category === 'job') {
            offerContent = `${provider.name}: 有${Math.floor(Math.random() * 20 + 5)}个相关机会`;
        } else {
            const isSkillSwap = intent.constraints.budget_max && intent.constraints.budget_max < 500;
            offerContent = isSkillSwap ?
                `${provider.name}: 可以技能交换，互惠合作` :
                `${provider.name}: 报价￥${finalPrice}`;
        }

        offers.push({
            offer_id: offerId,
            intent_id: intent.intent_id,
            provider: {
                id: provider.id,
                name: provider.name,
                type: provider.type,
                reputation_score: provider.reputation_score,
                verified: provider.verified
            },
            item_sku: intent.item.canonical_sku,
            price: {
                amount: finalPrice,
                currency: 'CNY',
                breakdown: {
                    base: basePrice,
                    discount: basePrice - finalPrice,
                    shipping: 0
                }
            },
            price_proof: {
                claimed_price: finalPrice,
                proof_url: `https://${provider.id.split('_')[0]}.com/product/${intent.item.name.replace(/\s/g, '-')}`,
                proof_timestamp: new Date().toISOString(),
                provider_signature: `sig_${generateId()}`
            },
            fulfillment: {
                delivery_eta: new Date(now + deliveryDays * 24 * 60 * 60 * 1000).toISOString(),
                method: provider.type === 'B2C' ? 'express' : 'meetup',
                tracking_available: provider.type === 'B2C'
            },
            sla: {
                response_time_hours: 24,
                refund_window_days: provider.type === 'B2C' ? 7 : 3,
                warranty_months: provider.type === 'B2C' ? 12 : 0
            },
            inventory_signal: Math.random() > 0.1 ? 'in_stock' : 'low_stock',
            expires_at: new Date(now + 3600 * 1000).toISOString(),
            trace: createChildSpan(intent.trace)
        });
    }

    return offers;
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
}

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
        const nonce = generateNonce();
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
            nonce,
            created_at: new Date().toISOString(),
            trace
        };

        // Generate intent proof
        intent.intent_proof = {
            proof_type: 'device_signed',
            intent_hash: generateIntentHash(intent),
            signed_at: new Date().toISOString(),
            device_attestation_id: `att_${generateId().substring(0, 16)}`,
            signature: `sig_intent_${generateId()}`,
            nonce,
            timestamp: Date.now(),
            validity_window_sec: 3600,
            device_fingerprint: `fp_${generateId().substring(0, 12)}`
        };

        // =====================================================================
        // v0.3: Intent Router - Domain-based routing
        // =====================================================================
        const routeResult = routeIntent(intent);
        console.log(`📡 [LIX] Intent routed: domain=${routeResult.intent_domain}, subtype=${routeResult.intent_subtype}, confidence=${routeResult.route_confidence.toFixed(2)}`);

        // Set intent vertical from route result
        intent.vertical = routeResult.intent_domain as any;

        // Get offers - try real providers first, fallback to mock
        let rawOffers: Offer[] = [];
        let providerSource: 'real' | 'mock' | 'mixed' = 'mock';
        let fallbackResponse: FallbackResponse | undefined;

        if (USE_REAL_PROVIDERS) {
            try {
                console.log('📡 [LIX] Attempting real provider fanout with route filtering...');

                // v0.3: Pass route result to fanoutSearch for provider filtering
                const fanoutResult = await fanoutSearch(intent, trace.trace_id, {
                    provider_group_allowlist: routeResult.provider_group_allowlist,
                    provider_group_blocklist: routeResult.provider_group_blocklist
                });

                // P0: Handle NO_PROVIDER_FOR_VERTICAL status
                if (fanoutResult.status === 'NO_PROVIDER_FOR_VERTICAL') {
                    console.log(`📡 [LIX] No providers for domain: ${routeResult.intent_domain}`);

                    // v0.3: Generate fallback response for ticketing
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
                        fallback_response: fallbackResponse
                    } as MarketResponse;
                }

                if (fanoutResult.all_offers.length > 0) {
                    rawOffers = fanoutResult.all_offers;
                    providerSource = 'real';
                    console.log(`📡 [LIX] Real providers returned ${rawOffers.length} offers`);

                } else {
                    // Fallback to mock
                    console.log('📡 [LIX] Real providers returned 0 offers, falling back to mock');
                    rawOffers = generateMockOffers(intent);
                    providerSource = rawOffers.length > 0 ? 'mock' : 'mock';
                }
            } catch (error) {
                console.warn('📡 [LIX] Real provider error, falling back to mock:', error);
                rawOffers = generateMockOffers(intent);
            }
        } else {
            // Mock-only mode - classify vertical to determine if we should return no_providers
            const vertical = classifyVertical(input.payload);
            if (vertical === 'ticketing' || vertical === 'outsourcing') {
                // No mock providers for ticketing/outsourcing verticals
                console.log(`📡 [LIX] No mock providers for vertical: ${vertical}`);
                return {
                    intent_id: intent.intent_id,
                    status: 'no_providers_for_vertical',
                    ranked_offers: [],
                    total_offers_received: 0,
                    broadcast_reach: 0,
                    latency_ms: Date.now() - startTime,
                    trace,
                    provider_source: 'none',
                    vertical,
                    next_action_suggestion: 'collect_slots'
                } as MarketResponse;
            }

            await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
            rawOffers = generateMockOffers(intent);
        }

        if (rawOffers.length === 0) {
            return {
                intent_id: intent.intent_id,
                status: 'no_matches',
                ranked_offers: [],
                total_offers_received: 0,
                broadcast_reach: 500 + Math.floor(Math.random() * 300),
                latency_ms: Date.now() - startTime,
                trace,
                provider_source: providerSource
            };
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
            broadcast_reach: 500 + Math.floor(Math.random() * 300),
            latency_ms: Date.now() - startTime,
            trace
        };
    },

    /**
     * Get market stats (for dashboard)
     */
    getStats: async () => ({
        activeIntents: 1247 + Math.floor(Math.random() * 100),
        dailyMatches: 8934 + Math.floor(Math.random() * 500),
        providers: MOCK_PROVIDERS.length,
        avgLatencyMs: 1200
    })
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

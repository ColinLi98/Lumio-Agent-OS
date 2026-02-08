/**
 * Provider Registry
 * L.I.X. Provider Adapter Layer
 * 
 * Registers all providers and orchestrates concurrent fanout.
 */

import type {
    ProviderId, ProviderAdapter, ProviderSearchInput,
    CandidateItem, ProviderFanoutResult, MarketFanoutResult, OfferBuildInput
} from './providerTypes.js';
import type { IntentRequest, Offer, IntentVertical } from '../lixTypes.js';
import { classifyVertical, isEcommerceCompatible } from '../verticalClassifier.js';
import { jdAdapter } from './jdAdapter.js';
import { pddAdapter } from './pddAdapter.js';
import { taobaoAdapter } from './taobaoAdapter.js';
import { isCircuitOpen, getAllCircuitStatuses } from './banBudget.js';
import { eventBus } from '../eventBus.js';
import { observeHistogram, incCounter, setGauge } from '../metricsCollector.js';

// ============================================================================
// Registry
// ============================================================================

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
    jd: jdAdapter,
    pdd: pddAdapter,
    taobao: taobaoAdapter
};

const PROVIDER_IDS: ProviderId[] = ['jd', 'pdd', 'taobao'];
const MAX_CONCURRENCY = 3;
const MAX_OFFERS_PER_PROVIDER = 5;

// ============================================================================
// Public API
// ============================================================================

export function getAdapter(provider_id: ProviderId): ProviderAdapter | undefined {
    return ADAPTERS[provider_id];
}

export function getAllAdapters(): ProviderAdapter[] {
    return Object.values(ADAPTERS);
}

/**
 * Fanout search to all providers concurrently
 * v0.3: Integrates Intent Router for domain-based provider filtering
 */
export async function fanoutSearch(
    intent: IntentRequest,
    trace_id: string,
    routeResult?: { provider_group_allowlist: string[]; provider_group_blocklist: string[] }
): Promise<MarketFanoutResult> {
    const startTime = Date.now();

    // Auto-classify vertical if not set (P0: Rule-first)
    const vertical = intent.vertical || classifyVertical(intent.item?.name || '');

    // Emit vertical detection event
    eventBus.emit({
        event_type: 'intent.vertical_detected',
        trace_id,
        timestamp: Date.now(),
        intent_id: intent.intent_id,
        vertical
    } as any);

    // Build search input from IntentRequest (v0.2 contract)
    const searchInput: ProviderSearchInput = {
        canonical_sku: intent.item?.canonical_sku || intent.item?.name || '',
        keywords: extractKeywords(intent),
        budget_max: intent.constraints?.budget_max,
        location_code: intent.constraints?.location_code,
        trace_id
    };

    // Get circuit statuses
    const circuitStatuses = await getAllCircuitStatuses();

    // Filter to providers with closed circuits
    let activeProviders = PROVIDER_IDS.filter(id => circuitStatuses[id].state !== 'OPEN');

    // =====================================================================
    // v0.3: INTENT ROUTER FILTERING (Allowlist/Blocklist)
    // =====================================================================
    if (routeResult) {
        const preRouterCount = activeProviders.length;
        activeProviders = filterByRouteResult(activeProviders, routeResult);

        // Emit router filtering event
        if (preRouterCount !== activeProviders.length) {
            eventBus.emit({
                event_type: 'provider.router.filtered',
                trace_id,
                timestamp: Date.now(),
                intent_id: intent.intent_id,
                allowlist: routeResult.provider_group_allowlist,
                blocklist: routeResult.provider_group_blocklist,
                providers_before: preRouterCount,
                providers_after: activeProviders.length
            } as any);
        }
    } else {
        // Fallback: Use legacy vertical filtering
        const preFilterCount = activeProviders.length;
        activeProviders = filterProvidersByVertical(activeProviders, vertical);

        // Emit provider filtering event
        if (preFilterCount !== activeProviders.length) {
            eventBus.emit({
                event_type: 'provider.fanout.filtered',
                trace_id,
                timestamp: Date.now(),
                intent_id: intent.intent_id,
                vertical,
                providers_before: preFilterCount,
                providers_after: activeProviders.length
            } as any);
        }
    }

    if (activeProviders.length === 0) {
        console.log(`[providerRegistry.no_providers] vertical=${vertical}, routeResult=${!!routeResult}`);

        // Record metric
        incCounter('lix_no_provider_total', { vertical });

        return {
            all_candidates: [],
            all_offers: [],
            provider_results: [],
            total_latency_ms: Date.now() - startTime,
            status: 'NO_PROVIDER_FOR_VERTICAL',
            vertical
        };
    }

    // Concurrent fanout with cap
    const providerResults: ProviderFanoutResult[] = [];

    // Process in batches to respect concurrency
    for (let i = 0; i < activeProviders.length; i += MAX_CONCURRENCY) {
        const batch = activeProviders.slice(i, i + MAX_CONCURRENCY);
        const batchResults = await Promise.all(
            batch.map(id => searchProvider(id, searchInput, intent, trace_id))
        );
        providerResults.push(...batchResults);
    }

    // Aggregate results
    const all_candidates: CandidateItem[] = [];
    const all_offers: Offer[] = [];

    for (const result of providerResults) {
        all_candidates.push(...result.candidates);
        all_offers.push(...result.offers);
    }

    const total_latency_ms = Date.now() - startTime;
    observeHistogram('lix_intent_to_offer_latency_seconds', total_latency_ms / 1000, {
        category: intent.category || 'unknown'
    });

    // Update metrics
    setGauge('lix_active_providers', activeProviders.length, {});

    return {
        all_candidates,
        all_offers,
        provider_results: providerResults,
        total_latency_ms
    };
}

/**
 * Filter providers based on Intent Router result (v0.3)
 */
function filterByRouteResult(
    providerIds: ProviderId[],
    routeResult: { provider_group_allowlist: string[]; provider_group_blocklist: string[] }
): ProviderId[] {
    return providerIds.filter(id => {
        const adapter = ADAPTERS[id];
        const providerGroup = adapter.capabilities.provider_group;

        // Blocked groups are rejected
        if (routeResult.provider_group_blocklist.includes(providerGroup)) {
            return false;
        }

        // If allowlist is non-empty, only allow if in allowlist
        if (routeResult.provider_group_allowlist.length > 0) {
            return routeResult.provider_group_allowlist.includes(providerGroup);
        }

        // Otherwise allow
        return true;
    });
}


// ============================================================================
// Per-Provider Search
// ============================================================================

async function searchProvider(
    provider_id: ProviderId,
    searchInput: ProviderSearchInput,
    intent: IntentRequest,
    trace_id: string
): Promise<ProviderFanoutResult> {
    const adapter = ADAPTERS[provider_id];
    const startTime = Date.now();
    const errors: string[] = [];
    const cache_hits = { search: false, detail: [] as boolean[] };

    try {
        // 1. Search for candidates
        const candidates = await adapter.search(searchInput);
        cache_hits.search = candidates.some(c => c.evidence?.cache_hit);

        if (candidates.length === 0) {
            return {
                provider_id,
                candidates: [],
                offers: [],
                latency_ms: Date.now() - startTime,
                cache_hits,
                errors,
                circuit_open: false
            };
        }

        // 2. Extract details and build offers (limit per provider)
        const candidatesToProcess = candidates.slice(0, MAX_OFFERS_PER_PROVIDER);
        const offers: Offer[] = [];

        for (const candidate of candidatesToProcess) {
            try {
                const detail = await adapter.extractDetail(candidate, trace_id);

                if (!detail) {
                    errors.push(`Detail extraction failed for ${candidate.url}`);
                    continue;
                }

                // Price drift check (validator stage 5)
                if (candidate.listed_price && detail.final_price) {
                    const drift = Math.abs(detail.final_price - candidate.listed_price) / candidate.listed_price;
                    if (drift > 0.30) {
                        errors.push(`Price drift >30%: ${candidate.listed_price} -> ${detail.final_price}`);
                        incCounter('lix_validation_failures_total', { stage: '5', reason: 'price_drift_block' });
                        continue;
                    }
                    if (drift > 0.15) {
                        incCounter('lix_validation_failures_total', { stage: '5', reason: 'price_drift_warn' });
                    }
                }

                // Build offer
                const offer = await adapter.buildOffer({
                    candidate,
                    detail,
                    intent,
                    trace_id
                });

                offers.push(offer);
                incCounter('lix_offers_total', { provider_id, validation_result: 'valid' });

            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }

        return {
            provider_id,
            candidates,
            offers,
            latency_ms: Date.now() - startTime,
            cache_hits,
            errors,
            circuit_open: false
        };

    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        return {
            provider_id,
            candidates: [],
            offers: [],
            latency_ms: Date.now() - startTime,
            cache_hits,
            errors,
            circuit_open: await isCircuitOpen(provider_id)
        };
    }
}

// ============================================================================
// Helpers
// ============================================================================

function extractKeywords(intent: IntentRequest): string[] {
    const keywords: string[] = [];

    // From item canonical_sku
    if (intent.item?.canonical_sku) {
        keywords.push(...intent.item.canonical_sku.split(/[\s\-_\/]+/));
    }

    // From item name
    if (intent.item?.name) {
        keywords.push(...intent.item.name.split(/[\s\-_\/]+/).slice(0, 5));
    }

    // From specs
    if (intent.item?.specs) {
        for (const value of Object.values(intent.item.specs)) {
            if (typeof value === 'string' && value.length > 1) {
                keywords.push(value);
            }
        }
    }

    // Deduplicate and filter
    return [...new Set(keywords)].filter(k => k.length > 1).slice(0, 10);
}

// ============================================================================
// Vertical Filtering (P0: Rule-First)
// ============================================================================

/**
 * Filter providers by intent vertical.
 * 
 * Ticketing intents should NOT be routed to e-commerce providers.
 * E-commerce and generic intents can use e-commerce providers.
 */
function filterProvidersByVertical(
    providerIds: ProviderId[],
    vertical: string
): ProviderId[] {
    // For ticketing, we need ticketing providers (none available yet)
    if (vertical === 'ticketing') {
        // Filter to only ticketing providers (currently none)
        return providerIds.filter(id => {
            const adapter = ADAPTERS[id];
            return adapter.provider_kind === 'ticketing';
        });
    }

    // For outsourcing, we need service providers (currently none)
    if (vertical === 'outsourcing') {
        // Filter to only service providers (currently none)
        return providerIds.filter(id => {
            const adapter = ADAPTERS[id];
            return adapter.provider_kind === 'service';
        });
    }

    // For e-commerce and generic - use e-commerce providers
    if (vertical === 'ecommerce' || vertical === 'generic') {
        return providerIds.filter(id => {
            const adapter = ADAPTERS[id];
            return adapter.provider_kind === 'ecommerce';
        });
    }

    // Default: all providers
    return providerIds;
}

// ============================================================================
// Exports
// ============================================================================

export { PROVIDER_IDS, ADAPTERS, getAllCircuitStatuses };

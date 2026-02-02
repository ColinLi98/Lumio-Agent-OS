/**
 * Provider Registry
 * L.I.X. Provider Adapter Layer
 * 
 * Registers all providers and orchestrates concurrent fanout.
 */

import type {
    ProviderId, ProviderAdapter, ProviderSearchInput,
    CandidateItem, ProviderFanoutResult, MarketFanoutResult, OfferBuildInput
} from './providerTypes';
import type { IntentRequest, Offer } from '../lixTypes';
import { jdAdapter } from './jdAdapter';
import { pddAdapter } from './pddAdapter';
import { taobaoAdapter } from './taobaoAdapter';
import { isCircuitOpen, getAllCircuitStatuses } from './banBudget';
import { eventBus } from '../eventBus';
import { observeHistogram, incCounter, setGauge } from '../metricsCollector';

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
 */
export async function fanoutSearch(
    intent: IntentRequest,
    trace_id: string
): Promise<MarketFanoutResult> {
    const startTime = Date.now();

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
    const activeProviders = PROVIDER_IDS.filter(id => circuitStatuses[id].state !== 'OPEN');

    if (activeProviders.length === 0) {
        console.log('[providerRegistry.all_circuits_open] No providers available');
        // Log warning but don't emit - event type doesn't fit this case well
        return {
            all_candidates: [],
            all_offers: [],
            provider_results: [],
            total_latency_ms: Date.now() - startTime
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
// Exports
// ============================================================================

export { PROVIDER_IDS, ADAPTERS, getAllCircuitStatuses };

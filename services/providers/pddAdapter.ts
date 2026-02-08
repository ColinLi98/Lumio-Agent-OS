/**
 * PDD Adapter
 * L.I.X. Provider Adapter Layer
 * 
 * Pinduoduo scraping adapter with search and detail extraction.
 * Note: PDD is mobile-first, we use mobile site.
 */

import type {
    ProviderAdapter,
    ProviderSearchInput,
    CandidateItem,
    DetailExtractionResult,
    OfferBuildInput,
    ProviderId,
    InventorySignal
} from './providerTypes';
import { generateOfferId, extractKeywords } from './providerTypes';
import type { Offer } from '../lixTypes';

import { getCachedSearch, setCachedSearch, getCachedDetail, setCachedDetail } from './scrapeCache';
import { canMakeRequest } from './rateLimiter';
import { isCircuitOpen, recordBanSignal, recordSuccess } from './banBudget';
import { headlessFetch } from './headlessPool';
import { getProviderConfig, buildSearchUrl } from './selectorPolicy';
import { eventBus } from '../eventBus';
import { incCounter, observeHistogram } from '../metricsCollector';

// ============================================================================
// Configuration
// ============================================================================

const PROVIDER_ID: ProviderId = 'pdd';
const MAX_CANDIDATES = 10;
const config = getProviderConfig(PROVIDER_ID);

// ============================================================================
// PDD Adapter Implementation
// ============================================================================

export const pddAdapter: ProviderAdapter = {
    id: PROVIDER_ID,
    name: config.name,
    domains_allowlist: config.domains_allowlist,
    provider_kind: 'ecommerce',  // PDD is an e-commerce provider
    capabilities: {
        provider_group: 'ecommerce',
        supported_domains: ['commerce'],
        supported_subtypes: ['product_purchase', 'price_compare'],
        result_types: ['product']
    },

    async search(input: ProviderSearchInput): Promise<CandidateItem[]> {
        const { canonical_sku, keywords, budget_max, location_code, trace_id } = input;
        const startTime = Date.now();

        // 1. Check circuit breaker
        if (await isCircuitOpen(PROVIDER_ID)) {
            console.log(`[pddAdapter.circuit_open] Skipping search`);
            return [];
        }

        // 2. Check cache
        const cached = await getCachedSearch(PROVIDER_ID, canonical_sku, location_code, budget_max);
        if (cached) {
            eventBus.emit({
                event_type: 'provider.search.end',
                trace_id,
                provider_id: PROVIDER_ID,
                timestamp: Date.now(),
                candidates_count: cached.length,
                cache_hit: true,
                latency_ms: Date.now() - startTime
            });
            return cached.map(c => ({ ...c, evidence: { ...c.evidence, cache_hit: true } }));
        }

        // 3. Check rate limit
        const rateResult = await canMakeRequest(PROVIDER_ID, 'yangkeduo.com');
        if (!rateResult.allowed) {
            console.log(`[pddAdapter.rate_limited] wait_ms=${rateResult.wait_ms}`);
            return [];
        }

        // 4. Emit start event
        eventBus.emit({
            event_type: 'provider.search.start',
            trace_id,
            provider_id: PROVIDER_ID,
            timestamp: Date.now(),
            canonical_sku
        });

        // 5. Build search URL
        const searchKeywords = keywords.length > 0 ? keywords : extractKeywords(canonical_sku);
        const searchUrl = buildSearchUrl(PROVIDER_ID, searchKeywords);

        // 6. Fetch search page
        const fetchResult = await headlessFetch({
            url: searchUrl,
            provider_id: PROVIDER_ID,
            trace_id,
            timeout_ms: 10000
        });

        if (!fetchResult.success || !fetchResult.html) {
            if (fetchResult.ban_signal) {
                await recordBanSignal(PROVIDER_ID, fetchResult.ban_signal, trace_id);
            }

            eventBus.emit({
                event_type: 'provider.search.end',
                trace_id,
                provider_id: PROVIDER_ID,
                timestamp: Date.now(),
                candidates_count: 0,
                cache_hit: false,
                latency_ms: Date.now() - startTime,
                error: fetchResult.error
            });

            return [];
        }

        // 7. Parse candidates
        const candidates = parseSearchResults(fetchResult.html, budget_max);

        // 8. Cache results
        if (candidates.length > 0) {
            await setCachedSearch(PROVIDER_ID, canonical_sku, candidates, location_code, budget_max);
            await recordSuccess(PROVIDER_ID);
        }

        // 9. Emit end event
        const latency_ms = Date.now() - startTime;
        observeHistogram('lix_provider_latency_seconds', latency_ms / 1000, { provider_id: PROVIDER_ID, layer: 'search' });

        eventBus.emit({
            event_type: 'provider.search.end',
            trace_id,
            provider_id: PROVIDER_ID,
            timestamp: Date.now(),
            candidates_count: candidates.length,
            cache_hit: false,
            latency_ms
        });

        incCounter('lix_provider_requests_total', { provider_id: PROVIDER_ID, layer: 'search', cache_hit: 'false' });

        return candidates;
    },

    async extractDetail(candidate: CandidateItem, trace_id: string): Promise<DetailExtractionResult | null> {
        const startTime = Date.now();

        // 1. Check circuit breaker
        if (await isCircuitOpen(PROVIDER_ID)) {
            return null;
        }

        // 2. Check cache
        const cached = await getCachedDetail(PROVIDER_ID, candidate.url);
        if (cached) {
            eventBus.emit({
                event_type: 'provider.detail.end',
                trace_id,
                provider_id: PROVIDER_ID,
                timestamp: Date.now(),
                cache_hit: true,
                latency_ms: Date.now() - startTime
            });
            return cached;
        }

        // 3. Check rate limit
        const rateResult = await canMakeRequest(PROVIDER_ID, 'yangkeduo.com');
        if (!rateResult.allowed) {
            return null;
        }

        // 4. Emit start event
        eventBus.emit({
            event_type: 'provider.detail.start',
            trace_id,
            provider_id: PROVIDER_ID,
            timestamp: Date.now(),
            url_hash: hashUrl(candidate.url)
        });

        // 5. Fetch detail page
        const fetchResult = await headlessFetch({
            url: candidate.url,
            provider_id: PROVIDER_ID,
            trace_id,
            timeout_ms: 8000
        });

        if (!fetchResult.success || !fetchResult.html) {
            if (fetchResult.ban_signal) {
                await recordBanSignal(PROVIDER_ID, fetchResult.ban_signal, trace_id);
            }
            return null;
        }

        // 6. Parse detail
        const detail = parseDetailPage(fetchResult.html, candidate.url, candidate.listed_price);

        if (!detail) {
            eventBus.emit({
                event_type: 'provider.parse_failed',
                trace_id,
                provider_id: PROVIDER_ID,
                timestamp: Date.now(),
                selector: 'detail',
                url_hash: hashUrl(candidate.url)
            });
            return null;
        }

        // 7. Cache detail
        await setCachedDetail(PROVIDER_ID, candidate.url, detail);
        await recordSuccess(PROVIDER_ID);

        // 8. Emit end event
        const latency_ms = Date.now() - startTime;
        observeHistogram('lix_provider_latency_seconds', latency_ms / 1000, { provider_id: PROVIDER_ID, layer: 'detail' });

        eventBus.emit({
            event_type: 'provider.detail.end',
            trace_id,
            provider_id: PROVIDER_ID,
            timestamp: Date.now(),
            cache_hit: false,
            latency_ms
        });

        incCounter('lix_provider_requests_total', { provider_id: PROVIDER_ID, layer: 'detail', cache_hit: 'false' });

        return detail;
    },

    async buildOffer(input: OfferBuildInput): Promise<Offer> {
        const { candidate, detail, intent, trace_id } = input;

        const offer: Offer = {
            offer_id: generateOfferId(PROVIDER_ID),
            intent_id: intent.intent_id || '',
            provider: {
                id: PROVIDER_ID,
                name: detail.shop_name || config.name,
                type: 'B2C',
                reputation_score: 4.0,
                verified: false,
            },
            item_sku: intent.item?.canonical_sku || candidate.title,
            price: {
                amount: detail.final_price,
                currency: 'CNY',
            },
            price_proof: {
                claimed_price: detail.final_price,
                proof_url: detail.source_url || candidate.url,
                proof_timestamp: detail.price_verified_at,
                provider_signature: `sig_${PROVIDER_ID}_${Date.now().toString(36)}`,
            },
            inventory_signal: normalizeInventorySignal(detail.inventory_signal),
            fulfillment: {
                delivery_eta: detail.delivery_eta || '2-5天',
                method: 'delivery',
                tracking_available: true,
            },
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            trace: {
                trace_id,
                span_id: `span_${PROVIDER_ID}_${Date.now().toString(36)}`,
            }
        };

        return offer;
    }
};

// ============================================================================
// HTML Parsing
// ============================================================================

function parseSearchResults(html: string, budget_max?: number): CandidateItem[] {
    const candidates: CandidateItem[] = [];

    // PDD mobile search results - JSON embedded pattern
    const jsonPattern = /"goods_id":\s*"?(\d+)"?,[\s\S]*?"goods_name":\s*"([^"]+)"[\s\S]*?"price":\s*"?([\d.]+)"?/gi;

    let match;
    while ((match = jsonPattern.exec(html)) !== null && candidates.length < MAX_CANDIDATES) {
        const goodsId = match[1];
        const title = decodeUnicode(match[2]);
        const price = parseFloat(match[3]) / 100; // PDD prices are in cents

        if (budget_max && price > budget_max) {
            continue;
        }

        const url = `https://mobile.yangkeduo.com/goods.html?goods_id=${goodsId}`;

        candidates.push({
            provider_id: PROVIDER_ID,
            title,
            url,
            listed_price: price,
            currency: 'CNY',
            shop_label: 'unknown',
            evidence: {
                scraped_at: new Date().toISOString()
            }
        });
    }

    // Fallback: simpler HTML pattern
    if (candidates.length === 0) {
        const itemPattern = /goods_id[=:]"?(\d+)"?[\s\S]*?<[^>]*class="[^"]*goods-name[^"]*"[^>]*>([\s\S]*?)<\/[\s\S]*?price[^>]*>([\d.]+)/gi;

        while ((match = itemPattern.exec(html)) !== null && candidates.length < MAX_CANDIDATES) {
            const goodsId = match[1];
            const title = cleanHtml(match[2]);
            const price = parseFloat(match[3]);

            if (budget_max && price > budget_max) continue;

            candidates.push({
                provider_id: PROVIDER_ID,
                title,
                url: `https://mobile.yangkeduo.com/goods.html?goods_id=${goodsId}`,
                listed_price: price,
                currency: 'CNY',
                shop_label: 'unknown',
                evidence: {
                    scraped_at: new Date().toISOString()
                }
            });
        }
    }

    return candidates;
}

function parseDetailPage(html: string, sourceUrl: string, listedPrice?: number): DetailExtractionResult | null {
    // Price patterns for PDD
    const pricePatterns = [
        /"price":\s*"?([\d.]+)"?/i,
        /class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+\.?\d*)/i,
        /¥\s*([\d.]+)/
    ];

    let finalPrice: number | null = null;
    for (const pattern of pricePatterns) {
        const match = pattern.exec(html);
        if (match) {
            let parsed = parseFloat(match[1]);
            // PDD API prices are often in cents
            if (parsed > 1000 && listedPrice && listedPrice < 100) {
                parsed = parsed / 100;
            }
            finalPrice = parsed;
            break;
        }
    }

    // Fall back to listed price if parsing failed
    if (!finalPrice && listedPrice) {
        finalPrice = listedPrice;
    }

    if (!finalPrice) {
        return null;
    }

    // Stock status
    let inventorySignal: InventorySignal = 'in_stock';
    if (html.includes('已售罄') || html.includes('无货') || html.includes('sold_out')) {
        inventorySignal = 'out_of_stock';
    }

    // Shop name
    let shopName: string | undefined;
    const shopMatch = /"mall_name":\s*"([^"]+)"/i.exec(html) ||
        /class="[^"]*shop-name[^"]*"[^>]*>([\s\S]*?)</i.exec(html);
    if (shopMatch) {
        shopName = decodeUnicode(shopMatch[1]).trim();
    }

    // Delivery ETA - PDD usually 2-5 days
    const deliveryEta = '2-5天';

    const htmlHash = simpleHash(html.substring(0, 1000));

    return {
        final_price: finalPrice,
        currency: 'CNY',
        inventory_signal: inventorySignal,
        delivery_eta: deliveryEta,
        shop_name: shopName,
        source_url: sourceUrl,
        price_verified_at: new Date().toISOString(),
        html_hash: htmlHash
    };
}

// ============================================================================
// Helpers
// ============================================================================

function cleanHtml(str: string): string {
    return str
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
}

function decodeUnicode(str: string): string {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
    );
}

function calculateRelevance(candidate: CandidateItem, intent: any): number {
    const intentKeywords = (intent.canonical_sku || intent.item || '').toLowerCase().split(/\s+/);
    const titleLower = candidate.title.toLowerCase();

    let matches = 0;
    for (const keyword of intentKeywords) {
        if (keyword.length > 2 && titleLower.includes(keyword)) {
            matches++;
        }
    }

    return Math.min(1.0, matches / Math.max(intentKeywords.length, 1));
}

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

function hashUrl(url: string): string {
    return simpleHash(url.substring(0, 100));
}

function normalizeInventorySignal(signal: InventorySignal): 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown' {
    if (signal === 'limited') return 'low_stock';
    return signal;
}

/**
 * JD Adapter
 * L.I.X. Provider Adapter Layer
 * 
 * JD.com scraping adapter with search and detail extraction.
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
import { getProviderConfig, buildSearchUrl, trySelectors, trySelectorsAll } from './selectorPolicy';
import { eventBus } from '../eventBus';
import { incCounter, observeHistogram } from '../metricsCollector';

// ============================================================================
// Configuration
// ============================================================================

const PROVIDER_ID: ProviderId = 'jd';
const MAX_CANDIDATES = 10;
const config = getProviderConfig(PROVIDER_ID);

// ============================================================================
// JD Adapter Implementation
// ============================================================================

export const jdAdapter: ProviderAdapter = {
    id: PROVIDER_ID,
    name: config.name,
    domains_allowlist: config.domains_allowlist,
    provider_kind: 'ecommerce',  // JD is an e-commerce provider
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
            console.log(`[jdAdapter.circuit_open] Skipping search`);
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
        const rateResult = await canMakeRequest(PROVIDER_ID, 'jd.com');
        if (!rateResult.allowed) {
            console.log(`[jdAdapter.rate_limited] wait_ms=${rateResult.wait_ms}`);
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
        const rateResult = await canMakeRequest(PROVIDER_ID, 'jd.com');
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
        const detail = parseDetailPage(fetchResult.html, candidate.url);

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
            provider_id: PROVIDER_ID,
            provider_name: config.name,
            title: candidate.title,
            description: `${candidate.title} - ${detail.shop_name || '京东'}`,
            price: {
                amount: detail.final_price,
                currency: 'CNY',
                formatted: `¥${detail.final_price.toFixed(2)}`
            },
            inventory_signal: detail.inventory_signal,
            fulfillment: {
                type: 'delivery',
                eta: detail.delivery_eta || '1-3天',
                shipping_cost: 0, // JD often has free shipping
                shipping_formatted: '免邮'
            },
            proof: {
                source_url: detail.source_url,
                price_verified_at: detail.price_verified_at,
                html_hash: detail.html_hash
            },
            scoring: {
                relevance: calculateRelevance(candidate, intent),
                price_score: detail.final_price,
                trust_score: 0.9, // JD is a trusted platform
                validation_score: 1.0
            },
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            trace_id
        };

        return offer;
    }
};

// ============================================================================
// HTML Parsing
// ============================================================================

function parseSearchResults(html: string, budget_max?: number): CandidateItem[] {
    const candidates: CandidateItem[] = [];

    // Use regex for MVP (in production, use JSDOM or cheerio)
    // JD search results pattern
    const itemPattern = /<li[^>]*class="[^"]*gl-item[^"]*"[^>]*data-sku="(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
    const titlePattern = /<div[^>]*class="[^"]*p-name[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i;
    const pricePattern = /<strong[^>]*class="[^"]*J_price[^"]*"[^>]*[^>]*>[\s\S]*?<i>([\d.]+)<\/i>/i;
    const shopPattern = /<div[^>]*class="[^"]*p-shop[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i;

    let match;
    while ((match = itemPattern.exec(html)) !== null && candidates.length < MAX_CANDIDATES) {
        const sku = match[1];
        const itemHtml = match[2];

        // Extract title
        const titleMatch = titlePattern.exec(itemHtml);
        const title = titleMatch ? cleanHtml(titleMatch[1]) : '';
        if (!title) continue;

        // Extract price
        const priceMatch = pricePattern.exec(itemHtml);
        const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

        // Filter by budget
        if (budget_max && price && price > budget_max) {
            continue;
        }

        // Extract shop
        const shopMatch = shopPattern.exec(itemHtml);
        const shopName = shopMatch ? cleanHtml(shopMatch[1]) : '';
        const shopLabel = determineShopLabel(shopName);

        const url = `https://item.jd.com/${sku}.html`;

        candidates.push({
            provider_id: PROVIDER_ID,
            title,
            url,
            listed_price: price,
            currency: 'CNY',
            shop_label: shopLabel,
            evidence: {
                scraped_at: new Date().toISOString()
            }
        });
    }

    // Fallback: simpler pattern if no results
    if (candidates.length === 0) {
        const simplePattern = /data-sku="(\d+)"[\s\S]*?<em>([\s\S]*?)<\/em>[\s\S]*?<i>([\d.]+)<\/i>/gi;

        while ((match = simplePattern.exec(html)) !== null && candidates.length < MAX_CANDIDATES) {
            const sku = match[1];
            const title = cleanHtml(match[2]);
            const price = parseFloat(match[3]);

            if (budget_max && price > budget_max) continue;

            candidates.push({
                provider_id: PROVIDER_ID,
                title,
                url: `https://item.jd.com/${sku}.html`,
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

function parseDetailPage(html: string, sourceUrl: string): DetailExtractionResult | null {
    // Price patterns
    const pricePatterns = [
        /<span[^>]*class="[^"]*p-price[^"]*"[^>]*>[\s\S]*?<i>([\d.]+)<\/i>/i,
        /"price":\s*"?([\d.]+)"?/i,
        /¥([\d.]+)/
    ];

    let finalPrice: number | null = null;
    for (const pattern of pricePatterns) {
        const match = pattern.exec(html);
        if (match) {
            finalPrice = parseFloat(match[1]);
            break;
        }
    }

    if (!finalPrice) {
        return null;
    }

    // Stock status
    let inventorySignal: InventorySignal = 'in_stock';
    if (html.includes('无货') || html.includes('缺货') || html.includes('已售罄')) {
        inventorySignal = 'out_of_stock';
    } else if (html.includes('预约') || html.includes('预售')) {
        inventorySignal = 'limited';
    }

    // Delivery ETA
    let deliveryEta: string | undefined;
    const etaMatch = /预计[\s\S]*?(\d+月\d+日|\d+-\d+天|明天|后天)[\s\S]*?送达/i.exec(html);
    if (etaMatch) {
        deliveryEta = etaMatch[1];
    }

    // Shop name
    let shopName: string | undefined;
    const shopMatch = /<div[^>]*class="[^"]*(?:popbox-inner|shop-name)[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i.exec(html);
    if (shopMatch) {
        shopName = cleanHtml(shopMatch[1]);
    }

    // Generate HTML hash
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
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
}

function determineShopLabel(shopName: string): CandidateItem['shop_label'] {
    const lower = shopName.toLowerCase();
    if (lower.includes('京东自营') || lower.includes('jd自营')) {
        return 'official';
    }
    if (lower.includes('旗舰店') || lower.includes('官方')) {
        return 'flagship';
    }
    if (lower.includes('专营店') || lower.includes('专卖店')) {
        return 'third_party';
    }
    return 'unknown';
}

function calculateRelevance(candidate: CandidateItem, intent: any): number {
    // Simple relevance scoring based on title match
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

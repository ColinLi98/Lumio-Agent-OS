/**
 * Taobao Adapter
 * L.I.X. Provider Adapter Layer
 */

import type {
    ProviderAdapter, ProviderSearchInput, CandidateItem,
    DetailExtractionResult, OfferBuildInput, ProviderId
} from './providerTypes';
import { generateOfferId, extractKeywords } from './providerTypes';
import type { Offer, InventorySignal } from '../lixTypes';
import { getCachedSearch, setCachedSearch, getCachedDetail, setCachedDetail } from './scrapeCache';
import { canMakeRequest } from './rateLimiter';
import { isCircuitOpen, recordBanSignal, recordSuccess } from './banBudget';
import { headlessFetch } from './headlessPool';
import { getProviderConfig, buildSearchUrl } from './selectorPolicy';
import { eventBus } from '../eventBus';
import { incCounter, observeHistogram } from '../metricsCollector';

const PROVIDER_ID: ProviderId = 'taobao';
const MAX_CANDIDATES = 10;
const config = getProviderConfig(PROVIDER_ID);

export const taobaoAdapter: ProviderAdapter = {
    id: PROVIDER_ID,
    name: config.name,
    domains_allowlist: config.domains_allowlist,

    async search(input: ProviderSearchInput): Promise<CandidateItem[]> {
        const { canonical_sku, keywords, budget_max, location_code, trace_id } = input;
        const startTime = Date.now();

        if (await isCircuitOpen(PROVIDER_ID)) return [];

        const cached = await getCachedSearch(PROVIDER_ID, canonical_sku, location_code, budget_max);
        if (cached) {
            eventBus.emit({ event_type: 'provider.search.end', trace_id, provider_id: PROVIDER_ID, timestamp: Date.now(), candidates_count: cached.length, cache_hit: true, latency_ms: Date.now() - startTime });
            return cached;
        }

        const rateResult = await canMakeRequest(PROVIDER_ID, 'taobao.com');
        if (!rateResult.allowed) return [];

        eventBus.emit({ event_type: 'provider.search.start', trace_id, provider_id: PROVIDER_ID, timestamp: Date.now(), canonical_sku });

        const searchKeywords = keywords.length > 0 ? keywords : extractKeywords(canonical_sku);
        const fetchResult = await headlessFetch({ url: buildSearchUrl(PROVIDER_ID, searchKeywords), provider_id: PROVIDER_ID, trace_id, timeout_ms: 12000 });

        if (!fetchResult.success || !fetchResult.html) {
            if (fetchResult.ban_signal) await recordBanSignal(PROVIDER_ID, fetchResult.ban_signal, trace_id);
            return [];
        }

        const candidates = parseSearchResults(fetchResult.html, budget_max);
        if (candidates.length > 0) {
            await setCachedSearch(PROVIDER_ID, canonical_sku, candidates, location_code, budget_max);
            await recordSuccess(PROVIDER_ID);
        }

        observeHistogram('lix_provider_latency_seconds', (Date.now() - startTime) / 1000, { provider_id: PROVIDER_ID, layer: 'search' });
        incCounter('lix_provider_requests_total', { provider_id: PROVIDER_ID, layer: 'search', cache_hit: 'false' });

        return candidates;
    },

    async extractDetail(candidate: CandidateItem, trace_id: string): Promise<DetailExtractionResult | null> {
        if (await isCircuitOpen(PROVIDER_ID)) return null;

        const cached = await getCachedDetail(PROVIDER_ID, candidate.url);
        if (cached) return cached;

        const rateResult = await canMakeRequest(PROVIDER_ID, 'taobao.com');
        if (!rateResult.allowed) return null;

        const fetchResult = await headlessFetch({ url: candidate.url, provider_id: PROVIDER_ID, trace_id, timeout_ms: 10000 });
        if (!fetchResult.success || !fetchResult.html) {
            if (fetchResult.ban_signal) await recordBanSignal(PROVIDER_ID, fetchResult.ban_signal, trace_id);
            return null;
        }

        const detail = parseDetailPage(fetchResult.html, candidate.url, candidate.listed_price);
        if (detail) {
            await setCachedDetail(PROVIDER_ID, candidate.url, detail);
            await recordSuccess(PROVIDER_ID);
        }
        return detail;
    },

    async buildOffer(input: OfferBuildInput): Promise<Offer> {
        const { candidate, detail, intent, trace_id } = input;
        const isTmall = candidate.url.includes('tmall.com');

        return {
            offer_id: generateOfferId(PROVIDER_ID),
            intent_id: intent.intent_id || '',
            provider_id: PROVIDER_ID,
            provider_name: isTmall ? '天猫' : config.name,
            title: candidate.title,
            description: `${candidate.title} - ${detail.shop_name || '淘宝'}`,
            price: { amount: detail.final_price, currency: 'CNY', formatted: `¥${detail.final_price.toFixed(2)}` },
            inventory_signal: detail.inventory_signal,
            fulfillment: { type: 'delivery', eta: detail.delivery_eta || '2-5天', shipping_cost: 0, shipping_formatted: '包邮' },
            proof: { source_url: detail.source_url, price_verified_at: detail.price_verified_at, html_hash: detail.html_hash },
            scoring: { relevance: 0.8, price_score: detail.final_price, trust_score: isTmall ? 0.85 : 0.75, validation_score: 1.0 },
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            trace_id
        };
    }
};

function parseSearchResults(html: string, budget_max?: number): CandidateItem[] {
    const candidates: CandidateItem[] = [];
    const pattern = /data-nid="(\d+)"[\s\S]*?title[^>]*>([\s\S]*?)<\/[\s\S]*?price[^>]*>([\d.]+)/gi;
    let match;
    while ((match = pattern.exec(html)) !== null && candidates.length < MAX_CANDIDATES) {
        const price = parseFloat(match[3]);
        if (budget_max && price > budget_max) continue;
        candidates.push({
            provider_id: PROVIDER_ID, title: match[2].replace(/<[^>]*>/g, '').trim(),
            url: `https://item.taobao.com/item.htm?id=${match[1]}`,
            listed_price: price, currency: 'CNY', shop_label: 'unknown',
            evidence: { scraped_at: new Date().toISOString() }
        });
    }
    return candidates;
}

function parseDetailPage(html: string, sourceUrl: string, listedPrice?: number): DetailExtractionResult | null {
    const priceMatch = /"price":\s*"?([\d.]+)"?/i.exec(html) || /¥\s*([\d.]+)/.exec(html);
    const finalPrice = priceMatch ? parseFloat(priceMatch[1]) : listedPrice;
    if (!finalPrice) return null;

    let inventorySignal: InventorySignal = 'in_stock';
    if (html.includes('已售罄') || html.includes('暂时无货')) inventorySignal = 'out_of_stock';

    return {
        final_price: finalPrice, currency: 'CNY', inventory_signal: inventorySignal,
        delivery_eta: '2-5天', source_url: sourceUrl,
        price_verified_at: new Date().toISOString(), html_hash: Math.abs(hashCode(html)).toString(36)
    };
}

function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < Math.min(s.length, 500); i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return h;
}

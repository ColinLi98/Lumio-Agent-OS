import type {
    SerpApiEngine,
    SerpApiEvidenceItem,
    SerpApiLocalItem,
    SerpApiNormalizedPayload,
    SerpApiReviewItem,
    SerpApiShoppingItem,
} from './serpApiTypes.js';

function asNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''));
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function asString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}

function safeArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function isPublicResultUrl(url?: string): boolean {
    if (!url || !/^https?:\/\//i.test(url)) return false;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (host.includes('serpapi.com')) return false;
        if (path.includes('/search.json')) return false;
        if (parsed.searchParams.has('api_key')) return false;
        return true;
    } catch {
        return false;
    }
}

function isLikelyUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function isCanonicalGooglePlaceId(value: string): boolean {
    return /^ChIJ[\w-]{8,}$/.test(value);
}

function buildMapUrl(item: any): string | undefined {
    const directCandidates = [
        asString(item?.map_url),
        asString(item?.link),
        asString(item?.place_id_search),
        asString(item?.website),
    ].filter((v): v is string => Boolean(v));
    for (const candidate of directCandidates) {
        if (isPublicResultUrl(candidate)) return candidate;
    }

    const placeIdRaw = asString(item?.place_id || item?.data_id || item?.place_id_search);
    if (placeIdRaw && !isLikelyUrl(placeIdRaw)) {
        const queryText = [
            asString(item?.title || item?.name),
            asString(item?.address),
        ].filter(Boolean).join(' ').trim() || placeIdRaw;
        const query = encodeURIComponent(queryText);
        if (isCanonicalGooglePlaceId(placeIdRaw)) {
            return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeIdRaw)}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    const lat = asNumber(item?.gps_coordinates?.latitude ?? item?.latitude);
    const lon = asNumber(item?.gps_coordinates?.longitude ?? item?.longitude);
    if (lat !== undefined && lon !== undefined) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    }

    const nameOrAddress = asString(item?.title || item?.name || item?.address);
    if (nameOrAddress) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nameOrAddress)}`;
    }
    return undefined;
}

function normalizeLocalItems(raw: any): SerpApiLocalItem[] {
    const candidates = [
        ...safeArray<any>(raw?.local_results),
        ...safeArray<any>(raw?.places_results),
        ...safeArray<any>(raw?.top_sights),
    ];

    const rows = candidates.map((item, index) => {
        const id = asString(item?.place_id || item?.data_id || item?.position) || `local_${index}`;
        const name = asString(item?.title || item?.name) || 'Unknown place';
        const websiteRaw = asString(item?.website);
        return {
            id,
            name,
            address: asString(item?.address),
            phone: asString(item?.phone || item?.phone_number),
            website: websiteRaw && isPublicResultUrl(websiteRaw) ? websiteRaw : undefined,
            rating: asNumber(item?.rating),
            reviews: asNumber(item?.reviews),
            status: asString(item?.hours || item?.open_state || item?.service_options),
            price_level: asString(item?.price || item?.price_level),
            category: asString(item?.type || item?.category),
            latitude: asNumber(item?.gps_coordinates?.latitude ?? item?.latitude),
            longitude: asNumber(item?.gps_coordinates?.longitude ?? item?.longitude),
            map_url: buildMapUrl(item),
        } satisfies SerpApiLocalItem;
    });

    const deduped = new Map<string, SerpApiLocalItem>();
    rows.forEach((row) => {
        const key = `${row.name}::${row.address || row.map_url || row.id}`;
        if (!deduped.has(key)) deduped.set(key, row);
    });
    return Array.from(deduped.values()).slice(0, 20);
}

function normalizeReviewItems(raw: any): SerpApiReviewItem[] {
    const reviews = [
        ...safeArray<any>(raw?.reviews),
        ...safeArray<any>(raw?.top_reviews),
        ...safeArray<any>(raw?.user_reviews),
    ];
    return reviews.slice(0, 20).map((item) => ({
        author: asString(item?.user?.name || item?.author || item?.name),
        rating: asNumber(item?.rating),
        date: asString(item?.date),
        snippet: asString(item?.snippet || item?.description || item?.text) || '',
        source: asString(item?.source || item?.link),
    }));
}

function inferCurrency(priceText?: string): string | undefined {
    if (!priceText) return undefined;
    if (/[¥￥]|CNY|RMB|元/i.test(priceText)) return 'CNY';
    if (/[$]|USD/i.test(priceText)) return 'USD';
    if (/EUR|€/.test(priceText)) return 'EUR';
    return undefined;
}

function normalizeShoppingItems(raw: any): SerpApiShoppingItem[] {
    const rows = safeArray<any>(raw?.shopping_results).map((item, index) => {
        const priceText = asString(item?.price || item?.extracted_price ? `${item?.price ?? item?.extracted_price}` : undefined);
        return {
            id: asString(item?.product_id || item?.position) || `shop_${index}`,
            title: asString(item?.title) || 'Unknown product',
            source: asString(item?.source),
            merchant: asString(item?.merchant || item?.store),
            price: asNumber(item?.extracted_price ?? item?.price),
            price_text: priceText,
            currency: inferCurrency(priceText),
            rating: asNumber(item?.rating),
            reviews: asNumber(item?.reviews),
            thumbnail: asString(item?.thumbnail),
            url: asString(item?.link || item?.product_link),
        } satisfies SerpApiShoppingItem;
    });
    return rows.slice(0, 20);
}

export function normalizeSerpApiPayload(engine: SerpApiEngine, raw: any): SerpApiNormalizedPayload {
    if (engine === 'google_maps' || engine === 'google_local') {
        const localResults = normalizeLocalItems(raw);
        const links = localResults
            .map((item) => ({ title: `${item.name} 地图`, url: item.map_url || item.website || '', source: 'google_maps' }))
            .filter((item) => isPublicResultUrl(item.url));
        return {
            kind: 'local',
            items: localResults,
            local_results: localResults,
            links,
        };
    }

    if (engine === 'google_maps_reviews') {
        const reviewResults = normalizeReviewItems(raw);
        return {
            kind: 'local',
            items: reviewResults,
            review_results: reviewResults,
            links: [],
        };
    }

    if (engine === 'google_shopping') {
        const shoppingResults = normalizeShoppingItems(raw);
        const links = shoppingResults
            .map((item) => ({ title: item.title, url: item.url || '', source: item.source }))
            .filter((item) => isPublicResultUrl(item.url));
        return {
            kind: 'shopping',
            items: shoppingResults,
            shopping_results: shoppingResults,
            links,
        };
    }

    if (engine === 'google_flights' || engine === 'google_hotels') {
        return { kind: 'travel', items: [], links: [] };
    }

    return { kind: 'raw', items: [], links: [] };
}

export function buildSerpApiEvidenceItems(normalized: SerpApiNormalizedPayload): SerpApiEvidenceItem[] {
    if (normalized.local_results && normalized.local_results.length > 0) {
        return normalized.local_results.slice(0, 10).map((item) => ({
            title: item.name,
            snippet: [item.address, item.rating ? `评分 ${item.rating}` : '', item.status || '']
                .filter(Boolean)
                .join(' · '),
            url: item.map_url || item.website || '',
            source_name: 'google_maps',
        })).filter((item) => isPublicResultUrl(item.url));
    }

    if (normalized.shopping_results && normalized.shopping_results.length > 0) {
        return normalized.shopping_results.slice(0, 10).map((item) => ({
            title: item.title,
            snippet: [item.price_text || (item.price ? `${item.price}` : ''), item.source || item.merchant || '']
                .filter(Boolean)
                .join(' · '),
            url: item.url || '',
            source_name: item.source || 'google_shopping',
        })).filter((item) => isPublicResultUrl(item.url));
    }

    if (normalized.review_results && normalized.review_results.length > 0) {
        return normalized.review_results.slice(0, 10).map((item, index) => ({
            title: item.author || `Review ${index + 1}`,
            snippet: [item.rating ? `评分 ${item.rating}` : '', item.snippet]
                .filter(Boolean)
                .join(' · '),
            url: item.source || '',
            source_name: 'google_maps_reviews',
        })).filter((item) => isPublicResultUrl(item.url));
    }

    return [];
}

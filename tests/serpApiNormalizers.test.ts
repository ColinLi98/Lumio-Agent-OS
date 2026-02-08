import { describe, expect, it } from 'vitest';
import { buildSerpApiEvidenceItems, normalizeSerpApiPayload } from '../services/serpApiNormalizers';

describe('serpApiNormalizers', () => {
    it('normalizes google_local results into structured local_results and links', () => {
        const raw = {
            local_results: [
                {
                    place_id: 'abc_1',
                    title: '外滩咖啡店',
                    address: '上海黄浦区外滩 1 号',
                    rating: 4.7,
                    reviews: 328,
                    gps_coordinates: { latitude: 31.2401, longitude: 121.4903 },
                },
            ],
        };

        const normalized = normalizeSerpApiPayload('google_local', raw);

        expect(normalized.kind).toBe('local');
        expect(Array.isArray(normalized.local_results)).toBe(true);
        expect(normalized.local_results?.length).toBe(1);
        expect(normalized.local_results?.[0].name).toBe('外滩咖啡店');
        expect(normalized.local_results?.[0].map_url).toContain('google.com/maps/search');
        expect(Array.isArray(normalized.links)).toBe(true);
        expect(normalized.links?.[0].url).toContain('http');
    });

    it('normalizes google_shopping results and builds evidence items', () => {
        const raw = {
            shopping_results: [
                {
                    product_id: 'p_1',
                    title: 'iPhone 15 128G',
                    source: 'JD',
                    merchant: '京东自营',
                    price: '¥4999',
                    extracted_price: 4999,
                    link: 'https://item.jd.com/123.html',
                },
            ],
        };

        const normalized = normalizeSerpApiPayload('google_shopping', raw);
        const evidence = buildSerpApiEvidenceItems(normalized);

        expect(normalized.kind).toBe('shopping');
        expect(Array.isArray(normalized.shopping_results)).toBe(true);
        expect(normalized.shopping_results?.length).toBe(1);
        expect(normalized.shopping_results?.[0].title).toContain('iPhone 15');
        expect(normalized.shopping_results?.[0].price).toBe(4999);
        expect(evidence.length).toBe(1);
        expect(evidence[0].url).toBe('https://item.jd.com/123.html');
    });

    it('filters provider debug urls from normalized links/evidence', () => {
        const raw = {
            shopping_results: [
                {
                    product_id: 'p_2',
                    title: 'Debug Link Product',
                    source: 'SerpApi',
                    merchant: 'Internal',
                    price: '¥10',
                    extracted_price: 10,
                    link: 'https://serpapi.com/search.json?engine=google_shopping&api_key=secret',
                },
                {
                    product_id: 'p_3',
                    title: 'Public Link Product',
                    source: 'JD',
                    merchant: '京东',
                    price: '¥20',
                    extracted_price: 20,
                    link: 'https://item.jd.com/xyz.html',
                },
            ],
        };

        const normalized = normalizeSerpApiPayload('google_shopping', raw);
        const evidence = buildSerpApiEvidenceItems(normalized);

        expect(normalized.links?.length).toBe(1);
        expect(normalized.links?.[0].url).toBe('https://item.jd.com/xyz.html');
        expect(evidence.length).toBe(1);
        expect(evidence[0].url).toBe('https://item.jd.com/xyz.html');
    });

    it('replaces local serpapi debug map link with safe google maps link', () => {
        const raw = {
            local_results: [
                {
                    place_id: 'ChIJtestPlaceId',
                    title: '测试咖啡店',
                    address: '上海市黄浦区中山东一路 1 号',
                    link: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret',
                    website: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret',
                    gps_coordinates: { latitude: 31.2401, longitude: 121.4903 },
                },
            ],
        };

        const normalized = normalizeSerpApiPayload('google_maps', raw);
        const item = normalized.local_results?.[0];

        expect(item).toBeDefined();
        expect(item?.map_url).toContain('google.com/maps/search');
        expect(item?.map_url).not.toContain('serpapi.com');
        expect(item?.website).toBeUndefined();
    });
});

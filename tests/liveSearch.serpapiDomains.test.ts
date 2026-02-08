import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import liveSearchHandler from '../api/live-search';

type MockReq = {
    method: string;
    body?: any;
    headers?: Record<string, string>;
};

type MockRes = {
    statusCode: number;
    headers: Record<string, string>;
    payload: any;
    ended: boolean;
    setHeader: (key: string, value: string) => void;
    status: (code: number) => MockRes;
    json: (payload: any) => MockRes;
    end: () => void;
};

function createMockRes(): MockRes {
    return {
        statusCode: 200,
        headers: {},
        payload: undefined,
        ended: false,
        setHeader(key: string, value: string) {
            this.headers[key] = value;
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.payload = payload;
            this.ended = true;
            return this;
        },
        end() {
            this.ended = true;
        },
    };
}

describe('api/live-search serpapi domain routing', () => {
    const originalSerpKey = process.env.SERPAPI_KEY;

    beforeEach(() => {
        process.env.SERPAPI_KEY = 'test_serpapi_key';
    });

    afterEach(() => {
        process.env.SERPAPI_KEY = originalSerpKey;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('maps local_service intent to local_life and returns local_results', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            const parsed = new URL(url);
            const engine = parsed.searchParams.get('engine');

            if (engine === 'google_local') {
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        local_results: [
                            {
                                place_id: 'place_1',
                                title: '外滩咖啡馆',
                                address: '上海外滩',
                                rating: 4.8,
                                reviews: 120,
                                gps_coordinates: { latitude: 31.2401, longitude: 121.4903 },
                            },
                        ],
                    }),
                } as Response;
            }

            if (engine === 'google_maps') {
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        local_results: [
                            {
                                place_id: 'place_2',
                                title: '外滩精品咖啡',
                                address: '上海黄浦区',
                                rating: 4.6,
                                reviews: 80,
                                gps_coordinates: { latitude: 31.2402, longitude: 121.4904 },
                            },
                        ],
                    }),
                } as Response;
            }

            if (engine === 'google_maps_reviews') {
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        reviews: [
                            { author: '用户A', rating: 5, snippet: '环境不错' },
                        ],
                    }),
                } as Response;
            }

            return {
                ok: false,
                status: 400,
                text: async () => JSON.stringify({ error: 'unexpected_engine' }),
            } as Response;
        }));

        const req: MockReq = {
            method: 'POST',
            body: {
                query: '帮我找上海外滩附近评分高的咖啡店',
                intent_domain: 'local_service',
                locale: 'zh-CN',
                max_items: 5,
            },
        };
        const res = createMockRes();

        await liveSearchHandler(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload?.success).toBe(true);
        expect(res.payload?.route_decision?.intent_domain).toBe('local_life');
        expect(Array.isArray(res.payload?.local_results)).toBe(true);
        expect(res.payload?.local_results?.length).toBeGreaterThan(0);
        const mapUrl = String(res.payload?.local_results?.[0]?.map_url || '');
        expect(mapUrl).toContain('google.com/maps/search');
        expect(decodeURIComponent(mapUrl)).toContain('上海');
        expect(mapUrl).not.toContain('query_place_id=');
    });

    it('maps shopping intent to ecommerce and returns shopping_results', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            const parsed = new URL(url);
            const engine = parsed.searchParams.get('engine');

            if (engine === 'google_shopping') {
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        shopping_results: [
                            {
                                product_id: 'sku_1',
                                title: 'iPhone 15 128G',
                                source: 'JD',
                                merchant: '京东自营',
                                price: '¥4999',
                                extracted_price: 4999,
                                link: 'https://item.jd.com/sku_1.html',
                            },
                        ],
                    }),
                } as Response;
            }

            return {
                ok: false,
                status: 400,
                text: async () => JSON.stringify({ error: 'unexpected_engine' }),
            } as Response;
        }));

        const req: MockReq = {
            method: 'POST',
            body: {
                query: '对比 iPhone 15 的价格',
                intent_domain: 'shopping',
                locale: 'zh-CN',
                max_items: 5,
            },
        };
        const res = createMockRes();

        await liveSearchHandler(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload?.success).toBe(true);
        expect(res.payload?.route_decision?.intent_domain).toBe('ecommerce');
        expect(Array.isArray(res.payload?.shopping_results)).toBe(true);
        expect(res.payload?.shopping_results?.length).toBeGreaterThan(0);
    });
});

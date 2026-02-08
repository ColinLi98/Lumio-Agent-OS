import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToolRegistry } from '../services/toolRegistry';

describe('toolRegistry live_search action_links', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('returns structured action_links on live_search failure', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                success: false,
                error: { code: 'NO_RESULTS', message: 'no results', retryable: true, reason_code: 'no_results' },
                fallback: {
                    failure_reason: '未找到相关实时信息',
                    missing_constraints: [],
                    cta_buttons: [],
                },
            }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const tool = getToolRegistry().getTool('live_search');
        expect(tool).toBeDefined();

        const result = await tool!.execute({
            query: '明天早上，上海虹桥到北京首都，经济舱，1人',
            intent_domain: 'travel.flight',
            locale: 'zh-CN',
        });

        expect(result.success).toBe(false);
        expect(Array.isArray(result.action_links)).toBe(true);
        expect(result.action_links.length).toBeGreaterThan(0);
        expect(result.action_links[0].supports_time_filter).toBe(false);
    });

    it('returns structured action_links when evidence is weak', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                success: true,
                evidence: {
                    provider: 'vertex_grounding',
                    fetched_at: new Date().toISOString(),
                    ttl_seconds: 120,
                    query_normalized: 'flight query',
                    intent_domain: 'travel.flight',
                    items: [
                        {
                            title: '上海到北京机票',
                            snippet: '查看机票结果页',
                            url: 'https://www.ctrip.com',
                            source_name: 'ctrip.com',
                        },
                    ],
                    notes: {
                        confidence: 0.75,
                        warnings: [],
                    },
                },
                normalized_quotes: [
                    {
                        quote_id: 'q1',
                        provider: 'serpapi_google_flights',
                        dep_time: '07:30',
                        arr_time: '09:45',
                        price: 980,
                        currency: 'CNY',
                        transfers: 0,
                        source_url: 'https://www.google.com/travel/flights',
                        fetched_at: new Date().toISOString(),
                    },
                ],
            }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const tool = getToolRegistry().getTool('live_search');
        expect(tool).toBeDefined();

        const result = await tool!.execute({
            query: '明天早上，上海虹桥到北京首都，经济舱，1人',
            intent_domain: 'travel.flight',
            locale: 'zh-CN',
        });

        expect(result.success).toBe(true);
        expect(Array.isArray(result.action_links)).toBe(true);
        expect(result.action_links.length).toBeGreaterThan(0);
        expect(result.action_links[0].provider).toBe('trip');
        expect(result.action_links[0].supports_time_filter).toBe(false);
        expect(Array.isArray(result.quote_cards)).toBe(true);
        expect(result.quote_cards[0].price_text).toContain('CNY');
    });

    it('passes through local_results for marketplace visualization', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                success: true,
                route_decision: { intent_domain: 'local_life', needs_live_data: true, reason: 'domain=local_life implies live data' },
                evidence: {
                    provider: 'serpapi_google_local_maps',
                    fetched_at: Date.now(),
                    ttl_seconds: 180,
                    query_normalized: '上海外滩咖啡店',
                    intent_domain: 'local_life',
                    items: [
                        {
                            title: '外滩咖啡馆',
                            snippet: '评分 4.8',
                            url: 'https://maps.google.com/?q=31.2401,121.4903',
                            source_name: 'google_maps',
                        },
                    ],
                    notes: {
                        confidence: 0.9,
                        warnings: [],
                    },
                },
                local_results: [
                    {
                        id: 'place_1',
                        name: '外滩咖啡馆',
                        address: '上海外滩',
                        rating: 4.8,
                        map_url: 'https://maps.google.com/?q=31.2401,121.4903',
                    },
                ],
                action_links: [
                    {
                        title: '外滩咖啡馆 导航',
                        url: 'https://maps.google.com/?q=31.2401,121.4903',
                        provider: 'google_maps',
                        supports_time_filter: false,
                    },
                ],
            }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const tool = getToolRegistry().getTool('live_search');
        expect(tool).toBeDefined();

        const result = await tool!.execute({
            query: '帮我找上海外滩附近评分高的咖啡店',
            intent_domain: 'local.service',
            locale: 'zh-CN',
        });

        expect(result.success).toBe(true);
        expect(Array.isArray(result.local_results)).toBe(true);
        expect(result.local_results.length).toBe(1);
        expect(result.local_results[0].name).toBe('外滩咖啡馆');
        expect(Array.isArray(result.action_links)).toBe(true);
        expect(result.action_links.length).toBeGreaterThan(0);
    });
});

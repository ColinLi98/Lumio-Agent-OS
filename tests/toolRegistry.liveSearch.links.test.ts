import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToolRegistry } from '../services/toolRegistry';

describe('toolRegistry live_search action_links', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('returns structured action_links on live_search failure', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            json: async () => ({
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
            json: async () => ({
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
    });
});

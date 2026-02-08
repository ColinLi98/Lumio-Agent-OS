import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeSerpApiWithKey } from '../services/serpApiClient';

describe('serpApiClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('classifies 401 as auth error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: 'Invalid API key' }),
        }));

        const result = await executeSerpApiWithKey({
            engine: 'google_shopping',
            params: { q: 'iphone 15' },
            locale: 'zh-CN',
            domain: 'shopping',
            freshness_policy: 'cache_ok',
        }, 'test_key');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('auth');
        expect(result.error?.retryable).toBe(false);
        expect(result.fallback?.reason).toContain('密钥');
    });

    it('classifies 429 as quota error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: async () => JSON.stringify({ error: 'Rate limit exceeded' }),
        }));

        const result = await executeSerpApiWithKey({
            engine: 'google_maps',
            params: { q: '上海咖啡店' },
            locale: 'zh-CN',
            domain: 'local_service',
            freshness_policy: 'force_live',
        }, 'test_key');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('quota');
        expect(result.error?.retryable).toBe(true);
    });

    it('returns no_results when provider returns empty normalized payload', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ search_metadata: { status: 'Success' } }),
        }));

        const result = await executeSerpApiWithKey({
            engine: 'google_shopping',
            params: { q: 'unlikely_product_keyword_xyz' },
            locale: 'zh-CN',
            domain: 'shopping',
            freshness_policy: 'cache_ok',
        }, 'test_key');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('no_results');
        expect(result.error?.retryable).toBe(true);
    });
});

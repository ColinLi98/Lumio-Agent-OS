import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchFlights } from '../services/flightSearchService';

const baseParams = {
    origin: '上海虹桥',
    destination: '北京首都',
    departureDate: '2026-02-07',
    travelClass: 'economy' as const,
};

describe('flightSearchService realtime guard', () => {
    const envKeys = [
        'SERPAPI_KEY',
        'VITE_SERPAPI_KEY',
        'AMADEUS_CLIENT_ID',
        'AMADEUS_CLIENT_SECRET',
        'VITE_AMADEUS_CLIENT_ID',
        'VITE_AMADEUS_CLIENT_SECRET',
        'LIVE_SEARCH_ENDPOINT',
        'LUMI_LIVE_SEARCH_ENDPOINT',
        'LUMI_API_BASE_URL',
        'VITE_API_BASE_URL',
    ] as const;
    let envSnapshot: Record<string, string | undefined> = {};

    beforeEach(() => {
        envSnapshot = Object.fromEntries(
            envKeys.map((key) => [key, process.env[key]])
        );
        for (const key of envKeys) {
            delete process.env[key];
        }
    });

    afterEach(() => {
        for (const key of envKeys) {
            const value = envSnapshot[key];
            if (typeof value === 'undefined') {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
        vi.unstubAllGlobals();
    });

    it('fails closed when realtime provider key is missing', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in test')));
        const result = await searchFlights(baseParams, undefined, {
            amadeus: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.flights).toHaveLength(0);
        expect(result.realtime?.verified).toBe(false);
        expect(result.error).toContain('未获取到可验证的多源实时航班数据');
    });

    it('does not silently fallback to estimated data when live provider fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 503,
            text: async () => 'provider temporarily unavailable',
        }));

        const result = await searchFlights(baseParams, 'test-serpapi-key', {
            requireLiveData: true,
            allowEstimatedFallback: false,
            amadeus: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.flights).toHaveLength(0);
        expect(result.realtime?.verified).toBe(false);
        expect(result.realtime?.warnings?.join(' ')).toContain('Estimated fallback disabled');
    });

    it('allows estimated fallback only when explicitly enabled', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in test')));
        const result = await searchFlights(baseParams, undefined, {
            requireLiveData: false,
            allowEstimatedFallback: true,
            amadeus: { enabled: false },
        });

        expect(result.success).toBe(true);
        expect(result.realtime?.provider).toBe('estimated_mock');
        expect(result.realtime?.verified).toBe(false);
    });
});

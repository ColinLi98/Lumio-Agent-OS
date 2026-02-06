import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchFlights } from '../services/flightSearchService';

const baseParams = {
    origin: '上海虹桥',
    destination: '北京首都',
    departureDate: '2026-02-07',
    travelClass: 'economy' as const,
};

describe('flightSearchService realtime guard', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('fails closed when realtime provider key is missing', async () => {
        const result = await searchFlights(baseParams, undefined);

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
        });

        expect(result.success).toBe(false);
        expect(result.flights).toHaveLength(0);
        expect(result.realtime?.verified).toBe(false);
        expect(result.realtime?.warnings?.join(' ')).toContain('Estimated fallback disabled');
    });

    it('allows estimated fallback only when explicitly enabled', async () => {
        const result = await searchFlights(baseParams, undefined, {
            requireLiveData: false,
            allowEstimatedFallback: true,
        });

        expect(result.success).toBe(true);
        expect(result.realtime?.provider).toBe('estimated_mock');
        expect(result.realtime?.verified).toBe(false);
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/serpApiClient', () => ({
    executeSerpApi: vi.fn(),
}));

import { executeSerpApi } from '../services/serpApiClient';
import { searchHotels } from '../services/hotelSearchService';

describe('hotelSearchService booking link sanitize', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('replaces serpapi debug booking url with google hotels fallback', async () => {
        vi.mocked(executeSerpApi).mockResolvedValue({
            success: true,
            engine: 'google_hotels',
            raw: {
                properties: [
                    {
                        property_token: 'h1',
                        name: 'Test Hotel',
                        type: 'hotel',
                        overall_rating: 4.6,
                        reviews: 120,
                        extracted_price: 499,
                        serpapi_property_details_link: 'https://serpapi.com/search.json?engine=google_hotels&api_key=bad',
                    },
                ],
                search_information: { total_results: 1 },
            },
            normalized: { kind: 'travel', items: [], links: [] },
            evidence: {
                provider: 'google_hotels',
                fetched_at: new Date().toISOString(),
                ttl_seconds: 300,
                items: [],
            },
        } as any);

        const result = await searchHotels({
            destination: '上海',
            checkInDate: '2026-02-14',
            checkOutDate: '2026-02-16',
            adults: 2,
        });

        expect(result.success).toBe(true);
        expect(result.hotels.length).toBe(1);
        const bookingUrl = result.hotels[0].bookingUrl || '';
        expect(bookingUrl).toContain('google.com/travel/hotels');
        expect(bookingUrl).not.toContain('serpapi.com');
        expect(bookingUrl).not.toContain('api_key=');
    });
});

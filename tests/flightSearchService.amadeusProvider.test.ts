import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchFlights } from '../services/flightSearchService';

const params = {
    origin: '上海虹桥',
    destination: '北京首都',
    departureDate: '2026-02-07',
    travelClass: 'economy' as const,
    departureTimePreference: 'morning' as const,
    timePriorityMode: 'prefer' as const,
};

function makeJsonResponse(payload: any, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
    } as any;
}

describe('flightSearchService amadeus provider integration', () => {
    const originalWindow = (globalThis as any).window;
    const originalClientId = process.env.AMADEUS_CLIENT_ID;
    const originalClientSecret = process.env.AMADEUS_CLIENT_SECRET;
    const originalBaseUrl = process.env.AMADEUS_BASE_URL;

    afterEach(() => {
        vi.unstubAllGlobals();
        if (typeof originalWindow === 'undefined') {
            delete (globalThis as any).window;
        } else {
            (globalThis as any).window = originalWindow;
        }

        if (typeof originalClientId === 'undefined') {
            delete process.env.AMADEUS_CLIENT_ID;
        } else {
            process.env.AMADEUS_CLIENT_ID = originalClientId;
        }
        if (typeof originalClientSecret === 'undefined') {
            delete process.env.AMADEUS_CLIENT_SECRET;
        } else {
            process.env.AMADEUS_CLIENT_SECRET = originalClientSecret;
        }
        if (typeof originalBaseUrl === 'undefined') {
            delete process.env.AMADEUS_BASE_URL;
        } else {
            process.env.AMADEUS_BASE_URL = originalBaseUrl;
        }
    });

    it('aggregates amadeus + live_search as multi_provider realtime result', async () => {
        (globalThis as any).window = { location: { origin: 'http://localhost:5173' } };
        process.env.AMADEUS_CLIENT_ID = 'amadeus-client-id';
        process.env.AMADEUS_CLIENT_SECRET = 'amadeus-client-secret';
        process.env.AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

        vi.stubGlobal('fetch', vi.fn(async (input: any) => {
            const url = String(input);

            if (url.includes('/api/live-search')) {
                return makeJsonResponse({
                    success: true,
                    evidence: {
                        provider: 'google_search_grounding',
                        fetched_at: Date.now(),
                        ttl_seconds: 120,
                        items: [
                            {
                                title: 'Trip.com CA1511 07:10-09:25 ¥920',
                                snippet: '上海虹桥到北京首都 直飞',
                                url: 'https://www.trip.com/flights/?dcity=SHA&acity=PEK&ddate=2026-02-07',
                                source_name: 'trip.com',
                            },
                        ],
                    },
                });
            }

            if (url.includes('/v1/security/oauth2/token')) {
                return makeJsonResponse({
                    access_token: 'amadeus-token',
                    token_type: 'Bearer',
                    expires_in: 1799,
                });
            }

            if (url.includes('/v2/shopping/flight-offers')) {
                return makeJsonResponse({
                    data: [
                        {
                            id: '1',
                            price: { currency: 'CNY', grandTotal: '980.00' },
                            validatingAirlineCodes: ['MU'],
                            itineraries: [
                                {
                                    duration: 'PT2H25M',
                                    segments: [
                                        {
                                            carrierCode: 'MU',
                                            number: '5109',
                                            departure: { iataCode: 'SHA', at: '2026-02-07T08:15:00+08:00' },
                                            arrival: { iataCode: 'PEK', at: '2026-02-07T10:40:00+08:00' },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            }

            return makeJsonResponse({ error: 'unexpected url' }, 404);
        }));

        const result = await searchFlights(params, undefined, {
            requireLiveData: true,
            allowEstimatedFallback: false,
        });

        expect(result.success).toBe(true);
        expect(result.realtime?.verified).toBe(true);
        expect(result.realtime?.provider).toBe('multi_aggregated');
        expect(result.realtime?.coverage_scope).toBe('multi_provider');
        expect(result.flights.length).toBeGreaterThanOrEqual(2);
        expect(result.flights.some((f) => f.source.includes('Amadeus'))).toBe(true);
        expect(result.lowestPrice?.price).toBe(920);
    });

    it('uses amadeus as single provider when live_search fails', async () => {
        (globalThis as any).window = { location: { origin: 'http://localhost:5173' } };
        process.env.AMADEUS_CLIENT_ID = 'amadeus-client-id';
        process.env.AMADEUS_CLIENT_SECRET = 'amadeus-client-secret';
        process.env.AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

        vi.stubGlobal('fetch', vi.fn(async (input: any) => {
            const url = String(input);

            if (url.includes('/api/live-search')) {
                return makeJsonResponse({ success: false, error: { message: 'down' } }, 502);
            }

            if (url.includes('/v1/security/oauth2/token')) {
                return makeJsonResponse({ access_token: 'amadeus-token', token_type: 'Bearer', expires_in: 1799 });
            }

            if (url.includes('/v2/shopping/flight-offers')) {
                return makeJsonResponse({
                    data: [
                        {
                            id: '2',
                            price: { currency: 'CNY', grandTotal: '1010.00' },
                            validatingAirlineCodes: ['CA'],
                            itineraries: [
                                {
                                    duration: 'PT2H20M',
                                    segments: [
                                        {
                                            carrierCode: 'CA',
                                            number: '1501',
                                            departure: { iataCode: 'SHA', at: '2026-02-07T09:00:00+08:00' },
                                            arrival: { iataCode: 'PEK', at: '2026-02-07T11:20:00+08:00' },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            }

            return makeJsonResponse({ error: 'unexpected url' }, 404);
        }));

        const result = await searchFlights(params, undefined, {
            requireLiveData: true,
            allowEstimatedFallback: false,
        });

        expect(result.success).toBe(true);
        expect(result.realtime?.verified).toBe(true);
        expect(result.realtime?.provider).toBe('amadeus_flight_offers');
        expect(result.realtime?.coverage_scope).toBe('single_provider');
        expect(result.flights[0].source).toContain('Amadeus');
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchFlights } from '../services/flightSearchService';

function futureDate(daysAhead = 30): string {
    const now = new Date();
    now.setDate(now.getDate() + daysAhead);
    return now.toISOString().slice(0, 10);
}

const departureDate = futureDate();

const params = {
    origin: '上海虹桥',
    destination: '北京首都',
    departureDate,
    travelClass: 'economy' as const,
    departureTimePreference: 'morning' as const,
    timePriorityMode: 'prefer' as const,
};

function jsonResponse(data: any, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(data),
        json: async () => data,
    } as any;
}

describe('flightSearchService multi-source realtime aggregation', () => {
    const originalWindow = (globalThis as any).window;

    afterEach(() => {
        vi.unstubAllGlobals();
        if (typeof originalWindow === 'undefined') {
            delete (globalThis as any).window;
        } else {
            (globalThis as any).window = originalWindow;
        }
    });

    it('aggregates SerpApi + live_search into unified multi-provider results', async () => {
        (globalThis as any).window = { location: { origin: 'http://localhost:5173' } };

        vi.stubGlobal('fetch', vi.fn(async (input: any) => {
            const url = String(input);

            if (url.includes('/api/serpapi/execute')) {
                return jsonResponse({
                    success: true,
                    engine: 'google_flights',
                    raw: {
                        best_flights: [
                            {
                                price: 980,
                                total_duration: 140,
                                travel_class: 'economy',
                                booking_token: 'token_1',
                                flights: [
                                    {
                                        airline: 'China Eastern',
                                        flight_number: 'MU5101',
                                        departure_airport: { id: 'SHA', name: 'Shanghai Hongqiao', time: '08:05' },
                                        arrival_airport: { id: 'PEK', name: 'Beijing Capital', time: '10:25' },
                                    },
                                ],
                            },
                        ],
                        other_flights: [],
                    },
                    normalized: { kind: 'raw', items: [], links: [] },
                    evidence: {
                        provider: 'google_flights',
                        fetched_at: new Date().toISOString(),
                        ttl_seconds: 120,
                        items: [],
                    },
                });
            }

            if (url.includes('/api/live-search')) {
                return jsonResponse({
                    success: true,
                    evidence: {
                        provider: 'google_search_grounding',
                        fetched_at: Date.now(),
                        ttl_seconds: 120,
                        confidence: 0.8,
                        items: [
                            {
                                title: '携程 MU5103 07:30-09:45 ¥880',
                                snippet: '上海虹桥到北京首都 直飞 经济舱',
                                url: `https://flights.ctrip.com/online/list/oneway-sha-bjs?depdate=${departureDate}`,
                                source_name: 'ctrip.com',
                            },
                        ],
                    },
                });
            }

            return jsonResponse({ error: 'unexpected url' }, 404);
        }));

        const result = await searchFlights(params, 'serpapi-key', {
            requireLiveData: true,
            allowEstimatedFallback: false,
        });

        expect(result.success).toBe(true);
        expect(result.realtime?.verified).toBe(true);
        expect(result.realtime?.provider).toBe('multi_aggregated');
        expect(result.realtime?.coverage_scope).toBe('multi_provider');
        expect(result.flights.length).toBeGreaterThan(1);
        expect(result.lowestPrice?.price).toBe(880);
    });

    it('can succeed with live_search grounding only when SerpApi key is absent', async () => {
        (globalThis as any).window = { location: { origin: 'http://localhost:5173' } };

        vi.stubGlobal('fetch', vi.fn(async (input: any) => {
            const url = String(input);
            if (url.includes('/api/live-search')) {
                return jsonResponse({
                    success: true,
                    evidence: {
                        provider: 'google_search_grounding',
                        fetched_at: Date.now(),
                        ttl_seconds: 120,
                        confidence: 0.7,
                        items: [
                            {
                                title: 'Trip.com CA1501 06:50-09:10 ¥930',
                                snippet: '上海虹桥到北京首都 直飞',
                                url: `https://www.trip.com/flights/?dcity=SHA&acity=PEK&ddate=${departureDate}`,
                                source_name: 'trip.com',
                            },
                        ],
                    },
                });
            }
            return jsonResponse({ error: 'unexpected url' }, 404);
        }));

        const result = await searchFlights(params, undefined, {
            requireLiveData: true,
            allowEstimatedFallback: false,
        });

        expect(result.success).toBe(true);
        expect(result.realtime?.verified).toBe(true);
        expect(result.realtime?.provider).toBe('live_search_grounding');
        expect(result.realtime?.coverage_scope).toBe('single_provider');
        expect(result.flights[0].price).toBe(930);
    });
});

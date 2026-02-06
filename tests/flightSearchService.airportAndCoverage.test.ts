import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMockFlightsWithRealLinks, searchFlights } from '../services/flightSearchService';

function makeJsonResponse(payload: any, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
    } as any;
}

describe('flightSearchService airport mapping and comparison coverage', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses airport-level mapping for Shanghai Hongqiao -> Beijing Capital', () => {
        const result = generateMockFlightsWithRealLinks({
            origin: '上海虹桥机场',
            destination: '北京首都机场',
            departureDate: '2026-02-07',
            travelClass: 'economy',
            departureTimePreference: 'morning',
            timePriorityMode: 'prefer',
        });

        expect(result.success).toBe(true);
        expect(result.flights.length).toBeGreaterThan(0);
        expect(result.flights[0].departure.airport).toBe('SHA');
        expect(result.flights[0].arrival.airport).toBe('PEK');
    });

    it('provides multi-platform comparison links for whole-network price check', () => {
        const result = generateMockFlightsWithRealLinks({
            origin: '上海虹桥',
            destination: '北京首都',
            departureDate: '2026-02-07',
            travelClass: 'economy',
        });

        const names = result.comparisonLinks.map((link) => link.name);
        expect(names).toContain('Ctrip');
        expect(names).toContain('Qunar');
        expect(names).toContain('Trip.com');
        expect(names).toContain('Google Flights');
        expect(result.comparisonLinks.length).toBeGreaterThanOrEqual(8);
    });

    it('keeps only requested airports when providers return mixed airport routes', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: any) => {
            const url = String(input);
            if (url.includes('serpapi.com/search.json') || url.includes('/api/serpapi/search.json')) {
                return makeJsonResponse({
                    best_flights: [
                        {
                            price: 680,
                            total_duration: 150,
                            flights: [
                                {
                                    airline: 'MockAir',
                                    flight_number: 'MO100',
                                    departure_airport: { id: 'PVG', name: 'Shanghai Pudong', time: '07:10' },
                                    arrival_airport: { id: 'PKX', name: 'Beijing Daxing', time: '09:40' },
                                },
                            ],
                        },
                        {
                            price: 930,
                            total_duration: 145,
                            flights: [
                                {
                                    airline: 'MockAir',
                                    flight_number: 'MO200',
                                    departure_airport: { id: 'SHA', name: 'Shanghai Hongqiao', time: '08:20' },
                                    arrival_airport: { id: 'PEK', name: 'Beijing Capital', time: '10:45' },
                                },
                            ],
                        },
                    ],
                });
            }
            if (url.includes('/api/live-search')) {
                return makeJsonResponse({ success: false, error: { message: 'down' } }, 503);
            }
            return makeJsonResponse({ error: 'unexpected url' }, 404);
        }));

        const result = await searchFlights({
            origin: '上海虹桥',
            destination: '北京首都',
            departureDate: '2026-02-07',
            travelClass: 'economy',
            departureTimePreference: 'morning',
            timePriorityMode: 'prefer',
        }, 'serpapi-key', {
            requireLiveData: true,
            allowEstimatedFallback: false,
            amadeus: { enabled: false },
        });

        expect(result.success).toBe(true);
        expect(result.flights.length).toBe(1);
        expect(result.flights[0].departure.airport).toBe('SHA');
        expect(result.flights[0].arrival.airport).toBe('PEK');
        expect(result.flights[0].flightNumber).toBe('MO200');
    });

    it('fails closed when no realtime result matches explicit airport constraints', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: any) => {
            const url = String(input);
            if (url.includes('serpapi.com/search.json') || url.includes('/api/serpapi/search.json')) {
                return makeJsonResponse({
                    best_flights: [
                        {
                            price: 680,
                            total_duration: 150,
                            flights: [
                                {
                                    airline: 'MockAir',
                                    flight_number: 'MO100',
                                    departure_airport: { id: 'PVG', name: 'Shanghai Pudong', time: '07:10' },
                                    arrival_airport: { id: 'PKX', name: 'Beijing Daxing', time: '09:40' },
                                },
                            ],
                        },
                    ],
                });
            }
            if (url.includes('/api/live-search')) {
                return makeJsonResponse({ success: false, error: { message: 'down' } }, 503);
            }
            return makeJsonResponse({ error: 'unexpected url' }, 404);
        }));

        const result = await searchFlights({
            origin: '上海虹桥',
            destination: '北京首都',
            departureDate: '2026-02-07',
            travelClass: 'economy',
        }, 'serpapi-key', {
            requireLiveData: true,
            allowEstimatedFallback: false,
            amadeus: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('未获取到可验证的多源实时航班数据');
        expect(result.realtime?.warnings?.join(' ')).toContain('机场约束');
    });
});

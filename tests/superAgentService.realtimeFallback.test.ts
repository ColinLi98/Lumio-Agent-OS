import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAgentService } from '../services/superAgentService';

describe('SuperAgentService realtime fallback', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        const store = new Map<string, string>();
        (globalThis as any).localStorage = {
            getItem: (key: string) => (store.has(key) ? String(store.get(key)) : null),
            setItem: (key: string, value: string) => { store.set(key, String(value)); },
            removeItem: (key: string) => { store.delete(key); },
            clear: () => { store.clear(); },
        };
    });

    afterEach(() => {
        (globalThis as any).fetch = originalFetch;
    });

    it('uses live_search fallback when main model call cannot run', async () => {
        const fetchMock = vi.fn(async (input: any) => {
            const url = String(input);
            if (!url.includes('/api/live-search')) {
                throw new Error(`Unexpected fetch URL: ${url}`);
            }

            return new Response(JSON.stringify({
                success: false,
                error: { code: 'MISSING_CONSTRAINTS', message: 'need more constraints' },
                fallback: {
                    mode: 'constraint_completion',
                    reason: 'need more constraints',
                    missing_constraints: ['出发日期', '舱位偏好（经济/商务）', '乘客人数'],
                },
                action_links: [
                    {
                        title: 'Trip.com - 实时航班',
                        url: 'https://www.trip.com/flights/?dcity=BJS&acity=SHA',
                        provider: 'trip',
                        supports_time_filter: false,
                    },
                ],
                route_decision: {
                    intent_domain: 'travel.flight',
                    needs_live_data: true,
                    reason: 'flight query',
                },
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        });

        (globalThis as any).fetch = fetchMock;

        const service = new SuperAgentService();
        const response = await service.processWithReAct('北京到上海的机票');

        const hasDirectLiveSearch = response.toolsUsed.includes('live_search');
        const hasMarketplaceTravel = response.toolsUsed.some((tool) => tool.includes('flight_booking'));
        expect(hasDirectLiveSearch || hasMarketplaceTravel).toBe(true);
        expect(response.toolResults.length).toBeGreaterThan(0);
        expect(String(response.answer || '').length).toBeGreaterThan(0);
        expect(response.answer).not.toContain('处理您的问题时遇到了困难');
    });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleAgentMarketManualExecute } from '../api/agent-market/[action]';
import { resetAgentMarketplace } from '../services/agentMarketplaceService';

type MockReq = {
    method: string;
    body?: any;
    headers?: Record<string, string>;
};

type MockRes = {
    statusCode: number;
    payload: any;
    headers: Record<string, string>;
    status: (code: number) => MockRes;
    json: (payload: any) => MockRes;
    setHeader: (key: string, value: string) => void;
};

function createMockRes(): MockRes {
    return {
        statusCode: 200,
        payload: undefined,
        headers: {},
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.payload = payload;
            return this;
        },
        setHeader(key: string, value: string) {
            this.headers[key] = value;
        },
    };
}

describe('agent-market manual-execute specialized integration', () => {
    const originalFeeds = process.env.AGENT_MARKET_FEEDS;

    beforeEach(() => {
        resetAgentMarketplace();
        process.env.AGENT_MARKET_FEEDS = '';
    });

    afterEach(() => {
        process.env.AGENT_MARKET_FEEDS = originalFeeds;
    });

    it('executes restaurant + attraction specialized agents with non-empty data', async () => {
        const req: MockReq = {
            method: 'POST',
            body: {
                query: '帮我找上海外滩附近评价高的餐厅和景点',
                selected_agent_ids: ['specialized:restaurant', 'specialized:attraction'],
                domain_hint: 'local_service',
                locale: 'zh-CN',
                max_parallel: 2,
            },
        };
        const res = createMockRes();

        await handleAgentMarketManualExecute(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload?.selected_count).toBe(2);
        expect(Array.isArray(res.payload?.results)).toBe(true);

        const restaurantRow = res.payload.results.find((row: any) => row.agent_id === 'specialized:restaurant');
        expect(restaurantRow?.success).toBe(true);
        expect(Array.isArray(restaurantRow?.data?.data?.restaurants)).toBe(true);
        expect(restaurantRow.data.data.restaurants.length).toBeGreaterThan(0);

        const attractionRow = res.payload.results.find((row: any) => row.agent_id === 'specialized:attraction');
        expect(attractionRow?.success).toBe(true);
        expect(Array.isArray(attractionRow?.data?.data?.attractions)).toBe(true);
        expect(attractionRow.data.data.attractions.length).toBeGreaterThan(0);
    });

    it('ensures weather agent returns clickable action links', async () => {
        const req: MockReq = {
            method: 'POST',
            body: {
                query: '帮我查上海明天的天气',
                selected_agent_ids: ['specialized:weather'],
                domain_hint: 'travel',
                locale: 'zh-CN',
                max_parallel: 1,
            },
        };
        const res = createMockRes();

        await handleAgentMarketManualExecute(req as any, res as any);

        expect(res.statusCode).toBe(200);
        const weatherRow = res.payload?.results?.find((row: any) => row.agent_id === 'specialized:weather');
        expect(weatherRow?.success).toBe(true);
        const actionLinks = Array.isArray(weatherRow?.data?.action_links)
            ? weatherRow.data.action_links
            : [];
        expect(actionLinks.length).toBeGreaterThan(0);
        expect(String(actionLinks[0]?.url || '')).toMatch(/^https?:\/\//);
        expect(String(actionLinks[0]?.url || '')).not.toContain('serpapi.com/search.json');
        expect(String(actionLinks[0]?.url || '')).not.toContain('api_key=');
    });
});

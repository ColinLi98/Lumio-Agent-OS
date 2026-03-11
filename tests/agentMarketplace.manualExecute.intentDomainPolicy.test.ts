import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleAgentMarketManualExecute } from '../api/agent-market/[action]';
import { resetAgentMarketplace } from '../services/agentMarketplaceService';
import { getToolRegistry } from '../services/toolRegistry';

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

describe('agent-market manual-execute intent domain policy', () => {
    const originalFeeds = process.env.AGENT_MARKET_FEEDS;

    beforeEach(() => {
        resetAgentMarketplace();
        process.env.AGENT_MARKET_FEEDS = '';
        const registry = getToolRegistry();
        registry.register({
            name: 'intent_domain_probe',
            description: 'Probe args for manual execute policy tests',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'query' },
                },
                required: ['query'],
            },
            execute: async (args: Record<string, any>) => ({
                success: true,
                captured_intent_domain: args.intent_domain,
                captured_locale: args.locale,
            }),
            marketplace: {
                domains: ['general'],
                capabilities: ['live_search'],
                supports_realtime: true,
                evidence_level: 'strong',
                supports_parallel: true,
                avg_latency_ms: 50,
                success_rate: 1,
                cost_tier: 'low',
            },
        });
    });

    afterEach(() => {
        process.env.AGENT_MARKET_FEEDS = originalFeeds;
    });

    it('does not force travel.flight for broad travel query in manual execute', async () => {
        const req: MockReq = {
            method: 'POST',
            body: {
                query: '去东京旅游',
                selected_agent_ids: ['tool:intent_domain_probe'],
                domain_hint: 'travel',
                locale: 'zh-CN',
                max_parallel: 1,
            },
        };
        const res = createMockRes();

        await handleAgentMarketManualExecute(req as any, res as any);

        expect(res.statusCode).toBe(200);
        const row = res.payload?.results?.find((item: any) => item.agent_id === 'tool:intent_domain_probe');
        expect(row?.success).toBe(true);
        expect(row?.data?.captured_intent_domain).toBe('knowledge');
        expect(row?.data?.captured_intent_domain).not.toBe('travel.flight');
    });

    it('uses shopping hint fallback when classifier stays knowledge', async () => {
        const req: MockReq = {
            method: 'POST',
            body: {
                query: '给我一些选择建议',
                selected_agent_ids: ['tool:intent_domain_probe'],
                domain_hint: 'shopping',
                locale: 'zh-CN',
                max_parallel: 1,
            },
        };
        const res = createMockRes();

        await handleAgentMarketManualExecute(req as any, res as any);

        expect(res.statusCode).toBe(200);
        const row = res.payload?.results?.find((item: any) => item.agent_id === 'tool:intent_domain_probe');
        expect(row?.success).toBe(true);
        expect(row?.data?.captured_intent_domain).toBe('ecommerce.product');
    });
});

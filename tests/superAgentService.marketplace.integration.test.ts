import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAgentService } from '../services/superAgentService';
import { getToolRegistry } from '../services/toolRegistry';
import { getAgentMarketplace, resetAgentMarketplace } from '../services/agentMarketplaceService';
import { buildApiUrl } from '../services/apiBaseUrl';

describe('SuperAgentService Marketplace Integration', () => {
    beforeEach(() => {
        resetAgentMarketplace();

        const registry = getToolRegistry();
        registry.register({
            name: 'market_test_tool',
            description: 'Marketplace integration test tool',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'query' },
                },
                required: ['query'],
            },
            execute: async (args: Record<string, any>) => ({
                success: true,
                answer: `ok:${args.query}`,
                evidence: {
                    provider: 'market_test_tool',
                    fetched_at: Date.now(),
                    ttl_seconds: 120,
                    items: [{ title: 'e1', snippet: 's1', url: 'https://example.com', source_name: 'example.com' }],
                },
            }),
            marketplace: {
                domains: ['travel'],
                capabilities: ['flight_search', 'hotel_search', 'local_transport'],
                supports_realtime: true,
                evidence_level: 'strong',
                supports_parallel: true,
                avg_latency_ms: 100,
                success_rate: 0.99,
                cost_tier: 'low',
            },
        });
    });

    it('pre-routes complex query into marketplace and returns trace/selected_agents/fallback_used', async () => {
        const service = new SuperAgentService();
        const response = await service.processWithReAct('帮我安排机票、酒店和本地交通');

        expect(response.marketplace_trace_id).toMatch(/^plan_/);
        expect(Array.isArray(response.marketplace_selected_agents)).toBe(true);
        expect(response.marketplace_selected_agents!.length).toBeGreaterThan(0);
        expect(typeof response.marketplace_fallback_used).toBe('boolean');
        expect(response.turns).toBe(1);
        expect(response.toolResults.length).toBeGreaterThan(0);
    });

    it('degrades high-risk responses when strong evidence is unavailable', async () => {
        const registry = getToolRegistry();
        registry.register({
            name: 'health_weak_tool',
            description: 'Weak-evidence health helper',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'query' },
                },
                required: ['query'],
            },
            execute: async (args: Record<string, any>) => ({
                success: true,
                answer: `health:${args.query}`,
                evidence: {
                    provider: 'health_weak_tool',
                    fetched_at: Date.now(),
                    ttl_seconds: 120,
                    items: [{ title: 'h1', snippet: 's1', url: 'https://example.com/health', source_name: 'example.com' }],
                },
            }),
            marketplace: {
                domains: ['health'],
                capabilities: ['health_consult'],
                supports_realtime: false,
                evidence_level: 'weak',
                supports_parallel: true,
                avg_latency_ms: 120,
                success_rate: 0.98,
                cost_tier: 'low',
            },
        });

        const service = new SuperAgentService();
        const response = await service.processWithReAct('我最近有症状，帮我做健康咨询并给最新建议');

        expect(response.marketplace_trace_id).toMatch(/^plan_/);
        expect(response.answer).toContain('高风险领域且缺少强证据链');
        expect(response.answer).toContain('约束补全模式');
    });

    it('executes external marketplace agents via HTTP adapter', async () => {
        const marketplace = getAgentMarketplace();
        marketplace.registerAgent({
            id: 'external:recruitment_hub',
            name: 'Recruitment Hub',
            source: 'external_market',
            domains: ['recruitment'],
            capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
            supports_realtime: false,
            evidence_level: 'strong',
            supports_parallel: true,
            avg_latency_ms: 800,
            success_rate: 0.99,
            cost_tier: 'low',
            compliance_tags: ['external_feed', 'external_admitted', 'evidence_rate:0.99'],
            metrics_source: 'external',
            metrics_sample_size: 120,
            execute_ref: 'https://external.example.com/agents/recruitment',
        });

        const originalFetch = globalThis.fetch;
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            success: true,
            data: { recommendations: ['岗位A', '岗位B'] },
            evidence: [
                {
                    source: 'external_recruitment_hub',
                    url: 'https://external.example.com/evidence/1',
                    fetched_at: new Date().toISOString(),
                },
            ],
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        }));

        (globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
        try {
            const service = new SuperAgentService();
            const response = await service.processWithReAct('帮我做招聘：找岗位、优化简历、对比薪资');

            expect(fetchMock).toHaveBeenCalled();
            const calledUrls = fetchMock.mock.calls.map(call => String(call[0]));
            expect(calledUrls).toContain(buildApiUrl('/api/agent-market/execute'));
            const proxyCall = fetchMock.mock.calls.find(call => String(call[0]) === buildApiUrl('/api/agent-market/execute'));
            expect(proxyCall).toBeTruthy();
            const proxyBodyRaw = proxyCall?.[1] && typeof proxyCall[1] === 'object'
                ? (proxyCall[1] as RequestInit).body
                : undefined;
            const proxyBody = typeof proxyBodyRaw === 'string' ? JSON.parse(proxyBodyRaw) : {};
            expect(proxyBody.target_url).toBe('https://external.example.com/agents/recruitment');
            expect(response.marketplace_trace_id).toMatch(/^plan_/);
            expect(response.toolsUsed).toContain('external:recruitment_hub');
            expect(response.toolResults.length).toBeGreaterThan(0);
            expect(response.toolResults.some(r => r.success)).toBe(true);
        } finally {
            (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
        }
    });
});

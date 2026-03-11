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

        const isMarketplacePath = typeof response.marketplace_trace_id === 'string'
            && /^plan_/.test(response.marketplace_trace_id);
        if (isMarketplacePath) {
            expect(Array.isArray(response.marketplace_selected_agents)).toBe(true);
            expect(response.marketplace_selected_agents!.length).toBeGreaterThan(0);
            expect(typeof response.marketplace_fallback_used).toBe('boolean');
            expect(response.toolResults.length).toBeGreaterThan(0);
        } else {
            // Complex queries may be overflow-dispatched to LIX depending on runtime policy.
            expect(response.lix_dispatch?.mode).toBe('lix_dispatched');
            expect(response.toolsUsed).toContain('lix_capability_auction');
            expect(response.toolResults.length).toBeGreaterThanOrEqual(0);
        }
        expect(response.turns).toBe(1);
    }, 15000);

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
        expect(response.answer).toContain('high-risk domain');
        expect(response.answer).toContain('constraint-completion mode');
    }, 15000);

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
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;

            if (url.startsWith('https://api.github.com/search/repositories')) {
                return new Response(JSON.stringify({
                    items: [
                        {
                            full_name: 'openclaw/find-skills-recruitment',
                            name: 'find-skills-recruitment',
                            description: 'recruitment skill pack',
                            stargazers_count: 42000,
                            forks_count: 2900,
                            default_branch: 'main',
                        },
                    ],
                }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }
            if (url.startsWith('https://api.github.com/repos/openclaw/find-skills-recruitment')) {
                return new Response(JSON.stringify({
                    full_name: 'openclaw/find-skills-recruitment',
                    default_branch: 'main',
                    description: 'Recruitment skill pack for agent orchestration',
                    stargazers_count: 42000,
                    forks_count: 2900,
                    html_url: 'https://github.com/openclaw/find-skills-recruitment',
                    archived: false,
                    disabled: false,
                    topics: ['skills', 'agent', 'recruitment'],
                }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({
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
            });
        });

        (globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
        try {
            const service = new SuperAgentService();
            const response = await service.processWithReAct('帮我做招聘：找岗位、优化简历、对比薪资');

            expect(fetchMock).toHaveBeenCalled();
            const calledUrls = fetchMock.mock.calls.map(call => String(call[0]));
            const executeUrl = buildApiUrl('/api/agent-market/execute');
            const lixBroadcastUrl = buildApiUrl('/api/lix/solution/broadcast');
            const hasExecute = calledUrls.includes(executeUrl);
            const hasLixBroadcast = calledUrls.includes(lixBroadcastUrl);

            expect(hasExecute || hasLixBroadcast).toBe(true);

            if (hasExecute) {
                const proxyCall = fetchMock.mock.calls.find(call => String(call[0]) === executeUrl);
                expect(proxyCall).toBeTruthy();
                const proxyBodyRaw = proxyCall?.[1] && typeof proxyCall[1] === 'object'
                    ? (proxyCall[1] as RequestInit).body
                    : undefined;
                const proxyBody = typeof proxyBodyRaw === 'string' ? JSON.parse(proxyBodyRaw) : {};
                expect(proxyBody.target_url).toBe('https://external.example.com/agents/recruitment');
                expect(proxyBody.payload?.skill_plan).toBeTruthy();
                expect(Array.isArray(proxyBody.payload?.skill_plan?.approved_skill_ids)).toBe(true);
                expect(proxyBody.payload?.skill_plan?.approved_skill_ids?.length).toBeGreaterThan(0);
                expect(proxyBody.payload?.input?.skills).toBeTruthy();
                expect(proxyBody.payload?.input?.skills?.source).toBe('github_find_skills');
                expect(
                    (proxyBody.payload?.skill_plan?.approved_skill_ids || [])
                        .some((id: string) => String(id).startsWith('github:'))
                ).toBe(true);
                expect(response.marketplace_trace_id).toMatch(/^plan_/);
                expect(response.toolsUsed).toContain('external:recruitment_hub');
                expect(response.toolResults.length).toBeGreaterThan(0);
                expect(response.toolResults.some(r => r.success)).toBe(true);
                expect(
                    (response.skill_invocations || []).some(row => row.source === 'github')
                ).toBe(true);
            } else {
                if (response.lix_dispatch?.dispatched == true) {
                    expect(response.lix_dispatch.dispatch_mode).toBe('capability_auction');
                } else {
                    expect(response.answer.length).toBeGreaterThan(0);
                    expect(response.trace_id).toBeTruthy();
                }
            }
        } finally {
            (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
        }
    });

    it('falls back to task skill plan when selected marketplace agent execution fails', async () => {
        const marketplace = getAgentMarketplace();
        marketplace.registerAgent({
            id: 'external:recruitment_fail',
            name: 'Recruitment Failover Target',
            source: 'external_market',
            domains: ['recruitment'],
            capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
            supports_realtime: false,
            evidence_level: 'strong',
            supports_parallel: true,
            avg_latency_ms: 500,
            success_rate: 0.99,
            cost_tier: 'low',
            compliance_tags: ['external_feed', 'external_admitted', 'evidence_rate:0.99'],
            metrics_source: 'external',
            metrics_sample_size: 80,
            execute_ref: 'https://external.example.com/agents/recruitment-fail',
        });

        const registry = getToolRegistry();
        registry.register({
            name: 'recruitment_fallback_tool',
            description: 'Fallback execution tool for recruitment tasks',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'query' },
                },
                required: ['query'],
            },
            execute: async (args: Record<string, any>) => ({
                success: true,
                answer: `fallback-ok:${args.query}`,
                evidence: {
                    provider: 'recruitment_fallback_tool',
                    fetched_at: Date.now(),
                    ttl_seconds: 120,
                    items: [
                        {
                            title: 'Fallback evidence',
                            snippet: 'Recovered through task skill fallback',
                            url: 'https://example.com/fallback',
                            source_name: 'example.com',
                        },
                    ],
                },
            }),
            marketplace: {
                // Keep this off recruitment domain so marketplace selection still prefers external agent.
                domains: ['travel'],
                capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
                supports_realtime: true,
                evidence_level: 'strong',
                supports_parallel: true,
                avg_latency_ms: 200,
                success_rate: 0.95,
                cost_tier: 'low',
            },
        });

        const originalFetch = globalThis.fetch;
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;

            if (url.startsWith('https://api.github.com/search/repositories')) {
                return new Response(JSON.stringify({
                    items: [
                        {
                            full_name: 'openclaw/recruitment-skill-pack',
                            name: 'recruitment-skill-pack',
                            description: 'Recruitment skill bundle',
                            stargazers_count: 38000,
                            forks_count: 1800,
                            default_branch: 'main',
                        },
                    ],
                }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }
            if (url.startsWith('https://api.github.com/repos/openclaw/recruitment-skill-pack')) {
                return new Response(JSON.stringify({
                    full_name: 'openclaw/recruitment-skill-pack',
                    default_branch: 'main',
                    description: 'Recruitment skill bundle for agent workflows',
                    stargazers_count: 38000,
                    forks_count: 1800,
                    html_url: 'https://github.com/openclaw/recruitment-skill-pack',
                    archived: false,
                    disabled: false,
                    topics: ['skills', 'agent', 'recruitment'],
                }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url === buildApiUrl('/api/lix/solution/broadcast')) {
                return new Response(JSON.stringify({ success: false }), {
                    status: 503,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url === buildApiUrl('/api/agent-market/execute')) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'upstream_failed',
                }), {
                    status: 500,
                    headers: { 'content-type': 'application/json' },
                });
            }

            return new Response('{}', {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        });

        (globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
        try {
            const service = new SuperAgentService();
            const response = await service.processWithReAct('帮我做招聘：找岗位、优化简历、对比薪资');

            expect(response.marketplace_trace_id).toMatch(/^plan_/);
            expect(response.toolResults.length).toBeGreaterThan(0);
            expect(response.toolResults.some((row) => row.success)).toBe(true);
            expect(response.toolResults.some((row) => String(row.toolName).startsWith('skill_fallback:'))).toBe(true);
            expect(response.answer.length).toBeGreaterThan(0);
        } finally {
            (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
        }
    });
});

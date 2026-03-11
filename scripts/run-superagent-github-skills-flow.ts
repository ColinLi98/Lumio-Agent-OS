/**
 * End-to-end runnable example:
 * Chat requirement -> SuperAgent routing/decomposition -> GitHub sub-agent match
 * -> skills allocation -> execution result.
 *
 * This script is deterministic and runnable in restricted environments by
 * mocking GitHub Search and external agent execute endpoint.
 */

import { SuperAgentService } from '../services/superAgentService.js';
import { importAgentFromGithub } from '../services/agentGithubImportService.js';
import { resetAgentMarketplace } from '../services/agentMarketplaceService.js';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService.js';
import { resetSkillsDiscoveryAdapter } from '../services/skillsDiscoveryAdapter.js';

type LocalStorageLike = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};

function ensureLocalStorageForNode(): void {
    if (typeof (globalThis as any).localStorage !== 'undefined') return;
    const store = new Map<string, string>();
    const localStorageLike: LocalStorageLike = {
        getItem: (key: string) => (store.has(key) ? String(store.get(key)) : null),
        setItem: (key: string, value: string) => {
            store.set(key, String(value));
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
    (globalThis as any).localStorage = localStorageLike;
}

function assert(condition: unknown, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

function jsonResponse(payload: any, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

async function main(): Promise<void> {
    ensureLocalStorageForNode();

    // Keep this example isolated from external feed side effects.
    process.env.AGENT_MARKET_FEEDS = '';
    process.env.LUMI_API_BASE_URL = process.env.LUMI_API_BASE_URL || 'http://127.0.0.1:3000';
    process.env.AGENT_MARKET_EXECUTOR_USE_PROXY = 'false';

    lixAgentRegistryService.clear();
    resetAgentMarketplace();
    resetSkillsDiscoveryAdapter();

    const imported = await importAgentFromGithub({
        user_id: 'demo_user',
        owner_id: 'demo_user',
        repo: 'openclaw/recruitment-subagent',
        manifest_json: {
            name: 'Recruitment Co-Pilot',
            description: 'Recruiting sub-agent for sourcing, resume optimization and salary benchmark.',
            domains: ['recruitment'],
            capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
            execute_ref: 'https://agents.example.com/recruitment/execute',
            supports_realtime: true,
            evidence_level: 'strong',
            supports_parallel: true,
            cost_tier: 'mid',
            avg_latency_ms: 900,
            success_rate: 0.99,
            market_visibility: 'public',
            pricing_model: 'pay_per_use',
            price_per_use_cny: 12,
        },
    });

    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : (input as Request).url;

        if (url.startsWith('https://api.github.com/search/repositories')) {
            return jsonResponse({
                total_count: 2,
                items: [
                    {
                        full_name: 'openclaw/find-skills-recruitment',
                        name: 'find-skills-recruitment',
                        description: 'Skill pack for recruiting workflow and resume optimization',
                        stargazers_count: 48600,
                        forks_count: 3200,
                        default_branch: 'main',
                    },
                    {
                        full_name: 'openclaw/salary-skill-kit',
                        name: 'salary-skill-kit',
                        description: 'salary benchmark and compensation analytics skills',
                        stargazers_count: 11800,
                        forks_count: 1700,
                        default_branch: 'main',
                    },
                ],
            });
        }

        if (url === 'https://agents.example.com/recruitment/execute') {
            const body = init?.body ? JSON.parse(String(init.body)) : {};
            return jsonResponse({
                success: true,
                data: {
                    matched_jobs: [
                        { title: 'Senior Backend Engineer', city: 'Shanghai', salary: '55k-75k' },
                        { title: 'Platform Engineer', city: 'Beijing', salary: '50k-70k' },
                    ],
                    resume_improvements: [
                        '突出分布式系统与高并发经验',
                        '增加可量化的业务结果指标',
                    ],
                    salary_benchmark: {
                        p50: '58k',
                        p75: '66k',
                    },
                    request_echo: body?.input?.query || '',
                    delegated_skills: body?.input?.skills || null,
                    skill_plan: body?.skill_plan || null,
                },
                evidence: {
                    items: [
                        { source_name: 'lagou', url: 'https://www.lagou.com' },
                        { source_name: 'boss-zhipin', url: 'https://www.zhipin.com' },
                    ],
                    fetched_at: new Date().toISOString(),
                },
            });
        }

        return originalFetch(input as any, init);
    };

    try {
        const service = new SuperAgentService();
        const query = '请并行协作完成招聘需求：搜索后端岗位、优化简历、并做薪资对比';
        const response = await service.processWithReAct(query, {
            userId: 'demo_user',
            currentApp: 'com.tencent.mm',
        });

        const githubSkillCount = (response.skill_invocations || []).filter(
            (row) => row.source === 'github'
        ).length;
        const selectedAgents = response.marketplace_selected_agents || [];

        assert(response.routing_decision?.mode === 'multi_agent', 'routing mode is not multi_agent');
        assert((response.task_graph?.tasks?.length || 0) >= 3, 'task decomposition did not produce >=3 tasks');
        assert(
            selectedAgents.some((row) => row.agent_id === imported.descriptor.id),
            `github imported sub-agent not selected: ${imported.descriptor.id}`
        );
        assert(githubSkillCount >= 1, 'github skills were not allocated');
        const delegatedSkills = response.toolResults
            .map((row) => row.output?.delegated_skills)
            .find(Boolean);
        assert(Boolean(delegatedSkills), 'delegated skills were not passed into sub-agent payload');

        const output = {
            query,
            imported_sub_agent: {
                id: imported.descriptor.id,
                repo: imported.repo,
                execute_ref: imported.descriptor.execute_ref,
            },
            trace_id: response.trace_id,
            routing_decision: response.routing_decision,
            reasoning_protocol: response.reasoning_protocol
                ? {
                    mode: response.reasoning_protocol.mode,
                    methods_applied: response.reasoning_protocol.methods_applied,
                    root_problem: response.reasoning_protocol.root_problem,
                    recommended_strategy: response.reasoning_protocol.recommended_strategy,
                    premortem_top_risks: (response.reasoning_protocol.artifacts.premortem || [])
                        .slice(0, 3)
                        .map((item) => item.reason),
                }
                : null,
            task_graph: response.task_graph,
            selected_agents: selectedAgents,
            skill_invocations: response.skill_invocations,
            evidence_count: response.evidence?.length || 0,
            delegated_skills_preview: delegatedSkills,
            answer_preview: String(response.answer || '').slice(0, 320),
        };

        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
    } finally {
        globalThis.fetch = originalFetch;
    }
}

main().catch((error) => {
    console.error('[run-superagent-github-skills-flow] failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});

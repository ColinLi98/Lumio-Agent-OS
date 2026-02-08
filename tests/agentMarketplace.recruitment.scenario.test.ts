import { beforeEach, describe, expect, it } from 'vitest';
import { AgentMarketplaceService, resetAgentMarketplace } from '../services/agentMarketplaceService';
import type { AgentDescriptor, AgentExecutionResult, MarketplaceTask } from '../services/agentMarketplaceTypes';

function recruitmentAgent(id: string, capability: string): AgentDescriptor {
    return {
        id,
        name: id,
        source: 'specialized',
        domains: ['recruitment'],
        capabilities: [capability],
        supports_realtime: false,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 1500,
        success_rate: 0.96,
        cost_tier: 'low',
        execute_ref: id,
    };
}

describe('Agent Marketplace Recruitment Scenario', () => {
    let marketplace: AgentMarketplaceService;

    beforeEach(() => {
        resetAgentMarketplace();
        marketplace = new AgentMarketplaceService();
        marketplace.registerAgents([
            recruitmentAgent('job_agent', 'job_sourcing'),
            recruitmentAgent('resume_agent', 'resume_optimization'),
            recruitmentAgent('salary_agent', 'salary_benchmark'),
        ]);
    });

    it('runs job_sourcing + resume_optimization + salary_benchmark in parallel with trace metadata', async () => {
        const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => ({
            task_id: task.id,
            agent_id: agentId,
            success: true,
            data: { agentId, objective: task.objective },
            evidence: [{ source: agentId, url: `https://example.com/${agentId}` }],
            latency_ms: 30,
        });

        const { plan, summary } = await marketplace.runFullPipeline(
            '帮我做招聘：职位搜寻、简历优化和薪资分析',
            executor,
            'recruitment',
        );

        const caps = plan.tasks.flatMap(t => t.required_capabilities);
        expect(caps).toContain('job_sourcing');
        expect(caps).toContain('resume_optimization');
        expect(caps).toContain('salary_benchmark');
        expect(plan.tasks.every(t => t.parallelizable)).toBe(true);

        expect(summary.trace_id).toBe(plan.trace_id);
        expect(summary.selected_agents.length).toBe(3);
        expect(summary.fallback_used).toHaveLength(0);
    });
});


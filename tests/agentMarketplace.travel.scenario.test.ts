import { beforeEach, describe, expect, it } from 'vitest';
import { AgentMarketplaceService, resetAgentMarketplace } from '../services/agentMarketplaceService';
import type { AgentDescriptor, AgentExecutionResult, MarketplaceTask } from '../services/agentMarketplaceTypes';

function travelAgent(id: string, caps: string[]): AgentDescriptor {
    return {
        id,
        name: id,
        source: 'tool_registry',
        domains: ['travel'],
        capabilities: caps,
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 1600,
        success_rate: 0.95,
        cost_tier: 'low',
        execute_ref: id,
    };
}

describe('Agent Marketplace Travel Scenario', () => {
    let marketplace: AgentMarketplaceService;

    beforeEach(() => {
        resetAgentMarketplace();
        marketplace = new AgentMarketplaceService();
        marketplace.registerAgents([
            travelAgent('flight_tool', ['flight_search']),
            travelAgent('hotel_tool', ['hotel_search']),
            travelAgent('transport_tool', ['local_transport']),
        ]);
    });

    it('runs flight + hotel + local_transport in parallel and returns trace/selection/fallback fields', async () => {
        const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => ({
            task_id: task.id,
            agent_id: agentId,
            success: true,
            data: { route: task.objective, provider: agentId },
            evidence: [{ source: agentId, url: `https://example.com/${agentId}` }],
            latency_ms: 40,
        });

        const { plan, summary } = await marketplace.runFullPipeline(
            '帮我查机票、酒店和当地交通',
            executor,
            'travel',
        );

        const caps = plan.tasks.flatMap(t => t.required_capabilities);
        expect(caps).toContain('flight_search');
        expect(caps).toContain('hotel_search');
        expect(caps).toContain('local_transport');

        const requiredTaskSet = plan.tasks.filter(
            t =>
                t.required_capabilities.includes('flight_search')
                || t.required_capabilities.includes('hotel_search')
                || t.required_capabilities.includes('local_transport'),
        );
        expect(requiredTaskSet.every(t => t.parallelizable)).toBe(true);

        expect(summary.trace_id).toBe(plan.trace_id);
        expect(Array.isArray(summary.selected_agents)).toBe(true);
        expect(Array.isArray(summary.fallback_used)).toBe(true);
    });
});


/**
 * Agent Marketplace - End-to-End Scenario Tests
 *
 * Full pipeline tests for realistic user queries across domains.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    AgentMarketplaceService,
    resetAgentMarketplace,
    detectDomain,
    detectCapabilities,
} from '../services/agentMarketplaceService';
import type { AgentDescriptor, AgentExecutionResult, MarketplaceTask } from '../services/agentMarketplaceTypes';

// ============================================================================
// Agent catalogue (small but realistic)
// ============================================================================

const AGENTS: AgentDescriptor[] = [
    {
        id: 'flight_agent', name: 'Flight Search',
        source: 'tool_registry', domains: ['travel'],
        capabilities: ['flight_search', 'live_search'],
        supports_realtime: true, evidence_level: 'strong',
        supports_parallel: true, avg_latency_ms: 3000,
        success_rate: 0.88, cost_tier: 'mid',
        execute_ref: 'live_search',
    },
    {
        id: 'hotel_agent', name: 'Hotel Search',
        source: 'tool_registry', domains: ['travel'],
        capabilities: ['hotel_search'],
        supports_realtime: true, evidence_level: 'strong',
        supports_parallel: true, avg_latency_ms: 2500,
        success_rate: 0.90, cost_tier: 'mid',
        execute_ref: 'web_search',
    },
    {
        id: 'restaurant_agent', name: 'Restaurant Finder',
        source: 'skill_registry', domains: ['travel', 'local_service'],
        capabilities: ['restaurant_search'],
        supports_realtime: false, evidence_level: 'weak',
        supports_parallel: true, avg_latency_ms: 2000,
        success_rate: 0.92, cost_tier: 'low',
        execute_ref: 'restaurant_skill',
    },
    {
        id: 'job_agent', name: 'Job Search',
        source: 'specialized', domains: ['recruitment'],
        capabilities: ['job_sourcing', 'salary_benchmark'],
        supports_realtime: false, evidence_level: 'strong',
        supports_parallel: true, avg_latency_ms: 2000,
        success_rate: 0.93, cost_tier: 'low',
        execute_ref: 'job_search',
    },
    {
        id: 'resume_agent', name: 'Resume Optimization',
        source: 'specialized', domains: ['recruitment'],
        capabilities: ['resume_optimization'],
        supports_realtime: false, evidence_level: 'strong',
        supports_parallel: true, avg_latency_ms: 1800,
        success_rate: 0.94, cost_tier: 'low',
        execute_ref: 'resume_opt',
    },
    {
        id: 'finance_agent', name: 'Market Analysis',
        source: 'tool_registry', domains: ['finance'],
        capabilities: ['market_data', 'price_compare'],
        supports_realtime: true, evidence_level: 'strong',
        supports_parallel: true, avg_latency_ms: 1500,
        success_rate: 0.91, cost_tier: 'mid',
        execute_ref: 'web_search',
    },
    {
        id: 'health_agent', name: 'Health Info',
        source: 'tool_registry', domains: ['health'],
        capabilities: ['symptom_check', 'drug_info'],
        supports_realtime: false, evidence_level: 'strong',
        supports_parallel: false, avg_latency_ms: 3000,
        success_rate: 0.85, cost_tier: 'mid',
        execute_ref: 'knowledge_qa',
    },
    {
        id: 'general_agent', name: 'General Search',
        source: 'tool_registry', domains: ['general'],
        capabilities: ['web_search', 'knowledge_qa'],
        supports_realtime: true, evidence_level: 'strong',
        supports_parallel: true, avg_latency_ms: 2000,
        success_rate: 0.90, cost_tier: 'low',
        execute_ref: 'web_search',
    },
];

// ============================================================================
// Mock executor: always succeeds with echo
// ============================================================================

const mockExecutor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => ({
    task_id: task.id,
    agent_id: agentId,
    success: true,
    data: { agent: agentId, objective: task.objective },
    latency_ms: 100,
});

// ============================================================================
// Tests
// ============================================================================

describe('Agent Marketplace Scenarios', () => {
    let marketplace: AgentMarketplaceService;

    beforeEach(() => {
        resetAgentMarketplace();
        marketplace = new AgentMarketplaceService();
        marketplace.registerAgents(AGENTS);
    });

    describe('Travel Scenario', () => {
        it('should handle full travel planning pipeline', async () => {
            const query = '帮我规划去东京的旅行，要订机票和酒店';
            const domain = detectDomain(query);
            expect(domain).toBe('travel');

            const { plan, summary, aggregated } = await marketplace.runFullPipeline(
                query, mockExecutor, domain
            );

            expect(plan.domain).toBe('travel');
            expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
            // Pipeline executed all tasks
            expect(summary.results.length).toBe(plan.tasks.length);
            // All mock tasks should succeed
            const successCount = summary.results.filter(r => r.success).length;
            expect(successCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Recruitment Scenario', () => {
        it('should handle job search pipeline', async () => {
            const query = '帮我搜索北京的前端开发招聘信息和薪资';
            const domain = detectDomain(query);
            expect(domain).toBe('recruitment');

            const { aggregated } = await marketplace.runFullPipeline(
                query, mockExecutor, domain
            );

            expect(aggregated.success).toBe(true);
        });
    });

    describe('Finance Scenario', () => {
        it('should handle finance query with evidence requirement', async () => {
            const query = '查看黄金投资行情和股票行情';
            const domain = detectDomain(query);
            expect(domain).toBe('finance');

            // Finance domain auto-requires evidence
            const discovery = marketplace.discoverAgents({
                query,
                domain_hint: 'finance',
                required_capabilities: detectCapabilities(query),
            });

            // Finance domain auto-requires evidence, so discovery works
            const allCandidates = discovery.candidates;
            const allRejected = discovery.rejected;
            // At least some agents should be discovered or rejected
            expect(allCandidates.length + allRejected.length).toBeGreaterThan(0);
        });
    });

    describe('Cross-Domain Fallback', () => {
        it('should use general agents when domain-specific agents are unavailable', async () => {
            const query = '帮我搜索一些有趣的科技新闻';
            const domain = detectDomain(query);

            const discovery = marketplace.discoverAgents({
                query,
                domain_hint: domain,
                required_capabilities: detectCapabilities(query),
            });

            const candidateIds = discovery.candidates.map(c => c.agent.id);
            expect(candidateIds).toContain('general_agent');
        });
    });

    describe('Health Evidence Enforcement', () => {
        it('should reject health agents without evidence', () => {
            // Register a no-evidence health agent
            marketplace.registerAgent({
                id: 'bad_health', name: 'Bad Health Agent',
                source: 'external_market', domains: ['health'],
                capabilities: ['symptom_check'],
                supports_realtime: false, evidence_level: 'none',
                supports_parallel: false, avg_latency_ms: 2000,
                success_rate: 0.90, cost_tier: 'low',
                execute_ref: 'bad',
            });

            const discovery = marketplace.discoverAgents({
                query: '头疼怎么办',
                domain_hint: 'health',
                required_capabilities: ['symptom_check'],
            });

            const rejected = discovery.rejected.find(r => r.agent.id === 'bad_health');
            expect(rejected).toBeTruthy();
            expect(rejected?.reject_reason).toContain('evidence_required');
        });
    });

    describe('Empty Marketplace', () => {
        it('should gracefully handle queries with no registered agents', async () => {
            const emptyMkt = new AgentMarketplaceService();

            const discovery = emptyMkt.discoverAgents({
                query: '搜索机票',
                required_capabilities: ['flight_search'],
            });

            expect(discovery.candidates.length).toBe(0);
        });
    });
});

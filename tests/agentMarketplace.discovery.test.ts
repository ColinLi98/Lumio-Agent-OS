/**
 * Agent Marketplace - Discovery Tests
 *
 * Verifies discovery from all 4 sources, domain filtering, capability matching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    AgentMarketplaceService,
    decomposeTasks,
    detectDomain,
    detectCapabilities,
    ensureMarketplaceCatalogReady,
    resetAgentMarketplace,
} from '../services/agentMarketplaceService';
import type { AgentDescriptor } from '../services/agentMarketplaceTypes';

// ============================================================================
// Test Fixtures
// ============================================================================

function flightAgent(): AgentDescriptor {
    return {
        id: 'agent_flight',
        name: 'Flight Search Agent',
        source: 'tool_registry',
        domains: ['travel'],
        capabilities: ['flight_search', 'live_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 4000,
        success_rate: 0.85,
        cost_tier: 'mid',
        execute_ref: 'live_search',
    };
}

function hotelAgent(): AgentDescriptor {
    return {
        id: 'agent_hotel',
        name: 'Hotel Search Agent',
        source: 'skill_registry',
        domains: ['travel'],
        capabilities: ['hotel_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 3000,
        success_rate: 0.90,
        cost_tier: 'mid',
        execute_ref: 'hotel_skill',
    };
}

function jobAgent(): AgentDescriptor {
    return {
        id: 'agent_jobs',
        name: 'Job Sourcing Agent',
        source: 'specialized',
        domains: ['recruitment'],
        capabilities: ['job_sourcing', 'salary_benchmark'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        avg_latency_ms: 2000,
        success_rate: 0.92,
        cost_tier: 'low',
        execute_ref: 'job_search',
    };
}

function generalAgent(): AgentDescriptor {
    return {
        id: 'agent_general',
        name: 'General Search',
        source: 'tool_registry',
        domains: ['general'],
        capabilities: ['web_search', 'knowledge_qa'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 2000,
        success_rate: 0.90,
        cost_tier: 'low',
        execute_ref: 'web_search',
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('Agent Marketplace Discovery', () => {
    let marketplace: AgentMarketplaceService;

    beforeEach(() => {
        resetAgentMarketplace();
        marketplace = new AgentMarketplaceService();
        marketplace.registerAgents([flightAgent(), hotelAgent(), jobAgent(), generalAgent()]);
    });

    describe('Domain Detection', () => {
        it('should detect travel domain', () => {
            expect(detectDomain('帮我订去东京的机票')).toBe('travel');
        });

        it('should detect recruitment domain', () => {
            expect(detectDomain('帮我找前端开发的招聘信息')).toBe('recruitment');
        });

        it('should detect finance domain', () => {
            expect(detectDomain('查一下黄金的投资行情')).toBe('finance');
        });

        it('should detect shopping domain', () => {
            expect(detectDomain('帮我买一个iPhone')).toBe('shopping');
        });

        it('should detect productivity domain', () => {
            expect(detectDomain('帮我规划下周项目排期和待办优先级')).toBe('productivity');
        });

        it('should fall back to general', () => {
            expect(detectDomain('abc xyz')).toBe('general');
        });
    });

    describe('Capability Detection', () => {
        it('should detect flight-related capabilities', () => {
            const caps = detectCapabilities('查机票价格');
            expect(caps).toContain('flight_search');
            expect(caps).toContain('price_compare');
        });

        it('should detect recruitment capabilities', () => {
            const caps = detectCapabilities('搜索招聘职位和薪资');
            expect(caps).toContain('job_sourcing');
            expect(caps).toContain('salary_benchmark');
        });

        it('should fall back to general for unknown queries', () => {
            const caps = detectCapabilities('abc xyz 123');
            expect(caps).toEqual(['general']);
        });

        it('should detect productivity capabilities', () => {
            const caps = detectCapabilities('请帮我做项目任务拆解和日程安排提醒');
            expect(caps).toContain('task_planning');
            expect(caps).toContain('time_blocking');
        });
    });

    describe('Task Decomposition', () => {
        it('should build multi-step tasks for productivity domain', () => {
            const tasks = decomposeTasks('帮我做项目排期和提醒', 'productivity');
            expect(tasks.length).toBeGreaterThanOrEqual(3);
            expect(tasks.some((task) => task.required_capabilities.includes('task_planning'))).toBe(true);
            expect(tasks.some((task) => task.required_capabilities.includes('time_blocking'))).toBe(true);
            expect(tasks.some((task) => task.required_capabilities.includes('reminder_management'))).toBe(true);
        });
    });

    describe('Discovery', () => {
        it('should discover travel agents for flight query', () => {
            const response = marketplace.discoverAgents({
                query: '北京到上海的机票',
                domain_hint: 'travel',
                required_capabilities: ['flight_search'],
            });

            expect(response.candidates.length).toBeGreaterThan(0);
            expect(response.candidates[0].agent.id).toBe('agent_flight');
            expect(response.trace_id).toMatch(/^mkt_/);
        });

        it('should reject agents with wrong domain', () => {
            const response = marketplace.discoverAgents({
                query: '搜索职位',
                domain_hint: 'travel',
                required_capabilities: ['job_sourcing'],
            });

            // Job agent should be rejected (domain mismatch)
            const rejectedIds = response.rejected.map(r => r.agent.id);
            expect(rejectedIds).toContain('agent_jobs');
        });

        it('should include general-domain agents when capabilities match', () => {
            const response = marketplace.discoverAgents({
                query: '搜索信息',
                domain_hint: 'travel',
                required_capabilities: ['web_search'],  // general agent has this
            });

            const candidateIds = response.candidates.map(c => c.agent.id);
            expect(candidateIds).toContain('agent_general');
        });

        it('should respect max_candidates limit', () => {
            const response = marketplace.discoverAgents({
                query: '搜索',
                required_capabilities: [],
                max_candidates: 2,
            });

            expect(response.candidates.length).toBeLessThanOrEqual(2);
        });

        it('should produce score_breakdown for all agents', () => {
            const response = marketplace.discoverAgents({
                query: '机票',
                required_capabilities: ['flight_search'],
            });

            expect(response.score_breakdown.length).toBe(4);
            for (const sb of response.score_breakdown) {
                expect(sb.total_score).toBeGreaterThanOrEqual(0);
                expect(sb.total_score).toBeLessThanOrEqual(1);
            }
        });
    });

    describe('Registration', () => {
        it('should deduplicate agents by id', () => {
            marketplace.registerAgent({ ...flightAgent(), name: 'Updated Flight Agent' });
            const agents = marketplace.getRegisteredAgents();
            const flights = agents.filter(a => a.id === 'agent_flight');
            expect(flights.length).toBe(1);
            expect(flights[0].name).toBe('Updated Flight Agent');
        });
    });
});

describe('Agent Marketplace Built-in Specialized Catalog', () => {
    beforeEach(() => {
        resetAgentMarketplace();
    });

    it('detects local_service for Shanghai coffee query', () => {
        expect(detectDomain('帮我找上海外滩附近评分高的咖啡店')).toBe('local_service');
    });

    it('registers usable specialized agents and keeps placeholder agents hidden', async () => {
        const marketplace = await ensureMarketplaceCatalogReady(false);
        const ids = marketplace.getRegisteredAgents().map((agent) => agent.id);

        expect(ids).toContain('specialized:restaurant');
        expect(ids).toContain('specialized:attraction');
        expect(ids).toContain('specialized:weather');
        expect(ids).toContain('specialized:itinerary');
        expect(ids).toContain('specialized:transportation');

        expect(ids).not.toContain('specialized:shopping');
        expect(ids).not.toContain('specialized:social_search');
        expect(ids).not.toContain('specialized:translation');
    });

    it('discovers newly enabled specialized agents by capability', async () => {
        const marketplace = await ensureMarketplaceCatalogReady(false);

        const localDiscovery = marketplace.discoverAgents({
            query: '帮我找上海外滩附近评价高的餐厅',
            domain_hint: 'local_service',
            required_capabilities: ['restaurant_search', 'local_search'],
            require_realtime: false,
        });
        const localCandidateIds = localDiscovery.candidates.map((item) => item.agent.id);
        expect(localCandidateIds).toContain('specialized:restaurant');

        const attractionDiscovery = marketplace.discoverAgents({
            query: '帮我找上海周末适合打卡的景点',
            domain_hint: 'travel',
            required_capabilities: ['attraction_search'],
            require_realtime: false,
        });
        const attractionIds = attractionDiscovery.candidates.map((item) => item.agent.id);
        expect(attractionIds).toContain('specialized:attraction');

        const weatherDiscovery = marketplace.discoverAgents({
            query: '帮我查上海明天的天气',
            domain_hint: 'travel',
            required_capabilities: ['weather_query'],
            require_realtime: true,
        });
        const weatherIds = weatherDiscovery.candidates.map((item) => item.agent.id);
        expect(weatherIds).toContain('specialized:weather');

        const itineraryDiscovery = marketplace.discoverAgents({
            query: '帮我规划上海两天行程',
            domain_hint: 'travel',
            required_capabilities: ['itinerary_plan'],
            require_realtime: false,
        });
        const itineraryIds = itineraryDiscovery.candidates.map((item) => item.agent.id);
        expect(itineraryIds).toContain('specialized:itinerary');

        const transportDiscovery = marketplace.discoverAgents({
            query: '帮我规划上海本地交通方案',
            domain_hint: 'travel',
            required_capabilities: ['local_transport'],
            require_realtime: false,
        });
        const transportIds = transportDiscovery.candidates.map((item) => item.agent.id);
        expect(transportIds).toContain('specialized:transportation');
    });
});

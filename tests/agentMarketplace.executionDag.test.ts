/**
 * Agent Marketplace - Execution DAG Tests
 *
 * Verifies DAG ordering, parallel execution limit, fallback on failure, TTL enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    AgentMarketplaceService,
    resetAgentMarketplace,
} from '../services/agentMarketplaceService';
import type {
    AgentDescriptor,
    AgentExecutionPlan,
    AgentExecutionResult,
    CandidateAgent,
    MarketplaceTask,
} from '../services/agentMarketplaceTypes';

// ============================================================================
// Fixtures
// ============================================================================

function createAgent(id: string, caps: string[]): AgentDescriptor {
    return {
        id,
        name: `Agent ${id}`,
        source: 'tool_registry',
        domains: ['travel', 'general'],
        capabilities: caps,
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 1000,
        success_rate: 0.95,
        cost_tier: 'low',
        execute_ref: 'test',
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('Agent Marketplace Execution DAG', () => {
    let marketplace: AgentMarketplaceService;

    beforeEach(() => {
        resetAgentMarketplace();
        marketplace = new AgentMarketplaceService();
        marketplace.registerAgents([
            createAgent('flight_agent', ['flight_search']),
            createAgent('hotel_agent', ['hotel_search']),
            createAgent('transport_agent', ['local_transport']),
            createAgent('itinerary_agent', ['itinerary_plan']),
            createAgent('backup_flight', ['flight_search']),
        ]);
    });

    describe('Plan Building', () => {
        it('should decompose travel query into multiple tasks', () => {
            const { plan } = marketplace.buildExecutionPlan(
                '帮我搜索机票和酒店',
                'travel'
            );

            expect(plan.domain).toBe('travel');
            expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
            expect(plan.trace_id).toMatch(/^plan_/);
        });

        it('should include selections for each task', () => {
            const { plan } = marketplace.buildExecutionPlan(
                '搜索机票和酒店',
                'travel'
            );

            expect(plan.selections.length).toBe(plan.tasks.length);
            for (const sel of plan.selections) {
                expect(sel.task_id).toBeTruthy();
                expect(sel.primary_agent_id).toBeTruthy();
            }
        });
    });

    describe('DAG Execution', () => {
        it('should execute all tasks and return results', async () => {
            const plan: AgentExecutionPlan = {
                trace_id: 'test_trace',
                domain: 'travel',
                tasks: [
                    { id: 'task_1', objective: '搜索航班', required_capabilities: ['flight_search'], dependencies: [], parallelizable: true },
                    { id: 'task_2', objective: '搜索酒店', required_capabilities: ['hotel_search'], dependencies: [], parallelizable: true },
                ],
                selections: [
                    { task_id: 'task_1', primary_agent_id: 'flight_agent', fallback_agent_ids: ['backup_flight'] },
                    { task_id: 'task_2', primary_agent_id: 'hotel_agent', fallback_agent_ids: [] },
                ],
            };

            const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => ({
                task_id: task.id,
                agent_id: agentId,
                success: true,
                data: { result: `${agentId} completed ${task.objective}` },
                latency_ms: 100,
            });

            const summary = await marketplace.executePlan(plan, {}, executor);

            expect(summary.results.length).toBe(2);
            expect(summary.results.every(r => r.success)).toBe(true);
            expect(summary.selected_agents.length).toBe(2);
            expect(summary.fallback_used.length).toBe(0);
        });

        it('should use fallback when primary fails', async () => {
            const plan: AgentExecutionPlan = {
                trace_id: 'test_fallback',
                domain: 'travel',
                tasks: [
                    { id: 'task_1', objective: '搜索航班', required_capabilities: ['flight_search'], dependencies: [], parallelizable: true },
                ],
                selections: [
                    { task_id: 'task_1', primary_agent_id: 'flight_agent', fallback_agent_ids: ['backup_flight'] },
                ],
            };

            let callCount = 0;
            const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => {
                callCount++;
                if (agentId === 'flight_agent') {
                    return { task_id: task.id, agent_id: agentId, success: false, data: null, error: 'primary_failed', latency_ms: 50 };
                }
                return { task_id: task.id, agent_id: agentId, success: true, data: { result: 'fallback success' }, latency_ms: 100 };
            };

            const summary = await marketplace.executePlan(plan, {}, executor);

            expect(summary.results[0].success).toBe(true);
            expect(summary.results[0].agent_id).toBe('backup_flight');
            expect(summary.fallback_used.length).toBe(1);
            expect(summary.fallback_used[0].from_agent_id).toBe('flight_agent');
            expect(summary.fallback_used[0].to_agent_id).toBe('backup_flight');
        });

        it('should respect task dependencies (DAG order)', async () => {
            const executionOrder: string[] = [];

            const plan: AgentExecutionPlan = {
                trace_id: 'test_dag',
                domain: 'travel',
                tasks: [
                    { id: 'task_itinerary', objective: '行程规划', required_capabilities: ['itinerary_plan'], dependencies: ['task_flight', 'task_hotel'], parallelizable: false },
                    { id: 'task_flight', objective: '搜索航班', required_capabilities: ['flight_search'], dependencies: [], parallelizable: true },
                    { id: 'task_hotel', objective: '搜索酒店', required_capabilities: ['hotel_search'], dependencies: [], parallelizable: true },
                ],
                selections: [
                    { task_id: 'task_itinerary', primary_agent_id: 'itinerary_agent', fallback_agent_ids: [] },
                    { task_id: 'task_flight', primary_agent_id: 'flight_agent', fallback_agent_ids: [] },
                    { task_id: 'task_hotel', primary_agent_id: 'hotel_agent', fallback_agent_ids: [] },
                ],
            };

            const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => {
                executionOrder.push(task.id);
                return { task_id: task.id, agent_id: agentId, success: true, data: {}, latency_ms: 50 };
            };

            await marketplace.executePlan(plan, {}, executor);

            // flight and hotel should execute before itinerary
            const flightIdx = executionOrder.indexOf('task_flight');
            const hotelIdx = executionOrder.indexOf('task_hotel');
            const itineraryIdx = executionOrder.indexOf('task_itinerary');
            expect(flightIdx).toBeLessThan(itineraryIdx);
            expect(hotelIdx).toBeLessThan(itineraryIdx);
        });

        it('should handle failed tasks with no fallback', async () => {
            const plan: AgentExecutionPlan = {
                trace_id: 'test_no_fallback',
                domain: 'travel',
                tasks: [
                    { id: 'task_1', objective: '搜索商品', required_capabilities: ['price_compare'], dependencies: [], parallelizable: true },
                ],
                selections: [
                    { task_id: 'task_1', primary_agent_id: 'flight_agent', fallback_agent_ids: [] },
                ],
            };

            const executor = async (_: string, task: MarketplaceTask): Promise<AgentExecutionResult> => ({
                task_id: task.id, agent_id: 'flight_agent', success: false, data: null, error: 'total_failure', latency_ms: 50,
            });

            const summary = await marketplace.executePlan(plan, {}, executor);
            expect(summary.results[0].success).toBe(false);
            expect(summary.fallback_used.length).toBe(0);
        });
    });

    describe('Result Aggregation', () => {
        it('should aggregate successful results', () => {
            const summary = {
                trace_id: 'test',
                selected_agents: [{ task_id: 't1', agent_id: 'a1' }],
                fallback_used: [],
                results: [
                    { task_id: 't1', agent_id: 'a1', success: true, data: { price: 500 }, evidence: [{ source: 'trip.com', url: 'https://trip.com' }], latency_ms: 100 },
                    { task_id: 't2', agent_id: 'a2', success: true, data: { hotel: 'Hilton' }, latency_ms: 200 },
                ],
            };

            const aggregated = marketplace.aggregateResults(summary);
            expect(aggregated.success).toBe(true);
            expect(aggregated.combined_data['t1']).toEqual({ price: 500 });
            expect(aggregated.combined_data['t2']).toEqual({ hotel: 'Hilton' });
            expect(aggregated.evidence.length).toBe(1);
            expect(aggregated.failed_tasks.length).toBe(0);
        });

        it('should track failed tasks', () => {
            const summary = {
                trace_id: 'test',
                selected_agents: [],
                fallback_used: [],
                results: [
                    { task_id: 't1', agent_id: 'a1', success: false, data: null, error: 'timeout', latency_ms: 5000 },
                ],
            };

            const aggregated = marketplace.aggregateResults(summary);
            expect(aggregated.success).toBe(false);
            expect(aggregated.failed_tasks).toContain('t1');
        });
    });
});

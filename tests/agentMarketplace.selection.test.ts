/**
 * Agent Marketplace - Selection Tests
 *
 * Verifies scoring formula, hard-filter rules, primary+fallback selection, evidence enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    AgentMarketplaceService,
    scoreCandidate,
    applyHardFilters,
    resetAgentMarketplace,
} from '../services/agentMarketplaceService';
import type { AgentDescriptor, DiscoveryQuery, CandidateAgent } from '../services/agentMarketplaceTypes';

// ============================================================================
// Fixtures
// ============================================================================

function createAgent(overrides: Partial<AgentDescriptor> = {}): AgentDescriptor {
    return {
        id: 'test_agent',
        name: 'Test Agent',
        source: 'tool_registry',
        domains: ['travel'],
        capabilities: ['flight_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 2000,
        success_rate: 0.90,
        cost_tier: 'low',
        execute_ref: 'test_tool',
        ...overrides,
    };
}

function createQuery(overrides: Partial<DiscoveryQuery> = {}): DiscoveryQuery {
    return {
        query: '搜索机票',
        required_capabilities: ['flight_search'],
        ...overrides,
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('Agent Marketplace Selection', () => {
    let marketplace: AgentMarketplaceService;

    beforeEach(() => {
        resetAgentMarketplace();
        marketplace = new AgentMarketplaceService();
    });

    describe('Scoring Formula', () => {
        it('should compute weighted total: 0.40*fit + 0.20*rel + 0.15*fresh + 0.15*lat + 0.10*cost', () => {
            const agent = createAgent({
                capabilities: ['flight_search'],
                success_rate: 0.90,
                supports_realtime: true,
                evidence_level: 'strong',
                avg_latency_ms: 1000,
                cost_tier: 'low',
            });
            const query = createQuery({ required_capabilities: ['flight_search'] });

            const candidate = scoreCandidate(agent, query);

            // fit=1.0, reliability=0.90, freshness=1.0, latency=0.85, cost=1.0
            const expected = 0.40 * 1.0 + 0.20 * 0.90 + 0.15 * 1.0 + 0.15 * 0.85 + 0.10 * 1.0;
            expect(candidate.total_score).toBeCloseTo(expected, 1);
        });

        it('should give lower fit_score when capabilities partially match', () => {
            const agent = createAgent({
                capabilities: ['flight_search'],
            });
            const query = createQuery({
                required_capabilities: ['flight_search', 'hotel_search'],
            });

            const candidate = scoreCandidate(agent, query);
            expect(candidate.fit_score).toBe(0.5); // 1 of 2 capabilities
        });

        it('should give higher cost_score for low-cost agents', () => {
            const lowCost = scoreCandidate(createAgent({ cost_tier: 'low' }), createQuery());
            const highCost = scoreCandidate(createAgent({ cost_tier: 'high' }), createQuery());
            expect(lowCost.cost_score).toBeGreaterThan(highCost.cost_score);
        });

        it('should give higher latency_score for faster agents', () => {
            const fast = scoreCandidate(createAgent({ avg_latency_ms: 500 }), createQuery());
            const slow = scoreCandidate(createAgent({ avg_latency_ms: 8000 }), createQuery());
            expect(fast.latency_score).toBeGreaterThan(slow.latency_score);
        });

        it('should not inject default reliability/latency scores when metrics are missing', () => {
            const candidate = scoreCandidate(
                createAgent({
                    success_rate: undefined,
                    avg_latency_ms: undefined,
                }),
                createQuery()
            );

            expect(candidate.reliability_known).toBe(false);
            expect(candidate.latency_known).toBe(false);
            expect(candidate.reliability_score).toBe(0);
            expect(candidate.latency_score).toBe(0);
            expect(candidate.total_score).toBe(1);
        });
    });

    describe('Hard Filters', () => {
        it('should reject agents with domain mismatch', () => {
            const candidate = scoreCandidate(
                createAgent({ domains: ['finance'], id: 'fin' }),
                createQuery()
            );
            const filtered = applyHardFilters(candidate, createQuery(), 'travel');
            expect(filtered.rejected).toBe(true);
            expect(filtered.reject_reason).toContain('domain_mismatch');
        });

        it('should NOT reject agents with "general" domain', () => {
            const candidate = scoreCandidate(
                createAgent({ domains: ['general'], id: 'gen' }),
                createQuery()
            );
            const filtered = applyHardFilters(candidate, createQuery(), 'travel');
            expect(filtered.rejected).toBeFalsy();
        });

        it('should reject non-realtime agents when require_realtime=true', () => {
            const candidate = scoreCandidate(
                createAgent({ supports_realtime: false }),
                createQuery()
            );
            const filtered = applyHardFilters(
                candidate,
                createQuery({ require_realtime: true }),
                'travel'
            );
            expect(filtered.rejected).toBe(true);
            expect(filtered.reject_reason).toContain('realtime_required');
        });

        it('should reject no-evidence agents when require_evidence=true', () => {
            const candidate = scoreCandidate(
                createAgent({ evidence_level: 'none' }),
                createQuery()
            );
            const filtered = applyHardFilters(
                candidate,
                createQuery({ require_evidence: true }),
                'travel'
            );
            expect(filtered.rejected).toBe(true);
            expect(filtered.reject_reason).toContain('evidence_required');
        });

        it('should auto-require evidence for health domain', () => {
            const candidate = scoreCandidate(
                createAgent({ evidence_level: 'none', domains: ['health'] }),
                createQuery()
            );
            const filtered = applyHardFilters(candidate, createQuery(), 'health');
            expect(filtered.rejected).toBe(true);
            expect(filtered.reject_reason).toContain('evidence_required');
        });

        it('should auto-require evidence for legal domain', () => {
            const candidate = scoreCandidate(
                createAgent({ evidence_level: 'none', domains: ['legal'] }),
                createQuery()
            );
            const filtered = applyHardFilters(candidate, createQuery(), 'legal');
            expect(filtered.rejected).toBe(true);
        });

        it('should auto-require evidence for finance domain', () => {
            const candidate = scoreCandidate(
                createAgent({ evidence_level: 'none', domains: ['finance'] }),
                createQuery()
            );
            const filtered = applyHardFilters(candidate, createQuery(), 'finance');
            expect(filtered.rejected).toBe(true);
        });

        it('should reject external agents with low success rate', () => {
            const candidate = scoreCandidate(
                createAgent({ source: 'external_market', success_rate: 0.80 }),
                createQuery()
            );
            const filtered = applyHardFilters(candidate, createQuery(), 'travel');
            expect(filtered.rejected).toBe(true);
            expect(filtered.reject_reason).toContain('external_admission');
        });
    });

    describe('Primary + Fallback Selection', () => {
        it('should select top-1 as primary and top-2/3 as fallbacks', () => {
            marketplace.registerAgents([
                createAgent({ id: 'a1', success_rate: 0.95, avg_latency_ms: 1000 }),
                createAgent({ id: 'a2', success_rate: 0.85, avg_latency_ms: 2000 }),
                createAgent({ id: 'a3', success_rate: 0.75, avg_latency_ms: 3000 }),
            ]);

            const task = {
                id: 'task_1',
                objective: '搜索机票',
                required_capabilities: ['flight_search'],
                dependencies: [],
                parallelizable: true,
            };

            const selection = marketplace.selectForTask(task, 'travel');
            expect(selection).not.toBeNull();
            expect(selection!.primary_agent_id).toBe('a1');
            expect(selection!.fallback_agent_ids).toHaveLength(2);
            expect(selection!.fallback_agent_ids).toContain('a2');
            expect(selection!.fallback_agent_ids).toContain('a3');
        });

        it('should relax capability filter and keep same-domain fallback selection', () => {
            marketplace.registerAgents([
                createAgent({
                    id: 'recruit_a1',
                    domains: ['recruitment'],
                    capabilities: ['job_sourcing'],
                    success_rate: 0.95,
                    avg_latency_ms: 900,
                }),
                createAgent({
                    id: 'recruit_a2',
                    domains: ['recruitment'],
                    capabilities: ['salary_benchmark'],
                    success_rate: 0.90,
                    avg_latency_ms: 1100,
                }),
            ]);

            const task = {
                id: 'task_resume',
                objective: '优化简历',
                required_capabilities: ['resume_optimization'],
                dependencies: [],
                parallelizable: true,
            };

            const selection = marketplace.selectForTask(task, 'recruitment');
            expect(selection).not.toBeNull();
            expect(selection!.primary_agent_id).toBe('recruit_a1');
            expect(selection!.fallback_agent_ids).toContain('recruit_a2');
        });

        it('should return null when no agents match', () => {
            // Empty marketplace
            const emptyMkt = new AgentMarketplaceService();
            const task = {
                id: 'task_1',
                objective: '量子计算',
                required_capabilities: ['quantum_computing'],
                dependencies: [],
                parallelizable: true,
            };

            const selection = emptyMkt.selectForTask(task, 'general');
            expect(selection).toBeNull();
        });
    });
});

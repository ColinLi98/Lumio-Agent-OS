import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntentContext } from '../types.js';
import { AgentOrchestrator } from '../services/agentOrchestrator';

const detectCapabilitiesMock = vi.fn<(query: string) => string[]>();

vi.mock('../services/agentMarketplaceService.js', () => ({
    getAgentMarketplace: () => ({
        syncInternalSources: vi.fn(),
        buildExecutionPlan: vi.fn(() => ({
            plan: {
                trace_id: 'trace_test',
                domain: 'general',
                tasks: [],
                selections: [],
            },
        })),
        getRegisteredAgents: vi.fn(() => []),
    }),
    detectDomain: vi.fn(() => 'general'),
    detectCapabilities: (query: string) => detectCapabilitiesMock(query),
}));

describe('AgentOrchestrator fallback policy', () => {
    const baseIntent: IntentContext = {
        primaryIntent: '请帮我分析这个问题',
        category: 'other',
        impliedNeeds: [],
        userMentionedPrefs: [],
        confidence: 80,
    };

    beforeEach(() => {
        detectCapabilitiesMock.mockReset();
    });

    it('does not inject a hardcoded fallback task when no capability can be inferred', () => {
        detectCapabilitiesMock.mockReturnValue(['general']);
        const orchestrator = new AgentOrchestrator('test-key');
        const determineRequiredAgents = (orchestrator as any).determineRequiredAgents.bind(orchestrator);

        const tasks = determineRequiredAgents(baseIntent, {});

        expect(tasks).toHaveLength(0);
    });

    it('infers fallback task from detected capabilities when available', () => {
        detectCapabilitiesMock.mockReturnValue(['flight_search']);
        const orchestrator = new AgentOrchestrator('test-key');
        const determineRequiredAgents = (orchestrator as any).determineRequiredAgents.bind(orchestrator);

        const tasks = determineRequiredAgents(baseIntent, {});

        expect(tasks).toHaveLength(1);
        expect(tasks[0].agentType).toBe('flight_booking');
    });
});

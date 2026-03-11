import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SuperAgentService } from '../services/superAgentService';

describe('SuperAgentService routing mode policy', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        const store = new Map<string, string>();
        (globalThis as any).localStorage = {
            getItem: (key: string) => (store.has(key) ? String(store.get(key)) : null),
            setItem: (key: string, value: string) => { store.set(key, String(value)); },
            removeItem: (key: string) => { store.delete(key); },
            clear: () => { store.clear(); },
        };
    });

    afterEach(() => {
        (globalThis as any).fetch = originalFetch;
    });

    it('keeps low-complexity travel query in single_agent mode', async () => {
        const service = new SuperAgentService();
        (service as any).simpleLLMCall = async () => 'stubbed fallback answer';
        const response = await service.processWithReAct('去东京旅游');

        expect(response.routing_decision?.mode).toBe('single_agent');
        expect(response.routing_decision?.reason_codes || []).not.toContain('travel_full_solution');
    }, 15000);
});

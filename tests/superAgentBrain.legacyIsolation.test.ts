import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    analyzeAndDecompose,
    LEGACY_TRAVEL_AUTO_EXPANSION_STORAGE_KEY,
} from '../services/superAgentBrain';

describe('superAgentBrain legacy travel isolation', () => {
    const originalProcess = (
        globalThis as typeof globalThis & {
            process?: { env?: Record<string, string | undefined> };
        }
    ).process;

    beforeEach(() => {
        const store = new Map<string, string>();
        (globalThis as any).localStorage = {
            getItem: (key: string) => (store.has(key) ? String(store.get(key)) : null),
            setItem: (key: string, value: string) => { store.set(key, String(value)); },
            removeItem: (key: string) => { store.delete(key); },
            clear: () => { store.clear(); },
        };

        (globalThis as any).process = {
            ...(originalProcess || {}),
            env: { ...(originalProcess?.env || {}) },
        };
        delete (globalThis as any).process.env.LUMI_LEGACY_TRAVEL_AUTO_EXPANSION;
    });

    afterEach(() => {
        if (originalProcess) {
            (globalThis as any).process = originalProcess;
        } else {
            delete (globalThis as any).process;
        }
    });

    it('keeps travel decomposition on explicit user-requested tasks by default', async () => {
        const decomposition = await analyzeAndDecompose('帮我安排伦敦到大连的机票和酒店');

        expect(decomposition.subTasks.map((task) => task.agentType)).toEqual([
            'flight_booking',
            'hotel_booking',
        ]);
        expect(decomposition.implicitNeeds).toEqual([]);
        expect(decomposition.reasoning).toContain('explicit user-requested capabilities');
    });

    it('preserves legacy travel auto-expansion when the flag is enabled', async () => {
        globalThis.localStorage.setItem(LEGACY_TRAVEL_AUTO_EXPANSION_STORAGE_KEY, 'true');

        const decomposition = await analyzeAndDecompose('帮我安排伦敦到大连的机票和酒店');
        const agentTypes = decomposition.subTasks.map((task) => task.agentType);

        expect(agentTypes).toEqual([
            'weather',
            'flight_booking',
            'hotel_booking',
            'restaurant',
            'attraction',
            'transportation',
            'itinerary',
        ]);
        expect(decomposition.implicitNeeds).toContain('ground_transfer');
        expect(decomposition.optimizationGoal).toContain('综合偏好');
    });
});

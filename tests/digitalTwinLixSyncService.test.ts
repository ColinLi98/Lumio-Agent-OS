import { beforeEach, describe, expect, it, vi } from 'vitest';

const addMilestone = vi.fn();

vi.mock('../services/localStorageService', () => ({
  recordInteraction: vi.fn(),
}));

vi.mock('../services/digitalSoulManager', () => ({
  getDigitalSoulManager: () => ({
    addMilestone,
  }),
}));

import { recordInteraction } from '../services/localStorageService';
import {
  syncApprovedAgentToDigitalTwin,
  syncMarketplaceAgentIdsToDigitalTwin,
} from '../services/digitalTwinLixSyncService';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('digitalTwinLixSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('syncs approved agent once and avoids duplicate milestones', () => {
    const synced = syncApprovedAgentToDigitalTwin(
      { intent_id: 'intent_1', query: 'q', domain: 'travel' },
      {
        intent_id: 'intent_1',
        offer_id: 'offer_1',
        agent_id: 'ext:lix:weather_agent',
        name: 'Weather Expert Agent',
        execute_ref: 'https://example.com/execute',
        domains: ['travel'],
        capabilities: ['weather_query'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        cost_tier: 'mid',
        owner_id: 'u1',
        submitted_by: 'expert_1',
        submitted_at: new Date().toISOString(),
      }
    );
    const duplicated = syncApprovedAgentToDigitalTwin(
      { intent_id: 'intent_1', query: 'q', domain: 'travel' },
      {
        intent_id: 'intent_1',
        offer_id: 'offer_1',
        agent_id: 'ext:lix:weather_agent',
        name: 'Weather Expert Agent',
        execute_ref: 'https://example.com/execute',
        domains: ['travel'],
        capabilities: ['weather_query'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        cost_tier: 'mid',
        owner_id: 'u1',
        submitted_by: 'expert_1',
        submitted_at: new Date().toISOString(),
      }
    );

    expect(synced).toBe(true);
    expect(duplicated).toBe(false);
    expect(vi.mocked(recordInteraction).mock.calls.length).toBe(1);
    expect(addMilestone).toHaveBeenCalledTimes(1);
  });

  it('syncs only LIX marketplace ids from discovery list', () => {
    const count = syncMarketplaceAgentIdsToDigitalTwin([
      'ext:lix:agent_1',
      'tool:live_search',
      'ext:lix:agent_2',
    ]);

    expect(count).toBe(2);
    expect(vi.mocked(recordInteraction).mock.calls.length).toBe(2);
    expect(addMilestone).toHaveBeenCalledTimes(2);
  });
});


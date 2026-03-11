import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importAgentFromGithub } from '../services/agentGithubImportService';
import { ensureMarketplaceCatalogReady, resetAgentMarketplace } from '../services/agentMarketplaceService';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';
import { marketAnalyticsStore } from '../services/marketAnalyticsStore';

describe('agent marketplace persisted import hydration', () => {
  const previousSyncFlag = process.env.AGENT_MARKET_SYNC_PERSISTED_IMPORTS;

  beforeEach(async () => {
    process.env.AGENT_MARKET_SYNC_PERSISTED_IMPORTS = '1';
    lixAgentRegistryService.clear();
    resetAgentMarketplace();
    await marketAnalyticsStore.clearForTests();
  });

  afterEach(() => {
    if (typeof previousSyncFlag === 'string') {
      process.env.AGENT_MARKET_SYNC_PERSISTED_IMPORTS = previousSyncFlag;
    } else {
      delete process.env.AGENT_MARKET_SYNC_PERSISTED_IMPORTS;
    }
  });

  it('rehydrates github imported agent after in-memory registry reset', async () => {
    const result = await importAgentFromGithub({
      user_id: 'demo_user',
      owner_id: 'demo_user',
      repo: 'acme/travel-agent',
      manifest_json: {
        name: 'Travel Planner Pro',
        description: 'Search flights and hotels with evidence links',
        domains: ['travel'],
        capabilities: ['flight_search', 'hotel_search', 'live_search'],
        execute_ref: 'https://agents.example.com/travel/execute',
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        cost_tier: 'mid',
        market_visibility: 'public',
        pricing_model: 'pay_per_use',
        price_per_use_cny: 20,
      },
    });

    // Simulate cold start in another runtime: in-memory states are gone.
    lixAgentRegistryService.clear();
    resetAgentMarketplace();

    const marketplace = await ensureMarketplaceCatalogReady(false);
    const registeredIds = marketplace.getRegisteredAgents().map((agent) => agent.id);
    expect(registeredIds).toContain(result.descriptor.id);
  });
});

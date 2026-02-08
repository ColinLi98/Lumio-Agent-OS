import { beforeEach, describe, expect, it } from 'vitest';
import { ensureMarketplaceCatalogReady, resetAgentMarketplace } from '../services/agentMarketplaceService';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';
import type { DeliveredAgentManifest, ReviewDecision } from '../services/lixTypes';

beforeEach(() => {
  lixAgentRegistryService.clear();
  resetAgentMarketplace();
});

describe('agent marketplace integrates lix approved agents', () => {
  it('discovers approved lix-delivered agents', async () => {
    const manifest: DeliveredAgentManifest = {
      intent_id: 'sol_intent_test',
      offer_id: 'sol_offer_test',
      agent_id: 'ext:lix:test_local_agent',
      name: 'LIX Local Agent',
      description: 'Delivered by expert',
      execute_ref: 'https://example.com/execute',
      domains: ['local_service'],
      capabilities: ['lix_custom_capability'],
      supports_realtime: true,
      evidence_level: 'weak',
      supports_parallel: true,
      cost_tier: 'mid',
      owner_id: 'demo_user',
      submitted_by: 'expert_x',
      submitted_at: new Date().toISOString(),
      success_rate: 0.97,
      avg_latency_ms: 1800,
    };

    const review: ReviewDecision = {
      intent_id: manifest.intent_id,
      offer_id: manifest.offer_id,
      agent_id: manifest.agent_id,
      reviewer_id: 'reviewer_admin',
      decision: 'approved',
      reviewed_at: new Date().toISOString(),
    };

    lixAgentRegistryService.registerApprovedAgent(manifest, review);

    const marketplace = await ensureMarketplaceCatalogReady(false);
    const registeredIds = marketplace.getRegisteredAgents().map((row) => row.id);
    expect(registeredIds).toContain(manifest.agent_id);

    const discovery = marketplace.discoverAgents({
      query: '帮我找上海外滩附近评分高的咖啡店',
      domain_hint: 'local_service',
      required_capabilities: ['lix_custom_capability'],
      require_realtime: false,
      max_candidates: 20,
    });

    const ids = [...discovery.candidates, ...discovery.rejected].map((row) => row.agent.id);
    expect(ids).toContain(manifest.agent_id);
  });
});

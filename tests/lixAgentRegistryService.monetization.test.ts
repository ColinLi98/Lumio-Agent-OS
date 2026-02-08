import { beforeEach, describe, expect, it } from 'vitest';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';
import type { DeliveredAgentManifest, ReviewDecision } from '../services/lixTypes';

beforeEach(() => {
  lixAgentRegistryService.clear();
});

describe('lixAgentRegistryService monetization', () => {
  it('tracks agent usage and owner revenue', () => {
    const manifest: DeliveredAgentManifest = {
      intent_id: 'sol_intent_revenue',
      offer_id: 'sol_offer_revenue',
      agent_id: 'ext:lix:revenue_agent',
      name: 'Revenue Agent',
      execute_ref: 'https://example.com/execute',
      domains: ['shopping'],
      capabilities: ['price_compare'],
      supports_realtime: true,
      evidence_level: 'weak',
      supports_parallel: true,
      cost_tier: 'mid',
      owner_id: 'owner_1',
      submitted_by: 'expert_1',
      submitted_at: new Date().toISOString(),
      market_visibility: 'public',
      pricing_model: 'pay_per_use',
      price_per_use_cny: 15,
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

    const selfUse = lixAgentRegistryService.recordAgentUsage(manifest.agent_id, {
      consumer_id: 'owner_1',
      success: true,
    });
    const marketUse = lixAgentRegistryService.recordAgentUsage(manifest.agent_id, {
      consumer_id: 'buyer_1',
      success: true,
    });
    const failedUse = lixAgentRegistryService.recordAgentUsage(manifest.agent_id, {
      consumer_id: 'buyer_2',
      success: false,
    });

    expect(selfUse?.revenue_delta_cny).toBe(0);
    expect(marketUse?.revenue_delta_cny).toBe(15);
    expect(failedUse?.revenue_delta_cny).toBe(0);

    const summary = lixAgentRegistryService.getOwnerRevenueSummary('owner_1');
    expect(summary.total_revenue_cny).toBe(15);
    expect(summary.total_usage_count).toBe(3);
    expect(summary.active_agents).toBe(1);
    expect(summary.agents[0]?.pricing_model).toBe('pay_per_use');
  });
});

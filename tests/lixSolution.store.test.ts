import { beforeEach, describe, expect, it } from 'vitest';
import { lixStore } from '../services/lixStore';

beforeEach(() => {
  lixStore.resetForTests();
});

describe('lix solution store lifecycle', () => {
  it('covers broadcast -> accept -> delivery -> review', async () => {
    const intent = await lixStore.broadcastSolutionIntent({
      requester_id: 'demo_user',
      query: '帮我做一个可以查询上海咖啡店并导航的 agent',
      domain: 'local_service',
      required_capabilities: ['local_search', 'live_search'],
      delivery_mode_preference: 'human_expert',
      custom_requirements: {
        objective: '支持本地商家推荐并可点击导航',
        must_have_capabilities: ['local_search', 'live_search'],
        budget_max_cny: 1200,
      },
      failure_context: {
        candidate_count: 0,
        failed_count: 2,
      },
    });

    expect(intent.status).toBe('offers_received');
    expect(intent.offers.length).toBeGreaterThan(0);
    expect(intent.delivery_mode_preference).toBe('human_expert');
    expect(intent.custom_requirements?.budget_max_cny).toBe(1200);
    expect(intent.custom_requirements?.must_have_capabilities?.length).toBeGreaterThan(0);

    const accepted = await lixStore.acceptSolutionOffer(intent.intent_id, intent.offers[0].offer_id);
    expect(accepted.status).toBe('offer_accepted');
    expect(accepted.accepted_offer_id).toBe(intent.offers[0].offer_id);

    const delivered = await lixStore.submitSolutionDelivery({
      intent_id: intent.intent_id,
      offer_id: intent.offers[0].offer_id,
      submitted_by: 'expert_lee',
      owner_id: 'demo_user',
      name: '本地生活 Agent',
      execute_ref: 'https://example.com/agent/execute',
      domains: ['local_service'],
      capabilities: ['local_search', 'live_search'],
      supports_realtime: true,
      evidence_level: 'weak',
      supports_parallel: true,
      cost_tier: 'mid',
      success_rate: 0.96,
      github_repo: 'acme/local-agent',
      manifest_path: '.lix/agent.manifest.json',
    });

    expect(delivered.status).toBe('delivery_submitted');
    expect(delivered.delivery_manifest?.execute_ref).toContain('https://example.com');
    expect(delivered.delivery_manifest?.github_repo).toBe('acme/local-agent');

    const reviewed = await lixStore.reviewSolutionDelivery({
      intent_id: intent.intent_id,
      decision: 'approved',
      reviewer_id: 'reviewer_admin',
    });

    expect(reviewed.status).toBe('approved');
    expect(reviewed.review?.decision).toBe('approved');

    const mine = lixStore.listMyDeliveredManifests('demo_user');
    expect(mine.length).toBe(1);
    expect(mine[0].owner_id).toBe('demo_user');
  });

  it('auto-delivers and auto-approves when accepting agent_collab offer', async () => {
    const intent = await lixStore.broadcastSolutionIntent({
      requester_id: 'demo_user',
      query: '需要一个多 agent 协作的本地生活助手',
      domain: 'local_service',
      required_capabilities: ['local_search', 'weather_query', 'web_search'],
    });

    const collabOffer = intent.offers.find((offer) => offer.offer_type === 'agent_collab');
    expect(collabOffer).toBeTruthy();

    const accepted = await lixStore.acceptSolutionOffer(intent.intent_id, collabOffer!.offer_id);
    expect(accepted.status).toBe('approved');
    expect(accepted.delivery_manifest?.execute_ref).toContain('/api/lix/solution/executor');
    expect(accepted.review?.decision).toBe('approved');
    expect(accepted.review?.reviewer_id).toBe('system_auto');

    const mine = lixStore.listMyDeliveredManifests('demo_user');
    expect(mine.length).toBe(1);
    expect(mine[0].agent_id).toBe(accepted.delivery_manifest?.agent_id);
  });
});

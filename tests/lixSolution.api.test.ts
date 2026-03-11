import { beforeEach, describe, expect, it } from 'vitest';
import solutionHandler from '../api/lix/solution/[action]';
import { lixStore } from '../services/lixStore';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';
import { resetAgentMarketplace } from '../services/agentMarketplaceService';

beforeEach(() => {
  lixStore.resetForTests();
  lixAgentRegistryService.clear();
  resetAgentMarketplace();
});

describe('lix solution api integration', () => {
  it('supports end-to-end lifecycle and agent registration', async () => {
    const broadcastResp = await solutionHandler(new Request('http://localhost/api/lix/solution/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requester_id: 'demo_user',
        requester_type: 'agent',
        requester_agent_id: 'tool:live_search',
        requester_agent_name: 'live_search',
        query: '做一个招聘筛选 agent',
        domain: 'recruitment',
        required_capabilities: ['job_sourcing', 'resume_optimization'],
        delivery_mode_preference: 'human_expert',
        custom_requirements: {
          objective: '优先高匹配岗位并输出理由',
          must_have_capabilities: ['job_sourcing'],
          expected_delivery_hours: 8,
        },
      }),
    }));
    const broadcastPayload = await broadcastResp.json();

    expect(broadcastResp.status).toBe(200);
    expect(broadcastPayload.success).toBe(true);
    expect(broadcastPayload.intent?.requester_type).toBe('agent');
    expect(broadcastPayload.intent?.requester_agent_id).toBe('tool:live_search');
    expect(broadcastPayload.intent?.delivery_mode_preference).toBe('human_expert');
    expect(broadcastPayload.intent?.custom_requirements?.expected_delivery_hours).toBe(8);
    expect(Array.isArray(broadcastPayload.intent?.custom_requirements?.must_have_capabilities)).toBe(true);
    const intentId = String(broadcastPayload.intent_id || '');
    expect(intentId).toContain('sol_intent_');

    const offersResp = await solutionHandler(new Request(`http://localhost/api/lix/solution/offers?intent_id=${encodeURIComponent(intentId)}`, {
      method: 'GET',
    }));
    const offersPayload = await offersResp.json();

    expect(offersResp.status).toBe(200);
    expect(Array.isArray(offersPayload.offers)).toBe(true);
    expect(offersPayload.offers.length).toBeGreaterThan(0);
    const offerId = String(offersPayload.offers[0].offer_id || '');

    const acceptResp = await solutionHandler(new Request('http://localhost/api/lix/solution/offer/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent_id: intentId,
        offer_id: offerId,
      }),
    }));
    const acceptPayload = await acceptResp.json();

    expect(acceptResp.status).toBe(200);
    expect(['offer_accepted', 'approved']).toContain(acceptPayload.status);

    const deliveryResp = await solutionHandler(new Request('http://localhost/api/lix/solution/delivery', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent_id: intentId,
        offer_id: offerId,
        owner_id: 'demo_user',
        submitted_by: 'expert_x',
        name: 'Recruitment Copilot',
        execute_ref: 'https://example.com/recruit/execute',
        domains: ['recruitment'],
        capabilities: ['job_sourcing', 'resume_optimization'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        cost_tier: 'mid',
        github_repo: 'acme/recruitment-agent',
        manifest_path: '.lix/agent.manifest.json',
        delivery_mode_preference: 'human_expert',
      }),
    }));
    const deliveryPayload = await deliveryResp.json();

    expect(deliveryResp.status).toBe(200);
    expect(deliveryPayload.status).toBe('delivery_submitted');
    expect(deliveryPayload.delivery_manifest?.agent_id).toBeTruthy();
    expect(deliveryPayload.delivery_manifest?.github_repo).toBe('acme/recruitment-agent');

    const reviewResp = await solutionHandler(new Request('http://localhost/api/lix/solution/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent_id: intentId,
        decision: 'approved',
        reviewer_id: 'reviewer_admin',
      }),
    }));
    const reviewPayload = await reviewResp.json();

    expect(reviewResp.status).toBe(200);
    expect(reviewPayload.status).toBe('approved');
    expect(reviewPayload.approved_agent?.id).toBeTruthy();

    const myAgentsResp = await solutionHandler(new Request('http://localhost/api/lix/solution/my-agents?owner_id=demo_user', {
      method: 'GET',
    }));
    const myAgentsPayload = await myAgentsResp.json();

    expect(myAgentsResp.status).toBe(200);
    expect(myAgentsPayload.success).toBe(true);
    expect(myAgentsPayload.count).toBeGreaterThan(0);
    expect(Array.isArray(myAgentsPayload.agents)).toBe(true);
    expect(myAgentsPayload.revenue_summary).toBeTruthy();
  });

  it('registers auto-approved agent_collab offer without manual review step', async () => {
    const broadcastResp = await solutionHandler(new Request('http://localhost/api/lix/solution/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requester_id: 'demo_user',
        query: '让 agent 自己协作完成上海本地生活规划',
        domain: 'local_service',
        required_capabilities: ['local_search', 'weather_query', 'web_search'],
      }),
    }));
    const broadcastPayload = await broadcastResp.json();

    expect(broadcastResp.status).toBe(200);
    const intentId = String(broadcastPayload.intent_id || '');

    const offersResp = await solutionHandler(new Request(`http://localhost/api/lix/solution/offers?intent_id=${encodeURIComponent(intentId)}`, {
      method: 'GET',
    }));
    const offersPayload = await offersResp.json();
    const collabOffer = Array.isArray(offersPayload.offers)
      ? offersPayload.offers.find((offer: any) => offer?.offer_type === 'agent_collab')
      : undefined;

    expect(collabOffer).toBeTruthy();

    const acceptResp = await solutionHandler(new Request('http://localhost/api/lix/solution/offer/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent_id: intentId,
        offer_id: collabOffer.offer_id,
      }),
    }));
    const acceptPayload = await acceptResp.json();

    expect(acceptResp.status).toBe(200);
    expect(acceptPayload.status).toBe('approved');
    expect(acceptPayload.approved_agent?.id).toBeTruthy();

    const myAgentsResp = await solutionHandler(new Request('http://localhost/api/lix/solution/my-agents?owner_id=demo_user', {
      method: 'GET',
    }));
    const myAgentsPayload = await myAgentsResp.json();

    expect(myAgentsResp.status).toBe(200);
    expect(myAgentsPayload.count).toBeGreaterThan(0);
  });
});

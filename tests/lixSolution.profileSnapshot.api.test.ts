import { beforeEach, describe, expect, it } from 'vitest';
import solutionHandler from '../api/lix/solution/[action]';
import { lixStore } from '../services/lixStore';

describe('lix solution broadcast profile snapshot api', () => {
  beforeEach(() => {
    lixStore.resetForTests();
  });

  it('accepts snapshot when consent is granted and persists it', async () => {
    const request = new Request('http://localhost/api/lix/solution/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requester_id: 'avatar_user_1',
        query: '帮我构建上海咖啡店推荐 Agent',
        domain: 'local_service',
        required_capabilities: ['local_search', 'live_search'],
        profile_share_consent: 'granted_remembered',
        digital_twin_snapshot: {
          user_id: 'avatar_user_1',
          captured_at: new Date().toISOString(),
          source: 'agent_marketplace',
          enhanced_avatar: {
            id: 'avatar_user_1',
            name: 'Lumi User',
            age: 28,
          },
          marketplace_context: {
            user_id: 'avatar_user_1',
            profile_completeness: 92,
            privacy_mode: false,
            preferences: {
              price_vs_quality: 60,
              risk_tolerance: 45,
              preferred_evidence_level: 'strong',
              preferred_latency: 'balanced',
              preferred_domains: ['local_service'],
              preferred_tools: ['live_search'],
            },
          },
        },
      }),
    });

    const response = await solutionHandler(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload?.success).toBe(true);
    expect(payload?.profile_snapshot_attached).toBe(true);

    const intentId = String(payload?.intent_id || '');
    const stored = lixStore.getSolutionIntent(intentId);
    expect(stored?.profile_share_consent).toBe('granted_remembered');
    expect(stored?.digital_twin_snapshot?.user_id).toBe('avatar_user_1');
  });

  it('rejects snapshot when consent is missing', async () => {
    const request = new Request('http://localhost/api/lix/solution/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: '帮我构建招聘 Agent',
        digital_twin_snapshot: {
          user_id: 'u1',
          captured_at: new Date().toISOString(),
          source: 'agent_marketplace',
          enhanced_avatar: { id: 'u1' },
        },
      }),
    });

    const response = await solutionHandler(request);
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(String(payload?.error || '')).toContain('profile_share_consent');
  });
});


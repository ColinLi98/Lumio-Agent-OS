import { beforeEach, describe, expect, it } from 'vitest';
import { buildLeaderboard, getAgentTrendPoints } from '../services/agentHotnessService';
import { marketAnalyticsStore } from '../services/marketAnalyticsStore';

async function recordAgentEvents(agentId: string, options: { revenue: number; usage: number; successRate: number; domain: string }) {
  const now = Date.now();
  for (let i = 0; i < options.usage; i += 1) {
    const success = i < Math.floor(options.usage * options.successRate);
    await marketAnalyticsStore.recordUsageEvent({
      agent_id: agentId,
      agent_name: agentId,
      owner_id: `owner_${agentId}`,
      consumer_id: `${agentId}_consumer_${i}`,
      domain: options.domain,
      success,
      revenue_delta_cny: i < options.revenue ? 1 : 0,
      ts_ms: now - (options.usage - i) * 6000,
    });
  }
}

describe('agentHotnessService', () => {
  beforeEach(async () => {
    process.env.MARKET_ANALYTICS_DISABLE_FILE = '1';
    await marketAnalyticsStore.clearForTests();
  });

  it('builds commercial leaderboard with high-revenue agent on top', async () => {
    await marketAnalyticsStore.upsertAgentProfile({ agent_id: 'agent_a', agent_name: 'Agent A', owner_id: 'owner_a' });
    await marketAnalyticsStore.upsertAgentProfile({ agent_id: 'agent_b', agent_name: 'Agent B', owner_id: 'owner_b' });

    await recordAgentEvents('agent_a', { revenue: 35, usage: 40, successRate: 0.9, domain: 'shopping' });
    await recordAgentEvents('agent_b', { revenue: 5, usage: 40, successRate: 0.9, domain: 'shopping' });

    const leaderboard = await buildLeaderboard({
      window: '7d',
      sort: 'commercial',
      domain: 'shopping',
      limit: 10,
    });

    expect(leaderboard.rankings.length).toBeGreaterThanOrEqual(2);
    expect(leaderboard.rankings[0].agent_id).toBe('agent_a');
    expect(leaderboard.rankings[0].hotness_score).toBeGreaterThan(leaderboard.rankings[1].hotness_score);
  });

  it('returns trend points for a specific agent', async () => {
    await marketAnalyticsStore.upsertAgentProfile({ agent_id: 'agent_trend', agent_name: 'Trend Agent' });
    const now = Date.now();
    for (let day = 0; day < 5; day += 1) {
      await marketAnalyticsStore.recordUsageEvent({
        agent_id: 'agent_trend',
        consumer_id: `trend_user_${day}`,
        success: true,
        revenue_delta_cny: day + 1,
        domain: 'travel',
        ts_ms: now - (4 - day) * 24 * 3600 * 1000,
      });
    }

    const points = await getAgentTrendPoints('agent_trend', '30d', 'travel');
    expect(points.length).toBeGreaterThanOrEqual(3);
    expect(points[0]).toHaveProperty('date');
    expect(points[0]).toHaveProperty('hotness');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { marketAnalyticsStore } from '../services/marketAnalyticsStore';

describe('marketAnalyticsStore', () => {
  beforeEach(async () => {
    process.env.MARKET_ANALYTICS_DISABLE_FILE = '1';
    await marketAnalyticsStore.clearForTests();
  });

  it('records usage events and aggregates window metrics', async () => {
    const now = Date.now();
    await marketAnalyticsStore.upsertAgentProfile({
      agent_id: 'ext:lix:demo',
      agent_name: 'Demo Agent',
      owner_id: 'owner_1',
      domains: ['shopping'],
      pricing_model: 'pay_per_use',
      price_per_use_cny: 9,
    });

    await marketAnalyticsStore.recordUsageEvent({
      agent_id: 'ext:lix:demo',
      consumer_id: 'u1',
      success: true,
      revenue_delta_cny: 9,
      domain: 'shopping',
      ts_ms: now - 2 * 24 * 3600 * 1000,
    });
    await marketAnalyticsStore.recordUsageEvent({
      agent_id: 'ext:lix:demo',
      consumer_id: 'u2',
      success: false,
      revenue_delta_cny: 0,
      domain: 'shopping',
      ts_ms: now - 24 * 3600 * 1000,
    });

    const aggregate = await marketAnalyticsStore.getWindowAggregate('ext:lix:demo', 7, 'shopping');
    expect(aggregate.usage_count).toBe(2);
    expect(aggregate.success_count).toBe(1);
    expect(aggregate.revenue_cny).toBe(9);
    expect(aggregate.success_rate).toBe(0.5);
    expect(aggregate.paid_conversion).toBe(0.5);
  });

  it('rate-limits repeated same consumer-agent writes within 5 seconds', async () => {
    const now = Date.now();
    const first = await marketAnalyticsStore.recordUsageEvent({
      agent_id: 'ext:lix:limit',
      consumer_id: 'same_user',
      success: true,
      revenue_delta_cny: 1,
      ts_ms: now,
    });
    const second = await marketAnalyticsStore.recordUsageEvent({
      agent_id: 'ext:lix:limit',
      consumer_id: 'same_user',
      success: true,
      revenue_delta_cny: 1,
      ts_ms: now + 1000,
    });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
    expect(second.rate_limited).toBe(true);
  });
});

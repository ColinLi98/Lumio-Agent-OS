import { beforeEach, describe, expect, it } from 'vitest';
import leaderboardHandler from '../api/agent-market/leaderboard';
import { marketAnalyticsStore } from '../services/marketAnalyticsStore';

type MockReq = {
  method: string;
  query?: Record<string, any>;
};

type MockRes = {
  statusCode: number;
  payload: any;
  headers: Record<string, string>;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
  setHeader: (key: string, value: string) => void;
  end: () => void;
};

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    end() {
      // no-op
    },
  };
}

describe('agent-market leaderboard api', () => {
  beforeEach(async () => {
    process.env.MARKET_ANALYTICS_DISABLE_FILE = '1';
    await marketAnalyticsStore.clearForTests();
  });

  it('returns commercial rankings', async () => {
    const now = Date.now();
    await marketAnalyticsStore.recordUsageEvent({
      agent_id: 'agent_1',
      agent_name: 'Agent One',
      consumer_id: 'u1',
      success: true,
      revenue_delta_cny: 10,
      domain: 'shopping',
      ts_ms: now - 60000,
    });
    await marketAnalyticsStore.recordUsageEvent({
      agent_id: 'agent_2',
      agent_name: 'Agent Two',
      consumer_id: 'u2',
      success: true,
      revenue_delta_cny: 0,
      domain: 'shopping',
      ts_ms: now - 30000,
    });

    const req: MockReq = {
      method: 'GET',
      query: {
        window: '7d',
        sort: 'commercial',
        domain: 'shopping',
        limit: '5',
      },
    };
    const res = createMockRes();

    await leaderboardHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(Array.isArray(res.payload?.rankings)).toBe(true);
    expect(res.payload.rankings.length).toBeGreaterThan(0);
  });
});

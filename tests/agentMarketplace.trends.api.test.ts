import { beforeEach, describe, expect, it } from 'vitest';
import trendsHandler from '../api/agent-market/trends';
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

describe('agent-market trends api', () => {
  beforeEach(async () => {
    process.env.MARKET_ANALYTICS_DISABLE_FILE = '1';
    await marketAnalyticsStore.clearForTests();
  });

  it('returns daily trend points for an agent', async () => {
    const now = Date.now();
    for (let day = 0; day < 4; day += 1) {
      await marketAnalyticsStore.recordUsageEvent({
        agent_id: 'agent_trend_api',
        consumer_id: `u_${day}`,
        success: true,
        revenue_delta_cny: day + 1,
        domain: 'travel',
        ts_ms: now - (3 - day) * 24 * 3600 * 1000,
      });
    }

    const req: MockReq = {
      method: 'GET',
      query: {
        agent_id: 'agent_trend_api',
        window: '30d',
        domain: 'travel',
      },
    };
    const res = createMockRes();
    await trendsHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(Array.isArray(res.payload?.daily_points)).toBe(true);
    expect(res.payload.daily_points.length).toBeGreaterThan(0);
  });
});

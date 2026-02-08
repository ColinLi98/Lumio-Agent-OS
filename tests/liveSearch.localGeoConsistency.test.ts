import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import liveSearchHandler from '../api/live-search';

type MockReq = {
  method: string;
  body?: any;
};

type MockRes = {
  statusCode: number;
  payload: any;
  headers: Record<string, string>;
  ended: boolean;
  setHeader: (k: string, v: string) => void;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
  end: () => void;
};

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    ended: false,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
    },
  };
}

describe('live-search local geo consistency', () => {
  const originalKey = process.env.SERPAPI_KEY;

  beforeEach(() => {
    process.env.SERPAPI_KEY = 'test_key';
  });

  afterEach(() => {
    process.env.SERPAPI_KEY = originalKey;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('filters out mismatched overseas local results for Shanghai query', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const parsed = new URL(url);
      const engine = parsed.searchParams.get('engine');

      if (engine === 'google_local') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            local_results: [
              {
                place_id: 'indo_1',
                title: 'RESUME COFFEE',
                address: 'Jl. Pejaten Barat Raya No.100, Jakarta, Indonesia',
                rating: 4.7,
              },
              {
                place_id: 'sh_1',
                title: '外滩咖啡馆',
                address: '上海市黄浦区中山东一路',
                rating: 4.8,
              },
            ],
          }),
        } as Response;
      }

      if (engine === 'google_maps') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            local_results: [
              {
                place_id: 'indo_2',
                title: 'The Bund Cafe',
                address: 'South Jakarta, Indonesia',
                rating: 4.9,
              },
            ],
          }),
        } as Response;
      }

      if (engine === 'google_maps_reviews') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            reviews: [{ author: 'A', rating: 5, snippet: '很好' }],
          }),
        } as Response;
      }

      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'unexpected_engine' }),
      } as Response;
    }));

    const req: MockReq = {
      method: 'POST',
      body: {
        query: '帮我找上海外滩附近评分高的咖啡店',
        intent_domain: 'local_service',
        locale: 'zh-CN',
      },
    };
    const res = createMockRes();

    await liveSearchHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(Array.isArray(res.payload?.local_results)).toBe(true);

    const rows = res.payload.local_results as Array<any>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((item) => String(item.address || '').includes('Indonesia'))).toBe(false);

    const urls = rows.map((item) => String(item.map_url || ''));
    expect(urls.every((url) => url.includes('google.com/maps/search'))).toBe(true);
    expect(urls.every((url) => !url.includes('serpapi.com/search.json'))).toBe(true);
    expect(urls.every((url) => decodeURIComponent(url).includes('上海'))).toBe(true);
  });
});

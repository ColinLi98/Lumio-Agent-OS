import { beforeEach, describe, expect, it } from 'vitest';
import solutionHandler from '../api/lix/solution/[action]';
import { lixStore } from '../services/lixStore';

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (key: string, value: string) => void;
  status: (code: number) => MockRes;
  send: (payload: string) => void;
}

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: string) {
      this.body = payload;
    },
  };
}

describe('lix solution vercel req/res adapter', () => {
  beforeEach(() => {
    lixStore.resetForTests();
  });

  it('handles broadcast with node req/res shape', async () => {
    const req: any = {
      method: 'POST',
      url: '/api/lix/solution/broadcast',
      headers: {
        host: 'localhost:3000',
        'x-forwarded-proto': 'http',
        'content-type': 'application/json',
      },
      body: {
        requester_id: 'demo_user',
        query: '帮我找一个上海本地生活 agent',
        domain: 'local_service',
        required_capabilities: ['local_search', 'live_search'],
      },
    };
    const res = createMockRes();

    await solutionHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.success).toBe(true);
    expect(String(payload.intent_id || '')).toContain('sol_intent_');
    expect(Array.isArray(payload.intent?.offers)).toBe(true);
  });
});


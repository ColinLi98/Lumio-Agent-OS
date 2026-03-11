import { afterEach, describe, expect, it } from 'vitest';
import githubHandler from '../api/agent-market/github/[action]';

type MockReq = {
  method: string;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
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

const envBackup = {
  nodeEnv: process.env.NODE_ENV,
  clientId: process.env.GITHUB_APP_CLIENT_ID,
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
  mockMode: process.env.GITHUB_APP_MOCK_MODE,
};

describe('agent-market github fallback api', () => {
  afterEach(() => {
    process.env.NODE_ENV = envBackup.nodeEnv;
    process.env.GITHUB_APP_CLIENT_ID = envBackup.clientId;
    process.env.GITHUB_APP_CLIENT_SECRET = envBackup.clientSecret;
    process.env.GITHUB_APP_MOCK_MODE = envBackup.mockMode;
  });

  it('returns public_only mode when OAuth is not configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GITHUB_APP_CLIENT_ID = '';
    process.env.GITHUB_APP_CLIENT_SECRET = '';
    process.env.GITHUB_APP_MOCK_MODE = 'false';

    const req: MockReq = {
      method: 'GET',
      query: { action: 'connect', user_id: 'demo_user' },
      headers: { origin: 'https://lumi-agent-simulator.vercel.app' },
    };
    const res = createMockRes();
    await githubHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(res.payload?.mode).toBe('public_only');
    expect(res.payload?.connected).toBe(false);
  });

  it('returns empty repos with success when not connected', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GITHUB_APP_CLIENT_ID = '';
    process.env.GITHUB_APP_CLIENT_SECRET = '';
    process.env.GITHUB_APP_MOCK_MODE = 'false';

    const req: MockReq = {
      method: 'GET',
      query: { action: 'repos', user_id: 'demo_user' },
    };
    const res = createMockRes();
    await githubHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(res.payload?.connection_mode).toBe('public_only');
    expect(Array.isArray(res.payload?.repos)).toBe(true);
    expect(res.payload?.repos?.length).toBe(0);
  });
});


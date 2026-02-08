import { beforeEach, describe, expect, it } from 'vitest';
import githubImportHandler from '../api/agent-market/github/import';
import { ensureMarketplaceCatalogReady, resetAgentMarketplace } from '../services/agentMarketplaceService';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';

type MockReq = {
  method: string;
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

describe('agent-market github import api', () => {
  beforeEach(() => {
    lixAgentRegistryService.clear();
    resetAgentMarketplace();
  });

  it('imports agent from inline github manifest and registers into marketplace', async () => {
    const req: MockReq = {
      method: 'POST',
      body: {
        user_id: 'demo_user',
        owner_id: 'demo_user',
        repo: 'acme/coffee-agent',
        manifest_json: {
          name: 'Coffee Recommender',
          description: 'Find cafes and return clickable map links',
          domains: ['local_service'],
          capabilities: ['local_search', 'live_search'],
          execute_ref: 'https://agents.example.com/coffee/execute',
          supports_realtime: true,
          evidence_level: 'strong',
          supports_parallel: true,
          cost_tier: 'mid',
          market_visibility: 'public',
          pricing_model: 'pay_per_use',
          price_per_use_cny: 15,
        },
      },
    };
    const res = createMockRes();
    await githubImportHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(String(res.payload?.descriptor?.id || '')).toContain('ext:gh:');
    expect(res.payload?.descriptor?.source).toBe('external_market');

    const marketplace = await ensureMarketplaceCatalogReady(false);
    const ids = marketplace.getRegisteredAgents().map((agent) => agent.id);
    expect(ids).toContain(res.payload.descriptor.id);
  });
});

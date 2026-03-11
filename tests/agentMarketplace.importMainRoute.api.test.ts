import { beforeEach, describe, expect, it } from 'vitest';
import handler from '../api/agent-market/[action]';
import { ensureMarketplaceCatalogReady, resetAgentMarketplace } from '../services/agentMarketplaceService';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';

type MockReq = {
  method: string;
  query?: Record<string, string>;
  body?: any;
};

type MockRes = {
  statusCode: number;
  payload: any;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
};

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
  };
}

describe('agent-market import main route api', () => {
  beforeEach(() => {
    lixAgentRegistryService.clear();
    resetAgentMarketplace();
  });

  it('imports github manifest through /api/agent-market/import and registers into marketplace', async () => {
    const req: MockReq = {
      method: 'POST',
      query: { action: 'import' },
      body: {
        user_id: 'demo_user',
        owner_id: 'demo_user',
        repo: 'acme/local-service-agent',
        manifest_json: {
          name: 'Local Service Finder',
          description: 'Find nearby services with evidence links',
          domains: ['local_service'],
          capabilities: ['local_search', 'live_search'],
          execute_ref: 'https://agents.example.com/local/execute',
          supports_realtime: true,
          evidence_level: 'strong',
          supports_parallel: true,
          cost_tier: 'mid',
          market_visibility: 'public',
          pricing_model: 'pay_per_use',
          price_per_use_cny: 12,
        },
      },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(String(res.payload?.descriptor?.id || '')).toContain('ext:gh:');
    expect(res.payload?.descriptor?.source).toBe('external_market');

    const marketplace = await ensureMarketplaceCatalogReady(false);
    const ids = marketplace.getRegisteredAgents().map((agent) => agent.id);
    expect(ids).toContain(res.payload.descriptor.id);
  });
});

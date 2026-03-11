import { beforeEach, describe, expect, it } from 'vitest';
import { ensureMarketplaceCatalogReady, resetAgentMarketplace } from '../services/agentMarketplaceService';
import { importAgentFromGithub } from '../services/agentGithubImportService';
import { lixAgentRegistryService } from '../services/lixAgentRegistryService';

describe('agent marketplace reviewed github admission', () => {
    beforeEach(() => {
        lixAgentRegistryService.clear();
        resetAgentMarketplace();
        process.env.AGENT_MARKET_FEEDS = '';
    });

    it('keeps reviewed github imported agent discoverable', async () => {
        const imported = await importAgentFromGithub({
            user_id: 'demo_user',
            owner_id: 'demo_user',
            repo: 'openclaw/recruitment-subagent',
            manifest_json: {
                name: 'Recruitment Co-Pilot',
                domains: ['recruitment'],
                capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
                execute_ref: 'https://agents.example.com/recruitment/execute',
                supports_realtime: true,
                evidence_level: 'strong',
                supports_parallel: true,
                cost_tier: 'mid',
                avg_latency_ms: 900,
                success_rate: 0.99,
                market_visibility: 'public',
                pricing_model: 'pay_per_use',
                price_per_use_cny: 12,
            },
        });

        const marketplace = await ensureMarketplaceCatalogReady(false);
        const discovery = marketplace.discoverAgents({
            query: '招聘后端工程师并优化简历',
            domain_hint: 'recruitment',
            required_capabilities: ['job_sourcing', 'resume_optimization'],
            require_realtime: false,
        });

        expect(discovery.candidates.some((row) => row.agent.id === imported.descriptor.id)).toBe(true);
        expect(discovery.rejected.some((row) => row.agent.id === imported.descriptor.id)).toBe(false);
    });
});

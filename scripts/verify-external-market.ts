/**
 * Verify external Agent Marketplace chain end-to-end.
 *
 * Checks:
 * 1) external feed reachable
 * 2) /api/agent-market/discover returns external candidate
 * 3) /api/agent-market/execute proxy can reach external URL
 * 4) SuperAgent marketplace flow selects external agent on recruitment query
 */

import { resetAgentMarketplace } from '../services/agentMarketplaceService';
import { SuperAgentService } from '../services/superAgentService';

const BASE_URL = process.env.LUMI_API_BASE_URL || process.env.LUMI_BASE_URL || 'http://127.0.0.1:3000';
const FEED_URL = process.env.AGENT_MARKET_FEEDS || `${BASE_URL}/agent-market/external-feed.json`;
const EXPECTED_EXTERNAL_ID = process.env.EXPECTED_EXTERNAL_AGENT_ID || 'external_postman_echo_recruitment';

type LocalStorageLike = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};

function ensureLocalStorageForNode(): void {
    if (typeof (globalThis as any).localStorage !== 'undefined') {
        return;
    }
    const store = new Map<string, string>();
    const localStorageLike: LocalStorageLike = {
        getItem: (key: string) => (store.has(key) ? String(store.get(key)) : null),
        setItem: (key: string, value: string) => {
            store.set(key, String(value));
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
    (globalThis as any).localStorage = localStorageLike;
}

function assert(condition: unknown, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

async function readJson(url: string, init?: RequestInit): Promise<any> {
    const resp = await fetch(url, init);
    const text = await resp.text();
    const data = text ? JSON.parse(text) : {};
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${url}: ${text.slice(0, 300)}`);
    }
    return data;
}

async function main(): Promise<void> {
    ensureLocalStorageForNode();

    process.env.LUMI_API_BASE_URL = BASE_URL;
    process.env.LUMI_BASE_URL = BASE_URL;
    process.env.AGENT_MARKET_FEEDS = FEED_URL;

    console.log(`[verify] base=${BASE_URL}`);
    console.log(`[verify] feed=${FEED_URL}`);

    // 1) Feed
    const feed = await readJson(FEED_URL);
    const feedAgents: any[] = Array.isArray(feed) ? feed : Array.isArray(feed?.agents) ? feed.agents : [];
    const feedHit = feedAgents.find(a => String(a?.id || '') === EXPECTED_EXTERNAL_ID);
    assert(feedHit, `[verify] external agent not found in feed: ${EXPECTED_EXTERNAL_ID}`);
    console.log(`[verify] feed_ok id=${EXPECTED_EXTERNAL_ID}`);

    // 2) Discover
    const discover = await readJson(`${BASE_URL}/api/agent-market/discover`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            query: '帮我做招聘：找岗位、优化简历、对比薪资',
            domain_hint: 'recruitment',
            required_capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
            require_realtime: false,
        }),
    });
    const allDiscovered = [...(discover?.candidates || []), ...(discover?.rejected || [])];
    const discoveredExternal = allDiscovered.find((row: any) => row?.agent?.id === EXPECTED_EXTERNAL_ID);
    assert(discoveredExternal, `[verify] discover missing external candidate: ${EXPECTED_EXTERNAL_ID}`);
    assert(!discoveredExternal.rejected, `[verify] external candidate rejected: ${discoveredExternal.reject_reason || 'unknown'}`);
    console.log(`[verify] discover_ok top=${discover?.candidates?.[0]?.agent?.id || 'n/a'} trace=${discover?.trace_id || 'n/a'}`);

    // 3) Execute proxy
    const executePayload = { ping: 'external-proxy-check' };
    const execute = await readJson(`${BASE_URL}/api/agent-market/execute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            target_url: 'https://postman-echo.com/post',
            payload: executePayload,
            timeout_ms: 12000,
            retries: 1,
        }),
    });
    assert(execute?.json?.ping === executePayload.ping || execute?.data?.ping === executePayload.ping, '[verify] proxy response did not echo payload');
    console.log('[verify] execute_proxy_ok');

    // 4) SuperAgent end-to-end
    resetAgentMarketplace();
    const service = new SuperAgentService();
    const response = await service.processWithReAct('帮我做招聘：找岗位、优化简历、对比薪资');
    assert(!!response.marketplace_trace_id, '[verify] SuperAgent did not return marketplace trace');
    assert(
        Array.isArray(response.toolsUsed) && response.toolsUsed.includes(EXPECTED_EXTERNAL_ID),
        `[verify] SuperAgent toolsUsed missing external agent: ${EXPECTED_EXTERNAL_ID}`
    );
    console.log(`[verify] superagent_ok trace=${response.marketplace_trace_id} tools=${response.toolsUsed.join(',')}`);

    console.log('[verify] all_checks_passed');
    process.exit(0);
}

main().catch((error) => {
    console.error('[verify] failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});

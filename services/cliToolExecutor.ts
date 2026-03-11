import { buildApiUrl } from './apiBaseUrl.js';
import { isCliBashExecutionEnabled, runCurlJsonWithGrep } from './cliBashExecutor.js';

export interface CliToolExecutionResult {
    supported: boolean;
    success: boolean;
    output: any;
    filtered?: string;
    error?: string;
    executionPath: 'cli';
}

function toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function commerceDomainFromCategory(category: string): string {
    const normalized = category.trim().toLowerCase();
    if (normalized === 'purchase' || normalized === 'shopping' || normalized === 'commerce') {
        return 'ecommerce';
    }
    if (normalized === 'job') return 'recruitment';
    if (normalized === 'collaboration') return 'productivity';
    return 'general';
}

function buildCliRequest(toolName: string, args: Record<string, any>): {
    url: string;
    body: Record<string, any>;
    grepPattern: string;
} | null {
    if (toolName === 'live_search') {
        return {
            url: buildApiUrl('/api/live-search'),
            body: {
                query: String(args.query || '').trim(),
                locale: String(args.locale || 'zh-CN'),
                intent_domain: typeof args.intent_domain === 'string' ? args.intent_domain : undefined,
                constraints: typeof args.constraints === 'object' && args.constraints ? args.constraints : undefined,
                max_items: 5,
            },
            grepPattern: '"(trace_id|success|error|reason|answer|title|url|price|provider|intent_domain|fallback)"',
        };
    }

    if (toolName === 'web_search') {
        return {
            url: buildApiUrl('/api/tavily-search'),
            body: {
                query: String(args.query || '').trim(),
                search_depth: 'basic',
                max_results: 5,
            },
            grepPattern: '"(answer|title|url|content|error|query|results)"',
        };
    }

    if (toolName === 'broadcast_agent_requirement') {
        return {
            url: buildApiUrl('/api/lix/solution/broadcast'),
            body: {
                requester_id: 'demo_user',
                requester_type: 'agent',
                requester_agent_id: String(args.requester_agent_id || '').trim() || undefined,
                requester_agent_name: String(args.requester_agent_name || '').trim() || undefined,
                query: String(args.query || '').trim(),
                domain: String(args.domain || 'general').trim() || 'general',
                required_capabilities: toStringList(args.required_capabilities),
            },
            grepPattern: '"(success|intent_id|offers_count|status|error|trace|domain)"',
        };
    }

    if (toolName === 'broadcast_intent') {
        const category = String(args.category || '').trim();
        const item = String(args.item || args.query || '').trim();
        return {
            url: buildApiUrl('/api/lix/solution/broadcast'),
            body: {
                requester_id: 'demo_user',
                requester_type: 'user',
                query: item,
                domain: commerceDomainFromCategory(category),
                required_capabilities: [],
            },
            grepPattern: '"(success|intent_id|offers_count|status|error|trace|domain)"',
        };
    }

    if (toolName === 'price_compare') {
        const product = String(args.product || args.query || '').trim();
        const budget = Number(args.budget || 0);
        const queryText = budget > 0
            ? `${product} 价格 对比 预算 ${budget}`
            : `${product} 价格 对比`;
        return {
            url: buildApiUrl('/api/live-search'),
            body: {
                query: queryText,
                locale: 'zh-CN',
                intent_domain: 'ecommerce.product',
                max_items: 5,
            },
            grepPattern: '"(trace_id|success|error|title|url|price|shopping_results|provider|fallback)"',
        };
    }

    return null;
}

function normalizeCliPayload(toolName: string, payload: any, filtered: string): any {
    if (toolName === 'web_search') {
        return {
            success: true,
            query: String(payload?.query || ''),
            answer: String(payload?.answer || ''),
            results: Array.isArray(payload?.results) ? payload.results : [],
            summary: String(payload?.answer || ''),
            relatedQueries: [],
            cli_filtered_excerpt: filtered,
            _executor: 'cli',
        };
    }

    return {
        ...(payload && typeof payload === 'object' ? payload : { data: payload }),
        cli_filtered_excerpt: filtered,
        _executor: 'cli',
    };
}

export async function executeToolViaCli(
    toolName: string,
    args: Record<string, any>
): Promise<CliToolExecutionResult> {
    if (!isCliBashExecutionEnabled()) {
        return {
            supported: false,
            success: false,
            output: null,
            executionPath: 'cli',
            error: 'cli_bash_disabled_or_unavailable',
        };
    }

    const request = buildCliRequest(toolName, args);
    if (!request) {
        return {
            supported: false,
            success: false,
            output: null,
            executionPath: 'cli',
        };
    }

    const run = await runCurlJsonWithGrep({
        url: request.url,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: request.body,
        grepPattern: request.grepPattern,
        timeoutMs: 25_000,
        maxFilteredLines: 160,
    });

    if (!run.ok) {
        return {
            supported: true,
            success: false,
            output: { success: false, error: { code: 'CLI_EXEC_FAILED', message: run.error || 'cli_failed' } },
            filtered: run.filtered,
            executionPath: 'cli',
            error: run.error,
        };
    }

    let parsed: any = null;
    try {
        parsed = run.raw ? JSON.parse(run.raw) : {};
    } catch {
        return {
            supported: true,
            success: false,
            output: { success: false, error: { code: 'CLI_PARSE_FAILED', message: 'non_json_response' } },
            filtered: run.filtered,
            executionPath: 'cli',
            error: 'cli_non_json_response',
        };
    }

    const normalized = normalizeCliPayload(toolName, parsed, run.filtered);
    const success = parsed?.success !== false;
    return {
        supported: true,
        success,
        output: normalized,
        filtered: run.filtered,
        executionPath: 'cli',
    };
}

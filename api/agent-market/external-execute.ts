import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getToolRegistry } from '../../services/toolRegistry.js';

type ExternalExecuteBody = {
    trace_id?: string;
    agent_id?: string;
    execute_ref?: string;
    query?: string;
    input?: {
        query?: string;
        domain?: string;
        locale?: string;
    };
};

function normalizeDomain(raw: string): string {
    const domain = raw.trim().toLowerCase();
    if (!domain) return 'knowledge';
    if (domain === 'recruitment') return 'knowledge';
    if (domain === 'local_service') return 'local_life';
    return domain;
}

function buildEvidence(output: any): Array<{ title: string; snippet: string; url: string; source_name: string }> {
    const rows = Array.isArray(output?.results) ? output.results : [];
    return rows
        .map((item: any) => ({
            title: String(item?.title || '').trim(),
            snippet: String(item?.snippet || '').trim(),
            url: String(item?.url || '').trim(),
            source_name: String(item?.source || item?.source_name || '').trim() || 'external',
        }))
        .filter((item) => item.title && item.url)
        .slice(0, 6);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const body = (req.body || {}) as ExternalExecuteBody;
        const query = String(body.input?.query || body.query || '').trim();
        const locale = String(body.input?.locale || 'zh-CN').trim() || 'zh-CN';
        const domain = normalizeDomain(String(body.input?.domain || 'knowledge'));
        const traceId = String(body.trace_id || '').trim() || `ext_exec_${Date.now()}`;

        if (!query) {
            res.status(400).json({
                success: false,
                trace_id: traceId,
                error: { message: 'missing_query' },
            });
            return;
        }

        const registry = getToolRegistry();
        const useLiveTool = ['ticketing', 'travel', 'local_life', 'ecommerce'].includes(domain);
        const toolName = useLiveTool ? 'live_search' : 'web_search';
        const fallbackTool = useLiveTool ? 'web_search' : 'live_search';
        const tool = registry.getTool(toolName) || registry.getTool(fallbackTool);

        if (!tool) {
            res.status(500).json({
                success: false,
                trace_id: traceId,
                error: { message: 'tool_not_found' },
            });
            return;
        }

        const args = tool.name === 'live_search'
            ? {
                query,
                locale,
                intent_domain: domain,
                max_items: 6,
            }
            : {
                query,
                locale,
                max_results: 6,
            };

        const output = await tool.execute(args);
        const success = output?.success !== false;
        const evidenceItems = buildEvidence(output);
        const summary = String(
            output?.summary ||
                output?.answer ||
                output?.message ||
                `已通过 ${tool.name} 完成外部执行`
        ).trim();

        res.status(success ? 200 : 502).json({
            success,
            trace_id: traceId,
            data: {
                summary,
                answer: String(output?.answer || summary),
                source_tool: tool.name,
                query_echo: query,
                domain,
                evidence: {
                    items: evidenceItems,
                    fetched_at: new Date().toISOString(),
                },
                raw: output,
            },
            error: success ? undefined : (output?.error || { message: 'external_execute_failed' }),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'internal_error',
            },
        });
    }
}

/**
 * Web Exec with Playwright - Read-Only Evidence Extraction
 * 
 * P0 Implementation:
 * - Read-only execution: NO login/payment/order
 * - Extracts structured evidence from pages
 * - Uses seed_urls from live_search or fallback to search
 * - Outputs EvidencePack with provider="playwright_exec"
 */

import type {
    EvidenceItem,
    EvidencePack,
    Stage,
    FailureCode,
    IntentDomain,
    StageTrace,
} from './liveSearchVertexGrounding.js';

// ============================================================================
// Types
// ============================================================================

export interface WebExecRequest {
    query: string;
    seed_urls?: string[];  // From live_search top-k
    intent_domain?: IntentDomain;
    timeout_ms?: number;   // Default: 30000
    max_pages?: number;    // Default: 3
}

export interface WebExecStep {
    step_id: number;
    action_type: 'navigate' | 'extract' | 'screenshot' | 'scroll';
    target?: string;
    timestamp: number;
    success: boolean;
    error?: string;
    data?: any;
}

export interface WebExecSuccessResponse {
    success: true;
    trace_id: string;
    evidence: EvidencePack;
    steps: WebExecStep[];
    extracted: Record<string, any>;
    stages: StageTrace[];
}

export interface WebExecErrorResponse {
    success: false;
    trace_id: string;
    error: {
        code: FailureCode;
        message: string;
        retryable: boolean;
        retry_suggestions?: string[];
    };
    steps: WebExecStep[];
    stages: StageTrace[];
}

export type WebExecResponse = WebExecSuccessResponse | WebExecErrorResponse;

// ============================================================================
// Sensitive Action Detection
// ============================================================================

const SENSITIVE_PATTERNS = [
    /登录|login|signin|sign.?in/i,
    /注册|register|signup|sign.?up/i,
    /支付|pay|checkout|payment/i,
    /下单|order|purchase|buy/i,
    /密码|password|passwd/i,
    /绑定|bind|link.*account/i,
];

const BLOCKED_ACTIONS = [
    'click login',
    'click submit',
    'fill password',
    'fill credit card',
    'confirm order',
];

export function isSensitiveAction(task: string): boolean {
    return SENSITIVE_PATTERNS.some(p => p.test(task.toLowerCase()));
}

// ============================================================================
// TTL Strategy (same as liveSearch)
// ============================================================================

const TTL_BY_DOMAIN: Record<IntentDomain, number> = {
    ticketing: 900,      // 15 minutes
    travel: 900,         // 15 minutes
    ecommerce: 3600,     // 1 hour
    knowledge: 86400,    // 24 hours
    local_life: 1800,    // 30 minutes
};

// ============================================================================
// Mock Playwright Extraction (Stub)
// In production, would use actual Playwright browser automation
// ============================================================================

interface PageExtractionResult {
    title: string;
    snippet: string;
    url: string;
    source_name: string;
    structured_data?: Record<string, any>;
    error?: string;
}

async function extractPageContent(
    url: string,
    query: string,
    timeoutMs: number
): Promise<PageExtractionResult> {
    // STUB: In production, this would use Playwright
    // For now, return structured mock based on URL pattern

    const hostname = new URL(url).hostname.replace(/^www\./, '');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate different page types
    if (hostname.includes('ctrip') || hostname.includes('trip')) {
        return {
            title: `${query} - 携程旅行`,
            snippet: `查询 ${query} 的实时价格和班次信息。携程提供多种航班选择和优惠票价。`,
            url,
            source_name: hostname,
            structured_data: {
                type: 'flight_search',
                has_results: true,
            },
        };
    }

    if (hostname.includes('12306')) {
        return {
            title: `${query} - 12306铁路客户服务中心`,
            snippet: `中国铁路官方售票平台。查询 ${query} 的火车票信息、车次时刻表和余票情况。`,
            url,
            source_name: hostname,
            structured_data: {
                type: 'train_search',
                has_results: true,
            },
        };
    }

    if (hostname.includes('jd') || hostname.includes('taobao') || hostname.includes('tmall')) {
        return {
            title: `${query} - 电商平台`,
            snippet: `${query} 的商品搜索结果页面。`,
            url,
            source_name: hostname,
            structured_data: {
                type: 'ecommerce_search',
                has_results: true,
            },
        };
    }

    // Default extraction
    return {
        title: `Search results for: ${query}`,
        snippet: `Page content related to ${query}. This is extracted content from ${hostname}.`,
        url,
        source_name: hostname,
    };
}

// ============================================================================
// Main Web Exec Function
// ============================================================================

export async function webExecWithPlaywright(
    request: WebExecRequest
): Promise<WebExecResponse> {
    const startTime = Date.now();
    const trace_id = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const stages: StageTrace[] = [];
    const steps: WebExecStep[] = [];

    const addStage = (stage: Stage, success: boolean, error?: string, metadata?: Record<string, any>) => {
        stages.push({
            stage,
            ts: Date.now(),
            latency_ms: Date.now() - startTime,
            success,
            error,
            metadata,
        });
    };

    try {
        const {
            query,
            seed_urls = [],
            intent_domain = 'knowledge',
            timeout_ms = 30000,
            max_pages = 3,
        } = request;

        // Stage 1: Router decision
        addStage('router_decision', true, undefined, { intent_domain, seed_urls_count: seed_urls.length });

        // Check for sensitive action (blocked)
        if (isSensitiveAction(query)) {
            addStage('fallback_triggered', true, 'Sensitive action blocked', { blocked: true });

            return {
                success: false,
                trace_id,
                error: {
                    code: 'blocked',
                    message: '检测到敏感操作 (登录/支付/下单)，web_exec 仅支持只读任务',
                    retryable: false,
                    retry_suggestions: [
                        '仅执行只读查询（查询航班、车次、票价）',
                        '移除登录/支付/下单等敏感操作',
                        '使用 live_search 进行信息查询',
                    ],
                },
                steps,
                stages,
            };
        }

        // Determine URLs to process
        const urlsToProcess = seed_urls.length > 0
            ? seed_urls.slice(0, max_pages)
            : []; // Would generate search URLs in production

        if (urlsToProcess.length === 0) {
            addStage('fallback_triggered', true, 'No seed URLs provided', { reason: 'no_urls' });

            return {
                success: false,
                trace_id,
                error: {
                    code: 'insufficient_constraints',
                    message: '未提供 seed_urls，请先调用 live_search 获取候选链接',
                    retryable: true,
                    retry_suggestions: [
                        '先使用 live_search 获取搜索结果',
                        '提供 seed_urls 参数',
                    ],
                },
                steps,
                stages,
            };
        }

        // Stage 2: Start extraction
        addStage('vertex_request_sent', true, undefined, { urls: urlsToProcess });

        const evidenceItems: EvidenceItem[] = [];
        const extractedData: Record<string, any> = {};

        // Process each URL
        for (let i = 0; i < urlsToProcess.length; i++) {
            const url = urlsToProcess[i];
            const stepId = steps.length + 1;

            // Step: Navigate
            steps.push({
                step_id: stepId,
                action_type: 'navigate',
                target: url,
                timestamp: Date.now(),
                success: true,
            });

            try {
                // Step: Extract
                const extraction = await extractPageContent(url, query, timeout_ms);

                steps.push({
                    step_id: stepId + 1,
                    action_type: 'extract',
                    target: url,
                    timestamp: Date.now(),
                    success: !extraction.error,
                    error: extraction.error,
                    data: extraction.structured_data,
                });

                if (!extraction.error) {
                    evidenceItems.push({
                        title: extraction.title,
                        snippet: extraction.snippet,
                        url: extraction.url,
                        source_name: extraction.source_name,
                    });

                    if (extraction.structured_data) {
                        extractedData[url] = extraction.structured_data;
                    }
                }
            } catch (error: any) {
                steps.push({
                    step_id: stepId + 1,
                    action_type: 'extract',
                    target: url,
                    timestamp: Date.now(),
                    success: false,
                    error: error.message,
                });
            }
        }

        // Stage 3: Response received
        addStage('vertex_response_recv', true, undefined, {
            processed_urls: urlsToProcess.length,
            successful_extractions: evidenceItems.length,
        });

        // Stage 4: Parse results
        addStage('parse_grounding', evidenceItems.length > 0, evidenceItems.length === 0 ? 'No extractions' : undefined, {
            items_count: evidenceItems.length,
        });

        // Check if we got any results
        if (evidenceItems.length === 0) {
            addStage('fallback_triggered', true, 'No evidence extracted', { reason: 'parse_error' });

            return {
                success: false,
                trace_id,
                error: {
                    code: 'parse_error',
                    message: '无法从页面提取有效信息',
                    retryable: true,
                    retry_suggestions: [
                        '网页结构可能已更改，请稍后重试',
                        '尝试其他相关网站',
                        '使用 live_search 进行搜索',
                    ],
                },
                steps,
                stages,
            };
        }

        // Stage 5: Compose answer
        const nowMs = Date.now();
        const evidence: EvidencePack = {
            items: evidenceItems,
            fetched_at_ms: nowMs,
            fetched_at: nowMs,
            ttl_seconds: TTL_BY_DOMAIN[intent_domain],
            provider: 'playwright_exec',
            confidence: Math.min(1, 0.3 + 0.2 * evidenceItems.length),
        };

        addStage('compose_answer', true, undefined, {
            items_count: evidence.items.length,
            top_domains: evidence.items.slice(0, 3).map(i => i.source_name),
        });

        console.log(`[web-exec] trace_id=${trace_id} Success: ${evidence.items.length} items extracted`);

        return {
            success: true,
            trace_id,
            evidence,
            steps,
            extracted: extractedData,
            stages,
        };

    } catch (error: any) {
        console.error(`[web-exec] trace_id=${trace_id} Fatal error:`, error);

        addStage('fallback_triggered', true, error.message, { fatal: true });

        // Determine error code from error type
        let errorCode: FailureCode = 'internal_error';
        if (error.message?.includes('timeout')) errorCode = 'timeout';
        else if (error.message?.includes('network')) errorCode = 'network';

        return {
            success: false,
            trace_id,
            error: {
                code: errorCode,
                message: error.message || 'Unknown error',
                retryable: true,
                retry_suggestions: ['稍后重试', '检查网络连接'],
            },
            steps,
            stages,
        };
    }
}

// ============================================================================
// Export
// ============================================================================

export default {
    webExecWithPlaywright,
    isSensitiveAction,
};

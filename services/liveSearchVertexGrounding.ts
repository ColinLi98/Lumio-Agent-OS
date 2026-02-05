/**
 * Live Search with Vertex AI Grounding (Google Search Retrieval)
 * 
 * P0 Implementation:
 * - Uses Gemini API with Google Search Grounding
 * - Parses citation/grounding metadata into EvidencePack
 * - Domain-based TTL strategy
 * - Ecommerce domain hard gate for ticketing queries
 */

// ============================================================================
// Types
// ============================================================================

export type IntentDomain = 'ticketing' | 'travel' | 'ecommerce' | 'knowledge' | 'local_life';

export type FailureCode =
    | 'network'
    | 'timeout'
    | 'auth'
    | 'quota'
    | 'blocked'
    | 'provider_error'
    | 'parse_error'
    | 'no_results'
    | 'insufficient_constraints'
    | 'internal_error';

export type Stage =
    | 'router_decision'
    | 'vertex_request_sent'
    | 'vertex_response_recv'
    | 'parse_grounding'
    | 'domain_filter'
    | 'compose_answer'
    | 'fallback_triggered';

export interface LiveSearchRequest {
    query: string;
    locale?: string;
    intent_domain?: IntentDomain;
    max_items?: number;
}

export interface EvidenceItem {
    title: string;
    snippet: string;
    url: string;
    source_name: string;
}

export interface EvidencePack {
    items: EvidenceItem[];
    fetched_at: number;
    ttl_seconds: number;
    provider: 'vertex_grounding' | 'playwright_exec';
    confidence: number;
    notes?: {
        cache_hit?: boolean;
        grounding_queries?: string[];
    };
}

export interface RouteDecision {
    intent_domain: IntentDomain;
    needs_live_data: boolean;
    needs_interaction: boolean;
    reason: string;
}

export interface LiveSearchSuccessResponse {
    success: true;
    trace_id: string;
    evidence: EvidencePack;
    route_decision: RouteDecision;
    stages: StageTrace[];
}

export interface LiveSearchErrorResponse {
    success: false;
    trace_id: string;
    error: {
        code: FailureCode;
        message: string;
        retryable: boolean;
    };
    fallback: {
        failure_reason: string;
        missing_constraints: string[];
        cta_buttons: Array<{ label: string; action: string; key?: string }>;
    };
    stages: StageTrace[];
}

export type LiveSearchResponse = LiveSearchSuccessResponse | LiveSearchErrorResponse;

export interface StageTrace {
    stage: Stage;
    ts: number;
    latency_ms: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}

// ============================================================================
// Constants
// ============================================================================

// TTL Strategy by domain
const TTL_BY_DOMAIN: Record<IntentDomain, number> = {
    ticketing: 900,      // 15 minutes
    travel: 900,         // 15 minutes
    ecommerce: 3600,     // 1 hour
    knowledge: 86400,    // 24 hours
    local_life: 1800,    // 30 minutes
};

// Ecommerce domain blocklist (for ticketing/travel domain gating)
const ECOMMERCE_DOMAINS = [
    'jd.com', 'jd.hk',
    'pinduoduo.com', 'pdd.com',
    'taobao.com', 'tmall.com', 'tmall.hk',
    '1688.com',
    'amazon.com', 'amazon.cn',
    'suning.com',
    'dangdang.com',
    'vip.com',
    'kaola.com',
];

// Ticketing allowlist (airlines, OTAs, train)
const TICKETING_ALLOWLIST = [
    // Airlines
    'airchina.com', 'ceair.com', 'csair.com', 'hainanair.com', 'shenzhenair.com',
    'united.com', 'aa.com', 'delta.com', 'britishairways.com', 'emirates.com',
    'cathaypacific.com', 'singaporeair.com', 'ana.co.jp', 'jal.co.jp',
    // OTA
    'ctrip.com', 'trip.com', 'qunar.com', 'fliggy.com', 'ly.com',
    'booking.com', 'expedia.com', 'kayak.com', 'skyscanner.com', 'momondo.com',
    // Train
    '12306.cn', 'rail.com.cn',
    // Aggregators / Search
    'google.com', 'vertexaisearch.cloud.google.com',
    // Meta search
    'tianxun.com', 'ifly.cn',
];

// ============================================================================
// Domain Classification
// ============================================================================

export function classifyDomain(query: string): RouteDecision {
    const q = query.toLowerCase();

    // Ticketing keywords
    const ticketingPatterns = [
        /机票/, /航班/, /飞机/, /fly|flight/i,
        /火车票/, /高铁/, /动车/, /车次/, /列车/,
        /12306/,
    ];

    // Travel keywords
    const travelPatterns = [
        /酒店/, /住宿/, /民宿/, /hotel/i,
        /旅游/, /景点/, /度假/, /游玩/,
    ];

    // Ecommerce keywords
    const ecommercePatterns = [
        /买/, /购买/, /下单/, /价格/, /多少钱/,
        /iPhone|iPad|MacBook|AirPods/i,
        /商品/, /产品/,
    ];

    // Check patterns
    const isTicketing = ticketingPatterns.some(p => p.test(q));
    const isTravel = travelPatterns.some(p => p.test(q));
    const isEcommerce = ecommercePatterns.some(p => p.test(q));

    // Priority: ticketing > travel > ecommerce > knowledge
    if (isTicketing) {
        return {
            intent_domain: 'ticketing',
            needs_live_data: true,
            needs_interaction: false,
            reason: 'Matched ticketing keywords (机票/航班/火车票)',
        };
    }

    if (isTravel) {
        return {
            intent_domain: 'travel',
            needs_live_data: true,
            needs_interaction: false,
            reason: 'Matched travel keywords (酒店/旅游)',
        };
    }

    if (isEcommerce) {
        return {
            intent_domain: 'ecommerce',
            needs_live_data: true,
            needs_interaction: false,
            reason: 'Matched ecommerce keywords (购买/价格)',
        };
    }

    return {
        intent_domain: 'knowledge',
        needs_live_data: false,
        needs_interaction: false,
        reason: 'No time-sensitive signal detected',
    };
}

// ============================================================================
// Domain Filtering
// ============================================================================

function isEcommerceUrl(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return ECOMMERCE_DOMAINS.some(domain => hostname.includes(domain));
    } catch {
        return false;
    }
}

function isTicketingAllowed(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return TICKETING_ALLOWLIST.some(domain => hostname.includes(domain));
    } catch {
        return false;
    }
}

export function filterByDomainGate(items: EvidenceItem[], domain: IntentDomain): EvidenceItem[] {
    return items.filter(item => {
        // Ticketing: Use allowlist (strict)
        if (domain === 'ticketing') {
            if (!isTicketingAllowed(item.url)) {
                console.log(`[domain-gate] BLOCKED non-ticketing URL: ${item.url}`);
                return false;
            }
            return true;
        }

        // Travel: Block ecommerce (blacklist)
        if (domain === 'travel' && isEcommerceUrl(item.url)) {
            console.log(`[domain-gate] BLOCKED ecommerce URL from travel: ${item.url}`);
            return false;
        }

        // Ecommerce: Block ticketing
        if (domain === 'ecommerce' && isTicketingAllowed(item.url)) {
            console.log(`[domain-gate] BLOCKED ticketing URL from ecommerce: ${item.url}`);
            return false;
        }

        return true;
    });
}

// ============================================================================
// Missing Constraints
// ============================================================================

export function getMissingConstraints(domain: IntentDomain, query: string): {
    constraints: string[];
    cta_buttons: Array<{ label: string; action: string; key?: string }>;
} {
    const constraints: string[] = [];
    const cta_buttons: Array<{ label: string; action: string; key?: string }> = [];

    if (domain === 'ticketing' || domain === 'travel') {
        if (!/\d{1,2}月|\d{4}年|\d{1,2}[\/\-]\d{1,2}|今天|明天|后天|周[一二三四五六日]/.test(query)) {
            constraints.push('出发日期');
            cta_buttons.push({ label: '补充日期', action: 'add_constraint', key: 'date' });
        }
        if (!/直飞|中转|转机/.test(query)) {
            constraints.push('中转偏好');
        }
        if (!/经济舱|商务舱|头等舱/.test(query)) {
            constraints.push('舱位偏好');
        }
    }

    if (domain === 'ecommerce') {
        if (!/\d+[元块]|预算/.test(query)) {
            constraints.push('预算范围');
            cta_buttons.push({ label: '设置预算', action: 'add_constraint', key: 'budget' });
        }
    }

    // Default CTAs
    if (cta_buttons.length === 0) {
        cta_buttons.push(
            { label: '只查官方渠道', action: 'retry_official_only' },
            { label: '稍后重试', action: 'retry' }
        );
    }

    return { constraints, cta_buttons };
}

// ============================================================================
// Vertex AI Grounding API Call
// ============================================================================

export async function callVertexGrounding(
    apiKey: string,
    query: string,
    maxItems: number = 5,
    model: string = 'gemini-2.5-flash'
): Promise<{
    items: EvidenceItem[];
    groundingQueries: string[];
    httpStatus: number;
}> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                parts: [{ text: query }],
            },
        ],
        tools: [{ google_search: {} }],  // Enable Google Search Grounding
        generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 1024,
        },
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = new Error(`Vertex API error: ${response.status}`);
        (error as any).httpStatus = response.status;
        throw error;
    }

    const data = await response.json();
    const items: EvidenceItem[] = [];
    const groundingQueries: string[] = [];

    // Parse grounding metadata
    const candidate = data.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata) {
        // Extract search queries used
        if (groundingMetadata.webSearchQueries) {
            groundingQueries.push(...groundingMetadata.webSearchQueries);
        }

        // Extract grounding chunks (citations)
        const chunks = groundingMetadata.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.web) {
                const url = chunk.web.uri || '';
                items.push({
                    title: chunk.web.title || 'Source',
                    snippet: '',  // Will be filled from supports
                    url,
                    source_name: extractSourceName(url),
                });
            }
        }

        // Fill snippets from grounding supports
        const supports = groundingMetadata.groundingSupports || [];
        for (const support of supports) {
            const segment = support.segment?.text || '';
            const indices = support.groundingChunkIndices || [];
            for (const idx of indices) {
                if (items[idx] && !items[idx].snippet) {
                    items[idx].snippet = segment.substring(0, 200);
                }
            }
        }
    }

    // Filter and limit items
    return {
        items: items.filter(it => it.url).slice(0, maxItems),
        groundingQueries,
        httpStatus: response.status,
    };
}

function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

// ============================================================================
// Main Service Function
// ============================================================================

export async function liveSearchWithVertexGrounding(
    request: LiveSearchRequest,
    apiKey: string
): Promise<LiveSearchResponse> {
    const startTime = Date.now();
    const trace_id = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const stages: StageTrace[] = [];

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
        const { query, locale = 'zh-CN', intent_domain, max_items = 5 } = request;

        // Stage 1: Router decision
        const route_decision = intent_domain
            ? { intent_domain, needs_live_data: true, needs_interaction: false, reason: 'Explicit domain' }
            : classifyDomain(query);
        addStage('router_decision', true, undefined, { domain: route_decision.intent_domain });

        // Get TTL for this domain
        const ttl_seconds = TTL_BY_DOMAIN[route_decision.intent_domain];

        // Stage 2: Vertex request
        addStage('vertex_request_sent', true, undefined, { query });

        let items: EvidenceItem[];
        let groundingQueries: string[] = [];
        let httpStatus = 200;

        try {
            const result = await callVertexGrounding(apiKey, query, max_items);
            items = result.items;
            groundingQueries = result.groundingQueries;
            httpStatus = result.httpStatus;
            addStage('vertex_response_recv', true, undefined, { http_status: httpStatus, raw_items: items.length });
        } catch (error: any) {
            httpStatus = error.httpStatus || 500;
            addStage('vertex_response_recv', false, error.message, { http_status: httpStatus });

            // Map HTTP status to error code
            let errorCode: FailureCode = 'internal_error';
            if (httpStatus === 429) errorCode = 'quota';
            else if (httpStatus === 401 || httpStatus === 403) errorCode = 'auth';
            else if (httpStatus >= 500) errorCode = 'provider_error';

            addStage('fallback_triggered', true, undefined, { error_code: errorCode });

            const { constraints, cta_buttons } = getMissingConstraints(route_decision.intent_domain, query);

            return {
                success: false,
                trace_id,
                error: {
                    code: errorCode,
                    message: error.message,
                    retryable: errorCode !== 'auth',
                },
                fallback: {
                    failure_reason: `API 调用失败 (${httpStatus})`,
                    missing_constraints: constraints,
                    cta_buttons,
                },
                stages,
            };
        }

        // Stage 3: Parse grounding
        addStage('parse_grounding', items.length > 0, items.length === 0 ? 'No grounding chunks' : undefined, {
            items_count: items.length,
            grounding_queries: groundingQueries,
        });

        // Stage 4: Domain filter
        const filteredItems = filterByDomainGate(items, route_decision.intent_domain);
        const filteredCount = items.length - filteredItems.length;
        addStage('domain_filter', true, undefined, {
            before: items.length,
            after: filteredItems.length,
            filtered_out: filteredCount,
        });

        // Check if we have results after filtering
        if (filteredItems.length === 0) {
            addStage('fallback_triggered', true, undefined, { reason: 'no_results_after_filter' });

            const { constraints, cta_buttons } = getMissingConstraints(route_decision.intent_domain, query);

            return {
                success: false,
                trace_id,
                error: {
                    code: 'no_results',
                    message: '未找到符合条件的实时信息',
                    retryable: true,
                },
                fallback: {
                    failure_reason: '未能获取实时证据',
                    missing_constraints: constraints.length ? constraints : ['出发日期', '出发地', '目的地'],
                    cta_buttons,
                },
                stages,
            };
        }

        // Stage 5: Compose answer
        const evidence: EvidencePack = {
            items: filteredItems,
            fetched_at: Date.now(),
            ttl_seconds,
            provider: 'vertex_grounding',
            confidence: Math.min(1, 0.2 + 0.15 * filteredItems.length),
            notes: {
                cache_hit: false,
                grounding_queries: groundingQueries,
            },
        };

        addStage('compose_answer', true, undefined, {
            items_count: evidence.items.length,
            top_domains: evidence.items.slice(0, 3).map(i => i.source_name),
        });

        console.log(`[vertex-grounding] trace_id=${trace_id} Success: ${evidence.items.length} items, TTL=${ttl_seconds}s`);

        return {
            success: true,
            trace_id,
            evidence,
            route_decision,
            stages,
        };

    } catch (error: any) {
        console.error(`[vertex-grounding] trace_id=${trace_id} Fatal error:`, error);

        addStage('fallback_triggered', true, error.message, { fatal: true });

        return {
            success: false,
            trace_id,
            error: {
                code: 'internal_error',
                message: error.message || 'Unknown error',
                retryable: true,
            },
            fallback: {
                failure_reason: '内部错误',
                missing_constraints: [],
                cta_buttons: [{ label: '稍后重试', action: 'retry' }],
            },
            stages,
        };
    }
}

// ============================================================================
// Export
// ============================================================================

export default {
    liveSearchWithVertexGrounding,
    classifyDomain,
    filterByDomainGate,
    getMissingConstraints,
    callVertexGrounding,
};

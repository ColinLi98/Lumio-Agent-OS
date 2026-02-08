/**
 * Tool Registry - 工具注册中心
 * 
 * Converts skills into Gemini FunctionDeclaration format for autonomous agent use.
 * This enables the "Brain" to dynamically select tools without hardcoded logic.
 */

import { GoogleGenAI } from '@google/genai';
import { getTavilyClient } from './tavilyClient.js';
import type { AgentDomain, EvidenceLevel, CostTier } from './agentMarketplaceTypes.js';
import { buildApiUrl } from './apiBaseUrl.js';

// ============================================================================
// Types
// ============================================================================

/**
 * JSON Schema types for Gemini FunctionDeclaration parameters
 */
export interface ToolParameterSchema {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    enum?: string[];
    items?: ToolParameterSchema;
    properties?: Record<string, ToolParameterSchema>;
    required?: string[];
}

/**
 * Tool interface - compatible with Gemini Function Calling
 */
export interface Tool {
    name: string;
    description: string;  // Critical: Instructions for the Brain on WHEN to use this
    parameters: {
        type: 'object';
        properties: Record<string, ToolParameterSchema>;
        required?: string[];
    };
    execute: (args: Record<string, any>) => Promise<any>;
    // Profiling metadata for Digital Twin
    profiling?: {
        target_dimension: 'consumption' | 'knowledge' | 'personality';
        instruction: string;
    };
    // Agent Marketplace metadata
    marketplace?: {
        domains: AgentDomain[];
        capabilities: string[];
        supports_realtime: boolean;
        evidence_level: EvidenceLevel;
        supports_parallel: boolean;
        avg_latency_ms?: number;
        success_rate?: number;
        cost_tier?: CostTier;
    };
}

export interface ToolRuntimeStats {
    invocations: number;
    success_count: number;
    failure_count: number;
    avg_latency_ms: number;
    success_rate: number;
    last_updated_at: number;
}

/**
 * Gemini FunctionDeclaration format (uses string types for compatibility)
 */
export interface GeminiFunctionDeclaration {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

// ============================================================================
// Global API Key (set by external services)
// ============================================================================

let globalApiKey: string = '';

export function setToolRegistryApiKey(apiKey: string) {
    globalApiKey = apiKey;
    console.log('[ToolRegistry] API Key configured');
}

// ============================================================================
// Price Compare Tool
// ============================================================================

const priceCompareTool: Tool = {
    name: 'price_compare',
    description: `搜索【电商实物商品】在各大平台（京东、淘宝、拼多多）的价格并进行对比。

⚠️ 仅用于可购买的实物商品，例如：手机、耳机、电脑、家电、服装等。

❌ 不适用于：
- 金融产品：黄金、期货、股票、基金、比特币、外汇
- 虚拟服务：会员、流量、游戏充值
- 无法在电商购买的东西

使用场景：
- 用户询问某【实物商品】的价格（例如"iPhone 多少钱"、"AirPods 价格"）
- 用户想比较不同电商平台的商品价格
- 用户询问某商品是否值得购买、贵不贵
关键词：买、购买、某某多少钱（必须是实物商品）`,
    parameters: {
        type: 'object',
        properties: {
            product: {
                type: 'string',
                description: '要查询价格的商品名称，例如"iPhone 15"、"AirPods Pro"、"索尼降噪耳机"'
            },
            budget: {
                type: 'number',
                description: '可选的预算上限（人民币）'
            },
            platform: {
                type: 'string',
                description: '可选的指定平台',
                enum: ['all', 'jd', 'taobao', 'pdd', 'amazon']
            }
        },
        required: ['product']
    },
    execute: async (args) => {
        const { product, budget, platform = 'all' } = args;

        if (!globalApiKey) {
            return generateFallbackPriceData(product, budget);
        }

        try {
            const ai = new GoogleGenAI({ apiKey: globalApiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `我需要查询 "${product}" 在中国电商平台的价格信息。

请搜索各电商平台（京东、淘宝、拼多多）上 "${product}" 的当前售价。

必须返回以下 JSON 格式：
{
    "products": [
        {
            "model": "${product}",
            "specs": "主要规格",
            "platforms": [
                {"name": "京东", "price": 数字, "url": "https://search.jd.com/Search?keyword=${encodeURIComponent(product)}"},
                {"name": "淘宝", "price": 数字, "url": "https://s.taobao.com/search?q=${encodeURIComponent(product)}"},
                {"name": "拼多多", "price": 数字, "url": "https://mobile.pinduoduo.com/search_result.html?search_key=${encodeURIComponent(product)}"}
            ]
        }
    ],
    "category": "类别",
    "brand": "品牌"
}

注意：price 必须是数字，不是字符串。`,
                config: {
                    systemInstruction: '你是一个电商价格查询助手。返回纯 JSON 格式，不要有任何解释文字。',
                    tools: [{ googleSearch: {} }]
                }
            });

            const text = response.text;
            if (text) {
                const parsed = parseJsonResponse(text);
                if (parsed?.products) {
                    return formatPriceResult(parsed, product);
                }
            }
        } catch (error) {
            console.error('[PriceCompareTool] Error:', error);
        }

        return generateFallbackPriceData(product, budget);
    },
    profiling: {
        target_dimension: 'consumption',
        instruction: 'Analyze price sensitivity (Budget vs Premium) and platform preference.'
    },
    marketplace: {
        domains: ['shopping', 'general'],
        capabilities: ['price_compare', 'web_search'],
        supports_realtime: false,
        evidence_level: 'weak',
        supports_parallel: true,
        avg_latency_ms: 3000,
        success_rate: 0.85,
        cost_tier: 'mid',
    }
};

// ============================================================================
// Web Search Tool
// ============================================================================

const webSearchTool: Tool = {
    name: 'web_search',
    description: `搜索互联网获取最新信息、新闻、知识、行情和解答。

✅ 适用于：
- 金融行情：黄金价格、期货、股票、比特币、汇率
- 知识问答：某人是谁、某个概念是什么
- 实时信息：新闻、热点、天气
- 教程搜索：如何做某事、wiki

使用场景：
- 用户询问金融产品价格（例如\"黄金多少钱\"、\"茅台股价\"、\"比特币行情\"）
- 用户询问某人或某事物是谁/是什么
- 用户想了解某个梗、热点、新闻
- 用户寻找教程、wiki、解释
关键词：价格（非实物商品）、行情、是谁、什么梗、含义、新闻`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: '搜索关键词或问题'
            },
            topic: {
                type: 'string',
                description: '可选的主题分类',
                enum: ['general', 'news', 'tech', 'entertainment', 'science']
            }
        },
        required: ['query']
    },
    execute: async (args) => {
        const { query } = args;

        try {
            // Use Tavily for real-time search
            const tavily = getTavilyClient();
            const response = await tavily.quickSearch(query, 5);

            return {
                success: true,
                query,
                answer: response.answer,
                results: response.sources.map(s => ({
                    title: s.title,
                    snippet: s.snippet,
                    url: s.url,
                    source: new URL(s.url).hostname
                })),
                summary: response.answer,
                relatedQueries: []
            };
        } catch (error) {
            console.error('[WebSearchTool] Tavily error:', error);
            // Fallback to generated data
            return generateFallbackSearchData(query);
        }
    },
    profiling: {
        target_dimension: 'knowledge',
        instruction: 'Analyze curiosity depth and topic interests.'
    },
    marketplace: {
        domains: ['general', 'finance', 'education', 'shopping', 'health', 'legal'],
        capabilities: ['web_search', 'live_search', 'knowledge_qa'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 2000,
        success_rate: 0.90,
        cost_tier: 'low',
    }
};

// ============================================================================
// Knowledge QA Tool (High EQ Replies)
// ============================================================================

const knowledgeQATool: Tool = {
    name: 'knowledge_qa',
    description: `提供高情商回复、润色文字、帮助用户措辞得体。
使用场景：
- 用户询问如何回复某条消息
- 用户想润色自己的表达
- 用户想礼貌地拒绝或同意某事
- 用户需要帮助写一段得体的回复
关键词：怎么回、润色、礼貌一点、拒绝他、同意、措辞`,
    parameters: {
        type: 'object',
        properties: {
            context: {
                type: 'string',
                description: '需要回复的消息或场景描述'
            },
            tone: {
                type: 'string',
                description: '期望的语气',
                enum: ['polite', 'firm', 'friendly', 'professional', 'casual']
            },
            intent: {
                type: 'string',
                description: '回复的意图',
                enum: ['accept', 'decline', 'ask', 'clarify', 'thank', 'apologize']
            }
        },
        required: ['context']
    },
    execute: async (args) => {
        const { context, tone = 'polite', intent = 'clarify' } = args;

        if (!globalApiKey) {
            return { success: true, reply: `关于"${context}"，我建议你可以这样回复...` };
        }

        try {
            const ai = new GoogleGenAI({ apiKey: globalApiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `帮我写一个${tone === 'polite' ? '礼貌' : tone === 'firm' ? '坚定' : '得体'}的回复：

场景/原消息：${context}
意图：${intent === 'decline' ? '婉拒' : intent === 'accept' ? '接受' : '回应'}

请提供3个不同风格的回复选项，返回 JSON：
{
    "replies": [
        { "style": "简洁版", "text": "回复内容" },
        { "style": "温和版", "text": "回复内容" },
        { "style": "专业版", "text": "回复内容" }
    ],
    "tips": "回复建议"
}`
            });

            const text = response.text;
            if (text) {
                const parsed = parseJsonResponse(text);
                if (parsed?.replies) {
                    return { success: true, ...parsed };
                }
            }
        } catch (error) {
            console.error('[KnowledgeQATool] Error:', error);
        }

        return {
            success: true,
            replies: [
                { style: '参考回复', text: `好的，我明白了。关于这件事，我会再考虑一下。` }
            ]
        };
    },
    profiling: {
        target_dimension: 'personality',
        instruction: 'Analyze communication style preferences and social interaction patterns.'
    },
    marketplace: {
        domains: ['general', 'productivity'],
        capabilities: ['knowledge_qa'],
        supports_realtime: false,
        evidence_level: 'none',
        supports_parallel: true,
        avg_latency_ms: 2500,
        success_rate: 0.92,
        cost_tier: 'low',
    }
};

// ============================================================================
// Phase 3.4: Live Search Tool (Real-time Travel/Local Data)
// ============================================================================

// Import only client-safe modules (no server-side code like liveSearchService)
import { classifyFreshness, createStructuredFallback, type IntentDomain, type StructuredFallback } from './freshnessClassifier.js';
import { buildFlightActionLinks, parseFlightConstraints } from './flightConstraintParser.js';

// Type definitions for API response
interface LiveSearchAPIResponse {
    success: boolean;
    action_links?: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }>;
    quote_cards?: Array<{
        quote_id: string;
        provider: string;
        dep_time: string;
        arr_time: string;
        price_text: string;
        transfers_text: string;
        source_url: string;
        fetched_at: string;
        objective_score?: number;
    }>;
    normalized_quotes?: Array<{
        quote_id: string;
        provider: string;
        dep_time: string;
        arr_time: string;
        price: number;
        currency: string;
        transfers: number;
        source_url: string;
        fetched_at: string;
        objective_score?: number;
    }>;
    optimizer?: {
        objective: string;
        selected_quote_id: string;
        alternatives_count: number;
    };
    normalized?: {
        kind?: string;
        items?: any[];
        links?: Array<{ title: string; url: string; source?: string }>;
        local_results?: any[];
        shopping_results?: any[];
        review_results?: any[];
    };
    local_results?: any[];
    shopping_results?: any[];
    evidence?: {
        provider: string;
        fetched_at: string | number;
        ttl_seconds: number;
        query_normalized?: string;
        intent_domain?: string;
        confidence?: number;
        items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
        notes?: { confidence: number; warnings: string[]; cache_hit?: boolean };
    };
    error?: {
        code: string;
        message: string;
        retryable: boolean;
        reason_code: string;
    };
    fallback?: StructuredFallback;
    route_decision?: {
        intent_domain: string;
        needs_live_data: boolean;
        reason: string;
        missing_constraints?: string[];
    };
}

function hasStructuredFlightEvidence(
    items: Array<{ title: string; snippet: string; url: string; source_name: string }> | undefined
): boolean {
    if (!Array.isArray(items) || items.length === 0) return false;
    let structuredSignals = 0;

    for (const item of items) {
        const text = `${item.title || ''} ${item.snippet || ''}`;
        if (/(航班|机票|flight|airline|起飞|抵达|直飞|转机)/i.test(text)) {
            structuredSignals += 1;
        }
        if (/\b([01]?\d|2[0-3]):[0-5]\d\b/.test(text)) {
            structuredSignals += 1;
        }
        if (/([¥￥$]\s?\d{2,5})|(\d{2,5}\s?(元|cny|rmb))/i.test(text)) {
            structuredSignals += 1;
        }
    }

    return structuredSignals >= 2;
}

const liveSearchTool: Tool = {
    name: 'live_search',
    description: `获取【实时数据】，适用于需要最新信息的查询。

⚠️ 必须用于以下场景（needs_live_data=true）：
- 机票/航班查询：伦敦到大连的机票、北京飞上海多少钱
- 火车票/高铁：北京到上海的高铁票
- 酒店住宿：某地今晚的酒店
- 金融行情：股票、黄金、比特币价格
- 实时票价：最新价格、今天的价格

✅ 返回内容：
- 实时搜索结果（带时间戳和TTL）
- 来源链接和置信度

使用规则：
- 凡是涉及"机票/车票/航班/时刻表/价格/今天/最新"必须调用此工具
- 不可编造价格或链接，必须使用返回的实时数据
- 如果搜索失败，返回缺失约束的提示，不要编造答案`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: '用户的原始查询，例如"北京到上海的机票"'
            },
            intent_domain: {
                type: 'string',
                description: '意图领域',
                enum: ['travel.flight', 'travel.train', 'travel.hotel', 'ecommerce.product', 'local.service', 'knowledge', 'finance', 'news']
            },
            locale: {
                type: 'string',
                description: '语言区域，默认zh-CN'
            }
        },
        required: ['query']
    },
    execute: async (args) => {
        const { query, intent_domain, locale = 'zh-CN' } = args;

        // Auto-detect domain if not provided
        const routeDecision = classifyFreshness(query);
        const domain = (intent_domain || routeDecision.intent_domain) as IntentDomain;
        const parsedConstraints = parseFlightConstraints(query);
        const generatedActionLinks = buildFlightActionLinks(parsedConstraints);
        const normalizedConstraints = (parsedConstraints.origin || parsedConstraints.destination || parsedConstraints.departureDate)
            ? {
                origin: parsedConstraints.origin,
                destination: parsedConstraints.destination,
                date: parsedConstraints.departureDate,
                time_window: parsedConstraints.departureWindow,
                cabin: parsedConstraints.travelClass,
                passengers: parsedConstraints.passengers,
                time_priority_mode: parsedConstraints.timePriorityMode,
                departure_time_preference: parsedConstraints.departureTimePreference,
            }
            : undefined;

        console.log(`[LiveSearchTool] Query: "${query}", Domain: ${domain}, NeedsLive: ${routeDecision.needs_live_data}`);

        try {
            // Call the API endpoint via fetch (browser-compatible)
            const response = await fetch(buildApiUrl('/api/live-search'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    locale,
                    intent_domain: domain,
                    max_items: 5,
                    constraints: normalizedConstraints,
                }),
            });

            const rawText = await response.text();
            let result: LiveSearchAPIResponse;
            try {
                result = rawText ? JSON.parse(rawText) : { success: false } as LiveSearchAPIResponse;
            } catch {
                result = {
                    success: false,
                    error: {
                        code: 'UPSTREAM_NON_JSON',
                        message: 'live-search 返回了非 JSON 响应',
                        retryable: true,
                        reason_code: 'parse_error',
                    },
                } as LiveSearchAPIResponse;
            }

            if (!response.ok) {
                result = {
                    ...result,
                    success: false,
                    error: {
                        code: result?.error?.code || `HTTP_${response.status}`,
                        message: result?.error?.message || `live-search 服务异常（${response.status}）`,
                        retryable: true,
                        reason_code: result?.error?.reason_code || 'provider_error',
                    },
                };
            }

            if (result.success && result.evidence) {
                const evidence = result.evidence;
                const isWeakFlightEvidence = domain === 'travel.flight' && !hasStructuredFlightEvidence(evidence.items);
                const actionLinks = result.action_links?.length
                    ? result.action_links
                    : generatedActionLinks;
                const fallbackQuoteCards = Array.isArray(result.normalized_quotes)
                    ? result.normalized_quotes.slice(0, 5).map((quote) => ({
                        quote_id: quote.quote_id,
                        provider: quote.provider,
                        dep_time: quote.dep_time,
                        arr_time: quote.arr_time,
                        price_text: `${quote.currency} ${quote.price}`,
                        transfers_text: quote.transfers > 0 ? `${quote.transfers} 次中转` : '直飞',
                        source_url: quote.source_url,
                        fetched_at: quote.fetched_at,
                        objective_score: quote.objective_score,
                    }))
                    : [];
                const quoteCards = Array.isArray(result.quote_cards) && result.quote_cards.length > 0
                    ? result.quote_cards.slice(0, 5)
                    : fallbackQuoteCards;
                const confidence = typeof evidence.confidence === 'number'
                    ? evidence.confidence
                    : evidence.notes?.confidence ?? 0.8;
                // Format fetched_at for display
                const fetchedAtDate = new Date(evidence.fetched_at);
                const fetchedAtDisplay = fetchedAtDate.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return {
                    success: true,
                    skillId: 'live_search',
                    skillName: '实时搜索',
                    evidence,
                    fetched_at: evidence.fetched_at,
                    fetched_at_display: fetchedAtDisplay,
                    ttl_seconds: evidence.ttl_seconds,
                    is_live: true,
                    confidence,
                    items: evidence.items,
                    sources: evidence.items.map(item => ({
                        title: item.title,
                        url: item.url,
                        source_name: item.source_name,
                    })),
                    quote_cards: quoteCards,
                    normalized_quotes: result.normalized_quotes || [],
                    optimizer: result.optimizer,
                    normalized: result.normalized,
                    local_results: Array.isArray(result.local_results)
                        ? result.local_results
                        : Array.isArray(result.normalized?.local_results)
                            ? result.normalized?.local_results
                            : [],
                    shopping_results: Array.isArray(result.shopping_results)
                        ? result.shopping_results
                        : Array.isArray(result.normalized?.shopping_results)
                            ? result.normalized?.shopping_results
                            : [],
                    action_links: actionLinks.map((link) => ({
                        ...link,
                        supports_time_filter: isWeakFlightEvidence ? false : Boolean(link.supports_time_filter),
                    })),
                    cache_hit: evidence.notes?.cache_hit ?? false,
                    route_decision: result.route_decision || routeDecision,
                };
            } else {
                // Return structured fallback - NEVER fabricate data
                const fallback = result.fallback || createStructuredFallback(
                    domain,
                    result.error?.message || 'Search failed',
                    routeDecision.missing_constraints
                );

                return {
                    success: false,
                    skillId: 'live_search',
                    skillName: '实时搜索',
                    error: result.error || { code: 'UNKNOWN', message: 'Search failed' },
                    fallback,
                    action_links: (result.action_links?.length ? result.action_links : generatedActionLinks).map((link) => ({
                        ...link,
                        supports_time_filter: false,
                    })),
                    is_live: false,
                    route_decision: result.route_decision || routeDecision,
                    instruction: '搜索失败，请不要编造价格或链接。向用户展示缺失的约束条件，并请求补充信息。'
                };
            }
        } catch (fetchError) {
            console.error('[LiveSearchTool] Fetch error:', fetchError);

            // Network/fetch error - return structured fallback
            const fallback = createStructuredFallback(
                domain,
                'Network error - unable to reach search service',
                routeDecision.missing_constraints
            );

            return {
                success: false,
                skillId: 'live_search',
                skillName: '实时搜索',
                error: {
                    code: 'NETWORK_ERROR',
                    message: fetchError instanceof Error ? fetchError.message : 'Network error',
                },
                fallback,
                action_links: generatedActionLinks.map((link) => ({
                    ...link,
                    supports_time_filter: false,
                })),
                is_live: false,
                route_decision: routeDecision,
                instruction: '网络错误，请不要编造价格或链接。'
            };
        }
    },
    marketplace: {
        domains: ['travel', 'finance', 'shopping', 'local_service', 'general'],
        capabilities: ['live_search', 'flight_search', 'hotel_search', 'price_compare', 'local_search', 'shopping_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 4000,
        success_rate: 0.80,
        cost_tier: 'mid',
    }
};

// ============================================================================
// Web Exec Tool (4.1 Routing Policy - Browser Automation Fallback)
// ============================================================================

interface WebExecAPIResponse {
    success: boolean;
    trace_id: string;
    steps: Array<{
        step_id: number;
        action_type: string;
        value?: string;
        selector?: string;
        timestamp: number;
        success: boolean;
        error?: string;
    }>;
    artifacts: Array<{
        type: string;
        path: string;
        timestamp: number;
        description?: string;
    }>;
    evidence: {
        items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
        fetched_at: number;
    };
    extracted: Record<string, any>;
    error?: {
        code: string;
        message: string;
        retryable: boolean;
        retry_suggestions?: string[];
    };
    blocked_reason?: string;
    requires_approval?: boolean;
}

const webExecTool: Tool = {
    name: 'web_exec',
    description: `执行浏览器自动化任务（仅支持只读操作）。

⚠️ 使用场景（live_search 失败后的备选）：
- 需要在特定网站查询信息（如携程机票查询页面）
- 提取结构化数据（航班列表、价格表）
- 任务型查询需要交互但不涉及登录/支付

✅ 支持的操作（只读）：
- 导航到指定URL
- 提取页面内容
- 截取页面快照

❌ 不支持（需用户授权）：
- 登录、支付、下单、提交表单

返回内容：
- steps[]: 执行的步骤序列
- artifacts[]: DOM快照、截图等
- evidence.items[]: 提取的结构化信息`,
    parameters: {
        type: 'object',
        properties: {
            task_description: {
                type: 'string',
                description: '任务描述，例如"查询北京到上海的航班"'
            },
            target_url: {
                type: 'string',
                description: '目标网站URL，例如"https://ctrip.com"'
            },
            step_budget: {
                type: 'number',
                description: '最大步骤数（默认10）'
            }
        },
        required: ['task_description', 'target_url']
    },
    execute: async (args) => {
        const { task_description, target_url, step_budget = 10 } = args;

        console.log(`[WebExecTool] Task: "${task_description}", URL: ${target_url}`);

        try {
            const response = await fetch(buildApiUrl('/api/web-exec'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_description,
                    target_url,
                    step_budget,
                    timeout_ms: 60000,
                    require_user_approval: true
                }),
            });

            const result: WebExecAPIResponse = await response.json();

            if (result.success) {
                return {
                    success: true,
                    skillId: 'web_exec',
                    skillName: '浏览器执行',
                    trace_id: result.trace_id,
                    steps: result.steps,
                    artifacts: result.artifacts,
                    evidence: result.evidence,
                    extracted: result.extracted,
                    is_live: true,
                    instruction: '使用 evidence.items 中的数据回答用户问题，并引用来源。'
                };
            } else {
                // Execution blocked or failed
                return {
                    success: false,
                    skillId: 'web_exec',
                    skillName: '浏览器执行',
                    trace_id: result.trace_id,
                    error: result.error,
                    blocked_reason: result.blocked_reason,
                    requires_approval: result.requires_approval,
                    steps: result.steps,
                    is_live: false,
                    instruction: result.error?.retry_suggestions?.join(' ') || '执行失败，请不要编造数据。'
                };
            }
        } catch (fetchError) {
            console.error('[WebExecTool] Fetch error:', fetchError);
            return {
                success: false,
                skillId: 'web_exec',
                skillName: '浏览器执行',
                error: {
                    code: 'NETWORK_ERROR',
                    message: fetchError instanceof Error ? fetchError.message : 'Network error',
                    retryable: true,
                    retry_suggestions: ['检查网络连接', '稍后重试']
                },
                is_live: false,
                instruction: '网络错误，请不要编造数据。'
            };
        }
    },
    marketplace: {
        domains: ['travel', 'shopping', 'general'],
        capabilities: ['web_search', 'live_search'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: false,
        avg_latency_ms: 8000,
        success_rate: 0.70,
        cost_tier: 'high',
    }
};

// ============================================================================
// Broadcast Intent Tool (LIX - Intent Exchange)
// ============================================================================

import { lixMarketService } from './marketService.js';
import type { IntentCategory } from './lixTypes.js';

const broadcastIntentTool: Tool = {
    name: 'broadcast_intent',
    description: `将用户的需求意图广播到 Lumi 意图交易市场（LIX），获取来自商家(B2C)和其他用户(C2C)的报价/合作offer。

适用场景：
1. **购买意向** (purchase): 用户想购买商品，广播到多个平台获取最优报价
2. **求职/招聘** (job): 用户在找工作或寻找人才
3. **合作/技能交换** (collaboration): 用户寻求设计、开发等服务，支持技能交换

使用时机：
- 用户说"我想买..."、"帮我找..."、"谁能帮我..."
- 用户表达预算有限、想找人合作
- 用户寻求专业服务（设计、开发、翻译等）

关键词：找人、合作、外包、设计、预算有限、技能交换、招聘`,
    parameters: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: '意图类别：purchase(购买)、job(求职招聘)、collaboration(合作)',
                enum: ['purchase', 'job', 'collaboration']
            },
            item: {
                type: 'string',
                description: '具体需求描述，例如"Logo设计"、"iPhone 16"、"React前端开发"'
            },
            budget: {
                type: 'number',
                description: '可选：预算上限（人民币）'
            }
        },
        required: ['category', 'item']
    },
    execute: async (args) => {
        const { category, item, budget } = args;

        // ================================================================
        // Domain Guard: HARD GATE - Block ALL non-commerce categories
        // This is the definitive enforcement layer
        // ================================================================
        const ALLOWED_COMMERCE_CATEGORIES = ['purchase', 'shopping', 'commerce', 'product'];
        const isCommerce = ALLOWED_COMMERCE_CATEGORIES.includes(category as string);

        if (!isCommerce) {
            console.log(`[DomainGuard] BLOCKED: category=${category}`);
            return {
                blocked: true,
                reason: 'DOMAIN_GUARD',
                success: false,
                skillId: 'broadcast_intent',
                skillName: 'LIX 意图交易',
                message: `此类需求（${category}）建议使用专业渠道，已为您生成计划步骤。`,
                domain_guard_blocked: true,
                blocked_category: category,
                // Contract layer: explicit debug info
                allow_market_fanout: false,
                blocked_tools: ['broadcast_intent'],
            };
        }

        const response = await lixMarketService.broadcast({
            category: category as IntentCategory,
            payload: item,
            budget: budget ? Number(budget) : undefined
        });

        if (response.status === 'no_matches') {
            return {
                success: false,
                skillId: 'broadcast_intent',
                skillName: 'LIX 意图交易',
                message: '暂无匹配的报价，您的需求已广播到市场，稍后可能会有回应。',
                broadcastReach: response.broadcast_reach,
                intentId: response.intent_id
            };
        }

        // Format ranked offers for UI display
        const offers = response.ranked_offers.map(ro => ({
            rank: ro.rank,
            provider: ro.offer.provider.name,
            providerId: ro.offer.provider.id,  // e.g., 'jd', 'pdd', 'taobao'
            providerType: ro.offer.provider.type,
            price: ro.offer.price.amount,
            currency: ro.offer.price.currency,
            reputation: ro.offer.provider.reputation_score,
            verified: ro.offer.provider.verified,
            deliveryEta: ro.offer.fulfillment?.delivery_eta,
            score: Math.floor(ro.total_score * 100),
            explanation: ro.explanation,
            scoreBreakdown: ro.score_breakdown,
            // Real provider indicators
            isLive: response.provider_source === 'real' || response.provider_source === 'mixed',
            scrapedAt: ro.offer.price_proof?.proof_timestamp
        }));

        return {
            success: true,
            skillId: 'broadcast_intent',
            skillName: 'LIX 意图交易',
            intentId: response.intent_id,
            traceId: response.trace.trace_id,  // End-to-end trace
            totalOffers: response.total_offers_received,
            broadcastReach: response.broadcast_reach,
            latencyMs: response.latency_ms,
            providerSource: response.provider_source,  // 'real' | 'mock' | 'mixed'
            offers,
            message: `已广播到 ${response.broadcast_reach}+ 个潜在服务方，收到 ${response.total_offers_received} 个报价`
        };
    },
    // 🔥 High-Value Profiling: Trading intent reveals true needs and spending power
    profiling: {
        target_dimension: 'consumption',
        instruction: 'Analyze the trade intent. If purchase: estimate spending power and brand preferences. If collaboration: log professional needs and skill gaps.'
    },
    marketplace: {
        domains: ['shopping', 'recruitment', 'general'],
        capabilities: ['price_compare', 'job_sourcing'],
        supports_realtime: true,
        evidence_level: 'strong',
        supports_parallel: true,
        avg_latency_ms: 5000,
        success_rate: 0.75,
        cost_tier: 'mid',
    }
};

const broadcastAgentRequirementTool: Tool = {
    name: 'broadcast_agent_requirement',
    description: `当 Agent Marketplace 没有足够可用 agent 时，将需求发布到 LIX 专家市场，寻求“可交付的新 agent 方案”。`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: '用户原始需求描述',
            },
            domain: {
                type: 'string',
                description: '需求领域（可选）',
                enum: ['recruitment', 'travel', 'finance', 'health', 'legal', 'education', 'shopping', 'productivity', 'local_service', 'general'],
            },
            required_capabilities: {
                type: 'array',
                description: '希望新 agent 覆盖的能力标签',
                items: {
                    type: 'string',
                    description: 'capability',
                },
            },
            requester_agent_id: {
                type: 'string',
                description: '触发发布需求的 agent_id（可选）',
            },
            requester_agent_name: {
                type: 'string',
                description: '触发发布需求的 agent 名称（可选）',
            },
        },
        required: ['query'],
    },
    execute: async (args) => {
        const query = String(args.query || '').trim();
        if (!query) {
            return {
                success: false,
                skillId: 'broadcast_agent_requirement',
                skillName: 'LIX 专家交付',
                error: {
                    code: 'INVALID_ARGS',
                    message: 'query 不能为空',
                },
            };
        }

        const domain = typeof args.domain === 'string' ? args.domain : 'general';
        const requiredCapabilities = Array.isArray(args.required_capabilities)
            ? args.required_capabilities.map((item: unknown) => String(item || '').trim()).filter(Boolean)
            : [];
        const requesterAgentId = String(args.requester_agent_id || '').trim();
        const requesterAgentName = String(args.requester_agent_name || '').trim();

        try {
            const response = await fetch(buildApiUrl('/api/lix/solution/broadcast'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    requester_id: 'demo_user',
                    requester_type: 'agent',
                    requester_agent_id: requesterAgentId || undefined,
                    requester_agent_name: requesterAgentName || undefined,
                    query,
                    domain,
                    required_capabilities: requiredCapabilities,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
                return {
                    success: false,
                    skillId: 'broadcast_agent_requirement',
                    skillName: 'LIX 专家交付',
                    error: {
                        code: `HTTP_${response.status}`,
                        message: payload?.error || 'broadcast_failed',
                    },
                };
            }

            return {
                success: true,
                skillId: 'broadcast_agent_requirement',
                skillName: 'LIX 专家交付',
                intentId: payload.intent_id,
                offersCount: payload.offers_count || 0,
                status: payload.status,
                intent: payload.intent,
                message: '需求已发布到 LIX 专家市场，可选择方案并交付新 agent',
            };
        } catch (error) {
            return {
                success: false,
                skillId: 'broadcast_agent_requirement',
                skillName: 'LIX 专家交付',
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'network_error',
                },
            };
        }
    },
    marketplace: {
        domains: ['recruitment', 'travel', 'finance', 'health', 'legal', 'education', 'shopping', 'productivity', 'local_service', 'general'],
        capabilities: ['agent_requirement_broadcast', 'expert_matching'],
        supports_realtime: true,
        evidence_level: 'weak',
        supports_parallel: true,
        avg_latency_ms: 2000,
        success_rate: 0.95,
        cost_tier: 'low',
    },
};

// ============================================================================
// Tool Registry Implementation
// ============================================================================

class ToolRegistry {
    private tools: Map<string, Tool> = new Map();
    private runtimeStats: Map<string, {
        invocations: number;
        success_count: number;
        failure_count: number;
        total_latency_ms: number;
        last_updated_at: number;
    }> = new Map();

    constructor() {
        // Register default tools
        this.register(priceCompareTool);
        this.register(webSearchTool);
        this.register(knowledgeQATool);
        this.register(liveSearchTool);  // Phase 3.4: Live search for travel/local
        this.register(webExecTool);     // 4.1: Browser automation fallback
        this.register(broadcastIntentTool);  // LIX Market Tool
        this.register(broadcastAgentRequirementTool); // LIX expert solution channel
    }

    /**
     * Register a new tool
     */
    register(tool: Tool): void {
        const originalExecute = tool.execute;
        const wrappedTool: Tool = {
            ...tool,
            execute: async (args: Record<string, any>) => {
                const start = Date.now();
                try {
                    const result = await originalExecute(args);
                    const success = result?.success !== false;
                    this.recordRuntimeStats(tool.name, success, Date.now() - start);
                    return result;
                } catch (error) {
                    this.recordRuntimeStats(tool.name, false, Date.now() - start);
                    throw error;
                }
            }
        };

        this.tools.set(tool.name, wrappedTool);
        console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
    }

    /**
     * Get a tool by name
     */
    getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    /**
     * Get all tools as Gemini FunctionDeclaration format
     */
    getGeminiTools(): GeminiFunctionDeclaration[] {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'OBJECT',
                properties: this.convertParameters(tool.parameters.properties),
                required: tool.parameters.required
            }
        }));
    }

    /**
     * Get all registered tool names
     */
    getToolNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * Get all tools with their marketplace metadata (for Agent Marketplace discovery)
     */
    getAllToolsWithMeta(): Tool[] {
        return Array.from(this.tools.values()).map((tool) => {
            if (!tool.marketplace) return tool;
            const stats = this.getToolRuntimeStats(tool.name);
            if (!stats || stats.invocations === 0) return tool;

            return {
                ...tool,
                marketplace: {
                    ...tool.marketplace,
                    avg_latency_ms: stats.avg_latency_ms,
                    success_rate: stats.success_rate,
                },
            };
        });
    }

    getToolRuntimeStats(name: string): ToolRuntimeStats | undefined {
        const stat = this.runtimeStats.get(name);
        if (!stat || stat.invocations === 0) return undefined;
        return {
            invocations: stat.invocations,
            success_count: stat.success_count,
            failure_count: stat.failure_count,
            avg_latency_ms: Math.round(stat.total_latency_ms / stat.invocations),
            success_rate: Number((stat.success_count / stat.invocations).toFixed(4)),
            last_updated_at: stat.last_updated_at,
        };
    }

    getAllToolRuntimeStats(): Record<string, ToolRuntimeStats> {
        const out: Record<string, ToolRuntimeStats> = {};
        for (const name of this.runtimeStats.keys()) {
            const stats = this.getToolRuntimeStats(name);
            if (stats) out[name] = stats;
        }
        return out;
    }

    private recordRuntimeStats(name: string, success: boolean, latencyMs: number): void {
        const prev = this.runtimeStats.get(name) || {
            invocations: 0,
            success_count: 0,
            failure_count: 0,
            total_latency_ms: 0,
            last_updated_at: Date.now(),
        };

        prev.invocations += 1;
        if (success) {
            prev.success_count += 1;
        } else {
            prev.failure_count += 1;
        }
        prev.total_latency_ms += Math.max(0, latencyMs);
        prev.last_updated_at = Date.now();
        this.runtimeStats.set(name, prev);
    }

    /**
     * Convert our parameter schema to Gemini's format
     */
    private convertParameters(props: Record<string, ToolParameterSchema>): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(props)) {
            const param: any = {
                type: this.getGeminiType(value.type),
                description: value.description,
                ...(value.enum && { enum: value.enum })
            };
            // Array types require an `items` descriptor
            if (value.type === 'array' && value.items) {
                param.items = {
                    type: this.getGeminiType(value.items.type),
                    ...(value.items.description && { description: value.items.description }),
                    ...(value.items.enum && { enum: value.items.enum }),
                };
            }
            // Nested object types need `properties` + optional `required`
            if (value.type === 'object' && value.properties) {
                param.properties = this.convertParameters(value.properties);
                if (value.required) {
                    param.required = value.required;
                }
            }
            result[key] = param;
        }
        return result;
    }

    private getGeminiType(type: string): string {
        switch (type) {
            case 'string': return 'STRING';
            case 'number': return 'NUMBER';
            case 'boolean': return 'BOOLEAN';
            case 'array': return 'ARRAY';
            case 'object': return 'OBJECT';
            default: return 'STRING';
        }
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJsonResponse(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        // Try extracting from markdown code block
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch { }
        }
        // Try finding JSON object boundaries
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx > startIdx) {
            try {
                return JSON.parse(text.substring(startIdx, endIdx + 1));
            } catch { }
        }
        return null;
    }
}

/**
 * Format price comparison result
 */
function formatPriceResult(data: any, product: string): any {
    const products = (data.products || []).map((p: any) => ({
        model: p.model || product,
        specs: p.specs || '',
        platforms: (p.platforms || [])
            .map((plat: any) => ({
                name: plat.name,
                price: plat.price,
                url: plat.url || generateSearchUrl(plat.name, p.model || product),
                inStock: plat.inStock !== false
            }))
            .filter((p: any) => typeof p.price === 'number' && !isNaN(p.price))
            .sort((a: any, b: any) => a.price - b.price)
    }));

    // Find lowest price
    let lowestPrice = Infinity;
    let lowestPlatform = '';
    let lowestModel = '';

    products.forEach((p: any) => {
        p.platforms.forEach((plat: any) => {
            if (plat.price < lowestPrice) {
                lowestPrice = plat.price;
                lowestPlatform = plat.name;
                lowestModel = p.model;
            }
        });
    });

    return {
        success: true,
        query: product,
        brand: data.brand || '',
        category: data.category || '商品',
        products,
        lowestPrice: lowestPrice === Infinity ? null : lowestPrice,
        lowestPlatform,
        lowestModel,
        recommendation: lowestPrice !== Infinity
            ? `${lowestModel} 最低价 ¥${lowestPrice} 在${lowestPlatform}`
            : '暂无价格信息'
    };
}

/**
 * Generate platform search URL
 */
function generateSearchUrl(platform: string, product: string): string {
    const encoded = encodeURIComponent(product);
    switch (platform) {
        case '京东': return `https://www.google.com/search?q=${encoded}+site:jd.com`;
        case '淘宝': return `https://www.google.com/search?q=${encoded}+site:taobao.com`;
        case '拼多多': return `https://www.google.com/search?q=${encoded}+site:pinduoduo.com`;
        case 'Amazon': return `https://www.amazon.com/s?k=${encoded}`;
        default: return `https://www.google.com/search?q=${encoded}+购买`;
    }
}

/**
 * Fallback price data when API fails
 */
function generateFallbackPriceData(product: string, budget?: number): any {
    const platforms = ['京东', '淘宝', '拼多多'];
    const basePrice = estimatePrice(product);

    const results = platforms.map(platform => ({
        name: platform,
        price: Math.round(basePrice * (0.9 + Math.random() * 0.2)),
        url: generateSearchUrl(platform, product),
        inStock: true
    })).sort((a, b) => a.price - b.price);

    return {
        success: true,
        query: product,
        products: [{
            model: product,
            specs: '点击链接查看详情',
            platforms: results
        }],
        lowestPrice: results[0].price,
        lowestPlatform: results[0].name,
        recommendation: `${product} 预估最低价 ¥${results[0].price}`,
        isEstimate: true
    };
}

function estimatePrice(product: string): number {
    const lower = product.toLowerCase();
    if (/airpods|耳机/.test(lower)) return 1500;
    if (/iphone|手机/.test(lower)) return 7000;
    if (/ipad|平板/.test(lower)) return 4000;
    if (/macbook|笔记本/.test(lower)) return 9000;
    return 1000;
}

/**
 * Fallback search data
 */
function generateFallbackSearchData(query: string): any {
    return {
        success: true,
        query,
        results: [{
            title: `搜索 "${query}"`,
            snippet: '点击查看 Google 搜索结果',
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            source: 'Google'
        }],
        summary: `请点击链接查看 "${query}" 的搜索结果`
    };
}

// ============================================================================
// Singleton Export
// ============================================================================

let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
    if (!registryInstance) {
        registryInstance = new ToolRegistry();
    }
    return registryInstance;
}

export { ToolRegistry };

/**
 * Tool Registry - 工具注册中心
 * 
 * Converts skills into Gemini FunctionDeclaration format for autonomous agent use.
 * This enables the "Brain" to dynamically select tools without hardcoded logic.
 */

import { GoogleGenAI } from '@google/genai';
import { getTavilyClient } from './tavilyClient';

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
    }
};

// ============================================================================
// Phase 3.4: Live Search Tool (Real-time Travel/Local Data)
// ============================================================================

// Import only client-safe modules (no server-side code like liveSearchService)
import { classifyFreshness, createStructuredFallback, type IntentDomain, type StructuredFallback } from './freshnessClassifier';
import { buildFlightActionLinks, parseFlightConstraints } from './flightConstraintParser';

// Type definitions for API response
interface LiveSearchAPIResponse {
    success: boolean;
    action_links?: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }>;
    evidence?: {
        provider: string;
        fetched_at: string;
        ttl_seconds: number;
        query_normalized: string;
        intent_domain: string;
        items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
        notes: { confidence: number; warnings: string[]; cache_hit?: boolean };
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

        console.log(`[LiveSearchTool] Query: "${query}", Domain: ${domain}, NeedsLive: ${routeDecision.needs_live_data}`);

        try {
            // Call the API endpoint via fetch (browser-compatible)
            const response = await fetch('/api/live-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    locale,
                    intent_domain: domain,
                    max_items: 5,
                }),
            });

            const result: LiveSearchAPIResponse = await response.json();

            if (result.success && result.evidence) {
                const evidence = result.evidence;
                const isWeakFlightEvidence = domain === 'travel.flight' && !hasStructuredFlightEvidence(evidence.items);
                const actionLinks = result.action_links?.length
                    ? result.action_links
                    : generatedActionLinks;
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
                    confidence: evidence.notes?.confidence ?? 0.8,
                    items: evidence.items,
                    sources: evidence.items.map(item => ({
                        title: item.title,
                        url: item.url,
                        source_name: item.source_name,
                    })),
                    action_links: isWeakFlightEvidence ? actionLinks.map((link) => ({
                        ...link,
                        supports_time_filter: false,
                    })) : undefined,
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
            const response = await fetch('/api/web-exec', {
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
    }
};

// ============================================================================
// Broadcast Intent Tool (LIX - Intent Exchange)
// ============================================================================

import { lixMarketService } from './marketService';
import type { IntentCategory } from './lixTypes';

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
    }
};

// ============================================================================
// Tool Registry Implementation
// ============================================================================

class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    constructor() {
        // Register default tools
        this.register(priceCompareTool);
        this.register(webSearchTool);
        this.register(knowledgeQATool);
        this.register(liveSearchTool);  // Phase 3.4: Live search for travel/local
        this.register(webExecTool);     // 4.1: Browser automation fallback
        this.register(broadcastIntentTool);  // LIX Market Tool
    }

    /**
     * Register a new tool
     */
    register(tool: Tool): void {
        this.tools.set(tool.name, tool);
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
     * Convert our parameter schema to Gemini's format
     */
    private convertParameters(props: Record<string, ToolParameterSchema>): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(props)) {
            result[key] = {
                type: this.getGeminiType(value.type),
                description: value.description,
                ...(value.enum && { enum: value.enum })
            };
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

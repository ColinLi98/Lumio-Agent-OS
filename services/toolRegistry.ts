/**
 * Tool Registry
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
        policy_tags?: string[];
        required_permissions?: string[];
        safety_level?: 'decision_support_only' | 'bounded_execution' | 'standard';
        last_verified_at?: number;
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
    description: `Compare prices for purchasable physical products across e-commerce platforms (JD, Taobao, Pinduoduo).

⚠️ Use only for real physical goods (phones, headphones, laptops, appliances, clothing, etc.).

❌ Not suitable for:
- Financial assets (gold, futures, stocks, funds, crypto, FX)
- Virtual services (memberships, mobile data, game top-ups)
- Non-purchasable items

Typical use cases:
- User asks product price (e.g. "How much is iPhone 15?")
- User wants cross-platform price comparison
- User asks whether a product is worth buying`,
    parameters: {
        type: 'object',
        properties: {
            product: {
                type: 'string',
                description: 'Product name to compare, e.g. "iPhone 15", "AirPods Pro", "Sony noise-canceling headphones"'
            },
            budget: {
                type: 'number',
                description: 'Optional budget cap (CNY)'
            },
            platform: {
                type: 'string',
                description: 'Optional platform filter',
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
                contents: `I need current price information for "${product}" from major Chinese e-commerce platforms.

Please search JD, Taobao, and Pinduoduo for current prices of "${product}".

Return strictly in this JSON format:
{
    "products": [
        {
            "model": "${product}",
            "specs": "main specs",
            "platforms": [
                {"name": "JD", "price": 1234, "url": "https://search.jd.com/Search?keyword=${encodeURIComponent(product)}"},
                {"name": "Taobao", "price": 1234, "url": "https://s.taobao.com/search?q=${encodeURIComponent(product)}"},
                {"name": "Pinduoduo", "price": 1234, "url": "https://mobile.pinduoduo.com/search_result.html?search_key=${encodeURIComponent(product)}"}
            ]
        }
    ],
    "category": "category",
    "brand": "brand"
}

Important: "price" must be a number, not a string.`,
                config: {
                    systemInstruction: 'You are an e-commerce price lookup assistant. Return pure JSON only, with no explanation.',
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
    description: `Search the web for latest information, news, knowledge, market data, and explanations.

✅ Suitable for:
- Financial markets (gold, stocks, crypto, FX)
- Knowledge Q&A ("who is", "what is")
- Real-time info (news, weather, trends)
- Tutorials and wiki-style lookups`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query or question'
            },
            topic: {
                type: 'string',
                description: 'Optional topic category',
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
    description: `Help draft socially appropriate replies, rewrite phrasing, and improve tone.
Use cases:
- User asks how to reply to a message
- User wants text polishing
- User needs a polite decline/accept response
- User needs tactful communication options`,
    parameters: {
        type: 'object',
        properties: {
            context: {
                type: 'string',
                description: 'Message context or scenario to respond to'
            },
            tone: {
                type: 'string',
                description: 'Desired tone',
                enum: ['polite', 'firm', 'friendly', 'professional', 'casual']
            },
            intent: {
                type: 'string',
                description: 'Reply intent',
                enum: ['accept', 'decline', 'ask', 'clarify', 'thank', 'apologize']
            }
        },
        required: ['context']
    },
    execute: async (args) => {
        const { context, tone = 'polite', intent = 'clarify' } = args;

        if (!globalApiKey) {
            return { success: true, reply: `For "${context}", you could reply like this...` };
        }

        try {
            const ai = new GoogleGenAI({ apiKey: globalApiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Write a ${tone} reply for this context.

Scenario / original message: ${context}
Intent: ${intent}

Provide 3 reply options in different styles and return JSON:
{
    "replies": [
        { "style": "Concise", "text": "reply text" },
        { "style": "Warm", "text": "reply text" },
        { "style": "Professional", "text": "reply text" }
    ],
    "tips": "reply suggestions"
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
                { style: 'Reference reply', text: 'Understood. I will think this through and get back to you.' }
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
    description: `Fetch real-time data for freshness-sensitive queries.

⚠️ Must be used when needs_live_data=true, including:
- Flight or rail ticket pricing/schedules
- Hotel availability for specific dates
- Financial quotes (stocks, gold, crypto)
- "today/latest/current price" style requests

✅ Returns:
- Live search results with timestamp and TTL
- Source links and confidence

Rules:
- Do not fabricate prices or links
- If search fails, report missing constraints and ask for required inputs`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Original user query, e.g. "flight from Beijing to Shanghai"'
            },
            intent_domain: {
                type: 'string',
                description: 'Intent domain',
                enum: ['travel.flight', 'travel.train', 'travel.hotel', 'ecommerce.product', 'local.service', 'knowledge', 'finance', 'news']
            },
            locale: {
                type: 'string',
                description: 'Locale, default zh-CN'
            }
        },
        required: ['query']
    },
    execute: async (args) => {
        const { query, intent_domain, locale = 'en-GB' } = args;

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
                        message: 'live-search returned a non-JSON response',
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
                        message: result?.error?.message || `live-search service error (${response.status})`,
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
                        transfers_text: quote.transfers > 0 ? `${quote.transfers} transfer(s)` : 'Nonstop',
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
                const fetchedAtDisplay = fetchedAtDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return {
                    success: true,
                    skillId: 'live_search',
                    skillName: 'Live Search',
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
                    skillName: 'Live Search',
                    error: result.error || { code: 'UNKNOWN', message: 'Search failed' },
                    fallback,
                    action_links: (result.action_links?.length ? result.action_links : generatedActionLinks).map((link) => ({
                        ...link,
                        supports_time_filter: false,
                    })),
                    is_live: false,
                    route_decision: result.route_decision || routeDecision,
                    instruction: 'Search failed. Do not fabricate prices or links. Show missing constraints and request required details.'
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
                skillName: 'Live Search',
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
                instruction: 'Network error. Do not fabricate prices or links.'
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
    description: `Execute browser automation tasks in read-only mode.

⚠️ Use as fallback when live_search is insufficient:
- Query specific websites
- Extract structured data (lists, tables, prices)
- Handle task-like interactions without login/payment

✅ Supported operations:
- Navigate to URL
- Extract page content
- Capture page snapshots

❌ Not supported without explicit user approval:
- Login, payment, order submission, form submission

Returns:
- steps[]: execution step sequence
- artifacts[]: snapshots/screenshots
- evidence.items[]: extracted structured data`,
    parameters: {
        type: 'object',
        properties: {
            task_description: {
                type: 'string',
                description: 'Task description, e.g. "search flights from Beijing to Shanghai"'
            },
            target_url: {
                type: 'string',
                description: 'Target website URL, e.g. "https://ctrip.com"'
            },
            step_budget: {
                type: 'number',
                description: 'Maximum steps (default 10)'
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
                    skillName: 'Web Executor',
                    trace_id: result.trace_id,
                    steps: result.steps,
                    artifacts: result.artifacts,
                    evidence: result.evidence,
                    extracted: result.extracted,
                    is_live: true,
                    instruction: 'Answer using data from evidence.items and cite sources.'
                };
            } else {
                // Execution blocked or failed
                return {
                    success: false,
                    skillId: 'web_exec',
                    skillName: 'Web Executor',
                    trace_id: result.trace_id,
                    error: result.error,
                    blocked_reason: result.blocked_reason,
                    requires_approval: result.requires_approval,
                    steps: result.steps,
                    is_live: false,
                    instruction: result.error?.retry_suggestions?.join(' ') || 'Execution failed. Do not fabricate data.'
                };
            }
        } catch (fetchError) {
            console.error('[WebExecTool] Fetch error:', fetchError);
            return {
                success: false,
                skillId: 'web_exec',
                skillName: 'Web Executor',
                error: {
                    code: 'NETWORK_ERROR',
                    message: fetchError instanceof Error ? fetchError.message : 'Network error',
                    retryable: true,
                    retry_suggestions: ['Check network connection', 'Try again later']
                },
                is_live: false,
                instruction: 'Network error. Do not fabricate data.'
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
    description: `Broadcast user intent to the Lumi Intent Exchange (LIX) to collect B2C and C2C offers.

Scenarios:
1. purchase: user wants to buy a product and compare offers
2. job: user is looking for jobs or candidates
3. collaboration: user seeks services (design, development, translation, etc.)`,
    parameters: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: 'Intent category: purchase, job, collaboration',
                enum: ['purchase', 'job', 'collaboration']
            },
            item: {
                type: 'string',
                description: 'Requirement description, e.g. "Logo design", "iPhone 16", "React frontend development"'
            },
            budget: {
                type: 'number',
                description: 'Optional budget cap (CNY)'
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
                skillName: 'LIX Intent Exchange',
                message: `This request category (${category}) should use specialized channels. A structured plan has been generated.`,
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
                skillName: 'LIX Intent Exchange',
                message: 'No matching offers yet. Your request has been broadcast and new responses may arrive later.',
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
            skillName: 'LIX Intent Exchange',
            intentId: response.intent_id,
            traceId: response.trace.trace_id,  // End-to-end trace
            totalOffers: response.total_offers_received,
            broadcastReach: response.broadcast_reach,
            latencyMs: response.latency_ms,
            providerSource: response.provider_source,  // 'real' | 'mock' | 'mixed'
            offers,
            message: `Broadcast reached ${response.broadcast_reach}+ potential providers and received ${response.total_offers_received} offer(s).`
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
    description: `When Agent Marketplace lacks suitable agents, publish requirements to LIX expert market for deliverable new-agent solutions.`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Original user requirement',
            },
            domain: {
                type: 'string',
                description: 'Requirement domain (optional)',
                enum: ['recruitment', 'travel', 'finance', 'health', 'legal', 'education', 'shopping', 'productivity', 'local_service', 'general'],
            },
            required_capabilities: {
                type: 'array',
                description: 'Capability labels expected from the new agent',
                items: {
                    type: 'string',
                    description: 'capability',
                },
            },
            requester_agent_id: {
                type: 'string',
                description: 'Requesting agent ID (optional)',
            },
            requester_agent_name: {
                type: 'string',
                description: 'Requesting agent name (optional)',
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
                skillName: 'LIX Expert Delivery',
                error: {
                    code: 'INVALID_ARGS',
                    message: 'query cannot be empty',
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
                    skillName: 'LIX Expert Delivery',
                    error: {
                        code: `HTTP_${response.status}`,
                        message: payload?.error || 'broadcast_failed',
                    },
                };
            }

            return {
                success: true,
                skillId: 'broadcast_agent_requirement',
                skillName: 'LIX Expert Delivery',
                intentId: payload.intent_id,
                offersCount: payload.offers_count || 0,
                status: payload.status,
                intent: payload.intent,
                message: 'Requirement has been published to LIX expert market. You can review offers and proceed to delivery.',
            };
        } catch (error) {
            return {
                success: false,
                skillId: 'broadcast_agent_requirement',
                skillName: 'LIX Expert Delivery',
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
        category: data.category || 'product',
        products,
        lowestPrice: lowestPrice === Infinity ? null : lowestPrice,
        lowestPlatform,
        lowestModel,
        recommendation: lowestPrice !== Infinity
            ? `${lowestModel} lowest price: ¥${lowestPrice} on ${lowestPlatform}`
            : 'No price data available'
    };
}

/**
 * Generate platform search URL
 */
function generateSearchUrl(platform: string, product: string): string {
    const encoded = encodeURIComponent(product);
    switch (platform) {
        case 'JD':
        case '京东': return `https://www.google.com/search?q=${encoded}+site:jd.com`;
        case 'Taobao':
        case '淘宝': return `https://www.google.com/search?q=${encoded}+site:taobao.com`;
        case 'Pinduoduo':
        case '拼多多': return `https://www.google.com/search?q=${encoded}+site:pinduoduo.com`;
        case 'Amazon': return `https://www.amazon.com/s?k=${encoded}`;
        default: return `https://www.google.com/search?q=${encoded}+buy`;
    }
}

/**
 * Fallback price data when API fails
 */
function generateFallbackPriceData(product: string, budget?: number): any {
    const platforms = ['JD', 'Taobao', 'Pinduoduo'];
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
            specs: 'Click link to view details',
            platforms: results
        }],
        lowestPrice: results[0].price,
        lowestPlatform: results[0].name,
        recommendation: `${product} estimated lowest price: ¥${results[0].price}`,
        isEstimate: true
    };
}

function estimatePrice(product: string): number {
    const lower = product.toLowerCase();
    if (/airpods|earbuds|headphones|耳机/.test(lower)) return 1500;
    if (/iphone|phone|smartphone|手机/.test(lower)) return 7000;
    if (/ipad|tablet|平板/.test(lower)) return 4000;
    if (/macbook|laptop|notebook|笔记本/.test(lower)) return 9000;
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
            title: `Search "${query}"`,
            snippet: 'Click to view Google search results',
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            source: 'Google'
        }],
        summary: `Click the link to view search results for "${query}".`
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

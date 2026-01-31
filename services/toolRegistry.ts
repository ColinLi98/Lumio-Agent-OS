/**
 * Tool Registry - 工具注册中心
 * 
 * Converts skills into Gemini FunctionDeclaration format for autonomous agent use.
 * This enables the "Brain" to dynamically select tools without hardcoded logic.
 */

import { GoogleGenAI } from '@google/genai';

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
        const { query, topic = 'general' } = args;

        if (!globalApiKey) {
            return generateFallbackSearchData(query);
        }

        try {
            const ai = new GoogleGenAI({ apiKey: globalApiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `搜索关于 "${query}" 的最新信息。返回 JSON 格式：
{
    "results": [
        {
            "title": "标题",
            "snippet": "摘要",
            "url": "链接",
            "source": "来源网站"
        }
    ],
    "summary": "一句话总结",
    "relatedQueries": ["相关搜索1", "相关搜索2"]
}`,
                config: {
                    systemInstruction: '你是一个搜索助手。使用 Google 搜索获取最新、最相关的信息。返回结构化的搜索结果。',
                    tools: [{ googleSearch: {} }]
                }
            });

            const text = response.text;
            if (text) {
                const parsed = parseJsonResponse(text);
                if (parsed?.results || parsed?.summary) {
                    return {
                        success: true,
                        query,
                        results: parsed.results || [],
                        summary: parsed.summary,
                        relatedQueries: parsed.relatedQueries || []
                    };
                }
            }
        } catch (error) {
            console.error('[WebSearchTool] Error:', error);
        }

        return generateFallbackSearchData(query);
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
// Tool Registry Implementation
// ============================================================================

class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    constructor() {
        // Register default tools
        this.register(priceCompareTool);
        this.register(webSearchTool);
        this.register(knowledgeQATool);
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

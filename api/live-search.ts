/**
 * Live Search API Endpoint - Vercel Serverless
 * 
 * POST /api/live-search
 * 
 * Uses Google Search Grounding via Gemini API.
 * API key must be set via GEMINI_API_KEY environment variable.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// Types
// ============================================================================

interface LiveSearchRequest {
    query: string;
    locale?: string;
    intent_domain?: string;
    max_items?: number;
}

interface LiveSearchSuccessResponse {
    success: true;
    evidence: {
        items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
        fetched_at: number;
        ttl_seconds: number;
        provider: string;
        confidence: number;
    };
    route_decision: {
        intent_domain: string;
        needs_live_data: boolean;
        needs_interaction: boolean;
        reason: string;
    };
    debug?: {
        webSearchQueries?: string[];
        cache_hit?: boolean;
    };
}

interface LiveSearchErrorResponse {
    success: false;
    error: { code: string; message: string; retryable?: boolean };
    fallback: {
        failure_reason: string;
        missing_constraints: string[];
        cta_buttons: Array<{ label: string; action: string }>;
    };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeQuery(q: string): string {
    return q.trim().replace(/\s+/g, " ");
}

function redactPII(q: string): string {
    q = q.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
    q = q.replace(/1[3-9]\d{9}/g, "[REDACTED_PHONE]");
    q = q.replace(/(\+?\d[\d\s-]{7,}\d)/g, "[REDACTED_PHONE]");
    q = q.replace(/\b\d{17}[\dXx]\b/g, "[REDACTED_ID]");
    q = q.replace(/\b\d{16,19}\b/g, "[REDACTED_CARD]");
    return q;
}

function inferDomain(query: string, intent_domain?: string): string {
    if (intent_domain) return intent_domain;
    const q = query.toLowerCase();
    const travelHints = ["机票", "航班", "车票", "火车票", "高铁", "时刻表", "余票", "航司", "登机", "站台", "飞机", "火车站", "机场", "train", "flight", "ticket", "airport"];
    const ecommerceHints = ["购买", "下单", "优惠券", "京东", "淘宝", "拼多多", "天猫", "闲鱼", "iphone", "macbook", "laptop", "买手机", "买电脑"];
    const financeHints = ["汇率", "利率", "股价", "股票", "btc", "eth", "黄金", "基金", "finance", "exchange rate"];
    if (travelHints.some(k => q.includes(k))) return "travel";
    if (financeHints.some(k => q.includes(k))) return "finance";
    if (ecommerceHints.some(k => q.includes(k))) return "ecommerce";
    return "knowledge";
}

function needsLiveDataByDomain(domain: string, query: string): { needs: boolean; needs_interaction: boolean; reason: string } {
    const q = query.toLowerCase();
    const timeWords = ["今天", "最新", "实时", "现在", "余票", "库存", "价格", "汇率", "天气", "today", "latest", "now", "price", "availability", "明天", "后天", "这周"];
    if (domain === "travel") {
        return { needs: true, needs_interaction: true, reason: `domain=travel forces live data` };
    }
    if (["finance", "news"].includes(domain)) {
        return { needs: true, needs_interaction: false, reason: `domain=${domain} implies live data` };
    }
    if (timeWords.some(w => q.includes(w))) {
        return { needs: true, needs_interaction: false, reason: `query contains time-sensitive keywords` };
    }
    return { needs: false, needs_interaction: false, reason: `no time-sensitive signal detected` };
}

function missingConstraints(domain: string, query: string): string[] {
    const q = query.toLowerCase();
    const missing: string[] = [];
    if (domain === "travel") {
        if (!/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(q) && !q.includes("今天") && !q.includes("明天") && !q.includes("后天")) {
            missing.push("出发日期");
        }
        if (!q.includes("到") && !q.includes("->") && !q.includes(" to ")) {
            missing.push("出发地");
            missing.push("目的地");
        }
    }
    return Array.from(new Set(missing));
}

function ttlByDomain(domain: string): number {
    if (domain === "travel") return 120;
    if (domain === "ecommerce") return 60;
    if (domain === "finance") return 120;
    return 300;
}

function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

function isEcommerceUrl(url: string): boolean {
    const ecommerceDomains = ['jd.com', 'taobao.com', 'tmall.com', 'pinduoduo.com', 'pdd.com', 'amazon.com', 'amazon.cn', 'ebay.com', 'aliexpress.com', 'xianyu.com', 'suning.com', 'dangdang.com'];
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return ecommerceDomains.some(d => hostname.includes(d));
    } catch {
        return false;
    }
}

function isTravelUrl(url: string): boolean {
    const travelDomains = ['ctrip.com', 'qunar.com', 'fliggy.com', 'ly.com', '12306.cn', 'booking.com', 'expedia.com', 'airbnb.com', 'trip.com', 'hotels.com', 'agoda.com', 'skyscanner.com', 'kayak.com'];
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return travelDomains.some(d => hostname.includes(d));
    } catch {
        return false;
    }
}

function calcConfidence(itemsCount: number): number {
    return Math.max(0, Math.min(1, 0.2 + 0.15 * itemsCount));
}

// ============================================================================
// Gemini Search Grounding
// ============================================================================

async function geminiSearchGrounding(
    apiKey: string,
    query: string,
    maxItems: number,
    domain: string
): Promise<{
    items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
    webSearchQueries: string[];
}> {
    const model = process.env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{ parts: [{ text: query }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
    };

    console.log(`[live-search] Calling Gemini Search Grounding: "${query}"`);

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error(`[live-search] Gemini error: ${resp.status}`, text);
        throw new Error(`Gemini Search Grounding failed: ${resp.status}`);
    }

    const data = await resp.json();
    const items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
    const webSearchQueries: string[] = [];

    const candidate = data.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata) {
        if (groundingMetadata.webSearchQueries) {
            webSearchQueries.push(...groundingMetadata.webSearchQueries);
        }

        const chunks = groundingMetadata.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.web) {
                const itemUrl = chunk.web.uri || "";
                const sourceName = extractSourceName(itemUrl);

                // Domain Gate
                if (domain === "travel" && isEcommerceUrl(itemUrl)) {
                    console.log(`[live-search] BLOCKED ecommerce URL from travel query: ${itemUrl}`);
                    continue;
                }
                if (domain === "ecommerce" && isTravelUrl(itemUrl)) {
                    continue;
                }

                items.push({
                    title: chunk.web.title || "Source",
                    snippet: "",
                    url: itemUrl,
                    source_name: sourceName
                });
            }
        }

        const supports = groundingMetadata.groundingSupports || [];
        for (const support of supports) {
            const segment = support.segment?.text || "";
            const indices = support.groundingChunkIndices || [];
            for (const idx of indices) {
                if (items[idx] && !items[idx].snippet) {
                    items[idx].snippet = segment;
                }
            }
        }
    }

    console.log(`[live-search] Gemini returned ${items.length} grounded results`);
    return { items: items.filter(it => it.url).slice(0, maxItems), webSearchQueries };
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const body = req.body as LiveSearchRequest;
        const queryRaw = String(body.query || "");

        if (!queryRaw.trim()) {
            const out: LiveSearchErrorResponse = {
                success: false,
                error: { code: "BAD_REQUEST", message: "query is required", retryable: false },
                fallback: {
                    failure_reason: "missing_query",
                    missing_constraints: ["查询内容"],
                    cta_buttons: [{ label: "重新输入", action: "edit_query" }]
                }
            };
            res.status(400).json(out);
            return;
        }

        const locale = body.locale || "zh-CN";
        const maxItems = Math.max(1, Math.min(10, body.max_items ?? 5));
        const normalized = normalizeQuery(queryRaw);
        const domain = inferDomain(normalized, body.intent_domain);
        const liveDecision = needsLiveDataByDomain(domain, normalized);

        const route_decision = {
            intent_domain: domain,
            needs_live_data: liveDecision.needs,
            needs_interaction: liveDecision.needs_interaction,
            reason: liveDecision.reason
        };

        console.log(`[live-search] Query: "${normalized}", Domain: ${domain}, NeedsLive: ${liveDecision.needs}`);

        if (!liveDecision.needs) {
            const out: LiveSearchSuccessResponse = {
                success: true,
                evidence: {
                    items: [],
                    fetched_at: Date.now(),
                    ttl_seconds: 0,
                    provider: "none",
                    confidence: 0
                },
                route_decision,
                debug: { cache_hit: false, webSearchQueries: [] }
            };
            res.status(200).json(out);
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            const out: LiveSearchErrorResponse = {
                success: false,
                error: { code: "NO_API_KEY", message: "Gemini API key not configured", retryable: false },
                fallback: {
                    failure_reason: "API密钥未配置",
                    missing_constraints: ["GEMINI_API_KEY"],
                    cta_buttons: [{ label: "配置API密钥", action: "configure_api" }]
                }
            };
            res.status(400).json(out);
            return;
        }

        const redacted = redactPII(normalized);

        let items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
        let webSearchQueries: string[] = [];

        try {
            const result = await geminiSearchGrounding(apiKey, redacted, maxItems, domain);
            items = result.items;
            webSearchQueries = result.webSearchQueries;
        } catch (e: any) {
            const missing = missingConstraints(domain, normalized);
            const out: LiveSearchErrorResponse = {
                success: false,
                error: { code: "UPSTREAM_SEARCH_FAILED", message: e?.message || "live search failed", retryable: true },
                fallback: {
                    failure_reason: "实时检索暂时不可用",
                    missing_constraints: missing,
                    cta_buttons: [
                        { label: "重试检索", action: "retry_live_search" },
                        { label: "补充关键信息", action: "fill_constraints" }
                    ]
                }
            };
            res.status(502).json(out);
            return;
        }

        if (!items.length) {
            const missing = missingConstraints(domain, normalized);
            const out: LiveSearchErrorResponse = {
                success: false,
                error: { code: "NO_RESULTS", message: "no live results found", retryable: true },
                fallback: {
                    failure_reason: "未找到相关实时信息",
                    missing_constraints: missing.length ? missing : ["出发地", "目的地", "出发日期"],
                    cta_buttons: [
                        { label: "换个说法再搜", action: "edit_query" },
                        { label: "补充关键信息", action: "fill_constraints" },
                        { label: "重试", action: "retry_live_search" }
                    ]
                }
            };
            res.status(200).json(out);
            return;
        }

        const ttl = ttlByDomain(domain);
        const evidence = {
            items,
            fetched_at: Date.now(),
            ttl_seconds: ttl,
            provider: "google_search_grounding",
            confidence: calcConfidence(items.length)
        };

        const out: LiveSearchSuccessResponse = {
            success: true,
            evidence,
            route_decision,
            debug: { cache_hit: false, webSearchQueries }
        };

        res.status(200).json(out);

    } catch (error) {
        console.error('[live-search] Error:', error);
        const out: LiveSearchErrorResponse = {
            success: false,
            error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error", retryable: true },
            fallback: {
                failure_reason: "内部错误",
                missing_constraints: [],
                cta_buttons: [{ label: "重试", action: "retry_live_search" }]
            }
        };
        res.status(500).json(out);
    }
}

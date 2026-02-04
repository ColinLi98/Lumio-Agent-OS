/**
 * Live Search API Endpoint - Vercel Serverless
 * Version: 6.1-6.5 Implementation
 * 
 * Features:
 * - 6.1: ticketing domain classification, domain gate
 * - 6.2: fallback hides ecommerce offers
 * - 6.3: EvidencePack cache with TTL
 * - 6.5: trace_id, failure classification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// Types
// ============================================================================

type IntentDomain = 'ticketing' | 'travel' | 'ecommerce' | 'knowledge' | 'local_life';
type FailureCode = 'network' | 'auth' | 'quota' | 'provider_blocked' | 'insufficient_constraints' | 'no_results' | 'timeout' | 'internal_error';

function generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

interface LiveSearchRequest {
    query: string;
    locale?: string;
    intent_domain?: IntentDomain;
    max_items?: number;
}

interface LiveSearchSuccessResponse {
    success: true;
    trace_id: string;
    evidence: {
        items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
        fetched_at: number;
        ttl_seconds: number;
        provider: string;
        confidence: number;
    };
    route_decision: {
        intent_domain: IntentDomain;
        needs_live_data: boolean;
        needs_interaction: boolean;
        reason: string;
    };
}

interface LiveSearchErrorResponse {
    success: false;
    trace_id: string;
    error: { code: FailureCode; message: string; retryable: boolean };
    fallback: {
        failure_reason: string;
        missing_constraints: string[];
        cta_buttons: Array<{ label: string; action: string; constraint_key?: string }>;
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

// 6.1: Domain Classification
function inferDomain(query: string, intent_domain?: IntentDomain): IntentDomain {
    if (intent_domain) return intent_domain;
    const q = query.toLowerCase();

    const ticketingHints = ["机票", "航班", "飞机票", "往返", "直飞", "经济舱", "商务舱", "车票", "火车票", "高铁", "动车", "时刻表", "余票", "车次", "登机", "站台", "机场", "火车站", "航司", "航空", "到", "出发", "抵达", "flight", "ticket", "train", "airport"];
    const hasRoutePattern = /[\u4e00-\u9fa5]+到[\u4e00-\u9fa5]+/.test(q);
    if (ticketingHints.some(k => q.includes(k)) || hasRoutePattern) return "ticketing";

    const travelHints = ["酒店", "住宿", "民宿", "旅游", "景点", "攻略", "行程", "度假", "hotel", "resort", "travel"];
    if (travelHints.some(k => q.includes(k))) return "travel";

    const localLifeHints = ["餐厅", "外卖", "美团", "饿了么", "打车", "滴滴", "电影", "门票"];
    if (localLifeHints.some(k => q.includes(k))) return "local_life";

    const ecommerceHints = ["购买", "下单", "优惠券", "京东", "淘宝", "拼多多", "天猫", "闲鱼", "iphone", "macbook", "laptop", "买手机", "买电脑"];
    if (ecommerceHints.some(k => q.includes(k))) return "ecommerce";

    return "knowledge";
}

function needsLiveDataByDomain(domain: IntentDomain, query: string): { needs: boolean; needs_interaction: boolean; reason: string } {
    const q = query.toLowerCase();
    const timeWords = ["今天", "最新", "实时", "现在", "余票", "库存", "价格", "汇率", "天气", "today", "latest", "now", "price", "availability", "明天", "后天"];

    if (domain === "ticketing") return { needs: true, needs_interaction: true, reason: "domain=ticketing requires live data" };
    if (domain === "travel") return { needs: true, needs_interaction: true, reason: "domain=travel requires live data" };
    if (domain === "local_life") return { needs: true, needs_interaction: false, reason: "domain=local_life implies live data" };
    if (timeWords.some(w => q.includes(w))) return { needs: true, needs_interaction: false, reason: "query contains time-sensitive keywords" };
    return { needs: false, needs_interaction: false, reason: "no time-sensitive signal detected" };
}

// 6.5: Missing Constraints
function getMissingConstraints(domain: IntentDomain, query: string): { constraints: string[]; cta_buttons: Array<{ label: string; action: string; constraint_key: string }> } {
    const q = query.toLowerCase();
    const constraints: string[] = [];
    const cta_buttons: Array<{ label: string; action: string; constraint_key: string }> = [];

    if (domain === "ticketing") {
        if (!/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(q) && !q.includes("今天") && !q.includes("明天") && !q.includes("后天")) {
            constraints.push("出发日期");
            cta_buttons.push({ label: "补充出发日期", action: "fill_constraint", constraint_key: "date" });
        }
        if (!q.includes("到") && !q.includes("->")) {
            constraints.push("出发地");
            constraints.push("目的地");
            cta_buttons.push({ label: "补充出发地/目的地", action: "fill_constraint", constraint_key: "route" });
        }
        cta_buttons.push({ label: "选择舱位偏好", action: "fill_constraint", constraint_key: "cabin" });
        cta_buttons.push({ label: "是否直飞", action: "fill_constraint", constraint_key: "direct" });
        cta_buttons.push({ label: "补充预算范围", action: "fill_constraint", constraint_key: "budget" });
    }

    cta_buttons.push({ label: "重试检索", action: "retry_live_search", constraint_key: "retry" });
    return { constraints: Array.from(new Set(constraints)), cta_buttons };
}

function ttlByDomain(domain: IntentDomain): number {
    if (domain === "ticketing") return 120;
    if (domain === "travel") return 300;
    if (domain === "ecommerce") return 60;
    if (domain === "local_life") return 180;
    return 300;
}

// 6.1: Domain Gate
const ECOMMERCE_DOMAINS = ['jd.com', 'taobao.com', 'tmall.com', 'pinduoduo.com', 'pdd.com', 'amazon.com', 'amazon.cn', 'ebay.com', 'aliexpress.com', 'xianyu.com', 'suning.com'];
const TICKETING_DOMAINS = ['ctrip.com', 'qunar.com', 'fliggy.com', 'ly.com', '12306.cn', 'booking.com', 'expedia.com', 'trip.com', 'skyscanner.com', 'kayak.com'];

function extractSourceName(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'unknown'; }
}

function isEcommerceUrl(url: string): boolean {
    try { const h = new URL(url).hostname.toLowerCase(); return ECOMMERCE_DOMAINS.some(d => h.includes(d)); } catch { return false; }
}

function isTicketingUrl(url: string): boolean {
    try { const h = new URL(url).hostname.toLowerCase(); return TICKETING_DOMAINS.some(d => h.includes(d)); } catch { return false; }
}

function filterByDomainGate(items: Array<{ title: string; snippet: string; url: string; source_name: string }>, domain: IntentDomain): typeof items {
    return items.filter(item => {
        if (domain === "ticketing" && isEcommerceUrl(item.url)) {
            console.log(`[domain-gate] BLOCKED ecommerce URL from ticketing: ${item.url}`);
            return false;
        }
        if (domain === "travel" && isEcommerceUrl(item.url)) return false;
        if (domain === "ecommerce" && isTicketingUrl(item.url)) return false;
        return true;
    });
}

function calcConfidence(itemsCount: number): number {
    return Math.max(0, Math.min(1, 0.2 + 0.15 * itemsCount));
}

function getFailureReason(code: FailureCode): string {
    switch (code) {
        case 'network': return '网络连接失败，请检查网络后重试';
        case 'auth': return '认证失败，API密钥无效或未配置';
        case 'quota': return 'API 配额已用尽，请稍后重试';
        case 'provider_blocked': return '搜索服务暂时不可用，请稍后重试';
        case 'insufficient_constraints': return '信息不足，请补充更多约束条件';
        case 'no_results': return '未找到相关实时信息';
        case 'timeout': return '请求超时，请重试';
        default: return '未知错误';
    }
}

// ============================================================================
// Gemini Search Grounding
// ============================================================================

async function geminiSearchGrounding(apiKey: string, query: string, maxItems: number, domain: IntentDomain): Promise<{
    items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
    webSearchQueries: string[];
}> {
    const model = process.env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error(`[live-search] Gemini error: ${resp.status}`, text);
        let failureCode: FailureCode = "internal_error";
        if (resp.status === 429) failureCode = "quota";
        else if (resp.status === 401 || resp.status === 403) failureCode = "auth";
        else if (resp.status >= 500) failureCode = "provider_blocked";
        const err = new Error(`Gemini Search Grounding failed: ${resp.status}`);
        (err as any).code = failureCode;
        throw err;
    }

    const data = await resp.json();
    let items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
    const webSearchQueries: string[] = [];

    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
        if (groundingMetadata.webSearchQueries) webSearchQueries.push(...groundingMetadata.webSearchQueries);

        const chunks = groundingMetadata.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.web) {
                items.push({
                    title: chunk.web.title || "Source",
                    snippet: "",
                    url: chunk.web.uri || "",
                    source_name: extractSourceName(chunk.web.uri || "")
                });
            }
        }

        const supports = groundingMetadata.groundingSupports || [];
        for (const support of supports) {
            const segment = support.segment?.text || "";
            for (const idx of (support.groundingChunkIndices || [])) {
                if (items[idx] && !items[idx].snippet) items[idx].snippet = segment;
            }
        }
    }

    // 6.1: Domain Gate
    items = filterByDomainGate(items, domain);

    console.log(`[live-search] Gemini returned ${items.length} grounded results`);
    return { items: items.filter(it => it.url).slice(0, maxItems), webSearchQueries };
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const trace_id = generateTraceId();

    try {
        const body = req.body as LiveSearchRequest;
        const queryRaw = String(body.query || "");

        if (!queryRaw.trim()) {
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: "insufficient_constraints", message: "query is required", retryable: false },
                fallback: { failure_reason: "缺少查询内容", missing_constraints: ["查询内容"], cta_buttons: [{ label: "重新输入", action: "edit_query", constraint_key: "query" }] }
            };
            res.status(400).json(response); return;
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

        console.log(`[live-search] trace_id=${trace_id}, Query: "${normalized}", Domain: ${domain}`);

        if (!liveDecision.needs) {
            const response: LiveSearchSuccessResponse = {
                success: true, trace_id,
                evidence: { items: [], fetched_at: Date.now(), ttl_seconds: 0, provider: "none", confidence: 0 },
                route_decision
            };
            res.status(200).json(response); return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: "auth", message: "Gemini API key not configured", retryable: false },
                fallback: { failure_reason: "API密钥未配置", missing_constraints: ["GEMINI_API_KEY"], cta_buttons: [{ label: "配置API密钥", action: "configure_api", constraint_key: "api_key" }] }
            };
            res.status(400).json(response); return;
        }

        const redacted = redactPII(normalized);
        let items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
        let webSearchQueries: string[] = [];

        try {
            const result = await geminiSearchGrounding(apiKey, redacted, maxItems, domain);
            items = result.items;
            webSearchQueries = result.webSearchQueries;
        } catch (e: any) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const errorCode: FailureCode = e.code || "provider_blocked";
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: errorCode, message: e?.message || "live search failed", retryable: true },
                fallback: { failure_reason: getFailureReason(errorCode), missing_constraints: constraints, cta_buttons }
            };
            res.status(502).json(response); return;
        }

        // 6.2: No results - show constraint CTAs, NOT ecommerce offers
        if (!items.length) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: "no_results", message: "no live results found", retryable: true },
                fallback: {
                    failure_reason: "未找到相关实时信息，请补充更多约束条件",
                    missing_constraints: constraints.length ? constraints : ["出发地", "目的地", "出发日期"],
                    cta_buttons
                }
            };
            res.status(200).json(response); return;
        }

        const ttl = ttlByDomain(domain);
        const evidence = {
            items,
            fetched_at: Date.now(),
            ttl_seconds: ttl,
            provider: "google_search_grounding",
            confidence: calcConfidence(items.length)
        };

        const response: LiveSearchSuccessResponse = { success: true, trace_id, evidence, route_decision };
        res.status(200).json(response);

    } catch (error) {
        const response: LiveSearchErrorResponse = {
            success: false, trace_id,
            error: { code: "internal_error", message: error instanceof Error ? error.message : "Unknown error", retryable: true },
            fallback: { failure_reason: "内部错误，请重试", missing_constraints: [], cta_buttons: [{ label: "重试", action: "retry_live_search", constraint_key: "retry" }] }
        };
        res.status(500).json(response);
    }
}

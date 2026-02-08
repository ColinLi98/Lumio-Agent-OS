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
import { buildFlightActionLinks, parseFlightConstraints, type FlightConstraints } from '../services/flightConstraintParser.js';
import {
    searchFlightsWithSerpApi,
    type FlightResult,
    type FlightSearchParams,
} from '../services/flightSearchService.js';
import { executeSerpApi, getServerSerpApiKey } from '../services/serpApiClient.js';
import type { SerpApiLocalItem, SerpApiShoppingItem } from '../services/serpApiTypes.js';

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
    intent_domain?: string;
    max_items?: number;
    constraints?: {
        origin?: string;
        destination?: string;
        date?: string;
        time_window?: string;
        cabin?: 'economy' | 'business' | 'first';
        passengers?: number;
        time_priority_mode?: 'prefer' | 'strict';
        departure_time_preference?: 'morning' | 'afternoon' | 'evening' | 'night';
    };
}

interface NormalizedQuote {
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
}

interface QuoteCard {
    quote_id: string;
    provider: string;
    dep_time: string;
    arr_time: string;
    price_text: string;
    transfers_text: string;
    source_url: string;
    fetched_at: string;
    objective_score?: number;
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
        query_normalized: string;
        intent_domain: IntentDomain;
        notes: {
            confidence: number;
            warnings: string[];
            cache_hit?: boolean;
        };
    };
    route_decision: {
        intent_domain: IntentDomain;
        needs_live_data: boolean;
        needs_interaction: boolean;
        reason: string;
    };
    action_links?: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }>;
    normalized_quotes?: NormalizedQuote[];
    quote_cards?: QuoteCard[];
    optimizer?: {
        objective: string;
        selected_quote_id: string;
        alternatives_count: number;
    };
    normalized?: any;
    local_results?: SerpApiLocalItem[];
    shopping_results?: SerpApiShoppingItem[];
}

interface LiveSearchErrorResponse {
    success: false;
    trace_id: string;
    error: { code: FailureCode; message: string; retryable: boolean };
    action_links?: Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }>;
    route_decision?: {
        intent_domain: IntentDomain;
        needs_live_data: boolean;
        needs_interaction: boolean;
        reason: string;
    };
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
function normalizeIncomingDomain(intentDomain?: string): IntentDomain | undefined {
    if (!intentDomain) return undefined;
    const normalized = intentDomain.trim().toLowerCase();

    const aliases: Record<string, IntentDomain> = {
        ticketing: 'ticketing',
        travel: 'travel',
        ecommerce: 'ecommerce',
        shopping: 'ecommerce',
        knowledge: 'knowledge',
        local_life: 'local_life',
        local_service: 'local_life',
        'travel.flight': 'ticketing',
        'travel.train': 'ticketing',
        'travel.hotel': 'travel',
        'ecommerce.product': 'ecommerce',
        'local.service': 'local_life',
        finance: 'knowledge',
        news: 'knowledge',
    };

    return aliases[normalized];
}

function inferDomain(query: string, intent_domain?: string): IntentDomain {
    const normalizedIntentDomain = normalizeIncomingDomain(intent_domain);
    if (normalizedIntentDomain) return normalizedIntentDomain;
    const q = query.toLowerCase();

    const ticketingHints = ["机票", "航班", "飞机票", "往返", "直飞", "经济舱", "商务舱", "车票", "火车票", "高铁", "动车", "时刻表", "余票", "车次", "登机", "站台", "机场", "火车站", "航司", "航空", "到", "出发", "抵达", "flight", "ticket", "train", "airport"];
    const hasRoutePattern = /[\u4e00-\u9fa5]+到[\u4e00-\u9fa5]+/.test(q);
    if (ticketingHints.some(k => q.includes(k)) || hasRoutePattern) return "ticketing";

    const travelHints = ["酒店", "住宿", "民宿", "旅游", "景点", "攻略", "行程", "度假", "hotel", "resort", "travel"];
    if (travelHints.some(k => q.includes(k))) return "travel";

    const localLifeHints = [
        "餐厅", "外卖", "美团", "饿了么", "打车", "滴滴", "电影", "门票",
        "咖啡", "咖啡店", "附近", "周边", "商家", "店", "按摩", "理发", "修车", "药店", "诊所",
        "restaurant", "cafe", "nearby", "store", "local"
    ];
    if (localLifeHints.some(k => q.includes(k))) return "local_life";

    const ecommerceHints = ["购买", "下单", "优惠券", "京东", "淘宝", "拼多多", "天猫", "闲鱼", "iphone", "macbook", "laptop", "买手机", "买电脑", "比价", "报价", "购物", "shopping", "deal"];
    if (ecommerceHints.some(k => q.includes(k))) return "ecommerce";

    return "knowledge";
}

function needsLiveDataByDomain(domain: IntentDomain, query: string): { needs: boolean; needs_interaction: boolean; reason: string } {
    const q = query.toLowerCase();
    const timeWords = ["今天", "最新", "实时", "现在", "余票", "库存", "价格", "汇率", "天气", "today", "latest", "now", "price", "availability", "明天", "后天"];

    if (domain === "ticketing") return { needs: true, needs_interaction: true, reason: "domain=ticketing requires live data" };
    if (domain === "travel") return { needs: true, needs_interaction: true, reason: "domain=travel requires live data" };
    if (domain === "local_life") return { needs: true, needs_interaction: false, reason: "domain=local_life implies live data" };
    if (domain === "ecommerce") return { needs: true, needs_interaction: false, reason: "domain=ecommerce implies live data" };
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
    if (domain === "local_life") {
        if (!/(上海|北京|广州|深圳|杭州|成都|重庆|南京|苏州|武汉|西安|天津|厦门|长沙|郑州|青岛|宁波|无锡|佛山|东莞)/.test(q)) {
            constraints.push("城市或商圈");
            cta_buttons.push({ label: "补充城市/商圈", action: "fill_constraint", constraint_key: "location" });
        }
        if (!/(餐厅|咖啡|酒店|酒吧|景点|医院|药店|理发|按摩|店|商家|restaurant|cafe|hotel|clinic)/i.test(q)) {
            constraints.push("商家类型");
            cta_buttons.push({ label: "补充商家类型", action: "fill_constraint", constraint_key: "category" });
        }
    }
    if (domain === "ecommerce") {
        if (!/(iphone|ipad|macbook|华为|小米|联想|戴尔|sony|三星|airpods|耳机|手机|电脑|相机|电视|冰箱|洗衣机|鞋|衣服)/i.test(q)) {
            constraints.push("商品型号/关键词");
            cta_buttons.push({ label: "补充商品型号", action: "fill_constraint", constraint_key: "product" });
        }
        if (!/(预算|¥|￥|\d+\s*元|cny|rmb|usd)/i.test(q)) {
            constraints.push("预算范围");
            cta_buttons.push({ label: "补充预算范围", action: "fill_constraint", constraint_key: "budget" });
        }
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

function inferSerpLocale(locale?: string): { hl: string; gl: string } {
    const normalized = (locale || 'zh-CN').toLowerCase();
    if (normalized.startsWith('zh')) return { hl: 'zh-CN', gl: 'cn' };
    if (normalized.startsWith('ja')) return { hl: 'ja', gl: 'jp' };
    return { hl: 'en', gl: 'us' };
}

function shouldForceLive(query: string): boolean {
    return /(今天|最新|实时|现在|此刻|刚刚|today|latest|now)/i.test(query);
}

function isPublicActionUrl(url: string): boolean {
    if (!url || !/^https?:\/\//i.test(url)) return false;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (host.includes('serpapi.com')) return false;
        if (path.includes('/search.json')) return false;
        if (parsed.searchParams.has('api_key')) return false;
        return true;
    } catch {
        return false;
    }
}

function dedupeLocalItems(items: SerpApiLocalItem[]): SerpApiLocalItem[] {
    const map = new Map<string, SerpApiLocalItem>();
    items.forEach((item) => {
        const key = `${item.name}::${item.address || item.map_url || item.id}`;
        if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values()).slice(0, 12);
}

function inferLocationHint(query: string): string {
    const cityCandidates = ['上海', '北京', '广州', '深圳', '杭州', '成都', '重庆', '南京', '苏州', '武汉', '西安', '天津'];
    const areaCandidates = ['外滩', '陆家嘴', '静安寺', '徐家汇', '人民广场', '淮海路', '虹桥', '浦东'];
    const parts: string[] = [];
    cityCandidates.forEach((city) => {
        if (query.includes(city) && !parts.includes(city)) parts.push(city);
    });
    areaCandidates.forEach((area) => {
        if (query.includes(area) && !parts.includes(area)) parts.push(area);
    });
    return parts.join(' ').trim();
}

function isLocalResultGeoConsistent(item: SerpApiLocalItem, query: string, locationHint: string): boolean {
    const itemText = `${item.name || ''} ${item.address || ''}`.toLowerCase();
    const normalizedQuery = String(query || '').toLowerCase();
    const hintTokens = String(locationHint || '')
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);

    if (hintTokens.length > 0) {
        const matched = hintTokens.some((token) => itemText.includes(token));
        if (matched) return true;
    }

    const cityHints = ['上海', '北京', '广州', '深圳', '杭州', '成都', '重庆', '南京', '苏州', '武汉', '西安', '天津'];
    const queryCities = cityHints.filter((city) => normalizedQuery.includes(city));
    if (queryCities.length === 0) return true;

    if (queryCities.some((city) => itemText.includes(city))) return true;

    const containsOtherCity = cityHints
        .filter((city) => !queryCities.includes(city))
        .some((city) => itemText.includes(city));
    if (containsOtherCity) return false;

    if (/(jakarta|indonesia|tokyo|japan|london|singapore|bangkok|kuala lumpur|malaysia|seoul)/i.test(itemText)) {
        return false;
    }

    return false;
}

function buildLocalizedMapUrl(item: SerpApiLocalItem, locationHint: string): string {
    const query = [item.name, item.address, locationHint].filter(Boolean).join(' ').trim();
    if (query) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    return item.map_url || item.website || 'https://www.google.com/maps';
}

function localItemsToActionLinks(
    items: SerpApiLocalItem[],
    locationHint: string
): Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }> {
    return items
        .map((item) => ({
            title: `${item.name} 导航`,
            url: buildLocalizedMapUrl(item, locationHint),
            provider: 'google_maps',
            supports_time_filter: false,
        }))
        .filter((item) => isPublicActionUrl(item.url))
        .slice(0, 6);
}

function shoppingItemsToActionLinks(items: SerpApiShoppingItem[]): Array<{ title: string; url: string; provider: string; supports_time_filter: boolean }> {
    return items
        .map((item) => ({
            title: item.title,
            url: item.url || '',
            provider: item.source || item.merchant || 'google_shopping',
            supports_time_filter: false,
        }))
        .filter((item) => isPublicActionUrl(item.url))
        .slice(0, 8);
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

function parseDateString(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const full = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (full) {
        const year = full[1];
        const month = full[2].padStart(2, '0');
        const day = full[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return undefined;
}

function inferTimePreferenceFromWindow(window?: string): FlightConstraints['departureTimePreference'] | undefined {
    if (!window) return undefined;
    const normalized = window.trim();
    if (!normalized) return undefined;
    if (normalized === '06:00-11:59') return 'morning';
    if (normalized === '12:00-17:59') return 'afternoon';
    if (normalized === '18:00-23:59') return 'evening';
    if (normalized === '00:00-05:59') return 'night';
    return undefined;
}

function normalizeFlightConstraintsFromRequest(body: LiveSearchRequest): FlightConstraints {
    const parsed = parseFlightConstraints(body.query || '');
    const input = body.constraints || {};
    const merged: FlightConstraints = {
        ...parsed,
        origin: input.origin || parsed.origin,
        destination: input.destination || parsed.destination,
        departureDate: parseDateString(input.date) || parsed.departureDate,
        travelClass: input.cabin || parsed.travelClass,
        passengers: Number.isFinite(input.passengers) ? Math.max(1, Number(input.passengers)) : parsed.passengers,
        departureWindow: input.time_window || parsed.departureWindow,
        departureTimePreference:
            input.departure_time_preference ||
            inferTimePreferenceFromWindow(input.time_window) ||
            parsed.departureTimePreference,
        timePriorityMode: input.time_priority_mode || parsed.timePriorityMode || 'prefer',
    };

    if (!merged.departureTimePreference && merged.departureWindow) {
        merged.departureTimePreference = inferTimePreferenceFromWindow(merged.departureWindow);
    }

    return merged;
}

function buildFlightSearchParams(constraints: FlightConstraints): FlightSearchParams | null {
    if (!constraints.origin || !constraints.destination || !constraints.departureDate) {
        return null;
    }
    return {
        origin: constraints.origin,
        destination: constraints.destination,
        departureDate: constraints.departureDate,
        passengers: constraints.passengers || 1,
        travelClass: constraints.travelClass || 'economy',
        currency: 'CNY',
        departureTimePreference: constraints.departureTimePreference,
        timePriorityMode: constraints.timePriorityMode || 'prefer',
    };
}

function extractTransfers(text: string): number {
    if (/(直飞|non[-\s]?stop)/i.test(text)) return 0;
    const match = text.match(/(\d+)\s*(?:次)?\s*(?:中转|转机|stops?)/i);
    if (match) {
        const parsed = parseInt(match[1], 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    if (/(中转|转机|stopover|layover)/i.test(text)) return 1;
    return 0;
}

function extractTimePair(text: string): { dep: string; arr: string } {
    const pairMatch = text.match(/([01]?\d|2[0-3]):([0-5]\d)\s*[-~到至]\s*([01]?\d|2[0-3]):([0-5]\d)/);
    if (pairMatch) {
        return {
            dep: `${pairMatch[1].padStart(2, '0')}:${pairMatch[2]}`,
            arr: `${pairMatch[3].padStart(2, '0')}:${pairMatch[4]}`,
        };
    }
    const allMatches = [...text.matchAll(/([01]?\d|2[0-3]):([0-5]\d)/g)];
    if (allMatches.length >= 2) {
        const first = allMatches[0];
        const second = allMatches[1];
        return {
            dep: `${first[1].padStart(2, '0')}:${first[2]}`,
            arr: `${second[1].padStart(2, '0')}:${second[2]}`,
        };
    }
    return { dep: '', arr: '' };
}

function parsePrice(text: string): { amount: number; currency: string } | null {
    const cny = text.match(/(?:¥|￥)\s?(\d{2,6})|(\d{2,6})\s?(?:元|人民币|RMB|CNY)/i);
    if (cny) {
        const raw = cny[1] || cny[2];
        const amount = parseInt(raw, 10);
        if (Number.isFinite(amount) && amount > 0) return { amount, currency: 'CNY' };
    }
    const usd = text.match(/(?:USD|\$)\s?(\d{2,6})/i);
    if (usd) {
        const amount = parseInt(usd[1], 10);
        if (Number.isFinite(amount) && amount > 0) return { amount, currency: 'USD' };
    }
    return null;
}

function durationMinutes(dep: string, arr: string): number {
    const depMatch = dep.match(/^(\d{2}):(\d{2})$/);
    const arrMatch = arr.match(/^(\d{2}):(\d{2})$/);
    if (!depMatch || !arrMatch) return 0;
    const depMin = parseInt(depMatch[1], 10) * 60 + parseInt(depMatch[2], 10);
    const arrMin = parseInt(arrMatch[1], 10) * 60 + parseInt(arrMatch[2], 10);
    if (arrMin >= depMin) return arrMin - depMin;
    return 24 * 60 - depMin + arrMin;
}

function toQuotesFromFlights(flights: FlightResult[], fetchedAtIso: string): NormalizedQuote[] {
    return flights.map((flight, idx) => ({
        quote_id: `serpapi_${idx}_${Date.now().toString(36)}`,
        provider: 'serpapi_google_flights',
        dep_time: flight.departure.time || '',
        arr_time: flight.arrival.time || '',
        price: flight.price,
        currency: flight.currency || 'CNY',
        transfers: Number.isFinite(flight.stops) ? flight.stops : 0,
        source_url: flight.bookingUrl || 'https://www.google.com/travel/flights',
        fetched_at: fetchedAtIso,
    }));
}

function toQuotesFromEvidence(items: Array<{ title: string; snippet: string; url: string; source_name: string }>): NormalizedQuote[] {
    const fetchedAtIso = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];

    items.forEach((item, idx) => {
        const text = `${item.title || ''} ${item.snippet || ''}`.trim();
        const price = parsePrice(text);
        if (!price) return;
        const timePair = extractTimePair(text);
        quotes.push({
            quote_id: `grounding_${idx}_${Date.now().toString(36)}`,
            provider: item.source_name || 'gemini_grounding',
            dep_time: timePair.dep,
            arr_time: timePair.arr,
            price: price.amount,
            currency: price.currency,
            transfers: extractTransfers(text),
            source_url: item.url,
            fetched_at: fetchedAtIso,
        });
    });

    return quotes;
}

function toQuoteCards(quotes: NormalizedQuote[]): QuoteCard[] {
    return quotes.map((quote) => {
        const priceText = Number.isFinite(quote.price)
            ? `${quote.currency} ${quote.price}`
            : quote.currency;
        const transfersText = quote.transfers <= 0 ? '直飞' : `${quote.transfers} 次中转`;
        return {
            quote_id: quote.quote_id,
            provider: quote.provider,
            dep_time: quote.dep_time,
            arr_time: quote.arr_time,
            price_text: priceText,
            transfers_text: transfersText,
            source_url: quote.source_url,
            fetched_at: quote.fetched_at,
            objective_score: quote.objective_score,
        };
    });
}

function optimizeQuotes(quotes: NormalizedQuote[]): {
    ranked: NormalizedQuote[];
    optimizer?: LiveSearchSuccessResponse['optimizer'];
} {
    if (!Array.isArray(quotes) || quotes.length === 0) return { ranked: [] };

    const ranked = quotes
        .map((quote) => {
            const transferPenalty = quote.transfers * 120;
            const durationPenalty = durationMinutes(quote.dep_time, quote.arr_time) * 0.2;
            const riskPenalty = quote.provider.includes('grounding') ? 80 : 20;
            const objectiveScore = quote.price + transferPenalty + durationPenalty + riskPenalty;
            return { ...quote, objective_score: Number(objectiveScore.toFixed(2)) };
        })
        .sort((a, b) => (a.objective_score ?? 0) - (b.objective_score ?? 0));

    const selected = ranked[0];
    return {
        ranked,
        optimizer: selected
            ? {
                objective: 'price + transfer_penalty + duration_penalty + risk_penalty',
                selected_quote_id: selected.quote_id,
                alternatives_count: Math.max(0, ranked.length - 1),
            }
            : undefined,
    };
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
        const flightConstraints = normalizeFlightConstraintsFromRequest(body);
        const action_links = buildFlightActionLinks(flightConstraints);

        const route_decision = {
            intent_domain: domain,
            needs_live_data: liveDecision.needs,
            needs_interaction: liveDecision.needs_interaction,
            reason: liveDecision.reason
        };

        console.log(`[live-search] trace_id=${trace_id}, Query: "${normalized}", Domain: ${domain}`);

        if (!liveDecision.needs) {
            const response: LiveSearchSuccessResponse = {
                success: true,
                trace_id,
                evidence: {
                    items: [],
                    fetched_at: Date.now(),
                    ttl_seconds: 0,
                    provider: "none",
                    confidence: 0,
                    query_normalized: normalized,
                    intent_domain: domain,
                    notes: {
                        confidence: 0,
                        warnings: [],
                        cache_hit: false,
                    },
                },
                route_decision,
                action_links: action_links.length > 0 ? action_links : undefined,
                normalized_quotes: [],
                quote_cards: [],
            };
            res.status(200).json(response); return;
        }

        // Local life: aggregate google_local + google_maps and expose structured place cards.
        if (domain === 'local_life') {
            const { hl, gl } = inferSerpLocale(locale);
            const locationHint = inferLocationHint(normalized);
            const freshnessPolicy = shouldForceLive(normalized) ? 'force_live' : 'cache_ok';
            const localReq = {
                params: { q: normalized, hl, gl },
                locale,
                freshness_policy: freshnessPolicy as 'cache_ok' | 'force_live',
                domain: 'local_service' as const,
            };

            const [localPrimary, mapsSecondary] = await Promise.all([
                executeSerpApi({ engine: 'google_local', ...localReq }),
                executeSerpApi({ engine: 'google_maps', ...localReq }),
            ]);

            const mergedLocalItems = dedupeLocalItems([
                ...(localPrimary.normalized.local_results || []),
                ...(mapsSecondary.normalized.local_results || []),
            ]);
            const localizedLocalItems = mergedLocalItems.map((item) => ({
                ...item,
                map_url: buildLocalizedMapUrl(item, locationHint),
            }));
            const geoFilteredLocalItems = localizedLocalItems.filter((item) => isLocalResultGeoConsistent(item, normalized, locationHint));
            const finalLocalItems = locationHint ? geoFilteredLocalItems : localizedLocalItems;
            const localReviewTargets = finalLocalItems
                .map((item) => item.id)
                .filter((id) => Boolean(id) && !id.startsWith('local_'))
                .slice(0, 2);
            const reviewResults = localReviewTargets.length > 0
                ? await Promise.all(
                    localReviewTargets.map((dataId) => executeSerpApi({
                        engine: 'google_maps_reviews',
                        params: { data_id: dataId, hl, gl },
                        locale,
                        freshness_policy: freshnessPolicy,
                        domain: 'local_service',
                    }))
                )
                : [];
            const localActionLinks = localItemsToActionLinks(finalLocalItems, locationHint);
            const evidenceItems = [
                ...finalLocalItems.slice(0, maxItems).map((item) => ({
                    title: item.name,
                    snippet: [item.address, item.rating ? `评分 ${item.rating}` : '', item.status || '']
                        .filter(Boolean)
                        .join(' · '),
                    url: item.map_url || '',
                    source_name: 'google_maps',
                })),
                ...reviewResults.flatMap((item) => item.evidence.items),
            ]
                .filter((item) => isPublicActionUrl(item.url))
                .slice(0, maxItems);

            if (finalLocalItems.length > 0) {
                const response: LiveSearchSuccessResponse = {
                    success: true,
                    trace_id,
                    evidence: {
                        items: evidenceItems,
                        fetched_at: Date.now(),
                        ttl_seconds: ttlByDomain(domain),
                        provider: 'serpapi_google_local_maps',
                        confidence: calcConfidence(evidenceItems.length || localizedLocalItems.length),
                        query_normalized: normalized,
                        intent_domain: domain,
                        notes: {
                            confidence: calcConfidence(evidenceItems.length || localizedLocalItems.length),
                            warnings: [],
                            cache_hit: false,
                        },
                    },
                    route_decision,
                    action_links: localActionLinks,
                    normalized: {
                        kind: 'local',
                        items: finalLocalItems,
                        links: localActionLinks.map(link => ({ title: link.title, url: link.url, source: link.provider })),
                        local_results: finalLocalItems,
                        review_results: reviewResults.flatMap((item) => item.normalized.review_results || []).slice(0, 10),
                    },
                    local_results: finalLocalItems,
                };
                res.status(200).json(response);
                return;
            }

            const err = localPrimary.error || mapsSecondary.error || {
                code: 'no_results',
                message: 'No local results',
                retryable: true,
            };
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const response: LiveSearchErrorResponse = {
                success: false,
                trace_id,
                error: {
                    code: err.code === 'auth'
                        ? 'auth'
                        : err.code === 'quota'
                            ? 'quota'
                            : err.code === 'network'
                                ? 'network'
                                : 'no_results',
                    message: err.message || 'no local results found',
                    retryable: Boolean(err.retryable),
                },
                action_links: localActionLinks,
                route_decision,
                fallback: {
                    failure_reason: err.message || '未找到本地服务结果，请补充城市或商家类型',
                    missing_constraints: constraints.length > 0 ? constraints : ['城市', '商家类型'],
                    cta_buttons,
                },
            };
            res.status(200).json(response);
            return;
        }

        // Shopping: use google_shopping and expose structured offer cards.
        if (domain === 'ecommerce') {
            const { hl, gl } = inferSerpLocale(locale);
            const freshnessPolicy = shouldForceLive(normalized) ? 'force_live' : 'cache_ok';
            const shopping = await executeSerpApi({
                engine: 'google_shopping',
                params: { q: normalized, hl, gl, num: Math.max(5, maxItems) },
                locale,
                freshness_policy: freshnessPolicy,
                domain: 'shopping',
            });
            const shoppingItems = shopping.normalized.shopping_results || [];
            const shoppingActionLinks = shoppingItemsToActionLinks(shoppingItems);
            if (shopping.success && shoppingItems.length > 0) {
                const response: LiveSearchSuccessResponse = {
                    success: true,
                    trace_id,
                    evidence: {
                        items: shopping.evidence.items.slice(0, maxItems),
                        fetched_at: Date.now(),
                        ttl_seconds: ttlByDomain(domain),
                        provider: 'serpapi_google_shopping',
                        confidence: calcConfidence(shopping.evidence.items.length || shoppingItems.length),
                        query_normalized: normalized,
                        intent_domain: domain,
                        notes: {
                            confidence: calcConfidence(shopping.evidence.items.length || shoppingItems.length),
                            warnings: [],
                            cache_hit: false,
                        },
                    },
                    route_decision,
                    action_links: shoppingActionLinks,
                    normalized: {
                        kind: 'shopping',
                        items: shoppingItems,
                        links: shoppingActionLinks.map(link => ({ title: link.title, url: link.url, source: link.provider })),
                        shopping_results: shoppingItems,
                    },
                    shopping_results: shoppingItems,
                };
                res.status(200).json(response);
                return;
            }

            const err = shopping.error || {
                code: 'no_results',
                message: 'No shopping results',
                retryable: true,
            };
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const response: LiveSearchErrorResponse = {
                success: false,
                trace_id,
                error: {
                    code: err.code === 'auth'
                        ? 'auth'
                        : err.code === 'quota'
                            ? 'quota'
                            : err.code === 'network'
                                ? 'network'
                                : 'no_results',
                    message: err.message || 'no shopping results found',
                    retryable: Boolean(err.retryable),
                },
                action_links: shoppingActionLinks,
                route_decision,
                fallback: {
                    failure_reason: err.message || '未找到商品报价，请补充品牌或型号',
                    missing_constraints: constraints.length > 0 ? constraints : ['品牌', '型号', '预算'],
                    cta_buttons,
                },
            };
            res.status(200).json(response);
            return;
        }

        let normalizedQuotes: NormalizedQuote[] = [];
        let serpEvidenceItems: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
        let serpWarning: string | null = null;
        const flightSearchParams = buildFlightSearchParams(flightConstraints);

        // Primary source for flight: SerpAPI + normalized quote extraction.
        if (domain === 'ticketing' && flightSearchParams) {
            const serpApiKey = getServerSerpApiKey();
            if (serpApiKey) {
                const serpResult = await searchFlightsWithSerpApi(flightSearchParams, serpApiKey);
                if (serpResult.success && serpResult.flights.length > 0) {
                    const fetchedAt = serpResult.realtime?.fetched_at || new Date().toISOString();
                    normalizedQuotes = toQuotesFromFlights(serpResult.flights, fetchedAt).slice(0, maxItems);
                    serpEvidenceItems = serpResult.flights.slice(0, maxItems).map((flight) => ({
                        title: `${flight.airline} ${flight.flightNumber}`.trim(),
                        snippet: `${flight.departure.time} → ${flight.arrival.time} · ${flight.stops === 0 ? '直飞' : `${flight.stops} 次中转`} · ${flight.price} ${flight.currency}`,
                        url: flight.bookingUrl,
                        source_name: 'serpapi_google_flights',
                    }));
                } else {
                    serpWarning = serpResult.error || 'serpapi_no_results';
                }
            } else {
                serpWarning = 'serpapi_key_missing';
            }
        } else if (domain === 'ticketing') {
            serpWarning = 'serpapi_constraints_missing(origin,destination,date)';
        }

        if (serpEvidenceItems.length > 0) {
            const optimized = optimizeQuotes(normalizedQuotes);
            const response: LiveSearchSuccessResponse = {
                success: true,
                trace_id,
                evidence: {
                    items: serpEvidenceItems,
                    fetched_at: Date.now(),
                    ttl_seconds: ttlByDomain(domain),
                    provider: 'serpapi_google_flights',
                    confidence: calcConfidence(serpEvidenceItems.length),
                    query_normalized: normalized,
                    intent_domain: domain,
                    notes: {
                        confidence: calcConfidence(serpEvidenceItems.length),
                        warnings: serpWarning ? [serpWarning] : [],
                        cache_hit: false,
                    },
                },
                route_decision,
                action_links: action_links.length > 0 ? action_links : undefined,
                normalized_quotes: optimized.ranked,
                quote_cards: toQuoteCards(optimized.ranked),
                optimizer: optimized.optimizer,
            };
            res.status(200).json(response);
            return;
        }

        // Backup source: Gemini grounding.
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: "auth", message: "Gemini API key not configured", retryable: false },
                action_links: action_links.length > 0 ? action_links : undefined,
                route_decision,
                fallback: { failure_reason: "API密钥未配置", missing_constraints: ["GEMINI_API_KEY"], cta_buttons: [{ label: "配置API密钥", action: "configure_api", constraint_key: "api_key" }] }
            };
            res.status(400).json(response); return;
        }

        const redacted = redactPII(normalized);
        let items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];

        try {
            const result = await geminiSearchGrounding(geminiApiKey, redacted, maxItems, domain);
            items = result.items;
        } catch (e: any) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const errorCode: FailureCode = e.code || "provider_blocked";
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: errorCode, message: e?.message || "live search failed", retryable: true },
                action_links: action_links.length > 0 ? action_links : undefined,
                route_decision,
                fallback: { failure_reason: getFailureReason(errorCode), missing_constraints: constraints, cta_buttons }
            };
            res.status(502).json(response); return;
        }

        if (!items.length) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const response: LiveSearchErrorResponse = {
                success: false, trace_id,
                error: { code: "no_results", message: "no live results found", retryable: true },
                action_links: action_links.length > 0 ? action_links : undefined,
                route_decision,
                fallback: {
                    failure_reason: "未找到相关实时信息，请补充更多约束条件",
                    missing_constraints: constraints.length ? constraints : ["出发地", "目的地", "出发日期"],
                    cta_buttons
                }
            };
            res.status(200).json(response); return;
        }

        normalizedQuotes = toQuotesFromEvidence(items);
        const optimized = optimizeQuotes(normalizedQuotes);

        const ttl = ttlByDomain(domain);
        const evidence = {
            items,
            fetched_at: Date.now(),
            ttl_seconds: ttl,
            provider: "google_search_grounding",
            confidence: calcConfidence(items.length),
            query_normalized: normalized,
            intent_domain: domain,
            notes: {
                confidence: calcConfidence(items.length),
                warnings: serpWarning ? [serpWarning] : [],
                cache_hit: false,
            },
        };

        const response: LiveSearchSuccessResponse = {
            success: true,
            trace_id,
            evidence,
            route_decision,
            action_links: action_links.length > 0 ? action_links : undefined,
            normalized_quotes: optimized.ranked,
            quote_cards: toQuoteCards(optimized.ranked),
            optimizer: optimized.optimizer,
        };
        res.status(200).json(response);

    } catch (error) {
        const response: LiveSearchErrorResponse = {
            success: false, trace_id,
            error: { code: "internal_error", message: error instanceof Error ? error.message : "Unknown error", retryable: true },
            action_links: [],
            route_decision: {
                intent_domain: 'knowledge',
                needs_live_data: false,
                needs_interaction: false,
                reason: 'internal_error',
            },
            fallback: { failure_reason: "内部错误，请重试", missing_constraints: [], cta_buttons: [{ label: "重试", action: "retry_live_search", constraint_key: "retry" }] }
        };
        res.status(500).json(response);
    }
}

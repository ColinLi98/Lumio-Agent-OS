import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { ServerResponse, IncomingMessage } from 'http';

// ============================================================================
// 6.1 Intent Domain Types (5 domains)
// ============================================================================

type IntentDomain = 'ticketing' | 'travel' | 'ecommerce' | 'knowledge' | 'local_life';

// ============================================================================
// 6.5 Failure Classification
// ============================================================================

type FailureCode =
  | 'network'
  | 'auth'
  | 'quota'
  | 'provider_blocked'
  | 'insufficient_constraints'
  | 'no_results'
  | 'timeout'
  | 'internal_error';

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================================================
// Types - Provider Adapter Layer Interfaces
// ============================================================================

interface LiveSearchRequest {
  query: string;
  locale?: string;
  intent_domain?: IntentDomain;
  max_items?: number;
}

interface LiveSearchSuccessResponse {
  success: true;
  trace_id: string;  // 6.5
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
  debug?: {
    webSearchQueries?: string[];
    cache_hit?: boolean;
  };
}

interface LiveSearchErrorResponse {
  success: false;
  trace_id: string;  // 6.5
  error: {
    code: FailureCode;  // 6.5
    message: string;
    retryable: boolean;
  };
  fallback: {
    failure_reason: string;
    missing_constraints: string[];
    cta_buttons: Array<{ label: string; action: string; constraint_key?: string }>;
    // 6.2: NO ecommerce_offers field - completely hidden
  };
}

// 6.4: Execute Types
interface LiveExecuteRequest {
  task_description: string;
  target_url: string;
  step_budget?: number;
  timeout_ms?: number;
  require_user_approval?: boolean;
}

interface ActionStep {
  step_id: number;
  action_type: 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'extract';
  selector?: string;
  value?: string;
  timestamp: number;
  success: boolean;
  error?: string;
  screenshot_path?: string;
}

interface LiveExecuteResponse {
  success: boolean;
  trace_id: string;  // 6.5
  action_trace: ActionStep[];
  extracted: Record<string, any>;
  blocked_reason?: string;
  requires_approval?: boolean;
  pending_action?: ActionStep;
  error?: {
    code: FailureCode;
    message: string;
    retryable: boolean;
  };
}

// 6.5: Trace Storage
interface TraceEntry {
  trace_id: string;
  type: 'live_search' | 'live_execute';
  timestamp: number;
  request: any;
  response: any;
  duration_ms: number;
  error_code?: FailureCode;
}

const traceHistory: TraceEntry[] = [];
const MAX_TRACE_HISTORY = 100;

function storeTrace(entry: TraceEntry): void {
  traceHistory.unshift(entry);
  if (traceHistory.length > MAX_TRACE_HISTORY) traceHistory.pop();
}

// ============================================================================
// 6.3: EvidencePack Cache (query + domain + locale -> evidence)
// ============================================================================

interface CacheEntry {
  expires_at: number;
  evidence: LiveSearchSuccessResponse["evidence"];
  webSearchQueries: string[];
}
const evidenceCache = new Map<string, CacheEntry>();

function cacheKey(locale: string, domain: IntentDomain, q: string, maxItems: number): string {
  return `${locale}::${domain}::${maxItems}::${q}`;
}

// ============================================================================
// Helpers
// ============================================================================

function safeJson(res: ServerResponse, status: number, body: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};
  return JSON.parse(raw);
}

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

// ============================================================================
// 6.1: Domain Classifier (5 domains with ticketing separate from travel)
// ============================================================================

function inferDomain(query: string, intent_domain?: IntentDomain): IntentDomain {
  if (intent_domain) return intent_domain;

  const q = query.toLowerCase();

  // TICKETING: 机票/火车票/高铁/航班/出发地-目的地/日期 → ticketing
  const ticketingHints = [
    "机票", "航班", "飞机票", "往返", "直飞", "经济舱", "商务舱",
    "车票", "火车票", "高铁", "动车", "时刻表", "余票", "车次",
    "登机", "站台", "机场", "火车站", "航司", "航空",
    "到", "出发", "抵达", "flight", "ticket", "train", "airport"
  ];

  // Check for origin-destination pattern (X到Y)
  const hasRoutePattern = /[\u4e00-\u9fa5]+到[\u4e00-\u9fa5]+/.test(q) ||
    /[\u4e00-\u9fa5]+-[\u4e00-\u9fa5]+/.test(q);

  if (ticketingHints.some(k => q.includes(k)) || hasRoutePattern) {
    return "ticketing";
  }

  // TRAVEL: 酒店/住宿/旅游/景点 (not tickets)
  const travelHints = ["酒店", "住宿", "民宿", "旅游", "景点", "攻略", "行程", "度假", "hotel", "resort", "travel"];
  if (travelHints.some(k => q.includes(k))) return "travel";

  // LOCAL_LIFE: 餐厅/外卖/打车
  const localLifeHints = ["餐厅", "外卖", "美团", "饿了么", "打车", "滴滴", "电影", "门票", "restaurant", "food", "delivery"];
  if (localLifeHints.some(k => q.includes(k))) return "local_life";

  // ECOMMERCE: 购买/下单/商品
  const ecommerceHints = ["购买", "下单", "优惠券", "京东", "淘宝", "拼多多", "天猫", "闲鱼", "iphone", "macbook", "laptop", "买手机", "买电脑", "价格", "多少钱"];
  if (ecommerceHints.some(k => q.includes(k))) return "ecommerce";

  return "knowledge";
}

// ============================================================================
// Freshness Router
// ============================================================================

function needsLiveDataByDomain(domain: IntentDomain, query: string): { needs: boolean; needs_interaction: boolean; reason: string } {
  const q = query.toLowerCase();
  const timeWords = ["今天", "最新", "实时", "现在", "余票", "库存", "价格", "汇率", "天气", "today", "latest", "now", "price", "availability", "明天", "后天", "这周"];

  // Ticketing always needs live data and interaction
  if (domain === "ticketing") {
    return { needs: true, needs_interaction: true, reason: "domain=ticketing requires live data" };
  }

  // Travel needs live data
  if (domain === "travel") {
    return { needs: true, needs_interaction: true, reason: "domain=travel requires live data" };
  }

  // Local life often needs live data
  if (domain === "local_life") {
    return { needs: true, needs_interaction: false, reason: "domain=local_life implies live data" };
  }

  // Ecommerce with time words
  if (domain === "ecommerce" && timeWords.some(w => q.includes(w))) {
    return { needs: true, needs_interaction: false, reason: "ecommerce with time-sensitive keywords" };
  }

  // Knowledge with time words
  if (timeWords.some(w => q.includes(w))) {
    return { needs: true, needs_interaction: false, reason: "query contains time-sensitive keywords" };
  }

  return { needs: false, needs_interaction: false, reason: "no time-sensitive signal detected" };
}

// ============================================================================
// 6.5: Missing Constraints with Specific CTA Buttons
// ============================================================================

function getMissingConstraints(domain: IntentDomain, query: string): {
  constraints: string[];
  cta_buttons: Array<{ label: string; action: string; constraint_key: string }>
} {
  const q = query.toLowerCase();
  const constraints: string[] = [];
  const cta_buttons: Array<{ label: string; action: string; constraint_key: string }> = [];

  if (domain === "ticketing") {
    // Date check
    if (!/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(q) &&
      !q.includes("今天") && !q.includes("明天") && !q.includes("后天")) {
      constraints.push("出发日期");
      cta_buttons.push({ label: "补充出发日期", action: "fill_constraint", constraint_key: "date" });
    }

    // Origin/Destination
    if (!q.includes("到") && !q.includes("->") && !q.includes(" to ")) {
      constraints.push("出发地");
      constraints.push("目的地");
      cta_buttons.push({ label: "补充出发地/目的地", action: "fill_constraint", constraint_key: "route" });
    }

    // Cabin class
    cta_buttons.push({ label: "选择舱位偏好", action: "fill_constraint", constraint_key: "cabin" });

    // Direct flight
    cta_buttons.push({ label: "是否直飞", action: "fill_constraint", constraint_key: "direct" });

    // Budget
    cta_buttons.push({ label: "补充预算范围", action: "fill_constraint", constraint_key: "budget" });
  }

  if (domain === "travel") {
    if (!q.match(/\d+人/)) {
      constraints.push("出行人数");
      cta_buttons.push({ label: "补充出行人数", action: "fill_constraint", constraint_key: "passengers" });
    }
    cta_buttons.push({ label: "选择入住日期", action: "fill_constraint", constraint_key: "checkin" });
  }

  if (domain === "ecommerce") {
    if (!q.match(/预算|\d{3,6}元?/)) {
      constraints.push("预算范围");
      cta_buttons.push({ label: "补充预算", action: "fill_constraint", constraint_key: "budget" });
    }
    cta_buttons.push({ label: "选择品牌", action: "fill_constraint", constraint_key: "brand" });
  }

  // Default retry button
  cta_buttons.push({ label: "重试检索", action: "retry_live_search", constraint_key: "retry" });

  return { constraints: Array.from(new Set(constraints)), cta_buttons };
}

// ============================================================================
// 6.3: TTL by Domain
// ============================================================================

function ttlByDomain(domain: IntentDomain): number {
  if (domain === "ticketing") return 120;  // 2 minutes
  if (domain === "travel") return 300;     // 5 minutes
  if (domain === "ecommerce") return 60;   // 1 minute
  if (domain === "local_life") return 180; // 3 minutes
  return 300;                              // knowledge: 5 minutes
}

// ============================================================================
// 6.1: Domain Gate - Filter Cross-Domain URLs
// ============================================================================

const ECOMMERCE_DOMAINS = [
  'jd.com', 'taobao.com', 'tmall.com', 'pinduoduo.com', 'pdd.com',
  'amazon.com', 'amazon.cn', 'ebay.com', 'aliexpress.com', 'xianyu.com',
  'suning.com', 'dangdang.com', 'gome.com.cn', 'vip.com', 'kaola.com'
];

const TICKETING_DOMAINS = [
  'ctrip.com', 'qunar.com', 'fliggy.com', 'ly.com', '12306.cn',
  'booking.com', 'expedia.com', 'trip.com', 'skyscanner.com', 'kayak.com',
  'airasia.com', 'ceair.com', 'csair.com', 'hainanairlines.com'
];

function extractSourceName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function isEcommerceUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ECOMMERCE_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

function isTicketingUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return TICKETING_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

/**
 * 6.1: Domain Gate - Filter out cross-domain URLs
 * ticketing 域禁止 fallback 到 ecommerce
 */
function filterByDomainGate(items: Array<{ title: string; snippet: string; url: string; source_name: string }>, domain: IntentDomain): typeof items {
  return items.filter(item => {
    // RULE: ticketing domain MUST NOT have ecommerce links
    if (domain === "ticketing" && isEcommerceUrl(item.url)) {
      console.log(`[domain-gate] BLOCKED ecommerce URL from ticketing query: ${item.url}`);
      return false;
    }

    // RULE: travel domain MUST NOT have ecommerce links
    if (domain === "travel" && isEcommerceUrl(item.url)) {
      console.log(`[domain-gate] BLOCKED ecommerce URL from travel query: ${item.url}`);
      return false;
    }

    // RULE: ecommerce domain SHOULD NOT have ticketing links
    if (domain === "ecommerce" && isTicketingUrl(item.url)) {
      console.log(`[domain-gate] BLOCKED ticketing URL from ecommerce query: ${item.url}`);
      return false;
    }

    return true;
  });
}

function calcConfidence(itemsCount: number): number {
  return Math.max(0, Math.min(1, 0.2 + 0.15 * itemsCount));
}

// ============================================================================
// 6.3: Google Search Grounding (Gemini API)
// ============================================================================

async function geminiSearchGrounding(
  env: Record<string, string>,
  query: string,
  maxItems: number,
  domain: IntentDomain
): Promise<{
  items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
  webSearchQueries: string[];
}> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const model = env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: query }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  };

  console.log(`[live-search] Calling Gemini Search Grounding: "${query}", domain=${domain}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(`[live-search] Gemini error: ${resp.status}`, text);

    // 6.5: Classify failure
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
        items.push({
          title: chunk.web.title || "Source",
          snippet: "",
          url: itemUrl,
          source_name: extractSourceName(itemUrl)
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

  // 6.1: Apply Domain Gate
  items = filterByDomainGate(items, domain);

  console.log(`[live-search] Gemini returned ${items.length} grounded results (after domain gate)`);
  return { items: items.filter(it => it.url).slice(0, maxItems), webSearchQueries };
}

// ============================================================================
// 6.4: Playwright Executor (Read-Only Tasks)
// ============================================================================

const SENSITIVE_ACTIONS = ['login', 'payment', 'submit', 'purchase', 'checkout', 'confirm', 'pay', 'order', '登录', '支付', '购买', '下单'];

function isSensitiveAction(action: string): boolean {
  const actionLower = action.toLowerCase();
  return SENSITIVE_ACTIONS.some(s => actionLower.includes(s));
}

async function handleLiveExecute(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
): Promise<void> {
  const startTime = Date.now();
  const trace_id = generateTraceId();

  try {
    const body = await readJsonBody(req) as LiveExecuteRequest;

    const {
      task_description,
      target_url,
      step_budget = 10,
      timeout_ms = 60000,  // 6.4: 60 seconds
      require_user_approval = true
    } = body;

    if (!task_description || !target_url) {
      const response: LiveExecuteResponse = {
        success: false,
        trace_id,
        action_trace: [],
        extracted: {},
        error: { code: "insufficient_constraints", message: "task_description and target_url required", retryable: false }
      };
      storeTrace({ trace_id, type: 'live_execute', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime, error_code: "insufficient_constraints" });
      return safeJson(res, 400, response);
    }

    console.log(`[live-execute] trace_id=${trace_id}, Task: "${task_description}", URL: ${target_url}`);

    const trace: ActionStep[] = [];

    // Step 1: Navigate
    trace.push({
      step_id: 1,
      action_type: 'navigate',
      value: target_url,
      timestamp: Date.now(),
      success: true
    });

    // 6.4: Check for sensitive action (NOT read-only)
    if (isSensitiveAction(task_description)) {
      const pendingAction: ActionStep = {
        step_id: 2,
        action_type: 'click',
        selector: '[data-action="submit"]',
        timestamp: Date.now(),
        success: false,
        error: 'Requires user approval - not a read-only task'
      };

      const response: LiveExecuteResponse = {
        success: false,
        trace_id,
        action_trace: trace,
        extracted: {},
        requires_approval: true,
        pending_action: pendingAction,
        blocked_reason: 'Sensitive action detected. This executor only supports read-only tasks (查询航班/车次/票价).'
      };

      storeTrace({ trace_id, type: 'live_execute', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime });
      return safeJson(res, 200, response);
    }

    // 6.4: Stub for read-only task extraction
    // In production, this would use Playwright to scrape the page
    const extracted = {
      page_title: 'Flight/Train Query Result',
      timestamp: Date.now(),
      note: 'Playwright extraction stub - implement with real browser automation',
      query_type: task_description.includes('航班') ? 'flight' : task_description.includes('车次') ? 'train' : 'general'
    };

    trace.push({
      step_id: 2,
      action_type: 'extract',
      selector: 'body',
      timestamp: Date.now(),
      success: true
    });

    const response: LiveExecuteResponse = {
      success: true,
      trace_id,
      action_trace: trace,
      extracted
    };

    storeTrace({ trace_id, type: 'live_execute', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime });
    console.log(`[live-execute] trace_id=${trace_id} completed in ${Date.now() - startTime}ms`);

    return safeJson(res, 200, response);

  } catch (error) {
    const response: LiveExecuteResponse = {
      success: false,
      trace_id,
      action_trace: [],
      extracted: {},
      error: {
        code: "internal_error",
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      }
    };

    storeTrace({ trace_id, type: 'live_execute', timestamp: startTime, request: {}, response, duration_ms: Date.now() - startTime, error_code: "internal_error" });
    console.error(`[live-execute] trace_id=${trace_id} error:`, error);
    return safeJson(res, 500, response);
  }
}

// ============================================================================
// API Routes Plugin
// ============================================================================

function apiRoutesPlugin(env: Record<string, string>): Plugin {
  const isDev = env.NODE_ENV !== 'production';

  return {
    name: 'api-routes',
    configureServer(server) {
      // 6.4: /api/live-execute
      server.middlewares.use('/api/live-execute', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          return safeJson(res, 405, { error: 'Method not allowed' });
        }
        return handleLiveExecute(req, res, env);
      });

      // /api/live-search
      server.middlewares.use('/api/live-search', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          return safeJson(res, 405, { error: 'Method not allowed' });
        }

        const startTime = Date.now();
        const trace_id = generateTraceId();

        try {
          const body = await readJsonBody(req) as LiveSearchRequest;

          const queryRaw = String(body.query || "");
          if (!queryRaw.trim()) {
            const { constraints, cta_buttons } = getMissingConstraints("knowledge" as IntentDomain, "");
            const response: LiveSearchErrorResponse = {
              success: false,
              trace_id,
              error: { code: "insufficient_constraints", message: "query is required", retryable: false },
              fallback: {
                failure_reason: "缺少查询内容",
                missing_constraints: ["查询内容"],
                cta_buttons: [{ label: "重新输入", action: "edit_query", constraint_key: "query" }]
              }
            };
            storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime, error_code: "insufficient_constraints" });
            return safeJson(res, 400, response);
          }

          const locale = body.locale || "zh-CN";
          const maxItems = Math.max(1, Math.min(10, body.max_items ?? 5));
          const normalized = normalizeQuery(queryRaw);

          // 6.1: Domain classification
          const domain = inferDomain(normalized, body.intent_domain);
          const liveDecision = needsLiveDataByDomain(domain, normalized);

          const route_decision = {
            intent_domain: domain,
            needs_live_data: liveDecision.needs,
            needs_interaction: liveDecision.needs_interaction,
            reason: liveDecision.reason
          };

          console.log(`[live-search] trace_id=${trace_id}, Query: "${normalized}", Domain: ${domain}`);

          // If live data not required
          if (!liveDecision.needs) {
            const response: LiveSearchSuccessResponse = {
              success: true,
              trace_id,
              evidence: {
                items: [],
                fetched_at: Date.now(),
                ttl_seconds: 0,
                provider: "none",
                confidence: 0
              },
              route_decision,
              debug: isDev ? { cache_hit: false, webSearchQueries: [] } : undefined
            };
            storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime });
            return safeJson(res, 200, response);
          }

          // 6.3: Check cache
          const ttl = ttlByDomain(domain);
          const key = cacheKey(locale, domain, normalized, maxItems);
          const now = Date.now();

          const hit = evidenceCache.get(key);
          if (hit && hit.expires_at > now) {
            console.log(`[live-search] trace_id=${trace_id} Cache HIT, expires in ${Math.round((hit.expires_at - now) / 1000)}s`);
            const response: LiveSearchSuccessResponse = {
              success: true,
              trace_id,
              evidence: { ...hit.evidence },
              route_decision,
              debug: isDev ? { cache_hit: true, webSearchQueries: hit.webSearchQueries } : undefined
            };
            storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime });
            return safeJson(res, 200, response);
          }

          // Check API key
          if (!env.GEMINI_API_KEY) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const response: LiveSearchErrorResponse = {
              success: false,
              trace_id,
              error: { code: "auth", message: "Gemini API key not configured", retryable: false },
              fallback: {
                failure_reason: "API密钥未配置",
                missing_constraints: ["GEMINI_API_KEY"],
                cta_buttons: [{ label: "配置API密钥", action: "configure_api", constraint_key: "api_key" }]
              }
            };
            storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime, error_code: "auth" });
            return safeJson(res, 400, response);
          }

          // Call Gemini with PII redaction
          const redacted = redactPII(normalized);

          let items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
          let webSearchQueries: string[] = [];

          try {
            const result = await geminiSearchGrounding(env, redacted, maxItems, domain);
            items = result.items;
            webSearchQueries = result.webSearchQueries;
          } catch (e: any) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const errorCode: FailureCode = e.code || "provider_blocked";
            const response: LiveSearchErrorResponse = {
              success: false,
              trace_id,
              error: { code: errorCode, message: e?.message || "live search failed", retryable: true },
              fallback: {
                failure_reason: getFailureReason(errorCode),
                missing_constraints: constraints,
                cta_buttons
                // 6.2: NO ecommerce_offers - completely hidden
              }
            };
            storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime, error_code: errorCode });
            return safeJson(res, 502, response);
          }

          // 6.1 & 6.2: No results - show constraint CTAs, NOT ecommerce offers
          if (!items.length) {
            const { constraints, cta_buttons } = getMissingConstraints(domain, normalized);
            const response: LiveSearchErrorResponse = {
              success: false,
              trace_id,
              error: { code: "no_results", message: "no live results found", retryable: true },
              fallback: {
                failure_reason: "未找到相关实时信息，请补充更多约束条件",
                missing_constraints: constraints.length ? constraints : ["出发地", "目的地", "出发日期"],
                cta_buttons
                // 6.2: NO ecommerce_offers - completely hidden
              }
            };
            storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime, error_code: "no_results" });
            return safeJson(res, 200, response);
          }

          const fetched_at = Date.now();
          const evidence = {
            items,
            fetched_at,
            ttl_seconds: ttl,
            provider: "google_search_grounding",
            confidence: calcConfidence(items.length)
          };

          // 6.3: Write to cache
          evidenceCache.set(key, { expires_at: fetched_at + ttl * 1000, evidence, webSearchQueries });
          console.log(`[live-search] trace_id=${trace_id} Cached ${items.length} items, TTL=${ttl}s`);

          const response: LiveSearchSuccessResponse = {
            success: true,
            trace_id,
            evidence,
            route_decision,
            debug: isDev ? { cache_hit: false, webSearchQueries } : undefined
          };
          storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: body, response, duration_ms: Date.now() - startTime });

          return safeJson(res, 200, response);

        } catch (error) {
          const { constraints, cta_buttons } = getMissingConstraints("knowledge" as IntentDomain, "");
          const response: LiveSearchErrorResponse = {
            success: false,
            trace_id,
            error: { code: "internal_error", message: error instanceof Error ? error.message : "Unknown error", retryable: true },
            fallback: {
              failure_reason: "内部错误，请重试",
              missing_constraints: [],
              cta_buttons: [{ label: "重试", action: "retry_live_search", constraint_key: "retry" }]
            }
          };
          storeTrace({ trace_id, type: 'live_search', timestamp: startTime, request: {}, response, duration_ms: Date.now() - startTime, error_code: "internal_error" });
          return safeJson(res, 500, response);
        }
      });

      // 6.2 & 6.5: Debug endpoint (DEV ONLY)
      if (isDev) {
        server.middlewares.use('/api/debug/traces', async (req, res, next) => {
          if (req.method === 'GET') {
            return safeJson(res, 200, {
              traces: traceHistory.slice(0, 20),
              cache_stats: {
                entries: evidenceCache.size,
                keys: Array.from(evidenceCache.keys()).slice(0, 10)
              }
            });
          }
          return next();
        });
      }
    }
  };
}

// 6.5: Human-readable failure reasons
function getFailureReason(code: FailureCode): string {
  switch (code) {
    case 'network': return '网络连接失败，请检查网络后重试';
    case 'auth': return '认证失败，API密钥无效或未配置';
    case 'quota': return 'API 配额已用尽，请稍后重试';
    case 'provider_blocked': return '搜索服务暂时不可用，请稍后重试';
    case 'insufficient_constraints': return '信息不足，请补充更多约束条件';
    case 'no_results': return '未找到相关实时信息';
    case 'timeout': return '请求超时，请重试';
    case 'internal_error': return '内部错误，请重试';
    default: return '未知错误';
  }
}

// ============================================================================
// Vite Config Export
// ============================================================================

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/serpapi': {
          target: 'https://serpapi.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/serpapi/, '')
        }
      }
    },
    plugins: [
      react(),
      apiRoutesPlugin({ ...env, NODE_ENV: mode }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_SEARCH_MODEL': JSON.stringify(env.GEMINI_SEARCH_MODEL || 'gemini-2.5-flash'),
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    optimizeDeps: {
      exclude: ['playwright-core', 'chromium-bidi']
    }
  };
});

import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { ServerResponse, IncomingMessage } from 'http';

// ============================================================================
// Types - Provider Adapter Layer Interfaces
// ============================================================================

interface LiveSearchRequest {
  query: string;
  locale?: string;        // default zh-CN
  intent_domain?: string; // travel/ecommerce/knowledge...
  max_items?: number;     // default 5
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
    needs_interaction: boolean;  // NEW: 指令2
    reason: string;
  };
  debug?: {
    webSearchQueries?: string[];  // 指令5: 日志
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

// 指令3: Live Execute Types
interface LiveExecuteRequest {
  task_description: string;
  target_url: string;
  step_budget?: number;       // default 10
  timeout_ms?: number;        // default 30000
  require_user_approval?: boolean;  // for sensitive actions
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
  action_trace: ActionStep[];
  extracted: Record<string, any>;
  blocked_reason?: string;
  requires_approval?: boolean;
  pending_action?: ActionStep;
}

// 指令5: Action Trace Storage (in-memory for MVP)
const actionTraceHistory: Array<{
  request_id: string;
  timestamp: number;
  request: LiveExecuteRequest;
  trace: ActionStep[];
}> = [];
const MAX_TRACE_HISTORY = 50;

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

/**
 * PII Redaction - Remove sensitive data before external API calls
 */
function redactPII(q: string): string {
  q = q.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
  q = q.replace(/1[3-9]\d{9}/g, "[REDACTED_PHONE]");
  q = q.replace(/(\+?\d[\d\s-]{7,}\d)/g, "[REDACTED_PHONE]");
  q = q.replace(/\b\d{17}[\dXx]\b/g, "[REDACTED_ID]");
  q = q.replace(/\b\d{16,19}\b/g, "[REDACTED_CARD]");
  return q;
}

/**
 * Domain Inference - Detect query intent domain
 */
function inferDomain(query: string, intent_domain?: string): string {
  if (intent_domain) return intent_domain;

  const q = query.toLowerCase();
  const travelHints = ["机票", "航班", "车票", "火车票", "高铁", "时刻表", "余票", "航司", "登机", "站台", "飞机", "火车站", "机场", "train", "flight", "ticket", "airport"];
  const ecommerceHints = ["购买", "下单", "优惠券", "京东", "淘宝", "拼多多", "天猫", "闲鱼", "iphone", "macbook", "laptop", "买手机", "买电脑"];
  const newsHints = ["最新", "今天", "新闻", "公告", "政策", "news", "announcement", "头条"];
  const financeHints = ["汇率", "利率", "股价", "股票", "btc", "eth", "黄金", "基金", "finance", "exchange rate"];

  if (travelHints.some(k => q.includes(k))) return "travel";
  if (financeHints.some(k => q.includes(k))) return "finance";
  if (newsHints.some(k => q.includes(k))) return "news";
  if (ecommerceHints.some(k => q.includes(k))) return "ecommerce";
  return "knowledge";
}

/**
 * Freshness Router - Determine if query needs live data
 * 指令2: travel 域强制 needs_live_data=true
 */
function needsLiveDataByDomain(domain: string, query: string): { needs: boolean; needs_interaction: boolean; reason: string } {
  const q = query.toLowerCase();
  const timeWords = ["今天", "最新", "实时", "现在", "余票", "库存", "价格", "汇率", "天气", "today", "latest", "now", "price", "availability", "明天", "后天", "这周"];

  // 指令2: Travel domain always needs live data
  if (domain === "travel") {
    return {
      needs: true,
      needs_interaction: true,  // travel often needs form filling
      reason: `domain=travel forces live data`
    };
  }

  if (["finance", "news"].includes(domain)) {
    return {
      needs: true,
      needs_interaction: false,
      reason: `domain=${domain} implies live data`
    };
  }

  if (timeWords.some(w => q.includes(w))) {
    return {
      needs: true,
      needs_interaction: false,
      reason: `query contains time-sensitive keywords`
    };
  }

  return {
    needs: false,
    needs_interaction: false,
    reason: `no time-sensitive signal detected`
  };
}

/**
 * Missing Constraints - Detect what info is needed for better results
 */
function missingConstraints(domain: string, query: string): string[] {
  const q = query.toLowerCase();
  const missing: string[] = [];

  if (domain === "travel") {
    if (!/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(q) &&
      !q.includes("今天") && !q.includes("明天") && !q.includes("后天")) {
      missing.push("出发日期");
    }
    if (!q.includes("到") && !q.includes("->") && !q.includes(" to ")) {
      missing.push("出发地");
      missing.push("目的地");
    }
  }

  if (domain === "ecommerce") {
    if (!q.match(/iphone|macbook|laptop|手机|电脑|相机|耳机|型号/)) {
      missing.push("具体型号");
    }
  }

  return Array.from(new Set(missing));
}

/**
 * TTL by Domain - Cache expiration strategy
 */
function ttlByDomain(domain: string): number {
  if (domain === "travel") return 120;
  if (domain === "ecommerce") return 60;
  if (domain === "finance") return 120;
  if (domain === "news") return 300;
  return 300;
}

// ============================================================================
// In-Memory Cache
// ============================================================================

type CacheEntry = {
  expires_at: number;
  evidence: LiveSearchSuccessResponse["evidence"];
};
const cache = new Map<string, CacheEntry>();

function cacheKey(locale: string, domain: string, q: string, maxItems: number): string {
  return `${locale}::${domain}::${maxItems}::${q}`;
}

// ============================================================================
// 指令1: Google Search Grounding (Gemini API)
// ============================================================================

async function geminiSearchGrounding(
  env: Record<string, string>,
  query: string,
  maxItems: number,
  domain: string
): Promise<{
  items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
  webSearchQueries: string[];
}> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const model = env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [{ text: query }]
    }],
    tools: [{ google_search: {} }],  // 指令1: Google Search Grounding
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024
    }
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
    const err = new Error(`Gemini Search Grounding failed: ${resp.status}`);
    (err as any).status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
  const webSearchQueries: string[] = [];

  // Extract from groundingMetadata
  const candidate = data.candidates?.[0];
  const groundingMetadata = candidate?.groundingMetadata;

  if (groundingMetadata) {
    // 指令5: 记录 webSearchQueries
    if (groundingMetadata.webSearchQueries) {
      webSearchQueries.push(...groundingMetadata.webSearchQueries);
    }

    // Extract from groundingChunks
    const chunks = groundingMetadata.groundingChunks || [];
    for (const chunk of chunks) {
      if (chunk.web) {
        const itemUrl = chunk.web.uri || "";
        const sourceName = extractSourceName(itemUrl);

        // 指令4: Domain Gate - Filter cross-domain links
        if (domain === "travel" && isEcommerceUrl(itemUrl)) {
          console.log(`[live-search] BLOCKED ecommerce URL from travel query: ${itemUrl}`);
          continue;
        }
        if (domain === "ecommerce" && isTravelUrl(itemUrl)) {
          console.log(`[live-search] BLOCKED travel URL from ecommerce query: ${itemUrl}`);
          continue;
        }

        items.push({
          title: chunk.web.title || "Source",
          snippet: "",  // Will be filled from groundingSupports
          url: itemUrl,
          source_name: sourceName
        });
      }
    }

    // Enhance with groundingSupports snippets
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

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * 指令4: Domain Gate - Detect ecommerce URLs
 */
function isEcommerceUrl(url: string): boolean {
  const ecommerceDomains = [
    'jd.com', 'taobao.com', 'tmall.com', 'pinduoduo.com', 'pdd.com',
    'amazon.com', 'amazon.cn', 'ebay.com', 'aliexpress.com', 'xianyu.com',
    'suning.com', 'dangdang.com', 'gome.com.cn', 'vip.com', 'kaola.com'
  ];
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ecommerceDomains.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

/**
 * Domain Gate: Detect travel URLs
 */
function isTravelUrl(url: string): boolean {
  const travelDomains = [
    'ctrip.com', 'qunar.com', 'fliggy.com', 'ly.com', '12306.cn',
    'booking.com', 'expedia.com', 'airbnb.com', 'trip.com', 'hotels.com',
    'agoda.com', 'skyscanner.com', 'kayak.com'
  ];
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
// 指令3: /api/live-execute (Playwright Executor - Stub)
// ============================================================================

const SENSITIVE_ACTIONS = ['login', 'payment', 'submit', 'purchase', 'checkout', 'confirm'];

function isSensitiveAction(action: string, value?: string): boolean {
  const actionLower = action.toLowerCase();
  const valueLower = (value || '').toLowerCase();
  return SENSITIVE_ACTIONS.some(s => actionLower.includes(s) || valueLower.includes(s));
}

async function handleLiveExecute(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
): Promise<void> {
  try {
    const body = await readJsonBody(req) as LiveExecuteRequest;

    const {
      task_description,
      target_url,
      step_budget = 10,
      timeout_ms = 30000,
      require_user_approval = true
    } = body;

    if (!task_description || !target_url) {
      return safeJson(res, 400, {
        success: false,
        error: { code: "BAD_REQUEST", message: "task_description and target_url required" }
      });
    }

    const request_id = `exec_${Date.now()}`;
    const trace: ActionStep[] = [];

    // Stub implementation - In production, this would use Playwright
    console.log(`[live-execute] Task: "${task_description}", URL: ${target_url}, Budget: ${step_budget}`);

    // Step 1: Navigate
    trace.push({
      step_id: 1,
      action_type: 'navigate',
      value: target_url,
      timestamp: Date.now(),
      success: true
    });

    // Check for sensitive action
    if (isSensitiveAction(task_description)) {
      const pendingAction: ActionStep = {
        step_id: 2,
        action_type: 'click',
        selector: '[data-action="submit"]',
        timestamp: Date.now(),
        success: false,
        error: 'Requires user approval'
      };

      // 指令5: Store trace
      actionTraceHistory.unshift({ request_id, timestamp: Date.now(), request: body, trace });
      if (actionTraceHistory.length > MAX_TRACE_HISTORY) actionTraceHistory.pop();

      return safeJson(res, 200, {
        success: false,
        action_trace: trace,
        extracted: {},
        requires_approval: true,
        pending_action: pendingAction,
        blocked_reason: 'Sensitive action requires user approval'
      } as LiveExecuteResponse);
    }

    // Mock extraction
    const extracted = {
      page_title: 'Example Page',
      timestamp: Date.now()
    };

    // 指令5: Store trace for debugging
    actionTraceHistory.unshift({ request_id, timestamp: Date.now(), request: body, trace });
    if (actionTraceHistory.length > MAX_TRACE_HISTORY) actionTraceHistory.pop();

    console.log(`[live-execute] Completed ${trace.length} steps, stored trace ID: ${request_id}`);

    return safeJson(res, 200, {
      success: true,
      action_trace: trace,
      extracted
    } as LiveExecuteResponse);

  } catch (error) {
    console.error('[live-execute] Error:', error);
    return safeJson(res, 500, {
      success: false,
      action_trace: [],
      extracted: {},
      blocked_reason: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ============================================================================
// API Routes Plugin - Provider Adapter Layer
// ============================================================================

function apiRoutesPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'api-routes',
    configureServer(server) {
      // 指令3: /api/live-execute
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

      // /api/live-search (upgraded to Gemini)
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

        try {
          const body = await readJsonBody(req) as LiveSearchRequest;

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
            return safeJson(res, 400, out);
          }

          const locale = body.locale || "zh-CN";
          const maxItems = Math.max(1, Math.min(10, body.max_items ?? 5));

          const normalized = normalizeQuery(queryRaw);
          const domain = inferDomain(normalized, body.intent_domain);
          const liveDecision = needsLiveDataByDomain(domain, normalized);

          const route_decision = {
            intent_domain: domain,
            needs_live_data: liveDecision.needs,
            needs_interaction: liveDecision.needs_interaction,  // 指令2
            reason: liveDecision.reason
          };

          console.log(`[live-search] Query: "${normalized}", Domain: ${domain}, NeedsLive: ${liveDecision.needs}, NeedsInteraction: ${liveDecision.needs_interaction}`);

          // If live data not required, return empty evidence
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
            return safeJson(res, 200, out);
          }

          // Check cache
          const ttl = ttlByDomain(domain);
          const key = cacheKey(locale, domain, normalized, maxItems);
          const now = Date.now();

          const hit = cache.get(key);
          if (hit && hit.expires_at > now) {
            console.log(`[live-search] Cache hit for: "${normalized}"`);
            const out: LiveSearchSuccessResponse = {
              success: true,
              evidence: { ...hit.evidence, fetched_at: hit.evidence.fetched_at },
              route_decision,
              debug: { cache_hit: true, webSearchQueries: [] }
            };
            return safeJson(res, 200, out);
          }

          // Check API key
          if (!env.GEMINI_API_KEY) {
            const out: LiveSearchErrorResponse = {
              success: false,
              error: { code: "NO_API_KEY", message: "Gemini API key not configured", retryable: false },
              fallback: {
                failure_reason: "API密钥未配置",
                missing_constraints: ["GEMINI_API_KEY"],
                cta_buttons: [{ label: "配置API密钥", action: "configure_api" }]
              }
            };
            return safeJson(res, 400, out);
          }

          // 指令1: Call Gemini Search Grounding with PII redaction
          const redacted = redactPII(normalized);

          let items: Array<{ title: string; snippet: string; url: string; source_name: string }> = [];
          let webSearchQueries: string[] = [];

          try {
            const result = await geminiSearchGrounding(env, redacted, maxItems, domain);
            items = result.items;
            webSearchQueries = result.webSearchQueries;
          } catch (e: any) {
            const missing = missingConstraints(domain, normalized);
            const out: LiveSearchErrorResponse = {
              success: false,
              error: {
                code: "UPSTREAM_SEARCH_FAILED",
                message: e?.message || "live search failed",
                retryable: true
              },
              fallback: {
                failure_reason: "实时检索暂时不可用",
                missing_constraints: missing,
                cta_buttons: [
                  { label: "重试检索", action: "retry_live_search" },
                  { label: "补充关键信息", action: "fill_constraints" }
                ]
              }
            };
            return safeJson(res, 502, out);
          }

          // 指令4: No results - return structured fallback (NOT cross-domain links)
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
            return safeJson(res, 200, out);
          }

          const fetched_at = Date.now();
          const evidence = {
            items,
            fetched_at,
            ttl_seconds: ttl,
            provider: "google_search_grounding",  // 指令1
            confidence: calcConfidence(items.length)
          };

          // Write to cache
          cache.set(key, { expires_at: fetched_at + ttl * 1000, evidence });
          console.log(`[live-search] Cached ${items.length} items, TTL=${ttl}s`);

          const out: LiveSearchSuccessResponse = {
            success: true,
            evidence,
            route_decision,
            debug: { cache_hit: false, webSearchQueries }  // 指令5
          };
          return safeJson(res, 200, out);

        } catch (error) {
          console.error('[live-search] Error:', error);
          const out: LiveSearchErrorResponse = {
            success: false,
            error: {
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : "Unknown error",
              retryable: true
            },
            fallback: {
              failure_reason: "内部错误",
              missing_constraints: [],
              cta_buttons: [{ label: "重试", action: "retry_live_search" }]
            }
          };
          return safeJson(res, 500, out);
        }
      });

      // Debug endpoint: Get recent action traces
      server.middlewares.use('/api/debug/traces', async (req, res, next) => {
        if (req.method === 'GET') {
          return safeJson(res, 200, { traces: actionTraceHistory.slice(0, 10) });
        }
        return next();
      });
    }
  };
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
      apiRoutesPlugin(env),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_SEARCH_MODEL': JSON.stringify(env.GEMINI_SEARCH_MODEL || 'gemini-2.5-flash-preview-05-20'),
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

# L.I.X. Provider Adapter Layer 技术架构

> **版本**: v0.2.7 Beta  
> **目标**: 回答核心架构问题，明确实现边界

---

## 1. Provider 实现边界

### 核心接口 (`ProviderAdapter`)

```typescript
interface ProviderAdapter {
    id: ProviderId;               // 'jd' | 'pdd' | 'taobao'
    name: string;                 // 展示名称
    domains_allowlist: string[];  // 允许的域名
    
    search(input: ProviderSearchInput): Promise<CandidateItem[]>;
    extractDetail(candidate: CandidateItem, trace_id: string): Promise<DetailExtractionResult | null>;
    buildOffer(input: OfferBuildInput): Promise<Offer>;
}
```

### 每家 Provider 的实现

| 文件 | Provider | 实现状态 |
|------|----------|----------|
| `jdAdapter.ts` (470 lines) | 京东 | ✅ 完整 |
| `pddAdapter.ts` (470 lines) | 拼多多 | ✅ 完整 |
| `taobaoAdapter.ts` (207 lines) | 淘宝 | ⚠️ 精简版 |

### 共享策略模块

| 模块 | 用途 | 状态 |
|------|------|------|
| `selectorPolicy.ts` | CSS 选择器回退链 | ✅ |
| `fingerprintPolicy.ts` | 浏览器指纹生成 | ✅ |
| `retryPolicy.ts` | 指数退避重试 | ✅ |
| `scrapeCache.ts` | 搜索/详情缓存 | ✅ |

---

## 2. Headless 运行位置

### 当前架构 (`headlessPool.ts`)

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge/Node                      │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │  headlessFetch  │───▶│ tryHeadlessFetch           │  │
│  │                 │    │  (Playwright/Chromium)     │  │
│  │                 │    │  - launch headless:true    │  │
│  │                 │    │  - 8s timeout              │  │
│  │                 │    │  - resource blocking       │  │
│  │                 │    └────────────────────────────┘  │
│  │                 │              │                      │
│  │                 │              ▼ (失败时)             │
│  │                 │    ┌────────────────────────────┐  │
│  │                 │───▶│ tryRegularFetch            │  │
│  │                 │    │  (Node fetch fallback)     │  │
│  └─────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 运行环境

| 方案 | 当前状态 | 说明 |
|------|----------|------|
| **Vercel 内** | ✅ 当前 | Playwright 在 Serverless 函数中运行 |
| 独立 Worker | ❌ 未实现 | 可扩展到 Cloudflare Workers |
| 第三方抓取服务 | ❌ 未实现 | 如 Browserless.io、Apify |

### 降级策略

```typescript
// headlessPool.ts:90-136
export async function headlessFetch(options): Promise<HeadlessFetchResult> {
    // 1. 先尝试 Playwright headless
    const headlessResult = await tryHeadlessFetch(url, fingerprint, provider_id, timeout_ms);
    
    if (headlessResult.success) {
        return { ...headlessResult, used_headless: true };
    }
    
    // 2. 失败时降级到普通 fetch
    console.log(`[headlessPool.fallback] falling back to fetch`);
    const fetchResult = await tryRegularFetch(url, fingerprint, provider_id, timeout_ms);
    
    return { ...fetchResult, used_headless: false };
}
```

---

## 3. 并发模型

### 全局并发上限

```typescript
// headlessPool.ts
const MAX_GLOBAL_CONCURRENCY = 3;  // 全局浏览器实例上限

// providerRegistry.ts
const MAX_CONCURRENCY = 3;         // 并行 provider 数
const MAX_OFFERS_PER_PROVIDER = 5; // 每 provider 最多 5 个 offer
```

### Intent Fanout 流程

```
Intent Request
      │
      ▼
┌──────────────────────────────────────────────┐
│  fanoutSearch (providerRegistry.ts:49)       │
│  ┌────────────────────────────────────────┐  │
│  │ Batch 1 (MAX_CONCURRENCY=3)            │  │
│  │  ├── JD Adapter ──────┐                │  │
│  │  ├── PDD Adapter ─────┼── Promise.all  │  │
│  │  └── Taobao Adapter ──┘                │  │
│  └────────────────────────────────────────┘  │
│                    │                         │
│                    ▼                         │
│  每个 searchProvider:                        │
│  1. search() → 10 candidates               │
│  2. extractDetail() × 5 (串行)             │
│  3. buildOffer() × 5                       │
└──────────────────────────────────────────────┘
      │
      ▼
  MarketFanoutResult (最多 15 offers)
```

### 超时切换

```typescript
// headlessPool.ts
const HEADLESS_TIMEOUT_MS = 8000;      // 单次 headless 超时
const NAVIGATION_TIMEOUT_MS = 10000;   // 页面导航超时

// jdAdapter.ts:90-95
const fetchResult = await headlessFetch({
    url: searchUrl,
    provider_id: PROVIDER_ID,
    trace_id,
    timeout_ms: 10000  // search 层 10s
});

// jdAdapter.ts:182-187
const fetchResult = await headlessFetch({
    url: candidate.url,
    provider_id: PROVIDER_ID,
    trace_id,
    timeout_ms: 8000   // detail 层 8s
});
```

---

## 4. 反封禁策略

### 4.1 熔断器 (`banBudget.ts`)

```
ban_score 模型:
┌─────────────────────────────────────────────┐
│ score=0                    score=10         │
│ ────────────────────────────────────────▶  │
│  CLOSED      HALF_OPEN        OPEN          │
│    │            │              │            │
│    │            │              ▼            │
│    │            │    ┌──────────────────┐   │
│    │            │    │ 10min cooldown   │   │
│    │            │    └──────────────────┘   │
└─────────────────────────────────────────────┘
```

**配置参数**:
```typescript
const CIRCUIT_THRESHOLD = 10;       // score >= 10 开启熔断
const COOLDOWN_MS = 10 * 60 * 1000; // 10分钟冷却
const DECAY_INTERVAL_MS = 10 * 60 * 1000; // 每10分钟
const DECAY_AMOUNT = 2;             // 每次衰减 2 分
```

### 4.2 Ban 检测 (`banDetector.ts`)

| 信号类型 | 严重度 | Score Delta |
|----------|--------|-------------|
| `HTTP_403` | HARD | +5 |
| `HTTP_429` | HARD | +5 |
| `CAPTCHA_PAGE` | HARD | +5 |
| `LOGIN_REQUIRED` | HARD | +3 |
| `SECURITY_REDIRECT` | SOFT | +2 |
| `EMPTY_DOM` | SOFT | +1 |
| `TIMEOUT` | SOFT | +1 |

### 4.3 代理池 (`proxyPolicy.ts`)

```typescript
// 当前 Beta 配置 - 未启用外部代理
const DEFAULT_CONFIG: ProxyConfig = {
    enabled: false,  // Beta 阶段直连
    pool: [],        // 无外部代理
    rotation_strategy: 'round_robin',
    max_failures_before_unhealthy: 3,
    sticky_duration_ms: 300000  // 5分钟 sticky
};
```

**支持的策略**:
- `round_robin`: 轮询
- `random`: 随机
- `sticky`: 按 provider_id 粘滞

### 4.4 验证码识别

**当前状态**: ❌ **未实现**

检测到验证码时，`banDetector` 返回 `CAPTCHA_PAGE` 信号，触发熔断，无自动识别。

### 4.5 降级策略

```typescript
// 降级顺序:
1. Playwright headless (首选)
     ↓ 失败
2. Node fetch + 指纹 headers
     ↓ 失败
3. 返回空结果 + recordBanSignal
```

---

## 5. 数据标准化

### CandidateItem 最小集合

```typescript
interface CandidateItem {
    provider_id: ProviderId;       // ✅ 必须
    title: string;                 // ✅ 必须
    url: string;                   // ✅ 必须
    listed_price?: number;         // ⚠️ 可选
    currency: 'CNY';               // ✅ 必须
    shop_label?: 'official' | 'flagship' | 'third_party' | 'unknown';
    image_url?: string;
    sales_count?: number;
    evidence?: {
        html_hash?: string;
        scraped_at: string;        // ✅ 必须
        cache_hit?: boolean;
    };
}
```

### SKU Canonicalization 输入来源

```typescript
// providerRegistry.ts:56-62
const searchInput: ProviderSearchInput = {
    canonical_sku: intent.item?.canonical_sku  // 1. 用户指定的 canonical_sku
                || intent.item?.name            // 2. 或商品名称
                || '',
    keywords: extractKeywords(intent),         // 3. 从 sku + specs 提取
    budget_max: intent.constraints?.budget_max,
    location_code: intent.constraints?.location_code,
    trace_id
};
```

**关键词提取逻辑**:
```typescript
// 从 IntentRequest 提取搜索关键词:
1. intent.item.canonical_sku.split(/[\s\-_\/]+/)
2. intent.item.name.split(/[\s\-_\/]+/).slice(0, 5)
3. Object.values(intent.item.specs).filter(v => v.length > 1)
4. 去重 + 限制 10 个
```

---

## 6. Accept Fee 入账/对账

### 费用模型

```typescript
// acceptFeeService.ts
const FEE_RATE = 0.01;   // 1% of transaction
const MIN_FEE = 0.01;    // 最低 ¥0.01
const MAX_FEE = 500;     // 封顶 ¥500
```

### 入账流程

```
┌─────────────────────────────────────────────────────────┐
│  User Accept Offer                                       │
│       │                                                  │
│       ▼                                                  │
│  recordAcceptFee(                                        │
│      accept_token,                                       │
│      intent_id,                                          │
│      offer_id,                                           │
│      provider_id,                                        │
│      transaction_amount  ← Offer.price.amount            │
│  )                                                       │
│       │                                                  │
│       ▼                                                  │
│  AcceptFeeRecord {                                       │
│      fee_id: "fee_xxx",                                  │
│      fee_amount: transaction_amount * 0.01,  ← 1%        │
│      fee_status: "pending"                               │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### 对账周期

```typescript
// 发票聚合
aggregateInvoice(provider_id, period: 'daily' | 'weekly')

// 状态流转:
pending → invoiced → paid
    ↓
disputed → refunded
```

### Conversion Callback 设计

**当前状态**: 仅记录，不依赖

```typescript
// 1. 用户接受 → AcceptToken 生成
// 2. 用户跳转 provider 完成购买 (无回调)
// 3. 费用基于 intent 粒度，不基于实际转化

// 未来可扩展:
onConversionCallback?: (accept_token: string, transaction_confirmed: boolean) => void
```

---

## 7. 架构总结表

| 问题 | 当前实现 | 生产级方案 |
|------|----------|------------|
| Headless 位置 | Vercel Serverless | 独立 Worker / Browserless |
| 并发上限 | 3 全局 × 5 offer/provider = 15 | 动态弹性池 |
| 超时切换 | search 10s, detail 8s | 可配置 + 动态调整 |
| 代理池 | Beta 未启用 | 外部服务 + rotation |
| 验证码 | 熔断降级 | 2Captcha/打码平台 |
| Accept Fee | 内存存储 + 发票聚合 | PostgreSQL + Stripe |
| SKU 标准化 | 用户输入 + 分词 | 商品知识图谱 |

---

## 8. 相关代码路径

```
services/providers/
├── providerTypes.ts      # 核心类型定义
├── providerRegistry.ts   # fanout 编排
├── jdAdapter.ts          # JD 实现
├── pddAdapter.ts         # PDD 实现  
├── taobaoAdapter.ts      # Taobao 实现
├── headlessPool.ts       # Playwright 池
├── banBudget.ts          # 熔断器
├── banDetector.ts        # Ban 检测
├── proxyPolicy.ts        # 代理策略
├── fingerprintPolicy.ts  # 指纹生成
├── selectorPolicy.ts     # CSS 选择器
├── rateLimiter.ts        # QPS 限制
├── scrapeCache.ts        # 缓存层
└── retryPolicy.ts        # 重试策略

services/
├── acceptFeeService.ts   # 费用入账
├── lixTypes.ts           # v0.2 合约
└── lixStore.ts           # 意图存储
```

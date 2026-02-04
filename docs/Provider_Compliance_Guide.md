# Provider Compliance & Reliability Guide

> L.I.X. v0.3 数据采集合规与可靠性指南

---

## 1. 合规原则

### 1.1 ToS 遵守

| 平台 | 关键限制 | 我们的做法 |
|------|----------|------------|
| 京东 | 禁止未授权爬虫 | 仅使用公开搜索接口，遵守 robots.txt |
| 拼多多 | 速率限制严格 | 严格遵守速率限制, 使用缓存 |
| 淘宝 | 登录墙频繁 | 不处理登录态，仅采集公开信息 |

### 1.2 用户驱动采集

优先使用用户主动提供的数据：

```typescript
// 推荐方式
interface UserProvidedData {
    type: 'paste_link' | 'upload_screenshot' | 'manual_input';
    content: string | File;
    timestamp: number;
}
```

**为什么这样做？**
- 用户主动提供的链接/截图是明确授权的数据来源
- 避免了自动化爬取的合规风险
- 用户体验更可控

---

## 2. 速率限制

### 2.1 配置

```typescript
const RATE_LIMITS: Record<ProviderId, RateLimitConfig> = {
    jd: { requests_per_minute: 10, burst_size: 3 },
    pdd: { requests_per_minute: 5, burst_size: 2 },
    taobao: { requests_per_minute: 8, burst_size: 2 }
};
```

### 2.2 令牌桶算法

```typescript
// 实现: services/providers/rateLimiter.ts
const result = await canMakeRequest(provider_id, domain);
if (!result.allowed) {
    // 等待或跳过
    await delay(result.wait_ms);
}
```

---

## 3. 缓存策略

### 3.1 缓存层级

| 层级 | TTL | 用途 |
|------|-----|------|
| 搜索结果缓存 | 30 分钟 | 相同 SKU + 地区 + 预算 |
| 商品详情缓存 | 10 分钟 | 相同 URL |
| 价格缓存 | 5 分钟 | 高波动商品较短 |

### 3.2 缓存键格式

```
lix:scrape:search:{provider}:{sku_hash}:{location}:{budget_bucket}
lix:scrape:detail:{provider}:{url_hash}
```

---

## 4. 重试与退避

### 4.1 指数退避

```typescript
const RETRY_CONFIG = {
    max_attempts: 3,
    base_delay_ms: 1000,
    max_delay_ms: 10000,
    jitter_ms: 500
};

// 计算延迟: base_delay * 2^attempt + random(0, jitter)
```

### 4.2 熔断器

```typescript
interface CircuitBreakerConfig {
    failure_threshold: 5,      // 触发打开的失败次数
    recovery_timeout_ms: 60000, // 熔断恢复时间
    half_open_requests: 2      // 半开状态允许的请求数
}
```

---

## 5. 可观察性

### 5.1 必须记录的字段

每次请求必须包含：

```typescript
interface RequestTrace {
    trace_id: string;          // 全局追踪 ID
    span_id: string;           // 本次请求 ID
    provider_id: string;       // 提供商
    request_type: 'search' | 'detail';
    timestamp: number;
    latency_ms: number;
    cache_hit: boolean;
    status: 'success' | 'error' | 'timeout' | 'rate_limited';
    error_reason?: string;
}
```

### 5.2 事件类型

```typescript
type ProviderEvent =
    | 'provider.search.start'
    | 'provider.search.end'
    | 'provider.detail.start'
    | 'provider.detail.end'
    | 'provider.rate_limited'
    | 'provider.circuit_opened'
    | 'provider.circuit_closed'
    | 'provider.error';
```

---

## 6. 降级策略

### 6.1 降级层级

```
Level 0: 正常 - 实时采集
Level 1: 降级 - 仅返回缓存
Level 2: 熔断 - 返回用户选项 (paste_link, upload_screenshot)
Level 3: 故障 - 返回错误信息
```

### 6.2 Fallback UI

当无法获取实时数据时，显示用户选项：

```typescript
if (fanoutResult.status === 'NO_PROVIDER_FOR_VERTICAL') {
    return generateFallback(routeResult.intent_domain, 'no_provider');
}
```

---

## 7. 禁止事项

> [!CAUTION]
> 以下行为被明确禁止，违反可能导致账号封禁或法律风险

### 绝对禁止

- ❌ 规避登录墙或验证码
- ❌ 使用代理池绕过 IP 限制
- ❌ 伪造 User-Agent 或指纹
- ❌ 高频率批量爬取
- ❌ 储存用户登录凭证
- ❌ 爬取非公开页面

### 建议做法

- ✅ 使用公开 API 或搜索接口
- ✅ 遵守 robots.txt
- ✅ 实现合理的速率限制
- ✅ 优先使用用户提供的数据
- ✅ 缓存结果减少请求
- ✅ 记录完整日志便于审计

---

## 8. 监控指标

### 关键指标

| 指标名 | 类型 | 告警阈值 |
|--------|------|----------|
| `lix_provider_error_rate` | 比率 | > 5% |
| `lix_provider_latency_p99` | 延迟 | > 5s |
| `lix_circuit_open_count` | 计数 | > 0 |
| `lix_rate_limit_hit_count` | 计数 | > 10/min |
| `lix_cache_hit_rate` | 比率 | < 60% |

### Grafana Dashboard

```promql
# 错误率
rate(lix_provider_errors_total[5m]) / rate(lix_provider_requests_total[5m])

# P99 延迟
histogram_quantile(0.99, rate(lix_provider_latency_bucket[5m]))

# 熔断状态
lix_circuit_state{state="open"}
```

---

## 9. 审计日志

每次数据采集必须记录：

```json
{
    "timestamp": "2026-02-03T22:10:00Z",
    "trace_id": "trace_abc123",
    "action": "provider.search",
    "provider": "jd",
    "query": "iPhone 16 Pro",
    "result_count": 5,
    "latency_ms": 1234,
    "cache_hit": false,
    "user_pseudonym": "pub_xxxx",
    "ip_hash": "sha256:xxxx"
}
```

---

## 附录

### A. 相关文件

| 文件 | 职责 |
|------|------|
| `services/providers/rateLimiter.ts` | 速率限制实现 |
| `services/providers/banBudget.ts` | 熔断器实现 |
| `services/providers/scrapeCache.ts` | 缓存层 |
| `services/providers/providerRegistry.ts` | Provider 编排 |
| `services/intentRouterService.ts` | 意图路由 |

### B. 更新历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.3.0 | 2026-02-03 | 初始版本，包含合规指南 |

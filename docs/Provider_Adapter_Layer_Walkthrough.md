# L.I.X. Provider Adapter Layer - Integration Complete

> **Status**: ✅ PHASE 1-4 COMPLETE  
> **Tests**: 22/22 provider adapter tests passing  
> **v0.2 Contract**: UNCHANGED (frozen)

---

## Summary

This implementation integrates real offer data from JD, PDD, and Taobao using headless scraping, with robust anti-ban measures including caching, rate limiting, and circuit breakers.

---

## Files Created

### Phase 1: Core Infrastructure (`/services/providers/`)

| File | Lines | Purpose |
|------|-------|---------|
| [providerTypes.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/providerTypes.ts) | 322 | Core types, interfaces, and utilities |
| [scrapeCache.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/scrapeCache.ts) | ~180 | Redis cache with TTL (60s search, 120s detail) |
| [rateLimiter.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/rateLimiter.ts) | ~230 | Token bucket per provider (20-30 req/min) |
| [fingerprintPolicy.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/fingerprintPolicy.ts) | ~200 | Browser fingerprint rotation |
| [selectorPolicy.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/selectorPolicy.ts) | 369 | DOM selectors per provider (config-driven) |

---

### Phase 2: Anti-Ban Layer

| File | Lines | Purpose |
|------|-------|---------|
| [banDetector.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/banDetector.ts) | ~220 | Detect 403/429, captcha, login walls |
| [banBudget.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/banBudget.ts) | ~230 | Circuit breaker (opens at score≥10, 10min cooldown) |
| [retryPolicy.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/retryPolicy.ts) | ~200 | Exponential backoff with jitter |
| [headlessPool.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/headlessPool.ts) | ~300 | Playwright wrapper with fetch fallback |

---

### Phase 3: Provider Adapters

| File | Lines | Purpose |
|------|-------|---------|
| [jdAdapter.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/jdAdapter.ts) | ~380 | JD.com search + detail extraction |
| [pddAdapter.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/pddAdapter.ts) | ~320 | Pinduoduo mobile scraping |
| [taobaoAdapter.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/taobaoAdapter.ts) | ~150 | Taobao/Tmall scraping |

---

### Phase 4: Integration

| File | Lines | Purpose |
|------|-------|---------|
| [providerRegistry.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/providerRegistry.ts) | ~220 | Registry + concurrent fanout |
| [index.ts](file:///Users/apple/Lumi%20Agent%20Simulator/services/providers/index.ts) | ~30 | Re-exports all modules |

---

### Tests

| File | Tests | Status |
|------|-------|--------|
| [provider-adapters.smoke.test.ts](file:///Users/apple/Lumi%20Agent%20Simulator/tests/provider-adapters.smoke.test.ts) | 22 | ✅ 22/22 passing |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Provider Registry                             │
│   fanoutSearch() → concurrent search across JD/PDD/Taobao           │
├─────────────────────────────────────────────────────────────────────┤
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐          │
│   │ jdAdapter   │   │ pddAdapter  │   │ taobaoAdapter   │          │
│   │ search()    │   │ search()    │   │ search()        │          │
│   │ detail()    │   │ detail()    │   │ detail()        │          │
│   │ buildOffer()│   │ buildOffer()│   │ buildOffer()    │          │
│   └──────┬──────┘   └──────┬──────┘   └───────┬─────────┘          │
├──────────┼─────────────────┼──────────────────┼─────────────────────┤
│          │                 │                  │                      │
│          ▼                 ▼                  ▼                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     headlessPool                             │   │
│   │  Playwright browser with resource blocking, fetch fallback   │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│           Anti-Ban Layer     │                                       │
│   ┌────────────┐   ┌─────────┴───────┐   ┌──────────────────┐      │
│   │ banDetector│   │   banBudget     │   │   retryPolicy    │      │
│   │ detect()   │◄──┤ circuit breaker │──►│ withRetry()      │      │
│   └────────────┘   │ score tracking  │   │ exp backoff      │      │
│                    └─────────────────┘   └──────────────────┘      │
├─────────────────────────────────────────────────────────────────────┤
│           Infrastructure Layer                                       │
│   ┌────────────┐   ┌─────────────────┐   ┌──────────────────┐      │
│   │ scrapeCache│   │ rateLimiter     │   │ fingerprintPolicy│      │
│   │ Redis TTL  │   │ token bucket    │   │ UA rotation      │      │
│   └────────────┘   └─────────────────┘   └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Usage Example

```typescript
import { fanoutSearch } from './services/providers';

const intent: IntentRequest = {
    intent_id: 'int-123',
    category: 'shopping_comparison',
    canonical_sku: 'Apple iPhone 15 Pro 256GB',
    budget_max: 10000,
};

const result = await fanoutSearch(intent, 'trace-abc');

// result.all_offers: Offer[] from all providers
// result.provider_results: per-provider breakdown
// result.total_latency_ms: end-to-end timing
```

---

## Configuration: Environment Variables

```bash
# Required for production caching & rate limiting
REDIS_URL=redis://localhost:6379

# Optional: Playwright config
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT_MS=10000

# Rate limits (defaults shown)
JD_RATE_LIMIT_PER_MIN=20
PDD_RATE_LIMIT_PER_MIN=15
TAOBAO_RATE_LIMIT_PER_MIN=15
```

---

## Running Tests

```bash
# Provider adapter tests (22 tests)
npx vite-node tests/provider-adapters.smoke.test.ts

# v0.2 compliance tests (requires dev server)
npm run dev  # in one terminal
npx vite-node tests/lix-v02-compliance.test.ts  # in another
```

---

## Known Limitations & Anti-Ban Notes

### Scraping Limitations

1. **No login/checkout** - Public pages only
2. **DOM changes** - Selectors may break; update `selectorPolicy.ts`
3. **Rate limits** - Conservative defaults (15-20/min per provider)
4. **Captcha** - Detected but not solved; circuit opens

### Anti-Ban Strategy

| Mechanism | Implementation |
|-----------|----------------|
| **Fingerprint rotation** | Random UA/viewport/locale per request |
| **Request timing** | Token bucket with jitter delays |
| **Resource blocking** | Images/fonts/media blocked in Playwright |
| **Ban detection** | 403/429/captcha/login wall detection |
| **Circuit breaker** | Opens at ban_score≥10, 10min cooldown |
| **Graceful degradation** | Playwright→fetch fallback |

### Production Recommendations

1. **Use Redis** - Memory fallback is dev-only
2. **Monitor circuits** - `/api/lix/metrics` exposes ban scores
3. **Rotate IPs** - Consider proxy pool for high volume
4. **Update selectors** - Check monthly for site changes

---

## v0.2 Contract Status

> **UNCHANGED** - The provider adapter layer is additive only.

All frozen contracts remain intact:
- IntentRequest schema
- Redis nonce anti-replay (409 on replay)
- AcceptToken state machine
- Event names and metric names
- 14/14 v0.2 compliance tests

---

## Next Steps (Optional)

1. **Integrate into marketService.ts** - Replace mock providers
2. **Add Grafana dashboard** - Visualize scrape metrics
3. **Proxy rotation** - Add IP pool for production
4. **OTEL export** - Push traces to observability stack

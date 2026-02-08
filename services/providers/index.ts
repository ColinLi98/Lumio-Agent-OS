/**
 * Provider Adapter Layer - Index
 * L.I.X. Provider Adapter Layer
 * 
 * Re-exports all provider modules.
 */

// Types
export * from './providerTypes.js';

// Core Infrastructure
export { scrapeGet, scrapeSet, getCachedSearch, setCachedSearch, getCachedDetail, setCachedDetail } from './scrapeCache.js';
export { canMakeRequest, getRateLimitStatus, getAllRateLimitStatuses } from './rateLimiter.js';
export { generateFingerprint, getAlternateFingerprint, buildHeaders } from './fingerprintPolicy.js';
export { getProviderConfig, getDomainAllowlist, buildSearchUrl, trySelectors, trySelectorsAll } from './selectorPolicy.js';

// Anti-Ban Layer
export { checkStatusCode, checkResponseUrl, checkHtmlContent, checkDomEmpty, checkRedirects, detectBan } from './banDetector.js';
export { isCircuitOpen, getCircuitStatus, recordBanSignal, recordSuccess, getAllCircuitStatuses, resetCircuit } from './banBudget.js';
export { withRetry, fetchWithRetry, isRetryable, calculateDelay, DEFAULT_RETRY_CONFIG } from './retryPolicy.js';
export { headlessFetch, getPoolStats } from './headlessPool.js';

// Provider Adapters
export { jdAdapter } from './jdAdapter.js';
export { pddAdapter } from './pddAdapter.js';
export { taobaoAdapter } from './taobaoAdapter.js';

// Registry
export { getAdapter, getAllAdapters, fanoutSearch, PROVIDER_IDS, ADAPTERS } from './providerRegistry.js';

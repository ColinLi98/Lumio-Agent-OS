/**
 * Provider Adapter Layer - Index
 * L.I.X. Provider Adapter Layer
 * 
 * Re-exports all provider modules.
 */

// Types
export * from './providerTypes';

// Core Infrastructure
export { scrapeGet, scrapeSet, getCachedSearch, setCachedSearch, getCachedDetail, setCachedDetail } from './scrapeCache';
export { canMakeRequest, getRateLimitStatus, getAllRateLimitStatuses } from './rateLimiter';
export { generateFingerprint, getAlternateFingerprint, buildHeaders } from './fingerprintPolicy';
export { getProviderConfig, getDomainAllowlist, buildSearchUrl, trySelectors, trySelectorsAll } from './selectorPolicy';

// Anti-Ban Layer
export { checkStatusCode, checkResponseUrl, checkHtmlContent, checkDomEmpty, checkRedirects, detectBan } from './banDetector';
export { isCircuitOpen, getCircuitStatus, recordBanSignal, recordSuccess, getAllCircuitStatuses, resetCircuit } from './banBudget';
export { withRetry, fetchWithRetry, isRetryable, calculateDelay, DEFAULT_RETRY_CONFIG } from './retryPolicy';
export { headlessFetch, getPoolStats } from './headlessPool';

// Provider Adapters
export { jdAdapter } from './jdAdapter';
export { pddAdapter } from './pddAdapter';
export { taobaoAdapter } from './taobaoAdapter';

// Registry
export { getAdapter, getAllAdapters, fanoutSearch, PROVIDER_IDS, ADAPTERS } from './providerRegistry';

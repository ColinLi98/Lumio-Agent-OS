/**
 * Anti-Ban Strategy Template
 * P1-2: Provider adapter resilience for headless scraping on Vercel
 * 
 * For: JD.com, Pinduoduo, Taobao (no official API, headless only)
 */

// ============================================================================
// Types
// ============================================================================

export interface ProviderConfig {
    name: string;
    baseUrl: string;
    rateLimit: RateLimitConfig;
    circuitBreaker: CircuitBreakerConfig;
    jitter: JitterConfig;
    proxyPool?: ProxyPoolConfig;
}

export interface RateLimitConfig {
    /** Requests per minute per domain */
    requestsPerMinute: number;
    /** Token bucket capacity */
    bucketSize: number;
    /** Refill rate per second */
    refillRate: number;
}

export interface CircuitBreakerConfig {
    /** Consecutive failures to trigger circuit break */
    failureThreshold: number;
    /** Time to wait before probe (ms) */
    cooldownMs: number;
    /** Codes that count as failure */
    failureCodes: number[];
    /** Content patterns that indicate blocking */
    blockPatterns: string[];
}

export interface JitterConfig {
    /** Min delay between requests (ms) */
    minDelayMs: number;
    /** Max delay between requests (ms) */
    maxDelayMs: number;
    /** Header randomization enabled */
    randomizeHeaders: boolean;
    /** User agent rotation pool */
    userAgents: string[];
    /** Accept-Language rotation */
    acceptLanguages: string[];
}

export interface ProxyPoolConfig {
    /** Proxy endpoints (interface only, not enabled by default) */
    endpoints: string[];
    /** Rotation strategy */
    strategy: 'round-robin' | 'random' | 'least-used';
    /** Health check interval (ms) */
    healthCheckIntervalMs: number;
}

export interface CircuitState {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    lastSuccess: number;
}

export interface ProviderHealth {
    providerId: string;
    circuit: CircuitState;
    requestCount: number;
    lastRequest: number;
    tokensAvailable: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_JITTER: JitterConfig = {
    minDelayMs: 800,
    maxDelayMs: 2500,
    randomizeHeaders: true,
    userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    ],
    acceptLanguages: [
        'zh-CN,zh;q=0.9,en;q=0.8',
        'zh-CN,zh;q=0.9',
        'zh-Hans-CN;q=1, en-CN;q=0.9',
    ],
};

export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
    failureThreshold: 3,
    cooldownMs: 5 * 60 * 1000,  // 5 minutes
    failureCodes: [403, 429, 503],
    blockPatterns: [
        '验证码',
        'captcha',
        '访问受限',
        '请求过于频繁',
        'access denied',
        'rate limit',
    ],
};

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
    requestsPerMinute: 10,
    bucketSize: 15,
    refillRate: 0.25, // 1 token per 4 seconds
};

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    jd: {
        name: 'JD.com',
        baseUrl: 'https://search.jd.com',
        rateLimit: { ...DEFAULT_RATE_LIMIT, requestsPerMinute: 8 },
        circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
        jitter: DEFAULT_JITTER,
    },
    pdd: {
        name: 'Pinduoduo',
        baseUrl: 'https://mobile.yangkeduo.com',
        rateLimit: { ...DEFAULT_RATE_LIMIT, requestsPerMinute: 6 },
        circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER, failureThreshold: 2 },
        jitter: { ...DEFAULT_JITTER, minDelayMs: 1200, maxDelayMs: 3000 },
    },
    taobao: {
        name: 'Taobao',
        baseUrl: 'https://s.taobao.com',
        rateLimit: { ...DEFAULT_RATE_LIMIT, requestsPerMinute: 5 },
        circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER, failureThreshold: 2 },
        jitter: { ...DEFAULT_JITTER, minDelayMs: 1500, maxDelayMs: 4000 },
    },
};

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

const circuitStates: Map<string, CircuitState> = new Map();

export function getCircuitState(providerId: string): CircuitState {
    if (!circuitStates.has(providerId)) {
        circuitStates.set(providerId, {
            state: 'closed',
            failures: 0,
            lastFailure: 0,
            lastSuccess: Date.now(),
        });
    }
    return circuitStates.get(providerId)!;
}

export function recordSuccess(providerId: string): void {
    const circuit = getCircuitState(providerId);
    circuit.state = 'closed';
    circuit.failures = 0;
    circuit.lastSuccess = Date.now();
}

export function recordFailure(providerId: string, config: CircuitBreakerConfig): boolean {
    const circuit = getCircuitState(providerId);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= config.failureThreshold) {
        circuit.state = 'open';
        console.log(`[AntiBan] Circuit OPEN for ${providerId}: ${circuit.failures} consecutive failures`);
        return true; // Circuit opened
    }
    return false;
}

export function isCircuitOpen(providerId: string, config: CircuitBreakerConfig): boolean {
    const circuit = getCircuitState(providerId);

    if (circuit.state === 'closed') return false;

    // Check if cooldown has passed
    const elapsed = Date.now() - circuit.lastFailure;
    if (elapsed >= config.cooldownMs) {
        circuit.state = 'half-open';
        console.log(`[AntiBan] Circuit HALF-OPEN for ${providerId}: attempting probe`);
        return false; // Allow probe request
    }

    return true; // Still open
}

// ============================================================================
// Rate Limiter (Token Bucket)
// ============================================================================

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

const tokenBuckets: Map<string, TokenBucket> = new Map();

export function acquireToken(providerId: string, config: RateLimitConfig): boolean {
    const now = Date.now();

    if (!tokenBuckets.has(providerId)) {
        tokenBuckets.set(providerId, {
            tokens: config.bucketSize,
            lastRefill: now,
        });
    }

    const bucket = tokenBuckets.get(providerId)!;

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(config.bucketSize, bucket.tokens + elapsed * config.refillRate);
    bucket.lastRefill = now;

    // Try to acquire
    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
    }

    console.log(`[AntiBan] Rate limited for ${providerId}: ${bucket.tokens.toFixed(2)} tokens available`);
    return false;
}

// ============================================================================
// Request Jitter
// ============================================================================

export function getRandomDelay(config: JitterConfig): number {
    return config.minDelayMs + Math.random() * (config.maxDelayMs - config.minDelayMs);
}

export function getRandomUserAgent(config: JitterConfig): string {
    return config.userAgents[Math.floor(Math.random() * config.userAgents.length)];
}

export function getRandomAcceptLanguage(config: JitterConfig): string {
    return config.acceptLanguages[Math.floor(Math.random() * config.acceptLanguages.length)];
}

export function buildRandomizedHeaders(config: JitterConfig): Record<string, string> {
    const headers: Record<string, string> = {
        'User-Agent': getRandomUserAgent(config),
        'Accept-Language': getRandomAcceptLanguage(config),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
    };

    // Randomize header order by creating new object
    const keys = Object.keys(headers);
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }

    const randomized: Record<string, string> = {};
    for (const key of keys) {
        randomized[key] = headers[key];
    }

    return randomized;
}

// ============================================================================
// Health Check / Probe
// ============================================================================

export async function probeProvider(providerId: string): Promise<boolean> {
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) return false;

    try {
        // Light HEAD request to check if accessible
        const response = await fetch(config.baseUrl, {
            method: 'HEAD',
            headers: buildRandomizedHeaders(config.jitter),
        });

        if (config.circuitBreaker.failureCodes.includes(response.status)) {
            console.log(`[AntiBan] Probe failed for ${providerId}: status ${response.status}`);
            return false;
        }

        console.log(`[AntiBan] Probe success for ${providerId}`);
        recordSuccess(providerId);
        return true;
    } catch (error) {
        console.log(`[AntiBan] Probe error for ${providerId}:`, error);
        return false;
    }
}

// ============================================================================
// Degradation Strategy
// ============================================================================

export interface DegradedResponse {
    degraded: true;
    reason: string;
    providerId: string;
    suggestions: string[];
}

export function getDegradedResponse(providerId: string, reason: string): DegradedResponse {
    return {
        degraded: true,
        reason,
        providerId,
        suggestions: [
            '已生成结构化建议，不包含外链',
            '建议稍后重试或使用其他渠道',
            '系统正在恢复中，感谢您的耐心',
        ],
    };
}

// ============================================================================
// Main Guard Function
// ============================================================================

export interface GuardResult {
    allowed: boolean;
    waitMs?: number;
    degraded?: DegradedResponse;
}

/**
 * Main guard function - call before making any scraping request
 */
export async function guardRequest(providerId: string): Promise<GuardResult> {
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) {
        return { allowed: false, degraded: getDegradedResponse(providerId, 'Unknown provider') };
    }

    // Check circuit breaker
    if (isCircuitOpen(providerId, config.circuitBreaker)) {
        return {
            allowed: false,
            degraded: getDegradedResponse(providerId, 'Circuit breaker open - provider temporarily unavailable'),
        };
    }

    // Check rate limit
    if (!acquireToken(providerId, config.rateLimit)) {
        return {
            allowed: false,
            waitMs: 1000 / config.rateLimit.refillRate,
            degraded: getDegradedResponse(providerId, 'Rate limit exceeded'),
        };
    }

    // Apply jitter delay
    const delay = getRandomDelay(config.jitter);

    return {
        allowed: true,
        waitMs: delay,
    };
}

/**
 * Check response for blocking indicators
 */
export function checkResponseForBlock(
    providerId: string,
    status: number,
    body?: string
): { blocked: boolean; reason?: string } {
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) return { blocked: false };

    // Check status codes
    if (config.circuitBreaker.failureCodes.includes(status)) {
        recordFailure(providerId, config.circuitBreaker);
        return { blocked: true, reason: `HTTP ${status}` };
    }

    // Check content patterns
    if (body) {
        for (const pattern of config.circuitBreaker.blockPatterns) {
            if (body.toLowerCase().includes(pattern.toLowerCase())) {
                recordFailure(providerId, config.circuitBreaker);
                return { blocked: true, reason: `Blocked content pattern: ${pattern}` };
            }
        }
    }

    // Success
    recordSuccess(providerId);
    return { blocked: false };
}

// ============================================================================
// Telemetry
// ============================================================================

export interface AntiBanEvent {
    type: 'circuit_open' | 'circuit_close' | 'rate_limit' | 'block_detected' | 'probe_success' | 'probe_fail';
    providerId: string;
    timestamp: number;
    details?: Record<string, any>;
}

const eventLog: AntiBanEvent[] = [];

export function logEvent(event: Omit<AntiBanEvent, 'timestamp'>): void {
    eventLog.push({ ...event, timestamp: Date.now() });

    // Keep only last 1000 events
    if (eventLog.length > 1000) {
        eventLog.shift();
    }
}

export function getRecentEvents(count: number = 100): AntiBanEvent[] {
    return eventLog.slice(-count);
}

export function getProviderHealth(providerId: string): ProviderHealth | null {
    const config = PROVIDER_CONFIGS[providerId];
    if (!config) return null;

    const bucket = tokenBuckets.get(providerId);
    const circuit = getCircuitState(providerId);

    return {
        providerId,
        circuit,
        requestCount: eventLog.filter(e => e.providerId === providerId).length,
        lastRequest: bucket?.lastRefill ?? 0,
        tokensAvailable: bucket?.tokens ?? config.rateLimit.bucketSize,
    };
}

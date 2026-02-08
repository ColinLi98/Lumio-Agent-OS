/**
 * Compliance Adapter Template
 * Phase 2 Week 4 (W4-3): Provider Compliance & Reliability
 * 
 * Base utilities for building ToS-compliant provider adapters with
 * anti-fingerprinting, rate limiting, and reliability patterns.
 */

import { eventBus } from '../eventBus.js';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceConfig {
    /** Provider identifier */
    providerId: string;

    // === ToS Compliance ===
    /** Respect robots.txt directives */
    robotsRespect: boolean;
    /** Rate limiting configuration */
    rateLimit: {
        /** Requests per minute */
        rpm: number;
        /** Burst capacity */
        burst: number;
    };
    /** Rotate User-Agent strings */
    userAgentRotation: boolean;

    // === Anti-Fingerprinting ===
    /** Enable proxy rotation (if available) */
    proxyEnabled: boolean;
    /** Randomize HTTP headers */
    headerRandomization: boolean;
    /** Add timing jitter to requests */
    timingJitter: {
        /** Minimum delay in ms */
        min: number;
        /** Maximum delay in ms */
        max: number;
    };

    // === Reliability ===
    /** Retry policy configuration */
    retryPolicy: {
        /** Maximum number of retries */
        maxRetries: number;
        /** Backoff strategy */
        backoff: 'linear' | 'exponential';
        /** Base delay for backoff in ms */
        baseDelay: number;
    };
    /** Circuit breaker configuration */
    circuitBreaker: {
        /** Error threshold before opening circuit */
        threshold: number;
        /** Time to wait before half-open in ms */
        resetMs: number;
    };
    /** Cache TTL in seconds */
    cacheTTL: number;
}

export interface RequestContext {
    traceId: string;
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}

export interface RequestResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode?: number;
    latencyMs: number;
    retries: number;
    fromCache: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_COMPLIANCE_CONFIG: Omit<ComplianceConfig, 'providerId'> = {
    robotsRespect: true,
    rateLimit: { rpm: 30, burst: 5 },
    userAgentRotation: true,
    proxyEnabled: false,
    headerRandomization: true,
    timingJitter: { min: 500, max: 2000 },
    retryPolicy: { maxRetries: 3, backoff: 'exponential', baseDelay: 1000 },
    circuitBreaker: { threshold: 5, resetMs: 60000 },
    cacheTTL: 300,
};

// ============================================================================
// User-Agent Pool
// ============================================================================

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

/**
 * Get a random User-Agent string
 */
export function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ============================================================================
// Timing Jitter
// ============================================================================

/**
 * Add random delay (jitter) to requests to avoid detection
 */
export async function applyJitter(config: ComplianceConfig): Promise<number> {
    const { min, max } = config.timingJitter;
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
}

// ============================================================================
// Header Randomization
// ============================================================================

const ACCEPT_LANGUAGES = [
    'zh-CN,zh;q=0.9,en;q=0.8',
    'en-US,en;q=0.9',
    'zh-CN,zh;q=0.9',
    'en-GB,en;q=0.9,en-US;q=0.8',
];

const ACCEPT_ENCODINGS = [
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip, deflate',
];

/**
 * Generate randomized headers for anti-fingerprinting
 */
export function getRandomizedHeaders(config: ComplianceConfig): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    };

    if (config.userAgentRotation) {
        headers['User-Agent'] = getRandomUserAgent();
    }

    if (config.headerRandomization) {
        headers['Accept-Language'] = ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
        headers['Accept-Encoding'] = ACCEPT_ENCODINGS[Math.floor(Math.random() * ACCEPT_ENCODINGS.length)];
        headers['Cache-Control'] = Math.random() > 0.5 ? 'no-cache' : 'max-age=0';

        // Add some optional headers randomly
        if (Math.random() > 0.5) {
            headers['DNT'] = '1';
        }
        if (Math.random() > 0.7) {
            headers['Upgrade-Insecure-Requests'] = '1';
        }
    }

    return headers;
}

// ============================================================================
// Retry with Backoff
// ============================================================================

/**
 * Calculate delay for retry attempt
 */
export function calculateRetryDelay(config: ComplianceConfig, attempt: number): number {
    const { backoff, baseDelay } = config.retryPolicy;

    if (backoff === 'exponential') {
        return baseDelay * Math.pow(2, attempt);
    }
    return baseDelay * (attempt + 1);
}

/**
 * Execute request with retry logic
 */
export async function executeWithRetry<T>(
    config: ComplianceConfig,
    requestFn: () => Promise<T>,
    context: { traceId: string; operation: string }
): Promise<{ success: boolean; data?: T; error?: string; retries: number }> {
    const { maxRetries } = config.retryPolicy;
    let lastError: string = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Apply jitter before request
            if (attempt > 0 || config.timingJitter.min > 0) {
                const jitterMs = await applyJitter(config);
                console.log(`[Compliance] Jitter applied: ${jitterMs.toFixed(0)}ms`);
            }

            const data = await requestFn();

            // Log success
            eventBus.emit({
                event_type: 'provider.request.success',
                timestamp: Date.now(),
                trace_id: context.traceId,
                provider_id: config.providerId,
                operation: context.operation,
                attempt,
            } as any);

            return { success: true, data, retries: attempt };
        } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);

            console.log(`[Compliance] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError}`);

            if (attempt < maxRetries) {
                const delay = calculateRetryDelay(config, attempt);
                console.log(`[Compliance] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Log failure after all retries exhausted
    eventBus.emit({
        event_type: 'provider.request.failed',
        timestamp: Date.now(),
        trace_id: context.traceId,
        provider_id: config.providerId,
        operation: context.operation,
        retries: maxRetries,
        error: lastError,
    } as any);

    return { success: false, error: lastError, retries: maxRetries };
}

// ============================================================================
// Circuit Breaker State
// ============================================================================

interface CircuitState {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
}

const circuitStates: Map<string, CircuitState> = new Map();

/**
 * Check if circuit is open (should skip requests)
 */
export function isCircuitOpen(config: ComplianceConfig): boolean {
    const state = circuitStates.get(config.providerId);
    if (!state) return false;

    if (state.state === 'open') {
        // Check if we should move to half-open
        if (Date.now() - state.lastFailure > config.circuitBreaker.resetMs) {
            state.state = 'half-open';
            return false;
        }
        return true;
    }

    return false;
}

/**
 * Record a failure for circuit breaker
 */
export function recordCircuitFailure(config: ComplianceConfig): void {
    let state = circuitStates.get(config.providerId);
    if (!state) {
        state = { failures: 0, lastFailure: 0, state: 'closed' };
        circuitStates.set(config.providerId, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= config.circuitBreaker.threshold) {
        state.state = 'open';
        console.log(`[Compliance] Circuit OPENED for ${config.providerId}`);
    }
}

/**
 * Record a success for circuit breaker
 */
export function recordCircuitSuccess(config: ComplianceConfig): void {
    const state = circuitStates.get(config.providerId);
    if (state) {
        state.failures = 0;
        state.state = 'closed';
    }
}

// ============================================================================
// Request Audit Log
// ============================================================================

interface AuditEntry {
    timestamp: number;
    providerId: string;
    operation: string;
    traceId: string;
    success: boolean;
    latencyMs: number;
    statusCode?: number;
}

const AUDIT_LOG_KEY = 'lumi_provider_audit_log';
const MAX_AUDIT_ENTRIES = 200;

/**
 * Log request for compliance audit
 */
export function logAuditEntry(entry: AuditEntry): void {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        const log: AuditEntry[] = stored ? JSON.parse(stored) : [];

        log.unshift(entry);

        // Keep only recent entries
        const trimmed = log.slice(0, MAX_AUDIT_ENTRIES);
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('[Compliance] Failed to log audit entry:', e);
    }
}

/**
 * Get audit log entries
 */
export function getAuditLog(limit: number = 50): AuditEntry[] {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        if (stored) {
            const log = JSON.parse(stored) as AuditEntry[];
            return log.slice(0, limit);
        }
    } catch (e) {
        console.error('[Compliance] Failed to read audit log:', e);
    }
    return [];
}

// ============================================================================
// Compliance Check Helpers
// ============================================================================

/**
 * Check if we should respect robots.txt for a domain
 */
export function shouldRespectRobots(config: ComplianceConfig, _path: string): boolean {
    // In production, this would check cached robots.txt rules
    // For now, just return the config setting
    return config.robotsRespect;
}

/**
 * Create a compliant request configuration
 */
export function createCompliantRequest(
    config: ComplianceConfig,
    url: string,
    options: Partial<RequestContext> = {}
): RequestContext & { headers: Record<string, string> } {
    return {
        traceId: options.traceId || `trace_${Date.now()}`,
        url,
        method: options.method || 'GET',
        headers: {
            ...getRandomizedHeaders(config),
            ...options.headers,
        },
        body: options.body,
        timeout: options.timeout || 10000,
    };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a compliance configuration for a provider
 */
export function createComplianceConfig(
    providerId: string,
    overrides: Partial<Omit<ComplianceConfig, 'providerId'>> = {}
): ComplianceConfig {
    return {
        providerId,
        ...DEFAULT_COMPLIANCE_CONFIG,
        ...overrides,
    };
}

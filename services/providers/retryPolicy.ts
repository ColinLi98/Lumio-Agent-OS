/**
 * Retry Policy
 * L.I.X. Provider Adapter Layer
 * 
 * Bounded retry with exponential backoff and jitter.
 * Differentiates between hard bans (no retry) and soft failures (retry once).
 */

import type { BanSignal, BanSeverity, RetryConfig, RetryResult, ProviderId } from './providerTypes.js';
import { getAlternateFingerprint, generateFingerprint } from './fingerprintPolicy.js';
import { incCounter } from '../metricsCollector.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    max_attempts: 2,        // Including initial attempt
    base_delay_ms: 500,
    max_delay_ms: 3000,
    jitter_ms: 300
};

// Which severities are retryable
const RETRYABLE_SEVERITIES: BanSeverity[] = ['SOFT'];

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Check if a ban signal is retryable
 */
export function isRetryable(signal: BanSignal | undefined): boolean {
    if (!signal || !signal.detected) {
        return false; // No failure, no retry needed
    }

    return signal.severity !== undefined && RETRYABLE_SEVERITIES.includes(signal.severity);
}

/**
 * Calculate delay for retry attempt
 */
export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
    // Exponential backoff: base * 2^attempt
    const exponentialDelay = config.base_delay_ms * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.max_delay_ms);

    // Add jitter
    const jitter = Math.random() * config.jitter_ms;

    return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Retry Executor
// ============================================================================

export interface RetryContext<T> {
    provider_id: ProviderId;
    operation_name: string;
    config?: RetryConfig;
}

/**
 * Execute a function with retry logic
 * 
 * @param fn - Async function to execute. Returns { success, data?, ban_signal? }
 * @param context - Retry context
 */
export async function withRetry<T>(
    fn: (attempt: number) => Promise<{
        success: boolean;
        data?: T;
        ban_signal?: BanSignal;
        error?: string;
    }>,
    context: RetryContext<T>
): Promise<RetryResult<T>> {
    const config = context.config || DEFAULT_RETRY_CONFIG;
    const startTime = Date.now();

    let lastError: string | undefined;
    let lastSignal: BanSignal | undefined;

    for (let attempt = 1; attempt <= config.max_attempts; attempt++) {
        try {
            const result = await fn(attempt);

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                    attempts: attempt,
                    total_latency_ms: Date.now() - startTime
                };
            }

            // Failed - check if retryable
            lastError = result.error;
            lastSignal = result.ban_signal;

            if (lastSignal?.severity === 'HARD') {
                // Hard ban - no retry
                console.log(`[retryPolicy.hard_ban] provider=${context.provider_id} op=${context.operation_name} reason=${lastSignal.reason}`);
                break;
            }

            if (attempt < config.max_attempts && isRetryable(lastSignal)) {
                // Soft failure - retry with delay
                const delay = calculateDelay(attempt, config);
                console.log(`[retryPolicy.retry] provider=${context.provider_id} op=${context.operation_name} attempt=${attempt}/${config.max_attempts} delay=${delay}ms`);

                incCounter('lix_provider_retries_total', {
                    provider_id: context.provider_id,
                    reason: lastSignal?.reason || 'unknown'
                });

                await sleep(delay);
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            console.error(`[retryPolicy.error] provider=${context.provider_id} op=${context.operation_name} attempt=${attempt}`, error);

            if (attempt < config.max_attempts) {
                const delay = calculateDelay(attempt, config);
                await sleep(delay);
            }
        }
    }

    // All attempts failed
    return {
        success: false,
        attempts: config.max_attempts,
        total_latency_ms: Date.now() - startTime,
        last_error: lastError || lastSignal?.message || 'Unknown failure'
    };
}

// ============================================================================
// Retry Strategies
// ============================================================================

export interface FetchRetryOptions {
    url: string;
    provider_id: ProviderId;
    headers: Record<string, string>;
    timeout_ms?: number;
    config?: RetryConfig;
}

/**
 * Fetch with retry and fingerprint rotation
 */
export async function fetchWithRetry(
    options: FetchRetryOptions
): Promise<RetryResult<Response>> {
    const { url, provider_id, headers, timeout_ms = 8000, config } = options;

    return withRetry<Response>(
        async (attempt) => {
            // On retry, could rotate fingerprint
            const requestHeaders = attempt > 1
                ? { ...headers, 'X-Retry-Attempt': String(attempt) }
                : headers;

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), timeout_ms + (attempt * 2000)); // Longer timeout on retry

                const response = await fetch(url, {
                    headers: requestHeaders,
                    signal: controller.signal,
                    redirect: 'follow'
                });

                clearTimeout(timeout);

                // Check for ban status codes
                if (response.status === 403 || response.status === 429) {
                    return {
                        success: false,
                        ban_signal: {
                            detected: true,
                            reason: response.status === 403 ? 'HTTP_403' : 'HTTP_429',
                            severity: 'HARD',
                            score_delta: 5
                        }
                    };
                }

                if (!response.ok) {
                    return {
                        success: false,
                        error: `HTTP ${response.status}`,
                        ban_signal: {
                            detected: true,
                            reason: 'HTTP_429', // Assume rate limit for 4xx
                            severity: 'SOFT',
                            score_delta: 1
                        }
                    };
                }

                return { success: true, data: response };

            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return {
                        success: false,
                        error: 'Timeout',
                        ban_signal: {
                            detected: true,
                            reason: 'TIMEOUT',
                            severity: 'SOFT',
                            score_delta: 1
                        }
                    };
                }
                throw error;
            }
        },
        { provider_id, operation_name: 'fetch', config }
    );
}

// ============================================================================
// Export Configuration
// ============================================================================

export { DEFAULT_RETRY_CONFIG };

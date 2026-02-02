/**
 * Headless Pool
 * L.I.X. Provider Adapter Layer
 * 
 * Playwright/Puppeteer wrapper for Vercel with concurrency cap.
 * Graceful degradation to fetch when headless fails.
 */

import type { ProviderId, BrowserFingerprint, BanSignal, CandidateItem, DetailExtractionResult } from './providerTypes';
import { generateFingerprint, buildHeaders } from './fingerprintPolicy';
import { detectBan } from './banDetector';
import { getDomainAllowlist } from './selectorPolicy';
import { observeHistogram } from '../metricsCollector';
import { eventBus } from '../eventBus';

// ============================================================================
// Configuration
// ============================================================================

const MAX_GLOBAL_CONCURRENCY = 3;
const HEADLESS_TIMEOUT_MS = 8000;
const NAVIGATION_TIMEOUT_MS = 10000;

// Resource blocking patterns
const BLOCKED_RESOURCES = [
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.svg',
    '*.woff', '*.woff2', '*.ttf', '*.eot',
    '*.mp4', '*.webm', '*.mp3',
    'google-analytics.com', 'googletagmanager.com',
    'facebook.com', 'doubleclick.net'
];

// ============================================================================
// Concurrency Control
// ============================================================================

let activeRequests = 0;
const requestQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
    if (activeRequests < MAX_GLOBAL_CONCURRENCY) {
        activeRequests++;
        return;
    }

    // Wait for a slot
    return new Promise(resolve => {
        requestQueue.push(() => {
            activeRequests++;
            resolve();
        });
    });
}

function releaseSlot(): void {
    activeRequests--;
    if (requestQueue.length > 0) {
        const next = requestQueue.shift();
        if (next) next();
    }
}

// ============================================================================
// Headless Fetch (with fallback to regular fetch)
// ============================================================================

export interface HeadlessFetchOptions {
    url: string;
    provider_id: ProviderId;
    trace_id: string;
    timeout_ms?: number;
    wait_for_selector?: string;
    scroll?: boolean;
}

export interface HeadlessFetchResult {
    success: boolean;
    html?: string;
    final_url?: string;
    redirect_count?: number;
    latency_ms: number;
    used_headless: boolean;
    ban_signal?: BanSignal;
    error?: string;
}

/**
 * Fetch a page using headless browser or fallback to regular fetch
 */
export async function headlessFetch(options: HeadlessFetchOptions): Promise<HeadlessFetchResult> {
    const { url, provider_id, trace_id, timeout_ms = HEADLESS_TIMEOUT_MS } = options;
    const fingerprint = generateFingerprint(provider_id);
    const startTime = Date.now();

    await acquireSlot();

    try {
        // Emit start event
        eventBus.emit({
            event_type: 'provider.fetch.start',
            trace_id,
            provider_id,
            timestamp: Date.now(),
            url_hash: hashUrl(url)
        });

        // Try headless first (in production with Playwright)
        const headlessResult = await tryHeadlessFetch(url, fingerprint, provider_id, timeout_ms);

        if (headlessResult.success) {
            const latency_ms = Date.now() - startTime;
            observeHistogram('lix_provider_latency_seconds', latency_ms / 1000, { provider_id, layer: 'fetch' });

            return {
                ...headlessResult,
                latency_ms,
                used_headless: true
            };
        }

        // Fallback to regular fetch
        console.log(`[headlessPool.fallback] provider=${provider_id} url=${url.substring(0, 50)}... falling back to fetch`);
        const fetchResult = await tryRegularFetch(url, fingerprint, provider_id, timeout_ms);

        const latency_ms = Date.now() - startTime;
        observeHistogram('lix_provider_latency_seconds', latency_ms / 1000, { provider_id, layer: 'fetch' });

        return {
            ...fetchResult,
            latency_ms,
            used_headless: false
        };

    } finally {
        releaseSlot();
    }
}

// ============================================================================
// Headless Browser (Playwright)
// ============================================================================

async function tryHeadlessFetch(
    url: string,
    fingerprint: BrowserFingerprint,
    provider_id: ProviderId,
    timeout_ms: number
): Promise<Omit<HeadlessFetchResult, 'latency_ms' | 'used_headless'>> {
    try {
        // Try to import Playwright (may not be available in all environments)
        const playwright = await import('playwright');
        const { chromium } = playwright;

        const browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        try {
            const context = await browser.newContext({
                userAgent: fingerprint.user_agent,
                viewport: fingerprint.viewport,
                deviceScaleFactor: fingerprint.device_scale_factor,
                isMobile: fingerprint.is_mobile,
                locale: fingerprint.locale,
                timezoneId: fingerprint.timezone
            });

            // Block heavy resources
            await context.route('**/*', route => {
                const url = route.request().url();
                const resourceType = route.request().resourceType();

                if (['image', 'font', 'media'].includes(resourceType)) {
                    return route.abort();
                }

                for (const pattern of BLOCKED_RESOURCES) {
                    if (url.includes(pattern.replace('*', ''))) {
                        return route.abort();
                    }
                }

                return route.continue();
            });

            const page = await context.newPage();

            let redirectCount = 0;
            page.on('response', response => {
                if ([301, 302, 303, 307, 308].includes(response.status())) {
                    redirectCount++;
                }
            });

            // Navigate with timeout
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: timeout_ms
            });

            // Small random delay (human-ish)
            await page.waitForTimeout(200 + Math.random() * 400);

            const html = await page.content();
            const finalUrl = page.url();

            await browser.close();

            // Check for ban
            const allowedDomains = getDomainAllowlist(provider_id);
            const banSignal = detectBan({
                url,
                final_url: finalUrl,
                html,
                redirect_count: redirectCount,
                allowed_domains: allowedDomains,
                provider_id,
                trace_id: ''
            });

            if (banSignal.detected) {
                return {
                    success: false,
                    final_url: finalUrl,
                    redirect_count: redirectCount,
                    ban_signal: banSignal,
                    error: banSignal.message
                };
            }

            return {
                success: true,
                html,
                final_url: finalUrl,
                redirect_count: redirectCount
            };

        } finally {
            await browser.close();
        }

    } catch (error) {
        // Playwright not available or failed
        console.warn(`[headlessPool.playwright_error]`, error instanceof Error ? error.message : error);
        return {
            success: false,
            error: 'Headless unavailable'
        };
    }
}

// ============================================================================
// Regular Fetch Fallback
// ============================================================================

async function tryRegularFetch(
    url: string,
    fingerprint: BrowserFingerprint,
    provider_id: ProviderId,
    timeout_ms: number
): Promise<Omit<HeadlessFetchResult, 'latency_ms' | 'used_headless'>> {
    try {
        const headers = buildHeaders(fingerprint, provider_id);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeout_ms);

        let redirectCount = 0;
        let finalUrl = url;

        // Manual redirect following to count hops
        const response = await fetch(url, {
            headers,
            signal: controller.signal,
            redirect: 'manual'
        });

        clearTimeout(timeout);

        // Handle redirects manually
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            if (location) {
                redirectCount++;
                // For simplicity, follow one redirect
                const redirectResponse = await fetch(location, {
                    headers,
                    redirect: 'follow'
                });
                finalUrl = redirectResponse.url;

                // Count additional redirects (approximation)
                if (redirectResponse.redirected) {
                    redirectCount++;
                }

                const html = await redirectResponse.text();
                return processResponse(html, finalUrl, redirectCount, provider_id);
            }
        }

        // Check for ban status codes
        if (response.status === 403 || response.status === 429) {
            return {
                success: false,
                ban_signal: {
                    detected: true,
                    reason: response.status === 403 ? 'HTTP_403' : 'HTTP_429',
                    severity: 'HARD',
                    score_delta: 5
                },
                error: `HTTP ${response.status}`
            };
        }

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}`
            };
        }

        const html = await response.text();
        finalUrl = response.url;

        return processResponse(html, finalUrl, redirectCount, provider_id);

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                ban_signal: {
                    detected: true,
                    reason: 'TIMEOUT',
                    severity: 'SOFT',
                    score_delta: 1
                },
                error: 'Timeout'
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fetch failed'
        };
    }
}

function processResponse(
    html: string,
    finalUrl: string,
    redirectCount: number,
    provider_id: ProviderId
): Omit<HeadlessFetchResult, 'latency_ms' | 'used_headless'> {
    const allowedDomains = getDomainAllowlist(provider_id);

    // Check for ban signals in HTML
    const banSignal = detectBan({
        url: finalUrl,
        final_url: finalUrl,
        html,
        redirect_count: redirectCount,
        allowed_domains: allowedDomains,
        provider_id,
        trace_id: ''
    });

    if (banSignal.detected) {
        return {
            success: false,
            final_url: finalUrl,
            redirect_count: redirectCount,
            ban_signal: banSignal,
            error: banSignal.message
        };
    }

    return {
        success: true,
        html,
        final_url: finalUrl,
        redirect_count: redirectCount
    };
}

// ============================================================================
// Pool Statistics
// ============================================================================

export function getPoolStats(): {
    active_requests: number;
    queued_requests: number;
    max_concurrency: number;
} {
    return {
        active_requests: activeRequests,
        queued_requests: requestQueue.length,
        max_concurrency: MAX_GLOBAL_CONCURRENCY
    };
}

// ============================================================================
// Utility
// ============================================================================

function hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(url.length, 100); i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Real HTTP Redirect Chaser
 * L.I.X. v0.2 Compliant - P1-1
 * 
 * Implements REAL redirect following (not simulated)
 * Uses fetch with redirect: 'manual' to track each hop.
 * 
 * Rules:
 * - Max 4 hops allowed (>3 = BLOCK)
 * - Domain mismatch = BLOCK
 * - Tracks each hop with status code and location header
 */

// ============================================================================
// Types
// ============================================================================

export interface RedirectHop {
    hop_number: number;
    url: string;
    status_code: number;
    location?: string;
    latency_ms: number;
}

export interface RedirectChaseResult {
    final_url: string;
    total_hops: number;
    hops: RedirectHop[];
    domain_changed: boolean;
    original_domain: string;
    final_domain: string;
    total_latency_ms: number;
    blocked: boolean;
    block_reason?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    MAX_HOPS: 4,          // v0.2: >3 = BLOCK
    TIMEOUT_MS: 5000,     // 5 second timeout per hop
    USER_AGENT: 'LIX-Validator/0.2 (Redirect Chaser)'
};

// ============================================================================
// Domain Extraction
// ============================================================================

function extractDomain(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase();
    } catch {
        return '';
    }
}

function extractRootDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
        return parts.slice(-2).join('.');
    }
    return hostname;
}

// ============================================================================
// Main Redirect Chaser
// ============================================================================

/**
 * Chase redirects for a URL and return detailed results
 * Uses fetch with redirect: 'manual' to track each hop
 */
export async function chaseRedirects(url: string): Promise<RedirectChaseResult> {
    const startTime = Date.now();
    const originalDomain = extractDomain(url);
    const hops: RedirectHop[] = [];

    let currentUrl = url;
    let blocked = false;
    let blockReason: string | undefined;

    for (let hopNumber = 1; hopNumber <= CONFIG.MAX_HOPS + 1; hopNumber++) {
        const hopStartTime = Date.now();

        try {
            // Fetch with manual redirect handling
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

            const response = await fetch(currentUrl, {
                method: 'HEAD', // Use HEAD to be lighter
                redirect: 'manual', // Don't follow redirects automatically
                headers: {
                    'User-Agent': CONFIG.USER_AGENT
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            const statusCode = response.status;
            const location = response.headers.get('location') || undefined;
            const hopLatency = Date.now() - hopStartTime;

            hops.push({
                hop_number: hopNumber,
                url: currentUrl,
                status_code: statusCode,
                location,
                latency_ms: hopLatency
            });

            // Check if this is a redirect (3xx status)
            if (statusCode >= 300 && statusCode < 400 && location) {
                // Resolve relative URLs
                const nextUrl = new URL(location, currentUrl).toString();

                // Check hop limit
                if (hopNumber >= CONFIG.MAX_HOPS) {
                    blocked = true;
                    blockReason = `Redirect count exceeds ${CONFIG.MAX_HOPS - 1} hops (v0.2 limit)`;
                    console.log(`[security.redirect_block] url=${url.substring(0, 50)}... hops=${hopNumber}`);
                    break;
                }

                currentUrl = nextUrl;
            } else {
                // Not a redirect, we've reached the final URL
                break;
            }

        } catch (error) {
            // Network error or timeout
            hops.push({
                hop_number: hopNumber,
                url: currentUrl,
                status_code: 0,
                latency_ms: Date.now() - hopStartTime
            });

            console.warn(`[redirect_chaser.error] hop=${hopNumber} url=${currentUrl.substring(0, 50)}... error=${error instanceof Error ? error.message : 'unknown'}`);
            break;
        }
    }

    // Calculate final results
    const finalUrl = currentUrl;
    const finalDomain = extractDomain(finalUrl);
    const totalHops = hops.length;
    const totalLatency = Date.now() - startTime;

    // Check for domain change
    const originalRoot = extractRootDomain(originalDomain);
    const finalRoot = extractRootDomain(finalDomain);
    const domainChanged = originalRoot !== finalRoot;

    // Check for domain mismatch blocking
    if (domainChanged && !blocked) {
        // Allow known CDN/redirect service domains
        const allowedIntermediaryDomains = [
            'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
            'cloudflare.com', 'akamai.net', 'amazonaws.com'
        ];

        const isAllowedIntermediary = allowedIntermediaryDomains.some(d =>
            originalDomain.includes(d) || finalDomain.includes(d)
        );

        if (!isAllowedIntermediary) {
            blocked = true;
            blockReason = `Domain mismatch: ${originalRoot} → ${finalRoot}`;
            console.log(`[security.domain_mismatch] original=${originalDomain} final=${finalDomain}`);
        }
    }

    return {
        final_url: finalUrl,
        total_hops: totalHops,
        hops,
        domain_changed: domainChanged,
        original_domain: originalDomain,
        final_domain: finalDomain,
        total_latency_ms: totalLatency,
        blocked,
        block_reason: blockReason
    };
}

// ============================================================================
// Simplified Interface for Validator
// ============================================================================

/**
 * Quick redirect check for offer validator
 * Returns whether URL should be blocked and reason
 */
export async function checkRedirects(url: string): Promise<{
    passed: boolean;
    hops: number;
    action: 'PASS' | 'BLOCK';
    reason?: string;
    latency_ms: number;
}> {
    const result = await chaseRedirects(url);

    return {
        passed: !result.blocked,
        hops: result.total_hops,
        action: result.blocked ? 'BLOCK' : 'PASS',
        reason: result.block_reason,
        latency_ms: result.total_latency_ms
    };
}

/**
 * Synchronous fallback for when async is not possible
 * Uses cached/simulated results based on URL patterns
 */
export function checkRedirectsSync(url: string): {
    passed: boolean;
    hops: number;
    action: 'PASS' | 'BLOCK';
    reason?: string;
} {
    // Pattern-based heuristics for synchronous checking
    const suspiciousPatterns = [
        /redirect.*redirect/i,
        /\?url=/i,
        /\?next=/i,
        /\/r\//,
        /goto\//i
    ];

    const hasSuspiciousPattern = suspiciousPatterns.some(p => p.test(url));

    // Known redirect chain domains
    const multiRedirectDomains = [
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly'
    ];

    const domain = extractDomain(url);
    const isShortener = multiRedirectDomains.some(d => domain.includes(d));

    // Estimate hops
    let estimatedHops = 1;
    if (isShortener) estimatedHops += 2;
    if (hasSuspiciousPattern) estimatedHops += 1;

    return {
        passed: estimatedHops <= 3,
        hops: estimatedHops,
        action: estimatedHops > 3 ? 'BLOCK' : 'PASS',
        reason: estimatedHops > 3 ? 'Estimated redirect count exceeds limit' : undefined
    };
}

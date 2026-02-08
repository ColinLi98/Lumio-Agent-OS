/**
 * Ban Detector
 * L.I.X. Provider Adapter Layer
 * 
 * Detects ban signals from HTTP responses and page content.
 * Returns BanSignal with severity and recommended action.
 */

import type { BanSignal, BanReason, BanSeverity, ProviderId } from './providerTypes.js';
import { eventBus } from '../eventBus.js';
import { incCounter } from '../metricsCollector.js';

// ============================================================================
// Ban Detection Keywords
// ============================================================================

const BAN_URL_KEYWORDS = [
    'captcha',
    'verify',
    'risk',
    'security',
    'sec',
    'check',
    'login',
    'passport',
    'safe'
];

const BAN_HTML_KEYWORDS_CN = [
    '验证码',
    '安全验证',
    '滑块',
    '请验证',
    '账号异常',
    '访问频繁',
    '请登录',
    '登录后查看',
    '请输入验证码',
    '人机验证'
];

const BAN_HTML_KEYWORDS_EN = [
    'captcha',
    'robot',
    'verify you',
    'are you human',
    'access denied',
    'rate limit',
    'blocked',
    'suspicious activity',
    'too many requests'
];

// ============================================================================
// Score Configuration
// ============================================================================

const BAN_SCORE_MAP: Record<BanReason, { severity: BanSeverity; delta: number }> = {
    'HTTP_403': { severity: 'HARD', delta: 5 },
    'HTTP_429': { severity: 'HARD', delta: 5 },
    'CAPTCHA_PAGE': { severity: 'HARD', delta: 5 },
    'LOGIN_REQUIRED': { severity: 'HARD', delta: 3 },
    'SECURITY_REDIRECT': { severity: 'HARD', delta: 3 },
    'EMPTY_DOM': { severity: 'SOFT', delta: 1 },
    'PARSE_FAILED': { severity: 'SOFT', delta: 1 },
    'REDIRECT_BLOCKED': { severity: 'SOFT', delta: 2 },
    'DOMAIN_MISMATCH': { severity: 'SOFT', delta: 2 },
    'TIMEOUT': { severity: 'SOFT', delta: 1 }
};

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check HTTP status code for ban signals
 */
export function checkStatusCode(status: number): BanSignal {
    if (status === 403) {
        return createBanSignal('HTTP_403');
    }
    if (status === 429) {
        return createBanSignal('HTTP_429');
    }
    if (status >= 500 && status < 600) {
        // Server errors might indicate rate limiting
        return createBanSignal('TIMEOUT');
    }
    return { detected: false };
}

/**
 * Check response URL for ban signals
 */
export function checkResponseUrl(url: string): BanSignal {
    const lowerUrl = url.toLowerCase();

    for (const keyword of BAN_URL_KEYWORDS) {
        if (lowerUrl.includes(keyword)) {
            if (keyword === 'login' || keyword === 'passport') {
                return createBanSignal('LOGIN_REQUIRED');
            }
            if (keyword === 'captcha' || keyword === 'verify') {
                return createBanSignal('CAPTCHA_PAGE');
            }
            return createBanSignal('SECURITY_REDIRECT');
        }
    }

    return { detected: false };
}

/**
 * Check HTML content for ban signals
 */
export function checkHtmlContent(html: string): BanSignal {
    const lowerHtml = html.toLowerCase();

    // Check Chinese ban keywords
    for (const keyword of BAN_HTML_KEYWORDS_CN) {
        if (html.includes(keyword)) {
            if (keyword.includes('验证码') || keyword.includes('滑块')) {
                return createBanSignal('CAPTCHA_PAGE');
            }
            if (keyword.includes('登录')) {
                return createBanSignal('LOGIN_REQUIRED');
            }
            return createBanSignal('SECURITY_REDIRECT');
        }
    }

    // Check English ban keywords
    for (const keyword of BAN_HTML_KEYWORDS_EN) {
        if (lowerHtml.includes(keyword)) {
            if (keyword.includes('captcha') || keyword.includes('robot')) {
                return createBanSignal('CAPTCHA_PAGE');
            }
            return createBanSignal('SECURITY_REDIRECT');
        }
    }

    return { detected: false };
}

/**
 * Check if DOM is empty or missing required elements
 */
export function checkDomEmpty(
    html: string,
    requiredPatterns: string[]
): BanSignal {
    // Check if HTML is too short (likely error page)
    if (html.length < 1000) {
        return createBanSignal('EMPTY_DOM');
    }

    // Check for required patterns (e.g., price elements)
    let foundAny = false;
    for (const pattern of requiredPatterns) {
        if (html.includes(pattern)) {
            foundAny = true;
            break;
        }
    }

    if (!foundAny && requiredPatterns.length > 0) {
        return createBanSignal('PARSE_FAILED');
    }

    return { detected: false };
}

/**
 * Check redirect chain for issues
 */
export function checkRedirects(
    redirectCount: number,
    finalDomain: string,
    allowedDomains: string[]
): BanSignal {
    // Too many redirects
    if (redirectCount > 3) {
        return createBanSignal('REDIRECT_BLOCKED');
    }

    // Check domain allowlist
    const normalizedFinal = finalDomain.toLowerCase().replace(/^www\./, '');
    const isAllowed = allowedDomains.some(d => {
        const normalized = d.replace(/^\*\./, '').toLowerCase();
        return normalizedFinal === normalized ||
            normalizedFinal.endsWith('.' + normalized);
    });

    if (!isAllowed) {
        return createBanSignal('DOMAIN_MISMATCH');
    }

    return { detected: false };
}

// ============================================================================
// Comprehensive Detection
// ============================================================================

export interface DetectionInput {
    status?: number;
    url: string;
    final_url?: string;
    html?: string;
    redirect_count?: number;
    allowed_domains: string[];
    required_patterns?: string[];
    provider_id: ProviderId;
    trace_id: string;
}

/**
 * Run all detection checks on a response
 */
export function detectBan(input: DetectionInput): BanSignal {
    const { status, url, final_url, html, redirect_count, allowed_domains, required_patterns, provider_id, trace_id } = input;

    // 1. Check status code
    if (status) {
        const statusSignal = checkStatusCode(status);
        if (statusSignal.detected) {
            emitBanEvent(provider_id, trace_id, url, statusSignal);
            return statusSignal;
        }
    }

    // 2. Check response URL
    const targetUrl = final_url || url;
    const urlSignal = checkResponseUrl(targetUrl);
    if (urlSignal.detected) {
        emitBanEvent(provider_id, trace_id, url, urlSignal);
        return urlSignal;
    }

    // 3. Check redirects
    if (redirect_count !== undefined && final_url) {
        const domain = new URL(final_url).hostname;
        const redirectSignal = checkRedirects(redirect_count, domain, allowed_domains);
        if (redirectSignal.detected) {
            emitBanEvent(provider_id, trace_id, url, redirectSignal);
            return redirectSignal;
        }
    }

    // 4. Check HTML content
    if (html) {
        const htmlSignal = checkHtmlContent(html);
        if (htmlSignal.detected) {
            emitBanEvent(provider_id, trace_id, url, htmlSignal);
            return htmlSignal;
        }

        // 5. Check for empty DOM
        if (required_patterns) {
            const domSignal = checkDomEmpty(html, required_patterns);
            if (domSignal.detected) {
                emitBanEvent(provider_id, trace_id, url, domSignal);
                return domSignal;
            }
        }
    }

    return { detected: false };
}

// ============================================================================
// Helpers
// ============================================================================

function createBanSignal(reason: BanReason): BanSignal {
    const config = BAN_SCORE_MAP[reason];
    return {
        detected: true,
        reason,
        severity: config.severity,
        score_delta: config.delta,
        message: `Ban detected: ${reason}`
    };
}

function emitBanEvent(
    provider_id: ProviderId,
    trace_id: string,
    url: string,
    signal: BanSignal
): void {
    // Emit structured event
    eventBus.emit({
        event_type: 'provider.ban_detected',
        trace_id,
        provider_id,
        timestamp: Date.now(),
        url_hash: hashUrl(url),
        ban_reason: signal.reason,
        ban_severity: signal.severity
    });

    // Record metric
    incCounter('lix_provider_failures_total', {
        provider_id,
        reason: signal.reason || 'unknown'
    });

    console.log(`[banDetector.${signal.severity}] provider=${provider_id} reason=${signal.reason} url=${url.substring(0, 50)}...`);
}

function hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(url.length, 100); i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// ============================================================================
// Export for Testing
// ============================================================================

export const _testing = {
    BAN_URL_KEYWORDS,
    BAN_HTML_KEYWORDS_CN,
    BAN_HTML_KEYWORDS_EN,
    BAN_SCORE_MAP
};

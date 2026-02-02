/**
 * URL Safety Service
 * L.I.X. v0.2 Compliant
 * 
 * Stub interface for external URL safety checks:
 * - VirusTotal API
 * - Google Safe Browsing API
 * 
 * MVP: Uses internal blocklist
 * Production: Integrate real APIs
 */

// ============================================================================
// Types
// ============================================================================

export interface UrlSafetyResult {
    safe: boolean;
    threatType?: 'malware' | 'phishing' | 'suspicious_domain' | 'invalid_url' | 'non_https';
    source: 'virustotal' | 'google_safe_browsing' | 'internal';
    details?: string;
    latency_ms: number;
}

export interface RedirectAnalysisResult {
    hops: number;
    finalUrl: string;
    domains: string[];
    domainChanged: boolean;
    latency_ms: number;
}

// ============================================================================
// Internal Blocklists
// ============================================================================

const MALICIOUS_PATTERNS = [
    // Common phishing/scam patterns
    'phishing', 'malware', 'scam', 'fake', 'counterfeit',
    // Chinese spam patterns
    '免费领取', '中奖', '诈骗', '仿冒', '假货',
    // URL obfuscation patterns
    'bit.ly', 'tinyurl', 'goo.gl', 't.co'
];

const SUSPICIOUS_TLDS = [
    '.tk', '.ml', '.ga', '.cf', '.gq',  // Free TLDs often used for scams
    '.xyz', '.top', '.club', '.work', '.date',
    '.loan', '.racing', '.review', '.cricket'
];

const TRUSTED_DOMAINS = [
    // Chinese e-commerce
    'jd.com', 'taobao.com', 'tmall.com', 'pinduoduo.com', 'yangkeduo.com',
    'suning.com', 'vip.com', 'dangdang.com',
    // Job platforms
    'zhipin.com', 'liepin.com', 'lagou.com', '51job.com',
    // Freelance/collaboration
    'upwork.com', 'fiverr.com', 'zbj.com'
];

// ============================================================================
// URL Safety Check
// ============================================================================

/**
 * Check URL safety using internal blocklist
 * 
 * MVP: Pattern matching against known bad patterns
 * Production: Call VirusTotal / Google Safe Browsing APIs
 */
export async function checkUrlSafety(url: string): Promise<UrlSafetyResult> {
    const start = Date.now();

    // Validate URL format
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return {
            safe: false,
            threatType: 'invalid_url',
            source: 'internal',
            details: 'Could not parse URL',
            latency_ms: Date.now() - start
        };
    }

    // Check HTTPS
    if (parsedUrl.protocol !== 'https:') {
        return {
            safe: false,
            threatType: 'non_https',
            source: 'internal',
            details: 'URL must use HTTPS',
            latency_ms: Date.now() - start
        };
    }

    const normalized = url.toLowerCase();
    const domain = parsedUrl.hostname.toLowerCase();

    // Check malicious patterns
    for (const pattern of MALICIOUS_PATTERNS) {
        if (normalized.includes(pattern)) {
            console.log(`[security.url_blocked] Pattern match: ${pattern} in ${url}`);
            return {
                safe: false,
                threatType: pattern.includes('phishing') ? 'phishing' : 'malware',
                source: 'internal',
                details: `Matched malicious pattern: ${pattern}`,
                latency_ms: Date.now() - start
            };
        }
    }

    // Check suspicious TLDs (unless domain is trusted)
    const isTrusted = TRUSTED_DOMAINS.some(d => domain.endsWith(d));
    if (!isTrusted) {
        for (const tld of SUSPICIOUS_TLDS) {
            if (domain.endsWith(tld)) {
                console.log(`[security.url_suspicious] Suspicious TLD: ${domain}`);
                return {
                    safe: false,
                    threatType: 'suspicious_domain',
                    source: 'internal',
                    details: `Suspicious TLD: ${tld}`,
                    latency_ms: Date.now() - start
                };
            }
        }
    }

    // TODO: In production, call external APIs here
    // const vtResult = await callVirusTotal(url);
    // const gsbResult = await callGoogleSafeBrowsing(url);

    return {
        safe: true,
        source: 'internal',
        latency_ms: Date.now() - start
    };
}

// ============================================================================
// Redirect Analysis
// ============================================================================

/**
 * Analyze redirect chain for URL
 * 
 * MVP: Simulates redirect analysis based on URL patterns
 * Production: Use fetch with { redirect: 'manual' } to follow redirects
 */
export async function countRedirectHops(url: string): Promise<RedirectAnalysisResult> {
    const start = Date.now();

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return {
            hops: 0,
            finalUrl: url,
            domains: [],
            domainChanged: false,
            latency_ms: Date.now() - start
        };
    }

    const originalDomain = parsedUrl.hostname;
    const domains: string[] = [originalDomain];

    // MVP: Simulate redirect analysis based on URL patterns
    // Affiliate links typically have 1-2 redirects
    const isAffiliate =
        url.includes('click.') ||
        url.includes('union.') ||
        url.includes('s.click') ||
        url.includes('redirect') ||
        url.includes('go.');

    // Shortened URLs typically have 2+ redirects
    const isShortened =
        originalDomain.includes('bit.ly') ||
        originalDomain.includes('tinyurl') ||
        originalDomain.includes('t.co');

    let hops = 0;
    if (isShortened) {
        hops = 2 + Math.floor(Math.random() * 2); // 2-3 hops
    } else if (isAffiliate) {
        hops = 1;
    }

    // TODO: In production, actually follow redirects
    // const response = await fetch(url, { redirect: 'manual' });
    // while (response.status >= 300 && response.status < 400) {
    //     const nextUrl = response.headers.get('location');
    //     // ... follow chain
    // }

    return {
        hops,
        finalUrl: url, // MVP: assume same URL
        domains,
        domainChanged: false,
        latency_ms: Date.now() - start
    };
}

/**
 * Check if final domain is allowed for provider
 */
export function isDomainAllowedForProvider(
    domain: string,
    allowedDomains: string[]
): boolean {
    return allowedDomains.some(allowed =>
        domain === allowed || domain.endsWith(`.${allowed}`)
    );
}

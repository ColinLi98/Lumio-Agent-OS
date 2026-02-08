/**
 * Fingerprint Policy
 * L.I.X. Provider Adapter Layer
 * 
 * User agent, viewport, and locale rotation for anti-ban.
 * Config-driven fingerprint selection.
 */

import type { BrowserFingerprint, ProviderId } from './providerTypes.js';

// ============================================================================
// User Agent Pools
// ============================================================================

const DESKTOP_UA_POOL = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const MOBILE_UA_POOL = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
];

// ============================================================================
// Viewport Configurations
// ============================================================================

const DESKTOP_VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
];

const MOBILE_VIEWPORTS = [
    { width: 390, height: 844 },   // iPhone 14/15
    { width: 393, height: 873 },   // Pixel 7
    { width: 412, height: 915 },   // Generic Android
    { width: 375, height: 812 },   // iPhone X/11
];

// ============================================================================
// Provider Preferences
// ============================================================================

interface ProviderFingerPrintPreference {
    prefer_mobile: boolean;
    locale: string;
    timezone: string;
    accept_language: string;
}

const PROVIDER_PREFERENCES: Record<ProviderId, ProviderFingerPrintPreference> = {
    jd: {
        prefer_mobile: false,  // JD works better with desktop
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        accept_language: 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    pdd: {
        prefer_mobile: true,   // PDD is mobile-first
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        accept_language: 'zh-CN,zh;q=0.9'
    },
    taobao: {
        prefer_mobile: true,   // Taobao mobile is less restricted
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        accept_language: 'zh-CN,zh;q=0.9,en;q=0.8'
    }
};

// ============================================================================
// Fingerprint Generation
// ============================================================================

/**
 * Generate a random fingerprint for a provider
 */
export function generateFingerprint(provider_id: ProviderId): BrowserFingerprint {
    const pref = PROVIDER_PREFERENCES[provider_id];
    const is_mobile = pref.prefer_mobile;

    const ua_pool = is_mobile ? MOBILE_UA_POOL : DESKTOP_UA_POOL;
    const viewport_pool = is_mobile ? MOBILE_VIEWPORTS : DESKTOP_VIEWPORTS;

    const user_agent = ua_pool[Math.floor(Math.random() * ua_pool.length)];
    const viewport = viewport_pool[Math.floor(Math.random() * viewport_pool.length)];

    return {
        user_agent,
        viewport,
        device_scale_factor: is_mobile ? 3 : 1,
        is_mobile,
        locale: pref.locale,
        timezone: pref.timezone,
        accept_language: pref.accept_language
    };
}

/**
 * Generate a consistent fingerprint for the same provider + session
 * Uses simple hash to pick same fingerprint for repeated calls within a session
 */
export function generateConsistentFingerprint(provider_id: ProviderId, session_id: string): BrowserFingerprint {
    const pref = PROVIDER_PREFERENCES[provider_id];
    const is_mobile = pref.prefer_mobile;

    // Use session ID to deterministically select from pools
    const hash = simpleHash(session_id);

    const ua_pool = is_mobile ? MOBILE_UA_POOL : DESKTOP_UA_POOL;
    const viewport_pool = is_mobile ? MOBILE_VIEWPORTS : DESKTOP_VIEWPORTS;

    const ua_index = Math.abs(hash) % ua_pool.length;
    const viewport_index = Math.abs(hash >> 4) % viewport_pool.length;

    return {
        user_agent: ua_pool[ua_index],
        viewport: viewport_pool[viewport_index],
        device_scale_factor: is_mobile ? 3 : 1,
        is_mobile,
        locale: pref.locale,
        timezone: pref.timezone,
        accept_language: pref.accept_language
    };
}

/**
 * Get a different fingerprint (for retry with different profile)
 */
export function getAlternateFingerprint(provider_id: ProviderId, current: BrowserFingerprint): BrowserFingerprint {
    const pref = PROVIDER_PREFERENCES[provider_id];
    const is_mobile = pref.prefer_mobile;

    const ua_pool = is_mobile ? MOBILE_UA_POOL : DESKTOP_UA_POOL;
    const viewport_pool = is_mobile ? MOBILE_VIEWPORTS : DESKTOP_VIEWPORTS;

    // Try to find a different UA
    let user_agent = current.user_agent;
    for (const ua of ua_pool) {
        if (ua !== current.user_agent) {
            user_agent = ua;
            break;
        }
    }

    // Try to find a different viewport
    let viewport = current.viewport;
    for (const vp of viewport_pool) {
        if (vp.width !== current.viewport.width) {
            viewport = vp;
            break;
        }
    }

    return {
        ...current,
        user_agent,
        viewport
    };
}

// ============================================================================
// Cookie/Storage Helpers
// ============================================================================

/**
 * Generate basic cookies for a session
 * These are non-identifying cookies that sites expect
 */
export function generateBasicCookies(provider_id: ProviderId): Record<string, string> {
    const now = Date.now();

    switch (provider_id) {
        case 'jd':
            return {
                '__jda': `${Math.random().toString(36).substring(2)}.${now}`,
                '__jdc': '1'
            };
        case 'pdd':
            return {
                'api_uid': `rnd${Math.random().toString(36).substring(2, 10)}`
            };
        case 'taobao':
            return {
                '_tb_token_': Math.random().toString(36).substring(2, 10)
            };
        default:
            return {};
    }
}

// ============================================================================
// Headers Builder
// ============================================================================

/**
 * Build HTTP headers from fingerprint
 */
export function buildHeaders(fingerprint: BrowserFingerprint, provider_id: ProviderId): Record<string, string> {
    const headers: Record<string, string> = {
        'User-Agent': fingerprint.user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': fingerprint.accept_language,
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };

    // Add provider-specific referer
    switch (provider_id) {
        case 'jd':
            headers['Referer'] = 'https://www.jd.com/';
            break;
        case 'pdd':
            headers['Referer'] = 'https://mobile.yangkeduo.com/';
            break;
        case 'taobao':
            headers['Referer'] = 'https://www.taobao.com/';
            break;
    }

    return headers;
}

// ============================================================================
// Utility
// ============================================================================

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

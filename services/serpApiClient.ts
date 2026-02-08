import { buildApiUrl } from './apiBaseUrl.js';
import { buildSerpApiEvidenceItems, normalizeSerpApiPayload } from './serpApiNormalizers.js';
import type {
    SerpApiDomain,
    SerpApiEngine,
    SerpApiExecuteError,
    SerpApiExecuteRequest,
    SerpApiExecuteResponse,
    SerpApiFallbackMeta,
} from './serpApiTypes.js';

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';
const DEFAULT_TTL_SECONDS = 180;
const DEFAULT_TIMEOUT_MS = 15_000;

// Default SerpAPI key for demo / investor testing
const DEFAULT_SERPAPI_KEY = '22d01eef4356b41c6098264dc43020b3921f6878a3be1fb41fd0913d86ecb998';

export function getServerSerpApiKey(): string {
    if (typeof process === 'undefined' || !process.env) return DEFAULT_SERPAPI_KEY;
    return process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || DEFAULT_SERPAPI_KEY;
}

function inferLocaleParams(locale?: string): { hl: string; gl: string } {
    const normalized = (locale || 'zh-CN').toLowerCase();
    if (normalized.startsWith('zh')) {
        return { hl: 'zh-CN', gl: 'cn' };
    }
    if (normalized.startsWith('ja')) {
        return { hl: 'ja', gl: 'jp' };
    }
    return { hl: 'en', gl: 'us' };
}

function getDomainDefaultTtl(domain: SerpApiDomain): number {
    if (domain === 'travel') return 120;
    if (domain === 'shopping') return 180;
    if (domain === 'local_service') return 300;
    return DEFAULT_TTL_SECONDS;
}

function classifyError(status: number, message: string): SerpApiExecuteError {
    if (status === 400) return { code: 'invalid_request', message, retryable: false, status };
    if (status === 401 || status === 403) return { code: 'auth', message, retryable: false, status };
    if (status === 429) return { code: 'quota', message, retryable: true, status };
    if (status >= 500) return { code: 'provider_error', message, retryable: true, status };
    return { code: 'internal_error', message, retryable: true, status };
}

function buildFallback(error: SerpApiExecuteError): SerpApiFallbackMeta {
    const defaultCta = [{ label: '稍后重试', action: 'retry' }];
    if (error.code === 'auth') {
        return {
            reason: 'SerpApi 服务端密钥不可用或无效',
            cta_buttons: [{ label: '检查服务端 SERPAPI_KEY', action: 'check_server_key', constraint_key: 'SERPAPI_KEY' }],
        };
    }
    if (error.code === 'quota') {
        return { reason: 'SerpApi 配额不足，请稍后重试', cta_buttons: defaultCta };
    }
    if (error.code === 'invalid_request') {
        return {
            reason: '搜索参数不完整，请补充约束条件',
            cta_buttons: [{ label: '补充搜索条件', action: 'fill_constraints' }],
        };
    }
    if (error.code === 'no_results') {
        return {
            reason: '未检索到可用结果，请补充地点、时间、预算或品牌约束',
            cta_buttons: [{ label: '补充搜索条件', action: 'fill_constraints' }],
        };
    }
    return { reason: '搜索服务暂时不可用', cta_buttons: defaultCta };
}

function serializeQuery(params: Record<string, string | number | boolean>): URLSearchParams {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        search.set(key, String(value));
    });
    return search;
}

export async function executeSerpApiWithKey(
    request: SerpApiExecuteRequest,
    apiKey: string
): Promise<SerpApiExecuteResponse> {
    const locale = request.locale || 'zh-CN';
    const domain = request.domain || 'general';
    const freshness = request.freshness_policy || 'cache_ok';
    const localeParams = inferLocaleParams(locale);

    if (!apiKey) {
        const error: SerpApiExecuteError = {
            code: 'auth',
            message: 'SERPAPI key is not configured on server',
            retryable: false,
        };
        return {
            success: false,
            engine: request.engine,
            normalized: { kind: 'raw', items: [], links: [] },
            evidence: {
                provider: request.engine,
                fetched_at: new Date().toISOString(),
                ttl_seconds: getDomainDefaultTtl(domain),
                items: [],
            },
            error,
            fallback: buildFallback(error),
        };
    }

    const query = serializeQuery({
        engine: request.engine,
        ...request.params,
        hl: (request.params.hl as string) || localeParams.hl,
        gl: (request.params.gl as string) || localeParams.gl,
        output: 'json',
        no_cache: freshness === 'force_live' ? 'true' : 'false',
        api_key: apiKey,
    });
    const requestUrl = `${SERPAPI_ENDPOINT}?${query.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
        const response = await fetch(requestUrl, { signal: controller.signal });
        const rawText = await response.text();
        let raw: any = null;
        try {
            raw = rawText ? JSON.parse(rawText) : null;
        } catch {
            raw = null;
        }

        if (!response.ok || raw?.error) {
            const message = raw?.error || raw?.message || rawText || `SerpApi HTTP ${response.status}`;
            const error = classifyError(response.status, message);
            return {
                success: false,
                engine: request.engine,
                raw,
                normalized: { kind: 'raw', items: [], links: [] },
                evidence: {
                    provider: request.engine,
                    fetched_at: new Date().toISOString(),
                    ttl_seconds: getDomainDefaultTtl(domain),
                    items: [],
                },
                debug_meta: { status: response.status, request_url: requestUrl.replace(apiKey, '***') },
                error,
                fallback: buildFallback(error),
            };
        }

        const normalized = normalizeSerpApiPayload(request.engine, raw || {});
        const evidenceItems = buildSerpApiEvidenceItems(normalized);
        const empty =
            (!normalized.items || normalized.items.length === 0) &&
            (!normalized.links || normalized.links.length === 0);
        if (empty) {
            const error: SerpApiExecuteError = {
                code: 'no_results',
                message: 'SerpApi returned no normalized results',
                retryable: true,
                status: response.status,
            };
            return {
                success: false,
                engine: request.engine,
                raw,
                normalized,
                evidence: {
                    provider: request.engine,
                    fetched_at: new Date().toISOString(),
                    ttl_seconds: getDomainDefaultTtl(domain),
                    items: evidenceItems,
                },
                debug_meta: { status: response.status, request_url: requestUrl.replace(apiKey, '***') },
                error,
                fallback: buildFallback(error),
            };
        }

        return {
            success: true,
            engine: request.engine,
            raw,
            normalized,
            evidence: {
                provider: request.engine,
                fetched_at: new Date().toISOString(),
                ttl_seconds: getDomainDefaultTtl(domain),
                items: evidenceItems,
            },
            debug_meta: { status: response.status, request_url: requestUrl.replace(apiKey, '***') },
        };
    } catch (error) {
        const normalizedError: SerpApiExecuteError = {
            code: error instanceof Error && error.name === 'AbortError' ? 'network' : 'network',
            message: error instanceof Error ? error.message : 'Network error',
            retryable: true,
        };
        return {
            success: false,
            engine: request.engine,
            normalized: { kind: 'raw', items: [], links: [] },
            evidence: {
                provider: request.engine,
                fetched_at: new Date().toISOString(),
                ttl_seconds: getDomainDefaultTtl(domain),
                items: [],
            },
            error: normalizedError,
            fallback: buildFallback(normalizedError),
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function executeViaApiRoute(request: SerpApiExecuteRequest): Promise<SerpApiExecuteResponse> {
    const response = await fetch(buildApiUrl('/api/serpapi/execute'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
    });
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === 'object') {
        return payload as SerpApiExecuteResponse;
    }
    return {
        success: false,
        engine: request.engine,
        normalized: { kind: 'raw', items: [], links: [] },
        evidence: {
            provider: request.engine,
            fetched_at: new Date().toISOString(),
            ttl_seconds: getDomainDefaultTtl(request.domain || 'general'),
            items: [],
        },
        error: {
            code: response.ok ? 'parse_error' : 'provider_error',
            message: `Invalid /api/serpapi/execute response (${response.status})`,
            retryable: true,
            status: response.status,
        },
    };
}

export async function executeSerpApi(
    request: SerpApiExecuteRequest,
    options?: { apiKeyOverride?: string }
): Promise<SerpApiExecuteResponse> {
    if (typeof window !== 'undefined') {
        return executeViaApiRoute(request);
    }
    const key = options?.apiKeyOverride || getServerSerpApiKey();
    return executeSerpApiWithKey(request, key);
}

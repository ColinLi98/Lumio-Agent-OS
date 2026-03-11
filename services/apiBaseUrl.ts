const DEFAULT_REMOTE_API_BASE_URL = 'https://lumio-b-end-platform.vercel.app';

function trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function readEnvBaseUrl(): string | undefined {
    if (typeof process === 'undefined' || !process.env) return undefined;
    return process.env.LUMI_API_BASE_URL || process.env.LUMI_BASE_URL;
}

function shouldPreferLocalServerBase(): boolean {
    if (typeof process === 'undefined' || !process.env) return false;
    const flag = String(process.env.LUMI_USE_LOCAL_API || process.env.LUMI_LOCAL_API || '').trim().toLowerCase();
    return flag === '1' || flag === 'true' || flag === 'yes';
}

function getServerRuntimeBaseUrl(): string | undefined {
    if (typeof process === 'undefined' || !process.env) return undefined;

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${trimTrailingSlash(vercelUrl)}`;

    const explicitAppUrl = process.env.URL || process.env.APP_URL;
    if (explicitAppUrl && /^https?:\/\//i.test(explicitAppUrl)) {
        return trimTrailingSlash(explicitAppUrl);
    }

    if (process.env.NODE_ENV !== 'production' && shouldPreferLocalServerBase()) {
        const port = process.env.PORT || process.env.VITE_PORT || '3000';
        return `http://127.0.0.1:${port}`;
    }

    return undefined;
}

export function getApiBaseUrl(): string {
    const envBase = readEnvBaseUrl();
    if (envBase) return trimTrailingSlash(envBase);

    if (typeof window !== 'undefined' && window.location?.origin) {
        const origin = window.location.origin;
        const isLocalOrigin = origin.includes('localhost') || origin.includes('127.0.0.1');
        if (isLocalOrigin) return trimTrailingSlash(origin);
        return trimTrailingSlash(origin);
    }

    const serverRuntimeBase = getServerRuntimeBaseUrl();
    if (serverRuntimeBase) return serverRuntimeBase;

    return DEFAULT_REMOTE_API_BASE_URL;
}

export function buildApiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getApiBaseUrl()}${normalizedPath}`;
}

export { DEFAULT_REMOTE_API_BASE_URL };

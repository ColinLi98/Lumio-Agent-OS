function isTruthyEnv(value: string | undefined, fallback: boolean): boolean {
    if (value == null || value.trim() === '') return fallback;
    const normalized = value.trim().toLowerCase();
    return !['0', 'false', 'off', 'no'].includes(normalized);
}

function resolveIncomingToken(request: Request): string {
    const headerToken = String(request.headers.get('x-lix-token') || '').trim();
    if (headerToken) return headerToken;

    const auth = String(request.headers.get('authorization') || '').trim();
    if (!auth) return '';
    const match = auth.match(/^bearer\s+(.+)$/i);
    return match ? String(match[1] || '').trim() : '';
}

export interface LixAuthFailure {
    status: number;
    payload: {
        success: false;
        error: string;
        code: 'lix_auth_misconfigured' | 'lix_unauthorized';
    };
}

/**
 * Guard write operations for LIX API surfaces.
 *
 * Behavior:
 * - Production defaults to auth required.
 * - Non-production defaults to auth optional (can be enabled with LIX_API_REQUIRE_AUTH=true).
 */
export function ensureLixWriteAuthorized(request: Request): LixAuthFailure | null {
    const requireAuth = isTruthyEnv(
        process.env.LIX_API_REQUIRE_AUTH,
        process.env.NODE_ENV === 'production'
    );
    if (!requireAuth) return null;

    const expectedToken = String(
        process.env.LIX_API_TOKEN || process.env.AGENT_MARKET_PROXY_TOKEN || ''
    ).trim();
    if (!expectedToken) {
        return {
            status: 503,
            payload: {
                success: false,
                error: 'LIX auth is required but no server token is configured',
                code: 'lix_auth_misconfigured',
            },
        };
    }

    const incoming = resolveIncomingToken(request);
    if (!incoming || incoming !== expectedToken) {
        return {
            status: 401,
            payload: {
                success: false,
                error: 'Unauthorized',
                code: 'lix_unauthorized',
            },
        };
    }
    return null;
}


/**
 * Proxy Policy v1.0
 * L.I.X. Provider Adapter Layer - Production Hardening
 * 
 * For internal beta: uses free proxy rotation strategy.
 * No external proxy provider required.
 */

// ============================================================================
// Types
// ============================================================================

export type RotationStrategy = 'round_robin' | 'random' | 'sticky';

export interface ProxyConfig {
    enabled: boolean;
    pool: string[];                  // Proxy URLs (empty for direct connection)
    rotation_strategy: RotationStrategy;
    health_check_interval_ms: number;
    max_failures_before_unhealthy: number;
    sticky_duration_ms: number;      // For sticky strategy
}

interface ProxyHealth {
    proxy_url: string;
    is_healthy: boolean;
    failure_count: number;
    last_success_at?: number;
    last_failure_at?: number;
    latency_avg_ms?: number;
}

// ============================================================================
// Default Configuration (Free/Internal Beta)
// ============================================================================

const DEFAULT_CONFIG: ProxyConfig = {
    enabled: false,  // Disabled for internal beta (direct connections)
    pool: [],        // No external proxies for beta
    rotation_strategy: 'round_robin',
    health_check_interval_ms: 60000,  // 1 minute
    max_failures_before_unhealthy: 3,
    sticky_duration_ms: 300000        // 5 minutes
};

// ============================================================================
// State
// ============================================================================

let currentConfig: ProxyConfig = { ...DEFAULT_CONFIG };
const proxyHealth: Map<string, ProxyHealth> = new Map();
let roundRobinIndex = 0;
const stickyAssignments: Map<string, { proxy: string; assigned_at: number }> = new Map();

// ============================================================================
// Configuration
// ============================================================================

/**
 * Update proxy configuration.
 * For beta: keep enabled=false for direct connections.
 */
export function setProxyConfig(config: Partial<ProxyConfig>): void {
    currentConfig = { ...currentConfig, ...config };
    console.log('[ProxyPolicy] Config updated:', {
        enabled: currentConfig.enabled,
        pool_size: currentConfig.pool.length,
        strategy: currentConfig.rotation_strategy
    });
}

/**
 * Get current proxy configuration.
 */
export function getProxyConfig(): ProxyConfig {
    return { ...currentConfig };
}

/**
 * Add proxies to the pool.
 */
export function addProxies(proxies: string[]): void {
    for (const proxy of proxies) {
        if (!currentConfig.pool.includes(proxy)) {
            currentConfig.pool.push(proxy);
            proxyHealth.set(proxy, {
                proxy_url: proxy,
                is_healthy: true,
                failure_count: 0
            });
        }
    }
    console.log(`[ProxyPolicy] Added ${proxies.length} proxies, pool size: ${currentConfig.pool.length}`);
}

// ============================================================================
// Proxy Selection
// ============================================================================

/**
 * Get next proxy URL for a provider request.
 * Returns undefined if no proxy needed (beta mode) or pool exhausted.
 */
export function getNextProxy(provider_id: string): string | undefined {
    if (!currentConfig.enabled || currentConfig.pool.length === 0) {
        return undefined;  // Direct connection
    }

    const healthyProxies = getHealthyProxies();
    if (healthyProxies.length === 0) {
        console.warn('[ProxyPolicy] No healthy proxies available');
        return undefined;
    }

    switch (currentConfig.rotation_strategy) {
        case 'round_robin':
            return selectRoundRobin(healthyProxies);

        case 'random':
            return selectRandom(healthyProxies);

        case 'sticky':
            return selectSticky(provider_id, healthyProxies);

        default:
            return selectRoundRobin(healthyProxies);
    }
}

function selectRoundRobin(proxies: string[]): string {
    const proxy = proxies[roundRobinIndex % proxies.length];
    roundRobinIndex++;
    return proxy;
}

function selectRandom(proxies: string[]): string {
    return proxies[Math.floor(Math.random() * proxies.length)];
}

function selectSticky(provider_id: string, proxies: string[]): string {
    const assignment = stickyAssignments.get(provider_id);
    const now = Date.now();

    // Check if assignment is still valid
    if (assignment &&
        proxies.includes(assignment.proxy) &&
        now - assignment.assigned_at < currentConfig.sticky_duration_ms) {
        return assignment.proxy;
    }

    // Create new sticky assignment
    const newProxy = selectRandom(proxies);
    stickyAssignments.set(provider_id, { proxy: newProxy, assigned_at: now });
    return newProxy;
}

// ============================================================================
// Health Management
// ============================================================================

/**
 * Get all healthy proxies.
 */
export function getHealthyProxies(): string[] {
    return currentConfig.pool.filter(proxy => {
        const health = proxyHealth.get(proxy);
        return !health || health.is_healthy;
    });
}

/**
 * Mark a proxy as unhealthy after failure.
 */
export function markProxyUnhealthy(proxy_url: string, latency_ms?: number): void {
    const health = proxyHealth.get(proxy_url) || {
        proxy_url,
        is_healthy: true,
        failure_count: 0
    };

    health.failure_count++;
    health.last_failure_at = Date.now();

    if (health.failure_count >= currentConfig.max_failures_before_unhealthy) {
        health.is_healthy = false;
        console.warn(`[ProxyPolicy] Proxy marked unhealthy: ${proxy_url}`);
    }

    proxyHealth.set(proxy_url, health);
}

/**
 * Mark a proxy as healthy after success.
 */
export function markProxyHealthy(proxy_url: string, latency_ms?: number): void {
    const health = proxyHealth.get(proxy_url) || {
        proxy_url,
        is_healthy: true,
        failure_count: 0
    };

    health.is_healthy = true;
    health.failure_count = 0;
    health.last_success_at = Date.now();

    if (latency_ms !== undefined) {
        health.latency_avg_ms = health.latency_avg_ms
            ? (health.latency_avg_ms + latency_ms) / 2
            : latency_ms;
    }

    proxyHealth.set(proxy_url, health);
}

/**
 * Refresh proxy pool - attempt to restore unhealthy proxies.
 */
export function refreshProxyPool(): void {
    const now = Date.now();
    const RECOVERY_DELAY = 5 * 60 * 1000;  // 5 minutes

    for (const [proxy, health] of proxyHealth) {
        if (!health.is_healthy && health.last_failure_at) {
            if (now - health.last_failure_at > RECOVERY_DELAY) {
                health.is_healthy = true;
                health.failure_count = 0;
                console.log(`[ProxyPolicy] Proxy recovered: ${proxy}`);
            }
        }
    }
}

// ============================================================================
// Stats & Monitoring
// ============================================================================

export interface ProxyStats {
    enabled: boolean;
    total_proxies: number;
    healthy_proxies: number;
    unhealthy_proxies: number;
    strategy: RotationStrategy;
    avg_latency_ms?: number;
}

export function getProxyStats(): ProxyStats {
    const healthyCount = getHealthyProxies().length;
    const allHealthData = Array.from(proxyHealth.values());
    const latencies = allHealthData
        .filter(h => h.latency_avg_ms !== undefined)
        .map(h => h.latency_avg_ms!);

    return {
        enabled: currentConfig.enabled,
        total_proxies: currentConfig.pool.length,
        healthy_proxies: healthyCount,
        unhealthy_proxies: currentConfig.pool.length - healthyCount,
        strategy: currentConfig.rotation_strategy,
        avg_latency_ms: latencies.length > 0
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : undefined
    };
}

export default {
    setProxyConfig,
    getProxyConfig,
    addProxies,
    getNextProxy,
    getHealthyProxies,
    markProxyUnhealthy,
    markProxyHealthy,
    refreshProxyPool,
    getProxyStats
};

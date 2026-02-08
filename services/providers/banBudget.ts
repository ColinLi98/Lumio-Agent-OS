/**
 * Ban Budget / Circuit Breaker
 * L.I.X. Provider Adapter Layer
 * 
 * Redis-backed circuit breaker per provider.
 * Opens circuit after ban_score >= 10, cooldown for 10 minutes.
 */

import type { ProviderId, CircuitState, CircuitStatus, BanSignal } from './providerTypes.js';
import { eventBus } from '../eventBus.js';
import { incCounter, setGauge } from '../metricsCollector.js';

// ============================================================================
// Configuration
// ============================================================================

const CIRCUIT_THRESHOLD = 10;      // Open circuit when ban_score >= 10
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minute cooldown
const DECAY_INTERVAL_MS = 10 * 60 * 1000; // Every 10 minutes
const DECAY_AMOUNT = 2;             // Reduce score by 2 each interval

// ============================================================================
// In-Memory State (MVP - replace with Redis in production)
// ============================================================================

interface CircuitData {
    ban_score: number;
    last_failure_at: number;
    circuit_open_at?: number;
    last_decay_at: number;
}

const circuitStore = new Map<ProviderId, CircuitData>();

function getOrCreateCircuit(provider_id: ProviderId): CircuitData {
    let data = circuitStore.get(provider_id);
    if (!data) {
        data = {
            ban_score: 0,
            last_failure_at: 0,
            last_decay_at: Date.now()
        };
        circuitStore.set(provider_id, data);
    }
    return data;
}

// ============================================================================
// Redis Operations (with memory fallback)
// ============================================================================

async function getCircuitFromRedis(provider_id: ProviderId): Promise<CircuitData | null> {
    if (typeof globalThis !== 'undefined' && (globalThis as any).redisClient) {
        try {
            const redis = (globalThis as any).redisClient;
            const key = `lix:circuit:${provider_id}`;
            const value = await redis.get(key);
            if (value) {
                return JSON.parse(value) as CircuitData;
            }
        } catch (e) {
            console.warn('[banBudget.redis_error] GET failed', e);
        }
    }
    return getOrCreateCircuit(provider_id);
}

async function setCircuitInRedis(provider_id: ProviderId, data: CircuitData): Promise<void> {
    // Update local store
    circuitStore.set(provider_id, data);

    // Try Redis
    if (typeof globalThis !== 'undefined' && (globalThis as any).redisClient) {
        try {
            const redis = (globalThis as any).redisClient;
            const key = `lix:circuit:${provider_id}`;
            await redis.set(key, JSON.stringify(data), { EX: 3600 }); // 1 hour TTL
        } catch (e) {
            console.warn('[banBudget.redis_error] SET failed', e);
        }
    }
}

// ============================================================================
// Decay Logic
// ============================================================================

function applyDecay(data: CircuitData): CircuitData {
    const now = Date.now();
    const intervals = Math.floor((now - data.last_decay_at) / DECAY_INTERVAL_MS);

    if (intervals > 0 && data.ban_score > 0) {
        const decay = intervals * DECAY_AMOUNT;
        data.ban_score = Math.max(0, data.ban_score - decay);
        data.last_decay_at = now;
    }

    return data;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if circuit is open for a provider
 */
export async function isCircuitOpen(provider_id: ProviderId): Promise<boolean> {
    const data = await getCircuitFromRedis(provider_id);
    if (!data) return false;

    // Apply decay first
    applyDecay(data);

    // Check if in cooldown
    if (data.circuit_open_at) {
        const cooldownUntil = data.circuit_open_at + COOLDOWN_MS;
        if (Date.now() < cooldownUntil) {
            return true;
        }
        // Cooldown expired, enter half-open state
        data.circuit_open_at = undefined;
        await setCircuitInRedis(provider_id, data);
    }

    return false;
}

/**
 * Get detailed circuit status
 */
export async function getCircuitStatus(provider_id: ProviderId): Promise<CircuitStatus> {
    const data = await getCircuitFromRedis(provider_id);
    if (!data) {
        return { state: 'CLOSED', ban_score: 0 };
    }

    applyDecay(data);

    let state: CircuitState = 'CLOSED';
    let cooldown_until: number | undefined;

    if (data.circuit_open_at) {
        cooldown_until = data.circuit_open_at + COOLDOWN_MS;
        if (Date.now() < cooldown_until) {
            state = 'OPEN';
        } else {
            state = 'HALF_OPEN';
        }
    } else if (data.ban_score >= CIRCUIT_THRESHOLD * 0.7) {
        // Near threshold
        state = 'HALF_OPEN';
    }

    return {
        state,
        ban_score: data.ban_score,
        last_failure_at: data.last_failure_at || undefined,
        cooldown_until
    };
}

/**
 * Record a ban signal and update circuit state
 */
export async function recordBanSignal(
    provider_id: ProviderId,
    signal: BanSignal,
    trace_id: string
): Promise<CircuitStatus> {
    if (!signal.detected) {
        return getCircuitStatus(provider_id);
    }

    const data = await getCircuitFromRedis(provider_id) || getOrCreateCircuit(provider_id);
    applyDecay(data);

    // Add score
    const scoreDelta = signal.score_delta || 1;
    data.ban_score += scoreDelta;
    data.last_failure_at = Date.now();

    console.log(`[banBudget.score] provider=${provider_id} delta=+${scoreDelta} total=${data.ban_score}`);

    // Update gauge metric
    setGauge('lix_provider_ban_score', data.ban_score, { provider_id });

    // Check if should open circuit
    if (data.ban_score >= CIRCUIT_THRESHOLD && !data.circuit_open_at) {
        data.circuit_open_at = Date.now();

        // Emit event
        eventBus.emit({
            event_type: 'provider.circuit_open',
            trace_id,
            provider_id,
            timestamp: Date.now(),
            ban_score: data.ban_score
        });

        incCounter('lix_provider_circuit_open_total', { provider_id });

        console.log(`[banBudget.circuit_open] provider=${provider_id} score=${data.ban_score} cooldown=${COOLDOWN_MS}ms`);
    }

    await setCircuitInRedis(provider_id, data);

    return getCircuitStatus(provider_id);
}

/**
 * Record a successful request (reduces score slightly)
 */
export async function recordSuccess(provider_id: ProviderId): Promise<void> {
    const data = await getCircuitFromRedis(provider_id);
    if (!data || data.ban_score === 0) return;

    // Successful requests slowly reduce ban score
    data.ban_score = Math.max(0, data.ban_score - 0.5);
    await setCircuitInRedis(provider_id, data);

    // Update gauge
    setGauge('lix_provider_ban_score', data.ban_score, { provider_id });
}

/**
 * Force open circuit (for testing or manual intervention)
 */
export async function forceOpenCircuit(provider_id: ProviderId, trace_id: string): Promise<void> {
    const data = getOrCreateCircuit(provider_id);
    data.ban_score = CIRCUIT_THRESHOLD;
    data.circuit_open_at = Date.now();
    data.last_failure_at = Date.now();

    await setCircuitInRedis(provider_id, data);

    eventBus.emit({
        event_type: 'provider.circuit_open',
        trace_id,
        provider_id,
        timestamp: Date.now(),
        ban_score: data.ban_score,
        forced: true
    });
}

/**
 * Reset circuit (for testing)
 */
export async function resetCircuit(provider_id: ProviderId): Promise<void> {
    circuitStore.delete(provider_id);

    if (typeof globalThis !== 'undefined' && (globalThis as any).redisClient) {
        try {
            const redis = (globalThis as any).redisClient;
            await redis.del(`lix:circuit:${provider_id}`);
        } catch (e) {
            // Ignore
        }
    }

    setGauge('lix_provider_ban_score', 0, { provider_id });
}

/**
 * Get all circuit statuses
 */
export async function getAllCircuitStatuses(): Promise<Record<ProviderId, CircuitStatus>> {
    const providers: ProviderId[] = ['jd', 'pdd', 'taobao'];
    const result: Record<ProviderId, CircuitStatus> = {} as any;

    for (const provider_id of providers) {
        result[provider_id] = await getCircuitStatus(provider_id);
    }

    return result;
}

/**
 * DTOE Events
 * Phase 3 v0.2: Observability Layer
 * 
 * Event logging for DTOE operations.
 * Debug panel only enabled in development.
 */

// ============================================================================
// Types
// ============================================================================

export interface DtoeEvent {
    event_type: DtoeEventType;
    timestamp_ms: number;
    data: Record<string, unknown>;
}

export type DtoeEventType =
    | 'dtoe.engine_init'
    | 'dtoe.belief_created'
    | 'dtoe.belief_update'
    | 'dtoe.belief_reset'
    | 'dtoe.scenario_gen'
    | 'dtoe.solve_start'
    | 'dtoe.solve_complete'
    | 'dtoe.explain_complete'
    | 'dtoe.evidence_gate_pass'
    | 'dtoe.evidence_gate_fail'
    | 'dtoe.recommendation_start'
    | 'dtoe.recommendation_complete'
    | 'dtoe.outcome_record';

// ============================================================================
// Event Store (in-memory, dev only)
// ============================================================================

const MAX_EVENTS = 200;
const eventStore: DtoeEvent[] = [];
let eventListeners: ((event: DtoeEvent) => void)[] = [];

/**
 * Check if we're in development mode
 */
function isDev(): boolean {
    if (typeof process !== 'undefined') {
        return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    }
    // Browser environment
    if (typeof window !== 'undefined') {
        return (window as any).__DEV__ === true ||
            window.location.hostname === 'localhost';
    }
    return false;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Log a DTOE event
 */
export function logDtoeEvent(
    event_type: DtoeEventType,
    data: Record<string, unknown>
): void {
    const event: DtoeEvent = {
        event_type,
        timestamp_ms: Date.now(),
        data,
    };

    // Always store (for debugging)
    eventStore.push(event);
    if (eventStore.length > MAX_EVENTS) {
        eventStore.shift();
    }

    // Console log in dev only
    if (isDev()) {
        console.log(`[DTOE] ${event_type}:`, data);
    }

    // Notify listeners
    for (const listener of eventListeners) {
        try {
            listener(event);
        } catch (e) {
            console.error('[DTOE] Event listener error:', e);
        }
    }
}

/**
 * Get recent events
 */
export function getRecentEvents(count: number = 50): DtoeEvent[] {
    return eventStore.slice(-count);
}

/**
 * Get events by type
 */
export function getEventsByType(event_type: DtoeEventType): DtoeEvent[] {
    return eventStore.filter((e) => e.event_type === event_type);
}

/**
 * Clear event store
 */
export function clearEvents(): void {
    eventStore.length = 0;
}

/**
 * Subscribe to events
 */
export function subscribeToEvents(
    callback: (event: DtoeEvent) => void
): () => void {
    eventListeners.push(callback);

    // Return unsubscribe function
    return () => {
        eventListeners = eventListeners.filter((l) => l !== callback);
    };
}

/**
 * Get event statistics
 */
export function getEventStats(): Record<DtoeEventType, number> {
    const stats: Partial<Record<DtoeEventType, number>> = {};

    for (const event of eventStore) {
        stats[event.event_type] = (stats[event.event_type] ?? 0) + 1;
    }

    return stats as Record<DtoeEventType, number>;
}

// ============================================================================
// Debug Panel Data
// ============================================================================

export interface DebugPanelData {
    enabled: boolean;
    recent_events: DtoeEvent[];
    event_stats: Record<DtoeEventType, number>;
    total_events: number;
}

/**
 * Get debug panel data (only in dev)
 */
export function getDebugPanelData(): DebugPanelData {
    return {
        enabled: isDev(),
        recent_events: isDev() ? getRecentEvents(20) : [],
        event_stats: isDev() ? getEventStats() : {} as Record<DtoeEventType, number>,
        total_events: eventStore.length,
    };
}

// ============================================================================
// Performance Metrics
// ============================================================================

interface PerformanceMetric {
    operation: string;
    duration_ms: number;
    timestamp_ms: number;
}

const performanceMetrics: PerformanceMetric[] = [];

/**
 * Record performance metric
 */
export function recordPerformance(
    operation: string,
    duration_ms: number
): void {
    performanceMetrics.push({
        operation,
        duration_ms,
        timestamp_ms: Date.now(),
    });

    // Keep last 100
    if (performanceMetrics.length > 100) {
        performanceMetrics.shift();
    }

    if (isDev()) {
        console.log(`[DTOE Perf] ${operation}: ${duration_ms.toFixed(2)}ms`);
    }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): Record<string, { avg: number; max: number; count: number }> {
    const summary: Record<string, { sum: number; max: number; count: number }> = {};

    for (const metric of performanceMetrics) {
        if (!summary[metric.operation]) {
            summary[metric.operation] = { sum: 0, max: 0, count: 0 };
        }
        summary[metric.operation].sum += metric.duration_ms;
        summary[metric.operation].max = Math.max(summary[metric.operation].max, metric.duration_ms);
        summary[metric.operation].count++;
    }

    const result: Record<string, { avg: number; max: number; count: number }> = {};
    for (const [op, data] of Object.entries(summary)) {
        result[op] = {
            avg: data.sum / data.count,
            max: data.max,
            count: data.count,
        };
    }

    return result;
}

/**
 * LIX Metrics API Endpoint
 * L.I.X. v0.2 P1-3: Prometheus Metrics Export
 * 
 * GET /api/metrics - Prometheus format (text/plain)
 * GET /api/metrics?format=json - JSON summary
 */

import { exportPrometheusMetrics, getMetricsSummary } from '../services/metricsCollector';
import { eventBus } from '../services/eventBus';
import { getTraceStats } from '../services/traceContext';


export default async function handler(request: Request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    // JSON format
    if (format === 'json') {
        const metrics = getMetricsSummary();
        const eventStats = eventBus.getStats();
        const eventCounts = eventBus.getEventCounts();
        const traceStats = getTraceStats();

        return new Response(JSON.stringify({
            timestamp: new Date().toISOString(),
            metrics,
            events: {
                stats: eventStats,
                counts: eventCounts
            },
            traces: traceStats
        }, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    // Prometheus format (default)
    const prometheusMetrics = exportPrometheusMetrics();

    // Add some built-in metrics
    const traceStats = getTraceStats();
    const eventStats = eventBus.getStats();

    const additionalMetrics = `
# HELP lix_traces_total Total number of traces
# TYPE lix_traces_total gauge
lix_traces_total ${traceStats.total_traces}

# HELP lix_traces_active Number of active traces
# TYPE lix_traces_active gauge
lix_traces_active ${traceStats.active_traces}

# HELP lix_events_total Total number of events emitted
# TYPE lix_events_total counter
lix_events_total ${eventStats.total_events}

# HELP lix_event_queue_size Current event queue size
# TYPE lix_event_queue_size gauge
lix_event_queue_size ${eventStats.queue_size}
`;

    return new Response(prometheusMetrics + additionalMetrics, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

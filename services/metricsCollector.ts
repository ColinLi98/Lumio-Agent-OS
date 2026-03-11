/**
 * LIX Metrics Collector
 * L.I.X. v0.2 P1-3: Prometheus-Compatible Metrics
 * 
 * Exposes metrics in Prometheus format:
 * - Histograms: latency distributions (p50, p90, p99)
 * - Counters: event totals with labels
 * 
 * Endpoint: GET /api/metrics
 */

// ============================================================================
// Types
// ============================================================================

interface HistogramBucket {
    le: number;      // Less than or equal
    count: number;
}

interface Histogram {
    name: string;
    help: string;
    labels: Record<string, string>;
    buckets: HistogramBucket[];
    sum: number;
    count: number;
}

interface Counter {
    name: string;
    help: string;
    labels: Record<string, string>;
    value: number;
}

interface Gauge {
    name: string;
    help: string;
    labels: Record<string, string>;
    value: number;
}

// ============================================================================
// Default Histogram Buckets (latency in seconds)
// ============================================================================

const DEFAULT_LATENCY_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// ============================================================================
// Metrics Storage
// ============================================================================

const histograms = new Map<string, Histogram>();
const counters = new Map<string, Counter>();
const gauges = new Map<string, Gauge>();

// Store raw values for percentile calculation
const histogramValues = new Map<string, number[]>();
const MAX_VALUES_PER_HISTOGRAM = 10000;

// ============================================================================
// Helper Functions
// ============================================================================

function getMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
    return `${name}{${labelStr}}`;
}

function formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    return '{' + Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',') + '}';
}

// ============================================================================
// Histogram Operations
// ============================================================================

/**
 * Observe a value in a histogram
 */
export function observeHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    help: string = ''
): void {
    const key = getMetricKey(name, labels);

    if (!histograms.has(key)) {
        histograms.set(key, {
            name,
            help: help || `Histogram for ${name}`,
            labels,
            buckets: DEFAULT_LATENCY_BUCKETS.map(le => ({ le, count: 0 })),
            sum: 0,
            count: 0
        });
        histogramValues.set(key, []);
    }

    const histogram = histograms.get(key)!;
    histogram.sum += value;
    histogram.count += 1;

    // Update buckets
    for (const bucket of histogram.buckets) {
        if (value <= bucket.le) {
            bucket.count += 1;
        }
    }

    // Store raw values for percentiles
    const values = histogramValues.get(key)!;
    values.push(value);
    if (values.length > MAX_VALUES_PER_HISTOGRAM) {
        values.shift();
    }
}

/**
 * Get histogram percentile
 */
export function getHistogramPercentile(
    name: string,
    percentile: number,
    labels: Record<string, string> = {}
): number | undefined {
    const key = getMetricKey(name, labels);
    const values = histogramValues.get(key);
    if (!values || values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

// ============================================================================
// Counter Operations
// ============================================================================

/**
 * Increment a counter
 */
export function incCounter(
    name: string,
    labels: Record<string, string> = {},
    value: number = 1,
    help: string = ''
): void {
    const key = getMetricKey(name, labels);

    if (!counters.has(key)) {
        counters.set(key, {
            name,
            help: help || `Counter for ${name}`,
            labels,
            value: 0
        });
    }

    counters.get(key)!.value += value;
}

/**
 * Get counter value
 */
export function getCounter(name: string, labels: Record<string, string> = {}): number {
    const key = getMetricKey(name, labels);
    return counters.get(key)?.value || 0;
}

/**
 * Sum counters by metric name with partial label match.
 * Useful for aggregating over additional high-cardinality labels.
 */
export function sumCounters(
    name: string,
    requiredLabels: Record<string, string> = {}
): number {
    let total = 0;
    counters.forEach((counter) => {
        if (counter.name !== name) return;
        const matched = Object.entries(requiredLabels).every(
            ([key, value]) => counter.labels[key] === value
        );
        if (!matched) return;
        total += counter.value;
    });
    return total;
}

// ============================================================================
// Gauge Operations
// ============================================================================

/**
 * Set a gauge value
 */
export function setGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    help: string = ''
): void {
    const key = getMetricKey(name, labels);

    gauges.set(key, {
        name,
        help: help || `Gauge for ${name}`,
        labels,
        value
    });
}

/**
 * Get gauge value
 */
export function getGauge(name: string, labels: Record<string, string> = {}): number | undefined {
    const key = getMetricKey(name, labels);
    return gauges.get(key)?.value;
}

export function sumGauges(
    name: string,
    requiredLabels: Record<string, string> = {}
): number {
    let total = 0;
    gauges.forEach((gauge) => {
        if (gauge.name !== name) return;
        const matched = Object.entries(requiredLabels).every(
            ([key, value]) => gauge.labels[key] === value
        );
        if (!matched) return;
        total += gauge.value;
    });
    return total;
}

// ============================================================================
// LIX-Specific Metrics
// ============================================================================

/**
 * Record intent-to-offer latency
 */
export function recordIntentToOfferLatency(latencySeconds: number, category: string): void {
    observeHistogram(
        'lix_intent_to_offer_latency_seconds',
        latencySeconds,
        { category },
        'Time from intent broadcast to offer ranking completion'
    );
}

/**
 * Record validation stage latency
 */
export function recordValidationLatency(latencySeconds: number, stage: string): void {
    observeHistogram(
        'lix_validation_latency_seconds',
        latencySeconds,
        { stage },
        'Time spent in each validation stage'
    );
}

/**
 * Record validation failure
 */
export function recordValidationFailure(stage: string, reason: string): void {
    incCounter(
        'lix_validation_failures_total',
        { stage, reason },
        1,
        'Total number of validation failures'
    );
}

/**
 * Record intent processed
 */
export function recordIntent(category: string, status: 'success' | 'failed'): void {
    incCounter(
        'lix_intents_total',
        { category, status },
        1,
        'Total number of intents processed'
    );
}

/**
 * Record offer processed
 */
export function recordOffer(provider_id: string, validation_result: 'pass' | 'warn' | 'block'): void {
    incCounter(
        'lix_offers_total',
        { provider_id, validation_result },
        1,
        'Total number of offers processed'
    );
}

/**
 * Record conversion callback
 */
export function recordConversion(status: 'success' | 'failed' | 'idempotent'): void {
    incCounter(
        'lix_conversions_total',
        { status },
        1,
        'Total number of conversion callbacks'
    );
}

/**
 * Record security event
 */
export function recordSecurityEvent(event_type: string): void {
    incCounter(
        'lix_security_events_total',
        { event_type },
        1,
        'Total number of security events'
    );
}

// ============================================================================
// Prometheus Export
// ============================================================================

/**
 * Export all metrics in Prometheus format
 */
export function exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Group metrics by name for HELP and TYPE declarations
    const histogramsByName = new Map<string, Histogram[]>();
    const countersByName = new Map<string, Counter[]>();
    const gaugesByName = new Map<string, Gauge[]>();

    histograms.forEach(h => {
        if (!histogramsByName.has(h.name)) histogramsByName.set(h.name, []);
        histogramsByName.get(h.name)!.push(h);
    });

    counters.forEach(c => {
        if (!countersByName.has(c.name)) countersByName.set(c.name, []);
        countersByName.get(c.name)!.push(c);
    });

    gauges.forEach(g => {
        if (!gaugesByName.has(g.name)) gaugesByName.set(g.name, []);
        gaugesByName.get(g.name)!.push(g);
    });

    // Export histograms
    histogramsByName.forEach((items, name) => {
        const first = items[0];
        lines.push(`# HELP ${name} ${first.help}`);
        lines.push(`# TYPE ${name} histogram`);

        for (const h of items) {
            const labelStr = formatLabels(h.labels);
            const baseLabelStr = Object.keys(h.labels).length > 0
                ? labelStr.slice(0, -1) + ','
                : '{';

            for (const bucket of h.buckets) {
                const bucketLabel = `${baseLabelStr}le="${bucket.le}"}`;
                lines.push(`${name}_bucket${bucketLabel} ${bucket.count}`);
            }
            lines.push(`${name}_bucket${baseLabelStr}le="+Inf"} ${h.count}`);
            lines.push(`${name}_sum${labelStr} ${h.sum}`);
            lines.push(`${name}_count${labelStr} ${h.count}`);
        }
        lines.push('');
    });

    // Export counters
    countersByName.forEach((items, name) => {
        const first = items[0];
        lines.push(`# HELP ${name} ${first.help}`);
        lines.push(`# TYPE ${name} counter`);

        for (const c of items) {
            const labelStr = formatLabels(c.labels);
            lines.push(`${name}${labelStr} ${c.value}`);
        }
        lines.push('');
    });

    // Export gauges
    gaugesByName.forEach((items, name) => {
        const first = items[0];
        lines.push(`# HELP ${name} ${first.help}`);
        lines.push(`# TYPE ${name} gauge`);

        for (const g of items) {
            const labelStr = formatLabels(g.labels);
            lines.push(`${name}${labelStr} ${g.value}`);
        }
        lines.push('');
    });

    return lines.join('\n');
}

/**
 * Get metrics summary (for JSON API)
 */
export function getMetricsSummary(): {
    histograms: Record<string, { p50: number; p90: number; p99: number; count: number }>;
    counters: Record<string, number>;
    gauges: Record<string, number>;
} {
    const result: ReturnType<typeof getMetricsSummary> = {
        histograms: {},
        counters: {},
        gauges: {}
    };

    // Aggregate histograms by name
    const histogramNames = new Set<string>();
    histograms.forEach(h => histogramNames.add(h.name));

    for (const name of histogramNames) {
        // Find all with this name and aggregate
        let totalCount = 0;
        const allValues: number[] = [];

        histograms.forEach((h, key) => {
            if (h.name === name) {
                totalCount += h.count;
                const vals = histogramValues.get(key);
                if (vals) allValues.push(...vals);
            }
        });

        if (allValues.length > 0) {
            const sorted = allValues.sort((a, b) => a - b);
            result.histograms[name] = {
                p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
                p90: sorted[Math.floor(sorted.length * 0.9)] || 0,
                p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
                count: totalCount
            };
        }
    }

    // Aggregate counters
    counters.forEach((c, key) => {
        const labelPart = key.includes('{') ? key.substring(key.indexOf('{')) : '';
        const displayKey = `${c.name}${labelPart}`;
        result.counters[displayKey] = c.value;
    });

    // Aggregate gauges
    gauges.forEach((g, key) => {
        const labelPart = key.includes('{') ? key.substring(key.indexOf('{')) : '';
        const displayKey = `${g.name}${labelPart}`;
        result.gauges[displayKey] = g.value;
    });

    return result;
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
    histograms.clear();
    counters.clear();
    gauges.clear();
    histogramValues.clear();
}

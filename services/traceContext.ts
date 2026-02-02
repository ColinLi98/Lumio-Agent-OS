/**
 * Trace Context Service
 * L.I.X. v0.2 P1-1: End-to-End Trace ID Propagation
 * 
 * Generates and propagates trace_id across all LIX operations.
 * Must be enforced at gateway edge for every request.
 * 
 * Trace ID format: "tid_{timestamp}_{random}"
 * Span ID format:  "sid_{timestamp}_{random}"
 */

// ============================================================================
// Types
// ============================================================================

export interface TraceContext {
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
    operation: string;
    start_time: number;
    metadata?: Record<string, unknown>;
}

export interface SpanData {
    span_id: string;
    operation: string;
    start_time: number;
    end_time?: number;
    duration_ms?: number;
    status: 'running' | 'success' | 'error';
    error?: string;
    attributes: Record<string, unknown>;
}

// ============================================================================
// ID Generators
// ============================================================================

/**
 * Generate a unique trace ID
 * Format: tid_{timestamp}_{8-char-random}
 */
export function generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `tid_${timestamp}_${random}`;
}

/**
 * Generate a unique span ID
 * Format: sid_{timestamp}_{6-char-random}
 */
export function generateSpanId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `sid_${timestamp}_${random}`;
}

// ============================================================================
// Trace Store (In-Memory for MVP)
// ============================================================================

interface TraceRecord {
    trace_id: string;
    spans: SpanData[];
    start_time: number;
    end_time?: number;
    root_operation: string;
    metadata: Record<string, unknown>;
}

const traceStore = new Map<string, TraceRecord>();
const MAX_TRACES = 1000; // Limit memory usage

function pruneOldTraces(): void {
    if (traceStore.size > MAX_TRACES) {
        const entries = Array.from(traceStore.entries());
        entries.sort((a, b) => a[1].start_time - b[1].start_time);
        const toDelete = entries.slice(0, entries.length - MAX_TRACES);
        toDelete.forEach(([key]) => traceStore.delete(key));
    }
}

// ============================================================================
// Trace Context Management
// ============================================================================

/**
 * Create a new trace context at the gateway edge
 */
export function createTrace(operation: string, metadata?: Record<string, unknown>): TraceContext {
    const trace_id = generateTraceId();
    const span_id = generateSpanId();
    const start_time = Date.now();

    // Store trace record
    traceStore.set(trace_id, {
        trace_id,
        spans: [{
            span_id,
            operation,
            start_time,
            status: 'running',
            attributes: metadata || {}
        }],
        start_time,
        root_operation: operation,
        metadata: metadata || {}
    });

    pruneOldTraces();

    return {
        trace_id,
        span_id,
        operation,
        start_time,
        metadata
    };
}

/**
 * Create a child span within an existing trace
 */
export function createSpan(
    trace_id: string,
    operation: string,
    parent_span_id?: string,
    attributes?: Record<string, unknown>
): TraceContext {
    const span_id = generateSpanId();
    const start_time = Date.now();

    const trace = traceStore.get(trace_id);
    if (trace) {
        trace.spans.push({
            span_id,
            operation,
            start_time,
            status: 'running',
            attributes: attributes || {}
        });
    }

    return {
        trace_id,
        span_id,
        parent_span_id,
        operation,
        start_time
    };
}

/**
 * End a span with success
 */
export function endSpan(
    trace_id: string,
    span_id: string,
    attributes?: Record<string, unknown>
): void {
    const trace = traceStore.get(trace_id);
    if (!trace) return;

    const span = trace.spans.find(s => s.span_id === span_id);
    if (span) {
        span.end_time = Date.now();
        span.duration_ms = span.end_time - span.start_time;
        span.status = 'success';
        if (attributes) {
            Object.assign(span.attributes, attributes);
        }
    }
}

/**
 * End a span with error
 */
export function endSpanWithError(
    trace_id: string,
    span_id: string,
    error: string,
    attributes?: Record<string, unknown>
): void {
    const trace = traceStore.get(trace_id);
    if (!trace) return;

    const span = trace.spans.find(s => s.span_id === span_id);
    if (span) {
        span.end_time = Date.now();
        span.duration_ms = span.end_time - span.start_time;
        span.status = 'error';
        span.error = error;
        if (attributes) {
            Object.assign(span.attributes, attributes);
        }
    }
}

/**
 * Complete a trace
 */
export function completeTrace(trace_id: string): TraceRecord | undefined {
    const trace = traceStore.get(trace_id);
    if (trace) {
        trace.end_time = Date.now();
    }
    return trace;
}

/**
 * Get trace record
 */
export function getTrace(trace_id: string): TraceRecord | undefined {
    return traceStore.get(trace_id);
}

/**
 * Get all active traces
 */
export function getActiveTraces(): TraceRecord[] {
    return Array.from(traceStore.values()).filter(t => !t.end_time);
}

/**
 * Get trace statistics
 */
export function getTraceStats(): {
    total_traces: number;
    active_traces: number;
    completed_traces: number;
    avg_duration_ms: number;
} {
    const traces = Array.from(traceStore.values());
    const completed = traces.filter(t => t.end_time);
    const totalDuration = completed.reduce((sum, t) =>
        sum + (t.end_time! - t.start_time), 0);

    return {
        total_traces: traces.length,
        active_traces: traces.length - completed.length,
        completed_traces: completed.length,
        avg_duration_ms: completed.length > 0 ? totalDuration / completed.length : 0
    };
}

// ============================================================================
// Request Context (AsyncLocalStorage alternative for edge)
// ============================================================================

// Current trace context for the request (edge-compatible)
let currentTraceContext: TraceContext | undefined;

/**
 * Set the current trace context (call at gateway edge)
 */
export function setCurrentTrace(ctx: TraceContext): void {
    currentTraceContext = ctx;
}

/**
 * Get the current trace context
 */
export function getCurrentTrace(): TraceContext | undefined {
    return currentTraceContext;
}

/**
 * Clear the current trace context (call after request)
 */
export function clearCurrentTrace(): void {
    currentTraceContext = undefined;
}

// ============================================================================
// HTTP Header Helpers
// ============================================================================

const TRACE_HEADER = 'X-LIX-Trace-ID';
const SPAN_HEADER = 'X-LIX-Span-ID';

/**
 * Extract trace context from request headers
 */
export function extractTraceFromHeaders(headers: Headers): { trace_id?: string; span_id?: string } {
    return {
        trace_id: headers.get(TRACE_HEADER) || undefined,
        span_id: headers.get(SPAN_HEADER) || undefined
    };
}

/**
 * Add trace context to response headers
 */
export function addTraceToHeaders(headers: Headers, ctx: TraceContext): void {
    headers.set(TRACE_HEADER, ctx.trace_id);
    headers.set(SPAN_HEADER, ctx.span_id);
}

/**
 * Create headers with trace context
 */
export function createTraceHeaders(ctx: TraceContext): Record<string, string> {
    return {
        [TRACE_HEADER]: ctx.trace_id,
        [SPAN_HEADER]: ctx.span_id
    };
}

// ============================================================================
// Decorator for traced functions
// ============================================================================

/**
 * Wrap a function to automatically create and end a span
 */
export function traced<T extends (...args: unknown[]) => Promise<unknown>>(
    operation: string,
    fn: T
): T {
    return (async (...args: unknown[]) => {
        const current = getCurrentTrace();
        if (!current) {
            return fn(...args);
        }

        const span = createSpan(current.trace_id, operation, current.span_id);
        try {
            const result = await fn(...args);
            endSpan(current.trace_id, span.span_id);
            return result;
        } catch (error) {
            endSpanWithError(
                current.trace_id,
                span.span_id,
                error instanceof Error ? error.message : String(error)
            );
            throw error;
        }
    }) as T;
}

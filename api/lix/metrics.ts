import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exportPrometheusMetrics, getCounter, getMetricsSummary } from '../../services/metricsCollector.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LIX-Trace-ID');
}

function generateTraceId(): string {
    return `tid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureMetricStub(text: string, name: string, help: string): string {
    if (text.includes(name)) return text;
    return `${text.trim()}\n# HELP ${name} ${help}\n# TYPE ${name} counter\n${name} 0\n`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    const traceId = generateTraceId();
    res.setHeader('X-LIX-Trace-ID', traceId);

    const format = String(req.query?.format || '').trim().toLowerCase();
    if (format === 'json') {
        const metrics = getMetricsSummary();
        const eventTotal =
            getCounter('lix_security_events_total')
            + getCounter('lix_intents_total')
            + getCounter('lix_offers_total')
            + getCounter('lix_conversions_total');
        const traceTotal = getCounter('lix_traces_total');

        res.status(200).json({
            success: true,
            trace_id: traceId,
            metrics,
            events: {
                stats: {
                    total_events: eventTotal,
                },
            },
            traces: {
                stats: {
                    total_traces: traceTotal,
                },
            },
        });
        return;
    }

    let prometheus = exportPrometheusMetrics();
    prometheus = ensureMetricStub(prometheus, 'lix_intents_total', 'Total number of intents');
    prometheus = ensureMetricStub(prometheus, 'lix_traces_total', 'Total number of traces');
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(prometheus);
}

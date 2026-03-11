import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exportPrometheusMetrics, getMetricsSummary } from '../services/metricsCollector.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

    const format = String(req.query?.format || '').trim().toLowerCase();
    if (format === 'json') {
        res.status(200).json({
            success: true,
            metrics: getMetricsSummary(),
        });
        return;
    }

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(exportPrometheusMetrics());
}

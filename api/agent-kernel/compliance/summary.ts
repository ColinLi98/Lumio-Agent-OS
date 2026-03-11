import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { withCors } from '../common.js';

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

    const taskId = String(req.query.task_id || req.query.taskId || '').trim();
    const runtime = getTaskGraphRuntime();

    if (taskId) {
        const summary = await runtime.getTaskComplianceSummary(taskId);
        if (!summary) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        res.status(200).json({
            success: true,
            task_id: taskId,
            compliance: summary,
        });
        return;
    }

    const summary = await runtime.getPilotComplianceSummary();
    res.status(200).json({
        success: true,
        compliance: summary,
    });
}

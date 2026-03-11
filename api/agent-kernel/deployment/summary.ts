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

    try {
        const runtime = getTaskGraphRuntime();
        const taskId = String(req.query?.task_id || '').trim();
        if (taskId) {
            const deployment = await runtime.getTaskDeploymentSummary(taskId);
            if (!deployment) {
                res.status(404).json({ success: false, error: 'Task not found' });
                return;
            }
            res.status(200).json({
                success: true,
                deployment,
            });
            return;
        }

        const summary = await runtime.getPilotDeploymentSummary();
        res.status(200).json({
            success: true,
            summary,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'deployment_summary_failed',
        });
    }
}

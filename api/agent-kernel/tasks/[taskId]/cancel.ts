import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTaskGraphRuntime } from '../../../../services/agent-kernel/runtime.js';
import { withCors } from '../../common.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    const taskId = String(req.query.taskId || '').trim();
    if (!taskId) {
        res.status(400).json({ success: false, error: 'Missing taskId' });
        return;
    }

    const reason = String(req.body?.reason || 'cancelled_by_user');
    const runtime = getTaskGraphRuntime();
    const snapshot = await runtime.cancelTask(taskId, reason);

    if (!snapshot) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
    }

    res.status(200).json({
        success: true,
        task_id: snapshot.task_state.task_id,
        status: snapshot.task_state.status,
    });
}

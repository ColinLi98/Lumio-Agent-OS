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
    const nodeId = String(req.body?.node_id || '').trim();
    const decision = String(req.body?.decision || '').trim();

    if (!taskId || !nodeId || !decision) {
        res.status(400).json({
            success: false,
            error: 'Missing required fields: taskId, node_id, decision',
        });
        return;
    }

    try {
        const runtime = getTaskGraphRuntime();
        const snapshot = await runtime.approveTask(taskId, {
            node_id: nodeId,
            decision,
            edited_payload: req.body?.edited_payload,
        });

        if (!snapshot) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        res.status(200).json({
            success: true,
            task_id: snapshot.task_state.task_id,
            status: snapshot.task_state.status,
            current_wait: snapshot.task_state.current_wait,
            policy_decision_ids: snapshot.policy_decision_ids,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'approve_failed',
        });
    }
}

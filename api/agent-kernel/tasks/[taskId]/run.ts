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

    try {
        const runtime = getTaskGraphRuntime();
        const snapshot = await runtime.runTask(taskId);
        if (!snapshot) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        res.status(200).json({
            success: true,
            task_id: snapshot.task_state.task_id,
            correlation_id: snapshot.task_state.correlation?.correlation_id,
            status: snapshot.task_state.status,
            current_wait: snapshot.task_state.current_wait,
            policy_decision_ids: snapshot.policy_decision_ids,
            execution_substrate: snapshot.execution_substrate,
            execution_ledger: snapshot.execution_ledger,
            observability: snapshot.observability,
            compliance: snapshot.compliance,
            deployment: snapshot.deployment,
            environment_activation: snapshot.environment_activation,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'run_failed',
        });
    }
}

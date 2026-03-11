import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { readLocalRoleLabActorId, readWorkspaceMode, withCors } from '../common.js';

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
        const taskId = String(req.query?.task_id || '').trim() || undefined;
        const workspaceMode = readWorkspaceMode(req);
        const summary = taskId
            ? await runtime.getTaskEnvironmentActivationSummary(taskId)
            : await runtime.getEnvironmentActivationSummary({
                workspaceMode,
                labActorId: readLocalRoleLabActorId(req),
            });

        if (taskId && !summary) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        res.status(200).json({
            success: true,
            workspace_mode: workspaceMode,
            summary,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'environment_summary_failed',
        });
    }
}

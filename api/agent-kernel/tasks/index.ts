import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { TaskGraph } from '../../../services/agent-kernel/contracts.js';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { readLocalRoleLabActorId, readWorkspaceMode, withCors, randomTaskId } from '../common.js';

function normalizeTaskGraph(body: any): TaskGraph {
    if (body?.graph && typeof body.graph === 'object') {
        return body.graph as TaskGraph;
    }

    if (body?.task_graph && typeof body.task_graph === 'object') {
        return body.task_graph as TaskGraph;
    }

    const taskId = String(body?.task_id || randomTaskId('kernel'));
    const goal = String(body?.goal || 'runtime_task').trim() || 'runtime_task';
    const nodes = Array.isArray(body?.nodes) ? body.nodes : [];
    const edges = Array.isArray(body?.edges) ? body.edges : [];

    return {
        task_id: taskId,
        goal,
        nodes,
        edges,
        budget: body?.budget,
        retry_policy: body?.retry_policy,
        compensation: body?.compensation,
        max_parallel_nodes: body?.max_parallel_nodes,
        context: body?.context,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const runtime = getTaskGraphRuntime();

    if (req.method === 'GET') {
        try {
            const workspaceMode = readWorkspaceMode(req);
            const inbox = await runtime.getRequesterInboxSummary({
                workspaceMode,
                labActorId: readLocalRoleLabActorId(req),
            });
            res.status(200).json({
                success: true,
                workspace_mode: workspaceMode,
                generated_at: inbox.generated_at,
                total_count: inbox.total_count,
                in_progress_count: inbox.in_progress_count,
                blocked_count: inbox.blocked_count,
                waiting_count: inbox.waiting_count,
                completed_count: inbox.completed_count,
                items: inbox.items,
            });
            return;
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'requester_inbox_failed',
            });
            return;
        }
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const graph = normalizeTaskGraph(req.body || {});
        const snapshot = await runtime.createTask(graph);

        res.status(200).json({
            success: true,
            task_id: snapshot.task_state.task_id,
            correlation_id: snapshot.task_state.correlation?.correlation_id,
            status: snapshot.task_state.status,
            node_count: snapshot.node_states.length,
            execution_substrate: snapshot.execution_substrate,
            execution_ledger: snapshot.execution_ledger,
            observability: snapshot.observability,
            compliance: snapshot.compliance,
            deployment: snapshot.deployment,
            environment_activation: snapshot.environment_activation,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'invalid_task_graph',
        });
    }
}

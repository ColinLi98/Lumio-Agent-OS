import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { readBearerToken, readLocalRoleLabActorId, readWorkspaceMode, withCors } from '../common.js';
import { getTrialWorkspaceService } from '../../../services/agent-kernel/trialWorkspace.js';
import { getEnterpriseAccountService } from '../../../services/agent-kernel/enterpriseAccount.js';

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
        const workspaceMode = readWorkspaceMode(req);
        const taskId = String(req.query?.task_id || '').trim() || undefined;
        const baseSummary = await runtime.getProductShellSummary({
            taskId,
            workspaceMode,
            labActorId: readLocalRoleLabActorId(req),
        });
        const summary = workspaceMode === 'local_lab'
            ? await getTrialWorkspaceService().mergeProductShell(baseSummary)
            : baseSummary;
        const sessionId = String(req.query?.session_id || readBearerToken(req) || '').trim();
        if (sessionId) {
            try {
                summary.enterprise_account = await getEnterpriseAccountService().summarizeAccount(sessionId);
                summary.enterprise_membership = await getEnterpriseAccountService().listMembers(
                    sessionId,
                    summary.environment_activation.workspace_id
                );
            } catch {
                // Keep product shell available even when enterprise account context is absent or unauthorized.
            }
        }
        res.status(200).json({
            success: true,
            workspace_mode: workspaceMode,
            summary,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'product_shell_summary_failed',
        });
    }
}

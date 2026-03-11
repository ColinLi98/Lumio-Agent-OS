import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { readBearerToken, withCors } from '../common.js';

function complianceErrorStatus(message: string): number {
    if (
        message === 'enterprise_admin_access_denied'
        || message === 'enterprise_session_not_found'
        || message === 'enterprise_session_not_active'
        || message === 'enterprise_session_expired'
        || message === 'enterprise_principal_not_active'
    ) {
        return 403;
    }
    if (message === 'Task not found') return 404;
    return 400;
}

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

    try {
        const runtime = getTaskGraphRuntime();
        const taskId = String(req.body?.task_id || req.body?.taskId || '').trim();
        if (!taskId) {
            throw new Error('missing_task_id');
        }

        const result = await runtime.createComplianceAuditExport({
            task_id: taskId,
            session_id: String(req.body?.session_id || readBearerToken(req) || '').trim(),
            workspace_id: String(req.body?.workspace_id || '').trim() || undefined,
        });

        if (!result) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        res.status(200).json({
            success: true,
            task_id: taskId,
            correlation_id: result.audit_export.correlation_id,
            audit_export: result.audit_export,
            export_bundle: result.export_bundle,
            compliance: result.compliance,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'compliance_audit_export_failed';
        res.status(complianceErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

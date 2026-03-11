import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeEnterpriseAction, assertEnterpriseWriteAllowed } from '../../../services/agent-kernel/enterpriseAuthorization.js';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { enterpriseErrorStatus, readBearerToken, readWorkspaceMode, withCors } from '../common.js';

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
        const workspaceMode = readWorkspaceMode(req);
        assertEnterpriseWriteAllowed(workspaceMode);
        const runtime = getTaskGraphRuntime();
        const store = runtime.getStore();
        await authorizeEnterpriseAction(store, {
            session_id: String(req.body?.session_id || readBearerToken(req) || '').trim(),
            action: 'PILOT_ENVIRONMENT_BINDING_WRITE',
            workspace_mode: workspaceMode,
            tenant_id: String(req.body?.tenant_id || '').trim() || undefined,
            workspace_id: String(req.body?.workspace_id || '').trim() || undefined,
        });
        const record = await runtime.registerPilotEnvironmentBinding({
            workspaceMode,
            environmentKind: String(req.body?.environment_kind || '').trim().toUpperCase() as any,
            environmentLabel: String(req.body?.environment_label || '').trim(),
            baseUrl: String(req.body?.base_url || '').trim() || undefined,
            tenantId: String(req.body?.tenant_id || '').trim() || undefined,
            workspaceId: String(req.body?.workspace_id || '').trim() || undefined,
            source: String(req.body?.source || '').trim().toUpperCase() as any,
            summary: String(req.body?.summary || '').trim() || undefined,
        });
        res.status(200).json({ success: true, record });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'pilot_environment_binding_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

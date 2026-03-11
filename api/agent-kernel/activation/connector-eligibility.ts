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
        });
        const record = await runtime.registerPilotConnectorActivation({
            workspaceMode,
            connectorId: String(req.body?.connector_id || '').trim(),
            source: String(req.body?.source || '').trim().toUpperCase() as any,
            summary: String(req.body?.summary || '').trim() || undefined,
        });
        res.status(200).json({ success: true, record });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'pilot_connector_activation_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

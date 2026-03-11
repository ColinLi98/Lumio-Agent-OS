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
            action: 'PILOT_ACTOR_READINESS_WRITE',
            workspace_mode: workspaceMode,
        });
        const record = await runtime.registerPilotActorReadiness({
            workspaceMode,
            role: String(req.body?.role || '').trim().toUpperCase() as any,
            actorId: String(req.body?.actor_id || '').trim() || undefined,
            actorLabel: String(req.body?.actor_label || '').trim() || undefined,
            source: String(req.body?.source || '').trim().toUpperCase() as any,
            provisioningState: String(req.body?.provisioningState || '').trim().toUpperCase() as any || undefined,
            accessState: String(req.body?.accessState || '').trim().toUpperCase() as any || undefined,
            note: String(req.body?.note || '').trim() || undefined,
            evidenceReferenceIds: Array.isArray(req.body?.evidence_reference_ids)
                ? req.body.evidence_reference_ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)
                : undefined,
        });
        res.status(200).json({
            success: true,
            record,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'pilot_actor_readiness_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

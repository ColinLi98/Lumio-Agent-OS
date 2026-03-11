import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertEnterpriseRoleBound, authorizeEnterpriseAction, assertEnterpriseWriteAllowed } from '../../../services/agent-kernel/enterpriseAuthorization.js';
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
        const sessionId = String(req.body?.session_id || readBearerToken(req) || '').trim();
        const runtime = getTaskGraphRuntime();
        const store = runtime.getStore();
        const context = await authorizeEnterpriseAction(store, {
            session_id: sessionId,
            action: 'PILOT_ARTIFACT_INTAKE_WRITE',
            workspace_mode: workspaceMode,
            tenant_id: String(req.body?.tenant_id || '').trim() || undefined,
            workspace_id: String(req.body?.workspace_id || '').trim() || undefined,
        });
        const submittedByEnterpriseRole = String(req.body?.submitted_by_enterprise_role || '').trim().toUpperCase();
        if (submittedByEnterpriseRole) {
            assertEnterpriseRoleBound(context, submittedByEnterpriseRole as any);
        }
        const record = await runtime.submitPilotExternalArtifactIntake({
            workspaceMode,
            artifactKind: String(req.body?.artifact_kind || '').trim().toUpperCase() as any,
            source: String(req.body?.source || '').trim().toUpperCase() as any,
            summary: String(req.body?.summary || '').trim(),
            uri: String(req.body?.uri || '').trim() || undefined,
            submittedByRole: String(req.body?.submitted_by_role || '').trim().toUpperCase() as any || undefined,
            submittedByEnterpriseRole: submittedByEnterpriseRole as any || undefined,
            submittedByLabel: String(req.body?.submitted_by_label || '').trim() || undefined,
            actorRole: String(req.body?.actor_role || '').trim().toUpperCase() as any || undefined,
            actorId: String(req.body?.actor_id || '').trim() || undefined,
            actorLabel: String(req.body?.actor_label || '').trim() || undefined,
            provisioningState: String(req.body?.provisioning_state || '').trim().toUpperCase() as any || undefined,
            accessState: String(req.body?.access_state || '').trim().toUpperCase() as any || undefined,
            evidenceCategory: String(req.body?.evidence_category || '').trim().toUpperCase() as any || undefined,
            environmentKind: String(req.body?.environment_kind || '').trim().toUpperCase() as any || undefined,
            environmentLabel: String(req.body?.environment_label || '').trim() || undefined,
            baseUrl: String(req.body?.base_url || '').trim() || undefined,
            tenantId: String(req.body?.tenant_id || '').trim() || undefined,
            workspaceId: String(req.body?.workspace_id || '').trim() || undefined,
            connectorId: String(req.body?.connector_id || '').trim() || undefined,
        });
        res.status(200).json({ success: true, record });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'pilot_external_artifact_intake_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

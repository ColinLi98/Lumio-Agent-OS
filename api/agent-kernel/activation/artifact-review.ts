import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeEnterpriseAction, assertEnterpriseWriteAllowed, resolveEnterpriseSessionContext } from '../../../services/agent-kernel/enterpriseAuthorization.js';
import type { EnterpriseRole } from '../../../services/agent-kernel/contracts.js';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
import { enterpriseErrorStatus, readBearerToken, readWorkspaceMode, withCors } from '../common.js';

function firstMatchingRole(
    roles: EnterpriseRole[],
    allowed: EnterpriseRole[],
): Exclude<EnterpriseRole, 'WORKSPACE_MEMBER'> | undefined {
    const match = roles.find((role) => allowed.includes(role));
    if (!match || match === 'WORKSPACE_MEMBER') return undefined;
    return match;
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
        const workspaceMode = readWorkspaceMode(req);
        assertEnterpriseWriteAllowed(workspaceMode);
        const sessionId = String(req.body?.session_id || readBearerToken(req) || '').trim();
        const runtime = getTaskGraphRuntime();
        const store = runtime.getStore();
        const context = await resolveEnterpriseSessionContext(store, sessionId);
        const intakeId = String(req.body?.intake_id || '').trim();
        const current = await store.getPilotExternalArtifactIntake(intakeId);
        if (!current) {
            throw new Error('pilot_external_artifact_intake_not_found');
        }
        const decision = String(req.body?.decision || '').trim().toUpperCase();
        await authorizeEnterpriseAction(store, {
            session_id: sessionId,
            action: decision === 'PROMOTE' ? 'PILOT_ARTIFACT_PROMOTE' : 'PILOT_ARTIFACT_VERIFY',
            workspace_mode: workspaceMode,
            tenant_id: current.tenant_id,
            workspace_id: current.workspace_id,
            artifact_kind: current.artifact_kind,
        });
        const record = await runtime.reviewPilotExternalArtifactIntake({
            workspaceMode,
            intakeId,
            decision: decision as any,
            reviewedBy: String(req.body?.reviewed_by || '').trim() || context.principal.display_name || context.principal.email,
            reviewedByEnterpriseRole: decision === 'PROMOTE'
                ? firstMatchingRole(context.available_roles, ['TENANT_ADMIN', 'INTEGRATION_ADMIN'])
                : firstMatchingRole(context.available_roles, ['REVIEWER', 'APPROVER', 'TENANT_ADMIN']),
            verificationNote: String(req.body?.verification_note || '').trim() || undefined,
        });
        res.status(200).json({ success: true, record });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'pilot_external_artifact_review_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnterpriseAccountService } from '../../../../services/agent-kernel/enterpriseAccount.js';
import { assertEnterpriseWriteAllowed } from '../../../../services/agent-kernel/enterpriseAuthorization.js';
import { enterpriseErrorStatus, readBearerToken, readWorkspaceMode, withCors } from '../../common.js';

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
        assertEnterpriseWriteAllowed(readWorkspaceMode(req));
        const assignment = await getEnterpriseAccountService().assignRole({
            sessionId: String(req.body?.session_id || readBearerToken(req) || '').trim(),
            principalId: String(req.body?.principal_id || '').trim(),
            role: String(req.body?.role || '').trim().toUpperCase() as any,
            workspaceId: String(req.body?.workspace_id || '').trim() || undefined,
        });
        res.status(200).json({ success: true, assignment });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_assign_role_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

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
        await getEnterpriseAccountService().deactivateMember({
            sessionId: String(req.body?.session_id || readBearerToken(req) || '').trim(),
            principalId: String(req.body?.principal_id || '').trim(),
        });
        res.status(200).json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_member_deactivate_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

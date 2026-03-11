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
        const invite = await getEnterpriseAccountService().revokeInvite({
            sessionId: String(req.body?.session_id || readBearerToken(req) || '').trim(),
            inviteId: String(req.body?.invite_id || '').trim(),
        });
        res.status(200).json({ success: true, invite });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_invite_revoke_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

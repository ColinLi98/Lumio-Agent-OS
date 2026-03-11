import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnterpriseAccountService } from '../../../services/agent-kernel/enterpriseAccount.js';
import { enterpriseErrorStatus, readBearerToken, readWorkspaceMode, withCors } from '../common.js';

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
        if (readWorkspaceMode(req) !== 'current') {
            throw new Error('enterprise_current_workspace_required');
        }
        const invites = await getEnterpriseAccountService().listInvites({
            sessionId: String(req.query?.session_id || readBearerToken(req) || '').trim(),
            workspaceId: String(req.query?.workspace_id || '').trim() || undefined,
        });
        res.status(200).json({ success: true, invites });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_invites_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

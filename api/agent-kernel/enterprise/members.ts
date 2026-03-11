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
        const sessionId = String(req.query?.session_id || readBearerToken(req) || '').trim();
        const workspaceId = String(req.query?.workspace_id || '').trim() || undefined;
        const summary = await getEnterpriseAccountService().listMembers(sessionId, workspaceId);
        res.status(200).json({ success: true, summary });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_members_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EnterpriseCenterService } from '../../../services/agent-kernel/enterpriseCenter.js';
import { authorizeEnterpriseAction } from '../../../services/agent-kernel/enterpriseAuthorization.js';
import { getTaskGraphRuntime } from '../../../services/agent-kernel/runtime.js';
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
        const center = String(req.query?.center || '').trim().toUpperCase();
        const sessionId = String(req.query?.session_id || readBearerToken(req) || '').trim();
        const store = getTaskGraphRuntime().getStore();
        if (center === 'APPROVAL') {
            await authorizeEnterpriseAction(store, { session_id: sessionId, action: 'ENTERPRISE_CENTER_APPROVAL_VIEW' });
        } else if (center === 'REVIEW') {
            await authorizeEnterpriseAction(store, { session_id: sessionId, action: 'ENTERPRISE_CENTER_REVIEW_VIEW' });
        } else if (center === 'AUDIT') {
            await authorizeEnterpriseAction(store, { session_id: sessionId, action: 'ENTERPRISE_CENTER_AUDIT_VIEW' });
        } else {
            throw new Error('enterprise_center_invalid');
        }
        const summary = await new EnterpriseCenterService(store).summarizeCenter({
            sessionId,
            center: center as 'APPROVAL' | 'REVIEW' | 'AUDIT',
        });
        res.status(200).json({ success: true, summary });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_center_summary_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

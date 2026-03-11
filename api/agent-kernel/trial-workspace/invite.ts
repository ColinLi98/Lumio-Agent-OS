import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTrialWorkspaceService } from '../../../services/agent-kernel/trialWorkspace.js';
import { withCors } from '../common.js';

const OA_ROLES = [
    'REQUESTER',
    'APPROVER',
    'OPERATOR',
    'REVIEWER',
    'TENANT_ADMIN',
    'WORKSPACE_ADMIN',
    'POLICY_GOVERNANCE_ADMIN',
    'INTEGRATION_ADMIN',
    'AUDITOR',
] as const;

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

    const role = String(req.body?.role || '').trim().toUpperCase() as typeof OA_ROLES[number];
    if (!OA_ROLES.includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
    }

    const invite = await getTrialWorkspaceService().createInvite({
        role,
        label: String(req.body?.label || '').trim() || undefined,
    });

    res.status(200).json({
        success: true,
        invite,
        summary: await getTrialWorkspaceService().summarize(),
    });
}

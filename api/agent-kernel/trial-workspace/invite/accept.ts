import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTrialWorkspaceService } from '../../../../services/agent-kernel/trialWorkspace.js';
import { withCors } from '../../common.js';

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
        const participant = await getTrialWorkspaceService().acceptInvite({
            inviteCode: String(req.body?.inviteCode || req.body?.invite_code || '').trim(),
            actorLabel: String(req.body?.actorLabel || req.body?.actor_label || '').trim() || undefined,
        });
        res.status(200).json({
            success: true,
            participant,
            summary: await getTrialWorkspaceService().summarize(),
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'trial_invite_accept_failed',
        });
    }
}

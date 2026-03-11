import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTrialWorkspaceService } from '../../../services/agent-kernel/trialWorkspace.js';
import { withCors } from '../common.js';

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

    const session = await getTrialWorkspaceService().registerSession({
        labActorId: String(req.body?.labActorId || req.body?.lab_actor_id || '').trim() || undefined,
        oaRole: String(req.body?.oaRole || req.body?.oa_role || '').trim().toUpperCase() as any || undefined,
        page: String(req.body?.page || 'workspace'),
        section: String(req.body?.section || 'overview'),
    });

    res.status(200).json({
        success: true,
        session,
        summary: await getTrialWorkspaceService().summarize(),
    });
}

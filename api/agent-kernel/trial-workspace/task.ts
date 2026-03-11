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

    const task = await getTrialWorkspaceService().createTask({
        labActorId: String(req.body?.labActorId || req.body?.lab_actor_id || '').trim() || undefined,
        templateId: String(req.body?.templateId || req.body?.template_id || 'advisor_client_intake'),
        requesterBrief: String(req.body?.requesterBrief || req.body?.requester_brief || ''),
    });

    res.status(200).json({
        success: true,
        task,
        summary: await getTrialWorkspaceService().summarize(),
    });
}

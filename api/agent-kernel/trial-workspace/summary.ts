import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTrialWorkspaceService } from '../../../services/agent-kernel/trialWorkspace.js';
import { withCors } from '../common.js';

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

    const summary = await getTrialWorkspaceService().summarize();
    res.status(200).json({
        success: true,
        summary,
    });
}

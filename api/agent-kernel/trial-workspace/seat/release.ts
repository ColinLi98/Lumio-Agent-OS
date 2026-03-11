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
        const seat = await getTrialWorkspaceService().releaseSeat({
            seatId: String(req.body?.seatId || req.body?.seat_id || '').trim(),
        });
        res.status(200).json({
            success: true,
            seat,
            summary: await getTrialWorkspaceService().summarize(),
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'trial_seat_release_failed',
        });
    }
}

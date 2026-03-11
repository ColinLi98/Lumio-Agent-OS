import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnterpriseIdentityAdminService } from '../../../../services/agent-kernel/identityAdmin.js';
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
        const service = getEnterpriseIdentityAdminService();
        const result = await service.exchangeAuthorizationCode({
            state: String(req.body?.state || '').trim(),
            code: String(req.body?.code || '').trim(),
            redirect_uri: String(req.body?.redirect_uri || '').trim(),
        });

        res.status(200).json({
            success: true,
            session: result.session,
            principal: result.principal,
            active_bindings: result.active_bindings,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'exchange_failed',
        });
    }
}

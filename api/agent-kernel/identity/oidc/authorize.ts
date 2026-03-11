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
        const result = await service.startAuthorization({
            redirect_uri: String(req.body?.redirect_uri || '').trim(),
            workspace_id: String(req.body?.workspace_id || '').trim() || undefined,
        });

        res.status(200).json({
            success: true,
            provider: result.provider,
            tenant_id: result.tenant_id,
            workspace_id: result.workspace_id,
            authorize_url: result.authorize_url,
            state: result.state,
            expires_at: result.expires_at,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'authorize_failed',
        });
    }
}

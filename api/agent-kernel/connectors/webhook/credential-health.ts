import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVaultBackedWebhookService } from '../../../../services/agent-kernel/vaultWebhook.js';
import { withCors } from '../../common.js';
import { connectorErrorStatus, readEnterpriseSessionId } from './common.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const service = getVaultBackedWebhookService();
        const summary = await service.inspectCredentialHealth({
            session_id: readEnterpriseSessionId(req),
        });
        res.status(200).json({
            success: true,
            credential_health: summary,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'credential_health_failed';
        res.status(connectorErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

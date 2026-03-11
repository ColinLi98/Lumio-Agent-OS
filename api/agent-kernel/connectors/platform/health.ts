import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConnectorPlatformService } from '../../../../services/agent-kernel/connectorPlatform.js';
import { withCors } from '../../common.js';
import { connectorErrorStatus, readEnterpriseSessionId } from '../webhook/common.js';

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
        const service = getConnectorPlatformService();
        const adapterId = String(req.query?.adapter_id || req.body?.adapter_id || '').trim();
        if (adapterId) {
            const connector = await service.inspectConnectorHealth({
                session_id: readEnterpriseSessionId(req),
                adapter_id: adapterId,
            });
            res.status(200).json({
                success: true,
                connector,
            });
            return;
        }

        const connectors = await service.inspectAllConnectorHealth({
            session_id: readEnterpriseSessionId(req),
        });
        res.status(200).json({
            success: true,
            connectors,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'connector_health_failed';
        res.status(connectorErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConnectorPlatformService } from '../../../../services/agent-kernel/connectorPlatform.js';
import { readCorrelationId, withCors } from '../../common.js';
import {
    connectorDeliveryStatusCode,
    connectorErrorStatus,
    readEnterpriseSessionId,
} from './common.js';

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
        const service = getConnectorPlatformService();
        const result = await service.dispatchGenericWebhook({
            session_id: readEnterpriseSessionId(req),
            task_id: String(req.body?.task_id || '').trim() || undefined,
            correlation_id: readCorrelationId(req),
            run_id: String(req.body?.run_id || '').trim() || undefined,
            payload: req.body?.payload ?? req.body,
            request_headers: req.body?.request_headers,
            payload_summary: String(req.body?.payload_summary || '').trim() || undefined,
        });
        res.status(connectorDeliveryStatusCode(result.connector_delivery.final_status)).json({
            success: result.connector_delivery.final_status === 'DELIVERED',
            correlation_id: result.connector_delivery.correlation_id,
            delivery: result.delivery,
            credential_health: result.connector_health.credential_health,
            route_eligible: result.route_eligible,
            adapter: result.adapter,
            connector_delivery: result.connector_delivery,
            connector_health: result.connector_health,
            attempts: result.attempts,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'webhook_delivery_failed';
        res.status(connectorErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

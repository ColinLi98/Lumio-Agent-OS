import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConnectorPlatformService } from '../../../../services/agent-kernel/connectorPlatform.js';
import { readCorrelationId, withCors } from '../../common.js';
import {
    connectorDeliveryStatusCode,
    connectorErrorStatus,
    readEnterpriseSessionId,
} from '../webhook/common.js';

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
        const result = await service.dispatchAdvisorCrmComplianceHandoff({
            session_id: readEnterpriseSessionId(req),
            task_id: String(req.body?.task_id || '').trim() || undefined,
            correlation_id: readCorrelationId(req),
            run_id: String(req.body?.run_id || '').trim() || undefined,
            workflow_id: req.body?.workflow_id,
            crm_record_id: req.body?.crm_record_id,
            client_name: req.body?.client_name,
            advisor_name: req.body?.advisor_name,
            meeting_title: req.body?.meeting_title,
            post_meeting_notes: req.body?.post_meeting_notes,
            crm_ready_draft: req.body?.crm_ready_draft,
            compliance_handoff_package: req.body?.compliance_handoff_package,
            evidence_refs: req.body?.evidence_refs,
            request_headers: req.body?.request_headers,
        });
        res.status(connectorDeliveryStatusCode(result.connector_delivery.final_status)).json({
            success: result.connector_delivery.final_status === 'DELIVERED',
            correlation_id: result.connector_delivery.correlation_id,
            adapter: result.adapter,
            connector_delivery: result.connector_delivery,
            connector_health: result.connector_health,
            attempts: result.attempts,
            delivery: result.delivery,
            route_eligible: result.route_eligible,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'connector_business_handoff_failed';
        res.status(connectorErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}

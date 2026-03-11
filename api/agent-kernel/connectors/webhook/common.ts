import type { VercelRequest } from '@vercel/node';
import { readBearerToken } from '../../common.js';
import type { WebhookDeliveryStatus } from '../../../../services/agent-kernel/contracts.js';

export function readEnterpriseSessionId(req: VercelRequest): string {
    return String(req.body?.session_id || readBearerToken(req) || '').trim();
}

export function connectorErrorStatus(message: string): number {
    if (message === 'enterprise_admin_access_denied') return 403;
    if (message === 'connector_adapter_not_found') return 404;
    return 400;
}

export function connectorDeliveryStatusCode(status: WebhookDeliveryStatus): number {
    if (status === 'RATE_LIMITED') return 429;
    if (status === 'TIMED_OUT') return 504;
    if (status === 'FAILED' || status === 'DEAD_LETTERED') return 502;
    return 200;
}

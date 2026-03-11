import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { WorkspaceMode } from '../../services/agent-kernel/contracts.js';

export function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id');
}

export function randomTaskId(prefix = 'task'): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function readBearerToken(req: VercelRequest): string | undefined {
    const raw = req.headers?.authorization;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const normalized = String(value || '').trim();
    if (!normalized.toLowerCase().startsWith('bearer ')) return undefined;
    const token = normalized.slice('bearer '.length).trim();
    return token || undefined;
}

export function enterpriseErrorStatus(message: string): number {
    if (
        message === 'missing_enterprise_session'
        || message === 'enterprise_session_not_found'
    ) {
        return 401;
    }
    if (
        message === 'enterprise_session_not_active'
        || message === 'enterprise_session_expired'
        || message === 'enterprise_principal_not_active'
        || message === 'enterprise_admin_access_denied'
        || message === 'enterprise_action_not_authorized'
        || message === 'enterprise_current_workspace_required'
        || message === 'enterprise_persistence_required'
        || message === 'enterprise_session_tenant_mismatch'
        || message === 'enterprise_session_workspace_mismatch'
        || message === 'enterprise_role_not_bound'
        || message === 'enterprise_invite_email_mismatch'
    ) {
        return 403;
    }
    if (
        message.endsWith('_not_found')
        || message === 'Task not found'
    ) {
        return 404;
    }
    return 400;
}

export function readCorrelationId(req: VercelRequest): string | undefined {
    const header = req.headers?.['x-correlation-id'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    const candidate = String(req.body?.correlation_id || headerValue || '').trim();
    return candidate || undefined;
}

export function readWorkspaceMode(req: VercelRequest): WorkspaceMode {
    const raw = Array.isArray(req.query?.workspace_mode)
        ? req.query?.workspace_mode[0]
        : req.query?.workspace_mode;
    const normalized = String(raw || '').trim().toLowerCase();
    if (normalized === 'demo') return 'demo';
    if (normalized === 'local_lab') return 'local_lab';
    return 'current';
}

export function readLocalRoleLabActorId(req: VercelRequest): string | undefined {
    const raw = Array.isArray(req.query?.lab_actor_id)
        ? req.query?.lab_actor_id[0]
        : req.query?.lab_actor_id;
    const normalized = String(raw || '').trim();
    return normalized || undefined;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { EnterpriseDirectorySyncUpdate } from '../../../services/agent-kernel/identityAdmin.js';
import { getEnterpriseIdentityAdminService } from '../../../services/agent-kernel/identityAdmin.js';
import { readBearerToken, withCors } from '../common.js';

function normalizeScimLikeUpdate(body: any): EnterpriseDirectorySyncUpdate | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const emails = Array.isArray(body.emails) ? body.emails : [];
    const primaryEmail = emails.find((entry) => Boolean(entry?.value))?.value;
    const groups = Array.isArray(body.groups)
        ? body.groups.map((group) => String(group?.display || group?.value || '').trim()).filter(Boolean)
        : Array.isArray(body.memberships)
            ? body.memberships.map((group) => String(group || '').trim()).filter(Boolean)
            : [];
    const externalSubject = String(body.id || body.external_subject || '').trim();
    const email = String(body.userName || body.email || primaryEmail || '').trim();
    if (!externalSubject || !email) return undefined;
    return {
        external_subject: externalSubject,
        email,
        display_name: String(body.displayName || body.display_name || '').trim() || undefined,
        groups,
        status: body.active === false ? 'DEPROVISIONED' : undefined,
        workspace_id: String(body.workspace_id || '').trim() || undefined,
    };
}

function normalizeUpdates(body: any): EnterpriseDirectorySyncUpdate[] {
    if (Array.isArray(body?.updates)) {
        return body.updates.map((entry) => ({
            external_subject: String(entry?.external_subject || '').trim(),
            email: String(entry?.email || '').trim(),
            display_name: String(entry?.display_name || '').trim() || undefined,
            groups: Array.isArray(entry?.groups)
                ? entry.groups.map((group: unknown) => String(group || '').trim()).filter(Boolean)
                : undefined,
            status: entry?.status,
            workspace_id: String(entry?.workspace_id || '').trim() || undefined,
        }));
    }

    if (Array.isArray(body?.Resources)) {
        return body.Resources
            .map((resource: unknown) => normalizeScimLikeUpdate(resource))
            .filter((update): update is EnterpriseDirectorySyncUpdate => Boolean(update));
    }

    const single = normalizeScimLikeUpdate(body);
    return single ? [single] : [];
}

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
        const sessionId = String(req.body?.session_id || readBearerToken(req) || '').trim();
        const updates = normalizeUpdates(req.body || {});
        const result = await service.syncDirectory({
            session_id: sessionId,
            workspace_id: String(req.body?.workspace_id || '').trim() || undefined,
            updates,
        });

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'directory_sync_failed';
        const statusCode = message === 'enterprise_admin_access_denied' ? 403 : 400;
        res.status(statusCode).json({
            success: false,
            error: message,
        });
    }
}

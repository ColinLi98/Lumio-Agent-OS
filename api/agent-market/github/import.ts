import type { VercelRequest, VercelResponse } from '@vercel/node';
import { importAgentFromGithub } from '../../../services/agentGithubImportService.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function githubErrorCode(error: unknown): string {
    return error instanceof Error ? String(error.message || '').trim() : '';
}

function mapImportError(error: unknown): { status: number; error: string; error_code: string } {
    const message = githubErrorCode(error) || 'internal_error';
    if (message === 'invalid_repo_full_name') {
        return { status: 400, error: 'invalid_repo_full_name', error_code: 'invalid_repo' };
    }
    if (message === 'Not Found' || message.includes('github_manifest_http_404')) {
        return { status: 400, error: 'manifest_not_found', error_code: 'manifest_not_found' };
    }
    if (message.startsWith('manifest_json_parse_failed')) {
        return { status: 422, error: message, error_code: 'manifest_json_parse_failed' };
    }
    if (message.startsWith('manifest_invalid')) {
        return { status: 422, error: message, error_code: 'manifest_invalid' };
    }
    return { status: 500, error: message, error_code: 'internal_error' };
}

function parseBody(req: VercelRequest): Record<string, unknown> {
    if (req.body && typeof req.body === 'object') {
        return req.body as Record<string, unknown>;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
        try {
            const parsed = JSON.parse(req.body);
            if (parsed && typeof parsed === 'object') {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return {};
        }
    }
    return {};
}

export default async function githubImportHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
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
        const body = parseBody(req);
        const repo = String(body.repo || '').trim();
        if (!repo) {
            res.status(400).json({ success: false, error: 'Missing required field: repo' });
            return;
        }
        const deliveryMode = body.delivery_mode_preference === 'agent_collab'
            ? 'agent_collab'
            : body.delivery_mode_preference === 'human_expert'
                ? 'human_expert'
                : 'hybrid';
        const result = await importAgentFromGithub({
            user_id: typeof body.user_id === 'string' ? body.user_id : 'demo_user',
            owner_id: typeof body.owner_id === 'string' ? body.owner_id : undefined,
            repo,
            manifest_path: typeof body.manifest_path === 'string' ? body.manifest_path : undefined,
            ref: typeof body.ref === 'string' ? body.ref : undefined,
            manifest_json: body.manifest_json,
            delivery_mode_preference: deliveryMode,
        });
        res.status(200).json({
            success: true,
            descriptor: result.descriptor,
            manifest: result.manifest,
            review: result.review,
            repo: result.repo,
            manifest_path: result.manifest_path,
            source: result.source,
        });
    } catch (error) {
        const mapped = mapImportError(error);
        res.status(mapped.status).json({ success: false, error: mapped.error, error_code: mapped.error_code });
    }
}

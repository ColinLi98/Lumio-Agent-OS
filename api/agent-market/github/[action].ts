import type { VercelRequest, VercelResponse } from '@vercel/node';
import { githubAppService } from '../../../services/githubAppService.js';
import { importAgentFromGithub } from '../../../services/agentGithubImportService.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function firstQueryParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return String(value[0] || '');
    return String(value || '');
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const action = firstQueryParam(req.query?.action).trim();

    switch (action) {
        case 'connect':
            return handleConnect(req, res);
        case 'callback':
            return handleCallback(req, res);
        case 'repos':
            return handleRepos(req, res);
        case 'import':
            return handleImport(req, res);
        default:
            res.status(404).json({ success: false, error: `Unknown github action: ${action}` });
    }
}

async function handleConnect(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    try {
        const userId = firstQueryParam(req.query?.user_id).trim() || 'demo_user';
        const origin = String(req.headers.origin || '').trim();
        const session = githubAppService.createConnectSession({ user_id: userId, origin });
        res.status(200).json({
            success: true,
            user_id: userId,
            connect_url: session.connect_url,
            state: session.state,
            callback_url: session.callback_url,
            mode: session.connect_url.startsWith('mock://') ? 'mock' : 'oauth',
        });
    } catch (error) {
        const code = githubErrorCode(error);
        if (code === 'github_oauth_not_configured') {
            res.status(200).json({
                success: true,
                user_id: firstQueryParam(req.query?.user_id).trim() || 'demo_user',
                connected: false,
                mode: 'public_only',
                connect_required: false,
                connect_url: '',
                state: '',
                callback_url: githubAppService.getCallbackUrl(String(req.headers.origin || '').trim()),
                reason: code,
                message: 'GitHub OAuth 未配置，已降级为 public-only（可手动导入公开仓库）。',
            });
            return;
        }
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'internal_error' });
    }
}

async function handleCallback(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    try {
        const code = firstQueryParam(req.query?.code).trim();
        const state = firstQueryParam(req.query?.state).trim();
        const userId = firstQueryParam(req.query?.user_id).trim();
        const origin = String(req.headers.origin || '').trim();
        const connection = await githubAppService.completeConnectCallback({ code, state, user_id: userId, origin });
        res.status(200).json({
            success: true,
            connected: connection.connected,
            user_id: connection.user_id,
            mode: connection.mode,
            scope: connection.scope,
            connected_at: connection.connected_at,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'internal_error' });
    }
}

async function handleRepos(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    try {
        const userId = firstQueryParam(req.query?.user_id).trim() || 'demo_user';
        const { repos, connection } = await githubAppService.listRepos(userId);
        res.status(200).json({
            success: true,
            user_id: userId,
            connected: Boolean(connection?.connected),
            connection_mode: connection?.mode || 'mock',
            repos,
            count: repos.length,
        });
    } catch (error) {
        const code = githubErrorCode(error);
        if (code === 'github_not_connected' || code === 'github_oauth_not_configured' || code === 'github_oauth_failed_and_mock_disabled') {
            const userId = firstQueryParam(req.query?.user_id).trim() || 'demo_user';
            res.status(200).json({
                success: true,
                user_id: userId,
                connected: false,
                connection_mode: 'public_only',
                repos: [],
                count: 0,
                reason: code,
                message: '当前未完成 OAuth 连接；可直接输入 owner/repo 导入公开仓库。',
            });
            return;
        }
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'internal_error' });
    }
}

async function handleImport(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    try {
        const body = req.body || {};
        const repo = String(body?.repo || '').trim();
        if (!repo) {
            res.status(400).json({ success: false, error: 'Missing required field: repo' });
            return;
        }
        const result = await importAgentFromGithub({
            user_id: typeof body?.user_id === 'string' ? body.user_id : 'demo_user',
            owner_id: typeof body?.owner_id === 'string' ? body.owner_id : undefined,
            repo,
            manifest_path: typeof body?.manifest_path === 'string' ? body.manifest_path : undefined,
            ref: typeof body?.ref === 'string' ? body.ref : undefined,
            manifest_json: body?.manifest_json,
            delivery_mode_preference:
                body?.delivery_mode_preference === 'agent_collab'
                    ? 'agent_collab'
                    : body?.delivery_mode_preference === 'human_expert'
                        ? 'human_expert'
                        : 'hybrid',
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

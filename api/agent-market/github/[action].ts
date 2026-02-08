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
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'internal_error' });
    }
}

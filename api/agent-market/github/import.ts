import type { VercelRequest, VercelResponse } from '@vercel/node';
import { importAgentFromGithub } from '../../../services/agentGithubImportService';

function withCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'internal_error',
    });
  }
}

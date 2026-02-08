import type { VercelRequest, VercelResponse } from '@vercel/node';
import { githubAppService } from '../../../services/githubAppService';

function withCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'internal_error',
    });
  }
}

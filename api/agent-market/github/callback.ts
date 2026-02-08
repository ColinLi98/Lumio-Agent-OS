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
    const code = firstQueryParam(req.query?.code).trim();
    const state = firstQueryParam(req.query?.state).trim();
    const userId = firstQueryParam(req.query?.user_id).trim();
    const origin = String(req.headers.origin || '').trim();
    const connection = await githubAppService.completeConnectCallback({
      code,
      state,
      user_id: userId,
      origin,
    });
    res.status(200).json({
      success: true,
      connected: connection.connected,
      user_id: connection.user_id,
      mode: connection.mode,
      scope: connection.scope,
      connected_at: connection.connected_at,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'internal_error',
    });
  }
}

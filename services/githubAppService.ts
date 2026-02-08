import crypto from 'node:crypto';

export interface GithubConnection {
  user_id: string;
  connected: boolean;
  connected_at: string;
  mode: 'oauth' | 'mock';
  access_token?: string;
  token_type?: string;
  scope?: string;
  installation_id?: string;
}

export interface GithubRepoSummary {
  id: number;
  full_name: string;
  private: boolean;
  default_branch?: string;
  html_url?: string;
}

interface PendingConnectState {
  state: string;
  user_id: string;
  created_at_ms: number;
}

const CONNECT_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_GITHUB_SCOPES = 'read:user repo';
const DEFAULT_CALLBACK_PATH = '/api/agent-market/github/callback';

const pendingConnectStates = new Map<string, PendingConnectState>();
const connections = new Map<string, GithubConnection>();

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeUserId(value: unknown): string {
  const normalized = String(value || '').trim();
  return normalized || 'demo_user';
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [state, meta] of pendingConnectStates.entries()) {
    if (now - meta.created_at_ms > CONNECT_STATE_TTL_MS) {
      pendingConnectStates.delete(state);
    }
  }
}

function getClientId(): string {
  return String(process.env.GITHUB_APP_CLIENT_ID || '').trim();
}

function getClientSecret(): string {
  return String(process.env.GITHUB_APP_CLIENT_SECRET || '').trim();
}

function getGithubScopes(): string {
  const configured = String(process.env.GITHUB_APP_SCOPES || '').trim();
  return configured || DEFAULT_GITHUB_SCOPES;
}

function isMockModeEnabled(): boolean {
  return String(process.env.GITHUB_APP_MOCK_MODE || '1').trim() !== '0';
}

function getCallbackUrl(origin?: string): string {
  const explicit = String(process.env.GITHUB_APP_CALLBACK_URL || '').trim();
  if (explicit) return explicit;
  const normalizedOrigin = String(origin || '').trim();
  if (normalizedOrigin && /^https?:\/\//i.test(normalizedOrigin)) {
    return `${trimTrailingSlash(normalizedOrigin)}${DEFAULT_CALLBACK_PATH}`;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:3000/api/agent-market/github/callback';
  }
  return 'https://lumi-agent-simulator.vercel.app/api/agent-market/github/callback';
}

function parseRepoFullName(fullName: string): { owner: string; repo: string } | null {
  const normalized = String(fullName || '').trim();
  const parts = normalized.split('/').map((v) => v.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function readMockRepos(): GithubRepoSummary[] {
  const raw = String(process.env.GITHUB_MOCK_REPOS_JSON || '').trim();
  if (!raw) {
    return [
      {
        id: 1,
        full_name: 'lix-demo/agent-template',
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/lix-demo/agent-template',
      },
    ];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: Number(item?.id || 0),
        full_name: String(item?.full_name || ''),
        private: Boolean(item?.private),
        default_branch: item?.default_branch ? String(item.default_branch) : undefined,
        html_url: item?.html_url ? String(item.html_url) : undefined,
      }))
      .filter((item) => item.id > 0 && item.full_name.includes('/'));
  } catch {
    return [];
  }
}

async function exchangeOAuthToken(params: {
  code: string;
  callback_url: string;
}): Promise<{ access_token: string; token_type?: string; scope?: string }> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('github_oauth_not_configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      redirect_uri: params.callback_url,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.error_description || payload?.error || `github_oauth_http_${response.status}`));
  }
  const token = String(payload?.access_token || '').trim();
  if (!token) {
    throw new Error(String(payload?.error_description || payload?.error || 'github_oauth_missing_token'));
  }
  return {
    access_token: token,
    token_type: payload?.token_type ? String(payload.token_type) : undefined,
    scope: payload?.scope ? String(payload.scope) : undefined,
  };
}

async function fetchGithubReposWithToken(accessToken: string): Promise<GithubRepoSummary[]> {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    const message = Array.isArray(payload)
      ? `github_repos_http_${response.status}`
      : String(payload?.message || `github_repos_http_${response.status}`);
    throw new Error(message);
  }
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item: any) => ({
      id: Number(item?.id || 0),
      full_name: String(item?.full_name || ''),
      private: Boolean(item?.private),
      default_branch: item?.default_branch ? String(item.default_branch) : undefined,
      html_url: item?.html_url ? String(item.html_url) : undefined,
    }))
    .filter((repo: GithubRepoSummary) => repo.id > 0 && repo.full_name.includes('/'));
}

async function fetchRepoContent(params: {
  access_token?: string;
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}): Promise<string> {
  const refQuery = params.ref ? `?ref=${encodeURIComponent(params.ref)}` : '';
  const url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/contents/${params.path.replace(/^\/+/, '')}${refQuery}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (params.access_token) {
    headers.Authorization = `Bearer ${params.access_token}`;
  }
  const response = await fetch(url, { method: 'GET', headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.message || `github_manifest_http_${response.status}`));
  }
  const encodedContent = String(payload?.content || '').trim();
  if (!encodedContent) throw new Error('github_manifest_empty');
  return Buffer.from(encodedContent.replace(/\n/g, ''), 'base64').toString('utf8');
}

class GithubAppService {
  getCallbackUrl(origin?: string): string {
    return getCallbackUrl(origin);
  }

  getConnection(userId: string): GithubConnection | undefined {
    return connections.get(sanitizeUserId(userId));
  }

  createConnectSession(params: {
    user_id?: string;
    origin?: string;
  }): { connect_url: string; state: string; callback_url: string } {
    cleanupExpiredStates();
    const userId = sanitizeUserId(params.user_id);
    const callbackUrl = getCallbackUrl(params.origin);
    const state = `gh_${crypto.randomBytes(12).toString('hex')}`;
    pendingConnectStates.set(state, {
      state,
      user_id: userId,
      created_at_ms: Date.now(),
    });

    const clientId = getClientId();
    const connectUrl = clientId
      ? `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(getGithubScopes())}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(callbackUrl)}`
      : `mock://github/connect?state=${encodeURIComponent(state)}`;

    return {
      connect_url: connectUrl,
      state,
      callback_url: callbackUrl,
    };
  }

  async completeConnectCallback(params: {
    code?: string;
    state?: string;
    user_id?: string;
    origin?: string;
  }): Promise<GithubConnection> {
    cleanupExpiredStates();
    const state = String(params.state || '').trim();
    const stateMeta = state ? pendingConnectStates.get(state) : undefined;
    if (state && stateMeta) {
      pendingConnectStates.delete(state);
    }
    const userId = sanitizeUserId(params.user_id || stateMeta?.user_id);
    const callbackUrl = getCallbackUrl(params.origin);
    const code = String(params.code || '').trim();

    if (code) {
      try {
        const token = await exchangeOAuthToken({ code, callback_url: callbackUrl });
        const connection: GithubConnection = {
          user_id: userId,
          connected: true,
          connected_at: nowIso(),
          mode: 'oauth',
          access_token: token.access_token,
          token_type: token.token_type,
          scope: token.scope,
        };
        connections.set(userId, connection);
        return connection;
      } catch (error) {
        if (!isMockModeEnabled()) {
          throw error;
        }
      }
    }

    if (!isMockModeEnabled()) {
      throw new Error('github_oauth_failed_and_mock_disabled');
    }
    const fallbackConnection: GithubConnection = {
      user_id: userId,
      connected: true,
      connected_at: nowIso(),
      mode: 'mock',
    };
    connections.set(userId, fallbackConnection);
    return fallbackConnection;
  }

  disconnect(userId: string): void {
    connections.delete(sanitizeUserId(userId));
  }

  async listRepos(userId: string): Promise<{ repos: GithubRepoSummary[]; connection?: GithubConnection }> {
    const normalizedUserId = sanitizeUserId(userId);
    const connection = connections.get(normalizedUserId);
    if (!connection) {
      if (!isMockModeEnabled()) {
        return { repos: [], connection: undefined };
      }
      return {
        repos: readMockRepos(),
        connection: {
          user_id: normalizedUserId,
          connected: false,
          connected_at: nowIso(),
          mode: 'mock',
        },
      };
    }
    if (connection.access_token) {
      const repos = await fetchGithubReposWithToken(connection.access_token);
      return { repos, connection };
    }
    return { repos: readMockRepos(), connection };
  }

  async readManifestFromRepo(params: {
    user_id?: string;
    repo: string;
    manifest_path?: string;
    ref?: string;
  }): Promise<{ content: string; source: 'github_api'; repo: string; manifest_path: string }> {
    const userId = sanitizeUserId(params.user_id);
    const repo = parseRepoFullName(params.repo);
    if (!repo) {
      throw new Error('invalid_repo_full_name');
    }
    const manifestPath = String(params.manifest_path || '.lix/agent.manifest.json').trim() || '.lix/agent.manifest.json';
    const connection = connections.get(userId);
    const content = await fetchRepoContent({
      access_token: connection?.access_token,
      owner: repo.owner,
      repo: repo.repo,
      path: manifestPath,
      ref: params.ref,
    });
    return {
      content,
      source: 'github_api',
      repo: `${repo.owner}/${repo.repo}`,
      manifest_path: manifestPath,
    };
  }
}

export const githubAppService = new GithubAppService();

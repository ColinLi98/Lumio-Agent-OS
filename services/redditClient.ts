/**
 * Reddit API Client - Reddit 平台接口封装
 *
 * Provides Reddit API integration for the Lumi Promotion Agent.
 * Uses Reddit's OAuth2 API directly (no external library dependency).
 * Implements rate limiting, retry logic, and error handling.
 */

import {
    RedditCredentials,
    RedditPost,
    RedditComment,
    RedditSubmission,
    RedditSearchResult,
    RateLimitConfig,
    DEFAULT_RATE_LIMIT,
} from './promotionTypes.js';

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
    private timestamps: number[] = [];
    private config: RateLimitConfig;
    private subredditLastPost: Map<string, number> = new Map();
    private dailyPostCount = 0;
    private dailyResetAt = 0;

    constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
        this.config = config;
    }

    async waitForSlot(): Promise<void> {
        const now = Date.now();

        // Reset daily counter
        if (now > this.dailyResetAt) {
            this.dailyPostCount = 0;
            this.dailyResetAt = now + 24 * 60 * 60 * 1000;
        }

        // Check daily limit
        if (this.dailyPostCount >= this.config.maxPostsPerDay) {
            const waitMs = this.dailyResetAt - now;
            console.warn(`[RedditClient] Daily post limit (${this.config.maxPostsPerDay}) reached. Wait ${Math.round(waitMs / 1000 / 60)} minutes.`);
            throw new Error(`Daily post limit reached. Resets in ${Math.round(waitMs / 1000 / 60)} minutes.`);
        }

        // Clean old timestamps (older than 1 minute)
        this.timestamps = this.timestamps.filter(t => now - t < 60_000);

        // Check per-minute rate limit
        if (this.timestamps.length >= this.config.maxRequestsPerMinute) {
            const oldestInWindow = this.timestamps[0];
            const waitMs = 60_000 - (now - oldestInWindow) + 100;
            console.log(`[RedditClient] Rate limit: waiting ${waitMs}ms`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }

        this.timestamps.push(Date.now());
    }

    checkSubredditCooldown(subreddit: string): boolean {
        const lastPost = this.subredditLastPost.get(subreddit);
        if (!lastPost) return true;
        return Date.now() - lastPost >= this.config.minIntervalPerSubreddit;
    }

    recordPost(subreddit: string): void {
        this.subredditLastPost.set(subreddit, Date.now());
        this.dailyPostCount++;
    }
}

// ============================================================================
// Reddit API Client
// ============================================================================

export class RedditClient {
    private credentials: RedditCredentials;
    private accessToken: string | null = null;
    private tokenExpiresAt = 0;
    private rateLimiter: RateLimiter;
    private baseUrl = 'https://oauth.reddit.com';
    private authUrl = 'https://www.reddit.com/api/v1/access_token';

    constructor(credentials: RedditCredentials, rateLimit?: RateLimitConfig) {
        this.credentials = credentials;
        this.rateLimiter = new RateLimiter(rateLimit);
    }

    // --------------------------------------------------------------------------
    // Authentication
    // --------------------------------------------------------------------------

    private async authenticate(): Promise<void> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
            return; // Token still valid
        }

        const basicAuth = btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`);

        const body = new URLSearchParams({
            grant_type: 'password',
            username: this.credentials.username,
            password: this.credentials.password,
        });

        const response = await fetch(this.authUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.credentials.userAgent,
            },
            body: body.toString(),
        });

        if (!response.ok) {
            throw new Error(`Reddit auth failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
        console.log('[RedditClient] Authenticated successfully');
    }

    // --------------------------------------------------------------------------
    // HTTP helpers
    // --------------------------------------------------------------------------

    private async request<T>(
        method: string,
        path: string,
        body?: Record<string, string>,
        retries = 2
    ): Promise<T> {
        await this.rateLimiter.waitForSlot();
        await this.authenticate();

        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': this.credentials.userAgent,
        };

        const options: RequestInit = { method, headers };

        if (body) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.body = new URLSearchParams(body).toString();
        }

        try {
            const response = await fetch(url, options);

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
                console.warn(`[RedditClient] Rate limited. Retry after ${retryAfter}s`);
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    return this.request<T>(method, path, body, retries - 1);
                }
                throw new Error('Rate limited by Reddit API');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
            }

            return response.json() as Promise<T>;
        } catch (error) {
            if (retries > 0 && !(error instanceof Error && error.message.includes('Rate limited'))) {
                console.warn(`[RedditClient] Request failed, retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 2000));
                return this.request<T>(method, path, body, retries - 1);
            }
            throw error;
        }
    }

    // --------------------------------------------------------------------------
    // Public API: Posts
    // --------------------------------------------------------------------------

    /**
     * Submit a new post to a subreddit
     */
    async submitPost(post: RedditPost): Promise<{ id: string; permalink: string }> {
        // Check subreddit cooldown
        if (!this.rateLimiter.checkSubredditCooldown(post.subreddit)) {
            throw new Error(`Cooldown active for r/${post.subreddit}. Wait before posting again.`);
        }

        const bodyParams: Record<string, string> = {
            sr: post.subreddit,
            kind: post.kind,
            title: post.title,
            resubmit: 'true',
            send_replies: 'true',
        };

        if (post.kind === 'self') {
            bodyParams.text = post.body;
        } else {
            bodyParams.url = post.url || '';
        }

        if (post.flair) {
            bodyParams.flair_text = post.flair;
        }

        interface SubmitResponse {
            json: {
                errors: string[][];
                data: {
                    id: string;
                    name: string;
                    url: string;
                };
            };
        }

        const result = await this.request<SubmitResponse>('POST', '/api/submit', bodyParams);

        if (result.json?.errors?.length > 0) {
            const errors = result.json.errors.map(e => e.join(': ')).join('; ');
            throw new Error(`Reddit submission error: ${errors}`);
        }

        const postId = result.json?.data?.id || '';
        const permalink = result.json?.data?.url || `/r/${post.subreddit}/comments/${postId}`;

        this.rateLimiter.recordPost(post.subreddit);

        console.log(`[RedditClient] Posted to r/${post.subreddit}: ${permalink}`);
        return { id: postId, permalink };
    }

    /**
     * Submit a comment/reply
     */
    async submitComment(comment: RedditComment): Promise<{ id: string }> {
        interface CommentResponse {
            json: {
                errors: string[][];
                data: {
                    things: Array<{ data: { id: string } }>;
                };
            };
        }

        const result = await this.request<CommentResponse>('POST', '/api/comment', {
            thing_id: comment.parentId,
            text: comment.body,
        });

        if (result.json?.errors?.length > 0) {
            const errors = result.json.errors.map(e => e.join(': ')).join('; ');
            throw new Error(`Reddit comment error: ${errors}`);
        }

        const commentId = result.json?.data?.things?.[0]?.data?.id || '';
        console.log(`[RedditClient] Commented on ${comment.parentId} in r/${comment.subreddit}`);
        return { id: commentId };
    }

    // --------------------------------------------------------------------------
    // Public API: Search & Monitor
    // --------------------------------------------------------------------------

    /**
     * Search subreddit for relevant posts to engage with
     */
    async searchSubreddit(
        subreddit: string,
        query: string,
        options: { sort?: 'relevance' | 'new' | 'hot'; limit?: number; timeframe?: 'hour' | 'day' | 'week' | 'month' } = {}
    ): Promise<RedditSearchResult> {
        const { sort = 'new', limit = 10, timeframe = 'week' } = options;

        interface SearchResponse {
            data: {
                children: Array<{
                    data: RedditSubmission;
                }>;
                dist: number;
            };
        }

        const path = `/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=on&sort=${sort}&t=${timeframe}&limit=${limit}`;
        const result = await this.request<SearchResponse>('GET', path);

        return {
            submissions: (result.data?.children || []).map(c => c.data),
            total: result.data?.dist || 0,
        };
    }

    /**
     * Get new/hot posts from a subreddit
     */
    async getSubredditPosts(
        subreddit: string,
        sort: 'new' | 'hot' | 'rising' = 'new',
        limit = 25
    ): Promise<RedditSubmission[]> {
        interface ListingResponse {
            data: {
                children: Array<{ data: RedditSubmission }>;
            };
        }

        const path = `/r/${subreddit}/${sort}?limit=${limit}`;
        const result = await this.request<ListingResponse>('GET', path);
        return (result.data?.children || []).map(c => c.data);
    }

    /**
     * Get comments on a specific post
     */
    async getPostComments(
        subreddit: string,
        postId: string,
        limit = 50
    ): Promise<Array<{ id: string; body: string; author: string; score: number }>> {
        const path = `/r/${subreddit}/comments/${postId}?limit=${limit}`;
        const result = await this.request<any[]>('GET', path);

        if (!result || result.length < 2) return [];

        return (result[1]?.data?.children || [])
            .filter((c: any) => c.kind === 't1')
            .map((c: any) => ({
                id: c.data.name,
                body: c.data.body,
                author: c.data.author,
                score: c.data.score,
            }));
    }

    /**
     * Get account info (for health check)
     */
    async getAccountInfo(): Promise<{ name: string; karma: number; created: number }> {
        const result = await this.request<any>('GET', '/api/v1/me');
        return {
            name: result.name,
            karma: (result.link_karma || 0) + (result.comment_karma || 0),
            created: result.created_utc,
        };
    }

    /**
     * Check if the client is working
     */
    async healthCheck(): Promise<{ ok: boolean; username?: string; error?: string }> {
        try {
            const info = await this.getAccountInfo();
            return { ok: true, username: info.name };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
}

// ============================================================================
// Factory: Create client from environment variables
// ============================================================================

export function createRedditClientFromEnv(): RedditClient | null {
    const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const readEnv = (key: string): string | undefined => {
        const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
        return fromProcess || importMetaEnv?.[key];
    };

    const clientId = readEnv('VITE_REDDIT_CLIENT_ID') || readEnv('REDDIT_CLIENT_ID');
    const clientSecret = readEnv('VITE_REDDIT_CLIENT_SECRET') || readEnv('REDDIT_CLIENT_SECRET');
    const username = readEnv('VITE_REDDIT_USERNAME') || readEnv('REDDIT_USERNAME');
    const password = readEnv('VITE_REDDIT_PASSWORD') || readEnv('REDDIT_PASSWORD');
    const userAgent = readEnv('VITE_REDDIT_USER_AGENT') || readEnv('REDDIT_USER_AGENT') || 'lumi-promotion-agent/1.0';

    if (!clientId || !clientSecret || !username || !password) {
        console.warn('[RedditClient] Missing Reddit credentials in environment');
        return null;
    }

    return new RedditClient({
        clientId,
        clientSecret,
        username,
        password,
        userAgent,
    });
}

export interface RedditCredentials {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    userAgent: string;
}

export interface RedditPost {
    subreddit: string;
    kind: 'self' | 'link';
    title: string;
    body?: string;
    url?: string;
    flair?: string;
}

export interface RedditComment {
    id?: string;
    parentId: string;
    subreddit: string;
    author?: string;
    body: string;
    score?: number;
}

export interface RedditSubmission {
    id: string;
    title: string;
    selftext?: string;
    url?: string;
    subreddit: string;
    author: string;
    score: number;
    num_comments: number;
    permalink: string;
    created_utc: number;
}

export interface RedditSearchResult {
    submissions: RedditSubmission[];
    total: number;
}

export interface RateLimitConfig {
    maxRequestsPerMinute: number;
    minIntervalPerSubreddit: number;
    maxPostsPerDay: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
    maxRequestsPerMinute: 30,
    minIntervalPerSubreddit: 30 * 60 * 1000,
    maxPostsPerDay: 10,
};

export interface PromotionTask {
    id: string;
    request: {
        targetSubreddit: string;
    };
    content?: {
        title: string;
        body?: string;
    };
    result?: {
        postId?: string;
        subreddit?: string;
        permalink?: string;
    };
    publishedAt?: number;
}

export interface PromotionLog {
    id: string;
    taskId: string;
    action: 'monitor' | 'publish' | 'reply' | 'error';
    details: string;
    createdAt: number;
    timestamp?: number;
}

export interface PublishResult {
    postId: string;
    permalink: string;
    subreddit: string;
}

/**
 * Post Maintainer - 帖子维护与回复管理
 *
 * Monitors published posts, tracks their performance,
 * and generates intelligent replies to comments.
 * Keeps conversations alive and engagement high.
 */

import { RedditClient, createRedditClientFromEnv } from './redditClient.js';
import { PromotionContentGenerator, contentGenerator } from './promotionContentGenerator.js';
import { PromotionTask, PromotionLog, PublishResult } from './promotionTypes.js';

// ============================================================================
// Types
// ============================================================================

export interface MonitoredPost {
    taskId: string;
    postId: string;
    subreddit: string;
    permalink: string;
    title: string;
    publishedAt: number;
    lastCheckedAt: number;
    metrics: {
        upvotes: number;
        comments: number;
        views: number;
    };
    repliedCommentIds: Set<string>;
    status: 'active' | 'stale' | 'archived';
}

export interface CommentToReply {
    commentId: string;
    postId: string;
    subreddit: string;
    author: string;
    body: string;
    score: number;
    postTitle: string;
}

export interface ReplyResult {
    commentId: string;
    replied: boolean;
    replyContent?: string;
    reason?: string;
}

export interface MaintenanceReport {
    checkedPosts: number;
    newComments: number;
    repliesSent: number;
    errors: number;
    details: Array<{
        postId: string;
        subreddit: string;
        newComments: number;
        replies: ReplyResult[];
    }>;
}

// ============================================================================
// Post Maintainer
// ============================================================================

export class PostMaintainer {
    private redditClient: RedditClient | null;
    private contentGen: PromotionContentGenerator;
    private monitoredPosts: Map<string, MonitoredPost> = new Map();
    private logs: PromotionLog[] = [];
    private isRunning = false;
    private checkInterval: ReturnType<typeof setInterval> | null = null;

    // Configuration
    private config = {
        checkIntervalMs: 30 * 60 * 1000,     // Check every 30 minutes
        maxReplyPerCheck: 5,                   // Max replies per check cycle
        minCommentScore: 1,                    // Only reply to comments with score >= 1
        maxPostAge: 7 * 24 * 60 * 60 * 1000,  // Archive posts older than 7 days
        skipAuthors: ['AutoModerator', '[deleted]'],
        replyDelay: 60_000,                    // 60s delay between replies
        maxRepliesPerPost: 10,                 // Max total replies per post
    };

    constructor(
        redditClient?: RedditClient | null,
        contentGen?: PromotionContentGenerator
    ) {
        this.redditClient = redditClient ?? createRedditClientFromEnv();
        this.contentGen = contentGen ?? contentGenerator;
    }

    // --------------------------------------------------------------------------
    // Post Registration
    // --------------------------------------------------------------------------

    /**
     * Register a published post for monitoring
     */
    registerPost(task: PromotionTask): void {
        if (!task.result?.postId || !task.content) return;

        const post: MonitoredPost = {
            taskId: task.id,
            postId: task.result.postId,
            subreddit: task.result.subreddit || task.request.targetSubreddit,
            permalink: task.result.permalink || '',
            title: task.content.title,
            publishedAt: task.publishedAt || Date.now(),
            lastCheckedAt: 0,
            metrics: { upvotes: 0, comments: 0, views: 0 },
            repliedCommentIds: new Set(),
            status: 'active',
        };

        this.monitoredPosts.set(post.postId, post);
        this.addLog(task.id, 'monitor', `Post registered for monitoring: ${post.permalink}`);
    }

    // --------------------------------------------------------------------------
    // Comment Monitoring & Reply
    // --------------------------------------------------------------------------

    /**
     * Check all monitored posts for new comments and reply
     */
    async checkAndReply(apiKey: string): Promise<MaintenanceReport> {
        if (!this.redditClient) {
            return { checkedPosts: 0, newComments: 0, repliesSent: 0, errors: 0, details: [] };
        }

        const report: MaintenanceReport = {
            checkedPosts: 0,
            newComments: 0,
            repliesSent: 0,
            errors: 0,
            details: [],
        };

        let totalReplies = 0;

        for (const [postId, post] of this.monitoredPosts) {
            // Skip archived posts
            if (post.status === 'archived') continue;

            // Archive old posts
            if (Date.now() - post.publishedAt > this.config.maxPostAge) {
                post.status = 'archived';
                this.addLog(post.taskId, 'monitor', `Post archived (too old): ${postId}`);
                continue;
            }

            // Rate limit replies
            if (totalReplies >= this.config.maxReplyPerCheck) break;

            try {
                const result = await this.checkPostComments(post, apiKey);
                report.checkedPosts++;
                report.newComments += result.newComments;
                report.repliesSent += result.replies.filter(r => r.replied).length;
                report.errors += result.replies.filter(r => !r.replied && r.reason).length;
                report.details.push(result);
                totalReplies += result.replies.filter(r => r.replied).length;

                post.lastCheckedAt = Date.now();
            } catch (error) {
                report.errors++;
                const errMsg = error instanceof Error ? error.message : String(error);
                this.addLog(post.taskId, 'error', `Failed to check post ${postId}: ${errMsg}`);
            }
        }

        return report;
    }

    /**
     * Check a single post for new comments and generate replies
     */
    private async checkPostComments(
        post: MonitoredPost,
        apiKey: string
    ): Promise<{ postId: string; subreddit: string; newComments: number; replies: ReplyResult[] }> {
        if (!this.redditClient) {
            return { postId: post.postId, subreddit: post.subreddit, newComments: 0, replies: [] };
        }

        // Fetch comments
        const comments = await this.redditClient.getPostComments(
            post.subreddit,
            post.postId,
            50
        );

        // Filter new, relevant comments
        const newComments = comments.filter(c => {
            // Skip already replied
            if (post.repliedCommentIds.has(c.id)) return false;
            // Skip bots and deleted
            if (this.config.skipAuthors.includes(c.author)) return false;
            // Skip low-score comments
            if (c.score < this.config.minCommentScore) return false;
            // Skip our own comments
            return true;
        });

        // Check reply limit per post
        if (post.repliedCommentIds.size >= this.config.maxRepliesPerPost) {
            this.addLog(post.taskId, 'monitor', `Post ${post.postId} reached max replies limit`);
            return { postId: post.postId, subreddit: post.subreddit, newComments: newComments.length, replies: [] };
        }

        // Update metrics
        post.metrics.comments = comments.length;

        const replies: ReplyResult[] = [];

        for (const comment of newComments.slice(0, 3)) { // Max 3 replies per post per check
            try {
                // Determine if we should reply
                const shouldReply = await this.shouldReplyToComment(comment, post, apiKey);
                if (!shouldReply.reply) {
                    post.repliedCommentIds.add(comment.id); // Mark as seen
                    replies.push({ commentId: comment.id, replied: false, reason: shouldReply.reason });
                    continue;
                }

                // Generate contextual reply
                const replyContent = await this.generateReply(comment, post, apiKey);
                if (!replyContent) {
                    replies.push({ commentId: comment.id, replied: false, reason: 'Empty reply generated' });
                    continue;
                }

                // Post reply
                await this.redditClient!.submitComment({
                    parentId: comment.id,
                    body: replyContent,
                    subreddit: post.subreddit,
                });

                post.repliedCommentIds.add(comment.id);
                replies.push({
                    commentId: comment.id,
                    replied: true,
                    replyContent,
                });

                this.addLog(
                    post.taskId,
                    'publish',
                    `Replied to comment by u/${comment.author} on ${post.postId}`
                );

                // Delay between replies
                await new Promise(r => setTimeout(r, this.config.replyDelay));

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                replies.push({ commentId: comment.id, replied: false, reason: errMsg });
                this.addLog(post.taskId, 'error', `Failed to reply to ${comment.id}: ${errMsg}`);
            }
        }

        return {
            postId: post.postId,
            subreddit: post.subreddit,
            newComments: newComments.length,
            replies,
        };
    }

    /**
     * Determine if a comment warrants a reply
     */
    private async shouldReplyToComment(
        comment: { body: string; author: string; score: number },
        post: MonitoredPost,
        apiKey: string
    ): Promise<{ reply: boolean; reason: string }> {
        // Quick filters
        if (comment.body.length < 10) return { reply: false, reason: 'Comment too short' };
        if (comment.body.includes('!RemindMe')) return { reply: false, reason: 'Reminder bot command' };

        // Use AI to decide
        try {
            const analysis = await this.contentGen.analyzeEngagementOpportunity(
                post.title,
                comment.body,
                post.subreddit,
                apiKey
            );
            return {
                reply: analysis.shouldEngage && analysis.relevanceScore > 40,
                reason: analysis.reason,
            };
        } catch {
            // Default to replying if AI analysis fails
            return { reply: true, reason: 'Default: AI analysis unavailable' };
        }
    }

    /**
     * Generate a contextual reply to a comment
     */
    private async generateReply(
        comment: { body: string; author: string },
        post: MonitoredPost,
        apiKey: string
    ): Promise<string | null> {
        const context = `
Original post title: "${post.title}"
Comment by u/${comment.author}: "${comment.body}"
Subreddit: r/${post.subreddit}

Generate a helpful, conversational reply that:
1. Directly addresses their point or question
2. Adds value with specific insights or information
3. If relevant, mentions Lumi's capabilities naturally
4. Keeps the conversation going
5. Stays under 150 words
        `.trim();

        try {
            const reply = await this.contentGen.generateReply(context, post.subreddit, apiKey);
            return reply.body || null;
        } catch {
            return null;
        }
    }

    // --------------------------------------------------------------------------
    // Automated Monitoring Loop
    // --------------------------------------------------------------------------

    /**
     * Start automated monitoring (checks periodically)
     */
    startMonitoring(apiKey: string): void {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log(`[PostMaintainer] Started monitoring ${this.monitoredPosts.size} posts`);

        this.checkInterval = setInterval(async () => {
            try {
                const report = await this.checkAndReply(apiKey);
                console.log(`[PostMaintainer] Check complete: ${report.checkedPosts} posts, ${report.newComments} new comments, ${report.repliesSent} replies`);
            } catch (error) {
                console.error('[PostMaintainer] Monitoring error:', error);
            }
        }, this.config.checkIntervalMs);
    }

    /**
     * Stop automated monitoring
     */
    stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('[PostMaintainer] Stopped monitoring');
    }

    // --------------------------------------------------------------------------
    // Getters
    // --------------------------------------------------------------------------

    getMonitoredPosts(): MonitoredPost[] {
        return Array.from(this.monitoredPosts.values());
    }

    getActivePostCount(): number {
        return Array.from(this.monitoredPosts.values()).filter(p => p.status === 'active').length;
    }

    getLogs(limit = 50): PromotionLog[] {
        return this.logs.slice(-limit);
    }

    // --------------------------------------------------------------------------
    // Internal
    // --------------------------------------------------------------------------

    private addLog(taskId: string, action: PromotionLog['action'], details: string): void {
        this.logs.push({
            id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            taskId,
            action,
            timestamp: Date.now(),
            createdAt: Date.now(),
            details,
        });
        if (this.logs.length > 200) this.logs = this.logs.slice(-200);
    }
}

export const postMaintainer = new PostMaintainer();

/**
 * Promotion Agent - Lumi 社交媒体推广 Agent 核心
 *
 * Orchestrates the entire promotion workflow:
 * 1. Content generation via AI
 * 2. Publishing to Reddit
 * 3. Monitoring relevant discussions
 * 4. Engaging with potential users
 * 5. Tracking promotion effectiveness
 */

import { RedditClient, createRedditClientFromEnv } from './redditClient.js';
import { PromotionContentGenerator, contentGenerator } from './promotionContentGenerator.js';
import {
    PromotionTask,
    PromotionLog,
    PromotionAnalytics,
    ContentGenerationRequest,
    TaskStatus,
    SubredditTarget,
    DEFAULT_SUBREDDIT_TARGETS,
    RedditPost,
    PublishResult,
} from './promotionTypes.js';

// ============================================================================
// Promotion Agent
// ============================================================================

export class PromotionAgent {
    private redditClient: RedditClient | null;
    private contentGen: PromotionContentGenerator;
    private tasks: Map<string, PromotionTask> = new Map();
    private logs: PromotionLog[] = [];
    private subredditTargets: SubredditTarget[];
    private isRunning = false;

    constructor(
        redditClient?: RedditClient | null,
        contentGen?: PromotionContentGenerator,
        targets?: SubredditTarget[]
    ) {
        this.redditClient = redditClient ?? createRedditClientFromEnv();
        this.contentGen = contentGen ?? contentGenerator;
        this.subredditTargets = targets ?? DEFAULT_SUBREDDIT_TARGETS;
    }

    // --------------------------------------------------------------------------
    // Task Management
    // --------------------------------------------------------------------------

    /**
     * Create a new promotion task
     */
    createTask(request: ContentGenerationRequest, scheduledAt?: number): PromotionTask {
        const task: PromotionTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            status: 'pending',
            priority: 'medium',
            request,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            scheduledAt,
            retryCount: 0,
        };

        this.tasks.set(task.id, task);
        this.addLog(task.id, 'generate', `Task created: ${request.type} for r/${request.targetSubreddit}`);
        return task;
    }

    /**
     * Generate content for a task
     */
    async generateContent(taskId: string, apiKey: string): Promise<PromotionTask> {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);

        this.updateTaskStatus(task, 'generating');
        this.addLog(taskId, 'generate', 'Starting content generation...');

        try {
            const content = await this.contentGen.generateContent(task.request, apiKey);
            task.content = content;
            this.updateTaskStatus(task, 'ready');
            this.addLog(taskId, 'generate', `Content generated: "${content.title}"`);
            return task;
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            task.error = errMsg;
            this.updateTaskStatus(task, 'failed');
            this.addLog(taskId, 'error', `Content generation failed: ${errMsg}`);
            throw error;
        }
    }

    /**
     * Publish a task's content to Reddit
     */
    async publishTask(taskId: string): Promise<PromotionTask> {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);
        if (!task.content) throw new Error(`Task ${taskId} has no content. Generate content first.`);
        if (!this.redditClient) throw new Error('Reddit client not configured. Set Reddit credentials in environment.');

        this.updateTaskStatus(task, 'publishing');
        this.addLog(taskId, 'publish', `Publishing to r/${task.request.targetSubreddit}...`);

        try {
            const post: RedditPost = {
                subreddit: task.request.targetSubreddit,
                title: task.content.title,
                body: task.content.body,
                kind: 'self',
            };

            const result = await this.redditClient.submitPost(post);

            task.result = {
                platform: 'reddit',
                postId: result.id,
                permalink: result.permalink,
                subreddit: task.request.targetSubreddit,
            };
            task.publishedAt = Date.now();
            this.updateTaskStatus(task, 'published');
            this.addLog(taskId, 'publish', `Published successfully: ${result.permalink}`);
            return task;
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            task.error = errMsg;
            task.retryCount++;
            this.updateTaskStatus(task, 'failed');
            this.addLog(taskId, 'error', `Publishing failed: ${errMsg}`);
            throw error;
        }
    }

    /**
     * Generate and publish in one step (with human review gate)
     */
    async generateAndPublish(
        request: ContentGenerationRequest,
        apiKey: string,
        options: { autoPublish?: boolean; scheduledAt?: number } = {}
    ): Promise<PromotionTask> {
        const task = this.createTask(request, options.scheduledAt);

        // Step 1: Generate content
        await this.generateContent(task.id, apiKey);

        // Step 2: Publish (only if auto-publish is enabled)
        if (options.autoPublish && !options.scheduledAt) {
            await this.publishTask(task.id);
        }

        return task;
    }

    // --------------------------------------------------------------------------
    // Monitoring & Engagement
    // --------------------------------------------------------------------------

    /**
     * Scan subreddits for engagement opportunities
     */
    async scanForOpportunities(
        apiKey: string,
        maxResults = 5
    ): Promise<Array<{
        subreddit: string;
        postTitle: string;
        postId: string;
        relevanceScore: number;
        reason: string;
    }>> {
        if (!this.redditClient) {
            console.warn('[PromotionAgent] No Reddit client configured');
            return [];
        }

        const opportunities: Array<{
            subreddit: string;
            postTitle: string;
            postId: string;
            relevanceScore: number;
            reason: string;
        }> = [];

        const searchQueries = [
            'AI keyboard',
            'personal AI assistant',
            'decision support tool',
            'intent commerce',
            'AI agent recommendation',
            'smart keyboard Android',
            'price comparison AI',
        ];

        for (const target of this.subredditTargets.slice(0, 3)) {
            try {
                // Search for relevant discussions
                const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
                const results = await this.redditClient.searchSubreddit(
                    target.name,
                    query,
                    { sort: 'new', limit: 5, timeframe: 'week' }
                );

                for (const post of results.submissions.slice(0, 3)) {
                    // Analyze if worth engaging
                    const analysis = await this.contentGen.analyzeEngagementOpportunity(
                        post.title,
                        post.selftext,
                        target.name,
                        apiKey
                    );

                    if (analysis.shouldEngage && analysis.relevanceScore > 60) {
                        opportunities.push({
                            subreddit: target.name,
                            postTitle: post.title,
                            postId: post.id,
                            relevanceScore: analysis.relevanceScore,
                            reason: analysis.reason,
                        });
                    }
                }
            } catch (error) {
                console.warn(`[PromotionAgent] Error scanning r/${target.name}:`, error);
            }

            if (opportunities.length >= maxResults) break;
        }

        // Sort by relevance
        opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return opportunities.slice(0, maxResults);
    }

    /**
     * Generate and post a reply to a specific post
     */
    async engageWithPost(
        subreddit: string,
        postId: string,
        postContent: string,
        apiKey: string
    ): Promise<{ replied: boolean; content?: string; reason?: string }> {
        if (!this.redditClient) {
            return { replied: false, reason: 'Reddit client not configured' };
        }

        try {
            const reply = await this.contentGen.generateReply(postContent, subreddit, apiKey);

            if (!reply.body || reply.body.trim().length < 20) {
                return { replied: false, reason: 'Generated reply was too short or empty' };
            }

            await this.redditClient.submitComment({
                parentId: `t3_${postId}`,
                body: reply.body,
                subreddit,
            });

            this.addLog('engagement', 'publish', `Replied to post ${postId} in r/${subreddit}`);
            return { replied: true, content: reply.body };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.addLog('engagement', 'error', `Failed to engage with ${postId}: ${errMsg}`);
            return { replied: false, reason: errMsg };
        }
    }

    // --------------------------------------------------------------------------
    // Analytics
    // --------------------------------------------------------------------------

    /**
     * Get promotion analytics summary
     */
    getAnalytics(): PromotionAnalytics {
        const publishedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'published');
        const comments = this.logs.filter(l => l.action === 'publish' && l.details.includes('Replied'));

        const subredditStats = new Map<string, { engagement: number; count: number }>();
        const contentTypeStats = new Map<string, { score: number; count: number }>();

        for (const task of publishedTasks) {
            const sub = task.result?.subreddit || '';
            const existing = subredditStats.get(sub) || { engagement: 0, count: 0 };
            existing.engagement += task.result?.metrics?.upvotes || 0;
            existing.count++;
            subredditStats.set(sub, existing);

            const type = task.request.type;
            const typeExisting = contentTypeStats.get(type) || { score: 0, count: 0 };
            typeExisting.score += task.result?.metrics?.upvotes || 0;
            typeExisting.count++;
            contentTypeStats.set(type, typeExisting);
        }

        return {
            totalPosts: publishedTasks.length,
            totalComments: comments.length,
            totalUpvotes: publishedTasks.reduce((sum, t) => sum + (t.result?.metrics?.upvotes || 0), 0),
            totalViews: publishedTasks.reduce((sum, t) => sum + (t.result?.metrics?.views || 0), 0),
            averageEngagementRate: 0,
            topPerformingSubreddits: Array.from(subredditStats.entries())
                .map(([subreddit, stats]) => ({
                    subreddit,
                    totalEngagement: stats.engagement,
                    postCount: stats.count,
                }))
                .sort((a, b) => b.totalEngagement - a.totalEngagement),
            contentTypePerformance: Array.from(contentTypeStats.entries())
                .map(([type, stats]) => ({
                    type: type as any,
                    averageScore: stats.count > 0 ? stats.score / stats.count : 0,
                    postCount: stats.count,
                })),
            dailyActivity: [],
        };
    }

    // --------------------------------------------------------------------------
    // Getters
    // --------------------------------------------------------------------------

    getAllTasks(): PromotionTask[] {
        return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    getTask(taskId: string): PromotionTask | undefined {
        return this.tasks.get(taskId);
    }

    getLogs(limit = 50): PromotionLog[] {
        return this.logs.slice(-limit);
    }

    getSubredditTargets(): SubredditTarget[] {
        return this.subredditTargets;
    }

    isRedditConfigured(): boolean {
        return this.redditClient !== null;
    }

    async checkRedditHealth(): Promise<{ ok: boolean; username?: string; error?: string }> {
        if (!this.redditClient) return { ok: false, error: 'Not configured' };
        return this.redditClient.healthCheck();
    }

    // --------------------------------------------------------------------------
    // Task status helpers
    // --------------------------------------------------------------------------

    cancelTask(taskId: string): void {
        const task = this.tasks.get(taskId);
        if (task && task.status !== 'published') {
            this.updateTaskStatus(task, 'cancelled');
            this.addLog(taskId, 'review', 'Task cancelled');
        }
    }

    markAsReviewed(taskId: string): void {
        const task = this.tasks.get(taskId);
        if (task?.content) {
            task.content.humanReviewed = true;
            task.updatedAt = Date.now();
            this.addLog(taskId, 'review', 'Content marked as human-reviewed');
        }
    }

    updateContentBody(taskId: string, newBody: string): void {
        const task = this.tasks.get(taskId);
        if (task?.content) {
            task.content.body = newBody;
            task.content.humanReviewed = true;
            task.updatedAt = Date.now();
            this.addLog(taskId, 'review', 'Content body updated manually');
        }
    }

    updateContentTitle(taskId: string, newTitle: string): void {
        const task = this.tasks.get(taskId);
        if (task?.content) {
            task.content.title = newTitle;
            task.updatedAt = Date.now();
            this.addLog(taskId, 'review', 'Content title updated manually');
        }
    }

    // --------------------------------------------------------------------------
    // Internal
    // --------------------------------------------------------------------------

    private updateTaskStatus(task: PromotionTask, status: TaskStatus): void {
        task.status = status;
        task.updatedAt = Date.now();
        this.tasks.set(task.id, task);
    }

    private addLog(taskId: string, action: PromotionLog['action'], details: string): void {
        this.logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            taskId,
            action,
            timestamp: Date.now(),
            details,
        });

        // Keep logs capped at 500
        if (this.logs.length > 500) {
            this.logs = this.logs.slice(-500);
        }
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const promotionAgent = new PromotionAgent();

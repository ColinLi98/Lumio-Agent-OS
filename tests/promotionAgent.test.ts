/**
 * Promotion Agent Tests
 *
 * Tests for the core Promotion Agent, Reddit client, and content generator.
 * Uses mocks for Reddit API calls — no actual Reddit requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionAgent } from '../services/promotionAgent';
import { PromotionContentGenerator } from '../services/promotionContentGenerator';
import { RedditClient } from '../services/redditClient';
import {
    DEFAULT_SUBREDDIT_TARGETS,
    DEFAULT_RATE_LIMIT,
    PromotionTask,
    ContentGenerationRequest,
} from '../services/promotionTypes';
import { LUMI_AGENT_CARD, generateWellKnownAgent, generateAgentCardMarkdown } from '../services/agentCard';

// ============================================================================
// Mock Reddit Client
// ============================================================================

class MockRedditClient {
    private posts: Array<{ id: string; permalink: string }> = [];

    async submitPost(post: any) {
        const id = `mock_${Date.now()}`;
        const permalink = `https://reddit.com/r/${post.subreddit}/comments/${id}`;
        this.posts.push({ id, permalink });
        return { id, permalink };
    }

    async submitComment(comment: any) {
        return { id: `comment_mock_${Date.now()}` };
    }

    async searchSubreddit(subreddit: string, query: string) {
        return {
            submissions: [
                {
                    id: 'test_post_1',
                    title: 'Looking for AI keyboard recommendations',
                    selftext: 'Any good AI-powered keyboards for Android?',
                    subreddit,
                    author: 'test_user',
                    score: 15,
                    num_comments: 3,
                    created_utc: Date.now() / 1000,
                    permalink: `/r/${subreddit}/comments/test_post_1`,
                    url: '',
                },
            ],
            total: 1,
        };
    }

    async getAccountInfo() {
        return { name: 'lumi_test_bot', karma: 100, created: Date.now() / 1000 };
    }

    async healthCheck() {
        return { ok: true, username: 'lumi_test_bot' };
    }
}

// ============================================================================
// Mock Content Generator
// ============================================================================

class MockContentGenerator extends PromotionContentGenerator {
    async generateContent(request: ContentGenerationRequest) {
        return {
            id: `promo_mock_${Date.now()}`,
            type: request.type,
            language: request.language,
            tone: request.tone,
            title: `[Mock] Test ${request.type} for r/${request.targetSubreddit}`,
            body: `This is a mock ${request.type} post about ${request.topic || 'Lumi AI'}.\n\n---\n*Lumi.AI | AI Personal Assistant*`,
            targetSubreddits: [request.targetSubreddit],
            keywords: ['AI', 'keyboard', 'lumi'],
            generatedAt: Date.now(),
            humanReviewed: false,
        };
    }

    async generateReply(parentText: string, subreddit: string) {
        return {
            body: `Great question! I've been using Lumi for this exact use case. ${parentText.slice(0, 50)}...`,
            shouldMentionLumi: true,
        };
    }

    async analyzeEngagementOpportunity(postTitle: string) {
        return {
            shouldEngage: postTitle.toLowerCase().includes('ai') || postTitle.toLowerCase().includes('keyboard'),
            engagementType: 'reply' as const,
            relevanceScore: 75,
            reason: 'Post discusses AI keyboards — relevant to Lumi',
        };
    }
}

// ============================================================================
// Tests: Promotion Agent
// ============================================================================

describe('PromotionAgent', () => {
    let agent: PromotionAgent;
    let mockReddit: MockRedditClient;
    let mockContentGen: MockContentGenerator;

    beforeEach(() => {
        mockReddit = new MockRedditClient();
        mockContentGen = new MockContentGenerator();
        agent = new PromotionAgent(
            mockReddit as any,
            mockContentGen,
            DEFAULT_SUBREDDIT_TARGETS
        );
    });

    it('should create a promotion task', () => {
        const task = agent.createTask({
            type: 'tech_review',
            language: 'en',
            tone: 'analytical',
            targetSubreddit: 'AI_Agents',
            topic: 'AI keyboards in 2026',
        });

        expect(task.id).toMatch(/^task_/);
        expect(task.status).toBe('pending');
        expect(task.request.type).toBe('tech_review');
        expect(task.request.targetSubreddit).toBe('AI_Agents');
    });

    it('should generate content for a task', async () => {
        const task = agent.createTask({
            type: 'discussion',
            language: 'en',
            tone: 'casual',
            targetSubreddit: 'artificial',
            topic: 'Future of AI agents',
        });

        const updated = await agent.generateContent(task.id, 'mock-api-key');

        expect(updated.status).toBe('ready');
        expect(updated.content).toBeDefined();
        expect(updated.content!.title).toContain('discussion');
        expect(updated.content!.body.length).toBeGreaterThan(0);
    });

    it('should publish a task to Reddit', async () => {
        const task = agent.createTask({
            type: 'tutorial',
            language: 'en',
            tone: 'casual',
            targetSubreddit: 'productivity',
        });

        await agent.generateContent(task.id, 'mock-api-key');
        const published = await agent.publishTask(task.id);

        expect(published.status).toBe('published');
        expect(published.result).toBeDefined();
        expect(published.result!.platform).toBe('reddit');
        expect(published.result!.permalink).toContain('reddit.com');
        expect(published.publishedAt).toBeDefined();
    });

    it('should fail to publish without content', async () => {
        const task = agent.createTask({
            type: 'comparison',
            language: 'en',
            tone: 'analytical',
            targetSubreddit: 'AI_Agents',
        });

        await expect(agent.publishTask(task.id)).rejects.toThrow('no content');
    });

    it('should generate and hold for review (autoPublish=false)', async () => {
        const task = await agent.generateAndPublish(
            {
                type: 'case_study',
                language: 'en',
                tone: 'professional',
                targetSubreddit: 'productivity',
            },
            'mock-api-key',
            { autoPublish: false }
        );

        expect(task.status).toBe('ready');
        expect(task.content).toBeDefined();
        expect(task.result).toBeUndefined();
    });

    it('should cancel a task', () => {
        const task = agent.createTask({
            type: 'discussion',
            language: 'en',
            tone: 'enthusiastic',
            targetSubreddit: 'singularity',
        });

        agent.cancelTask(task.id);
        const updated = agent.getTask(task.id);
        expect(updated!.status).toBe('cancelled');
    });

    it('should track analytics', async () => {
        // Create and publish two tasks
        for (const sub of ['AI_Agents', 'productivity']) {
            const task = agent.createTask({
                type: 'tech_review',
                language: 'en',
                tone: 'analytical',
                targetSubreddit: sub,
            });
            await agent.generateContent(task.id, 'mock-key');
            await agent.publishTask(task.id);
        }

        const analytics = agent.getAnalytics();
        expect(analytics.totalPosts).toBe(2);
        expect(analytics.topPerformingSubreddits.length).toBe(2);
    });

    it('should return all tasks sorted by creation time', () => {
        agent.createTask({ type: 'discussion', language: 'en', tone: 'casual', targetSubreddit: 'ai' });
        agent.createTask({ type: 'tutorial', language: 'en', tone: 'casual', targetSubreddit: 'ai' });

        const tasks = agent.getAllTasks();
        expect(tasks.length).toBe(2);
        expect(tasks[0].createdAt).toBeGreaterThanOrEqual(tasks[1].createdAt);
    });

    it('should mark content as human-reviewed', async () => {
        const task = agent.createTask({
            type: 'tech_review',
            language: 'en',
            tone: 'analytical',
            targetSubreddit: 'AI_Agents',
        });
        await agent.generateContent(task.id, 'mock-key');

        expect(agent.getTask(task.id)!.content!.humanReviewed).toBe(false);

        agent.markAsReviewed(task.id);
        expect(agent.getTask(task.id)!.content!.humanReviewed).toBe(true);
    });

    it('should allow editing content body', async () => {
        const task = agent.createTask({
            type: 'discussion',
            language: 'en',
            tone: 'casual',
            targetSubreddit: 'AI_Agents',
        });
        await agent.generateContent(task.id, 'mock-key');

        agent.updateContentBody(task.id, 'Manually edited content body');
        const updated = agent.getTask(task.id)!;
        expect(updated.content!.body).toBe('Manually edited content body');
        expect(updated.content!.humanReviewed).toBe(true);
    });

    it('should check Reddit health', async () => {
        const health = await agent.checkRedditHealth();
        expect(health.ok).toBe(true);
        expect(health.username).toBe('lumi_test_bot');
    });

    it('should report Reddit not configured when no client', async () => {
        const agentNoReddit = new PromotionAgent(null, mockContentGen);
        expect(agentNoReddit.isRedditConfigured()).toBe(false);
        const health = await agentNoReddit.checkRedditHealth();
        expect(health.ok).toBe(false);
    });

    it('should keep logs capped', () => {
        // Create many tasks to generate logs
        for (let i = 0; i < 200; i++) {
            agent.createTask({
                type: 'discussion',
                language: 'en',
                tone: 'casual',
                targetSubreddit: 'test',
            });
        }
        const logs = agent.getLogs(1000);
        expect(logs.length).toBeLessThanOrEqual(500);
    });
});

// ============================================================================
// Tests: Agent Card
// ============================================================================

describe('AgentCard', () => {
    it('should have valid agent card structure', () => {
        expect(LUMI_AGENT_CARD.name).toBe('Lumi.AI');
        expect(LUMI_AGENT_CARD.capabilities.length).toBeGreaterThan(5);
        expect(LUMI_AGENT_CARD.protocol).toBe('a2a/1.0');
        expect(LUMI_AGENT_CARD.endpoint).toContain('vercel.app');
    });

    it('should generate valid well-known agent JSON', () => {
        const wellKnown = generateWellKnownAgent();
        expect(wellKnown.schema_version).toBe('1.0');
        expect((wellKnown.agents as any[]).length).toBe(1);
        expect((wellKnown.agents as any[])[0].name).toBe('Lumi.AI');
    });

    it('should generate agent card markdown', () => {
        const md = generateAgentCardMarkdown();
        expect(md).toContain('Lumi.AI');
        expect(md).toContain('Agent Card');
        expect(md).toContain('a2a/1.0');
        expect(md).toContain('```json');
    });
});

// ============================================================================
// Tests: Default Config
// ============================================================================

describe('Default Configuration', () => {
    it('should have sensible subreddit targets', () => {
        expect(DEFAULT_SUBREDDIT_TARGETS.length).toBeGreaterThan(0);
        for (const target of DEFAULT_SUBREDDIT_TARGETS) {
            expect(target.name.length).toBeGreaterThan(0);
            expect(target.maxPostsPerWeek).toBeGreaterThan(0);
            expect(target.maxPostsPerWeek).toBeLessThanOrEqual(5);
            expect(target.preferredContentTypes.length).toBeGreaterThan(0);
        }
    });

    it('should have conservative rate limits', () => {
        expect(DEFAULT_RATE_LIMIT.maxRequestsPerMinute).toBeLessThanOrEqual(10);
        expect(DEFAULT_RATE_LIMIT.maxPostsPerDay).toBeLessThanOrEqual(10);
        expect(DEFAULT_RATE_LIMIT.minIntervalPerSubreddit).toBeGreaterThanOrEqual(12 * 60 * 60 * 1000);
    });
});

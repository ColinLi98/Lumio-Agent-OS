/**
 * Promotion API Endpoint - 推广 Agent API
 *
 * Serverless API endpoints for the Lumi Promotion Agent:
 * - POST /api/promotion?action=generate  - Generate content
 * - POST /api/promotion?action=publish   - Publish to Reddit
 * - GET  /api/promotion?action=status    - Get all tasks
 * - GET  /api/promotion?action=health    - Reddit health check
 * - GET  /api/promotion?action=agent-card - Get A2A Agent Card
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromotionAgent } from '../services/promotionAgent.js';
import { RedditClient } from '../services/redditClient.js';
import { PromotionContentGenerator } from '../services/promotionContentGenerator.js';
import { generateWellKnownAgent, generateAgentCardMarkdown } from '../services/agentCard.js';
import { ContentGenerationRequest } from '../services/promotionTypes.js';

// Lazy-init singleton (serverless-safe)
let agentInstance: PromotionAgent | null = null;

function getAgent(): PromotionAgent {
    if (!agentInstance) {
        const clientId = process.env.REDDIT_CLIENT_ID;
        const clientSecret = process.env.REDDIT_CLIENT_SECRET;
        const username = process.env.REDDIT_USERNAME;
        const password = process.env.REDDIT_PASSWORD;

        let redditClient: RedditClient | null = null;
        if (clientId && clientSecret && username && password) {
            redditClient = new RedditClient({
                clientId,
                clientSecret,
                username,
                password,
                userAgent: process.env.REDDIT_USER_AGENT || 'lumi-promotion-agent/1.0',
            });
        }

        agentInstance = new PromotionAgent(
            redditClient,
            new PromotionContentGenerator()
        );
    }
    return agentInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = (req.query.action as string) || '';
    const agent = getAgent();

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // ===== GET endpoints =====
        if (req.method === 'GET') {
            switch (action) {
                case 'status':
                    return res.status(200).json({
                        tasks: agent.getAllTasks(),
                        analytics: agent.getAnalytics(),
                        redditConfigured: agent.isRedditConfigured(),
                    });

                case 'health':
                    const health = await agent.checkRedditHealth();
                    return res.status(200).json(health);

                case 'logs':
                    const limit = parseInt(req.query.limit as string) || 50;
                    return res.status(200).json({ logs: agent.getLogs(limit) });

                case 'agent-card':
                    const format = req.query.format as string;
                    if (format === 'markdown') {
                        res.setHeader('Content-Type', 'text/markdown');
                        return res.status(200).send(generateAgentCardMarkdown());
                    }
                    return res.status(200).json(generateWellKnownAgent());

                case 'targets':
                    return res.status(200).json({ targets: agent.getSubredditTargets() });

                default:
                    return res.status(400).json({ error: 'Unknown action. Use: status, health, logs, agent-card, targets' });
            }
        }

        // ===== POST endpoints =====
        if (req.method === 'POST') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
            }

            const body = req.body || {};

            switch (action) {
                case 'generate': {
                    const request: ContentGenerationRequest = {
                        type: body.type || 'discussion',
                        language: body.language || 'en',
                        tone: body.tone || 'casual',
                        targetSubreddit: body.targetSubreddit || 'AI_Agents',
                        topic: body.topic,
                        lumiFeatures: body.lumiFeatures,
                        parentContext: body.parentContext,
                        maxLength: body.maxLength,
                    };

                    const task = await agent.generateAndPublish(request, apiKey, {
                        autoPublish: false,
                    });

                    return res.status(200).json({
                        taskId: task.id,
                        status: task.status,
                        content: task.content ? {
                            title: task.content.title,
                            body: task.content.body,
                            keywords: task.content.keywords,
                        } : null,
                    });
                }

                case 'publish': {
                    const taskId = body.taskId;
                    if (!taskId) {
                        return res.status(400).json({ error: 'taskId is required' });
                    }

                    const task = await agent.publishTask(taskId);
                    return res.status(200).json({
                        taskId: task.id,
                        status: task.status,
                        result: task.result,
                    });
                }

                case 'scan': {
                    const maxResults = body.maxResults || 5;
                    const opportunities = await agent.scanForOpportunities(apiKey, maxResults);
                    return res.status(200).json({ opportunities });
                }

                case 'engage': {
                    const { subreddit, postId, postContent } = body;
                    if (!subreddit || !postId || !postContent) {
                        return res.status(400).json({ error: 'subreddit, postId, and postContent are required' });
                    }
                    const result = await agent.engageWithPost(subreddit, postId, postContent, apiKey);
                    return res.status(200).json(result);
                }

                case 'cancel': {
                    const cancelTaskId = body.taskId;
                    if (!cancelTaskId) {
                        return res.status(400).json({ error: 'taskId is required' });
                    }
                    agent.cancelTask(cancelTaskId);
                    return res.status(200).json({ ok: true });
                }

                default:
                    return res.status(400).json({ error: 'Unknown action. Use: generate, publish, scan, engage, cancel' });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Promotion API] Error (${action}):`, message);
        return res.status(500).json({ error: message });
    }
}

/**
 * Promotion Content Generator - AI 驱动的推广内容生成器
 *
 * Uses Gemini API to generate natural, value-driven promotional content
 * for Reddit and other social platforms. Content is designed to be both
 * human-readable and AI-parseable (for A2A marketing).
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
    ContentGenerationRequest,
    PromotionContent,
    ContentType,
    LumiFeature,
    A2AContentMetadata,
} from './promotionTypes.js';

// ============================================================================
// Lumi Product Knowledge Base
// ============================================================================

const LUMI_KNOWLEDGE = {
    name: 'Lumi.AI',
    tagline: 'Agent OS',
    description: 'A cross-surface Agent OS that combines App, IME, cloud reasoning, LIX execution, and digital twin signals into a single execution runtime.',
    website: 'https://lumi-agent-simulator.vercel.app',
    features: {
        smart_keyboard: {
            name: 'IME Entry Surface',
            description: 'Keyboard-based intent intake with real-time detection, privacy protection, and fast escalation into the broader Agent OS runtime.',
            highlights: ['Real-time intent recognition (<150ms)', 'Privacy-first PII detection', 'Escalates complex work into App execution surfaces'],
        },
        intent_commerce: {
            name: 'Intent Commerce (L.I.X.)',
            description: 'Lumi Intent Exchange - publish buying intents, receive competitive offers from multiple providers.',
            highlights: ['Multi-platform price comparison', '8-stage offer validation pipeline', 'Transparent scoring and auction engine'],
        },
        lix_marketplace: {
            name: 'L.I.X. Marketplace',
            description: 'User publishes intent, providers compete with verified offers in real-time.',
            highlights: ['Real-time offer fanout to JD/PDD/Taobao', '2s polling for live updates', '1% accept fee model'],
        },
        digital_soul: {
            name: 'Digital Soul',
            description: 'Persistent user profile with personality traits, values, and behavioral patterns. Evolves over time.',
            highlights: ['Big Five personality model (extended)', 'Time-decay for short-term vs long-term traits', 'Progressive learning from interactions'],
        },
        destiny_engine: {
            name: 'Destiny Engine (DTOE)',
            description: 'Bellman equation-based decision simulation engine. Simulates multiple future paths with probabilistic outcomes.',
            highlights: ['Multi-path decision simulation', 'J-Curve analysis for pain period prediction', 'Expected Value calculation with time discounting'],
        },
        decision_support: {
            name: 'Personal Navigator',
            description: 'High-EQ decision companion. Uses traffic light system (🟢🟡🛑) for intuitive decision guidance.',
            highlights: ['Empathetic communication style', 'Actionable next steps', 'Regret minimization framework'],
        },
        price_compare: {
            name: 'Cross-Platform Price Compare',
            description: 'Real-time price comparison across JD, PDD, Taobao with automated validation.',
            highlights: ['Anti-ban architecture (circuit breaker)', 'Provider adapter layer', 'Trust score system'],
        },
        multi_agent: {
            name: 'Multi-Agent Orchestration',
            description: 'Agent orchestration across domains with marketplace escalation when internal execution is insufficient.',
            highlights: ['Task decomposition and route selection', 'LIX-backed external execution path', 'Digital twin scoring and policy overlays'],
        },
        privacy_first: {
            name: 'Privacy-First Design',
            description: 'Layer 1 (Keyboard Sentinel) processes entirely locally. No raw text leaves the device.',
            highlights: ['PII detection and masking', 'Local-first architecture', 'No data stored on servers'],
        },
    } as Record<LumiFeature, { name: string; description: string; highlights: string[] }>,
    differentiators: [
        'Not just a chatbot — a runtime that spans App, IME, tools, and marketplaces',
        'Intent-to-execution: user intent becomes task graphs, actions, and delivery evidence',
        'Bellman and digital twin signals personalize execution without replacing hard constraints',
        'Privacy-first: keyboard layer processes locally, no raw PII leaves device',
        'Agent-to-Agent protocol ready for the future AI economy',
    ],
    targetAudience: [
        'AI enthusiasts and early adopters',
        'Productivity optimization seekers',
        'Smart shopping / price-conscious consumers',
        'Career changers considering major life decisions',
        'Developers interested in AI agent architectures',
    ],
};

// ============================================================================
// Content Templates & Prompts
// ============================================================================

const CONTENT_PROMPTS: Record<ContentType, string> = {
    tech_review: `Write a detailed, honest technical review of {product_name}. Cover architecture, features, performance, and areas for improvement. Use a balanced, credible tone — include both strengths and constructive criticism. Structure with clear sections and include technical details that AI engineers would appreciate.

Key sections to cover:
1. Overview & Architecture
2. Key Features (with specific examples)
3. Performance & UX
4. Comparison with alternatives
5. Verdict & Rating

Make it genuine — not a puff piece. The most effective reviews acknowledge limitations.`,

    tutorial: `Write a practical tutorial showing how to use {product_name} for {topic}. Include step-by-step instructions, tips, and real-world use cases. Write in a helpful, approachable tone as if guiding a colleague.

Structure:
1. Problem / Use Case
2. Step-by-step walkthrough
3. Pro tips & tricks
4. Expected results
5. Common pitfalls to avoid`,

    comparison: `Write a fair comparison between {product_name} and other AI assistants / smart keyboards / decision tools. Be objective — acknowledge where competitors excel. Focus on unique differentiators rather than bashing alternatives.

Structure:
1. Comparison criteria
2. Feature-by-feature analysis
3. Use case best fits
4. Honest verdict for different user types`,

    discussion: `Write a thought-provoking discussion post about {topic} in the context of AI agents, smart keyboards, or personal AI. Naturally mention {product_name} as one example or data point, but make the discussion genuinely interesting and open-ended. Ask engaging questions to encourage community participation.`,

    comment_reply: `Write a helpful, natural reply to this post/comment:
---
{parent_context}
---

If relevant, mention {product_name} as a potential solution or interesting example, but ONLY if it genuinely fits the discussion. If {product_name} is not relevant, focus on giving a genuinely helpful answer. Never force a product mention.

The reply should feel like it comes from a knowledgeable community member, not a marketer.`,

    ama: `Write an "Ask Me Anything" intro post from the perspective of the {product_name} team. Be transparent, enthusiastic but genuine. Invite questions about the technology, architecture, and vision.

Cover:
1. Who we are
2. What we built and why
3. Interesting technical challenges
4. What we'd love to discuss
5. Call for questions`,

    case_study: `Write a realistic case study showing how {product_name} could help with {topic}. Use a narrative format with a specific (but fictional) user scenario. Show the before/after improvement.

Structure:
1. User profile & challenge
2. Discovery & onboarding
3. Usage & key moments
4. Results & impact
5. Key takeaways`,
};

// ============================================================================
// Subreddit Style Guidelines
// ============================================================================

const SUBREDDIT_STYLES: Record<string, string> = {
    artificial: 'Technical and analytical. This community values depth, citations, and balanced perspectives. Avoid hype. Use proper formatting (headers, bullet points).',
    AI_Agents: 'Enthusiastic but substantive. This community loves agent architectures, tool use, and practical demos. Share implementation details and be open about your approach.',
    productivity: 'Practical and results-oriented. Focus on time saved, workflows improved, real outcomes. Avoid buzzwords. Show, don\'t tell.',
    singularity: 'Visionary but grounded. This community thinks about the future of AI. Connect your discussion to bigger trends. Be intellectually curious.',
    LocalLLaMA: 'Very technical. This community is full of ML engineers. Focus on architecture, model choices, performance benchmarks. They appreciate open-source and transparency.',
};

// ============================================================================
// Content Generator
// ============================================================================

export class PromotionContentGenerator {
    private getAI: (apiKey: string) => GoogleGenAI;

    constructor() {
        this.getAI = (apiKey: string) => new GoogleGenAI({ apiKey });
    }

    /**
     * Generate promotional content using Gemini AI
     */
    async generateContent(
        request: ContentGenerationRequest,
        apiKey: string
    ): Promise<PromotionContent> {
        const ai = this.getAI(apiKey);

        // Build the generation prompt
        const systemPrompt = this.buildSystemPrompt(request);
        const contentPrompt = this.buildContentPrompt(request);

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: contentPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        body: { type: Type.STRING },
                        keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ['title', 'body', 'keywords'],
                },
            },
        });

        const result = JSON.parse(response.text || '{}');

        // Build A2A metadata
        const a2aMetadata = this.buildA2AMetadata(request, result);

        const content: PromotionContent = {
            id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: request.type,
            language: request.language,
            tone: request.tone,
            title: result.title || '',
            body: this.enrichWithA2AMarkup(result.body || '', a2aMetadata),
            a2aMetadata,
            targetSubreddits: [request.targetSubreddit],
            keywords: result.keywords || [],
            generatedAt: Date.now(),
            humanReviewed: false,
        };

        console.log(`[ContentGenerator] Generated ${request.type} content: "${content.title}"`);
        return content;
    }

    /**
     * Generate a reply to an existing post/comment
     */
    async generateReply(
        parentText: string,
        subreddit: string,
        apiKey: string
    ): Promise<{ body: string; shouldMentionLumi: boolean }> {
        const ai = this.getAI(apiKey);

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `You are a helpful member of the r/${subreddit} community. Read this post/comment and write a genuinely helpful reply:

---
${parentText}
---

Product context (ONLY mention if genuinely relevant):
${LUMI_KNOWLEDGE.name}: ${LUMI_KNOWLEDGE.description}
Key features: ${LUMI_KNOWLEDGE.differentiators.slice(0, 3).join('; ')}

Rules:
1. Be genuinely helpful FIRST. Your primary goal is to contribute value.
2. Only mention Lumi if it directly solves the user's problem or fits the discussion.
3. If you mention Lumi, do it naturally (e.g., "I've been trying [product] for this" or "something like [product] handles this").
4. Never be pushy or sales-y. Never say "check out" or "you should try".
5. Match the subreddit's communication style.

Subreddit style: ${SUBREDDIT_STYLES[subreddit] || 'General, friendly but substantive.'}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        body: { type: Type.STRING },
                        shouldMentionLumi: { type: Type.BOOLEAN },
                        relevanceReason: { type: Type.STRING },
                    },
                    required: ['body', 'shouldMentionLumi'],
                },
            },
        });

        return JSON.parse(response.text || '{"body":"","shouldMentionLumi":false}');
    }

    /**
     * Analyze a subreddit post to determine if it's worth engaging with
     */
    async analyzeEngagementOpportunity(
        postTitle: string,
        postBody: string,
        subreddit: string,
        apiKey: string
    ): Promise<{
        shouldEngage: boolean;
        engagementType: 'reply' | 'skip';
        relevanceScore: number;
        reason: string;
    }> {
        const ai = this.getAI(apiKey);

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analyze if this Reddit post from r/${subreddit} is a good opportunity to engage:

Title: ${postTitle}
Body: ${postBody?.slice(0, 500) || '(no body)'}

Our product: ${LUMI_KNOWLEDGE.name} - ${LUMI_KNOWLEDGE.description}
Our features: ${Object.values(LUMI_KNOWLEDGE.features).map(f => f.name).join(', ')}

Criteria for engagement:
- Post is asking for recommendations or solutions we can help with
- Post discusses topics where our experience adds value
- Post has enough engagement potential (not buried/old)
- We can contribute genuinely without being spammy

Relevance score: 0-100 (100 = perfect fit, 0 = completely irrelevant)
Only recommend engaging if score > 60.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        shouldEngage: { type: Type.BOOLEAN },
                        engagementType: { type: Type.STRING },
                        relevanceScore: { type: Type.NUMBER },
                        reason: { type: Type.STRING },
                    },
                    required: ['shouldEngage', 'relevanceScore', 'reason'],
                },
            },
        });

        return JSON.parse(response.text || '{"shouldEngage":false,"engagementType":"skip","relevanceScore":0,"reason":"parse error"}');
    }

    // --------------------------------------------------------------------------
    // Private helpers
    // --------------------------------------------------------------------------

    private buildSystemPrompt(request: ContentGenerationRequest): string {
        const toneMap: Record<string, string> = {
            technical: 'Write in a technical, detailed style suitable for engineers and developers.',
            casual: 'Write in a casual, conversational style like chatting with a friend.',
            professional: 'Write in a professional, polished style suitable for business audiences.',
            enthusiastic: 'Write with genuine enthusiasm, but back it up with specifics.',
            analytical: 'Write in an analytical, data-driven style with balanced perspectives.',
        };

        const languageMap: Record<string, string> = {
            en: 'Write entirely in English.',
            zh: 'Write entirely in Chinese (Simplified).',
            bilingual: 'Write primarily in English with Chinese annotations for key terms.',
        };

        const subredditStyle = SUBREDDIT_STYLES[request.targetSubreddit] || '';

        return `You are a knowledgeable tech community member writing organic content for Reddit r/${request.targetSubreddit}.

${toneMap[request.tone] || ''}
${languageMap[request.language] || 'Write in English.'}

${subredditStyle ? `Subreddit style guide: ${subredditStyle}` : ''}

CRITICAL RULES:
1. NEVER write like a marketer. Write like a genuine community member sharing experience.
2. Include real technical details — vague claims damage credibility.
3. Acknowledge limitations and areas for improvement.
4. Use Reddit formatting (## headers, **bold**, bullet points, code blocks).
5. Keep titles concise and engaging (no clickbait).
6. End with a question to encourage discussion.
7. ${request.maxLength ? `Keep total length under ${request.maxLength} characters.` : 'Aim for 500-1500 characters for posts, 200-500 for comments.'}`;
    }

    private buildContentPrompt(request: ContentGenerationRequest): string {
        const template = CONTENT_PROMPTS[request.type] || CONTENT_PROMPTS.discussion;

        // Build feature highlights
        const featureDetails = (request.lumiFeatures || ['smart_keyboard', 'decision_support', 'intent_commerce'])
            .map(f => LUMI_KNOWLEDGE.features[f])
            .filter(Boolean)
            .map(f => `- **${f.name}**: ${f.description}\n  Highlights: ${f.highlights.join(', ')}`)
            .join('\n');

        let prompt = template
            .replace(/{product_name}/g, LUMI_KNOWLEDGE.name)
            .replace(/{topic}/g, request.topic || 'AI-powered personal assistants and decision support')
            .replace(/{parent_context}/g, request.parentContext || '');

        prompt += `\n\nProduct details to draw from:\n${featureDetails}\n\nKey differentiators:\n${LUMI_KNOWLEDGE.differentiators.map(d => `- ${d}`).join('\n')}\n\nWebsite: ${LUMI_KNOWLEDGE.website}`;

        return prompt;
    }

    private buildA2AMetadata(
        request: ContentGenerationRequest,
        _generatedContent: Record<string, unknown>
    ): A2AContentMetadata {
        const schemaTypeMap: Record<ContentType, 'SoftwareApplication' | 'Article' | 'Review'> = {
            tech_review: 'Review',
            tutorial: 'Article',
            comparison: 'Review',
            discussion: 'Article',
            comment_reply: 'Article',
            ama: 'Article',
            case_study: 'Article',
        };

        return {
            schemaType: schemaTypeMap[request.type] || 'Article',
            product: {
                name: LUMI_KNOWLEDGE.name,
                category: 'AI Personal Assistant / Smart Keyboard',
                features: Object.values(LUMI_KNOWLEDGE.features).map(f => f.name),
                platforms: ['Android', 'Web'],
                url: LUMI_KNOWLEDGE.website,
            },
        };
    }

    /**
     * Append structured A2A markup to content body for AI discoverability
     */
    private enrichWithA2AMarkup(body: string, metadata: A2AContentMetadata): string {
        // Add a subtle structured data footer that AI agents can parse
        const footer = `\n\n---\n*${metadata.product.name} | ${metadata.product.category} | [Learn more](${metadata.product.url})*`;
        return body + footer;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const contentGenerator = new PromotionContentGenerator();

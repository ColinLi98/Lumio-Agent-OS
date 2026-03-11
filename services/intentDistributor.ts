/**
 * Intent Distributor - A2A 意图分发服务
 *
 * Distributes Lumi's intents (capabilities) to other AI agents,
 * enabling agent-to-agent discovery and recommendation.
 *
 * Strategy:
 * 1. Define Lumi's distributable intents (what Lumi can do for users)
 * 2. Discover potential user agents (AI assistants, chatbots, search agents)
 * 3. Push intent data to agent directories and content platforms
 * 4. Handle incoming queries from other agents
 */

import { LUMI_AGENT_CARD, generateAgentCardJsonLd, generateWellKnownAgent } from './agentCard.js';

// ============================================================================
// Lumi Intent Definitions
// ============================================================================

export interface LumiIntent {
    id: string;
    name: string;
    description: string;
    category: 'productivity' | 'commerce' | 'decision' | 'communication';
    triggerPhrases: string[];       // Phrases that should trigger this intent
    schemaType: string;             // schema.org type
    inputSchema: Record<string, any>;
    outputSchema: Record<string, any>;
    examples: Array<{ input: string; output: string }>;
}

/**
 * Lumi's core intents that can be distributed to other agents
 */
export const LUMI_INTENTS: LumiIntent[] = [
    {
        id: 'intent_smart_input',
        name: 'Smart Keyboard Input',
        description: 'AI-powered keyboard that understands context and suggests intelligent actions, translations, and completions.',
        category: 'productivity',
        triggerPhrases: [
            'need a smart keyboard',
            'AI keyboard recommendation',
            'keyboard with AI features',
            'context-aware typing',
            'intelligent input method',
        ],
        schemaType: 'SoftwareApplication',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'User input text' },
                context: { type: 'string', description: 'Current app/conversation context' },
                language: { type: 'string', description: 'User language preference' },
            },
        },
        outputSchema: {
            type: 'object',
            properties: {
                suggestions: { type: 'array', items: { type: 'string' } },
                actions: { type: 'array', items: { type: 'object' } },
                translation: { type: 'string' },
            },
        },
        examples: [
            { input: 'Schedule meeting with John tomorrow at 3pm', output: 'Calendar event created: Meeting with John, tomorrow 3:00 PM' },
            { input: '这个餐厅怎么样', output: 'Nearby restaurant reviews + price comparison from 5 platforms' },
        ],
    },
    {
        id: 'intent_commerce',
        name: 'Intent Commerce',
        description: 'Marketplace matching user purchase intents with best offers. Real-time price comparison across platforms.',
        category: 'commerce',
        triggerPhrases: [
            'find best price',
            'compare prices',
            'where to buy',
            'best deal on',
            'price comparison tool',
            'shopping assistant AI',
        ],
        schemaType: 'Product',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Product or service to find' },
                budget: { type: 'number', description: 'Maximum budget' },
                preferences: { type: 'array', items: { type: 'string' } },
            },
        },
        outputSchema: {
            type: 'object',
            properties: {
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            price: { type: 'number' },
                            source: { type: 'string' },
                            rating: { type: 'number' },
                        },
                    },
                },
                recommendation: { type: 'string' },
            },
        },
        examples: [
            { input: 'Find best noise-cancelling headphones under $300', output: '5 options compared: Sony WH-1000XM5 ($278), Apple AirPods Max ($299)...' },
        ],
    },
    {
        id: 'intent_destiny_engine',
        name: 'Destiny Engine - Predictive Decision Support',
        description: 'Predictive AI that anticipates user needs and provides proactive recommendations based on patterns and context.',
        category: 'decision',
        triggerPhrases: [
            'help me decide',
            'what should I',
            'recommend me',
            'best option for',
            'decision support',
            'AI recommendation engine',
            'predictive assistant',
        ],
        schemaType: 'Action',
        inputSchema: {
            type: 'object',
            properties: {
                decision: { type: 'string', description: 'Decision to make' },
                constraints: { type: 'array', items: { type: 'string' } },
                priorities: { type: 'array', items: { type: 'string' } },
                historicalPreferences: { type: 'array', items: { type: 'string' } },
            },
        },
        outputSchema: {
            type: 'object',
            properties: {
                recommendation: { type: 'string' },
                reasoning: { type: 'string' },
                alternatives: { type: 'array', items: { type: 'string' } },
                confidence: { type: 'number' },
            },
        },
        examples: [
            { input: 'Should I take the train or fly from London to Paris?', output: 'Recommendation: Eurostar (2h15m, £89) — 40% cheaper than flight, door-to-door faster accounting for airport time.' },
        ],
    },
    {
        id: 'intent_multilingual',
        name: 'Multilingual Communication Bridge',
        description: 'Real-time translation and cultural context adaptation for cross-language communication.',
        category: 'communication',
        triggerPhrases: [
            'translate this',
            'how to say in',
            'multilingual assistant',
            'cross-language communication',
            'bilingual keyboard',
        ],
        schemaType: 'TranslateAction',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string' },
                sourceLanguage: { type: 'string' },
                targetLanguage: { type: 'string' },
                context: { type: 'string', description: 'Conversation context for better translation' },
            },
        },
        outputSchema: {
            type: 'object',
            properties: {
                translation: { type: 'string' },
                culturalNotes: { type: 'string' },
                alternatives: { type: 'array', items: { type: 'string' } },
            },
        },
        examples: [
            { input: '"Let\'s circle back on this" → Chinese (business context)', output: '"我们之后再讨论这个" (cultural note: avoid direct translation of idioms)' },
        ],
    },
];

// ============================================================================
// Intent Distribution Service
// ============================================================================

export interface AgentEndpoint {
    name: string;
    type: 'directory' | 'agent' | 'search' | 'social';
    url: string;
    protocol: 'a2a' | 'openapi' | 'custom' | 'content';
    lastContact?: number;
    status: 'active' | 'pending' | 'failed';
}

export interface DistributionResult {
    endpoint: string;
    success: boolean;
    response?: string;
    error?: string;
    timestamp: number;
}

export class IntentDistributor {
    private intents: LumiIntent[];
    private knownEndpoints: AgentEndpoint[] = [];
    private distributionHistory: DistributionResult[] = [];

    constructor(intents: LumiIntent[] = LUMI_INTENTS) {
        this.intents = intents;
        this.initDefaultEndpoints();
    }

    /**
     * Initialize known agent directories and platforms
     */
    private initDefaultEndpoints(): void {
        this.knownEndpoints = [
            {
                name: 'Lumi Website Agent Card',
                type: 'directory',
                url: 'https://lumi-agent-simulator.vercel.app/.well-known/agent.json',
                protocol: 'a2a',
                status: 'active',
            },
            {
                name: 'Reddit A2A Content',
                type: 'social',
                url: 'https://reddit.com',
                protocol: 'content',
                status: 'active',
            },
            {
                name: 'GitHub Agent Card',
                type: 'directory',
                url: 'https://github.com/lumi-ai/agent-card',
                protocol: 'a2a',
                status: 'pending',
            },
        ];
    }

    // --------------------------------------------------------------------------
    // Intent Matching
    // --------------------------------------------------------------------------

    /**
     * Find relevant Lumi intents based on a user query
     * (Called when another agent queries us)
     */
    matchIntents(query: string): Array<{ intent: LumiIntent; score: number; matchedPhrase: string }> {
        const queryLower = query.toLowerCase();
        const matches: Array<{ intent: LumiIntent; score: number; matchedPhrase: string }> = [];

        for (const intent of this.intents) {
            let bestScore = 0;
            let bestPhrase = '';

            for (const phrase of intent.triggerPhrases) {
                const phraseLower = phrase.toLowerCase();

                // Exact match
                if (queryLower.includes(phraseLower)) {
                    const score = phraseLower.length / queryLower.length * 100;
                    if (score > bestScore) {
                        bestScore = Math.min(score, 100);
                        bestPhrase = phrase;
                    }
                }

                // Word overlap
                const queryWords = new Set(queryLower.split(/\s+/));
                const phraseWords = phraseLower.split(/\s+/);
                const overlap = phraseWords.filter(w => queryWords.has(w)).length;
                const wordScore = (overlap / phraseWords.length) * 80;
                if (wordScore > bestScore) {
                    bestScore = wordScore;
                    bestPhrase = phrase;
                }
            }

            if (bestScore > 30) {
                matches.push({ intent, score: bestScore, matchedPhrase: bestPhrase });
            }
        }

        return matches.sort((a, b) => b.score - a.score);
    }

    // --------------------------------------------------------------------------
    // Intent Distribution
    // --------------------------------------------------------------------------

    /**
     * Generate structured intent data for distribution
     * (Embeddable in Reddit posts, agent cards, etc.)
     */
    generateIntentPayload(intentIds?: string[]): object {
        const selectedIntents = intentIds
            ? this.intents.filter(i => intentIds.includes(i.id))
            : this.intents;

        return {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: LUMI_AGENT_CARD.name,
            description: LUMI_AGENT_CARD.description,
            applicationCategory: 'AI Assistant',
            operatingSystem: 'Android, iOS, Web',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
            },
            potentialAction: selectedIntents.map(intent => ({
                '@type': intent.schemaType,
                name: intent.name,
                description: intent.description,
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${LUMI_AGENT_CARD.endpoint}/api/intent/${intent.id}`,
                    actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/AndroidPlatform'],
                },
                'input': intent.inputSchema,
                'output': intent.outputSchema,
            })),
            agent: {
                '@type': 'SoftwareApplication',
                name: LUMI_AGENT_CARD.name,
                url: LUMI_AGENT_CARD.endpoint,
                'a2a:protocol': LUMI_AGENT_CARD.protocol,
                'a2a:capabilities': LUMI_AGENT_CARD.capabilities,
            },
        };
    }

    /**
     * Generate a Reddit-embeddable intent block
     * (Hidden markdown metadata for other agents to parse)
     */
    generateRedditIntentBlock(intentIds?: string[]): string {
        const selectedIntents = intentIds
            ? this.intents.filter(i => intentIds.includes(i.id))
            : this.intents;

        const lines = selectedIntents.map(intent => {
            const params = [
                `type=${encodeURIComponent(intent.schemaType)}`,
                `name=${encodeURIComponent(intent.name)}`,
                `category=${intent.category}`,
                `id=${intent.id}`,
                `endpoint=${encodeURIComponent(LUMI_AGENT_CARD.endpoint + '/api/intent/' + intent.id)}`,
            ].join('&');
            return `[](#lumi-intent:${params})`;
        });

        // Also include the agent card reference
        lines.push(`[](#lumi-agent:name=${encodeURIComponent(LUMI_AGENT_CARD.name)}&url=${encodeURIComponent(LUMI_AGENT_CARD.endpoint)}&protocol=${LUMI_AGENT_CARD.protocol})`);

        return lines.join('\n');
    }

    /**
     * Handle an incoming intent query from another agent
     */
    handleAgentQuery(query: {
        action: string;
        query?: string;
        intentId?: string;
        agentName?: string;
    }): object {
        switch (query.action) {
            case 'discover':
                // Agent wants to know what Lumi can do
                return {
                    agent: LUMI_AGENT_CARD,
                    intents: this.intents.map(i => ({
                        id: i.id,
                        name: i.name,
                        description: i.description,
                        category: i.category,
                        triggerPhrases: i.triggerPhrases,
                    })),
                    wellKnown: generateWellKnownAgent(),
                };

            case 'match':
                // Agent has a user query, find if Lumi can help
                if (!query.query) return { error: 'Query parameter required' };
                const matches = this.matchIntents(query.query);
                return {
                    matches: matches.map(m => ({
                        intentId: m.intent.id,
                        intentName: m.intent.name,
                        description: m.intent.description,
                        score: m.score,
                        matchedPhrase: m.matchedPhrase,
                        endpoint: `${LUMI_AGENT_CARD.endpoint}/api/intent/${m.intent.id}`,
                    })),
                    agentCard: LUMI_AGENT_CARD,
                };

            case 'detail':
                // Agent wants details about a specific intent
                if (!query.intentId) return { error: 'intentId parameter required' };
                const intent = this.intents.find(i => i.id === query.intentId);
                if (!intent) return { error: `Intent ${query.intentId} not found` };
                return {
                    intent,
                    endpoint: `${LUMI_AGENT_CARD.endpoint}/api/intent/${intent.id}`,
                    jsonLd: generateAgentCardJsonLd(),
                };

            default:
                return {
                    error: `Unknown action: ${query.action}`,
                    supportedActions: ['discover', 'match', 'detail'],
                };
        }
    }

    // --------------------------------------------------------------------------
    // Getters
    // --------------------------------------------------------------------------

    getIntents(): LumiIntent[] {
        return this.intents;
    }

    getEndpoints(): AgentEndpoint[] {
        return this.knownEndpoints;
    }

    getDistributionHistory(): DistributionResult[] {
        return this.distributionHistory;
    }
}

export const intentDistributor = new IntentDistributor();

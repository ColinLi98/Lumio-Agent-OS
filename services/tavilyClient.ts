/**
 * Tavily Search API Client
 * 
 * Tavily is an AI-native search API that provides real-time web search results
 * optimized for AI agents and RAG systems.
 * 
 * API Docs: https://docs.tavily.com/
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';

// Default API key for development
const DEFAULT_TAVILY_API_KEY = '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';

export interface TavilySearchRequest {
    query: string;
    search_depth?: 'basic' | 'advanced';  // basic is faster, advanced is more thorough
    include_answer?: boolean;  // Include AI-generated answer
    include_raw_content?: boolean;  // Include raw HTML content
    include_images?: boolean;  // Include image URLs
    max_results?: number;  // 1-10, default 5
    include_domains?: string[];  // Limit to specific domains
    exclude_domains?: string[];  // Exclude specific domains
}

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;  // Snippet of the page content
    score: number;  // Relevance score
    raw_content?: string;  // Full HTML if requested
}

export interface TavilySearchResponse {
    query: string;
    answer?: string;  // AI-generated answer if requested
    results: TavilySearchResult[];
    images?: string[];  // Image URLs if requested
    response_time: number;  // Time in seconds
}

export class TavilyClient {
    private apiKey: string;

    constructor(apiKey: string = DEFAULT_TAVILY_API_KEY) {
        this.apiKey = apiKey;
    }

    async search(request: TavilySearchRequest): Promise<TavilySearchResponse> {
        console.log(`[Tavily] Searching: "${request.query}"`);

        const response = await fetch(TAVILY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: this.apiKey,
                query: request.query,
                search_depth: request.search_depth || 'basic',
                include_answer: request.include_answer ?? true,
                include_raw_content: request.include_raw_content ?? false,
                include_images: request.include_images ?? false,
                max_results: request.max_results || 5,
                include_domains: request.include_domains,
                exclude_domains: request.exclude_domains
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Tavily] API Error:', response.status, errorText);
            throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Tavily] Got ${data.results?.length || 0} results in ${data.response_time}s`);

        return data as TavilySearchResponse;
    }

    /**
     * Quick search with AI answer - optimized for agents
     */
    async quickSearch(query: string, maxResults: number = 5): Promise<{
        answer: string;
        sources: { title: string; url: string; snippet: string }[];
    }> {
        const response = await this.search({
            query,
            search_depth: 'basic',
            include_answer: true,
            max_results: maxResults
        });

        return {
            answer: response.answer || '未找到相关答案',
            sources: response.results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.content
            }))
        };
    }

    /**
     * Deep search for complex queries
     */
    async deepSearch(query: string): Promise<TavilySearchResponse> {
        return this.search({
            query,
            search_depth: 'advanced',
            include_answer: true,
            max_results: 10,
            include_images: true
        });
    }
}

// Singleton instance
let tavilyClient: TavilyClient | null = null;

export function getTavilyClient(apiKey?: string): TavilyClient {
    if (!tavilyClient || apiKey) {
        tavilyClient = new TavilyClient(apiKey || DEFAULT_TAVILY_API_KEY);
    }
    return tavilyClient;
}

export function setTavilyApiKey(apiKey: string): void {
    tavilyClient = new TavilyClient(apiKey);
    console.log('[Tavily] Client initialized with custom API key');
}

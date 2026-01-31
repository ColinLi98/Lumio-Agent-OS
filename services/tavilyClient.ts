/**
 * Tavily Search API Client
 * 
 * Uses a Vercel serverless function proxy to bypass CORS restrictions.
 * The proxy is at /api/tavily-search
 */

// Use relative URL for the proxy - works both locally and on Vercel
const TAVILY_PROXY_URL = '/api/tavily-search';

export interface TavilySearchRequest {
    query: string;
    search_depth?: 'basic' | 'advanced';
    max_results?: number;
}

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

export interface TavilySearchResponse {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
    response_time: number;
}

export class TavilyClient {
    /**
     * Search via the proxy endpoint
     */
    async search(request: TavilySearchRequest): Promise<TavilySearchResponse> {
        console.log(`[Tavily] Searching via proxy: "${request.query}"`);

        const response = await fetch(TAVILY_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: request.query,
                search_depth: request.search_depth || 'basic',
                max_results: request.max_results || 5
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Tavily] Proxy Error:', response.status, errorText);
            throw new Error(`Tavily proxy error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Tavily] Got ${data.results?.length || 0} results`);

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
            max_results: 10
        });
    }
}

// Singleton instance
let tavilyClient: TavilyClient | null = null;

export function getTavilyClient(): TavilyClient {
    if (!tavilyClient) {
        tavilyClient = new TavilyClient();
    }
    return tavilyClient;
}

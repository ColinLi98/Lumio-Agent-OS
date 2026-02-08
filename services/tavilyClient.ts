/**
 * Tavily Search API Client
 * 
 * Uses a Vercel serverless function proxy to bypass CORS restrictions.
 * The proxy is at /api/tavily-search
 */
import { buildApiUrl } from './apiBaseUrl';

const TAVILY_PROXY_URL = buildApiUrl('/api/tavily-search');
const DEFAULT_TAVILY_TIMEOUT_MS = 6000;

function getTavilyTimeoutMs(): number {
    const raw = Number(process.env.TAVILY_PROXY_TIMEOUT_MS || process.env.VITE_TAVILY_PROXY_TIMEOUT_MS || DEFAULT_TAVILY_TIMEOUT_MS);
    if (!Number.isFinite(raw)) return DEFAULT_TAVILY_TIMEOUT_MS;
    return Math.max(1000, Math.min(20000, Math.floor(raw)));
}

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

        const timeoutMs = getTavilyTimeoutMs();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;
        try {
            response = await fetch(TAVILY_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: request.query,
                    search_depth: request.search_depth || 'basic',
                    max_results: request.max_results || 5
                }),
                signal: controller.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Tavily proxy timeout after ${timeoutMs}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }

        const rawText = await response.text();

        if (!response.ok) {
            const errorText = rawText.slice(0, 500);
            console.error('[Tavily] Proxy Error:', response.status, errorText);
            throw new Error(`Tavily proxy error: ${response.status} - ${errorText}`);
        }

        let data: any;
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            throw new Error('Tavily proxy returned non-JSON response');
        }

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

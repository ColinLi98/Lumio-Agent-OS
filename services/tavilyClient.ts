/**
 * Tavily Search API Client
 * 
 * Uses a Vercel serverless function proxy to bypass CORS restrictions.
 * The proxy is at /api/tavily-search
 */
import { buildApiUrl } from './apiBaseUrl.js';

const TAVILY_DIRECT_URL = 'https://api.tavily.com/search';
const DEFAULT_TAVILY_TIMEOUT_MS = 6000;
const REMOTE_PROXY_URL = 'https://lumi-agent-simulator.vercel.app/api/tavily-search';

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

function getTavilyApiKey(): string | undefined {
    if (typeof process === 'undefined' || !process.env) return undefined;
    const key = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY || process.env.VITE_TAVILY_API_KEY;
    return key ? String(key).trim() : undefined;
}

function getProxyCandidates(): string[] {
    const primary = buildApiUrl('/api/tavily-search');
    const candidates = [primary];
    if ((primary.includes('127.0.0.1') || primary.includes('localhost')) && primary !== REMOTE_PROXY_URL) {
        candidates.push(REMOTE_PROXY_URL);
    }
    return Array.from(new Set(candidates));
}

export class TavilyClient {
    private async fetchJsonWithTimeout(url: string, body: Record<string, any>, timeoutMs: number): Promise<any> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            const rawText = await response.text();
            if (!response.ok) {
                const errorText = rawText.slice(0, 500);
                throw new Error(`HTTP_${response.status}: ${errorText}`);
            }

            try {
                return rawText ? JSON.parse(rawText) : {};
            } catch {
                throw new Error('non_json_response');
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`timeout_${timeoutMs}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Search via the proxy endpoint
     */
    async search(request: TavilySearchRequest): Promise<TavilySearchResponse> {
        const timeoutMs = getTavilyTimeoutMs();
        const proxyBody = {
            query: request.query,
            search_depth: request.search_depth || 'basic',
            max_results: request.max_results || 5
        };

        let lastError: Error | null = null;
        for (const proxyUrl of getProxyCandidates()) {
            try {
                console.log(`[Tavily] Searching via proxy (${proxyUrl}): "${request.query}"`);
                const data = await this.fetchJsonWithTimeout(proxyUrl, proxyBody, timeoutMs);
                console.log(`[Tavily] Got ${data.results?.length || 0} results`);
                return data as TavilySearchResponse;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`[Tavily] Proxy failed (${proxyUrl}): ${lastError.message}`);
            }
        }

        // Server-side fallback: direct Tavily call when proxy is unavailable.
        if (typeof window === 'undefined') {
            const apiKey = getTavilyApiKey();
            if (apiKey) {
                try {
                    console.log('[Tavily] Falling back to direct API');
                    const data = await this.fetchJsonWithTimeout(
                        TAVILY_DIRECT_URL,
                        {
                            api_key: apiKey,
                            query: request.query,
                            search_depth: request.search_depth || 'basic',
                            include_answer: true,
                            include_raw_content: false,
                            include_images: false,
                            max_results: request.max_results || 5,
                        },
                        timeoutMs
                    );
                    console.log(`[Tavily] Direct API got ${data.results?.length || 0} results`);
                    return data as TavilySearchResponse;
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    console.warn(`[Tavily] Direct API fallback failed: ${lastError.message}`);
                }
            }
        }

        throw lastError || new Error('tavily_search_failed');
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

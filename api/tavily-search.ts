// Vercel Serverless Function to proxy Tavily API requests
// This bypasses CORS restrictions by making server-side calls

import type { VercelRequest, VercelResponse } from '@vercel/node';

const TAVILY_API_URL = 'https://api.tavily.com/search';
const TAVILY_API_KEY = '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';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const body = req.body || {};
        const { query, search_depth = 'basic', max_results = 5 } = body;

        if (!query) {
            res.status(400).json({ error: 'Query is required' });
            return;
        }

        console.log(`[Tavily Proxy] Searching: "${query}"`);

        // Call Tavily API
        const tavilyResponse = await fetch(TAVILY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query,
                search_depth,
                include_answer: true,
                include_raw_content: false,
                include_images: false,
                max_results,
            }),
        });

        if (!tavilyResponse.ok) {
            const errorText = await tavilyResponse.text();
            console.error('[Tavily Proxy] API Error:', tavilyResponse.status, errorText);
            res.status(tavilyResponse.status).json({
                error: `Tavily API error: ${tavilyResponse.status}`,
                details: errorText
            });
            return;
        }

        const data = await tavilyResponse.json();
        console.log(`[Tavily Proxy] Got ${data.results?.length || 0} results`);

        res.status(200).json(data);

    } catch (error) {
        console.error('[Tavily Proxy] Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

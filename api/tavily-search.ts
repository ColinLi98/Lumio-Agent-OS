// Vercel Serverless Function to proxy Tavily API requests
// This bypasses CORS restrictions by making server-side calls

export const config = {
    runtime: 'edge',
};

const TAVILY_API_URL = 'https://api.tavily.com/search';
const TAVILY_API_KEY = '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';

export default async function handler(request: Request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { query, search_depth = 'basic', max_results = 5 } = body;

        if (!query) {
            return new Response(JSON.stringify({ error: 'Query is required' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
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
            return new Response(JSON.stringify({
                error: `Tavily API error: ${tavilyResponse.status}`,
                details: errorText
            }), {
                status: tavilyResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const data = await tavilyResponse.json();
        console.log(`[Tavily Proxy] Got ${data.results?.length || 0} results`);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('[Tavily Proxy] Error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}

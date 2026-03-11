import type { VercelRequest, VercelResponse } from '@vercel/node';

type SpecializedTaskType =
    | 'restaurant'
    | 'attraction'
    | 'weather'
    | 'itinerary'
    | 'transportation';

function compactQuery(query: string): string {
    return query.replace(/\s+/g, '').trim();
}

function extractRoute(query: string): { origin?: string; destination?: string } {
    const match = compactQuery(query).match(/(?:从)?(.+?)(?:到|去|前往)(.+?)(?:的|交通|方案|接送机|机票|航班|$)/);
    if (!match) return {};
    return {
        origin: match[1],
        destination: match[2],
    };
}

function extractDestination(query: string): string | undefined {
    const route = extractRoute(query);
    if (route.destination) return route.destination;
    const compact = compactQuery(query);
    const areaMatch = compact.match(/(上海外滩|北京国贸|北京三里屯|广州天河|深圳南山)/);
    if (areaMatch) return areaMatch[1];
    const cityMatch = compact.match(/(上海|北京|广州|深圳|杭州|苏州|成都|重庆|大连)/);
    return cityMatch?.[1];
}

function buildSpecializedTaskParams(type: SpecializedTaskType, query: string): Record<string, unknown> {
    const route = extractRoute(query);
    const destination = extractDestination(query);
    if (type === 'transportation') {
        return {
            origin: route.origin,
            destination,
            query,
        };
    }
    return {
        destination,
        query,
    };
}

export const __agentMarketTestables = {
    buildSpecializedTaskParams,
};

export default async function handler(_request: Request | VercelRequest, response?: VercelResponse): Promise<Response | void> {
    const payload = { error: 'agent-market route has been retired from the public B-end surface' };
    if (response) {
        response.status(410).json(payload);
        return;
    }
    return new Response(JSON.stringify(payload), {
        status: 410,
        headers: { 'content-type': 'application/json' },
    });
}

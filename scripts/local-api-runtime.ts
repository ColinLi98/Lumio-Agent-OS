import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import broadcastHandler from '../api/lix/broadcast';
import processPendingHandler from '../api/lix/process-pending';
import lixMetricsHandler from '../api/lix/metrics';
import conversionDisputeHandler from '../api/lix/conversion/dispute';
import conversionCallbackHandler from '../api/lix/conversion/callback/[tokenId]';

type Handler = (req: any, res: any) => Promise<void> | void;

function getArgValue(flag: string, fallback: string): string {
    const idx = process.argv.indexOf(flag);
    if (idx >= 0 && process.argv[idx + 1]) {
        return process.argv[idx + 1];
    }
    return fallback;
}

function parseQuery(urlObj: URL): Record<string, string | string[]> {
    const query: Record<string, string | string[]> = {};
    for (const [key, value] of urlObj.searchParams.entries()) {
        const existing = query[key];
        if (typeof existing === 'undefined') {
            query[key] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            query[key] = [existing, value];
        }
    }
    return query;
}

async function readRequestBody(req: IncomingMessage): Promise<any> {
    const method = String(req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') return undefined;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) return undefined;
    const text = Buffer.concat(chunks).toString('utf8');
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(text);
        } catch {
            return {};
        }
    }
    return text;
}

function createResponseAdapter(nodeRes: ServerResponse) {
    let statusCode = 200;
    let ended = false;
    const resLike: any = {
        status(code: number) {
            statusCode = code;
            return resLike;
        },
        setHeader(key: string, value: string) {
            nodeRes.setHeader(key, value);
        },
        getHeader(key: string) {
            return nodeRes.getHeader(key);
        },
        json(payload: any) {
            if (ended) return;
            if (!nodeRes.hasHeader('content-type')) {
                nodeRes.setHeader('content-type', 'application/json');
            }
            nodeRes.statusCode = statusCode;
            nodeRes.end(JSON.stringify(payload));
            ended = true;
        },
        send(payload: any) {
            if (ended) return;
            nodeRes.statusCode = statusCode;
            if (
                payload !== null
                && typeof payload === 'object'
                && !Buffer.isBuffer(payload)
            ) {
                if (!nodeRes.hasHeader('content-type')) {
                    nodeRes.setHeader('content-type', 'application/json');
                }
                nodeRes.end(JSON.stringify(payload));
            } else {
                nodeRes.end(String(payload ?? ''));
            }
            ended = true;
        },
        end(payload?: any) {
            if (ended) return;
            nodeRes.statusCode = statusCode;
            if (typeof payload === 'undefined') {
                nodeRes.end();
            } else {
                nodeRes.end(payload);
            }
            ended = true;
        },
    };
    return resLike;
}

function resolveHandler(pathname: string): { handler?: Handler; tokenId?: string } {
    if (pathname === '/api/lix/broadcast') return { handler: broadcastHandler as Handler };
    if (pathname === '/api/lix/process-pending') return { handler: processPendingHandler as Handler };
    if (pathname === '/api/lix/metrics') return { handler: lixMetricsHandler as Handler };
    if (pathname === '/api/lix/conversion/dispute') return { handler: conversionDisputeHandler as Handler };

    const callbackMatch = pathname.match(/^\/api\/lix\/conversion\/callback\/([^/]+)$/);
    if (callbackMatch) {
        return { handler: conversionCallbackHandler as Handler, tokenId: decodeURIComponent(callbackMatch[1]) };
    }

    return {};
}

async function main(): Promise<void> {
    const host = getArgValue('--host', '127.0.0.1');
    const port = Number.parseInt(getArgValue('--port', '3000'), 10);
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error(`Invalid port: ${port}`);
    }

    const server = http.createServer(async (nodeReq, nodeRes) => {
        try {
            const urlObj = new URL(nodeReq.url || '/', `http://${host}:${port}`);
            const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
            if (pathname === '/') {
                nodeRes.statusCode = 200;
                nodeRes.setHeader('content-type', 'text/plain; charset=utf-8');
                nodeRes.end('local-api-runtime: ok');
                return;
            }

            const { handler, tokenId } = resolveHandler(pathname);
            if (!handler) {
                nodeRes.statusCode = 404;
                nodeRes.setHeader('content-type', 'application/json');
                nodeRes.end(JSON.stringify({ success: false, error: 'Not found' }));
                return;
            }

            const body = await readRequestBody(nodeReq);
            const query = parseQuery(urlObj);
            if (tokenId && typeof query.tokenId === 'undefined') {
                query.tokenId = tokenId;
            }

            const reqLike: any = {
                method: nodeReq.method,
                url: urlObj.toString(),
                headers: nodeReq.headers,
                query,
                body,
            };
            const resLike = createResponseAdapter(nodeRes);
            await handler(reqLike, resLike);
            if (!nodeRes.writableEnded) {
                nodeRes.statusCode = nodeRes.statusCode || 204;
                nodeRes.end();
            }
        } catch (error) {
            nodeRes.statusCode = 500;
            nodeRes.setHeader('content-type', 'application/json');
            nodeRes.end(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'internal_error',
            }));
        }
    });

    await new Promise<void>((resolve) => {
        server.listen(port, host, () => resolve());
    });
    console.log(`[local-api-runtime] listening on http://${host}:${port}`);

    const shutdown = () => {
        server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((error) => {
    console.error('[local-api-runtime] fatal:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});

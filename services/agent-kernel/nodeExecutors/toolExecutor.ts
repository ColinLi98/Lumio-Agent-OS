import { getToolRegistry } from '../../toolRegistry.js';
import { sanitizeToolOutput } from '../../policy-engine/redaction.js';
import type { NodeDef } from '../contracts.js';
import type { PolicyDecision } from '../../policy-engine/types.js';
import type { TaskStore } from '../store.js';
import { computeIdempotencyKey } from '../utils.js';

export interface ToolExecutorOptions {
    taskId: string;
    node: NodeDef;
    input: unknown;
    timeoutMs: number;
    store: TaskStore;
    preToolDecision?: PolicyDecision;
    toolRegistry?: ReturnType<typeof getToolRegistry>;
}

function isIdempotentToolNode(node: NodeDef): boolean {
    if (node.idempotent === true) return true;
    if (node.idempotency_key) return true;
    return node.metadata?.idempotent === true;
}

function resolveIdempotencyTtlMs(node: NodeDef): number | undefined {
    if (typeof node.idempotency_ttl_ms === 'number' && node.idempotency_ttl_ms > 0) {
        return node.idempotency_ttl_ms;
    }
    const metadataTtl = node.metadata?.idempotency_ttl_ms;
    if (typeof metadataTtl === 'number' && metadataTtl > 0) {
        return metadataTtl;
    }
    const envTtl = Number(process.env.AGENT_KERNEL_IDEMPOTENCY_TTL_MS || 0);
    return Number.isFinite(envTtl) && envTtl > 0 ? envTtl : undefined;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
    return Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                reject(new Error(`TOOL_TIMEOUT after ${timeoutMs}ms`));
            }, timeoutMs);
        }),
    ]);
}

export async function runToolExecutor(options: ToolExecutorOptions): Promise<unknown> {
    const {
        taskId,
        node,
        input,
        timeoutMs,
        store,
        preToolDecision,
    } = options;

    const toolRegistry = options.toolRegistry || getToolRegistry();
    const idemKey = node.idempotency_key || computeIdempotencyKey(taskId, node.id, input);
    const idempotent = isIdempotentToolNode(node);
    const ttlMs = resolveIdempotencyTtlMs(node);

    if (idempotent) {
        const cached = await store.getIdempotency(idemKey);
        if (cached) {
            const ageMs = Math.max(0, Date.now() - Number(cached.at || 0));
            if (ttlMs === undefined || ageMs <= ttlMs) {
                return cached.output;
            }
        }
    }

    const tool = toolRegistry.getTool(node.name);
    if (!tool) {
        throw new Error(`TOOL_UNAVAILABLE: ${node.name}`);
    }

    const result = await withTimeout(tool.execute((input || {}) as Record<string, unknown>), timeoutMs);

    const sanitized = sanitizeToolOutput(result, {
        maxChars: preToolDecision?.constraints?.max_chars,
        allowedFields: preToolDecision?.constraints?.allowed_fields,
    });

    if (idempotent) {
        await store.setIdempotency(idemKey, { output: sanitized, at: Date.now() });
    }
    return sanitized;
}

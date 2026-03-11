import crypto from 'node:crypto';
import type { NodeStatus } from './contracts.js';

export const AGENT_KERNEL_EVENT_TOPIC = 'agent-kernel.runtime.v1';

export const AGENT_KERNEL_EVENT_TYPES = [
    'task.node.started',
    'task.node.succeeded',
    'task.node.failed',
    'task.retry.scheduled',
    'task.retry.requeued',
    'task.dead_lettered',
    'task.awaiting_user',
    'task.done',
    'task.failed',
    'task.cancelled',
    'task.downgraded',
    'task.compensation.triggered',
    'task.compensation.result',
    'task.compensation.irreversible',
    'tool.called',
    'policy.denied',
    'verifier.failed',
] as const;

export type AgentKernelEventType = typeof AGENT_KERNEL_EVENT_TYPES[number];

export interface NodeExecutionLog {
    task_id: string;
    node_id: string;
    correlation_id?: string;
    run_id?: string;
    span_id?: string;
    status?: NodeStatus;
    attempt?: number;
    error_code?: string;
    error_message?: string;
    retryable?: boolean;
    tool_call_id?: string;
    verifier?: string;
    policy_decision_ids?: string[];
    approval_decision?: string;
    started_at?: number;
    ended_at?: number;
    latency_ms?: number;
}

export interface AgentKernelRuntimeEvent {
    event_id: string;
    topic: typeof AGENT_KERNEL_EVENT_TOPIC;
    type: AgentKernelEventType | string;
    task_id: string;
    node_id?: string;
    correlation_id?: string;
    run_id?: string;
    span_id?: string;
    occurred_at: number;
    payload?: Record<string, unknown>;
    node_log?: NodeExecutionLog;
}

function randomSuffix(): string {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().slice(0, 12);
    }
    return Math.random().toString(36).slice(2, 14);
}

function inferNodeStatus(type: string): NodeStatus | undefined {
    if (type === 'task.node.started') return 'RUNNING';
    if (type === 'task.node.succeeded') return 'SUCCEEDED';
    if (type === 'task.node.failed') return 'FAILED';
    if (type === 'task.retry.scheduled') return 'FAILED';
    if (type === 'task.retry.requeued') return 'PENDING';
    if (type === 'task.dead_lettered') return 'FAILED';
    if (type === 'task.awaiting_user') return 'WAITING_USER';
    return undefined;
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalized = value.filter((item) => typeof item === 'string') as string[];
    return normalized.length > 0 ? normalized : undefined;
}

function buildNodeExecutionLog(
    taskId: string,
    nodeId: string,
    type: string,
    payload: Record<string, unknown> | undefined,
    occurredAt: number
): NodeExecutionLog | undefined {
    const status = inferNodeStatus(type);
    if (!status && !payload) return undefined;

    const startedAt = asNumber(payload?.started_at);
    const endedAt = asNumber(payload?.ended_at) || (
        status && ['SUCCEEDED', 'FAILED', 'WAITING_USER', 'CANCELLED', 'SKIPPED'].includes(status)
            ? occurredAt
            : undefined
    );
    const latency = asNumber(payload?.latency_ms);

    return {
        task_id: taskId,
        node_id: nodeId,
        correlation_id: asString(payload?.correlation_id),
        run_id: asString(payload?.run_id),
        span_id: asString(payload?.span_id),
        status,
        attempt: asNumber(payload?.attempt),
        error_code: asString(payload?.code),
        error_message: asString(payload?.message) || asString(payload?.reason),
        retryable: asBoolean(payload?.retryable),
        tool_call_id: asString(payload?.tool_call_id),
        verifier: asString(payload?.verifier),
        policy_decision_ids: asStringArray(payload?.policy_decision_ids),
        approval_decision: asString(payload?.approval_decision),
        started_at: startedAt,
        ended_at: endedAt,
        latency_ms: latency,
    };
}

export function createRuntimeEvent(params: {
    type: string;
    task_id: string;
    node_id?: string;
    correlation_id?: string;
    run_id?: string;
    span_id?: string;
    payload?: Record<string, unknown>;
}): AgentKernelRuntimeEvent {
    const occurredAt = Date.now();
    const payload = {
        ...params.payload,
        correlation_id: params.payload?.correlation_id || params.correlation_id,
        run_id: params.payload?.run_id || params.run_id,
        span_id: params.payload?.span_id || params.span_id,
    };
    const event: AgentKernelRuntimeEvent = {
        event_id: `akevt_${occurredAt.toString(36)}_${randomSuffix()}`,
        topic: AGENT_KERNEL_EVENT_TOPIC,
        type: params.type,
        task_id: params.task_id,
        node_id: params.node_id,
        correlation_id: params.correlation_id,
        run_id: params.run_id,
        span_id: params.span_id,
        occurred_at: occurredAt,
        payload,
    };

    if (params.node_id) {
        event.node_log = buildNodeExecutionLog(
            params.task_id,
            params.node_id,
            params.type,
            payload,
            occurredAt
        );
    }

    return event;
}

import { describe, expect, it } from 'vitest';
import { createRuntimeEvent } from '../services/agent-kernel/events.js';
import { TaskGraphRuntime } from '../services/agent-kernel/runtime.js';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';
import { ToolRegistry } from '../services/toolRegistry.js';
import type { TaskGraph } from '../services/agent-kernel/contracts.js';

function createAllowAllPolicy(): PolicyEngine {
    return new PolicyEngine({
        version: 'test',
        defaults: {
            action: 'ALLOW',
            log_level: 'MINIMAL',
        },
        rules: [],
    });
}

async function waitForTaskStatus(
    runtime: TaskGraphRuntime,
    taskId: string,
    expected: Array<'RUNNING' | 'WAITING_USER' | 'DONE' | 'FAILED' | 'CANCELLED'>,
    timeoutMs = 1500
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const snapshot = await runtime.getTaskSnapshot(taskId);
        if (snapshot && expected.includes(snapshot.task_state.status)) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Task ${taskId} did not reach expected status in ${timeoutMs}ms`);
}

describe('agent-kernel event contracts', () => {
    it('creates runtime event envelope with node log for node event', () => {
        const event = createRuntimeEvent({
            type: 'task.node.started',
            task_id: 'task_1',
            node_id: 'n1',
            correlation_id: 'corr_1',
            run_id: 'run_1',
            span_id: 'span_1',
            payload: { attempt: 2 },
        });

        expect(event.topic).toBe('agent-kernel.runtime.v1');
        expect(event.event_id).toMatch(/^akevt_/);
        expect(event.node_log?.status).toBe('RUNNING');
        expect(event.node_log?.attempt).toBe(2);
        expect(event.node_log?.task_id).toBe('task_1');
        expect(event.node_log?.node_id).toBe('n1');
        expect(event.correlation_id).toBe('corr_1');
        expect(event.run_id).toBe('run_1');
        expect(event.node_log?.span_id).toBe('span_1');
    });

    it('creates retry and dead-letter event envelopes with stable node metadata', () => {
        const scheduled = createRuntimeEvent({
            type: 'task.retry.scheduled',
            task_id: 'task_retry',
            node_id: 'n1',
            payload: {
                attempt: 2,
                available_at: 123,
                error_code: 'TOOL_TIMEOUT',
            },
        });
        const deadLettered = createRuntimeEvent({
            type: 'task.dead_lettered',
            task_id: 'task_retry',
            node_id: 'n1',
            payload: {
                attempt: 2,
                error_code: 'TOOL_TIMEOUT',
            },
        });

        expect(scheduled.node_log?.status).toBe('FAILED');
        expect(scheduled.node_log?.attempt).toBe(2);
        expect(deadLettered.node_log?.status).toBe('FAILED');
        expect(deadLettered.node_log?.task_id).toBe('task_retry');
        expect(deadLettered.node_log?.node_id).toBe('n1');
    });

    it('emits tool.called and verifier.failed during execution', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register({
            name: 'tool_for_events',
            description: 'tool for event contract test',
            parameters: {
                type: 'object',
                properties: {},
            },
            execute: async () => ({ value: 'ok' }),
        });

        const captured: Array<{ type: string; task_id: string; node_id?: string; correlation_id?: string }> = [];
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            toolRegistry,
            onEvent: (event) => {
                captured.push({
                    type: event.type,
                    task_id: event.task_id,
                    node_id: event.node_id,
                    correlation_id: event.correlation_id,
                });
            },
        });

        const graph: TaskGraph = {
            task_id: 'task_event_runtime',
            goal: 'event contract',
            nodes: [
                { id: 'n1', type: 'tool', name: 'tool_for_events' },
                { id: 'n2', type: 'verify', name: 'verify.fail', input_from: ['n1'], output_schema: { required: ['missing'] } },
            ],
            edges: [['n1', 'n2']],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
        };

        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['FAILED'], 1500);

        expect(captured.some((event) => event.type === 'tool.called')).toBe(true);
        expect(captured.some((event) => event.type === 'verifier.failed')).toBe(true);
        expect(captured.every((event) => Boolean(event.correlation_id))).toBe(true);
    });

    it('emits retry scheduling, requeue, and dead-letter events during runtime execution', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register({
            name: 'dead_letter_event_tool',
            description: 'dead letter event test tool',
            parameters: {
                type: 'object',
                properties: {},
            },
            execute: async () => {
                throw new Error('temporary network timeout');
            },
        });

        const captured: Array<{ type: string; task_id: string; node_id?: string }> = [];
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            toolRegistry,
            onEvent: (event) => {
                captured.push({
                    type: event.type,
                    task_id: event.task_id,
                    node_id: event.node_id,
                });
            },
        });

        const graph: TaskGraph = {
            task_id: 'task_event_dead_letter',
            goal: 'event dead letter',
            nodes: [
                { id: 'n1', type: 'tool', name: 'dead_letter_event_tool' },
            ],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['FAILED'], 1500);

        expect(captured.some((event) => event.type === 'task.retry.scheduled')).toBe(true);
        expect(captured.some((event) => event.type === 'task.retry.requeued')).toBe(true);
        expect(captured.some((event) => event.type === 'task.dead_lettered')).toBe(true);
    });
});

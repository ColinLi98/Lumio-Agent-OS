import { beforeEach, describe, expect, it } from 'vitest';
import { TaskGraphRuntime } from '../services/agent-kernel/runtime.js';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';
import { ToolRegistry } from '../services/toolRegistry.js';
import type { TaskGraph } from '../services/agent-kernel/contracts.js';
import { resetMetrics } from '../services/metricsCollector.js';
import { getDashboardMetrics } from '../services/providers/dashboardApi.js';

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

describe('agent-kernel observability integration', () => {
    beforeEach(() => {
        resetMetrics();
    });

    it('records task done metric into dashboard summary', async () => {
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
        });
        const graph: TaskGraph = {
            task_id: 'obs_done_task',
            goal: 'observability done',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.done' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
        };

        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['DONE'], 1000);

        const metrics = await getDashboardMetrics();
        expect(metrics.agent_kernel_summary.tasks_done).toBeGreaterThanOrEqual(1);
    });

    it('records irreversible compensation metrics into dashboard summary', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register({
            name: 'always_fail_tool',
            description: 'always fail',
            parameters: { type: 'object', properties: {} },
            execute: async () => {
                throw new Error('hard failure');
            },
        });

        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            toolRegistry,
        });
        const graph: TaskGraph = {
            task_id: 'obs_compensation_task',
            goal: 'observability compensation',
            nodes: [{ id: 'n1', type: 'tool', name: 'always_fail_tool' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
            compensation: [{ on: 'n1_fail', do: 'ask_user_alternative_channel' }],
        };

        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['WAITING_USER'], 1200);

        const metrics = await getDashboardMetrics();
        expect(metrics.agent_kernel_summary.compensation_irreversible).toBeGreaterThanOrEqual(1);
        expect(metrics.agent_kernel_summary.compensation_requires_user).toBeGreaterThanOrEqual(1);
        expect(metrics.agent_kernel_summary.tasks_waiting_user).toBeGreaterThanOrEqual(1);
    });

    it('surfaces observability gauges and tracing for degraded tasks', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register({
            name: 'always_fail_observability_tool',
            description: 'always fail',
            parameters: { type: 'object', properties: {} },
            execute: async () => {
                throw new Error('temporary network timeout');
            },
        });

        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
            toolRegistry,
        });
        const graph: TaskGraph = {
            task_id: 'obs_degraded_task',
            goal: 'observability degraded',
            nodes: [{ id: 'n1', type: 'tool', name: 'always_fail_observability_tool' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
        };

        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['FAILED'], 1200);

        const snapshot = await runtime.getTaskSnapshot(graph.task_id);
        expect(snapshot?.observability?.alerts.some((alert) => alert.code === 'DEAD_LETTER_OPEN')).toBe(true);
        expect(snapshot?.observability?.degraded_mode.active).toBe(true);
        expect(snapshot?.observability?.tracing.spans.length).toBeGreaterThan(0);

        const metrics = await getDashboardMetrics();
        expect(metrics.agent_kernel_summary.task_open_alerts).toBeGreaterThanOrEqual(1);
        expect(metrics.agent_kernel_summary.tasks_degraded).toBeGreaterThanOrEqual(1);
        expect(metrics.agent_kernel_summary.task_dead_letters_open).toBeGreaterThanOrEqual(1);
    });
});

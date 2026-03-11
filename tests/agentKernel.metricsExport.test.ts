import { beforeEach, describe, expect, it } from 'vitest';
import metricsHandler from '../api/metrics';
import { resetMetrics, getMetricsSummary } from '../services/metricsCollector.js';
import { TaskGraphRuntime } from '../services/agent-kernel/runtime.js';
import { PolicyEngine } from '../services/policy-engine/evaluator.js';
import { ToolRegistry } from '../services/toolRegistry.js';
import type { TaskGraph } from '../services/agent-kernel/contracts.js';

type MockReq = {
    method: string;
    query?: Record<string, any>;
};

type MockRes = {
    statusCode: number;
    payload: any;
    headers: Record<string, string>;
    status: (code: number) => MockRes;
    json: (payload: any) => MockRes;
    send: (payload: any) => MockRes;
    setHeader: (key: string, value: string) => void;
    end: () => void;
};

function createMockRes(): MockRes {
    return {
        statusCode: 200,
        payload: undefined,
        headers: {},
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.payload = payload;
            return this;
        },
        send(payload: any) {
            this.payload = payload;
            return this;
        },
        setHeader(key: string, value: string) {
            this.headers[key] = value;
        },
        end() {
            // no-op
        },
    };
}

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

describe('agent-kernel metrics export', () => {
    beforeEach(() => {
        resetMetrics();
    });

    it('records compensation counters with action/trigger labels', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register({
            name: 'always_fail_tool_metrics',
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
            task_id: 'metrics_label_task',
            goal: 'metrics labels',
            nodes: [{ id: 'n1', type: 'tool', name: 'always_fail_tool_metrics' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
            compensation: [{ on: 'n1_fail', do: 'ask_user_alternative_channel' }],
        };

        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['WAITING_USER'], 1200);

        const counters = getMetricsSummary().counters;
        const key = Object.keys(counters).find((name) =>
            name.startsWith('agent_kernel_compensation_total')
            && name.includes('disposition="irreversible"')
            && name.includes('action="ask_user_alternative_channel"')
            && name.includes('trigger="fail"')
        );
        expect(key).toBeTruthy();
        expect(key ? counters[key] : 0).toBeGreaterThanOrEqual(1);
    });

    it('exports metrics from /api/metrics in json and prometheus formats', async () => {
        const runtime = new TaskGraphRuntime({
            policyEngine: createAllowAllPolicy(),
        });
        const graph: TaskGraph = {
            task_id: 'metrics_api_task',
            goal: 'metrics api',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.metrics' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
        };
        await runtime.createTask(graph);
        await runtime.runTask(graph.task_id);
        await waitForTaskStatus(runtime, graph.task_id, ['DONE'], 1000);

        const jsonRes = createMockRes();
        await metricsHandler(
            { method: 'GET', query: { format: 'json' } } as unknown as any,
            jsonRes as unknown as any
        );
        expect(jsonRes.statusCode).toBe(200);
        expect(jsonRes.payload?.success).toBe(true);
        expect(jsonRes.payload?.metrics?.counters).toBeTruthy();
        expect(jsonRes.payload?.metrics?.gauges).toBeTruthy();
        expect(
            Object.keys(jsonRes.payload?.metrics?.gauges || {}).some((name) =>
                name.startsWith('agent_kernel_task_open_alerts')
            )
        ).toBe(true);

        const promRes = createMockRes();
        await metricsHandler(
            { method: 'GET', query: {} } as unknown as any,
            promRes as unknown as any
        );
        expect(promRes.statusCode).toBe(200);
        expect(String(promRes.payload || '')).toContain('agent_kernel_events_total');
        expect(String(promRes.payload || '')).toContain('agent_kernel_task_open_alerts');
    });
});

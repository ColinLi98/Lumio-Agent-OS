import type { AgentExecutionPlan } from '../agentMarketplaceTypes.js';
import type { TaskGraph } from './contracts.js';

function toNodeType(capabilities: string[]): 'tool' | 'llm' {
    const caps = capabilities.map((c) => c.toLowerCase());
    if (caps.some((cap) => cap.includes('search') || cap.includes('flight') || cap.includes('hotel') || cap.includes('weather'))) {
        return 'tool';
    }
    return 'llm';
}

export function adaptMarketplacePlanToTaskGraph(
    plan: AgentExecutionPlan,
    options?: {
        taskId?: string;
        goal?: string;
        maxParallelNodes?: number;
    }
): TaskGraph {
    const taskId = options?.taskId || `kernel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const nodes = plan.tasks.map((task) => ({
        id: task.id,
        type: toNodeType(task.required_capabilities),
        name: task.required_capabilities[0] || 'llm.generate',
        input_from: task.dependencies,
        metadata: {
            title: task.objective,
            capability_hint: task.required_capabilities,
        },
    }));

    const edges: Array<[string, string]> = [];
    for (const task of plan.tasks) {
        for (const dep of task.dependencies) {
            edges.push([dep, task.id]);
        }
    }

    return {
        task_id: taskId,
        goal: options?.goal || `Execute marketplace plan: ${plan.domain}`,
        budget: {
            max_tool_calls: 8,
            max_tokens: 12000,
            max_latency_ms: 15000,
        },
        nodes,
        edges,
        max_parallel_nodes: options?.maxParallelNodes || 4,
        retry_policy: {
            max_retries: 2,
            backoff_ms: 800,
            jitter: true,
        },
    };
}

export function adaptSuperAgentTaskGraphToKernel(
    taskGraph: {
        tasks: Array<{ id: string; title: string; required_capabilities: string[] }>;
        edges: Array<{ from: string; to: string }>;
    },
    query: string,
    taskId?: string
): TaskGraph {
    const kernelTaskId = taskId || `kernel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return {
        task_id: kernelTaskId,
        goal: query,
        budget: {
            max_tool_calls: 8,
            max_tokens: 12000,
            max_latency_ms: 15000,
        },
        nodes: taskGraph.tasks.map((task) => ({
            id: task.id,
            type: toNodeType(task.required_capabilities),
            name: task.required_capabilities[0] || 'llm.generate',
            metadata: {
                title: task.title,
            },
        })),
        edges: taskGraph.edges.map((edge) => [edge.from, edge.to]),
        max_parallel_nodes: 4,
        retry_policy: {
            max_retries: 2,
            backoff_ms: 800,
            jitter: true,
        },
    };
}

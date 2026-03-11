import type { MergePolicy, NodeDef } from '../contracts.js';

function asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

function applyAll(inputs: Record<string, unknown>): Record<string, unknown> {
    return { ...inputs };
}

function applyAnyK(inputs: Record<string, unknown>, k: number): Record<string, unknown> {
    const keys = Object.keys(inputs).slice(0, Math.max(1, k));
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = inputs[key];
    return out;
}

function applyBestEffort(inputs: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
        if (value === undefined || value === null) continue;
        out[key] = value;
    }
    return out;
}

export async function runMergeExecutor(node: NodeDef, input: unknown): Promise<unknown> {
    const inputs = asRecord(input);
    const policy: MergePolicy = node.merge_policy || { mode: 'ALL' };

    if (policy.mode === 'ANY_K') {
        return {
            merge_mode: 'ANY_K',
            merged: applyAnyK(inputs, policy.k || 1),
        };
    }

    if (policy.mode === 'BEST_EFFORT') {
        return {
            merge_mode: 'BEST_EFFORT',
            merged: applyBestEffort(inputs),
        };
    }

    return {
        merge_mode: 'ALL',
        merged: applyAll(inputs),
    };
}

import crypto from 'node:crypto';
import type { NodeError, NodeErrorCode, RetryPolicy } from './contracts.js';

export interface ClassifiedError extends NodeError {
    kind: 'RETRYABLE' | 'NON_RETRYABLE' | 'NEEDS_USER';
    userPrompt?: string;
}

export class VerificationFailure extends Error {
    readonly code = 'VERIFICATION_FAILED';
    constructor(message: string) {
        super(message);
        this.name = 'VerificationFailure';
    }
}

export class NeedsUserInputError extends Error {
    readonly code = 'NEEDS_USER_INPUT';
    readonly prompt: string;

    constructor(prompt: string) {
        super(prompt);
        this.name = 'NeedsUserInputError';
        this.prompt = prompt;
    }
}

export class PolicyDenyError extends Error {
    readonly code = 'POLICY_DENY';
    constructor(message: string) {
        super(message);
        this.name = 'PolicyDenyError';
    }
}

export function stableJson(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`).join(',')}}`;
}

export function hashText(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function computeIdempotencyKey(taskId: string, nodeId: string, input: unknown): string {
    return hashText(`${taskId}:${nodeId}:${stableJson(input)}`);
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoff(policy: RetryPolicy, attempt: number): number {
    const base = Math.max(0, policy.backoff_ms);
    const exp = base * Math.pow(2, Math.max(0, attempt - 1));
    if (!policy.jitter) return Math.round(exp);
    const jitter = Math.floor(Math.random() * Math.max(1, base));
    return Math.round(exp + jitter);
}

function inferCode(error: unknown): NodeErrorCode {
    const message = error instanceof Error ? error.message : String(error || 'unknown');
    const lower = message.toLowerCase();
    if (error instanceof VerificationFailure) return 'VERIFICATION_FAILED';
    if (error instanceof NeedsUserInputError) return 'NEEDS_USER_INPUT';
    if (error instanceof PolicyDenyError) return 'POLICY_DENY';
    if (lower.includes('timeout')) return 'TOOL_TIMEOUT';
    if (lower.includes('budget')) return 'BUDGET_EXCEEDED';
    if (lower.includes('tool') && lower.includes('unavailable')) return 'TOOL_UNAVAILABLE';
    if (lower.includes('schema') || lower.includes('invalid output')) return 'INVALID_OUTPUT';
    return 'INTERNAL_ERROR';
}

export function classifyError(error: unknown): ClassifiedError {
    const code = inferCode(error);
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    const lower = message.toLowerCase();

    if (error instanceof NeedsUserInputError || code === 'NEEDS_USER_INPUT') {
        return {
            kind: 'NEEDS_USER',
            code: 'NEEDS_USER_INPUT',
            message,
            retryable: false,
            userPrompt: error instanceof NeedsUserInputError ? error.prompt : message,
        };
    }

    if (
        code === 'POLICY_DENY' ||
        code === 'POST_POLICY_DENY' ||
        code === 'INVALID_OUTPUT' ||
        code === 'VERIFICATION_FAILED' ||
        lower.includes('permission') ||
        lower.includes('forbidden') ||
        lower.includes('unauthorized')
    ) {
        return {
            kind: 'NON_RETRYABLE',
            code,
            message,
            retryable: false,
        };
    }

    if (
        code === 'TOOL_TIMEOUT' ||
        lower.includes('network') ||
        lower.includes('429') ||
        lower.includes('5xx') ||
        lower.includes('tempor') ||
        lower.includes('retry')
    ) {
        return {
            kind: 'RETRYABLE',
            code,
            message,
            retryable: true,
        };
    }

    return {
        kind: 'NON_RETRYABLE',
        code,
        message,
        retryable: false,
    };
}

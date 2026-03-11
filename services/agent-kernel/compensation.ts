import type { ApprovalPayload, NodeState, TaskGraph } from './contracts.js';

export type CompensationDisposition = 'APPLIED' | 'IRREVERSIBLE' | 'FAILED' | 'NOOP';

export interface CompensationUserPrompt {
    title?: string;
    summary: string;
    options?: Array<{ id: string; label: string }>;
    default?: string;
    risk?: 'low' | 'medium' | 'high';
    expires_at?: number;
}

export interface CompensationExecutionResult {
    disposition: CompensationDisposition;
    message: string;
    requires_user?: boolean;
    user_prompt?: CompensationUserPrompt;
}

export interface CompensationExecutionContext {
    task_id: string;
    node_id?: string;
    trigger: `${string}_fail` | `${string}_succeed` | 'task_cancelled';
    reason?: string;
    action: string;
    graph?: TaskGraph;
    node_state?: NodeState;
}

export type CompensationHandler = (
    ctx: CompensationExecutionContext
) => Promise<CompensationExecutionResult> | CompensationExecutionResult;

export class CompensationRegistry {
    private readonly handlers = new Map<string, CompensationHandler>();

    register(action: string, handler: CompensationHandler): void {
        this.handlers.set(action, handler);
    }

    async execute(ctx: CompensationExecutionContext): Promise<CompensationExecutionResult> {
        const exact = this.handlers.get(ctx.action);
        if (exact) return exact(ctx);

        const [prefix] = String(ctx.action || '').split(':');
        const prefixHandler = this.handlers.get(`${prefix}:*`);
        if (prefixHandler) return prefixHandler(ctx);

        return {
            disposition: 'NOOP',
            message: `No compensation handler registered for action: ${ctx.action}`,
        };
    }
}

function defaultApprovalPayload(reason?: string): CompensationUserPrompt {
    return {
        title: 'Choose an alternative action',
        summary: reason || 'Primary action failed. Please choose an alternative path.',
        options: [
            { id: 'retry', label: 'Retry later' },
            { id: 'alternative', label: 'Use alternative channel' },
            { id: 'cancel', label: 'Cancel task' },
        ],
        default: 'alternative',
        risk: 'medium',
        expires_at: Date.now() + (15 * 60 * 1000),
    };
}

export function createDefaultCompensationRegistry(): CompensationRegistry {
    const registry = new CompensationRegistry();

    registry.register('ask_user_alternative_channel', (ctx) => ({
        disposition: 'IRREVERSIBLE',
        message: 'Primary action is not automatically reversible. Waiting for user decision.',
        requires_user: true,
        user_prompt: defaultApprovalPayload(ctx.reason),
    }));

    registry.register('audit_irreversible', (ctx) => ({
        disposition: 'IRREVERSIBLE',
        message: `Irreversible action recorded for audit (${ctx.trigger})`,
    }));

    registry.register('rollback:*', (ctx) => ({
        disposition: 'APPLIED',
        message: `Rollback action applied: ${ctx.action}`,
    }));

    registry.register('notify_user_manual_recovery', (ctx) => ({
        disposition: 'IRREVERSIBLE',
        message: 'Manual recovery required from user.',
        requires_user: true,
        user_prompt: {
            ...defaultApprovalPayload(ctx.reason),
            title: 'Manual recovery required',
            summary: ctx.reason || 'Please decide how to recover from this irreversible step.',
            options: [
                { id: 'retry', label: 'Retry with changes' },
                { id: 'abort', label: 'Abort task' },
            ],
            default: 'retry',
            risk: 'high',
        },
    }));

    return registry;
}

export function toApprovalPayload(
    taskId: string,
    nodeId: string,
    prompt: CompensationUserPrompt
): ApprovalPayload {
    return {
        task_id: taskId,
        node_id: nodeId,
        type: 'ask_user',
        title: prompt.title || 'Action requires your decision',
        summary: prompt.summary,
        options: Array.isArray(prompt.options) && prompt.options.length > 0
            ? prompt.options
            : [
                { id: 'retry', label: 'Retry' },
                { id: 'cancel', label: 'Cancel' },
            ],
        default: prompt.default || 'retry',
        risk: prompt.risk || 'medium',
        expires_at: prompt.expires_at || Date.now() + (15 * 60 * 1000),
    };
}

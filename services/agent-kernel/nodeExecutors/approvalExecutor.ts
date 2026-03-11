import type { ApprovalPayload, NodeDef } from '../contracts.js';

export function runApprovalExecutor(taskId: string, node: NodeDef, input: unknown): ApprovalPayload {
    const optionsFromInput = Array.isArray((input as any)?.options)
        ? ((input as any).options as Array<Record<string, unknown>>)
            .map((option, index) => ({
                id: String(option.id || `opt_${index + 1}`),
                label: String(option.label || option.value || `Option ${index + 1}`),
            }))
            .slice(0, 6)
        : [];

    return {
        task_id: taskId,
        node_id: node.id,
        type: node.type === 'ask_user' ? 'ask_user' : 'approval',
        title: String(node.metadata?.title || node.name || 'Need your confirmation'),
        summary: String(
            (input as any)?.summary
            || node.metadata?.summary
            || 'Please confirm to continue execution.'
        ),
        options: optionsFromInput.length > 0
            ? optionsFromInput
            : [
                { id: 'approve', label: 'Approve' },
                { id: 'reject', label: 'Reject' },
            ],
        default: String(node.metadata?.default || 'approve'),
        risk: (node.metadata?.risk as 'low' | 'medium' | 'high' | undefined) || 'medium',
        expires_at: typeof node.metadata?.expires_at === 'number'
            ? Number(node.metadata.expires_at)
            : Date.now() + (15 * 60 * 1000),
    };
}

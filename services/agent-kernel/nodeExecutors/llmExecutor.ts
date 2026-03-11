import type { NodeDef } from '../contracts.js';

export async function runLlmExecutor(node: NodeDef, input: unknown): Promise<unknown> {
    const summary = `LLM(${node.name}) generated a draft from upstream inputs.`;
    return {
        summary,
        prompt_id: node.name,
        structured_output: {
            input,
            generated_at: Date.now(),
        },
    };
}

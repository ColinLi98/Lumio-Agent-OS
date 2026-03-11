import type { NodeDef } from '../contracts.js';
import { VerificationFailure } from '../utils.js';

export async function runVerifyExecutor(node: NodeDef, input: unknown): Promise<unknown> {
    const required = node.output_schema?.required || [];

    if (required.length > 0) {
        const subject = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
        const missing = required.filter((key) => !Object.prototype.hasOwnProperty.call(subject, key));
        if (missing.length > 0) {
            throw new VerificationFailure(`VERIFICATION_FAILED: missing fields ${missing.join(',')}`);
        }
    }

    const explicitFailure = (input && typeof input === 'object' && (input as any).verify_ok === false);
    if (explicitFailure) {
        throw new VerificationFailure(`VERIFICATION_FAILED: ${String((input as any).reason || 'verify_ok=false')}`);
    }

    return {
        verify_ok: true,
        verifier: node.name,
        checked_at: Date.now(),
    };
}

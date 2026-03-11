import { redactPII } from '../piiRedactor.js';
import type { PolicyDecision, PolicyUser } from './types.js';

export interface CapsuleRawContext {
    app?: string;
    selectedText?: string;
    entities?: Array<{ type: string; value: string }>;
    attachments?: Array<Record<string, unknown>>;
    constraints?: Record<string, unknown>;
}

export interface Capsule {
    app_context?: string;
    entities: Array<{ type: string; value: string }>;
    constraints: Record<string, unknown>;
    sensitivity_label: 'low' | 'medium' | 'high';
    selected_text: {
        present: boolean;
        redacted_text: string | null;
    };
    summary?: string;
    allowed_fields?: string[];
}

function classifySensitivity(raw: CapsuleRawContext): 'low' | 'medium' | 'high' {
    const text = String(raw.selectedText || '');
    if (!text) return 'low';
    const pii = redactPII(text);
    if (pii.redaction_count >= 3) return 'high';
    if (pii.redaction_count > 0) return 'medium';
    return 'low';
}

function summarizeLocal(text: string, maxChars = 400): string {
    const compact = String(text || '').replace(/\s+/g, ' ').trim();
    if (!compact) return '';
    if (compact.length <= maxChars) return compact;
    return `${compact.slice(0, maxChars - 1)}…`;
}

export function buildCapsule(
    rawContext: CapsuleRawContext,
    user: PolicyUser | undefined,
    intentHint?: string
): Capsule {
    const sensitivity = classifySensitivity(rawContext);
    const selectedText = String(rawContext.selectedText || '');

    const capsule: Capsule = {
        app_context: rawContext.app,
        entities: Array.isArray(rawContext.entities) ? rawContext.entities.slice(0, 30) : [],
        constraints: {
            ...(rawContext.constraints || {}),
            ...(intentHint ? { intent_hint: intentHint } : {}),
        },
        sensitivity_label: sensitivity,
        selected_text: {
            present: Boolean(selectedText),
            redacted_text: null,
        },
    };

    if ((user?.privacy_level || 'medium') === 'high') {
        capsule.summary = summarizeLocal(selectedText, 400);
        capsule.allowed_fields = ['entities', 'summary', 'constraints'];
    } else {
        capsule.selected_text.redacted_text = selectedText ? redactPII(selectedText).redacted_text : null;
    }

    return capsule;
}

export function applyDecisionToCapsule(capsule: Capsule, decision: PolicyDecision): Capsule {
    if (decision.action !== 'REDACT' && decision.action !== 'ALLOW_WITH_LIMITS') {
        return capsule;
    }

    const constraints = decision.constraints || {};
    const allowedFields = constraints.allowed_fields;
    const maxChars = constraints.max_chars || 0;

    let output: Capsule = { ...capsule };

    if (Array.isArray(allowedFields) && allowedFields.length > 0) {
        output = {
            entities: allowedFields.includes('entities') ? output.entities : [],
            constraints: allowedFields.includes('constraints') ? output.constraints : {},
            summary: allowedFields.includes('summary') ? output.summary : undefined,
            app_context: allowedFields.includes('app_context') ? output.app_context : undefined,
            sensitivity_label: output.sensitivity_label,
            selected_text: allowedFields.includes('selected_text')
                ? output.selected_text
                : { present: output.selected_text.present, redacted_text: null },
            allowed_fields: allowedFields,
        };
    }

    if (maxChars > 0 && typeof output.summary === 'string' && output.summary.length > maxChars) {
        output.summary = `${output.summary.slice(0, maxChars - 1)}…`;
    }

    return output;
}

function trimLongString(value: string, maxChars: number): string {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function deepSanitize(value: unknown, maxChars: number): unknown {
    if (typeof value === 'string') return trimLongString(value, maxChars);
    if (Array.isArray(value)) return value.slice(0, 50).map((item) => deepSanitize(item, maxChars));
    if (!value || typeof value !== 'object') return value;

    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const keys = Object.keys(input).slice(0, 80);
    for (const key of keys) {
        output[key] = deepSanitize(input[key], maxChars);
    }
    return output;
}

export function sanitizeToolOutput(
    output: unknown,
    options?: {
        maxChars?: number;
        allowedFields?: string[];
    }
): unknown {
    const maxChars = Math.max(64, Number(options?.maxChars || 1200));
    let sanitized = deepSanitize(output, maxChars);

    if (Array.isArray(options?.allowedFields) && options?.allowedFields.length && sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
        const obj = sanitized as Record<string, unknown>;
        const filtered: Record<string, unknown> = {};
        for (const field of options.allowedFields) {
            if (Object.prototype.hasOwnProperty.call(obj, field)) {
                filtered[field] = obj[field];
            }
        }
        sanitized = filtered;
    }

    return {
        quoted_as_data: true,
        payload: sanitized,
    };
}

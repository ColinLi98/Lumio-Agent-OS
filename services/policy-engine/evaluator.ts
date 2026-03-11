import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type {
    PolicyContext,
    PolicyDecision,
    PolicyRulePack,
    RuleCondition,
    RuleDefinition,
} from './types.js';

const TIER_ORDER: Record<NonNullable<RuleDefinition['tier']>, number> = {
    hard_deny: 0,
    egress: 1,
    side_effect: 2,
    user_pref: 3,
    budget: 4,
    default_allow: 5,
};

function decisionId(prefix = 'policy'): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function deepGet(obj: unknown, pathExpr: string): unknown {
    if (!obj || !pathExpr) return undefined;
    const parts = pathExpr.split('.');
    let cursor: unknown = obj;
    for (const part of parts) {
        if (cursor == null || typeof cursor !== 'object') return undefined;
        cursor = (cursor as Record<string, unknown>)[part];
    }
    return cursor;
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function evaluateLeaf(actual: unknown, op: string, expected: unknown): boolean {
    switch (op) {
        case 'eq':
            return actual === expected;
        case 'neq':
            return actual !== expected;
        case 'in':
            return Array.isArray(expected) ? expected.includes(actual) : false;
        case 'not_in':
            return Array.isArray(expected) ? !expected.includes(actual) : true;
        case 'exists':
            return actual !== undefined && actual !== null;
        case 'truthy':
            return Boolean(actual);
        case 'lte': {
            const a = toNumber(actual);
            const b = toNumber(expected);
            return a !== null && b !== null ? a <= b : false;
        }
        case 'lt': {
            const a = toNumber(actual);
            const b = toNumber(expected);
            return a !== null && b !== null ? a < b : false;
        }
        case 'gte': {
            const a = toNumber(actual);
            const b = toNumber(expected);
            return a !== null && b !== null ? a >= b : false;
        }
        case 'gt': {
            const a = toNumber(actual);
            const b = toNumber(expected);
            return a !== null && b !== null ? a > b : false;
        }
        default:
            return false;
    }
}

function matches(condition: RuleCondition, context: PolicyContext): boolean {
    if ('all' in condition) {
        return condition.all.every((child) => matches(child, context));
    }
    if ('any' in condition) {
        return condition.any.some((child) => matches(child, context));
    }
    if ('not' in condition) {
        return !matches(condition.not, context);
    }

    const actual = deepGet(context, condition.path);
    return evaluateLeaf(actual, condition.op, condition.value);
}

function sortRules(rules: RuleDefinition[]): RuleDefinition[] {
    return [...rules].sort((a, b) => {
        const tierA = TIER_ORDER[a.tier || 'default_allow'];
        const tierB = TIER_ORDER[b.tier || 'default_allow'];
        if (tierA !== tierB) return tierA - tierB;
        return b.priority - a.priority;
    });
}

function loadDefaultPack(): PolicyRulePack {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const rulesPath = path.join(currentDir, 'rules', 'v0_1.json');
    const raw = fs.readFileSync(rulesPath, 'utf-8');
    return JSON.parse(raw) as PolicyRulePack;
}

export interface PolicyEvaluateOptions {
    rulesOverride?: PolicyRulePack;
    policyVersion?: string;
}

export interface PolicyEngineMetadata {
    version: string;
    fingerprint: string;
}

export class PolicyEngine {
    private readonly pack: PolicyRulePack;

    constructor(rulePack?: PolicyRulePack) {
        this.pack = rulePack || loadDefaultPack();
    }

    evaluate(context: PolicyContext, options?: PolicyEvaluateOptions): PolicyDecision {
        const pack = options?.rulesOverride || this.pack;
        const ordered = sortRules(pack.rules || []);
        for (const rule of ordered) {
            if (!matches(rule.when, context)) continue;
            return {
                id: decisionId(),
                action: rule.then.action,
                reason: rule.then.reason,
                constraints: rule.then.constraints,
                log_level: rule.then.log_level || pack.defaults.log_level,
                matched_rule_id: rule.id,
                policy_version: String(options?.policyVersion || pack.version),
            };
        }

        return {
            id: decisionId(),
            action: pack.defaults.action,
            reason: 'No matching rule. Fallback to defaults.',
            log_level: pack.defaults.log_level,
            matched_rule_id: undefined,
            policy_version: String(options?.policyVersion || pack.version),
        };
    }

    fingerprint(): string {
        const serialized = JSON.stringify(this.pack);
        return crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16);
    }

    version(): string {
        return String(this.pack.version);
    }

    rulePack(): PolicyRulePack {
        return JSON.parse(JSON.stringify(this.pack)) as PolicyRulePack;
    }

    metadata(): PolicyEngineMetadata {
        return {
            version: this.version(),
            fingerprint: this.fingerprint(),
        };
    }
}

let policyEngineSingleton: PolicyEngine | null = null;

export function getPolicyEngine(): PolicyEngine {
    if (!policyEngineSingleton) {
        policyEngineSingleton = new PolicyEngine();
    }
    return policyEngineSingleton;
}

export function resetPolicyEngineForTests(): void {
    policyEngineSingleton = null;
}

export function getPolicyEngineMetadata(): PolicyEngineMetadata {
    return getPolicyEngine().metadata();
}

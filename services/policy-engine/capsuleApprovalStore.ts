import crypto from 'node:crypto';

export type CapsuleApprovalStatus = 'WAITING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CapsuleApprovalRecord {
    token: string;
    status: CapsuleApprovalStatus;
    created_at: number;
    updated_at: number;
    expires_at: number;
    policy_decision_id: string;
    reason: string;
    request_fingerprint?: string;
}

export interface CreateCapsuleApprovalInput {
    policy_decision_id: string;
    reason: string;
    expires_at?: number;
    request_fingerprint?: string;
}

export interface CapsuleApprovalDecisionInput {
    token: string;
    decision: 'approve' | 'reject';
}

function now(): number {
    return Date.now();
}

function normalizeDecision(value: string): 'approve' | 'reject' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'approve' || normalized === 'approved') return 'approve';
    if (normalized === 'reject' || normalized === 'rejected') return 'reject';
    throw new Error('Invalid capsule approval decision');
}

export class CapsuleApprovalStore {
    private readonly records = new Map<string, CapsuleApprovalRecord>();
    private readonly defaultTtlMs: number;

    constructor(defaultTtlMs = 15 * 60 * 1000) {
        this.defaultTtlMs = Math.max(60_000, Number(defaultTtlMs || 0));
    }

    private markExpired(record: CapsuleApprovalRecord): CapsuleApprovalRecord {
        if (record.status === 'WAITING' && record.expires_at <= now()) {
            const next: CapsuleApprovalRecord = {
                ...record,
                status: 'EXPIRED',
                updated_at: now(),
            };
            this.records.set(record.token, next);
            return next;
        }
        return record;
    }

    private purgeExpiredInternal(): void {
        for (const [token, record] of this.records.entries()) {
            if (record.expires_at <= now() && record.status === 'WAITING') {
                this.records.set(token, {
                    ...record,
                    status: 'EXPIRED',
                    updated_at: now(),
                });
            }
        }
    }

    createPending(input: CreateCapsuleApprovalInput): CapsuleApprovalRecord {
        this.purgeExpiredInternal();
        const createdAt = now();
        const expiresAt = input.expires_at && input.expires_at > createdAt
            ? input.expires_at
            : createdAt + this.defaultTtlMs;
        const token = crypto.randomUUID();
        const record: CapsuleApprovalRecord = {
            token,
            status: 'WAITING',
            created_at: createdAt,
            updated_at: createdAt,
            expires_at: expiresAt,
            policy_decision_id: String(input.policy_decision_id || '').trim() || 'unknown',
            reason: String(input.reason || '').trim() || 'Approval required',
            request_fingerprint: input.request_fingerprint,
        };
        this.records.set(token, record);
        return record;
    }

    get(token: string): CapsuleApprovalRecord | undefined {
        const key = String(token || '').trim();
        if (!key) return undefined;
        const record = this.records.get(key);
        if (!record) return undefined;
        return this.markExpired(record);
    }

    decide(input: CapsuleApprovalDecisionInput): CapsuleApprovalRecord {
        const token = String(input.token || '').trim();
        if (!token) throw new Error('Missing token');
        const current = this.get(token);
        if (!current) throw new Error('Capsule approval token not found');
        if (current.status === 'EXPIRED') {
            throw new Error('Capsule approval token expired');
        }
        if (current.status === 'APPROVED' || current.status === 'REJECTED') {
            return current;
        }

        const decision = normalizeDecision(input.decision);
        const next: CapsuleApprovalRecord = {
            ...current,
            status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
            updated_at: now(),
        };
        this.records.set(token, next);
        return next;
    }

    ensureApproved(token: string, fingerprint?: string): CapsuleApprovalRecord {
        const record = this.get(token);
        if (!record) throw new Error('Capsule approval token not found');
        if (record.status === 'EXPIRED') throw new Error('Capsule approval token expired');
        if (record.status !== 'APPROVED') throw new Error('Capsule approval not granted');
        if (fingerprint && record.request_fingerprint && record.request_fingerprint !== fingerprint) {
            throw new Error('Capsule approval token does not match current request');
        }
        return record;
    }

    purgeExpired(): void {
        this.purgeExpiredInternal();
    }
}

let capsuleApprovalStoreSingleton: CapsuleApprovalStore | null = null;

export function getCapsuleApprovalStore(): CapsuleApprovalStore {
    if (!capsuleApprovalStoreSingleton) {
        const ttl = Number(process.env.CAPSULE_APPROVAL_TTL_MS || 0);
        capsuleApprovalStoreSingleton = new CapsuleApprovalStore(ttl > 0 ? ttl : undefined);
    }
    return capsuleApprovalStoreSingleton;
}

export function resetCapsuleApprovalStoreForTests(): void {
    capsuleApprovalStoreSingleton = null;
}


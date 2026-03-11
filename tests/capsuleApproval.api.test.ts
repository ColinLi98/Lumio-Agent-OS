import { beforeEach, describe, expect, it } from 'vitest';
import handler from '../api/super-agent/capsule-approval';
import {
    getCapsuleApprovalStore,
    resetCapsuleApprovalStoreForTests,
} from '../services/policy-engine/capsuleApprovalStore.js';

type MockReq = {
    method: string;
    body?: any;
    query?: Record<string, unknown>;
};

type MockRes = {
    statusCode: number;
    payload: any;
    headers: Record<string, string>;
    status: (code: number) => MockRes;
    json: (payload: any) => MockRes;
    setHeader: (key: string, value: string) => void;
    end: () => void;
};

function createMockRes(): MockRes {
    return {
        statusCode: 200,
        payload: undefined,
        headers: {},
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.payload = payload;
            return this;
        },
        setHeader(key: string, value: string) {
            this.headers[key] = value;
        },
        end() {
            // no-op
        },
    };
}

describe('capsule approval api', () => {
    beforeEach(() => {
        resetCapsuleApprovalStoreForTests();
    });

    it('returns 400 when token is missing', async () => {
        const req: MockReq = {
            method: 'POST',
            body: {
                decision: 'approve',
            },
        };
        const res = createMockRes();
        await handler(req as any, res as any);
        expect(res.statusCode).toBe(400);
        expect(res.payload?.success).toBe(false);
    });

    it('approves token and allows querying status', async () => {
        const store = getCapsuleApprovalStore();
        const pending = store.createPending({
            policy_decision_id: 'decision_1',
            reason: 'Approval required',
            request_fingerprint: 'fp_1',
        });

        const approveReq: MockReq = {
            method: 'POST',
            body: {
                token: pending.token,
                decision: 'approve',
            },
        };
        const approveRes = createMockRes();
        await handler(approveReq as any, approveRes as any);
        expect(approveRes.statusCode).toBe(200);
        expect(approveRes.payload?.status).toBe('APPROVED');

        const statusReq: MockReq = {
            method: 'GET',
            query: {
                token: pending.token,
            },
        };
        const statusRes = createMockRes();
        await handler(statusReq as any, statusRes as any);
        expect(statusRes.statusCode).toBe(200);
        expect(statusRes.payload?.status).toBe('APPROVED');
    });
});


import { describe, expect, it } from 'vitest';
import handler from '../api/policy-engine/metadata';

type MockReq = {
    method: string;
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

describe('policy engine metadata api', () => {
    it('returns policy version and fingerprint', async () => {
        const req: MockReq = { method: 'GET' };
        const res = createMockRes();
        await handler(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload?.success).toBe(true);
        expect(typeof res.payload?.policy_version).toBe('string');
        expect(typeof res.payload?.policy_fingerprint).toBe('string');
        expect(res.payload.policy_fingerprint.length).toBeGreaterThanOrEqual(8);
    });
});


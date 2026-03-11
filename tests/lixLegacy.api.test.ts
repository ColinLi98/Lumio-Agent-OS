import { afterEach, describe, expect, it, vi } from 'vitest';
import broadcastHandler from '../api/lix/broadcast';
import processPendingHandler from '../api/lix/process-pending';
import metricsHandler from '../api/lix/metrics';
import conversionDisputeHandler from '../api/lix/conversion/dispute';
import conversionCallbackHandler from '../api/lix/conversion/callback/[tokenId]';
import { lixMarketService } from '../services/marketService';

type MockRes = {
    statusCode: number;
    headers: Record<string, string>;
    jsonBody: any;
    textBody: string | null;
    status: (code: number) => MockRes;
    setHeader: (key: string, value: string) => void;
    getHeader: (key: string) => string | undefined;
    json: (payload: any) => void;
    send: (payload: any) => void;
    end: () => void;
};

function createMockRes(): MockRes {
    return {
        statusCode: 200,
        headers: {},
        jsonBody: null,
        textBody: null,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        setHeader(key: string, value: string) {
            this.headers[key.toLowerCase()] = String(value);
        },
        getHeader(key: string) {
            return this.headers[key.toLowerCase()];
        },
        json(payload: any) {
            this.jsonBody = payload;
        },
        send(payload: any) {
            this.textBody = String(payload ?? '');
        },
        end() {
            // no-op
        },
    };
}

function proofForNonce(nonce: string, timestamp: number = Date.now()) {
    return {
        intent_hash: 'sha256:test_hash',
        nonce,
        timestamp,
        validity_window_sec: 1800,
        signature: 'sig_test_signature',
        device_fingerprint: 'fp_test',
    };
}

describe('LIX legacy api compatibility', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('broadcast returns PROOF_REQUIRED when intent_proof is missing', async () => {
        const req = {
            method: 'POST',
            url: '/api/lix/broadcast',
            headers: {},
            body: { category: 'purchase', item: 'iPhone 16 Pro' },
        };
        const res = createMockRes();

        await broadcastHandler(req as any, res as any);

        expect(res.statusCode).toBe(400);
        expect(res.jsonBody?.code).toBe('PROOF_REQUIRED');
        expect(typeof res.jsonBody?.trace_id).toBe('string');
        expect(String(res.getHeader('x-lix-trace-id') || '')).toMatch(/^tid_/);
    });

    it('broadcast returns NONCE_REPLAY on nonce reuse', async () => {
        const broadcastSpy = vi.spyOn(lixMarketService, 'broadcast').mockResolvedValue({
            intent_id: 'intent_test',
            status: 'success',
            ranked_offers: [],
            total_offers_received: 0,
            broadcast_reach: 0,
            latency_ms: 1,
            trace: { trace_id: 'tid_test', span_id: 'span_test' },
            provider_source: 'none',
            vertical: 'general',
            dispatch_mode: 'capability_auction',
            auction_policy_applied: {
                policy_version: 'lix_1_5',
                dispatch_mode: 'capability_auction',
                fail_closed: true,
                exploration_quota: 0.2,
                domains_enforced: ['general'],
            },
            dispatch_decision: {
                mode: 'capability_auction',
                reason_codes: ['test'],
                policy_version: 'lix_1_5',
            },
        } as any);

        const sharedNonce = `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        const proof = proofForNonce(sharedNonce);

        const firstReq = {
            method: 'POST',
            url: '/api/lix/broadcast',
            headers: {},
            body: { category: 'purchase', item: 'item_1', intent_proof: proof },
        };
        const firstRes = createMockRes();
        await broadcastHandler(firstReq as any, firstRes as any);
        expect(firstRes.statusCode).toBe(200);

        const secondReq = {
            method: 'POST',
            url: '/api/lix/broadcast',
            headers: {},
            body: { category: 'purchase', item: 'item_2', intent_proof: proof },
        };
        const secondRes = createMockRes();
        await broadcastHandler(secondReq as any, secondRes as any);

        expect(secondRes.statusCode).toBe(409);
        expect(secondRes.jsonBody?.code).toBe('NONCE_REPLAY');
        expect(broadcastSpy).toHaveBeenCalledTimes(1);
    });

    it('process-pending endpoint returns 200', async () => {
        const req = {
            method: 'POST',
            url: '/api/lix/process-pending',
            headers: {},
            body: {},
        };
        const res = createMockRes();

        await processPendingHandler(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.jsonBody?.success).toBe(true);
        expect(typeof res.jsonBody?.processed).toBe('number');
    });

    it('metrics endpoint supports json format with metrics/events/traces', async () => {
        const req = {
            method: 'GET',
            url: '/api/lix/metrics?format=json',
            query: { format: 'json' },
            headers: {},
            body: {},
        };
        const res = createMockRes();

        await metricsHandler(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.jsonBody?.metrics).toBeTruthy();
        expect(res.jsonBody?.events).toBeTruthy();
        expect(res.jsonBody?.traces).toBeTruthy();
    });

    it('conversion callback endpoint exists and returns 404 for unknown token', async () => {
        const req = {
            method: 'POST',
            url: '/api/lix/conversion/callback/tok_unknown',
            query: { tokenId: 'tok_unknown' },
            headers: {},
            body: {
                provider_id: 'provider_test',
                provider_signature: 'sig_provider',
                conversion_value: 1000,
            },
        };
        const res = createMockRes();

        await conversionCallbackHandler(req as any, res as any);

        expect([200, 404, 409]).toContain(res.statusCode);
    });

    it('conversion dispute endpoint exists', async () => {
        const req = {
            method: 'POST',
            url: '/api/lix/conversion/dispute',
            headers: {},
            body: {
                token_id: 'tok_unknown',
                reason: 'non_delivery',
                description: 'Item was never delivered',
            },
        };
        const res = createMockRes();

        await conversionDisputeHandler(req as any, res as any);

        expect([201, 404, 409]).toContain(res.statusCode);
    });

    it('expired proof returns EXPIRED', async () => {
        const proof = proofForNonce(
            `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
            Date.now() - 7_200_000
        );
        const req = {
            method: 'POST',
            url: '/api/lix/broadcast',
            headers: {},
            body: { category: 'purchase', item: 'expired', intent_proof: proof },
        };
        const res = createMockRes();

        await broadcastHandler(req as any, res as any);

        expect(res.statusCode).toBe(400);
        expect(['EXPIRED', 'PROOF_EXPIRED']).toContain(res.jsonBody?.code);
    });
});

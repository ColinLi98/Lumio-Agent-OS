import { describe, expect, it } from 'vitest';
import settlementHandler from '../api/lix/settlement/[action]';
import { settlementService } from '../services/settlementService';

describe('lix settlement api', () => {
  it('supports bond status -> lock -> slash flow', async () => {
    const providerId = `provider_${Date.now()}_bond`;
    settlementService.topUpBond(providerId, 1200);

    const lockResp = await settlementHandler(
      new Request('http://localhost/api/lix/settlement/bond/lock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent_id: `intent_${Date.now()}`,
          offer_id: `offer_${Date.now()}`,
          provider_id: providerId,
          amount: 500,
          reason: 'test_lock',
        }),
      })
    );
    const lockPayload = await lockResp.json();
    expect(lockResp.status).toBe(200);
    expect(lockPayload.success).toBe(true);
    expect(String(lockPayload.trace_id || '')).toMatch(/^(trace_|bond_lock_)/);
    expect(lockPayload.ledger_id).toMatch(/^ledger_/);
    expect(String(lockPayload.bond_lock_id)).toContain('bond_tok_');

    const statusRespAfterLock = await settlementHandler(
      new Request(`http://localhost/api/lix/settlement/bond/status?provider_id=${encodeURIComponent(providerId)}`, {
        method: 'GET',
      })
    );
    const statusAfterLock = await statusRespAfterLock.json();
    expect(statusRespAfterLock.status).toBe(200);
    expect(statusAfterLock.success).toBe(true);
    expect(Number(statusAfterLock.available_balance)).toBe(700);
    expect(Number(statusAfterLock.locked_balance)).toBe(500);

    const slashResp = await settlementHandler(
      new Request('http://localhost/api/lix/settlement/bond/slash', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bond_lock_id: lockPayload.bond_lock_id,
          amount: 300,
          reason: 'test_slash',
        }),
      })
    );
    const slashPayload = await slashResp.json();
    expect(slashResp.status).toBe(200);
    expect(slashPayload.success).toBe(true);
    expect(Number(slashPayload.slashed_amount)).toBe(300);
    expect(String(slashPayload.trace_id || '')).toMatch(/^(trace_|bond_slash_)/);
    expect(slashPayload.ledger_id).toMatch(/^ledger_/);
  });

  it('supports escrow dispute and insurance claim actions', async () => {
    const payload = {
      intent_id: `intent_${Date.now()}`,
      offer_id: `offer_${Date.now()}`,
      provider_id: `provider_${Date.now()}_escrow`,
      amount_cny: 1999,
    };

    const disputeResp = await settlementHandler(
      new Request('http://localhost/api/lix/settlement/escrow/dispute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    const disputePayload = await disputeResp.json();
    expect(disputeResp.status).toBe(200);
    expect(disputePayload.success).toBe(true);
    expect(String(disputePayload.claim_id || '')).toMatch(/^(claim_|ins_tok_)/);
    expect(String(disputePayload.trace_id || '')).toMatch(/^(trace_|insurance_claim_)/);
    expect(disputePayload.ledger_id).toMatch(/^ledger_/);

    const insuranceResp = await settlementHandler(
      new Request('http://localhost/api/lix/settlement/insurance/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    const insurancePayload = await insuranceResp.json();
    expect(insuranceResp.status).toBe(200);
    expect(insurancePayload.success).toBe(true);
    expect(String(insurancePayload.claim_id || '')).toMatch(/^(claim_|ins_tok_)/);
    expect(String(insurancePayload.trace_id || '')).toMatch(/^(trace_|insurance_claim_)/);
    expect(insurancePayload.ledger_id).toMatch(/^ledger_/);
  });
});

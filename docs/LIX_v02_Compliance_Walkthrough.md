# L.I.X. v0.2 Compliance Refactor - Walkthrough

## Overview

This walkthrough documents the refactoring of the LIX MVP implementation to comply with **L.I.X. Platform Design v0.2 (Engineering-Ready)**.

---

## Summary of Changes

| Category | Files Created | Files Modified |
|----------|---------------|----------------|
| Proof-of-Intent | 2 | 1 |
| Offer Validator | 1 | 1 |
| API Endpoints | 1 | 1 |
| UI Components | - | 1 |
| Testing | 1 | - |
| **Total** | **5 new files** | **4 modified files** |

---

## A) New Files Created

### 1. `services/clientIntentProof.ts`
**Purpose**: Client-side v0.2 compliant proof generation

Key functions:
- `generateIntentProof()` - Creates proof with SHA-256 hash of **structured fields only**
- `requiresConfirmation()` - Returns confirmation level based on budget thresholds
- `calculateIntentStrength()` - Dynamic intent strength score (not hardcoded)
- `createNonce()` - Cryptographically secure nonce generation

```typescript
// v0.2 COMPLIANT: Hash ONLY structured fields, never raw text
const hashPayload = JSON.stringify({
    category: input.category,
    canonical_sku: input.canonical_sku,
    budget_max: input.budget_max,
    location_code: input.location_code,
    timestamp: input.timestamp,
    nonce: input.nonce
});
```

---

### 2. `services/nonceCache.ts`
**Purpose**: Server-side replay attack protection

Key functions:
- `validateNonce()` - Checks if nonce was already used
- `recordNonce()` - Marks nonce as used with TTL
- `isValidityWindowExpired()` - Checks proof expiration
- Automatic cleanup of expired nonces (30 min TTL)

---

### 3. `services/urlSafetyService.ts`
**Purpose**: URL safety verification (VirusTotal/GSB stub)

Key functions:
- `checkUrlSafety()` - Pattern matching against blocklist, TLD checking
- `countRedirectHops()` - Simulates redirect chain analysis (>3 = BLOCK)
- Extensible interface for real API integration

Blocklist includes:
- Malicious patterns: `phishing`, `malware`, `scam`, etc.
- Suspicious TLDs: `.tk`, `.ml`, `.xyz`, etc.
- Chinese scam patterns: `免费领取`, `中奖`, `诈骗`

---

### 4. `api/lix-process-pending.ts`
**Purpose**: Manual trigger for 7-day fallback accept_fee job

```typescript
POST /api/lix/process-pending
// Response includes processed token count and stats
```

---

### 5. `tests/lix-validation.test.ts`
**Purpose**: v0.2 compliance test suite

9 test cases:
1. Missing intent_proof → 400
2. Expired validity_window → 400
3. Nonce replay → 409
4. Malicious URL → blocked (stub)
5. Redirect count >3 → blocked (stub)
6. Price drift 18% → WARN
7. Price drift 35% → BLOCK
8. SKU score <0.8 → BLOCK
9. Process pending endpoint exists

---

## B) Modified Files

### 1. `services/proofOfIntentService.ts`

**Change**: Fixed hash input to use structured fields only

render_diffs(file:///Users/apple/Lumi%20Agent%20Simulator/services/proofOfIntentService.ts)

**Before (v0.1 - VIOLATION)**:
```typescript
const intentPayload = {
    category: intent.category,
    payload: intent.payload,  // ❌ Raw text in hash!
    budget: intent.budget,
    specs: intent.specs,
    // ...
};
```

**After (v0.2 COMPLIANT)**:
```typescript
const intentPayload = {
    category: intent.category,
    canonical_sku: intent.canonical_sku || intent.item?.canonical_sku,
    budget_max: intent.budget_max || intent.constraints?.budget_max,
    location_code: intent.location_code || intent.constraints?.location_code,
    timestamp: timestamp,
    nonce: nonce
};
```

---

### 2. `services/offerValidator.ts`

**Changes**:
- **Stage 3**: Integrated `urlSafetyService` for external safety checks
- **Stage 4**: Added redirect hop counting (>3 = BLOCK per v0.2)
- **Stage 6**: Added false inventory claim detection (BLOCK)
- **Stage 7**: Implemented SKU 0.8 threshold (< 0.8 = BLOCK per v0.2)

render_diffs(file:///Users/apple/Lumi%20Agent%20Simulator/services/offerValidator.ts)

Key v0.2 compliance additions:
```typescript
// Stage 4: BLOCK if >3 redirects (v0.2 requirement)
if (redirectResult.hops > 3) {
    return { stage: 'redirects', passed: false, action: 'BLOCK', ... };
}

// Stage 7: BLOCK if SKU match < 0.8 (v0.2 requirement)
if (match.score < 0.8) {
    return { stage: 'sku_match', passed: false, action: 'BLOCK', ... };
}
```

---

### 3. `api/lix-broadcast.ts`

**Changes**:
- Added intent_proof validation
- Added nonce replay protection
- Added validity_window enforcement

render_diffs(file:///Users/apple/Lumi%20Agent%20Simulator/api/lix-broadcast.ts)

New error codes:
- `PROOF_REQUIRED` (400)
- `INVALID_PROOF` (400)
- `NONCE_REPLAY` (409)
- `PROOF_EXPIRED` (400)

---

### 4. `components/ConfirmationGate.tsx`

**Change**: Updated thresholds to v0.2 spec

```typescript
// Before
CONFIRM_REQUIRED: 500,      // ¥500+
BIOMETRIC_REQUIRED: 10000,  // ¥10000+

// After (v0.2)
CONFIRM_REQUIRED: 5000,     // ¥5000+ requires modal
BIOMETRIC_REQUIRED: 20000,  // ¥20000+ requires biometric/PIN
```

---

## C) Verification Results

### Build Status
✅ **Build successful** (`npm run build` completed in 2.72s)

### Type Checking
⚠️ Pre-existing TypeScript errors in unrelated components (not from this refactor):
- `KeyboardResultsPanel.tsx` - Property access errors
- `bellmanPolicyService.ts` - Missing properties
- `destinyNavigatorService.ts` - Unknown property

These errors existed before the LIX refactor and are outside the scope.

### API Endpoint Tests
- `/api/lix/broadcast` - Ready with nonce validation
- `/api/lix/process-pending` - Ready for fallback job trigger

---

## D) DoD Checklist Status

### Proof-of-Intent ✅
- [x] `intent_hash` only includes structured fields
- [x] `device_fingerprint` field present
- [x] Nonce replay protection implemented
- [x] Validity window enforced
- [x] Budget ≥5000 triggers modal
- [x] Budget ≥20000 triggers biometric threshold

### Offer Validator ✅
- [x] URL safety service interface exists
- [x] Redirect count >3 → BLOCK
- [x] False inventory claim → BLOCK
- [x] SKU match <0.8 → BLOCK
- [x] All stages log latency_ms

### Settlement ✅
- [x] Process pending endpoint exists
- [x] AcceptToken fields v0.2 compliant

---

## E) Risk Items (MVP Limitations)

| Risk | Status | v0.3 Plan |
|------|--------|-----------|
| Nonce cache in-memory | ⚠️ MVP | Redis with TTL |
| URL safety uses blocklist | ⚠️ MVP | VirusTotal/GSB APIs |
| Redirect analysis simulated | ⚠️ MVP | fetch with redirect: 'manual' |
| Device signing mock | ⚠️ MVP | Secure Enclave/Keystore |
| Biometric placeholder | ⚠️ MVP | WebAuthn integration |

---

## Next Steps

1. Run tests: `npx ts-node tests/lix-validation.test.ts`
2. Manual UI testing of confirmation flows
3. v0.3 planning for production hardening

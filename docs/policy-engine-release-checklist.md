# Policy Engine Release Checklist

This checklist standardizes end-cloud policy rollout for `policy-engine` so both sides stay in sync.

## 1. Prepare candidate rule pack

1. Edit `services/policy-engine/rules/v0_1.json` (or new version file).
2. Bump the `version` field in the rule pack.
3. Update `services/policy-engine/rules/parity_cases.v0_1.json` if expected behavior changed.

## 2. Run parity gate locally

1. Baseline snapshot check:
   - `npm run check:policy-parity`
2. Candidate vs baseline drift check:
   - `POLICY_PARITY_RULEPACK_PATH=<path-to-candidate-rulepack> npm run check:policy-parity`
3. Required gate:
   - mismatch rate must be `< 1%`.

## 3. Validate metadata handshake

1. Query server metadata:
   - `GET /api/policy-engine/metadata`
2. Confirm clients send:
   - `client_policy_version`
   - `client_policy_fingerprint`
3. Optional strict rollout:
   - set `POLICY_VERSION_STRICT=true` on server
   - or send `require_policy_sync=true` per request.

## 4. Deploy sequence

1. Deploy server with new rules.
2. Verify `policy_sync.status` in `/api/super-agent/execute` responses:
   - should converge to `matched`.
3. Monitor rejection rate for:
   - `policy_version_mismatch`
   - `fingerprint_mismatch`.

## 5. Rollback

1. Revert to previous rule pack version.
2. Re-run `npm run check:policy-parity`.
3. Keep strict policy sync disabled until parity returns to target.

## 6. With agent-kernel staged rollout

1. Control rollout by `SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT` (`5 -> 20 -> 50 -> 100`).
2. Keep `SUPERAGENT_AGENT_KERNEL_ENABLED` unset during staged rollout (avoid forcing 100% too early).
3. Watch these metrics:
   - `agent_kernel_summary.rollout_enabled_rate`
   - `agent_kernel_summary.runtime_failure_rate`
   - `agent_kernel_summary.policy_sync_mismatch`
4. If any gate is breached, set rollout percent to `0` and disable strict sync.
5. See `docs/agent-kernel-rollout-runbook.md` for full operations and thresholds.

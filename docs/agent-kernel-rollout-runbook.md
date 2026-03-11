# Agent Kernel Rollout Runbook (P0)

## Scope
This runbook covers staged rollout for `agent-kernel` under `super-agent` and the policy sync release gate.

## Change Summary
1. `super-agent` now supports deterministic percentage rollout for kernel execution.
2. Policy sync handshake is enforced optionally (`require_policy_sync` request or `POLICY_VERSION_STRICT=true`).
3. Metrics are emitted for routing, runtime outcomes, and policy sync statuses.
4. Dashboard now shows rollout coverage and failure/sync health.

## Feature Flags
1. `SUPERAGENT_AGENT_KERNEL_ENABLED=true`
- Force 100% kernel path.
- Use only after staged rollout is stable.

2. `SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT=<0-100>`
- Deterministic rollout by `user_id` bucket.
- Recommended progression: `5 -> 20 -> 50 -> 100`.

3. `POLICY_VERSION_STRICT=true`
- Reject requests if client/server policy metadata mismatches.
- Enable after policy sync mismatch stays low and clients are upgraded.

## Rollout Steps
1. Pre-check
- `npm run -s typecheck`
- `npm run -s check:policy-parity`
- `npx vitest run tests/agentKernel.api.test.ts tests/superAgentExecute.api.test.ts tests/capsuleApproval.api.test.ts tests/policyEngine.metadata.api.test.ts tests/policyEngine.parity.test.ts`

2. Stage A (5%)
- Set `SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT=5`.
- Keep `SUPERAGENT_AGENT_KERNEL_ENABLED` unset.
- Observe for at least 30 minutes or one peak interval.

3. Stage B (20%)
- Set `SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT=20`.
- Observe at least one full business cycle.

4. Stage C (50%)
- Set `SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT=50`.
- Observe and compare to baseline.

5. Full rollout (100%)
- Either set rollout percent to `100`, or set `SUPERAGENT_AGENT_KERNEL_ENABLED=true` and remove percent control.

## Monitoring and Alert Thresholds
Use `/api/metrics?format=json` or Observability Dashboard.

1. Rollout health
- `agent_kernel_summary.rollout_enabled_rate` should be close to configured percent (allow +/- 2%).

2. Runtime stability
- Alert if `agent_kernel_summary.runtime_failure_rate > 0.05` for 5 min.
- Critical if `> 0.10` for 5 min.

3. Policy sync
- Alert if `agent_kernel_summary.policy_sync_mismatch > 0` persists for 15 min after deploy.
- Alert if `policy_sync_missing_client` climbs unexpectedly after client rollout is complete.

4. Task outcomes
- Track `agent_kernel_summary.tasks_failed / (tasks_done + tasks_failed)`.
- Alert if failure ratio doubles vs previous baseline window.

## Rollback
1. Immediate stop to legacy path
- Set `SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT=0`.
- Ensure `SUPERAGENT_AGENT_KERNEL_ENABLED` is unset/false.

2. Policy strict gate rollback
- Set `POLICY_VERSION_STRICT=false`.

3. Rule pack rollback
- Revert policy rule pack version.
- Re-run `npm run -s check:policy-parity`.

4. Verify recovery
- Confirm new requests show `agent_kernel_rollout.enabled=false`.
- Confirm runtime counters stop increasing except legacy path counters.

## Validation Commands
1. Check routing behavior in response payload:
- `agent_kernel_rollout.enabled`
- `agent_kernel_rollout.rollout_percent`
- `policy_sync.status`

2. Query policy metadata:
- `GET /api/policy-engine/metadata`

3. Query metrics summary:
- `GET /api/metrics?format=json`

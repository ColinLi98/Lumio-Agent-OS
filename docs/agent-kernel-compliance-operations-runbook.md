# Agent Kernel Compliance Operations Runbook

## Purpose
Provide the minimum operator procedure for retention review, deletion-request handling, audit export generation, and manual legal-hold escalation during the controlled enterprise pilot.

## Pilot baseline
- Authoritative truth remains the append-only execution ledger plus bounded task state.
- Retention policy is `PILOT_APPEND_ONLY_NO_DELETE`.
- Destructive delete is not supported in the pilot.
- Legal hold automation is deferred. Hold requests require manual escalation and operator sign-off before any further export or deletion-response action.

## Retention review
1. Check `task.compliance.retention` from the task API or `GET /api/agent-kernel/compliance/summary?task_id=<task_id>`.
2. If `archive_recommended` is `false`, no action is required.
3. If `archive_recommended` is `true`, record the compaction hint and preserve the latest authoritative task snapshot before any off-platform archival handling.
4. Do not delete ledger history. This pilot baseline is archive-only guidance, not destructive retention enforcement.

## Deletion request handling
1. Require an active enterprise admin session.
2. Submit `POST /api/agent-kernel/compliance/deletion-request` with `task_id` and `reason`.
3. If a legal hold is asserted or suspected, set `legal_hold_asserted=true`.
4. Expected pilot outcomes:
   - `DENIED_APPEND_ONLY_POLICY`: destructive delete remains blocked by the frozen pilot retention policy.
   - `DENIED_MANUAL_LEGAL_HOLD_REVIEW`: stop all delete handling and escalate to manual legal review.
5. Use the durable request record as the audit trail for customer and internal follow-up.

## Audit export generation
1. Require an active enterprise admin session.
2. Call `POST /api/agent-kernel/compliance/audit-export` with `task_id`.
3. Confirm the response includes:
   - `manifest_sha256`
   - `bundle_sha256`
   - `section_hashes`
4. Use the returned bundle for bounded audit exchange. The durable record remains the integrity receipt for later verification.
5. Do not append raw secret material or external credential values to any manual export notes.

## Manual legal-hold posture
- Automated hold application and release are not implemented in the frozen pilot.
- Any hold request must be escalated to compliance/legal operations outside the runtime.
- Until manual review is complete:
  - do not attempt destructive delete
  - do not treat audit export as legally cleared for distribution beyond the approved audience

## Escalation triggers
- repeated deletion requests for the same task
- any deletion request carrying `legal_hold_asserted=true`
- discrepancy between manifest hash and recomputed section hashes
- audit export generation failure
- archive recommendation on a task that also has unresolved deletion or hold activity

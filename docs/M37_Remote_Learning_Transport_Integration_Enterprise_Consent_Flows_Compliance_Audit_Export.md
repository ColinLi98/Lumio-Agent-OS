# M37 - Remote Learning Transport Integration (Optional), Enterprise Consent Flows, and Compliance Audit Export

## Context and why M37 is next

M36 introduced a **safe cross-device learning sync** model:
- Only sync **learning artifacts** (objective profile deltas, tuning snapshot metadata, drift aggregates, outcome aggregates)
- Do **not** sync raw prompts, raw user messages, or raw provider payloads
- Respect M35 multi-tenant isolation boundaries by default
- Enforce privacy gating and role-policy gating as real runtime constraints
- Preserve local-first behavior and restore/process-death continuity

The next gap is enterprise production readiness:
- How do learning artifacts move off-device (optional remote transport) without breaking privacy and isolation?
- How does the system capture **explicit consent** (user + enterprise policy) with durable provenance?
- How does an enterprise obtain **auditable, exportable evidence** of what the learning system did (and did not do), including governance decisions?

M37 adds **transport + consent + audit export** as a coherent compliance layer.

---

## Goal

Add a bounded, local-first, backward-compatible compliance layer for learning systems that provides:
1. **Optional remote learning transport** (adapter-ready; still local-first by default)
2. **Enterprise consent flows** (typed, durable, provable, role-aware)
3. **Compliance audit export** (typed export requests/results, redacted and purpose-limited)

This is not a full SaaS backend rollout, and not a console redesign.
It is a typed/runtime compliance boundary extraction and governance hardening pass.

---

## In scope

### 1) Typed consent and data-processing models
Add or strengthen typed concepts such as:
- `ConsentScope` (device / account / workspace / tenant)
- `ConsentAuthority` (user / enterprise-policy / combined)
- `ConsentPurpose` (learning-sync, federated-aggregate, remote-transport, audit-export)
- `ConsentDecision` (allowed / denied / expired / revoked / pending)
- `ConsentProvenance` (who/what granted, freshness, policy source)
- `ConsentRecord` (durable record with timestamps and reason codes)
- `DataCategory` (learning-artifact only categories; explicitly exclude raw content)
- `DataMinimizationRule` (redaction, aggregation-only, no-identifiers)
- `RetentionPolicy` (duration, purge requirements)
- `EnterprisePrivacyPolicySummary` (effective policy snapshot in runtime)

Names may vary, but semantics must be explicit, typed, and durable.

### 2) Optional remote learning transport boundary
Add adapter-ready ports and typed records for remote transport:
- `RemoteLearningTransportPort` (NoOp / LocalDurable / Stub adapter)
- `RemoteLearningEnvelope` (purpose + scope + payload refs; **no raw content**)
- `RemoteLearningBatch` (bounded batch with idempotency key)
- `RemoteLearningAttempt` (attempt records: queued/sent/failed/acked)
- `RemoteLearningDeliveryStatus` (queued/sent/failed/ack_pending/acked)
- `RemoteLearningSyncIssue` (auth/consent/policy/transport failure categories)
- `RemoteLearningAckRecord` (remote ack summary, still optional)

Important: transport is optional and must not block local execution.

### 3) Consent-gated runtime behavior
Consent must gate:
- cross-device learning sync push/pull where applicable
- any remote transport of learning artifacts
- any federated aggregation beyond allowed boundary
- any compliance export operation

Consent gating must also be **role-policy aware** (e.g., restricted roles prevent certain sync/export).

### 4) Compliance audit export
Add typed export models and runtime flow:
- `ComplianceAuditExportRequest` (scope, time range, purposes, redaction level)
- `ComplianceAuditExportFormat` (JSONL, zipped JSON, etc.)
- `ComplianceAuditExportStatus` (queued/running/complete/failed)
- `ComplianceAuditExportResult` (location, counts, hash summary, redaction summary)
- `ComplianceAuditExportBundle` (bounded content: receipts, governance decisions, consent records, learning snapshot metadata)
- `ComplianceAuditExportRedactionPolicy` (no identifiers, aggregated-only, omit sensitive categories)
- `ComplianceAuditExportAccessRecord` (who requested, why, consent basis, authority basis)

Exports must remain consistent with privacy constraints:
- never export raw prompts or raw user messages unless explicitly in scope (default: **out of scope**)
- export should be **purpose-limited and redaction-first**

### 5) Durable audit trail and visibility
Every key event should be durable and queryable:
- consent granted/denied/revoked
- remote transport queued/sent/failed/acked
- audit export requested/generated/downloaded (download may be represented as access record)
- policy gates that block transport/export with typed reason families

Governance and receipt summaries should show concise, readable lines:
- consent status (allowed/denied/pending) for relevant purposes
- remote transport status and top issue if failed
- audit export availability and last export status (internal/developer surfaces)

### 6) Backward compatibility and local-first default
- All new fields must be additive/optional where necessary
- Older history must decode/render unchanged
- No schema rewrite required in this milestone
- Remote transport is **NoOp** by default; system remains fully functional offline

---

## Out of scope

Do not do in M37:
- full remote SaaS learning backend rollout
- full enterprise SSO/SCIM/IdP production integration expansion beyond typed summaries
- broad operator console redesign
- orchestrator rewrite
- broad storage/history rewrite
- exporting raw prompts/raw user messages by default
- unbounded “export everything” behavior

---

## Design principles

1) **Consent is durable truth**
Consent decisions are not UI toggles; they must be typed, durable, and auditable.

2) **Purpose-limited data**
Every remote action must specify purpose; enforcement must be runtime real.

3) **Learning artifacts only**
Transport and exports should use learning artifacts and metadata, not raw content.

4) **Local-first resilience**
Remote transport failure must not block local operation; failures must be visible and auditable.

5) **No silent boundary expansion**
Cross-tenant or cross-workspace propagation requires explicit policy + consent + provenance.

---

## Required runtime behaviors

### A) Consent evaluation pipeline
At decision time, the runtime should compute:
- effective consent decision for the required purpose
- consent authority (user vs enterprise vs combined)
- freshness/expiry and revocation handling
- role-policy gates that further restrict transport/export

### B) Remote transport flow (optional)
- when enabled by policy+consent, create a transport envelope for learning artifacts
- queue batch delivery (bounded)
- record attempts and delivery status durably
- record failures with typed sync issues
- maintain idempotency keys to avoid duplicate uploads

### C) Audit export flow
- export requests must be consent- and policy-gated
- export must apply redaction and purpose limitation
- export must produce a result with hashes and summary counts
- export result must be durable and queryable
- export should be recoverable after process death

---

## Suggested reason-code families

Introduce or strengthen canonical reason families such as:
- `ROLE_CONSENT_GRANTED`
- `ROLE_CONSENT_DENIED`
- `ROLE_CONSENT_REVOKED`
- `ROLE_CONSENT_EXPIRED`
- `ROLE_REMOTE_LEARNING_TRANSPORT_QUEUED`
- `ROLE_REMOTE_LEARNING_TRANSPORT_FAILED`
- `ROLE_REMOTE_LEARNING_TRANSPORT_ACKED`
- `ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_CONSENT`
- `ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_ROLE_POLICY`
- `ROLE_COMPLIANCE_EXPORT_REQUESTED`
- `ROLE_COMPLIANCE_EXPORT_GENERATED`
- `ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_CONSENT`
- `ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_POLICY`

Exact names may vary; requirement is structured, typed, and queryable.

---

## Suggested milestone breakdown

### M37A - Typed consent + export + transport contracts
- Add typed models for consent, transport envelopes/attempts, and audit export requests/results
- Keep everything additive and backward-compatible

### M37B - Runtime consent gating + transport boundary extraction
- Implement consent evaluation in runtime for learning sync/transport/export
- Add RemoteLearningTransportPort with NoOp default and durable attempt records

### M37C - Compliance export generation + visibility
- Implement typed export request -> bundle -> result pipeline
- Add redaction summaries and purpose limitation
- Surface concise visibility in governance/receipt/internal views

### M37D - Tests + docs/status mapping
- Add tests for consent gating, export generation, transport attempt durability, restore continuity
- Update spec/plan/status and memory references

---

## Required tests

Add or update tests for at least:

1. Contract round-trip for consent, transport, and audit-export models (backward compatible).
2. Consent gating blocks remote transport when denied; emits canonical reason family.
3. Consent gating blocks audit export when denied; emits canonical reason family.
4. Role-policy gating blocks export/transport even when consent is present (e.g., restricted role).
5. Remote transport NoOp default does not break local execution and still records local durable state (optional).
6. Export is redaction-first and never includes raw prompt/message categories by default.
7. Restore/process-death continuity: consent records, transport attempts, export requests/results survive restore.
8. Governance summary/formatter shows readable consent/transport/export lines.

---

## Validation commands

Run and keep green:

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

---

## Definition of done

M37 is done when:
1. Typed consent, remote transport, and audit export models exist and are durable.
2. Consent and role-policy gating are real runtime behavior for learning sync/transport/export.
3. Optional remote transport boundary is adapter-ready and local-first by default.
4. Audit export is redaction-first, purpose-limited, and produces durable results with hash/count summaries.
5. Consent/transport/export signals are visible and readable in governance/receipt/internal views.
6. Restore/process-death continuity holds for consent, attempts, and export results.
7. Tests pass and docs/status are updated with exact M37 scope and deferred items.

---

## Implementation checkpoint (2026-03-06)

Status: completed.

Implemented:
- typed enterprise consent models with purpose, authority, scope binding, provenance, expiry/revoke, retention, and enterprise privacy summaries
- optional `RemoteLearningTransportPort` boundary with `NoOp` default plus bounded local/stub implementations and durable envelope/batch/attempt/ack records
- real runtime consent + role-policy gating for learning sync, remote transport, and compliance audit export
- redaction-first compliance audit export request/result/bundle generation with hash summaries, count summaries, receipt/governance snippets, and artifact-only payload rules
- process-death continuity for consent, transport, and audit export records inside the existing additive portfolio-optimization persistence path
- readable governance/receipt/internal formatter output for consent, remote transport, audit export, and enterprise privacy state.

Validation:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

Deferred:
- no full remote SaaS learning backend
- no export of raw prompts/messages by default
- no orchestrator rewrite
- no broad storage/history rewrite
- no broad operator console redesign.

---

## Next milestone after M37

Most natural follow-up:
- **M38 - Remote Transport Connectors (Production), Enterprise Key Management, and End-to-End Compliance Controls**

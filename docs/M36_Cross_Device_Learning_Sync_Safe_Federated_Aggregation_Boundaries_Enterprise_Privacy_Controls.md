# M36 - Cross-Device Learning Sync (Safe), Federated Aggregation Boundaries, and Enterprise Privacy Controls

## Why M36 is next

M33–M35 established a local-first portfolio optimization loop with safety boundaries:

- **M33**: bounded local solver + top‑N candidates + durable schedule selection + explainability
- **M34**: closed-loop learning (feedback → drift → bounded tuning) with snapshot/non-rewrite semantics
- **M35**: multi-tenant objective profiles + learning isolation + safe propagation rules (no cross-tenant contamination by default)

The next missing layer is **cross-device learning sync**.

Right now, learning and tuning can be correct and safe *on a single device*, but enterprise-grade Agent OS requires:
- multi-device continuity (phone + tablet + desktop)
- predictable boundaries between personal vs. enterprise workspaces
- privacy and compliance controls (EU/US enterprise expectations)
- prevention of “silent propagation” of learning across devices or workspaces without auditability

M36 introduces **safe cross-device sync** for learning artifacts (not raw content), and defines **federated aggregation boundaries** and **enterprise privacy controls**.

---

## Goal

Add **typed, durable, policy-governed** cross-device learning sync for:
- optimization outcomes (M33)
- drift + tuning snapshots (M34)
- objective profiles and isolation boundaries (M35)

while preserving:
- local-first default
- additive/backward-compatible contracts
- existing precedence and trust semantics
- “no historical rewrite” snapshot binding
- explicit, auditable privacy modes and opt-ins

---

## Key product outcomes

After M36, the system should be able to:

1. **Sync learning artifacts across devices safely**
   - sync: objective profile updates, tuning snapshots, drift summaries, and outcome feedback aggregates
   - avoid syncing: raw prompts, raw user content, sensitive payloads

2. **Enforce federated aggregation boundaries**
   - aggregation groups are typed (tenant/workspace/role/device-class)
   - cross-tenant aggregation remains off by default (M35)
   - propagation is permitted only via explicit safe rules

3. **Expose enterprise privacy controls**
   - clear modes: local-only, device-sync only, tenant-private, enterprise-private, etc.
   - visibility and audit of what synced and why
   - explicit blocking for PARENT role or sensitive modes (align with existing role data policies)

4. **Provide conflict strategy and provenance**
   - handle concurrent edits/tuning snapshots across devices
   - record conflict resolution decisions (no silent merge of unsafe data)
   - preserve who/what/when provenance for each synced artifact

5. **Preserve restore/replay continuity**
   - sync state survives process death
   - old/new mixed history decodes correctly

---

## In scope

### 1) Typed models for learning sync

Add or strengthen typed concepts such as:

- `LearningSyncMode` (LOCAL_ONLY, DEVICE_SYNC, TENANT_PRIVATE_SYNC, ENTERPRISE_PRIVATE_SYNC, etc.)
- `LearningArtifactType` (OBJECTIVE_PROFILE, TUNING_SNAPSHOT, DRIFT_SUMMARY, OUTCOME_AGGREGATE, etc.)
- `LearningArtifactEnvelope`
- `LearningSyncBatch` / `LearningSyncEnvelope`
- `LearningSyncAttempt` / `LearningSyncStatus`
- `LearningSyncConflict` / `LearningSyncConflictResolution`
- `LearningSyncProvenance` (deviceId, sessionId, operatorId, source, timestamp)
- `LearningSyncPrivacyPolicy` / `LearningSyncRedactionPolicy`
- `FederatedAggregationBoundary`
- `FederatedAggregationGroupKey`
- `FederatedAggregationSummary`
- `FederatedAggregationRule` (allow/deny + constraints)
- `LearningSyncIssue` / `LearningSyncIssueType`

> Names can vary, but these semantics must be explicit and typed.

### 2) Safe artifact selection and redaction rules

Define a strict allowlist of syncable artifacts:
- objective profile deltas
- tuning snapshot metadata (not full sensitive payload)
- drift summary aggregates
- outcome aggregates

Explicitly do **not** sync:
- raw user messages
- raw provider payloads
- raw receipts containing sensitive user content
- any high-risk fields blocked by role policy or enterprise privacy mode

### 3) Federated aggregation boundaries (bounded federation)

Introduce explicit typed boundaries for aggregation:
- per-tenant
- per-workspace
- per-role (optional)
- per-device-class (optional)
- per-enterprise integration boundary (IdP/vault/provider)

Require that aggregation boundaries are **policy-governed** and **auditable**.

### 4) Privacy controls and enterprise governance

Add enforceable privacy controls that affect:
- whether sync is allowed
- which artifacts are syncable
- which aggregation boundaries are allowed
- whether propagation beyond device is allowed
- whether approval is required for certain modes (enterprise policy)

### 5) Local-first adapters + remote-ready ports

As in earlier milestones:
- provide a default local durable adapter (NoOp/LocalDurable)
- provide remote-ready ports for sync transport, but keep local-first behavior the default
- do not build a full production cloud service in this milestone

### 6) Operator/governance visibility

Governance/operator/internal surfaces should show:
- current sync mode
- last sync attempt and status
- last conflict and resolution summary
- aggregation boundary summary
- privacy policy summary
- issues like “sync blocked by privacy policy” or “conflict pending review”

This should remain additive (no broad redesign).

---

## Out of scope

Do not do any of the following in M36:
- full cloud learning platform rollout
- full federated learning with model weight training
- sending raw user content to cloud
- destructive automation
- orchestrator rewrite
- broad storage/history rewrite
- broad operator console redesign

---

## Design principles

1. **Artifacts, not content**
   Only sync minimal learning artifacts with strict redaction.

2. **Policy-first boundaries**
   Aggregation boundaries must be typed and enforced, not implicit.

3. **No silent cross-tenant learning**
   M35 isolation stays intact. Propagation requires explicit safe rules.

4. **Auditable provenance**
   Every sync action has typed provenance and reason codes.

5. **Conflict safety**
   Conflicts are resolved deterministically and visibly; unsafe merges are blocked.

6. **Backward-compatible evolution**
   Additive fields only; old history remains readable.

---

## Runtime behavior requirements

### A) Sync lifecycle

The runtime should support:
- enqueue sync batch
- attempt delivery (NoOp/LocalDurable/Stub ports)
- mark success/failure
- record issues
- record provenance
- persist status across process death

### B) Privacy gating

Before any sync attempt:
- evaluate `LearningSyncPrivacyPolicy` and role data policy
- block sync if policy denies
- record `LearningSyncIssue` with typed reason family

### C) Conflict detection and resolution

If two devices update the same artifact:
- detect conflict by artifact id/version vector or timestamp
- apply conflict strategy:
  - safe merge for additive aggregates
  - last-write-wins only for explicitly safe types
  - require review for risky types
- record `LearningSyncConflictResolution`

### D) Federated aggregation

Aggregate only within explicit boundaries:
- produce typed `FederatedAggregationSummary`
- store as a durable artifact
- attach to governance summaries where relevant

### E) Snapshot binding / non-rewrite semantics

When learning artifacts influence decisions:
- bind decision-time snapshot ids
- later sync must not rewrite past decisions or receipts

---

## Suggested reason code families

Add structured reason code families such as:

- `ROLE_LEARNING_SYNC_ENQUEUED`
- `ROLE_LEARNING_SYNC_BLOCKED_BY_PRIVACY`
- `ROLE_LEARNING_SYNC_BLOCKED_BY_ROLE_POLICY`
- `ROLE_LEARNING_SYNC_DELIVERED`
- `ROLE_LEARNING_SYNC_FAILED`
- `ROLE_LEARNING_SYNC_CONFLICT_DETECTED`
- `ROLE_LEARNING_SYNC_CONFLICT_RESOLVED`
- `ROLE_FEDERATED_AGGREGATION_APPLIED`
- `ROLE_FEDERATED_AGGREGATION_DENIED`

(Exact names may vary, but keep them typed/canonical.)

---

## Suggested milestone breakdown

### M36A — Typed contracts and ports
- introduce typed learning sync and federation boundary contracts
- introduce ports/adapters for sync transport (NoOp/LocalDurable/Stub)
- keep everything additive

### M36B — Runtime gating and conflict handling
- implement privacy gating + role policy gating
- implement conflict detection and typed conflict resolution records
- persist sync status and conflict state

### M36C — Federation boundaries + summaries
- implement aggregation group keying and bounded aggregation summaries
- enforce boundary rules and record denials

### M36D — Visibility + tests + docs
- expose sync mode/status/conflicts/boundaries in governance summaries
- add tests and update spec/plan/status/docs

---

## Required tests

Add or update tests for at least:

1. contract round-trip for learning sync envelopes and federation boundaries
2. privacy gating blocks sync and produces typed issue + readable summary
3. role policy gating blocks sync (e.g., PARENT blocks cloud sync)
4. conflict detection and deterministic conflict resolution behavior
5. additive aggregate merge is allowed only for safe artifact types
6. bounded federation prevents cross-tenant aggregation by default
7. restore/process-death continuity for sync state and conflicts
8. mixed old/new history decode + readable formatter output

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

M36 is done when:
1. typed learning sync + federation boundary contracts exist and are durable
2. sync is artifact-based with strict redaction and privacy gating
3. conflicts are detected and resolved with typed records (no silent unsafe merge)
4. federation boundaries are enforced and denials are auditable
5. governance/internal surfaces show sync mode/status/conflict/boundary summaries
6. restore continuity and backward compatibility are preserved
7. tests and docs/status are updated and passing

---

## Next milestone after M36

The most natural next step is:
- **M37 - Remote Learning Transport Integration (Optional), Enterprise Consent Flows, and Compliance Audit Export**

# M38 - Remote Transport Connectors (Production), Enterprise Key Management, and End-to-End Compliance Controls

## Why M38 is next

M37 established the policy and protocol boundary for:
- optional remote learning transport
- enterprise consent flows
- durable consent, purpose, scope, provenance, minimization, and retention semantics
- compliance audit export with redaction-first behavior
- local-first behavior with remote transport as an adapter-ready extension

The next missing layer is not more policy intent. The next missing layer is **production-grade remote transport execution and key/credential governance**.

At this point, the system can express:
- what is allowed to leave the device/process
- under what consent and enterprise policy conditions
- how to produce redaction-first compliance exports
- how to keep local-first behavior when remote transport is unavailable

What it still cannot fully do is:
- run production-ready remote transport connectors with typed delivery contracts
- manage enterprise-grade key/credential references and usage boundaries for those connectors
- enforce end-to-end compliance controls across consent, transport, key state, audit export, and delivery status
- give operators durable visibility into remote delivery success/failure, key health, compliance block reasons, and remediation state

M38 should close that gap.

---

## Goal

Turn the M37 remote-transport boundary into a production-capable connector and key-management layer with end-to-end compliance controls.

This milestone should add:
1. production-ready remote transport connector contracts and runtime paths
2. enterprise key and credential governance boundaries for transport connectors
3. typed end-to-end compliance gates across consent, policy, key state, transport delivery, and audit export
4. durable operator/governance visibility for connector, delivery, and key/compliance state

This is not a broad console redesign and not a full secret-vault platform rewrite.
It is a typed, additive productionization step.

---

## Core outcome

After M38, the system should be able to answer, durably and audibly:
- which transport connector handled a given outbound learning or compliance export operation
- which key/credential profile or enterprise auth binding was used
- whether delivery succeeded, failed, retried, deduplicated, dead-lettered, or fell back locally
- whether a compliance or key-health gate blocked the operation
- whether the export remained redaction-first and purpose-limited end-to-end
- whether a failure was caused by consent, policy, key health, transport health, or downstream connector response

---

## In scope

### 1. Typed production transport connector models
Add or strengthen typed concepts such as:
- `RemoteTransportConnectorType`
- `RemoteTransportConnectorProfile`
- `RemoteTransportConnectorBinding`
- `RemoteTransportDeliveryRequest`
- `RemoteTransportDeliveryAttempt`
- `RemoteTransportDeliveryStatus`
- `RemoteTransportDeliveryResult`
- `RemoteTransportDeadLetterRecord`
- `RemoteTransportRetryPolicy`
- `RemoteTransportHealthSummary`
- `RemoteTransportFailureReason`

These should turn the current adapter-ready path into a production-capable typed connector boundary.

### 2. Enterprise key / credential governance models
Add or strengthen typed concepts such as:
- `EnterpriseKeyReference`
- `EnterpriseKeyStatus`
- `EnterpriseKeyUsagePolicy`
- `EnterpriseKeyRotationState`
- `EnterpriseKeyHealthSummary`
- `TransportCredentialBinding`
- `TransportCredentialResolutionResult`
- `TransportCredentialBlockReason`
- `TransportCredentialAuditRecord`

These should integrate with the existing enterprise/vault foundations without rewriting them.

### 3. End-to-end compliance gate models
Add or strengthen typed concepts such as:
- `ComplianceGateResult`
- `ComplianceBlockReason`
- `CompliancePathSummary`
- `ComplianceTransportSummary`
- `ComplianceAuditExportRecord`
- `ComplianceDeliveryAuditRecord`

These should tie together:
- consent
- purpose
- minimization
- retention
- key state
- transport connector state
- export result

### 4. Runtime connector and delivery behavior
Support real typed/runtime behavior for:
- connector selection
- connector health gating
- credential/key resolution before delivery
- transport retry / dedupe / dead-letter behavior
- compliance gate evaluation before dispatch
- local-first fallback if configured and allowed

This must be real runtime behavior, not wording-only behavior.

### 5. Operator/governance visibility
Governance/internal surfaces should show, where applicable:
- connector type/profile
- connector delivery status
- retry / dead-letter / dedupe state
- key/credential health summary
- compliance gate result and block reason
- export audit linkage
- local fallback path if used

### 6. Durable history and compatibility
All new fields must remain additive and backward-compatible.
M38 state should survive:
- process death
- restore/replay
- mixed old/new history decoding

---

## Out of scope

Do not do the following in M38:
- full remote SaaS learning backend redesign
- broad operator console redesign
- full enterprise key management platform replacement
- orchestrator rewrite
- broad storage/history rewrite
- weakening of M35 isolation or M36 privacy/federation constraints
- raw prompt/message export by default

---

## Design principles

1. **Local-first remains authoritative**
   Remote transport failure must not silently break local truth.

2. **Consent and policy gates remain hard gates**
   A healthy connector or key cannot override consent or role-policy denial.

3. **Redaction-first remains default**
   Transport must preserve M37’s redaction-first and purpose-limited design.

4. **Typed reasons over ad-hoc logs**
   Delivery failure, key block, compliance block, and fallback must be typed and queryable.

5. **Compatibility first**
   New production connector and key states must fit additively into the current ledger/receipt/governance chain.

---

## Suggested milestone breakdown

### M38A - Typed connector and key models
Implement or strengthen connector, delivery, key, and credential governance types.

**Done when**
- transport connector and key/credential concepts are explicit and typed
- compatibility with current contracts/history is preserved

### M38B - Runtime connector/key gating and delivery flow
Add runtime resolution for connector selection, key/credential state, compliance gates, retry/dedupe/dead-letter, and local fallback.

**Done when**
- delivery behavior is real and typed
- key/credential state can block or degrade delivery
- compliance gate results are durable and readable

### M38C - Governance/receipt visibility
Expose connector, delivery, key, and compliance summaries in governance and receipt surfaces.

**Done when**
- operators can tell what connector ran, what key state applied, why delivery failed or was blocked, and whether fallback was used

### M38D - Tests, docs, and validation
Add or update tests, docs, and milestone status mappings.

**Done when**
- contract/runtime/restore/formatter tests pass
- docs/status accurately reflect M38 scope and deferred items

---

## Required runtime behaviors

### Connector selection and health
The runtime should be able to:
- choose a typed connector profile
- reject or degrade delivery if connector health is not sufficient
- preserve typed health/failure summaries in durable records

### Key and credential gating
The runtime should be able to:
- resolve a typed enterprise key/credential reference
- block delivery if key state is revoked/expired/misconfigured
- allow delivery if key state is healthy and policy permits it
- record the key/credential result in durable, readable summaries

### Compliance gate evaluation
Before dispatch, the runtime should evaluate:
- consent validity
- purpose limitation
- minimization/redaction completeness
- role-policy gates
- tenant/workspace privacy controls
- key and connector eligibility

If blocked, the reason must be durable, typed, and visible.

### Retry, dedupe, dead-letter, fallback
The runtime should support:
- idempotent deduplication
- retry state
- dead-letter outcome
- local fallback when configured and allowed

These states must be durable and readable.

---

## Suggested reason-code families

Add or strengthen canonical structured reason-code families such as:
- `ROLE_REMOTE_TRANSPORT_CONNECTOR_SELECTED`
- `ROLE_REMOTE_TRANSPORT_CONNECTOR_DEGRADED`
- `ROLE_REMOTE_TRANSPORT_DELIVERY_RETRIED`
- `ROLE_REMOTE_TRANSPORT_DELIVERY_DEAD_LETTERED`
- `ROLE_ENTERPRISE_KEY_HEALTH_BLOCKED`
- `ROLE_ENTERPRISE_KEY_ROTATION_REQUIRED`
- `ROLE_ENTERPRISE_KEY_REVOKED`
- `ROLE_COMPLIANCE_GATE_BLOCKED`
- `ROLE_COMPLIANCE_EXPORT_ALLOWED`
- `ROLE_COMPLIANCE_EXPORT_REDACTION_ENFORCED`
- `ROLE_REMOTE_TRANSPORT_LOCAL_FALLBACK_USED`

Exact names may vary, but the reasons must remain typed and durable.

---

## Required tests

Add or update tests for at least:
1. connector/key/compliance contract round-trip compatibility
2. connector selection and delivery status durability
3. revoked/expired/misconfigured key blocks delivery
4. consent or role-policy denial blocks delivery before connector dispatch
5. retry/dedupe/dead-letter behavior is durable and queryable
6. local-first fallback remains functional and visible when remote delivery is unavailable
7. governance and receipt summaries show connector/key/compliance state readably
8. restore/process-death continuity preserves M38 records and summaries
9. mixed old/new history compatibility remains intact

---

## Validation commands

Run and fix failures before marking complete:

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

M38 is done when:
1. remote transport connector and key/credential concepts are typed and durable
2. runtime delivery is gated by consent, policy, connector health, and key state in real typed behavior
3. retry/dedupe/dead-letter/fallback states are durable and readable
4. governance/receipt surfaces show connector, key, and compliance summaries clearly
5. local-first truth remains intact under remote failure
6. restore/replay/process death continuity preserves M38 state
7. backward compatibility is preserved
8. tests and docs/status are updated and passing

---

## Deliverables expected from Codex

At the end of the run, report:
- changed files
- typed connector/key/compliance additions
- runtime delivery and gating changes
- persistence/compatibility changes
- visibility/formatter changes
- tests added or updated
- exact deferred items
- blockers, if any

---

## What comes next

After M38, the next natural milestone is:
- **M39 - Policy-Safe Remote Learning Destinations, Data Residency Controls, and Compliance Export Routing**

---

## Execution checkpoint (2026-03-06)

Status: completed.

Implemented:
- typed production connector, connector-health, retry-policy, enterprise-key, credential-resolution, compliance-gate, delivery-result, and dead-letter contracts on top of the M37 remote transport boundary
- real runtime connector inspection and delivery selection with consent, role-policy, privacy, connector-health, key-health, and credential-resolution gating
- durable retry, dedupe, dead-letter, and local-fallback records while preserving local-first truth under remote failure
- readable governance, receipt, export, and internal portfolio-optimization summaries for connector, key, compliance, fallback, and dead-letter state
- additive persistence and restore continuity for connector profiles, enterprise key references, dead-letter records, and enriched transport attempts.

Validation:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`
- Result: all passed, including connected Android tests on `SM-X916B - 16` (`8` tests).

Deferred:
- no full remote SaaS learning backend or cloud control plane
- no tenant-admin key rotation/orchestration service beyond typed runtime state and gating
- no export of raw prompts/messages by default
- no orchestrator rewrite
- no broad storage/history rewrite
- no broad operator console redesign.

# M35 - Multi-Tenant Objective Profiles, Learning Isolation, and Safe Propagation Rules

## Why M35 is next

M33 delivered an explainable, local-first portfolio optimizer:
- top-N candidate schedules
- bounded objectives and hard constraints
- window-aware + risk-aware scheduling
- durable decision selection + restore continuity
- readable tradeoff explanations and canonical reason families

M34 (next milestone) adds closed-loop learning:
- feedback/outcome records bound to selected schedules
- prediction-vs-actual drift summaries
- bounded tuning suggestions with guardrails
- calibration snapshots (no historical reinterpretation)

Once closed-loop tuning exists, the next critical risk is **cross-tenant contamination**:
- a tuning derived from Tenant A should not silently change behavior for Tenant B
- workspace exceptions must not propagate globally
- unsafe “global averaging” can degrade enterprise trust

M35 introduces a typed, durable learning isolation model and a controlled propagation mechanism to share improvements safely (when allowed).

---

## Goal

Add a typed, durable system for:
1. **isolation** of learning/tuning by tenant/workspace/user/role scope
2. **objective profile versioning** per scope
3. **safe propagation** of learnings across scopes through explicit rules and approvals
4. **readable provenance** explaining where a tuning came from and why it applies

This is not a broad ML platform rewrite. It is a governance layer on top of the existing local-first optimizer and closed-loop tuning.

---

## Core outcomes

After M35, the system should be able to answer:

- Which objective profile is currently active for this request?
- Is tuning applied from user scope, workspace scope, tenant scope, or global baseline?
- What is the provenance of the tuning (local-only, propagated, adopted from pack, approved by operator)?
- Which tunings are eligible to propagate?
- Which tunings are blocked from propagation and why?
- How do we prevent “learning drift” across tenants?

---

## In scope

### 1. Typed scope and isolation models

Add or strengthen typed concepts such as:
- `LearningScope` (USER / WORKSPACE / TENANT / GLOBAL_BASELINE)
- `ObjectiveProfileId` / `ObjectiveProfileVersion`
- `ObjectiveProfileSnapshot`
- `ObjectiveProfileBinding`
- `LearningIsolationPolicy`
- `LearningIsolationDecision`
- `LearningProvenanceSummary`

### 2. Objective profile layering and precedence

Support deterministic composition of objective profiles:

1. explicit task constraints (still highest)
2. role policy (still highest among defaults)
3. user-scope objective profile (if enabled)
4. workspace-scope objective profile (if enabled)
5. tenant-scope objective profile (if enabled)
6. global baseline objective profile
7. contextual heuristics (bounded)
8. model inference (bounded)

Important:
- M35 must preserve existing precedence rules from Role Contract and policy pack governance.
- Objective profiles must never override explicit constraints.

### 3. Safe propagation rules

Add typed propagation concepts such as:
- `PropagationRule`
- `PropagationRuleScope`
- `PropagationEligibilityStatus`
- `PropagationBlockReason`
- `PropagationApprovalRequirement`
- `PropagationApprovalRecord`
- `PropagationAttemptRecord`
- `PropagationAdoptionRecord`

Propagation must be bounded, explicit, and auditable.

Examples of safe propagation patterns:
- USER ➜ WORKSPACE (opt-in only)
- WORKSPACE ➜ TENANT (requires approval)
- TENANT ➜ GLOBAL (generally disabled by default; only via explicit governance program)

### 4. “Learning pack” / distribution artifact

Introduce a typed distribution artifact concept:
- `LearningPatch` or `ObjectiveTuningPatch`
- contains: deltas, evidence summary, guardrails, scope, and version targets
- signed or provenance-tagged (local / operator-approved / enterprise program)

This is not a marketplace feature. It is a governance artifact for safe adoption.

### 5. Drift-aware isolation

Support typed detection for learning drift conditions such as:
- tuning causes increased rollback/dispute rates
- tuning increases risk beyond configured caps
- tuning worsens approval load / capacity pressure
- tuning increases SLA breach probability
- tuning regresses objective tradeoffs for protected cohorts (if such cohorts are represented)

When drift triggers, the system should:
- suppress propagation automatically (safe default)
- require re-approval to continue propagation
- record durable drift events and reasons

### 6. Governance/operator visibility

Add readable summaries to internal surfaces:
- active objective profile scope and version
- tuning provenance (local vs propagated)
- propagation status (eligible / blocked / pending approval / adopted)
- drift alerts related to tuning and propagation
- reason families translating propagation and isolation decisions

### 7. Persistence + compatibility

- All new fields must remain additive and backward-compatible.
- Objective profile snapshots and propagation records must survive process death/restore.
- Past schedule decisions must remain bound to the historical snapshot (no reinterpretation).

---

## Out of scope

Do not do the following in M35:
- global ML platform redesign
- cross-device personalization sync redesign (beyond adding optional provenance)
- broad operator console redesign
- orchestrator architecture rewrite
- destructive automation
- unrestricted custom objective DSL
- automatic cross-tenant propagation without explicit policy and approvals

---

## Design principles

1. **Isolation by default**
   Learnings are local to the smallest safe scope unless explicitly promoted.

2. **Promotion requires evidence**
   Cross-scope adoption must be based on typed evidence and guardrails.

3. **Provenance is always visible**
   Operators should be able to see exactly why a tuning applied.

4. **No historical rewriting**
   Past decisions remain bound to their effective objective profile snapshot.

5. **Local-first remains default**
   Remote propagation is optional; adapters can remain NoOp/stub.

---

## Required runtime behavior

### A. Objective profile resolution
At decision time:
- resolve the effective objective profile snapshot based on scope layering
- attach `objectiveProfileSnapshotId` + `scope` + `provenance` to decision records
- include readable lines in governance/receipt summary surfaces

### B. Feedback binding
When outcomes/feedback arrive:
- bind them to the decision’s objective snapshot
- update drift summaries within the scope only (unless propagation is explicitly enabled)

### C. Propagation evaluation
When propagation is attempted:
- evaluate eligibility under `LearningIsolationPolicy`
- enforce approval requirements (if configured)
- record propagation attempt + adoption outcomes durably
- emit canonical reason families

### D. Automatic suppression on drift
If drift triggers in a scope:
- suppress propagation from that scope
- mark existing propagated patches as “review required”
- record durable drift + suppression events

---

## Canonical reason-code direction

Add or strengthen reason families such as:
- `ROLE_LEARNING_SCOPE_RESOLVED`
- `ROLE_LEARNING_ISOLATION_ENFORCED`
- `ROLE_LEARNING_PROPAGATION_ELIGIBLE`
- `ROLE_LEARNING_PROPAGATION_BLOCKED`
- `ROLE_LEARNING_PROPAGATION_APPROVAL_REQUIRED`
- `ROLE_LEARNING_PROPAGATION_APPROVED`
- `ROLE_LEARNING_PROPAGATION_REJECTED`
- `ROLE_LEARNING_PATCH_ADOPTED`
- `ROLE_LEARNING_PATCH_ROLLED_BACK`
- `ROLE_LEARNING_DRIFT_DETECTED`
- `ROLE_LEARNING_PROPAGATION_SUPPRESSED_BY_DRIFT`

---

## Suggested milestone breakdown

### M35A - Typed scope + objective profile snapshots
- add learning scope and objective profile snapshot bindings
- ensure additive serialization + restore continuity

### M35B - Isolation policy + resolution
- implement deterministic objective profile layering and isolation decisions
- attach provenance to decision records and summaries

### M35C - Propagation rules + approvals
- implement bounded propagation rules, eligibility evaluation, and approval gating
- durable propagation attempt/adoption records

### M35D - Drift suppression + visibility + tests
- drift-triggered propagation suppression
- readable governance/receipt summaries
- tests + docs/status updates

---

## Required tests

Add or update tests covering at least:

1. objective profile resolution precedence (user/workspace/tenant/global)
2. isolation prevents cross-tenant contamination by default
3. propagation eligibility evaluation (allowed vs blocked)
4. approval-required propagation is blocked without approval and durable after approval
5. adoption creates durable records and is visible in summaries
6. drift triggers suppress propagation and mark patches review-required
7. restore/process-death continuity preserves objective profile + provenance + propagation state
8. old/new mixed history remains decodable and readable

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

M35 is done when:
1. objective profiles have typed scope, versioning, and snapshot binding
2. runtime resolves objective profiles deterministically with clear precedence
3. isolation prevents cross-tenant contamination by default
4. propagation rules, approvals, and adoption records exist and are durable
5. drift can suppress propagation with durable reason traceability
6. governance/receipt summaries show objective profile scope/provenance clearly
7. restore/process-death continuity and compatibility remain intact
8. tests and docs/status are updated and passing

---

## What comes next
After M35, the most natural next milestone is:
- **M36 - Cross-Device Learning Sync (Safe), Federated Aggregation Boundaries, and Enterprise Privacy Controls**

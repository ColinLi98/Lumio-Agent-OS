# EPF-8 — Enterprise Sandbox and Guided Scenario Productization

## Why this milestone is next

The platform already has a strong execution and governance core:
- role-aware runtime behavior
- durable receipts and proof-ledger history
- policy / rollout / approval governance
- operator console and workflow handling
- LOCAL_ROLE_LAB as a first-class rehearsal mode
- requester / operator / tenant-admin product surfaces
- explicit non-pilot labeling and activation blocker visibility

What is still missing is a product surface that a customer, sales engineer, design partner, or internal stakeholder can understand quickly without deep platform knowledge.

At the moment, the system is powerful but still too close to an internal control plane. The next step is to turn LOCAL_ROLE_LAB and the existing enterprise shell into a clear, guided, enterprise-facing sandbox product that can:
- demonstrate realistic enterprise workflows
- show role differences clearly
- teach the product through guided execution
- separate rehearsal from real pilot evidence without ambiguity
- make the gap between demo and real pilot activation visible

This milestone is not about adding more governance primitives. It is about making existing capabilities legible, usable, and saleable.

## Goal

Create an enterprise-ready sandbox and guided scenario experience that allows a prospect or internal user to run a realistic multi-role enterprise workflow in 15–30 minutes and clearly understand:
- what the platform does
- which role is doing what
- why the system blocks, approves, or hands off work
- what receipts and proofs are generated
- why LOCAL_ROLE_LAB is rehearsal-only
- what is still needed to move from sandbox to real pilot activation

## In scope

### 1. Enterprise Sandbox home
Add or strengthen a dedicated sandbox home experience that makes the current mode obvious and understandable.

The sandbox home should clearly show:
- current mode: `LOCAL_ROLE_LAB`
- rehearsal-only status
- current scenario
- current active role seat
- current workflow progress
- next recommended action
- non-pilot evidence classification

This should be visible without requiring deep navigation.

### 2. Scenario templates
Introduce or strengthen guided scenario templates for the initial enterprise shell.

At minimum, support three scenario templates:
1. **Advisor Client Intake → Compliance Review → CRM Handoff**
2. **Cross-Boundary Export Review**
3. **Exception / Dispute / Remediation Handling**

Each scenario template should include:
- scenario title and short description
- default actors / role seats
- pre-seeded state
- at least one blocker or governance decision point
- a visible next-step path
- a visible success path and a visible blocked path

### 3. Guided walkthrough layer
Add a lightweight guided walkthrough / progress layer for sandbox scenarios.

This should not be a large tutorial framework. It should be a bounded, productized walkthrough that can show:
- Step 1: requester action
- Step 2: operator action
- Step 3: tenant-admin or policy review action
- Step 4: outcome, blocker, receipt, or proof review

The walkthrough must remain additive and should not replace the underlying runtime truth.

### 4. Strong role-seat visibility
Strengthen visible role-seat switching and role-specific understanding.

The product should make it immediately obvious:
- which seat is active
- what this seat is responsible for
- what changed when the user switched seats
- what this seat is allowed to do next

Support readable role summaries such as:
- `Requester: starts work and reviews results`
- `Operator: handles blockers and advances execution`
- `Tenant Admin: checks environment, access, and readiness`

### 5. Role-specific outcome panels
Each role should see a different primary summary.

At minimum:
- **Requester** sees task status, approval needs, result, and receipt
- **Operator** sees queue state, blockers, timeline, and recommended action
- **Tenant Admin** sees environment truth, actor readiness, connector readiness, activation blockers, and compliance/readiness summaries

These differences must be product-visible, not only internally structured.

### 6. Rehearsal outcome summary
At the end of a scenario, generate a readable rehearsal outcome summary.

It should include:
- scenario name
- role seats involved
- steps completed
- blockers encountered
- receipts / proofs generated
- governance signals triggered
- why this remains non-pilot evidence
- what would be required to perform the same flow in a real pilot

### 7. Demo-to-pilot gap panel
Add a dedicated panel or section that explains the gap between sandbox and real pilot activation.

This panel should explicitly show:
- current evidence classification: non-pilot / rehearsal-only
- current pilot activation blockers
- missing pilot artifacts
- missing external dependencies
- who would need to provide them

The goal is to stop prospects and internal teams from confusing a successful rehearsal with real pilot evidence.

### 8. Searchability and export
Ensure sandbox and scenario state is visible in existing enterprise summary / governance formatting and can be included in internal export or summary paths where appropriate.

Do not promote sandbox activity to pilot evidence.

## Out of scope

This milestone must not do any of the following:
- add new governance primitives for rollout, portfolio, or policy control
- introduce a BPM / workflow DSL
- add destructive automation
- broaden connector / workflow family / deployment mode coverage
- remove the hard boundary between rehearsal and REAL_PILOT evidence
- broadly redesign the operator console
- rewrite the orchestrator or storage architecture

## Product principles

### 1. Show, do not explain
The sandbox should teach through visible workflow state, role differences, and receipts, not through dense documentation.

### 2. Rehearsal is valuable only if clearly bounded
LOCAL_ROLE_LAB and scenario templates should feel realistic, but must never be confused with production or pilot evidence.

### 3. One scenario should be runnable in 15–30 minutes
This should be usable by sales, design partners, internal operators, and non-technical stakeholders.

### 4. Same runtime, better shell
Do not build a fake demo logic path if the real runtime can already support the behavior.

### 5. Make the gap to real pilot explicit
A strong sandbox is not meant to hide the need for real pilot activation. It should make that need more understandable.

## Suggested milestone breakdown

### EPF-8A — Sandbox home and role-seat visibility
- strengthen LOCAL_ROLE_LAB home / header / role seat rail
- make rehearsal-only mode and current role instantly obvious

### EPF-8B — Scenario templates and guided walkthrough
- add the three initial templates
- add bounded walkthrough/progress guidance

### EPF-8C — Role-specific panels and outcome summary
- strengthen requester/operator/tenant-admin outcome surfaces
- add end-of-scenario rehearsal summary

### EPF-8D — Demo-to-pilot gap visibility, tests, and docs
- add explicit demo-to-pilot gap panel
- add visibility / readability tests
- update EPF status docs

## Required surfaces

At minimum, the following product surfaces should exist or be strengthened:
- sandbox home / landing summary
- role selector / seat rail
- scenario selector / scenario card
- requester inbox view
- operator queue or case-summary view
- tenant-admin readiness / activation view
- rehearsal outcome summary
- demo-to-pilot gap panel

## Required scenarios to support in-product

### Scenario 1
**Advisor Client Intake → Compliance Review → CRM Handoff**
- requester initiates intake
- operator completes missing fields or handles blocker
- tenant-admin checks policy/connectors/readiness
- result ends in allowed handoff or blocked state with receipt

### Scenario 2
**Cross-Boundary Export Review**
- user requests a boundary-sensitive export
- system evaluates consent/privacy/residency/destination
- operator sees decision path and export summary

### Scenario 3
**Exception / Dispute / Remediation Handling**
- a failure or dispute path is triggered
- operator uses timeline and action path
- receipts, issue summaries, and remediation signals are visible

## Required tests

Add or update tests for at least:
1. sandbox home visibility and rehearsal-only labeling
2. role-seat switching visibility
3. scenario template rendering and selection
4. role-specific summary differences
5. outcome summary readability
6. demo-to-pilot gap visibility
7. sandbox/non-pilot evidence labeling in formatter/output surfaces
8. no accidental promotion of sandbox artifacts to REAL_PILOT evidence

## Validation commands

Run and keep green:

```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done

EPF-8 is done when:
1. LOCAL_ROLE_LAB is visibly productized as an Enterprise Sandbox
2. at least three guided scenario templates exist and are runnable in-product
3. requester/operator/tenant-admin surfaces are clearly differentiated
4. a readable rehearsal outcome summary exists
5. the gap between sandbox and real pilot activation is explicit in-product
6. sandbox activity is clearly labeled as non-pilot and cannot be mistaken for REAL_PILOT evidence
7. tests and docs are updated and green

## Expected deliverables from Codex

At the end of the run, report:
- changed files
- sandbox / scenario / role-surface changes
- tests added or updated
- what became newly visible in Android and web
- remaining deferred items
- blockers if any

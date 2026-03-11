# EPF-9 - Shared Enterprise Sandbox, Trial Workspace Activation, and Multi-User Rehearsal

## Why EPF-9 is next

EPF-8 established the web-first B-end product shell:
- Enterprise Sandbox home / landing
- scenario cards and guided walkthrough
- role-specific summaries for requester / operator / tenant-admin
- rehearsal outcome summary
- explicit demo-to-pilot gap visibility
- strict non-pilot evidence labeling

The next missing layer is not another scenario template.
The next missing layer is **shared, persistent, enterprise-trial usability**.

Right now, the sandbox is still primarily a one-browser local rehearsal environment.
That is useful for internal understanding and demos, but it is not yet a strong B-end evaluation surface for:
- shared stakeholder walkthroughs
- multi-role handoff realism
- persistent trial workspaces
- evaluative sessions that survive browser refresh or handoff
- sales engineer / prospect / customer-success guided trials

EPF-9 should turn the current Enterprise Sandbox into a **shared trial workspace** that can be used in a realistic B-end evaluation flow without pretending to be a real pilot.

---

## Goal

Add shared, durable, multi-user-oriented sandbox and trial workspace foundations so that enterprise prospects can:
- enter a named trial workspace
- persist and revisit scenario progress
- switch and review role seats with durable state
- share the same trial context across sessions
- inspect task, receipt, handoff, and admin readiness detail more deeply
- stay clearly inside a non-pilot, rehearsal-only boundary

This is still not real pilot activation.
It is a stronger **B-end evaluation and conversion surface**.

---

## Core product outcome

After EPF-9, the platform should support:
1. a **server-backed shared sandbox/trial workspace**
2. durable scenario/task progress across sessions
3. clearer task-detail / receipt / approval / handoff depth inside the sandbox
4. named role-seat assignment semantics for a trial workspace
5. explicit trial-state summaries that support evaluation and conversion to pilot

---

## In scope

### 1. Shared trial workspace model
Add or strengthen typed concepts such as:
- `EnterpriseTrialWorkspace`
- `TrialWorkspaceState`
- `TrialWorkspaceSummary`
- `TrialWorkspaceReadiness`
- `TrialWorkspaceParticipant`
- `TrialWorkspaceRoleSeat`
- `TrialWorkspaceShareLink`
- `TrialWorkspaceSessionSummary`

Exact names may vary, but the semantics must be typed and durable.

### 2. Server-backed sandbox persistence
The sandbox should no longer rely only on one-browser local storage semantics.
Add a durable server-backed persistence path for:
- selected scenario
- role seat state
- task creation within the sandbox
- scenario progression
- rehearsal outcome summary
- role-specific view state where appropriate

This can remain bounded and additive. It does not need to become a full collaborative real-time engine.

### 3. Multi-user / multi-session trial semantics
Support the idea that more than one person can meaningfully use or inspect the same trial workspace over time.
At minimum support:
- named participant records
- seat assignment or seat ownership markers
- durable session continuity
- safe role switching with audit-friendly summaries
- revisit after refresh / re-entry

### 4. Deeper task-detail / receipt / handoff visibility
Expand the B-end sandbox depth beyond the current landing and high-level summaries.
At minimum, provide:
- task detail view
- receipt summary view
- approval / block / next-action detail
- handoff detail
- operator and tenant-admin deeper context panels

These should remain explicitly non-pilot and rehearsal-only.

### 5. Trial-to-pilot conversion surface
Strengthen the existing demo-to-pilot gap into a more actionable conversion surface.
At minimum, show:
- what has been demonstrated
- what remains simulated only
- what is required for real pilot activation
- whether a trial workspace is ready to hand off into a real pilot activation workflow

### 6. Non-pilot integrity
Preserve and strengthen the hard rule:
- sandbox/trial activity must never be promoted to `REAL_PILOT` evidence
- simulator/demo/trial state must remain clearly labeled everywhere relevant
- trial workspace artifacts must not silently appear as live customer execution truth

---

## Out of scope

Do not do the following in EPF-9:
- real pilot activation itself
- full enterprise auth / production account system rollout
- broad Android / C-end evolution
- broad UI redesign
- BPM / DSL
- destructive automation
- orchestrator rewrite
- broad storage/history rewrite
- broad connector/workflow/deployment expansion

---

## Design principles

1. **Trial is not pilot**
   The shared sandbox should feel real enough for evaluation, but must never blur into production or pilot truth.

2. **Durability matters**
   A B-end trial workspace must survive browser refresh, revisit, and handoff.

3. **Multi-role realism without product confusion**
   Role seats, role views, and handoff depth should feel real, but remain safely bounded.

4. **Evaluation over completeness**
   The point is not to reproduce every enterprise behavior; the point is to let enterprise prospects understand how the platform works.

5. **Conversion path clarity**
   Trial-to-pilot readiness must be explicit, not implied.

---

## Required product behavior

### A. Trial workspace creation and persistence
A named trial workspace should be creatable and revisit-able.
It should preserve:
- scenario
- selected role seats
- sandbox task state
- summary outcomes
- key handoff and admin readiness lines

### B. Participant and seat semantics
The platform should represent:
- who is currently acting as requester / operator / tenant-admin in the trial
- whether a seat is unassigned or occupied
- whether the current user is only viewing or also driving the walkthrough

### C. Deeper scenario execution depth
The sandbox should no longer stop at high-level cards only.
It should let evaluators inspect:
- task details
- receipts
- blockers
- approvals
- handoffs
- admin readiness context

### D. Conversion readiness framing
At any time, the trial workspace should make clear:
- this is not pilot evidence
- what remains simulated
- what must be activated externally to move into real pilot

---

## Suggested milestone breakdown

### EPF-9A - Trial workspace model and persistence
- add typed trial workspace and participant/seat models
- add durable server-backed persistence for scenario progress

### EPF-9B - Shared session and seat handling
- support named participant visibility and role-seat state
- preserve session continuity and revisit semantics

### EPF-9C - Task-detail / receipt / handoff deepening
- add deeper task/receipt/approval/handoff panels to the sandbox shell
- keep rehearsal-only boundaries explicit

### EPF-9D - Trial-to-pilot conversion readiness surfacing
- strengthen conversion guidance and missing requirements summary
- make the trial workspace useful for sales/CS/pilot handoff

---

## Required tests

Add or update tests for at least:
1. trial workspace contract round-trip compatibility
2. persistent scenario/task state across refresh/re-entry
3. participant / role-seat visibility and switching semantics
4. task detail / receipt / handoff visibility in sandbox views
5. trial activity remains explicitly non-pilot
6. conversion readiness summary renders correctly
7. old/new mixed records remain compatible if applicable

---

## Validation commands

Run and keep green:

```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

If Android is intentionally out of active B-end scope for this pass, document that clearly and do not make silent assumptions.

---

## Definition of done

EPF-9 is done when:
1. a shared, durable trial workspace exists on the B-end web platform
2. multi-user / multi-session evaluation semantics are represented in a bounded typed way
3. task-detail / receipt / handoff depth is meaningfully stronger than EPF-8
4. the non-pilot boundary remains explicit everywhere relevant
5. trial-to-pilot conversion guidance is actionable and visible
6. tests and docs/status are updated

---

## Deferred after EPF-9

Still deferred after this pass:
- real pilot activation and real live pilot evidence
- full enterprise login / account system
- richer admin workflows beyond bounded trial/productization scope
- Android / C-end product evolution
- broad UI redesign
- BPM / DSL
- destructive automation

## What comes next

After EPF-9, the most natural next step is:
- **EPF-10 - Enterprise Trial Workspace Handoff, Pilot Activation Package Integration, and Conversion Readiness Operations**

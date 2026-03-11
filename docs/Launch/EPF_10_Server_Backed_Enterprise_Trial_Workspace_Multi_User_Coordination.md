# EPF-10 - Server-Backed Enterprise Trial Workspace and Multi-User Coordination

## What this milestone is
EPF-10 moves the B-end Enterprise Sandbox from a browser-origin, multi-tab rehearsal surface into a bounded server-backed trial workspace that multiple invited users can access across browsers and devices.

This is not real pilot activation and not REAL_PILOT evidence.
It is a stronger pre-pilot enterprise evaluation surface.

## Why M10 / EPF-10 is next
EPF-8 established an Enterprise Sandbox with guided scenarios, role-differentiated views, rehearsal summaries, and explicit demo-to-pilot gap visibility.
EPF-9 added shared trial semantics, participant rosters, role seats, trial sessions, deeper task detail, receipt summaries, and multi-session continuity — but only within the same browser origin / local persistence boundary.

The next missing layer is:
- true server-backed workspace persistence
- multi-browser / multi-device trial continuity
- bounded shared access semantics for trial participants
- durable session coordination across seats
- explicit trial invitation / access / handoff behavior

Without this, the sandbox is useful for internal rehearsal and demos, but not yet strong enough for multi-person customer evaluation.

## Goal
Turn the Enterprise Sandbox into a bounded, server-backed, multi-user trial workspace that supports:
- shared workspace persistence
- participant roster and seat coordination across browsers
- durable task/session continuity at the server boundary
- trial invite / access semantics that remain non-pilot
- stronger trial-to-pilot conversion signals

## Core outcome
After EPF-10, a customer-facing B-end trial can support:
1. a shared trial workspace id
2. multiple participants on different browsers/devices
3. role-seat visibility and occupancy
4. shared trial tasks, receipts, handoffs, and next actions
5. durable trial history beyond local browser-only state
6. clear non-pilot labeling and no accidental promotion to REAL_PILOT

## In scope

### 1. Typed trial workspace server-backed models
Add or strengthen typed concepts such as:
- `EnterpriseTrialWorkspaceRecord`
- `EnterpriseTrialWorkspaceAccessGrant`
- `EnterpriseTrialWorkspaceInvite`
- `EnterpriseTrialWorkspaceParticipant`
- `EnterpriseTrialWorkspaceSeatAssignment`
- `EnterpriseTrialWorkspaceSession`
- `EnterpriseTrialWorkspaceActivityRecord`
- `EnterpriseTrialWorkspaceSummary`
- `TrialWorkspaceAccessStatus`
- `TrialWorkspaceConversionGuidanceSummary`

Exact names may vary, but the semantics must be explicit and typed.

### 2. Server-backed persistence for trial workspaces
Move the trial workspace from browser-origin-only durability to a bounded server-backed store.

The server-backed layer should support:
- workspace record persistence
- participant persistence
- seat occupancy and release
- trial task persistence
- receipt / handoff / summary continuity
- restore and reload across browsers/devices

### 3. Multi-user / multi-browser coordination
Support bounded coordination semantics such as:
- participant join
- participant leave
- seat claim
- seat release
- seat conflict state
- active session visibility
- last activity summary

Do not build full real-time collaboration infrastructure in this pass.
Simple durable session coordination is sufficient.

### 4. Trial invite and access semantics
Introduce bounded access semantics for trial workspaces.
This is not full enterprise auth/account rollout.
It should remain a lightweight trial-specific access model.

Support semantics such as:
- invite issued
- invite accepted
- access active
- access expired
- access revoked

This can be tokenized or invite-code based, but it must stay clearly separated from REAL_PILOT identity and from production/pilot activation truth.

### 5. Deeper task and handoff continuity
Make trial task details durable at the server-backed layer, including:
- requester/operator/tenant-admin task context
- handoff summary
- missing fields
- approval summary
- receipt summary
- next action hint

### 6. Trial-to-pilot conversion guidance
Make conversion guidance stronger and more explicit:
- what this trial proves
- what it still does not prove
- what must exist before pilot activation
- which artifacts remain missing for real pilot

## Out of scope
Do not do any of the following in EPF-10:
- real pilot activation
- REAL_PILOT evidence promotion
- full enterprise auth/account/SSO rollout
- broad operator/admin product redesign
- Android / C-end expansion
- BPM/DSL
- orchestrator rewrite
- destructive automation
- broad connector/workflow/deployment expansion

## Product principles
1. **Shared but still bounded**
   This is a stronger trial surface, not production activation.
2. **Durable across browsers**
   Trial evaluation should survive browser changes and multi-person usage.
3. **Role-segmented clarity remains**
   Requester / operator / tenant-admin views should stay distinct.
4. **Non-pilot boundary remains strict**
   Nothing from EPF-10 may be confused with REAL_PILOT proof.
5. **Conversion intent stays visible**
   The product should clearly signal how to go from trial to pilot.

## Suggested milestone breakdown

### EPF-10A - Server-backed workspace records
Add server-backed workspace, participant, seat, and session persistence.

### EPF-10B - Shared task and receipt continuity
Make sandbox task detail, handoff, and receipt continuity survive across browsers.

### EPF-10C - Trial invite and access flow
Add bounded invite/access semantics for shared enterprise trial workspaces.

### EPF-10D - Visibility, tests, and docs
Expose shared trial state clearly and update tests/docs/status.

## Required typed/runtime behavior
At minimum, EPF-10 should support:
- create or restore a shared trial workspace
- see participant roster across browsers
- claim/release role seats durably
- persist trial task detail and summary across sessions
- preserve non-pilot labeling across all surfaces
- surface invite/access status if enabled
- preserve trial-to-pilot gap visibility

## Required test coverage
Add or update tests for at least:
1. trial workspace record round-trip and compatibility
2. participant / seat / session persistence and restore
3. shared task continuity across sessions
4. invite/access lifecycle visibility
5. role-segmented views remain consistent in shared mode
6. non-pilot labeling never regresses
7. trial-to-pilot conversion summary remains visible
8. mixed old/new history compatibility where applicable

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

## Definition of done
EPF-10 is done when:
1. enterprise trial workspaces are durably server-backed
2. multiple participants can access a shared trial workspace across browsers/devices
3. role-seat occupancy and session visibility are durable
4. trial task detail / handoff / receipt continuity survives beyond one browser origin
5. invite/access state exists in a bounded trial-only form
6. trial-to-pilot conversion guidance remains explicit
7. nothing in the workspace can be promoted as REAL_PILOT evidence
8. tests and docs/status are updated and passing

## Deferred after EPF-10
- real pilot activation
- full enterprise auth/account rollout
- richer operator/admin mutation flows
- broad connector/workflow/deployment expansion
- Android / C-end product evolution
- BPM/DSL, destructive automation, orchestrator rewrite, broad UI redesign

## What comes next
After EPF-10, the most natural next step is:
- **EPF-11 - Trial-to-Pilot Activation Handshake, Access Readiness, and Controlled Conversion Flow**

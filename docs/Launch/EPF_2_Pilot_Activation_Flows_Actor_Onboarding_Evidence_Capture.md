# EPF-2 - Pilot Activation Flows, Actor Onboarding, and Real Evidence Capture

## Why this is the next step

The previous enterprise productization foundation slice established:
- explicit environment truth in-product
- simulator/demo/pilot/production labeling
- workspace selector and demo workspace path
- requester inbox / execution inbox shell
- tenant-admin setup / activation visibility
- policy studio summary visibility
- internal operator-shell framing
- explicit “not ready for pilot” blocker visibility

That solved the visibility problem.

What remains unsolved is **actionability**.

The product can now explain why real pilot evidence is missing, but it still cannot reliably help operators and tenant-admins do the work required to activate a real pilot:
- bind a real pilot environment
- verify operator access
- register or confirm a real requester actor
- verify a real tenant-admin/support touchpoint
- check connector/credential readiness for the active pilot scope
- capture and classify real pilot evidence directly from the product path

The next milestone must turn "activation truth" into **activation workflow**.

## Goal

Add the minimum product and runtime support required to make pilot activation operationally actionable inside the product.

This means:
- guided activation flows instead of passive blockers only
- actor onboarding and readiness tracking
- environment/access verification steps with durable status
- bounded real-evidence capture support
- additive, local-first, backward-compatible implementation

This is not a broad UX redesign.
It is the next enterprise shell/productization step.

## Desired product outcome

After EPF-2, the system should be able to do all of the following in-product:
1. show whether pilot activation is blocked
2. show exactly which activation prerequisites are missing
3. let the operator / tenant-admin progress those prerequisites through bounded steps
4. record durable activation-state progress
5. attach real-evidence artifacts to the proper evidence categories when they truly exist
6. clearly distinguish:
   - demo evidence
   - simulated evidence
   - test evidence
   - real pilot evidence

## In scope

### 1. Pilot activation checklist model
Add or strengthen typed models such as:
- `PilotActivationChecklist`
- `PilotActivationItem`
- `PilotActivationItemStatus`
- `PilotActivationOwner`
- `PilotActivationEvidenceRef`
- `PilotActivationBlocker`
- `PilotActivationProgressSummary`

The exact names may vary, but the concepts must be explicit and durable.

At minimum, the checklist should represent these gates:
- real pilot environment binding
- real operator access/session
- named requester actor
- tenant-admin/support touchpoint
- connector/credential readiness for the active pilot scope
- first real task/run artifact

### 2. Actor onboarding and readiness
Add bounded support for:
- requester actor readiness
- operator readiness
- tenant-admin/support readiness

This can remain lightweight, but it must support durable tracking of:
- who is expected
- whether they are confirmed
- whether they were observed in a real path
- whether the actor is still missing

Do not build a full user management product in this pass.

### 3. Activation actions
Add or strengthen product actions such as:
- mark environment binding confirmed
- verify operator session path
- mark requester actor identified
- mark tenant-admin/support channel identified
- mark connector readiness checked
- record first real task/run evidence

Actions must be:
- bounded
- typed
- durable
- auditable

### 4. Real evidence capture support
When a true live pilot artifact exists, the product should support attaching or registering it into a real evidence flow.

At minimum, support typed evidence classification for:
- `DEVICE_SESSION_PROOF`
- `WORKFLOW_ARTIFACT_PROOF`
- `CONNECTOR_CREDENTIAL_PROOF`
- `TENANT_ADMIN_SUPPORT_PROOF`
- `STABILITY_SAFETY_PROOF`

The product must keep the strict rule:
**demo/simulator/test artifacts must never be promoted to real pilot evidence.**

### 5. Visibility in shell surfaces
The existing enterprise shell should now be able to show:
- pilot activation checklist progress
- missing activation prerequisites
- actor readiness summary
- real evidence counts by category
- first missing required item
- next recommended action

Target surfaces:
- Android global environment banner
- WORK requester/execution shell
- SETTINGS tenant-admin setup / activation surface
- internal operator/governance shell
- web shell equivalents where already present

### 6. Durable logging and continuity
Activation checklist state and actor readiness state must survive:
- app restart
- process death
- mixed old/new history

The solution must remain additive and backward-compatible.

## Out of scope

Do not do the following in EPF-2:
- broad visual redesign
- full tenant-admin product
- full identity/admin suite
- broad pilot analytics redesign
- launch scope expansion
- new connectors or workflow families outside the frozen pilot scope
- turning simulator/demo artifacts into pilot evidence
- orchestrator rewrite
- broad storage/history rewrite

## Design principles

### 1. Actionability over more diagnostics
The product already explains blockers. This pass should help close them.

### 2. Real evidence remains sacred
Do not weaken the distinction between real and simulated/test/demo evidence.

### 3. Bounded and local-first
All changes should remain additive and local-first. Remote readiness may still be absent.

### 4. One source of activation truth
The pilot activation checklist should become the primary product truth for whether the pilot is really ready to produce real evidence.

### 5. No fake progress
If no real actor or artifact exists, the product must continue to say so plainly.

## Suggested milestone breakdown

### EPF-2A - Pilot activation checklist and blocker model
Add typed activation checklist, blocker, owner, and evidence reference concepts.

**Done when**
- activation state is represented in typed runtime/product objects
- old/new records remain compatible

### EPF-2B - Actor onboarding and readiness state
Add bounded actor readiness support for requester, operator, and tenant-admin/support.

**Done when**
- actor readiness can be tracked durably
- product can say who is missing and who is confirmed

### EPF-2C - In-product activation actions and evidence capture
Add the bounded actions needed to progress activation and record real evidence when available.

**Done when**
- pilot activation is not only visible but actionable
- real evidence categories can advance through product-supported flows

### EPF-2D - Shell visibility, tests, and docs
Expose readiness/checklist/evidence summaries in the existing shell surfaces.
Update docs and tests.

**Done when**
- shell surfaces show activation progress and next action clearly
- tests cover activation state, evidence classification, and continuity
- docs/status are updated

## Required tests

Add or update tests for at least the following:
1. activation checklist round-trip compatibility
2. actor readiness round-trip compatibility
3. missing actor / missing environment / missing connector readiness summaries
4. real evidence category registration when a true artifact exists
5. simulator/demo artifacts are explicitly blocked from being counted as real pilot evidence
6. shell visibility for activation progress and next action
7. restore/process-death continuity for activation and evidence state
8. old/new mixed history compatibility

## Validation commands

Run and fix failures before completion:

```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done

EPF-2 is done when:
1. a typed pilot activation checklist exists and is durable
2. requester/operator/tenant-admin readiness can be tracked in-product
3. bounded activation actions exist for progressing pilot readiness
4. real evidence categories can be advanced only through true pilot artifacts
5. simulator/demo/test artifacts are explicitly prevented from counting as pilot evidence
6. the enterprise shell can show activation progress, remaining blockers, and next action clearly
7. restore/process-death continuity remains intact
8. docs/status are updated

## Deliverables expected from Codex

At the end, report:
- changed files
- typed activation / actor / evidence additions
- new product actions added
- shell visibility changes
- tests added or updated
- exact deferred items
- blockers, if any

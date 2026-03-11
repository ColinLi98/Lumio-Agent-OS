# EPF-3 - Pilot Environment Binding, Actor Provisioning, and Real Evidence Handoff

## Why EPF-3 is next

EPF-2 established the productization foundation for pilot activation:
- typed actor readiness records
- typed evidence artifact records and category status
- activation checklist items
- remaining blocker summaries
- product-shell activation workflow state
- bounded readiness and evidence registration APIs
- durable persistence across memory / Postgres / Redis
- clear rejection of demo / simulator / test / local synthetic artifacts as real pilot evidence

The next blocker is no longer inside the productization shell itself.
The next blocker is that **the real pilot environment and real pilot actors are still not bound into the product as durable, typed activation truth**.

Right now the system can represent readiness and evidence, but it still lacks a concrete productized path for:
- a real pilot environment binding
- a named requester actor
- a real operator access grant or session handoff
- a real tenant-admin/support channel binding
- a real connector path activation record
- a real pilot activation handshake that converts external access into durable, trusted activation state

That is the purpose of EPF-3.

## Goal

Turn external pilot-access blockers into explicit, typed, product-handled activation flows for:
- pilot environment binding
- actor provisioning and access grants
- connector path activation
- tenant-admin/support channel binding
- real-evidence eligibility handoff

This milestone should make it possible to move from:
- "the pilot exists in theory"

to:
- "the pilot environment, actors, and handoff conditions are durably bound in the product, and real evidence can now be collected through approved activation channels"

## Core outcome

After EPF-3, the system should be able to answer, durably and productically:
- which environment is the real pilot environment
- whether that environment is active, pending, missing, or simulator-only
- who the named requester/operator/tenant-admin actors are
- whether operator access is granted and by what source
- whether the connector path is activated for the pilot
- whether the tenant-admin/support channel is bound
- whether the activation state now allows real evidence to count

## In scope

### 1. Typed pilot environment binding models
Add or strengthen typed concepts such as:
- `PilotEnvironmentBinding`
- `PilotEnvironmentBindingStatus`
- `PilotEnvironmentBindingSource`
- `PilotEnvironmentReadinessSummary`
- `PilotEnvironmentActivationRecord`
- `PilotEnvironmentBlockReason`

These should explicitly distinguish:
- simulator/demo environment
- unbound environment
- real pilot environment
- active vs pending vs blocked vs invalid binding

### 2. Typed actor provisioning and access models
Add or strengthen typed concepts such as:
- `PilotActorIdentity`
- `PilotActorType`
- `PilotActorProvisioningStatus`
- `PilotActorAccessGrant`
- `PilotActorAccessSource`
- `PilotOperatorSessionGrant`
- `PilotRequesterRegistration`
- `PilotTenantAdminChannelBinding`
- `PilotActorActivationSummary`

At minimum, the system must support explicit durable handling for:
- requester
- operator
- tenant-admin/support

### 3. Typed connector activation and handoff models
Add or strengthen typed concepts such as:
- `PilotConnectorActivationRecord`
- `PilotConnectorActivationStatus`
- `PilotConnectorEligibilitySummary`
- `PilotConnectorEvidenceEligibility`

This layer is not about broad connector expansion.
It is about making clear whether the one allowed pilot connector path is active enough that a real connector artifact can count as real pilot evidence.

### 4. Typed activation handoff and gating models
Add or strengthen typed concepts such as:
- `PilotActivationHandshake`
- `PilotActivationHandshakeStatus`
- `PilotActivationGateResult`
- `PilotActivationGateReason`
- `PilotActivationReadinessSummary`

This should compute whether the pilot is now activation-ready based on:
- real environment binding
- real actor provisioning
- real access grants
- connector activation where relevant
- tenant-admin/support binding

### 5. Runtime activation behavior
Support real runtime operations such as:
- bind pilot environment
- register named requester
- register/operator access grant
- bind tenant-admin/support channel
- activate connector path
- compute activation-ready state
- fail closed when the environment remains simulator-only or the actor/access path is not real

### 6. Governance / shell visibility
The product shell and governance summaries should show, in readable English:
- pilot environment bound / missing / simulator-only
- requester ready / missing
- operator access granted / missing
- tenant-admin channel bound / missing
- connector path active / missing
- activation-ready / not-ready and why
- which exact blocker still prevents real evidence collection

## Out of scope

Do not do the following in EPF-3:
- broad UI redesign
- orchestrator rewrite
- broad storage/history rewrite
- new workflow families
- new connectors beyond pilot activation relevance
- fake evidence generation
- simulator evidence promoted as real evidence
- broad enterprise identity platform rollout

## Design principles

1. **Reality over narrative**  
   If the pilot environment or actors are not really available, the system must say so directly.

2. **No fake evidence path**  
   Simulator/demo/test/local synthetic paths must remain ineligible for real pilot evidence.

3. **Activation is typed truth**  
   Environment binding, actor provisioning, and access grants must become durable product state.

4. **Fail closed**  
   Missing real environment or access must block real evidence eligibility.

5. **Additive and backward-compatible**  
   New activation state must layer on top of EPF-2 without rewriting history.

## Required runtime behavior

### A. Real environment binding
The runtime must be able to distinguish and record:
- simulator-only
- no pilot environment
- real pilot environment bound
- real pilot environment active
- real pilot environment blocked

### B. Named actor provisioning
The runtime must be able to record and surface:
- requester registered / missing
- operator granted / missing
- tenant-admin channel bound / missing

### C. Access truth
Operator access must be represented as a typed grant or session handoff, not a vague assumption.
Missing or invalid access must remain a blocker.

### D. Connector eligibility
If the pilot path is expected to include a connector, the runtime must state whether connector activation is sufficient for real evidence eligibility.

### E. Activation-ready decision
The runtime must compute a final typed activation readiness summary such as:
- not ready
- partially ready
- ready for first real task
- blocked by environment
- blocked by actor/access
- blocked by connector eligibility

## Suggested milestone breakdown

### EPF-3A - Environment and actor contracts
Add typed environment binding, actor provisioning, access grant, and tenant-admin channel concepts.

### EPF-3B - Runtime activation operations
Implement real product/runtime paths to bind environment, register actors, grant access, and compute activation readiness.

### EPF-3C - Connector activation eligibility
Add typed connector activation truth and make it part of activation readiness where relevant.

### EPF-3D - Visibility, tests, and docs
Expose readable activation state in shell/governance views and add tests/docs updates.

## Required tests

Add or update tests for at least:
1. real vs simulator environment binding semantics
2. requester/operator/tenant-admin readiness persistence and restore
3. operator access grant required for activation-ready state
4. connector activation eligibility gating
5. activation-ready decision changes when one blocker is cleared
6. demo/simulator/test paths remain ineligible for real evidence
7. backward-compatible decode/render for old records without EPF-3 fields
8. readable activation status lines in web/Android/internal shell summaries

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

EPF-3 is done when:
1. real pilot environment binding is a durable typed product state
2. requester/operator/tenant-admin readiness is a durable typed product state
3. operator access and connector eligibility can materially change activation readiness
4. the shell/governance surfaces clearly show what is still missing for real pilot evidence
5. demo/simulator/test paths remain explicitly blocked from counting as pilot evidence
6. tests and docs are updated and passing

## Expected deliverables from Codex

At the end of the run, report:
- changed files
- typed activation model additions
- runtime activation/binding/access changes
- visibility changes in shell/governance surfaces
- tests added/updated
- exact deferred items
- blockers if any

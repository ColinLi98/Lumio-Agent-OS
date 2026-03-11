# EPF-4 - External Pilot Activation Package, Handoff, and Verified Live Evidence Intake

## Why EPF-4 is next

EPF-2 and EPF-3 moved pilot activation from vague operational language into real product/runtime truth:
- explicit environment binding state
- explicit actor provisioning and access-grant state
- explicit connector activation eligibility
- explicit evidence categories and blocker summaries
- explicit activation-ready decision
- explicit shell visibility on Android and web

The remaining blocker is no longer product ambiguity.
The remaining blocker is **external activation handoff and verified live artifact intake**.

The system can now represent activation state, but it still needs a first-class way to:
- package activation requirements for external owners
- hand those requirements off cleanly
- ingest real external artifacts when they arrive
- verify those artifacts as real pilot evidence
- prevent simulator/demo/test/local-synthetic artifacts from being promoted into pilot truth
- move activation state from "blocked" to "ready" using durable, auditable evidence transitions

This is the missing bridge between the productized activation shell and the real pilot environment.

---

## Goal

Add a typed, durable external pilot activation handoff and evidence-intake layer that can:
1. export a bounded activation package for external owners
2. ingest real external pilot artifacts
3. verify and classify those artifacts
4. promote verified artifacts into real pilot evidence categories
5. update activation-readiness truth without manual reinterpretation

This is **not** a broad new pilot product line.
It is the operational bridge from internal activation state to real external pilot activation.

---

## Core outcome

After EPF-4, the system should be able to answer, durably and auditably:
- what exact external artifact is still missing
- who owns that artifact
- whether the artifact has been requested, received, verified, rejected, or expired
- whether a received artifact counts as real pilot evidence
- why an artifact was rejected
- whether activation-ready state changed because of the new evidence

---

## In scope

### 1. Typed activation package and handoff models
Add or strengthen typed concepts such as:
- `PilotActivationPackage`
- `PilotActivationPackageVersion`
- `PilotActivationRequirement`
- `PilotActivationRequirementStatus`
- `PilotActivationOwner`
- `PilotActivationHandoffRecord`
- `PilotActivationHandoffChannel`
- `PilotActivationReminderState`

The exact names may vary, but the concepts must be explicit and durable.

### 2. Typed external evidence intake models
Add or strengthen typed concepts such as:
- `PilotEvidenceIntakeRecord`
- `PilotEvidenceArtifactEnvelope`
- `PilotEvidenceArtifactType`
- `PilotEvidenceVerificationResult`
- `PilotEvidenceVerificationStatus`
- `PilotEvidenceRejectionReason`
- `PilotEvidencePromotionDecision`
- `PilotEvidencePromotionStatus`
- `PilotActivationStateTransitionRecord`

The system must be able to distinguish:
- requested but not received
- received but unverified
- verified and promoted
- received but rejected
- expired or stale

### 3. Allowed real artifact families
At minimum, support typed intake and verification for these artifact families:
- real pilot environment binding proof
- real operator access/session proof
- named requester proof
- real session/task/run artifact
- real connector or credential path artifact
- real tenant-admin/support touchpoint proof

### 4. Promotion from artifact to evidence category
The runtime should support a real, durable transition:
- artifact received
- artifact verified
- evidence category advanced
- blocker cleared
- activation-ready reevaluated

This must not be a wording-only update.

### 5. Strict source-of-truth and provenance rules
EPF-4 must preserve the hard rule already established:
- `DEMO`
- `SIMULATOR`
- `TEST`
- `LOCAL_SYNTHETIC`

must **not** count as real pilot evidence.

New artifact intake must include typed provenance such as:
- source type
- source channel
- actor or owner
- received timestamp
- optional attestation or verification handle

### 6. Shell / governance visibility
Android and web shell surfaces should be able to show, where relevant:
- activation package progress
- pending external requirements
- owner and due date
- artifact received / verified / rejected
- readable rejection reason
- evidence category change
- activation-ready changed / unchanged and why

### 7. Restore continuity and compatibility
All new fields must remain additive and backward-compatible.
Restore/process death continuity must preserve:
- activation package state
- intake records
- verification status
- promotion status
- blocker clearing state

---

## Out of scope

Do not do the following in EPF-4:
- broad launch checkpoint expansion
- orchestrator rewrite
- BPM/DSL
- destructive automation
- broad operator console redesign
- broad storage/history rewrite
- fake or synthetic artifact generation
- relaxation of the real-evidence rule

---

## Design principles

### 1. Evidence must be promoted, not assumed
A received artifact is not automatically trusted. It must be verified and then promoted.

### 2. External blockers must be explicit and owned
Every remaining blocker should have:
- owner
- due date
- missing artifact type
- current status

### 3. Product truth must be durable
Activation-ready cannot depend on informal operator memory or ad hoc notes.

### 4. Rejection is as important as acceptance
If an artifact is wrong, stale, synthetic, or insufficient, the system must say so durably and clearly.

### 5. Activation should converge
The goal of EPF-4 is to make activation state converge based on real evidence, not to create another observation-only loop.

---

## Required runtime behavior

### A. Activation package creation
The system should be able to create a bounded activation package that includes:
- missing requirements
- owners
- due dates
- expected artifact types
- current blocker summary

### B. External handoff recording
The system should durably record that a requirement was handed off to an external owner or channel.

### C. Artifact intake
The system should support bounded registration of externally provided artifacts with typed provenance.

### D. Artifact verification
The system should evaluate whether an artifact is:
- valid and promotable
- insufficient
- stale
- wrong environment
- wrong actor
- wrong source type
- duplicate / already satisfied

### E. Evidence promotion
Verified artifacts should be able to advance one or more real pilot evidence categories.

### F. Activation-ready reevaluation
After promotion or rejection, the system must recompute activation readiness and blocker state.

---

## Suggested milestone breakdown

### EPF-4A - Typed package and handoff contracts
Add package, requirement, owner, and handoff records.

### EPF-4B - Typed evidence intake and verification
Add artifact intake, verification, rejection, and promotion records.

### EPF-4C - Runtime promotion and blocker clearing
Wire verified artifacts into evidence categories and activation-ready recomputation.

### EPF-4D - Shell visibility, tests, docs
Expose package/intake/verification/progress in shell and governance views. Add tests and update docs/status.

---

## Required tests

Add or update tests for at least:
1. activation package round-trip compatibility
2. requirement owner/due-date persistence
3. real artifact intake round-trip compatibility
4. simulator/demo/test/local-synthetic artifact rejection
5. verified artifact promotion advances evidence category
6. blocker cleared after valid artifact promotion
7. activation-ready recomputation after promotion/rejection
8. restore continuity for package/intake/verification state
9. readable formatter visibility for pending/received/verified/rejected states

---

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

---

## Definition of done

EPF-4 is done when:
1. activation package and requirement state are typed and durable
2. external artifact intake and verification are typed and durable
3. verified artifacts can advance real evidence categories
4. rejected artifacts produce durable, readable reasons
5. activation-ready recomputation happens from typed runtime state, not manual interpretation
6. shell/governance surfaces show package, intake, verification, and promotion progress clearly enough for internal use
7. restore continuity and backward compatibility are preserved
8. docs/status are updated with exact EPF-4 scope and deferred items

---

## Deliverables expected from Codex

At the end of the run, report:
- changed files
- typed package/intake/verification additions
- runtime blocker-clearing/evidence-promotion changes
- shell/governance visibility changes
- tests added or updated
- exact deferred items
- blockers if any

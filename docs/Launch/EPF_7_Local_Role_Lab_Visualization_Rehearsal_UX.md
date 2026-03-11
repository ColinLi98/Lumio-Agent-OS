# EPF-7 - Local Role Lab Visualization and Rehearsal UX

## Why this is next

`LOCAL_ROLE_LAB` now exists as a real product mode with:
- a dedicated workspace mode
- role switching
- role-segmented inbox behavior
- explicit rehearsal-only rules
- clear prevention of promotion into `REAL_PILOT` evidence

However, the current issue is not missing runtime semantics. The issue is **insufficient visibility**.

At the moment, the system may technically know:
- that the user is in `local_lab`
- which role seat is active
- which inbox is being filtered
- that the current artifacts are rehearsal-only

But that is not yet obvious enough in the main UX.

This milestone is therefore not about new governance primitives.
It is about turning `LOCAL_ROLE_LAB` into a visible, understandable, and demonstrable rehearsal shell on both web and Android.

## Goal

Make `LOCAL_ROLE_LAB` unmistakably visible and usable in the main product experience.

A user entering local role lab should immediately understand:
1. this is a rehearsal environment
2. which role seat is currently active
3. which scenario is loaded
4. what changed in the inbox or task view because of the active role
5. which actions are rehearsal-only
6. why none of this counts as `REAL_PILOT` evidence
7. what still blocks real pilot activation

## Non-goal

Do not add new product primitives in this pass.
Do not expand into new connectors, new workflow families, or real pilot execution.
Do not weaken the rule that local lab never counts as `REAL_PILOT` evidence.
Do not perform a broad visual redesign.

## Problem diagnosis

The likely current failure mode is one or more of the following:
- `LOCAL_ROLE_LAB` is technically available but not made visually primary after selection
- the environment banner exists but is too subtle or not sticky enough
- role switching exists but only changes data silently without a strong visible role shell
- seeded demo scenarios exist but are not auto-mounted or obvious on first entry
- role-segmented inboxes are visible only inside secondary panels
- the tenant-admin explanation exists but is buried too deep in the flow
- the user cannot see the handoff chain between requester, operator, and tenant-admin in one place

The result is: the product has the right behavior, but not the right demonstration surface.

## Product direction

Treat `LOCAL_ROLE_LAB` as a **first-class rehearsal shell**, not a hidden mode.

The right mental model is:
- `REAL_PILOT` = truth and evidence
- `LOCAL_ROLE_LAB` = role rehearsal, role handoff understanding, and workflow simulation

This should feel like a role-based rehearsal workspace, not just a banner plus a filtered inbox.

## In scope

### 1. Global Local Role Lab shell header
When `local_lab` is active, show a strong, persistent shell header at the top of the main experience.

Required contents:
- `Local Role Lab`
- clear `Rehearsal only` language
- active role seat
- loaded scenario name
- current evidence classification (`LOCAL_LAB / DEMO / NON-PILOT`)
- one-line explanation that this mode never produces `REAL_PILOT` evidence

This should be visible without entering a deep panel.

### 2. Role seat rail / actor switcher
The current role selector should become more explicit and more central.

Required behavior:
- visible role seat rail for `Requester`, `Operator`, `Tenant Admin`
- current active seat is unmistakable
- switching role immediately updates visible surfaces
- each seat can show readiness state or rehearsal status where available

Optional visual style:
- segmented tabs
- chip bar
- horizontal role rail

### 3. Scenario card / scenario status
The current seeded scenario should be visually represented.

Required contents:
- scenario title
- short description
- workflow family
- current stage or current simulated step
- current role perspective
- last action or next suggested action

This should appear near the top of the `Work` experience when `local_lab` is active.

### 4. Role-segmented inbox visibility
The inbox should visibly reflect the active role.

Required behavior:
- the inbox title changes by role
- the visible tasks/cases change by role
- empty states explain why a role sees nothing
- demo rows are clearly labeled as rehearsal-only

Examples:
- `Requester inbox`
- `Operator queue`
- `Tenant Admin setup / readiness`

### 5. Handoff and role transition timeline
Add a local-lab-visible handoff/timeline view that shows how the same scenario looks across roles.

Required contents:
- requester action
- operator action
- tenant-admin action
- handoff arrows or chronological ordering
- current role viewpoint marker

This can be built as:
- a compact timeline card
- a vertical event list
- a small swimlane-like section

The purpose is to make cross-role workflow simulation tangible.

### 6. Rehearsal evidence / non-pilot classification card
Make the evidence rule explicit in product surface, not just in logs.

Required contents:
- current artifacts are `LOCAL_LAB`, `DEMO`, or `NON-PILOT`
- they are not eligible for `REAL_PILOT` promotion
- short explanation why

This should appear in a small but persistent card or shell section.

### 7. Pilot activation gap box
The product should show why local lab does not equal real pilot.

Required contents:
- environment binding missing or simulated
- requester missing or simulated
- operator session missing or simulated
- tenant-admin touchpoint missing or simulated
- connector path not real or not involved

This is not a blocker for local rehearsal; it is an explanation of what is still missing for real pilot activation.

### 8. Consistent visibility on Android and web
The lab shell should feel coherent across:
- web home / work shell
- Android main activity / enterprise shell cards
- Android activity/operator surfaces where applicable

The user should not need to learn different meanings for the same mode on different platforms.

## Out of scope

- real pilot environment activation
- real connector execution
- real evidence promotion
- new workflow families
- broader operator console redesign
- new governance primitives
- BPM / DSL
- destructive automation

## Concrete implementation targets

### Web
Primary likely targets:
- `LumiAppView.tsx`
- `EnvironmentTruthBanner.tsx`
- `LocalRoleLabActorSelector.tsx`
- `RequesterInboxPanel.tsx`
- `TenantAdminSetupPanel.tsx`
- `agentKernelShellApi.ts`

Preferred additions:
- `LocalRoleLabHeader`
- `LocalRoleLabScenarioCard`
- `LocalRoleLabTimeline`
- `LocalRoleLabEvidenceCard`
- `PilotActivationGapCard`

### Android
Primary likely targets:
- `MainActivity.kt`
- `EnterpriseShellCards.kt`
- `EnterpriseShellFormatter.kt`
- existing activity / work surfaces already used for enterprise shell visibility

Preferred additions:
- a persistent local-lab shell card/header
- role seat rail equivalent
- scenario summary card
- handoff timeline summary card
- non-pilot evidence summary card
- pilot activation gap summary card

## Required UX outcomes

### Outcome 1
When a user switches to `local_lab`, they immediately see that they are in a rehearsal environment.

### Outcome 2
The active role is visible without opening a deep panel.

### Outcome 3
The loaded scenario is visible and readable.

### Outcome 4
The inbox visibly changes by role and the role-specific view is understandable.

### Outcome 5
The handoff chain across roles is visible enough to explain the workflow.

### Outcome 6
The product clearly states that local lab does not count as real pilot evidence.

### Outcome 7
The product clearly states what still blocks real pilot activation.

## Suggested milestone breakdown

### EPF-7A - Primary shell visibility
Add the persistent `Local Role Lab` shell header, scenario summary, and role seat rail.

### EPF-7B - Role-segmented inbox clarity
Make inbox naming, filtering, and empty states role-explicit and easy to understand.

### EPF-7C - Handoff and evidence visibility
Add the handoff/timeline section and non-pilot evidence card.

### EPF-7D - Pilot activation gap visibility + tests/docs
Add the pilot activation gap box, update tests, and sync docs/status.

## Testing expectations

Add or update tests for at least:
1. `local_lab` shell header visibility
2. active role visibility after role switching
3. scenario summary visibility
4. role-segmented inbox label / empty state changes
5. non-pilot evidence labeling
6. pilot activation gap visibility
7. Android/web parity for core local-lab labels

## Definition of done

EPF-7 is done when:
1. `LOCAL_ROLE_LAB` is visually unmistakable in the main experience
2. active role seat is always visible in local lab
3. current scenario is readable without deep drilling
4. role-segmented inbox behavior is obvious and readable
5. handoff/timeline visibility exists in at least one clear shared surface
6. local-lab artifacts are visibly marked as non-pilot everywhere relevant
7. pilot activation blockers are clearly shown in-product
8. tests and docs/status are updated

## Final note

This milestone is about making the rehearsal product legible.
It should help users understand the Agent OS through role-based rehearsal, while making it impossible to confuse rehearsal state with real pilot truth.

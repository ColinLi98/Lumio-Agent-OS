# EPF-11 - Shared Trial Join, Invite Claim, and Persistence Closure

## Why EPF-11 is next

EPF-8 through EPF-10 established the current B-end enterprise platform trajectory:
- Enterprise Sandbox / Guided Scenario productization
- LOCAL_ROLE_LAB as an explicit rehearsal-only mode
- shared trial workspace concepts
- participant roster, role seats, invite creation, session registration, and task continuity
- server-backed trial workspace service and APIs
- strong non-pilot boundaries so sandbox/trial activity never counts as REAL_PILOT evidence

The next gap is no longer product discoverability or local/browser-origin continuity.
The next gap is **true multi-user usability and deployment closure**.

Right now, the product can model a shared trial workspace, but one deployment blocker is still explicit:
- no configured `AGENT_KERNEL_POSTGRES_URL` or `AGENT_KERNEL_REDIS_URL`
- live persistence therefore reports `MEMORY_ONLY`
- true cross-browser / cross-device durability is not fully closed yet

And one product gap is still open:
- invite creation exists, but invite acceptance / participant claim flows are not complete enough for real shared multi-user trialing

That makes EPF-11 the correct next step.

## Goal

Close the minimum remaining gaps required for a truly shareable B-end enterprise trial workspace:
1. invite acceptance and participant claim
2. seat claim / release semantics
3. visible multi-user join path
4. deployment-level persistence closure for real shared trial continuity
5. clear truth about whether the workspace is actually `SERVER_BACKED` or still `MEMORY_ONLY`

This is still not real pilot activation.
This remains explicitly in the enterprise trial / sandbox track.

## Core outcome

After EPF-11, the product should be able to support a true shared trial experience where:
- one person generates an invite
- another person joins and claims the correct role seat
- multiple browsers/devices see the same trial workspace truth
- the product clearly shows whether persistence is truly server-backed
- the workspace remains firmly non-pilot and rehearsal-only

## In scope

### 1. Invite acceptance and participant claim flows
Add or strengthen typed concepts and runtime behavior for:
- invite acceptance
- participant claim
- seat claim
- seat release
- invite expiration or invalidation summary
- duplicate claim rejection
- participant identity summary for the trial context

Exact names may vary, but the semantics must be real and durable.

### 2. Shared trial seat semantics
Support bounded semantics for:
- Requester seat
- Operator seat
- Tenant Admin seat
- unclaimed seat
- claimed seat
- seat already occupied
- seat released / re-claimable

The product should make seat ownership visible and understandable.

### 3. Deployment persistence closure
Close the gap between:
- product-level server-backed modeling
- actual configured persistent deployment

At minimum, support:
- clear detection of configured persistence backend
- graceful fallback when only memory is available
- product-visible explanation of what `MEMORY_ONLY` means
- explicit `SERVER_BACKED_READY` vs `SERVER_BACKED_NOT_CONFIGURED` summaries

### 4. Multi-browser / multi-device shared continuity
The system should support true continuity across:
- more than one browser window
- more than one browser profile if the deployment is truly server-backed
- more than one device where the deployment allows it

This should remain bounded to the enterprise trial workspace and should not imply pilot activation.

### 5. Trial readiness and non-pilot guardrails
Keep and strengthen all existing rules:
- sandbox/trial artifacts are never `REAL_PILOT`
- invite/session/task records are rehearsal-only
- trial-to-pilot gap remains explicit
- no real pilot evidence promotion is allowed from sandbox/trial flows

### 6. Product-shell visibility
The enterprise platform should clearly show:
- trial workspace name and state
- participant roster
- invite status
- claimed vs unclaimed seats
- active sessions
- persistence state (`SERVER_BACKED` or `MEMORY_ONLY`)
- what is still missing for a true shared enterprise trial
- what remains missing for real pilot activation

## Out of scope

Do not do the following in EPF-11:
- real pilot activation
- REAL_PILOT evidence promotion
- full enterprise login/account rollout
- broad connector/workflow/deployment expansion
- Android / C-end delivery work
- BPM / DSL
- orchestrator rewrite
- destructive automation
- broad UI redesign

## Design principles

### 1. Shared trial must be truly shareable
If a second browser/device cannot meaningfully participate, the product should not imply that the trial is fully shared.

### 2. Persistence truth must be explicit
`MEMORY_ONLY` and `SERVER_BACKED` must never be ambiguous.

### 3. Seat ownership must be visible
A user should know whether a role seat is available, claimed, or blocked.

### 4. Trial remains non-pilot
Everything in this track must continue to reinforce that this is enterprise trialing, not live pilot evidence.

### 5. Additive compatibility only
All new typed state and behavior must remain additive and backward-compatible.

## Required runtime behavior

### A. Invite acceptance
The runtime should support accepting a valid invite and creating or linking a participant record.

### B. Seat claim and release
The runtime should support:
- claim seat
- reject claim if already occupied
- release seat
- reflect current seat ownership in durable workspace truth

### C. Shared continuity
When persistence is actually configured, the runtime should support:
- shared trial state surviving browser refresh
- shared trial state visible across independent sessions
- task and handoff continuity across participant sessions

### D. Persistence-state truth
The runtime and shell should explain:
- whether persistence is really server-backed now
- what is degraded or limited when memory-only
- whether cross-browser/device continuity is actually expected

## Suggested milestone breakdown

### EPF-11A - Invite acceptance and participant claim
- add invite acceptance
- add participant claim / seat claim / seat release
- keep state additive and durable

### EPF-11B - Persistence closure and truth signaling
- wire the live persistence state clearly
- close the configured backend path where possible
- surface `SERVER_BACKED` vs `MEMORY_ONLY` clearly

### EPF-11C - Shared multi-user shell visibility
- show claimed seats, roster, invite states, and session continuity clearly
- keep rehearsal-only / non-pilot labeling strong

### EPF-11D - Tests, docs, and continuity
- add/update tests
- update docs/spec/plan/status
- preserve compatibility and restore continuity

## Required tests

Add or update tests for at least the following:
1. invite acceptance round-trip and compatibility
2. participant claim / seat claim / release behavior
3. duplicate seat claim rejection
4. persistence-state visibility and truth
5. multi-session continuity under configured persistence
6. `MEMORY_ONLY` fallback visibility and restrictions
7. non-pilot labeling remains intact throughout the shared trial flow
8. mixed old/new record compatibility remains intact

## Validation commands

Run and keep green:

```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts
```

## Definition of done

EPF-11 is done when:
1. invite acceptance and participant/seat claim flows exist
2. shared trial seat ownership is durable and visible
3. true persistence-state truth is visible and understandable
4. shared trial continuity works as far as the configured backend actually allows
5. the enterprise trial workspace is meaningfully multi-user
6. non-pilot guardrails remain intact
7. tests and docs/status are updated and passing

## Expected deliverables from Codex

At the end of the run, report:
- changed files
- invite/claim/seat additions
- persistence truth/closure changes
- multi-user visibility changes
- tests added or updated
- exact deferred items
- blockers if any

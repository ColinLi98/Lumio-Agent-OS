# Launch 14.13 - Pilot Access Escalation, Environment Activation, and Real Evidence Recovery

## Purpose

Launch 14.12 correctly converted passive HOLD into an explicit bounded remediation package for pilot access enablement.
That package identified a narrower operational blocker set preventing real pilot evidence from being captured.

This step exists to do the next thing that matters:
- escalate the access blockers to named pilot owners
- activate the real pilot environment path
- secure the minimum actor/session material required for a true pilot run
- recover at least the first real live evidence set inside the frozen pilot scope

This is not a product-development milestone.
This is not another docs-only HOLD checkpoint.
This is an operational unblock step.

## Current blocker set

The blocker set carried forward from Launch 14.12 is:

- `WORKSPACE_IS_SIMULATOR_NOT_PILOT_ENV`
- `NO_PILOT_BASE_URL`
- `NO_OPERATOR_SESSION_OR_TOKEN`
- `NO_NAMED_REQUESTER_ACTOR`
- `NO_REAL_SESSION_OR_TASK_ARTIFACT`
- `NO_REAL_CONNECTOR_PATH_ARTIFACT`
- `NO_TENANT_ADMIN_TOUCHPOINT_CHANNEL`
- `NO_REAL_TENANT_ADMIN_TOUCHPOINT`
- `COHORT_ACTIVE_BUT_EVIDENCE_NOT_OBTAINABLE`

These are now treated as explicit pilot-ops blockers, not generic launch friction.

## Scope

### In scope
1. identify and name the actual requester actor
2. identify and confirm the actual operator actor
3. identify and confirm the actual tenant-admin or support actor
4. confirm the real pilot base URL / environment entry point
5. confirm the real operator session/token path
6. confirm whether a real connector path exists in the frozen scope
7. confirm whether a tenant-admin/support touchpoint exists in the frozen scope
8. execute one real pilot task path if access is successfully activated
9. write real evidence or narrowed blockers into the launch logs and closure template

### Out of scope
Do not:
- change frozen pilot scope
- enable new tenants, connectors, workflow families, or deployment modes
- add product features
- reopen broad launch planning
- fabricate evidence from synthetic or local-only simulator paths

## Frozen scope reminder

The pilot remains frozen to:
- `pilot-alpha-prod`
- `pilot-alpha-staging`
- advisor workflow template family
- Okta OIDC + Okta SCIM-like provisioning/shrink
- HashiCorp Vault credential lifecycle
- `generic_https_webhook`
- `advisor_crm_compliance_handoff`
- vendor-managed single-tenant cloud
- one primary region handle
- local-first fail-closed behavior

No expansion is allowed in this step.

## Required execution sequence

### 1. Actor confirmation
By explicit name or durable handle, confirm:
- one requester/business-user actor
- one operator actor
- one tenant-admin or support actor

Record for each:
- handle or name
- owner / team
- whether reachable inside the current pilot window
- whether they can actually perform the scoped pilot action

### 2. Environment activation
Confirm and record:
- real pilot base URL
- real environment identity (must not be simulator-only)
- whether the current workspace/session is pilot-alpha-prod or a non-pilot/simulator path
- any environment mismatch discovered

If the workspace still resolves to a simulator path, this remains a hard blocker.

### 3. Operator access activation
Confirm and record:
- operator login path
- operator token/session path
- whether that token/session is valid for the real pilot environment
- whether operator access is blocked by auth, environment, or missing assignment

### 4. Real pilot task execution attempt
If steps 1-3 succeed, execute exactly one real pilot path and capture:
- device/session proof
- task/run/session identifier
- workflow artifact proof
- receipt/governance reference if produced

### 5. Connector/credential proof attempt
If the real pilot task touches an allowed connector in frozen scope, capture one real connector/credential proof artifact.
If it does not touch a connector, explicitly record that no connector proof was involved in the chosen live path.

### 6. Tenant-admin/support touchpoint attempt
Capture one real tenant-admin or support touchpoint, such as:
- tenant-admin configuration confirmation
- identity/directory acknowledgement
- support/operator-admin exchange tied to the pilot path

### 7. Narrow or clear blockers
At the end of the step, every blocker must be in one of these states:
- cleared
- still active but narrower and explicitly owned
- escalated to named pilot-ops ownership with exact next action

## Evidence advancement rule

This step should only be considered materially successful if it achieves at least one of:

### Success A
Clears the environment and actor access blockers enough to produce:
- one real device/session proof
- one real workflow artifact proof
- one real actor-backed pilot path

### Success B
Does not yet produce full evidence, but materially narrows the blocker set with:
- named actors
- confirmed base URL / environment status
- confirmed operator access path
- confirmed reason a real task still cannot run

### Failure
The blocker set remains broad or ambiguous and no actor/environment/access path was concretely advanced.
If this happens, the result remains `REMEDIATE`, but the escalation path must get stricter and more explicitly owned.

## Trigger rules

### Result = HOLD
Allowed only if:
- at least one of the key access blockers is cleared and the remaining gap is now time-bound rather than ambiguous
- or one real evidence category actually advanced

### Result = REMEDIATE
Use when:
- real pilot evidence is still blocked
- the package remains active
- blocker ownership and next actions are explicit

### Result = ROLLBACK
Use only if:
- a live Sev1 appears
- repeated Sev2 appears
- the frozen pilot path becomes unsafe or invalid to continue

### Result = CLOSURE_READY
Allowed only if:
- access blockers are cleared enough to gather sufficient live pilot evidence breadth
- no launch-blocking severity signals appear
- no active remediation package remains open

## Validation rules

### No validation rerun required
If the step remains purely operational and does not change:
- runtime code
- API behavior
- Android behavior
- host behavior
- launch-critical configuration

### Validation rerun required
If remediation changes any launch-critical configuration or code path, rerun the affected launch-critical suites and record exactly why.

## Definition of done

Launch 14.13 is done when:
1. actor identity is explicitly confirmed or explicitly unavailable by name/handle
2. real pilot environment/base URL state is confirmed and recorded
3. operator access path is confirmed or explicitly denied with reason
4. at least one real pilot task path is attempted under genuine access if unblocked
5. every blocker is either cleared or materially narrowed with an owner and next action
6. the result ends in one of: `HOLD`, `REMEDIATE`, `ROLLBACK`, `CLOSURE_READY`

## Final report format

At the end of the step, report:
- current pilot day and hypercare state
- which blockers were cleared
- which blockers remain
- whether real environment activation succeeded
- whether operator access was activated
- whether a real pilot task path was executed
- which evidence categories advanced
- whether validation rerun was required
- final checkpoint decision
- exact next action

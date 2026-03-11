# Launch 14.14 - Pilot Access Escalation, External Dependency Activation, and Real Evidence Recovery

## Purpose

Launch 14.13 correctly converted vague pilot-evidence failure into a concrete blocker set with named ownership and explicit next action. The remaining problem is no longer ambiguity. The remaining problem is that the frozen pilot still lacks the external dependencies required to produce real live evidence.

This step exists to do the only thing that matters next:
- escalate the unresolved external dependencies to the named owners
- obtain a real pilot environment binding
- obtain a real operator session or token path
- confirm the real requester and tenant-admin/support actors
- recover at least the first real live pilot evidence set

This is not a product-development milestone.
This is not another docs-only HOLD checkpoint.
This is an access-escalation and environment-activation step.

## Current blocker set

The current blocker set is now specific and explicitly owned:
- `SIMULATOR_VERCEL_PROJECT_ONLY`
- `SIMULATOR_BASE_URL_ONLY`
- `NO_PILOT_ENV_BINDING`
- `NO_OPERATOR_SESSION_OR_TOKEN`
- `NO_NAMED_REQUESTER_ACTOR`
- `NO_REAL_SESSION_OR_TASK_ARTIFACT`
- `NO_REAL_CONNECTOR_PATH_ARTIFACT`
- `NO_TENANT_ADMIN_TOUCHPOINT_CHANNEL`
- `NO_REAL_TENANT_ADMIN_TOUCHPOINT`

The previous generic access language has been narrowed. The next step is to resolve or further escalate these blockers with evidence.

## Scope

### In scope
1. escalate pilot access blockers to named owners with explicit deadline
2. confirm whether `pilot-alpha-prod` is actually bound to a non-simulator environment
3. confirm the real production base URL or explicitly record that it does not yet exist
4. confirm one usable operator session/token path
5. confirm one named requester/business-user actor
6. confirm one tenant-admin or support actor and touchpoint channel
7. confirm whether a real connector path exists inside the frozen scope
8. execute one real pilot task path if the environment and access path become available
9. update evidence, incident, feedback, and closure artifacts with hard proof, not inferred narrative

### Out of scope
Do not:
- change frozen pilot scope
- enable new tenants, connectors, workflow families, or deployment modes
- add product features
- reopen broad launch planning
- treat simulator-only runs as real pilot evidence

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

No scope expansion is allowed in this step.

## Required execution sequence

### 1. Owner confirmation and escalation issue
For each unresolved blocker, confirm and record:
- owner name/handle
- team or function
- due date
- escalation destination if not resolved by the due date
- exact required artifact that would clear the blocker

At minimum, the following owner classes must be explicitly confirmed:
- pilot commander
- pilot operator lead
- tenant-admin contact or support contact
- environment/deployment owner if different

### 2. Environment binding proof
Obtain one of the following:
- the real pilot production base URL and its environment binding proof
- or an explicit written confirmation that no production pilot environment is actually active yet

Acceptable evidence examples:
- environment URL
- deployment binding record
- screenshot or control-plane output proving the pilot environment identity
- durable environment handle written into the evidence log

If the only reachable environment is still the simulator project/base URL, the blocker remains active.

### 3. Operator access proof
Obtain one of the following:
- a real operator session path
- a real operator token path
- explicit confirmation that operator access is not yet provisioned

The evidence must state:
- how the operator would access the frozen pilot
- whether the session/token is production-capable
- whether the session/token is blocked by missing environment or missing identity provisioning

### 4. Requester and tenant-admin touchpoint proof
Confirm by explicit name/handle:
- one requester/business actor
- one tenant-admin or support actor

For each, record:
- whether reachable in this pilot window
- whether they have actually interacted with the pilot environment
- if not, why not

### 5. Real task execution attempt
If steps 2-4 succeed enough to make a true pilot path possible, execute exactly one real pilot task and capture:
- device/session proof
- real task or run/session identifier
- workflow artifact proof
- receipt/governance reference if produced

If the path touches a connector in frozen scope, attempt connector proof capture.

### 6. Explicit non-start condition
If no real pilot environment binding and no operator session/requester/tenant-admin path can be produced, then the checkpoint must explicitly record that:
- the pilot cohort may be frozen on paper,
- but the live pilot evidence path is still not actually active.

This must not be disguised as generic HOLD language.

## Required evidence outputs

At the end of this step, at least one of the following must be true:

### Success A - Access unlocked
At least one real live evidence category advances because:
- real environment binding exists
- at least one real actor path exists
- one real task path was executed

### Success B - Blockers narrowed to actionable external dependency state
No real task ran, but blocker state is now narrowed to precise external dependency facts such as:
- environment not actually deployed for pilot
- operator identity not provisioned
- requester/admin actors not activated in the pilot window

### Failure
The same blockers remain broad and unowned or the checkpoint still cannot say whether the pilot is actually live.
That outcome is not acceptable for this step.

## Trigger rules

### Result = HOLD
Allowed only if:
- at least one access blocker was cleared or
- at least one real evidence category advanced and the remaining blockers are now small and time-bound

### Result = REMEDIATE
Use when:
- real evidence still cannot be produced
- the access package remains open
- the blockers are explicit, externally owned, and time-bound

### Result = ROLLBACK
Use only if:
- a live Sev1 appears
- repeated Sev2 appears
- the frozen pilot path becomes unsafe to continue

### Result = CLOSURE_READY
Allowed only if:
- access blockers are cleared enough to gather sufficient live evidence breadth
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
If remediation changes launch-critical configuration or runtime entry paths, rerun the affected launch-critical suites and record exactly why.

## Definition of done

Launch 14.14 is done when:
1. each unresolved blocker has an explicit owner, due date, and required clearing artifact
2. the real pilot environment binding is either proven or explicitly shown absent
3. operator access is either proven or explicitly shown absent
4. requester and tenant-admin/support touchpoints are either proven or explicitly shown absent
5. at least one real evidence category advanced, or the blocker state was materially narrowed into an externally actionable dependency state
6. the checkpoint ends in one of: `HOLD`, `REMEDIATE`, `ROLLBACK`, `CLOSURE_READY`

## Final report format

At the end of the step, report:
- which blockers were cleared
- which blockers remain
- exact owner and due date for each remaining blocker
- whether the real pilot environment was proven active
- whether operator access was proven active
- whether requester/admin touchpoints were proven active
- whether a real pilot task path executed
- which evidence categories advanced
- whether validation rerun was required
- final checkpoint decision
- exact next action

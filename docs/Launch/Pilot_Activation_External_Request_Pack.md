# Pilot Activation External Request Pack

## What this is
This pack is the next required step after EPF-5 and Launch 14.12/14.13.
The product and evidence-ingest surfaces are now sufficient to accept, verify, and promote real pilot artifacts.
The remaining blocker is external: the real pilot environment, real pilot actors, and real pilot evidence do not yet exist in the accessible workspace.

This is **not** another docs-only HOLD checkpoint.
It is an operational handoff pack that must be sent to the external owners responsible for activating the real pilot.

## Immediate objective
Obtain the minimum real pilot artifacts required to move from:
- `pilot not effectively activated`

to:
- `pilot activation in progress with real evidence intake possible`

## The only acceptable next outcomes
1. Real pilot activation artifacts are delivered.
2. The missing artifact set is narrowed further with named owners and explicit refusal/unavailability evidence.
3. The pilot is reclassified from `hypercare hold` to `not activated / not handed over` if no real activation path exists.

## Do not do
- Do not open new product milestones.
- Do not create more docs-only HOLD checkpoints.
- Do not promote simulator, demo, test, or local synthetic artifacts as pilot proof.
- Do not rerun launch validation suites unless a bounded runtime/config fix actually changes launch behavior.

## Required artifact bundle
The following artifacts are required.

### A. Real pilot environment binding
Owner: `pilot-commander`
Required artifact(s):
- real `pilot-alpha-prod` base URL
- proof this URL is not the simulator path
- tenant/workspace/deployment binding summary
- one successful access proof or environment handoff proof
Acceptance rule:
- if the environment is only `lumi-agent-simulator`, this requirement is **not satisfied**

### B. Real operator access
Owner: `pilot-operator-lead`
Required artifact(s):
- named operator identity
- real operator session/token or equivalent authenticated access package
- one successful operator access proof in the real pilot environment
Acceptance rule:
- invalid or absent session/token means requirement is **not satisfied**

### C. Named real requester
Owner: `pilot-commander`
Required artifact(s):
- one named requester actor
- proof the actor belongs to the pilot scope
- proof the actor can initiate or has initiated one real pilot task
Acceptance rule:
- generic role handles or hypothetical users do **not** satisfy this requirement

### D. Real tenant-admin/support touchpoint
Owner: `tenant-admin`
Required artifact(s):
- named tenant-admin or support contact
- real channel or touchpoint
- one real interaction artifact or support/admin acknowledgement
Acceptance rule:
- generic tenant-admin role text without a real channel/contact does **not** satisfy this requirement

### E. First real task/run artifact
Owner: `pilot-operator-lead`
Required artifact(s):
- one real task/session/run/receipt/governance artifact created from the real pilot environment
Acceptance rule:
- this cannot be created until A, B, and C are satisfied

### F. Real connector/credential artifact
Owner: `pilot-operator-lead`
Required artifact(s):
- one real connector route/credential/handoff artifact if the first real task actually traverses a connector path
Acceptance rule:
- if the first real task does not involve a connector, record `not involved in this task` instead of fabricating evidence

## Step-by-step execution order

### Step 1 - Send the external request pack
Send this artifact list to the named external owners within the same day.
Each request must include:
- exact artifact needed
- why it is required
- acceptance rule
- due date

### Step 2 - Record each external response as evidence, not prose
For every response, record one of:
- delivered
- partially delivered
- refused
- unavailable
- no response by due time

Do not collapse multiple failure modes into a generic HOLD message.

### Step 3 - If A/B/C/D land, immediately execute the first real task
Once the environment, operator, requester, and tenant-admin touchpoint exist:
- execute one real task
- collect the first real task/session/run artifact
- collect connector proof only if connector is actually involved
- promote via the existing EPF-4 verify/promote path

### Step 4 - Update the launch state honestly
Use one of these states only:
- `PILOT_ACTIVATION_IN_PROGRESS`
- `PILOT_ACCESS_PARTIALLY_AVAILABLE`
- `PILOT_NOT_ACTIVATED`
- `REAL_EVIDENCE_RECOVERED`

Avoid vague language like “still held” if no real activation is actually happening.

## Exact message templates

### To pilot-commander
Subject: Required artifacts to activate pilot-alpha-prod

We cannot progress the pilot with simulator-only evidence.
Please provide by the due date:
1. real pilot-alpha-prod base URL
2. proof it is not the simulator environment
3. tenant/workspace/deployment binding
4. one named requester actor

Without these artifacts, the pilot should be treated as not yet activated.

### To pilot-operator-lead
Subject: Required operator access and first real task artifact

Please provide by the due date:
1. named operator identity
2. real authenticated access/session for the pilot environment
3. one successful operator access proof
4. after access is available, one real task/session/run artifact
5. one connector/credential artifact only if the real task uses a connector path

Without these artifacts, operator access remains unactivated for the pilot.

### To tenant-admin
Subject: Required tenant-admin/support touchpoint for pilot readiness

Please provide by the due date:
1. named tenant-admin/support contact
2. real channel or touchpoint
3. one real acknowledgement or interaction artifact

Without this, tenant-admin/support evidence remains unavailable for closure readiness.

## Decision rule after external request window

### If all required artifacts arrive
- execute the first real task immediately
- use the existing verify/promote path
- advance evidence categories
- reassess closure readiness from real evidence

### If some artifacts arrive but not all
- record which exact requirements are still missing
- set state to `PILOT_ACCESS_PARTIALLY_AVAILABLE`
- do not claim closure readiness yet

### If no critical artifacts arrive
- classify state as `PILOT_NOT_ACTIVATED`
- stop pretending hypercare evidence breadth can increase inside the current workspace
- move from docs-only hold loops to explicit external dependency management

## Deliverables expected from this step
- the external request pack sent
- due dates and owners attached to each artifact request
- each external response recorded as evidence
- either the first real task executed or the activation failure state made explicit

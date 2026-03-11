# Enterprise OA Role Matrix v1

## Purpose

This document translates the current platform direction into a practical enterprise OA role model that is:
- commercially understandable
- operationally manageable
- extensible without exploding into hundreds of hard-coded job titles
- aligned with the current product architecture

The platform already has strong foundations in:
- role-aware runtime execution
- policy and rollout governance
- receipts, proof, and durable ledger semantics
- operator workflows, escalation, and exception handling
- environment truth, readiness, and enterprise shell surfaces

The next step is not to add every corporate title as a first-class role.
The next step is to define a **commercially viable role matrix** that can support a real enterprise OA / execution platform.

## Strategic principle

Use a three-layer role model:

1. **Universal flow roles**
   The roles almost every enterprise workflow needs.
2. **Platform and governance roles**
   The roles that manage environment, policy, integration, and audit.
3. **Functional business roles**
   Optional domain roles loaded by solution/template, not all hard-coded into the core.

This prevents the platform from becoming:
- too abstract to sell
- too custom to configure
- too brittle to expand

---

## Product positioning

The product should be sold as an:

**Enterprise Execution Governance Platform / Modern OA Platform**

It is not only:
- a chat assistant
- a task form tool
- a workflow engine

It is a governed execution layer for enterprise work:
- request
- approval
- execution
- review
- exception handling
- policy and integration control
- audit and reporting

---

# 1. Role model layers

## 1.1 Universal flow roles
These should exist in v1 because they map to almost every enterprise workflow.

### Requester
The person who initiates a task, request, or case.

Core abilities:
- create request
- add missing information
- review progress
- approve/reject bounded prompts if needed
- receive result and receipt

### Approver
The person who authorizes a decision or release of action.

Core abilities:
- approve
- reject
- request clarification
- see bounded decision context
- leave approval notes

### Operator
The person who handles the case operationally.

Core abilities:
- work queue / case handling
- inspect blockers
- update safe workflow state
- handoff/escalate
- run safe bulk actions
- follow runbooks

### Reviewer
The person who checks quality, compliance, or risk before a step can proceed.

Core abilities:
- review package or case
- verify evidence
- request changes
- mark review complete or blocked

### Observer / Follower
A read-oriented role for visibility without strong execution rights.

Core abilities:
- view progress
- view receipts
- follow status updates
- no strong mutation rights

### Case Owner / Assignee
A responsibility role tied to a case or workflow stage.

Core abilities:
- own progress of a case
- coordinate next step
- accept/reject assignment
- remain accountable in timeline/audit

---

## 1.2 Platform and governance roles
These roles make the product enterprise-grade.

### Tenant Admin
Responsible for tenant-level activation, environment readiness, and base configuration.

Core abilities:
- environment binding
- actor readiness
- pilot / activation blockers
- tenant-level setup review

### Workspace Admin
Responsible for workspace-level users, templates, and scoped configuration.

Core abilities:
- workspace membership/setup visibility
- workspace-specific template or readiness settings
- workspace-level governance visibility

### Policy / Governance Admin
Responsible for policy packs, overrides, rollout, simulation, and governance logic.

Core abilities:
- inspect/edit policy packs
- manage overrides
- rollout governance
- review simulation/shadow state
- freeze/hold/release policy rollout

### Integration Admin
Responsible for connector, credential, and integration readiness.

Core abilities:
- connector readiness
- credential/vault readiness visibility
- route activation visibility
- integration issue triage

### Auditor
Read-only audit and proof role.

Core abilities:
- inspect receipt / proof / ledger / timeline
- inspect export and audit summaries
- no workflow mutation rights

### Support / CS Ops
Support-facing operator role for customer and launch issues.

Core abilities:
- support case visibility
- incident/logical escalation visibility
- assist with operator and tenant-admin follow-through
- no unrestricted policy authority

---

## 1.3 Functional business roles
These should be added selectively by solution package or vertical template, not all at once in the base product.

### Finance Approver
For budget, spend, or financial risk decisions.

### Procurement / Vendor Manager
For vendor, supplier, and external party workflows.

### Compliance Reviewer
For compliance-heavy review paths.

### HR Case Manager
For people-process workflows.

### IT / Security Admin
For identity, access, and security-specific operations.

### Department Manager / Budget Owner
For line-management approval or prioritization.

### Executive Viewer
For high-level visibility and reporting without operational mutation.

---

# 2. Recommended commercial role set for v1

Do not ship every possible role first.

## v1 core commercial role set
This is the recommended first sellable role matrix:

1. Requester
2. Approver
3. Operator
4. Reviewer
5. Tenant Admin
6. Workspace Admin
7. Policy / Governance Admin
8. Integration Admin
9. Auditor

These nine roles are enough to support:
- initiation
- approval
- operations
- review
- tenant/workspace administration
- policy governance
- integration readiness
- audit

## v1.5 extension set
Add these only after v1 is stable:
10. Support / CS Ops
11. Finance Approver
12. Compliance Reviewer

## v2 extension set
Add by vertical/template:
13. Procurement / Vendor Manager
14. HR Case Manager
15. IT / Security Admin
16. Department Manager / Budget Owner
17. Executive Viewer

---

# 3. Role matrix dimensions

The product should not define roles by title alone.
Each role must be defined across a standard matrix.

## 3.1 Required matrix dimensions

For every role, define:

### A. Primary objective
Why this role exists in the system.

### B. Surfaces
Which shell or panel this role primarily uses.

### C. Objects visible
Which tasks, cases, receipts, or admin objects this role can see.

### D. Actions allowed
Which actions this role can perform.

### E. Actions forbidden
Which actions are explicitly blocked.

### F. Approval authority
What this role can approve and at what level.

### G. Data scope
Which data classes this role can read or export.

### H. Integration scope
Which connectors/routes this role can interact with.

### I. Evidence responsibility
What proof/receipt/timeline notes this role must leave behind.

### J. Escalation targets
Where this role sends unresolved blockers.

---

# 4. Proposed v1 role matrix

## 4.1 Requester
### Primary objective
Initiate work and receive outcomes.

### Primary surfaces
- Request Center
- Requester Inbox
- Receipt / Result View

### Visible
- own requests
- own approvals
- own receipts
- own status changes

### Allowed
- create request
- add or correct missing info
- respond to clarification
- approve/reject bounded prompt
- view final result

### Forbidden
- policy edits
- admin setup changes
- queue-wide operator actions
- connector/admin mutation

### Evidence responsibility
- provide clear request context
- confirm final outcome if required

### Escalates to
- Operator
- Approver
- Tenant Admin if setup blockers are visible

---

## 4.2 Approver
### Primary objective
Authorize or deny controlled actions.

### Primary surfaces
- Approval Center
- Approval Queue / Review Pane

### Visible
- tasks awaiting approval
- bounded risk/context summaries
- receipt fragments relevant to the approval

### Allowed
- approve
- reject
- request clarification
- leave approval note

### Forbidden
- broad policy mutation
- broad operator queue mutation
- environment setup mutation

### Evidence responsibility
- leave an approval decision and note
- ensure approval trail is durable

### Escalates to
- Requester for clarification
- Governance Admin when policy conflict exists

---

## 4.3 Operator
### Primary objective
Progress and resolve cases.

### Primary surfaces
- Operations Console
- Queue
- Case Detail
- Timeline

### Visible
- assigned/open cases
- blocker summaries
- escalation / handoff state
- workflow status

### Allowed
- inspect and update safe case state
- handoff / escalate
- perform safe bulk actions
- request review/remediation
- attach case notes

### Forbidden
- unrestricted policy change
- unrestricted connector/admin change
- destructive unsafe automation

### Evidence responsibility
- leave timeline and handling evidence
- leave blocker and remediation notes

### Escalates to
- Reviewer
- Tenant Admin
- Governance Admin
- Support / CS Ops

---

## 4.4 Reviewer
### Primary objective
Check evidence, quality, or compliance before progression.

### Primary surfaces
- Review Queue
- Case Detail
- Evidence / Receipt View

### Visible
- review-required cases
- evidence and proof
- review blockers

### Allowed
- mark reviewed
- request additional evidence
- block progression pending review
- hand back to operator

### Forbidden
- broad admin mutation
- unrelated operational bulk actions

### Evidence responsibility
- leave review decision and reason

### Escalates to
- Operator
- Governance Admin
- Compliance Reviewer (if that extension exists)

---

## 4.5 Tenant Admin
### Primary objective
Ensure tenant activation and readiness.

### Primary surfaces
- Tenant Admin Setup Panel
- Activation / Readiness View

### Visible
- environment binding
- actor readiness
- pilot blockers
- identity/integration readiness summaries

### Allowed
- register readiness artifacts
- track activation blockers
- confirm setup state
- view binding and eligibility truth

### Forbidden
- arbitrary workflow execution on behalf of operator
- unrestricted policy authoring unless also Governance Admin

### Evidence responsibility
- leave setup/activation evidence
- attach real activation artifacts when available

### Escalates to
- Integration Admin
- Governance Admin
- Support / CS Ops

---

## 4.6 Workspace Admin
### Primary objective
Manage workspace-level readiness and participants.

### Primary surfaces
- Workspace Setup / Membership View
- Workspace Readiness View

### Visible
- workspace configuration
- workspace participants
- workspace-specific blockers

### Allowed
- confirm workspace setup
- manage workspace-scoped readiness artifacts
- see workspace-specific trial/pilot state

### Forbidden
- tenant-wide policy or environment mutation beyond scope

### Evidence responsibility
- workspace readiness evidence

### Escalates to
- Tenant Admin
- Governance Admin

---

## 4.7 Policy / Governance Admin
### Primary objective
Control policy packs, overrides, rollout, and governance behavior.

### Primary surfaces
- Policy Studio
- Governance / Rollout Views

### Visible
- policy packs
- overrides
- rollout/simulation state
- governance blockers and recommendations

### Allowed
- edit/view policy packs
- manage overrides
- approve/pause/hold rollout where allowed
- inspect governance timeline and portfolio status

### Forbidden
- arbitrary business request creation
- unrelated support-only changes

### Evidence responsibility
- policy change reasoning
- rollout / simulation evidence

### Escalates to
- Auditor
- Executive / governance owner where applicable

---

## 4.8 Integration Admin
### Primary objective
Manage integration readiness and connector health.

### Primary surfaces
- Integration Readiness Center
- Connector / Credential Readiness Views

### Visible
- connector readiness
- credential/vault summaries
- route eligibility
- integration blockers

### Allowed
- register integration readiness artifacts
- inspect route and credential state
- coordinate safe integration unblock

### Forbidden
- unrelated business workflow mutation
- broad policy authoring unless also Governance Admin

### Evidence responsibility
- integration readiness and route evidence

### Escalates to
- Tenant Admin
- Support / CS Ops
- IT / Security Admin when that role exists

---

## 4.9 Auditor
### Primary objective
Inspect proof, receipts, and audit-relevant state.

### Primary surfaces
- Audit / Reporting Center
- Receipt / Proof / Export Views

### Visible
- receipts
- proof ledger summaries
- audit exports
- timeline and approval trails

### Allowed
- read
- export where policy allows

### Forbidden
- mutate workflows
- approve operations
- change admin/policy/integration state

### Evidence responsibility
- none for progression; this is an observation role

### Escalates to
- Governance Admin
- Compliance Reviewer
- Executive Viewer

---

# 5. Product modules that should match this role model

The commercial product should be shaped into six modules.

## 5.1 Request Center
For:
- Requester

Core content:
- create requests
- task status
- final outcomes
- receipts

## 5.2 Approval Center
For:
- Approver
- Reviewer

Core content:
- approval queue
- review queue
- bounded context
- approve/reject/request clarification

## 5.3 Operations Console
For:
- Operator
- Support / CS Ops later

Core content:
- queue
- case detail
- timeline
- blockers
- handoff/escalation
- safe bulk actions

## 5.4 Policy & Governance Center
For:
- Policy / Governance Admin
- Workspace Admin partially

Core content:
- policy packs
- overrides
- rollout
- simulation/shadow
- governance decisions

## 5.5 Integration & Readiness Center
For:
- Tenant Admin
- Integration Admin
- Workspace Admin partially

Core content:
- environment binding
- actor readiness
- connector readiness
- vault/credential readiness
- pilot activation blockers

## 5.6 Audit & Reporting Center
For:
- Auditor
- Executive Viewer later
- Compliance Reviewer later

Core content:
- receipts
- proof summaries
- audit exports
- trend and portfolio visibility

---

# 6. Recommended next productization move

Do not immediately add all 17 roles as distinct product surfaces.

The next best move is:

## OA Role Matrix v1 + Shell Mapping v1

Deliverables:
- freeze the v1 role set (9 roles)
- map each role to one primary module
- define allowed/forbidden actions per role
- define evidence responsibility per role
- define escalation target per role
- implement the most important missing surfaces:
  - Approver
  - Reviewer
  - Admin split (Tenant / Workspace / Policy / Integration / Auditor)

This is the minimum step required to move from:
- strong governance platform

to:
- commercially legible enterprise OA / execution platform

---

# 7. Success criteria

This OA role expansion is successful when:
1. the product no longer looks like it only serves Requester / Operator / Tenant Admin
2. Approver and Reviewer exist as first-class role concepts
3. Admin responsibilities are split rather than overloaded into one role
4. roles are defined by a matrix, not only by labels
5. the product modules map clearly to the role matrix
6. a customer can understand who in their organization would use which part of the system

---

# 8. Summary

The platform should not stay with only three roles.
That is not enough for a mature, sellable enterprise OA / execution platform.

The right move is not to explode into every corporate title at once.
The right move is to define a structured role matrix and ship the first commercially viable role set.

The recommended v1 role set is:

- Requester
- Approver
- Operator
- Reviewer
- Tenant Admin
- Workspace Admin
- Policy / Governance Admin
- Integration Admin
- Auditor

This is the best next role architecture for a mature commercial product.

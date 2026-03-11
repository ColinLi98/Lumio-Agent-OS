# Agent Kernel Pilot Solution Templates

Decision date: 2026-03-07
Scope: frozen advisor workflow family only

## Purpose
Package the frozen pilot workflow into repeatable delivery templates for operators and pilot customers without widening product scope.

## Template rules
- These templates are operational packaging over the existing frozen workflow, not new product primitives.
- Every template must preserve evidence, approval, and receipt visibility.
- Every external handoff remains bounded to the frozen webhook connector path.

## Template 1: Pre-Meeting Prep Pack

### When to use
- Advisor has an upcoming client meeting and needs a concise preparation pack before the meeting starts.

### Required inputs
- client name
- meeting date/time
- meeting objective
- latest approved account or relationship context
- any operator-supplied constraints or exclusions

### Expected outputs
- meeting objective summary
- prep brief with open items
- evidence references used to build the pack
- operator note if any prerequisite context is missing

### Operator checks
- confirm the request belongs to the approved pilot workspace
- confirm the output stays inside the frozen pilot template family
- confirm evidence references are attached before delivery

### Success signal
- advisor confirms the prep pack was usable without manual reconstruction

## Template 2: Post-Meeting Notes to CRM-Ready Draft

### When to use
- Advisor has completed the meeting and needs structured notes transformed into a CRM-ready draft.

### Required inputs
- raw or summarized meeting notes
- client name
- advisor name
- meeting title or identifier
- any mandatory CRM fields required by the pilot customer

### Expected outputs
- structured post-meeting summary
- CRM-ready draft
- unresolved follow-up items
- evidence references for major claims or recommendations

### Operator checks
- confirm note content is complete enough to support a CRM draft
- confirm unresolved fields are called out instead of guessed
- confirm the CRM-ready draft is ready for the frozen compliance handoff stage

### Success signal
- tenant operator accepts the draft for compliance handoff without reformatting the entire record

## Template 3: Compliance Handoff Package

### When to use
- A validated CRM-ready draft is ready to move into the frozen compliance intake path.

### Required inputs
- approved CRM-ready draft
- post-meeting notes summary
- client and workflow identifiers
- evidence references required for the pilot tenant compliance review

### Expected outputs
- compliance handoff package
- webhook delivery attempt through `advisor_crm_compliance_handoff`
- durable delivery status and retry/dead-letter visibility

### Operator checks
- confirm compliance-required evidence refs are included
- confirm connector route is healthy before dispatch
- if delivery is blocked or degraded, hold the package in visible degraded mode and follow the operator guide

### Success signal
- compliance intake package is delivered or retry-visible without hidden failure

## Full workflow composition
1. Pre-Meeting Prep Pack
2. Post-Meeting Notes to CRM-Ready Draft
3. Compliance Handoff Package

## Explicitly unsupported in the pilot template pack
- workflows outside the frozen advisor meeting lifecycle
- native CRM vendor integrations beyond the frozen webhook handoff
- destructive compliance/delete workflows
- open-ended automation beyond the bounded operator-reviewed pilot path

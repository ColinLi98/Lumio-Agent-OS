# Agent Kernel Pilot Onboarding Checklist

Decision date: 2026-03-07
Scope: controlled enterprise pilot only

## Purpose
Provide one repeatable onboarding path for pilot customers and internal operators before Launch 13 rehearsal.

## Checklist

### 1. Pilot scope confirmation
- Owner: Product/program
- Confirm the customer accepts the frozen advisor workflow family only.
- Confirm the customer accepts the frozen identity, vault, connector, and deployment path.
- Evidence:
  - written acceptance of the frozen pilot scope

### 2. Tenant and deployment setup
- Owner: Platform engineering
- Confirm `AGENT_KERNEL_PILOT_TENANT_ID`, deployment stage/environment, primary region, and residency scope are configured.
- Confirm deployment summary reports `READY`.
- Evidence:
  - deployment summary snapshot

### 3. Identity and admin setup
- Owner: Security/identity
- Confirm Okta OIDC and group-role mappings are configured for the pilot tenant.
- Confirm tenant admin and workspace admin test accounts can authenticate.
- Evidence:
  - successful authorize/exchange flow
  - durable enterprise session created

### 4. Vault and connector setup
- Owner: Platform security
- Confirm HashiCorp Vault path, rotate path, and webhook endpoint are configured.
- Confirm credential health is route-eligible.
- Evidence:
  - successful credential health check
  - successful bounded webhook test delivery in staging

### 5. Operator enablement
- Owner: Ops enablement
- Confirm pilot operators have read access to:
  - observability summary
  - compliance summary
  - deployment summary
  - connector platform health
- Confirm operators have read the pilot operator guide and the supporting runbooks.
- Evidence:
  - named operator roster
  - acknowledged runbook review

### 6. Solution template setup
- Owner: Ops enablement + tenant admin
- Confirm the customer-selected templates are frozen to the approved pilot set:
  - pre-meeting prep pack
  - post-meeting notes to CRM-ready draft
  - compliance handoff package
- Evidence:
  - template selection recorded

### 7. Staging validation
- Owner: Platform engineering + tenant admin
- Run one full staging walkthrough of the frozen workflow.
- Confirm connector health, observability visibility, and compliance export baseline all work on the staged path.
- Evidence:
  - end-to-end walkthrough notes
  - no unresolved blocker from staging validation

### 8. Production pilot readiness
- Owner: Product/program + tenant admin
- Confirm business escalation contacts, support hours, and communication path.
- Confirm success scorecard and weekly review cadence are accepted.
- Evidence:
  - named escalation contacts
  - agreed KPI review cadence

### 9. Go-live gate
- Owner: Product/program
- Confirm all items above are complete.
- Confirm no unresolved `SEV1` or deployment drift warning blocks launch.
- Evidence:
  - Launch 13 rehearsal input marked ready

## Explicitly deferred
- self-serve onboarding wizard
- broad partner enablement or academy content
- unsupported connectors, deployment models, or workflow families

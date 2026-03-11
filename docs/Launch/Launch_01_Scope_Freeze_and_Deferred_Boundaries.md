# Scope Freeze and Deferred Boundaries

Decision date: 2026-03-07
Owner: Codex
Status: frozen for the launch sequence

## Goal
Freeze the exact pilot launch scope, supported scenarios, supported integrations, deployment model, and deferred items.

## Why this step is now
Without a frozen pilot boundary, every infrastructure milestone will continue to expand and delay launch.

## Frozen pilot boundary
The enterprise pilot launch is frozen to one workflow template family:
- advisor workflow execution with evidence and approval gates

The only launch-approved workflow template in that family is:
- pre-meeting prep -> post-meeting notes -> CRM-ready draft -> compliance handoff package

This is a launch boundary, not a product rewrite:
- Lumi remains a general-purpose Agent OS at the architecture level
- the pilot launch is intentionally narrower so the remaining infrastructure milestones close against one exact path
- no new customer-facing surface is introduced in this step

## Supported pilot paths

| Area | Frozen pilot scope | Boundary rule |
|---|---|---|
| Primary business scenario | Advisor workflow execution package | Only the pre-meeting prep -> post-meeting notes -> CRM-ready draft -> compliance handoff template family is in pilot launch scope |
| Supported identity path | Okta OIDC sign-in plus Okta SCIM provisioning/deprovisioning for pilot operators/admins | Local permission precedence remains authoritative; remote identity adds provenance and admin closure, but never bypasses local safety decisions |
| Supported vault path | HashiCorp Vault materialization and lease-health gating for the pilot connector credential | Expired, revoked, or unhealthy credentials must block or degrade the connector path visibly |
| Supported connector path | One outbound credentialed HTTPS webhook route into the pilot tenant's existing CRM/compliance intake endpoint | Pilot promises one webhook handoff path only; it does not promise native CRM vendor object sync |
| Deployment model | Vendor-managed single-tenant cloud deployment with one staging environment, one production environment, and one primary region per pilot tenant | No shared multi-tenant GA productization, no self-hosted/on-prem, no hybrid, and no multi-region active-active in pilot |

## Supported launch behavior
- Users stay inside the existing `GOALS / WORK / ACTIVITY` product surface.
- The pilot workflow supports evidence-backed draft generation, human review, approval gating, and one-way outbound handoff into the pilot tenant's system of record.
- Internal/operator follow-up stays on the existing governance, receipt, and run-history surfaces.
- Local-first safety semantics remain in force:
  - if identity, vault, or connector state is degraded, the system must keep the draft/evidence local, emit blocked or degraded status, and avoid reporting false completion
  - if future pilot expansion ever enables open external supply, LIX remains the only allowed external execution path

## Explicitly deferred and unsupported paths

### Deferred from pilot launch
- additional workflow families, including institutional research, generic helpdesk/ticket triage, risk/compliance intake programs, shopping, travel, or open-ended external procurement
- native Slack, Jira, Zendesk, CRM, or other vendor-specific connector implementations beyond the single credentialed HTTPS webhook path
- additional IdP/provider paths beyond Okta OIDC plus Okta SCIM
- additional vault backends beyond HashiCorp Vault
- multi-connector fanout, connector marketplace breadth, or connector SDK/conformance expansion beyond the pilot path
- self-serve tenant onboarding, shared multi-tenant SaaS productization, self-hosted/on-prem deployments, hybrid deployments, or multi-region active-active topology
- broader operator UX redesign, advanced automation layers, deeper optimization expansion, or new customer-facing workflow families

### Explicitly unsupported in this pilot
- promises of Salesforce, HubSpot, ServiceNow, Slack, Jira, Zendesk, or any other named vendor integration as a launch requirement
- unsupported identity/provider matrix claims across Azure AD, Google Workspace, Ping, Auth0, or custom enterprise providers
- unsupported vault/provider matrix claims across AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, or custom secret stores
- any launch path that requires replacing customer core systems instead of handing off into them
- any path that weakens local-first safety, approval gates, auditability, or evidence-backed completion rules

## Launch-critical vs post-launch nice-to-have

### Launch-critical
- the advisor workflow template family is the only launch-approved business scenario
- Okta OIDC plus Okta SCIM is usable and auditable for pilot operators/admins
- HashiCorp Vault-backed credential state gates the pilot connector route correctly
- one outbound credentialed HTTPS webhook handoff works end-to-end with evidence, audit trail, and idempotent delivery behavior
- single-tenant staging/prod deployment with one primary region and explicit rollout gates is documented and enforced
- existing local-first, receipt, approval, and Activity trace semantics remain intact for degraded and blocked states

### Post-launch nice-to-have
- additional workflow template families
- native vendor connectors and broader connector platform breadth
- broader IdP, SCIM, and vault provider matrix
- shared multi-tenant productization, self-hosted/hybrid variants, regional expansion, and disaster-recovery depth
- deeper automation, wider twin/Bellman product surfacing, and broader operator UX polish

## Evaluation rule for all following steps
Every remaining infrastructure step should now be evaluated against this exact freeze:
1. Does it directly improve the frozen advisor workflow template family?
2. Does it close the frozen Okta, HashiCorp Vault, webhook, or single-tenant deployment path?
3. Does it protect local-first safety, evidence, approval, and auditability for that path?

If the answer is no, the work is deferred unless a later roadmap step explicitly reopens scope.

## Compatibility statement
- additive and backward-compatible only
- no runtime behavior changed
- no local-first safety semantics changed
- this step narrows launch commitments; it does not rewrite existing typed enterprise semantics

## Validation summary
This step is documentation-only.
- No `services/agent-kernel/*` files changed.
- No Android / host runtime files changed.
- The TypeScript and Android validation gates were therefore not rerun in this step.

Validation expectation for later steps:
- run the TypeScript `agent-kernel` gate when service substrate files change
- run the Android / host gate when Android or host runtime paths change

## Definition of done
- Pilot scope is frozen in docs.
- Deferred list is explicit and communicated.
- All following steps can be evaluated against the frozen pilot scope.

## Final report checklist
- changed files
- exact step outputs completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

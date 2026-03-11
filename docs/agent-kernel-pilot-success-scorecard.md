# Agent Kernel Pilot Success Scorecard

Decision date: 2026-03-07
Scope: controlled enterprise pilot only

## Purpose
Define the minimum KPI set and success criteria used for pilot weekly review and Launch 13 rehearsal.

## Scorecard
| KPI | Target | Source | Review cadence |
|---|---|---|---|
| onboarding readiness | 100% of checklist items complete before go-live | `docs/agent-kernel-pilot-onboarding-checklist.md` | before launch, then weekly if changes occur |
| deployment posture | `status=READY` with no unresolved tenant-drift or region warnings | `GET /api/agent-kernel/deployment/summary` | daily |
| task success rate | at least 90% of pilot tasks end `DONE` without unresolved degraded status | task snapshot + observability summary | weekly |
| connector delivery reliability | at least 95% delivered without dead-letter | connector platform health + delivery history | daily |
| audit export integrity | 100% of requested exports return manifest, bundle, and section hashes | compliance summary + export responses | weekly |
| operator first response | first operator acknowledgment within 15 minutes during active support window | operator incident log | weekly |
| business artifact acceptance | at least 80% of CRM-ready drafts and compliance handoff packages accepted without full manual rewrite | tenant admin weekly review | weekly |

## Success criteria for the pilot
- The customer can use the frozen advisor workflow without operators inventing unsupported steps.
- Operators can triage most cases from the summary APIs and runbooks without engineering intervention.
- No unresolved `SEV1` issue remains open longer than one business day.
- No unresolved deployment-drift warning remains open across a weekly review boundary.
- Compliance requests use the bounded audit-export and deletion-request paths rather than ad hoc handling.

## Failure signals
- repeated connector dead-letter events on the same customer flow
- frequent manual rewrites of the CRM-ready draft or compliance handoff package
- unresolved deployment `DEGRADED` posture
- operators escalating routine cases because the template or runbook is unclear

## Review ritual
- Weekly 30-minute review with:
  - pilot operator lead
  - tenant admin
  - platform representative
- Required artifacts:
  - scorecard snapshot
  - unresolved incident list
  - onboarding checklist delta, if any
  - explicit defer list that remains out of pilot scope

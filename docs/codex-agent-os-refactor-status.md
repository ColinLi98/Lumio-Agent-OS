# Codex Agent OS Refactor Status

Snapshot Date: 2026-03-09
Branch: master (dirty working tree)
Owner: Codex
Workspace: `/Users/lili/Desktop/Agent OS/LumiKeyboard-Android`

## 0. Sellable Standard Execution Frame (2026-03-08)
- Governing roadmap:
  - `docs/Pilot/Sellable_Standard_Roadmap_v1.md`
- Near-term external product definition:
  - `Enterprise Execution Governance Platform`
- Current active step:
  - `Step 1 — Pilot Activation Closure`
  - missing real pilot environment binding, real operator access, named requester, and real tenant-admin/support touchpoint keep the first real task/session/run artifact blocked
- `Step 2` is blocked until the first verified and promoted `REAL_PILOT` artifact exists.
- Real live evidence is the gating condition for closure-readiness.
- Launch `00-13` and EPF entries below remain implementation history, not the active sequencing model.
- Launch `14.x` continuation is frozen unless real pilot evidence changes the facts.

## 0A. Sellable Standard Readiness Matrix
| Step | Mapped current work | Status | Launch-blocking gaps | Required artifacts | Owner | Due date | Next decision |
|---|---|---|---|---|---|---|---|
| `Step 1 — Pilot Activation Closure` | `EPF-2/3/4/5`; external pilot activation request pack; Pilot Activation War Room | Active | Artifacts `A-D` missing; artifact `E` blocked on `A-D`; artifact `F` conditional | `A` real environment binding; `B` real operator access; `C` named requester; `D` tenant-admin/support touchpoint; `E` first real task/run; `F` connector proof if used | `pilot-commander`; `pilot-operator-lead`; `tenant-admin`; `connector-platform-owner` | `2026-03-10` for `A-D`; `2026-03-11` for `E-F` | Promote the first `REAL_PILOT` artifact or reclassify to `PILOT_ACTIVATION_DELAYED` / `PILOT_NOT_STARTED` |
| `Step 2 — Live Evidence Closure` | `launch-pilot-evidence-log.md`; `launch-feedback-log.md`; `launch-pilot-incident-log.md`; `launch-pilot-closure-template.md` | Blocked | No verified `REAL_PILOT` task/session/run artifact; required evidence categories have not advanced from live pilot truth | First promoted `REAL_PILOT` task/run artifact plus live evidence across required categories, or explicit `not involved` handling where allowed | `TBD` | `After Step 1 activation` | Start evidence accumulation only after the first promoted live artifact exists |
| `Step 3 — Enterprise Shell Consolidation` | Enterprise shell base; `EPF-6` through `EPF-19` | Partial, expansion paused | `Step 1` unresolved; the real requester/operator/tenant-admin loop is not yet activated; shell work built ahead of gate does not close the sellable standard | No new artifact requirement before activation; use Step 1 live artifacts to validate shell clarity once real pilot use exists | `TBD` | `TBD` | Hold further shell expansion unless it directly improves Step 1 activation or already-built Step 3 clarity |
| `Step 4 — Enterprise Infrastructure P0 Closure` | Launch `03-08` | Partial, implementation largely present | The live pilot cannot yet rely on the actual identity / vault / connector path because Step 1 has not activated the real pilot loop | Proof from the first real pilot path that the frozen identity, vault, connector, and ledger path are the relied-on live path | `TBD` | `TBD` | Keep this step partial until the live pilot uses the real enterprise path |
| `Step 5 — Launch, Support, and Compliance Package` | Launch `02`; Launch `09-13`; operator, onboarding, compliance, deployment, and runbook docs | Partial, blocked | Missing Step 1 / Step 2 live evidence; final `G1` clean-candidate / release-baseline gap remains open | Clean release-baseline candidate plus live pilot evidence exercised against runbooks, support, compliance, and deployment materials | `TBD` | `TBD` | Close `G1` and rerun launch readiness only after Steps 1-2 are credible |
| `Step 6 — Commercial Packaging and Sales Readiness` | Buyer-facing drafts, one-pagers, and product blueprint inputs | Not started | No evidence-backed buyer package, no single launch scenario/package, and no pilot-to-paid path anchored to live pilot truth | One primary buyer; one primary scenario; package/modules definition; deployment offering; pilot-to-paid path; support boundary; preliminary pricing direction | `TBD` | `TBD` | Start only after Steps 1-5 are credible enough for enterprise evaluation |

## 0B. Paused / Deprioritized Until Sellable Standard
- Launch `14.x` HOLD / hypercare continuation without changed real facts.
- Post-`EPF-19` shell / page / panel / drilldown expansion.
- `LOOP-012` connector credential/provider breadth and `LOOP-021` provider-matrix rollout.
- `LOOP-001`, `LOOP-003`, `LOOP-004`, and `LOOP-005` beyond regression / safety maintenance for the frozen pilot path.
- Speculative consumer-shell, agent-workforce, governance-primitive, BPM / DSL, destructive-automation, and broad provider / connector expansion work.

## 0C. Next Bounded Slice
- User-directed enterprise closure slice over the frozen Step 1 pilot boundary.
- Active implementation focus:
  - server-enforced enterprise RBAC and persistence guards
  - real web OIDC callback/session closure
  - full invite / accept / revoke / suspend / reactivate membership lifecycle
  - real Approval / Review / Audit center projections and decision APIs
  - pilot activation write-path authorization and promote gating

## 0D. Enterprise Closure Override (2026-03-09)
- Scope justification:
  - the user explicitly requested implementation of enterprise login, lifecycle, RBAC, center, persistence, and pilot-activation closure, so the write surface was widened beyond the default Step 1 docs-only slice to the bounded enterprise shell / API / test surface.
- Delivered:
  - added shared server-side enterprise authorization and production persistence gates for enterprise and pilot-activation write APIs
  - completed web Okta OIDC callback/session persistence flow and restricted current-workspace OA role switching to real bound roles
  - completed membership invite / accept / revoke / suspend / reactivate lifecycle with durable invite token and acceptance metadata
  - added real enterprise Approval / Review / Audit center APIs and platform panels over durable task waits, artifact review state, compliance exports, membership trails, and activation blockers
  - hardened pilot activation write endpoints so only authorized enterprise sessions in `workspace_mode=current` can submit, verify, or promote
- Validation:
  - `npm run -s typecheck` -> PASS
  - `npx vitest run tests/agentKernel.api.test.ts tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS

## 0E. B-end Follow-through Closure (2026-03-10)
- Delivered:
  - added B-end auth and persistence diagnostics in the enterprise platform
  - deepened Approval / Review / Audit center UX with search, filters, grouped source buckets, detail expansion, and safe bulk actions for approval/review
  - added B-end production persistence checklist and Okta auth checklist docs
  - added B-end admin/reviewer/audit quick-start, troubleshooting, and onboarding docs
  - added buyer-facing B-end commercial package documentation
- Validation:
  - `npm run -s typecheck` -> PASS
  - `npx vitest run tests/agentKernel.api.test.ts tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseDiagnosticsPanel.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
  - `npm run build` -> PASS

## 1. Milestone Summary
Historical milestone summary below retains implementation completion state for traceability. It does not indicate sellable-standard closure.

| Milestone | Status | Summary |
|---|---|---|
| Launch 00 Roadmap and Execution Order | Done | The remaining launch-blocking workstreams, dependencies, validation gates, pilot target, and non-negotiable pilot exit criteria are now frozen in `docs/Launch/Launch_00_Roadmap_and_Execution_Order.md` |
| Launch 01 Scope Freeze and Deferred Boundaries | Done | Pilot scope is now frozen to the advisor workflow template family plus the Okta OIDC/SCIM, HashiCorp Vault, single webhook handoff, and single-tenant deployment paths; unsupported paths are explicitly deferred |
| Launch 02 Release Baseline, Repo Hygiene, and Gating | Done | Repo-noise inventory refreshed, ignore/temp/export boundaries tightened, launch-step write boundaries frozen, and baseline/preflight checklists updated without touching runtime code |
| Launch 03 EI-P0C Service-Backed Worker Pool and Remote Runner Control Plane | Done | The agent-kernel now has a bounded service-backed worker loop, durable claim/lease/requeue visibility, replay-safe stale-claim recovery, and additive API/query summaries while preserving local-first fallback |
| Launch 04 EI-P0D Service Auth Closure, Worker Identity, and Control Plane Safety | Done | The agent-kernel now enforces typed service auth for worker/control-plane actions, appends durable allow/deny auth audit records, preserves fail-closed local fallback for denied remote control actions, and surfaces auth provenance in existing execution summaries |
| Launch 05 Identity and Admin Minimum Closure | Done | The agent-kernel now supports a real Okta OIDC login path, durable enterprise principal/binding/session state, admin role mapping, and bounded directory shrink/deprovision closure for the frozen pilot path |
| Launch 06 Vault and Credential Minimum Closure | Done | The agent-kernel now supports one real HashiCorp Vault-backed HTTPS webhook credential path with lease/renew/revoke/rotate lifecycle, route gating by credential health, operator-visible credential summaries, and full TypeScript validation closure |
| Launch 07 Connector Platform Minimum Closure | Done | The agent-kernel now routes the frozen generic webhook path and the advisor CRM/compliance handoff path through one bounded connector platform contract with durable retry/timeout/rate-limit/dead-letter behavior and conformance coverage |
| Launch 08 Authoritative Ledger and Query Model Hardening | Done | The agent-kernel now treats the append-only execution ledger as authoritative truth, hardens projection version/compatibility/rebuild policy, persists archive compaction hints, and exposes additive compatibility/retention visibility with full TypeScript validation closure |
| Launch 09 Observability, SRE, and Incident Baseline | Done | The agent-kernel now exposes bounded task and pilot observability summaries with correlation ids, tracing/log/alert/SLO baselines, degraded-mode visibility, dashboard gauges, and explicit on-call/recovery runbooks for the enterprise pilot |
| Launch 10 Compliance Execution Baseline | Done | The agent-kernel now exposes bounded task and pilot compliance summaries, durable deletion-request and audit-export records, hashed redaction-first export bundles, explicit manual legal-hold posture, and a pilot security/privacy questionnaire starter pack |
| Launch 11 Tenant, Environment, and Region Deployment Baseline | Done | The agent-kernel now exposes bounded task and pilot deployment summaries, explicit single-tenant deployment and environment-stage posture, tenant-isolation and region/residency warnings, secret-separation visibility, and a pilot deployment baseline reference doc |
| Launch 12 Operator Runbooks, Solution Templates, and Onboarding | Done | The pilot now has a readable operator guide and escalation path, a three-template advisor workflow pack, a repeatable onboarding checklist, and an explicit KPI/success scorecard without widening the frozen launch scope |
| Launch 13 Full Launch Rehearsal and Launch Gate | Blocked | The frozen pilot rehearsal passed across the required service and Android/host validation paths, including connected tests on `SM-X916B - 16`, but the final `G4` launch gate remains blocked because `G1` release-baseline cleanliness is not satisfied in the current candidate worktree |
| Enterprise Productization Foundation | In progress | Launch 14.x docs are now frozen pending real pilot activation evidence; the active workstream is enterprise productization with explicit activation truth, requester inbox, tenant-admin setup visibility, policy studio summary, and explicit demo workspace foundations across agent-kernel, Android host, and web shell |
| EPF-2 Pilot Activation Flows, Actor Onboarding, and Real Evidence Capture | Done | Typed durable pilot actor/evidence records, bounded activation actions, derived checklist/blocker/evidence-category summaries, and enterprise-shell visibility are now implemented without allowing demo/simulator/test artifacts to count as real pilot evidence |
| EPF-3 Pilot Environment Binding, Actor Provisioning, and Real Evidence Handoff | Done | Typed durable environment binding, actor provisioning/access, and connector activation eligibility are now implemented; activation-ready is now a runtime decision; shell/governance views can show why pilot activation is or is not ready without promoting synthetic evidence |
| EPF-4 External Pilot Activation Package, Handoff, and Verified Live Evidence Intake | Done | Typed durable activation package and external artifact intake runtime is now implemented; verified real artifacts can be promoted into activation truth and real evidence categories; shell/governance views now show package progress and receive/verify/reject/promote outcomes clearly |
| EPF-5 Real Pilot Activation Execution, Verified Artifact Promotion, and Live Evidence Closure | Blocked | The EPF-4 runtime path was used as the activation surface, but this workspace only exposes simulator project binding and no local pilot env/auth/actor artifacts, so no `REAL_PILOT` artifact could be verified or promoted |
| External Pilot Activation Request Pack and Explicit Launch-State Model | Done | The launch state is now explicitly `PILOT_ACTIVATION_IN_PROGRESS`; the external request pack plus the 48-hour war room checklist enumerate artifacts A-F with owner/due/acceptance rules; and root append-only launch evidence/feedback/incident/closure docs are aligned to that state |
| EPF-6 Local Multi-Actor Lab and Role-Segmented Rehearsal | Done | The product now supports an explicit non-pilot local role lab with requester/operator/tenant-admin switching and role-segmented local rehearsal truth, and the Android connected gate is green after adding device-ready test-host bootstrap coverage |
| EPF-7 Local Role Lab Visualization and Rehearsal UX | Done | `LOCAL_ROLE_LAB` is now visually obvious in both web and Android shell surfaces with persistent rehearsal language, active role visibility, scenario, handoff/timeline, non-pilot evidence, and pilot-gap cards |
| EPF-8 Standalone Enterprise Platform Frontend | Done | The web surface now includes a standalone enterprise platform mode that presents workspace seats, requester/operator/admin surfaces, policy studio, and activation summaries as a B2B platform rather than only a phone-style app shell |
| EPF-9 Enterprise Web Platform Primary Shell | Done | The enterprise platform is now the default web entry and the phone-style app shell is demoted to a compatibility path, making the web product read as a workspace-first enterprise console by default |
| EPF-10 Role-Based Web Workspaces and Multipage Enterprise Console | Done | The enterprise web platform now supports dedicated workspace/requester/operator/tenant-admin pages, shareable role-page URLs, and seat-driven new-tab opening so multi-role participation is visible as part of the same platform |
| EPF-11 Enterprise Account Shell and Members Access Workspace | Done | The enterprise web platform now exposes an account shell and a dedicated Members & Access page so workspace participation and access posture read like a real SaaS workspace instead of a preview shell |
| EPF-12 Enterprise Account Shell and Role Workboards | Done | The enterprise web platform now gives requester/operator/tenant-admin pages dedicated workboards, making each role page read like a real employee workspace rather than a generic shared dashboard |
| EPF-13 Collaboration Map and Identity Access Posture | Done | The shared workspace page now exposes a collaboration map and the tenant-admin page now exposes identity/access posture so cross-role flow and access truth stay readable inside the same platform |
| EPF-14 Enterprise Sign-In Shell and Access Matrix | Done | The tenant-admin shell now exposes enterprise sign-in posture and the Members & Access page now exposes an access matrix so enterprise access state is visible in-product |
| EPF-15 Organization & Workspace Management Layer | Done | The web platform now includes an Organization & Workspace page so enterprise users can see workspace/environment/activation facts inside the same console |
| EPF-16 Cross-Role Workflow Board | Done | The workspace page now includes a cross-role workflow board with requester/operator/tenant-admin lanes so collaboration is visible side by side |
| EPF-17 Enterprise Login Entry and Workspace Directory | Done | The platform now exposes an enterprise login entry panel and a workspace directory with direct links into role pages |
| EPF-18 Workspace Seat Assignment and Admin Action Center | Done | The platform now exposes seat assignment and an admin action center so tenant admins can see operational ownership inside the same shell |
| EPF-19 Workspace Seat Detail and Management Drilldown | Done | The platform now supports focused seat/member deep links and a detailed workspace participant view so enterprise users can inspect role, access, work, and handoff context directly |
| EPF-20 Local Role Lab Task Submission and Cross-Request Continuity | Done | The web platform now supports requester-side local-lab task submission, browser-durable rehearsal task persistence, and cross-role task visibility without pretending those tasks are real pilot evidence |
| Enterprise Sandbox and Guided Scenario Productization | Done | `LOCAL_ROLE_LAB` is now visibly productized as an Enterprise Sandbox with three guided scenario templates, walkthroughs, outcome summaries, and explicit demo-to-pilot gap messaging across web and Android |
| EPF-9 Shared Enterprise Sandbox, Trial Workspace Activation, and Multi-User Rehearsal | Done | The B-end platform now has a shared trial workspace model with participants, role seats, trial sessions, and deeper task/receipt/handoff visibility while preserving the strict non-pilot boundary |
| EPF-10 Server-Backed Enterprise Trial Workspace and Multi-User Coordination | Done | The B-end platform now exposes a dedicated server-side trial workspace service and APIs, product-shell trial summary integration, and explicit persistence-state signaling while keeping trial activity non-pilot |
| EPF-11 Shared Trial Join, Invite Claim, and Persistence Closure | Done | The B-end platform now supports invite acceptance, seat claim / release, explicit claim-state visibility, and persistence-truth-aware join flows without weakening the non-pilot boundary |
| EPF-12 Trial Persistence Activation and Deployment Config Closure | Done | The Preview deployment now runs the shared trial workspace against a real Postgres backend, reports `SERVER_BACKED`, and preserves invite / accept / claim / release / task continuity under live persistence |
| EPF-21 Shared Trial Join Surface and Task Detail Web Experience | Done | The B-end platform now exposes invite-code join input, URL-deep-linkable shared trial task focus, and a richer task drill-down with receipt / missing-field / handoff / approval visibility while keeping all trial activity non-pilot |
| EPF-22 Trial Timeline, Approval Detail, and Shareable Join Links | Done | The B-end platform now exposes richer trial task timeline visibility, explicit approval posture and next-action guidance, and shareable invite-claim links while keeping all trial activity non-pilot |
| EPF-23 Invite Claim Landing and Trial Decision History | Done | The B-end platform now exposes a dedicated Trial Join section, invite links that land directly on that section, and clearer task decision history derived from shared trial activity while keeping all trial activity non-pilot |
| EPF-24 Standalone Trial Join Route | Done | The B-end platform now exposes a true standalone `trial-join` route so invite claim links can open a dedicated shared-trial join page without routing through the main workspace shell |
| EPF-25 Enterprise OA Role Model and Module Productization | Done | The B-end platform now exposes the frozen OA v1 role set, module-first navigation, role switching and role-charter visibility, and a 9-seat shared trial workspace while keeping all trial activity non-pilot |
| EPF-26 Enterprise Account, Membership, and OA Permission Closure | Done | The B-end platform now exposes enterprise account and membership summaries, bounded member/role management APIs and UI, and OA module-access states derived from real enterprise bindings while keeping trial activity non-pilot |
| EPF-25 Enterprise OA Role Model and Module Productization | Done | The B-end platform now exposes a frozen OA v1 role set, module-first navigation, role switching and role-charter visibility, and a 9-seat shared trial workspace while keeping all trial activity non-pilot |
| M1 Unified WORK surface | Done | WORK entry unified, no mandatory module chooser, Interaction Hub preserved |
| M2 Preferences & Permissions control center | Done | Twin repositioned to control layer with sync/data scope/approval visibility |
| M3 External Fulfillment contractization + new states | Done | New statuses + typed contracts wired end-to-end with compatibility handling |
| M4 Regression + copy cleanup + docs/tests refresh | Done | English copy cleanup completed and required connected Android tests are green |
| M6 Governance analytics + telemetry aggregation | Done | Typed governance metrics and query aggregation added with Activity developer governance summary surface and mixed-history-safe rollups |
| M7 Settlement / dispute infra deeper pass | Done | Typed settlement/dispute/reconciliation durability, idempotency, and operational ledger filters landed |
| M8 Operator workflows + alerts + governance console | Done | Typed operator cases/alerts/queues + internal governance console + local operator action stubs landed on durable ledger truth |
| M9 Remote telemetry / alert delivery / reconciliation extraction | Done | Typed remote-ready contracts + ports/adapters + durable attempt tracking + operator-visible remote pipeline status |
| M9.5 Repo hygiene and stabilization | Done | Ignore boundaries tightened, local artifact quarantine paths standardized, preflight/workflow baseline docs added |
| M10 Remote operator backend + alert routing + collaboration | Done | Typed collaboration/handoff/routing contracts + runtime + persistence + governance UI actions landed with full validation pass |
| M11 Remote operator auth + assignment + connector routing foundations | Done | Permission-gated operator actions, durable assignment lifecycle, typed connector routing trails, and governance visibility are landed and validated |
| M12 Production connector integrations + remote alert destinations + operator collaboration hardening | Done | Typed connector delivery runtime/health/dead-letter behavior + durable collaboration routing trails + governance visibility hardening completed |
| M13 Remote operator directory + credentialing + production connector hardening | Done | Remote directory/resource typed runtime resolution, remote-aware authorization gating, destination/auth-profile binding audit trail, and governance visibility hardening completed |
| M14 Enterprise identity + directory sync + credential lifecycle hardening | Done | Typed enterprise identity/directory-sync/session provenance/credential lifecycle hardening landed with routing visibility and full validation gate pass |
| M14.5 Repo noise reduction + release baseline | Done | Durable noise inventory + release baseline checklist + ignore/boundary tightening landed with standard validation gate pass |
| M15 Enterprise SSO + SCIM + IdP + credential vault integration | Done | Typed enterprise assertion/session/directory/vault integration landed with runtime route/auth binding, degraded-path visibility, and full validation gate pass |
| M16 Production rollout controls + secret vault runtime boundary + cutover readiness | Done | Typed rollout/cutover/vault runtime controls landed with route gating/degradation decisions, receipt/governance visibility, restore continuity checks, and full validation gate pass |
| M17 Enterprise SSO + SCIM + IdP provider rollout + production vault integration | Done | Typed IdP/SCIM/vault provider semantics are integrated end-to-end (runtime routing + receipt/governance visibility + compatibility + validation) |
| M18 SaaS-grade operator console + enterprise ops UX | Done | Activity governance surface now supports operator home/queue presets, readable case timelines, safe bulk triage actions, and drillable health/alert buckets with durable runtime truth |
| M19 Enterprise operator collaboration + workflow templates + remote ops automation | Done | Typed workflow/collaboration/automation runtime landed with durable ledger traceability, governance visibility, restore continuity, and full validation gate pass |
| M20 Enterprise workflow policies + SLA timers + automation guardrails | Done | Typed workflow-policy/timer/guardrail semantics now drive runtime decisions, durable reason-coded traces, and readable governance/receipt visibility with full validation gate pass |
| M21 Enterprise workflow policy packs + tenant/workspace overrides + advanced automation controls | Done | Typed policy-pack/override precedence and simulation/throttle controls are runtime-active, durable, filterable, and visible in receipt/governance/operator surfaces with full validation gate pass |
| M22 Enterprise policy rollout safety + simulation + approval governance | Done | Typed rollout-governance runtime behavior, audit trail durability, visibility, continuity, and validation closure are complete |
| M23 Enterprise policy promotion + rollout analytics + approval operations | Done | Typed promotion/readiness/approval-operation runtime + analytics/readiness evaluation + governance/receipt visibility landed with full validation gate pass |
| M24 Enterprise policy governance programs + pack lifecycle + cross-tenant rollout controls | Done | Typed governance-program/lifecycle/cross-tenant runtime behaviors, visibility surfaces, restore continuity tests, and full validation gate are complete |
| M25 Enterprise policy estate analytics + drift remediation + lifecycle governance operations | Done | Typed policy-estate analytics/remediation runtime landed with receipt/governance visibility, filterability, and full validation gate pass |
| M26 Enterprise policy estate automation + scheduled remediation + governance program operations | Done | Typed automation/scheduling semantics are runtime-active with guardrail enforcement, durable audit trails, governance/receipt visibility, filterability, continuity, and full validation gate pass |
| M27 Enterprise policy estate scheduling windows + rollout calendars + multi-stage automation governance | Done | Typed scheduling/calendar semantics, runtime schedule gating, readable receipt/governance visibility, continuity hardening, and full validation gate are complete |
| M28 Enterprise rollout waves + calendar-aware promotion operations + cross-window governance controls | Done | Typed wave/window/cross-window runtime controls, visibility, filtering, continuity coverage, and full validation gate are complete |
| M29 Enterprise rollout promotion readiness + cross-wave analytics + window-aware governance operations | Done | Typed readiness/cross-wave/window-impact/runtime operation trails are durable, visible in receipt/governance surfaces, filterable, and fully validated |
| M30 Enterprise rollout program coordination + multi-program prioritization + escalation operations | Done | Typed coordination/priority/dependency/conflict/contention/escalation runtime layer is durable, filterable, receipt/governance-visible, and validated end-to-end |
| M31 Enterprise governance capacity planning + approval load balancing + program portfolio operations | Done | Typed capacity/load/portfolio runtime behavior, policy-vs-capacity separation, governance/receipt visibility, and full validation gate are complete |
| M32 Enterprise governance portfolio simulation + scenario planning + capacity forecast operations | Done | Typed scenario/run/forecast/comparison runtime with deterministic simulation, persistence continuity, Activity internal simulation surface, export path, and full validation gate pass |
| M33 Enterprise governance portfolio optimization + multi-objective tradeoffs + risk-aware scheduling | Done | Typed optimization contracts, bounded seeded solver, explainable top-N schedules, durable schedule selection, internal visibility, and full validation gate are complete |
| M34 Closed-loop learning for portfolio optimization | Done | Typed feedback/drift/tuning contracts, deterministic local outcome ingest + drift analysis, guarded tuning apply/deny snapshots, readable governance/receipt visibility, and full validation gate are complete |
| M35 Multi-tenant objective profiles, learning isolation, and safe propagation rules | Done | Typed scope/binding/provenance/propagation runtime behavior, deterministic resolution precedence, default isolation with drift-triggered suppression, readable visibility, and full validation gate are complete |
| M35.5 Post-M35 release hardening | Done | Release baseline gate/CI, Agent OS narrative alignment, legacy travel isolation, twin/settings runtime-truth closure, and shared cloud-sync gating landed with local validation pass |
| M36 Cross-device learning sync + federated aggregation boundaries + enterprise privacy controls | Done | Typed redacted learning-sync runtime, privacy/role-policy gating, deterministic conflict handling, federated same-tenant boundaries, restore continuity, readable visibility, and full validation gate are complete |
| M37 Remote learning transport integration + enterprise consent flows + compliance audit export | Done | Typed consent/transport/export runtime with local-first optional remote boundary, durable gating/attempt/export records, readable governance/receipt visibility, and full validation gate are complete |
| M38 Remote transport connectors (production) + enterprise key management + end-to-end compliance controls | Done | Typed production connector/key/compliance runtime, durable retry/dedupe/dead-letter/local-fallback behavior, readable governance/receipt/export visibility, and full validation gate are complete |
| M39 Policy-safe remote learning destinations + data residency controls + compliance export routing | Done | Typed destination/residency/export-route runtime, policy-aware allow/reroute/hold/suppress/local-fallback decisions, readable governance/receipt/export visibility, compatibility-safe resolved-binding routing, and full validation gate are complete |
| M40 Enterprise data exchange governance + safe destination bundles + cross-boundary audit operations | Done | Typed bundle/compatibility/decision/approval/audit runtime, durable allow/split/reroute/hold/block outcomes, readable governance/receipt/export visibility, restore-safe continuity, and full validation gate are complete |
| M42 Enterprise cross-boundary governance portfolios + trust tier programs + jurisdiction-aware rollout coordination | Done | Typed portfolio/trust-tier/jurisdiction coordination runtime, durable shared blocker/conflict state, readable governance/operator visibility, restore-safe continuity, and full validation gate are complete |
| M43 Enterprise cross-boundary governance portfolio analytics + risk budgeting + trust tier drift operations | Done | Typed portfolio analytics/risk-budget/drift runtime, durable corrective recommendations/actions, readable governance/operator/receipt visibility, searchable M43 triage, restore-safe continuity, and full validation gate are complete |
| M44 Enterprise cross-boundary governance portfolio safety rails + budget guardrails + remediation automation controls | Done | Typed safety-rail/budget-guardrail/remediation-control runtime, deterministic warning/soft-stop/hard-stop/quarantine/approval-required behavior, readable governance/operator/receipt visibility, restore-safe continuity, and full validation gate are complete |

## 1A. Enterprise Infrastructure Track Bootstrap (Historical, 2026-03-06)

### Scope lock
- Parallel enterprise infrastructure hardening track only.
- No product redesign.
- No orchestrator rewrite.
- No broadening of the product surface.
- No weakening of local-first safety behavior.

### Planning/status authority
- `docs/enterprise-infrastructure-track-plan.md`
- `docs/enterprise-infrastructure-track-status.md`
- `docs/enterprise-infrastructure-track-workstreams.md`

### Historical slices
- `EI-P0A: remote execution substrate scaffolding`
- `EI-P0B: authoritative ledger and projection scaffolding`

### Current checkpoint
- Added typed worker/session/claim/lease/heartbeat/release and remote-runner-control contracts in `services/agent-kernel/contracts.ts`.
- Added durable execution-unit, execution-claim, and worker-session persistence in memory/Postgres/Redis task stores.
- Added local-first runtime behavior for claim, heartbeat, release, lease-expiry recovery, and no-op remote-runner fallback while preserving EI-P0A retry/dead-letter behavior and EI-P0B ledger/projection truth.
- Appended durable ledger events for execution-unit enqueue, claim, heartbeat, release, lease-expiry, and local-fallback transitions.
- Exposed additive worker/control-plane summaries through existing `execution_substrate` and `execution_ledger` task responses.
- Added runtime, adapter, API, and projection tests for stale-claim recovery, persistence continuity, and replay-safe worker-state projection updates.

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS

### Remaining open gaps after bootstrap
- no real remote worker fleet, autoscaling worker pool, or remote runner mesh yet
- no broader cross-task materialized query suite, archival policy, or migration/version closure yet
- no production OIDC/SAML/SCIM or service-auth closure yet
- no production vault lease/renew/rotate/revoke backend yet
- no hardened connector SDK and conformance suite yet
- no SLO/error-budget/tracing/on-call stack yet
- no executable retention/deletion/legal-hold engine yet
- no finalized tenant isolation, environment strategy, or region deployment model yet

### Blockers
- None beyond the dirty working tree constraint, which is why the write surface remained tightly bounded.

## 1B. Launch 00 Roadmap and Execution Order (2026-03-07)

### Frozen launch target
- controlled enterprise pilot
- not broad GA
- finite launch sequence with one implementation workstream active in code at a time

### Frozen execution order
1. scope freeze and deferred boundaries
2. release baseline, repo hygiene, and gating
3. `EI-P0C` service-backed worker pool and remote runner control plane
4. `EI-P0D` service auth closure, worker identity, and control-plane safety
5. identity and admin minimum closure
6. vault and credential minimum closure
7. connector platform minimum closure
8. authoritative ledger and query model hardening
9. observability, SRE, and incident baseline
10. compliance execution baseline
11. tenant, environment, and region deployment baseline
12. operator runbooks, solution templates, and onboarding
13. full launch rehearsal and launch gate

### Pilot launch exit criteria
- steps `01` through `13` complete in order
- pilot boundary remains frozen
- release baseline is clean
- service-backed execution and service-auth closure are complete
- one real identity/admin path exists
- one real vault/credential path exists
- one real connector path exists
- authoritative ledger/query truth is hardened
- observability, compliance, deployment, and operator-readiness baselines exist
- final launch rehearsal passes with no unresolved blocker

### Explicitly deferred beyond pilot
- broad GA requirements
- wide provider/connector matrix rollout
- shared multi-tenant productization, self-hosted, hybrid, or multi-region active-active deployment
- broader operator UX redesign
- advanced automation layers and speculative roadmap expansion

### Changed files
- `docs/Launch/Launch_00_Roadmap_and_Execution_Order.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- Documentation-only change set.
- No runtime or Android/host files changed.
- Validation gates were documented and frozen in the roadmap, but the TypeScript and Android command suites were not rerun for this step.

### Blockers
- None.

## 49. EPF-21 Shared Trial Join Surface and Task Detail Web Experience (2026-03-09, Web-only B-end pass)

### Scope
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion

### Delivered
- Added explicit invite-code join input inside the enterprise sandbox.
- Added URL-deep-linkable shared trial task focus using:
  - `trial_task`
  - `invite_code`
- Wired requester inbox items into the same shared trial task drill-down that operator and tenant-admin pages can continue to inspect.
- Added a dedicated trial task detail panel with lifecycle, receipt summary, missing fields, handoff lines, and approval boundary summary.
- Preserved strong non-pilot labeling across all new trial surfaces.

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Deferred
- Dedicated invite-claim landing outside the main workspace shell
- Richer task timeline / receipt export / approval detail views
- Production-environment persistence activation
- Real pilot activation and `REAL_PILOT` evidence

### Blockers
- None in the B-end web platform code.

## 50. EPF-22 Trial Timeline, Approval Detail, and Shareable Join Links (2026-03-09, Web-only B-end pass)

### Scope
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion

### Delivered
- Extended trial task detail with:
  - explicit next-action guidance
  - approval detail lines
  - task timeline
  - activity-derived history when available
- Added shareable invite-claim links for open invites.
- Reused the same shared trial truth and kept URL-deep-linkable task focus intact.
- Preserved strong non-pilot labeling and trial-only boundaries.

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Deferred
- Dedicated invite-claim landing outside the main workspace shell
- Richer receipt export and approval decision history
- Production-environment persistence activation
- Real pilot activation and `REAL_PILOT` evidence

### Blockers
- None in the B-end web platform code.

## 51. EPF-23 Invite Claim Landing and Trial Decision History (2026-03-09, Web-only B-end pass)

### Scope
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion

### Delivered
- Added a dedicated `Trial Join` section inside the enterprise workspace shell.
- Updated shareable invite links so they land directly on that join section.
- Extended server-backed trial task creation to append requester/operator/tenant-admin workflow activity records.
- Trial task detail now uses those shared activity records to show clearer workflow decision history when available.

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Deferred
- Dedicated standalone invite-claim route outside the main workspace shell
- Richer receipt export and approval decision history
- Production-environment persistence activation
- Real pilot activation and `REAL_PILOT` evidence

### Blockers
- None in the B-end web platform code.

## 52. EPF-24 Standalone Trial Join Route (2026-03-09, Web-only B-end pass)

### Scope
- B-end web platform only
- still not `REAL_PILOT`
- no Android / C-end expansion
- no connector / workflow / deployment-mode expansion

### Delivered
- Added a standalone `surface=trial-join` route.
- Added a dedicated standalone invite-claim page for the shared enterprise sandbox.
- Updated invite links so they land directly on the standalone route.
- Preserved shared trial truth, persistence visibility, and strict non-pilot labeling on the standalone page.

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Deferred
- Richer standalone join success / redirect handling
- Richer receipt export and approval decision history
- Production-environment persistence activation
- Real pilot activation and `REAL_PILOT` evidence

### Blockers
- None in the B-end web platform code.

## 44. Enterprise Sandbox and Guided Scenario Productization (2026-03-09, Web-only B-end pass)
### Status
- Overall: done

### Completed outputs
- turned `LOCAL_ROLE_LAB` into a clearly productized Enterprise Sandbox on the web enterprise platform
- added a sandbox landing/home surface
- added three runnable scenario templates:
  - Advisor Client Intake → Compliance Review → CRM Handoff
  - Cross-Boundary Export Review
  - Exception / Dispute / Remediation Handling
- added guided walkthrough, rehearsal outcome summary, and explicit demo-to-pilot gap messaging
- kept all sandbox activity explicitly non-pilot and non-promotable

### Changed files
- `services/localRoleLabTaskStore.ts`
- `components/EnterpriseSandboxHome.tsx`
- `components/EnterprisePlatformView.tsx`
- `tests/localRoleLabTaskStore.test.ts`
- `docs/EPF_8_Enterprise_Sandbox_Guided_Scenario_Productization.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Blockers
- No Enterprise Sandbox implementation blocker in the B-end web platform.

## 45. EPF-9 Shared Enterprise Sandbox, Trial Workspace Activation, and Multi-User Rehearsal (2026-03-09, Web-only B-end pass)
### Status
- Overall: done

### Completed outputs
- added typed shared trial workspace / participant / role-seat / session / trial-task concepts in the B-end sandbox data layer
- added bounded multi-session rehearsal semantics
- deepened task-detail / receipt / approval / handoff visibility inside the sandbox
- added visible trial-to-pilot conversion guidance
- kept all trial activity explicitly non-pilot and non-promotable

### Changed files
- `services/localRoleLabTaskStore.ts`
- `components/EnterpriseSandboxHome.tsx`
- `components/EnterprisePlatformView.tsx`
- `components/LocalRoleLabTaskComposer.tsx`
- `tests/localRoleLabTaskStore.test.ts`
- `docs/EPF_9_Shared_Enterprise_Sandbox_Trial_Workspace_Activation.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Blockers
- No EPF-9 implementation blocker in the B-end web platform.

## 46. EPF-10 Server-Backed Enterprise Trial Workspace and Multi-User Coordination (2026-03-09, Web-only B-end pass)
### Status
- Overall: done

### Completed outputs
- added a dedicated server-side trial workspace service and APIs
- exposed trial workspace truth through product-shell summary in `local_lab` mode
- added explicit persistence-state signaling (`MEMORY_ONLY` vs `SERVER_BACKED`)
- kept browser fallback only as compatibility behavior
- preserved strict non-pilot labeling and conversion-to-pilot guidance

### Changed files
- `services/agent-kernel/trialWorkspace.ts`
- `api/agent-kernel/trial-workspace/summary.ts`
- `api/agent-kernel/trial-workspace/session.ts`
- `api/agent-kernel/trial-workspace/task.ts`
- `api/agent-kernel/trial-workspace/invite.ts`
- `api/agent-kernel/product-shell/summary.ts`
- `services/agentKernelShellApi.ts`
- `services/localRoleLabTaskStore.ts`
- `components/EnterpriseSandboxHome.tsx`
- `components/EnterprisePlatformView.tsx`
- `components/LocalRoleLabTaskComposer.tsx`
- `tests/agentKernel.api.test.ts`
- `tests/localRoleLabTaskStore.test.ts`
- `docs/EPF_10_Server_Backed_Enterprise_Trial_Workspace_Multi_User_Coordination.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Blockers
- Current deployment still lacks `AGENT_KERNEL_POSTGRES_URL` or `AGENT_KERNEL_REDIS_URL`, so the live environment reports `MEMORY_ONLY` even though the server-backed path is implemented.

## 47. EPF-11 Shared Trial Join, Invite Claim, and Persistence Closure (2026-03-09, Web-only B-end pass)
### Status
- Overall: done

### Completed outputs
- added invite acceptance flow
- added seat claim / release semantics
- made seat claim state visible in-product
- kept persistence truth explicit during join/claim flows
- preserved strict non-pilot labeling and conversion guidance

### Changed files
- `services/agent-kernel/trialWorkspace.ts`
- `api/agent-kernel/trial-workspace/invite/accept.ts`
- `api/agent-kernel/trial-workspace/seat/release.ts`
- `services/agentKernelShellApi.ts`
- `services/localRoleLabTaskStore.ts`
- `components/EnterpriseSandboxHome.tsx`
- `tests/agentKernel.api.test.ts`
- `tests/localRoleLabTaskStore.test.ts`
- `docs/EPF_11_Shared_Trial_Join_Invite_Claim_and_Persistence_Closure.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Blockers
- Current deployment still lacks `AGENT_KERNEL_POSTGRES_URL` or `AGENT_KERNEL_REDIS_URL`, so live persistence remains `MEMORY_ONLY` until infra config is added.

## 48. EPF-12 Trial Persistence Activation and Deployment Config Closure (2026-03-09, Web-only B-end pass)
### Status
- Overall: done

### Completed outputs
- configured a real Preview Postgres persistence path
- verified live `SERVER_BACKED` persistence state
- verified invite / accept / claim / release / task continuity against the deployed backend
- kept sandbox/trial activity explicitly non-pilot

### Changed files
- `docs/EPF_12_Trial_Persistence_Activation_Deployment_Config_Closure.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS
- deployed Preview verification:
  - `trial_workspace.persistence_state = SERVER_BACKED`
  - invite creation / acceptance
  - seat claim / release
  - session registration
  - trial task creation

### Blockers
- Production persistence is still not configured; this closure is currently on Preview only.

## 41. EPF-19 Workspace Seat Detail and Management Drilldown (2026-03-08)
### Status
- Overall: done

### Completed outputs
- added shareable `member` deep-link state to the enterprise platform URL model
- added a focused seat detail panel with role/access/work/handoff/evidence-boundary context
- added direct `Inspect seat` links from organization, members, and seat-assignment surfaces
- kept local-lab inspection explicitly non-pilot and non-promotable

### Changed files
- `components/EnterprisePlatformView.tsx`
- `components/WorkspaceSeatDetailPanel.tsx`
- `components/WorkspaceDirectoryPanel.tsx`
- `components/WorkspaceSeatAssignmentPanel.tsx`
- `components/WorkspaceMembersPanel.tsx`
- `tests/components/EnterprisePlatformView.test.ts`
- `docs/EPF_19_Workspace_Seat_Detail_and_Management_Drilldown.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS

### Blockers
- No EPF-19 implementation blocker.

## 42. EPF-20 Local Role Lab Task Submission and Cross-Request Continuity (2026-03-09)
### Status
- Overall: done

### Completed outputs
- added browser-durable local-lab task persistence
- added requester-side local-lab task submission from a pasted brief
- merged local-lab tasks into requester inbox, scenario, handoff/timeline, and seat detail views
- kept local-lab task continuity explicitly non-pilot and non-promotable

### Changed files
- `services/localRoleLabTaskStore.ts`
- `components/LocalRoleLabTaskComposer.tsx`
- `components/EnterprisePlatformView.tsx`
- `tests/localRoleLabTaskStore.test.ts`
- `docs/EPF_20_Local_Role_Lab_Task_Submission_and_Cross_Request_Continuity.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

### Blockers
- No EPF-20 implementation blocker.

## 43. Enterprise Sandbox and Guided Scenario Productization (2026-03-09)
### Status
- Overall: done

### Completed outputs
- added a clear Enterprise Sandbox landing/home surface
- added three runnable scenario templates:
  - Advisor Client Intake → Compliance Review → CRM Handoff
  - Cross-Boundary Export Review
  - Exception / Dispute / Remediation Handling
- added a lightweight guided walkthrough layer
- added a readable rehearsal outcome summary
- added an explicit demo-to-pilot gap panel
- kept sandbox activity explicitly non-pilot and non-promotable
- aligned the sandbox meaning across web and Android

### Changed files
- `services/localRoleLabTaskStore.ts`
- `components/EnterpriseSandboxHome.tsx`
- `components/EnterprisePlatformView.tsx`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/EnterpriseShellFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/components/EnterpriseShellCards.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `tests/localRoleLabTaskStore.test.ts`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/EnterpriseShellFormatterTest.kt`
- `docs/EPF_8_Enterprise_Sandbox_Guided_Scenario_Productization.md`
- `docs/enterprise_productization_foundation_spec.md`
- `docs/enterprise_productization_foundation_plan.md`
- `docs/enterprise_productization_foundation_status.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

### Blockers
- No Enterprise Sandbox implementation blocker.

## 1P. Enterprise Productization Foundation (2026-03-07)

### Scope lock
- additive productization layer only
- no orchestrator rewrite
- no ledger/history rewrite
- no BPM/DSL
- no destructive automation
- no Launch 14.x doc expansion unless real evidence appears

### Completed outputs
- added:
  - `docs/enterprise_productization_foundation_spec.md`
  - `docs/enterprise_productization_foundation_plan.md`
  - `docs/enterprise_productization_foundation_status.md`
- froze Launch 14 master doc as externally blocked by real pilot activation dependencies
- added explicit activation/environment truth to `agent-kernel`
- added product-shell APIs for environment, requester inbox, policy studio, and aggregate shell summary
- added Android host shell foundations for environment banner, workspace selector, requester inbox, tenant-admin setup, policy studio summary, and internal operator-shell notice
- added web shell foundations for environment banner, workspace selector, requester inbox, tenant-admin setup, and policy studio
- added explicit demo workspace and seeded demo data marked non-pilot

### Current state
- real pilot activation remains blocked externally
- product no longer depends on fake pilot hypercare progress to look enterprise-demoable
- current step status: `in progress`

### Blockers
- No runtime blocker for the new product shell in this slice.

## 1Q. EPF-2 Pilot Activation Flows, Actor Onboarding, and Real Evidence Capture (2026-03-07)

### Completed outputs
- added typed durable pilot actor readiness records
- added typed durable pilot evidence artifact records
- added bounded activation action APIs
- added derived checklist / blocker / evidence-category / next-action product shell summaries
- surfaced activation progress in the enterprise shell

### Validation
- all required EPF-2 validation commands passed

### Blockers
- No implementation blocker in EPF-2.
- Real pilot activation itself remains externally blocked.

## 1R. EPF-3 Pilot Environment Binding, Actor Provisioning, and Real Evidence Handoff (2026-03-07)

### Completed outputs
- added typed durable pilot environment binding state
- added typed durable actor provisioning/access state
- added typed durable connector activation eligibility state
- added runtime activation-ready decision
- added shell/governance visibility for activation-ready and blocker reasons

### Validation
- all required EPF-3 validation commands passed

### Blockers
- No implementation blocker in EPF-3.
- Real pilot environment and real actors remain externally blocked.

## 1S. EPF-4 External Pilot Activation Package, Handoff, and Verified Live Evidence Intake (2026-03-07)

### Completed outputs
- added typed durable activation package and external artifact intake records
- added package handoff and artifact receive / verify / reject / promote actions
- added runtime promotion from verified real external artifacts into pilot activation truth and real evidence categories
- extended shell/governance surfaces with activation package progress and intake verification visibility

### Validation
- all required EPF-4 validation commands passed

### Blockers
- No implementation blocker in EPF-4.
- Real pilot activation itself remains externally blocked pending real external environment, actor, and evidence artifacts.

## 1T. EPF-5 Real Pilot Activation Execution, Verified Artifact Promotion, and Live Evidence Closure (2026-03-07)

### Completed outputs
- attempted real activation through the existing EPF-4 package/intake/promotion path
- confirmed the current workspace only exposes simulator project binding
- confirmed no local pilot env/auth keys are present
- confirmed no local Vercel auth files are present
- rejected any synthetic fallback as invalid pilot evidence

### Validation
- docs/evidence-only execution result
- no code or launch-critical config changed
- no validation rerun required

### Blockers
- External blocker only: real pilot environment binding, real operator access/session, named requester, and tenant-admin/support touchpoint are still absent from this workspace.

## 1U. External Pilot Activation Request Pack and Explicit Launch-State Model (2026-03-08)

### Completed outputs
- created the external pilot activation request pack
- enumerated the exact required real artifacts with owner, due date, and acceptance rule
- aligned root append-only launch evidence / feedback / incident / closure artifacts to explicit activation-state wording
- removed generic hold wording from the primary launch-state description for the current condition

### Current explicit launch state
- `PILOT_ACTIVATION_IN_PROGRESS`
- true pilot Day 0 remains blocked until Artifact E exists

### Validation
- no code or launch-critical configuration changed
- no validation rerun required

### Blockers
- External blocker only: the requested real environment, operator, requester, tenant-admin/support, and first-task artifacts still need to be delivered by external owners.

## 1V. EPF-6 Local Multi-Actor Lab and Role-Segmented Rehearsal (2026-03-08)

### Completed outputs
- added explicit `local_lab` workspace mode
- added local requester/operator/tenant-admin actor summaries
- added role-segmented local rehearsal inbox visibility in web and Android shell surfaces
- kept local lab explicitly non-pilot and blocked from real pilot evidence promotion

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

### Blockers
- No implementation blocker in EPF-6.

## 1W. EPF-7 Local Role Lab Visualization and Rehearsal UX (2026-03-08)

### Completed outputs
- added a persistent local-lab rehearsal header
- kept the active role seat always visible
- added scenario, handoff/timeline, non-pilot evidence, and pilot activation gap cards
- aligned Android and web local-lab meanings

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.EnterpriseShellFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

### Blockers
- No implementation blocker in EPF-7.

## 1X. EPF-8 Standalone Enterprise Platform Frontend (2026-03-08)

### Completed outputs
- added a standalone web enterprise platform view
- added a top-level platform mode separate from the app shell
- reused existing product-shell truth for workspace-first presentation

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts` -> PASS

### Blockers
- No implementation blocker in EPF-8.

## 1Y. EPF-9 Enterprise Web Platform Primary Shell (2026-03-08)

### Completed outputs
- made the enterprise platform the default web entry
- demoted phone-style app shell to compatibility URL surface
- strengthened workspace-console framing for enterprise users

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/components/EnterprisePlatformView.test.ts tests/components/EnterpriseShellPanels.test.ts` -> PASS

### Blockers
- No implementation blocker in EPF-9.

## 1C. Launch 01 Scope Freeze and Deferred Boundaries (2026-03-07)

### Frozen pilot launch boundary
- primary launch template family:
  - advisor workflow execution with evidence and approval gates
  - launch template: pre-meeting prep -> post-meeting notes -> CRM-ready draft -> compliance handoff package
- supported pilot enterprise path:
  - identity/admin: Okta OIDC + Okta SCIM
  - vault/credential lifecycle: HashiCorp Vault
  - connector handoff: one outbound credentialed HTTPS webhook into the pilot tenant CRM/compliance intake
  - deployment: vendor-managed single-tenant cloud deployment with one staging environment, one production environment, and one primary region per tenant
- local-first safety lock:
  - local permission precedence remains authoritative
  - degraded identity/vault/connector paths must block or degrade visibly
  - receipt, evidence, approval, and Activity history requirements remain unchanged

### Explicitly deferred from pilot launch
- additional workflow families beyond the frozen advisor workflow template family
- native vendor connector commitments beyond the single webhook handoff
- additional IdP, SCIM, or vault provider matrix breadth beyond the frozen Okta/HashiCorp path
- self-hosted/on-prem, hybrid, shared multi-tenant, or multi-region active-active deployment models
- broader operator UX redesign, advanced automation layers, and broader twin/Bellman product surfacing
- open-ended external supplier-market fulfillment; future external supply must still route through LIX when that scope is reopened

### Changed files
- `docs/Launch/Launch_01_Scope_Freeze_and_Deferred_Boundaries.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- Documentation-only change set.
- No `services/agent-kernel/*`, Android runtime, or host runtime files changed.
- The TypeScript and Android validation command suites were not rerun for this step.

### Blockers
- None.

## 1D. Launch 02 Release Baseline, Repo Hygiene, and Gating (2026-03-07)

### Scope lock
- hygiene-only step
- no architecture changes
- no opportunistic refactors
- no broad cleanup war across unrelated directories
- no runtime/product code edits in this pass

### Completed outputs
- refreshed `docs/repo-noise-inventory.md` with the live worktree snapshot and explicit path classes
- tightened root `.gitignore` for temp/cache/patch/export churn
- tightened `LumiKeyboard-Android/.gitignore` for local temp/cache boundaries
- froze launch-step write-surface rules in `AGENTS.md`
- refreshed `docs/release-baseline-checklist.md` and `docs/milestone-preflight-checklist.md` as the canonical release-baseline gate, including expanded untracked-file visibility checks
- synced `docs/Launch/Launch_02_Release_Baseline_Repo_Hygiene_and_Gating.md`, `spec`, `plan`, and `status`

### Changed files
- `.gitignore`
- `LumiKeyboard-Android/.gitignore`
- `AGENTS.md`
- `docs/Launch/Launch_02_Release_Baseline_Repo_Hygiene_and_Gating.md`
- `docs/repo-noise-inventory.md`
- `docs/release-baseline-checklist.md`
- `docs/milestone-preflight-checklist.md`
- `docs/repo-hygiene-baseline.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Noise inventory snapshot
- `git status --short` entries at step start: `1040`
- expanded untracked visibility:
  - `git status --short --untracked-files=all`: `1212`
- tracked generated Android build noise remains dominant:
  - `LumiKeyboard-Android/app/build/**`: `636`
  - `LumiKeyboard-Android/.gradle/**`: `29`
- durable visible workstreams remain intentionally visible:
  - `docs/**`: `86`
  - `services/**`: `49`
  - `api/**`: `22`
  - `tests/**`: `51`
- expanded untracked visibility confirms durable workstream fanout rather than new ignore candidates:
  - `docs/**`: `99`
  - `services/**`: `73`
  - `api/**`: `30`
  - `tests/**`: `51`

### Validation
- Docs/ignore/boundary-only change set.
- No `services/agent-kernel/*`, `api/agent-kernel/tasks/*`, Android runtime, or host runtime files changed.
- The TypeScript and Android validation command suites were not rerun for this step.

### Deferred / out-of-scope
- index-level cleanup of previously tracked Android build/Gradle artifacts remains deferred to `LOOP-010`
- broad cleanup across unrelated workstreams remains out of scope
- no runtime/product behavior changes were attempted

### Blockers
- The prior Launch 01 dependency is resolved.
- The dirty working tree remains an execution constraint, which is why the write surface stayed tightly bounded.

## 1E. Launch 03 EI-P0C Service-Backed Worker Pool and Remote Runner Control Plane (2026-03-07)

### Scope lock
- service-layer execution substrate only
- additive and backward-compatible
- no autoscaling fleet
- no full remote execution platform
- no Android/orchestrator rewrite
- no weakening of local-first fallback behavior

### Completed outputs
- Added `services/agent-kernel/workerPool.ts` as the bounded service-backed worker loop for deterministic task draining, polling, and scheduled follow-up runs.
- Routed runtime follow-up execution through the worker-pool abstraction instead of ad hoc task timers.
- Closed durable worker visibility in summaries/projections:
  - claim history
  - completed/released/expired claim counts
  - last claim/session/execution-unit identifiers
  - last release reason and lease metadata
- Made stale-claim recovery explicitly auditable with `TASK_EXECUTION_REQUEUED` ledger events and durable runnable requeue after lease expiry.
- Preserved local-first remote-runner fallback and existing retry/dead-letter behavior.
- Added runtime, API, store-adapter, and projection coverage for worker-loop execution, durable task-id recovery, requeue projection state, and claim visibility.

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/storeAdapters.ts`
- `services/agent-kernel/substrate.ts`
- `services/agent-kernel/ledger.ts`
- `services/agent-kernel/runtime.ts`
- `services/agent-kernel/workerPool.ts`
- `services/agent-kernel/index.ts`
- `tests/agentKernel.runtime.test.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `tests/agentKernel.ledgerProjection.test.ts`
- `docs/Launch/Launch_03_EI_P0C_Service_Backed_Worker_Pool_and_Remote_Runner_Control_Plane.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task APIs remain stable; Launch 03 extends `execution_substrate` and `execution_ledger` visibility rather than replacing response shapes.
- Local-first safety semantics remain authoritative when remote execution is unavailable.

### Remaining deferred items
- service-auth closure, worker-identity hardening, and control-plane admission safety were deferred from Launch 03 and are now closed in Launch 04
- autoscaling fleets, remote worker mesh, and broader scheduling policy remain deferred
- broader cross-task query hardening, compliance execution, deployment topology, and operator-readiness remain in later frozen launch steps

### Blockers
- None.

## 1F. Launch 04 EI-P0D Service Auth Closure, Worker Identity, and Control Plane Safety (2026-03-07)

### Scope lock
- service-layer auth closure only
- additive and backward-compatible
- no full enterprise IAM platform
- no broad user-facing identity redesign
- no weakening of local-first fallback behavior

### Completed outputs
- Added typed service principal and service-auth context contracts for:
  - worker identity
  - worker sessions
  - execution claims
  - heartbeats and timeout records
  - remote-runner control requests/results
- Added runtime-default worker-scoped service credentials plus injectable authorizer/context seams without changing existing task APIs.
- Enforced deny-by-default auth evaluation for:
  - `claimExecutionUnit`
  - `heartbeatClaim`
  - `releaseClaim`
  - `recoverStaleClaims`
  - `requestRemoteRunner`
- Added typed break-glass validation rules that require approval, justification, and expiry before override.
- Added durable auth audit events and query visibility:
  - `TASK_SERVICE_AUTH_ALLOWED`
  - `TASK_SERVICE_AUTH_DENIED`
  - additive projection counts for allowed, denied, and break-glass service actions
  - last service principal/action/mode/reason visibility in `execution_ledger`
- Preserved local-first safety by failing denied remote runner control actions closed to explicit local fallback with durable denial reason and decision id visibility in `execution_substrate`.
- Kept stale-claim recovery replay-safe while allowing the current control-plane worker identity to authorize lease-expiry release after restart.
- Added runtime, API, store-adapter, and projection coverage for auth allow/deny paths and durable auth-context persistence.

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/substrate.ts`
- `services/agent-kernel/ledger.ts`
- `services/agent-kernel/runtime.ts`
- `tests/agentKernel.runtime.test.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `tests/agentKernel.ledgerProjection.test.ts`
- `docs/Launch/Launch_04_EI_P0D_Service_Auth_Closure_Worker_Identity_and_Control_Plane_Safety.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task APIs remain stable; Launch 04 extends `execution_substrate` and `execution_ledger` visibility rather than changing request/response contracts.
- Local-first safety semantics remain authoritative when remote control-plane actions are denied or unavailable.

### Remaining deferred items
- Launch 08 authoritative ledger and query model hardening
- broader provider-backed workload identity, signing, and enterprise IAM platform concerns beyond the typed auth seam remain deferred

### Blockers
- None.

## 1G. Launch 05 Identity and Admin Minimum Closure (2026-03-07)

### Scope lock
- one frozen pilot identity/admin path only
- additive and backward-compatible
- no provider matrix rollout
- no broad SaaS admin redesign
- no weakening of local-first safety behavior

### Completed outputs
- Added a real Okta OIDC authorization-code path through:
  - `POST /api/agent-kernel/identity/oidc/authorize`
  - `POST /api/agent-kernel/identity/oidc/exchange`
- Added provider-backed OIDC exchange and ID-token verification with durable login-state tracking (`state` / `nonce`) for the pilot tenant.
- Added durable enterprise identity/admin records across memory, Postgres, Redis, and static Postgres schema boundaries:
  - enterprise principals
  - enterprise access bindings
  - enterprise identity sessions
  - OIDC login states
- Added basic admin role mapping for the frozen pilot path:
  - `TENANT_ADMIN`
  - `WORKSPACE_ADMIN`
  - `WORKSPACE_MEMBER`
- Added bounded directory/provisioning closure through `POST /api/agent-kernel/admin/directory-sync`:
  - accepts normalized or Okta-SCIM-like user/group payloads
  - refreshes durable principal/group state
  - shrinks access by deactivating bindings no longer present
  - revokes sessions and blocks future admin actions for suspended or deprovisioned principals
- Added API and store-adapter validation coverage for the new identity/admin flow.

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/storeAdapters.ts`
- `services/agent-kernel/sql/schema.sql`
- `services/agent-kernel/index.ts`
- `services/agent-kernel/identityAdmin.ts`
- `api/agent-kernel/common.ts`
- `api/agent-kernel/identity/oidc/authorize.ts`
- `api/agent-kernel/identity/oidc/exchange.ts`
- `api/agent-kernel/admin/directory-sync.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `docs/Launch/Launch_05_Identity_Admin_Minimum_Closure.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task/runtime APIs remain stable.
- Local-first execution and permission precedence remain authoritative; the new identity layer adds pilot admin closure without replacing task-side safety behavior.

### Remaining deferred items
- Launch 08 authoritative ledger and query model hardening
- full SCIM 2.0 server rollout, broader IdP/provider matrix, and broad user-facing admin redesign remain deferred beyond the frozen pilot path

### Blockers
- None.

## 1H. Launch 06 Vault and Credential Minimum Closure (2026-03-07)

### Scope lock
- one frozen pilot vault/backend path only
- additive and backward-compatible
- no vendor matrix rollout
- no broad secret platform replacement
- no weakening of local-first safety behavior

### Completed outputs
- Added one real HashiCorp Vault-backed pilot connector path for the frozen outbound `HTTPS_WEBHOOK`.
- Added durable credential and delivery records across memory, Postgres, Redis, and the static Postgres schema:
  - vault credential health/state metadata
  - webhook delivery audit records
- Added a bounded vault-backed webhook runtime service in `services/agent-kernel/vaultWebhook.ts` that:
  - resolves secret material from HashiCorp Vault at use time
  - never persists secret values in task-store records
  - supports inspect/materialize, renew, revoke, rotate, and deliver flows
- Added bounded pilot webhook admin APIs:
  - `GET|POST /api/agent-kernel/connectors/webhook/credential-health`
  - `POST /api/agent-kernel/connectors/webhook/credential/renew`
  - `POST /api/agent-kernel/connectors/webhook/credential/revoke`
  - `POST /api/agent-kernel/connectors/webhook/credential/rotate`
  - `POST /api/agent-kernel/connectors/webhook/deliver`
- Enforced connector route gating by credential health:
  - revoked, compromised, expired, or unhealthy credentials block delivery
  - expiring renewable leases can be renewed before delivery
  - unauthorized webhook responses degrade credential health visibly instead of fabricating success
- Added operator-visible credential summaries:
  - additive `credential_health` response shape with status, compromise state, lease metadata, recommended action, and recent delivery history
  - explicit blocked-delivery summaries for compromise or unhealthy credential paths
- Added API and store-adapter validation coverage for the pilot vault/webhook lifecycle.

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/storeAdapters.ts`
- `services/agent-kernel/sql/schema.sql`
- `services/agent-kernel/vaultWebhook.ts`
- `services/agent-kernel/index.ts`
- `api/agent-kernel/connectors/webhook/common.ts`
- `api/agent-kernel/connectors/webhook/credential-health.ts`
- `api/agent-kernel/connectors/webhook/deliver.ts`
- `api/agent-kernel/connectors/webhook/credential/renew.ts`
- `api/agent-kernel/connectors/webhook/credential/revoke.ts`
- `api/agent-kernel/connectors/webhook/credential/rotate.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `docs/Launch/Launch_06_Vault_and_Credential_Minimum_Closure.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task/runtime APIs remain stable; Launch 06 adds bounded vault/webhook admin APIs and additive credential-health visibility.
- Secret material is not persisted in the task store; only credential metadata and delivery audit records are durable.
- Local-first execution and governance safety semantics remain authoritative.

### Remaining deferred items
- Launch 08 authoritative ledger and query model hardening
- broader vault/provider matrix, generalized secret platform work, and native vendor connector expansion remain deferred beyond the frozen pilot path
- broader observability, compliance, deployment, and operator-readiness baselines remain in later launch steps

### Blockers
- None.

## 1I. Launch 07 Connector Platform Minimum Closure (2026-03-07)

### Scope lock
- two frozen pilot adapters only
- additive and backward-compatible
- no connector swamp
- no vendor matrix rollout
- no weakening of local-first safety behavior

### Completed outputs
- Added a bounded connector platform contract in `services/agent-kernel/contracts.ts` for:
  - adapter definitions
  - platform dispatch summaries
  - platform health summaries
  - frozen generic and business dispatch input types
- Added `services/agent-kernel/connectorPlatform.ts` as the shared connector platform service over the Launch 06 vault-backed webhook runtime.
- Froze the pilot connector boundary to exactly two adapters:
  - `generic_https_webhook`
  - `advisor_crm_compliance_handoff`
- Routed both the generic webhook path and the real advisor CRM/compliance business path through the same platform service:
  - `POST /api/agent-kernel/connectors/webhook/deliver`
  - `POST /api/agent-kernel/connectors/business/advisor-crm-compliance-handoff`
  - `GET|POST /api/agent-kernel/connectors/platform/health`
- Added durable connector-platform metadata to delivery records:
  - adapter id / adapter type
  - delivery-group id
  - attempt count
  - dead-letter reason
- Added bounded platform safeguards:
  - retry on retryable `FAILED` and `TIMED_OUT` transport outcomes
  - per-adapter rate-limit failure with durable `RATE_LIMITED` records
  - max-attempt dead-lettering with durable `DEAD_LETTERED` records
  - connector health summaries that surface recent failures, timeouts, rate limits, dead letters, and credential readiness
- Preserved generic webhook response compatibility by keeping legacy `delivery`, `credential_health`, and `route_eligible` fields while adding `adapter`, `connector_delivery`, `connector_health`, and `attempts`.
- Added direct connector-platform conformance coverage plus API/store-adapter coverage for the frozen adapter set, rate limiting, timeout retry, dead-letter handling, and business-payload transformation.

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/vaultWebhook.ts`
- `services/agent-kernel/connectorPlatform.ts`
- `services/agent-kernel/index.ts`
- `api/agent-kernel/connectors/webhook/common.ts`
- `api/agent-kernel/connectors/webhook/deliver.ts`
- `api/agent-kernel/connectors/business/advisor-crm-compliance-handoff.ts`
- `api/agent-kernel/connectors/platform/health.ts`
- `tests/agentKernel.api.test.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.connectorPlatform.test.ts`
- `docs/Launch/Launch_07_Connector_Platform_Minimum_Closure.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.connectorPlatform.test.ts` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing webhook delivery responses remain stable and now include additive connector-platform visibility.
- The frozen pilot transport is still the Launch 06 HashiCorp Vault-backed webhook path; Launch 07 adds a bounded platform contract over it rather than a new transport.
- Local-first safety semantics remain authoritative when connector delivery degrades or fails closed.

### Remaining deferred items
- Launch 08 authoritative ledger and query model hardening
- native vendor-specific connectors beyond the frozen webhook transport
- generalized connector SDK/productization, self-serve onboarding, and broader connector/provider matrix rollout
- broader observability, compliance, deployment, and operator-readiness baselines remain later launch steps

### Blockers
- None.

## 1J. Launch 08 Authoritative Ledger and Query Model Hardening (2026-03-07)

### Scope lock
- append-only ledger remains authoritative truth
- additive and backward-compatible
- no broad history rewrite
- no unrelated product work
- no weakening of local-first safety behavior

### Completed outputs
- Hardened the authoritative truth boundary in `services/agent-kernel/ledger.ts`:
  - append-only execution ledger remains the only truth source
  - task query projections are explicitly rebuildable materializations
  - the current projection version and minimum compatible version are now durable and explicit
- Added bounded projection compatibility policy:
  - `CURRENT`
  - `MIXED_HISTORY_COMPATIBLE`
  - `REQUIRES_REBUILD`
- Added bounded rebuild strategy policy:
  - `CHECKPOINT_CATCH_UP`
  - `FULL_REPLAY`
  - `FROM_SEQUENCE_REPLAY`
  - `COMPATIBILITY_REBUILD`
- Added durable rebuild metadata on task projections:
  - rebuild count
  - last rebuild timestamp
  - last rebuild from-sequence
  - last rebuild strategy
  - last rebuild replayed-record count
- Added archive/retention baseline without destructive history rewrite:
  - durable execution-ledger compaction hints across memory, Postgres, Redis, and static Postgres schema parity
  - pilot retention policy `PILOT_APPEND_ONLY_NO_DELETE`
  - archive recommendation, latest compaction hint, and snapshot-before-archive visibility
  - delete remains disallowed in the frozen pilot scope
- Exposed additive authoritative visibility in existing task responses:
  - compatibility summary
  - retention summary
  - projection version
  - rebuild metadata
- Added validation coverage for:
  - deterministic rebuild vs checkpoint catch-up behavior
  - legacy projection compatibility and upgrade on full rebuild
  - stale checkpoint detection that fails closed to `REQUIRES_REBUILD`
  - durable compaction-hint persistence across Postgres and Redis adapters
  - task API visibility for compatibility and retention summaries

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/storeAdapters.ts`
- `services/agent-kernel/sql/schema.sql`
- `services/agent-kernel/ledger.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `tests/agentKernel.ledgerProjection.test.ts`
- `docs/Launch/Launch_08_Authoritative_Ledger_Query_Model_Hardening.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task APIs remain stable and now include additive authoritative-ledger visibility.
- Existing materialized projections remain readable through the minimum-compatible policy and are marked `MIXED_HISTORY_COMPATIBLE` or `REQUIRES_REBUILD` rather than silently treated as current.
- Pilot retention is append-only and no-delete; archive hints are advisory and durable, not destructive.
- Local-first safety semantics remain authoritative.

### Remaining deferred items
- Launch 13 full launch rehearsal and launch gate
- legal-hold execution, destructive deletion flows, and broader archival engines
- broader cross-task/global query-model surfaces and generalized migration tooling beyond the bounded task-projection policy

### Blockers
- None.

## 1K. Launch 09 Observability, SRE, and Incident Baseline (2026-03-07)

### Scope lock
- additive and backward-compatible only
- service-layer plus bounded observability API surface only
- no full observability redesign or NOC product
- no weakening of local-first safety behavior

### Completed outputs
- Added additive correlation fields across:
  - task run state and node traces
  - worker sessions, execution units, claims, heartbeats, and timeout records
  - remote runner control requests/results and service-auth audit records
  - webhook deliveries and connector platform dispatch summaries
- Added `services/agent-kernel/observability.ts` as the bounded pilot observability service over existing authoritative state.
- Task snapshots now expose additive `observability` summaries with:
  - correlation/run identity
  - trace spans
  - structured logs
  - open alert records
  - degraded-mode state
  - bounded SLO summaries
- Added bounded observability API closure:
  - `GET /api/agent-kernel/observability/summary`
  - `GET /api/agent-kernel/observability/summary?task_id=<task_id>`
- Added pilot observability gauges and dashboard rollups for:
  - open task alerts
  - degraded tasks
  - open dead letters
  - stale claims
  - denied service-auth actions
  - projection rebuild requirements
- Added explicit pilot runbooks:
  - `docs/agent-kernel-oncall-runbook.md`
  - `docs/agent-kernel-degraded-mode-recovery-playbook.md`

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/runtime.ts`
- `services/agent-kernel/events.ts`
- `services/agent-kernel/substrate.ts`
- `services/agent-kernel/ledger.ts`
- `services/agent-kernel/vaultWebhook.ts`
- `services/agent-kernel/connectorPlatform.ts`
- `services/agent-kernel/observability.ts`
- `services/agent-kernel/index.ts`
- `services/metricsCollector.ts`
- `services/providers/dashboardApi.ts`
- `api/agent-kernel/common.ts`
- `api/agent-kernel/tasks/index.ts`
- `api/agent-kernel/tasks/[taskId].ts`
- `api/agent-kernel/tasks/[taskId]/run.ts`
- `api/agent-kernel/connectors/webhook/deliver.ts`
- `api/agent-kernel/connectors/business/advisor-crm-compliance-handoff.ts`
- `api/agent-kernel/observability/summary.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `tests/agentKernel.events.test.ts`
- `tests/agentKernel.observability.test.ts`
- `tests/agentKernel.metricsExport.test.ts`
- `docs/Launch/Launch_09_Observability_SRE_and_Incident_Baseline.md`
- `docs/agent-kernel-oncall-runbook.md`
- `docs/agent-kernel-degraded-mode-recovery-playbook.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task and connector APIs remain stable and now expose additive correlation/observability fields.
- Existing durable store rows remain valid because the new observability fields are additive JSON payload fields, not destructive schema rewrites.
- Local-first fallback remains authoritative; degraded remote/control-plane/connector state is now more visible, not bypassed.

### Remaining deferred items
- Launch 13 full launch rehearsal and launch gate
- external tracing vendors, log pipeline productization, and paging automation beyond the bounded pilot runbook baseline
- broad Android/host/operator observability surface redesign remains deferred beyond the frozen pilot scope

### Blockers
- None.

## 1L. Launch 10 Compliance Execution Baseline (2026-03-07)

### Scope lock
- additive and backward-compatible only
- service-layer plus bounded compliance API surface only
- no full compliance suite or broad legal platform
- no weakening of local-first safety behavior

### Completed outputs
- Added `services/agent-kernel/compliance.ts` as the bounded pilot compliance service over the authoritative task ledger/query truth.
- Task snapshots now expose additive `compliance` summaries with:
  - append-only retention posture
  - bounded deletion-request history
  - bounded audit-export history
  - explicit manual legal-hold posture
  - questionnaire-pack reference
- Added durable compliance records across memory, Postgres, Redis, and static schema parity:
  - compliance deletion requests
  - compliance audit exports
- Added bounded compliance API closure:
  - `GET /api/agent-kernel/compliance/summary`
  - `GET /api/agent-kernel/compliance/summary?task_id=<task_id>`
  - `POST /api/agent-kernel/compliance/deletion-request`
  - `POST /api/agent-kernel/compliance/audit-export`
- Deletion handling is now executable and fail closed for the pilot:
  - requests are durably recorded
  - destructive delete is denied by `PILOT_APPEND_ONLY_NO_DELETE`
  - legal-hold assertions fail closed to manual review
- Audit export integrity is now executable and bounded:
  - export bundles are redaction-first
  - manifest and bundle hashes are generated
  - per-section hashes are persisted durably
  - secret material is not persisted into the durable export record
- Added compliance/operator docs:
  - `docs/agent-kernel-compliance-operations-runbook.md`
  - `docs/agent-kernel-security-privacy-questionnaire-starter-pack.md`

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/store.ts`
- `services/agent-kernel/storeAdapters.ts`
- `services/agent-kernel/sql/schema.sql`
- `services/agent-kernel/runtime.ts`
- `services/agent-kernel/compliance.ts`
- `services/agent-kernel/index.ts`
- `api/agent-kernel/tasks/index.ts`
- `api/agent-kernel/tasks/[taskId].ts`
- `api/agent-kernel/tasks/[taskId]/run.ts`
- `api/agent-kernel/compliance/summary.ts`
- `api/agent-kernel/compliance/deletion-request.ts`
- `api/agent-kernel/compliance/audit-export.ts`
- `tests/agentKernel.storeAdapters.test.ts`
- `tests/agentKernel.api.test.ts`
- `docs/Launch/Launch_10_Compliance_Execution_Baseline.md`
- `docs/agent-kernel-compliance-operations-runbook.md`
- `docs/agent-kernel-security-privacy-questionnaire-starter-pack.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task APIs remain stable and now expose additive compliance summaries.
- New compliance persistence uses additive tables/JSON records; existing task, ledger, identity, and connector state remains valid.
- Destructive delete is still unsupported in the pilot; the new deletion baseline records and denies requests rather than changing retention semantics.
- Local-first safety semantics remain authoritative.

### Remaining deferred items
- Launch 13 full launch rehearsal and launch gate
- automated legal-hold lifecycle and release handling
- destructive delete execution, downstream erasure orchestration, and broader archival engines
- broader compliance automation, policy testing productization, and full legal operations tooling

### Blockers
- None.

## 1M. Launch 11 Tenant, Environment, and Region Deployment Baseline (2026-03-07)

### Scope lock
- additive and backward-compatible only
- service-layer plus bounded deployment-summary API surface only
- no full multi-region rollout platform or broad infra redesign
- no weakening of local-first safety behavior

### Completed outputs
- Added `services/agent-kernel/deployment.ts` as the bounded pilot deployment baseline service.
- Task snapshots now expose additive `deployment` summaries with:
  - explicit single-tenant deployment model
  - explicit deployment stage and backing environment
  - tenant-isolation posture and warning codes
  - primary-region and residency posture
  - vault secret-separation posture
  - explicit dev/staging/pilot/prod boundary matrix
- Added bounded deployment API closure:
  - `GET /api/agent-kernel/deployment/summary`
  - `GET /api/agent-kernel/deployment/summary?task_id=<task_id>`
- Added machine-checkable deployment hardening:
  - tenant drift and workspace mismatch surface as `DEGRADED`
  - missing deployment stage, backing environment, region, or residency scope surface as `DEGRADED`
  - secret scope checks validate the frozen HashiCorp Vault path against the current pilot stage
- Added pilot deployment reference documentation:
  - `docs/agent-kernel-pilot-deployment-baseline.md`

### Changed files
- `services/agent-kernel/contracts.ts`
- `services/agent-kernel/runtime.ts`
- `services/agent-kernel/deployment.ts`
- `services/agent-kernel/index.ts`
- `api/agent-kernel/tasks/index.ts`
- `api/agent-kernel/tasks/[taskId].ts`
- `api/agent-kernel/tasks/[taskId]/run.ts`
- `api/agent-kernel/deployment/summary.ts`
- `tests/agentKernel.api.test.ts`
- `docs/Launch/Launch_11_Tenant_Environment_and_Region_Deployment_Baseline.md`
- `docs/agent-kernel-pilot-deployment-baseline.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

### Compatibility / migration
- Additive only; no migration required.
- Existing task APIs remain stable and now expose additive deployment summaries.
- No store schema or durable data migration was required because deployment posture is derived from the frozen pilot config plus existing identity/vault records.
- Local-first safety semantics remain authoritative; deployment hardening adds fail-visible warnings, not a remote-only dependency.

### Remaining deferred items
- Launch 13 full launch rehearsal and launch gate
- shared multi-tenant productization beyond the frozen pilot baseline
- self-hosted, private-cloud, and hybrid deployment models
- multi-region active-active runtime, automated failover, and broad self-serve provisioning

### Blockers
- None.

## 1N. Launch 12 Operator Runbooks, Solution Templates, and Onboarding (2026-03-07)

### Scope lock
- docs-and-ops-packaging only
- additive and backward-compatible only
- no full academy or LMS
- no broad GTM expansion
- no weakening of local-first safety behavior

### Completed outputs
- Added `docs/agent-kernel-pilot-operator-guide.md` as the readable operator front door over the existing observability, compliance, deployment, and connector baselines.
- Added a bounded pilot solution-template pack in `docs/agent-kernel-pilot-solution-templates.md` with exactly three templates over the frozen advisor workflow:
  - pre-meeting prep pack
  - post-meeting notes to CRM-ready draft
  - compliance handoff package
- Added `docs/agent-kernel-pilot-onboarding-checklist.md` with owners, evidence expectations, and go-live gating for the pilot tenant.
- Added `docs/agent-kernel-pilot-success-scorecard.md` with KPI targets, review cadence, and success/failure signals for weekly pilot review and Launch 13 rehearsal.
- Synced Launch 12 into the active launch doc plus spec, plan, and status without touching runtime code.

### Changed files
- `docs/Launch/Launch_12_Operator_Runbooks_Solution_Templates_and_Onboarding.md`
- `docs/agent-kernel-pilot-operator-guide.md`
- `docs/agent-kernel-pilot-solution-templates.md`
- `docs/agent-kernel-pilot-onboarding-checklist.md`
- `docs/agent-kernel-pilot-success-scorecard.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- Docs-only change set.
- No `services/agent-kernel/*`, `api/agent-kernel/*`, Android runtime, or host runtime files changed.
- The TypeScript and Android validation command suites were not rerun for this step.

### Compatibility / migration
- Additive only; no migration required.
- Existing runtime/API behavior remains unchanged.
- Launch 12 packages the existing pilot path into operator/customer-facing documentation and does not introduce new product primitives.

### Remaining deferred items
- Launch 13 full launch rehearsal and launch gate
- academy/LMS-scale training programs, certification, and broad partner enablement
- broad GTM expansion and generalized self-serve onboarding productization
- operator UX redesign beyond the bounded pilot documentation pack

### Blockers
- None.

## 1O. Launch 13 Full Launch Rehearsal and Launch Gate (2026-03-07)

### Scope lock
- no feature work
- no scope expansion
- evidence collection and final gate review only
- local-first safety behavior remains authoritative

### Completed outputs
- Ran the frozen pilot rehearsal coverage against existing bounded runtime and operator assets:
  - golden scenario run
  - restore/replay/mixed-history rehearsal
  - connector failure / credential expiry / remote denial drills
  - incident and rollback drill
  - pilot onboarding rehearsal
- Ran the required TypeScript `G2` suite and the full Android / host `G3` suite, including connected Android tests on `SM-X916B - 16`.
- Recorded the final launch gate result explicitly:
  - `G2` -> PASS
  - `G3` -> PASS
  - `G1` -> BLOCKED
  - `G4` -> BLOCKED
- Captured the critical gate truth that the current candidate worktree is not release-baseline clean even though the runtime rehearsal path is green.

### Changed files
- `docs/Launch/Launch_13_Full_Launch_Rehearsal_and_Launch_Gate.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation
- `bash scripts/check-release-baseline.sh` -> PASS, but not accepted as sufficient `G1` evidence because the tracked-artifact check did not surface still-tracked Android artifact paths visible in Git diff evidence.
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- `npx vitest run tests/agentKernel.connectorPlatform.test.ts` -> PASS
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Compatibility / migration
- Additive only; no migration required.
- No runtime or product behavior changed in this step.
- Local-first safety semantics remain authoritative.

### Remaining deferred items
- broad GA launch requirements
- broad provider/connector matrix rollout
- shared multi-tenant productization, self-hosted, hybrid, or multi-region active-active deployment
- broader operator UX redesign and advanced automation/product expansion

### Blockers
- `G1` release-baseline cleanliness is not satisfied for the current launch candidate:
  - `git status --short` remains broadly dirty outside the Launch 13 handoff surface
  - `git diff --name-only --cached` still contains historically tracked generated Android paths under `LumiKeyboard-Android/.gradle/**` and `LumiKeyboard-Android/app/build/**`
  - `git diff --name-only` still spans unrelated app, component, service, test, and docs paths outside the frozen launch candidate
- Final launch decision: pilot launch is not yet ready until the `G1` blocker is closed and Launch 13 is rerun.

## 1.9 Role Track M42 - Completion (2026-03-06)
### Scope status
- M42A typed portfolio, trust-tier, and jurisdiction coordination models: done
- M42B runtime portfolio prioritization and next-action recommendations: done
- M42C durable shared blocker/dependency/conflict continuity + visibility: done
- M42D tests/docs/validation closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed/runtime changes
- Added typed M42 contracts for destination trust tiers, cross-boundary governance portfolios, cross-boundary program records, trust-tier rollout summaries, jurisdiction rollout plans, portfolio blockers, dependencies, conflicts, priority decisions, coordination recommendations, and wave-coordination records.
- Extended additive M33-M40 query/summary/state/receipt/governance surfaces so M42 state is durable, filterable, and readable without breaking mixed-history decode.
- Runtime now derives portfolio-scoped coordination from durable M39/M40 routing, residency, approval, and audit truth:
  - deterministic portfolio priority selection across trust tier and jurisdiction states
  - next-action recommendation selection at portfolio scope
  - durable shared blocker, dependency, and coordination-conflict rollups
  - trust-tier and jurisdiction rollout state influencing ordering and recommendation output.

### Visibility and continuity
- Governance summary, execution receipt, role trace, and Activity internal portfolio card now surface:
  - governance portfolio state
  - trust-tier rollout state
  - jurisdiction rollout state
  - shared blocker/conflict counts
  - dependency summary
  - next-action recommendation.
- Restore/process-death continuity remains additive:
  - persisted M39/M40 records restore and deterministically rehydrate M42 portfolio state
  - mixed old/new history payloads keep default-safe empty M42 collections.

### Validation (full M42 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No generic routing DSL or BPM/workflow DSL.
- No orchestrator rewrite.
- No broad operator console redesign.
- No broad storage/history rewrite beyond additive compatibility fields.
- No weakening of consent/privacy/residency/compliance/local-first protections.

## 1.10 Role Track M43 - Completion (2026-03-06)
### Scope status
- M43A typed portfolio analytics, drift, and risk-budget models: done
- M43B runtime trust-tier/jurisdiction drift + bounded risk-budget derivation: done
- M43C durable corrective recommendation/action continuity + visibility: done
- M43D tests/docs/validation closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed/runtime changes
- Added typed M43 contracts for portfolio analytics, bounded risk budgets, trust-tier drift, jurisdiction drift, destination concentration, blocker trends, risk recommendations, corrective actions, and canonical M43 reason families.
- Extended additive portfolio query/summary/state/receipt/governance surfaces so M43 state is durable, filterable, and mixed-history safe without weakening M35-M42 protections.
- Runtime now derives M43 analytics from durable M39/M40/M42 truth:
  - trust-tier drift and jurisdiction drift severity/reason summaries
  - destination concentration and blocker trend summaries
  - bounded risk-budget allocation/consumption/remaining/breach state
  - portfolio health and trajectory state
  - safe corrective recommendations and durable corrective action records.
- Added explicit runtime corrective-action recording through the existing backend bridge/kernel path without destructive automation.

### Visibility and continuity
- Governance summary, governance-case line/detail/search, execution receipt/export, role trace, and the internal Activity portfolio surface now expose M43 analytics/risk-budget/drift/recommendation/corrective summaries in readable English.
- `GovernanceCaseFormatter.caseSearchableText(...)` now includes M43 state and summaries, so portfolio analytics/risk-budget/drift/corrective triage is queryable rather than formatter-only.
- Restore/process-death continuity remains additive:
  - persisted M43 analytics/risk-budget/drift/recommendation/corrective collections restore safely
  - recomputation preserves existing M42/M43 state when upstream cross-boundary source collections are not yet restored
  - mixed old/new history payloads keep default-safe empty M43 collections.

### Tests added/updated
- `core-domain/.../DomainContractsTest.kt`
  - M43 contract round-trip + mixed-history decode coverage
- `core-agent/.../AgentOrchestratorTest.kt`
  - runtime trust-tier/jurisdiction drift and risk-budget assertions
  - corrective-action durability + persistence continuity coverage
- `core-agent/.../DynamicStatePersistenceTest.kt`
  - restore continuity for analytics, risk budget, drift, recommendation, and corrective state
- `app-backend-host/.../GovernanceSummaryFormatterTest.kt`
  - readable M43 governance summary and governance-case coverage
- `app-backend-host/.../ExecutionReceiptFormatterTest.kt`
  - readable M43 receipt/export coverage
- `app-backend-host/.../RoleTraceFormatterTest.kt`
  - canonical M43 reason translation coverage

### Validation (full M43 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No generic routing DSL.
- No BPM/workflow DSL.
- No orchestrator rewrite.
- No broad operator console redesign.
- No destructive automation.
- No weakening of consent/privacy/residency/compliance/local-first protections.

### Blockers
- None.

## 1.11 Role Track M44 - Completion (2026-03-06)
### Scope status
- M44A typed portfolio safety, budget guardrail, and remediation-control models: done
- M44B runtime guardrail enforcement and remediation-control behavior: done
- M44C durable visibility + continuity: done
- M44D tests/docs/validation closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed/runtime changes
- Added typed M44 contracts for portfolio safety states, budget guardrail states, enforcement modes, remediation automation states, suppression reasons, safety rails, budget guardrails, portfolio safety summaries, and remediation automation controls.
- Extended additive portfolio query/summary/state/receipt/governance surfaces so M44 safety, budget, quarantine, and approval-required state is durable, filterable, and mixed-history safe without weakening M35-M43 protections.
- Runtime now derives M44 safety controls from durable M43 analytics and prior cross-boundary truth:
  - warning / soft-stop / hard-stop / approval-required budget guardrail behavior
  - at-risk / guarded / quarantined / blocked portfolio safety state
  - allowed / throttled / suppressed / cooldown-active / approval-required / quarantined remediation automation behavior
  - deterministic recommendation adjustments for hold, defer, tighten, split, or approval-required safe governance actions without destructive automation.

### Visibility and continuity
- Governance summary, governance-case line/detail/search, execution receipt/export, role trace, and the internal Activity portfolio surface now expose M44 safety, budget guardrail, safety-rail, and remediation-control summaries in readable English.
- `GovernanceCaseFormatter.caseSearchableText(...)` now includes M44 state and summaries, so safety-rail, budget-guardrail, quarantine, and approval-required portfolio triage is queryable rather than formatter-only.
- Restore/process-death continuity remains additive:
  - persisted M44 safety rails, budget guardrails, portfolio safety summaries, and remediation automation controls restore safely
  - recomputation preserves existing M43/M44 state when upstream cross-boundary source collections are not yet restored
  - mixed old/new history payloads keep default-safe empty M44 collections.

### Tests added/updated
- `core-domain/.../DomainContractsTest.kt`
  - M44 contract round-trip + mixed-history decode coverage
- `core-agent/.../AgentOrchestratorTest.kt`
  - deterministic runtime safety/budget/remediation derivation assertions
  - recommendation/export visibility coverage for M44 states
- `core-agent/.../DynamicStatePersistenceTest.kt`
  - restore continuity for safety rails, budget guardrails, portfolio safety summaries, and remediation controls
- `app-backend-host/.../GovernanceSummaryFormatterTest.kt`
  - readable M44 governance summary and governance-case coverage
- `app-backend-host/.../ExecutionReceiptFormatterTest.kt`
  - readable M44 receipt/export coverage
- `app-backend-host/.../RoleTraceFormatterTest.kt`
  - canonical M44 reason translation coverage

### Validation (full M44 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No generic routing DSL.
- No BPM/workflow DSL.
- No orchestrator rewrite.
- No broad operator console redesign.
- No destructive automation.
- No weakening of consent/privacy/residency/compliance/local-first protections.

### Blockers
- None.

## 1.1 Role Track M29 - Completion (2026-03-05)
### Scope status
- M29A typed readiness/cross-wave/window-impact contracts: done
- M29B runtime readiness + cross-wave analytics derivation: done
- M29C durable promote/hold/defer/pause/resume/expire operation trail: done
- M29D visibility/tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added durable M29 fields to `ExecutionReceipt` for promotion candidate/readiness, cross-wave analytics, window impact, and promotion operation summaries.
- Runtime now computes promotion readiness from durable rollout evidence (approval state, wave health, window delay, pause/expiry/defer conditions) and persists operation records.
- Governance filtering now supports M29 dimensions (`rolloutPromotion*`, `crossWave*`, `windowDelay*`, operation-type/status pending).
- Receipt export and readable lines now expose M29 readiness/cross-wave/window-impact/operation summaries.
- Governance case line/detail/search now include M29 readiness, blocker count/recommendation, cross-wave health/counts, window delay/next eligible, and operation status.
- Canonical `ROLE_*` M29 reason codes now render readable English in role-impact summaries.

### Validation (full M29 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS

## 1.8 Post-M35 Release Hardening - Completion (2026-03-06)
### Scope status
- M35.5A release baseline automation + repo-noise guardrails: done
- M35.5B Agent OS narrative alignment + legacy travel isolation: done
- M35.5C twin/settings/runtime-truth closure: done

### Changed files
- `package.json`
- `scripts/check-release-baseline.sh`
- `.github/workflows/release-baseline.yml`
- `.gitignore`
- `LumiKeyboard-Android/.gitignore`
- `README.md`
- `App.tsx`
- `components/OnboardingOverlay.tsx`
- `services/agentCard.ts`
- `services/promotionContentGenerator.ts`
- `services/superAgentBrain.ts`
- `tests/superAgentBrain.legacyIsolation.test.ts`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/TwinSyncStatusSnapshot.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/state/TwinCloudSyncCoordinator.kt`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/SettingsScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `docs/release-baseline-checklist.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Canonical local release baseline gate exists and is CI-backed | Done | `scripts/check-release-baseline.sh`, `package.json`, `.github/workflows/release-baseline.yml` |
| Generated/test artifact churn is reduced without mixing a broad cleanup migration | Done | `.gitignore`, `LumiKeyboard-Android/.gitignore`, tracked generated-file removals remain isolated to this pass |
| Top-level narrative aligns to generic Agent OS | Done | `README.md`, `App.tsx`, `components/OnboardingOverlay.tsx`, promotion metadata surfaces |
| Default travel decomposition no longer auto-injects a hidden travel pipeline | Done | `services/superAgentBrain.ts`, `tests/superAgentBrain.legacyIsolation.test.ts` |
| Settings flags reflect actual runtime/build truth | Done | `AgentOrchestrator.kt`, `LumiAgentBackendService.kt`, `SettingsScreen.kt`, `ResponseCards.kt` |
| Twin sync continuity + M35 propagation visibility are restart-safe and user-visible | Done | `TwinSyncStatusSnapshot.kt`, `TwinCloudSyncCoordinator.kt`, `AgentContracts.kt`, `SettingsScreen.kt`, `AgentOrchestratorTest.kt` |
| Cloud sync triggers share one role-policy-aware gate | Done | `AgentOrchestrator.shouldSyncTwinToCloud`, `SuperAgentKernel.kt`, `LumiAgentBackendService.kt` |

### User-visible/runtime changes
- `Settings` now shows actual runtime/build flags instead of hardcoded `true` placeholders.
- `Settings` now shows twin sync continuity state:
  - last sync time
  - latest resolution mode
  - latest sync summary
  - latest conflict summary/timestamp when present.
- `Settings` now shows portfolio-learning visibility:
  - active objective profile scope/provenance/snapshot
  - propagation pending/review counts
  - latest propagation summary.
- Default travel decomposition stays explicit-only; the old auto-expanded travel pipeline is available only via the legacy flag.
- Backend host sync triggers now honor the same role-policy cloud-sync gate for request and manual state-update paths.

### Validation
- `bash scripts/check-release-baseline.sh` -> PASS on 2026-03-06
  - `npm run typecheck` -> PASS
  - `npm run test:unit` -> PASS (`94` files, `501` tests)
  - `./gradlew :app-backend-host:assembleDebug` -> PASS
  - `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
  - `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
  - device regression skipped by design (`RUN_ANDROID_DEVICE_REGRESSION=1` not set)
- Additional targeted checks:
  - `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
  - `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest` -> PASS

### Deferred items / residual risk
1. Connected Android/device regression was not rerun in this pass; release-level evidence still requires it.
2. Repo-wide tracked-artifact migration is still deferred to the dedicated cleanup loop; the working tree remains noisy outside this scoped hardening pass.
3. Legacy travel path remains intentionally available behind an explicit flag for compatibility; it is no longer the default.
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No BPM/DSL introduction.
- No orchestrator architecture rewrite.
- No broad storage/history rewrite beyond additive M29 compatibility fields.

## 1.2 Role Track M30 - Completion (2026-03-05)
### Scope status
- M30A typed coordination/priority/dependency/conflict/contention/escalation contracts: done
- M30B deterministic runtime arbitration + contention handling: done
- M30C escalation operations + visibility wiring: done
- M30D tests/docs/validation closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added typed M30 contracts and additive compatibility fields for:
  - program priority/decision
  - dependency/conflict/contention summaries
  - escalation state
  - cross-program governance summary
- Runtime now derives deterministic multi-program coordination state from durable rollout evidence and emits canonical `ROLE_ROLLOUT_PROGRAM_*` reason families.
- Receipt chain now carries M30 summaries/events (`priority applied`, `deferred`, `dependency blocked`, `conflict/contention`, escalation open/resolved).
- Governance case summary/filter/search now support M30 dimensions (`programCoordinationState`, `programContentionType`, `programContentionLevel`, `programEscalationStatus`, `priorityDeferredOnly`, `dependencyBlockedOnly`, `coordinationEscalatedOnly`, `contentionOnly`).
- Role trace and receipt/governance formatters now expose concise M30 English explanations.

### Validation (full M30 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No BPM/DSL introduction.
- No orchestrator architecture rewrite.
- No broad storage/history rewrite beyond additive compatibility fields.

## 1.3 Role Track M31 - Completion (2026-03-05)
### Scope status
- M31A typed capacity/load/portfolio contracts: done
- M31B runtime capacity-aware defer/reassign/balance: done
- M31C visibility/filter/formatter wiring: done
- M31D tests/docs/validation closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Governance query/runtime now supports M31 filtering and derivation fields:
  - `capacityPoolKey`
  - `approvalLoadBucket`
  - `capacityDeferralReason`
  - `balancingDecisionType`
  - `capacityBlockedOnly`
  - `policyBlockedOnly`
  - `bottleneckOnly`
  - `criticalCapacityReservedOnly`
- Capacity and policy block states are explicitly separated in case summary/record outputs and remain independently filterable.
- Receipt/governance projection now carries M31 summaries and typed objects:
  - approval load/capacity block/policy block/balancing/portfolio summaries
  - governance capacity pool
  - approval queue pressure
  - balancing decision
  - assignment recommendation
  - capacity-aware promotion decision
  - portfolio/program capacity snapshots
- Formatter/readability updates now make M31 states first-class in UI lines/search:
  - case-line capacity/policy blocked visibility improved under truncation
  - deferral reason uses readable wording (`capacity saturated`)
  - searchable text includes explicit policy/capacity block phrases.

### Validation (full M31 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No BPM/DSL introduction.
- No orchestrator architecture rewrite.
- No broad storage/history rewrite beyond additive compatibility fields.

## 1.4 Role Track M32 - Completion (2026-03-05)
### Scope status
- M32A typed contracts + dedicated simulation APIs: done
- M32B baseline snapshot derivation: done
- M32C deterministic simulation engine + persistence continuity: done
- M32D Activity internal simulation surface + tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added dedicated portfolio simulation APIs end-to-end (`get/save/run/compare/export`) across bridge/service/client/orchestrator.
- Added deterministic baseline extraction from durable governance truth (stable program/wave/run ordering, UTC bucket alignment, explicit fallback markers).
- Added deterministic 14-day simulation engine with bounded controls:
  - window shift (`-3..+3`)
  - wave size adjustment (`-50%..+50%`)
  - approval capacity adjustment (`-50%..+100%`)
  - allocation weight clamp (`0.2..2.0`)
  - simulation-only automation toggle and clamp notes.
- Added durable persistence/restore for scenario definitions, run records, and comparison records.
- Added Activity governance internal “Portfolio Simulation” block:
  - save bounded scenario
  - run latest scenario
  - compare latest runs
  - export latest run summary.
- Added readable role-reason mapping for `ROLE_PORTFOLIO_SIMULATION_*` families in `RoleTraceFormatter`.

### Compliance map (M32 requirement -> code evidence -> test evidence)
- Typed scenario/run/forecast/comparison contracts:
  - Code: `core-domain/.../AgentContracts.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m32PortfolioSimulationRoundTrip`, `decode_m32LegacyPayloadDefaultsAreSafe`)
- Dedicated simulation APIs:
  - Code: `core-domain/.../LumiBackendBridge.kt`, `core-agent/.../AgentOrchestrator.kt`, `core-agent/.../SuperAgentKernel.kt`, `app-backend-host/.../LumiAgentBackendService.kt`, `app-backend-host/.../BackendHostClient.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (run/compare/export/console coverage)
- Baseline derivation from durable governance truth:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`deriveBaselinePortfolioSnapshot`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (deterministic run + console state assertions)
- Deterministic simulation + bounded/clamped controls:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`simulatePortfolioScenarioRun`, `resolvePortfolioSimulationControls`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (determinism, capacity effects, window-shift effects)
- Persistence/restore continuity:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`persists and restores m32 portfolio simulation artifacts`)
- Internal operator visibility and export path:
  - Code: `app-backend-host/.../ActivityScreen.kt`, `app-backend-host/.../MainActivity.kt`, `core-agent/.../AgentOrchestrator.kt` (`exportPortfolioSimulationSummary`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`governanceConsoleState_includesPortfolioSimulationStateSummary`)
- Canonical role reason readability:
  - Code: `app-backend-host/.../RoleTraceFormatter.kt`
  - Tests: `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM32PortfolioSimulationReasons`)

### Validation (full M32 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No remote simulation service (local in-process only for M32).
- No automatic live rollout mutation from simulation output.
- No BPM/DSL introduction.
- No orchestrator architecture rewrite.

## 1.5 Role Track M33 - Completion (2026-03-05)
### Scope status
- M33A typed optimization contracts + bridge APIs: done
- M33B bounded seeded solver + hard-constraint enforcement: done
- M33C explainability + schedule selection + persistence continuity: done
- M33D internal visibility + tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added dedicated portfolio optimization APIs end-to-end (`get/save/run/select/export`) across bridge/service/client/orchestrator.
- Added typed M33 contracts for optimization requests, objective profiles, constraint profiles, scenario assumptions, solver config, candidate schedules, explainability artifacts, decision records, and governance summary/state projection.
- Added a bounded local-first optimizer with:
  - deterministic seeding
  - bounded 14-day horizon alignment
  - capped top-N candidate generation
  - strategy-specific candidate diversification
  - hard constraint enforcement for windows, capacity, dependencies, readiness, guardrails, and risk concurrency.
- Added durable persistence/restore for optimization requests, optimization results, and selected schedule decisions.
- Added internal governance “Portfolio Optimization” controls:
  - save request
  - run latest request
  - select top schedule
  - export latest result summary.
- Added concise governance/export visibility for recommended schedule, objective score summary, first binding constraint, and first tradeoff explanation.
- Added readable role-reason mapping for `ROLE_PORTFOLIO_OPTIMIZATION_*` families in `RoleTraceFormatter`.

### Compliance map (M33 requirement -> code evidence -> test evidence)
- Typed optimization request/result and profile contracts:
  - Code: `core-domain/.../AgentContracts.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m33PortfolioOptimizationStateAndSelection`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Dedicated optimization APIs:
  - Code: `core-domain/.../LumiBackendBridge.kt`, `core-agent/.../AgentOrchestrator.kt`, `core-agent/.../SuperAgentKernel.kt`, `app-backend-host/.../LumiAgentBackendService.kt`, `app-backend-host/.../BackendHostClient.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (run/select/export/console coverage)
- Bounded seeded solver + hard-constraint enforcement:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`optimizePortfolioRequest`, `buildPortfolioOptimizationCandidate`, `buildPortfolioOptimizationCandidateScore`, `attachPortfolioOptimizationTradeoffs`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_seededSolverIsDeterministic`, `portfolioOptimization_enforcesWindowsCapacityDependenciesAndGuardrails`, `portfolioOptimization_riskAwareSchedulingDefersRiskyPromotionsUnderStrictLimits`)
- Top-N uniqueness + explainability:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`buildPortfolioOptimizationStrategySequence`, `collapsePortfolioOptimizationBindingEvents`, `portfolioOptimizationCandidateSignature`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_returnsUniqueTopNWithTradeoffExplanations`)
- Persistence/restore continuity and selection durability:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`, `core-agent/.../AgentOrchestrator.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`persists and restores m33 portfolio optimization artifacts`), `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_selectionIsDurableAndRestoresIntoGovernanceConsole`)
- Internal visibility and readable summaries:
  - Code: `app-backend-host/.../ActivityScreen.kt`, `app-backend-host/.../MainActivity.kt`, `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`
  - Tests: `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioOptimizationSummaryLines`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM33PortfolioOptimizationReasons`)

### Validation (full M33 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No remote/cloud optimization service (local in-process only for M33).
- No automatic execution of recommended schedules or destructive automation.
- No BPM/DSL introduction.
- No orchestrator architecture rewrite.
- No broad operator-console redesign.

### Blockers
- None.

## 1.6 Role Track M34 - Completion (2026-03-05)
### Scope status
- M34A typed feedback/drift/tuning contracts + bridge APIs: done
- M34B deterministic local outcome ingest + drift computation: done
- M34C guarded tuning apply/deny + calibration snapshot lineage: done
- M34D persistence/visibility/tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added dedicated M34 APIs end-to-end:
  - `recordPortfolioOptimizationOutcome`
  - `applyPortfolioOptimizationTuning`
  - `denyPortfolioOptimizationTuning`
- Extended M33 optimization state into a single restore-safe learning surface carrying:
  - calibration snapshots
  - selected-schedule outcome records
  - drift summaries/signals/evidence
  - tuning suggestions
  - tuning decision records.
- Outcome ingest is local-first and deterministic:
  - derives actual observations from durable governance truth
  - merges optional typed manual observations
  - computes drift immediately at ingest time.
- Tuning remains bounded and manual-control-first:
  - suggestions require evidence thresholds
  - apply/deny decisions are durable
  - applies create new calibration snapshots with lineage
  - past request/result/decision/outcome history remains bound to its original snapshot.
- Internal governance, export, and receipt/readability surfaces now show:
  - active calibration snapshot
  - latest outcome
  - highest drift severity
  - pending/applied tuning summaries
  - readable `ROLE_PORTFOLIO_LEARNING_*` explanations.

### Compliance map (M34 requirement -> code evidence -> test evidence)
- Typed feedback/drift/tuning contracts and additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`, `core-domain/.../LumiBackendBridge.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m34PortfolioOptimizationLearningStateAndTuning`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Deterministic outcome ingest + drift computation:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`recordPortfolioOptimizationOutcome`, `computePortfolioOptimizationDriftSummary`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_driftComputationIsDeterministic`)
- Tuning thresholds, guardrails, and apply/deny operations:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`maybeBuildPortfolioOptimizationTuningSuggestion`, `portfolioOptimizationApplyTuningGuardrailBlocks`, `applyPortfolioOptimizationTuning`, `denyPortfolioOptimizationTuning`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_tuningSuggestionRequiresMinimumEvidenceThreshold`, `portfolioOptimization_guardrailsBlockExcessiveTuningApplies`, `portfolioOptimization_applyingTuningChangesSubsequentScoringDeterministically`, `portfolioOptimization_denyingTuningIsDurableAndReadableInGovernanceAndExport`)
- Snapshot-bound persistence/restore continuity:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`, `core-agent/.../AgentOrchestrator.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restore continuity keeps m34 portfolio learning calibration drift and tuning state`)
- Readable governance/receipt/reason output:
  - Code: `app-backend-host/.../ActivityScreen.kt`, `app-backend-host/.../MainActivity.kt`, `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`
  - Tests: `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioOptimizationSummaryLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioLearningDriftAndTuningSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM34PortfolioLearningReasons`)

### Validation (full M34 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No remote/cloud optimization service.
- No automatic tuning apply or destructive automation.
- No orchestrator rewrite.
- No broad storage/history rewrite beyond additive compatibility fields.
- No tenant/global calibration propagation in M34.

### Blockers
- None.

## 1.7 Role Track M35 - Completion (2026-03-05)
### Scope status
- M35A typed scope/binding/provenance contracts + bridge APIs: done
- M35B deterministic objective profile resolution + isolation enforcement: done
- M35C bounded propagation rules + approval/adoption durability: done
- M35D drift suppression/visibility/tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added objective-profile scope/binding/provenance runtime semantics on top of M34:
  - `USER`
  - `WORKSPACE`
  - `TENANT`
  - `GLOBAL_BASELINE`
- Requests/results/decisions/outcomes/drift/tuning now remain bound to objective profile snapshots as well as calibration snapshots.
- Added explicit propagation workflows end-to-end:
  - `propagatePortfolioOptimizationObjectiveProfile`
  - `approvePortfolioOptimizationPropagation`
  - `rejectPortfolioOptimizationPropagation`
- Runtime resolution is deterministic and isolation-safe:
  - precedence resolves `USER -> WORKSPACE -> TENANT -> GLOBAL_BASELINE`
  - propagation preserves source scope context and same-tenant boundaries by default
  - high/critical drift suppresses propagation and marks adopted patches review-required.
- Governance/internal/receipt/export visibility now surfaces:
  - active objective profile snapshot/scope/provenance
  - objective profile summary
  - propagation status/review-required state
  - readable `ROLE_LEARNING_*` translations.

### Compliance map (M35 requirement -> code evidence -> test evidence)
- Typed scope/binding/provenance/propagation contracts and additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`, `core-domain/.../LumiBackendBridge.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m35ObjectiveProfileScopeIsolationAndPropagationState`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Deterministic objective profile resolution precedence:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`portfolioOptimizationScopePrecedence`, `resolvePortfolioOptimizationObjectiveProfileSnapshotLocked`, `savePortfolioOptimizationRequest`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_objectiveProfileResolutionUsesScopePrecedence`)
- Isolation-safe propagation and approval/adoption durability:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`evaluatePortfolioOptimizationIsolationDecision`, `propagatePortfolioOptimizationObjectiveProfile`, `approvePortfolioOptimizationPropagation`, `rejectPortfolioOptimizationPropagation`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_propagationPreservesSourceTenantBindingToAvoidCrossTenantContamination`, `portfolioOptimization_propagationApprovalAndAdoptionAreDurable`)
- Drift-triggered suppression and review-required marking:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`markPortfolioOptimizationPropagationReviewRequired`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_highDriftSuppressesPropagationAndMarksAdoptionForReview`)
- Restore continuity and readable governance/receipt/reason output:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`, `app-backend-host/.../MainActivity.kt`, `app-backend-host/.../ActivityScreen.kt`, `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restore continuity keeps m35 objective profile and propagation state`), `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioOptimizationSummaryLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioLearningDriftAndTuningSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM35ObjectiveProfilePropagationReasons`)

### Validation (full M35 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No orchestrator rewrite.
- No unrestricted objective-profile DSL authoring.
- No destructive automation.
- No unbounded cross-tenant/global learning propagation.

### Blockers
- None.

## 1.9 Role Track M36 - Completion (2026-03-06)
### Scope status
- M36A typed sync/privacy/federation contracts + bridge APIs: done
- M36B artifact-only sync + privacy/role-policy gating: done
- M36C federated boundaries + deterministic conflict handling: done
- M36D persistence/visibility/tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added typed M36 sync/privacy/federation records on top of M35:
  - learning sync envelopes/attempts/conflicts
  - federated aggregation summaries
  - active sync privacy policy and federation boundary state.
- Learning sync remains artifact-only and redacted:
  - objective profile snapshots
  - calibration snapshots
  - drift summaries
  - outcome aggregates
  - federated aggregation summaries
  - no raw user content or raw prompts are synced.
- Runtime gating is enforced before non-local sync:
  - role data policy and sync privacy policy block restricted modes
  - `PARENT` role blocks cross-device sync
  - same-tenant boundaries are enforced on import by resolved target scope binding.
- Deterministic conflict handling is runtime-active:
  - objective/calibration snapshot diffs require review
  - drift summary diffs resolve deterministically
  - federated aggregation summaries safe-merge only.
- Governance/receipt/export/internal visibility now surfaces:
  - sync mode/status/conflict state
  - privacy summary
  - federation boundary summary
  - federated aggregation summary
  - readable `ROLE_LEARNING_SYNC_*` / `ROLE_FEDERATED_AGGREGATION_*` reason translations.

### Compliance map (M36 requirement -> code evidence -> test evidence)
- Typed sync/privacy/federation contracts and additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`, `core-domain/.../LumiBackendBridge.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m36LearningSyncPrivacyBoundaryAndConflicts`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Artifact-only sync with privacy/role-policy gating:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`exportPortfolioOptimizationLearningSyncEnvelope`, `derivePortfolioOptimizationLearningSyncPrivacyPolicy`, `importPortfolioOptimizationLearningSyncEnvelope`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_learningSyncExportRespectsPrivacyAndParentRoleGates`)
- Cross-tenant boundary enforcement + deterministic conflict handling:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`importPortfolioOptimizationLearningSyncEnvelope`, `recomputePortfolioOptimizationFederatedAggregationSummaries`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_learningSyncImportBlocksCrossTenantBoundariesByDefault`, `portfolioOptimization_learningSyncObjectiveSnapshotConflictsRequireReviewAndStayDurable`, `portfolioOptimization_learningSyncSafeMergeAndLedgerVisibilityRemainDeterministic`)
- Restore continuity and readable governance/receipt/reason output:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`, `app-backend-host/.../ActivityScreen.kt`, `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restore continuity keeps m36 learning sync conflicts and federated aggregation state`), `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioLearningSyncAndFederationLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioLearningSyncSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM36LearningSyncAndFederationReasons`)

### Validation (full M36 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No raw user content sync.
- No raw prompt sync.
- No full cloud learning platform rollout.
- No orchestrator rewrite.
- No broad operator console redesign.

### Blockers
- None.

## 1.10 Role Track M37 - Completion (2026-03-06)
### Scope status
- M37A typed consent/transport/export contracts + bridge APIs: done
- M37B consent + role-policy gating and optional remote transport boundary: done
- M37C redaction-first compliance audit export + restore continuity: done
- M37D visibility/tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/PortfolioRemoteLearningPorts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added typed M37 consent/runtime/export records on top of M36:
  - consent scope, authority, purpose, provenance, expiry/revoke, and enterprise privacy summaries
  - remote learning envelopes, batches, ack metadata, and durable transport attempts/issues
  - compliance audit export request/result/bundle/hash/access records.
- Consent and role-policy gating are now real runtime gates for:
  - learning sync export/import
  - remote learning transport dispatch
  - compliance audit export generation.
- Remote transport remains local-first and optional:
  - `RemoteLearningTransportPort` is the new boundary
  - `NoOpRemoteLearningTransportPort` is the default implementation
  - attempts remain durable and idempotent even when the transport path stays local-only.
- Compliance export is redaction-first and bounded:
  - exports contain learning-artifact summaries, receipt/governance summaries, hash summaries, and count summaries
  - raw prompts/messages are excluded by default.
- Governance/receipt/internal visibility now surfaces:
  - consent summary and decision
  - remote transport summary and delivery status
  - compliance audit export summary and status
  - enterprise privacy summary
  - readable `ROLE_CONSENT_*`, `ROLE_REMOTE_LEARNING_TRANSPORT_*`, and `ROLE_COMPLIANCE_EXPORT_*` translations.

### Compliance map (M37 requirement -> code evidence -> test evidence)
- Typed consent/transport/export contracts and additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`, `core-domain/.../LumiBackendBridge.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m37ConsentTransportAndComplianceAuditState`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Consent and role-policy gating for sync, transport, and compliance export:
  - Code: `core-agent/.../AgentOrchestrator.kt` (`exportPortfolioOptimizationLearningSyncEnvelope`, `importPortfolioOptimizationLearningSyncEnvelope`, `dispatchPortfolioOptimizationRemoteLearningTransport`, `requestPortfolioOptimizationComplianceAuditExport`)
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_remoteTransportAndAuditExportBlockWhenConsentDenied`, `portfolioOptimization_remoteTransportAndAuditExportRespectParentRolePolicyGating`)
- Optional remote transport boundary with durable attempt records:
  - Code: `core-agent/.../PortfolioRemoteLearningPorts.kt`, `core-agent/.../AgentOrchestrator.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_noOpRemoteTransportRemainsLocalFirstAndDurable`)
- Redaction-first compliance audit export + readable output:
  - Code: `core-agent/.../AgentOrchestrator.kt`, `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_complianceAuditExportIsRedactionFirstAndReadable`), `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioConsentTransportAndAuditLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioConsentTransportAndAuditSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM37ConsentTransportAndAuditReasons`)
- Restore continuity for consent/transport/export state:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restore continuity keeps m37 consent transport and audit export state`)

### Validation (full M37 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No full remote SaaS learning backend.
- No export of raw prompts/messages by default.
- No orchestrator rewrite.
- No broad storage/history rewrite.
- No broad operator console redesign.
- No weakening of M35 isolation or M36 privacy/federation constraints.

### Blockers
- None.

## 1.11 Role Track M38 - Completion (2026-03-06)
### Scope status
- M38A typed connector, key, credential, and compliance models: done
- M38B runtime connector selection, gating, and delivery flow: done
- M38C persistence, visibility, and continuity: done
- M38D tests/docs/validation closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/PortfolioRemoteLearningPorts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/M38_Remote_Transport_Connectors_Production_Enterprise_Key_Management_End_to_End_Compliance_Controls.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added typed M38 connector/key/compliance records on top of M37:
  - production connector profiles, health state, retry policy, connector binding, delivery result, and dead-letter records
  - enterprise key references, usage policy, and credential-resolution outcomes
  - typed compliance transport summaries and compliance gate decisions.
- Remote delivery is now gated by real runtime connector inspection:
  - consent, role policy, privacy policy, connector health, enterprise key state, credential resolution, and compliance gate outcomes are evaluated before dispatch
  - transport attempts persist connector, key, compliance, delivery, and dead-letter evidence.
- Retry/dedupe/dead-letter/local-fallback behavior is now durable and local-first:
  - duplicate idempotency keys are deduped
  - bounded retries persist `RETRY_SCHEDULED`
  - exhausted retries can dead-letter or fall back locally based on policy
  - remote failure never replaces local truth.
- Governance/receipt/internal/export visibility now surfaces:
  - connector type and summary
  - enterprise key status and summary
  - compliance gate decision and summary
  - dead-letter count and local-fallback/dead-letter state
  - readable M38 `ROLE_REMOTE_TRANSPORT_*`, `ROLE_ENTERPRISE_KEY_*`, and `ROLE_COMPLIANCE_*` translations.

### Compliance map (M38 requirement -> code evidence -> test evidence)
- Typed connector/key/compliance contracts and additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`, `core-domain/.../LumiBackendBridge.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m38RemoteConnectorKeyAndComplianceState`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Runtime connector selection, gating, and durable delivery state:
  - Code: `core-agent/.../PortfolioRemoteLearningPorts.kt`, `core-agent/.../AgentOrchestrator.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_productionRemoteTransportPersistsConnectorKeyAndComplianceSummary`, `portfolioOptimization_productionRemoteTransportDedupesDuplicateBatches`, `portfolioOptimization_remoteTransportFallsBackLocallyWhenEnterpriseKeyIsRevoked`, `portfolioOptimization_remoteTransportExhaustsRetriesAndDeadLettersDurably`)
- Restore continuity for connector/key/dead-letter state:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restorePortfolioOptimizationState_preservesM38ConnectorKeyAndDeadLetterContinuity`)
- Governance/receipt/reason readability:
  - Code: `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`, `app-backend-host/.../ActivityScreen.kt`
  - Tests: `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioConsentTransportAndAuditLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioConsentTransportAndAuditSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM38RemoteConnectorAndComplianceReasons`)

### Validation (full M38 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No full remote SaaS learning backend or cloud control plane.
- No tenant-admin key rotation/orchestration service beyond typed runtime state and gating.
- No export of raw prompts/messages by default.
- No orchestrator rewrite.
- No broad storage/history rewrite.
- No broad operator console redesign.
- No weakening of M35 isolation or M36 privacy/federation constraints.

### Blockers
- None.

## 1.12 Role Track M39 - Completion (2026-03-06)
### Scope status
- M39A typed destination, residency, and export-route models: done
- M39B runtime route selection, residency enforcement, and local fallback: done
- M39C persistence, visibility, and continuity: done
- M39D tests/docs/validation closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added typed M39 destination/residency/export-route records on top of M38:
  - destination profiles, decision statuses, block reasons, and durable destination decision records
  - residency region, jurisdiction, residency boundary, and data-residency policy summaries
  - compliance export-route status and route records.
- Remote learning transport and compliance audit export now perform real runtime route evaluation:
  - consent, role policy, privacy policy, destination policy, residency, jurisdiction, connector health, and key/credential health are evaluated before remote routing
  - route outcomes persist as `ROUTED`, `REROUTED`, `HELD_FOR_COMPLIANCE`, `SUPPRESSED`, `LOCAL_ONLY_FALLBACK`, `BLOCKED_BY_RESIDENCY`, `BLOCKED_BY_JURISDICTION`, or `BLOCKED_BY_DESTINATION_POLICY`.
- Local-first truth remains authoritative and visible:
  - remote transport can reroute or fall back locally when residency/policy rules prevent compliant remote delivery
  - compliance export can route, reroute, hold, suppress, or remain local-only with durable route history and readable summaries.
- Compatibility-safe binding resolution now applies in destination/sync/export lineage checks:
  - baseline/global objective profile snapshots no longer lose tenant/workspace route context during sync visibility, transport selection, or audit export routing.

### Compliance map (M39 requirement -> code evidence -> test evidence)
- Typed destination/residency/export-route contracts and additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m39DestinationResidencyAndExportRoutingState`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Runtime route selection, residency enforcement, and local fallback:
  - Code: `core-agent/.../AgentOrchestrator.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_remoteTransportReroutesToLocalFallbackWhenResidencyMismatches`, `portfolioOptimization_complianceAuditExportHoldsRemoteRouteWhenJurisdictionReviewIsRequired`, `portfolioOptimization_learningSyncSafeMergeAndLedgerVisibilityRemainDeterministic`, `portfolioOptimization_noOpRemoteTransportRemainsLocalFirstAndDurable`)
- Restore continuity for destination/residency/export-route state:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restorePortfolioOptimizationState_preservesM39DestinationResidencyAndExportRouteContinuity`)
- Governance/receipt/export/reason readability:
  - Code: `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`, `app-backend-host/.../ActivityScreen.kt`
  - Tests: `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioDestinationResidencyAndExportRouteLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioDestinationResidencyAndRouteSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM39DestinationResidencyAndExportRouteReasons`)

### Validation (full M39 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No unrestricted destination-routing DSL authoring.
- No raw prompt/message export by default.
- No orchestrator rewrite.
- No broad storage/history rewrite.
- No broad operator console redesign.
- No weakening of M35 isolation or M36 privacy/federation constraints.

### Blockers
- None.

## 1.13 Role Track M40 - Completion (2026-03-06)
### Scope status
- M40A typed bundle, boundary, decision, approval, and audit models: done
- M40B runtime bundle evaluation and allow/split/reroute/hold/block behavior: done
- M40C persistence, visibility, and continuity: done
- M40D tests/docs/validation closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime changes
- Added typed M40 data-exchange governance records on top of M39:
  - safe destination bundles, bundle policies, compatibility statuses, boundary summaries, reroute/split/redaction summaries, bundle decision records, manifests, cross-boundary approval records, and cross-boundary audit records
  - additive M40 summary/query/filter fields plus grouped receipt visibility through `PortfolioOptimizationDataExchangeVisibilitySummary`.
- Remote learning transport and compliance audit export now perform real runtime bundle evaluation:
  - consent, role policy, privacy policy, residency, jurisdiction, destination policy, connector health, key health, credential health, and compliance policy are evaluated against the multi-destination bundle before routing or export
  - bundle outcomes persist as `ALLOWED`, `SPLIT`, `REROUTED`, `HELD`, `SUPPRESSED`, or `BLOCKED`.
- Local-first truth remains authoritative and visible:
  - compliance exchanges can split when local-only artifact classes such as receipt traces or governance summaries must stay local while the remaining artifact bundle routes remotely
  - held/blocked exchanges produce durable approval and audit records rather than silent fallback or destructive mutation.
- Receipt visibility stays additive without breaching JVM signature limits:
  - `ExecutionReceipt` now groups M40 data-exchange visibility into `PortfolioOptimizationDataExchangeVisibilitySummary`, preserving runtime readability and export/governance coverage without exceeding constructor/signature limits.

### Compliance map (M40 requirement -> code evidence -> test evidence)
- Typed destination bundle, compatibility, decision, approval, and audit contracts with additive compatibility fields:
  - Code: `core-domain/.../AgentContracts.kt`
  - Tests: `core-domain/.../DomainContractsTest.kt` (`encodeDecode_m40DataExchangeBundleApprovalAndAuditState`, `decode_m33LegacyPayloadDefaultsAreSafe`)
- Runtime bundle evaluation and allow/split/reroute/hold/block outcomes:
  - Code: `core-agent/.../AgentOrchestrator.kt`
  - Tests: `core-agent/.../AgentOrchestratorTest.kt` (`portfolioOptimization_remoteTransportReroutesToLocalFallbackWhenResidencyMismatches`, `portfolioOptimization_complianceAuditExportHoldsRemoteRouteWhenJurisdictionReviewIsRequired`, `portfolioOptimization_complianceAuditExportSplitsBundleWhenReceiptAndGovernanceArtifactsMustStayLocal`)
- Restore continuity for bundle/approval/audit state:
  - Code: `core-agent/.../DynamicStatePersistencePort.kt`, `app-backend-host/.../SharedPrefsDynamicStateStore.kt`
  - Tests: `core-agent/.../DynamicStatePersistenceTest.kt` (`restorePortfolioOptimizationState_preservesM40DataExchangeApprovalAndAuditContinuity`)
- Governance/receipt/export/reason readability:
  - Code: `app-backend-host/.../GovernanceSummaryFormatter.kt`, `app-backend-host/.../ExecutionReceiptFormatter.kt`, `app-backend-host/.../RoleTraceFormatter.kt`, `app-backend-host/.../ActivityScreen.kt`
  - Tests: `app-backend-host/.../GovernanceSummaryFormatterTest.kt` (`formatter_includesPortfolioDataExchangeApprovalAndAuditLines`), `app-backend-host/.../ExecutionReceiptFormatterTest.kt` (`summaryLines_andExport_includePortfolioDataExchangeApprovalAndAuditSignals`), `app-backend-host/.../RoleTraceFormatterTest.kt` (`impactLines_translateM40DataExchangeBundleApprovalAndAuditReasons`)

### Validation (full M40 gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No generic routing DSL.
- No raw prompt/message export by default.
- No orchestrator rewrite.
- No broad storage/history rewrite.
- No broad operator console redesign.
- No destructive automation.

### Blockers
- None.

## 2. M1 Details
### Changed files
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ModuleFeaturePanel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/AppModule.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ModuleUiSupport.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/TopCards.kt`

### User-visible changes
- WORK opens into unified task workspace.
- No forced first-step Chat/LIX/Agent/Avatar/Home selection.
- Contextual capability entry points remain available in-task.
- Interaction Hub supplement/follow-up path remains active.

### Tests run
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest` -> PASS

### Out-of-scope deferred
- Full redesign of WORK visual language beyond scoped refactor.

### Blockers
- None for M1.

## 3. M2 Details
### Changed files
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/AvatarScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/SettingsScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/TwinCloudSyncCoordinator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`

### User-visible changes
- Avatar surface reframed as `Preferences & Permissions` control layer.
- Added explicit sections for stable preferences, approval rules, data-sharing scope, and sync status.
- Added explicit constraint-precedence messaging (task constraints override long-term preferences).
- Persistence continuity and sync diagnostics surfaced with user-readable state.

### Tests run
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS

### Out-of-scope deferred
- Full cross-device sync architecture rewrite.

### Blockers
- None for M2.

## 4. M3 Details
### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/task/TaskTrackBuilder.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `cloud-adapters/src/main/kotlin/com/lumi/cloudadapters/VercelCloudGateway.kt`
- `cloud-adapters/src/main/kotlin/com/lumi/cloudadapters/OpenClawRelayGateway.kt`

### User-visible changes
- Added lifecycle states in status rendering: `QUOTING`, `AUTH_REQUIRED`, `VERIFYING`, `COMMITTED`, `ROLLED_BACK`, `DISPUTED`.
- Added typed external-fulfillment cards/payload fields and quote comparison output.
- External Fulfillment experience includes price/ETA/risk/proof/rollback-dispute information.
- Legacy name/status compatibility preserved while canonical labels are used in primary UI.

### Tests run
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :cloud-adapters:test` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS

### Out-of-scope deferred
- Full external marketplace backend redesign.

### Blockers
- None for M3.

## 5. M4 Details
### Changed files
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/LixMarketScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/GoalHubScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/TopCards.kt`
- `app-backend-host/src/androidTest/java/com/lumi/keyboard/ui/components/ModuleFeaturePanelSupplementUiTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible changes
- Primary-path copy shifted further to canonical wording (`External Fulfillment`, `Preferences & Permissions`, `External Capabilities`).
- External Fulfillment page no longer presents legacy LIX-first language in key headers/prompts.
- Goal Hub copy now references External Fulfillment instead of LIX market wording.

### Tests run
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :cloud-adapters:test` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

### Out-of-scope deferred
- Instrumentation harness refactor beyond current feature scope.

### Blockers (exact)
- None.

## 6. Validation Command Notes
Requested commands include `:core-agent:testDebugUnitTest` and `:cloud-adapters:testDebugUnitTest`.
In this repository those tasks are not defined; equivalent executed tasks are:
- `:core-agent:test --tests ...`
- `:cloud-adapters:test`

## 7. Release Readiness Checklist
- [x] Unified WORK flow without forced module choice.
- [x] Preferences & Permissions control-layer visibility.
- [x] External Fulfillment contextual behavior + typed quote comparison.
- [x] New lifecycle states wired through parser/orchestrator/UI/terminal checks.
- [x] Trusted skill attribution + verification link behavior preserved.
- [x] Connected instrumentation tests green on real device.

## 8. Role-Aware Follow-Up (2026-03-03)
### Scope
- Implemented active role as a core typed model path (not UI-only).
- Wired active role into policy, approvals, routing, ranking, and data-sharing decisions where applicable.

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SkillPolicyEngine.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SkillSelectionEngine.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/AvatarScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/SkillSelectionEngineTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`

### User-visible changes
- Preferences & Permissions now shows active role and role policy context.
- Role policy is reflected in approval rules and data-sharing scope text.
- Role-aware routing/quote/selection behavior is applied behind the same WORK flow.

### Validation
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## 9. M1 Role Contract v1 Compliance Hardening (2026-03-03)
### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/task/TaskTrackBuilder.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/SkillSelectionEngineTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/M1_Role_Contract_v1_Compliance_Hardening.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible changes
- Response/receipt/history now expose role traceability in concise English:
  - active role
  - role source
  - top role-impact reasons
- Exported activity summaries now include role/source/impact snippets per run.
- Chat execution surface shows role trace and role-driven impact lines.

### Role Contract v1 compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed `RoleSource`/`RoleChangeReason`/`RoleScopedDelegationPolicy` | Implemented | `AgentContracts.kt` |
| Backward-compatible role metadata on run contracts/state | Implemented | `AgentContracts.kt`, `TaskTrackBuilder.kt` |
| Centralized role resolution context | Implemented | `AgentOrchestrator.kt` (`RoleExecutionContext`) |
| Policy precedence correctness | Implemented + tested | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |
| Role source tracking | Implemented + tested | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |
| Canonical `ROLE_*` reason-code families | Implemented | `RoleReasonCodes` + orchestrator reason injection |
| Activity/receipt readability for role impact | Implemented + tested | `RoleTraceFormatter.kt`, `ResponseCards.kt`, `ChatScreen.kt`, `MainActivity.kt`, `RoleTraceFormatterTest.kt` |
| Restore/process-death continuity | Implemented + tested | `DynamicStatePersistencePort.kt`, `SharedPrefsDynamicStateStore.kt`, `DynamicStatePersistenceTest.kt` |
| Cross-role contamination guardrail (non-sticky inference) | Implemented + tested | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |
| Mid-run role change semantics (future-step reevaluation, non-retroactive history) | Implemented + tested | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |

### Validation (this pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS

### Remaining gaps / deferred
- No custom role editor (out of scope).
- No orchestrator rewrite (out of scope).
- No Room schema migration for historical role metadata (not required in this M1 pass).

## 10. Role Track M2 - Explainability + Activity Receiptization (2026-03-03)
### Milestone status
| Milestone | Status | Notes |
|---|---|---|
| M2A Receipt foundation | Done | Typed receipt model + orchestrator generation + response/task-track attachment |
| M2B Activity receiptization | Done | Activity rows now render receipt-first title/headline/summary when receipt exists |
| M2C Execution-surface explainability | Done | Response detail + chat execution + export summary now expose receipt summaries |
| M2D Validation + cleanup | Done | Receipt formatter tests added and full validation sequence passed |

### M2A changed files
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`

### M2B-M2D changed files
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `docs/M2_Explainability_Activity_Receiptization.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M2A contract/type additions
- Added `ExecutionReceiptEventType`.
- Added `ExecutionReceiptEvent`.
- Added `ExecutionReceipt`.
- Added optional `executionReceipt` field on:
  - `AgentResponse`
  - `TaskTrackPayload`

### M2A behavior changes
- Finalized orchestrator responses now generate a typed execution receipt from existing role/gate/policy/proof signals.
- Receipt is attached to response and propagated into chat task-track payload when available.
- Receipt summaries cover role impact, approval, data scope, provider decision, verification/proof, rollback, and issue context.
- Receipt events include run start, role application/change, policy-sensitive events, verification outcome, delivery/rollback, and issue reporting.

### M2B-M2D user-visible behavior changes
- Activity now uses receipt-oriented titles and concise receipt summaries when `executionReceipt` is present.
- Activity search includes receipt titles/summary text, and status-board metrics include `AUTH_REQUIRED`, `COMMITTED`, `ROLLED_BACK`, `DISPUTED`.
- Response detail cards include a dedicated `Execution receipt` block with role/source, delegation mode, and approval/data/provider/verification/proof/rollback summaries.
- Chat execution surface includes an `Execution receipt` block for readable in-run explainability.
- Module export summary lines now include receipt-aware snippets (`receipt_role/source/approval/provider/verification/rollback`).

### M2A compliance map (implemented now)
| Requirement | Status | Evidence |
|---|---|---|
| Typed execution receipt | Implemented | `AgentContracts.kt` (`ExecutionReceipt*`) |
| Receipt attached to response + task-track | Implemented | `AgentOrchestrator.kt` (`withExecutionReceipt`) |
| Reuse canonical `ROLE_*` for role impact summary | Implemented | `AgentOrchestrator.kt` (`buildRoleImpactSummary`, `readableRoleImpact`) |
| Approval/data/provider/verification/rollback summaries | Implemented | `AgentOrchestrator.kt` receipt summary builders |
| Failure-path receipt output (denial/restriction/issues) | Implemented + tested | `AgentOrchestratorTest.kt` |
| Restore/system-recovery role continuity in receipt | Implemented + tested | `DynamicStatePersistenceTest.kt` |
| Backward-compatible decoding for legacy payloads | Implemented + tested | `DomainContractsTest.kt` |

### M2 full compliance map (M2A-M2D)
| Requirement | File evidence | Test evidence |
|---|---|---|
| Typed receipt structure exists and is attached to run payloads | `AgentContracts.kt`, `AgentOrchestrator.kt` | `DomainContractsTest.kt`, `AgentOrchestratorTest.kt` |
| Activity is receipt-first where available with legacy fallback | `ActivityScreen.kt`, `ExecutionReceiptFormatter.kt` | `:app-backend-host:assembleDebug`, connected Android tests command |
| Response cards expose readable receipt summaries | `ResponseCards.kt`, `ExecutionReceiptFormatter.kt` | `ExecutionReceiptFormatterTest.kt`, `RoleTraceFormatterTest.kt` |
| Chat execution surface exposes readable receipt summaries | `ChatScreen.kt`, `ExecutionReceiptFormatter.kt` | `ExecutionReceiptFormatterTest.kt`, connected Android tests command |
| Export summary includes receipt context | `MainActivity.kt`, `ExecutionReceiptFormatter.kt` | `ExecutionReceiptFormatterTest.kt` (`exportSnippet_*`) |
| Success and failure/denial paths produce coherent receipt output | `AgentOrchestrator.kt` receipt builders | `AgentOrchestratorTest.kt`, `ExecutionReceiptFormatterTest.kt` |
| Restore/resume coherence for role-linked receipt metadata | `AgentOrchestrator.kt`, `SharedPrefsDynamicStateStore.kt` | `DynamicStatePersistenceTest.kt` |
| Canonical `ROLE_*` remains primary role-impact source | `AgentOrchestrator.kt`, `RoleTraceFormatter.kt`, `ExecutionReceiptFormatter.kt` | `RoleTraceFormatterTest.kt`, `AgentOrchestratorTest.kt` |

### M2A validations
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

### M2 additional validations (B/C/D completion gate)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptDogfoodScenarioTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

### Receipt copy quality check (2026-03-03)
- Scope:
  - consistency of receipt phrasing across Activity/Response/Chat/export
  - guard against overlong or empty receipt explanation lines
  - verify field presence for receipt-capable items
- Findings:
  - fixed one gap where neutral/default receipt summaries could produce empty `summaryLines`; now fallback line is guaranteed.
  - added consistent length clamping for title/headline/summary/export fields in `ExecutionReceiptFormatter`.
- Evidence:
  - `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
  - `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
  - `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptDogfoodScenarioTest.kt`
- Result:
  - quality gate PASS on dogfood scenarios:
    - work rewrite + live search
    - parent budget guard denial
    - parent permissions/data scope surface
    - buyer external options comparison

### Intentional deferrals
- No Room history schema migration in this pass (kept additive via response/task-track receipt attachment).

## 11. Role Track M3 - External Fulfillment Full Role-Aware Contractization (2026-03-03)
### Status
- Overall: Done (typed/runtime behavior implemented and validated)

### Core implementation evidence
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
  - external typed models/fields for quote/provider decision/approval/data/proof/verification/rollback/dispute summaries
  - receipt event families extended for external chain traceability
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
  - role-aware quote comparison and provider decision/deny logic
  - provider-facing data-scope projection (redaction/block at broadcast boundary)
  - role-aware approval summary derivation
  - proof/verification/rollback/dispute typed summary derivation
  - receipt event-chain generation for quote/provider/approval/proof/verification/rollback/dispute
  - telemetry counters for external role-aware outcomes
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/LixMarketScreen.kt`
  - receipt-first surfaces render external typed summaries in concise English

### M3 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed quote/provider decision/proof/rollback/dispute structures | Implemented | `AgentContracts.kt` + orchestrator typed summary builders |
| Role-aware quote comparison (price/ETA/risk/proof/rollback-dispute/trust/policy fit) | Implemented | `buildRoleAwareQuoteAnalysis` in `AgentOrchestrator.kt` |
| Provider selection/denial readable + reason-coded | Implemented | `ProviderPolicyDecision`, `ProviderDenyReason`, `RoleReasonCodes` |
| External approval gating role-aware and visible | Implemented | `buildExternalApprovalSummary` + receipt/event rendering |
| Provider-facing data scope role-aware and visible | Implemented | `projectProviderFacingDataScope` + `buildExternalDataScopeSummary` + receipt surfaces |
| Proof/verification requirements role-aware and visible | Implemented | `buildExternalProofSummary` + `buildExternalVerificationSummary` |
| Rollback/dispute traceability typed and readable | Implemented | `buildExternalRollbackSummary`, `buildExternalDisputeSummary`, receipt events |
| Activity/receipt show external execution chain | Implemented | `ExecutionReceiptFormatter` + Activity/Response/Chat/LIX surfaces |
| Telemetry added vs deferred documented | Implemented (runtime counters); transport/export deferred | orchestrator counters + deferred note below |

### Targeted fixes in this checkpoint
- Preserved terminal/dispute semantics for review rejection:
  - reject review now enters `DISPUTED` even when gateway sync fails (sync pending is expressed in summary).
- Prevented external data-scope block loss during finalization:
  - precomputed blocked/redacted scope is merged and preserved in final typed summary/receipt.
- Enforced role-sensitive provider divergence for comparable quote sets:
  - buyer selection applies affordability bias within policy constraints, while policy denials still override.

### Validation run (this checkpoint)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - API 36`)

### Telemetry added
- `external_receipt_generation_rate`
- `quote_selection_divergence_by_role`
- `provider_denied_by_role_policy_rate`
- `approval_required_rate_by_role_for_external_runs`
- `external_data_scope_reduction_rate_by_role`
- `proof_missing_rate_by_role`
- `verification_failure_rate_by_role`
- `rollback_receipt_coverage`
- `dispute_traceability_coverage`

### Intentional deferrals
- Telemetry export/aggregation pipeline beyond in-process counters (out of scope for M3 hardening pass).
- Marketplace backend settlement/dispute engine redesign (out of scope).

## 12. Role Track M3.5 - UI Surfacing + Dogfooding Pass (2026-03-03)
### Status
- Overall: Done

### Objective for this pass
- Make M2/M3 external execution-chain semantics clearly visible in main product surfaces (Work/Response/Activity/Chat), especially for issue/failure/dispute/sync-pending states.

### Changed files
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptDogfoodScenarioTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### What became newly visible in UI
- Response history rows now show explicit external headline:
  - `External Fulfillment: ...`
- Response receipt block now shows:
  - external status headline
  - tone-tagged status pills
  - concise why summaries (`Why provider`, `Why approval`, `Why data scope`)
- Chat execution panel receipt card now shows the same external headline + status pills + why summaries.
- Activity rows now show external headline + status pills for receipt-capable items.
- Dispute sync-pending state is promoted as first-class visible text:
  - `Sync pending: dispute state is saved locally while gateway/cloud sync completes.`

### M3.5 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| External chain is prominent in Work/response/activity/chat | Implemented | `ResponseCards.kt`, `ChatScreen.kt`, `ActivityScreen.kt` |
| Provider/approval/data-scope why summaries are concise and visible | Implemented | `ExecutionReceiptFormatter.kt` (`providerWhySummary`, `approvalWhySummary`, `dataScopeWhySummary`) |
| Failure/issue/dispute/sync-pending visibility parity | Implemented | `ExecutionReceiptFormatter.kt`, `AgentOrchestrator.kt` dispute summary wording |
| Formatter/test coverage for visible summary paths | Implemented | `ExecutionReceiptFormatterTest.kt`, `ExecutionReceiptDogfoodScenarioTest.kt` |
| Golden dogfood scenarios covered | Implemented | `ExecutionReceiptDogfoodScenarioTest.kt` (`dogfoodExternalVisibilityScenarios_coverRequiredM3_5Paths`) |

### Required dogfood scenarios
- WORK vs BUYER divergence in external selection/explanation.
- Review reject -> dispute with sync pending visible.
- Provider-facing data scope reduced or blocked visible.
- Verification failure or rollback-capable flow visible.

### Dogfood execution notes
- Runtime-oriented dogfood set executed in tests:
  - orchestrator-backed scenarios: work rewrite/live search, parent budget guard denial, parent permissions data scope, buyer external options
  - visibility scenarios: WORK vs BUYER divergence, dispute sync pending, data-scope blocked, verification failure + rollback flow
- Quality assertions enforced:
  - title/headline present
  - summary lines non-empty
  - summary line length bounded (12..140)
  - no empty receipt-capable activity lines

### Validation commands (this pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`)
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptDogfoodScenarioTest` -> PASS

### Remaining deferred items
- No custom role editor (still out of scope).
- No orchestrator architecture rewrite (still out of scope).
- No storage/history schema rewrite (still out of scope).

## 13. Role Track M4 - Guided Role Policy Editor (2026-03-03)
### Status
- Overall: Done
- M4A Typed contracts/persistence: done
- M4B Runtime application: done
- M4C Preferences editor + preview: done
- M4D Validation + compliance closure: done

### Scope lock (active)
- Keep precedence unchanged (`task explicit constraints > role defaults`).
- No orchestrator rewrite.
- No free-form policy DSL.
- No unlimited custom-role creation.
- No broad UI redesign.

### Implemented file scope
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/AvatarScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ModuleFeaturePanel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- Tests in `core-domain`, `core-agent`, `app-backend-host` related to contracts/runtime/persistence/formatting.

### M4 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed editable role-policy structures and update path | Implemented | `AgentContracts.kt` (`RolePolicyDraft/EditorState/ValidationResult/UpdateResult`), `LumiBackendBridge.kt`, `AgentOrchestrator.kt` (`get/update/resetRolePolicy`) |
| Bounded editor fields (delegation/approval/data/sync/provider/risk/external) | Implemented | `AvatarScreen.kt` (`RolePolicyEditorCard`), `AgentContracts.kt` (`EditableRolePolicyFields`), `AgentOrchestrator.kt` draft merge/validation |
| Validation for contradictory combinations | Implemented | `AgentOrchestrator.kt` (`validateRolePolicyDraft`), `AgentOrchestratorTest.kt` (`updateRolePolicy_rejectsContradictoryBudgetAndDelegationConfig`) |
| Preview block before save | Implemented | `AgentOrchestrator.kt` (`buildRolePolicyPreviewLines`), `AvatarScreen.kt` preview rendering |
| Saved edits influence runtime approvals/routing/ranking/provider/data/delegation | Implemented | `AgentOrchestrator.kt` (approval gates, route suppression with `ROLE_ROUTE_EXCLUDED`, quote ranking/provider deny, data-scope projection, delegation mode propagation), tests in `AgentOrchestratorTest.kt` |
| Persistence across restart/restore | Implemented | `DynamicStatePersistencePort.kt` + `SharedPrefsDynamicStateStore.kt` (`rolePolicyOverrides`), `DynamicStatePersistenceTest.kt` restore/save/reset coverage |
| Receipt/activity explain policy-edit impact | Implemented | `RoleReasonCodes.ROLE_POLICY_USER_OVERRIDE_APPLIED`, `AgentOrchestrator.kt` role impact propagation, `RoleTraceFormatter.kt` readable line |
| Tests for editing/validation/persistence/runtime effect/reset | Implemented | `DomainContractsTest.kt`, `AgentOrchestratorTest.kt`, `DynamicStatePersistenceTest.kt`, `RoleTraceFormatterTest.kt` |

### M4 user-visible behavior
- Preferences & Permissions now includes a bounded Role Policy editor per active role.
- Users can edit delegation, approval budgets/requirements, data scope/sync defaults, provider trust/deny tags, risk/cost preferences, and external-fulfillment allowance/preference.
- Save path performs validation first and returns blocking issues in readable English.
- Preview explains expected impact before save; reset restores role defaults.
- Runtime decisions now reflect edits in approvals, route bias/exclusion, provider selection/denial, quote ranking, provider-facing data scope, and delegation metadata.

### Validation commands (M4 closure)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`)

## 14. Role Track M5 - Versioned Proof Ledger + History Hardening (2026-03-04)
### Status
- Overall: Done
- M5A Snapshot model + binding: done
- M5B Durable ledger records: done
- M5C Replay/restore + compatibility hardening: done
- M5D Validation + compliance closure: done

### Scope lock (active)
- Keep precedence unchanged (`task explicit constraints > role defaults/edited policy`).
- No orchestrator rewrite.
- No free-form policy DSL.
- No broad UI redesign.
- No full settlement platform buildout.

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/build.gradle.kts`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M5 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Durable decision-time policy snapshot binding | Implemented | `AgentOrchestrator.kt` (`buildRolePolicySnapshot`, `buildExecutionReceipt` snapshot fields), `AgentContracts.kt` (`RolePolicySnapshot`, `ReceiptSnapshotBinding`) |
| Past receipt meaning stable after policy edit | Implemented + tested | `AgentOrchestrator.kt` ledger snapshot binding; `AgentOrchestratorTest.kt` (`executionLedger_bindsDecisionTimePolicySnapshot_and_pastReceiptStaysStableAfterPolicyEdit`) |
| Durable record backing for receipt/events/provider/verification/rollback-dispute | Implemented | `AgentContracts.kt` (`ExecutionReceiptRecord`, `RunEventRecord`, `ProviderDecisionRecord`, `VerificationRecord`, `RollbackRecord`, `DisputeRecord`), `AgentOrchestrator.kt` record builders |
| Replay/restore reconstructs role+source+delegation+snapshot+provider/proof chain | Implemented + tested | `DynamicStatePersistencePort.kt`, `SharedPrefsDynamicStateStore.kt`, `AgentOrchestrator.kt` restore/persist/getExecutionLedger, `DynamicStatePersistenceTest.kt` (`persists and restores execution ledger records across process death`) |
| Mixed old/new history compatibility | Implemented | `MainActivity.kt` (`hydrateHistoryFromLedger`, merge with existing history via response snapshot/fallback), `BackendHostClient.kt` ledger fetch |
| Explicit task constraint precedence visible in durable history | Implemented | `ExecutionReceipt.constraintPrecedenceSummary`, `AgentOrchestrator.kt` (`buildConstraintPrecedenceSummary`), `ExecutionReceiptFormatter.kt` summary surfacing |
| M5 required scenario tests | Implemented + passed | `DomainContractsTest.kt`, `AgentOrchestratorTest.kt`, `DynamicStatePersistenceTest.kt` plus validation commands below |

### Validation commands (M5 closure)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`)

### Intentional deferrals
- No Room schema migration in this pass; durable ledger is persisted via additive dynamic-state backing.
- No full settlement/dispute backend redesign; dispute durability is scoped to local/auditable receipt-chain records in M5.

## 15. Role Track M6 - Governance Analytics + Telemetry Aggregation (2026-03-04)
### Status
- Overall: Done
- M6A Metric schema + extraction: done
- M6B Aggregation + query layer: done
- M6C Surfacing + export: done
- M6D Tests + docs + validation: done

### Scope lock (active)
- No orchestrator rewrite.
- No full remote telemetry platform build.
- No broad end-user UI redesign.
- Governance metrics must be derived from typed durable ledger/receipt structures.

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatter.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M6 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed governance metric / aggregation model | Implemented | `AgentContracts.kt` (`GovernanceReasonFamily`, `GovernanceMetricKey`, `GovernanceQuery`, `GovernanceSummary`, `GovernanceBucketSummary`, `GovernanceMetricValue`) |
| Typed extraction from durable ledger / receipt records | Implemented | `AgentOrchestrator.kt` (`toGovernanceSignal`, `collectReasonCodes`, `collectReasonFamilies`) |
| Query/aggregation by role/provider/policy snapshot/outcome/reason-family | Implemented | `AgentOrchestrator.kt` (`getGovernanceSummary` filters and grouped outputs), `GovernanceQuery` fields |
| Typed query path bridge -> service -> kernel -> orchestrator | Implemented | `LumiBackendBridge.kt`, `LumiAgentBackendService.kt`, `SuperAgentKernel.kt`, `BackendHostClient.kt` |
| Internal/admin/debug-facing readable governance surface | Implemented | `ActivityScreen.kt` (`GovernanceSummaryCard` in developer mode), `GovernanceSummaryFormatter.kt` |
| Mixed old/new history compatibility | Implemented | `GovernanceQuery.includeLegacyWithoutReceipt`, orchestrator legacy-safe filtering and defaults, `AgentOrchestratorTest.kt` legacy include/exclude coverage |
| Extraction/aggregation/filter compatibility tests | Implemented + passed | `DomainContractsTest.kt`, `AgentOrchestratorTest.kt`, `GovernanceSummaryFormatterTest.kt` |

### Validation commands (M6 closure)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`)

### Intentional deferrals
- `ledger_restore_success_rate` and `old_new_history_merge_success_rate` are reserved metric keys in M6, but remain placeholder counters until dedicated session/persistence telemetry hooks are added.
- No remote telemetry sink/alert backend in this pass; aggregation remains in-process and local-query-based by design.

## 16. Role Track M7 - Settlement / Dispute / Marketplace Infra Deeper Pass (2026-03-04)
### Status
- Overall: Done
- M7A Typed durable models: done
- M7B Idempotency + reconciliation behavior: done
- M7C Receipt/ledger/query integration: done
- M7D Tests/docs/validation closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed model additions / changes
- Added settlement/dispute/reconciliation contract types:
  - `SettlementStatus`, `SettlementSyncState`, `SettlementAttempt`, `SettlementRecord`
  - `ProviderAckStatus`, `ProviderAckRecord`
  - `SettlementReconciliationResult`, `MarketplaceReconciliationSummary`, `MarketplaceSyncIssue`
  - `RollbackOutcome`, `RollbackAttemptRecord`
  - `DisputeStatus`, `DisputeEventRecord`, `DisputeCaseRecord`
  - `ExternalSettlementSummary`
- Extended `ExecutionReceipt` with:
  - `externalSettlementSummary`
  - `reconciliationSummary`
  - `syncIssues`
- Extended `ExecutionReceiptRecord` with:
  - `settlementRecord`
  - `rollbackAttempts`
  - `disputeCaseRecord`
  - `reconciliationSummary`
  - `syncIssues`
- Extended `LedgerQueryFilter` with operational fields:
  - `settlementStatus`, `disputeStatus`, `syncState`
  - `unresolvedOnly`, `syncPendingOnly`, `providerIssueOnly`
- Extended receipt/ledger event families and governance metric key set for settlement/dispute quality.

### Runtime behavior hardening
- Added typed settlement/dispute/reconciliation derivation in orchestrator finalization path.
- Added idempotent same-run ledger merge:
  - duplicate callbacks no longer create duplicated terminal state
  - duplicate attempts are explicitly marked (`duplicateIgnored`)
  - duplicate reason code is persisted (`ROLE_EXTERNAL_DUPLICATE_CALLBACK_IGNORED`)
- Preserved local authoritative state during remote sync uncertainty:
  - sync-pending and mismatch states remain explicit in typed summaries
  - reconciliation retry/mismatch states are durably recorded
- Added query/filter support for unresolved disputes, sync-pending runs, and provider-issue cases.

### Receipt / activity visibility changes
- Receipt summaries now include settlement and reconciliation explanations.
- External status pills now expose:
  - settlement sync pending
  - reconciliation mismatch / reconciled
  - rollback failed
- Summary lines can include sync issue details and settlement-chain “why” text.
- Export snippet now includes settlement + reconciliation context.

### M7 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed durable settlement/dispute/reconciliation objects | Implemented | `AgentContracts.kt` (new typed enums/data classes + receipt/record fields) |
| Duplicate callback idempotency | Implemented + tested | `AgentOrchestrator.kt` (`mergeExecutionReceiptRecord`/`mergeSettlementRecord`), `AgentOrchestratorTest.kt` (`executionLedger_duplicateCallbackSameRun_isIdempotentAndTracked`) |
| Local authoritative state under delayed remote ack | Implemented | `ExternalSettlementSummary.authoritativeLocalState`, `SettlementSyncState`, reconciliation/sync-issue derivation in `AgentOrchestrator.kt` |
| Durable dispute lifecycle representation | Implemented | `DisputeStatus`, `DisputeCaseRecord`, dispute event mapping in `AgentContracts.kt` + `AgentOrchestrator.kt` |
| Rollback attempt durability | Implemented | `RollbackOutcome`, `RollbackAttemptRecord`, ledger builder wiring in `AgentOrchestrator.kt` |
| Proof-ledger/history integration | Implemented | new receipt->ledger event mappings + `ExecutionReceiptRecord` extensions |
| Operational query/filter support | Implemented + tested | `LedgerQueryFilter` + orchestrator filters + `AgentOrchestratorTest.kt` (`executionLedger_supportsM7OperationalFilters_forUnresolvedSyncAndProviderIssues`) |
| Restore/process-death continuity for M7 fields | Implemented + tested | persistence path unchanged + `DynamicStatePersistenceTest.kt` (`restore continuity keeps settlement dispute and reconciliation traceability`) |
| Legacy compatibility | Implemented | all new fields optional/defaulted; existing decode tests remain green |

### Validation commands (M7 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Remaining deferred items
- No full remote settlement/payment-rail overhaul in M7 (intentionally out of scope).
- No operator console/work-queue UI in M7 (deferred to later ops track).
- Governance metric transport remains local/in-process aggregation (no remote sink in this pass).

## 17. Role Track M8 - Operator Workflows, Alerts, and Governance Console (2026-03-04)
### Status
- Overall: done
- M8A Typed case/queue/alert model: done
- M8B Case derivation/filter/priority/alerts: done
- M8C Internal console/queue/detail surface: done
- M8D Formatter/readability + tests: done
- M8E Validation/docs closure: done

### Scope lock (active)
- Reuse durable receipt/ledger/governance chain as the only truth source.
- No orchestrator rewrite.
- No full remote operator backend.
- No broad end-user UI redesign.

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt` (new)
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M8 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed governance case summaries / filters / priorities from durable ledger | Implemented | `AgentContracts.kt` (`GovernanceCase*`, `GovernanceConsole*`, `GovernanceAlert*`, `GovernanceAction*`) + `AgentOrchestrator.kt` (`buildGovernanceCaseRecord`, `queueTagsFor`, `governancePriorityFor`) |
| Unresolved / sync-pending / provider-issue / mismatch queues | Implemented | `AgentOrchestrator.kt` queue derivation + `GovernanceQueueType` + `GovernanceConsoleFilter` |
| Internal governance console surface | Implemented | `ActivityScreen.kt` (`GovernanceConsoleCard`, case rows/detail/actions), `MainActivity.kt` wiring |
| Readable governance summaries / alerts / next-action suggestions | Implemented | `GovernanceCaseFormatter.kt`, `AgentOrchestrator.kt` (`nextActionSummaryFor`, alert aggregation) |
| Case detail includes role/provider/settlement/dispute/reconciliation/sync/policy/reason families | Implemented | `GovernanceCaseRecord` fields + `GovernanceCaseFormatter.detailLines` + Activity detail panel |
| Local operator actions/stubs | Implemented | mark reviewed + retry sync intent via `LumiBackendBridge` -> `LumiAgentBackendService` -> `SuperAgentKernel` -> `AgentOrchestrator`; copy/export/open trail in `MainActivity.kt` |
| Tests for derivation/filtering/alerts/priorities/readability | Implemented + passed | `DomainContractsTest.kt`, `AgentOrchestratorTest.kt`, `GovernanceSummaryFormatterTest.kt` |

### Validation commands (M8 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Remaining deferred items
- No remote operator console backend or multi-operator permission model in M8 (intentionally deferred).
- No remote alert delivery/channel integration (Slack/CRM/ticketing) in this pass.
- `mark reviewed` and `retry sync intent` remain local workflow controls/stubs with durable trail updates; remote execution automation is deferred.

## 18. Role Track M9 - Remote Telemetry, Alert Delivery, and Reconciliation Services Extraction (2026-03-04)
### Status
- Overall: done
- M9A Typed remote contracts: done
- M9B Service boundary extraction: done
- M9C Runtime derivation + dedupe/idempotency: done
- M9D Persistence + operator visibility: done
- M9E Validation + docs/status closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt` (new)
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed model additions
- Telemetry:
  - `TelemetrySinkTarget`, `TelemetryDeliveryStatus`
  - `GovernanceTelemetryEnvelope`, `TelemetryDeliveryAttempt`, `GovernanceTelemetryBatch`, `TelemetryEmissionRecord`
- Alert delivery:
  - `AlertDeliveryChannel`, `AlertDeliveryTarget`
  - `AlertDispatchStatus`, `AlertDispatchRequest`, `AlertDispatchAttempt`, `AlertDeliveryRecord`
- Reconciliation extraction:
  - `ReconciliationJobType`, `ReconciliationJobStatus`
  - `RemoteSyncHandoffStatus`, `ReconciliationRetryPolicy`, `ReconciliationDispatchAttempt`, `ReconciliationJobRecord`
- Operator visibility:
  - `RemotePipelineSummary`, `RemoteDeliveryIssue`, `RemotePipelineFilter`
- Additive optional field extensions:
  - `GovernanceCaseRecord.remotePipelineSummary`
  - `GovernanceCaseRecord.remoteDeliveryIssues`
  - `GovernanceConsoleState.remotePipelineSummary`
  - `GovernanceConsoleState.remoteDeliveryIssues`
  - `ExecutionReceipt.remotePipelineSummary`

### Service boundaries added
- `GovernanceTelemetrySinkPort`
  - `NoOpGovernanceTelemetrySinkPort`
  - `LocalDurableGovernanceTelemetrySinkPort`
  - `StubGovernanceTelemetrySinkPort`
- `GovernanceAlertDeliveryPort`
  - `NoOpGovernanceAlertDeliveryPort`
  - `LocalDurableGovernanceAlertDeliveryPort`
  - `StubGovernanceAlertDeliveryPort`
- `ReconciliationHandoffPort`
  - `NoOpReconciliationHandoffPort`
  - `LocalDurableReconciliationHandoffPort`
  - `StubReconciliationHandoffPort`

### Runtime/persistence/visibility changes
- Orchestrator now derives remote records from durable run records:
  - telemetry export records
  - alert delivery records
  - reconciliation job records
- Added deduped upsert merge behavior for repeated run updates/retry actions.
- `retryGovernanceSyncIntent` now triggers remote pipeline refresh with reconciliation retry semantics.
- Dynamic-state persistence now stores/restores:
  - `telemetryEmissionRecords`
  - `alertDeliveryRecords`
  - `reconciliationJobRecords`
- Governance case/console surfaces now show:
  - remote pipeline summary (telemetry/alert/reconciliation/handoff status)
  - remote delivery issue lines

### M9 requirement compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed telemetry/alert/reconciliation remote contracts | Implemented | `AgentContracts.kt` |
| Safe default service boundaries/adapters | Implemented | `RemotePipelinePorts.kt` |
| Typed export/dispatch/handoff attempt tracking | Implemented | `AgentOrchestrator.kt` remote update/merge functions |
| Durable dedupe/idempotent repeated attempts | Implemented + tested | `AgentOrchestrator.kt` merge/upsert helpers, `AgentOrchestratorTest.kt` (`retryGovernanceSyncIntent_deduplicatesReconciliationRemoteRecordsByRun`) |
| Operator/internal visibility for remote state | Implemented + tested | `GovernanceCaseFormatter.kt`, `ActivityScreen.kt`, `GovernanceSummaryFormatterTest.kt` |
| Persistence/restore continuity | Implemented + tested | `DynamicStatePersistencePort.kt`, `SharedPrefsDynamicStateStore.kt`, `DynamicStatePersistenceTest.kt` |
| Mixed old/new history compatibility | Preserved | optional/defaulted fields + existing legacy compatibility tests remain green |

### Validation commands (M9 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Remaining deferred items
- No remote telemetry backend deployment/protocol negotiation in M9 (ports/adapters extracted, runtime remains local-first by default).
- No remote alert channel integrations beyond local/stub adapters.
- No remote reconciliation worker service in this pass; handoff states are durable and operator-visible but remote execution remains deferred.

## 19. Role Track M9.5 - Repo Hygiene and Stabilization (2026-03-04)
### Status
- Overall: done
- M9.5A Noise audit + ignore tightening: done
- M9.5B Repo-local workflow discipline: done
- M9.5C Lightweight preflight checklist: done
- M9.5D Low-risk warning policy: done
- M9.5E Baseline status closure: done

### Changed files
- `.gitignore`
- `LumiKeyboard-Android/.gitignore`
- `AGENTS.md` (new, repo-local workflow baseline)
- `docs/milestone-preflight-checklist.md` (new)
- `docs/repo-hygiene-baseline.md` (new)
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Noise sources addressed
- Added ignore coverage for local Gradle/Kotlin transient paths:
  - `.gradle-home/`, `.kotlin/`
- Added ignore coverage for local binary/scratch paths:
  - `**/bin/`, `captures/`, `*.apk`, `*.iml`
- Standardized local-only artifact quarantine paths:
  - `.local-output/`, `local-output/`, `artifacts/local/`
- Added repo-local workflow constraints to reduce mixed-scope edits in milestone execution.

### Ignore/workflow/checklist improvements
- New `AGENTS.md` codifies milestone scope discipline and artifact rules.
- New `docs/milestone-preflight-checklist.md` adds a repeatable preflight gate:
  - diff sanity
  - artifact hygiene check
  - validation command baseline
  - status/doc sync
  - rollback safety
- New `docs/repo-hygiene-baseline.md` records known noise categories, applied mitigation, and remaining risks.

### Warning-noise handling
- No behavioral code changes were introduced for warning cleanup in this pass.
- Policy set: only localized, behavior-safe warning cleanup is allowed in future passes; broad warning elimination remains out of scope.

### Validation commands (M9.5 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS

### Remaining repo-noise risks
- Previously tracked generated/build artifacts still exist and continue to dirty the tree until a dedicated, controlled cleanup migration is scheduled.
- Parallel active workstreams in the monorepo can still inject unrelated churn; milestone-scoped discipline remains mandatory.

## 20. Role Track M10 - Remote Operator Backend, Alert Routing, and Collaboration (2026-03-04)
### Status
- Overall: done
- M10A Contracts + docs baseline: done
- M10B Ports/adapters + orchestrator plumbing: done
- M10C Persistence + restore continuity: done
- M10D Service/client/UI surfacing: done
- M10E Tests + validation closure: done

### Changed files
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`

### Typed model additions
- Collaboration:
  - `OperatorAssigneeRef`
  - `OperatorCaseClaimStatus`
  - `OperatorCollaborationStatus`
  - `GovernanceCaseNoteRecord`
  - `GovernanceCaseFollowUpState`
  - `GovernanceCaseCollaborationState`
- Remote operator handoff:
  - `RemoteOperatorHandoffStatus`
  - `RemoteOperatorHandoffRequest`
  - `RemoteOperatorHandoffAttempt`
  - `RemoteOperatorHandoffRecord`
  - `RemoteOperatorHandoffSummary`
- Alert routing:
  - `AlertRoutingTargetType`
  - `AlertRoutingStatus`
  - `AlertRoutingTarget`
  - `AlertRoutingAttempt`
  - `AlertRoutingRecord`
  - `AlertRoutingSummary`
- Command/action surfaces:
  - `GovernanceCollaborationCommand`
  - `GovernanceActionType` additions:
    - `CLAIM_CASE`
    - `UNCLAIM_CASE`
    - `ASSIGN_CASE`
    - `ADD_NOTE`
    - `REQUEST_FOLLOW_UP`
    - `ACK_REMOTE_HANDOFF`
- Optional/defaulted payload extensions:
  - `GovernanceCaseRecord.collaborationState`
  - `GovernanceCaseRecord.remoteOperatorHandoff`
  - `GovernanceCaseRecord.alertRoutingRecords`
  - `GovernanceConsoleState.collaborationSummary`
  - `GovernanceConsoleState.remoteOperatorSummary`
  - `ExecutionReceipt.remoteOperatorHandoffSummary`
  - `ExecutionReceipt.alertRoutingSummary`
  - `ExecutionReceiptRecord.collaborationState`
  - `ExecutionReceiptRecord.remoteOperatorHandoff`
  - `ExecutionReceiptRecord.alertRoutingRecords`

### Runtime behavior changes
- Added orchestrator command path:
  - `updateGovernanceCaseCollaboration(userId, runId, command)`
- Implemented durable transitions for:
  - claim/unclaim
  - assign
  - add note
  - request follow-up
  - acknowledge handoff
- Added M10 reason-code families in `RoleReasonCodes` and appended operator/handoff/routing events into ledger trail.
- Added collaboration command dedupe handling by command-bucket event id (`collab:{runId}:{commandType}:{actorId}:{bucket}`) and duplicate suppression in ledger event merge.
- Added remote handoff and alert routing summaries into receipt finalization updates.
- Preserved local-first behavior: remote adapter failures produce durable failed/pending records and do not replace authoritative local execution outcome.

### Persistence / restore continuity
- `PersistedDynamicState` now carries:
  - `collaborationStates`
  - `remoteOperatorHandoffRecords`
  - `alertRoutingRecords`
- SharedPrefs-backed dynamic-state store now saves/loads these lists with `ignoreUnknownKeys = true` compatibility behavior.
- Restore path hydrates collaboration/handoff/routing queues before governance queries, preserving mixed-history rendering with fallback defaults for legacy records.

### UI/operator surfacing changes
- Governance detail panel now supports:
  - claim
  - unclaim
  - assign
  - add note
  - request follow-up
  - acknowledge handoff
  plus existing mark reviewed/retry sync/copy/open trail actions.
- Added compact operator input fields in governance detail card:
  - operator display name
  - assignee
  - note
  - follow-up summary
- Formatter upgrades (`GovernanceCaseFormatter`) now surface concise English lines for:
  - collaboration state/owner/assignee/follow-up/note
  - remote handoff status/target/error
  - alert routing status/attempt summary
- Increased governance detail line budget in Activity to keep collaboration/handoff/routing visible in primary detail view.

### Validation commands (M10 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Explicit deferred items
- Production Slack/CRM/Jira/Zendesk connectors.
- Remote multi-operator auth/permission backend.
- Broad operator SaaS console redesign.
- Full remote settlement platform integration.

### Blockers
- None.

## 42. Role Track M28 - Enterprise Rollout Waves, Calendar-Aware Promotion Operations, and Cross-Window Governance Controls (2026-03-05)
### Status
- Overall: done
- M28A typed wave/window/cross-window contracts: done
- M28B runtime wave/window decision behavior: done
- M28C receipt/governance/timeline visibility + filtering: done
- M28D continuity/tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M28 compliance map
| Requirement | Status | Evidence |
| --- | --- | --- |
| Typed rollout wave/window/cross-window entities | Done | `AgentContracts.kt` (M28 enums/models/summary fields/reason/event families) + `DomainContractsTest.kt` (`encodeDecode_m28RolloutWaveWindowAndCrossWindowRoundTrip`) |
| Runtime wave ordering + window eligibility + defer/carry-forward/expiry + cross-window pause/resume | Done | `AgentOrchestrator.kt` wave-index resolution + `resolveWorkflowPolicyRolloutState` + M28 reason/event emission |
| Receipt/governance/timeline readability for wave/window/cross-window semantics | Done | `ExecutionReceiptFormatter.kt`, `GovernanceCaseFormatter.kt`, `RoleTraceFormatter.kt`, `AgentOrchestrator.kt` receipt-event to ledger/timeline mapping |
| Governance filter coverage (wave/window/deferred/carry-forward/expired/window-blocked/cross-window-paused/next-window-pending) | Done | `GovernanceConsoleFilter` + `AgentOrchestrator.kt` M28 filter branch in `getGovernanceCases` |
| Restore/process-death continuity for M28 state | Done | `DynamicStatePersistenceTest.kt` (`restore continuity keeps m28 rollout wave and cross-window governance state`) |
| Validation gate closure | Done | full M28 command set passed, including connected Android tests on `SM-X916B - 16` |

### Validation (M28)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Explicit deferred items
- Full external calendar platform integration matrix.
- BPM/DSL-style generalized workflow language.
- Destructive automation classes.

### Blockers
- None.

## 41. Role Track M27 - Enterprise Policy Estate Scheduling Windows, Rollout Calendars, and Multi-Stage Automation Governance (2026-03-05)
### Status
- Overall: done
- M27A typed scheduling/calendar contracts: done
- M27B runtime schedule evaluation and stage timing: done
- M27C receipt/governance visibility and filterability: done
- M27D tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M27 compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed scheduling window and rollout calendar semantics | Done | `AgentOrchestrator.kt` rollout-state persistence (`policySchedulingWindow`, `rolloutCalendar`, `calendarEvaluation`, `scheduleSummary`, `rolloutCalendarSummary`) + `DomainContractsTest.kt` |
| Runtime block/defer/pause/expire schedule decisions | Done | `AgentOrchestrator.kt` schedule evaluation and expiry/approval/maintenance logic + `AgentOrchestratorTest.kt` (`m26EstateAutomation...`, `m27ScheduleWaitingMaintenance...`) |
| Receipt/governance readable schedule explanations | Done | `ExecutionReceiptFormatter.kt`, `GovernanceCaseFormatter.kt`, `RoleTraceFormatter.kt` |
| Schedule-aware governance filtering | Done | `AgentOrchestrator.kt` + `GovernanceConsoleFilter` fields (`scheduleDeferredOnly`, `schedulePausedOnly`, `scheduleExpiredOnly`, `scheduleEligibleOnly`, `scheduleWaitingMaintenanceOnly`) |
| Restore/process-death continuity for schedule state | Done | `DynamicStatePersistenceTest.kt` (`restore continuity keeps m27 scheduling window and rollout calendar state`) |
| Validation gate completion | Done | Full M27 command set passed, including connected Android tests (`SM-X916B - 16`, 8 tests) |

### Validation (M27)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Blockers
- None.

## 35. Role Track M25 - Enterprise Policy Estate Analytics, Drift Remediation, and Lifecycle Governance Operations (2026-03-05)
### Status
- Overall: done
- M25A typed estate/drift model: done
- M25B runtime analytics/remediation generation: done
- M25C safe remediation/governance integration: done
- M25D validation/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed additions / strengthened concepts
- `PolicyEstateSnapshot`
- `PolicyEstateDriftRecord` / `PolicyEstateDriftSeverity` / `PolicyEstateDriftType`
- `PolicyEstateBlocker`
- `PolicyEstateAdoptionSummary`
- `PolicyEstateLifecycleHealthSummary`
- `PolicyEstateRemediationSuggestion`
- `PolicyEstateRemediationPlan`
- `PolicyEstateRemediationActionRecord`
- `PolicyEstateRemediationStatus`
- Canonical `ROLE_POLICY_ESTATE_*` reason-code family
- `WORKFLOW_POLICY_ESTATE_*` ledger event types

### Runtime behavior highlights
- Estate analytics and drift classification are derived from durable governance/lifecycle/rollout truth in orchestrator runtime.
- Remediation suggestions and plan/action status are generated and persisted as typed, auditable runtime artifacts.
- Safe remediation actions (`attach plan`, `ack blocker`, `schedule`, `apply safe remediation`) append durable events and reason codes.
- Governance filtering now supports estate triage:
  - `policyEstateDriftSeverity`
  - `policyEstateRemediationStatus`
  - `policyEstateBlockedOnly`

### Visibility changes
- Receipt summary/export now includes policy-estate state, drift, blocker, and remediation lines.
- Governance case line/detail/search now includes estate drift severity, blocker count, remediation pending/status, and latest remediation action.
- Role trace formatter now provides readable English mappings for canonical M25 `ROLE_POLICY_ESTATE_*` reason codes.

### Compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed estate snapshot/drift/remediation model | Done | `AgentContracts.kt`, `DomainContractsTest.kt` |
| Runtime analytics from durable truth | Done | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |
| Explainable recommendations + durable safe actions | Done | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |
| Governance filtering by severity/remediation/blocked | Done | `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` |
| Receipt/governance readable M25 visibility | Done | `ExecutionReceiptFormatter.kt`, `GovernanceCaseFormatter.kt`, formatter tests |
| M25 role reason readable mapping | Done | `RoleTraceFormatter.kt`, `RoleTraceFormatterTest.kt` |
| Validation command gate | Done | Full command suite passed in this pass |

### Validation commands (M25 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items
1. Destructive bulk remediation remains out of scope.
2. No BPM/DSL expansion in M25.
3. No orchestrator rewrite in M25.

### Blockers
- None.

## 34. Role Track M24 - Enterprise Policy Governance Programs, Pack Lifecycle Operations, and Cross-Tenant Rollout Controls (2026-03-05)
### Milestone status
- M24A typed governance-program/lifecycle contracts: done
- M24B cross-tenant summaries/readiness analytics: done
- M24C runtime governance/lifecycle actions: done
- M24D visibility/tests/docs closure: done

### Scope guard for this run
- Additive and backward-compatible only.
- No orchestrator rewrite.
- No broad operator-console redesign.
- Preserve explicit case/task constraints above pack/override defaults.
- Preserve local-first and non-retroactive historical semantics.

### Changed files
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M24 compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed governance program + lifecycle contracts | Done | `AgentContracts.kt` (M24 governance-program/cross-tenant/lifecycle models + action enums) and `DomainContractsTest.kt` round-trip coverage |
| Cross-tenant adoption/drift/exemption/pinning summaries | Done | `AgentOrchestrator.kt` (`recomputeCrossTenantRollout`) + M24 summary projection to case/receipt paths |
| Runtime governance/lifecycle actions with durable traces | Done | `AgentOrchestrator.kt` action handlers for create/advance/pause wave, exemption/pin add-remove, deprecate/retire/replacement + proof-ledger events/reason codes |
| Governance/receipt visibility for M24 summaries | Done | `GovernanceCaseFormatter.kt`, `ExecutionReceiptFormatter.kt`, `RoleTraceFormatter.kt`, `ActivityScreen.kt`, `MainActivity.kt` |
| Restore/process-death continuity for M24 state | Done | `DynamicStatePersistenceTest.kt` `restore continuity keeps m24 governance program lifecycle and cross-tenant state` |
| Mixed-history compatibility | Done | Optional/defaulted contracts + existing legacy-safe formatting paths + `DomainContractsTest.kt` compatibility coverage |

### Runtime/user-visible additions
- Governance actions now support policy governance program operations and lifecycle controls in Activity detail actions.
- Governance case line/detail/search and receipt summaries now show:
  - program status/wave status
  - cross-tenant readiness and drift/exemption/pinning counts
  - pack lifecycle/deprecation/retirement/replacement summaries
- Canonical M24 `ROLE_*` reason codes are translated into readable English role-impact lines.

### Tests added/updated (M24)
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
  - `encodeDecode_m24GovernanceProgramLifecycleAndCrossTenantRoundTrip`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
  - `updateGovernanceCaseCollaboration_m24ProgramLifecycleAndCrossTenantActions_areDurableAndVisible`
  - `updateGovernanceCaseCollaboration_m24RetirementBlockedUntilExemptionCleared_thenRetires`
  - `updateGovernanceCaseCollaboration_m24RetirePolicyPack_withoutPinsOrExemptions_marksRetired`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
  - `restore continuity keeps m24 governance program lifecycle and cross-tenant state`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
  - M24 summary/export visibility coverage
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
  - M24 reason-code readable mapping coverage

### Validation commands (M24 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No BPM/DSL expansion.
- No orchestrator rewrite.
- No broad operator-console redesign.

## 33. Role Track M23 - Enterprise Policy Promotion, Rollout Analytics, and Approval Operations (2026-03-05)
### Status
- Overall: done
- M23A typed promotion/readiness/approval-operation contracts: done
- M23B rollout analytics/readiness evaluation: done
- M23C runtime promotion/approval action hardening: done
- M23D visibility/tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M23 compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed promotion request/decision/readiness/blocker/recommendation contracts | Implemented | `AgentContracts.kt` M23 promotion/readiness/analytics/approval fields + `DomainContractsTest.kt` `encodeDecode_m23PolicyPromotionAnalyticsAndApprovalRoundTrip` |
| Rollout analytics-driven promotion readiness evaluation | Implemented | `AgentOrchestrator.kt` `derivePromotionReadiness`, `deriveRolloutAnalyticsSummary`, `buildApprovalReviewSummary` |
| Runtime promotion operations durability (request/approve/reject/advance/pause/resume/rollback) | Implemented | `AgentOrchestrator.kt` `resolveWorkflowPolicyRolloutState` action handling + durable `promotionAuditRecords`/`approvalOperations` updates |
| Readiness-aware denials and reason-coded trails | Implemented | `AgentOrchestrator.kt` denial path appends canonical `ROLE_POLICY_PROMOTION_*`/`ROLE_POLICY_ROLLOUT_ADVANCE_*` reason families |
| Governance/operator visibility for promotion state/blockers/recommendations/approval | Implemented | `GovernanceCaseFormatter.kt`, `ExecutionReceiptFormatter.kt`, `RoleTraceFormatter.kt`, `MainActivity.kt` |
| Mixed-history compatibility and restore continuity | Implemented | Optional/defaulted contract fields + `DynamicStatePersistenceTest.kt` restore continuity case |

### Runtime behavior added in M23
- Promotion request/approval/rejection/advance are handled as typed runtime actions in rollout governance state.
- Approval-review queues and promotion audit records are appended durably for operator/audit trails.
- Readiness evaluation now emits typed blockers + recommendation plus rollout analytics summary.
- Pause/resume/rollback transitions preserve promotion-state continuity rather than flattening promotion context.

### Validation commands (M23 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred / out-of-scope
- No new BPM/DSL surface introduced (explicitly out of scope).
- No orchestrator rewrite (explicitly out of scope).
- No broad operator-console redesign (explicitly out of scope).

### Blockers
- None.

## 32. Role Track M22 - Enterprise Policy Rollout Safety, Simulation, and Approval Governance (2026-03-05)
### Status
- Overall: done
- M22A typed rollout-governance contracts: done
- M22B runtime rollout governance behavior: done
- M22C approval/freeze/rollback durability + audit trail: done
- M22D visibility/tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M22 compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed rollout stage/mode/scope/target contracts | Implemented | `AgentContracts.kt` rollout enums/models + `DomainContractsTest.kt` `encodeDecode_m22WorkflowRolloutGovernanceRoundTrip` |
| Typed approval governance for risky transitions | Implemented | `AgentOrchestrator.kt` `resolveWorkflowPolicyRolloutState` + `AgentOrchestratorTest.kt` `updateGovernanceCaseCollaboration_m22RiskyPromotion_requiresApproval` |
| Typed freeze/pause/rollback governance state | Implemented | `AgentOrchestrator.kt` rollout command branch + `AgentOrchestratorTest.kt` `updateGovernanceCaseCollaboration_m22PauseBlocksStrongerEnforcement_andScopeExpansionIsAuditable` and `updateGovernanceCaseCollaboration_m22RollbackRestoresLastSafeState_andKeepsHistory` |
| Runtime consequence for simulation/staged/enforced/pause/rollback | Implemented | `resolveWorkflowPolicyRolloutState` force-simulation/guardrail logic + M22 orchestrator scenario tests |
| Durable rollout action/approval audit records | Implemented | `PolicyRolloutAuditRecord` append path + `ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_*` run events + M22 ledger assertions |
| Governance/receipt/operator readable visibility | Implemented | `ExecutionReceiptFormatter.kt`, `GovernanceCaseFormatter.kt`, `ActivityScreen.kt`, `MainActivity.kt`, `RoleTraceFormatter.kt`, `ExecutionReceiptFormatterTest.kt` |
| Restore/process-death continuity | Implemented | `DynamicStatePersistenceTest.kt` `restore continuity keeps m22 rollout approval freeze and rollback governance state` |

### Validation commands (M22 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Notes
- Worktree remains noisy; M22 edits stayed scoped to rollout-governance runtime/contracts/docs/tests.

## 34. Role Track M20 - Enterprise Workflow Policies, SLA Timers, and Automation Guardrails (2026-03-05)
### Status
- Overall: done
- M20A typed policy/timer/guardrail baseline: done
- M20B runtime policy evaluation hardening: done
- M20C governance/receipt visibility hardening: done
- M20D tests/validation/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed model baseline used by M20 runtime
- Existing typed M20 contract layer was used and validated end-to-end:
  - `WorkflowPolicyProfile`
  - `WorkflowSlaClock` + `WorkflowSlaStatus`
  - `WorkflowStageTimerState` + `WorkflowStageTimerStatus`
  - `WorkflowEscalationTimerState` + `WorkflowEscalationTimerStatus`
  - `WorkflowAutomationGuardrailDecision` + `WorkflowAutomationEligibilityStatus`
- Existing canonical reason families are active in M20 runtime traces:
  - `ROLE_WORKFLOW_POLICY_APPLIED`
  - `ROLE_SLA_*`
  - `ROLE_ESCALATION_*`
  - `ROLE_AUTOMATION_*`

### Runtime behavior additions/hardening
- Governance filter normalization now includes workflow template and M20 timer/automation dimensions.
- Governance query path now supports:
  - `workflowTemplateId`
  - `workflowStage`
  - `slaStatus`
  - `stageTimerStatus`
  - `escalationTimerStatus`
  - `automationEligibility`
  - `automationBlockedOnly`
  - `slaBreachOnly`
  - `escalationPendingOnly`
- Operator timeline now emits readable, severity-mapped entries for:
  - workflow policy applied
  - SLA status changed
  - escalation timer status changed
  - automation guardrail evaluated
- Escalation transitions were hardened:
  - required escalation progresses to triggered state on subsequent due evaluations
  - trigger timestamps are preserved durably for required/triggered paths.

### Governance/receipt visibility changes
- Governance case row/detail/search output now includes workflow policy + SLA/stage/escalation/automation signals.
- Receipt summary/export now includes:
  - compact timer status summary
  - workflow policy summary
  - SLA/stage timer/escalation summaries
  - automation guardrail and suppression summaries
  - next required human action when automation is blocked/suppressed.

### Persistence/continuity changes
- Restore continuity tests now verify workflow policy/timer/escalation/guardrail state survives process-death/restore and remains visible in case/ledger summaries.
- No storage schema rewrite; additive optional/defaulted fields remain mixed-history compatible.

### Tests added/updated (M20)
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
  - added M20 workflow-policy/SLA/timer/guardrail round-trip compatibility coverage.
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
  - added M20 policy + SLA breach + automation blocked/filterability scenario.
  - added invalid workflow-stage transition policy denial scenario.
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
  - extended restore continuity scenario for M20 workflow/timer state.
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
  - added M20 summary/export visibility coverage.
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
  - extended M20 case-line/detail/search coverage with truncation-safe assertions.

### Validation commands run (M20 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items (intentional)
1. No general-purpose BPM/workflow DSL in M20.
2. No destructive automation actions in M20.
3. No broad operator-console visual redesign in M20.
4. No orchestrator/storage architecture rewrite in M20.

### Blockers
- None.

## 33. Role Track M19 - Enterprise Operator Collaboration, Workflow Templates, and Remote Ops Automation (2026-03-05)
### Status
- Overall: done
- M19A typed model additions: done
- M19B runtime workflow/collaboration/automation behavior: done
- M19C console/timeline surfacing: done
- M19D tests/validation/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed model additions (M19)
- Workflow: `OperatorWorkflowTemplate`, `OperatorWorkflowRun`, `OperatorWorkflowStageDefinition`, `OperatorWorkflowStageRecord`, `WorkflowNextActionSuggestion`.
- Collaboration artifacts: `GovernanceCaseHandoffRecord`, `GovernanceCaseEscalationRecord`, `GovernanceCollaborationEventRecord`.
- Automation artifacts: `RemoteOpsAutomationRule`, `RemoteOpsAutomationAuditRecord`.
- Governance payload extensions:
  - `GovernanceCaseCollaborationState.workflowRun/handoffHistory/escalationHistory/collaborationEvents/automationAudit`
  - `ExecutionReceiptRecord.workflowRun/collaborationEvents/automationAudit`
  - `GovernanceCaseSummary.workflowTemplateName/workflowStage/workflowNextAction`
  - `GovernanceCaseRecord.workflowTemplate/workflowRun/workflowSummary/latestCollaborationEvent/latestAutomationAudit`

### Runtime behavior additions
- `updateGovernanceCaseCollaboration` now supports:
  - `ATTACH_WORKFLOW_TEMPLATE`
  - `ADVANCE_WORKFLOW_STAGE`
  - `RUN_SAFE_AUTOMATION`
- Workflow transitions update durable collaboration and ledger context.
- Safe automation now writes durable audit records and reason-coded run events (`ROLE_AUTOMATION_*` families).
- Existing note/handoff/escalation actions now enrich typed collaboration event/history artifacts.
- Governance case derivation now emits workflow summary and latest collaboration/automation traces.

### Console/timeline visibility additions
- Governance case row now includes workflow stage marker.
- Case detail now surfaces:
  - workflow template/stage/next action
  - workflow summary
  - latest collaboration event
  - latest automation audit
- Activity detail action set now includes:
  - Attach workflow
  - Advance stage
  - Run automation
- Case-action toast labels now include new M19 actions.

### Validation commands run (M19 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items (intentional)
1. No general-purpose workflow DSL or free-form automation engine in M19.
2. No destructive automation actions in M19.
3. No broad operator-console redesign beyond incremental case/detail surfacing.

### Blockers
- None.

## 32. Role Track M18 - SaaS-Grade Operator Console and Enterprise Ops UX (2026-03-05)
### Status
- Overall: done
- M18A operator home + queue presets: done
- M18B case detail + timeline: done
- M18C collaboration ergonomics + safe bulk actions: done
- M18D alert/health drilldown + validation closure: done

### Scope guard (locked)
- No orchestrator rewrite.
- No destructive bulk actions.
- No parallel operator semantics outside durable runtime truth.
- Keep local-first compatibility intact.

### Compliance map
| Requirement | Status | Implementation evidence |
|---|---|---|
| Operator home/queue usability with presets and counts | Done | `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`, `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`, `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt` |
| Case timeline readability | Done | `AgentContracts.kt` (`OperatorCaseTimelineItem`), `AgentOrchestrator.kt` (`buildOperatorCaseTimeline`), `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`, `ActivityScreen.kt` |
| Safe bulk triage actions (mark reviewed/retry sync) | Done | `AgentContracts.kt` (`GovernanceBulkActionRequest/Result`), `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`, `AgentOrchestrator.kt`, `BackendHostClient.kt`, `LumiAgentBackendService.kt`, `MainActivity.kt`, `ActivityScreen.kt` |
| Alert/health drilldown and queue scanability | Done | `AgentOrchestrator.kt` (`OperatorHomeSummary` + health buckets), `ActivityScreen.kt` (preset/health chips + drill-to-filter), `GovernanceCaseFormatter.kt` |
| Mixed-history compatibility | Done | Optional/defaulted contract fields + tests below |

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/SuperAgentKernel.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/operator-visible changes
- Governance console in Activity now has operator home summary (open cases, pending sync, disputes, critical issues).
- Queue presets and health bucket chips are visible and drill into scoped case subsets.
- Case detail shows a readable timeline blending durable run events, collaboration updates, handoff state, and alert delivery state.
- Safe bulk actions are available for selected cases:
  - mark reviewed
  - retry sync intent
  - copy summary
- Failure and degraded states remain first-class in queue and timeline views (not hidden behind deep details).

### Validation results (M18)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items
- No broad SaaS visual redesign beyond the scoped Activity governance/operator surface.
- No destructive bulk operations.
- No orchestrator rewrite or separate operator truth model.

## 28. Role Track M17 - Enterprise SSO, SCIM, IdP Provider Rollout, and Production Vault Integration (2026-03-04)
### Status
- Overall: done
- M17A typed IdP/SCIM provider adapter contracts: done
- M17B typed vault provider integration semantics: done
- M17C runtime provider-aware gating/provenance propagation: done
- M17D tests/validation/docs closure: done

### Scope checkpoint
- This pass remains additive and backward-compatible.
- Local-first behavior and local permission precedence remain unchanged.
- No orchestrator rewrite and no broad storage/history rewrite.
- No full provider/vendor rollout matrix in this pass.

### Compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed IdP provider adapter semantics integrated | Done | `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`, `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`, `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt` |
| Typed SCIM provider freshness/health semantics integrated | Done | same files + `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt` |
| Typed vault provider materialization/health semantics integrated | Done | same files + `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Provider-specific reasons prioritized over generic fallback | Done | `AgentOrchestrator.kt` (`credentialRouteBlockReasonFor` precedence + canonical provider/vault reason families) |
| Receipt/governance surfaces show provider/vault provenance | Done | `AgentOrchestrator.kt` receipt/governance normalization + `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt` + `.../GovernanceCaseFormatter.kt` |
| Restore continuity + mixed-history compatibility | Done | Optional/defaulted contract fields + `DynamicStatePersistenceTest`/`DomainContractsTest` revalidation |

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation commands
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items
- Full enterprise provider/vendor rollout matrix remains out of scope in M17.
- Full production secret-vault backend vendor rollout remains out of scope in M17.

### Blockers
- None.

## 23. Role Track M13 - Remote Operator Directory, Credentialing, and Production Connector Hardening (2026-03-04)
### Status
- Overall: done
- M13A remote directory typed foundations: done
- M13B remote-aware authorization hardening: done
- M13C connector destination/credential binding hardening: done
- M13D governance visibility + tests/docs closure: done

### Compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed remote operator identity/team/source concepts | Done | `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt` (`RemoteOperatorDirectoryEntry`, `RemoteOperatorTeam`, `RemoteOperatorDirectorySource`) + orchestrator directory resolution |
| Remote-aware operator actions are permission-gated | Done | `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt` (`authorizeOperatorAction` + `authorizeRemoteOperatorActionLocked`) |
| Denied actions remain durable/auditable | Done | `AgentOrchestrator.kt` collaboration-denial mutation + `ProofLedgerEventType.OPERATOR_PERMISSION_DENIED`/`REMOTE_OPERATOR_AUTH_DENIED` reason-code propagation |
| Connector destinations/auth profiles/route bindings are typed durable resources | Done | `AgentContracts.kt` (`ConnectorDestination`, `ConnectorAuthProfile`, `ConnectorRouteBinding`) + orchestrator persistence/restore wiring |
| Production-capable connector delivery remains adapter-boundary-ready | Done | existing connector transport + routing port path, now enriched with destination/auth-profile/route-binding linkage in routing records/audit |
| Operator identity + connector route + auth profile + delivery result are auditable together | Done | `AgentOrchestrator.kt` (`OperatorConnectorAuditLink`, routing record linkage, receipt/ledger propagation) |
| Governance/internal surfaces expose assignment + connector/auth state | Done | `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`, `.../ExecutionReceiptFormatter.kt`, `.../ui/screens/ActivityScreen.kt` |
| Local-first fallback remains functional | Done | routing fallback target resolution + unavailable/dead-letter durable trails and filters retained |

### Changed files (this pass + M13 hardening closure)
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Runtime highlights
- Collaboration action pipeline now preserves local permission precedence before remote authorization checks.
- Remote authorization denied paths now persist into collaboration state + ledger reason-code trails, so governance case denials stay queryable/readable.
- Connector routing now carries destination/auth-profile/route-binding lineage through alert routing records and operator connector audit links.
- Run-event retention now keeps the latest evidence (`takeLast`) so dead-letter/health reason codes are not dropped under high event volume.

### Tests added/updated
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
  - `updateGovernanceCaseCollaboration_remoteAuthorizationContextMismatch_isDeniedAndAuditable`
  - `updateGovernanceCaseCollaboration_destinationBindingAndAuthProfile_arePersistedInRoutingAndAudit`
  - existing M12 denial/dead-letter scenarios revalidated under M13 changes
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
  - remote directory/authorization/connector audit round-trip compatibility
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
  - searchable/detail coverage for remote auth + destination/auth-profile/audit fields

### Validation commands (M13 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Deferred (explicit)
- Enterprise-grade remote operator directory backend (SSO/SCIM/IdP) remains deferred.
- Live production vendor credential provisioning/rotation flows remain deferred (typed refs are ready).
- Broad SaaS operator console redesign remains out of scope.

### Blockers
- None.

## 24. Role Track M14 - Enterprise Identity, Directory Sync, and Credential Lifecycle Hardening (2026-03-04)
### Status
- Overall: done
- M14A enterprise identity + directory-sync contracts: done
- M14B session/auth provenance hardening: done
- M14C credential lifecycle + route health: done
- M14D governance visibility + tests/docs closure: done

### Scope guardrails
- Additive and backward-compatible changes only.
- Preserve local-first behavior and correct local permission semantics.
- Remote denial/provenance is additive traceability and must not silently overwrite local authorization truth.
- No orchestrator rewrite, no broad storage rewrite, no full SSO/SCIM rollout in this pass.

### Compliance evidence map
| Requirement | Status | Evidence |
|---|---|---|
| Typed enterprise identity + directory sync concepts are durable | Done | `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt` (`EnterpriseDirectorySource`, `DirectorySyncSnapshot`, `RemoteIdentityLink`, related optional fields on receipt/case/session/target records) |
| Session/auth provenance distinguishes local/remote/fallback authority | Done | `AgentContracts.kt` (`SessionAuthContext`, `RemoteAuthorizationProvenance`, `OperatorIdentityProvenance`) + `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt` (`authorizeRemoteOperatorActionLocked`, `buildOperatorSessionSummary`) |
| Credential lifecycle is typed and route-sensitive | Done | `AgentContracts.kt` (`ConnectorCredentialLifecycleState`, `ConnectorCredentialLifecycleSummary`) + `AgentOrchestrator.kt` (`resolveConnectorCredentialLifecycle`, `isCredentialLifecycleBlocking`, routing fallback for blocked lifecycle states) |
| Local-first authorization semantics remain correct when remote auth unavailable | Done | `AgentOrchestrator.kt` local permission gate precedence + remote provenance fallback reason codes; tests in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Governance/receipt surfaces show identity source, auth provenance, credential health | Done | `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`, `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`, `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt` |
| Restore/process-death continuity preserves identity/auth/credential traceability | Done | `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt` (`restore continuity keeps identity auth provenance and credential lifecycle`) |

### M14 changed files (key)
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Validation commands (M14 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Explicit deferred items
- Full enterprise SSO/SCIM/IdP rollout remains out of scope in M14.
- Secret-vault lifecycle automation for live production connector credentials remains deferred (typed lifecycle visibility is now in place).
- Broad operator console redesign remains out of scope.

### Blockers
- None.

## 25. Role Track M14.5 - Repo Noise Reduction and Release Baseline (2026-03-04)
### Status
- Overall: done
- M14.5A inventory and classification: done
- M14.5B ignore and boundary tightening: done
- M14.5C scoped cleanup: done
- M14.5D validation + docs/status closure: done

### Changed files
- `.gitignore`
- `LumiKeyboard-Android/.gitignore`
- `AGENTS.md`
- `docs/repo-noise-inventory.md`
- `docs/release-baseline-checklist.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Noisy path classification snapshot
- Total `git status --short` entries at snapshot: `958`
- Dominant noisy bucket: `LumiKeyboard-Android/app/build` (`602` entries), followed by Android local state and distributed web/API/service/doc WIP entries.
- Classified buckets:
  - Tracked generated/build artifacts (high noise): documented, deferred to dedicated migration (`LOOP-010`).
  - Local runtime/export artifacts: ignored now to reduce day-to-day diff noise.
  - Durable source/docs WIP: intentionally visible, controlled by milestone scope discipline.

### Ignore/boundary updates made
- Root `.gitignore` tightened for local-only artifacts and ad-hoc exports:
  - `artifacts/`
  - `openclaw-relay/`
  - root local export files (`investor_demo.html`, root CV/pitch/pdf exports)
  - binary export files under `docs/` (`*.docx`, `*.pdf`, `*.pptx`, `*.html`)
- `LumiKeyboard-Android/.gitignore` tightened for transient native/build outputs:
  - `**/.cxx/`
  - `**/.externalNativeBuild/`
  - `**/outputs/`
- `AGENTS.md` now includes explicit hygiene-milestone write-boundary guidance.

### Cleanup actions taken
- Added durable inventory and release-baseline checklist docs.
- Reduced untracked noise from local export/runtime artifacts via ignore policy.
- Kept high-risk tracked-artifact index cleanup out of this pass to preserve reviewability.

### Validation commands (M14.5 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Remaining intentionally deferred noise
1. Index-level migration to remove historically tracked Android generated artifacts (`app/build/**`, `.gradle/**`) is deferred to dedicated cleanup loop (`LOOP-010`) due high blast radius.
2. Broad unrelated workstream cleanup across `api/`, `services/`, `components/`, `tests/`, and `docs/` remains out of scope for M14.5.

### Blockers
- None.

## 26. Role Track M15 - Enterprise SSO, SCIM, IdP, and Credential Vault Integration (2026-03-04)
### Status
- Overall: done
- M15A enterprise SSO/IdP provenance: done
- M15B SCIM-like directory sync semantics: done
- M15C vault-backed credential lifecycle integration: done
- M15D visibility/tests/docs closure: done

### Changed files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed model additions / changes
- Added enterprise/identity/session provenance types:
  - `EnterpriseIdentityAssertion`
  - `EnterpriseIdpProvider`
  - `EnterpriseSessionProvenance`
- Added SCIM-like directory sync typed semantics:
  - `DirectorySyncUpdate`
  - `DirectorySyncUpdateType`
  - `DirectorySyncErrorState`
  - `ScimLikeDirectoryRecord`
- Added vault-backed credential typed semantics:
  - `VaultCredentialReference`
  - `VaultCredentialStatus`
  - `VaultCredentialRotationState`
  - `ConnectorCredentialBinding`
  - `CredentialRouteBlockReason`
  - `EnterpriseAuthIntegrationSummary`
- Extended receipt/governance/routing payloads with optional fields for enterprise identity/session/scim/vault summaries and enterprise integration status.

### Runtime behavior additions
- Session/auth provenance now carries typed IdP/session source and enterprise assertion overlays while preserving local-first authorization precedence.
- SCIM-like directory freshness/update/error semantics now persist as typed runtime state and feed governance/receipt summaries.
- Connector route eligibility now reacts to vault + credential lifecycle state with explicit typed route-block reasons and durable fallback behavior.
- Alert routing and receipt generation now include enterprise integration summaries and credential-route block context where applicable.

### Governance/internal visibility changes
- Governance and receipt formatters now expose concise English summaries for:
  - enterprise identity source/assertion
  - session/auth provenance
  - SCIM sync freshness/error state
  - vault credential health and route impact
  - overall enterprise integration status

### Validation commands (M15 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Deferred items (intentional)
1. Full enterprise SSO/SCIM/IdP platform rollout remains out of scope for M15.
2. Full secret-vault backend implementation and live connector credential onboarding remain deferred.
3. Broad operator SaaS console redesign remains out of scope.

### Blockers
- None.

## 21. Role Track M11 - Remote Operator Auth, Assignment, Connector Routing Foundations (2026-03-04)
### Status
- Overall: done
- M11A typed auth/assignment contracts: done
- M11B permission-gated runtime + denial durability: done
- M11C connector routing typed behavior: done
- M11D tests/docs closure: done

### Compliance evidence map
| Requirement | Status | Evidence |
|---|---|---|
| Typed operator identity/role/permission/assignment concepts | Done | `core-domain/.../AgentContracts.kt` (OperatorIdentity/Role/Permission/Assignment contracts) |
| Durable assignment lifecycle (claim/release/assign/reassign/escalate) | Done | `core-agent/.../AgentOrchestrator.kt` (assignment mutation flow + `GovernanceCaseAssignmentEventType` ledger trail) |
| Permission-gated actions with typed denial reasons | Done | `core-agent/.../AgentOrchestrator.kt` (`authorizeOperatorAction`, denial durability + `OPERATOR_PERMISSION_DENIED`) |
| Typed connector routing/delivery attempts for Slack/Jira/Zendesk/CRM/webhook-like destinations | Done | `core-domain/.../AgentContracts.kt`, `core-agent/.../RemotePipelinePorts.kt`, `core-agent/.../AgentOrchestrator.kt` |
| Governance/internal visibility for assignee/escalation/routing/connector state | Done | `app-backend-host/.../GovernanceCaseFormatter.kt`, `.../ActivityScreen.kt`, `.../MainActivity.kt` |
| Compatibility + local-first fallback | Done | Optional/defaulted contract fields + no-op/local/stub ports + restore tests (`DynamicStatePersistenceTest`) |

### M11 changed files (key)
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`

### Validation commands (M11 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Explicit deferred items
- Production Slack/Jira/Zendesk/CRM connectors with real credentials and remote auth.
- Full remote operator directory/SSO/IdP integration.
- Broad operator SaaS console redesign beyond current internal governance surface.

## 22. Role Track M12 - Production Connector Integrations, Remote Alert Destinations, and Operator Collaboration Hardening (2026-03-04)
### Status
- Overall: done
- M12A typed connector delivery layer: done
- M12B runtime connector adapter behavior: done
- M12C collaboration/governance visibility hardening: done
- M12D tests/docs closure: done

### Compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed connector delivery models (request/attempt/status/ack/failure/dead-letter/health) | Done | `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`, `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt` |
| Destination-aware routing with durable/idempotent behavior | Done | `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`, `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`, `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Permission-enforced operator collaboration runtime (not UI-only) | Done | `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`, existing permission-denial tests in `AgentOrchestratorTest.kt` |
| Durable collaboration records for claim/assign/reassign/escalate/note/routing | Done | `AgentOrchestrator.kt` (`assignmentEvents`, `notes`, `routingActions`, run-event append), `AgentOrchestratorTest.kt` |
| Governance visibility for connector health/dead-letter/unavailable + collaboration trails | Done | `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`, `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`, `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`, `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt` |
| Local-first fallback preserved when remote connectors unavailable/failing | Done | `RemotePipelinePorts.kt` transport/adapters + `AgentOrchestratorTest.kt` unavailable/dead-letter scenario |
| Duplicate delivery/callback idempotency | Done | `mergeAlertRoutingRecord` dedupe in `AgentOrchestrator.kt`, `AgentOrchestratorTest.kt` duplicate callback scenario |

### M12 changed files (key)
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### User-visible/runtime highlights
- Connector delivery is now tracked as typed runtime state (request/attempt/ack/failure/dead-letter/health) and folded into governance case summaries.
- Collaboration follow-up/escalation now persists routing actions with connector target/provider context and readable summaries.
- Governance case detail now surfaces:
  - connector health (healthy/degraded/dead-letter/unavailable counts)
  - dead-letter summary
  - latest routing action trail
  - connector issue markers in case row lines
- Connector failures and dead-letter conditions now map into governance alerts and remote-delivery issue summaries.
- Connector failure/dead-letter filters are now usable through `GovernanceConsoleFilter.connectorFailureOnly` and `connectorDeadLetterOnly`.

### Required scenario coverage (M12 dogfood/test map)
| Scenario | Coverage status | Evidence |
|---|---|---|
| Same case routed to different connector targets | Covered | `updateGovernanceCaseCollaboration_routesAcrossConnectorTargets_andPersistsRoutingActions` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Permission-denied operator action is enforced and durable | Covered | `updateGovernanceCaseCollaboration_permissionDenied_recordsDurableTrail` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Duplicate connector callback handling is idempotent | Covered | `updateGovernanceCaseCollaboration_duplicateConnectorCallback_isIdempotent` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Remote connector unavailable with local fallback | Covered | `updateGovernanceCaseCollaboration_unavailableConnectorsFallbackLocal_andDeadLetterAfterRetries` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Escalation causes additional routing trail | Covered | `updateGovernanceCaseCollaboration_reassignReleaseAndEscalation_areDurableAndFilterable` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Dead-letter path durability and filterability | Covered | `updateGovernanceCaseCollaboration_unavailableConnectorsFallbackLocal_andDeadLetterAfterRetries` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |
| Assignment + note + reassign durable trail | Covered | `updateGovernanceCaseCollaboration_assignmentNoteReassignTrail_isDurable` in `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt` |

### Validation commands (M12 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

### Deferred (explicitly out of M12 scope)
- Live credential-backed production SaaS connectors (Slack/Jira/Zendesk/CRM) with real vendor auth and remote secrets.
- Remote multi-operator auth directory / SSO integration.
- Broad operator SaaS console redesign beyond current internal governance surfaces.

### Blockers
- None.

## 27. Role Track M16 - Production Enterprise Rollout Controls, Secret Vault Backend, and Cutover Readiness (2026-03-04)
### Status
- Overall: done
- M16A typed rollout/cutover/vault contracts: done
- M16B runtime routing/degradation integration: done
- M16C formatter/governance visibility: done
- M16D persistence/compatibility/tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/RemotePipelinePorts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### M16 compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed rollout control + cutover readiness concepts | Implemented | `TenantRolloutProfile`, `WorkspaceRolloutProfile`, `ConnectorRolloutPolicy`, `CutoverReadinessSummary`, `FeatureGateDecision` in `AgentContracts.kt` |
| Secret/vault runtime boundary with lease/material/health semantics | Implemented | `VaultRuntimePort` + `NoOp/LocalDurable/Stub` adapters in `RemotePipelinePorts.kt` |
| Runtime route gating/degradation uses rollout/cutover/vault state | Implemented | `credentialRouteBlockReasonFor`, `buildFeatureGateDecision`, `buildCutoverReadinessSummary`, `buildConnectorRoutingSummary` in `AgentOrchestrator.kt` |
| Local-first fallback remains explicit and auditable | Implemented | `EnterpriseFallbackPolicy` and reason codes (`ROLE_ENTERPRISE_FALLBACK_LOCAL_FIRST`) in orchestrator + receipts |
| Governance/receipt surfaces show rollout/cutover/vault summaries | Implemented | `ExecutionReceiptFormatter.kt`, `GovernanceCaseFormatter.kt`, case/receipt summary fields |
| Backward compatibility for mixed history | Implemented | New fields optional/defaulted in contracts; decode path remains null-safe |
| Restore/process-death continuity for M16 traces | Implemented + tested | `DynamicStatePersistenceTest` (`restore continuity keeps m16 rollout cutover vault and fallback traceability`) |

### Validation commands (M16 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items (intentional)
1. Full production secret-vault vendor backend/matrix is still out of scope; M16 keeps typed runtime boundaries and stub/local adapters.
2. Full enterprise-wide SSO/SCIM/IdP rollout across every provider remains deferred.
3. No broad orchestrator or history-storage rewrite in M16.

### Blockers
- None.

## 31. Role Track M21 - Enterprise Workflow Policy Packs, Tenant Overrides, and Advanced Automation Controls (2026-03-05)
### Status
- Overall: done
- M21A typed policy-pack/binding semantics: done
- M21B tenant/workspace override precedence: done
- M21C advanced automation controls (simulation/throttle/cooldown/suppression): done
- M21D visibility/continuity/tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Compliance map
| Requirement | Status | Evidence |
|---|---|---|
| Typed policy pack model + version/binding semantics | Done | `AgentContracts.kt` (`WorkflowPolicyPack*`, `WorkflowPolicyPackBinding`) + runtime resolution in `AgentOrchestrator.kt` |
| Typed tenant/workspace overrides + precedence trace | Done | `AgentContracts.kt` (`TenantWorkflowPolicyOverride`, `WorkspaceWorkflowPolicyOverride`, `WorkflowPolicyResolutionTrace`) + orchestrator resolution |
| Advanced automation controls are runtime-active | Done | `AgentOrchestrator.kt` automation evaluation path (`throttle/cooldown/window/simulationOnly`) |
| Explicit case/task constraints override pack/override defaults | Done | `AgentOrchestrator.kt` resolution precedence emits `ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT` |
| Receipt/governance/operator visibility for pack/override/simulation | Done | `ExecutionReceiptFormatter.kt`, `GovernanceCaseFormatter.kt`, `RoleTraceFormatter.kt` |
| Governance query/filter includes pack/version/override/simulation dimensions | Done | `AgentContracts.kt` (`GovernanceConsoleFilter`) + `AgentOrchestrator.kt` filter handling |
| Restore/process-death continuity for M21 artifacts | Done | `DynamicStatePersistenceTest.kt` M21 continuity test + persisted ledger/collaboration reconstruction |
| Scenario test coverage for precedence/controls/simulation/visibility | Done | `AgentOrchestratorTest.kt`, `ExecutionReceiptFormatterTest.kt`, `GovernanceSummaryFormatterTest.kt`, `RoleTraceFormatterTest.kt` |

### User-visible/runtime changes
- Workflow receipts now explicitly surface:
  - policy pack summary
  - override summary
  - automation control summary
  - precedence summary
  - simulation-only status
- Governance case details now surface the same M21 provenance fields in concise English.
- Governance searchable text now includes M21 pack/override/provenance fields for operator retrieval and triage.

### Tests added/updated
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
  - `updateGovernanceCaseCollaboration_m21PolicyPackOverridesSimulationAndExplicitPrecedence_areDurableAndFilterable`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
  - `restore continuity keeps m21 policy pack override and simulation provenance`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
  - M21 summary/export visibility coverage
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
  - M21 case-line/detail/search visibility coverage
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
  - M21 reason-code readable mapping coverage

### Validation commands (M21 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Deferred items
1. General-purpose workflow/BPM DSL remains out of scope.
2. Broad operator console redesign remains out of scope.
3. Broad history/storage architecture rewrite remains out of scope.

### Blockers
- None.

## 40. Role Track M26 - Enterprise Policy Estate Automation, Scheduled Remediation, and Governance Program Operations (2026-03-05)
### Status
- Overall: done
- M26A typed automation/scheduling contracts: done
- M26B runtime eligibility and scheduling guardrails: done
- M26C scheduled remediation/governance operation behavior: done
- M26D visibility/continuity/tests/docs closure: done

### Changed files
- `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/GovernanceCaseFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `LumiKeyboard-Android/core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `LumiKeyboard-Android/core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatterTest.kt`
- `LumiKeyboard-Android/app-backend-host/src/test/java/com/lumi/keyboard/ui/model/GovernanceSummaryFormatterTest.kt`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

### Typed automation/scheduling additions (M26)
- Added/strengthened typed M26 contract families in domain/runtime payloads:
  - `EstateAutomationRule`
  - `EstateAutomationEligibility` (+ suppression/cooldown/window semantics)
  - `ScheduledRemediationPlan` / `ScheduledRemediationTarget` / `ScheduledRemediationExecution` / `ScheduledRemediationResult`
  - `GovernanceProgramOperation` (+ `GovernanceProgramOperationStatus`)
  - `AutomationReplaySummary`
  - `AutomationCancellationRecord`
- Extended governance filter/query shape for M26 triage dimensions:
  - `automationEligibleOnly`
  - `automationBlockedOnly`
  - `scheduledOnly`
  - `approvalRequiredOnly`
  - `cooldownOnly`
  - `suppressedOnly`
  - `maintenanceWindowOnly`
- Added canonical reason families:
  - `ROLE_ESTATE_AUTOMATION_ELIGIBLE`
  - `ROLE_ESTATE_AUTOMATION_BLOCKED`
  - `ROLE_ESTATE_AUTOMATION_SUPPRESSED`
  - `ROLE_ESTATE_AUTOMATION_COOLDOWN`
  - `ROLE_ESTATE_AUTOMATION_WINDOW_BLOCKED`
  - `ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED`
  - `ROLE_ESTATE_AUTOMATION_SCHEDULED`
  - `ROLE_ESTATE_AUTOMATION_EXECUTED`
  - `ROLE_ESTATE_AUTOMATION_PAUSED`
  - `ROLE_ESTATE_AUTOMATION_RESUMED`
  - `ROLE_ESTATE_AUTOMATION_CANCELLED`

### Runtime behavior changes
- Added durable runtime command handling for:
  - `SCHEDULE_POLICY_ESTATE_REMEDIATION`
  - `PAUSE_POLICY_ESTATE_REMEDIATION`
  - `RESUME_POLICY_ESTATE_REMEDIATION`
  - `CANCEL_POLICY_ESTATE_REMEDIATION`
  - `APPLY_SAFE_POLICY_ESTATE_REMEDIATION`
- Safe automation executes only when runtime eligibility/guardrails allow it.
- Approval-required automation is blocked from auto-apply and remains visible/auditable.
- Suppression/cooldown/maintenance-window states are enforced and reason-coded.
- MainActivity action labeling now includes M26 action entries in governance detail workflows.

### Governance/receipt/timeline visibility changes
- Receipt summaries now expose M26 signals in readable English:
  - estate automation eligibility
  - scheduled remediation status/summary/approval
  - automation replay and cancellation summaries
- Governance case line/detail/search text now exposes M26 triage fields and guardrail state.
- Role reason formatter maps canonical `ROLE_ESTATE_AUTOMATION_*` codes to concise user-readable explanations.

### Persistence and continuity
- M26 fields are optional/defaulted for mixed old/new compatibility.
- Restore/process-death continuity validated for M26 automation scheduling/audit state.
- Historical truth remains append-only and non-retroactive.

### Tests added/updated
- `core-domain/.../DomainContractsTest.kt`
  - `encodeDecode_m26EstateAutomationAndSchedulingRoundTrip`
- `core-agent/.../AgentOrchestratorTest.kt`
  - `updateGovernanceCaseCollaboration_m26EstateAutomationSchedulePauseResumeCancel_areDurableAndFilterable`
- `core-agent/.../DynamicStatePersistenceTest.kt`
  - `restore continuity keeps m26 estate automation scheduling and audit state`
- `app-backend-host/.../RoleTraceFormatterTest.kt`
  - `impactLines_translateM26EstateAutomationReasons`
- `app-backend-host/.../ExecutionReceiptFormatterTest.kt`
  - `summaryLines_andExport_includeM26EstateAutomationSchedulingSignals`
- `app-backend-host/.../GovernanceSummaryFormatterTest.kt`
  - M26 governance case summary/detail/search coverage for scheduled remediation and automation guardrail fields

### Validation commands (M26 pass)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

### Open loops / decision log updates (M26)
- Open loops:
  - No new unresolved blocker loop opened from M26 implementation.
  - Existing deferred loops remain unchanged (no expansion of destructive automation, BPM/DSL, or broad console redesign).
- Decision log:
  - M26 runtime decisions recorded as typed behavior:
    - automation guardrails are enforced in runtime (not formatter-only)
    - approval-required remediation remains blocked from auto-apply
    - suppression/cooldown/window semantics are first-class typed gating paths
    - visibility derives from durable runtime truth

### Deferred items (exact)
1. No general-purpose BPM/workflow DSL.
2. No destructive automation operations.
3. No orchestrator rewrite.
4. No broad operator console redesign.
5. No broad storage/history rewrite.

### Blockers
- None.

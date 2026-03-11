# Enterprise Productization Foundation Spec

Date: 2026-03-09
Owner: Codex
Status: Sellable Standard support track (Steps 1-3) with bounded Enterprise Sandbox / Trial Workspace / Persistence-Activated productization

## Sellable Standard Mapping (2026-03-08)
- Governing roadmap:
  - `docs/Pilot/Sellable_Standard_Roadmap_v1.md`
- Near-term external product definition:
  - `Enterprise Execution Governance Platform`
- This foundation track now supports only sellable-standard `Steps 1-3`; it is not an open-ended parallel expansion track.
- Step mapping:
  - `Step 1 — Pilot Activation Closure` -> `EPF-2/3/4/5`
  - `Step 2 — Live Evidence Closure` -> external request pack, Pilot Activation War Room, and launch evidence / feedback / incident / closure logs
  - `Step 3 — Enterprise Shell Consolidation` -> `EPF-6` through `EPF-19`
- Current active step:
  - `Step 1 — Pilot Activation Closure`
  - missing real pilot environment binding, operator access, requester, and tenant-admin/support touchpoint keep the first real artifact blocked
- `Step 2` remains blocked until the first verified and promoted `REAL_PILOT` artifact exists.
- `Step 3` shell expansion is paused unless it directly improves Step 1 activation or already-built Step 3 clarity.
- Launch `14.x` continuation stays frozen unless real pilot evidence changes the facts.
- Preserve backward compatibility and current trust / safety semantics.

## Objective
Build the minimum B2B productization layer around the existing Agent OS so the product becomes enterprise-demoable and enterprise-pilot-preparable without pretending that simulator or local-only paths are real pilot activation.

## Scope lock
- Preserve the current runtime, ledger, governance, rollout, policy, and cross-boundary controls.
- No orchestrator rewrite.
- No ledger/history rewrite.
- No BPM/DSL.
- No destructive automation.
- No broad UI redesign.
- No new tenant / connector / workflow-family / deployment-mode expansion.

## Productization requirements
- Explicit environment/activation truth in-product.
- Requester Inbox / Execution Inbox shell.
- Tenant Admin Setup / Activation shell.
- Policy Studio v1 summary shell.
- Explicit demo workspace and seeded demo data, always marked non-pilot.
- Operator Console remains available but is positioned as an internal role shell, not the whole product.

## EPF-3 activation-truth requirements
- Real pilot environment binding must be a typed durable state.
- Requester / operator / tenant-admin provisioning and access must be typed durable state.
- Connector activation eligibility must be a typed durable state.
- Activation-ready must be a runtime decision derived from:
  - real environment binding
  - real actor provisioning/access
  - identity readiness
  - connector readiness
  - vault readiness
  - connector activation eligibility

## EPF-4 external package requirements
- External pilot activation handoff must be a typed durable package state.
- External artifacts must be receivable, verifiable, rejectable, and promotable through typed runtime behavior.
- Verified real external artifacts must be promotable into:
  - pilot environment binding
  - actor readiness
  - connector activation eligibility
  - real evidence categories
- Product-shell and governance surfaces must show package owner, status, recent intake outcomes, and next action.

## EPF-6 local role lab requirements
- The product must support a clearly labeled local multi-actor rehearsal mode for one-machine use.
- The local role lab must support requester, operator, and tenant-admin role views.
- Local role lab artifacts must always remain non-pilot and non-promotable as `REAL_PILOT` evidence.
- Role switching must be visible in product shell surfaces, not hidden in docs only.

## EPF-7 local role lab visualization requirements
- `LOCAL_ROLE_LAB` must be unmistakable in the main product shell.
- Active role, scenario, handoff/timeline, non-pilot evidence classification, and pilot activation gap must all be visible in-product.
- Android and web must carry the same meaning for local rehearsal state.

## EPF-8 standalone platform frontend requirements
- The web surface must be able to present as a workspace-level enterprise platform, not only as a phone-style app shell.
- Platform view must be workspace-first and role-readable.
- Platform view must reuse existing activation/product-shell truth rather than inventing a parallel backend.

## EPF-9 primary enterprise shell requirements
- The enterprise web platform must be the default primary web shell.
- Phone-style app preview must not be the default enterprise-facing entry.
- Enterprise users should land in a workspace-first console by default.

## EPF-10 role-based enterprise console requirements
- The enterprise web platform must support dedicated requester, operator, tenant-admin, and shared workspace pages.
- These pages must be directly openable as separate URLs or tabs.
- Role pages must stay on the same product-shell truth rather than forking into separate mock applications.
- The platform must make cross-role workflow understandable by combining:
  - seat-aware page entry
  - role-aware navigation
  - explicit handoff visibility
- Role pages improve enterprise usability and storytelling, but do not convert local-lab artifacts into real pilot evidence.

## EPF-11 enterprise account and members requirements
- The enterprise web platform must expose a visible account shell for the signed-in workspace participant.
- The platform must expose a dedicated Members & Access page so enterprise users can see who participates in the workspace and what access state they hold.
- These surfaces must be derived from the same product-shell truth and remain non-pilot when the workspace is `LOCAL_ROLE_LAB`.

## EPF-12 role workboard requirements
- Requester, operator, and tenant-admin pages must each expose a focused workboard, not just generic shared cards.
- Role workboards must stay on top of the same product-shell truth and must not invent a second execution model.
- Role workboards improve enterprise usability and storytelling, but do not change pilot-evidence rules.

## EPF-13 collaboration and access-posture requirements
- The shared workspace page must expose a cross-role collaboration map.
- The tenant-admin page must expose identity and access posture explicitly.
- These views must be derived from the same product-shell truth and remain non-pilot in `LOCAL_ROLE_LAB`.

## EPF-14 sign-in shell and access-matrix requirements
- The tenant-admin page must expose an enterprise sign-in shell.
- The Members & Access page must expose a role/access matrix.
- These views must stay on top of the same product-shell truth and remain non-pilot in `LOCAL_ROLE_LAB`.

## EPF-15 organization/workspace requirements
- The platform must expose an Organization & Workspace page.
- The page must show organization/workspace/environment/activation facts as part of the same enterprise shell.
- This remains derived from the same product-shell truth and stays non-pilot in `LOCAL_ROLE_LAB`.

## EPF-16 collaboration board requirements
- The shared workspace page must expose a cross-role workflow board with requester, operator, and tenant-admin lanes.
- The board must be derived from the same product-shell truth and remain non-pilot in `LOCAL_ROLE_LAB`.

## EPF-17 login entry and directory requirements
- The organization/workspace management surface must expose an enterprise login entry panel.
- The platform must expose a workspace directory with direct links into role-specific pages.
- These views must be derived from the same product-shell truth and remain non-pilot in `LOCAL_ROLE_LAB`.

## EPF-18 seat assignment and admin action requirements
- The organization/workspace management surface must expose seat assignment visibility.
- The tenant-admin surface must expose an admin action center.
- These views must be derived from the same product-shell truth and remain non-pilot in `LOCAL_ROLE_LAB`.

## EPF-19 seat-detail and management-drilldown requirements
- The enterprise platform must support a shareable focused-seat/member drill-down state.
- Organization, members, and seat-assignment surfaces must be able to open that focused seat state directly.
- The focused seat state must show role, access/provisioning posture, work context, handoffs/dependencies, and evidence-boundary messaging.
- `LOCAL_ROLE_LAB` inspection must remain rehearsal-only and must not promote any artifact into `REAL_PILOT` evidence.

## EPF-20 local-lab task continuity requirements
- The enterprise platform must allow requester-side local-lab task submission from a real rehearsal brief.
- Local-lab tasks must survive browser reloads and be visible across role pages in the same workspace origin.
- Local-lab tasks must update requester inbox, scenario summary, handoff/timeline, and seat detail surfaces.
- This continuity must be explicitly rehearsal-only and must not depend on promoting serverless preview artifacts into `REAL_PILOT` truth.

## Enterprise Sandbox productization requirements (2026-03-09)
- `LOCAL_ROLE_LAB` must be productized as an Enterprise Sandbox, not only a role-switching lab.
- The sandbox must expose a clear landing/home surface with:
  - scenario templates
  - guided walkthrough
  - role summaries
  - rehearsal outcome summary
  - demo-to-pilot gap explanation
- At least three sandbox scenarios must be available and runnable:
  - Advisor Client Intake → Compliance Review → CRM Handoff
  - Cross-Boundary Export Review
  - Exception / Dispute / Remediation Handling
- Sandbox activity must remain explicitly non-pilot and non-promotable as `REAL_PILOT` evidence.
- The active delivery surface for this pass is the B-end enterprise web platform.
- Android / C-end app surfaces remain a separate product form and are not expanded in this pass.

## EPF-9 shared trial workspace requirements (2026-03-09)
- The enterprise sandbox must expose a typed trial workspace model:
  - workspace
  - participants
  - role seats
  - trial sessions
  - trial task detail
- Trial workspace state must persist durably for sandbox evaluation and survive browser refresh.
- The platform must support bounded multi-session rehearsal semantics.
- Trial task detail must go deeper than summary cards:
  - lifecycle
  - receipt summary
  - approval / handoff visibility
  - missing fields
- Trial activity must remain clearly non-pilot and never count as `REAL_PILOT` evidence.
- Trial-to-pilot conversion guidance must be visible and actionable in-product.

## EPF-10 server-backed trial coordination requirements (2026-03-09)
- The B-end platform must expose a server-side trial workspace service and APIs.
- Product-shell summary must surface trial workspace truth in `local_lab` mode.
- The platform must expose explicit `TrialPersistenceState` so deployment/config gaps are visible.
- If persistent backend env is missing, the product must report `MEMORY_ONLY` honestly instead of implying real shared durability.

## EPF-11 shared trial join and claim requirements (2026-03-09)
- The B-end platform must support invite acceptance into the shared trial workspace.
- Participants must be able to claim and release role seats.
- Seat claim state must be visible in-product.
- Persistence truth must remain explicit and accurate during these join/claim flows.
- Trial join/claim activity must remain non-pilot and never count as `REAL_PILOT` evidence.

## EPF-12 trial persistence activation requirements (2026-03-09)
- One real persistence backend path must be activated for the deployed B-end platform.
- The platform must visibly move from `MEMORY_ONLY` to `SERVER_BACKED` when the config is valid.
- Invite/join/claim/release/task continuity must be validated against the real deployed backend path.
- Trial activity must remain non-pilot even after persistence is activated.

## EPF-21 shared trial join/task-detail requirements (2026-03-09)
- The B-end platform must expose an explicit invite-code join surface inside the enterprise sandbox.
- Shared trial task focus must be deep-linkable by URL so multiple evaluators can open the same task context across requester/operator/tenant-admin pages.
- Trial task detail must show:
  - lifecycle
  - receipt summary
  - missing fields
  - handoff / next-action lines
  - approval boundary summary
- These surfaces must remain explicitly non-pilot and must not promote sandbox/trial activity into `REAL_PILOT` evidence.

## EPF-22 trial timeline/approval/share-link requirements (2026-03-09)
- Trial task detail must surface next action and approval posture in readable enterprise language.
- Trial task detail must surface a timeline using durable shared trial activity when available and a clear fallback when not.
- Open invites must expose shareable claim links so another evaluator can enter the same trial workspace path without manual reconstruction.
- These additions remain trial-only and must not alter real pilot activation semantics.

## EPF-23 invite-claim landing and trial decision-history requirements (2026-03-09)
- The enterprise platform must expose a dedicated join landing section inside the shared workspace shell.
- Invite claim links should land directly on that join section.
- Trial task detail should expose clearer workflow decision history using shared activity records when available.
- These additions remain trial-only and must not alter real pilot activation semantics.

## EPF-24 standalone trial join route requirements (2026-03-09)
- The B-end platform must expose a true standalone join route for sandbox invite claim.
- Invite links should be able to land on that standalone route directly.
- The standalone route must preserve shared trial truth, persistence visibility, and strict non-pilot labeling.

## EPF-25 enterprise OA role model and module productization requirements (2026-03-09)
- The B-end platform must expose the frozen OA v1 role set, not only Requester / Operator / Tenant Admin.
- The primary navigation must become module-first across:
  - Request Center
  - Approval Center
  - Operations Console
  - Policy & Governance Center
  - Integration & Readiness Center
  - Audit & Reporting Center
- The OA v1 role set must be visible in-product through role switching, role-charter visibility, and expanded trial seats.
- Shared trial workspace seats and invite semantics must support the OA v1 role set while staying strictly non-pilot.

## EPF-26 enterprise account/membership/OA-permission requirements (2026-03-09)
- The B-end platform must expose current signed-in enterprise session, principal, active bindings, and module access.
- The platform must expose enterprise members, role assignments, and bounded member-management actions.
- OA roles must affect module access state in-product.
- Trial participants and enterprise members must remain clearly separated and non-pilot labeling must not regress.

## 2026-03-10 B-end follow-through requirements
- The B-end platform should expose enterprise auth and persistence diagnostics in-product:
  - provider
  - binding count
  - group-role mapping summary
  - store driver
  - production write persistence readiness
  - session expiry visibility
- The three enterprise centers should support:
  - search
  - status/type filtering where applicable
  - grouped source visibility
  - item detail expansion
  - bulk actions for approval/review where safe
- The repo should include operator/support/commercial packaging docs for the B-end platform so the product is not only technically demoable but operationally and commercially legible.

## Activation dependency state model
- `PILOT_ACTIVATION_IN_PROGRESS`
- `PILOT_ACCESS_PARTIALLY_AVAILABLE`
- `PILOT_ACTIVATION_DELAYED`
- `PILOT_NOT_STARTED`
- `REAL_EVIDENCE_RECOVERED`

Current expected wording while the 48-hour artifact chase is open:
- use `PILOT_ACTIVATION_IN_PROGRESS`
- treat true pilot Day 0 as not started until the first real task/session/run artifact exists
- do not use generic hypercare `HOLD` wording as the primary state label

## In-product truth that must be visible
- simulator / demo / pilot / production environment state
- workspace binding state
- pilot activation status
- missing dependency state
- actor availability for requester / operator / tenant-admin
- identity readiness
- connector readiness
- vault / credential readiness
- explicit `not ready for pilot` state when real pilot activation is missing

## Demo rules
- Demo mode is entered through an explicit workspace selector.
- Demo data must never be marked as pilot evidence.
- Demo scenarios must stay inside the frozen advisor workflow family.

## Launch-doc freeze rule
- Launch 14.x docs are frozen unless real live pilot evidence appears.
- Missing pilot activation dependencies are external blockers, not product progress.
- Foundation work continues only where it directly advances sellable-standard Steps `1-3`.

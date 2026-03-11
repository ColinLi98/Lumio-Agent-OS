# Enterprise Productization Foundation Plan

Date: 2026-03-09
Owner: Codex
Execution mode: additive productization over the current Agent OS core in support of Sellable Standard Steps 1-3

## Sellable Standard Execution Frame (2026-03-08)
- Governing roadmap:
  - `docs/Pilot/Sellable_Standard_Roadmap_v1.md`
- Near-term external product definition:
  - `Enterprise Execution Governance Platform`
- This plan is no longer an open-ended foundation-expansion queue.
- Step mapping:
  - `Step 1 — Pilot Activation Closure` -> `EPF-2/3/4/5`
  - `Step 2 — Live Evidence Closure` -> external request pack, Pilot Activation War Room, and launch evidence / feedback / incident / closure logs
  - `Step 3 — Enterprise Shell Consolidation` -> `EPF-6` through `EPF-19`
- Current active step:
  - `Step 1 — Pilot Activation Closure`
  - missing environment / operator / requester / tenant-admin artifacts keep the first live run blocked
- `Step 2` is blocked until the first verified and promoted `REAL_PILOT` artifact exists.
- `Step 3` remains bounded, but sandbox productization work is allowed when it materially improves enterprise-shell clarity and product usability without pretending to be real pilot progress.
- Launch `14.x` continuation stays frozen unless real pilot evidence changes the facts.

## Current Bounded Slice (Active)
- No new feature work.
- Run the existing external pilot activation request pack and Pilot Activation War Room as the only active slice.
- Accept only real artifacts through the existing EPF-4 intake / review / promotion path.
- If artifacts `A-D` remain missing on `2026-03-10`, reclassify to `PILOT_ACTIVATION_DELAYED`.
- If artifact `E` remains missing on `2026-03-11`, reclassify to `PILOT_NOT_STARTED`.
- Introduce no new primitive unless a real artifact exposes a strict representation gap.

## Paused / Deprioritized Until Step 1 Resolves
- Shell / page / panel expansion beyond the bounded Enterprise Sandbox productization pass.
- Launch `14.x` HOLD / hypercare continuation without changed real facts.
- Provider / connector breadth expansion, including `LOOP-012` and `LOOP-021`.
- Speculative consumer-shell, agent-workforce, governance-primitive, BPM / DSL, and destructive-automation expansion.

The scope and slices below record already-built support work for sellable-standard Steps `1-3`. They are not the current expansion queue while Step 1 remains unresolved.

## Scope
1. Freeze Launch 14.x document expansion unless real pilot evidence appears.
2. Add activation/environment truth to the core.
3. Add product-shell APIs for environment, requester inbox, policy studio, and aggregate shell summary.
4. Add web enterprise shell surfaces against agent-kernel truth.
5. Add explicit demo workspace and seeded demo data.
6. Keep Android/C-end surfaces out of the active B-end platform delivery path unless explicitly reopened.

## Implementation slices
### Slice A. Core truth and APIs
- `services/agent-kernel/*`
- `api/agent-kernel/*`

### Slice B. Web shell
- `components/*`
- `services/agentKernelShellApi.ts`
- `services/localRoleLabTaskStore.ts`

### Slice C. Validation and status
- targeted TS/web tests
- synced spec / plan / status docs

## Validation
- `npm run -s typecheck`
- targeted `vitest` for agent-kernel APIs/runtime/store and enterprise shell helpers
- no Android gate is required for this B-end web platform slice unless Android is explicitly reopened

## EPF-3 slice
- add durable pilot environment binding records
- add durable actor provisioning/access records
- add durable connector activation eligibility records
- add runtime activation-ready decision
- extend tenant-admin / governance visibility to show activation-ready state and blocker reasons

## EPF-4 slice
- add durable activation package and external artifact intake records
- add package handoff, artifact intake, and artifact review/promotion actions
- promote verified real external artifacts into activation truth and real evidence categories
- expose package / intake / verification progress in web enterprise shell surfaces

## EPF-5 slice
- execute real pilot activation through the existing EPF-4 package/intake/review/promotion path
- promote only true `REAL_PILOT` artifacts
- if no real artifact exists, narrow the blocker set to exact missing external environment/auth/actor artifacts

## Operational dependency pack
- create and maintain one external pilot activation request pack
- enumerate exact required artifacts, owners, due dates, and acceptance rules
- keep launch evidence / feedback / incident / closure docs aligned to the explicit activation state model

## 48-hour activation execution frame
- use `docs/Pilot_Activation_War_Room_Execution_Checklist.md` as the current execution frame
- track artifacts A-F only
- mark `PILOT_ACTIVATION_DELAYED` on `2026-03-10` if A-D remain missing
- mark `PILOT_NOT_STARTED` on `2026-03-11` if Artifact E remains missing

## EPF-6 slice
- add explicit `LOCAL_ROLE_LAB` workspace mode
- add local requester/operator/tenant-admin actor summaries and role switching
- add role-segmented local rehearsal inbox visibility
- keep local lab explicitly blocked from real pilot evidence promotion

## EPF-7 slice
- strengthen local-lab shell header and rehearsal-only language
- surface active role, scenario, handoff/timeline, non-pilot evidence classification, and pilot activation gap cards
- keep the enterprise web platform authoritative for local-lab meaning in this pass

## EPF-8 slice
- add a standalone web enterprise platform view
- separate platform mode from the phone-style app shell
- present workspace, role seats, inbox, admin, policy, and activation summaries as a B2B platform

## Historical EPF-9 slice
- made enterprise platform the default web entry
- demoted phone-style app shell to compatibility access path
- strengthened the platform header and workspace-console framing

## EPF-10 slice
- add role-based workspace pages for requester, operator, tenant-admin, and shared workspace views
- make role pages shareable by URL so multiple tabs can represent multiple employee roles
- make seat-to-page transitions explicit in the web shell
- keep all role pages on the same product-shell truth and preserve the non-pilot evidence boundary

## EPF-11 slice
- add an enterprise account shell to the web platform header
- add a Members & Access workspace page
- make workspace participation and access posture clearer for enterprise users

## EPF-12 slice
- add role-specific workboards for requester/operator/tenant-admin
- strengthen page-level work context inside the enterprise platform
- keep the same product-shell truth and non-pilot boundary

## EPF-13 slice
- add a collaboration map to the shared workspace page
- add identity/access posture visibility to the tenant-admin page
- keep the same product-shell truth and non-pilot boundary

## EPF-14 slice
- add an enterprise sign-in shell to the tenant-admin page
- add an access matrix to the Members & Access page
- keep the same product-shell truth and non-pilot boundary

## EPF-15 slice
- add an Organization & Workspace page
- expose organization/workspace facts and management posture
- keep the same product-shell truth and non-pilot boundary

## EPF-16 slice
- add a cross-role workflow board to the shared workspace page
- make requester/operator/tenant-admin participation visible side by side
- keep the same product-shell truth and non-pilot boundary

## EPF-17 slice
- add an enterprise login entry panel
- add a workspace directory with direct role-page links
- keep the same product-shell truth and non-pilot boundary

## EPF-18 slice
- add a workspace seat assignment panel
- add an admin action center panel
- keep the same product-shell truth and non-pilot boundary

## EPF-19 slice
- add shareable member/seat drill-down state to the enterprise platform URL model
- add a focused seat detail panel that explains role, access, work, handoffs, and evidence boundary for one workspace participant
- let members/directory/seat-assignment surfaces link into that detail state without pretending it is real pilot evidence

## EPF-20 slice
- add browser-durable local-lab task persistence for the enterprise web platform
- add requester-side local-lab task submission from a pasted brief
- merge local-lab tasks into requester inbox, scenario, timeline, and seat detail views
- keep local-lab task continuity explicitly non-pilot and non-promotable

## Enterprise Sandbox productization slice
- turn `LOCAL_ROLE_LAB` into a clear enterprise-facing sandbox instead of a generic lab/debug surface
- add a sandbox landing/home surface
- add three runnable scenario templates
- add lightweight guided walkthrough and readable rehearsal outcome summary
- make the demo-to-pilot gap explicit in-product
- keep sandbox activity visibly non-pilot on the enterprise web platform

## EPF-9 shared trial workspace slice
- add typed trial workspace / participant / role-seat / session / trial-task concepts
- persist a shared trial workspace state for B-end sandbox evaluation
- support bounded multi-session semantics inside the enterprise platform
- deepen task-detail / receipt / approval / handoff visibility for sandbox tasks
- add explicit trial-to-pilot conversion guidance while preserving the non-pilot boundary

## EPF-10 server-backed trial coordination slice
- add a bounded server-side trial workspace service and APIs
- expose trial workspace truth through product-shell summary
- prefer server-backed trial summary in the web platform while keeping browser fallback as compatibility behavior
- make persistence mode explicit and surface deployment/config blockers instead of hiding them

## EPF-11 shared trial join / claim slice
- add invite acceptance flow
- add seat claim / release semantics
- make seat claim state visible in-product
- keep persistence truth explicit while join/claim flows execute
- preserve strict non-pilot labeling and conversion guidance

## EPF-12 trial persistence activation slice
- activate one real deployment persistence path for the B-end platform
- validate `SERVER_BACKED` state on the live Preview deployment
- validate invite / join / claim / release / task continuity against the real backend
- keep sandbox/trial activity explicitly non-pilot

## EPF-21 shared trial join/task-detail slice
- add explicit invite-code join input inside the enterprise sandbox
- make shared trial task focus deep-linkable with URL state
- connect requester inbox items to shared trial task drill-down
- deepen visible task detail with lifecycle, receipt, missing fields, handoff, and approval summary
- keep all new surfaces explicitly non-pilot and trial-only

## EPF-22 trial timeline/approval/share-link slice
- add richer trial task timeline visibility using shared activity where available
- add readable approval detail and next-action guidance
- add shareable invite-claim links for open invites
- keep all additions on the same shared trial truth and within the strict non-pilot boundary

## EPF-23 invite-claim landing and decision-history slice
- add a dedicated trial join landing section inside the enterprise workspace
- land shareable invite links directly on the join section
- extend trial decision history using shared activity records created by server-backed trial actions
- preserve strict non-pilot labeling and shared trial truth

## EPF-24 standalone trial join route slice
- add a standalone `trial-join` route in the web platform
- render a dedicated join page for invite claim instead of only relying on an in-shell section
- keep persistence truth and non-pilot labeling explicit on that route

## EPF-25 enterprise OA role model and module slice
- freeze the OA v1 role set in the product shell
- make navigation module-first across six OA centers
- add visible role switching and role-charter summaries for the OA v1 roles
- expand the shared trial workspace to 9 seats and allow invites for all v1 OA roles
- keep all OA trial activity explicitly non-pilot

## EPF-26 enterprise account/membership/OA-permission slice
- surface enterprise account and membership truth on top of existing principal/binding/session records
- add enterprise account/member/role-management APIs
- enforce OA role-based module access states in-product
- add bounded in-product member-management actions for enterprise admins

## 2026-03-10 B-end follow-through slice
- add enterprise auth/persistence diagnostics to the B-end platform
- deepen Approval / Review / Audit center UX with search/filter/grouping/detail/bulk interaction
- add production persistence and Okta auth validation checklists
- add admin/reviewer/audit onboarding and troubleshooting docs
- add buyer-facing B-end platform commercial package material

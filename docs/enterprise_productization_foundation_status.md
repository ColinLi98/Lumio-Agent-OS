# Enterprise Productization Foundation Status

Date: 2026-03-09
Owner: Codex
Status: Sellable Standard Step 1 active; bounded Enterprise Sandbox / Trial Workspace / Persistence-Activated productization implemented

## Sellable Standard Mapping (2026-03-08)
- Governing roadmap:
  - `docs/Pilot/Sellable_Standard_Roadmap_v1.md`
- Near-term external product definition:
  - `Enterprise Execution Governance Platform`
- Current active step:
  - `Step 1 — Pilot Activation Closure`
  - missing real pilot environment binding, operator access, requester, and tenant-admin/support touchpoint keep the first real task/session/run artifact blocked
- `Step 2` is blocked until the first verified and promoted `REAL_PILOT` artifact exists.
- `Step 3` remains bounded; `EPF-6` through `EPF-20` plus the shared trial workspace, server-backed coordination, join/claim, and persistence-activation passes are supporting work already built ahead of the gate.
- Historical EPF outputs below are retained as implementation history, not an active expansion queue.

## Step Mapping Summary
| Sellable Standard Step | Mapped EPF work | Current status | Blocking condition |
|---|---|---|---|
| `Step 1 — Pilot Activation Closure` | `EPF-2/3/4/5` | Active | Artifacts `A-D` missing; artifact `E` blocked; artifact `F` conditional |
| `Step 2 — Live Evidence Closure` | External request pack, Pilot Activation War Room, and launch evidence / feedback / incident / closure docs | Blocked | No first promoted `REAL_PILOT` task/session/run artifact exists yet |
| `Step 3 — Enterprise Shell Consolidation` | `EPF-6` through `EPF-20` plus Enterprise Sandbox / Shared Trial Workspace / Persistence-Activated productization | Partial, bounded continuation implemented | Cannot close or keep expanding beyond sandbox/trial workspace productization while Step 1 remains unresolved |

## Paused / Deprioritized Until Sellable Standard
- Launch `14.x` HOLD / hypercare continuation without changed real facts.
- Shell / page / panel / drilldown expansion beyond the bounded Enterprise Sandbox pass.
- `LOOP-012` connector credential/provider breadth and `LOOP-021` provider-matrix rollout.
- `LOOP-001`, `LOOP-003`, `LOOP-004`, and `LOOP-005` beyond regression / safety maintenance for the frozen pilot path.
- Speculative consumer-shell, agent-workforce, governance-primitive, BPM / DSL, destructive-automation, and broad provider / connector expansion work.

## Completed in this slice
Historical EPF output summary below retains what has already been built. It does not mean sellable-standard Step 3 is closed.

- Launch 14.x document expansion frozen pending real pilot evidence.
- Additive activation/environment truth added to the agent-kernel.
- Additive product-shell APIs added.
- Web shell now shows:
  - environment truth banner
  - workspace mode selector
  - requester inbox panel
  - tenant-admin setup panel
  - policy studio panel
- Demo workspace path now exists and is explicitly marked non-pilot.
- EPF-2 now adds:
  - typed durable pilot activation records
  - bounded activation actions
  - activation checklist / blocker / evidence category / next-action visibility
- EPF-3 now adds:
  - typed durable pilot environment binding state
  - typed actor provisioning/access state
  - typed connector activation eligibility state
  - runtime activation-ready decision
  - shell/governance visibility for activation-ready status and blocker reasons
- EPF-4 now adds:
  - typed durable activation package and external artifact intake state
  - package handoff and artifact receive / verify / reject / promote actions
  - runtime promotion from verified real external artifacts into activation truth and real evidence categories
  - package/intake verification progress visibility in the enterprise shell
- EPF-5 execution result:
  - no real pilot artifacts were available in this workspace
  - blocker state narrowed to simulator-only Vercel project binding plus absent pilot env/auth/actor artifacts
  - no synthetic artifact was promoted
- operational activation dependency handling now adds:
  - an explicit external pilot activation request pack
  - append-only launch evidence / feedback / incident / closure artifacts in the root docs surface
  - explicit launch-state wording based on activation feasibility rather than generic hold language
  - a 48-hour Pilot Activation War Room execution frame for artifacts A-F
- EPF-6 now adds:
  - explicit `local_lab` workspace mode
  - local requester/operator/tenant-admin actor summaries
  - role-segmented local rehearsal inbox views
  - explicit non-pilot local role lab labeling across web shell surfaces
- EPF-7 now adds:
  - persistent local-lab rehearsal header language
  - always-visible active role seat
  - scenario, handoff/timeline, non-pilot evidence, and pilot-gap cards
  - web-first local-lab visualization
- EPF-8 now adds:
  - a standalone web enterprise platform frontend
  - a top-level platform mode separate from the app shell
  - workspace-first B2B presentation using the existing product-shell truth
- EPF-9 now adds:
  - enterprise platform as the default web entry
  - phone-style app shell as URL-only compatibility access path
  - stronger workspace-console framing for enterprise users
- EPF-10 now adds:
  - explicit role-based enterprise pages for workspace, requester, operator, and tenant-admin views
  - shareable URL state for page/workspace/seat context
  - seat cards and role-page controls that open dedicated views in new tabs
  - role-aware section navigation so each employee-facing page reads like part of the same enterprise product instead of one giant mixed console
- EPF-11 now adds:
  - a visible enterprise account shell in the web platform header
  - a dedicated Members & Access page
  - clearer workspace participation and access posture for requester/operator/tenant-admin seats
- EPF-12 now adds:
  - role-specific workboards for requester/operator/tenant-admin pages
  - stronger page-by-page work context inside the same enterprise platform
- EPF-13 now adds:
  - a collaboration map on the shared workspace page
  - an identity/access posture panel on the tenant-admin page
- EPF-14 now adds:
  - an enterprise sign-in shell on the tenant-admin page
  - an access matrix on the Members & Access page
- EPF-15 now adds:
  - an Organization & Workspace page
  - explicit organization/workspace management facts in the web platform
- EPF-16 now adds:
  - a cross-role workflow board on the workspace page
  - explicit requester/operator/tenant-admin lanes so enterprise collaboration is readable at a glance
- EPF-17 now adds:
  - an enterprise login entry panel
  - a workspace directory with direct role-page links
- EPF-18 now adds:
  - a workspace seat assignment panel
  - an admin action center panel
- EPF-19 now adds:
  - shareable member/seat drill-down state in the platform URL
  - a focused seat detail panel with role/access/work/handoff/evidence-boundary context
  - direct `Inspect seat` links from organization, members, and seat-assignment surfaces
- EPF-20 now adds:
  - browser-durable local-lab task persistence
  - requester-side local-lab task submission from a pasted brief
  - local-lab task merging into requester inbox, scenario, handoff/timeline, and seat detail views
- Enterprise Sandbox productization now adds:
  - a clear sandbox landing/home surface
  - three runnable scenario templates
  - guided walkthrough and rehearsal outcome summary
  - explicit demo-to-pilot gap messaging
  - clear B-end enterprise sandbox meaning on web
- Shared trial workspace now adds:
  - typed trial workspace / participant / role-seat / session / trial-task concepts
  - durable trial workspace state inside the B-end platform
  - bounded multi-session rehearsal semantics
  - deeper task-detail / receipt / approval / handoff visibility
  - trial-to-pilot conversion guidance
- Server-backed trial coordination now adds:
  - dedicated server-side trial workspace service and APIs
  - trial workspace summary inside product-shell truth
  - explicit `MEMORY_ONLY` vs `SERVER_BACKED` persistence signaling
  - visible deployment/config blocker messaging when persistent store env is absent
- Shared trial join / claim now adds:
  - invite acceptance
  - seat claim / release
  - explicit seat claim status in-product
  - join instructions and persistence truth during claim flows
- Trial persistence activation now adds:
  - one real Preview Postgres-backed deployment path
  - live `SERVER_BACKED` persistence state
  - verified invite / join / claim / release / task continuity against the deployed backend
- Shared trial join/task-detail UX now adds:
  - invite-code join input in the enterprise sandbox
  - URL-deep-linkable trial task focus
  - requester inbox to trial-task drill-down wiring
  - richer receipt / missing-field / handoff / approval visibility inside a dedicated task detail panel
- Trial detail/approval/share-link UX now adds:
  - richer trial task timeline visibility
  - readable approval posture and next-action guidance
  - shareable invite-claim links for open invites
- Invite-claim landing and decision-history UX now adds:
  - dedicated `Trial Join` section
  - join links that land directly on that section
  - task-creation activity records that improve visible timeline/history
- Standalone trial join now adds:
  - a dedicated `surface=trial-join` route
  - a standalone invite-claim page
  - direct invite links into that route
  - accepted-seat next-step links into the correct role page
- Enterprise OA v1 now adds:
  - a frozen 9-role OA set
  - module-first OA navigation
  - role switching and role-charter visibility
  - 9 shared-trial seats and invite support for all OA v1 roles
- Enterprise account/membership closure now adds:
  - enterprise account summary from real session/binding state
  - enterprise members and role assignments in-product
  - bounded member-management actions
  - OA module access states derived from assigned roles
- 2026-03-10 follow-through now adds:
  - auth and persistence diagnostics in the B-end platform
  - deeper Approval / Review / Audit center interaction with search/filter/grouping/detail/bulk handling
  - explicit production persistence checklist and Okta auth checklist docs
  - admin/reviewer/audit quick-start and troubleshooting docs
  - a buyer-facing B-end commercial package doc

## Still deferred
- Real pilot activation and live pilot evidence
- External delivery of the actual pilot environment, operator credential path, named requester, and tenant-admin/support touchpoint
- Richer admin actions beyond setup/activation visibility
- Full web task-detail migration beyond the new inbox shell
- Broad UI redesign
- Broader external package workflow expansion beyond the bounded pilot-activation handoff/intake/review model
- Android / C-end product surface remains outside this B-end platform pass
- Production-environment persistence activation remains deferred
- Deeper invite-claim landing and richer task timeline/export views remain deferred
- Standalone invite-claim route outside the main workspace shell remains deferred
- Richer standalone join success / redirect handling remains deferred
- Richer standalone join completion states beyond role-page jump remain deferred
- Richer receipt export and approval decision history remain deferred
- Deeper module-specific queues and mutation surfaces for all 9 OA roles remain deferred
- Full enterprise auth/account rollout remains deferred

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts` -> PASS

## Blockers
- No productization runtime blocker in this slice.
- Real pilot activation remains externally blocked and is intentionally not treated as product progress in this track.
- Current explicit launch state: `PILOT_ACTIVATION_IN_PROGRESS`

# Phase 1 Platform Contract

Date: 2026-03-11

## Goal

Consolidate the enterprise workspace platform onto one normalized contract layer so the preview shell keeps working while role, route, member, task, and CTA semantics stop diverging across panels.

## Frozen scope

- OA v1 remains the only role model:
  - `REQUESTER`
  - `APPROVER`
  - `OPERATOR`
  - `REVIEWER`
  - `TENANT_ADMIN`
  - `WORKSPACE_ADMIN`
  - `POLICY_GOVERNANCE_ADMIN`
  - `INTEGRATION_ADMIN`
  - `AUDITOR`
- Okta OIDC remains the only enterprise login target.
- Enterprise writes remain fail-closed when current-workspace persistence readiness is missing or ambiguous.
- Trial / local-lab activity remains non-pilot.

## Canonical contract

The normalized contract now lives in [services/platformContract.ts](/Users/lili/Desktop/Agent%20OS/services/platformContract.ts).

Primary exported entities:

- `PlatformActorIdentity`
  - Canonical employee or seat identity with normalized `oaRole`, page target, access, provisioning, and source.
- `PlatformWorkspaceContext`
  - Current route + workspace mode + active `oa_role` + bound roles + auth/write posture.
- `PlatformTaskLifecycleEntity`
  - Trial task detail with normalized receipt summary, handoff lines, approval lines, next action, and audit timeline.
- `PlatformCapabilityDecision`
  - Shared guard result for primary CTAs and write paths.
- `PlatformReadinessGate`
  - Normalized readiness/blocker line items for activation and dependency posture.
- `PlatformAuditReceipt`
  - Timeline and audit records normalized onto `oa_role`.
- `PlatformMemberSeatInvite`
  - Canonical member / seat / invite / role-lens record used by roster and access views.

## Contract decisions

- `oa_role` is the single source of truth for platform role semantics in UI logic.
  - Legacy `role` and `actor_role` values are accepted only by normalization helpers.
- Route parsing is centralized.
  - `page`
  - `section`
  - `workspace_mode`
  - `oa_role`
  - `member`
  - `trial_task`
  - `invite_code`
  - `enterprise_invite`
- Route fallback is deterministic.
  - Invalid `workspace_mode` falls back to `local_lab`.
  - Invalid `page` falls back to `workspace`.
  - Invalid or unavailable `oa_role` falls back by explicit page/default ordered resolution.
  - Invalid `section` falls back to the page default section.
- Primary CTA guards are centralized and fail closed.
  - `OKTA_SIGN_IN`
  - `OKTA_SIGN_OUT`
  - `ENTERPRISE_INVITE_ACCEPT`
  - `ENTERPRISE_MEMBERSHIP_WRITE`
  - `APPROVAL_DECISION`
  - `REVIEW_DECISION`
  - `OA_ROLE_SWITCH`
  - `TRIAL_INVITE_ACCEPT`
- Current-workspace write actions now depend on the selected normalized `oa_role`, not raw session badges.

## Applied surfaces

Phase 1 updates moved the existing platform sections onto the normalized contract with minimal structural change:

- [components/EnterprisePlatformView.tsx](/Users/lili/Desktop/Agent%20OS/components/EnterprisePlatformView.tsx)
- [components/StandaloneTrialJoinView.tsx](/Users/lili/Desktop/Agent%20OS/components/StandaloneTrialJoinView.tsx)
- [components/TrialJoinPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/TrialJoinPanel.tsx)
- [components/TrialTaskDetailPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/TrialTaskDetailPanel.tsx)
- [components/WorkspaceMembersPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/WorkspaceMembersPanel.tsx)
- [components/WorkspaceDirectoryPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/WorkspaceDirectoryPanel.tsx)
- [components/WorkspaceSeatAssignmentPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/WorkspaceSeatAssignmentPanel.tsx)
- [components/WorkspaceSeatDetailPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/WorkspaceSeatDetailPanel.tsx)
- [components/AccessMatrixPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/AccessMatrixPanel.tsx)
- [components/CollaborationMapPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/CollaborationMapPanel.tsx)
- [components/CrossRoleBoardPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/CrossRoleBoardPanel.tsx)
- [components/EnterpriseMembershipAdminPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/EnterpriseMembershipAdminPanel.tsx)

## Test focus

Focused coverage was added for:

- role normalization
- deep-link parsing and fallback
- capability guard decisions
- member / task restoration from URL-derived state
- normalized trial task receipt timeline

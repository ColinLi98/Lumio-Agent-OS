# Codex Agent OS Refactor Plan (Milestone Execution)

Date: 2026-03-09
Owner: Codex
Execution mode: incremental, shippable diffs, no rewrite

## Sellable Standard Execution Frame (2026-03-08)
- Governing roadmap:
  - `docs/Pilot/Sellable_Standard_Roadmap_v1.md`
- Near-term external product definition:
  - `Enterprise Execution Governance Platform`
- The active program order is now:
  1. `Step 1 — Pilot Activation Closure`
  2. `Step 2 — Live Evidence Closure`
  3. `Step 3 — Enterprise Shell Consolidation`
  4. `Step 4 — Enterprise Infrastructure P0 Closure`
  5. `Step 5 — Launch, Support, and Compliance Package`
  6. `Step 6 — Commercial Packaging and Sales Readiness`
- Current active step:
  - `Step 1 — Pilot Activation Closure`
  - missing artifacts remain the real pilot environment binding, real operator access, named requester, and real tenant-admin/support touchpoint
  - the first real task/session/run artifact remains blocked until those are real
- `Step 2` is blocked until the first verified and promoted `REAL_PILOT` artifact exists.
- The Launch `00-13` and EPF records below are historical implementation inputs, not the active sequencing model.
- Launch `14.x` continuation stays frozen unless real pilot evidence changes the facts.

## Current Bounded Slice (Active)
- User-directed enterprise closure slice over the existing Step 1 pilot boundary.
- Fixed implementation order for this slice:
  1. server-side enterprise RBAC + persistence guardrails
  2. real web Okta OIDC login/session callback closure
  3. invite / accept / revoke / suspend / reactivate membership lifecycle
  4. real Approval / Review / Audit centers over durable task / artifact / compliance / membership truth
  5. pilot activation API authorization and promotion hardening
- Preserve frozen launch scope while executing this slice:
  - no provider expansion beyond `Okta OIDC`
  - no new OA roles
  - no `demo` / `local_lab` path may mutate real enterprise or pilot state
  - production enterprise writes fail closed unless Postgres-backed persistence is available

## 2026-03-10 Follow-through Slice
- add diagnostics for enterprise auth, binding, session expiry, and write persistence readiness
- deepen Approval / Review / Audit center interaction with search/filter/group/detail/bulk behavior
- add B-end production persistence and Okta validation checklists
- add admin/reviewer/audit quick-start and troubleshooting docs
- add a buyer-facing B-end commercial package doc and canonical B-end review URL guidance

## Paused / Deprioritized Until Sellable Standard
- Launch `14.x` HOLD / hypercare continuation without changed real facts.
- Post-`EPF-19` shell / page / panel / drilldown expansion.
- `LOOP-012` connector credential/provider breadth and `LOOP-021` provider-matrix rollout.
- `LOOP-001`, `LOOP-003`, `LOOP-004`, and `LOOP-005` beyond regression / safety maintenance for the frozen pilot path.
- Speculative consumer-shell, agent-workforce, governance-primitive, BPM / DSL, destructive-automation, and broad provider / connector expansion work.

Historical milestone order below is retained for implementation traceability. The active execution model is the sellable-standard frame above.

## 1. Milestone Order
1. M1 Unified WORK surface
2. M2 Preferences & Permissions control center
3. M3 External Fulfillment contractization + new states
4. M4 Regression cleanup + English copy cleanup + docs/tests refresh

## 1A. Parallel Enterprise Infrastructure Track (Locked)

This plan remains the Android/app refactor plan. A separate additive enterprise infrastructure track now runs in parallel with a locked scope:
- planning/status authority:
  - `docs/enterprise-infrastructure-track-plan.md`
  - `docs/enterprise-infrastructure-track-status.md`
  - `docs/enterprise-infrastructure-track-workstreams.md`
- scope lock:
  - no product redesign
  - no orchestrator rewrite
  - no broadening of the product surface
  - no weakening of existing local-first safety behavior
- completed launch-blocking slice:
  - `Launch 03 / EI-P0C: service-backed worker pool and remote runner control plane`
  - `Launch 04 / EI-P0D: service auth closure, worker identity, and control-plane safety`
  - `Launch 05: identity and admin minimum closure`
  - `Launch 06: vault and credential minimum closure`
  - `Launch 07: connector platform minimum closure`
  - `Launch 08: authoritative ledger and query model hardening`
  - `Launch 09: observability, SRE, and incident baseline`
  - `Launch 10: compliance execution baseline`
  - `Launch 11: tenant, environment, and region deployment baseline`
  - `Launch 12: operator runbooks, solution templates, and onboarding`
- active launch-gate slice:
  - `Launch 13: full launch rehearsal and launch gate`
  - current state: rehearsal executed, `G2`/`G3` green, `G1` blocked
- active code surface for the enterprise infrastructure slices:
  - `services/agent-kernel/*`
  - `api/agent-kernel/*`
  - `tests/agentKernel*.test.ts`

## 1B. Enterprise Pilot Launch Sequence Freeze (Locked on 2026-03-07)

The remaining launch-blocking work now follows one fixed enterprise-pilot sequence:
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

Execution rules:
- target a controlled enterprise pilot, not broad GA
- do not introduce new workstreams or product primitives inside this sequence
- do not run broad UI redesign inside this sequence
- close each step's documented exit criteria before starting the next implementation step
- use the roadmap doc as the dependency authority:
  - `docs/Launch/Launch_00_Roadmap_and_Execution_Order.md`

## 1C. Launch 01 Scope Freeze and Deferred Boundaries

Execution mode:
- docs-only scope freeze
- additive and backward-compatible
- no runtime/product behavior changes

Scope for this step:
- freeze the single primary workflow template family for pilot launch
- freeze the supported identity path, vault path, connector path, and deployment model
- make deferred and unsupported paths explicit
- declare launch-critical vs post-launch nice-to-have boundaries
- sync `spec`, `plan`, and `status` to the Launch 01 checkpoint

Allowed write surface by default:
- `docs/Launch/Launch_01_Scope_Freeze_and_Deferred_Boundaries.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- pilot launch scope is frozen to one workflow template family
- supported identity, vault, connector, and deployment paths are explicit
- deferred and unsupported paths are explicit
- later launch steps can be evaluated against the frozen pilot boundary

## 1D. Launch 02 Release Baseline, Repo Hygiene, and Gating

Execution mode:
- hygiene-only
- additive and backward-compatible
- no runtime/product behavior changes unless explicitly justified

Scope for this step:
- inventory current noisy paths and classify durable source/docs vs generated/transient noise
- refresh the live repo-noise inventory against both the standard status view and expanded untracked-file visibility
- tighten ignore boundaries for scratch/temp/cache/export churn
- freeze milestone-scoped write boundaries in `AGENTS.md`
- refresh the release-baseline checklist and milestone-preflight gate docs
- sync `spec`, `plan`, and `status` to the Launch 02 checkpoint

Allowed write surface by default:
- `.gitignore`
- module-level ignore files
- `AGENTS.md`
- `docs/Launch/Launch_02_Release_Baseline_Repo_Hygiene_and_Gating.md`
- `docs/repo-noise-inventory.md`
- `docs/release-baseline-checklist.md`
- `docs/milestone-preflight-checklist.md`
- `docs/repo-hygiene-baseline.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- current repo noise is inventoried and classified
- immediate ignore candidates are behind ignore boundaries
- high-blast-radius tracked-artifact cleanup remains explicitly deferred
- future launch steps can use the refreshed baseline checklist and preflight gate

## 1E. Launch 03 EI-P0C Service-Backed Worker Pool and Remote Runner Control Plane

Execution mode:
- additive and backward-compatible
- service-layer only
- no Android/orchestrator rewrite

Scope for this step:
- turn the remote execution substrate scaffolding into a minimal service-backed worker loop
- make claim/lease/heartbeat/release/timeout/requeue behavior durable and auditable
- preserve local-first fallback when remote execution is unavailable
- expose execution-substrate visibility through existing APIs and authoritative query projections
- keep retry/dead-letter behavior deterministic and replay-compatible

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/tasks/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_03_EI_P0C_Service_Backed_Worker_Pool_and_Remote_Runner_Control_Plane.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- tasks can be drained or polled through a bounded service-backed worker loop
- claim, lease, heartbeat, release, timeout, and requeue records are durable and visible
- stale-claim recovery remains replay-safe with explicit ledger evidence
- local-first fallback behavior remains intact
- required TypeScript agent-kernel validation gate is green

## 1F. Launch 04 EI-P0D Service Auth Closure, Worker Identity, and Control Plane Safety

Execution mode:
- additive and backward-compatible
- service-layer only
- no full enterprise IAM platform
- no broad user-facing identity redesign

Scope for this step:
- add typed service principal and service-auth context models for worker identity and control-plane actions
- require typed auth provenance for `claim`, `heartbeat`, `release`, `recoverStaleClaims`, and `requestRemoteRunner`
- fail unauthorized service-side actions closed with explicit audit records
- preserve local-first fallback when remote runner control is denied or unavailable
- expose additive auth provenance through existing `execution_substrate` and `execution_ledger` task responses

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/tasks/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_04_EI_P0D_Service_Auth_Closure_Worker_Identity_and_Control_Plane_Safety.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- every remote execution/control-plane action has durable service identity and auth provenance
- unauthorized service-side actions fail closed and are auditable
- stale-claim recovery remains replay-safe across runtime restarts
- required TypeScript agent-kernel validation gate is green

## 1G. Launch 05 Identity and Admin Minimum Closure

Execution mode:
- additive and backward-compatible
- service-layer plus bounded API surface only
- no full provider matrix rollout
- no broad SaaS admin redesign

Scope for this step:
- ship one real Okta OIDC authorization-code path for the frozen pilot tenant
- issue durable enterprise principal/session/admin state rather than typed placeholders only
- add basic tenant/workspace role mapping from the frozen pilot group model
- add bounded directory/provisioning ingestion with permission shrink and deprovision closure
- keep local-first safety semantics unchanged

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_05_Identity_Admin_Minimum_Closure.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- a pilot customer can authenticate through one supported Okta OIDC path
- tenant/workspace admin access resolves from durable bindings, not typed-only semantics
- directory sync can shrink or revoke access durably for the pilot scope
- deprovisioned or suspended principals lose admin capability and active sessions are revoked
- required TypeScript agent-kernel validation gate is green

## 1H. Launch 06 Vault and Credential Minimum Closure

Execution mode:
- additive and backward-compatible
- service-layer plus bounded webhook API surface only
- one frozen pilot vault/backend path only
- no full vendor matrix or secret-platform replacement

Scope for this step:
- ship one real HashiCorp Vault backend path for the frozen pilot webhook connector
- add minimum lease/materialize/renew/revoke/rotate lifecycle handling without persisting secret material
- gate webhook delivery on durable credential health and compromise state
- expose operator-visible credential health, delivery failure, and compromise summaries through bounded admin APIs
- keep local-first safety semantics unchanged

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/connectors/webhook/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_06_Vault_and_Credential_Minimum_Closure.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- at least one production connector path uses a real HashiCorp Vault-backed credential lifecycle
- lease/renew/revoke/rotate behavior is durable and auditable
- webhook route eligibility fails closed on revoked, compromised, expired, or unhealthy credential state
- operator-visible credential health and recent delivery summaries are available
- required TypeScript agent-kernel validation gate is green

## 1I. Launch 07 Connector Platform Minimum Closure

Execution mode:
- additive and backward-compatible
- service-layer plus bounded connector API surface only
- no connector swamp
- no unbounded integration expansion

Scope for this step:
- turn the frozen pilot connector layer into a minimal platform seam over the Launch 06 webhook transport
- define a connector contract for adapter definitions, platform dispatch summaries, and connector health
- ship one generic webhook adapter and one real business adapter for the frozen advisor CRM/compliance handoff path
- enforce rate-limit / retry / timeout / dead-letter behavior through the shared connector platform service
- add bounded conformance coverage and preserve local-first safety semantics

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/connectors/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_07_Connector_Platform_Minimum_Closure.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- new connectors follow a defined platform contract and are testable against it
- one generic webhook path and one real business connector path run through the same bounded platform service
- retry, timeout, rate-limit, and dead-letter outcomes are durable and auditable
- existing webhook delivery responses remain backward-compatible with additive connector-platform visibility
- required TypeScript agent-kernel validation gate is green

## 1J. Launch 08 Authoritative Ledger and Query Model Hardening

Execution mode:
- additive and backward-compatible
- service-layer plus bounded task API visibility only
- no broad history rewrite
- no unrelated product work

Scope for this step:
- harden the task-level materialized query model over the append-only execution ledger
- make projection versioning and compatibility policy explicit
- make replay and rebuild strategy explicit and testable
- add a bounded archive/retention baseline with durable compaction hints
- keep local-first safety semantics unchanged

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/tasks/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_08_Authoritative_Ledger_Query_Model_Hardening.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- the append-only ledger is explicit as the only authoritative truth source
- projection versioning, compatibility states, and rebuild strategies are durable and testable
- retention and compaction-hint policy are explicit and visible without destructive history rewrite
- existing task responses expose additive compatibility and retention summaries
- required TypeScript agent-kernel validation gate is green

## 1K. Launch 09 Observability, SRE, and Incident Baseline

Execution mode:
- additive and backward-compatible
- service-layer plus bounded observability API surface only
- no full observability redesign
- no enterprise NOC product

Scope for this step:
- thread correlation ids across runs, worker/control-plane actions, and connector deliveries
- expose bounded task and pilot observability summaries over existing authoritative task-store and ledger truth
- add pilot alerting, degraded-mode, and SLO baseline visibility without introducing a new durable state plane
- refresh metrics/dashboard visibility for open alerts and degraded task states
- add explicit on-call and degraded-mode recovery runbooks

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/*`
- `services/metricsCollector.ts`
- `services/providers/dashboardApi.ts`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_09_Observability_SRE_and_Incident_Baseline.md`
- `docs/agent-kernel-oncall-runbook.md`
- `docs/agent-kernel-degraded-mode-recovery-playbook.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- task snapshots expose additive observability summaries with correlation, tracing, logs, alerts, degraded-mode, and bounded SLO status
- a bounded pilot/global observability API exists for operator triage
- on-call and degraded-mode recovery playbooks are explicit
- required TypeScript agent-kernel validation gate is green

## 1L. Launch 10 Compliance Execution Baseline

Execution mode:
- additive and backward-compatible
- service-layer plus bounded compliance API surface only
- no full compliance suite
- no broad legal platform

Scope for this step:
- make the pilot retention posture executable over the authoritative task ledger/query truth
- add durable deletion-request records with fail-closed pilot no-delete semantics
- add redaction-first audit export generation with manifest and bundle integrity hashes
- make legal hold posture explicit as a manual defer, not an implied capability
- add a bounded security/privacy questionnaire starter pack

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_10_Compliance_Execution_Baseline.md`
- `docs/agent-kernel-compliance-operations-runbook.md`
- `docs/agent-kernel-security-privacy-questionnaire-starter-pack.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- task snapshots expose additive compliance summaries grounded in authoritative retention truth
- deletion requests are durably recorded and fail closed under the pilot append-only policy
- audit exports generate manifest/bundle hashes plus section hashes without persisting secret material
- legal-hold posture is explicit and documented as manual-only for the pilot
- required TypeScript agent-kernel validation gate is green

## 1M. Launch 11 Tenant, Environment, and Region Deployment Baseline

Execution mode:
- additive and backward-compatible
- service-layer plus bounded deployment-summary API surface only
- no full multi-region rollout platform
- no broad infra redesign beyond pilot needs

Scope for this step:
- freeze the pilot deployment model to vendor-managed single-tenant cloud
- make tenant isolation machine-checkable over the existing identity and vault baselines
- make development, staging, pilot, and production boundaries explicit in docs and runtime summaries
- make primary-region, residency, and secret-separation posture explicit and warning-backed
- keep local-first safety semantics unchanged

Allowed write surface by default:
- `services/agent-kernel/*`
- `api/agent-kernel/*`
- `tests/agentKernel*.test.ts`
- `docs/Launch/Launch_11_Tenant_Environment_and_Region_Deployment_Baseline.md`
- `docs/agent-kernel-pilot-deployment-baseline.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- task snapshots expose additive deployment summaries with deployment model, stage, tenant isolation, region, and secret-separation posture
- a bounded pilot/global deployment summary API exists
- tenant/env/region misconfiguration is surfaced as explicit degraded state rather than remaining implicit
- the frozen pilot deployment baseline and deferred deployment breadth are explicit in docs
- required TypeScript agent-kernel validation gate is green

## 1N. Launch 12 Operator Runbooks, Solution Templates, and Onboarding

Execution mode:
- docs-and-ops-packaging only
- additive and backward-compatible
- no full academy or LMS
- no broad GTM expansion

Scope for this step:
- package the completed pilot runtime into operator-usable runbooks and escalation paths
- package the frozen advisor workflow into 2-3 repeatable solution templates
- define a repeatable onboarding checklist for pilot customers
- define pilot KPI and success criteria for weekly review and Launch 13 rehearsal

Allowed write surface by default:
- `docs/Launch/Launch_12_Operator_Runbooks_Solution_Templates_and_Onboarding.md`
- `docs/agent-kernel-pilot-operator-guide.md`
- `docs/agent-kernel-pilot-solution-templates.md`
- `docs/agent-kernel-pilot-onboarding-checklist.md`
- `docs/agent-kernel-pilot-success-scorecard.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- operators have a readable runbook and escalation path over the existing pilot APIs and prior runbooks
- the frozen advisor pilot workflow has 2-3 explicit solution templates
- pilot onboarding has a concrete checklist with owners and evidence expectations
- KPI and success criteria are explicit enough to use in Launch 13 rehearsal and go/no-go review

## 1O. Launch 13 Full Launch Rehearsal and Launch Gate

Execution mode:
- no feature work
- no scope expansion
- evidence collection plus gate decision only

Scope for this step:
- run the frozen pilot rehearsal across the golden scenario, replay/rebuild path, connector/credential/remote-denial drills, incident/rollback drill, and onboarding path
- run the final `G2` and `G3` validation commands for the launch candidate
- evaluate `G1`/`G2`/`G3` together as `G4`
- record the final launch decision explicitly in launch/spec/plan/status docs

Allowed write surface by default:
- `docs/Launch/Launch_13_Full_Launch_Rehearsal_and_Launch_Gate.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Current result:
- rehearsal coverage is complete for the frozen pilot runtime path
- the required TypeScript and Android/host validation suites are green
- the final launch gate is still blocked because the current candidate does not satisfy the non-negotiable `G1` release-baseline cleanliness requirement

Next action inside this step:
- close the `G1` candidate-cleanliness blocker and rerun Launch 13 gate review

## 2. M1 Unified WORK Surface
### Scope
- Remove required `Choose Workspace` entry step.
- Remove mandatory manual module pick from primary WORK start.
- Keep contextual capability sections in task flow.
- Preserve Interaction Hub behavior/placement.
- Update primary WORK copy to English-first outcome language.

### Files
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ModuleFeaturePanel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/AppModule.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ModuleUiSupport.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/TopCards.kt`

### Exit criteria
- WORK opens into unified flow.
- No forced Chat/LIX/Agent/Avatar/Home first-step choice.
- Interaction Hub still supports pending-question + supplement updates.

### Rollback strategy
- Revert only WORK-entry composition and module-switcher visibility changes.
- Keep Interaction Hub and trust rendering untouched during rollback.

## 3. M2 Preferences & Permissions Control Center
### Scope
- Reposition twin UX from persona-first to control-layer-first.
- Surface stable preferences, approvals, data sharing, sync/cloud status.
- Make constraint-precedence rule visible and enforced.
- Improve persistence continuity and sync diagnostics UX.

### Files
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/AvatarScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/SettingsScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/TwinCloudSyncCoordinator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`

### Exit criteria
- Avatar surface copy reflects `Preferences & Permissions`.
- Local/cloud/sync status and data scope are user-visible.
- Task constraints visibly override long-term preferences.

### Rollback strategy
- Revert UI copy/section ordering and payload field rendering only.
- Keep twin storage and orchestrator trust checks intact.

## 4. M3 External Fulfillment Contractization + New States
### Scope
- Add typed external-fulfillment models:
  - `IntentContract`, `CapabilityCard`, `Quote`, `VerificationProof`, `RollbackPolicy`
- Extend statuses end-to-end:
  - `QUOTING`, `AUTH_REQUIRED`, `VERIFYING`, `COMMITTED`, `ROLLED_BACK`, `DISPUTED`
- Propagate through parsing, normalization, terminal checks, chips/badges/history.
- Keep trusted attribution and verification behavior unchanged.
- Trigger external fulfillment contextually only.

### Files
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/task/TaskTrackBuilder.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `cloud-adapters/src/main/kotlin/com/lumi/cloudadapters/VercelCloudGateway.kt`

### Exit criteria
- New states are parsed/rendered/handled end-to-end.
- External quote comparison shows price/ETA/risk/proof/rollback-dispute terms.
- Legacy payload compatibility still works.

### Rollback strategy
- Revert only new status/model wiring and keep legacy statuses.
- Preserve trust-confirmation and verification-link pathways.

## 5. M4 Regression + English Copy + Docs/Tests
### Scope
- Final user-facing copy sweep in primary path.
- Remove residual persona/market-first wording from primary WORK flow.
- Update tests/fixtures/status expectations for new states/naming.
- Refresh spec/plan/status docs to implementation truth.

### Exit criteria
- No mixed old/new primary user path.
- Validation commands green or blockers explicitly documented.
- Docs and code behavior aligned.

### Rollback strategy
- Revert copy-only diffs independently from state/contract logic.
- Keep canonical naming aliases to avoid payload regressions.

## 6. Validation Commands (Run After Each Milestone)
Required:
1. `./gradlew :app-backend-host:assembleDebug`
2. `./gradlew :core-agent:testDebugUnitTest --tests com.lumi.coreagent.bellman.BellmanSolverTest`
3. `./gradlew :core-agent:testDebugUnitTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
4. `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest`
5. `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

Additional (M3/M4):
- `./gradlew :cloud-adapters:testDebugUnitTest`
- `./gradlew :core-agent:testDebugUnitTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`

Repository task-name note:
- In this repo, some modules expose `:module:test` instead of `:module:testDebugUnitTest`; use equivalent task when requested task does not exist.

## 6A. Enterprise Infrastructure Validation Baseline

Run these for the active enterprise track slice:
1. `npm run -s typecheck`
2. `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts`

## 7. Risk Register and Mitigations

## 35.5. Post-M35 Release Hardening Plan (2026-03-06)
Execution mode:
- Keep the pass narrowly scoped to release baseline, narrative consistency, generic-routing safeguards, and twin/settings visibility.
- Preserve M35 runtime behavior; only harden visibility, fallback boundaries, and validation.
- Use the release-baseline script as the canonical local validation entry point.

### M35.5A Release baseline and repo-noise guardrails
Scope:
- Add a single scripted baseline gate for web + Android.
- Wire the same gate into GitHub Actions.
- Tighten ignore policy for local coverage/test-output churn.
- Keep high-blast-radius tracked-artifact migration deferred to the dedicated cleanup loop.

### M35.5B Generic Agent OS narrative and legacy travel isolation
Scope:
- Align top-exposure product copy to Agent OS positioning.
- Remove implicit travel pipeline expansion from the default path.
- Keep legacy travel auto-expansion only behind an explicit flag.
- Add regression coverage that proves default behavior stays explicit-only.

### M35.5C Twin/settings/runtime truth closure
Scope:
- Align `SettingsPayload` flags with actual runtime/build inputs.
- Persist twin sync summary/resolution/conflict markers for restart continuity.
- Expose twin continuity and portfolio-learning visibility in Settings surfaces.
- Reuse one role-policy-aware gate for all twin cloud-sync triggers.

### M35.5 validation gate
- `bash scripts/check-release-baseline.sh`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest`
- Optional release-only evidence:
  - `RUN_ANDROID_DEVICE_REGRESSION=1 bash scripts/check-release-baseline.sh`

### M35.5 current checkpoint (2026-03-06)
- M35.5A done
- M35.5B done
- M35.5C done
- Validation gate: passed locally on 2026-03-06
- Deferred evidence: connected Android/device regression not rerun in this pass
| Risk | Impact | Mitigation |
|---|---|---|
| IME triage regression | Input quality/runtime behavior changes | No IME threshold logic rewrite in this pass |
| Bellman personalization regression | Recommendation quality drop | Keep solver intact; validate Bellman tests every milestone |
| Trust regression | Safety/compliance break | Preserve explicit confirmation and trusted attribution paths |
| Marketplace-first UX regression | Users forced into external browsing | Gate external fulfillment behind contextual insufficiency logic |
| Payload compatibility break | Legacy clients/parsers fail | Normalize legacy inbound values and preserve aliases |
| Mixed old/new UX shipping | Confusing user flow | Milestone gating + final copy sweep + status checklist |

## 8. Do-Not-Ship Mixed UX Checklist
- [ ] WORK has no required upfront module chooser.
- [ ] Canonical labels visible in primary user path.
- [ ] External Fulfillment appears contextually, not as front door.
- [ ] Preferences & Permissions reflects control-layer semantics.
- [ ] New statuses consistent in cards/chips/history/terminal logic.
- [ ] Interaction Hub and trusted verification behavior unchanged.

## 9. Role Track M2 Plan (Explainability + Activity Receiptization)
Execution note:
- Completed incrementally as `M2A -> M2B -> M2C -> M2D` with validation gates kept green.

### M2A Receipt Foundation
Scope:
- Add typed `ExecutionReceipt` / `ExecutionReceiptEvent`.
- Attach optional `executionReceipt` to `AgentResponse` and `TaskTrackPayload`.
- Generate receipts in orchestrator finalization path using existing role/gate/policy/proof data.
- Keep backward compatibility and preserve existing role precedence behavior.

Primary files:
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/task/TaskTrackBuilder.kt` (only if required)
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`

Exit criteria:
- Material runs include non-null typed receipt.
- Receipt contains role/source/delegation/reason-code traceability and readable role impact summary.
- Receipt surfaces approval, data scope, provider, verification/proof, rollback/issue summaries where applicable.
- Restore/system recovery role context remains coherent in receipt metadata.

### M2B Activity Receiptization
Scope:
- Render receipt-oriented activity rows when receipt data exists.
- Keep fallback for legacy no-receipt items.
- Keep copy concise and English-first.

Primary files:
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ActivityScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/RoleTraceFormatter.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/model/ExecutionReceiptFormatter.kt` (new helper)

Exit criteria:
- Activity row titles are receipt/event-first when receipt exists.
- Activity rows show readable role/source/impact and top execution summaries.
- Legacy rows still render safely via fallback summary.

### M2C Execution Surface Explainability
Scope:
- Add compact receipt summaries to response cards and chat execution surfaces.
- Align export summary snippets with receipt fields when available.

Primary files:
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ResponseCards.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/ChatScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`

Exit criteria:
- Response details include a readable execution receipt block.
- Chat execution surface includes a readable execution receipt block.
- Export summary includes receipt-aware snippet when available.

### M2D Validation + Cleanup
Scope:
- Fill receipt failure-path test coverage and wording cleanup.
- Update milestone compliance matrix in docs/status.
- Add receipt copy quality gate for Activity/readability consistency.

Primary docs:
- `docs/M2_Explainability_Activity_Receiptization.md`
- `docs/codex-agent-os-refactor-spec.md`
- `docs/codex-agent-os-refactor-plan.md`
- `docs/codex-agent-os-refactor-status.md`

Exit criteria:
- Added/updated formatter tests for receipt readability and failure summaries.
- Dogfood scenario test validates receipt copy length bounds and non-empty required fields.
- Full M2 validation command set completed successfully.
- Status doc includes explicit requirement-to-file/test compliance evidence.

### Receipt Copy Quality Gate (ongoing regression)
- `activityTitle` length is clamped and readable.
- `headline` always renders when role context exists and stays within length bounds.
- `summaryLines` never returns empty for receipt-capable runs (fallback line required).
- Overlong lines are truncated consistently across Activity/Chat/Response.
- Dogfood scenarios must include at least one approval-related receipt path and pass quality checks.

## 10. Role Track M3 Plan (External Fulfillment Full Role-Aware Contractization)
Execution mode:
- Keep changes additive/backward-compatible.
- Reuse M2 receipt-first surfaces.
- No orchestrator rewrite, no custom role editor, no marketplace backend redesign.

### M3A Typed quote/provider decision strengthening
Scope:
- Extend typed external fulfillment structures with provider decision + deny reason + role/policy fit fields.
- Ensure canonical `ROLE_*` external families are emitted as primary structured reasons.

### M3B Role-aware approval/data-scope/proof behavior
Scope:
- Approval gating driven by role policy + gate outcomes.
- Provider-facing data scope projection applies redaction/block before external broadcast.
- Proof/verification requirement summaries carried as typed runtime objects.

### M3C Receipt/Activity external-chain traceability
Scope:
- Receipt shows quote/provider/approval/data/proof/verification/rollback/dispute chain.
- Activity/response/chat/export consume the same typed receipt summaries.

### M3D Tests + telemetry + status closure
Scope:
- Add/update role-aware external scenario tests.
- Run full command gate (domain/core-agent/bellman/app-host/unit/instrumentation).
- Capture telemetry added vs deferred and publish compliance map in status.

### M3 current checkpoint (2026-03-03)
- `M3A` done
- `M3B` done
- `M3C` done
- `M3D` done

## 11. Role Track M3.5 Plan (UI Surfacing + Dogfooding)
Execution mode:
- Keep diffs incremental and reviewable.
- Surface existing typed runtime chain more prominently in main UX.
- Do not introduce parallel receipt systems.

### M3.5A Prominent external summary surfacing
Scope:
- Improve Work/response/activity/chat visibility for provider/approval/data-scope/verification/rollback-dispute states.
- Ensure failure and sync-pending states are not hidden in deep detail only.
Implementation:
- Added external summary headline + status pills in response-history rows and response receipt block.
- Added external summary headline + status pills in chat execution receipt card.
- Added external summary headline + status pills in Activity row cards.

### M3.5B Concise "why" visibility
Scope:
- Expose concise readable "why" for provider decision, approval gate, and data-scope restriction.
- Keep language English-first and grounded in typed receipt/runtime fields.
Implementation:
- `ExecutionReceiptFormatter.summaryLines` now prioritizes external chain "why" lines:
  - `Why provider: ...`
  - `Why approval: ...`
  - `Why data scope: ...`
- Sync-pending external dispute state is surfaced as a first-class summary line.

### M3.5C Failure-path parity
Scope:
- Highlight provider denied / approval denied / verification failed / dispute opened / rollback available with same prominence class as success summaries.
Implementation:
- Added tone-tagged external pills for failure and issue paths:
  - `Provider denied`
  - `Approval denied`
  - `Data scope blocked`
  - `Verification failed`
  - `Dispute opened`
  - `Sync pending`
- Updated orchestrator dispute summary wording for local dispute + gateway sync pending readability.

### M3.5D Dogfooding + tests + docs/status
Scope:
- Add formatter/UI-model coverage for visible external summary paths.
- Validate golden scenarios:
  1. WORK vs BUYER divergence
  2. review reject dispute + sync pending
  3. data-scope reduced/blocked
  4. verification failure / rollback-capable
- Run full validation gate and update status with evidence.
Implementation:
- Added formatter tests for external summary headline, external pills, and "why"/sync-pending lines.
- Added dogfood scenario coverage for all four required M3.5 scenarios.

### M3.5 checkpoint (completed 2026-03-03)
- `M3.5A` done
- `M3.5B` done
- `M3.5C` done
- `M3.5D` done

## 12. Role Track M4 Plan (Guided Role Policy Editor)
Execution mode:
- Tight scope, additive compatibility, no orchestrator rewrite.
- Implement runtime + persistence + Preferences UI as one coherent path.

### M4A Typed policy-edit contracts + persistence bridge
Scope:
- Add typed policy editing/update/validation structures.
- Extend persistence payload with role-policy overrides.
- Keep legacy decode/encode behavior compatible.
Primary files:
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt`
- `core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt`
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistencePort.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/state/SharedPrefsDynamicStateStore.kt`
- `core-domain/src/test/kotlin/com/lumi/coredomain/contract/DomainContractsTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/DynamicStatePersistenceTest.kt`

### M4B Runtime policy override application
Scope:
- Centralize effective role policy as `default + user override`.
- Add validate/preview/save/reset APIs in orchestrator and backend bridge.
- Ensure policy edits materially affect approvals/routing/ranking/provider/data/delegation.
Primary files:
- `core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/BackendHostClient.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestratorTest.kt`
- `core-agent/src/test/kotlin/com/lumi/coreagent/orchestrator/SkillSelectionEngineTest.kt`

### M4C Preferences & Permissions editor + preview
Scope:
- Add bounded editor controls and readable impact preview in `AvatarScreen`.
- Show protected fields clearly.
- Provide safe save/reset flow and clear validation feedback.
Primary files:
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/screens/AvatarScreen.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/ui/components/ModuleFeaturePanel.kt`
- `app-backend-host/src/main/java/com/lumi/keyboard/MainActivity.kt`
- `app-backend-host/src/test/java/com/lumi/keyboard/ui/model/RoleTraceFormatterTest.kt` (if formatter mapping expands)

### M4D Validation closure + status compliance map
Scope:
- Run requested validations, fix failures.
- Update status doc with M4 requirement-to-file/test evidence and explicit deferrals.

### M4 acceptance
- Users can edit bounded role policies inside Preferences & Permissions.
- Validation blocks contradictory policy combinations with readable messages.
- Preview explains material impact before save.
- Save persists across restart/restore.
- New runs reflect edits in runtime decisions and explainability outputs.

### M4 checkpoint (completed 2026-03-03)
- `M4A` done: typed editable contracts + persistence bridge landed.
- `M4B` done: runtime applies user policy overrides across approvals/routing/ranking/provider/data/delegation.
- `M4C` done: Preferences & Permissions includes bounded editor, protected fields, preview, save/reset flow.
- `M4D` done: validations passed and status compliance map updated with file/test evidence.

## 13. Role Track M5 Plan (Versioned Proof Ledger + History Hardening)
Execution mode:
- Tight scope, additive compatibility, no orchestrator rewrite.
- Strengthen durable backing under existing receipt-first UI surfaces.

### M5A Snapshot model + decision-time binding
Scope:
- Add typed `RolePolicySnapshot` + snapshot binding concepts.
- Bind each material run to effective role-policy snapshot at decision time.
- Keep explicit task-constraint precedence visible in snapshot/receipt metadata.

### M5B Durable ledger records
Scope:
- Add typed durable record concepts for:
  - receipt record
  - run events
  - provider decisions
  - verification/rollback/dispute records
- Persist material run records durably with backward-compatible read behavior.

### M5C Replay/restore + mixed-history compatibility
Scope:
- Restore durable ledger records on app restart/process death.
- Ensure old (legacy) and new (ledger-backed) history can coexist safely.
- Keep Activity/Work replay readable and consistent.

### M5D Tests/telemetry/docs closure
Scope:
- Add required M5 scenarios (policy-edit non-retroactive meaning, replay integrity, provider auditability, verification/rollback chain persistence, mixed old/new compatibility, precedence visibility).
- Add practical telemetry counters for snapshot binding/reconstruction coverage.
- Update status doc with M5 requirement-to-file/test mapping and explicit deferrals.

### M5 acceptance
- Material runs carry durable decision-time policy snapshots.
- Past receipt meaning is stable across later policy edits.
- Durable records back receipt/event/provider/verification/rollback-dispute chains.
- Replay/restore reconstructs role-aware execution context.
- Required M5 scenarios pass with explicit compatibility evidence.

### M5 checkpoint (completed 2026-03-04)
- `M5A` done: snapshot/binding models added and wired into finalization.
- `M5B` done: durable ledger record chain added (receipt/events/provider/verification/rollback/dispute).
- `M5C` done: persistence/restore + app-side mixed-history hydration completed.
- `M5D` done: targeted M5 tests and validation command set passed; status compliance map updated.

## 14. Role Track M6 Plan (Governance Analytics + Telemetry Aggregation)
Execution mode:
- Tight scope, additive compatibility, no orchestrator rewrite.
- Derive governance metrics from typed durable ledger/receipt records.
- Keep UI surfacing bounded to internal/admin/debug-facing path in this pass.

### M6A Metric schema + extraction
Scope:
- Add typed governance metric/query/summary contracts.
- Define canonical metric families for approvals, provider decisions, data-scope, verification, rollback/dispute, snapshot/traceability coverage.
- Extract governance signals from `ExecutionReceiptRecord` and related typed records with mixed-history-safe defaults.

### M6B Aggregation + query layer
Scope:
- Add typed governance aggregation query path from bridge -> backend service -> kernel -> orchestrator.
- Support at least these dimensions:
  - role
  - provider
  - policy snapshot version/id
  - outcome status
  - reason-code family
- Add recent-window filter support (`days`) without requiring full remote telemetry backend.

### M6C Surfacing + export
Scope:
- Add a bounded internal/admin/debug-facing governance summary surface in Activity/workflow path.
- Ensure summaries are readable English and concise, not raw reason-code dumps.
- Keep primary end-user flow unchanged.

### M6D Tests + docs + validation
Scope:
- Add/extend tests for model serialization, extraction, aggregation/filtering, mixed old/new compatibility, and surface formatting.
- Run required validation command set and fix failures before closure.
- Update status/spec/plan with explicit M6 compliance mapping and deferred items.

### M6 acceptance
- Governance summaries compute from durable typed ledger/receipt data.
- Typed query supports role/provider/policy-snapshot/status/reason-family aggregation dimensions.
- At least one internal/admin/debug-facing surface shows readable governance summaries.
- Mixed old/new records do not break aggregation.
- M6 tests and requested validations pass.

### M6 checkpoint (completed 2026-03-04)
- `M6A` done: typed governance metric/query/summary contracts and ledger extraction model added.
- `M6B` done: orchestrator governance aggregation and typed filter query path wired through kernel/service/client.
- `M6C` done: Activity developer-mode governance analytics summary card added with readable English outputs.
- `M6D` done: domain/orchestrator/app formatter tests updated and full validation command gate passed.

## 15. Role Track M7 Plan (Settlement / Dispute / Marketplace Infra Deeper Pass)
Execution mode:
- Tight scope, additive compatibility, no orchestrator rewrite.
- Harden durable post-decision external execution state under existing receipt-first surfaces.

### M7A Typed durable models
Scope:
- Add typed settlement/dispute/reconciliation models and record fields.
- Keep backward-compatible optional defaults for old payloads.

### M7B Idempotency + reconciliation behavior
Scope:
- Merge duplicate same-run callbacks idempotently.
- Keep local authoritative state explicit during remote delay/mismatch.
- Track duplicate callbacks and provider-ack timeout as typed reasons/events.

### M7C Receipt/ledger/query integration
Scope:
- Wire settlement/dispute/reconciliation chain into receipts and proof-ledger records.
- Extend ledger query filters for unresolved/sync-pending/provider-issue operational views.
- Keep activity/response explainability concise in English.

### M7D Tests/docs/validation closure
Scope:
- Add/update domain/orchestrator/persistence/formatter tests for M7 scenarios.
- Run requested command gate and capture exact pass/fail evidence.
- Update status/spec with M7 requirement-to-file/test mapping and explicit deferrals.

### M7 checkpoint (completed 2026-03-04)
- `M7A` done: typed settlement/dispute/reconciliation contracts added.
- `M7B` done: idempotent merge for duplicate run callbacks and typed duplicate-tracking reason codes added.
- `M7C` done: receipt + ledger + query/filter + formatter wiring completed.
- `M7D` done: targeted tests and validation command set passed.

## 16. Role Track M8 Plan (Operator Workflows, Alerts, and Governance Console)
Execution mode:
- Tight scope, additive compatibility, no orchestrator rewrite.
- Reuse durable ledger/receipt/governance chains from M5-M7.
- Keep surfacing internal/admin/debug-facing in this pass.

### M8A Typed operator/governance case models
Scope:
- Add typed case/queue/alert/action/filter/console models in domain contracts.
- Keep all new fields backward-compatible and defaulted.
- Extend bridge contracts with typed case query and console summary APIs.

### M8B Case derivation + filtering + priority + alert aggregation
Scope:
- Derive operator cases from typed durable ledger records and canonical reason-family signals.
- Support unresolved/sync-pending/provider-issue/mismatch queue families.
- Add explicit priority scoring and next-action suggestions.
- Add typed alert aggregation from durable facts (not UI-only heuristics).

### M8C Internal governance console surface + operator actions
Scope:
- Add internal governance console panel in Activity developer path.
- Show queue filters, case rows, and case detail for selected case.
- Surface role/provider/settlement/dispute/reconciliation/sync/policy snapshot/reason families in concise English.
- Add lightweight local actions:
  - mark reviewed
  - copy/export summary
  - retry sync intent (stub with durable trace)
  - open receipt/ledger trail

### M8D Formatter/readability hardening + tests
Scope:
- Add governance case formatter for concise operator-facing English.
- Add tests for:
  - typed model serialization
  - case derivation/filtering/priority/alerts
  - console readability formatting
  - mixed old/new ledger compatibility

### M8E Validation + docs/status closure
Scope:
- Run requested validation command set.
- Repair failures.
- Update status/spec/plan with explicit requirement-to-file/test mapping and defer notes.

### M8 acceptance
- Durable records can be turned into typed governance cases.
- Unresolved/sync-pending/provider-issue queues are usable.
- Operators can inspect triage-ready case detail in one internal surface.
- Alerts and priorities are readable and derived from durable facts.
- Tests and requested validations pass or blockers are precisely documented.

### M8 checkpoint (completed 2026-03-04)
- `M8A` done: typed governance case/queue/alert/action/filter/console contracts and bridge API extensions landed.
- `M8B` done: orchestrator derives queue-prioritized governance cases + alert clusters from durable ledger truth.
- `M8C` done: Activity internal governance console queue/detail surface and local operator actions/stubs wired.
- `M8D` done: formatter/readability + domain/orchestrator tests added/updated.
- `M8E` done: requested validation command gate passed and status/spec evidence updated.

## 17. Role Track M9 Plan (Remote Telemetry, Alert Delivery, Reconciliation Services Extraction)
Execution mode:
- Tight scope, additive compatibility, no orchestrator rewrite.
- Keep local-first as default runtime behavior.
- Extract typed service boundaries and durable tracking without requiring remote backend availability.

### M9A Typed remote contracts
Scope:
- Add typed domain models for:
  - telemetry envelopes/batches/delivery attempts/status records
  - alert dispatch requests/attempts/status records
  - reconciliation jobs/retry/handoff attempt/status records
- Add operator-facing remote summary contracts (`RemotePipelineSummary`, `RemoteDeliveryIssue`, filter).

### M9B Service boundary extraction
Scope:
- Add ports/adapters:
  - telemetry sink port
  - alert delivery port
  - reconciliation handoff port
- Provide safe default adapters:
  - no-op
  - local durable
  - stub/cloud-hook

### M9C Runtime derivation + idempotent tracking
Scope:
- Derive remote telemetry/alert/reconciliation records from durable run/ledger signals.
- Add dedupe/idempotent upsert merge for repeated run updates/retry actions.
- Keep receipt/ledger as source of truth even when remote delivery fails or stays local.

### M9D Persistence + operator visibility
Scope:
- Persist/restore remote pipeline records through dynamic-state persistence.
- Surface remote summary/issues in governance cases and governance console.
- Keep readable concise English output for internal/operator diagnostics.

### M9E Tests + validation + docs/status closure
Scope:
- Add/update tests for:
  - domain model serialization compatibility
  - remote pipeline derivation and dedupe behavior
  - persistence/restore continuity for remote records
  - formatter/operator readability for remote status lines
- Run required validation command set and repair failures.
- Update spec/plan/status with requirement-to-file/test evidence and defer notes.

### M9 checkpoint (completed 2026-03-04)
- `M9A` done: typed remote telemetry/alert/reconciliation contracts added.
- `M9B` done: remote-ready ports/adapters added with local-first defaults.
- `M9C` done: orchestrator derives and deduplicates durable remote pipeline records.
- `M9D` done: persistence and governance-console remote visibility landed.
- `M9E` done: required validation command gate passed and docs/status synced.

## 18. Role Track M9.5 Plan (Repo Hygiene and Stabilization)
Execution mode:
- Tight scope, additive, operational-only.
- Keep feature/runtime behavior unchanged.
- Separate hygiene edits from behavioral milestone edits.

### M9.5A Noise audit + ignore tightening
Scope:
- Audit dominant noise paths in current dirty tree.
- Tighten root and Android subproject ignore rules for generated/transient/local-only files.
- Standardize local scratch output locations.

### M9.5B Repo-local workflow discipline
Scope:
- Add/update repository-local contributor/Codex guidance for milestone-scoped edits.
- Enforce: no opportunistic broad cleanup, no mixed hygiene/behavior commits.

### M9.5C Lightweight preflight checklist
Scope:
- Add a short milestone preflight checklist:
  - diff sanity
  - artifact hygiene checks
  - baseline validations
  - status/doc sync
  - rollback safety

### M9.5D Low-risk warning policy
Scope:
- Reduce compile warning noise only when local and behavior-safe.
- Do not perform broad warning-elimination refactors in this pass.

### M9.5E Baseline status closure
Scope:
- Update spec/plan/status with:
  - changes applied
  - remaining known repo-noise risks
  - validation evidence

### M9.5 acceptance
- Ignore/workflow/preflight baseline is documented and committed.
- Local-only artifact churn is reduced for future milestones.
- No feature behavior regressions introduced by hygiene edits.
- Remaining noise risks are explicit and tracked.

## 19. Role Track M10 Plan (Remote Operator Backend, Alert Routing, Operator Collaboration)
Execution mode:
- Incremental, additive, local-first, backward-compatible.
- Reuse M8/M9 durable truth chain; do not create a parallel truth model.

### M10A Contracts + docs baseline
Scope:
- Extend domain contracts with collaboration/handoff/routing models and optional receipt/ledger/case fields.
- Extend bridge API with typed collaboration command update path.
- Update spec/plan/status baseline.

### M10B Ports/adapters + orchestrator plumbing
Scope:
- Add additive M10 ports/adapters for remote operator workflow and alert routing.
- Add orchestrator collaboration command handling, durable upsert/merge, and dedupe behavior.
- Keep legacy telemetry/alert/reconciliation ports intact.

### M10C Persistence + restore continuity
Scope:
- Persist/restore collaboration state, handoff records, and alert routing records.
- Preserve mixed-history compatibility with optional/defaulted fields.

### M10D Service/client/UI surfacing
Scope:
- Wire bridge -> backend service -> client collaboration action path.
- Add governance detail actions:
  - claim/unclaim
  - assign
  - add note
  - request follow-up
  - acknowledge handoff
- Surface collaboration/handoff/routing detail lines in governance formatter.

### M10E Tests + validation closure
Scope:
- Add/update domain/orchestrator/persistence/formatter tests for M10 paths.
- Run requested validation gate set and repair failures.
- Update status with compliance evidence and explicit deferrals.

### M10 completion checkpoint (2026-03-04)
Status:
- M10A done
- M10B done
- M10C done
- M10D done
- M10E done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## 20. Role Track M11 Plan (Remote Operator Auth, Assignment, Connector Routing Foundations)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first operation.
- Keep M10 collaboration/handoff/routing behavior intact and extend with permission/assignment/connector foundations.

### M11A Typed auth + assignment model
Scope:
- Add typed operator identity/role/permission/session concepts.
- Add typed assignment/ownership/escalation models and event records.
- Extend existing governance payloads with optional/defaulted fields only.

### M11B Permission-gated actions + denial durability
Scope:
- Enforce permission checks on material operator actions:
  - mark reviewed
  - retry sync
  - claim/release/assign/reassign/escalate
  - request follow-up
  - acknowledge handoff
- Add typed denial reasons and canonical reason codes.
- Persist denied actions in durable run events and surface in governance views.

### M11C Connector routing foundations
Scope:
- Extend typed routing target families for Slack-like/Jira-like/Zendesk-like/CRM-like/generic webhook destinations.
- Record typed connector delivery attempts/status summaries with local-first fallback.
- Keep dedupe/idempotent merge behavior for repeated routing attempts.

### M11D Console visibility + tests + docs closure
Scope:
- Surface assignee/escalation/connector delivery state in governance case detail/searchable text.
- Add/update domain/orchestrator/persistence/formatter tests for permission, assignment, escalation, routing, and compatibility.
- Run full validation gate and update status compliance matrix.

### M11 current checkpoint (2026-03-04)
Status:
- M11A done
- M11B done
- M11C done
- M11D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS

## 21. Role Track M12 Plan (Production Connector Integrations + Operator Collaboration Hardening)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first defaults.
- Reuse M11 collaboration/routing/runtime foundations.

### M12A Typed connector delivery hardening
Scope:
- Add typed connector delivery request/attempt/status/ack/failure/dead-letter/health concepts.
- Extend alert routing records with optional connector delivery evidence fields.
- Keep legacy payload decode compatibility.

### M12B Runtime connector adapter behavior
Scope:
- Strengthen destination-aware routing behavior for Slack-like/Jira-like/Zendesk-like/CRM-like/webhook targets.
- Add injectable transport path for production-style adapters without requiring live credentials.
- Keep duplicate delivery/callback handling idempotent and durable.

### M12C Collaboration + governance visibility hardening
Scope:
- Preserve and harden durable claim/assign/reassign/escalate/note/routing trails.
- Keep permission-denied operator actions runtime-enforced and durable.
- Surface connector delivery/ack/dead-letter/unresolved assignment-escalation state in governance/internal views.

### M12D Tests + docs/status closure
Scope:
- Add/update domain/orchestrator/formatter tests for:
  - destination-aware routing
  - permission denial
  - duplicate callback suppression
  - remote unavailable local-first fallback
  - escalation extra routing
  - dead-letter path
  - assignment+note+reassign durability
- Run full validation gate and update compliance evidence.

### M12 current checkpoint (2026-03-04)
Status:
- M12A done
- M12B done
- M12C done
- M12D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)
- Required scenario-to-test coverage map captured in status doc, including explicit assignment+note+reassign durable trail evidence.

## 22. Role Track M13 Plan (Remote Operator Directory, Credentialing, and Production Connector Hardening)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first operation when remote resources are missing or degraded.
- Keep existing orchestration backbone and trust gates intact.

### M13A Remote directory typed foundations
Scope:
- Add/strengthen typed remote operator directory entry/team/source concepts.
- Bind operator runtime identity resolution to directory-backed context when available, with local fallback identity.
- Persist/restore remote directory entries with mixed-history compatibility.

### M13B Remote-aware authorization hardening
Scope:
- Enforce local permission gate before remote authorization gate for collaboration actions.
- Apply remote authorization context checks with typed denial reasons.
- Ensure denied actions remain durable, queryable, and reason-coded in ledger/history.

### M13C Connector destination + credential route binding hardening
Scope:
- Resolve routing targets through typed `ConnectorRouteBinding`, `ConnectorDestination`, and `ConnectorAuthProfile`.
- Persist destination/auth/binding linkage into routing records and connector audit trails.
- Keep idempotent routing/delivery behavior and local fallback under destination/auth gaps.

### M13D Governance visibility + tests + docs/status closure
Scope:
- Surface remote authorization, operator directory identity/team, connector destination, auth profile, and operator connector audit summaries in governance and receipt formatters.
- Add/update tests for:
  - remote authorization denial durability
  - destination/auth-profile binding propagation
  - permission precedence
  - dead-letter/health evidence retention
- Run required validation command gate and update status compliance map with explicit deferred items.

### M13 current checkpoint (2026-03-04)
Status:
- M13A done
- M13B done
- M13C done
- M13D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

## 23. Role Track M14 Plan (Enterprise Identity, Directory Sync, and Credential Lifecycle Hardening)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first behavior as default.
- Keep remote denial semantics additive to local authorization semantics (no override of correct local gates).

### M14A Enterprise identity + directory-sync contracts
Scope:
- Add typed enterprise identity linkage, directory source, and directory sync status/snapshot models.
- Add optional durable fields on governance/receipt/session records for identity provenance and sync visibility.

### M14B Session/auth provenance hardening
Scope:
- Add typed session authority/freshness/provenance structures.
- Wire remote authorization results to include provenance while keeping local permission gate precedence unchanged.
- Persist and restore provenance-bearing records through existing dynamic-state path.

### M14C Credential lifecycle + route health
Scope:
- Add typed connector credential lifecycle state (healthy/expiring/expired/revoked/rotation-needed/misconfigured).
- Enforce connector route sensitivity to credential lifecycle (route block/degrade where required).
- Emit canonical reason codes for lifecycle outcomes and route blocks.

### M14D Governance visibility + tests/docs closure
Scope:
- Surface identity source, auth provenance, and credential health in governance/receipt summary formatters.
- Add/update tests for:
  - identity link + directory sync traceability
  - local-vs-remote auth provenance and fallback durability
  - credential lifecycle routing effects
  - process-death/restore continuity and mixed-history compatibility
- Run required validation command gate and update status compliance mapping.

### M14 current checkpoint (2026-03-04)
Status:
- M14A done
- M14B done
- M14C done
- M14D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

## 24. Role Track M14.5 Plan (Repo Noise Reduction and Release Baseline)
Execution mode:
- Hygiene-only, additive, reviewable.
- Do not mix major functionality changes.
- Keep runtime/orchestrator behavior untouched.

### M14.5A Inventory and classification
Scope:
- Snapshot noisy tracked/untracked/generated paths and quantify major buckets.
- Publish durable inventory at `docs/repo-noise-inventory.md`.

### M14.5B Ignore and boundary tightening
Scope:
- Tighten `.gitignore` and module-level ignore boundaries for local-only exports/transient artifacts.
- Update repository `AGENTS.md` with explicit hygiene-milestone write-boundary contract.

### M14.5C Scoped cleanup
Scope:
- Reduce transient noise from normal diff surface through ignore policy only.
- Avoid broad index migration or unrelated refactors.

### M14.5D Validation + docs/status closure
Scope:
- Run the standard validation command set.
- Update spec/plan/status with M14.5 compliance map, evidence, and intentional deferrals.

### M14.5 current checkpoint (2026-03-04)
Status:
- M14.5A done
- M14.5B done
- M14.5C done
- M14.5D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

## 25. Role Track M15 Plan (Enterprise SSO, SCIM, IdP, and Credential Vault Integration)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first behavior when enterprise remote integrations are unavailable.
- Reuse existing governance/receipt surfaces; no parallel UI system.

### M15A Enterprise SSO/IdP provenance hardening
Scope:
- Add typed enterprise identity assertion and session provenance concepts.
- Attach provenance to session/auth/runtime records and keep local authorization precedence.

### M15B SCIM-like directory sync semantics
Scope:
- Add typed directory update/error semantics for SCIM-like sync events.
- Surface freshness/error/degraded states in governance/receipt summaries.

### M15C Vault-backed credential lifecycle integration
Scope:
- Add typed vault credential reference/status/rotation semantics.
- Bind connector route eligibility to vault + credential lifecycle states with explicit typed block reasons.

### M15D Route/auth visibility + tests/docs closure
Scope:
- Surface enterprise identity/auth/directory/vault state in governance and receipt formatter outputs.
- Add/update tests for typed compatibility, degraded/blocked paths, and local fallback continuity.
- Run required validation command gate and update status compliance map with deferrals.

### M15 current checkpoint (2026-03-04)
Status:
- M15A done
- M15B done
- M15C done
- M15D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (device: `SM-X916B - 16`, 8 tests)

## 26. Role Track M16 Plan (Production Enterprise Rollout Controls, Secret Vault Backend, and Cutover Readiness)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first behavior and existing precedence semantics.
- No orchestrator rewrite, no broad UI redesign, no storage rewrite.

### M16A Typed rollout/cutover/vault contract layer
Scope:
- Add typed rollout and cutover readiness models (`TenantRolloutProfile`, `WorkspaceRolloutProfile`, `ConnectorRolloutPolicy`, `CutoverReadinessSummary`, `FeatureGateDecision`).
- Add typed vault runtime semantics (`VaultResolutionResult`, `VaultHealthSummary`, `VaultLeaseHandle`, material/health fields).
- Extend receipt/governance/routing payloads with optional rollout/cutover/vault/fallback fields.

### M16B Runtime gating/degradation integration
Scope:
- Add vault runtime boundary and adapters through `VaultRuntimePort` (`NoOp`, `LocalDurable`, `Stub`).
- Make route decisions evaluate rollout stage, cutover readiness, vault resolution/health, and local fallback policy.
- Keep explicit local permission precedence intact.
- Preserve specific historical block reasons (e.g., vault lease expiry) before generic cutover block fallback.

### M16C Governance and receipt surfacing
Scope:
- Surface rollout/cutover/vault runtime/fallback summaries in execution receipt formatting.
- Surface the same summaries in governance case details/searchability.
- Keep user-facing copy concise, readable, and English-first.

### M16D Tests/docs closure
Scope:
- Add/update domain serialization coverage for M16 typed fields.
- Add/update orchestrator and persistence continuity coverage for rollout/cutover/vault/fallback traces.
- Add/update formatter tests for M16 summary visibility.
- Update spec/plan/status with compliance map and deferred items.

### M16 current checkpoint (2026-03-04)
Status:
- M16A done
- M16B done
- M16C done
- M16D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 27. Role Track M17 Plan (Enterprise SSO, SCIM, IdP Provider Rollout, and Production Vault Integration)
Execution mode:
- Incremental, additive, backward-compatible.
- Preserve local-first behavior and local permission precedence.
- Keep provider rollout stage-gated by existing rollout/cutover controls.
- No orchestrator rewrite and no broad storage/history rewrite.

### M17A IdP/SCIM provider adapter contracts
Scope:
- Add typed provider adapter semantics for enterprise IdP and SCIM-like sync providers.
- Extend enterprise summary payloads with provider config/result/health and freshness semantics.
- Keep all fields optional/defaulted for mixed-history compatibility.

### M17B Vault provider integration contracts + boundary
Scope:
- Add typed vault provider integration semantics for materialization/lease/health.
- Extend vault runtime boundary with provider-aware result path (no-op/local/stub safe defaults).
- Preserve non-leaky secret handling (metadata only in receipt/governance).

### M17C Runtime route/provenance integration
Scope:
- Feed IdP/SCIM/vault provider state into provider eligibility and route block/degrade decisions.
- Apply specific typed provider/vault reason codes before generic fallback reasons where applicable.
- Propagate enterprise/scim/vault provider provenance into receipt/governance/ledger summaries.

### M17D Tests + validation + docs/status closure
Scope:
- Add/update tests for:
  - provider auth provenance durability
  - SCIM freshness/degradation behavior
  - vault provider materialization block/degrade behavior
  - rollout-stage provider eligibility gating
  - restore continuity and mixed-history compatibility
- Run the required full validation command gate and update status compliance mapping.

### M17 validation gate
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M17 completion checkpoint (2026-03-04)
- M17A-D completed with additive/backward-compatible scope.
- Provider-specific IdP/SCIM/vault semantics now propagate through runtime routing, receipt normalization, governance case derivation, and reason-code aggregation.
- Formatter/test coverage was extended so provider provenance is visible in readable English on receipt/governance surfaces.
- Validation gate completed successfully (see status doc for per-command results and evidence map).

## 28. Role Track M18 Plan (SaaS-Grade Operator Console and Enterprise Ops UX)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse existing durable receipt/ledger/governance truth paths.
- Keep local-first compatibility and non-destructive operator actions.

### M18A Operator home and queue usability
Scope:
- Add typed operator home/queue preset/health bucket summaries.
- Add queue presets, counts, and quick scan chips in Activity governance console.
- Keep existing queue filter behavior as fallback.

### M18B Case detail and timeline usability
Scope:
- Add typed operator timeline items derived from durable run/operator trail events.
- Surface timeline in case detail with readable English event lines.
- Keep settlement/dispute/reconciliation/provider/auth/vault sections visible and compact.

### M18C Collaboration ergonomics and safe bulk actions
Scope:
- Add typed bulk action request/result contracts for safe operations.
- Implement runtime bulk handlers that call existing durable single-run actions:
  - mark reviewed
  - retry sync intent
  - copy/export summary marker path
- Add Activity selection UX and bulk action controls.

### M18D Alerts and enterprise ops drilldown closure
Scope:
- Add drilldown from alert/health buckets to affected queues/cases.
- Improve operator-readable health summaries (connector, vault, directory/auth, sync/dispute).
- Add/update tests and docs/status compliance mapping.

### M18 validation gate
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M18 completion checkpoint (2026-03-05)
- M18A-D completed with additive/backward-compatible scope.
- Operator home/queue presets/health buckets are now surfaced in Activity governance console with drill-to-filter behavior.
- Case detail now includes readable timeline items derived from durable run events + collaboration/handoff/routing overlays.
- Safe bulk triage actions are wired end-to-end (`mark reviewed`, `retry sync intent`) through typed bridge/runtime paths.
- Validation gate completed successfully on required unit/integration/device commands.

## 29. Role Track M19 Plan (Enterprise Operator Collaboration, Workflow Templates, Remote Ops Automation)
Execution mode:
- Incremental and additive.
- Preserve existing durable truth model (receipt/ledger/governance case records).
- Keep automation bounded and non-destructive.
- Keep local-first and permission-gated operator actions intact.

### M19A Typed workflow/collaboration/automation contracts
Scope:
- Add typed workflow template/run/stage/next-action models.
- Add typed collaboration artifacts (handoff/escalation/event records).
- Add typed safe automation rule/audit models.
- Keep all new fields optional/defaulted for mixed-history compatibility.

### M19B Runtime integration in orchestrator/governance mutation paths
Scope:
- Add runtime branches for:
  - `ATTACH_WORKFLOW_TEMPLATE`
  - `ADVANCE_WORKFLOW_STAGE`
  - `RUN_SAFE_AUTOMATION`
- Persist workflow/collaboration/automation artifacts through collaboration state + execution ledger records.
- Emit canonical `ROLE_*` workflow/automation reason families on material events.

### M19C Console/timeline surfacing
Scope:
- Surface workflow stage/template/next-action and latest collaboration/automation in governance case summaries/detail lines.
- Keep scanability concise and readable in English.
- Preserve fallback rendering for legacy records with no workflow context.

### M19D Tests + validation + docs/status closure
Scope:
- Add/update:
  - contract round-trip tests
  - orchestrator workflow/collaboration/automation behavior tests
  - persistence continuity tests
  - governance formatter visibility tests
- Run full required validation command gate and update spec/plan/status mapping.

### M19 completion checkpoint (2026-03-05)
- M19A done
- M19B done
- M19C done
- M19D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 30. Role Track M20 Plan (Enterprise Workflow Policies, SLA Timers, Automation Guardrails)
Execution mode:
- Incremental and additive.
- Preserve existing receipt/ledger/governance truth chain.
- Preserve local-first behavior and role precedence semantics.
- Keep automation bounded and non-destructive.

### M20A Typed policy/timer/guardrail contract baseline
Scope:
- Use typed workflow policy/timer/guardrail models already added in domain contracts:
  - `WorkflowPolicyProfile`
  - `WorkflowSlaClock` / `WorkflowSlaStatus`
  - `WorkflowStageTimerState` / `WorkflowStageTimerStatus`
  - `WorkflowEscalationTimerState` / `WorkflowEscalationTimerStatus`
  - `WorkflowAutomationGuardrailDecision` / `WorkflowAutomationEligibilityStatus`
- Ensure additive optional fields remain decode-safe for mixed old/new records.

### M20B Runtime policy evaluation hardening
Scope:
- Harden workflow transition/automation evaluation in orchestrator using typed policy/timer state.
- Support governance filtering and query dimensions for workflow + SLA/escalation/automation triage.
- Ensure SLA/escalation/automation outcomes are durable and reason-coded (canonical `ROLE_*` families).

### M20C Governance/receipt visibility hardening
Scope:
- Surface readable workflow policy + SLA/stage/escalation/automation summaries in:
  - governance case row/detail/search context
  - receipt summary lines
  - receipt export snippet fields
- Make blocked/suppressed/throttled/required-human-action states first-class visibility paths.

### M20D Tests + validation + docs/status closure
Scope:
- Add/update tests for:
  - domain compatibility for M20 typed fields
  - runtime policy/timer/guardrail behavior and filters
  - persistence continuity for workflow/timer state
  - formatter visibility/export for workflow + timer + automation summaries
- Run required validation gate and update spec/plan/status + memory notes.

### M20 completion checkpoint (2026-03-05)
- M20A done
- M20B done
- M20C done
- M20D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 31. Role Track M21 Plan (Enterprise Workflow Policy Packs, Tenant Overrides, Advanced Automation Controls)
Execution mode:
- Incremental, additive, backward-compatible.
- Keep explicit case/task constraints as highest-precedence control.
- Preserve local-first and existing trust/receipt/ledger truth chain.

### M21A Typed policy-pack and binding semantics
Scope:
- Ensure typed policy pack/version/binding semantics are runtime active.
- Keep activation-state compatibility (`ACTIVE` / `SIMULATION_ONLY`) and decode safety for old records.

### M21B Tenant/workspace override precedence
Scope:
- Ensure tenant/workspace override semantics are runtime active.
- Ensure deterministic precedence mapping and canonical reason-code emission.
- Expose override influence in governance filter/search/rendering paths.

### M21C Advanced automation controls
Scope:
- Ensure runtime evaluation applies bounded advanced controls:
  - cooldown
  - throttle windows and run caps
  - suppression windows
  - simulation-only mode
- Ensure durable/auditable outcomes for allow/block/suppress/throttle/simulation.

### M21D Visibility, continuity, and closure
Scope:
- Ensure receipt/governance/role-trace surfaces clearly expose pack/override/precedence/simulation context.
- Ensure restore/process-death continuity for M21 workflow provenance.
- Ensure scenario tests cover precedence, controls, simulation, and visibility.
- Update spec/plan/status with M21 compliance evidence.

### M21 completion checkpoint (2026-03-05)
- M21A done
- M21B done
- M21C done
- M21D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 32. Role Track M22 Plan (Enterprise Policy Rollout Safety, Simulation, Approval Governance)
Execution mode:
- Incremental, additive, backward-compatible.
- Keep explicit case/task constraints above pack/override defaults.
- Keep local-first behavior and preserve receipt/ledger truth chain.

### M22A Typed rollout-governance contract baseline
Scope:
- Add typed rollout-governance models:
  - rollout stage/mode/scope/target
  - approval requirement/state/record
  - freeze state
  - rollback record
  - rollout audit records
- Keep fields optional/defaulted for mixed old/new payload compatibility.

### M22B Runtime rollout-governance enforcement
Scope:
- Wire rollout governance into workflow policy resolution/runtime effect:
  - simulation-only
  - staged
  - enforced
  - paused/frozen
  - rolled-back
- Enforce risky transition governance:
  - simulation to enforced requires approval
  - scope expansion requires approval
- Ensure pause/freeze blocks stronger enforcement.

### M22C Approval/freeze/rollback durability and audit trails
Scope:
- Add durable action handling for rollout governance operations:
  - request/approve/deny rollout approval
  - promote/enforce rollout
  - pause/freeze/resume rollout
  - rollback rollout
  - scope expansion
- Append typed run events and collaboration timeline artifacts for rollout governance actions.

### M22D Visibility, continuity, tests, docs closure
Scope:
- Expose readable rollout/approval/freeze/rollback state in:
  - execution receipts
  - governance case detail/search summaries
  - activity/operator timeline
- Preserve restore/process-death continuity for rollout governance state.
- Add/update tests for:
  - domain compatibility
  - runtime governance transitions
  - continuity
  - formatter visibility
- Run full validation gate and update status evidence.

### M22 completion checkpoint (2026-03-05)
- M22A done
- M22B done
- M22C done
- M22D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 33. Role Track M23 Plan (Enterprise Policy Promotion, Rollout Analytics, Approval Operations)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse M20-M22 rollout governance runtime and durable ledger truth.
- Preserve explicit case/task constraints over policy-pack/override defaults.
- Preserve local-first fallback and historical non-retroactive semantics.

### M23A Typed promotion/readiness/approval-operation contracts
Scope:
- Add/strengthen typed concepts in domain contracts:
  - promotion request/decision/status/target/window
  - readiness result + blockers + recommendations + evidence summary
  - approval-operation queue item/decision/status/escalation summary
- Extend receipt/governance/ledger contracts with optional/defaulted fields only.
- Keep mixed old/new decode safe.

### M23B Rollout analytics and readiness evaluation
Scope:
- Implement bounded readiness evaluation using durable ledger/receipt truth:
  - simulation evidence coverage
  - approval friction and denial rate
  - verification/rollback/dispute instability signals
  - automation suppression/throttle/cooldown signals
- Materialize typed analytics/readiness outputs and blocker/recommendation summaries.

### M23C Runtime promotion and approval operations
Scope:
- Implement durable runtime handling for:
  - promotion request
  - promotion approve/reject
  - rollout advance/pause/resume/rollback where allowed
- Deny invalid/unsafe transitions with typed blockers and canonical reason codes.
- Append auditable run/rollout operation records without rewriting past record meaning.

### M23D Visibility + tests + docs/status closure
Scope:
- Surface promotion/readiness/blocker/recommendation/approval state in:
  - governance case details and searchable text
  - receipt summaries/export snippets
  - operator action/result text
- Add/update tests:
  - domain serialization compatibility
  - readiness evaluation + denial paths
  - promotion action durability
  - restore/process-death continuity
  - formatter readability
- Run required validation suite and update spec/plan/status with M23 compliance evidence.

### M23 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M23 completion checkpoint (2026-03-05)
- M23A done: typed promotion/readiness/approval-operation contracts are runtime-bound and backward-compatible.
- M23B done: orchestrator computes typed rollout analytics/readiness with blockers/recommendations and canonical role reason codes.
- M23C done: promotion request/approve/reject/advance actions are durable, auditable, and filterable.
- M23D done: governance/receipt/role-trace visibility and tests are updated; validation gate passed.

## 34. Role Track M24 Plan (Enterprise Policy Governance Programs, Pack Lifecycle Operations, Cross-Tenant Rollout Controls)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse M20-M23 rollout and promotion governance runtime.
- Preserve local-first safety and explicit case/task constraint precedence.
- Preserve historical non-retroactive semantics.

### M24A Typed governance program + lifecycle contracts
Scope:
- Add/strengthen typed governance-program concepts:
  - program status/scope/member targets/waves
  - blockers and recommendations
  - durable governance action trail
- Add/strengthen typed pack-lifecycle concepts:
  - lifecycle status and events
  - deprecation/retirement summaries
  - replacement-plan binding
  - adoption/drift summaries
- Keep all new fields optional/defaulted for old/new payload compatibility.

### M24B Cross-tenant summaries and readiness analytics
Scope:
- Implement cross-tenant governance summaries from durable truth:
  - adoption coverage by rollout target
  - drift counts and drift reasons
  - exemption and pinning counts
  - blocker/recommendation summaries
- Produce concise summary lines for governance/receipt/operator consumption.

### M24C Runtime governance/lifecycle actions
Scope:
- Implement durable runtime handling for:
  - wave stage advance/pause
  - tenant/workspace exemption add/remove
  - tenant/workspace pin/unpin
  - pack deprecate/retire
  - replacement plan attach
- Deny invalid/unsafe transitions with typed blockers/reason codes.
- Append auditable run/rollout event records.

### M24D Visibility + tests + docs/status closure
Scope:
- Surface program/lifecycle/cross-tenant state in:
  - governance case line/detail/search
  - execution receipt summary/export
  - role impact reason translation
- Add/update tests:
  - domain serialization compatibility
  - runtime action and denial behavior
  - restore/process-death continuity
  - formatter visibility/readability
- Run validation suite and update spec/plan/status with explicit M24 map.

### M24 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M24 current checkpoint (2026-03-05)
- M24A done
- M24B done
- M24C done
- M24D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 35. Role Track M25 Plan (Enterprise Policy Estate Analytics, Drift Remediation, and Lifecycle Governance Operations)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse M20-M24 durable policy/governance truth.
- Preserve local-first safety and explicit case/task constraints over pack/override defaults.
- Preserve historical non-retroactive semantics.

### M25A Typed estate snapshot and drift model
Scope:
- Add/strengthen typed concepts for:
  - estate snapshot and lifecycle health
  - drift records and severity
  - blocker summaries
  - replacement/retirement readiness summaries
- Keep all new fields optional/defaulted for mixed old/new compatibility.

### M25B Runtime analytics and remediation generation
Scope:
- Compute estate analytics from durable truth (not UI-only state):
  - adoption and drift buckets
  - blocker counts and lifecycle readiness
  - remediation recommendations with explainable reason codes
- Add/strengthen typed remediation plan/action records and status transitions.

### M25C Safe remediation actions and governance integration
Scope:
- Implement safe durable runtime actions where allowed:
  - attach remediation plan
  - acknowledge blocker
  - schedule remediation
  - apply safe remediation
- Keep operations non-destructive and auditable in ledger/run events.
- Support governance filtering by:
  - drift severity
  - remediation status
  - blocked-only state.

### M25D Visibility + tests + docs/status closure
Scope:
- Surface policy-estate summary/drift/blocker/remediation status in:
  - governance case line/detail/search text
  - execution receipt summary/export
  - role reason readable mapping
- Add/update tests for:
  - domain serialization compatibility
  - orchestrator runtime durability/filterability
  - formatter readability and required-field presence
  - continuity/mixed-history compatibility
- Run validation suite and update spec/plan/status with explicit M25 map.

### M25 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M25 current checkpoint (2026-03-05)
- M25A done
- M25B done
- M25C done
- M25D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 36. Role Track M26 Plan (Enterprise Policy Estate Automation, Scheduled Remediation, and Governance Program Operations)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse M20-M25 durable policy/governance truth.
- Preserve local-first safety and explicit case/task constraints precedence.
- Preserve historical non-retroactive semantics.

### M26A Typed automation/scheduling contracts
Scope:
- Add/strengthen typed concepts for:
  - estate automation rule/eligibility
  - suppression/cooldown/maintenance window
  - scheduled remediation plan/target/execution/result
  - governance program operation status
  - automation replay/cancellation summaries
- Keep all new fields optional/defaulted for mixed old/new compatibility.

### M26B Runtime eligibility and scheduling guardrails
Scope:
- Compute automation eligibility from durable analytics/blockers/lifecycle/governance truth.
- Enforce runtime guardrails:
  - suppression
  - cooldown
  - maintenance window
  - approval-required block on auto-apply
- Keep safe-only automation behavior explicit and reason-coded.

### M26C Scheduled remediation/governance operation runtime behavior
Scope:
- Implement durable runtime handling for:
  - `SCHEDULE_POLICY_ESTATE_REMEDIATION`
  - `PAUSE_POLICY_ESTATE_REMEDIATION`
  - `RESUME_POLICY_ESTATE_REMEDIATION`
  - `CANCEL_POLICY_ESTATE_REMEDIATION`
  - `APPLY_SAFE_POLICY_ESTATE_REMEDIATION`
- Append durable run events/reason codes and preserve filterability/queryability.

### M26D Visibility + continuity + tests + docs/status closure
Scope:
- Surface M26 summaries in:
  - governance case line/detail/search text
  - execution receipt summary/export
  - role reason readable mapping
- Add/update tests for:
  - domain serialization compatibility
  - orchestrator runtime durability/filterability
  - restore/process-death continuity
  - formatter readability and required-field presence
- Update spec/plan/status with explicit M26 compliance map and open-loop/decision-log notes.

### M26 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M26 current checkpoint (2026-03-05)
- M26A done
- M26B done
- M26C done
- M26D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 37. Role Track M27 Plan (Enterprise Policy Estate Scheduling Windows, Rollout Calendars, and Multi-Stage Automation Governance)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse M20-M26 durable policy/governance truth.
- Preserve local-first behavior and explicit case/task constraint precedence.
- Preserve historical non-retroactive semantics.

### M27A Typed scheduling/calendar contracts
Scope:
- Add/strengthen typed concepts for:
  - policy scheduling windows and status
  - rollout calendar entries and status
  - execution-window decisions and block reasons
  - calendar evaluation result and next-eligible timing
- Keep all new fields optional/defaulted for mixed old/new compatibility.

### M27B Runtime schedule evaluation and stage timing
Scope:
- Evaluate schedule/calendar at runtime for automation/remediation/rollout-stage progression.
- Enforce temporal states:
  - allowed window
  - blackout blocked
  - waiting maintenance window
  - cooldown active
  - paused/suppressed
  - expired
- Emit canonical M27 reason families and durable timeline/ledger events.

### M27C Receipt/governance/timeline visibility and filtering
Scope:
- Surface schedule-aware summaries in:
  - execution receipts
  - governance case lines/details/search text
  - role impact formatter output
- Extend governance filtering with schedule-aware dimensions where practical:
  - blocked/deferred/eligible/expired/paused/waiting-maintenance.

### M27D Continuity/tests/docs/status closure
Scope:
- Add/update tests for:
  - domain serialization compatibility for M27 types
  - runtime schedule decisions and stage progression
  - restore/process-death continuity
  - formatter readability and required field presence
  - schedule-aware filter behavior
- Update spec/plan/status with explicit M27 compliance mapping and deferred items.

### M27 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M27 current checkpoint (2026-03-05)
- M27A done
- M27B done
- M27C done
- M27D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 38. Role Track M28 Plan (Enterprise Rollout Waves, Calendar-Aware Promotion Operations, and Cross-Window Governance Controls)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse M20-M27 durable policy/governance truth; do not introduce parallel truth models.
- Preserve local-first behavior, trust/precedence semantics, and historical non-retroactive semantics.

### M28A Typed wave/window/cross-window contracts
Scope:
- Add/strengthen typed rollout wave entities:
  - wave status/completion/progress
  - partial completion and carry-forward state
  - wave window assignment and next eligible window summary
- Add/strengthen typed calendar-aware promotion decisions:
  - promote/defer/carry-forward/expire/block/pause/resume decisions
  - eligibility/block reasons and approval dependency summary
- Add/strengthen typed cross-window governance controls:
  - pause/hold/resume state
  - hold reason and effective window range
- Keep new fields optional/defaulted for mixed-history compatibility.

### M28B Runtime wave/window decision behavior
Scope:
- Implement wave-order-aware runtime progression.
- Enforce and persist distinct states:
  - deferred vs blocked vs paused vs expired
  - partial completion vs carried-forward vs completed
- Compute next-window eligibility and carry-forward state from schedule/calendar decisions.
- Emit canonical M28 reason families and durable timeline/ledger events.

### M28C Receipt/governance/timeline visibility + filtering
Scope:
- Surface readable wave/window/cross-window summaries in:
  - execution receipts
  - governance case line/detail/searchable text
  - role impact formatter output
- Extend governance filtering with M28 triage dimensions:
  - wave status
  - window eligibility
  - deferred/carry-forward/expired/window-blocked/cross-window-paused/next-window-pending.

### M28D Continuity/tests/docs/status closure
Scope:
- Add/update tests for:
  - domain serialization compatibility for M28 contracts
  - runtime wave ordering, defer/expiry distinction, partial completion/carry-forward, cross-window pause/resume
  - restore/process-death continuity for M28 state
  - formatter readability and required field visibility
  - M28 governance filtering behavior
- Update spec/plan/status with explicit M28 compliance mapping and deferred items.

### M28 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M28 current checkpoint (2026-03-05)
- M28A done
- M28B done
- M28C done
- M28D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 39. Role Track M29 Plan (Enterprise Rollout Promotion Readiness, Cross-Wave Analytics, and Window-Aware Governance Operations)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse durable receipt/ledger/governance truth from M20-M28.
- Preserve local-first behavior and explicit-constraint precedence.

### M29A Typed readiness/cross-wave/window-impact contracts
Scope:
- Add/strengthen typed concepts for:
  - promotion candidate
  - readiness summary/status
  - blocker and recommendation summaries
  - cross-wave analytics summary + wave health buckets
  - window-impact summary + delay reason
  - governance operation record/status for promote/hold/defer/pause/resume/expire
- Keep new fields optional/defaulted for mixed-history compatibility.

### M29B Runtime readiness and cross-wave analytics derivation
Scope:
- Compute readiness from durable signals:
  - approval state
  - promotion blockers/recommendation
  - schedule/window eligibility
  - cross-window pause/hold state
  - carry-forward and deferred/expired wave signals
- Compute cross-wave health and repeated blocker/window-delay families.
- Emit canonical M29 reason-code families as primary structured output.

### M29C Window-aware governance operations durability
Scope:
- Produce durable promotion operation records for:
  - promote
  - hold
  - defer
  - pause
  - resume
  - expire
- Ensure operation records are replay-safe and non-retroactive.
- Surface latest operation + status in rollout/governance summaries.

### M29D Visibility/tests/docs/status closure
Scope:
- Surface readiness/blocker/window-impact/cross-wave summaries in:
  - governance case line/detail/search
  - execution receipt summaries/export snippets
  - role reason-code readable mapping
- Add/update tests for:
  - domain serialization compatibility
  - readiness and cross-wave analytics derivation
  - window-aware operation durability
  - restore/process-death continuity
  - formatter readability coverage
- Update spec/plan/status with explicit M29 compliance mapping.

### M29 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M29 current checkpoint (2026-03-05)
- M29A done
- M29B done
- M29C done
- M29D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 40. Role Track M30 Plan (Enterprise Rollout Program Coordination, Multi-Program Prioritization, and Escalation Operations)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse durable receipt/ledger/governance truth from M20-M29.
- Preserve local-first behavior, explicit-constraint precedence, and existing rollout/window semantics.

### M30A Typed coordination/priority/dependency/conflict/contention/escalation contracts
Scope:
- Add/strengthen typed concepts for:
  - program priority and deterministic decision trace
  - dependency/conflict/contention summaries
  - escalation state and escalation records
  - cross-program governance summary
- Add optional/defaulted compatibility fields in:
  - `WorkflowPolicyRolloutState`
  - `ExecutionReceipt`
  - `GovernanceCaseSummary` / `GovernanceCaseRecord` / `GovernanceConsoleFilter`
- Add canonical M30 reason-code families as structured output.

### M30B Runtime deterministic coordination and contention-aware arbitration
Scope:
- Compute deterministic multi-program priority resolution using durable rollout evidence:
  - readiness, blockers, pause/freeze/approval state, window eligibility, contention pressure
- Emit typed dependency-blocked/conflict/contention outcomes and recommended next action.
- Preserve replay safety and non-retroactive semantics.

### M30C Escalation operations + ledger/receipt/governance visibility
Scope:
- Add typed escalation open/progress/resolved operation records.
- Emit receipt and proof-ledger events for coordination/escalation transitions.
- Surface readable M30 coordination/escalation summaries in:
  - role trace mapping
  - execution receipt lines/export summaries
  - governance case line/detail/search output

### M30D Tests/docs/status closure
Scope:
- Add/update tests for:
  - domain serialization compatibility for M30 contracts
  - priority/dependency/contention/escalation runtime behavior
  - governance filter + formatter readability coverage
  - restore/process-death continuity for M30 state
- Update spec/plan/status with explicit M30 compliance mapping.

### M30 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M30 current checkpoint (2026-03-05)
- M30A done
- M30B done
- M30C done
- M30D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 41. Role Track M31 Plan (Enterprise Governance Capacity Planning, Approval Load Balancing, and Program Portfolio Operations)
Execution mode:
- Incremental, additive, backward-compatible.
- Reuse durable receipt/ledger/governance truth from M20-M30.
- Preserve local-first behavior, explicit-constraint precedence, and hard policy gating semantics.
- Keep policy blocks and capacity blocks explicitly distinct in runtime and visibility.

### M31A Typed capacity/load/portfolio contracts
Scope:
- Add/strengthen typed concepts for:
  - governance capacity pool/scope and approval capacity budget
  - approval queue pressure and load bucket
  - balancing decision and deferral/reassign reason
  - program capacity impact and portfolio capacity summary
- Add optional/defaulted compatibility fields in:
  - `WorkflowPolicyRolloutState`
  - `ExecutionReceipt`
  - `GovernanceCaseSummary` / `GovernanceCaseRecord` / `GovernanceConsoleFilter`
- Add canonical M31 reason-code families as structured output.

### M31B Runtime capacity-aware defer/reassign/balance behavior
Scope:
- Compute capacity pressure from durable governance signals (pending approvals, escalations, deferred backlog, queue saturation hints).
- Emit typed capacity-aware outcomes:
  - proceed with sufficient capacity
  - defer due to approval capacity scarcity
  - recommend reassignment/rebalancing when eligible
  - portfolio constrained state under high contention
- Preserve strict precedence:
  - policy denial and explicit constraints remain authoritative over capacity optimization.

### M31C Receipt/governance/timeline visibility + filtering
Scope:
- Surface readable M31 summaries in:
  - role trace reason mapping
  - execution receipt lines/export snippet
  - governance case line/detail/search output
- Extend governance filtering with M31 triage dimensions:
  - capacity pressure bucket
  - capacity blocked only
  - balancing applied only
  - approval load hotspot only
  - portfolio constrained only

### M31D Tests/docs/status closure
Scope:
- Add/update tests for:
  - domain serialization compatibility for M31 contracts
  - runtime policy-vs-capacity decision separation
  - capacity defer/reassign/balance derivation
  - governance filter + formatter readability coverage
  - restore/process-death continuity for M31 state
- Update spec/plan/status with explicit M31 compliance mapping.

### M31 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M31 current checkpoint (2026-03-05)
- M31A done
- M31B done
- M31C done
- M31D done

Validation closure:
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest` -> PASS
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest` -> PASS
- `./gradlew :app-backend-host:assembleDebug` -> PASS
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest` -> PASS
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest` -> PASS (`SM-X916B - 16`, 8 tests)

## 42. Role Track M32 Plan (Enterprise Governance Portfolio Simulation, Scenario Planning, and Capacity Forecast Operations)
Execution mode:
- Additive, deterministic, local-first.
- No orchestrator rewrite.
- No BPM/workflow DSL.
- No broad console redesign.
- Simulation outputs are durable overlays and do not mutate historical truth.

### M32A Typed contracts + simulation bridge APIs
Scope:
- Add typed scenario/snapshot/run/forecast/comparison/state contracts:
  - `PortfolioScenarioDefinition`
  - `PortfolioScenarioAssumptionSet`
  - `PortfolioScenarioModification` + `PortfolioScenarioModificationType`
  - `BaselinePortfolioSnapshot`, `BaselineCapacitySnapshot`, `BaselineProgramStateSnapshot`, `BaselineWaveStateSnapshot`
  - `PortfolioSimulationRunRecord` + `PortfolioSimulationRunStatus`
  - `ForecastTimeBucket`, `ApprovalDemandForecast`, `QueuePressureForecast`, `ProgramCompletionForecast`, `WindowEligibilityForecast`
  - `PortfolioForecastBreachSignal`, `PortfolioScenarioComparison`, `PortfolioSimulationSummary`, `PortfolioSimulationState`
- Add simulation API methods:
  - `getPortfolioSimulationState(userId, query)`
  - `savePortfolioScenario(userId, scenario)`
  - `runPortfolioScenario(userId, scenarioId)`
  - `comparePortfolioSimulationRuns(userId, baselineRunId, candidateRunId)`
  - `exportPortfolioSimulationSummary(userId, runId)`
- Add canonical reason families:
  - `ROLE_PORTFOLIO_SIMULATION_RUN_CREATED`
  - `ROLE_PORTFOLIO_SIMULATION_BASELINE_DERIVED`
  - `ROLE_PORTFOLIO_SIMULATION_CAPACITY_BREACH_PREDICTED`
  - `ROLE_PORTFOLIO_SIMULATION_BACKLOG_GROWTH_PREDICTED`
  - `ROLE_PORTFOLIO_SIMULATION_COMPLETION_DELAY_PREDICTED`
  - `ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_SHIFT_WINDOW`
  - `ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_REDUCE_WAVE_SIZE`
  - `ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY`

### M32B Baseline snapshot derivation
Scope:
- Derive baseline only from durable governance truth (ledger/receipt/governance case outputs).
- Deterministic normalization:
  - stable sort by `programId/waveId/runId`
  - UTC day-bucket alignment
  - explicit fallback values for missing legacy fields.
- Keep baseline extraction local/in-process and replay-safe.

### M32C Deterministic simulation engine + persistence continuity
Scope:
- Horizon: 14 daily buckets.
- Forecast outputs:
  - approval demand
  - queue pressure
  - backlog growth
  - completion and window eligibility.
- Bounded modifications (clamped and recorded):
  - wave/window shift `-3..+3`
  - wave/cohort size `-50%..+50%`
  - capacity `-50%..+100%`
  - bounded allocation weights
  - simulation-only automation control toggles.
- Persist and restore:
  - scenario definitions
  - simulation runs
  - scenario comparisons.

### M32D Internal operator surface + export + tests/docs closure
Scope:
- Add compact Activity governance "Portfolio Simulation" block:
  - create scenario (bounded controls)
  - run
  - compare
  - export summary snippet.
- Ensure readable English output for breach, pressure, backlog trend, completion/window forecast, and top recommendation.
- Complete tests and update docs/status with requirement-to-evidence map.

### M32 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M32 current checkpoint (2026-03-05)
- M32A done
- M32B done
- M32C done
- M32D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 43. Role Track M33 Plan (Enterprise Governance Portfolio Optimization, Multi-Objective Tradeoffs, and Risk-Aware Scheduling)
Execution mode:
- Additive, bounded, deterministic, local-first.
- Reuse durable governance truth from M31/M32 and existing receipt/governance surfaces.
- No orchestrator rewrite.
- No BPM/workflow DSL.
- No destructive automation.
- Optimization remains advisory until explicitly selected.

### M33A Typed optimization contracts + bridge APIs
Scope:
- Add typed optimization request/result/state contracts:
  - `PortfolioOptimizationRequest`
  - `PortfolioOptimizationObjectiveProfile`, `PortfolioOptimizationObjectivePreset`, `PortfolioOptimizationObjectiveFamily`, `PortfolioOptimizationObjectiveWeight`
  - `PortfolioOptimizationConstraintProfile`, `PortfolioOptimizationConstraintPreset`, `PortfolioOptimizationConstraintFamily`, `PortfolioOptimizationConstraint`
  - `PortfolioOptimizationScenarioSet`, `PortfolioOptimizationSolverConfig`
  - `PortfolioOptimizationResult`, `PortfolioOptimizationCandidateSchedule`, `PortfolioOptimizationCandidateScore`
  - `PortfolioOptimizationBindingConstraintSummary`, `PortfolioOptimizationTradeoffExplanation`, `PortfolioOptimizationParetoFrontierSummary`
  - `PortfolioOptimizationDecisionRecord`, `PortfolioOptimizationSummary`, `PortfolioOptimizationState`, `PortfolioOptimizationQuery`
- Add optimization API methods:
  - `getPortfolioOptimizationState(userId, query)`
  - `savePortfolioOptimizationRequest(userId, request)`
  - `runPortfolioOptimization(userId, requestId)`
  - `selectPortfolioOptimizationSchedule(userId, resultId, candidateId, operatorId)`
  - `exportPortfolioOptimizationSummary(userId, resultId)`
- Add canonical reason families:
  - `ROLE_PORTFOLIO_OPTIMIZATION_RUN_CREATED`
  - `ROLE_PORTFOLIO_OPTIMIZATION_CANDIDATE_GENERATED`
  - `ROLE_PORTFOLIO_OPTIMIZATION_SCHEDULE_SELECTED`
  - `ROLE_PORTFOLIO_OPTIMIZATION_*_CONSTRAINT_BOUND`
  - `ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_*`

### M33B Bounded solver implementation
Scope:
- Implement a local-first bounded solver over durable governance truth.
- Deterministic seeding is required.
- Generate top-N unique candidates rather than a single opaque recommendation.
- Enforce hard constraints:
  - window eligibility / blackout / maintenance
  - capacity and approval load
  - dependency ordering
  - readiness gating
  - guardrails / safe automation
  - risk-concurrency limits.
- Keep solver runtime bounded with explicit caps on horizon, iterations, and candidate count.

### M33C Explainability + selection + persistence continuity
Scope:
- Score candidates across bounded objective families:
  - throughput
  - risk
  - SLA
  - fairness
  - stability
  - operator friction / approval load
  - critical-path protection.
- Emit per-candidate explainability:
  - objective score breakdown
  - binding constraint summaries
  - readable tradeoff explanations.
- Support explicit schedule selection with durable decision records.
- Persist and restore:
  - optimization requests
  - optimization results
  - optimization decision selections.

### M33D Internal visibility + export + tests/docs closure
Scope:
- Add compact internal governance optimization surface for save/run/select/export.
- Surface concise readable optimization summaries in governance summary/export paths.
- Add/update tests for:
  - contract serialization compatibility
  - seeded solver determinism
  - windows/capacity/dependency/guardrail enforcement
  - risk-aware scheduling behavior
  - top-N uniqueness + tradeoff explanation coverage
  - schedule-selection durability and restore continuity.
- Update spec/plan/status with explicit M33 compliance mapping and deferrals.

### M33 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M33 current checkpoint (2026-03-05)
- M33A done
- M33B done
- M33C done
- M33D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 34. Role Track M34 Plan (Closed-Loop Learning for Portfolio Optimization)
Execution mode:
- Extend the existing M33 `PortfolioOptimization*` surface; do not create a parallel subsystem.
- Keep learning local-first, deterministic, auditable, and manual-control-first.
- Bind every request/result/decision/outcome/drift/tuning record to a calibration snapshot id so historical meaning is frozen.

### M34A Typed feedback/drift/tuning contracts + bridge APIs
Scope:
- Add typed learning contracts:
  - `PortfolioOptimizationCalibrationSnapshot`
  - `PortfolioScheduleOutcomeRecord`
  - `PortfolioExecutionObservation`
  - `PortfolioApprovalLatencyObservation`
  - `PortfolioWindowUtilizationObservation`
  - `PortfolioRiskIncidentObservation`
  - `PortfolioConstraintBindingObservation`
  - `PortfolioOptimizationDriftSummary`
  - `PortfolioDriftSignal`
  - `PortfolioPredictionVsActualDelta`
  - `PortfolioOptimizationTuningSuggestion`
  - `PortfolioOptimizationTuningDecisionRecord`
  - `PortfolioOptimizationParameterCalibration`
- Extend additive M33 request/result/decision/summary/query/state fields with snapshot, drift, and tuning context.
- Add APIs:
  - `recordPortfolioOptimizationOutcome(userId, decisionId, observations)`
  - `applyPortfolioOptimizationTuning(userId, suggestionId, operatorId, operatorName)`
  - `denyPortfolioOptimizationTuning(userId, suggestionId, operatorId, operatorName, reason)`

### M34B Deterministic outcome ingest + drift detection
Scope:
- Materialize a default per-user calibration snapshot from M33 normalized weights and default parameter multipliers.
- On outcome ingest:
  - derive actual observations from durable governance truth
  - merge optional manual typed observations
  - compute drift immediately rather than lazily on read.
- Drift families:
  - on-time execution
  - approval latency
  - missed/expired windows
  - readiness delay
  - risk incidents
  - predicted-vs-actual binding constraints.
- Severity thresholds:
  - `LOW >= 0.10`
  - `MEDIUM >= 0.20`
  - `HIGH >= 0.35`
  - `CRITICAL >= 0.50`

### M34C Guarded tuning + calibration snapshot lineage
Scope:
- Generate suggestions only when evidence thresholds are met:
  - at least `3` outcomes under the active snapshot
  - one `HIGH/CRITICAL` latest signal or two `MEDIUM` signals in the same family across the latest `5` outcomes.
- Tunable targets remain bounded:
  - objective family weights
  - approval latency penalty
  - readiness delay penalty
  - window miss penalty
  - risk incident penalty.
- Guardrails:
  - objective delta cap `±1`
  - parameter delta cap `±0.20`
  - minimum evidence threshold
  - maximum `2` applies per snapshot lineage over `7` days
  - risk-regression protection.
- Apply creates a new calibration snapshot with lineage; deny is durable; there is no auto-apply path.

### M34D Persistence + visibility + tests/docs closure
Scope:
- Persist and restore:
  - calibration snapshots
  - outcomes
  - drift summaries
  - tuning suggestions
  - tuning decision records.
- Extend the internal Activity governance optimization card with:
  - record latest outcome
  - apply latest suggestion
  - deny latest suggestion
  - active calibration / drift / tuning summary lines.
- Extend readable governance summary, receipt, export, and role-reason translations for `ROLE_PORTFOLIO_LEARNING_*`.
- Add/update tests for:
  - contract round-trip + mixed-history decode
  - deterministic drift computation
  - suggestion thresholds
  - guardrail blocks
  - deterministic ranking/score impact after tuning apply
  - decision/outcome/drift/tuning restore continuity
  - formatter readability for drift/tuning surfaces.

### M34 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M34 current checkpoint (2026-03-05)
- M34A done
- M34B done
- M34C done
- M34D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 35. Role Track M35 Plan (Multi-Tenant Objective Profiles, Learning Isolation, and Safe Propagation Rules)
Execution mode:
- Extend the existing M33/M34 `PortfolioOptimization*` surface rather than introducing a parallel subsystem.
- Keep scope resolution, isolation, propagation, and adoption deterministic, local-first, auditable, and additive.
- Preserve precedence: explicit task constraints and role policy remain above objective profile guidance.

### M35A Typed scope/binding/provenance contracts + bridge APIs
Scope:
- Add typed objective-profile scoping and provenance contracts:
  - `PortfolioOptimizationLearningScope`
  - `PortfolioOptimizationObjectiveProfileBinding`
  - `PortfolioOptimizationObjectiveProfileProvenanceType`
  - `PortfolioOptimizationLearningProvenanceSummary`
  - `PortfolioOptimizationLearningIsolationMode`
  - `PortfolioOptimizationLearningIsolationPolicy`
  - `PortfolioOptimizationObjectiveProfileSnapshot`
- Add typed propagation contracts:
  - `PortfolioOptimizationPropagationRule`
  - `PortfolioOptimizationPropagationApprovalRequirement`
  - `PortfolioOptimizationPropagationEligibilityStatus`
  - `PortfolioOptimizationPropagationBlockReason`
  - `PortfolioOptimizationLearningIsolationDecision`
  - `PortfolioOptimizationLearningPatch`
  - `PortfolioOptimizationPropagationAttemptRecord`
  - `PortfolioOptimizationPropagationApprovalRecord`
  - `PortfolioOptimizationPropagationAdoptionRecord`
- Add APIs:
  - `propagatePortfolioOptimizationObjectiveProfile(userId, sourceObjectiveProfileSnapshotId, targetScope, operatorId, operatorName)`
  - `approvePortfolioOptimizationPropagation(userId, attemptId, approverId, approverName)`
  - `rejectPortfolioOptimizationPropagation(userId, attemptId, approverId, approverName, reason)`

### M35B Deterministic objective-profile resolution + isolation enforcement
Scope:
- Bind requests/results/decisions/outcomes/drift/tuning to objective profile snapshots in addition to calibration snapshots.
- Resolve active objective profile by fixed precedence:
  - `USER`
  - `WORKSPACE`
  - `TENANT`
  - `GLOBAL_BASELINE`
- Materialize scope bindings with resolved user/workspace/tenant context.
- Enforce same-tenant isolation by default and keep source binding context preserved during propagation.

### M35C Bounded propagation rules + approval/adoption durability
Scope:
- Support only bounded propagation rules:
  - `USER -> WORKSPACE`
  - `WORKSPACE -> TENANT`
  - `TENANT -> GLOBAL_BASELINE` disabled by default.
- Emit durable propagation attempts with:
  - patch deltas
  - isolation decisions
  - approval requirement
  - block/suppression reasons.
- Approval and rejection must be explicit and durable; adoption creates a new higher-scope objective profile snapshot with provenance.

### M35D Drift-triggered suppression + visibility/tests/docs closure
Scope:
- When `HIGH/CRITICAL` drift lands on a source lineage:
  - suppress pending/adopted propagation attempts on that lineage
  - mark adoptions `REVIEW_REQUIRED`
  - preserve explicit suppression reasons.
- Extend governance/internal/receipt/export surfaces with:
  - active objective profile scope/provenance/summary
  - latest propagation summary
  - pending/review-required propagation counts
  - readable `ROLE_LEARNING_*` reason translations.
- Add/update tests for:
  - objective profile precedence resolution
  - cross-tenant contamination prevention via scope-preserving propagation/isolation
  - approval-gated propagation and durable adoption
  - drift-triggered suppression + review-required marking
  - contract round-trip + mixed-history decode
  - restore continuity for objective profile and propagation state
  - formatter readability for scope/provenance/propagation output.

### M35 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M35 current checkpoint (2026-03-05)
- M35A done
- M35B done
- M35C done
- M35D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 36. Role Track M36 Plan (Cross-Device Learning Sync, Federated Aggregation Boundaries, and Enterprise Privacy Controls)
Execution mode:
- Extend the existing M33/M34/M35 `PortfolioOptimization*` surface rather than introducing a parallel sync subsystem.
- Keep sync artifact-based, deterministic, local-first, auditable, and additive.
- Preserve M35 tenant isolation and M34 snapshot non-rewrite semantics.

### M36A Typed sync/privacy/federation contracts + bridge APIs
Scope:
- Add typed sync/privacy/federation/conflict contracts:
  - `PortfolioOptimizationLearningSyncMode`
  - `PortfolioOptimizationLearningSyncDirection`
  - `PortfolioOptimizationLearningSyncStatus`
  - `PortfolioOptimizationLearningSyncArtifactType`
  - `PortfolioOptimizationLearningSyncIssueType`
  - `PortfolioOptimizationLearningSyncConflictResolution`
  - `PortfolioOptimizationLearningDeviceClass`
  - `PortfolioOptimizationLearningSyncPrivacyPolicy`
  - `PortfolioOptimizationLearningSyncRedactionPolicy`
  - `PortfolioOptimizationFederatedAggregationBoundaryType`
  - `PortfolioOptimizationFederatedAggregationBoundary`
  - `PortfolioOptimizationFederatedAggregationGroupKey`
  - `PortfolioOptimizationFederatedAggregationRule`
  - `PortfolioOptimizationLearningSyncProvenance`
  - `PortfolioOptimizationLearningSyncIssue`
  - `PortfolioOptimizationOutcomeAggregate`
  - `PortfolioOptimizationFederatedAggregationSummary`
  - `PortfolioOptimizationLearningSyncArtifactEnvelope`
  - `PortfolioOptimizationLearningSyncEnvelope`
  - `PortfolioOptimizationLearningSyncConflictRecord`
  - `PortfolioOptimizationLearningSyncAttemptRecord`
- Add bridge/service/orchestrator APIs:
  - `exportPortfolioOptimizationLearningSyncEnvelope(userId, objectiveProfileSnapshotId, calibrationSnapshotId, mode, operatorId, operatorName)`
  - `importPortfolioOptimizationLearningSyncEnvelope(userId, envelope, operatorId, operatorName)`

### M36B Artifact-only sync + privacy/role-policy gating
Scope:
- Allowlist only redacted learning artifacts for export/import:
  - objective profile snapshots
  - calibration snapshots
  - drift summaries
  - outcome aggregates
  - federated aggregation summaries.
- Enforce runtime privacy/role gates before non-local sync:
  - local-only stays default
  - `PARENT` and role-policy-local-only modes block cloud sync
  - raw content/raw prompts/evidence refs/operator names remain redacted.

### M36C Federated boundaries + deterministic conflict handling
Scope:
- Introduce typed federated boundaries/group keys:
  - user/device
  - tenant
  - enterprise integration.
- Keep cross-tenant aggregation blocked by default.
- Implement deterministic conflict behavior:
  - objective/calibration snapshot mismatch => review required
  - drift summary mismatch => deterministic last-write-wins
  - federated aggregation summary => safe merge only.

### M36D Persistence/visibility/tests/docs closure
Scope:
- Persist envelopes, attempts, conflicts, and federated aggregation summaries through process death.
- Extend governance/internal/receipt/export visibility with:
  - sync mode/status/conflict summary
  - privacy summary
  - federation boundary summary
  - federated aggregation summary.
- Add/update tests for:
  - contract round-trip + mixed-history decode
  - privacy gating + `PARENT` role blocking
  - cross-tenant boundary enforcement
  - deterministic conflict handling and safe merge behavior
  - restore continuity for sync/federation state
  - formatter readability for sync/federation reason lines and summaries.

### M36 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M36 current checkpoint (2026-03-06)
- M36A done
- M36B done
- M36C done
- M36D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 37. Role Track M37 Plan (Remote Learning Transport Integration, Enterprise Consent Flows, and Compliance Audit Export)
Execution mode:
- Extend the existing M33/M34/M35/M36 `PortfolioOptimization*` surface rather than introducing a parallel compliance subsystem.
- Keep runtime local-first, deterministic, auditable, and additive.
- Treat remote transport as an optional boundary with `NoOp` default, not a required platform rollout.
- Preserve M35 isolation and M36 privacy/federation gates.

### M37A Typed consent/transport/export contracts + bridge APIs
Scope:
- Add typed enterprise consent contracts:
  - `PortfolioOptimizationConsentScope`
  - `PortfolioOptimizationConsentAuthority`
  - `PortfolioOptimizationConsentPurpose`
  - `PortfolioOptimizationConsentDecision`
  - `PortfolioOptimizationLearningDataCategory`
  - `PortfolioOptimizationDataMinimizationRule`
  - `PortfolioOptimizationConsentScopeBinding`
  - `PortfolioOptimizationConsentProvenance`
  - `PortfolioOptimizationRetentionPolicy`
  - `PortfolioOptimizationConsentRecord`
  - `PortfolioOptimizationEnterprisePrivacyPolicySummary`
- Add typed remote transport contracts:
  - `PortfolioOptimizationRemoteLearningTransportMode`
  - `PortfolioOptimizationRemoteLearningDeliveryStatus`
  - `PortfolioOptimizationRemoteLearningTransportIssueType`
  - `PortfolioOptimizationRemoteLearningTransportIssue`
  - `PortfolioOptimizationRemoteLearningArtifactRef`
  - `PortfolioOptimizationRemoteLearningEnvelope`
  - `PortfolioOptimizationRemoteLearningBatch`
  - `PortfolioOptimizationRemoteLearningAckRecord`
  - `PortfolioOptimizationRemoteLearningTransportAttemptRecord`
- Add typed compliance audit export contracts:
  - `PortfolioOptimizationComplianceAuditExportFormat`
  - `PortfolioOptimizationComplianceAuditExportStatus`
  - `PortfolioOptimizationComplianceAuditExportRedactionPolicy`
  - `PortfolioOptimizationComplianceAuditExportRequest`
  - `PortfolioOptimizationComplianceAuditReceiptItem`
  - `PortfolioOptimizationComplianceAuditGovernanceItem`
  - `PortfolioOptimizationComplianceAuditHashSummary`
  - `PortfolioOptimizationComplianceAuditExportBundle`
  - `PortfolioOptimizationComplianceAuditExportAccessRecord`
  - `PortfolioOptimizationComplianceAuditExportResult`
- Add bridge/service/orchestrator APIs:
  - `recordPortfolioOptimizationConsent(userId, consent)`
  - `revokePortfolioOptimizationConsent(userId, consentId, operatorId, operatorName, reason)`
  - `dispatchPortfolioOptimizationRemoteLearningTransport(userId, envelopeId, purpose, operatorId, operatorName)`
  - `requestPortfolioOptimizationComplianceAuditExport(userId, request)`

### M37B Consent + role-policy gating and optional remote transport
Scope:
- Enforce consent + role-policy gating for:
  - M36 learning sync export/import
  - remote learning transport dispatch
  - compliance audit export generation.
- Keep remote transport boundary optional:
  - add `RemoteLearningTransportPort`
  - default to `NoOpRemoteLearningTransportPort`
  - support bounded local/durable or stub ack behavior without building a remote backend.
- Persist typed blocked/queued/local-only/acked/failed attempt records with idempotency metadata.

### M37C Redaction-first audit export + restore continuity
Scope:
- Build local compliance export bundles containing:
  - redacted artifact summaries
  - receipt/governance audit summaries
  - hash summaries
  - count summaries
  - consent linkage and export provenance.
- Do not export raw prompts/messages by default.
- Persist consent records, remote envelopes/batches/attempts, and compliance export requests/results through process death.
- Keep mixed old/new history compatibility by defaulting absent M37 fields safely.

### M37D Visibility/tests/docs closure
Scope:
- Extend governance/internal/receipt/export visibility with:
  - consent summary and decision
  - remote transport summary and status
  - compliance audit export summary and status
  - enterprise privacy summary.
- Add readable reason translations for:
  - `ROLE_CONSENT_*`
  - `ROLE_REMOTE_LEARNING_TRANSPORT_*`
  - `ROLE_COMPLIANCE_EXPORT_*`
- Add/update tests for:
  - contract round-trip + mixed-history decode
  - consent-denied blocking for sync/transport/export
  - `PARENT` or restricted role-policy cloud blocking
  - local-first `NoOp` transport durability
  - redaction-first compliance audit export behavior
  - restore continuity for consent/transport/export state
  - governance/receipt/reason formatter readability.

### M37 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M37 current checkpoint (2026-03-06)
- M37A done
- M37B done
- M37C done
- M37D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 38. Role Track M38 Plan (Remote Transport Connectors (Production), Enterprise Key Management, and End-to-End Compliance Controls)
Execution mode:
- Extend the M37 remote-learning transport boundary rather than introducing a parallel transport/control subsystem.
- Keep runtime local-first, deterministic, auditable, and additive.
- Preserve M35 isolation, M36 privacy/federation boundaries, and M37 redaction-first consent/export behavior.

### M38A Typed connector, key, credential, and compliance models
Scope:
- Add typed connector runtime concepts:
  - `PortfolioOptimizationRemoteTransportConnectorType`
  - `PortfolioOptimizationRemoteTransportConnectorHealthStatus`
  - `PortfolioOptimizationRemoteTransportFailureReason`
  - `PortfolioOptimizationRemoteTransportRetryPolicy`
  - `PortfolioOptimizationRemoteTransportConnectorProfile`
  - `PortfolioOptimizationRemoteTransportConnectorBinding`
  - `PortfolioOptimizationRemoteTransportDeliveryResult`
  - `PortfolioOptimizationRemoteTransportDeadLetterRecord`
- Add typed enterprise key/credential concepts:
  - `PortfolioOptimizationEnterpriseKeyStatus`
  - `PortfolioOptimizationEnterpriseKeyUsagePolicy`
  - `PortfolioOptimizationEnterpriseKeyReference`
  - `PortfolioOptimizationTransportCredentialBlockReason`
  - `PortfolioOptimizationTransportCredentialResolutionResult`
- Add typed compliance transport concepts:
  - `PortfolioOptimizationComplianceGateDecision`
  - `PortfolioOptimizationComplianceBlockReason`
  - `PortfolioOptimizationComplianceGateResult`
  - `PortfolioOptimizationComplianceTransportSummary`
- Extend additive query/summary/state surfaces so connector/key/compliance state is filterable and restore-safe.

### M38B Runtime connector selection, gating, and delivery flow
Scope:
- Make connector selection a real runtime step through `RemoteLearningTransportPort.inspect(...)`.
- Enforce runtime delivery gates across:
  - consent
  - role policy
  - privacy policy
  - connector health
  - enterprise key state
  - credential resolution
  - compliance gate decision.
- Support durable bounded delivery states:
  - `ACKED`
  - `DEDUPED`
  - `RETRY_SCHEDULED`
  - `DEAD_LETTERED`
  - `LOCAL_FALLBACK`
  - `BLOCKED`.

### M38C Persistence, visibility, and continuity
Scope:
- Persist connector profiles, enterprise key references, dead-letter records, and enriched transport attempts through `PersistedDynamicState`.
- Keep mixed old/new history compatible by defaulting missing M38 fields safely.
- Extend governance/internal/receipt/export readability with:
  - connector summary
  - enterprise key summary
  - compliance gate summary
  - local fallback and dead-letter indicators.

### M38D Tests, docs, and validation closure
Scope:
- Add/update tests for:
  - contract round-trip + mixed-history decode of connector/key/compliance state
  - production connector selection and durable summary propagation
  - dedupe handling
  - key-state local fallback behavior
  - retry exhaustion + dead-letter durability
  - restore continuity for connector/key/dead-letter state
  - governance/receipt/reason formatter readability.

### M38 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M38 current checkpoint (2026-03-06)
- M38A done
- M38B done
- M38C done
- M38D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 39. Role Track M39 Plan (Policy-Safe Remote Learning Destinations, Data Residency Controls, and Compliance Export Routing)
Execution mode:
- Extend the M37/M38 learning transport and audit export surfaces rather than introducing a parallel routing subsystem.
- Keep runtime local-first, deterministic, auditable, and additive.
- Preserve M35 isolation, M36 privacy/federation boundaries, M37 consent/export controls, and M38 connector/key/compliance gating.

### M39A Typed destination, residency, and export-route models
Scope:
- Add typed destination-routing concepts:
  - `PortfolioOptimizationRemoteDestinationType`
  - `PortfolioOptimizationRemoteDestinationPolicy`
  - `PortfolioOptimizationRemoteDestinationProfile`
  - `PortfolioOptimizationRemoteDestinationDecisionStatus`
  - `PortfolioOptimizationRemoteDestinationBlockReason`
  - `PortfolioOptimizationRemoteDestinationEligibility`
  - `PortfolioOptimizationRemoteDestinationDecisionRecord`
- Add typed residency/jurisdiction concepts:
  - `PortfolioOptimizationResidencyRegion`
  - `PortfolioOptimizationJurisdiction`
  - `PortfolioOptimizationResidencyBoundary`
  - `PortfolioOptimizationDataResidencyPolicy`
- Add typed compliance export-route concepts:
  - `PortfolioOptimizationComplianceExportRouteStatus`
  - `PortfolioOptimizationComplianceExportRouteRecord`
- Extend additive query/summary/state/receipt/governance surfaces so destination/residency outcomes are filterable and restore-safe.

### M39B Runtime route selection, residency enforcement, and local fallback
Scope:
- Make route selection a real runtime step for:
  - remote learning transport dispatch
  - compliance audit export routing.
- Evaluate routing gates across:
  - consent
  - role policy
  - privacy policy
  - destination policy
  - residency boundary
  - jurisdiction posture
  - connector health
  - key state
  - credential health.
- Support durable bounded route outcomes:
  - `ROUTED`
  - `REROUTED`
  - `HELD_FOR_COMPLIANCE`
  - `SUPPRESSED`
  - `LOCAL_ONLY_FALLBACK`
  - `BLOCKED_BY_RESIDENCY`
  - `BLOCKED_BY_JURISDICTION`
  - `BLOCKED_BY_DESTINATION_POLICY`.
- Ensure objective-profile lineage checks and same-tenant boundaries use resolved scope binding, not raw baseline/global snapshot bindings.

### M39C Persistence, visibility, and continuity
Scope:
- Persist remote destination profiles, destination decision records, and compliance export-route records through `PersistedDynamicState`.
- Keep mixed old/new history compatible by defaulting missing M39 fields safely.
- Extend governance/internal/receipt/export readability with:
  - destination summary
  - residency summary
  - compliance export route summary
  - explicit reroute/hold/suppress/local-only/policy-block visibility.

### M39D Tests, docs, and validation closure
Scope:
- Add/update tests for:
  - contract round-trip + mixed-history decode of destination/residency/export-route state
  - residency mismatch rerouting to local-first fallback
  - jurisdiction review hold for compliance audit export
  - route/summary continuity across restore
  - governance/receipt/export formatter readability for destination/residency/route lines and M39 reasons
  - compatibility of sync/export routing when objective profiles resolve from baseline/global snapshots.

### M39 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M39 current checkpoint (2026-03-06)
- M39A done
- M39B done
- M39C done
- M39D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 40. Role Track M40 Plan (Enterprise Data Exchange Governance, Safe Destination Bundles, and Cross-Boundary Audit Operations)
Execution mode:
- Extend the M37/M38/M39 remote transport and compliance export surfaces rather than introducing a parallel exchange-governance subsystem.
- Keep runtime local-first, deterministic, auditable, and additive.
- Preserve M35 isolation, M36 privacy/federation boundaries, M37 consent/export controls, M38 connector/key/compliance gating, and M39 destination/residency routing.

### M40A Typed bundle, boundary, decision, approval, and audit models
Scope:
- Add typed bundle and artifact concepts:
  - `PortfolioOptimizationSafeDestinationBundleType`
  - `PortfolioOptimizationDataExchangeArtifactClass`
  - `PortfolioOptimizationDataExchangeArtifactRef`
  - `PortfolioOptimizationSafeDestinationBundle`
  - `PortfolioOptimizationDestinationBundlePolicy`
- Add typed compatibility, manifest, and decision concepts:
  - `PortfolioOptimizationDestinationBundleCompatibilityStatus`
  - `PortfolioOptimizationDestinationBundleDecisionStatus`
  - `PortfolioOptimizationDestinationBundleCompatibility`
  - `PortfolioOptimizationDestinationBundleSplitResult`
  - `PortfolioOptimizationDestinationBundleRedactionResult`
  - `PortfolioOptimizationDataExchangeRerouteSummary`
  - `PortfolioOptimizationDestinationBundleDecisionRecord`
  - `PortfolioOptimizationDataExchangeBoundarySummary`
  - `PortfolioOptimizationDataExchangeManifest`
  - `PortfolioOptimizationDataExchangeManifestStatus`
  - `PortfolioOptimizationDataExchangeHoldReason`
- Add typed cross-boundary approval and audit concepts:
  - `PortfolioOptimizationCrossBoundaryApprovalStatus`
  - `PortfolioOptimizationCrossBoundaryApprovalRecord`
  - `PortfolioOptimizationCrossBoundaryAuditOperationType`
  - `PortfolioOptimizationCrossBoundaryAuditResult`
  - `PortfolioOptimizationCrossBoundaryAuditIssue`
  - `PortfolioOptimizationCrossBoundaryAuditRecommendation`
  - `PortfolioOptimizationCrossBoundaryAuditRecord`
- Extend additive query/summary/state/receipt/governance surfaces so bundle outcomes are filterable and restore-safe.

### M40B Runtime bundle evaluation and allow/split/reroute/hold/block behavior
Scope:
- Make bundle evaluation a real runtime step for:
  - remote learning transport dispatch
  - compliance audit export routing.
- Evaluate bundle gates across:
  - consent
  - role policy
  - privacy policy
  - residency
  - jurisdiction
  - destination policy
  - connector health
  - key state
  - credential health
  - compliance policy.
- Support durable bounded bundle outcomes:
  - `ALLOWED`
  - `SPLIT`
  - `REROUTED`
  - `HELD`
  - `SUPPRESSED`
  - `BLOCKED`.
- Keep learning transport artifact-only and redacted.
- Keep receipt traces and governance summaries local-only for compliance exchanges when bundle policy requires splitting.

### M40C Persistence, visibility, and continuity
Scope:
- Persist safe destination bundles, bundle decision records, manifests, cross-boundary approval records, and cross-boundary audit records through `PersistedDynamicState`.
- Keep mixed old/new history compatible by defaulting missing M40 fields safely.
- Extend governance/internal/receipt/export readability with:
  - bundle summary
  - boundary summary
  - approval summary
  - audit summary
  - explicit split/reroute/hold/suppress/block visibility.
- Group additive receipt visibility into a nested summary object when necessary to avoid JVM constructor/signature limits while preserving runtime readability.

### M40D Tests, docs, and validation closure
Scope:
- Add/update tests for:
  - contract round-trip + mixed-history decode of bundle/decision/manifest/approval/audit state
  - rerouted local-only fallback transport decisions under bundle policy pressure
  - held compliance export decisions with approval/audit evidence
  - split compliance export decisions when some artifact classes must remain local
  - restore continuity for bundle, approval, and audit state
  - governance/receipt/export formatter readability for bundle/boundary/approval/audit lines and M40 reasons.

### M40 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M40 current checkpoint (2026-03-06)
- M40A done
- M40B done
- M40C done
- M40D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 42. Role Track M42 Plan (Enterprise Cross-Boundary Governance Portfolios, Trust Tier Programs, and Jurisdiction-Aware Rollout Coordination)
Execution mode:
- Keep M42 additive on top of M39/M40 exchange governance and M41 destination/jurisdiction program state.
- Derive portfolio coordination from durable routing/approval/audit truth rather than introducing a separate orchestration subsystem.
- Preserve local-first, consent/privacy/residency/compliance protections and explicit task/role-policy precedence.

### M42A Typed portfolio, trust-tier, and jurisdiction coordination models
Scope:
- Add typed M42 records for:
  - destination trust-tier assignments
  - cross-boundary program records
  - cross-boundary governance portfolios
  - trust-tier program summaries
  - jurisdiction rollout plans
  - portfolio blocker summaries
  - portfolio dependency summaries
  - portfolio conflict summaries
  - portfolio priority decisions
  - portfolio coordination recommendations
  - portfolio wave-coordination records.
- Extend additive query/summary/state/receipt/governance surfaces so M42 state is filterable and snapshot-safe.

### M42B Runtime portfolio prioritization and next-action recommendations
Scope:
- Recompute portfolio coordination from durable M39/M40 destination, bundle, approval, and audit records.
- Make trust-tier and jurisdiction state influence portfolio ordering in deterministic runtime behavior.
- Produce portfolio-scoped priority decisions and next-action recommendations without rewriting the orchestrator.
- Keep shared blockers, approval contention, trust-tier sequencing, jurisdiction sequencing, and dependency conflicts durable and queryable.

### M42C Persistence, visibility, and continuity
Scope:
- Persist additive M42 collections through the existing dynamic-state path.
- Preserve restore/process-death continuity by recomputing M42 state from durable M39/M40 truth while keeping mixed old/new history compatible.
- Extend governance/internal/operator/readable export surfaces with:
  - portfolio governance summary
  - trust-tier rollout summary
  - jurisdiction rollout summary
  - blocker/conflict/dependency summary
  - next-action recommendation summary.

### M42D Tests, docs, and validation closure
Scope:
- Add/update tests for:
  - contract round-trip + mixed-history decode of M42 portfolio/trust-tier/jurisdiction state
  - runtime portfolio prioritization and recommendation derivation
  - shared blocker/dependency/conflict durability and visibility
  - restore continuity for M42 portfolio state
  - governance/receipt/reason formatter readability for M42 portfolio/trust-tier/jurisdiction lines and reasons.

### M42 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M42 current checkpoint (2026-03-06)
- M42A done
- M42B done
- M42C done
- M42D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 43. Role Track M43 Plan (Enterprise Cross-Boundary Governance Portfolio Analytics, Risk Budgeting, and Trust Tier Drift Operations)
Execution mode:
- Keep M43 additive on top of M39/M40/M42 cross-boundary routing, audit, and portfolio coordination truth.
- Derive analytics, drift, and risk budgets from durable runtime state rather than introducing a second orchestration graph.
- Preserve local-first, consent/privacy/residency/compliance protections and explicit task/role-policy precedence.

### M43A Typed portfolio analytics, drift, and risk-budget models
Scope:
- Add typed M43 records for:
  - portfolio analytics summaries
  - risk budgets and risk-budget status
  - trust-tier drift summaries and reasons
  - jurisdiction drift summaries and reasons
  - destination risk concentration summaries
  - portfolio blocker trend summaries
  - portfolio risk recommendations
  - corrective action records.
- Extend additive query/summary/state/receipt/governance surfaces so M43 state is durable, filterable, and snapshot-safe.

### M43B Runtime trust-tier/jurisdiction drift derivation and bounded risk-budget behavior
Scope:
- Recompute M43 analytics from durable M39/M40/M42 state:
  - destination profiles and decisions
  - safe destination bundles, manifests, approvals, and cross-boundary audits
  - trust-tier program records, jurisdiction rollout plans, blockers, dependencies, and conflicts.
- Derive:
  - trust-tier drift state and reasons
  - jurisdiction drift state and reasons
  - destination concentration summaries
  - blocker trend summaries
  - bounded risk-budget consumption, remaining budget, breach count, and hold semantics
  - deterministic portfolio health + trajectory state
  - safe corrective recommendations.

### M43C Durable corrective recommendations, visibility, and continuity
Scope:
- Persist additive M43 collections through the existing dynamic-state path.
- Add durable runtime recording for safe corrective actions without destructive automation.
- Preserve restore/process-death continuity by restoring persisted M43 analytics/risk-budget/drift/recommendation/corrective collections and avoiding accidental recomputation wipeouts when upstream cross-boundary source state has not been restored yet.
- Extend governance/internal/operator/readable export surfaces with:
  - portfolio analytics summary
  - trust-tier drift summary
  - jurisdiction drift summary
  - risk-budget summary/breach status
  - destination concentration + blocker trend summary
  - risk recommendation + corrective action summary
  - searchable governance-case text for M43 states.

### M43D Tests, docs, and validation closure
Scope:
- Add/update tests for:
  - contract round-trip + mixed-history decode of M43 analytics/risk-budget/drift/corrective state
  - deterministic runtime derivation of trust-tier/jurisdiction drift and risk-budget status
  - durable corrective-action recording and persistence continuity
  - governance/receipt/reason formatter readability for M43 analytics/drift/risk-budget/recommendation/corrective lines
  - governance searchable-text coverage for M43 triage fields.

### M43 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M43 current checkpoint (2026-03-06)
- M43A done
- M43B done
- M43C done
- M43D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 44. Role Track M44 Plan (Enterprise Cross-Boundary Governance Portfolio Safety Rails, Budget Guardrails, and Remediation Automation Controls)
Execution mode:
- Keep M44 additive on top of M39/M40/M42/M43 routing, audit, portfolio coordination, analytics, and risk-budget truth.
- Derive safety/budget/remediation-control state from durable runtime records rather than introducing a second orchestration or workflow graph.
- Preserve local-first, consent/privacy/residency/compliance protections and explicit task/role-policy precedence.

### M44A Typed portfolio safety, budget guardrail, and remediation-control models
Scope:
- Add typed M44 records for:
  - portfolio safety states
  - budget guardrail states
  - portfolio enforcement modes
  - remediation automation states and suppression reasons
  - safety rails
  - budget guardrails
  - portfolio safety summaries
  - remediation automation controls.
- Extend additive query/summary/state/receipt/governance surfaces so M44 state is durable, filterable, and mixed-history safe.

### M44B Runtime guardrail enforcement and remediation-control behavior
Scope:
- Recompute M44 safety controls from durable M43 analytics and prior cross-boundary truth:
  - portfolio health + trajectory
  - trust-tier and jurisdiction drift
  - bounded risk-budget status/breach counts
  - destination concentration and blocker/conflict pressure
  - latest corrective actions and recommendations.
- Derive:
  - warning / soft-stop / hard-stop budget guardrail semantics
  - at-risk / guarded / quarantined / blocked portfolio safety semantics
  - remediation automation states for allowed, throttled, suppressed, cooldown-active, approval-required, and quarantined paths
  - deterministic next-action adjustments for hold, defer, tighten, split, or approval-required safe governance behavior.

### M44C Durable visibility and continuity
Scope:
- Persist additive M44 collections through the existing dynamic-state path.
- Preserve restore/process-death continuity by restoring persisted safety rails, budget guardrails, portfolio safety summaries, and remediation automation controls without rewriting prior M39-M43 truth.
- Extend governance/internal/operator/readable export surfaces with:
  - portfolio safety summary
  - budget guardrail summary
  - safety-rail summary
  - remediation automation summary
  - quarantine and approval-required visibility
  - governance-case searchable text for M44 states.

### M44D Tests, docs, and validation closure
Scope:
- Add/update tests for:
  - contract round-trip + mixed-history decode of M44 safety/budget/remediation state
  - deterministic runtime derivation of safety, guardrail, and remediation-control states
  - restore/process-death continuity for persisted M44 collections
  - governance/receipt/reason formatter readability for M44 safety/budget/remediation lines
  - governance searchable-text coverage for M44 triage fields.

### M44 validation gate (required)
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### M44 current checkpoint (2026-03-06)
- M44A done
- M44B done
- M44C done
- M44D done
- Validation gate: all commands passed (including connected Android tests on `SM-X916B - 16`, 8 tests).

## 1P. Enterprise Productization Foundation

Execution mode:
- additive productization layer only
- preserve current runtime, ledger, governance, rollout, and policy truth
- freeze Launch 14.x document expansion unless real pilot evidence appears

Scope:
- add explicit activation/environment truth
- add requester inbox shell foundation
- add tenant-admin setup / activation shell foundation
- add policy studio v1 summary shell
- add explicit demo workspace and seeded demo data
- sync `spec`, `plan`, and `status`

## 1Q. EPF-2 Pilot Activation Flows, Actor Onboarding, and Real Evidence Capture

Execution mode:
- additive activation workflow layer on top of the new enterprise shell
- preserve current runtime truth and local-first behavior

Scope:
- add durable actor readiness tracking
- add durable evidence artifact registration
- derive checklist / blockers / evidence categories / next action from those durable records
- surface activation progress in the enterprise shell

## 1R. EPF-3 Pilot Environment Binding, Actor Provisioning, and Real Evidence Handoff

Execution mode:
- additive activation-truth hardening on top of EPF-2
- preserve current runtime truth and local-first behavior

Scope:
- add durable environment binding state
- add typed actor provisioning/access state
- add durable connector activation eligibility state
- derive runtime activation-ready decision from those typed states
- surface activation-ready and blocker summaries in shell/governance views

## 1S. EPF-4 External Pilot Activation Package, Handoff, and Verified Live Evidence Intake

Execution mode:
- additive external handoff/intake layer on top of EPF-3
- preserve current runtime truth and local-first behavior

Scope:
- add durable activation package state
- add durable external artifact intake state with receive / verify / reject / promote outcomes
- promote verified real external artifacts into pilot activation truth and real evidence categories
- surface package / intake / verification progress in shell/governance views

## 1T. EPF-5 Real Pilot Activation Execution and Live Evidence Closure

Execution mode:
- use existing EPF-4 runtime behavior first
- do not add new product primitives unless a real artifact exposes a strict representation gap

Scope:
- attempt real environment binding, operator access, requester, tenant-admin/support, and real task execution through the existing EPF-4 path
- if no real artifact exists, narrow the blocker set to exact missing external inputs rather than continuing a docs-only HOLD loop

## 1U. External Pilot Activation Request Pack and Explicit Launch-State Model

Execution mode:
- docs/ops only
- no runtime changes unless a real fault domain appears

Scope:
- create the external pilot activation request pack
- define explicit state outcomes:
  - `PILOT_ACTIVATION_IN_PROGRESS`
  - `PILOT_ACCESS_PARTIALLY_AVAILABLE`
  - `PILOT_ACTIVATION_DELAYED`
  - `PILOT_NOT_STARTED`
  - `REAL_EVIDENCE_RECOVERED`
- align launch evidence / feedback / incident / closure artifacts to those states
- run the 48-hour Pilot Activation War Room against artifacts A-F only

## 1V. EPF-6 Local Multi-Actor Lab and Role-Segmented Rehearsal

Execution mode:
- additive productization only
- no orchestrator rewrite

Scope:
- add a non-pilot `local_lab` workspace mode
- let one human switch between requester/operator/tenant-admin rehearsal views
- keep every local lab artifact explicitly blocked from real pilot promotion

## 1W. EPF-7 Local Role Lab Visualization and Rehearsal UX

Execution mode:
- additive visualization layer on top of EPF-6
- no new runtime primitive

Scope:
- make local lab unmistakable in Android and web shell
- show active role, scenario, handoff/timeline, non-pilot evidence, and pilot gap clearly

## 1X. EPF-8 Standalone Enterprise Platform Frontend

Execution mode:
- additive web-front-end shell
- reuse existing product-shell truth

Scope:
- add a standalone platform view
- separate platform presentation from the mobile-style app shell
- present a workspace-first B2B collaboration surface

## 1Y. EPF-9 Enterprise Web Platform Primary Shell

Execution mode:
- additive web-entry refinement
- no runtime or Android expansion required

Scope:
- make the enterprise platform the default web shell
- keep app-style shell only as a URL-addressable compatibility surface

## 1Z. EPF-10 Role-Based Web Workspaces and Multipage Enterprise Console

Execution mode:
- additive web-platform productization
- no new governance/runtime primitive
- no Android scope expansion

Scope:
- add dedicated requester/operator/tenant-admin/workspace pages
- make those pages shareable by URL and openable in new tabs
- make seat-to-page transitions explicit in the enterprise shell
- keep all role pages on the same product-shell truth and preserve non-pilot evidence boundaries

## 1AA. EPF-11 Enterprise Account Shell and Members Access Workspace

Execution mode:
- additive web-platform productization
- no runtime or Android expansion required

Scope:
- add an enterprise account shell to the web platform header
- add a Members & Access workspace page
- make workspace participation and access posture clearer for enterprise users

## 1AB. EPF-12 Enterprise Account Shell and Role Workboards

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add role-specific workboards for requester/operator/tenant-admin pages
- make each role page read as a usable employee workspace rather than a generic shared dashboard

## 1AC. EPF-13 Collaboration Map and Identity Access Posture

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add a collaboration map to the shared workspace page
- add identity/access posture visibility to the tenant-admin page

## 1AD. EPF-14 Enterprise Sign-In Shell and Access Matrix

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add an enterprise sign-in shell to the tenant-admin page
- add an access matrix to the Members & Access page

## 1AE. EPF-15 Organization & Workspace Management Layer

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add an Organization & Workspace page
- expose organization/workspace management facts in the same platform shell

## 1AF. EPF-16 Cross-Role Workflow Board

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add a cross-role workflow board to the shared workspace page
- make requester/operator/tenant-admin participation visible side by side

## 1AG. EPF-17 Enterprise Login Entry and Workspace Directory

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add an enterprise login entry panel
- add a workspace directory with direct role-page links

## 1AH. EPF-18 Workspace Seat Assignment and Admin Action Center

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add a workspace seat assignment panel
- add an admin action center panel

## 1AI. EPF-19 Workspace Seat Detail and Management Drilldown

Execution mode:
- additive web-platform productization
- no new runtime primitive

Scope:
- add shareable member/seat drill-down state to the enterprise platform URL model
- add a focused seat detail panel with role/access/work/handoff/evidence-boundary context
- let organization/members/seat-assignment surfaces link directly into that drill-down state

## 1AJ. EPF-20 Local Role Lab Task Submission and Cross-Request Continuity

Execution mode:
- additive web-platform productization
- browser-durable local rehearsal only
- no new real-pilot primitive

Scope:
- add requester-side local-lab task submission from a pasted brief
- add browser-durable local-lab task continuity across page reloads and role pages
- merge those tasks into requester inbox, scenario, handoff/timeline, and seat detail surfaces
- keep all local-lab tasks explicitly non-pilot and non-promotable

## 1AK. Enterprise Sandbox and Guided Scenario Productization

Execution mode:
- additive enterprise-shell productization
- no new governance/runtime primitive
- no BPM / DSL

Scope:
- productize `LOCAL_ROLE_LAB` as an Enterprise Sandbox
- add sandbox landing/home surface
- add three runnable scenario templates
- add lightweight guided walkthrough, rehearsal outcome summary, and explicit demo-to-pilot gap
- keep sandbox activity clearly non-pilot on the B-end web platform

## 1AL. EPF-9 Shared Enterprise Sandbox, Trial Workspace Activation, and Multi-User Rehearsal

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no real pilot activation primitive

Scope:
- add typed trial workspace / participant / role-seat / session / trial-task concepts
- persist a shared trial workspace state for sandbox evaluation
- support bounded multi-session rehearsal semantics
- deepen task detail / receipt / approval / handoff visibility
- add visible trial-to-pilot conversion guidance while keeping the non-pilot boundary

## 1AM. EPF-10 Server-Backed Enterprise Trial Workspace and Multi-User Coordination

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- add a bounded server-side trial workspace service and APIs
- surface trial workspace truth through product-shell summary
- prefer server-backed trial summary in the platform while keeping browser fallback only as compatibility behavior
- make persistence mode and deployment blockers explicit

## 1AN. EPF-11 Shared Trial Join, Invite Claim, and Persistence Closure

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- add invite acceptance flow
- add seat claim / release semantics
- make seat claim state visible in-product
- keep persistence truth explicit during join/claim flows
- preserve non-pilot labeling and conversion guidance

## 1AO. EPF-21 Shared Trial Join Surface and Task Detail Web Experience

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- add explicit invite-code join input inside the enterprise sandbox
- add URL-deep-linkable shared trial task focus
- connect requester inbox items to shared trial task drill-down
- deepen task detail with lifecycle, receipt, missing-field, handoff, and approval-boundary visibility
- preserve strong non-pilot labeling throughout

## 1AP. EPF-22 Trial Timeline, Approval Detail, and Shareable Join Links

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- add richer trial task timeline visibility using shared activity where available
- add readable approval posture and next-action guidance
- add shareable invite-claim links for open invites
- keep all additions on the same shared trial truth and within the strict non-pilot boundary

## 1AQ. EPF-24 Standalone Trial Join Route

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- add a standalone `trial-join` route
- render a dedicated invite-claim page on that route
- preserve persistence truth and non-pilot labeling on the standalone surface

## 1AR. EPF-25 Enterprise OA Role Model and Module Productization

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- freeze the OA v1 role set in the product shell
- make navigation module-first across six OA centers
- add visible role switching and role-charter summaries for OA v1 roles
- expand the shared trial workspace to 9 seats and allow invites for all OA v1 roles
- keep all OA trial activity explicitly non-pilot

## 1AS. EPF-26 Enterprise Account, Membership, and OA Permission Closure

Execution mode:
- additive enterprise-shell productization
- B-end web platform only
- no Android/C-end work

Scope:
- expose enterprise account and membership summaries from principal/binding/session truth
- add enterprise member and role-management APIs
- expose OA module access states in-product
- add bounded enterprise member-management controls for admin roles

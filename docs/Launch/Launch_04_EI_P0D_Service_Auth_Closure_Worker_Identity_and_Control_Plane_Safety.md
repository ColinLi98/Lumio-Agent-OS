# EI-P0D Service Auth Closure, Worker Identity, and Control Plane Safety

## Goal
Close service-to-service auth, worker identity, and control-plane action provenance for the new execution substrate.

## Why this step is now
A worker/control plane without explicit service identity and authorization is not enterprise-launch-safe.

## In scope
- Service principal / worker identity types.
- Signed or typed service-auth context for claims and control-plane actions.
- Deny-by-default and break-glass-safe semantics where relevant.
- Durable audit trail for denied and allowed service-side actions.

## Out of scope
- No full enterprise IAM platform.
- No broad user-facing identity redesign.

## Required outputs
- updated docs/spec/plan/status for this step
- bounded, reviewable code changes only
- explicit compatibility statement
- step-specific tests and validation summary

## Definition of done
- Every remote execution/control-plane action has durable service identity and auth provenance.
- Unauthorized service-side actions fail closed and are auditable.

## Scope lock
- service-layer auth closure only
- additive and backward-compatible
- no full enterprise IAM platform
- no broad user-facing identity redesign
- no weakening of local-first fallback behavior

## Completed outputs
- Added typed service principal and service-auth context models to the agent-kernel execution substrate.
- Attached worker-scoped service identity to:
  - `WorkerIdentity`
  - `WorkerSessionRecord`
  - `TaskClaimRecord`
  - `TaskHeartbeatRecord`
  - `TaskExecutionTimeoutRecord`
  - `RemoteRunnerControlRequest`
- Added an injectable service-action authorizer with runtime-default worker credentials so existing task APIs remain stable while service identity becomes explicit.
- Enforced deny-by-default auth checks for:
  - claim
  - heartbeat
  - release
  - stale-claim recovery
  - remote-runner control requests
- Added break-glass validation rules that require explicit justification, approver identity, and expiry before override.
- Added durable allow/deny audit records through the authoritative execution ledger:
  - `TASK_SERVICE_AUTH_ALLOWED`
  - `TASK_SERVICE_AUTH_DENIED`
- Extended execution visibility with additive auth provenance:
  - worker principal identity in `execution_substrate.worker_summary.worker_identity`
  - durable claim/session auth context in `execution_substrate.worker_summary.claim_history`
  - projected counts for allowed, denied, and break-glass service actions in `execution_ledger.projection`
  - last service action / outcome / principal / mode / reason in `execution_ledger.projection`
- Preserved local-first safety by failing denied remote-runner control actions closed to explicit local fallback with durable denial detail and decision-id visibility.
- Preserved deterministic stale-claim recovery across restart by authorizing lease-expiry release with the current control-plane worker identity rather than the original claimant worker id.

## Changed files
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

Validation expectation:
- Run the relevant TypeScript/agent-kernel validation set when this step touches the service substrate:
  - npm run -s typecheck
  - npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts
- Keep the Android / host-side gate green when touched:
  - ./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
  - ./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
  - ./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
  - ./gradlew :app-backend-host:assembleDebug
  - ./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
  - ./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest

## Validation
- `npm run -s typecheck` -> PASS
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts` -> PASS
- Android / host-side commands not run because this step did not touch Android or host runtime files.

## Compatibility / migration
- Additive only; no migration required.
- Existing task APIs remain stable; Launch 04 extends existing execution visibility rather than replacing response contracts.
- Local-first safety semantics remain authoritative whenever remote execution/control-plane actions are denied or unavailable.

## Deferred beyond this step
- full enterprise IAM platform, token issuance, or provider-specific workload identity rollout
- identity/admin minimum closure, vault minimum closure, and connector minimum closure remain later launch steps
- broader signing, rotation, and external policy-engine integration remain deferred

## Blockers
- None.

## Final report
- changed files
- what was completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

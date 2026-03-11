# Identity and Admin Minimum Closure

## Goal
Ship one real enterprise identity/admin path for pilot launch rather than only typed identity semantics.

## Why this step is now
Typed enterprise identity semantics exist, but pilot launch still needs one real identity/admin closure.

## In scope
- One real OIDC/SSO path or equivalent enterprise identity path.
- Basic tenant/workspace admin role mapping.
- Minimal directory or provisioning closure where already supported.
- Deprovisioning/permission shrink path for pilot scope.

## Out of scope
- No full provider matrix rollout.
- No broad SaaS admin redesign.

## Required outputs
- updated docs/spec/plan/status for this step
- bounded, reviewable code changes only
- explicit compatibility statement
- step-specific tests and validation summary

## Definition of done
- A pilot customer can actually authenticate and administer the system with one supported identity path.

## Frozen pilot path implemented
- Identity provider:
  - Okta OIDC authorization-code sign-in
- Admin and directory closure:
  - durable enterprise principal, binding, session, and OIDC login-state records
  - tenant and workspace role mapping from the frozen pilot Okta group model
  - bounded directory sync ingestion for normalized or Okta-SCIM-like user/group payloads
  - deprovisioning and permission shrink that revoke or reduce access durably
- Supported service APIs:
  - `POST /api/agent-kernel/identity/oidc/authorize`
  - `POST /api/agent-kernel/identity/oidc/exchange`
  - `POST /api/agent-kernel/admin/directory-sync`

## Step outputs completed
- Added a real Okta OIDC sign-in path with durable `state` / `nonce` tracking and provider-backed authorization URL generation.
- Added provider-backed authorization-code exchange with ID-token verification, principal upsert, enterprise session issuance, and active binding resolution.
- Added basic pilot admin role mapping:
  - `TENANT_ADMIN`
  - `WORKSPACE_ADMIN`
  - `WORKSPACE_MEMBER`
- Added bounded directory/provisioning closure:
  - normalized updates or Okta-SCIM-like payload ingestion
  - durable principal/group refresh
  - permission shrink by binding deactivation when group-derived access disappears
  - deprovision and suspension paths that revoke active sessions and fail future admin actions closed
- Added memory, Postgres, Redis, and static Postgres schema support for enterprise identity/admin records.

## Pilot constraints preserved
- The implementation is additive and backward-compatible.
- Existing task APIs and local-first execution safety semantics remain unchanged.
- This step does not add a broad SaaS admin console or a full provider matrix.

## Explicitly deferred
- Full SCIM 2.0 server surface, discovery, and provider matrix rollout beyond the bounded Okta pilot ingestion path.
- Broad user-facing admin redesign, self-serve tenant setup, and generalized multi-workspace administration UX.
- SAML, additional OIDC providers, and broader directory-provider abstractions.
- Any vault, connector, compliance, deployment, or observability work that belongs to Launch 06 and later.

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


## Final report
- changed files
- what was completed
- compatibility / migration notes
- tests run
- remaining deferred items
- blockers, if any

# Enterprise Pilot Launch Remaining Steps Pack

Decision date: 2026-03-07
Owner: Codex
Launch target: controlled enterprise pilot, not broad GA

This pack freezes the remaining launch-blocking work into one finite, launch-oriented sequence from the current state to a controlled enterprise pilot.

## Controlled pilot target
- The target is a controlled enterprise pilot with bounded customer scope, bounded operator support, and explicit human review where the product already requires it.
- This roadmap does not target broad GA, self-serve onboarding, or a wide provider/connector matrix.
- A pilot may still use manual or ops-assisted controls if those controls are documented, auditable, and exercised in the final rehearsal.

## Sequencing rules
- Only steps `01` through `13` are launch-blocking after this roadmap freeze.
- Execute them in the exact order below.
- A later step does not begin implementation until the prior step's exit criteria are recorded in `docs/codex-agent-os-refactor-status.md`.
- One implementation workstream is active in code at a time.
- No new product primitives, broad UI redesign, or speculative roadmap branches may be added inside this sequence.

## Validation gates

### `G0` Docs alignment gate
- The roadmap, spec, plan, and status docs agree on the active step, its scope, and its deferred list.
- No code validation is required unless runtime files are touched.

### `G1` Release-baseline gate
- Only intended files are modified.
- No generated/transient artifacts are staged.
- Touched-area validation is recorded in status docs.

### `G2` Agent-kernel service gate
- `npm run -s typecheck`
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts`

### `G3` Android / host gate
- `./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest`
- `./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest`
- `./gradlew :app-backend-host:assembleDebug`
- `./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest`
- `./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest`

### `G4` Launch rehearsal gate
- `G1`, `G2`, and `G3` are green for the final launch candidate.
- Runbooks, operator templates, and rollback instructions are complete.
- The frozen pilot path is exercised end-to-end with no unresolved launch blocker.

## Frozen execution order

| Step | Workstream owner | Depends on | Required gate(s) | Exit criteria |
|---|---|---|---|---|
| `01` Scope Freeze and Deferred Boundaries | Product / program | `00` | `G0` | Pilot scope, supported integrations, deployment model, and deferred list are frozen in docs |
| `02` Release Baseline, Repo Hygiene, and Gating | Build / tooling / release | `01` | `G1` | Review surface is clean, transient noise is blocked, and future work is revertible and bisectable |
| `03` EI-P0C Service-Backed Worker Pool and Remote Runner Control Plane | Platform runtime | `02` | `G2` | Service-backed claim/lease/heartbeat/release semantics exist and preserve local-first fallback |
| `04` EI-P0D Service Auth Closure, Worker Identity, and Control Plane Safety | Platform security | `03` | `G2` | Service-to-service auth, worker identity, and control-plane provenance fail closed and are auditable |
| `05` Identity and Admin Minimum Closure | Security / identity | `04` | `G2`, `G3` when touched | One real enterprise identity/admin path exists with durable session, directory, and permission closure |
| `06` Vault and Credential Minimum Closure | Platform security | `05` | `G2`, `G3` when touched | One real vault-backed credential path exists with lease/renew/rotate/revoke gating and safe fallback |
| `07` Connector Platform Minimum Closure | Connector platform | `06` | `G2`, `G3` when touched | One real connector path operates through a hardened platform boundary with retry/dead-letter/audit behavior |
| `08` Authoritative Ledger and Query Model Hardening | Data / platform | `03`, `04`, `05`, `06`, `07` | `G2`, `G3` when touched | Replay-safe authoritative truth, rebuild policy, compatibility rules, and pilot query surfaces are hardened |
| `09` Observability, SRE, and Incident Baseline | SRE / platform | `08` | `G2`, `G3` when touched | Correlation, health visibility, alerting, and incident-response minimums exist for the frozen pilot path |
| `10` Compliance Execution Baseline | Compliance platform | `01`, `08`, `09` | `G2`, `G3` when touched | Compliance semantics are executable for the frozen pilot model with durable audit/export controls |
| `11` Tenant, Environment, and Region Deployment Baseline | Platform / deploy | `05`, `06`, `08`, `09`, `10` | `G2`, `G3` when touched | Tenant/env/region deployment assumptions are explicit, hardened, and rollout-safe for the pilot |
| `12` Operator Runbooks, Solution Templates, and Onboarding | Ops enablement | `11` | `G1`, `G2`, `G3` as touched | Support/runbook/template onboarding is complete for the frozen pilot workflow and deployment path |
| `13` Full Launch Rehearsal and Launch Gate | Release / program | `12` | `G4` | Final launch rehearsal passes against the frozen pilot gate with no unresolved blocker |

## Dependency interpretation
- `03` and `04` close the execution substrate before identity, vault, and connector hardening can rely on it.
- `05` through `07` close one real enterprise path rather than a provider matrix.
- `08` comes after the pilot path is real so the authoritative ledger and query model harden the actual launch path, not only scaffolding.
- `09` depends on hardened truth from `08` so observability and incident response measure the same authoritative state.
- `10` uses the pilot scope frozen in `01` plus the hardened truth and observability baseline from `08` and `09`.
- `11` hardens tenant/env/region strategy after the identity, vault, ledger, observability, and compliance assumptions are explicit enough to lock safely.
- `12` and `13` exist to prove the pilot is operable, not merely implemented.

## Pilot launch exit standard

Pilot launch is permitted only when all of the following are true:
- the launch target remains a controlled enterprise pilot and has not drifted into broad GA requirements
- steps `01` through `13` are complete in the frozen order above
- the pilot scope is frozen and the deferred list is still explicit
- the release baseline is clean and reviewable
- the execution substrate is service-backed and auth-closed
- one real identity/admin path exists
- one real vault/credential path exists
- one real connector platform path exists
- authoritative ledger/query truth is hardened and rebuild-safe
- observability, SRE, and incident-response minimums exist
- compliance execution minimums exist
- tenant/env/region deployment assumptions are explicit and exercised
- operator runbooks, solution templates, and onboarding are ready
- the full launch rehearsal passes with no unresolved blocker

## Explicitly deferred beyond pilot launch
- broad GA launch requirements
- self-serve multi-customer onboarding and generalized tenant provisioning
- shared multi-tenant productization beyond the pilot deployment baseline
- self-hosted/on-prem, hybrid, or multi-region active-active deployment models
- broad provider matrix rollout across many IdPs, SCIM providers, vault backends, or connector vendors
- broader operator UX redesign
- advanced automation layers and deeper optimization expansion
- any new product primitive not required to close the frozen pilot path

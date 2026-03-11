# M10 - Remote Operator Backend, Alert Routing Integrations, and Operator Collaboration

## Why this milestone exists

M9 extracted remote-ready service boundaries.
M8 added local operator workflows and governance console behavior.
The next step is to deepen remote/operator coordination without abandoning the local-first baseline.

This milestone moves the system from:
- local operator actions and local durable trails

to:
- typed remote operator workflow handoff
- alert routing integration boundaries
- operator collaboration state
- remote-aware governance case progress tracking

## Goal

Make operator/governance workflows remotely handoffable and collaboration-ready while preserving local-first operation and backward compatibility.

## In scope

1. Add typed remote operator workflow contracts.
2. Add typed alert routing targets and delivery-state tracking.
3. Add operator collaboration concepts on governance cases.
4. Add remote-aware case progress and handoff summaries.
5. Keep operator actions, receipts, and ledger trails durable and queryable.

## Out of scope

- full production Slack/CRM/Zendesk/Jira integration
- full remote backend rewrite
- multi-tenant SaaS operator platform
- end-user UI redesign
- payment rail rebuild
- broad storage architecture rewrite

## Product/system outcomes

After M10, the system should be able to express:
- this case was handed off remotely
- this alert was routed to a target/integration boundary
- this operator action is awaiting remote acknowledgement
- this case is being collaborated on / claimed / updated
- this remote/operator trail is visible in governance surfaces and ledger history

## Core model direction

Add or strengthen typed concepts such as:
- `OperatorAssignmentStatus`
- `OperatorAssigneeRef`
- `GovernanceCaseCollaborationState`
- `RemoteOperatorHandoffRequest`
- `RemoteOperatorHandoffRecord`
- `AlertRoutingTarget`
- `AlertRoutingAttempt`
- `AlertRoutingStatus`
- `OperatorCommentRecord` or equivalent collaboration note
- `RemoteOperatorIssue`

Exact names may vary, but the concepts should be explicit and typed.

## Workstreams

### M10A - Remote operator handoff contracts

Add typed request/record/state for handing governance cases to remote operator workflows.

Minimum concerns:
- handoff requested
- handoff accepted / pending / failed
- last attempt time
- retryability
- remote workflow reference if available
- durable case/ledger linkage

### M10B - Alert routing integration boundaries

Add typed alert routing concepts so alerts can target remote destinations through stable service boundaries.

This milestone does not require production integrations, but it should support:
- routing target type
- routing attempt status
- retry state
- failure reason
- visibility in governance/operator surfaces

### M10C - Operator collaboration state

Extend governance cases so operator workflow is not only single-user local action.

Support concepts like:
- claimed / unclaimed
- assigned / unassigned
- last reviewed by
- collaboration notes / comments
- pending remote follow-up

This can remain local/durable first if remote collaboration is stubbed, but the model should be ready.

### M10D - Governance surface integration

Expose remote/operator collaboration state in internal/governance UI surfaces.

At minimum, governance console/detail should show:
- assignee / claim state
- remote handoff state
- alert routing state
- last operator action
- collaboration notes count or summary
- remote issues summary

### M10E - Ledger and receipt traceability

Ensure remote operator handoff/routing/collaboration events become durable proof-ledger events or equivalent typed history records.

The trail should answer:
- who/what escalated the case
- whether remote handoff happened
- whether alert routing succeeded or failed
- whether the case is awaiting remote follow-up
- whether collaboration state changed

## Validation expectations

Add tests for:
- typed contract serialization
- remote handoff state transitions
- alert routing attempt/result visibility
- operator collaboration state persistence
- governance console summary/detail visibility
- ledger traceability for handoff/routing/collaboration events
- compatibility with old/new mixed records

## Suggested validation commands

```bash
./gradlew :core-domain:test --tests com.lumi.coredomain.contract.DomainContractsTest
./gradlew :core-agent:test --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest
./gradlew :core-agent:test --tests com.lumi.coreagent.bellman.BellmanSolverTest --tests com.lumi.coreagent.bellman.BellmanBridgeTest
./gradlew :app-backend-host:assembleDebug
./gradlew :app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest
./gradlew :app-backend-host:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.lumi.keyboard.ui.components.UserInteractionHubCardUiTest,com.lumi.keyboard.ui.components.ModuleFeaturePanelSupplementUiTest,com.lumi.keyboard.ui.screens.GoalWorkFlowUiTest
```

## Definition of done

- remote operator handoff is represented by typed contracts and durable records
- alert routing has typed targets/attempts/status and visible summaries
- governance cases support basic operator collaboration state
- internal governance surfaces expose remote/collaboration state clearly
- ledger/history records preserve operator handoff and routing traceability
- compatibility with local-first operation is preserved
- validation passes

## Recommended sequencing

1. M9.5 repo hygiene and stabilization
2. M10A handoff contracts
3. M10B alert routing boundaries
4. M10C collaboration state
5. M10D governance UI integration
6. M10E ledger traceability and tests

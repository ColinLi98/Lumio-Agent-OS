package com.lumi.coreagent.orchestrator

import com.lumi.coreagent.soul.DigitalSoulStore
import com.lumi.coredomain.contract.AgentDiscoveryPayload
import com.lumi.coredomain.contract.AgentExecutionPayload
import com.lumi.coredomain.contract.AgentMode
import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.AgentRequestConstraints
import com.lumi.coredomain.contract.AgentTaskConstraints
import com.lumi.coredomain.contract.AgentActionType
import com.lumi.coredomain.contract.CloudGateway
import com.lumi.coredomain.contract.CloudResult
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.InteractionEventType
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.ExternalFulfillmentPreference
import com.lumi.coredomain.contract.LeaderboardEntry
import com.lumi.coredomain.contract.LeaderboardPayload
import com.lumi.coredomain.contract.LiveSearchPayload
import com.lumi.coredomain.contract.LiveSearchItem
import com.lumi.coredomain.contract.EvidenceItemPayload
import com.lumi.coredomain.contract.ExecutionReceiptEventType
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.GateType
import com.lumi.coredomain.contract.GovernanceActionType
import com.lumi.coredomain.contract.GovernanceBulkActionRequest
import com.lumi.coredomain.contract.GovernanceCaseAssignmentEventType
import com.lumi.coredomain.contract.GovernanceAlertSeverity
import com.lumi.coredomain.contract.GovernanceCasePriority
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.GovernanceConsoleFilter
import com.lumi.coredomain.contract.GovernanceMetricKey
import com.lumi.coredomain.contract.GovernanceQueueType
import com.lumi.coredomain.contract.GovernanceQuery
import com.lumi.coredomain.contract.GovernanceReasonFamily
import com.lumi.coredomain.contract.GithubImportPayload
import com.lumi.coredomain.contract.LixExecutorPayload
import com.lumi.coredomain.contract.LixMyAgentItem
import com.lumi.coredomain.contract.LixMyAgentsPayload
import com.lumi.coredomain.contract.LixOfferAcceptPayload
import com.lumi.coredomain.contract.LixSolutionPayload
import com.lumi.coredomain.contract.LedgerQueryFilter
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.OperatorAssigneeRef
import com.lumi.coredomain.contract.OperatorCollaborationStatus
import com.lumi.coredomain.contract.OperatorIdentity
import com.lumi.coredomain.contract.OperatorPermission
import com.lumi.coredomain.contract.OperatorPermissionDenialReason
import com.lumi.coredomain.contract.OperatorQueuePreset
import com.lumi.coredomain.contract.OperatorRole
import com.lumi.coredomain.contract.PermissionScope
import com.lumi.coredomain.contract.PrivacyAction
import com.lumi.coredomain.contract.PortfolioOptimizationConstraint
import com.lumi.coredomain.contract.PortfolioOptimizationConstraintFamily
import com.lumi.coredomain.contract.PortfolioOptimizationConstraintPreset
import com.lumi.coredomain.contract.PortfolioOptimizationConstraintProfile
import com.lumi.coredomain.contract.PortfolioOptimizationObjectivePreset
import com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile
import com.lumi.coredomain.contract.PortfolioOptimizationQuery
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationRiskTolerance
import com.lumi.coredomain.contract.PortfolioOptimizationResultStatus
import com.lumi.coredomain.contract.PortfolioOptimizationScenarioSet
import com.lumi.coredomain.contract.PortfolioOptimizationSolverConfig
import com.lumi.coredomain.contract.ProviderDecisionStatus
import com.lumi.coredomain.contract.ProviderDenyReason
import com.lumi.coredomain.contract.ProofLedgerEventType
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoleChangeReason
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RoleReasonCodes
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.RollbackAttemptRecord
import com.lumi.coredomain.contract.RollbackOutcome
import com.lumi.coredomain.contract.RoutingMode
import com.lumi.coredomain.contract.RoutingDecisionPayload
import com.lumi.coredomain.contract.RoutingScoresPayload
import com.lumi.coredomain.contract.AlertRoutingTargetType
import com.lumi.coredomain.contract.AlertRoutingAttempt
import com.lumi.coredomain.contract.AlertRoutingTarget
import com.lumi.coredomain.contract.AlertRoutingStatus
import com.lumi.coredomain.contract.ConnectorDeliveryAttempt
import com.lumi.coredomain.contract.ConnectorAuthProfile
import com.lumi.coredomain.contract.ConnectorCredentialLifecycleState
import com.lumi.coredomain.contract.ConnectorCredentialLifecycleSummary
import com.lumi.coredomain.contract.ConnectorCredentialRef
import com.lumi.coredomain.contract.ConnectorCredentialStatus
import com.lumi.coredomain.contract.CredentialRouteBlockReason
import com.lumi.coredomain.contract.ConnectorDeliveryRequest
import com.lumi.coredomain.contract.ConnectorDeliveryStatus
import com.lumi.coredomain.contract.ConnectorDeliveryTarget
import com.lumi.coredomain.contract.ConnectorDestination
import com.lumi.coredomain.contract.ConnectorFailureReason
import com.lumi.coredomain.contract.ConnectorProviderType
import com.lumi.coredomain.contract.ConnectorRouteBinding
import com.lumi.coredomain.contract.GovernanceRoutingActionType
import com.lumi.coredomain.contract.RemoteOperatorHandoffStatus
import com.lumi.coredomain.contract.RemoteOperatorAuthorizationContext
import com.lumi.coredomain.contract.RemoteAuthorizationResult
import com.lumi.coredomain.contract.RemoteAuthorizationStatus
import com.lumi.coredomain.contract.SessionAuthority
import com.lumi.coredomain.contract.PolicyRolloutApprovalRequirement
import com.lumi.coredomain.contract.PolicyRolloutApprovalState
import com.lumi.coredomain.contract.PolicyRolloutAuditAction
import com.lumi.coredomain.contract.PolicyRolloutFreezeState
import com.lumi.coredomain.contract.PolicyRolloutMode
import com.lumi.coredomain.contract.PolicyRolloutScope
import com.lumi.coredomain.contract.PolicyRolloutStage
import com.lumi.coredomain.contract.PortfolioScenarioAssumptionSet
import com.lumi.coredomain.contract.PortfolioScenarioComparison
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioScenarioModification
import com.lumi.coredomain.contract.PortfolioScenarioModificationType
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.PortfolioSimulationRunStatus
import com.lumi.coredomain.contract.VaultCredentialReference
import com.lumi.coredomain.contract.VaultCredentialRotationState
import com.lumi.coredomain.contract.VaultCredentialStatus
import com.lumi.coredomain.contract.SerpStatusPayload
import com.lumi.coredomain.contract.SettlementRecord
import com.lumi.coredomain.contract.SettlementStatus
import com.lumi.coredomain.contract.SettlementSyncState
import com.lumi.coredomain.contract.SkillInvocationPayload
import com.lumi.coredomain.contract.SkillAcquisitionDecisionStatus
import com.lumi.coredomain.contract.SkillSource
import com.lumi.coredomain.contract.TavilySearchPayload
import com.lumi.coredomain.contract.TaskGraphPayload
import com.lumi.coredomain.contract.TaskGraphTaskPayload
import com.lumi.coredomain.contract.TraitScore
import com.lumi.coredomain.contract.TwinContext
import com.lumi.coredomain.contract.DisputeCaseRecord
import com.lumi.coredomain.contract.DisputeRecord
import com.lumi.coredomain.contract.DisputeStatus
import com.lumi.coredomain.contract.MarketplaceSyncIssue
import com.lumi.coredomain.contract.ProviderAckRecord
import com.lumi.coredomain.contract.ProviderAckStatus
import com.lumi.coredomain.contract.UserRole
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AgentOrchestratorTest {

    @Test
    fun handleRequest_sensitiveAppReturnsShieldUp() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(sourceApp = "com.icbc", rawText = "帮我回复一下"),
            cloudGateway = null
        )

        assertEquals(PrivacyAction.SHIELD_UP, response.privacyAction)
        assertTrue(response.cards.isNotEmpty())
    }

    @Test
    fun handleRequest_returnsThreeDrafts() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(rawText = "请帮我改写一段回复"),
            cloudGateway = null
        )

        assertTrue(response.drafts.isNotEmpty())
        assertTrue(response.drafts.size <= 3)
        assertNotNull(response.appDeeplink)
        assertNotNull(response.routingDecision)
        assertTrue(response.skillInvocations.isNotEmpty())
        assertTrue(response.skillRequirements.isNotEmpty())
        assertTrue(response.skillCandidates.isNotEmpty())
        assertTrue(response.skillAcquisitionDecisions.isNotEmpty())
    }

    @Test
    fun handleRequest_complexQueryTriggersMultiAgentMode() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(rawText = "并行协作处理机票酒店并生成行程，同时做实时搜索"),
            cloudGateway = null
        )

        assertEquals(RoutingMode.MULTI_AGENT, response.routingDecision?.mode)
        assertTrue(response.taskGraph?.tasks?.size ?: 0 >= 3)
    }

    @Test
    fun handleRequest_responseIncludesStrictGateEnvelope() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(rawText = "帮我改写一段英文邮件"),
            cloudGateway = null
        )

        assertTrue(response.nextAction.isNotBlank())
        assertTrue(response.gateDecisions.isNotEmpty())
        assertEquals(8, response.gateDecisions.size)
        assertTrue(response.gateDecisions.any { it.gate == GateType.GATE_R7_HIGH_RISK_EXECUTION_PROHIBITED })
        assertTrue(response.gateDecisions.any { it.gate == GateType.GATE_R8_DATA_AUTHENTICITY_REQUIRED })
        assertTrue(response.ownerAgent.name.isNotBlank())
        assertNotNull(response.problemFrame)
    }

    @Test
    fun handleRequest_nonLixTaskDoesNotRequireBudgetDeadlineAcceptance() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(rawText = "Plan a London to Jersey trip next Monday to Wednesday with real links"),
            cloudGateway = null
        )

        val gateR1 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R1_REQUIRE_CONSTRAINTS }
        val gateR3 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R3_BUDGET_SCOPE_GUARD }
        assertNotNull(gateR1)
        assertNotNull(gateR3)
        assertEquals("PASSED", gateR1.decision.name)
        assertEquals("PASSED", gateR3.decision.name)
        assertEquals("budget_gate_not_required", gateR3.reason)
    }

    @Test
    fun handleRequest_lixBuilderPublishRequiresLixConstraintPackage() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Publish this requirement to LIX market and find builders for a custom agent",
                module = ModuleId.CHAT
            ),
            cloudGateway = null
        )

        val gateR1 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R1_REQUIRE_CONSTRAINTS }
        val gateR3 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R3_BUDGET_SCOPE_GUARD }
        assertNotNull(gateR1)
        assertNotNull(gateR3)
        assertEquals("WAITING_USER", gateR1.decision.name)
        assertTrue(gateR1.reason.contains("missing_fields:"))
        assertEquals("WAITING_USER", gateR3.decision.name)
    }

    @Test
    fun handleRequest_highRiskExecutionIsBlockedByR7() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(rawText = "Please auto execute stock purchase now and transfer funds immediately"),
            cloudGateway = null
        )

        val gate = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R7_HIGH_RISK_EXECUTION_PROHIBITED }
        assertNotNull(gate)
        assertEquals("BLOCKED", gate.decision.name)
        assertEquals(ResponseStatus.WAITING_USER, response.status)
        assertNotNull(response.riskBoundary)
        assertTrue(response.clarificationQuestions.isNotEmpty())
    }

    @Test
    fun handleRequest_skillAcquisitionFallsBackWhenCostGateBlocksCandidates() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(
                rawText = "lix supplier negotiation",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "5000",
                    deadline = "7 days",
                    acceptanceCriteria = "evidence-backed",
                    maxCostPerStep = "low",
                    riskTolerance = "low"
                )
            ),
            cloudGateway = null
        )

        assertTrue(response.skillAcquisitionDecisions.isNotEmpty())
        assertTrue(
            response.skillAcquisitionDecisions.any {
                it.status == SkillAcquisitionDecisionStatus.FALLBACK_TO_MARKET
            }
        )
        assertNotNull(response.skillGapReport)
    }

    @Test
    fun handleRequest_multiAgentSuccessWithoutEvidenceDoesNotFinalizeDelivery() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executionPayload = AgentExecutionPayload(
                taskId = "trace_no_evidence",
                status = "success",
                resultSummary = "parallel execution completed",
                routingDecision = RoutingDecisionPayload(
                    mode = RoutingMode.MULTI_AGENT,
                    reasonCodes = listOf("required_capabilities>=3"),
                    scores = RoutingScoresPayload(complexity = 0.83, risk = 0.46, dependency = 0.77)
                ),
                taskGraph = TaskGraphPayload(
                    tasks = listOf(
                        TaskGraphTaskPayload(id = "t1", title = "Search", requiredCapabilities = listOf("live_search")),
                        TaskGraphTaskPayload(id = "t2", title = "Merge", requiredCapabilities = listOf("reasoning"))
                    )
                ),
                skillInvocations = listOf(
                    SkillInvocationPayload(skillId = "local:live_search", source = SkillSource.LOCAL)
                ),
                evidenceItems = emptyList(),
                evidence = emptyList()
            )
        )

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Please parallel execute flight + hotel + itinerary with live search. Budget: 3000; Deadline: 5 days; Acceptance criteria: evidence-backed output",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val gate = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R4_EVIDENCE_REQUIRED_FOR_SUCCESS }
        assertNotNull(gate)
        assertTrue(response.status != ResponseStatus.SUCCESS || gate.decision.name != "PASSED")
    }

    @Test
    fun handleRequest_blocksSuccessWhenEvidenceContainsUnverifiedPlaceholderLinks() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executionPayload = AgentExecutionPayload(
                taskId = "trace_unverified_links",
                status = "success",
                resultSummary = "Plan ready. Book here: https://example.com/fake-booking",
                routingDecision = RoutingDecisionPayload(
                    mode = RoutingMode.MULTI_AGENT,
                    reasonCodes = listOf("required_capabilities>=3"),
                    scores = RoutingScoresPayload(complexity = 0.81, risk = 0.42, dependency = 0.73)
                ),
                taskGraph = TaskGraphPayload(
                    tasks = listOf(
                        TaskGraphTaskPayload(id = "t1", title = "Flight search", requiredCapabilities = listOf("live_search")),
                        TaskGraphTaskPayload(id = "t2", title = "Hotel shortlist", requiredCapabilities = listOf("hotel_search"))
                    )
                ),
                evidenceItems = listOf(
                    EvidenceItemPayload(
                        source = "web",
                        title = "placeholder evidence",
                        url = "https://example.com/fake-booking"
                    )
                )
            )
        )

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Plan London to Jersey with real links. Budget: 1200; Deadline: 3 days; Acceptance criteria: real clickable links; Confirmation token: APPROVED",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val gate = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R8_DATA_AUTHENTICITY_REQUIRED }
        assertNotNull(gate)
        assertTrue(gate.decision.name == "BLOCKED" || gate.decision.name == "WAITING_USER")
        assertEquals(ResponseStatus.WAITING_USER, response.status)
        assertTrue(response.nextAction.contains("verified", ignoreCase = true) || response.nextAction.contains("link", ignoreCase = true))
    }

    @Test
    fun handleRequest_respectsRoutingScoreConfigOverrides() = runTest {
        val strictConfig = RoutingScoreConfig(
            thresholds = RoutingThresholds(
                crossDomainMin = 99,
                capabilitiesMin = 99,
                dependencyMin = 99,
                riskMin = 0.95,
                requireEvidenceOnRisk = true
            ),
            explicitMultiAgentKeywords = emptyList(),
            dependencyKeywords = emptyList(),
            highRiskKeywords = emptyList(),
            riskProfile = RoutingRiskProfile(
                highRiskScore = 0.2,
                defaultRiskScore = 0.2,
                settingsRiskScore = 0.1
            )
        )
        val orchestrator = AgentOrchestrator(
            routingScoreConfigProvider = { strictConfig }
        )
        val response = orchestrator.handleRequest(
            request = request(rawText = "并行协作处理机票酒店并生成行程，同时做实时搜索"),
            cloudGateway = null
        )

        assertEquals(RoutingMode.SINGLE_AGENT, response.routingDecision?.mode)
        assertTrue(response.routingDecision?.reasonCodes?.contains("default_single_agent") == true)
    }

    @Test
    fun handleRequest_workRoleAddsRoutingPolicyReason() = runTest {
        val strictConfig = RoutingScoreConfig(
            thresholds = RoutingThresholds(
                crossDomainMin = 99,
                capabilitiesMin = 99,
                dependencyMin = 99,
                riskMin = 0.95,
                requireEvidenceOnRisk = true
            ),
            explicitMultiAgentKeywords = emptyList(),
            dependencyKeywords = emptyList(),
            highRiskKeywords = emptyList(),
            riskProfile = RoutingRiskProfile(
                highRiskScore = 0.2,
                defaultRiskScore = 0.2,
                settingsRiskScore = 0.1
            )
        )
        val orchestrator = AgentOrchestrator(
            routingScoreConfigProvider = { strictConfig }
        )
        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Rewrite this project update and run live search for supporting links.",
                module = ModuleId.CHAT,
                constraints = AgentRequestConstraints(activeRole = UserRole.WORK)
            ),
            cloudGateway = null
        )

        assertTrue(
            response.routingDecision?.reasonCodes?.any { code ->
                code.contains("role_work_prefers_parallel_specialists")
            } == true
        )
    }

    @Test
    fun handleRequest_parentRoleBudgetGuardBlocksOverLimitEscalation() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Publish this requirement to LIX market and execute supplier contract.",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "30000",
                    deadline = "5 days",
                    acceptanceCriteria = "evidence-backed completion",
                    userConfirmationToken = "CONFIRM-PARENT-001",
                    activeRole = UserRole.PARENT
                )
            ),
            cloudGateway = null
        )

        val gateR3 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R3_BUDGET_SCOPE_GUARD }
        assertNotNull(gateR3)
        assertEquals("BLOCKED", gateR3.decision.name)
        assertEquals("budget_exceeds_role_limit", gateR3.reason)
        assertTrue(response.executionReceipt?.approvalSummary?.contains("denied", ignoreCase = true) == true)
        assertTrue(
            response.executionReceipt?.events?.any { it.type == ExecutionReceiptEventType.APPROVAL_DENIED } == true
        )
    }

    @Test
    fun handleRequest_avatarPayloadExposesResolvedActiveRole() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Open preferences and permissions. Active role: work",
                module = ModuleId.AVATAR
            ),
            cloudGateway = null
        )

        val payload = response.payload as ModulePayload.AvatarPayload
        assertEquals(UserRole.WORK, payload.activeRole)
    }

    @Test
    fun handleRequest_roleSourceTrackingSupportsExplicitInheritedInferredAndFallback() = runTest {
        val orchestrator = AgentOrchestrator()

        val explicit = orchestrator.handleRequest(
            request = request(
                rawText = "Execute this as work role.",
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )
        assertEquals(RoleSource.EXPLICIT_USER_SELECTION, explicit.roleSource)
        assertTrue(explicit.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_EXPLICIT_USER_SELECTED))

        val inherited = orchestrator.handleRequest(
            request = request(rawText = "Continue this task and refine output."),
            cloudGateway = null
        )
        assertEquals(RoleSource.TASK_INHERITED, inherited.roleSource)
        assertTrue(inherited.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_TASK_INHERITED))

        val inferred = orchestrator.handleRequest(
            request = request(
                sessionId = "s-role-infer",
                rawText = "Find the best flight options with live search.",
                constraints = AgentRequestConstraints()
            ),
            cloudGateway = null
        )
        assertEquals(RoleSource.SAFE_SYSTEM_INFERENCE, inferred.roleSource)

        val fallback = orchestrator.handleRequest(
            request = request(
                sessionId = "s-role-fallback",
                rawText = "Give me a concise summary.",
                constraints = AgentRequestConstraints()
            ),
            cloudGateway = null
        )
        assertEquals(RoleSource.SYSTEM_FALLBACK, fallback.roleSource)
        assertTrue(fallback.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_SYSTEM_FALLBACK_APPLIED))
    }

    @Test
    fun handleRequest_inferredRoleIsNonStickyAcrossNewSession() = runTest {
        val orchestrator = AgentOrchestrator()

        val inferred = orchestrator.handleRequest(
            request = request(
                sessionId = "s-infer-a",
                rawText = "Book hotels and itinerary for this trip."
            ),
            cloudGateway = null
        )
        assertEquals(RoleSource.SAFE_SYSTEM_INFERENCE, inferred.roleSource)

        val nextSession = orchestrator.handleRequest(
            request = request(
                sessionId = "s-infer-b",
                rawText = "Write a neutral update with no travel details."
            ),
            cloudGateway = null
        )
        assertTrue(nextSession.roleSource != RoleSource.TASK_INHERITED)
        assertTrue(nextSession.roleImpactReasonCodes.none { it == RoleReasonCodes.ROLE_TASK_INHERITED })
    }

    @Test
    fun handleRequest_explicitConstraintsOverrideRoleDefaultsInIntentContract() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Publish this requirement to external fulfillment.",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "300",
                    deadline = "3 days",
                    acceptanceCriteria = "evidence-backed completion",
                    maxCostPerStep = "high",
                    activeRole = UserRole.PARENT,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        val contract = payload.intentContract
        assertNotNull(contract)
        assertTrue(contract.hardConstraints.contains("budget=300"))
        assertTrue(contract.hardConstraints.contains("max_cost_per_step=high"))
        assertEquals(UserRole.PARENT, contract.activeRole)
    }

    @Test
    fun handleRequest_roleAwareDataSharingAndCloudBlockAreVisible() = runTest {
        val orchestrator = AgentOrchestrator(digitalTwinCloudSyncEnabled = true)

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Show my permissions profile.",
                module = ModuleId.AVATAR,
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.PARENT,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )

        val payload = response.payload as ModulePayload.AvatarPayload
        assertTrue(payload.dataSharingScope.any { it.contains("disabled", ignoreCase = true) })
        assertTrue(response.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_CLOUD_SYNC_BLOCKED))
        assertTrue(response.executionReceipt?.dataScopeSummary?.contains("blocked", ignoreCase = true) == true)
        assertTrue(
            response.executionReceipt?.events?.any { it.type == ExecutionReceiptEventType.DATA_SCOPE_BLOCKED } == true
        )
    }

    @Test
    fun handleRequest_midRunRoleChangeTriggersFutureReevaluationWithoutRetroactiveRewrite() = runTest {
        val orchestrator = AgentOrchestrator()

        val first = orchestrator.handleRequest(
            request = request(
                sessionId = "s-role-change",
                rawText = "Prepare this update for work context.",
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )
        assertEquals(UserRole.WORK, first.activeRole)

        val second = orchestrator.handleRequest(
            request = request(
                sessionId = "s-role-change",
                rawText = "Switch to parent role and continue with stricter safety.",
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.PARENT,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )
        assertEquals(UserRole.PARENT, second.activeRole)
        assertEquals(RoleChangeReason.USER_SWITCHED_ROLE, second.roleChangeReason)
        assertTrue(second.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_CHANGED_BY_USER))
        assertTrue(second.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_CHANGE_TRIGGERED_REEVALUATION))

        // Prior receipt/history objects must stay unchanged.
        assertEquals(UserRole.WORK, first.activeRole)
    }

    @Test
    fun handleRequest_responseAndTaskTrackExposeRoleTraceability() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(
                rawText = "Execute as buyer role and compare external options.",
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )

        assertEquals(UserRole.BUYER, response.activeRole)
        assertEquals(RoleSource.EXPLICIT_USER_SELECTION, response.roleSource)
        assertTrue(response.roleImpactReasonCodes.isNotEmpty())
        val taskTrack = (response.payload as? ModulePayload.ChatPayload)?.taskTrack
        assertNotNull(taskTrack)
        assertEquals(UserRole.BUYER, taskTrack.activeRole)
        assertEquals(RoleSource.EXPLICIT_USER_SELECTION, taskTrack.roleSource)
        assertTrue(taskTrack.roleImpactReasonCodes.isNotEmpty())
        assertNotNull(response.executionReceipt)
        assertEquals(response.traceId, response.executionReceipt?.runId)
        assertEquals(UserRole.BUYER, response.executionReceipt?.activeRole)
        assertEquals(RoleSource.EXPLICIT_USER_SELECTION, response.executionReceipt?.roleSource)
        assertNotNull(taskTrack.executionReceipt)
        assertEquals(response.traceId, taskTrack.executionReceipt?.runId)
        assertTrue(
            response.executionReceipt?.roleImpactSummary?.isNotBlank() == true
        )
    }

    @Test
    fun handleRequest_localOnlySkipsCloud() = runTest {
        val gateway = FakeGateway()
        val orchestrator = AgentOrchestrator()
        orchestrator.handleRequest(
            request = request(rawText = "机票酒店", networkPolicy = NetworkPolicy.LOCAL_ONLY),
            cloudGateway = gateway
        )

        assertEquals(0, gateway.liveSearchCount)
        assertEquals(0, gateway.discoveryCount)
    }

    @Test
    fun handleRequest_agentMarketAddsCloudCard() = runTest {
        val gateway = FakeGateway(
            discoveryPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "a1",
                        name = "Travel Agent",
                        summary = "实时旅行检索",
                        score = 0.92
                    )
                )
            )
        )
        val orchestrator = AgentOrchestrator()

        val response = orchestrator.handleRequest(
            request = request(rawText = "帮我找agent marketplace"),
            cloudGateway = gateway
        )

        assertTrue(response.cards.any { it.id.startsWith("market-") })
        assertEquals(1, gateway.discoveryCount)
    }

    @Test
    fun handleRequest_productAgentsCommandReturnsBuiltInCatalog() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(rawText = "list product agents", module = ModuleId.AGENT_MARKET),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.MarketPayload
        assertEquals("product-agent-catalog", payload.traceId)
        assertTrue(payload.candidateCount >= 8)
        assertTrue(response.summary?.contains("governance", ignoreCase = true) == true)
        assertTrue(response.cards.any { it.id.startsWith("product-agent-") })
        assertTrue(response.cards.any { it.summary.contains("phase=") && it.summary.contains("authority=") })
        assertEquals(0, gateway.discoveryCount)
    }

    @Test
    fun handleRequest_buildProductAgentsReturnsConstructionStatus() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(rawText = "build product agents", module = ModuleId.AGENT_MARKET),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.MarketPayload
        assertEquals("product-agent-build", payload.traceId)
        assertTrue(payload.candidateCount >= 8)
        assertTrue(response.summary?.contains("constructed", ignoreCase = true) == true)
        assertTrue(response.cards.any { it.id.startsWith("product-agent-build-") })
        assertEquals(0, gateway.discoveryCount)
    }

    @Test
    fun handleRequest_buildProductAgentsOverridesChatModule() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(rawText = "build product agents", module = ModuleId.CHAT),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.MarketPayload
        assertEquals(ModuleId.AGENT_MARKET, response.module)
        assertEquals("product-agent-build", payload.traceId)
        assertTrue(response.summary?.contains("constructed", ignoreCase = true) == true)
        assertEquals(0, gateway.liveSearchCount)
        assertEquals(0, gateway.discoveryCount)
    }

    @Test
    fun handleRequest_buildProductAgentsWorksWithoutCloudGateway() = runTest {
        val orchestrator = AgentOrchestrator()

        val response = orchestrator.handleRequest(
            request = request(rawText = "build product agents", module = ModuleId.CHAT),
            cloudGateway = null
        )

        val payload = response.payload as ModulePayload.MarketPayload
        assertEquals(ModuleId.AGENT_MARKET, response.module)
        assertEquals("product-agent-build", payload.traceId)
        assertTrue(payload.candidateCount >= 8)
        assertTrue(response.summary?.contains("constructed", ignoreCase = true) == true)
    }

    @Test
    fun recordInteraction_stripsRawTextPayload() {
        val soul = RecordingSoulStore()
        val orchestrator = AgentOrchestrator(soulStore = soul)

        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s",
                userId = "u",
                eventType = InteractionEventType.DRAFT_EDIT,
                payload = mapOf("rawText" to "hello", "safe" to "ok"),
                timestampMs = 1L
            )
        )

        assertFalse(soul.lastEvent!!.payload.containsKey("rawText"))
        assertEquals("ok", soul.lastEvent!!.payload["safe"])
    }

    @Test
    fun handleRequest_settingsPayloadIncludesInteractionMetrics() = runTest {
        val orchestrator = AgentOrchestrator()
        val baseTs = System.currentTimeMillis()
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                timestampMs = baseTs
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CANCEL,
                timestampMs = baseTs + 10
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.DRAFT_ACCEPT,
                timestampMs = baseTs + 20
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "打开设置观测", module = ModuleId.SETTINGS),
            cloudGateway = null
        )

        val payload = response.payload as ModulePayload.SettingsPayload
        assertEquals(1, payload.taskConfirmCount)
        assertEquals(1, payload.taskCancelCount)
        assertEquals(50, (payload.taskConfirmRate * 100).toInt())
        assertEquals(1, payload.draftAcceptCount)
        assertEquals(24, payload.eventWindowHours)
        assertNotNull(payload.lastEventAtMs)
        assertTrue(payload.moduleTaskMetrics.isNotEmpty())
        assertEquals("Uncategorized", payload.moduleTaskMetrics.first().moduleLabel)
    }

    @Test
    fun handleRequest_settingsPayloadIncludesModuleBreakdown() = runTest {
        val orchestrator = AgentOrchestrator()
        val now = System.currentTimeMillis()
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                payload = mapOf("module" to "chat"),
                timestampMs = now
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                payload = mapOf("module" to "对话"),
                timestampMs = now + 10
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CANCEL,
                payload = mapOf("module" to "LIX"),
                timestampMs = now + 20
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "查看设置观测详情", module = ModuleId.SETTINGS),
            cloudGateway = null
        )
        val payload = response.payload as ModulePayload.SettingsPayload
        val chatMetric = payload.moduleTaskMetrics.firstOrNull { it.moduleKey == "chat" }
        val lixMetric = payload.moduleTaskMetrics.firstOrNull { it.moduleKey == "lix" }

        assertNotNull(chatMetric)
        assertEquals(2, chatMetric.taskConfirmCount)
        assertEquals(0, chatMetric.taskCancelCount)
        assertEquals(100, (chatMetric.taskConfirmRate * 100).toInt())
        assertNotNull(lixMetric)
        assertEquals(0, lixMetric.taskConfirmCount)
        assertEquals(1, lixMetric.taskCancelCount)
        assertEquals(0, (lixMetric.taskConfirmRate * 100).toInt())
    }

    @Test
    fun handleRequest_settingsPayloadIncludesEdgeModelConfig() = runTest {
        val orchestrator = AgentOrchestrator(
            imeBackendV2Enabled = false,
            appFullFeatureParityEnabled = false,
            digitalTwinEdgeModelMode = "hybrid",
            digitalTwinEdgeModelVersion = "twin-lite-int8-v2",
            digitalTwinEdgeFallbackEnabled = false,
            cloudAdapterFallbackEnabled = false,
            twinSyncStatusProvider = {
                TwinSyncStatusSnapshot(
                    status = "conflict_fallback",
                    lastSyncAtMs = 1_700_000_100_000,
                    successCount = 3,
                    conflictCount = 1,
                    fallbackCount = 1,
                    lastSummary = "Conflict detected; local state remained authoritative.",
                    lastResolution = "local_authoritative_fallback",
                    lastConflictAtMs = 1_700_000_090_000,
                    lastConflictSummary = "Remote version lagged local durable state."
                )
            }
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "打开设置", module = ModuleId.SETTINGS),
            cloudGateway = null
        )

        val payload = response.payload as ModulePayload.SettingsPayload
        assertFalse(payload.imeBackendV2Enabled)
        assertFalse(payload.appFullFeatureParityEnabled)
        assertEquals("hybrid", payload.digitalTwinEdgeModelMode)
        assertEquals("twin-lite-int8-v2", payload.digitalTwinEdgeModelVersion)
        assertFalse(payload.digitalTwinEdgeFallbackEnabled)
        assertFalse(payload.cloudAdapterFallbackEnabled)
        assertEquals("conflict_fallback", payload.twinSyncStatus)
        assertEquals("local_authoritative_fallback", payload.twinSyncLastResolution)
        assertEquals("Conflict detected; local state remained authoritative.", payload.twinSyncLastSummary)
        assertEquals("Remote version lagged local durable state.", payload.twinSyncLastConflictSummary)
    }

    @Test
    fun handleRequest_settingsPayloadIncludesPortfolioLearningVisibility() = runTest {
        val orchestrator = AgentOrchestrator(
            digitalTwinCloudSyncEnabled = true
        )
        val userId = "u-portfolio-settings"
        val optimizationSummary = orchestrator.getPortfolioOptimizationState(userId).summary
            ?: error("Expected optimization summary")
        val activeSnapshotId = optimizationSummary.activeObjectiveProfileSnapshotId
            ?: error("Expected active objective profile snapshot")

        orchestrator.propagatePortfolioOptimizationObjectiveProfile(
            userId = userId,
            sourceObjectiveProfileSnapshotId = activeSnapshotId,
            targetScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
            operatorId = "op-settings",
            operatorName = "Settings QA"
        )

        val response = orchestrator.handleRequest(
            request = request(
                userId = userId,
                rawText = "show settings learning state",
                module = ModuleId.SETTINGS
            ),
            cloudGateway = null
        )

        val payload = response.payload as ModulePayload.SettingsPayload
        assertEquals(activeSnapshotId, payload.activeObjectiveProfileSnapshotId)
        assertNotNull(payload.activeObjectiveProfileScope)
        assertTrue(payload.activeObjectiveProfileSummary.isNotBlank())
        assertTrue(payload.latestPropagationSummary.isNotBlank())
        assertTrue(payload.pendingPropagationCount >= 0)
        assertTrue(payload.reviewRequiredPropagationCount >= 0)
    }

    @Test
    fun handleRequest_settingsPayloadIncludesDtoeUpliftAndCalibrationMetrics() = runTest {
        val orchestrator = AgentOrchestrator()
        val now = System.currentTimeMillis()
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                payload = mapOf(
                    "module" to "Navigation",
                    "decision_source" to "dtoe",
                    "predicted_success_prob" to "0.9"
                ),
                timestampMs = now
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                payload = mapOf(
                    "module" to "destiny",
                    "decision_source" to "dtoe",
                    "predicted_success_prob" to "0.7"
                ),
                timestampMs = now + 10
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CANCEL,
                payload = mapOf(
                    "module" to "chat",
                    "decision_source" to "baseline",
                    "predicted_success_prob" to "0.8"
                ),
                timestampMs = now + 20
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                payload = mapOf(
                    "module" to "chat",
                    "decision_source" to "baseline",
                    "predicted_success_prob" to "0.4"
                ),
                timestampMs = now + 30
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "open dtoe metrics", module = ModuleId.SETTINGS),
            cloudGateway = null
        )
        val payload = response.payload as ModulePayload.SettingsPayload

        assertEquals(2, payload.dtoeDecisionCount)
        assertEquals(2, payload.baselineDecisionCount)
        assertEquals(1.0, payload.dtoeAdoptionRate, 0.0001)
        assertEquals(0.5, payload.baselineAdoptionRate, 0.0001)
        assertEquals(0.5, payload.dtoeAdoptionUplift, 0.0001)
        assertEquals(0.45, payload.dtoeCalibrationError, 0.0001)
        assertEquals(4, payload.dtoeCalibrationSampleCount)
        assertEquals(1.0, payload.dtoeConfidenceCoverage, 0.0001)
    }

    @Test
    fun handleRequest_settingsPayloadIncludesApiHealthChecks() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(serpConfigured = false)

        val response = orchestrator.handleRequest(
            request = request(rawText = "查看 API 健康", module = ModuleId.SETTINGS),
            cloudGateway = gateway
        )
        val payload = response.payload as ModulePayload.SettingsPayload

        assertEquals(4, payload.apiTotalCount)
        assertEquals(3, payload.apiHealthyCount)
        assertEquals("degraded", payload.apiOverallStatus)
        assertTrue(payload.apiHealthChecks.any { it.checkId == "chat_live_search" })
        assertTrue(payload.apiHealthChecks.any { it.checkId == "serp_status" && it.status == "degraded" })
    }

    @Test
    fun handleRequest_homeSnapshotIncludesApiHealthMetrics() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(serpConfigured = true)

        val response = orchestrator.handleRequest(
            request = request(rawText = "刷新首页", module = ModuleId.HOME),
            cloudGateway = gateway
        )
        val payload = response.payload as ModulePayload.HomePayload
        val metrics = payload.snapshot?.keyMetrics.orEmpty()

        assertEquals("4/4", metrics["api_health"])
        assertEquals("up", metrics["api_status"])
    }

    @Test
    fun handleRequest_homeSnapshotIncludesDtoeMetrics() = runTest {
        val orchestrator = AgentOrchestrator()
        val now = System.currentTimeMillis()
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CONFIRM,
                payload = mapOf(
                    "module" to "destiny",
                    "decision_source" to "dtoe",
                    "predicted_success_prob" to "0.9"
                ),
                timestampMs = now
            )
        )
        orchestrator.recordInteraction(
            InteractionEvent(
                sessionId = "s-1",
                userId = "u-1",
                eventType = InteractionEventType.TASK_CANCEL,
                payload = mapOf(
                    "module" to "chat",
                    "decision_source" to "baseline",
                    "predicted_success_prob" to "0.2"
                ),
                timestampMs = now + 10
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "refresh home", module = ModuleId.HOME),
            cloudGateway = null
        )
        val payload = response.payload as ModulePayload.HomePayload
        val metrics = payload.snapshot?.keyMetrics.orEmpty()

        assertEquals("+100pp", metrics["dtoe_uplift_24h"])
        assertEquals("15%", metrics["dtoe_calibration_error_24h"])
        assertEquals("100%", metrics["dtoe_confidence_coverage_24h"])
    }

    @Test
    fun handleRequest_lixCustomPublishUsesStructuredFields() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()
        val customPrompt = """
            LIX发布定制需求
            需求: 帮我招聘一位北京前端工程师
            目标: 两周内到岗
            预算: 30k/月
            时限: 14天
            领域: recruitment
            请广播意图并返回候选报价
        """.trimIndent()

        val response = orchestrator.handleRequest(
            request = request(rawText = customPrompt, module = ModuleId.LIX),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertEquals("intent_custom", payload.intentId)
        assertEquals("recruitment", gateway.lastLixBroadcastDomain)
        assertTrue(gateway.lastLixBroadcastQuery?.contains("招聘一位北京前端工程师") == true)
        assertTrue(gateway.lastLixBroadcastCapabilities.contains("job_sourcing"))
        assertTrue(gateway.lastLixBroadcastCapabilities.contains("negotiation"))
    }

    @Test
    fun handleRequest_lixRoleAwareQuoteSelectionDiffersAcrossRoles() = runTest {
        val orchestrator = AgentOrchestrator()
        val offers = AgentDiscoveryPayload(
            items = listOf(
                com.lumi.coredomain.contract.AgentDiscoveryItem(
                    id = "trusted:provider_a",
                    name = "Trusted Provider A",
                    summary = "Quote ¥2600 verified rollback dispute",
                    score = 0.86
                ),
                com.lumi.coredomain.contract.AgentDiscoveryItem(
                    id = "ext:gh:provider_b",
                    name = "Budget Provider B",
                    summary = "Quote ¥700 no proof rollback dispute",
                    score = 0.92
                )
            )
        )
        val gateway = FakeGateway(
            lixOffersPayload = offers,
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent_role_split",
                status = "broadcasting",
                offersCount = 2
            )
        )

        val work = orchestrator.handleRequest(
            request = request(
                sessionId = "lix-role-work",
                rawText = "LIX发布需求: compare providers for software delivery",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "3000",
                    deadline = "7 days",
                    acceptanceCriteria = "verified delivery",
                    userConfirmationToken = "CONFIRM-WORK",
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )
        val buyer = orchestrator.handleRequest(
            request = request(
                sessionId = "lix-role-buyer",
                rawText = "LIX发布需求: compare providers for software delivery",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "3000",
                    deadline = "7 days",
                    acceptanceCriteria = "verified delivery",
                    userConfirmationToken = "CONFIRM-BUYER",
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val workPayload = work.payload as ModulePayload.LixPayload
        val buyerPayload = buyer.payload as ModulePayload.LixPayload
        val workSelected = workPayload.providerSelectionSummary?.selectedProviderName
        val buyerSelected = buyerPayload.providerSelectionSummary?.selectedProviderName

        assertNotNull(workSelected)
        assertNotNull(buyerSelected)
        assertTrue(workSelected != buyerSelected)
        assertTrue(
            workPayload.providerPolicyDecisions.any {
                it.providerName == "Budget Provider B" &&
                    it.decision == ProviderDecisionStatus.DENIED &&
                    it.denyReason == ProviderDenyReason.PROOF_REQUIREMENT_UNMET
            }
        )
        assertTrue(
            buyerPayload.providerPolicyDecisions.any {
                it.providerName == "Budget Provider B" &&
                    (it.decision == ProviderDecisionStatus.SELECTED || it.decision == ProviderDecisionStatus.ALLOWED)
            }
        )
    }

    @Test
    fun handleRequest_lixParentRoleDeniesTopProviderByRiskPolicy() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:risky_top",
                        name = "Risky Provider",
                        summary = "Quote ¥500 high risk no proof",
                        score = 0.99
                    ),
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "trusted:safe_backup",
                        name = "Safe Provider",
                        summary = "Quote ¥900 verified rollback dispute",
                        score = 0.70
                    )
                )
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent_parent_guard",
                status = "broadcasting",
                offersCount = 2
            )
        )

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "LIX发布需求: parent role compare providers",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "2000",
                    deadline = "5 days",
                    acceptanceCriteria = "family-safe verified execution",
                    userConfirmationToken = "CONFIRM-PARENT",
                    activeRole = UserRole.PARENT,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertTrue(
            payload.providerPolicyDecisions.any {
                it.providerName == "Risky Provider" &&
                    it.decision == ProviderDecisionStatus.DENIED &&
                    it.denyReason == ProviderDenyReason.RISK_EXCEEDED
            }
        )
        assertTrue(payload.providerSelectionSummary?.selectedProviderName == "Safe Provider")
        assertTrue(
            response.executionReceipt?.providerPolicyDecisions?.any {
                it.providerName == "Risky Provider" && it.decision == ProviderDecisionStatus.DENIED
            } == true
        )
    }

    @Test
    fun handleRequest_lixProviderFacingDataScopeBlocksSensitiveParentBroadcast() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "LIX发布需求: contact me at parent@example.com and passport number AB123456 for direct delivery",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "900",
                    deadline = "3 days",
                    acceptanceCriteria = "verified completion",
                    activeRole = UserRole.PARENT,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertEquals(ResponseStatus.WAITING_USER, response.status)
        assertTrue(payload.externalDataScopeSummary?.blocked == true || payload.externalDataScopeSummary?.reduced == true)
        assertTrue(payload.externalDataScopeSummary?.redactedFields?.isNotEmpty() == true)
        if (payload.externalDataScopeSummary?.blocked == true) {
            assertEquals(null, gateway.lastLixBroadcastQuery)
        } else {
            assertTrue(gateway.lastLixBroadcastQuery?.contains("[REDACTED", ignoreCase = true) == true)
        }
        assertTrue(
            response.executionReceipt?.dataScopeSummary?.contains("scope", ignoreCase = true) == true
        )
    }

    @Test
    fun handleRequest_lixApprovalRequirementVariesByRolePolicy() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "trusted:approval-check",
                        name = "Approval Check Provider",
                        summary = "Quote ¥900 verified rollback dispute",
                        score = 0.88
                    )
                )
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent_approval_role_diff",
                status = "broadcasting",
                offersCount = 1
            )
        )

        val buyer = orchestrator.handleRequest(
            request = request(
                sessionId = "approval-buyer",
                rawText = "LIX发布需求: evaluate one provider",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "1200",
                    deadline = "4 days",
                    acceptanceCriteria = "verified result",
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )
        val work = orchestrator.handleRequest(
            request = request(
                sessionId = "approval-work",
                rawText = "LIX发布需求: evaluate one provider",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "1200",
                    deadline = "4 days",
                    acceptanceCriteria = "verified result",
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val buyerPayload = buyer.payload as ModulePayload.LixPayload
        val workPayload = work.payload as ModulePayload.LixPayload
        assertTrue(buyerPayload.externalApprovalSummary?.required == true)
        assertTrue(workPayload.externalApprovalSummary?.required == false)
    }

    @Test
    fun handleRequest_lixVerificationFailureAndRollbackDisputeAreTraceable() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "review reject intent_abc123",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        assertEquals(ResponseStatus.DISPUTED, response.status)
        assertTrue(response.executionReceipt?.externalVerificationSummary?.status == "failed")
        assertTrue(response.executionReceipt?.externalRollbackSummary?.available == true)
        assertTrue(response.executionReceipt?.externalDisputeSummary?.opened == true)
        assertTrue(
            response.executionReceipt?.events?.any { it.type == ExecutionReceiptEventType.DISPUTE_OPENED } == true
        )
        assertTrue(
            response.executionReceipt?.events?.any { it.type == ExecutionReceiptEventType.VERIFICATION_FAILED } == true
        )
    }

    @Test
    fun handleRequest_lixBroadcastFailureDoesNotFallbackToSyntheticExecution() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            lixBroadcastResult = CloudResult(
                success = false,
                error = "FUNCTION_INVOCATION_FAILED",
                traceId = "trace-lix-failed",
                errorCode = "http_500",
                httpStatus = 500
            )
        )
        val customPrompt = """
            LIX发布定制需求
            需求: 帮我招聘一位北京前端工程师
            领域: recruitment
            请广播意图并返回候选报价
        """.trimIndent()

        val response = orchestrator.handleRequest(
            request = request(rawText = customPrompt, module = ModuleId.LIX),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertEquals("broadcast_failed", payload.stage)
        assertEquals(0, payload.offerCount)
        assertEquals(ResponseStatus.ERROR, response.status)
        assertEquals(0, gateway.executeAgentCount)
    }

    @Test
    fun handleRequest_lixMyAgentsReturnsMappedOffers() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            myAgentsPayload = LixMyAgentsPayload(
                ownerId = "u-1",
                agents = listOf(
                    LixMyAgentItem(agentId = "a_1", name = "Agent One", status = "approved")
                )
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "查询我的agent", module = ModuleId.LIX),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertEquals("my_agents", payload.stage)
        assertEquals(1, payload.offers.size)
        assertEquals("Agent One", payload.offers.first().name)
        assertEquals("lumi://agent-market", payload.offers.first().actionDeeplink)
        assertTrue(response.actions.any { it.id.startsWith("open_offer_") && it.deeplink == "lumi://agent-market" })
    }

    @Test
    fun handleRequest_chatAddsStepActionsAndRunNextAction() = runTest {
        val orchestrator = AgentOrchestrator()
        val response = orchestrator.handleRequest(
            request = request(rawText = "Plan a London to Jersey round trip with concrete execution steps"),
            cloudGateway = null
        )

        assertTrue(response.actions.any { it.type == AgentActionType.OPEN_DEEPLINK || it.type == AgentActionType.RUN_QUERY })
        assertTrue(response.actions.any { it.id == "run_next_action" && it.prompt == response.nextAction })
    }

    @Test
    fun handleRequest_marketGithubConnectReturnsRepoCount() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(githubRepoCount = 2)

        val response = orchestrator.handleRequest(
            request = request(rawText = "github连接", module = ModuleId.AGENT_MARKET),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.MarketPayload
        assertEquals(2, payload.githubRepoCount)
        assertTrue(response.cards.any { it.id.contains("github") })
    }

    @Test
    fun handleRequest_marketGithubImportUsesRepoAndManifestPath() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "github导入 openclaw/openclaw .lix/agent.manifest.json",
                module = ModuleId.AGENT_MARKET
            ),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.MarketPayload
        assertEquals("openclaw/openclaw", gateway.lastGithubImportRepo)
        assertEquals(".lix/agent.manifest.json", gateway.lastGithubImportManifestPath)
        assertEquals(1, payload.selectedCount)
        assertTrue(response.cards.any { it.id == "market-github-import" })
    }

    @Test
    fun handleRequest_lixExecutorCommandReturnsExecutorStage() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executorPayload = LixExecutorPayload(
                success = true,
                summary = "任务执行完成"
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "执行任务 executor 模式", module = ModuleId.LIX),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertEquals("executor_success", payload.stage)
        assertTrue(payload.summary.contains("完成"))
    }

    @Test
    fun handleRequest_lixAcceptCommandParsesSolutionPrefixedIds() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway()

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "接受报价 sol_intent_abc123 sol_offer_def456",
                module = ModuleId.LIX
            ),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertEquals("sol_intent_abc123", gateway.lastLixAcceptIntentId)
        assertEquals("sol_offer_def456", gateway.lastLixAcceptOfferId)
        assertEquals("offer_accepted", payload.stage)
    }

    @Test
    fun handleRequest_chatUsesSuperAgentRoutingAndSkillTrackFromCloud() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executionPayload = AgentExecutionPayload(
                taskId = "trace_super_chat",
                status = "success",
                resultSummary = "已拆解并执行 2 个子任务",
                routingDecision = RoutingDecisionPayload(
                    mode = RoutingMode.MULTI_AGENT,
                    reasonCodes = listOf("required_capabilities>=3"),
                    scores = RoutingScoresPayload(complexity = 0.82, risk = 0.42, dependency = 0.78)
                ),
                taskGraph = TaskGraphPayload(
                    tasks = listOf(
                        TaskGraphTaskPayload(id = "t1", title = "检索方案", requiredCapabilities = listOf("live_search")),
                        TaskGraphTaskPayload(id = "t2", title = "整合输出", requiredCapabilities = listOf("reasoning"))
                    )
                ),
                skillInvocations = listOf(
                    SkillInvocationPayload(
                        skillId = "github:find-skills/search",
                        source = SkillSource.GITHUB
                    )
                ),
                evidenceItems = listOf(
                    EvidenceItemPayload(
                        source = "github",
                        title = "openclaw skill sample",
                        url = "https://github.com/openclaw/openclaw"
                    )
                )
            )
        )

        val response = orchestrator.handleRequest(
            request = request(rawText = "请拆解这个任务并并行执行", module = ModuleId.CHAT),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.ChatPayload
        assertEquals(1, gateway.executeAgentCount)
        assertEquals("已拆解并执行 2 个子任务", response.summary)
        assertEquals(RoutingMode.MULTI_AGENT, payload.routingDecision?.mode)
        assertTrue(payload.skillInvocations.any { it.source == SkillSource.GITHUB })
        assertTrue(payload.evidenceItems.isNotEmpty())
        assertTrue(response.cards.any { it.id.startsWith("chat-super-") })
    }

    @Test
    fun handleRequest_complexChatFailureDoesNotForceLixBudgetWithoutUserEscalationIntent() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executeAgentResult = CloudResult(
                success = false,
                error = "team execution timeout",
                traceId = "trace-openclaw-failed",
                errorCode = "timeout"
            )
        )

        val response = orchestrator.handleRequest(
            request = request(
                rawText = "并行处理机票酒店和本地交通并输出执行方案",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        assertEquals(ResponseStatus.WAITING_USER, response.status)
        assertFalse(response.summary?.contains("budget", ignoreCase = true) == true)
        assertEquals(1, gateway.executeAgentCount)
        assertEquals(null, gateway.lastLixBroadcastQuery)
    }

    @Test
    fun handleRequest_stalePendingEscalationIsClearedForNormalChatQueries() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executeAgentResult = CloudResult(
                success = false,
                error = "team execution timeout",
                traceId = "trace-openclaw-failed",
                errorCode = "timeout"
            )
        )

        orchestrator.handleRequest(
            request = request(
                rawText = "请将这个需求发布到LIX市场：构建一个旅行agent并执行",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val second = orchestrator.handleRequest(
            request = request(
                rawText = "Plan a round trip from London to Jersey Island next Monday to Wednesday with real links",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val gateR1 = second.gateDecisions.firstOrNull { it.gate == GateType.GATE_R1_REQUIRE_CONSTRAINTS }
        assertNotNull(gateR1)
        assertEquals("PASSED", gateR1.decision.name)
        assertFalse(second.summary?.contains("strict gates are blocking escalation", ignoreCase = true) == true)
        assertFalse(second.summary?.contains("missing fields: budget", ignoreCase = true) == true)
    }

    @Test
    fun handleRequest_budgetReplyPublishesLixAndAcceptsTwinValidatedSupplier() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executeAgentResult = CloudResult(
                success = false,
                error = "team execution timeout",
                traceId = "trace-openclaw-failed",
                errorCode = "timeout"
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent_lix_escalation",
                status = "broadcasting",
                offersCount = 2
            ),
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "offer_top",
                        name = "Supplier Alpha",
                        summary = "personalized evidence verified plan, price 4800",
                        score = 0.88
                    ),
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "offer_low",
                        name = "Supplier Beta",
                        summary = "generic plan, price 9000",
                        score = 0.52
                    )
                )
            )
        )

        orchestrator.handleRequest(
            request = request(
                rawText = "请将这个需求发布到LIX市场：Travel Agent Skill For London to Jersey， 并行处理机票酒店和本地交通并输出执行方案",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val second = orchestrator.handleRequest(
            request = request(
                rawText = "Budget: 5000 CNY; Deadline: 10 days; Acceptance criteria: evidence-backed personalized plan; Confirmation token: CONFIRM-LIX-001",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        assertTrue(gateway.lastLixBroadcastQuery?.contains("Budget: 5000 CNY") == true)
        assertEquals("offer_top", gateway.lastLixAcceptOfferId)
        assertEquals(ResponseStatus.COMMITTED, second.status)
        assertTrue(second.summary?.contains("personalized", ignoreCase = true) == true)
    }

    @Test
    fun handleRequest_naturalLanguageConstraintsWithoutColonsStillPassGate() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executeAgentResult = CloudResult(
                success = false,
                error = "team execution timeout",
                traceId = "trace-openclaw-failed",
                errorCode = "timeout"
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent_lix_escalation",
                status = "broadcasting",
                offersCount = 1
            ),
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "offer_top",
                        name = "Supplier Alpha",
                        summary = "personalized evidence verified plan, price 4800",
                        score = 0.88
                    )
                )
            )
        )

        orchestrator.handleRequest(
            request = request(
                rawText = "请将这个需求发布到LIX市场：Travel Agent Skill For London to Jersey，并行处理机票酒店和本地交通并输出执行方案",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val second = orchestrator.handleRequest(
            request = request(
                rawText = "Budget 5000 CNY Deadline 10 days Acceptance criteria evidence-backed personalized itinerary Confirmation token CONFIRM-LIX-900",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        assertTrue(gateway.lastLixBroadcastQuery?.contains("Budget: 5000 CNY", ignoreCase = true) == true)
        assertEquals(ResponseStatus.COMMITTED, second.status)
    }

    @Test
    fun handleRequest_noTwinValidatedSupplierTriggersNegotiationLoop() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            executeAgentResult = CloudResult(
                success = false,
                error = "team execution timeout",
                traceId = "trace-openclaw-failed",
                errorCode = "timeout"
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent_lix_escalation",
                status = "broadcasting",
                offersCount = 1
            ),
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "offer_risky",
                        name = "Supplier Risky",
                        summary = "aggressive high risk plan, price 30000",
                        score = 0.28
                    )
                )
            ),
            lixExecutorResult = CloudResult(
                success = true,
                data = LixExecutorPayload(success = true, summary = "negotiating with supplier agents"),
                traceId = "trace-negotiation"
            )
        )

        orchestrator.handleRequest(
            request = request(
                rawText = "请将这个需求发布到LIX市场：Travel Agent Skill For London to Jersey，并行处理机票酒店和本地交通并输出执行方案",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        val second = orchestrator.handleRequest(
            request = request(
                rawText = "预算: 6000 CNY; 时限: 7 days; 验收标准: evidence-backed itinerary; 确认令牌: CONFIRM-LIX-002",
                module = ModuleId.CHAT
            ),
            cloudGateway = gateway
        )

        assertEquals(1, gateway.lixExecutorCount)
        assertEquals(ResponseStatus.WAITING_USER, second.status)
        assertTrue(second.summary?.isNotBlank() == true)
    }

    @Test
    fun updateRolePolicy_rejectsContradictoryBudgetAndDelegationConfig() {
        val orchestrator = AgentOrchestrator()
        val result = orchestrator.updateRolePolicy(
            userId = "u-policy-invalid",
            role = UserRole.WORK,
            draft = RolePolicyDraft(
                delegationMode = DelegationMode.MANUAL,
                requiresConfirmationTokenForExternalSpend = true,
                autoApprovalBudgetLimit = 1200.0,
                maxExternalBudget = 900.0
            )
        )

        assertFalse(result.saved)
        assertTrue(result.validation.issues.any { it.field == "autoApprovalBudgetLimit" })
        assertTrue(result.validation.issues.any { it.field == "delegationMode" })
    }

    @Test
    fun updateRolePolicy_changesApprovalGateBehaviorAtRuntime() = runTest {
        val orchestrator = AgentOrchestrator()
        val updateResult = orchestrator.updateRolePolicy(
            userId = "u-policy-approval",
            role = UserRole.BUYER,
            draft = RolePolicyDraft(
                delegationMode = DelegationMode.SUPERVISED,
                requiresConfirmationTokenForExternalSpend = false,
                autoApprovalBudgetLimit = 500.0,
                maxExternalBudget = 5_000.0
            )
        )
        assertTrue(updateResult.saved)

        val response = orchestrator.handleRequest(
            request = request(
                userId = "u-policy-approval",
                rawText = "Publish this requirement to LIX market and execute purchase",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "300",
                    deadline = "7 days",
                    acceptanceCriteria = "evidence-backed",
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )

        val gateR2 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R2_REQUIRE_USER_CONFIRMATION_TOKEN }
        assertNotNull(gateR2)
        assertEquals("PASSED", gateR2.decision.name)
    }

    @Test
    fun updateRolePolicy_budgetOverrideAffectsRuntimeBudgetGuard() = runTest {
        val orchestrator = AgentOrchestrator()
        val updateResult = orchestrator.updateRolePolicy(
            userId = "u-policy-budget",
            role = UserRole.WORK,
            draft = RolePolicyDraft(
                maxExternalBudget = 1_000.0,
                autoApprovalBudgetLimit = 200.0,
                requiresConfirmationTokenForExternalSpend = true
            )
        )
        assertTrue(updateResult.saved)

        val response = orchestrator.handleRequest(
            request = request(
                userId = "u-policy-budget",
                rawText = "Publish requirement to external fulfillment with supplier execution",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "2000",
                    deadline = "5 days",
                    acceptanceCriteria = "proof-backed",
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )

        val gateR3 = response.gateDecisions.firstOrNull { it.gate == GateType.GATE_R3_BUDGET_SCOPE_GUARD }
        assertNotNull(gateR3)
        assertEquals("BLOCKED", gateR3.decision.name)
        assertEquals("budget_exceeds_role_limit", gateR3.reason)
        assertTrue(response.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_POLICY_USER_OVERRIDE_APPLIED))
    }

    @Test
    fun updateRolePolicy_blockedProviderTagsAffectProviderSelection() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:trusted",
                        name = "Trusted Provider",
                        summary = "Quote ¥800 verified rollback dispute",
                        score = 0.98
                    ),
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:budget",
                        name = "Budget Provider",
                        summary = "Quote ¥850 verified rollback dispute",
                        score = 0.82
                    )
                )
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent-provider-policy",
                status = "broadcasting",
                offersCount = 2
            )
        )
        val updateResult = orchestrator.updateRolePolicy(
            userId = "u-policy-provider",
            role = UserRole.BUYER,
            draft = RolePolicyDraft(
                blockedProviderTags = listOf("trusted")
            )
        )
        assertTrue(updateResult.saved)

        val response = orchestrator.handleRequest(
            request = request(
                userId = "u-policy-provider",
                rawText = "Publish this requirement to LIX and compare suppliers",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "1000",
                    deadline = "5 days",
                    acceptanceCriteria = "verified delivery",
                    userConfirmationToken = "CONFIRM-PROVIDER",
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertTrue(
            payload.providerPolicyDecisions.any {
                it.providerName == "Trusted Provider" &&
                    it.decision == ProviderDecisionStatus.DENIED &&
                    it.denyReason == ProviderDenyReason.POLICY_RESTRICTED
            }
        )
        assertEquals("Budget Provider", payload.providerSelectionSummary?.selectedProviderName)
        assertTrue(response.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_POLICY_USER_OVERRIDE_APPLIED))
    }

    @Test
    fun updateRolePolicy_dataScopeOverrideAffectsProviderFacingScope() = runTest {
        val orchestrator = AgentOrchestrator()
        val updateResult = orchestrator.updateRolePolicy(
            userId = "u-policy-data",
            role = UserRole.BUYER,
            draft = RolePolicyDraft(
                sharingMode = "local_only",
                allowedScopes = listOf("minimal_task_context"),
                cloudSyncAllowed = false
            )
        )
        assertTrue(updateResult.saved)

        val response = orchestrator.handleRequest(
            request = request(
                userId = "u-policy-data",
                rawText = "LIX publish: contact me at buyer@example.com and passport AB123456 for settlement",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "900",
                    deadline = "4 days",
                    acceptanceCriteria = "verified completion",
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = FakeGateway()
        )

        val payload = response.payload as ModulePayload.LixPayload
        assertTrue(payload.externalDataScopeSummary?.reduced == true || payload.externalDataScopeSummary?.blocked == true)
        assertTrue(payload.externalDataScopeSummary?.redactedFields?.isNotEmpty() == true)
        assertTrue(
            response.executionReceipt?.dataScopeSummary?.contains("scope", ignoreCase = true) == true
        )
    }

    @Test
    fun updateRolePolicy_externalPreferenceCanSuppressRouteEscalation() = runTest {
        val routingConfig = RoutingScoreConfig(
            thresholds = RoutingThresholds(
                crossDomainMin = 10,
                capabilitiesMin = 10,
                dependencyMin = 10,
                riskMin = 0.95,
                requireEvidenceOnRisk = true
            ),
            complexityWeights = RoutingComplexityWeights(
                crossDomainWeight = 0.05,
                capabilityWeight = 0.05,
                dependencyWeight = 0.05
            ),
            explicitMultiAgentKeywords = emptyList()
        )
        val orchestrator = AgentOrchestrator(
            routingScoreConfigProvider = { routingConfig }
        )
        val updateResult = orchestrator.updateRolePolicy(
            userId = "u-policy-route",
            role = UserRole.BUYER,
            draft = RolePolicyDraft(
                externalFulfillmentAllowed = false,
                externalFulfillmentPreference = ExternalFulfillmentPreference.INTERNAL_FIRST
            )
        )
        assertTrue(updateResult.saved)

        val response = orchestrator.handleRequest(
            request = request(
                userId = "u-policy-route",
                rawText = "Need latest quote comparison for suppliers and real-time options",
                module = ModuleId.CHAT,
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )

        assertEquals(RoutingMode.SINGLE_AGENT, response.routingDecision?.mode)
        assertTrue(
            response.routingDecision?.reasonCodes?.contains(RoleReasonCodes.ROLE_ROUTE_EXCLUDED) == true
        )
    }

    @Test
    fun resetRolePolicy_restoresRoleDefaults() {
        val orchestrator = AgentOrchestrator()
        val before = orchestrator.getRolePolicyEditorState("u-policy-reset", UserRole.WORK)

        val updateResult = orchestrator.updateRolePolicy(
            userId = "u-policy-reset",
            role = UserRole.WORK,
            draft = RolePolicyDraft(
                maxExternalBudget = 2_000.0,
                autoApprovalBudgetLimit = 120.0,
                blockedProviderTags = listOf("trusted")
            )
        )
        assertTrue(updateResult.saved)
        val changed = orchestrator.getRolePolicyEditorState("u-policy-reset", UserRole.WORK)
        assertEquals(2_000.0, changed.effectivePolicy.approvalPolicy.maxExternalBudget)
        assertTrue(changed.effectivePolicy.preferences.blockedProviderTags.contains("trusted"))

        val reset = orchestrator.resetRolePolicy("u-policy-reset", UserRole.WORK)
        assertTrue(reset.saved)
        val after = orchestrator.getRolePolicyEditorState("u-policy-reset", UserRole.WORK)
        assertEquals(before.effectivePolicy.approvalPolicy.maxExternalBudget, after.effectivePolicy.approvalPolicy.maxExternalBudget)
        assertEquals(before.effectivePolicy.preferences.blockedProviderTags, after.effectivePolicy.preferences.blockedProviderTags)
    }

    @Test
    fun executionLedger_bindsDecisionTimePolicySnapshot_and_pastReceiptStaysStableAfterPolicyEdit() = runTest {
        val orchestrator = AgentOrchestrator()
        val first = orchestrator.handleRequest(
            request = request(
                userId = "u-ledger-policy",
                sessionId = "s-ledger-policy",
                rawText = "Plan with explicit budget and deadline constraints.",
                constraints = AgentRequestConstraints(
                    budget = "900",
                    deadline = "4 days",
                    acceptanceCriteria = "evidence-backed",
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )
        val firstRecordBeforeEdit = orchestrator.getExecutionLedger(
            userId = "u-ledger-policy",
            filter = LedgerQueryFilter(runId = first.traceId, limit = 1)
        ).firstOrNull()
        assertNotNull(firstRecordBeforeEdit)
        assertNotNull(firstRecordBeforeEdit.policySnapshot)
        assertEquals(firstRecordBeforeEdit.policySnapshot?.snapshotId, first.executionReceipt?.policySnapshotId)
        assertTrue(
            first.executionReceipt?.constraintPrecedenceSummary
                ?.contains("budget", ignoreCase = true) == true
        )

        val update = orchestrator.updateRolePolicy(
            userId = "u-ledger-policy",
            role = UserRole.WORK,
            draft = RolePolicyDraft(
                maxExternalBudget = 1_200.0,
                autoApprovalBudgetLimit = 120.0,
                requiresConfirmationTokenForExternalSpend = true
            )
        )
        assertTrue(update.saved)

        val second = orchestrator.handleRequest(
            request = request(
                userId = "u-ledger-policy",
                sessionId = "s-ledger-policy",
                rawText = "Continue after policy update.",
                constraints = AgentRequestConstraints(
                    budget = "500",
                    deadline = "3 days",
                    acceptanceCriteria = "verified links",
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )
        val firstRecordAfterEdit = orchestrator.getExecutionLedger(
            userId = "u-ledger-policy",
            filter = LedgerQueryFilter(runId = first.traceId, limit = 1)
        ).firstOrNull()
        val secondRecord = orchestrator.getExecutionLedger(
            userId = "u-ledger-policy",
            filter = LedgerQueryFilter(runId = second.traceId, limit = 1)
        ).firstOrNull()

        assertNotNull(firstRecordAfterEdit)
        assertNotNull(secondRecord)
        assertEquals(firstRecordBeforeEdit.policySnapshot?.snapshotId, firstRecordAfterEdit.policySnapshot?.snapshotId)
        assertEquals(firstRecordBeforeEdit.policySnapshot?.boundAtMs, firstRecordAfterEdit.policySnapshot?.boundAtMs)
        assertTrue(secondRecord.policySnapshot?.snapshotId != firstRecordAfterEdit.policySnapshot?.snapshotId)
    }

    @Test
    fun executionLedger_recordsProviderDecision_and_disputeRollbackVerificationChain() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:trusted",
                        name = "Trusted Provider",
                        summary = "Quote ¥800 verified rollback dispute",
                        score = 0.95
                    ),
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:budget",
                        name = "Budget Provider",
                        summary = "Quote ¥850 no proof rollback dispute",
                        score = 0.82
                    )
                )
            ),
            lixBroadcastPayload = LixSolutionPayload(
                intentId = "intent-ledger-chain",
                status = "broadcasting",
                offersCount = 2
            )
        )
        orchestrator.handleRequest(
            request = request(
                userId = "u-ledger-chain",
                sessionId = "s-ledger-chain",
                rawText = "Publish requirement to LIX and compare suppliers.",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    budget = "1200",
                    deadline = "5 days",
                    acceptanceCriteria = "verified completion",
                    userConfirmationToken = "CONFIRM-LEDGER",
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )
        val disputed = orchestrator.handleRequest(
            request = request(
                userId = "u-ledger-chain",
                sessionId = "s-ledger-chain",
                rawText = "review reject intent-ledger-chain",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )
        val allRecords = orchestrator.getExecutionLedger(
            userId = "u-ledger-chain",
            filter = LedgerQueryFilter(limit = 10)
        )
        assertTrue(allRecords.isNotEmpty())
        val providerRecord = allRecords.firstOrNull { it.providerDecisions.isNotEmpty() }
        assertNotNull(providerRecord)
        assertTrue(
            providerRecord.providerDecisions.any {
                it.decision == ProviderDecisionStatus.SELECTED || it.decision == ProviderDecisionStatus.DENIED
            }
        )

        val disputedRecord = allRecords.firstOrNull { it.runId == disputed.traceId }
        assertNotNull(disputedRecord)
        assertEquals("failed", disputedRecord.verificationRecord?.status)
        assertTrue(disputedRecord.rollbackRecord?.available == true)
        assertTrue(disputedRecord.disputeRecord?.opened == true)
    }

    @Test
    fun executionLedger_filtersByRoleAndDisputeState() = runTest {
        val orchestrator = AgentOrchestrator()
        orchestrator.handleRequest(
            request = request(
                userId = "u-ledger-filter",
                sessionId = "s-ledger-filter",
                rawText = "review reject intent_filter",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = FakeGateway()
        )

        val disputedBuyer = orchestrator.getExecutionLedger(
            userId = "u-ledger-filter",
            filter = LedgerQueryFilter(
                role = UserRole.BUYER,
                disputeOrRollbackState = "disputed",
                limit = 5
            )
        )
        assertTrue(disputedBuyer.isNotEmpty())
        assertTrue(disputedBuyer.all { it.activeRole == UserRole.BUYER })
        assertTrue(disputedBuyer.all { it.disputeRecord?.opened == true || it.status == ResponseStatus.DISPUTED })

        val workOnly = orchestrator.getExecutionLedger(
            userId = "u-ledger-filter",
            filter = LedgerQueryFilter(role = UserRole.WORK, limit = 5)
        )
        assertTrue(workOnly.isEmpty())
    }

    @Test
    fun executionLedger_duplicateCallbackSameRun_isIdempotentAndTracked() = runTest {
        val orchestrator = AgentOrchestrator(
            traceFactory = { "trace_m7_duplicate" }
        )

        repeat(2) {
            orchestrator.handleRequest(
                request = request(
                    userId = "u-ledger-idempotent",
                    sessionId = "s-ledger-idempotent",
                    rawText = "review reject intent_m7_duplicate",
                    module = ModuleId.LIX,
                    constraints = AgentRequestConstraints(
                        activeRole = UserRole.BUYER,
                        roleSource = RoleSource.EXPLICIT_USER_SELECTION
                    )
                ),
                cloudGateway = FakeGateway()
            )
        }

        val records = orchestrator.getExecutionLedger(
            userId = "u-ledger-idempotent",
            filter = LedgerQueryFilter(runId = "trace_m7_duplicate", limit = 5)
        )
        assertEquals(1, records.size)
        val settlement = records.first().settlementRecord
        assertNotNull(settlement)
        assertTrue(settlement.attempts.size >= 2)
        assertTrue(settlement.attempts.any { it.duplicateIgnored })
        assertTrue(settlement.reasonCodes.contains(RoleReasonCodes.ROLE_EXTERNAL_DUPLICATE_CALLBACK_IGNORED))
    }

    @Test
    fun executionLedger_supportsM7OperationalFilters_forUnresolvedSyncAndProviderIssues() {
        val unresolvedRecord = ExecutionReceiptRecord(
            recordId = "ledger_m7_sync",
            runId = "run_m7_sync",
            userId = "u-m7-filter",
            sessionId = "s-m7-filter",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "run_m7_sync",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Settlement is authoritative locally; remote acknowledgement is pending.",
                selectedProviderId = "provider_sync",
                selectedProviderName = "Provider Sync",
                providerAcks = listOf(
                    ProviderAckRecord(
                        ackId = "ack_timeout",
                        providerId = "provider_sync",
                        providerName = "Provider Sync",
                        callbackId = "callback_timeout",
                        status = ProviderAckStatus.TIMEOUT,
                        detail = "Provider acknowledgement timed out.",
                        ackAtMs = 100L
                    )
                ),
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_EXTERNAL_SETTLEMENT_SYNC_PENDING,
                    RoleReasonCodes.ROLE_EXTERNAL_PROVIDER_ACK_TIMEOUT
                ),
                recordedAtMs = 100L
            ),
            disputeRecord = DisputeRecord(
                runId = "run_m7_sync",
                opened = true,
                summary = "Dispute opened locally; gateway sync pending.",
                issueType = "provider_mismatch",
                syncState = "sync_pending",
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_DISPUTE_SYNC_PENDING),
                recordedAtMs = 100L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "run_m7_sync",
                caseId = "case_m7_sync",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute opened locally; gateway sync pending.",
                issueType = "provider_mismatch",
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_DISPUTE_SYNC_PENDING),
                updatedAtMs = 100L
            ),
            syncIssues = listOf(
                MarketplaceSyncIssue(
                    issueId = "issue_m7_sync",
                    providerId = "provider_sync",
                    issueType = "provider_ack_timeout",
                    summary = "Provider acknowledgement timed out; reconciliation remains open.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_PROVIDER_ACK_TIMEOUT),
                    detectedAtMs = 100L
                )
            ),
            createdAtMs = 100L,
            updatedAtMs = 100L
        )
        val resolvedRecord = ExecutionReceiptRecord(
            recordId = "ledger_m7_ok",
            runId = "run_m7_ok",
            userId = "u-m7-filter",
            sessionId = "s-m7-filter",
            module = ModuleId.LIX,
            status = ResponseStatus.COMMITTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "run_m7_ok",
                status = SettlementStatus.RECONCILED,
                syncState = SettlementSyncState.RECONCILED,
                summary = "Settlement has been reconciled with remote acknowledgement.",
                selectedProviderId = "provider_ok",
                selectedProviderName = "Provider OK",
                recordedAtMs = 200L
            ),
            createdAtMs = 200L,
            updatedAtMs = 200L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m7-filter") return null
                return PersistedDynamicState(
                    executionLedgerRecords = listOf(unresolvedRecord, resolvedRecord)
                )
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)

        val unresolved = orchestrator.getExecutionLedger(
            userId = "u-m7-filter",
            filter = LedgerQueryFilter(unresolvedOnly = true, limit = 10)
        )
        assertEquals(1, unresolved.size)
        assertEquals("run_m7_sync", unresolved.first().runId)

        val syncPending = orchestrator.getExecutionLedger(
            userId = "u-m7-filter",
            filter = LedgerQueryFilter(syncPendingOnly = true, limit = 10)
        )
        assertEquals(1, syncPending.size)
        assertEquals("run_m7_sync", syncPending.first().runId)

        val providerIssues = orchestrator.getExecutionLedger(
            userId = "u-m7-filter",
            filter = LedgerQueryFilter(providerIssueOnly = true, limit = 10)
        )
        assertEquals(1, providerIssues.size)
        assertEquals("run_m7_sync", providerIssues.first().runId)

        val settlementPending = orchestrator.getExecutionLedger(
            userId = "u-m7-filter",
            filter = LedgerQueryFilter(settlementStatus = SettlementStatus.SYNC_PENDING, limit = 10)
        )
        assertEquals(1, settlementPending.size)
        assertEquals("run_m7_sync", settlementPending.first().runId)

        val disputePending = orchestrator.getExecutionLedger(
            userId = "u-m7-filter",
            filter = LedgerQueryFilter(disputeStatus = DisputeStatus.SYNC_PENDING, limit = 10)
        )
        assertEquals(1, disputePending.size)
        assertEquals("run_m7_sync", disputePending.first().runId)
    }

    @Test
    fun governanceSummary_tracksRollbackFailureAndReconciliationMismatch_fromTypedLedger() {
        val now = System.currentTimeMillis()
        val mismatchRecord = ExecutionReceiptRecord(
            recordId = "ledger_m7_mismatch",
            runId = "run_m7_mismatch",
            userId = "u-m7-governance",
            sessionId = "s-m7-governance",
            module = ModuleId.LIX,
            status = ResponseStatus.COMMITTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "run_m7_mismatch",
                status = SettlementStatus.COMMITTED,
                syncState = SettlementSyncState.MISMATCH,
                summary = "Local and remote settlement states differ; reconciliation is required.",
                selectedProviderId = "provider_conflict",
                selectedProviderName = "Provider Conflict",
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_MISMATCH),
                recordedAtMs = now - 1200L
            ),
            rollbackAttempts = listOf(
                RollbackAttemptRecord(
                    attemptId = "rollback_fail_1",
                    outcome = RollbackOutcome.FAILED,
                    summary = "Rollback failed because remote settlement rejected the rollback request.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_ROLLBACK_FAILED),
                    timestampMs = now - 1100L
                )
            ),
            syncIssues = listOf(
                MarketplaceSyncIssue(
                    issueId = "issue_mismatch_1",
                    providerId = "provider_conflict",
                    issueType = "reconciliation_mismatch",
                    summary = "Remote callback disagrees with local settlement/dispute state.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_MISMATCH),
                    detectedAtMs = now - 1000L
                )
            ),
            createdAtMs = now - 1200L,
            updatedAtMs = now - 1000L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m7-governance") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(mismatchRecord))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)
        val summary = orchestrator.getGovernanceSummary(
            userId = "u-m7-governance",
            query = GovernanceQuery(windowDays = 30, includeLegacyWithoutReceipt = true, limit = 20)
        )
        val mismatchMetric = summary.metricValues.firstOrNull {
            it.key == GovernanceMetricKey.SETTLEMENT_RECONCILIATION_MISMATCH_RATE
        }
        val rollbackFailureMetric = summary.metricValues.firstOrNull {
            it.key == GovernanceMetricKey.ROLLBACK_FAILURE_RATE
        }
        assertNotNull(mismatchMetric)
        assertNotNull(rollbackFailureMetric)
        assertEquals(1, mismatchMetric.numerator)
        assertEquals(1, rollbackFailureMetric.numerator)

        val unresolved = orchestrator.getExecutionLedger(
            userId = "u-m7-governance",
            filter = LedgerQueryFilter(unresolvedOnly = true, limit = 10)
        )
        assertEquals(1, unresolved.size)
        assertEquals("run_m7_mismatch", unresolved.first().runId)
    }

    @Test
    fun governanceSummary_aggregatesRoleProviderStatusAndReasonFamily() = runTest {
        val orchestrator = AgentOrchestrator()
        val gateway = FakeGateway(
            lixOffersPayload = AgentDiscoveryPayload(
                items = listOf(
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:trusted",
                        name = "Trusted Provider",
                        summary = "Quote ¥780 verified rollback dispute",
                        score = 0.94
                    ),
                    com.lumi.coredomain.contract.AgentDiscoveryItem(
                        id = "ext:risky",
                        name = "Risky Provider",
                        summary = "Quote ¥700 no proof",
                        score = 0.73
                    )
                )
            )
        )
        orchestrator.handleRequest(
            request = request(
                userId = "u-governance",
                sessionId = "s-governance",
                rawText = "Plan this work task with strict constraints.",
                module = ModuleId.CHAT,
                constraints = AgentRequestConstraints(
                    budget = "1200",
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = null
        )
        orchestrator.handleRequest(
            request = request(
                userId = "u-governance",
                sessionId = "s-governance",
                rawText = "review reject intent_governance",
                module = ModuleId.LIX,
                constraints = AgentRequestConstraints(
                    activeRole = UserRole.BUYER,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            cloudGateway = gateway
        )

        val summary = orchestrator.getGovernanceSummary(
            userId = "u-governance",
            query = GovernanceQuery(windowDays = 30, limit = 120)
        )
        assertTrue(summary.matchedRecords >= 2)
        assertTrue(summary.byRole.any { it.bucket == "work" || it.bucket == "buyer" })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.EXTERNAL_FULFILLMENT_ATTEMPT_RATE })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.SNAPSHOT_BINDING_COVERAGE })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.SETTLEMENT_SYNC_PENDING_RATE })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.SETTLEMENT_RECONCILIATION_MISMATCH_RATE })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.DUPLICATE_CALLBACK_IGNORED_RATE })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.ROLLBACK_FAILURE_RATE })
        assertTrue(summary.metricValues.any { it.key == GovernanceMetricKey.UNRESOLVED_DISPUTE_BACKLOG })

        val disputedOnly = orchestrator.getGovernanceSummary(
            userId = "u-governance",
            query = GovernanceQuery(
                windowDays = 30,
                outcomeStatus = ResponseStatus.DISPUTED,
                limit = 120
            )
        )
        assertTrue(disputedOnly.matchedRecords >= 1)
        assertTrue(disputedOnly.byOutcomeStatus.any { it.bucket == "disputed" })
        assertTrue(disputedOnly.byReasonFamily.any { it.bucket == GovernanceReasonFamily.ROLLBACK_DISPUTE.name.lowercase() })

        val providerPolicyOnly = orchestrator.getGovernanceSummary(
            userId = "u-governance",
            query = GovernanceQuery(
                windowDays = 30,
                reasonFamily = GovernanceReasonFamily.PROVIDER_POLICY,
                limit = 120
            )
        )
        assertTrue(providerPolicyOnly.matchedRecords >= 1)
        assertTrue(
            providerPolicyOnly.byReasonFamily.any {
                it.bucket == GovernanceReasonFamily.PROVIDER_POLICY.name.lowercase()
            }
        )
    }

    @Test
    fun governanceSummary_includeLegacyFlag_controlsReceiptlessRecords() {
        val legacyRecord = ExecutionReceiptRecord(
            recordId = "legacy_record",
            runId = "legacy_run",
            userId = "u-governance-legacy",
            sessionId = "s-governance-legacy",
            module = ModuleId.CHAT,
            status = ResponseStatus.ERROR,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.SYSTEM_FALLBACK,
            receipt = null,
            createdAtMs = System.currentTimeMillis(),
            updatedAtMs = System.currentTimeMillis()
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-governance-legacy") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(legacyRecord))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)

        val included = orchestrator.getGovernanceSummary(
            userId = "u-governance-legacy",
            query = GovernanceQuery(windowDays = 30, includeLegacyWithoutReceipt = true, limit = 10)
        )
        assertEquals(1, included.matchedRecords)
        assertEquals(0, included.receiptBackedRecords)

        val excluded = orchestrator.getGovernanceSummary(
            userId = "u-governance-legacy",
            query = GovernanceQuery(windowDays = 30, includeLegacyWithoutReceipt = false, limit = 10)
        )
        assertEquals(0, excluded.matchedRecords)
    }

    @Test
    fun governanceConsole_derivesTypedCasesQueuesPrioritiesAndAlerts() {
        val mismatchRecord = ExecutionReceiptRecord(
            recordId = "m8_record_mismatch",
            runId = "m8_run_mismatch",
            userId = "u-m8-console",
            sessionId = "s-m8-console",
            module = ModuleId.LIX,
            status = ResponseStatus.COMMITTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "m8_run_mismatch",
                status = SettlementStatus.COMMITTED,
                syncState = SettlementSyncState.MISMATCH,
                summary = "Local/provider settlement mismatch detected.",
                selectedProviderId = "provider_mismatch",
                selectedProviderName = "Provider Mismatch",
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_MISMATCH),
                recordedAtMs = 1000L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "m8_run_mismatch",
                caseId = "case_m8_mismatch",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute opened while provider acknowledgement is pending.",
                updatedAtMs = 1000L
            ),
            syncIssues = listOf(
                MarketplaceSyncIssue(
                    issueId = "issue_m8_mismatch",
                    providerId = "provider_mismatch",
                    issueType = "reconciliation_mismatch",
                    summary = "Provider callback conflicts with local state.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_MISMATCH),
                    detectedAtMs = 1000L
                )
            ),
            createdAtMs = 1000L,
            updatedAtMs = 1000L
        )
        val providerIssueRecord = ExecutionReceiptRecord(
            recordId = "m8_record_provider",
            runId = "m8_run_provider",
            userId = "u-m8-console",
            sessionId = "s-m8-console",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.USER_PROFILE_DEFAULT,
            settlementRecord = SettlementRecord(
                runId = "m8_run_provider",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Settlement waiting for provider ack.",
                selectedProviderId = "provider_timeout",
                selectedProviderName = "Provider Timeout",
                providerAcks = listOf(
                    ProviderAckRecord(
                        ackId = "ack_m8_timeout",
                        providerId = "provider_timeout",
                        providerName = "Provider Timeout",
                        callbackId = "cb_timeout",
                        status = ProviderAckStatus.TIMEOUT,
                        detail = "Provider callback timeout.",
                        ackAtMs = 1100L
                    )
                ),
                recordedAtMs = 1100L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "m8_run_provider",
                caseId = "case_m8_provider",
                status = DisputeStatus.ACKNOWLEDGED,
                summary = "Dispute acknowledged by provider.",
                updatedAtMs = 1100L
            ),
            providerDecisions = listOf(
                com.lumi.coredomain.contract.ProviderDecisionRecord(
                    providerId = "provider_timeout",
                    providerName = "Provider Timeout",
                    decision = ProviderDecisionStatus.DENIED,
                    denyReason = ProviderDenyReason.POLICY_RESTRICTED,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PROVIDER_DENIED_BY_POLICY),
                    readableReason = "Denied by role policy."
                )
            ),
            createdAtMs = 1100L,
            updatedAtMs = 1100L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m8-console") return null
                return PersistedDynamicState(
                    executionLedgerRecords = listOf(mismatchRecord, providerIssueRecord)
                )
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)
        val cases = orchestrator.getGovernanceCases(
            userId = "u-m8-console",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        )
        assertEquals(2, cases.size)
        assertTrue(cases.any { it.summary.queueTags.contains(GovernanceQueueType.RECONCILIATION_MISMATCH) })
        assertTrue(cases.any { it.summary.queueTags.contains(GovernanceQueueType.PROVIDER_ISSUE) })
        assertTrue(cases.any { it.summary.priority == GovernanceCasePriority.CRITICAL || it.summary.priority == GovernanceCasePriority.HIGH })

        val mismatchOnly = orchestrator.getGovernanceCases(
            userId = "u-m8-console",
            filter = GovernanceConsoleFilter(
                queueType = GovernanceQueueType.RECONCILIATION_MISMATCH,
                includeReviewed = true,
                limit = 10
            )
        )
        assertEquals(1, mismatchOnly.size)
        assertEquals("m8_run_mismatch", mismatchOnly.first().summary.runId)

        val console = orchestrator.getGovernanceConsoleState(
            userId = "u-m8-console",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        )
        assertTrue(console.alerts.any { it.code == "GOVERNANCE_ALERT_SETTLEMENT_MISMATCH" })
        assertTrue(console.queueCounts.any { it.queue == GovernanceQueueType.SYNC_PENDING })
        assertTrue(console.queueCounts.any { it.queue == GovernanceQueueType.DISPUTE_FOLLOW_UP })
        assertTrue(console.savedPresets.any { it.preset == OperatorQueuePreset.SYNC_PENDING })
        assertNotNull(console.homeSummary)
        assertTrue((console.homeSummary?.syncPendingCases ?: 0) >= 1)
    }

    @Test
    fun governanceConsole_bulkActions_applySafeDurableOperations() {
        val record = ExecutionReceiptRecord(
            recordId = "m18_record_bulk",
            runId = "m18_run_bulk",
            userId = "u-m18-bulk",
            sessionId = "s-m18-bulk",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "m18_run_bulk",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Sync pending for provider callback.",
                selectedProviderId = "provider_m18",
                selectedProviderName = "Provider M18",
                recordedAtMs = 3000L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "m18_run_bulk",
                caseId = "case_m18_bulk",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute waiting for provider sync.",
                updatedAtMs = 3000L
            ),
            createdAtMs = 3000L,
            updatedAtMs = 3000L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m18-bulk") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)

        val bulkReview = orchestrator.performGovernanceBulkAction(
            userId = "u-m18-bulk",
            request = GovernanceBulkActionRequest(
                action = GovernanceActionType.MARK_REVIEWED,
                runIds = listOf("m18_run_bulk")
            )
        )
        assertEquals(1, bulkReview.successCount)
        assertEquals(0, bulkReview.failureCount)

        val bulkRetry = orchestrator.performGovernanceBulkAction(
            userId = "u-m18-bulk",
            request = GovernanceBulkActionRequest(
                action = GovernanceActionType.RETRY_SYNC_INTENT,
                runIds = listOf("m18_run_bulk")
            )
        )
        assertEquals(1, bulkRetry.successCount)
        assertEquals(0, bulkRetry.failureCount)

        val updatedLedger = orchestrator.getExecutionLedger(
            userId = "u-m18-bulk",
            filter = LedgerQueryFilter(runId = "m18_run_bulk", limit = 1)
        ).first()
        assertTrue(updatedLedger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_MARKED_REVIEWED })
        assertTrue(updatedLedger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_SYNC_RETRY_REQUESTED })
    }

    @Test
    fun governanceConsole_operatorActions_markReviewedAndRetrySync_areDurableInLedger() {
        val record = ExecutionReceiptRecord(
            recordId = "m8_record_action",
            runId = "m8_run_action",
            userId = "u-m8-actions",
            sessionId = "s-m8-actions",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "m8_run_action",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Awaiting provider acknowledgement.",
                selectedProviderId = "provider_sync",
                selectedProviderName = "Provider Sync",
                recordedAtMs = 1200L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "m8_run_action",
                caseId = "case_m8_action",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute open and waiting for sync.",
                updatedAtMs = 1200L
            ),
            createdAtMs = 1200L,
            updatedAtMs = 1200L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m8-actions") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)
        val reviewResult = orchestrator.markGovernanceCaseReviewed("u-m8-actions", "m8_run_action")
        assertTrue(reviewResult.success)
        assertEquals(GovernanceActionType.MARK_REVIEWED, reviewResult.action)

        val hiddenByDefault = orchestrator.getGovernanceCases(
            userId = "u-m8-actions",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = false)
        )
        assertTrue(hiddenByDefault.isEmpty())

        val visibleReviewed = orchestrator.getGovernanceCases(
            userId = "u-m8-actions",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        )
        assertEquals(1, visibleReviewed.size)
        assertTrue(visibleReviewed.first().summary.reviewed)

        val retryResult = orchestrator.retryGovernanceSyncIntent("u-m8-actions", "m8_run_action")
        assertTrue(retryResult.success)
        assertEquals(GovernanceActionType.RETRY_SYNC_INTENT, retryResult.action)

        val updatedLedger = orchestrator.getExecutionLedger(
            userId = "u-m8-actions",
            filter = LedgerQueryFilter(runId = "m8_run_action", limit = 1)
        ).first()
        assertTrue(updatedLedger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_MARKED_REVIEWED })
        assertTrue(updatedLedger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_SYNC_RETRY_REQUESTED })
        assertTrue(
            updatedLedger.reconciliationSummary?.reasonCodes
                ?.contains(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_RETRY) == true
        )
    }

    @Test
    fun governanceConsole_remotePipelineSummary_isVisibleAfterRetrySyncIntent() {
        val record = ExecutionReceiptRecord(
            recordId = "m9_record_remote",
            runId = "m9_run_remote",
            userId = "u-m9-remote",
            sessionId = "s-m9-remote",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "m9_run_remote",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Sync pending for provider acknowledgement.",
                selectedProviderId = "provider_remote",
                selectedProviderName = "Provider Remote",
                recordedAtMs = 2000L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "m9_run_remote",
                caseId = "case_m9_remote",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute open and waiting for remote sync.",
                updatedAtMs = 2000L
            ),
            createdAtMs = 2000L,
            updatedAtMs = 2000L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m9-remote") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)

        val retryResult = orchestrator.retryGovernanceSyncIntent("u-m9-remote", "m9_run_remote")
        assertTrue(retryResult.success)

        val console = orchestrator.getGovernanceConsoleState(
            userId = "u-m9-remote",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        )
        assertTrue(console.remotePipelineSummary != null)
        assertTrue(console.remotePipelineSummary?.summary?.contains("Telemetry", ignoreCase = true) == true)
        val case = console.cases.firstOrNull { it.summary.runId == "m9_run_remote" }
        assertTrue(case != null)
        assertTrue(case?.remotePipelineSummary != null)
        assertTrue(case?.remoteDeliveryIssues?.any { it.code.contains("REMOTE_RECONCILIATION", ignoreCase = true) } == true)
    }

    @Test
    fun retryGovernanceSyncIntent_deduplicatesReconciliationRemoteRecordsByRun() {
        val record = ExecutionReceiptRecord(
            recordId = "m9_record_dedupe",
            runId = "m9_run_dedupe",
            userId = "u-m9-dedupe",
            sessionId = "s-m9-dedupe",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            settlementRecord = SettlementRecord(
                runId = "m9_run_dedupe",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Settlement sync pending.",
                selectedProviderId = "provider_dedupe",
                selectedProviderName = "Provider Dedupe",
                recordedAtMs = 2100L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "m9_run_dedupe",
                caseId = "case_m9_dedupe",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute waiting for sync.",
                updatedAtMs = 2100L
            ),
            createdAtMs = 2100L,
            updatedAtMs = 2100L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m9-dedupe") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = persistence)

        assertTrue(orchestrator.retryGovernanceSyncIntent("u-m9-dedupe", "m9_run_dedupe").success)
        assertTrue(orchestrator.retryGovernanceSyncIntent("u-m9-dedupe", "m9_run_dedupe").success)

        val case = orchestrator.getGovernanceCases(
            userId = "u-m9-dedupe",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).firstOrNull { it.summary.runId == "m9_run_dedupe" }

        assertTrue(case != null)
        assertEquals(1, case?.remotePipelineSummary?.reconciliationOpenCount)
        assertTrue((case?.remotePipelineSummary?.handoffPendingCount ?: 0) >= 1)
        assertEquals(
            1,
            case?.remoteDeliveryIssues?.count { it.code == "REMOTE_RECONCILIATION_PENDING" }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_updatesCaseStateAndRemoteTrail() {
        val now = 3_000L
        val record = ExecutionReceiptRecord(
            recordId = "m10_record_1",
            runId = "m10_run_1",
            userId = "u-m10",
            sessionId = "s-m10",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 500L,
            updatedAtMs = now - 500L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m10") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistence,
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m10",
                runId = "m10_run_1",
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.CLAIM_CASE,
                    actorUserId = "local-user",
                    actorDisplayName = "Local Operator",
                    timestampMs = now
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m10",
                runId = "m10_run_1",
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ASSIGN_CASE,
                    actorUserId = "local-user",
                    actorDisplayName = "Local Operator",
                    assignee = OperatorAssigneeRef(
                        userId = "ops_triage",
                        displayName = "Ops Triage"
                    ),
                    timestampMs = now + 1L
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m10",
                runId = "m10_run_1",
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADD_NOTE,
                    actorUserId = "local-user",
                    actorDisplayName = "Local Operator",
                    note = "Escalated for dispute follow-up.",
                    timestampMs = now + 2L
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m10",
                runId = "m10_run_1",
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                    actorUserId = "local-user",
                    actorDisplayName = "Local Operator",
                    followUpSummary = "Provider confirmation still pending.",
                    target = "remote_operator_stub",
                    timestampMs = now + 3L
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m10",
                runId = "m10_run_1",
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ACK_REMOTE_HANDOFF,
                    actorUserId = "local-user",
                    actorDisplayName = "Local Operator",
                    timestampMs = now + 4L
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = "u-m10",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).firstOrNull { it.summary.runId == "m10_run_1" }

        assertNotNull(case)
        assertEquals(OperatorCollaborationStatus.REVIEW_IN_PROGRESS, case.collaborationState?.status)
        assertEquals("Ops Triage", case.collaborationState?.assignedTo?.displayName)
        assertTrue(case.collaborationState?.notes?.isNotEmpty() == true)
        assertEquals(RemoteOperatorHandoffStatus.ACKNOWLEDGED, case.remoteOperatorHandoff?.status)
        assertTrue(case.alertRoutingRecords.isNotEmpty())
        assertTrue(
            case.alertRoutingRecords.any {
                it.status == AlertRoutingStatus.QUEUED ||
                    it.status == AlertRoutingStatus.DELIVERED ||
                    it.status == AlertRoutingStatus.LOCAL_ONLY
            }
        )
        assertTrue(case.collaborationState?.handoffHistory?.isNotEmpty() == true)
        assertTrue(case.latestCollaborationEvent != null)
    }

    @Test
    fun updateGovernanceCaseCollaboration_workflowTemplateStageAndAutomation_areDurable() {
        var now = 4_000L
        val runId = "m19_run_workflow"
        val userId = "u-m19-workflow"
        val record = ExecutionReceiptRecord(
            recordId = "m19_record_workflow",
            runId = runId,
            userId = userId,
            sessionId = "s-m19-workflow",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 50L,
            updatedAtMs = now - 50L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADVANCE_WORKFLOW_STAGE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.RUN_SAFE_AUTOMATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    collaborationSource = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.LOCAL_AUTOMATION,
                    automationRuleId = "auto_sync_pending",
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertEquals("Provider Follow-up", case.summary.workflowTemplateName)
        assertEquals(com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC, case.summary.workflowStage)
        assertTrue(case.workflowSummary.contains("Template", ignoreCase = true))
        assertTrue(case.latestCollaborationEvent != null)
        assertTrue(case.latestAutomationAudit != null)
        assertTrue(case.collaborationState?.workflowRun != null)
        assertTrue(case.collaborationState?.collaborationEvents?.isNotEmpty() == true)
        assertTrue(case.collaborationState?.automationAudit?.isNotEmpty() == true)

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.workflowRun != null)
        assertTrue(ledger.collaborationEvents.isNotEmpty())
        assertTrue(ledger.automationAudit.isNotEmpty())
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_TEMPLATE_ATTACHED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_STAGE_CHANGED })
        assertTrue(
            ledger.runEvents.any { event ->
                event.type == ProofLedgerEventType.AUTOMATION_ACTION_EXECUTED ||
                    event.type == ProofLedgerEventType.AUTOMATION_ACTION_SKIPPED ||
                    event.type == ProofLedgerEventType.AUTOMATION_GUARDRAIL_BLOCKED ||
                    event.type == ProofLedgerEventType.AUTOMATION_SIMULATION_ONLY
            }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_m20PolicySlaAndAutomationGuardrails_areDurableAndFilterable() {
        var now = 5_000L
        val runId = "m20_run_policy_sla_guardrails"
        val userId = "u-m20-policy"
        val record = ExecutionReceiptRecord(
            recordId = "m20_record_policy_sla_guardrails",
            runId = runId,
            userId = userId,
            sessionId = "s-m20-policy",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 7 * 60 * 60 * 1000L
        val automation = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.RUN_SAFE_AUTOMATION,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                collaborationSource = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.LOCAL_AUTOMATION,
                automationRuleId = "auto_sync_pending",
                timestampMs = now
            )
        )
        assertTrue(automation.success)
        assertTrue(
            automation.message.contains("blocked", ignoreCase = true) ||
                automation.message.contains("simulated", ignoreCase = true) ||
                automation.message.contains("suppressed", ignoreCase = true)
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 20, includeReviewed = true)
        ).first { it.summary.runId == runId }

        assertEquals(com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED, case.summary.slaStatus)
        assertEquals(com.lumi.coredomain.contract.WorkflowStageTimerStatus.OVERDUE, case.summary.stageTimerStatus)
        assertTrue(
            case.summary.escalationTimerStatus == com.lumi.coredomain.contract.WorkflowEscalationTimerStatus.REQUIRED ||
                case.summary.escalationTimerStatus == com.lumi.coredomain.contract.WorkflowEscalationTimerStatus.TRIGGERED
        )
        assertTrue(
            case.summary.automationEligibility ==
                com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus.BLOCKED ||
                case.summary.automationEligibility ==
                com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus.SIMULATION_ONLY
        )
        assertTrue(case.workflowPolicySummary.contains("policy", ignoreCase = true))
        assertTrue(case.slaSummary.contains("breached", ignoreCase = true))
        assertTrue(
            case.automationGuardrailSummary.contains("blocked", ignoreCase = true) ||
                case.automationGuardrailSummary.contains("simulated", ignoreCase = true)
        )
        assertTrue(case.nextRequiredHumanAction.isNotBlank())

        val slaBreachCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                slaBreachOnly = true,
                limit = 20
            )
        )
        assertTrue(slaBreachCases.any { it.summary.runId == runId })

        val automationBlockedCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                automationBlockedOnly = true,
                limit = 20
            )
        )
        assertTrue(automationBlockedCases.any { it.summary.runId == runId })

        val escalationPendingCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                escalationPendingOnly = true,
                limit = 20
            )
        )
        assertTrue(escalationPendingCases.any { it.summary.runId == runId })

        val workflowFilteredCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                workflowTemplateId = "wf_provider_follow_up",
                workflowStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_PROVIDER,
                limit = 20
            )
        )
        assertTrue(workflowFilteredCases.any { it.summary.runId == runId })

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(
            ledger.runEvents.any {
                it.type == ProofLedgerEventType.AUTOMATION_GUARDRAIL_BLOCKED ||
                    it.type == ProofLedgerEventType.AUTOMATION_GUARDRAIL_THROTTLED ||
                    it.type == ProofLedgerEventType.AUTOMATION_SIMULATION_ONLY
            }
        )
        assertTrue(ledger.runEvents.flatMap { it.reasonCodes }.contains(RoleReasonCodes.ROLE_SLA_BREACHED))
        assertEquals(com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED, ledger.workflowRun?.slaClock?.status)
    }

    @Test
    fun updateGovernanceCaseCollaboration_m20TransitionPolicy_deniesInvalidStageAdvance() {
        val now = 6_500L
        val runId = "m20_run_transition_blocked"
        val userId = "u-m20-transition"
        val record = ExecutionReceiptRecord(
            recordId = "m20_record_transition_blocked",
            runId = runId,
            userId = userId,
            sessionId = "s-m20-transition",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        val blocked = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ADVANCE_WORKFLOW_STAGE,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                workflowStage = com.lumi.coredomain.contract.OperatorWorkflowStage.RESOLVED,
                timestampMs = now + 1L
            )
        )

        assertFalse(blocked.success)
        assertTrue(blocked.message.contains("blocked by policy", ignoreCase = true))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_APPLIED })
        assertTrue(
            ledger.runEvents.any {
                it.type == ProofLedgerEventType.WORKFLOW_POLICY_APPLIED &&
                    it.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_DENIED)
            }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_m21PolicyPackOverridesSimulationAndExplicitPrecedence_areDurableAndFilterable() {
        var now = 7_500L
        val runId = "m21_run_policy_pack"
        val userId = "u-m21-policy"
        val record = ExecutionReceiptRecord(
            recordId = "m21_record_policy_pack",
            runId = runId,
            userId = userId,
            sessionId = "s-m21-policy",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        val attach = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                policyPackId = "pack_m21_workspace",
                policyPackVersionId = "v_m21_1",
                tenantPolicyOverrideId = "tenant_override_m21",
                workspacePolicyOverrideId = "workspace_override_m21",
                automationSimulationOnly = true,
                timestampMs = now
            )
        )
        assertTrue(attach.success)

        now += 1_000L
        val automation = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.RUN_SAFE_AUTOMATION,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                collaborationSource = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.LOCAL_AUTOMATION,
                automationRuleId = "auto_sync_pending",
                explicitCaseConstraintSimulationOnly = true,
                timestampMs = now
            )
        )
        assertTrue(automation.success)
        assertTrue(automation.message.contains("simulated", ignoreCase = true))

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 20, includeReviewed = true)
        ).first { it.summary.runId == runId }

        assertEquals("pack_m21_workspace", case.summary.workflowPolicyPackId)
        assertEquals("v_m21_1", case.summary.workflowPolicyPackVersion)
        assertEquals(
            com.lumi.coredomain.contract.WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
            case.summary.workflowPolicyPrecedenceSource
        )
        assertTrue(case.summary.workflowSimulationOnly)
        assertTrue(case.workflowPolicyPackSummary.contains("pack", ignoreCase = true))
        assertTrue(case.workflowOverrideSummary.contains("override", ignoreCase = true))
        assertTrue(case.workflowAutomationControlSummary.isNotBlank())
        assertTrue(case.workflowPolicyResolutionSummary.contains("explicit", ignoreCase = true))

        val byPack = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                workflowPolicyPackId = "pack_m21_workspace",
                workflowPolicyPackVersion = "v_m21_1",
                limit = 20
            )
        )
        assertTrue(byPack.any { it.summary.runId == runId })

        val overrideOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                policyOverrideAppliedOnly = true,
                limit = 20
            )
        )
        assertTrue(overrideOnly.any { it.summary.runId == runId })

        val simulationOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                workflowSimulationOnly = true,
                limit = 20
            )
        )
        assertTrue(simulationOnly.any { it.summary.runId == runId })

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.AUTOMATION_SIMULATION_ONLY })

        val reasonCodes = ledger.runEvents.flatMap { it.reasonCodes }.toSet()
        assertTrue(reasonCodes.contains(RoleReasonCodes.ROLE_WORKFLOW_POLICY_PACK_APPLIED))
        assertTrue(reasonCodes.contains(RoleReasonCodes.ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT))
        assertTrue(reasonCodes.contains(RoleReasonCodes.ROLE_AUTOMATION_SIMULATION_ONLY))
    }

    @Test
    fun updateGovernanceCaseCollaboration_m22SimulationOnlyRollout_isVisibleAndNonEnforcing() {
        val now = 8_500L
        val runId = "m22_run_simulation_only"
        val userId = "u-m22-simulation-only"
        val record = ExecutionReceiptRecord(
            recordId = "m22_record_simulation_only",
            runId = runId,
            userId = userId,
            sessionId = "s-m22-simulation-only",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        val attach = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                policyPackId = "pack_m22_workspace",
                policyPackVersionId = "v_m22_1",
                timestampMs = now
            )
        )
        assertTrue(attach.success)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 20, includeReviewed = true)
        ).first { it.summary.runId == runId }

        assertEquals(PolicyRolloutStage.SIMULATION_ONLY, case.summary.workflowRolloutStage)
        assertEquals(PolicyRolloutMode.SIMULATION_ONLY, case.summary.workflowRolloutMode)
        assertTrue(case.summary.workflowSimulationOnly)
        assertTrue(case.workflowRolloutSummary.contains("simulation", ignoreCase = true))
        assertTrue(case.workflowRolloutApprovalSummary.contains("no rollout approval gate", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_SIMULATION_ONLY))
    }

    @Test
    fun updateGovernanceCaseCollaboration_m22RiskyPromotion_requiresApproval() {
        var now = 8_900L
        val runId = "m22_run_approval_required"
        val userId = "u-m22-approval-required"
        val record = ExecutionReceiptRecord(
            recordId = "m22_record_approval_required",
            runId = runId,
            userId = userId,
            sessionId = "s-m22-approval-required",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        val enforce = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ENFORCE_POLICY_ROLLOUT,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                policyRolloutReason = "Promote rollout to enforced mode.",
                timestampMs = now
            )
        )
        assertTrue(enforce.success)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                workflowRolloutApprovalState = PolicyRolloutApprovalState.PENDING,
                limit = 20
            )
        ).first { it.summary.runId == runId }

        assertEquals(PolicyRolloutStage.SIMULATION_ONLY, case.summary.workflowRolloutStage)
        assertEquals(PolicyRolloutMode.SIMULATION_ONLY, case.summary.workflowRolloutMode)
        assertEquals(PolicyRolloutApprovalState.PENDING, case.summary.workflowRolloutApprovalState)
        assertTrue(case.summary.workflowSimulationOnly)
        assertTrue(case.workflowRolloutApprovalSummary.contains("pending", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_APPROVAL_REQUIRED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_PROMOTION_BLOCKED))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_PROMOTION_REQUESTED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m22PauseBlocksStrongerEnforcement_andScopeExpansionIsAuditable() {
        var now = 9_300L
        val runId = "m22_run_pause_scope"
        val userId = "u-m22-pause-scope"
        val record = ExecutionReceiptRecord(
            recordId = "m22_record_pause_scope",
            runId = runId,
            userId = userId,
            sessionId = "s-m22-pause-scope",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_POLICY_ROLLOUT_APPROVAL,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutApprovalRequirement = PolicyRolloutApprovalRequirement.REQUIRED_FOR_PROMOTION,
                    policyRolloutReason = "Need explicit approval for enforcement.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.APPROVE_POLICY_ROLLOUT,
                    actorUserId = "ops_compliance",
                    actorDisplayName = "Ops Compliance",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Approved for guarded promotion.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.EXPAND_POLICY_ROLLOUT_SCOPE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.TENANT,
                    policyRolloutTenantId = "tenant_alpha",
                    policyRolloutReason = "Expand from workflow template to tenant scope.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.PAUSE_POLICY_ROLLOUT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Pause rollout while reviewing risk.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        val enforce = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ENFORCE_POLICY_ROLLOUT,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                policyRolloutReason = "Attempt full enforcement while paused.",
                timestampMs = now
            )
        )
        assertTrue(enforce.success)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                workflowRolloutScope = PolicyRolloutScope.TENANT,
                workflowRolloutPausedOnly = true,
                limit = 20
            )
        ).first { it.summary.runId == runId }

        assertEquals(PolicyRolloutScope.TENANT, case.summary.workflowRolloutScope)
        assertEquals(PolicyRolloutFreezeState.PAUSED_BY_OPERATOR, case.summary.workflowRolloutFreezeState)
        assertTrue(case.summary.workflowSimulationOnly)
        assertTrue(case.workflowRolloutFreezeSummary.contains("paused", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_SCOPE_EXPANDED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_GUARDRAIL_BLOCKED))
        assertTrue(case.workflowPolicyRolloutState?.auditRecords?.any {
            it.action == PolicyRolloutAuditAction.SCOPE_EXPANDED
        } == true)

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_SCOPE_EXPANDED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_PAUSED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m22RollbackRestoresLastSafeState_andKeepsHistory() {
        var now = 9_900L
        val runId = "m22_run_rollback"
        val userId = "u-m22-rollback"
        val record = ExecutionReceiptRecord(
            recordId = "m22_record_rollback",
            runId = runId,
            userId = userId,
            sessionId = "s-m22-rollback",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.PROMOTE_POLICY_ROLLOUT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutMode = PolicyRolloutMode.STAGED,
                    policyRolloutReason = "Promote rollout to staged mode.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_POLICY_ROLLOUT_APPROVAL,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutApprovalRequirement = PolicyRolloutApprovalRequirement.REQUIRED_FOR_PROMOTION,
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.APPROVE_POLICY_ROLLOUT,
                    actorUserId = "ops_compliance",
                    actorDisplayName = "Ops Compliance",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ENFORCE_POLICY_ROLLOUT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Move rollout to enforced mode.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ROLLBACK_POLICY_ROLLOUT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Rollback after production anomaly.",
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                workflowRolloutStage = PolicyRolloutStage.ROLLED_BACK,
                limit = 20
            )
        ).first { it.summary.runId == runId }

        assertEquals(PolicyRolloutStage.ROLLED_BACK, case.summary.workflowRolloutStage)
        assertEquals(PolicyRolloutMode.STAGED, case.summary.workflowRolloutMode)
        assertTrue(case.workflowRolloutRollbackSummary.contains("rolled back", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_ROLLED_BACK))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_RESTORED_LAST_SAFE))
        assertEquals(PolicyRolloutMode.STAGED, case.workflowPolicyRolloutState?.rollbackRecord?.toMode)

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_PROMOTED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_ENFORCED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_ROLLED_BACK })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m23PromotionApproveAndAdvance_updatesGovernanceState() {
        var now = 10_600L
        val runId = "m23_run_promote_advance"
        val userId = "u-m23-promote-advance"
        val record = ExecutionReceiptRecord(
            recordId = "m23_record_promote_advance",
            runId = runId,
            userId = userId,
            sessionId = "s-m23-promote-advance",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        val requestPromotion = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_POLICY_PROMOTION,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                policyRolloutScope = PolicyRolloutScope.WORKSPACE,
                policyRolloutReason = "Request promotion from simulation to staged rollout.",
                timestampMs = now
            )
        )
        assertTrue(requestPromotion.success)

        now += 1_000L
        val approvePromotion = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.APPROVE_POLICY_PROMOTION,
                actorUserId = "ops_compliance",
                actorDisplayName = "Ops Compliance",
                workflowTemplateId = "wf_provider_follow_up",
                policyRolloutReason = "Promotion approved after governance review.",
                timestampMs = now
            )
        )
        assertTrue(approvePromotion.success)

        now += 1_000L
        val advance = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ADVANCE_POLICY_ROLLOUT,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                workflowTemplateId = "wf_provider_follow_up",
                policyRolloutScope = PolicyRolloutScope.WORKSPACE,
                policyRolloutReason = "Advance rollout based on readiness and approval.",
                timestampMs = now
            )
        )
        assertTrue(advance.success)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                policyPromotionStatus = com.lumi.coredomain.contract.PolicyPromotionStatus.ADVANCED,
                policyPromotionReadiness = com.lumi.coredomain.contract.PolicyPromotionReadinessStatus.READY,
                limit = 20
            )
        ).first { it.summary.runId == runId }
        assertEquals(com.lumi.coredomain.contract.PolicyPromotionStatus.ADVANCED, case.summary.policyPromotionStatus)
        assertEquals(com.lumi.coredomain.contract.PolicyPromotionReadinessStatus.READY, case.summary.policyPromotionReadiness)
        assertFalse(case.summary.policyApprovalPending)
        assertTrue(case.policyPromotionSummary.contains("policy promotion", ignoreCase = true))
        assertTrue(case.policyPromotionReadinessSummary.contains("ready", ignoreCase = true))
        assertTrue(case.policyRolloutAnalytics?.summary?.contains("rollout analytics", ignoreCase = true) == true)
        assertTrue(case.policyApprovalOperations.isNotEmpty())
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_ADVANCE_ALLOWED))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PROMOTION_REQUESTED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PROMOTION_APPROVED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ROLLOUT_ADVANCED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m23PromotionRejected_blocksAdvanceAndIsAuditable() {
        var now = 11_200L
        val runId = "m23_run_reject_blocked"
        val userId = "u-m23-reject-blocked"
        val record = ExecutionReceiptRecord(
            recordId = "m23_record_reject_blocked",
            runId = runId,
            userId = userId,
            sessionId = "s-m23-reject-blocked",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_POLICY_PROMOTION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.WORKSPACE,
                    policyRolloutReason = "Request promotion.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REJECT_POLICY_PROMOTION,
                    actorUserId = "ops_compliance",
                    actorDisplayName = "Ops Compliance",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Promotion rejected due to unresolved compliance blockers.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADVANCE_POLICY_ROLLOUT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.WORKSPACE,
                    policyRolloutReason = "Attempt advance after rejection.",
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                policyPromotionStatus = com.lumi.coredomain.contract.PolicyPromotionStatus.BLOCKED,
                policyApprovalPendingOnly = false,
                limit = 20
            )
        ).first { it.summary.runId == runId }
        assertEquals(com.lumi.coredomain.contract.PolicyPromotionStatus.BLOCKED, case.summary.policyPromotionStatus)
        assertTrue(case.policyPromotionReadinessSummary.contains("blocked", ignoreCase = true))
        assertTrue(case.policyPromotionBlockerSummary.contains("approval", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_PROMOTION_BLOCKED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ROLLOUT_ADVANCE_DENIED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_APPROVAL_DENIED))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PROMOTION_REJECTED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PROMOTION_READINESS_EVALUATED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m24ProgramLifecycleAndCrossTenantActions_areDurableAndVisible() {
        var now = 12_000L
        val runId = "m24_run_program_lifecycle"
        val userId = "u-m24-program-lifecycle"
        val record = ExecutionReceiptRecord(
            recordId = "m24_record_program_lifecycle",
            runId = runId,
            userId = userId,
            sessionId = "s-m24-program-lifecycle",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowPolicyPackId = "pack_alpha",
                    workflowPolicyPackVersion = "v1",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.CREATE_POLICY_GOVERNANCE_PROGRAM,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowPolicyPackId = "pack_alpha",
                    workflowPolicyPackVersion = "v1",
                    policyProgramId = "program_alpha",
                    policyProgramName = "Program Alpha",
                    policyProgramWaveId = "wave_alpha",
                    policyProgramWaveStatus = com.lumi.coredomain.contract.PolicyGovernanceWaveStatus.STAGED,
                    policyRolloutScope = PolicyRolloutScope.TENANT,
                    policyRolloutTenantId = "tenant_alpha",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADVANCE_POLICY_GOVERNANCE_WAVE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyProgramWaveId = "wave_alpha",
                    policyProgramWaveStatus = com.lumi.coredomain.contract.PolicyGovernanceWaveStatus.ADVANCING,
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADD_POLICY_ROLLOUT_EXEMPTION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.TENANT,
                    policyRolloutTenantId = "tenant_beta",
                    policyExemptionReason = "Tenant beta keeps legacy approval flow for now.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.PIN_POLICY_ROLLOUT_TARGET,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.WORKSPACE,
                    policyRolloutWorkspaceId = "workspace_red",
                    policyPinPackVersionId = "v2",
                    policyLifecycleReason = "Workspace red is pinned pending partner validation.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.DEPRECATE_POLICY_PACK,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyLifecycleReason = "Pack alpha is deprecated for new target onboarding.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_POLICY_PACK_REPLACEMENT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowPolicyPackId = "pack_alpha",
                    policyReplacementPackId = "pack_beta",
                    policyReplacementPackVersionId = "v3",
                    policyLifecycleReason = "Move to pack beta after readiness checks.",
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 20
            )
        ).first { it.summary.runId == runId }
        assertTrue(
            case.summary.policyGovernanceProgramStatus in setOf(
                com.lumi.coredomain.contract.PolicyGovernanceProgramStatus.ACTIVE,
                com.lumi.coredomain.contract.PolicyGovernanceProgramStatus.RETIRED
            )
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyGovernanceWaveStatus.ADVANCING,
            case.summary.policyGovernanceWaveStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleStatus.SUPERSEDED,
            case.summary.workflowPackLifecycleStatus
        )
        assertTrue(case.summary.crossTenantExemptedTargets >= 1)
        assertTrue(case.summary.crossTenantPinnedTargets >= 1)
        assertTrue(case.policyProgramSummary.contains("program", ignoreCase = true))
        assertTrue(case.policyCrossTenantSummary.contains("cross-tenant", ignoreCase = true))
        assertTrue(case.policyPackLifecycleSummary.contains("lifecycle", ignoreCase = true))
        assertTrue(case.policyPackDeprecationSummary.contains("deprecated", ignoreCase = true))
        assertTrue(case.policyPackReplacementSummary.contains("pack_alpha", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_PROGRAM_CREATED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_PROGRAM_WAVE_ADVANCED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_TARGET_EXEMPTED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_TARGET_PINNED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_PACK_DEPRECATED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_PACK_REPLACEMENT_ATTACHED))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PROGRAM_CREATED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PROGRAM_WAVE_ADVANCED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_TARGET_EXEMPTED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_TARGET_PINNED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PACK_DEPRECATED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PACK_REPLACEMENT_ATTACHED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m24RetirementBlockedUntilExemptionCleared_thenRetires() {
        var now = 12_800L
        val runId = "m24_run_retirement_blocked"
        val userId = "u-m24-retirement-blocked"
        val record = ExecutionReceiptRecord(
            recordId = "m24_record_retirement_blocked",
            runId = runId,
            userId = userId,
            sessionId = "s-m24-retirement-blocked",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowPolicyPackId = "pack_gamma",
                    workflowPolicyPackVersion = "v7",
                    timestampMs = now
                )
            ).success
        )

        now += 31_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADD_POLICY_ROLLOUT_EXEMPTION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.TENANT,
                    policyRolloutTenantId = "tenant_hold",
                    policyExemptionReason = "Temporary exemption until tenant migration complete.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.RETIRE_POLICY_PACK,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyLifecycleReason = "Start retirement sequence.",
                    timestampMs = now
                )
            ).success
        )

        val blocked = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleStatus.BLOCKED,
            blocked.summary.workflowPackLifecycleStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.CrossTenantRolloutReadinessStatus.BLOCKED,
            blocked.summary.crossTenantReadinessStatus
        )
        assertTrue(blocked.policyPackRetirementSummary.contains("blocked", ignoreCase = true))
        assertTrue(blocked.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_RETIREMENT_BLOCKED))
        assertTrue(blocked.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_CROSS_TENANT_ROLLOUT_HELD))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(
            ledger.runEvents.any { event ->
                event.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_CROSS_TENANT_ROLLOUT_HELD)
            }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_m24RetirePolicyPack_withoutPinsOrExemptions_marksRetired() {
        val now = 13_400L
        val runId = "m24_run_retirement_success"
        val userId = "u-m24-retirement-success"
        val record = ExecutionReceiptRecord(
            recordId = "m24_record_retirement_success",
            runId = runId,
            userId = userId,
            sessionId = "s-m24-retirement-success",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 10L,
            updatedAtMs = now - 10L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.RETIRE_POLICY_PACK,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyLifecycleReason = "Retire legacy pack after migration completion.",
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleStatus.RETIRED,
            case.summary.workflowPackLifecycleStatus
        )
        assertTrue(case.policyPackRetirementSummary.contains("retire", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_PACK_RETIREMENT_STARTED))

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_PACK_RETIREMENT_STARTED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m25PolicyEstateDriftAndRemediation_areDurableAndFilterable() {
        var now = 14_100L
        val runId = "m25_run_policy_estate"
        val userId = "u-m25-policy-estate"
        val record = ExecutionReceiptRecord(
            recordId = "m25_record_policy_estate",
            runId = runId,
            userId = userId,
            sessionId = "s-m25-policy-estate",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowPolicyPackId = "pack_m25_base",
                    workflowPolicyPackVersion = "v1",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADD_POLICY_ROLLOUT_EXEMPTION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutScope = PolicyRolloutScope.TENANT,
                    policyRolloutTenantId = "tenant_m25_hold",
                    policyExemptionReason = "Temporary exemption until migration completes.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_POLICY_ESTATE_REMEDIATION_PLAN,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyLifecycleReason = "Attach remediation plan for policy estate drift.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyLifecycleReason = "Schedule safe remediation for policy estate blockers.",
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertTrue(case.policyEstateSummary.contains("policy estate", ignoreCase = true))
        assertTrue(case.summary.policyEstateDriftSeverity != null)
        assertTrue(case.summary.policyEstateBlockerCount >= 1)
        assertTrue(case.summary.policyEstateRemediationPending)
        assertEquals(
            com.lumi.coredomain.contract.PolicyEstateRemediationStatus.SCHEDULED,
            case.policyEstateRemediationPlan?.status
        )
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ESTATE_SNAPSHOT_COMPUTED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ESTATE_REMEDIATION_PLAN_ATTACHED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ESTATE_REMEDIATION_SCHEDULED))
        assertTrue(
            case.alerts.any {
                it.code == "GOVERNANCE_ALERT_POLICY_ESTATE_BLOCKERS" ||
                    it.code == "GOVERNANCE_ALERT_POLICY_ESTATE_DRIFT"
            }
        )

        val blockedOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                policyEstateBlockedOnly = true,
                limit = 20
            )
        )
        assertTrue(blockedOnly.any { it.summary.runId == runId })

        val scheduledRemediation = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                policyEstateRemediationStatus = com.lumi.coredomain.contract.PolicyEstateRemediationStatus.SCHEDULED,
                limit = 20
            )
        )
        assertTrue(scheduledRemediation.any { it.summary.runId == runId })

        val driftSeverity = case.summary.policyEstateDriftSeverity
        if (driftSeverity != null) {
            val bySeverity = orchestrator.getGovernanceCases(
                userId = userId,
                filter = GovernanceConsoleFilter(
                    includeReviewed = true,
                    policyEstateDriftSeverity = driftSeverity,
                    limit = 20
                )
            )
            assertTrue(bySeverity.any { it.summary.runId == runId })
        }

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ESTATE_REMEDIATION_PLAN_ATTACHED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ESTATE_REMEDIATION_SCHEDULED })
        assertTrue(
            ledger.runEvents.any { event ->
                event.reasonCodes.contains(RoleReasonCodes.ROLE_POLICY_ESTATE_REMEDIATION_SCHEDULED)
            }
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyEstateRemediationStatus.SCHEDULED,
            ledger.policyEstateRemediationPlan?.status
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_deduplicatesByCommandBucket() {
        val timestamp = 5_000L
        val record = ExecutionReceiptRecord(
            recordId = "m10_record_dedupe",
            runId = "m10_run_dedupe",
            userId = "u-m10-dedupe",
            sessionId = "s-m10-dedupe",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = timestamp,
            updatedAtMs = timestamp
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m10-dedupe") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: com.lumi.coredomain.contract.DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistence,
            nowMs = { timestamp }
        )
        val command = GovernanceCollaborationCommand(
            commandType = GovernanceActionType.CLAIM_CASE,
            actorUserId = "local-user",
            actorDisplayName = "Local Operator",
            timestampMs = timestamp
        )

        assertTrue(orchestrator.updateGovernanceCaseCollaboration("u-m10-dedupe", "m10_run_dedupe", command).success)
        assertTrue(orchestrator.updateGovernanceCaseCollaboration("u-m10-dedupe", "m10_run_dedupe", command).success)

        val ledger = orchestrator.getExecutionLedger(
            userId = "u-m10-dedupe",
            filter = LedgerQueryFilter(runId = "m10_run_dedupe", limit = 5)
        )
        val target = ledger.firstOrNull { it.runId == "m10_run_dedupe" }
        assertNotNull(target)
        assertEquals(
            1,
            target.runEvents.count { it.type == ProofLedgerEventType.OPERATOR_CASE_CLAIMED }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_permissionDenied_recordsDurableTrail() {
        val now = 6_000L
        val runId = "m11_run_perm_denied"
        val record = ExecutionReceiptRecord(
            recordId = "m11_record_perm_denied",
            runId = runId,
            userId = "u-m11-perm",
            sessionId = "s-m11-perm",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 1L,
            updatedAtMs = now - 1L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m11-perm") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistence,
            nowMs = { now }
        )

        val deniedResult = orchestrator.updateGovernanceCaseCollaboration(
            userId = "u-m11-perm",
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ASSIGN_CASE,
                actorUserId = "viewer-1",
                actorDisplayName = "Viewer One",
                operatorIdentity = OperatorIdentity(
                    userId = "viewer-1",
                    displayName = "Viewer One",
                    role = OperatorRole.READ_ONLY,
                    permissions = listOf(OperatorPermission.CLAIM_CASE),
                    scope = PermissionScope.ANY_CASE
                ),
                assignee = OperatorAssigneeRef(
                    userId = "ops_triage",
                    displayName = "Ops Triage"
                ),
                timestampMs = now
            )
        )

        assertFalse(deniedResult.success)
        assertEquals(OperatorPermissionDenialReason.PERMISSION_MISSING, deniedResult.denialReason)
        assertEquals(OperatorPermission.ASSIGN_CASE, deniedResult.requiredPermission)

        val case = orchestrator.getGovernanceCases(
            userId = "u-m11-perm",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue(case.permissionDenialSummary.contains("assign case", ignoreCase = true))
        assertTrue(case.collaborationState?.permissionDenials?.isNotEmpty() == true)

        val ledger = orchestrator.getExecutionLedger(
            userId = "u-m11-perm",
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_PERMISSION_DENIED })
        assertTrue(
            ledger.runEvents.any {
                it.type == ProofLedgerEventType.OPERATOR_PERMISSION_DENIED &&
                    it.reasonCodes.contains(RoleReasonCodes.ROLE_OPERATOR_PERMISSION_DENIED)
            }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_reassignReleaseAndEscalation_areDurableAndFilterable() {
        val now = 7_000L
        val runId = "m11_run_lifecycle"
        val record = ExecutionReceiptRecord(
            recordId = "m11_record_lifecycle",
            runId = runId,
            userId = "u-m11-life",
            sessionId = "s-m11-life",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val persistence = object : DynamicStatePersistencePort {
            override fun load(userId: String): PersistedDynamicState? {
                if (userId != "u-m11-life") return null
                return PersistedDynamicState(executionLedgerRecords = listOf(record))
            }

            override fun save(
                userId: String,
                dynamicState: DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistence,
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m11-life",
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.CLAIM_CASE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    timestampMs = now
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m11-life",
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REASSIGN_CASE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    assignee = OperatorAssigneeRef(
                        userId = "ops_tier2",
                        displayName = "Ops Tier 2"
                    ),
                    timestampMs = now + 1L
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m11-life",
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.RELEASE_CASE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    timestampMs = now + 2L
                )
            ).success
        )
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = "u-m11-life",
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ESCALATE_CASE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    escalationTarget = "tier2_dispute",
                    followUpSummary = "Escalate due to provider callback mismatch.",
                    connectorTargets = listOf(
                        AlertRoutingTargetType.SLACK_STUB,
                        AlertRoutingTargetType.JIRA_STUB
                    ),
                    timestampMs = now + 3L
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = "u-m11-life",
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue(case.summary.escalated)
        assertTrue(case.assignmentSummary.contains("Ops Tier 2"))
        assertTrue(case.escalationSummary.contains("tier2_dispute", ignoreCase = true))
        assertTrue(case.collaborationState?.escalationHistory?.isNotEmpty() == true)
        assertTrue(
            case.collaborationState?.assignmentEvents?.any {
                it.type == GovernanceCaseAssignmentEventType.REASSIGNED
            } == true
        )
        assertTrue(
            case.collaborationState?.assignmentEvents?.any {
                it.type == GovernanceCaseAssignmentEventType.ESCALATED
            } == true
        )
        assertTrue(case.connectorRoutingSummary != null)
        assertTrue(case.connectorRoutingSummary?.selectedTargetTypes?.contains(AlertRoutingTargetType.LOCAL_CONSOLE) == true)
        assertTrue(case.connectorRoutingSummary?.selectedTargetTypes?.contains(AlertRoutingTargetType.SLACK_STUB) == true)
        assertTrue(case.connectorRoutingSummary?.selectedTargetTypes?.contains(AlertRoutingTargetType.JIRA_STUB) == true)

        val filtered = orchestrator.getGovernanceCases(
            userId = "u-m11-life",
            filter = GovernanceConsoleFilter(
                limit = 10,
                includeReviewed = true,
                escalatedOnly = true,
                connectorTargetType = AlertRoutingTargetType.SLACK_STUB
            )
        )
        assertTrue(filtered.any { it.summary.runId == runId })

        val ledger = orchestrator.getExecutionLedger(
            userId = "u-m11-life",
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_CASE_REASSIGNED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_CASE_RELEASED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_CASE_ESCALATED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.CONNECTOR_ROUTING_REQUESTED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_assignmentNoteReassignTrail_isDurable() {
        var now = 7_500L
        val runId = "m12_run_assign_note_reassign"
        val userId = "u-m12-assign-note"
        val record = ExecutionReceiptRecord(
            recordId = "m12_record_assign_note_reassign",
            runId = runId,
            userId = userId,
            sessionId = "s-m12-assign-note",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ASSIGN_CASE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    assignee = OperatorAssigneeRef(
                        userId = "ops_triage",
                        displayName = "Ops Triage"
                    ),
                    timestampMs = now
                )
            ).success
        )
        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ADD_NOTE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    note = "Route ownership handoff requested.",
                    timestampMs = now
                )
            ).success
        )
        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REASSIGN_CASE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    assignee = OperatorAssigneeRef(
                        userId = "ops_tier2",
                        displayName = "Ops Tier 2"
                    ),
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }

        assertEquals("Ops Tier 2", case.collaborationState?.assignedTo?.displayName)
        assertTrue(
            case.collaborationState?.notes?.any {
                it.note.contains("handoff", ignoreCase = true)
            } == true
        )
        assertTrue(
            case.collaborationState?.assignmentEvents?.any {
                it.type == GovernanceCaseAssignmentEventType.ASSIGNED
            } == true
        )
        assertTrue(
            case.collaborationState?.assignmentEvents?.any {
                it.type == GovernanceCaseAssignmentEventType.REASSIGNED
            } == true
        )

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_CASE_ASSIGNED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_NOTE_ADDED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.OPERATOR_CASE_REASSIGNED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_routesAcrossConnectorTargets_andPersistsRoutingActions() {
        var now = 8_000L
        val runId = "m12_run_multi_target"
        val userId = "u-m12-targets"
        val record = ExecutionReceiptRecord(
            recordId = "m12_record_multi_target",
            runId = runId,
            userId = userId,
            sessionId = "s-m12-targets",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    followUpSummary = "Route to Slack first.",
                    connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                    timestampMs = now
                )
            ).success
        )

        now += 31_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    followUpSummary = "Add Jira route for ticket trail.",
                    connectorTargets = listOf(AlertRoutingTargetType.JIRA_STUB),
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        val selectedTargets = case.connectorRoutingSummary?.selectedTargetTypes.orEmpty()
        assertTrue(selectedTargets.contains(AlertRoutingTargetType.LOCAL_CONSOLE))
        assertTrue(selectedTargets.contains(AlertRoutingTargetType.SLACK_STUB))
        assertTrue(selectedTargets.contains(AlertRoutingTargetType.JIRA_STUB))
        assertTrue(
            case.collaborationState?.routingActions?.any {
                it.targetType == AlertRoutingTargetType.SLACK_STUB &&
                    it.actionType == GovernanceRoutingActionType.ROUTE_REQUESTED
            } == true
        )
        assertTrue(
            case.collaborationState?.routingActions?.any {
                it.targetType == AlertRoutingTargetType.JIRA_STUB &&
                    it.actionType == GovernanceRoutingActionType.ROUTE_RETRIED
            } == true
        )

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.CONNECTOR_ROUTING_REQUESTED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.CONNECTOR_DELIVERY_ATTEMPTED })
    }

    @Test
    fun updateGovernanceCaseCollaboration_duplicateConnectorCallback_isIdempotent() {
        var now = 9_000L
        val runId = "m12_run_duplicate_callback"
        val userId = "u-m12-duplicate"
        val record = ExecutionReceiptRecord(
            recordId = "m12_record_duplicate_callback",
            runId = runId,
            userId = userId,
            sessionId = "s-m12-duplicate",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val duplicatePort = object : AlertRoutingPort {
            override fun route(
                runId: String,
                alertCode: String,
                target: AlertRoutingTarget,
                dedupeKey: String,
                summary: String,
                authorization: com.lumi.coredomain.contract.RemoteAuthorizationResult?,
                requestedByOperator: OperatorIdentity?,
                nowMs: Long
            ): AlertRoutingAttempt {
                val request = ConnectorDeliveryRequest(
                    requestId = "dup_req_${target.targetId}",
                    runId = runId,
                    alertCode = alertCode,
                    target = ConnectorDeliveryTarget(
                        targetId = target.targetId,
                        label = target.label,
                        providerType = target.connectorProviderType ?: ConnectorProviderType.WEBHOOK,
                        endpointHint = target.endpointHint
                    ),
                    dedupeKey = dedupeKey,
                    summary = summary,
                    requestedAtMs = nowMs
                )
                val deliveryAttempt = ConnectorDeliveryAttempt(
                    attemptId = "dup_callback_${target.targetId}",
                    requestId = request.requestId,
                    targetId = target.targetId,
                    providerType = request.target.providerType,
                    status = ConnectorDeliveryStatus.DUPLICATE_SUPPRESSED,
                    dedupeKey = dedupeKey,
                    summary = "Duplicate connector callback suppressed.",
                    failureReason = ConnectorFailureReason.DUPLICATE_SUPPRESSED,
                    timestampMs = nowMs
                )
                return AlertRoutingAttempt(
                    attemptId = "route_attempt_${target.targetId}_$nowMs",
                    targetId = target.targetId,
                    targetType = target.targetType,
                    status = AlertRoutingStatus.DUPLICATE_SUPPRESSED,
                    dedupeKey = dedupeKey,
                    summary = "Duplicate callback suppressed by connector dedupe.",
                    connectorDeliveryRequest = request,
                    connectorDeliveryAttempt = deliveryAttempt,
                    timestampMs = nowMs
                )
            }
        }
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            alertRoutingPort = duplicatePort,
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    followUpSummary = "Route duplicate callback path.",
                    connectorTargets = listOf(AlertRoutingTargetType.GENERIC_WEBHOOK),
                    timestampMs = now
                )
            ).success
        )
        now += 31_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    followUpSummary = "Re-route duplicate callback path.",
                    connectorTargets = listOf(AlertRoutingTargetType.GENERIC_WEBHOOK),
                    timestampMs = now
                )
            ).success
        )

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        val routing = case.alertRoutingRecords.first()
        val duplicateAttempts = routing.attempts.count {
            it.connectorDeliveryAttempt?.attemptId == "dup_callback_${it.targetId}"
        }
        assertEquals(2, duplicateAttempts) // local console + webhook stub
        assertEquals(AlertRoutingStatus.DUPLICATE_SUPPRESSED, case.connectorRoutingSummary?.status)
        assertTrue(
            case.reasonCodes.contains(RoleReasonCodes.ROLE_CONNECTOR_DELIVERY_RETRIED) ||
                case.connectorRoutingSummary?.reasonCodes?.contains(RoleReasonCodes.ROLE_CONNECTOR_DELIVERY_RETRIED) == true
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_unavailableConnectorsFallbackLocal_andDeadLetterAfterRetries() {
        var now = 10_000L
        val runId = "m12_run_dead_letter"
        val userId = "u-m12-dead-letter"
        val record = ExecutionReceiptRecord(
            recordId = "m12_record_dead_letter",
            runId = runId,
            userId = userId,
            sessionId = "s-m12-dead-letter",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val unavailableTransport = StubConnectorDeliveryTransport(
            endpointHint = null,
            unavailableProviders = setOf(
                ConnectorProviderType.SLACK,
                ConnectorProviderType.JIRA,
                ConnectorProviderType.ZENDESK,
                ConnectorProviderType.CRM,
                ConnectorProviderType.WEBHOOK
            )
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            alertRoutingPort = StubAlertRoutingPort(
                endpointHint = null,
                transport = unavailableTransport
            ),
            nowMs = { now }
        )

        repeat(3) { index ->
            assertTrue(
                orchestrator.updateGovernanceCaseCollaboration(
                    userId = userId,
                    runId = runId,
                    command = GovernanceCollaborationCommand(
                        commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                        actorUserId = "ops_admin",
                        actorDisplayName = "Ops Admin",
                        followUpSummary = "Retry unavailable connectors attempt ${index + 1}.",
                        connectorTargets = listOf(
                            AlertRoutingTargetType.SLACK_STUB,
                            AlertRoutingTargetType.JIRA_STUB,
                            AlertRoutingTargetType.GENERIC_WEBHOOK
                        ),
                        timestampMs = now
                    )
                ).success
            )
            now += 31_000L
        }

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue((case.connectorRoutingSummary?.unavailableTargets ?: 0) > 0)
        assertTrue(case.summary.connectorDeadLetterCount > 0)
        assertTrue(case.deadLetterSummary.isNotBlank())
        assertTrue(case.remoteDeliveryIssues.any { it.code == "CONNECTOR_DEAD_LETTER" })

        val deadLetterFiltered = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                limit = 10,
                includeReviewed = true,
                connectorDeadLetterOnly = true
            )
        )
        assertTrue(deadLetterFiltered.any { it.summary.runId == runId })

        val failureFiltered = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                limit = 10,
                includeReviewed = true,
                connectorFailureOnly = true
            )
        )
        assertTrue(failureFiltered.any { it.summary.runId == runId })

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(
            ledger.runEvents.any { event ->
                event.reasonCodes.contains(RoleReasonCodes.ROLE_CONNECTOR_DELIVERY_DEAD_LETTERED)
            }
        )
        assertTrue(
            ledger.runEvents.any { event ->
                event.reasonCodes.contains(RoleReasonCodes.ROLE_CONNECTOR_HEALTH_DEGRADED)
            }
        )
    }

    @Test
    fun updateGovernanceCaseCollaboration_remoteAuthorizationContextMismatch_isDeniedAndAuditable() {
        var now = 12_000L
        val runId = "m13_run_remote_denied"
        val userId = "u-m13-remote-denied"
        val record = ExecutionReceiptRecord(
            recordId = "m13_record_remote_denied",
            runId = runId,
            userId = userId,
            sessionId = "s-m13-remote-denied",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        val denied = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                followUpSummary = "Remote auth mismatch scenario.",
                remoteAuthorizationContext = RemoteOperatorAuthorizationContext(
                    operatorId = "op_unmatched_remote",
                    teamId = "team_remote_ops",
                    requiredPermission = OperatorPermission.REQUEST_FOLLOW_UP,
                    action = GovernanceActionType.REQUEST_FOLLOW_UP
                ),
                connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                timestampMs = now
            )
        )

        assertFalse(denied.success)
        assertEquals(OperatorPermissionDenialReason.REMOTE_AUTH_CONTEXT_INVALID, denied.denialReason)
        assertEquals(RemoteAuthorizationStatus.DENIED, denied.remoteAuthorizationResult?.status)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue(case.permissionDenialSummary.contains("remote", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_OPERATOR_AUTH_DENIED))
    }

    @Test
    fun updateGovernanceCaseCollaboration_destinationBindingAndAuthProfile_arePersistedInRoutingAndAudit() {
        var now = 13_000L
        val runId = "m13_run_destination_binding"
        val userId = "u-m13-destination"
        val record = ExecutionReceiptRecord(
            recordId = "m13_record_destination_binding",
            runId = runId,
            userId = userId,
            sessionId = "s-m13-destination",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            alertRoutingPort = ProductionAlertRoutingPort(
                transport = StubConnectorDeliveryTransport(endpointHint = "stub://ops")
            ),
            nowMs = { now }
        )

        val result = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                followUpSummary = "Bind explicit destination and auth profile.",
                connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                destinationId = "dest_slack_stub",
                authProfileId = "auth_slack_stub",
                routeBindingId = "binding_slack_stub",
                timestampMs = now
            )
        )

        assertTrue(result.success)
        assertEquals(RemoteAuthorizationStatus.FALLBACK_ALLOWED, result.remoteAuthorizationResult?.status)
        assertEquals("dest_slack_stub", result.connectorDestinationId)
        assertEquals("auth_slack_stub", result.connectorAuthProfileId)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue(case.connectorDestinationSummary.contains("slack", ignoreCase = true))
        assertTrue(case.connectorAuthProfileSummary.contains("token", ignoreCase = true))
        assertTrue(case.remoteAuthorizationSummary.contains("allowed", ignoreCase = true))
        assertEquals("dest_slack_stub", case.operatorConnectorAudit?.destinationId)
        assertEquals("auth_slack_stub", case.operatorConnectorAudit?.authProfileId)
        assertEquals("binding_slack_stub", case.operatorConnectorAudit?.routeBindingId)
    }

    @Test
    fun updateGovernanceCaseCollaboration_localFallbackAuthorization_recordsProvenanceAndSyncSummary() {
        var now = 14_000L
        val runId = "m14_run_fallback_provenance"
        val userId = "u-m14-fallback"
        val record = ExecutionReceiptRecord(
            recordId = "m14_record_fallback_provenance",
            runId = runId,
            userId = userId,
            sessionId = "s-m14-fallback",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            alertRoutingPort = ProductionAlertRoutingPort(
                transport = StubConnectorDeliveryTransport(endpointHint = "stub://ops")
            ),
            nowMs = { now }
        )

        val result = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                followUpSummary = "M14 fallback provenance scenario.",
                connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                timestampMs = now
            )
        )

        assertTrue(result.success)
        assertEquals(RemoteAuthorizationStatus.FALLBACK_ALLOWED, result.remoteAuthorizationResult?.status)
        assertTrue(result.remoteAuthorizationResult?.provenance?.usedFallback == true)
        assertEquals(SessionAuthority.LOCAL_FALLBACK_POLICY, result.remoteAuthorizationResult?.provenance?.authority)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue(case.sessionAuthProvenanceSummary.contains("fallback", ignoreCase = true))
        assertTrue(case.directorySyncSummary.isNotBlank())
        assertTrue(case.enterpriseSessionSummary.contains("fallback", ignoreCase = true))
        assertTrue(case.scimDirectorySummary.isNotBlank())
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_AUTH_PROVENANCE_RECORDED))
    }

    @Test
    fun updateGovernanceCaseCollaboration_localPermissionDenial_precedesRemoteAuthorization() {
        var now = 15_000L
        val runId = "m14_run_permission_precedence"
        val userId = "u-m14-precedence"
        val record = ExecutionReceiptRecord(
            recordId = "m14_record_permission_precedence",
            runId = runId,
            userId = userId,
            sessionId = "s-m14-precedence",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        val denied = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "ops_readonly",
                actorDisplayName = "Ops Readonly",
                operatorIdentity = OperatorIdentity(
                    userId = "ops_readonly",
                    displayName = "Ops Readonly",
                    role = OperatorRole.READ_ONLY,
                    permissions = listOf(OperatorPermission.OPEN_RECEIPT_TRAIL),
                    scope = PermissionScope.ANY_CASE,
                    remoteOperatorId = "op_remote_readonly",
                    remoteTeamId = "team_remote_ops"
                ),
                remoteAuthorizationContext = RemoteOperatorAuthorizationContext(
                    operatorId = "op_remote_readonly",
                    teamId = "team_remote_ops",
                    requiredPermission = OperatorPermission.REQUEST_FOLLOW_UP,
                    action = GovernanceActionType.REQUEST_FOLLOW_UP
                ),
                followUpSummary = "This should be denied by local permission first.",
                connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                timestampMs = now
            )
        )

        assertFalse(denied.success)
        assertEquals(OperatorPermissionDenialReason.PERMISSION_MISSING, denied.denialReason)
        assertNull(denied.remoteAuthorizationResult)

        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        assertTrue(case.permissionDenialSummary.contains("permission missing", ignoreCase = true))
    }

    @Test
    fun updateGovernanceCaseCollaboration_revokedCredential_blocksRouteAndFallsBack() {
        var now = 16_000L
        val runId = "m14_run_revoked_credential"
        val userId = "u-m14-revoked-credential"
        val revokedLifecycle = ConnectorCredentialLifecycleSummary(
            state = ConnectorCredentialLifecycleState.REVOKED,
            summary = "Credential is revoked; route is blocked.",
            revoked = true,
            evaluatedAtMs = now
        )
        val record = ExecutionReceiptRecord(
            recordId = "m14_record_revoked_credential",
            runId = runId,
            userId = userId,
            sessionId = "s-m14-revoked",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val persisted = PersistedDynamicState(
            executionLedgerRecords = listOf(record),
            connectorDestinations = listOf(
                ConnectorDestination(
                    destinationId = "dest_local_console",
                    label = "Governance Console",
                    providerType = ConnectorProviderType.LOCAL_CONSOLE,
                    enabled = true,
                    authProfileId = "auth_local_console"
                ),
                ConnectorDestination(
                    destinationId = "dest_slack_stub",
                    label = "Slack Ops Stub",
                    providerType = ConnectorProviderType.SLACK,
                    enabled = true,
                    authProfileId = "auth_slack_stub",
                    credentialLifecycle = revokedLifecycle,
                    credentialRef = ConnectorCredentialRef(
                        credentialId = "cred_slack_stub",
                        isConfigured = true,
                        status = ConnectorCredentialStatus.REVOKED,
                        lifecycle = revokedLifecycle
                    )
                )
            ),
            connectorAuthProfiles = listOf(
                ConnectorAuthProfile(
                    authProfileId = "auth_local_console",
                    providerType = ConnectorProviderType.LOCAL_CONSOLE,
                    authScheme = "local",
                    status = ConnectorCredentialStatus.CONFIGURED
                ),
                ConnectorAuthProfile(
                    authProfileId = "auth_slack_stub",
                    providerType = ConnectorProviderType.SLACK,
                    authScheme = "oauth_bot",
                    status = ConnectorCredentialStatus.REVOKED,
                    credentialLifecycle = revokedLifecycle,
                    credentialRef = ConnectorCredentialRef(
                        credentialId = "cred_slack_stub",
                        isConfigured = true,
                        status = ConnectorCredentialStatus.REVOKED,
                        lifecycle = revokedLifecycle
                    )
                )
            ),
            connectorRouteBindings = listOf(
                ConnectorRouteBinding(
                    bindingId = "binding_local_console",
                    targetType = AlertRoutingTargetType.LOCAL_CONSOLE,
                    destinationId = "dest_local_console",
                    authProfileId = "auth_local_console",
                    enabled = true,
                    priority = 0
                ),
                ConnectorRouteBinding(
                    bindingId = "binding_slack_stub",
                    targetType = AlertRoutingTargetType.SLACK_STUB,
                    destinationId = "dest_slack_stub",
                    authProfileId = "auth_slack_stub",
                    enabled = true,
                    priority = 10
                )
            )
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, persisted),
            alertRoutingPort = ProductionAlertRoutingPort(
                transport = StubConnectorDeliveryTransport(endpointHint = "stub://ops")
            ),
            nowMs = { now }
        )

        val result = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                followUpSummary = "Credential revocation should trigger fallback.",
                connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                destinationId = "dest_slack_stub",
                authProfileId = "auth_slack_stub",
                routeBindingId = "binding_slack_stub",
                timestampMs = now
            )
        )

        assertTrue(result.success)
        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        val slackTarget = case.alertRoutingRecords
            .flatMap { it.targets }
            .firstOrNull { it.targetType == AlertRoutingTargetType.SLACK_STUB }
        assertNotNull(slackTarget)
        assertNull(slackTarget.destinationId)
        assertEquals(ConnectorCredentialLifecycleState.REVOKED, slackTarget.credentialLifecycle?.state)
        assertTrue(case.connectorCredentialSummary.contains("revoked", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_CONNECTOR_ROUTE_BLOCKED_BY_CREDENTIAL_STATE))
    }

    @Test
    fun updateGovernanceCaseCollaboration_vaultLeaseExpired_blocksRouteAndSurfacesEnterpriseSummary() {
        var now = 16_500L
        val runId = "m15_run_vault_lease_expired"
        val userId = "u-m15-vault-lease-expired"
        val vaultRef = VaultCredentialReference(
            vaultProvider = "hashicorp_vault",
            vaultPath = "secret/connectors/slack/prod",
            secretVersion = "7",
            leaseId = "lease_m15_1",
            leaseExpiresAtMs = now - 1L,
            status = VaultCredentialStatus.LEASE_EXPIRED,
            rotationState = VaultCredentialRotationState.SCHEDULED,
            summary = "Vault lease expired; credential refresh is required."
        )
        val healthyLifecycle = ConnectorCredentialLifecycleSummary(
            state = ConnectorCredentialLifecycleState.HEALTHY,
            summary = "Credential is healthy for connector delivery.",
            evaluatedAtMs = now
        )
        val record = ExecutionReceiptRecord(
            recordId = "m15_record_vault_lease_expired",
            runId = runId,
            userId = userId,
            sessionId = "s-m15-vault",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 2L,
            updatedAtMs = now - 2L
        )
        val persisted = PersistedDynamicState(
            executionLedgerRecords = listOf(record),
            connectorDestinations = listOf(
                ConnectorDestination(
                    destinationId = "dest_slack_stub",
                    label = "Slack Ops Stub",
                    providerType = ConnectorProviderType.SLACK,
                    enabled = true,
                    authProfileId = "auth_slack_stub",
                    credentialLifecycle = healthyLifecycle,
                    vaultCredential = vaultRef,
                    credentialRef = ConnectorCredentialRef(
                        credentialId = "cred_slack_stub",
                        isConfigured = true,
                        status = ConnectorCredentialStatus.CONFIGURED,
                        authProfileId = "auth_slack_stub",
                        lifecycle = healthyLifecycle,
                        vaultCredential = vaultRef
                    )
                )
            ),
            connectorAuthProfiles = listOf(
                ConnectorAuthProfile(
                    authProfileId = "auth_slack_stub",
                    providerType = ConnectorProviderType.SLACK,
                    authScheme = "oauth_bot",
                    status = ConnectorCredentialStatus.CONFIGURED,
                    credentialLifecycle = healthyLifecycle,
                    vaultCredential = vaultRef,
                    credentialRef = ConnectorCredentialRef(
                        credentialId = "cred_slack_stub",
                        isConfigured = true,
                        status = ConnectorCredentialStatus.CONFIGURED,
                        authProfileId = "auth_slack_stub",
                        lifecycle = healthyLifecycle,
                        vaultCredential = vaultRef
                    )
                )
            ),
            connectorRouteBindings = listOf(
                ConnectorRouteBinding(
                    bindingId = "binding_slack_stub",
                    targetType = AlertRoutingTargetType.SLACK_STUB,
                    destinationId = "dest_slack_stub",
                    authProfileId = "auth_slack_stub",
                    enabled = true,
                    priority = 10
                )
            )
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, persisted),
            alertRoutingPort = ProductionAlertRoutingPort(
                transport = StubConnectorDeliveryTransport(endpointHint = "stub://ops")
            ),
            nowMs = { now }
        )

        val result = orchestrator.updateGovernanceCaseCollaboration(
            userId = userId,
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "ops_admin",
                actorDisplayName = "Ops Admin",
                followUpSummary = "M15 vault lease expiry route block scenario.",
                connectorTargets = listOf(AlertRoutingTargetType.SLACK_STUB),
                destinationId = "dest_slack_stub",
                authProfileId = "auth_slack_stub",
                routeBindingId = "binding_slack_stub",
                timestampMs = now
            )
        )

        assertTrue(result.success)
        val case = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        ).first { it.summary.runId == runId }
        val slackTarget = case.alertRoutingRecords
            .flatMap { it.targets }
            .firstOrNull { it.targetType == AlertRoutingTargetType.SLACK_STUB }
        assertNotNull(slackTarget)
        assertNull(slackTarget.destinationId)
        assertEquals(CredentialRouteBlockReason.VAULT_LEASE_EXPIRED, slackTarget.credentialRouteBlockReason)
        assertTrue(case.connectorCredentialSummary.contains("vault", ignoreCase = true))
        assertTrue(case.vaultCredentialSummary.contains("lease", ignoreCase = true))
        assertTrue(case.enterpriseSessionSummary.isNotBlank())
        assertTrue(case.idpProviderSummary.isNotBlank())
        assertTrue(case.scimProviderSummary.isNotBlank())
        assertTrue(case.vaultProviderSummary.isNotBlank())
        assertNotNull(case.idpProviderConfig)
        assertNotNull(case.idpSessionExchange)
        assertNotNull(case.scimProviderResult)
        assertNotNull(case.vaultProviderConfig)
        assertNotNull(case.vaultMaterialization)
        assertTrue(case.rolloutSummary.contains("rollout", ignoreCase = true))
        assertTrue(case.cutoverReadinessSummary.contains("cutover", ignoreCase = true))
        assertTrue(case.vaultRuntimeSummary.contains("vault", ignoreCase = true))
        assertTrue(case.enterpriseFallbackSummary.contains("fallback", ignoreCase = true))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_ENTERPRISE_ROLLOUT_STAGE_APPLIED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_ENTERPRISE_CUTOVER_BLOCKED))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_ENTERPRISE_FALLBACK_LOCAL_FIRST))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_CONNECTOR_ROUTE_BLOCKED_BY_VAULT_STATE))
        assertTrue(case.reasonCodes.contains(RoleReasonCodes.ROLE_VAULT_CREDENTIAL_LEASE_EXPIRED))
        assertTrue(case.reasonCodes.any { it.startsWith("ROLE_ENTERPRISE_IDP_PROVIDER_") })
        assertTrue(case.reasonCodes.any { it.startsWith("ROLE_SCIM_PROVIDER_") })
        assertTrue(case.reasonCodes.any { it.startsWith("ROLE_VAULT_PROVIDER_") })
    }

    @Test
    fun updateGovernanceCaseCollaboration_m26EstateAutomationSchedulePauseResumeCancel_areDurableAndFilterable() {
        var now = 15_100L
        val runId = "m26_run_policy_estate_automation"
        val userId = "u-m26-policy-estate"
        val record = ExecutionReceiptRecord(
            recordId = "m26_record_policy_estate_automation",
            runId = runId,
            userId = userId,
            sessionId = "s-m26-policy-estate",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            createdAtMs = now - 20L,
            updatedAtMs = now - 20L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record),
            nowMs = { now }
        )

        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    workflowPolicyPackId = "pack_m26_base",
                    workflowPolicyPackVersion = "v_m26_1",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.PROMOTE_POLICY_ROLLOUT,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutMode = PolicyRolloutMode.SIMULATION_ONLY,
                    policyRolloutReason = "Hold rollout in simulation-only until governance promotion is approved.",
                    timestampMs = now
                )
            ).success
        )

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Schedule estate remediation under simulation-only guardrails.",
                    scheduledAtMs = now + 60_000L,
                    timestampMs = now
                )
            ).success
        )

        val approvalCase = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.APPROVAL_REQUIRED,
            approvalCase.summary.scheduledRemediationStatus
        )
        assertTrue(approvalCase.summary.automationApprovalRequired)
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.BLOCKED,
            approvalCase.summary.scheduleDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowBlockReason.APPROVAL_PENDING,
            approvalCase.summary.scheduleBlockReason
        )
        assertTrue(approvalCase.reasonCodes.contains(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED))
        assertTrue(approvalCase.reasonCodes.contains(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED))

        val approvalOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                approvalRequiredOnly = true,
                limit = 20
            )
        )
        assertTrue(approvalOnly.any { it.summary.runId == runId })

        val scheduledOnlyBeforeCancel = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                scheduledOnly = true,
                limit = 20
            )
        )
        assertTrue(scheduledOnlyBeforeCancel.any { it.summary.runId == runId })

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.APPLY_SAFE_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Attempt safe auto-apply while approval is still pending.",
                    timestampMs = now
                )
            ).success
        )
        val blockedCase = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.APPROVAL_REQUIRED,
            blockedCase.summary.scheduledRemediationStatus
        )
        assertTrue(blockedCase.reasonCodes.contains(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED))

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.PAUSE_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Pause scheduled remediation during change freeze.",
                    timestampMs = now
                )
            ).success
        )
        val pausedCase = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.PAUSED,
            pausedCase.summary.scheduledRemediationStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.PAUSED,
            pausedCase.summary.scheduleDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowBlockReason.PAUSED_BY_OPERATOR,
            pausedCase.summary.scheduleBlockReason
        )
        assertTrue(pausedCase.reasonCodes.contains(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_PAUSED))

        val schedulePausedOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                schedulePausedOnly = true,
                limit = 20
            )
        )
        assertTrue(schedulePausedOnly.any { it.summary.runId == runId })

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.RESUME_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Resume remediation after freeze window ends.",
                    timestampMs = now
                )
            ).success
        )
        val resumedCase = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.SCHEDULED,
            resumedCase.summary.scheduledRemediationStatus
        )
        assertTrue(resumedCase.summary.automationEligible)
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.ELIGIBLE,
            resumedCase.summary.scheduleDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowBlockReason.NONE,
            resumedCase.summary.scheduleBlockReason
        )
        assertTrue(resumedCase.reasonCodes.contains(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_RESUMED))

        val scheduleEligibleOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                scheduleEligibleOnly = true,
                limit = 20
            )
        )
        assertTrue(scheduleEligibleOnly.any { it.summary.runId == runId })

        val eligibleOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                automationEligibleOnly = true,
                limit = 20
            )
        )
        assertTrue(eligibleOnly.any { it.summary.runId == runId })

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Backdate schedule to verify expiry handling.",
                    scheduledAtMs = now - 60_000L,
                    timestampMs = now
                )
            ).success
        )
        val expiredCase = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.EXPIRED,
            expiredCase.summary.scheduleDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowBlockReason.SCHEDULE_EXPIRED,
            expiredCase.summary.scheduleBlockReason
        )
        assertTrue(expiredCase.reasonCodes.contains(RoleReasonCodes.ROLE_SCHEDULE_EXPIRED))

        val scheduleExpiredOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                scheduleExpiredOnly = true,
                limit = 20
            )
        )
        assertTrue(scheduleExpiredOnly.any { it.summary.runId == runId })

        now += 1_000L
        assertTrue(
            orchestrator.updateGovernanceCaseCollaboration(
                userId = userId,
                runId = runId,
                command = GovernanceCollaborationCommand(
                    commandType = GovernanceActionType.CANCEL_POLICY_ESTATE_REMEDIATION,
                    actorUserId = "ops_admin",
                    actorDisplayName = "Ops Admin",
                    workflowTemplateId = "wf_provider_follow_up",
                    policyRolloutReason = "Cancel this schedule in favor of manual triage.",
                    timestampMs = now
                )
            ).success
        )
        val cancelledCase = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        ).first { it.summary.runId == runId }
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.CANCELLED,
            cancelledCase.summary.scheduledRemediationStatus
        )
        assertTrue(cancelledCase.reasonCodes.contains(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_CANCELLED))
        assertTrue(cancelledCase.automationCancellationRecords.isNotEmpty())
        assertTrue(cancelledCase.governanceProgramOperations.isNotEmpty())
        assertTrue(cancelledCase.scheduledRemediationSummary.contains("cancel", ignoreCase = true))

        val scheduledOnlyAfterCancel = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                scheduledOnly = true,
                limit = 20
            )
        )
        assertFalse(scheduledOnlyAfterCancel.any { it.summary.runId == runId })

        val ledger = orchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ).first()
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ESTATE_REMEDIATION_SCHEDULED })
        assertTrue(ledger.runEvents.any { it.type == ProofLedgerEventType.WORKFLOW_POLICY_ESTATE_REMEDIATION_APPLIED })
        assertTrue(ledger.automationCancellationRecords.isNotEmpty())
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.CANCELLED,
            ledger.scheduledRemediationPlan?.status
        )
    }

    @Test
    fun getGovernanceCases_m27ScheduleWaitingMaintenanceFilter_matchesDeferredCalendarState() {
        val runId = "m27_run_schedule_waiting_maintenance"
        val userId = "u-m27-schedule"
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = runId,
            templateId = "wf_provider_follow_up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
                stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
                target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                    tenantId = "tenant_m27",
                    workspaceId = "workspace_m27",
                    workflowTemplateId = "wf_provider_follow_up"
                ),
                policySchedulingWindow = com.lumi.coredomain.contract.PolicySchedulingWindow(
                    windowId = "window_m27_1",
                    windowType = com.lumi.coredomain.contract.SchedulingWindowType.MAINTENANCE_WINDOW,
                    status = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                    timezone = "Europe/London",
                    nextEligibleAtMs = 17_100L,
                    summary = "Waiting for maintenance window."
                ),
                calendarEvaluation = com.lumi.coredomain.contract.CalendarEvaluationResult(
                    decision = com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                    windowStatus = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                    blockReason = com.lumi.coredomain.contract.ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                    nextEligibleAtMs = 17_100L,
                    summary = "Rollout deferred until maintenance window."
                ),
                scheduleSummary = "Rollout deferred until maintenance window.",
                rolloutCalendarSummary = "Rollout calendar deferred for staged wave."
            ),
            updatedAtMs = 17_000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "m27_record_schedule_waiting_maintenance",
            runId = runId,
            userId = userId,
            sessionId = "s-m27-schedule",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            workflowRun = workflowRun,
            createdAtMs = 16_900L,
            updatedAtMs = 17_000L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record)
        )

        val deferredCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                scheduleDeferredOnly = true,
                limit = 20
            )
        )
        assertTrue(deferredCases.any { it.summary.runId == runId })

        val waitingMaintenanceCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                scheduleWaitingMaintenanceOnly = true,
                limit = 20
            )
        )
        val case = waitingMaintenanceCases.firstOrNull { it.summary.runId == runId }
        assertNotNull(case)
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
            case.summary.scheduleDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
            case.summary.scheduleBlockReason
        )
        assertTrue(case.summary.scheduleWaitingMaintenance)
        assertEquals(17_100L, case.summary.scheduleNextEligibleAtMs)
        assertTrue(case.workflowRolloutSummary.contains("maintenance window", ignoreCase = true))
    }

    @Test
    fun getGovernanceCases_m28WaveAndCrossWindowFilters_matchCalendarAwareRolloutStates() {
        val runId = "m28_run_wave_controls"
        val userId = "u-m28-wave"
        val rolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
            stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
            mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
            target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                tenantId = "tenant_m28",
                workspaceId = "workspace_m28",
                workflowTemplateId = "wf_provider_follow_up"
            ),
            policySchedulingWindow = com.lumi.coredomain.contract.PolicySchedulingWindow(
                windowId = "window_m28_1",
                windowType = com.lumi.coredomain.contract.SchedulingWindowType.ROLLOUT_STAGE_WINDOW,
                status = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                timezone = "Europe/London",
                nextEligibleAtMs = 28_200L,
                summary = "Window deferred; next eligibility tracked."
            ),
            calendarEvaluation = com.lumi.coredomain.contract.CalendarEvaluationResult(
                decision = com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                windowStatus = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                blockReason = com.lumi.coredomain.contract.ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                nextEligibleAtMs = 28_200L,
                summary = "Promotion deferred to next eligible window."
            ),
            rolloutWaves = listOf(
                com.lumi.coredomain.contract.RolloutWave(
                    waveId = "wave_m28_a",
                    waveIndex = 2,
                    name = "Wave 2",
                    status = com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
                    completionState = com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD,
                    progress = com.lumi.coredomain.contract.RolloutWaveProgress(
                        totalTargets = 6,
                        completedTargets = 3,
                        pendingTargets = 3,
                        carriedForwardTargets = 3,
                        summary = "Completed 3/6 targets; carry-forward pending."
                    ),
                    carryForwardState = com.lumi.coredomain.contract.RolloutWaveCarryForwardState(
                        carryForwardEnabled = true,
                        carryForwardPending = true,
                        pendingTargets = 3,
                        nextEligibleAtMs = 28_200L,
                        summary = "Pending rollout targets are carried forward."
                    ),
                    summary = "Wave 2 is carried forward.",
                    updatedAtMs = 28_000L
                )
            ),
            currentRolloutWaveId = "wave_m28_a",
            currentRolloutWaveStatus = com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
            currentRolloutWaveCompletionState = com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD,
            calendarAwarePromotionDecision = com.lumi.coredomain.contract.CalendarAwarePromotionDecision(
                promotionId = "promotion_m28",
                waveId = "wave_m28_a",
                windowEligibility = com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
                decisionType = com.lumi.coredomain.contract.RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
                blockReason = com.lumi.coredomain.contract.CrossWindowHoldReason.MAINTENANCE_WINDOW,
                nextEligibleWindow = com.lumi.coredomain.contract.NextEligibleWindowSummary(
                    nextEligibleAtMs = 28_200L,
                    windowId = "window_m28_2",
                    summary = "Next eligible window selected."
                ),
                summary = "Wave 2 deferred to next eligible window.",
                createdAtMs = 28_000L
            ),
            crossWindowGovernanceControl = com.lumi.coredomain.contract.CrossWindowGovernanceControl(
                controlId = "cw_m28",
                scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                pauseState = com.lumi.coredomain.contract.CrossWindowPauseState.PAUSED,
                holdReason = com.lumi.coredomain.contract.CrossWindowHoldReason.GOVERNANCE_PAUSE,
                summary = "Cross-window control paused.",
                updatedAtMs = 28_000L
            ),
            rolloutWaveSummary = "Wave 2 is carried forward to next window.",
            crossWindowGovernanceSummary = "Cross-window rollout paused by governance control.",
            nextEligibleWindowSummary = "Next eligible window starts at 28200."
        )
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = runId,
            templateId = "wf_provider_follow_up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = rolloutState,
            updatedAtMs = 28_000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "m28_record_wave_controls",
            runId = runId,
            userId = userId,
            sessionId = "s-m28-wave",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            workflowRun = workflowRun,
            createdAtMs = 27_900L,
            updatedAtMs = 28_000L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record)
        )

        val carryForwardCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                carryForwardOnly = true,
                limit = 20
            )
        )
        assertTrue(carryForwardCases.any { it.summary.runId == runId })

        val pausedCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                crossWindowPausedOnly = true,
                limit = 20
            )
        )
        assertTrue(pausedCases.any { it.summary.runId == runId })

        val nextWindowCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                nextWindowPendingOnly = true,
                limit = 20
            )
        )
        val targetCase = nextWindowCases.firstOrNull { it.summary.runId == runId }
        assertNotNull(targetCase)
        assertEquals(
            com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
            targetCase.summary.rolloutWaveStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD,
            targetCase.summary.rolloutWaveCompletionState
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
            targetCase.summary.rolloutWaveDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
            targetCase.summary.rolloutWindowEligibility
        )
        assertTrue(targetCase.summary.rolloutCarryForwardPending)
        assertTrue(targetCase.summary.rolloutCrossWindowPaused)
        assertTrue(targetCase.summary.rolloutNextWindowPending)
        assertTrue(targetCase.rolloutWaveSummary.contains("carried forward", ignoreCase = true))
        assertTrue(targetCase.crossWindowGovernanceSummary.contains("paused", ignoreCase = true))
    }

    @Test
    fun getGovernanceCases_m29PromotionReadinessAndCrossWaveFilters_matchWindowAwareState() {
        val runId = "m29_run_promotion_readiness"
        val userId = "u-m29-promotion"
        val rolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
            stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
            mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
            target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                tenantId = "tenant_m29",
                workspaceId = "workspace_m29",
                workflowTemplateId = "wf_provider_follow_up"
            ),
            promotionCandidate = com.lumi.coredomain.contract.RolloutPromotionCandidate(
                candidateId = "candidate_m29_1",
                waveId = "wave_m28_a",
                waveIndex = 2,
                targetScope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                windowEligibility = com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
                nextEligibleAtMs = 29_200L,
                summary = "Wave 2 candidate deferred to next maintenance window."
            ),
            promotionReadinessSummary = com.lumi.coredomain.contract.RolloutPromotionReadinessSummary(
                status = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED,
                blockers = listOf(
                    com.lumi.coredomain.contract.RolloutPromotionBlocker(
                        blockerId = "blocker_m29_window",
                        severity = com.lumi.coredomain.contract.PolicyEstateDriftSeverity.MEDIUM,
                        summary = "Maintenance window has not opened yet."
                    )
                ),
                recommendation = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                summary = "Promotion deferred until the next maintenance window and approval clearance."
            ),
            crossWaveAnalyticsSummary = com.lumi.coredomain.contract.CrossWaveAnalyticsSummary(
                healthBucket = com.lumi.coredomain.contract.WaveHealthBucket.CAUTION,
                totalWaves = 4,
                completedWaves = 1,
                blockedWaves = 1,
                deferredWaves = 2,
                carriedForwardWaves = 1,
                carryForwardPressure = true,
                summary = "Cross-wave caution with blocked and deferred waves."
            ),
            windowImpactSummary = com.lumi.coredomain.contract.WindowImpactSummary(
                decision = com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                windowStatus = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                eligibility = com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
                delayReason = com.lumi.coredomain.contract.WindowDelayReason.MAINTENANCE_WINDOW,
                nextEligibleAtMs = 29_200L,
                blockedTargets = 2,
                summary = "Window impact deferred promotion due to maintenance window timing."
            ),
            promotionOperationRecords = listOf(
                com.lumi.coredomain.contract.RolloutPromotionOperationRecord(
                    operationId = "promotion_op_m29_defer",
                    type = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                    status = com.lumi.coredomain.contract.GovernanceProgramOperationStatus.SCHEDULED,
                    summary = "Deferred promotion to the next eligible window.",
                    timestampMs = 29_000L
                )
            ),
            promotionOperationSummary = "Latest promotion operation deferred to the next eligible window."
        )
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = runId,
            templateId = "wf_provider_follow_up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = rolloutState,
            updatedAtMs = 29_000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "m29_record_promotion_readiness",
            runId = runId,
            userId = userId,
            sessionId = "s-m29",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            workflowRun = workflowRun,
            createdAtMs = 28_900L,
            updatedAtMs = 29_000L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record)
        )

        val deferredReadinessCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                rolloutPromotionDeferredOnly = true,
                limit = 20
            )
        )
        assertTrue(deferredReadinessCases.any { it.summary.runId == runId })

        val crossWaveDegradedCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                crossWaveDegradedOnly = true,
                limit = 20
            )
        )
        assertFalse(crossWaveDegradedCases.any { it.summary.runId == runId })

        val pendingOperationCases = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                promotionOperationPendingOnly = true,
                limit = 20
            )
        )
        val targetCase = pendingOperationCases.firstOrNull { it.summary.runId == runId }
        assertNotNull(targetCase)
        assertEquals(
            com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED,
            targetCase.summary.rolloutPromotionReadinessStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.WaveHealthBucket.CAUTION,
            targetCase.summary.crossWaveHealthBucket
        )
        assertEquals(
            com.lumi.coredomain.contract.WindowDelayReason.MAINTENANCE_WINDOW,
            targetCase.summary.windowDelayReason
        )
        assertEquals(1, targetCase.summary.windowDelayCount)
        assertEquals(29_200L, targetCase.summary.nextEligiblePromotionAtMs)
        assertEquals(
            com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
            targetCase.summary.promotionOperationType
        )
        assertEquals(
            com.lumi.coredomain.contract.GovernanceProgramOperationStatus.SCHEDULED,
            targetCase.summary.promotionOperationStatus
        )
        assertTrue(targetCase.rolloutPromotionReadinessSummary.contains("deferred", ignoreCase = true))
        assertTrue(targetCase.crossWaveSummary.contains("cross-wave", ignoreCase = true))
        assertTrue(targetCase.windowImpactReadableSummary.contains("window impact", ignoreCase = true))
        assertTrue(targetCase.rolloutPromotionOperationSummary.contains("deferred", ignoreCase = true))
    }

    @Test
    fun getGovernanceCases_m30ProgramCoordinationFilters_matchPriorityDependencyContentionAndEscalation() {
        val runId = "m30_run_program_coordination"
        val userId = "u-m30-coordination"
        val rolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
            stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
            mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
            target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                tenantId = "tenant_m30",
                workspaceId = "workspace_m30"
            ),
            programCoordination = com.lumi.coredomain.contract.RolloutProgramCoordinationRecord(
                programId = "program_beta",
                programName = "Program Beta",
                priority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                coordinationState = com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
                decisionReason = com.lumi.coredomain.contract.RolloutProgramDecisionReason.DEPENDENCY_BLOCK,
                priorityDecision = com.lumi.coredomain.contract.RolloutProgramPriorityDecision(
                    decisionId = "decision_m30_1",
                    selectedProgramId = "program_alpha",
                    selectedPriority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                    deferredProgramIds = listOf("program_beta", "program_delta"),
                    decisionReason = com.lumi.coredomain.contract.RolloutProgramDecisionReason.PRIORITY_WIN,
                    summary = "Program alpha selected; program beta deferred by dependency."
                ),
                dependencies = listOf(
                    com.lumi.coredomain.contract.RolloutProgramDependency(
                        dependencyId = "dep_m30_1",
                        programId = "program_beta",
                        dependsOnProgramId = "program_alpha",
                        blocked = true,
                        summary = "Program beta blocked by program alpha."
                    )
                ),
                conflicts = listOf(
                    com.lumi.coredomain.contract.RolloutProgramConflict(
                        conflictId = "conflict_m30_1",
                        withProgramId = "program_gamma",
                        type = com.lumi.coredomain.contract.RolloutProgramConflictType.WINDOW_OVERLAP,
                        severity = com.lumi.coredomain.contract.RolloutProgramConflictSeverity.HIGH,
                        summary = "Shared window conflict with program gamma."
                    )
                ),
                contention = com.lumi.coredomain.contract.RolloutProgramContentionSummary(
                    type = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                    level = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                    contendedProgramIds = listOf("program_alpha", "program_gamma"),
                    summary = "Window overlap contention detected."
                ),
                escalation = com.lumi.coredomain.contract.RolloutProgramEscalationState(
                    status = com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
                    reason = com.lumi.coredomain.contract.RolloutProgramEscalationReason.REPEATED_DEFER,
                    summary = "Escalation opened after repeated defer."
                ),
                summary = "Program beta deferred due to dependency and contention."
            ),
            crossProgramGovernanceSummary = com.lumi.coredomain.contract.CrossProgramGovernanceSummary(
                activeProgramId = "program_alpha",
                competingProgramCount = 3,
                deferredProgramCount = 2,
                blockedProgramCount = 1,
                escalatedProgramCount = 1,
                contentionType = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                contentionLevel = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                summary = "Cross-program contention remains high; escalation open."
            ),
            programCoordinationSummary = "Program beta deferred due to dependency and contention.",
            summary = "Program beta deferred due to dependency and contention."
        )
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = runId,
            templateId = "wf_rollout_coordination",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = rolloutState,
            updatedAtMs = 30_000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "m30_record_program_coordination",
            runId = runId,
            userId = userId,
            sessionId = "s-m30",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            workflowRun = workflowRun,
            createdAtMs = 29_900L,
            updatedAtMs = 30_000L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record)
        )

        val priorityDeferred = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                priorityDeferredOnly = true,
                limit = 20
            )
        )
        assertTrue(priorityDeferred.any { it.summary.runId == runId })

        val dependencyBlocked = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                dependencyBlockedOnly = true,
                limit = 20
            )
        )
        assertTrue(dependencyBlocked.any { it.summary.runId == runId })

        val contentionOnly = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                contentionOnly = true,
                programContentionType = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                programContentionLevel = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                limit = 20
            )
        )
        assertTrue(contentionOnly.any { it.summary.runId == runId })

        val escalated = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                coordinationEscalatedOnly = true,
                programEscalationStatus = com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
                limit = 20
            )
        )
        val targetCase = escalated.firstOrNull { it.summary.runId == runId }
        assertNotNull(targetCase)
        assertEquals(com.lumi.coredomain.contract.RolloutProgramPriority.HIGH, targetCase.summary.programPriority)
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
            targetCase.summary.programCoordinationState
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramDecisionReason.DEPENDENCY_BLOCK,
            targetCase.summary.programDecisionReason
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
            targetCase.summary.programContentionType
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
            targetCase.summary.programContentionLevel
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
            targetCase.summary.programEscalationStatus
        )
        assertEquals(1, targetCase.summary.programDependencyBlockedCount)
        assertEquals(1, targetCase.summary.programConflictCount)
        assertEquals(2, targetCase.summary.programDeferredCount)
        assertTrue(targetCase.programCoordinationSummary.contains("deferred", ignoreCase = true))
        assertTrue(targetCase.crossProgramSummary.contains("cross-program", ignoreCase = true))
        assertTrue(targetCase.programEscalationSummary.contains("escalation", ignoreCase = true))
    }

    @Test
    fun getGovernanceCases_m31CapacityFilters_matchCapacityAndPolicySignals() {
        val userId = "u-m31-capacity"
        val runId = "run_m31_capacity_filter"
        val rolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
            stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
            mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
            target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                workflowTemplateId = "wf_rollout_capacity"
            ),
            governanceCapacityPool = com.lumi.coredomain.contract.GovernanceCapacityPool(
                poolKey = "workspace_finance",
                scope = com.lumi.coredomain.contract.GovernanceCapacityScope.WORKSPACE,
                scopeId = "workspace_finance",
                loadBucket = com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED,
                budget = com.lumi.coredomain.contract.ApprovalCapacityBudget(
                    availableSlots = 0,
                    requestedSlots = 18,
                    reservedSlots = 1,
                    utilizationRate = 1.0
                ),
                nextAvailableAtMs = 31_500L,
                summary = "Approval queue saturated for workspace_finance."
            ),
            approvalQueuePressure = com.lumi.coredomain.contract.ApprovalQueuePressureSummary(
                poolKey = "workspace_finance",
                loadBucket = com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED,
                pendingApprovals = 16,
                inFlightApprovals = 2,
                blockedApprovals = 6,
                summary = "Approval queue is saturated (16 pending / 2 ready)."
            ),
            approvalBalancingDecision = com.lumi.coredomain.contract.ApprovalBalancingDecision(
                decisionType = com.lumi.coredomain.contract.ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
                fromPoolKey = "workspace_finance",
                toPoolKey = "workspace_general",
                deferralReason = com.lumi.coredomain.contract.ApprovalDeferralReason.QUEUE_SATURATED,
                applied = true,
                summary = "Deferred lower-priority approvals due to saturation."
            ),
            approvalAssignmentRecommendation = com.lumi.coredomain.contract.ApprovalAssignmentRecommendation(
                recommendedPoolKey = "workspace_general",
                recommendedAssigneeId = "ops_tier2",
                recommendedAssigneeDisplayName = "Ops Tier 2",
                summary = "Reassign approvals to Ops Tier 2."
            ),
            capacityAwarePromotionDecision = com.lumi.coredomain.contract.CapacityAwarePromotionDecision(
                decisionId = "decision_m31_1",
                allowedNow = false,
                capacityBlocked = true,
                policyBlocked = true,
                decisionType = com.lumi.coredomain.contract.ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
                deferralReason = com.lumi.coredomain.contract.ApprovalDeferralReason.QUEUE_SATURATED,
                summary = "Promotion blocked by capacity and policy."
            ),
            portfolioCapacitySnapshot = com.lumi.coredomain.contract.PortfolioCapacitySnapshot(
                totalPools = 3,
                saturatedPools = 1,
                deferredPrograms = 2,
                criticalReservedPrograms = 1,
                summary = "Portfolio bottleneck detected across active programs."
            ),
            programPortfolioSummary = com.lumi.coredomain.contract.ProgramPortfolioSummary(
                activeProgramId = "program_alpha",
                capacityBlockedPrograms = 2,
                policyBlockedPrograms = 1,
                balancedPrograms = 1,
                criticalReservedPrograms = 1,
                bottleneckPoolKeys = listOf("workspace_finance"),
                recommendedNextAction = "Defer lower priority approvals to next eligible window.",
                summary = "Critical reserve consumed while lower-priority programs defer."
            ),
            approvalLoadSummary = "Approval queue is saturated for workspace_finance.",
            capacityBlockSummary = "Capacity blocked by approval slot limits.",
            policyBlockSummary = "Policy gate still requires explicit approval.",
            capacityBalancingSummary = "Balancing deferred this run and reassigned lower-priority approvals.",
            portfolioCapacitySummary = "Portfolio bottleneck detected across active programs.",
            summary = "Capacity-aware governance deferred this run."
        )
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = runId,
            templateId = "wf_rollout_capacity",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = rolloutState,
            updatedAtMs = 31_000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "m31_record_capacity",
            runId = runId,
            userId = userId,
            sessionId = "s-m31",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            workflowRun = workflowRun,
            createdAtMs = 30_900L,
            updatedAtMs = 31_000L
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(userId, record)
        )

        val filtered = orchestrator.getGovernanceCases(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                capacityPoolKey = "workspace_finance",
                approvalLoadBucket = com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED,
                capacityDeferralReason = com.lumi.coredomain.contract.ApprovalDeferralReason.QUEUE_SATURATED,
                balancingDecisionType = com.lumi.coredomain.contract.ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
                capacityBlockedOnly = true,
                policyBlockedOnly = true,
                bottleneckOnly = true,
                criticalCapacityReservedOnly = true,
                limit = 20
            )
        )

        val targetCase = filtered.firstOrNull { it.summary.runId == runId }
        assertNotNull(targetCase)
        assertEquals("workspace_finance", targetCase.summary.capacityPoolKey)
        assertEquals(
            com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED,
            targetCase.summary.approvalLoadBucket
        )
        assertEquals(
            com.lumi.coredomain.contract.ApprovalDeferralReason.QUEUE_SATURATED,
            targetCase.summary.capacityDeferralReason
        )
        assertEquals(
            com.lumi.coredomain.contract.ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
            targetCase.summary.balancingDecisionType
        )
        assertTrue(targetCase.summary.capacityBlocked)
        assertTrue(targetCase.summary.policyBlocked)
        assertTrue(targetCase.summary.approvalQueueSaturated)
        assertTrue(targetCase.summary.criticalCapacityReserved)
        assertTrue(targetCase.summary.portfolioBottleneck)
        assertTrue(targetCase.approvalLoadSummary.contains("saturated", ignoreCase = true))
        assertTrue(targetCase.capacityBlockSummary.contains("capacity blocked", ignoreCase = true))
        assertTrue(targetCase.policyBlockSummary.contains("policy gate", ignoreCase = true))
        assertTrue(targetCase.capacityBalancingSummary.contains("balancing deferred", ignoreCase = true))
        assertTrue(targetCase.portfolioCapacitySummary.contains("portfolio bottleneck", ignoreCase = true))
    }

    @Test
    fun portfolioSimulation_runsAreDeterministicForSameBaselineAndScenario() {
        val userId = "u-m32-deterministic"
        val orchestrator = AgentOrchestrator(
            nowMs = { 1_700_320_000_000L },
            dynamicStatePersistence = persistedStateWithRecord(
                userId = userId,
                record = ExecutionReceiptRecord(
                    recordId = "m32_seed_record",
                    runId = "m32_seed_run",
                    userId = userId,
                    sessionId = "m32_seed_session",
                    module = ModuleId.CHAT,
                    status = ResponseStatus.WAITING_USER,
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            )
        )
        val scenario = orchestrator.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_det",
                name = "Deterministic scenario",
                assumptions = PortfolioScenarioAssumptionSet(
                    horizonDays = 14,
                    bucketHours = 24,
                    timezone = "UTC"
                ),
                modifications = listOf(
                    PortfolioScenarioModification(
                        modificationId = "m32_det_shift",
                        type = PortfolioScenarioModificationType.SHIFT_ROLLOUT_WINDOW,
                        intValue = 1
                    ),
                    PortfolioScenarioModification(
                        modificationId = "m32_det_capacity",
                        type = PortfolioScenarioModificationType.ADJUST_APPROVAL_CAPACITY,
                        doubleValue = 20.0
                    )
                ),
                simulationOnly = true,
                active = true
            )
        )

        val first = orchestrator.runPortfolioScenario(userId, scenario.scenarioId)
        val second = orchestrator.runPortfolioScenario(userId, scenario.scenarioId)

        assertEquals(PortfolioSimulationRunStatus.COMPLETED, first.status)
        assertEquals(PortfolioSimulationRunStatus.COMPLETED, second.status)
        assertEquals(first.approvalDemandForecast, second.approvalDemandForecast)
        assertEquals(first.queuePressureForecast, second.queuePressureForecast)
        assertEquals(first.programCompletionForecast, second.programCompletionForecast)
        assertEquals(first.windowEligibilityForecast, second.windowEligibilityForecast)
        assertEquals(first.breachSignals, second.breachSignals)
        assertEquals(first.recommendationReasonCodes, second.recommendationReasonCodes)
        assertEquals(first.topRecommendation, second.topRecommendation)
    }

    @Test
    fun portfolioSimulation_capacityIncreaseLowersPressureAndBacklog() {
        val userId = "u-m32-capacity"
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(
                userId = userId,
                record = ExecutionReceiptRecord(
                    recordId = "m32_capacity_seed",
                    runId = "m32_capacity_seed_run",
                    userId = userId,
                    sessionId = "m32_capacity_seed_session",
                    module = ModuleId.CHAT,
                    status = ResponseStatus.WAITING_USER,
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            )
        )
        orchestrator.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_base",
                name = "Base",
                modifications = emptyList(),
                simulationOnly = true,
                active = true
            )
        )
        orchestrator.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_capacity_plus",
                name = "Capacity plus",
                modifications = listOf(
                    PortfolioScenarioModification(
                        modificationId = "m32_capacity_plus",
                        type = PortfolioScenarioModificationType.ADJUST_APPROVAL_CAPACITY,
                        doubleValue = 100.0
                    )
                ),
                simulationOnly = true,
                active = true
            )
        )

        val baselineRun = orchestrator.runPortfolioScenario(userId, "scenario_m32_base")
        val capacityRun = orchestrator.runPortfolioScenario(userId, "scenario_m32_capacity_plus")

        val baselineFinal = baselineRun.approvalDemandForecast.last()
        val capacityFinal = capacityRun.approvalDemandForecast.last()
        assertTrue(capacityFinal.utilizationRate <= baselineFinal.utilizationRate)
        assertTrue(capacityFinal.expectedBacklog <= baselineFinal.expectedBacklog)
    }

    @Test
    fun portfolioSimulation_windowShiftAndComparisonAreDurableAndReadable() {
        val userId = "u-m32-window"
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(
                userId = userId,
                record = ExecutionReceiptRecord(
                    recordId = "m32_window_seed",
                    runId = "m32_window_seed_run",
                    userId = userId,
                    sessionId = "m32_window_seed_session",
                    module = ModuleId.CHAT,
                    status = ResponseStatus.WAITING_USER,
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            )
        )
        orchestrator.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_window_base",
                name = "Window base",
                modifications = emptyList(),
                simulationOnly = true,
                active = true
            )
        )
        orchestrator.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_window_shifted",
                name = "Window shifted",
                modifications = listOf(
                    PortfolioScenarioModification(
                        modificationId = "m32_shift_plus_three",
                        type = PortfolioScenarioModificationType.SHIFT_ROLLOUT_WINDOW,
                        intValue = 3
                    ),
                    PortfolioScenarioModification(
                        modificationId = "m32_sim_only",
                        type = PortfolioScenarioModificationType.TOGGLE_AUTOMATION_SIMULATION_ONLY,
                        boolValue = true
                    )
                ),
                simulationOnly = true,
                active = true
            )
        )

        val baselineRun = orchestrator.runPortfolioScenario(userId, "scenario_m32_window_base")
        val shiftedRun = orchestrator.runPortfolioScenario(userId, "scenario_m32_window_shifted")

        val baselineCompletion = baselineRun.programCompletionForecast.firstOrNull()?.estimatedCompletionBucket ?: 0
        val shiftedCompletion = shiftedRun.programCompletionForecast.firstOrNull()?.estimatedCompletionBucket ?: 0
        assertTrue(shiftedCompletion >= baselineCompletion)
        assertTrue(
            shiftedRun.approvalDemandForecast.any { forecast ->
                forecast.reasonCodes.contains(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_SHIFT_WINDOW)
            }
        )
        assertTrue(shiftedRun.notes.any { it.contains("simulation-only toggle", ignoreCase = true) })

        val comparison = orchestrator.comparePortfolioSimulationRuns(
            userId = userId,
            baselineRunId = baselineRun.runId,
            candidateRunId = shiftedRun.runId
        )
        val nonNullComparison = assertNotNull(comparison)
        assertEquals(baselineRun.runId, nonNullComparison.baselineRunId)
        assertEquals(shiftedRun.runId, nonNullComparison.candidateRunId)
        assertTrue(nonNullComparison.summary.contains("Comparison", ignoreCase = true))

        val export = orchestrator.exportPortfolioSimulationSummary(userId, shiftedRun.runId)
        assertTrue(export.contains("Portfolio Simulation Run"))
        assertTrue(export.contains(shiftedRun.runId))
    }

    @Test
    fun governanceConsoleState_includesPortfolioSimulationStateSummary() {
        val userId = "u-m32-console"
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithRecord(
                userId = userId,
                record = ExecutionReceiptRecord(
                    recordId = "m32_console_seed",
                    runId = "m32_console_seed_run",
                    userId = userId,
                    sessionId = "m32_console_seed_session",
                    module = ModuleId.CHAT,
                    status = ResponseStatus.WAITING_USER,
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            )
        )
        orchestrator.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_console",
                name = "Console scenario",
                modifications = listOf(
                    PortfolioScenarioModification(
                        modificationId = "m32_console_capacity",
                        type = PortfolioScenarioModificationType.ADJUST_APPROVAL_CAPACITY,
                        doubleValue = 20.0
                    )
                ),
                simulationOnly = true,
                active = true
            )
        )
        orchestrator.runPortfolioScenario(userId, "scenario_m32_console")

        val console = orchestrator.getGovernanceConsoleState(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        )

        val simulation = console.portfolioSimulationState
        assertNotNull(simulation)
        assertTrue(simulation.runs.isNotEmpty())
        assertTrue(simulation.scenarios.isNotEmpty())
        assertNotNull(simulation.summary)
        assertTrue(simulation.summary?.summary?.isNotBlank() == true)
    }

    @Test
    fun portfolioOptimization_seededSolverIsDeterministic() {
        val userId = "u-m33-deterministic"
        val now = 1_700_330_000_000L
        val state = PersistedDynamicState(
            executionLedgerRecords = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_det_alpha",
                    programId = "program_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.CRITICAL,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY,
                    slaStatus = com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED,
                    approvalPending = true,
                    capacityBlocked = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_det_beta",
                    programId = "program_beta",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY_WITH_CAUTION,
                    crossWaveHealthBucket = com.lumi.coredomain.contract.WaveHealthBucket.CAUTION,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_det_gamma",
                    programId = "program_gamma",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L,
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.MEDIUM,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY,
                    safeAutomationEligible = true
                )
            )
        )
        val request = optimizationRequest(
            requestId = "request_m33_deterministic",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 33L
        )
        val first = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, state),
            nowMs = { now }
        )
        val second = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, state),
            nowMs = { now }
        )

        first.savePortfolioOptimizationRequest(userId, request)
        second.savePortfolioOptimizationRequest(userId, request)
        val firstResult = first.runPortfolioOptimization(userId, request.requestId)
        val secondResult = second.runPortfolioOptimization(userId, request.requestId)

        assertEquals(PortfolioOptimizationResultStatus.COMPLETED, firstResult.status)
        assertEquals(PortfolioOptimizationResultStatus.COMPLETED, secondResult.status)
        assertEquals(firstResult.candidateSchedules, secondResult.candidateSchedules)
        assertEquals(firstResult.paretoFrontierSummary, secondResult.paretoFrontierSummary)
        assertEquals(firstResult.summary, secondResult.summary)
    }

    @Test
    fun portfolioOptimization_enforcesWindowsCapacityDependenciesAndGuardrails() {
        val userId = "u-m33-constraints"
        val now = 1_700_331_000_000L
        val state = PersistedDynamicState(
            executionLedgerRecords = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_capacity_a",
                    programId = "program_capacity_a",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true,
                    capacityBlocked = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_capacity_b",
                    programId = "program_capacity_b",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    approvalPending = true,
                    capacityBlocked = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_capacity_c",
                    programId = "program_capacity_c",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L,
                    approvalPending = true,
                    capacityBlocked = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_ready",
                    programId = "program_ready",
                    waveId = "wave_1",
                    updatedAtMs = now + 4_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_window",
                    programId = "program_window",
                    waveId = "wave_2",
                    updatedAtMs = now + 5_000L,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED,
                    scheduleDecision = com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                    scheduleBlockReason = com.lumi.coredomain.contract.ExecutionWindowBlockReason.BLACKOUT_WINDOW,
                    windowDelayReason = com.lumi.coredomain.contract.WindowDelayReason.BLACKOUT_WINDOW,
                    nextEligibleAtMs = now + (20L * 24L * 60L * 60L * 1000L)
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_dependency",
                    programId = "program_dependency",
                    waveId = "wave_2",
                    updatedAtMs = now + 6_000L,
                    dependencyProgramIds = listOf("program_missing")
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_guardrail",
                    programId = "program_guardrail",
                    waveId = "wave_1",
                    updatedAtMs = now + 7_000L,
                    policyBlocked = true
                )
            )
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, state),
            nowMs = { now }
        )
        val request = orchestrator.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m33_constraints",
                objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
                riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
                topN = 3,
                seed = 42L
            )
        )

        val result = orchestrator.runPortfolioOptimization(userId, request.requestId)
        val topCandidate = assertNotNull(result.candidateSchedules.firstOrNull())
        val bucketCapacities = topCandidate.scheduledActions.groupBy { it.scheduledBucketIndex }

        assertTrue(
            bucketCapacities.values.all { actions ->
                actions.sumOf { it.capacityCost } <= result.baselineSnapshot.capacity.approvalCapacityBaseline
            }
        )
        assertTrue(
            topCandidate.deferredActions.any {
                it.programId == "program_window" &&
                    it.blockedBy == PortfolioOptimizationConstraintFamily.WINDOW_ELIGIBILITY
            }
        )
        assertTrue(
            topCandidate.deferredActions.any {
                it.programId == "program_dependency" &&
                    it.blockedBy == PortfolioOptimizationConstraintFamily.DEPENDENCY_GATE
            }
        )
        assertTrue(
            topCandidate.deferredActions.any {
                it.programId == "program_guardrail" &&
                    it.blockedBy == PortfolioOptimizationConstraintFamily.POLICY_GUARDRAIL
            }
        )
        assertTrue(
            topCandidate.bindingConstraints.any { it.family == PortfolioOptimizationConstraintFamily.APPROVAL_CAPACITY } ||
                topCandidate.bindingConstraints.any { it.family == PortfolioOptimizationConstraintFamily.WINDOW_ELIGIBILITY }
        )
    }

    @Test
    fun portfolioOptimization_riskAwareSchedulingDefersRiskyPromotionsUnderStrictLimits() {
        val userId = "u-m33-risk"
        val now = 1_700_332_000_000L
        val state = PersistedDynamicState(
            executionLedgerRecords = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_risky",
                    programId = "program_risky",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY_WITH_CAUTION,
                    connectorStatus = "degraded",
                    credentialState = com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.EXPIRED,
                    crossWaveHealthBucket = com.lumi.coredomain.contract.WaveHealthBucket.DEGRADED
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_safe",
                    programId = "program_safe",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY
                )
            )
        )
        val strict = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, state),
            nowMs = { now }
        )
        val permissive = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, state),
            nowMs = { now }
        )
        val strictRequest = strict.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m33_risk_strict",
                objectivePreset = PortfolioOptimizationObjectivePreset.RISK_AVERSE,
                riskTolerance = PortfolioOptimizationRiskTolerance.LOW,
                topN = 2,
                seed = 7L
            )
        )
        val permissiveRequest = permissive.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m33_risk_fast",
                objectivePreset = PortfolioOptimizationObjectivePreset.THROUGHPUT_FIRST,
                riskTolerance = PortfolioOptimizationRiskTolerance.HIGH,
                topN = 2,
                seed = 7L
            )
        )

        val strictResult = strict.runPortfolioOptimization(userId, strictRequest.requestId)
        val permissiveResult = permissive.runPortfolioOptimization(userId, permissiveRequest.requestId)
        val strictTop = assertNotNull(strictResult.candidateSchedules.firstOrNull())
        val permissiveTop = assertNotNull(permissiveResult.candidateSchedules.firstOrNull())

        assertTrue(
            strictTop.deferredActions.any {
                it.programId == "program_risky" &&
                    it.blockedBy == PortfolioOptimizationConstraintFamily.MAX_CONCURRENT_RISKY_PROMOTIONS
            }
        )
        assertTrue(permissiveTop.scheduledActions.any { it.programId == "program_risky" })
        assertTrue(strictTop.score.riskScore >= permissiveTop.score.riskScore)
    }

    @Test
    fun portfolioOptimization_returnsUniqueTopNWithTradeoffExplanations() {
        val userId = "u-m33-topn"
        val now = 1_700_333_000_000L
        val state = PersistedDynamicState(
            executionLedgerRecords = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_topn_critical",
                    programId = "program_critical",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.CRITICAL,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY,
                    slaStatus = com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_topn_risky",
                    programId = "program_risky",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY_WITH_CAUTION,
                    connectorStatus = "degraded",
                    credentialState = com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.EXPIRING,
                    crossWaveHealthBucket = com.lumi.coredomain.contract.WaveHealthBucket.CAUTION
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_topn_auto",
                    programId = "program_auto",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L,
                    safeAutomationEligible = true,
                    currentDeferred = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_topn_low",
                    programId = "program_low",
                    waveId = "wave_2",
                    updatedAtMs = now + 4_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m33_topn_high",
                    programId = "program_high",
                    waveId = "wave_3",
                    updatedAtMs = now + 5_000L,
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                    approvalPending = true
                )
            )
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = persistedStateWithData(userId, state),
            nowMs = { now }
        )
        val request = orchestrator.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m33_topn",
                objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
                riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
                topN = 4,
                seed = 99L
            )
        )

        val result = orchestrator.runPortfolioOptimization(userId, request.requestId)
        val candidateIds = result.candidateSchedules.map { it.candidateId }

        assertTrue(result.candidateSchedules.size >= 2)
        assertEquals(candidateIds.distinct().size, candidateIds.size)
        assertTrue(result.candidateSchedules.all { it.tradeoffExplanations.isNotEmpty() })
        assertTrue(
            result.candidateSchedules.any { candidate ->
                candidate.tradeoffExplanations.any { explanation -> explanation.summary.isNotBlank() }
            }
        )
        assertTrue(result.paretoFrontierSummary?.frontierCandidateIds?.isNotEmpty() == true)
    }

    @Test
    fun portfolioOptimization_selectionIsDurableAndRestoresIntoGovernanceConsole() {
        val userId = "u-m33-selection"
        var clock = 1_700_334_000_000L
        val records = listOf(
            optimizationRecord(
                userId = userId,
                runId = "run_m33_selection_a",
                programId = "program_selection_a",
                waveId = "wave_1",
                updatedAtMs = clock + 1_000L,
                priority = com.lumi.coredomain.contract.RolloutProgramPriority.CRITICAL,
                readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY,
                slaStatus = com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m33_selection_b",
                programId = "program_selection_b",
                waveId = "wave_1",
                updatedAtMs = clock + 2_000L,
                readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m33_selection_c",
                programId = "program_selection_c",
                waveId = "wave_2",
                updatedAtMs = clock + 3_000L,
                safeAutomationEligible = true
            )
        )
        val writerPort = RecordingPersistencePort(
            userId = userId,
            initialState = PersistedDynamicState(executionLedgerRecords = records)
        )
        val writer = AgentOrchestrator(
            dynamicStatePersistence = writerPort,
            nowMs = { clock++ }
        )
        val request = writer.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m33_selection",
                objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
                riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
                topN = 3,
                seed = 55L
            )
        )
        val result = writer.runPortfolioOptimization(userId, request.requestId)
        val selectedCandidate = assertNotNull(result.candidateSchedules.firstOrNull())
        val decision = writer.selectPortfolioOptimizationSchedule(
            userId = userId,
            resultId = result.resultId,
            candidateId = selectedCandidate.candidateId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val persisted = assertNotNull(writerPort.lastSavedState)

        assertTrue(persisted.portfolioOptimizationRequests.any { it.requestId == request.requestId })
        assertTrue(persisted.portfolioOptimizationResults.any { it.resultId == result.resultId })
        assertTrue(persisted.portfolioOptimizationDecisionRecords.any { it.decisionId == decision.decisionId })

        val reader = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = persisted
            ),
            nowMs = { clock++ }
        )
        val restoredState = reader.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(requestId = request.requestId, limit = 10)
        )
        val restoredConsole = reader.getGovernanceConsoleState(
            userId = userId,
            filter = GovernanceConsoleFilter(includeReviewed = true, limit = 20)
        )
        val export = reader.exportPortfolioOptimizationSummary(userId, result.resultId)

        assertTrue(restoredState.decisions.any { it.decisionId == decision.decisionId })
        assertEquals(selectedCandidate.candidateId, restoredState.summary?.selectedCandidateId)
        assertEquals(
            selectedCandidate.candidateId,
            restoredConsole.portfolioOptimizationState?.summary?.selectedCandidateId
        )
        assertTrue(export.contains("Selected schedule: ${decision.candidateId}"))
        assertTrue(export.contains("Local Operator"))
    }

    @Test
    fun portfolioOptimization_driftComputationIsDeterministic() {
        val userId = "u-m34-drift"
        val now = 1_700_340_000_000L
        val records = listOf(
            optimizationRecord(
                userId = userId,
                runId = "run_m34_drift_alpha",
                programId = "program_drift_alpha",
                waveId = "wave_1",
                updatedAtMs = now + 1_000L,
                approvalPending = true
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m34_drift_beta",
                programId = "program_drift_beta",
                waveId = "wave_1",
                updatedAtMs = now + 2_000L,
                safeAutomationEligible = true
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m34_drift_gamma",
                programId = "program_drift_gamma",
                waveId = "wave_2",
                updatedAtMs = now + 3_000L
            )
        )
        val first = createLearningFixture(
            userId = userId,
            now = now,
            records = records,
            requestId = "request_m34_drift",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 71L
        )
        val second = createLearningFixture(
            userId = userId,
            now = now,
            records = records,
            requestId = "request_m34_drift",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 71L
        )
        val firstObservations = learningObservationsForCandidate(
            result = first.result,
            candidate = first.candidate,
            riskIncidentCount = 2
        )
        val secondObservations = learningObservationsForCandidate(
            result = second.result,
            candidate = second.candidate,
            riskIncidentCount = 2
        )

        first.orchestrator.recordPortfolioOptimizationOutcome(
            userId = userId,
            decisionId = first.decision.decisionId,
            observations = firstObservations
        )
        second.orchestrator.recordPortfolioOptimizationOutcome(
            userId = userId,
            decisionId = second.decision.decisionId,
            observations = secondObservations
        )

        val firstState = first.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = first.decision.decisionId, includeCompleted = true, limit = 10)
        )
        val secondState = second.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = second.decision.decisionId, includeCompleted = true, limit = 10)
        )

        assertEquals(firstState.outcomes.first(), secondState.outcomes.first())
        assertEquals(firstState.driftSummaries.first(), secondState.driftSummaries.first())
        assertEquals(
            com.lumi.coredomain.contract.PortfolioDriftSeverity.CRITICAL,
            firstState.driftSummaries.first().highestSeverity
        )
    }

    @Test
    fun portfolioOptimization_tuningSuggestionRequiresMinimumEvidenceThreshold() {
        val userId = "u-m34-threshold"
        val now = 1_700_341_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_threshold_alpha",
                    programId = "program_threshold_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_threshold_beta",
                    programId = "program_threshold_beta",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    safeAutomationEligible = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_threshold_gamma",
                    programId = "program_threshold_gamma",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L
                )
            ),
            requestId = "request_m34_threshold",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 72L
        )
        val observations = learningObservationsForCandidate(
            result = fixture.result,
            candidate = fixture.candidate,
            riskIncidentCount = 3
        )

        repeat(2) {
            fixture.orchestrator.recordPortfolioOptimizationOutcome(
                userId = userId,
                decisionId = fixture.decision.decisionId,
                observations = observations
            )
            val state = fixture.orchestrator.getPortfolioOptimizationState(
                userId = userId,
                query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
            )
            assertTrue(state.tuningSuggestions.none {
                it.status == com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING
            })
        }

        fixture.orchestrator.recordPortfolioOptimizationOutcome(
            userId = userId,
            decisionId = fixture.decision.decisionId,
            observations = observations
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
        )
        val suggestion = assertNotNull(
            state.tuningSuggestions.firstOrNull {
                it.status == com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING
            }
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
            suggestion.targetFamily
        )
        assertEquals(3, state.outcomes.size)
        assertEquals(1, state.summary?.pendingTuningCount)
    }

    @Test
    fun portfolioOptimization_guardrailsBlockExcessiveTuningApplies() {
        val userId = "u-m34-guardrail"
        val now = 1_700_342_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_guardrail_alpha",
                    programId = "program_guardrail_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_guardrail_beta",
                    programId = "program_guardrail_beta",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    safeAutomationEligible = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_guardrail_gamma",
                    programId = "program_guardrail_gamma",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L
                )
            ),
            requestId = "request_m34_guardrail",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 73L
        )
        val observations = learningObservationsForCandidate(
            result = fixture.result,
            candidate = fixture.candidate,
            riskIncidentCount = 3
        )
        repeat(3) {
            fixture.orchestrator.recordPortfolioOptimizationOutcome(
                userId = userId,
                decisionId = fixture.decision.decisionId,
                observations = observations
            )
        }
        val learningState = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
        )
        val suggestion = assertNotNull(
            learningState.tuningSuggestions.firstOrNull {
                it.status == com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING
            }
        )
        val persisted = assertNotNull(fixture.port.lastSavedState)
        val snapshot = assertNotNull(
            persisted.portfolioOptimizationCalibrationSnapshots.firstOrNull {
                it.snapshotId == suggestion.calibrationSnapshotId
            }
        )
        val snapshotV2 = snapshot.copy(
            snapshotId = "${snapshot.snapshotId}_v2",
            parentSnapshotId = snapshot.snapshotId,
            version = snapshot.version + 1,
            createdAtMs = now + 50_000L
        )
        val snapshotV3 = snapshot.copy(
            snapshotId = "${snapshot.snapshotId}_v3",
            parentSnapshotId = snapshotV2.snapshotId,
            version = snapshot.version + 2,
            createdAtMs = now + 60_000L
        )
        val guardrailState = persisted.copy(
            portfolioOptimizationCalibrationSnapshots =
                persisted.portfolioOptimizationCalibrationSnapshots + listOf(snapshotV2, snapshotV3),
            portfolioOptimizationTuningDecisionRecords =
                persisted.portfolioOptimizationTuningDecisionRecords + listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord(
                        tuningDecisionId = "applied_m34_guardrail_1",
                        suggestionId = "historic_suggestion_1",
                        decisionId = fixture.decision.decisionId,
                        calibrationSnapshotId = snapshot.snapshotId,
                        appliedSnapshotId = snapshotV2.snapshotId,
                        status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.APPLIED,
                        operatorId = "local-user",
                        operatorName = "Local Operator",
                        decidedAtMs = now + 70_000L,
                        summary = "Historic apply 1."
                    ),
                    com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord(
                        tuningDecisionId = "applied_m34_guardrail_2",
                        suggestionId = "historic_suggestion_2",
                        decisionId = fixture.decision.decisionId,
                        calibrationSnapshotId = snapshotV2.snapshotId,
                        appliedSnapshotId = snapshotV3.snapshotId,
                        status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.APPLIED,
                        operatorId = "local-user",
                        operatorName = "Local Operator",
                        decidedAtMs = now + 80_000L,
                        summary = "Historic apply 2."
                    )
                )
        )
        val guardrailOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = guardrailState
            ),
            nowMs = { now + 90_000L }
        )

        val blocked = guardrailOrchestrator.applyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = suggestion.suggestionId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val blockedState = guardrailOrchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.BLOCKED,
            blocked.status
        )
        assertTrue(
            blocked.blockedGuardrails.contains(
                com.lumi.coredomain.contract.PortfolioOptimizationTuningGuardrail.MAX_APPLIES_PER_LINEAGE_WINDOW
            )
        )
        assertTrue(
            blockedState.tuningDecisionRecords.any { it.tuningDecisionId == blocked.tuningDecisionId }
        )
    }

    @Test
    fun portfolioOptimization_applyingTuningChangesSubsequentScoringDeterministically() {
        val userId = "u-m34-apply"
        val now = 1_700_343_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_apply_risky",
                    programId = "program_apply_risky",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.CRITICAL,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY_WITH_CAUTION,
                    connectorStatus = "degraded",
                    credentialState = com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.EXPIRED,
                    crossWaveHealthBucket = com.lumi.coredomain.contract.WaveHealthBucket.DEGRADED
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_apply_safe",
                    programId = "program_apply_safe",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    readiness = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_apply_capacity",
                    programId = "program_apply_capacity",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L,
                    approvalPending = true
                )
            ),
            requestId = "request_m34_apply",
            objectivePreset = PortfolioOptimizationObjectivePreset.THROUGHPUT_FIRST,
            riskTolerance = PortfolioOptimizationRiskTolerance.HIGH,
            topN = 4,
            seed = 74L
        )
        val initialScores = fixture.result.candidateSchedules.map { it.score.weightedTotalScore }
        val neutralObservations = learningObservationsForCandidate(
            result = fixture.result,
            candidate = fixture.candidate
        )
        repeat(3) {
            fixture.orchestrator.recordPortfolioOptimizationOutcome(
                userId = userId,
                decisionId = fixture.decision.decisionId,
                observations = neutralObservations
            )
        }
        val persisted = assertNotNull(fixture.port.lastSavedState)
        val snapshot = assertNotNull(persisted.portfolioOptimizationCalibrationSnapshots.firstOrNull())
        val throughputWeight = snapshot.objectiveWeights.firstOrNull {
            it.family == com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT
        }?.weight ?: 0
        val manualSuggestion = com.lumi.coredomain.contract.PortfolioOptimizationTuningSuggestion(
            suggestionId = "suggestion_m34_apply_manual",
            decisionId = fixture.decision.decisionId,
            driftId = "drift_m34_apply_manual",
            calibrationSnapshotId = snapshot.snapshotId,
            targetFamily = com.lumi.coredomain.contract.PortfolioOptimizationTuningTargetFamily.OBJECTIVE_THROUGHPUT,
            status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING,
            currentIntValue = throughputWeight,
            proposedIntValue = (throughputWeight + 1).coerceIn(0, 10),
            intDelta = 1,
            guardrails = listOf(
                com.lumi.coredomain.contract.PortfolioOptimizationTuningGuardrail.OBJECTIVE_WEIGHT_DELTA_CAP
            ),
            summary = "Raise throughput weight by one."
        )
        var tunedClock = now + 100_000L
        val tunedOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = persisted.copy(
                    portfolioOptimizationTuningSuggestions =
                        persisted.portfolioOptimizationTuningSuggestions + manualSuggestion
                )
            ),
            nowMs = { tunedClock++ }
        )

        val applied = tunedOrchestrator.applyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = manualSuggestion.suggestionId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val tunedRequest = tunedOrchestrator.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m34_apply_tuned",
                objectivePreset = PortfolioOptimizationObjectivePreset.THROUGHPUT_FIRST,
                riskTolerance = PortfolioOptimizationRiskTolerance.HIGH,
                topN = 4,
                seed = 74L
            )
        )
        val tunedResult = tunedOrchestrator.runPortfolioOptimization(userId, tunedRequest.requestId)
        val tunedScores = tunedResult.candidateSchedules.map { it.score.weightedTotalScore }
        val initialThroughputWeight = fixture.result.objectiveProfile.weights.firstOrNull {
            it.family == com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT
        }?.weight
        val tunedThroughputWeight = tunedResult.objectiveProfile.weights.firstOrNull {
            it.family == com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT
        }?.weight

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.APPLIED,
            applied.status
        )
        assertEquals(applied.appliedSnapshotId, tunedResult.calibrationSnapshotId)
        assertTrue(tunedThroughputWeight != null && tunedThroughputWeight > (initialThroughputWeight ?: -1))
        assertTrue(initialScores != tunedScores || fixture.result.objectiveProfile.weights != tunedResult.objectiveProfile.weights)
    }

    @Test
    fun portfolioOptimization_denyingTuningIsDurableAndReadableInGovernanceAndExport() {
        val userId = "u-m34-deny"
        val now = 1_700_344_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_deny_alpha",
                    programId = "program_deny_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_deny_beta",
                    programId = "program_deny_beta",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    safeAutomationEligible = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m34_deny_gamma",
                    programId = "program_deny_gamma",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L
                )
            ),
            requestId = "request_m34_deny",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 75L
        )
        val observations = learningObservationsForCandidate(
            result = fixture.result,
            candidate = fixture.candidate,
            riskIncidentCount = 3
        )
        repeat(3) {
            fixture.orchestrator.recordPortfolioOptimizationOutcome(
                userId = userId,
                decisionId = fixture.decision.decisionId,
                observations = observations
            )
        }
        val suggestion = assertNotNull(
            fixture.orchestrator.getPortfolioOptimizationState(
                userId = userId,
                query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
            ).tuningSuggestions.firstOrNull {
                it.status == com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING
            }
        )

        val denied = fixture.orchestrator.denyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = suggestion.suggestionId,
            operatorId = "local-user",
            operatorName = "Local Operator",
            reason = "Hold current calibration pending more evidence."
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
        )
        val governanceSummary = fixture.orchestrator.getGovernanceSummary(
            userId = userId,
            query = GovernanceQuery(windowDays = 7)
        )
        val export = fixture.orchestrator.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.DENIED,
            denied.status
        )
        assertTrue(state.tuningSuggestions.none {
            it.status == com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING
        })
        assertTrue(state.tuningDecisionRecords.any { it.tuningDecisionId == denied.tuningDecisionId })
        assertTrue(governanceSummary.portfolioOptimizationSummary?.latestDriftSummary?.isNotBlank() == true)
        assertTrue(
            governanceSummary.portfolioOptimizationSummary?.latestTuningSummary
                ?.contains("Denied", ignoreCase = true) == true
        )
        assertTrue(export.contains("Latest drift:", ignoreCase = true))
        assertTrue(export.contains("Latest tuning decision: denied", ignoreCase = true))
    }

    @Test
    fun portfolioOptimization_objectiveProfileResolutionUsesScopePrecedence() {
        val userId = "tenant-m35-resolution_user"
        val tenantId = userId.substringBefore('_')
        val workspaceId = "workspace_default"

        fun snapshot(
            scope: com.lumi.coredomain.contract.PortfolioOptimizationLearningScope,
            idSuffix: String
        ): com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot {
            return com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
                snapshotId = "profile_$idSuffix",
                profileId = "objective_$idSuffix",
                version = 1,
                binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                    scope = scope,
                    userId = userId,
                    workspaceId = workspaceId,
                    tenantId = tenantId,
                    precedenceChain = listOf(
                        com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                        com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                        com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
                        com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                    ),
                    summary = "Binding for $idSuffix."
                ),
                objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                    profileId = "objective_$idSuffix",
                    summary = "Objective profile $idSuffix."
                ),
                provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningProvenanceSummary(
                    type = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileProvenanceType.SCOPE_DEFAULT,
                    sourceScope = scope,
                    summary = "Scope default $idSuffix."
                ),
                summary = "Snapshot $idSuffix."
            )
        }

        fun saveRequestWithSnapshots(
            requestId: String,
            snapshots: List<com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot>
        ): PortfolioOptimizationRequest {
            var clock = 1_700_350_100_000L
            val orchestrator = AgentOrchestrator(
                dynamicStatePersistence = RecordingPersistencePort(
                    userId = userId,
                    initialState = PersistedDynamicState(
                        portfolioOptimizationObjectiveProfileSnapshots = snapshots
                    )
                ),
                nowMs = { clock++ }
            )
            return orchestrator.savePortfolioOptimizationRequest(
                userId = userId,
                request = optimizationRequest(
                    requestId = requestId,
                    objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
                    riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
                    topN = 3,
                    seed = 351L
                )
            )
        }

        val global = snapshot(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE,
            "global"
        )
        val tenant = snapshot(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
            "tenant"
        )
        val workspace = snapshot(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
            "workspace"
        )
        val user = snapshot(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
            "user"
        )

        val userResolved = saveRequestWithSnapshots(
            requestId = "request_m35_user",
            snapshots = listOf(global, tenant, workspace, user)
        )
        val workspaceResolved = saveRequestWithSnapshots(
            requestId = "request_m35_workspace",
            snapshots = listOf(global, tenant, workspace)
        )
        val tenantResolved = saveRequestWithSnapshots(
            requestId = "request_m35_tenant",
            snapshots = listOf(global, tenant)
        )
        val globalResolved = saveRequestWithSnapshots(
            requestId = "request_m35_global",
            snapshots = listOf(global)
        )

        assertEquals(user.snapshotId, userResolved.objectiveProfileSnapshotId)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
            userResolved.objectiveProfileBinding.scope
        )
        assertEquals(workspace.snapshotId, workspaceResolved.objectiveProfileSnapshotId)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
            workspaceResolved.objectiveProfileBinding.scope
        )
        assertEquals(tenant.snapshotId, tenantResolved.objectiveProfileSnapshotId)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
            tenantResolved.objectiveProfileBinding.scope
        )
        assertEquals(global.snapshotId, globalResolved.objectiveProfileSnapshotId)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE,
            globalResolved.objectiveProfileBinding.scope
        )
    }

    @Test
    fun portfolioOptimization_propagationPreservesSourceTenantBindingToAvoidCrossTenantContamination() {
        val userId = "tenant-b_user"
        var clock = 1_700_350_200_000L
        val foreignSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_foreign_tenant",
            profileId = "objective_foreign_tenant",
            binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                userId = "tenant-a_operator",
                workspaceId = "workspace_default",
                tenantId = "tenant-a",
                precedenceChain = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                ),
                summary = "Foreign tenant binding."
            ),
            objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                profileId = "objective_foreign_tenant",
                weights = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.RISK,
                        weight = 7
                    ),
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                        weight = 2
                    )
                ),
                summary = "Foreign tenant objective profile."
            ),
            parameterCalibration = com.lumi.coredomain.contract.PortfolioOptimizationParameterCalibration(
                riskIncidentPenaltyMultiplier = 1.4,
                summary = "Foreign tenant penalty tuning."
            ),
            isolationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationLearningIsolationPolicy(
                policyId = "policy_foreign_tenant",
                mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningIsolationMode.ISOLATED_BY_DEFAULT,
                summary = "Cross-tenant contamination remains blocked."
            ),
            summary = "Foreign tenant snapshot."
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = PersistedDynamicState(
                    portfolioOptimizationObjectiveProfileSnapshots = listOf(foreignSnapshot)
                )
            ),
            nowMs = { clock++ }
        )

        val attempt = orchestrator.propagatePortfolioOptimizationObjectiveProfile(
            userId = userId,
            sourceObjectiveProfileSnapshotId = foreignSnapshot.snapshotId,
            targetScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
            attempt.status
        )
        assertEquals(
            foreignSnapshot.binding.tenantId,
            attempt.patch.targetBinding.tenantId
        )
        assertEquals(
            foreignSnapshot.binding.workspaceId,
            attempt.patch.targetBinding.workspaceId
        )
        assertTrue(attempt.isolationDecision.allowed)
        assertTrue(state.propagationAttemptRecords.any { it.attemptId == attempt.attemptId })
    }

    @Test
    fun portfolioOptimization_propagationApprovalAndAdoptionAreDurable() {
        val userId = "tenant-m35-approval_user"
        val tenantId = userId.substringBefore('_')
        val workspaceSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_workspace_source",
            profileId = "objective_workspace_source",
            binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                userId = userId,
                workspaceId = "workspace_default",
                tenantId = tenantId,
                precedenceChain = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                ),
                summary = "Workspace source binding."
            ),
            objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                profileId = "objective_workspace_source",
                weights = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.RISK,
                        weight = 7
                    ),
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                        weight = 2
                    )
                ),
                summary = "Workspace source objective profile."
            ),
            parameterCalibration = com.lumi.coredomain.contract.PortfolioOptimizationParameterCalibration(
                riskIncidentPenaltyMultiplier = 1.4,
                summary = "Workspace penalty tuning."
            ),
            summary = "Workspace source snapshot."
        )
        var clock = 1_700_350_300_000L
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = PersistedDynamicState(
                    portfolioOptimizationObjectiveProfileSnapshots = listOf(workspaceSnapshot)
                )
            ),
            nowMs = { clock++ }
        )

        val attempt = orchestrator.propagatePortfolioOptimizationObjectiveProfile(
            userId = userId,
            sourceObjectiveProfileSnapshotId = workspaceSnapshot.snapshotId,
            targetScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val adoption = orchestrator.approvePortfolioOptimizationPropagation(
            userId = userId,
            attemptId = attempt.attemptId,
            approverId = "tenant-admin",
            approverName = "Tenant Admin"
        )
        val state = orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.PENDING_APPROVAL,
            attempt.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
            adoption.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
            adoption.targetBinding.scope
        )
        assertTrue(
            state.propagationAttemptRecords.any {
                it.attemptId == attempt.attemptId &&
                    it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.ADOPTED
            }
        )
        assertTrue(
            state.propagationApprovalRecords.any {
                it.attemptId == attempt.attemptId && it.approved
            }
        )
        assertTrue(
            state.propagationAdoptionRecords.any {
                it.attemptId == attempt.attemptId &&
                    it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.ADOPTED
            }
        )
    }

    @Test
    fun portfolioOptimization_highDriftSuppressesPropagationAndMarksAdoptionForReview() {
        val userId = "tenant-m35-drift_user"
        val now = 1_700_350_400_000L
        val tenantId = userId.substringBefore('_')
        val workspaceId = "workspace_default"
        val userSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_m35_user_source",
            profileId = "objective_m35_user_source",
            binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                userId = userId,
                workspaceId = workspaceId,
                tenantId = tenantId,
                precedenceChain = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                ),
                summary = "User source binding."
            ),
            objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m35_user_source",
                weights = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.RISK,
                        weight = 7
                    ),
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                        weight = 2
                    )
                ),
                summary = "User-scoped objective profile."
            ),
            parameterCalibration = com.lumi.coredomain.contract.PortfolioOptimizationParameterCalibration(
                riskIncidentPenaltyMultiplier = 1.5,
                summary = "User penalty tuning."
            ),
            summary = "User source objective profile snapshot."
        )
        val calibrationSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "calibration_m35_user_source",
            version = 1,
            objectiveProfileSnapshotId = userSnapshot.snapshotId,
            objectiveProfileBinding = userSnapshot.binding,
            objectiveProfileProvenance = userSnapshot.provenance,
            objectiveWeights = userSnapshot.objectiveProfile.weights,
            parameterCalibration = userSnapshot.parameterCalibration,
            summary = "Calibration bound to the user source profile.",
            createdAtMs = now
        )
        val records = listOf(
            optimizationRecord(
                userId = userId,
                runId = "run_m35_drift_alpha",
                programId = "program_m35_drift_alpha",
                waveId = "wave_1",
                updatedAtMs = now + 1_000L,
                approvalPending = true
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m35_drift_beta",
                programId = "program_m35_drift_beta",
                waveId = "wave_1",
                updatedAtMs = now + 2_000L,
                safeAutomationEligible = true
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m35_drift_gamma",
                programId = "program_m35_drift_gamma",
                waveId = "wave_2",
                updatedAtMs = now + 3_000L
            )
        )
        var clock = now
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = PersistedDynamicState(
                    executionLedgerRecords = records,
                    portfolioOptimizationObjectiveProfileSnapshots = listOf(userSnapshot),
                    portfolioOptimizationCalibrationSnapshots = listOf(calibrationSnapshot)
                )
            ),
            nowMs = { clock++ }
        )
        val request = orchestrator.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = "request_m35_drift",
                objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
                riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
                topN = 3,
                seed = 352L
            )
        )
        val result = orchestrator.runPortfolioOptimization(userId, request.requestId)
        val candidate = assertNotNull(result.candidateSchedules.firstOrNull())
        val decision = orchestrator.selectPortfolioOptimizationSchedule(
            userId = userId,
            resultId = result.resultId,
            candidateId = candidate.candidateId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val attempt = orchestrator.propagatePortfolioOptimizationObjectiveProfile(
            userId = userId,
            sourceObjectiveProfileSnapshotId = userSnapshot.snapshotId,
            targetScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val observations = learningObservationsForCandidate(
            result = result,
            candidate = candidate,
            riskIncidentCount = 4
        )

        orchestrator.recordPortfolioOptimizationOutcome(
            userId = userId,
            decisionId = decision.decisionId,
            observations = observations
        )
        val state = orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
            attempt.status
        )
        assertTrue(
            state.propagationAttemptRecords.any {
                it.attemptId == attempt.attemptId &&
                    it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.SUPPRESSED &&
                    it.reviewRequired
            }
        )
        assertTrue(
            state.propagationAdoptionRecords.any {
                it.attemptId == attempt.attemptId &&
                    it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.REVIEW_REQUIRED &&
                    it.reviewRequired
            }
        )
    }

    @Test
    fun portfolioOptimization_learningSyncExportRespectsPrivacyAndParentRoleGates() = runTest {
        val userId = "u-m36-sync-policy"
        val now = 1_700_360_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_policy_alpha",
                    programId = "program_policy_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_policy_beta",
                    programId = "program_policy_beta",
                    waveId = "wave_1",
                    updatedAtMs = now + 2_000L,
                    safeAutomationEligible = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_policy_gamma",
                    programId = "program_policy_gamma",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L
                )
            ),
            requestId = "request_m36_policy",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 76L
        )
        val policyUpdate = fixture.orchestrator.updateRolePolicy(
            userId = userId,
            role = UserRole.WORK,
            draft = RolePolicyDraft(
                sharingMode = "local_only",
                allowedScopes = listOf("minimal_task_context"),
                cloudSyncAllowed = false
            )
        )
        assertTrue(policyUpdate.saved)
        fixture.orchestrator.handleRequest(
            request = request(
                userId = userId,
                rawText = "Use work role for learning sync policy coverage",
                constraints = AgentRequestConstraints(activeRole = UserRole.WORK)
            ),
            cloudGateway = null
        )

        val privacyBlockedEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.ENTERPRISE_PRIVATE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val privacyBlockedState = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )

        assertTrue(privacyBlockedEnvelope.artifacts.isEmpty())
        assertTrue(privacyBlockedEnvelope.redactionPolicy.rawContentRemoved)
        assertTrue(privacyBlockedEnvelope.redactionPolicy.rawPromptsRemoved)
        assertTrue(privacyBlockedEnvelope.issues.any {
            it.type == com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncIssueType.PRIVACY_POLICY_BLOCKED &&
                it.blocking
        })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.BLOCKED,
            privacyBlockedState.summary?.latestLearningSyncStatus
        )
        assertTrue(
            privacyBlockedState.summary?.activeSyncPrivacyPolicySummary
                ?.contains("blocks cross-device learning sync", ignoreCase = true) == true
        )

        val persisted = assertNotNull(fixture.port.lastSavedState)
        var parentClock = now + 100_000L
        val parentOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = persisted.copy(
                    activeRole = UserRole.PARENT,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            nowMs = { parentClock++ }
        )

        val parentBlockedEnvelope = parentOrchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "parent-user",
            operatorName = "Parent Operator"
        )
        val parentBlockedState = parentOrchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )

        assertTrue(parentBlockedEnvelope.artifacts.isEmpty())
        assertTrue(parentBlockedEnvelope.issues.any {
            it.type == com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncIssueType.ROLE_POLICY_BLOCKED &&
                it.blocking
        })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.BLOCKED,
            parentBlockedState.summary?.latestLearningSyncStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            parentBlockedState.summary?.activeLearningSyncMode
        )
    }

    @Test
    fun portfolioOptimization_learningSyncImportBlocksCrossTenantBoundariesByDefault() {
        val sourceUserId = "tenant-a_sync_source"
        val targetUserId = "tenant-b_sync_target"
        val now = 1_700_361_000_000L
        val sourceFixture = createLearningFixture(
            userId = sourceUserId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = sourceUserId,
                    runId = "run_m36_source_alpha",
                    programId = "program_source_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = sourceUserId,
                    runId = "run_m36_source_beta",
                    programId = "program_source_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m36_cross_tenant",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 77L
        )
        sourceFixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = sourceUserId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m36_cross_tenant_sync",
                scopeBinding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
                    userId = sourceUserId
                ),
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Learning sync consent granted for cross-tenant boundary test."
            )
        )
        val outgoingEnvelope = sourceFixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = sourceUserId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            operatorId = "sender",
            operatorName = "Sender"
        )
        assertTrue(outgoingEnvelope.artifacts.isNotEmpty())

        var targetClock = now + 100_000L
        val targetOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = targetUserId,
                initialState = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION
                )
            ),
            nowMs = { targetClock++ }
        )
        targetOrchestrator.savePortfolioOptimizationRequest(
            userId = targetUserId,
            request = optimizationRequest(
                requestId = "request_m36_target_binding",
                objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
                riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
                topN = 2,
                seed = 770L
            )
        )

        val blockedAttempt = targetOrchestrator.importPortfolioOptimizationLearningSyncEnvelope(
            userId = targetUserId,
            envelope = outgoingEnvelope.copy(
                boundary = outgoingEnvelope.boundary.copy(
                    tenantId = "tenant-a",
                    workspaceId = "workspace_source",
                    sameTenantOnly = true,
                    summary = "Tenant-private sync remains blocked across tenants."
                )
            ),
            operatorId = "receiver",
            operatorName = "Receiver"
        )
        val blockedState = targetOrchestrator.getPortfolioOptimizationState(
            userId = targetUserId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )
        val importedObjectiveSnapshotId = outgoingEnvelope.artifacts.firstOrNull {
            it.artifactType ==
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT
        }?.artifactId

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.BLOCKED,
            blockedAttempt.status
        )
        assertTrue(blockedAttempt.issues.any {
            it.type ==
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncIssueType.CROSS_TENANT_BOUNDARY_BLOCKED &&
                it.blocking
        })
        assertTrue(importedObjectiveSnapshotId != null)
        assertTrue(blockedState.objectiveProfileSnapshots.none { it.snapshotId == importedObjectiveSnapshotId })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.BLOCKED,
            blockedState.summary?.latestLearningSyncStatus
        )
        assertTrue(
            blockedState.summary?.latestLearningSyncSummary?.contains("blocked", ignoreCase = true) == true
        )
    }

    @Test
    fun portfolioOptimization_learningSyncObjectiveSnapshotConflictsRequireReviewAndStayDurable() {
        val userId = "u-m36-review"
        val now = 1_700_362_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_review_alpha",
                    programId = "program_review_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_review_beta",
                    programId = "program_review_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m36_review",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 78L
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m36_review_sync",
                scopeBinding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
                    userId = userId
                ),
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Learning sync consent granted for conflict review test."
            )
        )
        val exportedEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val persisted = assertNotNull(fixture.port.lastSavedState)
        val objectiveArtifact = assertNotNull(
            exportedEnvelope.artifacts.firstOrNull {
                it.artifactType ==
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT
            }
        )
        val localSnapshot = assertNotNull(objectiveArtifact.objectiveProfileSnapshot)
        val conflictingSnapshot = localSnapshot.copy(
            objectiveProfile = localSnapshot.objectiveProfile.copy(
                weights = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.RISK,
                        weight = 9
                    ),
                    com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                        family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                        weight = 1
                    )
                ),
                summary = "Incoming conflicting objective profile."
            ),
            summary = "Incoming conflicting objective snapshot."
        )
        var conflictClock = now + 100_000L
        val reviewOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = persisted
            ),
            nowMs = { conflictClock++ }
        )

        val reviewAttempt = reviewOrchestrator.importPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            envelope = exportedEnvelope.copy(
                envelopeId = "portfolio_sync_review_${userId.takeLast(8)}",
                artifacts = listOf(
                    objectiveArtifact.copy(
                        artifactVersion = conflictingSnapshot.version,
                        objectiveProfileSnapshot = conflictingSnapshot,
                        summary = conflictingSnapshot.summary
                    )
                ),
                issues = emptyList(),
                reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_ENQUEUED),
                createdAtMs = now + 2_000L
            ),
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val reviewState = reviewOrchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )
        val reviewConflict = assertNotNull(
            reviewState.learningSyncConflictRecords.firstOrNull {
                it.artifactId == localSnapshot.snapshotId &&
                    it.resolution ==
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.REVIEW_REQUIRED
            }
        )
        val retainedSnapshot = assertNotNull(
            reviewState.objectiveProfileSnapshots.firstOrNull { it.snapshotId == localSnapshot.snapshotId }
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.CONFLICT_REVIEW_REQUIRED,
            reviewAttempt.status
        )
        assertEquals(1, reviewAttempt.conflictCount)
        assertTrue(reviewConflict.reviewRequired)
        assertEquals(localSnapshot.objectiveProfile, retainedSnapshot.objectiveProfile)
        assertEquals(1, reviewState.summary?.pendingSyncConflictCount)
    }

    @Test
    fun portfolioOptimization_learningSyncSafeMergeAndLedgerVisibilityRemainDeterministic() {
        val userId = "u-m36-merge"
        val now = 1_700_363_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_merge_alpha",
                    programId = "program_merge_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L,
                    approvalPending = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_merge_beta",
                    programId = "program_merge_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L,
                    safeAutomationEligible = true
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m36_merge_gamma",
                    programId = "program_merge_gamma",
                    waveId = "wave_2",
                    updatedAtMs = now + 3_000L
                )
            ),
            requestId = "request_m36_merge",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 79L
        )
        fixture.orchestrator.recordPortfolioOptimizationOutcome(
            userId = userId,
            decisionId = fixture.decision.decisionId,
            observations = learningObservationsForCandidate(
                result = fixture.result,
                candidate = fixture.candidate,
                riskIncidentCount = 2
            )
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m36_merge_sync",
                scopeBinding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
                    userId = userId
                ),
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Learning sync consent granted for safe merge test."
            )
        )
        val localLearningState = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
        )
        val localDrift = assertNotNull(localLearningState.driftSummaries.firstOrNull())
        val exportedEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val persisted = assertNotNull(fixture.port.lastSavedState)
        val localAggregation = assertNotNull(
            persisted.portfolioOptimizationFederatedAggregationSummaries.firstOrNull()
        )
        val incomingDrift = localDrift.copy(
            summary = "Incoming newer drift summary.",
            createdAtMs = localDrift.createdAtMs + 1_000L
        )
        val incomingAggregation =
            com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationSummary(
                aggregationId = "aggregation_remote_m36",
                groupKey = localAggregation.groupKey,
                boundary = localAggregation.boundary,
                artifactCount = localAggregation.artifactCount + 2,
                deviceCount = localAggregation.deviceCount + 1,
                highestDriftSeverity = com.lumi.coredomain.contract.PortfolioDriftSeverity.CRITICAL,
                reasonCodes = listOf(RoleReasonCodes.ROLE_FEDERATED_AGGREGATION_APPLIED),
                summary = "Merged safely across same-tenant devices.",
                updatedAtMs = localAggregation.updatedAtMs + 1_000L
            )
        var mergeClock = now + 100_000L
        val mergeOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = persisted
            ),
            nowMs = { mergeClock++ }
        )

        val mergeAttempt = mergeOrchestrator.importPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            envelope = exportedEnvelope.copy(
                envelopeId = "portfolio_sync_merge_${userId.takeLast(8)}",
                provenance = exportedEnvelope.provenance.copy(
                    deviceId = "remote_device_m36",
                    sessionId = "remote_session_m36",
                    exportedAtMs = now + 2_000L
                ),
                artifacts = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactEnvelope(
                        envelopeArtifactId = "incoming_drift_${localDrift.driftId.takeLast(8)}",
                        artifactType =
                            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.DRIFT_SUMMARY,
                        artifactId = localDrift.driftId,
                        artifactVersion = 1,
                        driftSummary = incomingDrift,
                        summary = incomingDrift.summary
                    ),
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactEnvelope(
                        envelopeArtifactId = "incoming_agg_${localAggregation.aggregationId.takeLast(8)}",
                        artifactType =
                            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.FEDERATED_AGGREGATION_SUMMARY,
                        artifactId = incomingAggregation.aggregationId,
                        artifactVersion = incomingAggregation.artifactCount,
                        federatedAggregationSummary = incomingAggregation,
                        summary = incomingAggregation.summary
                    )
                ),
                issues = emptyList(),
                reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_ENQUEUED),
                createdAtMs = now + 2_000L
            ),
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val mergedState = mergeOrchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(decisionId = fixture.decision.decisionId, includeCompleted = true, limit = 10)
        )
        val mergedDrift = assertNotNull(
            mergedState.driftSummaries.firstOrNull { it.driftId == localDrift.driftId }
        )
        val mergedAggregation = assertNotNull(
            mergedState.federatedAggregationSummaries.firstOrNull {
                it.groupKey.groupKey == localAggregation.groupKey.groupKey
            }
        )
        val conflictResolutions = mergedState.learningSyncConflictRecords
            .filter { it.envelopeId == "portfolio_sync_merge_${userId.takeLast(8)}" }
            .map { it.resolution }
            .toSet()
        val sourceRunId = fixture.candidate.scheduledActions.firstOrNull()?.sourceRunId
            ?: assertNotNull(fixture.candidate.deferredActions.firstOrNull()).sourceRunId
        val ledgerRecord = mergeOrchestrator.getExecutionLedger(
            userId = userId,
            filter = LedgerQueryFilter(runId = sourceRunId)
        ).first()
        val governanceCase = assertNotNull(
            mergeOrchestrator.getGovernanceCases(
                userId = userId,
                filter = GovernanceConsoleFilter(
                    includeReviewed = true,
                    portfolioLearningSyncStatus =
                        com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
                    limit = 20
                )
            ).firstOrNull { it.summary.runId == sourceRunId }
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
            mergeAttempt.status
        )
        assertTrue(
            mergeAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_RESOLVED)
        )
        assertEquals(2, mergeAttempt.conflictCount)
        assertEquals("Incoming newer drift summary.", mergedDrift.summary)
        assertEquals(
            maxOf(localAggregation.artifactCount, incomingAggregation.artifactCount),
            mergedAggregation.artifactCount
        )
        assertEquals(
            maxOf(localAggregation.deviceCount, incomingAggregation.deviceCount),
            mergedAggregation.deviceCount
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioDriftSeverity.CRITICAL,
            mergedAggregation.highestDriftSeverity
        )
        assertTrue(
            conflictResolutions.contains(
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.LAST_WRITE_WINS_INCOMING
            )
        )
        assertTrue(
            conflictResolutions.contains(
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.SAFE_MERGE
            )
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
            ledgerRecord.portfolioLearningSyncStatus
        )
        assertTrue(
            ledgerRecord.portfolioLearningSyncSummary?.contains("Imported", ignoreCase = true) == true
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
            governanceCase.summary.portfolioLearningSyncStatus
        )
        assertTrue(
            governanceCase.summary.portfolioFederatedAggregationSummary
                ?.contains("device", ignoreCase = true) == true
        )
        assertTrue(
            governanceCase.summary.portfolioFederatedAggregationSummary
                ?.contains("artifact", ignoreCase = true) == true
        )
    }

    @Test
    fun portfolioOptimization_remoteTransportAndAuditExportBlockWhenConsentDenied() {
        val userId = "u-m37-consent-block"
        val now = 1_700_370_500_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_consent_alpha",
                    programId = "program_m37_consent_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_consent_beta",
                    programId = "program_m37_consent_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m37_consent",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 81L
        )
        val binding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
            scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
            userId = userId
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m37_sync_allowed",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Sync consent granted."
            )
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m37_transport_denied",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                summary = "Remote transport denied."
            )
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m37_audit_denied",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                summary = "Audit export denied."
            )
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val transportAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val exportResult = fixture.orchestrator.requestPortfolioOptimizationComplianceAuditExport(
            userId = userId,
            request = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest(
                requestId = "audit_m37_denied",
                objectiveProfileSnapshotId = fixture.result.objectiveProfileSnapshotId,
                requestedByOperatorId = "local-user",
                requestedByOperatorName = "Local Operator",
                summary = "Denied export."
            )
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.BLOCKED,
            transportAttempt.status
        )
        assertTrue(transportAttempt.issues.any {
            it.type == com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportIssueType.CONSENT_BLOCKED
        })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
            exportResult.status
        )
        assertTrue(exportResult.reasonCodes.contains(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_CONSENT))
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
            state.summary?.remoteTransportConsentDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
            state.summary?.auditExportConsentDecision
        )
    }

    @Test
    fun portfolioOptimization_remoteTransportAndAuditExportRespectParentRolePolicyGating() {
        val userId = "u-m37-parent-block"
        val now = 1_700_370_600_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_parent_alpha",
                    programId = "program_m37_parent_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_parent_beta",
                    programId = "program_m37_parent_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m37_parent",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 82L
        )
        val binding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
            scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
            userId = userId
        )
        listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
            com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT
        ).forEachIndexed { index, purpose ->
            fixture.orchestrator.recordPortfolioOptimizationConsent(
                userId = userId,
                consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                    consentId = "consent_m37_parent_$index",
                    scopeBinding = binding,
                    purpose = purpose,
                    decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                    summary = "Consent granted for ${purpose.name.lowercase()}."
                )
            )
        }
        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val parentPersistence = assertNotNull(fixture.port.lastSavedState).copy(
            activeRole = UserRole.PARENT,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION
        )
        var parentClock = now + 100_000L
        val parentOrchestrator = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = parentPersistence
            ),
            nowMs = { parentClock++ }
        )

        val transportAttempt = parentOrchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "parent-user",
            operatorName = "Parent Operator"
        )
        val exportResult = parentOrchestrator.requestPortfolioOptimizationComplianceAuditExport(
            userId = userId,
            request = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest(
                requestId = "audit_m37_parent",
                objectiveProfileSnapshotId = fixture.result.objectiveProfileSnapshotId,
                requestedByOperatorId = "parent-user",
                requestedByOperatorName = "Parent Operator",
                summary = "Parent export attempt."
            )
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.BLOCKED,
            transportAttempt.status
        )
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_ROLE_POLICY))
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
            exportResult.status
        )
        assertTrue(exportResult.reasonCodes.contains(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_POLICY))
    }

    @Test
    fun portfolioOptimization_noOpRemoteTransportRemainsLocalFirstAndDurable() {
        val userId = "u-m37-local-first"
        val now = 1_700_370_700_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_local_alpha",
                    programId = "program_m37_local_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_local_beta",
                    programId = "program_m37_local_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m37_local",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 83L
        )
        val binding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
            scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
            userId = userId
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m37_local_sync",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Sync consent granted."
            )
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m37_local_transport",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Transport consent granted."
            )
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val transportAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )
        val persisted = assertNotNull(fixture.port.lastSavedState)
        val export = fixture.orchestrator.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
            transportAttempt.status
        )
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_LOCAL_ONLY))
        assertTrue(
            persisted.portfolioOptimizationRemoteLearningTransportAttemptRecords.any {
                it.attemptId == transportAttempt.attemptId
            }
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
            state.summary?.latestRemoteTransportStatus
        )
        assertTrue(export.contains("Remote transport:", ignoreCase = true))
        assertTrue(export.contains("local only", ignoreCase = true))
    }

    @Test
    fun portfolioOptimization_productionRemoteTransportPersistsConnectorKeyAndComplianceSummary() {
        val userId = "u-m38-connector-state"
        val now = 1_700_380_000_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_connector_alpha",
                    programId = "program_m38_connector_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_connector_beta",
                    programId = "program_m38_connector_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m38_connector",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 91L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort()
        )
        recordLearningTransportConsents(
            orchestrator = fixture.orchestrator,
            userId = userId
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val transportAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteTransportConnectorType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                remoteTransportKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                remoteTransportComplianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                limit = 10
            )
        )
        val console = fixture.orchestrator.getGovernanceConsoleState(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                portfolioRemoteTransportConnectorType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                portfolioEnterpriseKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                portfolioComplianceGateDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                limit = 10
            )
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED,
            transportAttempt.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            transportAttempt.connectorBinding?.type
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            transportAttempt.enterpriseKeyReference?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            transportAttempt.complianceGateResult?.decision
        )
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_TRANSPORT_CONNECTOR_SELECTED))
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            state.summary?.latestRemoteTransportConnectorType
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            state.summary?.latestRemoteTransportKeyStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            state.summary?.latestRemoteTransportComplianceDecision
        )
        assertTrue(state.remoteTransportConnectorProfiles.any {
            it.type ==
                com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK
        })
        assertTrue(state.enterpriseKeyReferences.any {
            it.status == com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY
        })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            console.portfolioOptimizationState?.summary?.latestRemoteTransportConnectorType
        )
    }

    @Test
    fun portfolioOptimization_productionRemoteTransportDedupesDuplicateBatches() {
        val userId = "u-m38-dedupe"
        val now = 1_700_380_100_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_dedupe_alpha",
                    programId = "program_m38_dedupe_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_dedupe_beta",
                    programId = "program_m38_dedupe_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m38_dedupe",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 92L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort()
        )
        recordLearningTransportConsents(
            orchestrator = fixture.orchestrator,
            userId = userId
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val firstAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val secondAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteTransportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEDUPED,
                limit = 10
            )
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED,
            firstAttempt.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEDUPED,
            secondAttempt.status
        )
        assertEquals(true, secondAttempt.deliveryResult?.deduplicated)
        assertEquals(firstAttempt.ackRecord?.remoteRef, secondAttempt.ackRecord?.remoteRef)
        assertTrue(secondAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_TRANSPORT_DELIVERY_DEDUPED))
        assertTrue(
            state.remoteLearningTransportAttemptRecords.any {
                it.attemptId == secondAttempt.attemptId &&
                    it.status ==
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEDUPED
            }
        )
    }

    @Test
    fun portfolioOptimization_remoteTransportFallsBackLocallyWhenEnterpriseKeyIsRevoked() {
        val userId = "u-m38-local-fallback"
        val now = 1_700_380_200_000L
        val connectorProfile =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_m38_revoked",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                displayName = "Revoked-key connector",
                healthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    localFallbackAllowed = true,
                    deadLetterAfterMaxAttempts = true,
                    summary = "Fallback to local-first when key state is unsafe."
                ),
                summary = "Connector is healthy but key state blocks delivery."
            )
        val keyReference = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyReference(
            keyRefId = "portfolio_remote_key_m38_revoked",
            connectorProfileId = connectorProfile.profileId,
            providerName = "enterprise-vault",
            status = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.REVOKED,
            usagePolicy = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyUsagePolicy(
                remoteTransportAllowed = true,
                auditExportAllowed = true,
                purposeLimited = true,
                summary = "Enterprise key is purpose-limited but revoked."
            ),
            summary = "Enterprise key was revoked and cannot be used remotely."
        )
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_fallback_alpha",
                    programId = "program_m38_fallback_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_fallback_beta",
                    programId = "program_m38_fallback_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m38_fallback",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 93L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort(
                connectorProfile = connectorProfile,
                enterpriseKeyReference = keyReference
            )
        )
        recordLearningTransportConsents(
            orchestrator = fixture.orchestrator,
            userId = userId
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val transportAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteTransportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
                remoteTransportKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.REVOKED,
                remoteTransportComplianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.LOCAL_FALLBACK,
                limit = 10
            )
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
            transportAttempt.status
        )
        assertEquals(true, transportAttempt.deliveryResult?.localFallbackUsed)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason.KEY_REVOKED,
            transportAttempt.deliveryResult?.failureReason
        )
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_ENTERPRISE_KEY_REVOKED))
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_TRANSPORT_LOCAL_FALLBACK_USED))
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.REVOKED,
            state.summary?.latestRemoteTransportKeyStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.LOCAL_FALLBACK,
            state.summary?.latestRemoteTransportComplianceDecision
        )
        assertEquals(0, state.summary?.remoteTransportDeadLetterCount)
    }

    @Test
    fun portfolioOptimization_remoteTransportExhaustsRetriesAndDeadLettersDurably() {
        val userId = "u-m38-dead-letter"
        val now = 1_700_380_300_000L
        val connectorProfile =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_m38_dead_letter",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                displayName = "Retrying connector",
                healthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    localFallbackAllowed = false,
                    deadLetterAfterMaxAttempts = true,
                    summary = "Retry once, then dead-letter."
                ),
                summary = "Connector retries once before dead-lettering."
            )
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_dead_letter_alpha",
                    programId = "program_m38_dead_letter_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m38_dead_letter_beta",
                    programId = "program_m38_dead_letter_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m38_dead_letter",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 94L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort(
                connectorProfile = connectorProfile,
                deliveryFailureReason =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT
            )
        )
        recordLearningTransportConsents(
            orchestrator = fixture.orchestrator,
            userId = userId
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val firstAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val secondAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteTransportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
                limit = 10
            )
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.RETRY_SCHEDULED,
            firstAttempt.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
            secondAttempt.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT,
            secondAttempt.deliveryResult?.failureReason
        )
        assertTrue(secondAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_TRANSPORT_DELIVERY_DEAD_LETTERED))
        assertTrue(secondAttempt.deadLetterRecordId?.isNotBlank() == true)
        assertEquals(1, state.summary?.remoteTransportDeadLetterCount)
        assertTrue(
            state.remoteTransportDeadLetterRecords.any {
                it.deadLetterId == secondAttempt.deadLetterRecordId &&
                    it.failureReason ==
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT
            }
        )
    }

    @Test
    fun portfolioOptimization_complianceAuditExportIsRedactionFirstAndReadable() {
        val userId = "u-m37-audit"
        val now = 1_700_370_800_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_audit_alpha",
                    programId = "program_m37_audit_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m37_audit_beta",
                    programId = "program_m37_audit_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m37_audit",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 84L
        )
        val binding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
            scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
            userId = userId
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_m37_audit",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Audit export consent granted."
            )
        )

        val exportResult = fixture.orchestrator.requestPortfolioOptimizationComplianceAuditExport(
            userId = userId,
            request = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest(
                requestId = "audit_m37_complete",
                decisionId = fixture.decision.decisionId,
                resultId = fixture.result.resultId,
                objectiveProfileSnapshotId = fixture.result.objectiveProfileSnapshotId,
                requestedByOperatorId = "local-user",
                requestedByOperatorName = "Local Operator",
                summary = "Generate compliant export."
            )
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(includeCompleted = true, limit = 10)
        )
        val bundle = assertNotNull(exportResult.bundle)
        val export = fixture.orchestrator.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            exportResult.status
        )
        assertTrue(bundle.redactionPolicy.rawContentExcluded)
        assertTrue(bundle.redactionPolicy.rawPromptsExcluded)
        assertTrue(bundle.hashSummary.bundleHash.isNotBlank())
        assertTrue(bundle.artifactRefs.isNotEmpty())
        assertTrue(bundle.consentRecords.isNotEmpty())
        assertTrue(bundle.receiptItems.none { it.summary.contains("Optimization request", ignoreCase = true) })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            state.summary?.latestComplianceAuditExportStatus
        )
        assertTrue(export.contains("Compliance audit export:", ignoreCase = true))
        assertTrue(export.contains("Enterprise privacy:", ignoreCase = true))
    }

    @Test
    fun portfolioOptimization_remoteTransportReroutesToLocalFallbackWhenResidencyMismatches() {
        val userId = "euTenant_user_m39_transport"
        val now = 1_700_390_100_000L
        val connectorProfile =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_m39_transport",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                displayName = "US learning connector",
                endpointRef = "https://us.example/learning",
                healthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    localFallbackAllowed = true,
                    deadLetterAfterMaxAttempts = true,
                    summary = "Fallback to local-first when destination routing cannot satisfy policy."
                ),
                summary = "US learning connector is healthy but outside the tenant residency boundary."
            )
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m39_transport_alpha",
                    programId = "program_m39_transport_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m39_transport_beta",
                    programId = "program_m39_transport_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m39_transport",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 95L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort(
                connectorProfile = connectorProfile
            )
        )
        recordLearningTransportConsents(
            orchestrator = fixture.orchestrator,
            userId = userId
        )

        val syncEnvelope = fixture.orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val transportAttempt = fixture.orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = syncEnvelope.envelopeId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteDestinationStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.REROUTED,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                limit = 10
            )
        )
        val export = fixture.orchestrator.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.REROUTED,
            transportAttempt.destinationDecision?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.REROUTED,
            transportAttempt.bundleDecision?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.LOCAL_ONLY,
            transportAttempt.dataExchangeManifest?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_DEVICE,
            transportAttempt.destinationDecision?.selectedDestinationType
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
            transportAttempt.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.LOCAL_FALLBACK,
            transportAttempt.complianceGateResult?.decision
        )
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_DESTINATION_REROUTED))
        assertTrue(transportAttempt.reasonCodes.contains(RoleReasonCodes.ROLE_REMOTE_TRANSPORT_LOCAL_FALLBACK_USED))
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.REROUTED,
            state.summary?.latestRemoteDestinationStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.REROUTED,
            state.summary?.latestDataExchangeDecisionStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
            state.summary?.latestResidencyRegion
        )
        assertTrue(state.summary?.latestRemoteDestinationSummary?.contains("rerouted", ignoreCase = true) == true)
        assertTrue(state.summary?.latestDataExchangeBundleSummary?.contains("artifact", ignoreCase = true) == true)
        assertTrue(export.contains("Remote destination:", ignoreCase = true))
        assertTrue(export.contains("Residency routing:", ignoreCase = true))
        assertTrue(export.contains("Exchange bundle:", ignoreCase = true))
    }

    @Test
    fun portfolioOptimization_complianceAuditExportHoldsRemoteRouteWhenJurisdictionReviewIsRequired() {
        val userId = "euTenant_user_m39_audit"
        val now = 1_700_390_200_000L
        val connectorProfile =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_m39_audit",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                displayName = "US compliance archive",
                endpointRef = "https://us.example/compliance",
                healthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    localFallbackAllowed = false,
                    deadLetterAfterMaxAttempts = true,
                    summary = "Compliance exports require an explicitly approved destination."
                ),
                summary = "US compliance archive is healthy but outside the tenant jurisdiction boundary."
            )
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m39_audit_alpha",
                    programId = "program_m39_audit_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m39_audit_beta",
                    programId = "program_m39_audit_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m39_audit",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 96L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort(
                connectorProfile = connectorProfile
            )
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_${userId}_audit_export",
                scopeBinding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
                    userId = userId
                ),
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Audit export consent granted."
            )
        )

        val exportResult = fixture.orchestrator.requestPortfolioOptimizationComplianceAuditExport(
            userId = userId,
            request = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest(
                requestId = "audit_m39_held",
                decisionId = fixture.decision.decisionId,
                resultId = fixture.result.resultId,
                objectiveProfileSnapshotId = fixture.result.objectiveProfileSnapshotId,
                preferredDestinationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                requestedByOperatorId = "compliance-admin",
                requestedByOperatorName = "Compliance Admin",
                summary = "Route audit export to approved archive."
            )
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteDestinationStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                limit = 10
            )
        )
        val export = fixture.orchestrator.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
            exportResult.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            exportResult.destinationDecision?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.HELD,
            exportResult.bundleDecision?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.HELD,
            exportResult.dataExchangeManifest?.status
        )
        assertNotNull(exportResult.crossBoundaryApprovalRecordId)
        assertTrue(exportResult.crossBoundaryAuditRecordIds.isNotEmpty())
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceExportRouteStatus.HELD,
            exportResult.exportRoute?.status
        )
        assertTrue(exportResult.reasonCodes.contains(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_ROUTE_HELD))
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            state.summary?.latestRemoteDestinationStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.HELD,
            state.summary?.latestDataExchangeDecisionStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.PENDING_REVIEW,
            state.summary?.latestDataExchangeApprovalStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.REVIEW_REQUIRED,
            state.summary?.latestCrossBoundaryAuditResult
        )
        assertTrue(state.summary?.latestComplianceExportRouteSummary?.contains("held", ignoreCase = true) == true)
        assertTrue(export.contains("Compliance export route:", ignoreCase = true))
        assertTrue(export.contains("held", ignoreCase = true))
        assertTrue(export.contains("Exchange bundle:", ignoreCase = true))
        assertTrue(export.contains("Cross-boundary audit:", ignoreCase = true))
    }

    @Test
    fun portfolioOptimization_complianceAuditExportSplitsBundleWhenReceiptAndGovernanceArtifactsMustStayLocal() {
        val userId = "euTenant_user_m40_split"
        val now = 1_700_400_100_000L
        val connectorProfile =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_m40_split",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                displayName = "EU compliance archive",
                endpointRef = "https://eu.example/compliance",
                healthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    localFallbackAllowed = false,
                    deadLetterAfterMaxAttempts = true,
                    summary = "Compliance archive remains remote only when bundle policy passes."
                ),
                summary = "EU compliance archive satisfies same-tenant residency and jurisdiction policy."
            )
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m40_split_alpha",
                    programId = "program_m40_split_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m40_split_beta",
                    programId = "program_m40_split_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m40_split",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 97L,
            remoteLearningTransportPort = ProductionRemoteLearningTransportPort(
                connectorProfile = connectorProfile
            )
        )
        fixture.orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_${userId}_audit_export",
                scopeBinding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
                    userId = userId
                ),
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Audit export consent granted."
            )
        )

        val exportResult = fixture.orchestrator.requestPortfolioOptimizationComplianceAuditExport(
            userId = userId,
            request = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest(
                requestId = "audit_m40_split",
                decisionId = fixture.decision.decisionId,
                resultId = fixture.result.resultId,
                objectiveProfileSnapshotId = fixture.result.objectiveProfileSnapshotId,
                preferredDestinationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                requestedByOperatorId = "compliance-admin",
                requestedByOperatorName = "Compliance Admin",
                summary = "Route audit export to EU archive with local-only split for protected traces."
            )
        )
        val state = fixture.orchestrator.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                dataExchangeDecisionStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                dataExchangeBundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                limit = 10
            )
        )
        val export = fixture.orchestrator.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            exportResult.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            exportResult.bundleDecision?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.SPLIT,
            exportResult.dataExchangeManifest?.status
        )
        assertTrue(exportResult.reasonCodes.contains(RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT))
        assertTrue(exportResult.crossBoundaryAuditRecordIds.isNotEmpty())
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            state.summary?.latestDataExchangeDecisionStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            state.summary?.latestDataExchangeApprovalStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            state.summary?.latestCrossBoundaryAuditOperationType
        )
        assertTrue(state.summary?.latestDataExchangeApprovalSummary?.contains("auto-approved", ignoreCase = true) == true)
        assertTrue(state.summary?.latestCrossBoundaryAuditSummary?.contains("split", ignoreCase = true) == true)
        assertTrue(export.contains("Exchange bundle:", ignoreCase = true))
        assertTrue(export.contains("Exchange approval:", ignoreCase = true))
        assertTrue(export.contains("Cross-boundary audit:", ignoreCase = true))
    }

    @Test
    fun portfolioOptimization_crossBoundaryGovernancePortfolioPrioritizesHighTrustAndSurfacesSharedBlockers() {
        val userId = "euTenant_user_m42_portfolio"
        val now = 1_700_420_100_000L
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = listOf(
                optimizationRecord(
                    userId = userId,
                    runId = "run_m42_alpha",
                    programId = "program_m42_alpha",
                    waveId = "wave_1",
                    updatedAtMs = now + 1_000L
                ),
                optimizationRecord(
                    userId = userId,
                    runId = "run_m42_beta",
                    programId = "program_m42_beta",
                    waveId = "wave_2",
                    updatedAtMs = now + 2_000L
                )
            ),
            requestId = "request_m42_portfolio",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 98L
        )
        val baseState = assertNotNull(fixture.port.lastSavedState)
        val artifact =
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactRef(
                artifactClass =
                    com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT,
                artifactId = "artifact_m42_portfolio",
                artifactHash = "hash_m42_portfolio",
                artifactType =
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
                redacted = true,
                summary = "Redacted objective profile artifact for M42 governance."
            )
        val boundaryEu =
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeBoundarySummary(
                boundaryId = "boundary_m42_eu",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                consentAllowed = true,
                rolePolicyAllowed = true,
                privacyPolicyAllowed = true,
                destinationPolicyAllowed = true,
                connectorHealthy = true,
                keyHealthy = true,
                complianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                summary = "EU GDPR boundary is clear for audit exchange."
            )
        val boundaryUs =
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeBoundarySummary(
                boundaryId = "boundary_m42_us",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.US,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                consentAllowed = true,
                rolePolicyAllowed = true,
                privacyPolicyAllowed = true,
                destinationPolicyAllowed = true,
                connectorHealthy = true,
                keyHealthy = true,
                complianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                summary = "US privacy boundary still needs explicit review."
            )
        val destinationLocal =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_local_m42",
                type =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE,
                displayName = "Local compliance archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "Local compliance archive is the highest-trust destination.",
                updatedAtMs = now + 10L
            )
        val destinationEu =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_remote_eu_m42",
                type =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                displayName = "EU compliance archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationPolicy(
                    sameTenantOnly = true
                ),
                summary = "EU compliance archive remains same-tenant and policy-safe.",
                updatedAtMs = now + 11L
            )
        val destinationUs =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_remote_us_m42",
                type =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                displayName = "US compliance archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.US,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationPolicy(
                    sameTenantOnly = true
                ),
                summary = "US compliance archive is policy-safe but needs review before rollout.",
                updatedAtMs = now + 12L
            )
        val destinationDecisions = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
                decisionId = "destination_decision_m42_local",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                sourceId = "audit_request_m42_local",
                status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.ROUTED,
                preferredDestinationId = destinationLocal.destinationId,
                selectedDestinationId = destinationLocal.destinationId,
                selectedDestinationType = destinationLocal.type,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "Local archive routed directly for highest-trust handling.",
                createdAtMs = now + 20L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
                decisionId = "destination_decision_m42_eu",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                sourceId = "audit_request_m42_eu",
                status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.ROUTED,
                preferredDestinationId = destinationEu.destinationId,
                selectedDestinationId = destinationEu.destinationId,
                selectedDestinationType = destinationEu.type,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "EU archive routed but still waiting on approval review.",
                createdAtMs = now + 21L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
                decisionId = "destination_decision_m42_us",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                sourceId = "audit_request_m42_us",
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                preferredDestinationId = destinationUs.destinationId,
                selectedDestinationId = destinationUs.destinationId,
                selectedDestinationType = destinationUs.type,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.US,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                blockReason =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationBlockReason.REVIEW_REQUIRED,
                summary = "US archive is held for compliance review before rollout.",
                createdAtMs = now + 22L
            )
        )
        val bundleLocal =
            com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
                bundleId = "bundle_m42_local",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                sourceId = "audit_request_m42_local",
                destinationIds = listOf(destinationLocal.destinationId),
                destinationTypes = listOf(destinationLocal.type),
                artifacts = listOf(artifact),
                artifactClasses = listOf(artifact.artifactClass),
                summary = "Local bundle advances immediately.",
                createdAtMs = now + 30L
            )
        val bundleEu =
            com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
                bundleId = "bundle_m42_eu",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                sourceId = "audit_request_m42_eu",
                destinationIds = listOf(destinationEu.destinationId),
                destinationTypes = listOf(destinationEu.type),
                artifacts = listOf(artifact),
                artifactClasses = listOf(artifact.artifactClass),
                summary = "EU remote bundle is staged for approval.",
                createdAtMs = now + 31L
            )
        val bundleUs =
            com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
                bundleId = "bundle_m42_us",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                sourceId = "audit_request_m42_us",
                destinationIds = listOf(destinationUs.destinationId),
                destinationTypes = listOf(destinationUs.type),
                artifacts = listOf(artifact),
                artifactClasses = listOf(artifact.artifactClass),
                summary = "US remote bundle remains held for approval and compliance review.",
                createdAtMs = now + 32L
            )
        val bundleDecisions = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m42_local",
                bundleId = bundleLocal.bundleId,
                purpose = bundleLocal.purpose,
                bundleType = bundleLocal.bundleType,
                sourceId = bundleLocal.sourceId,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                    policyId = "bundle_policy_m42_local",
                    bundleType = bundleLocal.bundleType,
                    summary = "Local archive policy is safe to advance."
                ),
                boundarySummary = boundaryEu,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.ALLOWED,
                primaryDestinationId = destinationLocal.destinationId,
                primaryDestinationType = destinationLocal.type,
                summary = "Local high-trust bundle is ready to advance.",
                createdAtMs = now + 40L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m42_eu",
                bundleId = bundleEu.bundleId,
                purpose = bundleEu.purpose,
                bundleType = bundleEu.bundleType,
                sourceId = bundleEu.sourceId,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                    policyId = "bundle_policy_m42_eu",
                    bundleType = bundleEu.bundleType,
                    summary = "EU archive policy is safe once approval review clears."
                ),
                boundarySummary = boundaryEu,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.ALLOWED,
                primaryDestinationId = destinationEu.destinationId,
                primaryDestinationType = destinationEu.type,
                summary = "EU trusted bundle is queued behind approval review.",
                createdAtMs = now + 41L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m42_us",
                bundleId = bundleUs.bundleId,
                purpose = bundleUs.purpose,
                bundleType = bundleUs.bundleType,
                sourceId = bundleUs.sourceId,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                    policyId = "bundle_policy_m42_us",
                    bundleType = bundleUs.bundleType,
                    summary = "US archive policy requires explicit review before rollout."
                ),
                boundarySummary = boundaryUs,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.HELD,
                primaryDestinationId = destinationUs.destinationId,
                primaryDestinationType = destinationUs.type,
                approvalRequired = true,
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_JURISDICTION_ROLLOUT_RESEQUENCED
                ),
                summary = "US limited-trust bundle is held for review.",
                createdAtMs = now + 42L
            )
        )
        val manifests = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
                manifestId = "manifest_m42_local",
                bundleId = bundleLocal.bundleId,
                bundleDecisionId = "bundle_decision_m42_local",
                purpose = bundleLocal.purpose,
                bundleType = bundleLocal.bundleType,
                status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.ROUTED,
                destinationIds = bundleLocal.destinationIds,
                destinationTypes = bundleLocal.destinationTypes,
                artifactRefs = bundleLocal.artifacts,
                boundarySummary = boundaryEu,
                summary = "Local manifest routed immediately.",
                createdAtMs = now + 50L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
                manifestId = "manifest_m42_eu",
                bundleId = bundleEu.bundleId,
                bundleDecisionId = "bundle_decision_m42_eu",
                purpose = bundleEu.purpose,
                bundleType = bundleEu.bundleType,
                status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.ROUTED,
                destinationIds = bundleEu.destinationIds,
                destinationTypes = bundleEu.destinationTypes,
                artifactRefs = bundleEu.artifacts,
                boundarySummary = boundaryEu,
                summary = "EU manifest routed pending approval clearance.",
                createdAtMs = now + 51L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
                manifestId = "manifest_m42_us",
                bundleId = bundleUs.bundleId,
                bundleDecisionId = "bundle_decision_m42_us",
                purpose = bundleUs.purpose,
                bundleType = bundleUs.bundleType,
                status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.HELD,
                destinationIds = bundleUs.destinationIds,
                destinationTypes = bundleUs.destinationTypes,
                artifactRefs = bundleUs.artifacts,
                boundarySummary = boundaryUs,
                holdReason =
                    com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeHoldReason.JURISDICTION_REVIEW_REQUIRED,
                summary = "US manifest is held for jurisdiction review.",
                createdAtMs = now + 52L
            )
        )
        val approvals = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
                approvalId = "approval_m42_local",
                bundleDecisionId = "bundle_decision_m42_local",
                manifestId = "manifest_m42_local",
                sourceId = bundleLocal.sourceId,
                required = false,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
                summary = "Local bundle auto-approved.",
                recordedAtMs = now + 60L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
                approvalId = "approval_m42_eu",
                bundleDecisionId = "bundle_decision_m42_eu",
                manifestId = "manifest_m42_eu",
                sourceId = bundleEu.sourceId,
                required = true,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.PENDING_REVIEW,
                summary = "EU trusted bundle is waiting on approval review.",
                recordedAtMs = now + 61L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
                approvalId = "approval_m42_us",
                bundleDecisionId = "bundle_decision_m42_us",
                manifestId = "manifest_m42_us",
                sourceId = bundleUs.sourceId,
                required = true,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.PENDING_REVIEW,
                summary = "US limited-trust bundle is waiting on approval review.",
                recordedAtMs = now + 62L
            )
        )
        val audits = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
                auditId = "audit_m42_local",
                bundleDecisionId = "bundle_decision_m42_local",
                manifestId = "manifest_m42_local",
                purpose = bundleLocal.purpose,
                bundleType = bundleLocal.bundleType,
                operationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BOUNDARY_CHECK_PASSED,
                result = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.PASSED,
                summary = "Local boundary check passed.",
                recordedAtMs = now + 70L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
                auditId = "audit_m42_eu",
                bundleDecisionId = "bundle_decision_m42_eu",
                manifestId = "manifest_m42_eu",
                purpose = bundleEu.purpose,
                bundleType = bundleEu.bundleType,
                operationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BOUNDARY_CHECK_PASSED,
                result = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
                summary = "EU boundary check recorded for approved rollout.",
                recordedAtMs = now + 71L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
                auditId = "audit_m42_us",
                bundleDecisionId = "bundle_decision_m42_us",
                manifestId = "manifest_m42_us",
                purpose = bundleUs.purpose,
                bundleType = bundleUs.bundleType,
                operationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                result =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.REVIEW_REQUIRED,
                summary = "US boundary audit requires review before rollout.",
                recordedAtMs = now + 72L
            )
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = RecordingPersistencePort(
                userId = userId,
                initialState = baseState.copy(
                    portfolioOptimizationRemoteDestinationProfiles =
                        listOf(destinationLocal, destinationEu, destinationUs),
                    portfolioOptimizationRemoteDestinationDecisionRecords = destinationDecisions,
                    portfolioOptimizationDataExchangeBundles = listOf(bundleLocal, bundleEu, bundleUs),
                    portfolioOptimizationDataExchangeBundleDecisionRecords = bundleDecisions,
                    portfolioOptimizationDataExchangeManifests = manifests,
                    portfolioOptimizationCrossBoundaryApprovalRecords = approvals,
                    portfolioOptimizationCrossBoundaryAuditRecords = audits
                )
            ),
            nowMs = { now + 500L }
        )

        val state = reader.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                includeCompleted = true,
                governancePortfolioStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                limit = 20
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = GovernanceConsoleFilter(
                includeReviewed = true,
                portfolioGovernancePortfolioStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                limit = 20
            )
        )
        val export = reader.exportPortfolioOptimizationSummary(userId, fixture.result.resultId)

        assertTrue(
            state.destinationTrustTierAssignments.any {
                it.destinationId == destinationLocal.destinationId &&
                    it.trustTier ==
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.HIGH_TRUST
            }
        )
        assertTrue(
            state.crossBoundaryProgramRecords.any {
                it.destinationTrustTier ==
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.HIGH_TRUST &&
                    it.programStatus ==
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramStatus.ACTIVE
            }
        )
        assertTrue(
            state.crossBoundaryProgramRecords.any {
                it.destinationTrustTier ==
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.TRUSTED &&
                    it.programStatus ==
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramStatus.REVIEW_REQUIRED
            }
        )
        assertTrue(
            state.crossBoundaryProgramRecords.any {
                it.destinationTrustTier ==
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED &&
                    it.programStatus ==
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramStatus.REVIEW_REQUIRED
            }
        )
        assertTrue(
            state.portfolioBlockerSummaries.any {
                it.type == com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerType.APPROVAL &&
                    it.programIds.size == 2
            }
        )
        assertTrue(
            state.portfolioConflictSummaries.any {
                it.type ==
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioConflictType.APPROVAL_CONTENTION
            }
        )
        assertTrue(state.portfolioDependencySummaries.isNotEmpty())
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriority.CRITICAL,
            state.summary?.latestPortfolioPriority
        )
        assertTrue(
            state.summary?.latestPortfolioRecommendationAction in setOf(
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.HOLD_TRUST_TIER,
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.DEFER_PROGRAM
            )
        )
        assertEquals(1, state.summary?.sharedPortfolioBlockerCount)
        assertTrue((state.summary?.portfolioConflictCount ?: 0) >= 2)
        assertTrue(
            state.portfolioPriorityDecisions.first().winningProgramId?.contains("high_trust_eu_gdpr") == true
        )
        assertTrue(
            state.portfolioCoordinationRecommendations.first().action in setOf(
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.HOLD_TRUST_TIER,
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.DEFER_PROGRAM
            )
        )
        assertTrue(
            state.trustTierProgramSummaries.any {
                it.trustTier ==
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED &&
                    it.rolloutState ==
                    com.lumi.coredomain.contract.PortfolioOptimizationTrustTierRolloutState.HELD
            }
        )
        assertTrue(
            state.jurisdictionRolloutPlans.any {
                it.jurisdiction ==
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY &&
                    it.rolloutState ==
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutState.BLOCKED
            }
        )
        assertTrue(
            console.portfolioOptimizationState?.summary?.latestPortfolioRecommendationAction in setOf(
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.HOLD_TRUST_TIER,
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.DEFER_PROGRAM
            )
        )
        assertTrue(export.contains("Governance portfolio:", ignoreCase = true))
        assertTrue(export.contains("Trust tier rollout:", ignoreCase = true))
        assertTrue(export.contains("Jurisdiction rollout:", ignoreCase = true))
        assertTrue(export.contains("Shared blockers:", ignoreCase = true))
        assertTrue(export.contains("Dependencies:", ignoreCase = true))
        assertTrue(export.contains("Coordination conflicts:", ignoreCase = true))
        assertTrue(export.contains("Next action:", ignoreCase = true))
        assertTrue(state.crossBoundaryPortfolioAnalyticsSummaries.isNotEmpty())
        assertTrue(state.portfolioRiskBudgets.isNotEmpty())
        assertTrue(state.trustTierDriftSummaries.isNotEmpty())
        assertTrue(state.jurisdictionDriftSummaries.isNotEmpty())
        assertTrue(state.destinationRiskConcentrationSummaries.isNotEmpty())
        assertTrue(state.portfolioBlockerTrendSummaries.isNotEmpty())
        assertTrue(state.portfolioRiskRecommendations.isNotEmpty())
        assertNotNull(state.summary?.activePortfolioHealthStatus)
        assertNotNull(state.summary?.activePortfolioTrajectoryState)
        assertNotNull(state.summary?.activeRiskBudgetStatus)
        assertNotNull(state.summary?.latestTrustTierDriftState)
        assertNotNull(state.summary?.latestJurisdictionDriftState)
        assertNotNull(state.summary?.latestPortfolioRiskRecommendationAction)
        assertTrue(state.summary?.latestPortfolioAnalyticsSummary?.isNotBlank() == true)
        assertTrue(state.summary?.latestRiskBudgetSummary?.isNotBlank() == true)
        assertTrue(state.summary?.activePortfolioSafetyState != null)
        assertTrue(state.summary?.activeBudgetGuardrailState != null)
        assertTrue(state.summary?.activePortfolioEnforcementMode != null)
        assertTrue(state.summary?.activeRemediationAutomationState != null)
        assertTrue(state.portfolioSafetyRails.isNotEmpty())
        assertTrue(state.portfolioBudgetGuardrails.isNotEmpty())
        assertTrue(state.portfolioSafetySummaries.isNotEmpty())
        assertTrue(state.portfolioRemediationAutomationControls.isNotEmpty())
        assertTrue(state.summary?.latestPortfolioSafetySummary?.isNotBlank() == true)
        assertTrue(state.summary?.latestBudgetGuardrailSummary?.isNotBlank() == true)
        assertTrue(state.summary?.latestRemediationAutomationSummary?.isNotBlank() == true)
        assertTrue(state.summary?.latestDestinationRiskConcentrationSummary?.isNotBlank() == true)
        assertTrue(state.summary?.latestPortfolioBlockerTrendSummary?.isNotBlank() == true)
        assertTrue(state.summary?.latestPortfolioRiskRecommendationSummary?.isNotBlank() == true)
        assertTrue(
            console.portfolioOptimizationState?.summary?.activeRiskBudgetStatus != null
        )
        assertTrue(export.contains("Portfolio analytics:", ignoreCase = true))
        assertTrue(export.contains("Trust-tier drift:", ignoreCase = true))
        assertTrue(export.contains("Jurisdiction drift:", ignoreCase = true))
        assertTrue(export.contains("Risk budget:", ignoreCase = true))
        assertTrue(export.contains("Portfolio safety:", ignoreCase = true))
        assertTrue(export.contains("Budget guardrail:", ignoreCase = true))
        assertTrue(export.contains("Remediation control:", ignoreCase = true))
        assertTrue(export.contains("Destination concentration:", ignoreCase = true))
        assertTrue(export.contains("Blocker trend:", ignoreCase = true))
        assertTrue(export.contains("Risk recommendation:", ignoreCase = true))
    }

    @Test
    fun recordPortfolioOptimizationCorrectiveAction_updatesRiskBudgetAndPersistsM43State() {
        val userId = "local-user"
        val now = 1_700_430_100_000L
        val records = listOf(
            optimizationRecord(
                userId = userId,
                runId = "run_m43_local",
                programId = "high_trust_eu_gdpr",
                trustTier = com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                connectorStatus = "healthy",
                credentialState =
                    com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.HEALTHY,
                approvalPending = false,
                capacityBlocked = false,
                policyBlocked = false,
                updatedAtMs = now
            ),
            optimizationRecord(
                userId = userId,
                runId = "run_m43_us",
                programId = "limited_us_privacy",
                trustTier = com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                connectorStatus = "degraded",
                credentialState =
                    com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.ROTATION_REQUIRED,
                approvalPending = true,
                capacityBlocked = true,
                policyBlocked = false,
                updatedAtMs = now + 1L
            )
        )
        val fixture = createLearningFixture(
            userId = userId,
            now = now,
            records = records,
            requestId = "request_m43_corrective",
            objectivePreset = PortfolioOptimizationObjectivePreset.BALANCED,
            riskTolerance = PortfolioOptimizationRiskTolerance.MODERATE,
            topN = 3,
            seed = 43L
        )
        val baseState = assertNotNull(fixture.port.lastSavedState)
        val artifact =
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactRef(
                artifactClass =
                    com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT,
                artifactId = "artifact_m43_corrective",
                artifactHash = "hash_m43_corrective",
                artifactType =
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
                redacted = true,
                summary = "Redacted learning artifact for M43 corrective rollout."
            )
        val boundaryEu =
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeBoundarySummary(
                boundaryId = "boundary_m43_eu",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                consentAllowed = true,
                rolePolicyAllowed = true,
                privacyPolicyAllowed = true,
                destinationPolicyAllowed = true,
                connectorHealthy = true,
                keyHealthy = true,
                complianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                summary = "EU boundary is clear for high-trust rollout."
            )
        val boundaryUs =
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeBoundarySummary(
                boundaryId = "boundary_m43_us",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.US,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                consentAllowed = true,
                rolePolicyAllowed = true,
                privacyPolicyAllowed = true,
                destinationPolicyAllowed = true,
                connectorHealthy = false,
                keyHealthy = true,
                complianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.BLOCKED,
                summary = "US limited-trust rollout is still review-gated."
            )
        val destinationLocal =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_m43_local",
                type =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE,
                displayName = "Local archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "Local archive remains the high-trust path.",
                updatedAtMs = now + 10L
            )
        val destinationUs =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_m43_us",
                type =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                displayName = "US archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.US,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationPolicy(
                    sameTenantOnly = true
                ),
                summary = "US archive remains limited-trust and review gated.",
                updatedAtMs = now + 11L
            )
        val destinationDecisions = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
                decisionId = "destination_decision_m43_local",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                sourceId = "audit_request_m43_local",
                status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.ROUTED,
                preferredDestinationId = destinationLocal.destinationId,
                selectedDestinationId = destinationLocal.destinationId,
                selectedDestinationType = destinationLocal.type,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "High-trust EU path routed directly.",
                createdAtMs = now + 20L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
                decisionId = "destination_decision_m43_us",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                sourceId = "audit_request_m43_us",
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                preferredDestinationId = destinationUs.destinationId,
                selectedDestinationId = destinationUs.destinationId,
                selectedDestinationType = destinationUs.type,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.US,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                blockReason =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationBlockReason.REVIEW_REQUIRED,
                summary = "Limited-trust US path is held for compliance review.",
                createdAtMs = now + 21L
            )
        )
        val bundleLocal =
            com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
                bundleId = "bundle_m43_local",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                sourceId = "audit_request_m43_local",
                destinationIds = listOf(destinationLocal.destinationId),
                destinationTypes = listOf(destinationLocal.type),
                artifacts = listOf(artifact),
                artifactClasses = listOf(artifact.artifactClass),
                summary = "Local bundle advances immediately.",
                createdAtMs = now + 30L
            )
        val bundleUs =
            com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
                bundleId = "bundle_m43_us",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                sourceId = "audit_request_m43_us",
                destinationIds = listOf(destinationUs.destinationId),
                destinationTypes = listOf(destinationUs.type),
                artifacts = listOf(artifact),
                artifactClasses = listOf(artifact.artifactClass),
                summary = "US bundle remains held behind review.",
                createdAtMs = now + 31L
            )
        val bundleDecisions = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m43_local",
                bundleId = bundleLocal.bundleId,
                purpose = bundleLocal.purpose,
                bundleType = bundleLocal.bundleType,
                sourceId = bundleLocal.sourceId,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                    policyId = "bundle_policy_m43_local",
                    bundleType = bundleLocal.bundleType,
                    summary = "Local path is fully allowed."
                ),
                boundarySummary = boundaryEu,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.ALLOWED,
                primaryDestinationId = destinationLocal.destinationId,
                primaryDestinationType = destinationLocal.type,
                summary = "High-trust EU bundle is ready.",
                createdAtMs = now + 40L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m43_us",
                bundleId = bundleUs.bundleId,
                purpose = bundleUs.purpose,
                bundleType = bundleUs.bundleType,
                sourceId = bundleUs.sourceId,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                    policyId = "bundle_policy_m43_us",
                    bundleType = bundleUs.bundleType,
                    summary = "US path requires review before release."
                ),
                boundarySummary = boundaryUs,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.HELD,
                primaryDestinationId = destinationUs.destinationId,
                primaryDestinationType = destinationUs.type,
                approvalRequired = true,
                summary = "Limited-trust US bundle is held.",
                createdAtMs = now + 41L
            )
        )
        val manifests = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
                manifestId = "manifest_m43_local",
                bundleId = bundleLocal.bundleId,
                bundleDecisionId = "bundle_decision_m43_local",
                purpose = bundleLocal.purpose,
                bundleType = bundleLocal.bundleType,
                status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.ROUTED,
                destinationIds = bundleLocal.destinationIds,
                destinationTypes = bundleLocal.destinationTypes,
                artifactRefs = bundleLocal.artifacts,
                boundarySummary = boundaryEu,
                summary = "Local manifest routed.",
                createdAtMs = now + 50L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
                manifestId = "manifest_m43_us",
                bundleId = bundleUs.bundleId,
                bundleDecisionId = "bundle_decision_m43_us",
                purpose = bundleUs.purpose,
                bundleType = bundleUs.bundleType,
                status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.HELD,
                destinationIds = bundleUs.destinationIds,
                destinationTypes = bundleUs.destinationTypes,
                artifactRefs = bundleUs.artifacts,
                boundarySummary = boundaryUs,
                holdReason =
                    com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeHoldReason.JURISDICTION_REVIEW_REQUIRED,
                summary = "US manifest is held.",
                createdAtMs = now + 51L
            )
        )
        val approvals = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
                approvalId = "approval_m43_local",
                bundleDecisionId = "bundle_decision_m43_local",
                manifestId = "manifest_m43_local",
                sourceId = bundleLocal.sourceId,
                required = false,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
                summary = "Local bundle auto-approved.",
                recordedAtMs = now + 60L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
                approvalId = "approval_m43_us",
                bundleDecisionId = "bundle_decision_m43_us",
                manifestId = "manifest_m43_us",
                sourceId = bundleUs.sourceId,
                required = true,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.PENDING_REVIEW,
                summary = "US bundle awaits review.",
                recordedAtMs = now + 61L
            )
        )
        val audits = listOf(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
                auditId = "audit_m43_local",
                bundleDecisionId = "bundle_decision_m43_local",
                manifestId = "manifest_m43_local",
                purpose = bundleLocal.purpose,
                bundleType = bundleLocal.bundleType,
                operationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BOUNDARY_CHECK_PASSED,
                result = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.PASSED,
                summary = "Local boundary check passed.",
                recordedAtMs = now + 70L
            ),
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
                auditId = "audit_m43_us",
                bundleDecisionId = "bundle_decision_m43_us",
                manifestId = "manifest_m43_us",
                purpose = bundleUs.purpose,
                bundleType = bundleUs.bundleType,
                operationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                result =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.REVIEW_REQUIRED,
                summary = "US boundary requires review.",
                recordedAtMs = now + 71L
            )
        )
        val port = RecordingPersistencePort(
            userId = userId,
            initialState = baseState.copy(
                portfolioOptimizationRemoteDestinationProfiles =
                    listOf(destinationLocal, destinationUs),
                portfolioOptimizationRemoteDestinationDecisionRecords = destinationDecisions,
                portfolioOptimizationDataExchangeBundles = listOf(bundleLocal, bundleUs),
                portfolioOptimizationDataExchangeBundleDecisionRecords = bundleDecisions,
                portfolioOptimizationDataExchangeManifests = manifests,
                portfolioOptimizationCrossBoundaryApprovalRecords = approvals,
                portfolioOptimizationCrossBoundaryAuditRecords = audits
            )
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = port,
            nowMs = { now + 500L }
        )
        val portfolioId = reader.getPortfolioOptimizationState(userId = userId)
            .crossBoundaryGovernancePortfolios
            .first()
            .portfolioId

        val action = reader.recordPortfolioOptimizationCorrectiveAction(
            userId = userId,
            portfolioId = portfolioId,
            actionType =
                com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
            targetProgramId = "cross_boundary_program_audit_export_compliance_audit_exchange_limited_us_privacy",
            targetTrustTier = com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED,
            targetJurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
            operatorId = "local-user",
            operatorName = "Local Operator",
            note = "Hold limited-trust US rollout until drift stabilizes."
        )

        val state = reader.getPortfolioOptimizationState(
            userId = userId,
            query = PortfolioOptimizationQuery(
                governancePortfolioId = portfolioId,
                correctiveActionType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
                limit = 20
            )
        )

        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
            action.actionType
        )
        assertTrue(
            state.crossBoundaryCorrectiveActionRecords.any { it.actionRecordId == action.actionRecordId }
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus.HELD,
            state.summary?.activeRiskBudgetStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.BLOCKED,
            state.summary?.activePortfolioSafetyState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState.HARD_STOP,
            state.summary?.activeBudgetGuardrailState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.HARD_STOP,
            state.summary?.activePortfolioEnforcementMode
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState.SUPPRESSED,
            state.summary?.activeRemediationAutomationState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendationAction.HOLD_PORTFOLIO,
            state.summary?.latestPortfolioRiskRecommendationAction
        )
        assertTrue(state.summary?.latestPortfolioCorrectiveActionSummary?.contains("risk hold", ignoreCase = true) == true)
        assertTrue(state.summary?.latestPortfolioSafetySummary?.contains("Portfolio safety is blocked", ignoreCase = true) == true)
        assertTrue(state.summary?.latestBudgetGuardrailSummary?.contains("hard-stop", ignoreCase = true) == true)
        assertTrue(state.summary?.latestRemediationAutomationSummary?.contains("suppressed", ignoreCase = true) == true)
        assertTrue(state.portfolioSafetySummaries.any { it.portfolioId == portfolioId && it.safetyState == com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.BLOCKED })
        assertTrue(state.portfolioBudgetGuardrails.any { it.portfolioId == portfolioId && it.state == com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState.HARD_STOP })
        assertTrue(state.portfolioRemediationAutomationControls.any { it.portfolioId == portfolioId && it.automationState == com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState.SUPPRESSED })
        assertTrue(
            port.lastSavedState?.portfolioOptimizationCrossBoundaryCorrectiveActionRecords?.any {
                it.actionRecordId == action.actionRecordId
            } == true
        )
    }

    private fun persistedStateWithRecord(
        userId: String,
        record: ExecutionReceiptRecord
    ): DynamicStatePersistencePort {
        return persistedStateWithData(
            userId = userId,
            state = PersistedDynamicState(executionLedgerRecords = listOf(record))
        )
    }

    private fun persistedStateWithData(
        userId: String,
        state: PersistedDynamicState
    ): DynamicStatePersistencePort {
        return object : DynamicStatePersistencePort {
            override fun load(userIdParam: String): PersistedDynamicState? {
                if (userIdParam != userId) return null
                return state
            }

            override fun save(
                userId: String,
                dynamicState: DynamicHumanStatePayload?,
                trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
                activeRole: UserRole?,
                roleSource: RoleSource?,
                rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
                executionLedgerRecords: List<ExecutionReceiptRecord>,
                telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
                alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
                reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
                collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
                remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
                alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
            ) = Unit
        }
    }

    private fun optimizationRequest(
        requestId: String,
        objectivePreset: PortfolioOptimizationObjectivePreset,
        riskTolerance: PortfolioOptimizationRiskTolerance,
        topN: Int,
        seed: Long
    ): PortfolioOptimizationRequest {
        return PortfolioOptimizationRequest(
            requestId = requestId,
            name = "Optimization $requestId",
            summary = "Bounded M33 optimization request.",
            objectiveProfile = PortfolioOptimizationObjectiveProfile(
                profileId = "objective_$requestId",
                preset = objectivePreset
            ),
            constraintProfile = PortfolioOptimizationConstraintProfile(
                profileId = "constraint_$requestId",
                preset = if (riskTolerance == PortfolioOptimizationRiskTolerance.LOW) {
                    PortfolioOptimizationConstraintPreset.RISK_STRICT
                } else {
                    PortfolioOptimizationConstraintPreset.DEFAULT_GUARDED
                },
                riskTolerance = riskTolerance,
                constraints = listOf(
                    PortfolioOptimizationConstraint(
                        family = PortfolioOptimizationConstraintFamily.MAX_CONCURRENT_RISKY_PROMOTIONS,
                        enabled = true,
                        hardConstraint = true,
                        intLimit = when (riskTolerance) {
                            PortfolioOptimizationRiskTolerance.LOW -> 0
                            PortfolioOptimizationRiskTolerance.MODERATE -> 1
                            PortfolioOptimizationRiskTolerance.HIGH -> 2
                        },
                        summary = "Risk limit for $requestId."
                    )
                )
            ),
            scenarioSet = PortfolioOptimizationScenarioSet(),
            solverConfig = PortfolioOptimizationSolverConfig(
                seed = seed,
                topCandidateCount = topN,
                maxCandidateIterations = maxOf(6, topN * 2)
            ),
            active = true
        )
    }

    private data class OptimizationLearningFixture(
        val orchestrator: AgentOrchestrator,
        val port: RecordingPersistencePort,
        val request: PortfolioOptimizationRequest,
        val result: com.lumi.coredomain.contract.PortfolioOptimizationResult,
        val candidate: com.lumi.coredomain.contract.PortfolioOptimizationCandidateSchedule,
        val decision: com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord
    )

    private fun createLearningFixture(
        userId: String,
        now: Long,
        records: List<ExecutionReceiptRecord>,
        requestId: String,
        objectivePreset: PortfolioOptimizationObjectivePreset,
        riskTolerance: PortfolioOptimizationRiskTolerance,
        topN: Int,
        seed: Long,
        remoteLearningTransportPort: RemoteLearningTransportPort = NoOpRemoteLearningTransportPort()
    ): OptimizationLearningFixture {
        var clock = now
        val port = RecordingPersistencePort(
            userId = userId,
            initialState = PersistedDynamicState(executionLedgerRecords = records)
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = port,
            remoteLearningTransportPort = remoteLearningTransportPort,
            nowMs = { clock++ }
        )
        val request = orchestrator.savePortfolioOptimizationRequest(
            userId = userId,
            request = optimizationRequest(
                requestId = requestId,
                objectivePreset = objectivePreset,
                riskTolerance = riskTolerance,
                topN = topN,
                seed = seed
            )
        )
        val result = orchestrator.runPortfolioOptimization(userId, request.requestId)
        val candidate = assertNotNull(result.candidateSchedules.firstOrNull())
        val decision = orchestrator.selectPortfolioOptimizationSchedule(
            userId = userId,
            resultId = result.resultId,
            candidateId = candidate.candidateId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        )
        return OptimizationLearningFixture(
            orchestrator = orchestrator,
            port = port,
            request = request,
            result = result,
            candidate = candidate,
            decision = decision
        )
    }

    private fun recordLearningTransportConsents(
        orchestrator: AgentOrchestrator,
        userId: String
    ) {
        val binding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
            scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
            userId = userId
        )
        orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_${userId}_learning_sync",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.LEARNING_SYNC,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Learning sync consent granted."
            )
        )
        orchestrator.recordPortfolioOptimizationConsent(
            userId = userId,
            consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
                consentId = "consent_${userId}_remote_transport",
                scopeBinding = binding,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Remote transport consent granted."
            )
        )
    }

    private fun learningObservationsForCandidate(
        result: com.lumi.coredomain.contract.PortfolioOptimizationResult,
        candidate: com.lumi.coredomain.contract.PortfolioOptimizationCandidateSchedule,
        riskIncidentCount: Int? = null
    ): com.lumi.coredomain.contract.PortfolioOutcomeObservationSet {
        val defaultRiskCount = candidate.scheduledActions.count {
            it.riskBucket == com.lumi.coredomain.contract.PortfolioOptimizationRiskBucket.HIGH ||
                it.riskBucket == com.lumi.coredomain.contract.PortfolioOptimizationRiskBucket.CRITICAL
        }
        val riskSourceRunId = candidate.scheduledActions.firstOrNull()?.sourceRunId
            ?: candidate.deferredActions.firstOrNull()?.sourceRunId
            ?: "synthetic_run"
        val bindingSourceRunId = riskSourceRunId
        return com.lumi.coredomain.contract.PortfolioOutcomeObservationSet(
            executionObservations = candidate.scheduledActions.map { action ->
                com.lumi.coredomain.contract.PortfolioExecutionObservation(
                    sourceRunId = action.sourceRunId,
                    executedOnTime = true,
                    executedAtMs = null,
                    actualBucketIndex = action.scheduledBucketIndex,
                    actualActionType = action.type,
                    readinessDelayed = false,
                    summary = "Executed on time."
                )
            },
            approvalLatencyObservations = candidate.scheduledActions
                .filter { it.requiresApproval }
                .map { action ->
                    com.lumi.coredomain.contract.PortfolioApprovalLatencyObservation(
                        sourceRunId = action.sourceRunId,
                        latencyHours = (action.scheduledBucketIndex + 1) * result.solverConfig.bucketHours.toDouble(),
                        approved = false,
                        summary = "Approval latency aligned to the predicted bucket."
                    )
                },
            windowUtilizationObservations = candidate.deferredActions.map { deferred ->
                com.lumi.coredomain.contract.PortfolioWindowUtilizationObservation(
                    sourceRunId = deferred.sourceRunId,
                    missedWindow = deferred.blockedBy == PortfolioOptimizationConstraintFamily.WINDOW_ELIGIBILITY,
                    expiredWindow = false,
                    actualEligibleAtMs = deferred.nextEligibleAtMs,
                    summary = "Window utilization mirrored the selected schedule."
                )
            },
            riskIncidentObservations = buildList {
                val incidentCount = riskIncidentCount ?: defaultRiskCount
                if (incidentCount > 0 || riskIncidentCount != null) {
                    add(
                        com.lumi.coredomain.contract.PortfolioRiskIncidentObservation(
                            sourceRunId = riskSourceRunId,
                            incidentCount = incidentCount,
                            severity = if (incidentCount >= 2) {
                                com.lumi.coredomain.contract.PortfolioOptimizationRiskBucket.CRITICAL
                            } else {
                                com.lumi.coredomain.contract.PortfolioOptimizationRiskBucket.MODERATE
                            },
                            summary = "Risk incidents recorded for selected schedule."
                        )
                    )
                }
            },
            constraintBindingObservations = candidate.bindingConstraints.map { binding ->
                com.lumi.coredomain.contract.PortfolioConstraintBindingObservation(
                    sourceRunId = bindingSourceRunId,
                    family = binding.family,
                    bindingObserved = true,
                    count = binding.bindingCount,
                    summary = binding.summary
                )
            },
            summary = "Outcome observations aligned with the selected schedule."
        )
    }

    private fun optimizationRecord(
        userId: String,
        runId: String,
        programId: String,
        waveId: String = "wave_$programId",
        updatedAtMs: Long,
        priority: com.lumi.coredomain.contract.RolloutProgramPriority =
            com.lumi.coredomain.contract.RolloutProgramPriority.MEDIUM,
        readiness: com.lumi.coredomain.contract.RolloutPromotionReadinessStatus =
            com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY,
        scheduleDecision: com.lumi.coredomain.contract.ExecutionWindowDecision? = null,
        scheduleBlockReason: com.lumi.coredomain.contract.ExecutionWindowBlockReason? = null,
        windowDelayReason: com.lumi.coredomain.contract.WindowDelayReason? = null,
        nextEligibleAtMs: Long? = null,
        dependencyProgramIds: List<String> = emptyList(),
        approvalPending: Boolean = false,
        capacityBlocked: Boolean = false,
        policyBlocked: Boolean = false,
        safeAutomationEligible: Boolean = false,
        connectorStatus: String? = null,
        credentialState: com.lumi.coredomain.contract.ConnectorCredentialLifecycleState? = null,
        trustTier: com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier? = null,
        jurisdiction: com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction? = null,
        crossWaveHealthBucket: com.lumi.coredomain.contract.WaveHealthBucket? = null,
        slaStatus: com.lumi.coredomain.contract.WorkflowSlaStatus? = null,
        currentDeferred: Boolean = false,
        pinnedTargets: Int = 0
    ): ExecutionReceiptRecord {
        val rolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
            stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
            mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
            target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                workspaceId = "${programId}_workspace"
            ),
            approvalState = if (approvalPending) {
                com.lumi.coredomain.contract.PolicyRolloutApprovalState.PENDING
            } else {
                com.lumi.coredomain.contract.PolicyRolloutApprovalState.NOT_REQUIRED
            },
            governanceProgram = com.lumi.coredomain.contract.PolicyGovernanceProgram(
                programId = programId,
                name = programId.replace('_', ' '),
                status = com.lumi.coredomain.contract.PolicyGovernanceProgramStatus.ACTIVE,
                currentWaveId = waveId,
                waves = listOf(
                    com.lumi.coredomain.contract.PolicyGovernanceProgramWave(
                        waveId = waveId,
                        waveIndex = 1,
                        name = waveId,
                        status = com.lumi.coredomain.contract.PolicyGovernanceWaveStatus.STAGED,
                        targetScope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                        summary = "Wave $waveId for $programId.",
                        updatedAtMs = updatedAtMs
                    )
                ),
                summary = "Governance program $programId.",
                updatedAtMs = updatedAtMs
            ),
            promotionReadinessSummary = com.lumi.coredomain.contract.RolloutPromotionReadinessSummary(
                status = readiness,
                recommendation = when (readiness) {
                    com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY,
                    com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.READY_WITH_CAUTION ->
                        com.lumi.coredomain.contract.RolloutPromotionOperationType.PROMOTE
                    com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED ->
                        com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER
                    else -> com.lumi.coredomain.contract.RolloutPromotionOperationType.HOLD
                },
                summary = "$programId readiness is ${readiness.name.lowercase()}",
                updatedAtMs = updatedAtMs
            ),
            estateAutomationEligibility = if (safeAutomationEligible) {
                com.lumi.coredomain.contract.EstateAutomationEligibility(
                    status = com.lumi.coredomain.contract.EstateAutomationEligibilityStatus.ELIGIBLE,
                    summary = "Safe automation is eligible for $programId.",
                    evaluatedAtMs = updatedAtMs
                )
            } else {
                null
            },
            crossTenantRollout = com.lumi.coredomain.contract.CrossTenantRolloutSummary(
                pinnedTargets = pinnedTargets,
                summary = if (pinnedTargets > 0) "Pinned targets are active." else "No pinned targets."
            ),
            crossWaveAnalyticsSummary = crossWaveHealthBucket?.let { bucket ->
                com.lumi.coredomain.contract.CrossWaveAnalyticsSummary(
                    healthBucket = bucket,
                    totalWaves = 3,
                    blockedWaves = if (bucket == com.lumi.coredomain.contract.WaveHealthBucket.BLOCKED) 1 else 0,
                    deferredWaves = if (currentDeferred) 1 else 0,
                    carriedForwardWaves = if (currentDeferred) 1 else 0,
                    carryForwardPressure = currentDeferred,
                    summary = "Cross-wave state for $programId is ${bucket.name.lowercase()}",
                    updatedAtMs = updatedAtMs
                )
            },
            policySchedulingWindow = if (scheduleDecision != null || nextEligibleAtMs != null) {
                com.lumi.coredomain.contract.PolicySchedulingWindow(
                    windowId = "window_$programId",
                    windowType = when (scheduleBlockReason) {
                        com.lumi.coredomain.contract.ExecutionWindowBlockReason.BLACKOUT_WINDOW ->
                            com.lumi.coredomain.contract.SchedulingWindowType.BLACKOUT_WINDOW
                        else -> com.lumi.coredomain.contract.SchedulingWindowType.ROLLOUT_STAGE_WINDOW
                    },
                    status = when (scheduleDecision) {
                        com.lumi.coredomain.contract.ExecutionWindowDecision.ELIGIBLE ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.ELIGIBLE
                        com.lumi.coredomain.contract.ExecutionWindowDecision.BLOCKED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.BLOCKED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.PAUSED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.PAUSED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.EXPIRED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.EXPIRED
                        else -> com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED
                    },
                    nextEligibleAtMs = nextEligibleAtMs,
                    summary = "Window state for $programId."
                )
            } else {
                null
            },
            calendarEvaluation = if (scheduleDecision != null || nextEligibleAtMs != null || windowDelayReason != null) {
                com.lumi.coredomain.contract.CalendarEvaluationResult(
                    decision = scheduleDecision
                        ?: com.lumi.coredomain.contract.ExecutionWindowDecision.ELIGIBLE,
                    windowStatus = when (scheduleDecision) {
                        com.lumi.coredomain.contract.ExecutionWindowDecision.ELIGIBLE ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.ELIGIBLE
                        com.lumi.coredomain.contract.ExecutionWindowDecision.BLOCKED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.BLOCKED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.PAUSED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.PAUSED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.EXPIRED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.EXPIRED
                        else -> com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED
                    },
                    blockReason = scheduleBlockReason
                        ?: com.lumi.coredomain.contract.ExecutionWindowBlockReason.NONE,
                    nextEligibleAtMs = nextEligibleAtMs,
                    summary = "Calendar evaluation for $programId."
                )
            } else {
                null
            },
            windowImpactSummary = if (windowDelayReason != null || scheduleDecision != null || nextEligibleAtMs != null) {
                com.lumi.coredomain.contract.WindowImpactSummary(
                    decision = scheduleDecision
                        ?: com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                    windowStatus = when (scheduleDecision) {
                        com.lumi.coredomain.contract.ExecutionWindowDecision.ELIGIBLE ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.ELIGIBLE
                        com.lumi.coredomain.contract.ExecutionWindowDecision.BLOCKED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.BLOCKED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.PAUSED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.PAUSED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.EXPIRED ->
                            com.lumi.coredomain.contract.SchedulingWindowStatus.EXPIRED
                        else -> com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED
                    },
                    eligibility = when (scheduleDecision) {
                        com.lumi.coredomain.contract.ExecutionWindowDecision.ELIGIBLE ->
                            com.lumi.coredomain.contract.PromotionWindowEligibility.ELIGIBLE
                        com.lumi.coredomain.contract.ExecutionWindowDecision.BLOCKED ->
                            com.lumi.coredomain.contract.PromotionWindowEligibility.BLOCKED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.PAUSED ->
                            com.lumi.coredomain.contract.PromotionWindowEligibility.PAUSED
                        com.lumi.coredomain.contract.ExecutionWindowDecision.EXPIRED ->
                            com.lumi.coredomain.contract.PromotionWindowEligibility.EXPIRED
                        else -> com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED
                    },
                    delayReason = windowDelayReason
                        ?: com.lumi.coredomain.contract.WindowDelayReason.NONE,
                    nextEligibleAtMs = nextEligibleAtMs,
                    blockedTargets = if (scheduleDecision == com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED) 1 else 0,
                    summary = "Window delay for $programId.",
                    updatedAtMs = updatedAtMs
                )
            } else {
                null
            },
            currentRolloutWaveId = waveId,
            currentRolloutWaveStatus = if (currentDeferred) {
                com.lumi.coredomain.contract.RolloutWaveStatus.DEFERRED
            } else {
                com.lumi.coredomain.contract.RolloutWaveStatus.ACTIVE
            },
            currentRolloutWaveCompletionState = if (currentDeferred) {
                com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD
            } else {
                com.lumi.coredomain.contract.RolloutWaveCompletionState.IN_PROGRESS
            },
            programCoordination = com.lumi.coredomain.contract.RolloutProgramCoordinationRecord(
                programId = programId,
                programName = programId.replace('_', ' '),
                priority = priority,
                coordinationState = when {
                    dependencyProgramIds.isNotEmpty() && currentDeferred ->
                        com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED
                    dependencyProgramIds.isNotEmpty() ->
                        com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEPENDENCY_BLOCKED
                    currentDeferred ->
                        com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED
                    else -> com.lumi.coredomain.contract.RolloutProgramCoordinationState.ACTIVE
                },
                decisionReason = if (dependencyProgramIds.isNotEmpty()) {
                    com.lumi.coredomain.contract.RolloutProgramDecisionReason.DEPENDENCY_BLOCK
                } else {
                    com.lumi.coredomain.contract.RolloutProgramDecisionReason.NONE
                },
                dependencies = dependencyProgramIds.mapIndexed { index, dependencyProgramId ->
                    com.lumi.coredomain.contract.RolloutProgramDependency(
                        dependencyId = "dependency_${programId}_$index",
                        programId = programId,
                        dependsOnProgramId = dependencyProgramId,
                        blocked = true,
                        summary = "$programId depends on $dependencyProgramId."
                    )
                },
                capacityAwarePromotionDecision = com.lumi.coredomain.contract.CapacityAwarePromotionDecision(
                    decisionId = "capacity_$programId",
                    allowedNow = !capacityBlocked && !policyBlocked,
                    capacityBlocked = capacityBlocked,
                    policyBlocked = policyBlocked,
                    summary = "Capacity/policy decision for $programId."
                ),
                summary = "Program coordination for $programId.",
                updatedAtMs = updatedAtMs
            ),
            governanceCapacityPool = com.lumi.coredomain.contract.GovernanceCapacityPool(
                poolKey = "pool_$programId",
                scope = com.lumi.coredomain.contract.GovernanceCapacityScope.WORKSPACE,
                scopeId = "workspace_$programId",
                loadBucket = if (capacityBlocked) {
                    com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED
                } else {
                    com.lumi.coredomain.contract.ApprovalLoadBucket.BALANCED
                },
                budget = com.lumi.coredomain.contract.ApprovalCapacityBudget(
                    availableSlots = if (capacityBlocked) 0 else 2,
                    requestedSlots = if (approvalPending) 1 else 0,
                    reservedSlots = 0,
                    utilizationRate = if (capacityBlocked) 1.0 else 0.5
                ),
                nextAvailableAtMs = nextEligibleAtMs,
                summary = "Capacity pool for $programId."
            ),
            approvalQueuePressure = com.lumi.coredomain.contract.ApprovalQueuePressureSummary(
                poolKey = "pool_$programId",
                loadBucket = if (capacityBlocked) {
                    com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED
                } else {
                    com.lumi.coredomain.contract.ApprovalLoadBucket.BALANCED
                },
                pendingApprovals = if (approvalPending) 1 else 0,
                blockedApprovals = if (capacityBlocked) 1 else 0,
                summary = "Approval queue for $programId."
            ),
            capacityAwarePromotionDecision = com.lumi.coredomain.contract.CapacityAwarePromotionDecision(
                decisionId = "capacity_top_level_$programId",
                allowedNow = !capacityBlocked && !policyBlocked,
                capacityBlocked = capacityBlocked,
                policyBlocked = policyBlocked,
                summary = "Top-level capacity decision for $programId."
            ),
            approvalLoadSummary = "Approval load for $programId.",
            capacityBlockSummary = if (capacityBlocked) "Capacity blocked $programId." else "",
            policyBlockSummary = if (policyBlocked) "Policy blocked $programId." else "",
            summary = "Optimization seed rollout state for $programId.",
            updatedAtMs = updatedAtMs
        )
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = runId,
            templateId = "wf_$programId",
            templateName = "Workflow $programId",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            slaClock = slaStatus?.let { status ->
                com.lumi.coredomain.contract.WorkflowSlaClock(
                    startedAtMs = updatedAtMs - 3_600_000L,
                    dueAtMs = updatedAtMs + 3_600_000L,
                    status = status,
                    summary = "SLA state for $programId is ${status.name.lowercase()}."
                )
            },
            policyRolloutState = rolloutState,
            workflowRolloutSummary = "Workflow rollout summary for $programId.",
            updatedAtMs = updatedAtMs
        )
        return ExecutionReceiptRecord(
            recordId = "record_$runId",
            runId = runId,
            userId = userId,
            sessionId = "session_$runId",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            workflowRun = workflowRun,
            workflowRolloutState = rolloutState,
            connectorHealthSummary = connectorStatus?.let { status ->
                com.lumi.coredomain.contract.ConnectorHealthSummary(
                    overallStatus = status,
                    degradedTargets = if (status.contains("degraded", ignoreCase = true)) 1 else 0,
                    unavailableTargets = if (status.contains("unavailable", ignoreCase = true)) 1 else 0,
                    lastUpdatedAtMs = updatedAtMs
                )
            },
            connectorCredentialLifecycle = credentialState?.let { state ->
                com.lumi.coredomain.contract.ConnectorCredentialLifecycleSummary(
                    state = state,
                    summary = "Credential state $state for $programId.",
                    rotationRequired = state == com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.ROTATION_REQUIRED,
                    revoked = state == com.lumi.coredomain.contract.ConnectorCredentialLifecycleState.REVOKED,
                    evaluatedAtMs = updatedAtMs
                )
            },
            portfolioJurisdiction = jurisdiction,
            receipt = com.lumi.coredomain.contract.ExecutionReceipt(
                portfolioJurisdiction = jurisdiction,
                portfolioDataExchangeVisibility =
                    com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeVisibilitySummary(
                        destinationTrustTier = trustTier
                    )
            ),
            createdAtMs = updatedAtMs - 1_000L,
            updatedAtMs = updatedAtMs
        )
    }

    private class RecordingPersistencePort(
        private val userId: String,
        initialState: PersistedDynamicState? = null
    ) : DynamicStatePersistencePort {
        private var state: PersistedDynamicState? = initialState
        var lastSavedState: PersistedDynamicState? = initialState
            private set

        override fun load(userIdParam: String): PersistedDynamicState? {
            if (userIdParam != userId) return null
            return state
        }

        override fun save(
            userId: String,
            dynamicState: DynamicHumanStatePayload?,
            trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
            activeRole: UserRole?,
            roleSource: RoleSource?,
            rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
            executionLedgerRecords: List<ExecutionReceiptRecord>,
            telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
            alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
            reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
            collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
            remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
            alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>
        ) {
            state = PersistedDynamicState(
                dynamicState = dynamicState,
                trajectory = trajectory,
                activeRole = activeRole,
                roleSource = roleSource,
                rolePolicyOverrides = rolePolicyOverrides,
                executionLedgerRecords = executionLedgerRecords,
                telemetryEmissionRecords = telemetryEmissionRecords,
                alertDeliveryRecords = alertDeliveryRecords,
                reconciliationJobRecords = reconciliationJobRecords,
                collaborationStates = collaborationStates,
                remoteOperatorHandoffRecords = remoteOperatorHandoffRecords,
                alertRoutingRecords = alertRoutingRecords
            )
            lastSavedState = state
        }

        override fun saveExtended(
            userId: String,
            dynamicState: DynamicHumanStatePayload?,
            trajectory: List<com.lumi.coredomain.contract.TrajectoryPointPayload>,
            activeRole: UserRole?,
            roleSource: RoleSource?,
            rolePolicyOverrides: Map<UserRole, com.lumi.coredomain.contract.RolePolicyProfile>,
            executionLedgerRecords: List<ExecutionReceiptRecord>,
            telemetryEmissionRecords: List<com.lumi.coredomain.contract.TelemetryEmissionRecord>,
            alertDeliveryRecords: List<com.lumi.coredomain.contract.AlertDeliveryRecord>,
            reconciliationJobRecords: List<com.lumi.coredomain.contract.ReconciliationJobRecord>,
            collaborationStates: List<com.lumi.coredomain.contract.GovernanceCaseCollaborationState>,
            remoteOperatorHandoffRecords: List<com.lumi.coredomain.contract.RemoteOperatorHandoffRecord>,
            alertRoutingRecords: List<com.lumi.coredomain.contract.AlertRoutingRecord>,
            remoteOperatorDirectoryEntries: List<com.lumi.coredomain.contract.RemoteOperatorDirectoryEntry>,
            connectorDestinations: List<com.lumi.coredomain.contract.ConnectorDestination>,
            connectorAuthProfiles: List<com.lumi.coredomain.contract.ConnectorAuthProfile>,
            connectorRouteBindings: List<com.lumi.coredomain.contract.ConnectorRouteBinding>,
            portfolioScenarioDefinitions: List<PortfolioScenarioDefinition>,
            portfolioSimulationRunRecords: List<PortfolioSimulationRunRecord>,
            portfolioScenarioComparisons: List<PortfolioScenarioComparison>,
            portfolioOptimizationObjectiveProfileSnapshots: List<com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot>,
            portfolioOptimizationCalibrationSnapshots: List<com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot>,
            portfolioOptimizationRequests: List<PortfolioOptimizationRequest>,
            portfolioOptimizationResults: List<com.lumi.coredomain.contract.PortfolioOptimizationResult>,
            portfolioOptimizationDecisionRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord>,
            portfolioOptimizationOutcomeRecords: List<com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord>,
            portfolioOptimizationDriftSummaries: List<com.lumi.coredomain.contract.PortfolioOptimizationDriftSummary>,
            portfolioOptimizationTuningSuggestions: List<com.lumi.coredomain.contract.PortfolioOptimizationTuningSuggestion>,
            portfolioOptimizationTuningDecisionRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord>,
            portfolioOptimizationPropagationAttemptRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationPropagationAttemptRecord>,
            portfolioOptimizationPropagationApprovalRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRecord>,
            portfolioOptimizationPropagationAdoptionRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationPropagationAdoptionRecord>,
            portfolioOptimizationLearningSyncEnvelopes: List<com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncEnvelope>,
            portfolioOptimizationLearningSyncAttemptRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncAttemptRecord>,
            portfolioOptimizationLearningSyncConflictRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictRecord>,
            portfolioOptimizationConsentRecords: List<com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord>,
            portfolioOptimizationRemoteLearningEnvelopes: List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningEnvelope>,
            portfolioOptimizationRemoteLearningBatches: List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningBatch>,
            portfolioOptimizationRemoteLearningTransportAttemptRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord>,
            portfolioOptimizationRemoteDestinationProfiles:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile>,
            portfolioOptimizationRemoteDestinationDecisionRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord>,
            portfolioOptimizationRemoteTransportConnectorProfiles:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile>,
            portfolioOptimizationEnterpriseKeyReferences:
                List<com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyReference>,
            portfolioOptimizationRemoteTransportDeadLetterRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportDeadLetterRecord>,
            portfolioOptimizationComplianceAuditExportRequests:
                List<com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest>,
            portfolioOptimizationComplianceAuditExportResults:
                List<com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult>,
            portfolioOptimizationComplianceExportRouteRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationComplianceExportRouteRecord>,
            portfolioOptimizationDataExchangeBundles:
                List<com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle>,
            portfolioOptimizationDataExchangeBundleDecisionRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord>,
            portfolioOptimizationDataExchangeManifests:
                List<com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest>,
            portfolioOptimizationCrossBoundaryApprovalRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord>,
            portfolioOptimizationCrossBoundaryAuditRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord>,
            portfolioOptimizationDestinationTrustTierAssignments:
                List<com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTierAssignment>,
            portfolioOptimizationCrossBoundaryProgramRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramRecord>,
            portfolioOptimizationCrossBoundaryGovernancePortfolios:
                List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolio>,
            portfolioOptimizationTrustTierProgramSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationTrustTierProgramSummary>,
            portfolioOptimizationJurisdictionRolloutPlans:
                List<com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutPlan>,
            portfolioOptimizationPortfolioBlockerSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerSummary>,
            portfolioOptimizationPortfolioDependencySummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioDependencySummary>,
            portfolioOptimizationPortfolioConflictSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioConflictSummary>,
            portfolioOptimizationPortfolioPriorityDecisions:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriorityDecision>,
            portfolioOptimizationPortfolioCoordinationRecommendations:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioCoordinationRecommendation>,
            portfolioOptimizationPortfolioWaveCoordinationRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioWaveCoordinationRecord>,
            portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary>,
            portfolioOptimizationRiskBudgets:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRiskBudget>,
            portfolioOptimizationTrustTierDriftSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftSummary>,
            portfolioOptimizationJurisdictionDriftSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftSummary>,
            portfolioOptimizationDestinationRiskConcentrationSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationDestinationRiskConcentrationSummary>,
            portfolioOptimizationPortfolioBlockerTrendSummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerTrendSummary>,
            portfolioOptimizationPortfolioRiskRecommendations:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendation>,
            portfolioOptimizationCrossBoundaryCorrectiveActionRecords:
                List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord>,
            portfolioOptimizationPortfolioSafetyRails:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyRail>,
            portfolioOptimizationBudgetGuardrails:
                List<com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrail>,
            portfolioOptimizationPortfolioSafetySummaries:
                List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetySummary>,
            portfolioOptimizationRemediationAutomationControls:
                List<com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationControl>,
            portfolioOptimizationFederatedAggregationSummaries: List<com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationSummary>
        ) {
            state = PersistedDynamicState(
                dynamicState = dynamicState,
                trajectory = trajectory,
                activeRole = activeRole,
                roleSource = roleSource,
                rolePolicyOverrides = rolePolicyOverrides,
                executionLedgerRecords = executionLedgerRecords,
                telemetryEmissionRecords = telemetryEmissionRecords,
                alertDeliveryRecords = alertDeliveryRecords,
                reconciliationJobRecords = reconciliationJobRecords,
                collaborationStates = collaborationStates,
                remoteOperatorHandoffRecords = remoteOperatorHandoffRecords,
                alertRoutingRecords = alertRoutingRecords,
                remoteOperatorDirectoryEntries = remoteOperatorDirectoryEntries,
                connectorDestinations = connectorDestinations,
                connectorAuthProfiles = connectorAuthProfiles,
                connectorRouteBindings = connectorRouteBindings,
                portfolioScenarioDefinitions = portfolioScenarioDefinitions,
                portfolioSimulationRunRecords = portfolioSimulationRunRecords,
                portfolioScenarioComparisons = portfolioScenarioComparisons,
                portfolioOptimizationObjectiveProfileSnapshots = portfolioOptimizationObjectiveProfileSnapshots,
                portfolioOptimizationCalibrationSnapshots = portfolioOptimizationCalibrationSnapshots,
                portfolioOptimizationRequests = portfolioOptimizationRequests,
                portfolioOptimizationResults = portfolioOptimizationResults,
                portfolioOptimizationDecisionRecords = portfolioOptimizationDecisionRecords,
                portfolioOptimizationOutcomeRecords = portfolioOptimizationOutcomeRecords,
                portfolioOptimizationDriftSummaries = portfolioOptimizationDriftSummaries,
                portfolioOptimizationTuningSuggestions = portfolioOptimizationTuningSuggestions,
                portfolioOptimizationTuningDecisionRecords = portfolioOptimizationTuningDecisionRecords,
                portfolioOptimizationPropagationAttemptRecords = portfolioOptimizationPropagationAttemptRecords,
                portfolioOptimizationPropagationApprovalRecords = portfolioOptimizationPropagationApprovalRecords,
                portfolioOptimizationPropagationAdoptionRecords = portfolioOptimizationPropagationAdoptionRecords,
                portfolioOptimizationLearningSyncEnvelopes = portfolioOptimizationLearningSyncEnvelopes,
                portfolioOptimizationLearningSyncAttemptRecords = portfolioOptimizationLearningSyncAttemptRecords,
                portfolioOptimizationLearningSyncConflictRecords = portfolioOptimizationLearningSyncConflictRecords,
                portfolioOptimizationConsentRecords = portfolioOptimizationConsentRecords,
                portfolioOptimizationRemoteLearningEnvelopes = portfolioOptimizationRemoteLearningEnvelopes,
                portfolioOptimizationRemoteLearningBatches = portfolioOptimizationRemoteLearningBatches,
                portfolioOptimizationRemoteLearningTransportAttemptRecords =
                    portfolioOptimizationRemoteLearningTransportAttemptRecords,
                portfolioOptimizationRemoteDestinationProfiles =
                    portfolioOptimizationRemoteDestinationProfiles,
                portfolioOptimizationRemoteDestinationDecisionRecords =
                    portfolioOptimizationRemoteDestinationDecisionRecords,
                portfolioOptimizationRemoteTransportConnectorProfiles =
                    portfolioOptimizationRemoteTransportConnectorProfiles,
                portfolioOptimizationEnterpriseKeyReferences =
                    portfolioOptimizationEnterpriseKeyReferences,
                portfolioOptimizationRemoteTransportDeadLetterRecords =
                    portfolioOptimizationRemoteTransportDeadLetterRecords,
                portfolioOptimizationComplianceAuditExportRequests =
                    portfolioOptimizationComplianceAuditExportRequests,
                portfolioOptimizationComplianceAuditExportResults =
                    portfolioOptimizationComplianceAuditExportResults,
                portfolioOptimizationComplianceExportRouteRecords =
                    portfolioOptimizationComplianceExportRouteRecords,
                portfolioOptimizationDataExchangeBundles =
                    portfolioOptimizationDataExchangeBundles,
                portfolioOptimizationDataExchangeBundleDecisionRecords =
                    portfolioOptimizationDataExchangeBundleDecisionRecords,
                portfolioOptimizationDataExchangeManifests =
                    portfolioOptimizationDataExchangeManifests,
                portfolioOptimizationCrossBoundaryApprovalRecords =
                    portfolioOptimizationCrossBoundaryApprovalRecords,
                portfolioOptimizationCrossBoundaryAuditRecords =
                    portfolioOptimizationCrossBoundaryAuditRecords,
                portfolioOptimizationDestinationTrustTierAssignments =
                    portfolioOptimizationDestinationTrustTierAssignments,
                portfolioOptimizationCrossBoundaryProgramRecords =
                    portfolioOptimizationCrossBoundaryProgramRecords,
                portfolioOptimizationCrossBoundaryGovernancePortfolios =
                    portfolioOptimizationCrossBoundaryGovernancePortfolios,
                portfolioOptimizationTrustTierProgramSummaries =
                    portfolioOptimizationTrustTierProgramSummaries,
                portfolioOptimizationJurisdictionRolloutPlans =
                    portfolioOptimizationJurisdictionRolloutPlans,
                portfolioOptimizationPortfolioBlockerSummaries =
                    portfolioOptimizationPortfolioBlockerSummaries,
                portfolioOptimizationPortfolioDependencySummaries =
                    portfolioOptimizationPortfolioDependencySummaries,
                portfolioOptimizationPortfolioConflictSummaries =
                    portfolioOptimizationPortfolioConflictSummaries,
                portfolioOptimizationPortfolioPriorityDecisions =
                    portfolioOptimizationPortfolioPriorityDecisions,
                portfolioOptimizationPortfolioCoordinationRecommendations =
                    portfolioOptimizationPortfolioCoordinationRecommendations,
                portfolioOptimizationPortfolioWaveCoordinationRecords =
                    portfolioOptimizationPortfolioWaveCoordinationRecords,
                portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries =
                    portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries,
                portfolioOptimizationRiskBudgets = portfolioOptimizationRiskBudgets,
                portfolioOptimizationTrustTierDriftSummaries =
                    portfolioOptimizationTrustTierDriftSummaries,
                portfolioOptimizationJurisdictionDriftSummaries =
                    portfolioOptimizationJurisdictionDriftSummaries,
                portfolioOptimizationDestinationRiskConcentrationSummaries =
                    portfolioOptimizationDestinationRiskConcentrationSummaries,
                portfolioOptimizationPortfolioBlockerTrendSummaries =
                    portfolioOptimizationPortfolioBlockerTrendSummaries,
                portfolioOptimizationPortfolioRiskRecommendations =
                    portfolioOptimizationPortfolioRiskRecommendations,
                portfolioOptimizationCrossBoundaryCorrectiveActionRecords =
                    portfolioOptimizationCrossBoundaryCorrectiveActionRecords,
                portfolioOptimizationPortfolioSafetyRails =
                    portfolioOptimizationPortfolioSafetyRails,
                portfolioOptimizationBudgetGuardrails =
                    portfolioOptimizationBudgetGuardrails,
                portfolioOptimizationPortfolioSafetySummaries =
                    portfolioOptimizationPortfolioSafetySummaries,
                portfolioOptimizationRemediationAutomationControls =
                    portfolioOptimizationRemediationAutomationControls,
                portfolioOptimizationFederatedAggregationSummaries = portfolioOptimizationFederatedAggregationSummaries
            )
            lastSavedState = state
        }
    }

    private fun request(
        sessionId: String = "s-1",
        userId: String = "u-1",
        sourceApp: String = "com.demo.chat",
        rawText: String,
        locale: String = "zh-CN",
        networkPolicy: NetworkPolicy = NetworkPolicy.LOCAL_FIRST,
        module: ModuleId? = null,
        constraints: AgentRequestConstraints = AgentRequestConstraints()
    ): AgentRequest {
        return AgentRequest(
            sessionId = sessionId,
            userId = userId,
            sourceApp = sourceApp,
            mode = AgentMode.AGENT_MODE,
            rawText = rawText,
            timestampMs = 1L,
            locale = locale,
            networkPolicy = networkPolicy,
            module = module,
            constraints = constraints
        )
    }

    private class FakeGateway(
        private val discoveryPayload: AgentDiscoveryPayload = AgentDiscoveryPayload(),
        private val liveSearchPayload: LiveSearchPayload = LiveSearchPayload(
            items = listOf(
                LiveSearchItem("title", "snippet", "https://example.com")
            )
        ),
        private val myAgentsPayload: LixMyAgentsPayload = LixMyAgentsPayload(ownerId = "u-1"),
        private val githubRepoCount: Int = 0,
        private val executorPayload: LixExecutorPayload = LixExecutorPayload(success = true, summary = "ok"),
        private val executeAgentResult: CloudResult<AgentExecutionPayload>? = null,
        private val lixExecutorResult: CloudResult<LixExecutorPayload>? = null,
        private val lixOffersPayload: AgentDiscoveryPayload = AgentDiscoveryPayload(),
        private val lixOffersResult: CloudResult<AgentDiscoveryPayload>? = null,
        private val lixAcceptResult: CloudResult<LixOfferAcceptPayload>? = null,
        private val serpConfigured: Boolean = true,
        private val executionPayload: AgentExecutionPayload = AgentExecutionPayload("task", "done", "ok"),
        private val lixBroadcastPayload: LixSolutionPayload = LixSolutionPayload(
            intentId = "intent_custom",
            status = "broadcasting",
            offersCount = 1
        ),
        private val lixBroadcastResult: CloudResult<LixSolutionPayload>? = null
    ) : CloudGateway {
        var discoveryCount = 0
        var liveSearchCount = 0
        var executeAgentCount = 0
        var lastLixBroadcastQuery: String? = null
        var lastLixBroadcastDomain: String? = null
        var lastLixBroadcastCapabilities: List<String> = emptyList()
        var lastLixAcceptIntentId: String? = null
        var lastLixAcceptOfferId: String? = null
        var lastGithubImportRepo: String? = null
        var lastGithubImportManifestPath: String? = null
        var lixExecutorCount = 0
        var lixOffersCount = 0

        override suspend fun discoverAgents(
            query: String,
            twinContext: TwinContext
        ): CloudResult<AgentDiscoveryPayload> {
            discoveryCount += 1
            return CloudResult(success = true, data = discoveryPayload, traceId = "trace-1")
        }

        override suspend fun executeAgent(
            task: String,
            constraints: AgentTaskConstraints
        ): CloudResult<AgentExecutionPayload> {
            executeAgentCount += 1
            return executeAgentResult ?: CloudResult(
                success = true,
                data = executionPayload,
                traceId = "trace-2"
            )
        }

        override suspend fun liveSearch(
            query: String,
            constraints: AgentTaskConstraints
        ): CloudResult<LiveSearchPayload> {
            liveSearchCount += 1
            return CloudResult(success = true, data = liveSearchPayload, traceId = "trace-3")
        }

        override suspend fun tavilySearch(query: String): CloudResult<TavilySearchPayload> {
            return CloudResult(success = true, data = TavilySearchPayload(), traceId = "trace-4")
        }

        override suspend fun lixMyAgents(ownerId: String): CloudResult<LixMyAgentsPayload> {
            return CloudResult(success = true, data = myAgentsPayload, traceId = "trace-5")
        }

        override suspend fun githubConnect(): CloudResult<com.lumi.coredomain.contract.GithubConnectPayload> {
            return CloudResult(
                success = true,
                data = com.lumi.coredomain.contract.GithubConnectPayload(connected = true, account = "demo"),
                traceId = "trace-6"
            )
        }

        override suspend fun githubRepos(): CloudResult<com.lumi.coredomain.contract.GithubRepoPayload> {
            val repos = (0 until githubRepoCount).map { index ->
                com.lumi.coredomain.contract.GithubRepoItem(
                    id = "r$index",
                    name = "repo$index",
                    fullName = "demo/repo$index",
                    privateRepo = false
                )
            }
            return CloudResult(
                success = true,
                data = com.lumi.coredomain.contract.GithubRepoPayload(repos = repos),
                traceId = "trace-7"
            )
        }

        override suspend fun githubImport(
            repoFullName: String,
            manifestPath: String
        ): CloudResult<GithubImportPayload> {
            lastGithubImportRepo = repoFullName
            lastGithubImportManifestPath = manifestPath
            return CloudResult(
                success = true,
                data = GithubImportPayload(
                    imported = true,
                    agentId = "agent_imported",
                    status = "imported"
                ),
                traceId = "trace-github-import"
            )
        }

        override suspend fun lixExecutor(query: String, domain: String): CloudResult<LixExecutorPayload> {
            lixExecutorCount += 1
            return lixExecutorResult ?: CloudResult(success = executorPayload.success, data = executorPayload, traceId = "trace-8")
        }

        override suspend fun lixBroadcast(
            query: String,
            domain: String,
            requiredCapabilities: List<String>,
            reasoningTraceId: String?,
            overflowContext: com.lumi.coredomain.contract.LixOverflowContextPayload?,
            dispatchPolicyVersion: String,
            preferPaidExpert: Boolean
        ): CloudResult<LixSolutionPayload> {
            lastLixBroadcastQuery = query
            lastLixBroadcastDomain = domain
            lastLixBroadcastCapabilities = requiredCapabilities
            return lixBroadcastResult ?: CloudResult(success = true, data = lixBroadcastPayload, traceId = "trace-11")
        }

        override suspend fun lixAcceptOffer(
            intentId: String,
            offerId: String
        ): CloudResult<LixOfferAcceptPayload> {
            lastLixAcceptIntentId = intentId
            lastLixAcceptOfferId = offerId
            return lixAcceptResult ?: CloudResult(
                success = true,
                data = LixOfferAcceptPayload(
                    intentId = intentId,
                    offerId = offerId,
                    status = "offer_accepted"
                ),
                traceId = "trace-lix-accept"
            )
        }

        override suspend fun lixOffers(intentId: String): CloudResult<AgentDiscoveryPayload> {
            lixOffersCount += 1
            return lixOffersResult ?: CloudResult(
                success = true,
                data = lixOffersPayload,
                traceId = "trace-lix-offers"
            )
        }

        override suspend fun leaderboard(window: String, sort: String): CloudResult<LeaderboardPayload> {
            return CloudResult(
                success = true,
                data = LeaderboardPayload(
                    entries = listOf(
                        LeaderboardEntry(
                            rank = 1,
                            agentId = "agent_demo",
                            agentName = "Demo Agent",
                            hotnessScore = 98.0
                        )
                    ),
                    traceId = "trace-9"
                ),
                traceId = "trace-9"
            )
        }

        override suspend fun serpStatus(): CloudResult<SerpStatusPayload> {
            return CloudResult(
                success = true,
                data = SerpStatusPayload(
                    configured = serpConfigured,
                    source = "test"
                ),
                traceId = "trace-10"
            )
        }
    }

    private class RecordingSoulStore : DigitalSoulStore {
        var lastEvent: InteractionEvent? = null

        override fun onRequest(userId: String, intent: IntentType, locale: String) = Unit

        override fun onEvent(event: InteractionEvent) {
            lastEvent = event
        }

        override fun summary(userId: String): DigitalSoulSummary {
            return DigitalSoulSummary(
                userId = userId,
                profileLabel = "x",
                topTraits = listOf(TraitScore("a", 1.0)),
                updatedAtMs = 1L
            )
        }

        override fun toTwinContext(userId: String, locale: String): TwinContext {
            return TwinContext(userId = userId, locale = locale)
        }
    }
}

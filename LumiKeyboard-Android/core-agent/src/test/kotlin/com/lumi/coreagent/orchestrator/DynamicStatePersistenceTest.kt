package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AgentMode
import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.GovernanceActionType
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.L1CoreStatePayload
import com.lumi.coredomain.contract.L2ContextStatePayload
import com.lumi.coredomain.contract.L3EmotionStatePayload
import com.lumi.coredomain.contract.LedgerQueryFilter
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyProfile
import com.lumi.coredomain.contract.RoleChangeReason
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.AlertDeliveryRecord
import com.lumi.coredomain.contract.AlertRoutingRecord
import com.lumi.coredomain.contract.AlertRoutingTarget
import com.lumi.coredomain.contract.AlertRoutingTargetType
import com.lumi.coredomain.contract.AlertRoutingStatus
import com.lumi.coredomain.contract.CutoverReadinessStatus
import com.lumi.coredomain.contract.CutoverReadinessSummary
import com.lumi.coredomain.contract.DirectoryCutoverBlockReason
import com.lumi.coredomain.contract.DirectoryCutoverCheck
import com.lumi.coredomain.contract.EnterpriseFallbackPolicy
import com.lumi.coredomain.contract.EnterpriseRolloutStage
import com.lumi.coredomain.contract.ExecutionDegradationMode
import com.lumi.coredomain.contract.GovernanceCaseCollaborationState
import com.lumi.coredomain.contract.ReconciliationJobRecord
import com.lumi.coredomain.contract.RemoteOperatorHandoffRecord
import com.lumi.coredomain.contract.TenantRolloutProfile
import com.lumi.coredomain.contract.TelemetryEmissionRecord
import com.lumi.coredomain.contract.PortfolioScenarioComparison
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioScenarioModification
import com.lumi.coredomain.contract.PortfolioScenarioModificationType
import com.lumi.coredomain.contract.PortfolioOptimizationCandidateSchedule
import com.lumi.coredomain.contract.PortfolioOptimizationConstraintProfile
import com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationResult
import com.lumi.coredomain.contract.PortfolioOptimizationResultStatus
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.DisputeCaseRecord
import com.lumi.coredomain.contract.DisputeStatus
import com.lumi.coredomain.contract.DirectorySyncSnapshot
import com.lumi.coredomain.contract.DirectorySyncStatus
import com.lumi.coredomain.contract.EnterpriseDirectorySource
import com.lumi.coredomain.contract.ConnectorCredentialLifecycleState
import com.lumi.coredomain.contract.ConnectorCredentialLifecycleSummary
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.MarketplaceReconciliationSummary
import com.lumi.coredomain.contract.MarketplaceSyncIssue
import com.lumi.coredomain.contract.ProviderAckRecord
import com.lumi.coredomain.contract.ProviderAckStatus
import com.lumi.coredomain.contract.SettlementRecord
import com.lumi.coredomain.contract.SettlementReconciliationResult
import com.lumi.coredomain.contract.SettlementStatus
import com.lumi.coredomain.contract.SettlementSyncState
import com.lumi.coredomain.contract.SessionAuthContext
import com.lumi.coredomain.contract.SessionAuthority
import com.lumi.coredomain.contract.SessionFreshnessState
import com.lumi.coredomain.contract.TelemetryDeliveryStatus
import com.lumi.coredomain.contract.ReconciliationJobStatus
import com.lumi.coredomain.contract.RemoteSyncHandoffStatus
import com.lumi.coredomain.contract.AlertDispatchStatus
import com.lumi.coredomain.contract.VaultCredentialMaterialState
import com.lumi.coredomain.contract.VaultCredentialStatus
import com.lumi.coredomain.contract.VaultHealthSummary
import com.lumi.coredomain.contract.VaultLeaseStatus
import com.lumi.coredomain.contract.VaultResolutionResult
import com.lumi.coredomain.contract.WorkspaceRolloutProfile
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DynamicStatePersistenceTest {

    @Test
    fun `restores persisted state only once per user`() {
        val restoredState = DynamicHumanStatePayload(
            l1 = L1CoreStatePayload(profileId = "p1", valueAnchor = "growth", riskPreference = 0.62),
            l2 = L2ContextStatePayload(sourceApp = "com.demo.chat", appCategory = "chat", energyLevel = 0.71, contextLoad = 0.43),
            l3 = L3EmotionStatePayload(stressScore = 28, polarity = 0.2, focusScore = 73),
            updatedAtMs = 1234L
        )
        val restoredTrajectory = listOf(
            TrajectoryPointPayload(ts = 1200L, value = 0.53, label = "state_update"),
            TrajectoryPointPayload(ts = 1234L, value = 0.58, label = "state_update")
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                dynamicState = restoredState,
                trajectory = restoredTrajectory,
                activeRole = UserRole.WORK,
                roleSource = RoleSource.EXPLICIT_USER_SELECTION
            )
        )

        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = port,
            nowMs = { 1300L }
        )

        assertEquals(restoredState, orchestrator.getDynamicState("u-restore"))
        assertEquals(restoredTrajectory, orchestrator.getTrajectory("u-restore", 7))
        assertEquals(1, port.loadCount)

        // Second read should not trigger another load for the same user.
        orchestrator.getDynamicState("u-restore")
        assertEquals(1, port.loadCount)
    }

    @Test
    fun `restores active role and source through process death continuity`() = runTest {
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                activeRole = UserRole.PARENT,
                roleSource = RoleSource.USER_PROFILE_DEFAULT
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val response = orchestrator.handleRequest(
            request = AgentRequest(
                sessionId = "s-role-1",
                userId = "u-role-restore",
                sourceApp = "com.demo.chat",
                mode = AgentMode.AGENT_MODE,
                rawText = "Summarize this plan with safe language",
                timestampMs = 10L,
                locale = "en-US",
                networkPolicy = NetworkPolicy.LOCAL_FIRST,
                module = ModuleId.CHAT
            ),
            cloudGateway = null
        )

        assertEquals(UserRole.PARENT, response.activeRole)
        assertEquals(RoleSource.USER_PROFILE_DEFAULT, response.roleSource)
        assertEquals(RoleChangeReason.SYSTEM_RECOVERY, response.roleChangeReason)
        assertEquals(UserRole.PARENT, response.executionReceipt?.activeRole)
        assertEquals(RoleSource.USER_PROFILE_DEFAULT, response.executionReceipt?.roleSource)
        assertEquals(RoleChangeReason.SYSTEM_RECOVERY, response.executionReceipt?.roleChangeReason)
    }

    @Test
    fun `persists dynamic state after request handling`() = runTest {
        val port = FakePersistencePort()
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        orchestrator.handleRequest(
            request = request(
                rawText = "Plan my next week focus tasks",
                stateVector = DynamicHumanStatePayload(
                    l1 = L1CoreStatePayload(profileId = "p_seed", valueAnchor = "balanced", riskPreference = 0.55),
                    l2 = L2ContextStatePayload(sourceApp = "com.demo.chat", appCategory = "chat", energyLevel = 0.6, contextLoad = 0.4),
                    l3 = L3EmotionStatePayload(stressScore = 22, polarity = 0.1, focusScore = 70),
                    updatedAtMs = 2L
                )
            ),
            cloudGateway = null
        )

        assertTrue(port.saveCalls.isNotEmpty())
        val last = port.saveCalls.last()
        assertEquals("u-1", last.userId)
        assertNotNull(last.dynamicState)
        assertTrue(last.trajectory.isNotEmpty())
    }

    @Test
    fun `restores persisted role policy overrides for avatar snapshot`() {
        val persistedProfile = RolePolicyProfile(
            role = UserRole.WORK,
            approvalPolicy = RolePolicyProfile(role = UserRole.WORK).approvalPolicy.copy(
                delegationMode = DelegationMode.AUTONOMOUS_WITHIN_POLICY,
                autoApprovalBudgetLimit = 900.0,
                maxExternalBudget = 9_000.0
            ),
            delegationPolicy = RolePolicyProfile(role = UserRole.WORK).delegationPolicy.copy(
                mode = DelegationMode.AUTONOMOUS_WITHIN_POLICY
            )
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                activeRole = UserRole.WORK,
                roleSource = RoleSource.USER_PROFILE_DEFAULT,
                rolePolicyOverrides = mapOf(UserRole.WORK to persistedProfile)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val editorState = orchestrator.getRolePolicyEditorState("u-policy-restore", UserRole.WORK)
        assertEquals(DelegationMode.AUTONOMOUS_WITHIN_POLICY, editorState.effectivePolicy.delegationPolicy.mode)
        assertEquals(9_000.0, editorState.effectivePolicy.approvalPolicy.maxExternalBudget)
    }

    @Test
    fun `persists role policy overrides when role policy is updated`() {
        val port = FakePersistencePort()
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val result = orchestrator.updateRolePolicy(
            userId = "u-role-policy-save",
            role = UserRole.BUYER,
            draft = RolePolicyDraft(
                delegationMode = DelegationMode.SUPERVISED,
                requiresConfirmationTokenForExternalSpend = true,
                autoApprovalBudgetLimit = 250.0,
                maxExternalBudget = 2_500.0
            )
        )

        assertTrue(result.saved)
        val last = port.saveCalls.last()
        assertTrue(last.rolePolicyOverrides.containsKey(UserRole.BUYER))
        assertEquals(2_500.0, last.rolePolicyOverrides[UserRole.BUYER]?.approvalPolicy?.maxExternalBudget)
    }

    @Test
    fun `reset role policy clears persisted override`() {
        val port = FakePersistencePort()
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val update = orchestrator.updateRolePolicy(
            userId = "u-role-policy-reset",
            role = UserRole.WORK,
            draft = RolePolicyDraft(
                maxExternalBudget = 2_000.0,
                autoApprovalBudgetLimit = 100.0
            )
        )
        assertTrue(update.saved)
        assertTrue(port.saveCalls.last().rolePolicyOverrides.containsKey(UserRole.WORK))

        val reset = orchestrator.resetRolePolicy(
            userId = "u-role-policy-reset",
            role = UserRole.WORK
        )
        assertTrue(reset.saved)
        assertTrue(port.saveCalls.last().rolePolicyOverrides.isEmpty())
    }

    @Test
    fun `persists and restores execution ledger records across process death`() = runTest {
        val savePort = FakePersistencePort()
        val writer = AgentOrchestrator(dynamicStatePersistence = savePort)
        val response = writer.handleRequest(
            request = AgentRequest(
                sessionId = "s-ledger",
                userId = "u-ledger",
                sourceApp = "com.demo.chat",
                mode = AgentMode.AGENT_MODE,
                rawText = "Compare providers and keep proof links.",
                timestampMs = 1L,
                locale = "en-US",
                networkPolicy = NetworkPolicy.LOCAL_FIRST,
                module = ModuleId.CHAT
            ),
            cloudGateway = null
        )
        val persistedLedger = savePort.saveCalls.last().executionLedgerRecords
        assertTrue(persistedLedger.isNotEmpty())
        assertEquals(response.traceId, persistedLedger.last().runId)

        val restorePort = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = persistedLedger
            )
        )
        val reader = AgentOrchestrator(dynamicStatePersistence = restorePort)
        val restoredLedger = reader.getExecutionLedger("u-ledger")
        assertTrue(restoredLedger.isNotEmpty())
        assertEquals(response.traceId, restoredLedger.first().runId)
    }

    @Test
    fun `restore continuity keeps m31 capacity planning fields queryable`() {
        val runId = "run_m31_restore"
        val record = ExecutionReceiptRecord(
            recordId = "record_m31_restore",
            runId = runId,
            userId = "u-m31-restore",
            sessionId = "s-m31-restore",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = com.lumi.coredomain.contract.ExecutionReceipt(
                runId = runId,
                intentSummary = "Capacity restore continuity",
                status = com.lumi.coredomain.contract.ResponseStatus.WAITING_USER,
                activeRole = UserRole.WORK,
                roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                delegationMode = DelegationMode.SUPERVISED,
                roleImpactReasonCodes = listOf(
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_GOVERNANCE_APPROVAL_QUEUE_SATURATED,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_GOVERNANCE_CAPACITY_BLOCKED
                ),
                roleImpactSummary = "Capacity-aware governance deferred this run.",
                approvalSummary = "Approval pending due to explicit policy gate.",
                dataScopeSummary = "No additional data-scope restrictions.",
                providerSummary = "No provider decision recorded.",
                verificationSummary = "No verification required.",
                proofSummary = "No proof artifacts required.",
                rollbackSummary = "No rollback action triggered.",
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
                    nextAvailableAtMs = 1_700_000_002_000,
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
                capacityAwarePromotionDecision = com.lumi.coredomain.contract.CapacityAwarePromotionDecision(
                    decisionId = "decision_m31_restore",
                    allowedNow = false,
                    capacityBlocked = true,
                    policyBlocked = true,
                    decisionType = com.lumi.coredomain.contract.ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
                    deferralReason = com.lumi.coredomain.contract.ApprovalDeferralReason.QUEUE_SATURATED,
                    summary = "Promotion blocked by capacity and policy."
                ),
                approvalLoadSummary = "Approval queue is saturated for workspace_finance.",
                capacityBlockSummary = "Capacity blocked by approval slot limits.",
                policyBlockSummary = "Policy gate still requires explicit approval.",
                capacityBalancingSummary = "Balancing deferred this run and reassigned lower-priority approvals.",
                portfolioCapacitySummary = "Portfolio bottleneck detected across active programs."
            ),
            createdAtMs = 1_700_000_001_000,
            updatedAtMs = 1_700_000_001_200
        )
        val restorePort = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = restorePort)

        val restoredLedger = orchestrator.getExecutionLedger("u-m31-restore")
        assertEquals(1, restoredLedger.size)
        assertEquals("workspace_finance", restoredLedger.first().receipt?.governanceCapacityPool?.poolKey)
        assertEquals(
            com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED,
            restoredLedger.first().receipt?.approvalQueuePressure?.loadBucket
        )

        val filteredCases = orchestrator.getGovernanceCases(
            userId = "u-m31-restore",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                capacityPoolKey = "workspace_finance",
                approvalLoadBucket = com.lumi.coredomain.contract.ApprovalLoadBucket.SATURATED,
                capacityBlockedOnly = true,
                policyBlockedOnly = true,
                limit = 20
            )
        )
        assertTrue(filteredCases.any { it.summary.runId == runId })
    }

    @Test
    fun `restore continuity keeps workflow collaboration and automation artifacts`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m19",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            stageHistory = listOf(
                com.lumi.coredomain.contract.OperatorWorkflowStageRecord(
                    stage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_PROVIDER,
                    status = com.lumi.coredomain.contract.OperatorWorkflowStepStatus.COMPLETED,
                    summary = "Provider callback reviewed.",
                    enteredAtMs = 1704011000L
                ),
                com.lumi.coredomain.contract.OperatorWorkflowStageRecord(
                    stage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
                    status = com.lumi.coredomain.contract.OperatorWorkflowStepStatus.IN_PROGRESS,
                    summary = "Waiting for sync acknowledgement.",
                    enteredAtMs = 1704011010L
                )
            ),
            policyProfile = com.lumi.coredomain.contract.WorkflowPolicyProfile(
                policyId = "wf_policy_provider_follow_up",
                version = "m20_v1",
                summary = "Provider follow-up policy is active."
            ),
            slaClock = com.lumi.coredomain.contract.WorkflowSlaClock(
                startedAtMs = 1704011000L,
                dueAtMs = 1704014600L,
                warningAtMs = 1704014300L,
                status = com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED,
                breachedAtMs = 1704014600L,
                summary = "SLA is breached and requires escalation handling."
            ),
            stageTimer = com.lumi.coredomain.contract.WorkflowStageTimerState(
                status = com.lumi.coredomain.contract.WorkflowStageTimerStatus.OVERDUE,
                startedAtMs = 1704011010L,
                dueAtMs = 1704012810L,
                summary = "Stage timer is overdue for waiting sync."
            ),
            escalationTimer = com.lumi.coredomain.contract.WorkflowEscalationTimerState(
                status = com.lumi.coredomain.contract.WorkflowEscalationTimerStatus.REQUIRED,
                dueAtMs = 1704012810L,
                triggeredAtMs = 1704012810L,
                summary = "Escalation is required by workflow policy."
            ),
            automationGuardrailDecision = com.lumi.coredomain.contract.WorkflowAutomationGuardrailDecision(
                status = com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus.BLOCKED,
                summary = "Automation blocked by workflow guardrails.",
                reasonCodes = listOf(
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_AUTOMATION_BLOCKED,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_SLA_BREACHED
                ),
                evaluatedAtMs = 1704011020L,
                nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually."
            ),
            workflowPolicySummary = "Provider follow-up policy is active.",
            slaSummary = "SLA is breached and requires escalation handling.",
            stageTimerSummary = "Stage timer is overdue for waiting sync.",
            escalationTimerSummary = "Escalation is required by workflow policy.",
            automationGuardrailSummary = "Automation blocked by workflow guardrails.",
            automationSuppressionSummary = "Automation suppressed because SLA is breached.",
            nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually.",
            nextAction = com.lumi.coredomain.contract.WorkflowNextActionSuggestion(
                title = "Run retry sync intent",
                detail = "Request retry and verify reconciliation acknowledgement.",
                action = GovernanceActionType.RETRY_SYNC_INTENT,
                automationEligible = true
            ),
            updatedAtMs = 1704011020L
        )
        val collaborationEvent = com.lumi.coredomain.contract.GovernanceCollaborationEventRecord(
            eventId = "collab_restore_m19",
            type = com.lumi.coredomain.contract.GovernanceCollaborationEventType.WORKFLOW_STAGE_CHANGED,
            actor = com.lumi.coredomain.contract.GovernanceCollaborationActor(
                actorId = "ops_restore",
                displayName = "Ops Restore",
                source = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.HUMAN_OPERATOR
            ),
            summary = "Workflow advanced to waiting sync.",
            reasonCodes = listOf("ROLE_WORKFLOW_STAGE_CHANGED"),
            workflowStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            timestampMs = 1704011020L
        )
        val automationAudit = com.lumi.coredomain.contract.RemoteOpsAutomationAuditRecord(
            auditId = "automation_restore_m19",
            ruleId = "auto_sync_pending",
            trigger = com.lumi.coredomain.contract.RemoteOpsAutomationTrigger.SYNC_PENDING,
            action = GovernanceActionType.RETRY_SYNC_INTENT,
            status = com.lumi.coredomain.contract.RemoteOpsAutomationDecisionStatus.EXECUTED,
            summary = "Automation executed retry sync intent.",
            source = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.LOCAL_AUTOMATION,
            reasonCodes = listOf("ROLE_AUTOMATION_ACTION_EXECUTED"),
            timestampMs = 1704011021L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m19",
            runId = "run_restore_m19",
            userId = "u-ledger-m19",
            sessionId = "s-ledger-m19",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m19",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                collaborationEvents = listOf(collaborationEvent),
                automationAudit = listOf(automationAudit),
                updatedAtMs = 1704011021L
            ),
            workflowRun = workflowRun,
            collaborationEvents = listOf(collaborationEvent),
            automationAudit = listOf(automationAudit),
            updatedAtMs = 1704011021L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m19",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                limit = 10,
                includeReviewed = true
            )
        ).first { it.summary.runId == "run_restore_m19" }
        assertEquals("Provider Follow-up", restoredCase.summary.workflowTemplateName)
        assertEquals(
            com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            restoredCase.summary.workflowStage
        )
        assertTrue(restoredCase.workflowSummary.contains("Stage waiting sync", ignoreCase = true))
        assertEquals(
            com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED,
            restoredCase.summary.slaStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.WorkflowStageTimerStatus.OVERDUE,
            restoredCase.summary.stageTimerStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.WorkflowEscalationTimerStatus.REQUIRED,
            restoredCase.summary.escalationTimerStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus.BLOCKED,
            restoredCase.summary.automationEligibility
        )
        assertTrue(restoredCase.workflowPolicySummary.contains("policy", ignoreCase = true))
        assertTrue(restoredCase.slaSummary.contains("breached", ignoreCase = true))
        assertTrue(restoredCase.automationGuardrailSummary.contains("blocked", ignoreCase = true))
        assertTrue(restoredCase.nextRequiredHumanAction.isNotBlank())
        assertNotNull(restoredCase.latestCollaborationEvent)
        assertNotNull(restoredCase.latestAutomationAudit)

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m19",
            filter = LedgerQueryFilter(runId = "run_restore_m19")
        ).first()
        assertNotNull(restoredLedger.workflowRun)
        assertTrue(restoredLedger.collaborationEvents.isNotEmpty())
        assertTrue(restoredLedger.automationAudit.isNotEmpty())
        assertEquals(
            com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED,
            restoredLedger.workflowRun?.slaClock?.status
        )
        assertEquals(
            com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus.BLOCKED,
            restoredLedger.workflowRun?.automationGuardrailDecision?.status
        )
    }

    @Test
    fun `restore continuity keeps m21 policy pack override and simulation provenance`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m21",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyProfile = com.lumi.coredomain.contract.WorkflowPolicyProfile(
                policyId = "wf_policy_provider_follow_up",
                version = "m21_v1",
                summary = "M21 resolved workflow policy is active."
            ),
            policyPack = com.lumi.coredomain.contract.WorkflowPolicyPack(
                packId = "pack_m21_workspace",
                name = "Workspace Ops Pack",
                scope = com.lumi.coredomain.contract.WorkflowPolicyPackScope.WORKSPACE,
                activationState = com.lumi.coredomain.contract.WorkflowPolicyPackActivationState.SIMULATION_ONLY,
                activeVersionId = "v_m21_1",
                summary = "Workspace policy pack in simulation-only mode."
            ),
            policyPackBinding = com.lumi.coredomain.contract.WorkflowPolicyPackBinding(
                bindingId = "binding_m21_workspace",
                packId = "pack_m21_workspace",
                versionId = "v_m21_1",
                scope = com.lumi.coredomain.contract.WorkflowPolicyPackScope.WORKSPACE,
                workspaceId = "workspace_ops",
                activationState = com.lumi.coredomain.contract.WorkflowPolicyPackActivationState.SIMULATION_ONLY,
                precedence = 30,
                summary = "Workspace pack binding is active."
            ),
            tenantOverride = com.lumi.coredomain.contract.TenantWorkflowPolicyOverride(
                overrideId = "tenant_override_m21",
                tenantId = "tenant_default",
                workflowTemplateId = "wf_provider_follow_up",
                source = com.lumi.coredomain.contract.WorkflowPolicyOverrideSource.TENANT_ADMIN,
                approvalState = com.lumi.coredomain.contract.WorkflowPolicyOverrideApprovalState.APPROVED,
                summary = "Tenant override applied."
            ),
            workspaceOverride = com.lumi.coredomain.contract.WorkspaceWorkflowPolicyOverride(
                overrideId = "workspace_override_m21",
                workspaceId = "workspace_ops",
                workflowTemplateId = "wf_provider_follow_up",
                source = com.lumi.coredomain.contract.WorkflowPolicyOverrideSource.WORKSPACE_ADMIN,
                approvalState = com.lumi.coredomain.contract.WorkflowPolicyOverrideApprovalState.APPROVED,
                summary = "Workspace override applied."
            ),
            advancedAutomationControls = com.lumi.coredomain.contract.WorkflowAutomationAdvancedControls(
                maxRunsPerCase = 0,
                simulationOnly = true,
                summary = "Automation runs in simulation-only mode."
            ),
            policyResolution = com.lumi.coredomain.contract.WorkflowPolicyResolutionTrace(
                precedenceSource = com.lumi.coredomain.contract.WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
                packId = "pack_m21_workspace",
                packVersionId = "v_m21_1",
                bindingId = "binding_m21_workspace",
                tenantOverrideId = "tenant_override_m21",
                workspaceOverrideId = "workspace_override_m21",
                simulationOnly = true,
                reasonCodes = listOf(
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_WORKFLOW_POLICY_PACK_APPLIED,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_WORKFLOW_TENANT_OVERRIDE_APPLIED,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_WORKFLOW_WORKSPACE_OVERRIDE_APPLIED,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_AUTOMATION_SIMULATION_ONLY
                ),
                summary = "Explicit case constraints took precedence over workspace and tenant overrides."
            ),
            policyPackSummary = "Workflow policy pack Workspace Ops Pack (v_m21_1) is simulation only.",
            policyOverrideSummary = "Workspace override superseded tenant override.",
            automationControlSummary = "Automation controls set to simulation-only with max runs/case 0.",
            policyResolutionSummary = "Policy resolution used explicit case constraints over workspace/tenant defaults.",
            workflowSimulationOnly = true,
            updatedAtMs = 1705012000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m21",
            runId = "run_restore_m21",
            userId = "u-ledger-m21",
            sessionId = "s-ledger-m21",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m21",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1705012000L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1705012000L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m21",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                limit = 10,
                includeReviewed = true
            )
        ).first { it.summary.runId == "run_restore_m21" }
        assertEquals("pack_m21_workspace", restoredCase.summary.workflowPolicyPackId)
        assertEquals("v_m21_1", restoredCase.summary.workflowPolicyPackVersion)
        assertEquals(
            com.lumi.coredomain.contract.WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
            restoredCase.summary.workflowPolicyPrecedenceSource
        )
        assertTrue(restoredCase.summary.workflowSimulationOnly)
        assertTrue(restoredCase.workflowPolicyPackSummary.contains("pack", ignoreCase = true))
        assertTrue(restoredCase.workflowOverrideSummary.contains("override", ignoreCase = true))
        assertTrue(restoredCase.workflowAutomationControlSummary.contains("simulation", ignoreCase = true))
        assertTrue(restoredCase.workflowPolicyResolutionSummary.contains("explicit", ignoreCase = true))

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m21",
            filter = LedgerQueryFilter(runId = "run_restore_m21")
        ).first()
        assertEquals("pack_m21_workspace", restoredLedger.workflowRun?.policyPack?.packId)
        assertEquals("v_m21_1", restoredLedger.workflowRun?.policyPackBinding?.versionId)
        assertEquals("tenant_override_m21", restoredLedger.workflowRun?.tenantOverride?.overrideId)
        assertEquals("workspace_override_m21", restoredLedger.workflowRun?.workspaceOverride?.overrideId)
        assertTrue(restoredLedger.workflowRun?.workflowSimulationOnly == true)
    }

    @Test
    fun `restore continuity keeps m22 rollout approval freeze and rollback governance state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m22",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
                stage = com.lumi.coredomain.contract.PolicyRolloutStage.FROZEN,
                mode = com.lumi.coredomain.contract.PolicyRolloutMode.ENFORCED,
                target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.TENANT,
                    tenantId = "tenant_alpha",
                    workflowTemplateId = "wf_provider_follow_up",
                    summary = "Tenant rollout target for provider follow-up."
                ),
                approvalRequirement = com.lumi.coredomain.contract.PolicyRolloutApprovalRequirement.REQUIRED_FOR_PROMOTION,
                approvalState = com.lumi.coredomain.contract.PolicyRolloutApprovalState.PENDING,
                freezeState = com.lumi.coredomain.contract.PolicyRolloutFreezeState.FROZEN_BY_OPERATOR,
                rollbackRecord = com.lumi.coredomain.contract.PolicyRolloutRollbackRecord(
                    rollbackId = "rollback_m22_1",
                    fromStage = com.lumi.coredomain.contract.PolicyRolloutStage.ENFORCED,
                    toStage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                    fromMode = com.lumi.coredomain.contract.PolicyRolloutMode.ENFORCED,
                    toMode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
                    reason = "Rollback restored staged rollout after incident.",
                    summary = "Policy rollout rolled back to staged mode."
                ),
                auditRecords = listOf(
                    com.lumi.coredomain.contract.PolicyRolloutAuditRecord(
                        auditId = "audit_m22_approval_request",
                        action = com.lumi.coredomain.contract.PolicyRolloutAuditAction.APPROVAL_REQUESTED,
                        summary = "Policy rollout approval requested."
                    ),
                    com.lumi.coredomain.contract.PolicyRolloutAuditRecord(
                        auditId = "audit_m22_frozen",
                        action = com.lumi.coredomain.contract.PolicyRolloutAuditAction.FROZEN,
                        summary = "Policy rollout frozen by operator."
                    )
                ),
                summary = "Workflow policy rollout is frozen in enforced mode for tenant scope.",
                updatedAtMs = 1706012000L
            ),
            workflowRolloutSummary = "Workflow policy rollout is frozen in enforced mode for tenant scope.",
            workflowRolloutApprovalSummary = "Rollout approval is pending before risky promotion or scope expansion.",
            workflowRolloutFreezeSummary = "Rollout is frozen by operator pending manual governance review.",
            workflowRolloutRollbackSummary = "Policy rollout rolled back to staged mode.",
            workflowSimulationOnly = true,
            updatedAtMs = 1706012000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m22",
            runId = "run_restore_m22",
            userId = "u-ledger-m22",
            sessionId = "s-ledger-m22",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m22",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1706012000L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1706012000L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m22",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                workflowRolloutStage = com.lumi.coredomain.contract.PolicyRolloutStage.FROZEN,
                workflowRolloutMode = com.lumi.coredomain.contract.PolicyRolloutMode.ENFORCED,
                workflowRolloutScope = com.lumi.coredomain.contract.PolicyRolloutScope.TENANT,
                workflowRolloutApprovalState = com.lumi.coredomain.contract.PolicyRolloutApprovalState.PENDING,
                workflowRolloutFrozenOnly = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m22" }
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutStage.FROZEN,
            restoredCase.summary.workflowRolloutStage
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutMode.ENFORCED,
            restoredCase.summary.workflowRolloutMode
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutScope.TENANT,
            restoredCase.summary.workflowRolloutScope
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutApprovalState.PENDING,
            restoredCase.summary.workflowRolloutApprovalState
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutFreezeState.FROZEN_BY_OPERATOR,
            restoredCase.summary.workflowRolloutFreezeState
        )
        assertTrue(restoredCase.workflowRolloutSummary.contains("frozen", ignoreCase = true))
        assertTrue(restoredCase.workflowRolloutApprovalSummary.contains("pending", ignoreCase = true))
        assertTrue(restoredCase.workflowRolloutFreezeSummary.contains("frozen", ignoreCase = true))
        assertTrue(restoredCase.workflowRolloutRollbackSummary.contains("rolled back", ignoreCase = true))
        assertTrue(restoredCase.workflowPolicyRolloutState?.auditRecords?.size == 2)

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m22",
            filter = LedgerQueryFilter(runId = "run_restore_m22")
        ).first()
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutStage.FROZEN,
            restoredLedger.workflowRun?.policyRolloutState?.stage
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutMode.ENFORCED,
            restoredLedger.workflowRun?.policyRolloutState?.mode
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutScope.TENANT,
            restoredLedger.workflowRun?.policyRolloutState?.target?.scope
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutApprovalState.PENDING,
            restoredLedger.workflowRun?.policyRolloutState?.approvalState
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutFreezeState.FROZEN_BY_OPERATOR,
            restoredLedger.workflowRun?.policyRolloutState?.freezeState
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
            restoredLedger.workflowRun?.policyRolloutState?.rollbackRecord?.toMode
        )
    }

    @Test
    fun `restore continuity keeps identity auth provenance and credential lifecycle`() {
        val directorySync = DirectorySyncSnapshot(
            snapshotId = "dir_sync_restore_m14",
            source = EnterpriseDirectorySource.ENTERPRISE_DIRECTORY_CACHE,
            status = DirectorySyncStatus.STALE,
            directoryVersion = "enterprise_v14",
            syncedAtMs = 1704010000L,
            summary = "Directory sync is stale; fallback safeguards are active."
        )
        val sessionAuth = SessionAuthContext(
            sessionRef = "session_restore_m14",
            authority = SessionAuthority.LOCAL_FALLBACK_POLICY,
            freshness = SessionFreshnessState.STALE,
            issuedAtMs = 1704010000L,
            validatedAtMs = 1704010010L,
            summary = "Authorization used local fallback because remote directory is stale."
        )
        val credentialLifecycle = ConnectorCredentialLifecycleSummary(
            state = ConnectorCredentialLifecycleState.ROTATION_REQUIRED,
            summary = "Connector credential rotation is required.",
            rotationRequired = true,
            evaluatedAtMs = 1704010015L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m14",
            runId = "run_restore_m14",
            userId = "u-ledger-m14",
            sessionId = "s-ledger-m14",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            directorySyncSnapshot = directorySync,
            sessionAuthContext = sessionAuth,
            connectorCredentialLifecycle = credentialLifecycle
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restored = orchestrator.getExecutionLedger(
            userId = "u-ledger-m14",
            filter = LedgerQueryFilter(runId = "run_restore_m14")
        ).first()
        assertEquals(DirectorySyncStatus.STALE, restored.directorySyncSnapshot?.status)
        assertEquals(SessionAuthority.LOCAL_FALLBACK_POLICY, restored.sessionAuthContext?.authority)
        assertEquals(ConnectorCredentialLifecycleState.ROTATION_REQUIRED, restored.connectorCredentialLifecycle?.state)
    }

    @Test
    fun `restore continuity keeps m16 rollout cutover vault and fallback traceability`() {
        val tenantRollout = TenantRolloutProfile(
            tenantId = "tenant_restore_m16",
            workspaceId = "workspace_restore_m16",
            stage = EnterpriseRolloutStage.CANARY,
            dryRunOnly = false,
            updatedAtMs = 1705010000L,
            summary = "Enterprise rollout stage canary with guarded allowlist."
        )
        val workspaceRollout = WorkspaceRolloutProfile(
            workspaceId = "workspace_restore_m16",
            stage = EnterpriseRolloutStage.CANARY,
            cutoverStatus = CutoverReadinessStatus.NOT_READY,
            degradationMode = ExecutionDegradationMode.LOCAL_FALLBACK,
            updatedAtMs = 1705010010L,
            summary = "Workspace cutover not ready; fallback remains active."
        )
        val cutoverReadiness = CutoverReadinessSummary(
            status = CutoverReadinessStatus.NOT_READY,
            blockReasons = listOf(DirectoryCutoverBlockReason.DIRECTORY_STALE),
            checks = listOf(
                DirectoryCutoverCheck(
                    checkId = "check_restore_m16",
                    name = "Directory freshness",
                    status = CutoverReadinessStatus.NOT_READY,
                    summary = "Directory freshness check failed."
                )
            ),
            updatedAtMs = 1705010020L,
            summary = "Cutover readiness blocked by stale directory state."
        )
        val vaultHealth = VaultHealthSummary(
            status = VaultLeaseStatus.EXPIRING,
            summary = "Vault runtime degraded; lease renewal required.",
            lastCheckedAtMs = 1705010030L
        )
        val vaultResolution = VaultResolutionResult(
            resolutionId = "vault_resolution_restore_m16",
            credentialId = "cred_restore_m16",
            vaultProvider = "hashicorp_vault",
            status = VaultCredentialStatus.ROTATION_DUE,
            materialState = VaultCredentialMaterialState.MATERIAL_WITHHELD,
            health = vaultHealth,
            summary = "Vault metadata resolved without exposing secret material."
        )
        val fallbackPolicy = EnterpriseFallbackPolicy(
            localFirst = true,
            degradationMode = ExecutionDegradationMode.LOCAL_FALLBACK,
            summary = "Local-first fallback remains active during cutover block."
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m16",
            runId = "run_restore_m16",
            userId = "u-ledger-m16",
            sessionId = "s-ledger-m16",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.PARTIAL,
            tenantRolloutProfile = tenantRollout,
            workspaceRolloutProfile = workspaceRollout,
            cutoverReadiness = cutoverReadiness,
            vaultHealth = vaultHealth,
            vaultResolution = vaultResolution,
            fallbackPolicy = fallbackPolicy,
            alertRoutingRecords = listOf(
                AlertRoutingRecord(
                    recordId = "routing_restore_m16",
                    runId = "run_restore_m16",
                    alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    status = AlertRoutingStatus.LOCAL_ONLY,
                    tenantRolloutProfile = tenantRollout,
                    workspaceRolloutProfile = workspaceRollout,
                    cutoverReadiness = cutoverReadiness,
                    fallbackPolicy = fallbackPolicy,
                    vaultHealth = vaultHealth,
                    vaultResolutions = listOf(vaultResolution),
                    targets = listOf(
                        AlertRoutingTarget(
                            targetId = "slack_restore_m16",
                            targetType = AlertRoutingTargetType.SLACK_STUB,
                            credentialRouteBlockReason = com.lumi.coredomain.contract.CredentialRouteBlockReason.CUTOVER_NOT_READY
                        )
                    )
                )
            )
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(executionLedgerRecords = listOf(record))
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restored = orchestrator.getExecutionLedger(
            userId = "u-ledger-m16",
            filter = LedgerQueryFilter(runId = "run_restore_m16")
        ).first()

        assertEquals(EnterpriseRolloutStage.CANARY, restored.tenantRolloutProfile?.stage)
        assertEquals(CutoverReadinessStatus.NOT_READY, restored.cutoverReadiness?.status)
        assertEquals(VaultLeaseStatus.EXPIRING, restored.vaultHealth?.status)
        assertEquals(VaultCredentialStatus.ROTATION_DUE, restored.vaultResolution?.status)
        assertEquals(ExecutionDegradationMode.LOCAL_FALLBACK, restored.fallbackPolicy?.degradationMode)
        assertEquals(
            com.lumi.coredomain.contract.CredentialRouteBlockReason.CUTOVER_NOT_READY,
            restored.alertRoutingRecords.first().targets.first().credentialRouteBlockReason
        )
    }

    @Test
    fun `restore continuity keeps settlement dispute and reconciliation traceability`() {
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m7",
            runId = "run_restore_m7",
            userId = "u-ledger-m7",
            sessionId = "s-ledger-m7",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            settlementRecord = SettlementRecord(
                runId = "run_restore_m7",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Settlement is authoritative locally; remote acknowledgement is pending.",
                selectedProviderId = "provider_restore",
                selectedProviderName = "Provider Restore",
                providerAcks = listOf(
                    ProviderAckRecord(
                        ackId = "ack_restore",
                        providerId = "provider_restore",
                        providerName = "Provider Restore",
                        callbackId = "callback_restore",
                        status = ProviderAckStatus.PENDING,
                        detail = "Awaiting provider ack.",
                        ackAtMs = 30L
                    )
                ),
                reconciliation = MarketplaceReconciliationSummary(
                    result = SettlementReconciliationResult.RETRY_SCHEDULED,
                    syncState = SettlementSyncState.SYNC_PENDING,
                    summary = "Reconciliation retry is scheduled while local state remains authoritative.",
                    retryScheduled = true,
                    lastCheckedAtMs = 40L
                ),
                recordedAtMs = 50L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "run_restore_m7",
                caseId = "case_restore_m7",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute opened locally; gateway sync pending.",
                updatedAtMs = 60L
            ),
            reconciliationSummary = MarketplaceReconciliationSummary(
                result = SettlementReconciliationResult.RETRY_SCHEDULED,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Reconciliation retry is scheduled while local state remains authoritative.",
                retryScheduled = true,
                lastCheckedAtMs = 70L
            ),
            syncIssues = listOf(
                MarketplaceSyncIssue(
                    issueId = "issue_restore_m7",
                    providerId = "provider_restore",
                    issueType = "sync_pending",
                    summary = "Gateway acknowledgement is pending while local state remains authoritative.",
                    detectedAtMs = 80L
                )
            ),
            createdAtMs = 20L,
            updatedAtMs = 80L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restored = orchestrator.getExecutionLedger("u-ledger-m7")
        assertEquals(1, restored.size)
        val restoredRecord = restored.first()
        assertEquals(SettlementStatus.SYNC_PENDING, restoredRecord.settlementRecord?.status)
        assertEquals(SettlementSyncState.SYNC_PENDING, restoredRecord.settlementRecord?.syncState)
        assertEquals(DisputeStatus.SYNC_PENDING, restoredRecord.disputeCaseRecord?.status)
        assertEquals(1, restoredRecord.syncIssues.size)
        assertEquals("provider_restore", restoredRecord.syncIssues.first().providerId)
    }

    @Test
    fun `restore continuity preserves remote pipeline records for governance console`() {
        val runId = "run_restore_m9"
        val ledgerRecord = ExecutionReceiptRecord(
            recordId = "ledger_restore_m9",
            runId = runId,
            userId = "u-restore-m9",
            sessionId = "s-restore-m9",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            disputeCaseRecord = DisputeCaseRecord(
                runId = runId,
                caseId = "case_restore_m9",
                status = DisputeStatus.SYNC_PENDING,
                summary = "Dispute is open while sync is pending.",
                updatedAtMs = 200L
            ),
            createdAtMs = 100L,
            updatedAtMs = 200L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(ledgerRecord),
                telemetryEmissionRecords = listOf(
                    TelemetryEmissionRecord(
                        recordId = "telemetry_restore_m9",
                        runId = runId,
                        dedupeKey = "telemetry:$runId",
                        status = TelemetryDeliveryStatus.QUEUED,
                        lastAttemptAtMs = 210L
                    )
                ),
                alertDeliveryRecords = listOf(
                    AlertDeliveryRecord(
                        recordId = "alert_restore_m9",
                        runId = runId,
                        alertCode = "GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                        dedupeKey = "alert:$runId:GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                        status = AlertDispatchStatus.QUEUED,
                        lastAttemptAtMs = 220L
                    )
                ),
                reconciliationJobRecords = listOf(
                    ReconciliationJobRecord(
                        jobId = "recon_restore_m9",
                        runId = runId,
                        status = ReconciliationJobStatus.HANDOFF_PENDING,
                        handoffStatus = RemoteSyncHandoffStatus.HANDOFF_PENDING,
                        summary = "Remote handoff is pending.",
                        updatedAtMs = 230L
                    )
                )
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val console = orchestrator.getGovernanceConsoleState(
            userId = "u-restore-m9",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(limit = 10, includeReviewed = true)
        )

        assertEquals(1, console.cases.size)
        assertEquals(TelemetryDeliveryStatus.QUEUED, console.remotePipelineSummary?.telemetryStatus)
        assertEquals(1, console.remotePipelineSummary?.handoffPendingCount)
        assertTrue(console.cases.first().remotePipelineSummary != null)
        assertTrue(console.cases.first().remoteDeliveryIssues.isNotEmpty())
    }

    @Test
    fun `persists collaboration handoff and routing records after operator actions`() {
        val runId = "run_persist_m10"
        val ledgerRecord = ExecutionReceiptRecord(
            recordId = "ledger_m10",
            runId = runId,
            userId = "u-persist-m10",
            sessionId = "s-persist-m10",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            createdAtMs = 100L,
            updatedAtMs = 100L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(executionLedgerRecords = listOf(ledgerRecord))
        )
        val orchestrator = AgentOrchestrator(
            dynamicStatePersistence = port,
            nowMs = { 1_000L }
        )

        val followUpResult = orchestrator.updateGovernanceCaseCollaboration(
            userId = "u-persist-m10",
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.REQUEST_FOLLOW_UP,
                actorUserId = "local-user",
                actorDisplayName = "Local Operator",
                followUpSummary = "Need remote provider confirmation.",
                target = "remote_operator_stub",
                timestampMs = 1_000L
            )
        )
        assertTrue(followUpResult.success)

        val ackResult = orchestrator.updateGovernanceCaseCollaboration(
            userId = "u-persist-m10",
            runId = runId,
            command = GovernanceCollaborationCommand(
                commandType = GovernanceActionType.ACK_REMOTE_HANDOFF,
                actorUserId = "local-user",
                actorDisplayName = "Local Operator",
                timestampMs = 1_100L
            )
        )
        assertTrue(ackResult.success)

        val saveCall = port.saveCalls.last()
        assertTrue(saveCall.collaborationStates.any { it.runId == runId })
        assertTrue(saveCall.remoteOperatorHandoffRecords.any { it.runId == runId })
        assertTrue(saveCall.alertRoutingRecords.any { it.runId == runId })
    }

    @Test
    fun `restore continuity keeps m23 policy promotion readiness analytics and approval state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m23",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
                stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
                target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                    workflowTemplateId = "wf_provider_follow_up",
                    summary = "Workspace rollout target."
                ),
                promotionStatus = com.lumi.coredomain.contract.PolicyPromotionStatus.APPROVAL_PENDING,
                promotionReadiness = com.lumi.coredomain.contract.PromotionReadinessResult(
                    status = com.lumi.coredomain.contract.PolicyPromotionReadinessStatus.HOLD,
                    summary = "Promotion readiness is on hold pending blocker resolution."
                ),
                rolloutAnalyticsSummary = com.lumi.coredomain.contract.RolloutAnalyticsSummary(
                    totalRuns = 4,
                    simulationRuns = 2,
                    approvalPendingCount = 1,
                    summary = "Rollout analytics: total 4, simulation 2, pending approvals 1, denied approvals 0."
                ),
                approvalOperations = listOf(
                    com.lumi.coredomain.contract.ApprovalOperationQueueItem(
                        operationId = "promotion_op_restore_1",
                        operationType = com.lumi.coredomain.contract.ApprovalOperationType.PROMOTION_APPROVAL,
                        status = com.lumi.coredomain.contract.ApprovalOperationStatus.PENDING,
                        action = com.lumi.coredomain.contract.GovernanceActionType.APPROVE_POLICY_PROMOTION,
                        requiredPermission = com.lumi.coredomain.contract.OperatorPermission.APPROVE_POLICY_ROLLOUT,
                        summary = "Approval operation queued for policy promotion."
                    )
                ),
                approvalReviewSummary = com.lumi.coredomain.contract.ApprovalReviewSummary(
                    pendingCount = 1,
                    approvedCount = 0,
                    rejectedCount = 0,
                    summary = "Approval queue pending 1, approved 0, rejected 0."
                ),
                summary = "Policy promotion approval pending.",
                updatedAtMs = 1707012000L
            ),
            workflowPromotionStatus = com.lumi.coredomain.contract.PolicyPromotionStatus.APPROVAL_PENDING,
            workflowPromotionSummary = "Policy promotion requested for staged rollout at workspace scope.",
            workflowPromotionReadinessSummary = "Promotion readiness is on hold pending blocker resolution.",
            workflowPromotionBlockerSummary = "Promotion is waiting for approval operations to complete.",
            workflowPromotionRecommendationSummary = "Hold promotion until evidence and approval blockers are cleared.",
            updatedAtMs = 1707012000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m23",
            runId = "run_restore_m23",
            userId = "u-ledger-m23",
            sessionId = "s-ledger-m23",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m23",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1707012000L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1707012000L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m23",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                policyPromotionStatus = com.lumi.coredomain.contract.PolicyPromotionStatus.APPROVAL_PENDING,
                policyPromotionReadiness = com.lumi.coredomain.contract.PolicyPromotionReadinessStatus.HOLD,
                policyApprovalPendingOnly = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m23" }
        assertEquals(
            com.lumi.coredomain.contract.PolicyPromotionStatus.APPROVAL_PENDING,
            restoredCase.summary.policyPromotionStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyPromotionReadinessStatus.HOLD,
            restoredCase.summary.policyPromotionReadiness
        )
        assertTrue(restoredCase.summary.policyApprovalPending)
        assertTrue(restoredCase.policyPromotionSummary.contains("promotion", ignoreCase = true))
        assertTrue(restoredCase.policyRolloutAnalytics?.summary?.contains("rollout analytics", ignoreCase = true) == true)
        assertTrue(restoredCase.policyApprovalReviewSummary?.summary?.contains("pending 1", ignoreCase = true) == true)
        assertTrue(restoredCase.policyApprovalOperations.any {
            it.status == com.lumi.coredomain.contract.ApprovalOperationStatus.PENDING
        })
    }

    @Test
    fun `restore continuity keeps m24 governance program lifecycle and cross-tenant state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m24",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
                stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
                target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.TENANT,
                    tenantId = "tenant_alpha",
                    workflowTemplateId = "wf_provider_follow_up",
                    summary = "Tenant rollout target."
                ),
                governanceProgram = com.lumi.coredomain.contract.PolicyGovernanceProgram(
                    programId = "program_m24",
                    name = "Program M24",
                    status = com.lumi.coredomain.contract.PolicyGovernanceProgramStatus.ACTIVE,
                    currentWaveId = "wave_m24",
                    waves = listOf(
                        com.lumi.coredomain.contract.PolicyGovernanceProgramWave(
                            waveId = "wave_m24",
                            name = "Wave M24",
                            status = com.lumi.coredomain.contract.PolicyGovernanceWaveStatus.ADVANCING,
                            targetScope = com.lumi.coredomain.contract.PolicyRolloutScope.TENANT,
                            targetTenantIds = listOf("tenant_alpha"),
                            summary = "Wave M24 is advancing.",
                            updatedAtMs = 1708012000L
                        )
                    ),
                    summary = "Program M24 is active with advancing wave.",
                    updatedAtMs = 1708012000L
                ),
                crossTenantRollout = com.lumi.coredomain.contract.CrossTenantRolloutSummary(
                    totalTargets = 6,
                    adoptedTargets = 3,
                    driftedTargets = 2,
                    exemptedTargets = 1,
                    pinnedTargets = 1,
                    blockedTargets = 0,
                    readinessStatus = com.lumi.coredomain.contract.CrossTenantRolloutReadinessStatus.HOLD,
                    adoptionSummary = "Adoption 3/6.",
                    driftSummary = "Drift reasons include version pinning and exemptions.",
                    exemptionSummary = "Active exemptions 1.",
                    pinningSummary = "Active pins 1.",
                    blockerSummary = "Cross-tenant rollout is on hold pending exemption cleanup.",
                    recommendationSummary = "Resolve drift before broadening rollout.",
                    summary = "Cross-tenant rollout hold. Adoption 3/6. Active exemptions 1. Active pins 1.",
                    updatedAtMs = 1708012000L
                ),
                packLifecycleStatus = com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleStatus.STAGED,
                packLifecycleEvents = listOf(
                    com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleEvent(
                        eventId = "evt_m24_wave",
                        type = com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleEventType.WAVE_ADVANCED,
                        summary = "Governance wave advanced.",
                        reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_POLICY_PROGRAM_WAVE_ADVANCED),
                        timestampMs = 1708011900L
                    ),
                    com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleEvent(
                        eventId = "evt_m24_deprecate",
                        type = com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleEventType.PACK_DEPRECATED,
                        summary = "Pack was marked deprecated.",
                        reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_POLICY_PACK_DEPRECATED),
                        timestampMs = 1708011950L
                    )
                ),
                packReplacementPlan = com.lumi.coredomain.contract.WorkflowPolicyPackReplacementPlan(
                    replacementId = "replacement_m24",
                    fromPackId = "pack_m24",
                    toPackId = "pack_m24_next",
                    toPackVersionId = "v2",
                    reason = "Planned replacement after tenant wave verification.",
                    effectiveAfterMs = 1708015000L,
                    summary = "Replacement plan attached: pack_m24 -> pack_m24_next."
                ),
                programSummary = "Program M24 is active with advancing wave.",
                crossTenantSummary = "Cross-tenant rollout hold with drift and exemptions pending.",
                packLifecycleSummary = "Pack lifecycle is staged with governance events.",
                packDeprecationSummary = "Pack is deprecated for new tenant onboarding.",
                packRetirementSummary = "Retirement will start after hold is cleared.",
                updatedAtMs = 1708012000L
            ),
            workflowProgramSummary = "Program M24 is active with advancing wave.",
            workflowCrossTenantSummary = "Cross-tenant rollout hold with drift and exemptions pending.",
            workflowPackLifecycleSummary = "Pack lifecycle is staged with governance events.",
            workflowPackDeprecationSummary = "Pack is deprecated for new tenant onboarding.",
            workflowPackRetirementSummary = "Retirement will start after hold is cleared.",
            workflowPackReplacementSummary = "Replacement plan attached: pack_m24 -> pack_m24_next.",
            updatedAtMs = 1708012000L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m24",
            runId = "run_restore_m24",
            userId = "u-ledger-m24",
            sessionId = "s-ledger-m24",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m24",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1708012000L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1708012000L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m24",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m24" }
        assertEquals("program_m24", restoredCase.summary.policyGovernanceProgramId)
        assertEquals(
            com.lumi.coredomain.contract.PolicyGovernanceProgramStatus.ACTIVE,
            restoredCase.summary.policyGovernanceProgramStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PolicyGovernanceWaveStatus.ADVANCING,
            restoredCase.summary.policyGovernanceWaveStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleStatus.STAGED,
            restoredCase.summary.workflowPackLifecycleStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.CrossTenantRolloutReadinessStatus.HOLD,
            restoredCase.summary.crossTenantReadinessStatus
        )
        assertEquals(1, restoredCase.summary.crossTenantExemptedTargets)
        assertEquals(1, restoredCase.summary.crossTenantPinnedTargets)
        assertTrue(restoredCase.policyProgramSummary.contains("program", ignoreCase = true))
        assertTrue(restoredCase.policyCrossTenantSummary.contains("cross-tenant", ignoreCase = true))
        assertTrue(restoredCase.policyPackLifecycleSummary.contains("lifecycle", ignoreCase = true))
        assertTrue(restoredCase.policyPackDeprecationSummary.contains("deprecated", ignoreCase = true))
        assertTrue(restoredCase.policyPackRetirementSummary.contains("retire", ignoreCase = true))
        assertTrue(restoredCase.policyPackReplacementSummary.contains("replacement", ignoreCase = true))
        assertEquals("pack_m24_next", restoredCase.workflowPackReplacementPlan?.toPackId)
    }

    @Test
    fun `restore continuity keeps m26 estate automation scheduling and audit state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m26",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
                stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
                target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                    tenantId = "tenant_m26",
                    workspaceId = "workspace_m26",
                    workflowTemplateId = "wf_provider_follow_up",
                    summary = "Workspace rollout target for M26 restore continuity."
                ),
                estateAutomationRule = com.lumi.coredomain.contract.EstateAutomationRule(
                    ruleId = "estate_rule_m26",
                    name = "M26 Safe Estate Automation",
                    enabled = true,
                    allowScheduling = true,
                    allowAutoApplySafe = true,
                    summary = "Schedule and execute safe remediation under bounded guardrails."
                ),
                estateAutomationEligibility = com.lumi.coredomain.contract.EstateAutomationEligibility(
                    status = com.lumi.coredomain.contract.EstateAutomationEligibilityStatus.APPROVAL_REQUIRED,
                    summary = "Automation requires approval for the selected remediation action.",
                    reasonCodes = listOf(
                        com.lumi.coredomain.contract.RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED,
                        com.lumi.coredomain.contract.RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED
                    ),
                    approvalRequirement = com.lumi.coredomain.contract.AutomationApprovalRequirement.REQUIRED_FOR_RISKY_OPERATION,
                    approvalDecision = com.lumi.coredomain.contract.AutomationApprovalDecision.PENDING,
                    evaluatedAtMs = 1709011000L
                ),
                scheduledRemediationPlan = com.lumi.coredomain.contract.ScheduledRemediationPlan(
                    scheduleId = "schedule_restore_m26",
                    action = com.lumi.coredomain.contract.PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                    status = com.lumi.coredomain.contract.ScheduledRemediationStatus.APPROVAL_REQUIRED,
                    target = com.lumi.coredomain.contract.ScheduledRemediationTarget(
                        scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                        tenantId = "tenant_m26",
                        workspaceId = "workspace_m26",
                        packId = "pack_m26",
                        packVersionId = "v_m26_2",
                        summary = "Workspace remediation target."
                    ),
                    scheduledAtMs = 1709012000L,
                    scheduledBy = com.lumi.coredomain.contract.OperatorAssigneeRef(
                        userId = "ops_admin",
                        displayName = "Ops Admin"
                    ),
                    nextRunAtMs = 1709012000L,
                    approvalRequirement = com.lumi.coredomain.contract.AutomationApprovalRequirement.REQUIRED_FOR_RISKY_OPERATION,
                    approvalDecision = com.lumi.coredomain.contract.AutomationApprovalDecision.PENDING,
                    summary = "Scheduled remediation is waiting for approval.",
                    reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED),
                    updatedAtMs = 1709012000L
                ),
                governanceProgramOperations = listOf(
                    com.lumi.coredomain.contract.GovernanceProgramOperation(
                        operationId = "program_op_restore_m26",
                        action = com.lumi.coredomain.contract.GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION,
                        status = com.lumi.coredomain.contract.GovernanceProgramOperationStatus.APPROVAL_REQUIRED,
                        summary = "Scheduled remediation queued and waiting for approval.",
                        reasonCodes = listOf(
                            com.lumi.coredomain.contract.RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED,
                            com.lumi.coredomain.contract.RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED
                        ),
                        actor = com.lumi.coredomain.contract.OperatorAssigneeRef(
                            userId = "ops_admin",
                            displayName = "Ops Admin"
                        ),
                        timestampMs = 1709012000L
                    )
                ),
                automationReplaySummary = com.lumi.coredomain.contract.AutomationReplaySummary(
                    executedCount = 0,
                    scheduledCount = 1,
                    blockedCount = 0,
                    suppressedCount = 0,
                    approvalRequiredCount = 1,
                    summary = "M26 replay: 1 scheduled and approval-required operation.",
                    updatedAtMs = 1709012100L
                ),
                automationCancellationRecords = listOf(
                    com.lumi.coredomain.contract.AutomationCancellationRecord(
                        cancellationId = "cancel_restore_m26",
                        scheduleId = "schedule_restore_m26",
                        reason = "Operator cancelled this schedule during maintenance freeze.",
                        reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_ESTATE_AUTOMATION_CANCELLED),
                        cancelledBy = com.lumi.coredomain.contract.OperatorAssigneeRef(
                            userId = "ops_admin",
                            displayName = "Ops Admin"
                        ),
                        cancelledAtMs = 1709012200L
                    )
                ),
                policyEstateRemediationSummary = "Policy estate remediation remains approval-gated.",
                updatedAtMs = 1709012200L
            ),
            workflowPolicySummary = "Policy workflow remains staged pending governance approval.",
            updatedAtMs = 1709012200L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m26",
            runId = "run_restore_m26",
            userId = "u-ledger-m26",
            sessionId = "s-ledger-m26",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.DISPUTED,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m26",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1709012200L
            ),
            workflowRun = workflowRun,
            estateAutomationRule = workflowRun.policyRolloutState?.estateAutomationRule,
            estateAutomationEligibility = workflowRun.policyRolloutState?.estateAutomationEligibility,
            scheduledRemediationPlan = workflowRun.policyRolloutState?.scheduledRemediationPlan,
            governanceProgramOperations = workflowRun.policyRolloutState?.governanceProgramOperations.orEmpty(),
            automationReplaySummary = workflowRun.policyRolloutState?.automationReplaySummary,
            automationCancellationRecords = workflowRun.policyRolloutState?.automationCancellationRecords.orEmpty(),
            updatedAtMs = 1709012200L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m26",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m26" }
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.APPROVAL_REQUIRED,
            restoredCase.summary.scheduledRemediationStatus
        )
        assertTrue(restoredCase.summary.automationApprovalRequired)
        assertTrue(restoredCase.estateAutomationSummary.contains("approval", ignoreCase = true))
        assertTrue(restoredCase.scheduledRemediationSummary.contains("scheduled remediation", ignoreCase = true))
        assertEquals(1, restoredCase.governanceProgramOperations.size)
        assertEquals(1, restoredCase.automationCancellationRecords.size)
        assertEquals(1, restoredCase.automationReplaySummary?.approvalRequiredCount)

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m26",
            filter = com.lumi.coredomain.contract.LedgerQueryFilter(runId = "run_restore_m26", limit = 1)
        ).first()
        assertEquals(
            com.lumi.coredomain.contract.ScheduledRemediationStatus.APPROVAL_REQUIRED,
            restoredLedger.scheduledRemediationPlan?.status
        )
        assertEquals(1, restoredLedger.governanceProgramOperations.size)
        assertEquals(1, restoredLedger.automationCancellationRecords.size)
        assertEquals(1, restoredLedger.automationReplaySummary?.approvalRequiredCount)
    }

    @Test
    fun `restore continuity keeps m27 scheduling window and rollout calendar state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m27",
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
                    windowId = "window_restore_m27",
                    windowType = com.lumi.coredomain.contract.SchedulingWindowType.MAINTENANCE_WINDOW,
                    status = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                    timezone = "Europe/London",
                    nextEligibleAtMs = 1710012300L,
                    summary = "Waiting for maintenance window."
                ),
                calendarEvaluation = com.lumi.coredomain.contract.CalendarEvaluationResult(
                    decision = com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                    windowStatus = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                    blockReason = com.lumi.coredomain.contract.ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                    nextEligibleAtMs = 1710012300L,
                    summary = "Rollout deferred until maintenance window."
                ),
                scheduleSummary = "Rollout deferred until maintenance window.",
                rolloutCalendar = com.lumi.coredomain.contract.RolloutCalendar(
                    calendarId = "calendar_restore_m27",
                    currentWaveId = "wave_m27_a",
                    currentStage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                    entries = listOf(
                        com.lumi.coredomain.contract.RolloutCalendarEntry(
                            entryId = "entry_restore_m27",
                            waveId = "wave_m27_a",
                            stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                            status = com.lumi.coredomain.contract.RolloutCalendarEntryStatus.DEFERRED,
                            summary = "Deferred until maintenance window."
                        )
                    ),
                    summary = "Rollout calendar deferred for staged wave."
                ),
                rolloutCalendarSummary = "Rollout calendar deferred for staged wave.",
                updatedAtMs = 1710012200L
            ),
            updatedAtMs = 1710012200L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m27",
            runId = "run_restore_m27",
            userId = "u-ledger-m27",
            sessionId = "s-ledger-m27",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.WAITING_USER,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m27",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1710012200L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1710012200L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m27",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m27" }
        assertEquals(
            com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
            restoredCase.summary.scheduleWindowStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
            restoredCase.summary.scheduleDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
            restoredCase.summary.scheduleBlockReason
        )
        assertTrue(restoredCase.summary.scheduleWaitingMaintenance)
        assertEquals(1710012300L, restoredCase.summary.scheduleNextEligibleAtMs)
        assertTrue(restoredCase.workflowRolloutSummary.contains("maintenance window", ignoreCase = true))

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m27",
            filter = com.lumi.coredomain.contract.LedgerQueryFilter(runId = "run_restore_m27", limit = 1)
        ).first()
        assertEquals(
            com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
            restoredLedger.workflowRun?.policyRolloutState?.calendarEvaluation?.decision
        )
        assertEquals(
            com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
            restoredLedger.workflowRun?.policyRolloutState?.policySchedulingWindow?.status
        )
    }

    @Test
    fun `restore continuity keeps m28 rollout wave and cross-window governance state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m28",
            templateId = "wf_provider_follow_up",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
                stage = com.lumi.coredomain.contract.PolicyRolloutStage.STAGED,
                mode = com.lumi.coredomain.contract.PolicyRolloutMode.STAGED,
                target = com.lumi.coredomain.contract.PolicyRolloutTarget(
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                    tenantId = "tenant_m28",
                    workspaceId = "workspace_m28",
                    workflowTemplateId = "wf_provider_follow_up"
                ),
                rolloutWaves = listOf(
                    com.lumi.coredomain.contract.RolloutWave(
                        waveId = "wave_restore_m28",
                        waveIndex = 2,
                        name = "Wave 2",
                        status = com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
                        completionState = com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD,
                        carryForwardState = com.lumi.coredomain.contract.RolloutWaveCarryForwardState(
                            carryForwardEnabled = true,
                            carryForwardPending = true,
                            pendingTargets = 2,
                            nextEligibleAtMs = 1710022300L,
                            summary = "Pending targets carried forward."
                        ),
                        summary = "Wave 2 carried forward.",
                        updatedAtMs = 1710022200L
                    )
                ),
                currentRolloutWaveId = "wave_restore_m28",
                currentRolloutWaveStatus = com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
                currentRolloutWaveCompletionState = com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD,
                calendarAwarePromotionDecision = com.lumi.coredomain.contract.CalendarAwarePromotionDecision(
                    promotionId = "promotion_restore_m28",
                    waveId = "wave_restore_m28",
                    windowEligibility = com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
                    decisionType = com.lumi.coredomain.contract.RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
                    nextEligibleWindow = com.lumi.coredomain.contract.NextEligibleWindowSummary(
                        nextEligibleAtMs = 1710022300L,
                        summary = "Next eligible window selected."
                    ),
                    summary = "Wave deferred to next eligible window.",
                    createdAtMs = 1710022200L
                ),
                crossWindowGovernanceControl = com.lumi.coredomain.contract.CrossWindowGovernanceControl(
                    controlId = "cw_restore_m28",
                    scope = com.lumi.coredomain.contract.PolicyRolloutScope.WORKSPACE,
                    pauseState = com.lumi.coredomain.contract.CrossWindowPauseState.PAUSED,
                    holdReason = com.lumi.coredomain.contract.CrossWindowHoldReason.GOVERNANCE_PAUSE,
                    summary = "Cross-window rollout paused.",
                    updatedAtMs = 1710022200L
                ),
                rolloutWaveSummary = "Wave 2 carried forward to next window.",
                crossWindowGovernanceSummary = "Cross-window rollout paused by governance control.",
                nextEligibleWindowSummary = "Next eligible window starts at 1710022300.",
                updatedAtMs = 1710022200L
            ),
            updatedAtMs = 1710022200L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m28",
            runId = "run_restore_m28",
            userId = "u-ledger-m28",
            sessionId = "s-ledger-m28",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.WAITING_USER,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m28",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1710022200L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1710022200L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m28",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m28" }
        assertEquals(
            com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
            restoredCase.summary.rolloutWaveStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutWaveCompletionState.CARRIED_FORWARD,
            restoredCase.summary.rolloutWaveCompletionState
        )
        assertEquals(
            com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
            restoredCase.summary.rolloutWindowEligibility
        )
        assertTrue(restoredCase.summary.rolloutCarryForwardPending)
        assertTrue(restoredCase.summary.rolloutCrossWindowPaused)
        assertTrue(restoredCase.summary.rolloutNextWindowPending)
        assertTrue(restoredCase.rolloutWaveSummary.contains("carried forward", ignoreCase = true))
        assertTrue(restoredCase.crossWindowGovernanceSummary.contains("paused", ignoreCase = true))

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m28",
            filter = com.lumi.coredomain.contract.LedgerQueryFilter(runId = "run_restore_m28", limit = 1)
        ).first()
        assertEquals(
            "wave_restore_m28",
            restoredLedger.workflowRun?.policyRolloutState?.currentRolloutWaveId
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutWaveStatus.CARRIED_FORWARD,
            restoredLedger.workflowRun?.policyRolloutState?.currentRolloutWaveStatus
        )
    }

    @Test
    fun `restore continuity keeps m30 program coordination and escalation state`() {
        val workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
            runId = "run_restore_m30",
            templateId = "wf_rollout_coordination",
            status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
            currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
            policyRolloutState = com.lumi.coredomain.contract.WorkflowPolicyRolloutState(
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
                        decisionId = "decision_restore_m30",
                        selectedProgramId = "program_alpha",
                        selectedPriority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                        deferredProgramIds = listOf("program_beta"),
                        decisionReason = com.lumi.coredomain.contract.RolloutProgramDecisionReason.PRIORITY_WIN,
                        summary = "Program alpha selected; program beta deferred."
                    ),
                    dependencies = listOf(
                        com.lumi.coredomain.contract.RolloutProgramDependency(
                            dependencyId = "dep_restore_m30",
                            programId = "program_beta",
                            dependsOnProgramId = "program_alpha",
                            blocked = true,
                            summary = "Program beta blocked by program alpha."
                        )
                    ),
                    contention = com.lumi.coredomain.contract.RolloutProgramContentionSummary(
                        type = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                        level = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                        contendedProgramIds = listOf("program_alpha"),
                        summary = "Window overlap contention detected."
                    ),
                    escalation = com.lumi.coredomain.contract.RolloutProgramEscalationState(
                        status = com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
                        reason = com.lumi.coredomain.contract.RolloutProgramEscalationReason.REPEATED_DEFER,
                        summary = "Escalation opened after repeated defer."
                    ),
                    summary = "Program beta deferred due to dependency and contention.",
                    updatedAtMs = 1710032200L
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
                summary = "Program beta deferred due to dependency and contention.",
                updatedAtMs = 1710032200L
            ),
            updatedAtMs = 1710032200L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_restore_m30",
            runId = "run_restore_m30",
            userId = "u-ledger-m30",
            sessionId = "s-ledger-m30",
            module = ModuleId.LIX,
            status = com.lumi.coredomain.contract.ResponseStatus.WAITING_USER,
            collaborationState = com.lumi.coredomain.contract.GovernanceCaseCollaborationState(
                runId = "run_restore_m30",
                status = com.lumi.coredomain.contract.OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                updatedAtMs = 1710032200L
            ),
            workflowRun = workflowRun,
            updatedAtMs = 1710032200L
        )
        val port = FakePersistencePort(
            loadResult = PersistedDynamicState(
                executionLedgerRecords = listOf(record),
                collaborationStates = listOf(record.collaborationState!!)
            )
        )
        val orchestrator = AgentOrchestrator(dynamicStatePersistence = port)

        val restoredCase = orchestrator.getGovernanceCases(
            userId = "u-ledger-m30",
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 10
            )
        ).first { it.summary.runId == "run_restore_m30" }
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
            restoredCase.summary.programPriority
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
            restoredCase.summary.programCoordinationState
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramDecisionReason.DEPENDENCY_BLOCK,
            restoredCase.summary.programDecisionReason
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
            restoredCase.summary.programContentionType
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
            restoredCase.summary.programEscalationStatus
        )
        assertTrue(restoredCase.programCoordinationSummary.contains("deferred", ignoreCase = true))
        assertTrue(restoredCase.crossProgramSummary.contains("cross-program", ignoreCase = true))
        assertTrue(restoredCase.programEscalationSummary.contains("escalation", ignoreCase = true))

        val restoredLedger = orchestrator.getExecutionLedger(
            userId = "u-ledger-m30",
            filter = com.lumi.coredomain.contract.LedgerQueryFilter(runId = "run_restore_m30", limit = 1)
        ).first()
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
            restoredLedger.workflowRun?.policyRolloutState?.programCoordination?.coordinationState
        )
        assertEquals(
            com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
            restoredLedger.workflowRun?.policyRolloutState?.programCoordination?.escalation?.status
        )
    }

    @Test
    fun `persists and restores m32 portfolio simulation artifacts`() {
        val userId = "u-m32-persist"
        var clock = 1_700_320_000_000L
        val writerPort = FakePersistencePort()
        val writer = AgentOrchestrator(
            dynamicStatePersistence = writerPort,
            nowMs = { clock++ }
        )
        val scenarioA = writer.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_persist_a",
                name = "Persist scenario A",
                modifications = listOf(
                    PortfolioScenarioModification(
                        modificationId = "m32_persist_shift",
                        type = PortfolioScenarioModificationType.SHIFT_ROLLOUT_WINDOW,
                        intValue = 1
                    )
                ),
                simulationOnly = true,
                active = true
            )
        )
        writer.savePortfolioScenario(
            userId = userId,
            scenario = PortfolioScenarioDefinition(
                scenarioId = "scenario_m32_persist_b",
                name = "Persist scenario B",
                modifications = listOf(
                    PortfolioScenarioModification(
                        modificationId = "m32_persist_capacity",
                        type = PortfolioScenarioModificationType.ADJUST_APPROVAL_CAPACITY,
                        doubleValue = 20.0
                    )
                ),
                simulationOnly = true,
                active = true
            )
        )
        val runA = writer.runPortfolioScenario(userId, scenarioA.scenarioId)
        val runB = writer.runPortfolioScenario(userId, "scenario_m32_persist_b")
        val comparison = writer.comparePortfolioSimulationRuns(
            userId = userId,
            baselineRunId = runA.runId,
            candidateRunId = runB.runId
        )
        val nonNullComparison = assertNotNull(comparison)

        val persisted = writerPort.saveCalls.last()
        assertTrue(persisted.portfolioScenarioDefinitions.any { it.scenarioId == scenarioA.scenarioId })
        assertTrue(persisted.portfolioSimulationRunRecords.any { it.runId == runA.runId })
        assertTrue(persisted.portfolioScenarioComparisons.any { it.comparisonId == nonNullComparison.comparisonId })

        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    portfolioScenarioDefinitions = persisted.portfolioScenarioDefinitions,
                    portfolioSimulationRunRecords = persisted.portfolioSimulationRunRecords,
                    portfolioScenarioComparisons = persisted.portfolioScenarioComparisons
                )
            ),
            nowMs = { clock++ }
        )
        val restored = reader.getPortfolioSimulationState(userId = userId)
        assertTrue(restored.scenarios.any { it.scenarioId == scenarioA.scenarioId })
        assertTrue(restored.runs.any { it.runId == runA.runId })
        assertTrue(restored.comparisons.any { it.comparisonId == nonNullComparison.comparisonId })
    }

    @Test
    fun `persists and restores m33 portfolio optimization artifacts`() {
        val userId = "u-m33-persist"
        val writerPort = FakePersistencePort()
        val request = PortfolioOptimizationRequest(
            requestId = "request_m33_persist",
            name = "Persist optimization",
            objectiveProfile = PortfolioOptimizationObjectiveProfile(profileId = "objective_m33"),
            constraintProfile = PortfolioOptimizationConstraintProfile(profileId = "constraint_m33")
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m33_persist",
            requestId = request.requestId,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            candidateSchedules = listOf(
                PortfolioOptimizationCandidateSchedule(
                    candidateId = "candidate_m33_alpha",
                    summary = "Selected lower-risk schedule."
                )
            ),
            summary = "One optimization result restored."
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m33_persist",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m33_alpha",
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_330_000_000L,
            summary = "Selected lower-risk schedule."
        )
        writerPort.saveExtended(
            userId = userId,
            dynamicState = null,
            trajectory = emptyList(),
            activeRole = null,
            roleSource = null,
            rolePolicyOverrides = emptyMap(),
            executionLedgerRecords = emptyList(),
            telemetryEmissionRecords = emptyList(),
            alertDeliveryRecords = emptyList(),
            reconciliationJobRecords = emptyList(),
            collaborationStates = emptyList(),
            remoteOperatorHandoffRecords = emptyList(),
            alertRoutingRecords = emptyList(),
            remoteOperatorDirectoryEntries = emptyList(),
            connectorDestinations = emptyList(),
            connectorAuthProfiles = emptyList(),
            connectorRouteBindings = emptyList(),
            portfolioScenarioDefinitions = emptyList(),
            portfolioSimulationRunRecords = emptyList(),
            portfolioScenarioComparisons = emptyList(),
            portfolioOptimizationRequests = listOf(request),
            portfolioOptimizationResults = listOf(result),
            portfolioOptimizationDecisionRecords = listOf(decision)
        )

        val persisted = writerPort.saveCalls.last()
        assertTrue(persisted.portfolioOptimizationRequests.any { it.requestId == request.requestId })
        assertTrue(persisted.portfolioOptimizationResults.any { it.resultId == result.resultId })
        assertTrue(persisted.portfolioOptimizationDecisionRecords.any { it.decisionId == decision.decisionId })

        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    portfolioOptimizationRequests = persisted.portfolioOptimizationRequests,
                    portfolioOptimizationResults = persisted.portfolioOptimizationResults,
                    portfolioOptimizationDecisionRecords = persisted.portfolioOptimizationDecisionRecords
                )
            )
        )
        val restored = reader.getPortfolioOptimizationState(userId = userId)
        assertTrue(restored.requests.any { it.requestId == request.requestId })
        assertTrue(restored.results.any { it.resultId == result.resultId })
        assertTrue(restored.decisions.any { it.decisionId == decision.decisionId })
        assertEquals("candidate_m33_alpha", restored.summary?.selectedCandidateId)
    }

    @Test
    fun `restore continuity keeps m34 portfolio learning calibration drift and tuning state`() {
        val userId = "u-m34-restore"
        val snapshot = com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "snapshot_m34_restore_v1",
            version = 1,
            objectiveWeights = listOf(
                com.lumi.coredomain.contract.PortfolioOptimizationObjectiveWeight(
                    family = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveFamily.RISK,
                    weight = 6
                )
            ),
            parameterCalibration = com.lumi.coredomain.contract.PortfolioOptimizationParameterCalibration(
                riskIncidentPenaltyMultiplier = 1.2,
                summary = "Restore-safe risk tuning."
            ),
            summary = "Calibration snapshot restored from persistence.",
            createdAtMs = 1_700_340_000_000L
        )
        val request = PortfolioOptimizationRequest(
            requestId = "request_m34_restore",
            name = "Restore learning",
            calibrationSnapshotId = snapshot.snapshotId,
            objectiveProfile = PortfolioOptimizationObjectiveProfile(profileId = "objective_m34_restore"),
            constraintProfile = PortfolioOptimizationConstraintProfile(profileId = "constraint_m34_restore")
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m34_restore",
            requestId = request.requestId,
            calibrationSnapshotId = snapshot.snapshotId,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            candidateSchedules = listOf(
                PortfolioOptimizationCandidateSchedule(
                    candidateId = "candidate_m34_restore",
                    summary = "Restore-safe schedule candidate."
                )
            ),
            summary = "Result restored with learning context."
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m34_restore",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m34_restore",
            calibrationSnapshotId = snapshot.snapshotId,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_340_010_000L,
            summary = "Selected restore-safe schedule."
        )
        val outcome = com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord(
            outcomeId = "outcome_m34_restore",
            decisionId = decision.decisionId,
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = decision.candidateId,
            calibrationSnapshotId = snapshot.snapshotId,
            scheduledSourceRunIds = listOf("run_restore_m34"),
            predictedScheduledCount = 1,
            predictedOnTimeCount = 1,
            observations = com.lumi.coredomain.contract.PortfolioOutcomeObservationSet(
                executionObservations = listOf(
                    com.lumi.coredomain.contract.PortfolioExecutionObservation(
                        sourceRunId = "run_restore_m34",
                        executedOnTime = false,
                        readinessDelayed = true,
                        summary = "Execution slipped after restore."
                    )
                ),
                summary = "Outcome restored with drift evidence."
            ),
            driftSummaryId = "drift_m34_restore",
            summary = "Outcome restored with high drift.",
            recordedAtMs = 1_700_340_020_000L
        )
        val drift = com.lumi.coredomain.contract.PortfolioOptimizationDriftSummary(
            driftId = "drift_m34_restore",
            decisionId = decision.decisionId,
            outcomeId = outcome.outcomeId,
            calibrationSnapshotId = snapshot.snapshotId,
            highestSeverity = com.lumi.coredomain.contract.PortfolioDriftSeverity.HIGH,
            signals = listOf(
                com.lumi.coredomain.contract.PortfolioDriftSignal(
                    signalId = "signal_m34_restore",
                    family = com.lumi.coredomain.contract.PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
                    severity = com.lumi.coredomain.contract.PortfolioDriftSeverity.HIGH,
                    normalizedDelta = 0.6,
                    summary = "Risk drift remained high after restore."
                )
            ),
            summary = "High drift restored from persistence.",
            createdAtMs = 1_700_340_021_000L
        )
        val suggestion = com.lumi.coredomain.contract.PortfolioOptimizationTuningSuggestion(
            suggestionId = "suggestion_m34_restore",
            decisionId = decision.decisionId,
            driftId = drift.driftId,
            calibrationSnapshotId = snapshot.snapshotId,
            targetFamily = com.lumi.coredomain.contract.PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
            status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.DENIED,
            currentDoubleValue = 1.2,
            proposedDoubleValue = 1.4,
            doubleDelta = 0.2,
            summary = "Restored tuning suggestion."
        )
        val tuningDecision = com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord(
            tuningDecisionId = "tuning_decision_m34_restore",
            suggestionId = suggestion.suggestionId,
            decisionId = decision.decisionId,
            calibrationSnapshotId = snapshot.snapshotId,
            status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.DENIED,
            operatorId = "local-user",
            operatorName = "Local Operator",
            decisionReason = "Hold until more evidence is collected.",
            summary = "Denied tuning after restore review.",
            decidedAtMs = 1_700_340_022_000L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    portfolioOptimizationCalibrationSnapshots = listOf(snapshot),
                    portfolioOptimizationRequests = listOf(request),
                    portfolioOptimizationResults = listOf(result),
                    portfolioOptimizationDecisionRecords = listOf(decision),
                    portfolioOptimizationOutcomeRecords = listOf(outcome),
                    portfolioOptimizationDriftSummaries = listOf(drift),
                    portfolioOptimizationTuningSuggestions = listOf(suggestion),
                    portfolioOptimizationTuningDecisionRecords = listOf(tuningDecision)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                decisionId = decision.decisionId,
                calibrationSnapshotId = snapshot.snapshotId,
                includeCompleted = true,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(includeReviewed = true, limit = 10)
        )

        assertTrue(restored.calibrationSnapshots.any { it.snapshotId == snapshot.snapshotId })
        assertTrue(restored.requests.any { it.requestId == request.requestId })
        assertTrue(restored.results.any { it.resultId == result.resultId })
        assertTrue(restored.decisions.any { it.decisionId == decision.decisionId })
        assertTrue(restored.outcomes.any { it.outcomeId == outcome.outcomeId })
        assertTrue(restored.driftSummaries.any { it.driftId == drift.driftId })
        assertTrue(restored.tuningSuggestions.any { it.suggestionId == suggestion.suggestionId })
        assertTrue(restored.tuningDecisionRecords.any { it.tuningDecisionId == tuningDecision.tuningDecisionId })
        assertTrue(restored.summary?.activeCalibrationSnapshotId?.isNotBlank() == true)
        assertEquals(com.lumi.coredomain.contract.PortfolioDriftSeverity.HIGH, restored.summary?.highestDriftSeverity)
        assertTrue(restored.summary?.latestLearningSummary?.contains("restore", ignoreCase = true) == true)
        assertTrue(console.portfolioOptimizationState?.summary?.activeCalibrationSnapshotId?.isNotBlank() == true)
        assertTrue(
            console.portfolioOptimizationState?.summary?.latestTuningSummary
                ?.contains("Denied tuning", ignoreCase = true) == true
        )
    }

    @Test
    fun `restore continuity keeps m35 objective profile and propagation state`() {
        val userId = "u-m35-restore"
        val objectiveSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_snapshot_m35_restore_v1",
            profileId = "objective_m35_restore",
            version = 1,
            binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                userId = userId,
                workspaceId = "workspace_restore",
                tenantId = "tenant_restore",
                precedenceChain = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                ),
                summary = "Restore-safe user binding."
            ),
            objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m35_restore",
                summary = "Restore-safe objective profile."
            ),
            provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningProvenanceSummary(
                type = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileProvenanceType.LOCAL_TUNED,
                sourceScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                summary = "Restored local tuning provenance."
            ),
            summary = "User objective profile snapshot restored from persistence.",
            createdAtMs = 1_700_350_000_000L
        )
        val calibrationSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "calibration_m35_restore_v1",
            version = 1,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            summary = "Calibration snapshot restored with objective binding.",
            createdAtMs = 1_700_350_000_100L
        )
        val request = PortfolioOptimizationRequest(
            requestId = "request_m35_restore",
            name = "Restore objective propagation",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfile = objectiveSnapshot.objectiveProfile,
            constraintProfile = PortfolioOptimizationConstraintProfile(profileId = "constraint_m35_restore")
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m35_restore",
            requestId = request.requestId,
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            candidateSchedules = listOf(
                PortfolioOptimizationCandidateSchedule(
                    candidateId = "candidate_m35_restore",
                    summary = "Restore-safe propagation candidate."
                )
            ),
            summary = "Result restored with objective scope context."
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m35_restore",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m35_restore",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_350_000_200L,
            summary = "Selected restore-safe objective profile candidate."
        )
        val attempt = com.lumi.coredomain.contract.PortfolioOptimizationPropagationAttemptRecord(
            attemptId = "attempt_m35_restore",
            patch = com.lumi.coredomain.contract.PortfolioOptimizationLearningPatch(
                patchId = "patch_m35_restore",
                sourceObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
                sourceCalibrationSnapshotId = calibrationSnapshot.snapshotId,
                sourceBinding = objectiveSnapshot.binding,
                targetBinding = objectiveSnapshot.binding.copy(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                    summary = "Workspace restore target."
                ),
                summary = "Restore-safe propagation patch."
            ),
            rule = com.lumi.coredomain.contract.PortfolioOptimizationPropagationRule(
                ruleId = "rule_m35_restore",
                sourceScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                targetScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                approvalRequirement = com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRequirement.REQUIRED,
                summary = "Workspace propagation requires approval."
            ),
            sourceObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            targetScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
            approvalRequirement = com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRequirement.REQUIRED,
            status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.PENDING_APPROVAL,
            blockReason = com.lumi.coredomain.contract.PortfolioOptimizationPropagationBlockReason.APPROVAL_REQUIRED,
            isolationDecision = com.lumi.coredomain.contract.PortfolioOptimizationLearningIsolationDecision(
                decisionId = "isolation_m35_restore",
                sourceBinding = objectiveSnapshot.binding,
                targetBinding = objectiveSnapshot.binding.copy(
                    scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE
                ),
                allowed = true,
                summary = "Same-tenant workspace propagation remains allowed after restore."
            ),
            requestedByOperatorId = "local-user",
            requestedByOperatorName = "Local Operator",
            reviewRequired = true,
            summary = "Propagation restored pending approval.",
            createdAtMs = 1_700_350_000_300L
        )
        val approval = com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRecord(
            approvalId = "approval_m35_restore",
            attemptId = attempt.attemptId,
            approved = true,
            approverId = "workspace-admin",
            approverName = "Workspace Admin",
            reason = "Restored approval record.",
            summary = "Propagation approval restored.",
            decidedAtMs = 1_700_350_000_400L
        )
        val adoption = com.lumi.coredomain.contract.PortfolioOptimizationPropagationAdoptionRecord(
            adoptionId = "adoption_m35_restore",
            attemptId = attempt.attemptId,
            sourceObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            targetObjectiveProfileSnapshotId = "profile_snapshot_m35_workspace_restore_v1",
            targetBinding = attempt.patch.targetBinding,
            approvalRecordId = approval.approvalId,
            status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
            provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningProvenanceSummary(
                type = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileProvenanceType.ADOPTED,
                sourceScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                sourceSnapshotId = objectiveSnapshot.snapshotId,
                sourceAttemptId = attempt.attemptId,
                summary = "Restored adoption provenance."
            ),
            summary = "Workspace adoption restored from persistence.",
            adoptedAtMs = 1_700_350_000_500L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    portfolioOptimizationObjectiveProfileSnapshots = listOf(objectiveSnapshot),
                    portfolioOptimizationCalibrationSnapshots = listOf(calibrationSnapshot),
                    portfolioOptimizationRequests = listOf(request),
                    portfolioOptimizationResults = listOf(result),
                    portfolioOptimizationDecisionRecords = listOf(decision),
                    portfolioOptimizationPropagationAttemptRecords = listOf(attempt),
                    portfolioOptimizationPropagationApprovalRecords = listOf(approval),
                    portfolioOptimizationPropagationAdoptionRecords = listOf(adoption)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
                includeCompleted = true,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(includeReviewed = true, limit = 10)
        )

        assertTrue(restored.objectiveProfileSnapshots.any { it.snapshotId == objectiveSnapshot.snapshotId })
        assertTrue(restored.calibrationSnapshots.any { it.snapshotId == calibrationSnapshot.snapshotId })
        assertTrue(restored.requests.any { it.objectiveProfileSnapshotId == objectiveSnapshot.snapshotId })
        assertTrue(restored.results.any { it.objectiveProfileSnapshotId == objectiveSnapshot.snapshotId })
        assertTrue(restored.decisions.any { it.objectiveProfileSnapshotId == objectiveSnapshot.snapshotId })
        assertTrue(restored.propagationAttemptRecords.any { it.attemptId == attempt.attemptId })
        assertTrue(restored.propagationApprovalRecords.any { it.approvalId == approval.approvalId })
        assertTrue(restored.propagationAdoptionRecords.any { it.adoptionId == adoption.adoptionId })
        assertEquals(objectiveSnapshot.snapshotId, restored.summary?.activeObjectiveProfileSnapshotId)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
            restored.summary?.activeObjectiveProfileScope
        )
        assertTrue(restored.summary?.latestPropagationSummary?.contains("restored", ignoreCase = true) == true)
        assertEquals(
            objectiveSnapshot.snapshotId,
            console.portfolioOptimizationState?.summary?.activeObjectiveProfileSnapshotId
        )
    }

    @Test
    fun `restore continuity keeps m36 learning sync conflicts and federated aggregation state`() {
        val userId = "u-m36-restore"
        val objectiveSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_snapshot_m36_restore_v1",
            profileId = "objective_m36_restore",
            version = 1,
            binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                userId = userId,
                workspaceId = "workspace_restore_m36",
                tenantId = "tenant_restore_m36",
                precedenceChain = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.TENANT,
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                ),
                summary = "Restore-safe sync binding."
            ),
            objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m36_restore",
                summary = "Restore-safe sync profile."
            ),
            summary = "Objective profile snapshot restored for sync continuity.",
            createdAtMs = 1_700_360_000_000L
        )
        val calibrationSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "calibration_m36_restore_v1",
            version = 1,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            summary = "Calibration snapshot restored for sync continuity.",
            createdAtMs = 1_700_360_000_100L
        )
        val request = PortfolioOptimizationRequest(
            requestId = "request_m36_restore",
            name = "Restore sync continuity",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfile = objectiveSnapshot.objectiveProfile,
            constraintProfile = PortfolioOptimizationConstraintProfile(profileId = "constraint_m36_restore")
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m36_restore",
            requestId = request.requestId,
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            candidateSchedules = listOf(
                PortfolioOptimizationCandidateSchedule(
                    candidateId = "candidate_m36_restore",
                    summary = "Restore-safe sync candidate."
                )
            ),
            summary = "Result restored with sync context."
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m36_restore",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m36_restore",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_360_000_200L,
            summary = "Selected restore-safe sync candidate."
        )
        val drift = com.lumi.coredomain.contract.PortfolioOptimizationDriftSummary(
            driftId = "drift_m36_restore",
            decisionId = decision.decisionId,
            outcomeId = "outcome_m36_restore",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            highestSeverity = com.lumi.coredomain.contract.PortfolioDriftSeverity.HIGH,
            summary = "High drift restored for sync continuity.",
            createdAtMs = 1_700_360_000_300L
        )
        val syncBoundary = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundary(
            boundaryId = "boundary_m36_restore",
            boundaryType = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
            tenantId = "tenant_restore_m36",
            workspaceId = "workspace_restore_m36",
            sameTenantOnly = true,
            summary = "Tenant-private sync boundary restored."
        )
        val syncGroupKey = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationGroupKey(
            groupKey = "tenant_restore_m36:workspace_restore_m36:work",
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            boundaryType = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
            tenantId = "tenant_restore_m36",
            workspaceId = "workspace_restore_m36",
            summary = "Tenant-private same-workspace aggregation key."
        )
        val syncEnvelope = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncEnvelope(
            envelopeId = "envelope_m36_restore",
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            boundary = syncBoundary,
            groupKey = syncGroupKey,
            privacyPolicy = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncPrivacyPolicy(
                policyId = "privacy_m36_restore",
                mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                cloudSyncAllowed = true,
                sameTenantOnly = true,
                allowEnterpriseAggregation = false,
                summary = "Restore-safe privacy policy keeps sync tenant-private."
            ),
            provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncProvenance(
                deviceId = "device_m36_restore",
                sessionId = "session_m36_restore",
                sourceUserId = userId,
                sourceTenantId = "tenant_restore_m36",
                sourceWorkspaceId = "workspace_restore_m36",
                exportedAtMs = 1_700_360_000_350L,
                summary = "Restore-safe same-tenant source provenance."
            ),
            artifacts = listOf(
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactEnvelope(
                    envelopeArtifactId = "artifact_drift_m36_restore",
                    artifactType = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.DRIFT_SUMMARY,
                    artifactId = drift.driftId,
                    driftSummary = drift,
                    summary = drift.summary
                )
            ),
            reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_LEARNING_SYNC_DELIVERED),
            summary = "Imported one redacted learning artifact after restore.",
            createdAtMs = 1_700_360_000_400L
        )
        val syncConflict = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictRecord(
            conflictId = "conflict_m36_restore",
            envelopeId = syncEnvelope.envelopeId,
            artifactType = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.FEDERATED_AGGREGATION_SUMMARY,
            artifactId = "aggregation_m36_restore",
            localVersion = 1,
            incomingVersion = 2,
            resolution = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.SAFE_MERGE,
            reviewRequired = false,
            reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_RESOLVED),
            summary = "Federated aggregation summary merged safely after restore.",
            detectedAtMs = 1_700_360_000_500L
        )
        val syncAttempt = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncAttemptRecord(
            attemptId = "attempt_m36_restore",
            direction = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncDirection.IMPORT,
            envelopeId = syncEnvelope.envelopeId,
            mode = syncEnvelope.mode,
            status = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
            boundary = syncBoundary,
            groupKey = syncGroupKey,
            privacyPolicy = syncEnvelope.privacyPolicy,
            provenance = syncEnvelope.provenance,
            artifactCount = 1,
            appliedArtifactCount = 1,
            conflictCount = 1,
            reasonCodes = listOf(
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_LEARNING_SYNC_DELIVERED,
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_RESOLVED
            ),
            summary = "Imported one redacted learning artifact after restore.",
            processedAtMs = 1_700_360_000_600L
        )
        val aggregationSummary = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationSummary(
            aggregationId = "aggregation_m36_restore",
            groupKey = syncGroupKey,
            boundary = syncBoundary,
            artifactCount = 4,
            deviceCount = 2,
            highestDriftSeverity = com.lumi.coredomain.contract.PortfolioDriftSeverity.HIGH,
            reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_FEDERATED_AGGREGATION_APPLIED),
            summary = "Same-tenant device aggregation restored from persistence.",
            updatedAtMs = 1_700_360_000_700L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationObjectiveProfileSnapshots = listOf(objectiveSnapshot),
                    portfolioOptimizationCalibrationSnapshots = listOf(calibrationSnapshot),
                    portfolioOptimizationRequests = listOf(request),
                    portfolioOptimizationResults = listOf(result),
                    portfolioOptimizationDecisionRecords = listOf(decision),
                    portfolioOptimizationDriftSummaries = listOf(drift),
                    portfolioOptimizationLearningSyncEnvelopes = listOf(syncEnvelope),
                    portfolioOptimizationLearningSyncAttemptRecords = listOf(syncAttempt),
                    portfolioOptimizationLearningSyncConflictRecords = listOf(syncConflict),
                    portfolioOptimizationFederatedAggregationSummaries = listOf(aggregationSummary)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                decisionId = decision.decisionId,
                includeCompleted = true,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(includeReviewed = true, limit = 10)
        )

        assertTrue(restored.learningSyncEnvelopes.any { it.envelopeId == syncEnvelope.envelopeId })
        assertTrue(restored.learningSyncAttemptRecords.any { it.attemptId == syncAttempt.attemptId })
        assertTrue(restored.learningSyncConflictRecords.any { it.conflictId == syncConflict.conflictId })
        assertTrue(
            restored.federatedAggregationSummaries.any {
                it.aggregationId == aggregationSummary.aggregationId
            }
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            restored.summary?.activeLearningSyncMode
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
            restored.summary?.latestLearningSyncStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.SAFE_MERGE,
            restored.summary?.latestLearningSyncConflictResolution
        )
        assertTrue(
            restored.summary?.latestFederatedAggregationSummary?.contains("Same-tenant", ignoreCase = true) == true
        )
        assertTrue(
            console.portfolioOptimizationState?.summary?.latestLearningSyncSummary
                ?.contains("Imported one redacted", ignoreCase = true) == true
        )
    }

    @Test
    fun `restore continuity keeps m37 consent transport and audit export state`() {
        val userId = "u-m37-restore"
        val objectiveSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_snapshot_m37_restore_v1",
            profileId = "objective_m37_restore",
            version = 1,
            binding = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.USER,
                userId = userId,
                workspaceId = "workspace_restore_m37",
                tenantId = "tenant_restore_m37",
                summary = "Restore-safe objective profile binding."
            ),
            objectiveProfile = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m37_restore",
                summary = "Restore-safe objective profile."
            ),
            summary = "Objective profile snapshot restored for M37 continuity.",
            createdAtMs = 1_700_370_000_000L
        )
        val calibrationSnapshot = com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "calibration_m37_restore_v1",
            version = 1,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            summary = "Calibration snapshot restored for M37 continuity.",
            createdAtMs = 1_700_370_000_100L
        )
        val request = PortfolioOptimizationRequest(
            requestId = "request_m37_restore",
            name = "Restore M37 continuity",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfile = objectiveSnapshot.objectiveProfile,
            constraintProfile = PortfolioOptimizationConstraintProfile(profileId = "constraint_m37_restore")
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m37_restore",
            requestId = request.requestId,
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            summary = "Result restored with M37 context."
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m37_restore",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m37_restore",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedAtMs = 1_700_370_000_200L,
            summary = "Selected restore-safe M37 candidate."
        )
        val outcome = com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord(
            outcomeId = "outcome_m37_restore",
            decisionId = decision.decisionId,
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = decision.candidateId,
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            summary = "Outcome restored for M37 continuity.",
            recordedAtMs = 1_700_370_000_250L
        )
        val drift = com.lumi.coredomain.contract.PortfolioOptimizationDriftSummary(
            driftId = "drift_m37_restore",
            decisionId = decision.decisionId,
            outcomeId = outcome.outcomeId,
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            highestSeverity = com.lumi.coredomain.contract.PortfolioDriftSeverity.MEDIUM,
            summary = "Drift restored for M37 continuity.",
            createdAtMs = 1_700_370_000_300L
        )
        val tuningDecision = com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord(
            tuningDecisionId = "tuning_m37_restore",
            suggestionId = "suggestion_m37_restore",
            decisionId = decision.decisionId,
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            appliedSnapshotId = "calibration_m37_restore_v2",
            status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.APPLIED,
            summary = "Tuning decision restored for M37 continuity.",
            decidedAtMs = 1_700_370_000_350L
        )
        val consent = com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord(
            consentId = "consent_m37_restore",
            scopeBinding = com.lumi.coredomain.contract.PortfolioOptimizationConsentScopeBinding(
                scope = com.lumi.coredomain.contract.PortfolioOptimizationConsentScope.ACCOUNT,
                userId = userId
            ),
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
            summary = "Transport consent restored.",
            recordedAtMs = 1_700_370_000_360L
        )
        val remoteEnvelope = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningEnvelope(
            remoteEnvelopeId = "remote_envelope_m37_restore",
            sourceEnvelopeId = "sync_envelope_m37_restore",
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            boundary = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundary(
                boundaryId = "boundary_m37_restore",
                boundaryType = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
                tenantId = "tenant_restore_m37",
                workspaceId = "workspace_restore_m37",
                sameTenantOnly = true,
                summary = "Tenant boundary restored."
            ),
            groupKey = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationGroupKey(
                groupKey = "device_sync:tenant_restore_m37:workspace_restore_m37",
                mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
                boundaryType = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
                tenantId = "tenant_restore_m37",
                workspaceId = "workspace_restore_m37"
            ),
            enterprisePrivacyPolicy = com.lumi.coredomain.contract.PortfolioOptimizationEnterprisePrivacyPolicySummary(
                policyId = "enterprise_privacy_m37_restore",
                sameTenantOnly = true,
                rawContentBlocked = true,
                rawPromptsBlocked = true,
                remoteTransportAllowedByRolePolicy = true,
                auditExportAllowedByRolePolicy = true,
                learningSyncConsentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                remoteTransportConsentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                auditExportConsentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Enterprise privacy restored for M37 continuity."
            ),
            consentRecordId = consent.consentId,
            artifactCount = 1,
            payloadHash = "payload_hash_m37_restore",
            summary = "Remote envelope restored."
        )
        val remoteBatch = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningBatch(
            batchId = "remote_batch_m37_restore",
            transportMode = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportMode.NO_OP,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            remoteEnvelopeIds = listOf(remoteEnvelope.remoteEnvelopeId),
            idempotencyKey = "idempotency_m37_restore",
            envelopeCount = 1,
            artifactCount = 1,
            payloadHash = remoteEnvelope.payloadHash,
            summary = "Remote batch restored."
        )
        val remoteAttempt = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            attemptId = "remote_attempt_m37_restore",
            batchId = remoteBatch.batchId,
            remoteEnvelopeId = remoteEnvelope.remoteEnvelopeId,
            transportMode = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportMode.NO_OP,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
            consentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
            privacySummary = "Enterprise privacy restored for M37 continuity.",
            summary = "Remote transport remained local-only after restore.",
            processedAtMs = 1_700_370_000_370L
        )
        val exportRequest = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest(
            requestId = "audit_request_m37_restore",
            decisionId = decision.decisionId,
            resultId = result.resultId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            requestedByOperatorId = "compliance-admin",
            requestedByOperatorName = "Compliance Admin",
            summary = "Audit export request restored."
        )
        val exportResult = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult(
            resultId = "audit_result_m37_restore",
            requestId = exportRequest.requestId,
            status = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            redactionSummary = "Audit export remained redaction-first.",
            summary = "Audit export restored.",
            completedAtMs = 1_700_370_000_380L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationObjectiveProfileSnapshots = listOf(objectiveSnapshot),
                    portfolioOptimizationCalibrationSnapshots = listOf(calibrationSnapshot),
                    portfolioOptimizationRequests = listOf(request),
                    portfolioOptimizationResults = listOf(result),
                    portfolioOptimizationDecisionRecords = listOf(decision),
                    portfolioOptimizationOutcomeRecords = listOf(outcome),
                    portfolioOptimizationDriftSummaries = listOf(drift),
                    portfolioOptimizationTuningDecisionRecords = listOf(tuningDecision),
                    portfolioOptimizationConsentRecords = listOf(consent),
                    portfolioOptimizationRemoteLearningEnvelopes = listOf(remoteEnvelope),
                    portfolioOptimizationRemoteLearningBatches = listOf(remoteBatch),
                    portfolioOptimizationRemoteLearningTransportAttemptRecords = listOf(remoteAttempt),
                    portfolioOptimizationComplianceAuditExportRequests = listOf(exportRequest),
                    portfolioOptimizationComplianceAuditExportResults = listOf(exportResult)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                decisionId = decision.decisionId,
                includeCompleted = true,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(includeReviewed = true, limit = 10)
        )

        assertTrue(restored.decisions.any { it.decisionId == decision.decisionId })
        assertTrue(restored.outcomes.any { it.outcomeId == outcome.outcomeId })
        assertTrue(restored.driftSummaries.any { it.driftId == drift.driftId })
        assertTrue(restored.tuningDecisionRecords.any { it.tuningDecisionId == tuningDecision.tuningDecisionId })
        assertTrue(restored.consentRecords.any { it.consentId == consent.consentId })
        assertTrue(restored.remoteLearningEnvelopes.any { it.remoteEnvelopeId == remoteEnvelope.remoteEnvelopeId })
        assertTrue(restored.remoteLearningBatches.any { it.batchId == remoteBatch.batchId })
        assertTrue(
            restored.remoteLearningTransportAttemptRecords.any {
                it.attemptId == remoteAttempt.attemptId
            }
        )
        assertTrue(
            restored.complianceAuditExportRequests.any {
                it.requestId == exportRequest.requestId
            }
        )
        assertTrue(
            restored.complianceAuditExportResults.any {
                it.resultId == exportResult.resultId
            }
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
            restored.summary?.latestRemoteTransportStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            restored.summary?.latestComplianceAuditExportStatus
        )
        assertEquals(true, restored.activeEnterprisePrivacyPolicy?.rawContentBlocked)
        assertEquals(true, restored.activeEnterprisePrivacyPolicy?.rawPromptsBlocked)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
            console.portfolioOptimizationState?.summary?.latestRemoteTransportStatus
        )
    }

    @Test
    fun restorePortfolioOptimizationState_preservesM38ConnectorKeyAndDeadLetterContinuity() {
        val userId = "u-m38-restore"
        val connectorProfile = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile(
            profileId = "portfolio_remote_connector_m38_restore",
            type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            displayName = "HTTPS webhook connector",
            endpointRef = "https://enterprise.example/learning",
            healthStatus =
                com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
            retryPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy(
                maxAttempts = 2,
                localFallbackAllowed = false,
                deadLetterAfterMaxAttempts = true,
                summary = "Connector retries once and then dead-letters."
            ),
            summary = "HTTPS webhook connector restored for M38 continuity.",
            updatedAtMs = 1_700_380_000_100L
        )
        val keyReference = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyReference(
            keyRefId = "portfolio_remote_key_m38_restore",
            connectorProfileId = connectorProfile.profileId,
            providerName = "enterprise-vault",
            status = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            usagePolicy = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyUsagePolicy(
                remoteTransportAllowed = true,
                auditExportAllowed = true,
                purposeLimited = true,
                summary = "Enterprise key remains purpose-limited."
            ),
            summary = "Enterprise key restored in a healthy state.",
            updatedAtMs = 1_700_380_000_110L
        )
        val remoteEnvelope = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningEnvelope(
            remoteEnvelopeId = "remote_envelope_m38_restore",
            sourceEnvelopeId = "sync_envelope_m38_restore",
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
            boundary = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundary(
                boundaryId = "boundary_m38_restore",
                boundaryType = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
                tenantId = "tenant_restore_m38",
                workspaceId = "workspace_restore_m38",
                sameTenantOnly = true,
                summary = "Tenant boundary restored for remote delivery continuity."
            ),
            groupKey = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationGroupKey(
                groupKey = "device_sync:tenant_restore_m38:workspace_restore_m38",
                mode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
                boundaryType = com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
                tenantId = "tenant_restore_m38",
                workspaceId = "workspace_restore_m38"
            ),
            artifactCount = 1,
            payloadHash = "payload_hash_m38_restore",
            summary = "Remote envelope restored for M38 continuity.",
            createdAtMs = 1_700_380_000_120L
        )
        val remoteBatch = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningBatch(
            batchId = "remote_batch_m38_restore",
            transportMode = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportMode.PRODUCTION_CONNECTOR,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            remoteEnvelopeIds = listOf(remoteEnvelope.remoteEnvelopeId),
            idempotencyKey = "idempotency_m38_restore",
            envelopeCount = 1,
            artifactCount = 1,
            payloadHash = remoteEnvelope.payloadHash,
            summary = "Remote batch restored for M38 continuity.",
            createdAtMs = 1_700_380_000_130L
        )
        val deadLetter = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportDeadLetterRecord(
            deadLetterId = "dead_letter_m38_restore",
            attemptId = "remote_attempt_m38_restore",
            batchId = remoteBatch.batchId,
            remoteEnvelopeId = remoteEnvelope.remoteEnvelopeId,
            connectorProfileId = connectorProfile.profileId,
            failureReason = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT,
            summary = "Remote delivery exhausted retries and was dead-lettered.",
            createdAtMs = 1_700_380_000_160L
        )
        val remoteAttempt = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            attemptId = "remote_attempt_m38_restore",
            batchId = remoteBatch.batchId,
            remoteEnvelopeId = remoteEnvelope.remoteEnvelopeId,
            transportMode = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportMode.PRODUCTION_CONNECTOR,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
            idempotencyKey = remoteBatch.idempotencyKey,
            consentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
            connectorBinding = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorBinding(
                profileId = connectorProfile.profileId,
                type = connectorProfile.type,
                healthStatus = connectorProfile.healthStatus,
                keyRefId = keyReference.keyRefId,
                summary = connectorProfile.summary
            ),
            enterpriseKeyReference = keyReference,
            credentialResolution = com.lumi.coredomain.contract.PortfolioOptimizationTransportCredentialResolutionResult(
                connectorProfileId = connectorProfile.profileId,
                keyRefId = keyReference.keyRefId,
                resolved = true,
                summary = "Credential resolution restored as healthy.",
                checkedAtMs = 1_700_380_000_140L
            ),
            complianceGateResult = com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateResult(
                decision = com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                summary = "Compliance gate restored as allowed with redaction.",
                checkedAtMs = 1_700_380_000_145L
            ),
            transportSummary = com.lumi.coredomain.contract.PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = connectorProfile.summary,
                keySummary = keyReference.summary,
                complianceSummary = "Compliance gate restored as allowed with redaction.",
                summary = "Connector, key, and compliance state restored."
            ),
            deliveryResult = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportDeliveryResult(
                status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
                failureReason = com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT,
                retryCount = 2,
                summary = "Remote delivery exhausted retries and was dead-lettered."
            ),
            deadLetterRecordId = deadLetter.deadLetterId,
            privacySummary = "Enterprise privacy restored for M38 continuity.",
            reasonCodes = listOf(
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_REMOTE_TRANSPORT_CONNECTOR_SELECTED,
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_REMOTE_TRANSPORT_DELIVERY_DEAD_LETTERED
            ),
            summary = "Remote delivery exhausted retries and was dead-lettered.",
            processedAtMs = 1_700_380_000_150L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationRemoteLearningEnvelopes = listOf(remoteEnvelope),
                    portfolioOptimizationRemoteLearningBatches = listOf(remoteBatch),
                    portfolioOptimizationRemoteLearningTransportAttemptRecords = listOf(remoteAttempt),
                    portfolioOptimizationRemoteTransportConnectorProfiles = listOf(connectorProfile),
                    portfolioOptimizationEnterpriseKeyReferences = listOf(keyReference),
                    portfolioOptimizationRemoteTransportDeadLetterRecords = listOf(deadLetter)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteTransportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
                remoteTransportConnectorType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                remoteTransportKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                remoteTransportComplianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                portfolioRemoteTransportConnectorType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                portfolioEnterpriseKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                portfolioComplianceGateDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                portfolioRemoteTransportDeadLettered = true,
                limit = 10
            )
        )

        assertTrue(restored.remoteTransportConnectorProfiles.any { it.profileId == connectorProfile.profileId })
        assertTrue(restored.enterpriseKeyReferences.any { it.keyRefId == keyReference.keyRefId })
        assertTrue(restored.remoteTransportDeadLetterRecords.any { it.deadLetterId == deadLetter.deadLetterId })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            restored.summary?.latestRemoteTransportConnectorType
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            restored.summary?.latestRemoteTransportKeyStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            restored.summary?.latestRemoteTransportComplianceDecision
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
            restored.summary?.latestRemoteTransportStatus
        )
        assertEquals(1, restored.summary?.remoteTransportDeadLetterCount)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            console.portfolioOptimizationState?.summary?.latestRemoteTransportConnectorType
        )
        assertEquals(1, console.portfolioOptimizationState?.summary?.remoteTransportDeadLetterCount)
    }

    @Test
    fun restorePortfolioOptimizationState_preservesM39DestinationResidencyAndExportRouteContinuity() {
        val userId = "euTenant_restore_m39"
        val destinationProfile = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
            destinationId = "portfolio_destination_remote_m39_restore",
            type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
            displayName = "EU compliance archive",
            connectorProfileId = "portfolio_remote_connector_m39_restore",
            residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
            destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationPolicy(
                policyId = "destination_policy_m39_restore",
                allowedPurposes = listOf(com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT),
                sameTenantOnly = true,
                requiresHealthyConnector = true,
                requiresHealthyKey = true,
                requiresResidencyMatch = true,
                requiresJurisdictionMatch = true,
                localFallbackAllowed = false,
                holdForReviewOnPolicyMismatch = true,
                summary = "EU archive requires EU GDPR routing."
            ),
            summary = "EU compliance archive restored for M39 continuity.",
            updatedAtMs = 1_700_390_000_100L
        )
        val destinationDecision = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
            decisionId = "destination_decision_m39_restore",
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            sourceId = "audit_request_m39_restore",
            status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            preferredDestinationId = destinationProfile.destinationId,
            residencyPolicy = com.lumi.coredomain.contract.PortfolioOptimizationDataResidencyPolicy(
                policyId = "residency_policy_m39_restore",
                residencyBoundary = com.lumi.coredomain.contract.PortfolioOptimizationResidencyBoundary(
                    boundaryId = "boundary_m39_restore",
                    tenantId = "euTenant",
                    workspaceId = "workspace_m39_restore",
                    region = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                    jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                    summary = "EU tenant remains inside EU GDPR routing boundaries."
                ),
                allowedRegions = listOf(com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU),
                allowedJurisdictions =
                    listOf(com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR),
                strictResidency = true,
                strictJurisdiction = true,
                localFallbackAllowed = false,
                holdForReviewOnMismatch = true,
                summary = "Residency policy restored for M39 continuity."
            ),
            residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
            blockReason = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationBlockReason.REVIEW_REQUIRED,
            reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_ROUTE_HELD),
            summary = "Destination route is held pending compliance review.",
            createdAtMs = 1_700_390_000_110L
        )
        val exportRoute = com.lumi.coredomain.contract.PortfolioOptimizationComplianceExportRouteRecord(
            routeId = "export_route_m39_restore",
            requestId = "audit_request_m39_restore",
            resultId = "audit_result_m39_restore",
            destinationDecisionId = destinationDecision.decisionId,
            destinationId = destinationProfile.destinationId,
            destinationType = destinationProfile.type,
            status = com.lumi.coredomain.contract.PortfolioOptimizationComplianceExportRouteStatus.HELD,
            residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
            locationRef = "memory://portfolio-audit/held_m39_restore.json",
            reasonCodes = listOf(com.lumi.coredomain.contract.RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_ROUTE_HELD),
            summary = "Compliance export route restored as held for review.",
            createdAtMs = 1_700_390_000_120L
        )
        val exportResult = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult(
            resultId = "audit_result_m39_restore",
            requestId = "audit_request_m39_restore",
            status = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
            destinationDecision = destinationDecision,
            exportRoute = exportRoute,
            complianceGateResult = com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateResult(
                decision = com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.BLOCKED,
                blockReason = com.lumi.coredomain.contract.PortfolioOptimizationComplianceBlockReason.REVIEW_REQUIRED,
                redactionEnforced = true,
                localFallbackAllowed = false,
                summary = "Compliance gate blocked export until review is complete.",
                checkedAtMs = 1_700_390_000_130L
            ),
            summary = "Audit export restored as held for compliance review.",
            completedAtMs = 1_700_390_000_140L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationRemoteDestinationProfiles = listOf(destinationProfile),
                    portfolioOptimizationRemoteDestinationDecisionRecords = listOf(destinationDecision),
                    portfolioOptimizationComplianceAuditExportResults = listOf(exportResult),
                    portfolioOptimizationComplianceExportRouteRecords = listOf(exportRoute)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                includeCompleted = true,
                remoteDestinationStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                portfolioRemoteDestinationStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                limit = 10
            )
        )

        assertTrue(restored.remoteDestinationProfiles.any { it.destinationId == destinationProfile.destinationId })
        assertTrue(
            restored.remoteDestinationDecisionRecords.any { it.decisionId == destinationDecision.decisionId }
        )
        assertTrue(restored.complianceExportRouteRecords.any { it.routeId == exportRoute.routeId })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            restored.summary?.latestRemoteDestinationStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
            restored.summary?.latestResidencyRegion
        )
        assertTrue(restored.summary?.latestComplianceExportRouteSummary?.contains("held", ignoreCase = true) == true)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            console.portfolioOptimizationState?.summary?.latestRemoteDestinationStatus
        )
    }

    @Test
    fun restorePortfolioOptimizationState_preservesM40DataExchangeApprovalAndAuditContinuity() {
        val userId = "euTenant_restore_m40"
        val artifact = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactRef(
            artifactClass =
                com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT,
            artifactId = "artifact_m40_restore",
            artifactHash = "hash_m40_restore",
            artifactType =
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
            redacted = true,
            summary = "Objective profile artifact restored for M40 continuity."
        )
        val bundle = com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
            bundleId = "bundle_m40_restore",
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType =
                com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
            sourceId = "audit_request_m40_restore",
            destinationIds = listOf("destination_remote_m40_restore", "destination_local_m40_restore"),
            destinationTypes = listOf(
                com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE
            ),
            artifacts = listOf(artifact),
            artifactClasses = listOf(artifact.artifactClass),
            summary = "Split bundle restored for M40 continuity.",
            createdAtMs = 1_700_400_000_100L
        )
        val boundarySummary = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeBoundarySummary(
            boundaryId = "boundary_m40_restore",
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
            summary = "EU GDPR boundary restored for M40 continuity."
        )
        val bundleDecision =
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m40_restore",
                bundleId = bundle.bundleId,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType = bundle.bundleType,
                sourceId = bundle.sourceId,
                destinationPolicy =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                        policyId = "bundle_policy_m40_restore",
                        bundleType = bundle.bundleType,
                        allowedRemoteArtifactClasses = listOf(
                            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                        ),
                        localOnlyArtifactClasses = listOf(
                            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE
                        ),
                        splitAllowed = true,
                        redactionRequired = true,
                        summary = "Receipt traces remain local while remote-safe artifacts export."
                    ),
                boundarySummary = boundarySummary,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                primaryDestinationId = "destination_remote_m40_restore",
                primaryDestinationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                splitResult = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleSplitResult(
                    splitRequired = true,
                    primaryDestinationId = "destination_remote_m40_restore",
                    secondaryDestinationId = "destination_local_m40_restore",
                    remoteArtifactClasses = listOf(
                        com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                    ),
                    localArtifactClasses = listOf(
                        com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE
                    ),
                    summary = "Receipt traces stayed local under the split policy."
                ),
                redactionResult =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleRedactionResult(
                        redactionApplied = true,
                        redactedArtifactClasses = listOf(
                            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                        ),
                        summary = "Redaction-first handling restored."
                    ),
                reasonCodes = listOf(
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT,
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_DESTINATION_BUNDLE_REDACTED
                ),
                summary = "Bundle split restored for M40 continuity.",
                createdAtMs = 1_700_400_000_110L
            )
        val manifest = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
            manifestId = "manifest_m40_restore",
            bundleId = bundle.bundleId,
            bundleDecisionId = bundleDecision.decisionId,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.SPLIT,
            destinationIds = bundle.destinationIds,
            destinationTypes = bundle.destinationTypes,
            artifactRefs = listOf(artifact),
            boundarySummary = boundarySummary,
            summary = "Split manifest restored for M40 continuity.",
            createdAtMs = 1_700_400_000_120L
        )
        val approval = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
            approvalId = "approval_m40_restore",
            bundleDecisionId = bundleDecision.decisionId,
            manifestId = manifest.manifestId,
            sourceId = bundle.sourceId,
            required = false,
            status =
                com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            reasonCodes = listOf(
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_DESTINATION_BUNDLE_AUTO_APPROVED
            ),
            summary = "Cross-boundary split bundle auto-approved.",
            recordedAtMs = 1_700_400_000_130L
        )
        val audit = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
            auditId = "audit_m40_restore",
            bundleDecisionId = bundleDecision.decisionId,
            manifestId = manifest.manifestId,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            operationType =
                com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            result = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
            reasonCodes = listOf(
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT,
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_CROSS_BOUNDARY_AUDIT_RECORDED
            ),
            summary = "Cross-boundary split audit restored for M40 continuity.",
            recordedAtMs = 1_700_400_000_140L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationDataExchangeBundles = listOf(bundle),
                    portfolioOptimizationDataExchangeBundleDecisionRecords = listOf(bundleDecision),
                    portfolioOptimizationDataExchangeManifests = listOf(manifest),
                    portfolioOptimizationCrossBoundaryApprovalRecords = listOf(approval),
                    portfolioOptimizationCrossBoundaryAuditRecords = listOf(audit)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                includeCompleted = true,
                dataExchangeDecisionStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                portfolioDataExchangeDecisionStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                limit = 10
            )
        )

        assertTrue(restored.dataExchangeBundles.any { it.bundleId == bundle.bundleId })
        assertTrue(
            restored.dataExchangeBundleDecisionRecords.any { it.decisionId == bundleDecision.decisionId }
        )
        assertTrue(restored.dataExchangeManifests.any { it.manifestId == manifest.manifestId })
        assertTrue(restored.crossBoundaryApprovalRecords.any { it.approvalId == approval.approvalId })
        assertTrue(restored.crossBoundaryAuditRecords.any { it.auditId == audit.auditId })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            restored.summary?.latestDataExchangeDecisionStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            restored.summary?.latestDataExchangeApprovalStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            restored.summary?.latestCrossBoundaryAuditOperationType
        )
        assertTrue(restored.summary?.latestCrossBoundaryAuditSummary?.contains("split", ignoreCase = true) == true)
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            console.portfolioOptimizationState?.summary?.latestDataExchangeDecisionStatus
        )
    }

    @Test
    fun restorePortfolioOptimizationState_preservesM42GovernancePortfolioContinuity() {
        val userId = "euTenant_restore_m42"
        val artifact = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactRef(
            artifactClass =
                com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT,
            artifactId = "artifact_m42_restore",
            artifactHash = "hash_m42_restore",
            artifactType =
                com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
            redacted = true,
            summary = "Objective profile artifact restored for M42 continuity."
        )
        val bundle = com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle(
            bundleId = "bundle_m42_restore",
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType =
                com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
            sourceId = "audit_request_m42_restore",
            destinationIds = listOf("destination_remote_m42_restore", "destination_local_m42_restore"),
            destinationTypes = listOf(
                com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE
            ),
            artifacts = listOf(artifact),
            artifactClasses = listOf(artifact.artifactClass),
            summary = "Split bundle restored for M42 continuity.",
            createdAtMs = 1_700_420_000_100L
        )
        val boundarySummary = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeBoundarySummary(
            boundaryId = "boundary_m42_restore",
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
            summary = "EU GDPR boundary restored for M42 continuity."
        )
        val destinationProfileRemote =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_remote_m42_restore",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                displayName = "EU compliance archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                destinationPolicy = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationPolicy(
                    sameTenantOnly = true
                ),
                summary = "Remote EU archive restored for M42 continuity.",
                updatedAtMs = 1_700_420_000_090L
            )
        val destinationProfileLocal =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile(
                destinationId = "destination_local_m42_restore",
                type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE,
                displayName = "Local compliance archive",
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "Local archive restored for M42 continuity.",
                updatedAtMs = 1_700_420_000_091L
            )
        val destinationDecision =
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord(
                decisionId = "destination_decision_m42_restore",
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                sourceId = bundle.sourceId,
                status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.ROUTED,
                preferredDestinationId = destinationProfileRemote.destinationId,
                selectedDestinationId = destinationProfileRemote.destinationId,
                selectedDestinationType = destinationProfileRemote.type,
                residencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                summary = "Remote destination routing restored for M42 continuity.",
                createdAtMs = 1_700_420_000_095L
            )
        val bundleDecision =
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord(
                decisionId = "bundle_decision_m42_restore",
                bundleId = bundle.bundleId,
                purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
                bundleType = bundle.bundleType,
                sourceId = bundle.sourceId,
                destinationPolicy =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundlePolicy(
                        policyId = "bundle_policy_m42_restore",
                        bundleType = bundle.bundleType,
                        allowedRemoteArtifactClasses = listOf(
                            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                        ),
                        localOnlyArtifactClasses = listOf(
                            com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE
                        ),
                        splitAllowed = true,
                        redactionRequired = true,
                        summary = "Receipt traces remain local while remote-safe artifacts export."
                    ),
                boundarySummary = boundarySummary,
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                primaryDestinationId = destinationProfileRemote.destinationId,
                primaryDestinationType = destinationProfileRemote.type,
                splitResult = com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleSplitResult(
                    splitRequired = true,
                    primaryDestinationId = destinationProfileRemote.destinationId,
                    secondaryDestinationId = destinationProfileLocal.destinationId,
                    remoteArtifactClasses = listOf(
                        com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                    ),
                    localArtifactClasses = listOf(
                        com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE
                    ),
                    summary = "Receipt traces stayed local under the split policy."
                ),
                reasonCodes = listOf(
                    com.lumi.coredomain.contract.RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT
                ),
                summary = "Bundle split restored for M42 continuity.",
                createdAtMs = 1_700_420_000_110L
            )
        val manifest = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest(
            manifestId = "manifest_m42_restore",
            bundleId = bundle.bundleId,
            bundleDecisionId = bundleDecision.decisionId,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            status = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifestStatus.SPLIT,
            destinationIds = bundle.destinationIds,
            destinationTypes = bundle.destinationTypes,
            artifactRefs = listOf(artifact),
            boundarySummary = boundarySummary,
            holdReason = com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeHoldReason.NONE,
            summary = "Split manifest restored for M42 continuity.",
            createdAtMs = 1_700_420_000_120L
        )
        val approval = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord(
            approvalId = "approval_m42_restore",
            bundleDecisionId = bundleDecision.decisionId,
            manifestId = manifest.manifestId,
            sourceId = bundle.sourceId,
            required = false,
            status =
                com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            reasonCodes = listOf(
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_DESTINATION_BUNDLE_AUTO_APPROVED
            ),
            summary = "Cross-boundary split bundle auto-approved.",
            recordedAtMs = 1_700_420_000_130L
        )
        val audit = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord(
            auditId = "audit_m42_restore",
            bundleDecisionId = bundleDecision.decisionId,
            manifestId = manifest.manifestId,
            purpose = com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            operationType =
                com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            result = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
            reasonCodes = listOf(
                com.lumi.coredomain.contract.RoleReasonCodes.ROLE_CROSS_BOUNDARY_AUDIT_RECORDED
            ),
            summary = "Cross-boundary split audit restored for M42 continuity.",
            recordedAtMs = 1_700_420_000_140L
        )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationRemoteDestinationProfiles =
                        listOf(destinationProfileRemote, destinationProfileLocal),
                    portfolioOptimizationRemoteDestinationDecisionRecords = listOf(destinationDecision),
                    portfolioOptimizationDataExchangeBundles = listOf(bundle),
                    portfolioOptimizationDataExchangeBundleDecisionRecords = listOf(bundleDecision),
                    portfolioOptimizationDataExchangeManifests = listOf(manifest),
                    portfolioOptimizationCrossBoundaryApprovalRecords = listOf(approval),
                    portfolioOptimizationCrossBoundaryAuditRecords = listOf(audit)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                includeCompleted = true,
                governancePortfolioStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.DEGRADED,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                portfolioGovernancePortfolioStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.DEGRADED,
                limit = 10
            )
        )

        assertTrue(restored.destinationTrustTierAssignments.isNotEmpty())
        assertTrue(restored.crossBoundaryProgramRecords.isNotEmpty())
        assertTrue(restored.crossBoundaryGovernancePortfolios.isNotEmpty())
        assertTrue(restored.trustTierProgramSummaries.isNotEmpty())
        assertTrue(restored.jurisdictionRolloutPlans.isNotEmpty())
        assertTrue(restored.portfolioPriorityDecisions.isNotEmpty())
        assertTrue(restored.portfolioCoordinationRecommendations.isNotEmpty())
        assertTrue(restored.portfolioWaveCoordinationRecords.isNotEmpty())
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            restored.summary?.activeDestinationTrustTier
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.DEGRADED,
            restored.summary?.activeCrossBoundaryGovernancePortfolioStatus
        )
        assertTrue(
            restored.summary?.latestGovernancePortfolioSummary?.contains("governance portfolio", ignoreCase = true) ==
                true
        )
        assertTrue(
            restored.summary?.latestTrustTierProgramSummary?.contains("trust", ignoreCase = true) == true
        )
        assertTrue(
            restored.summary?.latestJurisdictionRolloutSummary?.contains("rollout", ignoreCase = true) == true
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.DEGRADED,
            console.portfolioOptimizationState?.summary?.activeCrossBoundaryGovernancePortfolioStatus
        )
    }

    @Test
    fun restorePortfolioOptimizationState_preservesM43AnalyticsRiskBudgetAndCorrectiveContinuity() {
        val userId = "euTenant_restore_m43"
        val analytics = com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary(
            analyticsId = "analytics_m43_restore",
            portfolioId = "cross_boundary_portfolio_m43_restore",
            healthStatus =
                com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
            trajectoryState =
                com.lumi.coredomain.contract.PortfolioOptimizationPortfolioTrajectoryState.DRIFTING,
            sharedBlockerCount = 2,
            conflictCount = 1,
            riskBudgetBreached = true,
            summary = "Analytics detect rising reroute pressure and worsening rollout health.",
            updatedAtMs = 1_700_430_000_010L
        )
        val riskBudget = com.lumi.coredomain.contract.PortfolioOptimizationRiskBudget(
            budgetId = "risk_budget_m43_restore",
            portfolioId = analytics.portfolioId,
            allocatedUnits = 8,
            consumedUnits = 11,
            remainingUnits = 0,
            breachUnits = 3,
            status = com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
            summary = "Risk budget exceeded after repeated held and blocked exchanges.",
            updatedAtMs = 1_700_430_000_020L
        )
        val trustTierDrift = com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftSummary(
            driftId = "trust_tier_drift_m43_restore",
            portfolioId = analytics.portfolioId,
            trustTier = com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED,
            driftState = com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftState.DRIFTING,
            driftReasons = listOf(
                com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftReason.BLOCKER_CONCENTRATION
            ),
            programIds = listOf("cross_boundary_program_limited_us_restore", "cross_boundary_program_peer"),
            blockedCount = 2,
            heldCount = 1,
            summary = "Limited-trust destinations are drifting beyond expected hold rates.",
            updatedAtMs = 1_700_430_000_030L
        )
        val jurisdictionDrift =
            com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftSummary(
                driftId = "jurisdiction_drift_m43_restore",
                portfolioId = analytics.portfolioId,
                jurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                driftState = com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftState.DRIFTING,
                driftReasons = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftReason.REPEATED_BLOCK
                ),
                programIds = listOf("cross_boundary_program_limited_us_restore", "cross_boundary_program_peer"),
                blockedCount = 2,
                deferredCount = 1,
                summary = "US privacy rollout is drifting behind the approved sequence.",
                updatedAtMs = 1_700_430_000_040L
            )
        val concentration =
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationRiskConcentrationSummary(
                concentrationId = "concentration_m43_restore",
                portfolioId = analytics.portfolioId,
                dominantDestinationId = "destination_limited_m43_restore",
                dominantDestinationCount = 2,
                totalDestinationCount = 3,
                concentrationRatio = 0.67,
                highRiskDestinationCount = 2,
                summary = "Two limited-trust destinations now carry most cross-boundary load.",
                updatedAtMs = 1_700_430_000_050L
            )
        val blockerTrend =
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerTrendSummary(
                trendId = "blocker_trend_m43_restore",
                portfolioId = analytics.portfolioId,
                direction = com.lumi.coredomain.contract.PortfolioOptimizationTrendDirection.RISING,
                previousCount = 1,
                currentCount = 3,
                dominantBlockerType =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerType.APPROVAL,
                summary = "Approval blockers increased from 1 to 3 across the active portfolio.",
                updatedAtMs = 1_700_430_000_060L
            )
        val recommendation =
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendation(
                recommendationId = "risk_recommendation_m43_restore",
                portfolioId = analytics.portfolioId,
                action =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
                analyticsId = analytics.analyticsId,
                riskBudgetId = riskBudget.budgetId,
                blocking = true,
                targetTrustTier = com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED,
                targetJurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                summary = "Resequence jurisdictions and limit limited-trust rollout until drift stabilizes.",
                createdAtMs = 1_700_430_000_070L
            )
        val correctiveAction =
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord(
                actionRecordId = "corrective_action_m43_restore",
                portfolioId = analytics.portfolioId,
                analyticsId = analytics.analyticsId,
                riskRecommendationId = recommendation.recommendationId,
                actionType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
                targetProgramId = "cross_boundary_program_limited_us_restore",
                targetTrustTier = com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.LIMITED,
                targetJurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.US_PRIVACY,
                actorId = "local-user",
                actorName = "Local Operator",
                summary = "Recorded request risk hold for the most concentrated limited-trust program.",
                recordedAtMs = 1_700_430_000_080L
            )
        val governancePortfolio =
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolio(
                portfolioId = analytics.portfolioId,
                scopeKey = "workspace_restore_m43",
                status =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                programIds = listOf("cross_boundary_program_limited_us_restore", "cross_boundary_program_peer"),
                sharedBlockerCount = analytics.sharedBlockerCount,
                conflictCount = analytics.conflictCount,
                recommendationId = recommendation.recommendationId,
                summary = "Governance portfolio restored for M43 analytics continuity.",
                updatedAtMs = 1_700_430_000_005L
            )
        val safetyRail =
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyRail(
                safetyRailId = "safety_rail_m44_restore",
                portfolioId = analytics.portfolioId,
                type = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyRailType.RISK_BUDGET,
                safetyState = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.GUARDED,
                enforcementMode = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                blocking = true,
                targetProgramId = correctiveAction.targetProgramId,
                targetTrustTier = correctiveAction.targetTrustTier,
                targetJurisdiction = correctiveAction.targetJurisdiction,
                summary = "Risk budget guardrail requires a bounded soft-stop before broader rollout.",
                updatedAtMs = 1_700_430_000_081L
            )
        val budgetGuardrail =
            com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrail(
                guardrailId = "budget_guardrail_m44_restore",
                portfolioId = analytics.portfolioId,
                riskBudgetId = riskBudget.budgetId,
                state = com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
                enforcementMode = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                approvalRequired = false,
                breachUnits = riskBudget.breachUnits,
                summary = "Budget soft-stop remains active until risk pressure falls.",
                updatedAtMs = 1_700_430_000_082L
            )
        val safetySummary =
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetySummary(
                summaryId = "portfolio_safety_summary_m44_restore",
                portfolioId = analytics.portfolioId,
                safetyState = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.GUARDED,
                enforcementMode = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                activeSafetyRailIds = listOf(safetyRail.safetyRailId),
                budgetGuardrailId = budgetGuardrail.guardrailId,
                violationCount = 1,
                quarantineActive = false,
                approvalRequired = false,
                summary = "Portfolio safety is guarded with soft-stop enforcement.",
                updatedAtMs = 1_700_430_000_083L
            )
        val remediationControl =
            com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationControl(
                controlId = "remediation_control_m44_restore",
                portfolioId = analytics.portfolioId,
                automationState =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState.THROTTLED,
                enforcementMode = com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                suppressionReason =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemediationSuppressionReason.SHARED_BLOCKERS,
                throttleLimit = 1,
                approvalRequired = false,
                quarantined = false,
                linkedRecommendationId = recommendation.recommendationId,
                linkedCorrectiveActionId = correctiveAction.actionRecordId,
                summary = "Remediation automation is throttled while blockers stabilize.",
                updatedAtMs = 1_700_430_000_084L
            )
        val reader = AgentOrchestrator(
            dynamicStatePersistence = FakePersistencePort(
                loadResult = PersistedDynamicState(
                    activeRole = UserRole.WORK,
                    roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                    portfolioOptimizationCrossBoundaryGovernancePortfolios = listOf(governancePortfolio),
                    portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries = listOf(analytics),
                    portfolioOptimizationRiskBudgets = listOf(riskBudget),
                    portfolioOptimizationTrustTierDriftSummaries = listOf(trustTierDrift),
                    portfolioOptimizationJurisdictionDriftSummaries = listOf(jurisdictionDrift),
                    portfolioOptimizationDestinationRiskConcentrationSummaries = listOf(concentration),
                    portfolioOptimizationPortfolioBlockerTrendSummaries = listOf(blockerTrend),
                    portfolioOptimizationPortfolioRiskRecommendations = listOf(recommendation),
                    portfolioOptimizationCrossBoundaryCorrectiveActionRecords = listOf(correctiveAction),
                    portfolioOptimizationPortfolioSafetyRails = listOf(safetyRail),
                    portfolioOptimizationBudgetGuardrails = listOf(budgetGuardrail),
                    portfolioOptimizationPortfolioSafetySummaries = listOf(safetySummary),
                    portfolioOptimizationRemediationAutomationControls = listOf(remediationControl)
                )
            )
        )

        val restored = reader.getPortfolioOptimizationState(
            userId = userId,
            query = com.lumi.coredomain.contract.PortfolioOptimizationQuery(
                includeCompleted = true,
                limit = 10
            )
        )
        val console = reader.getGovernanceConsoleState(
            userId = userId,
            filter = com.lumi.coredomain.contract.GovernanceConsoleFilter(
                includeReviewed = true,
                limit = 10
            )
        )

        assertTrue(restored.crossBoundaryPortfolioAnalyticsSummaries.any { it.analyticsId == analytics.analyticsId })
        assertTrue(restored.portfolioRiskBudgets.any { it.budgetId == riskBudget.budgetId })
        assertTrue(restored.trustTierDriftSummaries.any { it.driftId == trustTierDrift.driftId })
        assertTrue(restored.jurisdictionDriftSummaries.any { it.driftId == jurisdictionDrift.driftId })
        assertTrue(restored.destinationRiskConcentrationSummaries.any { it.concentrationId == concentration.concentrationId })
        assertTrue(restored.portfolioBlockerTrendSummaries.any { it.trendId == blockerTrend.trendId })
        assertTrue(restored.portfolioRiskRecommendations.any { it.recommendationId == recommendation.recommendationId })
        assertTrue(restored.crossBoundaryCorrectiveActionRecords.any { it.actionRecordId == correctiveAction.actionRecordId })
        assertTrue(restored.portfolioSafetyRails.any { it.safetyRailId == safetyRail.safetyRailId })
        assertTrue(restored.portfolioBudgetGuardrails.any { it.guardrailId == budgetGuardrail.guardrailId })
        assertTrue(restored.portfolioSafetySummaries.any { it.summaryId == safetySummary.summaryId })
        assertTrue(restored.portfolioRemediationAutomationControls.any { it.controlId == remediationControl.controlId })
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
            restored.summary?.activePortfolioHealthStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
            restored.summary?.activeRiskBudgetStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.GUARDED,
            restored.summary?.activePortfolioSafetyState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
            restored.summary?.activeBudgetGuardrailState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            restored.summary?.activePortfolioEnforcementMode
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState.THROTTLED,
            restored.summary?.activeRemediationAutomationState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftState.DRIFTING,
            restored.summary?.latestTrustTierDriftState
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftState.DRIFTING,
            restored.summary?.latestJurisdictionDriftState
        )
        assertTrue(restored.summary?.latestRiskBudgetSummary?.contains("Risk budget exceeded", ignoreCase = true) == true)
        assertTrue(
            restored.summary?.latestPortfolioCorrectiveActionSummary?.contains("risk hold", ignoreCase = true) == true
        )
        assertTrue(
            restored.summary?.latestPortfolioSafetySummary?.contains("guarded", ignoreCase = true) == true
        )
        assertTrue(
            restored.summary?.latestBudgetGuardrailSummary?.contains("soft-stop", ignoreCase = true) == true
        )
        assertTrue(
            restored.summary?.latestRemediationAutomationSummary?.contains("throttled", ignoreCase = true) == true
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
            console.portfolioOptimizationState?.summary?.activeRiskBudgetStatus
        )
        assertEquals(
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.GUARDED,
            console.portfolioOptimizationState?.summary?.activePortfolioSafetyState
        )
    }

    private fun request(
        rawText: String,
        stateVector: DynamicHumanStatePayload? = null
    ): AgentRequest {
        return AgentRequest(
            sessionId = "s-1",
            userId = "u-1",
            sourceApp = "com.demo.chat",
            mode = AgentMode.AGENT_MODE,
            rawText = rawText,
            timestampMs = 1L,
            locale = "en-US",
            networkPolicy = NetworkPolicy.LOCAL_FIRST,
            module = ModuleId.CHAT,
            stateVector = stateVector
        )
    }

    private class FakePersistencePort(
        private val loadResult: PersistedDynamicState? = null
    ) : DynamicStatePersistencePort {
        var loadCount: Int = 0
        val saveCalls: MutableList<SaveCall> = mutableListOf()

        override fun load(userId: String): PersistedDynamicState? {
            loadCount += 1
            return loadResult
        }

        override fun save(
            userId: String,
            dynamicState: DynamicHumanStatePayload?,
            trajectory: List<TrajectoryPointPayload>,
            activeRole: UserRole?,
            roleSource: RoleSource?,
            rolePolicyOverrides: Map<UserRole, RolePolicyProfile>,
            executionLedgerRecords: List<ExecutionReceiptRecord>,
            telemetryEmissionRecords: List<TelemetryEmissionRecord>,
            alertDeliveryRecords: List<AlertDeliveryRecord>,
            reconciliationJobRecords: List<ReconciliationJobRecord>,
            collaborationStates: List<GovernanceCaseCollaborationState>,
            remoteOperatorHandoffRecords: List<RemoteOperatorHandoffRecord>,
            alertRoutingRecords: List<AlertRoutingRecord>
        ) {
            saveCalls += SaveCall(
                userId = userId,
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
                portfolioScenarioDefinitions = emptyList(),
                portfolioSimulationRunRecords = emptyList(),
                portfolioScenarioComparisons = emptyList(),
                portfolioOptimizationObjectiveProfileSnapshots = emptyList(),
                portfolioOptimizationCalibrationSnapshots = emptyList(),
                portfolioOptimizationRequests = emptyList(),
                portfolioOptimizationResults = emptyList(),
                portfolioOptimizationDecisionRecords = emptyList(),
                portfolioOptimizationOutcomeRecords = emptyList(),
                portfolioOptimizationDriftSummaries = emptyList(),
                portfolioOptimizationTuningSuggestions = emptyList(),
                portfolioOptimizationTuningDecisionRecords = emptyList(),
                portfolioOptimizationPropagationAttemptRecords = emptyList(),
                portfolioOptimizationPropagationApprovalRecords = emptyList(),
                portfolioOptimizationPropagationAdoptionRecords = emptyList(),
                portfolioOptimizationLearningSyncEnvelopes = emptyList(),
                portfolioOptimizationLearningSyncAttemptRecords = emptyList(),
                portfolioOptimizationLearningSyncConflictRecords = emptyList(),
                portfolioOptimizationConsentRecords = emptyList(),
                portfolioOptimizationRemoteLearningEnvelopes = emptyList(),
                portfolioOptimizationRemoteLearningBatches = emptyList(),
                portfolioOptimizationRemoteLearningTransportAttemptRecords = emptyList(),
                portfolioOptimizationRemoteDestinationProfiles = emptyList(),
                portfolioOptimizationRemoteDestinationDecisionRecords = emptyList(),
                portfolioOptimizationRemoteTransportConnectorProfiles = emptyList(),
                portfolioOptimizationEnterpriseKeyReferences = emptyList(),
                portfolioOptimizationRemoteTransportDeadLetterRecords = emptyList(),
                portfolioOptimizationComplianceAuditExportRequests = emptyList(),
                portfolioOptimizationComplianceAuditExportResults = emptyList(),
                portfolioOptimizationComplianceExportRouteRecords = emptyList(),
                portfolioOptimizationDataExchangeBundles = emptyList(),
                portfolioOptimizationDataExchangeBundleDecisionRecords = emptyList(),
                portfolioOptimizationDataExchangeManifests = emptyList(),
                portfolioOptimizationCrossBoundaryApprovalRecords = emptyList(),
                portfolioOptimizationCrossBoundaryAuditRecords = emptyList(),
                portfolioOptimizationDestinationTrustTierAssignments = emptyList(),
                portfolioOptimizationCrossBoundaryProgramRecords = emptyList(),
                portfolioOptimizationCrossBoundaryGovernancePortfolios = emptyList(),
                portfolioOptimizationTrustTierProgramSummaries = emptyList(),
                portfolioOptimizationJurisdictionRolloutPlans = emptyList(),
                portfolioOptimizationPortfolioBlockerSummaries = emptyList(),
                portfolioOptimizationPortfolioDependencySummaries = emptyList(),
                portfolioOptimizationPortfolioConflictSummaries = emptyList(),
                portfolioOptimizationPortfolioPriorityDecisions = emptyList(),
                portfolioOptimizationPortfolioCoordinationRecommendations = emptyList(),
                portfolioOptimizationPortfolioWaveCoordinationRecords = emptyList(),
                portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries = emptyList(),
                portfolioOptimizationRiskBudgets = emptyList(),
                portfolioOptimizationTrustTierDriftSummaries = emptyList(),
                portfolioOptimizationJurisdictionDriftSummaries = emptyList(),
                portfolioOptimizationDestinationRiskConcentrationSummaries = emptyList(),
                portfolioOptimizationPortfolioBlockerTrendSummaries = emptyList(),
                portfolioOptimizationPortfolioRiskRecommendations = emptyList(),
                portfolioOptimizationCrossBoundaryCorrectiveActionRecords = emptyList(),
                portfolioOptimizationPortfolioSafetyRails = emptyList(),
                portfolioOptimizationBudgetGuardrails = emptyList(),
                portfolioOptimizationPortfolioSafetySummaries = emptyList(),
                portfolioOptimizationRemediationAutomationControls = emptyList(),
                portfolioOptimizationFederatedAggregationSummaries = emptyList()
            )
        }

        override fun saveExtended(
            userId: String,
            dynamicState: DynamicHumanStatePayload?,
            trajectory: List<TrajectoryPointPayload>,
            activeRole: UserRole?,
            roleSource: RoleSource?,
            rolePolicyOverrides: Map<UserRole, RolePolicyProfile>,
            executionLedgerRecords: List<ExecutionReceiptRecord>,
            telemetryEmissionRecords: List<TelemetryEmissionRecord>,
            alertDeliveryRecords: List<AlertDeliveryRecord>,
            reconciliationJobRecords: List<ReconciliationJobRecord>,
            collaborationStates: List<GovernanceCaseCollaborationState>,
            remoteOperatorHandoffRecords: List<RemoteOperatorHandoffRecord>,
            alertRoutingRecords: List<AlertRoutingRecord>,
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
            portfolioOptimizationResults: List<PortfolioOptimizationResult>,
            portfolioOptimizationDecisionRecords: List<PortfolioOptimizationDecisionRecord>,
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
            saveCalls += SaveCall(
                userId = userId,
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
        }
    }

    private data class SaveCall(
        val userId: String,
        val dynamicState: DynamicHumanStatePayload?,
        val trajectory: List<TrajectoryPointPayload>,
        val activeRole: UserRole?,
        val roleSource: RoleSource?,
        val rolePolicyOverrides: Map<UserRole, RolePolicyProfile>,
        val executionLedgerRecords: List<ExecutionReceiptRecord>,
        val telemetryEmissionRecords: List<TelemetryEmissionRecord>,
        val alertDeliveryRecords: List<AlertDeliveryRecord>,
        val reconciliationJobRecords: List<ReconciliationJobRecord>,
        val collaborationStates: List<GovernanceCaseCollaborationState>,
        val remoteOperatorHandoffRecords: List<RemoteOperatorHandoffRecord>,
        val alertRoutingRecords: List<AlertRoutingRecord>,
        val portfolioScenarioDefinitions: List<PortfolioScenarioDefinition>,
        val portfolioSimulationRunRecords: List<PortfolioSimulationRunRecord>,
        val portfolioScenarioComparisons: List<PortfolioScenarioComparison>,
        val portfolioOptimizationObjectiveProfileSnapshots:
            List<com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot>,
        val portfolioOptimizationCalibrationSnapshots:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot>,
        val portfolioOptimizationRequests: List<PortfolioOptimizationRequest>,
        val portfolioOptimizationResults: List<PortfolioOptimizationResult>,
        val portfolioOptimizationDecisionRecords: List<PortfolioOptimizationDecisionRecord>,
        val portfolioOptimizationOutcomeRecords: List<com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord>,
        val portfolioOptimizationDriftSummaries: List<com.lumi.coredomain.contract.PortfolioOptimizationDriftSummary>,
        val portfolioOptimizationTuningSuggestions:
            List<com.lumi.coredomain.contract.PortfolioOptimizationTuningSuggestion>,
        val portfolioOptimizationTuningDecisionRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord>,
        val portfolioOptimizationPropagationAttemptRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPropagationAttemptRecord>,
        val portfolioOptimizationPropagationApprovalRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRecord>,
        val portfolioOptimizationPropagationAdoptionRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPropagationAdoptionRecord>,
        val portfolioOptimizationLearningSyncEnvelopes:
            List<com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncEnvelope>,
        val portfolioOptimizationLearningSyncAttemptRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncAttemptRecord>,
        val portfolioOptimizationLearningSyncConflictRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictRecord>,
        val portfolioOptimizationConsentRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord>,
        val portfolioOptimizationRemoteLearningEnvelopes:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningEnvelope>,
        val portfolioOptimizationRemoteLearningBatches:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningBatch>,
        val portfolioOptimizationRemoteLearningTransportAttemptRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord>,
        val portfolioOptimizationRemoteDestinationProfiles:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile>,
        val portfolioOptimizationRemoteDestinationDecisionRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord>,
        val portfolioOptimizationRemoteTransportConnectorProfiles:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile>,
        val portfolioOptimizationEnterpriseKeyReferences:
            List<com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyReference>,
        val portfolioOptimizationRemoteTransportDeadLetterRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportDeadLetterRecord>,
        val portfolioOptimizationComplianceAuditExportRequests:
            List<com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest>,
        val portfolioOptimizationComplianceAuditExportResults:
            List<com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult>,
        val portfolioOptimizationComplianceExportRouteRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationComplianceExportRouteRecord>,
        val portfolioOptimizationDataExchangeBundles:
            List<com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle>,
        val portfolioOptimizationDataExchangeBundleDecisionRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord>,
        val portfolioOptimizationDataExchangeManifests:
            List<com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest>,
        val portfolioOptimizationCrossBoundaryApprovalRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord>,
        val portfolioOptimizationCrossBoundaryAuditRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord>,
        val portfolioOptimizationDestinationTrustTierAssignments:
            List<com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTierAssignment>,
        val portfolioOptimizationCrossBoundaryProgramRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramRecord>,
        val portfolioOptimizationCrossBoundaryGovernancePortfolios:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolio>,
        val portfolioOptimizationTrustTierProgramSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationTrustTierProgramSummary>,
        val portfolioOptimizationJurisdictionRolloutPlans:
            List<com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutPlan>,
        val portfolioOptimizationPortfolioBlockerSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerSummary>,
        val portfolioOptimizationPortfolioDependencySummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioDependencySummary>,
        val portfolioOptimizationPortfolioConflictSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioConflictSummary>,
        val portfolioOptimizationPortfolioPriorityDecisions:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriorityDecision>,
        val portfolioOptimizationPortfolioCoordinationRecommendations:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioCoordinationRecommendation>,
        val portfolioOptimizationPortfolioWaveCoordinationRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioWaveCoordinationRecord>,
        val portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary>,
        val portfolioOptimizationRiskBudgets:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRiskBudget>,
        val portfolioOptimizationTrustTierDriftSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftSummary>,
        val portfolioOptimizationJurisdictionDriftSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftSummary>,
        val portfolioOptimizationDestinationRiskConcentrationSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationDestinationRiskConcentrationSummary>,
        val portfolioOptimizationPortfolioBlockerTrendSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerTrendSummary>,
        val portfolioOptimizationPortfolioRiskRecommendations:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendation>,
        val portfolioOptimizationCrossBoundaryCorrectiveActionRecords:
            List<com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord>,
        val portfolioOptimizationPortfolioSafetyRails:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyRail>,
        val portfolioOptimizationBudgetGuardrails:
            List<com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrail>,
        val portfolioOptimizationPortfolioSafetySummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetySummary>,
        val portfolioOptimizationRemediationAutomationControls:
            List<com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationControl>,
        val portfolioOptimizationFederatedAggregationSummaries:
            List<com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationSummary>
    )
}

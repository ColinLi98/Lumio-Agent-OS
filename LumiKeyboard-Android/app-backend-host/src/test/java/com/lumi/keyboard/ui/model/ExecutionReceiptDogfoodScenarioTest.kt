package com.lumi.keyboard.ui.model

import com.lumi.coreagent.orchestrator.AgentOrchestrator
import com.lumi.coredomain.contract.AgentMode
import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.AgentRequestConstraints
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.ExecutionReceipt
import com.lumi.coredomain.contract.ExternalApprovalSummary
import com.lumi.coredomain.contract.ExternalDataScopeSummary
import com.lumi.coredomain.contract.ExternalDisputeSummary
import com.lumi.coredomain.contract.ExternalRollbackSummary
import com.lumi.coredomain.contract.ExternalVerificationSummary
import com.lumi.coredomain.contract.FieldHints
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.ProviderDecisionStatus
import com.lumi.coredomain.contract.ProviderPolicyDecision
import com.lumi.coredomain.contract.ProviderSelectionSummary
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.UserRole
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExecutionReceiptDogfoodScenarioTest {

    @Test
    fun dogfoodScenarios_keepReceiptCopyBalancedAndComplete() = runBlocking {
        val orchestrator = AgentOrchestrator(digitalTwinCloudSyncEnabled = true)
        val checks = mutableSetOf<String>()

        val scenarios = listOf(
            DogfoodScenario(
                name = "work_rewrite_with_live_search",
                request = request(
                    sessionId = "dogfood-work-1",
                    rawText = "Rewrite this project update and run live search for supporting links.",
                    module = ModuleId.CHAT,
                    constraints = AgentRequestConstraints(
                        activeRole = UserRole.WORK,
                        roleSource = RoleSource.EXPLICIT_USER_SELECTION
                    )
                )
            ),
            DogfoodScenario(
                name = "parent_budget_guard_denial",
                request = request(
                    sessionId = "dogfood-parent-1",
                    rawText = "Publish this requirement to LIX market and execute supplier contract.",
                    module = ModuleId.LIX,
                    constraints = AgentRequestConstraints(
                        budget = "30000",
                        deadline = "5 days",
                        acceptanceCriteria = "evidence-backed completion",
                        userConfirmationToken = "CONFIRM-PARENT-001",
                        activeRole = UserRole.PARENT,
                        roleSource = RoleSource.EXPLICIT_USER_SELECTION
                    )
                )
            ),
            DogfoodScenario(
                name = "parent_permissions_data_scope",
                request = request(
                    sessionId = "dogfood-parent-2",
                    rawText = "Show my permissions profile.",
                    module = ModuleId.AVATAR,
                    constraints = AgentRequestConstraints(
                        activeRole = UserRole.PARENT,
                        roleSource = RoleSource.EXPLICIT_USER_SELECTION
                    )
                )
            ),
            DogfoodScenario(
                name = "buyer_external_options",
                request = request(
                    sessionId = "dogfood-buyer-1",
                    rawText = "Execute as buyer role and compare external options.",
                    module = ModuleId.CHAT,
                    constraints = AgentRequestConstraints(
                        activeRole = UserRole.BUYER,
                        roleSource = RoleSource.EXPLICIT_USER_SELECTION
                    )
                )
            )
        )

        scenarios.forEach { scenario ->
            val response = orchestrator.handleRequest(
                request = scenario.request,
                cloudGateway = null
            )
            assertNotNull("${scenario.name}: execution receipt missing", response.executionReceipt)

            val title = ExecutionReceiptFormatter.activityTitle(
                response = response,
                fallback = response.summary.orEmpty().ifBlank { "No summary" }
            )
            val headline = ExecutionReceiptFormatter.headline(response)
            val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 4)
            val quality = ExecutionReceiptFormatter.qualitySignals(response)

            assertTrue("${scenario.name}: title too short/long", title.length in 8..96)
            assertTrue("${scenario.name}: headline missing", !headline.isNullOrBlank())
            assertTrue("${scenario.name}: headline too short/long", headline!!.length in 20..120)
            assertTrue("${scenario.name}: summary lines missing", lines.isNotEmpty())
            assertTrue(
                "${scenario.name}: summary line length out of bound",
                lines.all { it.length in 12..140 }
            )
            assertTrue("${scenario.name}: quality signal has no title", quality.hasTitle)
            assertTrue("${scenario.name}: quality signal has no headline", quality.hasHeadline)
            assertTrue("${scenario.name}: quality signal has no summary lines", quality.summaryLineCount > 0)

            if (quality.hasApprovalSummary) checks += "approval"
        }

        assertTrue("Dogfood set did not surface approval summary", checks.contains("approval"))
    }

    @Test
    fun dogfoodExternalVisibilityScenarios_coverRequiredM3_5Paths() {
        val scenarios = listOf(
            syntheticResponse(
                name = "work_vs_buyer_work_role",
                role = UserRole.WORK,
                providerDecision = ProviderPolicyDecision(
                    providerId = "provider_work_fit",
                    providerName = "Provider Work Fit",
                    decision = ProviderDecisionStatus.SELECTED,
                    readableReason = "Selected for task-fit and ETA reliability."
                ),
                providerSelection = ProviderSelectionSummary(
                    selectedProviderId = "provider_work_fit",
                    selectedProviderName = "Provider Work Fit",
                    selectionRationale = "Selected for task-fit and ETA reliability."
                ),
                approval = ExternalApprovalSummary(
                    required = false,
                    granted = false,
                    denied = false,
                    status = "not_required",
                    summary = "No additional approval gate triggered."
                )
            ),
            syntheticResponse(
                name = "work_vs_buyer_buyer_role",
                role = UserRole.BUYER,
                providerDecision = ProviderPolicyDecision(
                    providerId = "provider_budget_fit",
                    providerName = "Provider Budget Fit",
                    decision = ProviderDecisionStatus.SELECTED,
                    readableReason = "Selected for cost efficiency and proof fit."
                ),
                providerSelection = ProviderSelectionSummary(
                    selectedProviderId = "provider_budget_fit",
                    selectedProviderName = "Provider Budget Fit",
                    selectionRationale = "Selected for cost efficiency and proof fit."
                ),
                approval = ExternalApprovalSummary(
                    required = true,
                    granted = false,
                    denied = false,
                    status = "required",
                    summary = "Approval required by buyer policy before commit."
                )
            ),
            syntheticResponse(
                name = "review_reject_dispute_sync_pending",
                role = UserRole.BUYER,
                summary = "Dispute opened locally; gateway sync pending.",
                status = ResponseStatus.DISPUTED,
                providerDecision = ProviderPolicyDecision(
                    providerId = "provider_dispute",
                    providerName = "Provider Dispute",
                    decision = ProviderDecisionStatus.DENIED,
                    readableReason = "Denied after review rejection."
                ),
                approval = ExternalApprovalSummary(
                    required = true,
                    granted = false,
                    denied = true,
                    status = "denied",
                    summary = "Approval denied after review rejection."
                ),
                dispute = ExternalDisputeSummary(
                    opened = true,
                    summary = "Dispute opened locally; gateway sync pending."
                )
            ),
            syntheticResponse(
                name = "provider_data_scope_blocked",
                role = UserRole.PARENT,
                providerDecision = ProviderPolicyDecision(
                    providerId = "provider_sensitive",
                    providerName = "Provider Sensitive",
                    decision = ProviderDecisionStatus.DENIED,
                    readableReason = "Denied because provider-facing scope is blocked."
                ),
                dataScope = ExternalDataScopeSummary(
                    reduced = false,
                    blocked = true,
                    summary = "Provider-facing data scope blocked by parent policy."
                )
            ),
            syntheticResponse(
                name = "verification_failed_rollback_available",
                role = UserRole.BUYER,
                status = ResponseStatus.ROLLED_BACK,
                providerDecision = ProviderPolicyDecision(
                    providerId = "provider_verify",
                    providerName = "Provider Verify",
                    decision = ProviderDecisionStatus.SELECTED,
                    readableReason = "Selected pending verification."
                ),
                verification = ExternalVerificationSummary(
                    status = "failed",
                    passed = false,
                    partial = false,
                    summary = "Verification failed due to proof mismatch."
                ),
                rollback = ExternalRollbackSummary(
                    available = true,
                    triggered = true,
                    summary = "Rollback triggered by policy after verification failure."
                )
            )
        )

        scenarios.forEach { scenario ->
            val headline = ExecutionReceiptFormatter.externalSummaryHeadline(scenario.response)
            val lines = ExecutionReceiptFormatter.summaryLines(scenario.response, maxItems = 6)
            val quality = ExecutionReceiptFormatter.qualitySignals(scenario.response)

            assertTrue("${scenario.name}: external headline missing", !headline.isNullOrBlank())
            assertTrue("${scenario.name}: summary missing", lines.isNotEmpty())
            assertTrue("${scenario.name}: summary line length out of bounds", lines.all { it.length in 12..140 })
            assertTrue("${scenario.name}: headline too short/long", headline!!.length in 16..120)
            assertTrue("${scenario.name}: role/headline missing", quality.hasHeadline)
            assertTrue("${scenario.name}: summary count missing", quality.summaryLineCount > 0)
        }

        val workHeadline = ExecutionReceiptFormatter.externalSummaryHeadline(scenarios[0].response).orEmpty()
        val buyerHeadline = ExecutionReceiptFormatter.externalSummaryHeadline(scenarios[1].response).orEmpty()
        assertTrue("WORK vs BUYER should diverge in visible external summary", workHeadline != buyerHeadline)

        val disputeLines = ExecutionReceiptFormatter.summaryLines(scenarios[2].response, maxItems = 6)
        assertTrue(disputeLines.any { it.contains("Sync pending", ignoreCase = true) })

        val dataScopeLines = ExecutionReceiptFormatter.summaryLines(scenarios[3].response, maxItems = 6)
        assertTrue(dataScopeLines.any { it.contains("data scope", ignoreCase = true) })

        val rollbackLines = ExecutionReceiptFormatter.summaryLines(scenarios[4].response, maxItems = 6)
        assertTrue(rollbackLines.any { it.contains("verification failed", ignoreCase = true) })
        assertTrue(rollbackLines.any { it.contains("rollback", ignoreCase = true) })
    }

    private data class DogfoodScenario(
        val name: String,
        val request: AgentRequest
    )

    private data class SyntheticVisibilityScenario(
        val name: String,
        val response: AgentResponse
    )

    private fun request(
        sessionId: String,
        rawText: String,
        module: ModuleId,
        constraints: AgentRequestConstraints = AgentRequestConstraints()
    ): AgentRequest {
        return AgentRequest(
            sessionId = sessionId,
            userId = "dogfood-user",
            sourceApp = "com.android.chrome",
            mode = AgentMode.AGENT_MODE,
            rawText = rawText,
            fieldHints = FieldHints(),
            timestampMs = System.currentTimeMillis(),
            locale = "en-GB",
            networkPolicy = NetworkPolicy.LOCAL_FIRST,
            module = module,
            constraints = constraints
        )
    }

    private fun syntheticResponse(
        name: String,
        role: UserRole,
        summary: String = "External fulfillment scenario",
        status: ResponseStatus = ResponseStatus.SUCCESS,
        providerDecision: ProviderPolicyDecision? = null,
        providerSelection: ProviderSelectionSummary? = null,
        approval: ExternalApprovalSummary? = null,
        dataScope: ExternalDataScopeSummary? = null,
        verification: ExternalVerificationSummary? = null,
        rollback: ExternalRollbackSummary? = null,
        dispute: ExternalDisputeSummary? = null
    ): SyntheticVisibilityScenario {
        val decisions = listOfNotNull(providerDecision)
        val receipt = ExecutionReceipt(
            runId = "dogfood-$name",
            intentSummary = name,
            status = status,
            activeRole = role,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.ASSISTED,
            roleImpactReasonCodes = emptyList(),
            roleImpactSummary = "Role policy applied.",
            approvalSummary = approval?.summary ?: "No approval gate triggered for this run",
            dataScopeSummary = dataScope?.summary ?: "No additional data-scope restrictions",
            providerSummary = when {
                providerSelection?.selectedProviderName?.isNotBlank() == true ->
                    "Provider selected: ${providerSelection.selectedProviderName}"
                decisions.any { it.decision == ProviderDecisionStatus.DENIED } ->
                    "Provider blocked by role policy"
                else -> "No external provider decision recorded"
            },
            quoteSummary = "Collected 2 quotes for comparison",
            verificationSummary = verification?.summary ?: "No additional verification step required",
            proofSummary = "Proof artifacts captured",
            rollbackSummary = rollback?.summary ?: "No rollback action triggered",
            startedAt = 1_700_000_000_000,
            updatedAt = 1_700_000_000_500,
            completedAt = 1_700_000_001_000,
            providerSelectionSummary = providerSelection,
            providerPolicyDecisions = decisions,
            externalApprovalSummary = approval,
            externalDataScopeSummary = dataScope,
            externalVerificationSummary = verification,
            externalRollbackSummary = rollback,
            externalDisputeSummary = dispute,
            issueSummary = dispute?.summary
        )
        return SyntheticVisibilityScenario(
            name = name,
            response = AgentResponse(
                type = AgentResponseType.CARDS,
                summary = summary,
                traceId = "trace-$name",
                latencyMs = 35,
                confidence = 0.87,
                module = ModuleId.CHAT,
                status = status,
                executionReceipt = receipt
            )
        )
    }
}

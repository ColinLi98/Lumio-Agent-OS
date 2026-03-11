package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoleReasonCodes
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.UserRole
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoleTraceFormatterTest {

    @Test
    fun headline_formatsReadableRoleAndSource() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION
        )

        val headline = RoleTraceFormatter.headline(response)
        assertEquals("Running as Work role (Source: Explicit user selection)", headline)
    }

    @Test
    fun impactLines_translateCanonicalRoleReasonCodes() {
        val response = response(
            activeRole = UserRole.PARENT,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_CLOUD_SYNC_BLOCKED,
                RoleReasonCodes.ROLE_APPROVAL_REQUIRED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 2)
        assertEquals(2, lines.size)
        assertTrue(lines.first().contains("Cloud sync blocked", ignoreCase = true))
        assertTrue(lines.any { it.contains("Approval required", ignoreCase = true) })
    }

    @Test
    fun impactLines_includeUserPolicyOverrideReason() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(RoleReasonCodes.ROLE_POLICY_USER_OVERRIDE_APPLIED)
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 1)
        assertEquals(1, lines.size)
        assertTrue(lines.first().contains("User-edited role policy", ignoreCase = true))
    }

    @Test
    fun impactLines_translateExternalFulfillmentRoleReasonCodes() {
        val response = response(
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_QUOTE_COLLECTED,
                RoleReasonCodes.ROLE_EXTERNAL_APPROVAL_REQUIRED,
                RoleReasonCodes.ROLE_EXTERNAL_ROLLBACK_AVAILABLE
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)
        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("quotes collected", ignoreCase = true) })
        assertTrue(lines.any { it.contains("requires approval", ignoreCase = true) })
        assertTrue(lines.any { it.contains("rollback", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM21WorkflowPackAndSimulationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_WORKFLOW_POLICY_PACK_APPLIED,
                RoleReasonCodes.ROLE_WORKFLOW_POLICY_PRECEDENCE_WORKSPACE_OVERRIDE,
                RoleReasonCodes.ROLE_AUTOMATION_SIMULATION_ONLY
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)
        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("policy pack applied", ignoreCase = true) })
        assertTrue(lines.any { it.contains("workspace workflow override took precedence", ignoreCase = true) })
        assertTrue(lines.any { it.contains("simulation-only", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM22RolloutGovernanceReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_ROLLOUT_APPROVAL_REQUIRED,
                RoleReasonCodes.ROLE_POLICY_ROLLOUT_PROMOTION_BLOCKED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 2)

        assertEquals(2, lines.size)
        assertTrue(lines.any { it.contains("requires approval", ignoreCase = true) })
        assertTrue(lines.any { it.contains("promotion blocked", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM23PromotionGovernanceReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_PROMOTION_REQUESTED,
                RoleReasonCodes.ROLE_POLICY_ROLLOUT_ADVANCE_DENIED,
                RoleReasonCodes.ROLE_POLICY_ANALYTICS_RECOMMENDATION_HOLD
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("promotion request", ignoreCase = true) })
        assertTrue(lines.any { it.contains("advance is denied", ignoreCase = true) })
        assertTrue(lines.any { it.contains("recommend holding", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM24ProgramLifecycleAndCrossTenantReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_PROGRAM_CREATED,
                RoleReasonCodes.ROLE_POLICY_TARGET_PINNED,
                RoleReasonCodes.ROLE_POLICY_CROSS_TENANT_ROLLOUT_HELD
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("governance program was created", ignoreCase = true) })
        assertTrue(lines.any { it.contains("pinned", ignoreCase = true) })
        assertTrue(lines.any { it.contains("cross-tenant rollout is held", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM25PolicyEstateReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_ESTATE_SNAPSHOT_COMPUTED,
                RoleReasonCodes.ROLE_POLICY_ESTATE_DRIFT_SEVERITY_HIGH,
                RoleReasonCodes.ROLE_POLICY_ESTATE_REMEDIATION_RECOMMENDED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("estate snapshot", ignoreCase = true) })
        assertTrue(lines.any { it.contains("drift severity is high", ignoreCase = true) })
        assertTrue(lines.any { it.contains("remediation is recommended", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM26EstateAutomationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED,
                RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED,
                RoleReasonCodes.ROLE_ESTATE_AUTOMATION_CANCELLED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("scheduled", ignoreCase = true) })
        assertTrue(lines.any { it.contains("requires explicit approval", ignoreCase = true) })
        assertTrue(lines.any { it.contains("cancelled", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM27SchedulingAndCalendarReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_SCHEDULE_BLOCKED_BY_BLACKOUT,
                RoleReasonCodes.ROLE_ROLLOUT_STAGE_DEFERRED_BY_CALENDAR,
                RoleReasonCodes.ROLE_AUTOMATION_SUPPRESSED_BY_SCHEDULE
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("blackout", ignoreCase = true) })
        assertTrue(lines.any { it.contains("deferred by rollout calendar", ignoreCase = true) })
        assertTrue(lines.any { it.contains("suppressed by schedule", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM28RolloutWaveAndCrossWindowReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ROLLOUT_WAVE_CARRIED_FORWARD,
                RoleReasonCodes.ROLE_PROMOTION_WINDOW_DEFERRED,
                RoleReasonCodes.ROLE_CROSS_WINDOW_PAUSED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("carried forward", ignoreCase = true) })
        assertTrue(lines.any { it.contains("deferred", ignoreCase = true) })
        assertTrue(lines.any { it.contains("cross-window rollout is paused", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM29PromotionReadinessAndCrossWaveReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ROLLOUT_PROMOTION_DEFERRED_TO_WINDOW,
                RoleReasonCodes.ROLE_CROSS_WAVE_CARRY_FORWARD_PRESSURE,
                RoleReasonCodes.ROLE_WINDOW_NEXT_ELIGIBLE_COMPUTED,
                RoleReasonCodes.ROLE_ROLLOUT_PROMOTION_OPERATION_DEFER
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 4)

        assertEquals(4, lines.size)
        assertTrue(lines.any { it.contains("deferred to the next eligible window", ignoreCase = true) })
        assertTrue(lines.any { it.contains("carry-forward pressure", ignoreCase = true) })
        assertTrue(lines.any { it.contains("next eligible promotion window", ignoreCase = true) })
        assertTrue(lines.any { it.contains("operation recorded: defer", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM30ProgramCoordinationAndEscalationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_PRIORITY_APPLIED,
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_BLOCKED_BY_DEPENDENCY,
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_WINDOW_CONTENTION,
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_ESCALATION_OPENED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 4)

        assertEquals(4, lines.size)
        assertTrue(lines.any { it.contains("priority", ignoreCase = true) })
        assertTrue(lines.any { it.contains("dependency", ignoreCase = true) })
        assertTrue(lines.any { it.contains("contention", ignoreCase = true) })
        assertTrue(lines.any { it.contains("escalation opened", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM31CapacityAndBalancingReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_GOVERNANCE_APPROVAL_QUEUE_SATURATED,
                RoleReasonCodes.ROLE_GOVERNANCE_CAPACITY_BLOCKED,
                RoleReasonCodes.ROLE_GOVERNANCE_APPROVAL_LOAD_BALANCED,
                RoleReasonCodes.ROLE_GOVERNANCE_CAPACITY_REASSIGNED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 4)

        assertEquals(4, lines.size)
        assertTrue(lines.any { it.contains("queue is saturated", ignoreCase = true) })
        assertTrue(lines.any { it.contains("capacity limits", ignoreCase = true) })
        assertTrue(lines.any { it.contains("load balancing", ignoreCase = true) })
        assertTrue(lines.any { it.contains("reassigned", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM32PortfolioSimulationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RUN_CREATED,
                RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_CAPACITY_BREACH_PREDICTED,
                RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("simulation run created", ignoreCase = true) })
        assertTrue(lines.any { it.contains("capacity breach", ignoreCase = true) })
        assertTrue(lines.any { it.contains("increasing approval capacity", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM33PortfolioOptimizationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_CAPACITY_CONSTRAINT_BOUND,
                RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_THROUGHPUT_FOR_RISK,
                RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_SCHEDULE_SELECTED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("capacity", ignoreCase = true) })
        assertTrue(lines.any { it.contains("throughput for lower risk", ignoreCase = true) })
        assertTrue(lines.any { it.contains("schedule was selected", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM34PortfolioLearningReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_DRIFT_DETECTED,
                RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_TUNING_APPLIED,
                RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_TUNING_BLOCKED_GUARDRAIL
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("drift was detected", ignoreCase = true) })
        assertTrue(lines.any { it.contains("tuning was applied", ignoreCase = true) })
        assertTrue(lines.any { it.contains("blocked by guardrails", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM35ObjectiveProfilePropagationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_LEARNING_SCOPE_RESOLVED,
                RoleReasonCodes.ROLE_LEARNING_PROPAGATION_APPROVAL_REQUIRED,
                RoleReasonCodes.ROLE_LEARNING_PROPAGATION_SUPPRESSED_BY_DRIFT
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("scope was resolved", ignoreCase = true) })
        assertTrue(lines.any { it.contains("requires approval", ignoreCase = true) })
        assertTrue(lines.any { it.contains("suppressed by drift", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM36LearningSyncAndFederationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_LEARNING_SYNC_BLOCKED_BY_PRIVACY,
                RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_RESOLVED,
                RoleReasonCodes.ROLE_FEDERATED_AGGREGATION_APPLIED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("blocked by privacy policy", ignoreCase = true) })
        assertTrue(lines.any { it.contains("resolved", ignoreCase = true) && it.contains("conflict", ignoreCase = true) })
        assertTrue(lines.any { it.contains("federated aggregation", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM37ConsentTransportAndAuditReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_CONSENT_GRANTED,
                RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_LOCAL_ONLY,
                RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_GENERATED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("consent", ignoreCase = true) && it.contains("granted", ignoreCase = true) })
        assertTrue(lines.any { it.contains("local-first", ignoreCase = true) || it.contains("local only", ignoreCase = true) })
        assertTrue(lines.any { it.contains("compliance audit export", ignoreCase = true) && it.contains("generated", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM38RemoteConnectorAndComplianceReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_REMOTE_TRANSPORT_CONNECTOR_SELECTED,
                RoleReasonCodes.ROLE_ENTERPRISE_KEY_REVOKED,
                RoleReasonCodes.ROLE_COMPLIANCE_GATE_BLOCKED,
                RoleReasonCodes.ROLE_REMOTE_TRANSPORT_LOCAL_FALLBACK_USED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 4)

        assertEquals(4, lines.size)
        assertTrue(lines.any { it.contains("connector profile", ignoreCase = true) || it.contains("connector", ignoreCase = true) })
        assertTrue(lines.any { it.contains("key", ignoreCase = true) && it.contains("revoked", ignoreCase = true) })
        assertTrue(lines.any { it.contains("compliance gate", ignoreCase = true) && it.contains("blocked", ignoreCase = true) })
        assertTrue(lines.any { it.contains("local-first", ignoreCase = true) || it.contains("fell back", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM39DestinationResidencyAndExportRouteReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_REMOTE_DESTINATION_REROUTED,
                RoleReasonCodes.ROLE_REMOTE_DESTINATION_BLOCKED_BY_RESIDENCY,
                RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_ROUTE_HELD
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("rerouted", ignoreCase = true) })
        assertTrue(lines.any { it.contains("data residency policy", ignoreCase = true) })
        assertTrue(lines.any { it.contains("held for compliance review", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM40DataExchangeBundleApprovalAndAuditReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT,
                RoleReasonCodes.ROLE_DESTINATION_BUNDLE_APPROVAL_PENDING,
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_AUDIT_RECORDED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("split", ignoreCase = true) && it.contains("local", ignoreCase = true) })
        assertTrue(lines.any { it.contains("approval", ignoreCase = true) && it.contains("pending", ignoreCase = true) })
        assertTrue(lines.any { it.contains("audit", ignoreCase = true) && it.contains("recorded", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM42PortfolioTrustTierJurisdictionAndRecommendationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_DESTINATION_TRUST_TIER_ASSIGNED,
                RoleReasonCodes.ROLE_JURISDICTION_ROLLOUT_RESEQUENCED,
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_RECOMMENDATION_UPDATED,
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_SHARED_BLOCKER_DETECTED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 4)

        assertEquals(4, lines.size)
        assertTrue(lines.any { it.contains("trust tier", ignoreCase = true) && it.contains("assigned", ignoreCase = true) })
        assertTrue(lines.any { it.contains("jurisdiction", ignoreCase = true) && it.contains("resequenced", ignoreCase = true) })
        assertTrue(
            lines.any {
                it.contains("recommendation", ignoreCase = true) &&
                    (it.contains("next-action", ignoreCase = true) ||
                        it.contains("portfolio", ignoreCase = true))
            }
        )
        assertTrue(lines.any { it.contains("shared blocker", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM43PortfolioAnalyticsRiskBudgetAndCorrectiveReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_ANALYTICS_UPDATED,
                RoleReasonCodes.ROLE_RISK_BUDGET_BREACHED,
                RoleReasonCodes.ROLE_PORTFOLIO_CORRECTIVE_ACTION_RECORDED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("analytics", ignoreCase = true) })
        assertTrue(lines.any { it.contains("risk budget", ignoreCase = true) && it.contains("breached", ignoreCase = true) })
        assertTrue(lines.any { it.contains("corrective action", ignoreCase = true) })
    }

    @Test
    fun impactLines_translateM44PortfolioSafetyBudgetAndRemediationReasons() {
        val response = response(
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_PORTFOLIO_SAFETY_GUARDED,
                RoleReasonCodes.ROLE_PORTFOLIO_BUDGET_SOFT_STOP,
                RoleReasonCodes.ROLE_REMEDIATION_AUTOMATION_THROTTLED
            )
        )

        val lines = RoleTraceFormatter.impactLines(response, maxItems = 3)

        assertEquals(3, lines.size)
        assertTrue(lines.any { it.contains("safety rails", ignoreCase = true) && it.contains("guarded", ignoreCase = true) })
        assertTrue(lines.any { it.contains("budget guardrail", ignoreCase = true) && it.contains("soft stop", ignoreCase = true) })
        assertTrue(lines.any { it.contains("remediation automation", ignoreCase = true) && it.contains("throttled", ignoreCase = true) })
    }

    @Test
    fun exportSnippet_includesRoleSourceAndReadableImpact() {
        val response = response(
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.TASK_INHERITED,
            roleImpactReasonCodes = listOf(RoleReasonCodes.ROLE_ROUTE_BIAS_APPLIED)
        )

        val snippet = RoleTraceFormatter.exportSnippet(response)
        assertNotNull(snippet)
        assertTrue(snippet.contains("role=buyer"))
        assertTrue(snippet.contains("source=Task inherited"))
        assertTrue(snippet.contains("Routing adjusted by role policy"))
    }

    private fun response(
        activeRole: UserRole? = null,
        roleSource: RoleSource? = null,
        roleImpactReasonCodes: List<String> = emptyList()
    ): AgentResponse {
        return AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "Role trace test",
            traceId = "trace-role-ui",
            latencyMs = 12,
            confidence = 0.73,
            module = ModuleId.CHAT,
            status = ResponseStatus.SUCCESS,
            activeRole = activeRole,
            roleSource = roleSource,
            roleImpactReasonCodes = roleImpactReasonCodes
        )
    }
}

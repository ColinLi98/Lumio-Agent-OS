package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.GovernanceAlert
import com.lumi.coredomain.contract.AlertRoutingStatus
import com.lumi.coredomain.contract.GovernanceCasePriority
import com.lumi.coredomain.contract.GovernanceCaseRecord
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.GovernanceQueueType
import com.lumi.coredomain.contract.RemoteOperatorHandoffStatus

object GovernanceCaseFormatter {
    private const val MAX_LINE_CHARS = 144

    fun consoleHeadline(state: GovernanceConsoleState): String {
        val home = state.homeSummary
        val connector = home?.connectorIssueCases ?: 0
        val sync = home?.syncPendingCases ?: 0
        return "Cases ${state.matchedCases}/${state.totalRecords} · High priority ${state.highPriorityCases} · Sync $sync · Connector $connector · Reviewed ${state.reviewedCases}"
            .toReadableLine(MAX_LINE_CHARS)
    }

    fun priorityLabel(priority: GovernanceCasePriority): String {
        return when (priority) {
            GovernanceCasePriority.CRITICAL -> "Critical"
            GovernanceCasePriority.HIGH -> "High"
            GovernanceCasePriority.MEDIUM -> "Medium"
            GovernanceCasePriority.LOW -> "Low"
        }
    }

    fun queueLabel(queue: GovernanceQueueType): String {
        return when (queue) {
            GovernanceQueueType.NEEDS_ATTENTION -> "Needs attention"
            GovernanceQueueType.SYNC_PENDING -> "Sync pending"
            GovernanceQueueType.DISPUTE_FOLLOW_UP -> "Dispute follow-up"
            GovernanceQueueType.PROVIDER_ISSUE -> "Provider issue"
            GovernanceQueueType.VERIFICATION_FAILURE -> "Verification failure"
            GovernanceQueueType.ROLLBACK_FAILURE -> "Rollback failure"
            GovernanceQueueType.RECONCILIATION_MISMATCH -> "Reconciliation mismatch"
        }
    }

    fun caseLine(case: com.lumi.coredomain.contract.GovernanceCaseSummary): String {
        val role = case.activeRole?.name?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "Unknown role"
        val provider = case.providerLabel ?: "No provider"
        val settlement = case.settlementStatus.name.lowercase().replace('_', ' ')
        val stage = case.workflowStage
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · stage $it" }
            ?: ""
        val workflowPack = case.workflowPolicyPackId
            ?.takeIf { it.isNotBlank() }
            ?.let { " · pack ${it.take(16)}" }
            ?: ""
        val connector = case.connectorDestinationLabel
            ?.takeIf { it.isNotBlank() }
            ?.let { " · $it" }
            ?: ""
        val connectorMarker = when {
            case.connectorDeadLetterCount > 0 -> " · dead-letter ${case.connectorDeadLetterCount}"
            case.connectorFailedCount > 0 -> " · connector issue ${case.connectorFailedCount}"
            else -> ""
        }
        val slaMarker = case.slaStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · sla $it" }
            ?: ""
        val escalationMarker = case.escalationTimerStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · escalation $it" }
            ?: ""
        val automationMarker = case.automationEligibility
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · automation $it" }
            ?: ""
        val rolloutMarker = case.workflowRolloutStage
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · rollout $it" }
            ?: ""
        val promotionMarker = case.policyPromotionStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · promotion $it" }
            ?: ""
        val readinessMarker = case.policyPromotionReadiness
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · readiness $it" }
            ?: ""
        val rolloutPromotionReadinessMarker = case.rolloutPromotionReadinessStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · rollout readiness $it" }
            ?: ""
        val crossWaveHealthMarker = case.crossWaveHealthBucket
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · cross-wave $it" }
            ?: ""
        val crossWaveCountsMarker = if (case.crossWaveBlockedWaves > 0 || case.crossWaveDeferredWaves > 0) {
            " · blocked waves ${case.crossWaveBlockedWaves} · deferred waves ${case.crossWaveDeferredWaves}"
        } else {
            ""
        }
        val windowDelayMarker = case.windowDelayReason
            ?.name
            ?.takeIf { it != "NONE" }
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · window delay $it" }
            ?: ""
        val windowDelayCountMarker = if (case.windowDelayCount > 0) {
            " · delayed windows ${case.windowDelayCount}"
        } else {
            ""
        }
        val nextEligiblePromotionMarker = case.nextEligiblePromotionAtMs
            ?.takeIf { it > 0L }
            ?.let { " · promotion next $it" }
            ?: ""
        val promotionOperationMarker = case.promotionOperationType
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · op $it" }
            ?: ""
        val promotionOperationStatusMarker = case.promotionOperationStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · op status $it" }
            ?: ""
        val programMarker = case.policyGovernanceProgramStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · program $it" }
            ?: ""
        val waveMarker = case.policyGovernanceWaveStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · wave $it" }
            ?: ""
        val lifecycleMarker = case.workflowPackLifecycleStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · lifecycle $it" }
            ?: ""
        val crossTenantMarker = case.crossTenantReadinessStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · cross-tenant $it" }
            ?: ""
        val crossTenantCountMarker = if (
            case.crossTenantDriftedTargets > 0 ||
            case.crossTenantExemptedTargets > 0 ||
            case.crossTenantPinnedTargets > 0
        ) {
            " · drift ${case.crossTenantDriftedTargets} · exempted ${case.crossTenantExemptedTargets} · pinned ${case.crossTenantPinnedTargets}"
        } else {
            ""
        }
        val policyEstateMarker = case.policyEstateDriftSeverity
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · estate drift $it" }
            ?: ""
        val policyEstateBlockerMarker = if (case.policyEstateBlockerCount > 0) {
            " · estate blockers ${case.policyEstateBlockerCount}"
        } else {
            ""
        }
        val policyEstateRemediationMarker = if (case.policyEstateRemediationPending) {
            " · estate remediation pending"
        } else {
            ""
        }
        val scheduledRemediationMarker = case.scheduledRemediationStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · scheduled $it" }
            ?: ""
        val scheduleDecisionMarker = case.scheduleDecision
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · schedule $it" }
            ?: ""
        val scheduleBlockMarker = case.scheduleBlockReason
            ?.name
            ?.takeIf { it != "NONE" }
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · schedule reason $it" }
            ?: ""
        val scheduleWindowMarker = case.scheduleWindowStatus
            ?.name
            ?.takeIf { it != "NOT_TRACKED" }
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · window $it" }
            ?: ""
        val scheduleNextEligibleMarker = case.scheduleNextEligibleAtMs
            ?.takeIf { it > 0L }
            ?.let { " · next $it" }
            ?: ""
        val rolloutWaveMarker = case.rolloutWaveStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · rollout wave $it" }
            ?: ""
        val rolloutCompletionMarker = case.rolloutWaveCompletionState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · completion $it" }
            ?: ""
        val rolloutDecisionMarker = case.rolloutWaveDecision
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · wave decision $it" }
            ?: ""
        val rolloutWindowMarker = case.rolloutWindowEligibility
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · rollout window $it" }
            ?: ""
        val rolloutCarryForwardMarker = if (case.rolloutCarryForwardPending) " · carry-forward pending" else ""
        val rolloutCrossWindowMarker = if (case.rolloutCrossWindowPaused) " · cross-window paused" else ""
        val rolloutNextWindowMarker = if (case.rolloutNextWindowPending) " · next window pending" else ""
        val programPriorityMarker = case.programPriority
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · program priority $it" }
            ?: ""
        val programCoordinationMarker = case.programCoordinationState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · coordination $it" }
            ?: ""
        val programDecisionMarker = case.programDecisionReason
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · decision $it" }
            ?: ""
        val programContentionMarker = buildList {
            case.programContentionType
                ?.name
                ?.takeIf { it != "NONE" }
                ?.lowercase()
                ?.replace('_', ' ')
                ?.let { add(it) }
            case.programContentionLevel
                ?.name
                ?.takeIf { it != "NONE" }
                ?.lowercase()
                ?.replace('_', ' ')
                ?.let { add(it) }
        }.takeIf { it.isNotEmpty() }
            ?.joinToString("/")
            ?.let { " · contention $it" }
            ?: ""
        val programEscalationMarker = case.programEscalationStatus
            ?.name
            ?.takeIf { it != "NOT_ESCALATED" }
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · program escalation $it" }
            ?: ""
        val portfolioHealthMarker = case.portfolioGovernanceHealthStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · portfolio $it" }
            ?: ""
        val portfolioRiskBudgetMarker = case.portfolioRiskBudgetStatus
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · risk budget $it" }
            ?: ""
        val portfolioSafetyMarker = case.portfolioSafetyState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · safety $it" }
            ?: ""
        val portfolioGuardrailMarker = case.portfolioBudgetGuardrailState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · guardrail $it" }
            ?: ""
        val portfolioRemediationMarker = case.portfolioRemediationAutomationState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · remediation $it" }
            ?: ""
        val portfolioTrustTierDriftMarker = case.portfolioTrustTierDriftState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · trust drift $it" }
            ?: ""
        val portfolioJurisdictionDriftMarker = case.portfolioJurisdictionDriftState
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · jurisdiction drift $it" }
            ?: ""
        val portfolioRiskRecommendationMarker = case.portfolioRiskRecommendationAction
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · risk action $it" }
            ?: ""
        val portfolioCorrectiveActionMarker = case.portfolioCorrectiveActionType
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · corrective $it" }
            ?: ""
        val portfolioRiskBreachMarker = if (case.portfolioRiskBudgetBreached) {
            " · risk breached"
        } else {
            ""
        }
        val capacityPoolMarker = case.capacityPoolKey
            ?.takeIf { it.isNotBlank() }
            ?.let { " · capacity pool ${it.take(18)}" }
            ?: ""
        val approvalLoadMarker = case.approvalLoadBucket
            ?.name
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · load $it" }
            ?: ""
        val capacityDeferralMarker = case.capacityDeferralReason
            ?.name
            ?.takeIf { it != "NONE" }
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · defer $it" }
            ?: ""
        val balancingMarker = case.balancingDecisionType
            ?.name
            ?.takeIf { it != "NONE" }
            ?.lowercase()
            ?.replace('_', ' ')
            ?.let { " · balance $it" }
            ?: ""
        val capacityBlockMarker = buildList {
            if (case.capacityBlocked) {
                add("capacity blocked")
            }
            if (case.policyBlocked) {
                add("policy blocked")
            }
        }.takeIf { it.isNotEmpty() }
            ?.joinToString(prefix = " · ", separator = " · ")
            ?: ""
        val saturationMarker = if (case.approvalQueueSaturated) " · queue saturated" else ""
        val reserveMarker = if (case.criticalCapacityReserved) " · critical reserve" else ""
        val bottleneckMarker = if (case.portfolioBottleneck) " · bottleneck" else ""
        val automationStateMarker = buildList {
            if (case.automationApprovalRequired) add("approval required")
            if (case.automationCooldownActive) add("cooldown")
            if (case.automationSuppressed) add("suppressed")
            if (case.automationMaintenanceWindowBlocked) add("maintenance window")
        }.takeIf { it.isNotEmpty() }?.joinToString(", ")
            ?.let { " · $it" }
            ?: ""
        val approvalMarker = if (case.policyApprovalPending) " · policy approval pending" else ""
        val simulationMarker = if (case.workflowSimulationOnly) " · simulation only" else ""
        return "$role · $provider · settlement $settlement$capacityPoolMarker$approvalLoadMarker$capacityBlockMarker$saturationMarker$reserveMarker$bottleneckMarker$capacityDeferralMarker$balancingMarker$stage$workflowPack$connector$connectorMarker$slaMarker$escalationMarker$automationMarker$rolloutMarker$promotionMarker$readinessMarker$rolloutPromotionReadinessMarker$crossWaveHealthMarker$crossWaveCountsMarker$windowDelayMarker$windowDelayCountMarker$nextEligiblePromotionMarker$promotionOperationMarker$promotionOperationStatusMarker$programMarker$waveMarker$lifecycleMarker$crossTenantMarker$crossTenantCountMarker$policyEstateMarker$policyEstateBlockerMarker$policyEstateRemediationMarker$scheduledRemediationMarker$scheduleDecisionMarker$scheduleBlockMarker$scheduleWindowMarker$scheduleNextEligibleMarker$rolloutWaveMarker$rolloutCompletionMarker$rolloutDecisionMarker$rolloutWindowMarker$rolloutCarryForwardMarker$rolloutCrossWindowMarker$rolloutNextWindowMarker$programPriorityMarker$programCoordinationMarker$programDecisionMarker$programContentionMarker$programEscalationMarker$portfolioHealthMarker$portfolioRiskBudgetMarker$portfolioSafetyMarker$portfolioGuardrailMarker$portfolioRemediationMarker$portfolioTrustTierDriftMarker$portfolioJurisdictionDriftMarker$portfolioRiskRecommendationMarker$portfolioCorrectiveActionMarker$portfolioRiskBreachMarker$automationStateMarker$approvalMarker$simulationMarker"
            .toReadableLine(MAX_LINE_CHARS)
    }

    fun detailLines(case: GovernanceCaseRecord, maxItems: Int = 8): List<String> {
        val summary = case.summary
        val lines = buildList {
            add("Run: ${summary.runId}")
            add("Role: ${summary.activeRole?.name?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "Unknown"}")
            add("Role source: ${RoleTraceFormatter.readableSource(case.roleSource)}")
            case.delegationMode?.let {
                add("Delegation: ${it.name.lowercase().replace('_', ' ')}")
            }
            summary.assigneeTeamName
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Assignee team: $it") }
            summary.remoteOperatorId
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Remote operator ID: $it") }
            case.remoteOperatorIdentity?.let { remoteIdentity ->
                val remoteLabel = remoteIdentity.displayName.ifBlank { "Remote operator" }
                add("Remote operator: $remoteLabel (${remoteIdentity.operatorId})")
            }
            case.remoteOperatorTeam?.let { remoteTeam ->
                if (remoteTeam.displayName.isNotBlank()) {
                    add("Remote team: ${remoteTeam.displayName}")
                }
            }
            case.operatorIdentityProvenance?.let { provenance ->
                provenance.summary
                    .takeIf { it.isNotBlank() }
                    ?.let { add("Identity provenance: $it") }
                provenance.directorySync?.let { sync ->
                    val syncText = sync.summary.ifBlank {
                        sync.status.name.lowercase().replace('_', ' ')
                    }
                    add("Directory sync: $syncText")
                }
            }
            case.remoteAuthorizationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Remote auth: $it") }
            case.sessionAuthProvenanceSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Auth provenance: $it") }
            case.directorySyncSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Directory sync summary: $it") }
            case.connectorDestinationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Connector destination: $it") }
            case.connectorAuthProfileSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Connector auth profile: $it") }
            case.connectorCredentialSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Credential health: $it") }
            case.enterpriseIdentitySummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Enterprise identity: $it") }
            case.enterpriseSessionSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Enterprise session: $it") }
            case.idpProviderSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("IdP provider: $it") }
            case.scimDirectorySummary
                .takeIf { it.isNotBlank() }
                ?.let { add("SCIM sync: $it") }
            case.scimProviderSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("SCIM provider: $it") }
            case.vaultCredentialSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Vault credential: $it") }
            case.vaultProviderSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Vault provider: $it") }
            case.rolloutSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Rollout control: $it") }
            case.cutoverReadinessSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Cutover readiness: $it") }
            case.vaultRuntimeSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Vault runtime: $it") }
            case.enterpriseFallbackSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Fallback policy: $it") }
            case.enterpriseAuthIntegration
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Enterprise integration: $it") }
            case.lastConnectorCredentialLifecycle?.let { lifecycle ->
                add(
                    "Credential lifecycle: ${
                        lifecycle.state.name.lowercase().replace('_', ' ')
                    }"
                )
            }
            case.operatorConnectorAudit
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Connector audit: $it") }
            case.workflowSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow: $it") }
            case.summary.workflowTemplateName
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow template: $it") }
            case.summary.workflowPolicyPackId
                ?.takeIf { it.isNotBlank() }
                ?.let { packId ->
                    val packVersion = case.summary.workflowPolicyPackVersion
                        ?.takeIf { it.isNotBlank() }
                        ?.let { " ($it)" }
                        .orEmpty()
                    add("Workflow policy pack: $packId$packVersion")
                }
            case.summary.workflowPolicyPrecedenceSource
                ?.name
                ?.lowercase()
                ?.replace('_', ' ')
                ?.let { add("Workflow precedence source: $it") }
            if (case.summary.workflowSimulationOnly || case.workflowSimulationOnly) {
                add("Workflow simulation mode: simulation only")
            }
            case.summary.workflowStage
                ?.let { add("Workflow stage: ${it.name.lowercase().replace('_', ' ')}") }
            case.summary.workflowNextAction
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow next action: $it") }
            case.summary.slaStatus
                ?.let { add("SLA status: ${it.name.lowercase().replace('_', ' ')}") }
            case.summary.stageTimerStatus
                ?.let { add("Stage timer status: ${it.name.lowercase().replace('_', ' ')}") }
            case.summary.escalationTimerStatus
                ?.let { add("Escalation timer status: ${it.name.lowercase().replace('_', ' ')}") }
            case.summary.automationEligibility
                ?.let { add("Automation eligibility: ${it.name.lowercase().replace('_', ' ')}") }
            case.summary.scheduledRemediationStatus
                ?.let { add("Scheduled remediation status: ${it.name.lowercase().replace('_', ' ')}") }
            if (case.summary.automationEligible) {
                add("Automation eligible: yes")
            }
            if (case.summary.automationApprovalRequired) {
                add("Automation approval required: yes")
            }
            if (case.summary.automationCooldownActive) {
                add("Automation cooldown active: yes")
            }
            if (case.summary.automationSuppressed) {
                add("Automation suppressed: yes")
            }
            if (case.summary.automationMaintenanceWindowBlocked) {
                add("Automation maintenance window blocked: yes")
            }
            summary.scheduleWindowStatus
                ?.let { add("Schedule window status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.scheduleDecision
                ?.let { add("Schedule decision: ${it.name.lowercase().replace('_', ' ')}") }
            summary.scheduleBlockReason
                ?.takeIf { it.name != "NONE" }
                ?.let { add("Schedule block reason: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.scheduleWaitingMaintenance) {
                add("Schedule waiting maintenance window: yes")
            }
            summary.scheduleNextEligibleAtMs
                ?.takeIf { it > 0L }
                ?.let { add("Schedule next eligible at: $it") }
            summary.rolloutWaveId
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout wave ID: $it") }
            summary.rolloutWaveStatus
                ?.let { add("Rollout wave status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.rolloutWaveCompletionState
                ?.let { add("Rollout wave completion: ${it.name.lowercase().replace('_', ' ')}") }
            summary.rolloutWaveDecision
                ?.let { add("Rollout wave decision: ${it.name.lowercase().replace('_', ' ')}") }
            summary.rolloutWindowEligibility
                ?.let { add("Rollout window eligibility: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.rolloutCarryForwardPending) {
                add("Rollout carry-forward pending: yes")
            }
            if (summary.rolloutCrossWindowPaused) {
                add("Cross-window rollout paused: yes")
            }
            if (summary.rolloutNextWindowPending) {
                add("Rollout next window pending: yes")
            }
            case.workflowPolicySummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow policy: $it") }
            case.workflowPolicyPackSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow policy pack summary: $it") }
            case.workflowOverrideSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow override summary: $it") }
            case.workflowAutomationControlSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow automation controls: $it") }
            case.workflowPolicyResolutionSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow precedence summary: $it") }
            case.workflowPolicyRolloutState?.let { rolloutState ->
                add(
                    "Workflow rollout state: ${
                        rolloutState.stage.name.lowercase().replace('_', ' ')
                    } · ${
                        rolloutState.mode.name.lowercase().replace('_', ' ')
                    } · ${
                        rolloutState.target.scope.name.lowercase().replace('_', ' ')
                    }"
                )
                add(
                    "Workflow rollout approval: ${
                        rolloutState.approvalState.name.lowercase().replace('_', ' ')
                    } · ${
                        rolloutState.freezeState.name.lowercase().replace('_', ' ')
                    }"
                )
                rolloutState.scheduleSummary
                    .takeIf { it.isNotBlank() }
                    ?.let { add("Workflow rollout schedule: $it") }
                rolloutState.rolloutCalendarSummary
                    .takeIf { it.isNotBlank() }
                    ?.let { add("Workflow rollout calendar: $it") }
                rolloutState.calendarEvaluation?.let { evaluation ->
                    add(
                        "Workflow schedule decision: ${
                            evaluation.decision.name.lowercase().replace('_', ' ')
                        } · ${
                            evaluation.windowStatus.name.lowercase().replace('_', ' ')
                        }"
                    )
                }
            }
            case.workflowRolloutSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout: $it") }
            case.workflowRolloutApprovalSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout approval summary: $it") }
            case.workflowRolloutFreezeSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout freeze summary: $it") }
            case.workflowRolloutRollbackSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout rollback summary: $it") }
            case.rolloutWaveSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Rollout wave summary: $it") }
            case.calendarAwarePromotionSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Promotion window summary: $it") }
            case.crossWindowGovernanceSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Cross-window governance: $it") }
            summary.policyPromotionStatus
                ?.let { add("Policy promotion status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.policyPromotionReadiness
                ?.let { add("Policy promotion readiness: ${it.name.lowercase().replace('_', ' ')}") }
            summary.rolloutPromotionReadinessStatus
                ?.let { add("Rollout promotion readiness: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.rolloutPromotionBlockerCount > 0) {
                add("Rollout promotion blockers: ${summary.rolloutPromotionBlockerCount}")
            }
            summary.rolloutPromotionRecommendation
                ?.let { add("Rollout promotion recommendation: ${it.name.lowercase().replace('_', ' ')}") }
            summary.crossWaveHealthBucket
                ?.let { add("Cross-wave health: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.crossWaveBlockedWaves > 0 || summary.crossWaveDeferredWaves > 0) {
                add(
                    "Cross-wave counts: blocked ${summary.crossWaveBlockedWaves}, deferred ${summary.crossWaveDeferredWaves}"
                )
            }
            summary.windowDelayReason
                ?.takeIf { it != com.lumi.coredomain.contract.WindowDelayReason.NONE }
                ?.let { add("Window delay reason: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.windowDelayCount > 0) {
                add("Window delay count: ${summary.windowDelayCount}")
            }
            summary.nextEligiblePromotionAtMs
                ?.takeIf { it > 0L }
                ?.let { add("Next eligible promotion at: $it") }
            summary.promotionOperationType
                ?.let { add("Promotion operation type: ${it.name.lowercase().replace('_', ' ')}") }
            summary.promotionOperationStatus
                ?.let { add("Promotion operation status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.programPriority
                ?.let { add("Program priority: ${it.name.lowercase().replace('_', ' ')}") }
            summary.programCoordinationState
                ?.let { add("Program coordination state: ${it.name.lowercase().replace('_', ' ')}") }
            summary.programDecisionReason
                ?.takeIf { it != com.lumi.coredomain.contract.RolloutProgramDecisionReason.NONE }
                ?.let { add("Program decision reason: ${it.name.lowercase().replace('_', ' ')}") }
            summary.programContentionType
                ?.takeIf { it != com.lumi.coredomain.contract.RolloutProgramContentionType.NONE }
                ?.let { add("Program contention type: ${it.name.lowercase().replace('_', ' ')}") }
            summary.programContentionLevel
                ?.takeIf { it != com.lumi.coredomain.contract.RolloutProgramContentionLevel.NONE }
                ?.let { add("Program contention level: ${it.name.lowercase().replace('_', ' ')}") }
            summary.programEscalationStatus
                ?.takeIf { it != com.lumi.coredomain.contract.RolloutProgramEscalationStatus.NOT_ESCALATED }
                ?.let { add("Program escalation status: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.programDependencyBlockedCount > 0) {
                add("Program dependency blockers: ${summary.programDependencyBlockedCount}")
            }
            if (summary.programConflictCount > 0) {
                add("Program conflicts: ${summary.programConflictCount}")
            }
            if (summary.programDeferredCount > 0) {
                add("Program deferred count: ${summary.programDeferredCount}")
            }
            summary.capacityPoolKey
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Capacity pool: $it") }
            summary.approvalLoadBucket
                ?.let { add("Approval load bucket: ${it.name.lowercase().replace('_', ' ')}") }
            summary.capacityDeferralReason
                ?.takeIf { it.name != "NONE" }
                ?.let {
                    val readable = when (it) {
                        com.lumi.coredomain.contract.ApprovalDeferralReason.QUEUE_SATURATED,
                        com.lumi.coredomain.contract.ApprovalDeferralReason.CAPACITY_EXHAUSTED -> "capacity saturated"
                        com.lumi.coredomain.contract.ApprovalDeferralReason.CRITICAL_CAPACITY_RESERVED -> "critical capacity reserved"
                        com.lumi.coredomain.contract.ApprovalDeferralReason.MANUAL_REVIEW_BACKLOG -> "manual review backlog"
                        com.lumi.coredomain.contract.ApprovalDeferralReason.POLICY_BLOCKED -> "policy blocked"
                        com.lumi.coredomain.contract.ApprovalDeferralReason.WINDOW_LOCK -> "window locked"
                        com.lumi.coredomain.contract.ApprovalDeferralReason.NONE -> "none"
                    }
                    add("Capacity deferral reason: $readable")
                }
            summary.balancingDecisionType
                ?.takeIf { it.name != "NONE" }
                ?.let { add("Capacity balancing decision: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.capacityBlocked) {
                add("Capacity block: yes")
            }
            if (summary.policyBlocked) {
                add("Policy block: yes")
            }
            if (summary.approvalQueueSaturated) {
                add("Approval queue saturated: yes")
            }
            if (summary.criticalCapacityReserved) {
                add("Critical capacity reserve active: yes")
            }
            if (summary.portfolioBottleneck) {
                add("Portfolio bottleneck: yes")
            }
            case.approvalLoadSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Approval load summary: $it") }
            case.capacityBlockSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Capacity block summary: $it") }
            case.policyBlockSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy block summary: $it") }
            case.capacityBalancingSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Capacity balancing summary: $it") }
            case.portfolioCapacitySummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio capacity summary: $it") }
            case.governanceCapacityPool?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Capacity pool detail: $it") }
            case.approvalQueuePressure?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Approval queue pressure: $it") }
            case.approvalBalancingDecision?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Balancing detail: $it") }
            case.approvalAssignmentRecommendation?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Assignment recommendation: $it") }
            case.capacityAwarePromotionDecision?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Capacity-aware promotion: $it") }
            case.portfolioCapacitySnapshot?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio capacity snapshot: $it") }
            case.programPortfolioSummary?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Program portfolio summary: $it") }
            case.rolloutPromotionReadinessSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Rollout promotion readiness summary: $it") }
            case.crossWaveSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Cross-wave summary: $it") }
            case.windowImpactReadableSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Window impact summary: $it") }
            case.rolloutPromotionOperationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Promotion operation summary: $it") }
            case.programCoordinationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Program coordination summary: $it") }
            case.crossProgramSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Cross-program summary: $it") }
            case.programEscalationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Program escalation summary: $it") }
            summary.portfolioGovernanceHealthStatus
                ?.let { add("Portfolio health status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioRiskBudgetStatus
                ?.let { add("Portfolio risk budget status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioSafetyState
                ?.let { add("Portfolio safety state: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioBudgetGuardrailState
                ?.let { add("Portfolio budget guardrail state: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioEnforcementMode
                ?.let { add("Portfolio enforcement mode: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioRemediationAutomationState
                ?.let { add("Portfolio remediation automation state: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioTrustTierDriftState
                ?.let { add("Portfolio trust-tier drift state: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioJurisdictionDriftState
                ?.let { add("Portfolio jurisdiction drift state: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioRiskRecommendationAction
                ?.let { add("Portfolio risk recommendation action: ${it.name.lowercase().replace('_', ' ')}") }
            summary.portfolioCorrectiveActionType
                ?.let { add("Portfolio corrective action type: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.portfolioRiskBudgetBreached) {
                add("Portfolio risk budget breached: yes")
            }
            if (summary.portfolioQuarantined) {
                add("Portfolio quarantined: yes")
            }
            if (summary.portfolioRemediationApprovalRequired) {
                add("Portfolio remediation approval required: yes")
            }
            summary.portfolioGovernanceAnalyticsSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio analytics: $it") }
            summary.portfolioTrustTierDriftSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio trust-tier drift: $it") }
            summary.portfolioJurisdictionDriftSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio jurisdiction drift: $it") }
            summary.portfolioRiskBudgetSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio risk budget: $it") }
            summary.portfolioSafetySummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio safety: $it") }
            summary.portfolioSafetyRailSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio safety rail: $it") }
            summary.portfolioBudgetGuardrailSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio budget guardrail: $it") }
            summary.portfolioRemediationAutomationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio remediation automation: $it") }
            summary.portfolioDestinationRiskConcentrationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio destination concentration: $it") }
            summary.portfolioBlockerTrendSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio blocker trend: $it") }
            summary.portfolioRiskRecommendationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio risk recommendation: $it") }
            summary.portfolioCorrectiveActionSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Portfolio corrective action: $it") }
            case.rolloutPromotionCandidate
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Promotion candidate: $it") }
            case.rolloutPromotionOperation
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Latest promotion operation: $it") }
            summary.policyGovernanceProgramId
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy governance program ID: $it") }
            summary.policyGovernanceProgramStatus
                ?.let { add("Policy governance program status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.policyGovernanceWaveStatus
                ?.let { add("Policy governance wave status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.workflowPackLifecycleStatus
                ?.let { add("Policy pack lifecycle status: ${it.name.lowercase().replace('_', ' ')}") }
            summary.crossTenantReadinessStatus
                ?.let { add("Cross-tenant readiness: ${it.name.lowercase().replace('_', ' ')}") }
            if (
                summary.crossTenantDriftedTargets > 0 ||
                summary.crossTenantExemptedTargets > 0 ||
                summary.crossTenantPinnedTargets > 0
            ) {
                add(
                    "Cross-tenant counts: drift ${summary.crossTenantDriftedTargets}, exempted ${summary.crossTenantExemptedTargets}, pinned ${summary.crossTenantPinnedTargets}"
                )
            }
            summary.policyEstateDriftSeverity
                ?.let { add("Policy estate drift severity: ${it.name.lowercase().replace('_', ' ')}") }
            if (summary.policyEstateBlockerCount > 0) {
                add("Policy estate blockers: ${summary.policyEstateBlockerCount}")
            }
            if (summary.policyEstateRemediationPending) {
                add("Policy estate remediation pending: yes")
            }
            if (summary.policyApprovalPending) {
                add("Policy approval pending: yes")
            }
            case.policyProgramSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy program summary: $it") }
            case.policyCrossTenantSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Cross-tenant summary: $it") }
            case.policyPackLifecycleSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy pack lifecycle summary: $it") }
            case.policyPackDeprecationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy pack deprecation: $it") }
            case.policyPackRetirementSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy pack retirement: $it") }
            case.policyPackReplacementSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy pack replacement: $it") }
            case.policyEstateSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy estate summary: $it") }
            case.policyEstateDriftSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy estate drift: $it") }
            case.policyEstateBlockerSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy estate blocker summary: $it") }
            case.policyEstateRemediationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy estate remediation summary: $it") }
            case.policyEstateRemediationPlan?.let { plan ->
                add("Policy estate remediation status: ${plan.status.name.lowercase().replace('_', ' ')}")
            }
            case.policyEstateRemediationActions.lastOrNull()?.let { action ->
                add(
                    "Policy estate latest action: ${
                        action.action.name.lowercase().replace('_', ' ')
                    } (${action.status.name.lowercase().replace('_', ' ')})"
                )
            }
            case.estateAutomationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Estate automation: $it") }
            case.scheduledRemediationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Scheduled remediation: $it") }
            case.governanceProgramOperationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Governance operations: $it") }
            case.scheduledRemediationPlan?.let { plan ->
                add("Scheduled remediation plan: ${plan.status.name.lowercase().replace('_', ' ')}")
                plan.approvalRequirement
                    .takeIf { it != com.lumi.coredomain.contract.AutomationApprovalRequirement.NOT_REQUIRED }
                    ?.let {
                        add(
                            "Scheduled remediation approval: ${
                                plan.approvalDecision.name.lowercase().replace('_', ' ')
                            } (${it.name.lowercase().replace('_', ' ')})"
                        )
                    }
            }
            case.estateAutomationEligibility?.let { eligibility ->
                add(
                    "Estate automation eligibility: ${
                        eligibility.status.name.lowercase().replace('_', ' ')
                    }"
                )
            }
            case.workflowPackReplacementPlan?.let { plan ->
                val fromPack = plan.fromPackId.takeIf { it.isNotBlank() } ?: "unknown"
                val toPack = plan.toPackId.takeIf { it.isNotBlank() } ?: "unknown"
                val toVersion = plan.toPackVersionId?.takeIf { it.isNotBlank() }?.let { " ($it)" }.orEmpty()
                add("Replacement plan: $fromPack -> $toPack$toVersion")
            }
            case.policyPromotionSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy promotion summary: $it") }
            case.policyPromotionReadinessSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy readiness summary: $it") }
            case.policyPromotionBlockerSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy blockers: $it") }
            case.policyPromotionRecommendationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Policy recommendation: $it") }
            case.policyRolloutAnalytics
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout analytics: $it") }
            case.policyApprovalReviewSummary
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy approval review: $it") }
            if (case.policyApprovalOperations.isNotEmpty()) {
                val pending = case.policyApprovalOperations.count { it.status.name.equals("PENDING", ignoreCase = true) }
                val approved = case.policyApprovalOperations.count { it.status.name.equals("APPROVED", ignoreCase = true) }
                val rejected = case.policyApprovalOperations.count { it.status.name.equals("REJECTED", ignoreCase = true) }
                add("Policy approval ops: pending $pending, approved $approved, rejected $rejected")
            }
            case.slaSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("SLA: $it") }
            case.stageTimerSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Stage timer: $it") }
            case.escalationTimerSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Escalation timer: $it") }
            case.automationGuardrailSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Automation guardrail: $it") }
            case.automationSuppressionSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Automation suppression: $it") }
            case.nextRequiredHumanAction
                .takeIf { it.isNotBlank() }
                ?.let { add("Required human action: $it") }
            case.latestCollaborationEvent?.let { event ->
                add(
                    "Latest collaboration: ${
                        event.type.name.lowercase().replace('_', ' ')
                    } · ${event.summary.ifBlank { "No summary." }}"
                )
            }
            case.latestAutomationAudit?.let { audit ->
                add(
                    "Latest automation: ${
                        audit.status.name.lowercase().replace('_', ' ')
                    } · ${audit.summary.ifBlank { "No summary." }}"
                )
            }
            case.collaborationState?.let { collaboration ->
                add("Collaboration: ${collaboration.status.name.lowercase().replace('_', ' ')}")
                collaboration.claimedBy?.displayName
                    ?.takeIf { it.isNotBlank() }
                    ?.let { add("Claimed by: $it") }
                collaboration.assignedTo?.displayName
                    ?.takeIf { it.isNotBlank() }
                    ?.let { add("Assigned to: $it") }
                collaboration.followUp?.summary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { add("Follow-up: $it") }
                collaboration.notes.lastOrNull()?.let { note ->
                    add("Latest note: ${note.actor.displayName}: ${note.note}")
                }
                collaboration.routingActions.lastOrNull()?.let { routingAction ->
                    add(
                        "Routing action: ${routingAction.actionType.name.lowercase().replace('_', ' ')} " +
                            "via ${routingAction.targetType.name.lowercase().replace('_', ' ')}"
                    )
                }
            }
            case.assignmentSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Assignment: $it") }
            case.escalationSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Escalation: $it") }
            case.permissionDenialSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Permission: $it") }
            case.remoteOperatorHandoff?.let { handoff ->
                add("Remote handoff: ${handoff.status.name.lowercase().replace('_', ' ')}")
                handoff.request?.target
                    ?.takeIf { it.isNotBlank() }
                    ?.let { add("Handoff target: $it") }
                if (handoff.status == RemoteOperatorHandoffStatus.FAILED) {
                    handoff.lastErrorSummary
                        ?.takeIf { it.isNotBlank() }
                        ?.let { add("Handoff issue: $it") }
                }
            }
            if (case.alertRoutingRecords.isNotEmpty()) {
                val latest = case.alertRoutingRecords.maxByOrNull { it.lastAttemptAtMs }
                val failed = case.alertRoutingRecords.count { it.status == AlertRoutingStatus.FAILED }
                val queued = case.alertRoutingRecords.count {
                    it.status == AlertRoutingStatus.QUEUED ||
                        it.status == AlertRoutingStatus.LOCAL_ONLY
                }
                val deadLetter = case.alertRoutingRecords.sumOf { it.deadLetterRecords.size }
                latest?.let {
                    add("Alert routing: ${it.status.name.lowercase().replace('_', ' ')}")
                }
                add("Alert attempts: queued $queued, failed $failed, dead-letter $deadLetter")
            }
            case.connectorHealthSummary?.let { health ->
                add(
                    "Connector health: ${health.overallStatus} " +
                        "(healthy ${health.healthyTargets}, degraded ${health.degradedTargets}, " +
                        "dead-letter ${health.deadLetterTargets}, unavailable ${health.unavailableTargets})"
                )
            }
            case.deadLetterSummary
                .takeIf { it.isNotBlank() }
                ?.let { add("Dead-letter: $it") }
            case.connectorRoutingSummary?.let { connector ->
                add("Connector routing: ${connector.summary}")
                if (connector.selectedTargetTypes.isNotEmpty()) {
                    add(
                        "Connector targets: ${
                            connector.selectedTargetTypes.joinToString(", ") { type ->
                                type.name.lowercase().replace('_', ' ')
                            }
                        }"
                    )
                }
            }
            case.remotePipelineSummary?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Remote pipeline: $it") }
            case.remoteDeliveryIssues.firstOrNull()?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Remote issue: $it") }
            add("Provider: ${summary.providerLabel ?: "n/a"}")
            add("Settlement: ${summary.settlementStatus.name.lowercase().replace('_', ' ')}")
            add("Dispute: ${summary.disputeStatus.name.lowercase().replace('_', ' ')}")
            add("Sync: ${summary.syncState.name.lowercase().replace('_', ' ')}")
            case.policySnapshotId?.let { add("Policy snapshot: ${summary.policySnapshotVersion ?: "n/a"} · $it") }
            if (summary.reasonFamilies.isNotEmpty()) {
                add("Reason families: ${summary.reasonFamilies.joinToString(", ") { it.name.lowercase() }}")
            }
            case.approvalSummary.takeIf { it.isNotBlank() }?.let { add("Approval: $it") }
            case.dataScopeSummary.takeIf { it.isNotBlank() }?.let { add("Data scope: $it") }
            case.verificationSummary.takeIf { it.isNotBlank() }?.let { add("Verification: $it") }
            case.rollbackSummary.takeIf { it.isNotBlank() }?.let { add("Rollback: $it") }
            case.reconciliationSummary.takeIf { it.isNotBlank() }?.let { add("Reconciliation: $it") }
            case.syncIssueSummaries.firstOrNull()?.let { add("Sync issue: $it") }
            case.timeline.firstOrNull()?.let { timeline ->
                add("Timeline: ${timeline.title} · ${timeline.detail.ifBlank { "No additional detail." }}")
            }
            add("Next action: ${summary.nextActionSummary}")
        }
        return lines
            .asSequence()
            .map { it.toReadableLine(MAX_LINE_CHARS) }
            .distinct()
            .take(maxItems.coerceAtLeast(1))
            .toList()
    }

    fun alertLine(alert: GovernanceAlert): String {
        return "${alert.title} · ${alert.summary} · count ${alert.count}"
            .toReadableLine(MAX_LINE_CHARS)
    }

    fun caseSearchableText(case: GovernanceCaseRecord): String {
        return buildString {
            append(case.summary.runId)
            append(' ')
            append(case.summary.title)
            append(' ')
            append(case.summary.summary)
            append(' ')
            append(case.summary.providerLabel.orEmpty())
            append(' ')
            append(case.summary.reasonFamilies.joinToString(" ") { it.name })
            append(' ')
            append(case.approvalSummary)
            append(' ')
            append(case.verificationSummary)
            append(' ')
            append(case.reconciliationSummary)
            append(' ')
            append(case.syncIssueSummaries.joinToString(" "))
            append(' ')
            append(case.remotePipelineSummary?.summary.orEmpty())
            append(' ')
            append(case.remoteDeliveryIssues.joinToString(" ") { issue -> issue.summary })
            append(' ')
            append(case.collaborationState?.status?.name.orEmpty())
            append(' ')
            append(case.collaborationState?.claimedBy?.displayName.orEmpty())
            append(' ')
            append(case.collaborationState?.assignedTo?.displayName.orEmpty())
            append(' ')
            append(case.workflowSummary)
            append(' ')
            append(case.summary.workflowTemplateName.orEmpty())
            append(' ')
            append(case.summary.workflowPolicyPackId.orEmpty())
            append(' ')
            append(case.summary.workflowPolicyPackVersion.orEmpty())
            append(' ')
            append(case.summary.workflowPolicyPrecedenceSource?.name.orEmpty())
            append(' ')
            append(case.summary.workflowSimulationOnly)
            append(' ')
            append(case.summary.workflowStage?.name.orEmpty())
            append(' ')
            append(case.summary.workflowNextAction.orEmpty())
            append(' ')
            append(case.summary.slaStatus?.name.orEmpty())
            append(' ')
            append(case.summary.stageTimerStatus?.name.orEmpty())
            append(' ')
            append(case.summary.escalationTimerStatus?.name.orEmpty())
            append(' ')
            append(case.summary.automationEligibility?.name.orEmpty())
            append(' ')
            append(case.summary.automationEligible)
            append(' ')
            append(case.summary.scheduledRemediationStatus?.name.orEmpty())
            append(' ')
            append(case.summary.automationApprovalRequired)
            append(' ')
            append(case.summary.automationCooldownActive)
            append(' ')
            append(case.summary.automationSuppressed)
            append(' ')
            append(case.summary.automationMaintenanceWindowBlocked)
            append(' ')
            append(case.summary.scheduleWindowStatus?.name.orEmpty())
            append(' ')
            append(case.summary.scheduleDecision?.name.orEmpty())
            append(' ')
            append(case.summary.scheduleBlockReason?.name.orEmpty())
            append(' ')
            append(case.summary.scheduleWaitingMaintenance)
            append(' ')
            append(case.summary.scheduleNextEligibleAtMs ?: "")
            append(' ')
            append(case.summary.rolloutWaveId.orEmpty())
            append(' ')
            append(case.summary.rolloutWaveStatus?.name.orEmpty())
            append(' ')
            append(case.summary.rolloutWaveCompletionState?.name.orEmpty())
            append(' ')
            append(case.summary.rolloutWaveDecision?.name.orEmpty())
            append(' ')
            append(case.summary.rolloutWindowEligibility?.name.orEmpty())
            append(' ')
            append(case.summary.rolloutCarryForwardPending)
            append(' ')
            append(case.summary.rolloutCrossWindowPaused)
            append(' ')
            append(case.summary.rolloutNextWindowPending)
            append(' ')
            append(case.latestCollaborationEvent?.summary.orEmpty())
            append(' ')
            append(case.latestAutomationAudit?.summary.orEmpty())
            append(' ')
            append(case.workflowPolicySummary)
            append(' ')
            append(case.workflowPolicyPackSummary)
            append(' ')
            append(case.workflowOverrideSummary)
            append(' ')
            append(case.workflowAutomationControlSummary)
            append(' ')
            append(case.workflowPolicyResolutionSummary)
            append(' ')
            append(case.workflowPolicyRolloutState?.stage?.name.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.mode?.name.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.target?.scope?.name.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.approvalState?.name.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.freezeState?.name.orEmpty())
            append(' ')
            append(case.summary.policyPromotionStatus?.name.orEmpty())
            append(' ')
            append(case.summary.policyPromotionReadiness?.name.orEmpty())
            append(' ')
            append(case.summary.rolloutPromotionReadinessStatus?.name.orEmpty())
            append(' ')
            append(case.summary.rolloutPromotionBlockerCount)
            append(' ')
            append(case.summary.rolloutPromotionRecommendation?.name.orEmpty())
            append(' ')
            append(case.summary.crossWaveHealthBucket?.name.orEmpty())
            append(' ')
            append(case.summary.crossWaveBlockedWaves)
            append(' ')
            append(case.summary.crossWaveDeferredWaves)
            append(' ')
            append(case.summary.windowDelayReason?.name.orEmpty())
            append(' ')
            append(case.summary.windowDelayCount)
            append(' ')
            append(case.summary.nextEligiblePromotionAtMs ?: "")
            append(' ')
            append(case.summary.promotionOperationType?.name.orEmpty())
            append(' ')
            append(case.summary.promotionOperationStatus?.name.orEmpty())
            append(' ')
            append(case.summary.policyGovernanceProgramId.orEmpty())
            append(' ')
            append(case.summary.policyGovernanceProgramStatus?.name.orEmpty())
            append(' ')
            append(case.summary.policyGovernanceWaveStatus?.name.orEmpty())
            append(' ')
            append(case.summary.workflowPackLifecycleStatus?.name.orEmpty())
            append(' ')
            append(case.summary.crossTenantReadinessStatus?.name.orEmpty())
            append(' ')
            append(case.summary.crossTenantDriftedTargets)
            append(' ')
            append(case.summary.crossTenantExemptedTargets)
            append(' ')
            append(case.summary.crossTenantPinnedTargets)
            append(' ')
            append(case.summary.policyApprovalPending)
            append(' ')
            append(case.summary.policyEstateDriftSeverity?.name.orEmpty())
            append(' ')
            append(case.summary.policyEstateBlockerCount)
            append(' ')
            append(case.summary.policyEstateRemediationPending)
            append(' ')
            append(case.workflowRolloutSummary)
            append(' ')
            append(case.workflowRolloutApprovalSummary)
            append(' ')
            append(case.workflowRolloutFreezeSummary)
            append(' ')
            append(case.workflowRolloutRollbackSummary)
            append(' ')
            append(case.rolloutWaveSummary)
            append(' ')
            append(case.calendarAwarePromotionSummary)
            append(' ')
            append(case.crossWindowGovernanceSummary)
            append(' ')
            append(case.workflowPolicyRolloutState?.scheduleSummary.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.rolloutCalendarSummary.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.calendarEvaluation?.decision?.name.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.calendarEvaluation?.windowStatus?.name.orEmpty())
            append(' ')
            append(case.workflowPolicyRolloutState?.calendarEvaluation?.blockReason?.name.orEmpty())
            append(' ')
            append(case.policyPromotionSummary)
            append(' ')
            append(case.policyPromotionReadinessSummary)
            append(' ')
            append(case.rolloutPromotionReadinessSummary)
            append(' ')
            append(case.crossWaveSummary)
            append(' ')
            append(case.windowImpactReadableSummary)
            append(' ')
            append(case.rolloutPromotionOperationSummary)
            append(' ')
            append(case.policyPromotionBlockerSummary)
            append(' ')
            append(case.policyPromotionRecommendationSummary)
            append(' ')
            append(case.policyRolloutAnalytics?.summary.orEmpty())
            append(' ')
            append(case.policyApprovalReviewSummary?.summary.orEmpty())
            append(' ')
            append(case.rolloutPromotionCandidate?.summary.orEmpty())
            append(' ')
            append(case.rolloutPromotionOperation?.summary.orEmpty())
            append(' ')
            append(case.summary.capacityPoolKey.orEmpty())
            append(' ')
            append(case.summary.approvalLoadBucket?.name.orEmpty())
            append(' ')
            append(case.summary.capacityDeferralReason?.name.orEmpty())
            append(' ')
            append(case.summary.balancingDecisionType?.name.orEmpty())
            append(' ')
            append(case.summary.capacityBlocked)
            if (case.summary.capacityBlocked) {
                append(" capacity blocked")
            }
            append(' ')
            append(case.summary.policyBlocked)
            if (case.summary.policyBlocked) {
                append(" policy blocked")
            }
            append(' ')
            append(case.summary.approvalQueueSaturated)
            if (case.summary.approvalQueueSaturated) {
                append(" approval queue saturated")
            }
            append(' ')
            append(case.summary.criticalCapacityReserved)
            if (case.summary.criticalCapacityReserved) {
                append(" critical capacity reserved")
            }
            append(' ')
            append(case.summary.portfolioBottleneck)
            if (case.summary.portfolioBottleneck) {
                append(" portfolio bottleneck")
            }
            append(' ')
            append(case.approvalLoadSummary)
            append(' ')
            append(case.capacityBlockSummary)
            append(' ')
            append(case.policyBlockSummary)
            append(' ')
            append(case.capacityBalancingSummary)
            append(' ')
            append(case.portfolioCapacitySummary)
            append(' ')
            append(case.policyProgramSummary)
            append(' ')
            append(case.policyCrossTenantSummary)
            append(' ')
            append(case.policyPackLifecycleSummary)
            append(' ')
            append(case.policyPackDeprecationSummary)
            append(' ')
            append(case.policyPackRetirementSummary)
            append(' ')
            append(case.policyPackReplacementSummary)
            append(' ')
            append(case.policyEstateSummary)
            append(' ')
            append(case.policyEstateDriftSummary)
            append(' ')
            append(case.policyEstateBlockerSummary)
            append(' ')
            append(case.policyEstateRemediationSummary)
            append(' ')
            append(case.policyEstateRemediationPlan?.summary.orEmpty())
            append(' ')
            append(case.policyEstateRemediationPlan?.status?.name.orEmpty())
            append(' ')
            append(case.policyEstateRemediationActions.joinToString(" ") { action ->
                "${action.action.name} ${action.status.name} ${action.summary}"
            })
            append(' ')
            append(case.estateAutomationSummary)
            append(' ')
            append(case.scheduledRemediationSummary)
            append(' ')
            append(case.governanceProgramOperationSummary)
            append(' ')
            append(case.estateAutomationRule?.summary.orEmpty())
            append(' ')
            append(case.estateAutomationEligibility?.status?.name.orEmpty())
            append(' ')
            append(case.scheduledRemediationPlan?.status?.name.orEmpty())
            append(' ')
            append(case.scheduledRemediationPlan?.approvalRequirement?.name.orEmpty())
            append(' ')
            append(case.scheduledRemediationPlan?.approvalDecision?.name.orEmpty())
            append(' ')
            append(case.governanceProgramOperations.joinToString(" ") { op ->
                "${op.action.name} ${op.status.name} ${op.summary}"
            })
            append(' ')
            append(case.automationReplaySummary?.summary.orEmpty())
            append(' ')
            append(case.workflowPackReplacementPlan?.fromPackId.orEmpty())
            append(' ')
            append(case.workflowPackReplacementPlan?.toPackId.orEmpty())
            append(' ')
            append(case.workflowPackReplacementPlan?.toPackVersionId.orEmpty())
            append(' ')
            append(
                case.policyApprovalOperations.joinToString(" ") { operation ->
                    "${operation.operationType.name} ${operation.status.name} ${operation.summary}"
                }
            )
            append(' ')
            append(case.slaSummary)
            append(' ')
            append(case.stageTimerSummary)
            append(' ')
            append(case.escalationTimerSummary)
            append(' ')
            append(case.automationGuardrailSummary)
            append(' ')
            append(case.automationSuppressionSummary)
            append(' ')
            append(case.nextRequiredHumanAction)
            append(' ')
            append(case.collaborationState?.followUp?.summary.orEmpty())
            append(' ')
            append(
                case.collaborationState
                    ?.routingActions
                    ?.joinToString(" ") { action ->
                        "${action.actionType.name} ${action.targetType.name} ${action.summary}"
                    }
                    .orEmpty()
            )
            append(' ')
            append(case.assignmentSummary)
            append(' ')
            append(case.escalationSummary)
            append(' ')
            append(case.permissionDenialSummary)
            append(' ')
            append(case.remoteOperatorHandoff?.status?.name.orEmpty())
            append(' ')
            append(case.remoteOperatorHandoff?.lastErrorSummary.orEmpty())
            append(' ')
            append(case.alertRoutingRecords.joinToString(" ") { routing ->
                "${routing.alertCode} ${routing.status.name} ${routing.lastErrorSummary.orEmpty()}"
            })
            append(' ')
            append(case.connectorRoutingSummary?.summary.orEmpty())
            append(' ')
            append(case.deadLetterSummary)
            append(' ')
            append(case.connectorHealthSummary?.overallStatus.orEmpty())
            append(' ')
            append(case.directorySyncSummary)
            append(' ')
            append(case.sessionAuthProvenanceSummary)
            append(' ')
            append(case.connectorCredentialSummary)
            append(' ')
            append(case.enterpriseIdentitySummary)
            append(' ')
            append(case.enterpriseSessionSummary)
            append(' ')
            append(case.idpProviderSummary)
            append(' ')
            append(case.scimDirectorySummary)
            append(' ')
            append(case.scimProviderSummary)
            append(' ')
            append(case.vaultCredentialSummary)
            append(' ')
            append(case.vaultProviderSummary)
            append(' ')
            append(case.rolloutSummary)
            append(' ')
            append(case.cutoverReadinessSummary)
            append(' ')
            append(case.vaultRuntimeSummary)
            append(' ')
            append(case.enterpriseFallbackSummary)
            append(' ')
            append(case.remoteAuthorizationSummary)
            append(' ')
            append(case.connectorDestinationSummary)
            append(' ')
            append(case.connectorAuthProfileSummary)
            append(' ')
            append(case.operatorConnectorAudit?.summary.orEmpty())
            append(' ')
            append(case.operatorConnectorAudit?.destinationId.orEmpty())
            append(' ')
            append(case.operatorConnectorAudit?.authProfileId.orEmpty())
            append(' ')
            append(case.operatorConnectorAudit?.routeBindingId.orEmpty())
            append(' ')
            append(case.timeline.joinToString(" ") { item ->
                "${item.title} ${item.detail} ${item.type.name}"
            })
            append(' ')
            append(case.lastDirectorySyncSnapshot?.status?.name.orEmpty())
            append(' ')
            append(case.enterpriseAuthIntegration?.summary.orEmpty())
            append(' ')
            append(case.lastSessionAuthContext?.authority?.name.orEmpty())
            append(' ')
            append(case.lastConnectorCredentialLifecycle?.state?.name.orEmpty())
            append(' ')
            append(case.summary.assigneeTeamName.orEmpty())
            append(' ')
            append(case.summary.remoteOperatorId.orEmpty())
            append(' ')
            append(case.summary.connectorDestinationLabel.orEmpty())
            append(' ')
            append(case.summary.programPriority?.name.orEmpty())
            append(' ')
            append(case.summary.programCoordinationState?.name.orEmpty())
            append(' ')
            append(case.summary.programDecisionReason?.name.orEmpty())
            append(' ')
            append(case.summary.programContentionType?.name.orEmpty())
            append(' ')
            append(case.summary.programContentionLevel?.name.orEmpty())
            append(' ')
            append(case.summary.programEscalationStatus?.name.orEmpty())
            append(' ')
            append(case.summary.programDependencyBlockedCount)
            append(' ')
            append(case.summary.programConflictCount)
            append(' ')
            append(case.summary.programDeferredCount)
            append(' ')
            append(case.programCoordinationSummary)
            append(' ')
            append(case.crossProgramSummary)
            append(' ')
            append(case.programEscalationSummary)
            append(' ')
            append(case.programCoordination?.summary.orEmpty())
            append(' ')
            append(case.programCoordination?.priorityDecision?.summary.orEmpty())
            append(' ')
            append(case.programCoordination?.escalation?.summary.orEmpty())
            append(' ')
            append(case.crossProgramGovernanceSummary?.summary.orEmpty())
            append(' ')
            append(
                case.alertRoutingRecords
                    .flatMap { routing ->
                        routing.targets.map { target ->
                            "${target.destinationId.orEmpty()} ${target.authProfileId.orEmpty()} ${target.routeBindingId.orEmpty()}"
                        }
                    }
                    .joinToString(" ")
            )
            append(' ')
            append(
                case.connectorRoutingSummary
                    ?.selectedTargetTypes
                    ?.joinToString(" ") { it.name }
                    .orEmpty()
            )
            append(' ')
            append(case.summary.portfolioGovernanceHealthStatus?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioRiskBudgetStatus?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioSafetyState?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioBudgetGuardrailState?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioEnforcementMode?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioRemediationAutomationState?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioTrustTierDriftState?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioJurisdictionDriftState?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioRiskRecommendationAction?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioCorrectiveActionType?.name.orEmpty())
            append(' ')
            append(case.summary.portfolioRiskBudgetBreached)
            append(' ')
            append(case.summary.portfolioQuarantined)
            append(' ')
            append(case.summary.portfolioRemediationApprovalRequired)
            append(' ')
            append(case.summary.portfolioGovernanceAnalyticsSummary)
            append(' ')
            append(case.summary.portfolioTrustTierDriftSummary)
            append(' ')
            append(case.summary.portfolioJurisdictionDriftSummary)
            append(' ')
            append(case.summary.portfolioRiskBudgetSummary)
            append(' ')
            append(case.summary.portfolioSafetySummary)
            append(' ')
            append(case.summary.portfolioSafetyRailSummary)
            append(' ')
            append(case.summary.portfolioBudgetGuardrailSummary)
            append(' ')
            append(case.summary.portfolioRemediationAutomationSummary)
            append(' ')
            append(case.summary.portfolioDestinationRiskConcentrationSummary)
            append(' ')
            append(case.summary.portfolioBlockerTrendSummary)
            append(' ')
            append(case.summary.portfolioRiskRecommendationSummary)
            append(' ')
            append(case.summary.portfolioCorrectiveActionSummary)
        }.lowercase()
    }

    private fun String.toReadableLine(maxChars: Int): String {
        val compact = trim().replace("\\s+".toRegex(), " ")
        if (compact.length <= maxChars) return compact
        return compact.take((maxChars - 3).coerceAtLeast(1)).trimEnd() + "..."
    }
}

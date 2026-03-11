package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.ExecutionReceipt
import com.lumi.coredomain.contract.ProviderDecisionStatus
import java.util.Locale

object ExecutionReceiptFormatter {
    private const val MAX_TITLE_CHARS = 96
    private const val MAX_HEADLINE_CHARS = 120
    private const val MAX_SUMMARY_CHARS = 140
    private const val MAX_EXPORT_FIELD_CHARS = 72
    private val whitespaceRegex = "\\s+".toRegex()

    fun activityTitle(response: AgentResponse, fallback: String): String {
        val receipt = response.executionReceipt ?: return fallback
        val title = receipt.events.lastOrNull()?.title?.takeIf { it.isNotBlank() } ?: fallback
        return title.toReadableLine(MAX_TITLE_CHARS)
    }

    fun headline(response: AgentResponse): String? {
        val receipt = response.executionReceipt
        val role = receipt?.activeRole ?: response.activeRole ?: return null
        val source = RoleTraceFormatter.readableSource(receipt?.roleSource ?: response.roleSource)
        return "Running as ${role.name.lowercase().replaceFirstChar { it.uppercase() }} role (Source: $source)"
            .toReadableLine(MAX_HEADLINE_CHARS)
    }

    fun summaryLines(response: AgentResponse, maxItems: Int = 3): List<String> {
        val receipt = response.executionReceipt ?: return emptyList()
        val externalPriorityLines = externalSummaryLines(response, receipt)
        val lines = buildList {
            addAll(externalPriorityLines)
            receipt.roleImpactSummary.takeIf { it.isNotBlank() && !it.isNeutralRoleImpactSummary() }?.let(::add)
            val objectiveProfileState = buildList {
                receipt.portfolioObjectiveProfileScope?.let {
                    add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                }
                receipt.portfolioObjectiveProfileProvenance?.let {
                    add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                }
                receipt.portfolioObjectiveProfileSnapshotId
                    ?.takeIf { it.isNotBlank() }
                    ?.let { add("snapshot ${it.takeLast(8)}") }
            }.joinToString(" · ")
            if (objectiveProfileState.isNotBlank() || !receipt.portfolioObjectiveProfileSummary.isNullOrBlank()) {
                add(
                    "Portfolio objective profile: ${if (objectiveProfileState.isBlank()) "n/a" else objectiveProfileState}${receipt.portfolioObjectiveProfileSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                )
            }
            receipt.portfolioLearningSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio learning: $it") }
            receipt.portfolioDriftSummary
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    add(
                        "Portfolio drift: ${receipt.portfolioDriftSeverity?.name?.lowercase(Locale.getDefault()) ?: "none"} · $it"
                    )
                }
            receipt.portfolioTuningSummary
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    val tuningStatus = receipt.portfolioTuningStatus
                        ?.name
                        ?.lowercase(Locale.getDefault())
                        ?.replace('_', ' ')
                    add(
                        "Portfolio tuning: ${tuningStatus ?: "n/a"} · $it"
                    )
                }
            if (
                receipt.portfolioPropagationStatus != null ||
                receipt.portfolioPropagationReviewRequired ||
                !receipt.portfolioPropagationSummary.isNullOrBlank()
            ) {
                val propagationStatus = receipt.portfolioPropagationStatus
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val reviewSuffix = if (receipt.portfolioPropagationReviewRequired) {
                    " · review required"
                } else {
                    ""
                }
                val propagationSummary = receipt.portfolioPropagationSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio propagation: $propagationStatus$reviewSuffix$propagationSummary")
            }
            if (
                receipt.portfolioLearningSyncMode != null ||
                receipt.portfolioLearningSyncStatus != null ||
                receipt.portfolioLearningSyncReviewRequired ||
                !receipt.portfolioLearningSyncSummary.isNullOrBlank()
            ) {
                val syncState = buildList {
                    receipt.portfolioLearningSyncMode?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioLearningSyncStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioLearningSyncConflictResolution?.let {
                        add("conflict ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                }.joinToString(" · ")
                val reviewSuffix = if (receipt.portfolioLearningSyncReviewRequired) {
                    " · review required"
                } else {
                    ""
                }
                val syncSummary = receipt.portfolioLearningSyncSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio sync: ${if (syncState.isBlank()) "n/a" else syncState}$reviewSuffix$syncSummary")
            }
            if (
                receipt.portfolioLearningSyncConsentDecision != null ||
                receipt.portfolioRemoteTransportStatus != null ||
                receipt.portfolioComplianceAuditExportStatus != null ||
                !receipt.portfolioLearningConsentSummary.isNullOrBlank()
            ) {
                val consentState = buildList {
                    receipt.portfolioLearningSyncConsentDecision?.let {
                        add("sync ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    receipt.portfolioRemoteTransportStatus?.let {
                        add("transport ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    receipt.portfolioComplianceAuditExportStatus?.let {
                        add("audit ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                }.joinToString(" · ")
                val consentSummary = receipt.portfolioLearningConsentSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio consent: ${if (consentState.isBlank()) "n/a" else consentState}$consentSummary")
            }
            if (
                receipt.portfolioRemoteTransportStatus != null ||
                receipt.portfolioRemoteTransportConnectorType != null ||
                receipt.portfolioEnterpriseKeyStatus != null ||
                receipt.portfolioComplianceGateDecision != null ||
                receipt.portfolioRemoteTransportLocalFallbackUsed ||
                receipt.portfolioRemoteTransportDeadLettered ||
                !receipt.portfolioRemoteTransportSummary.isNullOrBlank()
            ) {
                val transportState = buildList {
                    receipt.portfolioRemoteTransportStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioRemoteTransportConnectorType?.let {
                        add("connector ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    receipt.portfolioEnterpriseKeyStatus?.let {
                        add("key ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    receipt.portfolioComplianceGateDecision?.let {
                        add("compliance ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    if (receipt.portfolioRemoteTransportLocalFallbackUsed) add("local fallback")
                    if (receipt.portfolioRemoteTransportDeadLettered) add("dead-lettered")
                }.joinToString(" · ").ifBlank { "n/a" }
                val remoteSummary = receipt.portfolioRemoteTransportSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio remote transport: $transportState$remoteSummary")
            }
            receipt.portfolioRemoteTransportConnectorSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio connector: $it") }
            receipt.portfolioEnterpriseKeySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio enterprise key: $it") }
            receipt.portfolioComplianceGateSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio compliance gate: $it") }
            if (
                receipt.portfolioRemoteDestinationStatus != null ||
                receipt.portfolioRemoteDestinationType != null ||
                !receipt.portfolioRemoteDestinationSummary.isNullOrBlank()
            ) {
                val destinationState = buildList {
                    receipt.portfolioRemoteDestinationStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioRemoteDestinationType?.let {
                        add("destination ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val destinationSummary = receipt.portfolioRemoteDestinationSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio destination: $destinationState$destinationSummary")
            }
            if (
                receipt.portfolioResidencyRegion != null ||
                receipt.portfolioJurisdiction != null ||
                !receipt.portfolioResidencySummary.isNullOrBlank()
            ) {
                val residencyState = buildList {
                    receipt.portfolioResidencyRegion?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioJurisdiction?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val residencySummary = receipt.portfolioResidencySummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio residency: $residencyState$residencySummary")
            }
            receipt.portfolioComplianceAuditExportSummary
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    val exportState = receipt.portfolioComplianceAuditExportStatus
                        ?.name
                        ?.lowercase(Locale.getDefault())
                        ?.replace('_', ' ')
                        ?: "n/a"
                    add("Portfolio audit export: $exportState · $it")
                }
            receipt.portfolioComplianceExportRouteSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio export route: $it") }
            if (
                receipt.portfolioDataExchangeBundleType != null ||
                receipt.portfolioDataExchangeDecisionStatus != null ||
                !receipt.portfolioDataExchangeBundleSummary.isNullOrBlank()
            ) {
                val bundleState = buildList {
                    receipt.portfolioDataExchangeBundleType?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioDataExchangeDecisionStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val bundleSummary = receipt.portfolioDataExchangeBundleSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio exchange bundle: $bundleState$bundleSummary")
            }
            receipt.portfolioDataExchangeBoundarySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio exchange boundary: $it") }
            if (
                receipt.portfolioDataExchangeApprovalStatus != null ||
                !receipt.portfolioDataExchangeApprovalSummary.isNullOrBlank()
            ) {
                val approvalState = receipt.portfolioDataExchangeApprovalStatus
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val approvalSummary = receipt.portfolioDataExchangeApprovalSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio exchange approval: $approvalState$approvalSummary")
            }
            if (
                receipt.portfolioCrossBoundaryAuditOperationType != null ||
                receipt.portfolioCrossBoundaryAuditResult != null ||
                !receipt.portfolioCrossBoundaryAuditSummary.isNullOrBlank()
            ) {
                val auditState = buildList {
                    receipt.portfolioCrossBoundaryAuditOperationType?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioCrossBoundaryAuditResult?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val auditSummary = receipt.portfolioCrossBoundaryAuditSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio cross-boundary audit: $auditState$auditSummary")
            }
            receipt.portfolioLearningSyncBoundarySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio sync boundary: $it") }
            receipt.portfolioLearningSyncPrivacySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio sync privacy: $it") }
            receipt.portfolioEnterprisePrivacySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio enterprise privacy: $it") }
            receipt.portfolioFederatedAggregationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio federated aggregation: $it") }
            if (
                receipt.portfolioGovernancePortfolioStatus != null ||
                receipt.portfolioDestinationTrustTier != null ||
                !receipt.portfolioGovernancePortfolioSummary.isNullOrBlank()
            ) {
                val governanceState = buildList {
                    receipt.portfolioGovernancePortfolioStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioDestinationTrustTier?.let {
                        add("trust ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    receipt.portfolioGovernancePriority?.let {
                        add("priority ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val governanceSummary = receipt.portfolioGovernancePortfolioSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio governance: $governanceState$governanceSummary")
            }
            if (
                receipt.portfolioCrossBoundaryProgramStatus != null ||
                receipt.portfolioTrustTierRolloutState != null ||
                !receipt.portfolioTrustTierProgramSummary.isNullOrBlank()
            ) {
                val trustTierState = buildList {
                    receipt.portfolioCrossBoundaryProgramStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioTrustTierRolloutState?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val trustTierSummary = receipt.portfolioTrustTierProgramSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio trust tier: $trustTierState$trustTierSummary")
            }
            if (
                receipt.portfolioJurisdictionRolloutState != null ||
                !receipt.portfolioJurisdictionRolloutSummary.isNullOrBlank()
            ) {
                val jurisdictionState = receipt.portfolioJurisdictionRolloutState
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val jurisdictionSummary = receipt.portfolioJurisdictionRolloutSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio jurisdiction rollout: $jurisdictionState$jurisdictionSummary")
            }
            if (
                receipt.portfolioGovernanceHealthStatus != null ||
                !receipt.portfolioGovernanceAnalyticsSummary.isNullOrBlank()
            ) {
                val analyticsState = buildList {
                    receipt.portfolioGovernanceHealthStatus?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioDataExchangeVisibility?.portfolioTrajectoryState?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val analyticsSummary = receipt.portfolioGovernanceAnalyticsSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio analytics: $analyticsState$analyticsSummary")
            }
            if (
                receipt.portfolioTrustTierDriftState != null ||
                !receipt.portfolioTrustTierDriftSummary.isNullOrBlank()
            ) {
                val trustTierDriftState = receipt.portfolioTrustTierDriftState
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val trustTierDriftSummary = receipt.portfolioTrustTierDriftSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio trust-tier drift: $trustTierDriftState$trustTierDriftSummary")
            }
            if (
                receipt.portfolioJurisdictionDriftState != null ||
                !receipt.portfolioJurisdictionDriftSummary.isNullOrBlank()
            ) {
                val jurisdictionDriftState = receipt.portfolioJurisdictionDriftState
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val jurisdictionDriftSummary = receipt.portfolioJurisdictionDriftSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio jurisdiction drift: $jurisdictionDriftState$jurisdictionDriftSummary")
            }
            if (
                receipt.portfolioRiskBudgetStatus != null ||
                receipt.portfolioRiskBudgetBreached ||
                !receipt.portfolioRiskBudgetSummary.isNullOrBlank()
            ) {
                val riskBudgetState = receipt.portfolioRiskBudgetStatus
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val breachSuffix = if (receipt.portfolioRiskBudgetBreached) " · breached" else ""
                val riskBudgetSummary = receipt.portfolioRiskBudgetSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio risk budget: $riskBudgetState$breachSuffix$riskBudgetSummary")
            }
            if (
                receipt.portfolioSafetyState != null ||
                receipt.portfolioEnforcementMode != null ||
                receipt.portfolioRemediationAutomationState != null ||
                !receipt.portfolioSafetySummary.isNullOrBlank()
            ) {
                val safetyState = buildList {
                    receipt.portfolioSafetyState?.let {
                        add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
                    }
                    receipt.portfolioEnforcementMode?.let {
                        add("enforcement ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                    receipt.portfolioRemediationAutomationState?.let {
                        add("remediation ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    }
                }.joinToString(" · ").ifBlank { "n/a" }
                val safetySummary = receipt.portfolioSafetySummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio safety: $safetyState$safetySummary")
            }
            if (
                receipt.portfolioBudgetGuardrailState != null ||
                receipt.portfolioRemediationApprovalRequired ||
                !receipt.portfolioBudgetGuardrailSummary.isNullOrBlank()
            ) {
                val guardrailState = receipt.portfolioBudgetGuardrailState
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val approvalSuffix = if (receipt.portfolioRemediationApprovalRequired) {
                    " · approval required"
                } else {
                    ""
                }
                val guardrailSummary = receipt.portfolioBudgetGuardrailSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio guardrail: $guardrailState$approvalSuffix$guardrailSummary")
            }
            receipt.portfolioSafetyRailSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio safety rail: $it") }
            if (
                receipt.portfolioRemediationAutomationState != null ||
                receipt.portfolioQuarantined ||
                !receipt.portfolioRemediationAutomationSummary.isNullOrBlank()
            ) {
                val remediationState = receipt.portfolioRemediationAutomationState
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val quarantineSuffix = if (receipt.portfolioQuarantined) " · quarantined" else ""
                val remediationSummary = receipt.portfolioRemediationAutomationSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio remediation: $remediationState$quarantineSuffix$remediationSummary")
            }
            receipt.portfolioDestinationRiskConcentrationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio destination concentration: $it") }
            receipt.portfolioBlockerTrendSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio blocker trend: $it") }
            if (
                receipt.portfolioRiskRecommendationAction != null ||
                !receipt.portfolioRiskRecommendationSummary.isNullOrBlank()
            ) {
                val recommendationAction = receipt.portfolioRiskRecommendationAction
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val recommendationSummary = receipt.portfolioRiskRecommendationSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio risk recommendation: $recommendationAction$recommendationSummary")
            }
            if (
                receipt.portfolioCorrectiveActionType != null ||
                !receipt.portfolioCorrectiveActionSummary.isNullOrBlank()
            ) {
                val correctiveActionState = receipt.portfolioCorrectiveActionType
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val correctiveActionSummary = receipt.portfolioCorrectiveActionSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio corrective action: $correctiveActionState$correctiveActionSummary")
            }
            if (
                receipt.portfolioSharedBlockerCount > 0 ||
                !receipt.portfolioGovernanceBlockerSummary.isNullOrBlank()
            ) {
                val blockerSummary = receipt.portfolioGovernanceBlockerSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio blockers: ${receipt.portfolioSharedBlockerCount}$blockerSummary")
            }
            if (
                receipt.portfolioConflictCount > 0 ||
                !receipt.portfolioGovernanceConflictSummary.isNullOrBlank()
            ) {
                val conflictSummary = receipt.portfolioGovernanceConflictSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio conflicts: ${receipt.portfolioConflictCount}$conflictSummary")
            }
            receipt.portfolioGovernanceDependencySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio dependencies: $it") }
            if (
                receipt.portfolioGovernanceRecommendationAction != null ||
                !receipt.portfolioGovernanceRecommendationSummary.isNullOrBlank()
            ) {
                val recommendationAction = receipt.portfolioGovernanceRecommendationAction
                    ?.name
                    ?.lowercase(Locale.getDefault())
                    ?.replace('_', ' ')
                    ?: "n/a"
                val recommendationSummary = receipt.portfolioGovernanceRecommendationSummary
                    ?.takeIf { it.isNotBlank() }
                    ?.let { " · $it" }
                    ?: ""
                add("Portfolio next action: $recommendationAction$recommendationSummary")
            }
            receipt.constraintPrecedenceSummary
                ?.takeIf {
                    it.isNotBlank() &&
                        !it.startsWith("No explicit task constraints overrode role defaults", ignoreCase = true)
                }
                ?.let(::add)
            receipt.policySnapshotVersion
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy snapshot: $it") }
            buildWorkflowTimerStatusLine(receipt)?.let(::add)
            receipt.workflowPolicySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow policy: $it") }
            receipt.workflowPolicyPackSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow policy pack: $it") }
            receipt.workflowPolicyOverrideSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow override: $it") }
            receipt.workflowAutomationControlSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow automation controls: $it") }
            receipt.workflowPolicyResolutionSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow precedence: $it") }
            if (receipt.workflowSimulationOnly == true) {
                add("Workflow simulation: Automation executed in simulation-only mode.")
            }
            val workflowRolloutStateLine = buildList {
                receipt.workflowRolloutStage?.let {
                    add("stage ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                }
                receipt.workflowRolloutMode?.let {
                    add("mode ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                }
                receipt.workflowRolloutScope?.let {
                    add("scope ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                }
                receipt.workflowRolloutApprovalState?.let {
                    add("approval ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                }
                receipt.workflowRolloutFreezeState?.let {
                    add("freeze ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                }
            }.takeIf { it.isNotEmpty() }?.joinToString(" · ")
            workflowRolloutStateLine?.let { add("Workflow rollout state: $it") }
            receipt.workflowRolloutSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout: $it") }
            receipt.workflowRolloutApprovalSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout approval: $it") }
            receipt.workflowRolloutFreezeSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout freeze: $it") }
            receipt.workflowRolloutRollbackSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow rollout rollback: $it") }
            receipt.policyPromotionStatus
                ?.let { add("Policy promotion status: ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}") }
            receipt.policyPromotionReadiness
                ?.status
                ?.let { add("Policy promotion readiness: ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}") }
            receipt.policyPromotionSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy promotion: $it") }
            receipt.policyPromotionReadinessSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy readiness: $it") }
            receipt.policyPromotionBlockerSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy blockers: $it") }
            receipt.policyPromotionRecommendationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy recommendation: $it") }
            receipt.policyRolloutAnalytics
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout analytics: $it") }
            receipt.policyApprovalReviewSummary
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy approval review: $it") }
            if (receipt.policyApprovalOperations.isNotEmpty()) {
                val pending = receipt.policyApprovalOperations.count { it.status.name.equals("PENDING", ignoreCase = true) }
                val approved = receipt.policyApprovalOperations.count { it.status.name.equals("APPROVED", ignoreCase = true) }
                val rejected = receipt.policyApprovalOperations.count { it.status.name.equals("REJECTED", ignoreCase = true) }
                add("Policy approval ops: pending $pending, approved $approved, rejected $rejected")
            }
            receipt.workflowPolicyGovernanceProgram?.let { program ->
                val waveStatus = program.waves
                    .firstOrNull { wave -> wave.waveId == program.currentWaveId }
                    ?.status
                    ?: program.waves.maxByOrNull { wave -> wave.updatedAtMs }?.status
                val statusLine = buildList {
                    add("status ${program.status.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
                    waveStatus?.let { add("wave ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}") }
                }.joinToString(" · ")
                add("Policy governance program: ${program.name.ifBlank { program.programId }}${if (statusLine.isBlank()) "" else " ($statusLine)"}")
            }
            receipt.workflowProgramSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy program summary: $it") }
            receipt.workflowCrossTenantRolloutSummary?.let { crossTenant ->
                add(
                    "Cross-tenant rollout: readiness ${
                        crossTenant.readinessStatus.name.lowercase(Locale.getDefault()).replace('_', ' ')
                    } · adopted ${crossTenant.adoptedTargets}/${crossTenant.totalTargets} · drift ${crossTenant.driftedTargets} · exempted ${crossTenant.exemptedTargets} · pinned ${crossTenant.pinnedTargets}"
                )
            }
            receipt.workflowCrossTenantSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Cross-tenant summary: $it") }
            receipt.workflowPackLifecycleStatus
                ?.let { add("Policy pack lifecycle: ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}") }
            receipt.workflowPackLifecycleSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy pack lifecycle summary: $it") }
            receipt.workflowPackDeprecationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy pack deprecation: $it") }
            receipt.workflowPackRetirementSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy pack retirement: $it") }
            receipt.workflowPackReplacementSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy pack replacement: $it") }
            buildPolicyEstateStateLine(receipt)?.let { add("Policy estate state: $it") }
            receipt.policyEstateSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy estate: $it") }
            receipt.policyEstateDriftSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy estate drift: $it") }
            receipt.policyEstateBlockerSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy estate blockers: $it") }
            receipt.policyEstateRemediationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy estate remediation: $it") }
            receipt.estateAutomationEligibility?.let { eligibility ->
                add(
                    "Estate automation eligibility: ${
                        eligibility.status.name.lowercase(Locale.getDefault()).replace('_', ' ')
                    }"
                )
                eligibility.summary
                    .takeIf { it.isNotBlank() }
                    ?.let { add("Estate automation summary: $it") }
            }
            receipt.scheduledRemediationPlan?.let { schedule ->
                add(
                    "Scheduled remediation: ${
                        schedule.status.name.lowercase(Locale.getDefault()).replace('_', ' ')
                    }"
                )
                schedule.summary
                    .takeIf { it.isNotBlank() }
                    ?.let { add("Scheduled remediation summary: $it") }
                if (schedule.approvalRequirement != com.lumi.coredomain.contract.AutomationApprovalRequirement.NOT_REQUIRED) {
                    add(
                        "Scheduled remediation approval: ${
                            schedule.approvalDecision.name.lowercase(Locale.getDefault()).replace('_', ' ')
                        }"
                    )
                }
            }
            buildWorkflowScheduleStateLine(receipt)?.let { add("Workflow schedule: $it") }
            receipt.workflowPolicyRolloutState
                ?.scheduleSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Workflow schedule summary: $it") }
            receipt.workflowPolicyRolloutState
                ?.rolloutCalendarSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout calendar: $it") }
            buildRolloutWaveStateLine(receipt)?.let { add("Rollout wave: $it") }
            receipt.rolloutWaveSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout wave summary: $it") }
            receipt.calendarAwarePromotionSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Promotion window summary: $it") }
            receipt.crossWindowGovernanceSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Cross-window governance: $it") }
            receipt.rolloutPromotionReadinessSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout promotion readiness: $it") }
            receipt.crossWaveSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Cross-wave summary: $it") }
            receipt.windowImpactReadableSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Window impact: $it") }
            receipt.rolloutPromotionOperationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Promotion operation: $it") }
            receipt.rolloutPromotionReadiness
                ?.let { readiness ->
                    add(
                        "Promotion readiness status: ${
                            readiness.status.name.lowercase(Locale.getDefault()).replace('_', ' ')
                        }"
                    )
                }
            receipt.crossWaveAnalyticsSummary
                ?.let { analytics ->
                    add(
                        "Cross-wave health: ${
                            analytics.healthBucket.name.lowercase(Locale.getDefault()).replace('_', ' ')
                        }"
                    )
                }
            receipt.windowImpactSummary
                ?.let { impact ->
                    add(
                        "Window impact state: ${
                            impact.delayReason.name.lowercase(Locale.getDefault()).replace('_', ' ')
                        }"
                    )
                }
            receipt.rolloutPromotionOperation
                ?.let { operation ->
                    add(
                        "Promotion operation state: ${
                            operation.type.name.lowercase(Locale.getDefault()).replace('_', ' ')
                        } / ${operation.status.name.lowercase(Locale.getDefault()).replace('_', ' ')}"
                    )
                }
            receipt.programCoordinationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Program coordination: $it") }
            receipt.crossProgramSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Cross-program summary: $it") }
            receipt.programEscalationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Program escalation: $it") }
            receipt.approvalLoadSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Approval load: $it") }
            receipt.capacityBlockSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Capacity block: $it") }
            receipt.policyBlockSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Policy block: $it") }
            receipt.capacityBalancingSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Capacity balancing: $it") }
            receipt.portfolioCapacitySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Portfolio capacity: $it") }
            receipt.approvalQueuePressure?.let { pressure ->
                add(
                    "Approval queue: ${
                        pressure.loadBucket.name.lowercase(Locale.getDefault()).replace('_', ' ')
                    }"
                )
            }
            receipt.capacityAwarePromotionDecision?.let { decision ->
                val state = when {
                    decision.capacityBlocked -> "capacity blocked"
                    decision.policyBlocked -> "policy blocked"
                    else -> "eligible"
                }
                add("Capacity-aware promotion: $state")
            }
            receipt.programCoordination?.let { coordination ->
                add(
                    "Program coordination state: ${
                        coordination.coordinationState.name.lowercase(Locale.getDefault()).replace('_', ' ')
                    } · priority ${
                        coordination.priority.name.lowercase(Locale.getDefault()).replace('_', ' ')
                    }"
                )
                coordination.contention?.let { contention ->
                    if (contention.type != com.lumi.coredomain.contract.RolloutProgramContentionType.NONE) {
                        add(
                            "Program contention: ${
                                contention.type.name.lowercase(Locale.getDefault()).replace('_', ' ')
                            } / ${contention.level.name.lowercase(Locale.getDefault()).replace('_', ' ')}"
                        )
                    }
                }
                coordination.escalation?.let { escalation ->
                    if (escalation.status != com.lumi.coredomain.contract.RolloutProgramEscalationStatus.NOT_ESCALATED) {
                        add(
                            "Program escalation status: ${
                                escalation.status.name.lowercase(Locale.getDefault()).replace('_', ' ')
                            }"
                        )
                    }
                }
            }
            if (receipt.rolloutCarryForwardPending) {
                add("Rollout carry-forward: pending")
            }
            if (receipt.rolloutNextWindowPending) {
                add("Rollout next window: pending")
            }
            if (receipt.rolloutCrossWindowPaused) {
                add("Cross-window rollout pause: active")
            }
            receipt.automationReplaySummary
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Automation replay: $it") }
            receipt.slaSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("SLA: $it") }
            receipt.stageTimerSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Stage timer: $it") }
            receipt.escalationTimerSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Escalation timer: $it") }
            receipt.automationGuardrailSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Automation guardrail: $it") }
            receipt.automationSuppressionSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Automation suppression: $it") }
            receipt.nextRequiredHumanAction
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Required human action: $it") }
            receipt.approvalSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No approval gate") }?.let(::add)
            receipt.dataScopeSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No additional data-scope restrictions") }?.let(::add)
            receipt.providerSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No external provider decision") }?.let(::add)
            receipt.quoteSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No external quote comparison") }?.let(::add)
            receipt.verificationSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No additional verification step") }?.let(::add)
            receipt.proofSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No proof artifacts") }?.let(::add)
            receipt.externalSettlementSummary?.summary
                ?.takeIf { it.isNotBlank() && !it.equals("Settlement state was recorded for this external run.", ignoreCase = true) }
                ?.let(::add)
            receipt.reconciliationSummary?.summary
                ?.takeIf { it.isNotBlank() && !it.equals("No reconciliation step was required.", ignoreCase = true) }
                ?.let(::add)
            receipt.remoteAuthorizationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Remote auth: $it") }
            receipt.connectorDestinationSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Connector destination: $it") }
            receipt.connectorAuthProfileSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Connector auth profile: $it") }
            receipt.identityProvenanceSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Identity provenance: $it") }
            receipt.directorySyncSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Directory sync: $it") }
            receipt.sessionAuthProvenanceSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Auth provenance: $it") }
            receipt.connectorCredentialSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Credential health: $it") }
            receipt.enterpriseIdentitySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Enterprise identity: $it") }
            receipt.enterpriseSessionSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Enterprise session: $it") }
            receipt.idpProviderSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("IdP provider: $it") }
            receipt.scimDirectorySummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("SCIM sync: $it") }
            receipt.scimProviderSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("SCIM provider: $it") }
            receipt.vaultCredentialSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Vault credential: $it") }
            receipt.vaultProviderSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Vault provider: $it") }
            receipt.rolloutSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Rollout control: $it") }
            receipt.cutoverReadinessSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Cutover readiness: $it") }
            receipt.vaultRuntimeSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Vault runtime: $it") }
            receipt.enterpriseFallbackSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Fallback: $it") }
            receipt.enterpriseAuthIntegration
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Enterprise integration: $it") }
            receipt.operatorConnectorAudit
                ?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { add("Connector audit: $it") }
            receipt.rollbackSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No rollback action") }?.let(::add)
            receipt.externalDisputeSummary?.summary?.takeIf { it.isNotBlank() && !it.equals("No active dispute.", ignoreCase = true) }?.let(::add)
            receipt.syncIssues.firstOrNull()?.summary?.takeIf { it.isNotBlank() }?.let { add("Sync issue: $it") }
            receipt.issueSummary?.takeIf { it.isNotBlank() }?.let { add("Issue: $it") }
        }
        val normalized = lines
            .asSequence()
            .map { it.toReadableLine(MAX_SUMMARY_CHARS) }
            .filter { it.isNotBlank() }
            .distinct()
            .toList()
        if (normalized.isNotEmpty()) {
            return normalized.take(maxItems.coerceAtLeast(1))
        }
        val fallback = receipt.roleImpactSummary
            .takeIf { it.isNotBlank() && !it.isNeutralRoleImpactSummary() }
            ?: "Execution completed with no additional policy constraints."
        return listOf(fallback.toReadableLine(MAX_SUMMARY_CHARS))
            .take(maxItems.coerceAtLeast(1))
    }

    fun externalSummaryHeadline(response: AgentResponse, maxItems: Int = 4): String? {
        val pills = externalStatusPills(response, maxItems = maxItems)
        if (pills.isEmpty()) return null
        return pills.joinToString(" · ") { it.label }
            .toReadableLine(MAX_HEADLINE_CHARS)
    }

    fun externalStatusPills(response: AgentResponse, maxItems: Int = 5): List<ExternalVisibilityPill> {
        val receipt = response.executionReceipt ?: return emptyList()
        if (!isExternalReceipt(receipt)) return emptyList()
        val pills = mutableListOf<ExternalVisibilityPill>()
        val selectedProvider = receipt.providerSelectionSummary?.selectedProviderName
        val deniedProviders = receipt.providerPolicyDecisions.count { it.decision == ProviderDecisionStatus.DENIED }
        when {
            !selectedProvider.isNullOrBlank() ->
                pills += ExternalVisibilityPill("Provider selected", ExternalVisibilityTone.POSITIVE)
            deniedProviders > 0 ->
                pills += ExternalVisibilityPill("Provider denied", ExternalVisibilityTone.NEGATIVE)
            receipt.quoteSummary.isInformativeSummary(defaultPrefix = "No external quote comparison") ->
                pills += ExternalVisibilityPill("Provider pending", ExternalVisibilityTone.WARNING)
        }

        val approvalStatus = receipt.externalApprovalSummary?.status?.lowercase(Locale.getDefault()).orEmpty()
        when (approvalStatus) {
            "denied" -> pills += ExternalVisibilityPill("Approval denied", ExternalVisibilityTone.NEGATIVE)
            "required" -> pills += ExternalVisibilityPill("Approval required", ExternalVisibilityTone.WARNING)
            "granted" -> pills += ExternalVisibilityPill("Approval granted", ExternalVisibilityTone.POSITIVE)
            "not_required" -> if (isExternalReceipt(receipt)) {
                pills += ExternalVisibilityPill("Approval not required", ExternalVisibilityTone.INFO)
            }
        }

        when {
            receipt.externalDataScopeSummary?.blocked == true ->
                pills += ExternalVisibilityPill("Data scope blocked", ExternalVisibilityTone.NEGATIVE)
            receipt.externalDataScopeSummary?.reduced == true ->
                pills += ExternalVisibilityPill("Data scope reduced", ExternalVisibilityTone.WARNING)
        }

        val verificationStatus = receipt.externalVerificationSummary?.status?.lowercase(Locale.getDefault()).orEmpty()
        when (verificationStatus) {
            "failed" -> pills += ExternalVisibilityPill("Verification failed", ExternalVisibilityTone.NEGATIVE)
            "partial" -> pills += ExternalVisibilityPill("Verification partial", ExternalVisibilityTone.WARNING)
            "pending" -> pills += ExternalVisibilityPill("Verification pending", ExternalVisibilityTone.WARNING)
            "passed" -> pills += ExternalVisibilityPill("Verification passed", ExternalVisibilityTone.POSITIVE)
        }

        when {
            receipt.externalDisputeSummary?.opened == true ->
                pills += ExternalVisibilityPill("Dispute opened", ExternalVisibilityTone.NEGATIVE)
            receipt.externalRollbackSummary?.summary?.contains("failed", ignoreCase = true) == true ->
                pills += ExternalVisibilityPill("Rollback failed", ExternalVisibilityTone.NEGATIVE)
            receipt.externalRollbackSummary?.triggered == true ->
                pills += ExternalVisibilityPill("Rolled back", ExternalVisibilityTone.WARNING)
            receipt.externalRollbackSummary?.available == true ->
                pills += ExternalVisibilityPill("Rollback available", ExternalVisibilityTone.INFO)
        }

        when {
            receipt.externalSettlementSummary?.syncState?.name?.equals("SYNC_PENDING", ignoreCase = true) == true ->
                pills += ExternalVisibilityPill("Settlement sync pending", ExternalVisibilityTone.WARNING)
            receipt.reconciliationSummary?.mismatchDetected == true ->
                pills += ExternalVisibilityPill("Reconciliation mismatch", ExternalVisibilityTone.NEGATIVE)
            receipt.reconciliationSummary?.result?.name?.equals("RESOLVED", ignoreCase = true) == true ->
                pills += ExternalVisibilityPill("Reconciled", ExternalVisibilityTone.POSITIVE)
        }

        if (hasSyncPendingSignal(response, receipt)) {
            pills += ExternalVisibilityPill("Sync pending", ExternalVisibilityTone.WARNING)
        }
        return pills
            .distinctBy { it.label }
            .take(maxItems.coerceAtLeast(1))
    }

    fun qualitySignals(response: AgentResponse): ReceiptQualitySignals {
        val title = activityTitle(response, response.summary.orEmpty().ifBlank { "No summary" })
        val headline = headline(response)
        val lines = summaryLines(response, maxItems = 4)
        return ReceiptQualitySignals(
            hasTitle = title.isNotBlank(),
            hasHeadline = !headline.isNullOrBlank(),
            summaryLineCount = lines.size,
            hasApprovalSummary = lines.any { it.contains("approval", ignoreCase = true) },
            hasDataScopeSummary = lines.any {
                it.contains("data scope", ignoreCase = true) || it.contains("cloud sync blocked", ignoreCase = true)
            },
            hasProviderSummary = lines.any { it.contains("provider", ignoreCase = true) },
            hasVerificationSummary = lines.any { it.contains("verification", ignoreCase = true) },
            hasRollbackSummary = lines.any { it.contains("rollback", ignoreCase = true) || it.contains("issue:", ignoreCase = true) }
        )
    }

    fun exportSnippet(response: AgentResponse): String {
        val receipt = response.executionReceipt ?: return "receipt=unavailable"
        val role = receipt.activeRole?.name?.lowercase(Locale.getDefault()) ?: "unknown"
        val source = RoleTraceFormatter.readableSource(receipt.roleSource).toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val approval = receipt.approvalSummary.ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val quote = receipt.quoteSummary.ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val provider = receipt.providerSummary.ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val verification = receipt.verificationSummary.ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val settlement = receipt.externalSettlementSummary?.summary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val reconciliation = receipt.reconciliationSummary?.summary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val rollback = receipt.rollbackSummary.ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val dispute = receipt.externalDisputeSummary?.summary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val directorySync = receipt.directorySyncSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val authProvenance = receipt.sessionAuthProvenanceSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val credential = receipt.connectorCredentialSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val enterpriseIdentity = receipt.enterpriseIdentitySummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val enterpriseSession = receipt.enterpriseSessionSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val idpProvider = receipt.idpProviderSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val scimSync = receipt.scimDirectorySummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val scimProvider = receipt.scimProviderSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val vaultCredential = receipt.vaultCredentialSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val vaultProvider = receipt.vaultProviderSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val rollout = receipt.rolloutSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val cutover = receipt.cutoverReadinessSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val vaultRuntime = receipt.vaultRuntimeSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val fallback = receipt.enterpriseFallbackSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowPolicy = receipt.workflowPolicySummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val portfolioLearning = receipt.portfolioLearningSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val portfolioObjectiveProfile = buildList {
            receipt.portfolioObjectiveProfileScope?.let {
                add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
            }
            receipt.portfolioObjectiveProfileProvenance?.let {
                add(it.name.lowercase(Locale.getDefault()).replace('_', ' '))
            }
            receipt.portfolioObjectiveProfileSnapshotId
                ?.takeIf { it.isNotBlank() }
                ?.let { add("snapshot:${it.takeLast(8)}") }
            receipt.portfolioObjectiveProfileSummary
                ?.takeIf { it.isNotBlank() }
                ?.let { add(it) }
        }.joinToString(" · ").ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val portfolioObjectiveProfileScope = receipt.portfolioObjectiveProfileScope
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioObjectiveProfileProvenance = receipt.portfolioObjectiveProfileProvenance
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDrift = receipt.portfolioDriftSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val portfolioDriftSeverity = receipt.portfolioDriftSeverity
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioTuning = receipt.portfolioTuningSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val portfolioTuningStatus = receipt.portfolioTuningStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioPropagation = receipt.portfolioPropagationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioPropagationStatus = receipt.portfolioPropagationStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioPropagationReviewRequired = receipt.portfolioPropagationReviewRequired.toString()
        val portfolioSync = receipt.portfolioLearningSyncSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSyncMode = receipt.portfolioLearningSyncMode
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSyncStatus = receipt.portfolioLearningSyncStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSyncConflict = receipt.portfolioLearningSyncConflictResolution
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSyncReviewRequired = receipt.portfolioLearningSyncReviewRequired.toString()
        val portfolioSyncBoundary = receipt.portfolioLearningSyncBoundarySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSyncPrivacy = receipt.portfolioLearningSyncPrivacySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioConsent = receipt.portfolioLearningConsentSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioConsentDecision = receipt.portfolioLearningSyncConsentDecision
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteTransport = receipt.portfolioRemoteTransportSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteTransportStatus = receipt.portfolioRemoteTransportStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteTransportConnector = receipt.portfolioRemoteTransportConnectorType
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioEnterpriseKey = receipt.portfolioEnterpriseKeyStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioComplianceGate = receipt.portfolioComplianceGateDecision
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteTransportConnectorSummary = receipt.portfolioRemoteTransportConnectorSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioEnterpriseKeySummary = receipt.portfolioEnterpriseKeySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioComplianceGateSummary = receipt.portfolioComplianceGateSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteTransportLocalFallback = receipt.portfolioRemoteTransportLocalFallbackUsed.toString()
        val portfolioRemoteTransportDeadLettered = receipt.portfolioRemoteTransportDeadLettered.toString()
        val portfolioRemoteDestination = receipt.portfolioRemoteDestinationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteDestinationStatus = receipt.portfolioRemoteDestinationStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemoteDestinationType = receipt.portfolioRemoteDestinationType
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioResidency = receipt.portfolioResidencySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioResidencyRegion = receipt.portfolioResidencyRegion
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioJurisdiction = receipt.portfolioJurisdiction
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioComplianceAuditExport = receipt.portfolioComplianceAuditExportSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioComplianceAuditExportStatus = receipt.portfolioComplianceAuditExportStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioComplianceExportRoute = receipt.portfolioComplianceExportRouteSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDataExchangeBundle = receipt.portfolioDataExchangeBundleSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDataExchangeBundleType = receipt.portfolioDataExchangeBundleType
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDataExchangeDecisionStatus = receipt.portfolioDataExchangeDecisionStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDataExchangeBoundary = receipt.portfolioDataExchangeBoundarySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDataExchangeApproval = receipt.portfolioDataExchangeApprovalSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDataExchangeApprovalStatus = receipt.portfolioDataExchangeApprovalStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCrossBoundaryAudit = receipt.portfolioCrossBoundaryAuditSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCrossBoundaryAuditOperation = receipt.portfolioCrossBoundaryAuditOperationType
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCrossBoundaryAuditResult = receipt.portfolioCrossBoundaryAuditResult
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioEnterprisePrivacy = receipt.portfolioEnterprisePrivacySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioFederatedAggregation = receipt.portfolioFederatedAggregationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernance = receipt.portfolioGovernancePortfolioSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceStatus = receipt.portfolioGovernancePortfolioStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDestinationTrustTier = receipt.portfolioDestinationTrustTier
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCrossBoundaryProgramStatus = receipt.portfolioCrossBoundaryProgramStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioTrustTierRollout = receipt.portfolioTrustTierProgramSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioTrustTierRolloutState = receipt.portfolioTrustTierRolloutState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioJurisdictionRollout = receipt.portfolioJurisdictionRolloutSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioJurisdictionRolloutState = receipt.portfolioJurisdictionRolloutState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceBlockers = receipt.portfolioGovernanceBlockerSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceDependencies = receipt.portfolioGovernanceDependencySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceConflicts = receipt.portfolioGovernanceConflictSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceRecommendation = receipt.portfolioGovernanceRecommendationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernancePriority = receipt.portfolioGovernancePriority
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceRecommendationAction = receipt.portfolioGovernanceRecommendationAction
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceAnalytics = receipt.portfolioGovernanceAnalyticsSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioGovernanceHealthStatus = receipt.portfolioGovernanceHealthStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRiskBudget = receipt.portfolioRiskBudgetSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRiskBudgetStatus = receipt.portfolioRiskBudgetStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRiskBudgetBreached = receipt.portfolioRiskBudgetBreached.toString()
        val portfolioSafety = receipt.portfolioSafetySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSafetyState = receipt.portfolioSafetyState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioBudgetGuardrail = receipt.portfolioBudgetGuardrailSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioBudgetGuardrailState = receipt.portfolioBudgetGuardrailState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioEnforcementMode = receipt.portfolioEnforcementMode
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemediationAutomation = receipt.portfolioRemediationAutomationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRemediationAutomationState = receipt.portfolioRemediationAutomationState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSafetyRail = receipt.portfolioSafetyRailSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioQuarantined = receipt.portfolioQuarantined.toString()
        val portfolioRemediationApprovalRequired = receipt.portfolioRemediationApprovalRequired.toString()
        val portfolioTrustTierDrift = receipt.portfolioTrustTierDriftSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioTrustTierDriftState = receipt.portfolioTrustTierDriftState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioJurisdictionDrift = receipt.portfolioJurisdictionDriftSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioJurisdictionDriftState = receipt.portfolioJurisdictionDriftState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioDestinationRiskConcentration = receipt.portfolioDestinationRiskConcentrationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioBlockerTrend = receipt.portfolioBlockerTrendSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRiskRecommendation = receipt.portfolioRiskRecommendationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioRiskRecommendationAction = receipt.portfolioRiskRecommendationAction
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCorrectiveAction = receipt.portfolioCorrectiveActionSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCorrectiveActionType = receipt.portfolioCorrectiveActionType
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioSharedBlockers = receipt.portfolioSharedBlockerCount.toString()
        val portfolioConflicts = receipt.portfolioConflictCount.toString()
        val workflowPackId = receipt.workflowPolicyPackId?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowPackVersion = receipt.workflowPolicyPackVersion?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowPrecedence = receipt.workflowPolicyPrecedenceSource
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val workflowSimulation = when (receipt.workflowSimulationOnly) {
            true -> "simulation_only"
            false -> "live"
            null -> "n/a"
        }
        val workflowOverride = receipt.workflowPolicyOverrideSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowControl = receipt.workflowAutomationControlSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowRolloutState = buildList {
            receipt.workflowRolloutStage?.let { add("stage:${it.name.lowercase(Locale.getDefault())}") }
            receipt.workflowRolloutMode?.let { add("mode:${it.name.lowercase(Locale.getDefault())}") }
            receipt.workflowRolloutScope?.let { add("scope:${it.name.lowercase(Locale.getDefault())}") }
            receipt.workflowRolloutApprovalState?.let { add("approval:${it.name.lowercase(Locale.getDefault())}") }
            receipt.workflowRolloutFreezeState?.let { add("freeze:${it.name.lowercase(Locale.getDefault())}") }
        }.joinToString("|").ifBlank { "n/a" }.toReadableLine(MAX_EXPORT_FIELD_CHARS)
        val workflowRollout = receipt.workflowRolloutSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowRolloutApproval = receipt.workflowRolloutApprovalSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowRolloutFreeze = receipt.workflowRolloutFreezeSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val workflowRolloutRollback = receipt.workflowRolloutRollbackSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyPromotionStatus = receipt.policyPromotionStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val policyPromotionReadiness = receipt.policyPromotionReadiness
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val policyPromotion = receipt.policyPromotionSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyReadiness = receipt.policyPromotionReadinessSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyBlockers = receipt.policyPromotionBlockerSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyRecommendation = receipt.policyPromotionRecommendationSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyAnalytics = receipt.policyRolloutAnalytics?.summary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyApprovalReview = receipt.policyApprovalReviewSummary?.summary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyProgram = receipt.workflowProgramSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyProgramStatus = receipt.workflowPolicyGovernanceProgram
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val policyCrossTenant = receipt.workflowCrossTenantSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyPackLifecycle = receipt.workflowPackLifecycleSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyPackLifecycleStatus = receipt.workflowPackLifecycleStatus
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val policyPackDeprecation = receipt.workflowPackDeprecationSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyPackRetirement = receipt.workflowPackRetirementSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyPackReplacement = receipt.workflowPackReplacementSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyEstateState = buildPolicyEstateStateLine(receipt)?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyEstate = receipt.policyEstateSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyEstateDrift = receipt.policyEstateDriftSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyEstateBlockers = receipt.policyEstateBlockerSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val policyEstateRemediation = receipt.policyEstateRemediationSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val estateAutomation = receipt.estateAutomationEligibility
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val scheduledRemediation = receipt.scheduledRemediationPlan
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val workflowScheduleState = buildWorkflowScheduleStateLine(receipt)
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val workflowScheduleSummary = receipt.workflowPolicyRolloutState
            ?.scheduleSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val workflowRolloutCalendar = receipt.workflowPolicyRolloutState
            ?.rolloutCalendarSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val rolloutWaveState = buildRolloutWaveStateLine(receipt)
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val rolloutWaveSummary = receipt.rolloutWaveSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val promotionWindowSummary = receipt.calendarAwarePromotionSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val crossWindowGovernance = receipt.crossWindowGovernanceSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val rolloutPromotionReadinessSummary = receipt.rolloutPromotionReadinessSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val crossWaveSummary = receipt.crossWaveSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val windowImpactSummary = receipt.windowImpactReadableSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val promotionOperationSummary = receipt.rolloutPromotionOperationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val rolloutPromotionReadinessStatus = receipt.rolloutPromotionReadiness
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val crossWaveHealth = receipt.crossWaveAnalyticsSummary
            ?.healthBucket
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val windowDelayReason = receipt.windowImpactSummary
            ?.delayReason
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val promotionOperationState = receipt.rolloutPromotionOperation
            ?.let { operation ->
                "${operation.type.name.lowercase(Locale.getDefault())}:${operation.status.name.lowercase(Locale.getDefault())}"
            }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val rolloutCarryForward = if (receipt.rolloutCarryForwardPending) "pending" else "none"
        val rolloutNextWindowPending = if (receipt.rolloutNextWindowPending) "pending" else "none"
        val rolloutCrossWindowPaused = if (receipt.rolloutCrossWindowPaused) "paused" else "active"
        val programCoordinationState = receipt.programCoordination
            ?.coordinationState
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val programPriority = receipt.programCoordination
            ?.priority
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val programDecisionReason = receipt.programCoordination
            ?.decisionReason
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val programContention = receipt.programCoordination
            ?.contention
            ?.let { contention ->
                "${contention.type.name.lowercase(Locale.getDefault())}:${contention.level.name.lowercase(Locale.getDefault())}"
            }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val programCoordinationSummary = receipt.programCoordinationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val crossProgramSummary = receipt.crossProgramSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val programEscalationState = receipt.programCoordination
            ?.escalation
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val programEscalationSummary = receipt.programEscalationSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val approvalLoadSummary = receipt.approvalLoadSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val capacityBlockSummary = receipt.capacityBlockSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val policyBlockSummary = receipt.policyBlockSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val capacityBalancingSummary = receipt.capacityBalancingSummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioCapacitySummary = receipt.portfolioCapacitySummary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val approvalLoadBucket = receipt.approvalQueuePressure
            ?.loadBucket
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val capacityDecisionState = receipt.capacityAwarePromotionDecision
            ?.let { decision ->
                when {
                    decision.capacityBlocked -> "capacity_blocked"
                    decision.policyBlocked -> "policy_blocked"
                    else -> "eligible"
                }
            }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val capacityPool = (receipt.governanceCapacityPool?.poolKey ?: receipt.approvalQueuePressure?.poolKey)
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val portfolioBottleneck = when {
            receipt.programPortfolioSummary?.bottleneckPoolKeys?.isNotEmpty() == true -> "true"
            (receipt.portfolioCapacitySnapshot?.saturatedPools ?: 0) > 0 -> "true"
            receipt.programPortfolioSummary != null || receipt.portfolioCapacitySnapshot != null -> "false"
            else -> "n/a"
        }
        val automationReplay = receipt.automationReplaySummary
            ?.summary
            ?.ifBlank { "n/a" }
            ?.toReadableLine(MAX_EXPORT_FIELD_CHARS)
            ?: "n/a"
        val sla = receipt.slaSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val stageTimer = receipt.stageTimerSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val escalation = receipt.escalationTimerSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val automation = receipt.automationGuardrailSummary?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        val requiredHumanAction = receipt.nextRequiredHumanAction?.ifBlank { "n/a" }?.toReadableLine(MAX_EXPORT_FIELD_CHARS) ?: "n/a"
        return "receipt_role=$role source=$source approval=$approval quote=$quote provider=$provider verification=$verification settlement=$settlement reconciliation=$reconciliation rollback=$rollback dispute=$dispute portfolio_objective_profile=$portfolioObjectiveProfile portfolio_objective_profile_scope=$portfolioObjectiveProfileScope portfolio_objective_profile_provenance=$portfolioObjectiveProfileProvenance portfolio_learning=$portfolioLearning portfolio_drift=$portfolioDrift portfolio_drift_severity=$portfolioDriftSeverity portfolio_tuning=$portfolioTuning portfolio_tuning_status=$portfolioTuningStatus portfolio_propagation=$portfolioPropagation portfolio_propagation_status=$portfolioPropagationStatus portfolio_propagation_review_required=$portfolioPropagationReviewRequired portfolio_sync=$portfolioSync portfolio_sync_mode=$portfolioSyncMode portfolio_sync_status=$portfolioSyncStatus portfolio_sync_conflict=$portfolioSyncConflict portfolio_sync_review_required=$portfolioSyncReviewRequired portfolio_sync_boundary=$portfolioSyncBoundary portfolio_sync_privacy=$portfolioSyncPrivacy portfolio_consent=$portfolioConsent portfolio_consent_decision=$portfolioConsentDecision portfolio_remote_transport=$portfolioRemoteTransport portfolio_remote_transport_status=$portfolioRemoteTransportStatus portfolio_remote_destination=$portfolioRemoteDestination portfolio_remote_destination_status=$portfolioRemoteDestinationStatus portfolio_remote_destination_type=$portfolioRemoteDestinationType portfolio_residency=$portfolioResidency portfolio_residency_region=$portfolioResidencyRegion portfolio_jurisdiction=$portfolioJurisdiction portfolio_remote_transport_connector=$portfolioRemoteTransportConnector portfolio_remote_transport_connector_summary=$portfolioRemoteTransportConnectorSummary portfolio_enterprise_key=$portfolioEnterpriseKey portfolio_enterprise_key_summary=$portfolioEnterpriseKeySummary portfolio_compliance_gate=$portfolioComplianceGate portfolio_compliance_gate_summary=$portfolioComplianceGateSummary portfolio_remote_transport_local_fallback=$portfolioRemoteTransportLocalFallback portfolio_remote_transport_dead_lettered=$portfolioRemoteTransportDeadLettered portfolio_compliance_audit_export=$portfolioComplianceAuditExport portfolio_compliance_audit_export_status=$portfolioComplianceAuditExportStatus portfolio_compliance_export_route=$portfolioComplianceExportRoute portfolio_data_exchange_bundle=$portfolioDataExchangeBundle portfolio_data_exchange_bundle_type=$portfolioDataExchangeBundleType portfolio_data_exchange_decision_status=$portfolioDataExchangeDecisionStatus portfolio_data_exchange_boundary=$portfolioDataExchangeBoundary portfolio_data_exchange_approval=$portfolioDataExchangeApproval portfolio_data_exchange_approval_status=$portfolioDataExchangeApprovalStatus portfolio_cross_boundary_audit=$portfolioCrossBoundaryAudit portfolio_cross_boundary_audit_operation=$portfolioCrossBoundaryAuditOperation portfolio_cross_boundary_audit_result=$portfolioCrossBoundaryAuditResult portfolio_enterprise_privacy=$portfolioEnterprisePrivacy portfolio_federated_aggregation=$portfolioFederatedAggregation portfolio_governance=$portfolioGovernance portfolio_governance_status=$portfolioGovernanceStatus portfolio_destination_trust_tier=$portfolioDestinationTrustTier portfolio_cross_boundary_program_status=$portfolioCrossBoundaryProgramStatus portfolio_trust_tier_rollout=$portfolioTrustTierRollout portfolio_trust_tier_rollout_state=$portfolioTrustTierRolloutState portfolio_jurisdiction_rollout=$portfolioJurisdictionRollout portfolio_jurisdiction_rollout_state=$portfolioJurisdictionRolloutState portfolio_governance_analytics=$portfolioGovernanceAnalytics portfolio_governance_health_status=$portfolioGovernanceHealthStatus portfolio_risk_budget=$portfolioRiskBudget portfolio_risk_budget_status=$portfolioRiskBudgetStatus portfolio_risk_budget_breached=$portfolioRiskBudgetBreached portfolio_safety=$portfolioSafety portfolio_safety_state=$portfolioSafetyState portfolio_budget_guardrail=$portfolioBudgetGuardrail portfolio_budget_guardrail_state=$portfolioBudgetGuardrailState portfolio_enforcement_mode=$portfolioEnforcementMode portfolio_remediation_automation=$portfolioRemediationAutomation portfolio_remediation_automation_state=$portfolioRemediationAutomationState portfolio_safety_rail=$portfolioSafetyRail portfolio_quarantined=$portfolioQuarantined portfolio_remediation_approval_required=$portfolioRemediationApprovalRequired portfolio_trust_tier_drift=$portfolioTrustTierDrift portfolio_trust_tier_drift_state=$portfolioTrustTierDriftState portfolio_jurisdiction_drift=$portfolioJurisdictionDrift portfolio_jurisdiction_drift_state=$portfolioJurisdictionDriftState portfolio_destination_risk_concentration=$portfolioDestinationRiskConcentration portfolio_blocker_trend=$portfolioBlockerTrend portfolio_risk_recommendation=$portfolioRiskRecommendation portfolio_risk_recommendation_action=$portfolioRiskRecommendationAction portfolio_corrective_action=$portfolioCorrectiveAction portfolio_corrective_action_type=$portfolioCorrectiveActionType portfolio_governance_blockers=$portfolioGovernanceBlockers portfolio_governance_dependencies=$portfolioGovernanceDependencies portfolio_governance_conflicts=$portfolioGovernanceConflicts portfolio_governance_recommendation=$portfolioGovernanceRecommendation portfolio_governance_priority=$portfolioGovernancePriority portfolio_governance_recommendation_action=$portfolioGovernanceRecommendationAction portfolio_shared_blockers=$portfolioSharedBlockers portfolio_conflicts=$portfolioConflicts workflow_policy=$workflowPolicy workflow_pack=$workflowPackId workflow_pack_version=$workflowPackVersion workflow_precedence=$workflowPrecedence workflow_simulation=$workflowSimulation workflow_override=$workflowOverride workflow_controls=$workflowControl workflow_rollout_state=$workflowRolloutState workflow_rollout=$workflowRollout workflow_rollout_approval=$workflowRolloutApproval workflow_rollout_freeze=$workflowRolloutFreeze workflow_rollout_rollback=$workflowRolloutRollback workflow_schedule_state=$workflowScheduleState workflow_schedule_summary=$workflowScheduleSummary workflow_rollout_calendar=$workflowRolloutCalendar rollout_wave_state=$rolloutWaveState rollout_wave_summary=$rolloutWaveSummary promotion_window_summary=$promotionWindowSummary cross_window_governance=$crossWindowGovernance rollout_promotion_readiness_status=$rolloutPromotionReadinessStatus rollout_promotion_readiness=$rolloutPromotionReadinessSummary cross_wave_health=$crossWaveHealth cross_wave_summary=$crossWaveSummary window_delay_reason=$windowDelayReason window_impact=$windowImpactSummary promotion_operation_state=$promotionOperationState promotion_operation=$promotionOperationSummary rollout_carry_forward=$rolloutCarryForward rollout_next_window=$rolloutNextWindowPending rollout_cross_window=$rolloutCrossWindowPaused program_coordination_state=$programCoordinationState program_priority=$programPriority program_decision_reason=$programDecisionReason program_contention=$programContention program_coordination=$programCoordinationSummary cross_program=$crossProgramSummary program_escalation_state=$programEscalationState program_escalation=$programEscalationSummary approval_load_summary=$approvalLoadSummary capacity_block_summary=$capacityBlockSummary policy_block_summary=$policyBlockSummary capacity_balancing_summary=$capacityBalancingSummary portfolio_capacity_summary=$portfolioCapacitySummary approval_load_bucket=$approvalLoadBucket capacity_decision_state=$capacityDecisionState capacity_pool=$capacityPool portfolio_bottleneck=$portfolioBottleneck policy_promotion_status=$policyPromotionStatus policy_promotion_readiness=$policyPromotionReadiness policy_promotion=$policyPromotion policy_readiness=$policyReadiness policy_blockers=$policyBlockers policy_recommendation=$policyRecommendation policy_analytics=$policyAnalytics policy_approval_review=$policyApprovalReview policy_program_status=$policyProgramStatus policy_program=$policyProgram policy_cross_tenant=$policyCrossTenant policy_pack_lifecycle_status=$policyPackLifecycleStatus policy_pack_lifecycle=$policyPackLifecycle policy_pack_deprecation=$policyPackDeprecation policy_pack_retirement=$policyPackRetirement policy_pack_replacement=$policyPackReplacement policy_estate_state=$policyEstateState policy_estate=$policyEstate policy_estate_drift=$policyEstateDrift policy_estate_blockers=$policyEstateBlockers policy_estate_remediation=$policyEstateRemediation estate_automation=$estateAutomation scheduled_remediation=$scheduledRemediation automation_replay=$automationReplay sla=$sla stage_timer=$stageTimer escalation=$escalation automation=$automation required_human_action=$requiredHumanAction directory_sync=$directorySync auth_provenance=$authProvenance credential=$credential enterprise_identity=$enterpriseIdentity enterprise_session=$enterpriseSession idp_provider=$idpProvider scim_sync=$scimSync scim_provider=$scimProvider vault=$vaultCredential vault_provider=$vaultProvider rollout=$rollout cutover=$cutover vault_runtime=$vaultRuntime fallback=$fallback"
    }

    private fun String.toReadableLine(maxChars: Int): String {
        val compact = trim().replace(whitespaceRegex, " ")
        if (compact.length <= maxChars) return compact
        return compact.take((maxChars - 3).coerceAtLeast(1)).trimEnd() + "..."
    }

    private fun String.isNeutralRoleImpactSummary(): Boolean {
        return contains("No material role impact was recorded", ignoreCase = true)
    }

    private fun String.isInformativeSummary(defaultPrefix: String): Boolean {
        if (isBlank()) return false
        return !trim().startsWith(defaultPrefix, ignoreCase = true)
    }

    private fun isExternalReceipt(receipt: ExecutionReceipt): Boolean {
        return receipt.providerSelectionSummary != null ||
            receipt.providerPolicyDecisions.isNotEmpty() ||
            receipt.externalApprovalSummary != null ||
            receipt.externalDataScopeSummary != null ||
            receipt.externalVerificationSummary != null ||
            receipt.externalProofSummary != null ||
            receipt.externalSettlementSummary != null ||
            receipt.externalRollbackSummary != null ||
            receipt.externalDisputeSummary != null ||
            receipt.reconciliationSummary != null ||
            receipt.syncIssues.isNotEmpty() ||
            receipt.quoteSummary.isInformativeSummary(defaultPrefix = "No external quote comparison")
    }

    private fun buildWorkflowTimerStatusLine(receipt: ExecutionReceipt): String? {
        val parts = buildList {
            receipt.slaStatus?.let {
                add("SLA ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            receipt.stageTimerStatus?.let {
                add("stage timer ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            receipt.escalationTimerStatus?.let {
                add("escalation ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            receipt.automationEligibility?.let {
                add("automation ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
        }
        if (parts.isEmpty()) return null
        return parts.joinToString(" · ")
    }

    private fun buildPolicyEstateStateLine(receipt: ExecutionReceipt): String? {
        val snapshot = receipt.policyEstateSnapshot
        val highestDriftSeverity = snapshot?.driftRecords
            ?.maxByOrNull { it.severity.ordinal }
            ?.severity
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
        val blockerCount = snapshot?.blockers?.count { !it.acknowledged } ?: 0
        val remediationStatus = receipt.policyEstateRemediationPlan
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
        val scheduledStatus = receipt.scheduledRemediationPlan
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
        val estateAutomationStatus = receipt.estateAutomationEligibility
            ?.status
            ?.name
            ?.lowercase(Locale.getDefault())
            ?.replace('_', ' ')
        val parts = buildList {
            highestDriftSeverity?.let { add("drift $it") }
            if (blockerCount > 0) {
                add("blockers $blockerCount")
            }
            remediationStatus?.let { add("remediation $it") }
            scheduledStatus?.let { add("scheduled $it") }
            estateAutomationStatus?.let { add("automation $it") }
        }
        if (parts.isEmpty()) return null
        return parts.joinToString(" · ")
    }

    private fun buildWorkflowScheduleStateLine(receipt: ExecutionReceipt): String? {
        val rolloutState = receipt.workflowPolicyRolloutState ?: return null
        val evaluation = rolloutState.calendarEvaluation
        val schedulingWindow = rolloutState.policySchedulingWindow
        val decision = evaluation?.decision
        val windowStatus = evaluation?.windowStatus ?: schedulingWindow?.status
        val blockReason = evaluation?.blockReason
        val nextEligible = evaluation?.nextEligibleAtMs ?: schedulingWindow?.nextEligibleAtMs
        val parts = buildList {
            windowStatus?.let {
                add("window ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            decision?.let {
                add("decision ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            blockReason
                ?.takeIf { it.name != "NONE" }
                ?.let { add("reason ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}") }
            nextEligible
                ?.takeIf { it > 0L }
                ?.let { add("next eligible at $it") }
        }
        if (parts.isEmpty()) return null
        return parts.joinToString(" · ")
    }

    private fun buildRolloutWaveStateLine(receipt: ExecutionReceipt): String? {
        val parts = buildList {
            receipt.currentRolloutWaveId
                ?.takeIf { it.isNotBlank() }
                ?.let { add("wave $it") }
            receipt.currentRolloutWaveStatus?.let {
                add("status ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            receipt.currentRolloutWaveCompletionState?.let {
                add("completion ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            receipt.currentRolloutWaveDecision?.let {
                add("decision ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
            receipt.currentRolloutWindowEligibility?.let {
                add("window ${it.name.lowercase(Locale.getDefault()).replace('_', ' ')}")
            }
        }
        if (parts.isEmpty()) return null
        return parts.joinToString(" · ")
    }

    private fun externalSummaryLines(response: AgentResponse, receipt: ExecutionReceipt): List<String> {
        if (!isExternalReceipt(receipt)) return emptyList()
        return buildList {
            externalSummaryHeadline(response, maxItems = 5)?.let(::add)
            providerWhySummary(receipt)?.let { add("Why provider: $it") }
            approvalWhySummary(receipt)?.let { add("Why approval: $it") }
            dataScopeWhySummary(receipt)?.let { add("Why data scope: $it") }
            settlementWhySummary(receipt)?.let { add("Why settlement: $it") }
            if (hasSyncPendingSignal(response, receipt)) {
                add("Sync pending: dispute state is saved locally while gateway/cloud sync completes.")
            }
        }
            .asSequence()
            .map { it.toReadableLine(MAX_SUMMARY_CHARS) }
            .filter { it.isNotBlank() }
            .distinct()
            .toList()
    }

    private fun providerWhySummary(receipt: ExecutionReceipt): String? {
        receipt.providerSelectionSummary?.selectionRationale
            ?.takeIf {
                it.isNotBlank() &&
                    !it.startsWith("No provider selected", ignoreCase = true)
            }
            ?.let { return it }
        val deniedDecision = receipt.providerPolicyDecisions.firstOrNull { it.decision == ProviderDecisionStatus.DENIED }
        if (deniedDecision != null) {
            val provider = deniedDecision.providerName.ifBlank { "Provider" }
            val detail = deniedDecision.readableReason
                .takeIf { it.isNotBlank() }
                ?: "Denied by current role policy."
            return "$provider denied. $detail"
        }
        return receipt.providerSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No external provider decision") }
    }

    private fun approvalWhySummary(receipt: ExecutionReceipt): String? {
        val approval = receipt.externalApprovalSummary ?: return null
        if (approval.status.equals("not_required", ignoreCase = true)) return null
        return approval.summary.takeIf { it.isNotBlank() }
            ?: receipt.approvalSummary.takeIf { it.isInformativeSummary(defaultPrefix = "No approval gate") }
    }

    private fun dataScopeWhySummary(receipt: ExecutionReceipt): String? {
        val dataScope = receipt.externalDataScopeSummary ?: return null
        if (!dataScope.blocked && !dataScope.reduced) return null
        return dataScope.summary.takeIf { it.isNotBlank() }
            ?: receipt.dataScopeSummary.takeIf {
                it.isInformativeSummary(defaultPrefix = "No additional data-scope restrictions")
            }
    }

    private fun settlementWhySummary(receipt: ExecutionReceipt): String? {
        receipt.reconciliationSummary?.summary
            ?.takeIf { it.isNotBlank() && !it.equals("No reconciliation step was required.", ignoreCase = true) }
            ?.let { return it }
        return receipt.externalSettlementSummary?.summary
            ?.takeIf { it.isNotBlank() && !it.equals("Settlement state was recorded for this external run.", ignoreCase = true) }
    }

    private fun hasSyncPendingSignal(response: AgentResponse, receipt: ExecutionReceipt): Boolean {
        val combined = buildString {
            append(response.summary.orEmpty())
            append(' ')
            append(receipt.issueSummary.orEmpty())
            append(' ')
            append(receipt.externalDisputeSummary?.summary.orEmpty())
            append(' ')
            append(receipt.externalSettlementSummary?.summary.orEmpty())
            append(' ')
            append(receipt.reconciliationSummary?.summary.orEmpty())
        }.lowercase(Locale.getDefault())
        return combined.contains("sync pending") ||
            combined.contains("gateway sync pending") ||
            combined.contains("awaiting gateway sync")
    }
}

data class ReceiptQualitySignals(
    val hasTitle: Boolean,
    val hasHeadline: Boolean,
    val summaryLineCount: Int,
    val hasApprovalSummary: Boolean,
    val hasDataScopeSummary: Boolean,
    val hasProviderSummary: Boolean,
    val hasVerificationSummary: Boolean,
    val hasRollbackSummary: Boolean
)

data class ExternalVisibilityPill(
    val label: String,
    val tone: ExternalVisibilityTone
)

enum class ExternalVisibilityTone {
    POSITIVE,
    WARNING,
    NEGATIVE,
    INFO
}

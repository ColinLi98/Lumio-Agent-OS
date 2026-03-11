package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.GovernanceMetricKey
import com.lumi.coredomain.contract.GovernanceSummary
import java.util.Locale

object GovernanceSummaryFormatter {
    private const val MAX_LINE_CHARS = 132

    fun headline(summary: GovernanceSummary): String {
        val days = summary.window.windowDays.coerceAtLeast(1)
        val matched = summary.matchedRecords
        val total = summary.totalRecords
        return "Governance window: last $days days · Matched runs $matched/$total"
            .toReadableLine(MAX_LINE_CHARS)
    }

    fun metricLines(summary: GovernanceSummary, maxItems: Int = 6): List<String> {
        val lines = buildList {
            summary.portfolioOptimizationSummary
                ?.takeIf { it.latestResultId != null || it.topRecommendation.isNotBlank() || it.selectedCandidateId != null }
                ?.let { optimization ->
                    val recommendation = optimization.topRecommendation.ifBlank {
                        optimization.selectedScheduleSummary.ifBlank { "no optimization recommendation yet" }
                    }
                    add(
                        "Portfolio optimization: requests ${optimization.requestCount}, results ${optimization.resultCount}, selected ${optimization.selectedCandidateId ?: "none"}, snapshot ${optimization.activeCalibrationSnapshotId?.takeLast(8) ?: "default"}"
                    )
                    add("Portfolio recommendation: $recommendation")
                    if (
                        optimization.activeObjectiveProfileScope != null ||
                        optimization.activeObjectiveProfileProvenance != null ||
                        optimization.activeObjectiveProfileSummary.isNotBlank()
                    ) {
                        val objectiveProfileState = buildList {
                            optimization.activeObjectiveProfileScope?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.activeObjectiveProfileProvenance?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.activeObjectiveProfileSnapshotId
                                ?.takeIf { it.isNotBlank() }
                                ?.let { add("snapshot ${it.takeLast(8)}") }
                        }.joinToString(" · ")
                        add(
                            "Portfolio objective profile: ${if (objectiveProfileState.isBlank()) "n/a" else objectiveProfileState}${optimization.activeObjectiveProfileSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestOutcomeSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio outcome: $it") }
                    optimization.latestDriftSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio drift: ${optimization.highestDriftSeverity?.name?.lowercase() ?: "none"} · $it") }
                    optimization.latestTuningSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio tuning: pending ${optimization.pendingTuningCount}, applied ${optimization.appliedTuningCount} · $it") }
                    if (
                        optimization.latestPropagationSummary.isNotBlank() ||
                        optimization.pendingPropagationCount > 0 ||
                        optimization.reviewRequiredPropagationCount > 0
                    ) {
                        val propagationSummary = optimization.latestPropagationSummary.ifBlank {
                            "No propagation actions recorded."
                        }
                        add(
                            "Portfolio propagation: pending ${optimization.pendingPropagationCount}, review ${optimization.reviewRequiredPropagationCount} · $propagationSummary"
                        )
                    }
                    if (
                        optimization.activeLearningSyncMode != null ||
                        optimization.latestLearningSyncStatus != null ||
                        optimization.pendingSyncConflictCount > 0 ||
                        optimization.latestLearningSyncSummary.isNotBlank()
                    ) {
                        val syncState = buildList {
                            optimization.activeLearningSyncMode?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestLearningSyncStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestLearningSyncConflictResolution?.let {
                                add("conflict ${it.name.lowercase().replace('_', ' ')}")
                            }
                        }.joinToString(" · ")
                        add(
                            "Portfolio sync: ${if (syncState.isBlank()) "n/a" else syncState} · pending conflicts ${optimization.pendingSyncConflictCount}${optimization.latestLearningSyncSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.learningSyncConsentDecision != null ||
                        optimization.remoteTransportConsentDecision != null ||
                        optimization.auditExportConsentDecision != null ||
                        optimization.latestConsentSummary.isNotBlank()
                    ) {
                        val consentState = buildList {
                            optimization.learningSyncConsentDecision?.let {
                                add("sync ${it.name.lowercase().replace('_', ' ')}")
                            }
                            optimization.remoteTransportConsentDecision?.let {
                                add("transport ${it.name.lowercase().replace('_', ' ')}")
                            }
                            optimization.auditExportConsentDecision?.let {
                                add("audit ${it.name.lowercase().replace('_', ' ')}")
                            }
                        }.joinToString(" · ")
                        add(
                            "Portfolio consent: ${if (consentState.isBlank()) "n/a" else consentState}${optimization.latestConsentSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestRemoteTransportConnectorType != null ||
                        optimization.latestRemoteTransportKeyStatus != null ||
                        optimization.latestRemoteTransportComplianceDecision != null ||
                        optimization.latestRemoteTransportStatus != null ||
                        optimization.latestRemoteTransportSummary.isNotBlank() ||
                        optimization.remoteTransportDeadLetterCount > 0
                    ) {
                        val transportState = buildList {
                            optimization.latestRemoteTransportStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestRemoteTransportConnectorType?.let {
                                add("connector ${it.name.lowercase().replace('_', ' ')}")
                            }
                            optimization.latestRemoteTransportKeyStatus?.let {
                                add("key ${it.name.lowercase().replace('_', ' ')}")
                            }
                            optimization.latestRemoteTransportComplianceDecision?.let {
                                add("compliance ${it.name.lowercase().replace('_', ' ')}")
                            }
                            if (optimization.remoteTransportDeadLetterCount > 0) {
                                add("dead-letter ${optimization.remoteTransportDeadLetterCount}")
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio remote transport: $transportState${optimization.latestRemoteTransportSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestRemoteTransportConnectorSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio connector: $it") }
                    optimization.latestRemoteTransportKeySummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio enterprise key: $it") }
                    optimization.latestRemoteTransportComplianceSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio compliance gate: $it") }
                    if (
                        optimization.latestRemoteDestinationStatus != null ||
                        optimization.latestRemoteDestinationType != null ||
                        optimization.latestRemoteDestinationSummary.isNotBlank()
                    ) {
                        val destinationState = buildList {
                            optimization.latestRemoteDestinationStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestRemoteDestinationType?.let {
                                add("destination ${it.name.lowercase().replace('_', ' ')}")
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio destination: $destinationState${optimization.latestRemoteDestinationSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestResidencyRegion != null ||
                        optimization.latestJurisdiction != null ||
                        optimization.latestResidencySummary.isNotBlank()
                    ) {
                        val residencyState = buildList {
                            optimization.latestResidencyRegion?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestJurisdiction?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio residency: $residencyState${optimization.latestResidencySummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestComplianceAuditExportStatus != null ||
                        optimization.latestComplianceAuditExportSummary.isNotBlank()
                    ) {
                        val exportState = optimization.latestComplianceAuditExportStatus
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio audit export: $exportState${optimization.latestComplianceAuditExportSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestComplianceExportRouteSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio export route: $it") }
                    if (
                        optimization.latestDataExchangeBundleType != null ||
                        optimization.latestDataExchangeDecisionStatus != null ||
                        optimization.latestDataExchangeBundleSummary.isNotBlank()
                    ) {
                        val bundleState = buildList {
                            optimization.latestDataExchangeBundleType?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestDataExchangeDecisionStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio exchange bundle: $bundleState${optimization.latestDataExchangeBundleSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestDataExchangeBoundarySummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio exchange boundary: $it") }
                    if (
                        optimization.latestDataExchangeApprovalStatus != null ||
                        optimization.pendingDataExchangeApprovalCount > 0 ||
                        optimization.latestDataExchangeApprovalSummary.isNotBlank()
                    ) {
                        val approvalState = optimization.latestDataExchangeApprovalStatus
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio exchange approval: $approvalState · pending ${optimization.pendingDataExchangeApprovalCount}${optimization.latestDataExchangeApprovalSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestCrossBoundaryAuditOperationType != null ||
                        optimization.latestCrossBoundaryAuditResult != null ||
                        optimization.latestCrossBoundaryAuditSummary.isNotBlank()
                    ) {
                        val auditState = buildList {
                            optimization.latestCrossBoundaryAuditOperationType?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestCrossBoundaryAuditResult?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio cross-boundary audit: $auditState${optimization.latestCrossBoundaryAuditSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.activeSyncPrivacyPolicySummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio sync privacy: $it") }
                    optimization.activeEnterprisePrivacyPolicySummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio enterprise privacy: $it") }
                    optimization.activeFederationBoundarySummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio federation boundary: $it") }
                    optimization.latestFederatedAggregationSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio federated aggregation: $it") }
                    if (
                        optimization.activeCrossBoundaryGovernancePortfolioStatus != null ||
                        optimization.activeDestinationTrustTier != null ||
                        optimization.latestGovernancePortfolioSummary.isNotBlank()
                    ) {
                        val governanceState = buildList {
                            optimization.activeCrossBoundaryGovernancePortfolioStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.activeDestinationTrustTier?.let {
                                add("trust ${it.name.lowercase().replace('_', ' ')}")
                            }
                            optimization.latestPortfolioPriority?.let {
                                add("priority ${it.name.lowercase().replace('_', ' ')}")
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio governance: $governanceState${optimization.latestGovernancePortfolioSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestCrossBoundaryProgramStatus != null ||
                        optimization.latestTrustTierRolloutState != null ||
                        optimization.latestTrustTierProgramSummary.isNotBlank()
                    ) {
                        val trustTierState = buildList {
                            optimization.latestCrossBoundaryProgramStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.latestTrustTierRolloutState?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio trust tier: $trustTierState${optimization.latestTrustTierProgramSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestJurisdictionRolloutState != null ||
                        optimization.latestJurisdictionRolloutSummary.isNotBlank()
                    ) {
                        val jurisdictionState = optimization.latestJurisdictionRolloutState
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio jurisdiction rollout: $jurisdictionState${optimization.latestJurisdictionRolloutSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.activePortfolioHealthStatus != null ||
                        optimization.activePortfolioTrajectoryState != null ||
                        optimization.latestPortfolioAnalyticsSummary.isNotBlank()
                    ) {
                        val analyticsState = buildList {
                            optimization.activePortfolioHealthStatus?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.activePortfolioTrajectoryState?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio analytics: $analyticsState${optimization.latestPortfolioAnalyticsSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestTrustTierDriftState != null ||
                        optimization.latestTrustTierDriftSummary.isNotBlank()
                    ) {
                        val trustTierDriftState = optimization.latestTrustTierDriftState
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio trust-tier drift: $trustTierDriftState${optimization.latestTrustTierDriftSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.latestJurisdictionDriftState != null ||
                        optimization.latestJurisdictionDriftSummary.isNotBlank()
                    ) {
                        val jurisdictionDriftState = optimization.latestJurisdictionDriftState
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio jurisdiction drift: $jurisdictionDriftState${optimization.latestJurisdictionDriftSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.activeRiskBudgetStatus != null ||
                        optimization.riskBudgetBreachCount > 0 ||
                        optimization.latestRiskBudgetSummary.isNotBlank()
                    ) {
                        val riskBudgetState = optimization.activeRiskBudgetStatus
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        val breachSuffix = if (optimization.riskBudgetBreachCount > 0) {
                            " · breaches ${optimization.riskBudgetBreachCount}"
                        } else {
                            ""
                        }
                        add(
                            "Portfolio risk budget: $riskBudgetState$breachSuffix${optimization.latestRiskBudgetSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.activePortfolioSafetyState != null ||
                        optimization.activeBudgetGuardrailState != null ||
                        optimization.activePortfolioEnforcementMode != null ||
                        optimization.activeRemediationAutomationState != null ||
                        optimization.latestPortfolioSafetySummary.isNotBlank()
                    ) {
                        val safetyState = buildList {
                            optimization.activePortfolioSafetyState?.let {
                                add(it.name.lowercase().replace('_', ' '))
                            }
                            optimization.activePortfolioEnforcementMode?.let {
                                add("enforcement ${it.name.lowercase().replace('_', ' ')}")
                            }
                            optimization.activeRemediationAutomationState?.let {
                                add("remediation ${it.name.lowercase().replace('_', ' ')}")
                            }
                        }.joinToString(" · ").ifBlank { "n/a" }
                        add(
                            "Portfolio safety: $safetyState${optimization.latestPortfolioSafetySummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.activeBudgetGuardrailState != null ||
                        optimization.remediationApprovalRequiredCount > 0 ||
                        optimization.latestBudgetGuardrailSummary.isNotBlank()
                    ) {
                        val budgetGuardrailState = optimization.activeBudgetGuardrailState
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        val approvalSuffix = if (optimization.remediationApprovalRequiredCount > 0) {
                            " · approval ${optimization.remediationApprovalRequiredCount}"
                        } else {
                            ""
                        }
                        add(
                            "Portfolio guardrail: $budgetGuardrailState$approvalSuffix${optimization.latestBudgetGuardrailSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestPortfolioSafetyRailSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio safety rail: $it") }
                    if (
                        optimization.activeRemediationAutomationState != null ||
                        optimization.quarantinedPortfolioCount > 0 ||
                        optimization.latestRemediationAutomationSummary.isNotBlank()
                    ) {
                        val remediationState = optimization.activeRemediationAutomationState
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        val quarantineSuffix = if (optimization.quarantinedPortfolioCount > 0) {
                            " · quarantined ${optimization.quarantinedPortfolioCount}"
                        } else {
                            ""
                        }
                        add(
                            "Portfolio remediation: $remediationState$quarantineSuffix${optimization.latestRemediationAutomationSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestDestinationRiskConcentrationSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio destination concentration: $it") }
                    optimization.latestPortfolioBlockerTrendSummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio blocker trend: $it") }
                    if (
                        optimization.latestPortfolioRiskRecommendationAction != null ||
                        optimization.latestPortfolioRiskRecommendationSummary.isNotBlank()
                    ) {
                        val recommendationAction = optimization.latestPortfolioRiskRecommendationAction
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio risk recommendation: $recommendationAction${optimization.latestPortfolioRiskRecommendationSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (optimization.latestPortfolioCorrectiveActionSummary.isNotBlank()) {
                        add("Portfolio corrective action: ${optimization.latestPortfolioCorrectiveActionSummary}")
                    }
                    if (
                        optimization.sharedPortfolioBlockerCount > 0 ||
                        optimization.latestPortfolioBlockerSummary.isNotBlank()
                    ) {
                        add(
                            "Portfolio blockers: ${optimization.sharedPortfolioBlockerCount}${optimization.latestPortfolioBlockerSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    if (
                        optimization.portfolioConflictCount > 0 ||
                        optimization.latestPortfolioConflictSummary.isNotBlank()
                    ) {
                        add(
                            "Portfolio conflicts: ${optimization.portfolioConflictCount}${optimization.latestPortfolioConflictSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                    optimization.latestPortfolioDependencySummary
                        .takeIf { it.isNotBlank() }
                        ?.let { add("Portfolio dependencies: $it") }
                    if (
                        optimization.latestPortfolioRecommendationAction != null ||
                        optimization.latestPortfolioRecommendationSummary.isNotBlank()
                    ) {
                        val recommendationAction = optimization.latestPortfolioRecommendationAction
                            ?.name
                            ?.lowercase()
                            ?.replace('_', ' ')
                            ?: "n/a"
                        add(
                            "Portfolio next action: $recommendationAction${optimization.latestPortfolioRecommendationSummary.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}"
                        )
                    }
                }
            metricRate(summary, GovernanceMetricKey.APPROVAL_DENIED_RATE_BY_ROLE)
                ?.let { add("Approval denied rate: $it") }
            metricRate(summary, GovernanceMetricKey.EXTERNAL_FULFILLMENT_ATTEMPT_RATE)
                ?.let { add("External fulfillment attempt rate: $it") }
            metricRate(summary, GovernanceMetricKey.DATA_SCOPE_BLOCKED_RATE)
                ?.let { add("Data scope blocked rate: $it") }
            metricRate(summary, GovernanceMetricKey.VERIFICATION_FAIL_RATE)
                ?.let { add("Verification failure rate: $it") }
            metricRate(summary, GovernanceMetricKey.ROLLBACK_TRIGGERED_RATE)
                ?.let { add("Rollback triggered rate: $it") }
            metricRate(summary, GovernanceMetricKey.DISPUTE_OPEN_RATE)
                ?.let { add("Dispute open rate: $it") }
            metricRate(summary, GovernanceMetricKey.SNAPSHOT_BINDING_COVERAGE)
                ?.let { add("Snapshot binding coverage: $it") }
            metricRate(summary, GovernanceMetricKey.RECEIPT_TRACEABILITY_COVERAGE)
                ?.let { add("Receipt traceability coverage: $it") }
        }
        return lines
            .asSequence()
            .map { it.toReadableLine(MAX_LINE_CHARS) }
            .distinct()
            .take(maxItems.coerceAtLeast(1))
            .toList()
    }

    fun roleLines(summary: GovernanceSummary, maxItems: Int = 3): List<String> {
        return summary.byRole
            .sortedByDescending { it.runCount }
            .take(maxItems.coerceAtLeast(1))
            .map { bucket ->
                val denialRate = percentage(bucket.approvalDeniedCount, bucket.runCount)
                val verificationIssues = percentage(bucket.verificationFailedCount, bucket.runCount)
                "${bucket.bucket.uppercase(Locale.getDefault())}: runs ${bucket.runCount}, approval denied $denialRate, verification failed $verificationIssues"
                    .toReadableLine(MAX_LINE_CHARS)
            }
    }

    fun providerLines(summary: GovernanceSummary, maxItems: Int = 2): List<String> {
        return summary.byProvider
            .sortedByDescending { it.runCount }
            .take(maxItems.coerceAtLeast(1))
            .map { bucket ->
                val denied = percentage(bucket.providerDeniedCount, bucket.runCount)
                "${bucket.bucket}: selected ${bucket.providerSelectedCount}, denied ${bucket.providerDeniedCount} ($denied)"
                    .toReadableLine(MAX_LINE_CHARS)
            }
    }

    private fun metricRate(summary: GovernanceSummary, key: GovernanceMetricKey): String? {
        val metric = summary.metricValues.firstOrNull { it.key == key && it.dimension == null } ?: return null
        return "${percentage(metric.numerator, metric.denominator)} (${metric.numerator}/${metric.denominator})"
    }

    private fun percentage(numerator: Int, denominator: Int): String {
        if (denominator <= 0) return "0%"
        val ratio = (numerator.toDouble() / denominator.toDouble()) * 100.0
        return String.format(Locale.US, "%.1f%%", ratio)
    }

    private fun String.toReadableLine(maxChars: Int): String {
        val compact = trim().replace("\\s+".toRegex(), " ")
        if (compact.length <= maxChars) return compact
        return compact.take((maxChars - 3).coerceAtLeast(1)).trimEnd() + "..."
    }
}

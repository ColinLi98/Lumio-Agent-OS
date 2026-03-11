package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.GovernanceAggregationWindow
import com.lumi.coredomain.contract.GovernanceActionSuggestion
import com.lumi.coredomain.contract.GovernanceActionType
import com.lumi.coredomain.contract.GovernanceAlert
import com.lumi.coredomain.contract.GovernanceAlertSeverity
import com.lumi.coredomain.contract.GovernanceBucketSummary
import com.lumi.coredomain.contract.GovernanceCasePriority
import com.lumi.coredomain.contract.GovernanceCaseRecord
import com.lumi.coredomain.contract.GovernanceCaseSummary
import com.lumi.coredomain.contract.GovernanceConsoleFilter
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.GovernanceMetricKey
import com.lumi.coredomain.contract.GovernanceMetricValue
import com.lumi.coredomain.contract.GovernanceQueueCount
import com.lumi.coredomain.contract.GovernanceQueueType
import com.lumi.coredomain.contract.GovernanceQuery
import com.lumi.coredomain.contract.GovernanceReasonFamily
import com.lumi.coredomain.contract.GovernanceSummary
import com.lumi.coredomain.contract.GovernanceCaseCollaborationState
import com.lumi.coredomain.contract.GovernanceCaseFollowUpState
import com.lumi.coredomain.contract.GovernanceCaseNoteRecord
import com.lumi.coredomain.contract.OperatorConnectorAuditLink
import com.lumi.coredomain.contract.OperatorAssigneeRef
import com.lumi.coredomain.contract.OperatorCaseClaimStatus
import com.lumi.coredomain.contract.OperatorCollaborationStatus
import com.lumi.coredomain.contract.PortfolioOptimizationSummary
import com.lumi.coredomain.contract.PortfolioDriftSeverity
import com.lumi.coredomain.contract.RemoteDeliveryIssue
import com.lumi.coredomain.contract.RemoteAuthorizationResult
import com.lumi.coredomain.contract.RemoteAuthorizationStatus
import com.lumi.coredomain.contract.RemoteOperatorDirectorySource
import com.lumi.coredomain.contract.RemoteOperatorHandoffAttempt
import com.lumi.coredomain.contract.RemoteOperatorHandoffRecord
import com.lumi.coredomain.contract.RemoteOperatorHandoffRequest
import com.lumi.coredomain.contract.RemoteOperatorHandoffStatus
import com.lumi.coredomain.contract.RemoteOperatorIdentity
import com.lumi.coredomain.contract.RemoteOperatorTeam
import com.lumi.coredomain.contract.RemotePipelineSummary
import com.lumi.coredomain.contract.ReconciliationJobStatus
import com.lumi.coredomain.contract.RemoteSyncHandoffStatus
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.ScheduledRemediationStatus
import com.lumi.coredomain.contract.PolicyRolloutApprovalRequirement
import com.lumi.coredomain.contract.PolicyRolloutApprovalState
import com.lumi.coredomain.contract.PolicyRolloutAuditAction
import com.lumi.coredomain.contract.PolicyRolloutAuditRecord
import com.lumi.coredomain.contract.PolicyRolloutFreezeState
import com.lumi.coredomain.contract.PolicyRolloutMode
import com.lumi.coredomain.contract.PolicyRolloutScope
import com.lumi.coredomain.contract.PolicyRolloutStage
import com.lumi.coredomain.contract.PolicyRolloutTarget
import com.lumi.coredomain.contract.WorkflowPolicyRolloutState
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.SettlementStatus
import com.lumi.coredomain.contract.SettlementSyncState
import com.lumi.coredomain.contract.DisputeStatus
import com.lumi.coredomain.contract.TelemetryDeliveryStatus
import com.lumi.coredomain.contract.AlertDispatchStatus
import com.lumi.coredomain.contract.AlertRoutingAttempt
import com.lumi.coredomain.contract.AlertRoutingRecord
import com.lumi.coredomain.contract.AlertRoutingStatus
import com.lumi.coredomain.contract.AlertRoutingTarget
import com.lumi.coredomain.contract.AlertRoutingTargetType
import com.lumi.coredomain.contract.ApprovalBalancingDecisionType
import com.lumi.coredomain.contract.ApprovalDeferralReason
import com.lumi.coredomain.contract.ApprovalLoadBucket
import com.lumi.coredomain.contract.ConnectorRoutingSummary
import com.lumi.coredomain.contract.CredentialRouteBlockReason
import com.lumi.coredomain.contract.DirectorySyncErrorState
import com.lumi.coredomain.contract.DirectorySyncSnapshot
import com.lumi.coredomain.contract.DirectorySyncStatus
import com.lumi.coredomain.contract.DirectorySyncUpdate
import com.lumi.coredomain.contract.DirectorySyncUpdateType
import com.lumi.coredomain.contract.EnterpriseAuthIntegrationSummary
import com.lumi.coredomain.contract.EnterpriseDirectorySource
import com.lumi.coredomain.contract.EnterpriseIdentityAssertion
import com.lumi.coredomain.contract.EnterpriseIdpProvider
import com.lumi.coredomain.contract.EnterpriseSessionProvenance
import com.lumi.coredomain.contract.ConnectorCredentialBinding
import com.lumi.coredomain.contract.UserRole
import com.lumi.coredomain.contract.VaultCredentialReference
import com.lumi.coredomain.contract.VaultCredentialRotationState
import com.lumi.coredomain.contract.VaultCredentialStatus
import com.lumi.coredomain.contract.PolicyEstateDriftSeverity
import com.lumi.coredomain.contract.PolicyEstateRemediationPlan
import com.lumi.coredomain.contract.PolicyEstateRemediationStatus
import com.lumi.coredomain.contract.PolicyEstateRemediationActionRecord
import com.lumi.coredomain.contract.PolicyEstateRemediationActionType
import com.lumi.coredomain.contract.WorkflowPolicyPrecedenceSource
import com.lumi.coredomain.contract.RoleReasonCodes
import com.lumi.coredomain.contract.SchedulingWindowType
import com.lumi.coredomain.contract.SchedulingWindowStatus
import com.lumi.coredomain.contract.ExecutionWindowDecision
import com.lumi.coredomain.contract.ExecutionWindowBlockReason
import com.lumi.coredomain.contract.PolicySchedulingWindow
import com.lumi.coredomain.contract.CalendarEvaluationResult
import com.lumi.coredomain.contract.RolloutCalendar
import com.lumi.coredomain.contract.RolloutCalendarEntry
import com.lumi.coredomain.contract.RolloutCalendarEntryStatus
import com.lumi.coredomain.contract.RolloutWave
import com.lumi.coredomain.contract.RolloutWaveCarryForwardState
import com.lumi.coredomain.contract.RolloutWaveCompletionState
import com.lumi.coredomain.contract.RolloutWaveDecisionType
import com.lumi.coredomain.contract.RolloutWaveStatus
import com.lumi.coredomain.contract.PromotionWindowEligibility
import com.lumi.coredomain.contract.CalendarAwarePromotionDecision
import com.lumi.coredomain.contract.NextEligibleWindowSummary
import com.lumi.coredomain.contract.CrossWindowGovernanceControl
import com.lumi.coredomain.contract.CrossWindowPauseState
import com.lumi.coredomain.contract.CrossWindowHoldReason
import org.junit.Assert.assertTrue
import org.junit.Test

class GovernanceSummaryFormatterTest {

    @Test
    fun formatter_includesPortfolioOptimizationSummaryLines() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1700001111L,
            window = GovernanceAggregationWindow(
                startAtMs = 1700000000L,
                endAtMs = 1700001111L,
                windowDays = 7
            ),
            totalRecords = 12,
            matchedRecords = 9,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_1",
                requestCount = 2,
                resultCount = 1,
                decisionCount = 1,
                selectedCandidateId = "candidate_alpha",
                activeCalibrationSnapshotId = "snapshot_m34_v2",
                activeObjectiveProfileSnapshotId = "profile_snapshot_m35_v3",
                activeObjectiveProfileScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                activeObjectiveProfileProvenance = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileProvenanceType.PROPAGATED,
                latestOutcomeId = "outcome_m34",
                highestDriftSeverity = PortfolioDriftSeverity.HIGH,
                pendingTuningCount = 1,
                appliedTuningCount = 2,
                pendingPropagationCount = 1,
                reviewRequiredPropagationCount = 1,
                selectedScheduleSummary = "Selected a lower-risk schedule.",
                topRecommendation = "3 promotion-ready action(s); 1 deferred for risk limit.",
                activeObjectiveProfileSummary = "Workspace profile propagated from a user-scoped tuning snapshot.",
                latestOutcomeSummary = "Outcome recorded with elevated approval latency.",
                latestDriftSummary = "High drift detected across approval latency and risk incidents.",
                latestTuningSummary = "Applied risk incident tuning to snapshot v2.",
                latestPropagationSummary = "Workspace promotion pending tenant approval after drift review.",
                reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_SCHEDULE_SELECTED),
                summary = "Selected lower-risk schedule from latest optimization result."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 8)

        assertTrue(metricLines.any { it.contains("portfolio optimization", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("candidate_alpha", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("snapshot", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("promotion-ready", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio objective profile:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("workspace", ignoreCase = true) && it.contains("propagated", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio outcome:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio drift:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio tuning:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio propagation:", ignoreCase = true) })
    }

    @Test
    fun formatter_includesPortfolioLearningSyncAndFederationLines() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1700002222L,
            window = GovernanceAggregationWindow(
                startAtMs = 1700001000L,
                endAtMs = 1700002222L,
                windowDays = 7
            ),
            totalRecords = 14,
            matchedRecords = 10,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_m36",
                requestCount = 3,
                resultCount = 2,
                decisionCount = 1,
                activeLearningSyncMode = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                latestLearningSyncStatus = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
                latestLearningSyncConflictResolution =
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.SAFE_MERGE,
                pendingSyncConflictCount = 1,
                activeSyncPrivacyPolicySummary = "Tenant-private policy keeps learning artifacts redacted.",
                activeFederationBoundarySummary = "Tenant boundary limits sync to same-tenant workspaces.",
                latestLearningSyncSummary = "Imported 2 redacted learning artifact(s) after safe merge.",
                latestFederatedAggregationSummary = "Same-tenant aggregation merged 4 artifacts across 2 devices.",
                summary = "Learning sync state restored."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 10)

        assertTrue(metricLines.any { it.contains("Portfolio sync:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("tenant private sync", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("safe merge", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("pending conflicts 1", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio sync privacy:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio federation boundary:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio federated aggregation:", ignoreCase = true) })
    }

    @Test
    fun formatter_includesPortfolioConsentTransportAndAuditLines() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1700003333L,
            window = GovernanceAggregationWindow(
                startAtMs = 1700002000L,
                endAtMs = 1700003333L,
                windowDays = 7
            ),
            totalRecords = 8,
            matchedRecords = 6,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_m37",
                requestCount = 3,
                resultCount = 2,
                decisionCount = 1,
                learningSyncConsentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                remoteTransportConsentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                auditExportConsentDecision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                latestRemoteTransportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
                latestRemoteTransportConnectorType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                latestRemoteTransportKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.REVOKED,
                latestRemoteTransportComplianceDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.LOCAL_FALLBACK,
                latestComplianceAuditExportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
                remoteTransportDeadLetterCount = 1,
                latestConsentSummary = "Purpose-limited consent remains active for redacted learning artifacts.",
                latestRemoteTransportSummary = "Transport fell back locally after enterprise key revocation.",
                latestRemoteTransportConnectorSummary =
                    "HTTPS webhook connector selected deterministically for redacted learning delivery.",
                latestRemoteTransportKeySummary =
                    "Enterprise key was revoked, so remote delivery could not proceed safely.",
                latestRemoteTransportComplianceSummary =
                    "Compliance gate forced local fallback because enterprise key state was unsafe.",
                latestComplianceAuditExportSummary = "Generated JSON export with redaction-first bundle hashes.",
                activeEnterprisePrivacyPolicySummary = "Enterprise privacy keeps raw prompts blocked and enforces same-tenant boundaries.",
                summary = "M37 compliance state restored."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 12)

        assertTrue(metricLines.any { it.contains("Portfolio consent:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("sync allowed", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio remote transport:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("local fallback", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("dead-letter 1", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio connector:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio enterprise key:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio compliance gate:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio audit export:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("complete", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio enterprise privacy:", ignoreCase = true) })
    }

    @Test
    fun formatter_includesPortfolioDestinationResidencyAndExportRouteLines() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1_700_390_333L,
            window = GovernanceAggregationWindow(
                startAtMs = 1_700_390_000L,
                endAtMs = 1_700_390_333L,
                windowDays = 7
            ),
            totalRecords = 6,
            matchedRecords = 4,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_m39",
                requestCount = 2,
                resultCount = 1,
                decisionCount = 1,
                latestRemoteDestinationStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                latestRemoteDestinationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                latestResidencyRegion = com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                latestJurisdiction = com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                latestRemoteDestinationSummary =
                    "Destination routing is held for compliance review because jurisdiction evidence is incomplete.",
                latestResidencySummary =
                    "Residency policy keeps EU artifacts inside EU GDPR routing boundaries.",
                latestComplianceExportRouteSummary =
                    "Compliance export route is held pending jurisdiction review.",
                summary = "M39 destination routing state restored."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 12)

        assertTrue(metricLines.any { it.contains("Portfolio destination:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("held for compliance", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio residency:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("eu gdpr", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio export route:", ignoreCase = true) })
    }

    @Test
    fun formatter_includesPortfolioDataExchangeApprovalAndAuditLines() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1_700_400_333L,
            window = GovernanceAggregationWindow(
                startAtMs = 1_700_400_000L,
                endAtMs = 1_700_400_333L,
                windowDays = 7
            ),
            totalRecords = 5,
            matchedRecords = 3,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_m40",
                requestCount = 2,
                resultCount = 1,
                decisionCount = 1,
                latestDataExchangeBundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                latestDataExchangeDecisionStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                latestDataExchangeApprovalStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
                latestCrossBoundaryAuditOperationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                latestCrossBoundaryAuditResult =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
                pendingDataExchangeApprovalCount = 0,
                latestDataExchangeBundleSummary =
                    "Bundle split keeps receipt and governance traces local while remote-safe artifacts continue.",
                latestDataExchangeBoundarySummary =
                    "Boundary permits redacted audit exchange inside EU GDPR routing.",
                latestDataExchangeApprovalSummary =
                    "Cross-boundary approval was auto-approved because the split stayed within safe bounds.",
                latestCrossBoundaryAuditSummary =
                    "Cross-boundary audit recorded the bundle split decision.",
                summary = "M40 data exchange governance state restored."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 16)

        assertTrue(metricLines.any { it.contains("Portfolio exchange bundle:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("split", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio exchange boundary:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("eu gdpr", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio exchange approval:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("auto approved", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio cross-boundary audit:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("recorded", ignoreCase = true) })
    }

    @Test
    fun metricLines_includePortfolioGovernanceTrustTierAndJurisdictionSignals() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1_700_420_111L,
            window = GovernanceAggregationWindow(
                startAtMs = 1_700_420_000L,
                endAtMs = 1_700_420_111L,
                windowDays = 7
            ),
            totalRecords = 7,
            matchedRecords = 4,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_m42",
                requestCount = 3,
                resultCount = 2,
                decisionCount = 1,
                activeCrossBoundaryGovernancePortfolioId =
                    "cross_boundary_portfolio_audit_export_compliance_audit_exchange",
                activeCrossBoundaryGovernancePortfolioStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                activeDestinationTrustTier =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
                latestCrossBoundaryProgramStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramStatus.REVIEW_REQUIRED,
                latestTrustTierRolloutState =
                    com.lumi.coredomain.contract.PortfolioOptimizationTrustTierRolloutState.DEFERRED,
                latestJurisdictionRolloutState =
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutState.SPLIT_REQUIRED,
                latestPortfolioPriority =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriority.CRITICAL,
                latestPortfolioRecommendationAction =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                sharedPortfolioBlockerCount = 2,
                portfolioConflictCount = 1,
                latestGovernancePortfolioSummary =
                    "Review-required governance portfolio with shared approval contention.",
                latestTrustTierProgramSummary =
                    "High-trust rollout is deferred until shared blockers clear.",
                latestJurisdictionRolloutSummary =
                    "Jurisdiction rollout requires a split between EU GDPR and US privacy zones.",
                latestPortfolioBlockerSummary =
                    "Approval review blocks two programs across the portfolio.",
                latestPortfolioDependencySummary =
                    "EU archive advance depends on peer destination review finishing first.",
                latestPortfolioConflictSummary =
                    "Approval contention remains open across two programs.",
                latestPortfolioRecommendationSummary =
                    "Review the shared blocker before advancing the next high-trust wave.",
                topRecommendation = "Review the shared blocker before advancing the next high-trust wave.",
                summary = "M42 cross-boundary governance state restored."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 100)

        assertTrue(metricLines.any { it.contains("Portfolio governance:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("review required", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio trust tier:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("high trust", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio jurisdiction rollout:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("split required", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio blockers: 2", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio conflicts: 1", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio dependencies:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio next action:", ignoreCase = true) })
    }

    @Test
    fun metricLines_includeM43PortfolioAnalyticsRiskBudgetAndCorrectiveSignals() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1_700_430_111L,
            window = GovernanceAggregationWindow(
                startAtMs = 1_700_430_000L,
                endAtMs = 1_700_430_111L,
                windowDays = 7
            ),
            totalRecords = 9,
            matchedRecords = 5,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "portfolio_result_m43",
                requestCount = 3,
                resultCount = 2,
                decisionCount = 1,
                activePortfolioHealthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
                activePortfolioTrajectoryState =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioTrajectoryState.DRIFTING,
                activeRiskBudgetStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
                latestTrustTierDriftState =
                    com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftState.DRIFTING,
                latestJurisdictionDriftState =
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftState.DRIFTING,
                latestPortfolioRiskRecommendationAction =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
                riskBudgetBreachCount = 2,
                latestPortfolioAnalyticsSummary =
                    "Analytics detect rising reroute pressure and worsening rollout health.",
                latestTrustTierDriftSummary =
                    "Limited-trust destinations are drifting beyond expected hold rates.",
                latestJurisdictionDriftSummary =
                    "US privacy rollout is drifting behind the approved sequence.",
                latestRiskBudgetSummary =
                    "Risk budget exceeded after repeated held and blocked exchanges.",
                latestDestinationRiskConcentrationSummary =
                    "Two limited-trust destinations now carry most cross-boundary load.",
                latestPortfolioBlockerTrendSummary =
                    "Approval blockers increased from 1 to 3 across the active portfolio.",
                latestPortfolioRiskRecommendationSummary =
                    "Resequence jurisdictions and limit limited-trust rollout until drift stabilizes.",
                latestPortfolioCorrectiveActionSummary =
                    "Recorded request risk hold for the most concentrated limited-trust program.",
                summary = "M43 analytics state restored."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 24)

        assertTrue(metricLines.any { it.contains("Portfolio analytics:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("at risk", ignoreCase = true) && it.contains("drifting", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio trust-tier drift:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio jurisdiction drift:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio risk budget:", ignoreCase = true) && it.contains("breaches 2", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio destination concentration:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio blocker trend:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio risk recommendation:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio corrective action:", ignoreCase = true) })
    }

    @Test
    fun formatter_outputsReadableGovernanceLines() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1700001111L,
            window = GovernanceAggregationWindow(
                startAtMs = 1700000000L,
                endAtMs = 1700001111L,
                windowDays = 7
            ),
            totalRecords = 18,
            matchedRecords = 12,
            metricValues = listOf(
                GovernanceMetricValue(
                    key = GovernanceMetricKey.APPROVAL_DENIED_RATE_BY_ROLE,
                    numerator = 3,
                    denominator = 12,
                    rate = 0.25,
                    dimension = "role",
                    value = "buyer"
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.EXTERNAL_FULFILLMENT_ATTEMPT_RATE,
                    numerator = 7,
                    denominator = 12,
                    rate = 0.58
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.DATA_SCOPE_BLOCKED_RATE,
                    numerator = 2,
                    denominator = 12,
                    rate = 0.16
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.VERIFICATION_FAIL_RATE,
                    numerator = 2,
                    denominator = 12,
                    rate = 0.16
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.ROLLBACK_TRIGGERED_RATE,
                    numerator = 1,
                    denominator = 12,
                    rate = 0.08
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.DISPUTE_OPEN_RATE,
                    numerator = 1,
                    denominator = 12,
                    rate = 0.08
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.SNAPSHOT_BINDING_COVERAGE,
                    numerator = 11,
                    denominator = 12,
                    rate = 0.91
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.RECEIPT_TRACEABILITY_COVERAGE,
                    numerator = 12,
                    denominator = 12,
                    rate = 1.0
                )
            ),
            byRole = listOf(
                GovernanceBucketSummary(
                    bucket = "buyer",
                    runCount = 7,
                    approvalDeniedCount = 2,
                    verificationFailedCount = 1
                ),
                GovernanceBucketSummary(
                    bucket = "work",
                    runCount = 5,
                    approvalDeniedCount = 1,
                    verificationFailedCount = 1
                )
            ),
            byProvider = listOf(
                GovernanceBucketSummary(
                    bucket = "trusted-provider",
                    runCount = 6,
                    providerSelectedCount = 5,
                    providerDeniedCount = 1
                )
            )
        )

        val headline = GovernanceSummaryFormatter.headline(summary)
        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 8)
        val roleLines = GovernanceSummaryFormatter.roleLines(summary, maxItems = 2)
        val providerLines = GovernanceSummaryFormatter.providerLines(summary, maxItems = 1)

        assertTrue(headline.contains("last 7 days", ignoreCase = true))
        assertTrue(metricLines.any { it.contains("External fulfillment attempt rate", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Snapshot binding coverage", ignoreCase = true) })
        assertTrue(roleLines.first().contains("BUYER"))
        assertTrue(providerLines.first().contains("trusted-provider", ignoreCase = true))
    }

    @Test
    fun governanceCaseFormatter_outputsReadableOperatorLines() {
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_1",
                runId = "run_1",
                recordId = "record_1",
                module = ModuleId.LIX,
                status = ResponseStatus.DISPUTED,
                priority = GovernanceCasePriority.HIGH,
                primaryQueue = GovernanceQueueType.DISPUTE_FOLLOW_UP,
                queueTags = listOf(GovernanceQueueType.DISPUTE_FOLLOW_UP, GovernanceQueueType.SYNC_PENDING),
                title = "Dispute pending provider acknowledgement",
                summary = "Provider sync is pending while dispute remains open locally.",
                activeRole = UserRole.BUYER,
                providerLabel = "provider_sync",
                assigneeTeamName = "Remote Ops",
                remoteOperatorId = "op_remote_1",
                connectorDestinationLabel = "Slack Prod Ops",
                connectorDeadLetterCount = 1,
                connectorFailedCount = 1,
                settlementStatus = SettlementStatus.SYNC_PENDING,
                disputeStatus = DisputeStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                policySnapshotVersion = "role_policy_v2",
                reasonFamilies = listOf(
                    GovernanceReasonFamily.ROLLBACK_DISPUTE,
                    GovernanceReasonFamily.SETTLEMENT_RECONCILIATION
                ),
                nextActionSummary = "Retry sync and monitor provider acknowledgement.",
                workflowTemplateName = "Provider Follow-up",
                workflowStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
                workflowNextAction = "Run retry sync intent",
                workflowPolicyPackId = "pack_m21_workspace",
                workflowPolicyPackVersion = "v_m21_1",
                workflowPolicyPrecedenceSource = WorkflowPolicyPrecedenceSource.WORKSPACE_OVERRIDE,
                workflowSimulationOnly = true,
                policyPromotionStatus = com.lumi.coredomain.contract.PolicyPromotionStatus.APPROVAL_PENDING,
                policyPromotionReadiness = com.lumi.coredomain.contract.PolicyPromotionReadinessStatus.HOLD,
                policyEstateDriftSeverity = PolicyEstateDriftSeverity.HIGH,
                policyEstateBlockerCount = 2,
                policyEstateRemediationPending = true,
                policyApprovalPending = true,
                slaStatus = com.lumi.coredomain.contract.WorkflowSlaStatus.BREACHED,
                stageTimerStatus = com.lumi.coredomain.contract.WorkflowStageTimerStatus.OVERDUE,
                escalationTimerStatus = com.lumi.coredomain.contract.WorkflowEscalationTimerStatus.REQUIRED,
                automationEligibility = com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus.BLOCKED,
                scheduledRemediationStatus = ScheduledRemediationStatus.APPROVAL_REQUIRED,
                automationEligible = false,
                automationApprovalRequired = true,
                automationCooldownActive = true,
                automationSuppressed = true,
                automationMaintenanceWindowBlocked = true,
                scheduleWindowStatus = SchedulingWindowStatus.DEFERRED,
                scheduleDecision = ExecutionWindowDecision.DEFERRED,
                scheduleBlockReason = ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                scheduleWaitingMaintenance = true,
                scheduleNextEligibleAtMs = 1700002222L,
                rolloutWaveId = "wave_m28_a",
                rolloutWaveStatus = RolloutWaveStatus.CARRIED_FORWARD,
                rolloutWaveCompletionState = RolloutWaveCompletionState.CARRIED_FORWARD,
                rolloutWaveDecision = RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
                rolloutWindowEligibility = PromotionWindowEligibility.DEFERRED,
                rolloutCarryForwardPending = true,
                rolloutCrossWindowPaused = true,
                rolloutNextWindowPending = true,
                rolloutPromotionReadinessStatus = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED,
                rolloutPromotionBlockerCount = 2,
                rolloutPromotionRecommendation = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                crossWaveHealthBucket = com.lumi.coredomain.contract.WaveHealthBucket.CAUTION,
                crossWaveBlockedWaves = 1,
                crossWaveDeferredWaves = 2,
                windowDelayReason = com.lumi.coredomain.contract.WindowDelayReason.MAINTENANCE_WINDOW,
                windowDelayCount = 3,
                nextEligiblePromotionAtMs = 1700003333L,
                promotionOperationType = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                promotionOperationStatus = com.lumi.coredomain.contract.GovernanceProgramOperationStatus.SCHEDULED
            ),
            approvalSummary = "Approval denied by role policy.",
            dataScopeSummary = "Data scope reduced for policy safety.",
            providerSummary = "Provider selected then blocked by dispute.",
            verificationSummary = "Verification failed.",
            rollbackSummary = "Rollback available but not triggered.",
            settlementSummary = "Settlement sync pending.",
            disputeSummary = "Dispute opened locally.",
            reconciliationSummary = "Mismatch detected; retry scheduled.",
            syncIssueSummaries = listOf("Provider callback timeout."),
            alerts = listOf(
                GovernanceAlert(
                    code = "GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                    severity = GovernanceAlertSeverity.HIGH,
                    title = "Dispute sync pending",
                    summary = "Dispute remains open while sync is pending.",
                    count = 1,
                    relatedQueue = GovernanceQueueType.DISPUTE_FOLLOW_UP
                )
            ),
            actionSuggestions = listOf(
                GovernanceActionSuggestion(
                    action = GovernanceActionType.RETRY_SYNC_INTENT,
                    title = "Retry sync intent",
                    detail = "Request manual sync retry.",
                    enabled = true
                )
            ),
            remotePipelineSummary = RemotePipelineSummary(
                telemetryStatus = TelemetryDeliveryStatus.QUEUED,
                telemetryPendingCount = 1,
                telemetryFailedCount = 0,
                alertStatus = AlertDispatchStatus.QUEUED,
                alertPendingCount = 1,
                alertFailedCount = 0,
                reconciliationStatus = ReconciliationJobStatus.HANDOFF_PENDING,
                handoffStatus = RemoteSyncHandoffStatus.HANDOFF_PENDING,
                reconciliationOpenCount = 1,
                handoffPendingCount = 1,
                handoffFailedCount = 0,
                summary = "Telemetry queued, alert queued, reconciliation handoff pending."
            ),
            remoteDeliveryIssues = listOf(
                RemoteDeliveryIssue(
                    code = "REMOTE_RECONCILIATION_PENDING",
                    severity = GovernanceAlertSeverity.WARNING,
                    title = "Reconciliation handoff issue",
                    summary = "Remote handoff is pending for this run."
                )
            ),
            collaborationState = GovernanceCaseCollaborationState(
                runId = "run_1",
                status = OperatorCollaborationStatus.FOLLOW_UP_PENDING,
                claimStatus = OperatorCaseClaimStatus.CLAIMED,
                claimedBy = OperatorAssigneeRef(userId = "local-user", displayName = "Local Operator"),
                assignedTo = OperatorAssigneeRef(userId = "ops_triage", displayName = "Ops Triage"),
                followUp = GovernanceCaseFollowUpState(
                    requested = true,
                    requestedBy = OperatorAssigneeRef(userId = "local-user", displayName = "Local Operator"),
                    requestedAtMs = 1700001110L,
                    summary = "Provider acknowledgement still pending.",
                    ackPending = true
                ),
                notes = listOf(
                    GovernanceCaseNoteRecord(
                        noteId = "note_1",
                        actor = OperatorAssigneeRef(userId = "local-user", displayName = "Local Operator"),
                        note = "Escalated for provider callback follow-up.",
                        createdAtMs = 1700001105L
                    )
                ),
                routingActions = listOf(
                    com.lumi.coredomain.contract.GovernanceRoutingActionRecord(
                        actionId = "routing_action_1",
                        actionType = com.lumi.coredomain.contract.GovernanceRoutingActionType.ROUTE_ESCALATED,
                        actor = OperatorAssigneeRef(userId = "local-user", displayName = "Local Operator"),
                        targetType = AlertRoutingTargetType.JIRA_STUB,
                        summary = "Escalation route pushed to Jira stub.",
                        reasonCodes = listOf("ROLE_CONNECTOR_ROUTE_SELECTED"),
                        timestampMs = 1700001111L
                    )
                ),
                lastActionSummary = "Follow-up requested by operator.",
                version = 4,
                updatedAtMs = 1700001111L
            ),
            remoteOperatorHandoff = RemoteOperatorHandoffRecord(
                recordId = "handoff_1",
                runId = "run_1",
                status = RemoteOperatorHandoffStatus.ACK_PENDING,
                dedupeKey = "handoff:run_1:4:remote_operator_stub",
                request = RemoteOperatorHandoffRequest(
                    requestId = "handoff_req_1",
                    runId = "run_1",
                    caseStateVersion = 4,
                    target = "remote_operator_stub",
                    summary = "Escalate dispute handling.",
                    requestedBy = OperatorAssigneeRef(userId = "local-user", displayName = "Local Operator"),
                    dedupeKey = "handoff:run_1:4:remote_operator_stub",
                    requestedAtMs = 1700001110L
                ),
                attempts = listOf(
                    RemoteOperatorHandoffAttempt(
                        attemptId = "handoff_attempt_1",
                        status = RemoteOperatorHandoffStatus.ACK_PENDING,
                        dedupeKey = "handoff:run_1:4:remote_operator_stub",
                        summary = "Remote handoff queued and waiting acknowledgement.",
                        timestampMs = 1700001110L
                    )
                ),
                lastAttemptAtMs = 1700001110L
            ),
            alertRoutingRecords = listOf(
                AlertRoutingRecord(
                    recordId = "routing_1",
                    runId = "run_1",
                    alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    status = AlertRoutingStatus.QUEUED,
                    dedupeKey = "alert_route:run_1:GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    targets = listOf(
                        AlertRoutingTarget(
                            targetId = "webhook_stub_ops",
                            label = "Webhook Stub",
                            targetType = AlertRoutingTargetType.WEBHOOK_STUB,
                            endpointHint = "stub://webhook"
                        )
                    ),
                    attempts = listOf(
                        AlertRoutingAttempt(
                            attemptId = "routing_attempt_1",
                            targetId = "webhook_stub_ops",
                            targetType = AlertRoutingTargetType.WEBHOOK_STUB,
                            status = AlertRoutingStatus.QUEUED,
                            dedupeKey = "alert_route:run_1:GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP:webhook_stub",
                            summary = "Alert routing queued in local durable pipeline.",
                            timestampMs = 1700001110L
                        )
                    ),
                    lastAttemptAtMs = 1700001110L
                )
            ),
            connectorRoutingSummary = ConnectorRoutingSummary(
                status = AlertRoutingStatus.QUEUED,
                summary = "Connector routing queued across 3 target(s).",
                selectedTargetTypes = listOf(
                    AlertRoutingTargetType.LOCAL_CONSOLE,
                    AlertRoutingTargetType.SLACK_STUB,
                    AlertRoutingTargetType.JIRA_STUB
                ),
                reasonCodes = listOf("ROLE_CONNECTOR_ROUTE_SELECTED")
            ),
            workflowSummary = "Template Provider Follow-up · Stage waiting sync · Next Run retry sync intent",
            workflowPolicyPackSummary = "Workflow policy pack Workspace Ops Pack (v_m21_1) is simulation only.",
            workflowOverrideSummary = "Workspace override superseded tenant override.",
            workflowAutomationControlSummary = "Automation controls set to simulation-only with max runs/case 0.",
            workflowPolicyPrecedenceSource = WorkflowPolicyPrecedenceSource.WORKSPACE_OVERRIDE,
            workflowPolicyResolutionSummary = "Policy resolution used workspace override settings.",
            workflowSimulationOnly = true,
            workflowPolicySummary = "Provider follow-up policy is active.",
            workflowPolicyRolloutState = WorkflowPolicyRolloutState(
                stage = PolicyRolloutStage.STAGED,
                mode = PolicyRolloutMode.STAGED,
                target = PolicyRolloutTarget(
                    scope = PolicyRolloutScope.WORKSPACE,
                    workflowTemplateId = "wf_provider_follow_up",
                    summary = "Workspace rollout target for provider follow-up workflow."
                ),
                approvalRequirement = PolicyRolloutApprovalRequirement.REQUIRED_FOR_PROMOTION,
                approvalState = PolicyRolloutApprovalState.PENDING,
                freezeState = PolicyRolloutFreezeState.NOT_FROZEN,
                summary = "Workflow policy rollout is staged in staged mode for workspace scope.",
                policySchedulingWindow = PolicySchedulingWindow(
                    windowId = "window_m27_1",
                    windowType = SchedulingWindowType.MAINTENANCE_WINDOW,
                    status = SchedulingWindowStatus.DEFERRED,
                    timezone = "Europe/London",
                    nextEligibleAtMs = 1700002222L,
                    summary = "Rollout is waiting for maintenance window."
                ),
                calendarEvaluation = CalendarEvaluationResult(
                    decision = ExecutionWindowDecision.DEFERRED,
                    windowStatus = SchedulingWindowStatus.DEFERRED,
                    blockReason = ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                    nextEligibleAtMs = 1700002222L,
                    summary = "Rollout deferred by schedule policy."
                ),
                rolloutCalendar = RolloutCalendar(
                    calendarId = "calendar_m27_1",
                    currentWaveId = "wave_m27_a",
                    currentStage = PolicyRolloutStage.STAGED,
                    entries = listOf(
                        RolloutCalendarEntry(
                            entryId = "entry_m27_1",
                            waveId = "wave_m27_a",
                            stage = PolicyRolloutStage.STAGED,
                            status = RolloutCalendarEntryStatus.DEFERRED,
                            summary = "Staged rollout deferred until maintenance window opens."
                        )
                    ),
                    summary = "Rollout calendar deferred for staged wave."
                ),
                scheduleSummary = "Rollout is deferred by schedule policy. Waiting for maintenance window.",
                rolloutCalendarSummary = "Rollout calendar deferred for staged wave.",
                rolloutWaves = listOf(
                    RolloutWave(
                        waveId = "wave_m28_a",
                        waveIndex = 2,
                        name = "Wave 2",
                        status = RolloutWaveStatus.CARRIED_FORWARD,
                        completionState = RolloutWaveCompletionState.CARRIED_FORWARD,
                        carryForwardState = RolloutWaveCarryForwardState(
                            carryForwardEnabled = true,
                            carryForwardPending = true,
                            pendingTargets = 2,
                            nextEligibleAtMs = 1700002222L,
                            summary = "Pending wave targets carried forward."
                        ),
                        summary = "Wave 2 carried forward."
                    )
                ),
                currentRolloutWaveId = "wave_m28_a",
                currentRolloutWaveStatus = RolloutWaveStatus.CARRIED_FORWARD,
                currentRolloutWaveCompletionState = RolloutWaveCompletionState.CARRIED_FORWARD,
                calendarAwarePromotionDecision = CalendarAwarePromotionDecision(
                    promotionId = "promotion_m28_case",
                    waveId = "wave_m28_a",
                    windowEligibility = PromotionWindowEligibility.DEFERRED,
                    decisionType = RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
                    blockReason = CrossWindowHoldReason.MAINTENANCE_WINDOW,
                    nextEligibleWindow = NextEligibleWindowSummary(
                        nextEligibleAtMs = 1700002222L,
                        summary = "Next eligible window selected."
                    ),
                    summary = "Wave 2 deferred to next eligible window."
                ),
                crossWindowGovernanceControl = CrossWindowGovernanceControl(
                    controlId = "cw_m28_case",
                    scope = PolicyRolloutScope.WORKSPACE,
                    pauseState = CrossWindowPauseState.PAUSED,
                    holdReason = CrossWindowHoldReason.GOVERNANCE_PAUSE,
                    summary = "Cross-window rollout paused."
                ),
                rolloutWaveSummary = "Wave 2 carried forward to next window.",
                crossWindowGovernanceSummary = "Cross-window rollout paused by governance controls.",
                nextEligibleWindowSummary = "Next eligible window starts at 1700002222.",
                auditRecords = listOf(
                    PolicyRolloutAuditRecord(
                        auditId = "rollout_audit_1",
                        action = PolicyRolloutAuditAction.APPROVAL_REQUESTED,
                        summary = "Policy rollout approval requested.",
                        timestampMs = 1700001111L
                    )
                ),
                updatedAtMs = 1700001111L
            ),
            workflowRolloutSummary = "Workflow policy rollout is staged in staged mode for workspace scope.",
            workflowRolloutApprovalSummary = "Rollout approval is pending before risky promotion or scope expansion.",
            workflowRolloutFreezeSummary = "Rollout freeze is not active.",
            workflowRolloutRollbackSummary = "No rollout rollback was recorded.",
            rolloutWaveSummary = "Wave 2 carried forward to next window.",
            calendarAwarePromotionSummary = "Wave 2 deferred to next eligible window.",
            crossWindowGovernanceSummary = "Cross-window rollout paused by governance controls.",
            policyPromotionSummary = "Policy promotion requested for staged rollout at workspace scope.",
            policyPromotionReadinessSummary = "Promotion readiness is on hold pending 2 blocker(s).",
            policyPromotionBlockerSummary = "Promotion is waiting for approval operations to complete.; At least 3 simulation runs are required before promotion.",
            policyPromotionRecommendationSummary = "Hold promotion until evidence and approval blockers are cleared.",
            rolloutPromotionCandidate = com.lumi.coredomain.contract.RolloutPromotionCandidate(
                candidateId = "candidate_m29_1",
                waveId = "wave_m28_a",
                waveIndex = 2,
                targetScope = PolicyRolloutScope.WORKSPACE,
                windowEligibility = PromotionWindowEligibility.DEFERRED,
                nextEligibleAtMs = 1700003333L,
                summary = "Wave 2 promotion candidate deferred to the next maintenance window."
            ),
            rolloutPromotionReadiness = com.lumi.coredomain.contract.RolloutPromotionReadinessSummary(
                status = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED,
                blockers = listOf(
                    com.lumi.coredomain.contract.RolloutPromotionBlocker(
                        blockerId = "blocker_m29_approval",
                        severity = PolicyEstateDriftSeverity.HIGH,
                        summary = "Approval operations are still pending."
                    ),
                    com.lumi.coredomain.contract.RolloutPromotionBlocker(
                        blockerId = "blocker_m29_window",
                        severity = PolicyEstateDriftSeverity.MEDIUM,
                        summary = "Current maintenance window has not opened yet."
                    )
                ),
                recommendation = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                summary = "Promotion is deferred until approval and maintenance window blockers clear."
            ),
            crossWaveAnalyticsSummary = com.lumi.coredomain.contract.CrossWaveAnalyticsSummary(
                healthBucket = com.lumi.coredomain.contract.WaveHealthBucket.CAUTION,
                totalWaves = 4,
                completedWaves = 1,
                blockedWaves = 1,
                deferredWaves = 2,
                carriedForwardWaves = 1,
                carryForwardPressure = true,
                summary = "Cross-wave health is caution: 1 blocked wave, 2 deferred waves, carry-forward pressure detected."
            ),
            windowImpactSummary = com.lumi.coredomain.contract.WindowImpactSummary(
                decision = ExecutionWindowDecision.DEFERRED,
                windowStatus = SchedulingWindowStatus.DEFERRED,
                eligibility = PromotionWindowEligibility.DEFERRED,
                delayReason = com.lumi.coredomain.contract.WindowDelayReason.MAINTENANCE_WINDOW,
                nextEligibleAtMs = 1700003333L,
                blockedTargets = 2,
                summary = "Window impact deferred promotion due to maintenance window timing."
            ),
            rolloutPromotionOperation = com.lumi.coredomain.contract.RolloutPromotionOperationRecord(
                operationId = "promotion_op_m29_defer",
                type = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                status = com.lumi.coredomain.contract.GovernanceProgramOperationStatus.SCHEDULED,
                actor = OperatorAssigneeRef(userId = "ops_triage", displayName = "Ops Triage"),
                summary = "Promotion defer operation scheduled for next eligible window."
            ),
            rolloutPromotionReadinessSummary = "Rollout readiness deferred: approval pending and maintenance window unavailable.",
            crossWaveSummary = "Cross-wave analytics caution: blocked 1, deferred 2, carry-forward pressure active.",
            windowImpactReadableSummary = "Window impact delayed by maintenance window; next eligible at 1700003333.",
            rolloutPromotionOperationSummary = "Latest operation deferred promotion to the next eligible window.",
            policyEstateSummary = "Policy estate snapshot computed across tenant/workspace targets.",
            policyEstateDriftSummary = "2 drift record(s) detected · severity high.",
            policyEstateBlockerSummary = "2 active blockers remain before lifecycle progression.",
            policyEstateRemediationSummary = "Remediation is pending scheduling and acknowledgement.",
            estateAutomationSummary = "Estate automation requires approval and remains in cooldown.",
            scheduledRemediationSummary = "Scheduled remediation is approval-required and maintenance-window constrained.",
            governanceProgramOperationSummary = "1 automation operation pending approval.",
            policyEstateRemediationPlan = PolicyEstateRemediationPlan(
                status = PolicyEstateRemediationStatus.SCHEDULED,
                summary = "Schedule safe replacement adoption before retirement.",
                actions = listOf(
                    PolicyEstateRemediationActionRecord(
                        action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                        status = PolicyEstateRemediationStatus.SCHEDULED,
                        summary = "Adoption scheduling queued."
                    )
                )
            ),
            policyEstateRemediationActions = listOf(
                PolicyEstateRemediationActionRecord(
                    action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                    status = PolicyEstateRemediationStatus.SCHEDULED,
                    summary = "Adoption scheduling queued."
                )
            ),
            policyRolloutAnalytics = com.lumi.coredomain.contract.RolloutAnalyticsSummary(
                totalRuns = 4,
                simulationRuns = 2,
                approvalPendingCount = 1,
                summary = "Rollout analytics: total 4, simulation 2, pending approvals 1, denied approvals 0."
            ),
            policyApprovalReviewSummary = com.lumi.coredomain.contract.ApprovalReviewSummary(
                pendingCount = 1,
                approvedCount = 0,
                rejectedCount = 0,
                summary = "Approval queue pending 1, approved 0, rejected 0."
            ),
            slaSummary = "SLA is breached and requires escalation handling.",
            stageTimerSummary = "Stage timer is overdue for waiting sync.",
            escalationTimerSummary = "Escalation is required by workflow policy.",
            automationGuardrailSummary = "Automation blocked by workflow guardrails.",
            automationSuppressionSummary = "Automation suppressed because SLA is breached.",
            nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually.",
            workflowRun = com.lumi.coredomain.contract.OperatorWorkflowRun(
                runId = "run_1",
                templateId = "wf_provider_follow_up",
                templateName = "Provider Follow-up",
                status = com.lumi.coredomain.contract.OperatorWorkflowRunStatus.ACTIVE,
                currentStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
                stageHistory = listOf(
                    com.lumi.coredomain.contract.OperatorWorkflowStageRecord(
                        stage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_PROVIDER,
                        status = com.lumi.coredomain.contract.OperatorWorkflowStepStatus.COMPLETED,
                        summary = "Provider callback triage finished.",
                        enteredAtMs = 1700001100L
                    ),
                    com.lumi.coredomain.contract.OperatorWorkflowStageRecord(
                        stage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
                        status = com.lumi.coredomain.contract.OperatorWorkflowStepStatus.IN_PROGRESS,
                        summary = "Waiting for sync acknowledgement.",
                        enteredAtMs = 1700001110L
                    )
                ),
                nextAction = com.lumi.coredomain.contract.WorkflowNextActionSuggestion(
                    title = "Run retry sync intent",
                    detail = "Request manual sync retry and monitor reconciliation ack.",
                    action = GovernanceActionType.RETRY_SYNC_INTENT,
                    automationEligible = true
                ),
                updatedAtMs = 1700001111L
            ),
            latestCollaborationEvent = com.lumi.coredomain.contract.GovernanceCollaborationEventRecord(
                eventId = "collab_event_1",
                type = com.lumi.coredomain.contract.GovernanceCollaborationEventType.WORKFLOW_STAGE_CHANGED,
                actor = com.lumi.coredomain.contract.GovernanceCollaborationActor(
                    actorId = "local-user",
                    displayName = "Local Operator",
                    source = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.HUMAN_OPERATOR
                ),
                summary = "Workflow stage updated to waiting sync.",
                reasonCodes = listOf("ROLE_WORKFLOW_STAGE_CHANGED"),
                workflowStage = com.lumi.coredomain.contract.OperatorWorkflowStage.WAITING_SYNC,
                timestampMs = 1700001111L
            ),
            latestAutomationAudit = com.lumi.coredomain.contract.RemoteOpsAutomationAuditRecord(
                auditId = "automation_audit_1",
                ruleId = "auto_sync_pending",
                trigger = com.lumi.coredomain.contract.RemoteOpsAutomationTrigger.SYNC_PENDING,
                action = GovernanceActionType.RETRY_SYNC_INTENT,
                status = com.lumi.coredomain.contract.RemoteOpsAutomationDecisionStatus.EXECUTED,
                summary = "Automation executed retry sync intent for sync pending trigger.",
                source = com.lumi.coredomain.contract.GovernanceCollaborationActionSource.LOCAL_AUTOMATION,
                reasonCodes = listOf("ROLE_AUTOMATION_ACTION_EXECUTED"),
                timestampMs = 1700001112L
            ),
            connectorHealthSummary = com.lumi.coredomain.contract.ConnectorHealthSummary(
                overallStatus = "degraded",
                healthyTargets = 1,
                degradedTargets = 2,
                deadLetterTargets = 1,
                unavailableTargets = 1,
                lastUpdatedAtMs = 1700001111L
            ),
            deadLetterSummary = "1 connector dead-letter event(s) recorded across slack.",
            remoteOperatorIdentity = RemoteOperatorIdentity(
                operatorId = "op_remote_1",
                displayName = "Remote Operator One",
                teamId = "team_remote_ops",
                directorySource = RemoteOperatorDirectorySource.REMOTE_CACHE
            ),
            remoteOperatorTeam = RemoteOperatorTeam(
                teamId = "team_remote_ops",
                displayName = "Remote Ops",
                slug = "remote-ops"
            ),
            connectorDestinationSummary = "slack -> Slack Prod Ops",
            connectorAuthProfileSummary = "slack auth oauth_bot (configured)",
            directorySyncSummary = "Directory sync is stale; local fallback guardrails are active.",
            sessionAuthProvenanceSummary = "Authority: local fallback policy · Session stale · Local fallback applied",
            connectorCredentialSummary = "Credential rotation is required for at least one connector target.",
            enterpriseIdentitySummary = "Enterprise identity assertion captured from Okta.",
            enterpriseSessionSummary = "Enterprise session sso stale fallback via okta.",
            idpProviderSummary = "IdP provider exchange fallback allowed by rollout control.",
            scimDirectorySummary = "SCIM webhook update processed with stale cache fallback.",
            scimProviderSummary = "SCIM provider stale soft with degraded freshness guardrails.",
            vaultCredentialSummary = "Vault lease expired; credential refresh is required.",
            vaultProviderSummary = "Vault provider materialization degraded; route stayed local-first.",
            rolloutSummary = "Enterprise rollout stage canary with guarded allowlist.",
            cutoverReadinessSummary = "Cutover readiness blocked by directory stale signals.",
            vaultRuntimeSummary = "Vault runtime degraded until lease renewal completes.",
            enterpriseFallbackSummary = "Local-first fallback remains active for blocked connector routes.",
            remoteAuthorizationSummary = "Remote authorization allowed by directory policy.",
            enterpriseAuthIntegration = EnterpriseAuthIntegrationSummary(
                identityAssertion = EnterpriseIdentityAssertion(
                    assertionId = "assertion_1",
                    idpProvider = EnterpriseIdpProvider.OKTA,
                    subjectId = "ent_user_1",
                    summary = "Enterprise identity assertion captured from Okta."
                ),
                sessionProvenance = EnterpriseSessionProvenance.SSO_STALE_FALLBACK,
                directorySync = DirectorySyncSnapshot(
                    snapshotId = "dir_sync_1",
                    source = EnterpriseDirectorySource.ENTERPRISE_DIRECTORY_CACHE,
                    status = DirectorySyncStatus.STALE,
                    errorState = DirectorySyncErrorState.RATE_LIMITED,
                    summary = "Directory sync is stale; local fallback guardrails are active."
                ),
                directoryUpdate = DirectorySyncUpdate(
                    updateId = "scim_update_1",
                    updateType = DirectorySyncUpdateType.SCIM_WEBHOOK,
                    status = DirectorySyncStatus.STALE,
                    errorState = DirectorySyncErrorState.RATE_LIMITED,
                    summary = "SCIM webhook update processed with stale cache fallback."
                ),
                directoryErrorState = DirectorySyncErrorState.RATE_LIMITED,
                credentialBinding = ConnectorCredentialBinding(
                    bindingId = "binding_slack_prod",
                    destinationId = "dest_slack_prod",
                    authProfileId = "auth_slack_prod",
                    blockReason = CredentialRouteBlockReason.VAULT_LEASE_EXPIRED,
                    vaultCredential = VaultCredentialReference(
                        vaultProvider = "hashicorp_vault",
                        vaultPath = "secret/connectors/slack/prod",
                        status = VaultCredentialStatus.LEASE_EXPIRED,
                        rotationState = VaultCredentialRotationState.SCHEDULED,
                        summary = "Vault lease expired; credential refresh is required."
                    ),
                    summary = "Route blocked until vault lease is renewed."
                ),
                summary = "Enterprise session stale fallback with vault lease-expired route block."
            ),
            lastRemoteAuthorization = RemoteAuthorizationResult(
                status = RemoteAuthorizationStatus.ALLOWED,
                allowed = true,
                operatorId = "op_remote_1",
                teamId = "team_remote_ops",
                reason = "Remote authorization allowed by directory policy."
            ),
            operatorConnectorAudit = OperatorConnectorAuditLink(
                operatorUserId = "ops_triage",
                operatorDisplayName = "Ops Triage",
                operatorTeamId = "team_remote_ops",
                remoteOperatorId = "op_remote_1",
                destinationId = "dest_slack_prod",
                authProfileId = "auth_slack_prod",
                routeBindingId = "binding_slack_prod",
                authorizationStatus = RemoteAuthorizationStatus.ALLOWED,
                summary = "Operator Ops Triage routed follow-up to Slack Prod Ops (auth allowed)."
            ),
            timeline = listOf(
                com.lumi.coredomain.contract.OperatorCaseTimelineItem(
                    timelineId = "timeline_1",
                    type = com.lumi.coredomain.contract.OperatorCaseTimelineItemType.OPERATOR_ACTION,
                    title = "Operator claimed case",
                    detail = "Case claimed by Ops Triage.",
                    timestampMs = 1700001112L,
                    severity = GovernanceAlertSeverity.INFO
                )
            )
        )
        val console = GovernanceConsoleState(
            filter = GovernanceConsoleFilter(queueType = GovernanceQueueType.DISPUTE_FOLLOW_UP, includeReviewed = false),
            totalRecords = 3,
            matchedCases = 1,
            highPriorityCases = 1,
            queueCounts = listOf(
                GovernanceQueueCount(
                    queue = GovernanceQueueType.DISPUTE_FOLLOW_UP,
                    count = 1,
                    highPriorityCount = 1
                )
            ),
            alerts = case.alerts,
            cases = listOf(case)
        )

        val headline = GovernanceCaseFormatter.consoleHeadline(console)
        val caseLine = GovernanceCaseFormatter.caseLine(case.summary)
        val detailLines = GovernanceCaseFormatter.detailLines(case, maxItems = 160)
        val alertLine = GovernanceCaseFormatter.alertLine(case.alerts.first())
        val searchable = GovernanceCaseFormatter.caseSearchableText(case)

        assertTrue(headline.contains("Cases", ignoreCase = true))
        assertTrue(caseLine.contains("dead-letter", ignoreCase = true))
        assertTrue(caseLine.contains("provider_sync", ignoreCase = true))
        assertTrue(caseLine.contains("stage waiting sync", ignoreCase = true))
        assertTrue(caseLine.contains("pack", ignoreCase = true))
        assertTrue(
            caseLine.contains("estate drift high", ignoreCase = true) ||
                detailLines.any { it.contains("Policy estate drift severity:", ignoreCase = true) }
        )
        assertTrue(case.summary.workflowSimulationOnly)
        assertTrue(caseLine.contains("sla breached", ignoreCase = true))
        assertTrue(
            caseLine.contains("scheduled approval required", ignoreCase = true) ||
                detailLines.any { it.contains("Scheduled remediation status: approval required", ignoreCase = true) }
        )
        assertTrue(
            caseLine.contains("schedule deferred", ignoreCase = true) ||
                detailLines.any { it.contains("Schedule decision: deferred", ignoreCase = true) }
        )
        assertTrue(
            caseLine.contains("automation", ignoreCase = true) ||
                detailLines.any { it.contains("Automation eligibility:", ignoreCase = true) }
        )
        assertTrue(detailLines.any { it.contains("Settlement:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Dispute:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Remote pipeline:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Remote issue:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow template:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow policy pack:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow precedence source:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow simulation mode:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow stage:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow next action:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("SLA status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Stage timer status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Escalation timer status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Automation eligibility:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow policy:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow policy pack summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow override summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow automation controls:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow precedence summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow rollout state:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow rollout approval summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow rollout freeze summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow rollout rollback summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy promotion status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy promotion readiness:", ignoreCase = true) })
        assertTrue(
            caseLine.contains("rollout readiness deferred", ignoreCase = true) ||
                detailLines.any { it.contains("Rollout promotion readiness:", ignoreCase = true) }
        )
        assertTrue(detailLines.any { it.contains("Rollout promotion blockers:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout promotion recommendation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cross-wave health:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cross-wave counts:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Window delay reason:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Window delay count:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Next eligible promotion at:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Promotion operation type:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Promotion operation status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout promotion readiness summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cross-wave summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Window impact summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Promotion operation summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Promotion candidate:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Latest promotion operation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy promotion summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy blockers:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy recommendation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy estate drift severity:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy estate blockers:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy estate remediation pending:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy estate summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy estate remediation status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Estate automation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Scheduled remediation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Governance operations:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Automation approval required: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Automation cooldown active: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Automation suppressed: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Automation maintenance window blocked: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Schedule window status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Schedule decision:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Schedule block reason:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Schedule waiting maintenance window: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Schedule next eligible at:", ignoreCase = true) })
        assertTrue(
            caseLine.contains("rollout wave carried forward", ignoreCase = true) ||
                detailLines.any { it.contains("Rollout wave status: carried forward", ignoreCase = true) }
        )
        assertTrue(detailLines.any { it.contains("Rollout wave completion:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout wave decision:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout window eligibility:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout carry-forward pending: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cross-window rollout paused: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout next window pending: yes", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout wave summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Promotion window summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cross-window governance:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow rollout schedule:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow rollout calendar:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Workflow schedule decision:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout analytics:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy approval review:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("SLA:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Stage timer:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Escalation timer:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Automation guardrail:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Required human action:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Latest collaboration:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Latest automation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Collaboration:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Routing action:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Remote handoff:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Alert routing:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Connector health:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Dead-letter:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Connector routing:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Assignee team:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Remote operator:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Remote auth:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Directory sync summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Auth provenance:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Credential health:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Enterprise identity:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Enterprise session:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("IdP provider:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("SCIM sync:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("SCIM provider:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Vault credential:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Vault provider:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Rollout control:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cutover readiness:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Vault runtime:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Fallback policy:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Timeline:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Connector destination:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Connector auth profile:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Connector audit:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("slack stub", ignoreCase = true) })
        assertTrue(alertLine.contains("Dispute sync pending", ignoreCase = true))
        assertTrue(searchable.contains("run_1", ignoreCase = true))
        assertTrue(searchable.contains("handoff pending", ignoreCase = true))
        assertTrue(searchable.contains("provider follow-up", ignoreCase = true))
        assertTrue(searchable.contains("waiting_sync", ignoreCase = true))
        assertTrue(searchable.contains("workspace ops pack", ignoreCase = true))
        assertTrue(searchable.contains("workspace override superseded tenant override", ignoreCase = true))
        assertTrue(searchable.contains("waiting_maintenance_window", ignoreCase = true))
        assertTrue(searchable.contains("deferred", ignoreCase = true))
        assertTrue(searchable.contains("wave_m28_a", ignoreCase = true))
        assertTrue(searchable.contains("carried_forward", ignoreCase = true))
        assertTrue(searchable.contains("defer_to_next_window", ignoreCase = true))
        assertTrue(searchable.contains("cross-window rollout paused", ignoreCase = true))
        assertTrue(searchable.contains("rollout readiness deferred", ignoreCase = true))
        assertTrue(searchable.contains("cross-wave", ignoreCase = true))
        assertTrue(searchable.contains("window impact", ignoreCase = true))
        assertTrue(searchable.contains("deferred promotion", ignoreCase = true))
        assertTrue(searchable.contains("simulation only", ignoreCase = true))
        assertTrue(searchable.contains("approval_pending", ignoreCase = true))
        assertTrue(searchable.contains("policy estate snapshot computed", ignoreCase = true))
        assertTrue(searchable.contains("high", ignoreCase = true))
        assertTrue(searchable.contains("remediation is pending", ignoreCase = true))
        assertTrue(searchable.contains("APPROVAL_REQUIRED", ignoreCase = true))
        assertTrue(searchable.contains("true", ignoreCase = true))
        assertTrue(searchable.contains("promotion readiness is on hold", ignoreCase = true))
        assertTrue(searchable.contains("hold promotion until evidence", ignoreCase = true))
        assertTrue(searchable.contains("rollout analytics: total 4", ignoreCase = true))
        assertTrue(searchable.contains("sla is breached", ignoreCase = true))
        assertTrue(searchable.contains("automation blocked", ignoreCase = true))
        assertTrue(searchable.contains("automation executed retry sync intent", ignoreCase = true))
        assertTrue(searchable.contains("ops triage", ignoreCase = true))
        assertTrue(searchable.contains("jira_stub", ignoreCase = true))
        assertTrue(searchable.contains("remote authorization", ignoreCase = true))
        assertTrue(searchable.contains("local fallback policy", ignoreCase = true))
        assertTrue(searchable.contains("credential rotation", ignoreCase = true))
        assertTrue(searchable.contains("okta", ignoreCase = true))
        assertTrue(searchable.contains("scim", ignoreCase = true))
        assertTrue(searchable.contains("idp provider exchange fallback allowed", ignoreCase = true))
        assertTrue(searchable.contains("scim provider stale soft", ignoreCase = true))
        assertTrue(searchable.contains("vault lease expired", ignoreCase = true))
        assertTrue(searchable.contains("vault provider materialization degraded", ignoreCase = true))
        assertTrue(searchable.contains("rollout stage canary", ignoreCase = true))
        assertTrue(searchable.contains("cutover readiness blocked", ignoreCase = true))
        assertTrue(searchable.contains("vault runtime degraded", ignoreCase = true))
        assertTrue(searchable.contains("local-first fallback", ignoreCase = true))
        assertTrue(searchable.contains("dest_slack_prod", ignoreCase = true))
    }

    @Test
    fun governanceCaseFormatter_includesM30ProgramCoordinationSignals() {
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_m30",
                runId = "run_m30",
                recordId = "record_m30",
                module = ModuleId.LIX,
                status = ResponseStatus.WAITING_USER,
                priority = GovernanceCasePriority.HIGH,
                primaryQueue = GovernanceQueueType.NEEDS_ATTENTION,
                title = "Program coordination requires defer and escalation",
                summary = "Lower-priority rollout deferred due to dependency and contention.",
                activeRole = UserRole.WORK,
                programPriority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                programCoordinationState = com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
                programDecisionReason = com.lumi.coredomain.contract.RolloutProgramDecisionReason.DEPENDENCY_BLOCK,
                programContentionType = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                programContentionLevel = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                programEscalationStatus = com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
                programDependencyBlockedCount = 1,
                programConflictCount = 1,
                programDeferredCount = 2
            ),
            programCoordination = com.lumi.coredomain.contract.RolloutProgramCoordinationRecord(
                programId = "program_beta",
                programName = "Program Beta",
                priority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                coordinationState = com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
                summary = "Program beta deferred by dependency and contention."
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
            programCoordinationSummary = "Program beta deferred by dependency and contention.",
            crossProgramSummary = "Cross-program contention remains high; escalation open.",
            programEscalationSummary = "Escalation opened after repeated defer."
        )

        val caseLine = GovernanceCaseFormatter.caseLine(case.summary)
        val detailLines = GovernanceCaseFormatter.detailLines(case, maxItems = 40)
        val searchable = GovernanceCaseFormatter.caseSearchableText(case)

        assertTrue(caseLine.contains("program priority high", ignoreCase = true))
        assertTrue(caseLine.contains("coordination deferred", ignoreCase = true))
        assertTrue(detailLines.any { it.contains("Program priority:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program coordination state:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program decision reason:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program contention type:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program contention level:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program escalation status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program coordination summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Cross-program summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Program escalation summary:", ignoreCase = true) })
        assertTrue(searchable.contains("deferred", ignoreCase = true))
        assertTrue(searchable.contains("dependency_block", ignoreCase = true))
        assertTrue(searchable.contains("window", ignoreCase = true))
        assertTrue(searchable.contains("cross-program contention remains high", ignoreCase = true))
    }

    @Test
    fun governanceCaseFormatter_includesM31CapacityAndBalancingSignals() {
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_m31",
                runId = "run_m31",
                recordId = "record_m31",
                module = ModuleId.LIX,
                status = ResponseStatus.WAITING_USER,
                priority = GovernanceCasePriority.HIGH,
                primaryQueue = GovernanceQueueType.NEEDS_ATTENTION,
                title = "Approval capacity is saturated and policy approval is still required",
                summary = "Capacity and policy both block promotion progression.",
                activeRole = UserRole.WORK,
                capacityPoolKey = "workspace_finance",
                approvalLoadBucket = ApprovalLoadBucket.SATURATED,
                capacityDeferralReason = ApprovalDeferralReason.QUEUE_SATURATED,
                balancingDecisionType = ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
                capacityBlocked = true,
                policyBlocked = true,
                approvalQueueSaturated = true,
                criticalCapacityReserved = true,
                portfolioBottleneck = true
            ),
            approvalLoadSummary = "Approval queue is saturated for workspace_finance.",
            capacityBlockSummary = "Capacity blocked by approval slot limits.",
            policyBlockSummary = "Policy gate still requires explicit approval.",
            capacityBalancingSummary = "Balancing deferred this run and reassigned lower-priority approvals.",
            portfolioCapacitySummary = "Portfolio bottleneck detected across active programs."
        )

        val caseLine = GovernanceCaseFormatter.caseLine(case.summary)
        val detailLines = GovernanceCaseFormatter.detailLines(case, maxItems = 50)
        val searchable = GovernanceCaseFormatter.caseSearchableText(case)

        assertTrue(caseLine.contains("capacity pool workspace_finance", ignoreCase = true))
        assertTrue(caseLine.contains("load saturated", ignoreCase = true))
        assertTrue(caseLine.contains("capacity blocked", ignoreCase = true))
        assertTrue(caseLine.contains("policy blocked", ignoreCase = true))
        assertTrue(detailLines.any { it.contains("Approval load bucket: saturated", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Capacity deferral reason: capacity saturated", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Capacity block summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Policy block summary:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio capacity summary:", ignoreCase = true) })
        assertTrue(searchable.contains("workspace_finance", ignoreCase = true))
        assertTrue(searchable.contains("capacity blocked", ignoreCase = true))
        assertTrue(searchable.contains("policy blocked", ignoreCase = true))
    }

    @Test
    fun governanceCaseFormatter_includesM43PortfolioAnalyticsRiskBudgetAndCorrectiveSignals() {
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_m43",
                runId = "run_m43",
                recordId = "record_m43",
                module = ModuleId.LIX,
                status = ResponseStatus.WAITING_USER,
                priority = GovernanceCasePriority.HIGH,
                primaryQueue = GovernanceQueueType.NEEDS_ATTENTION,
                title = "Portfolio risk budget is breached and drift is worsening",
                summary = "Cross-boundary rollout needs resequencing and a bounded risk hold.",
                activeRole = UserRole.WORK,
                portfolioGovernanceHealthStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
                portfolioRiskBudgetStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
                portfolioTrustTierDriftState =
                    com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftState.DRIFTING,
                portfolioJurisdictionDriftState =
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftState.DRIFTING,
                portfolioRiskRecommendationAction =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
                portfolioCorrectiveActionType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
                portfolioRiskBudgetBreached = true,
                portfolioGovernanceAnalyticsSummary =
                    "Analytics detect rising reroute pressure and worsening rollout health.",
                portfolioTrustTierDriftSummary =
                    "Limited-trust destinations are drifting beyond expected hold rates.",
                portfolioJurisdictionDriftSummary =
                    "US privacy rollout is drifting behind the approved sequence.",
                portfolioRiskBudgetSummary =
                    "Risk budget exceeded after repeated held and blocked exchanges.",
                portfolioDestinationRiskConcentrationSummary =
                    "Two limited-trust destinations now carry most cross-boundary load.",
                portfolioBlockerTrendSummary =
                    "Approval blockers increased from 1 to 3 across the active portfolio.",
                portfolioRiskRecommendationSummary =
                    "Resequence jurisdictions and limit limited-trust rollout until drift stabilizes.",
                portfolioCorrectiveActionSummary =
                    "Recorded request risk hold for the most concentrated limited-trust program."
            )
        )

        val caseLine = GovernanceCaseFormatter.caseLine(case.summary)
        val detailLines = GovernanceCaseFormatter.detailLines(case, maxItems = 40)
        val searchable = GovernanceCaseFormatter.caseSearchableText(case)

        assertTrue(caseLine.contains("portfolio at risk", ignoreCase = true))
        assertTrue(caseLine.contains("risk budget exceeded", ignoreCase = true))
        assertTrue(caseLine.contains("trust drift drifting", ignoreCase = true))
        assertTrue(detailLines.any { it.contains("Portfolio health status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio risk budget status:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio risk budget breached:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio trust-tier drift:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio jurisdiction drift:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio risk budget:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio destination concentration:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio blocker trend:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio risk recommendation:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio corrective action:", ignoreCase = true) })
        assertTrue(searchable.contains("split_jurisdiction_lane", ignoreCase = true))
        assertTrue(searchable.contains("request_risk_hold", ignoreCase = true))
        assertTrue(searchable.contains("risk budget exceeded", ignoreCase = true))
    }

    @Test
    fun formatterAndCaseFormatter_includeM44PortfolioSafetyGuardrailAndRemediationSignals() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(windowDays = 7),
            generatedAtMs = 1_700_440_000_100L,
            window = GovernanceAggregationWindow(
                startAtMs = 1_700_440_000_000L,
                endAtMs = 1_700_440_000_100L,
                windowDays = 7
            ),
            totalRecords = 4,
            matchedRecords = 2,
            portfolioOptimizationSummary = PortfolioOptimizationSummary(
                latestResultId = "result_m44",
                topRecommendation = "Throttle broader rollout while safety rails normalize.",
                activePortfolioSafetyState =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.GUARDED,
                activeBudgetGuardrailState =
                    com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
                activePortfolioEnforcementMode =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                activeRemediationAutomationState =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState.THROTTLED,
                remediationApprovalRequiredCount = 1,
                latestPortfolioSafetySummary =
                    "Portfolio safety is guarded with soft-stop enforcement.",
                latestPortfolioSafetyRailSummary =
                    "Risk budget guardrail requires a bounded soft-stop before broader rollout.",
                latestBudgetGuardrailSummary =
                    "Budget soft-stop remains active until risk pressure falls.",
                latestRemediationAutomationSummary =
                    "Remediation automation is throttled while blockers stabilize.",
                summary = "M44 safety summary."
            )
        )

        val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 12)

        assertTrue(metricLines.any { it.contains("Portfolio safety:", ignoreCase = true) && it.contains("guarded", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio guardrail:", ignoreCase = true) && it.contains("soft stop", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio safety rail:", ignoreCase = true) })
        assertTrue(metricLines.any { it.contains("Portfolio remediation:", ignoreCase = true) && it.contains("throttled", ignoreCase = true) })

        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_m44",
                runId = "run_m44",
                recordId = "record_m44",
                module = ModuleId.LIX,
                status = ResponseStatus.WAITING_USER,
                priority = GovernanceCasePriority.HIGH,
                primaryQueue = GovernanceQueueType.NEEDS_ATTENTION,
                title = "Portfolio safety rails are active",
                summary = "Cross-boundary rollout is guarded by budget and remediation controls.",
                activeRole = UserRole.WORK,
                portfolioSafetyState =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState.GUARDED,
                portfolioBudgetGuardrailState =
                    com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
                portfolioEnforcementMode =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                portfolioRemediationAutomationState =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState.THROTTLED,
                portfolioQuarantined = false,
                portfolioRemediationApprovalRequired = true,
                portfolioSafetySummary =
                    "Portfolio safety is guarded with soft-stop enforcement.",
                portfolioSafetyRailSummary =
                    "Risk budget guardrail requires a bounded soft-stop before broader rollout.",
                portfolioBudgetGuardrailSummary =
                    "Budget soft-stop remains active until risk pressure falls.",
                portfolioRemediationAutomationSummary =
                    "Remediation automation is throttled while blockers stabilize."
            )
        )

        val caseLine = GovernanceCaseFormatter.caseLine(case.summary)
        val detailLines = GovernanceCaseFormatter.detailLines(case, maxItems = 30)
        val searchable = GovernanceCaseFormatter.caseSearchableText(case)

        assertTrue(caseLine.contains("safety guarded", ignoreCase = true))
        assertTrue(caseLine.contains("guardrail soft stop", ignoreCase = true))
        assertTrue(caseLine.contains("remediation throttled", ignoreCase = true))
        assertTrue(detailLines.any { it.contains("Portfolio safety state:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio budget guardrail state:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio enforcement mode:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio remediation automation state:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio remediation approval required:", ignoreCase = true) })
        assertTrue(detailLines.any { it.contains("Portfolio safety rail:", ignoreCase = true) })
        assertTrue(searchable.contains("soft_stop", ignoreCase = true))
        assertTrue(searchable.contains("throttled", ignoreCase = true))
    }
}

package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.ExecutionReceipt
import com.lumi.coredomain.contract.ExternalApprovalSummary
import com.lumi.coredomain.contract.ExternalDataScopeSummary
import com.lumi.coredomain.contract.ExternalDisputeSummary
import com.lumi.coredomain.contract.ExternalSettlementSummary
import com.lumi.coredomain.contract.ExternalVerificationSummary
import com.lumi.coredomain.contract.MarketplaceReconciliationSummary
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.PolicyRolloutApprovalState
import com.lumi.coredomain.contract.PolicyRolloutFreezeState
import com.lumi.coredomain.contract.PolicyRolloutMode
import com.lumi.coredomain.contract.PolicyRolloutScope
import com.lumi.coredomain.contract.PolicyRolloutStage
import com.lumi.coredomain.contract.PolicyPromotionReadinessStatus
import com.lumi.coredomain.contract.PolicyPromotionRecommendation
import com.lumi.coredomain.contract.PolicyPromotionRecommendationType
import com.lumi.coredomain.contract.PolicyPromotionStatus
import com.lumi.coredomain.contract.PolicyPromotionTarget
import com.lumi.coredomain.contract.EstateAutomationRule
import com.lumi.coredomain.contract.EstateAutomationEligibility
import com.lumi.coredomain.contract.EstateAutomationEligibilityStatus
import com.lumi.coredomain.contract.AutomationApprovalRequirement
import com.lumi.coredomain.contract.AutomationApprovalDecision
import com.lumi.coredomain.contract.ScheduledRemediationPlan
import com.lumi.coredomain.contract.ScheduledRemediationStatus
import com.lumi.coredomain.contract.ScheduledRemediationTarget
import com.lumi.coredomain.contract.GovernanceProgramOperation
import com.lumi.coredomain.contract.GovernanceProgramOperationStatus
import com.lumi.coredomain.contract.AutomationReplaySummary
import com.lumi.coredomain.contract.AutomationCancellationRecord
import com.lumi.coredomain.contract.GovernanceActionType
import com.lumi.coredomain.contract.OperatorAssigneeRef
import com.lumi.coredomain.contract.PolicyEstateDriftRecord
import com.lumi.coredomain.contract.PolicyEstateDriftSeverity
import com.lumi.coredomain.contract.PolicyEstateDriftType
import com.lumi.coredomain.contract.PolicyEstateRemediationActionRecord
import com.lumi.coredomain.contract.PolicyEstateRemediationActionType
import com.lumi.coredomain.contract.PolicyEstateRemediationPlan
import com.lumi.coredomain.contract.PolicyEstateRemediationStatus
import com.lumi.coredomain.contract.PolicyEstateSnapshot
import com.lumi.coredomain.contract.PolicyGovernanceProgram
import com.lumi.coredomain.contract.PolicyGovernanceProgramStatus
import com.lumi.coredomain.contract.PolicyGovernanceProgramWave
import com.lumi.coredomain.contract.PolicyGovernanceWaveStatus
import com.lumi.coredomain.contract.PromotionReadinessResult
import com.lumi.coredomain.contract.ProviderDecisionStatus
import com.lumi.coredomain.contract.ProviderPolicyDecision
import com.lumi.coredomain.contract.ProviderSelectionSummary
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.RolloutAnalyticsSummary
import com.lumi.coredomain.contract.SettlementReconciliationResult
import com.lumi.coredomain.contract.SettlementStatus
import com.lumi.coredomain.contract.SettlementSyncState
import com.lumi.coredomain.contract.UserRole
import com.lumi.coredomain.contract.CrossTenantRolloutSummary
import com.lumi.coredomain.contract.CrossTenantRolloutReadinessStatus
import com.lumi.coredomain.contract.WorkflowPolicyPackLifecycleStatus
import com.lumi.coredomain.contract.WorkflowPolicyPackReplacementPlan
import com.lumi.coredomain.contract.WorkflowAutomationEligibilityStatus
import com.lumi.coredomain.contract.WorkflowEscalationTimerStatus
import com.lumi.coredomain.contract.WorkflowPolicyPrecedenceSource
import com.lumi.coredomain.contract.WorkflowSlaStatus
import com.lumi.coredomain.contract.WorkflowStageTimerStatus
import com.lumi.coredomain.contract.ApprovalReviewSummary
import com.lumi.coredomain.contract.WorkflowPolicyRolloutState
import com.lumi.coredomain.contract.PolicyRolloutTarget
import com.lumi.coredomain.contract.PolicySchedulingWindow
import com.lumi.coredomain.contract.SchedulingWindowType
import com.lumi.coredomain.contract.SchedulingWindowStatus
import com.lumi.coredomain.contract.CalendarEvaluationResult
import com.lumi.coredomain.contract.ExecutionWindowDecision
import com.lumi.coredomain.contract.ExecutionWindowBlockReason
import com.lumi.coredomain.contract.PortfolioDriftSeverity
import com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus
import com.lumi.coredomain.contract.RolloutCalendar
import com.lumi.coredomain.contract.RolloutCalendarEntry
import com.lumi.coredomain.contract.RolloutCalendarEntryStatus
import com.lumi.coredomain.contract.RolloutWaveCompletionState
import com.lumi.coredomain.contract.RolloutWaveDecisionType
import com.lumi.coredomain.contract.RolloutWaveStatus
import com.lumi.coredomain.contract.PromotionWindowEligibility
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ExecutionReceiptFormatterTest {

    @Test
    fun headline_usesReceiptRoleAndSource() {
        val response = response(
            executionReceipt = receipt(
                activeRole = UserRole.WORK,
                roleSource = RoleSource.TASK_INHERITED
            )
        )

        val headline = ExecutionReceiptFormatter.headline(response)

        assertEquals("Running as Work role (Source: Task inherited)", headline)
    }

    @Test
    fun summaryLines_includeMaterialFailureSignals() {
        val response = response(
            executionReceipt = receipt(
                roleImpactSummary = "Approval required by role policy",
                approvalSummary = "Approval denied by role policy",
                dataScopeSummary = "Data scope blocked by role policy",
                providerSummary = "Provider blocked by role policy",
                quoteSummary = "Collected 3 quotes; provider denied by policy fit",
                verificationSummary = "Verification failed due to proof mismatch",
                proofSummary = "Proof artifacts captured with verification links",
                rollbackSummary = "Rollback available under policy terms",
                issueSummary = "Dispute opened for provider breach"
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 10)

        assertTrue(lines.any { it.contains("Approval denied", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Data scope blocked", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Provider blocked", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Collected 3 quotes", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Verification failed", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Rollback available", ignoreCase = true) })
    }

    @Test
    fun summaryLines_andExport_includePortfolioLearningDriftAndTuningSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioObjectiveProfileSnapshotId = "profile_snapshot_m35_v3",
                portfolioObjectiveProfileScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                portfolioObjectiveProfileProvenance = com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileProvenanceType.PROPAGATED,
                portfolioObjectiveProfileSummary = "Workspace profile propagated from a user-scoped tuning snapshot.",
                portfolioLearningSummary = "Outcome recorded after selecting calibrated schedule.",
                portfolioDriftSummary = "High drift detected across approval latency and risk incidents.",
                portfolioDriftSeverity = PortfolioDriftSeverity.HIGH,
                portfolioTuningSummary = "Applied risk incident tuning to snapshot v2.",
                portfolioTuningStatus = PortfolioOptimizationTuningStatus.APPLIED,
                portfolioPropagationSummary = "Workspace promotion pending tenant approval after drift review.",
                portfolioPropagationStatus = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.REVIEW_REQUIRED,
                portfolioPropagationReviewRequired = true
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 12)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio objective profile:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("workspace", ignoreCase = true) && it.contains("propagated", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio learning:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio drift:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("high", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio tuning:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio propagation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("review required", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_objective_profile=workspace", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_objective_profile_scope=workspace", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_objective_profile_provenance=propagated", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_learning=Outcome recorded after selecting calibrated schedule", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_drift=High drift detected across approval latency and risk incidents", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_drift_severity=high", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_tuning=Applied risk incident tuning to snapshot v2", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_tuning_status=applied", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_propagation=Workspace promotion pending tenant approval after drift review", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_propagation_status=review required", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_propagation_review_required=true", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includePortfolioLearningSyncSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioObjectiveProfileSnapshotId = "profile_snapshot_m36_v1",
                portfolioObjectiveProfileScope = com.lumi.coredomain.contract.PortfolioOptimizationLearningScope.WORKSPACE,
                portfolioLearningSyncMode =
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                portfolioLearningSyncStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.APPLIED,
                portfolioLearningSyncConflictResolution =
                    com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution.SAFE_MERGE,
                portfolioLearningSyncReviewRequired = true,
                portfolioLearningSyncSummary = "Imported 2 redacted learning artifact(s) after safe merge.",
                portfolioLearningSyncBoundarySummary = "Tenant boundary limits sync to same-tenant workspaces.",
                portfolioLearningSyncPrivacySummary = "Tenant-private policy keeps learning artifacts redacted.",
                portfolioFederatedAggregationSummary = "Same-tenant aggregation merged 4 artifacts across 2 devices."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 12)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio sync:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("tenant private sync", ignoreCase = true) })
        assertTrue(lines.any { it.contains("safe merge", ignoreCase = true) })
        assertTrue(lines.any { it.contains("review required", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio sync boundary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio sync privacy:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio federated aggregation:", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_sync=Imported 2 redacted learning artifact", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_sync_mode=tenant private sync", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_sync_status=applied", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_sync_conflict=safe merge", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_sync_review_required=true", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_sync_boundary=Tenant boundary limits sync to same-tenant workspaces", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_sync_privacy=Tenant-private policy keeps learning artifacts redacted", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_federated_aggregation=Same-tenant aggregation merged 4 artifacts across 2 devices", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includePortfolioConsentTransportAndAuditSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioLearningSyncConsentDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.ALLOWED,
                portfolioRemoteTransportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
                portfolioRemoteTransportConnectorType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                portfolioEnterpriseKeyStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus.REVOKED,
                portfolioComplianceGateDecision =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision.LOCAL_FALLBACK,
                portfolioRemoteTransportLocalFallbackUsed = true,
                portfolioRemoteTransportConnectorSummary =
                    "HTTPS webhook connector selected deterministically for redacted learning delivery.",
                portfolioEnterpriseKeySummary =
                    "Enterprise key was revoked, so remote delivery could not proceed safely.",
                portfolioComplianceGateSummary =
                    "Compliance gate forced local fallback because enterprise key state was unsafe.",
                portfolioComplianceAuditExportStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
                portfolioLearningConsentSummary = "Purpose-limited consent remains active for redacted learning artifacts.",
                portfolioRemoteTransportSummary = "Transport fell back locally after enterprise key revocation.",
                portfolioComplianceAuditExportSummary = "Generated JSON export with redaction-first bundle hashes.",
                portfolioEnterprisePrivacySummary = "Enterprise privacy keeps raw prompts blocked and enforces same-tenant boundaries."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 16)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio consent:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("sync allowed", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio remote transport:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("local fallback", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio connector:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio enterprise key:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio compliance gate:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio audit export:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("complete", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio enterprise privacy:", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_consent=Purpose-limited consent remains active", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_consent_decision=allowed", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remote_transport=Transport fell back locally", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remote_transport_status=local fallback", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remote_transport_connector=https webhook", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_enterprise_key=revoked", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_compliance_gate=local fallback", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remote_transport_local_fallback=true", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_compliance_audit_export=Generated JSON export", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_compliance_audit_export_status=complete", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_enterprise_privacy=Enterprise privacy keeps raw prompts blocked", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includePortfolioDestinationResidencyAndRouteSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioRemoteDestinationStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus.REROUTED,
                portfolioRemoteDestinationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType.LOCAL_DEVICE,
                portfolioResidencyRegion =
                    com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion.EU,
                portfolioJurisdiction =
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction.EU_GDPR,
                portfolioRemoteDestinationSummary =
                    "Preferred remote destination rerouted to local-first handling under residency policy.",
                portfolioResidencySummary =
                    "Residency policy keeps EU artifacts inside EU GDPR routing boundaries.",
                portfolioComplianceExportRouteSummary =
                    "Compliance export route is held pending jurisdiction review."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 16)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio destination:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("rerouted", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio residency:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("eu gdpr", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio export route:", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_remote_destination=Preferred remote destination rerouted", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remote_destination_status=rerouted", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remote_destination_type=local device", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_residency=Residency policy keeps EU artifacts", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_residency_region=eu", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_jurisdiction=eu gdpr", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_compliance_export_route=Compliance export route is held", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includePortfolioDataExchangeApprovalAndAuditSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioDataExchangeBundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                portfolioDataExchangeDecisionStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                portfolioDataExchangeApprovalStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
                portfolioCrossBoundaryAuditOperationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                portfolioCrossBoundaryAuditResult =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
                portfolioDataExchangeBundleSummary =
                    "Bundle split keeps receipt and governance traces local while remote-safe artifacts continue.",
                portfolioDataExchangeBoundarySummary =
                    "Boundary permits redacted audit exchange inside EU GDPR routing.",
                portfolioDataExchangeApprovalSummary =
                    "Cross-boundary split bundle auto-approved within safe bounds.",
                portfolioCrossBoundaryAuditSummary =
                    "Cross-boundary audit recorded the local split decision."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 20)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio exchange bundle:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("split", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio exchange boundary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("eu gdpr", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio exchange approval:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("auto approved", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio cross-boundary audit:", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_data_exchange_bundle=Bundle split keeps receipt", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_data_exchange_bundle_type=compliance audit exchange", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_data_exchange_decision_status=split", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_data_exchange_approval=Cross-boundary split bundle auto-approved", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_data_exchange_approval_status=auto approved", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_cross_boundary_audit=Cross-boundary audit recorded", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_cross_boundary_audit_operation=bundle split required", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_cross_boundary_audit_result=recorded", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includePortfolioGovernanceTrustTierAndJurisdictionSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioDataExchangeBundleType =
                    com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                portfolioDataExchangeDecisionStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus.HELD,
                portfolioDataExchangeApprovalStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus.PENDING_REVIEW,
                portfolioCrossBoundaryAuditOperationType =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                portfolioCrossBoundaryAuditResult =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult.REVIEW_REQUIRED,
                portfolioGovernancePortfolioStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                portfolioDestinationTrustTier =
                    com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
                portfolioCrossBoundaryProgramStatus =
                    com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramStatus.REVIEW_REQUIRED,
                portfolioTrustTierRolloutState =
                    com.lumi.coredomain.contract.PortfolioOptimizationTrustTierRolloutState.DEFERRED,
                portfolioJurisdictionRolloutState =
                    com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutState.SPLIT_REQUIRED,
                portfolioGovernancePriority =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriority.CRITICAL,
                portfolioRecommendationAction =
                    com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                portfolioSharedBlockerCount = 2,
                portfolioConflictCount = 1,
                portfolioGovernanceSummary =
                    "Review-required governance portfolio with shared approval contention.",
                portfolioTrustTierProgramSummary =
                    "High-trust rollout is deferred until shared blockers clear.",
                portfolioJurisdictionRolloutSummary =
                    "Jurisdiction rollout requires a split between EU GDPR and US privacy zones.",
                portfolioGovernanceBlockerSummary =
                    "Approval review blocks two programs across the portfolio.",
                portfolioGovernanceDependencySummary =
                    "EU archive advance depends on the peer destination review finishing first.",
                portfolioGovernanceConflictSummary =
                    "Approval contention remains open across two programs.",
                portfolioGovernanceRecommendationSummary =
                    "Review the shared blocker before advancing the next high-trust wave."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 24)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio governance:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("review required", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio trust tier:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("high trust", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio jurisdiction rollout:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("split required", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio blockers: 2", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio conflicts: 1", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio dependencies:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio next action:", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_governance=Review-required governance portfolio", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_status=review required", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_destination_trust_tier=high trust", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_cross_boundary_program_status=review required", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_trust_tier_rollout=High-trust rollout is deferred", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_trust_tier_rollout_state=deferred", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_jurisdiction_rollout=Jurisdiction rollout requires a split", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_jurisdiction_rollout_state=split required", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_blockers=Approval review blocks two programs", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_dependencies=EU archive advance depends", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_conflicts=Approval contention remains open", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_recommendation=Review the shared blocker", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_priority=critical", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_recommendation_action=review shared blocker", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_shared_blockers=2", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_conflicts=1", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM43PortfolioAnalyticsRiskBudgetAndCorrectiveSignals() {
        val response = response(
            executionReceipt = receipt(
                portfolioHealthStatus =
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

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 24)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio analytics:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio trust-tier drift:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio jurisdiction drift:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio risk budget:", ignoreCase = true) && it.contains("breached", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio destination concentration:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio blocker trend:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio risk recommendation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio corrective action:", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_governance_analytics=Analytics detect rising reroute pressure", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_governance_health_status=at risk", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_risk_budget=Risk budget exceeded after repeated held", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_risk_budget_status=exceeded", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_risk_budget_breached=true", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_trust_tier_drift=Limited-trust destinations are drifting", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_trust_tier_drift_state=drifting", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_jurisdiction_drift=US privacy rollout is drifting", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_jurisdiction_drift_state=drifting", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_destination_risk_concentration=Two limited-trust destinations now carry", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_blocker_trend=Approval blockers increased from 1 to 3", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_risk_recommendation=Resequence jurisdictions and limit limited-trust", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_risk_recommendation_action=split jurisdiction lane", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_corrective_action=Recorded request risk hold", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_corrective_action_type=request risk hold", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM44PortfolioSafetyGuardrailAndRemediationSignals() {
        val response = response(
            executionReceipt = receipt(
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

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 24)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Portfolio safety:", ignoreCase = true) && it.contains("guarded", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio guardrail:", ignoreCase = true) && it.contains("soft stop", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio safety rail:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio remediation:", ignoreCase = true) && it.contains("throttled", ignoreCase = true) })
        assertTrue(snippet.contains("portfolio_safety=Portfolio safety is guarded", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_safety_state=guarded", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_budget_guardrail=Budget soft-stop remains active", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_budget_guardrail_state=soft stop", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_enforcement_mode=soft stop", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remediation_automation=Remediation automation is throttled", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remediation_automation_state=throttled", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_safety_rail=Risk budget guardrail requires a bounded soft-stop", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_remediation_approval_required=true", ignoreCase = true))
    }

    @Test
    fun externalSummaryHeadline_surfacesPrimaryExternalChainStates() {
        val response = response(
            summary = "Dispute opened locally; gateway sync pending.",
            executionReceipt = receipt(
                providerSelectionSummary = ProviderSelectionSummary(
                    selectedProviderId = "provider_alpha",
                    selectedProviderName = "Provider Alpha",
                    selectionRationale = "Selected for trust and ETA fit."
                ),
                externalApprovalSummary = ExternalApprovalSummary(
                    required = true,
                    granted = false,
                    denied = false,
                    status = "required",
                    summary = "Approval required by role policy."
                ),
                externalDataScopeSummary = ExternalDataScopeSummary(
                    reduced = true,
                    blocked = false,
                    summary = "Data scope reduced to policy-safe fields."
                ),
                externalVerificationSummary = ExternalVerificationSummary(
                    status = "failed",
                    passed = false,
                    partial = false,
                    summary = "Verification failed due to proof mismatch."
                ),
                externalDisputeSummary = ExternalDisputeSummary(
                    opened = true,
                    summary = "Dispute opened locally; gateway sync pending."
                )
            )
        )

        val headline = ExecutionReceiptFormatter.externalSummaryHeadline(response)

        assertTrue(headline?.contains("Provider selected", ignoreCase = true) == true)
        assertTrue(headline?.contains("Approval required", ignoreCase = true) == true)
        assertTrue(headline?.contains("Data scope reduced", ignoreCase = true) == true)
        assertTrue(headline?.contains("Verification failed", ignoreCase = true) == true)
    }

    @Test
    fun summaryLines_prioritizeExternalWhyAndSyncPendingSignals() {
        val response = response(
            summary = "Dispute opened locally; gateway sync pending.",
            executionReceipt = receipt(
                providerSelectionSummary = ProviderSelectionSummary(
                    selectedProviderId = "provider_beta",
                    selectedProviderName = "Provider Beta",
                    selectionRationale = "Provider selected due to strongest role policy fit."
                ),
                externalApprovalSummary = ExternalApprovalSummary(
                    required = true,
                    granted = false,
                    denied = false,
                    status = "required",
                    summary = "Approval required by role policy."
                ),
                externalDataScopeSummary = ExternalDataScopeSummary(
                    reduced = true,
                    blocked = false,
                    summary = "Data scope reduced by role policy."
                ),
                externalDisputeSummary = ExternalDisputeSummary(
                    opened = true,
                    summary = "Dispute opened locally; gateway sync pending."
                )
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 6)

        assertTrue(lines.any { it.contains("Why provider:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Why approval:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Why data scope:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Sync pending:", ignoreCase = true) })
    }

    @Test
    fun externalStatusPills_includeProviderDenialAndPolicySignals() {
        val response = response(
            executionReceipt = receipt(
                providerPolicyDecisions = listOf(
                    ProviderPolicyDecision(
                        providerId = "provider_blocked",
                        providerName = "Provider Blocked",
                        decision = ProviderDecisionStatus.DENIED,
                        readableReason = "Denied by role policy."
                    )
                ),
                externalApprovalSummary = ExternalApprovalSummary(
                    required = true,
                    granted = false,
                    denied = true,
                    status = "denied",
                    summary = "Approval denied by role policy."
                ),
                externalDataScopeSummary = ExternalDataScopeSummary(
                    reduced = false,
                    blocked = true,
                    summary = "Data scope blocked by role policy."
                )
            )
        )

        val pills = ExecutionReceiptFormatter.externalStatusPills(response, maxItems = 6)
        val labels = pills.map { it.label }

        assertTrue(labels.contains("Provider denied"))
        assertTrue(labels.contains("Approval denied"))
        assertTrue(labels.contains("Data scope blocked"))
    }

    @Test
    fun summaryLines_includeSettlementAndReconciliationSignals() {
        val response = response(
            executionReceipt = receipt(
                externalSettlementSummary = ExternalSettlementSummary(
                    status = SettlementStatus.SYNC_PENDING,
                    syncState = SettlementSyncState.SYNC_PENDING,
                    summary = "Settlement is authoritative locally; remote acknowledgement is pending."
                ),
                reconciliationSummary = MarketplaceReconciliationSummary(
                    result = SettlementReconciliationResult.RETRY_SCHEDULED,
                    syncState = SettlementSyncState.SYNC_PENDING,
                    summary = "Reconciliation retry is scheduled while local state remains authoritative.",
                    retryScheduled = true
                )
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 8)
        val headline = ExecutionReceiptFormatter.externalSummaryHeadline(response, maxItems = 6)

        assertTrue(lines.any { it.contains("settlement", ignoreCase = true) })
        assertTrue(lines.any { it.contains("reconciliation", ignoreCase = true) })
        assertTrue(headline?.contains("Settlement sync pending", ignoreCase = true) == true)
    }

    @Test
    fun summaryLines_returnsFallbackWhenNoMaterialSignals() {
        val response = response(
            executionReceipt = receipt(
                roleImpactSummary = "No material role impact was recorded for this run.",
                approvalSummary = "No approval gate triggered for this run",
                dataScopeSummary = "No additional data-scope restrictions",
                providerSummary = "No external provider decision recorded",
                verificationSummary = "No additional verification step required",
                proofSummary = "No proof artifacts generated",
                rollbackSummary = "No rollback action triggered"
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 4)

        assertEquals(1, lines.size)
        assertTrue(lines.first().contains("Execution completed", ignoreCase = true))
    }

    @Test
    fun summaryLines_clampOverlongText() {
        val overlongProvider = buildString {
            repeat(30) {
                append("Provider blocked by policy due to unresolved compliance checks and missing SLA proof. ")
            }
        }
        val response = response(
            executionReceipt = receipt(
                providerSummary = overlongProvider
            )
        )

        val line = ExecutionReceiptFormatter.summaryLines(response, maxItems = 3)
            .firstOrNull { it.contains("Provider", ignoreCase = true) }

        assertTrue(line != null)
        assertTrue(line!!.length <= 140)
        assertTrue(line.endsWith("..."))
    }

    @Test
    fun exportSnippet_returnsUnavailableWithoutReceipt() {
        val response = response(executionReceipt = null)

        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertEquals("receipt=unavailable", snippet)
    }

    @Test
    fun exportSnippet_includesRoleSourceAndKeySummaries() {
        val response = response(
            executionReceipt = receipt(
                activeRole = UserRole.PARENT,
                roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                delegationMode = DelegationMode.ASSISTED,
                approvalSummary = "Approval required by role policy",
                quoteSummary = "Collected 2 quotes; selected trusted_supplier",
                providerSummary = "Provider selected: trusted_supplier",
                verificationSummary = "Verification passed",
                rollbackSummary = "Rollback available",
                rolloutSummary = "Enterprise rollout stage canary with guarded allowlist.",
                cutoverReadinessSummary = "Cutover readiness blocked by stale directory state.",
                vaultRuntimeSummary = "Vault runtime degraded: lease renewal required.",
                enterpriseFallbackSummary = "Local-first fallback is active during connector gating."
            )
        )

        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(snippet.contains("receipt_role=parent"))
        assertTrue(snippet.contains("source=Explicit user selection"))
        assertTrue(snippet.contains("approval=Approval required by role policy"))
        assertTrue(snippet.contains("quote=Collected 2 quotes; selected trusted_supplier"))
        assertTrue(snippet.contains("provider=Provider selected: trusted_supplier"))
        assertTrue(snippet.contains("verification=Verification passed"))
        assertTrue(snippet.contains("rollback=Rollback available"))
        assertTrue(snippet.contains("rollout=Enterprise rollout stage canary", ignoreCase = true))
        assertTrue(snippet.contains("cutover=Cutover readiness blocked", ignoreCase = true))
        assertTrue(snippet.contains("vault_runtime=Vault runtime degraded", ignoreCase = true))
        assertTrue(snippet.contains("fallback=Local-first fallback is active", ignoreCase = true))
    }

    @Test
    fun summaryLines_includeM16RolloutCutoverVaultFallbackSignals() {
        val response = response(
            executionReceipt = receipt(
                rolloutSummary = "Enterprise rollout stage canary with guarded allowlist.",
                cutoverReadinessSummary = "Cutover readiness blocked by directory sync lag.",
                vaultRuntimeSummary = "Vault runtime degraded due to lease renewal window.",
                enterpriseFallbackSummary = "Local-first fallback is active until cutover checks recover."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 10)

        assertTrue(lines.any { it.contains("Rollout control:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Cutover readiness:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Vault runtime:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Fallback:", ignoreCase = true) })
    }

    @Test
    fun summaryLines_andExport_includeM17ProviderProvenanceSummaries() {
        val response = response(
            executionReceipt = receipt(
                idpProviderSummary = "IdP provider exchange allowed via okta oidc adapter.",
                scimProviderSummary = "SCIM provider stale soft with local fallback guardrails.",
                vaultProviderSummary = "Vault provider materialization degraded; local-first route kept."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 16)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("IdP provider:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("SCIM provider:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Vault provider:", ignoreCase = true) })
        assertTrue(snippet.contains("idp_provider=IdP provider exchange allowed", ignoreCase = true))
        assertTrue(snippet.contains("scim_provider=SCIM provider stale soft", ignoreCase = true))
        assertTrue(snippet.contains("vault_provider=Vault provider materialization degraded", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM22WorkflowRolloutGovernanceSignals() {
        val response = response(
            executionReceipt = receipt(
                workflowRolloutStage = PolicyRolloutStage.STAGED,
                workflowRolloutMode = PolicyRolloutMode.STAGED,
                workflowRolloutScope = PolicyRolloutScope.WORKSPACE,
                workflowRolloutApprovalState = PolicyRolloutApprovalState.PENDING,
                workflowRolloutFreezeState = PolicyRolloutFreezeState.NOT_FROZEN,
                workflowRolloutSummary = "Workflow policy rollout is staged in staged mode for workspace scope.",
                workflowRolloutApprovalSummary = "Rollout approval is pending before risky promotion or scope expansion.",
                workflowRolloutFreezeSummary = "Rollout freeze is not active.",
                workflowRolloutRollbackSummary = "No rollout rollback was recorded."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 12)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Workflow rollout state:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow rollout approval:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow rollout freeze:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow rollout rollback:", ignoreCase = true) })
        assertTrue(snippet.contains("workflow_rollout_state=", ignoreCase = true))
        assertTrue(snippet.contains("stage:staged", ignoreCase = true))
        assertTrue(snippet.contains("mode:staged", ignoreCase = true))
        assertTrue(snippet.contains("scope:workspace", ignoreCase = true))
        assertTrue(snippet.contains("approval:pending", ignoreCase = true))
        assertTrue(snippet.contains("freeze:", ignoreCase = true))
        assertTrue(snippet.contains("workflow_rollout=Workflow policy rollout is staged", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM23PolicyPromotionSignals() {
        val response = response(
            executionReceipt = receipt(
                policyPromotionStatus = PolicyPromotionStatus.APPROVAL_PENDING,
                policyPromotionSummary = "Policy promotion requested for staged rollout at workspace scope.",
                policyPromotionReadinessSummary = "Promotion readiness is on hold pending 2 blocker(s).",
                policyPromotionBlockerSummary = "Promotion is waiting for approval operations to complete.; At least 3 simulation runs are required before promotion.",
                policyPromotionRecommendationSummary = "Hold promotion until evidence and approval blockers are cleared.",
                policyPromotionReadiness = PromotionReadinessResult(
                    status = PolicyPromotionReadinessStatus.HOLD,
                    recommendation = PolicyPromotionRecommendation(
                        action = PolicyPromotionRecommendationType.HOLD,
                        summary = "Hold promotion until evidence and approval blockers are cleared."
                    ),
                    summary = "Promotion readiness is on hold pending 2 blocker(s)."
                ),
                policyRolloutAnalytics = RolloutAnalyticsSummary(
                    target = PolicyPromotionTarget(
                        scope = PolicyRolloutScope.WORKSPACE,
                        workflowTemplateId = "wf_provider_follow_up",
                        summary = "Workspace target."
                    ),
                    totalRuns = 4,
                    simulationRuns = 2,
                    approvalPendingCount = 1,
                    summary = "Rollout analytics: total 4, simulation 2, pending approvals 1, denied approvals 0."
                ),
                policyApprovalReviewSummary = ApprovalReviewSummary(
                    pendingCount = 1,
                    approvedCount = 0,
                    rejectedCount = 0,
                    summary = "Approval queue pending 1, approved 0, rejected 0."
                )
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 20)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Policy promotion status:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy readiness:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy blockers:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy recommendation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Rollout analytics:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy approval review:", ignoreCase = true) })
        assertTrue(snippet.contains("policy_promotion_status=approval_pending", ignoreCase = true))
        assertTrue(snippet.contains("policy_promotion_readiness=hold", ignoreCase = true))
        assertTrue(snippet.contains("policy_promotion=Policy promotion requested", ignoreCase = true))
        assertTrue(snippet.contains("policy_readiness=Promotion readiness is on hold", ignoreCase = true))
        assertTrue(snippet.contains("policy_blockers=Promotion is waiting for approval", ignoreCase = true))
        assertTrue(snippet.contains("policy_recommendation=Hold promotion", ignoreCase = true))
        assertTrue(snippet.contains("policy_analytics=Rollout analytics: total 4", ignoreCase = true))
        assertTrue(snippet.contains("policy_approval_review=Approval queue pending 1", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM24ProgramLifecycleAndCrossTenantSignals() {
        val response = response(
            executionReceipt = receipt(
                workflowPolicyGovernanceProgram = PolicyGovernanceProgram(
                    programId = "program_m24_ops",
                    name = "M24 Governance Program",
                    status = PolicyGovernanceProgramStatus.ACTIVE,
                    currentWaveId = "wave_2",
                    waves = listOf(
                        PolicyGovernanceProgramWave(
                            waveId = "wave_2",
                            name = "Wave 2",
                            status = PolicyGovernanceWaveStatus.ADVANCING
                        )
                    ),
                    summary = "Program is active and advancing wave 2."
                ),
                workflowProgramSummary = "Program tracks cross-tenant adoption and blocker gates.",
                workflowCrossTenantRolloutSummary = CrossTenantRolloutSummary(
                    totalTargets = 12,
                    adoptedTargets = 8,
                    driftedTargets = 2,
                    exemptedTargets = 1,
                    pinnedTargets = 1,
                    blockedTargets = 1,
                    readinessStatus = CrossTenantRolloutReadinessStatus.HOLD,
                    summary = "Cross-tenant rollout on hold pending drift remediation."
                ),
                workflowCrossTenantSummary = "Hold due to drift and pinned targets.",
                workflowPackLifecycleStatus = WorkflowPolicyPackLifecycleStatus.DEPRECATED,
                workflowPackLifecycleSummary = "Pack is deprecated and pending retirement readiness checks.",
                workflowPackDeprecationSummary = "Pack deprecated after replacement validation pass.",
                workflowPackRetirementSummary = "Retirement blocked by one active pin.",
                workflowPackReplacementPlan = WorkflowPolicyPackReplacementPlan(
                    replacementId = "replacement_m24_1",
                    fromPackId = "pack_m24_old",
                    toPackId = "pack_m24_new",
                    toPackVersionId = "v3",
                    summary = "Replace pack_m24_old with pack_m24_new v3 after drift clears."
                ),
                workflowPackReplacementSummary = "Replacement pack_m24_new v3 staged for cutover."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 24)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Policy governance program:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Cross-tenant rollout:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy pack lifecycle:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy pack deprecation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy pack retirement:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy pack replacement:", ignoreCase = true) })
        assertTrue(snippet.contains("policy_program_status=active", ignoreCase = true))
        assertTrue(snippet.contains("policy_program=Program tracks cross-tenant adoption", ignoreCase = true))
        assertTrue(snippet.contains("policy_cross_tenant=Hold due to drift", ignoreCase = true))
        assertTrue(snippet.contains("policy_pack_lifecycle_status=deprecated", ignoreCase = true))
        assertTrue(snippet.contains("policy_pack_retirement=Retirement blocked", ignoreCase = true))
        assertTrue(snippet.contains("policy_pack_replacement=Replacement pack_m24_new v3", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM25PolicyEstateSignals() {
        val response = response(
            executionReceipt = receipt(
                policyEstateSummary = "Policy estate snapshot computed for workspace and tenant rollout targets.",
                policyEstateDriftSummary = "2 drift record(s) detected · 1 blocker(s) active.",
                policyEstateBlockerSummary = "Retirement blocked by active pinned targets.",
                policyEstateRemediationSummary = "Remediation is recommended and pending scheduling.",
                policyEstateSnapshot = PolicyEstateSnapshot(
                    snapshotId = "estate_m25_1",
                    driftRecords = listOf(
                        PolicyEstateDriftRecord(
                            type = PolicyEstateDriftType.PACK_VERSION_BEHIND_TARGET,
                            severity = PolicyEstateDriftSeverity.HIGH,
                            summary = "Workspace policy pack version is behind target."
                        )
                    )
                ),
                policyEstateRemediationPlan = PolicyEstateRemediationPlan(
                    status = PolicyEstateRemediationStatus.SCHEDULED,
                    summary = "Schedule safe remediation before retirement progression.",
                    actions = listOf(
                        PolicyEstateRemediationActionRecord(
                            action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                            status = PolicyEstateRemediationStatus.SCHEDULED,
                            summary = "Adoption scheduling queued."
                        )
                    )
                )
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 20)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Policy estate state:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy estate drift:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy estate blockers:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy estate remediation:", ignoreCase = true) })
        assertTrue(snippet.contains("policy_estate_state=", ignoreCase = true))
        assertTrue(snippet.contains("policy_estate=Policy estate snapshot computed", ignoreCase = true))
        assertTrue(snippet.contains("policy_estate_drift=2 drift record", ignoreCase = true))
        assertTrue(snippet.contains("policy_estate_blockers=Retirement blocked", ignoreCase = true))
        assertTrue(snippet.contains("policy_estate_remediation=Remediation is recommended", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM26EstateAutomationSchedulingSignals() {
        val response = response(
            executionReceipt = receipt(
                estateAutomationRule = EstateAutomationRule(
                    ruleId = "estate_rule_m26",
                    name = "M26 Safe Estate Automation",
                    enabled = true,
                    allowScheduling = true,
                    allowAutoApplySafe = true,
                    summary = "Schedule and execute bounded safe remediation only."
                ),
                estateAutomationEligibility = EstateAutomationEligibility(
                    status = EstateAutomationEligibilityStatus.APPROVAL_REQUIRED,
                    summary = "Automation is queued but requires explicit approval.",
                    reasonCodes = listOf(
                        "ROLE_ESTATE_AUTOMATION_SCHEDULED",
                        "ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED"
                    ),
                    approvalRequirement = AutomationApprovalRequirement.REQUIRED_FOR_RISKY_OPERATION,
                    approvalDecision = AutomationApprovalDecision.PENDING
                ),
                scheduledRemediationPlan = ScheduledRemediationPlan(
                    scheduleId = "schedule_m26_1",
                    action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                    status = ScheduledRemediationStatus.APPROVAL_REQUIRED,
                    target = ScheduledRemediationTarget(
                        scope = PolicyRolloutScope.WORKSPACE,
                        tenantId = "tenant_m26",
                        workspaceId = "workspace_m26",
                        packId = "pack_m26",
                        packVersionId = "v_m26_2",
                        summary = "Workspace remediation target."
                    ),
                    scheduledAtMs = 1700000020000L,
                    scheduledBy = OperatorAssigneeRef(userId = "ops_admin", displayName = "Ops Admin"),
                    approvalRequirement = AutomationApprovalRequirement.REQUIRED_FOR_RISKY_OPERATION,
                    approvalDecision = AutomationApprovalDecision.PENDING,
                    summary = "Scheduled remediation is waiting for approval."
                ),
                governanceProgramOperations = listOf(
                    GovernanceProgramOperation(
                        operationId = "program_op_m26_1",
                        action = GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION,
                        status = GovernanceProgramOperationStatus.APPROVAL_REQUIRED,
                        summary = "Program operation is waiting for approval."
                    )
                ),
                automationReplaySummary = AutomationReplaySummary(
                    executedCount = 0,
                    scheduledCount = 1,
                    blockedCount = 1,
                    suppressedCount = 0,
                    approvalRequiredCount = 1,
                    summary = "1 scheduled, 1 blocked, 1 approval-required operation."
                ),
                automationCancellationRecords = listOf(
                    AutomationCancellationRecord(
                        cancellationId = "cancel_m26_1",
                        scheduleId = "schedule_m26_1",
                        reason = "Cancelled during maintenance freeze."
                    )
                )
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 24)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Estate automation eligibility:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Estate automation summary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Scheduled remediation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Scheduled remediation approval:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Automation replay:", ignoreCase = true) })
        assertTrue(snippet.contains("estate_automation=approval_required", ignoreCase = true))
        assertTrue(snippet.contains("scheduled_remediation=approval_required", ignoreCase = true))
        assertTrue(snippet.contains("automation_replay=1 scheduled", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM27ScheduleWindowAndRolloutCalendarSignals() {
        val response = response(
            executionReceipt = receipt(
                workflowPolicyRolloutState = WorkflowPolicyRolloutState(
                    stage = PolicyRolloutStage.STAGED,
                    mode = PolicyRolloutMode.STAGED,
                    target = PolicyRolloutTarget(
                        scope = PolicyRolloutScope.WORKSPACE,
                        tenantId = "tenant_m27",
                        workspaceId = "workspace_m27",
                        workflowTemplateId = "wf_provider_follow_up"
                    ),
                    policySchedulingWindow = PolicySchedulingWindow(
                        windowId = "window_m27_1",
                        windowType = SchedulingWindowType.MAINTENANCE_WINDOW,
                        status = SchedulingWindowStatus.DEFERRED,
                        timezone = "Europe/London",
                        nextEligibleAtMs = 1_700_000_030_000L,
                        summary = "Rollout is waiting for the next maintenance window."
                    ),
                    calendarEvaluation = CalendarEvaluationResult(
                        decision = ExecutionWindowDecision.DEFERRED,
                        windowStatus = SchedulingWindowStatus.DEFERRED,
                        blockReason = ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                        nextEligibleAtMs = 1_700_000_030_000L,
                        summary = "Rollout is deferred by schedule policy."
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
                                summary = "Stage deferred until maintenance window opens."
                            )
                        ),
                        summary = "Rollout calendar deferred for staged wave."
                    ),
                    scheduleSummary = "Rollout is deferred by schedule policy. Waiting for maintenance window.",
                    rolloutCalendarSummary = "Rollout calendar deferred for staged wave."
                )
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 28)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Workflow schedule:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow schedule summary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Rollout calendar:", ignoreCase = true) })
        assertTrue(snippet.contains("workflow_schedule_state=window deferred", ignoreCase = true))
        assertTrue(snippet.contains("workflow_schedule_summary=Rollout is deferred", ignoreCase = true))
        assertTrue(snippet.contains("workflow_rollout_calendar=Rollout calendar deferred", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM28RolloutWaveAndCrossWindowSignals() {
        val response = response(
            executionReceipt = receipt(
                rolloutWaveSummary = "Wave 2 carried forward to next eligible window.",
                calendarAwarePromotionSummary = "Wave 2 deferred by maintenance window policy.",
                crossWindowGovernanceSummary = "Cross-window rollout paused by governance controls.",
                currentRolloutWaveId = "wave_m28_a",
                currentRolloutWaveStatus = RolloutWaveStatus.CARRIED_FORWARD,
                currentRolloutWaveCompletionState = RolloutWaveCompletionState.CARRIED_FORWARD,
                currentRolloutWaveDecision = RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
                currentRolloutWindowEligibility = PromotionWindowEligibility.DEFERRED,
                rolloutCarryForwardPending = true,
                rolloutNextWindowPending = true,
                rolloutCrossWindowPaused = true
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 32)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Rollout wave:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Rollout wave summary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Promotion window summary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Cross-window governance:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("carry-forward", ignoreCase = true) })
        assertTrue(lines.any { it.contains("next window", ignoreCase = true) })
        assertTrue(lines.any { it.contains("cross-window rollout pause", ignoreCase = true) })
        assertTrue(snippet.contains("rollout_wave_state=wave wave_m28_a", ignoreCase = true))
        assertTrue(snippet.contains("rollout_wave_summary=Wave 2 carried forward", ignoreCase = true))
        assertTrue(snippet.contains("promotion_window_summary=Wave 2 deferred", ignoreCase = true))
        assertTrue(snippet.contains("cross_window_governance=Cross-window rollout paused", ignoreCase = true))
        assertTrue(snippet.contains("rollout_carry_forward=pending", ignoreCase = true))
        assertTrue(snippet.contains("rollout_next_window=pending", ignoreCase = true))
        assertTrue(snippet.contains("rollout_cross_window=paused", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM31CapacityBalancingSignals() {
        val response = response(
            executionReceipt = receipt(
                approvalLoadSummary = "Approval queue is saturated for workspace_finance (18 pending, 2 ready).",
                capacityBlockSummary = "Capacity blocked: no free approver slots for this window.",
                policyBlockSummary = "Policy block: explicit approval gate remains mandatory.",
                capacityBalancingSummary = "Balancing deferred this run and reassigned 2 lower-priority approvals.",
                portfolioCapacitySummary = "Portfolio capacity bottleneck detected across 3 active programs."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 20)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Approval load:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Capacity block:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Policy block:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Capacity balancing:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Portfolio capacity:", ignoreCase = true) })
        assertTrue(snippet.contains("approval_load_summary=Approval queue is saturated", ignoreCase = true))
        assertTrue(snippet.contains("capacity_block_summary=Capacity blocked", ignoreCase = true))
        assertTrue(snippet.contains("policy_block_summary=Policy block", ignoreCase = true))
        assertTrue(snippet.contains("capacity_balancing_summary=Balancing deferred", ignoreCase = true))
        assertTrue(snippet.contains("portfolio_capacity_summary=Portfolio capacity bottleneck", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM29PromotionReadinessCrossWaveAndWindowImpactSignals() {
        val response = response(
            executionReceipt = receipt(
                rolloutPromotionReadiness = com.lumi.coredomain.contract.RolloutPromotionReadinessSummary(
                    status = com.lumi.coredomain.contract.RolloutPromotionReadinessStatus.DEFERRED,
                    blockers = listOf(
                        com.lumi.coredomain.contract.RolloutPromotionBlocker(
                            blockerId = "blocker_m29_approval",
                            severity = com.lumi.coredomain.contract.PolicyEstateDriftSeverity.HIGH,
                            summary = "Approval operations are still pending."
                        )
                    ),
                    recommendation = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                    summary = "Promotion deferred until approval and window blockers clear."
                ),
                crossWaveAnalyticsSummary = com.lumi.coredomain.contract.CrossWaveAnalyticsSummary(
                    healthBucket = com.lumi.coredomain.contract.WaveHealthBucket.CAUTION,
                    totalWaves = 4,
                    completedWaves = 1,
                    blockedWaves = 1,
                    deferredWaves = 2,
                    carriedForwardWaves = 1,
                    carryForwardPressure = true,
                    summary = "Cross-wave health caution with blocked and deferred waves."
                ),
                windowImpactSummary = com.lumi.coredomain.contract.WindowImpactSummary(
                    decision = com.lumi.coredomain.contract.ExecutionWindowDecision.DEFERRED,
                    windowStatus = com.lumi.coredomain.contract.SchedulingWindowStatus.DEFERRED,
                    eligibility = com.lumi.coredomain.contract.PromotionWindowEligibility.DEFERRED,
                    delayReason = com.lumi.coredomain.contract.WindowDelayReason.MAINTENANCE_WINDOW,
                    nextEligibleAtMs = 1_700_000_040_000L,
                    blockedTargets = 2,
                    summary = "Window impact delayed by maintenance window."
                ),
                rolloutPromotionOperation = com.lumi.coredomain.contract.RolloutPromotionOperationRecord(
                    operationId = "promotion_op_m29_defer",
                    type = com.lumi.coredomain.contract.RolloutPromotionOperationType.DEFER,
                    status = com.lumi.coredomain.contract.GovernanceProgramOperationStatus.SCHEDULED,
                    summary = "Deferred promotion to the next eligible window."
                ),
                rolloutPromotionReadinessSummary = "Rollout readiness deferred due to approval and maintenance window blockers.",
                crossWaveSummary = "Cross-wave caution: blocked 1, deferred 2, carry-forward pressure active.",
                windowImpactReadableSummary = "Window impact delayed by maintenance window; next eligible at 1700000040000.",
                rolloutPromotionOperationSummary = "Latest promotion operation deferred to the next eligible window."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 36)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Rollout promotion readiness:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Cross-wave summary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Window impact:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Promotion operation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("maintenance window", ignoreCase = true) })
        assertTrue(snippet.contains("rollout_promotion_readiness_status=deferred", ignoreCase = true))
        assertTrue(snippet.contains("rollout_promotion_readiness=Rollout readiness deferred", ignoreCase = true))
        assertTrue(snippet.contains("cross_wave_health=caution", ignoreCase = true))
        assertTrue(snippet.contains("window_delay_reason=maintenance_window", ignoreCase = true))
        assertTrue(snippet.contains("promotion_operation_state=defer:scheduled", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM20WorkflowPolicySlaAndAutomationSignals() {
        val response = response(
            executionReceipt = receipt(
                workflowPolicySummary = "Provider follow-up policy is active.",
                slaSummary = "SLA is breached and requires escalation handling.",
                stageTimerSummary = "Stage timer is overdue for waiting provider.",
                escalationTimerSummary = "Escalation is required by workflow policy.",
                automationGuardrailSummary = "Automation blocked by workflow guardrails.",
                automationSuppressionSummary = "Automation suppressed because SLA is breached.",
                nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually.",
                slaStatus = WorkflowSlaStatus.BREACHED,
                stageTimerStatus = WorkflowStageTimerStatus.OVERDUE,
                escalationTimerStatus = WorkflowEscalationTimerStatus.REQUIRED,
                automationEligibility = WorkflowAutomationEligibilityStatus.BLOCKED
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 16)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("SLA breached", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow policy:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Stage timer:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Escalation timer:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Automation guardrail:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Required human action:", ignoreCase = true) })
        assertTrue(snippet.contains("workflow_policy=Provider follow-up policy is active", ignoreCase = true))
        assertTrue(snippet.contains("sla=SLA is breached", ignoreCase = true))
        assertTrue(snippet.contains("stage_timer=Stage timer is overdue", ignoreCase = true))
        assertTrue(snippet.contains("escalation=Escalation is required", ignoreCase = true))
        assertTrue(snippet.contains("automation=Automation blocked", ignoreCase = true))
        assertTrue(snippet.contains("required_human_action=Review workflow policy", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM21PolicyPackOverrideAndSimulationSignals() {
        val response = response(
            executionReceipt = receipt(
                workflowPolicyPackId = "pack_m21_workspace",
                workflowPolicyPackVersion = "v_m21_1",
                workflowPolicyBindingId = "binding_m21_workspace",
                tenantWorkflowOverrideId = "tenant_override_m21",
                workspaceWorkflowOverrideId = "workspace_override_m21",
                workflowPolicyPrecedenceSource = WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
                workflowPolicyResolutionSummary = "Policy resolution used explicit case constraints over workspace/tenant defaults.",
                workflowPolicyResolutionReasonCodes = listOf(
                    "ROLE_WORKFLOW_POLICY_PACK_APPLIED",
                    "ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT",
                    "ROLE_AUTOMATION_SIMULATION_ONLY"
                ),
                workflowSimulationOnly = true,
                workflowPolicyPackSummary = "Workflow policy pack Workspace Ops Pack (v_m21_1) is simulation only.",
                workflowPolicyOverrideSummary = "Workspace override superseded tenant override.",
                workflowAutomationControlSummary = "Automation controls set to simulation-only with max runs/case 0."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 16)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Workflow policy pack:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow override:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow automation controls:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow precedence:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow simulation:", ignoreCase = true) })
        assertTrue(snippet.contains("workflow_pack=pack_m21_workspace", ignoreCase = true))
        assertTrue(snippet.contains("workflow_pack_version=v_m21_1", ignoreCase = true))
        assertTrue(snippet.contains("workflow_precedence=explicit constraint", ignoreCase = true))
        assertTrue(snippet.contains("workflow_simulation=simulation_only", ignoreCase = true))
        assertTrue(snippet.contains("workflow_override=Workspace override superseded tenant override", ignoreCase = true))
        assertTrue(snippet.contains("workflow_controls=Automation controls set to simulation-only", ignoreCase = true))
    }

    @Test
    fun summaryLines_andExport_includeM30ProgramCoordinationSignals() {
        val response = response(
            executionReceipt = receipt().copy(
                programCoordination = com.lumi.coredomain.contract.RolloutProgramCoordinationRecord(
                    programId = "program_alpha",
                    programName = "Program Alpha",
                    priority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                    decisionReason = com.lumi.coredomain.contract.RolloutProgramDecisionReason.PRIORITY_DEFER,
                    priorityDecision = com.lumi.coredomain.contract.RolloutProgramPriorityDecision(
                        decisionId = "decision_m30_1",
                        selectedProgramId = "program_alpha",
                        selectedPriority = com.lumi.coredomain.contract.RolloutProgramPriority.HIGH,
                        deferredProgramIds = listOf("program_beta"),
                        decisionReason = com.lumi.coredomain.contract.RolloutProgramDecisionReason.PRIORITY_WIN,
                        summary = "Program alpha selected due to higher priority."
                    ),
                    coordinationState = com.lumi.coredomain.contract.RolloutProgramCoordinationState.DEFERRED,
                    contention = com.lumi.coredomain.contract.RolloutProgramContentionSummary(
                        type = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                        level = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                        summary = "Window overlap contention detected."
                    ),
                    escalation = com.lumi.coredomain.contract.RolloutProgramEscalationState(
                        status = com.lumi.coredomain.contract.RolloutProgramEscalationStatus.OPEN,
                        reason = com.lumi.coredomain.contract.RolloutProgramEscalationReason.REPEATED_DEFER,
                        summary = "Escalated after repeated defer."
                    ),
                    summary = "Program deferred due to higher-priority overlap."
                ),
                crossProgramGovernanceSummary = com.lumi.coredomain.contract.CrossProgramGovernanceSummary(
                    activeProgramId = "program_alpha",
                    competingProgramCount = 3,
                    deferredProgramCount = 2,
                    blockedProgramCount = 1,
                    escalatedProgramCount = 1,
                    contentionType = com.lumi.coredomain.contract.RolloutProgramContentionType.WINDOW,
                    contentionLevel = com.lumi.coredomain.contract.RolloutProgramContentionLevel.HIGH,
                    summary = "Cross-program contention remains high."
                ),
                programCoordinationSummary = "Program deferred due to higher-priority overlap.",
                crossProgramSummary = "Cross-program contention remains high.",
                programEscalationSummary = "Escalated after repeated defer."
            )
        )

        val lines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 60)
        val snippet = ExecutionReceiptFormatter.exportSnippet(response)

        assertTrue(lines.any { it.contains("Program coordination:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Cross-program summary:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Program escalation:", ignoreCase = true) })
        assertTrue(lines.any { it.contains("priority high", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Program contention:", ignoreCase = true) })
        assertTrue(snippet.contains("program_coordination_state=deferred", ignoreCase = true))
        assertTrue(snippet.contains("program_priority=high", ignoreCase = true))
        assertTrue(snippet.contains("program_decision_reason=priority_defer", ignoreCase = true))
        assertTrue(snippet.contains("program_escalation_state=open", ignoreCase = true))
    }

    private fun response(executionReceipt: ExecutionReceipt?): AgentResponse {
        return AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "Execution receipt formatter test",
            traceId = "trace-receipt-format",
            latencyMs = 25,
            confidence = 0.82,
            module = ModuleId.CHAT,
            status = ResponseStatus.SUCCESS,
            executionReceipt = executionReceipt
        )
    }

    private fun response(
        summary: String,
        executionReceipt: ExecutionReceipt?
    ): AgentResponse {
        return response(executionReceipt = executionReceipt).copy(summary = summary)
    }

    private fun receipt(
        activeRole: UserRole? = UserRole.BUYER,
        roleSource: RoleSource? = RoleSource.USER_PROFILE_DEFAULT,
        delegationMode: DelegationMode? = DelegationMode.AUTONOMOUS_WITHIN_POLICY,
        roleImpactSummary: String = "Role policy applied for this run",
        approvalSummary: String = "No approval gate triggered for this run",
        dataScopeSummary: String = "No additional data-scope restrictions",
        providerSummary: String = "No external provider decision recorded",
        quoteSummary: String = "No external quote comparison was required",
        verificationSummary: String = "No additional verification step required",
        proofSummary: String = "No proof artifacts generated",
        rollbackSummary: String = "No rollback action triggered",
        rolloutSummary: String = "",
        cutoverReadinessSummary: String = "",
        vaultRuntimeSummary: String = "",
        enterpriseFallbackSummary: String = "",
        approvalLoadSummary: String? = null,
        capacityBlockSummary: String? = null,
        policyBlockSummary: String? = null,
        capacityBalancingSummary: String? = null,
        portfolioCapacitySummary: String? = null,
        idpProviderSummary: String = "",
        scimProviderSummary: String = "",
        vaultProviderSummary: String = "",
        workflowPolicySummary: String = "",
        workflowPolicyPackId: String? = null,
        workflowPolicyPackVersion: String? = null,
        workflowPolicyBindingId: String? = null,
        tenantWorkflowOverrideId: String? = null,
        workspaceWorkflowOverrideId: String? = null,
        workflowPolicyPrecedenceSource: WorkflowPolicyPrecedenceSource? = null,
        workflowPolicyResolutionSummary: String? = null,
        workflowPolicyResolutionReasonCodes: List<String> = emptyList(),
        workflowSimulationOnly: Boolean? = null,
        workflowPolicyRolloutState: WorkflowPolicyRolloutState? = null,
        workflowRolloutStage: PolicyRolloutStage? = null,
        workflowRolloutMode: PolicyRolloutMode? = null,
        workflowRolloutScope: PolicyRolloutScope? = null,
        workflowRolloutApprovalState: PolicyRolloutApprovalState? = null,
        workflowRolloutFreezeState: PolicyRolloutFreezeState? = null,
        workflowRolloutSummary: String? = null,
        workflowRolloutApprovalSummary: String? = null,
        workflowRolloutFreezeSummary: String? = null,
        workflowRolloutRollbackSummary: String? = null,
        rolloutWaveSummary: String? = null,
        calendarAwarePromotionSummary: String? = null,
        crossWindowGovernanceSummary: String? = null,
        currentRolloutWaveId: String? = null,
        currentRolloutWaveStatus: RolloutWaveStatus? = null,
        currentRolloutWaveCompletionState: RolloutWaveCompletionState? = null,
        currentRolloutWaveDecision: RolloutWaveDecisionType? = null,
        currentRolloutWindowEligibility: PromotionWindowEligibility? = null,
        rolloutCarryForwardPending: Boolean = false,
        rolloutNextWindowPending: Boolean = false,
        rolloutCrossWindowPaused: Boolean = false,
        rolloutPromotionCandidate: com.lumi.coredomain.contract.RolloutPromotionCandidate? = null,
        rolloutPromotionReadiness: com.lumi.coredomain.contract.RolloutPromotionReadinessSummary? = null,
        crossWaveAnalyticsSummary: com.lumi.coredomain.contract.CrossWaveAnalyticsSummary? = null,
        windowImpactSummary: com.lumi.coredomain.contract.WindowImpactSummary? = null,
        rolloutPromotionOperation: com.lumi.coredomain.contract.RolloutPromotionOperationRecord? = null,
        rolloutPromotionReadinessSummary: String? = null,
        crossWaveSummary: String? = null,
        windowImpactReadableSummary: String? = null,
        rolloutPromotionOperationSummary: String? = null,
        policyPromotionStatus: PolicyPromotionStatus? = null,
        policyPromotionSummary: String? = null,
        policyPromotionReadinessSummary: String? = null,
        policyPromotionBlockerSummary: String? = null,
        policyPromotionRecommendationSummary: String? = null,
        policyPromotionReadiness: PromotionReadinessResult? = null,
        policyRolloutAnalytics: RolloutAnalyticsSummary? = null,
        policyApprovalReviewSummary: ApprovalReviewSummary? = null,
        workflowPolicyGovernanceProgram: PolicyGovernanceProgram? = null,
        workflowCrossTenantRolloutSummary: CrossTenantRolloutSummary? = null,
        workflowPackLifecycleStatus: WorkflowPolicyPackLifecycleStatus? = null,
        workflowPackReplacementPlan: WorkflowPolicyPackReplacementPlan? = null,
        workflowProgramSummary: String? = null,
        workflowCrossTenantSummary: String? = null,
        workflowPackLifecycleSummary: String? = null,
        workflowPackDeprecationSummary: String? = null,
        workflowPackRetirementSummary: String? = null,
        workflowPackReplacementSummary: String? = null,
        workflowPolicyPackSummary: String? = null,
        workflowPolicyOverrideSummary: String? = null,
        workflowAutomationControlSummary: String? = null,
        policyEstateSnapshot: PolicyEstateSnapshot? = null,
        policyEstateSummary: String? = null,
        policyEstateDriftSummary: String? = null,
        policyEstateBlockerSummary: String? = null,
        policyEstateRemediationSummary: String? = null,
        policyEstateRemediationPlan: PolicyEstateRemediationPlan? = null,
        policyEstateRemediationActions: List<PolicyEstateRemediationActionRecord> = emptyList(),
        estateAutomationRule: EstateAutomationRule? = null,
        estateAutomationEligibility: EstateAutomationEligibility? = null,
        scheduledRemediationPlan: ScheduledRemediationPlan? = null,
        governanceProgramOperations: List<GovernanceProgramOperation> = emptyList(),
        automationReplaySummary: AutomationReplaySummary? = null,
        automationCancellationRecords: List<AutomationCancellationRecord> = emptyList(),
        slaSummary: String = "",
        stageTimerSummary: String = "",
        escalationTimerSummary: String = "",
        automationGuardrailSummary: String = "",
        automationSuppressionSummary: String = "",
        nextRequiredHumanAction: String? = null,
        slaStatus: WorkflowSlaStatus? = null,
        stageTimerStatus: WorkflowStageTimerStatus? = null,
        escalationTimerStatus: WorkflowEscalationTimerStatus? = null,
        automationEligibility: WorkflowAutomationEligibilityStatus? = null,
        issueSummary: String? = null,
        providerSelectionSummary: ProviderSelectionSummary? = null,
        providerPolicyDecisions: List<ProviderPolicyDecision> = emptyList(),
        externalApprovalSummary: ExternalApprovalSummary? = null,
        externalDataScopeSummary: ExternalDataScopeSummary? = null,
        externalVerificationSummary: ExternalVerificationSummary? = null,
        externalDisputeSummary: ExternalDisputeSummary? = null,
        externalSettlementSummary: ExternalSettlementSummary? = null,
        reconciliationSummary: MarketplaceReconciliationSummary? = null,
        portfolioOptimizationDecisionId: String? = null,
        portfolioOptimizationResultId: String? = null,
        portfolioCalibrationSnapshotId: String? = null,
        portfolioObjectiveProfileSnapshotId: String? = null,
        portfolioObjectiveProfileScope: com.lumi.coredomain.contract.PortfolioOptimizationLearningScope? = null,
        portfolioObjectiveProfileProvenance: com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileProvenanceType? = null,
        portfolioObjectiveProfileSummary: String? = null,
        portfolioLearningSummary: String? = null,
        portfolioDriftSummary: String? = null,
        portfolioDriftSeverity: PortfolioDriftSeverity? = null,
        portfolioTuningSummary: String? = null,
        portfolioTuningStatus: PortfolioOptimizationTuningStatus? = null,
        portfolioPropagationSummary: String? = null,
        portfolioPropagationStatus: com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus? = null,
        portfolioPropagationReviewRequired: Boolean = false,
        portfolioLearningSyncMode: com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode? = null,
        portfolioLearningSyncStatus: com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus? = null,
        portfolioLearningSyncConflictResolution:
            com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictResolution? = null,
        portfolioLearningSyncReviewRequired: Boolean = false,
        portfolioLearningSyncSummary: String? = null,
        portfolioLearningSyncBoundarySummary: String? = null,
        portfolioLearningSyncPrivacySummary: String? = null,
        portfolioLearningSyncConsentDecision:
            com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision? = null,
        portfolioRemoteTransportStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus? = null,
        portfolioRemoteDestinationStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionStatus? = null,
        portfolioRemoteDestinationType:
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationType? = null,
        portfolioResidencyRegion:
            com.lumi.coredomain.contract.PortfolioOptimizationResidencyRegion? = null,
        portfolioJurisdiction:
            com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction? = null,
        portfolioRemoteTransportConnectorType:
            com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType? = null,
        portfolioEnterpriseKeyStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus? = null,
        portfolioComplianceGateDecision:
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceGateDecision? = null,
        portfolioRemoteTransportLocalFallbackUsed: Boolean = false,
        portfolioRemoteTransportDeadLettered: Boolean = false,
        portfolioComplianceAuditExportStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus? = null,
        portfolioDataExchangeBundleType:
            com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundleType? = null,
        portfolioDataExchangeDecisionStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionStatus? = null,
        portfolioDataExchangeApprovalStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalStatus? = null,
        portfolioCrossBoundaryAuditOperationType:
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditOperationType? = null,
        portfolioCrossBoundaryAuditResult:
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditResult? = null,
        portfolioLearningConsentSummary: String? = null,
        portfolioRemoteTransportSummary: String? = null,
        portfolioRemoteDestinationSummary: String? = null,
        portfolioResidencySummary: String? = null,
        portfolioRemoteTransportConnectorSummary: String? = null,
        portfolioEnterpriseKeySummary: String? = null,
        portfolioComplianceGateSummary: String? = null,
        portfolioComplianceAuditExportSummary: String? = null,
        portfolioComplianceExportRouteSummary: String? = null,
        portfolioDataExchangeBundleSummary: String? = null,
        portfolioDataExchangeBoundarySummary: String? = null,
        portfolioDataExchangeApprovalSummary: String? = null,
        portfolioCrossBoundaryAuditSummary: String? = null,
        portfolioGovernancePortfolioStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus? = null,
        portfolioDestinationTrustTier:
            com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier? = null,
        portfolioCrossBoundaryProgramStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramStatus? = null,
        portfolioTrustTierRolloutState:
            com.lumi.coredomain.contract.PortfolioOptimizationTrustTierRolloutState? = null,
        portfolioJurisdictionRolloutState:
            com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutState? = null,
        portfolioGovernancePriority:
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriority? = null,
        portfolioRecommendationAction:
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRecommendationAction? = null,
        portfolioHealthStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioHealthStatus? = null,
        portfolioTrajectoryState:
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioTrajectoryState? = null,
        portfolioRiskBudgetStatus:
            com.lumi.coredomain.contract.PortfolioOptimizationRiskBudgetStatus? = null,
        portfolioSafetyState:
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyState? = null,
        portfolioBudgetGuardrailState:
            com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrailState? = null,
        portfolioEnforcementMode:
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioEnforcementMode? = null,
        portfolioRemediationAutomationState:
            com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationState? = null,
        portfolioTrustTierDriftState:
            com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftState? = null,
        portfolioJurisdictionDriftState:
            com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftState? = null,
        portfolioRiskRecommendationAction:
            com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendationAction? = null,
        portfolioCorrectiveActionType:
            com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType? = null,
        portfolioRiskBudgetBreached: Boolean = false,
        portfolioQuarantined: Boolean = false,
        portfolioRemediationApprovalRequired: Boolean = false,
        portfolioSharedBlockerCount: Int = 0,
        portfolioConflictCount: Int = 0,
        portfolioGovernanceAnalyticsSummary: String? = null,
        portfolioTrustTierDriftSummary: String? = null,
        portfolioJurisdictionDriftSummary: String? = null,
        portfolioRiskBudgetSummary: String? = null,
        portfolioSafetySummary: String? = null,
        portfolioSafetyRailSummary: String? = null,
        portfolioBudgetGuardrailSummary: String? = null,
        portfolioRemediationAutomationSummary: String? = null,
        portfolioDestinationRiskConcentrationSummary: String? = null,
        portfolioBlockerTrendSummary: String? = null,
        portfolioRiskRecommendationSummary: String? = null,
        portfolioCorrectiveActionSummary: String? = null,
        portfolioGovernanceSummary: String? = null,
        portfolioTrustTierProgramSummary: String? = null,
        portfolioJurisdictionRolloutSummary: String? = null,
        portfolioGovernanceBlockerSummary: String? = null,
        portfolioGovernanceDependencySummary: String? = null,
        portfolioGovernanceConflictSummary: String? = null,
        portfolioGovernanceRecommendationSummary: String? = null,
        portfolioEnterprisePrivacySummary: String? = null,
        portfolioFederatedAggregationSummary: String? = null
    ): ExecutionReceipt {
        return ExecutionReceipt(
            runId = "trace-receipt-format",
            intentSummary = "Validate formatter output",
            status = ResponseStatus.SUCCESS,
            activeRole = activeRole,
            roleSource = roleSource,
            delegationMode = delegationMode,
            roleImpactSummary = roleImpactSummary,
            approvalSummary = approvalSummary,
            dataScopeSummary = dataScopeSummary,
            providerSummary = providerSummary,
            quoteSummary = quoteSummary,
            verificationSummary = verificationSummary,
            proofSummary = proofSummary,
            rollbackSummary = rollbackSummary,
            rolloutSummary = rolloutSummary,
            cutoverReadinessSummary = cutoverReadinessSummary,
            vaultRuntimeSummary = vaultRuntimeSummary,
            enterpriseFallbackSummary = enterpriseFallbackSummary,
            approvalLoadSummary = approvalLoadSummary,
            capacityBlockSummary = capacityBlockSummary,
            policyBlockSummary = policyBlockSummary,
            capacityBalancingSummary = capacityBalancingSummary,
            portfolioCapacitySummary = portfolioCapacitySummary,
            idpProviderSummary = idpProviderSummary,
            scimProviderSummary = scimProviderSummary,
            vaultProviderSummary = vaultProviderSummary,
            workflowPolicySummary = workflowPolicySummary,
            workflowPolicyPackId = workflowPolicyPackId,
            workflowPolicyPackVersion = workflowPolicyPackVersion,
            workflowPolicyBindingId = workflowPolicyBindingId,
            tenantWorkflowOverrideId = tenantWorkflowOverrideId,
            workspaceWorkflowOverrideId = workspaceWorkflowOverrideId,
            workflowPolicyPrecedenceSource = workflowPolicyPrecedenceSource,
            workflowPolicyResolutionSummary = workflowPolicyResolutionSummary,
            workflowPolicyResolutionReasonCodes = workflowPolicyResolutionReasonCodes,
            workflowSimulationOnly = workflowSimulationOnly,
            workflowPolicyRolloutState = workflowPolicyRolloutState,
            workflowRolloutStage = workflowRolloutStage,
            workflowRolloutMode = workflowRolloutMode,
            workflowRolloutScope = workflowRolloutScope,
            workflowRolloutApprovalState = workflowRolloutApprovalState,
            workflowRolloutFreezeState = workflowRolloutFreezeState,
            workflowRolloutSummary = workflowRolloutSummary,
            workflowRolloutApprovalSummary = workflowRolloutApprovalSummary,
            workflowRolloutFreezeSummary = workflowRolloutFreezeSummary,
            workflowRolloutRollbackSummary = workflowRolloutRollbackSummary,
            rolloutWaveSummary = rolloutWaveSummary.orEmpty(),
            calendarAwarePromotionSummary = calendarAwarePromotionSummary.orEmpty(),
            crossWindowGovernanceSummary = crossWindowGovernanceSummary.orEmpty(),
            currentRolloutWaveId = currentRolloutWaveId,
            currentRolloutWaveStatus = currentRolloutWaveStatus,
            currentRolloutWaveCompletionState = currentRolloutWaveCompletionState,
            currentRolloutWaveDecision = currentRolloutWaveDecision,
            currentRolloutWindowEligibility = currentRolloutWindowEligibility,
            rolloutCarryForwardPending = rolloutCarryForwardPending,
            rolloutNextWindowPending = rolloutNextWindowPending,
            rolloutCrossWindowPaused = rolloutCrossWindowPaused,
            rolloutPromotionCandidate = rolloutPromotionCandidate,
            rolloutPromotionReadiness = rolloutPromotionReadiness,
            crossWaveAnalyticsSummary = crossWaveAnalyticsSummary,
            windowImpactSummary = windowImpactSummary,
            rolloutPromotionOperation = rolloutPromotionOperation,
            rolloutPromotionReadinessSummary = rolloutPromotionReadinessSummary,
            crossWaveSummary = crossWaveSummary,
            windowImpactReadableSummary = windowImpactReadableSummary,
            rolloutPromotionOperationSummary = rolloutPromotionOperationSummary,
            policyPromotionStatus = policyPromotionStatus,
            policyPromotionSummary = policyPromotionSummary,
            policyPromotionReadinessSummary = policyPromotionReadinessSummary,
            policyPromotionBlockerSummary = policyPromotionBlockerSummary,
            policyPromotionRecommendationSummary = policyPromotionRecommendationSummary,
            policyPromotionReadiness = policyPromotionReadiness,
            policyRolloutAnalytics = policyRolloutAnalytics,
            policyApprovalReviewSummary = policyApprovalReviewSummary,
            workflowPolicyGovernanceProgram = workflowPolicyGovernanceProgram,
            workflowCrossTenantRolloutSummary = workflowCrossTenantRolloutSummary,
            workflowPackLifecycleStatus = workflowPackLifecycleStatus,
            workflowPackReplacementPlan = workflowPackReplacementPlan,
            workflowProgramSummary = workflowProgramSummary,
            workflowCrossTenantSummary = workflowCrossTenantSummary,
            workflowPackLifecycleSummary = workflowPackLifecycleSummary,
            workflowPackDeprecationSummary = workflowPackDeprecationSummary,
            workflowPackRetirementSummary = workflowPackRetirementSummary,
            workflowPackReplacementSummary = workflowPackReplacementSummary,
            workflowPolicyPackSummary = workflowPolicyPackSummary,
            workflowPolicyOverrideSummary = workflowPolicyOverrideSummary,
            workflowAutomationControlSummary = workflowAutomationControlSummary,
            policyEstateSnapshot = policyEstateSnapshot,
            policyEstateSummary = policyEstateSummary,
            policyEstateDriftSummary = policyEstateDriftSummary,
            policyEstateBlockerSummary = policyEstateBlockerSummary,
            policyEstateRemediationSummary = policyEstateRemediationSummary,
            policyEstateRemediationPlan = policyEstateRemediationPlan,
            policyEstateRemediationActions = policyEstateRemediationActions,
            estateAutomationRule = estateAutomationRule,
            estateAutomationEligibility = estateAutomationEligibility,
            scheduledRemediationPlan = scheduledRemediationPlan,
            governanceProgramOperations = governanceProgramOperations,
            automationReplaySummary = automationReplaySummary,
            automationCancellationRecords = automationCancellationRecords,
            slaSummary = slaSummary,
            stageTimerSummary = stageTimerSummary,
            escalationTimerSummary = escalationTimerSummary,
            automationGuardrailSummary = automationGuardrailSummary,
            automationSuppressionSummary = automationSuppressionSummary,
            nextRequiredHumanAction = nextRequiredHumanAction,
            slaStatus = slaStatus,
            stageTimerStatus = stageTimerStatus,
            escalationTimerStatus = escalationTimerStatus,
            automationEligibility = automationEligibility,
            startedAt = 1_700_000_000_000,
            updatedAt = 1_700_000_000_500,
            completedAt = 1_700_000_001_000,
            issueSummary = issueSummary,
            providerSelectionSummary = providerSelectionSummary,
            providerPolicyDecisions = providerPolicyDecisions,
            portfolioOptimizationDecisionId = portfolioOptimizationDecisionId,
            portfolioOptimizationResultId = portfolioOptimizationResultId,
            portfolioCalibrationSnapshotId = portfolioCalibrationSnapshotId,
            portfolioObjectiveProfileSnapshotId = portfolioObjectiveProfileSnapshotId,
            portfolioObjectiveProfileScope = portfolioObjectiveProfileScope,
            portfolioObjectiveProfileProvenance = portfolioObjectiveProfileProvenance,
            portfolioObjectiveProfileSummary = portfolioObjectiveProfileSummary,
            portfolioLearningSummary = portfolioLearningSummary,
            portfolioDriftSummary = portfolioDriftSummary,
            portfolioDriftSeverity = portfolioDriftSeverity,
            portfolioTuningSummary = portfolioTuningSummary,
            portfolioTuningStatus = portfolioTuningStatus,
            portfolioPropagationSummary = portfolioPropagationSummary,
            portfolioPropagationStatus = portfolioPropagationStatus,
            portfolioPropagationReviewRequired = portfolioPropagationReviewRequired,
            portfolioLearningSyncMode = portfolioLearningSyncMode,
            portfolioLearningSyncStatus = portfolioLearningSyncStatus,
            portfolioLearningSyncConflictResolution = portfolioLearningSyncConflictResolution,
            portfolioLearningSyncReviewRequired = portfolioLearningSyncReviewRequired,
            portfolioLearningSyncSummary = portfolioLearningSyncSummary,
            portfolioLearningSyncBoundarySummary = portfolioLearningSyncBoundarySummary,
            portfolioLearningSyncPrivacySummary = portfolioLearningSyncPrivacySummary,
            portfolioLearningSyncConsentDecision = portfolioLearningSyncConsentDecision,
            portfolioRemoteTransportStatus = portfolioRemoteTransportStatus,
            portfolioRemoteDestinationStatus = portfolioRemoteDestinationStatus,
            portfolioRemoteDestinationType = portfolioRemoteDestinationType,
            portfolioResidencyRegion = portfolioResidencyRegion,
            portfolioJurisdiction = portfolioJurisdiction,
            portfolioRemoteTransportConnectorType = portfolioRemoteTransportConnectorType,
            portfolioEnterpriseKeyStatus = portfolioEnterpriseKeyStatus,
            portfolioComplianceGateDecision = portfolioComplianceGateDecision,
            portfolioRemoteTransportLocalFallbackUsed = portfolioRemoteTransportLocalFallbackUsed,
            portfolioRemoteTransportDeadLettered = portfolioRemoteTransportDeadLettered,
            portfolioComplianceAuditExportStatus = portfolioComplianceAuditExportStatus,
            portfolioDataExchangeVisibility =
                com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeVisibilitySummary(
                    bundleType = portfolioDataExchangeBundleType,
                    decisionStatus = portfolioDataExchangeDecisionStatus,
                    approvalStatus = portfolioDataExchangeApprovalStatus,
                    crossBoundaryAuditOperationType = portfolioCrossBoundaryAuditOperationType,
                    crossBoundaryAuditResult = portfolioCrossBoundaryAuditResult,
                    governancePortfolioStatus = portfolioGovernancePortfolioStatus,
                    destinationTrustTier = portfolioDestinationTrustTier,
                    crossBoundaryProgramStatus = portfolioCrossBoundaryProgramStatus,
                    trustTierRolloutState = portfolioTrustTierRolloutState,
                    jurisdictionRolloutState = portfolioJurisdictionRolloutState,
                    portfolioPriority = portfolioGovernancePriority,
                    portfolioRecommendationAction = portfolioRecommendationAction,
                    portfolioHealthStatus = portfolioHealthStatus,
                    portfolioTrajectoryState = portfolioTrajectoryState,
                    riskBudgetStatus = portfolioRiskBudgetStatus,
                    portfolioSafetyState = portfolioSafetyState,
                    budgetGuardrailState = portfolioBudgetGuardrailState,
                    enforcementMode = portfolioEnforcementMode,
                    remediationAutomationState = portfolioRemediationAutomationState,
                    trustTierDriftState = portfolioTrustTierDriftState,
                    jurisdictionDriftState = portfolioJurisdictionDriftState,
                    portfolioRiskRecommendationAction = portfolioRiskRecommendationAction,
                    correctiveActionType = portfolioCorrectiveActionType,
                    riskBudgetBreached = portfolioRiskBudgetBreached,
                    quarantined = portfolioQuarantined,
                    approvalRequired = portfolioRemediationApprovalRequired,
                    sharedBlockerCount = portfolioSharedBlockerCount,
                    conflictCount = portfolioConflictCount,
                    bundleSummary = portfolioDataExchangeBundleSummary,
                    boundarySummary = portfolioDataExchangeBoundarySummary,
                    approvalSummary = portfolioDataExchangeApprovalSummary,
                    crossBoundaryAuditSummary = portfolioCrossBoundaryAuditSummary,
                    analyticsSummary = portfolioGovernanceAnalyticsSummary,
                    trustTierDriftSummary = portfolioTrustTierDriftSummary,
                    jurisdictionDriftSummary = portfolioJurisdictionDriftSummary,
                    riskBudgetSummary = portfolioRiskBudgetSummary,
                    portfolioSafetySummary = portfolioSafetySummary,
                    portfolioSafetyRailSummary = portfolioSafetyRailSummary,
                    budgetGuardrailSummary = portfolioBudgetGuardrailSummary,
                    remediationAutomationSummary = portfolioRemediationAutomationSummary,
                    destinationRiskConcentrationSummary = portfolioDestinationRiskConcentrationSummary,
                    portfolioBlockerTrendSummary = portfolioBlockerTrendSummary,
                    portfolioRiskRecommendationSummary = portfolioRiskRecommendationSummary,
                    portfolioCorrectiveActionSummary = portfolioCorrectiveActionSummary,
                    governancePortfolioSummary = portfolioGovernanceSummary,
                    trustTierProgramSummary = portfolioTrustTierProgramSummary,
                    jurisdictionRolloutSummary = portfolioJurisdictionRolloutSummary,
                    portfolioBlockerSummary = portfolioGovernanceBlockerSummary,
                    portfolioDependencySummary = portfolioGovernanceDependencySummary,
                    portfolioConflictSummary = portfolioGovernanceConflictSummary,
                    portfolioRecommendationSummary = portfolioGovernanceRecommendationSummary
                ),
            portfolioLearningConsentSummary = portfolioLearningConsentSummary,
            portfolioRemoteTransportSummary = portfolioRemoteTransportSummary,
            portfolioRemoteDestinationSummary = portfolioRemoteDestinationSummary,
            portfolioResidencySummary = portfolioResidencySummary,
            portfolioRemoteTransportConnectorSummary = portfolioRemoteTransportConnectorSummary,
            portfolioEnterpriseKeySummary = portfolioEnterpriseKeySummary,
            portfolioComplianceGateSummary = portfolioComplianceGateSummary,
            portfolioComplianceAuditExportSummary = portfolioComplianceAuditExportSummary,
            portfolioComplianceExportRouteSummary = portfolioComplianceExportRouteSummary,
            portfolioEnterprisePrivacySummary = portfolioEnterprisePrivacySummary,
            portfolioFederatedAggregationSummary = portfolioFederatedAggregationSummary,
            externalApprovalSummary = externalApprovalSummary,
            externalDataScopeSummary = externalDataScopeSummary,
            externalVerificationSummary = externalVerificationSummary,
            externalDisputeSummary = externalDisputeSummary,
            externalSettlementSummary = externalSettlementSummary,
            reconciliationSummary = reconciliationSummary
        )
    }
}

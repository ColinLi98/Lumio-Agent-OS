package com.lumi.keyboard.state

import android.content.Context
import com.lumi.coreagent.orchestrator.DynamicStatePersistencePort
import com.lumi.coreagent.orchestrator.PersistedDynamicState
import com.lumi.coredomain.contract.AlertDeliveryRecord
import com.lumi.coredomain.contract.AlertRoutingRecord
import com.lumi.coredomain.contract.ConnectorAuthProfile
import com.lumi.coredomain.contract.ConnectorDestination
import com.lumi.coredomain.contract.ConnectorRouteBinding
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.ExternalFulfillmentPreference
import com.lumi.coredomain.contract.GovernanceCaseCollaborationState
import com.lumi.coredomain.contract.L1CoreStatePayload
import com.lumi.coredomain.contract.L2ContextStatePayload
import com.lumi.coredomain.contract.L3EmotionStatePayload
import com.lumi.coredomain.contract.ReconciliationJobRecord
import com.lumi.coredomain.contract.RemoteOperatorDirectoryEntry
import com.lumi.coredomain.contract.RemoteOperatorHandoffRecord
import com.lumi.coredomain.contract.PortfolioScenarioComparison
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioOptimizationCalibrationSnapshot
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult
import com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryApprovalRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryAuditRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryGovernancePortfolio
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryProgramRecord
import com.lumi.coredomain.contract.PortfolioOptimizationDataExchangeManifest
import com.lumi.coredomain.contract.PortfolioOptimizationDestinationRiskConcentrationSummary
import com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationDestinationBundleDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTierAssignment
import com.lumi.coredomain.contract.PortfolioOptimizationDriftSummary
import com.lumi.coredomain.contract.PortfolioOptimizationFederatedAggregationSummary
import com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionRolloutPlan
import com.lumi.coredomain.contract.PortfolioOptimizationJurisdictionDriftSummary
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncConflictRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncEnvelope
import com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfileSnapshot
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerSummary
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioBlockerTrendSummary
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioConflictSummary
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioCoordinationRecommendation
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioDependencySummary
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioPriorityDecision
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioRiskRecommendation
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetyRail
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioSafetySummary
import com.lumi.coredomain.contract.PortfolioOptimizationPortfolioWaveCoordinationRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationAdoptionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationBudgetGuardrail
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningBatch
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningEnvelope
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceExportRouteRecord
import com.lumi.coredomain.contract.PortfolioOptimizationRemediationAutomationControl
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteDestinationProfile
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportDeadLetterRecord
import com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyReference
import com.lumi.coredomain.contract.PortfolioOptimizationRiskBudget
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationResult
import com.lumi.coredomain.contract.PortfolioOptimizationSafeDestinationBundle
import com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationTuningSuggestion
import com.lumi.coredomain.contract.PortfolioOptimizationTrustTierDriftSummary
import com.lumi.coredomain.contract.PortfolioOptimizationTrustTierProgramSummary
import com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.RolePolicyProfile
import com.lumi.coredomain.contract.RoleScopedApprovalPolicy
import com.lumi.coredomain.contract.RoleScopedDataPolicy
import com.lumi.coredomain.contract.RoleScopedDelegationPolicy
import com.lumi.coredomain.contract.RoleScopedPreferences
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.TelemetryEmissionRecord
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import org.json.JSONArray
import org.json.JSONObject

class SharedPrefsDynamicStateStore(
    context: Context
) : DynamicStatePersistencePort {

    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    override fun load(userId: String): PersistedDynamicState? {
        if (userId.isBlank()) return null
        val stateRaw = prefs.getString(stateKey(userId), null)
        val stateBackupRaw = prefs.getString(stateBackupKey(userId), null)
        val trajectoryRaw = prefs.getString(trajectoryKey(userId), null)
        val trajectoryBackupRaw = prefs.getString(trajectoryBackupKey(userId), null)
        val activeRoleRaw = prefs.getString(activeRoleKey(userId), null)
        val roleSourceRaw = prefs.getString(roleSourceKey(userId), null)
        val rolePolicyOverridesRaw = prefs.getString(rolePolicyOverridesKey(userId), null)
        val executionLedgerRaw = prefs.getString(executionLedgerKey(userId), null)
        val telemetryEmissionRaw = prefs.getString(telemetryEmissionKey(userId), null)
        val alertDeliveryRaw = prefs.getString(alertDeliveryKey(userId), null)
        val reconciliationJobsRaw = prefs.getString(reconciliationJobsKey(userId), null)
        val collaborationStatesRaw = prefs.getString(collaborationStatesKey(userId), null)
        val remoteOperatorHandoffRaw = prefs.getString(remoteOperatorHandoffKey(userId), null)
        val alertRoutingRaw = prefs.getString(alertRoutingKey(userId), null)
        val remoteDirectoryRaw = prefs.getString(remoteDirectoryKey(userId), null)
        val connectorDestinationsRaw = prefs.getString(connectorDestinationsKey(userId), null)
        val connectorAuthProfilesRaw = prefs.getString(connectorAuthProfilesKey(userId), null)
        val connectorRouteBindingsRaw = prefs.getString(connectorRouteBindingsKey(userId), null)
        val portfolioScenariosRaw = prefs.getString(portfolioScenariosKey(userId), null)
        val portfolioSimulationRunsRaw = prefs.getString(portfolioSimulationRunsKey(userId), null)
        val portfolioScenarioComparisonsRaw = prefs.getString(portfolioScenarioComparisonsKey(userId), null)
        val portfolioOptimizationObjectiveProfileSnapshotsRaw =
            prefs.getString(portfolioOptimizationObjectiveProfileSnapshotsKey(userId), null)
        val portfolioOptimizationCalibrationSnapshotsRaw =
            prefs.getString(portfolioOptimizationCalibrationSnapshotsKey(userId), null)
        val portfolioOptimizationRequestsRaw = prefs.getString(portfolioOptimizationRequestsKey(userId), null)
        val portfolioOptimizationResultsRaw = prefs.getString(portfolioOptimizationResultsKey(userId), null)
        val portfolioOptimizationDecisionsRaw = prefs.getString(portfolioOptimizationDecisionsKey(userId), null)
        val portfolioOptimizationOutcomesRaw = prefs.getString(portfolioOptimizationOutcomesKey(userId), null)
        val portfolioOptimizationDriftsRaw = prefs.getString(portfolioOptimizationDriftsKey(userId), null)
        val portfolioOptimizationTuningSuggestionsRaw =
            prefs.getString(portfolioOptimizationTuningSuggestionsKey(userId), null)
        val portfolioOptimizationTuningDecisionsRaw =
            prefs.getString(portfolioOptimizationTuningDecisionsKey(userId), null)
        val portfolioOptimizationPropagationAttemptsRaw =
            prefs.getString(portfolioOptimizationPropagationAttemptsKey(userId), null)
        val portfolioOptimizationPropagationApprovalsRaw =
            prefs.getString(portfolioOptimizationPropagationApprovalsKey(userId), null)
        val portfolioOptimizationPropagationAdoptionsRaw =
            prefs.getString(portfolioOptimizationPropagationAdoptionsKey(userId), null)
        val portfolioOptimizationLearningSyncEnvelopesRaw =
            prefs.getString(portfolioOptimizationLearningSyncEnvelopesKey(userId), null)
        val portfolioOptimizationLearningSyncAttemptsRaw =
            prefs.getString(portfolioOptimizationLearningSyncAttemptsKey(userId), null)
        val portfolioOptimizationLearningSyncConflictsRaw =
            prefs.getString(portfolioOptimizationLearningSyncConflictsKey(userId), null)
        val portfolioOptimizationConsentRecordsRaw =
            prefs.getString(portfolioOptimizationConsentRecordsKey(userId), null)
        val portfolioOptimizationRemoteLearningEnvelopesRaw =
            prefs.getString(portfolioOptimizationRemoteLearningEnvelopesKey(userId), null)
        val portfolioOptimizationRemoteLearningBatchesRaw =
            prefs.getString(portfolioOptimizationRemoteLearningBatchesKey(userId), null)
        val portfolioOptimizationRemoteLearningTransportAttemptsRaw =
            prefs.getString(portfolioOptimizationRemoteLearningTransportAttemptsKey(userId), null)
        val portfolioOptimizationRemoteDestinationProfilesRaw =
            prefs.getString(portfolioOptimizationRemoteDestinationProfilesKey(userId), null)
        val portfolioOptimizationRemoteDestinationDecisionRecordsRaw =
            prefs.getString(portfolioOptimizationRemoteDestinationDecisionRecordsKey(userId), null)
        val portfolioOptimizationRemoteTransportConnectorProfilesRaw =
            prefs.getString(portfolioOptimizationRemoteTransportConnectorProfilesKey(userId), null)
        val portfolioOptimizationEnterpriseKeyReferencesRaw =
            prefs.getString(portfolioOptimizationEnterpriseKeyReferencesKey(userId), null)
        val portfolioOptimizationRemoteTransportDeadLettersRaw =
            prefs.getString(portfolioOptimizationRemoteTransportDeadLetterRecordsKey(userId), null)
        val portfolioOptimizationComplianceAuditExportRequestsRaw =
            prefs.getString(portfolioOptimizationComplianceAuditExportRequestsKey(userId), null)
        val portfolioOptimizationComplianceAuditExportResultsRaw =
            prefs.getString(portfolioOptimizationComplianceAuditExportResultsKey(userId), null)
        val portfolioOptimizationComplianceExportRouteRecordsRaw =
            prefs.getString(portfolioOptimizationComplianceExportRouteRecordsKey(userId), null)
        val portfolioOptimizationDataExchangeBundlesRaw =
            prefs.getString(portfolioOptimizationDataExchangeBundlesKey(userId), null)
        val portfolioOptimizationDataExchangeBundleDecisionRecordsRaw =
            prefs.getString(portfolioOptimizationDataExchangeBundleDecisionRecordsKey(userId), null)
        val portfolioOptimizationDataExchangeManifestsRaw =
            prefs.getString(portfolioOptimizationDataExchangeManifestsKey(userId), null)
        val portfolioOptimizationCrossBoundaryApprovalRecordsRaw =
            prefs.getString(portfolioOptimizationCrossBoundaryApprovalRecordsKey(userId), null)
        val portfolioOptimizationCrossBoundaryAuditRecordsRaw =
            prefs.getString(portfolioOptimizationCrossBoundaryAuditRecordsKey(userId), null)
        val portfolioOptimizationDestinationTrustTierAssignmentsRaw =
            prefs.getString(portfolioOptimizationDestinationTrustTierAssignmentsKey(userId), null)
        val portfolioOptimizationCrossBoundaryProgramRecordsRaw =
            prefs.getString(portfolioOptimizationCrossBoundaryProgramRecordsKey(userId), null)
        val portfolioOptimizationCrossBoundaryGovernancePortfoliosRaw =
            prefs.getString(portfolioOptimizationCrossBoundaryGovernancePortfoliosKey(userId), null)
        val portfolioOptimizationTrustTierProgramSummariesRaw =
            prefs.getString(portfolioOptimizationTrustTierProgramSummariesKey(userId), null)
        val portfolioOptimizationJurisdictionRolloutPlansRaw =
            prefs.getString(portfolioOptimizationJurisdictionRolloutPlansKey(userId), null)
        val portfolioOptimizationPortfolioBlockerSummariesRaw =
            prefs.getString(portfolioOptimizationPortfolioBlockerSummariesKey(userId), null)
        val portfolioOptimizationPortfolioDependencySummariesRaw =
            prefs.getString(portfolioOptimizationPortfolioDependencySummariesKey(userId), null)
        val portfolioOptimizationPortfolioConflictSummariesRaw =
            prefs.getString(portfolioOptimizationPortfolioConflictSummariesKey(userId), null)
        val portfolioOptimizationPortfolioPriorityDecisionsRaw =
            prefs.getString(portfolioOptimizationPortfolioPriorityDecisionsKey(userId), null)
        val portfolioOptimizationPortfolioCoordinationRecommendationsRaw =
            prefs.getString(portfolioOptimizationPortfolioCoordinationRecommendationsKey(userId), null)
        val portfolioOptimizationPortfolioWaveCoordinationRecordsRaw =
            prefs.getString(portfolioOptimizationPortfolioWaveCoordinationRecordsKey(userId), null)
        val portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesRaw =
            prefs.getString(portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesKey(userId), null)
        val portfolioOptimizationRiskBudgetsRaw =
            prefs.getString(portfolioOptimizationRiskBudgetsKey(userId), null)
        val portfolioOptimizationTrustTierDriftSummariesRaw =
            prefs.getString(portfolioOptimizationTrustTierDriftSummariesKey(userId), null)
        val portfolioOptimizationJurisdictionDriftSummariesRaw =
            prefs.getString(portfolioOptimizationJurisdictionDriftSummariesKey(userId), null)
        val portfolioOptimizationDestinationRiskConcentrationSummariesRaw =
            prefs.getString(portfolioOptimizationDestinationRiskConcentrationSummariesKey(userId), null)
        val portfolioOptimizationPortfolioBlockerTrendSummariesRaw =
            prefs.getString(portfolioOptimizationPortfolioBlockerTrendSummariesKey(userId), null)
        val portfolioOptimizationPortfolioRiskRecommendationsRaw =
            prefs.getString(portfolioOptimizationPortfolioRiskRecommendationsKey(userId), null)
        val portfolioOptimizationCrossBoundaryCorrectiveActionRecordsRaw =
            prefs.getString(portfolioOptimizationCrossBoundaryCorrectiveActionRecordsKey(userId), null)
        val portfolioOptimizationPortfolioSafetyRailsRaw =
            prefs.getString(portfolioOptimizationPortfolioSafetyRailsKey(userId), null)
        val portfolioOptimizationBudgetGuardrailsRaw =
            prefs.getString(portfolioOptimizationBudgetGuardrailsKey(userId), null)
        val portfolioOptimizationPortfolioSafetySummariesRaw =
            prefs.getString(portfolioOptimizationPortfolioSafetySummariesKey(userId), null)
        val portfolioOptimizationRemediationAutomationControlsRaw =
            prefs.getString(portfolioOptimizationRemediationAutomationControlsKey(userId), null)
        val portfolioOptimizationFederatedAggregationRaw =
            prefs.getString(portfolioOptimizationFederatedAggregationKey(userId), null)

        if (
            stateRaw == null &&
            trajectoryRaw == null &&
            stateBackupRaw == null &&
            trajectoryBackupRaw == null &&
            activeRoleRaw == null &&
            roleSourceRaw == null &&
            rolePolicyOverridesRaw == null &&
            executionLedgerRaw == null &&
            telemetryEmissionRaw == null &&
            alertDeliveryRaw == null &&
            reconciliationJobsRaw == null &&
            collaborationStatesRaw == null &&
            remoteOperatorHandoffRaw == null &&
            alertRoutingRaw == null &&
            remoteDirectoryRaw == null &&
            connectorDestinationsRaw == null &&
            connectorAuthProfilesRaw == null &&
            connectorRouteBindingsRaw == null &&
            portfolioScenariosRaw == null &&
            portfolioSimulationRunsRaw == null &&
            portfolioScenarioComparisonsRaw == null &&
            portfolioOptimizationObjectiveProfileSnapshotsRaw == null &&
            portfolioOptimizationCalibrationSnapshotsRaw == null &&
            portfolioOptimizationRequestsRaw == null &&
            portfolioOptimizationResultsRaw == null &&
            portfolioOptimizationDecisionsRaw == null &&
            portfolioOptimizationOutcomesRaw == null &&
            portfolioOptimizationDriftsRaw == null &&
            portfolioOptimizationTuningSuggestionsRaw == null &&
            portfolioOptimizationTuningDecisionsRaw == null &&
            portfolioOptimizationPropagationAttemptsRaw == null &&
            portfolioOptimizationPropagationApprovalsRaw == null &&
            portfolioOptimizationPropagationAdoptionsRaw == null &&
            portfolioOptimizationLearningSyncEnvelopesRaw == null &&
            portfolioOptimizationLearningSyncAttemptsRaw == null &&
            portfolioOptimizationLearningSyncConflictsRaw == null &&
            portfolioOptimizationConsentRecordsRaw == null &&
            portfolioOptimizationRemoteLearningEnvelopesRaw == null &&
            portfolioOptimizationRemoteLearningBatchesRaw == null &&
            portfolioOptimizationRemoteLearningTransportAttemptsRaw == null &&
            portfolioOptimizationRemoteDestinationProfilesRaw == null &&
            portfolioOptimizationRemoteDestinationDecisionRecordsRaw == null &&
            portfolioOptimizationRemoteTransportConnectorProfilesRaw == null &&
            portfolioOptimizationEnterpriseKeyReferencesRaw == null &&
            portfolioOptimizationRemoteTransportDeadLettersRaw == null &&
            portfolioOptimizationComplianceAuditExportRequestsRaw == null &&
            portfolioOptimizationComplianceAuditExportResultsRaw == null &&
            portfolioOptimizationComplianceExportRouteRecordsRaw == null &&
            portfolioOptimizationDataExchangeBundlesRaw == null &&
            portfolioOptimizationDataExchangeBundleDecisionRecordsRaw == null &&
            portfolioOptimizationDataExchangeManifestsRaw == null &&
            portfolioOptimizationCrossBoundaryApprovalRecordsRaw == null &&
            portfolioOptimizationCrossBoundaryAuditRecordsRaw == null &&
            portfolioOptimizationDestinationTrustTierAssignmentsRaw == null &&
            portfolioOptimizationCrossBoundaryProgramRecordsRaw == null &&
            portfolioOptimizationCrossBoundaryGovernancePortfoliosRaw == null &&
            portfolioOptimizationTrustTierProgramSummariesRaw == null &&
            portfolioOptimizationJurisdictionRolloutPlansRaw == null &&
            portfolioOptimizationPortfolioBlockerSummariesRaw == null &&
            portfolioOptimizationPortfolioDependencySummariesRaw == null &&
            portfolioOptimizationPortfolioConflictSummariesRaw == null &&
            portfolioOptimizationPortfolioPriorityDecisionsRaw == null &&
            portfolioOptimizationPortfolioCoordinationRecommendationsRaw == null &&
            portfolioOptimizationPortfolioWaveCoordinationRecordsRaw == null &&
            portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesRaw == null &&
            portfolioOptimizationRiskBudgetsRaw == null &&
            portfolioOptimizationTrustTierDriftSummariesRaw == null &&
            portfolioOptimizationJurisdictionDriftSummariesRaw == null &&
            portfolioOptimizationDestinationRiskConcentrationSummariesRaw == null &&
            portfolioOptimizationPortfolioBlockerTrendSummariesRaw == null &&
            portfolioOptimizationPortfolioRiskRecommendationsRaw == null &&
            portfolioOptimizationCrossBoundaryCorrectiveActionRecordsRaw == null &&
            portfolioOptimizationPortfolioSafetyRailsRaw == null &&
            portfolioOptimizationBudgetGuardrailsRaw == null &&
            portfolioOptimizationPortfolioSafetySummariesRaw == null &&
            portfolioOptimizationRemediationAutomationControlsRaw == null &&
            portfolioOptimizationFederatedAggregationRaw == null
        ) {
            return null
        }

        val state = stateRaw?.let(::decodeState) ?: stateBackupRaw?.let(::decodeState)
        val trajectory = trajectoryRaw?.let(::decodeTrajectory)
            ?.takeIf { it.isNotEmpty() }
            ?: trajectoryBackupRaw?.let(::decodeTrajectory)
            ?: emptyList()
        val activeRole = activeRoleRaw
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { runCatching { UserRole.valueOf(it) }.getOrNull() }
        val roleSource = roleSourceRaw
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { runCatching { RoleSource.valueOf(it) }.getOrNull() }
        val rolePolicyOverrides = decodeRolePolicyOverrides(rolePolicyOverridesRaw)
        val executionLedgerRecords = decodeExecutionLedger(executionLedgerRaw)
        val telemetryEmissionRecords = decodeTelemetryEmissionRecords(telemetryEmissionRaw)
        val alertDeliveryRecords = decodeAlertDeliveryRecords(alertDeliveryRaw)
        val reconciliationJobRecords = decodeReconciliationJobs(reconciliationJobsRaw)
        val collaborationStates = decodeCollaborationStates(collaborationStatesRaw)
        val remoteOperatorHandoffRecords = decodeRemoteOperatorHandoffRecords(remoteOperatorHandoffRaw)
        val alertRoutingRecords = decodeAlertRoutingRecords(alertRoutingRaw)
        val remoteOperatorDirectoryEntries = decodeRemoteOperatorDirectoryEntries(remoteDirectoryRaw)
        val connectorDestinations = decodeConnectorDestinations(connectorDestinationsRaw)
        val connectorAuthProfiles = decodeConnectorAuthProfiles(connectorAuthProfilesRaw)
        val connectorRouteBindings = decodeConnectorRouteBindings(connectorRouteBindingsRaw)
        val portfolioScenarioDefinitions = decodePortfolioScenarioDefinitions(portfolioScenariosRaw)
        val portfolioSimulationRunRecords = decodePortfolioSimulationRunRecords(portfolioSimulationRunsRaw)
        val portfolioScenarioComparisons = decodePortfolioScenarioComparisons(portfolioScenarioComparisonsRaw)
        val portfolioOptimizationObjectiveProfileSnapshots =
            decodePortfolioOptimizationObjectiveProfileSnapshots(
                portfolioOptimizationObjectiveProfileSnapshotsRaw
            )
        val portfolioOptimizationCalibrationSnapshots = decodePortfolioOptimizationCalibrationSnapshots(
            portfolioOptimizationCalibrationSnapshotsRaw
        )
        val portfolioOptimizationRequests = decodePortfolioOptimizationRequests(portfolioOptimizationRequestsRaw)
        val portfolioOptimizationResults = decodePortfolioOptimizationResults(portfolioOptimizationResultsRaw)
        val portfolioOptimizationDecisionRecords = decodePortfolioOptimizationDecisionRecords(portfolioOptimizationDecisionsRaw)
        val portfolioOptimizationOutcomeRecords = decodePortfolioOptimizationOutcomeRecords(
            portfolioOptimizationOutcomesRaw
        )
        val portfolioOptimizationDriftSummaries = decodePortfolioOptimizationDriftSummaries(
            portfolioOptimizationDriftsRaw
        )
        val portfolioOptimizationTuningSuggestions = decodePortfolioOptimizationTuningSuggestions(
            portfolioOptimizationTuningSuggestionsRaw
        )
        val portfolioOptimizationTuningDecisionRecords = decodePortfolioOptimizationTuningDecisionRecords(
            portfolioOptimizationTuningDecisionsRaw
        )
        val portfolioOptimizationPropagationAttemptRecords =
            decodePortfolioOptimizationPropagationAttempts(portfolioOptimizationPropagationAttemptsRaw)
        val portfolioOptimizationPropagationApprovalRecords =
            decodePortfolioOptimizationPropagationApprovals(portfolioOptimizationPropagationApprovalsRaw)
        val portfolioOptimizationPropagationAdoptionRecords =
            decodePortfolioOptimizationPropagationAdoptions(portfolioOptimizationPropagationAdoptionsRaw)
        val portfolioOptimizationLearningSyncEnvelopes =
            decodePortfolioOptimizationLearningSyncEnvelopes(portfolioOptimizationLearningSyncEnvelopesRaw)
        val portfolioOptimizationLearningSyncAttemptRecords =
            decodePortfolioOptimizationLearningSyncAttempts(portfolioOptimizationLearningSyncAttemptsRaw)
        val portfolioOptimizationLearningSyncConflictRecords =
            decodePortfolioOptimizationLearningSyncConflicts(portfolioOptimizationLearningSyncConflictsRaw)
        val portfolioOptimizationConsentRecords =
            decodePortfolioOptimizationConsentRecords(portfolioOptimizationConsentRecordsRaw)
        val portfolioOptimizationRemoteLearningEnvelopes =
            decodePortfolioOptimizationRemoteLearningEnvelopes(portfolioOptimizationRemoteLearningEnvelopesRaw)
        val portfolioOptimizationRemoteLearningBatches =
            decodePortfolioOptimizationRemoteLearningBatches(portfolioOptimizationRemoteLearningBatchesRaw)
        val portfolioOptimizationRemoteLearningTransportAttemptRecords =
            decodePortfolioOptimizationRemoteLearningTransportAttempts(
                portfolioOptimizationRemoteLearningTransportAttemptsRaw
            )
        val portfolioOptimizationRemoteDestinationProfiles =
            decodePortfolioOptimizationRemoteDestinationProfiles(
                portfolioOptimizationRemoteDestinationProfilesRaw
            )
        val portfolioOptimizationRemoteDestinationDecisionRecords =
            decodePortfolioOptimizationRemoteDestinationDecisionRecords(
                portfolioOptimizationRemoteDestinationDecisionRecordsRaw
            )
        val portfolioOptimizationRemoteTransportConnectorProfiles =
            decodePortfolioOptimizationRemoteTransportConnectorProfiles(
                portfolioOptimizationRemoteTransportConnectorProfilesRaw
            )
        val portfolioOptimizationEnterpriseKeyReferences =
            decodePortfolioOptimizationEnterpriseKeyReferences(
                portfolioOptimizationEnterpriseKeyReferencesRaw
            )
        val portfolioOptimizationRemoteTransportDeadLetterRecords =
            decodePortfolioOptimizationRemoteTransportDeadLetterRecords(
                portfolioOptimizationRemoteTransportDeadLettersRaw
            )
        val portfolioOptimizationComplianceAuditExportRequests =
            decodePortfolioOptimizationComplianceAuditExportRequests(
                portfolioOptimizationComplianceAuditExportRequestsRaw
            )
        val portfolioOptimizationComplianceAuditExportResults =
            decodePortfolioOptimizationComplianceAuditExportResults(
                portfolioOptimizationComplianceAuditExportResultsRaw
            )
        val portfolioOptimizationComplianceExportRouteRecords =
            decodePortfolioOptimizationComplianceExportRouteRecords(
                portfolioOptimizationComplianceExportRouteRecordsRaw
            )
        val portfolioOptimizationDataExchangeBundles =
            decodePortfolioOptimizationDataExchangeBundles(portfolioOptimizationDataExchangeBundlesRaw)
        val portfolioOptimizationDataExchangeBundleDecisionRecords =
            decodePortfolioOptimizationDataExchangeBundleDecisionRecords(
                portfolioOptimizationDataExchangeBundleDecisionRecordsRaw
            )
        val portfolioOptimizationDataExchangeManifests =
            decodePortfolioOptimizationDataExchangeManifests(
                portfolioOptimizationDataExchangeManifestsRaw
            )
        val portfolioOptimizationCrossBoundaryApprovalRecords =
            decodePortfolioOptimizationCrossBoundaryApprovalRecords(
                portfolioOptimizationCrossBoundaryApprovalRecordsRaw
            )
        val portfolioOptimizationCrossBoundaryAuditRecords =
            decodePortfolioOptimizationCrossBoundaryAuditRecords(
                portfolioOptimizationCrossBoundaryAuditRecordsRaw
            )
        val portfolioOptimizationDestinationTrustTierAssignments =
            decodePortfolioOptimizationDestinationTrustTierAssignments(
                portfolioOptimizationDestinationTrustTierAssignmentsRaw
            )
        val portfolioOptimizationCrossBoundaryProgramRecords =
            decodePortfolioOptimizationCrossBoundaryProgramRecords(
                portfolioOptimizationCrossBoundaryProgramRecordsRaw
            )
        val portfolioOptimizationCrossBoundaryGovernancePortfolios =
            decodePortfolioOptimizationCrossBoundaryGovernancePortfolios(
                portfolioOptimizationCrossBoundaryGovernancePortfoliosRaw
            )
        val portfolioOptimizationTrustTierProgramSummaries =
            decodePortfolioOptimizationTrustTierProgramSummaries(
                portfolioOptimizationTrustTierProgramSummariesRaw
            )
        val portfolioOptimizationJurisdictionRolloutPlans =
            decodePortfolioOptimizationJurisdictionRolloutPlans(
                portfolioOptimizationJurisdictionRolloutPlansRaw
            )
        val portfolioOptimizationPortfolioBlockerSummaries =
            decodePortfolioOptimizationPortfolioBlockerSummaries(
                portfolioOptimizationPortfolioBlockerSummariesRaw
            )
        val portfolioOptimizationPortfolioDependencySummaries =
            decodePortfolioOptimizationPortfolioDependencySummaries(
                portfolioOptimizationPortfolioDependencySummariesRaw
            )
        val portfolioOptimizationPortfolioConflictSummaries =
            decodePortfolioOptimizationPortfolioConflictSummaries(
                portfolioOptimizationPortfolioConflictSummariesRaw
            )
        val portfolioOptimizationPortfolioPriorityDecisions =
            decodePortfolioOptimizationPortfolioPriorityDecisions(
                portfolioOptimizationPortfolioPriorityDecisionsRaw
            )
        val portfolioOptimizationPortfolioCoordinationRecommendations =
            decodePortfolioOptimizationPortfolioCoordinationRecommendations(
                portfolioOptimizationPortfolioCoordinationRecommendationsRaw
            )
        val portfolioOptimizationPortfolioWaveCoordinationRecords =
            decodePortfolioOptimizationPortfolioWaveCoordinationRecords(
                portfolioOptimizationPortfolioWaveCoordinationRecordsRaw
            )
        val portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries =
            decodePortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries(
                portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesRaw
            )
        val portfolioOptimizationRiskBudgets =
            decodePortfolioOptimizationRiskBudgets(portfolioOptimizationRiskBudgetsRaw)
        val portfolioOptimizationTrustTierDriftSummaries =
            decodePortfolioOptimizationTrustTierDriftSummaries(
                portfolioOptimizationTrustTierDriftSummariesRaw
            )
        val portfolioOptimizationJurisdictionDriftSummaries =
            decodePortfolioOptimizationJurisdictionDriftSummaries(
                portfolioOptimizationJurisdictionDriftSummariesRaw
            )
        val portfolioOptimizationDestinationRiskConcentrationSummaries =
            decodePortfolioOptimizationDestinationRiskConcentrationSummaries(
                portfolioOptimizationDestinationRiskConcentrationSummariesRaw
            )
        val portfolioOptimizationPortfolioBlockerTrendSummaries =
            decodePortfolioOptimizationPortfolioBlockerTrendSummaries(
                portfolioOptimizationPortfolioBlockerTrendSummariesRaw
            )
        val portfolioOptimizationPortfolioRiskRecommendations =
            decodePortfolioOptimizationPortfolioRiskRecommendations(
                portfolioOptimizationPortfolioRiskRecommendationsRaw
            )
        val portfolioOptimizationCrossBoundaryCorrectiveActionRecords =
            decodePortfolioOptimizationCrossBoundaryCorrectiveActionRecords(
                portfolioOptimizationCrossBoundaryCorrectiveActionRecordsRaw
            )
        val portfolioOptimizationPortfolioSafetyRails =
            decodePortfolioOptimizationPortfolioSafetyRails(
                portfolioOptimizationPortfolioSafetyRailsRaw
            )
        val portfolioOptimizationBudgetGuardrails =
            decodePortfolioOptimizationBudgetGuardrails(
                portfolioOptimizationBudgetGuardrailsRaw
            )
        val portfolioOptimizationPortfolioSafetySummaries =
            decodePortfolioOptimizationPortfolioSafetySummaries(
                portfolioOptimizationPortfolioSafetySummariesRaw
            )
        val portfolioOptimizationRemediationAutomationControls =
            decodePortfolioOptimizationRemediationAutomationControls(
                portfolioOptimizationRemediationAutomationControlsRaw
            )
        val portfolioOptimizationFederatedAggregationSummaries =
            decodePortfolioOptimizationFederatedAggregationSummaries(portfolioOptimizationFederatedAggregationRaw)
        return PersistedDynamicState(
            dynamicState = state,
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
        saveExtended(
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
            remoteOperatorDirectoryEntries = emptyList(),
            connectorDestinations = emptyList(),
            connectorAuthProfiles = emptyList(),
            connectorRouteBindings = emptyList(),
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
        remoteOperatorDirectoryEntries: List<RemoteOperatorDirectoryEntry>,
        connectorDestinations: List<ConnectorDestination>,
        connectorAuthProfiles: List<ConnectorAuthProfile>,
        connectorRouteBindings: List<ConnectorRouteBinding>,
        portfolioScenarioDefinitions: List<PortfolioScenarioDefinition>,
        portfolioSimulationRunRecords: List<PortfolioSimulationRunRecord>,
        portfolioScenarioComparisons: List<PortfolioScenarioComparison>,
        portfolioOptimizationObjectiveProfileSnapshots: List<PortfolioOptimizationObjectiveProfileSnapshot>,
        portfolioOptimizationCalibrationSnapshots: List<PortfolioOptimizationCalibrationSnapshot>,
        portfolioOptimizationRequests: List<PortfolioOptimizationRequest>,
        portfolioOptimizationResults: List<PortfolioOptimizationResult>,
        portfolioOptimizationDecisionRecords: List<PortfolioOptimizationDecisionRecord>,
        portfolioOptimizationOutcomeRecords: List<PortfolioScheduleOutcomeRecord>,
        portfolioOptimizationDriftSummaries: List<PortfolioOptimizationDriftSummary>,
        portfolioOptimizationTuningSuggestions: List<PortfolioOptimizationTuningSuggestion>,
        portfolioOptimizationTuningDecisionRecords: List<PortfolioOptimizationTuningDecisionRecord>,
        portfolioOptimizationPropagationAttemptRecords: List<PortfolioOptimizationPropagationAttemptRecord>,
        portfolioOptimizationPropagationApprovalRecords: List<PortfolioOptimizationPropagationApprovalRecord>,
        portfolioOptimizationPropagationAdoptionRecords: List<PortfolioOptimizationPropagationAdoptionRecord>,
        portfolioOptimizationLearningSyncEnvelopes: List<PortfolioOptimizationLearningSyncEnvelope>,
        portfolioOptimizationLearningSyncAttemptRecords: List<PortfolioOptimizationLearningSyncAttemptRecord>,
        portfolioOptimizationLearningSyncConflictRecords: List<PortfolioOptimizationLearningSyncConflictRecord>,
        portfolioOptimizationConsentRecords: List<PortfolioOptimizationConsentRecord>,
        portfolioOptimizationRemoteLearningEnvelopes: List<PortfolioOptimizationRemoteLearningEnvelope>,
        portfolioOptimizationRemoteLearningBatches: List<PortfolioOptimizationRemoteLearningBatch>,
        portfolioOptimizationRemoteLearningTransportAttemptRecords:
            List<PortfolioOptimizationRemoteLearningTransportAttemptRecord>,
        portfolioOptimizationRemoteDestinationProfiles:
            List<PortfolioOptimizationRemoteDestinationProfile>,
        portfolioOptimizationRemoteDestinationDecisionRecords:
            List<PortfolioOptimizationRemoteDestinationDecisionRecord>,
        portfolioOptimizationRemoteTransportConnectorProfiles:
            List<PortfolioOptimizationRemoteTransportConnectorProfile>,
        portfolioOptimizationEnterpriseKeyReferences:
            List<PortfolioOptimizationEnterpriseKeyReference>,
        portfolioOptimizationRemoteTransportDeadLetterRecords:
            List<PortfolioOptimizationRemoteTransportDeadLetterRecord>,
        portfolioOptimizationComplianceAuditExportRequests:
            List<PortfolioOptimizationComplianceAuditExportRequest>,
        portfolioOptimizationComplianceAuditExportResults:
            List<PortfolioOptimizationComplianceAuditExportResult>,
        portfolioOptimizationComplianceExportRouteRecords:
            List<PortfolioOptimizationComplianceExportRouteRecord>,
        portfolioOptimizationDataExchangeBundles:
            List<PortfolioOptimizationSafeDestinationBundle>,
        portfolioOptimizationDataExchangeBundleDecisionRecords:
            List<PortfolioOptimizationDestinationBundleDecisionRecord>,
        portfolioOptimizationDataExchangeManifests:
            List<PortfolioOptimizationDataExchangeManifest>,
        portfolioOptimizationCrossBoundaryApprovalRecords:
            List<PortfolioOptimizationCrossBoundaryApprovalRecord>,
        portfolioOptimizationCrossBoundaryAuditRecords:
            List<PortfolioOptimizationCrossBoundaryAuditRecord>,
        portfolioOptimizationDestinationTrustTierAssignments:
            List<PortfolioOptimizationDestinationTrustTierAssignment>,
        portfolioOptimizationCrossBoundaryProgramRecords:
            List<PortfolioOptimizationCrossBoundaryProgramRecord>,
        portfolioOptimizationCrossBoundaryGovernancePortfolios:
            List<PortfolioOptimizationCrossBoundaryGovernancePortfolio>,
        portfolioOptimizationTrustTierProgramSummaries:
            List<PortfolioOptimizationTrustTierProgramSummary>,
        portfolioOptimizationJurisdictionRolloutPlans:
            List<PortfolioOptimizationJurisdictionRolloutPlan>,
        portfolioOptimizationPortfolioBlockerSummaries:
            List<PortfolioOptimizationPortfolioBlockerSummary>,
        portfolioOptimizationPortfolioDependencySummaries:
            List<PortfolioOptimizationPortfolioDependencySummary>,
        portfolioOptimizationPortfolioConflictSummaries:
            List<PortfolioOptimizationPortfolioConflictSummary>,
        portfolioOptimizationPortfolioPriorityDecisions:
            List<PortfolioOptimizationPortfolioPriorityDecision>,
        portfolioOptimizationPortfolioCoordinationRecommendations:
            List<PortfolioOptimizationPortfolioCoordinationRecommendation>,
        portfolioOptimizationPortfolioWaveCoordinationRecords:
            List<PortfolioOptimizationPortfolioWaveCoordinationRecord>,
        portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries:
            List<PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary>,
        portfolioOptimizationRiskBudgets: List<PortfolioOptimizationRiskBudget>,
        portfolioOptimizationTrustTierDriftSummaries:
            List<PortfolioOptimizationTrustTierDriftSummary>,
        portfolioOptimizationJurisdictionDriftSummaries:
            List<PortfolioOptimizationJurisdictionDriftSummary>,
        portfolioOptimizationDestinationRiskConcentrationSummaries:
            List<PortfolioOptimizationDestinationRiskConcentrationSummary>,
        portfolioOptimizationPortfolioBlockerTrendSummaries:
            List<PortfolioOptimizationPortfolioBlockerTrendSummary>,
        portfolioOptimizationPortfolioRiskRecommendations:
            List<PortfolioOptimizationPortfolioRiskRecommendation>,
        portfolioOptimizationCrossBoundaryCorrectiveActionRecords:
            List<PortfolioOptimizationCrossBoundaryCorrectiveActionRecord>,
        portfolioOptimizationPortfolioSafetyRails:
            List<PortfolioOptimizationPortfolioSafetyRail>,
        portfolioOptimizationBudgetGuardrails:
            List<PortfolioOptimizationBudgetGuardrail>,
        portfolioOptimizationPortfolioSafetySummaries:
            List<PortfolioOptimizationPortfolioSafetySummary>,
        portfolioOptimizationRemediationAutomationControls:
            List<PortfolioOptimizationRemediationAutomationControl>,
        portfolioOptimizationFederatedAggregationSummaries: List<PortfolioOptimizationFederatedAggregationSummary>
    ) {
        if (userId.isBlank()) return
        prefs.edit().apply {
            if (dynamicState == null) {
                remove(stateKey(userId))
                remove(stateBackupKey(userId))
            } else {
                val encodedState = encodeState(dynamicState)
                putString(stateKey(userId), encodedState)
                putString(stateBackupKey(userId), encodedState)
            }
            val encodedTrajectory = encodeTrajectory(trajectory.takeLast(MAX_TRAJECTORY_POINTS))
            putString(
                trajectoryKey(userId),
                encodedTrajectory
            )
            putString(trajectoryBackupKey(userId), encodedTrajectory)
            putLong(lastSavedAtKey(userId), System.currentTimeMillis())
            putInt(lastTrajectoryCountKey(userId), trajectory.takeLast(MAX_TRAJECTORY_POINTS).size)
            if (activeRole == null) {
                remove(activeRoleKey(userId))
            } else {
                putString(activeRoleKey(userId), activeRole.name)
            }
            if (roleSource == null) {
                remove(roleSourceKey(userId))
            } else {
                putString(roleSourceKey(userId), roleSource.name)
            }
            if (rolePolicyOverrides.isEmpty()) {
                remove(rolePolicyOverridesKey(userId))
            } else {
                putString(rolePolicyOverridesKey(userId), encodeRolePolicyOverrides(rolePolicyOverrides))
            }
            if (executionLedgerRecords.isEmpty()) {
                remove(executionLedgerKey(userId))
            } else {
                putString(
                    executionLedgerKey(userId),
                    encodeExecutionLedger(executionLedgerRecords.takeLast(MAX_LEDGER_RECORDS))
                )
            }
            if (telemetryEmissionRecords.isEmpty()) {
                remove(telemetryEmissionKey(userId))
            } else {
                putString(
                    telemetryEmissionKey(userId),
                    encodeTelemetryEmissionRecords(telemetryEmissionRecords.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (alertDeliveryRecords.isEmpty()) {
                remove(alertDeliveryKey(userId))
            } else {
                putString(
                    alertDeliveryKey(userId),
                    encodeAlertDeliveryRecords(alertDeliveryRecords.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (reconciliationJobRecords.isEmpty()) {
                remove(reconciliationJobsKey(userId))
            } else {
                putString(
                    reconciliationJobsKey(userId),
                    encodeReconciliationJobs(reconciliationJobRecords.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (collaborationStates.isEmpty()) {
                remove(collaborationStatesKey(userId))
            } else {
                putString(
                    collaborationStatesKey(userId),
                    encodeCollaborationStates(collaborationStates.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (remoteOperatorHandoffRecords.isEmpty()) {
                remove(remoteOperatorHandoffKey(userId))
            } else {
                putString(
                    remoteOperatorHandoffKey(userId),
                    encodeRemoteOperatorHandoffRecords(remoteOperatorHandoffRecords.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (alertRoutingRecords.isEmpty()) {
                remove(alertRoutingKey(userId))
            } else {
                putString(
                    alertRoutingKey(userId),
                    encodeAlertRoutingRecords(alertRoutingRecords.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (remoteOperatorDirectoryEntries.isEmpty()) {
                remove(remoteDirectoryKey(userId))
            } else {
                putString(
                    remoteDirectoryKey(userId),
                    encodeRemoteOperatorDirectoryEntries(
                        remoteOperatorDirectoryEntries.takeLast(MAX_REMOTE_PIPELINE_RECORDS)
                    )
                )
            }
            if (connectorDestinations.isEmpty()) {
                remove(connectorDestinationsKey(userId))
            } else {
                putString(
                    connectorDestinationsKey(userId),
                    encodeConnectorDestinations(connectorDestinations.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (connectorAuthProfiles.isEmpty()) {
                remove(connectorAuthProfilesKey(userId))
            } else {
                putString(
                    connectorAuthProfilesKey(userId),
                    encodeConnectorAuthProfiles(connectorAuthProfiles.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (connectorRouteBindings.isEmpty()) {
                remove(connectorRouteBindingsKey(userId))
            } else {
                putString(
                    connectorRouteBindingsKey(userId),
                    encodeConnectorRouteBindings(connectorRouteBindings.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (portfolioScenarioDefinitions.isEmpty()) {
                remove(portfolioScenariosKey(userId))
            } else {
                putString(
                    portfolioScenariosKey(userId),
                    encodePortfolioScenarioDefinitions(portfolioScenarioDefinitions.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (portfolioSimulationRunRecords.isEmpty()) {
                remove(portfolioSimulationRunsKey(userId))
            } else {
                putString(
                    portfolioSimulationRunsKey(userId),
                    encodePortfolioSimulationRunRecords(
                        portfolioSimulationRunRecords.takeLast(MAX_REMOTE_PIPELINE_RECORDS)
                    )
                )
            }
            if (portfolioScenarioComparisons.isEmpty()) {
                remove(portfolioScenarioComparisonsKey(userId))
            } else {
                putString(
                    portfolioScenarioComparisonsKey(userId),
                    encodePortfolioScenarioComparisons(
                        portfolioScenarioComparisons.takeLast(MAX_REMOTE_PIPELINE_RECORDS)
                    )
                )
            }
            if (portfolioOptimizationObjectiveProfileSnapshots.isEmpty()) {
                remove(portfolioOptimizationObjectiveProfileSnapshotsKey(userId))
            } else {
                putString(
                    portfolioOptimizationObjectiveProfileSnapshotsKey(userId),
                    encodePortfolioOptimizationObjectiveProfileSnapshots(
                        portfolioOptimizationObjectiveProfileSnapshots.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCalibrationSnapshots.isEmpty()) {
                remove(portfolioOptimizationCalibrationSnapshotsKey(userId))
            } else {
                putString(
                    portfolioOptimizationCalibrationSnapshotsKey(userId),
                    encodePortfolioOptimizationCalibrationSnapshots(
                        portfolioOptimizationCalibrationSnapshots.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRequests.isEmpty()) {
                remove(portfolioOptimizationRequestsKey(userId))
            } else {
                putString(
                    portfolioOptimizationRequestsKey(userId),
                    encodePortfolioOptimizationRequests(
                        portfolioOptimizationRequests.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationResults.isEmpty()) {
                remove(portfolioOptimizationResultsKey(userId))
            } else {
                putString(
                    portfolioOptimizationResultsKey(userId),
                    encodePortfolioOptimizationResults(
                        portfolioOptimizationResults.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDecisionRecords.isEmpty()) {
                remove(portfolioOptimizationDecisionsKey(userId))
            } else {
                putString(
                    portfolioOptimizationDecisionsKey(userId),
                    encodePortfolioOptimizationDecisionRecords(
                        portfolioOptimizationDecisionRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationOutcomeRecords.isEmpty()) {
                remove(portfolioOptimizationOutcomesKey(userId))
            } else {
                putString(
                    portfolioOptimizationOutcomesKey(userId),
                    encodePortfolioOptimizationOutcomeRecords(
                        portfolioOptimizationOutcomeRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDriftSummaries.isEmpty()) {
                remove(portfolioOptimizationDriftsKey(userId))
            } else {
                putString(
                    portfolioOptimizationDriftsKey(userId),
                    encodePortfolioOptimizationDriftSummaries(
                        portfolioOptimizationDriftSummaries.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationTuningSuggestions.isEmpty()) {
                remove(portfolioOptimizationTuningSuggestionsKey(userId))
            } else {
                putString(
                    portfolioOptimizationTuningSuggestionsKey(userId),
                    encodePortfolioOptimizationTuningSuggestions(
                        portfolioOptimizationTuningSuggestions.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationTuningDecisionRecords.isEmpty()) {
                remove(portfolioOptimizationTuningDecisionsKey(userId))
            } else {
                putString(
                    portfolioOptimizationTuningDecisionsKey(userId),
                    encodePortfolioOptimizationTuningDecisionRecords(
                        portfolioOptimizationTuningDecisionRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPropagationAttemptRecords.isEmpty()) {
                remove(portfolioOptimizationPropagationAttemptsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPropagationAttemptsKey(userId),
                    encodePortfolioOptimizationPropagationAttempts(
                        portfolioOptimizationPropagationAttemptRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPropagationApprovalRecords.isEmpty()) {
                remove(portfolioOptimizationPropagationApprovalsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPropagationApprovalsKey(userId),
                    encodePortfolioOptimizationPropagationApprovals(
                        portfolioOptimizationPropagationApprovalRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPropagationAdoptionRecords.isEmpty()) {
                remove(portfolioOptimizationPropagationAdoptionsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPropagationAdoptionsKey(userId),
                    encodePortfolioOptimizationPropagationAdoptions(
                        portfolioOptimizationPropagationAdoptionRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationLearningSyncEnvelopes.isEmpty()) {
                remove(portfolioOptimizationLearningSyncEnvelopesKey(userId))
            } else {
                putString(
                    portfolioOptimizationLearningSyncEnvelopesKey(userId),
                    encodePortfolioOptimizationLearningSyncEnvelopes(
                        portfolioOptimizationLearningSyncEnvelopes.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationLearningSyncAttemptRecords.isEmpty()) {
                remove(portfolioOptimizationLearningSyncAttemptsKey(userId))
            } else {
                putString(
                    portfolioOptimizationLearningSyncAttemptsKey(userId),
                    encodePortfolioOptimizationLearningSyncAttempts(
                        portfolioOptimizationLearningSyncAttemptRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationLearningSyncConflictRecords.isEmpty()) {
                remove(portfolioOptimizationLearningSyncConflictsKey(userId))
            } else {
                putString(
                    portfolioOptimizationLearningSyncConflictsKey(userId),
                    encodePortfolioOptimizationLearningSyncConflicts(
                        portfolioOptimizationLearningSyncConflictRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationConsentRecords.isEmpty()) {
                remove(portfolioOptimizationConsentRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationConsentRecordsKey(userId),
                    encodePortfolioOptimizationConsentRecords(
                        portfolioOptimizationConsentRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteLearningEnvelopes.isEmpty()) {
                remove(portfolioOptimizationRemoteLearningEnvelopesKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteLearningEnvelopesKey(userId),
                    encodePortfolioOptimizationRemoteLearningEnvelopes(
                        portfolioOptimizationRemoteLearningEnvelopes.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteLearningBatches.isEmpty()) {
                remove(portfolioOptimizationRemoteLearningBatchesKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteLearningBatchesKey(userId),
                    encodePortfolioOptimizationRemoteLearningBatches(
                        portfolioOptimizationRemoteLearningBatches.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteLearningTransportAttemptRecords.isEmpty()) {
                remove(portfolioOptimizationRemoteLearningTransportAttemptsKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteLearningTransportAttemptsKey(userId),
                    encodePortfolioOptimizationRemoteLearningTransportAttempts(
                        portfolioOptimizationRemoteLearningTransportAttemptRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteDestinationProfiles.isEmpty()) {
                remove(portfolioOptimizationRemoteDestinationProfilesKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteDestinationProfilesKey(userId),
                    encodePortfolioOptimizationRemoteDestinationProfiles(
                        portfolioOptimizationRemoteDestinationProfiles
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteDestinationDecisionRecords.isEmpty()) {
                remove(portfolioOptimizationRemoteDestinationDecisionRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteDestinationDecisionRecordsKey(userId),
                    encodePortfolioOptimizationRemoteDestinationDecisionRecords(
                        portfolioOptimizationRemoteDestinationDecisionRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteTransportConnectorProfiles.isEmpty()) {
                remove(portfolioOptimizationRemoteTransportConnectorProfilesKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteTransportConnectorProfilesKey(userId),
                    encodePortfolioOptimizationRemoteTransportConnectorProfiles(
                        portfolioOptimizationRemoteTransportConnectorProfiles
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationEnterpriseKeyReferences.isEmpty()) {
                remove(portfolioOptimizationEnterpriseKeyReferencesKey(userId))
            } else {
                putString(
                    portfolioOptimizationEnterpriseKeyReferencesKey(userId),
                    encodePortfolioOptimizationEnterpriseKeyReferences(
                        portfolioOptimizationEnterpriseKeyReferences
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemoteTransportDeadLetterRecords.isEmpty()) {
                remove(portfolioOptimizationRemoteTransportDeadLetterRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemoteTransportDeadLetterRecordsKey(userId),
                    encodePortfolioOptimizationRemoteTransportDeadLetterRecords(
                        portfolioOptimizationRemoteTransportDeadLetterRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationComplianceAuditExportRequests.isEmpty()) {
                remove(portfolioOptimizationComplianceAuditExportRequestsKey(userId))
            } else {
                putString(
                    portfolioOptimizationComplianceAuditExportRequestsKey(userId),
                    encodePortfolioOptimizationComplianceAuditExportRequests(
                        portfolioOptimizationComplianceAuditExportRequests
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationComplianceAuditExportResults.isEmpty()) {
                remove(portfolioOptimizationComplianceAuditExportResultsKey(userId))
            } else {
                putString(
                    portfolioOptimizationComplianceAuditExportResultsKey(userId),
                    encodePortfolioOptimizationComplianceAuditExportResults(
                        portfolioOptimizationComplianceAuditExportResults
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationComplianceExportRouteRecords.isEmpty()) {
                remove(portfolioOptimizationComplianceExportRouteRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationComplianceExportRouteRecordsKey(userId),
                    encodePortfolioOptimizationComplianceExportRouteRecords(
                        portfolioOptimizationComplianceExportRouteRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDataExchangeBundles.isEmpty()) {
                remove(portfolioOptimizationDataExchangeBundlesKey(userId))
            } else {
                putString(
                    portfolioOptimizationDataExchangeBundlesKey(userId),
                    encodePortfolioOptimizationDataExchangeBundles(
                        portfolioOptimizationDataExchangeBundles.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDataExchangeBundleDecisionRecords.isEmpty()) {
                remove(portfolioOptimizationDataExchangeBundleDecisionRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationDataExchangeBundleDecisionRecordsKey(userId),
                    encodePortfolioOptimizationDataExchangeBundleDecisionRecords(
                        portfolioOptimizationDataExchangeBundleDecisionRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDataExchangeManifests.isEmpty()) {
                remove(portfolioOptimizationDataExchangeManifestsKey(userId))
            } else {
                putString(
                    portfolioOptimizationDataExchangeManifestsKey(userId),
                    encodePortfolioOptimizationDataExchangeManifests(
                        portfolioOptimizationDataExchangeManifests.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCrossBoundaryApprovalRecords.isEmpty()) {
                remove(portfolioOptimizationCrossBoundaryApprovalRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationCrossBoundaryApprovalRecordsKey(userId),
                    encodePortfolioOptimizationCrossBoundaryApprovalRecords(
                        portfolioOptimizationCrossBoundaryApprovalRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCrossBoundaryAuditRecords.isEmpty()) {
                remove(portfolioOptimizationCrossBoundaryAuditRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationCrossBoundaryAuditRecordsKey(userId),
                    encodePortfolioOptimizationCrossBoundaryAuditRecords(
                        portfolioOptimizationCrossBoundaryAuditRecords.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDestinationTrustTierAssignments.isEmpty()) {
                remove(portfolioOptimizationDestinationTrustTierAssignmentsKey(userId))
            } else {
                putString(
                    portfolioOptimizationDestinationTrustTierAssignmentsKey(userId),
                    encodePortfolioOptimizationDestinationTrustTierAssignments(
                        portfolioOptimizationDestinationTrustTierAssignments
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCrossBoundaryProgramRecords.isEmpty()) {
                remove(portfolioOptimizationCrossBoundaryProgramRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationCrossBoundaryProgramRecordsKey(userId),
                    encodePortfolioOptimizationCrossBoundaryProgramRecords(
                        portfolioOptimizationCrossBoundaryProgramRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCrossBoundaryGovernancePortfolios.isEmpty()) {
                remove(portfolioOptimizationCrossBoundaryGovernancePortfoliosKey(userId))
            } else {
                putString(
                    portfolioOptimizationCrossBoundaryGovernancePortfoliosKey(userId),
                    encodePortfolioOptimizationCrossBoundaryGovernancePortfolios(
                        portfolioOptimizationCrossBoundaryGovernancePortfolios
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationTrustTierProgramSummaries.isEmpty()) {
                remove(portfolioOptimizationTrustTierProgramSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationTrustTierProgramSummariesKey(userId),
                    encodePortfolioOptimizationTrustTierProgramSummaries(
                        portfolioOptimizationTrustTierProgramSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationJurisdictionRolloutPlans.isEmpty()) {
                remove(portfolioOptimizationJurisdictionRolloutPlansKey(userId))
            } else {
                putString(
                    portfolioOptimizationJurisdictionRolloutPlansKey(userId),
                    encodePortfolioOptimizationJurisdictionRolloutPlans(
                        portfolioOptimizationJurisdictionRolloutPlans
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioBlockerSummaries.isEmpty()) {
                remove(portfolioOptimizationPortfolioBlockerSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioBlockerSummariesKey(userId),
                    encodePortfolioOptimizationPortfolioBlockerSummaries(
                        portfolioOptimizationPortfolioBlockerSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioDependencySummaries.isEmpty()) {
                remove(portfolioOptimizationPortfolioDependencySummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioDependencySummariesKey(userId),
                    encodePortfolioOptimizationPortfolioDependencySummaries(
                        portfolioOptimizationPortfolioDependencySummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioConflictSummaries.isEmpty()) {
                remove(portfolioOptimizationPortfolioConflictSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioConflictSummariesKey(userId),
                    encodePortfolioOptimizationPortfolioConflictSummaries(
                        portfolioOptimizationPortfolioConflictSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioPriorityDecisions.isEmpty()) {
                remove(portfolioOptimizationPortfolioPriorityDecisionsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioPriorityDecisionsKey(userId),
                    encodePortfolioOptimizationPortfolioPriorityDecisions(
                        portfolioOptimizationPortfolioPriorityDecisions
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioCoordinationRecommendations.isEmpty()) {
                remove(portfolioOptimizationPortfolioCoordinationRecommendationsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioCoordinationRecommendationsKey(userId),
                    encodePortfolioOptimizationPortfolioCoordinationRecommendations(
                        portfolioOptimizationPortfolioCoordinationRecommendations
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioWaveCoordinationRecords.isEmpty()) {
                remove(portfolioOptimizationPortfolioWaveCoordinationRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioWaveCoordinationRecordsKey(userId),
                    encodePortfolioOptimizationPortfolioWaveCoordinationRecords(
                        portfolioOptimizationPortfolioWaveCoordinationRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries.isEmpty()) {
                remove(portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesKey(userId),
                    encodePortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries(
                        portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRiskBudgets.isEmpty()) {
                remove(portfolioOptimizationRiskBudgetsKey(userId))
            } else {
                putString(
                    portfolioOptimizationRiskBudgetsKey(userId),
                    encodePortfolioOptimizationRiskBudgets(
                        portfolioOptimizationRiskBudgets.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationTrustTierDriftSummaries.isEmpty()) {
                remove(portfolioOptimizationTrustTierDriftSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationTrustTierDriftSummariesKey(userId),
                    encodePortfolioOptimizationTrustTierDriftSummaries(
                        portfolioOptimizationTrustTierDriftSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationJurisdictionDriftSummaries.isEmpty()) {
                remove(portfolioOptimizationJurisdictionDriftSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationJurisdictionDriftSummariesKey(userId),
                    encodePortfolioOptimizationJurisdictionDriftSummaries(
                        portfolioOptimizationJurisdictionDriftSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationDestinationRiskConcentrationSummaries.isEmpty()) {
                remove(portfolioOptimizationDestinationRiskConcentrationSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationDestinationRiskConcentrationSummariesKey(userId),
                    encodePortfolioOptimizationDestinationRiskConcentrationSummaries(
                        portfolioOptimizationDestinationRiskConcentrationSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioBlockerTrendSummaries.isEmpty()) {
                remove(portfolioOptimizationPortfolioBlockerTrendSummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioBlockerTrendSummariesKey(userId),
                    encodePortfolioOptimizationPortfolioBlockerTrendSummaries(
                        portfolioOptimizationPortfolioBlockerTrendSummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioRiskRecommendations.isEmpty()) {
                remove(portfolioOptimizationPortfolioRiskRecommendationsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioRiskRecommendationsKey(userId),
                    encodePortfolioOptimizationPortfolioRiskRecommendations(
                        portfolioOptimizationPortfolioRiskRecommendations
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationCrossBoundaryCorrectiveActionRecords.isEmpty()) {
                remove(portfolioOptimizationCrossBoundaryCorrectiveActionRecordsKey(userId))
            } else {
                putString(
                    portfolioOptimizationCrossBoundaryCorrectiveActionRecordsKey(userId),
                    encodePortfolioOptimizationCrossBoundaryCorrectiveActionRecords(
                        portfolioOptimizationCrossBoundaryCorrectiveActionRecords
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                        )
                )
            }
            if (portfolioOptimizationPortfolioSafetyRails.isEmpty()) {
                remove(portfolioOptimizationPortfolioSafetyRailsKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioSafetyRailsKey(userId),
                    encodePortfolioOptimizationPortfolioSafetyRails(
                        portfolioOptimizationPortfolioSafetyRails
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationBudgetGuardrails.isEmpty()) {
                remove(portfolioOptimizationBudgetGuardrailsKey(userId))
            } else {
                putString(
                    portfolioOptimizationBudgetGuardrailsKey(userId),
                    encodePortfolioOptimizationBudgetGuardrails(
                        portfolioOptimizationBudgetGuardrails
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationPortfolioSafetySummaries.isEmpty()) {
                remove(portfolioOptimizationPortfolioSafetySummariesKey(userId))
            } else {
                putString(
                    portfolioOptimizationPortfolioSafetySummariesKey(userId),
                    encodePortfolioOptimizationPortfolioSafetySummaries(
                        portfolioOptimizationPortfolioSafetySummaries
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationRemediationAutomationControls.isEmpty()) {
                remove(portfolioOptimizationRemediationAutomationControlsKey(userId))
            } else {
                putString(
                    portfolioOptimizationRemediationAutomationControlsKey(userId),
                    encodePortfolioOptimizationRemediationAutomationControls(
                        portfolioOptimizationRemediationAutomationControls
                            .takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            if (portfolioOptimizationFederatedAggregationSummaries.isEmpty()) {
                remove(portfolioOptimizationFederatedAggregationKey(userId))
            } else {
                putString(
                    portfolioOptimizationFederatedAggregationKey(userId),
                    encodePortfolioOptimizationFederatedAggregationSummaries(
                        portfolioOptimizationFederatedAggregationSummaries.takeLast(MAX_PORTFOLIO_OPTIMIZATION_ITEMS)
                    )
                )
            }
            apply()
        }
    }

    override fun saveRemoteDirectoryResources(
        userId: String,
        remoteOperatorDirectoryEntries: List<RemoteOperatorDirectoryEntry>,
        connectorDestinations: List<ConnectorDestination>,
        connectorAuthProfiles: List<ConnectorAuthProfile>,
        connectorRouteBindings: List<ConnectorRouteBinding>
    ) {
        if (userId.isBlank()) return
        prefs.edit().apply {
            if (remoteOperatorDirectoryEntries.isEmpty()) {
                remove(remoteDirectoryKey(userId))
            } else {
                putString(
                    remoteDirectoryKey(userId),
                    encodeRemoteOperatorDirectoryEntries(
                        remoteOperatorDirectoryEntries.takeLast(MAX_REMOTE_PIPELINE_RECORDS)
                    )
                )
            }
            if (connectorDestinations.isEmpty()) {
                remove(connectorDestinationsKey(userId))
            } else {
                putString(
                    connectorDestinationsKey(userId),
                    encodeConnectorDestinations(connectorDestinations.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (connectorAuthProfiles.isEmpty()) {
                remove(connectorAuthProfilesKey(userId))
            } else {
                putString(
                    connectorAuthProfilesKey(userId),
                    encodeConnectorAuthProfiles(connectorAuthProfiles.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            if (connectorRouteBindings.isEmpty()) {
                remove(connectorRouteBindingsKey(userId))
            } else {
                putString(
                    connectorRouteBindingsKey(userId),
                    encodeConnectorRouteBindings(connectorRouteBindings.takeLast(MAX_REMOTE_PIPELINE_RECORDS))
                )
            }
            apply()
        }
    }

    private fun encodeState(state: DynamicHumanStatePayload): String {
        val root = JSONObject()
        root.put(
            "l1",
            JSONObject().apply {
                put("profile_id", state.l1.profileId)
                put("value_anchor", state.l1.valueAnchor)
                put("risk_preference", state.l1.riskPreference)
            }
        )
        root.put(
            "l2",
            JSONObject().apply {
                put("source_app", state.l2.sourceApp)
                put("app_category", state.l2.appCategory)
                put("energy_level", state.l2.energyLevel)
                put("context_load", state.l2.contextLoad)
            }
        )
        root.put(
            "l3",
            JSONObject().apply {
                put("stress_score", state.l3.stressScore)
                put("polarity", state.l3.polarity)
                put("focus_score", state.l3.focusScore)
            }
        )
        root.put("updated_at_ms", state.updatedAtMs)
        return root.toString()
    }

    private fun decodeState(raw: String): DynamicHumanStatePayload? {
        return runCatching {
            val root = JSONObject(raw)
            val l1 = root.optJSONObject("l1")
            val l2 = root.optJSONObject("l2")
            val l3 = root.optJSONObject("l3")

            DynamicHumanStatePayload(
                l1 = L1CoreStatePayload(
                    profileId = l1?.optString("profile_id").orEmpty().ifBlank { "default" },
                    valueAnchor = l1?.optString("value_anchor").orEmpty().ifBlank { "balanced" },
                    riskPreference = l1?.optDouble("risk_preference", 0.5) ?: 0.5
                ),
                l2 = L2ContextStatePayload(
                    sourceApp = l2?.optString("source_app").orEmpty(),
                    appCategory = l2?.optString("app_category").orEmpty().ifBlank { "general" },
                    energyLevel = l2?.optDouble("energy_level", 0.5) ?: 0.5,
                    contextLoad = l2?.optDouble("context_load", 0.5) ?: 0.5
                ),
                l3 = L3EmotionStatePayload(
                    stressScore = l3?.optInt("stress_score", 0) ?: 0,
                    polarity = l3?.optDouble("polarity", 0.0) ?: 0.0,
                    focusScore = l3?.optInt("focus_score", 50) ?: 50
                ),
                updatedAtMs = root.optLong("updated_at_ms", 0L)
            )
        }.getOrNull()
    }

    private fun encodeTrajectory(trajectory: List<TrajectoryPointPayload>): String {
        val array = JSONArray()
        trajectory.forEach { point ->
            array.put(
                JSONObject().apply {
                    put("ts", point.ts)
                    put("value", point.value)
                    put("label", point.label)
                }
            )
        }
        return array.toString()
    }

    private fun decodeTrajectory(raw: String): List<TrajectoryPointPayload> {
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(
                        TrajectoryPointPayload(
                            ts = item.optLong("ts", 0L),
                            value = item.optDouble("value", 0.0),
                            label = item.optString("label", "state_update")
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun stateKey(userId: String): String = "dynamic_state:$userId"

    private fun trajectoryKey(userId: String): String = "dynamic_trajectory:$userId"

    private fun stateBackupKey(userId: String): String = "dynamic_state_backup:$userId"

    private fun trajectoryBackupKey(userId: String): String = "dynamic_trajectory_backup:$userId"

    private fun lastSavedAtKey(userId: String): String = "dynamic_state_saved_at:$userId"

    private fun lastTrajectoryCountKey(userId: String): String = "dynamic_state_trajectory_count:$userId"

    private fun activeRoleKey(userId: String): String = "dynamic_state_active_role:$userId"

    private fun roleSourceKey(userId: String): String = "dynamic_state_role_source:$userId"

    private fun rolePolicyOverridesKey(userId: String): String = "dynamic_state_role_policy_overrides:$userId"

    private fun executionLedgerKey(userId: String): String = "dynamic_state_execution_ledger:$userId"

    private fun telemetryEmissionKey(userId: String): String = "dynamic_state_remote_telemetry:$userId"

    private fun alertDeliveryKey(userId: String): String = "dynamic_state_remote_alerts:$userId"

    private fun reconciliationJobsKey(userId: String): String = "dynamic_state_remote_reconciliation_jobs:$userId"

    private fun collaborationStatesKey(userId: String): String = "dynamic_state_governance_collaboration:$userId"

    private fun remoteOperatorHandoffKey(userId: String): String = "dynamic_state_remote_operator_handoff:$userId"

    private fun alertRoutingKey(userId: String): String = "dynamic_state_alert_routing:$userId"

    private fun remoteDirectoryKey(userId: String): String = "dynamic_state_remote_directory:$userId"

    private fun connectorDestinationsKey(userId: String): String = "dynamic_state_connector_destinations:$userId"

    private fun connectorAuthProfilesKey(userId: String): String = "dynamic_state_connector_auth_profiles:$userId"

    private fun connectorRouteBindingsKey(userId: String): String = "dynamic_state_connector_route_bindings:$userId"

    private fun portfolioScenariosKey(userId: String): String = "dynamic_state_portfolio_scenarios:$userId"

    private fun portfolioSimulationRunsKey(userId: String): String = "dynamic_state_portfolio_simulation_runs:$userId"

    private fun portfolioScenarioComparisonsKey(userId: String): String =
        "dynamic_state_portfolio_scenario_comparisons:$userId"

    private fun portfolioOptimizationObjectiveProfileSnapshotsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_objective_profiles:$userId"

    private fun portfolioOptimizationCalibrationSnapshotsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_calibration_snapshots:$userId"

    private fun portfolioOptimizationRequestsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_requests:$userId"

    private fun portfolioOptimizationResultsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_results:$userId"

    private fun portfolioOptimizationDecisionsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_decisions:$userId"

    private fun portfolioOptimizationOutcomesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_outcomes:$userId"

    private fun portfolioOptimizationDriftsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_drifts:$userId"

    private fun portfolioOptimizationTuningSuggestionsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_tuning_suggestions:$userId"

    private fun portfolioOptimizationTuningDecisionsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_tuning_decisions:$userId"

    private fun portfolioOptimizationPropagationAttemptsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_propagation_attempts:$userId"

    private fun portfolioOptimizationPropagationApprovalsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_propagation_approvals:$userId"

    private fun portfolioOptimizationPropagationAdoptionsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_propagation_adoptions:$userId"

    private fun portfolioOptimizationLearningSyncEnvelopesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_learning_sync_envelopes:$userId"

    private fun portfolioOptimizationLearningSyncAttemptsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_learning_sync_attempts:$userId"

    private fun portfolioOptimizationLearningSyncConflictsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_learning_sync_conflicts:$userId"

    private fun portfolioOptimizationConsentRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_consent_records:$userId"

    private fun portfolioOptimizationRemoteLearningEnvelopesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_learning_envelopes:$userId"

    private fun portfolioOptimizationRemoteLearningBatchesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_learning_batches:$userId"

    private fun portfolioOptimizationRemoteLearningTransportAttemptsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_learning_attempts:$userId"

    private fun portfolioOptimizationRemoteDestinationProfilesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_destinations:$userId"

    private fun portfolioOptimizationRemoteDestinationDecisionRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_destination_decisions:$userId"

    private fun portfolioOptimizationRemoteTransportConnectorProfilesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_transport_connectors:$userId"

    private fun portfolioOptimizationEnterpriseKeyReferencesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_enterprise_keys:$userId"

    private fun portfolioOptimizationRemoteTransportDeadLetterRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remote_transport_dead_letters:$userId"

    private fun portfolioOptimizationComplianceAuditExportRequestsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_audit_export_requests:$userId"

    private fun portfolioOptimizationComplianceAuditExportResultsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_audit_export_results:$userId"

    private fun portfolioOptimizationComplianceExportRouteRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_audit_export_routes:$userId"

    private fun portfolioOptimizationDataExchangeBundlesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_data_exchange_bundles:$userId"

    private fun portfolioOptimizationDataExchangeBundleDecisionRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_data_exchange_bundle_decisions:$userId"

    private fun portfolioOptimizationDataExchangeManifestsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_data_exchange_manifests:$userId"

    private fun portfolioOptimizationCrossBoundaryApprovalRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_cross_boundary_approvals:$userId"

    private fun portfolioOptimizationCrossBoundaryAuditRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_cross_boundary_audits:$userId"

    private fun portfolioOptimizationDestinationTrustTierAssignmentsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_destination_trust_tiers:$userId"

    private fun portfolioOptimizationCrossBoundaryProgramRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_cross_boundary_programs:$userId"

    private fun portfolioOptimizationCrossBoundaryGovernancePortfoliosKey(userId: String): String =
        "dynamic_state_portfolio_optimization_governance_portfolios:$userId"

    private fun portfolioOptimizationTrustTierProgramSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_trust_tier_programs:$userId"

    private fun portfolioOptimizationJurisdictionRolloutPlansKey(userId: String): String =
        "dynamic_state_portfolio_optimization_jurisdiction_rollouts:$userId"

    private fun portfolioOptimizationPortfolioBlockerSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_blockers:$userId"

    private fun portfolioOptimizationPortfolioDependencySummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_dependencies:$userId"

    private fun portfolioOptimizationPortfolioConflictSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_conflicts:$userId"

    private fun portfolioOptimizationPortfolioPriorityDecisionsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_priorities:$userId"

    private fun portfolioOptimizationPortfolioCoordinationRecommendationsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_recommendations:$userId"

    private fun portfolioOptimizationPortfolioWaveCoordinationRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_waves:$userId"

    private fun portfolioOptimizationCrossBoundaryPortfolioAnalyticsSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_portfolio_analytics:$userId"

    private fun portfolioOptimizationRiskBudgetsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_risk_budgets:$userId"

    private fun portfolioOptimizationTrustTierDriftSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_trust_tier_drifts:$userId"

    private fun portfolioOptimizationJurisdictionDriftSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_jurisdiction_drifts:$userId"

    private fun portfolioOptimizationDestinationRiskConcentrationSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_destination_risk_concentration:$userId"

    private fun portfolioOptimizationPortfolioBlockerTrendSummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_blocker_trends:$userId"

    private fun portfolioOptimizationPortfolioRiskRecommendationsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_risk_recommendations:$userId"

    private fun portfolioOptimizationCrossBoundaryCorrectiveActionRecordsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_corrective_actions:$userId"

    private fun portfolioOptimizationPortfolioSafetyRailsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_safety_rails:$userId"

    private fun portfolioOptimizationBudgetGuardrailsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_budget_guardrails:$userId"

    private fun portfolioOptimizationPortfolioSafetySummariesKey(userId: String): String =
        "dynamic_state_portfolio_optimization_safety_summaries:$userId"

    private fun portfolioOptimizationRemediationAutomationControlsKey(userId: String): String =
        "dynamic_state_portfolio_optimization_remediation_controls:$userId"

    private fun portfolioOptimizationFederatedAggregationKey(userId: String): String =
        "dynamic_state_portfolio_optimization_federated_aggregation:$userId"

    private fun encodeExecutionLedger(records: List<ExecutionReceiptRecord>): String {
        return json.encodeToString(ListSerializer(ExecutionReceiptRecord.serializer()), records)
    }

    private fun decodeExecutionLedger(raw: String?): List<ExecutionReceiptRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(ExecutionReceiptRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeTelemetryEmissionRecords(records: List<TelemetryEmissionRecord>): String {
        return json.encodeToString(ListSerializer(TelemetryEmissionRecord.serializer()), records)
    }

    private fun decodeTelemetryEmissionRecords(raw: String?): List<TelemetryEmissionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(TelemetryEmissionRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeAlertDeliveryRecords(records: List<AlertDeliveryRecord>): String {
        return json.encodeToString(ListSerializer(AlertDeliveryRecord.serializer()), records)
    }

    private fun decodeAlertDeliveryRecords(raw: String?): List<AlertDeliveryRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(AlertDeliveryRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeReconciliationJobs(records: List<ReconciliationJobRecord>): String {
        return json.encodeToString(ListSerializer(ReconciliationJobRecord.serializer()), records)
    }

    private fun decodeReconciliationJobs(raw: String?): List<ReconciliationJobRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(ReconciliationJobRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeCollaborationStates(records: List<GovernanceCaseCollaborationState>): String {
        return json.encodeToString(ListSerializer(GovernanceCaseCollaborationState.serializer()), records)
    }

    private fun decodeCollaborationStates(raw: String?): List<GovernanceCaseCollaborationState> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(GovernanceCaseCollaborationState.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeRemoteOperatorHandoffRecords(records: List<RemoteOperatorHandoffRecord>): String {
        return json.encodeToString(ListSerializer(RemoteOperatorHandoffRecord.serializer()), records)
    }

    private fun decodeRemoteOperatorHandoffRecords(raw: String?): List<RemoteOperatorHandoffRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(RemoteOperatorHandoffRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeAlertRoutingRecords(records: List<AlertRoutingRecord>): String {
        return json.encodeToString(ListSerializer(AlertRoutingRecord.serializer()), records)
    }

    private fun decodeAlertRoutingRecords(raw: String?): List<AlertRoutingRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(AlertRoutingRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeRemoteOperatorDirectoryEntries(records: List<RemoteOperatorDirectoryEntry>): String {
        return json.encodeToString(ListSerializer(RemoteOperatorDirectoryEntry.serializer()), records)
    }

    private fun decodeRemoteOperatorDirectoryEntries(raw: String?): List<RemoteOperatorDirectoryEntry> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(RemoteOperatorDirectoryEntry.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeConnectorDestinations(records: List<ConnectorDestination>): String {
        return json.encodeToString(ListSerializer(ConnectorDestination.serializer()), records)
    }

    private fun decodeConnectorDestinations(raw: String?): List<ConnectorDestination> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(ConnectorDestination.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeConnectorAuthProfiles(records: List<ConnectorAuthProfile>): String {
        return json.encodeToString(ListSerializer(ConnectorAuthProfile.serializer()), records)
    }

    private fun decodeConnectorAuthProfiles(raw: String?): List<ConnectorAuthProfile> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(ConnectorAuthProfile.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeConnectorRouteBindings(records: List<ConnectorRouteBinding>): String {
        return json.encodeToString(ListSerializer(ConnectorRouteBinding.serializer()), records)
    }

    private fun decodeConnectorRouteBindings(raw: String?): List<ConnectorRouteBinding> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(ConnectorRouteBinding.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioScenarioDefinitions(records: List<PortfolioScenarioDefinition>): String {
        return json.encodeToString(ListSerializer(PortfolioScenarioDefinition.serializer()), records)
    }

    private fun decodePortfolioScenarioDefinitions(raw: String?): List<PortfolioScenarioDefinition> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioScenarioDefinition.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioSimulationRunRecords(records: List<PortfolioSimulationRunRecord>): String {
        return json.encodeToString(ListSerializer(PortfolioSimulationRunRecord.serializer()), records)
    }

    private fun decodePortfolioSimulationRunRecords(raw: String?): List<PortfolioSimulationRunRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioSimulationRunRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioScenarioComparisons(records: List<PortfolioScenarioComparison>): String {
        return json.encodeToString(ListSerializer(PortfolioScenarioComparison.serializer()), records)
    }

    private fun decodePortfolioScenarioComparisons(raw: String?): List<PortfolioScenarioComparison> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioScenarioComparison.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationObjectiveProfileSnapshots(
        records: List<PortfolioOptimizationObjectiveProfileSnapshot>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationObjectiveProfileSnapshot.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationObjectiveProfileSnapshots(
        raw: String?
    ): List<PortfolioOptimizationObjectiveProfileSnapshot> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationObjectiveProfileSnapshot.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCalibrationSnapshots(
        records: List<PortfolioOptimizationCalibrationSnapshot>
    ): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationCalibrationSnapshot.serializer()), records)
    }

    private fun decodePortfolioOptimizationCalibrationSnapshots(
        raw: String?
    ): List<PortfolioOptimizationCalibrationSnapshot> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationCalibrationSnapshot.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRequests(records: List<PortfolioOptimizationRequest>): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationRequest.serializer()), records)
    }

    private fun decodePortfolioOptimizationRequests(raw: String?): List<PortfolioOptimizationRequest> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationRequest.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationResults(records: List<PortfolioOptimizationResult>): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationResult.serializer()), records)
    }

    private fun decodePortfolioOptimizationResults(raw: String?): List<PortfolioOptimizationResult> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationResult.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDecisionRecords(
        records: List<PortfolioOptimizationDecisionRecord>
    ): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationDecisionRecord.serializer()), records)
    }

    private fun decodePortfolioOptimizationDecisionRecords(
        raw: String?
    ): List<PortfolioOptimizationDecisionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationDecisionRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationOutcomeRecords(records: List<PortfolioScheduleOutcomeRecord>): String {
        return json.encodeToString(ListSerializer(PortfolioScheduleOutcomeRecord.serializer()), records)
    }

    private fun decodePortfolioOptimizationOutcomeRecords(raw: String?): List<PortfolioScheduleOutcomeRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioScheduleOutcomeRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDriftSummaries(records: List<PortfolioOptimizationDriftSummary>): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationDriftSummary.serializer()), records)
    }

    private fun decodePortfolioOptimizationDriftSummaries(raw: String?): List<PortfolioOptimizationDriftSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationDriftSummary.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationTuningSuggestions(
        records: List<PortfolioOptimizationTuningSuggestion>
    ): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationTuningSuggestion.serializer()), records)
    }

    private fun decodePortfolioOptimizationTuningSuggestions(
        raw: String?
    ): List<PortfolioOptimizationTuningSuggestion> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationTuningSuggestion.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationTuningDecisionRecords(
        records: List<PortfolioOptimizationTuningDecisionRecord>
    ): String {
        return json.encodeToString(ListSerializer(PortfolioOptimizationTuningDecisionRecord.serializer()), records)
    }

    private fun decodePortfolioOptimizationTuningDecisionRecords(
        raw: String?
    ): List<PortfolioOptimizationTuningDecisionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationTuningDecisionRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPropagationAttempts(
        records: List<PortfolioOptimizationPropagationAttemptRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPropagationAttemptRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPropagationAttempts(
        raw: String?
    ): List<PortfolioOptimizationPropagationAttemptRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationPropagationAttemptRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPropagationApprovals(
        records: List<PortfolioOptimizationPropagationApprovalRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPropagationApprovalRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPropagationApprovals(
        raw: String?
    ): List<PortfolioOptimizationPropagationApprovalRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationPropagationApprovalRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPropagationAdoptions(
        records: List<PortfolioOptimizationPropagationAdoptionRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPropagationAdoptionRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPropagationAdoptions(
        raw: String?
    ): List<PortfolioOptimizationPropagationAdoptionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationPropagationAdoptionRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationLearningSyncEnvelopes(
        records: List<PortfolioOptimizationLearningSyncEnvelope>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationLearningSyncEnvelope.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationLearningSyncEnvelopes(
        raw: String?
    ): List<PortfolioOptimizationLearningSyncEnvelope> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationLearningSyncEnvelope.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationLearningSyncAttempts(
        records: List<PortfolioOptimizationLearningSyncAttemptRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationLearningSyncAttemptRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationLearningSyncAttempts(
        raw: String?
    ): List<PortfolioOptimizationLearningSyncAttemptRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationLearningSyncAttemptRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationLearningSyncConflicts(
        records: List<PortfolioOptimizationLearningSyncConflictRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationLearningSyncConflictRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationLearningSyncConflicts(
        raw: String?
    ): List<PortfolioOptimizationLearningSyncConflictRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationLearningSyncConflictRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationConsentRecords(
        records: List<PortfolioOptimizationConsentRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationConsentRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationConsentRecords(
        raw: String?
    ): List<PortfolioOptimizationConsentRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationConsentRecord.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteLearningEnvelopes(
        records: List<PortfolioOptimizationRemoteLearningEnvelope>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteLearningEnvelope.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteLearningEnvelopes(
        raw: String?
    ): List<PortfolioOptimizationRemoteLearningEnvelope> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationRemoteLearningEnvelope.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteLearningBatches(
        records: List<PortfolioOptimizationRemoteLearningBatch>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteLearningBatch.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteLearningBatches(
        raw: String?
    ): List<PortfolioOptimizationRemoteLearningBatch> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationRemoteLearningBatch.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteLearningTransportAttempts(
        records: List<PortfolioOptimizationRemoteLearningTransportAttemptRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteLearningTransportAttemptRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteLearningTransportAttempts(
        raw: String?
    ): List<PortfolioOptimizationRemoteLearningTransportAttemptRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRemoteLearningTransportAttemptRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteDestinationProfiles(
        records: List<PortfolioOptimizationRemoteDestinationProfile>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteDestinationProfile.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteDestinationProfiles(
        raw: String?
    ): List<PortfolioOptimizationRemoteDestinationProfile> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRemoteDestinationProfile.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteDestinationDecisionRecords(
        records: List<PortfolioOptimizationRemoteDestinationDecisionRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteDestinationDecisionRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteDestinationDecisionRecords(
        raw: String?
    ): List<PortfolioOptimizationRemoteDestinationDecisionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRemoteDestinationDecisionRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteTransportConnectorProfiles(
        records: List<PortfolioOptimizationRemoteTransportConnectorProfile>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteTransportConnectorProfile.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteTransportConnectorProfiles(
        raw: String?
    ): List<PortfolioOptimizationRemoteTransportConnectorProfile> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRemoteTransportConnectorProfile.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationEnterpriseKeyReferences(
        records: List<PortfolioOptimizationEnterpriseKeyReference>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationEnterpriseKeyReference.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationEnterpriseKeyReferences(
        raw: String?
    ): List<PortfolioOptimizationEnterpriseKeyReference> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationEnterpriseKeyReference.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemoteTransportDeadLetterRecords(
        records: List<PortfolioOptimizationRemoteTransportDeadLetterRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemoteTransportDeadLetterRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemoteTransportDeadLetterRecords(
        raw: String?
    ): List<PortfolioOptimizationRemoteTransportDeadLetterRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRemoteTransportDeadLetterRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationComplianceAuditExportRequests(
        records: List<PortfolioOptimizationComplianceAuditExportRequest>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationComplianceAuditExportRequest.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationComplianceAuditExportRequests(
        raw: String?
    ): List<PortfolioOptimizationComplianceAuditExportRequest> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationComplianceAuditExportRequest.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationComplianceAuditExportResults(
        records: List<PortfolioOptimizationComplianceAuditExportResult>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationComplianceAuditExportResult.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationComplianceAuditExportResults(
        raw: String?
    ): List<PortfolioOptimizationComplianceAuditExportResult> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationComplianceAuditExportResult.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationComplianceExportRouteRecords(
        records: List<PortfolioOptimizationComplianceExportRouteRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationComplianceExportRouteRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationComplianceExportRouteRecords(
        raw: String?
    ): List<PortfolioOptimizationComplianceExportRouteRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationComplianceExportRouteRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDataExchangeBundles(
        records: List<PortfolioOptimizationSafeDestinationBundle>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationSafeDestinationBundle.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationDataExchangeBundles(
        raw: String?
    ): List<PortfolioOptimizationSafeDestinationBundle> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationSafeDestinationBundle.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDataExchangeBundleDecisionRecords(
        records: List<PortfolioOptimizationDestinationBundleDecisionRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationDestinationBundleDecisionRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationDataExchangeBundleDecisionRecords(
        raw: String?
    ): List<PortfolioOptimizationDestinationBundleDecisionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationDestinationBundleDecisionRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDataExchangeManifests(
        records: List<PortfolioOptimizationDataExchangeManifest>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationDataExchangeManifest.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationDataExchangeManifests(
        raw: String?
    ): List<PortfolioOptimizationDataExchangeManifest> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationDataExchangeManifest.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCrossBoundaryApprovalRecords(
        records: List<PortfolioOptimizationCrossBoundaryApprovalRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationCrossBoundaryApprovalRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationCrossBoundaryApprovalRecords(
        raw: String?
    ): List<PortfolioOptimizationCrossBoundaryApprovalRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationCrossBoundaryApprovalRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCrossBoundaryAuditRecords(
        records: List<PortfolioOptimizationCrossBoundaryAuditRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationCrossBoundaryAuditRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationCrossBoundaryAuditRecords(
        raw: String?
    ): List<PortfolioOptimizationCrossBoundaryAuditRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationCrossBoundaryAuditRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDestinationTrustTierAssignments(
        records: List<PortfolioOptimizationDestinationTrustTierAssignment>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationDestinationTrustTierAssignment.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationDestinationTrustTierAssignments(
        raw: String?
    ): List<PortfolioOptimizationDestinationTrustTierAssignment> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationDestinationTrustTierAssignment.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCrossBoundaryProgramRecords(
        records: List<PortfolioOptimizationCrossBoundaryProgramRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationCrossBoundaryProgramRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationCrossBoundaryProgramRecords(
        raw: String?
    ): List<PortfolioOptimizationCrossBoundaryProgramRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationCrossBoundaryProgramRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCrossBoundaryGovernancePortfolios(
        records: List<PortfolioOptimizationCrossBoundaryGovernancePortfolio>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationCrossBoundaryGovernancePortfolio.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationCrossBoundaryGovernancePortfolios(
        raw: String?
    ): List<PortfolioOptimizationCrossBoundaryGovernancePortfolio> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationCrossBoundaryGovernancePortfolio.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationTrustTierProgramSummaries(
        records: List<PortfolioOptimizationTrustTierProgramSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationTrustTierProgramSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationTrustTierProgramSummaries(
        raw: String?
    ): List<PortfolioOptimizationTrustTierProgramSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationTrustTierProgramSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationJurisdictionRolloutPlans(
        records: List<PortfolioOptimizationJurisdictionRolloutPlan>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationJurisdictionRolloutPlan.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationJurisdictionRolloutPlans(
        raw: String?
    ): List<PortfolioOptimizationJurisdictionRolloutPlan> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationJurisdictionRolloutPlan.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioBlockerSummaries(
        records: List<PortfolioOptimizationPortfolioBlockerSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioBlockerSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioBlockerSummaries(
        raw: String?
    ): List<PortfolioOptimizationPortfolioBlockerSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioBlockerSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioDependencySummaries(
        records: List<PortfolioOptimizationPortfolioDependencySummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioDependencySummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioDependencySummaries(
        raw: String?
    ): List<PortfolioOptimizationPortfolioDependencySummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioDependencySummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioConflictSummaries(
        records: List<PortfolioOptimizationPortfolioConflictSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioConflictSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioConflictSummaries(
        raw: String?
    ): List<PortfolioOptimizationPortfolioConflictSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioConflictSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioPriorityDecisions(
        records: List<PortfolioOptimizationPortfolioPriorityDecision>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioPriorityDecision.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioPriorityDecisions(
        raw: String?
    ): List<PortfolioOptimizationPortfolioPriorityDecision> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioPriorityDecision.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioCoordinationRecommendations(
        records: List<PortfolioOptimizationPortfolioCoordinationRecommendation>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioCoordinationRecommendation.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioCoordinationRecommendations(
        raw: String?
    ): List<PortfolioOptimizationPortfolioCoordinationRecommendation> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioCoordinationRecommendation.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioWaveCoordinationRecords(
        records: List<PortfolioOptimizationPortfolioWaveCoordinationRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioWaveCoordinationRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioWaveCoordinationRecords(
        raw: String?
    ): List<PortfolioOptimizationPortfolioWaveCoordinationRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioWaveCoordinationRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries(
        records: List<PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummaries(
        raw: String?
    ): List<PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRiskBudgets(
        records: List<PortfolioOptimizationRiskBudget>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRiskBudget.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRiskBudgets(
        raw: String?
    ): List<PortfolioOptimizationRiskBudget> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRiskBudget.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationTrustTierDriftSummaries(
        records: List<PortfolioOptimizationTrustTierDriftSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationTrustTierDriftSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationTrustTierDriftSummaries(
        raw: String?
    ): List<PortfolioOptimizationTrustTierDriftSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationTrustTierDriftSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationJurisdictionDriftSummaries(
        records: List<PortfolioOptimizationJurisdictionDriftSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationJurisdictionDriftSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationJurisdictionDriftSummaries(
        raw: String?
    ): List<PortfolioOptimizationJurisdictionDriftSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationJurisdictionDriftSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationDestinationRiskConcentrationSummaries(
        records: List<PortfolioOptimizationDestinationRiskConcentrationSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationDestinationRiskConcentrationSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationDestinationRiskConcentrationSummaries(
        raw: String?
    ): List<PortfolioOptimizationDestinationRiskConcentrationSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationDestinationRiskConcentrationSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioBlockerTrendSummaries(
        records: List<PortfolioOptimizationPortfolioBlockerTrendSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioBlockerTrendSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioBlockerTrendSummaries(
        raw: String?
    ): List<PortfolioOptimizationPortfolioBlockerTrendSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioBlockerTrendSummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioRiskRecommendations(
        records: List<PortfolioOptimizationPortfolioRiskRecommendation>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioRiskRecommendation.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioRiskRecommendations(
        raw: String?
    ): List<PortfolioOptimizationPortfolioRiskRecommendation> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioRiskRecommendation.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationCrossBoundaryCorrectiveActionRecords(
        records: List<PortfolioOptimizationCrossBoundaryCorrectiveActionRecord>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationCrossBoundaryCorrectiveActionRecord.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationCrossBoundaryCorrectiveActionRecords(
        raw: String?
    ): List<PortfolioOptimizationCrossBoundaryCorrectiveActionRecord> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationCrossBoundaryCorrectiveActionRecord.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioSafetyRails(
        records: List<PortfolioOptimizationPortfolioSafetyRail>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioSafetyRail.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioSafetyRails(
        raw: String?
    ): List<PortfolioOptimizationPortfolioSafetyRail> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioSafetyRail.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationBudgetGuardrails(
        records: List<PortfolioOptimizationBudgetGuardrail>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationBudgetGuardrail.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationBudgetGuardrails(
        raw: String?
    ): List<PortfolioOptimizationBudgetGuardrail> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationBudgetGuardrail.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationPortfolioSafetySummaries(
        records: List<PortfolioOptimizationPortfolioSafetySummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationPortfolioSafetySummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationPortfolioSafetySummaries(
        raw: String?
    ): List<PortfolioOptimizationPortfolioSafetySummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationPortfolioSafetySummary.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationRemediationAutomationControls(
        records: List<PortfolioOptimizationRemediationAutomationControl>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationRemediationAutomationControl.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationRemediationAutomationControls(
        raw: String?
    ): List<PortfolioOptimizationRemediationAutomationControl> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(
                ListSerializer(PortfolioOptimizationRemediationAutomationControl.serializer()),
                raw
            )
        }.getOrDefault(emptyList())
    }

    private fun encodePortfolioOptimizationFederatedAggregationSummaries(
        records: List<PortfolioOptimizationFederatedAggregationSummary>
    ): String {
        return json.encodeToString(
            ListSerializer(PortfolioOptimizationFederatedAggregationSummary.serializer()),
            records
        )
    }

    private fun decodePortfolioOptimizationFederatedAggregationSummaries(
        raw: String?
    ): List<PortfolioOptimizationFederatedAggregationSummary> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PortfolioOptimizationFederatedAggregationSummary.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun encodeRolePolicyOverrides(overrides: Map<UserRole, RolePolicyProfile>): String {
        val root = JSONObject()
        overrides.forEach { (role, profile) ->
            root.put(role.name, encodeRolePolicyProfile(profile))
        }
        return root.toString()
    }

    private fun decodeRolePolicyOverrides(raw: String?): Map<UserRole, RolePolicyProfile> {
        if (raw.isNullOrBlank()) return emptyMap()
        return runCatching {
            val root = JSONObject(raw)
            buildMap {
                root.keys().forEach { key ->
                    val role = runCatching { UserRole.valueOf(key) }.getOrNull() ?: return@forEach
                    val profileObj = root.optJSONObject(key) ?: return@forEach
                    val decoded = decodeRolePolicyProfile(role, profileObj) ?: return@forEach
                    put(role, decoded)
                }
            }
        }.getOrDefault(emptyMap())
    }

    private fun encodeRolePolicyProfile(profile: RolePolicyProfile): JSONObject {
        return JSONObject().apply {
            put("version", profile.version)
            put(
                "preferences",
                JSONObject().apply {
                    put("risk_tolerance_default", profile.preferences.riskToleranceDefault)
                    put("max_cost_per_step_default", profile.preferences.maxCostPerStepDefault)
                    put("trusted_provider_tags", JSONArray(profile.preferences.trustedProviderTags))
                    put("blocked_provider_tags", JSONArray(profile.preferences.blockedProviderTags))
                    put("external_fulfillment_allowed", profile.preferences.externalFulfillmentAllowed)
                    put("external_fulfillment_preference", profile.preferences.externalFulfillmentPreference.name)
                }
            )
            put(
                "approval_policy",
                JSONObject().apply {
                    put("delegation_mode", profile.approvalPolicy.delegationMode.name)
                    put(
                        "requires_explicit_confirmation_for_high_risk",
                        profile.approvalPolicy.requiresExplicitConfirmationForHighRisk
                    )
                    put(
                        "requires_confirmation_token_for_external_spend",
                        profile.approvalPolicy.requiresConfirmationTokenForExternalSpend
                    )
                    put("auto_approval_budget_limit", profile.approvalPolicy.autoApprovalBudgetLimit)
                    put("max_external_budget", profile.approvalPolicy.maxExternalBudget)
                }
            )
            put(
                "data_policy",
                JSONObject().apply {
                    put("sharing_mode", profile.dataPolicy.sharingMode)
                    put("allowed_scopes", JSONArray(profile.dataPolicy.allowedScopes))
                    put("cloud_sync_allowed", profile.dataPolicy.cloudSyncAllowed)
                }
            )
            put(
                "delegation_policy",
                JSONObject().apply {
                    put("mode", profile.delegationPolicy.mode.name)
                    put(
                        "requires_reapproval_on_role_change",
                        profile.delegationPolicy.requiresReapprovalOnRoleChange
                    )
                }
            )
        }
    }

    private fun decodeRolePolicyProfile(role: UserRole, obj: JSONObject): RolePolicyProfile? {
        return runCatching {
            val preferencesObj = obj.optJSONObject("preferences")
            val approvalObj = obj.optJSONObject("approval_policy")
            val dataObj = obj.optJSONObject("data_policy")
            val delegationObj = obj.optJSONObject("delegation_policy")
            val delegationMode = approvalObj?.optString("delegation_mode")
                ?.takeIf { it.isNotBlank() }
                ?.let { runCatching { DelegationMode.valueOf(it) }.getOrNull() }
                ?: DelegationMode.ASSISTED
            RolePolicyProfile(
                role = role,
                preferences = RoleScopedPreferences(
                    riskToleranceDefault = preferencesObj?.optString("risk_tolerance_default")?.ifBlank { null },
                    maxCostPerStepDefault = preferencesObj?.optString("max_cost_per_step_default")?.ifBlank { null },
                    trustedProviderTags = jsonArrayToStringList(preferencesObj?.optJSONArray("trusted_provider_tags")),
                    blockedProviderTags = jsonArrayToStringList(preferencesObj?.optJSONArray("blocked_provider_tags")),
                    externalFulfillmentAllowed = preferencesObj?.optBoolean("external_fulfillment_allowed", true) ?: true,
                    externalFulfillmentPreference = preferencesObj?.optString("external_fulfillment_preference")
                        ?.takeIf { it.isNotBlank() }
                        ?.let { runCatching { ExternalFulfillmentPreference.valueOf(it) }.getOrNull() }
                        ?: ExternalFulfillmentPreference.INTERNAL_FIRST
                ),
                approvalPolicy = RoleScopedApprovalPolicy(
                    delegationMode = delegationMode,
                    requiresExplicitConfirmationForHighRisk = approvalObj?.optBoolean(
                        "requires_explicit_confirmation_for_high_risk",
                        true
                    ) ?: true,
                    requiresConfirmationTokenForExternalSpend = approvalObj?.optBoolean(
                        "requires_confirmation_token_for_external_spend",
                        true
                    ) ?: true,
                    autoApprovalBudgetLimit = approvalObj
                        ?.takeIf { it.has("auto_approval_budget_limit") && !it.isNull("auto_approval_budget_limit") }
                        ?.optDouble("auto_approval_budget_limit")
                        ?.takeIf { it.isFinite() && !it.isNaN() },
                    maxExternalBudget = approvalObj
                        ?.takeIf { it.has("max_external_budget") && !it.isNull("max_external_budget") }
                        ?.optDouble("max_external_budget")
                        ?.takeIf { it.isFinite() && !it.isNaN() }
                ),
                dataPolicy = RoleScopedDataPolicy(
                    sharingMode = dataObj?.optString("sharing_mode")
                        ?.ifBlank { "local_first_scoped_cloud" }
                        ?: "local_first_scoped_cloud",
                    allowedScopes = jsonArrayToStringList(dataObj?.optJSONArray("allowed_scopes")),
                    cloudSyncAllowed = dataObj?.optBoolean("cloud_sync_allowed", true) ?: true
                ),
                delegationPolicy = RoleScopedDelegationPolicy(
                    mode = delegationObj?.optString("mode")
                        ?.takeIf { it.isNotBlank() }
                        ?.let { runCatching { DelegationMode.valueOf(it) }.getOrNull() }
                        ?: delegationMode,
                    requiresReapprovalOnRoleChange = delegationObj?.optBoolean(
                        "requires_reapproval_on_role_change",
                        false
                    ) ?: false
                ),
                version = obj.optString("version").ifBlank { "role_policy_v1" }
            )
        }.getOrNull()
    }

    private fun jsonArrayToStringList(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optString(index).trim()
                if (item.isNotBlank()) add(item)
            }
        }
    }

    companion object {
        private const val PREF_NAME = "lumi_dynamic_state_store"
        private const val MAX_TRAJECTORY_POINTS = 240
        private const val MAX_LEDGER_RECORDS = 120
        private const val MAX_REMOTE_PIPELINE_RECORDS = 240
        private const val MAX_PORTFOLIO_OPTIMIZATION_ITEMS = 160
        private val json = Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }
    }
}

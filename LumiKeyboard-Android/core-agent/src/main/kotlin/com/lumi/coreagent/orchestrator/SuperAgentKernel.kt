package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.CloudGateway
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.GovernanceActionResult
import com.lumi.coredomain.contract.GovernanceBulkActionRequest
import com.lumi.coredomain.contract.GovernanceBulkActionResult
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.GovernanceConsoleFilter
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.GovernanceCaseRecord
import com.lumi.coredomain.contract.GovernanceQuery
import com.lumi.coredomain.contract.GovernanceSummary
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.LedgerQueryFilter
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult
import com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose
import com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier
import com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction
import com.lumi.coredomain.contract.PortfolioOptimizationLearningScope
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationAdoptionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncEnvelope
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord
import com.lumi.coredomain.contract.PortfolioOutcomeObservationSet
import com.lumi.coredomain.contract.PortfolioOptimizationQuery
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationResult
import com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord
import com.lumi.coredomain.contract.PortfolioOptimizationState
import com.lumi.coredomain.contract.PortfolioScenarioComparison
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioSimulationQuery
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.PortfolioSimulationState
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyEditorState
import com.lumi.coredomain.contract.RolePolicyUpdateResult
import com.lumi.coredomain.contract.StateConsensusPayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole

/**
 * SuperAgentKernel is the single orchestration entry for App-internal backend.
 * Existing AgentOrchestrator behavior is wrapped for backward-compatible migration.
 */
class SuperAgentKernel(
    routingScoreConfigProvider: () -> RoutingScoreConfig = { RoutingScoreConfigProvider.current() },
    private val orchestrator: AgentOrchestrator = AgentOrchestrator(
        routingScoreConfigProvider = routingScoreConfigProvider
    )
) {
    suspend fun handleRequest(request: AgentRequest, cloudGateway: CloudGateway?): AgentResponse {
        return orchestrator.handleRequest(request, cloudGateway)
    }

    fun getModuleSnapshot(userId: String, module: ModuleId): AgentResponse {
        return orchestrator.getModuleSnapshot(userId, module)
    }

    fun recordInteraction(event: InteractionEvent) {
        orchestrator.recordInteraction(event)
    }

    fun getDigitalSoulSummary(userId: String): DigitalSoulSummary {
        return orchestrator.getDigitalSoulSummary(userId)
    }

    fun getDynamicState(userId: String): DynamicHumanStatePayload? {
        return orchestrator.getDynamicState(userId)
    }

    fun getTrajectory(userId: String, days: Int): List<TrajectoryPointPayload> {
        return orchestrator.getTrajectory(userId, days)
    }

    fun updateStateConsensus(userId: String, patch: StateConsensusPayload): Boolean {
        return orchestrator.updateStateConsensus(userId, patch)
    }

    fun shouldSyncTwinToCloud(
        userId: String,
        activeRole: UserRole? = null
    ): Boolean {
        return orchestrator.shouldSyncTwinToCloud(userId, activeRole)
    }

    fun getRolePolicyEditorState(userId: String, role: UserRole): RolePolicyEditorState {
        return orchestrator.getRolePolicyEditorState(userId, role)
    }

    fun updateRolePolicy(userId: String, role: UserRole, draft: RolePolicyDraft): RolePolicyUpdateResult {
        return orchestrator.updateRolePolicy(userId, role, draft)
    }

    fun resetRolePolicy(userId: String, role: UserRole): RolePolicyUpdateResult {
        return orchestrator.resetRolePolicy(userId, role)
    }

    fun getExecutionLedger(
        userId: String,
        filter: LedgerQueryFilter = LedgerQueryFilter()
    ): List<ExecutionReceiptRecord> {
        return orchestrator.getExecutionLedger(userId, filter)
    }

    fun getGovernanceSummary(
        userId: String,
        query: GovernanceQuery = GovernanceQuery()
    ): GovernanceSummary {
        return orchestrator.getGovernanceSummary(userId, query)
    }

    fun getGovernanceCases(
        userId: String,
        filter: GovernanceConsoleFilter = GovernanceConsoleFilter()
    ): List<GovernanceCaseRecord> {
        return orchestrator.getGovernanceCases(userId, filter)
    }

    fun getGovernanceConsoleState(
        userId: String,
        filter: GovernanceConsoleFilter = GovernanceConsoleFilter()
    ): GovernanceConsoleState {
        return orchestrator.getGovernanceConsoleState(userId, filter)
    }

    fun markGovernanceCaseReviewed(userId: String, runId: String): GovernanceActionResult {
        return orchestrator.markGovernanceCaseReviewed(userId, runId)
    }

    fun retryGovernanceSyncIntent(userId: String, runId: String): GovernanceActionResult {
        return orchestrator.retryGovernanceSyncIntent(userId, runId)
    }

    fun updateGovernanceCaseCollaboration(
        userId: String,
        runId: String,
        command: GovernanceCollaborationCommand
    ): GovernanceActionResult {
        return orchestrator.updateGovernanceCaseCollaboration(userId, runId, command)
    }

    fun performGovernanceBulkAction(
        userId: String,
        request: GovernanceBulkActionRequest
    ): GovernanceBulkActionResult {
        return orchestrator.performGovernanceBulkAction(userId, request)
    }

    fun getPortfolioSimulationState(
        userId: String,
        query: PortfolioSimulationQuery = PortfolioSimulationQuery()
    ): PortfolioSimulationState {
        return orchestrator.getPortfolioSimulationState(userId, query)
    }

    fun getPortfolioOptimizationState(
        userId: String,
        query: PortfolioOptimizationQuery = PortfolioOptimizationQuery()
    ): PortfolioOptimizationState {
        return orchestrator.getPortfolioOptimizationState(userId, query)
    }

    fun savePortfolioScenario(
        userId: String,
        scenario: PortfolioScenarioDefinition
    ): PortfolioScenarioDefinition {
        return orchestrator.savePortfolioScenario(userId, scenario)
    }

    fun savePortfolioOptimizationRequest(
        userId: String,
        request: PortfolioOptimizationRequest
    ): PortfolioOptimizationRequest {
        return orchestrator.savePortfolioOptimizationRequest(userId, request)
    }

    fun runPortfolioScenario(
        userId: String,
        scenarioId: String
    ): PortfolioSimulationRunRecord {
        return orchestrator.runPortfolioScenario(userId, scenarioId)
    }

    fun runPortfolioOptimization(
        userId: String,
        requestId: String
    ): PortfolioOptimizationResult {
        return orchestrator.runPortfolioOptimization(userId, requestId)
    }

    fun comparePortfolioSimulationRuns(
        userId: String,
        baselineRunId: String,
        candidateRunId: String
    ): PortfolioScenarioComparison? {
        return orchestrator.comparePortfolioSimulationRuns(userId, baselineRunId, candidateRunId)
    }

    fun exportPortfolioSimulationSummary(
        userId: String,
        runId: String
    ): String {
        return orchestrator.exportPortfolioSimulationSummary(userId, runId)
    }

    fun selectPortfolioOptimizationSchedule(
        userId: String,
        resultId: String,
        candidateId: String,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationDecisionRecord {
        return orchestrator.selectPortfolioOptimizationSchedule(
            userId = userId,
            resultId = resultId,
            candidateId = candidateId,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    fun recordPortfolioOptimizationOutcome(
        userId: String,
        decisionId: String,
        observations: PortfolioOutcomeObservationSet = PortfolioOutcomeObservationSet()
    ): PortfolioScheduleOutcomeRecord {
        return orchestrator.recordPortfolioOptimizationOutcome(userId, decisionId, observations)
    }

    fun applyPortfolioOptimizationTuning(
        userId: String,
        suggestionId: String,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationTuningDecisionRecord {
        return orchestrator.applyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = suggestionId,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    fun denyPortfolioOptimizationTuning(
        userId: String,
        suggestionId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        reason: String = ""
    ): PortfolioOptimizationTuningDecisionRecord {
        return orchestrator.denyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = suggestionId,
            operatorId = operatorId,
            operatorName = operatorName,
            reason = reason
        )
    }

    fun recordPortfolioOptimizationCorrectiveAction(
        userId: String,
        portfolioId: String,
        actionType: PortfolioOptimizationCorrectiveActionType,
        targetProgramId: String? = null,
        targetTrustTier: PortfolioOptimizationDestinationTrustTier? = null,
        targetJurisdiction: PortfolioOptimizationJurisdiction? = null,
        operatorId: String? = null,
        operatorName: String? = null,
        note: String = ""
    ): PortfolioOptimizationCrossBoundaryCorrectiveActionRecord {
        return orchestrator.recordPortfolioOptimizationCorrectiveAction(
            userId = userId,
            portfolioId = portfolioId,
            actionType = actionType,
            targetProgramId = targetProgramId,
            targetTrustTier = targetTrustTier,
            targetJurisdiction = targetJurisdiction,
            operatorId = operatorId,
            operatorName = operatorName,
            note = note
        )
    }

    fun propagatePortfolioOptimizationObjectiveProfile(
        userId: String,
        sourceObjectiveProfileSnapshotId: String,
        targetScope: PortfolioOptimizationLearningScope,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationPropagationAttemptRecord {
        return orchestrator.propagatePortfolioOptimizationObjectiveProfile(
            userId = userId,
            sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
            targetScope = targetScope,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    fun approvePortfolioOptimizationPropagation(
        userId: String,
        attemptId: String,
        approverId: String? = null,
        approverName: String? = null
    ): PortfolioOptimizationPropagationAdoptionRecord {
        return orchestrator.approvePortfolioOptimizationPropagation(
            userId = userId,
            attemptId = attemptId,
            approverId = approverId,
            approverName = approverName
        )
    }

    fun rejectPortfolioOptimizationPropagation(
        userId: String,
        attemptId: String,
        approverId: String? = null,
        approverName: String? = null,
        reason: String = ""
    ): PortfolioOptimizationPropagationApprovalRecord {
        return orchestrator.rejectPortfolioOptimizationPropagation(
            userId = userId,
            attemptId = attemptId,
            approverId = approverId,
            approverName = approverName,
            reason = reason
        )
    }

    fun recordPortfolioOptimizationConsent(
        userId: String,
        consent: PortfolioOptimizationConsentRecord
    ): PortfolioOptimizationConsentRecord {
        return orchestrator.recordPortfolioOptimizationConsent(userId, consent)
    }

    fun revokePortfolioOptimizationConsent(
        userId: String,
        consentId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        reason: String = ""
    ): PortfolioOptimizationConsentRecord {
        return orchestrator.revokePortfolioOptimizationConsent(
            userId = userId,
            consentId = consentId,
            operatorId = operatorId,
            operatorName = operatorName,
            reason = reason
        )
    }

    fun dispatchPortfolioOptimizationRemoteLearningTransport(
        userId: String,
        envelopeId: String,
        purpose: PortfolioOptimizationConsentPurpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationRemoteLearningTransportAttemptRecord {
        return orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = envelopeId,
            purpose = purpose,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    fun requestPortfolioOptimizationComplianceAuditExport(
        userId: String,
        request: PortfolioOptimizationComplianceAuditExportRequest
    ): PortfolioOptimizationComplianceAuditExportResult {
        return orchestrator.requestPortfolioOptimizationComplianceAuditExport(userId, request)
    }

    fun exportPortfolioOptimizationLearningSyncEnvelope(
        userId: String,
        objectiveProfileSnapshotId: String = "",
        calibrationSnapshotId: String = "",
        mode: PortfolioOptimizationLearningSyncMode =
            PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationLearningSyncEnvelope {
        return orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            objectiveProfileSnapshotId = objectiveProfileSnapshotId,
            calibrationSnapshotId = calibrationSnapshotId,
            mode = mode,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    fun importPortfolioOptimizationLearningSyncEnvelope(
        userId: String,
        envelope: PortfolioOptimizationLearningSyncEnvelope,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationLearningSyncAttemptRecord {
        return orchestrator.importPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            envelope = envelope,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    fun exportPortfolioOptimizationSummary(
        userId: String,
        resultId: String
    ): String {
        return orchestrator.exportPortfolioOptimizationSummary(userId, resultId)
    }
}
